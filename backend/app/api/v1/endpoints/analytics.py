"""Public analytics endpoints for platform-wide project signals."""
from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends
from geoalchemy2.shape import to_shape
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.project import Complaint, Project, ProjectStatus, VerificationStatus
from app.schemas.schemas import ProjectListItem

router = APIRouter()


def _compute_delay_days(project: Project) -> Optional[int]:
    end = project.revised_end_date or project.original_end_date
    if not end or project.status == ProjectStatus.COMPLETED:
        return None
    today = date.today()
    if today > end:
        return (today - end).days
    return 0


def _to_float(value: Decimal | None) -> float:
    return float(value or 0)


def _project_item(project: Project) -> ProjectListItem:
    lat, lng = None, None
    if project.location is not None:
        point = to_shape(project.location)
        lat, lng = point.y, point.x

    return ProjectListItem(
        id=project.id,
        title=project.title,
        category=project.category,
        status=project.status,
        state=project.state,
        city=project.city,
        verification_status=project.verification_status,
        physical_progress_pct=project.physical_progress_pct,
        sanctioned_budget_inr=project.sanctioned_budget_inr,
        original_end_date=project.original_end_date,
        revised_end_date=project.revised_end_date,
        contractor_name=project.contractor.canonical_name if project.contractor else None,
        authority_name=project.authority.canonical_name if project.authority else None,
        lat=lat,
        lng=lng,
        delay_days=_compute_delay_days(project),
        created_at=project.created_at,
    )


@router.get("/summary")
async def analytics_summary(db: AsyncSession = Depends(get_db)):
    """Public dashboard metrics, distributions, and attention queues."""
    today = date.today()
    delayed_filter = and_(
        Project.status != ProjectStatus.COMPLETED,
        or_(
            Project.status == ProjectStatus.DELAYED,
            Project.revised_end_date < today,
            and_(Project.revised_end_date.is_(None), Project.original_end_date < today),
        ),
    )

    total_projects = (await db.execute(select(func.count(Project.id)))).scalar_one()
    total_budget = (await db.execute(select(func.coalesce(func.sum(Project.sanctioned_budget_inr), 0)))).scalar_one()
    total_spent = (await db.execute(select(func.coalesce(func.sum(Project.expenditure_inr), 0)))).scalar_one()
    verified_projects = (await db.execute(
        select(func.count(Project.id)).where(Project.verification_status == VerificationStatus.VERIFIED)
    )).scalar_one()
    delayed_projects = (await db.execute(select(func.count(Project.id)).where(delayed_filter))).scalar_one()
    completed_projects = (await db.execute(
        select(func.count(Project.id)).where(Project.status == ProjectStatus.COMPLETED)
    )).scalar_one()
    total_complaints = (await db.execute(select(func.count(Complaint.id)))).scalar_one()

    by_status = (await db.execute(
        select(Project.status, func.count(Project.id))
        .group_by(Project.status)
        .order_by(func.count(Project.id).desc())
    )).all()
    by_category = (await db.execute(
        select(Project.category, func.count(Project.id), func.coalesce(func.sum(Project.sanctioned_budget_inr), 0))
        .group_by(Project.category)
        .order_by(func.count(Project.id).desc())
    )).all()
    by_verification = (await db.execute(
        select(Project.verification_status, func.count(Project.id))
        .group_by(Project.verification_status)
        .order_by(func.count(Project.id).desc())
    )).all()
    by_city = (await db.execute(
        select(Project.city, func.count(Project.id), func.coalesce(func.sum(Project.sanctioned_budget_inr), 0))
        .where(Project.city.isnot(None))
        .group_by(Project.city)
        .order_by(func.count(Project.id).desc())
        .limit(8)
    )).all()

    attention_projects = (await db.execute(
        select(Project)
        .options(selectinload(Project.contractor), selectinload(Project.authority))
        .where(or_(delayed_filter, Project.verification_status == VerificationStatus.DISPUTED))
        .order_by(Project.sanctioned_budget_inr.desc().nullslast(), Project.created_at.desc())
        .limit(8)
    )).scalars().all()

    return {
        "totals": {
            "total_projects": total_projects,
            "verified_projects": verified_projects,
            "delayed_projects": delayed_projects,
            "completed_projects": completed_projects,
            "total_complaints": total_complaints,
            "total_budget_inr": _to_float(total_budget),
            "total_spent_inr": _to_float(total_spent),
            "verification_rate": round((verified_projects / total_projects) * 100, 1) if total_projects else 0,
            "delay_rate": round((delayed_projects / total_projects) * 100, 1) if total_projects else 0,
        },
        "by_status": [{"status": row[0].value, "count": row[1]} for row in by_status],
        "by_category": [
            {"category": row[0].value, "count": row[1], "budget_inr": _to_float(row[2])}
            for row in by_category
        ],
        "by_verification": [{"status": row[0].value, "count": row[1]} for row in by_verification],
        "by_city": [
            {"city": row[0], "count": row[1], "budget_inr": _to_float(row[2])}
            for row in by_city
        ],
        "attention_projects": [_project_item(project) for project in attention_projects],
    }

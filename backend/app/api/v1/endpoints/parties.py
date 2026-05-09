"""Public contractor and authority profile endpoints."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from geoalchemy2.shape import to_shape
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.project import Authority, Complaint, Contractor, Project, ProjectStatus
from app.schemas.schemas import ProjectListItem

router = APIRouter()


def _delay_days(project: Project) -> int | None:
    from datetime import date

    end = project.revised_end_date or project.original_end_date
    if not end or project.status == ProjectStatus.COMPLETED:
        return None
    today = date.today()
    return max(0, (today - end).days) if today > end else 0


def _project_list_item(project: Project) -> ProjectListItem:
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
        delay_days=_delay_days(project),
        created_at=project.created_at,
    )


async def _party_stats(db: AsyncSession, filters) -> dict:
    total_projects = (await db.execute(
        select(func.count(Project.id)).where(*filters)
    )).scalar_one()
    delayed_projects = (await db.execute(
        select(func.count(Project.id)).where(*filters, Project.status == ProjectStatus.DELAYED)
    )).scalar_one()
    completed_projects = (await db.execute(
        select(func.count(Project.id)).where(*filters, Project.status == ProjectStatus.COMPLETED)
    )).scalar_one()
    total_budget = (await db.execute(
        select(func.coalesce(func.sum(Project.sanctioned_budget_inr), 0)).where(*filters)
    )).scalar_one()
    complaints = (await db.execute(
        select(func.count(Complaint.id))
        .join(Project, Project.id == Complaint.project_id)
        .where(*filters)
    )).scalar_one()

    return {
        "total_projects": total_projects,
        "delayed_projects": delayed_projects,
        "completed_projects": completed_projects,
        "total_budget_inr": total_budget,
        "total_complaints": complaints,
    }


@router.get("/contractors/{contractor_id}")
async def contractor_profile(
    contractor_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    contractor = (await db.execute(
        select(Contractor).where(Contractor.id == contractor_id)
    )).scalar_one_or_none()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")

    filters = [Project.contractor_id == contractor_id]
    projects = (await db.execute(
        select(Project)
        .options(selectinload(Project.contractor), selectinload(Project.authority))
        .where(*filters)
        .order_by(Project.created_at.desc())
        .limit(50)
    )).scalars().all()

    return {
        "contractor": contractor,
        "stats": await _party_stats(db, filters),
        "projects": [_project_list_item(project) for project in projects],
    }


@router.get("/authorities/{authority_id}")
async def authority_profile(
    authority_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    authority = (await db.execute(
        select(Authority).where(Authority.id == authority_id)
    )).scalar_one_or_none()
    if not authority:
        raise HTTPException(status_code=404, detail="Authority not found")

    filters = [Project.authority_id == authority_id]
    projects = (await db.execute(
        select(Project)
        .options(selectinload(Project.contractor), selectinload(Project.authority))
        .where(*filters)
        .order_by(Project.created_at.desc())
        .limit(50)
    )).scalars().all()

    return {
        "authority": authority,
        "stats": await _party_stats(db, filters),
        "projects": [_project_list_item(project) for project in projects],
    }

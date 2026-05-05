"""
Admin endpoints — data management, pipeline triggers, stats.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.auth import require_admin
from app.models.project import Project, Complaint, ProjectStatus, VerificationStatus
from app.models.user import User

router = APIRouter()


@router.get("/stats")
async def platform_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Dashboard statistics for admin panel."""
    total_projects = (await db.execute(select(func.count(Project.id)))).scalar_one()
    verified = (await db.execute(
        select(func.count(Project.id)).where(Project.verification_status == VerificationStatus.VERIFIED)
    )).scalar_one()
    delayed = (await db.execute(
        select(func.count(Project.id)).where(Project.status == ProjectStatus.DELAYED)
    )).scalar_one()
    completed = (await db.execute(
        select(func.count(Project.id)).where(Project.status == ProjectStatus.COMPLETED)
    )).scalar_one()
    complaints = (await db.execute(select(func.count(Complaint.id)))).scalar_one()

    by_category = (await db.execute(
        select(Project.category, func.count(Project.id))
        .group_by(Project.category)
    )).all()

    return {
        "total_projects": total_projects,
        "verified_projects": verified,
        "delayed_projects": delayed,
        "completed_projects": completed,
        "total_complaints": complaints,
        "by_category": {str(row[0]): row[1] for row in by_category},
    }


@router.post("/ingest/trigger")
async def trigger_ingestion(
    source_id: str = None,
    admin: User = Depends(require_admin),
):
    """Manually trigger a scraping run via Celery."""
    from app.workers.celery_app import celery_app
    if source_id:
        task = celery_app.send_task("app.workers.tasks.run_scraper", args=[source_id])
    else:
        task = celery_app.send_task("app.workers.tasks.run_all_scrapers")
    return {"status": "triggered", "task_id": task.id}


@router.get("/complaints/pending")
async def pending_complaints(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Fetch complaints that need moderation."""
    from app.models.project import ComplaintStatus
    rows = (await db.execute(
        select(Complaint)
        .where(Complaint.status == ComplaintStatus.SUBMITTED)
        .order_by(Complaint.created_at.desc())
        .limit(50)
    )).scalars().all()
    
    # We must use Pydantic models to serialize but for simplicity we return dicts
    return [
        {
            "id": str(c.id),
            "project_id": str(c.project_id),
            "title": c.title,
            "description": c.description,
            "status": c.status.value,
            "spam_score": c.spam_score,
            "is_spam": c.is_spam,
            "created_at": c.created_at,
        }
        for c in rows
    ]


@router.get("/projects/unverified")
async def unverified_projects(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Fetch projects that need verification."""
    rows = (await db.execute(
        select(Project)
        .where(Project.verification_status == VerificationStatus.UNVERIFIED)
        .order_by(Project.created_at.desc())
        .limit(50)
    )).scalars().all()
    
    return [
        {
            "id": str(p.id),
            "title": p.title,
            "category": p.category.value,
            "status": p.status.value,
            "source_url": p.source_url,
            "created_at": p.created_at,
        }
        for p in rows
    ]

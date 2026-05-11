"""
Admin endpoints — data management, pipeline triggers, stats.
"""
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.auth import require_admin
from app.core.rate_limit import limiter
from app.models.project import Project, Complaint, ProjectStatus, VerificationStatus, DataSource, DataSourceType, ComplaintStatus
from app.models.user import User
from app.schemas.schemas import IngestionScopeRequest

router = APIRouter()

ALLOWED_INGESTION_HOSTS = {
    "tendersodisha.gov.in",
    "pmgsy.nic.in",
}


def _default_source_details(source_type: DataSourceType) -> tuple[str, str]:
    if source_type == DataSourceType.TENDER_SYSTEM:
        return "Odisha eProcurement Scoped Import", "https://tendersodisha.gov.in"
    if source_type == DataSourceType.GOVERNMENT_PORTAL:
        return "PMGSY Scoped Import", "https://pmgsy.nic.in"
    return "Manual JSON Scoped Import", "local"


def _scope_config(payload: IngestionScopeRequest) -> dict:
    data = payload.model_dump(
        mode="json",
        exclude={"source_id", "source_type", "source_name", "base_url"},
        exclude_none=True,
    )
    if payload.source_type == DataSourceType.MANUAL_ENTRY and "seed_dir" not in data:
        data["seed_dir"] = "data/seed"
    if payload.state and payload.source_type == DataSourceType.GOVERNMENT_PORTAL:
        data["states"] = [payload.state]
    return data


def _validated_base_url(url: str | None) -> str | None:
    if not url:
        return None
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()
    if parsed.scheme != "https" or hostname not in ALLOWED_INGESTION_HOSTS:
        raise HTTPException(status_code=400, detail="Ingestion base URL is not allowed")
    return url.rstrip("/")


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
@limiter.limit("5/minute")
async def trigger_ingestion(
    request: Request,
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


@router.post("/ingest/run-now")
@limiter.limit("3/minute")
async def run_ingestion_now(
    request: Request,
    payload: IngestionScopeRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Run a scoped ingestion immediately without Celery.

    This is the free-deployment path: one admin action runs the selected scraper
    inside the API process and inserts matching projects into the database.
    """
    default_name, default_url = _default_source_details(payload.source_type)
    base_url = _validated_base_url(payload.base_url)
    config = _scope_config(payload)

    if payload.source_id:
        source = (await db.execute(
            select(DataSource).where(DataSource.id == payload.source_id)
        )).scalar_one_or_none()
        if not source:
            raise HTTPException(status_code=404, detail="Data source not found")

        source.scraper_config = {**(source.scraper_config or {}), **config}
        if base_url:
            source.base_url = base_url
        source.is_active = True
        await db.commit()
        source_id = str(source.id)
    else:
        source_name = payload.source_name or default_name
        source = (await db.execute(
            select(DataSource).where(
                DataSource.name == source_name,
                DataSource.source_type == payload.source_type,
            )
        )).scalar_one_or_none()

        if source:
            source.scraper_config = config
            source.base_url = base_url or source.base_url or default_url
            source.is_active = True
        else:
            source = DataSource(
                name=source_name,
                source_type=payload.source_type,
                base_url=base_url or default_url,
                description="Admin-triggered scoped ingestion source",
                scraper_config=config,
                is_active=True,
            )
            db.add(source)

        await db.flush()
        source_id = str(source.id)
        await db.commit()

    from app.ingestion.scheduler import run_single_scraper
    result = await run_single_scraper(source_id)
    return {
        "status": "completed",
        "source_id": source_id,
        "scope": config,
        "result": result,
    }


@router.get("/complaints/pending")
async def pending_complaints(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Fetch complaints that are still in the active admin review queue."""
    rows = (await db.execute(
        select(Complaint, Project.title.label("project_title"))
        .join(Project, Project.id == Complaint.project_id)
        .where(Complaint.status.in_([
            ComplaintStatus.SUBMITTED,
            ComplaintStatus.UNDER_REVIEW,
            ComplaintStatus.ESCALATED,
        ]))
        .order_by(Complaint.created_at.desc())
        .limit(50)
    )).all()

    return [
        {
            "id": str(c.id),
            "project_id": str(c.project_id),
            "project_title": project_title,
            "title": c.title,
            "description": c.description,
            "complaint_type": c.complaint_type,
            "status": c.status.value,
            "evidence_urls": c.evidence_urls or [],
            "submitter_name": c.submitter_name,
            "spam_score": c.spam_score,
            "is_spam": c.is_spam,
            "created_at": c.created_at,
        }
        for c, project_title in rows
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

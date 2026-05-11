"""Project timeline updates endpoint."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.auth import require_admin
from app.core.rate_limit import limiter
from app.models.project import ProjectUpdate, Project
from app.models.user import User

router = APIRouter()


@router.post("", status_code=201)
@limiter.limit("60/minute")
async def post_update(
    request: Request,
    project_id: UUID,
    title: str,
    content: str = None,
    update_type: str = "GENERAL",
    source_url: str = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    project = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update = ProjectUpdate(
        project_id=project_id,
        title=title,
        content=content,
        update_type=update_type,
        source_url=source_url,
        created_by=admin.id,
    )
    db.add(update)
    await db.flush()
    return {"status": "ok", "update_id": str(update.id)}

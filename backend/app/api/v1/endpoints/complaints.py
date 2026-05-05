"""
Complaints endpoint — citizen issue submission with evidence.
"""
import hashlib
from typing import Optional
from uuid import UUID
from pathlib import Path
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.config import settings
from app.core.database import get_db
from app.core.auth import get_current_user, require_admin, require_user
from app.models.project import Complaint, ComplaintStatus, Project
from app.models.user import User
from app.schemas.schemas import ComplaintCreate, ComplaintOut

router = APIRouter()


def _safe_upload_name(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    stem = Path(filename).stem[:80]
    stem = re.sub(r"[^A-Za-z0-9_.-]+", "-", stem).strip("-") or "upload"
    return f"{uuid.uuid4().hex}_{stem}{suffix}"


async def _save_upload(file: UploadFile, folder: str) -> str:
    max_size = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    target_dir = Path(settings.UPLOAD_DIR) / folder
    target_dir.mkdir(parents=True, exist_ok=True)
    filename = _safe_upload_name(file.filename or "upload")
    target = target_dir / filename

    size = 0
    with target.open("wb") as out:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > max_size:
                target.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB} MB limit",
                )
            out.write(chunk)

    relative_url = f"/uploads/{folder}/{filename}".replace("\\", "/")
    return f"{settings.PUBLIC_BASE_URL.rstrip('/')}{relative_url}"


def _simple_spam_score(text: str, ip: str) -> float:
    """Basic heuristic spam score (0–1). Replace with ML model in production."""
    score = 0.0
    spam_words = ["free", "click here", "earn money", "lottery", "win prize"]
    lower = text.lower()
    for w in spam_words:
        if w in lower:
            score += 0.3
    if len(text) < 30:
        score += 0.2
    return min(score, 1.0)


@router.post("", response_model=ComplaintOut, status_code=201)
async def submit_complaint(
    payload: ComplaintCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    # Verify project exists
    project = (await db.execute(select(Project).where(Project.id == payload.project_id))).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ip = request.client.host if request.client else "unknown"
    spam_score = _simple_spam_score(payload.description, ip)

    geo_value = None
    if payload.location:
        from geoalchemy2.shape import from_shape
        from shapely.geometry import Point
        geo_value = from_shape(Point(payload.location.lng, payload.location.lat), srid=4326)

    complaint = Complaint(
        project_id=payload.project_id,
        submitted_by=current_user.id if current_user else None,
        submitter_name=payload.submitter_name or (current_user.full_name if current_user else "Anonymous"),
        submitter_email=payload.submitter_email or (current_user.email if current_user else None),
        submitter_phone=payload.submitter_phone,
        title=payload.title,
        description=payload.description,
        complaint_type=payload.complaint_type,
        ip_address=ip,
        user_agent=request.headers.get("user-agent"),
        spam_score=spam_score,
        is_spam=spam_score >= 0.7,
        location=geo_value,
    )
    db.add(complaint)
    await db.flush()
    await db.refresh(complaint)
    return ComplaintOut.model_validate(complaint)


@router.get("/{complaint_id}", response_model=ComplaintOut)
async def get_complaint(complaint_id: UUID, db: AsyncSession = Depends(get_db)):
    c = (await db.execute(select(Complaint).where(Complaint.id == complaint_id))).scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return ComplaintOut.model_validate(c)


@router.post("/{complaint_id}/upvote")
async def upvote_complaint(
    complaint_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    await db.execute(
        update(Complaint)
        .where(Complaint.id == complaint_id)
        .values(upvotes=Complaint.upvotes + 1)
    )
    return {"status": "ok"}


@router.post("/{complaint_id}/evidence")
async def upload_complaint_evidence(
    complaint_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Attach image/video/PDF evidence to a complaint."""
    complaint = (await db.execute(select(Complaint).where(Complaint.id == complaint_id))).scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    file_url = await _save_upload(file, f"complaints/{complaint_id}")
    complaint.evidence_urls = [*(complaint.evidence_urls or []), file_url]
    return {"status": "ok", "file_url": file_url}


@router.patch("/{complaint_id}/moderate")
async def moderate_complaint(
    complaint_id: UUID,
    new_status: ComplaintStatus,
    notes: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    c = (await db.execute(select(Complaint).where(Complaint.id == complaint_id))).scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    c.status = new_status
    c.moderated_by = admin.id
    c.moderation_notes = notes
    return {"status": "ok", "complaint_status": new_status}

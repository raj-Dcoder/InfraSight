"""
Complaints endpoint — citizen issue submission with evidence.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.database import get_db
from app.core.auth import get_current_user, require_admin, require_user
from app.core.rate_limit import limiter
from app.core.uploads import save_validated_upload
from app.models.project import Complaint, ComplaintStatus, Project
from app.models.user import User
from app.schemas.schemas import ComplaintCreate, ComplaintOut

router = APIRouter()

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
@limiter.limit("10/minute")
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
@limiter.limit("30/minute")
async def upvote_complaint(
    complaint_id: UUID,
    request: Request,
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
@limiter.limit("10/minute")
async def upload_complaint_evidence(
    complaint_id: UUID,
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Attach image/video/PDF evidence to a complaint."""
    complaint = (await db.execute(select(Complaint).where(Complaint.id == complaint_id))).scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if current_user is None and complaint.submitted_by is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Authentication required")
    if current_user is not None and complaint.submitted_by not in (None, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot attach evidence to this complaint")

    file_url, _, _ = await save_validated_upload(file, f"complaints/{complaint_id}")
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

"""
Projects API endpoints.

GET  /projects              - List / filter projects (paginated)
POST /projects              - Create project (admin)
GET  /projects/{id}         - Get project detail
PATCH /projects/{id}        - Update project (admin)
DELETE /projects/{id}       - Delete project (admin)
GET  /projects/{id}/updates - Project update timeline
GET  /projects/{id}/documents
GET  /projects/{id}/complaints
GET  /projects/{id}/audit   - Full audit trail
PATCH /projects/{id}/verify - Set verification status (verifier)
"""
from typing import List, Optional
from uuid import UUID
from datetime import date, timezone, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.auth import require_admin, require_verifier
from app.core.rate_limit import limiter
from app.core.uploads import save_validated_upload
from app.models.project import (
    Project, ProjectStatus, ProjectCategory, VerificationStatus,
    ProjectUpdate as ProjectUpdateModel, Document, Complaint, ComplaintStatus, VerificationLog
)
from app.models.user import User
from app.schemas.schemas import (
    ProjectCreate, ProjectUpdate, ProjectOut, ProjectListItem,
    PaginatedResponse, DocumentCreate, DocumentOut
)
import structlog

logger = structlog.get_logger()
router = APIRouter()

SORT_COLUMNS = {
    "created_at": Project.created_at,
    "updated_at": Project.updated_at,
    "title": Project.title,
    "sanctioned_budget_inr": Project.sanctioned_budget_inr,
    "physical_progress_pct": Project.physical_progress_pct,
}

def _compute_delay_days(project: Project) -> Optional[int]:
    """Return number of days delayed; None if not applicable."""
    end = project.revised_end_date or project.original_end_date
    if not end or project.status == ProjectStatus.COMPLETED:
        return None
    today = date.today()
    if today > end:
        return (today - end).days
    return 0


@router.get("", response_model=PaginatedResponse)
async def list_projects(
    request: Request,
    state: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    category: Optional[ProjectCategory] = Query(None),
    status_filter: Optional[ProjectStatus] = Query(None, alias="status"),
    verification_status: Optional[VerificationStatus] = Query(None),
    min_budget: Optional[float] = Query(None),
    max_budget: Optional[float] = Query(None),
    contractor_id: Optional[UUID] = Query(None),
    authority_id: Optional[UUID] = Query(None),
    delayed_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_dir: str = Query("desc"),
    db: AsyncSession = Depends(get_db),
):
    """List projects with rich filtering and pagination."""
    filters = []

    if state:
        filters.append(Project.state.ilike(f"%{state}%"))
    if city:
        filters.append(Project.city.ilike(f"%{city}%"))
    if district:
        filters.append(Project.district.ilike(f"%{district}%"))
    if category:
        filters.append(Project.category == category)
    if status_filter:
        filters.append(Project.status == status_filter)
    if verification_status:
        filters.append(Project.verification_status == verification_status)
    if min_budget is not None:
        filters.append(Project.sanctioned_budget_inr >= min_budget)
    if max_budget is not None:
        filters.append(Project.sanctioned_budget_inr <= max_budget)
    if contractor_id:
        filters.append(Project.contractor_id == contractor_id)
    if authority_id:
        filters.append(Project.authority_id == authority_id)
    if delayed_only:
        today = date.today()
        filters.append(
            and_(
                Project.status != ProjectStatus.COMPLETED,
                or_(
                    Project.revised_end_date < today,
                    and_(Project.revised_end_date.is_(None), Project.original_end_date < today)
                )
            )
        )

    # Count total
    count_q = select(func.count(Project.id)).where(and_(*filters))
    total = (await db.execute(count_q)).scalar_one()

    # Sort
    sort_col = SORT_COLUMNS.get(sort_by, Project.created_at)
    order = sort_col.desc() if sort_dir == "desc" else sort_col.asc()

    # Query with eager loads
    q = (
        select(Project)
        .options(
            selectinload(Project.contractor),
            selectinload(Project.authority),
        )
        .where(and_(*filters))
        .order_by(order)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await db.execute(q)).scalars().all()

    results = []
    for p in rows:
        lat, lng = None, None
        if p.location is not None:
            from geoalchemy2.shape import to_shape
            point = to_shape(p.location)
            lat, lng = point.y, point.x

        item = ProjectListItem(
            id=p.id,
            title=p.title,
            category=p.category,
            status=p.status,
            state=p.state,
            city=p.city,
            verification_status=p.verification_status,
            physical_progress_pct=p.physical_progress_pct,
            sanctioned_budget_inr=p.sanctioned_budget_inr,
            original_end_date=p.original_end_date,
            revised_end_date=p.revised_end_date,
            contractor_name=p.contractor.canonical_name if p.contractor else None,
            authority_name=p.authority.canonical_name if p.authority else None,
            lat=lat,
            lng=lng,
            delay_days=_compute_delay_days(p),
            created_at=p.created_at,
        )
        results.append(item)

    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        pages=-(-total // page_size),
        results=results,
    )


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get full project detail."""
    q = (
        select(Project)
        .options(
            selectinload(Project.contractor),
            selectinload(Project.authority),
            selectinload(Project.data_source),
        )
        .where(Project.id == project_id)
    )
    project = (await db.execute(q)).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Complaint count
    cc = (await db.execute(
        select(func.count(Complaint.id)).where(Complaint.project_id == project_id)
    )).scalar_one()

    out = ProjectOut.model_validate(project)
    out.complaint_count = cc
    out.delay_days = _compute_delay_days(project)
    return out


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
async def create_project(
    request: Request,
    payload: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Create a new project (admin only)."""
    data = payload.model_dump(exclude={"location"})
    project = Project(**data, created_by=admin.id)

    if payload.location:
        from geoalchemy2.shape import from_shape
        from shapely.geometry import Point
        project.location = from_shape(Point(payload.location.lng, payload.location.lat), srid=4326)

    db.add(project)
    await db.flush()
    await db.refresh(project)
    logger.info("Project created", project_id=str(project.id), by=str(admin.id))
    return ProjectOut.model_validate(project)


@router.patch("/{project_id}", response_model=ProjectOut)
@limiter.limit("60/minute")
async def update_project(
    project_id: UUID,
    request: Request,
    payload: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Partial update of a project (admin only)."""
    project = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    updates = payload.model_dump(exclude_unset=True)
    old_status = project.status

    for key, val in updates.items():
        setattr(project, key, val)

    # Log status change
    if "status" in updates and updates["status"] != old_status:
        db.add(ProjectUpdateModel(
            project_id=project_id,
            title=f"Status changed to {updates['status']}",
            update_type="STATUS_CHANGE",
            old_status=old_status,
            new_status=updates["status"],
            created_by=admin.id,
        ))

    await db.flush()
    await db.refresh(project)
    return ProjectOut.model_validate(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("20/minute")
async def delete_project(
    project_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    project = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(project)


@router.patch("/{project_id}/verify")
@limiter.limit("60/minute")
async def verify_project(
    project_id: UUID,
    request: Request,
    verification_status: VerificationStatus,
    notes: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    verifier: User = Depends(require_verifier),
):
    """Set verification status (verifier/admin only)."""
    project = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.verification_status = verification_status
    project.verified_by = verifier.id
    project.verified_at = datetime.now(timezone.utc)

    db.add(VerificationLog(
        project_id=project_id,
        action="VERIFIED",
        field_name="verification_status",
        new_value=verification_status.value,
        performed_by=verifier.id,
        notes=notes,
    ))
    return {"status": "ok", "verification_status": verification_status}


@router.get("/{project_id}/updates")
async def get_project_updates(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(ProjectUpdateModel)
        .where(ProjectUpdateModel.project_id == project_id)
        .order_by(ProjectUpdateModel.created_at.desc())
    )).scalars().all()
    return rows


@router.get("/{project_id}/documents", response_model=List[DocumentOut])
async def get_project_documents(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(Document)
        .where(Document.project_id == project_id)
        .order_by(Document.created_at.desc())
    )).scalars().all()
    return rows


@router.post("/{project_id}/documents", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
async def add_project_document(
    project_id: UUID,
    request: Request,
    payload: DocumentCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Add a document to a project (admin only)."""
    project = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    doc = Document(
        **payload.model_dump(),
        project_id=project_id,
        uploaded_by=admin.id,
        is_verified=True
    )
    db.add(doc)
    await db.flush()
    await db.refresh(doc)
    return DocumentOut.model_validate(doc)


@router.post("/{project_id}/documents/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def upload_project_document(
    project_id: UUID,
    request: Request,
    title: str = Form(..., min_length=3, max_length=500),
    document_type: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Upload a project document to local persistent storage."""
    project = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    file_url, file_size, mime_type = await save_validated_upload(file, f"documents/{project_id}")
    doc = Document(
        project_id=project_id,
        title=title,
        document_type=document_type,
        file_url=file_url,
        file_size_bytes=file_size,
        mime_type=mime_type,
        uploaded_by=admin.id,
        is_verified=True,
    )
    db.add(doc)
    await db.flush()
    await db.refresh(doc)
    return DocumentOut.model_validate(doc)


@router.get("/{project_id}/complaints")
async def get_project_complaints(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(Complaint)
        .where(
            Complaint.project_id == project_id,
            Complaint.is_spam == False,
            Complaint.status == ComplaintStatus.RESOLVED,
        )
        .order_by(Complaint.upvotes.desc(), Complaint.created_at.desc())
    )).scalars().all()
    return rows


@router.get("/{project_id}/audit")
async def get_audit_trail(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    rows = (await db.execute(
        select(VerificationLog)
        .where(VerificationLog.project_id == project_id)
        .order_by(VerificationLog.created_at.desc())
    )).scalars().all()
    return rows

"""Pydantic schemas for request/response validation."""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.project import (
    ProjectStatus, ProjectCategory, VerificationStatus, ComplaintStatus,
    DataSourceType
)


# ─────────────────────────────────────────
# Shared / Base Schemas
# ─────────────────────────────────────────

class GeoPoint(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    pages: int
    results: List[Any]


# ─────────────────────────────────────────
# Contractor Schemas
# ─────────────────────────────────────────

class ContractorBase(BaseModel):
    canonical_name: str
    registered_state: Optional[str] = None
    registration_number: Optional[str] = None
    website: Optional[str] = None
    blacklisted: bool = False


class ContractorOut(ContractorBase):
    id: UUID
    aliases: List[str] = []
    blacklist_reason: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────
# Authority Schemas
# ─────────────────────────────────────────

class AuthorityBase(BaseModel):
    canonical_name: str
    authority_type: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    website: Optional[str] = None


class AuthorityOut(AuthorityBase):
    id: UUID
    nodal_officer: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────
# Project Schemas
# ─────────────────────────────────────────

class ProjectBase(BaseModel):
    title: str = Field(..., min_length=5, max_length=1000)
    description: Optional[str] = None
    category: ProjectCategory
    sub_category: Optional[str] = None
    status: ProjectStatus = ProjectStatus.PLANNED

    state: str
    district: Optional[str] = None
    city: Optional[str] = None
    ward: Optional[str] = None
    pincode: Optional[str] = None
    address: Optional[str] = None

    sanctioned_budget_inr: Optional[Decimal] = None
    revised_budget_inr: Optional[Decimal] = None
    expenditure_inr: Optional[Decimal] = None
    consultant_name: Optional[str] = None
    supervisor_name: Optional[str] = None
    delay_reason: Optional[str] = None
    accountability_score: Optional[int] = Field(None, ge=0, le=100)
    ai_insights: Optional[dict] = None
    funding_source: Optional[str] = None

    sanctioned_date: Optional[date] = None
    start_date: Optional[date] = None
    original_end_date: Optional[date] = None
    revised_end_date: Optional[date] = None
    actual_completion_date: Optional[date] = None

    physical_progress_pct: Optional[int] = Field(None, ge=0, le=100)
    financial_progress_pct: Optional[int] = Field(None, ge=0, le=100)

    source_url: Optional[str] = None
    tags: List[str] = []
    location: Optional[GeoPoint] = None

    @field_validator('location', mode='before')
    @classmethod
    def parse_location(cls, v):
        if v is None:
            return None
        if isinstance(v, dict) or isinstance(v, GeoPoint):
            return v
        try:
            from geoalchemy2.shape import to_shape
            pt = to_shape(v)
            return {'lat': pt.y, 'lng': pt.x}
        except Exception:
            return None


class ProjectCreate(ProjectBase):
    contractor_id: Optional[UUID] = None
    authority_id: Optional[UUID] = None
    data_source_id: Optional[UUID] = None
    project_code: Optional[str] = None


class ProjectUpdate(BaseModel):
    """Partial update — all fields optional."""
    title: Optional[str] = Field(None, min_length=5)
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    physical_progress_pct: Optional[int] = Field(None, ge=0, le=100)
    financial_progress_pct: Optional[int] = Field(None, ge=0, le=100)
    revised_end_date: Optional[date] = None
    revised_budget_inr: Optional[Decimal] = None
    expenditure_inr: Optional[Decimal] = None
    consultant_name: Optional[str] = None
    supervisor_name: Optional[str] = None
    delay_reason: Optional[str] = None
    accountability_score: Optional[int] = Field(None, ge=0, le=100)
    ai_insights: Optional[dict] = None
    pincode: Optional[str] = None


class ProjectOut(ProjectBase):
    id: UUID
    project_code: Optional[str] = None
    contractor: Optional[ContractorOut] = None
    authority: Optional[AuthorityOut] = None
    verification_status: VerificationStatus
    verified_at: Optional[datetime] = None
    complaint_count: int = 0
    delay_days: Optional[int] = None
    accountability_score: Optional[int] = None
    ai_insights: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectListItem(BaseModel):
    """Lighter schema for list views (no full details)."""
    id: UUID
    title: str
    category: ProjectCategory
    status: ProjectStatus
    state: str
    city: Optional[str] = None
    verification_status: VerificationStatus
    physical_progress_pct: Optional[int] = None
    sanctioned_budget_inr: Optional[Decimal] = None
    original_end_date: Optional[date] = None
    revised_end_date: Optional[date] = None
    contractor_name: Optional[str] = None
    authority_name: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    delay_days: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────
# Complaint Schemas
# ─────────────────────────────────────────

class ComplaintCreate(BaseModel):
    project_id: UUID
    title: str = Field(..., min_length=5, max_length=500)
    description: str = Field(..., min_length=20)
    complaint_type: Optional[str] = None  # DELAY, QUALITY, CORRUPTION, SAFETY, OTHER
    submitter_name: Optional[str] = None
    submitter_email: Optional[EmailStr] = None
    submitter_phone: Optional[str] = None
    location: Optional[GeoPoint] = None


class ComplaintOut(BaseModel):
    id: UUID
    project_id: UUID
    title: str
    description: str
    complaint_type: Optional[str] = None
    status: ComplaintStatus
    evidence_urls: List[str] = []
    upvotes: int = 0
    submitter_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────
# Auth Schemas
# ─────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None
    phone: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None
    role: str
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────
# Document Schemas
# ─────────────────────────────────────────

class DocumentCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=500)
    document_type: Optional[str] = None  # TENDER, WORK_ORDER, AUDIT, PHOTO, OTHER
    file_url: Optional[str] = None
    original_url: Optional[str] = None
    file_size_bytes: Optional[int] = None
    mime_type: Optional[str] = None
    doc_metadata: dict = {}


class DocumentOut(BaseModel):
    id: UUID
    project_id: UUID
    title: str
    document_type: Optional[str] = None
    file_url: Optional[str] = None
    original_url: Optional[str] = None
    file_size_bytes: Optional[int] = None
    mime_type: Optional[str] = None
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────
# Search / Filter Schemas
# ─────────────────────────────────────────

class ProjectSearchParams(BaseModel):
    q: Optional[str] = None               # free-text search
    state: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    category: Optional[ProjectCategory] = None
    status: Optional[ProjectStatus] = None
    verification_status: Optional[VerificationStatus] = None
    contractor_id: Optional[UUID] = None
    authority_id: Optional[UUID] = None
    min_budget: Optional[Decimal] = None
    max_budget: Optional[Decimal] = None
    delayed_only: bool = False
    bbox_sw_lat: Optional[float] = None   # geo bounding box filter
    bbox_sw_lng: Optional[float] = None
    bbox_ne_lat: Optional[float] = None
    bbox_ne_lng: Optional[float] = None
    near_lat: Optional[float] = None      # near me filter
    near_lng: Optional[float] = None
    radius_km: float = 10.0
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
    sort_by: str = "created_at"
    sort_dir: str = "desc"


# ─────────────────────────────────────────
# Ingestion Schemas
# ─────────────────────────────────────────

class IngestionScopeRequest(BaseModel):
    """Admin-selected scope for a manual ingestion run."""
    source_id: Optional[UUID] = None
    source_type: DataSourceType = DataSourceType.MANUAL_ENTRY
    source_name: Optional[str] = None
    base_url: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    category: Optional[ProjectCategory] = None
    keywords: List[str] = []
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    seed_dir: Optional[str] = None

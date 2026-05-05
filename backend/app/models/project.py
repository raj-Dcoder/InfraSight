"""Project and related ORM models."""
import enum
import uuid

from sqlalchemy import (
    Column, String, Boolean, DateTime, Text, Numeric,
    Date, SmallInteger, ForeignKey, ARRAY, Integer,
    Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geometry

from app.core.database import Base


class ProjectStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    TENDERED = "TENDERED"
    IN_PROGRESS = "IN_PROGRESS"
    DELAYED = "DELAYED"
    COMPLETED = "COMPLETED"
    ABANDONED = "ABANDONED"
    ON_HOLD = "ON_HOLD"


class ProjectCategory(str, enum.Enum):
    ROAD = "ROAD"
    BRIDGE = "BRIDGE"
    BUILDING = "BUILDING"
    WATER = "WATER"
    SANITATION = "SANITATION"
    ELECTRICITY = "ELECTRICITY"
    RAILWAY = "RAILWAY"
    METRO = "METRO"
    PORT = "PORT"
    AIRPORT = "AIRPORT"
    OTHER = "OTHER"


class VerificationStatus(str, enum.Enum):
    UNVERIFIED = "UNVERIFIED"
    VERIFIED = "VERIFIED"
    COMMUNITY_VERIFIED = "COMMUNITY_VERIFIED"
    DISPUTED = "DISPUTED"
    RETRACTED = "RETRACTED"


class DataSourceType(str, enum.Enum):
    GOVERNMENT_PORTAL = "GOVERNMENT_PORTAL"
    TENDER_SYSTEM = "TENDER_SYSTEM"
    PDF_DOCUMENT = "PDF_DOCUMENT"
    NEWS_SOURCE = "NEWS_SOURCE"
    MANUAL_ENTRY = "MANUAL_ENTRY"
    CITIZEN_REPORT = "CITIZEN_REPORT"
    API = "API"


class Contractor(Base):
    __tablename__ = "contractors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    canonical_name = Column(String(500), nullable=False)
    aliases = Column(ARRAY(Text), default=[])
    registration_number = Column(String(100))
    pan_number = Column(String(20))
    gst_number = Column(String(20))
    registered_state = Column(String(100))
    contact_email = Column(String(255))
    contact_phone = Column(String(20))
    website = Column(Text)
    blacklisted = Column(Boolean, nullable=False, default=False)
    blacklist_reason = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    projects = relationship("Project", back_populates="contractor")


class Authority(Base):
    __tablename__ = "authorities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    canonical_name = Column(String(500), nullable=False)
    aliases = Column(ARRAY(Text), default=[])
    authority_type = Column(String(100))
    state = Column(String(100))
    district = Column(String(100))
    website = Column(Text)
    nodal_officer = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    projects = relationship("Project", back_populates="authority")


class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    source_type = Column(SAEnum(DataSourceType, name="data_source_type"), nullable=False)
    base_url = Column(Text)
    description = Column(Text)
    scraper_config = Column(JSONB, default={})
    is_active = Column(Boolean, nullable=False, default=True)
    last_scraped_at = Column(DateTime(timezone=True))
    scrape_interval_hours = Column(Integer, default=24)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    projects = relationship("Project", back_populates="data_source")


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Identification
    project_code = Column(String(100), unique=True)
    title = Column(String(1000), nullable=False)
    description = Column(Text)

    # Classification
    category = Column(SAEnum(ProjectCategory, name="project_category"), nullable=False)
    sub_category = Column(String(100))
    status = Column(SAEnum(ProjectStatus, name="project_status"), nullable=False, default=ProjectStatus.PLANNED)

    # Location
    state = Column(String(100), nullable=False)
    district = Column(String(100))
    city = Column(String(100))
    ward = Column(String(100))
    pincode = Column(String(10))
    address = Column(Text)
    location = Column(Geometry("POINT", srid=4326))
    location_polygon = Column(Geometry("MULTIPOLYGON", srid=4326))

    # Parties
    contractor_id = Column(UUID(as_uuid=True), ForeignKey("contractors.id", ondelete="SET NULL"))
    authority_id = Column(UUID(as_uuid=True), ForeignKey("authorities.id", ondelete="SET NULL"))
    consultant_name = Column(String(500))
    supervisor_name = Column(String(500))

    # Financial
    sanctioned_budget_inr = Column(Numeric(18, 2))
    revised_budget_inr = Column(Numeric(18, 2))
    expenditure_inr = Column(Numeric(18, 2))
    funding_source = Column(String(255))

    # Timeline
    sanctioned_date = Column(Date)
    start_date = Column(Date)
    original_end_date = Column(Date)
    revised_end_date = Column(Date)
    actual_completion_date = Column(Date)
    delay_reason = Column(Text)

    # Progress
    physical_progress_pct = Column(SmallInteger)
    financial_progress_pct = Column(SmallInteger)

    # Trust
    verification_status = Column(
        SAEnum(VerificationStatus, name="verification_status"), nullable=False, default=VerificationStatus.UNVERIFIED
    )
    verified_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    verified_at = Column(DateTime(timezone=True))
    data_source_id = Column(UUID(as_uuid=True), ForeignKey("data_sources.id", ondelete="SET NULL"))
    source_url = Column(Text)
    source_document_id = Column(Text)

    # Advanced
    accountability_score = Column(SmallInteger)
    ai_insights = Column(JSONB, default={})

    # Metadata
    raw_data = Column(JSONB, default={})
    tags = Column(ARRAY(Text), default=[])
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))

    # Relationships
    contractor = relationship("Contractor", back_populates="projects")
    authority = relationship("Authority", back_populates="projects")
    data_source = relationship("DataSource", back_populates="projects")
    verifier = relationship("User", back_populates="verified_projects", foreign_keys=[verified_by])
    updates = relationship("ProjectUpdate", back_populates="project", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="project", cascade="all, delete-orphan")
    complaints = relationship("Complaint", back_populates="project", cascade="all, delete-orphan")
    verification_logs = relationship("VerificationLog", back_populates="project", cascade="all, delete-orphan")


class ProjectUpdate(Base):
    __tablename__ = "project_updates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    content = Column(Text)
    update_type = Column(String(50))
    old_status = Column(SAEnum(ProjectStatus, name="project_status"))
    new_status = Column(SAEnum(ProjectStatus, name="project_status"))
    old_progress_pct = Column(SmallInteger)
    new_progress_pct = Column(SmallInteger)
    source_url = Column(Text)
    data_source_id = Column(UUID(as_uuid=True), ForeignKey("data_sources.id"))
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="updates")


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    document_type = Column(String(100))
    file_url = Column(Text)
    original_url = Column(Text)
    file_size_bytes = Column(Integer)
    mime_type = Column(String(100))
    extracted_text = Column(Text)
    doc_metadata = Column(JSONB, default={})
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="documents")


class ComplaintStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    ESCALATED = "ESCALATED"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    submitted_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    submitter_name = Column(String(255))
    submitter_email = Column(String(255))
    submitter_phone = Column(String(20))
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    complaint_type = Column(String(100))
    status = Column(SAEnum(ComplaintStatus, name="complaint_status"), nullable=False, default=ComplaintStatus.SUBMITTED)
    moderated_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    moderation_notes = Column(Text)
    evidence_urls = Column(ARRAY(Text), default=[])
    location = Column(Geometry("POINT", srid=4326))
    ip_address = Column(Text)
    user_agent = Column(Text)
    is_spam = Column(Boolean, default=False)
    spam_score = Column(Numeric(4, 2), default=0)
    upvotes = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="complaints")
    submitter = relationship("User", back_populates="complaints", foreign_keys=[submitted_by])


class VerificationLog(Base):
    __tablename__ = "verification_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(100), nullable=False)
    field_name = Column(String(100))
    old_value = Column(Text)
    new_value = Column(Text)
    performed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    source_url = Column(Text)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="verification_logs")

class IngestionRun(Base):
    __tablename__ = "ingestion_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    data_source_id = Column(UUID(as_uuid=True), ForeignKey("data_sources.id", ondelete="CASCADE"), nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True))
    status = Column(String(50), default="RUNNING")
    records_found = Column(Integer, default=0)
    records_inserted = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    records_skipped = Column(Integer, default=0)
    error_log = Column(Text)
    run_metadata = Column(JSONB, default={})

    data_source = relationship("DataSource")

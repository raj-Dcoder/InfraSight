"""SQLAlchemy ORM models for InfraSight."""
import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column, String, Boolean, DateTime, Text, Integer, Numeric,
    Date, SmallInteger, ForeignKey, ARRAY, REAL, BigInteger,
    Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geometry

from app.core.database import Base


class UserRole(str, enum.Enum):
    PUBLIC = "PUBLIC"
    VERIFIER = "VERIFIER"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, unique=True, index=True)
    phone = Column(String(20))
    full_name = Column(String(255))
    hashed_password = Column(Text, nullable=False)
    role = Column(SAEnum(UserRole, name="user_role"), nullable=False, default=UserRole.PUBLIC)
    is_active = Column(Boolean, nullable=False, default=True)
    is_verified = Column(Boolean, nullable=False, default=False)
    avatar_url = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True))

    complaints = relationship("Complaint", back_populates="submitter", foreign_keys="Complaint.submitted_by")
    verified_projects = relationship("Project", back_populates="verifier", foreign_keys="Project.verified_by")

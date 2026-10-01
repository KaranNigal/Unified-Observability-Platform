import uuid
import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from db import Base

class User(Base):
    __tablename__ = "control_plane_users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    memberships = relationship("OrgMember", back_populates="user", cascade="all, delete-orphan")

class Organization(Base):
    __tablename__ = "control_plane_organizations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    tenant_id = Column(String(255), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    members = relationship("OrgMember", back_populates="organization", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="organization", cascade="all, delete-orphan")
    api_keys = relationship("ApiKey", back_populates="organization", cascade="all, delete-orphan")

class OrgMember(Base):
    __tablename__ = "control_plane_org_members"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(36), ForeignKey("control_plane_organizations.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("control_plane_users.id"), nullable=False)
    role = Column(String(50), default="admin") # 'admin', 'member', 'viewer'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="members")
    user = relationship("User", back_populates="memberships")

class Project(Base):
    __tablename__ = "control_plane_projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(36), ForeignKey("control_plane_organizations.id"), nullable=False)
    tenant_id = Column(String(255), index=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="projects")

class ApiKey(Base):
    __tablename__ = "control_plane_api_keys"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(36), ForeignKey("control_plane_organizations.id"), nullable=False)
    tenant_id = Column(String(255), index=True, nullable=False)
    key_hash = Column(String(255), nullable=False)
    key_prefix = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="api_keys")

class CpOrganization(Base):
    __tablename__ = "cp_organizations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

class CpApiKey(Base):
    __tablename__ = "cp_api_keys"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(36), ForeignKey("cp_organizations.id"), nullable=False, index=True)
    key_hash = Column(String(255), unique=True, index=True, nullable=False)
    key_prefix = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    revoked_at = Column(DateTime, nullable=True)

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# --- Auth Schemas ---
class SignupRequest(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6)
    organization_name: str | None = Field(None, min_length=2, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    name: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime


# --- Organization Schemas ---
class OrgCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    slug: str | None = None


class OrgUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=100)
    slug: str | None = None


class OrgResponse(BaseModel):
    id: str
    name: str
    slug: str
    role: str | None = None  # Current user's role in this org
    created_at: datetime
    updated_at: datetime


# --- Membership Schemas ---
class InviteMemberRequest(BaseModel):
    email: EmailStr
    role: str = Field("viewer", description="Role: 'owner', 'admin', or 'viewer'")


class UpdateMemberRoleRequest(BaseModel):
    role: str = Field(..., description="Role: 'owner', 'admin', or 'viewer'")


class MembershipResponse(BaseModel):
    id: str
    org_id: str
    user_id: str
    user_email: str
    user_name: str
    role: str
    created_at: datetime


# --- API Key Schemas ---
class ApiKeyCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)


class ApiKeyResponse(BaseModel):
    id: str
    org_id: str
    name: str
    key_prefix: str
    is_revoked: bool
    last_used_at: datetime | None = None
    created_at: datetime
    revoked_at: datetime | None = None


class ApiKeyCreatedResponse(ApiKeyResponse):
    raw_key: str  # Returned once at creation


class ApiKeyVerifyRequest(BaseModel):
    raw_key: str


class ApiKeyVerifyResponse(BaseModel):
    valid: bool
    org_id: str | None = None
    org_name: str | None = None
    key_id: str | None = None
    reason: str | None = None

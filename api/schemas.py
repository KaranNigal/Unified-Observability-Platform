from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# Auth Schemas
class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=2)
    organization_name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    name: str
    active_tenant_id: str
    active_org_id: str
    active_org_name: str
    role: str


class UserProfileResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime
    active_tenant_id: str
    active_org_id: str
    organizations: list[dict]


class SwitchTenantRequest(BaseModel):
    org_id: str


# Tenant / Project Schemas
class CreateProjectRequest(BaseModel):
    name: str
    description: str | None = ""


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str | None
    tenant_id: str
    created_at: datetime


class CreateApiKeyRequest(BaseModel):
    name: str


class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    raw_key: str | None = None  # Only returned when created
    tenant_id: str
    created_at: datetime
    is_active: bool


class OnboardingConfigResponse(BaseModel):
    tenant_id: str
    organization_id: str
    organization_name: str
    active_api_key_prefix: str
    otel_exporter_otlp_endpoint_grpc: str
    otel_exporter_otlp_endpoint_http: str
    otel_resource_attributes: str
    statsd_host: str
    statsd_port: int
    pushgateway_target: str
    docker_env_snippet: str
    python_otel_snippet: str
    bash_export_snippet: str

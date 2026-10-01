from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from db import get_db
from models import Organization, Project, ApiKey
from schemas import (
    OnboardingConfigResponse,
    CreateProjectRequest,
    ProjectResponse,
    CreateApiKeyRequest,
    ApiKeyResponse
)
from security import generate_api_key
from auth import get_current_tenant, TenantContext

router = APIRouter(prefix="/api/v1/tenants", tags=["tenants"])

@router.get("/onboarding-config", response_model=OnboardingConfigResponse)
def get_onboarding_config(tenant_ctx: TenantContext = Depends(get_current_tenant), db: Session = Depends(get_db)):
    org = db.query(Organization).filter(Organization.tenant_id == tenant_ctx.tenant_id).first()
    org_name = org.name if org else "Default Org"
    org_id = org.id if org else tenant_ctx.org_id

    # Fetch latest active API key prefix
    api_key_rec = db.query(ApiKey).filter(
        ApiKey.tenant_id == tenant_ctx.tenant_id,
        ApiKey.is_active == True
    ).first()
    key_prefix = api_key_rec.key_prefix if api_key_rec else "cap_live_sample..."

    tenant_id = tenant_ctx.tenant_id

    docker_env = f"""# Per-Tenant Telemetry Environment Configuration
OTEL_SERVICE_NAME=your-service-name
OTEL_RESOURCE_ATTRIBUTES=tenant_id={tenant_id},service.name=your-service-name
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
CAPSULE_API_KEY={key_prefix}
CAPSULE_TENANT_ID={tenant_id}
STATSD_HOST=localhost
STATSD_PORT=9125
"""

    python_otel = f"""# Python OpenTelemetry SDK Initialization (Multi-Tenant)
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

resource = Resource.create({{
    "service.name": "your-service-name",
    "tenant_id": "{tenant_id}"
}})

provider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(OTLPSpanExporter(endpoint="http://localhost:4318/v1/traces"))
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)
"""

    bash_export = f"""export OTEL_RESOURCE_ATTRIBUTES="tenant_id={tenant_id},service.name=my-app"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
export CAPSULE_TENANT_ID="{tenant_id}"
"""

    return OnboardingConfigResponse(
        tenant_id=tenant_id,
        organization_id=org_id,
        organization_name=org_name,
        active_api_key_prefix=key_prefix,
        otel_exporter_otlp_endpoint_grpc="localhost:4317",
        otel_exporter_otlp_endpoint_http="http://localhost:4318",
        otel_resource_attributes=f"tenant_id={tenant_id}",
        statsd_host="localhost",
        statsd_port=9125,
        pushgateway_target=f"http://localhost:9091/metrics/job/pyspark/tenant_id/{tenant_id}",
        docker_env_snippet=docker_env,
        python_otel_snippet=python_otel,
        bash_export_snippet=bash_export
    )

@router.get("/projects", response_model=List[ProjectResponse])
def list_projects(tenant_ctx: TenantContext = Depends(get_current_tenant), db: Session = Depends(get_db)):
    projects = db.query(Project).filter(Project.tenant_id == tenant_ctx.tenant_id).all()
    return [
        ProjectResponse(
            id=p.id,
            name=p.name,
            description=p.description,
            tenant_id=p.tenant_id,
            created_at=p.created_at
        )
        for p in projects
    ]

@router.post("/projects", response_model=ProjectResponse)
def create_project(req: CreateProjectRequest, tenant_ctx: TenantContext = Depends(get_current_tenant), db: Session = Depends(get_db)):
    project = Project(
        org_id=tenant_ctx.org_id,
        tenant_id=tenant_ctx.tenant_id,
        name=req.name,
        description=req.description or ""
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        tenant_id=project.tenant_id,
        created_at=project.created_at
    )

@router.get("/api-keys", response_model=List[ApiKeyResponse])
def list_api_keys(tenant_ctx: TenantContext = Depends(get_current_tenant), db: Session = Depends(get_db)):
    keys = db.query(ApiKey).filter(ApiKey.tenant_id == tenant_ctx.tenant_id).all()
    return [
        ApiKeyResponse(
            id=k.id,
            name=k.name,
            key_prefix=k.key_prefix,
            tenant_id=k.tenant_id,
            created_at=k.created_at,
            is_active=k.is_active
        )
        for k in keys
    ]

@router.post("/api-keys", response_model=ApiKeyResponse)
def create_new_api_key(req: CreateApiKeyRequest, tenant_ctx: TenantContext = Depends(get_current_tenant), db: Session = Depends(get_db)):
    raw_key, key_hash, key_prefix = generate_api_key()
    api_key = ApiKey(
        org_id=tenant_ctx.org_id,
        tenant_id=tenant_ctx.tenant_id,
        key_hash=key_hash,
        key_prefix=key_prefix,
        name=req.name
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    return ApiKeyResponse(
        id=api_key.id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        raw_key=raw_key,
        tenant_id=api_key.tenant_id,
        created_at=api_key.created_at,
        is_active=api_key.is_active
    )

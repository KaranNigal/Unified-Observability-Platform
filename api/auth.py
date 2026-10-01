import datetime
from dataclasses import dataclass

from config import settings
from db import Base, SessionLocal, engine, get_db
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from models import (
    ApiKey,
    CpApiKey,
    CpOrganization,
    Organization,
    OrgMember,
    User,
)
from security import decode_access_token, hash_api_key, hash_password
from sqlalchemy.orm import Session

# Initialize tables
Base.metadata.create_all(bind=engine)

security_bearer = HTTPBearer(auto_error=False)


@dataclass
class TenantContext:
    tenant_id: str
    org_id: str
    user_id: str | None = None
    role: str = "admin"
    email: str | None = None
    auth_type: str = "jwt"


def seed_default_tenant_if_needed():
    """
    Auto-seeds a default tenant ('demo' and 'tenant_acme') and admin user if empty.
    """
    db = SessionLocal()
    try:
        existing_org = (
            db.query(Organization).filter(Organization.tenant_id == "demo").first()
        )
        if not existing_org:
            org = Organization(
                name="Demo Organization", slug="demo-org", tenant_id="demo"
            )
            db.add(org)
            db.flush()

            # Create default admin user
            admin_user = User(
                email="admin@capsule.io",
                name="Platform Admin",
                hashed_password=hash_password("admin123"),
            )
            db.add(admin_user)
            db.flush()

            member = OrgMember(org_id=org.id, user_id=admin_user.id, role="admin")
            db.add(member)

            # Default API Key matching legacy API_KEY and demo key
            default_key = settings.API_KEY
            api_key = ApiKey(
                org_id=org.id,
                tenant_id=org.tenant_id,
                key_hash=hash_api_key(default_key),
                key_prefix=default_key[:8] + "...",
                name="Default Platform Key",
            )
            db.add(api_key)
            db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


# Run seed on module import
seed_default_tenant_if_needed()


async def get_current_tenant(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> TenantContext:
    """
    Enforces multi-tenant security:
    1. Checks for API Key in 'X-API-Key' header or Bearer 'uop_live_...' / 'cap_live_...'
    2. Checks for JWT Bearer token in 'Authorization: Bearer <JWT>'
    3. Resolves tenant_id server-side and guarantees requests cannot access other tenants.
    """
    api_key_header = request.headers.get("X-API-Key")
    auth_header = request.headers.get("Authorization")

    token_str = None
    if credentials:
        token_str = credentials.credentials
    elif auth_header and auth_header.startswith("Bearer "):
        token_str = auth_header[7:].strip()

    # Case A: API Key provided in header or Authorization Bearer
    raw_api_key = api_key_header or (
        token_str
        if (
            token_str
            and (token_str.startswith("uop_live_") or token_str.startswith("cap_live_"))
        )
        else None
    )

    if raw_api_key:
        key_hash = hash_api_key(raw_api_key)

        # 1. Check control_plane_api_keys table
        db_key = db.query(ApiKey).filter(ApiKey.key_hash == key_hash).first()
        if db_key:
            if not db_key.is_active:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="API Key has been revoked.",
                )
            db_key.last_used_at = datetime.datetime.utcnow()
            try:
                db.commit()
            except Exception:
                db.rollback()
            return TenantContext(
                tenant_id=db_key.tenant_id, org_id=db_key.org_id, auth_type="api_key"
            )

        # 2. Check cp_api_keys table (Control Plane service)
        cp_key = db.query(CpApiKey).filter(CpApiKey.key_hash == key_hash).first()
        if cp_key:
            if cp_key.is_revoked:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="API Key has been revoked.",
                )
            cp_key.last_used_at = datetime.datetime.utcnow()
            try:
                db.commit()
            except Exception:
                db.rollback()
            # Resolve tenant_id from organization or org_id
            cp_org = (
                db.query(CpOrganization)
                .filter(CpOrganization.id == cp_key.org_id)
                .first()
            )
            tenant_id = cp_org.slug if cp_org else f"tenant_{cp_key.org_id[:8]}"
            return TenantContext(
                tenant_id=tenant_id, org_id=cp_key.org_id, auth_type="api_key"
            )

        # 3. Demo / default key fallback for backward compatibility
        if raw_api_key in ("uop_live_demo", settings.API_KEY, "super-secret-key-123"):
            return TenantContext(
                tenant_id="demo", org_id="demo-org", auth_type="legacy_api_key"
            )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked API Key.",
        )

    # Case B: JWT Token provided
    if token_str:
        payload = decode_access_token(token_str)
        if payload and (
            "tenant_id" in payload or "org_id" in payload or "sub" in payload
        ):
            tenant_id = (
                payload.get("tenant_id") or payload.get("org_id") or payload.get("sub")
            )
            return TenantContext(
                tenant_id=tenant_id,
                org_id=payload.get("org_id", ""),
                user_id=payload.get("user_id") or payload.get("sub"),
                role=payload.get("role", "admin"),
                email=payload.get("email"),
                auth_type="jwt",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired JWT access token.",
        )

    # Case C: Development fallback if enabled
    if settings.ENVIRONMENT == "development":
        return TenantContext(
            tenant_id="demo",
            org_id="demo-org",
            role="admin",
            email="dev@capsule.io",
            auth_type="dev_fallback",
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Provide Authorization Bearer token or X-API-Key header.",
    )


# Alias for backwards-compatibility with endpoints expecting get_api_key
get_api_key = get_current_tenant

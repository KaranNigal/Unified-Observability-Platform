import datetime

from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from src.db import get_db
from src.models import ApiKey, Membership
from src.schemas import (
    ApiKeyCreatedResponse,
    ApiKeyCreateRequest,
    ApiKeyResponse,
    ApiKeyVerifyRequest,
    ApiKeyVerifyResponse,
)
from src.security.auth import require_org_admin, require_org_member
from src.security.security import generate_api_key, hash_api_key

router = APIRouter(tags=["api-keys"])


@router.post("/organizations/{org_id}/api-keys", response_model=ApiKeyCreatedResponse)
def create_api_key(
    req: ApiKeyCreateRequest,
    org_id: str = Path(...),
    admin_membership: Membership = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    raw_key, key_hash, key_prefix = generate_api_key(prefix="uop_live_")

    api_key = ApiKey(
        org_id=org_id,
        name=req.name,
        key_hash=key_hash,
        key_prefix=key_prefix,
        is_revoked=False,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)

    return ApiKeyCreatedResponse(
        id=api_key.id,
        org_id=api_key.org_id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        raw_key=raw_key,
        is_revoked=api_key.is_revoked,
        last_used_at=api_key.last_used_at,
        created_at=api_key.created_at,
        revoked_at=api_key.revoked_at,
    )


@router.get("/organizations/{org_id}/api-keys", response_model=list[ApiKeyResponse])
def list_api_keys(
    org_id: str = Path(...),
    membership: Membership = Depends(require_org_member),
    db: Session = Depends(get_db),
):
    keys = db.query(ApiKey).filter(ApiKey.org_id == org_id).all()
    return [
        ApiKeyResponse(
            id=k.id,
            org_id=k.org_id,
            name=k.name,
            key_prefix=k.key_prefix,
            is_revoked=k.is_revoked,
            last_used_at=k.last_used_at,
            created_at=k.created_at,
            revoked_at=k.revoked_at,
        )
        for k in keys
    ]


@router.post(
    "/organizations/{org_id}/api-keys/{key_id}/revoke", response_model=ApiKeyResponse
)
def revoke_api_key(
    org_id: str = Path(...),
    key_id: str = Path(...),
    admin_membership: Membership = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    key = db.query(ApiKey).filter(ApiKey.id == key_id, ApiKey.org_id == org_id).first()
    if not key:
        raise HTTPException(status_code=404, detail="API Key not found")

    if key.is_revoked:
        return ApiKeyResponse(
            id=key.id,
            org_id=key.org_id,
            name=key.name,
            key_prefix=key.key_prefix,
            is_revoked=key.is_revoked,
            last_used_at=key.last_used_at,
            created_at=key.created_at,
            revoked_at=key.revoked_at,
        )

    key.is_revoked = True
    key.revoked_at = datetime.datetime.now(datetime.UTC)
    db.commit()
    db.refresh(key)

    return ApiKeyResponse(
        id=key.id,
        org_id=key.org_id,
        name=key.name,
        key_prefix=key.key_prefix,
        is_revoked=key.is_revoked,
        last_used_at=key.last_used_at,
        created_at=key.created_at,
        revoked_at=key.revoked_at,
    )


@router.post("/api-keys/verify", response_model=ApiKeyVerifyResponse)
def verify_api_key(req: ApiKeyVerifyRequest, db: Session = Depends(get_db)):
    """
    Internal verification endpoint used by Telemetry Gateway or Ingestion proxy.
    Updates last_used_at upon successful verification.
    """
    if not req.raw_key or not req.raw_key.startswith("uop_live_"):
        return ApiKeyVerifyResponse(valid=False, reason="Malformed API Key format")

    key_hash = hash_api_key(req.raw_key)
    api_key = db.query(ApiKey).filter(ApiKey.key_hash == key_hash).first()

    if not api_key:
        return ApiKeyVerifyResponse(valid=False, reason="API Key not found")

    if api_key.is_revoked:
        return ApiKeyVerifyResponse(valid=False, reason="API Key has been revoked")

    # Update last_used_at timestamp
    api_key.last_used_at = datetime.datetime.now(datetime.UTC)
    db.commit()

    org = api_key.organization
    return ApiKeyVerifyResponse(
        valid=True,
        org_id=api_key.org_id,
        org_name=org.name if org else None,
        key_id=api_key.id,
    )

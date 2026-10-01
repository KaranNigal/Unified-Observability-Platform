import re
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db import get_db
from models import User, Organization, OrgMember, Project, ApiKey
from schemas import SignupRequest, LoginRequest, TokenResponse, UserProfileResponse, SwitchTenantRequest
from security import hash_password, verify_password, create_access_token, generate_api_key
from auth import get_current_tenant, TenantContext

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    return re.sub(r'[-\s]+', '-', text)

@router.post("/signup", response_model=TokenResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    # Check if user exists
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists."
        )

    # 1. Create User
    user = User(
        email=req.email,
        name=req.name,
        hashed_password=hash_password(req.password)
    )
    db.add(user)
    db.flush()

    # 2. Create Organization & Tenant ID
    org_name = req.organization_name or f"{req.name}'s Org"
    base_slug = slugify(org_name)
    slug = base_slug
    tenant_id = f"tenant_{base_slug}_{secrets.token_hex(4)}"

    # Ensure uniqueness
    counter = 1
    while db.query(Organization).filter((Organization.slug == slug) | (Organization.tenant_id == tenant_id)).first():
        slug = f"{base_slug}-{counter}"
        tenant_id = f"tenant_{slug}_{secrets.token_hex(4)}"
        counter += 1

    org = Organization(
        name=org_name,
        slug=slug,
        tenant_id=tenant_id
    )
    db.add(org)
    db.flush()

    # 3. Create Org Member (admin)
    member = OrgMember(
        org_id=org.id,
        user_id=user.id,
        role="admin"
    )
    db.add(member)

    # 4. Create Default Project
    project = Project(
        org_id=org.id,
        tenant_id=tenant_id,
        name="Default Project",
        description="Initial telemetry project"
    )
    db.add(project)

    # 5. Create Initial API Key
    raw_key, key_hash, key_prefix = generate_api_key()
    api_key = ApiKey(
        org_id=org.id,
        tenant_id=tenant_id,
        key_hash=key_hash,
        key_prefix=key_prefix,
        name="Production Key"
    )
    db.add(api_key)
    db.commit()

    # 6. Generate JWT token
    token_payload = {
        "user_id": user.id,
        "email": user.email,
        "name": user.name,
        "org_id": org.id,
        "tenant_id": tenant_id,
        "role": "admin"
    }
    access_token = create_access_token(token_payload)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        name=user.name,
        active_tenant_id=tenant_id,
        active_org_id=org.id,
        active_org_name=org.name,
        role="admin"
    )

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Get user's primary membership
    membership = db.query(OrgMember).filter(OrgMember.user_id == user.id).first()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not belong to any organization."
        )

    org = db.query(Organization).filter(Organization.id == membership.org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization not found."
        )

    token_payload = {
        "user_id": user.id,
        "email": user.email,
        "name": user.name,
        "org_id": org.id,
        "tenant_id": org.tenant_id,
        "role": membership.role
    }
    access_token = create_access_token(token_payload)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        name=user.name,
        active_tenant_id=org.tenant_id,
        active_org_id=org.id,
        active_org_name=org.name,
        role=membership.role
    )

@router.get("/me", response_model=UserProfileResponse)
def get_me(tenant_ctx: TenantContext = Depends(get_current_tenant), db: Session = Depends(get_db)):
    if not tenant_ctx.user_id:
        # Service account / API key context
        return UserProfileResponse(
            id="service-account",
            email="service@capsule.io",
            name="API Key Service Account",
            created_at=datetime.datetime.utcnow(),
            active_tenant_id=tenant_ctx.tenant_id,
            active_org_id=tenant_ctx.org_id,
            organizations=[]
        )

    user = db.query(User).filter(User.id == tenant_ctx.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    memberships = db.query(OrgMember).filter(OrgMember.user_id == user.id).all()
    org_list = []
    for m in memberships:
        org = db.query(Organization).filter(Organization.id == m.org_id).first()
        if org:
            org_list.append({
                "id": org.id,
                "name": org.name,
                "slug": org.slug,
                "tenant_id": org.tenant_id,
                "role": m.role
            })

    return UserProfileResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        created_at=user.created_at,
        active_tenant_id=tenant_ctx.tenant_id,
        active_org_id=tenant_ctx.org_id,
        organizations=org_list
    )

@router.post("/switch-tenant", response_model=TokenResponse)
def switch_tenant(req: SwitchTenantRequest, tenant_ctx: TenantContext = Depends(get_current_tenant), db: Session = Depends(get_db)):
    if not tenant_ctx.user_id:
        raise HTTPException(status_code=400, detail="Cannot switch tenant from an API Key context.")

    user = db.query(User).filter(User.id == tenant_ctx.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    membership = db.query(OrgMember).filter(
        OrgMember.user_id == user.id,
        OrgMember.org_id == req.org_id
    ).first()

    if not membership:
        raise HTTPException(status_code=403, detail="You do not have access to this organization.")

    org = db.query(Organization).filter(Organization.id == req.org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")

    token_payload = {
        "user_id": user.id,
        "email": user.email,
        "name": user.name,
        "org_id": org.id,
        "tenant_id": org.tenant_id,
        "role": membership.role
    }
    access_token = create_access_token(token_payload)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        name=user.name,
        active_tenant_id=org.tenant_id,
        active_org_id=org.id,
        active_org_name=org.name,
        role=membership.role
    )

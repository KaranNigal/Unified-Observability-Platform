import re
import secrets
from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session
from typing import List
from src.db import get_db
from src.models import User, Organization, Membership, MembershipRole
from src.schemas import (
    OrgCreateRequest,
    OrgUpdateRequest,
    OrgResponse,
    InviteMemberRequest,
    UpdateMemberRoleRequest,
    MembershipResponse
)
from src.security.auth import (
    get_current_user,
    require_org_member,
    require_org_admin,
    require_org_owner
)

router = APIRouter(prefix="/organizations", tags=["organizations"])

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    return re.sub(r'[-\s]+', '-', text)

@router.post("", response_model=OrgResponse)
def create_organization(
    req: OrgCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    base_slug = req.slug or slugify(req.name) or f"org-{secrets.token_hex(3)}"
    slug = base_slug
    counter = 1
    while db.query(Organization).filter(Organization.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    org = Organization(name=req.name, slug=slug)
    db.add(org)
    db.flush()

    membership = Membership(
        org_id=org.id,
        user_id=current_user.id,
        role=MembershipRole.OWNER.value
    )
    db.add(membership)
    db.commit()
    db.refresh(org)

    return OrgResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        role=MembershipRole.OWNER.value,
        created_at=org.created_at,
        updated_at=org.updated_at
    )

@router.get("", response_model=List[OrgResponse])
def list_organizations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    memberships = db.query(Membership).filter(Membership.user_id == current_user.id).all()
    results = []
    for m in memberships:
        org = m.organization
        if org:
            results.append(
                OrgResponse(
                    id=org.id,
                    name=org.name,
                    slug=org.slug,
                    role=m.role,
                    created_at=org.created_at,
                    updated_at=org.updated_at
                )
            )
    return results

@router.get("/{org_id}", response_model=OrgResponse)
def get_organization(
    org_id: str = Path(...),
    membership: Membership = Depends(require_org_member),
    db: Session = Depends(get_db)
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return OrgResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        role=membership.role,
        created_at=org.created_at,
        updated_at=org.updated_at
    )

@router.patch("/{org_id}", response_model=OrgResponse)
def update_organization(
    req: OrgUpdateRequest,
    org_id: str = Path(...),
    membership: Membership = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if req.name:
        org.name = req.name
    if req.slug:
        existing = db.query(Organization).filter(Organization.slug == req.slug, Organization.id != org_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Slug already taken")
        org.slug = req.slug

    db.commit()
    db.refresh(org)
    return OrgResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        role=membership.role,
        created_at=org.created_at,
        updated_at=org.updated_at
    )

@router.delete("/{org_id}")
def delete_organization(
    org_id: str = Path(...),
    membership: Membership = Depends(require_org_owner),
    db: Session = Depends(get_db)
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    db.delete(org)
    db.commit()
    return {"message": "Organization deleted successfully"}

# --- Memberships Sub-router ---

@router.post("/{org_id}/members", response_model=MembershipResponse)
def invite_member(
    req: InviteMemberRequest,
    org_id: str = Path(...),
    admin_membership: Membership = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    # Check valid role
    valid_roles = [r.value for r in MembershipRole]
    if req.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Choose from: {valid_roles}")

    # Check if user exists, if not auto-provision placeholder or reject
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not registered. The user must create an account first."
        )

    # Check if already a member
    existing_mem = db.query(Membership).filter(
        Membership.org_id == org_id,
        Membership.user_id == user.id
    ).first()
    if existing_mem:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this organization"
        )

    mem = Membership(
        org_id=org_id,
        user_id=user.id,
        role=req.role
    )
    db.add(mem)
    db.commit()
    db.refresh(mem)

    return MembershipResponse(
        id=mem.id,
        org_id=mem.org_id,
        user_id=user.id,
        user_email=user.email,
        user_name=user.name,
        role=mem.role,
        created_at=mem.created_at
    )

@router.get("/{org_id}/members", response_model=List[MembershipResponse])
def list_members(
    org_id: str = Path(...),
    membership: Membership = Depends(require_org_member),
    db: Session = Depends(get_db)
):
    members = db.query(Membership).filter(Membership.org_id == org_id).all()
    return [
        MembershipResponse(
            id=m.id,
            org_id=m.org_id,
            user_id=m.user.id,
            user_email=m.user.email,
            user_name=m.user.name,
            role=m.role,
            created_at=m.created_at
        )
        for m in members
        if m.user
    ]

@router.patch("/{org_id}/members/{membership_id}", response_model=MembershipResponse)
def update_member_role(
    req: UpdateMemberRoleRequest,
    org_id: str = Path(...),
    membership_id: str = Path(...),
    admin_membership: Membership = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    valid_roles = [r.value for r in MembershipRole]
    if req.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Choose from: {valid_roles}")

    target_mem = db.query(Membership).filter(
        Membership.id == membership_id,
        Membership.org_id == org_id
    ).first()
    if not target_mem:
        raise HTTPException(status_code=404, detail="Membership not found")

    # Prevent demoting the last owner
    if target_mem.role == "owner" and req.role != "owner":
        owner_count = db.query(Membership).filter(
            Membership.org_id == org_id,
            Membership.role == "owner"
        ).count()
        if owner_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot demote the only organization owner")

    target_mem.role = req.role
    db.commit()
    db.refresh(target_mem)

    return MembershipResponse(
        id=target_mem.id,
        org_id=target_mem.org_id,
        user_id=target_mem.user.id,
        user_email=target_mem.user.email,
        user_name=target_mem.user.name,
        role=target_mem.role,
        created_at=target_mem.created_at
    )

@router.delete("/{org_id}/members/{membership_id}")
def remove_member(
    org_id: str = Path(...),
    membership_id: str = Path(...),
    admin_membership: Membership = Depends(require_org_admin),
    db: Session = Depends(get_db)
):
    target_mem = db.query(Membership).filter(
        Membership.id == membership_id,
        Membership.org_id == org_id
    ).first()
    if not target_mem:
        raise HTTPException(status_code=404, detail="Membership not found")

    if target_mem.role == "owner":
        owner_count = db.query(Membership).filter(
            Membership.org_id == org_id,
            Membership.role == "owner"
        ).count()
        if owner_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the only organization owner")

    db.delete(target_mem)
    db.commit()
    return {"message": "Member removed successfully"}

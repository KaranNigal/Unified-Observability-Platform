from fastapi import Depends, HTTPException, status, Path
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
from src.db import get_db
from src.models import User, Membership, Organization
from src.security.security import decode_token

security_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required"
        )
    token = credentials.credentials
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token"
        )
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user

def require_org_member(
    org_id: str = Path(..., description="Organization ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Membership:
    """
    Validates that the user belongs to the requested organization.
    """
    membership = db.query(Membership).filter(
        Membership.org_id == org_id,
        Membership.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not a member of this organization"
        )
    return membership

def require_org_admin(
    org_id: str = Path(..., description="Organization ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Membership:
    """
    Validates that the user has admin or owner role in the organization.
    """
    membership = require_org_member(org_id=org_id, current_user=current_user, db=db)
    if membership.role not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin or Owner privileges required for this action"
        )
    return membership

def require_org_owner(
    org_id: str = Path(..., description="Organization ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Membership:
    """
    Validates that the user is the owner of the organization.
    """
    membership = require_org_member(org_id=org_id, current_user=current_user, db=db)
    if membership.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Owner privileges required for this action"
        )
    return membership

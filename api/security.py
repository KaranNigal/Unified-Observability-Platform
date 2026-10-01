import os
import hashlib
import secrets
import datetime
from typing import Optional, Dict, Any
import jwt
import bcrypt
from config import settings

def hash_password(password: str) -> str:
    # Truncate to 72 bytes as required by bcrypt specification
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False

def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()

def generate_api_key(prefix: str = "cap_live_") -> tuple[str, str, str]:
    """
    Generates a secure API key.
    Returns (raw_key, key_hash, key_prefix)
    """
    raw_secret = secrets.token_urlsafe(32)
    raw_key = f"{prefix}{raw_secret}"
    key_hash = hash_api_key(raw_key)
    key_prefix = raw_key[:12] + "..."
    return raw_key, key_hash, key_prefix

def create_access_token(data: Dict[str, Any], expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except Exception:
        return None

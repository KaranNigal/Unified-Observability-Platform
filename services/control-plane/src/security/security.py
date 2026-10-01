import datetime
import hashlib
import secrets
from typing import Any

import bcrypt
import jwt
from src.config import settings


def hash_password(password: str) -> str:
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


def generate_api_key(prefix: str = "uop_live_") -> tuple[str, str, str]:
    """
    Generates a secure API key prefixed with uop_live_.
    Returns (raw_key, key_hash, key_prefix)
    """
    raw_secret = secrets.token_urlsafe(32)
    raw_key = f"{prefix}{raw_secret}"
    key_hash = hash_api_key(raw_key)
    key_prefix = f"{prefix}{raw_secret[:6]}..."
    return raw_key, key_hash, key_prefix


def create_access_token(
    user_id: str, email: str, expires_delta: datetime.timedelta | None = None
) -> str:
    expire = datetime.datetime.now(datetime.UTC) + (
        expires_delta
        or datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": expire,
        "iat": datetime.datetime.now(datetime.UTC),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(
    user_id: str, email: str, expires_delta: datetime.timedelta | None = None
) -> str:
    expire = datetime.datetime.now(datetime.UTC) + (
        expires_delta or datetime.timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    payload = {
        "sub": user_id,
        "email": email,
        "type": "refresh",
        "exp": expire,
        "iat": datetime.datetime.now(datetime.UTC),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
    except Exception:
        return None

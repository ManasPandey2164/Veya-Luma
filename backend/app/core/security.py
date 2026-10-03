"""Security, cryptography, and token primitives for Veya Luma.

Provides Argon2id password hashing, constant-time verification, password policy validation,
and JWT access/refresh token generation and verification.
"""

import hashlib
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import jwt
from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import settings

# Configure Argon2id password hasher according to OWASP recommendations
# Type.ID: Argon2id (hybrid data-dependent / data-independent memory access)
_password_hasher = PasswordHasher(
    time_cost=2,
    memory_cost=65536,  # 64 MiB
    parallelism=1,
    hash_len=32,
    type=Type.ID,
)


class SecurityError(Exception):
    """Base exception for security-related errors."""


class PasswordPolicyError(SecurityError):
    """Raised when a password fails password policy requirements."""


def hash_password(plain_password: str) -> str:
    """Hashes a plaintext password using Argon2id.

    Never logs or persists the plaintext password.
    """
    return _password_hasher.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against an Argon2id hash in constant time."""
    try:
        return _password_hasher.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def validate_password_requirements(password: str) -> None:
    """Validates that a password satisfies security policy requirements.

    Requirements:
    - Between 8 and 128 characters in length
    - At least one lowercase letter
    - At least one uppercase letter
    - At least one digit or special character
    - Not entirely whitespace
    """
    if len(password) < 8:
        raise PasswordPolicyError("Password must be at least 8 characters long.")
    if len(password) > 128:
        raise PasswordPolicyError("Password must not exceed 128 characters.")
    if not re.search(r"[a-z]", password):
        raise PasswordPolicyError(
            "Password must contain at least one lowercase letter."
        )
    if not re.search(r"[A-Z]", password):
        raise PasswordPolicyError(
            "Password must contain at least one uppercase letter."
        )
    if not re.search(r"[0-9\W_]", password):
        raise PasswordPolicyError(
            "Password must contain at least one number or special character."
        )


def create_access_token(
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Generates a signed JWT access token containing subject and session identifiers."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": str(user_id),
        "sid": str(session_id),
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "jti": str(uuid.uuid4()),
    }

    return jwt.encode(
        payload,
        settings.effective_jwt_secret,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> dict[str, Any]:
    """Decodes and validates a signed JWT access token.

    Verifies signature, expiration, algorithm, and token type.
    """
    payload = jwt.decode(
        token,
        settings.effective_jwt_secret,
        algorithms=[settings.JWT_ALGORITHM],
        options={"require": ["sub", "sid", "exp", "type"]},
    )
    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("Token type must be 'access'.")
    return payload


def generate_refresh_token() -> tuple[str, str]:
    """Generates a high-entropy cryptographically random refresh credential.

    Returns:
        (raw_token, token_hash):
        - raw_token is provided to the client (e.g. in an HTTP-only cookie).
        - token_hash is the SHA-256 hex digest to be stored authoritatively in PostgreSQL.
    """
    raw_token = secrets.token_urlsafe(48)
    token_hash = hash_refresh_token(raw_token)
    return raw_token, token_hash


def hash_refresh_token(raw_token: str) -> str:
    """Computes the SHA-256 hex digest of a raw refresh credential."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

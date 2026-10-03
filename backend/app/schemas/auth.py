"""Pydantic API schemas for authentication, user identity, and session management.

Ensures sensitive credentials, password hashes, and refresh token digests
are strictly decoupled from public API payloads.
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRegisterRequest(BaseModel):
    """Payload for registering a new user account."""

    email: EmailStr = Field(
        ...,
        description="Valid email address for the user account",
        examples=["cinephile@veyaluma.internal"],
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Password satisfying complexity policy (8-128 chars, upper, lower, digit/special)",
        examples=["LuminaryAuteur2026!"],
    )
    username: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=50,
        pattern=r"^[a-zA-Z0-9_-]+$",
        description="Optional unique alphanumeric handle/username",
        examples=["auteur_explorer"],
    )
    display_name: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Public display name for curator profile",
        examples=["Auteur Explorer"],
    )
    guest_session_id: Optional[uuid.UUID] = Field(
        default=None,
        description="Optional anonymous guest session ID to reconcile with the new registered account",
    )


class UserLoginRequest(BaseModel):
    """Payload for credential authentication."""

    email: EmailStr = Field(
        ...,
        description="User account email address",
        examples=["cinephile@veyaluma.internal"],
    )
    password: str = Field(
        ...,
        description="Account plaintext password to verify",
        examples=["LuminaryAuteur2026!"],
    )
    guest_session_id: Optional[uuid.UUID] = Field(
        default=None,
        description="Optional anonymous guest session ID to reconcile upon successful login",
    )


class RefreshTokenRequest(BaseModel):
    """Payload for explicit refresh token submission (when cookies are not utilized)."""

    refresh_token: Optional[str] = Field(
        default=None,
        description="Raw rotating refresh token string (optional if provided via HTTP-only cookie)",
    )


class PublicUser(BaseModel):
    """Safe, sanitized representation of an authenticated user."""

    id: uuid.UUID
    email: str
    username: Optional[str] = None
    display_name: Optional[str] = None
    is_active: bool
    is_verified: bool
    locale: str
    country_code: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    """Authentication response returning access token, session ID, and user metadata."""

    access_token: str
    refresh_token: Optional[str] = Field(
        default=None,
        description="Provided in body for non-browser/cookie-restricted clients",
    )
    token_type: str = "bearer"
    expires_in: int = Field(
        ...,
        description="Access token lifespan in seconds",
        examples=[900],
    )
    user: PublicUser
    session_id: uuid.UUID
    guest_reconciled: bool = False


class GuestSessionCreateRequest(BaseModel):
    """Request to initiate an anonymous discovery session."""

    user_agent: Optional[str] = None


class GuestSessionResponse(BaseModel):
    """Anonymous guest session metadata."""

    guest_session_id: uuid.UUID
    session_type: str = "guest"
    expires_at: datetime
    created_at: datetime


class AuthMessage(BaseModel):
    """Standard operation response envelope."""

    message: str
    status: str = "ok"

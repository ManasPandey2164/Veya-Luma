import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

import jwt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import get_async_session
from app.models.user import User, UserSession
from app.repositories.session import SessionRepository

# HTTPBearer schemes
bearer_scheme = HTTPBearer(auto_error=True)
optional_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        optional_bearer_scheme
    ),
    db: AsyncSession = Depends(get_async_session),
) -> User:
    """Validates the Bearer JWT access token and returns the current active User.

    Enforces that:
    1. The token signature, algorithm, and lifespan are valid.
    2. The token type is 'access'.
    3. The backing PostgreSQL session exists and is unrevoked and unexpired.
    4. The user account exists and is in an active state.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except (jwt.InvalidTokenError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    raw_user_id = payload.get("sub")
    raw_session_id = payload.get("sid")

    if not raw_user_id or not raw_session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing required subject or session identifiers.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_uuid = uuid.UUID(raw_user_id)
        session_uuid = uuid.UUID(raw_session_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token identity format.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    # Validate against authoritative PostgreSQL session
    session_repo = SessionRepository(db)
    session = await session_repo.get_by_id(session_uuid)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session does not exist or has been invalidated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if session.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    now = datetime.now(timezone.utc)
    if session.expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please refresh your session.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = session.user
    if not user or user.id != user_uuid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with session not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive or disabled.",
        )

    return user


async def get_current_session(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        optional_bearer_scheme
    ),
    db: AsyncSession = Depends(get_async_session),
) -> UserSession:
    """Returns the authoritative UserSession associated with the current Bearer token."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        session_uuid = uuid.UUID(payload["sid"])
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    session_repo = SessionRepository(db)
    session = await session_repo.get_by_id(session_uuid)
    if (
        not session
        or session.revoked_at is not None
        or session.expires_at <= datetime.now(timezone.utc)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session is invalid, expired, or revoked.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return session


@dataclass(frozen=True)
class ActorIdentity:
    """Represents an identified caller: either an authenticated user or an active guest session."""

    user_id: Optional[uuid.UUID]
    session_id: Optional[uuid.UUID]
    is_authenticated: bool
    is_guest: bool


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        optional_bearer_scheme
    ),
    db: AsyncSession = Depends(get_async_session),
) -> Optional[User]:
    """Returns the authenticated User if valid Bearer credentials are provided, or None."""
    if not credentials:
        return None
    try:
        return await get_current_user(credentials=credentials, db=db)
    except HTTPException:
        return None


async def get_guest_session_id(
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
) -> Optional[uuid.UUID]:
    """Extracts and parses optional X-Session-ID header for guest telemetry."""
    if not x_session_id:
        return None
    try:
        return uuid.UUID(x_session_id)
    except ValueError:
        return None


async def get_actor_identity(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        optional_bearer_scheme
    ),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: AsyncSession = Depends(get_async_session),
) -> ActorIdentity:
    """Resolves caller identity from either valid Bearer JWT or active PostgreSQL guest session.

    Enforces that guest sessions must be of type 'guest', unrevoked, and unexpired.
    Rejects any unverified identity with 401 Unauthorized.
    """
    # 1. Try authenticated Bearer token first
    if credentials and credentials.credentials:
        try:
            user = await get_current_user(credentials=credentials, db=db)
            session = await get_current_session(credentials=credentials, db=db)
            return ActorIdentity(
                user_id=user.id,
                session_id=session.id,
                is_authenticated=True,
                is_guest=False,
            )
        except HTTPException:
            # Token failed validation; if guest header present, continue to guest validation
            pass

    # 2. Try guest session header
    if x_session_id:
        try:
            guest_session_uuid = uuid.UUID(x_session_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Malformed guest session identifier.",
                headers={"WWW-Authenticate": "Bearer"},
            ) from exc

        session_repo = SessionRepository(db)
        guest_session = await session_repo.get_by_id(guest_session_uuid)

        if not guest_session or guest_session.session_type != "guest":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Guest session does not exist or is invalid.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if guest_session.revoked_at is not None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Guest session has been revoked.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        now = datetime.now(timezone.utc)
        if guest_session.expires_at <= now:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Guest session has expired.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return ActorIdentity(
            user_id=None,
            session_id=guest_session.id,
            is_authenticated=False,
            is_guest=True,
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication or valid guest session required.",
        headers={"WWW-Authenticate": "Bearer"},
    )

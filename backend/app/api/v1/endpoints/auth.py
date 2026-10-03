"""FastAPI authentication endpoints for Veya Luma.

Provides registration, login, refresh-token rotation, logout, anonymous guest sessions,
and current user inspection.
"""

from typing import Optional

from fastapi import APIRouter, Cookie, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_optional_current_user
from app.core.config import settings
from app.db.session import get_async_session
from app.models.user import User
from app.schemas.auth import (
    AuthMessage,
    GuestSessionCreateRequest,
    GuestSessionResponse,
    PublicUser,
    RefreshTokenRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
)
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """Sets a secure, HTTP-only rotating refresh token cookie."""
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        domain=settings.AUTH_COOKIE_DOMAIN,
        path=settings.AUTH_COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response) -> None:
    """Clears the HTTP-only refresh token cookie."""
    response.delete_cookie(
        key=settings.AUTH_COOKIE_NAME,
        domain=settings.AUTH_COOKIE_DOMAIN,
        path=settings.AUTH_COOKIE_PATH,
    )


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
    description=(
        "Registers a new user with Argon2id password hashing, creates an authoritative "
        "PostgreSQL session, generates access/refresh tokens, and optionally reconciles "
        "an anonymous guest session."
    ),
)
async def register(
    payload: UserRegisterRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_async_session),
) -> TokenResponse:
    """Registers a new user and issues authentication credentials."""
    user_agent = request.headers.get("user-agent")
    client_ip = request.client.host if request.client else None

    service = AuthService(db)
    (
        user,
        session,
        access_token,
        raw_refresh_token,
        guest_reconciled,
    ) = await service.register(
        payload=payload,
        user_agent=user_agent,
        ip_address=client_ip,
    )

    _set_refresh_cookie(response, raw_refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=PublicUser.model_validate(user),
        session_id=session.id,
        guest_reconciled=guest_reconciled,
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate user credentials",
    description=(
        "Authenticates with email and password, creates an authoritative persistent "
        "session, rotates refresh credentials, and issues an access token."
    ),
)
async def login(
    payload: UserLoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_async_session),
) -> TokenResponse:
    """Authenticates credentials and establishes a persistent session."""
    user_agent = request.headers.get("user-agent")
    client_ip = request.client.host if request.client else None

    service = AuthService(db)
    (
        user,
        session,
        access_token,
        raw_refresh_token,
        guest_reconciled,
    ) = await service.login(
        payload=payload,
        user_agent=user_agent,
        ip_address=client_ip,
    )

    _set_refresh_cookie(response, raw_refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=PublicUser.model_validate(user),
        session_id=session.id,
        guest_reconciled=guest_reconciled,
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Rotate refresh token and issue new access token",
    description=(
        "Validates the authoritative session in PostgreSQL, performs refresh token rotation, "
        "invalidates the previous refresh credential, and issues a fresh access token."
    ),
)
async def refresh_tokens(
    request: Request,
    response: Response,
    body: Optional[RefreshTokenRequest] = None,
    cookie_token: Optional[str] = Cookie(None, alias=settings.AUTH_COOKIE_NAME),
    db: AsyncSession = Depends(get_async_session),
) -> TokenResponse:
    """Rotates refresh token and issues a new access token."""
    raw_token = (
        body.refresh_token if body and body.refresh_token else None
    ) or cookie_token

    service = AuthService(db)
    user, session, new_access_token, new_raw_refresh_token = await service.refresh(
        raw_refresh_token=raw_token or "",
    )

    _set_refresh_cookie(response, new_raw_refresh_token)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_raw_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=PublicUser.model_validate(user),
        session_id=session.id,
        guest_reconciled=False,
    )


@router.post(
    "/logout",
    response_model=AuthMessage,
    status_code=status.HTTP_200_OK,
    summary="Revoke session and clear cookies",
    description="Revokes the persistent session in PostgreSQL and clears authentication cookies.",
)
async def logout(
    response: Response,
    body: Optional[RefreshTokenRequest] = None,
    cookie_token: Optional[str] = Cookie(None, alias=settings.AUTH_COOKIE_NAME),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> AuthMessage:
    """Revokes the current session and clears authentication cookies."""
    raw_token = (
        body.refresh_token if body and body.refresh_token else None
    ) or cookie_token

    service = AuthService(db)
    await service.logout(raw_refresh_token=raw_token)

    _clear_refresh_cookie(response)
    return AuthMessage(message="Logged out successfully.", status="ok")


@router.post(
    "/guest",
    response_model=GuestSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create anonymous guest session",
    description=(
        "Creates a transient anonymous discovery session in PostgreSQL for unauthenticated "
        "visitors without creating a fake permanent user."
    ),
)
async def create_guest(
    request: Request,
    body: Optional[GuestSessionCreateRequest] = None,
    db: AsyncSession = Depends(get_async_session),
) -> GuestSessionResponse:
    """Initiates an anonymous discovery session."""
    user_agent = request.headers.get("user-agent") or (
        body.user_agent if body else None
    )
    client_ip = request.client.host if request.client else None

    service = AuthService(db)
    guest_session = await service.create_guest_session(
        user_agent=user_agent,
        ip_address=client_ip,
    )

    return GuestSessionResponse(
        guest_session_id=guest_session.id,
        session_type=guest_session.session_type,
        expires_at=guest_session.expires_at,
        created_at=guest_session.created_at,
    )


@router.get(
    "/me",
    response_model=PublicUser,
    status_code=status.HTTP_200_OK,
    summary="Get current authenticated user profile",
    description="Returns the public profile of the currently authenticated user.",
)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> PublicUser:
    """Returns the current user profile from validated access token and session."""
    return PublicUser.model_validate(current_user)

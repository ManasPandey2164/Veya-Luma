"""Authentication, identity reconciliation, and session lifecycle service."""

from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    PasswordPolicyError,
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    validate_password_requirements,
    verify_password,
)
from app.models.user import User, UserSession
from app.repositories.session import SessionRepository
from app.repositories.user import UserRepository
from app.schemas.auth import UserLoginRequest, UserRegisterRequest
from app.schemas.library import ReconcileLibraryRequest
from app.services.library_service import LibraryService


class AuthService:
    """Orchestrates user registration, authentication, token rotation, and guest reconciliation."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.user_repo = UserRepository(db)
        self.session_repo = SessionRepository(db)

    async def register(
        self,
        payload: UserRegisterRequest,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Tuple[User, UserSession, str, str, bool]:
        """Registers a new user account, creates an initial authenticated session,

        and optionally reconciles an existing anonymous guest session.
        """
        # 1. Enforce password complexity policy
        try:
            validate_password_requirements(payload.password)
        except PasswordPolicyError as exc:
            raise HTTPException(
                status_code=getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422),
                detail=str(exc),
            ) from exc

        # 2. Check duplicate email
        existing_email = await self.user_repo.get_by_email(payload.email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists.",
            )

        # 3. Check duplicate username if provided
        if payload.username:
            existing_username = await self.user_repo.get_by_username(payload.username)
            if existing_username:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This username is already taken.",
                )

        # 4. Hash password with Argon2id
        hashed_password = hash_password(payload.password)

        # 5. Persist User entity
        user = await self.user_repo.create(
            email=payload.email,
            hashed_password=hashed_password,
            username=payload.username,
            display_name=payload.display_name
            or (payload.username if payload.username else None),
            is_active=True,
            is_verified=False,
        )

        # 6. Issue initial rotating refresh credential and authenticated session
        raw_refresh_token, refresh_token_hash = generate_refresh_token()
        session_expires_at = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        session = await self.session_repo.create_authenticated_session(
            user_id=user.id,
            refresh_token_hash=refresh_token_hash,
            expires_at=session_expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )

        # 7. Issue short-lived JWT access token
        access_token = create_access_token(user_id=user.id, session_id=session.id)

        # 8. Reconcile anonymous guest session and library data if present
        guest_reconciled = False
        if payload.guest_session_id:
            reconciled = await self.session_repo.reconcile_guest_session(
                guest_session_id=payload.guest_session_id,
                user_id=user.id,
            )
            guest_reconciled = reconciled is not None
            if guest_reconciled:
                library_service = LibraryService(self.db)
                await library_service.reconcile_guest_library(
                    user_id=user.id,
                    payload=ReconcileLibraryRequest(
                        guest_session_id=payload.guest_session_id
                    ),
                )

        await self.db.commit()
        return user, session, access_token, raw_refresh_token, guest_reconciled

    async def login(
        self,
        payload: UserLoginRequest,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Tuple[User, UserSession, str, str, bool]:
        """Authenticates user credentials, creates a new session,

        and optionally reconciles an anonymous guest session.
        """
        # 1. Look up user by email
        user = await self.user_repo.get_by_email(payload.email)
        if not user:
            # Generic error to avoid account enumeration
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # 2. Verify password with Argon2id
        if not verify_password(payload.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # 3. Check active account state
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been disabled. Please contact support.",
            )

        # 4. Generate new rotating refresh credential and session
        raw_refresh_token, refresh_token_hash = generate_refresh_token()
        session_expires_at = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        session = await self.session_repo.create_authenticated_session(
            user_id=user.id,
            refresh_token_hash=refresh_token_hash,
            expires_at=session_expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )

        # 5. Issue short-lived JWT access token
        access_token = create_access_token(user_id=user.id, session_id=session.id)

        # 6. Reconcile guest session and library data if specified
        guest_reconciled = False
        if payload.guest_session_id:
            reconciled = await self.session_repo.reconcile_guest_session(
                guest_session_id=payload.guest_session_id,
                user_id=user.id,
            )
            guest_reconciled = reconciled is not None
            if guest_reconciled:
                library_service = LibraryService(self.db)
                await library_service.reconcile_guest_library(
                    user_id=user.id,
                    payload=ReconcileLibraryRequest(
                        guest_session_id=payload.guest_session_id
                    ),
                )

        await self.db.commit()
        return user, session, access_token, raw_refresh_token, guest_reconciled

    async def refresh(
        self,
        raw_refresh_token: str,
    ) -> Tuple[User, UserSession, str, str]:
        """Validates the rotating refresh token against PostgreSQL authoritative session,

        rotates the refresh credential, and issues a new access token.
        """
        if not raw_refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh credential required.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token_hash = hash_refresh_token(raw_refresh_token)
        session = await self.session_repo.get_by_refresh_token_hash(token_hash)

        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or unrecognized refresh token.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Authoritative revocation check
        if session.revoked_at is not None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has been revoked.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Authoritative expiration check
        now = datetime.now(timezone.utc)
        if session.expires_at <= now:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has expired. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Ensure session belongs to an active user
        if not session.user or not session.user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive or disabled.",
            )

        # Refresh Token Rotation: issue next credential and invalidate previous
        new_raw_refresh_token, new_refresh_token_hash = generate_refresh_token()
        new_expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        updated_session = await self.session_repo.rotate_refresh_token(
            session=session,
            new_refresh_token_hash=new_refresh_token_hash,
            new_expires_at=new_expires_at,
        )

        # Issue new JWT access token
        new_access_token = create_access_token(
            user_id=session.user.id,
            session_id=updated_session.id,
        )

        await self.db.commit()
        return session.user, updated_session, new_access_token, new_raw_refresh_token

    async def logout(
        self,
        raw_refresh_token: Optional[str] = None,
        session_id: Optional[UUID] = None,
    ) -> bool:
        """Revokes the active session in PostgreSQL."""
        revoked = False
        if raw_refresh_token:
            token_hash = hash_refresh_token(raw_refresh_token)
            session = await self.session_repo.get_by_refresh_token_hash(token_hash)
            if session and session.revoked_at is None:
                await self.session_repo.revoke_session(session)
                revoked = True

        if session_id and not revoked:
            session = await self.session_repo.get_by_id(session_id)
            if session and session.revoked_at is None:
                await self.session_repo.revoke_session(session)
                revoked = True

        await self.db.commit()
        return revoked

    async def create_guest_session(
        self,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> UserSession:
        """Creates an anonymous discovery guest session."""
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=settings.GUEST_SESSION_EXPIRE_DAYS
        )
        session = await self.session_repo.create_guest_session(
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        await self.db.commit()
        return session

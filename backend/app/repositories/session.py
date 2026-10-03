"""SQLAlchemy repository for UserSession persistence operations."""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import UserSession


class SessionRepository:
    """Repository managing UserSession records in PostgreSQL."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, session_id: UUID) -> Optional[UserSession]:
        """Loads a UserSession by synthetic UUID with associated User."""
        stmt = (
            select(UserSession)
            .options(selectinload(UserSession.user))
            .where(UserSession.id == session_id)
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_by_refresh_token_hash(self, token_hash: str) -> Optional[UserSession]:
        """Loads a UserSession by active refresh token hash."""
        stmt = (
            select(UserSession)
            .options(selectinload(UserSession.user))
            .where(UserSession.refresh_token_hash == token_hash)
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def create_authenticated_session(
        self,
        user_id: UUID,
        refresh_token_hash: str,
        expires_at: datetime,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> UserSession:
        """Persists a new authenticated user session with a rotating refresh token hash."""
        session = UserSession(
            user_id=user_id,
            session_type="authenticated",
            refresh_token_hash=refresh_token_hash,
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        self.db.add(session)
        await self.db.flush()
        await self.db.refresh(session)
        return session

    async def create_guest_session(
        self,
        expires_at: datetime,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> UserSession:
        """Persists a new anonymous discovery guest session."""
        session = UserSession(
            user_id=None,
            session_type="guest",
            refresh_token_hash=None,
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        self.db.add(session)
        await self.db.flush()
        await self.db.refresh(session)
        return session

    async def rotate_refresh_token(
        self,
        session: UserSession,
        new_refresh_token_hash: str,
        new_expires_at: datetime,
    ) -> UserSession:
        """Rotates the session refresh token hash and extends session expiration."""
        session.refresh_token_hash = new_refresh_token_hash
        session.expires_at = new_expires_at
        session.updated_at = datetime.now(timezone.utc)
        self.db.add(session)
        await self.db.flush()
        await self.db.refresh(session)
        return session

    async def revoke_session(self, session: UserSession) -> UserSession:
        """Marks a session as revoked immediately."""
        session.revoked_at = datetime.now(timezone.utc)
        session.updated_at = datetime.now(timezone.utc)
        self.db.add(session)
        await self.db.flush()
        await self.db.refresh(session)
        return session

    async def reconcile_guest_session(
        self,
        guest_session_id: UUID,
        user_id: UUID,
    ) -> Optional[UserSession]:
        """Reconciles an anonymous guest session with a registered account identity."""
        guest_session = await self.get_by_id(guest_session_id)
        if not guest_session:
            return None
        # Reconcile if it's a guest session and hasn't been reconciled yet
        if guest_session.session_type == "guest":
            guest_session.reconciled_at = datetime.now(timezone.utc)
            guest_session.reconciled_user_id = user_id
            guest_session.updated_at = datetime.now(timezone.utc)
            self.db.add(guest_session)
            await self.db.flush()
            await self.db.refresh(guest_session)
        return guest_session

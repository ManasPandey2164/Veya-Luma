"""SQLAlchemy repository for UserMovieEvent append-oriented telemetry."""

from typing import Any, Dict, Optional, Sequence
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.preference import UserMovieEvent


class UserMovieEventRepository:
    """Repository handling append-oriented behavioral telemetry persistence."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def record_event(
        self,
        movie_id: UUID,
        event_type: str,
        user_id: Optional[UUID] = None,
        session_id: Optional[UUID] = None,
        event_value: Optional[float] = None,
        source: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> UserMovieEvent:
        """Appends a behavioral event record."""
        event = UserMovieEvent(
            movie_id=movie_id,
            user_id=user_id,
            session_id=session_id,
            event_type=event_type,
            event_value=event_value,
            source=source,
            event_metadata=metadata or {},
        )
        self.db.add(event)
        await self.db.flush()
        await self.db.refresh(event)
        return event

    async def get_user_events(
        self,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0,
        event_type: Optional[str] = None,
    ) -> tuple[Sequence[UserMovieEvent], int]:
        """Loads events for a specific authenticated user with optional event_type filter."""
        base_stmt = select(UserMovieEvent).where(UserMovieEvent.user_id == user_id)
        if event_type:
            base_stmt = base_stmt.where(UserMovieEvent.event_type == event_type)

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        count_res = await self.db.execute(count_stmt)
        total = count_res.scalar() or 0

        paged_stmt = (
            base_stmt.order_by(
                UserMovieEvent.created_at.desc(), UserMovieEvent.id.asc()
            )
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(paged_stmt)
        return result.scalars().all(), total

    async def get_recent_user_events(
        self,
        user_id: UUID,
        limit: int = 20,
    ) -> Sequence[UserMovieEvent]:
        """Loads the most recent events for a user."""
        stmt = (
            select(UserMovieEvent)
            .where(UserMovieEvent.user_id == user_id)
            .order_by(UserMovieEvent.created_at.desc(), UserMovieEvent.id.asc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_movie_events(
        self,
        movie_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[Sequence[UserMovieEvent], int]:
        """Loads events for a specific canonical movie."""
        base_stmt = select(UserMovieEvent).where(UserMovieEvent.movie_id == movie_id)

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        count_res = await self.db.execute(count_stmt)
        total = count_res.scalar() or 0

        paged_stmt = (
            base_stmt.order_by(
                UserMovieEvent.created_at.desc(), UserMovieEvent.id.asc()
            )
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(paged_stmt)
        return result.scalars().all(), total

    async def reconcile_events_for_session(
        self,
        guest_session_id: UUID,
        user_id: UUID,
    ) -> int:
        """Reassigns anonymous guest events to the authenticated user account."""
        stmt = (
            update(UserMovieEvent)
            .where(
                UserMovieEvent.session_id == guest_session_id,
                UserMovieEvent.user_id.is_(None),
            )
            .values(user_id=user_id)
        )
        result = await self.db.execute(stmt)
        await self.db.flush()
        count: int = getattr(result, "rowcount", 0)
        return count

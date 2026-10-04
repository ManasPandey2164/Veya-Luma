"""SQLAlchemy repository for Watchlist persistence operations."""

from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.movie import Movie, MovieTag
from app.models.preference import Watchlist


class WatchlistRepository:
    """Repository handling persistent watchlist items."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_item(
        self,
        movie_id: UUID,
        user_id: Optional[UUID] = None,
        session_id: Optional[UUID] = None,
    ) -> Optional[Watchlist]:
        """Looks up a specific watchlist record by movie and owner."""
        stmt = select(Watchlist).where(Watchlist.movie_id == movie_id)
        if user_id is not None:
            stmt = stmt.where(Watchlist.user_id == user_id)
        elif session_id is not None:
            stmt = stmt.where(Watchlist.session_id == session_id)
        else:
            return None

        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def add_to_watchlist(
        self,
        movie_id: UUID,
        user_id: Optional[UUID] = None,
        session_id: Optional[UUID] = None,
    ) -> tuple[Watchlist, bool]:
        """Idempotently adds a movie to the watchlist.

        Returns (Watchlist, created_bool). If already exists, returns existing with created_bool=False.
        """
        existing = await self.get_item(
            movie_id=movie_id, user_id=user_id, session_id=session_id
        )
        if existing:
            return existing, False

        item = Watchlist(
            movie_id=movie_id,
            user_id=user_id,
            session_id=session_id,
        )
        self.db.add(item)
        await self.db.flush()
        await self.db.refresh(item)
        return item, True

    async def remove_from_watchlist(
        self,
        movie_id: UUID,
        user_id: Optional[UUID] = None,
        session_id: Optional[UUID] = None,
    ) -> bool:
        """Removes a movie from the watchlist safely. Repeated calls are safe."""
        existing = await self.get_item(
            movie_id=movie_id, user_id=user_id, session_id=session_id
        )
        if existing:
            await self.db.delete(existing)
            await self.db.flush()
            return True
        return False

    async def is_in_watchlist(
        self,
        movie_id: UUID,
        user_id: Optional[UUID] = None,
        session_id: Optional[UUID] = None,
    ) -> bool:
        """Checks if a movie is present in the watchlist."""
        item = await self.get_item(
            movie_id=movie_id, user_id=user_id, session_id=session_id
        )
        return item is not None

    async def get_user_watchlist(
        self,
        user_id: UUID,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[Sequence[Watchlist], int]:
        """Loads a user's watchlist with bounded movie relationships, paginated and sorted deterministically."""
        base_stmt = select(Watchlist).where(Watchlist.user_id == user_id)

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        count_res = await self.db.execute(count_stmt)
        total = count_res.scalar() or 0

        paged_stmt = (
            base_stmt.order_by(Watchlist.created_at.desc(), Watchlist.id.asc())
            .offset(offset)
            .limit(limit)
            .options(
                selectinload(Watchlist.movie).selectinload(Movie.artwork),
                selectinload(Watchlist.movie).selectinload(Movie.credits),
                selectinload(Watchlist.movie)
                .selectinload(Movie.taxonomy_tags)
                .selectinload(MovieTag.node),
            )
        )
        result = await self.db.execute(paged_stmt)
        return result.scalars().all(), total

    async def reconcile_watchlist(
        self,
        guest_session_id: UUID,
        user_id: UUID,
    ) -> int:
        """Transfers guest watchlist entries to the authenticated user account without duplicate conflicts."""
        stmt = select(Watchlist).where(
            Watchlist.session_id == guest_session_id,
            Watchlist.user_id.is_(None),
        )
        result = await self.db.execute(stmt)
        guest_items = result.scalars().all()

        reconciled = 0
        for item in guest_items:
            existing = await self.get_item(movie_id=item.movie_id, user_id=user_id)
            if existing is None:
                item.user_id = user_id
                item.session_id = None
                self.db.add(item)
                reconciled += 1
            else:
                # Deduplicate: delete the guest session duplicate
                await self.db.delete(item)

        await self.db.flush()
        return reconciled

    async def reconcile_movie_ids(
        self,
        user_id: UUID,
        movie_ids: list[UUID],
    ) -> int:
        """Merges a list of client-side movie UUIDs into the authenticated user's watchlist."""
        reconciled = 0
        for movie_id in movie_ids:
            _, created = await self.add_to_watchlist(movie_id=movie_id, user_id=user_id)
            if created:
                reconciled += 1
        return reconciled

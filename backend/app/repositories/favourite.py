"""SQLAlchemy repository for Favourite persistence operations."""

from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.movie import Movie, MovieTag
from app.models.preference import Favourite


class FavouriteRepository:
    """Repository handling persistent favourite items."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_item(
        self,
        movie_id: UUID,
        user_id: Optional[UUID] = None,
        session_id: Optional[UUID] = None,
    ) -> Optional[Favourite]:
        """Looks up a specific favourite record by movie and owner."""
        stmt = select(Favourite).where(Favourite.movie_id == movie_id)
        if user_id is not None:
            stmt = stmt.where(Favourite.user_id == user_id)
        elif session_id is not None:
            stmt = stmt.where(Favourite.session_id == session_id)
        else:
            return None

        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def add_favourite(
        self,
        movie_id: UUID,
        user_id: Optional[UUID] = None,
        session_id: Optional[UUID] = None,
    ) -> tuple[Favourite, bool]:
        """Idempotently adds a movie to favourites.

        Returns (Favourite, created_bool). If already exists, returns existing with created_bool=False.
        """
        existing = await self.get_item(
            movie_id=movie_id, user_id=user_id, session_id=session_id
        )
        if existing:
            return existing, False

        item = Favourite(
            movie_id=movie_id,
            user_id=user_id,
            session_id=session_id,
        )
        self.db.add(item)
        await self.db.flush()
        await self.db.refresh(item)
        return item, True

    async def remove_favourite(
        self,
        movie_id: UUID,
        user_id: Optional[UUID] = None,
        session_id: Optional[UUID] = None,
    ) -> bool:
        """Removes a movie from favourites safely. Repeated calls are safe."""
        existing = await self.get_item(
            movie_id=movie_id, user_id=user_id, session_id=session_id
        )
        if existing:
            await self.db.delete(existing)
            await self.db.flush()
            return True
        return False

    async def is_favourite(
        self,
        movie_id: UUID,
        user_id: Optional[UUID] = None,
        session_id: Optional[UUID] = None,
    ) -> bool:
        """Checks if a movie is present in favourites."""
        item = await self.get_item(
            movie_id=movie_id, user_id=user_id, session_id=session_id
        )
        return item is not None

    async def get_user_favourites(
        self,
        user_id: UUID,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[Sequence[Favourite], int]:
        """Loads a user's favourites with bounded movie relationships, paginated and sorted deterministically."""
        base_stmt = select(Favourite).where(Favourite.user_id == user_id)

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        count_res = await self.db.execute(count_stmt)
        total = count_res.scalar() or 0

        paged_stmt = (
            base_stmt.order_by(Favourite.created_at.desc(), Favourite.id.asc())
            .offset(offset)
            .limit(limit)
            .options(
                selectinload(Favourite.movie).selectinload(Movie.artwork),
                selectinload(Favourite.movie).selectinload(Movie.credits),
                selectinload(Favourite.movie)
                .selectinload(Movie.taxonomy_tags)
                .selectinload(MovieTag.node),
            )
        )
        result = await self.db.execute(paged_stmt)
        return result.scalars().all(), total

    async def reconcile_favourites(
        self,
        guest_session_id: UUID,
        user_id: UUID,
    ) -> int:
        """Transfers guest favourite entries to the authenticated user account without duplicate conflicts."""
        stmt = select(Favourite).where(
            Favourite.session_id == guest_session_id,
            Favourite.user_id.is_(None),
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
        """Merges a list of client-side movie UUIDs into the authenticated user's favourites."""
        reconciled = 0
        for movie_id in movie_ids:
            _, created = await self.add_favourite(movie_id=movie_id, user_id=user_id)
            if created:
                reconciled += 1
        return reconciled

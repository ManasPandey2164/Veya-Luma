"""SQLAlchemy repository for MovieRating operations."""

from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.preference import MovieRating


class MovieRatingRepository:
    """Repository handling current-state canonical movie ratings."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_rating(
        self,
        user_id: UUID,
        movie_id: UUID,
    ) -> Optional[MovieRating]:
        """Loads a user's current rating for a canonical movie."""
        stmt = select(MovieRating).where(
            MovieRating.user_id == user_id,
            MovieRating.movie_id == movie_id,
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def upsert_rating(
        self,
        user_id: UUID,
        movie_id: UUID,
        rating: float,
    ) -> MovieRating:
        """Upserts a user's rating for a movie.

        Guarantees exactly one authoritative current rating record per (user_id, movie_id).
        """
        existing = await self.get_rating(user_id=user_id, movie_id=movie_id)
        if existing:
            existing.rating = rating
            self.db.add(existing)
            await self.db.flush()
            await self.db.refresh(existing)
            return existing

        new_rating = MovieRating(
            user_id=user_id,
            movie_id=movie_id,
            rating=rating,
        )
        self.db.add(new_rating)
        await self.db.flush()
        await self.db.refresh(new_rating)
        return new_rating

    async def delete_rating(
        self,
        user_id: UUID,
        movie_id: UUID,
    ) -> bool:
        """Removes a user's rating for a movie."""
        existing = await self.get_rating(user_id=user_id, movie_id=movie_id)
        if existing:
            await self.db.delete(existing)
            await self.db.flush()
            return True
        return False

    async def get_user_ratings(
        self,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[Sequence[MovieRating], int]:
        """Loads all ratings authored by a user, paginated with deterministic ordering."""
        base_stmt = select(MovieRating).where(MovieRating.user_id == user_id)

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        count_res = await self.db.execute(count_stmt)
        total = count_res.scalar() or 0

        paged_stmt = (
            base_stmt.order_by(MovieRating.updated_at.desc(), MovieRating.id.asc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(paged_stmt)
        return result.scalars().all(), total

    async def get_movie_ratings(
        self,
        movie_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[Sequence[MovieRating], int]:
        """Loads ratings for a specific movie."""
        base_stmt = select(MovieRating).where(MovieRating.movie_id == movie_id)

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        count_res = await self.db.execute(count_stmt)
        total = count_res.scalar() or 0

        paged_stmt = (
            base_stmt.order_by(MovieRating.updated_at.desc(), MovieRating.id.asc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(paged_stmt)
        return result.scalars().all(), total

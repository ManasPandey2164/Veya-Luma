"""Service layer for feedback telemetry, movie ratings, and behavioral events."""

import math
from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.movie import Movie
from app.repositories.movie import MovieRepository
from app.repositories.movie_rating import MovieRatingRepository
from app.repositories.user_movie_event import UserMovieEventRepository
from app.schemas.feedback import (
    MovieEventRequest,
    MovieEventResponse,
    MovieRatingResponse,
    PaginatedRatingsResponse,
)


class FeedbackService:
    """Orchestrates validation and persistence of behavioral signals and ratings."""

    VALID_TELEMETRY_EVENTS = {"impression", "detail_view", "click"}
    ALL_VALID_EVENTS = {"impression", "detail_view", "click", "rating"}

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.movie_repo = MovieRepository(db)
        self.rating_repo = MovieRatingRepository(db)
        self.event_repo = UserMovieEventRepository(db)

    async def _verify_movie_exists(self, movie_id: UUID) -> Movie:
        """Verifies canonical movie exists in the catalog; raises 404 if absent."""
        movie = await self.movie_repo.get_by_id(movie_id)
        if not movie:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Canonical movie not found for identifier: {movie_id}",
            )
        return movie

    async def record_rating(
        self,
        user_id: UUID,
        movie_id: UUID,
        rating_value: float,
        session_id: Optional[UUID] = None,
    ) -> MovieRatingResponse:
        """Records or updates a user's movie rating.

        Enforces:
        1. Canonical movie existence.
        2. Rating bounds [1.0, 10.0].
        3. Authoritative current rating record upserted in movie_rating.
        4. Append-oriented immutable rating event recorded in user_movie_event.
        """
        if rating_value < 1.0 or rating_value > 10.0:
            raise HTTPException(
                status_code=getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422),
                detail="Rating must be bounded between 1.0 and 10.0.",
            )

        await self._verify_movie_exists(movie_id)

        # 1. Authoritative current state projection
        rating_record = await self.rating_repo.upsert_rating(
            user_id=user_id,
            movie_id=movie_id,
            rating=rating_value,
        )

        # 2. Append-oriented event log
        await self.event_repo.record_event(
            movie_id=movie_id,
            event_type="rating",
            user_id=user_id,
            session_id=session_id,
            event_value=rating_value,
            source="movie_detail",
            metadata={"rating": rating_value},
        )

        await self.db.commit()
        return MovieRatingResponse.model_validate(rating_record)

    async def get_user_rating(
        self,
        user_id: UUID,
        movie_id: UUID,
    ) -> Optional[MovieRatingResponse]:
        """Loads a user's current rating for a canonical movie."""
        record = await self.rating_repo.get_rating(user_id=user_id, movie_id=movie_id)
        if not record:
            return None
        return MovieRatingResponse.model_validate(record)

    async def get_user_ratings(
        self,
        user_id: UUID,
        page: int = 1,
        limit: int = 50,
    ) -> PaginatedRatingsResponse:
        """Loads all ratings by a user with deterministic pagination."""
        offset = (page - 1) * limit
        records, total = await self.rating_repo.get_user_ratings(
            user_id=user_id,
            limit=limit,
            offset=offset,
        )
        total_pages = math.ceil(total / limit) if total > 0 else 0
        return PaginatedRatingsResponse(
            items=[MovieRatingResponse.model_validate(r) for r in records],
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
        )

    async def delete_user_rating(
        self,
        user_id: UUID,
        movie_id: UUID,
    ) -> bool:
        """Deletes a user's rating safely."""
        deleted = await self.rating_repo.delete_rating(
            user_id=user_id, movie_id=movie_id
        )
        if deleted:
            await self.db.commit()
        return deleted

    async def record_telemetry_event(
        self,
        payload: MovieEventRequest,
        user_id: Optional[UUID] = None,
        session_id: Optional[UUID] = None,
    ) -> MovieEventResponse:
        """Records a behavioral telemetry event (impression, detail_view, click).

        Accepts authenticated user OR validated active guest session.
        """
        if not user_id and not session_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="An authenticated user or valid guest session is required for telemetry.",
            )

        if payload.event_type not in self.VALID_TELEMETRY_EVENTS:
            raise HTTPException(
                status_code=getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422),
                detail=f"Invalid event type '{payload.event_type}'. Supported: {', '.join(sorted(self.VALID_TELEMETRY_EVENTS))}",
            )

        await self._verify_movie_exists(payload.movie_id)

        # Sanitize metadata: prevent arbitrary unbounded JSON payloads
        safe_metadata: Dict[str, Any] = {}
        if payload.event_metadata:
            for k, v in list(payload.event_metadata.items())[:10]:
                if isinstance(v, (str, int, float, bool)):
                    safe_metadata[str(k)[:50]] = v

        event = await self.event_repo.record_event(
            movie_id=payload.movie_id,
            event_type=payload.event_type,
            user_id=user_id,
            session_id=session_id,
            event_value=payload.event_value,
            source=payload.source[:100] if payload.source else None,
            metadata=safe_metadata,
        )

        await self.db.commit()
        return MovieEventResponse(
            id=event.id,
            movie_id=event.movie_id,
            event_type=event.event_type,
            event_value=event.event_value,
            created_at=event.created_at,
            status="recorded",
        )

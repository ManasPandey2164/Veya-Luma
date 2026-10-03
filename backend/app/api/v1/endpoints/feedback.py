"""FastAPI route handlers for movie ratings and telemetry feedback events."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    ActorIdentity,
    get_actor_identity,
    get_current_session,
    get_current_user,
)
from app.db.session import get_async_session
from app.models.user import User, UserSession
from app.schemas.feedback import (
    MovieEventRequest,
    MovieEventResponse,
    MovieRateRequest,
    MovieRatingResponse,
    PaginatedRatingsResponse,
)
from app.services.feedback_service import FeedbackService

router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.post(
    "/rate",
    response_model=MovieRatingResponse,
    status_code=status.HTTP_200_OK,
    summary="Record or update movie rating",
    description=(
        "Records an authoritative movie rating for the authenticated user and appends "
        "an immutable rating event to the telemetry stream."
    ),
)
async def rate_movie(
    payload: MovieRateRequest,
    current_user: User = Depends(get_current_user),
    current_session: UserSession = Depends(get_current_session),
    db: AsyncSession = Depends(get_async_session),
) -> MovieRatingResponse:
    """Records an explicit movie rating."""
    service = FeedbackService(db)
    return await service.record_rating(
        user_id=current_user.id,
        movie_id=payload.movie_id,
        rating_value=payload.rating,
        session_id=current_session.id,
    )


@router.get(
    "/ratings/{movie_id}",
    response_model=Optional[MovieRatingResponse],
    status_code=status.HTTP_200_OK,
    summary="Get user's rating for a movie",
    description="Returns the current authenticated user's rating for a canonical movie, or null if unrated.",
)
async def get_movie_rating(
    movie_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> Optional[MovieRatingResponse]:
    """Retrieves the current user's rating for a specific movie."""
    service = FeedbackService(db)
    return await service.get_user_rating(user_id=current_user.id, movie_id=movie_id)


@router.get(
    "/ratings",
    response_model=PaginatedRatingsResponse,
    status_code=status.HTTP_200_OK,
    summary="List authenticated user's ratings",
    description="Returns a paginated list of all movie ratings authored by the current user.",
)
async def list_user_ratings(
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=50, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> PaginatedRatingsResponse:
    """Lists the current user's ratings."""
    service = FeedbackService(db)
    return await service.get_user_ratings(
        user_id=current_user.id, page=page, limit=limit
    )


@router.delete(
    "/ratings/{movie_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete movie rating",
    description="Safely removes the current user's rating for a movie.",
)
async def delete_movie_rating(
    movie_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> dict[str, str]:
    """Deletes a rating for a specific movie."""
    service = FeedbackService(db)
    deleted = await service.delete_user_rating(
        user_id=current_user.id, movie_id=movie_id
    )
    return {
        "status": "ok",
        "message": "Rating removed" if deleted else "Rating not found",
    }


@router.post(
    "/event",
    response_model=MovieEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record behavioral telemetry event",
    description=(
        "Appends a behavioral event (impression, detail_view, click) for an authenticated "
        "user or validated active guest session."
    ),
)
async def record_behavioral_event(
    payload: MovieEventRequest,
    actor: ActorIdentity = Depends(get_actor_identity),
    db: AsyncSession = Depends(get_async_session),
) -> MovieEventResponse:
    """Records a behavioral telemetry event."""
    service = FeedbackService(db)
    return await service.record_telemetry_event(
        payload=payload,
        user_id=actor.user_id,
        session_id=actor.session_id,
    )

"""FastAPI route handlers for user library (Watchlist, Favourites, and Reconciliation)."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_async_session
from app.models.user import User
from app.schemas.library import (
    FavouriteAddRequest,
    LibraryActionResponse,
    PaginatedLibraryResponse,
    ReconcileLibraryRequest,
    ReconcileLibraryResponse,
    WatchlistAddRequest,
)
from app.services.library_service import LibraryService

router = APIRouter(prefix="/library", tags=["Library"])


# =============================================================================
# WATCHLIST ENDPOINTS
# =============================================================================


@router.post(
    "/watchlist",
    response_model=LibraryActionResponse,
    status_code=status.HTTP_200_OK,
    summary="Add movie to watchlist",
    description="Idempotently saves a canonical movie to the authenticated user's watchlist.",
)
async def add_to_watchlist(
    payload: WatchlistAddRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> LibraryActionResponse:
    """Adds a movie to the user's watchlist."""
    service = LibraryService(db)
    return await service.add_to_watchlist(
        user_id=current_user.id, movie_id=payload.movie_id
    )


@router.delete(
    "/watchlist/{movie_id}",
    response_model=LibraryActionResponse,
    status_code=status.HTTP_200_OK,
    summary="Remove movie from watchlist",
    description="Safely removes a movie from the authenticated user's watchlist.",
)
async def remove_from_watchlist(
    movie_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> LibraryActionResponse:
    """Removes a movie from the user's watchlist."""
    service = LibraryService(db)
    return await service.remove_from_watchlist(
        user_id=current_user.id, movie_id=movie_id
    )


@router.get(
    "/watchlist",
    response_model=PaginatedLibraryResponse,
    status_code=status.HTTP_200_OK,
    summary="List watchlist movies",
    description="Returns a paginated list of canonical movies in the authenticated user's watchlist.",
)
async def get_watchlist(
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> PaginatedLibraryResponse:
    """Lists movies in the user's watchlist."""
    service = LibraryService(db)
    return await service.get_user_watchlist(
        user_id=current_user.id, page=page, limit=limit
    )


# =============================================================================
# FAVOURITES ENDPOINTS
# =============================================================================


@router.post(
    "/favourites/{movie_id}",
    response_model=LibraryActionResponse,
    status_code=status.HTTP_200_OK,
    summary="Add movie to favourites (path parameter)",
    description="Idempotently adds a canonical movie to the user's favourites.",
)
async def add_favourite_path(
    movie_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> LibraryActionResponse:
    """Adds a movie to the user's favourites via path param."""
    service = LibraryService(db)
    return await service.add_favourite(user_id=current_user.id, movie_id=movie_id)


@router.post(
    "/favourites",
    response_model=LibraryActionResponse,
    status_code=status.HTTP_200_OK,
    summary="Add movie to favourites (body payload)",
    description="Idempotently adds a canonical movie to the user's favourites.",
)
async def add_favourite_body(
    payload: FavouriteAddRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> LibraryActionResponse:
    """Adds a movie to the user's favourites via request body."""
    service = LibraryService(db)
    return await service.add_favourite(
        user_id=current_user.id, movie_id=payload.movie_id
    )


@router.delete(
    "/favourites/{movie_id}",
    response_model=LibraryActionResponse,
    status_code=status.HTTP_200_OK,
    summary="Remove movie from favourites",
    description="Safely removes a movie from the authenticated user's favourites.",
)
async def remove_favourite(
    movie_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> LibraryActionResponse:
    """Removes a movie from favourites."""
    service = LibraryService(db)
    return await service.remove_favourite(user_id=current_user.id, movie_id=movie_id)


@router.get(
    "/favourites",
    response_model=PaginatedLibraryResponse,
    status_code=status.HTTP_200_OK,
    summary="List favourite movies",
    description="Returns a paginated list of canonical movies in the authenticated user's favourites.",
)
async def get_favourites(
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> PaginatedLibraryResponse:
    """Lists the user's favourite movies."""
    service = LibraryService(db)
    return await service.get_user_favourites(
        user_id=current_user.id, page=page, limit=limit
    )


# =============================================================================
# RECONCILIATION ENDPOINT
# =============================================================================


@router.post(
    "/reconcile",
    response_model=ReconcileLibraryResponse,
    status_code=status.HTTP_200_OK,
    summary="Reconcile guest library and telemetry into authenticated account",
    description=(
        "Transfers anonymous guest session activity (events, preferences, watchlist, favourites) "
        "and merges client-side bookmarks into the authenticated user account without duplicate conflicts."
    ),
)
async def reconcile_guest_data(
    payload: ReconcileLibraryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> ReconcileLibraryResponse:
    """Reconciles guest state into the authenticated account."""
    service = LibraryService(db)
    return await service.reconcile_guest_library(
        user_id=current_user.id, payload=payload
    )

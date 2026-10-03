"""Pydantic schemas for user library (Watchlist, Favourites, and Reconciliation)."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.catalog import MovieListItem


class WatchlistAddRequest(BaseModel):
    """Payload to add a movie to the user's watchlist."""

    movie_id: UUID = Field(description="Canonical movie UUID")


class FavouriteAddRequest(BaseModel):
    """Payload to add a movie to user favourites."""

    movie_id: UUID = Field(description="Canonical movie UUID")


class LibraryItemResponse(BaseModel):
    """Normalized library entry with bounded movie metadata."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    movie_id: UUID
    created_at: datetime
    movie: Optional[MovieListItem] = Field(
        default=None,
        description="Lightweight bounded canonical movie catalog representation",
    )


class PaginatedLibraryResponse(BaseModel):
    """Paginated collection of library entries."""

    items: list[LibraryItemResponse]
    total: int
    page: int
    limit: int
    total_pages: int
    has_next: bool
    has_prev: bool


class LibraryActionResponse(BaseModel):
    """Response confirming library mutation (add or remove)."""

    status: str = "ok"
    action: str
    movie_id: UUID
    message: str


class ReconcileLibraryRequest(BaseModel):
    """Payload to reconcile anonymous guest activity into authenticated user account."""

    guest_session_id: Optional[UUID] = Field(
        default=None,
        description="Anonymous guest session UUID to reconcile",
    )
    watchlist_movie_ids: Optional[list[UUID]] = Field(
        default=None,
        description="Client-side guest watchlist movie UUIDs to merge",
    )
    favourite_movie_ids: Optional[list[UUID]] = Field(
        default=None,
        description="Client-side guest favourite movie UUIDs to merge",
    )


class ReconcileLibraryResponse(BaseModel):
    """Summary of reconciled records."""

    status: str = "reconciled"
    events_reconciled: int = 0
    watchlist_reconciled: int = 0
    favourites_reconciled: int = 0
    preferences_reconciled: int = 0

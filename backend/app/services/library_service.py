"""Service layer for user library management (Watchlist, Favourites, and Reconciliation)."""

import math
from typing import List
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.movie import Movie
from app.repositories.favourite import FavouriteRepository
from app.repositories.movie import MovieRepository
from app.repositories.user_movie_event import UserMovieEventRepository
from app.repositories.user_preference import UserPreferenceRepository
from app.repositories.watchlist import WatchlistRepository
from app.schemas.library import (
    LibraryActionResponse,
    LibraryItemResponse,
    PaginatedLibraryResponse,
    ReconcileLibraryRequest,
    ReconcileLibraryResponse,
)
from app.services.movie_catalog import MovieCatalogService


class LibraryService:
    """Orchestrates watchlist, favourites, and guest activity reconciliation."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.movie_repo = MovieRepository(db)
        self.watchlist_repo = WatchlistRepository(db)
        self.favourite_repo = FavouriteRepository(db)
        self.event_repo = UserMovieEventRepository(db)
        self.preference_repo = UserPreferenceRepository(db)
        self.catalog_service = MovieCatalogService(db)

    async def _verify_movie_exists(self, movie_id: UUID) -> Movie:
        """Verifies canonical movie exists in the catalog; raises 404 if absent."""
        movie = await self.movie_repo.get_by_id(movie_id)
        if not movie:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Canonical movie not found for identifier: {movie_id}",
            )
        return movie

    # =========================================================================
    # WATCHLIST OPERATIONS
    # =========================================================================

    async def add_to_watchlist(
        self, user_id: UUID, movie_id: UUID
    ) -> LibraryActionResponse:
        """Idempotently adds a movie to the user's watchlist."""
        await self._verify_movie_exists(movie_id)
        _, created = await self.watchlist_repo.add_to_watchlist(
            movie_id=movie_id, user_id=user_id
        )
        await self.db.commit()
        return LibraryActionResponse(
            status="ok",
            action="added",
            movie_id=movie_id,
            message="Saved to watchlist" if created else "Already in watchlist",
        )

    async def remove_from_watchlist(
        self, user_id: UUID, movie_id: UUID
    ) -> LibraryActionResponse:
        """Safely removes a movie from the user's watchlist."""
        removed = await self.watchlist_repo.remove_from_watchlist(
            movie_id=movie_id, user_id=user_id
        )
        await self.db.commit()
        return LibraryActionResponse(
            status="ok",
            action="removed",
            movie_id=movie_id,
            message="Removed from watchlist"
            if removed
            else "Movie was not in watchlist",
        )

    async def is_in_watchlist(self, user_id: UUID, movie_id: UUID) -> bool:
        """Checks if a movie is present in the user's watchlist."""
        return await self.watchlist_repo.is_in_watchlist(
            movie_id=movie_id, user_id=user_id
        )

    async def get_user_watchlist(
        self,
        user_id: UUID,
        page: int = 1,
        limit: int = 20,
    ) -> PaginatedLibraryResponse:
        """Loads a user's watchlist with bounded movie metadata, paginated deterministically."""
        offset = (page - 1) * limit
        records, total = await self.watchlist_repo.get_user_watchlist(
            user_id=user_id,
            limit=limit,
            offset=offset,
        )

        items: List[LibraryItemResponse] = []
        for r in records:
            movie_item = (
                self.catalog_service._to_list_item(r.movie) if r.movie else None
            )
            items.append(
                LibraryItemResponse(
                    id=r.id,
                    movie_id=r.movie_id,
                    created_at=r.created_at,
                    movie=movie_item,
                )
            )

        total_pages = math.ceil(total / limit) if total > 0 else 0
        return PaginatedLibraryResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1,
        )

    # =========================================================================
    # FAVOURITES OPERATIONS
    # =========================================================================

    async def add_favourite(
        self, user_id: UUID, movie_id: UUID
    ) -> LibraryActionResponse:
        """Idempotently adds a movie to the user's favourites."""
        await self._verify_movie_exists(movie_id)
        _, created = await self.favourite_repo.add_favourite(
            movie_id=movie_id, user_id=user_id
        )
        await self.db.commit()
        return LibraryActionResponse(
            status="ok",
            action="added",
            movie_id=movie_id,
            message="Added to favourites" if created else "Already in favourites",
        )

    async def remove_favourite(
        self, user_id: UUID, movie_id: UUID
    ) -> LibraryActionResponse:
        """Safely removes a movie from the user's favourites."""
        removed = await self.favourite_repo.remove_favourite(
            movie_id=movie_id, user_id=user_id
        )
        await self.db.commit()
        return LibraryActionResponse(
            status="ok",
            action="removed",
            movie_id=movie_id,
            message="Removed from favourites"
            if removed
            else "Movie was not in favourites",
        )

    async def is_favourite(self, user_id: UUID, movie_id: UUID) -> bool:
        """Checks if a movie is present in the user's favourites."""
        return await self.favourite_repo.is_favourite(
            movie_id=movie_id, user_id=user_id
        )

    async def get_user_favourites(
        self,
        user_id: UUID,
        page: int = 1,
        limit: int = 20,
    ) -> PaginatedLibraryResponse:
        """Loads a user's favourites with bounded movie metadata, paginated deterministically."""
        offset = (page - 1) * limit
        records, total = await self.favourite_repo.get_user_favourites(
            user_id=user_id,
            limit=limit,
            offset=offset,
        )

        items: List[LibraryItemResponse] = []
        for r in records:
            movie_item = (
                self.catalog_service._to_list_item(r.movie) if r.movie else None
            )
            items.append(
                LibraryItemResponse(
                    id=r.id,
                    movie_id=r.movie_id,
                    created_at=r.created_at,
                    movie=movie_item,
                )
            )

        total_pages = math.ceil(total / limit) if total > 0 else 0
        return PaginatedLibraryResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1,
        )

    # =========================================================================
    # RECONCILIATION
    # =========================================================================

    async def reconcile_guest_library(
        self,
        user_id: UUID,
        payload: ReconcileLibraryRequest,
    ) -> ReconcileLibraryResponse:
        """Reconciles guest telemetry events, preferences, watchlist, and favourites into the authenticated account."""
        events_reconciled = 0
        watchlist_reconciled = 0
        favourites_reconciled = 0
        preferences_reconciled = 0

        # 1. Reconcile database-backed guest session records
        if payload.guest_session_id:
            events_reconciled = await self.event_repo.reconcile_events_for_session(
                guest_session_id=payload.guest_session_id,
                user_id=user_id,
            )
            watchlist_reconciled += await self.watchlist_repo.reconcile_watchlist(
                guest_session_id=payload.guest_session_id,
                user_id=user_id,
            )
            favourites_reconciled += await self.favourite_repo.reconcile_favourites(
                guest_session_id=payload.guest_session_id,
                user_id=user_id,
            )
            preferences_reconciled = (
                await self.preference_repo.reconcile_preferences_for_session(
                    guest_session_id=payload.guest_session_id,
                    user_id=user_id,
                )
            )

        # 2. Merge client-side guest movie IDs (e.g. from local storage)
        if payload.watchlist_movie_ids:
            watchlist_reconciled += await self.watchlist_repo.reconcile_movie_ids(
                user_id=user_id,
                movie_ids=payload.watchlist_movie_ids,
            )

        if payload.favourite_movie_ids:
            favourites_reconciled += await self.favourite_repo.reconcile_movie_ids(
                user_id=user_id,
                movie_ids=payload.favourite_movie_ids,
            )

        await self.db.commit()
        return ReconcileLibraryResponse(
            status="reconciled",
            events_reconciled=events_reconciled,
            watchlist_reconciled=watchlist_reconciled,
            favourites_reconciled=favourites_reconciled,
            preferences_reconciled=preferences_reconciled,
        )

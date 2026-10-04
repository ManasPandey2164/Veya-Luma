"""Service layer for canonical Movie catalog operations.

Orchestrates business logic, UUID resolution, pagination metadata computation,
and model-to-schema transformation between repository data and API response schemas.
"""

import math
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.movie import Movie
from app.repositories.movie import (
    MovieFilterParams,
    MovieRepository,
    MovieSearchParams,
)
from app.schemas.catalog import (
    CastMemberPublic,
    CrewMemberPublic,
    MovieArtworkPublic,
    MovieCollectionPublic,
    MovieCreditsPublic,
    MovieDetail,
    MovieListItem,
    MovieProvenancePublic,
    PaginatedResponse,
)


class MovieCatalogService:
    """Application service for reading canonical movie catalog data."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = MovieRepository(session)

    @staticmethod
    def _extract_taxonomy(
        movie: Movie,
    ) -> tuple[list[str], list[str], list[str], list[str]]:
        """Extracts canonical taxonomy axis labels from a Movie ORM instance."""
        genres: list[str] = []
        themes: list[str] = []
        moods: list[str] = []
        styles: list[str] = []

        for tag in movie.taxonomy_tags or []:
            if not tag.node:
                continue
            axis = tag.node.axis
            label = tag.node.label
            if axis == "genre" and label not in genres:
                genres.append(label)
            elif axis == "theme" and label not in themes:
                themes.append(label)
            elif axis == "mood" and label not in moods:
                moods.append(label)
            elif axis == "style" and label not in styles:
                styles.append(label)

        return genres, themes, moods, styles

    def _extract_director(self, movie: Movie) -> Optional[str]:
        """Extracts primary director name from movie credits relationship if already loaded."""
        try:
            insp = inspect(movie)
            if "credits" in insp.unloaded:
                return None
        except Exception:
            pass

        if not movie.credits:
            return None
        for c in movie.credits:
            if c.credit_type == "crew":
                if (c.job and c.job.strip().lower() == "director") or (
                    c.department and c.department.strip().lower() == "directing"
                ):
                    return c.name
        return None

    def _to_list_item(self, movie: Movie) -> MovieListItem:
        """Transforms a Movie ORM model into a lightweight MovieListItem schema."""
        genres, themes, moods, styles = self._extract_taxonomy(movie)

        poster_path = movie.artwork.poster_path if movie.artwork else None
        backdrop_path = movie.artwork.backdrop_path if movie.artwork else None
        poster_url = movie.artwork.poster_url if movie.artwork else None
        backdrop_url = movie.artwork.backdrop_url if movie.artwork else None

        return MovieListItem(
            id=movie.id,
            title=movie.title,
            original_title=movie.original_title,
            release_date=movie.release_date,
            release_year=movie.release_year,
            runtime_minutes=movie.runtime_minutes,
            original_language=movie.original_language,
            synopsis=movie.synopsis,
            genres=genres,
            themes=themes,
            moods=moods,
            styles=styles,
            director=self._extract_director(movie),
            poster_path=poster_path,
            backdrop_path=backdrop_path,
            poster_url=poster_url,
            backdrop_url=backdrop_url,
            popularity=movie.popularity,
            vote_average=movie.vote_average,
            vote_count=movie.vote_count,
        )

    def _to_detail(self, movie: Movie) -> MovieDetail:
        """Transforms a Movie ORM model into a complete MovieDetail public schema."""
        genres, themes, moods, styles = self._extract_taxonomy(movie)

        # Artwork
        artwork = MovieArtworkPublic(
            poster_path=movie.artwork.poster_path if movie.artwork else None,
            backdrop_path=movie.artwork.backdrop_path if movie.artwork else None,
            poster_url=movie.artwork.poster_url if movie.artwork else None,
            backdrop_url=movie.artwork.backdrop_url if movie.artwork else None,
        )

        # Collection
        collection: MovieCollectionPublic | None = None
        if movie.collection:
            collection = MovieCollectionPublic(
                collection_id=movie.collection.external_id or str(movie.collection.id),
                name=movie.collection.name,
                poster_path=movie.collection.poster_path,
            )

        # Credits
        cast_members: list[CastMemberPublic] = []
        crew_members: list[CrewMemberPublic] = []
        directors: list[CrewMemberPublic] = []

        for c in movie.credits or []:
            if c.credit_type == "cast":
                cast_members.append(
                    CastMemberPublic(
                        name=c.name,
                        character=c.role_or_character,
                        billing_order=c.billing_order,
                    )
                )
            elif c.credit_type == "crew":
                member = CrewMemberPublic(
                    name=c.name,
                    department=c.department or "Directing",
                    job=c.job or "Director",
                )
                crew_members.append(member)
                if (c.job and c.job.strip().lower() == "director") or (
                    c.department and c.department.strip().lower() == "directing"
                ):
                    directors.append(member)

        cast_members.sort(key=lambda x: (x.billing_order is None, x.billing_order))
        director_name = directors[0].name if directors else None

        credits = MovieCreditsPublic(
            director=director_name,
            directors=directors,
            cast=cast_members,
            crew=crew_members,
        )

        # Provenance (public metadata only)
        provenance: MovieProvenancePublic | None = None
        if movie.provenance:
            provenance = MovieProvenancePublic(
                source=movie.provenance.source,
                endpoint_or_product=movie.provenance.endpoint_or_product,
                retrieved_at=movie.provenance.retrieved_at,
                license_profile=movie.provenance.license_profile,
            )

        return MovieDetail(
            id=movie.id,
            title=movie.title,
            original_title=movie.original_title,
            release_date=movie.release_date,
            release_year=movie.release_year,
            runtime_minutes=movie.runtime_minutes,
            synopsis=movie.synopsis,
            original_language=movie.original_language,
            spoken_languages=list(movie.spoken_languages or []),
            genres=genres,
            themes=themes,
            moods=moods,
            styles=styles,
            artwork=artwork,
            collection=collection,
            credits=credits,
            provenance=provenance,
            tags=list(movie.tags or []),
            popularity=movie.popularity,
            vote_average=movie.vote_average,
            vote_count=movie.vote_count,
        )

    async def get_movie_detail(self, movie_id_raw: str) -> MovieDetail:
        """Retrieves complete details for a movie by UUID string."""
        try:
            movie_uuid = UUID(movie_id_raw.strip())
        except (ValueError, AttributeError):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Movie not found with identifier '{movie_id_raw}'",
            )

        movie = await self.repository.get_by_id(movie_uuid)
        if not movie:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Movie not found with identifier '{movie_id_raw}'",
            )

        return self._to_detail(movie)

    async def list_movies(
        self,
        page: int,
        limit: int,
        filters: MovieFilterParams,
    ) -> PaginatedResponse[MovieListItem]:
        """Lists movies with filtering and pagination metadata."""
        if limit < 1 or limit > 100:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Page size limit must be between 1 and 100.",
            )
        if page < 1:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Page number must be at least 1.",
            )

        movies, total = await self.repository.list_movies(
            page=page, limit=limit, filters=filters
        )
        total_pages = math.ceil(total / limit) if total > 0 else 0
        has_next = page < total_pages
        has_prev = page > 1 and total > 0

        items = [self._to_list_item(m) for m in movies]

        return PaginatedResponse[MovieListItem](
            items=items,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
            has_next=has_next,
            has_prev=has_prev,
        )

    async def search_movies(
        self,
        page: int,
        limit: int,
        params: MovieSearchParams,
    ) -> PaginatedResponse[MovieListItem]:
        """Searches movies by title with ranking, taxonomy filters, and pagination metadata."""
        if limit < 1 or limit > 100:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Page size limit must be between 1 and 100.",
            )
        if page < 1:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Page number must be at least 1.",
            )

        movies, total = await self.repository.search_movies(
            page=page, limit=limit, params=params
        )
        total_pages = math.ceil(total / limit) if total > 0 else 0
        has_next = page < total_pages
        has_prev = page > 1 and total > 0

        items = [self._to_list_item(m) for m in movies]

        return PaginatedResponse[MovieListItem](
            items=items,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
            has_next=has_next,
            has_prev=has_prev,
        )

"""SQLAlchemy repository for canonical Movie persistence operations.

Implements read-only queries, taxonomy filtering, deterministic pagination,
and title search without leaking internal details or incurring N+1 queries.
"""

from dataclasses import dataclass
from typing import Any, Optional, Sequence
from uuid import UUID

from sqlalchemy import Select, case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.movie.taxonomy import generate_taxonomy_key
from app.models.movie import (
    Movie,
    MovieTag,
    TaxonomyNode,
)


@dataclass(frozen=True)
class MovieFilterParams:
    """Parameters for catalog listing and multi-axis filtering."""

    genre: Optional[str] = None
    theme: Optional[str] = None
    mood: Optional[str] = None
    style: Optional[str] = None
    release_year: Optional[int] = None
    year_min: Optional[int] = None
    year_max: Optional[int] = None
    original_language: Optional[str] = None
    sort_by: Optional[str] = None


@dataclass(frozen=True)
class MovieSearchParams:
    """Parameters for title search with optional taxonomy refinement."""

    q: str
    genre: Optional[str] = None
    theme: Optional[str] = None
    mood: Optional[str] = None
    style: Optional[str] = None
    release_year: Optional[int] = None
    original_language: Optional[str] = None


class MovieRepository:
    """Read-only repository for Movie entities."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, movie_id: UUID) -> Optional[Movie]:
        """Loads a single movie by its canonical UUID with all detailed relationships."""
        stmt = (
            select(Movie)
            .where(Movie.id == movie_id)
            .options(
                selectinload(Movie.artwork),
                selectinload(Movie.collection),
                selectinload(Movie.credits),
                selectinload(Movie.provenance),
                selectinload(Movie.taxonomy_tags).selectinload(MovieTag.node),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    def _apply_taxonomy_filter(
        self,
        stmt: Select[tuple[Movie]],
        axis: str,
        value: str,
    ) -> Select[tuple[Movie]]:
        """Filters movies asserting a specific canonical taxonomy node."""
        clean_val = value.strip().lower()
        derived_key = generate_taxonomy_key(axis, clean_val)

        subquery = (
            select(MovieTag.movie_id)
            .join(TaxonomyNode, MovieTag.node_id == TaxonomyNode.id)
            .where(
                TaxonomyNode.axis == axis,
                or_(
                    func.lower(TaxonomyNode.label) == clean_val,
                    func.lower(TaxonomyNode.key) == clean_val,
                    func.lower(TaxonomyNode.key) == derived_key,
                ),
            )
        )
        return stmt.where(Movie.id.in_(subquery))

    async def list_movies(
        self,
        page: int,
        limit: int,
        filters: MovieFilterParams,
    ) -> tuple[Sequence[Movie], int]:
        """Lists movies with pagination, multi-axis taxonomy filtering, and deterministic ordering."""
        base_query = select(Movie)

        # 1. Taxonomy Filtering
        if filters.genre:
            base_query = self._apply_taxonomy_filter(base_query, "genre", filters.genre)
        if filters.theme:
            base_query = self._apply_taxonomy_filter(base_query, "theme", filters.theme)
        if filters.mood:
            base_query = self._apply_taxonomy_filter(base_query, "mood", filters.mood)
        if filters.style:
            base_query = self._apply_taxonomy_filter(base_query, "style", filters.style)

        # 2. Year Filtering
        if filters.release_year is not None:
            base_query = base_query.where(Movie.release_year == filters.release_year)
        if filters.year_min is not None:
            base_query = base_query.where(Movie.release_year >= filters.year_min)
        if filters.year_max is not None:
            base_query = base_query.where(Movie.release_year <= filters.year_max)

        # 3. Original Language Filtering
        if filters.original_language:
            base_query = base_query.where(
                func.lower(Movie.original_language)
                == filters.original_language.strip().lower()
            )

        # 4. Count Total Matching Records
        count_stmt = select(func.count()).select_from(base_query.subquery())
        total_res = await self.session.execute(count_stmt)
        total = total_res.scalar() or 0

        if total == 0:
            return [], 0

        # 5. Deterministic Ordering
        sort_by = (filters.sort_by or "").strip().lower()
        order_clause: list[Any]
        if sort_by == "release_date_asc":
            order_clause = [
                Movie.release_date.asc().nulls_last(),
                Movie.release_year.asc().nulls_last(),
                Movie.title.asc(),
                Movie.id.asc(),
            ]
        elif sort_by == "title_asc":
            order_clause = [
                Movie.title.asc(),
                Movie.release_date.desc().nulls_last(),
                Movie.id.asc(),
            ]
        elif sort_by == "title_desc":
            order_clause = [
                Movie.title.desc(),
                Movie.release_date.desc().nulls_last(),
                Movie.id.asc(),
            ]
        else:
            # Default deterministic order: latest release first, then title, then UUID
            order_clause = [
                Movie.release_date.desc().nulls_last(),
                Movie.release_year.desc().nulls_last(),
                Movie.title.asc(),
                Movie.id.asc(),
            ]

        # 6. Pagination & Relationship Loading (lightweight: artwork + taxonomy tags only)
        offset = (page - 1) * limit
        paged_stmt = (
            base_query.order_by(*order_clause)
            .offset(offset)
            .limit(limit)
            .options(
                selectinload(Movie.artwork),
                selectinload(Movie.credits),
                selectinload(Movie.taxonomy_tags).selectinload(MovieTag.node),
            )
        )
        result = await self.session.execute(paged_stmt)
        movies = result.scalars().all()

        return movies, total

    async def search_movies(
        self,
        page: int,
        limit: int,
        params: MovieSearchParams,
    ) -> tuple[Sequence[Movie], int]:
        """Searches movies by title with ranking, optional taxonomy filtering, and deterministic ordering."""
        search_term = params.q.strip()
        if not search_term:
            return [], 0

        # Title pattern matching on canonical title and original title
        escaped_term = search_term.replace("%", "\\%").replace("_", "\\_")
        title_condition = or_(
            Movie.title.ilike(f"%{escaped_term}%"),
            Movie.original_title.ilike(f"%{escaped_term}%"),
        )

        base_query = select(Movie).where(title_condition)

        # Optional Taxonomy Filtering
        if params.genre:
            base_query = self._apply_taxonomy_filter(base_query, "genre", params.genre)
        if params.theme:
            base_query = self._apply_taxonomy_filter(base_query, "theme", params.theme)
        if params.mood:
            base_query = self._apply_taxonomy_filter(base_query, "mood", params.mood)
        if params.style:
            base_query = self._apply_taxonomy_filter(base_query, "style", params.style)

        # Optional Year & Language Filtering
        if params.release_year is not None:
            base_query = base_query.where(Movie.release_year == params.release_year)
        if params.original_language:
            base_query = base_query.where(
                func.lower(Movie.original_language)
                == params.original_language.strip().lower()
            )

        # Count Total Matches
        count_stmt = select(func.count()).select_from(base_query.subquery())
        total_res = await self.session.execute(count_stmt)
        total = total_res.scalar() or 0

        if total == 0:
            return [], 0

        # Ranked Deterministic Ordering:
        # 1. Exact match on title has highest priority
        # 2. Prefix match on title has second priority
        # 3. Release date descending
        # 4. Title alphabetical
        # 5. UUID as tie-breaker
        exact_rank = case(
            (func.lower(Movie.title) == search_term.lower(), 1),
            else_=0,
        )
        prefix_rank = case(
            (Movie.title.ilike(f"{escaped_term}%"), 1),
            else_=0,
        )

        order_clause: list[Any] = [
            exact_rank.desc(),
            prefix_rank.desc(),
            Movie.release_date.desc().nulls_last(),
            Movie.release_year.desc().nulls_last(),
            Movie.title.asc(),
            Movie.id.asc(),
        ]

        offset = (page - 1) * limit
        paged_stmt = (
            base_query.order_by(*order_clause)
            .offset(offset)
            .limit(limit)
            .options(
                selectinload(Movie.artwork),
                selectinload(Movie.credits),
                selectinload(Movie.taxonomy_tags).selectinload(MovieTag.node),
            )
        )
        result = await self.session.execute(paged_stmt)
        movies = result.scalars().all()

        return movies, total

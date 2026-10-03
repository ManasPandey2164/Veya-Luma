"""FastAPI endpoints for Veya Luma canonical movie catalog read operations.

Provides read-only access to browse, filter, paginate, search, and inspect movies.
Decoupled from persistence internals through the repository and service layers.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.repositories.movie import MovieFilterParams, MovieSearchParams
from app.schemas.catalog import MovieDetail, MovieListItem, PaginatedResponse
from app.services.movie_catalog import MovieCatalogService

router = APIRouter(prefix="/movies", tags=["Movies"])


@router.get(
    "",
    response_model=PaginatedResponse[MovieListItem],
    status_code=status.HTTP_200_OK,
    summary="List and filter movies",
    description=(
        "Returns a paginated list of lightweight canonical movie entities. "
        "Supports multi-axis taxonomy filtering (genre, theme, mood, style), "
        "release year, and original language with deterministic ordering."
    ),
)
async def list_movies(
    page: int = Query(1, ge=1, description="1-indexed page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    genre: Optional[str] = Query(None, description="Canonical genre filter"),
    theme: Optional[str] = Query(None, description="Canonical theme filter"),
    mood: Optional[str] = Query(None, description="Canonical mood filter"),
    style: Optional[str] = Query(None, description="Canonical style filter"),
    release_year: Optional[int] = Query(
        None, ge=1880, le=2100, description="Exact release calendar year"
    ),
    year_min: Optional[int] = Query(
        None, ge=1880, le=2100, description="Minimum release year"
    ),
    year_max: Optional[int] = Query(
        None, ge=1880, le=2100, description="Maximum release year"
    ),
    original_language: Optional[str] = Query(
        None, min_length=2, max_length=10, description="Original language ISO code"
    ),
    sort_by: Optional[str] = Query(
        None, description="Sort ordering: release_date_asc, title_asc, title_desc"
    ),
    session: AsyncSession = Depends(get_async_session),
) -> PaginatedResponse[MovieListItem]:
    service = MovieCatalogService(session)
    filters = MovieFilterParams(
        genre=genre,
        theme=theme,
        mood=mood,
        style=style,
        release_year=release_year,
        year_min=year_min,
        year_max=year_max,
        original_language=original_language,
        sort_by=sort_by,
    )
    return await service.list_movies(page=page, limit=limit, filters=filters)


@router.get(
    "/search",
    response_model=PaginatedResponse[MovieListItem],
    status_code=status.HTTP_200_OK,
    summary="Search movies by title",
    description=(
        "Performs title-oriented movie search using PostgreSQL pattern matching. "
        "Ranks exact and prefix title matches first, with optional taxonomy refinement."
    ),
)
async def search_movies(
    q: str = Query("", description="Title search term"),
    page: int = Query(1, ge=1, description="1-indexed page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    genre: Optional[str] = Query(None, description="Optional canonical genre filter"),
    theme: Optional[str] = Query(None, description="Optional canonical theme filter"),
    mood: Optional[str] = Query(None, description="Optional canonical mood filter"),
    style: Optional[str] = Query(None, description="Optional canonical style filter"),
    release_year: Optional[int] = Query(
        None, ge=1880, le=2100, description="Optional release year filter"
    ),
    original_language: Optional[str] = Query(
        None, min_length=2, max_length=10, description="Optional language ISO code"
    ),
    session: AsyncSession = Depends(get_async_session),
) -> PaginatedResponse[MovieListItem]:
    service = MovieCatalogService(session)
    params = MovieSearchParams(
        q=q,
        genre=genre,
        theme=theme,
        mood=mood,
        style=style,
        release_year=release_year,
        original_language=original_language,
    )
    return await service.search_movies(page=page, limit=limit, params=params)


@router.get(
    "/{id}",
    response_model=MovieDetail,
    status_code=status.HTTP_200_OK,
    summary="Get movie details",
    description=(
        "Returns the complete canonical representation of a movie by internal UUID, "
        "including artwork, franchise collection, credits, and taxonomy classifications."
    ),
)
async def get_movie(
    id: str = Path(..., description="Canonical movie UUID"),
    session: AsyncSession = Depends(get_async_session),
) -> MovieDetail:
    service = MovieCatalogService(session)
    return await service.get_movie_detail(id)

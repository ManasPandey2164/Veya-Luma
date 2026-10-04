"""Comprehensive integration test suite for Veya Luma Phase 2 Step 15:
FastAPI Catalog Read Endpoints & Pagination.

Tests:
1. Movie list endpoint (GET /api/v1/movies) with lightweight representation
2. Pagination metadata (page, limit, total, total_pages, has_next, has_prev)
3. Maximum page size enforcement (limit > 100 -> 422 HTTP error)
4. Deterministic ordering behavior
5. Movie detail endpoint (GET /api/v1/movies/{id}) with complete public representation
6. Missing movie -> 404 HTTP error
7. Invalid UUID handling -> 404 HTTP error
8. Title search (GET /api/v1/movies/search)
9. Genre filtering against taxonomy_node/movie_tag
10. Theme filtering against taxonomy_node/movie_tag
11. Mood filtering against taxonomy_node/movie_tag
12. Style filtering against taxonomy_node/movie_tag
13. Combined multi-axis filtering (genre + theme + release_year)
14. Original language filtering
15. Empty result sets
16. Response schema validation
"""

import uuid
from datetime import date, datetime, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.movie.identity import generate_canonical_movie_id
from app.domain.movie.mapper import canonical_movie_to_orm
from app.models.movie import Movie, TaxonomyNode
from app.schemas.catalog import MovieDetail, MovieListItem
from app.schemas.movie import (
    ArtworkReference,
    CanonicalMovie,
    CastMember,
    CollectionReference,
    CrewMember,
    MovieCredits,
    ProvenanceRecord,
)


async def _seed_test_catalog(db_session: AsyncSession) -> dict[str, CanonicalMovie]:
    """Helper that seeds a diverse canonical movie dataset into PostgreSQL for endpoint testing."""
    # 1. Fetch pre-seeded taxonomy nodes
    res = await db_session.execute(select(TaxonomyNode))
    nodes = res.scalars().all()
    lookup = {(n.axis, n.label): n for n in nodes}

    # 2. Build 4 distinct canonical movies
    movie_a = CanonicalMovie(
        id=generate_canonical_movie_id("test", "movie-arrival-1"),
        title="Arrival Test Edition",
        original_title="Arrival",
        original_language="en",
        spoken_languages=["en"],
        release_date=date(2016, 11, 11),
        release_year=2016,
        runtime_minutes=116,
        synopsis="A linguist works to communicate with alien visitors.",
        genres=["Sci-Fi", "Drama"],
        themes=["Communication & Connection", "Memory & Determinism"],
        moods=["Atmospheric", "Contemplative"],
        styles=["Measured"],
        artwork=ArtworkReference(
            poster_path="/arrival_poster.jpg",
            backdrop_path="/arrival_backdrop.jpg",
            poster_url="https://images.example.com/arrival.jpg",
            backdrop_url="https://images.example.com/arrival_bg.jpg",
        ),
        collection=CollectionReference(
            collection_id="col-villeneuve-sci-fi",
            name="Villeneuve Speculative Anthology",
        ),
        credits=MovieCredits(
            director="Denis Villeneuve",
            directors=[
                CrewMember(
                    name="Denis Villeneuve",
                    department="Directing",
                    job="Director",
                )
            ],
            cast=[
                CastMember(
                    name="Amy Adams",
                    character="Louise Banks",
                    billing_order=0,
                ),
                CastMember(
                    name="Jeremy Renner",
                    character="Ian Donnelly",
                    billing_order=1,
                ),
            ],
        ),
        provenance=ProvenanceRecord(
            source="test_fixture",
            source_id="arrival-001",
            endpoint_or_product="movie-details",
            retrieved_at=datetime.now(timezone.utc),
            license_profile="test-permissive",
        ),
        tags=["linguistics", "first-contact"],
    )

    movie_b = CanonicalMovie(
        id=generate_canonical_movie_id("test", "movie-solaris-2"),
        title="Solaris Meditative Cut",
        original_title="Солярис",
        original_language="ru",
        spoken_languages=["ru"],
        release_date=date(1972, 3, 20),
        release_year=1972,
        runtime_minutes=167,
        synopsis="A psychologist is sent to a space station orbiting an enigmatic ocean.",
        genres=["Sci-Fi", "Mystery"],
        themes=["Grief & Transcendence", "Existentialism & Isolation"],
        moods=["Meditative", "Philosophical"],
        styles=["Slow burn"],
        artwork=ArtworkReference(
            poster_path="/solaris_poster.jpg",
            backdrop_path="/solaris_backdrop.jpg",
        ),
        credits=MovieCredits(
            director="Andrei Tarkovsky",
            directors=[
                CrewMember(
                    name="Andrei Tarkovsky",
                    department="Directing",
                    job="Director",
                )
            ],
            cast=[
                CastMember(
                    name="Donatas Banionis",
                    character="Kris Kelvin",
                    billing_order=0,
                )
            ],
        ),
        tags=["space-station", "philosophical"],
    )

    movie_c = CanonicalMovie(
        id=generate_canonical_movie_id("test", "movie-parasite-3"),
        title="Parasite Dark Satire",
        original_title="기생충",
        original_language="ko",
        spoken_languages=["ko"],
        release_date=date(2019, 5, 30),
        release_year=2019,
        runtime_minutes=132,
        synopsis="Greed and class discrimination threaten the symbiotic relationship between two families.",
        genres=["Thriller", "Drama", "Comedy"],
        themes=["Class Conflict & Power", "Human Nature & Desires"],
        moods=["Dark", "Satirical"],
        styles=["Dialogue heavy"],
        artwork=ArtworkReference(
            poster_path="/parasite_poster.jpg",
            backdrop_path="/parasite_backdrop.jpg",
        ),
        credits=MovieCredits(
            director="Bong Joon-ho",
            directors=[
                CrewMember(
                    name="Bong Joon-ho",
                    department="Directing",
                    job="Director",
                )
            ],
            cast=[
                CastMember(
                    name="Song Kang-ho",
                    character="Kim Ki-taek",
                    billing_order=0,
                )
            ],
        ),
        tags=["class-struggle", "social-commentary"],
    )

    movie_d = CanonicalMovie(
        id=generate_canonical_movie_id("test", "movie-drive-4"),
        title="Drive Neon Odyssey",
        original_title="Drive",
        original_language="en",
        spoken_languages=["en"],
        release_date=date(2011, 9, 16),
        release_year=2011,
        runtime_minutes=100,
        synopsis="A mysterious Hollywood stuntman and mechanic moonlights as a getaway driver.",
        genres=["Thriller", "Crime", "Action"],
        themes=["Morality & Retribution"],
        moods=["Nocturnal", "Visceral"],
        styles=["Stylized"],
        artwork=ArtworkReference(
            poster_path="/drive_poster.jpg",
            backdrop_path="/drive_backdrop.jpg",
        ),
        credits=MovieCredits(
            director="Nicolas Winding Refn",
            directors=[
                CrewMember(
                    name="Nicolas Winding Refn",
                    department="Directing",
                    job="Director",
                )
            ],
            cast=[
                CastMember(
                    name="Ryan Gosling",
                    character="Driver",
                    billing_order=0,
                )
            ],
        ),
        tags=["synthwave", "getaway-driver"],
    )

    # Persist or update movies
    for movie in [movie_a, movie_b, movie_c, movie_d]:
        existing = await db_session.get(Movie, movie.id)
        if not existing:
            orm_obj = canonical_movie_to_orm(movie, taxonomy_node_lookup=lookup)
            db_session.add(orm_obj)
    await db_session.commit()

    return {
        "arrival": movie_a,
        "solaris": movie_b,
        "parasite": movie_c,
        "drive": movie_d,
    }


# ==============================================================================
# SECTION A: MOVIE LIST & PAGINATION TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_get_movies_list_endpoint(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Tests GET /api/v1/movies basic list retrieval and schema structure."""
    await _seed_test_catalog(db_session)

    response = await async_client.get("/api/v1/movies")
    assert response.status_code == 200

    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "limit" in data
    assert "total_pages" in data
    assert "has_next" in data
    assert "has_prev" in data

    assert data["page"] == 1
    assert data["limit"] == 20
    assert data["total"] >= 4
    assert len(data["items"]) >= 4

    # Validate first item conforms to MovieListItem schema
    item = data["items"][0]
    parsed_item = MovieListItem.model_validate(item)
    assert parsed_item.id is not None
    assert parsed_item.title is not None
    assert isinstance(parsed_item.genres, list)
    # Expose canonical director
    directors = [it.get("director") for it in data["items"] if it.get("director")]
    assert len(directors) == len(data["items"])


@pytest.mark.asyncio
async def test_pagination_controls_and_metadata(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Tests configurable page size and page offset navigation."""
    await _seed_test_catalog(db_session)

    # Request page 1 with limit 2
    res_p1 = await async_client.get("/api/v1/movies?page=1&limit=2")
    assert res_p1.status_code == 200
    data_p1 = res_p1.json()
    assert len(data_p1["items"]) == 2
    assert data_p1["page"] == 1
    assert data_p1["limit"] == 2
    assert data_p1["has_next"] is True
    assert data_p1["has_prev"] is False

    # Request page 2 with limit 2
    res_p2 = await async_client.get("/api/v1/movies?page=2&limit=2")
    assert res_p2.status_code == 200
    data_p2 = res_p2.json()
    assert len(data_p2["items"]) >= 1
    assert data_p2["page"] == 2
    assert data_p2["has_prev"] is True

    # Items on page 1 and page 2 must be disjoint
    p1_ids = {m["id"] for m in data_p1["items"]}
    p2_ids = {m["id"] for m in data_p2["items"]}
    assert p1_ids.isdisjoint(p2_ids)


@pytest.mark.asyncio
async def test_maximum_page_size_enforcement(
    async_client: AsyncClient,
) -> None:
    """Enforces maximum allowable limit (100) and positive bounds."""
    # Limit exceeding 100 must return 422 Unprocessable Entity
    res_oversize = await async_client.get("/api/v1/movies?limit=101")
    assert res_oversize.status_code == 422

    # Zero or negative limit must return 422
    res_zero = await async_client.get("/api/v1/movies?limit=0")
    assert res_zero.status_code == 422

    # Negative page must return 422
    res_neg_page = await async_client.get("/api/v1/movies?page=0")
    assert res_neg_page.status_code == 422


@pytest.mark.asyncio
async def test_deterministic_ordering(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies deterministic ordering across multiple consecutive calls."""
    await _seed_test_catalog(db_session)

    res1 = await async_client.get("/api/v1/movies?limit=10")
    res2 = await async_client.get("/api/v1/movies?limit=10")

    assert res1.status_code == 200
    assert res2.status_code == 200

    ids1 = [item["id"] for item in res1.json()["items"]]
    ids2 = [item["id"] for item in res2.json()["items"]]
    assert ids1 == ids2, "Catalog listing must produce deterministic stable ordering"


# ==============================================================================
# SECTION B: TAXONOMY & ATTRIBUTE FILTERING TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_genre_filtering(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies filtering by canonical genre operates against taxonomy_node/movie_tag."""
    await _seed_test_catalog(db_session)

    response = await async_client.get("/api/v1/movies?genre=Sci-Fi")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2
    for item in data["items"]:
        assert "Sci-Fi" in item["genres"]


@pytest.mark.asyncio
async def test_theme_filtering(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies filtering by canonical theme."""
    await _seed_test_catalog(db_session)

    response = await async_client.get("/api/v1/movies?theme=Class+Conflict+%26+Power")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    titles = [m["title"] for m in data["items"]]
    assert any("Parasite" in t for t in titles)


@pytest.mark.asyncio
async def test_mood_filtering(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies filtering by canonical mood."""
    await _seed_test_catalog(db_session)

    response = await async_client.get("/api/v1/movies?mood=Meditative")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    titles = [m["title"] for m in data["items"]]
    assert any("Solaris" in t for t in titles)


@pytest.mark.asyncio
async def test_style_filtering(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies filtering by canonical cinematic style."""
    await _seed_test_catalog(db_session)

    response = await async_client.get("/api/v1/movies?style=Stylized")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    titles = [m["title"] for m in data["items"]]
    assert any("Drive" in t for t in titles)


@pytest.mark.asyncio
async def test_combined_multi_axis_filtering(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies combined faceted filtering (genre + theme + release_year)."""
    await _seed_test_catalog(db_session)

    response = await async_client.get(
        "/api/v1/movies?genre=Sci-Fi&theme=Communication+%26+Connection&release_year=2016"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    titles = [m["title"] for m in data["items"]]
    assert any("Arrival" in t for t in titles)
    arrival_item = next(m for m in data["items"] if "Arrival" in m["title"])
    assert arrival_item["director"] == "Denis Villeneuve"


@pytest.mark.asyncio
async def test_original_language_filtering(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies filtering by original language ISO code."""
    await _seed_test_catalog(db_session)

    response = await async_client.get("/api/v1/movies?original_language=ru")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    for m in data["items"]:
        assert m["original_language"] == "ru"


@pytest.mark.asyncio
async def test_empty_result_sets(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies behavior when no records match filter criteria."""
    await _seed_test_catalog(db_session)

    response = await async_client.get("/api/v1/movies?release_year=1890")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert len(data["items"]) == 0
    assert data["total_pages"] == 0
    assert data["has_next"] is False
    assert data["has_prev"] is False


# ==============================================================================
# SECTION C: MOVIE DETAIL ENDPOINT TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_movie_detail_endpoint(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Tests GET /api/v1/movies/{id} returning complete public entity."""
    seeds = await _seed_test_catalog(db_session)
    arrival = seeds["arrival"]

    response = await async_client.get(f"/api/v1/movies/{arrival.id}")
    assert response.status_code == 200

    data = response.json()
    parsed = MovieDetail.model_validate(data)
    assert parsed.id == arrival.id
    assert parsed.title == "Arrival Test Edition"
    assert parsed.original_title == "Arrival"
    assert parsed.runtime_minutes == 116
    assert parsed.release_year == 2016
    assert "Sci-Fi" in parsed.genres
    assert "Drama" in parsed.genres
    assert "Communication & Connection" in parsed.themes

    # Validate artwork
    assert parsed.artwork.poster_path == "/arrival_poster.jpg"
    assert parsed.artwork.poster_url == "https://images.example.com/arrival.jpg"

    # Validate collection
    assert parsed.collection is not None
    assert parsed.collection.name == "Villeneuve Speculative Anthology"

    # Validate credits
    assert parsed.credits.director == "Denis Villeneuve"
    assert len(parsed.credits.cast) == 2
    assert parsed.credits.cast[0].name == "Amy Adams"
    assert parsed.credits.cast[0].character == "Louise Banks"

    # Validate provenance
    assert parsed.provenance is not None
    assert parsed.provenance.source == "test_fixture"
    assert parsed.provenance.license_profile == "test-permissive"


@pytest.mark.asyncio
async def test_movie_detail_missing_returns_404(
    async_client: AsyncClient,
) -> None:
    """Verifies that requesting a nonexistent movie UUID returns 404."""
    nonexistent_id = uuid.uuid4()
    response = await async_client.get(f"/api/v1/movies/{nonexistent_id}")
    assert response.status_code == 404
    data = response.json()
    assert "not found" in data["detail"].lower()


@pytest.mark.asyncio
async def test_movie_detail_invalid_uuid_returns_404(
    async_client: AsyncClient,
) -> None:
    """Verifies that requesting an invalid non-UUID string returns 404 rather than 500."""
    response = await async_client.get("/api/v1/movies/not-a-valid-uuid-12345")
    assert response.status_code == 404
    data = response.json()
    assert "not found" in data["detail"].lower()


# ==============================================================================
# SECTION D: MOVIE SEARCH ENDPOINT TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_movie_search_endpoint(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Tests GET /api/v1/movies/search title-oriented search and ranking."""
    await _seed_test_catalog(db_session)

    # Search by partial title
    response = await async_client.get("/api/v1/movies/search?q=Arrival")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert any("Arrival" in m["title"] for m in data["items"])


@pytest.mark.asyncio
async def test_movie_search_with_taxonomy_filter(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Tests search combined with taxonomy refinement."""
    await _seed_test_catalog(db_session)

    # Search "cut" with genre=Sci-Fi -> should match Solaris Meditative Cut
    response = await async_client.get("/api/v1/movies/search?q=Cut&genre=Sci-Fi")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert "Solaris" in data["items"][0]["title"]


@pytest.mark.asyncio
async def test_movie_search_empty_query(
    async_client: AsyncClient,
) -> None:
    """Tests that empty search query returns empty results cleanly."""
    response = await async_client.get("/api/v1/movies/search?q=")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert len(data["items"]) == 0

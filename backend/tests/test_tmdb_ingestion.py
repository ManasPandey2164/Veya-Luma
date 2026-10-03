"""Comprehensive test suite for Veya Luma Phase 2 Step 14:
Controlled TMDB Catalog Acquisition & Ingestion Service.

Covers:
1. TMDB Client authentication (Bearer token vs API Key)
2. TMDB Client error handling (401/403, 404, 5xx, network timeouts)
3. TMDB Client rate limiting and 429 retry handling with Retry-After
4. TMDB Collector bounded acquisition and pagination
5. TMDB response normalization into CanonicalMovie
6. Malformed and edge-case provider payload handling
7. Canonical UUIDv5 preservation and provider identity separation
8. PostgreSQL persistence of newly ingested movies
9. PostgreSQL update/merge on re-ingestion (duplicate prevention)
10. Shared franchise collection linking without duplicate collection records
11. Dry-run mode verification (zero persistence)
12. Ingestion report and statistics verification
"""

import asyncio
from datetime import date
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.movie.identity import generate_canonical_movie_id
from app.models.movie import (
    Movie,
    MovieCollection,
    MovieTag,
    SourceIdentity,
)
from app.providers.tmdb import TMDBProvider
from app.providers.tmdb_client import (
    AsyncRateLimiter,
    TMDBAPIError,
    TMDBAuthError,
    TMDBClient,
    TMDBNotFoundError,
    TMDBRateLimitError,
)
from app.services.ingestion.collector import TMDBCollector
from app.services.ingestion.schemas import IngestionConfig, IngestionStats
from app.services.ingestion.service import CatalogIngestionService

# ==============================================================================
# FIXTURES & MOCK DATA
# ==============================================================================


def make_sample_tmdb_payload(
    tmdb_id: int = 157336,
    title: str = "Interstellar",
    runtime: int = 169,
    collection_id: int | None = None,
    imdb_id: str | None = None,
    popularity: float | None = 138.5,
    vote_average: float | None = 8.4,
    vote_count: int | None = 34000,
) -> dict[str, Any]:
    """Generates a realistic raw TMDB /movie/{id} payload with credits and keywords."""
    collection_data = None
    if collection_id:
        collection_data = {
            "id": collection_id,
            "name": f"Franchise {collection_id}",
            "poster_path": f"/poster_{collection_id}.jpg",
        }

    resolved_imdb_id = imdb_id or f"tt{tmdb_id:07d}"

    return {
        "id": tmdb_id,
        "title": title,
        "original_title": title,
        "original_language": "en",
        "spoken_languages": [{"iso_639_1": "en", "name": "English"}],
        "release_date": "2014-11-05",
        "runtime": runtime,
        "overview": "A team of explorers travel through a wormhole in space.",
        "genres": [
            {"id": 12, "name": "Adventure"},
            {"id": 18, "name": "Drama"},
            {"id": 878, "name": "Science Fiction"},
        ],
        "poster_path": "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
        "backdrop_path": "/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
        "belongs_to_collection": collection_data,
        "imdb_id": resolved_imdb_id,
        "popularity": popularity,
        "vote_average": vote_average,
        "vote_count": vote_count,
        "credits": {
            "cast": [
                {
                    "id": 10297,
                    "name": "Matthew McConaughey",
                    "character": "Cooper",
                    "order": 0,
                },
                {"id": 1813, "name": "Anne Hathaway", "character": "Brand", "order": 1},
            ],
            "crew": [
                {
                    "id": 525,
                    "name": "Christopher Nolan",
                    "department": "Directing",
                    "job": "Director",
                },
            ],
        },
        "keywords": {
            "keywords": [
                {"id": 83, "name": "space exploration"},
                {"id": 156175, "name": "time travel"},
            ]
        },
    }


# ==============================================================================
# 1. TMDB CLIENT UNIT TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_tmdb_client_auth_bearer_token() -> None:
    """Verifies that TMDBClient includes Authorization Bearer header when token is configured."""
    mock_transport = httpx.MockTransport(
        lambda request: httpx.Response(
            200,
            json={"status": "ok"},
            request=request,
        )
    )
    async with httpx.AsyncClient(transport=mock_transport) as http_client:
        client = TMDBClient(
            read_access_token="test_bearer_token",
            base_url="https://api.themoviedb.org/3",
            http_client=http_client,
        )
        headers = client._get_headers()
        assert headers["Authorization"] == "Bearer test_bearer_token"

        res = await client.request("GET", "test")
        assert res == {"status": "ok"}


@pytest.mark.asyncio
async def test_tmdb_client_auth_api_key_query_param() -> None:
    """Verifies that TMDBClient falls back to api_key query param when bearer token is absent."""
    client = TMDBClient(
        api_key="test_api_key_123",
        read_access_token=None,
    )
    params = client._get_params({"page": 1})
    assert params["api_key"] == "test_api_key_123"
    assert params["page"] == 1


@pytest.mark.asyncio
async def test_tmdb_client_missing_credentials_raises_auth_error() -> None:
    """Verifies that TMDBClient raises TMDBAuthError if neither token nor key is provided."""
    client = TMDBClient(api_key=None, read_access_token=None)
    with pytest.raises(TMDBAuthError, match="TMDB credentials not configured"):
        await client.request("GET", "movie/123")


@pytest.mark.asyncio
async def test_tmdb_client_401_raises_auth_error() -> None:
    """Verifies that an upstream HTTP 401 response raises TMDBAuthError."""
    mock_transport = httpx.MockTransport(
        lambda request: httpx.Response(
            401, json={"status_message": "Invalid API key"}, request=request
        )
    )
    async with httpx.AsyncClient(transport=mock_transport) as http_client:
        client = TMDBClient(
            api_key="invalid_key",
            http_client=http_client,
            max_retries=1,
        )
        with pytest.raises(TMDBAuthError, match="authentication failed"):
            await client.request("GET", "movie/123")


@pytest.mark.asyncio
async def test_tmdb_client_404_raises_not_found_error() -> None:
    """Verifies that an upstream HTTP 404 response raises TMDBNotFoundError."""
    mock_transport = httpx.MockTransport(
        lambda request: httpx.Response(
            404, json={"status_message": "The resource was not found."}, request=request
        )
    )
    async with httpx.AsyncClient(transport=mock_transport) as http_client:
        client = TMDBClient(
            api_key="valid_key",
            http_client=http_client,
            max_retries=1,
        )
        with pytest.raises(TMDBNotFoundError, match="resource not found"):
            await client.request("GET", "movie/99999999")


@pytest.mark.asyncio
async def test_tmdb_client_429_retry_and_recovery() -> None:
    """Verifies that HTTP 429 rate-limiting triggers retry using Retry-After and succeeds."""
    call_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return httpx.Response(
                429,
                headers={"Retry-After": "0.01"},
                json={"status_message": "Too Many Requests"},
                request=request,
            )
        return httpx.Response(200, json={"success": True}, request=request)

    mock_transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=mock_transport) as http_client:
        client = TMDBClient(
            api_key="valid_key",
            http_client=http_client,
            max_retries=2,
            backoff_factor=0.01,
        )
        res = await client.request("GET", "movie/popular")
        assert res == {"success": True}
        assert call_count == 2


@pytest.mark.asyncio
async def test_tmdb_client_429_retries_exhausted() -> None:
    """Verifies that persisting 429 rate-limit responses raise TMDBRateLimitError once retries expire."""
    mock_transport = httpx.MockTransport(
        lambda request: httpx.Response(
            429, json={"status_message": "Rate limited"}, request=request
        )
    )
    async with httpx.AsyncClient(transport=mock_transport) as http_client:
        client = TMDBClient(
            api_key="valid_key",
            http_client=http_client,
            max_retries=1,
            backoff_factor=0.01,
        )
        with pytest.raises(TMDBRateLimitError, match="rate limit.*persisted"):
            await client.request("GET", "movie/popular")


@pytest.mark.asyncio
async def test_tmdb_client_500_retry_and_recovery() -> None:
    """Verifies that transient 500 server errors trigger retries and recover on 200."""
    call_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return httpx.Response(500, text="Internal Server Error", request=request)
        return httpx.Response(200, json={"recovered": True}, request=request)

    mock_transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=mock_transport) as http_client:
        client = TMDBClient(
            api_key="valid_key",
            http_client=http_client,
            max_retries=2,
            backoff_factor=0.01,
        )
        res = await client.request("GET", "movie/123")
        assert res == {"recovered": True}
        assert call_count == 2


@pytest.mark.asyncio
async def test_rate_limiter_spacing() -> None:
    """Verifies that AsyncRateLimiter enforces spacing between rapid calls."""
    limiter = AsyncRateLimiter(max_requests_per_second=50.0)  # 20ms min interval
    t0 = asyncio.get_event_loop().time()
    await limiter.acquire()
    await limiter.acquire()
    t1 = asyncio.get_event_loop().time()
    assert (
        (t1 - t0) >= 0.012
    )  # At least 12ms elapsed between 2 calls (accounting for Windows timer resolution)


# ==============================================================================
# 2. TMDB COLLECTOR UNIT TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_collector_bounded_by_max_movies() -> None:
    """Verifies that TMDBCollector halts exactly at max_movies limit."""
    mock_client = MagicMock(spec=TMDBClient)
    # Page contains 5 movies
    mock_client.discover_movies = AsyncMock(
        return_value={
            "page": 1,
            "total_pages": 5,
            "results": [{"id": i, "title": f"Movie {i}"} for i in range(1, 6)],
        }
    )
    mock_client.movie_details = AsyncMock(
        side_effect=lambda tmdb_id, **kwargs: make_sample_tmdb_payload(
            tmdb_id=tmdb_id, title=f"Movie {tmdb_id}"
        )
    )

    collector = TMDBCollector(client=mock_client)
    config = IngestionConfig(max_pages=2, max_movies=3)

    acquired = [p async for p in collector.acquire_catalog(config=config)]
    assert len(acquired) == 3
    assert [p["id"] for p in acquired] == [1, 2, 3]
    assert mock_client.movie_details.call_count == 3


@pytest.mark.asyncio
async def test_collector_bounded_by_max_pages() -> None:
    """Verifies that TMDBCollector halts when max_pages limit is reached."""
    mock_client = MagicMock(spec=TMDBClient)
    mock_client.discover_movies = AsyncMock(
        side_effect=lambda page, **kwargs: {
            "page": page,
            "total_pages": 10,
            "results": [{"id": page * 10 + i, "title": f"Movie {i}"} for i in range(2)],
        }
    )
    mock_client.movie_details = AsyncMock(
        side_effect=lambda tmdb_id, **kwargs: make_sample_tmdb_payload(tmdb_id=tmdb_id)
    )

    collector = TMDBCollector(client=mock_client)
    # Max pages = 2, max movies = 100
    config = IngestionConfig(max_pages=2, max_movies=100)

    acquired = [p async for p in collector.acquire_catalog(config=config)]
    assert len(acquired) == 4  # 2 pages * 2 movies = 4 movies
    assert mock_client.discover_movies.call_count == 2


@pytest.mark.asyncio
async def test_collector_handles_movie_detail_failure_gracefully() -> None:
    """Verifies that a failure to fetch details for one movie does not crash collector."""
    mock_client = MagicMock(spec=TMDBClient)
    mock_client.discover_movies = AsyncMock(
        return_value={
            "page": 1,
            "total_pages": 1,
            "results": [{"id": 101}, {"id": 102}, {"id": 103}],
        }
    )

    async def mock_details(tmdb_id: int, **kwargs: Any) -> dict[str, Any]:
        if tmdb_id == 102:
            raise TMDBAPIError("Simulated TMDB detail failure")
        return make_sample_tmdb_payload(tmdb_id=tmdb_id)

    mock_client.movie_details = AsyncMock(side_effect=mock_details)

    collector = TMDBCollector(client=mock_client)
    config = IngestionConfig(max_pages=1, max_movies=10)

    acquired = [p async for p in collector.acquire_catalog(config=config)]
    assert len(acquired) == 2
    assert [p["id"] for p in acquired] == [101, 103]


# ==============================================================================
# 3. NORMALIZATION & IDENTITY RESOLUTION UNIT TESTS
# ==============================================================================


def test_normalization_tmdb_payload_to_canonical_movie() -> None:
    """Verifies full fidelity normalization from raw TMDB payload to CanonicalMovie."""
    provider = TMDBProvider()
    payload = make_sample_tmdb_payload(
        tmdb_id=157336,
        title="Interstellar",
        collection_id=100,
        imdb_id="tt0816692",
    )
    canonical = provider.parse_payload(payload)

    expected_uuid = generate_canonical_movie_id("tmdb", "157336")
    assert canonical.id == expected_uuid
    assert canonical.title == "Interstellar"
    assert canonical.release_date == date(2014, 11, 5)
    assert canonical.release_year == 2014
    assert canonical.runtime_minutes == 169
    assert canonical.synopsis is not None and "wormhole" in canonical.synopsis
    assert set(canonical.genres) == {"Adventure", "Drama", "Sci-Fi"}
    assert "Time Travel" in canonical.themes or "Cosmic Mystery" in canonical.themes

    # Credits
    assert canonical.credits.director == "Christopher Nolan"
    assert len(canonical.credits.cast) == 2
    assert canonical.credits.cast[0].name == "Matthew McConaughey"
    assert canonical.credits.cast[0].billing_order == 0

    # Artwork
    assert canonical.artwork.poster_path == "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg"
    assert canonical.artwork.backdrop_path == "/xJHokMbljvjADYdit5fK5VQsXEG.jpg"

    # Collection
    assert canonical.collection is not None
    assert canonical.collection.collection_id == "100"
    assert canonical.collection.name == "Franchise 100"

    # Provider identities
    sources = {pi.source: pi.external_id for pi in canonical.provider_identities}
    assert sources["tmdb"] == "157336"
    assert sources["imdb"] == "tt0816692"

    # Provenance
    assert canonical.provenance is not None
    assert canonical.provenance.source == "tmdb"
    assert canonical.provenance.source_id == "157336"
    assert canonical.provenance.raw_sha256 is not None
    assert canonical.provenance.field_sources["title"] == "source_derived"


def test_normalization_malformed_missing_title_raises_error() -> None:
    """Verifies that an unparseable or title-less TMDB payload raises validation error."""
    provider = TMDBProvider()
    payload = {"id": 999, "title": "   ", "overview": "No title movie"}
    with pytest.raises(Exception):
        provider.parse_payload(payload)


def test_normalization_runtime_non_positive_treated_as_none() -> None:
    """Verifies that zero or negative TMDB runtime is normalized to None without violating invariants."""
    provider = TMDBProvider()
    payload = make_sample_tmdb_payload(runtime=0)
    canonical = provider.parse_payload(payload)
    assert canonical.runtime_minutes is None


# ==============================================================================
# 4. POSTGRESQL PERSISTENCE & INGESTION SERVICE INTEGRATION TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_pg_ingest_new_movie(db_session: AsyncSession) -> None:
    """Verifies that CatalogIngestionService persists a new canonical movie into PostgreSQL."""
    test_id = 999001
    payload = make_sample_tmdb_payload(
        tmdb_id=test_id, title="Test New Movie 999001", collection_id=888
    )
    service = CatalogIngestionService()

    try:
        canonical, action = await service.ingest_payload(
            payload=payload,
            session=db_session,
            commit=True,
        )
        assert action == "inserted"
        assert canonical.title == "Test New Movie 999001"

        # Query PostgreSQL directly
        stmt = (
            select(Movie)
            .where(Movie.id == canonical.id)
            .options(
                selectinload(Movie.artwork),
                selectinload(Movie.collection),
                selectinload(Movie.provenance),
                selectinload(Movie.credits),
                selectinload(Movie.taxonomy_tags).selectinload(MovieTag.node),
                selectinload(Movie.provider_identities),
            )
        )
        res = await db_session.execute(stmt)
        movie_db = res.scalar_one()

        assert movie_db.title == "Test New Movie 999001"
        assert movie_db.artwork is not None
        assert movie_db.artwork.poster_path == "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg"
        assert movie_db.provenance is not None
        assert movie_db.provenance.source == "tmdb"
        assert movie_db.provenance.source_id == str(test_id)
        assert len(movie_db.credits) == 3
        assert len(movie_db.provider_identities) == 2
        assert len(movie_db.taxonomy_tags) > 0

    finally:
        # Cleanup
        to_delete = await db_session.get(
            Movie, generate_canonical_movie_id("tmdb", str(test_id))
        )
        if to_delete:
            await db_session.delete(to_delete)
            await db_session.commit()


@pytest.mark.asyncio
async def test_pg_ingest_existing_movie_updates_without_duplicates(
    db_session: AsyncSession,
) -> None:
    """Verifies that re-ingesting an existing movie updates/merges fields and avoids duplicate records."""
    test_id = 999002
    service = CatalogIngestionService()

    payload_v1 = make_sample_tmdb_payload(
        tmdb_id=test_id,
        title="Original Movie Title",
        runtime=100,
    )
    payload_v2 = make_sample_tmdb_payload(
        tmdb_id=test_id,
        title="Updated Movie Title",
        runtime=105,
    )
    payload_v2["overview"] = "Updated synopsis overview for test movie."

    try:
        # First ingestion -> inserted
        canonical_v1, action_v1 = await service.ingest_payload(
            payload=payload_v1,
            session=db_session,
            commit=True,
        )
        assert action_v1 == "inserted"
        canonical_id = canonical_v1.id

        # Second ingestion -> updated
        canonical_v2, action_v2 = await service.ingest_payload(
            payload=payload_v2,
            session=db_session,
            commit=True,
        )
        assert action_v2 == "updated"
        assert canonical_v2.id == canonical_id  # UUID preserved

        # Verify only ONE movie record exists in database
        count_stmt = select(func.count(Movie.id)).where(Movie.id == canonical_id)
        count_res = await db_session.execute(count_stmt)
        assert count_res.scalar_one() == 1

        # Verify updated values
        movie_db = await db_session.get(Movie, canonical_id)
        assert movie_db is not None
        assert movie_db.title == "Updated Movie Title"
        assert movie_db.runtime_minutes == 105
        assert movie_db.synopsis == "Updated synopsis overview for test movie."

        # Verify only ONE TMDB source identity exists
        ident_stmt = select(func.count(SourceIdentity.id)).where(
            SourceIdentity.source == "tmdb",
            SourceIdentity.external_id == str(test_id),
        )
        ident_res = await db_session.execute(ident_stmt)
        assert ident_res.scalar_one() == 1

    finally:
        to_delete = await db_session.get(
            Movie, generate_canonical_movie_id("tmdb", str(test_id))
        )
        if to_delete:
            await db_session.delete(to_delete)
            await db_session.commit()


@pytest.mark.asyncio
async def test_pg_ingest_shared_collection_reuse(db_session: AsyncSession) -> None:
    """Verifies that multiple movies belonging to the same franchise reuse the existing MovieCollection."""
    shared_coll_id = 777123
    test_id_1 = 999003
    test_id_2 = 999004
    service = CatalogIngestionService()

    # Pre-test cleanup in case a prior run aborted
    for tid in (test_id_1, test_id_2):
        old_m = await db_session.get(
            Movie, generate_canonical_movie_id("tmdb", str(tid))
        )
        if old_m:
            await db_session.delete(old_m)
    old_c = (
        (
            await db_session.execute(
                select(MovieCollection).where(
                    MovieCollection.external_id == str(shared_coll_id)
                )
            )
        )
        .scalars()
        .first()
    )
    if old_c:
        await db_session.delete(old_c)
    await db_session.commit()

    payload_1 = make_sample_tmdb_payload(
        tmdb_id=test_id_1, title="Franchise Part I", collection_id=shared_coll_id
    )
    payload_2 = make_sample_tmdb_payload(
        tmdb_id=test_id_2, title="Franchise Part II", collection_id=shared_coll_id
    )

    try:
        can_1, act_1 = await service.ingest_payload(
            payload=payload_1, session=db_session, commit=True
        )
        can_2, act_2 = await service.ingest_payload(
            payload=payload_2, session=db_session, commit=True
        )

        assert act_1 == "inserted"
        assert act_2 == "inserted"

        m1 = await db_session.get(Movie, can_1.id)
        m2 = await db_session.get(Movie, can_2.id)
        assert m1 is not None and m2 is not None
        assert m1.collection_id is not None
        assert m2.collection_id is not None
        assert (
            m1.collection_id == m2.collection_id
        )  # Both point to the exact same Collection row

        # Verify only 1 collection row was created for this external collection ID
        coll_count_stmt = select(func.count(MovieCollection.id)).where(
            MovieCollection.external_id == str(shared_coll_id)
        )
        coll_count = (await db_session.execute(coll_count_stmt)).scalar_one()
        assert coll_count == 1

    finally:
        for tid in (test_id_1, test_id_2):
            m = await db_session.get(
                Movie, generate_canonical_movie_id("tmdb", str(tid))
            )
            if m:
                await db_session.delete(m)
        coll = (
            (
                await db_session.execute(
                    select(MovieCollection).where(
                        MovieCollection.external_id == str(shared_coll_id)
                    )
                )
            )
            .scalars()
            .first()
        )
        if coll:
            await db_session.delete(coll)
        await db_session.commit()


@pytest.mark.asyncio
async def test_pg_dry_run_does_not_persist(db_session: AsyncSession) -> None:
    """Verifies that dry-run mode validates data but makes zero writes to PostgreSQL."""
    test_id = 999005
    payload = make_sample_tmdb_payload(tmdb_id=test_id, title="Dry Run Movie")
    service = CatalogIngestionService()

    canonical, action = await service.ingest_payload(
        payload=payload,
        session=db_session,
        dry_run=True,
    )
    assert action == "dry_run"
    assert canonical.title == "Dry Run Movie"

    # Verify not in database
    queried = await db_session.get(Movie, canonical.id)
    assert queried is None


@pytest.mark.asyncio
async def test_ingest_bounded_catalog_stats(db_session: AsyncSession) -> None:
    """Verifies that ingest_bounded_catalog returns accurate IngestionStats report."""
    test_ids = [999006, 999007]
    payloads = [
        make_sample_tmdb_payload(tmdb_id=test_ids[0], title="Batch Movie 1"),
        make_sample_tmdb_payload(tmdb_id=test_ids[1], title="Batch Movie 2"),
    ]

    # Pre-test cleanup
    for tid in test_ids:
        old_m = await db_session.get(
            Movie, generate_canonical_movie_id("tmdb", str(tid))
        )
        if old_m:
            await db_session.delete(old_m)
    await db_session.commit()

    mock_collector = MagicMock(spec=TMDBCollector)

    async def mock_stream(*args: Any, **kwargs: Any) -> Any:
        for p in payloads:
            yield p

    mock_collector.acquire_catalog = mock_stream

    service = CatalogIngestionService(collector=mock_collector)
    config = IngestionConfig(max_pages=1, max_movies=2, dry_run=False)

    try:
        stats: IngestionStats = await service.ingest_bounded_catalog(
            session=db_session,
            config=config,
        )
        assert stats.discovered == 2
        assert stats.normalized == 2
        assert stats.inserted == 2
        assert stats.updated == 0
        assert stats.failed == 0
        assert stats.elapsed_seconds >= 0.0
        assert len(stats.processed_canonical_ids) == 2

    finally:
        for tid in test_ids:
            m = await db_session.get(
                Movie, generate_canonical_movie_id("tmdb", str(tid))
            )
            if m:
                await db_session.delete(m)
        await db_session.commit()


# ==============================================================================
# 13. STEP 17.5: POPULARITY, VOTE METRICS, KEYWORD PRESERVATION & STYLE ENRICHMENT
# ==============================================================================


def test_tmdb_normalization_preserves_popularity_and_vote_metrics() -> None:
    """Verifies popularity, vote_average, and vote_count survive normalization from raw TMDB payload."""
    payload = make_sample_tmdb_payload(
        tmdb_id=12345,
        title="Metric Odyssey",
        popularity=88.75,
        vote_average=8.45,
        vote_count=14200,
    )
    provider = TMDBProvider()
    canonical = provider.parse_payload(payload)

    assert canonical.popularity == 88.75
    assert canonical.vote_average == 8.45
    assert canonical.vote_count == 14200


def test_tmdb_normalization_preserves_raw_keywords_in_tags() -> None:
    """Verifies raw TMDB keyword names are preserved in CanonicalMovie.tags."""
    payload = make_sample_tmdb_payload(
        tmdb_id=12346,
        title="Keyword Frontier",
    )
    payload["keywords"] = {
        "keywords": [
            {"id": 83, "name": "space exploration"},
            {"id": 9840, "name": "wormhole"},
            {"id": 156175, "name": "time travel"},
            {"id": 9999, "name": "deep space telemetry"},
        ]
    }
    provider = TMDBProvider()
    canonical = provider.parse_payload(payload)

    assert "space exploration" in canonical.tags
    assert "wormhole" in canonical.tags
    assert "time travel" in canonical.tags
    assert "deep space telemetry" in canonical.tags


def test_tmdb_normalization_maps_styles_deterministically() -> None:
    """Verifies defensible TMDB keywords deterministically enrich canonical style taxonomy."""
    payload = make_sample_tmdb_payload(
        tmdb_id=12347,
        title="Stylized Cinema",
    )
    payload["keywords"] = {
        "keywords": [
            {"id": 1, "name": "slow burn"},
            {"id": 2, "name": "black and white"},
            {"id": 3, "name": "non-linear"},
        ]
    }
    provider = TMDBProvider()
    canonical = provider.parse_payload(payload)

    assert "Slow burn" in canonical.styles
    assert "Monochrome" in canonical.styles
    assert "Non-linear" in canonical.styles


@pytest.mark.asyncio
async def test_tmdb_persistence_and_nullable_metrics(
    db_session: AsyncSession,
) -> None:
    """Verifies popularity and vote metrics are persisted to PostgreSQL and handle nullable values."""
    tmdb_id_with_metrics = 99981
    tmdb_id_null_metrics = 99982
    test_ids = [tmdb_id_with_metrics, tmdb_id_null_metrics]

    # Cleanup
    for tid in test_ids:
        old = await db_session.get(Movie, generate_canonical_movie_id("tmdb", str(tid)))
        if old:
            await db_session.delete(old)
    await db_session.commit()

    service = CatalogIngestionService()
    try:
        # 1. Ingest movie with populated metrics
        p1 = make_sample_tmdb_payload(
            tmdb_id=tmdb_id_with_metrics,
            title="Populated Movie",
            popularity=112.5,
            vote_average=7.8,
            vote_count=9800,
        )
        p1["keywords"] = {
            "keywords": [
                {"id": 10, "name": "slow burn"},
                {"id": 20, "name": "space station"},
            ]
        }
        can1, action1 = await service.ingest_payload(p1, session=db_session)
        assert action1 == "inserted"

        # 2. Ingest movie with null metrics (nullable support)
        p2 = make_sample_tmdb_payload(
            tmdb_id=tmdb_id_null_metrics,
            title="Null Metrics Movie",
            popularity=None,
            vote_average=None,
            vote_count=None,
        )
        can2, action2 = await service.ingest_payload(p2, session=db_session)
        assert action2 == "inserted"

        # 3. Read back from PostgreSQL
        m1 = await db_session.get(Movie, can1.id)
        assert m1 is not None
        assert m1.popularity == 112.5
        assert m1.vote_average == 7.8
        assert m1.vote_count == 9800
        assert "space station" in m1.tags
        assert "slow burn" in m1.tags

        m2 = await db_session.get(Movie, can2.id)
        assert m2 is not None
        assert m2.popularity is None
        assert m2.vote_average is None
        assert m2.vote_count is None

        # 4. Idempotent re-ingestion with updated metrics (no duplicate canonical movies)
        p1_updated = make_sample_tmdb_payload(
            tmdb_id=tmdb_id_with_metrics,
            title="Populated Movie Updated",
            popularity=125.0,
            vote_average=8.1,
            vote_count=10500,
        )
        can1_updated, action_update = await service.ingest_payload(
            p1_updated, session=db_session
        )
        assert action_update == "updated"
        assert can1_updated.id == can1.id

        # Verify in database
        db_session.expire_all()
        m1_reloaded = await db_session.get(Movie, can1.id)
        assert m1_reloaded is not None
        assert m1_reloaded.popularity == 125.0
        assert m1_reloaded.vote_average == 8.1
        assert m1_reloaded.vote_count == 10500

    finally:
        for tid in test_ids:
            m = await db_session.get(
                Movie, generate_canonical_movie_id("tmdb", str(tid))
            )
            if m:
                await db_session.delete(m)
        await db_session.commit()

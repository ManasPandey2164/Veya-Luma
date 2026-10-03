"""Comprehensive test suite for Veya Luma Phase 2 Step 13: PostgreSQL Movie Catalog Foundation.

Covers:
1. Domain -> Database mapping (pure unit tests)
2. Database -> Domain mapping (pure unit tests)
3. Bidirectional mapping round-trip fidelity
4. Synthetic internal UUIDv4/UUIDv5 preservation
5. Nullable and minimal metadata handling without fabricated placeholders
6. Taxonomy key generation and canonical seed derivation
7. PostgreSQL movie persistence creation and retrieval
8. PostgreSQL provider identity uniqueness constraint enforcement
9. Multiple external provider identities for a single movie
10. PostgreSQL normalized taxonomy relationships and filtering
11. Duplicate relationship prevention
12. Credits persistence and billing order preservation
13. Artwork reference persistence and cascade lifecycle
14. Collection / franchise relationship sharing and lifecycle
15. Audit provenance persistence with SHA-256 and JSONB field-level sources
16. Database-level check constraints
"""

import uuid
from datetime import date, datetime, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.movie.identity import generate_canonical_movie_id
from app.domain.movie.mapper import (
    canonical_movie_to_orm,
    orm_to_canonical_movie,
)
from app.domain.movie.taxonomy import (
    CANONICAL_GENRES,
    CANONICAL_MOODS,
    CANONICAL_STYLES,
    CANONICAL_THEMES,
    get_canonical_taxonomy_seeds,
)
from app.models.movie import (
    Movie,
    MovieArtwork,
    MovieCollection,
    MovieCredit,
    MovieProvenance,
    MovieTag,
    SourceIdentity,
    TaxonomyNode,
)
from app.schemas.movie import (
    ArtworkReference,
    CanonicalMovie,
    CastMember,
    CollectionReference,
    CrewMember,
    MovieCredits,
    ProvenanceRecord,
    ProviderIdentity,
)

# ==============================================================================
# SECTION A: DOMAIN <-> PERSISTENCE MAPPING UNIT TESTS
# ==============================================================================


def create_sample_canonical_movie(
    title: str = "Dune: Part Two",
    external_tmdb_id: str = "693134",
    collection_id: str = "726872",
    imdb_id: str = "tt15239678",
) -> CanonicalMovie:
    """Creates a fully populated CanonicalMovie domain fixture."""
    movie_id = generate_canonical_movie_id("tmdb", external_tmdb_id)
    return CanonicalMovie(
        id=movie_id,
        title=title,
        original_title="Dune: Part Two",
        original_language="en",
        spoken_languages=["en", "ar"],
        release_date=date(2024, 3, 1),
        release_year=2024,
        runtime_minutes=166,
        synopsis="Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen.",
        genres=["Sci-Fi", "Adventure"],
        themes=["Morality & Retribution", "Class Conflict & Power"],
        moods=["Visceral", "Atmospheric"],
        styles=["Stylized", "Practical effects"],
        credits=MovieCredits(
            director="Denis Villeneuve",
            directors=[
                CrewMember(
                    name="Denis Villeneuve",
                    department="Directing",
                    job="Director",
                    person_external_id="tmdb-137427",
                )
            ],
            cast=[
                CastMember(
                    name="Timothée Chalamet",
                    character="Paul Atreides",
                    billing_order=0,
                    person_external_id="tmdb-1190668",
                ),
                CastMember(
                    name="Zendaya",
                    character="Chani",
                    billing_order=1,
                    person_external_id="tmdb-505710",
                ),
            ],
            crew=[
                CrewMember(
                    name="Greig Fraser",
                    department="Camera",
                    job="Director of Photography",
                    person_external_id="tmdb-114406",
                )
            ],
        ),
        artwork=ArtworkReference(
            poster_path="/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
            backdrop_path="/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg",
            poster_url="https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
            backdrop_url="https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg",
        ),
        collection=CollectionReference(
            collection_id=collection_id,
            name="Dune Collection",
            poster_path="/collection_poster.jpg",
        ),
        provider_identities=[
            ProviderIdentity(
                source="tmdb",
                external_id=external_tmdb_id,
                confidence=1.0,
                is_primary=True,
            ),
            ProviderIdentity(
                source="imdb",
                external_id=imdb_id,
                confidence=1.0,
                is_primary=False,
            ),
        ],
        provenance=ProvenanceRecord(
            source="tmdb",
            source_id=external_tmdb_id,
            endpoint_or_product="movie-details",
            retrieved_at=datetime(2026, 10, 1, 12, 0, tzinfo=timezone.utc),
            license_profile="tmdb-noncommercial-prototype",
            raw_sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            field_sources={
                "title": "source_derived",
                "themes": "veya_derived",
                "moods": "veya_derived",
            },
        ),
        tags=["desert", "epic", "space-opera"],
    )


def test_domain_to_orm_mapping() -> None:
    """Verifies that CanonicalMovie maps accurately to SQLAlchemy ORM models."""
    canonical = create_sample_canonical_movie()
    orm_movie = canonical_movie_to_orm(canonical)

    assert orm_movie.id == canonical.id
    assert orm_movie.title == "Dune: Part Two"
    assert orm_movie.original_title == "Dune: Part Two"
    assert orm_movie.original_language == "en"
    assert orm_movie.spoken_languages == ["en", "ar"]
    assert orm_movie.release_date == date(2024, 3, 1)
    assert orm_movie.release_year == 2024
    assert orm_movie.runtime_minutes == 166
    assert orm_movie.synopsis == canonical.synopsis
    assert orm_movie.tags == ["desert", "epic", "space-opera"]

    # Collection
    assert orm_movie.collection is not None
    assert orm_movie.collection.external_id == "726872"
    assert orm_movie.collection.name == "Dune Collection"

    # Artwork
    assert orm_movie.artwork is not None
    assert orm_movie.artwork.poster_path == "/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg"
    assert orm_movie.artwork.backdrop_path == "/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg"

    # Provider identities
    assert len(orm_movie.provider_identities) == 2
    sources = {pi.source: pi.external_id for pi in orm_movie.provider_identities}
    assert sources == {"tmdb": "693134", "imdb": "tt15239678"}

    # Provenance
    assert orm_movie.provenance is not None
    assert orm_movie.provenance.source == "tmdb"
    assert orm_movie.provenance.source_id == "693134"
    assert orm_movie.provenance.license_profile == "tmdb-noncommercial-prototype"
    assert orm_movie.provenance.field_sources["themes"] == "veya_derived"

    # Credits
    assert len(orm_movie.credits) == 4
    cast = [c for c in orm_movie.credits if c.credit_type == "cast"]
    assert len(cast) == 2
    assert cast[0].name == "Timothée Chalamet"
    assert cast[0].billing_order == 0

    directors = [
        c for c in orm_movie.credits if c.credit_type == "crew" and c.job == "Director"
    ]
    assert len(directors) == 1
    assert directors[0].name == "Denis Villeneuve"

    # Taxonomy tags
    assert len(orm_movie.taxonomy_tags) == 8  # 2 genres + 2 themes + 2 moods + 2 styles
    axes = [t.node.axis for t in orm_movie.taxonomy_tags]
    assert axes.count("genre") == 2
    assert axes.count("theme") == 2
    assert axes.count("mood") == 2
    assert axes.count("style") == 2


def test_orm_to_domain_mapping_and_roundtrip() -> None:
    """Verifies that ORM models map back to CanonicalMovie without loss or distortion."""
    original = create_sample_canonical_movie()
    orm_movie = canonical_movie_to_orm(original)
    reconstructed = orm_to_canonical_movie(orm_movie)

    assert reconstructed.id == original.id
    assert reconstructed.title == original.title
    assert reconstructed.original_title == original.original_title
    assert reconstructed.original_language == original.original_language
    assert reconstructed.spoken_languages == original.spoken_languages
    assert reconstructed.release_date == original.release_date
    assert reconstructed.release_year == original.release_year
    assert reconstructed.runtime_minutes == original.runtime_minutes
    assert reconstructed.synopsis == original.synopsis
    assert set(reconstructed.genres) == set(original.genres)
    assert set(reconstructed.themes) == set(original.themes)
    assert set(reconstructed.moods) == set(original.moods)
    assert set(reconstructed.styles) == set(original.styles)
    assert reconstructed.tags == original.tags

    # Credits
    assert reconstructed.credits.director == "Denis Villeneuve"
    assert len(reconstructed.credits.cast) == 2
    assert reconstructed.credits.cast[0].name == "Timothée Chalamet"
    assert reconstructed.credits.cast[1].name == "Zendaya"

    # Artwork
    assert reconstructed.artwork.poster_path == original.artwork.poster_path
    assert reconstructed.artwork.backdrop_path == original.artwork.backdrop_path

    # Collection
    assert reconstructed.collection is not None
    assert reconstructed.collection.collection_id == "726872"
    assert reconstructed.collection.name == "Dune Collection"

    # Provenance
    assert reconstructed.provenance is not None
    assert reconstructed.provenance.source == "tmdb"
    assert reconstructed.provenance.source_id == "693134"


def test_mapping_nullable_and_minimal_metadata() -> None:
    """Verifies that missing metadata remains strictly None / empty with zero placeholder fabrication."""
    minimal_id = uuid.uuid4()
    minimal_canonical = CanonicalMovie(
        id=minimal_id,
        title="Minimalist Feature",
        original_language="ja",
    )

    orm_movie = canonical_movie_to_orm(minimal_canonical)
    assert orm_movie.original_title is None
    assert orm_movie.release_date is None
    assert orm_movie.release_year is None
    assert orm_movie.runtime_minutes is None
    assert orm_movie.synopsis is None
    assert orm_movie.collection is None
    assert orm_movie.artwork is None
    assert orm_movie.provenance is None
    assert len(orm_movie.provider_identities) == 0
    assert len(orm_movie.credits) == 0
    assert len(orm_movie.taxonomy_tags) == 0

    reconstructed = orm_to_canonical_movie(orm_movie)
    assert reconstructed.id == minimal_id
    assert reconstructed.title == "Minimalist Feature"
    assert reconstructed.original_language == "ja"
    assert reconstructed.original_title is None
    assert reconstructed.release_date is None
    assert reconstructed.release_year is None
    assert reconstructed.runtime_minutes is None
    assert reconstructed.synopsis is None
    assert reconstructed.collection is None
    assert reconstructed.provenance is None


def test_taxonomy_key_and_seed_integrity() -> None:
    """Verifies that taxonomy key generation produces unique keys matching controlled vocabularies."""
    seeds = get_canonical_taxonomy_seeds()
    assert len(seeds) == 86

    keys = [s["key"] for s in seeds]
    assert len(keys) == len(set(keys)), "Taxonomy keys must be mutually unique"

    genre_labels = {s["label"] for s in seeds if s["axis"] == "genre"}
    theme_labels = {s["label"] for s in seeds if s["axis"] == "theme"}
    mood_labels = {s["label"] for s in seeds if s["axis"] == "mood"}
    style_labels = {s["label"] for s in seeds if s["axis"] == "style"}

    assert genre_labels == CANONICAL_GENRES
    assert theme_labels == CANONICAL_THEMES
    assert mood_labels == CANONICAL_MOODS
    assert style_labels == CANONICAL_STYLES


# ==============================================================================
# SECTION B: POSTGRESQL INTEGRATION TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_pg_movie_persistence_creation_and_retrieval(
    db_session: AsyncSession,
) -> None:
    """Verifies full entity persistence and relational query in PostgreSQL."""
    # 1. Fetch pre-seeded taxonomy nodes from PostgreSQL
    res = await db_session.execute(select(TaxonomyNode))
    existing_nodes = res.scalars().all()
    node_lookup = {(n.axis, n.label): n for n in existing_nodes}
    assert len(node_lookup) >= 86

    # 2. Map canonical movie to ORM using existing DB taxonomy nodes
    canonical = create_sample_canonical_movie(
        title="Dune: Part Two (PG Integration)",
        external_tmdb_id="693134-test",
        collection_id="coll-693134-test",
        imdb_id="tt693134-test",
    )
    orm_movie = canonical_movie_to_orm(canonical, taxonomy_node_lookup=node_lookup)

    try:
        db_session.add(orm_movie)
        await db_session.commit()

        # 3. Retrieve in a fresh query with relationships loaded
        stmt = (
            select(Movie)
            .where(Movie.id == canonical.id)
            .options(
                selectinload(Movie.collection),
                selectinload(Movie.artwork),
                selectinload(Movie.provenance),
                selectinload(Movie.provider_identities),
                selectinload(Movie.credits),
                selectinload(Movie.taxonomy_tags).selectinload(MovieTag.node),
            )
        )
        result = await db_session.execute(stmt)
        retrieved = result.scalar_one()

        assert retrieved.id == canonical.id
        assert retrieved.title == canonical.title
        assert retrieved.release_year == 2024
        assert retrieved.collection is not None
        assert retrieved.collection.name == "Dune Collection"
        assert retrieved.artwork is not None
        assert retrieved.artwork.poster_path == "/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg"
        assert len(retrieved.provider_identities) == 2
        assert len(retrieved.credits) == 4
        assert len(retrieved.taxonomy_tags) == 8

        # 4. Map back to canonical domain model
        domain_movie = orm_to_canonical_movie(retrieved)
        assert domain_movie.id == canonical.id
        assert domain_movie.title == canonical.title
        assert domain_movie.credits.director == "Denis Villeneuve"
        assert "Sci-Fi" in domain_movie.genres
        assert "Morality & Retribution" in domain_movie.themes
    finally:
        # Cleanup test movie
        await db_session.delete(orm_movie)
        if orm_movie.collection:
            await db_session.delete(orm_movie.collection)
        await db_session.commit()


@pytest.mark.asyncio
async def test_pg_internal_uuid_preservation(db_session: AsyncSession) -> None:
    """Verifies that the synthetic UUID is preserved exactly in PostgreSQL."""
    expected_uuid = generate_canonical_movie_id("tmdb", "unique-uuid-test")
    movie = Movie(
        id=expected_uuid,
        title="UUID Test Movie",
        original_language="en",
    )
    try:
        db_session.add(movie)
        await db_session.commit()

        queried = await db_session.get(Movie, expected_uuid)
        assert queried is not None
        assert queried.id == expected_uuid
    finally:
        await db_session.delete(movie)
        await db_session.commit()


@pytest.mark.asyncio
async def test_pg_provider_identity_uniqueness_constraint(
    db_session: AsyncSession,
) -> None:
    """Verifies that PostgreSQL enforces uniqueness on (source, external_id)."""
    movie1_id = uuid.uuid4()
    movie2_id = uuid.uuid4()

    movie1 = Movie(id=movie1_id, title="Provider Test 1", original_language="en")
    movie2 = Movie(id=movie2_id, title="Provider Test 2", original_language="en")

    id1 = SourceIdentity(
        movie_id=movie1_id,
        source="tmdb",
        external_id="collision-test-123",
    )
    id2 = SourceIdentity(
        movie_id=movie2_id,
        source="tmdb",
        external_id="collision-test-123",  # Duplicate provider identity!
    )

    db_session.add_all([movie1, movie2, id1])
    await db_session.commit()

    db_session.add(id2)
    with pytest.raises(IntegrityError):
        await db_session.commit()

    await db_session.rollback()

    # Clean up
    await db_session.delete(await db_session.get(Movie, movie1_id))
    await db_session.delete(await db_session.get(Movie, movie2_id))
    await db_session.commit()


@pytest.mark.asyncio
async def test_pg_multiple_provider_identities_for_single_movie(
    db_session: AsyncSession,
) -> None:
    """Verifies that a single movie can be linked to multiple external providers."""
    movie_id = uuid.uuid4()
    movie = Movie(id=movie_id, title="Multi-Source Movie", original_language="en")
    movie.provider_identities = [
        SourceIdentity(source="tmdb", external_id="ms-tmdb-1", is_primary=True),
        SourceIdentity(source="imdb", external_id="tt0000001", is_primary=False),
        SourceIdentity(source="wikidata", external_id="Q12345", is_primary=False),
    ]

    try:
        db_session.add(movie)
        await db_session.commit()

        stmt = (
            select(Movie)
            .where(Movie.id == movie_id)
            .options(selectinload(Movie.provider_identities))
        )
        res = await db_session.execute(stmt)
        retrieved = res.scalar_one()

        assert len(retrieved.provider_identities) == 3
        sources = {pi.source for pi in retrieved.provider_identities}
        assert sources == {"tmdb", "imdb", "wikidata"}
    finally:
        await db_session.delete(movie)
        await db_session.commit()


@pytest.mark.asyncio
async def test_pg_taxonomy_relationship_filtering(db_session: AsyncSession) -> None:
    """Verifies normalized many-to-many taxonomy filtering via SQL join."""
    # Find canonical Sci-Fi node
    node_res = await db_session.execute(
        select(TaxonomyNode).where(
            TaxonomyNode.axis == "genre", TaxonomyNode.label == "Sci-Fi"
        )
    )
    scifi_node = node_res.scalar_one()

    movie_id = uuid.uuid4()
    movie = Movie(id=movie_id, title="Sci-Fi Filter Film", original_language="en")
    tag = MovieTag(
        movie_id=movie_id, node_id=scifi_node.id, strength=1.0, confidence=1.0
    )

    try:
        db_session.add_all([movie, tag])
        await db_session.commit()

        # Query all movies tagged with 'Sci-Fi'
        stmt = (
            select(Movie)
            .join(MovieTag, Movie.id == MovieTag.movie_id)
            .join(TaxonomyNode, MovieTag.node_id == TaxonomyNode.id)
            .where(
                TaxonomyNode.axis == "genre",
                TaxonomyNode.label == "Sci-Fi",
                Movie.id == movie_id,
            )
        )
        res = await db_session.execute(stmt)
        matching_movies = res.scalars().all()
        assert len(matching_movies) == 1
        assert matching_movies[0].title == "Sci-Fi Filter Film"
    finally:
        await db_session.delete(movie)
        await db_session.commit()


@pytest.mark.asyncio
async def test_pg_duplicate_tag_prevention(db_session: AsyncSession) -> None:
    """Verifies that composite primary key on movie_tag prevents duplicate tag relationships."""
    node_res = await db_session.execute(select(TaxonomyNode).limit(1))
    sample_node = node_res.scalar_one()

    movie_id = uuid.uuid4()
    movie = Movie(id=movie_id, title="Duplicate Tag Test", original_language="en")
    tag1 = MovieTag(movie_id=movie_id, node_id=sample_node.id)
    tag2 = MovieTag(movie_id=movie_id, node_id=sample_node.id)  # Same PK

    db_session.add_all([movie, tag1])
    await db_session.commit()

    db_session.add(tag2)
    with pytest.raises(IntegrityError):
        await db_session.commit()

    await db_session.rollback()
    await db_session.delete(await db_session.get(Movie, movie_id))
    await db_session.commit()


@pytest.mark.asyncio
async def test_pg_collection_sharing_and_lifecycle(db_session: AsyncSession) -> None:
    """Verifies that multiple movies share a single collection without duplication,
    and deleting a movie does not delete the shared collection.
    """
    collection = MovieCollection(
        name="The Matrix Collection",
        external_id="tmdb-collection-2344",
    )
    db_session.add(collection)
    await db_session.flush()

    movie1 = Movie(
        id=uuid.uuid4(),
        title="The Matrix",
        original_language="en",
        collection_id=collection.id,
    )
    movie2 = Movie(
        id=uuid.uuid4(),
        title="The Matrix Reloaded",
        original_language="en",
        collection_id=collection.id,
    )
    db_session.add_all([movie1, movie2])
    await db_session.commit()

    try:
        # Both movies reference the exact same collection row
        m1 = await db_session.get(Movie, movie1.id)
        m2 = await db_session.get(Movie, movie2.id)
        assert m1 is not None and m2 is not None
        assert m1.collection_id == collection.id
        assert m2.collection_id == collection.id

        # Delete movie 1; collection must remain for movie 2
        await db_session.delete(m1)
        await db_session.commit()

        coll_check = await db_session.get(MovieCollection, collection.id)
        assert coll_check is not None
        assert coll_check.name == "The Matrix Collection"

        m2_check = await db_session.get(Movie, movie2.id)
        assert m2_check is not None
        assert m2_check.collection_id == collection.id
    finally:
        await db_session.delete(movie2)
        coll_to_delete = await db_session.get(MovieCollection, collection.id)
        if coll_to_delete:
            await db_session.delete(coll_to_delete)
        await db_session.commit()


@pytest.mark.asyncio
async def test_pg_cascade_deletion(db_session: AsyncSession) -> None:
    """Verifies that deleting a movie cascades and removes its dependent rows."""
    movie_id = uuid.uuid4()
    movie = Movie(id=movie_id, title="Cascade Test Film", original_language="en")
    movie.artwork = MovieArtwork(poster_path="/cascade_poster.jpg")
    movie.provenance = MovieProvenance(
        source="tmdb",
        endpoint_or_product="movie-details",
        retrieved_at=datetime.now(timezone.utc),
        license_profile="test-license",
        field_sources={},
    )
    movie.provider_identities = [SourceIdentity(source="tmdb", external_id="cascade-1")]
    movie.credits = [MovieCredit(credit_type="cast", name="Actor One")]

    db_session.add(movie)
    await db_session.commit()

    # Now delete the movie
    await db_session.delete(movie)
    await db_session.commit()

    # Verify children are deleted
    artwork = await db_session.execute(
        select(MovieArtwork).where(MovieArtwork.movie_id == movie_id)
    )
    assert artwork.scalar_one_or_none() is None

    prov = await db_session.execute(
        select(MovieProvenance).where(MovieProvenance.movie_id == movie_id)
    )
    assert prov.scalar_one_or_none() is None

    pids = await db_session.execute(
        select(SourceIdentity).where(SourceIdentity.movie_id == movie_id)
    )
    assert pids.scalar_one_or_none() is None

    creds = await db_session.execute(
        select(MovieCredit).where(MovieCredit.movie_id == movie_id)
    )
    assert creds.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_pg_check_constraints(db_session: AsyncSession) -> None:
    """Verifies PostgreSQL check constraints on runtime and release year."""
    # Invalid runtime (< 0)
    invalid_runtime = Movie(
        id=uuid.uuid4(),
        title="Invalid Runtime",
        original_language="en",
        runtime_minutes=-15,
    )
    db_session.add(invalid_runtime)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()

    # Invalid release year (< 1880)
    invalid_year = Movie(
        id=uuid.uuid4(),
        title="Invalid Year",
        original_language="en",
        release_year=1600,
    )
    db_session.add(invalid_year)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()

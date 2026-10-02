"""Focused Test Suite for Veya Luma Phase 2 — Movie Data Foundation.

Validates all 14 mandatory architectural requirements:
1. Valid canonical movie
2. Invalid canonical movie
3. Required fields
4. Optional fields
5. Provider identity
6. Internal identity determinism
7. Provenance tracking
8. Canonical genres validation
9. Canonical themes validation
10. Canonical moods validation
11. Taxonomy normalization (TMDB IDs/strings -> Canonical)
12. Duplicate identity resolution & conflict detection
13. Missing metadata preservation (zero placeholder fabrication)
14. Source -> Canonical transformation & optional Wikidata enrichment
"""

from datetime import date, datetime, timezone
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError

from app.domain.movie.identity import (
    IdentityResolver,
    generate_canonical_movie_id,
)
from app.domain.movie.provenance import (
    compute_payload_sha256,
    create_provenance_record,
)
from app.domain.movie.taxonomy import (
    map_keywords_to_taxonomy,
    normalize_genre,
    normalize_genres,
)
from app.domain.movie.validation import (
    validate_canonical_movie,
)
from app.providers.tmdb import TMDBProvider
from app.providers.wikidata import WikidataProvider
from app.schemas.movie import (
    ArtworkReference,
    CanonicalMovie,
    CastMember,
    CrewMember,
    FieldSourceType,
    MovieCredits,
    ProviderIdentity,
    ResolutionAction,
)

# ==============================================================================
# 1. VALID CANONICAL MOVIE
# ==============================================================================

def test_valid_canonical_movie() -> None:
    """Verifies that a fully populated valid CanonicalMovie passes all invariants."""
    movie = CanonicalMovie(
        id=uuid4(),
        title="Blade Runner 2049",
        original_title="Blade Runner 2049",
        original_language="en",
        spoken_languages=["en"],
        release_date=date(2017, 10, 6),
        release_year=2017,
        runtime_minutes=164,
        synopsis="A young blade runner's discovery of a long-buried secret leads him to track down former blade runner Rick Deckard.",
        genres=["Sci-Fi", "Neo-Noir", "Mystery"],
        themes=["Artificial Intelligence & Identity", "Memory & Determinism", "Existentialism & Isolation"],
        moods=["Atmospheric", "Nocturnal", "Melancholic", "Contemplative"],
        credits=MovieCredits(
            director="Denis Villeneuve",
            cast=[
                CastMember(name="Ryan Gosling", character="K", billing_order=0),
                CastMember(name="Harrison Ford", character="Rick Deckard", billing_order=1),
            ],
            crew=[
                CrewMember(name="Denis Villeneuve", department="Directing", job="Director"),
            ],
        ),
        artwork=ArtworkReference(
            poster_path="/poster_br2049.jpg",
            backdrop_path="/backdrop_br2049.jpg",
        ),
        provider_identities=[
            ProviderIdentity(source="tmdb", external_id="335984", confidence=1.0, is_primary=True),
            ProviderIdentity(source="imdb", external_id="tt1856101", confidence=1.0),
        ],
    )

    errors = validate_canonical_movie(movie)
    assert errors == []
    assert movie.title == "Blade Runner 2049"
    assert movie.release_year == 2017
    assert movie.runtime_minutes == 164
    assert "Sci-Fi" in movie.genres


# ==============================================================================
# 2. INVALID CANONICAL MOVIE
# ==============================================================================

def test_invalid_canonical_movie() -> None:
    """Verifies that malformed movies are rejected by domain validation."""
    # Empty title
    with pytest.raises(ValidationError):
        CanonicalMovie(
            id=uuid4(),
            title="   ",
            genres=["Sci-Fi"],
        )

    # Runtime <= 0
    with pytest.raises(ValidationError):
        CanonicalMovie(
            id=uuid4(),
            title="Solaris",
            runtime_minutes=0,
            genres=["Sci-Fi"],
        )

    # Negative runtime
    with pytest.raises(ValidationError):
        CanonicalMovie(
            id=uuid4(),
            title="Solaris",
            runtime_minutes=-100,
            genres=["Sci-Fi"],
        )

    # Inconsistent release year and release date
    with pytest.raises(ValidationError) as exc_info:
        CanonicalMovie(
            id=uuid4(),
            title="Solaris",
            release_date=date(1972, 3, 20),
            release_year=1999,  # Mismatch!
            genres=["Sci-Fi"],
        )
    assert "does not match release_date year" in str(exc_info.value)


# ==============================================================================
# 3. REQUIRED FIELDS
# ==============================================================================

def test_required_fields() -> None:
    """Ensures required fields (id, title) cannot be omitted."""
    with pytest.raises(ValidationError) as exc:
        CanonicalMovie.model_validate({})
    err_str = str(exc.value)
    assert "id" in err_str
    assert "title" in err_str


# ==============================================================================
# 4. OPTIONAL FIELDS
# ==============================================================================

def test_optional_fields() -> None:
    """Ensures optional fields cleanly default to None or empty containers."""
    minimal = CanonicalMovie(
        id=uuid4(),
        title="Minimalist Auteur Piece",
    )
    assert minimal.original_title is None
    assert minimal.release_date is None
    assert minimal.release_year is None
    assert minimal.runtime_minutes is None
    assert minimal.synopsis is None
    assert minimal.genres == []
    assert minimal.themes == []
    assert minimal.moods == []
    assert minimal.credits.director is None
    assert minimal.credits.cast == []
    assert minimal.artwork.poster_path is None
    assert minimal.collection is None
    assert minimal.provenance is None


# ==============================================================================
# 5. PROVIDER IDENTITY
# ==============================================================================

def test_provider_identity() -> None:
    """Tests provider identity representation, bounds, and external sourcing invariants."""
    ident = ProviderIdentity(
        source="tmdb",
        external_id="550",
        confidence=1.0,
        is_primary=True,
    )
    assert ident.source == "tmdb"
    assert ident.external_id == "550"
    assert ident.confidence == 1.0
    assert ident.is_primary is True

    # Confidence must be between 0 and 1
    with pytest.raises(ValidationError):
        ProviderIdentity(source="tmdb", external_id="550", confidence=1.5)

    with pytest.raises(ValidationError):
        ProviderIdentity(source="tmdb", external_id="550", confidence=-0.1)

    # Externally sourced movie requires provider identity
    extern_movie = CanonicalMovie(
        id=uuid4(),
        title="Unprovenanced Movie",
        provider_identities=[],
    )
    errors = validate_canonical_movie(extern_movie, is_externally_sourced=True)
    assert any("require at least one provider identity" in e for e in errors)


# ==============================================================================
# 6. INTERNAL IDENTITY (DETERMINISM)
# ==============================================================================

def test_internal_identity_determinism() -> None:
    """Verifies that internal UUIDv5 generation is deterministic and reproducible."""
    uuid1 = generate_canonical_movie_id("tmdb", "335984")
    uuid2 = generate_canonical_movie_id("tmdb", "335984")
    uuid_different = generate_canonical_movie_id("tmdb", "550")
    uuid_other_source = generate_canonical_movie_id("wikidata", "335984")

    assert isinstance(uuid1, UUID)
    assert uuid1 == uuid2, "Same source and external ID must yield identical UUID"
    assert uuid1 != uuid_different, "Different external IDs must yield different UUIDs"
    assert uuid1 != uuid_other_source, "Different sources must yield different UUIDs"


# ==============================================================================
# 7. PROVENANCE TRACKING
# ==============================================================================

def test_provenance_tracking() -> None:
    """Tests provenance creation, SHA-256 payload hashing, and field derivation tagging."""
    raw_payload = {"id": 335984, "title": "Blade Runner 2049", "runtime": 164}
    digest = compute_payload_sha256(raw_payload)
    assert len(digest) == 64  # SHA-256 hex string

    now = datetime.now(timezone.utc)
    record = create_provenance_record(
        source="tmdb",
        source_id="335984",
        raw_payload=raw_payload,
        license_profile="tmdb-noncommercial-prototype",
        retrieved_at=now,
    )

    assert record.source == "tmdb"
    assert record.source_id == "335984"
    assert record.raw_sha256 == digest
    assert record.license_profile == "tmdb-noncommercial-prototype"
    assert record.field_sources["title"] == FieldSourceType.SOURCE_DERIVED.value
    assert record.field_sources["themes"] == FieldSourceType.VEYA_DERIVED.value
    assert record.field_sources["moods"] == FieldSourceType.VEYA_DERIVED.value


# ==============================================================================
# 8. CANONICAL GENRES VALIDATION
# ==============================================================================

def test_canonical_genres_validation() -> None:
    """Tests that genres must strictly conform to CANONICAL_GENRES."""
    # Valid canonical genres
    movie = CanonicalMovie(
        id=uuid4(),
        title="Valid Genres Film",
        genres=["Sci-Fi", "Thriller", "Art-House"],
    )
    assert movie.genres == ["Sci-Fi", "Thriller", "Art-House"]

    # Invalid genre string
    with pytest.raises(ValidationError) as exc:
        CanonicalMovie(
            id=uuid4(),
            title="Invalid Genre Film",
            genres=["Science Fiction"],  # Should be normalized to "Sci-Fi"
        )
    assert "Invalid canonical genre: 'Science Fiction'" in str(exc.value)


# ==============================================================================
# 9. CANONICAL THEMES VALIDATION
# ==============================================================================

def test_canonical_themes_validation() -> None:
    """Tests that themes must strictly conform to CANONICAL_THEMES."""
    movie = CanonicalMovie(
        id=uuid4(),
        title="Valid Themes Film",
        themes=["Artificial Intelligence & Identity", "Memory & Determinism"],
    )
    assert len(movie.themes) == 2

    # Non-canonical theme
    with pytest.raises(ValidationError) as exc:
        CanonicalMovie(
            id=uuid4(),
            title="Invalid Theme Film",
            themes=["Arbitrary Plot Detail Theme"],
        )
    assert "Invalid canonical theme" in str(exc.value)


# ==============================================================================
# 10. CANONICAL MOODS VALIDATION
# ==============================================================================

def test_canonical_moods_validation() -> None:
    """Tests that moods must strictly conform to CANONICAL_MOODS."""
    movie = CanonicalMovie(
        id=uuid4(),
        title="Valid Moods Film",
        moods=["Atmospheric", "Contemplative", "Nocturnal"],
    )
    assert len(movie.moods) == 3

    # Non-canonical mood
    with pytest.raises(ValidationError) as exc:
        CanonicalMovie(
            id=uuid4(),
            title="Invalid Mood Film",
            moods=["Hyper-Crazy"],
        )
    assert "Invalid canonical mood" in str(exc.value)


# ==============================================================================
# 11. TAXONOMY NORMALIZATION
# ==============================================================================

def test_taxonomy_normalization() -> None:
    """Tests normalization of TMDB numeric IDs and alias strings to canonical genres."""
    # TMDB IDs
    assert normalize_genre(878) == "Sci-Fi"
    assert normalize_genre(53) == "Thriller"
    assert normalize_genre(18) == "Drama"
    assert normalize_genre(9648) == "Mystery"

    # TMDB Names / Aliases
    assert normalize_genre("Science Fiction") == "Sci-Fi"
    assert normalize_genre("science fiction") == "Sci-Fi"
    assert normalize_genre("film noir") == "Neo-Noir"
    assert normalize_genre("arthouse") == "Art-House"
    assert normalize_genre("black comedy") == "Comedy"

    # Batch normalization & deduplication
    raw_list = ["Science Fiction", 878, "Thriller", "film noir", "UnknownProviderGenre"]
    normalized = normalize_genres(raw_list)
    assert normalized == ["Sci-Fi", "Thriller", "Neo-Noir"]

    # Keyword mapping to themes and moods
    themes, moods = map_keywords_to_taxonomy(["artificial intelligence", "memory", "slow burn"])
    assert "Artificial Intelligence & Identity" in themes
    assert "Memory & Determinism" in themes
    assert "Meditative" in moods or "Contemplative" in moods


# ==============================================================================
# 12. DUPLICATE IDENTITY HANDLING
# ==============================================================================

def test_duplicate_identity_handling() -> None:
    """Tests multi-tier identity resolution: exact, cross-source, corroborated, conflict, and create_new."""
    existing_id = uuid4()
    existing_movie = CanonicalMovie(
        id=existing_id,
        title="Solaris",
        release_date=date(1972, 3, 20),
        release_year=1972,
        runtime_minutes=167,
        genres=["Sci-Fi", "Mystery"],
        credits=MovieCredits(director="Andrei Tarkovsky"),
        provider_identities=[
            ProviderIdentity(source="tmdb", external_id="830", is_primary=True),
            ProviderIdentity(source="imdb", external_id="tt0069293"),
        ],
    )

    resolver = IdentityResolver([existing_movie])

    # Tier 1: Exact Match (same provider + external ID)
    res_exact = resolver.resolve(
        candidate_source="tmdb",
        candidate_external_id="830",
        candidate_title="Solaris",
    )
    assert res_exact.action == ResolutionAction.MATCH_EXACT
    assert res_exact.resolved_id == existing_id
    assert res_exact.confidence == 1.0

    # Tier 2: Cross-Source Match (via IMDb external ID)
    res_cross = resolver.resolve(
        candidate_source="wikidata",
        candidate_external_id="Q183672",
        candidate_title="Solaris",
        cross_identifiers=[ProviderIdentity(source="imdb", external_id="tt0069293")],
    )
    assert res_cross.action == ResolutionAction.MATCH_CROSS_SOURCE
    assert res_cross.resolved_id == existing_id
    assert res_cross.confidence == 0.98

    # Tier 3: Natural Corroboration Match (normalized title + release year + director)
    res_corrob = resolver.resolve(
        candidate_source="other_source",
        candidate_external_id="some_id_999",
        candidate_title="The Solaris",  # Leading article stripped
        candidate_year=1972,
        candidate_runtime=167,
        candidate_director="Andrei Tarkovsky",
    )
    assert res_corrob.action == ResolutionAction.MATCH_CORROBORATED
    assert res_corrob.resolved_id == existing_id

    # Conflict / Collision Review (Same title, but different director e.g. Soderbergh remake)
    res_conflict = resolver.resolve(
        candidate_source="other_source",
        candidate_external_id="remake_id",
        candidate_title="Solaris",
        candidate_year=1973,  # Close year but divergent director
        candidate_runtime=99,
        candidate_director="Steven Soderbergh",
    )
    assert res_conflict.action == ResolutionAction.AMBIGUOUS_CONFLICT

    # Tier 4: New Unseen Record
    res_new = resolver.resolve(
        candidate_source="tmdb",
        candidate_external_id="123456",
        candidate_title="Stalker",
        candidate_year=1979,
    )
    assert res_new.action == ResolutionAction.CREATE_NEW
    assert res_new.resolved_id == generate_canonical_movie_id("tmdb", "123456")


# ==============================================================================
# 13. MISSING METADATA PRESERVATION
# ==============================================================================

def test_missing_metadata_preservation() -> None:
    """Verifies that missing upstream metadata remains None and placeholder fabrication is blocked."""
    # When synopsis is missing or empty, it should be None
    movie = CanonicalMovie(
        id=uuid4(),
        title="Indie Film Without Synopsis",
        synopsis=None,
    )
    assert movie.synopsis is None

    # Forbidden placeholders are converted to None or caught by domain validation
    movie_with_placeholder = CanonicalMovie(
        id=uuid4(),
        title="Indie Film With NA",
        synopsis="N/A",  # validator strips placeholders to None
    )
    assert movie_with_placeholder.synopsis is None

    # Placeholder director is caught by validation
    invalid_movie = CanonicalMovie(
        id=uuid4(),
        title="Valid Title",
        credits=MovieCredits(director="Unknown Director"),
        provider_identities=[ProviderIdentity(source="editorial_fixture", external_id="f1")],
    )
    errors = validate_canonical_movie(invalid_movie)
    assert any("Director name contains forbidden placeholder" in e for e in errors)


# ==============================================================================
# 14. SOURCE -> CANONICAL TRANSFORMATION & WIKIDATA ENRICHMENT
# ==============================================================================

def test_source_to_canonical_transformation() -> None:
    """Tests end-to-end transformation from raw TMDB payload and Wikidata enrichment."""
    raw_tmdb_payload = {
        "id": 335984,
        "title": "Blade Runner 2049",
        "original_title": "Blade Runner 2049",
        "overview": "Thirty years after the events of the first film, a new blade runner unearths a long-buried secret.",
        "release_date": "2017-10-06",
        "runtime": 164,
        "original_language": "en",
        "spoken_languages": [{"iso_639_1": "en", "english_name": "English"}],
        "genres": [
            {"id": 878, "name": "Science Fiction"},
            {"id": 53, "name": "Thriller"},
        ],
        "poster_path": "/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
        "backdrop_path": "/sAtoMqDVhNDQBc3QJL3RF6hlxGq.jpg",
        "imdb_id": "tt1856101",
        "credits": {
            "cast": [
                {"id": 30614, "name": "Ryan Gosling", "character": "K", "order": 0},
                {"id": 1229, "name": "Harrison Ford", "character": "Rick Deckard", "order": 1},
            ],
            "crew": [
                {"id": 137427, "name": "Denis Villeneuve", "department": "Directing", "job": "Director"},
                {"id": 9214, "name": "Roger Deakins", "department": "Camera", "job": "Director of Photography"},
            ],
        },
        "keywords": {
            "keywords": [
                {"id": 310, "name": "artificial intelligence"},
                {"id": 1453, "name": "android"},
                {"id": 4565, "name": "dystopia"},
            ]
        },
    }

    provider = TMDBProvider()
    canonical = provider.parse_payload(
        raw_tmdb_payload,
        curated_themes=["Existentialism & Isolation"],
        curated_moods=["Atmospheric", "Contemplative"],
    )

    # Validate Canonical Model
    assert isinstance(canonical, CanonicalMovie)
    assert canonical.title == "Blade Runner 2049"
    assert canonical.release_year == 2017
    assert canonical.release_date == date(2017, 10, 6)
    assert canonical.runtime_minutes == 164
    assert canonical.genres == ["Sci-Fi", "Thriller"]
    assert "Artificial Intelligence & Identity" in canonical.themes
    assert "Existentialism & Isolation" in canonical.themes
    assert "Atmospheric" in canonical.moods
    assert canonical.credits.director == "Denis Villeneuve"
    assert len(canonical.credits.cast) == 2
    assert canonical.credits.cast[0].name == "Ryan Gosling"

    # Verify Provenance
    assert canonical.provenance is not None
    assert canonical.provenance.source == "tmdb"
    assert canonical.provenance.source_id == "335984"
    assert canonical.provenance.license_profile == "tmdb-noncommercial-prototype"
    assert len(canonical.provenance.raw_sha256 or "") == 64

    # Verify Provider Identities
    tmdb_ident = next(i for i in canonical.provider_identities if i.source == "tmdb")
    assert tmdb_ident.external_id == "335984"
    assert tmdb_ident.is_primary is True

    imdb_ident = next(i for i in canonical.provider_identities if i.source == "imdb")
    assert imdb_ident.external_id == "tt1856101"

    # Optional Wikidata Enrichment
    wikidata_payload = {
        "id": "Q21500755",
        "label": "Blade Runner 2049",
        "description": "2017 American science fiction film directed by Denis Villeneuve",
        "tmdb_id": "335984",
        "imdb_id": "tt1856101",
    }
    enriched = WikidataProvider.enrich(canonical, wikidata_payload)
    wikidata_ident = next(i for i in enriched.provider_identities if i.source == "wikidata")
    assert wikidata_ident.external_id == "Q21500755"
    assert len(enriched.provider_identities) == 3

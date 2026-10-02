"""Canonical Movie schemas and source model representations for Veya Luma.

Enforces clear conceptual separation between external provider responses (Source Models)
and the validated internal domain entity (CanonicalMovie).
"""

from datetime import date, datetime
from enum import Enum
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.domain.movie.taxonomy import (
    CANONICAL_GENRES,
    CANONICAL_MOODS,
    CANONICAL_THEMES,
)

# ==============================================================================
# 1. PROVENANCE & IDENTITY CONTRACTS
# ==============================================================================

class FieldSourceType(str, Enum):
    """Categorization of field derivation origin."""
    SOURCE_DERIVED = "source_derived"
    VEYA_DERIVED = "veya_derived"
    CROSS_ENRICHED = "cross_enriched"
    EDITORIAL = "editorial"


class ProviderIdentity(BaseModel):
    """Mapping from canonical internal movie to an external provider's identity."""
    model_config = ConfigDict(frozen=True)

    source: str = Field(description="Name of external provider (e.g. 'tmdb', 'imdb', 'wikidata', 'editorial_fixture')")
    external_id: str = Field(description="Identifier within external provider's namespace")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Match confidence score")
    is_primary: bool = Field(default=False, description="Whether this source is the primary origin of the record")


class ProvenanceRecord(BaseModel):
    """Audit metadata tracking the origin, retrieval time, license, and derivation of movie data."""
    model_config = ConfigDict(frozen=True)

    source: str = Field(description="Primary upstream provider name")
    source_id: Optional[str] = Field(default=None, description="External provider identifier")
    endpoint_or_product: str = Field(default="movie-details", description="Upstream endpoint or dataset queried")
    retrieved_at: datetime = Field(description="UTC timestamp of ingestion / extraction")
    license_profile: str = Field(description="Applicable license profile (e.g. 'tmdb-noncommercial-prototype')")
    raw_sha256: Optional[str] = Field(default=None, description="SHA-256 digest of original raw provider payload")
    field_sources: dict[str, str] = Field(
        default_factory=dict,
        description="Field-level mapping indicating source_derived vs veya_derived origin",
    )


# ==============================================================================
# 2. CREDITS & ARTWORK
# ==============================================================================

class CastMember(BaseModel):
    """Normalized cast member credit."""
    model_config = ConfigDict(frozen=True)

    name: str = Field(min_length=1, max_length=255)
    character: Optional[str] = Field(default=None, max_length=255)
    billing_order: Optional[int] = Field(default=None, ge=0)
    person_external_id: Optional[str] = None


class CrewMember(BaseModel):
    """Normalized crew member credit."""
    model_config = ConfigDict(frozen=True)

    name: str = Field(min_length=1, max_length=255)
    department: str = Field(default="Directing", max_length=100)
    job: str = Field(default="Director", max_length=100)
    person_external_id: Optional[str] = None


class MovieCredits(BaseModel):
    """Structured credits container for a movie."""
    director: Optional[str] = None
    directors: list[CrewMember] = Field(default_factory=list)
    cast: list[CastMember] = Field(default_factory=list)
    crew: list[CrewMember] = Field(default_factory=list)


class ArtworkReference(BaseModel):
    """References to movie visual artwork without rehosting or copyright presumption."""
    poster_path: Optional[str] = None
    backdrop_path: Optional[str] = None
    poster_url: Optional[str] = None
    backdrop_url: Optional[str] = None


class CollectionReference(BaseModel):
    """Franchise / collection metadata."""
    collection_id: Optional[str] = None
    name: Optional[str] = None
    poster_path: Optional[str] = None


# ==============================================================================
# 3. CANONICAL MOVIE DOMAIN MODEL
# ==============================================================================

class CanonicalMovie(BaseModel):
    """The canonical Veya Luma movie representation.

    All internal domain services, discovery feeds, and recommendation algorithms
    depend exclusively on this canonical contract, never on raw vendor responses.
    """
    model_config = ConfigDict(extra="forbid")

    # Primary Internal Identity
    id: UUID = Field(description="Unique internal Veya Luma movie identifier (UUIDv4/UUIDv5)")

    # Core Metadata
    title: str = Field(min_length=1, max_length=500, description="Canonical title in primary display language")
    original_title: Optional[str] = Field(default=None, max_length=500, description="Title in original release language")
    original_language: str = Field(default="en", min_length=2, max_length=10, description="ISO 639-1 code")
    spoken_languages: list[str] = Field(default_factory=list, description="List of spoken language codes or names")
    release_date: Optional[date] = Field(default=None, description="Canonical primary release date")
    release_year: Optional[int] = Field(default=None, ge=1880, le=2100, description="Release calendar year")
    runtime_minutes: Optional[int] = Field(default=None, gt=0, lt=1440, description="Duration in minutes (positive integer)")
    synopsis: Optional[str] = Field(default=None, max_length=10000, description="Narrative overview/synopsis")

    # Controlled Multi-Axis Taxonomy
    genres: list[str] = Field(default_factory=list, description="Canonical genre categories")
    themes: list[str] = Field(default_factory=list, description="Canonical theme classifications")
    moods: list[str] = Field(default_factory=list, description="Canonical mood classifications")
    styles: list[str] = Field(default_factory=list, description="Canonical stylistic descriptors")

    # Associated Entities
    credits: MovieCredits = Field(default_factory=MovieCredits)
    artwork: ArtworkReference = Field(default_factory=ArtworkReference)
    collection: Optional[CollectionReference] = None

    # Provenance & Source Identifiers
    provider_identities: list[ProviderIdentity] = Field(
        default_factory=list,
        description="External source mappings (e.g. TMDB, IMDb, Wikidata)",
    )
    provenance: Optional[ProvenanceRecord] = Field(
        default=None,
        description="Audit provenance record for this movie record",
    )
    tags: list[str] = Field(default_factory=list, description="Non-taxonomy descriptive tags where justified")

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Movie title cannot be empty or pure whitespace.")
        return stripped

    @field_validator("original_title")
    @classmethod
    def validate_original_title(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        stripped = v.strip()
        return stripped if stripped else None

    @field_validator("synopsis")
    @classmethod
    def validate_synopsis(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        stripped = v.strip()
        # Reject artificial placeholder texts
        if stripped.lower() in {"n/a", "unknown", "no synopsis available", "none"}:
            return None
        return stripped if stripped else None

    @field_validator("genres")
    @classmethod
    def validate_genres(cls, v: list[str]) -> list[str]:
        for genre in v:
            if genre not in CANONICAL_GENRES:
                raise ValueError(
                    f"Invalid canonical genre: '{genre}'. Must belong to CANONICAL_GENRES."
                )
        return v

    @field_validator("themes")
    @classmethod
    def validate_themes(cls, v: list[str]) -> list[str]:
        for theme in v:
            if theme not in CANONICAL_THEMES:
                raise ValueError(
                    f"Invalid canonical theme: '{theme}'. Must belong to CANONICAL_THEMES."
                )
        return v

    @field_validator("moods")
    @classmethod
    def validate_moods(cls, v: list[str]) -> list[str]:
        for mood in v:
            if mood not in CANONICAL_MOODS:
                raise ValueError(
                    f"Invalid canonical mood: '{mood}'. Must belong to CANONICAL_MOODS."
                )
        return v

    @model_validator(mode="after")
    def validate_release_year_consistency(self) -> "CanonicalMovie":
        if self.release_date is not None:
            expected_year = self.release_date.year
            if self.release_year is None:
                self.release_year = expected_year
            elif self.release_year != expected_year:
                raise ValueError(
                    f"release_year ({self.release_year}) does not match release_date year ({expected_year})."
                )
        return self


# ==============================================================================
# 4. EXTERNAL SOURCE MODELS (TMDB & WIKIDATA)
# ==============================================================================

class TMDBGenre(BaseModel):
    id: int
    name: str


class TMDBCastMember(BaseModel):
    id: int
    name: str
    character: Optional[str] = None
    order: Optional[int] = None


class TMDBCrewMember(BaseModel):
    id: int
    name: str
    department: Optional[str] = None
    job: Optional[str] = None


class TMDBCredits(BaseModel):
    cast: list[TMDBCastMember] = Field(default_factory=list)
    crew: list[TMDBCrewMember] = Field(default_factory=list)


class TMDBCollection(BaseModel):
    id: int
    name: str
    poster_path: Optional[str] = None
    backdrop_path: Optional[str] = None


class TMDBKeyword(BaseModel):
    id: int
    name: str


class TMDBKeywords(BaseModel):
    keywords: list[TMDBKeyword] = Field(default_factory=list)


class TMDBRawMovie(BaseModel):
    """Raw external model representing a response from the TMDB /movie/{id} endpoint."""
    model_config = ConfigDict(extra="ignore")

    id: int
    title: str
    original_title: Optional[str] = None
    overview: Optional[str] = None
    release_date: Optional[str] = None
    runtime: Optional[int] = None
    original_language: Optional[str] = "en"
    spoken_languages: list[dict[str, Any]] = Field(default_factory=list)
    genres: list[TMDBGenre] = Field(default_factory=list)
    genre_ids: list[int] = Field(default_factory=list)
    poster_path: Optional[str] = None
    backdrop_path: Optional[str] = None
    belongs_to_collection: Optional[TMDBCollection] = None
    credits: Optional[TMDBCredits] = None
    keywords: Optional[TMDBKeywords] = None
    imdb_id: Optional[str] = None
    vote_average: Optional[float] = None
    vote_count: Optional[int] = None
    popularity: Optional[float] = None


class WikidataRawMovie(BaseModel):
    """Raw external model representing an entity response from Wikidata SPARQL or entity lookup."""
    model_config = ConfigDict(extra="ignore")

    qid: str = Field(description="Wikidata Entity Q-ID, e.g. 'Q183672'")
    label: Optional[str] = None
    description: Optional[str] = None
    tmdb_id: Optional[str] = None
    imdb_id: Optional[str] = None
    directors: list[str] = Field(default_factory=list)
    cast: list[str] = Field(default_factory=list)
    publication_date: Optional[str] = None
    duration_minutes: Optional[int] = None
    original_language: Optional[str] = None
    country_of_origin: Optional[str] = None


# ==============================================================================
# 5. IDENTITY RESOLUTION & DUPLICATE MODELS
# ==============================================================================

class ResolutionAction(str, Enum):
    MATCH_EXACT = "match_exact"
    MATCH_CROSS_SOURCE = "match_cross_source"
    MATCH_CORROBORATED = "match_corroborated"
    CREATE_NEW = "create_new"
    AMBIGUOUS_CONFLICT = "ambiguous_conflict"


class IdentityResolutionResult(BaseModel):
    """Result of evaluating an incoming source record against the existing catalog identity graph."""
    action: ResolutionAction
    resolved_id: UUID
    confidence: float = Field(ge=0.0, le=1.0)
    matched_provider: Optional[str] = None
    matched_external_id: Optional[str] = None
    rationale: str

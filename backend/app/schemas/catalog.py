"""API response schemas for Veya Luma movie catalog endpoints.

Keeps API response contracts decoupled from internal SQLAlchemy ORM persistence models.
"""

from datetime import date, datetime
from typing import Generic, Optional, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MovieListItem(BaseModel):
    """Lightweight movie representation for catalog listing, shelves, and search."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(description="Canonical internal movie identifier (UUID)")
    title: str = Field(description="Display title")
    original_title: Optional[str] = Field(
        default=None, description="Original language title"
    )
    release_date: Optional[date] = Field(default=None, description="Release date")
    release_year: Optional[int] = Field(default=None, description="Release year")
    runtime_minutes: Optional[int] = Field(
        default=None, description="Duration in minutes"
    )
    original_language: str = Field(
        default="en", description="ISO 639-1 original language code"
    )
    synopsis: Optional[str] = Field(
        default=None, description="Short narrative overview"
    )
    genres: list[str] = Field(default_factory=list, description="Canonical genres")
    themes: list[str] = Field(default_factory=list, description="Canonical themes")
    moods: list[str] = Field(default_factory=list, description="Canonical moods")
    styles: list[str] = Field(default_factory=list, description="Canonical styles")
    director: Optional[str] = Field(
        default=None, description="Principal director name"
    )
    poster_path: Optional[str] = Field(
        default=None, description="Relative artwork poster path"
    )
    backdrop_path: Optional[str] = Field(
        default=None, description="Relative artwork backdrop path"
    )
    poster_url: Optional[str] = Field(
        default=None, description="Absolute artwork poster URL"
    )
    backdrop_url: Optional[str] = Field(
        default=None, description="Absolute artwork backdrop URL"
    )
    popularity: Optional[float] = Field(
        default=None, description="Upstream popularity score"
    )
    vote_average: Optional[float] = Field(
        default=None, description="Upstream vote average rating (0-10)"
    )
    vote_count: Optional[int] = Field(
        default=None, description="Upstream total vote count"
    )


class MovieArtworkPublic(BaseModel):
    """Public artwork representation."""

    model_config = ConfigDict(from_attributes=True)

    poster_path: Optional[str] = None
    backdrop_path: Optional[str] = None
    poster_url: Optional[str] = None
    backdrop_url: Optional[str] = None


class MovieCollectionPublic(BaseModel):
    """Public franchise / collection representation."""

    model_config = ConfigDict(from_attributes=True)

    collection_id: Optional[str] = None
    name: Optional[str] = None
    poster_path: Optional[str] = None


class CastMemberPublic(BaseModel):
    """Public cast credit representation."""

    model_config = ConfigDict(from_attributes=True)

    name: str
    character: Optional[str] = None
    billing_order: Optional[int] = None


class CrewMemberPublic(BaseModel):
    """Public crew credit representation."""

    model_config = ConfigDict(from_attributes=True)

    name: str
    department: str
    job: str


class MovieCreditsPublic(BaseModel):
    """Public structured credits representation."""

    model_config = ConfigDict(from_attributes=True)

    director: Optional[str] = None
    directors: list[CrewMemberPublic] = Field(default_factory=list)
    cast: list[CastMemberPublic] = Field(default_factory=list)
    crew: list[CrewMemberPublic] = Field(default_factory=list)


class MovieProvenancePublic(BaseModel):
    """Public audit provenance representation excluding internal provider secrets or hashes."""

    model_config = ConfigDict(from_attributes=True)

    source: str = Field(description="Primary upstream metadata source")
    endpoint_or_product: str = Field(description="Upstream product/endpoint queried")
    retrieved_at: datetime = Field(description="UTC timestamp of ingestion")
    license_profile: str = Field(description="Applicable license profile")


class MovieDetail(BaseModel):
    """Comprehensive public movie representation for detail view."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(description="Canonical internal movie identifier (UUID)")
    title: str = Field(description="Display title")
    original_title: Optional[str] = Field(
        default=None, description="Original language title"
    )
    release_date: Optional[date] = Field(
        default=None, description="Primary release date"
    )
    release_year: Optional[int] = Field(
        default=None, description="Release calendar year"
    )
    runtime_minutes: Optional[int] = Field(
        default=None, description="Duration in minutes"
    )
    synopsis: Optional[str] = Field(default=None, description="Narrative overview")
    original_language: str = Field(
        default="en", description="ISO 639-1 original language code"
    )
    spoken_languages: list[str] = Field(
        default_factory=list, description="Spoken languages"
    )
    genres: list[str] = Field(default_factory=list, description="Canonical genres")
    themes: list[str] = Field(default_factory=list, description="Canonical themes")
    moods: list[str] = Field(default_factory=list, description="Canonical moods")
    styles: list[str] = Field(default_factory=list, description="Canonical styles")
    artwork: MovieArtworkPublic = Field(default_factory=MovieArtworkPublic)
    collection: Optional[MovieCollectionPublic] = None
    credits: MovieCreditsPublic = Field(default_factory=MovieCreditsPublic)
    provenance: Optional[MovieProvenancePublic] = None
    tags: list[str] = Field(
        default_factory=list, description="Freeform descriptive tags"
    )
    popularity: Optional[float] = Field(
        default=None, description="Upstream popularity score"
    )
    vote_average: Optional[float] = Field(
        default=None, description="Upstream vote average rating (0-10)"
    )
    vote_count: Optional[int] = Field(
        default=None, description="Upstream total vote count"
    )


T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Standardized paginated response envelope."""

    model_config = ConfigDict(from_attributes=True)

    items: list[T] = Field(description="Page items")
    total: int = Field(
        ge=0, description="Total number of items matching filter criteria"
    )
    page: int = Field(ge=1, description="Current page number (1-indexed)")
    limit: int = Field(ge=1, le=100, description="Page size limit")
    total_pages: int = Field(ge=0, description="Total number of pages")
    has_next: bool = Field(description="Whether a subsequent page exists")
    has_prev: bool = Field(description="Whether a preceding page exists")

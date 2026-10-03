"""Schemas and statistics data models for the catalog acquisition and ingestion pipeline."""

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class IngestionConfig(BaseModel):
    """Configuration options for a bounded TMDB catalog ingestion run."""

    max_pages: int = Field(
        default=2, ge=1, le=500, description="Maximum number of TMDB pages to inspect"
    )
    max_movies: int = Field(
        default=40,
        ge=1,
        le=10000,
        description="Maximum number of movies to acquire and ingest",
    )
    sort_by: str = Field(default="popularity.desc", description="TMDB sort order")
    dry_run: bool = Field(
        default=False,
        description="If True, parse and validate without persisting to database",
    )
    include_adult: bool = Field(
        default=False, description="Whether to include adult content"
    )
    vote_count_gte: Optional[int] = Field(
        default=50, ge=0, description="Minimum vote count filter for quality"
    )


class IngestionFailure(BaseModel):
    """Details of a single movie acquisition, normalization, or persistence failure."""

    tmdb_id: Optional[str] = None
    title: Optional[str] = None
    stage: str = Field(description="'acquisition', 'normalization', or 'persistence'")
    error: str = Field(description="Error message")


class IngestionStats(BaseModel):
    """Structured report returned at the end of an ingestion execution."""

    discovered: int = Field(
        default=0, ge=0, description="Total movie records discovered from TMDB"
    )
    normalized: int = Field(
        default=0,
        ge=0,
        description="Total movie records successfully normalized into CanonicalMovie",
    )
    inserted: int = Field(
        default=0, ge=0, description="New canonical movies inserted into PostgreSQL"
    )
    updated: int = Field(
        default=0,
        ge=0,
        description="Existing canonical movies updated/merged in PostgreSQL",
    )
    skipped: int = Field(
        default=0,
        ge=0,
        description="Records skipped (e.g. invalid quality or duplicates)",
    )
    failed: int = Field(default=0, ge=0, description="Count of failed records")
    failures: list[IngestionFailure] = Field(
        default_factory=list, description="Detailed records of failed items"
    )
    elapsed_seconds: float = Field(
        default=0.0, ge=0.0, description="Wall-clock elapsed execution time in seconds"
    )
    dry_run: bool = Field(
        default=False, description="Whether execution was performed in dry-run mode"
    )
    processed_canonical_ids: list[UUID] = Field(
        default_factory=list, description="Canonical UUIDs of ingested movies"
    )

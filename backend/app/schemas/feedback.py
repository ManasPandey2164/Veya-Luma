"""Pydantic schemas for feedback, telemetry events, and ratings."""

from datetime import datetime
from typing import Any, Dict, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MovieRateRequest(BaseModel):
    """Payload to record an explicit movie rating."""

    movie_id: UUID = Field(description="Canonical movie UUID")
    rating: float = Field(
        ...,
        ge=1.0,
        le=10.0,
        description="Rating score bounded between 1.0 and 10.0",
    )


class MovieRatingResponse(BaseModel):
    """Authoritative current rating response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    movie_id: UUID
    rating: float
    created_at: datetime
    updated_at: datetime


class PaginatedRatingsResponse(BaseModel):
    """Paginated list of user ratings."""

    items: list[MovieRatingResponse]
    total: int
    page: int
    limit: int
    total_pages: int


class MovieEventRequest(BaseModel):
    """Payload to record a behavioral telemetry signal."""

    movie_id: UUID = Field(description="Canonical movie UUID")
    event_type: Literal["impression", "detail_view", "click"] = Field(
        ...,
        description="Behavioral signal type: impression, detail_view, click",
    )
    event_value: Optional[float] = Field(
        default=None,
        description="Optional quantitative signal value",
    )
    source: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Contextual surface (e.g. 'discover_hero', 'search_results')",
    )
    event_metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Bounded metadata dictionary for contextual tracking",
    )


class MovieEventResponse(BaseModel):
    """Response confirming event telemetry recording."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    movie_id: UUID
    event_type: str
    event_value: Optional[float]
    created_at: datetime
    status: str = "recorded"

"""Pydantic schemas for user taxonomy preferences and affinities."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TaxonomyNodeSummary(BaseModel):
    """Canonical taxonomy node summary."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    key: str
    label: str
    axis: str


class UserPreferenceUpsertRequest(BaseModel):
    """Payload to create or update preference affinity for a taxonomy node."""

    preference_value: float = Field(
        default=1.0,
        ge=-1.0,
        le=1.0,
        description="Affinity bounded between -1.0 (aversion) and 1.0 (strong affinity)",
    )
    source: str = Field(
        default="explicit",
        max_length=50,
        description="Preference origin: 'explicit', 'taste_discovery', 'derived'",
    )


class UserPreferenceResponse(BaseModel):
    """User preference response with resolved taxonomy node."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    taxonomy_node_id: int
    preference_value: float
    source: str
    created_at: datetime
    updated_at: datetime
    taxonomy_node: TaxonomyNodeSummary


class UserPreferenceListResponse(BaseModel):
    """Collection of user preferences."""

    items: list[UserPreferenceResponse]
    total: int

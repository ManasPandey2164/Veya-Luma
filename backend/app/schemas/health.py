from datetime import datetime

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check response schema."""

    status: str = Field(
        ..., description="Overall service status: 'healthy' or 'degraded'"
    )
    environment: str = Field(..., description="Current running environment")
    version: str = Field(..., description="Application version")
    database: str = Field(
        ..., description="Database connectivity status: 'connected' or 'disconnected'"
    )
    timestamp: datetime = Field(..., description="Current UTC timestamp")

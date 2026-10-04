"""FastAPI route handler for Veya Luma Recommendation Foundation (Step 18).

Provides GET /api/v1/recommendations returning personalized candidate pools and
structured explainability for authenticated users and active guest sessions.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ActorIdentity, get_actor_identity
from app.db.session import get_async_session
from app.recommendation.models import RecommendationResponse
from app.recommendation.service import RecommendationService

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.get(
    "",
    response_model=RecommendationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get personalized movie recommendations",
    description=(
        "Retrieves deterministic, taste-grounded candidate recommendations across multiple "
        "retrieval channels (Content, Preference, Behavior, Discovery, and Cold Start). "
        "Authenticates caller via Bearer JWT or active guest X-Session-ID, enforces seen-content "
        "suppression, computes CandidateFeatureContracts, and attaches structured explainability."
    ),
)
async def get_recommendations(
    limit: int = Query(
        default=20,
        ge=1,
        le=100,
        description="Maximum number of recommendations to return",
    ),
    channel: Optional[str] = Query(
        default=None,
        description="Optional filter by retrieval channel (CONTENT_MATCH, PREFERENCE_MATCH, BEHAVIOR_MATCH, DISCOVERY, COLD_START)",
    ),
    actor: ActorIdentity = Depends(get_actor_identity),
    db: AsyncSession = Depends(get_async_session),
) -> RecommendationResponse:
    """Delivers personalized recommendation candidates to authenticated users and guests."""
    service = RecommendationService(db)
    return await service.get_recommendations(
        actor=actor,
        limit=limit,
        channel=channel,
    )

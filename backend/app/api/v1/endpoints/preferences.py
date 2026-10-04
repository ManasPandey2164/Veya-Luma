"""FastAPI route handlers for explicit user taxonomy preferences."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ActorIdentity, get_actor_identity
from app.db.session import get_async_session
from app.schemas.preference import (
    TaxonomyNodeSummary,
    UserPreferenceListResponse,
    UserPreferenceResponse,
    UserPreferenceUpsertRequest,
)
from app.services.preference_service import PreferenceService

router = APIRouter(prefix="/preferences", tags=["Preferences"])


@router.get(
    "/nodes",
    response_model=list[TaxonomyNodeSummary],
    status_code=status.HTTP_200_OK,
    summary="List canonical taxonomy nodes",
    description="Returns all active canonical taxonomy nodes across genre, theme, mood, and style axes.",
)
async def list_taxonomy_nodes(
    db: AsyncSession = Depends(get_async_session),
) -> list[TaxonomyNodeSummary]:
    """Lists canonical taxonomy nodes for preferences and onboarding."""
    service = PreferenceService(db)
    return await service.get_taxonomy_nodes()


@router.get(
    "",
    response_model=UserPreferenceListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get user explicit preferences",
    description="Returns all taxonomy affinities explicitly configured or derived for the authenticated user or guest session.",
)
async def get_preferences(
    actor: ActorIdentity = Depends(get_actor_identity),
    db: AsyncSession = Depends(get_async_session),
) -> UserPreferenceListResponse:
    """Lists explicit taxonomy preferences for the current user or guest."""
    service = PreferenceService(db)
    return await service.get_preferences(
        user_id=actor.user_id,
        session_id=actor.session_id,
    )


@router.put(
    "/{taxonomy_node_id}",
    response_model=UserPreferenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Set or update preference for a taxonomy node",
    description=(
        "Upserts an affinity value for a canonical taxonomy node (genre, theme, mood, style). "
        "Enforces node existence, supported axis, and bounded affinity value [-1.0, 1.0]."
    ),
)
async def upsert_preference(
    taxonomy_node_id: int,
    payload: UserPreferenceUpsertRequest,
    actor: ActorIdentity = Depends(get_actor_identity),
    db: AsyncSession = Depends(get_async_session),
) -> UserPreferenceResponse:
    """Upserts a preference for a taxonomy node for user or guest."""
    service = PreferenceService(db)
    return await service.upsert_preference(
        taxonomy_node_id=taxonomy_node_id,
        payload=payload,
        user_id=actor.user_id,
        session_id=actor.session_id,
    )


@router.delete(
    "/{taxonomy_node_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete preference for a taxonomy node",
    description="Safely removes an explicit taxonomy preference for the authenticated user or guest session.",
)
async def delete_preference(
    taxonomy_node_id: int,
    actor: ActorIdentity = Depends(get_actor_identity),
    db: AsyncSession = Depends(get_async_session),
) -> dict[str, str]:
    """Deletes an explicit taxonomy preference."""
    service = PreferenceService(db)
    deleted = await service.delete_preference(
        taxonomy_node_id=taxonomy_node_id,
        user_id=actor.user_id,
        session_id=actor.session_id,
    )
    return {
        "status": "ok",
        "message": "Preference removed" if deleted else "Preference not found",
    }

"""FastAPI route handlers for explicit user taxonomy preferences."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_async_session
from app.models.user import User
from app.schemas.preference import (
    UserPreferenceListResponse,
    UserPreferenceResponse,
    UserPreferenceUpsertRequest,
)
from app.services.preference_service import PreferenceService

router = APIRouter(prefix="/preferences", tags=["Preferences"])


@router.get(
    "",
    response_model=UserPreferenceListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get user explicit preferences",
    description="Returns all taxonomy affinities explicitly configured or derived for the authenticated user.",
)
async def get_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> UserPreferenceListResponse:
    """Lists explicit taxonomy preferences for the current user."""
    service = PreferenceService(db)
    return await service.get_user_preferences(user_id=current_user.id)


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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> UserPreferenceResponse:
    """Upserts a preference for a taxonomy node."""
    service = PreferenceService(db)
    return await service.upsert_preference(
        user_id=current_user.id,
        taxonomy_node_id=taxonomy_node_id,
        payload=payload,
    )


@router.delete(
    "/{taxonomy_node_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete preference for a taxonomy node",
    description="Safely removes an explicit taxonomy preference for the authenticated user.",
)
async def delete_preference(
    taxonomy_node_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> dict[str, str]:
    """Deletes an explicit taxonomy preference."""
    service = PreferenceService(db)
    deleted = await service.delete_preference(
        user_id=current_user.id, taxonomy_node_id=taxonomy_node_id
    )
    return {
        "status": "ok",
        "message": "Preference removed" if deleted else "Preference not found",
    }

"""Service layer for user explicit taxonomy preferences."""

from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.movie import TaxonomyNode
from app.repositories.user_preference import UserPreferenceRepository
from app.schemas.preference import (
    TaxonomyNodeSummary,
    UserPreferenceListResponse,
    UserPreferenceResponse,
    UserPreferenceUpsertRequest,
)


class PreferenceService:
    """Orchestrates validation and persistence of user taxonomy preferences."""

    SUPPORTED_TAXONOMY_AXES = {"genre", "theme", "mood", "style"}

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.pref_repo = UserPreferenceRepository(db)

    async def _verify_taxonomy_node(self, node_id: int) -> TaxonomyNode:
        """Verifies taxonomy node exists and belongs to a supported axis."""
        node = await self.pref_repo.get_taxonomy_node_by_id(node_id)
        if not node:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Taxonomy node not found for identifier: {node_id}",
            )
        if node.axis not in self.SUPPORTED_TAXONOMY_AXES:
            raise HTTPException(
                status_code=getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422),
                detail=f"Taxonomy category '{node.axis}' is not supported for preferences. Must be one of: {', '.join(sorted(self.SUPPORTED_TAXONOMY_AXES))}",
            )
        return node

    async def get_taxonomy_nodes(self) -> List[TaxonomyNodeSummary]:
        """Loads all active canonical taxonomy nodes for preferences/onboarding."""
        nodes = await self.pref_repo.get_all_taxonomy_nodes()
        return [
            TaxonomyNodeSummary(
                id=n.id,
                key=n.key,
                label=n.label,
                axis=n.axis,
            )
            for n in nodes
        ]

    async def get_preferences(
        self,
        user_id: Optional[UUID] = None,
        session_id: Optional[UUID] = None,
    ) -> UserPreferenceListResponse:
        """Loads all explicit taxonomy preferences for an authenticated user or guest session."""
        records = await self.pref_repo.get_user_preferences(
            user_id=user_id, session_id=session_id
        )
        items: List[UserPreferenceResponse] = []
        for r in records:
            items.append(
                UserPreferenceResponse(
                    id=r.id,
                    taxonomy_node_id=r.taxonomy_node_id,
                    preference_value=r.preference_value,
                    source=r.source,
                    created_at=r.created_at,
                    updated_at=r.updated_at,
                    taxonomy_node=TaxonomyNodeSummary(
                        id=r.taxonomy_node.id,
                        key=r.taxonomy_node.key,
                        label=r.taxonomy_node.label,
                        axis=r.taxonomy_node.axis,
                    ),
                )
            )
        return UserPreferenceListResponse(items=items, total=len(items))

    async def get_user_preferences(self, user_id: UUID) -> UserPreferenceListResponse:
        """Backward-compatible wrapper for authenticated user preference loading."""
        return await self.get_preferences(user_id=user_id)

    async def upsert_preference(
        self,
        taxonomy_node_id: int,
        payload: UserPreferenceUpsertRequest,
        user_id: Optional[UUID] = None,
        session_id: Optional[UUID] = None,
    ) -> UserPreferenceResponse:
        """Upserts a taxonomy preference for an authenticated user or guest session."""
        node = await self._verify_taxonomy_node(taxonomy_node_id)

        if payload.preference_value < -1.0 or payload.preference_value > 1.0:
            raise HTTPException(
                status_code=getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422),
                detail="Preference value must be bounded between -1.0 and 1.0.",
            )

        pref = await self.pref_repo.upsert_user_preference(
            taxonomy_node_id=taxonomy_node_id,
            user_id=user_id,
            session_id=session_id,
            preference_value=payload.preference_value,
            source=payload.source,
        )

        await self.db.commit()
        return UserPreferenceResponse(
            id=pref.id,
            taxonomy_node_id=pref.taxonomy_node_id,
            preference_value=pref.preference_value,
            source=pref.source,
            created_at=pref.created_at,
            updated_at=pref.updated_at,
            taxonomy_node=TaxonomyNodeSummary(
                id=node.id,
                key=node.key,
                label=node.label,
                axis=node.axis,
            ),
        )

    async def delete_preference(
        self,
        taxonomy_node_id: int,
        user_id: Optional[UUID] = None,
        session_id: Optional[UUID] = None,
    ) -> bool:
        """Deletes a taxonomy preference safely."""
        deleted = await self.pref_repo.delete_user_preference(
            taxonomy_node_id=taxonomy_node_id,
            user_id=user_id,
            session_id=session_id,
        )
        if deleted:
            await self.db.commit()
        return deleted

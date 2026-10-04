"""SQLAlchemy repository for UserPreference persistence operations."""

from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.movie import TaxonomyNode
from app.models.preference import UserPreference


class UserPreferenceRepository:
    """Repository handling explicit taxonomy preferences and affinities."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_taxonomy_node_by_id(self, node_id: int) -> Optional[TaxonomyNode]:
        """Loads a canonical taxonomy node by its primary key ID."""
        stmt = select(TaxonomyNode).where(TaxonomyNode.id == node_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_all_taxonomy_nodes(self) -> Sequence[TaxonomyNode]:
        """Loads all active canonical taxonomy nodes ordered by id."""
        stmt = (
            select(TaxonomyNode)
            .where(TaxonomyNode.is_active.is_(True))
            .order_by(TaxonomyNode.id.asc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_preference(
        self,
        taxonomy_node_id: int,
        user_id: Optional[UUID] = None,
        session_id: Optional[UUID] = None,
    ) -> Optional[UserPreference]:
        """Loads a specific taxonomy preference for an authenticated user or guest session."""
        stmt = (
            select(UserPreference)
            .options(selectinload(UserPreference.taxonomy_node))
            .where(UserPreference.taxonomy_node_id == taxonomy_node_id)
        )
        if user_id is not None:
            stmt = stmt.where(UserPreference.user_id == user_id)
        elif session_id is not None:
            stmt = stmt.where(UserPreference.session_id == session_id)
        else:
            return None
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_user_preferences(
        self,
        user_id: Optional[UUID] = None,
        session_id: Optional[UUID] = None,
    ) -> Sequence[UserPreference]:
        """Loads all explicit taxonomy preferences for an authenticated user or guest session."""
        stmt = (
            select(UserPreference)
            .options(selectinload(UserPreference.taxonomy_node))
        )
        if user_id is not None:
            stmt = stmt.where(UserPreference.user_id == user_id)
        elif session_id is not None:
            stmt = stmt.where(UserPreference.session_id == session_id)
        else:
            return []
        stmt = stmt.order_by(UserPreference.created_at.asc(), UserPreference.id.asc())
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def upsert_user_preference(
        self,
        taxonomy_node_id: int,
        user_id: Optional[UUID] = None,
        session_id: Optional[UUID] = None,
        preference_value: float = 1.0,
        source: str = "explicit",
    ) -> UserPreference:
        """Upserts an affinity preference for a taxonomy node for user or guest."""
        existing = await self.get_preference(
            taxonomy_node_id=taxonomy_node_id,
            user_id=user_id,
            session_id=session_id,
        )
        if existing:
            existing.preference_value = preference_value
            existing.source = source
            self.db.add(existing)
            await self.db.flush()
            await self.db.refresh(existing)
            return existing

        new_pref = UserPreference(
            user_id=user_id,
            session_id=session_id,
            taxonomy_node_id=taxonomy_node_id,
            preference_value=preference_value,
            source=source,
        )
        self.db.add(new_pref)
        await self.db.flush()
        # Eagerly load taxonomy_node
        await self.db.refresh(new_pref, attribute_names=["taxonomy_node"])
        return new_pref

    async def delete_user_preference(
        self,
        taxonomy_node_id: int,
        user_id: Optional[UUID] = None,
        session_id: Optional[UUID] = None,
    ) -> bool:
        """Deletes a taxonomy preference safely."""
        existing = await self.get_preference(
            taxonomy_node_id=taxonomy_node_id,
            user_id=user_id,
            session_id=session_id,
        )
        if existing:
            await self.db.delete(existing)
            await self.db.flush()
            return True
        return False

    async def reconcile_preferences_for_session(
        self,
        guest_session_id: UUID,
        user_id: UUID,
    ) -> int:
        """Transfers guest preferences to the authenticated user account without duplicate conflicts."""
        stmt = select(UserPreference).where(
            UserPreference.session_id == guest_session_id,
            UserPreference.user_id.is_(None),
        )
        result = await self.db.execute(stmt)
        guest_prefs = result.scalars().all()

        reconciled = 0
        for pref in guest_prefs:
            existing = await self.get_preference(
                user_id=user_id, taxonomy_node_id=pref.taxonomy_node_id
            )
            if existing is None:
                pref.user_id = user_id
                pref.session_id = None
                self.db.add(pref)
                reconciled += 1
            else:
                # Merge: delete duplicate guest preference record
                await self.db.delete(pref)

        await self.db.flush()
        return reconciled

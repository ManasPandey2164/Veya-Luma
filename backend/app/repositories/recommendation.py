"""Repository for recommendation catalog feature loading and user signal retrieval.

Fetches catalog metadata efficiently using bounded bulk queries without incurring N+1 queries
or loading 200,000+ unnecessary credit records.
"""

from collections import defaultdict
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.movie import Movie, MovieCredit, MovieTag, TaxonomyNode
from app.models.preference import (
    Favourite,
    MovieRating,
    UserMovieEvent,
    UserPreference,
    Watchlist,
)
from app.recommendation.features import MovieFeatures, extract_movie_features_from_orm


class RecommendationRepository:
    """Read-oriented repository providing fast, bounded data loading for recommendation pipelines."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_catalog_features(self) -> Dict[UUID, MovieFeatures]:
        """Loads canonical catalog features efficiently for all catalog movies.

        Executes 3 targeted bulk queries:
        1. Base movies + artwork
        2. Asserted taxonomy tags + node labels/axes
        3. Director credits
        """
        # 1. Load movies with artwork
        movie_stmt = select(Movie).options(selectinload(Movie.artwork))
        movie_res = await self.db.execute(movie_stmt)
        movies = movie_res.scalars().all()

        # 2. Load all asserted taxonomy tags joined with TaxonomyNode
        tag_stmt = (
            select(
                MovieTag.movie_id,
                MovieTag.strength,
                TaxonomyNode.axis,
                TaxonomyNode.key,
                TaxonomyNode.label,
            )
            .join(TaxonomyNode, MovieTag.node_id == TaxonomyNode.id)
            .where(MovieTag.assertion == "present")
        )
        tag_res = await self.db.execute(tag_stmt)
        tags_by_movie: Dict[UUID, List[Dict[str, Any]]] = defaultdict(list)
        for row in tag_res.fetchall():
            m_id, strength, axis, key, label = row
            tags_by_movie[m_id].append(
                {
                    "strength": strength,
                    "axis": axis,
                    "key": key,
                    "label": label,
                }
            )

        # 3. Load director credits
        credit_stmt = select(MovieCredit.movie_id, MovieCredit.name).where(
            MovieCredit.job == "Director"
        )
        credit_res = await self.db.execute(credit_stmt)
        directors_by_movie: Dict[UUID, List[str]] = defaultdict(list)
        for credit_row in credit_res.fetchall():
            c_mid, d_name = credit_row
            if d_name:
                directors_by_movie[c_mid].append(d_name)

        # 4. Assemble MovieFeatures
        features_map: Dict[UUID, MovieFeatures] = {}
        for m in movies:
            feat = extract_movie_features_from_orm(
                movie=m,
                directors=directors_by_movie.get(m.id, []),
                top_cast=[],
                tags_data=tags_by_movie.get(m.id, []),
            )
            features_map[m.id] = feat

        return features_map

    async def get_user_ratings(self, user_id: UUID) -> List[MovieRating]:
        """Loads all ratings authored by the authenticated user."""
        stmt = select(MovieRating).where(MovieRating.user_id == user_id)
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_favourites(
        self,
        user_id: Optional[UUID] = None,
        session_id: Optional[UUID] = None,
    ) -> List[Favourite]:
        """Loads favourites for a user or guest session."""
        stmt = select(Favourite)
        if user_id is not None:
            stmt = stmt.where(Favourite.user_id == user_id)
        elif session_id is not None:
            stmt = stmt.where(Favourite.session_id == session_id)
        else:
            return []
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_watchlist(
        self,
        user_id: Optional[UUID] = None,
        session_id: Optional[UUID] = None,
    ) -> List[Watchlist]:
        """Loads watchlist items for a user or guest session."""
        stmt = select(Watchlist)
        if user_id is not None:
            stmt = stmt.where(Watchlist.user_id == user_id)
        elif session_id is not None:
            stmt = stmt.where(Watchlist.session_id == session_id)
        else:
            return []
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_preferences(
        self,
        user_id: Optional[UUID] = None,
        session_id: Optional[UUID] = None,
    ) -> List[UserPreference]:
        """Loads explicit taxonomy preferences for a user or guest session."""
        stmt = select(UserPreference).options(
            selectinload(UserPreference.taxonomy_node)
        )
        if user_id is not None:
            stmt = stmt.where(UserPreference.user_id == user_id)
        elif session_id is not None:
            stmt = stmt.where(UserPreference.session_id == session_id)
        else:
            return []
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_events(
        self,
        user_id: Optional[UUID] = None,
        session_id: Optional[UUID] = None,
        limit: int = 100,
    ) -> List[UserMovieEvent]:
        """Loads recent behavioral events for a user or guest session."""
        stmt = select(UserMovieEvent)
        if user_id is not None:
            stmt = stmt.where(UserMovieEvent.user_id == user_id)
        elif session_id is not None:
            stmt = stmt.where(UserMovieEvent.session_id == session_id)
        else:
            return []
        stmt = stmt.order_by(
            UserMovieEvent.created_at.desc(), UserMovieEvent.id.asc()
        ).limit(limit)
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

"""SQLAlchemy 2.0 ORM models for Veya Luma Phase 3 Step 17:
User Preferences, Taste Signals, Movie Events, Ratings, Watchlist, and Favourites.

Provides append-oriented telemetry storage for behavioral signals (impressions, detail views,
clicks, ratings), canonical current-state rating projections, explicit taxonomy preferences,
and normalized watchlist and favourite libraries with full guest-reconciliation support.
"""

import uuid
from typing import TYPE_CHECKING, Any, Dict, Optional

from sqlalchemy import (
    JSON,
    BigInteger,
    CheckConstraint,
    Float,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.movie import Movie, TaxonomyNode
    from app.models.user import User, UserSession


class UserMovieEvent(Base):
    """Append-oriented behavioral event telemetry table.

    Records user/guest interaction signals (impression, detail_view, click, rating)
    pointing to canonical internal movie UUIDs. Never overwrites historical events.
    Supports anonymous guest sessions with clean post-registration reconciliation.
    """

    __tablename__ = "user_movie_event"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("app_user.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="Associated authenticated user ID, or NULL for anonymous guest interactions",
    )
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("user_session.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Associated user or guest session ID from Step 16",
    )
    movie_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("movie.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Target canonical movie identity",
    )
    event_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="Behavioral signal type: 'impression', 'detail_view', 'click', 'rating'",
    )
    event_value: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        comment="Quantitative signal payload where applicable (e.g. numeric rating, dwell time)",
    )
    source: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="Telemetry context/surface (e.g. 'discover_hero', 'search_result', 'movie_detail')",
    )
    event_metadata: Mapped[Dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
        default=dict,
        comment="Bounded metadata payload for event context",
    )

    __table_args__ = (
        CheckConstraint(
            "user_id IS NOT NULL OR session_id IS NOT NULL",
            name="chk_user_movie_event_actor",
        ),
        CheckConstraint(
            "event_type IN ('impression', 'detail_view', 'click', 'rating')",
            name="chk_user_movie_event_type",
        ),
        Index("idx_ume_user_created", "user_id", "created_at"),
        Index("idx_ume_movie_created", "movie_id", "created_at"),
        Index("idx_ume_user_event_created", "user_id", "event_type", "created_at"),
        Index("idx_ume_user_movie", "user_id", "movie_id"),
        Index("idx_ume_session_created", "session_id", "created_at"),
    )

    # Relationships
    user: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[user_id],
    )
    session: Mapped[Optional["UserSession"]] = relationship(
        "UserSession",
        foreign_keys=[session_id],
    )
    movie: Mapped["Movie"] = relationship(
        "Movie",
        foreign_keys=[movie_id],
    )

    def __repr__(self) -> str:
        return f"<UserMovieEvent id={self.id} user={self.user_id} movie={self.movie_id} type={self.event_type}>"


class MovieRating(Base):
    """Normalized current rating projection for canonical movies.

    Maintains one authoritative current rating per (user, movie) pair, while
    historical rating event mutations are preserved immutably in user_movie_event.
    """

    __tablename__ = "movie_rating"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("app_user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Rating author (authenticated user)",
    )
    movie_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("movie.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Target canonical movie identity",
    )
    rating: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        comment="Quantitative evaluation bounded between 1.0 and 10.0",
    )

    __table_args__ = (
        UniqueConstraint("user_id", "movie_id", name="uq_movie_rating_user_movie"),
        CheckConstraint(
            "rating >= 1.0 AND rating <= 10.0",
            name="chk_movie_rating_bounds",
        ),
        Index("idx_movie_rating_movie_rating", "movie_id", "rating"),
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[user_id],
    )
    movie: Mapped["Movie"] = relationship(
        "Movie",
        foreign_keys=[movie_id],
    )

    def __repr__(self) -> str:
        return f"<MovieRating user={self.user_id} movie={self.movie_id} rating={self.rating}>"


class UserPreference(Base):
    """Explicit or derived affinity toward canonical taxonomy nodes.

    Connects a user/session to a taxonomy node (genre, theme, mood, style) with
    a bounded affinity score. Supports guest sessions and post-login reconciliation.
    """

    __tablename__ = "user_preference"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("app_user.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="Associated user ID, or NULL for anonymous guest discovery",
    )
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("user_session.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="Associated session ID from Step 16",
    )
    taxonomy_node_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("taxonomy_node.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Referenced canonical taxonomy node",
    )
    preference_value: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=1.0,
        comment="Affinity weight bounded between -1.0 (aversion) and 1.0 (strong affinity)",
    )
    source: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="explicit",
        comment="Origin: 'explicit', 'taste_discovery', 'derived'",
    )

    __table_args__ = (
        CheckConstraint(
            "user_id IS NOT NULL OR session_id IS NOT NULL",
            name="chk_user_pref_owner",
        ),
        CheckConstraint(
            "preference_value >= -1.0 AND preference_value <= 1.0",
            name="chk_user_pref_bounds",
        ),
        Index(
            "uq_user_preference_user_taxonomy",
            "user_id",
            "taxonomy_node_id",
            unique=True,
            postgresql_where=user_id.isnot(None),
        ),
        Index(
            "uq_user_preference_session_taxonomy",
            "session_id",
            "taxonomy_node_id",
            unique=True,
            postgresql_where=session_id.isnot(None),
        ),
        Index("idx_user_pref_node_user", "taxonomy_node_id", "user_id"),
    )

    # Relationships
    user: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[user_id],
    )
    session: Mapped[Optional["UserSession"]] = relationship(
        "UserSession",
        foreign_keys=[session_id],
    )
    taxonomy_node: Mapped["TaxonomyNode"] = relationship(
        "TaxonomyNode",
        foreign_keys=[taxonomy_node_id],
    )

    def __repr__(self) -> str:
        return f"<UserPreference user={self.user_id} node={self.taxonomy_node_id} value={self.preference_value}>"


class Watchlist(Base):
    """Normalized persistent watchlist storage.

    Stores canonical movies bookmarked for future viewing without duplicating movie metadata.
    Enforces idempotent add behavior and unique (user_id, movie_id).
    Supports guest sessions and post-login reconciliation.
    """

    __tablename__ = "watchlist"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("app_user.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="Owner authenticated user ID, or NULL for guest session",
    )
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("user_session.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="Owner guest session ID",
    )
    movie_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("movie.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Canonical movie identity",
    )

    __table_args__ = (
        CheckConstraint(
            "user_id IS NOT NULL OR session_id IS NOT NULL",
            name="chk_watchlist_owner",
        ),
        Index(
            "uq_watchlist_user_movie",
            "user_id",
            "movie_id",
            unique=True,
            postgresql_where=user_id.isnot(None),
        ),
        Index(
            "uq_watchlist_session_movie",
            "session_id",
            "movie_id",
            unique=True,
            postgresql_where=session_id.isnot(None),
        ),
        Index("idx_watchlist_user_created", "user_id", "created_at"),
        Index("idx_watchlist_session_created", "session_id", "created_at"),
    )

    # Relationships
    user: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[user_id],
    )
    session: Mapped[Optional["UserSession"]] = relationship(
        "UserSession",
        foreign_keys=[session_id],
    )
    movie: Mapped["Movie"] = relationship(
        "Movie",
        foreign_keys=[movie_id],
    )

    def __repr__(self) -> str:
        return f"<Watchlist user={self.user_id} movie={self.movie_id}>"


class Favourite(Base):
    """Normalized persistent favourites collection.

    Stores canonical movies curated as personal favourites separate from watchlist.
    A movie may exist in both watchlist and favourites. Enforces idempotent creation.
    Supports guest sessions and post-login reconciliation.
    """

    __tablename__ = "favourite"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("app_user.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="Owner authenticated user ID, or NULL for guest session",
    )
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("user_session.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="Owner guest session ID",
    )
    movie_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("movie.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Canonical movie identity",
    )

    __table_args__ = (
        CheckConstraint(
            "user_id IS NOT NULL OR session_id IS NOT NULL",
            name="chk_favourite_owner",
        ),
        Index(
            "uq_favourite_user_movie",
            "user_id",
            "movie_id",
            unique=True,
            postgresql_where=user_id.isnot(None),
        ),
        Index(
            "uq_favourite_session_movie",
            "session_id",
            "movie_id",
            unique=True,
            postgresql_where=session_id.isnot(None),
        ),
        Index("idx_favourite_user_created", "user_id", "created_at"),
        Index("idx_favourite_session_created", "session_id", "created_at"),
    )

    # Relationships
    user: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[user_id],
    )
    session: Mapped[Optional["UserSession"]] = relationship(
        "UserSession",
        foreign_keys=[session_id],
    )
    movie: Mapped["Movie"] = relationship(
        "Movie",
        foreign_keys=[movie_id],
    )

    def __repr__(self) -> str:
        return f"<Favourite user={self.user_id} movie={self.movie_id}>"

"""SQLAlchemy 2.0 ORM persistence models for Veya Luma canonical movie catalog.

Establishes normalized relational persistence decoupled from upstream vendor payloads,
preserving internal UUID identities, multi-provider identity mapping, canonical taxonomy,
structured credits, artwork references, franchise relations, and audit provenance.
"""

import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MovieCollection(Base):
    """Normalized franchise or collection entity (e.g. 'Dune Collection')."""

    __tablename__ = "movie_collection"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    external_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        comment="Provider collection ID (e.g. TMDB collection ID)",
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    poster_path: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )

    # Relationships
    movies: Mapped[list["Movie"]] = relationship(
        back_populates="collection",
    )


class Movie(Base):
    """Canonical movie entity for Veya Luma.

    Represents the internal core domain entity identified by a synthetic UUIDv4/UUIDv5.
    Never relies on external vendor IDs or title/year as primary keys.
    """

    __tablename__ = "movie"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        index=True,
    )
    original_title: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    original_language: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="en",
        index=True,
    )
    spoken_languages: Mapped[list[str]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
        default=list,
    )
    release_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
        index=True,
    )
    release_year: Mapped[Optional[int]] = mapped_column(
        SmallInteger,
        nullable=True,
        index=True,
    )
    runtime_minutes: Mapped[Optional[int]] = mapped_column(
        SmallInteger,
        nullable=True,
    )
    synopsis: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    tags: Mapped[list[str]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
        default=list,
        comment="Freeform / non-taxonomy tags where justified",
    )

    # Quantitative popularity and quality metrics (TMDB-persisted)
    popularity: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        index=True,
        comment="Upstream popularity metric supporting decimal values",
    )
    vote_average: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        index=True,
        comment="Upstream vote average rating supporting decimal values (0.0 - 10.0)",
    )
    vote_count: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        index=True,
        comment="Upstream vote count supporting integer values",
    )

    # Collection / Franchise link (nullable)
    collection_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("movie_collection.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Invariants
    __table_args__ = (
        CheckConstraint(
            "runtime_minutes IS NULL OR runtime_minutes > 0",
            name="chk_movie_runtime_positive",
        ),
        CheckConstraint(
            "release_year IS NULL OR (release_year >= 1880 AND release_year <= 2100)",
            name="chk_movie_release_year_range",
        ),
        CheckConstraint(
            "length(original_language) >= 2",
            name="chk_movie_language_length",
        ),
        CheckConstraint(
            "popularity IS NULL OR popularity >= 0.0",
            name="chk_movie_popularity_nonnegative",
        ),
        CheckConstraint(
            "vote_average IS NULL OR (vote_average >= 0.0 AND vote_average <= 10.0)",
            name="chk_movie_vote_average_range",
        ),
        CheckConstraint(
            "vote_count IS NULL OR vote_count >= 0",
            name="chk_movie_vote_count_nonnegative",
        ),
    )

    # Explicit Relationships
    collection: Mapped[Optional["MovieCollection"]] = relationship(
        back_populates="movies",
    )
    provider_identities: Mapped[list["SourceIdentity"]] = relationship(
        back_populates="movie",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    artwork: Mapped[Optional["MovieArtwork"]] = relationship(
        back_populates="movie",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    provenance: Mapped[Optional["MovieProvenance"]] = relationship(
        back_populates="movie",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    credits: Mapped[list["MovieCredit"]] = relationship(
        back_populates="movie",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    taxonomy_tags: Mapped[list["MovieTag"]] = relationship(
        back_populates="movie",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class SourceIdentity(Base):
    """External provider identity mapping for canonical movies.

    Supports multiple provider identities per movie (e.g. TMDB, IMDb, Wikidata)
    while enforcing provider + external_id uniqueness to prevent duplicate mappings.
    """

    __tablename__ = "source_identity"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )
    movie_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("movie.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="Provider name (e.g. tmdb, imdb, wikidata)",
    )
    external_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Provider-scoped external ID",
    )
    confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=1.0,
    )
    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "source",
            "external_id",
            name="uq_source_identity_source_external_id",
        ),
        Index(
            "idx_source_identity_movie_source",
            "movie_id",
            "source",
        ),
    )

    # Relationships
    movie: Mapped["Movie"] = relationship(
        back_populates="provider_identities",
    )


class MovieArtwork(Base):
    """Artwork references associated with a canonical movie.

    Stores path and URL references without rehosting image binaries or creating CDNs.
    """

    __tablename__ = "movie_artwork"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )
    movie_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("movie.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    poster_path: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    backdrop_path: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    poster_url: Mapped[Optional[str]] = mapped_column(
        String(1000),
        nullable=True,
    )
    backdrop_url: Mapped[Optional[str]] = mapped_column(
        String(1000),
        nullable=True,
    )

    # Relationships
    movie: Mapped["Movie"] = relationship(
        back_populates="artwork",
    )


class MovieProvenance(Base):
    """Audit provenance record preserving ingestion origin, payload hash, licensing,
    and field-level derivation tracking.
    """

    __tablename__ = "movie_provenance"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )
    movie_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("movie.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    source: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    source_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    endpoint_or_product: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="movie-details",
    )
    retrieved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    license_profile: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    raw_sha256: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
    )
    field_sources: Mapped[dict[str, str]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
        default=dict,
        comment="Field-level origin tracking (source_derived vs veya_derived)",
    )

    # Relationships
    movie: Mapped["Movie"] = relationship(
        back_populates="provenance",
    )


class MovieCredit(Base):
    """Normalized cast and crew credit for a movie."""

    __tablename__ = "movie_credit"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )
    movie_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("movie.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    credit_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="'cast' or 'crew'",
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    role_or_character: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    department: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    job: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )
    billing_order: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    person_external_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    __table_args__ = (
        Index("idx_movie_credit_movie_type", "movie_id", "credit_type"),
        Index("idx_movie_credit_lookup", "movie_id", "job"),
    )

    # Relationships
    movie: Mapped["Movie"] = relationship(
        back_populates="credits",
    )


class TaxonomyNode(Base):
    """Controlled multi-axis taxonomy node.

    Derived exclusively from the canonical Veya Luma controlled vocabularies:
    genre, theme, mood, style.
    """

    __tablename__ = "taxonomy_node"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )
    key: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True,
        index=True,
    )
    label: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    axis: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="'genre', 'theme', 'mood', 'style'",
    )
    definition: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    is_rankable: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    # Relationships
    movie_tags: Mapped[list["MovieTag"]] = relationship(
        back_populates="node",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class MovieTag(Base):
    """Many-to-many relationship linking a canonical movie to a taxonomy node."""

    __tablename__ = "movie_tag"

    movie_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("movie.id", ondelete="CASCADE"),
        primary_key=True,
    )
    node_id: Mapped[int] = mapped_column(
        ForeignKey("taxonomy_node.id", ondelete="CASCADE"),
        primary_key=True,
    )
    assertion: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="present",
        comment="'present', 'absent', 'unknown'",
    )
    strength: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=1.0,
    )
    confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=1.0,
    )
    evidence_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )
    is_curated: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    __table_args__ = (
        Index("idx_movie_tag_node_id", "node_id"),
        Index("idx_movie_tag_movie_id", "movie_id"),
    )

    # Relationships
    movie: Mapped["Movie"] = relationship(
        back_populates="taxonomy_tags",
    )
    node: Mapped["TaxonomyNode"] = relationship(
        back_populates="movie_tags",
    )

"""Controlled TMDB Catalog Ingestion Service.

Orchestrates the complete acquisition, normalization, validation, identity resolution,
and PostgreSQL persistence pipeline for the canonical Veya Luma movie catalog.
"""

import logging
import time
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.domain.movie.mapper import canonical_movie_to_orm
from app.domain.movie.taxonomy import generate_taxonomy_key
from app.domain.movie.validation import assert_valid_canonical_movie
from app.models.movie import (
    Movie,
    MovieArtwork,
    MovieCollection,
    MovieCredit,
    MovieProvenance,
    MovieTag,
    SourceIdentity,
    TaxonomyNode,
)
from app.providers.tmdb import TMDBProvider
from app.schemas.movie import CanonicalMovie
from app.services.ingestion.collector import TMDBCollector
from app.services.ingestion.schemas import (
    IngestionConfig,
    IngestionFailure,
    IngestionStats,
)

logger = logging.getLogger("app.services.ingestion.service")


class CatalogIngestionService:
    """Service orchestrating the ingestion of TMDB data into PostgreSQL."""

    def __init__(
        self,
        provider: Optional[TMDBProvider] = None,
        collector: Optional[TMDBCollector] = None,
    ) -> None:
        self.provider = provider or TMDBProvider()
        self.collector = collector or TMDBCollector(client=self.provider.get_client())

    async def get_taxonomy_node_lookup(
        self,
        session: AsyncSession,
    ) -> dict[tuple[str, str], TaxonomyNode]:
        """Loads all active canonical taxonomy nodes indexed by (axis, label)."""
        stmt = select(TaxonomyNode).where(TaxonomyNode.is_active.is_(True))
        result = await session.execute(stmt)
        nodes = result.scalars().all()
        return {(node.axis, node.label): node for node in nodes}

    async def resolve_existing_movie(
        self,
        source: str,
        external_id: str,
        canonical_uuid: UUID,
        session: AsyncSession,
    ) -> Optional[Movie]:
        """Looks up an existing movie by its source identity or canonical UUID."""
        # 1. Match by source identity (source, external_id)
        stmt = (
            select(SourceIdentity)
            .where(
                SourceIdentity.source == source.strip().lower(),
                SourceIdentity.external_id == str(external_id).strip(),
            )
            .options(
                joinedload(SourceIdentity.movie).options(
                    selectinload(Movie.artwork),
                    selectinload(Movie.collection),
                    selectinload(Movie.provenance),
                    selectinload(Movie.credits),
                    selectinload(Movie.taxonomy_tags).selectinload(MovieTag.node),
                    selectinload(Movie.provider_identities),
                )
            )
        )
        res = await session.execute(stmt)
        matched_identity = res.scalars().first()
        if matched_identity and matched_identity.movie:
            return matched_identity.movie

        # 2. Fallback: match by canonical UUID
        stmt_movie = (
            select(Movie)
            .where(Movie.id == canonical_uuid)
            .options(
                selectinload(Movie.artwork),
                selectinload(Movie.collection),
                selectinload(Movie.provenance),
                selectinload(Movie.credits),
                selectinload(Movie.taxonomy_tags).selectinload(MovieTag.node),
                selectinload(Movie.provider_identities),
            )
        )
        res_movie = await session.execute(stmt_movie)
        return res_movie.scalars().first()

    def update_existing_movie(
        self,
        existing: Movie,
        canonical: CanonicalMovie,
        taxonomy_lookup: dict[tuple[str, str], TaxonomyNode],
    ) -> None:
        """Updates an existing Movie ORM record in-place with fresh canonical domain attributes."""
        # 1. Core metadata
        existing.title = canonical.title
        existing.original_title = canonical.original_title
        existing.original_language = canonical.original_language
        existing.spoken_languages = list(canonical.spoken_languages)
        existing.release_date = canonical.release_date
        existing.release_year = canonical.release_year
        existing.runtime_minutes = canonical.runtime_minutes
        existing.synopsis = canonical.synopsis
        existing.tags = list(canonical.tags)
        existing.popularity = canonical.popularity
        existing.vote_average = canonical.vote_average
        existing.vote_count = canonical.vote_count

        # 2. Artwork Reference
        if canonical.artwork:
            if existing.artwork:
                existing.artwork.poster_path = canonical.artwork.poster_path
                existing.artwork.backdrop_path = canonical.artwork.backdrop_path
                existing.artwork.poster_url = canonical.artwork.poster_url
                existing.artwork.backdrop_url = canonical.artwork.backdrop_url
            else:
                existing.artwork = MovieArtwork(
                    movie_id=existing.id,
                    poster_path=canonical.artwork.poster_path,
                    backdrop_path=canonical.artwork.backdrop_path,
                    poster_url=canonical.artwork.poster_url,
                    backdrop_url=canonical.artwork.backdrop_url,
                )

        # 3. Provenance
        if canonical.provenance:
            if existing.provenance:
                existing.provenance.endpoint_or_product = (
                    canonical.provenance.endpoint_or_product
                )
                existing.provenance.retrieved_at = canonical.provenance.retrieved_at
                existing.provenance.license_profile = (
                    canonical.provenance.license_profile
                )
                existing.provenance.raw_sha256 = canonical.provenance.raw_sha256
                existing.provenance.field_sources = dict(
                    canonical.provenance.field_sources
                )
            else:
                existing.provenance = MovieProvenance(
                    movie_id=existing.id,
                    source=canonical.provenance.source,
                    source_id=canonical.provenance.source_id,
                    endpoint_or_product=canonical.provenance.endpoint_or_product,
                    retrieved_at=canonical.provenance.retrieved_at,
                    license_profile=canonical.provenance.license_profile,
                    raw_sha256=canonical.provenance.raw_sha256,
                    field_sources=dict(canonical.provenance.field_sources),
                )

        # 4. Provider Identities (preserve existing, append any new ones)
        existing_identity_keys = {
            (pi.source.strip().lower(), str(pi.external_id).strip())
            for pi in existing.provider_identities
        }
        for pi in canonical.provider_identities:
            key = (pi.source.strip().lower(), str(pi.external_id).strip())
            if key not in existing_identity_keys:
                existing.provider_identities.append(
                    SourceIdentity(
                        movie_id=existing.id,
                        source=pi.source.strip().lower(),
                        external_id=str(pi.external_id).strip(),
                        confidence=pi.confidence,
                        is_primary=pi.is_primary,
                    )
                )
                existing_identity_keys.add(key)

        # 5. Credits
        new_credits: list[MovieCredit] = []
        for cast in canonical.credits.cast:
            new_credits.append(
                MovieCredit(
                    movie_id=existing.id,
                    credit_type="cast",
                    name=cast.name,
                    role_or_character=cast.character,
                    department="Acting",
                    job="Actor",
                    billing_order=cast.billing_order,
                    person_external_id=cast.person_external_id,
                )
            )

        added_crew: set[tuple[str, str]] = set()
        for director in canonical.credits.directors:
            key = (
                director.name.strip().lower(),
                (director.job or "Director").strip().lower(),
            )
            added_crew.add(key)
            new_credits.append(
                MovieCredit(
                    movie_id=existing.id,
                    credit_type="crew",
                    name=director.name,
                    role_or_character=None,
                    department=director.department or "Directing",
                    job=director.job or "Director",
                    billing_order=None,
                    person_external_id=director.person_external_id,
                )
            )
        for crew in canonical.credits.crew:
            key = (crew.name.strip().lower(), (crew.job or "").strip().lower())
            if key in added_crew:
                continue
            added_crew.add(key)
            new_credits.append(
                MovieCredit(
                    movie_id=existing.id,
                    credit_type="crew",
                    name=crew.name,
                    role_or_character=None,
                    department=crew.department,
                    job=crew.job,
                    billing_order=None,
                    person_external_id=crew.person_external_id,
                )
            )
        existing.credits = new_credits

        # 6. Taxonomy Tags (preserve canonical links without duplicate keys)
        new_tags: list[MovieTag] = []
        taxonomy_axes: list[tuple[str, list[str]]] = [
            ("genre", canonical.genres),
            ("theme", canonical.themes),
            ("mood", canonical.moods),
            ("style", canonical.styles),
        ]
        for axis, labels in taxonomy_axes:
            for label in labels:
                node = taxonomy_lookup.get((axis, label))
                if node is None:
                    node = TaxonomyNode(
                        axis=axis,
                        label=label,
                        key=generate_taxonomy_key(axis, label),
                        definition=f"Canonical {axis}: {label}",
                    )
                new_tags.append(
                    MovieTag(
                        movie_id=existing.id,
                        node=node,
                        assertion="present",
                        strength=1.0,
                        confidence=1.0,
                        evidence_count=1,
                    )
                )
        existing.taxonomy_tags = new_tags

    async def ingest_payload(
        self,
        payload: dict[str, Any],
        session: AsyncSession,
        taxonomy_lookup: Optional[dict[tuple[str, str], TaxonomyNode]] = None,
        dry_run: bool = False,
        commit: bool = True,
    ) -> tuple[CanonicalMovie, str]:
        """Normalizes, validates, resolves identity, and persists a single raw TMDB payload.

        Returns (canonical_movie, action) where action is 'inserted', 'updated', or 'dry_run'.
        """
        # 1. Normalize provider payload into CanonicalMovie
        canonical = self.provider.parse_payload(payload)

        # 2. Strict domain invariant assertion
        assert_valid_canonical_movie(canonical)

        if dry_run:
            return canonical, "dry_run"

        # Ensure taxonomy lookup is loaded
        if taxonomy_lookup is None:
            taxonomy_lookup = await self.get_taxonomy_node_lookup(session)

        # 3. Resolve existing movie in PostgreSQL
        raw_tmdb_id = str(payload.get("id"))
        existing_movie = await self.resolve_existing_movie(
            source="tmdb",
            external_id=raw_tmdb_id,
            canonical_uuid=canonical.id,
            session=session,
        )

        if existing_movie is not None:
            # 4. Update existing movie
            self.update_existing_movie(existing_movie, canonical, taxonomy_lookup)
            action = "updated"
        else:
            # 5. Insert new movie
            orm_movie = canonical_movie_to_orm(
                canonical, taxonomy_node_lookup=taxonomy_lookup
            )

            # Check if franchise collection already exists in database
            if canonical.collection and canonical.collection.collection_id:
                coll_stmt = select(MovieCollection).where(
                    MovieCollection.external_id == canonical.collection.collection_id
                )
                coll_res = await session.execute(coll_stmt)
                existing_coll = coll_res.scalars().first()
                if existing_coll:
                    orm_movie.collection = existing_coll

            session.add(orm_movie)
            action = "inserted"

        if commit:
            await session.commit()

        return canonical, action

    async def ingest_bounded_catalog(
        self,
        session: AsyncSession,
        config: Optional[IngestionConfig] = None,
    ) -> IngestionStats:
        """Executes a complete bounded TMDB catalog ingestion run."""
        cfg = config or IngestionConfig()
        stats = IngestionStats(dry_run=cfg.dry_run)
        start_time = time.perf_counter()

        logger.info(
            "Executing TMDB catalog ingestion (max_pages=%d, max_movies=%d, dry_run=%s)",
            cfg.max_pages,
            cfg.max_movies,
            cfg.dry_run,
        )

        # Pre-load taxonomy lookup
        taxonomy_lookup: dict[tuple[str, str], TaxonomyNode] = {}
        if not cfg.dry_run:
            taxonomy_lookup = await self.get_taxonomy_node_lookup(session)

        async for raw_payload in self.collector.acquire_catalog(config=cfg):
            stats.discovered += 1
            tmdb_id_str = str(raw_payload.get("id", ""))
            raw_title = raw_payload.get("title", "Untitled")

            try:
                canonical, action = await self.ingest_payload(
                    payload=raw_payload,
                    session=session,
                    taxonomy_lookup=taxonomy_lookup,
                    dry_run=cfg.dry_run,
                    commit=True,
                )
                stats.normalized += 1
                stats.processed_canonical_ids.append(canonical.id)

                if action == "inserted":
                    stats.inserted += 1
                elif action == "updated":
                    stats.updated += 1
                elif action == "dry_run":
                    stats.inserted += 1  # In dry run, count normalized candidate as valid insert target

                logger.info(
                    "Ingested movie: [%s] '%s' (TMDB: %s -> UUID: %s)",
                    action.upper(),
                    canonical.title,
                    tmdb_id_str,
                    canonical.id,
                )

            except Exception as exc:
                stats.failed += 1
                failure = IngestionFailure(
                    tmdb_id=tmdb_id_str,
                    title=raw_title,
                    stage="ingestion",
                    error=str(exc),
                )
                stats.failures.append(failure)
                logger.error(
                    "Failed to ingest TMDB movie %s ('%s'): %s",
                    tmdb_id_str,
                    raw_title,
                    exc,
                )
                if not cfg.dry_run:
                    await session.rollback()

        stats.elapsed_seconds = round(time.perf_counter() - start_time, 2)
        logger.info(
            "Ingestion completed: Discovered=%d, Normalized=%d, Inserted=%d, Updated=%d, Failed=%d, Elapsed=%.2fs",
            stats.discovered,
            stats.normalized,
            stats.inserted,
            stats.updated,
            stats.failed,
            stats.elapsed_seconds,
        )
        return stats

"""Movie Identity Strategy and Deterministic Resolution for Veya Luma.

Ensures clear separation between internal synthetic UUIDs and external source IDs.
Supports deterministic generation, cross-source linking, and multi-tier duplicate resolution.
"""

import re
import unicodedata
import uuid
from typing import Iterable, Optional
from uuid import UUID

from app.schemas.movie import (
    CanonicalMovie,
    IdentityResolutionResult,
    ProviderIdentity,
    ResolutionAction,
)

# Namespace UUID for deterministic Veya Luma movie identifier generation
VEYA_MOVIE_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_DNS, "catalog.veyaluma.internal")


def generate_canonical_movie_id(source: str, external_id: str) -> UUID:
    """Generates a deterministic, reproducible UUIDv5 for a primary source record.

    Ensures that re-processing the same upstream record deterministically resolves
    to the identical internal UUID without database coordination.
    """
    key = f"{source.strip().lower()}:{str(external_id).strip()}"
    return uuid.uuid5(VEYA_MOVIE_NAMESPACE, key)


def normalize_match_title(title: str) -> str:
    """Normalizes a movie title for fuzzy/deterministic matching:
    - NFKD Unicode decomposition
    - Strips leading articles ('the', 'a', 'an')
    - Strips non-alphanumeric characters
    - Lowercases
    """
    if not title:
        return ""

    # Normalize unicode accents
    decomposed = unicodedata.normalize("NFKD", title)
    ascii_clean = "".join(c for c in decomposed if not unicodedata.combining(c))

    cleaned = ascii_clean.lower().strip()

    # Strip leading articles
    for article in ("the ", "a ", "an "):
        if cleaned.startswith(article):
            cleaned = cleaned[len(article) :].strip()
            break

    # Retain alphanumeric only
    alphanumeric = re.sub(r"[^a-z0-9]", "", cleaned)
    return alphanumeric


def normalize_director_name(name: Optional[str]) -> str:
    """Normalizes a director name for corroboration matching."""
    if not name:
        return ""
    decomposed = unicodedata.normalize("NFKD", name)
    ascii_clean = "".join(c for c in decomposed if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", ascii_clean.lower())


class IdentityResolver:
    """Deterministic multi-tier movie identity resolution engine.

    Order of resolution:
    1. Exact Primary Provider Match (source_name + external_id)
    2. Cross-Provider ID Match (e.g. IMDb ID cross-referenced between TMDB and Wikidata)
    3. Natural Corroboration Match (normalized title + year within ±1 yr + runtime ±5m + director)
    4. Conflict Detection (same title/year but divergent director/runtime -> quarantine/ambiguous)
    5. New Identity Generation (deterministic UUIDv5)
    """

    def __init__(
        self, existing_catalog: Optional[Iterable[CanonicalMovie]] = None
    ) -> None:
        self._by_id: dict[UUID, CanonicalMovie] = {}
        self._provider_index: dict[tuple[str, str], UUID] = {}

        if existing_catalog:
            for movie in existing_catalog:
                self.index_movie(movie)

    def index_movie(self, movie: CanonicalMovie) -> None:
        """Indexes a canonical movie into the memory resolver."""
        self._by_id[movie.id] = movie
        for identity in movie.provider_identities:
            key = (identity.source.strip().lower(), str(identity.external_id).strip())
            self._provider_index[key] = movie.id

    def resolve(
        self,
        candidate_source: str,
        candidate_external_id: str,
        candidate_title: str,
        candidate_year: Optional[int] = None,
        candidate_runtime: Optional[int] = None,
        candidate_director: Optional[str] = None,
        cross_identifiers: Optional[list[ProviderIdentity]] = None,
    ) -> IdentityResolutionResult:
        """Resolves an incoming source candidate against the known identity graph."""
        clean_source = candidate_source.strip().lower()
        clean_ext_id = str(candidate_external_id).strip()

        # Tier 1: Exact Source Provider Match
        exact_key = (clean_source, clean_ext_id)
        if exact_key in self._provider_index:
            resolved_uuid = self._provider_index[exact_key]
            return IdentityResolutionResult(
                action=ResolutionAction.MATCH_EXACT,
                resolved_id=resolved_uuid,
                confidence=1.0,
                matched_provider=clean_source,
                matched_external_id=clean_ext_id,
                rationale=f"Exact match on primary provider identity ({clean_source}: {clean_ext_id})",
            )

        # Tier 2: Cross-Source Identifier Match
        if cross_identifiers:
            for cross_id in cross_identifiers:
                cross_key = (
                    cross_id.source.strip().lower(),
                    str(cross_id.external_id).strip(),
                )
                if cross_key in self._provider_index:
                    resolved_uuid = self._provider_index[cross_key]
                    return IdentityResolutionResult(
                        action=ResolutionAction.MATCH_CROSS_SOURCE,
                        resolved_id=resolved_uuid,
                        confidence=0.98,
                        matched_provider=cross_id.source,
                        matched_external_id=cross_id.external_id,
                        rationale=f"Cross-source match on verified provider ID ({cross_id.source}: {cross_id.external_id})",
                    )

        # Tier 3: Natural Corroboration Match
        norm_title = normalize_match_title(candidate_title)
        norm_director = normalize_director_name(candidate_director)

        for existing_id, existing in self._by_id.items():
            existing_norm_title = normalize_match_title(existing.title)
            if norm_title and norm_title == existing_norm_title:
                # Check year corroboration (within ±1 year)
                year_diff = (
                    abs(existing.release_year - candidate_year)
                    if (existing.release_year and candidate_year)
                    else None
                )
                year_match = year_diff is not None and year_diff <= 1

                # Check director corroboration
                existing_director = normalize_director_name(existing.credits.director)
                director_match = (
                    norm_director
                    and existing_director
                    and norm_director == existing_director
                )

                # Check runtime corroboration (within ±5 minutes)
                runtime_diff = (
                    abs(existing.runtime_minutes - candidate_runtime)
                    if (existing.runtime_minutes and candidate_runtime)
                    else None
                )
                runtime_match = runtime_diff is not None and runtime_diff <= 5

                # Corroborated match: Title matches AND (Director matches OR (Year matches AND Runtime matches))
                if director_match and (year_match or candidate_year is None):
                    return IdentityResolutionResult(
                        action=ResolutionAction.MATCH_CORROBORATED,
                        resolved_id=existing_id,
                        confidence=0.92,
                        matched_provider="natural_corroboration",
                        matched_external_id=str(existing_id),
                        rationale=f"Natural corroboration match on title '{candidate_title}' and director '{candidate_director}'",
                    )

                if year_match and runtime_match:
                    return IdentityResolutionResult(
                        action=ResolutionAction.MATCH_CORROBORATED,
                        resolved_id=existing_id,
                        confidence=0.90,
                        matched_provider="natural_corroboration",
                        matched_external_id=str(existing_id),
                        rationale=f"Natural corroboration match on title '{candidate_title}', release year {candidate_year}, and runtime {candidate_runtime}m",
                    )

                # Collision / Conflict detection: Identical title but completely divergent director/runtime
                if (
                    norm_director
                    and existing_director
                    and norm_director != existing_director
                ):
                    # e.g. Remakes (Solaris 1972 Tarkovsky vs Solaris 2002 Soderbergh)
                    if year_diff is not None and year_diff > 3:
                        # Clear distinct film (remake / unrelated title reuse)
                        continue
                    else:
                        return IdentityResolutionResult(
                            action=ResolutionAction.AMBIGUOUS_CONFLICT,
                            resolved_id=existing_id,
                            confidence=0.40,
                            matched_provider="collision_review",
                            matched_external_id=str(existing_id),
                            rationale=f"Title match '{candidate_title}' with divergent director ('{candidate_director}' vs '{existing.credits.director}') requires manual review",
                        )

        # Tier 4: No match found -> Generate deterministic new canonical movie ID
        new_uuid = generate_canonical_movie_id(clean_source, clean_ext_id)
        return IdentityResolutionResult(
            action=ResolutionAction.CREATE_NEW,
            resolved_id=new_uuid,
            confidence=1.0,
            matched_provider=None,
            matched_external_id=None,
            rationale=f"No duplicate found; generated deterministic canonical ID for {clean_source}:{clean_ext_id}",
        )

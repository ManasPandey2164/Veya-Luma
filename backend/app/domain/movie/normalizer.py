"""Movie Normalization Pipeline for Veya Luma.

Transforms raw vendor models (TMDB, Wikidata) into fully normalized, validated
CanonicalMovie domain entities.
"""

from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID

from app.domain.movie.identity import generate_canonical_movie_id
from app.domain.movie.provenance import create_provenance_record
from app.domain.movie.taxonomy import (
    map_keywords_to_taxonomy,
    normalize_genres,
)
from app.domain.movie.validation import assert_valid_canonical_movie
from app.schemas.movie import (
    ArtworkReference,
    CanonicalMovie,
    CastMember,
    CollectionReference,
    CrewMember,
    MovieCredits,
    ProviderIdentity,
    TMDBRawMovie,
    WikidataRawMovie,
)


class MovieNormalizer:
    """Normalizes raw upstream movie payloads into canonical Veya Luma records."""

    @staticmethod
    def parse_release_date(
        raw_date_str: Optional[str],
    ) -> tuple[Optional[date], Optional[int]]:
        """Parses an ISO date string ('YYYY-MM-DD') into a date object and year integer."""
        if not raw_date_str or not raw_date_str.strip():
            return None, None

        cleaned = raw_date_str.strip()
        try:
            parsed = date.fromisoformat(cleaned)
            return parsed, parsed.year
        except ValueError:
            # Fallback for partial release date (e.g., '1979')
            if len(cleaned) == 4 and cleaned.isdigit():
                return None, int(cleaned)
            return None, None

    @classmethod
    def normalize_tmdb(
        cls,
        raw: TMDBRawMovie,
        raw_payload: Optional[dict[str, Any]] = None,
        canonical_id: Optional[UUID] = None,
        curated_themes: Optional[list[str]] = None,
        curated_moods: Optional[list[str]] = None,
        curated_styles: Optional[list[str]] = None,
        curated_tags: Optional[list[str]] = None,
        retrieved_at: Optional[datetime] = None,
    ) -> CanonicalMovie:
        """Transforms a TMDBRawMovie model into a validated CanonicalMovie."""
        # 1. Resolve internal movie UUID
        movie_uuid = canonical_id or generate_canonical_movie_id("tmdb", str(raw.id))

        # 2. Parse release date and year
        rel_date, rel_year = cls.parse_release_date(raw.release_date)

        # 3. Validate runtime
        runtime_min = raw.runtime if (raw.runtime and raw.runtime > 0) else None

        # 4. Normalize taxonomy (genres from TMDB, themes & moods from keywords/curation)
        raw_genre_inputs: list[str | int] = []
        if raw.genres:
            raw_genre_inputs.extend(g.name for g in raw.genres)
        elif raw.genre_ids:
            raw_genre_inputs.extend(raw.genre_ids)

        canonical_genres = normalize_genres(raw_genre_inputs)

        # Extract keywords for thematic enrichment and metadata tag preservation
        candidate_themes: list[str] = list(curated_themes or [])
        candidate_moods: list[str] = list(curated_moods or [])
        candidate_styles: list[str] = list(curated_styles or [])
        candidate_tags: list[str] = list(curated_tags or [])

        if raw.keywords and raw.keywords.keywords:
            kw_names = [
                kw.name.strip()
                for kw in raw.keywords.keywords
                if kw.name and kw.name.strip()
            ]
            for name in kw_names:
                if name.lower() not in [t.lower() for t in candidate_tags]:
                    candidate_tags.append(name)

            mapped_themes, mapped_moods, mapped_styles = map_keywords_to_taxonomy(
                kw_names
            )
            for t in mapped_themes:
                if t not in candidate_themes:
                    candidate_themes.append(t)
            for m in mapped_moods:
                if m not in candidate_moods:
                    candidate_moods.append(m)
            for s in mapped_styles:
                if s not in candidate_styles:
                    candidate_styles.append(s)

        # 5. Normalize Credits
        directors: list[CrewMember] = []
        crew_members: list[CrewMember] = []
        cast_members: list[CastMember] = []
        lead_director_name: Optional[str] = None

        if raw.credits:
            for c in raw.credits.crew:
                crew_obj = CrewMember(
                    name=c.name.strip(),
                    department=c.department or "Crew",
                    job=c.job or "Crew",
                    person_external_id=str(c.id) if c.id else None,
                )
                crew_members.append(crew_obj)
                if c.job and c.job.strip().lower() == "director":
                    directors.append(crew_obj)
                    if lead_director_name is None:
                        lead_director_name = c.name.strip()

            sorted_cast = sorted(
                raw.credits.cast, key=lambda x: x.order if x.order is not None else 999
            )
            for cm in sorted_cast:
                cast_members.append(
                    CastMember(
                        name=cm.name.strip(),
                        character=cm.character.strip() if cm.character else None,
                        billing_order=cm.order,
                        person_external_id=str(cm.id) if cm.id else None,
                    )
                )

        movie_credits = MovieCredits(
            director=lead_director_name,
            directors=directors,
            cast=cast_members,
            crew=crew_members,
        )

        # 6. Normalize Artwork
        artwork = ArtworkReference(
            poster_path=raw.poster_path,
            backdrop_path=raw.backdrop_path,
        )

        # 7. Normalize Collection
        collection: Optional[CollectionReference] = None
        if raw.belongs_to_collection:
            collection = CollectionReference(
                collection_id=str(raw.belongs_to_collection.id),
                name=raw.belongs_to_collection.name,
                poster_path=raw.belongs_to_collection.poster_path,
            )

        # 8. Normalize Spoken Languages
        spoken_langs: list[str] = []
        for sl in raw.spoken_languages:
            code = sl.get("iso_639_1")
            raw_name: Any = sl.get("english_name") or sl.get("name")
            if code:
                spoken_langs.append(str(code).lower())
            elif raw_name:
                spoken_langs.append(str(raw_name))

        # 9. Provider Identities
        identities: list[ProviderIdentity] = [
            ProviderIdentity(
                source="tmdb",
                external_id=str(raw.id),
                confidence=1.0,
                is_primary=True,
            )
        ]
        if raw.imdb_id and raw.imdb_id.strip():
            identities.append(
                ProviderIdentity(
                    source="imdb",
                    external_id=raw.imdb_id.strip(),
                    confidence=1.0,
                    is_primary=False,
                )
            )

        # 10. Provenance
        provenance = create_provenance_record(
            source="tmdb",
            source_id=str(raw.id),
            raw_payload=raw_payload or raw.model_dump(),
            license_profile="tmdb-noncommercial-prototype",
            endpoint_or_product="movie-details",
            retrieved_at=retrieved_at,
        )

        # Construct Canonical Movie
        canonical = CanonicalMovie(
            id=movie_uuid,
            title=raw.title.strip(),
            original_title=raw.original_title.strip() if raw.original_title else None,
            original_language=(raw.original_language or "en").strip().lower(),
            spoken_languages=spoken_langs,
            release_date=rel_date,
            release_year=rel_year,
            runtime_minutes=runtime_min,
            synopsis=raw.overview.strip() if raw.overview else None,
            genres=canonical_genres,
            themes=candidate_themes,
            moods=candidate_moods,
            styles=candidate_styles,
            credits=movie_credits,
            artwork=artwork,
            collection=collection,
            provider_identities=identities,
            provenance=provenance,
            tags=candidate_tags,
            popularity=raw.popularity,
            vote_average=raw.vote_average,
            vote_count=raw.vote_count,
        )

        # Validate domain invariants
        assert_valid_canonical_movie(canonical)
        return canonical

    @classmethod
    def enrich_with_wikidata(
        cls,
        movie: CanonicalMovie,
        wikidata_raw: WikidataRawMovie,
    ) -> CanonicalMovie:
        """Enriches an existing canonical movie with Wikidata identity, aliases, and cross-source keys."""
        updated_identities = list(movie.provider_identities)

        # Check if Wikidata Q-ID is already present
        has_wikidata = any(
            ident.source == "wikidata" and ident.external_id == wikidata_raw.qid
            for ident in updated_identities
        )
        if not has_wikidata:
            updated_identities.append(
                ProviderIdentity(
                    source="wikidata",
                    external_id=wikidata_raw.qid,
                    confidence=1.0,
                    is_primary=False,
                )
            )

        # Check cross-source IMDb identifier
        if wikidata_raw.imdb_id:
            has_imdb = any(
                ident.source == "imdb" and ident.external_id == wikidata_raw.imdb_id
                for ident in updated_identities
            )
            if not has_imdb:
                updated_identities.append(
                    ProviderIdentity(
                        source="imdb",
                        external_id=wikidata_raw.imdb_id,
                        confidence=0.99,
                        is_primary=False,
                    )
                )

        # Return refreshed canonical movie
        enriched = movie.model_copy(update={"provider_identities": updated_identities})
        assert_valid_canonical_movie(enriched)
        return enriched

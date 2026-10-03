"""Wikidata Source Adapter Boundary for Veya Luma (Optional Enrichment).

Enriches canonical movie records with open structured data:
- Wikidata Entity Q-IDs (P31)
- Cross-source identifiers (IMDb P345, TMDB P4985)
- Multilingual aliases and open claim provenance
"""

from typing import Any

from app.domain.movie.normalizer import MovieNormalizer
from app.schemas.movie import CanonicalMovie, WikidataRawMovie


class WikidataProvider:
    """Wikidata open structured data enrichment adapter."""

    source_name: str = "wikidata"

    @classmethod
    def parse_raw_entity(cls, entity_payload: dict[str, Any]) -> WikidataRawMovie:
        """Extracts structured movie claims from a simplified Wikidata JSON representation."""
        qid = entity_payload.get("id") or entity_payload.get("qid")
        if not qid:
            raise ValueError("Wikidata payload missing required entity 'id' / 'qid'.")

        labels = entity_payload.get("labels", {})
        descriptions = entity_payload.get("descriptions", {})
        claims = entity_payload.get("claims", {})

        # Extract label (English default or first available)
        label_text = (
            labels.get("en", {}).get("value")
            if isinstance(labels.get("en"), dict)
            else entity_payload.get("label")
        )
        desc_text = (
            descriptions.get("en", {}).get("value")
            if isinstance(descriptions.get("en"), dict)
            else entity_payload.get("description")
        )

        # Extract identifiers from claims if present
        imdb_id = entity_payload.get("imdb_id")
        tmdb_id = entity_payload.get("tmdb_id")

        if "P345" in claims and not imdb_id:  # IMDb ID property
            p345_claims = claims["P345"]
            if p345_claims and isinstance(p345_claims, list):
                imdb_id = (
                    p345_claims[0].get("mainsnak", {}).get("datavalue", {}).get("value")
                )

        if "P4985" in claims and not tmdb_id:  # TMDB ID property
            p4985_claims = claims["P4985"]
            if p4985_claims and isinstance(p4985_claims, list):
                tmdb_id = str(
                    p4985_claims[0]
                    .get("mainsnak", {})
                    .get("datavalue", {})
                    .get("value")
                )

        return WikidataRawMovie(
            qid=str(qid).strip(),
            label=label_text,
            description=desc_text,
            tmdb_id=str(tmdb_id) if tmdb_id else None,
            imdb_id=str(imdb_id) if imdb_id else None,
            publication_date=entity_payload.get("publication_date"),
            duration_minutes=entity_payload.get("duration_minutes"),
            original_language=entity_payload.get("original_language"),
            country_of_origin=entity_payload.get("country_of_origin"),
        )

    @classmethod
    def enrich(
        cls,
        movie: CanonicalMovie,
        entity_payload: dict[str, Any],
    ) -> CanonicalMovie:
        """Enriches an existing CanonicalMovie with Wikidata cross-source identifiers."""
        raw_wikidata = cls.parse_raw_entity(entity_payload)
        return MovieNormalizer.enrich_with_wikidata(movie, raw_wikidata)

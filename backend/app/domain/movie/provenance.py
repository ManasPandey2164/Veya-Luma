"""Movie Data Provenance and Audit Trail module for Veya Luma.

Provides SHA-256 payload hashing, field-level derivation tracking (source-derived vs
Veya-derived), and license profile association.
"""

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Optional

from app.schemas.movie import FieldSourceType, ProvenanceRecord


def compute_payload_sha256(payload: Any) -> str:
    """Computes a deterministic SHA-256 hex digest for a JSON-serializable payload."""
    if isinstance(payload, bytes):
        return hashlib.sha256(payload).hexdigest()
    if isinstance(payload, str):
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    serialized = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def create_provenance_record(
    source: str,
    source_id: Optional[str],
    raw_payload: Any,
    license_profile: str = "tmdb-noncommercial-prototype",
    endpoint_or_product: str = "movie-details",
    retrieved_at: Optional[datetime] = None,
    custom_field_sources: Optional[dict[str, str]] = None,
) -> ProvenanceRecord:
    """Constructs an immutable ProvenanceRecord documenting origin, licensing, and field derivations."""
    timestamp = retrieved_at or datetime.now(timezone.utc)
    digest = compute_payload_sha256(raw_payload) if raw_payload is not None else None

    # Default architectural field derivation mapping
    field_sources: dict[str, str] = {
        "title": FieldSourceType.SOURCE_DERIVED.value,
        "original_title": FieldSourceType.SOURCE_DERIVED.value,
        "release_date": FieldSourceType.SOURCE_DERIVED.value,
        "release_year": FieldSourceType.SOURCE_DERIVED.value,
        "runtime_minutes": FieldSourceType.SOURCE_DERIVED.value,
        "original_language": FieldSourceType.SOURCE_DERIVED.value,
        "spoken_languages": FieldSourceType.SOURCE_DERIVED.value,
        "synopsis": FieldSourceType.SOURCE_DERIVED.value,
        "genres": FieldSourceType.SOURCE_DERIVED.value,
        "credits": FieldSourceType.SOURCE_DERIVED.value,
        "artwork": FieldSourceType.SOURCE_DERIVED.value,
        "collection": FieldSourceType.SOURCE_DERIVED.value,
        # Themes and moods are Veya Luma-derived enrichment
        "themes": FieldSourceType.VEYA_DERIVED.value,
        "moods": FieldSourceType.VEYA_DERIVED.value,
        "styles": FieldSourceType.VEYA_DERIVED.value,
    }

    if custom_field_sources:
        field_sources.update(custom_field_sources)

    return ProvenanceRecord(
        source=source.strip().lower(),
        source_id=str(source_id) if source_id is not None else None,
        endpoint_or_product=endpoint_or_product,
        retrieved_at=timestamp,
        license_profile=license_profile,
        raw_sha256=digest,
        field_sources=field_sources,
    )

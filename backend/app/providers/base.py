"""Provider abstraction boundary for movie metadata sources.

Ensures all upstream data providers conform to a minimal, inspectable interface
returning canonical Veya Luma representations.
"""

from typing import Any, Protocol, runtime_checkable

from app.schemas.movie import CanonicalMovie


@runtime_checkable
class MovieProvider(Protocol):
    """Abstract protocol for external movie metadata providers."""

    @property
    def source_name(self) -> str:
        """Name of the provider (e.g. 'tmdb', 'wikidata')."""
        ...

    def parse_payload(self, payload: dict[str, Any]) -> CanonicalMovie:
        """Parses a raw upstream provider payload into a validated CanonicalMovie."""
        ...

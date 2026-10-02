"""Provider adapters package for external movie metadata sources."""

from app.providers.base import MovieProvider
from app.providers.tmdb import TMDBProvider
from app.providers.wikidata import WikidataProvider

__all__ = ["MovieProvider", "TMDBProvider", "WikidataProvider"]

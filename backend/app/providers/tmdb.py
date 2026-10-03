"""TMDB Source Adapter Boundary for Veya Luma.

Transforms external The Movie Database (TMDB) payloads into Veya Luma CanonicalMovie entities.
Designed for deterministic offline operation, mock payload validation, and optional
authenticated API calls when credentials are provided in the environment.
"""

from typing import Any, Optional
from uuid import UUID

import httpx

from app.core.config import settings
from app.domain.movie.normalizer import MovieNormalizer
from app.providers.tmdb_client import TMDBClient
from app.schemas.movie import CanonicalMovie, TMDBRawMovie


class TMDBProvider:
    """TMDB movie data source provider adapter."""

    source_name: str = "tmdb"

    def __init__(
        self,
        api_key: Optional[str] = None,
        read_access_token: Optional[str] = None,
        base_url: Optional[str] = None,
        client: Optional[TMDBClient] = None,
    ) -> None:
        self.api_key = api_key or settings.TMDB_API_KEY
        self.read_access_token = read_access_token or settings.TMDB_READ_ACCESS_TOKEN
        self.base_url = (base_url or settings.TMDB_BASE_URL).rstrip("/")
        self._client = client

    def get_client(self) -> TMDBClient:
        """Returns the configured TMDBClient instance."""
        if self._client is None:
            self._client = TMDBClient(
                api_key=self.api_key,
                read_access_token=self.read_access_token,
                base_url=self.base_url,
            )
        return self._client

    def parse_payload(
        self,
        payload: dict[str, Any],
        canonical_id: Optional[UUID] = None,
        curated_themes: Optional[list[str]] = None,
        curated_moods: Optional[list[str]] = None,
        curated_styles: Optional[list[str]] = None,
        curated_tags: Optional[list[str]] = None,
    ) -> CanonicalMovie:
        """Parses a raw TMDB API payload dictionary into a CanonicalMovie without network access."""
        raw_movie = TMDBRawMovie.model_validate(payload)
        return MovieNormalizer.normalize_tmdb(
            raw=raw_movie,
            raw_payload=payload,
            canonical_id=canonical_id,
            curated_themes=curated_themes,
            curated_moods=curated_moods,
            curated_styles=curated_styles,
            curated_tags=curated_tags,
        )

    def _get_headers(self) -> dict[str, str]:
        headers = {"Accept": "application/json"}
        if self.read_access_token:
            headers["Authorization"] = f"Bearer {self.read_access_token}"
        return headers

    def _get_params(
        self, append_to_response: str = "credits,keywords"
    ) -> dict[str, str]:
        params = {"append_to_response": append_to_response}
        if not self.read_access_token and self.api_key:
            params["api_key"] = self.api_key
        return params

    async def fetch_movie_details(
        self,
        tmdb_id: int | str,
        client: Optional[httpx.AsyncClient] = None,
    ) -> CanonicalMovie:
        """Fetches movie details from the TMDB API and returns a canonical movie entity.

        Requires valid TMDB credentials; raises RuntimeError or TMDBAuthError if credentials are unset.
        """
        if client is not None:
            if not self.read_access_token and not self.api_key:
                raise RuntimeError(
                    "TMDB credentials missing. Set TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN in environment."
                )
            url = f"{self.base_url}/movie/{tmdb_id}"
            headers = self._get_headers()
            params = self._get_params()
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            payload = response.json()
            return self.parse_payload(payload)

        # Use the controlled TMDBClient with retries and rate limiting
        tmdb_client = self.get_client()
        payload = await tmdb_client.movie_details(tmdb_id=tmdb_id)
        return self.parse_payload(payload)

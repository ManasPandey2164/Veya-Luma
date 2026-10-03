"""Controlled TMDB HTTP Client for Veya Luma.

Provides rate-limiting, exponential backoff retries, structured error handling,
authentication abstraction, and bounded pagination support for TMDB API interactions.
Preserves strict isolation: credentials are never logged or exposed.
"""

import asyncio
import logging
import random
import time
from typing import Any, Optional, cast

import httpx

from app.core.config import settings

logger = logging.getLogger("app.providers.tmdb_client")


# ==============================================================================
# STRUCTURED EXCEPTIONS
# ==============================================================================


class TMDBError(Exception):
    """Base exception for all TMDB provider operations."""

    pass


class TMDBAuthError(TMDBError):
    """Raised when TMDB authentication fails or credentials are missing."""

    pass


class TMDBNotFoundError(TMDBError):
    """Raised when the requested TMDB resource does not exist (HTTP 404)."""

    pass


class TMDBRateLimitError(TMDBError):
    """Raised when TMDB rate limits are exceeded after retries are exhausted."""

    pass


class TMDBAPIError(TMDBError):
    """Raised on upstream TMDB API failure (5xx or unhandled status codes)."""

    pass


# ==============================================================================
# ASYNC RATE LIMITER
# ==============================================================================


class AsyncRateLimiter:
    """Token/interval rate limiter ensuring requests do not exceed a configured rate."""

    def __init__(self, max_requests_per_second: float = 20.0) -> None:
        self.rate = max(0.1, max_requests_per_second)
        self._min_interval: float = 1.0 / self.rate
        self._lock = asyncio.Lock()
        self._last_request_time: float = 0.0

    async def acquire(self) -> None:
        """Asynchronously waits until a request slot is available under the rate limit."""
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_request_time
            if elapsed < self._min_interval:
                await asyncio.sleep(self._min_interval - elapsed)
            self._last_request_time = time.monotonic()


# ==============================================================================
# CONTROLLED TMDB CLIENT
# ==============================================================================


_SENTINEL: Any = object()


class TMDBClient:
    """Asynchronous HTTP client for TMDB with rate limiting and exponential retries."""

    def __init__(
        self,
        api_key: Optional[str] = _SENTINEL,
        read_access_token: Optional[str] = _SENTINEL,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
        max_requests_per_second: Optional[float] = None,
        max_retries: Optional[int] = None,
        backoff_factor: Optional[float] = None,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        self.api_key = settings.TMDB_API_KEY if api_key is _SENTINEL else api_key
        self.read_access_token = (
            settings.TMDB_READ_ACCESS_TOKEN
            if read_access_token is _SENTINEL
            else read_access_token
        )
        self.base_url = (base_url or settings.TMDB_BASE_URL).rstrip("/")
        self.timeout = (
            timeout if timeout is not None else settings.TMDB_REQUEST_TIMEOUT_SECONDS
        )
        self.max_retries = (
            max_retries if max_retries is not None else settings.TMDB_MAX_RETRIES
        )
        self.backoff_factor = (
            backoff_factor
            if backoff_factor is not None
            else settings.TMDB_BACKOFF_FACTOR
        )

        rps = (
            max_requests_per_second
            if max_requests_per_second is not None
            else settings.TMDB_MAX_REQUESTS_PER_SECOND
        )
        self.rate_limiter = AsyncRateLimiter(max_requests_per_second=rps)

        self._external_client = http_client
        self._internal_client: Optional[httpx.AsyncClient] = None

    def has_credentials(self) -> bool:
        """Checks if either a Bearer Read Access Token or an API Key is available."""
        return bool(
            (self.read_access_token and self.read_access_token.strip())
            or (self.api_key and self.api_key.strip())
        )

    def _get_headers(self) -> dict[str, str]:
        headers: dict[str, str] = {
            "Accept": "application/json",
            "User-Agent": "VeyaLuma-CatalogIngestion/1.0",
        }
        if self.read_access_token and self.read_access_token.strip():
            headers["Authorization"] = f"Bearer {self.read_access_token.strip()}"
        return headers

    def _get_params(self, params: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        merged: dict[str, Any] = dict(params or {})
        # If no Bearer token is present, fall back to api_key query param
        if not (self.read_access_token and self.read_access_token.strip()):
            if self.api_key and self.api_key.strip():
                merged["api_key"] = self.api_key.strip()
        return merged

    async def _get_client(self) -> httpx.AsyncClient:
        if self._external_client is not None:
            return self._external_client
        if self._internal_client is None or self._internal_client.is_closed:
            self._internal_client = httpx.AsyncClient(
                timeout=httpx.Timeout(self.timeout),
                follow_redirects=True,
            )
        return self._internal_client

    async def request(
        self,
        method: str,
        endpoint: str,
        params: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """Executes an authenticated, rate-limited HTTP request to TMDB with exponential retry handling."""
        if not self.has_credentials():
            raise TMDBAuthError(
                "TMDB credentials not configured. Please set TMDB_READ_ACCESS_TOKEN or TMDB_API_KEY."
            )

        endpoint_clean = endpoint.lstrip("/")
        url = f"{self.base_url}/{endpoint_clean}"
        headers = self._get_headers()
        request_params = self._get_params(params)

        client = await self._get_client()

        for attempt in range(self.max_retries + 1):
            await self.rate_limiter.acquire()
            try:
                logger.debug(
                    "TMDB request: method=%s endpoint=/%s attempt=%d/%d",
                    method,
                    endpoint_clean,
                    attempt + 1,
                    self.max_retries + 1,
                )
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    params=request_params,
                )

                # Successful HTTP 200
                if response.status_code == 200:
                    payload_json = response.json()
                    return cast(dict[str, Any], payload_json)

                # Client Auth Failures
                if response.status_code in (401, 403):
                    raise TMDBAuthError(
                        f"TMDB authentication failed (HTTP {response.status_code}). Verify TMDB API credentials."
                    )

                # Resource Not Found
                if response.status_code == 404:
                    raise TMDBNotFoundError(
                        f"TMDB resource not found: /{endpoint_clean} (HTTP 404)"
                    )

                # Rate Limit (429)
                if response.status_code == 429:
                    if attempt < self.max_retries:
                        retry_after_header = response.headers.get("Retry-After")
                        delay: float
                        if retry_after_header and retry_after_header.isdigit():
                            delay = min(max(float(retry_after_header), 1.0), 60.0)
                        else:
                            delay = (
                                self.backoff_factor * (2**attempt)
                            ) + random.uniform(0.1, 0.5)

                        logger.warning(
                            "TMDB rate limit (429) on /%s. Backing off for %.2fs (attempt %d/%d).",
                            endpoint_clean,
                            delay,
                            attempt + 1,
                            self.max_retries,
                        )
                        await asyncio.sleep(delay)
                        continue
                    else:
                        raise TMDBRateLimitError(
                            f"TMDB rate limit (HTTP 429) persisted after {self.max_retries} retries."
                        )

                # Server Errors (5xx)
                if response.status_code >= 500:
                    if attempt < self.max_retries:
                        delay = (self.backoff_factor * (2**attempt)) + random.uniform(
                            0.1, 0.5
                        )
                        logger.warning(
                            "TMDB server error (HTTP %d) on /%s. Retrying in %.2fs (attempt %d/%d).",
                            response.status_code,
                            endpoint_clean,
                            delay,
                            attempt + 1,
                            self.max_retries,
                        )
                        await asyncio.sleep(delay)
                        continue
                    else:
                        raise TMDBAPIError(
                            f"TMDB server error HTTP {response.status_code} on /{endpoint_clean} after {self.max_retries} retries."
                        )

                # Other HTTP 4xx errors
                raise TMDBAPIError(
                    f"TMDB unexpected client error HTTP {response.status_code} on /{endpoint_clean}: {response.text}"
                )

            except (httpx.TimeoutException, httpx.NetworkError) as net_err:
                if attempt < self.max_retries:
                    delay = (self.backoff_factor * (2**attempt)) + random.uniform(
                        0.1, 0.5
                    )
                    logger.warning(
                        "TMDB network/timeout error on /%s (%s). Retrying in %.2fs (attempt %d/%d).",
                        endpoint_clean,
                        type(net_err).__name__,
                        delay,
                        attempt + 1,
                        self.max_retries,
                    )
                    await asyncio.sleep(delay)
                    continue
                else:
                    raise TMDBAPIError(
                        f"TMDB network failure on /{endpoint_clean} after {self.max_retries} retries: {net_err}"
                    )

        raise TMDBAPIError(f"TMDB request to /{endpoint_clean} failed unexpectedly.")

    # High-level convenience methods

    async def discover_movies(
        self,
        page: int = 1,
        sort_by: str = "popularity.desc",
        include_adult: bool = False,
        vote_count_gte: Optional[int] = 50,
    ) -> dict[str, Any]:
        """Discovers movies matching criteria (supports pagination)."""
        params: dict[str, Any] = {
            "page": page,
            "sort_by": sort_by,
            "include_adult": "true" if include_adult else "false",
        }
        if vote_count_gte is not None:
            params["vote_count.gte"] = vote_count_gte
        return await self.request("GET", "discover/movie", params=params)

    async def popular_movies(self, page: int = 1) -> dict[str, Any]:
        """Retrieves popular movies from TMDB (supports pagination)."""
        return await self.request("GET", "movie/popular", params={"page": page})

    async def movie_details(
        self,
        tmdb_id: int | str,
        append_to_response: str = "credits,keywords",
    ) -> dict[str, Any]:
        """Retrieves full movie details with appended credits and keywords."""
        return await self.request(
            "GET",
            f"movie/{tmdb_id}",
            params={"append_to_response": append_to_response},
        )

    async def aclose(self) -> None:
        """Closes the underlying internal HTTP client if one was created."""
        if self._internal_client is not None and not self._internal_client.is_closed:
            await self._internal_client.aclose()

    async def __aenter__(self) -> "TMDBClient":
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        await self.aclose()

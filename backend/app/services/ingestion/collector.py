"""Controlled TMDB Catalog Acquisition Collector.

Manages bounded, rate-limited retrieval of candidate movie payloads from TMDB endpoints,
paginating through results up to configurable limits, and fetching full details with credits & keywords.
"""

import logging
from typing import Any, AsyncIterator, Optional

from app.providers.tmdb_client import TMDBClient
from app.services.ingestion.schemas import IngestionConfig

logger = logging.getLogger("app.services.ingestion.collector")


class TMDBCollector:
    """Acquires bounded batches of movie metadata from TMDB."""

    def __init__(self, client: Optional[TMDBClient] = None) -> None:
        self.client = client or TMDBClient()

    async def acquire_catalog(
        self,
        config: Optional[IngestionConfig] = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """Asynchronously streams detailed TMDB movie payloads adhering to bounds in IngestionConfig."""
        cfg = config or IngestionConfig()
        movies_acquired = 0

        logger.info(
            "Starting TMDB catalog acquisition (max_pages=%d, max_movies=%d, sort_by=%s)",
            cfg.max_pages,
            cfg.max_movies,
            cfg.sort_by,
        )

        for page in range(1, cfg.max_pages + 1):
            if movies_acquired >= cfg.max_movies:
                logger.info(
                    "Reached maximum movies limit (%d); stopping acquisition.",
                    cfg.max_movies,
                )
                break

            logger.debug("Requesting TMDB discover page %d...", page)
            discover_page = await self.client.discover_movies(
                page=page,
                sort_by=cfg.sort_by,
                include_adult=cfg.include_adult,
                vote_count_gte=cfg.vote_count_gte,
            )

            results: list[dict[str, Any]] = discover_page.get("results", [])
            total_pages: int = discover_page.get("total_pages", page)

            if not results:
                logger.info(
                    "No movie results returned for page %d; terminating acquisition.",
                    page,
                )
                break

            for item in results:
                if movies_acquired >= cfg.max_movies:
                    break

                tmdb_id = item.get("id")
                if not tmdb_id:
                    continue

                try:
                    logger.debug(
                        "Fetching movie details with credits/keywords for TMDB ID: %s",
                        tmdb_id,
                    )
                    details = await self.client.movie_details(
                        tmdb_id=tmdb_id,
                        append_to_response="credits,keywords",
                    )
                    movies_acquired += 1
                    yield details

                except Exception as exc:
                    logger.warning(
                        "Failed to retrieve detailed payload for TMDB movie %s: %s",
                        tmdb_id,
                        exc,
                    )
                    # Re-raise or let consumer handle; collector continues to next candidate
                    continue

            if page >= total_pages:
                logger.info(
                    "Reached the last available TMDB page (%d); stopping acquisition.",
                    page,
                )
                break

        logger.info(
            "TMDB catalog acquisition complete. Total acquired: %d movies.",
            movies_acquired,
        )

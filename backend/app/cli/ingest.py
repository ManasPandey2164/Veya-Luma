"""CLI Command for Controlled TMDB Catalog Ingestion.

Usage:
    python -m app.cli.ingest [--pages N] [--movies N] [--dry-run] [--sort-by CRITERIA] [--offline-sample]

Bounded execution ensures bounded resource usage and prevents runaway crawler loops.
Credentials are read strictly from environment configuration and never printed.
"""

import argparse
import asyncio
import logging
import sys
from typing import Any

from app.core.config import settings
from app.db.session import async_session_factory
from app.services.ingestion.schemas import (
    IngestionConfig,
    IngestionFailure,
    IngestionStats,
)
from app.services.ingestion.service import CatalogIngestionService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("app.cli.ingest")


def get_sample_offline_payloads() -> list[dict[str, Any]]:
    """Sample raw TMDB payloads for offline testing without network access."""
    return [
        {
            "id": 157336,
            "title": "Interstellar",
            "original_title": "Interstellar",
            "original_language": "en",
            "spoken_languages": [{"iso_639_1": "en", "name": "English"}],
            "release_date": "2014-11-05",
            "runtime": 169,
            "overview": "The adventures of a group of explorers who make use of a newly discovered wormhole.",
            "genres": [
                {"id": 12, "name": "Adventure"},
                {"id": 18, "name": "Drama"},
                {"id": 878, "name": "Science Fiction"},
            ],
            "poster_path": "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
            "backdrop_path": "/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
            "belongs_to_collection": None,
            "imdb_id": "tt0816692",
            "popularity": 138.45,
            "vote_average": 8.44,
            "vote_count": 34500,
            "credits": {
                "cast": [
                    {
                        "id": 10297,
                        "name": "Matthew McConaughey",
                        "character": "Cooper",
                        "order": 0,
                    },
                    {
                        "id": 1813,
                        "name": "Anne Hathaway",
                        "character": "Brand",
                        "order": 1,
                    },
                ],
                "crew": [
                    {
                        "id": 525,
                        "name": "Christopher Nolan",
                        "department": "Directing",
                        "job": "Director",
                    },
                ],
            },
            "keywords": {
                "keywords": [
                    {"id": 83, "name": "space exploration"},
                    {"id": 9840, "name": "wormhole"},
                    {"id": 156175, "name": "time travel"},
                ]
            },
        },
        {
            "id": 693134,
            "title": "Dune: Part Two",
            "original_title": "Dune: Part Two",
            "original_language": "en",
            "spoken_languages": [{"iso_639_1": "en", "name": "English"}],
            "release_date": "2024-03-01",
            "runtime": 166,
            "overview": "Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen.",
            "genres": [
                {"id": 878, "name": "Science Fiction"},
                {"id": 12, "name": "Adventure"},
            ],
            "poster_path": "/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
            "backdrop_path": "/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg",
            "belongs_to_collection": {
                "id": 726872,
                "name": "Dune Collection",
                "poster_path": "/wcV217YvdolBG6Zu7Te09rhmKNu.jpg",
            },
            "imdb_id": "tt15239678",
            "popularity": 154.21,
            "vote_average": 8.23,
            "vote_count": 5420,
            "credits": {
                "cast": [
                    {
                        "id": 1190668,
                        "name": "Timothée Chalamet",
                        "character": "Paul Atreides",
                        "order": 0,
                    },
                    {"id": 505710, "name": "Zendaya", "character": "Chani", "order": 1},
                ],
                "crew": [
                    {
                        "id": 137427,
                        "name": "Denis Villeneuve",
                        "department": "Directing",
                        "job": "Director",
                    },
                ],
            },
            "keywords": {
                "keywords": [
                    {"id": 310, "name": "artificial intelligence"},
                    {"id": 209714, "name": "class struggle"},
                ]
            },
        },
    ]


def print_summary_report(stats: IngestionStats) -> None:
    """Prints a structured ASCII report of the ingestion run."""
    border = "=" * 65
    print("\n" + border)
    print(" VEYA LUMA -- TMDB CATALOG INGESTION REPORT")
    print(border)
    print(
        f" Mode:                {'DRY RUN (no database writes)' if stats.dry_run else 'LIVE PERSISTENCE'}"
    )
    print(f" Records Discovered:  {stats.discovered}")
    print(f" Records Normalized:  {stats.normalized}")
    print(f" Records Inserted:    {stats.inserted}")
    print(f" Records Updated:     {stats.updated}")
    print(f" Records Skipped:     {stats.skipped}")
    print(f" Failures Encountered: {stats.failed}")
    print(f" Elapsed Time:        {stats.elapsed_seconds:.2f}s")
    print(border)

    if stats.failures:
        print(" FAILURES DETAIL:")
        for idx, f in enumerate(stats.failures, 1):
            print(
                f"   {idx}. TMDB ID: {f.tmdb_id} ('{f.title}') - {f.stage}: {f.error}"
            )
        print(border)


async def run_ingestion(config: IngestionConfig, offline_sample: bool = False) -> int:
    """Executes the ingestion workflow."""
    service = CatalogIngestionService()

    # Check for credentials if attempting live acquisition
    has_creds = bool(
        (settings.TMDB_READ_ACCESS_TOKEN and settings.TMDB_READ_ACCESS_TOKEN.strip())
        or (settings.TMDB_API_KEY and settings.TMDB_API_KEY.strip())
    )

    if offline_sample or not has_creds:
        if not has_creds and not offline_sample:
            logger.warning(
                "TMDB credentials (TMDB_READ_ACCESS_TOKEN or TMDB_API_KEY) are not set in the environment. "
                "Running in offline demonstration mode with sample curated movie payloads."
            )
        sample_payloads = get_sample_offline_payloads()[: config.max_movies]
        stats = IngestionStats(dry_run=config.dry_run)
        start_time = asyncio.get_event_loop().time()

        async with async_session_factory() as session:
            taxonomy_lookup = {}
            if not config.dry_run:
                taxonomy_lookup = await service.get_taxonomy_node_lookup(session)

            for payload in sample_payloads:
                stats.discovered += 1
                try:
                    canonical, action = await service.ingest_payload(
                        payload=payload,
                        session=session,
                        taxonomy_lookup=taxonomy_lookup,
                        dry_run=config.dry_run,
                        commit=True,
                    )
                    stats.normalized += 1
                    stats.processed_canonical_ids.append(canonical.id)
                    if action == "inserted":
                        stats.inserted += 1
                    elif action == "updated":
                        stats.updated += 1
                    elif action == "dry_run":
                        stats.inserted += 1
                except Exception as exc:
                    stats.failed += 1
                    stats.failures.append(
                        IngestionFailure(
                            tmdb_id=str(payload.get("id")),
                            title=payload.get("title"),
                            stage="offline_ingestion",
                            error=str(exc),
                        )
                    )

            stats.elapsed_seconds = round(
                asyncio.get_event_loop().time() - start_time, 2
            )
            print_summary_report(stats)
            return 0 if stats.failed == 0 else 1

    # Live acquisition workflow
    async with async_session_factory() as session:
        stats = await service.ingest_bounded_catalog(session=session, config=config)
        print_summary_report(stats)
        return 0 if stats.failed == 0 else 1


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Veya Luma TMDB Catalog Ingestion Service"
    )
    parser.add_argument(
        "--pages",
        type=int,
        default=settings.TMDB_DEFAULT_PAGE_LIMIT,
        help=f"Number of TMDB discover pages to acquire (default: {settings.TMDB_DEFAULT_PAGE_LIMIT})",
    )
    parser.add_argument(
        "--movies",
        type=int,
        default=settings.TMDB_DEFAULT_RECORD_LIMIT,
        help=f"Maximum number of movies to acquire (default: {settings.TMDB_DEFAULT_RECORD_LIMIT})",
    )
    parser.add_argument(
        "--sort-by",
        type=str,
        default="popularity.desc",
        help="TMDB discover sort order (default: popularity.desc)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Acquire, normalize, and validate without persisting to PostgreSQL",
    )
    parser.add_argument(
        "--offline-sample",
        action="store_true",
        help="Ingest local sample movie fixtures without making network requests",
    )

    args = parser.parse_args()
    config = IngestionConfig(
        max_pages=args.pages,
        max_movies=args.movies,
        sort_by=args.sort_by,
        dry_run=args.dry_run,
    )

    exit_code = asyncio.run(
        run_ingestion(config=config, offline_sample=args.offline_sample)
    )
    sys.exit(exit_code)


if __name__ == "__main__":
    main()

import asyncio
import json
from pathlib import Path
from typing import Any

from sqlalchemy import text

from app.db.session import async_engine, async_session_factory


async def run_audit() -> dict[str, Any]:
    results: dict[str, Any] = {}
    async with async_session_factory() as session:
        # Table counts
        tables = [
            "movie",
            "movie_collection",
            "source_identity",
            "movie_artwork",
            "movie_provenance",
            "movie_credit",
            "taxonomy_node",
            "movie_tag",
            "app_user",
            "user_session",
            "user_movie_event",
            "movie_rating",
            "user_preference",
            "watchlist",
            "favourite",
        ]
        results["counts"] = {}
        for t in tables:
            r = await session.execute(text(f"SELECT COUNT(*) FROM {t}"))
            results["counts"][t] = r.scalar()

        # Movie detailed stats
        r = await session.execute(
            text("""
            SELECT
                COUNT(*) as total_movies,
                COUNT(title) as with_title,
                COUNT(original_title) as with_original_title,
                COUNT(original_language) as with_language,
                COUNT(release_date) as with_release_date,
                COUNT(release_year) as with_release_year,
                COUNT(runtime_minutes) as with_runtime,
                COUNT(synopsis) as with_synopsis,
                COUNT(CASE WHEN length(coalesce(synopsis, '')) > 0 THEN 1 END) as with_nonempty_synopsis,
                COUNT(CASE WHEN jsonb_array_length(CASE WHEN jsonb_typeof(tags::jsonb) = 'array' THEN tags::jsonb ELSE '[]'::jsonb END) > 0 THEN 1 END) as with_tags,
                COUNT(popularity) as with_popularity,
                COUNT(vote_average) as with_vote_average,
                COUNT(vote_count) as with_vote_count
            FROM movie
        """)
        )
        movie_row = r.mappings().first()
        results["movie_stats"] = dict(movie_row) if movie_row is not None else {}

        # Individual movie inventory
        r = await session.execute(
            text("""
            SELECT
                m.id,
                m.title,
                m.release_year,
                m.popularity,
                m.vote_average,
                m.vote_count,
                p.source,
                si_tmdb.external_id as tmdb_id,
                si_imdb.external_id as imdb_id,
                a.poster_path,
                a.backdrop_path
            FROM movie m
            LEFT JOIN movie_provenance p ON m.id = p.movie_id
            LEFT JOIN source_identity si_tmdb ON m.id = si_tmdb.movie_id AND si_tmdb.source = 'tmdb'
            LEFT JOIN source_identity si_imdb ON m.id = si_imdb.movie_id AND si_imdb.source = 'imdb'
            LEFT JOIN movie_artwork a ON m.id = a.movie_id
            ORDER BY m.release_year DESC
        """)
        )
        results["movie_inventory"] = [dict(row) for row in r.mappings().all()]

        # Source identities
        r = await session.execute(
            text("""
            SELECT
                COUNT(DISTINCT movie_id) as movies_with_identities,
                COUNT(CASE WHEN source = 'tmdb' THEN 1 END) as tmdb_identities,
                COUNT(DISTINCT CASE WHEN source = 'tmdb' THEN movie_id END) as movies_with_tmdb,
                COUNT(CASE WHEN source = 'imdb' THEN 1 END) as imdb_identities,
                COUNT(DISTINCT CASE WHEN source = 'imdb' THEN movie_id END) as movies_with_imdb,
                COUNT(CASE WHEN is_primary = true THEN 1 END) as primary_identities
            FROM source_identity
        """)
        )
        si_row = r.mappings().first()
        results["source_identity_stats"] = dict(si_row) if si_row is not None else {}

        # Duplicate source identities
        r = await session.execute(
            text("""
            SELECT source, external_id, COUNT(*) as cnt
            FROM source_identity
            GROUP BY source, external_id
            HAVING COUNT(*) > 1
        """)
        )
        results["duplicate_source_identities"] = [
            dict(row) for row in r.mappings().all()
        ]

        # Duplicate movies by title and release_year
        r = await session.execute(
            text("""
            SELECT title, release_year, COUNT(*) as cnt
            FROM movie
            GROUP BY title, release_year
            HAVING COUNT(*) > 1
        """)
        )
        results["duplicate_movies_by_title_year"] = [
            dict(row) for row in r.mappings().all()
        ]

        # Artwork stats
        r = await session.execute(
            text("""
            SELECT
                COUNT(*) as total_artworks,
                COUNT(DISTINCT movie_id) as movies_with_artwork_record,
                COUNT(CASE WHEN poster_path IS NOT NULL AND poster_path != '' THEN 1 END) as with_poster_path,
                COUNT(CASE WHEN backdrop_path IS NOT NULL AND backdrop_path != '' THEN 1 END) as with_backdrop_path,
                COUNT(CASE WHEN poster_url IS NOT NULL AND poster_url != '' THEN 1 END) as with_poster_url,
                COUNT(CASE WHEN backdrop_url IS NOT NULL AND backdrop_url != '' THEN 1 END) as with_backdrop_url
            FROM movie_artwork
        """)
        )
        artwork_row = r.mappings().first()
        results["artwork_stats"] = dict(artwork_row) if artwork_row is not None else {}

        # Orphan artwork (movie_artwork without matching movie)
        r = await session.execute(
            text("""
            SELECT COUNT(*) FROM movie_artwork a
            LEFT JOIN movie m ON a.movie_id = m.id
            WHERE m.id IS NULL
        """)
        )
        results["orphan_artworks"] = r.scalar()

        # Credits stats
        r = await session.execute(
            text("""
            SELECT
                COUNT(*) as total_credits,
                COUNT(DISTINCT movie_id) as movies_with_credits,
                COUNT(CASE WHEN credit_type = 'cast' THEN 1 END) as cast_count,
                COUNT(CASE WHEN credit_type = 'crew' THEN 1 END) as crew_count,
                COUNT(CASE WHEN job = 'Director' THEN 1 END) as directors_count,
                COUNT(DISTINCT CASE WHEN job = 'Director' THEN movie_id END) as movies_with_director
            FROM movie_credit
        """)
        )
        credit_row = r.mappings().first()
        results["credit_stats"] = dict(credit_row) if credit_row is not None else {}

        # Taxonomy nodes by axis
        r = await session.execute(
            text("""
            SELECT axis, COUNT(*) as cnt, COUNT(CASE WHEN is_active THEN 1 END) as active_cnt
            FROM taxonomy_node
            GROUP BY axis
            ORDER BY axis
        """)
        )
        results["taxonomy_axes"] = [dict(row) for row in r.mappings().all()]

        # Taxonomy nodes populated vs unpopulated
        r = await session.execute(
            text("""
            SELECT
                COUNT(CASE WHEN tag_count > 0 THEN 1 END) as populated_nodes,
                COUNT(CASE WHEN tag_count = 0 THEN 1 END) as unpopulated_nodes,
                COUNT(*) as total_nodes
            FROM (
                SELECT tn.id, COUNT(mt.movie_id) as tag_count
                FROM taxonomy_node tn
                LEFT JOIN movie_tag mt ON tn.id = mt.node_id
                GROUP BY tn.id
            ) sub
        """)
        )
        node_pop_row = r.mappings().first()
        results["taxonomy_population_summary"] = (
            dict(node_pop_row) if node_pop_row is not None else {}
        )

        # Movie tags by axis
        r = await session.execute(
            text("""
            SELECT
                tn.axis,
                COUNT(mt.movie_id) as total_tag_assignments,
                COUNT(DISTINCT mt.movie_id) as movies_tagged,
                ROUND(COUNT(DISTINCT mt.movie_id)::numeric / NULLIF((SELECT COUNT(*) FROM movie), 0)::numeric * 100, 2) as pct_movies
            FROM taxonomy_node tn
            JOIN movie_tag mt ON tn.id = mt.node_id
            GROUP BY tn.axis
            ORDER BY tn.axis
        """)
        )
        results["movie_tag_axes"] = [dict(row) for row in r.mappings().all()]

        # Total movies tagged by any taxonomy node
        r = await session.execute(
            text("""
            SELECT
                COUNT(DISTINCT movie_id) as movies_with_any_tag,
                COUNT(*) as total_movie_tags
            FROM movie_tag
        """)
        )
        overall_tag_row = r.mappings().first()
        results["overall_tag_stats"] = (
            dict(overall_tag_row) if overall_tag_row is not None else {}
        )

        # Orphan movie_tag checks
        r = await session.execute(
            text("""
            SELECT COUNT(*) FROM movie_tag mt
            LEFT JOIN movie m ON mt.movie_id = m.id
            WHERE m.id IS NULL
        """)
        )
        results["orphan_movie_tags_m"] = r.scalar()
        r = await session.execute(
            text("""
            SELECT COUNT(*) FROM movie_tag mt
            LEFT JOIN taxonomy_node tn ON mt.node_id = tn.id
            WHERE tn.id IS NULL
        """)
        )
        results["orphan_movie_tags_tn"] = r.scalar()

        # Provenance stats
        r = await session.execute(
            text("""
            SELECT source, endpoint_or_product, count(*) as cnt
            FROM movie_provenance
            GROUP BY source, endpoint_or_product
            ORDER BY source
        """)
        )
        results["provenance_stats"] = [dict(row) for row in r.mappings().all()]

        # Inspect table columns for 'movie'
        r = await session.execute(
            text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'movie'
            ORDER BY ordinal_position
        """)
        )
        results["movie_columns"] = [dict(row) for row in r.mappings().all()]

        # Check if recommendation columns exist in movie table
        movie_col_names = {c["column_name"] for c in results["movie_columns"]}
        results["recommendation_fields_in_movie_table"] = {
            "popularity": "popularity" in movie_col_names,
            "vote_average": "vote_average" in movie_col_names,
            "vote_count": "vote_count" in movie_col_names,
        }

        # Check Step 17 table records and foreign key joins to movie
        results["step17_stats"] = {}
        for t in [
            "user_movie_event",
            "movie_rating",
            "user_preference",
            "watchlist",
            "favourite",
        ]:
            r = await session.execute(text(f"SELECT COUNT(*) FROM {t}"))
            count_val = r.scalar()
            results["step17_stats"][f"{t}_count"] = count_val

        for t in ["user_movie_event", "movie_rating", "watchlist", "favourite"]:
            r = await session.execute(
                text(f"""
                SELECT COUNT(*)
                FROM {t} t_tbl
                JOIN movie m ON t_tbl.movie_id = m.id
            """)
            )
            results["step17_stats"][f"{t}_join_movie_count"] = r.scalar()

        # Join check for user_preference to taxonomy_node
        r = await session.execute(
            text("""
            SELECT COUNT(*)
            FROM user_preference up
            JOIN taxonomy_node tn ON up.taxonomy_node_id = tn.id
        """)
        )
        results["step17_stats"]["user_preference_join_taxonomy_node_count"] = r.scalar()

    output_path = Path(__file__).resolve().parent / "audit_results.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"Audit results written to {output_path}")
    await async_engine.dispose()
    return results


def main() -> None:
    asyncio.run(run_audit())


if __name__ == "__main__":
    main()

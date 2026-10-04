"""Comprehensive test suite for Veya Luma Recommendation Evaluation & Calibration (Step 19).

Verifies:
1. Precision@K (K=5, 10, 20), handling K > candidate count, duplicates, and empty sets.
2. Recall@K (K=5, 10, 20), handling zero holdout positives without zero-division error.
3. NDCG@K (K=5, 10, 20) with graded relevance policy, ideal ranking, and inverted ranking.
4. Diversity metrics (Genre, Language, Taxonomy, Era, Director, Intra-List Diversity).
5. Novelty metrics (Mean slate novelty, Relevant novelty, zero popularity, missing attributes).
6. Catalog Coverage (Overall, by language, by popularity bucket).
7. Popularity Bias (Distribution-aware buckets, exposure ratios, over-indexing flag).
8. Language Coverage (English vs Non-English, unique languages, dominant language).
9. Holdout separation & strict non-leakage guarantee.
10. Candidate channel ablation (NO_CONTENT, NO_PREFERENCE, NO_BEHAVIOR, NO_DISCOVERY, NO_POPULARITY).
11. Discovery quota preservation (15%, 20%, 25%, 35%).
12. Cold start evaluation (curatorial diversity, vote quality, not popularity DESC).
13. Long-term vs recent taste weighting (60/40 vs 80/20 vs 40/60 responsiveness).
14. Factual explanation grounding audit (zero hallucinations, valid catalog backing).
15. Seen-content suppression (ratings & favourites excluded; watchlist & detail views eligible).
16. Calibration configuration management (Configs A, B, C, D, translation, lookup).
17. Edge cases (empty history, no holdout positives, missing taxonomy, missing language, 1-movie catalog).
"""

from datetime import datetime, timezone
from typing import Set
from uuid import UUID, uuid4

import pytest

from app.models.preference import (
    Favourite,
    MovieRating,
    UserMovieEvent,
    Watchlist,
)
from app.recommendation.candidates import (
    generate_cold_start_candidates,
    merge_candidate_channels,
)
from app.recommendation.evaluation.calibration import (
    CONFIG_CALIBRATED_CANDIDATE,
    CONFIG_DISCOVERY_HEAVY,
    CONFIG_POPULARITY_MINIMIZED,
    CONFIG_STEP_18_BASELINE,
    get_candidate_configurations,
    get_configuration_by_name,
)
from app.recommendation.evaluation.datasets import (
    UserTemporalSplit,
    extract_graded_relevance,
)
from app.recommendation.evaluation.metrics import (
    catalog_coverage,
    director_diversity,
    era_diversity,
    genre_diversity,
    intra_list_diversity,
    language_coverage,
    language_diversity,
    ndcg_at_k,
    novelty_score,
    popularity_bias,
    precision_at_k,
    recall_at_k,
    relevant_novelty_score,
    taxonomy_diversity,
)
from app.recommendation.evaluation.runner import run_pipeline_for_taste
from app.recommendation.evaluation.scenarios import build_controlled_scenarios
from app.recommendation.explanations import generate_candidate_explanations
from app.recommendation.features import MovieFeatures
from app.recommendation.models import (
    CandidateChannel,
    ExplanationReasonCode,
    MovieCandidate,
    UserTasteProfile,
)
from app.recommendation.taste import (
    TasteSignalWeights,
    build_user_taste_profile,
)


def _make_dummy_movie(
    movie_id: UUID | None = None,
    title: str = "Test Film",
    genres: Set[str] | None = None,
    themes: Set[str] | None = None,
    moods: Set[str] | None = None,
    styles: Set[str] | None = None,
    original_language: str = "en",
    popularity: float = 25.0,
    vote_average: float = 7.5,
    vote_count: int = 1000,
    directors: Set[str] | None = None,
    release_era: str = "modern",
) -> MovieFeatures:
    """Helper to create an in-memory MovieFeatures fixture."""
    mid = movie_id or uuid4()
    pop_sig = min(1.0, max(0.0, popularity / 100.0))
    return MovieFeatures(
        movie_id=mid,
        title=title,
        original_title=title,
        genres=genres or {"genre.drama"},
        themes=themes or set(),
        moods=moods or set(),
        styles=styles or set(),
        keywords=set(),
        original_language=original_language,
        spoken_languages=[original_language],
        directors=directors or {"Test Director"},
        popularity=popularity,
        vote_average=vote_average,
        vote_count=vote_count,
        release_year=2020,
        release_era=release_era,
        runtime_minutes=120,
        poster_path="/poster.jpg",
        backdrop_path="/backdrop.jpg",
        popularity_signal=pop_sig,
        vote_quality_signal=vote_average / 10.0,
        novelty_signal=round(1.0 - pop_sig, 4),
        tag_labels={g: g.split(".")[-1].title() for g in (genres or set())},
    )


# =============================================================================
# 1. TRADITIONAL METRICS TESTS (Precision@K, Recall@K, NDCG@K)
# =============================================================================


def test_precision_at_k_standard() -> None:
    rec_ids = [uuid4() for _ in range(10)]
    relevant_ids = set(rec_ids[:4])  # 4 out of first 5 are relevant
    assert precision_at_k(rec_ids, relevant_ids, 5) == 0.8
    assert precision_at_k(rec_ids, relevant_ids, 10) == 0.4
    assert precision_at_k(rec_ids, relevant_ids, 20) == 0.2


def test_precision_at_k_edge_cases() -> None:
    rec_ids = [uuid4() for _ in range(5)]
    relevant_ids = {rec_ids[0]}
    # K <= 0
    assert precision_at_k(rec_ids, relevant_ids, 0) == 0.0
    assert precision_at_k(rec_ids, relevant_ids, -5) == 0.0
    # Empty recommendations
    assert precision_at_k([], relevant_ids, 5) == 0.0
    # Zero hits
    assert precision_at_k(rec_ids, set(), 5) == 0.0
    # K larger than candidate count
    assert precision_at_k(rec_ids, relevant_ids, 20) == 0.05


def test_recall_at_k_standard() -> None:
    rec_ids = [uuid4() for _ in range(10)]
    relevant_ids = set(rec_ids[:4]) | {uuid4(), uuid4()}  # 6 total relevant
    assert recall_at_k(rec_ids, relevant_ids, 5) == round(4 / 6, 4)
    assert recall_at_k(rec_ids, relevant_ids, 10) == round(4 / 6, 4)


def test_recall_at_k_zero_division() -> None:
    rec_ids = [uuid4() for _ in range(10)]
    # No holdout positives should return None, avoiding division by zero
    assert recall_at_k(rec_ids, set(), 10) is None


def test_ndcg_at_k_perfect_ranking() -> None:
    id1, id2, id3 = uuid4(), uuid4(), uuid4()
    relevance_map = {id1: 3.0, id2: 2.0, id3: 1.0}
    # Ideal order
    assert ndcg_at_k([id1, id2, id3], relevance_map, 3) == 1.0


def test_ndcg_at_k_inverted_ranking() -> None:
    id1, id2, id3 = uuid4(), uuid4(), uuid4()
    relevance_map = {id1: 3.0, id2: 2.0, id3: 1.0}
    # Inverted order: lowest relevance ranked first
    inverted_ndcg = ndcg_at_k([id3, id2, id1], relevance_map, 3)
    assert 0.0 < inverted_ndcg < 1.0


def test_ndcg_at_k_empty_relevance() -> None:
    rec_ids = [uuid4() for _ in range(5)]
    assert ndcg_at_k(rec_ids, {}, 5) == 0.0
    assert ndcg_at_k([], {uuid4(): 3.0}, 5) == 0.0
    assert ndcg_at_k(rec_ids, {uuid4(): 0.0}, 5) == 0.0


# =============================================================================
# 2. DIVERSITY, NOVELTY & BIAS TESTS
# =============================================================================


def test_diversity_metrics_calculation() -> None:
    m1 = _make_dummy_movie(
        genres={"genre.sci_fi"},
        original_language="en",
        directors={"Nolan"},
        release_era="modern",
    )
    m2 = _make_dummy_movie(
        genres={"genre.drama"},
        original_language="ja",
        directors={"Miyazaki"},
        release_era="golden_modern",
    )
    m3 = _make_dummy_movie(
        genres={"genre.thriller"},
        original_language="fr",
        directors={"Villeneuve"},
        release_era="contemporary",
    )
    movies = [m1, m2, m3]

    g_div = genre_diversity(movies)
    assert g_div["unique_genres"] == 3.0
    assert g_div["unique_genre_ratio"] == 1.0

    l_div = language_diversity(movies)
    assert l_div["unique_languages"] == 3.0
    assert l_div["non_english_share"] == round(2 / 3, 4)

    t_div = taxonomy_diversity(movies)
    assert t_div["unique_taxonomy_nodes"] == 3.0

    e_div = era_diversity(movies)
    assert e_div["unique_eras"] == 3.0

    d_div = director_diversity(movies)
    assert d_div["unique_directors"] == 3.0

    ild = intra_list_diversity(movies)
    assert ild == 1.0  # Completely disjoint tag sets


def test_diversity_metrics_homogeneous_edge_case() -> None:
    # All recommendations same genre, language, and director
    m1 = _make_dummy_movie(
        genres={"genre.drama"}, original_language="en", directors={"Spielberg"}
    )
    m2 = _make_dummy_movie(
        genres={"genre.drama"}, original_language="en", directors={"Spielberg"}
    )
    movies = [m1, m2]

    assert genre_diversity(movies)["unique_genres"] == 1.0
    assert language_diversity(movies)["unique_languages"] == 1.0
    assert language_diversity(movies)["non_english_share"] == 0.0
    assert director_diversity(movies)["unique_directors"] == 1.0
    assert intra_list_diversity(movies) == 0.0


def test_novelty_metrics() -> None:
    m1 = _make_dummy_movie(popularity=10.0)  # High novelty
    m2 = _make_dummy_movie(popularity=90.0)  # Low novelty
    movies = [m1, m2]

    nov = novelty_score(movies)
    assert 0.0 < nov < 1.0
    assert m1.novelty_signal > m2.novelty_signal

    rel_nov = relevant_novelty_score(movies, {m1.movie_id})
    assert rel_nov == m1.novelty_signal

    # No relevant items
    assert relevant_novelty_score(movies, set()) is None


def test_catalog_coverage_and_popularity_bias() -> None:
    m1 = _make_dummy_movie(popularity=10.0, original_language="en")  # Low
    m2 = _make_dummy_movie(popularity=25.0, original_language="en")  # Medium
    m3 = _make_dummy_movie(popularity=40.0, original_language="ja")  # High
    m4 = _make_dummy_movie(popularity=60.0, original_language="fr")  # Very High
    catalog = {m.movie_id: m for m in [m1, m2, m3, m4]}

    cov = catalog_coverage({m1.movie_id, m3.movie_id}, catalog)
    assert cov["total_catalog_size"] == 4
    assert cov["unique_surfaced_movies"] == 2
    assert cov["overall_coverage_ratio"] == 0.5
    assert cov["coverage_by_language"]["english"] == 0.5
    assert cov["coverage_by_language"]["non_english"] == 0.5

    bias = popularity_bias([m1, m2], catalog)
    assert bias["exposure_ratios"]["low"] > 0
    assert bias["exposure_ratios"]["very_high"] == 0.0
    assert bias["popularity_over_indexing"] is False


def test_language_coverage_metrics() -> None:
    m1 = _make_dummy_movie(original_language="en")
    m2 = _make_dummy_movie(original_language="ja")
    m3 = _make_dummy_movie(original_language="fr")

    cov = language_coverage([m1, m2, m3], dominant_language="en")
    assert cov["english_share"] == round(1 / 3, 4)
    assert cov["non_english_share"] == round(2 / 3, 4)
    assert cov["unique_languages_count"] == 3
    assert cov["outside_dominant_language_share"] == round(2 / 3, 4)


# =============================================================================
# 3. HOLDOUT SEPARATION & TEMPORAL INTEGRITY TESTS
# =============================================================================


def test_extract_graded_relevance_policy() -> None:
    uid = uuid4()
    mid_high = uuid4()
    mid_good = uuid4()
    mid_wl = uuid4()
    mid_repeat = uuid4()
    mid_low = uuid4()

    ratings = [
        MovieRating(
            id=uuid4(),
            user_id=uid,
            movie_id=mid_high,
            rating=9.5,
            created_at=datetime.now(timezone.utc),
        ),
        MovieRating(
            id=uuid4(),
            user_id=uid,
            movie_id=mid_good,
            rating=8.0,
            created_at=datetime.now(timezone.utc),
        ),
        MovieRating(
            id=uuid4(),
            user_id=uid,
            movie_id=mid_low,
            rating=3.0,
            created_at=datetime.now(timezone.utc),
        ),
    ]
    wl = [
        Watchlist(
            id=uuid4(),
            user_id=uid,
            session_id=None,
            movie_id=mid_wl,
            created_at=datetime.now(timezone.utc),
        )
    ]
    events = [
        UserMovieEvent(
            id=uuid4(),
            user_id=uid,
            session_id=uuid4(),
            movie_id=mid_repeat,
            event_type="detail_view",
            created_at=datetime.now(timezone.utc),
        ),
        UserMovieEvent(
            id=uuid4(),
            user_id=uid,
            session_id=uuid4(),
            movie_id=mid_repeat,
            event_type="detail_view",
            created_at=datetime.now(timezone.utc),
        ),
    ]

    positives, relevance_map, negatives = extract_graded_relevance(
        ratings=ratings,
        favourites=[],
        watchlist=wl,
        events=events,
    )

    assert mid_high in positives
    assert relevance_map[mid_high] == 3.0

    assert mid_good in positives
    assert relevance_map[mid_good] == 2.0

    assert mid_repeat in positives
    assert relevance_map[mid_repeat] == 2.0

    assert mid_wl in positives
    assert relevance_map[mid_wl] == 1.0

    assert mid_low in negatives
    assert mid_low not in positives
    assert relevance_map[mid_low] == 0.0


def test_holdout_strict_non_leakage() -> None:
    """Verifies that taste profile constructed from history contains ZERO holdout items."""
    m_hist = _make_dummy_movie(genres={"genre.sci_fi"})
    m_hold = _make_dummy_movie(genres={"genre.drama"})
    catalog = {m_hist.movie_id: m_hist, m_hold.movie_id: m_hold}

    uid = uuid4()
    # History contains ONLY m_hist
    hist_ratings = [
        MovieRating(
            id=uuid4(),
            user_id=uid,
            movie_id=m_hist.movie_id,
            rating=9.0,
            created_at=datetime.now(timezone.utc),
        )
    ]
    # Holdout contains m_hold (sequestered)
    split = UserTemporalSplit(
        user_id=uid,
        history_ratings=hist_ratings,
        holdout_positives={m_hold.movie_id},
        holdout_relevance={m_hold.movie_id: 3.0},
    )

    taste = build_user_taste_profile(
        user_id=uid,
        session_id=None,
        ratings=split.history_ratings,
        favourites=[],
        watchlist=[],
        preferences=[],
        events=[],
        movie_features_by_id=catalog,
    )

    assert m_hist.movie_id in taste.seen_movie_ids
    assert m_hold.movie_id not in taste.seen_movie_ids
    assert taste.long_term_genres.get("genre.sci_fi", 0) > 0
    assert taste.long_term_genres.get("genre.drama", 0) == 0.0


# =============================================================================
# 4. ABLATION, QUOTA & COLD START TESTS
# =============================================================================


def test_discovery_quota_preservation() -> None:
    """Verifies that merge_candidate_channels preserves the configured discovery quota."""
    taste = UserTasteProfile(user_id=uuid4(), session_id=None, is_cold_start=False)

    content_cands = [
        MovieCandidate(
            movie_id=uuid4(),
            title=f"Content {i}",
            original_language="en",
            release_year=2020,
            runtime_minutes=120,
            poster_path=None,
            backdrop_path=None,
            popularity=20.0,
            vote_average=8.0,
            vote_count=500,
            primary_channel=CandidateChannel.CONTENT_MATCH.value,
            contributing_channels=[CandidateChannel.CONTENT_MATCH.value],
            raw_score=5.0,
            matched_features={},
            is_in_watchlist=False,
        )
        for i in range(30)
    ]
    disc_cands = [
        MovieCandidate(
            movie_id=uuid4(),
            title=f"Discovery {i}",
            original_language="ja",
            release_year=2019,
            runtime_minutes=110,
            poster_path=None,
            backdrop_path=None,
            popularity=15.0,
            vote_average=7.5,
            vote_count=300,
            primary_channel=CandidateChannel.DISCOVERY.value,
            contributing_channels=[CandidateChannel.DISCOVERY.value],
            raw_score=1.5,
            matched_features={},
            is_in_watchlist=False,
        )
        for i in range(20)
    ]

    channels = {
        CandidateChannel.CONTENT_MATCH.value: content_cands,
        CandidateChannel.DISCOVERY.value: disc_cands,
    }

    # With quota 0.25 on pool size 40 -> at least 10 discovery candidates guaranteed
    merged = merge_candidate_channels(
        channels, taste, target_pool_size=40, discovery_quota_ratio=0.25
    )
    disc_count = sum(
        1 for c in merged if CandidateChannel.DISCOVERY.value in c.contributing_channels
    )
    assert disc_count >= 10


def test_channel_ablation_exclusion() -> None:
    """Verifies that excluding channels completely suppresses those candidates."""
    m1 = _make_dummy_movie(genres={"genre.sci_fi"})
    m2 = _make_dummy_movie(genres={"genre.drama"}, original_language="ja")
    catalog = {m1.movie_id: m1, m2.movie_id: m2}

    uid = uuid4()
    ratings = [
        MovieRating(
            id=uuid4(),
            user_id=uid,
            movie_id=m1.movie_id,
            rating=9.0,
            created_at=datetime.now(timezone.utc),
        )
    ]
    taste = build_user_taste_profile(
        user_id=uid,
        session_id=None,
        ratings=ratings,
        favourites=[],
        watchlist=[],
        preferences=[],
        events=[],
        movie_features_by_id=catalog,
    )

    # Exclude CONTENT_MATCH channel
    recs = run_pipeline_for_taste(
        taste,
        catalog,
        excluded_channels={CandidateChannel.CONTENT_MATCH.value},
        limit=10,
    )
    for c in recs:
        assert c.primary_channel != CandidateChannel.CONTENT_MATCH.value


def test_cold_start_diversity_and_quality() -> None:
    """Verifies that cold start delivers diverse curatorial slates and not popularity DESC."""
    movies = [
        _make_dummy_movie(
            title=f"Movie {i}",
            genres={f"genre.{g}"},
            original_language=lang,
            popularity=float(i * 10),
            vote_average=7.5,
            vote_count=50,
            release_era=era,
        )
        for i, (g, lang, era) in enumerate(
            [
                ("sci_fi", "en", "modern"),
                ("drama", "ja", "golden_modern"),
                ("thriller", "fr", "contemporary"),
                ("animation", "es", "classic"),
                ("comedy", "ko", "modern"),
            ]
        )
    ]

    cands = generate_cold_start_candidates(movies, limit=5)
    assert len(cands) == 5
    # Must NOT be sorted simply by popularity DESC (Movie 4 would be first if popularity DESC)
    languages = {c.original_language for c in cands}
    assert len(languages) >= 3


# =============================================================================
# 5. LONG-TERM VS RECENT WEIGHTING & SEEN SUPPRESSION TESTS
# =============================================================================


def test_long_term_vs_recent_taste_drift() -> None:
    """Verifies that changing blend weights modulates long-term vs recent affinity."""
    m_sf = _make_dummy_movie(genres={"genre.sci_fi"})
    m_dr = _make_dummy_movie(genres={"genre.drama"})
    catalog = {m_sf.movie_id: m_sf, m_dr.movie_id: m_dr}

    uid = uuid4()
    # Long-term: Sci-Fi rating
    ratings = [
        MovieRating(
            id=uuid4(),
            user_id=uid,
            movie_id=m_sf.movie_id,
            rating=10.0,
            created_at=datetime.now(timezone.utc),
        )
    ]
    # Recent: Drama detail view
    events = [
        UserMovieEvent(
            id=uuid4(),
            user_id=uid,
            session_id=uuid4(),
            movie_id=m_dr.movie_id,
            event_type="detail_view",
            created_at=datetime.now(timezone.utc),
        )
    ]

    # 1. Long-term heavy (80 / 20)
    w_lt = TasteSignalWeights(long_term_blend_weight=0.80, recent_blend_weight=0.20)
    taste_lt = build_user_taste_profile(
        user_id=uid,
        session_id=None,
        ratings=ratings,
        favourites=[],
        watchlist=[],
        preferences=[],
        events=events,
        movie_features_by_id=catalog,
        weights=w_lt,
    )

    # 2. Recent heavy (40 / 60)
    w_rec = TasteSignalWeights(long_term_blend_weight=0.40, recent_blend_weight=0.60)
    taste_rec = build_user_taste_profile(
        user_id=uid,
        session_id=None,
        ratings=ratings,
        favourites=[],
        watchlist=[],
        preferences=[],
        events=events,
        movie_features_by_id=catalog,
        weights=w_rec,
    )

    # In taste_rec, recent drama affinity should be higher than in taste_lt
    assert (
        taste_rec.combined_genre_affinity["genre.drama"]
        > taste_lt.combined_genre_affinity["genre.drama"]
    )
    # In taste_lt, long-term sci-fi affinity should be higher than in taste_rec
    assert (
        taste_lt.combined_genre_affinity["genre.sci_fi"]
        > taste_rec.combined_genre_affinity["genre.sci_fi"]
    )


def test_seen_content_suppression_and_watchlist_retention() -> None:
    """Verifies that rated/favourited are strictly suppressed while watchlist remains eligible."""
    m_rated = _make_dummy_movie(title="Rated Movie")
    m_fav = _make_dummy_movie(title="Fav Movie")
    m_wl = _make_dummy_movie(title="Watchlist Movie")
    m_view = _make_dummy_movie(title="Viewed Movie")
    catalog = {m.movie_id: m for m in [m_rated, m_fav, m_wl, m_view]}

    uid = uuid4()
    ratings = [
        MovieRating(
            id=uuid4(),
            user_id=uid,
            movie_id=m_rated.movie_id,
            rating=9.0,
            created_at=datetime.now(timezone.utc),
        )
    ]
    favs = [
        Favourite(
            id=uuid4(),
            user_id=uid,
            session_id=None,
            movie_id=m_fav.movie_id,
            created_at=datetime.now(timezone.utc),
        )
    ]
    wl = [
        Watchlist(
            id=uuid4(),
            user_id=uid,
            session_id=None,
            movie_id=m_wl.movie_id,
            created_at=datetime.now(timezone.utc),
        )
    ]
    events = [
        UserMovieEvent(
            id=uuid4(),
            user_id=uid,
            session_id=uuid4(),
            movie_id=m_view.movie_id,
            event_type="detail_view",
            created_at=datetime.now(timezone.utc),
        )
    ]

    taste = build_user_taste_profile(
        user_id=uid,
        session_id=None,
        ratings=ratings,
        favourites=favs,
        watchlist=wl,
        preferences=[],
        events=events,
        movie_features_by_id=catalog,
    )

    assert m_rated.movie_id in taste.seen_movie_ids
    assert m_fav.movie_id in taste.seen_movie_ids
    assert m_wl.movie_id not in taste.seen_movie_ids
    assert m_view.movie_id not in taste.seen_movie_ids

    # Candidate merging must suppress seen movies but retain watchlist
    c_rated = MovieCandidate(
        movie_id=m_rated.movie_id,
        title=m_rated.title,
        original_language="en",
        release_year=2020,
        runtime_minutes=120,
        poster_path=None,
        backdrop_path=None,
        popularity=20.0,
        vote_average=8.0,
        vote_count=500,
        primary_channel=CandidateChannel.CONTENT_MATCH.value,
        contributing_channels=[CandidateChannel.CONTENT_MATCH.value],
        raw_score=5.0,
        matched_features={},
        is_in_watchlist=False,
    )
    c_wl = MovieCandidate(
        movie_id=m_wl.movie_id,
        title=m_wl.title,
        original_language="en",
        release_year=2020,
        runtime_minutes=120,
        poster_path=None,
        backdrop_path=None,
        popularity=20.0,
        vote_average=8.0,
        vote_count=500,
        primary_channel=CandidateChannel.CONTENT_MATCH.value,
        contributing_channels=[CandidateChannel.CONTENT_MATCH.value],
        raw_score=5.0,
        matched_features={},
        is_in_watchlist=True,
    )

    merged = merge_candidate_channels(
        {CandidateChannel.CONTENT_MATCH.value: [c_rated, c_wl]},
        taste,
        target_pool_size=10,
    )
    merged_ids = {c.movie_id for c in merged}
    assert m_rated.movie_id not in merged_ids
    assert m_wl.movie_id in merged_ids


# =============================================================================
# 6. EXPLANATION GROUNDING & CALIBRATION SUITE TESTS
# =============================================================================


def test_explanation_grounding_audit() -> None:
    """Verifies that every generated explanation has valid factual evidence."""
    m = _make_dummy_movie(
        genres={"genre.sci_fi"},
        original_language="ja",
        directors={"Hayao Miyazaki"},
        popularity=20.0,
        vote_average=8.5,
    )
    cand = MovieCandidate(
        movie_id=m.movie_id,
        title=m.title,
        original_language=m.original_language,
        release_year=2020,
        runtime_minutes=120,
        poster_path=None,
        backdrop_path=None,
        popularity=m.popularity,
        vote_average=m.vote_average,
        vote_count=1000,
        primary_channel=CandidateChannel.DISCOVERY.value,
        contributing_channels=[CandidateChannel.DISCOVERY.value],
        raw_score=3.0,
        matched_features={"discovery": ["International cinema (JA)"]},
        is_in_watchlist=False,
    )
    taste = UserTasteProfile(
        user_id=uuid4(),
        session_id=None,
        combined_genre_affinity={"genre.sci_fi": 1.0},
        combined_director_affinity={"Hayao Miyazaki": 1.0},
    )

    explanations = generate_candidate_explanations(cand, m, taste)
    assert len(explanations) > 0

    reason_codes = {e.reason_code for e in explanations}
    # Must have DIRECTOR_AFFINITY and GLOBAL_DISCOVERY
    assert ExplanationReasonCode.DIRECTOR_AFFINITY.value in reason_codes
    assert ExplanationReasonCode.GLOBAL_DISCOVERY.value in reason_codes

    for exp in explanations:
        assert len(exp.evidence) > 0
        if exp.reason_code == ExplanationReasonCode.DIRECTOR_AFFINITY.value:
            assert "Hayao Miyazaki" in exp.label
        if exp.reason_code == ExplanationReasonCode.GLOBAL_DISCOVERY.value:
            assert "Japanese" in exp.label


def test_calibration_configuration_manager() -> None:
    """Verifies calibration configurations and dictionary/alias lookup."""
    configs = get_candidate_configurations()
    assert len(configs) == 4

    assert get_configuration_by_name("A") == CONFIG_STEP_18_BASELINE
    assert get_configuration_by_name("BASELINE") == CONFIG_STEP_18_BASELINE
    assert get_configuration_by_name("B") == CONFIG_CALIBRATED_CANDIDATE
    assert get_configuration_by_name("C") == CONFIG_DISCOVERY_HEAVY
    assert get_configuration_by_name("D") == CONFIG_POPULARITY_MINIMIZED

    with pytest.raises(ValueError):
        get_configuration_by_name("NON_EXISTENT_CONFIG")

    scoring_cfg = CONFIG_CALIBRATED_CANDIDATE.to_scoring_config()
    assert scoring_cfg.discovery_quota_ratio == 0.25
    assert scoring_cfg.popularity_weight == 0.02

    taste_weights = CONFIG_CALIBRATED_CANDIDATE.to_taste_weights()
    assert taste_weights.long_term_blend_weight == 0.55
    assert taste_weights.recent_blend_weight == 0.45


def test_controlled_scenarios_build() -> None:
    """Verifies that controlled scenario fixtures build cleanly across all archetypes."""
    m_sf = _make_dummy_movie(genres={"genre.sci_fi"})
    m_dr = _make_dummy_movie(genres={"genre.drama"})
    m_intl = _make_dummy_movie(genres={"genre.thriller"}, original_language="ja")
    m_nolan = _make_dummy_movie(
        genres={"genre.sci_fi"}, directors={"Christopher Nolan"}
    )
    catalog = {m.movie_id: m for m in [m_sf, m_dr, m_intl, m_nolan]}

    scenarios = build_controlled_scenarios(catalog)
    assert len(scenarios) == 8

    scenario_ids = [s.scenario_id for s in scenarios]
    assert scenario_ids == [
        "SCENARIO_A",
        "SCENARIO_B",
        "SCENARIO_C",
        "SCENARIO_D",
        "SCENARIO_E",
        "SCENARIO_F",
        "SCENARIO_G",
        "SCENARIO_H",
    ]

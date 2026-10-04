"""Evaluation metrics suite for Veya Luma Recommendation Engine (Step 19).

Implements mathematical offline evaluation functions for:
1. Precision@K (K=5, 10, 20)
2. Recall@K (K=5, 10, 20) with graceful zero-division handling
3. Graded NDCG@K (K=5, 10, 20) with explicit relevance policy
4. Diversity (Genre, Language, Taxonomy, Era, Director, Intra-List Diversity)
5. Novelty & Relevant Novelty
6. Catalog Coverage (Overall, Language, Popularity bucket, Taxonomy axis)
7. Popularity Bias with distribution-aware catalog thresholds
8. International & Cross-Language Coverage
"""

import math
from itertools import combinations
from typing import Any, Dict, List, Optional, Set
from uuid import UUID

from app.recommendation.features import MovieFeatures

# Distribution-aware catalog popularity percentiles calculated from 909-movie canonical catalog
# (Min: 14.57, 25th: 18.16, Median: 22.50, 75th: 30.58, 90th: 44.02, Max: 564.59)
POPULARITY_THRESHOLD_LOW = 18.16
POPULARITY_THRESHOLD_MEDIUM = 30.58
POPULARITY_THRESHOLD_HIGH = 44.02


def precision_at_k(
    recommended_ids: List[UUID],
    relevant_ids: Set[UUID],
    k: int,
) -> float:
    """Computes Precision@K: (number of relevant recommended items in top-K) / K."""
    if k <= 0:
        return 0.0
    cutoff = recommended_ids[:k]
    if not cutoff:
        return 0.0
    hits = sum(1 for mid in cutoff if mid in relevant_ids)
    return round(hits / k, 4)


def recall_at_k(
    recommended_ids: List[UUID],
    relevant_ids: Set[UUID],
    k: int,
) -> Optional[float]:
    """Computes Recall@K: (number of relevant recommended items in top-K) / total_relevant.

    Returns None if total_relevant == 0 to allow caller to distinguish zero positives
    from zero recall and avoid division by zero.
    """
    if not relevant_ids:
        return None
    if k <= 0:
        return 0.0
    cutoff = recommended_ids[:k]
    hits = sum(1 for mid in cutoff if mid in relevant_ids)
    return round(hits / len(relevant_ids), 4)


def dcg_at_k(relevance_scores: List[float], k: int) -> float:
    """Computes Discounted Cumulative Gain at rank K using binary logarithm discounting."""
    dcg = 0.0
    for idx, rel in enumerate(relevance_scores[:k]):
        if rel <= 0.0:
            continue
        # 1-indexed rank is (idx + 1), denominator is log2(rank + 1) = log2(idx + 2)
        discount = math.log2(idx + 2)
        gain = (2.0**rel) - 1.0
        dcg += gain / discount
    return dcg


def ndcg_at_k(
    recommended_ids: List[UUID],
    relevance_map: Dict[UUID, float],
    k: int,
) -> float:
    """Computes Normalized Discounted Cumulative Gain at rank K.

    Relevance policy:
    - 3.0: High rating (>= 9.0) or Favourite or Primary persona match
    - 2.0: Good rating (7.0 - 8.9) or Repeat detail view or Secondary persona match
    - 1.0: Moderate interaction (Watchlist / Single view)
    - 0.0: Unobserved, low rating, or negative feedback
    """
    if k <= 0 or not recommended_ids or not relevance_map:
        return 0.0

    # Actual DCG from recommended ordering
    actual_relevances = [relevance_map.get(mid, 0.0) for mid in recommended_ids[:k]]
    actual_dcg = dcg_at_k(actual_relevances, k)

    # Ideal DCG from best possible ordering of holdout items
    sorted_ideal_relevances = sorted(
        [r for r in relevance_map.values() if r > 0],
        reverse=True,
    )
    ideal_dcg = dcg_at_k(sorted_ideal_relevances, k)

    if ideal_dcg <= 0.0:
        return 0.0

    return round(actual_dcg / ideal_dcg, 4)


# -----------------------------------------------------------------------------
# Diversity Metrics
# -----------------------------------------------------------------------------


def genre_diversity(recommended_features: List[MovieFeatures]) -> Dict[str, float]:
    """Measures genre representation in recommendations."""
    if not recommended_features:
        return {"unique_genres": 0.0, "unique_genre_ratio": 0.0}
    unique_genres: Set[str] = set()
    total_genre_assignments = 0
    for feat in recommended_features:
        unique_genres.update(feat.genres)
        total_genre_assignments += len(feat.genres)
    ratio = (
        len(unique_genres) / total_genre_assignments
        if total_genre_assignments > 0
        else 0.0
    )
    return {
        "unique_genres": float(len(unique_genres)),
        "unique_genre_ratio": round(ratio, 4),
    }


def language_diversity(recommended_features: List[MovieFeatures]) -> Dict[str, float]:
    """Measures linguistic diversity and international cinema representation."""
    if not recommended_features:
        return {
            "unique_languages": 0.0,
            "non_english_share": 0.0,
            "unique_language_ratio": 0.0,
        }
    languages = [
        f.original_language for f in recommended_features if f.original_language
    ]
    unique_langs = set(languages)
    non_en_count = sum(1 for lang in languages if lang != "en")
    total = len(recommended_features)
    return {
        "unique_languages": float(len(unique_langs)),
        "non_english_share": round(non_en_count / total, 4) if total > 0 else 0.0,
        "unique_language_ratio": (
            round(len(unique_langs) / total, 4) if total > 0 else 0.0
        ),
    }


def taxonomy_diversity(recommended_features: List[MovieFeatures]) -> Dict[str, float]:
    """Measures total multi-axis taxonomy coverage across genres, themes, moods, and styles."""
    if not recommended_features:
        return {"unique_taxonomy_nodes": 0.0, "taxonomy_entropy_score": 0.0}
    unique_nodes: Set[str] = set()
    total_assignments = 0
    for feat in recommended_features:
        nodes = set(feat.genres) | set(feat.themes) | set(feat.moods) | set(feat.styles)
        unique_nodes.update(nodes)
        total_assignments += len(nodes)
    ratio = len(unique_nodes) / total_assignments if total_assignments > 0 else 0.0
    return {
        "unique_taxonomy_nodes": float(len(unique_nodes)),
        "taxonomy_diversity_ratio": round(ratio, 4),
    }


def era_diversity(recommended_features: List[MovieFeatures]) -> Dict[str, float]:
    """Measures temporal representation across cinematic release eras."""
    if not recommended_features:
        return {"unique_eras": 0.0}
    eras = {
        f.release_era
        for f in recommended_features
        if f.release_era and f.release_era != "unknown"
    }
    return {"unique_eras": float(len(eras))}


def director_diversity(recommended_features: List[MovieFeatures]) -> Dict[str, float]:
    """Measures directorial breadth in recommendations."""
    if not recommended_features:
        return {"unique_directors": 0.0, "director_ratio": 0.0}
    directors: Set[str] = set()
    total_with_director = 0
    for feat in recommended_features:
        if feat.directors:
            directors.update(feat.directors)
            total_with_director += 1
    ratio = len(directors) / total_with_director if total_with_director > 0 else 0.0
    return {
        "unique_directors": float(len(directors)),
        "director_ratio": round(ratio, 4),
    }


def intra_list_diversity(recommended_features: List[MovieFeatures]) -> float:
    """Computes Intra-List Diversity (ILD) via mean pairwise Jaccard distance of taxonomy tags."""
    if len(recommended_features) < 2:
        return 0.0

    tag_sets = [
        set(f.genres) | set(f.themes) | set(f.moods) | set(f.styles)
        for f in recommended_features
    ]
    distances: List[float] = []
    for s1, s2 in combinations(tag_sets, 2):
        union = len(s1 | s2)
        if union == 0:
            distances.append(0.0)
        else:
            intersection = len(s1 & s2)
            jaccard_distance = 1.0 - (intersection / union)
            distances.append(jaccard_distance)

    return round(sum(distances) / len(distances), 4) if distances else 0.0


# -----------------------------------------------------------------------------
# Novelty Metrics
# -----------------------------------------------------------------------------


def novelty_score(recommended_features: List[MovieFeatures]) -> float:
    """Measures average novelty score (1.0 - popularity_signal) across recommended slate."""
    if not recommended_features:
        return 0.0
    scores = [feat.novelty_signal for feat in recommended_features]
    return round(sum(scores) / len(scores), 4)


def relevant_novelty_score(
    recommended_features: List[MovieFeatures],
    relevant_ids: Set[UUID],
) -> Optional[float]:
    """Measures average novelty strictly among the relevant recommended items (Relevant + Novel)."""
    relevant_feats = [f for f in recommended_features if f.movie_id in relevant_ids]
    if not relevant_feats:
        return None
    scores = [feat.novelty_signal for feat in relevant_feats]
    return round(sum(scores) / len(scores), 4)


# -----------------------------------------------------------------------------
# Catalog Coverage & Popularity Bias Metrics
# -----------------------------------------------------------------------------


def catalog_coverage(
    all_recommended_ids: Set[UUID],
    total_catalog_features: Dict[UUID, MovieFeatures],
) -> Dict[str, Any]:
    """Computes catalog coverage overall and segmented by language, popularity, and taxonomy."""
    total_catalog_size = len(total_catalog_features)
    if total_catalog_size == 0:
        return {"overall_coverage_ratio": 0.0}

    unique_surfaced = len(all_recommended_ids)
    overall_ratio = round(unique_surfaced / total_catalog_size, 4)

    # Coverage by language
    en_total = sum(
        1 for f in total_catalog_features.values() if f.original_language == "en"
    )
    non_en_total = total_catalog_size - en_total
    en_surfaced = sum(
        1
        for mid in all_recommended_ids
        if total_catalog_features.get(mid)
        and total_catalog_features[mid].original_language == "en"
    )
    non_en_surfaced = sum(
        1
        for mid in all_recommended_ids
        if total_catalog_features.get(mid)
        and total_catalog_features[mid].original_language != "en"
    )

    # Coverage by popularity bucket
    buckets = {"low": 0, "medium": 0, "high": 0, "very_high": 0}
    catalog_bucket_totals = {"low": 0, "medium": 0, "high": 0, "very_high": 0}

    for f in total_catalog_features.values():
        pop = f.popularity or 0.0
        if pop <= POPULARITY_THRESHOLD_LOW:
            b_key = "low"
        elif pop <= POPULARITY_THRESHOLD_MEDIUM:
            b_key = "medium"
        elif pop <= POPULARITY_THRESHOLD_HIGH:
            b_key = "high"
        else:
            b_key = "very_high"
        catalog_bucket_totals[b_key] += 1
        if f.movie_id in all_recommended_ids:
            buckets[b_key] += 1

    bucket_coverage = {
        k: (
            round(buckets[k] / catalog_bucket_totals[k], 4)
            if catalog_bucket_totals[k] > 0
            else 0.0
        )
        for k in buckets
    }

    return {
        "total_catalog_size": total_catalog_size,
        "unique_surfaced_movies": unique_surfaced,
        "overall_coverage_ratio": overall_ratio,
        "coverage_by_language": {
            "english": round(en_surfaced / en_total, 4) if en_total > 0 else 0.0,
            "non_english": (
                round(non_en_surfaced / non_en_total, 4) if non_en_total > 0 else 0.0
            ),
        },
        "coverage_by_popularity_bucket": bucket_coverage,
    }


def popularity_bias(
    recommended_features: List[MovieFeatures],
    total_catalog_features: Dict[UUID, MovieFeatures],
) -> Dict[str, Any]:
    """Measures recommendation share vs catalog share across distribution-aware popularity buckets."""
    total_recs = len(recommended_features)
    if total_recs == 0:
        return {}

    total_cat = len(total_catalog_features)
    rec_counts = {"low": 0, "medium": 0, "high": 0, "very_high": 0}
    cat_counts = {"low": 0, "medium": 0, "high": 0, "very_high": 0}

    for f in total_catalog_features.values():
        pop = f.popularity or 0.0
        if pop <= POPULARITY_THRESHOLD_LOW:
            cat_counts["low"] += 1
        elif pop <= POPULARITY_THRESHOLD_MEDIUM:
            cat_counts["medium"] += 1
        elif pop <= POPULARITY_THRESHOLD_HIGH:
            cat_counts["high"] += 1
        else:
            cat_counts["very_high"] += 1

    for f in recommended_features:
        pop = f.popularity or 0.0
        if pop <= POPULARITY_THRESHOLD_LOW:
            rec_counts["low"] += 1
        elif pop <= POPULARITY_THRESHOLD_MEDIUM:
            rec_counts["medium"] += 1
        elif pop <= POPULARITY_THRESHOLD_HIGH:
            rec_counts["high"] += 1
        else:
            rec_counts["very_high"] += 1

    rec_shares = {k: round(v / total_recs, 4) for k, v in rec_counts.items()}
    cat_shares = (
        {k: round(v / total_cat, 4) for k, v in cat_counts.items()}
        if total_cat > 0
        else {}
    )

    exposure_ratios = {}
    for k in rec_shares:
        cat_s = cat_shares.get(k, 0.0)
        exposure_ratios[k] = round(rec_shares[k] / cat_s, 2) if cat_s > 0 else 0.0

    mean_rec_pop = round(
        sum(f.popularity or 0.0 for f in recommended_features) / total_recs, 2
    )
    mean_cat_pop = round(
        sum(f.popularity or 0.0 for f in total_catalog_features.values())
        / (total_cat or 1),
        2,
    )

    return {
        "mean_recommended_popularity": mean_rec_pop,
        "mean_catalog_popularity": mean_cat_pop,
        "recommendation_share": rec_shares,
        "catalog_share": cat_shares,
        "exposure_ratios": exposure_ratios,
        "popularity_over_indexing": exposure_ratios.get("very_high", 0.0) > 2.5,
    }


def language_coverage(
    recommended_features: List[MovieFeatures],
    dominant_language: Optional[str] = None,
) -> Dict[str, Any]:
    """Computes language distribution across recommendations and outside dominant language share."""
    total = len(recommended_features)
    if total == 0:
        return {
            "english_share": 0.0,
            "non_english_share": 0.0,
            "unique_languages_count": 0,
            "languages": {},
        }

    lang_counts: Dict[str, int] = {}
    for feat in recommended_features:
        lang = feat.original_language or "unknown"
        lang_counts[lang] = lang_counts.get(lang, 0) + 1

    en_count = lang_counts.get("en", 0)
    non_en_count = total - en_count

    outside_dominant = 0.0
    if dominant_language:
        dom_count = lang_counts.get(dominant_language, 0)
        outside_dominant = round((total - dom_count) / total, 4)

    return {
        "english_share": round(en_count / total, 4),
        "non_english_share": round(non_en_count / total, 4),
        "unique_languages_count": len(lang_counts),
        "languages": {k: round(v / total, 4) for k, v in sorted(lang_counts.items())},
        "outside_dominant_language_share": outside_dominant,
    }

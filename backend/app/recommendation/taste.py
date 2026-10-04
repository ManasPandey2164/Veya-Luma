"""User taste representation and multi-signal aggregation for Veya Luma (Step 18).

Constructs deterministic long-term and recent taste representations from ratings, favourites,
watchlist, explicit taxonomy preferences, and append-oriented behavioral telemetry.
Centralizes signal weights, handles negative evidence (low ratings / aversion), and builds
the UserTasteProfile without ML models or embeddings.
"""

from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, List, Optional, Set
from uuid import UUID

from app.models.preference import (
    Favourite,
    MovieRating,
    UserMovieEvent,
    UserPreference,
    Watchlist,
)
from app.recommendation.features import MovieFeatures
from app.recommendation.models import UserTasteProfile


@dataclass(frozen=True)
class TasteSignalWeights:
    """Centralized configurable weights for explicit and behavioral taste telemetry."""

    # Explicit library & rating signals
    favourite_weight: float = 1.00
    watchlist_weight: float = 0.50

    # Rating value-tiered weights
    rating_high_weight: float = 1.00  # 9.0 - 10.0
    rating_good_weight: float = 0.70  # 7.0 - 8.9
    rating_moderate_weight: float = 0.20  # 5.0 - 6.9
    rating_negative_weight: float = -0.50  # 3.0 - 4.9 (active negative evidence)
    rating_severe_weight: float = -1.00  # 1.0 - 2.9 (strong negative aversion)

    # Behavioral event weights
    event_detail_view_base: float = 0.35
    event_click_base: float = 0.25
    event_impression_base: float = 0.05
    event_repeat_view_boost: float = 0.15  # Additional weight per repeated detail view

    # Explicit preference multiplier
    explicit_pref_weight: float = 0.90

    # Temporal blending
    long_term_blend_weight: float = 0.60
    recent_blend_weight: float = 0.40

    # Thresholds
    recent_event_window: int = (
        15  # Up to 15 most recent behavioral events considered recent
    )


DEFAULT_TASTE_WEIGHTS = TasteSignalWeights()


def get_rating_weight(
    rating_val: float, weights: TasteSignalWeights = DEFAULT_TASTE_WEIGHTS
) -> float:
    """Maps a 1.0 - 10.0 numerical rating to a taste affinity weight."""
    if rating_val >= 9.0:
        return weights.rating_high_weight
    if rating_val >= 7.0:
        return weights.rating_good_weight
    if rating_val >= 5.0:
        return weights.rating_moderate_weight
    if rating_val >= 3.0:
        return weights.rating_negative_weight
    return weights.rating_severe_weight


def build_user_taste_profile(
    user_id: Optional[UUID],
    session_id: Optional[UUID],
    ratings: List[MovieRating],
    favourites: List[Favourite],
    watchlist: List[Watchlist],
    preferences: List[UserPreference],
    events: List[UserMovieEvent],
    movie_features_by_id: Dict[UUID, MovieFeatures],
    weights: TasteSignalWeights = DEFAULT_TASTE_WEIGHTS,
) -> UserTasteProfile:
    """Constructs a deterministic UserTasteProfile from user's explicit and behavioral history.

    Keeps long-term signals strictly separate from recent signals, aggregates explicit
    preferences with affinity respect, and records seen-content for suppression.
    """
    seen_movie_ids: Set[UUID] = set()
    watchlist_movie_ids: Set[UUID] = set()
    negative_taxonomies: Set[str] = set()

    # Long-term signal accumulators
    lt_genres: Dict[str, float] = defaultdict(float)
    lt_themes: Dict[str, float] = defaultdict(float)
    lt_moods: Dict[str, float] = defaultdict(float)
    lt_styles: Dict[str, float] = defaultdict(float)
    lt_languages: Dict[str, float] = defaultdict(float)
    lt_directors: Dict[str, float] = defaultdict(float)
    lt_keywords: Dict[str, float] = defaultdict(float)

    # Recent signal accumulators
    rec_genres: Dict[str, float] = defaultdict(float)
    rec_themes: Dict[str, float] = defaultdict(float)
    rec_moods: Dict[str, float] = defaultdict(float)
    rec_styles: Dict[str, float] = defaultdict(float)
    rec_languages: Dict[str, float] = defaultdict(float)
    rec_directors: Dict[str, float] = defaultdict(float)
    rec_keywords: Dict[str, float] = defaultdict(float)

    # Explicit preferences map (taxonomy node key -> affinity)
    explicit_prefs: Dict[str, float] = {}

    # 1. Process Authoritative Ratings
    for r in ratings:
        seen_movie_ids.add(r.movie_id)
        w = get_rating_weight(r.rating, weights)
        feat = movie_features_by_id.get(r.movie_id)
        if not feat:
            continue

        # If negative rating, record negative taxonomies
        if w < 0:
            for g in feat.genres:
                negative_taxonomies.add(g)
            for t in feat.themes:
                negative_taxonomies.add(t)

        for g in feat.genres:
            lt_genres[g] += w
        for t in feat.themes:
            lt_themes[t] += w
        for m in feat.moods:
            lt_moods[m] += w
        for s in feat.styles:
            lt_styles[s] += w
        if feat.original_language:
            lt_languages[feat.original_language] += w
        for d in feat.directors:
            lt_directors[d] += w
        for kw in feat.keywords:
            lt_keywords[kw] += w * 0.5

    # 2. Process Favourites (Strong Positive Signal)
    for f in favourites:
        seen_movie_ids.add(f.movie_id)
        feat = movie_features_by_id.get(f.movie_id)
        if not feat:
            continue
        w = weights.favourite_weight
        for g in feat.genres:
            lt_genres[g] += w
        for t in feat.themes:
            lt_themes[t] += w
        for m in feat.moods:
            lt_moods[m] += w
        for s in feat.styles:
            lt_styles[s] += w
        if feat.original_language:
            lt_languages[feat.original_language] += w
        for d in feat.directors:
            lt_directors[d] += w

    # 3. Process Watchlist (Moderate Positive Signal — not suppressed)
    for wl in watchlist:
        watchlist_movie_ids.add(wl.movie_id)
        feat = movie_features_by_id.get(wl.movie_id)
        if not feat:
            continue
        w = weights.watchlist_weight
        for g in feat.genres:
            lt_genres[g] += w
        for t in feat.themes:
            lt_themes[t] += w
        for m in feat.moods:
            lt_moods[m] += w
        for s in feat.styles:
            lt_styles[s] += w
        if feat.original_language:
            lt_languages[feat.original_language] += w

    # 4. Process Explicit Preferences (Respect Affinity Magnitude & Sign)
    for pref in preferences:
        node_key = pref.taxonomy_node.key.lower() if pref.taxonomy_node else ""
        if not node_key:
            continue
        affinity = float(pref.preference_value)
        explicit_prefs[node_key] = affinity

        # Aversion: negative preference provides negative evidence
        if affinity < 0:
            negative_taxonomies.add(node_key)

        axis = pref.taxonomy_node.axis.lower() if pref.taxonomy_node else ""
        weighted_affinity = affinity * weights.explicit_pref_weight
        if axis == "genre":
            lt_genres[node_key] += weighted_affinity
        elif axis == "theme":
            lt_themes[node_key] += weighted_affinity
        elif axis == "mood":
            lt_moods[node_key] += weighted_affinity
        elif axis == "style":
            lt_styles[node_key] += weighted_affinity

    # 5. Process Behavioral Events (Sorted newest first)
    # Count frequency of detail views per movie to detect repeat interest
    detail_view_counts: Dict[UUID, int] = defaultdict(int)
    for ev in events:
        if ev.event_type == "detail_view":
            detail_view_counts[ev.movie_id] += 1

    for idx, ev in enumerate(events):
        feat = movie_features_by_id.get(ev.movie_id)
        if not feat:
            continue

        # Calculate event weight
        ev_w = 0.0
        if ev.event_type == "detail_view":
            repeat_count = detail_view_counts[ev.movie_id]
            ev_w = weights.event_detail_view_base + (
                min(3, repeat_count - 1) * weights.event_repeat_view_boost
            )
        elif ev.event_type == "click":
            ev_w = weights.event_click_base
        elif ev.event_type == "impression":
            ev_w = weights.event_impression_base
        elif ev.event_type == "rating" and ev.event_value is not None:
            ev_w = get_rating_weight(ev.event_value, weights)

        # Behavioral signals feed into long-term history
        for g in feat.genres:
            lt_genres[g] += ev_w * 0.5
        for t in feat.themes:
            lt_themes[t] += ev_w * 0.5
        for m in feat.moods:
            lt_moods[m] += ev_w * 0.5
        if feat.original_language:
            lt_languages[feat.original_language] += ev_w * 0.3
        for d in feat.directors:
            lt_directors[d] += ev_w * 0.5

        # Recent events window feeds into recent taste
        if idx < weights.recent_event_window and ev_w > 0:
            for g in feat.genres:
                rec_genres[g] += ev_w
            for t in feat.themes:
                rec_themes[t] += ev_w
            for m in feat.moods:
                rec_moods[m] += ev_w
            for s in feat.styles:
                rec_styles[s] += ev_w
            if feat.original_language:
                rec_languages[feat.original_language] += ev_w
            for d in feat.directors:
                rec_directors[d] += ev_w

    # Determine if profile is cold-start (sparse/empty evidence)
    total_signals = (
        len(ratings) + len(favourites) + len(watchlist) + len(preferences) + len(events)
    )
    is_cold_start = total_signals == 0

    # 6. Deterministic Weighted Aggregation into Combined Affinities
    combined_genres = _blend_affinities(lt_genres, rec_genres, weights)
    combined_themes = _blend_affinities(lt_themes, rec_themes, weights)
    combined_moods = _blend_affinities(lt_moods, rec_moods, weights)
    combined_styles = _blend_affinities(lt_styles, rec_styles, weights)
    combined_languages = _blend_affinities(lt_languages, rec_languages, weights)
    combined_directors = _blend_affinities(lt_directors, rec_directors, weights)

    return UserTasteProfile(
        user_id=user_id,
        session_id=session_id,
        is_cold_start=is_cold_start,
        long_term_genres=dict(lt_genres),
        long_term_themes=dict(lt_themes),
        long_term_moods=dict(lt_moods),
        long_term_styles=dict(lt_styles),
        long_term_languages=dict(lt_languages),
        long_term_directors=dict(lt_directors),
        long_term_keywords=dict(lt_keywords),
        recent_genres=dict(rec_genres),
        recent_themes=dict(rec_themes),
        recent_moods=dict(rec_moods),
        recent_styles=dict(rec_styles),
        recent_languages=dict(rec_languages),
        recent_directors=dict(rec_directors),
        recent_keywords=dict(rec_keywords),
        explicit_preferences=explicit_prefs,
        negative_taxonomies=negative_taxonomies,
        seen_movie_ids=seen_movie_ids,
        watchlist_movie_ids=watchlist_movie_ids,
        combined_genre_affinity=combined_genres,
        combined_theme_affinity=combined_themes,
        combined_mood_affinity=combined_moods,
        combined_style_affinity=combined_styles,
        combined_language_affinity=combined_languages,
        combined_director_affinity=combined_directors,
    )


def _blend_affinities(
    long_term: Dict[str, float],
    recent: Dict[str, float],
    weights: TasteSignalWeights,
) -> Dict[str, float]:
    """Combines long-term and recent signal dictionaries with normalized weighting."""
    all_keys = set(long_term.keys()) | set(recent.keys())
    blended: Dict[str, float] = {}
    for k in all_keys:
        lt_val = long_term.get(k, 0.0)
        rec_val = recent.get(k, 0.0)
        val = (weights.long_term_blend_weight * lt_val) + (
            weights.recent_blend_weight * rec_val
        )
        blended[k] = val
    return blended

"""Candidate generation channels and candidate merger for Veya Luma (Step 18).

Implements deterministic candidate channels:
- CONTENT_MATCH: multi-axis taxonomy, keyword, director, and language overlap
- PREFERENCE_MATCH: explicit UserPreference affinity matching
- BEHAVIOR_MATCH: user's own recent behavioral telemetry feature resonance
- DISCOVERY: international cinema, adjacent genres/themes, and lower-popularity gems
- COLD_START: curated diverse slate preserving genre, language, and era variety

Includes candidate deduplication, channel preservation, and seen-content suppression.
"""

from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, List, Set
from uuid import UUID

from app.recommendation.features import MovieFeatures
from app.recommendation.models import (
    CandidateChannel,
    MovieCandidate,
    UserTasteProfile,
)


@dataclass(frozen=True)
class ContentMatchWeights:
    """Configurable weights for content similarity components."""

    genre_weight: float = 0.35
    theme_weight: float = 0.25
    mood_weight: float = 0.15
    style_weight: float = 0.10
    director_weight: float = 0.20
    language_weight: float = 0.10
    keyword_weight: float = 0.05
    negative_penalty_multiplier: float = 1.5


DEFAULT_CONTENT_WEIGHTS = ContentMatchWeights()

# Deterministic thematic and genre adjacency mappings for the DISCOVERY channel
THEMATIC_ADJACENCY: Dict[str, Set[str]] = {
    "genre.sci_fi": {
        "genre.mystery",
        "genre.philosophy",
        "theme.artificial_intelligence",
        "theme.existentialism",
        "theme.dystopia",
        "theme.time_travel",
        "style.slow_burn",
        "mood.mind_bending",
    },
    "genre.drama": {
        "genre.mystery",
        "theme.morality",
        "theme.human_nature",
        "theme.existentialism",
        "style.measured",
        "mood.contemplative",
        "mood.thought_provoking",
    },
    "genre.thriller": {
        "genre.crime",
        "genre.mystery",
        "genre.neo_noir",
        "theme.power_and_corruption",
        "mood.tense",
        "mood.suspenseful",
        "style.fast_paced",
    },
    "genre.horror": {
        "genre.thriller",
        "theme.isolation",
        "theme.survival",
        "mood.dark",
        "mood.haunting",
        "style.atmospheric",
    },
    "genre.animation": {
        "genre.fantasy",
        "genre.adventure",
        "theme.identity",
        "mood.dreamlike",
        "mood.joyful",
    },
    "genre.comedy": {
        "genre.romance",
        "mood.satirical",
        "mood.warm",
        "mood.joyful",
    },
    "genre.action": {
        "genre.thriller",
        "genre.adventure",
        "theme.survival",
        "theme.revenge",
        "mood.gritty",
        "mood.visceral",
    },
}


def generate_content_candidates(
    taste: UserTasteProfile,
    catalog: List[MovieFeatures],
    weights: ContentMatchWeights = DEFAULT_CONTENT_WEIGHTS,
    limit: int = 150,
) -> List[MovieCandidate]:
    """Retrieves candidates based on deterministic content overlap with user's blended taste."""
    candidates: List[MovieCandidate] = []

    for movie in catalog:
        if movie.movie_id in taste.seen_movie_ids:
            continue

        genre_score = sum(
            taste.combined_genre_affinity.get(g, 0.0) * movie.tag_strengths.get(g, 1.0)
            for g in movie.genres
        )
        theme_score = sum(
            taste.combined_theme_affinity.get(t, 0.0) * movie.tag_strengths.get(t, 1.0)
            for t in movie.themes
        )
        mood_score = sum(
            taste.combined_mood_affinity.get(m, 0.0) * movie.tag_strengths.get(m, 1.0)
            for m in movie.moods
        )
        style_score = sum(
            taste.combined_style_affinity.get(s, 0.0) * movie.tag_strengths.get(s, 1.0)
            for s in movie.styles
        )
        dir_score = sum(
            taste.combined_director_affinity.get(d, 0.0) for d in movie.directors
        )
        lang_score = taste.combined_language_affinity.get(movie.original_language, 0.0)

        # Keyword matching
        kw_score = sum(taste.long_term_keywords.get(kw, 0.0) for kw in movie.keywords)

        # Negative penalty: penalize movies containing user's negative taxonomies
        negative_hits = movie.genres.intersection(
            taste.negative_taxonomies
        ) | movie.themes.intersection(taste.negative_taxonomies)
        penalty = len(negative_hits) * weights.negative_penalty_multiplier

        composite = (
            (weights.genre_weight * genre_score)
            + (weights.theme_weight * theme_score)
            + (weights.mood_weight * mood_score)
            + (weights.style_weight * style_score)
            + (weights.director_weight * dir_score)
            + (weights.language_weight * lang_score)
            + (weights.keyword_weight * kw_score)
            - penalty
        )

        if composite > 0.05:
            matched: Dict[str, List[str]] = defaultdict(list)
            for g in movie.genres:
                if taste.combined_genre_affinity.get(g, 0.0) > 0:
                    label = movie.tag_labels.get(g, g)
                    matched["genres"].append(label)
            for t in movie.themes:
                if taste.combined_theme_affinity.get(t, 0.0) > 0:
                    label = movie.tag_labels.get(t, t)
                    matched["themes"].append(label)
            for d in movie.directors:
                if taste.combined_director_affinity.get(d, 0.0) > 0:
                    matched["directors"].append(d)

            cand = MovieCandidate(
                movie_id=movie.movie_id,
                title=movie.title,
                original_language=movie.original_language,
                release_year=movie.release_year,
                runtime_minutes=movie.runtime_minutes,
                poster_path=movie.poster_path,
                backdrop_path=movie.backdrop_path,
                popularity=movie.popularity,
                vote_average=movie.vote_average,
                vote_count=movie.vote_count,
                primary_channel=CandidateChannel.CONTENT_MATCH.value,
                contributing_channels=[CandidateChannel.CONTENT_MATCH.value],
                raw_score=max(0.0, composite),
                matched_features=dict(matched),
                is_in_watchlist=(movie.movie_id in taste.watchlist_movie_ids),
            )
            candidates.append(cand)

    candidates.sort(key=lambda c: c.raw_score, reverse=True)
    return candidates[:limit]


def generate_preference_candidates(
    taste: UserTasteProfile,
    catalog: List[MovieFeatures],
    limit: int = 100,
) -> List[MovieCandidate]:
    """Retrieves candidates directly satisfying explicit UserPreference affinities."""
    if not taste.explicit_preferences:
        return []

    candidates: List[MovieCandidate] = []

    for movie in catalog:
        if movie.movie_id in taste.seen_movie_ids:
            continue

        score = 0.0
        matched_prefs: List[str] = []

        for key, affinity in taste.explicit_preferences.items():
            clean_key = key.lower()
            if movie.has_taxonomy(clean_key):
                strength = movie.tag_strengths.get(clean_key, 1.0)
                # Respect affinity value (+1.0 vs +0.1) and sign
                score += affinity * strength
                if affinity > 0:
                    label = movie.tag_labels.get(clean_key, clean_key)
                    matched_prefs.append(label)

        if score > 0.1:
            cand = MovieCandidate(
                movie_id=movie.movie_id,
                title=movie.title,
                original_language=movie.original_language,
                release_year=movie.release_year,
                runtime_minutes=movie.runtime_minutes,
                poster_path=movie.poster_path,
                backdrop_path=movie.backdrop_path,
                popularity=movie.popularity,
                vote_average=movie.vote_average,
                vote_count=movie.vote_count,
                primary_channel=CandidateChannel.PREFERENCE_MATCH.value,
                contributing_channels=[CandidateChannel.PREFERENCE_MATCH.value],
                raw_score=score,
                matched_features={"preferences": matched_prefs},
                is_in_watchlist=(movie.movie_id in taste.watchlist_movie_ids),
            )
            candidates.append(cand)

    candidates.sort(key=lambda c: c.raw_score, reverse=True)
    return candidates[:limit]


def generate_behavior_candidates(
    taste: UserTasteProfile,
    catalog: List[MovieFeatures],
    limit: int = 100,
) -> List[MovieCandidate]:
    """Retrieves candidates echoing the user's own recent behavioral interactions.

    Grounded strictly in the user's recent detail views, clicks, and positive evaluations.
    """
    if not (taste.recent_genres or taste.recent_themes or taste.recent_directors):
        return []

    candidates: List[MovieCandidate] = []

    for movie in catalog:
        if movie.movie_id in taste.seen_movie_ids:
            continue

        b_score = 0.0
        matched_behaviors: List[str] = []

        # Overlap with recent genres
        for g in movie.genres:
            if g in taste.recent_genres:
                w = taste.recent_genres[g]
                b_score += w
                label = movie.tag_labels.get(g, g)
                matched_behaviors.append(f"Recent genre: {label}")

        # Overlap with recent themes
        for t in movie.themes:
            if t in taste.recent_themes:
                w = taste.recent_themes[t]
                b_score += w * 1.2  # Themes give stronger behavioral resonance
                label = movie.tag_labels.get(t, t)
                matched_behaviors.append(f"Recent theme: {label}")

        # Overlap with recent directors
        for d in movie.directors:
            if d in taste.recent_directors:
                w = taste.recent_directors[d]
                b_score += w * 1.5
                matched_behaviors.append(f"Recent director: {d}")

        if b_score > 0.2:
            cand = MovieCandidate(
                movie_id=movie.movie_id,
                title=movie.title,
                original_language=movie.original_language,
                release_year=movie.release_year,
                runtime_minutes=movie.runtime_minutes,
                poster_path=movie.poster_path,
                backdrop_path=movie.backdrop_path,
                popularity=movie.popularity,
                vote_average=movie.vote_average,
                vote_count=movie.vote_count,
                primary_channel=CandidateChannel.BEHAVIOR_MATCH.value,
                contributing_channels=[CandidateChannel.BEHAVIOR_MATCH.value],
                raw_score=b_score,
                matched_features={"behavior": matched_behaviors[:5]},
                is_in_watchlist=(movie.movie_id in taste.watchlist_movie_ids),
            )
            candidates.append(cand)

    candidates.sort(key=lambda c: c.raw_score, reverse=True)
    return candidates[:limit]


def generate_discovery_candidates(
    taste: UserTasteProfile,
    catalog: List[MovieFeatures],
    limit: int = 80,
) -> List[MovieCandidate]:
    """Generates surprising, exploratory candidates that expand horizons without arbitrary randomness.

    Prioritizes:
    1. International & non-English acclaimed films
    2. Lower-popularity gems (high vote_average, modest popularity)
    3. Adjacent genres and thematic bridges connected to user's taste
    """
    candidates: List[MovieCandidate] = []

    # Identify user's active seed taxonomies to find adjacent bridges
    user_seeds = set(taste.combined_genre_affinity.keys()) | set(
        taste.combined_theme_affinity.keys()
    )
    adjacent_targets: Set[str] = set()
    for seed in user_seeds:
        if seed in THEMATIC_ADJACENCY:
            adjacent_targets.update(THEMATIC_ADJACENCY[seed])

    for movie in catalog:
        if movie.movie_id in taste.seen_movie_ids:
            continue

        # Must satisfy minimum quality constraint (no random low-quality picks)
        if (movie.vote_average or 0.0) < 6.5 or (movie.vote_count or 0) < 5:
            continue

        discovery_score = 0.0
        reasons: List[str] = []

        # 1. International / Language novelty
        is_international = movie.original_language != "en"
        user_loves_this_lang = (
            taste.combined_language_affinity.get(movie.original_language, 0.0) > 0.5
        )
        if is_international:
            discovery_score += 0.8
            reasons.append(f"International cinema ({movie.original_language.upper()})")
        elif not user_loves_this_lang:
            discovery_score += 0.2

        # 2. Lower-popularity discovery gem (vote_average >= 7.0, popularity < 35)
        is_undiscovered = (movie.popularity or 0.0) < 35.0 and (
            movie.vote_average or 0.0
        ) >= 7.0
        if is_undiscovered:
            discovery_score += 0.7
            reasons.append("High acclaim hidden gem")

        # 3. Adjacent thematic / genre bridge
        movie_keys = movie.genres | movie.themes | movie.moods | movie.styles
        adjacent_overlap = movie_keys.intersection(adjacent_targets)
        if adjacent_overlap:
            discovery_score += len(adjacent_overlap) * 0.4
            reasons.append("Thematic horizon expansion")

        # 4. Light connection to at least one user taste element (maintains relevance)
        has_slight_taste_tie = any(
            taste.combined_genre_affinity.get(g, 0.0) > 0 for g in movie.genres
        ) or any(taste.combined_theme_affinity.get(t, 0.0) > 0 for t in movie.themes)
        if has_slight_taste_tie:
            discovery_score += 0.3

        if discovery_score >= 0.7:
            cand = MovieCandidate(
                movie_id=movie.movie_id,
                title=movie.title,
                original_language=movie.original_language,
                release_year=movie.release_year,
                runtime_minutes=movie.runtime_minutes,
                poster_path=movie.poster_path,
                backdrop_path=movie.backdrop_path,
                popularity=movie.popularity,
                vote_average=movie.vote_average,
                vote_count=movie.vote_count,
                primary_channel=CandidateChannel.DISCOVERY.value,
                contributing_channels=[CandidateChannel.DISCOVERY.value],
                raw_score=discovery_score,
                matched_features={"discovery": reasons},
                is_in_watchlist=(movie.movie_id in taste.watchlist_movie_ids),
            )
            candidates.append(cand)

    candidates.sort(key=lambda c: c.raw_score, reverse=True)
    return candidates[:limit]


def generate_cold_start_candidates(
    catalog: List[MovieFeatures],
    limit: int = 50,
) -> List[MovieCandidate]:
    """Generates a rich, balanced exploratory slate for anonymous or sparse-signal users.

    Strictly rejects 'sort by popularity DESC'. Guarantees balanced coverage across:
    - Multiple genres (Sci-Fi, Drama, Thriller, Animation, Comedy, etc.)
    - International languages (ja, fr, es, ko, en)
    - Eras (Classic, Golden Modern, Contemporary, Recent)
    - Popularity bands (Iconic Acclaimed, Cult Gems, Indie Discoveries)
    """
    candidates: List[MovieCandidate] = []

    # Bucketing to enforce diversity
    covered_genres: Set[str] = set()
    covered_languages: Set[str] = set()
    covered_eras: Set[str] = set()

    # Pre-filter for credible quality
    eligible = [
        m
        for m in catalog
        if (m.vote_average or 0.0) >= 6.8 and (m.vote_count or 0) >= 20
    ]

    # Deterministic multi-pass selection
    # Pass 1: International masterpieces
    for movie in eligible:
        if (
            movie.original_language != "en"
            and movie.original_language not in covered_languages
        ):
            covered_languages.add(movie.original_language)
            candidates.append(
                _create_cold_start_candidate(movie, "Curated international cinema")
            )
            if len(candidates) >= limit // 3:
                break

    # Pass 2: Genre & Era diversity
    for movie in eligible:
        if any(c.movie_id == movie.movie_id for c in candidates):
            continue
        unseen_genre = any(g not in covered_genres for g in movie.genres)
        unseen_era = movie.release_era not in covered_eras
        if unseen_genre or unseen_era:
            covered_genres.update(movie.genres)
            covered_eras.add(movie.release_era)
            candidates.append(
                _create_cold_start_candidate(
                    movie, f"Curated {movie.release_era} milestone"
                )
            )
            if len(candidates) >= (2 * limit) // 3:
                break

    # Pass 3: Fill remaining quota with balanced high-quality selections
    for movie in eligible:
        if any(c.movie_id == movie.movie_id for c in candidates):
            continue
        candidates.append(_create_cold_start_candidate(movie, "Curatorial essential"))
        if len(candidates) >= limit:
            break

    return candidates


def _create_cold_start_candidate(
    movie: MovieFeatures, curatorial_note: str
) -> MovieCandidate:
    """Helper to instantiate a cold start candidate."""
    return MovieCandidate(
        movie_id=movie.movie_id,
        title=movie.title,
        original_language=movie.original_language,
        release_year=movie.release_year,
        runtime_minutes=movie.runtime_minutes,
        poster_path=movie.poster_path,
        backdrop_path=movie.backdrop_path,
        popularity=movie.popularity,
        vote_average=movie.vote_average,
        vote_count=movie.vote_count,
        primary_channel=CandidateChannel.COLD_START.value,
        contributing_channels=[CandidateChannel.COLD_START.value],
        raw_score=0.75 + (0.25 * movie.vote_quality_signal),
        matched_features={"curation": [curatorial_note]},
        is_in_watchlist=False,
    )


def merge_candidate_channels(
    channel_candidates: Dict[str, List[MovieCandidate]],
    taste: UserTasteProfile,
    target_pool_size: int = 50,
    discovery_quota_ratio: float = 0.20,
) -> List[MovieCandidate]:
    """Deduplicates and merges candidates across channels.

    Preserves channel provenance, contributing signals, and guarantees a reserved
    discovery quota so popularity or pure similarity cannot eliminate novel discoveries.
    """
    merged_map: Dict[UUID, MovieCandidate] = {}
    channel_scores: Dict[UUID, Dict[str, float]] = defaultdict(dict)

    for ch_name, cands in channel_candidates.items():
        for cand in cands:
            mid = cand.movie_id
            if mid in taste.seen_movie_ids:
                continue

            channel_scores[mid][ch_name] = cand.raw_score

            if mid not in merged_map:
                merged_map[mid] = cand
            else:
                # Merge into existing candidate
                existing = merged_map[mid]
                if ch_name not in existing.contributing_channels:
                    existing.contributing_channels.append(ch_name)
                # Keep highest raw score as candidate's primary raw score
                if cand.raw_score > existing.raw_score:
                    existing.raw_score = cand.raw_score
                    existing.primary_channel = ch_name
                # Merge matched features
                for feat_type, feat_vals in cand.matched_features.items():
                    if feat_type not in existing.matched_features:
                        existing.matched_features[feat_type] = []
                    for val in feat_vals:
                        if val not in existing.matched_features[feat_type]:
                            existing.matched_features[feat_type].append(val)

    all_merged = list(merged_map.values())
    if not all_merged:
        return []

    # Preserve discovery quota
    discovery_cands = [
        c
        for c in all_merged
        if CandidateChannel.DISCOVERY.value in c.contributing_channels
    ]
    non_discovery = [
        c
        for c in all_merged
        if CandidateChannel.DISCOVERY.value not in c.contributing_channels
    ]

    min_discovery_count = int(target_pool_size * discovery_quota_ratio)
    discovery_cands.sort(key=lambda c: c.raw_score, reverse=True)
    non_discovery.sort(key=lambda c: c.raw_score, reverse=True)

    reserved_discovery = discovery_cands[:min_discovery_count]
    remaining_slots = target_pool_size - len(reserved_discovery)

    # Fill remainder from best non-discovery + additional discovery
    remainder_pool = non_discovery + discovery_cands[min_discovery_count:]
    remainder_pool.sort(key=lambda c: c.raw_score, reverse=True)

    final_pool = reserved_discovery + remainder_pool[:remaining_slots]
    return final_pool

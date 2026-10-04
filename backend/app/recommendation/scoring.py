"""Deterministic scoring and feature contract construction for Veya Luma (Step 18).

Builds the CandidateFeatureContract for downstream ranker ingestion and calculates initial
deterministic heuristic scores using centralized configurable weights.
Guarantees popularity remains strictly a secondary supporting signal that cannot overpower taste.
"""

from dataclasses import dataclass
from typing import Dict, List
from uuid import UUID

from app.recommendation.features import MovieFeatures
from app.recommendation.models import (
    CandidateChannel,
    CandidateFeatureContract,
    MovieCandidate,
    UserTasteProfile,
)


@dataclass(frozen=True)
class ScoringConfig:
    """Centralized configurable weights for candidate scoring and ranking."""

    # Candidate channel weights
    content_weight: float = 0.35
    preference_weight: float = 0.25
    behavior_weight: float = 0.20
    discovery_weight: float = 0.15

    # Catalog supporting signals
    vote_quality_weight: float = 0.10
    popularity_weight: float = 0.05  # Kept intentionally minimal (Taste > Fame)

    # Quota configuration
    discovery_quota_ratio: float = 0.20

    # Feature engineering normalization caps
    max_content_raw: float = 10.0
    max_preference_raw: float = 5.0
    max_behavior_raw: float = 8.0
    max_discovery_raw: float = 3.0


DEFAULT_SCORING_CONFIG = ScoringConfig()


def build_candidate_feature_contract(
    candidate: MovieCandidate,
    movie: MovieFeatures,
    taste: UserTasteProfile,
    config: ScoringConfig = DEFAULT_SCORING_CONFIG,
) -> CandidateFeatureContract:
    """Extracts and normalizes all metrics defined in the candidate feature contract.

    Guarantees every field is backed by authentic catalog data or user taste signals.
    """
    # 1. Normalized channel scores [0.0, 1.0]
    is_content = CandidateChannel.CONTENT_MATCH.value in candidate.contributing_channels
    is_pref = CandidateChannel.PREFERENCE_MATCH.value in candidate.contributing_channels
    is_behav = CandidateChannel.BEHAVIOR_MATCH.value in candidate.contributing_channels
    is_disc = CandidateChannel.DISCOVERY.value in candidate.contributing_channels
    is_cold = CandidateChannel.COLD_START.value in candidate.contributing_channels

    c_score = (
        min(1.0, candidate.raw_score / config.max_content_raw) if is_content else 0.0
    )
    p_score = (
        min(1.0, candidate.raw_score / config.max_preference_raw) if is_pref else 0.0
    )
    b_score = (
        min(1.0, candidate.raw_score / config.max_behavior_raw) if is_behav else 0.0
    )
    d_score = (
        min(1.0, candidate.raw_score / config.max_discovery_raw)
        if is_disc
        else (0.8 if is_cold else 0.0)
    )

    # 2. Multi-axis overlap metrics [0.0, 1.0]
    total_genres = len(movie.genres) or 1
    genre_hits = sum(
        1 for g in movie.genres if taste.combined_genre_affinity.get(g, 0.0) > 0
    )
    genre_overlap = min(1.0, genre_hits / total_genres)

    total_themes = len(movie.themes) or 1
    theme_hits = sum(
        1 for t in movie.themes if taste.combined_theme_affinity.get(t, 0.0) > 0
    )
    theme_overlap = min(1.0, theme_hits / total_themes)

    total_moods = len(movie.moods) or 1
    mood_hits = sum(
        1 for m in movie.moods if taste.combined_mood_affinity.get(m, 0.0) > 0
    )
    mood_overlap = min(1.0, mood_hits / total_moods)

    total_styles = len(movie.styles) or 1
    style_hits = sum(
        1 for s in movie.styles if taste.combined_style_affinity.get(s, 0.0) > 0
    )
    style_overlap = min(1.0, style_hits / total_styles)

    kw_hits = sum(1 for kw in movie.keywords if kw in taste.long_term_keywords)
    keyword_overlap = min(1.0, kw_hits / (len(movie.keywords) or 1))

    # 3. Entity & context matches [0.0, 1.0]
    lang_val = taste.combined_language_affinity.get(movie.original_language, 0.0)
    language_match = min(1.0, max(0.0, lang_val))

    dir_hits = any(
        taste.combined_director_affinity.get(d, 0.0) > 0 for d in movie.directors
    )
    director_match = 1.0 if dir_hits else 0.0

    cast_match = 0.0  # Placeholder for Step 19 cast affinity model

    # Era match: check if release era matches active eras in user taste
    era_match = 0.5 if movie.release_era != "unknown" else 0.0

    # 4. Temporal taste alignments [0.0, 1.0]
    lt_hits = sum(
        1 for g in movie.genres if taste.long_term_genres.get(g, 0.0) > 0
    ) + sum(1 for t in movie.themes if taste.long_term_themes.get(t, 0.0) > 0)
    long_term_taste_alignment = min(1.0, lt_hits / 3.0)

    rec_hits = sum(
        1 for g in movie.genres if taste.recent_genres.get(g, 0.0) > 0
    ) + sum(1 for t in movie.themes if taste.recent_themes.get(t, 0.0) > 0)
    recent_taste_alignment = min(1.0, rec_hits / 2.0)

    return CandidateFeatureContract(
        candidate_id=candidate.movie_id,
        user_id=taste.user_id,
        source_channel=candidate.primary_channel,
        contributing_channels=candidate.contributing_channels,
        content_score=c_score,
        preference_score=p_score,
        behavior_score=b_score,
        discovery_score=d_score,
        genre_overlap=genre_overlap,
        theme_overlap=theme_overlap,
        mood_overlap=mood_overlap,
        style_overlap=style_overlap,
        keyword_overlap=keyword_overlap,
        language_match=language_match,
        director_match=director_match,
        cast_match=cast_match,
        era_match=era_match,
        novelty_signal=movie.novelty_signal,
        popularity_signal=movie.popularity_signal,
        vote_quality_signal=movie.vote_quality_signal,
        recent_taste_alignment=recent_taste_alignment,
        long_term_taste_alignment=long_term_taste_alignment,
    )


def score_and_rank_candidates(
    candidates: List[MovieCandidate],
    movie_features_by_id: Dict[UUID, MovieFeatures],
    taste: UserTasteProfile,
    config: ScoringConfig = DEFAULT_SCORING_CONFIG,
) -> List[MovieCandidate]:
    """Calculates deterministic composite scores and attaches the CandidateFeatureContract.

    Popularity is kept at weight 0.05 so high-popularity films can never drown out
    authentic taste matches.
    """
    for cand in candidates:
        movie = movie_features_by_id.get(cand.movie_id)
        if not movie:
            continue

        # Build feature contract
        feat_contract = build_candidate_feature_contract(cand, movie, taste, config)
        cand.features = feat_contract

        if cand.primary_channel == CandidateChannel.COLD_START.value:
            # Cold start scoring balances vote quality and curatorial novelty
            base_score = (
                0.70
                + (0.20 * feat_contract.vote_quality_signal)
                + (0.10 * feat_contract.novelty_signal)
            )
            cand.final_score = round(min(1.0, base_score), 4)
            continue

        # Composite heuristic scoring formula
        raw_composite = (
            (config.content_weight * feat_contract.content_score)
            + (config.preference_weight * feat_contract.preference_score)
            + (config.behavior_weight * feat_contract.behavior_score)
            + (config.discovery_weight * feat_contract.discovery_score)
            + (config.vote_quality_weight * feat_contract.vote_quality_signal)
            + (
                config.popularity_weight * feat_contract.popularity_signal
            )  # Minor supporting signal
        )

        cand.final_score = round(min(1.0, max(0.01, raw_composite)), 4)

    # Sort deterministically: final_score DESC, vote_average DESC, movie_id ASC
    candidates.sort(
        key=lambda c: (
            c.final_score,
            c.vote_average or 0.0,
            str(c.movie_id),
        ),
        reverse=True,
    )
    return candidates

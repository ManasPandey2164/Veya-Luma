"""Structured deterministic explainability layer for Veya Luma (Step 18).

Generates rule-grounded, factual reasons and evidence for recommended candidates
without LLM hallucinations or opaque embeddings.
"""

from typing import Dict, List, Optional

from app.recommendation.features import MovieFeatures
from app.recommendation.models import (
    CandidateChannel,
    ExplanationReasonCode,
    MovieCandidate,
    RecommendationExplanation,
    UserTasteProfile,
)

LANGUAGE_NAMES: Dict[str, str] = {
    "en": "English",
    "ja": "Japanese",
    "fr": "French",
    "es": "Spanish",
    "ko": "Korean",
    "zh": "Chinese",
    "ru": "Russian",
    "it": "Italian",
    "pt": "Portuguese",
    "de": "German",
    "hi": "Hindi",
    "id": "Indonesian",
}


def generate_candidate_explanations(
    candidate: MovieCandidate,
    movie: Optional[MovieFeatures],
    taste: UserTasteProfile,
) -> List[RecommendationExplanation]:
    """Generates structured deterministic explanations grounded in catalog evidence."""
    explanations: List[RecommendationExplanation] = []

    if not movie:
        return explanations

    # 1. Cold Start Explanation
    if candidate.primary_channel == CandidateChannel.COLD_START.value:
        lang_name = LANGUAGE_NAMES.get(
            movie.original_language, movie.original_language.upper()
        )
        explanations.append(
            RecommendationExplanation(
                reason_code=ExplanationReasonCode.COLD_START_CURATION.value,
                label=f"Curated {movie.release_era} cinematic discovery in {lang_name}",
                evidence=[
                    f"Era: {movie.release_era.replace('_', ' ').title()}",
                    f"Language: {lang_name}",
                    f"Rating: {movie.vote_average or 'N/A'}/10",
                ],
            )
        )
        return explanations

    # 2. Preference Match Explanation
    if (
        CandidateChannel.PREFERENCE_MATCH.value in candidate.contributing_channels
        and "preferences" in candidate.matched_features
    ):
        matched_prefs = candidate.matched_features["preferences"]
        if matched_prefs:
            top_prefs = matched_prefs[:3]
            explanations.append(
                RecommendationExplanation(
                    reason_code=ExplanationReasonCode.PREFERENCE_MATCH.value,
                    label=f"Matches your curated preference for {', '.join(top_prefs)}",
                    evidence=[f"Preference: {p}" for p in top_prefs],
                )
            )

    # 3. Director Affinity Explanation
    matched_dirs = [
        d for d in movie.directors if taste.combined_director_affinity.get(d, 0.0) > 0
    ]
    if matched_dirs:
        primary_dir = matched_dirs[0]
        explanations.append(
            RecommendationExplanation(
                reason_code=ExplanationReasonCode.DIRECTOR_AFFINITY.value,
                label=f"Directed by {primary_dir}, whose work you've interacted with",
                evidence=[f"Director: {primary_dir}"],
            )
        )

    # 4. Genre Alignment Explanation
    genre_labels = [
        movie.tag_labels.get(g, g)
        for g in movie.genres
        if taste.combined_genre_affinity.get(g, 0.0) > 0
    ]
    if genre_labels and not any(
        e.reason_code == ExplanationReasonCode.PREFERENCE_MATCH.value
        for e in explanations
    ):
        top_genres = genre_labels[:2]
        explanations.append(
            RecommendationExplanation(
                reason_code=ExplanationReasonCode.GENRE_ALIGNMENT.value,
                label=f"Aligns with your interest in {' & '.join(top_genres)}",
                evidence=[f"Genre: {g}" for g in top_genres],
            )
        )

    # 5. Theme Resonance Explanation
    theme_labels = [
        movie.tag_labels.get(t, t)
        for t in movie.themes
        if taste.combined_theme_affinity.get(t, 0.0) > 0
    ]
    if theme_labels:
        top_themes = theme_labels[:2]
        explanations.append(
            RecommendationExplanation(
                reason_code=ExplanationReasonCode.THEME_RESONANCE.value,
                label=f"Shares themes with films you enjoyed: {', '.join(top_themes)}",
                evidence=[f"Theme: {t}" for t in top_themes],
            )
        )

    # 6. Behavioral Resonance (Recent session echo)
    if (
        CandidateChannel.BEHAVIOR_MATCH.value in candidate.contributing_channels
        and "behavior" in candidate.matched_features
    ):
        behav_notes = candidate.matched_features["behavior"]
        if behav_notes:
            explanations.append(
                RecommendationExplanation(
                    reason_code=ExplanationReasonCode.BEHAVIORAL_RESONANCE.value,
                    label="Echoes your recent session exploration",
                    evidence=behav_notes[:3],
                )
            )

    # 7. Global / Cross-Language Discovery
    if CandidateChannel.DISCOVERY.value in candidate.contributing_channels:
        lang_name = LANGUAGE_NAMES.get(
            movie.original_language, movie.original_language.upper()
        )
        if movie.original_language != "en":
            explanations.append(
                RecommendationExplanation(
                    reason_code=ExplanationReasonCode.GLOBAL_DISCOVERY.value,
                    label=f"Acclaimed international cinema in {lang_name}",
                    evidence=[
                        f"Original language: {lang_name}",
                        f"Acclaim: {movie.vote_average or 0.0}/10 with {movie.vote_count or 0} votes",
                    ],
                )
            )
        elif (movie.popularity or 0.0) < 35.0 and (movie.vote_average or 0.0) >= 7.0:
            explanations.append(
                RecommendationExplanation(
                    reason_code=ExplanationReasonCode.UNDISCOVERED_GEM.value,
                    label="A lesser-known title with exceptional critical consensus",
                    evidence=[
                        "Under-the-radar acclaim",
                        f"Vote Average: {movie.vote_average}/10",
                    ],
                )
            )

    # Fallback explanation if no specific rule matched
    if not explanations:
        explanations.append(
            RecommendationExplanation(
                reason_code=ExplanationReasonCode.GENRE_ALIGNMENT.value,
                label="Selected based on multidimensional taste alignment",
                evidence=[
                    f"Era: {movie.release_era}",
                    f"Language: {movie.original_language.upper()}",
                ],
            )
        )

    return explanations

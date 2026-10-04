"""Veya Luma Recommendation Engine Domain Layer (Phase 3 Step 18).

Establishes the deterministic foundation up to candidate generation:
- User taste profile with long-term and recent signal separation
- Normalized movie feature extraction across Core, Supporting, and Discovery features
- Decoupled candidate channels (Content, Preference, Behavior, Discovery, Cold Start)
- Candidate merging, seen-content suppression, and discovery quota preservation
- Stable CandidateFeatureContract for future ranker ingestion
- Structured deterministic explainability without LLMs
- Centralized heuristic scoring where Popularity is strictly a supporting signal
"""

from app.recommendation.candidates import (
    generate_behavior_candidates,
    generate_cold_start_candidates,
    generate_content_candidates,
    generate_discovery_candidates,
    generate_preference_candidates,
    merge_candidate_channels,
)
from app.recommendation.explanations import generate_candidate_explanations
from app.recommendation.features import MovieFeatures, extract_movie_features_from_orm
from app.recommendation.models import (
    CandidateChannel,
    CandidateFeatureContract,
    ExplanationReasonCode,
    MovieCandidate,
    RecommendationExplanation,
    RecommendationItemResponse,
    RecommendationResponse,
    UserTasteProfile,
)
from app.recommendation.scoring import (
    DEFAULT_SCORING_CONFIG,
    ScoringConfig,
    build_candidate_feature_contract,
    score_and_rank_candidates,
)
from app.recommendation.service import RecommendationService
from app.recommendation.taste import (
    DEFAULT_TASTE_WEIGHTS,
    TasteSignalWeights,
    build_user_taste_profile,
)

__all__ = [
    "CandidateChannel",
    "CandidateFeatureContract",
    "DEFAULT_SCORING_CONFIG",
    "DEFAULT_TASTE_WEIGHTS",
    "ExplanationReasonCode",
    "MovieCandidate",
    "MovieFeatures",
    "RecommendationExplanation",
    "RecommendationItemResponse",
    "RecommendationResponse",
    "RecommendationService",
    "ScoringConfig",
    "TasteSignalWeights",
    "UserTasteProfile",
    "build_candidate_feature_contract",
    "build_user_taste_profile",
    "extract_movie_features_from_orm",
    "generate_behavior_candidates",
    "generate_cold_start_candidates",
    "generate_candidate_explanations",
    "generate_content_candidates",
    "generate_discovery_candidates",
    "generate_preference_candidates",
    "merge_candidate_channels",
    "score_and_rank_candidates",
]

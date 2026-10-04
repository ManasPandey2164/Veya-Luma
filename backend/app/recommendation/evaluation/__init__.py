"""Veya Luma Offline Recommendation Evaluation & Calibration Package (Phase 3 Step 19).

Provides deterministic evaluation suites, temporal holdout analysis, ablation benchmarks,
multi-dimensional diversity/novelty/bias metrics, and reproducible hyperparameter calibration.
"""

from app.recommendation.evaluation.calibration import (
    CONFIG_CALIBRATED_CANDIDATE,
    CONFIG_DISCOVERY_HEAVY,
    CONFIG_POPULARITY_MINIMIZED,
    CONFIG_STEP_18_BASELINE,
    CalibrationConfig,
    get_candidate_configurations,
    get_configuration_by_name,
)
from app.recommendation.evaluation.datasets import (
    RealEvaluationDataset,
    UserTemporalSplit,
    extract_graded_relevance,
    load_real_evaluation_dataset,
)
from app.recommendation.evaluation.metrics import (
    catalog_coverage,
    dcg_at_k,
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
from app.recommendation.evaluation.reports import (
    generate_calibration_report,
    generate_evaluation_report,
    generate_evaluation_scorecard,
)
from app.recommendation.evaluation.runner import run_offline_evaluation
from app.recommendation.evaluation.scenarios import (
    ControlledScenario,
    build_controlled_scenarios,
)

__all__ = [
    "CONFIG_CALIBRATED_CANDIDATE",
    "CONFIG_DISCOVERY_HEAVY",
    "CONFIG_POPULARITY_MINIMIZED",
    "CONFIG_STEP_18_BASELINE",
    "CalibrationConfig",
    "ControlledScenario",
    "RealEvaluationDataset",
    "UserTemporalSplit",
    "build_controlled_scenarios",
    "catalog_coverage",
    "dcg_at_k",
    "director_diversity",
    "era_diversity",
    "extract_graded_relevance",
    "generate_calibration_report",
    "generate_evaluation_report",
    "generate_evaluation_scorecard",
    "genre_diversity",
    "get_candidate_configurations",
    "get_configuration_by_name",
    "intra_list_diversity",
    "language_coverage",
    "language_diversity",
    "load_real_evaluation_dataset",
    "ndcg_at_k",
    "novelty_score",
    "popularity_bias",
    "precision_at_k",
    "recall_at_k",
    "relevant_novelty_score",
    "run_offline_evaluation",
    "taxonomy_diversity",
]

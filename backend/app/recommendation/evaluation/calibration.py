"""Calibration configurations and hyperparameter suites for Veya Luma (Step 19).

Provides centralized, documented, reproducible recommendation weights and quotas
without scattering magic numbers across the codebase.
Supports comparing candidate parameter configurations against Step 18 defaults.
"""

from dataclasses import asdict, dataclass
from typing import Any, Dict, List

from app.recommendation.scoring import ScoringConfig
from app.recommendation.taste import TasteSignalWeights


@dataclass(frozen=True)
class CalibrationConfig:
    """Centralized configurable weights and thresholds for offline calibration."""

    name: str
    description: str

    # Channel scoring weights
    content_weight: float = 0.35
    preference_weight: float = 0.25
    behavior_weight: float = 0.20
    discovery_weight: float = 0.15

    # Supporting catalog signals
    vote_quality_weight: float = 0.10
    popularity_weight: float = 0.05

    # Quota configuration
    discovery_quota: float = 0.20

    # Temporal taste blending weights
    long_term_taste_weight: float = 0.60
    recent_taste_weight: float = 0.40

    def to_scoring_config(self) -> ScoringConfig:
        """Translates calibration config into production ScoringConfig."""
        return ScoringConfig(
            content_weight=self.content_weight,
            preference_weight=self.preference_weight,
            behavior_weight=self.behavior_weight,
            discovery_weight=self.discovery_weight,
            vote_quality_weight=self.vote_quality_weight,
            popularity_weight=self.popularity_weight,
            discovery_quota_ratio=self.discovery_quota,
        )

    def to_taste_weights(self) -> TasteSignalWeights:
        """Translates calibration config into production TasteSignalWeights."""
        return TasteSignalWeights(
            long_term_blend_weight=self.long_term_taste_weight,
            recent_blend_weight=self.recent_taste_weight,
        )

    def to_dict(self) -> Dict[str, Any]:
        """Serializes calibration configuration to dictionary."""
        return asdict(self)


# -----------------------------------------------------------------------------
# Predefined Calibration Candidate Configurations
# -----------------------------------------------------------------------------

# Configuration A: Production Step 18 Defaults
CONFIG_STEP_18_BASELINE = CalibrationConfig(
    name="Configuration A (Step 18 Production Defaults)",
    description=(
        "Production baseline using Step 18 heuristic weights: 0.35 Content, "
        "0.25 Preference, 0.20 Behavior, 0.15 Discovery, 0.10 Quality, "
        "0.05 Popularity, 0.20 Discovery Quota, 0.60 Long-Term / 0.40 Recent."
    ),
    content_weight=0.35,
    preference_weight=0.25,
    behavior_weight=0.20,
    discovery_weight=0.15,
    vote_quality_weight=0.10,
    popularity_weight=0.05,
    discovery_quota=0.20,
    long_term_taste_weight=0.60,
    recent_taste_weight=0.40,
)

# Configuration B: Taste-First Calibrated Candidate
CONFIG_CALIBRATED_CANDIDATE = CalibrationConfig(
    name="Configuration B (Calibrated Taste-First)",
    description=(
        "Moderately elevates discovery quota to 0.25 and discovery weight to 0.20, "
        "while reducing popularity contribution to 0.02 to further curb fame dominance."
    ),
    content_weight=0.30,
    preference_weight=0.25,
    behavior_weight=0.20,
    discovery_weight=0.20,
    vote_quality_weight=0.10,
    popularity_weight=0.02,
    discovery_quota=0.25,
    long_term_taste_weight=0.55,
    recent_taste_weight=0.45,
)

# Configuration C: Discovery-Heavy Exploration
CONFIG_DISCOVERY_HEAVY = CalibrationConfig(
    name="Configuration C (Discovery-Heavy Exploration)",
    description=(
        "Aggressive discovery model reserving 35% of candidates for discovery and "
        "boosting discovery weight to 0.30 while reducing popularity to 0.01."
    ),
    content_weight=0.25,
    preference_weight=0.20,
    behavior_weight=0.15,
    discovery_weight=0.30,
    vote_quality_weight=0.10,
    popularity_weight=0.01,
    discovery_quota=0.35,
    long_term_taste_weight=0.50,
    recent_taste_weight=0.50,
)

# Configuration D: Popularity-Minimized Auteur
CONFIG_POPULARITY_MINIMIZED = CalibrationConfig(
    name="Configuration D (Popularity-Minimized Auteur)",
    description=(
        "Strict Taste > Fame configuration setting popularity weight to 0.00, "
        "relying strictly on taxonomy affinity, behavioral resonance, and discovery."
    ),
    content_weight=0.35,
    preference_weight=0.25,
    behavior_weight=0.20,
    discovery_weight=0.20,
    vote_quality_weight=0.10,
    popularity_weight=0.00,
    discovery_quota=0.20,
    long_term_taste_weight=0.60,
    recent_taste_weight=0.40,
)


def get_candidate_configurations() -> List[CalibrationConfig]:
    """Returns all standard calibration candidate configurations for comparative evaluation."""
    return [
        CONFIG_STEP_18_BASELINE,
        CONFIG_CALIBRATED_CANDIDATE,
        CONFIG_DISCOVERY_HEAVY,
        CONFIG_POPULARITY_MINIMIZED,
    ]


def get_configuration_by_name(name: str) -> CalibrationConfig:
    """Retrieves a specific calibration configuration by name or alias."""
    lookup = {
        "A": CONFIG_STEP_18_BASELINE,
        "BASELINE": CONFIG_STEP_18_BASELINE,
        "CONFIG_A": CONFIG_STEP_18_BASELINE,
        "B": CONFIG_CALIBRATED_CANDIDATE,
        "CALIBRATED": CONFIG_CALIBRATED_CANDIDATE,
        "CONFIG_B": CONFIG_CALIBRATED_CANDIDATE,
        "C": CONFIG_DISCOVERY_HEAVY,
        "DISCOVERY": CONFIG_DISCOVERY_HEAVY,
        "CONFIG_C": CONFIG_DISCOVERY_HEAVY,
        "D": CONFIG_POPULARITY_MINIMIZED,
        "NO_POPULARITY": CONFIG_POPULARITY_MINIMIZED,
        "CONFIG_D": CONFIG_POPULARITY_MINIMIZED,
    }
    normalized = name.strip().upper()
    if normalized in lookup:
        return lookup[normalized]
    for c in get_candidate_configurations():
        if c.name.lower() == name.lower():
            return c
    raise ValueError(f"Unknown calibration configuration: {name}")

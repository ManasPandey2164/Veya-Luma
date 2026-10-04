"""Recommendation service orchestrator for Veya Luma (Step 18).

Coordinates user telemetry retrieval, taste profile construction, multi-channel candidate
generation, feature contract derivation, deterministic scoring, and structured explainability.
Guarantees clean boundary between FastAPI endpoints and domain business logic.
"""

import time
from typing import TYPE_CHECKING, Dict, List, Optional, Set

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ActorIdentity
from app.recommendation.candidates import (
    generate_behavior_candidates,
    generate_cold_start_candidates,
    generate_content_candidates,
    generate_discovery_candidates,
    generate_preference_candidates,
    merge_candidate_channels,
)
from app.recommendation.explanations import generate_candidate_explanations
from app.recommendation.models import (
    CandidateChannel,
    MovieCandidate,
    RecommendationItemResponse,
    RecommendationResponse,
)
from app.recommendation.scoring import (
    DEFAULT_SCORING_CONFIG,
    ScoringConfig,
    score_and_rank_candidates,
)
from app.recommendation.taste import (
    DEFAULT_TASTE_WEIGHTS,
    TasteSignalWeights,
    build_user_taste_profile,
)

if TYPE_CHECKING:
    from app.repositories.recommendation import RecommendationRepository


class RecommendationService:
    """Core domain service orchestrating the deterministic recommendation pipeline."""

    repo: "RecommendationRepository"

    def __init__(
        self,
        db: AsyncSession,
        taste_weights: TasteSignalWeights = DEFAULT_TASTE_WEIGHTS,
        scoring_config: ScoringConfig = DEFAULT_SCORING_CONFIG,
    ) -> None:
        from app.repositories.recommendation import RecommendationRepository

        self.db = db
        self.repo: RecommendationRepository = RecommendationRepository(db)
        self.taste_weights = taste_weights
        self.scoring_config = scoring_config

    async def get_recommendations(
        self,
        actor: ActorIdentity,
        limit: int = 20,
        channel: Optional[str] = None,
        excluded_channels: Optional[Set[str]] = None,
    ) -> RecommendationResponse:
        """Executes the full deterministic recommendation pipeline.

        1. Fetches authentic user/guest explicit and behavioral telemetry.
        2. Loads catalog movie features via targeted bulk queries.
        3. Constructs separate long-term and recent taste representations.
        4. Generates candidates across decoupled channels (Content, Preference, Behavior, Discovery, Cold Start).
        5. Deduplicates candidates and suppresses seen content while retaining watchlist items.
        6. Derives CandidateFeatureContract and calculates composite scores.
        7. Attaches rule-grounded, factual explainability reasons.
        """
        start_time = time.perf_counter()

        user_id = actor.user_id if actor.is_authenticated else None
        session_id = actor.session_id

        # 1. Fetch user/guest interaction data in parallel / sequence
        ratings = await self.repo.get_user_ratings(user_id) if user_id else []
        favourites = await self.repo.get_favourites(
            user_id=user_id, session_id=session_id
        )
        watchlist = await self.repo.get_watchlist(
            user_id=user_id, session_id=session_id
        )
        preferences = await self.repo.get_preferences(
            user_id=user_id, session_id=session_id
        )
        events = await self.repo.get_events(
            user_id=user_id, session_id=session_id, limit=100
        )

        # 2. Fetch catalog features
        catalog_features = await self.repo.get_catalog_features()
        catalog_list = list(catalog_features.values())

        # 3. Construct user taste representation
        taste = build_user_taste_profile(
            user_id=user_id,
            session_id=session_id,
            ratings=ratings,
            favourites=favourites,
            watchlist=watchlist,
            preferences=preferences,
            events=events,
            movie_features_by_id=catalog_features,
            weights=self.taste_weights,
        )

        # 4. Multi-channel candidate generation
        candidates_by_channel: Dict[str, List[MovieCandidate]] = {}

        if taste.is_cold_start:
            cold_candidates = generate_cold_start_candidates(
                catalog=catalog_list,
                limit=max(limit * 2, 50),
            )
            candidates_by_channel[CandidateChannel.COLD_START.value] = cold_candidates
        else:
            # Channel 1: Content Match
            if (
                not excluded_channels
                or CandidateChannel.CONTENT_MATCH.value not in excluded_channels
            ):
                content_cands = generate_content_candidates(
                    taste=taste,
                    catalog=catalog_list,
                    limit=150,
                )
                if content_cands:
                    candidates_by_channel[CandidateChannel.CONTENT_MATCH.value] = (
                        content_cands
                    )

            # Channel 2: Explicit Preference Match
            if (
                not excluded_channels
                or CandidateChannel.PREFERENCE_MATCH.value not in excluded_channels
            ):
                pref_cands = generate_preference_candidates(
                    taste=taste,
                    catalog=catalog_list,
                    limit=100,
                )
                if pref_cands:
                    candidates_by_channel[CandidateChannel.PREFERENCE_MATCH.value] = (
                        pref_cands
                    )

            # Channel 3: Behavioral Match (User's own recent events)
            if (
                not excluded_channels
                or CandidateChannel.BEHAVIOR_MATCH.value not in excluded_channels
            ):
                behav_cands = generate_behavior_candidates(
                    taste=taste,
                    catalog=catalog_list,
                    limit=100,
                )
                if behav_cands:
                    candidates_by_channel[CandidateChannel.BEHAVIOR_MATCH.value] = (
                        behav_cands
                    )

            # Channel 4: Discovery (Novelty, International, Lower-popularity, Adjacent taxonomies)
            if (
                not excluded_channels
                or CandidateChannel.DISCOVERY.value not in excluded_channels
            ):
                discovery_cands = generate_discovery_candidates(
                    taste=taste,
                    catalog=catalog_list,
                    limit=80,
                )
                if discovery_cands:
                    candidates_by_channel[CandidateChannel.DISCOVERY.value] = (
                        discovery_cands
                    )

            # If active signals yielded zero candidates, fall back gracefully to curated cold start
            if not any(candidates_by_channel.values()):
                cold_candidates = generate_cold_start_candidates(
                    catalog=catalog_list,
                    limit=max(limit * 2, 50),
                )
                candidates_by_channel[CandidateChannel.COLD_START.value] = (
                    cold_candidates
                )

        # Total candidate count retrieved before deduplication
        total_retrieved = sum(len(c) for c in candidates_by_channel.values())

        # 5. Candidate Merging & Deduplication
        if CandidateChannel.COLD_START.value in candidates_by_channel:
            merged_pool = candidates_by_channel[CandidateChannel.COLD_START.value]
        else:
            merged_pool = merge_candidate_channels(
                channel_candidates=candidates_by_channel,
                taste=taste,
                target_pool_size=max(limit * 2, 60),
                discovery_quota_ratio=self.scoring_config.discovery_quota_ratio,
            )

        # Filter by specific channel if caller requested
        if channel:
            target_ch = channel.strip().upper()
            merged_pool = [
                c
                for c in merged_pool
                if target_ch in c.contributing_channels
                or c.primary_channel == target_ch
            ]

        # 6. Scoring, Feature Contract derivation & Deterministic Ranking
        ranked_pool = score_and_rank_candidates(
            candidates=merged_pool,
            movie_features_by_id=catalog_features,
            taste=taste,
            config=self.scoring_config,
        )

        # Slice to requested limit
        top_candidates = ranked_pool[:limit]

        # 7. Generate Explanations and build API response items
        items: List[RecommendationItemResponse] = []
        channels_represented: Set[str] = set()

        for cand in top_candidates:
            movie_feat = catalog_features.get(cand.movie_id)
            explanations = generate_candidate_explanations(cand, movie_feat, taste)
            director = (
                next(iter(sorted(movie_feat.directors)))
                if (movie_feat and movie_feat.directors)
                else None
            )
            channels_represented.add(cand.primary_channel)

            item = RecommendationItemResponse(
                id=cand.movie_id,
                title=cand.title,
                original_language=cand.original_language,
                release_year=cand.release_year,
                runtime_minutes=cand.runtime_minutes,
                poster_path=cand.poster_path,
                backdrop_path=cand.backdrop_path,
                popularity=cand.popularity,
                vote_average=cand.vote_average,
                vote_count=cand.vote_count,
                director=director,
                channel=cand.primary_channel,
                contributing_channels=cand.contributing_channels,
                score=cand.final_score,
                is_in_watchlist=cand.is_in_watchlist,
                explanations=explanations,
                matched_features=cand.matched_features,
                features=cand.features.to_dict() if cand.features else None,
            )
            items.append(item)

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return RecommendationResponse(
            items=items,
            total_candidates=total_retrieved,
            returned_count=len(items),
            is_cold_start=taste.is_cold_start,
            channels_represented=sorted(channels_represented),
            execution_time_ms=elapsed_ms,
        )

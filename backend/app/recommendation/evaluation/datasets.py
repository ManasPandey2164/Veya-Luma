"""Offline evaluation dataset builder and temporal holdout partitioning for Veya Luma (Step 19).

Extracts real user telemetry from PostgreSQL (ratings, favourites, watchlist, preferences, events)
and partitions interactions temporally into:
- TRAIN / HISTORY WINDOW: used strictly to construct the UserTasteProfile
- HOLDOUT / FUTURE WINDOW: sequestered strictly for ground-truth relevance evaluation

Guarantees ZERO future data leakage into the user taste representation.
Honest accounting: explicitly reports data sparsity and limitations when real user
histories are insufficient for statistically meaningful offline evaluation.
"""

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Set
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.preference import (
    Favourite,
    MovieRating,
    UserMovieEvent,
    UserPreference,
    Watchlist,
)
from app.models.user import User
from app.recommendation.features import MovieFeatures


@dataclass
class UserTemporalSplit:
    """Sequestered evaluation data for a single user under temporal holdout."""

    user_id: UUID

    # History window (used strictly to construct taste)
    history_ratings: List[MovieRating] = field(default_factory=list)
    history_favourites: List[Favourite] = field(default_factory=list)
    history_watchlist: List[Watchlist] = field(default_factory=list)
    history_preferences: List[UserPreference] = field(default_factory=list)
    history_events: List[UserMovieEvent] = field(default_factory=list)

    # Holdout / Future window (ground-truth targets)
    holdout_positives: Set[UUID] = field(default_factory=set)
    holdout_relevance: Dict[UUID, float] = field(default_factory=dict)
    holdout_negatives: Set[UUID] = field(default_factory=set)

    # Telemetry metadata
    split_timestamp: Optional[datetime] = None
    total_history_signals: int = 0
    total_holdout_signals: int = 0


@dataclass
class RealEvaluationDataset:
    """Summary and evaluation splits for the real PostgreSQL user interaction dataset."""

    total_registered_users: int
    users_with_interactions: int
    eligible_users: List[UserTemporalSplit]
    excluded_users_count: int
    exclusion_reasons: Dict[str, int]
    is_statistically_significant: bool
    limitation_statement: str

    def to_summary_dict(self) -> Dict[str, Any]:
        """Returns machine-readable summary of real evaluation dataset."""
        return {
            "total_registered_users": self.total_registered_users,
            "users_with_interactions": self.users_with_interactions,
            "eligible_users_count": len(self.eligible_users),
            "excluded_users_count": self.excluded_users_count,
            "exclusion_reasons": self.exclusion_reasons,
            "is_statistically_significant": self.is_statistically_significant,
            "limitation_statement": self.limitation_statement,
        }


def extract_graded_relevance(
    ratings: List[MovieRating],
    favourites: List[Favourite],
    watchlist: List[Watchlist],
    events: List[UserMovieEvent],
) -> tuple[Set[UUID], Dict[UUID, float], Set[UUID]]:
    """Derives ground truth relevance scores from sequestered holdout interactions.

    Relevance Policy:
    - 3.0: High rating (>= 9.0) or Favourite
    - 2.0: Good rating (7.0 - 8.9) or Repeat detail views (>= 2 views)
    - 1.0: Watchlist or Single detail view
    - Negative: Rating < 5.0 (treated as negative holdout)
    """
    relevance_map: Dict[UUID, float] = {}
    positives: Set[UUID] = set()
    negatives: Set[UUID] = set()

    # Detail view event counts
    view_counts: Dict[UUID, int] = defaultdict(int)
    for ev in events:
        if ev.event_type == "detail_view":
            view_counts[ev.movie_id] += 1

    for mid, count in view_counts.items():
        if count >= 2:
            relevance_map[mid] = max(relevance_map.get(mid, 0.0), 2.0)
            positives.add(mid)
        elif count == 1:
            relevance_map[mid] = max(relevance_map.get(mid, 0.0), 1.0)
            positives.add(mid)

    for wl in watchlist:
        relevance_map[wl.movie_id] = max(relevance_map.get(wl.movie_id, 0.0), 1.0)
        positives.add(wl.movie_id)

    for r in ratings:
        if r.rating >= 9.0:
            relevance_map[r.movie_id] = max(relevance_map.get(r.movie_id, 0.0), 3.0)
            positives.add(r.movie_id)
        elif r.rating >= 7.0:
            relevance_map[r.movie_id] = max(relevance_map.get(r.movie_id, 0.0), 2.0)
            positives.add(r.movie_id)
        elif r.rating < 5.0:
            relevance_map[r.movie_id] = 0.0
            negatives.add(r.movie_id)
            positives.discard(r.movie_id)

    for f in favourites:
        relevance_map[f.movie_id] = max(relevance_map.get(f.movie_id, 0.0), 3.0)
        positives.add(f.movie_id)

    return positives, relevance_map, negatives


async def load_real_evaluation_dataset(
    db: AsyncSession,
    catalog_features: Dict[UUID, MovieFeatures],
) -> RealEvaluationDataset:
    """Extracts all persistent user telemetry from PostgreSQL and builds temporal holdout splits.

    Evaluates whether genuine user interaction data supports statistically valid evaluation.
    Reports limitations honestly if interaction history is too sparse.
    """
    # 1. Load users
    user_res = await db.execute(select(User.id))
    all_user_ids = [row[0] for row in user_res.fetchall()]

    # 2. Bulk load all interaction tables
    ratings_res = await db.execute(select(MovieRating))
    all_ratings = ratings_res.scalars().all()

    fav_res = await db.execute(select(Favourite))
    all_favs = fav_res.scalars().all()

    wl_res = await db.execute(select(Watchlist))
    all_wl = wl_res.scalars().all()

    pref_res = await db.execute(select(UserPreference))
    all_prefs = pref_res.scalars().all()

    evt_res = await db.execute(select(UserMovieEvent))
    all_evts = evt_res.scalars().all()

    # Index by user_id
    user_ratings: Dict[UUID, List[MovieRating]] = defaultdict(list)
    for r in all_ratings:
        user_ratings[r.user_id].append(r)

    user_favs: Dict[UUID, List[Favourite]] = defaultdict(list)
    for f in all_favs:
        if f.user_id:
            user_favs[f.user_id].append(f)

    user_wl: Dict[UUID, List[Watchlist]] = defaultdict(list)
    for w in all_wl:
        if w.user_id:
            user_wl[w.user_id].append(w)

    user_prefs: Dict[UUID, List[UserPreference]] = defaultdict(list)
    for p in all_prefs:
        if p.user_id:
            user_prefs[p.user_id].append(p)

    user_evts: Dict[UUID, List[UserMovieEvent]] = defaultdict(list)
    for e in all_evts:
        if e.user_id:
            user_evts[e.user_id].append(e)

    # 3. Partition users temporally
    eligible_users: List[UserTemporalSplit] = []
    exclusion_reasons: Dict[str, int] = defaultdict(int)

    users_with_any_signal = set(
        list(user_ratings.keys())
        + list(user_favs.keys())
        + list(user_wl.keys())
        + list(user_prefs.keys())
        + list(user_evts.keys())
    )

    for uid in all_user_ids:
        if uid not in users_with_any_signal:
            exclusion_reasons["zero_interaction_signals"] += 1
            continue

        ratings = user_ratings.get(uid, [])
        favs = user_favs.get(uid, [])
        wl = user_wl.get(uid, [])
        prefs = user_prefs.get(uid, [])
        evts = user_evts.get(uid, [])

        # Collect all timestamped events for temporal ordering
        timestamped_items: List[tuple[datetime, str, Any]] = []
        for r in ratings:
            timestamped_items.append((r.created_at, "rating", r))
        for f in favs:
            timestamped_items.append((f.created_at, "favourite", f))
        for w in wl:
            timestamped_items.append((w.created_at, "watchlist", w))
        for e in evts:
            timestamped_items.append((e.created_at, "event", e))

        # Explicit preferences are enduring static taxonomy settings; keep in history
        history_prefs = list(prefs)

        total_interactions = len(timestamped_items)
        if total_interactions < 3:
            exclusion_reasons["insufficient_temporal_history"] += 1
            continue

        # Sort chronologically (oldest to newest)
        timestamped_items.sort(key=lambda x: x[0])

        # Temporal split: first 60% interactions to history, remaining 40% to holdout
        split_idx = max(1, int(total_interactions * 0.60))
        history_items = timestamped_items[:split_idx]
        holdout_items = timestamped_items[split_idx:]

        split_time = history_items[-1][0]

        h_ratings = [item[2] for item in history_items if item[1] == "rating"]
        h_favs = [item[2] for item in history_items if item[1] == "favourite"]
        h_wl = [item[2] for item in history_items if item[1] == "watchlist"]
        h_evts = [item[2] for item in history_items if item[1] == "event"]

        future_ratings = [item[2] for item in holdout_items if item[1] == "rating"]
        future_favs = [item[2] for item in holdout_items if item[1] == "favourite"]
        future_wl = [item[2] for item in holdout_items if item[1] == "watchlist"]
        future_evts = [item[2] for item in holdout_items if item[1] == "event"]

        # Derive holdout ground truth
        positives, relevance_map, negatives = extract_graded_relevance(
            ratings=future_ratings,
            favourites=future_favs,
            watchlist=future_wl,
            events=future_evts,
        )

        if not positives:
            exclusion_reasons["no_holdout_positives"] += 1
            continue

        split = UserTemporalSplit(
            user_id=uid,
            history_ratings=h_ratings,
            history_favourites=h_favs,
            history_watchlist=h_wl,
            history_preferences=history_prefs,
            history_events=h_evts,
            holdout_positives=positives,
            holdout_relevance=relevance_map,
            holdout_negatives=negatives,
            split_timestamp=split_time,
            total_history_signals=len(history_items) + len(history_prefs),
            total_holdout_signals=len(holdout_items),
        )
        eligible_users.append(split)

    is_sig = len(eligible_users) >= 30
    limitation_msg = (
        f"Real interaction dataset contains {len(all_user_ids)} registered users and "
        f"{len(users_with_any_signal)} users with interaction records. However, only "
        f"{len(eligible_users)} user(s) possess >= 3 temporal signals with a valid future holdout positive. "
        "Insufficient real interaction data for statistically meaningful user-level offline evaluation. "
        "Controlled scenario evaluation with real canonical catalog fixtures is used to rigorously verify recommendation mechanics."
    )

    return RealEvaluationDataset(
        total_registered_users=len(all_user_ids),
        users_with_interactions=len(users_with_any_signal),
        eligible_users=eligible_users,
        excluded_users_count=len(all_user_ids) - len(eligible_users),
        exclusion_reasons=dict(exclusion_reasons),
        is_statistically_significant=is_sig,
        limitation_statement=limitation_msg,
    )

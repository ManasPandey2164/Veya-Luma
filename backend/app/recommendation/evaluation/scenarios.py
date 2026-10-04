"""Controlled evaluation scenarios and persona fixtures for Veya Luma (Step 19).

Provides deterministic, reproducible evaluation scenarios covering:
- SCENARIO A: Genre-heavy user (Sci-Fi focused)
- SCENARIO B: International-cinema user (Japanese / French / Spanish cinema)
- SCENARIO C: Popular-mainstream user (high-popularity blockbusters with curatorial grounding)
- SCENARIO D: Exploration-oriented user (cross-genre breadth & discovery)
- SCENARIO E: Strong director preference (auteur cinema)
- SCENARIO F: Strong theme/mood preference (existential / mind-bending / contemplative)
- SCENARIO G: Mixed long-term + recent taste (long-term Sci-Fi vs recent Drama shift)
- SCENARIO H: Cold-start user (unseeded guest discovering cinema)

Each scenario binds deterministically to real canonical PostgreSQL movies, sets explicit
ground-truth relevance policies, and verifies seen-content suppression and explanation grounding.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set
from uuid import UUID, uuid4

from app.models.preference import (
    Favourite,
    MovieRating,
    UserMovieEvent,
    UserPreference,
    Watchlist,
)
from app.recommendation.features import MovieFeatures
from app.recommendation.models import UserTasteProfile
from app.recommendation.taste import (
    DEFAULT_TASTE_WEIGHTS,
    TasteSignalWeights,
    build_user_taste_profile,
)


@dataclass
class ControlledScenario:
    """A deterministic evaluation scenario representing a curated cinema discoverer persona."""

    scenario_id: str
    name: str
    description: str
    persona_type: str

    # History inputs (used to construct UserTasteProfile)
    history_ratings: List[MovieRating] = field(default_factory=list)
    history_favourites: List[Favourite] = field(default_factory=list)
    history_watchlist: List[Watchlist] = field(default_factory=list)
    history_preferences: List[UserPreference] = field(default_factory=list)
    history_events: List[UserMovieEvent] = field(default_factory=list)

    # Ground truth holdout expectations for Precision / Recall / NDCG
    holdout_positives: Set[UUID] = field(default_factory=set)
    holdout_relevance: Dict[UUID, float] = field(default_factory=dict)

    # Verification assertions
    expected_dominant_language: Optional[str] = None
    expected_genres: Set[str] = field(default_factory=set)
    expected_directors: Set[str] = field(default_factory=set)
    must_suppress_movie_ids: Set[UUID] = field(default_factory=set)
    watchlist_movie_ids: Set[UUID] = field(default_factory=set)

    def build_taste_profile(
        self,
        catalog: Dict[UUID, MovieFeatures],
        weights: TasteSignalWeights = DEFAULT_TASTE_WEIGHTS,
    ) -> UserTasteProfile:
        """Constructs deterministic UserTasteProfile from scenario history signals."""
        return build_user_taste_profile(
            user_id=uuid4(),
            session_id=uuid4(),
            ratings=self.history_ratings,
            favourites=self.history_favourites,
            watchlist=self.history_watchlist,
            preferences=self.history_preferences,
            events=self.history_events,
            movie_features_by_id=catalog,
            weights=weights,
        )


def _make_rating(movie_id: UUID, rating: float, user_id: UUID) -> MovieRating:
    return MovieRating(
        id=uuid4(),
        user_id=user_id,
        movie_id=movie_id,
        rating=rating,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def _make_favourite(movie_id: UUID, user_id: UUID) -> Favourite:
    return Favourite(
        id=uuid4(),
        user_id=user_id,
        session_id=None,
        movie_id=movie_id,
        created_at=datetime.now(timezone.utc),
    )


def _make_watchlist(movie_id: UUID, user_id: UUID) -> Watchlist:
    return Watchlist(
        id=uuid4(),
        user_id=user_id,
        session_id=None,
        movie_id=movie_id,
        created_at=datetime.now(timezone.utc),
    )


def _make_event(
    movie_id: UUID,
    event_type: str,
    user_id: UUID,
    event_value: Optional[float] = None,
) -> UserMovieEvent:
    return UserMovieEvent(
        id=uuid4(),
        user_id=user_id,
        session_id=uuid4(),
        movie_id=movie_id,
        event_type=event_type,
        event_value=event_value,
        created_at=datetime.now(timezone.utc),
    )


def build_controlled_scenarios(
    catalog: Dict[UUID, MovieFeatures],
) -> List[ControlledScenario]:
    """Dynamically builds Scenarios A through H binding to real canonical catalog movies."""
    scenarios: List[ControlledScenario] = []

    # Partition catalog by attributes to bind real canonical movie IDs
    sci_fi_movies = [m for m in catalog.values() if "genre.sci_fi" in m.genres]
    drama_movies = [m for m in catalog.values() if "genre.drama" in m.genres]
    intl_movies = [
        m
        for m in catalog.values()
        if m.original_language in {"ja", "fr", "es", "ko", "de", "it"}
    ]
    popular_movies = sorted(
        catalog.values(), key=lambda m: m.popularity or 0.0, reverse=True
    )
    animation_movies = [m for m in catalog.values() if "genre.animation" in m.genres]

    # Find a prolific director with multiple movies in catalog
    director_counts: Dict[str, List[MovieFeatures]] = {}
    for m in catalog.values():
        for d in m.directors:
            if d not in director_counts:
                director_counts[d] = []
            director_counts[d].append(m)

    top_director = "Christopher Nolan"
    if top_director not in director_counts or len(director_counts[top_director]) < 3:
        # Fallback to most frequent director
        sorted_dirs = sorted(
            director_counts.items(), key=lambda x: len(x[1]), reverse=True
        )
        if sorted_dirs:
            top_director = sorted_dirs[0][0]

    director_movies = director_counts.get(top_director, [])

    # Existential / mind-bending movies
    existential_movies = [
        m
        for m in catalog.values()
        if "theme.existentialism" in m.themes
        or "mood.mind_bending" in m.moods
        or "theme.dystopia" in m.themes
        or "mood.contemplative" in m.moods
    ]

    # -------------------------------------------------------------------------
    # SCENARIO A: Genre-Heavy Curator (Sci-Fi Specialist)
    # -------------------------------------------------------------------------
    uid_a = uuid4()
    history_sf = sci_fi_movies[:4] if len(sci_fi_movies) >= 4 else sci_fi_movies
    ratings_a = [_make_rating(m.movie_id, 9.5, uid_a) for m in history_sf[:2]]
    favs_a = [_make_favourite(m.movie_id, uid_a) for m in history_sf[2:3]]
    wl_a = (
        [_make_watchlist(history_sf[3].movie_id, uid_a)] if len(history_sf) > 3 else []
    )
    seen_a = {m.movie_id for m in history_sf[:3]}

    holdout_pos_a = set()
    relevance_a = {}
    for m in catalog.values():
        if m.movie_id in seen_a:
            continue
        if "genre.sci_fi" in m.genres:
            is_strong = (m.vote_average or 0.0) >= 7.5 or bool(
                {
                    "theme.existentialism",
                    "theme.dystopia",
                    "theme.artificial_intelligence",
                }
                & m.themes
            )
            rel = 3.0 if is_strong else 2.0
            holdout_pos_a.add(m.movie_id)
            relevance_a[m.movie_id] = rel
        elif "genre.mystery" in m.genres or bool(
            {"theme.dystopia", "theme.artificial_intelligence"} & m.themes
        ):
            holdout_pos_a.add(m.movie_id)
            relevance_a[m.movie_id] = 1.0

    scenarios.append(
        ControlledScenario(
            scenario_id="SCENARIO_A",
            name="Scenario A: Genre-Heavy Curator (Sci-Fi Specialist)",
            description="Strong explicit and rating affinity for Science Fiction cinema.",
            persona_type="genre_heavy",
            history_ratings=ratings_a,
            history_favourites=favs_a,
            history_watchlist=wl_a,
            holdout_positives=holdout_pos_a,
            holdout_relevance=relevance_a,
            expected_genres={"genre.sci_fi"},
            must_suppress_movie_ids=seen_a,
            watchlist_movie_ids={wl.movie_id for wl in wl_a},
        )
    )

    # -------------------------------------------------------------------------
    # SCENARIO B: International-Cinema Enthusiast
    # -------------------------------------------------------------------------
    uid_b = uuid4()
    history_intl = intl_movies[:4] if len(intl_movies) >= 4 else intl_movies
    ratings_b = [_make_rating(m.movie_id, 9.0, uid_b) for m in history_intl[:2]]
    favs_b = [_make_favourite(m.movie_id, uid_b) for m in history_intl[2:4]]
    seen_b = {m.movie_id for m in history_intl}

    holdout_pos_b = set()
    relevance_b = {}
    for m in catalog.values():
        if m.movie_id in seen_b:
            continue
        if m.original_language != "en":
            rel = 3.0 if (m.vote_average or 0.0) >= 7.0 else 2.0
            holdout_pos_b.add(m.movie_id)
            relevance_b[m.movie_id] = rel
        elif (m.popularity or 0.0) < 35.0 and (m.vote_average or 0.0) >= 7.5:
            holdout_pos_b.add(m.movie_id)
            relevance_b[m.movie_id] = 1.0

    scenarios.append(
        ControlledScenario(
            scenario_id="SCENARIO_B",
            name="Scenario B: International-Cinema Enthusiast",
            description="Curator focused on non-English international cinema (Japanese, French, Spanish).",
            persona_type="international_cinema",
            history_ratings=ratings_b,
            history_favourites=favs_b,
            holdout_positives=holdout_pos_b,
            holdout_relevance=relevance_b,
            expected_dominant_language="non_english",
            must_suppress_movie_ids=seen_b,
        )
    )

    # -------------------------------------------------------------------------
    # SCENARIO C: Popular-Mainstream Explorer
    # -------------------------------------------------------------------------
    uid_c = uuid4()
    history_pop = popular_movies[:4]
    ratings_c = [_make_rating(m.movie_id, 8.5, uid_c) for m in history_pop[:2]]
    favs_c = [_make_favourite(m.movie_id, uid_c) for m in history_pop[2:4]]
    seen_c = {m.movie_id for m in history_pop}

    holdout_pos_c = set()
    relevance_c = {}
    for m in catalog.values():
        if m.movie_id in seen_c:
            continue
        pop = m.popularity or 0.0
        va = m.vote_average or 0.0
        if pop > 44.0 and va >= 7.0:
            holdout_pos_c.add(m.movie_id)
            relevance_c[m.movie_id] = 3.0
        elif pop > 30.6 and va >= 6.5:
            holdout_pos_c.add(m.movie_id)
            relevance_c[m.movie_id] = 2.0
        elif pop > 18.2 and va >= 6.5:
            holdout_pos_c.add(m.movie_id)
            relevance_c[m.movie_id] = 1.0

    scenarios.append(
        ControlledScenario(
            scenario_id="SCENARIO_C",
            name="Scenario C: Popular-Mainstream Explorer",
            description="User interacting with well-known titles; tests whether recommender curbs fame.",
            persona_type="popular_mainstream",
            history_ratings=ratings_c,
            history_favourites=favs_c,
            holdout_positives=holdout_pos_c,
            holdout_relevance=relevance_c,
            must_suppress_movie_ids=seen_c,
        )
    )

    # -------------------------------------------------------------------------
    # SCENARIO D: Exploration-Oriented Discoverer
    # -------------------------------------------------------------------------
    uid_d = uuid4()
    diverse_sample = []
    if animation_movies:
        diverse_sample.append(animation_movies[0])
    if drama_movies:
        diverse_sample.append(drama_movies[0])
    if sci_fi_movies:
        diverse_sample.append(sci_fi_movies[0])
    if intl_movies:
        diverse_sample.append(intl_movies[0])

    ratings_d = [_make_rating(m.movie_id, 8.0, uid_d) for m in diverse_sample[:2]]
    favs_d = [_make_favourite(m.movie_id, uid_d) for m in diverse_sample[2:4]]
    seen_d = {m.movie_id for m in diverse_sample}

    holdout_pos_d = set()
    relevance_d = {}
    for m in catalog.values():
        if m.movie_id in seen_d:
            continue
        is_exploratory_genre = bool(
            {"genre.animation", "genre.mystery", "genre.adventure", "genre.documentary"}
            & m.genres
        )
        va = m.vote_average or 0.0
        pop = m.popularity or 0.0
        if is_exploratory_genre and va >= 7.0:
            holdout_pos_d.add(m.movie_id)
            relevance_d[m.movie_id] = 3.0
        elif va >= 7.0 and pop < 40.0:
            holdout_pos_d.add(m.movie_id)
            relevance_d[m.movie_id] = 2.0
        elif va >= 6.8:
            holdout_pos_d.add(m.movie_id)
            relevance_d[m.movie_id] = 1.0

    scenarios.append(
        ControlledScenario(
            scenario_id="SCENARIO_D",
            name="Scenario D: Exploration-Oriented Discoverer",
            description="Eclectic cross-genre moviegoer seeking breadth and surprising adjacencies.",
            persona_type="exploration",
            history_ratings=ratings_d,
            history_favourites=favs_d,
            holdout_positives=holdout_pos_d,
            holdout_relevance=relevance_d,
            must_suppress_movie_ids=seen_d,
        )
    )

    # -------------------------------------------------------------------------
    # SCENARIO E: Strong Director Preference (Auteur Cinema)
    # -------------------------------------------------------------------------
    uid_e = uuid4()
    history_dir = director_movies[:2] if len(director_movies) >= 2 else director_movies
    ratings_e = [_make_rating(m.movie_id, 10.0, uid_e) for m in history_dir[:1]]
    favs_e = [_make_favourite(m.movie_id, uid_e) for m in history_dir[1:2]]
    seen_e = {m.movie_id for m in history_dir}

    holdout_pos_e = set()
    relevance_e = {}
    for m in catalog.values():
        if m.movie_id in seen_e:
            continue
        if top_director in m.directors:
            holdout_pos_e.add(m.movie_id)
            relevance_e[m.movie_id] = 3.0
        elif (
            bool({"genre.sci_fi", "genre.thriller"} & m.genres)
            and "mood.mind_bending" in m.moods
        ):
            holdout_pos_e.add(m.movie_id)
            relevance_e[m.movie_id] = 2.0
        elif (
            bool({"genre.mystery", "genre.thriller"} & m.genres)
            and (m.vote_average or 0.0) >= 7.0
        ):
            holdout_pos_e.add(m.movie_id)
            relevance_e[m.movie_id] = 1.0

    scenarios.append(
        ControlledScenario(
            scenario_id="SCENARIO_E",
            name=f"Scenario E: Strong Director Preference ({top_director})",
            description=f"Curator with profound affinity for auteur director {top_director}.",
            persona_type="director_preference",
            history_ratings=ratings_e,
            history_favourites=favs_e,
            holdout_positives=holdout_pos_e,
            holdout_relevance=relevance_e,
            expected_directors={top_director},
            must_suppress_movie_ids=seen_e,
        )
    )

    # -------------------------------------------------------------------------
    # SCENARIO F: Strong Theme/Mood Preference (Existential / Mind-Bending)
    # -------------------------------------------------------------------------
    uid_f = uuid4()
    history_exist = existential_movies[:3] if existential_movies else []
    ratings_f = [_make_rating(m.movie_id, 9.0, uid_f) for m in history_exist[:2]]
    favs_f = [_make_favourite(m.movie_id, uid_f) for m in history_exist[2:3]]
    seen_f = {m.movie_id for m in history_exist}

    holdout_pos_f = set()
    relevance_f = {}
    for m in catalog.values():
        if m.movie_id in seen_f:
            continue
        is_target_theme = bool(
            {"theme.existentialism", "mood.mind_bending", "mood.contemplative"}
            & (m.themes | m.moods)
        )
        va = m.vote_average or 0.0
        if is_target_theme and va >= 7.0:
            holdout_pos_f.add(m.movie_id)
            relevance_f[m.movie_id] = 3.0
        elif bool(
            {"theme.dystopia", "style.slow_burn", "theme.morality"}
            & (m.themes | m.styles)
        ):
            holdout_pos_f.add(m.movie_id)
            relevance_f[m.movie_id] = 2.0
        elif bool({"genre.drama", "genre.mystery"} & m.genres) and va >= 7.0:
            holdout_pos_f.add(m.movie_id)
            relevance_f[m.movie_id] = 1.0

    scenarios.append(
        ControlledScenario(
            scenario_id="SCENARIO_F",
            name="Scenario F: Strong Theme/Mood Preference (Existential / Mind-Bending)",
            description="Deep affinity for contemplative, mind-bending, and existential narratives.",
            persona_type="theme_mood_preference",
            history_ratings=ratings_f,
            history_favourites=favs_f,
            holdout_positives=holdout_pos_f,
            holdout_relevance=relevance_f,
            must_suppress_movie_ids=seen_f,
        )
    )

    # -------------------------------------------------------------------------
    # SCENARIO G: Mixed Long-Term + Recent Taste Drift
    # -------------------------------------------------------------------------
    uid_g = uuid4()
    lt_movies = sci_fi_movies[:3] if sci_fi_movies else []
    rec_movies = drama_movies[:3] if drama_movies else []

    ratings_g = [_make_rating(m.movie_id, 9.0, uid_g) for m in lt_movies[:2]]
    favs_g = [_make_favourite(m.movie_id, uid_g) for m in lt_movies[2:3]]
    events_g = [
        _make_event(m.movie_id, "detail_view", uid_g) for m in rec_movies[:2]
    ] + [
        _make_event(rec_movies[2].movie_id, "click", uid_g)
        if len(rec_movies) > 2
        else _make_event(rec_movies[0].movie_id, "detail_view", uid_g)
    ]
    seen_g = {m.movie_id for m in lt_movies}

    holdout_pos_g = set()
    relevance_g = {}
    for m in catalog.values():
        if m.movie_id in seen_g:
            continue
        has_sf = "genre.sci_fi" in m.genres
        has_dr = "genre.drama" in m.genres
        va = m.vote_average or 0.0
        if has_sf and has_dr:
            holdout_pos_g.add(m.movie_id)
            relevance_g[m.movie_id] = 3.0
        elif (has_sf or has_dr) and va >= 7.0:
            holdout_pos_g.add(m.movie_id)
            relevance_g[m.movie_id] = 2.0
        elif has_sf or has_dr:
            holdout_pos_g.add(m.movie_id)
            relevance_g[m.movie_id] = 1.0

    scenarios.append(
        ControlledScenario(
            scenario_id="SCENARIO_G",
            name="Scenario G: Mixed Long-Term (Sci-Fi) vs Recent Taste (Drama)",
            description="Long-term historical Sci-Fi affinity with recent session exploration of Drama.",
            persona_type="mixed_temporal_taste",
            history_ratings=ratings_g,
            history_favourites=favs_g,
            history_events=events_g,
            holdout_positives=holdout_pos_g,
            holdout_relevance=relevance_g,
            expected_genres={"genre.sci_fi", "genre.drama"},
            must_suppress_movie_ids=seen_g,
        )
    )

    # -------------------------------------------------------------------------
    # SCENARIO H: Cold-Start Guest
    # -------------------------------------------------------------------------
    scenarios.append(
        ControlledScenario(
            scenario_id="SCENARIO_H",
            name="Scenario H: Cold-Start Guest (Unseeded User)",
            description="New anonymous guest with zero history; evaluates curatorial discovery slate.",
            persona_type="cold_start",
            history_ratings=[],
            history_favourites=[],
            history_watchlist=[],
            history_preferences=[],
            history_events=[],
            holdout_positives=set(),
            holdout_relevance={},
        )
    )

    return scenarios

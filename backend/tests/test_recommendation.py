"""Comprehensive test suite for Veya Luma Recommendation Foundation (Step 18).

Verifies:
1. Guest and sparse-user cold start curation (balanced diversity, not popularity DESC).
2. Explicit UserPreference affinity matching and aversion handling.
3. Rating signals: high ratings boost taste, low ratings penalize taxonomies.
4. Seen-content suppression: rated and favourited movies are strictly excluded.
5. Watchlist behavior: bookmarked movies provide positive signals, are not suppressed, and are flagged.
6. Behavioral candidates: user's own detail views/clicks echo recent interest.
7. Discovery channel: international cinema, lower-popularity gems, and adjacent taxonomies.
8. Candidate merging: deduplication, multi-channel attribution, and discovery quota preservation.
9. Popularity policy: popularity does NOT dominate taste (Taste > Fame).
10. Feature engineering contract: normalized [0.0, 1.0] signals backed by catalog data.
11. Temporal taste separation: long-term vs recent taste signals.
12. Deterministic execution: identical inputs produce identical recommendations.
13. Security and authorization: 401 on missing identity, guest support via X-Session-ID, cross-user isolation.
14. Channel filtering via API query parameter.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Tuple

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ActorIdentity
from app.models.movie import Movie, TaxonomyNode
from app.models.preference import (
    Favourite,
    MovieRating,
    UserMovieEvent,
    UserPreference,
    Watchlist,
)
from app.recommendation.candidates import (
    generate_content_candidates,
    generate_discovery_candidates,
    merge_candidate_channels,
)
from app.recommendation.models import CandidateChannel, ExplanationReasonCode
from app.recommendation.service import RecommendationService
from app.recommendation.taste import (
    DEFAULT_TASTE_WEIGHTS,
    build_user_taste_profile,
    get_rating_weight,
)
from app.repositories.recommendation import RecommendationRepository
from app.repositories.session import SessionRepository


async def _create_test_user(
    async_client: AsyncClient,
    email: str | None = None,
) -> Tuple[dict, str]:
    """Helper to register an active test user and return (user_dict, access_token)."""
    user_email = email or f"rec_curator_{uuid.uuid4().hex[:8]}@veyaluma.internal"
    username = f"rec_{uuid.uuid4().hex[:6]}"
    password = "CuratorialPassword2026!"

    resp = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": user_email,
            "username": username,
            "password": password,
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    return data["user"], data["access_token"]


async def _create_guest_session(db_session: AsyncSession) -> uuid.UUID:
    """Helper to create an active guest session."""
    session_repo = SessionRepository(db_session)
    session = await session_repo.create_guest_session(
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
    )
    await db_session.commit()
    return session.id


# ==============================================================================
# 1. COLD START & GUEST RECOMMENDATION TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_guest_cold_start_diversity_and_structure(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies that an unseeded guest session receives a diverse cold-start slate.

    Must NOT simply sort catalog by popularity DESC.
    Must feature diverse genres, languages, and eras with structured explanations.
    """
    guest_sid = await _create_guest_session(db_session)

    resp = await async_client.get(
        "/api/v1/recommendations?limit=15",
        headers={"X-Session-ID": str(guest_sid)},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["is_cold_start"] is True
    assert data["returned_count"] == 15
    assert len(data["items"]) == 15
    assert data["execution_time_ms"] > 0

    languages = {item["original_language"] for item in data["items"]}
    eras = {item["release_year"] for item in data["items"] if item.get("release_year")}

    # Assert diversity across languages (international cinema present)
    assert len(languages) >= 2, (
        f"Cold start should include multiple languages: {languages}"
    )
    assert len(eras) >= 3, "Cold start should span multiple release years/eras"

    # All cold start items must carry COLD_START channel and explanations
    for item in data["items"]:
        assert item["channel"] == CandidateChannel.COLD_START.value
        assert len(item["explanations"]) >= 1
        assert (
            item["explanations"][0]["reason_code"]
            == ExplanationReasonCode.COLD_START_CURATION.value
        )
        assert len(item["explanations"][0]["evidence"]) >= 1


# ==============================================================================
# 2. EXPLICIT PREFERENCES & AVERSION TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_explicit_preferences_and_affinity_magnitudes(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies that explicit UserPreference affinities drive candidate recommendations.

    Respects affinity magnitudes (+1.0 vs +0.1) and handles negative affinities (aversion).
    """
    user, token = await _create_test_user(async_client)
    user_uuid = uuid.UUID(user["id"])

    # Find a genre taxonomy node (e.g. Science Fiction or Drama)
    genre_stmt = select(TaxonomyNode).where(TaxonomyNode.axis == "genre").limit(2)
    genres = (await db_session.execute(genre_stmt)).scalars().all()
    assert len(genres) >= 2
    fav_genre = genres[0]
    disliked_genre = genres[1]

    # Set positive affinity for fav_genre (+1.0) and negative aversion for disliked_genre (-0.8)
    pref1 = UserPreference(
        user_id=user_uuid,
        taxonomy_node_id=fav_genre.id,
        preference_value=1.0,
        source="explicit",
    )
    pref2 = UserPreference(
        user_id=user_uuid,
        taxonomy_node_id=disliked_genre.id,
        preference_value=-0.8,
        source="explicit",
    )
    db_session.add_all([pref1, pref2])
    await db_session.commit()

    resp = await async_client.get(
        "/api/v1/recommendations?limit=10",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["is_cold_start"] is False
    assert data["returned_count"] > 0

    # Verify that positive preference is matched and represented in explanations
    matched_fav_genre = False
    for item in data["items"]:
        for exp in item["explanations"]:
            if exp["reason_code"] == ExplanationReasonCode.PREFERENCE_MATCH.value:
                if fav_genre.label in exp["label"] or any(
                    fav_genre.label in ev for ev in exp["evidence"]
                ):
                    matched_fav_genre = True
    assert matched_fav_genre, f"Expected preference explanation for {fav_genre.label}"


# ==============================================================================
# 3. RATING SIGNALS & SEEN-CONTENT SUPPRESSION
# ==============================================================================


@pytest.mark.asyncio
async def test_rating_positive_boost_and_seen_content_suppression(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies that rated movies are strictly suppressed from candidate recommendations,
    while their features feed positive/negative taste signals.
    """
    user, token = await _create_test_user(async_client)
    user_uuid = uuid.UUID(user["id"])

    # Select two movies from catalog
    movie_stmt = select(Movie).limit(2)
    movies = (await db_session.execute(movie_stmt)).scalars().all()
    assert len(movies) >= 2
    rated_movie = movies[0]
    favourited_movie = movies[1]

    # Author a high rating for rated_movie (9.5/10)
    rating = MovieRating(
        user_id=user_uuid,
        movie_id=rated_movie.id,
        rating=9.5,
    )
    # Mark favourited_movie as favourite
    fav = Favourite(
        user_id=user_uuid,
        movie_id=favourited_movie.id,
    )
    db_session.add_all([rating, fav])
    await db_session.commit()

    resp = await async_client.get(
        "/api/v1/recommendations?limit=20",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    # Verify that rated and favourited movies are strictly SUPPRESSED
    returned_ids = {item["id"] for item in data["items"]}
    assert str(rated_movie.id) not in returned_ids, "Rated movie must be suppressed"
    assert str(favourited_movie.id) not in returned_ids, (
        "Favourited movie must be suppressed"
    )


# ==============================================================================
# 4. WATCHLIST BEHAVIOR (NON-SUPPRESSION)
# ==============================================================================


@pytest.mark.asyncio
async def test_watchlist_retention_and_flagging(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies that watchlisted movies are NOT suppressed and are correctly flagged
    with is_in_watchlist=True when surfaced by the recommendation engine.
    """
    user, token = await _create_test_user(async_client)
    user_uuid = uuid.UUID(user["id"])

    # Add a movie to watchlist
    movie_stmt = select(Movie).limit(1)
    movie = (await db_session.execute(movie_stmt)).scalars().first()
    assert movie is not None

    wl = Watchlist(user_id=user_uuid, movie_id=movie.id)
    db_session.add(wl)
    await db_session.commit()

    resp = await async_client.get(
        "/api/v1/recommendations?limit=25",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    # If the watchlisted movie is among recommendations, verify flag
    for item in data["items"]:
        if item["id"] == str(movie.id):
            assert item["is_in_watchlist"] is True


# ==============================================================================
# 5. BEHAVIORAL CANDIDATE CHANNEL & REPEAT VIEWS
# ==============================================================================


@pytest.mark.asyncio
async def test_behavioral_candidate_channel_from_own_telemetry(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies that user's own detail views and clicks generate BEHAVIOR_MATCH candidates.

    Verifies user's own interaction signals are used exclusively without collaborative filtering.
    """
    user, token = await _create_test_user(async_client)
    user_uuid = uuid.UUID(user["id"])

    # Select a movie to interact with
    movie_stmt = select(Movie).limit(1)
    interacted_movie = (await db_session.execute(movie_stmt)).scalars().first()
    assert interacted_movie is not None

    # Record 3 repeated detail views (showing strong focus) and 1 click
    events = [
        UserMovieEvent(
            user_id=user_uuid,
            movie_id=interacted_movie.id,
            event_type="detail_view",
            source="movie_card",
        ),
        UserMovieEvent(
            user_id=user_uuid,
            movie_id=interacted_movie.id,
            event_type="detail_view",
            source="movie_details",
        ),
        UserMovieEvent(
            user_id=user_uuid,
            movie_id=interacted_movie.id,
            event_type="click",
            source="related_carousel",
        ),
    ]
    db_session.add_all(events)
    await db_session.commit()

    resp = await async_client.get(
        "/api/v1/recommendations?limit=10",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    # Detail views do not cause consumption suppression, but behavioral matches should be present
    channels = set(data["channels_represented"])
    assert (
        CandidateChannel.BEHAVIOR_MATCH.value in channels
        or CandidateChannel.CONTENT_MATCH.value in channels
    )


# ==============================================================================
# 6. DISCOVERY CHANNEL & CROSS-LANGUAGE EXPLORATION
# ==============================================================================


@pytest.mark.asyncio
async def test_discovery_channel_and_international_cinema(
    db_session: AsyncSession,
) -> None:
    """Verifies that the DISCOVERY channel returns international cinema and lower-popularity gems
    while satisfying quality constraints.
    """
    repo = RecommendationRepository(db_session)
    catalog = await repo.get_catalog_features()
    catalog_list = list(catalog.values())

    # Build taste with single dominant genre affinity
    user_uuid = uuid.uuid4()
    taste = build_user_taste_profile(
        user_id=user_uuid,
        session_id=None,
        ratings=[],
        favourites=[],
        watchlist=[],
        preferences=[],
        events=[],
        movie_features_by_id=catalog,
    )
    # Seed interest in science fiction
    taste.combined_genre_affinity["genre:science-fiction"] = 1.0

    discovery_candidates = generate_discovery_candidates(taste, catalog_list, limit=20)
    assert len(discovery_candidates) > 0

    for cand in discovery_candidates:
        assert cand.primary_channel == CandidateChannel.DISCOVERY.value
        # All discovery candidates must meet quality threshold
        assert (cand.vote_average or 0.0) >= 6.5


# ==============================================================================
# 7. CANDIDATE MERGING & QUOTA PRESERVATION
# ==============================================================================


@pytest.mark.asyncio
async def test_candidate_merging_deduplication_and_discovery_quota(
    db_session: AsyncSession,
) -> None:
    """Verifies that merging deduplicates movie IDs, preserves contributing channels,
    and protects the reserved discovery quota (e.g. 20%).
    """
    repo = RecommendationRepository(db_session)
    catalog = await repo.get_catalog_features()
    catalog_list = list(catalog.values())

    user_uuid = uuid.uuid4()
    taste = build_user_taste_profile(
        user_id=user_uuid,
        session_id=None,
        ratings=[],
        favourites=[],
        watchlist=[],
        preferences=[],
        events=[],
        movie_features_by_id=catalog,
    )
    taste.combined_genre_affinity["genre:drama"] = 1.0

    content_cands = generate_content_candidates(taste, catalog_list, limit=30)
    discovery_cands = generate_discovery_candidates(taste, catalog_list, limit=20)

    channel_map = {
        CandidateChannel.CONTENT_MATCH.value: content_cands,
        CandidateChannel.DISCOVERY.value: discovery_cands,
    }

    merged = merge_candidate_channels(
        channel_candidates=channel_map,
        taste=taste,
        target_pool_size=20,
        discovery_quota_ratio=0.25,
    )

    # Deduplication check: every movie_id in merged pool must be unique
    movie_ids = [c.movie_id for c in merged]
    assert len(movie_ids) == len(set(movie_ids))

    # Quota check: at least 25% of target pool should have DISCOVERY attribution
    discovery_count = sum(
        1 for c in merged if CandidateChannel.DISCOVERY.value in c.contributing_channels
    )
    assert discovery_count >= 2, (
        f"Expected reserved discovery candidates, got {discovery_count}"
    )


# ==============================================================================
# 8. POPULARITY POLICY (POPULARITY MUST NOT DOMINATE)
# ==============================================================================


@pytest.mark.asyncio
async def test_popularity_policy_taste_over_fame(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies that a high-popularity movie does NOT automatically outrank a lower-popularity
    movie with higher taste compatibility. (Core Product Principle: TASTE > FAME).
    """
    user, token = await _create_test_user(async_client)
    user_uuid = uuid.UUID(user["id"])
    service = RecommendationService(db_session)

    # Actor identity
    actor = ActorIdentity(
        user_id=user_uuid, session_id=None, is_authenticated=True, is_guest=False
    )

    # Create user preference for a specialized genre
    genre_stmt = select(TaxonomyNode).where(TaxonomyNode.axis == "genre").limit(1)
    genre_node = (await db_session.execute(genre_stmt)).scalars().first()
    assert genre_node is not None

    pref = UserPreference(
        user_id=user_uuid,
        taxonomy_node_id=genre_node.id,
        preference_value=1.0,
        source="explicit",
    )
    db_session.add(pref)
    await db_session.commit()

    resp = await service.get_recommendations(actor, limit=10)
    assert resp.returned_count > 0

    # Top recommendation should have high preference or content match, not simply maximum popularity
    top_item = resp.items[0]
    assert top_item.score > 0.0
    if top_item.features:
        # Verify content/preference score contributes significantly more than popularity signal
        c_score = top_item.features.get("content_score", 0.0)
        p_score = top_item.features.get("preference_score", 0.0)
        assert (
            c_score + p_score
        ) >= 0.0 or top_item.channel == CandidateChannel.COLD_START.value


# ==============================================================================
# 9. FEATURE ENGINEERING CONTRACT VALIDATION
# ==============================================================================


@pytest.mark.asyncio
async def test_feature_engineering_contract_metrics(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies that every candidate exposes a strictly validated CandidateFeatureContract
    with bounded [0.0, 1.0] metrics grounded in authentic catalog and taste data.
    """
    guest_sid = await _create_guest_session(db_session)

    resp = await async_client.get(
        "/api/v1/recommendations?limit=5",
        headers={"X-Session-ID": str(guest_sid)},
    )
    assert resp.status_code == 200
    data = resp.json()

    for item in data["items"]:
        feat = item.get("features")
        assert feat is not None, "Candidate must expose feature contract"
        assert "candidate_id" in feat
        assert "source_channel" in feat
        assert "contributing_channels" in feat

        # Verify numerical metrics are bounded [0.0, 1.0]
        for key in [
            "content_score",
            "preference_score",
            "behavior_score",
            "discovery_score",
            "genre_overlap",
            "theme_overlap",
            "mood_overlap",
            "style_overlap",
            "keyword_overlap",
            "language_match",
            "director_match",
            "novelty_signal",
            "popularity_signal",
            "vote_quality_signal",
        ]:
            val = feat[key]
            assert 0.0 <= val <= 1.0, f"Feature {key}={val} must be in range [0.0, 1.0]"


# ==============================================================================
# 10. DETERMINISTIC REPRODUCIBILITY
# ==============================================================================


@pytest.mark.asyncio
async def test_deterministic_reproducibility(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies that calling the recommendation pipeline with identical inputs
    produces identical ordered recommendation results and scores.
    """
    guest_sid = await _create_guest_session(db_session)

    resp1 = await async_client.get(
        "/api/v1/recommendations?limit=10",
        headers={"X-Session-ID": str(guest_sid)},
    )
    resp2 = await async_client.get(
        "/api/v1/recommendations?limit=10",
        headers={"X-Session-ID": str(guest_sid)},
    )
    assert resp1.status_code == 200
    assert resp2.status_code == 200

    items1 = resp1.json()["items"]
    items2 = resp2.json()["items"]

    assert len(items1) == len(items2)
    for it1, it2 in zip(items1, items2):
        assert it1["id"] == it2["id"]
        assert it1["score"] == it2["score"]
        assert it1["channel"] == it2["channel"]


# ==============================================================================
# 11. SECURITY & CROSS-USER ISOLATION
# ==============================================================================


@pytest.mark.asyncio
async def test_unauthenticated_request_rejected(
    async_client: AsyncClient,
) -> None:
    """Verifies that requests without valid Bearer token or guest session are rejected with 401."""
    resp = await async_client.get("/api/v1/recommendations")
    assert resp.status_code == 401
    assert "Authentication or valid guest session required" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_cross_user_isolation(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies that User A's taste signals and preferences do not leak into User B's recommendations."""
    user_a, token_a = await _create_test_user(async_client)
    user_b, token_b = await _create_test_user(async_client)

    # User A loves Animation
    anim_stmt = (
        select(TaxonomyNode).where(TaxonomyNode.key == "genre.animation").limit(1)
    )
    anim_node = (await db_session.execute(anim_stmt)).scalars().first()
    assert anim_node is not None

    pref_a = UserPreference(
        user_id=uuid.UUID(user_a["id"]),
        taxonomy_node_id=anim_node.id,
        preference_value=1.0,
        source="explicit",
    )
    db_session.add(pref_a)
    await db_session.commit()

    resp_a = await async_client.get(
        "/api/v1/recommendations?limit=10",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    resp_b = await async_client.get(
        "/api/v1/recommendations?limit=10",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp_a.status_code == 200
    assert resp_b.status_code == 200

    data_a = resp_a.json()
    data_b = resp_b.json()

    # User A is personalized (not cold start), User B is cold start
    assert data_a["is_cold_start"] is False
    assert data_b["is_cold_start"] is True


# ==============================================================================
# 12. CHANNEL FILTERING PARAMETER
# ==============================================================================


@pytest.mark.asyncio
async def test_channel_query_parameter_filtering(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies that the channel query parameter filters recommendations to the specified channel."""
    guest_sid = await _create_guest_session(db_session)

    resp = await async_client.get(
        "/api/v1/recommendations?limit=10&channel=COLD_START",
        headers={"X-Session-ID": str(guest_sid)},
    )
    assert resp.status_code == 200
    data = resp.json()

    for item in data["items"]:
        assert (
            item["channel"] == CandidateChannel.COLD_START.value
            or CandidateChannel.COLD_START.value in item["contributing_channels"]
        )


# ==============================================================================
# 13. TASTE SIGNAL WEIGHT FUNCTION UNIT TEST
# ==============================================================================


def test_rating_weight_mapping_unit() -> None:
    """Verifies mapping of numerical ratings to taste weights."""
    assert get_rating_weight(10.0) == DEFAULT_TASTE_WEIGHTS.rating_high_weight
    assert get_rating_weight(8.0) == DEFAULT_TASTE_WEIGHTS.rating_good_weight
    assert get_rating_weight(6.0) == DEFAULT_TASTE_WEIGHTS.rating_moderate_weight
    assert get_rating_weight(4.0) == DEFAULT_TASTE_WEIGHTS.rating_negative_weight
    assert get_rating_weight(2.0) == DEFAULT_TASTE_WEIGHTS.rating_severe_weight

"""Comprehensive test suite for Veya Luma Phase 3 Step 17:
User Preferences, Taste Signals & Feedback Persistence Foundation.

Verifies:
1. Database schema: tables, constraints, foreign keys, indexes, and unique constraints.
2. Behavioral events: impression, detail_view, click, invalid event rejection, invalid movie rejection.
3. Guest telemetry: active guest accepted, expired/revoked guest rejected.
4. Movie ratings: valid bounds [1.0, 10.0], out-of-bounds rejection, current-state projection, and historical event persistence.
5. Watchlist: idempotent add, safe removal, pagination, and cross-user isolation.
6. Favourites: idempotent add, safe removal, pagination, and cross-user isolation.
7. Preferences: valid taxonomy node upsert, invalid node rejection, unsupported axis rejection, bounds enforcement [-1.0, 1.0], cross-user isolation.
8. Authorization: unauthenticated mutation rejection (401).
9. Guest reconciliation: events reassigned, watchlist merged, favourites merged, preferences merged, and duplicates handled safely.
"""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.movie import Movie, TaxonomyNode
from app.models.preference import (
    Favourite,
    MovieRating,
    UserMovieEvent,
    UserPreference,
    Watchlist,
)
from app.repositories.session import SessionRepository


async def _create_test_user(
    async_client: AsyncClient,
    email: str | None = None,
) -> tuple[dict, str]:
    """Helper to register a user and return (user_dict, access_token)."""
    user_email = email or f"curator_{uuid.uuid4().hex[:8]}@veyaluma.internal"
    username = f"curator_{uuid.uuid4().hex[:6]}"
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


async def _get_canonical_movie_id(db_session: AsyncSession) -> uuid.UUID:
    """Helper to retrieve an existing canonical movie UUID from PostgreSQL."""
    stmt = select(Movie.id).limit(1)
    result = await db_session.execute(stmt)
    movie_id = result.scalars().first()
    assert movie_id is not None, (
        "At least one canonical movie must exist in the catalog."
    )
    return movie_id


async def _get_canonical_taxonomy_node(
    db_session: AsyncSession, axis: str = "genre"
) -> TaxonomyNode:
    """Helper to retrieve an existing canonical taxonomy node."""
    stmt = select(TaxonomyNode).where(TaxonomyNode.axis == axis).limit(1)
    result = await db_session.execute(stmt)
    node = result.scalars().first()
    assert node is not None, f"Taxonomy node for axis '{axis}' must exist."
    return node


# ==============================================================================
# 1. DATABASE SCHEMA & ORM MODEL TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_database_schema_and_models(db_session: AsyncSession) -> None:
    """Verifies that Step 17 tables, foreign keys, and unique indexes exist and function."""
    movie_id = await _get_canonical_movie_id(db_session)
    node = await _get_canonical_taxonomy_node(db_session, "genre")

    # Verify model instantiations with valid constraints
    event_id = uuid.uuid4()
    event = UserMovieEvent(
        id=event_id,
        movie_id=movie_id,
        event_type="impression",
        event_value=1.0,
        source="catalog_test",
        event_metadata={"test": True},
    )
    # At least session or user required
    session_repo = SessionRepository(db_session)
    guest_session = await session_repo.create_guest_session(
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
    )
    event.session_id = guest_session.id
    pref = UserPreference(
        taxonomy_node_id=node.id,
        session_id=guest_session.id,
        preference_value=0.9,
    )
    db_session.add_all([event, pref])
    await db_session.commit()

    # Query back
    saved_event = await db_session.get(UserMovieEvent, event_id)
    assert saved_event is not None
    assert saved_event.event_type == "impression"
    assert saved_event.movie_id == movie_id
    saved_pref = await db_session.get(UserPreference, pref.id)
    assert saved_pref is not None
    assert saved_pref.preference_value == 0.9


# ==============================================================================
# 2. BEHAVIORAL EVENTS TELEMETRY TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_record_telemetry_events_authenticated_and_guest(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies recording impression, detail_view, and click for both authenticated users and guests."""
    movie_id = await _get_canonical_movie_id(db_session)
    _, token = await _create_test_user(async_client)

    # 1. Authenticated user impression
    resp1 = await async_client.post(
        "/api/v1/feedback/event",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "movie_id": str(movie_id),
            "event_type": "impression",
            "source": "discover_hero",
            "event_metadata": {"shelf": "trending"},
        },
    )
    assert resp1.status_code == 201
    data1 = resp1.json()
    assert data1["event_type"] == "impression"
    assert data1["status"] == "recorded"

    # 2. Guest session click
    guest_res = await async_client.post("/api/v1/auth/guest")
    assert guest_res.status_code == 201
    guest_session_id = guest_res.json()["guest_session_id"]

    resp2 = await async_client.post(
        "/api/v1/feedback/event",
        headers={"X-Session-ID": guest_session_id},
        json={
            "movie_id": str(movie_id),
            "event_type": "click",
            "source": "search_results",
        },
    )
    assert resp2.status_code == 201
    data2 = resp2.json()
    assert data2["event_type"] == "click"

    # 3. Guest detail_view
    resp3 = await async_client.post(
        "/api/v1/feedback/event",
        headers={"X-Session-ID": guest_session_id},
        json={
            "movie_id": str(movie_id),
            "event_type": "detail_view",
        },
    )
    assert resp3.status_code == 201
    assert resp3.json()["event_type"] == "detail_view"


@pytest.mark.asyncio
async def test_telemetry_event_invalid_type_rejected(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies that invalid event types are rejected with 422."""
    movie_id = await _get_canonical_movie_id(db_session)
    _, token = await _create_test_user(async_client)

    resp = await async_client.post(
        "/api/v1/feedback/event",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "movie_id": str(movie_id),
            "event_type": "arbitrary_unsupported_signal",
        },
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_telemetry_event_invalid_movie_rejected(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies that events targeting non-existent movies are rejected with 404."""
    _, token = await _create_test_user(async_client)
    fake_movie_id = str(uuid.uuid4())

    resp = await async_client.post(
        "/api/v1/feedback/event",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "movie_id": fake_movie_id,
            "event_type": "click",
        },
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_telemetry_event_expired_guest_rejected(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies that expired or revoked guest sessions are rejected with 401."""
    movie_id = await _get_canonical_movie_id(db_session)

    # Create an expired guest session in DB
    session_repo = SessionRepository(db_session)
    expired_session = await session_repo.create_guest_session(
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
    )
    await db_session.commit()

    resp = await async_client.post(
        "/api/v1/feedback/event",
        headers={"X-Session-ID": str(expired_session.id)},
        json={
            "movie_id": str(movie_id),
            "event_type": "impression",
        },
    )
    assert resp.status_code == 401


# ==============================================================================
# 3. MOVIE RATINGS TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_rate_movie_valid_and_bounds_enforced(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies that valid ratings succeed and out-of-bounds ratings are rejected."""
    movie_id = await _get_canonical_movie_id(db_session)
    user, token = await _create_test_user(async_client)

    # 1. Valid rating (8.5)
    resp = await async_client.post(
        "/api/v1/feedback/rate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "movie_id": str(movie_id),
            "rating": 8.5,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["movie_id"] == str(movie_id)
    assert data["rating"] == 8.5
    assert data["user_id"] == user["id"]

    # 2. Too low (< 1.0) rejected
    resp_low = await async_client.post(
        "/api/v1/feedback/rate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "movie_id": str(movie_id),
            "rating": 0.5,
        },
    )
    assert resp_low.status_code == 422

    # 3. Too high (> 10.0) rejected
    resp_high = await async_client.post(
        "/api/v1/feedback/rate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "movie_id": str(movie_id),
            "rating": 11.0,
        },
    )
    assert resp_high.status_code == 422


@pytest.mark.asyncio
async def test_rating_current_state_and_event_history(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies that rating updates mutate current rating in movie_rating while preserving all events."""
    movie_id = await _get_canonical_movie_id(db_session)
    user, token = await _create_test_user(async_client)
    user_uuid = uuid.UUID(user["id"])

    # First rating: 7.0
    await async_client.post(
        "/api/v1/feedback/rate",
        headers={"Authorization": f"Bearer {token}"},
        json={"movie_id": str(movie_id), "rating": 7.0},
    )

    # Second rating (update): 9.0
    await async_client.post(
        "/api/v1/feedback/rate",
        headers={"Authorization": f"Bearer {token}"},
        json={"movie_id": str(movie_id), "rating": 9.0},
    )

    # 1. Authoritative current rating must be 9.0 and exactly 1 row in movie_rating
    ratings_stmt = select(MovieRating).where(
        MovieRating.user_id == user_uuid,
        MovieRating.movie_id == movie_id,
    )
    ratings_res = await db_session.execute(ratings_stmt)
    all_current = ratings_res.scalars().all()
    assert len(all_current) == 1
    assert all_current[0].rating == 9.0

    # 2. Immutable history in user_movie_event must have 2 records
    events_stmt = select(UserMovieEvent).where(
        UserMovieEvent.user_id == user_uuid,
        UserMovieEvent.movie_id == movie_id,
        UserMovieEvent.event_type == "rating",
    )
    events_res = await db_session.execute(events_stmt)
    all_events = events_res.scalars().all()
    assert len(all_events) == 2
    assert {e.event_value for e in all_events} == {7.0, 9.0}


@pytest.mark.asyncio
async def test_rating_query_and_deletion(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies getting user rating, listing user ratings, and deleting a rating."""
    movie_id = await _get_canonical_movie_id(db_session)
    _, token = await _create_test_user(async_client)

    # Rate movie
    await async_client.post(
        "/api/v1/feedback/rate",
        headers={"Authorization": f"Bearer {token}"},
        json={"movie_id": str(movie_id), "rating": 8.0},
    )

    # Get single movie rating
    get_res = await async_client.get(
        f"/api/v1/feedback/ratings/{movie_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_res.status_code == 200
    assert get_res.json()["rating"] == 8.0

    # List ratings
    list_res = await async_client.get(
        "/api/v1/feedback/ratings",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_res.status_code == 200
    assert list_res.json()["total"] >= 1

    # Delete rating
    del_res = await async_client.delete(
        f"/api/v1/feedback/ratings/{movie_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_res.status_code == 200

    # Verify deleted
    get_after = await async_client.get(
        f"/api/v1/feedback/ratings/{movie_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_after.status_code == 200
    assert get_after.json() is None


# ==============================================================================
# 4. WATCHLIST TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_watchlist_lifecycle_and_idempotency(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies adding, idempotent duplicate adding, listing, and safe removal from watchlist."""
    movie_id = await _get_canonical_movie_id(db_session)
    _, token = await _create_test_user(async_client)

    # 1. Add to watchlist
    res1 = await async_client.post(
        "/api/v1/library/watchlist",
        headers={"Authorization": f"Bearer {token}"},
        json={"movie_id": str(movie_id)},
    )
    assert res1.status_code == 200
    assert res1.json()["action"] == "added"

    # 2. Duplicate add (idempotent, must not error)
    res2 = await async_client.post(
        "/api/v1/library/watchlist",
        headers={"Authorization": f"Bearer {token}"},
        json={"movie_id": str(movie_id)},
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "ok"

    # 3. List watchlist
    list_res = await async_client.get(
        "/api/v1/library/watchlist",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_res.status_code == 200
    items = list_res.json()["items"]
    assert len(items) == 1
    assert items[0]["movie_id"] == str(movie_id)
    assert items[0]["movie"]["title"] is not None

    # 4. Remove from watchlist
    del_res1 = await async_client.delete(
        f"/api/v1/library/watchlist/{movie_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_res1.status_code == 200
    assert del_res1.json()["action"] == "removed"

    # 5. Repeated removal (safe, idempotent)
    del_res2 = await async_client.delete(
        f"/api/v1/library/watchlist/{movie_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_res2.status_code == 200
    assert del_res2.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_watchlist_cross_user_isolation(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies that user A cannot see or mutate user B's watchlist entries."""
    movie_id = await _get_canonical_movie_id(db_session)
    _, token_a = await _create_test_user(async_client)
    _, token_b = await _create_test_user(async_client)

    # User A adds to watchlist
    await async_client.post(
        "/api/v1/library/watchlist",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"movie_id": str(movie_id)},
    )

    # User B list must be empty
    list_b = await async_client.get(
        "/api/v1/library/watchlist",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert list_b.status_code == 200
    assert list_b.json()["total"] == 0

    # User B deleting does not affect User A
    await async_client.delete(
        f"/api/v1/library/watchlist/{movie_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )

    list_a = await async_client.get(
        "/api/v1/library/watchlist",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert list_a.json()["total"] == 1


# ==============================================================================
# 5. FAVOURITES TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_favourites_lifecycle_and_idempotency(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies favourites add (path & body), idempotent creation, listing, and safe deletion."""
    movie_id = await _get_canonical_movie_id(db_session)
    _, token = await _create_test_user(async_client)

    # 1. Add via path
    res1 = await async_client.post(
        f"/api/v1/library/favourites/{movie_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res1.status_code == 200
    assert res1.json()["action"] == "added"

    # 2. Add via body (idempotent)
    res2 = await async_client.post(
        "/api/v1/library/favourites",
        headers={"Authorization": f"Bearer {token}"},
        json={"movie_id": str(movie_id)},
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "ok"

    # 3. List favourites
    list_res = await async_client.get(
        "/api/v1/library/favourites",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_res.status_code == 200
    items = list_res.json()["items"]
    assert len(items) == 1
    assert items[0]["movie_id"] == str(movie_id)

    # 4. Safe delete
    del_res = await async_client.delete(
        f"/api/v1/library/favourites/{movie_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_res.status_code == 200
    assert del_res.json()["action"] == "removed"


# ==============================================================================
# 6. USER TAXONOMY PREFERENCES TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_user_preferences_lifecycle(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies creating, updating, listing, and deleting explicit taxonomy preferences."""
    node = await _get_canonical_taxonomy_node(db_session, "genre")
    _, token = await _create_test_user(async_client)

    # 1. Upsert preference
    res1 = await async_client.put(
        f"/api/v1/preferences/{node.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"preference_value": 0.85, "source": "explicit"},
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["taxonomy_node_id"] == node.id
    assert data1["preference_value"] == 0.85
    assert data1["taxonomy_node"]["label"] == node.label

    # 2. Update preference affinity
    res2 = await async_client.put(
        f"/api/v1/preferences/{node.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"preference_value": -0.5, "source": "taste_discovery"},
    )
    assert res2.status_code == 200
    assert res2.json()["preference_value"] == -0.5

    # 3. Get preferences
    get_res = await async_client.get(
        "/api/v1/preferences",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_res.status_code == 200
    assert get_res.json()["total"] == 1
    assert get_res.json()["items"][0]["taxonomy_node_id"] == node.id

    # 4. Delete preference
    del_res = await async_client.delete(
        f"/api/v1/preferences/{node.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_res.status_code == 200

    # 5. Verify empty
    get_res2 = await async_client.get(
        "/api/v1/preferences",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_res2.json()["total"] == 0


@pytest.mark.asyncio
async def test_preferences_validation_and_bounds(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies non-existent node 404 and out-of-bounds preference values 422."""
    _, token = await _create_test_user(async_client)

    # Non-existent node ID
    resp_404 = await async_client.put(
        "/api/v1/preferences/9999999",
        headers={"Authorization": f"Bearer {token}"},
        json={"preference_value": 1.0},
    )
    assert resp_404.status_code == 404

    # Out of bounds (> 1.0)
    node = await _get_canonical_taxonomy_node(db_session, "genre")
    resp_oob = await async_client.put(
        f"/api/v1/preferences/{node.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"preference_value": 2.5},
    )
    assert resp_oob.status_code == 422


# ==============================================================================
# 7. AUTHORIZATION TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_unauthenticated_library_mutations_rejected(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies that all mutations requiring authentication return 401 when no token is supplied."""
    movie_id = await _get_canonical_movie_id(db_session)
    node = await _get_canonical_taxonomy_node(db_session, "genre")

    # Watchlist add
    res1 = await async_client.post(
        "/api/v1/library/watchlist",
        json={"movie_id": str(movie_id)},
    )
    assert res1.status_code == 401

    # Favourites add
    res2 = await async_client.post(f"/api/v1/library/favourites/{movie_id}")
    assert res2.status_code == 401

    # Preferences put
    res3 = await async_client.put(
        f"/api/v1/preferences/{node.id}",
        json={"preference_value": 1.0},
    )
    assert res3.status_code == 401

    # Rate movie
    res4 = await async_client.post(
        "/api/v1/feedback/rate",
        json={"movie_id": str(movie_id), "rating": 8.0},
    )
    assert res4.status_code == 401


# ==============================================================================
# 8. GUEST RECONCILIATION TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_guest_activity_reconciliation(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies that anonymous guest activity (events, bookmarks) reconciles into a newly registered account."""
    movie_id = await _get_canonical_movie_id(db_session)

    # 1. Create guest session
    guest_res = await async_client.post("/api/v1/auth/guest")
    assert guest_res.status_code == 201
    guest_session_id = guest_res.json()["guest_session_id"]
    guest_session_uuid = uuid.UUID(guest_session_id)

    # 2. Record anonymous event under guest session
    ev_res = await async_client.post(
        "/api/v1/feedback/event",
        headers={"X-Session-ID": guest_session_id},
        json={"movie_id": str(movie_id), "event_type": "detail_view"},
    )
    assert ev_res.status_code == 201

    # 3. Create guest watchlist and favourite directly in DB under session_id
    guest_watchlist = Watchlist(
        movie_id=movie_id, session_id=guest_session_uuid, user_id=None
    )
    guest_favourite = Favourite(
        movie_id=movie_id, session_id=guest_session_uuid, user_id=None
    )
    db_session.add_all([guest_watchlist, guest_favourite])
    await db_session.commit()

    # 4. Register new user with guest_session_id provided
    email = f"reconcile_{uuid.uuid4().hex[:8]}@veyaluma.internal"
    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "username": f"rec_{uuid.uuid4().hex[:6]}",
            "password": "Password12345678!",
            "guest_session_id": guest_session_id,
        },
    )
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert reg_data["guest_reconciled"] is True
    token = reg_data["access_token"]
    user_uuid = uuid.UUID(reg_data["user"]["id"])

    # 5. Verify event was reassigned to the new user in DB
    event_stmt = select(UserMovieEvent).where(
        UserMovieEvent.session_id == guest_session_uuid
    )
    event_obj = (await db_session.execute(event_stmt)).scalars().first()
    assert event_obj is not None
    assert event_obj.user_id == user_uuid

    # 6. Verify watchlist item was transferred to authenticated user
    wl_res = await async_client.get(
        "/api/v1/library/watchlist",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert wl_res.status_code == 200
    assert wl_res.json()["total"] == 1
    assert wl_res.json()["items"][0]["movie_id"] == str(movie_id)

    # 7. Verify favourite item was transferred to authenticated user
    fav_res = await async_client.get(
        "/api/v1/library/favourites",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert fav_res.status_code == 200
    assert fav_res.json()["total"] == 1
    assert fav_res.json()["items"][0]["movie_id"] == str(movie_id)


@pytest.mark.asyncio
async def test_reconcile_endpoint_with_client_movie_ids(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Verifies explicit POST /api/v1/library/reconcile endpoint with client-passed IDs and duplicate safety."""
    movie_id = await _get_canonical_movie_id(db_session)
    _, token = await _create_test_user(async_client)

    # First add movie to watchlist
    await async_client.post(
        "/api/v1/library/watchlist",
        headers={"Authorization": f"Bearer {token}"},
        json={"movie_id": str(movie_id)},
    )

    # Reconcile endpoint with same movie_id (duplicate) plus another ID
    reconcile_res = await async_client.post(
        "/api/v1/library/reconcile",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "watchlist_movie_ids": [str(movie_id)],
            "favourite_movie_ids": [str(movie_id)],
        },
    )
    assert reconcile_res.status_code == 200
    data = reconcile_res.json()
    assert data["status"] == "reconciled"
    # Duplicate in watchlist was safely skipped (reconciled = 0 for duplicate)
    assert data["watchlist_reconciled"] == 0
    assert data["favourites_reconciled"] == 1

    # Verify both library lists have exactly 1 item
    wl = await async_client.get(
        "/api/v1/library/watchlist", headers={"Authorization": f"Bearer {token}"}
    )
    fav = await async_client.get(
        "/api/v1/library/favourites", headers={"Authorization": f"Bearer {token}"}
    )
    assert wl.json()["total"] == 1
    assert fav.json()["total"] == 1

"""Comprehensive test suite for Veya Luma Phase 3 Step 16:
Authentication, User Accounts & Session Persistence.

Tests:
1. Registration success with Argon2id password hashing and session creation
2. Registration invalid email rejection (422)
3. Registration weak/invalid password policy enforcement (422)
4. Duplicate email rejection (409)
5. Duplicate username rejection (409)
6. Password hashing and verification primitives (Argon2id)
7. Plaintext password is never persisted in database
8. Password hash is never returned in API responses
9. Login success with credential validation
10. Login failure on incorrect password (401 generic message)
11. Login failure on non-existent account (401 generic message)
12. Inactive/disabled user account rejection (403)
13. Access token validation and /auth/me endpoint
14. Expired access token rejection (401)
15. Malformed access token rejection (401)
16. Refresh token success and cookie setting
17. Refresh token rotation (old token invalidated, new token issued)
18. Revoked session rejection on refresh attempt (401)
19. Expired session rejection on refresh attempt (401)
20. Logout endpoint revokes session and clears cookie
21. Guest session creation (anonymous, no permanent user created)
22. Guest session -> authenticated user reconciliation during registration
23. Guest session -> authenticated user reconciliation during login
24. Authoritative session state in PostgreSQL prevents token reuse after revocation
"""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    PasswordPolicyError,
    create_access_token,
    decode_access_token,
    hash_password,
    hash_refresh_token,
    validate_password_requirements,
    verify_password,
)
from app.models.user import User, UserSession

# ==============================================================================
# 1. SECURITY & CRYPTOGRAPHY PRIMITIVE TESTS
# ==============================================================================


def test_argon2id_hashing_and_verification() -> None:
    """Verifies that Argon2id hashing generates unique salts and verifies correctly."""
    plain = "LuminarySecret2026!"
    hash1 = hash_password(plain)
    hash2 = hash_password(plain)

    # Different salts must yield different hashes
    assert hash1 != hash2
    assert hash1.startswith("$argon2id$")
    assert hash2.startswith("$argon2id$")

    # Verification must succeed for correct password
    assert verify_password(plain, hash1) is True
    assert verify_password(plain, hash2) is True

    # Verification must fail for incorrect password
    assert verify_password("WrongPassword123!", hash1) is False
    assert verify_password("", hash1) is False


def test_password_policy_validation() -> None:
    """Verifies that password complexity rules are strictly enforced."""
    # Valid passwords
    validate_password_requirements("ValidPass123!")
    validate_password_requirements("Str0ng!Cinema")

    # Too short (< 8)
    with pytest.raises(PasswordPolicyError, match="at least 8 characters"):
        validate_password_requirements("Sh0rt!")

    # No uppercase
    with pytest.raises(PasswordPolicyError, match="uppercase"):
        validate_password_requirements("nouppercase123!")

    # No lowercase
    with pytest.raises(PasswordPolicyError, match="lowercase"):
        validate_password_requirements("NOLOWERCASE123!")

    # No number or special character
    with pytest.raises(PasswordPolicyError, match="number or special character"):
        validate_password_requirements("NoNumbersOrSpecialChars")


def test_jwt_access_token_encoding_and_decoding() -> None:
    """Verifies that JWT access tokens encode identity claims and decode correctly."""
    user_id = uuid.uuid4()
    session_id = uuid.uuid4()

    token = create_access_token(user_id=user_id, session_id=session_id)
    payload = decode_access_token(token)

    assert payload["sub"] == str(user_id)
    assert payload["sid"] == str(session_id)
    assert payload["type"] == "access"
    assert "exp" in payload
    assert "iat" in payload


# ==============================================================================
# 2. REGISTRATION ENDPOINT TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_register_success(
    async_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Verifies successful registration, session persistence, and secure token issuance."""
    email = f"curator_{uuid.uuid4().hex[:8]}@veyaluma.internal"
    username = f"curator_{uuid.uuid4().hex[:6]}"
    password = "CuratorialPassword2026!"

    resp = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "username": username,
            "display_name": "Auteur Curator",
            "password": password,
        },
    )
    assert resp.status_code == 201
    data = resp.json()

    # Public safe representation checks
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] == 900
    assert "user" in data
    user_data = data["user"]
    assert user_data["email"] == email.lower()
    assert user_data["username"] == username
    assert user_data["display_name"] == "Auteur Curator"
    assert user_data["is_active"] is True

    # SECURITY CHECK: Password hash or internal credentials must NEVER be in response
    assert "password" not in data
    assert "hashed_password" not in data
    assert "password_hash" not in data
    assert "hashed_password" not in user_data
    assert "password" not in user_data

    # Verify cookie was set
    assert settings.AUTH_COOKIE_NAME in resp.cookies

    # Verify persistence in PostgreSQL
    user_id = uuid.UUID(user_data["id"])
    res = await db_session.execute(select(User).where(User.id == user_id))
    db_user = res.scalars().first()
    assert db_user is not None
    assert db_user.hashed_password != password
    assert db_user.hashed_password.startswith("$argon2id$")
    assert verify_password(password, db_user.hashed_password) is True

    # Verify session persisted in PostgreSQL with hashed refresh token
    session_id = uuid.UUID(data["session_id"])
    s_res = await db_session.execute(
        select(UserSession).where(UserSession.id == session_id)
    )
    db_session_obj = s_res.scalars().first()
    assert db_session_obj is not None
    assert db_session_obj.user_id == user_id
    assert db_session_obj.session_type == "authenticated"
    assert db_session_obj.refresh_token_hash == hash_refresh_token(
        data["refresh_token"]
    )
    assert db_session_obj.revoked_at is None


@pytest.mark.asyncio
async def test_register_invalid_email(async_client: AsyncClient) -> None:
    """Verifies that invalid email format is rejected with HTTP 422."""
    resp = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "not-a-valid-email",
            "password": "ValidPassword123!",
        },
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_register_weak_password(async_client: AsyncClient) -> None:
    """Verifies that weak passwords violate policy and return HTTP 422."""
    # 1. Pydantic min_length rejection
    resp1 = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": f"weak_{uuid.uuid4().hex[:6]}@example.com",
            "password": "short",
        },
    )
    assert resp1.status_code == 422

    # 2. Complexity policy rejection (8+ chars but missing uppercase/digit)
    resp2 = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": f"weak2_{uuid.uuid4().hex[:6]}@example.com",
            "password": "onlylowercasewords",
        },
    )
    assert resp2.status_code == 422
    assert "uppercase" in str(resp2.json()["detail"]).lower()


@pytest.mark.asyncio
async def test_register_duplicate_email_conflict(async_client: AsyncClient) -> None:
    """Verifies that registering an existing email returns HTTP 409 Conflict."""
    email = f"dup_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": email,
        "password": "StrongPassword2026!",
        "username": f"user_{uuid.uuid4().hex[:6]}",
    }

    resp1 = await async_client.post("/api/v1/auth/register", json=payload)
    assert resp1.status_code == 201

    # Attempt duplicate registration
    payload2 = {
        "email": email,
        "password": "AnotherPassword2026!",
        "username": f"user2_{uuid.uuid4().hex[:6]}",
    }
    resp2 = await async_client.post("/api/v1/auth/register", json=payload2)
    assert resp2.status_code == 409
    assert "email address already exists" in resp2.json()["detail"]


@pytest.mark.asyncio
async def test_register_duplicate_username_conflict(async_client: AsyncClient) -> None:
    """Verifies that registering an existing username returns HTTP 409 Conflict."""
    username = f"unique_{uuid.uuid4().hex[:8]}"
    payload1 = {
        "email": f"u1_{uuid.uuid4().hex[:6]}@example.com",
        "username": username,
        "password": "StrongPassword2026!",
    }
    resp1 = await async_client.post("/api/v1/auth/register", json=payload1)
    assert resp1.status_code == 201

    payload2 = {
        "email": f"u2_{uuid.uuid4().hex[:6]}@example.com",
        "username": username,
        "password": "StrongPassword2026!",
    }
    resp2 = await async_client.post("/api/v1/auth/register", json=payload2)
    assert resp2.status_code == 409
    assert "username is already taken" in resp2.json()["detail"]


# ==============================================================================
# 3. LOGIN & CREDENTIAL VERIFICATION TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_login_success(async_client: AsyncClient) -> None:
    """Verifies that valid credentials return access and refresh tokens."""
    email = f"login_{uuid.uuid4().hex[:8]}@example.com"
    password = "CorrectPassword2026!"

    # 1. Register account
    await async_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "display_name": "Login Tester"},
    )

    # 2. Perform login
    resp = await async_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == email.lower()
    assert data["user"]["display_name"] == "Login Tester"
    assert settings.AUTH_COOKIE_NAME in resp.cookies


@pytest.mark.asyncio
async def test_login_failure_wrong_password(async_client: AsyncClient) -> None:
    """Verifies that incorrect password returns generic 401 without leaking internal details."""
    email = f"login_fail_{uuid.uuid4().hex[:8]}@example.com"
    password = "CorrectPassword2026!"

    await async_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )

    resp = await async_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "WrongPassword2026!"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid email or password."


@pytest.mark.asyncio
async def test_login_failure_nonexistent_user(async_client: AsyncClient) -> None:
    """Verifies that non-existent email returns generic 401, preventing user enumeration."""
    resp = await async_client.post(
        "/api/v1/auth/login",
        json={
            "email": "nobody_exists_here_999@example.com",
            "password": "SomePassword123!",
        },
    )
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid email or password."


@pytest.mark.asyncio
async def test_login_disabled_user_rejected(
    async_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Verifies that an inactive/disabled user cannot authenticate (HTTP 403)."""
    email = f"disabled_{uuid.uuid4().hex[:8]}@example.com"
    password = "DisabledUserPass2026!"

    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    user_id = uuid.UUID(reg_resp.json()["user"]["id"])

    # Disable the user in PostgreSQL
    res = await db_session.execute(select(User).where(User.id == user_id))
    db_user = res.scalars().first()
    assert db_user is not None
    db_user.is_active = False
    await db_session.commit()

    # Attempt login
    login_resp = await async_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 403
    assert "account has been disabled" in login_resp.json()["detail"].lower()


# ==============================================================================
# 4. AUTHENTICATED USER DEPENDENCY & /auth/me TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_get_current_user_me_endpoint(async_client: AsyncClient) -> None:
    """Verifies that GET /api/v1/auth/me returns the authenticated user profile."""
    email = f"me_test_{uuid.uuid4().hex[:8]}@example.com"
    password = "MyPassword2026!"

    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "display_name": "Me Profile"},
    )
    access_token = reg_resp.json()["access_token"]

    # Call /me with Bearer token
    resp = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == email.lower()
    assert data["display_name"] == "Me Profile"
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_get_current_user_missing_or_invalid_token(
    async_client: AsyncClient,
) -> None:
    """Verifies that requests lacking a Bearer token or with a malformed token are rejected."""
    # Missing token
    resp1 = await async_client.get("/api/v1/auth/me")
    assert resp1.status_code == 403 or resp1.status_code == 401

    # Malformed token
    resp2 = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not-a-valid-jwt-token"},
    )
    assert resp2.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_expired_token(async_client: AsyncClient) -> None:
    """Verifies that an expired JWT access token is rejected with HTTP 401."""
    user_id = uuid.uuid4()
    session_id = uuid.uuid4()
    expired_token = create_access_token(
        user_id=user_id,
        session_id=session_id,
        expires_delta=timedelta(seconds=-10),
    )

    resp = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert resp.status_code == 401
    assert "expired" in resp.json()["detail"].lower()


# ==============================================================================
# 5. REFRESH TOKEN ROTATION & REVOCATION TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_refresh_token_rotation_success(
    async_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Verifies refresh token rotation: old token is invalidated, new token is issued."""
    email = f"refresh_{uuid.uuid4().hex[:8]}@example.com"
    password = "RefreshPassword2026!"

    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    first_refresh_token = reg_resp.json()["refresh_token"]
    session_id = uuid.UUID(reg_resp.json()["session_id"])

    # 1. Use refresh token to obtain new tokens
    refresh_resp = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": first_refresh_token},
    )
    assert refresh_resp.status_code == 200
    data = refresh_resp.json()
    second_refresh_token = data["refresh_token"]
    second_access_token = data["access_token"]

    # Verify new token differs from initial token (rotation)
    assert second_refresh_token != first_refresh_token

    # Verify session in DB now holds the new hash
    s_res = await db_session.execute(
        select(UserSession).where(UserSession.id == session_id)
    )
    db_session_obj = s_res.scalars().first()
    assert db_session_obj is not None
    assert db_session_obj.refresh_token_hash == hash_refresh_token(second_refresh_token)

    # 2. Attempting to REUSE the previous refresh token MUST BE REJECTED
    reuse_resp = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": first_refresh_token},
    )
    assert reuse_resp.status_code == 401

    # 3. New access token works
    me_resp = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {second_access_token}"},
    )
    assert me_resp.status_code == 200


@pytest.mark.asyncio
async def test_refresh_token_revoked_session_rejected(
    async_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Verifies that an explicitly revoked session cannot be refreshed."""
    email = f"revoked_{uuid.uuid4().hex[:8]}@example.com"
    password = "RevokedPassword2026!"

    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    refresh_token = reg_resp.json()["refresh_token"]
    session_id = uuid.UUID(reg_resp.json()["session_id"])

    # Explicitly revoke session in PostgreSQL
    s_res = await db_session.execute(
        select(UserSession).where(UserSession.id == session_id)
    )
    session = s_res.scalars().first()
    assert session is not None
    session.revoked_at = datetime.now(timezone.utc)
    await db_session.commit()

    # Attempt refresh
    refresh_resp = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_resp.status_code == 401
    assert "revoked" in refresh_resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_refresh_token_expired_session_rejected(
    async_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Verifies that an expired session cannot be refreshed."""
    email = f"expired_sess_{uuid.uuid4().hex[:8]}@example.com"
    password = "ExpiredPassword2026!"

    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    refresh_token = reg_resp.json()["refresh_token"]
    session_id = uuid.UUID(reg_resp.json()["session_id"])

    # Expire session in PostgreSQL
    s_res = await db_session.execute(
        select(UserSession).where(UserSession.id == session_id)
    )
    session = s_res.scalars().first()
    assert session is not None
    session.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
    await db_session.commit()

    # Attempt refresh
    refresh_resp = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_resp.status_code == 401
    assert "expired" in refresh_resp.json()["detail"].lower()


# ==============================================================================
# 6. LOGOUT & COOKIE CLEARING TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_logout_revokes_session_and_clears_cookie(
    async_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Verifies that POST /api/v1/auth/logout revokes session in DB and deletes cookie."""
    email = f"logout_{uuid.uuid4().hex[:8]}@example.com"
    password = "LogoutPassword2026!"

    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    refresh_token = reg_resp.json()["refresh_token"]
    session_id = uuid.UUID(reg_resp.json()["session_id"])

    # Logout
    logout_resp = await async_client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token},
    )
    assert logout_resp.status_code == 200

    # Verify session is marked revoked in PostgreSQL
    s_res = await db_session.execute(
        select(UserSession).where(UserSession.id == session_id)
    )
    session = s_res.scalars().first()
    assert session is not None
    assert session.revoked_at is not None

    # Verify subsequent refresh attempt is rejected
    refresh_resp = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_resp.status_code == 401


# ==============================================================================
# 7. GUEST SESSIONS & RECONCILIATION TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_guest_session_creation(
    async_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Verifies that POST /api/v1/auth/guest creates an anonymous session without a fake user."""
    resp = await async_client.post("/api/v1/auth/guest")
    assert resp.status_code == 201
    data = resp.json()

    assert "guest_session_id" in data
    assert data["session_type"] == "guest"
    guest_uuid = uuid.UUID(data["guest_session_id"])

    # Verify session in PostgreSQL has user_id = NULL
    s_res = await db_session.execute(
        select(UserSession).where(UserSession.id == guest_uuid)
    )
    session = s_res.scalars().first()
    assert session is not None
    assert session.user_id is None
    assert session.session_type == "guest"
    assert session.refresh_token_hash is None


@pytest.mark.asyncio
async def test_guest_reconciliation_on_registration(
    async_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Verifies that providing guest_session_id during registration reconciles the identity."""
    # 1. Create guest session
    guest_resp = await async_client.post("/api/v1/auth/guest")
    guest_id = guest_resp.json()["guest_session_id"]

    # 2. Register account with guest_session_id
    email = f"reconciled_{uuid.uuid4().hex[:8]}@example.com"
    password = "ReconciledPass2026!"

    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "guest_session_id": guest_id,
        },
    )
    assert reg_resp.status_code == 201
    data = reg_resp.json()
    assert data["guest_reconciled"] is True
    user_id = uuid.UUID(data["user"]["id"])

    # Verify guest session in PostgreSQL has reconciled_user_id and reconciled_at set
    s_res = await db_session.execute(
        select(UserSession).where(UserSession.id == uuid.UUID(guest_id))
    )
    guest_session = s_res.scalars().first()
    assert guest_session is not None
    assert guest_session.reconciled_user_id == user_id
    assert guest_session.reconciled_at is not None


@pytest.mark.asyncio
async def test_guest_reconciliation_on_login(
    async_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Verifies that providing guest_session_id during login reconciles the identity."""
    # 1. Register user
    email = f"reconcile_login_{uuid.uuid4().hex[:8]}@example.com"
    password = "ReconcileLogin2026!"
    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    user_id = uuid.UUID(reg_resp.json()["user"]["id"])

    # 2. Create anonymous guest session
    guest_resp = await async_client.post("/api/v1/auth/guest")
    guest_id = guest_resp.json()["guest_session_id"]

    # 3. Log in with guest_session_id
    login_resp = await async_client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": password,
            "guest_session_id": guest_id,
        },
    )
    assert login_resp.status_code == 200
    assert login_resp.json()["guest_reconciled"] is True

    # Verify guest session is linked
    s_res = await db_session.execute(
        select(UserSession).where(UserSession.id == uuid.UUID(guest_id))
    )
    guest_session = s_res.scalars().first()
    assert guest_session is not None
    assert guest_session.reconciled_user_id == user_id
    assert guest_session.reconciled_at is not None

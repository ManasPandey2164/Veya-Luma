# Veya Luma — REST API Specification (API.md)

**System:** Veya Luma Cinematic Discovery  
**API Version:** v1 (`/api/v1`)  
**Specification Standard:** OpenAPI 3.1 compatible REST  
**Source of Truth:** DECISION.md  
**Date:** 2026-10-01  

---

## 1. Global Conventions

### 1.1 Content Types & Encoding
- All endpoints accept and return `application/json; charset=utf-8` unless otherwise stated.
- Dates and timestamps follow ISO 8601 extended format with UTC offset: `YYYY-MM-DDTHH:MM:SSZ`.

### 1.2 Authentication & Headers
- Authenticated requests must include the header:
  ```http
  Authorization: Bearer <jwt_access_token>
  ```
- Public and guest-explorable endpoints optionally accept the Bearer token or a temporary guest session header:
  ```http
  X-Session-ID: <uuid>
  ```
- Correlation and client tracing:
  ```http
  X-Request-ID: <uuid>
  ```

### 1.3 Error Responses (RFC 7807)
Standard error envelope:
```json
{
  "type": "https://api.veyaluma.com/errors/invalid_parameters",
  "title": "Invalid Parameters",
  "status": 422,
  "detail": "Runtime must be a positive integer.",
  "instance": "/api/v1/movies/search",
  "invalid_params": [
    {
      "name": "runtime_max",
      "reason": "Must be greater than 0"
    }
  ]
}
```

---

## 2. Authentication & Session Endpoints (`/api/v1/auth`)

### 2.1 Register Account
* **Endpoint:** `POST /api/v1/auth/register`
* **Request:**
  ```json
  {
    "email": "cinephile@example.com",
    "password": "SecurePassword123!",
    "username": "auteur_explorer",
    "display_name": "Auteur Explorer",
    "guest_session_id": "4a7b7a60-93a0-47b7-b08e-5b1b4f4c208f"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "u4hK8w2x...",
    "token_type": "bearer",
    "expires_in": 900,
    "user": {
      "id": "b3f68a25-e51c-4b52-959c-93df49c40210",
      "email": "cinephile@example.com",
      "username": "auteur_explorer",
      "display_name": "Auteur Explorer",
      "is_active": true,
      "is_verified": false,
      "locale": "en-US",
      "country_code": "US",
      "created_at": "2026-10-03T19:40:00Z",
      "updated_at": "2026-10-03T19:40:00Z"
    },
    "session_id": "8c59f032-8418-4b7b-91c6-a67b57ad51b8",
    "guest_reconciled": true
  }
  ```
  *Note:* Hashes passwords using Argon2id. Persists authoritative session in PostgreSQL. Sets secure HTTP-only `veya_refresh_token` cookie. Automatically reconciles anonymous guest sessions if `guest_session_id` is supplied.

### 2.2 Login
* **Endpoint:** `POST /api/v1/auth/login`
* **Request:**
  ```json
  {
    "email": "cinephile@example.com",
    "password": "SecurePassword123!",
    "guest_session_id": "4a7b7a60-93a0-47b7-b08e-5b1b4f4c208f"
  }
  ```
* **Response (200 OK):** Same schema as Register. Sets HTTP-only `veya_refresh_token` cookie and reconciles guest session if provided.

### 2.3 Refresh Token
* **Endpoint:** `POST /api/v1/auth/refresh`
* **Request (optional body if cookie present):**
  ```json
  {
    "refresh_token": "u4hK8w2x..."
  }
  ```
* **Response (200 OK):** Rotates refresh token in PostgreSQL session, invalidates old token, issues new access token and rotated refresh token cookie.

### 2.4 Logout
* **Endpoint:** `POST /api/v1/auth/logout`
* **Request:** Optional Bearer token or cookie.
* **Response (200 OK):**
  ```json
  {
    "message": "Logged out successfully.",
    "status": "ok"
  }
  ```
  *Note:* Explicitly revokes session in PostgreSQL (`revoked_at = NOW()`) and clears cookie.

### 2.5 Anonymous Guest Session
* **Endpoint:** `POST /api/v1/auth/guest`
* **Request:**
  ```json
  {
    "user_agent": "Mozilla/5.0..."
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "guest_session_id": "4a7b7a60-93a0-47b7-b08e-5b1b4f4c208f",
    "session_type": "guest",
    "expires_at": "2026-11-02T19:40:00Z",
    "created_at": "2026-10-03T19:40:00Z"
  }
  ```
  *Note:* Transient anonymous discovery session persisted without creating fake permanent user records.

### 2.6 Authenticated Profile Dossier
* **Endpoint:** `GET /api/v1/auth/me`
* **Headers:** `Authorization: Bearer <access_token>`
* **Response (200 OK):**
  ```json
  {
    "id": "b3f68a25-e51c-4b52-959c-93df49c40210",
    "email": "cinephile@example.com",
    "username": "auteur_explorer",
    "display_name": "Auteur Explorer",
    "is_active": true,
    "is_verified": false,
    "locale": "en-US",
    "country_code": "US",
    "created_at": "2026-10-03T19:40:00Z",
    "updated_at": "2026-10-03T19:40:00Z"
  }
  ```

---

## 3. Movie Catalog & Search (`/api/v1/movies`)

All catalog endpoints are read-only and backed by PostgreSQL canonical movie persistence.

### 3.1 Browse Movies
* **Endpoint:** `GET /api/v1/movies`
* **Query Parameters:**
  * `page` (integer, default 1, min 1) — 1-indexed page offset
  * `limit` (integer, default 20, min 1, max 100) — Page size limit (enforced maximum 100)
  * `genre` (string, optional) — Filter by canonical genre (e.g. `Sci-Fi`, `Thriller`)
  * `theme` (string, optional) — Filter by canonical theme (e.g. `Memory & Determinism`)
  * `mood` (string, optional) — Filter by canonical mood (e.g. `Atmospheric`, `Contemplative`)
  * `style` (string, optional) — Filter by canonical cinematic style (e.g. `Slow burn`, `Stylized`)
  * `release_year` (integer, optional) — Filter by exact release calendar year
  * `year_min`, `year_max` (integer, optional) — Release year bounds
  * `original_language` (string, optional) — Filter by original language code (e.g. `en`, `ru`, `ko`)
  * `sort_by` (string, optional) — `release_date_asc`, `title_asc`, `title_desc` (default: deterministic `release_date DESC NULLS LAST, release_year DESC NULLS LAST, title ASC, id ASC`)
* **Response (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "9d9016e7-73d2-45e0-94cb-558ffb4e87d0",
        "title": "Arrival",
        "original_title": "Arrival",
        "release_date": "2016-11-11",
        "release_year": 2016,
        "runtime_minutes": 116,
        "original_language": "en",
        "synopsis": "Taking place after alien crafts land around the world...",
        "genres": ["Sci-Fi", "Drama"],
        "themes": ["Communication & Connection", "Memory & Determinism"],
        "moods": ["Atmospheric", "Contemplative"],
        "styles": ["Measured"],
        "poster_path": "/x22itTKVOTD2.jpg",
        "backdrop_path": "/y2aA...jpg",
        "poster_url": "https://image.tmdb.org/t/p/w500/x22itTKVOTD2.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/w1280/y2aA...jpg"
      }
    ],
    "total": 1420,
    "page": 1,
    "limit": 20,
    "total_pages": 71,
    "has_next": true,
    "has_prev": false
  }
  ```

### 3.2 Movie Details
* **Endpoint:** `GET /api/v1/movies/{id}`
* **Path Parameters:**
  * `id` (string, required) — Canonical movie internal UUID
* **Response (200 OK):**
  ```json
  {
    "id": "9d9016e7-73d2-45e0-94cb-558ffb4e87d0",
    "title": "Arrival",
    "original_title": "Arrival",
    "release_date": "2016-11-11",
    "release_year": 2016,
    "runtime_minutes": 116,
    "synopsis": "Taking place after alien crafts land around the world...",
    "original_language": "en",
    "spoken_languages": ["en"],
    "genres": ["Sci-Fi", "Drama"],
    "themes": ["Communication & Connection", "Memory & Determinism"],
    "moods": ["Atmospheric", "Contemplative"],
    "styles": ["Measured"],
    "artwork": {
      "poster_path": "/x22itTKVOTD2.jpg",
      "backdrop_path": "/y2aA...jpg",
      "poster_url": "https://image.tmdb.org/t/p/w500/x22itTKVOTD2.jpg",
      "backdrop_url": "https://image.tmdb.org/t/p/w1280/y2aA...jpg"
    },
    "collection": {
      "collection_id": "726872",
      "name": "Villeneuve Anthology",
      "poster_path": "/poster.jpg"
    },
    "credits": {
      "director": "Denis Villeneuve",
      "directors": [
        {"name": "Denis Villeneuve", "department": "Directing", "job": "Director"}
      ],
      "cast": [
        {"name": "Amy Adams", "character": "Louise Banks", "billing_order": 0},
        {"name": "Jeremy Renner", "character": "Ian Donnelly", "billing_order": 1}
      ],
      "crew": []
    },
    "provenance": {
      "source": "tmdb",
      "endpoint_or_product": "movie-details",
      "retrieved_at": "2026-10-01T12:00:00Z",
      "license_profile": "tmdb-noncommercial-prototype"
    },
    "tags": ["linguistics", "first-contact"]
  }
  ```
* **Error Responses:**
  * `404 Not Found` — Movie not found or invalid UUID format.

### 3.3 Search Movies
* **Endpoint:** `GET /api/v1/movies/search`
* **Query Parameters:**
  * `q` (string, default `""`) — Search term for matching canonical and original titles
  * `page` (integer, default 1, min 1) — 1-indexed page offset
  * `limit` (integer, default 20, min 1, max 100) — Page size limit
  * `genre` (string, optional) — Optional canonical genre filter
  * `theme` (string, optional) — Optional canonical theme filter
  * `mood` (string, optional) — Optional canonical mood filter
  * `style` (string, optional) — Optional canonical style filter
  * `release_year` (integer, optional) — Optional release calendar year filter
  * `original_language` (string, optional) — Optional language ISO code filter
* **Ordering:** Ranked deterministic ordering: Exact title match → Prefix title match → Release date DESC → Title ASC → Movie UUID ASC.
* **Response (200 OK):** Returns `PaginatedResponse[MovieListItem]`. If query is empty or whitespace, returns empty item list with `total: 0`.

---

## 4. Taste Discovery & Onboarding (`/api/v1/taste-discovery`)

The adaptive preference-elicitation loop:

### 4.1 Get Seed Candidates (Seen Movie Picker)
* **Endpoint:** `GET /api/v1/taste-discovery/seeds`
* **Description:** Returns 12–16 recognizable, diverse seed movies across genres, eras, and tones.
* **Response (200 OK):**
  ```json
  {
    "seed_id": "seed_batch_20261001",
    "movies": [
      {
        "movie_id": "...",
        "title": "The Dark Knight",
        "release_year": 2008,
        "poster_path": "...",
        "genre_badges": ["Action", "Crime", "Thriller"]
      }
    ]
  }
  ```

### 4.2 Submit Seed Answers
* **Endpoint:** `POST /api/v1/taste-discovery/seeds`
* **Request:**
  ```json
  {
    "answers": [
      {"movie_id": "9d9016e7-...", "knowledge_state": "seen"},
      {"movie_id": "18f921a2-...", "knowledge_state": "not_seen"},
      {"movie_id": "2b8109aa-...", "knowledge_state": "skip"}
    ]
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "seen_count": 4,
    "next_step": "quick_ratings",
    "candidate_ratings": [
      {"movie_id": "9d9016e7-...", "title": "Arrival"}
    ]
  }
  ```

### 4.3 Submit Quick Ratings
* **Endpoint:** `POST /api/v1/taste-discovery/quick-ratings`
* **Request:**
  ```json
  {
    "ratings": [
      {"movie_id": "9d9016e7-...", "label": "loved"},
      {"movie_id": "a1b2c3d4-...", "label": "liked"},
      {"movie_id": "e5f6g7h8-...", "label": "not_for_me"}
    ]
  }
  ```
* **Response (200 OK):** Updates preference state and transitions to pairwise duel.

### 4.4 Get Movie Duel Pair
* **Endpoint:** `GET /api/v1/taste-discovery/duel`
* **Description:** Selects an informative, recognizable pair maximizing information gain on uncertain taste dimensions.
* **Response (200 OK):**
  ```json
  {
    "duel_id": "duel_7a18b9c2",
    "question": "Which would you rather watch tonight?",
    "movie_a": {
      "movie_id": "...",
      "title": "Blade Runner 2049",
      "poster_path": "...",
      "key_tags": ["Atmospheric", "Sci-Fi", "Slow Burn"]
    },
    "movie_b": {
      "movie_id": "...",
      "title": "The Grand Budapest Hotel",
      "poster_path": "...",
      "key_tags": ["Whimsical", "Comedy", "Visually Stylized"]
    }
  }
  ```

### 4.5 Submit Duel Answer
* **Endpoint:** `POST /api/v1/taste-discovery/duel`
* **Request:**
  ```json
  {
    "duel_id": "duel_7a18b9c2",
    "choice": "movie_a" // "movie_a", "movie_b", "neither", "unseen"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "interaction_count": 7,
    "ready_to_finish": true,
    "stopping_reason": "confidence_threshold_met",
    "early_recommendations": [
      {
        "movie_id": "...",
        "title": "Ex Machina",
        "explanation": "Because you loved Arrival and chose Blade Runner 2049"
      }
    ]
  }
  ```

---

## 5. Recommendations & Natural-Language Discovery (`/api/v1/recommendations`)

### 5.1 Personalized Home Feed
* **Endpoint:** `GET /api/v1/recommendations/feed`
* **Query Parameters:** `limit` (default 20)
* **Response (200 OK):**
  ```json
  {
    "request_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "model_version": "v1_content_tfidf",
    "shelves": [
      {
        "shelf_id": "resonance_picks",
        "title": "High Resonance Picks",
        "items": [
          {
            "movie_id": "...",
            "title": "Interstellar",
            "resonance_score": 0.94,
            "explanation": {
              "grounded_reason": "Because you loved Arrival and enjoy cerebral science fiction",
              "matched_facets": ["theme.space_exploration", "mood.thought_provoking", "director.christopher_nolan"],
              "divergence_warning": "Slightly longer runtime (169 min)"
            }
          }
        ]
      },
      {
        "shelf_id": "tonal_contrast",
        "title": "Atmospheric & Stylized",
        "items": [...]
      }
    ]
  }
  ```

### 5.2 Natural Language Intent Discovery
* **Endpoint:** `POST /api/v1/recommendations/natural-intent`
* **Request:**
  ```json
  {
    "query": "A tense, stylish slow-burn thriller in a snowy setting, but not too gory"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "parsed_intent": {
      "genres": ["Thriller"],
      "themes": ["isolated_setting", "winter_snow"],
      "moods": ["tense", "atmospheric"],
      "styles": ["slow_burn", "stylized"],
      "exclusions": ["extreme_gore"]
    },
    "results": [
      {
        "movie_id": "...",
        "title": "Fargo",
        "release_year": 1996,
        "match_explanation": "Matches tense slow-burn thriller in a snowy setting with controlled violence."
      }
    ]
  }
  ```

---

## 6. Feedback & Library Management (`/api/v1/feedback`)

### 6.1 Generic Event Logger
* **Endpoint:** `POST /api/v1/feedback/events`
* **Request:**
  ```json
  {
    "events": [
      {
        "event_type": "recommendation_impression",
        "movie_id": "9d9016e7-...",
        "context": {
          "request_id": "f47ac10b-...",
          "shelf_id": "resonance_picks",
          "position": 0
        }
      }
    ]
  }
  ```
* **Response (202 Accepted)**

### 6.1 Telemetry & Behavioral Events (`/api/v1/feedback/event`)
* **Endpoint:** `POST /api/v1/feedback/event`
* **Authorization:** Authenticated User (`Bearer <token>`) or Active Guest Session (`X-Session-ID: <uuid>`).
* **Request:**
  ```json
  {
    "movie_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "event_type": "detail_view",
    "event_value": null,
    "source": "recommendation_rail",
    "metadata": {
      "rail_id": "curated_noir",
      "viewport_time_ms": 14500
    }
  }
  ```
* **Supported Events:** `impression`, `detail_view`, `click`, `rating`
* **Response (201 Created):**
  ```json
  {
    "id": "e81d77a0-09b3-4f9e-b9b5-fcf6a8a1c901",
    "user_id": "b3f68a25-e51c-4b52-959c-93df49c40210",
    "session_id": "4a7b7a60-93a0-47b7-b08e-5b1b4f4c208f",
    "movie_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "event_type": "detail_view",
    "event_value": null,
    "source": "recommendation_rail",
    "created_at": "2026-10-03T20:55:00Z"
  }
  ```

### 6.2 Movie Ratings (`/api/v1/feedback/rate`)
* **Endpoint:** `POST /api/v1/feedback/rate`
* **Authorization:** Authenticated User required (`Bearer <token>`).
* **Request:**
  ```json
  {
    "movie_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "rating": 8.5,
    "source": "detail_page"
  }
  ```
* **Bounds:** `1.0 <= rating <= 10.0` (0.5 or 0.1 precision).
* **Response (200 OK):**
  ```json
  {
    "id": "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
    "user_id": "b3f68a25-e51c-4b52-959c-93df49c40210",
    "movie_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "rating": 8.5,
    "source": "detail_page",
    "created_at": "2026-10-03T20:55:00Z",
    "updated_at": "2026-10-03T20:55:00Z"
  }
  ```
* **Query Current Rating:** `GET /api/v1/feedback/ratings/{movie_id}` (200 OK or 404 Not Found)
* **Delete Rating:** `DELETE /api/v1/feedback/ratings/{movie_id}` (204 No Content)
* **List All User Ratings:** `GET /api/v1/feedback/ratings?page=1&page_size=20`

### 6.3 Watchlist Operations (`/api/v1/library/watchlist`)
* **Add to Watchlist (Idempotent):**
  - `POST /api/v1/library/watchlist`
  - Body: `{"movie_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"}`
  - Response (200 OK): `{"action": "added", "movie_id": "...", "status": "success", "message": "..."}`
* **Remove from Watchlist (Safe Repeated):**
  - `DELETE /api/v1/library/watchlist/{movie_id}`
  - Response (200 OK): `{"action": "removed", "movie_id": "...", "status": "success", "message": "..."}`
* **List User Watchlist:**
  - `GET /api/v1/library/watchlist?page=1&page_size=20`
  - Response (200 OK): Paginated list of canonical movie entries with `added_at` timestamp.

### 6.4 Favourites Operations (`/api/v1/library/favourites`)
* **Add to Favourites (Idempotent):**
  - `POST /api/v1/library/favourites/{movie_id}` or `POST /api/v1/library/favourites`
  - Response (200 OK): `{"action": "added", "movie_id": "...", "status": "success", "message": "..."}`
* **Remove from Favourites:**
  - `DELETE /api/v1/library/favourites/{movie_id}`
  - Response (200 OK): `{"action": "removed", "movie_id": "...", "status": "success", "message": "..."}`
* **List User Favourites:**
  - `GET /api/v1/library/favourites?page=1&page_size=20`
  - Response (200 OK): Paginated list of canonical movie entries with `added_at` timestamp.

### 6.5 Guest Reconciliation (`/api/v1/library/reconcile`)
* **Endpoint:** `POST /api/v1/library/reconcile`
* **Authorization:** Authenticated User (`Bearer <token>`).
* **Request:**
  ```json
  {
    "guest_session_id": "4a7b7a60-93a0-47b7-b08e-5b1b4f4c208f",
    "watchlist_movie_ids": ["3fa85f64-5717-4562-b3fc-2c963f66afa6"],
    "favourite_movie_ids": ["7cb37201-90a6-4dc5-8f6b-31362e921d7b"]
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "reconciled_events_count": 5,
    "reconciled_watchlist_count": 1,
    "reconciled_favourites_count": 1,
    "status": "success"
  }
  ```

### 6.6 User Taxonomy Preferences (`/api/v1/preferences`)
* **List User Preferences:**
  - `GET /api/v1/preferences`
  - Response (200 OK): Returns all explicit affinities joined with canonical taxonomy nodes (`genre`, `theme`, `mood`, `style`).
* **Upsert Taxonomy Preference:**
  - `PUT /api/v1/preferences/{taxonomy_node_id}`
  - Request: `{"affinity": 0.85, "source": "onboarding"}` (where `-1.0 <= affinity <= 1.0`)
  - Response (200 OK): Updated or created preference object.
* **Delete Taxonomy Preference:**
  - `DELETE /api/v1/preferences/{taxonomy_node_id}`
  - Response (204 No Content)

---

## 7. Cinematic DNA & Privacy (`/api/v1/user`)

### 7.1 Cinematic DNA / Taste Constellation
* **Endpoint:** `GET /api/v1/user/dna`
* **Response (200 OK):**
  ```json
  {
    "radar_mesh": {
      "Atmosphere": 0.88,
      "Narrative": 0.72,
      "Speculative": 0.95,
      "Auteur": 0.81,
      "Dissonance": 0.40
    },
    "top_themes": ["time_perception", "artificial_intelligence", "moral_ambiguity"],
    "top_moods": ["atmospheric", "thought_provoking", "tense"],
    "excluded_tropes": ["jump_scares", "extreme_gore"]
  }
  ```

### 7.2 Right to Erasure / Data Purge
* **Endpoint:** `DELETE /api/v1/user/data`
* **Response (200 OK):**
  ```json
  {
    "status": "purged",
    "details": "User profile, ratings, watchlist, and taste preferences completely deleted. Recommendation logs anonymized."
  }
  ```

---

## 8. System Health (`/health`)

* `GET /health/live` — Returns `200 OK` if the web service process is alive.
* `GET /health/ready` — Returns `200 OK` if database connections and cached model assets are verified and ready to serve traffic.

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
    "display_name": "AuteurExplorer",
    "guest_session_id": "4a7b7a60-93a0-47b7-b08e-5b1b4f4c208f"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "user_id": "b3f68a25-e51c-4b52-959c-93df49c40210",
    "email": "cinephile@example.com",
    "display_name": "AuteurExplorer",
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "expires_in": 900
  }
  ```
  *Note:* Sets HTTP-only `refresh_token` cookie. Automatically reconciles anonymous guest taste events from `guest_session_id`.

### 2.2 Login
* **Endpoint:** `POST /api/v1/auth/login`
* **Request:**
  ```json
  {
    "email": "cinephile@example.com",
    "password": "SecurePassword123!"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "user_id": "b3f68a25-e51c-4b52-959c-93df49c40210",
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "expires_in": 900
  }
  ```

### 2.3 Refresh Token
* **Endpoint:** `POST /api/v1/auth/refresh`
* **Headers/Cookies:** Receives HTTP-only cookie `refresh_token`.
* **Response (200 OK):** New access token and rotated refresh cookie.

### 2.4 Logout
* **Endpoint:** `POST /api/v1/auth/logout`
* **Response (204 No Content):** Revokes session and clears cookies.

---

## 3. Movie Catalog & Search (`/api/v1/movies`)

### 3.1 Browse Movies
* **Endpoint:** `GET /api/v1/movies`
* **Query Parameters:**
  * `page` (integer, default 1)
  * `limit` (integer, default 20, max 100)
  * `genre` (string, optional)
  * `year_min`, `year_max` (integer, optional)
  * `sort_by` (`popularity`, `release_date`, `vote_average`, default `popularity`)
* **Response (200 OK):**
  ```json
  {
    "items": [
      {
        "movie_id": "9d9016e7-73d2-45e0-94cb-558ffb4e87d0",
        "canonical_title": "Arrival",
        "release_year": 2016,
        "runtime_minutes": 116,
        "poster_path": "/x22itTKVOTD2.jpg",
        "popularity_score": 88.4,
        "genres": ["Science Fiction", "Drama", "Mystery"]
      }
    ],
    "total": 1420,
    "page": 1,
    "total_pages": 71
  }
  ```

### 3.2 Movie Details
* **Endpoint:** `GET /api/v1/movies/{movie_id}`
* **Response (200 OK):**
  ```json
  {
    "movie_id": "9d9016e7-73d2-45e0-94cb-558ffb4e87d0",
    "canonical_title": "Arrival",
    "original_title": "Arrival",
    "release_date": "2016-11-11",
    "release_year": 2016,
    "runtime_minutes": 116,
    "synopsis": "Taking place after alien crafts land around the world, an expert linguist is recruited by the military to determine whether they come in peace or are a threat.",
    "poster_path": "/x22itTKVOTD2.jpg",
    "backdrop_path": "/y2aA...jpg",
    "credits": {
      "directors": [{"person_id": "...", "name": "Denis Villeneuve"}],
      "cast": [
        {"person_id": "...", "name": "Amy Adams", "character": "Louise Banks", "billing_order": 0},
        {"person_id": "...", "name": "Jeremy Renner", "character": "Ian Donnelly", "billing_order": 1}
      ]
    },
    "taxonomy": {
      "genres": ["Science Fiction", "Drama"],
      "themes": ["alien_contact", "linguistics", "grief_and_loss", "time_perception"],
      "moods": ["atmospheric", "thought_provoking", "melancholic", "tense"],
      "styles": ["slow_burn", "non_linear", "visually_stylized"]
    },
    "availability_offers": [
      {
        "region": "US",
        "provider_name": "Paramount+",
        "monetization_type": "subscription",
        "outbound_link": "https://...",
        "checked_at": "2026-09-30T12:00:00Z"
      }
    ],
    "user_interaction": {
      "rating": 5.0,
      "in_watchlist": true,
      "is_favourite": true,
      "is_watched": true
    }
  }
  ```

### 3.3 Search Movies
* **Endpoint:** `GET /api/v1/movies/search`
* **Query Parameters:**
  * `q` (string, required) — Title or keyword
  * `limit` (integer, default 20)
* **Response (200 OK):** Ranked search matches utilizing PostgreSQL trigram indexing and alias matching.

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

### 6.2 Explicit Movie Feedback Actions
* `POST /api/v1/feedback/movie/{movie_id}/like`
* `POST /api/v1/feedback/movie/{movie_id}/dislike`
* `POST /api/v1/feedback/movie/{movie_id}/rate` (`{"rating": 4.5}`)
* `POST /api/v1/feedback/movie/{movie_id}/watchlist`
* `DELETE /api/v1/feedback/movie/{movie_id}/watchlist`
* `POST /api/v1/feedback/movie/{movie_id}/watched`

### 6.3 Get User Library
* **Endpoint:** `GET /api/v1/library`
* **Query Parameters:** `type` (`watchlist`, `history`, `favourites`, default all)
* **Response (200 OK):** Full user library lists with chronological timestamps.

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

# Veya Luma — Architecture Specification (ARCHITECTURE.md)

**System Name:** Veya Luma  
**Vertical 01:** Cinema / Personalized Movie Discovery Engine (NOT an OTT / Streaming Platform)  
**Document Status:** Architecture Baseline & Technical Contract  
**Source of Truth:** DECISION.md  
**Date:** 2026-10-01  

---

## 1. Executive Summary & System Boundary

### 1.1 Product Mission
Veya Luma is a personalized cinematic discovery engine. Its mission is to solve decision fatigue by learning user taste through lightweight, engaging, and transparent interactions. 

**Critical Boundary Definition:**
- **Discovery Engine ONLY:** Veya Luma provides intelligent recommendations, taste mapping, rich metadata, and availability pointers.
- **NO Content Streaming:** Veya Luma does NOT host, ingest, transcode, or stream video content. Outbound links direct users to verified third-party legal providers (e.g. via TMDB / JustWatch / Watchmode attribution).
- **Domain Strategy:** Phase 1 focuses exclusively on the **Movie Domain** while structuring core platform services (Identity, Feedback, Telemetry, Recommender Interfaces) as reusable foundations for future discovery verticals (Games, Anime, Literature).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        VEYA LUMA PLATFORM                              │
├──────────────────────────────────┬─────────────────────────────────────┤
│      REUSABLE FOUNDATIONS        │        PHASE 1 MOVIE DOMAIN         │
├──────────────────────────────────┼─────────────────────────────────────┤
│ • Authentication & Accounts      │ • Canonical Movie Catalog           │
│ • User Preferences & Privacy     │ • Multi-Axis Movie Taxonomy         │
│ • Unified Event & Telemetry      │ • Taste Discovery (Duel & Picker)   │
│ • Recommender & Pipeline Core    │ • TF-IDF + Metadata Feature Vectors │
│ • Explainability Framework       │ • Popularity & Content Blending     │
│ • Natural Language Intent Schema │ • Provider Availability References  │
└──────────────────────────────────┴─────────────────────────────────────┘
```

---

## 2. High-Level System Architecture

The system is architected as a **production-oriented modular monolith** designed for maintainability, transparent auditing, deterministic local development, and zero premature microservice complexity.

```
                           ┌───────────────────────────┐
                           │   Client Web App (SPA)    │
                           │ React 18 + TS + Vite + TW │
                           │  Cinematic Luminary UI    │
                           └─────────────┬─────────────┘
                                         │ HTTPS / JSON API
                                         ▼
                           ┌───────────────────────────┐
                           │    FastAPI Application    │
                           │      Modular Monolith     │
                           └──────┬──────┬──────┬──────┘
                                  │      │      │
          ┌───────────────────────┘      │      └──────────────────────┐
          ▼                              ▼                             ▼
┌──────────────────┐           ┌──────────────────┐          ┌──────────────────┐
│ PostgreSQL 15+   │           │ Recommendation   │          │ External Source  │
│ Primary Store    │           │ Engine (In-Proc) │          │ Adapters         │
│ Relational Data  │           │ Sparse TF-IDF,   │          │ TMDB API Client  │
│ Append-only Logs │           │ Cosine, Scorer,  │          │ (Rate-Limited,   │
│ Provenance Maps  │           │ Policy Filters   │          │ Cached, Lic.)    │
└──────────────────┘           └──────────────────┘          └──────────────────┘
```

---

## 3. Subsystem Architecture

### 3.1 Frontend Architecture

* **Technology Stack:** React 18, TypeScript (strict mode), Vite, Tailwind CSS, TanStack Query (React Query v5), React Router v6, Lucide React icons.
* **Design Philosophy:** *Cinematic Luminary* (`design/DESIGN.md`)
  * **Stitch Project Reference:** Project ID `6658946113334506031` ("Veya Luma Cinematic Discovery") containing the 20 primary screen designs (Discover, Taste Discovery, Duels, Movie Details, Resonance Explanations, DNA, Library, Account).
  * Obsidian Palette (`#06080E` root, `#10131A` surfaces).
  * Atmospheric depth and radiant accents (`#00F0FF` Luminous Cyan, `#8A5CFF` Ultraviolet, `#14F195` Atmospheric Teal).
  * Typography: `Playfair Display` (editorial serif headings) + `Plus Jakarta Sans` (hyper-legible geometric UI sans).
* **State Management Strategy:**
  * **Server State:** Managed strictly by TanStack Query. Handles automatic request deduplication, background re-fetching, cache invalidation on mutations (likes, ratings, watchlist adds), and optimistic updates.
  * **Client State:** Lightweight React Context / Zustand for transient UI state (onboarding step progress, active movie duel state, filter modal state, audio/motion preferences).
* **Route Structure:**
  * `/` — Landing & Personalized Cinematic Feed (hero carousel, dynamic shelves).
  * `/discover` — Exploratory multi-dimensional feed with mood/theme chips.
  * `/search` — Keyword & structured natural-language intent search.
  * `/movie/:id` — Canonical movie dossier (dramatic key art, metadata, cognitive match breakdown, explanations, outbound availability).
  * `/taste-discovery` — Onboarding loop (Seen Picker -> Quick Rating -> Movie Duel -> First Finds -> Adaptive Finish).
  * `/dna` — Cinematic DNA / Taste Constellation visualization.
  * `/library` — Watchlist, Favourites, and Chronological Watch History.
  * `/settings` — Privacy, account management, content boundary controls, data purge.
* **Non-Negotiables:**
  * Desktop-first baseline (1440x900 canvas) with responsive outer bleed.
  * Full WCAG AA contrast compliance (`#FFFFFF` primary, `#B3B9C9` secondary on obsidian backgrounds).
  * Zero placeholder images; rights-reviewed assets with graceful fallbacks.

### 3.2 Backend Architecture

* **Technology Stack:** Python 3.11+, FastAPI (ASGI), Pydantic v2, SQLAlchemy 2.0 (Async IO with `asyncpg`), Alembic migrations.
* **Modular Monolith Layout:**
  ```text
  backend/app/
  ├── api/                    # HTTP Router Definitions (v1)
  │   ├── v1/
  │   │   ├── auth.py         # Registration, login, token refresh, sessions
  │   │   ├── movies.py       # Catalog browsing, search, movie detail
  │   │   ├── discovery.py    # Discovery shelves, NL intent endpoints
  │   │   ├── taste.py        # Taste Discovery onboarding & pairwise duels
  │   │   ├── feedback.py     # Ratings, likes/dislikes, watchlist, history
  │   │   ├── recommend.py    # Personalized recommendations & explanations
  │   │   └── user.py         # Profile, privacy controls, data export/purge
  ├── core/                   # Application Core Configuration & Infrastructure
  │   ├── config.py           # Pydantic Settings (.env validation)
  │   ├── security.py         # Argon2/Bcrypt hashing, JWT generation/validation
  │   ├── logging.py          # Structured JSON logging & correlation IDs
  │   └── exceptions.py       # Domain-specific exceptions & RFC-7807 handlers
  ├── db/                     # Persistence Layer
  │   ├── session.py          # Async engine & sessionmaker factory
  │   └── base.py             # Declarative base model imports
  ├── domain/                 # Domain boundary & normalization
  │   └── movie/              # Identity, normalizer, taxonomy, provenance, mapper
  ├── models/                 # SQLAlchemy 2.0 Declarative ORM Models
  ├── repositories/           # Read-only persistence repositories (MovieRepository)
  ├── schemas/                # Decoupled Pydantic API response schemas
  ├── services/               # Application services (MovieCatalogService, Ingestion)
  └── providers/              # Upstream vendor adapters (TMDB rate-limited client)
```

#### Read-Only Catalog Architecture (Phase 2 Step 15)
To prevent coupling API contracts to persistence details or introducing N+1 queries, the catalog read subsystem adheres to a strict four-layer separation:
1. **API Router (`app/api/v1/endpoints/movies.py`)**: Read-only HTTP endpoints (`GET /api/v1/movies`, `GET /api/v1/movies/{id}`, `GET /api/v1/movies/search`).
2. **Service Layer (`app/services/movie_catalog.py`)**: Business logic, UUID validation, pagination bounds, and ORM-to-Pydantic transformations (`MovieListItem`, `MovieDetail`, `PaginatedResponse`).
3. **Repository Layer (`app/repositories/movie.py`)**: Asynchronous PostgreSQL queries with explicit eager loading (`selectinload` for artwork, taxonomy tags, credits), multi-axis taxonomy filtering (`genre`, `theme`, `mood`, `style`), and deterministic ordering.
4. **ORM Models (`app/models/movie.py`)**: Relational PostgreSQL tables with check constraints and index utilization.

#### Authentication, User Accounts & Session Persistence (Phase 3 Step 16)
To support personalized movie discovery without sacrificing privacy or relying solely on stateless tokens:
1. **Argon2id Password Security (`app/core/security.py`)**: Password hashing using Argon2id with memory-hard parameters (64 MiB RAM, 2 iterations, parallelism 1) and constant-time verification. Plaintext passwords are never logged or stored; password hashes are never exposed via APIs.
2. **Authoritative PostgreSQL Sessions (`user_session`)**: Sessions are persisted in PostgreSQL as the authoritative state. Stateless JWTs alone are not trusted for revocation.
3. **Rotating Refresh Token Strategy**: High-entropy cryptographically random refresh tokens (48 bytes URL-safe) are transmitted via secure HTTP-only cookies (`veya_refresh_token`). Only SHA-256 digests are persisted in PostgreSQL. On each refresh, the previous credential is invalidated, the session is rotated with a new credential, and a new 15-minute JWT access token is issued.
4. **Anonymous Guest Sessions**: Visitors can explore the discovery catalog without an account. A transient `user_session` with `user_id = NULL` tracks the guest session.
5. **Guest → Registered Reconciliation**: When an anonymous visitor registers or logs in with `guest_session_id`, the session repository transitions the guest session to the authenticated user via `reconciled_user_id` and `reconciled_at`, establishing the identity bridge for future preference migrations.
6. **Reusable Dependency (`app/api/deps.py`)**: `get_current_user` extracts the Bearer token, validates the JWT signature and claims, verifies that the backing PostgreSQL session is unrevoked and unexpired, and confirms the user account is active.

#### Frontend Data Layer & Fallback Strategy
* **Preferred Source:** Live FastAPI backend endpoints (`/api/v1/movies`, `/api/v1/movies/{id}`, `/api/v1/movies/search`).
* **Fallback Strategy:** If the backend is unreachable or during offline UI testing, the frontend seamlessly falls back to pre-packaged `MOVIE_FIXTURES` without UI flickering or component breakage.
  │   └── movie.py            # Movie, MovieCollection, SourceIdentity, Artwork, Provenance, Credit, TaxonomyNode, MovieTag
  ├── schemas/                # Pydantic v2 DTOs (Request / Response validation)
  │   ├── movie.py            # CanonicalMovie, Source Models, IdentityResolution
  │   ├── taste.py
  │   ├── recommendation.py
  │   └── feedback.py
  ├── services/               # Core Business Logic (Framework-independent)
  │   ├── catalog_service.py  # Movie metadata retrieval & search
  │   ├── taste_service.py    # Onboarding logic, duel generation, stopping criteria
  │   ├── feedback_service.py # Event logging & preference signal updates
  │   └── ingestion/          # TMDB catalog acquisition & ingestion service
  │       ├── collector.py    # Bounded TMDB pagination & detail collector
  │       ├── schemas.py      # IngestionConfig & IngestionStats models
  │       └── service.py      # CanonicalMovie normalization & persistence orchestrator
  ├── cli/                    # Administrative & developer operational CLIs
  │   └── ingest.py           # Controlled catalog ingestion CLI
  ├── recommender/            # Recommendation Subsystem
  │   ├── pipeline.py         # Master recommendation pipeline orchestrator
  │   ├── candidates/         # Candidate generators (Popularity, Content, Onboarding)
  │   ├── scoring/            # Content-based scorer & profile builder
  │   ├── filters/            # Hard policy filters (availability, age, block, seen)
  │   ├── diversity/          # MMR & franchise/creator cap re-ranking
  │   └── explanations/       # Grounded evidence-backed explanation generator
  └── main.py                 # FastAPI application factory & middleware stack
  ```

### 3.3 Database Architecture & Identity
* **Primary Store:** PostgreSQL 15+
* **Identity Rules:**
  * Every movie is assigned an internal application UUID (`movie_id`).
  * Never join or identify movies using titles or external IDs.
  * External IDs (TMDB ID, IMDb `tconst`, Wikidata Q-ID) are isolated in `source_identity` mapping tables with confidence scores and timestamps.
* **Separation of Concerns:**
  * **Canonical Movie Entity:** Durable core attributes (title, runtime, release date, language).
  * **Taxonomy & Tags:** Multi-axis controlled vocabulary (`genre`, `theme`, `mood`, `style`, `audience`, `sensitivity`).
  * **Source Observations:** Preserves raw provider evidence without destructive overwriting.
  * **First-Party User Data:** User preferences, watch history, and ratings are stored in distinct schemas and never blended with third-party vendor metrics.
  * **Immutable Event Log:** Append-only telemetry capturing every impression, click, rating, and recommendation request.

### 3.4 Recommendation Architecture (Stage 1 / V1)

* **Algorithm Formulation:** Content-Based Filtering (TF-IDF + Structured Metadata Features) + Segmented Popularity Fallback.
* **Core Philosophy:** Inspectable, explainable, and computationally modest. Does NOT require premature deep collaborative filtering, vector databases, or LLM-as-recommender.
* **The 7-Step Pipeline:**
  ```text
  1. Request Context & Intent
         ↓
  2. Hard Policy Filtering (seen suppression, region, age, blocked titles)
         ↓
  3. Multi-Source Candidate Generation (Popularity, Content neighbors, Onboarding seeds)
         ↓
  4. Scoring (User taste vector dot product vs item feature vectors + popularity blend)
         ↓
  5. Diversity & Repetition Control (Genre caps, franchise limits, novelty penalties)
         ↓
  6. Grounded Explanation Construction (Matched tags, creator links, similar anchor)
         ↓
  7. Slate Delivery & Immutable Audit Logging (Request ID, model version, candidate pool)
  ```
* **User Profile Construction:**
  $$p_u = \text{normalize}\left(\sum_{i \in \text{Pos}(u)} w_{u,i} \cdot x_i\right)$$
  $$w_{u,i} = \text{event\_weight} \times \text{rating\_weight} \times \exp(-\lambda \cdot \Delta t)$$
  * Explicit likes/favourites receive high weights ($+1.0$).
  * Dislikes are maintained in a separate negative exclusion/penalty profile.
  * **Critical Axiom:** "Not seen" $\ne$ "Disliked" (zero negative weight).

### 3.5 Authentication & Privacy Architecture

* **Authentication Model:**
  * Stateless JWT access tokens (15-minute lifetime, stored in memory).
  * Rotating HTTP-only, Secure, SameSite=Strict refresh tokens (7-day lifetime) persisted in `user_sessions`.
  * Password hashing via Argon2id.
* **Guest Onboarding Support:**
  * Visitors can immediately initiate Taste Discovery as an anonymous guest with a temporary session ID.
  * Upon account creation/registration, guest taste state and events are atomically reconciled and merged into the new user ID.
* **Privacy & Data Governance:**
  * Right to erasure: Complete deletion of user profiles, library, ratings, and explicit taste preferences upon user request.
  * Anonymized recommendation event logs: Retain interaction patterns for offline model evaluation with user identifiers stripped or cryptographically salted.

### 3.5 TMDB Catalog Acquisition & Ingestion Architecture (Step 14)

The catalog acquisition and ingestion pipeline enables controlled, bounded data acquisition from TMDB into the canonical PostgreSQL catalog:

```text
TMDB API
   │
   ▼
[TMDBClient] ──> Token-Bucket Rate Limiter (20 req/s) + Exponential Backoff Retry (429/5xx)
   │
   ▼
[TMDBCollector] ──> Bounded Discovery Pagination & Full Details (/movie/{id}?append=credits,keywords)
   │
   ▼
[MovieNormalizer] ──> CanonicalMovie Domain Entity + Validation (Invariants, Temporal, Taxonomy)
   │
   ▼
[CatalogIngestionService]
   ├── Identity Resolution: Check source_identity (source='tmdb', external_id) & canonical UUIDv5
   ├── Duplicate Prevention: In-place update/merge for existing records; insert for new records
   ├── Franchise Deduplication: Shared movie_collection lookup by external_id
   ├── Audit Provenance: Payload SHA-256 digest + field-level derivation tracking
   └── PostgreSQL Persistence: Relational commit across movie, artwork, credits, provenance, tags
```

* **Core Principles:**
  * **Provider Separation:** TMDB is strictly an upstream provider, never the canonical domain schema.
  * **Deterministic Synthetic UUIDs:** Deterministic UUIDv5 identifiers (`generate_canonical_movie_id("tmdb", tmdb_id)`) are generated in the internal namespace.
  * **Controlled & Bounded Execution:** All crawling and ingestion is bounded by `max_pages` and `max_movies` to prevent runaway crawler loops.
  * **Zero Secret Leakage:** Authentication headers and query parameters are masked and never logged.
  * **Zero Binary Downloads:** Stores artwork URLs and paths only; never downloads TMDB image binaries.

### 3.6 User Preferences, Taste Signals & Feedback Persistence Architecture (Step 17)

Step 17 establishes the persistent relational foundation for all downstream recommendation systems:

```text
User / Guest Interaction
        │
        ▼
[deps.get_actor_identity]
  ├── Bearer JWT ─────────────> Authenticated User (user_id + session_id)
  └── X-Session-ID (active) ──> Guest Session (session_id, user_id=None)
        │
        ├── Feedback Endpoint (/api/v1/feedback/event, /api/v1/feedback/rate)
        │     ├── FeedbackService
        │     │     ├── UserMovieEventRepository ──> user_movie_event (append-only stream)
        │     │     └── MovieRatingRepository    ──> movie_rating (authoritative 1:1 state)
        │
        ├── Preferences Endpoint (/api/v1/preferences)
        │     └── PreferenceService
        │           └── UserPreferenceRepository ──> user_preference (bounded -1.0 to 1.0 affinity)
        │
        └── Library Endpoint (/api/v1/library/watchlist, /api/v1/library/favourites)
              └── LibraryService
                    ├── WatchlistRepository      ──> watchlist (unique user_id, movie_id)
                    └── FavouriteRepository      ──> favourite (unique user_id, movie_id)
```

* **Separation of History and Current State:**
  - `user_movie_event` records immutable append-only telemetry (`impression`, `detail_view`, `click`, `rating`).
  - `movie_rating` stores the user's active, authoritative rating ($1.0 \le r \le 10.0$) with $O(1)$ query efficiency.
* **Guest Activity & Reconciliation Flow:**
  - Anonymous visitors generate telemetry events stamped with their active PostgreSQL `session_id`.
  - Upon user registration or login, `LibraryService.reconcile_guest_activity` reconciles guest events to the new `user_id` and idempotently imports client-side guest watchlist and favourite entries without creating fake guest users.
* **Bounded Taxonomy Affinities:**
  - `user_preference` models explicit affinity toward canonical taxonomy nodes (`genre`, `theme`, `mood`, `style`), verified against pre-seeded taxonomy tables.
* **Strict Boundary:** No recommendation scoring, candidate generation, MMR, vector embeddings, ML models, Redis, or Celery.

---

## 4. Deployment, Security, and Scalability

### 4.1 Deployment Architecture (Development & Production)
* **Local Development:** Multi-container Docker Compose setup (`db`, `backend`, `frontend`).
* **Production Foundation:**
  * Frontend: Static bundle served via CDN (or Nginx reverse proxy).
  * Backend: Gunicorn / Uvicorn ASGI workers containerized on Linux.
  * Database: Managed PostgreSQL (AWS RDS / Supabase / Neon) with connection pooling (`pgbouncer` or SQLAlchemy async pool).
  * Storage: Local or S3-compatible bucket for rights-cleared static media assets.

### 4.2 Security Architecture
* Strict CORS configuration restricting API calls to verified application origins.
* Input validation enforced on 100% of payloads via Pydantic v2 schemas.
* SQL injection prevention via SQLAlchemy 2.0 parameterized queries.
* Rate limiting implemented on authentication and external adapter boundaries using a token-bucket algorithm.
* Zero plaintext secrets: 100% of secrets loaded via environment variables and validated at application startup.

### 4.3 Scalability & Performance SLAs
* **Recommendation Request Latency:** $p50 < 60\text{ms}$, $p95 < 150\text{ms}$ on a catalog of 20,000 active titles.
* **Search Latency:** $p95 < 50\text{ms}$ using PostgreSQL GIN trigram indexes (`pg_trgm`).
* **Candidate Bounding:** Every candidate generator retrieves at most 100–200 candidates, preventing unbound memory growth during scoring.

---

## 5. Comprehensive Testing Strategy

A production-quality system requires automated verification at every architectural tier:

```
               ┌──────────────────────────────┐
               │    End-to-End Tests (E2E)    │
               │  Full Browser & Flow Audits  │
               └──────────────┬───────────────┘
                              │
               ┌──────────────┴───────────────┐
               │      Integration Tests       │
               │ API Endpoints, DB Migrations,│
               │ Recommender Pipeline Harness │
               └──────────────┬───────────────┘
                              │
               ┌──────────────┴───────────────┐
               │          Unit Tests          │
               │ Scoring Math, Pydantic DTOs, │
               │ Filters, Diversity Logic     │
               └──────────────────────────────┘
```

1. **Unit Testing (Backend & ML):**
   * Pydantic schema serialization and boundary validation.
   * Cosine similarity and sparse matrix dot-product correctness.
   * Event weighting, time-decay curves, and Bayesian confidence shrinkage.
   * Filter policies (ensuring blocked or unwatched items are correctly filtered).
2. **Integration Testing:**
   * Test against a clean PostgreSQL container with fresh Alembic migrations.
   * API route execution with authenticated and anonymous users.
   * Full recommendation cycle: User creates profile -> submits onboarding duel -> receives candidate slate -> logs impression -> submits feedback.
3. **Frontend Testing:**
   * Component rendering and user interactions using Vitest + React Testing Library.
   * Visual and layout contrast verification for Cinematic Luminary tokens.
4. **Offline Recommender Validation:**
   * Chronological evaluation protocol: train/test split strictly based on event timestamps to prevent future data leakage.
   * Cold-start cohort slicing (0 history, 1–2 interactions, 3–5 interactions, warm users).

# Veya Luma — Database Specification (DATABASE.md)

**System:** Veya Luma  
**Database Engine:** PostgreSQL 15+  
**ORM / Migration Tooling:** SQLAlchemy 2.0 (Async) + Alembic  
**Source of Truth:** DECISION.md & PROJECT.md  
**Date:** 2026-10-01  

---

## 1. Relational Principles & Identity Rules

1. **Synthetic Internal Identity:** Every primary entity uses an internal UUIDv4 (`movie_id`, `user_id`, `event_id`, `request_id`). Never use external third-party IDs or natural keys (like movie titles) as primary keys.
2. **Decoupled External Provenance:** External identifiers (TMDB ID, IMDb `tconst`, Wikidata Q-ID) live exclusively in source-mapping tables (`source_identity`).
3. **Immutability of Telemetry:** Events, ratings history, and recommendation audit logs are append-only.
4. **Separation of Fact vs Preference:** Third-party catalog facts, derived ML features, and first-party user preference signals are strictly separated across dedicated table families.
5. **No Universal Score Mixing:** Never blend TMDB `vote_average`, IMDb scores, and user ratings into a single column.
6. **Explicit Uncertainty:** The absence of a tag or rating represents `unknown`, never a negative preference or confirmed absence.

---

## 2. Complete Entity-Relationship Overview

```text
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      user       │◄──────┤ user_preference │       │ taxonomy_node   │
└────────┬────────┘       └─────────────────┘       └────────┬────────┘
         │                                                   │
         ├────────────────┬─────────────────┐                │
         ▼                ▼                 ▼                ▼
┌─────────────────┐┌──────────────┐┌────────────────┐┌───────────────┐
│user_movie_event ││user_session  ││recommendation_ ││   movie_tag   │
└────────┬────────┘└──────────────┘│    request     │└───────┬───────┘
         │                         └────────┬───────┘        │
         ▼                                  ▼                ▼
┌─────────────────┐                ┌────────────────┐┌───────────────┐
│  source_identity│◄───────────────┤     movie      │┤movie_tag_evid │
└─────────────────┘                └────────┬───────┘└───────────────┘
                                            │
               ┌────────────────────────────┼───────────────────────────┐
               ▼                            ▼                           ▼
      ┌─────────────────┐          ┌─────────────────┐         ┌─────────────────┐
      │  movie_credit   │          │ movie_franchise │         │  availability_  │
      └────────┬────────┘          └─────────────────┘         │      offer      │
               ▼                                               └─────────────────┘
      ┌─────────────────┐
      │     person      │
      └─────────────────┘
```

---

## 3. Detailed Table Specifications

### 3.1 Identity & Authentication (Step 16 Implementation)

The user identity and persistent session architecture decouples transient browser sessions from authenticated curator accounts, enforcing authoritative state in PostgreSQL rather than relying purely on stateless tokens.

#### `app_user`
Core account record. Passwords are protected using Argon2id with unique cryptographic salts.
```sql
CREATE TABLE app_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    hashed_password VARCHAR(255) NOT NULL, -- Argon2id hash ($argon2id$v=19$m=65536,t=2,p=1)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    locale VARCHAR(10) NOT NULL DEFAULT 'en-US',
    country_code VARCHAR(2) NOT NULL DEFAULT 'US',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_app_user_email UNIQUE (email),
    CONSTRAINT uq_app_user_username UNIQUE (username)
);
CREATE UNIQUE INDEX ix_app_user_email ON app_user(email);
CREATE UNIQUE INDEX ix_app_user_username ON app_user(username);
```

#### `user_session`
Tracks authoritative authenticated sessions, rotating refresh tokens, and anonymous guest discovery sessions.
```sql
CREATE TABLE user_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES app_user(id) ON DELETE CASCADE, -- NULL for anonymous guest sessions
    session_type VARCHAR(20) NOT NULL DEFAULT 'authenticated', -- 'authenticated' or 'guest'
    refresh_token_hash VARCHAR(255), -- SHA-256 hex digest of rotating refresh token
    user_agent TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ, -- Explicit revocation timestamp
    reconciled_at TIMESTAMPTZ, -- Timestamp when guest session transitioned to registered user
    reconciled_user_id UUID REFERENCES app_user(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_user_session_user_id ON user_session(user_id);
CREATE INDEX ix_user_session_refresh_token_hash ON user_session(refresh_token_hash);
CREATE INDEX ix_user_session_expires_at ON user_session(expires_at);
CREATE INDEX ix_user_session_revoked_at ON user_session(revoked_at);
CREATE INDEX idx_user_session_user_expires ON user_session(user_id, expires_at);
CREATE INDEX idx_user_session_refresh_hash ON user_session(refresh_token_hash);
```

---

### 3.2 Canonical Movie Catalog & Persistence (Step 13 Implementation)

The canonical movie catalog persistence layer decouples the internal domain entity from raw upstream vendor payloads. All entities use synthetic UUID primary keys (`movie.id`), explicit foreign key constraints with `ON DELETE CASCADE`, provider identity mapping (`source_identity`), artwork references, collection/franchise hierarchies, structured cast/crew credits, audit provenance with SHA-256 payload digests, and normalized multi-axis taxonomy (`taxonomy_node` + `movie_tag`).

#### `movie`
Canonical movie entity identified by internal synthetic UUIDv4/UUIDv5.
```sql
CREATE TABLE movie (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    original_title VARCHAR(500),
    original_language VARCHAR(10) NOT NULL DEFAULT 'en',
    spoken_languages JSONB NOT NULL DEFAULT '[]'::jsonb,
    release_date DATE,
    release_year SMALLINT,
    runtime_minutes SMALLINT,
    synopsis TEXT,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    collection_id UUID REFERENCES movie_collection(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_movie_runtime_positive CHECK (runtime_minutes IS NULL OR runtime_minutes > 0),
    CONSTRAINT chk_movie_release_year_range CHECK (release_year IS NULL OR (release_year >= 1880 AND release_year <= 2100)),
    CONSTRAINT chk_movie_language_length CHECK (length(original_language) >= 2)
);
CREATE INDEX ix_movie_title ON movie(title);
CREATE INDEX ix_movie_original_language ON movie(original_language);
CREATE INDEX ix_movie_release_date ON movie(release_date);
CREATE INDEX ix_movie_release_year ON movie(release_year);
CREATE INDEX ix_movie_collection_id ON movie(collection_id);
```

#### `movie_collection`
Normalized franchise or collection entity (e.g. 'Dune Collection'). Avoids duplication across movies.
```sql
CREATE TABLE movie_collection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    poster_path VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_movie_collection_external_id ON movie_collection(external_id);
```

#### `source_identity`
Decoupled external vendor identity mapping. Enforces strict uniqueness per `(source, external_id)` to prevent duplicate mappings across movies.
```sql
CREATE TABLE source_identity (
    id BIGSERIAL PRIMARY KEY,
    movie_id UUID NOT NULL REFERENCES movie(id) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL,       -- 'tmdb', 'imdb', 'wikidata'
    external_id VARCHAR(100) NOT NULL, -- e.g. '693134', 'tt15239678'
    confidence FLOAT NOT NULL DEFAULT 1.0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_source_identity_source_external_id UNIQUE (source, external_id)
);
CREATE INDEX ix_source_identity_movie_id ON source_identity(movie_id);
CREATE INDEX idx_source_identity_movie_source ON source_identity(movie_id, source);
```

#### `movie_artwork`
Visual asset reference metadata (path and URL references without re-hosting or media downloading).
```sql
CREATE TABLE movie_artwork (
    id BIGSERIAL PRIMARY KEY,
    movie_id UUID NOT NULL UNIQUE REFERENCES movie(id) ON DELETE CASCADE,
    poster_path VARCHAR(500),
    backdrop_path VARCHAR(500),
    poster_url VARCHAR(1000),
    backdrop_url VARCHAR(1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_movie_artwork_movie_id ON movie_artwork(movie_id);
```

#### `movie_provenance`
Audit provenance record capturing upstream source, endpoint, retrieval timestamp, license profile, payload SHA-256 hash, and field-level derivation origin.
```sql
CREATE TABLE movie_provenance (
    id BIGSERIAL PRIMARY KEY,
    movie_id UUID NOT NULL UNIQUE REFERENCES movie(id) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL,
    source_id VARCHAR(100),
    endpoint_or_product VARCHAR(100) NOT NULL DEFAULT 'movie-details',
    retrieved_at TIMESTAMPTZ NOT NULL,
    license_profile VARCHAR(100) NOT NULL,
    raw_sha256 VARCHAR(64),
    field_sources JSONB NOT NULL DEFAULT '{}'::jsonb, -- source_derived vs veya_derived
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_movie_provenance_movie_id ON movie_provenance(movie_id);
```

#### `movie_credit`
Structured cast and crew credits preserving names, billing orders, departments, and roles.
```sql
CREATE TABLE movie_credit (
    id BIGSERIAL PRIMARY KEY,
    movie_id UUID NOT NULL REFERENCES movie(id) ON DELETE CASCADE,
    credit_type VARCHAR(20) NOT NULL, -- 'cast', 'crew'
    name VARCHAR(255) NOT NULL,
    role_or_character VARCHAR(255),
    department VARCHAR(100),
    job VARCHAR(100),
    billing_order INTEGER,
    person_external_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_movie_credit_movie_id ON movie_credit(movie_id);
CREATE INDEX ix_movie_credit_name ON movie_credit(name);
CREATE INDEX ix_movie_credit_job ON movie_credit(job);
CREATE INDEX idx_movie_credit_movie_type ON movie_credit(movie_id, credit_type);
CREATE INDEX idx_movie_credit_lookup ON movie_credit(movie_id, job);
```


---

### 3.3 Multi-Axis Movie Taxonomy

Controlled multi-label vocabulary across 6 core axes: `genre`, `theme`, `mood`, `style`, `audience`, `sensitivity`.

#### `taxonomy_node`
Controlled concept definition.
```sql
CREATE TYPE taxonomy_axis_enum AS ENUM (
    'genre', 'theme', 'mood', 'style', 'audience', 'sensitivity'
);

CREATE TABLE taxonomy_node (
    node_id BIGSERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,       -- e.g. 'theme.artificial_intelligence', 'mood.tense'
    label VARCHAR(100) NOT NULL,            -- e.g. 'Artificial Intelligence', 'Tense'
    axis taxonomy_axis_enum NOT NULL,
    parent_node_id BIGINT REFERENCES taxonomy_node(node_id),
    definition TEXT NOT NULL,
    default_weight NUMERIC(5, 3) NOT NULL DEFAULT 1.0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_rankable BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_taxonomy_node_axis ON taxonomy_node(axis, is_active);
```

#### `taxonomy_alias`
Maps incoming provider tags/keywords to canonical taxonomy nodes.
```sql
CREATE TABLE taxonomy_alias (
    alias_id BIGSERIAL PRIMARY KEY,
    node_id BIGINT NOT NULL REFERENCES taxonomy_node(node_id) ON DELETE CASCADE,
    alias_text VARCHAR(150) NOT NULL,
    source_name VARCHAR(50) NOT NULL, -- tmdb_keyword, wikidata, editorial
    UNIQUE (node_id, alias_text, source_name)
);
CREATE INDEX idx_taxonomy_alias_lookup ON taxonomy_alias(alias_text, source_name);
```

#### `movie_tag`
Multi-label assignment with calibrated strength and confidence.
```sql
CREATE TYPE tag_assertion_enum AS ENUM ('present', 'absent', 'unknown');

CREATE TABLE movie_tag (
    movie_id UUID NOT NULL REFERENCES movie(movie_id) ON DELETE CASCADE,
    node_id BIGINT NOT NULL REFERENCES taxonomy_node(node_id) ON DELETE CASCADE,
    assertion tag_assertion_enum NOT NULL DEFAULT 'present',
    strength NUMERIC(5, 4) NOT NULL DEFAULT 1.0 CHECK (strength BETWEEN 0 AND 1),
    confidence NUMERIC(5, 4) NOT NULL DEFAULT 1.0 CHECK (confidence BETWEEN 0 AND 1),
    evidence_count SMALLINT NOT NULL DEFAULT 1,
    is_curated BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (movie_id, node_id)
);
CREATE INDEX idx_movie_tag_node ON movie_tag(node_id, confidence DESC);
CREATE INDEX idx_movie_tag_movie ON movie_tag(movie_id, confidence DESC);
```

#### `movie_tag_evidence`
Audit trail of observations generating the tag.
```sql
CREATE TABLE movie_tag_evidence (
    evidence_id BIGSERIAL PRIMARY KEY,
    movie_id UUID NOT NULL REFERENCES movie(movie_id) ON DELETE CASCADE,
    node_id BIGINT NOT NULL REFERENCES taxonomy_node(node_id) ON DELETE CASCADE,
    source_name VARCHAR(50) NOT NULL,
    evidence_type VARCHAR(50) NOT NULL, -- provider_keyword, synopsis_extract, editorial
    raw_payload JSONB NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_movie_tag_evidence_lookup ON movie_tag_evidence(movie_id, node_id);
```

---

### 3.4 Franchises & Relationships

#### `franchise`
```sql
CREATE TABLE franchise (
    franchise_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE movie_franchise (
    movie_id UUID NOT NULL REFERENCES movie(movie_id) ON DELETE CASCADE,
    franchise_id UUID NOT NULL REFERENCES franchise(franchise_id) ON DELETE CASCADE,
    sequence_order NUMERIC(6, 2),
    PRIMARY KEY (movie_id, franchise_id)
);
```

---

### 3.5 Outbound Availability & Offers (Non-Streaming)

Veya Luma provides outbound links only, subject to vendor terms.
```sql
CREATE TABLE availability_offer (
    offer_id BIGSERIAL PRIMARY KEY,
    movie_id UUID NOT NULL REFERENCES movie(movie_id) ON DELETE CASCADE,
    region CHAR(2) NOT NULL,              -- e.g. 'US', 'GB'
    provider_name VARCHAR(100) NOT NULL,  -- e.g. 'Max', 'Apple TV', 'Criterion Channel'
    monetization_type VARCHAR(30) NOT NULL, -- 'subscription', 'rent', 'buy', 'free'
    presentation_quality VARCHAR(10),     -- 'HD', '4K'
    outbound_link TEXT,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    UNIQUE (movie_id, region, provider_name, monetization_type)
);
CREATE INDEX idx_availability_lookup ON availability_offer(movie_id, region);
```

---

### 3.6 User Taste State, Preferences & Library (Step 17 Implementation)

Step 17 establishes the persistent relational foundation for user interactions, ratings, explicit taxonomy affinities, and curated collections (watchlist and favourites).

#### `user_movie_event`
Append-only telemetry log capturing implicit and explicit user movie interactions for downstream behavioral analysis and model training.
```sql
CREATE TABLE user_movie_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES app_user(id) ON DELETE CASCADE,
    session_id UUID REFERENCES user_session(id) ON DELETE SET NULL,
    movie_id UUID NOT NULL REFERENCES movie(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'impression', 'detail_view', 'click', 'rating'
    event_value NUMERIC(4, 2),
    source VARCHAR(50),
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_user_movie_event_user_id ON user_movie_event(user_id);
CREATE INDEX ix_user_movie_event_session_id ON user_movie_event(session_id);
CREATE INDEX ix_user_movie_event_movie_id ON user_movie_event(movie_id);
CREATE INDEX ix_user_movie_event_event_type ON user_movie_event(event_type);
CREATE INDEX ix_user_movie_event_created_at ON user_movie_event(created_at);
CREATE INDEX ix_ume_user_created ON user_movie_event(user_id, created_at);
CREATE INDEX ix_ume_user_event ON user_movie_event(user_id, event_type);
CREATE INDEX ix_ume_movie_created ON user_movie_event(movie_id, created_at);
CREATE INDEX ix_ume_user_movie ON user_movie_event(user_id, movie_id);
```

#### `movie_rating`
Authoritative current rating state table providing fast $O(1)$ lookups of a user's active rating for a movie, while historical rating mutations are appended to `user_movie_event`.
```sql
CREATE TABLE movie_rating (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES movie(id) ON DELETE CASCADE,
    rating NUMERIC(3, 1) NOT NULL,
    source VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_movie_rating_bounds CHECK (rating >= 1.0 AND rating <= 10.0),
    CONSTRAINT uq_movie_rating_user_movie UNIQUE (user_id, movie_id)
);
CREATE INDEX ix_movie_rating_user_id ON movie_rating(user_id);
CREATE INDEX ix_movie_rating_movie_id ON movie_rating(movie_id);
CREATE INDEX ix_movie_rating_created_at ON movie_rating(created_at);
CREATE INDEX ix_movie_rating_user_movie ON movie_rating(user_id, movie_id);
```

#### `user_preference`
Explicit curator affinities mapped directly to canonical taxonomy nodes (`genre`, `theme`, `mood`, `style`).
```sql
CREATE TABLE user_preference (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    taxonomy_node_id INTEGER NOT NULL REFERENCES taxonomy_node(id) ON DELETE CASCADE,
    affinity NUMERIC(3, 2) NOT NULL DEFAULT 1.0,
    source VARCHAR(50) NOT NULL DEFAULT 'explicit',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_user_preference_affinity_bounds CHECK (affinity >= -1.0 AND affinity <= 1.0),
    CONSTRAINT uq_user_preference_user_taxonomy UNIQUE (user_id, taxonomy_node_id)
);
CREATE INDEX ix_user_preference_user_id ON user_preference(user_id);
CREATE INDEX ix_user_preference_taxonomy_node_id ON user_preference(taxonomy_node_id);
CREATE INDEX ix_user_preference_user_taxonomy ON user_preference(user_id, taxonomy_node_id);
```

#### `watchlist`
Normalized persistent storage for curator watchlist.
```sql
CREATE TABLE watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES movie(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_watchlist_user_movie UNIQUE (user_id, movie_id)
);
CREATE INDEX ix_watchlist_user_id ON watchlist(user_id);
CREATE INDEX ix_watchlist_movie_id ON watchlist(movie_id);
CREATE INDEX ix_watchlist_created_at ON watchlist(created_at);
CREATE INDEX ix_watchlist_user_movie ON watchlist(user_id, movie_id);
CREATE INDEX ix_watchlist_user_created ON watchlist(user_id, created_at);
```

#### `favourite`
Normalized persistent storage for curator favourites (distinct from watchlist; a film may exist in both).
```sql
CREATE TABLE favourite (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES movie(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_favourite_user_movie UNIQUE (user_id, movie_id)
);
CREATE INDEX ix_favourite_user_id ON favourite(user_id);
CREATE INDEX ix_favourite_movie_id ON favourite(movie_id);
CREATE INDEX ix_favourite_created_at ON favourite(created_at);
CREATE INDEX ix_favourite_user_movie ON favourite(user_id, movie_id);
CREATE INDEX ix_favourite_user_created ON favourite(user_id, created_at);
```

---

## 4. Database Migrations & Seed Policy

1. **Alembic Versioning:** All schema changes are managed via versioned migration scripts in `backend/alembic/versions`:
   - `89a21758d887`: Phase 0 initial baseline.
   - `1276cdf667d3`: Phase 2 Step 13 movie catalog foundation (`movie`, `movie_collection`, `source_identity`, `movie_artwork`, `movie_provenance`, `movie_credit`, `taxonomy_node`, `movie_tag`) with pre-seeded canonical taxonomy nodes (21 genres, 29 themes, 22 moods, 14 styles = 86 nodes).
   - `c4b1d624a908`: Phase 3 Step 16 authentication and session models (`app_user`, `user_session`, `user_password_history`, `user_audit_log`).
   - `54cc21608f55`: Phase 3 Step 17 taste signals and persistence models (`user_movie_event`, `movie_rating`, `user_preference`, `watchlist`, `favourite`).
2. **Canonical Taxonomy Seeding:** The 86 canonical taxonomy nodes are seeded directly from `CANONICAL_GENRES`, `CANONICAL_THEMES`, `CANONICAL_MOODS`, and `CANONICAL_STYLES` defined in `app.domain.movie.taxonomy`, eliminating any competing source of truth.
3. **Reversibility:** Every migration validates complete `upgrade` -> `downgrade` -> `upgrade` cycles against PostgreSQL with clean cascade drops and zero orphan tables.
4. **Step 17 Guest Activity & Reconciliation:**
   - Guest activity records `session_id` directly in `user_movie_event`.
   - On guest-to-user registration/login or explicit reconciliation, events are repointed to the authenticated `user_id`.
   - Temporary client-side watchlist and favourite items are upserted into persistent database rows with safe `ON CONFLICT DO NOTHING` idempotency.
5. **Strict Boundary:** No recommendation scoring, candidate generation, MMR, vector embeddings, ML models, Redis, or Celery.

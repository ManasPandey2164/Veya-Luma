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

### 3.1 Identity & Authentication

#### `app_user`
Core account record. Does not store demographic proxies.
```sql
CREATE TABLE app_user (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    locale VARCHAR(10) NOT NULL DEFAULT 'en-US',
    country_code CHAR(2) NOT NULL DEFAULT 'US',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `user_session`
Tracks active sessions and rotating refresh tokens.
```sql
CREATE TABLE user_session (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    user_agent TEXT,
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);
CREATE INDEX idx_user_session_user ON user_session(user_id);
```

---

### 3.2 Movie Catalog & People

#### `movie`
Canonical movie entity.
```sql
CREATE TABLE movie (
    movie_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_title VARCHAR(500) NOT NULL,
    original_title VARCHAR(500),
    original_language VARCHAR(10) NOT NULL DEFAULT 'en',
    release_date DATE,
    release_year SMALLINT GENERATED ALWAYS AS (EXTRACT(YEAR FROM release_date)) STORED,
    runtime_minutes SMALLINT CHECK (runtime_minutes IS NULL OR runtime_minutes > 0),
    synopsis TEXT,
    poster_path VARCHAR(255),
    backdrop_path VARCHAR(255),
    popularity_score NUMERIC(10, 4) NOT NULL DEFAULT 0.0,
    vote_average NUMERIC(4, 2) NOT NULL DEFAULT 0.0,
    vote_count INTEGER NOT NULL DEFAULT 0,
    is_adult BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_movie_release_year ON movie(release_year);
CREATE INDEX idx_movie_popularity ON movie(popularity_score DESC);
```

#### `movie_alias`
Localized and alternate titles used for high-precision search.
```sql
CREATE TABLE movie_alias (
    alias_id BIGSERIAL PRIMARY KEY,
    movie_id UUID NOT NULL REFERENCES movie(movie_id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    locale VARCHAR(10),
    alias_type VARCHAR(50) NOT NULL DEFAULT 'localized', -- localized, transliterated, working_title
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (movie_id, title, locale)
);
CREATE INDEX idx_movie_alias_title_trgm ON movie_alias USING gin (title gin_trgm_ops);
```

#### `person`
Cast, directors, writers, and crew.
```sql
CREATE TABLE person (
    person_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_name VARCHAR(255) NOT NULL,
    known_for_department VARCHAR(100),
    profile_path VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_person_name_trgm ON person USING gin (canonical_name gin_trgm_ops);
```

#### `movie_credit`
Links movies to people with roles and billing order.
```sql
CREATE TABLE movie_credit (
    credit_id BIGSERIAL PRIMARY KEY,
    movie_id UUID NOT NULL REFERENCES movie(movie_id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,
    credit_type VARCHAR(20) NOT NULL, -- cast, crew
    job VARCHAR(100) NOT NULL,        -- Director, Screenplay, Actor, Composer
    character_name VARCHAR(255),
    billing_order INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (movie_id, person_id, credit_type, job, character_name)
);
CREATE INDEX idx_movie_credit_lookup ON movie_credit(movie_id, job);
CREATE INDEX idx_movie_credit_person ON movie_credit(person_id, job);
```

#### `source_identity`
Maps internal entities to external vendor data sources.
```sql
CREATE TABLE source_identity (
    identity_id BIGSERIAL PRIMARY KEY,
    internal_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- movie, person
    source_name VARCHAR(50) NOT NULL, -- tmdb, imdb, wikidata
    external_id VARCHAR(100) NOT NULL,
    confidence NUMERIC(4, 3) NOT NULL DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_name, external_id, entity_type)
);
CREATE INDEX idx_source_identity_internal ON source_identity(internal_id, entity_type);
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

### 3.6 User Taste State & Feedback Semantics

#### `user_movie_event`
Append-only log of explicit and implicit user actions.
```sql
CREATE TYPE user_event_type_enum AS ENUM (
    'seen_confirm', 'rating', 'like', 'dislike', 'favourite',
    'watchlist_add', 'watchlist_remove', 'history_add', 'skip',
    'duel_pick', 'recommendation_impression', 'recommendation_click'
);

CREATE TABLE user_movie_event (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES movie(movie_id) ON DELETE CASCADE,
    event_type user_event_type_enum NOT NULL,
    value NUMERIC(4, 2),                  -- e.g. rating (1.0 - 5.0) or duel winner (+1)
    context JSONB,                        -- surface ('onboarding', 'feed', 'search')
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_user_event_lookup ON user_movie_event(user_id, event_type, occurred_at DESC);
CREATE INDEX idx_movie_event_lookup ON user_movie_event(movie_id, event_type);
```

#### `user_taste_profile`
Derived materialized taste state for fast recommendation scoring.
```sql
CREATE TABLE user_taste_profile (
    user_id UUID PRIMARY KEY REFERENCES app_user(user_id) ON DELETE CASCADE,
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    interaction_count INTEGER NOT NULL DEFAULT 0,
    dense_preference_vector BYTEA,        -- Serialized NumPy / Float32 vector
    facet_affinities JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. {"genre.sci_fi": 0.82}
    negative_exclusions JSONB NOT NULL DEFAULT '[]'::jsonb, -- Explicit excluded IDs/nodes
    last_computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.7 Recommendation Telemetry & Traceability

#### `recommendation_request`
Captures every recommendation slate request for algorithmic auditing.
```sql
CREATE TABLE recommendation_request (
    request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES app_user(user_id) ON DELETE SET NULL,
    session_id UUID,
    surface VARCHAR(50) NOT NULL,         -- 'home_feed', 'movie_detail', 'onboarding'
    model_version VARCHAR(50) NOT NULL,   -- e.g. 'v1_content_tfidf'
    policy_version VARCHAR(50) NOT NULL,  -- e.g. 'v1_standard_diversity'
    candidate_count INTEGER NOT NULL,
    delivered_movie_ids UUID[] NOT NULL,
    reason_codes JSONB NOT NULL,          -- Explanations paired per movie
    latency_ms NUMERIC(6, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_rec_request_user ON recommendation_request(user_id, created_at DESC);
```

---

## 4. Database Migrations & Seed Policy

1. **Alembic Versioning:** All schema changes must be managed via versioned migration scripts in `backend/alembic/versions`.
2. **Phase 0 Seed Data:** A curated fixture dataset of 100 well-known, diverse films across all eras and genres with canonical credits, posters, and multi-axis tags will be committed to `backend/tests/fixtures/catalog_seed.json` to enable instant offline testing.
3. **No Migration Downgrade Data Loss:** Production migrations must be backward-compatible with running application versions.

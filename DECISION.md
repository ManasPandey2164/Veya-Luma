# Veya Luma — Decision Record

**Status:** Decided  
**Date:** 2026-10-01  
**Current Phase:** **Phase 1 — Movie Discovery**  
**Product:** **Veya Luma**  
**Primary frontend reference:** Stitch — Veya Luma Cinematic Discovery  
**Purpose:** Convert the research into an implementation contract for the current movie-first phase while preserving a clear path for Veya Luma to expand into additional discovery categories later.

---

# 0. Product Scope — The Most Important Decision

Veya Luma is intended to become a **personalized discovery platform**, not permanently a movie-only website.

However, we are deliberately building **one vertical first: movies**.

## Phase 1 — Personalized Movie Discovery

> **Movies are the first domain of Veya Luma, not the final boundary of Veya Luma.**

Phase 1 exists to prove the core Veya Luma loop:

```text
Discover
   ↓
Interact
   ↓
Learn taste
   ↓
Personalize
   ↓
Recommend
   ↓
Get feedback
   ↓
Improve discovery
```

The long-term direction is:

```text
                         VEYA LUMA
                             │
              Personalized Discovery Platform
                             │
                 ┌───────────┴───────────┐
                 │                       │
             PHASE 1                 FUTURE
                 │                       │
              MOVIES          Additional discovery domains
                 │             added after validation
                 │
        Taste + Preference
        Recommendation
        Discovery UX
        Feedback + Events
```

The future categories are intentionally **not decided yet**.

The architectural requirement is that future expansion should reuse the stable Veya Luma foundations without forcing the current movie application to become unnecessarily generic.

### Abstraction rule

Build:

```text
Reusable platform foundations
+
Explicit Movie domain
```

Reusable foundations include:

- users
- authentication
- preferences
- feedback
- interactions/events
- recommendation requests
- candidate generation
- ranking interfaces
- explanations
- search intent
- account/privacy

Do **not** prematurely build a universal abstraction for every possible future content type.

The movie domain should remain explicit and easy to understand during Phase 1.

---

# 0.1 Stitch Frontend = Phase-1 Product Reference

The supplied Stitch frontend is the concrete reference for the current Veya Luma movie experience.

It establishes the Phase-1 product surface around:

### Discovery

- Discover/Home
- recommendation results
- personalized resonance/recommendation explanations
- movie details

### Taste Discovery

- Taste Discovery introduction
- adaptive Q&A
- interactive taste duel
- adaptive taste duel
- recommendation calibration

### User feedback

- likes/dislikes
- ratings
- favourites
- watchlist
- watch history

### Search

- movie search
- intent-based search results

### Personalization

- Cinematic DNA / taste profile
- Taste Preferences
- User Profile
- Recommendation Preferences / calibration
- Account & Privacy

These screens are the **Phase-1 product scope**, not just visual experiments.

The Stitch frontend determines the intended **user experience and visual direction**.

This decision document determines:

- product scope
- technical architecture
- data decisions
- recommendation decisions
- phased implementation
- what is intentionally deferred

The existing **Cinematic Luminary** design direction remains the Phase-1 visual foundation.

---

# 1. Executive Decision

We will build Veya Luma Phase 1 as a **production-oriented modular monolith focused on personalized movie discovery**, with reusable foundations that can support future Veya Luma discovery categories.

### Core decision

> **Build Phase 1 around PostgreSQL + Python/FastAPI + React, with TMDB as the primary non-commercial movie metadata/discovery source, adaptive Taste Discovery onboarding, and a transparent movie recommender using TF-IDF + structured movie features + popularity fallback.**

The movie recommendation engine will mature through:

```text
Stage 1
Content + Popularity
        ↓
Stage 2
Collaborative Filtering + MMR/Diversity
        ↓
Stage 3
Learned Hybrid Ranking + Semantic Retrieval
        ↓
Stage 4
Measured Scale + Bounded Exploration
```

These stages describe the evolution of the **movie vertical**.

They do not mean that Veya Luma ends at movies or that these stages are the entire product roadmap.

We are **not** starting with deep learning, a vector database, a large LLM recommender, or a contextual bandit.

The recommendation pipeline remains:

```text
Events
  ↓
Point-in-time features
  ↓
Candidate generation
  ↓
Ranking
  ↓
Hard policy filtering
  ↓
Diversification
  ↓
Explanations + logging
```

An LLM may assist with natural-language intent parsing or explanation wording, but it will **not** be the recommender of record.

---

# 2. Product Decision

## Phase-1 product goal

Veya Luma Phase 1 is:

> **A personalized movie discovery experience that learns a user's taste and helps them discover what to watch.**

It is not merely a movie database, movie search engine, or static recommendation page.

The Phase-1 product must support:

- new users
- users with little history
- warm users
- users with extensive history
- explicit likes/dislikes
- ratings
- favourites
- watchlist
- watch history
- search behaviour
- natural-language movie intent
- exploration
- diversity
- novelty
- recommendation explanations
- adaptive Taste Discovery

## Phase-1 frontend scope

The Stitch reference establishes these major product areas:

```text
Discover
   ↓
Taste Discovery
   ↓
Adaptive Q&A / Taste Duel
   ↓
Recommendations
   ↓
Movie Details
   ↓
Like / Dislike / Rating
   ↓
Favourites / Watchlist / History
   ↓
Search / Intent Search
   ↓
Taste Profile / Cinematic DNA
   ↓
Recommendation Calibration
   ↓
User Profile / Taste Preferences
   ↓
Account & Privacy
```

These screens should become real connected functionality, not static UI.

## What is outside Phase 1

We are intentionally **not** building yet:

- additional entertainment categories
- a universal multi-domain recommendation engine
- cross-domain recommendations
- a generalized entertainment marketplace
- a social network
- a streaming service

Future categories will be added only after the movie vertical validates the discovery/personalization loop.

## Product architecture principle

```text
Veya Luma foundations
        │
        ├── Identity / Auth
        ├── User Preferences
        ├── Feedback
        ├── Event System
        ├── Recommendation Interface
        ├── Search Intent
        ├── Explanation Framework
        └── Account / Privacy
                    │
                    ▼
              Movie Domain
                    │
                    ├── Movie Catalog
                    ├── Movie Taxonomy
                    ├── Movie Metadata
                    ├── Movie Recommendations
                    └── Movie Discovery UX
```

This gives us **future extensibility without premature over-engineering**.

---

# 3. Technology Stack Decision

# 3. Technology Stack Decision

## Frontend

**React + TypeScript**

Supporting choices:

- Vite
- Tailwind CSS
- component library/design system as needed
- React Query/TanStack Query for server state
- React Router where routing is required

### Why

The app is intended to become a real web product rather than a research notebook. React gives us a clean separation between UI and the recommendation/API layer.

---

## Backend

**Python + FastAPI**

Responsibilities:

- authentication
- user profiles
- movie APIs
- recommendation APIs
- onboarding
- feedback events
- search
- watchlist
- ratings
- recommendation explanations
- admin/model endpoints where needed

---

## Database

**PostgreSQL**

PostgreSQL is the system of record for:

- users
- movies
- source identities
- movie metadata
- user preferences
- ratings
- likes/dislikes
- favourites
- watchlist
- watch history
- recommendation events
- recommendation audits
- model metadata
- availability snapshots where applicable

The application will use an internal `movie_id` UUID.

External IDs such as TMDB IDs must be stored separately.

**Never use a movie title as the database identity.**

---

## ORM / migrations

- SQLAlchemy
- Alembic
- PostgreSQL

---

## ML / recommendation stack

### V1

- pandas
- NumPy
- scikit-learn
- scipy.sparse
- TF-IDF
- cosine similarity

### V2

- `implicit` for ALS/BPR
- item-item similarity
- MMR/diversification

### V3

- LightGBM / LambdaMART or logistic ranking
- sentence-transformers or another permitted embedding solution
- exact vector search initially

### V4

Only if measured scale requires it:

- HNSW / IVF
- online feature materialization
- streaming session features
- contextual exploration
- A/B infrastructure

---

# 4. Movie Data Source Decision

## Student MVP

### Primary source

**TMDB**

Use TMDB for non-commercial student development/presentation subject to its current API terms, attribution requirements, authentication, rate limits, and restrictions.

The research recommends TMDB as the main MVP catalog/discovery source.

### Optional enrichment

**Wikidata**

Use selectively for:

- open identity resolution
- multilingual labels
- cross-source identifiers
- structured enrichment

### Artwork

**Wikimedia Commons only when the individual asset's rights have been reviewed.**

Do not assume that an image being accessible through an API means that we have redistribution rights.

### Availability

Availability is **optional in V1**.

If included:

- make it country-specific
- show that it is time-varying
- record checked-at timestamps
- link users to the provider
- treat availability as an offer, not an intrinsic movie attribute

Watchmode may be considered for a genuinely non-commercial student MVP if its current terms fit.

---

## Sources we will NOT use as a production foundation without appropriate permission

Do not build the system around:

- scraped Letterboxd data
- scraped JustWatch data
- public IMDb TSV as a commercial production database
- OMDb as a durable commercial mirror
- Trakt data without the required permission
- arbitrary third-party image URLs
- scraped streaming-service pages

### Commercial release gate

Before monetization/public commercial deployment, licensing must be resolved.

Potential agreements may be required for:

- TMDB
- IMDb
- JustWatch / Watchmode
- images
- certification/parental guidance sources

The application must not confuse “technically accessible” with “licensed for our intended use.”

---

# 5. Movie Data Model Decision

The taxonomy research establishes five controlled vocabularies:

```text
Movie
├── Genre
├── Theme
├── Mood
├── Style
└── Audience / Constraints
```

These are **multi-label**, not a single genre classification.

A movie can simultaneously be:

```text
Genre:
  Thriller
  Science Fiction

Theme:
  Artificial Intelligence
  Surveillance
  Identity

Mood:
  Dark
  Tense
  Thought-provoking

Style:
  Slow Burn
  Non-linear
  Dialogue Heavy
```

The taxonomy should begin with roughly **150–250 active concepts**, rather than thousands of uncontrolled tags.

---

## Important taxonomy rule

Do NOT turn everything into a tag.

Do not use tags for:

- actor names
- director names
- studio names
- movie titles
- popularity
- quality
- nationality
- language
- every plot noun extracted by an LLM

Those belong in structured fields, relationship tables, dynamic signals, or candidate concepts.

---

# 6. User Taste Representation Decision

We will maintain two complementary representations.

## Layer A — Latent preference state

A numerical representation used for recommendation.

Example:

```text
user_embedding / preference_vector
```

This captures broad patterns that are difficult to express manually.

---

## Layer B — Interpretable facet state

The system maintains interpretable preferences such as:

```text
genre affinity
mood affinity
pace preference
era preference
language preference
runtime preference
novelty appetite
franchise affinity
director affinity
mainstream/independent tolerance
```

Each important facet can eventually maintain:

```text
mean
variance
evidence_weight
last_updated_at
source_mix
contradiction_score
```

These internal values should support recommendation and explanations.

They should **not** be presented to the user as absolute psychological labels.

---

# 7. Taste Discovery / Onboarding Decision

The onboarding experience will be called:

# Taste Discovery

The research recommends an adaptive, two-stage preference-elicitation system rather than a long questionnaire.

The principle is:

> **Ask the smallest number of questions that meaningfully changes what the user will see next.**

---

## Target interaction budget

Default:

- approximately 2–4 minutes
- roughly 8–12 meaningful responses
- recommendations appear before onboarding is finished
- user can leave at any time

The system should never force:

> “Complete 20 questions.”

---

## Step 1 — Seen Movie Picker

Show approximately 12–16 recognizable but diverse movies.

The set should vary across:

- genres
- eras
- languages
- tones
- popularity levels
- mainstream/independent titles

Each movie can have:

```text
Seen
Not seen
Skip / Not sure
```

Important:

> **Not seen is NOT negative feedback.**

---

## Step 2 — Quick Rating

For movies the user has confirmed seeing:

```text
Loved it
Liked it
It was fine
Not for me
Skip / Can't remember
```

Do not ask users to rate movies they have not seen.

---

## Step 3 — Movie Duel

Use concrete situational comparisons:

> “Which would you rather watch tonight?”

Options:

```text
Movie A
Movie B
Neither / Both sound wrong
Haven't seen either
```

Pairs should be selected because they provide useful information, not merely because the movies are popular.

---

## Step 4 — First Recommendations

After approximately 5–7 explicit responses, start recommending.

Each recommendation supports:

```text
Like
Not for me
Save
Skip / Already seen
Why this?
```

This transitions onboarding into normal product usage.

---

## Step 5 — Adaptive Finish

Continue asking only if the expected value of another question is high.

Stop when:

- enough usable signals exist
- multiple taste regions have evidence
- recommendations are sufficiently stable
- another question is not worth the interaction cost
- fatigue is visible
- user explicitly chooses to finish

A practical soft maximum is around 12 interactions.

---

# 8. Feedback Semantics Decision

We will **not** treat every interaction as a like.

Different signals have different meanings.

### Strong positive evidence

- explicit Like
- Favourite
- high explicit rating
- Save / Watchlist where context supports it

### Strong negative evidence

- explicit Dislike
- “Not for me”
- very low explicit rating

### Medium evidence

- completion
- repeated watch
- meaningful watchlist action
- repeated recommendation engagement

### Weak evidence

- click
- detail view
- dwell time
- scroll

### No preference evidence

- Not seen
- Skip on an unseen movie
- lack of interaction without known exposure

This distinction is fundamental to the recommendation system.

---

# 9. V1 Recommendation Algorithm Decision

## V1 = Popularity + Content-Based Filtering

The first recommendation engine will be deliberately simple and inspectable.

### Candidate sources

```text
Global popularity
Segmented popularity
Content similarity
Onboarding-selected movies
Recent user interests
Editorial/new releases
```

---

## Content representation

Use TF-IDF plus structured metadata.

A movie document can conceptually look like:

```text
genre:thriller
genre:science_fiction
director:...
cast:...
language:en
decade:2020s
keyword:artificial_intelligence
theme:surveillance
plot:...
```

Structured blocks should be scaled so a long synopsis does not overwhelm high-value categorical features.

---

## User profile

For V1:

```text
user_profile =
    weighted_sum(
        liked_movies
        + highly_rated_movies
        + onboarding_preferences
        + selected positive signals
    )
```

Apply event weights and time decay.

---

## Negative evidence

Maintain negative evidence separately.

Do not simply subtract every weak negative signal from the user vector.

Explicit dislikes can be used as:

- negative profile evidence
- exclusion rules
- ranking penalties

depending on the signal.

---

# 10. Recommendation Pipeline Decision

Every recommendation request follows this conceptual flow:

```text
1. Load user + session state
        ↓
2. Determine eligible catalog
        ↓
3. Generate candidates
        ↓
4. Union + deduplicate
        ↓
5. Apply hard filters
        ↓
6. Score candidates
        ↓
7. Diversify / re-rank
        ↓
8. Generate evidence-backed explanations
        ↓
9. Return recommendations
        ↓
10. Log the recommendation request + slate
```

---

# 11. Hard Filters Decision

Recommendation models must NEVER override hard product policies.

Examples:

```text
Region eligibility
Availability
Age suitability
Blocked movies
Already watched
Consent restrictions
Licensing restrictions
Contract restrictions
```

Important principle:

> **Retrieval is not policy.**

The model suggests candidates. Policy decides what is eligible.

---

# 12. Cold Start Decision

## Zero-history user

Use:

```text
Taste Discovery
+
diverse popularity
+
recognizable seed movies
```

---

## 1–5 interactions

Use:

```text
content similarity
+
explicit preferences
+
popularity stabilization
```

---

## Warm user

Use:

```text
content
+
collaborative filtering
+
long-term taste
+
short-term session intent
```

---

## New movie

Use:

```text
metadata/content
+
editorial placement
+
controlled exploration
```

until enough interaction data exists.

---

# 13. Diversity and Novelty Decision

Relevance alone is insufficient.

A recommendation shelf should not become:

```text
20 movies from one franchise
```

or:

```text
20 movies with nearly identical semantic embeddings
```

We will eventually use **MMR-style re-ranking**:

```text
MMR =
    relevance
    -
    redundancy
```

Additional controls:

- franchise caps
- director caps
- near-duplicate limits
- genre balancing
- freshness
- novelty
- catalog coverage

These should be introduced by V2 rather than making V1 unnecessarily complex.

---

# 14. Recommendation Explanations Decision

Every explanation must be grounded in actual recommendation evidence.

Good:

> “Because you liked Arrival — science-fiction and director match.”

Good:

> “You seem to enjoy slow-burn mysteries with a darker tone.”

Bad:

> “We know you'll love this.”

Bad:

> “This is objectively one of the best movies.”

The explanation system should use **reason IDs/features generated by the recommender**.

If an LLM is later used to phrase explanations, it may paraphrase validated reason IDs but must not invent reasons.

---

# 15. Natural-Language Search Decision

Natural-language discovery is part of the long-term product.

Example:

> “Give me something tense, funny, and set in space, but not too long.”

The LLM may convert this into validated structured intent:

```json
{
  "mood": ["tense", "funny"],
  "theme": ["space"],
  "runtime_max": null,
  "excluded": []
}
```

The actual recommendation pipeline remains conventional:

```text
Natural language
      ↓
Validated intent
      ↓
Lexical / semantic retrieval
      ↓
Structured filtering
      ↓
Ranking
      ↓
Diversification
```

The LLM must NOT:

- invent movie IDs
- bypass filters
- ignore availability
- become the sole ranking model

---

# 16. Movie Recommendation Maturity Roadmap

## Stage 1 — Phase-1 Movie MVP

### Build now

- React frontend
- FastAPI backend
- PostgreSQL
- authentication
- TMDB integration
- movie catalog
- movie detail pages
- search
- onboarding
- ratings
- likes/dislikes
- favourites
- watchlist
- watch history
- event logging
- popularity recommendations
- TF-IDF content recommendations
- seen-item suppression
- basic diversity caps
- evidence-backed explanations

### ML

```text
TF-IDF
+
structured features
+
cosine similarity
+
weighted user profile
```

### Goal

Get a complete usable product and establish real user interaction data.

---

# V2 — Learning from Users

Add:

- complete event instrumentation
- impression logging
- item-item similarity
- implicit ALS or BPR
- profile caching
- MMR
- freshness
- popularity concentration monitoring
- stronger recommendation analytics

Recommendation:

```text
Content candidates
        +
Collaborative candidates
        +
Popularity candidates
        ↓
Union
        ↓
Filter
        ↓
Rank
        ↓
MMR
```

---

# V3 — Intelligent Hybrid System

Add:

- learned ranking
- LightGBM/LambdaMART or logistic ranker
- dense embeddings
- semantic retrieval
- natural-language discovery
- hybrid lexical + semantic retrieval
- better long-term/short-term fusion
- richer recommendation explanations

At this point:

```text
Content
+
Collaborative
+
Context
+
Semantic
+
Popularity
+
User state
        ↓
Learned Ranker
        ↓
Diversification
```

---

# V4 — Scale and Exploration

Only if measurements justify it:

- ANN/vector indexing
- HNSW / IVF
- online feature stores
- streaming features
- canary deployments
- advanced A/B infrastructure
- contextual bandits
- bounded exploration
- possibly two-tower retrieval

Do NOT add these simply because they are technologically impressive.

---

# 17. Things We Explicitly Do NOT Build Yet

These are intentionally deferred.

### Not V1

- deep neural recommender
- two-tower model
- contextual bandit
- reinforcement learning
- large-scale ANN
- Feast
- Kafka/streaming architecture
- microservices
- Kubernetes
- complex feature store
- LLM-based ranking
- huge taxonomy
- thousands of manually curated tags

### Reason

The research favors a system that is:

- inspectable
- measurable
- explainable
- computationally modest
- easy to debug
- capable of evolving without a rewrite

---

# 18. Event Schema Decision

Use an append-only recommendation event model.

Conceptually:

```text
recommendation_event(
    event_id,
    anonymized_user_id,
    session_id,
    movie_id,
    event_type,
    value,
    watch_seconds,
    completion_fraction,
    timestamp,
    request_id,
    surface,
    position,
    was_visible,
    model_version,
    policy_version,
    candidate_set_id,
    propensity,
    locale,
    device,
    consent_flags,
    availability_snapshot_id
)
```

Important event types:

```text
impression
click
play_start
completion
watchlist_add
rating
like
dislike
skip
early_exit
search
```

Raw events remain immutable.

Training labels are derived through versioned transformations.

---

# 19. Evaluation Decision

Do not evaluate only:

> “Did the model predict ratings?”

Evaluate the whole product.

## Recommendation metrics

- Recall@K
- HitRate@K
- Precision@K
- MRR
- MAP
- NDCG@K

## Product/recommendation health

- catalog coverage
- user coverage
- novelty
- intra-list diversity
- genre calibration
- repetition
- popularity concentration
- serendipity

## Cold-start slices

Evaluate separately for:

```text
0 history
1–2 interactions
3–5 interactions
6–20 interactions
extensive history
```

Also slice by:

- new vs established movies
- language
- region
- metadata completeness
- popularity bucket

---

# 20. Evaluation Methodology Decision

Use **chronological evaluation**, not random train/test splitting.

At each prediction point:

- use only data available at that time
- freeze catalog eligibility
- freeze metadata
- freeze features
- fit TF-IDF only on earlier data
- fit embeddings only on earlier data where appropriate
- fit collaborative models only on earlier data

This prevents future-information leakage.

---

# 21. Product Success Metrics

The first onboarding experiment should measure:

- time to first satisfying recommendation
- number of interactions before first save/play
- question answer rate
- skip rate
- movie recognition rate
- onboarding abandonment
- perceived effort
- perceived enjoyment
- recommendation quality after 1/3/7 days
- diversity
- novelty
- repeated-question rate
- recommendation stability
- confidence calibration
- confirmation of onboarding signals through later behavior

The onboarding policy should be evaluated against:

1. fixed popular-title ratings
2. fixed diverse-title ratings
3. adaptive hybrid onboarding

---

# 22. Security and Privacy Decision

User data is first-party data.

Keep it separate from vendor metadata.

The system should support:

- minimal retention
- deletion
- consent
- anonymized user IDs for event analytics where appropriate
- source provenance
- licensing metadata
- auditability

Never silently merge:

```text
TMDB rating
IMDb rating
Watchmode score
User rating
```

These are different signals from different sources.

---

# 23. Architecture Decision

The initial architecture should be:

```text
                    ┌──────────────────┐
                    │   React Client   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   FastAPI API    │
                    └────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
   ┌────────────┐     ┌──────────────┐   ┌──────────────┐
   │ PostgreSQL │     │ Recommendation│   │ Movie Source │
   │            │     │    Engine     │   │    APIs      │
   └────────────┘     └──────┬───────┘   └──────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
             Content Models       Popularity/CF
             TF-IDF / embeddings   later versions
```

The recommendation engine should remain modular enough that the V1 scorer can later be replaced by a hybrid ranker without rewriting the API.

---

# 24. Repository Structure Decision

Initial structure:

```text
veya-luma/
│
├── frontend/
│   ├── src/
│   └── ...
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── recommender/
│   │   ├── events/
│   │   └── main.py
│   │
│   ├── tests/
│   └── alembic/
│
├── ml/
│   ├── data/
│   ├── features/
│   ├── training/
│   ├── evaluation/
│   └── artifacts/
│
├── docs/
│   ├── decision.md
│   ├── taxonomy.md
│   ├── architecture.md
│   └── api.md
│
└── README.md
```

The exact structure can change as implementation begins, but the separation between product/backend code and recommendation experimentation should remain.

---

# 25. Final Technical Decision

## Veya Luma Phase 1

```text
                         VEYA LUMA
                             │
                   Shared foundations
                             │
              ┌──────────────┴──────────────┐
              │                             │
         React + TS                    FastAPI
              │                             │
              └──────────────┬──────────────┘
                             │
                         PostgreSQL
                             │
                       Movie domain
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   Movie Catalog        Taste System       Recommendation
        │                    │                    │
     TMDB              Taste Discovery      Content + Popularity
                           │                    │
                     User Feedback        Future V2/V3 models
```

Core stack:

```text
React
+
TypeScript
+
FastAPI
+
PostgreSQL
+
SQLAlchemy
+
Alembic
+
Python ML stack
+
TMDB
+
Adaptive Taste Discovery
+
TF-IDF Content Recommendation
+
Popularity Fallback
```

Then the **movie recommender** evolves:

```text
Stage 1 → Content + Popularity

Stage 2 → Collaborative Filtering + MMR

Stage 3 → Learned Hybrid + Semantic Retrieval

Stage 4 → Measured Scale + Bounded Exploration
```

The important distinction is:

> **These stages evolve the movie recommendation engine. They do not define the entire future Veya Luma product.**

The platform foundations should remain reusable for future Veya Luma discovery categories.

---

# 26. Final Product Philosophy

The project should follow these principles:

### 1. Learn, don't interrogate

The user should feel like they are discovering movies, not filling out a survey.

### 2. Recommend early

Do not wait until the system has a perfect profile.

### 3. Treat uncertainty explicitly

The system should know when it does not know.

### 4. Not seen ≠ disliked

Never convert missing knowledge into negative preference.

### 5. Relevance is not enough

Recommendations should also consider diversity, novelty, repetition, and current intent.

### 6. Policy beats prediction

Availability, licensing, age suitability, region, and blocked items are hard constraints.

### 7. Explanations must be grounded

Never invent a reason for a recommendation.

### 8. Start simple

A transparent model with good data and instrumentation is more valuable than an impressive model without reliable signals.

### 9. Measure before adding complexity

Every advanced component must solve a measured problem.

### 10. Build for replacement

V1 should be replaceable by V2/V3 without redesigning the entire application.

### 11. Movies are Phase 1, not the final product

Build deeply around movies now, while keeping the stable Veya Luma foundations reusable.

Do not let hypothetical future categories complicate the current movie experience.

### 12. Expand only after validation

A new Veya Luma discovery category should be introduced because the existing product and platform justify it, not simply because the architecture can technically support it.

---

# 27. Immediate Next Steps

This document is the **project-level source of truth**.

The four research documents remain supporting evidence.

The Stitch frontend is the **Phase-1 product reference**.

The project should now move from research into implementation.

## Phase-1 implementation sequence

```text
1. Freeze Phase-1 product scope
        ↓
2. Finalize movie taxonomy
        ↓
3. Finalize database schema
        ↓
4. Set up FastAPI + PostgreSQL
        ↓
5. Set up React + TypeScript frontend
        ↓
6. Integrate TMDB
        ↓
7. Build movie catalog + movie details
        ↓
8. Build search + intent search foundation
        ↓
9. Build authentication + user state
        ↓
10. Build Taste Discovery
        ↓
11. Build taste/profile state
        ↓
12. Build likes/dislikes/ratings
        ↓
13. Build favourites/watchlist/history
        ↓
14. Implement event logging
        ↓
15. Implement V1 movie recommender
        ↓
16. Connect recommendations to Stitch UI
        ↓
17. Add evidence-backed explanations
        ↓
18. Evaluate Phase-1 system
        ↓
19. Improve movie personalization
```

## Do not start the next Veya Luma vertical yet

Before expanding beyond movies, validate that:

- Taste Discovery obtains useful signals
- recommendations improve with feedback
- search is useful
- recommendation explanations are understandable
- users save/watch recommended movies
- event logging captures meaningful signals
- the movie recommendation engine can be measured
- the platform foundations can support another domain without major rewrites

Only then should another discovery category become a formal product decision.

## Relationship between project documents

```text
Research documents
        ↓
decision.md
        ↓
architecture.md
        ↓
Database / API decisions
        ↓
Implementation
        ↓
Experiments + measurements
        ↓
Updated decisions
```

The research documents answer:

> **What did we learn?**

`decision.md` answers:

> **What are we choosing?**

`architecture.md` will answer:

> **How are we structuring it?**

The Stitch frontend answers:

> **What should the Phase-1 experience look and feel like?**

# 28. Research Sources Used

This decision record consolidates the following project research documents:

1. **Movie Taxonomy for a Personalized Recommendation Engine**
2. **Taste Discovery: an adaptive onboarding system for movie discovery**
3. **Production-oriented movie recommendation MVP**
4. **Movie Data Source Strategy for a Personalized Discovery App**

The detailed evidence, citations, experiments, alternatives, and provider-specific research remain in those documents.

This file is intentionally different: **research documents explain what was discovered; this file records what the project has decided to do.**

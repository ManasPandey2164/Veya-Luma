# Veya Luma — Implementation Roadmap

> **Phase:** 1 — Personalized Movie Discovery  
> **Approach:** Product → Data → Personalization → Recommendation → Evaluation → Production  
> **Principle:** Ship a complete, measurable movie product before adding advanced ML.

---

# 0. How to Use This Roadmap

This roadmap is the implementation sequence for `PROJECT.md`.

Use the files as:

```text
DECISION.md
    = what has been decided and why

PROJECT.md
    = what the product/system must be

ROADMAP.md
    = what to implement, in what order

DESIGN.md
    = how the product should look and behave

research/*.md
    = supporting research and rationale
```

Do not jump directly to advanced ML.

A later stage should only begin when the previous stage has a working, testable output.

---

# 1. Overall Development Path

```text
PHASE 0  — Project Foundation
      ↓
PHASE 1  — Product Shell + Design System
      ↓
PHASE 2  — Movie Data Foundation
      ↓
PHASE 3  — Backend + Database
      ↓
PHASE 4  — Movie Discovery Experience
      ↓
PHASE 5  — Authentication + User State
      ↓
PHASE 6  — Taste Discovery
      ↓
PHASE 7  — V1 Recommendation Engine
      ↓
PHASE 8  — Feedback + Event Intelligence
      ↓
PHASE 9  — Evaluation + Tuning
      ↓
PHASE 10 — Production Hardening
      ↓
PHASE 11 — Post-V1 Recommendation Evolution
```

The exact calendar duration is flexible. The dependency order is not.

---

# 2. Phase 0 — Project Foundation

## Goal

Create the repository and development foundation before building product features.

## Tasks

### Repository

```text
frontend/
backend/
ml/
docs/
```

### Tooling

Set up:

- Git;
- environment variables;
- `.env.example`;
- formatting;
- linting;
- testing;
- pre-commit checks where useful;
- development scripts.

### Documentation

Keep:

```text
DECISION.md
PROJECT.md
ROADMAP.md
DESIGN.md
```

as active project documents.

## Exit criteria

- repository initializes cleanly;
- frontend starts;
- backend starts;
- PostgreSQL connection works;
- tests can run;
- environment setup is documented.

---

# 3. Phase 1 — Product Shell + Design System

## Goal

Turn the Stitch reference into a real React application shell without connecting recommendation logic yet.

## Build

### Global

- navigation;
- routing;
- typography;
- colors;
- surfaces;
- cards;
- buttons;
- modals;
- loading states;
- empty states;
- error states.

### Core pages

```text
Landing / Discovery
Search
Movie Details
Taste Discovery
Profile
Preferences
Library
Watchlist
History
Favourites
Account Settings
```

### Signature interactions

- cinematic movie cards;
- movie duel;
- recommendation sections;
- taste visualization;
- library grids;
- natural-language search entry.

## Important rule

Do not rebuild the Stitch design from scratch conceptually.

Use Stitch as the **Phase-1 product reference**, then convert it into maintainable React components.

## Exit criteria

- desktop product shell is visually coherent;
- all core routes exist;
- components are reusable;
- responsive behavior is defined even if desktop is the primary target;
- accessibility basics are implemented.

---

# 4. Phase 2 — Movie Data Foundation

## Goal

Create a reliable movie catalog that recommendation logic can trust.

## Primary source

```text
TMDB
```

Optional enrichment:

```text
Wikidata
```

## Build ingestion adapters

```text
Source
  ↓
Raw observation
  ↓
Normalization
  ↓
Identity resolution
  ↓
Canonical movie
  ↓
Derived features
```

## Import first

Start with:

- movie IDs;
- titles;
- aliases;
- release dates;
- runtime;
- original language;
- synopsis;
- genres;
- credits;
- collections/franchises;
- basic popularity fields;
- artwork references where permitted.

## Then taxonomy

Create:

```text
genre
theme
mood
style
audience
sensitivity
```

Do not attempt to perfectly tag the entire world of cinema before the first product works.

## Data quality checks

Validate:

- duplicate movies;
- duplicate people;
- invalid dates;
- invalid runtimes;
- missing IDs;
- broken relationships;
- inconsistent languages;
- missing titles;
- malformed source data.

## Exit criteria

A clean local catalog can support:

```text
search
movie detail
similarity
recommendation
user interaction
```

---

# 5. Phase 3 — Backend + Database

## Goal

Build the application API and persistent domain model.

## Core stack

```text
FastAPI
SQLAlchemy
Alembic
PostgreSQL
Pydantic
```

## Core modules

```text
app/
├── api/
├── auth/
├── db/
├── models/
├── schemas/
├── services/
├── recommender/
├── events/
└── main.py
```

## Database order

Build in this dependency order:

### A. Identity

```text
users
accounts/auth
sessions/tokens
```

### B. Movie domain

```text
movies
aliases
people
credits
```

### C. Taxonomy

```text
taxonomy_nodes
taxonomy_aliases
taxonomy_rules
movie_tags
tag_evidence
```

### D. Relationships

```text
franchises
movie_franchises
movie_relations
languages
releases
sensitivity
```

### E. User preference

```text
user_movie_events
user_tag_preferences
user_person_preferences
```

### F. Recommendation traceability

```text
recommendation_requests
recommendation_events
candidate_sets
model_versions
policy_versions
```

## Exit criteria

- migrations are reproducible;
- database constraints work;
- CRUD/API tests pass;
- movie data can be queried;
- user interactions can be persisted.

---

# 6. Phase 4 — Movie Discovery Experience

## Goal

Make the application useful even before personalization is fully implemented.

## Build

### Search

Support:

- title search;
- aliases;
- typo tolerance where useful;
- filters;
- basic natural-language search foundation.

### Movie detail

Show:

- title;
- artwork;
- synopsis;
- release information;
- runtime;
- genres;
- relevant themes/moods;
- cast/crew;
- franchise information;
- user actions.

### Discovery

Create sections such as:

```text
Popular Now
Trending
Because You Explored...
New Discoveries
Similar To...
```

At this stage, some sections can be popularity- or metadata-driven.

## Exit criteria

A user can browse and search a meaningful movie catalog without needing a recommendation profile.

---

# 7. Phase 5 — Authentication + User State

## Goal

Make personalization persistent.

## Build

- registration;
- login;
- logout;
- session/token management;
- profile;
- account settings;
- deletion;
- preference controls.

## User movie actions

Implement:

```text
like
dislike
rating
favourite
watchlist
watched
```

Then add:

```text
skip
play_start
completion
early_exit
```

where applicable.

## Important semantics

Do not treat:

```text
not watched
```

as:

```text
disliked
```

## Exit criteria

A user's actions survive a new session and can be retrieved through the API.

---

# 8. Phase 6 — Taste Discovery

## Goal

Create the first real personalization loop.

## Flow

```text
Expectation
    ↓
Seen Movie Picker
    ↓
Quick Rating
    ↓
Movie Duel
    ↓
First Recommendations
    ↓
Adaptive Finish
```

## Implementation order

### Step 1 — Seen Movie Picker

Create a diverse candidate pool.

Avoid showing only the most popular English-language movies.

### Step 2 — Quick Rating

Use low-friction choices:

```text
Love
Like
Okay
Dislike
```

### Step 3 — Duel

Choose pairs that are:

- recognizable;
- sufficiently different;
- informative;
- not repetitive.

### Step 4 — Initial profile

Construct:

```text
user_taste_state
```

from:

- positive movie evidence;
- negative movie evidence;
- taxonomy features;
- creator features;
- language;
- era/runtime signals.

### Step 5 — First recommendation

Do not wait for perfect confidence.

### Step 6 — Adaptive continuation

Continue only when another question has useful expected information.

## Exit criteria

A new user can complete Taste Discovery and receive meaningful personalized recommendations.

---

# 9. Phase 7 — V1 Recommendation Engine

## Goal

Ship the first transparent recommendation system.

## Architecture

```text
Request
  ↓
Hard filters
  ↓
Candidate generation
  ↓
Content scoring
  ↓
Popularity fallback
  ↓
Re-ranking
  ↓
Explanation
  ↓
Response
```

## Candidate generation

Implement in this order:

### Candidate source 1

```text
Popularity
```

### Candidate source 2

```text
Onboarding selections
```

### Candidate source 3

```text
Content similarity
```

### Candidate source 4

```text
Recent user interests
```

### Candidate source 5

```text
New/editorial movies
```

## Content model

Build:

```text
TF-IDF
+
structured metadata
+
cosine similarity
```

Use fields such as:

```text
genre
theme
mood
style
director
cast
language
era
runtime
synopsis
keywords
```

Scale structured fields intentionally.

## User profile

Build a weighted profile from:

```text
onboarding
likes
high ratings
favourites
positive behavior
```

with:

```text
time decay
confidence weighting
event weighting
```

## Negative profile

Maintain negative evidence separately.

Use explicit dislike/hide as stronger negative signals than weak behavioral signals.

## Exit criteria

The system produces recommendations for:

```text
zero-history users
light-history users
warm users
```

and falls back gracefully when personalization is weak.

---

# 10. Phase 8 — Feedback + Event Intelligence

## Goal

Turn usage into high-quality learning data.

## Event model

Log:

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

Include:

```text
request_id
surface
position
model_version
policy_version
candidate_set_id
timestamp
session
context
```

## Recommendation trace

For every recommendation request, retain enough information to answer:

```text
Why was this movie eligible?
Why was it scored?
Why was it ranked here?
Which model version produced it?
Which policy version filtered it?
Which user signals influenced it?
```

This is essential for debugging and future ML.

## Exit criteria

A recommendation event can be reconstructed and analyzed end-to-end.

---

# 11. Phase 9 — Diversity, Novelty, and Explanations

## Goal

Improve the quality of recommendation lists, not merely individual relevance scores.

## Diversity

Implement:

- genre caps;
- franchise caps;
- creator repetition controls;
- language/era variety where appropriate.

## Novelty

Penalize overexposure to:

- repeatedly shown movies;
- overly popular items;
- recently rejected items.

## Serendipity

Reserve a controlled portion of the list for:

```text
relevant but less obvious
```

recommendations.

## Explanations

Generate only from grounded evidence.

Examples:

```text
Because you liked X
Similar to Y
You often enjoy Z
Based on your interest in...
```

## Exit criteria

Recommendation lists feel varied rather than like copies of the same result.

---

# 12. Phase 10 — Evaluation

## Goal

Determine whether the system actually improves discovery.

## Offline metrics

Implement:

```text
Recall@K
HitRate@K
Precision@K
MRR
MAP
NDCG@K
```

## Product metrics

Track:

```text
time to first useful recommendation
save rate
play rate
completion
early exit
onboarding completion
onboarding abandonment
recommendation repetition
catalog coverage
novelty
diversity
```

## Cold-start evaluation

Slice:

```text
0 history
1–2 interactions
3–5 interactions
6–20 interactions
extensive history
```

## Data slicing

Also evaluate:

```text
new vs established movies
language
region
metadata completeness
popularity bucket
```

## Evaluation methodology

Use chronological evaluation.

Do not randomly mix future interactions into training data.

## Exit criteria

There is a repeatable evaluation process that can compare recommendation versions.

---

# 13. Phase 11 — Production Hardening

## Goal

Make the MVP reliable enough for real users.

## Backend

Implement:

- validation;
- rate limiting;
- authentication hardening;
- structured logging;
- error handling;
- health checks;
- database indexes;
- connection management.

## Frontend

Implement:

- loading states;
- retry states;
- empty states;
- error states;
- accessibility;
- performance optimization;
- image optimization.

## Data

Implement:

- ingestion jobs;
- retry logic;
- source provenance;
- refresh timestamps;
- data-quality checks;
- cache strategy.

## Recommendation

Track:

```text
model_version
policy_version
taxonomy_version
catalog_version
```

## Privacy

Implement:

- user data deletion;
- minimal retention;
- consent handling;
- secure secrets;
- appropriate analytics anonymization.

## Exit criteria

The application can be deployed and operated without manual intervention for normal flows.

---

# 14. Phase 12 — Production MVP Release Gate

Before calling Phase 1 complete, verify:

## Product

- [ ] account creation works;
- [ ] login works;
- [ ] search works;
- [ ] movie details work;
- [ ] Taste Discovery works;
- [ ] recommendations work;
- [ ] likes/dislikes work;
- [ ] ratings work;
- [ ] favourites work;
- [ ] watchlist works;
- [ ] history works.

## Recommendation

- [ ] cold-start fallback works;
- [ ] content-based recommendations work;
- [ ] popularity fallback works;
- [ ] watched suppression works;
- [ ] hard filters work;
- [ ] diversity controls work;
- [ ] explanations are grounded.

## Data

- [ ] catalog ingestion works;
- [ ] taxonomy exists;
- [ ] provenance is retained;
- [ ] source refresh is traceable;
- [ ] duplicate resolution works.

## Engineering

- [ ] migrations work from a clean database;
- [ ] tests pass;
- [ ] frontend build passes;
- [ ] backend build/deploy passes;
- [ ] secrets are not committed;
- [ ] logs and errors are observable.

## Measurement

- [ ] recommendation events are logged;
- [ ] model versions are tracked;
- [ ] recommendation metrics can be calculated;
- [ ] onboarding metrics can be calculated.

---

# 15. Post-V1 Recommendation Evolution

Do not build these before V1 has real interaction data.

---

## V2 — Collaborative Retrieval

### Trigger

Enough real user-movie interaction data exists.

### Build

```text
implicit feedback
+
collaborative retrieval
+
matrix factorization or equivalent retrieval
+
MMR re-ranking
```

### Candidate pipeline

```text
Content candidates
+
Collaborative candidates
+
Popularity candidates
+
Recent-interest candidates
        ↓
Unified candidate pool
        ↓
Re-ranking
```

### Goal

Learn from:

```text
users with similar behavior
```

without replacing content understanding.

---

# 16. V3 — Learned Hybrid Recommendation

## Trigger

V2 provides enough behavioral data and evaluation infrastructure.

## Build

```text
content signals
+
collaborative signals
+
semantic embeddings
+
context
+
user state
        ↓
learned ranking model
```

Possible components:

- embedding retrieval;
- vector search;
- learned ranker;
- contextual features;
- stronger sequence features.

## Goal

Move from manually weighted scoring toward a learned hybrid system.

---

# 17. V4 — Exploration + Scale

## Trigger

The system has:

- strong evaluation;
- sufficient traffic/data;
- stable instrumentation;
- measurable recommendation quality.

## Build

- bounded exploration;
- exploration/exploitation policies;
- large-scale retrieval;
- advanced experimentation;
- model monitoring;
- automated retraining;
- feature pipelines;
- more efficient serving.

Exploration must remain bounded and measurable.

---

# 18. Natural-Language Discovery Roadmap

Natural-language discovery can be introduced progressively.

## V1

Validated intent parser:

```text
text
 ↓
structured filters/preferences
 ↓
existing retrieval/ranking
```

## V2

Add semantic retrieval:

```text
text embedding
 ↓
candidate retrieval
 ↓
structured filtering
```

## V3

Add contextual intent:

```text
current request
+
long-term taste
+
recent behavior
+
context
```

Never make the LLM the sole source of truth for movie eligibility or ranking.

---

# 19. Data Expansion Roadmap

## First

Build a reliable core catalog.

## Then

Add:

```text
taxonomy
credits
relationships
languages
release markets
sensitivity
```

## Then

Improve:

```text
tag confidence
editorial curation
identity resolution
metadata freshness
```

## Later

Add:

```text
semantic embeddings
review-derived features
advanced behavioral features
```

Do not build every possible metadata field before the recommendation loop works.

---

# 20. Taxonomy Evolution Roadmap

When adding a new taxonomy concept:

```text
1. Define concept
2. Define scope
3. Define parent
4. Define aliases
5. Define evidence sources
6. Define tagging rules
7. Define confidence threshold
8. Test catalog support
9. Evaluate recommendation impact
10. Version taxonomy
```

Avoid tag explosion.

A concept should exist because it improves:

- discovery;
- filtering;
- personalization;
- explanation;
- evaluation.

---

# 21. Recommendation Experiment Loop

Every meaningful recommender change follows:

```text
Hypothesis
   ↓
Implementation
   ↓
Offline evaluation
   ↓
Controlled test
   ↓
Product metrics
   ↓
Decision
   ↓
Version
   ↓
Document
```

Never add a model merely because it is more advanced.

The question is:

> **What measurable problem does this solve?**

---

# 22. Development Priority Rules

When choosing what to build next, use this order:

```text
1. Product correctness
2. Data correctness
3. User experience
4. Instrumentation
5. Baseline recommendation quality
6. Evaluation
7. Performance
8. Recommendation sophistication
```

A sophisticated model built on incorrect movie data is not progress.

---

# 23. What NOT to Do

Do not:

- build microservices early;
- build a universal multi-domain recommendation framework;
- train deep learning models before collecting reliable data;
- use an LLM as the entire recommendation engine;
- scrape sites without permission;
- treat popularity as personalization;
- treat unseen movies as dislikes;
- hard-code hundreds of arbitrary tags;
- make every taxonomy concept a ranking feature;
- ignore provenance;
- ship recommendations without event logging;
- evaluate only aggregate metrics;
- optimize solely for CTR;
- add complexity without an evaluation plan.

---

# 24. Definition of Phase Completion

The movie MVP is considered validated when:

```text
A new user
   ↓
enters Veya Luma
   ↓
completes lightweight Taste Discovery
   ↓
gets recommendations
   ↓
interacts with recommendations
   ↓
returns later
   ↓
receives improved recommendations
```

and the team can quantitatively observe whether:

```text
personalization improves
recommendation quality improves
diversity remains healthy
novelty remains healthy
repetition is controlled
users engage with recommendations
```

---

# 25. The Final Roadmap

```text
┌───────────────────────────────────────────────┐
│ 0. FOUNDATION                                 │
│ Repo • tooling • docs • environments          │
└───────────────────────┬───────────────────────┘
                        ↓
┌───────────────────────────────────────────────┐
│ 1. PRODUCT SHELL                              │
│ React • TypeScript • Stitch design            │
└───────────────────────┬───────────────────────┘
                        ↓
┌───────────────────────────────────────────────┐
│ 2. MOVIE DATA                                 │
│ TMDB • normalization • taxonomy • provenance  │
└───────────────────────┬───────────────────────┘
                        ↓
┌───────────────────────────────────────────────┐
│ 3. BACKEND                                    │
│ FastAPI • PostgreSQL • SQLAlchemy • Alembic   │
└───────────────────────┬───────────────────────┘
                        ↓
┌───────────────────────────────────────────────┐
│ 4. DISCOVERY                                  │
│ Search • movie pages • browsing               │
└───────────────────────┬───────────────────────┘
                        ↓
┌───────────────────────────────────────────────┐
│ 5. USER STATE                                 │
│ Auth • likes • ratings • library • history     │
└───────────────────────┬───────────────────────┘
                        ↓
┌───────────────────────────────────────────────┐
│ 6. TASTE DISCOVERY                            │
│ Seen movies • ratings • duels • adaptation    │
└───────────────────────┬───────────────────────┘
                        ↓
┌───────────────────────────────────────────────┐
│ 7. V1 RECOMMENDER                             │
│ Popularity • TF-IDF • metadata • profile      │
└───────────────────────┬───────────────────────┘
                        ↓
┌───────────────────────────────────────────────┐
│ 8. FEEDBACK + EVENTS                          │
│ Impressions • actions • recommendation trace  │
└───────────────────────┬───────────────────────┘
                        ↓
┌───────────────────────────────────────────────┐
│ 9. QUALITY                                    │
│ Diversity • novelty • explanations            │
└───────────────────────┬───────────────────────┘
                        ↓
┌───────────────────────────────────────────────┐
│ 10. EVALUATION + PRODUCTION                   │
│ Metrics • tests • security • deployment       │
└───────────────────────┬───────────────────────┘
                        ↓
              ┌───────────────────┐
              │ V1 MOVIE MVP      │
              │ VALIDATED         │
              └─────────┬─────────┘
                        ↓
        ┌───────────────┴────────────────┐
        ↓                                ↓
   V2 Collaborative                 V3 Hybrid
   Retrieval                        + Semantic
        ↓                                ↓
        └───────────────┬────────────────┘
                        ↓
                 V4 Exploration
                    + Scale
```

---

# 26. The Rule for Moving Forward

The project should now move from **research mode** into **implementation mode**.

Do not rewrite the research repeatedly.

Instead:

```text
Research
   ↓
Decision
   ↓
Project specification
   ↓
Roadmap
   ↓
Implementation
   ↓
Measurement
   ↓
New decision
```

If implementation reveals a problem with an existing decision:

```text
Implementation finding
        ↓
Update DECISION.md
        ↓
Update PROJECT.md if scope changes
        ↓
Update ROADMAP.md
        ↓
Implement
```

This keeps Veya Luma coherent as the project grows.

---

# 27. Immediate Next Action

The next engineering milestone is:

> **Complete Phase 0 and begin Phase 1: convert the existing Stitch Veya Luma frontend reference into the React/TypeScript application shell while keeping the Phase-1 movie scope intact.**

Do not begin advanced recommendation ML yet.

The first target is a functioning product shell connected to a clean technical foundation.

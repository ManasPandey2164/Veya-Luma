# Veya Luma — Project Specification

> **Project:** Veya Luma  
> **Phase:** 1 — Personalized Movie Discovery  
> **Status:** Ready for implementation  
> **Primary goal:** Prove the Veya Luma personalized-discovery loop through movies.

---

## 1. Product Definition

Veya Luma is a **personalized discovery platform**.

It is not intended to remain permanently movie-only. However, Phase 1 deliberately focuses on **movies as the first discovery vertical** so the core product loop can be built, measured, and validated before additional domains are introduced.

### Phase-1 loop

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

The central product principle is:

> **Learn the user's taste through useful interactions instead of making the user complete a long questionnaire.**

Movies are the first domain. Future domains are intentionally not defined yet.

---

# 2. Phase-1 Product Goal

Build a production-oriented movie discovery application that can:

- onboard a new user quickly;
- learn useful taste signals from very little history;
- recommend movies using transparent, explainable logic;
- improve recommendations from user feedback;
- support explicit and implicit preference signals;
- support natural-language discovery;
- provide diverse and non-repetitive recommendations;
- distinguish unknown preferences from negative preferences;
- provide grounded recommendation explanations;
- collect high-quality interaction data for future recommendation models.

The first version should optimize for **a complete, measurable product**, not maximum model complexity.

---

# 3. Product Scope

## 3.1 In scope for Phase 1

### Discovery

- personalized home/discovery feed;
- movie search;
- natural-language discovery foundation;
- movie detail pages;
- recommendation sections;
- similar/recommended movies;
- onboarding recommendations;
- new/popular discovery.

### Taste Discovery

- seen-movie recognition;
- quick ratings;
- movie duel/pairwise preference;
- adaptive follow-up questions;
- early recommendation presentation;
- graceful completion when enough information has been collected.

### User feedback

- like;
- dislike;
- rating;
- favourite;
- watchlist;
- watched/history;
- skip;
- completion/early exit where available.

### Personalization

- user taste profile;
- positive preference evidence;
- negative preference evidence;
- time-decayed preferences;
- genre/theme/mood/style preferences;
- people/creator preferences;
- language preferences;
- runtime/era preferences;
- recommendation constraints.

### Recommendation

- popularity candidates;
- segmented popularity;
- onboarding candidates;
- content-similarity candidates;
- recent-interest candidates;
- TF-IDF content recommendation;
- structured metadata features;
- user-profile scoring;
- seen-item suppression;
- basic diversity;
- novelty/repetition controls;
- grounded explanations.

### Platform

- authentication;
- account/profile;
- privacy controls;
- PostgreSQL persistence;
- event logging;
- API;
- testing;
- observability;
- production deployment foundation.

---

# 4. Explicitly Out of Scope for V1

Do not allow these to delay the first usable movie product:

- deep collaborative filtering;
- matrix factorization as a production dependency;
- learned ranking models;
- complex reinforcement learning;
- large-scale vector infrastructure;
- LLM-only recommendations;
- autonomous LLM ranking;
- real-time streaming availability as a core dependency;
- large-scale multi-domain architecture;
- complex social features;
- unnecessary microservices;
- premature distributed infrastructure.

These belong to later maturity stages only when data and evaluation justify them.

---

# 5. Product Architecture Principle

Use:

```text
Reusable Veya Luma foundations
+
Explicit Movie domain
```

Reusable foundations include:

- users;
- authentication;
- preferences;
- feedback;
- events;
- recommendation requests;
- candidate generation interfaces;
- ranking interfaces;
- explanations;
- search intent;
- account/privacy.

Do **not** create a universal abstraction for every future content category before it is needed.

The movie domain should remain explicit and understandable.

---

# 6. Target User Experience

The application should feel like a **cinematic discovery product**, not a recommendation dashboard.

The Stitch frontend is the Phase-1 visual/product reference.

The existing Veya Luma design system should be preserved:

- cinematic;
- premium;
- dark/obsidian visual language;
- atmospheric lighting;
- glass/chrome navigation;
- strong typography;
- immersive movie cards;
- cinematic duel interaction;
- taste visualization;
- library/history experiences;
- deliberate motion and micro-interactions.

The design must remain accessible and usable rather than sacrificing clarity for visual effects.

---

# 7. Technology Stack

## Frontend

```text
React
TypeScript
Vite
Tailwind CSS
```

Use the Stitch design as the visual/product reference while implementing a maintainable React component system.

## Backend

```text
Python
FastAPI
Pydantic
SQLAlchemy
Alembic
```

## Database

```text
PostgreSQL
```

PostgreSQL is the primary source of application truth.

## Recommendation / ML

```text
Python
NumPy
Pandas
scikit-learn
TF-IDF
cosine similarity
```

Later:

```text
embeddings
vector retrieval
collaborative filtering
learned ranking
hybrid models
```

## External movie data

Primary MVP source:

```text
TMDB
```

Optional enrichment:

```text
Wikidata
```

Artwork should only be used when the individual asset's rights permit the intended use.

Availability is optional in V1 and must remain country- and time-specific if implemented.

---

# 8. Data / Licensing Rule

Technical accessibility does not mean production licensing.

Do not build a production foundation around scraped:

- Letterboxd data;
- JustWatch data;
- streaming-service pages;
- arbitrary image URLs;
- IMDb datasets for commercial use without appropriate rights;
- OMDb as an unrestricted mirror;
- Trakt data without required permission.

Before commercial/public monetized deployment, review the current terms and licensing requirements for every external data provider.

---

# 9. Movie Domain Model

The movie catalog must distinguish **canonical facts**, **source observations**, **derived features**, and **user preferences**.

Core entities:

```text
Movie
MovieAlias
Person
MoviePersonCredit

TaxonomyNode
TaxonomyAlias
TaxonomyRule
MovieTag
MovieTagEvidence

MetadataSource
SourceEntityMap

MovieLanguage
MovieRelease
MovieSensitivity

Franchise
MovieFranchise
MovieRelation

UserMovieEvent
UserTagPreference
UserPersonPreference
```

---

# 10. Movie Taxonomy

The taxonomy is a controlled recommendation vocabulary, not a flat list of tags.

Primary axes:

```text
Genre
Theme
Mood
Style
Audience
Sensitivity
```

### Genre

Use hierarchical genre concepts rather than an uncontrolled flat list.

### Theme

Represent recurring ideas and subject matter.

Examples:

```text
identity
surveillance
ambition
friendship
grief
corruption
coming_of_age
artificial_intelligence
```

### Mood

Represent emotional viewing experience.

Examples:

```text
tense
hopeful
melancholic
whimsical
dark
comforting
energetic
meditative
```

### Style

Represent cinematic/formal characteristics.

Examples:

```text
nonlinear
slow_burn
visually_stylized
dialogue_driven
ensemble
minimalist
experimental
found_footage
```

### Audience / viewing preference

Represent suitability and viewing context separately from movie genre.

Examples:

```text
family_friendly
solo_viewing
couple_viewing
easy_watch
challenging_watch
rewatchable
discussion_friendly
```

### Sensitivity

Keep content sensitivity as a separate filtering/safety layer.

Examples:

```text
violence
gore
sexual_content
profanity
substance_use
self_harm
animal_harm
disturbing_imagery
flashing_lights
```

Sensitivity must include severity and confidence where possible.

---

# 11. Taxonomy Rules

Every taxonomy relationship should have evidence.

A movie tag should conceptually contain:

```text
movie_id
node_id
assertion
strength
confidence
evidence_count
source
updated_at
```

Important distinction:

```text
strength  = how strongly the concept describes the movie
confidence = how certain the system is that the concept applies
```

Do not confuse metadata confidence with user preference strength.

Also:

> **Not having a tag does not mean the movie does not contain that concept.**

Unknown is not negative.

---

# 12. Tagging Pipeline

Evidence may come from:

1. canonical provider metadata;
2. editorial curation;
3. normalized user-generated tags;
4. model extraction;
5. behavioral evidence.

Source observations should be retained.

Final tags should be generated from evidence rather than silently overwriting source data.

A practical conceptual confidence calculation is:

```text
confidence =
    calibrated(
        1 - Π(1 - source_reliability × evidence_confidence)
    )
```

Correlated evidence must not be counted as independent evidence.

Recommended initial interpretation:

```text
>= 0.85   high confidence
0.65–0.84 usable/medium confidence
0.50–0.64 weak evidence
< 0.50    generally exclude from strong recommendation features
```

These thresholds should be calibrated against an editorial validation set.

---

# 13. User Taste Representation

Use two complementary layers.

## Layer A — Latent preference state

Used for recommendation ranking.

It can contain learned affinities for:

```text
genres
themes
moods
styles
people
languages
eras
runtime
franchises
viewing contexts
```

## Layer B — Interpretable preference state

Used for:

- UI;
- explanation;
- controls;
- onboarding;
- debugging;
- trust.

Example:

```text
High affinity:
    psychological thrillers
    slow-burn stories
    science fiction

Avoiding:
    extreme gore

Uncertain:
    musicals
```

The system should preserve uncertainty.

---

# 14. Taste Discovery

The onboarding experience is called:

# Taste Discovery

The objective is to maximize **information gained per interaction**, not the number of questions answered.

## Target flow

```text
1. Set expectations
        ↓
2. Seen Movie Picker
        ↓
3. Quick Rating
        ↓
4. Movie Duel
        ↓
5. First Recommendations
        ↓
6. Adaptive Finish
```

## Principle

Recommend early.

Do not force the user to complete onboarding before showing useful results.

## Screen 1 — Seen Movie Picker

Show recognizable movies from diverse:

- genres;
- eras;
- popularity levels;
- languages;
- styles.

Choices:

```text
Seen
Not seen
Skip / unsure
```

Important:

```text
Not seen ≠ disliked
```

## Screen 2 — Quick Rating

For movies the user recognizes:

```text
Love
Like
Okay
Dislike
```

Avoid unnecessary precision.

## Screen 3 — Movie Duel

Ask:

> Which would you rather watch?

Pairwise choices can produce strong preference information with low cognitive effort.

Pairs should be selected to maximize information gain while avoiding repetitive questions.

## Screen 4 — First Recommendations

Show recommendations as soon as confidence is sufficient.

## Screen 5 — Adaptive Finish

Continue only if another interaction is likely to provide meaningful information.

Otherwise:

```text
Save progress
Start exploring
```

---

# 15. Feedback Semantics

Feedback strength is not identical across events.

### Strong positive

```text
explicit favourite
explicit like
high rating
completed + rewatched
```

### Strong negative

```text
explicit dislike
hide
repeated immediate rejection
```

### Medium

```text
watchlist
long watch
completion
revisit
```

### Weak

```text
impression
click
search
hover
brief exposure
```

Signals should be weighted, time-decayed, and contextualized.

---

# 16. V1 Recommendation System

V1 is:

# Popularity + Content-Based Filtering

The first system must be inspectable.

## Candidate sources

```text
Global popularity
Segmented popularity
Content similarity
Onboarding-selected movies
Recent user interests
Editorial/new-release candidates
```

## Content representation

Use TF-IDF plus structured metadata.

Conceptually:

```text
genre:thriller
genre:science_fiction
director:...
cast:...
language:en
era:2020s
keyword:artificial_intelligence
theme:surveillance
mood:tense
style:slow_burn
plot:...
```

Structured fields should be scaled so a long synopsis does not overwhelm important categorical signals.

## User profile

V1 profile:

```text
user_profile =
    weighted_sum(
        liked_movies
        + highly_rated_movies
        + onboarding_preferences
        + selected positive signals
    )
```

Apply:

- event weights;
- time decay;
- confidence weighting.

Negative evidence is maintained separately.

---

# 17. Recommendation Pipeline

Every recommendation request should follow:

```text
User request
    ↓
Context / intent
    ↓
Hard eligibility filters
    ↓
Candidate generation
    ↓
Candidate scoring
    ↓
Diversity / novelty / repetition control
    ↓
Policy validation
    ↓
Explanation generation
    ↓
Final results
```

### Candidate generation

Candidates may come from:

- popularity;
- content similarity;
- onboarding;
- recent interests;
- new releases;
- franchise relationships;
- later collaborative retrieval.

### Ranking

Initial ranking combines:

```text
content similarity
+ preference affinity
+ popularity
+ freshness
+ context
- negative preference penalties
- repetition penalties
```

### Re-ranking

Apply:

- diversity caps;
- franchise caps;
- novelty;
- repetition control;
- language/era balance where appropriate.

---

# 18. Hard Filters

Recommendation models must never override product policies.

Examples:

```text
region eligibility
availability
age suitability
blocked movies
already watched
consent restrictions
licensing restrictions
```

Core principle:

> **Retrieval is not policy.**

The model suggests candidates. Policy decides which candidates are eligible.

---

# 19. Cold Start

## Zero-history user

Use:

```text
Taste Discovery
+
popular/diverse candidates
+
contextual discovery
```

## 1–5 interactions

Use:

```text
onboarding signals
+
content similarity
+
popularity fallback
```

## Warm user

Use:

```text
content profile
+
behavioral signals
+
recent intent
```

## New movie

Use:

```text
metadata
+
taxonomy
+
creator relationships
+
semantic/content features
```

No user history is required for a new movie to enter content-based retrieval.

---

# 20. Diversity and Novelty

Relevance alone is insufficient.

Recommendations should balance:

```text
relevance
+
diversity
+
novelty
+
serendipity
+
freshness
```

V1 uses simple controls.

Later versions may use MMR or learned re-ranking.

Do not fill a recommendation list with one franchise simply because it scores highly.

---

# 21. Recommendation Explanations

Every explanation must be grounded in actual recommendation evidence.

Examples:

```text
Because you liked ...
Similar to ...
You often enjoy ...
A new pick based on your interest in ...
```

Avoid fabricated explanations.

An explanation should be generated from:

- matched taxonomy;
- creator relationship;
- language/era affinity;
- similar watched/liked movies;
- recent search intent;
- explicit user preference.

---

# 22. Natural-Language Discovery

Natural-language search is a product feature, but the LLM is not the recommendation engine.

Example:

> “Give me something tense, funny, and set in space, but not too long.”

Convert it to validated structured intent:

```json
{
  "mood": ["tense", "funny"],
  "theme": ["space"],
  "runtime_max": null,
  "excluded": []
}
```

Pipeline:

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

The LLM must never:

- invent movie IDs;
- bypass policy;
- ignore availability;
- become the sole ranking model.

---

# 23. Event Architecture

Use an append-only event model.

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

Important events:

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

Raw events are immutable.

Training labels are produced through versioned transformations.

---

# 24. Evaluation

Evaluate the entire recommendation product, not only rating prediction.

## Ranking metrics

```text
Recall@K
HitRate@K
Precision@K
MRR
MAP
NDCG@K
```

## Product/recommendation health

```text
catalog coverage
user coverage
novelty
intra-list diversity
genre calibration
repetition
popularity concentration
serendipity
```

## Cold-start slices

Evaluate separately for:

```text
0 history
1–2 interactions
3–5 interactions
6–20 interactions
extensive history
```

Also evaluate by:

- new vs established movies;
- language;
- region;
- metadata completeness;
- popularity bucket.

Use **chronological evaluation** to prevent future-information leakage.

---

# 25. Success Metrics

The product should measure:

### Onboarding

- time to first useful recommendation;
- interactions before first save/play;
- question answer rate;
- skip rate;
- recognition rate;
- abandonment;
- perceived effort;
- perceived enjoyment.

### Recommendation

- save rate;
- play rate;
- completion;
- early exit;
- repeat exposure;
- diversity;
- novelty;
- recommendation stability;
- explanation usefulness.

### System

- API latency;
- ingestion failures;
- metadata completeness;
- recommendation coverage;
- event quality;
- model/version traceability.

---

# 26. Architecture

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
             Content Models       Popularity / later CF
             TF-IDF / metadata
```

The recommendation engine must be modular enough that V1 can later be replaced by V2/V3 without rewriting the API.

---

# 27. Repository Structure

```text
veya-luma/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── ...
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
│   ├── project.md
│   ├── roadmap.md
│   ├── architecture.md
│   ├── taxonomy.md
│   └── api.md
│
└── README.md
```

Keep application/backend logic separate from recommendation experimentation.

---

# 28. Security and Privacy

User data is first-party data.

Requirements:

- minimal retention;
- account deletion;
- user-data deletion;
- explicit consent where required;
- anonymized identifiers for analytics where appropriate;
- source provenance;
- licensing metadata;
- auditability;
- secure authentication;
- no unnecessary collection of sensitive attributes.

Do not infer sensitive personal characteristics that are not needed for recommendation.

---

# 29. Version Strategy

## V1 — Phase-1 Movie MVP

```text
React
+
FastAPI
+
PostgreSQL
+
TMDB
+
Taste Discovery
+
TF-IDF
+
structured metadata
+
popularity
+
basic diversity
+
grounded explanations
```

## V2 — Learning From Users

```text
collaborative retrieval
+
implicit feedback
+
MMR
+
stronger event instrumentation
```

## V3 — Intelligent Hybrid

```text
learned hybrid ranking
+
semantic retrieval
+
embeddings
+
better contextual ranking
```

## V4 — Scale and Exploration

```text
bounded exploration
+
advanced experimentation
+
large-scale retrieval
+
model optimization
```

These are **recommendation maturity stages**, not separate product phases.

---

# 30. Definition of Done for Phase 1

Phase 1 is complete when a new user can:

```text
Create account
   ↓
Complete a short Taste Discovery flow
   ↓
Receive personalized movie recommendations
   ↓
Understand why movies were recommended
   ↓
Search for movies
   ↓
Open movie details
   ↓
Like / dislike / rate
   ↓
Favourite / watchlist / mark watched
   ↓
Return later
   ↓
Receive improved recommendations
```

And the system can:

- persist the user's taste state;
- log recommendation events;
- distinguish unknown from negative evidence;
- suppress watched content where appropriate;
- enforce hard filters;
- provide measurable recommendation outputs;
- reproduce/debug recommendation decisions using model and policy versions.

---

# 31. Non-Negotiable Product Principles

1. **Learn, don't interrogate.**
2. **Recommend early.**
3. **Not seen ≠ disliked.**
4. **Treat uncertainty explicitly.**
5. **Relevance is not enough.**
6. **Retrieval is not policy.**
7. **Explanations must be grounded.**
8. **Start simple and measurable.**
9. **Measure before adding complexity.**
10. **Build for replacement.**
11. **Movies are Phase 1, not the final boundary of Veya Luma.**
12. **Do not let future categories complicate the current movie product prematurely.**

---

# 32. Source-of-Truth Hierarchy

When making implementation decisions:

```text
1. DECISION.md
        ↓
2. PROJECT.md
        ↓
3. ROADMAP.md
        ↓
4. DESIGN.md
        ↓
5. Research documents
        ↓
6. New implementation discoveries
```

If new evidence conflicts with an existing decision, update `DECISION.md` first rather than silently changing the implementation.

Research documents explain **why**.

`DECISION.md` records **what was decided**.

`PROJECT.md` defines **what is being built**.

`ROADMAP.md` defines **what gets built when**.

---

# 33. Final Project Statement

> **Veya Luma Phase 1 is a cinematic, personalized movie discovery platform that learns a user's taste through lightweight interactions, combines that taste with structured movie knowledge and content similarity, and delivers diverse, explainable recommendations.**
>
> **The movie experience is the first implementation of a broader Veya Luma personalized-discovery platform.**
>
> **The first objective is not to build the most sophisticated recommender. It is to build a complete, trustworthy, measurable recommendation product whose data and architecture can support increasingly intelligent personalization.**

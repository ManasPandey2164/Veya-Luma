# Veya Luma — Recommendation Engine Architecture (Step 18)

> **Status:** Step 18 Foundation Complete  
> **Milestone:** Phase 3 Step 18 — Recommendation Engine Foundation & Candidate Generation  
> **Core Principle:** **TASTE > FAME**  
> **Important Distinction:** **STEP 18 IS A DETERMINISTIC RECOMMENDATION FOUNDATION. IT IS NOT THE FINAL ML RECOMMENDATION MODEL.**

---

## 1. Purpose & Architectural Vision

The purpose of Veya Luma's Recommendation Foundation (Phase 3 Step 18) is to establish a deterministic, explainable, multi-channel candidate generation and scoring pipeline grounded entirely in canonical PostgreSQL catalog data and user telemetry.

Prior to Step 18, Veya Luma verified catalog ingestion (909 canonical movies, 86 taxonomy nodes, 203,093 credits, 273 collections), persistent sessions, ratings, user preferences, library bookmarks, and behavioral events (Step 17). Step 18 connects these persistent signals into a structured candidate pool that balances personal taste alignment with authentic curatorial discovery, without premature deep learning, opaque vector databases, or uncontrolled LLM hallucinations.

---

## 2. Recommendation Philosophy (Taste > Fame)

Veya Luma is **NOT** a popularity-ranking website.

Mainstream algorithms often devolve into self-reinforcing feedback loops where top-grossing blockbusters crowd out distinctive cinema. Veya Luma establishes a counter-philosophy:

$$\text{Taste} > \text{Fame}$$

Recommendations must be:
- **RELEVANT:** Meaningfully grounded in the user's explicit affinities and verified behavioral resonance.
- **SURPRISING:** Surfacing under-the-radar masterpieces, adjacent themes, and international discoveries the user has never heard of.
- **DIVERSE:** Spanning multiple genres, eras, languages, and stylistic approaches rather than monochromatic clusters.
- **EXPLORATORY:** Treating cinema as an expansive cultural medium rather than a closed consumption silo.
- **EXPLAINABLE:** Every single candidate is paired with structured, verifiable catalog evidence (zero hallucinations).

*"Random" in Veya Luma means surprising but explainable—never arbitrary or ungrounded.*

---

## 3. User Taste Representation

User taste is modeled deterministically through [UserTasteProfile](file:///d:/Recommender/backend/app/recommendation/models.py#L143-L177) without latent embeddings or black-box vectors. The profile aggregates signals across five decoupled dimensions:

1. **Movie Ratings (`MovieRating`):** Tiered evaluations from 1.0 to 10.0:
   - High ratings ($9.0 - 10.0$): $+1.00$ weight
   - Good ratings ($7.0 - 8.9$): $+0.70$ weight
   - Moderate ratings ($5.0 - 6.9$): $+0.20$ weight
   - Low ratings ($3.0 - 4.9$): $-0.50$ weight (active negative evidence)
   - Severe aversion ($1.0 - 2.9$): $-1.00$ weight (strong negative aversion)
2. **Personal Favourites (`Favourite`):** Strongest explicit curatorial endorsement ($+1.00$ weight).
3. **Watchlist (`Watchlist`):** Moderate forward-looking interest ($+0.50$ weight).
4. **Explicit Preferences (`UserPreference`):** Direct affinity values bounded in $[-1.0, 1.0]$ linked to canonical taxonomy nodes (genres, themes, moods, styles). Respects magnitude and sign ($+1.0$ vs $+0.1$).
5. **Behavioral Telemetry (`UserMovieEvent`):** Append-oriented telemetry:
   - `detail_view`: $+0.35$ base weight, with $+0.15$ incremental boost per repeat view.
   - `click`: $+0.25$ weight.
   - `impression`: $+0.05$ weak signal.

*Aversion Policy:* Low ratings and negative preferences contribute strong negative evidence to associated taxonomies, placing them in `negative_taxonomies`. A lack of interaction is never treated as dislike.

---

## 4. Long-Term vs. Recent Taste Separation

Human taste contains both enduring curatorial anchors and transient contextual explorations. The engine explicitly decouples:

```text
USER TELEMETRY
  ├── All Historical Ratings / Favourites / Persistent Preferences
  │         │
  │         ▼
  │   LONG-TERM TASTE (60% Blend)
  │   - Recurring genres, enduring themes, core directors, preferred languages
  │
  └── Recent Session Telemetry (Last 15 events / recent ratings)
            │
            ▼
      RECENT TASTE (40% Blend)
      - Immediate genre focus, active themes, director exploration
```

The profile maintains separate attribute dictionaries:
- `long_term_genres` vs `recent_genres`
- `long_term_themes` vs `recent_themes`
- `long_term_moods` vs `recent_moods`
- `long_term_styles` vs `recent_styles`
- `long_term_languages` vs `recent_languages`
- `long_term_directors` vs `recent_directors`

They are blended deterministically into `combined_*_affinity` maps using centralized weights (`long_term_blend_weight = 0.60`, `recent_blend_weight = 0.40`).

---

## 5. Movie Feature Representation

The canonical catalog is extracted into normalized [MovieFeatures](file:///d:/Recommender/backend/app/recommendation/features.py#L68-L113) without fabricating missing attributes:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          MOVIE FEATURES                                │
├────────────────────────────────────────────────────────────────────────┤
│ 1. CORE TASTE FEATURES:                                                │
│    • genres (e.g. genre.sci_fi, genre.drama)                          │
│    • themes (e.g. theme.dystopia, theme.artificial_intelligence)       │
│    • moods (e.g. mood.mind_bending, mood.atmospheric)                  │
│    • styles (e.g. style.slow_burn, style.visual_storytelling)          │
│    • keywords (normalized TMDB tags)                                   │
│    • original_language (ISO code: en, ja, fr, es, ko, etc.)            │
│    • spoken_languages (list of language codes)                         │
│    • directors (names from MovieCredit where job == 'Director')        │
│                                                                        │
│ 2. SUPPORTING FEATURES:                                                │
│    • release_year & release_era (classic, golden_modern, contemporary) │
│    • runtime_minutes                                                   │
│    • collection_id (franchise identity)                                │
│    • cast (top billed cast credits)                                    │
│    • artwork (poster_path, backdrop_path)                              │
│                                                                        │
│ 3. DISCOVERY FEATURES:                                                 │
│    • popularity_signal (log-normalized: log1p(pop) / 6.5)               │
│    • vote_quality_signal (Bayesian-damped score against vote count)    │
│    • novelty_signal (1.0 for non-English / international cinema)       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Candidate Retrieval Channels

Candidates are retrieved across five distinct, decoupled channels:

```text
                      ┌──────────────────────┐
                      │ CANDIDATE GENERATION │
                      └──────────┬───────────┘
                                 │
     ┌──────────────┬────────────┼────────────┬──────────────┐
     ▼              ▼            ▼            ▼              ▼
CONTENT_MATCH PREFERENCE_MATCH BEHAVIOR_MATCH DISCOVERY  COLD_START
 (Taxonomy &   (Explicit User   (User's Own   (Novelty,   (Curated
  Directors)     Affinity)      Telemetry)   Exploration) Diversity)
```

Each candidate preserves its `primary_channel`, `contributing_channels`, `raw_score`, and `matched_features`.

---

## 7. Content-Based Candidate Generation (`CONTENT_MATCH`)

Matches user blended taste against catalog movies using centralized weights:
- Genre overlap: $0.35$
- Theme overlap: $0.25$
- Director affinity: $0.20$
- Mood overlap: $0.15$
- Style overlap: $0.10$
- Language affinity: $0.10$
- Keyword overlap: $0.05$
- Negative penalty multiplier: $-1.50 \times \text{negative hits}$

---

## 8. Preference-Based Candidates (`PREFERENCE_MATCH`)

Matches movies asserting taxonomy nodes explicitly configured by the user via [UserPreference](file:///d:/Recommender/backend/app/models/preference.py#L183-L230).
$$\text{Score} = \sum_{\text{pref} \in \text{taxonomies}} (\text{affinity} \times \text{tag\_strength})$$
Respects affinity values: $+1.0$ (strong affinity) produces $10\times$ the retrieval weight of $+0.1$ (slight affinity). Negative affinities penalize candidates.

---

## 9. Behavioral Candidates (`BEHAVIOR_MATCH`)

Constructed exclusively from the user's own recent behavioral telemetry ([UserMovieEvent](file:///d:/Recommender/backend/app/models/preference.py#L33-L91)):
- Aggregates features of movies the user recently inspected or clicked.
- Finds catalog movies sharing those immediate genres, themes, and directors.
- **This is NOT collaborative filtering.** It analyzes only the user's own actions.

---

## 10. Discovery / Exploration Channel (`DISCOVERY`)

Rejects the failure mode of "find movies identical to what the user already knows." The Discovery channel systematically surfaces:
1. **International Cinema:** Non-English masterworks (`ja`, `fr`, `es`, `ko`, `it`, `th`, etc.).
2. **Lesser-Known Gems:** Titles with high critical acclaim (`vote_average >= 7.0`) and modest catalog popularity (`popularity < 35.0`).
3. **Thematic Horizon Bridges:** Connects user seeds to adjacent thematic nodes (e.g. `genre.sci_fi` $\to$ `theme.artificial_intelligence`, `theme.existentialism`, `style.slow_burn`).
4. **Quality Floor:** Requires minimum critical consensus (`vote_average >= 6.5`, `vote_count >= 5`). Arbitrary random titles are strictly prohibited.

---

## 11. Global Discovery & Multi-Language Exploration

The recommendation engine treats cinema as a global medium:
- Utilizes `original_language` and `spoken_languages`.
- Calculates `novelty_signal` giving non-English productions higher discovery weighting ($1.0$ vs $0.15$).
- Provides human-readable language attribution in explanations (e.g. Japanese, French, Spanish, Italian).
- *Country Metadata Note:* Country-level production metadata is currently sparse in upstream TMDB tags; documented as a future enhancement for Step 19 without inventing synthetic country codes.

---

## 12. Seen-Content Suppression & Eligibility Rules

Eligibility is decoupled from presentation:
- **Suppressed Content:** Movies evaluated in `MovieRating` (rated) or curated in `Favourite` (favourited) are excluded from recommendation candidate pools.
- **Watchlist Content (Preserved):** Bookmarked movies in `Watchlist` are **NOT** suppressed; they represent movies the user wants to see. When surfaced, candidates carry `is_in_watchlist: true`.
- **Behavioral Telemetry (Preserved):** Merely viewing a card or reading details does not suppress a movie unless explicit consumption evidence exists.

---

## 13. Candidate Merging & Quota Preservation

The candidate merger ([merge_candidate_channels](file:///d:/Recommender/backend/app/recommendation/candidates.py#L380-L445)):
1. Deduplicates movie IDs across all channels.
2. Preserves all `contributing_channels` (e.g. `['CONTENT_MATCH', 'DISCOVERY']`).
3. Retains matched features across channels.
4. **Guarantees a 20% Reserved Discovery Quota:** Ensures that at least 20% of the target pool consists of genuine discovery candidates, preventing pure similarity or popularity from eliminating exploratory titles.

---

## 14. Feature Engineering Contract

Every candidate exposes a stable, inspectable [CandidateFeatureContract](file:///d:/Recommender/backend/app/recommendation/models.py#L48-L105) for logging and future ML ranker ingestion:

| Feature Name | Type | Range | Description |
| :--- | :--- | :--- | :--- |
| `candidate_id` | UUID | — | Canonical movie UUID |
| `user_id` | UUID? | — | Authenticated user identity |
| `source_channel` | String | — | Primary retrieval channel |
| `contributing_channels` | List[String] | — | All retrieval channels that produced candidate |
| `content_score` | Float | [0.0, 1.0] | Normalized content similarity score |
| `preference_score` | Float | [0.0, 1.0] | Normalized explicit preference affinity |
| `behavior_score` | Float | [0.0, 1.0] | Normalized recent behavioral resonance |
| `discovery_score` | Float | [0.0, 1.0] | Normalized novelty and horizon expansion score |
| `genre_overlap` | Float | [0.0, 1.0] | Ratio of candidate genres matching user taste |
| `theme_overlap` | Float | [0.0, 1.0] | Ratio of candidate themes matching user taste |
| `mood_overlap` | Float | [0.0, 1.0] | Ratio of candidate moods matching user taste |
| `style_overlap` | Float | [0.0, 1.0] | Ratio of candidate styles matching user taste |
| `keyword_overlap` | Float | [0.0, 1.0] | Overlap ratio with historical raw TMDB keywords |
| `language_match` | Float | [0.0, 1.0] | User affinity toward candidate original language |
| `director_match` | Float | [0.0, 1.0] | Binary/weighted director affinity indicator |
| `cast_match` | Float | [0.0, 1.0] | Cast overlap metric |
| `era_match` | Float | [0.0, 1.0] | Temporal era compatibility metric |
| `novelty_signal` | Float | [0.0, 1.0] | International cinema and catalog novelty boost |
| `popularity_signal` | Float | [0.0, 1.0] | Logarithmic normalized popularity metric |
| `vote_quality_signal` | Float | [0.0, 1.0] | Bayesian-damped critical quality metric |
| `recent_taste_alignment`| Float | [0.0, 1.0] | Compatibility with immediate recent session taste |
| `long_term_taste_alignment`| Float | [0.0, 1.0] | Compatibility with historical long-term taste |

---

## 15. Explainability Layer

Zero LLMs. Zero hallucinations. Structured, deterministic explainability via [RecommendationExplanation](file:///d:/Recommender/backend/app/recommendation/models.py#L36-L45):

```json
{
  "reason_code": "GLOBAL_DISCOVERY",
  "label": "Acclaimed international cinema in Japanese",
  "evidence": [
    "Original language: Japanese",
    "Acclaim: 8.5/10 with 3100 votes"
  ]
}
```

Standardized reason codes:
- `GENRE_ALIGNMENT`: "Aligns with your interest in Sci-Fi & Adventure"
- `THEME_RESONANCE`: "Shares themes with films you enjoyed: Dystopia, Time Travel"
- `DIRECTOR_AFFINITY`: "Directed by Denis Villeneuve, whose work you follow"
- `PREFERENCE_MATCH`: "Matches your curated preference for Neo-Noir"
- `BEHAVIORAL_RESONANCE`: "Echoes your recent session exploration"
- `GLOBAL_DISCOVERY`: "Acclaimed international cinema in French"
- `UNDISCOVERED_GEM`: "A lesser-known title with exceptional critical consensus"
- `COLD_START_CURATION`: "Curated classic milestone in Italian"

---

## 16. Cold-Start Strategy

When an anonymous guest or new user arrives with zero interaction history:
1. **Rejects Popularity Sort:** Does not default to `ORDER BY popularity DESC`.
2. **Three-Pass Curatorial Curation:**
   - *Pass 1 (International Masterpieces):* High-quality non-English productions spanning Japanese, French, Spanish, Italian, and Korean cinema.
   - *Pass 2 (Genre & Era Diversity):* Spans Classic (<1980), Golden Modern (1980-1999), Contemporary (2000-2015), and Recent (2016+).
   - *Pass 3 (Acclaim Balance):* Fills remainder with critically acclaimed milestones (`vote_average >= 6.8`, `vote_count >= 20`).

---

## 17. Popularity Policy

Popularity is strictly a **supporting signal**:
- Assigned a minimal weight of $0.05$ in [ScoringConfig](file:///d:/Recommender/backend/app/recommendation/scoring.py#L21-L34).
- Log-damped so an ultra-popular film ($500+$ popularity) receives at most a fractional assist over a modest gem ($25$ popularity).
- A mainstream title with poor taste compatibility will never outrank a specialized film with strong thematic alignment.

---

## 18. Scoring Configuration & Heuristic Fusion

Scoring weights are centralized in [ScoringConfig](file:///d:/Recommender/backend/app/recommendation/scoring.py#L21-L34):

$$\text{Final Score} = w_{\text{content}} C + w_{\text{pref}} P + w_{\text{behav}} B + w_{\text{disc}} D + w_{\text{quality}} Q + w_{\text{pop}} \text{Pop}$$

- $w_{\text{content}} = 0.35$
- $w_{\text{pref}} = 0.25$
- $w_{\text{behav}} = 0.20$
- $w_{\text{disc}} = 0.15$
- $w_{\text{quality}} = 0.10$
- $w_{\text{pop}} = 0.05$

These are initial heuristic weights, not learned weights. They establish the baseline for future ML ranker optimization.

---

## 19. API Foundation

Endpoint:
```http
GET /api/v1/recommendations?limit=20&channel=DISCOVERY
```

Headers:
- Authenticated user: `Authorization: Bearer <JWT>`
- Guest session: `X-Session-ID: <UUID>`

Guarantees:
- Returns HTTP 401 if unauthenticated and no active guest session is provided.
- Never accepts client-supplied `user_id` as the identity authority.
- Isolates User A's recommendations completely from User B.

---

## 20. Performance & Scaling Profile

Catalog Size: 909 canonical movies, 203,093 credits, 3,705 tags.
- Bounded Bulk Queries: Executes 3 targeted queries (movies + artwork, present tags, directors), bypassing 200,000+ credit rows.
- Generation Latency:
  - Cold Start latency: $\approx 150 - 300\text{ms}$
  - Personalized Pipeline latency: $\approx 120 - 200\text{ms}$
- Bounded memory footprint with zero N+1 database queries.

---

## 21. Future Architecture Boundaries (Deferred Scope)

| Technology / Method | Step 18 Status | Deferred Milestone | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| **Collaborative Filtering** | **DEFERRED** | Phase 3 Step 19 | Requires dense multi-user interaction matrices; premature for catalog expansion. |
| **Vector DB / pgvector** | **DEFERRED** | Phase 3 Step 19 | Deterministic taxonomy matching is inspectable and reproducible; prevents ungrounded hallucinations. |
| **ML Ranker Training** | **DEFERRED** | Phase 3 Step 20 | Step 18 provides the required `CandidateFeatureContract` training data foundation first. |
| **LLM Generation** | **DEFERRED** | None | Explanations must remain grounded in verified catalog evidence without LLM latency or cost. |
| **Redis / Caching** | **DEFERRED** | Phase 3 Step 21 | Catalog retrieval latency is under $200\text{ms}$; premature caching adds operational complexity. |
| **MMR Diversity ML** | **DEFERRED** | Phase 3 Step 20 | Heuristic quota reservation provides diverse coverage without complex re-ranking overhead. |

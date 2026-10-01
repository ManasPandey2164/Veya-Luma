# Veya Luma — Recommendation Engine Specification (RECOMMENDATION.md)

**System:** Veya Luma Recommendation Engine  
**Release Stage:** Stage 1 (V1 — Content-Based Personalization + Segmented Popularity)  
**Source of Truth:** DECISION.md & PROJECT.md  
**Date:** 2026-10-01  

---

## 1. Architectural Stance & Foundational Axioms

Veya Luma's Stage 1 recommendation engine is designed as an **inspectable, deterministic, and evidence-grounded system**. It rejects premature deep learning, complex vector databases, and autonomous LLM ranking.

### Three Inviolable Rules
1. **Interaction $\ne$ Preference:** A click or impression is not a like; an unseen movie is unknown, not a confirmed negative.
2. **Similarity $\ne$ Probability:** Cosine similarity is a geometric representation metric, not a calibrated likelihood of user satisfaction.
3. **Retrieval is NOT Policy:** Recommendation algorithms suggest candidates; hard legal, safety, and entitlement policies dictate what is allowed on the screen.

---

## 2. Multi-Stage Recommendation Pipeline

Every recommendation request executes sequentially through seven decoupled phases:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        RECOMMENDATION REQUEST                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 1. HARD POLICY FILTERING                                               │
│    • Suppress watched titles (unless explicitly viewing history)       │
│    • Enforce age/sensitivity boundaries & user exclusions              │
│    • Filter by regional availability if specified                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. MULTI-SOURCE CANDIDATE GENERATION (Pool: 500-1000 items)            │
│    • Source A: Long-term content neighbors (top 200)                   │
│    • Source B: Recent-session interest neighbors (top 150)             │
│    • Source C: Onboarding / seed movie anchors (top 150)               │
│    • Source D: Segmented & global popularity (top 100)                 │
│    • Source E: Curated editorial discoveries (top 50)                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. CONTENT-BASED SCORING & FUSION                                      │
│    • Compute cosine similarity against weighted user profile           │
│    • Apply time-decay on older signals                                 │
│    • Blend candidate scores with normalized popularity floor           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 4. DIVERSITY & RE-RANKING (MMR & Controllable Caps)                    │
│    • Maximal Marginal Relevance (lambda = 0.75)                        │
│    • Franchise cap: Max 1 item per franchise per shelf                 │
│    • Director / primary creator cap: Max 2 items                       │
│    • Genre balance constraints                                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 5. GROUNDED EXPLANATION GENERATION                                     │
│    • Pair each item with verified factual evidence                     │
│    • Contrast alerts ("Higher tension than your usual picks")          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 6. TELEMETRY & AUDIT LOGGING                                           │
│    • Log request_id, model_version, policy_version, candidate slates   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Mathematical & Algorithmic Formulation

### 3.1 Item Representation (Namespaced Feature Documents)
To ensure that a 500-word plot synopsis does not overpower critical categorical features (director, genres, mood), we construct namespaced token sequences with block weighting:

```text
genre:scifi genre:thriller director:denis_villeneuve actor:amy_adams
theme:linguistics theme:alien_contact mood:atmospheric mood:tense
style:slow_burn era:2010s language:en plot:when mysterious spacecraft touch down...
```

* **Text Vectorization:** Scikit-learn `TfidfVectorizer` (sublinear term frequency, smoothed IDF, ngram range (1, 2), min_df=2, max_features=25,000).
* **Multi-Hot Categorical Concatenation:** Categorical blocks (genres, themes, moods, styles, director) are converted to L2-normalized multi-hot sparse vectors, multiplied by their respective domain weights, and horizontally stacked with the synopsis TF-IDF vector:
  $$\mathbf{x}_i = \left[ w_{\text{cat}} \cdot \mathbf{x}_{i, \text{cat}} \;\Vert\; w_{\text{syn}} \cdot \mathbf{x}_{i, \text{syn}} \right]$$
  $$\text{Default weights: } w_{\text{cat}} = 0.70, \quad w_{\text{syn}} = 0.30$$

### 3.2 User Taste Profile Construction
The user profile is a normalized, weighted superposition of movie vectors that received positive feedback:

$$\mathbf{p}_u = \text{L2\_normalize}\left( \sum_{i \in \mathcal{E}^+(u)} w_{u, i} \cdot \mathbf{x}_i \right)$$

Where the event weight $w_{u, i}$ is:
$$w_{u, i} = \text{action\_weight}(e) \times \text{rating\_multiplier}(r) \times \exp(-\lambda \cdot \Delta t)$$

#### Event Weights
* Explicit Favourite: $1.00$
* Explicit Like: $0.85$
* Duel Pick (Winner): $0.80$
* Watchlist Add: $0.75$
* High Rating (4.5–5.0): $1.00$
* Moderate Rating (3.5–4.0): $0.60$
* Half-life ($\lambda$): 45 days for short-term drift; long-term baseline maintains stable anchor weights.

#### Negative Profile & Exclusions
Negative signals are maintained in a separate exclusion list $\mathcal{E}^-(u)$ and penalty vector $\mathbf{n}_u$:
* Explicit Dislike / "Not for me": Immediate suppression or heavy negative penalty ($-1.0$).
* Low Rating (1.0–2.0): $-0.80$ penalty to matching themes and genres.
* **Axiom:** Absence of action is NEVER a negative signal.

### 3.3 Scoring Function
For candidate movie $j$:
$$\text{Score}(u, j) = \beta_c \cdot (\mathbf{p}_u \cdot \mathbf{x}_j) + \beta_p \cdot \text{Pop}(j) - \beta_n \cdot (\mathbf{n}_u \cdot \mathbf{x}_j)$$
$$\text{Default coefficients: } \beta_c = 0.75, \quad \beta_p = 0.15, \quad \beta_n = 0.30$$

### 3.4 Diversity & Re-Ranking (Maximal Marginal Relevance)
To prevent recommendations from collapsing into a single franchise or tonal monotony:
$$\text{MMR}(j) = \lambda \cdot \text{Score}(u, j) - (1 - \lambda) \cdot \max_{k \in \mathcal{S}} \text{CosineSimilarity}(\mathbf{x}_j, \mathbf{x}_k)$$
Where $\mathcal{S}$ is the set of already selected items, and $\lambda = 0.75$.

---

## 4. Adaptive Taste Discovery (Onboarding Engine)

The goal of Taste Discovery is to maximize **information gain per interaction**, keeping onboarding under 3 minutes (8–12 meaningful interactions).

### 4.1 Step 1: Diverse Seen Movie Picker
- Candidate Pool: 12–16 highly recognizable titles across diverse clusters (Sci-Fi, Classic Crime, International, Animation, Indie Comedy).
- User Actions: `Seen`, `Not Seen`, `Skip`.
- Output: Identifies high-confidence anchors without forcing the user to guess.

### 4.2 Step 2: Quick Rating
- Only presented for titles marked `Seen`.
- Options: `Loved it` ($+1.0$), `Liked it` ($+0.75$), `Fine` ($+0.4$), `Not for me` ($-0.8$), `Skip`.

### 4.3 Step 3: Pairwise Movie Duel
Presents situational contrasts: *"Which would you rather watch tonight?"*
Modeled using Bradley-Terry preference probability:
$$P(A \succ B) = \sigma(s_u(A) - s_u(B))$$

**Pair Selection Objective:**
$$\text{Utility}(A, B) = P(\text{Recognizable}) \times P(\text{Informative Split}) \times \text{Distance}(A, B) - \text{RepetitionPenalty}$$
Probes uncertain dimensions (e.g. *Arrival* vs *Mad Max: Fury Road* tests Cerebral Atmosphere vs High-Arousal Action).

### 4.4 Step 4: Early Recommendation Delivery & Adaptive Finish
Recommendations surface immediately once $\ge 5$ usable signals and $\ge 3$ distinct facets have evidence.
Stopping conditions:
1. User taps "Start Exploring" (voluntary exit at any time).
2. Recommendation stability index (Jaccard similarity of top-10 across updates) $> 0.75$.
3. Soft limit: 12 interactions reached.
4. Consecutive skips indicate fatigue.

---

## 5. Grounded Explanation Generation

Explanations must reflect exact mathematical evidence:
* **Positive Alignment:**
  * *"Because you loved Arrival — Denis Villeneuve director match and high-concept science fiction."*
  * *"Matches your interest in slow-burn mystery and non-linear narrative."*
* **Radical Algorithmic Honesty (Friction / Divergence Alert):**
  * *"Differs from your usual preferences: Contains higher visceral tension than your top-rated movies."*

---

## 6. Offline Evaluation & Metrics

Evaluation runs chronologically without future data leakage:
* **Ranking Metrics:** Recall@K, NDCG@K, HitRate@K evaluated across cold-start cohorts:
  * Zero history (onboarding candidates only)
  * 1–3 interactions
  * 4–10 interactions
  * Warm users ($>10$ interactions)
* **Beyond-Accuracy Health Metrics:**
  * **Intra-List Diversity (ILD):** Mean pairwise cosine distance between recommended items.
  * **Catalog Coverage:** Percentage of active catalog recommended across all users over 7 days.
  * **Popularity Concentration (Gini coefficient):** Ensures tail and arthouse films receive fair exposure.

---

## 7. Recommendation Evolution Roadmap

```text
┌────────────────────────────────────────────────────────────────────────┐
│ V1: Content-Based TF-IDF + Segmented Popularity + Taste Discovery       │
├────────────────────────────────────────────────────────────────────────┤
│ V2: Implicit Collaborative Filtering (ALS / BPR via `implicit`) + MMR  │
├────────────────────────────────────────────────────────────────────────┤
│ V3: Learned Hybrid Ranker (LightGBM LambdaMART) + Dense Embeddings     │
├────────────────────────────────────────────────────────────────────────┤
│ V4: Large-Scale Indexing (pgvector / HNSW) + Bounded Exploration       │
└────────────────────────────────────────────────────────────────────────┘
```

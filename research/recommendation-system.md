# Production-oriented movie recommendation MVP

## Design stance

Build a conventional, inspectable pipeline: event collection → point-in-time features → candidate generation → ranking → hard-policy filtering and diversification → explanations and logging. Start with content and popularity, add collaborative filtering after enough interaction data exists, then add a learned hybrid ranker and bounded exploration. The production pattern is candidate generation, scoring, and re-ranking [1] [2]. An LLM is optional and must not be the recommender of record.

Three rules prevent common MVP failures:

1. An interaction is not automatically a preference. A click, autoplay, play, completion, rating, skip, and no-click have different meanings. An unseen movie is unknown, not a confirmed negative.
2. Similarity is not probability. Cosine and dot-product scores are representation-dependent similarity signals, not calibrated likelihoods of liking.
3. Retrieval is not policy. Region, availability, age suitability, consent, blocked items, and licensing are hard filters that models cannot override.

## Approach comparison

| Approach | Data requirements | Cold start | Compute | Explainability | MVP fit |
|---|---|---|---|---|---|
| Popularity, trending, editorial | Eligible catalog plus plays or ratings | Strong for new users; new items need editorial or freshness rules | Very low after batch aggregation | High | Essential baseline and fallback |
| Content TF-IDF plus metadata | Movie text/metadata and a user history or onboarding choices | Strong for metadata-rich new items; weak with no profile | Low with sparse matrices | High: matched fields and terms | Best V1 personalization |
| Item-item similarity | Events or metadata; one known item is enough | Weak for entirely new items | Low to moderate | High: similar-to explanations | Good V1/V2 source |
| Implicit ALS or BPR | Timestamped user-item events and overlap | Poor for unseen IDs without side features | Moderate batch training; cheap serving | Low to moderate | Good V2 warm-user model |
| Weighted or learned hybrid | Content, events, context, and labels | Best when explicit gates/fallbacks exist | Moderate on bounded pools | Moderate with source features | Strong V3 |
| Dense embeddings/vector search | Embeddings for movie text and optional natural-language query | Strong for metadata-rich new items and paraphrases | Batch embedding cost plus exact/ANN search | Medium-low; ground reasons separately | Optional V3, likely V4 at scale |
| MMR/diversification | Candidate relevance plus similarity/attributes | Does not solve cold start | Low for hundreds of candidates | Medium-high | Add in V2 |
| Contextual exploration/bandit | Impressions, propensities, reward windows, context | Can learn new items but has downside risk | Moderate/high operational cost | Low unless policy reason is logged | V4 only |

## Content-based filtering, TF-IDF, cosine, and profiles

Content-based filtering represents each movie and a user profile in a common feature space. A movie vector can contain synopsis terms, genres, cast, director, language, country, decade, keywords, runtime, and permitted classifications. A user profile is an aggregate of positive items and explicit choices; candidates are scored against it without requiring other users [3].

Build a namespaced item document so fields do not collide:

```text
genre:thriller genre:comedy decade:2010s director:greta_gerwig
cast:margot_robbie language:en keyword:time_travel plot: a group of ...
```

Normalize Unicode, lowercase consistently, normalize missing values, preserve entity names, and fit the vocabulary and IDF only on the training catalog. A common smoothed term weight is idf(t) = log((1 + N) / (1 + df(t))) + 1, multiplied by term frequency. scikit-learn TfidfVectorizer provides min_df, max_df, ngram_range, smoothing, sublinear_tf, normalization, and vocabulary controls [4]. Start with word unigrams and reviewed bigrams. Remove one-off noise with min_df and cap vocabulary size.

Concatenate TF-IDF with multi-hot structured blocks for genre, people, country, language, rating classification, and decade/year buckets. Scale each block before concatenation. Otherwise a long synopsis can dominate a few high-value categorical fields. Version field weights, preprocessing, vocabulary, IDF, feature schema, and movie-to-row mapping.

Cosine similarity is cos(a,b) = a · b / (||a|| ||b||). With L2-normalized TF-IDF, it is a sparse dot product [23]. A high value means overlap in strongly weighted terms under this representation. It does not establish quality, fairness, semantic equivalence, or a probability of satisfaction.

For positive events, use a weighted profile:

```text
p_u = normalize(sum over i of w_ui * x_i)
score(u,j) = p_u · x_j
w_ui = event_weight * rating_weight * exp(-decay * age)
```

An initial policy can give explicit likes/favourites and high normalized ratings more weight than completion, completion more than partial watch, and clicks/searches lower weight. Store low ratings and explicit dislikes separately as negative evidence or exclusions. Validate thresholds and decay. Do not treat every watch as a like because autoplay, shared accounts, availability, and accidental continuation create noise.

For no-history users, collect a short, skippable onboarding set of films, genres, languages, or tags. Otherwise return eligible popular or editorially diverse candidates and label the fallback. Explanations should use the same evidence as the scorer: Because you liked Arrival: science-fiction and director match. Do not claim more than the features establish.

## Implicit feedback, collaborative filtering, and matrix factorization

Explicit feedback is a rating, like, dislike, favourite, or thumbs signal. Implicit feedback is an impression, click, play, completion, watch time, rewatch, watchlist, search, skip, or early exit. Implicit data is abundant but exposure- and position-biased. A no-click is negative evidence only when visibility and opportunity are known.

Collaborative filtering learns from a sparse user-item matrix and can discover serendipitous relationships that metadata misses. Pure ID-based models need user ID, movie ID, event/value, and timestamp. They cannot score a new user or new movie until interactions or side features provide an embedding.

For implicit data, model confidence rather than making every unobserved cell a hard negative. A common formulation is c_ui = 1 + alpha * r_ui, where r_ui is a nonnegative event-strength transform [5]. Log scaling, caps, and time decay are plausible alternatives to validate.

Matrix factorization learns user and item vectors whose dot product is a score, often with user and item biases: r_hat_ui = u_u · v_i + b_u + b_i. Weighted implicit ALS minimizes a confidence-weighted squared loss with regularization and alternates least-squares solves. BPR samples user-positive-negative triples and optimizes that positives outrank sampled unobserved items [30]. ALS is a convenient batch default; BPR is ranking-oriented but depends on negative sampling.

Start with popularity and item-item baselines. Then compare implicit ALS with BPR or LightFM. The implicit library supplies ALS, BPR, logistic MF, and item-item models; LightFM combines sparse interactions with side features and BPR/WARP losses [6] [7]. Spark ML ALS fits data already in a distributed system, but unseen-ID outputs must route to fallbacks rather than disappear [8].

## Candidate generation, ranking, and re-ranking

The request path should be:

1. Read user/profile, locale, age policy, entitlement, consent-safe context, and current catalog state.
2. Generate bounded candidates from popularity/trending, long-term content neighbors, recent-item content neighbors, item-item or MF/BPR, editorial/new releases, and a small exploration source.
3. Union and deduplicate candidates while retaining source IDs and scores.
4. Remove seen, blocked, unavailable, age-ineligible, region-ineligible, and contract-ineligible items. Over-fetch because later filtering removes candidates.
5. Rank the remaining hundreds with a transparent weighted score or a small logistic/LambdaMART ranker.
6. Re-rank for diversity, freshness, calibration, and franchise/near-duplicate limits.
7. Return movie IDs, display metadata, reason IDs, model/policy version, and an audit record.

A simple weighted score is S = beta_c content + beta_p popularity + beta_r recent + beta_e editorial. Normalize source scores by cohort before blending. In V3, train a ranker using source scores, user/item/context features, and interaction labels, but keep hard filters outside the learned model.

```python
def recommend(user, context, k=20):
    eligible = catalog.eligible(context)
    candidates = union(
        popularity.retrieve(context, 200),
        content.retrieve(profile_long(user), 200),
        content.retrieve(profile_recent(user), 200),
        cf.retrieve(user, 200),
        new_or_editorial.retrieve(context, 100),
    )
    candidates = [c for c in dedupe(candidates)
                  if c.movie_id not in user.seen
                  and c.movie_id not in user.blocked
                  and c.movie_id in eligible]
    if not candidates:
        return diverse_popularity(eligible, k)
    ranked = ranker.score(add_features(candidates, user, context))
    return mmr_and_caps(hard_filter(ranked, context), k)
```

Log the complete pre-filter candidate set and final slate. A low final metric may be a retrieval or eligibility failure, not a ranking failure.

## Hybrid recommendation and user state

A practical hybrid starts as weighted score fusion, then becomes switching or learned fusion. Use content/session models for new or sparse users and shift toward CF as history and overlap grow. Retain popularity and editorial candidates as robust alternatives.

Maintain four states: durable taste, recent/session intent, explicit controls, and confidence/coverage. Long-term taste captures slowly changing preferences; short-term state captures current intent. A thriller session should not permanently redefine a user, while a long-term profile should prevent one click from dominating. Start with separate weights and later learn a gate from history length, recency, session coherence, and context.

Context-aware recommendation can use time, day, locale, device, language, session, subscription, and availability before retrieval, inside ranking, or during re-ranking [29]. Use context only if it is available at serving time and plausibly changes relevance. Do not use location, demographics, household identity, or sensitive-content inferences as hidden proxies.

## MMR, diversity, novelty, and exploration

Relevance-only ranking can fill a slate with one franchise or one genre. Maximal Marginal Relevance greedily balances relevance and redundancy [9]:

```text
MMR(i) = lambda * rel(i,u)
         - (1 - lambda) * max(sim(i,j) for j in selected)
```

Use normalized relevance and similarity. Cap franchises, directors, and near-duplicate clusters separately. Tune lambda rather than treating a literature value as universal.

Report several beyond-accuracy measures: mean pairwise intra-list dissimilarity, catalog coverage, user coverage, popularity-based novelty -log2(popularity), genre calibration distance, repetition, and serendipity. These metrics are not interchangeable; higher diversity can reduce immediate relevance [10].

Exploration chooses uncertain or underexposed items to learn; exploitation chooses the current best estimate. In V1-V3 use a small explicit exploration slot or quota, with eligibility, safety, relevance floor, and full policy logging. Do not randomize unavailable or sensitive content.

Only after reliable impressions, positions, propensities, delayed rewards, and rollback monitoring should the team test a bandit. Start with a small set of slate policies or candidate clusters rather than millions of movie arms. Epsilon-greedy is simplest. LinUCB or linear Thompson Sampling uses uncertainty more efficiently but adds assumptions. Conservative gates compare confidence bounds with the deployed baseline, but are not guarantees under drift or model misspecification [11] [12].

## Semantic embeddings and vector search

Dense embeddings can map a request such as tense, funny space mystery with a hopeful ending to semantically related catalog text even when exact words differ. They are useful for natural-language discovery and metadata-rich new movies, but can miss exact titles, rare names, negation, age limits, runtime, language, availability, and other hard rules. Keep lexical/BM25 retrieval for exact entities and structured filters for constraints.

For a small catalog, exact cosine or inner-product search is simpler and has perfect retrieval recall. At larger scale, HNSW or IVF/IVFFlat trades memory and speed against approximate recall. Measure recall against exact search after real filters. FAISS provides in-process indexes; pgvector keeps vectors with relational metadata and filters [13] [14].

The LLM boundary is explicit: an LLM may parse natural language into validated facets such as genres, year range, runtime, mood, language, and exclusions. Conventional retrieval, filtering, collaborative signals, ranking, availability, diversification, and policy enforcement produce the slate. The LLM must not invent movie IDs, bypass filters, or be the sole ranker. If used for explanations, constrain it to paraphrase validated reason IDs and test factuality.

## Cold-start handling

Measure cold start as cohorts:

- Zero-history user: onboarding, eligible popularity, diverse fallback, and session-only content.
- One-to-five interactions: content neighbors of explicit likes and recent plays, stabilized with popularity.
- Warm user: content plus CF and long/short state.
- New movie: metadata/content and editorial placement, then controlled exploration until events accumulate.
- Sparse region/language/entitlement: region-aware popularity and content fallback, never unavailable inventory.

Evaluate new users using only signup, onboarding, and first-session signals. Evaluate new movies using metadata and catalog state available before future interactions. Random splits and full-history profiles leak future information and overstate performance [15] [16].

## Event schema, catalog, features, and database

Use an append-only event table:

```text
recommendation_event(
  event_id, anonymized_user_id, session_id, movie_id, event_type, value,
  watch_seconds, completion_fraction, timestamp, request_id, surface, position,
  was_visible, model_version, policy_version, candidate_set_id, propensity,
  locale, device, consent_flags, availability_snapshot_id
)
```

Use event types impression, click, play_start, completion, watchlist_add, rating, like, dislike, skip, early_exit, and search. Keep raw events and derive training labels in a versioned transform. Cap repeated counts and define attribution windows.

Use stable internal movie_id and a source-ID mapping. Catalog fields should include title, release and ingestion times, genres, people, language, country, synopsis, keywords, runtime, age rating, popularity windows, availability intervals, provenance, metadata version, and licensing/deletion flags. Never join on a title string.

Ranker features can include history count and recency, long/short genre affinity, explicit controls, source and source score, popularity by time window, item age, metadata completeness, language/region, availability, prior exposure, recent genre transitions, and user-director or user-item affinity. Enforce point-in-time availability for every feature.

A student database can be PostgreSQL with catalog and event tables, materialized popularity, feature snapshots, model registry, recommendation audits, and optional pgvector. Store sparse TF-IDF matrices and factor models as versioned files with registry metadata. Add Feast only when online/offline materialization and point-in-time joins justify it [17].

## V1-V4 progression

### V1: reliable baseline and content personalization

Use PostgreSQL and batch Python. Implement eligibility, global and segmented popularity, TF-IDF plus structured features, cosine retrieval, onboarding, seen-item suppression, deterministic caps, and evidence-backed explanations. Use pandas, scikit-learn, scipy.sparse, numpy, SQLAlchemy or psycopg, and pytest. Evaluate popularity, genre popularity, and content-only models chronologically.

### V2: collaborative retrieval and instrumentation

Add the event schema, impression logging, item-item similarity, profile caching, and implicit ALS or BPR with implicit. Optionally test LightFM. Union content and CF candidates, while routing new IDs and sparse users to V1 fallbacks. Add MMR, freshness, availability, and popularity-concentration dashboards.

### V3: learned hybrid and semantic discovery

Train a logistic or LambdaMART ranker with LightGBM LGBMRanker on user-request or session groups. Features include source scores, long/short similarity, context, item age, availability, and prior exposure. Add exact dense embeddings with sentence-transformers or a permitted embeddings API for natural-language search and cold-item discovery. Fuse lexical and dense retrieval, filter structurally, and ground reasons in fields.

### V4: measured scale and bounded exploration

Only at measured scale add HNSW/IVF, online feature materialization, streaming session features, canary/A-B tooling, propensities, and a contextual exploration policy. Consider a two-tower model and ANN only when exact search fails measured latency or cost objectives. A deep sequence model or LLM recommender is not a default requirement.

## Evaluation and monitoring

Use chronological train/validation/test windows or rolling origins. At each prediction time, freeze catalog eligibility, metadata, and features to what was available then. Fit vocabularies, encoders, embeddings, and CF only on earlier data. Remove held-out positives from history used for candidate generation.

Report retrieval Recall@K or HitRate@K and post-filter recall separately from final Precision@K, Recall@K, MRR, MAP, and NDCG@K. Add catalog/user coverage, novelty, intra-list diversity, genre calibration, repetition, popularity concentration, and serendipity. Slice by zero history, 1-2, 3-5, 6-20, extensive history; new versus established movies; language, region, metadata completeness, and popularity bucket.

For a small catalog, full eligible-catalog evaluation is preferable. If sampling negatives, disclose the sampler and run sensitivity checks because sampled negatives can change model rankings [18]. Unobserved items are not true negatives without exposure evidence. Use bootstrap intervals and counts for cold cohorts.

Compare against fixed popularity, content-only, CF-only, and hybrid controls. Do not promote a model on aggregate gains that harm first-session quality, long-tail coverage, safety, or latency.

After offline gates, run a sticky user-level A/B test with one pre-declared primary outcome, secondary outcomes, duration, power target, and guardrails such as skips, early exits, completion, retention, complaints, diversity, and coverage. Interleaving is useful for fast pairwise ranker comparisons but measures relative preference rather than absolute product lift [19] [20].

If exploration is randomized, store propensities. IPS and doubly robust estimates require adequate support and credible propensities; rare actions have high variance. Use counterfactual analysis to inform experiments, not replace them.

Monitor p50/p95/p99 latency, errors, empty results, feature freshness, index freshness, fallback rate, source mix, score drift, exposure by popularity and item age, and explanation validity. Version event transforms, catalog snapshots, feature schemas, models, indexes, filters, MMR settings, exploration policy, and templates together.

## Final recommendation

Use **V1 content plus popularity, V2 implicit CF plus MMR, V3 learned hybrid ranking plus exact semantic retrieval, and V4 measured scale plus bounded contextual exploration**. This route is computationally modest, explainable enough for a student product, and capable of improving without a rewrite. MovieLens is a development dataset with usage conditions; TMDB requires current authentication, terms, rate-limit, and attribution checks before deployment [21] [22]. Protect histories, minimize retention, support deletion and consent, and license metadata and text appropriately.

## References

[1]: https://developers.google.com/machine-learning/recommendation/overview/types "Recommendation systems overview"
[2]: https://developers.google.com/machine-learning/recommendation/overview/candidate-generation "Candidate generation overview"
[3]: https://dl.acm.org/doi/10.5555/1768197.1768209 "Content-based recommendation systems"
[4]: https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html "TfidfVectorizer — API Reference"
[5]: https://yifanhu.net/PUB/cf.pdf "Collaborative Filtering for Implicit Feedback Datasets"
[6]: https://github.com/benfred/implicit "implicit official repository"
[7]: https://making.lyst.com/lightfm/docs/home.html "LightFM documentation"
[8]: https://spark.apache.org/docs/latest/ml-collaborative-filtering.html "Collaborative filtering — Apache Spark MLlib"
[9]: https://www.cs.cmu.edu/~jgc/publication/The_Use_MMR_Diversity_Based_LTMIR_1998.pdf "The Use of MMR, Diversity-Based Reranking for Reordering Documents and Producing Summaries"
[10]: https://dl.acm.org/doi/10.1145/2926720 "Diversity, Serendipity, Novelty, and Coverage: A Survey and Empirical Analysis of Beyond-Accuracy Objectives in Recommender Systems"
[11]: https://arxiv.org/html/1209.3352 "Thompson Sampling for Contextual Bandits with Linear Payoffs"
[12]: https://arxiv.org/html/2002.00467v1 "Safe Exploration for Optimizing Contextual Bandits"
[13]: https://faiss.ai/index.html "Faiss documentation"
[14]: https://github.com/pgvector/pgvector "pgvector official README"
[15]: https://dl.acm.org/doi/10.1145/564376.564421 "Methods and metrics for cold-start recommendations"
[16]: https://dl.acm.org/doi/10.1145/3569930 "A Critical Study on Data Leakage in Recommender System Offline Evaluation"
[17]: https://docs.feast.dev/getting-started/concepts/point-in-time-joins "Point-in-time joins — Feast"
[18]: https://dl.acm.org/doi/full/10.1145/3545796 "A Revisiting Study of Appropriate Offline Evaluation for Top-N Recommendation Algorithms"
[19]: https://aws.amazon.com/blogs/machine-learning/using-a-b-testing-to-measure-the-efficacy-of-recommendations-generated-by-amazon-personalize/ "Using A/B testing to measure the efficacy of recommendations generated by Amazon Personalize"
[20]: https://assets.amazon.science/c1/4d/7945330e47539fdd870cb5c73613/interleaved-online-testing-in-large-scale-systems.pdf "Interleaved Online Testing in Large-Scale Systems"
[21]: https://files.grouplens.org/datasets/movielens/ml-latest-README.html "MovieLens latest dataset README"
[22]: https://developer.themoviedb.org/reference/getting-started "The Movie Database API v3 Getting Started"
[23]: https://scikit-learn.org/stable/modules/generated/sklearn.metrics.pairwise.cosine_similarity.html "cosine_similarity — API Reference"
[30]: https://arxiv.org/abs/1205.2618 "BPR: Bayesian Personalized Ranking from Implicit Feedback"

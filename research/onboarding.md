# Taste Discovery: an adaptive onboarding system for movie discovery

**Author:** Manus AI  
**Date:** 30 September 2026

A good movie-onboarding experience should not try to learn the user's entire taste profile. It should learn enough to make the next few recommendations useful, while each interaction feels like a small piece of entertainment. The recommended design is a **two-stage, adaptive preference-elicitation game**:

1. **Seed the profile** with a few recognizable movies the user has actually seen.
2. **Probe the uncertain parts** of the profile with pairwise choices and lightweight likes/dislikes.
3. **Start recommending early**, using each recommendation as both a useful result and a learning opportunity.
4. **Stop when more questions are worth less than the user's attention**, not when a fixed questionnaire is complete.

This combines explicit feedback, pairwise preference learning, active learning, and implicit behavioral signals.

## What the research suggests

### Preference elicitation should optimize information per interaction

The new-user cold-start problem is usually addressed by asking users to rate items, but the selected items matter. Sepliarskaia, Kiseleva, Radlinski, and de Rijke formulate preference elicitation as an optimization problem and show that a **minimal, diverse set of relative-preference questions** can reduce questionnaire length by up to a factor of three in their experiments. Their result supports selecting questions for coverage and information value rather than asking a fixed list of popular titles. [1]

Active learning adds the same principle to a recommender: show an item not only because the user might like it, but also because the response will reduce uncertainty about the user's preferences. The classic recommender-systems treatment describes this as using the system's presentation choices to learn likes and dislikes while still allowing users to explore freely. [2]

A 2025 study makes an important product caveat: an active-learning policy improved offline results, but its online evaluation with 50 users did not establish the same benefit because users often could not rate the selected items. The practical implication is to **prefer questions users can answer**, include “not seen” and “skip,” and combine informativeness with recognizability. [3]

### Pairwise choices reduce rating friction, but work best with a concrete goal

Pairwise questions such as “Which would you rather watch tonight?” avoid the artificial precision of a 1–5 rating. In a RecSys study, the pairwise version was perceived as less complex than ratings and produced better ranking quality when users had a specific recommendation goal. Users also reported that comparisons helped them imagine a ranking. [4]

Pairwise choices are not a universal replacement for ratings. When users had no particular goal, pairwise elicitation did not clearly outperform ratings. For a movie app, frame the choice around a concrete situation—“pick your Friday-night movie”—and alternate comparisons with immediately useful recommendations. [4]

A pairwise model can be implemented with a Bradley–Terry or logistic preference model:

\[
P(i \succ j) = \sigma(s_u(i) - s_u(j))
\]

where \(s_u(i)\) is the current predicted utility of movie \(i\) for user \(u\), and \(\sigma\) is the logistic function. The model learns relative order without requiring the user to assign an absolute score.

### The first questions should be recognizable, diverse, and answerable

A 2024 cold-start method uses a two-phase strategy: a short “burn-in” set of popular items followed by sequentially selected items. It also models the user's preference as a **region or uncertainty set**, rather than pretending that a few answers identify one exact user vector. Its feedback interface explicitly distinguishes positive, negative, and “not applicable / not experienced.” [5]

This maps well to movies:

- Use recognizable titles for the first interactions because the user is more likely to know them.
- Do not use popularity alone. Popularity makes a title recognizable, but a profile made only from blockbusters becomes narrow and popularity-biased.
- Select a diverse seed set across eras, genres, languages, tone, and mainstream/independent levels.
- Ask about movies, not abstract genres, because concrete examples are easier to answer.

Research on diverse preference elicitation finds that optimizing only for immediate recommendation relevance can make the elicited profile inherit popularity bias. Diversifying the elicitation itself gives a broader view of user interests and can improve diversity and serendipity later. [6]

### “Not seen” is not negative feedback

Implicit-feedback research emphasizes that the absence of an interaction is ambiguous. A user may not have seen a movie because they did not know it existed, could not access it, or simply had no time. Even consumption is not a perfect positive signal: a movie may have been watched accidentally or by someone else. [7] [8]

Therefore, store these states separately:

- **Seen + liked:** strong positive evidence.
- **Seen + disliked:** strong negative evidence.
- **Seen + neutral / unsure:** weak evidence, useful mainly for recognition.
- **Not seen / skip:** no preference label; use it to improve future question selection.
- **Recommendation impression:** weak-to-moderate evidence until reinforced by a meaningful action.

For implicit feedback, confidence should increase with repeated or stronger evidence, not with a single click. The classic implicit-feedback matrix-factorization approach explicitly models confidence separately from the binary preference signal. [8]

### Recommendation fatigue should be treated as a first-class signal

Users can become tired when successive items are too similar, even when the items match their estimated interests. Recent sequential-recommendation research models fatigue using similarity to recent history, temporal patterns, and explicit fatigue signals, and reports improvements in offline metrics and large-scale online experiments. [9]

For onboarding, the simple product version is enough: limit consecutive questions of the same type, vary visual and semantic content, show progress without implying a long survey, and allow an immediate exit to recommendations.

## Proposed UX: “Taste Discovery”

### Target interaction budget

The default path should take **2–4 minutes** and contain roughly **8–12 meaningful responses**, with a useful recommendation feed appearing before the flow ends.

The system should never say “please complete 20 questions.” Instead, it should communicate a short game loop:

> “Give us a few movie instincts. We’ll start finding your kind of good.”

Use a visible but non-numeric progress indicator such as **“Building your taste map”** with five small nodes. Avoid a progress bar that suggests a long form.

### Screen 0: set expectations

- Headline: **“Let’s find your movie taste.”**
- Subtext: “Pick movies you know. Skip anything unfamiliar. You can stop whenever your recommendations feel right.”
- Primary action: **Start**.
- Secondary action: **Skip setup and explore**.

The user is told that unknown titles are safe to skip. This prevents a skipped movie from being interpreted as a dislike.

### Screen 1: “Which of these have you seen?”

Show a visually varied grid of 12–16 movie cards. The grid should contain:

- high-recognition titles from different decades;
- several genres and tones;
- a mixture of mainstream and less-obvious titles;
- no more than one or two near-duplicates from the same franchise;
- titles available in the user's market where availability is relevant.

Each card has three actions:

- **Seen**
- **Not seen**
- **Skip / not sure**

Do not make the user classify every card. The user can tap “Seen” on three or more cards and continue. Search is available for users who want to add a specific favorite.

This stage gathers recognition and high-confidence anchors. A user who selects *The Dark Knight*, *Spirited Away*, and *The Grand Budapest Hotel* has already supplied more useful information than a generic “select your favorite genres” form.

### Screen 2: quick ratings for known movies

Show 4–6 movies selected from the titles marked **Seen**, plus one or two recognizable titles from the initial grid that were not yet answered. Use a fast, expressive scale:

- **Loved it**
- **Liked it**
- **It was fine**
- **Not for me**
- **Skip / can’t remember**

The system should not require all five levels to be used. A swipe, tap, or keyboard shortcut should work. Do not ask the user to rate a movie they said they have not seen.

After the first two or three ratings, begin showing a small “taste signal” animation or text such as **“You may be more into clever worlds than straight action.”** Keep this provisional and playful; it makes the system feel responsive without overclaiming.

### Screen 3: pairwise “movie duel”

Show two movie cards and ask a situational question:

> **“Which would you rather watch tonight?”**

Actions:

- Movie A
- Movie B
- **Neither / both sound wrong**
- **Haven’t seen either**

Choose pairs that are useful contrasts, not random pairs. Examples:

- a high-confidence favorite versus a movie with an uncertain but nearby embedding;
- two movies that differ on one or two latent dimensions, such as pace or seriousness;
- two movies that are both likely recognizable but represent different taste regions.

A comparison between *Mad Max: Fury Road* and *Arrival* can distinguish action intensity from high-concept science fiction. A comparison between *Knives Out* and *The Grand Budapest Hotel* can probe playful, stylized mystery/comedy preferences.

Use 2–4 duels. The system should not show the same movie in consecutive duels unless it is deliberately acting as an anchor and the pair gives high expected information.

### Screen 4: “Your first finds”

After 5–7 explicit responses, show a small recommendation shelf of 5–8 movies. Explain the interaction as:

> “Here are a few early guesses. Tell us what feels right.”

Each card supports:

- **Like**
- **Not for me**
- **Save**
- **Skip / already seen**
- **Why this?**

This is not the end of personalization. It is the transition from onboarding to normal product use. A card that is liked or saved is both a useful recommendation and new evidence.

### Screen 5: adaptive continuation or graceful finish

The system decides whether to ask one more question. If uncertainty is still concentrated in an important part of the catalog, show one final duel or a small recommendation carousel. If the profile is good enough, say:

> “We have enough to get started. Your taste map will keep improving as you browse.”

Always provide **“Start exploring”**. The user should never feel trapped in onboarding.

## Recommendation and questioning logic

### User representation

Maintain a user taste state with two layers:

1. **Latent preference state**: a vector or distribution over movie-embedding dimensions.
2. **Interpretable facet state**: posterior estimates for useful movie attributes such as genre, tone, pace, era, language, franchise affinity, rewatchability, critic/popularity tolerance, and novelty appetite.

Represent each facet with:

- `mean`: current estimated preference;
- `variance`: uncertainty;
- `evidence_weight`: amount of usable evidence;
- `last_updated_at`;
- `source_mix`: explicit, pairwise, and implicit evidence;
- `contradiction_score`: how inconsistent recent evidence is.

Do not expose these as hard labels to the user. Internally, they support question selection and explanations.

### Candidate movie score

For a candidate movie \(i\), calculate a recommendation score such as:

\[
R(u,i) =
\underbrace{\mathbb{E}[s_u(i)]}_{\text{predicted fit}}
+ \alpha \underbrace{U_u(i)}_{\text{uncertainty / learning value}}
+ \beta \underbrace{D(i)}_{\text{diversity}}
+ \gamma \underbrace{A(i)}_{\text{availability and recognizability}}
- \delta \underbrace{F(i)}_{\text{fatigue / repetition}}
- \epsilon \underbrace{X(i)}_{\text{already known or shown}}
\]

The weights should change by phase:

- **Early onboarding:** prioritize recognizability, diversity, and learning value.
- **Middle onboarding:** prioritize information gain and pairwise separability.
- **Recommendation shelf:** prioritize predicted fit, with a smaller exploration component.
- **Normal use:** prioritize fit and satisfaction, while maintaining controlled diversity and novelty.

### Next-question utility

For each eligible question \(q\), estimate:

\[
U(q) =
\frac{\mathbb{E}[\text{information gain}(q)]
\times \text{downstream recommendation value}(q)
\times \text{answerability}(q)
\times \text{novelty}(q)}
{\text{interaction cost}(q)}
\]

A practical information-gain approximation is the expected reduction in posterior entropy:

\[
IG(q) = H(\theta \mid E)
- \sum_{a \in Answers(q)} P(a \mid E) H(\theta \mid E,a)
\]

where \(\theta\) is the user's taste state and \(E\) is the evidence collected so far.

Use a robust heuristic at first rather than building a full Bayesian system:

- choose a movie or pair that separates several plausible taste hypotheses;
- prefer titles the user is likely to recognize;
- reward candidates that cover an underrepresented facet or region;
- penalize candidates shown recently or semantically similar to recent questions;
- penalize questions whose likely answer is “not seen”;
- lower the score as fatigue rises.

### Pair selection

For a pair `(a, b)`, use:

\[
PairUtility(a,b) =
P(\text{recognizable})
\times P(\text{split choice})
\times IG(a,b)
\times diversity(a,b)
- repetitionPenalty
\]

The best pair is not two globally popular movies. It is two movies for which:

- the user is likely to know at least one;
- current models disagree about which the user would prefer;
- the pair probes a meaningful contrast;
- the titles are not so different that the choice is trivial;
- neither title was recently shown.

### Confidence and “enough information”

Use confidence at three levels:

**Evidence confidence.** How reliable is the response?

- explicit rating on a seen movie: high;
- pairwise choice between seen movies: high;
- like/save on a recommended movie: medium to high;
- card click or detail view: medium;
- dwell time or scroll: low to medium;
- skip on an unseen movie: zero preference evidence.

**Facet confidence.** How certain is the system about a taste dimension? High confidence requires both enough evidence and agreement among signals.

**Recommendation confidence.** How stable are the top recommendations? Recompute the top-k list after plausible posterior samples or small model perturbations. If the same candidates remain near the top, the system can stop asking.

A practical stopping policy is to stop when all of the following are true:

- at least **5 usable preference signals** have been collected, or the user has explicitly chosen to finish;
- at least **3 distinct taste regions or facets** have evidence;
- the top-k recommendation list has stabilized, for example with Jaccard similarity above 0.7 across the last two updates;
- the expected value of the best remaining question is below the estimated annoyance cost;
- the user has not shown fatigue, repeated skips, or rapid tapping through the last two interactions.

Also stop immediately when:

- the user taps “I’m ready”;
- the user has answered the maximum soft budget, such as 12 interactions;
- the user has two consecutive high-confidence signals and the remaining uncertainty is not relevant to available inventory.

A high-confidence early exit is a feature, not a failure. A user who gives three strong, diverse anchors should see recommendations rather than be forced through more questions.

## How to choose initial movies

Build a seed pool offline and refresh it periodically. Each movie should have:

- a content embedding from synopsis, genres, cast, director, keywords, language, and release metadata;
- collaborative or co-watch embeddings when interaction data exists;
- popularity and recognizability estimates;
- availability by market and subscription context;
- age-appropriateness and content-warning metadata;
- a diversity or cluster label;
- probability of prior exposure, learned from catalog popularity and user population coverage.

For the first grid, use a constrained selection process:

1. Remove unavailable or inappropriate titles.
2. Partition candidates into genre/tone/era/language/popularity clusters.
3. Select one or two recognizable representatives from each of several clusters.
4. Avoid showing more than one title from the same franchise or near-duplicate semantic cluster.
5. Ensure that every user can continue after selecting only a few known titles.

A weighted k-medoids or similar representative-selection method is a reasonable implementation for the first pool. The 2024 personalized-embedding work uses popularity-aware representative selection for this purpose. [5]

## Avoiding repetitive questions

Keep separate ledgers for **shown**, **answered**, **skipped**, and **known** movies. A movie should normally not reappear during onboarding once it has been answered, even if the answer was “not seen.”

Add these controls:

- **Item cooldown:** do not re-show a title for at least 10 interaction events.
- **Facet cooldown:** do not ask three consecutive questions about the same genre, era, tone, or franchise.
- **Semantic diversity:** penalize a candidate if its embedding is too close to the last two shown titles.
- **Pair memory:** never repeat the same pair; avoid transitive redundancy such as asking A vs B immediately after A vs C when B and C are nearly identical.
- **Question-type rotation:** alternate seen-selection, ratings, duels, and recommendations.
- **Unseen handling:** a skipped or unseen title is removed from the immediate question pool, not turned into a dislike.
- **Contradiction check:** if the user likes both sides of several supposedly opposing pairs, update the model toward broader or multi-interest taste rather than forcing a single profile.
- **Multi-interest modeling:** allow the user to like both quiet dramas and loud action. Do not treat every preference as one point on a single genre axis.

## Explicit and implicit feedback policy

### Explicit signals

Use these as the strongest onboarding evidence:

- seen + loved/liked;
- seen + not for me;
- pairwise choice;
- like, dislike, save, or “already seen” on a recommendation;
- “more like this” or “less like this” controls.

Store the original action and its context. A dislike during a quick game may be less reliable than a dislike after the user opens a details page.

### Implicit signals

Use implicit behavior after onboarding and as a supplement during it:

- opening a details page;
- starting playback;
- percentage watched;
- finishing or abandoning;
- rewatching;
- saving or sharing;
- search and result selection;
- time since last interaction;
- repeated skips.

Do not map a single skip to “dislike.” A skip may mean “not now,” “already seen,” “not in the mood,” or “not recognized.” Use repeated, context-consistent behavior to raise confidence.

A simple initial confidence map might be:

```text
seen_loved              +1.00
seen_liked              +0.75
pairwise_choice         +0.80 / -0.80
recommendation_like     +0.80
save                    +0.85
started_playback        +0.45
watched_75_percent      +0.65
finished                +0.80
watched_again           +0.95
detail_view             +0.15
single_skip              0.00
not_seen                 0.00
repeated_skip_same_mood -0.25
explicit_dislike        -1.00
```

These are starting priors, not universal truths. Calibrate them against later satisfaction, completion, and retention outcomes.

## Database requirements

### `movies`

- `movie_id`
- `title`, `original_title`
- `release_year`, `runtime_minutes`
- `genres`, `themes`, `tone_tags`, `pace_tag`
- `language`, `country`, `director_ids`, `cast_ids`
- `content_warnings`, `age_rating`
- `availability_regions`, `provider_ids`
- `content_embedding`, `collaborative_embedding`
- `popularity_score`, `recognizability_score`
- `cluster_id`, `franchise_id`
- `created_at`, `updated_at`

### `users`

- `user_id`
- `locale`, `region`, `language_preferences`
- `onboarding_status`
- `onboarding_started_at`, `onboarding_completed_at`
- `onboarding_interaction_count`
- `fatigue_score`
- `taste_model_version`
- `created_at`, `updated_at`

Do not require demographic fields for onboarding. Netflix describes its recommendation inputs as interactions, similar-user preferences, title information, and context such as language, device, time, and viewing duration, and says demographic information is not part of its decision process. [10]

### `user_movie_evidence`

- `user_id`, `movie_id`
- `knowledge_state`: `seen`, `not_seen`, `unknown`
- `preference_label`: `loved`, `liked`, `neutral`, `disliked`, `none`
- `source`: `onboarding_seen_picker`, `rating`, `pairwise`, `recommendation_feedback`, `playback`, `search`, `save`
- `raw_value`
- `confidence_weight`
- `event_id`
- `observed_at`
- `expires_at` or `recency_decay_group`

Keep knowledge and preference separate. `not_seen` belongs in `knowledge_state`, not in `preference_label`.

### `preference_events`

- `event_id`
- `user_id`
- `session_id`
- `question_id`
- `event_type`
- `movie_id` or `movie_a_id`, `movie_b_id`
- `answer`
- `response_latency_ms`
- `sequence_number`
- `shown_at`, `answered_at`
- `client_context`
- `model_version`

### `user_taste_state`

- `user_id`
- `latent_mean`
- `latent_covariance` or compact uncertainty representation
- `facet_posteriors`
- `facet_variances`
- `evidence_count`
- `confidence_score`
- `top_recommendation_stability`
- `last_question_type`
- `last_question_facets`
- `fatigue_score`
- `updated_at`

### `question_log`

- `question_id`
- `session_id`
- `question_type`
- `candidate_ids`
- `target_facets`
- `predicted_information_gain`
- `predicted_answerability`
- `selection_score`
- `selection_reason`
- `shown`, `answered`, `skipped`
- `model_version`

Logging the selection reason makes the system debuggable and enables offline evaluation of whether the policy is selecting useful questions.

## Pseudocode

```python
def run_taste_discovery(user, catalog, session):
    state = load_or_initialize_taste_state(user)
    history = load_session_history(session)

    show_intro_if_needed()

    # Stage 1: let the user provide recognizable anchors.
    if not history.has_seen_picker:
        seed_grid = choose_seen_grid(
            catalog=catalog,
            region=user.region,
            language=user.language_preferences,
            diversity_target=0.85,
            recognizability_target=0.75,
            exclude=history.shown_movies,
        )
        answers = show_seen_picker(seed_grid)
        record_seen_answers(user, answers, session)
        update_knowledge_state(state, answers)
        history.mark_seen_picker_complete()

    while True:
        if user_requested_finish() or history.interaction_count >= 12:
            return finish_onboarding(state, reason="user_or_budget")

        candidates = build_question_candidates(
            catalog=catalog,
            state=state,
            shown_movies=history.shown_movies,
            answered_movies=history.answered_movies,
            recent_facets=history.recent_facets,
            recent_question_types=history.recent_question_types,
            availability=user.availability,
        )

        questions = []
        questions += make_rating_questions(
            candidates,
            only_movies_marked_seen=True,
            max_count=2,
        )
        questions += make_pairwise_questions(
            candidates,
            require_recognizability=True,
            target="high_expected_information_gain",
            max_count=8,
        )
        questions += make_recommendation_feedback_questions(
            candidates,
            max_count=5,
        )

        for q in questions:
            q.utility = (
                expected_information_gain(q, state)
                * downstream_recommendation_value(q, state)
                * answerability(q, user, state)
                * novelty(q, history)
                * diversity_gain(q, state)
                / max(interaction_cost(q, state), 0.1)
            )
            q.utility -= repetition_penalty(q, history)
            q.utility -= fatigue_penalty(q, state.fatigue_score)

        question = max(questions, key=lambda q: q.utility)

        if should_stop(state, question, history):
            return finish_onboarding(state, reason="low_expected_value")

        answer = render_question(question)
        event = record_answer(user, session, question, answer)
        history.add(event)

        # Important: unknown or not-seen is missing preference data.
        if answer in ["not_seen", "unknown", "skip"]:
            update_knowledge_only(state, question, answer)
        else:
            update_preference_model(state, question, answer)

        update_fatigue(state, event, history)
        save_taste_state(user, state)

        if state.usable_signal_count >= 3 and not history.has_shown_recommendations:
            recs = recommend(
                state=state,
                catalog=catalog,
                k=6,
                diversity_weight=0.25,
                exploration_weight=0.20,
            )
            show_recommendations(recs)
            history.mark_recommendations_shown()
            continue
```

```python
def should_stop(state, best_next_question, history):
    if history.user_clicked_ready:
        return True
    if history.interaction_count >= 12:
        return True
    if state.fatigue_score >= 0.75:
        return True
    if state.usable_signal_count < 5:
        return False
    if distinct_facets_with_evidence(state) < 3:
        return False
    if recommendation_stability(state) < 0.70:
        return False
    if best_next_question.utility < annoyance_cost(state):
        return True
    if consecutive_skips(history, count=2):
        return True
    return False
```

## Example interaction

**App:** “Pick movies you know. No pressure to rate anything you haven’t seen.”

**User selects Seen:** *Arrival*, *The Dark Knight*, *Spirited Away*, *Knives Out*.

**App:** “How did *Arrival* land?”  
**User:** Loved it.

**App:** “How did *Knives Out* land?”  
**User:** Liked it.

The system now has evidence for high-concept storytelling and playful mystery, but it does not yet know whether the user prefers emotional seriousness or stylish fun.

**App:** “Which would you rather watch tonight?”  
**A:** *Blade Runner 2049*  
**B:** *The Grand Budapest Hotel*  
**User:** A.

The system updates the pairwise model toward atmospheric, serious, high-concept science fiction. It also keeps the earlier comedy signal instead of deleting it.

**App:** “A few early guesses…”

- *Ex Machina* — user taps Like;
- *Parasite* — user taps Save;
- *Annihilation* — user taps Already seen;
- *The Lobster* — user taps Not for me.

The next question should not ask about another dark science-fiction film. It should either:

- test whether the user likes ambitious foreign-language drama, or
- show a recommendation that bridges the user's known signals, such as *Children of Men* or *Eternal Sunshine of the Spotless Mind*, depending on the catalog and model.

If the recommendation list remains stable and the user has answered eight interactions, the app says:

> “We have enough to get started. Your picks will keep teaching us. Start exploring.”

## What to measure in experiments

Do not judge the onboarding policy only by offline prediction accuracy. Measure the complete experience:

- time to first satisfying recommendation;
- number of interactions before first save or playback;
- percentage of questions answered versus skipped;
- recognition rate of shown titles;
- onboarding completion and abandonment;
- user-rated effort and enjoyment;
- recommendation precision after 1, 3, and 7 days;
- diversity and novelty of recommendations;
- repeated-question rate;
- stability of the recommendation list;
- calibration of preference confidence;
- whether explicit onboarding evidence is later confirmed by behavior;
- performance for users with narrow, broad, multilingual, or non-mainstream tastes.

Run an A/B test against at least two baselines:

1. fixed popular-title ratings;
2. fixed diverse-title ratings;
3. adaptive hybrid policy.

The online study caveat from recent active-learning research is especially relevant: a policy can look strong in simulation because every synthetic user can answer every question, while real users often do not recognize or cannot rate the selected item. [3]

## Recommended implementation order

**Version 1:** seen picker, 1–5 quick rating, pairwise duel, like/dislike recommendation feedback, event logging, simple content embeddings, and rule-based utility scoring.

**Version 2:** Bradley–Terry pairwise model, facet-level uncertainty, diversity-aware question selection, confidence-weighted implicit events, and stopping based on recommendation stability.

**Version 3:** Bayesian or ensemble uncertainty, learned answerability and fatigue models, multi-interest user representations, contextual bandit question selection, and online policy evaluation.

The core product decision should remain stable across all versions: **ask the smallest number of questions that meaningfully changes what the user will see next, and make every question feel like a movie choice rather than a data-entry task.**

## References

[1]: https://dl.acm.org/doi/abs/10.1145/3240323.3240352 "Preference elicitation as an optimization problem"

[2]: https://link.springer.com/chapter/10.1007/978-0-387-85820-3_23 "Active Learning in Recommender Systems"

[3]: https://www.nature.com/articles/s41598-025-09708-2 "Active learning algorithm for alleviating the user cold start problem of recommender systems"

[4]: https://dl.acm.org/doi/pdf/10.1145/3240323.3240364 "Eliciting Pairwise Preferences in Recommender Systems"

[5]: https://arxiv.org/html/2406.00973v1 "Cold-start Recommendation by Personalized Embedding Region Elicitation"

[6]: https://research.google/pubs/diverse-user-preference-elicitation-with-multi-armed-bandits/ "Diverse User Preference Elicitation with Multi-Armed Bandits"

[7]: https://cs.fit.edu/~pkc/apweb/related/oard-aaaiWS98.pdf "Implicit Feedback for Recommender Systems"

[8]: https://chrisvolinsky.com/files/publications/Collaborative_Filtering_for_Implicit_Feedback_Datasets.pdf "Collaborative Filtering for Implicit Feedback Datasets"

[9]: https://arxiv.org/html/2405.11764v2 "Modeling User Fatigue for Sequential Recommendation"

[10]: https://help.netflix.com/en/node/100639 "How Netflix’s Recommendations System Works"

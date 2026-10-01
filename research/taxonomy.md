# Movie Taxonomy for a Personalized Recommendation Engine

## Design objective

A useful movie taxonomy should describe **what a movie is**, **what it feels like**, **how it is made**, **who it is for**, and **how it relates to other movies**. Those dimensions should not be collapsed into one flat list of genres.

The recommended design uses five controlled vocabularies plus structured relationships:

1. **Genre** — broad narrative, format, and subject categories.
2. **Theme** — recurring ideas, situations, conflicts, settings, and motifs.
3. **Mood** — the emotional experience a viewer is likely to have.
4. **Style** — pacing, storytelling, visual, audio, and performance characteristics.
5. **Audience and constraints** — suitability, runtime, era, language, accessibility, and content sensitivity.

The taxonomy is deliberately **multi-label**. A movie may be both a crime drama and a comedy, or a science-fiction thriller with a family theme. Genre is not a single class.

The system should start with a curated core of roughly **150–250 active concepts**, not thousands of loosely defined tags. A movie normally receives 2–4 genres, 3–8 themes, 2–5 moods, and 2–5 style tags. More specific terms can be retained as aliases, source observations, or candidate tags without immediately becoming ranking features.

The design is compatible with metadata providers and collaborative data. TMDB exposes genres, collections, release date, runtime, original language, production countries, spoken languages, companies, keywords, and credits as separate fields [1] [2] [3]. MovieLens separately represents ratings, user-generated tags, timestamps, and a controlled genre list [4]. Its Tag Genome illustrates the value of graded tag relevance, but also the need for governance: the 2021 release contains 1,084 tags and 10.5 million movie–tag relevance scores [5].

## 1. Taxonomy hierarchy

### 1.1 Taxonomy rules

Each concept has:

- a stable machine key, such as `genre.thriller` or `theme.time_travel`;
- a display label and localized labels;
- one parent within its axis, except for a small number of deliberately cross-cutting concepts;
- a definition and positive inclusion examples;
- optional exclusion guidance to prevent semantic drift;
- a default importance and decay policy;
- aliases that map source-specific terms to the canonical concept.

Do not encode the following as tags:

- title words, actor names, director names, or studio names — these belong in relationship tables;
- every plot noun extracted by an LLM — retain these as evidence or candidate concepts first;
- rating, popularity, or quality — these are dynamic signals, not semantic attributes;
- nationality and language as themes — they are structured movie and user-preference attributes;
- arbitrary adjectives such as “good,” “cool,” or “interesting.”

### 1.2 Genre hierarchy

Genre is the most familiar axis, but it should remain broad enough to generalize. Use one or more leaf concepts; parent concepts are useful for browsing and back-off scoring.

```text
Genre
├── Narrative
│   ├── Action
│   ├── Adventure
│   ├── Comedy
│   ├── Crime
│   ├── Drama
│   ├── Fantasy
│   ├── Horror
│   ├── Mystery
│   ├── Romance
│   ├── Science Fiction
│   ├── Thriller
│   ├── War
│   ├── Western
│   └── Historical / Period
├── Audience / life-stage
│   ├── Family
│   ├── Children
│   ├── Teen
│   └── Young Adult
├── Form and screen tradition
│   ├── Animation
│   ├── Documentary
│   ├── Musical
│   ├── Concert / Performance
│   ├── Experimental
│   ├── Anthology
│   └── Short Film
├── Specialized narrative traditions
│   ├── Film Noir
│   ├── Biographical
│   ├── Sports
│   ├── Religious / Spiritual
│   ├── Political
│   └── Courtroom
└── Hybrid / catalog fallback
    ├── Romantic Comedy
    ├── Action Comedy
    ├── Historical Drama
    ├── Superhero
    └── Disaster
```

**Genre guidance:**

- Keep `Romantic Comedy` as a derived or curated hybrid of `Romance + Comedy`, not a replacement for both parents.
- Treat `Superhero` as a specialized narrative tradition or theme-adjacent genre. It should inherit from `Action` and often from `Science Fiction` or `Fantasy`, but not require either.
- Treat `Biographical`, `Sports`, `Political`, and `Courtroom` as subject traditions. They can coexist with `Drama`, `Comedy`, or `Thriller`.
- Do not add subgenres such as “tech thriller,” “cozy mystery,” or “elevated horror” until there is enough catalog volume and evidence that users distinguish them.

### 1.3 Theme hierarchy

Themes explain the movie’s central ideas or recurring situations. They are more useful than genres for personalization, but should be assigned conservatively.

```text
Theme
├── Human relationships
│   ├── Friendship
│   ├── Family
│   ├── Parenthood
│   ├── Sibling relationship
│   ├── Romance / love
│   ├── Betrayal
│   ├── Loyalty
│   ├── Community
│   ├── Mentorship
│   └── Isolation / loneliness
├── Personal identity and growth
│   ├── Coming of age
│   ├── Identity
│   ├── Dual identity / disguise
│   ├── Self-discovery
│   ├── Trauma and recovery
│   ├── Grief and loss
│   ├── Ambition
│   ├── Redemption
│   ├── Freedom / autonomy
│   └── Mental health
├── Conflict and morality
│   ├── Revenge
│   ├── Justice / injustice
│   ├── Power and corruption
│   ├── Politics / governance
│   ├── Class conflict
│   ├── Colonialism / imperialism
│   ├── War and peace
│   ├── Human nature
│   ├── Ethics / moral dilemma
│   └── Faith / spirituality
├── Society and technology
│   ├── Technology
│   ├── Artificial intelligence
│   ├── Surveillance
│   ├── Dystopia
│   ├── Social inequality
│   ├── Migration / displacement
│   ├── Environmental crisis
│   ├── Science and discovery
│   └── Media / celebrity / fame
├── Speculative concepts
│   ├── Time travel
│   ├── Alternate reality
│   ├── Parallel worlds
│   ├── Space exploration
│   ├── Alien contact
│   ├── Robots / androids
│   ├── Supernatural
│   ├── Monsters / creatures
│   ├── Magic
│   └── Apocalypse / post-apocalypse
├── Survival and place
│   ├── Survival
│   ├── Escape / pursuit
│   ├── Expedition
│   ├── Wilderness
│   ├── Ocean / sea
│   ├── Space
│   ├── Natural disaster
│   ├── Prison / captivity
│   └── Homecoming
└── Story source / device
    ├── Based on true story
    ├── Based on a book
    ├── Historical event
    ├── Investigation
    ├── Heist
    ├── Conspiracy
    ├── Revenge quest
    └── Road journey
```

A theme should be assigned when it is central, recurrent, or materially changes the viewing experience. For example, a movie containing a laptop should not automatically receive `Technology`; a story about a society governed by an algorithm probably should.

### 1.4 Mood hierarchy

Mood is an experiential label. It should be learned from multiple sources and represented with intensity, not as an absolute binary.

```text
Mood
├── Valence
│   ├── Joyful
│   ├── Warm
│   ├── Hopeful
│   ├── Romantic
│   ├── Melancholic
│   ├── Sad
│   ├── Dark
│   └── Disturbing
├── Arousal
│   ├── Relaxing
│   ├── Gentle
│   ├── Energetic
│   ├── Fast / exhilarating
│   ├── Tense
│   ├── Suspenseful
│   ├── Frightening
│   └── Chaotic
├── Cognitive experience
│   ├── Thought-provoking
│   ├── Mind-bending
│   ├── Mysterious
│   ├── Surreal
│   ├── Nostalgic
│   └── Inspirational
├── Social / tonal
│   ├── Funny
│   ├── Witty
│   ├── Tender
│   ├── Serious
│   ├── Satirical
│   └── Grand / epic
└── Sensory atmosphere
    ├── Atmospheric
    ├── Dreamlike
    ├── Gritty
    ├── Whimsical
    ├── Visceral
    └── Cozy
```

Mood labels must be independent of quality. “Sad” describes an experience; it does not mean the movie is bad. Store both `polarity` and `intensity` if the downstream model benefits from continuous representations.

### 1.5 Style hierarchy

Style describes how the story is told and how the film feels formally.

```text
Style
├── Narrative structure
│   ├── Linear
│   ├── Non-linear
│   ├── Episodic
│   ├── Anthology structure
│   ├── Framed narrative
│   ├── Multiple timelines
│   ├── Unreliable narrator
│   ├── Twist-heavy
│   └── Open-ended
├── Pacing and attention
│   ├── Slow burn
│   ├── Fast paced
│   ├── Measured
│   ├── Action driven
│   ├── Character driven
│   ├── Plot driven
│   ├── Dialogue heavy
│   └── Minimalist
├── Visual and sound
│   ├── Visually spectacular
│   ├── Atmospheric
│   ├── Stylized
│   ├── Documentary-like
│   ├── Handheld / kinetic camera
│   ├── Long takes
│   ├── Practical effects
│   ├── CGI-forward
│   ├── Monochrome / black and white
│   └── Music-driven
├── Performance and voice
│   ├── Ensemble cast
│   ├── Star-led
│   ├── Naturalistic acting
│   ├── Theatrical acting
│   ├── Voiceover
│   ├── Improvisational
│   └── Dialogue-poor / visual storytelling
└── Production / viewing form
    ├── Live action
    ├── 2D animation
    ├── 3D animation
    ├── Stop motion
    ├── Found footage
    ├── Mockumentary
    ├── IMAX / large format
    └── Black comedy
```

Some style labels overlap with genre or mood. That is acceptable if each axis answers a different question. `Horror` says what category the film belongs to; `Frightening` says how it feels; `Slow burn` says how tension is delivered.

### 1.6 Audience and viewing-preference attributes

Audience attributes should be split into **movie facts** and **user preferences**. Avoid inferring sensitive personal characteristics that are not needed for recommendation.

#### Viewer preference dimensions

```text
Audience preference
├── Life-stage suitability
│   ├── Children-friendly
│   ├── Family-friendly
│   ├── Teen-oriented
│   ├── Adult-oriented
│   └── All-ages accessible
├── Viewing context
│   ├── Solo viewing
│   ├── Couple viewing
│   ├── Group / party viewing
│   ├── Family viewing
│   ├── Background-friendly
│   └── Requires focused attention
├── Engagement preference
│   ├── Easy watch
│   ├── Comfort watch
│   ├── Challenging watch
│   ├── Rewatchable
│   └── Discussion-friendly
├── Accessibility preference
│   ├── Prefers subtitles
│   ├── Prefers dubbing
│   ├── Audio-description available
│   ├── Caption-friendly
│   └── Avoids rapid dialogue / flashing imagery
└── Content boundaries
    ├── Avoids graphic violence
    ├── Avoids sexual content
    ├── Avoids profanity
    ├── Avoids substance use
    ├── Avoids intense fear
    ├── Avoids animal harm
    └── Avoids specific user-defined topics
```

These are preference dimensions, not necessarily visible movie tags. For example, `requires_focused_attention` can be inferred from non-linear structure and dialogue density, but should be learned as a soft preference rather than hard-coded from demographics.

#### Runtime buckets

Store exact runtime in minutes and derive buckets for ranking and filters:

- `micro`: under 60 minutes;
- `short`: 60–89;
- `standard`: 90–119;
- `long`: 120–149;
- `epic`: 150–179;
- `very_long`: 180 or more.

Treat boundaries as defaults, not truths. A user’s runtime preference should be a continuous distribution or a set of learned penalties. A 119-minute movie should not become categorically different from a 120-minute movie.

#### Release-era buckets

Store the exact release date and derive overlapping era features:

- `silent`: before 1930;
- `classic`: 1930–1969;
- `new_hollywood`: 1970–1979;
- `modern`: 1980–1999;
- `digital_transition`: 2000–2009;
- `contemporary`: 2010–2019;
- `current`: 2020 onward.

Also derive a **recency** feature from the user’s interaction date. Era preference is not the same as recency preference. A user may prefer 1990s movies while still wanting newly released films.

#### Language and market attributes

Store:

- original language;
- spoken languages;
- production countries and regions;
- release countries and release dates by market;
- subtitle and dubbing availability by market;
- user language preference and tolerance for subtitles;
- transliterated and localized title variants.

Language should be modeled as a preference with fallback groups. A user who likes Korean and Japanese movies may have a broader `East Asian languages` affinity, but that grouping should be a model feature or hierarchy—not a replacement for the original language.

### 1.7 Franchise and relationship hierarchy

Franchise relationships should be modeled as a graph, not tags.

```text
Movie relationship
├── Franchise / universe
│   ├── Collection membership
│   ├── Shared fictional universe
│   ├── Sequel
│   ├── Prequel
│   ├── Reboot
│   ├── Remake
│   ├── Spin-off
│   └── Crossover
├── Source relationship
│   ├── Adaptation of book
│   ├── Adaptation of play
│   ├── Adaptation of game
│   ├── Based on real person
│   └── Based on historical event
├── Creative relationship
│   ├── Same director
│   ├── Same writer
│   ├── Same lead actor
│   ├── Same ensemble
│   ├── Same composer
│   └── Same production company
└── Similarity relationship
    ├── Content-similar
    ├── Audience-similar
    ├── Thematically similar
    ├── Style-similar
    └── Commonly watched together
```

For recommendations, franchise membership should be a strong signal after a user likes one entry, but it must be diversified. Do not fill an entire recommendation list with one franchise unless the user explicitly asks for it.

### 1.8 Content sensitivity attributes

Content sensitivity is a **separate safety and filtering layer**, not a mood or genre axis. Store both category severity and evidence.

Recommended categories:

- violence and gore;
- frightening or intense scenes;
- sexual content and nudity;
- profanity and slurs;
- alcohol, drugs, and smoking;
- self-harm and suicide;
- abuse and domestic violence;
- sexual violence;
- child harm;
- animal harm;
- torture and captivity;
- eating-disorder content;
- grief, bereavement, and terminal illness;
- hate speech or extremist content;
- flashing lights or photosensitivity;
- disturbing imagery;
- pregnancy or childbirth complications;
- discrimination or traumatic historical events.

Use an ordinal severity such as `none`, `mild`, `moderate`, `severe`, `unknown`, plus `frequency`, `graphicness`, and `context` where available. IMDb’s Parents Guide is a useful example of distinct dimensions for sex and nudity, violence and gore, profanity, alcohol/drugs/smoking, frightening/intense scenes, and regional certifications [6]. Certification is market-specific and must not be treated as a universal severity score.

## 2. PostgreSQL representation

The schema below separates canonical entities, source observations, user preferences, and derived features. It uses integer IDs internally and stable keys for integration.

### 2.1 Movies and people

```sql
create table movie (
    movie_id              bigint generated always as identity primary key,
    canonical_title       text not null,
    original_title        text,
    original_language     text,
    release_date          date,
    runtime_minutes       smallint check (runtime_minutes is null or runtime_minutes > 0),
    synopsis              text,
    is_adult              boolean not null default false,
    status                 text,
    created_at             timestamptz not null default now(),
    updated_at             timestamptz not null default now()
);

create table movie_alias (
    movie_id              bigint not null references movie(movie_id) on delete cascade,
    language_code         text,
    title                 text not null,
    alias_type             text not null, -- localized, transliteration, former_title, search_alias
    primary key (movie_id, language_code, title)
);

create table person (
    person_id              bigint generated always as identity primary key,
    canonical_name         text not null,
    birth_date             date,
    death_date             date
);

create table movie_person_credit (
    movie_id              bigint not null references movie(movie_id) on delete cascade,
    person_id             bigint not null references person(person_id) on delete cascade,
    credit_type            text not null, -- cast, crew
    job                    text,          -- actor, director, writer, composer, producer
    character_name         text,
    billing_order          integer,
    source_confidence      numeric(5,4) not null default 1.0 check (source_confidence between 0 and 1),
    primary key (movie_id, person_id, credit_type, job)
);
```

Keep a person’s relationship explicit. `person_id = 123` should not become a `theme.actor_123` tag. This enables actor, director, writer, composer, and production-role features with different weights.

### 2.2 Taxonomy nodes

```sql
create type taxonomy_axis as enum (
    'genre', 'theme', 'mood', 'style', 'audience', 'sensitivity'
);

create table taxonomy_node (
    node_id                bigint generated always as identity primary key,
    axis                   taxonomy_axis not null,
    key                    text not null unique,
    label                  text not null,
    definition             text not null,
    parent_node_id         bigint references taxonomy_node(node_id),
    is_active              boolean not null default true,
    is_rankable             boolean not null default true,
    default_weight         numeric(6,4) not null default 1.0,
    min_catalog_support     integer not null default 20,
    created_at              timestamptz not null default now(),
    retired_at              timestamptz
);

create table taxonomy_alias (
    node_id                bigint not null references taxonomy_node(node_id) on delete cascade,
    alias                  text not null,
    source_name             text,
    primary key (node_id, alias)
);

create table taxonomy_rule (
    rule_id                 bigint generated always as identity primary key,
    node_id                 bigint not null references taxonomy_node(node_id) on delete cascade,
    rule_type               text not null, -- include, exclude, imply, mutual_exclusion
    related_node_id         bigint references taxonomy_node(node_id),
    rule_text               text,
    priority                integer not null default 100
);
```

Use a closure table if hierarchical queries are frequent:

```sql
create table taxonomy_node_path (
    ancestor_node_id        bigint not null references taxonomy_node(node_id) on delete cascade,
    descendant_node_id      bigint not null references taxonomy_node(node_id) on delete cascade,
    depth                   integer not null check (depth >= 0),
    primary key (ancestor_node_id, descendant_node_id)
);
```

The `is_rankable` flag allows a parent or low-support concept to remain useful for browsing and back-off without becoming a direct model feature.

### 2.3 Movie-to-taxonomy relationships

```sql
create type tag_assertion as enum ('present', 'absent', 'unknown');

create table movie_tag (
    movie_id               bigint not null references movie(movie_id) on delete cascade,
    node_id                bigint not null references taxonomy_node(node_id) on delete cascade,
    assertion              tag_assertion not null default 'present',
    strength               numeric(6,5) not null default 1.0 check (strength between 0 and 1),
    confidence             numeric(6,5) not null check (confidence between 0 and 1),
    evidence_count         integer not null default 1 check (evidence_count >= 0),
    evidence_updated_at    timestamptz,
    is_curated             boolean not null default false,
    created_at             timestamptz not null default now(),
    updated_at             timestamptz not null default now(),
    primary key (movie_id, node_id)
);

create index movie_tag_node_idx on movie_tag(node_id, movie_id);
create index movie_tag_rank_idx on movie_tag(movie_id, node_id, confidence, strength);
```

Interpretation:

- `strength` means how central or intense the concept is in the movie.
- `confidence` means how certain the system is that the concept applies.
- `evidence_count` is the count of independent or aggregated supporting observations.
- `assertion = absent` is useful only for explicit, trustworthy negative evidence. Absence of a tag should normally mean unknown, not absent.

For graded tag systems such as Tag Genome, `strength` can hold the normalized relevance value and `confidence` can be learned from source agreement and calibration.

### 2.4 Provenance and source observations

Never overwrite an imported value without retaining where it came from.

```sql
create table metadata_source (
    source_id              bigint generated always as identity primary key,
    source_name             text not null,
    source_version          text,
    source_url              text,
    license_note            text,
    retrieved_at            timestamptz not null default now()
);

create table source_entity_map (
    source_id              bigint not null references metadata_source(source_id) on delete cascade,
    source_entity_type     text not null, -- movie, person, taxonomy_node
    source_entity_id       text not null,
    canonical_entity_id    bigint not null,
    primary key (source_id, source_entity_type, source_entity_id)
);

create table movie_tag_evidence (
    evidence_id             bigint generated always as identity primary key,
    movie_id                bigint not null references movie(movie_id) on delete cascade,
    node_id                 bigint not null references taxonomy_node(node_id) on delete cascade,
    source_id               bigint not null references metadata_source(source_id),
    evidence_type           text not null, -- provider_field, editorial, user_tag, model, behavior
    raw_value               jsonb not null,
    extracted_strength      numeric(6,5),
    extracted_confidence    numeric(6,5),
    observed_at              timestamptz,
    created_at              timestamptz not null default now()
);

create index movie_tag_evidence_lookup_idx
    on movie_tag_evidence(movie_id, node_id, source_id);
```

A final `movie_tag` row should be produced by a deterministic aggregation job, for example:

```text
final_confidence = 1 - product(1 - source_reliability_i * evidence_confidence_i)
final_strength   = weighted_mean(evidence_strength_i, source_reliability_i)
```

Cap the number of correlated sources. Five copies of the same provider’s keyword should not be treated as five independent confirmations.

### 2.5 Language, release, availability, and sensitivity

```sql
create table movie_language (
    movie_id               bigint not null references movie(movie_id) on delete cascade,
    language_code          text not null,
    language_role          text not null, -- original, spoken, subtitle, dub
    availability_status    text,          -- confirmed, available, unknown
    primary key (movie_id, language_code, language_role)
);

create table movie_release (
    movie_id               bigint not null references movie(movie_id) on delete cascade,
    country_code           text not null,
    release_date           date,
    certification           text,
    release_type            text, -- theatrical, festival, streaming, physical
    primary key (movie_id, country_code, release_type)
);

create table movie_sensitivity (
    movie_id               bigint not null references movie(movie_id) on delete cascade,
    category               text not null,
    severity               text not null, -- none, mild, moderate, severe, unknown
    intensity              numeric(5,4),
    frequency              numeric(5,4),
    graphicness             numeric(5,4),
    context                 text,
    confidence              numeric(6,5) not null check (confidence between 0 and 1),
    source_id               bigint references metadata_source(source_id),
    primary key (movie_id, category, source_id)
);
```

Do not expose raw sensitivity descriptions in a recommendation explanation without checking for spoilers. Provide a user-facing summary such as “contains severe violence” and let the user open more detail.

### 2.6 Franchise and movie graph

```sql
create table franchise (
    franchise_id            bigint generated always as identity primary key,
    key                     text not null unique,
    name                    text not null,
    franchise_type          text not null -- collection, shared_universe, adaptation_series
);

create table movie_franchise (
    movie_id                bigint not null references movie(movie_id) on delete cascade,
    franchise_id            bigint not null references franchise(franchise_id) on delete cascade,
    sequence_number         numeric(8,3),
    membership_confidence   numeric(6,5) not null default 1.0,
    primary key (movie_id, franchise_id)
);

create table movie_relation (
    from_movie_id           bigint not null references movie(movie_id) on delete cascade,
    to_movie_id             bigint not null references movie(movie_id) on delete cascade,
    relation_type           text not null, -- sequel, prequel, remake, reboot, spin_off, crossover, similar
    confidence              numeric(6,5) not null check (confidence between 0 and 1),
    source_id               bigint references metadata_source(source_id),
    primary key (from_movie_id, to_movie_id, relation_type)
);
```

### 2.7 User preference evidence

Store both the user action and the inferred preference. A dislike of one movie should not automatically mean a dislike of every tag on that movie.

```sql
create table user_movie_event (
    user_id                 bigint not null,
    movie_id                bigint not null references movie(movie_id) on delete cascade,
    event_type              text not null, -- rating, like, dislike, play, complete, skip, save, hide
    value                   numeric(8,4),
    progress_fraction       numeric(6,5),
    occurred_at             timestamptz not null,
    context                 jsonb,
    primary key (user_id, movie_id, event_type, occurred_at)
);

create table user_tag_preference (
    user_id                 bigint not null,
    node_id                 bigint not null references taxonomy_node(node_id) on delete cascade,
    preference_score        numeric(10,6) not null default 0,
    preference_confidence   numeric(6,5) not null default 0,
    evidence_count          integer not null default 0,
    last_updated_at         timestamptz not null default now(),
    primary key (user_id, node_id)
);

create table user_person_preference (
    user_id                 bigint not null,
    person_id               bigint not null references person(person_id) on delete cascade,
    role                    text not null, -- actor, director, writer, composer
    preference_score        numeric(10,6) not null default 0,
    preference_confidence   numeric(6,5) not null default 0,
    primary key (user_id, person_id, role)
);
```

### 2.8 Derived features and search

For a catalog of millions of movies, materialize the features used by candidate generation and ranking:

```sql
create materialized view movie_recommendation_features as
select
    m.movie_id,
    m.release_date,
    m.runtime_minutes,
    m.original_language,
    coalesce(array_agg(mt.node_id order by mt.node_id)
             filter (where mt.assertion = 'present' and mt.confidence >= 0.55), '{}') as tag_ids,
    avg(mt.confidence) as mean_tag_confidence
from movie m
left join movie_tag mt on mt.movie_id = m.movie_id
group by m.movie_id;
```

Use PostgreSQL full-text or trigram search for titles, aliases, and descriptions. Use `pgvector` or an external vector index only as a complementary semantic feature. Embeddings should not replace controlled tags because they are harder to explain, calibrate, and constrain.

## 3. Assigning tags and confidence scores

### 3.1 Evidence sources

Use a source hierarchy, but do not assume that any single provider is always correct.

1. **Canonical provider metadata:** genres, runtime, release dates, languages, collections, and credits.
2. **Editorial curation:** human-reviewed themes, moods, and style descriptors for high-impact titles.
3. **User-generated tags:** useful for discovery and audience language, but normalize and de-duplicate them.
4. **Model extraction:** infer themes, moods, and style from synopsis, keywords, subtitles, reviews, trailers, or structured scene metadata.
5. **Behavioral evidence:** infer the user’s preference from ratings, completion, rewatch, saves, skips, hides, and search behavior.

TMDB’s keyword endpoint demonstrates why raw keywords are useful evidence rather than a finished taxonomy: they can include specific concepts such as dual identity, nihilism, dystopia, alter ego, and breaking the fourth wall [3].

### 3.2 Confidence model

Use confidence for **metadata certainty**, not user preference strength. A practical initial model is:

```text
confidence(tag, movie) =
    calibration(
        1 - product(1 - reliability(source_i) * evidence_confidence_i)
    )
```

Where:

- `reliability(source_i)` is learned or curated per source and field;
- `evidence_confidence_i` is the model or annotator’s confidence;
- correlated evidence is down-weighted;
- the result is calibrated against a held-out editorial set.

Recommended starting thresholds:

- `>= 0.85`: safe for hard filters and prominent explanations;
- `0.65–0.84`: use for ranking and secondary explanations;
- `0.45–0.64`: use as a weak feature or candidate evidence;
- `< 0.45`: retain for review, but do not expose or rank strongly.

`strength` and `confidence` should not be conflated. A movie can be confidently tagged `romance` with strength 0.9, or confidently tagged `friendship` with strength 0.35 because friendship is present but not central.

### 3.3 Tagging pipeline

1. **Ingest and normalize.** Map provider IDs, aliases, languages, credits, collections, and raw keywords.
2. **Map to existing nodes.** Prefer exact keys and reviewed aliases.
3. **Infer only missing dimensions.** Use models for themes, moods, and styles when structured data is insufficient.
4. **Apply co-occurrence and contradiction rules.** For example, `linear` and `non_linear` can coexist only if the movie uses a mixed structure; otherwise review the conflict.
5. **Aggregate evidence.** Produce `movie_tag` values and preserve all evidence rows.
6. **Calibrate.** Sample high-impact and high-uncertainty tags for editorial review.
7. **Monitor drift.** Watch tag prevalence, source disagreement, and recommendation lift.

### 3.4 Avoiding tag explosion

Use four gates before adding a new active node:

- **Distinct meaning:** it is not an alias or narrower wording of an existing node.
- **Catalog support:** it appears in enough movies to support learning, or is a high-value safety/filter concept.
- **User value:** offline or online tests show that it improves ranking, filtering, explanations, or discovery.
- **Governance:** it has a definition, examples, owner, aliases, and a retirement path.

Keep rare but useful concepts in a `candidate_taxonomy_node` table. Promote them only after review. Merge near-duplicates using aliases and parent nodes. Do not create tags from every noun, celebrity, location, or plot detail.

## 4. How tags should influence recommendations

### 4.1 Separate candidate generation from ranking

Use multiple candidate generators:

1. collaborative filtering from user–movie events;
2. content similarity from genres, themes, moods, styles, language, era, and runtime;
3. graph expansion from liked movies, franchises, cast, directors, and writers;
4. editorial or popularity candidates for cold start;
5. user query and explicit preference candidates.

Then blend and rank them. This prevents taxonomy errors from dominating the entire system and helps new movies with sparse metadata.

### 4.2 User preference inference

For a user event on movie `m`, update each tag `t` with a decayed contribution:

```text
contribution(u, t, event) =
    event_weight(event)
    × movie_tag_strength(m, t)
    × movie_tag_confidence(m, t)
    × time_decay(event_age)
    × novelty_adjustment
```

Example event weights:

- explicit rating above the user’s baseline: strong positive;
- explicit rating below baseline: strong negative;
- like or save: positive;
- completed watch: small positive, not proof of liking;
- rewatch: strong positive;
- early skip: negative evidence, but weaker than a dislike;
- hide: strong negative for the movie and relevant content tags;
- impression without interaction: exposure evidence, not a dislike.

This distinction matters because implicit feedback is missing-not-at-random: not watching a movie can mean dislike, lack of exposure, or lack of opportunity [7]. Do not treat every unplayed movie as a negative label.

A simple user-tag score is:

```text
P(u, t) =
    sum_over_events contribution(u, t, event)
    / (epsilon + sum_over_events evidence_weight(event))
```

Use a Bayesian or shrinkage estimator when the user has few events. Keep a separate uncertainty value so the system explores tags for which the user profile is not yet certain.

### 4.3 Content score

For a candidate movie `m`:

```text
content_score(u, m) =
    sum_t P(u, t) × movie_tag_strength(m, t)
                         × movie_tag_confidence(m, t)
                         × axis_weight(t)
```

Suggested starting axis weights:

- genre: 0.20;
- theme: 0.30;
- mood: 0.20;
- style: 0.15;
- language, era, and runtime fit: 0.10;
- audience and accessibility fit: 0.05.

These are initial priors, not permanent constants. Learn them per user segment or with a ranking model after collecting enough interaction data. Theme and mood often explain taste better than genre, but genre remains a strong cold-start feature.

### 4.4 Metadata and relationship score

Add separate, interpretable features:

```text
metadata_score(u, m) =
    w_language × language_fit(u, m)
  + w_runtime × runtime_fit(u, m)
  + w_era × era_fit(u, m)
  + w_franchise × franchise_fit(u, m)
  + w_people × people_fit(u, m)
  + w_availability × availability_fit(u, m)
```

The people score should be role-sensitive:

- director similarity is often more durable than one supporting actor;
- lead actor similarity can be strong for star-led preferences;
- writer and composer features are valuable for certain users;
- repeated collaboration can be a separate graph feature.

The franchise score should be asymmetric: liking one movie increases the probability of wanting related entries, but the effect should decay after several recommendations and should not override explicit dislikes.

### 4.5 Final ranking and constraints

A practical initial ranker is:

```text
base_score(u, m) =
    0.45 × collaborative_score(u, m)
  + 0.30 × content_score(u, m)
  + 0.15 × metadata_score(u, m)
  + 0.10 × exploration_score(u, m)
```

Then apply hard and soft constraints:

```text
final_score(u, m) =
    base_score(u, m)
  + freshness_bonus
  + availability_bonus
  - repetition_penalty
  - sensitivity_penalty
  - runtime_mismatch_penalty
  - already_seen_penalty
```

A hard constraint should be used only for an explicit user boundary, legal or product requirement, or parental setting. An inferred preference should normally be a soft penalty. Content safety filters should run before final ranking when the user explicitly excludes a category.

### 4.6 Diversity and serendipity

Pure tag similarity creates repetitive lists. Apply re-ranking such as maximal marginal relevance:

```text
rerank_score(m) =
    relevance(m)
  - lambda × max_similarity(m, selected_items)
```

Use diversity at the axis level:

- avoid ten movies with the same genre combination;
- include some theme or style variation;
- cap one franchise or director unless requested;
- preserve a few high-confidence comfort matches;
- reserve a small exploration portion for adjacent tags or under-exposed languages and eras.

The recommendation explanation should use the strongest, most certain evidence: “Because you liked slow-burn mysteries with unreliable narrators” is better than listing twelve weak tags.

### 4.7 Evaluation

Evaluate more than rating prediction:

- Recall@K and NDCG@K for ranking quality;
- completion rate and early abandonment;
- saves, rewatches, and hides;
- calibration of confidence and sensitivity flags;
- catalog coverage and long-tail exposure;
- diversity across genres, themes, style, language, era, and franchise;
- novelty and serendipity;
- explanation click-through or “why this?” satisfaction;
- complaint and filter-violation rate.

Use time-based splits for realistic evaluation. Do not allow future tags, ratings, or release metadata to leak into historical training examples.

## 5. Extensibility and governance

### 5.1 Adding a new tag

A new tag follows this lifecycle:

```text
candidate → reviewed → active → monitored → merged or retired
```

A candidate record should contain:

- proposed key and label;
- axis and parent;
- definition and counterexamples;
- aliases and source mappings;
- sample movies;
- expected user value;
- minimum support or safety justification;
- owner and review date.

Adding a node should not require a schema migration. `taxonomy_node` and `taxonomy_alias` are data-driven. Adding a new axis is rarer and should require a deliberate model and UI change.

### 5.2 Versioning

Version taxonomy definitions independently from movie assignments:

```sql
create table taxonomy_version (
    taxonomy_version_id    bigint generated always as identity primary key,
    version_name           text not null unique,
    created_at              timestamptz not null default now(),
    notes                   text
);

create table taxonomy_version_node (
    taxonomy_version_id    bigint not null references taxonomy_version(taxonomy_version_id),
    node_id                bigint not null references taxonomy_node(node_id),
    definition_snapshot    jsonb not null,
    primary key (taxonomy_version_id, node_id)
);
```

When merging two nodes, preserve old keys as aliases and record a migration map. Do not silently change the meaning of an existing key because it invalidates user profiles and historical experiments.

### 5.3 Monitoring thresholds

Monitor weekly:

- active node count by axis;
- movies per node and users influenced by node;
- source disagreement rate;
- average and distribution of confidence;
- tag assignment rate by model version;
- ranker lift for each axis;
- explanation acceptance and correction rate;
- false-positive rate for content sensitivity;
- duplicate and near-duplicate candidate nodes.

Retire or demote a tag when it has low support, low predictive value, high disagreement, or poor user comprehension. Keep historical assignments for reproducibility, but set `is_rankable = false` for retired concepts.

## 6. Recommended implementation order

### Phase 1: reliable foundation

Implement movies, titles, release date, runtime, original/spoken language, canonical genres, people and roles, collections, source mappings, and user events. These fields are available from common movie metadata systems and are easier to validate [1] [2] [4].

### Phase 2: curated recommendation features

Add the core themes, moods, and styles from the hierarchy. Start with around 40 themes, 25 moods, and 30 styles. Curate high-volume movies and infer the remainder with evidence and calibrated confidence.

### Phase 3: sensitivity and audience controls

Add market-specific certifications, sensitivity categories, explicit user boundaries, runtime preferences, subtitle/dubbing preferences, and family profiles. Keep these separate from general personalization.

### Phase 4: learned and behavioral ranking

Blend collaborative, content, graph, and exploration candidates. Learn axis weights and event weights from time-based experiments. Add vector similarity only after the controlled-feature baseline is measurable.

### Phase 5: taxonomy evolution

Promote candidate tags only when they are distinct, supported, explainable, and useful. Add taxonomy versioning, editorial review queues, source disagreement monitoring, and user correction controls.

## Recommended baseline

If implementation must begin immediately, use the following minimum feature set:

- 16–20 broad genres;
- 35–45 themes;
- 20–25 moods;
- 25–30 style tags;
- exact runtime plus six runtime buckets;
- exact release date plus era and recency;
- original language, spoken languages, subtitle/dubbing availability;
- collection, sequel, prequel, remake, and shared-universe edges;
- director, lead cast, writer, and composer relationships;
- nine sensitivity categories with severity and confidence;
- source evidence for every nontrivial tag;
- user preference vectors with time decay and uncertainty;
- hybrid ranking with diversity re-ranking.

This baseline is expressive enough to capture taste beyond genre without creating a flat, unmaintainable tag universe. It also supports explanations, filters, cold-start recommendations, future tag promotion, and controlled experimentation.

## References

[1]: https://developer.themoviedb.org/reference/movie-details "TMDB API: Movie Details"

[2]: https://developer.themoviedb.org/reference/movie-credits "TMDB API: Movie Credits"

[3]: https://developer.themoviedb.org/reference/movie-keywords "TMDB API: Movie Keywords"

[4]: https://files.grouplens.org/datasets/movielens/ml-32m-README.html "MovieLens 32M README"

[5]: https://grouplens.org/datasets/movielens/ "GroupLens: MovieLens datasets and Tag Genome"

[6]: https://www.imdb.com/title/tt1396484/parentalguide/ "IMDb Parents Guide: It"

[7]: https://pmc.ncbi.nlm.nih.gov/articles/PMC6453574/ "Modeling Dynamic Missingness of Implicit Feedback for Recommendation"

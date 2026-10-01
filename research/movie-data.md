# Movie Data Source Strategy for a Personalized Discovery App

**Decision status:** production-oriented research synthesis  
**Audience:** student team, technical lead, product owner, and counsel/vendor-licensing reviewer  
**Evidence convention:** **Verified** means stated in the cited public documentation or terms supplied for this review. **Uncertain** means not published, contract-dependent, variable by plan/territory, or requiring vendor confirmation. **Recommendation** means an engineering or product choice proposed in this report; it is not a grant of rights.

## 1. Executive decision

### Recommended student MVP

Build the student MVP around **TMDB for non-commercial presentation metadata and discovery**, optionally enrich identity and multilingual/open data with **Wikidata**, use **Wikimedia Commons only for individually rights-reviewed assets**, and add **Watchmode's free Developer plan only if the project is genuinely non-commercial and its current terms fit**. Keep availability optional; do not make it the product's legal source of truth. This combination is the shortest path to a functional prototype while keeping source identities, attribution, locale, and expiry explicit.

The MVP should:

1. Use TMDB movie IDs as a source identifier, not as the application's only primary key.
2. Request TMDB details, credits, keywords, images, release dates, and watch providers only as needed; use `append_to_response` where appropriate. TMDB's public API is free for non-commercial use with attribution, but the public terms are not a commercial license and prohibit several uses including resale, derivatives, long caching, and ML/AI applications [1][2][3][10].
3. Display TMDB's approved logo and the exact required notice: **“This [website, program, service, application, product] uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.”** Link the logo to TMDB [10][11].
4. If availability is shown, label it as country-specific and time-varying, show a checked-at timestamp, and link out. Watchmode's free plan is documented as 2,500 monthly API credits, non-commercial, up to three countries, with attribution; free-plan data must be refreshed or deleted within 30 days under its terms [34][35].
5. Keep user ratings, likes, watch history, and recommendation features in a separate first-party schema. Never merge a user's score with TMDB/IMDb/Watchmode ratings.
6. Avoid public IMDb TSV ingestion, OMDb as a durable commercial mirror, Letterboxd extraction, scraping, or JustWatch partner integration until written terms are in hand [13][14][29][47][48].

### Production recommendation

For a revenue-generating or public commercial application, treat licensing as a **release gate**. Obtain:

- A written TMDB commercial agreement if TMDB metadata, images, or TMDB-powered provider data remains in the product [10][12].
- An IMDb commercial content agreement if IMDb ratings, keywords, credits, images, or other IMDb content is retained [15].
- A JustWatch Partner agreement for broad, localized availability and branded outbound links, or a paid Watchmode agreement if Watchmode's catalog and terms fit [31][32][33][35].
- Separate image and certification rights where the upstream license does not cover display, transformation, CDN hosting, or redistribution.

Until agreements are executed, a commercial product may use only sources and fields whose applicable terms clearly permit the intended use. A source being technically reachable, free to query, or labeled Creative Commons does **not** by itself authorize building a commercial movie database.

## 2. What the sources can and cannot provide

A movie discovery product needs at least five separable data domains:

- **Identity and descriptive metadata:** titles, aliases, synopsis, runtime, languages, genres, keywords/themes, countries, release dates.
- **People and credits:** cast, character roles, directors, crew, ordering/billing where licensed.
- **Signals:** ratings, vote counts, popularity, chart rank, critic or editorial scores.
- **Rights and safety metadata:** jurisdictional certifications, descriptors, parental guidance, version/use.
- **Availability and artwork:** country-specific subscription/rent/buy/free offers, prices, provider links, posters, backdrops, logos, trailers.

These domains are not interchangeable. A TMDB `vote_average`, IMDb audience rating, Watchmode critic score, Common Sense age guidance, BBFC classification, and JustWatch streaming rank are different observations with different ownership, methodology, geography, and update schedules. Store them as source-specific facts with timestamps and provenance; do not calculate an apparently universal score by silently mixing them.

### Verified versus uncertain conclusions

| Area | Verified conclusion | Uncertainty or required confirmation |
|---|---|---|
| TMDB catalog | Details, genres, keywords, credits, release dates, images, languages, ratings, popularity, and regional watch-provider responses are documented endpoints/fields [4][5][6][7][8][9]. | Exact current quota is described only as an upper limit “somewhere in the 40 requests per second range”; it can change. Commercial price, SLA, and some image/upstream rights are not published [3][10]. |
| IMDb | Public TSV files are daily-refreshed and include title, name, credits, aliases, and ratings, subject to personal/non-commercial terms [13]. Commercial products/API are AWS Data Exchange/licensed offerings [15][16]. | Public documentation does not provide a general streaming-offer field, numeric API quota, guaranteed free tier, or blanket image redistribution right. |
| Wikidata/Commons | Wikidata structured data is open-oriented; claims carry qualifiers, references, and rank. Commons file rights are stated per file page [17][18][19][22][23]. | Community completeness and truth are not guaranteed. Commons provides no warranty that a file's license is correct; every asset needs review. |
| OMDb | REST search/detail lookup and an advertised 1,000 daily limit under the displayed account type are documented [27][28]. | Terms grant only personal, non-commercial use and restrict copying, archiving, indexing, and business use; no durable commercial cache, SLA, freshness, commercial grant, or complete response schema is confirmed [29]. |
| JustWatch | Contracted Partner API supports locale-specific title lookup by JustWatch, IMDb, or TMDB IDs and offers with provider, monetization, price, currency, presentation, and click links [31]. | Public docs do not state a free tier, price, quota, cache period, or general redistribution permission. A partner token follows a contract; mandatory branded country-specific links apply [31][32]. |
| Watchmode | Product docs describe country-filtered sources for subscription, rent, buy, free, and TV catalogs; free Developer terms describe 2,500 monthly credits, up to three countries, and non-commercial use [33][34]. | Credit cost by endpoint, image rights, and some limits vary by plan/source. Third-party image URLs are not necessarily licensed and hotlinking is prohibited [35]. |
| MPA/CARA | Official ratings guide documents G, PG, PG-13, R, and NC-17 plus descriptors and a searchable rating record [36]. | No public movie catalog/streaming API was found; site content is limited to internal non-commercial use absent written permission [37]. |
| BBFC | Release pages expose classification, version/use, territory context, descriptors, director, cast, genres, runtime, date, and distributor [38]. | Cinema ratings cannot be assumed valid for streaming. A film-information app needs a Data Service Agreement; fees and feed scope are contract-dependent [39][40]. |
| Common Sense Media | API v3 exposes editorial age rating, content grid, topics/themes, parent guidance, metadata, and deltas; partnership key is required [41][42]. | The current overview states 100 unique requests/minute while an older overview says 5/minute; the signed agreement controls. Commercial display, retention, attribution, and image rights need contract language [43]. |
| Trakt | API documents titles, IDs, aliases, releases, translations, genres, ratings, votes, images, credits, and trending/popular endpoints; 1,000 GETs/5 minutes is documented [45]. | General terms are personal/non-commercial and restrict copying/mirroring/sublicensing. No separate commercial cache grant was found [46]. |
| Letterboxd | API access is request-only; the official page says it is not currently granting access for recommendation/data-analysis projects [47]. | Terms prohibit significant-content indexing, competing services, and automated extraction; do not use it as a backend source without explicit approval [48]. |
| Fanart.tv | API is an ID-keyed image enrichment service with categories, language, dimensions, likes, and timestamps [49]. | Copyright remains with respective image owners. The API/Creative Commons language is not a blanket commercial image license [50]. |
| MovieGlu | Theatrical now-showing, coming-soon, cinema, showtime, image, and trailer data are documented; territory/geolocation/device time may be required [51]. | Evaluation terms restrict public release and server storage; device caching is tied to `Expires`; production requires contact [52]. |
| Utelly | Advertises third-party-ID/title search, streaming-service aggregation, and US/UK trends [53]. | Public information does not specify quota, cache, attribution, or commercial redistribution rights; require RapidAPI or enterprise review. |
| Movie of the Night | Documents 65 countries, title IDs, metadata, and country-specific offers; terms permit commercial apps with attribution and functional local storage [54][55]. | Image URLs last approximately six months to one year, free image bandwidth is limited, third-party artwork/logos are not provider-licensed, and standalone redistribution/competing products are restricted [54][55]. |

## 3. Provider-by-provider comparison

| Provider/source | Best production role | Useful verified data | Availability / rating signal | Commercial posture | MVP decision |
|---|---|---|---|---|---|
| **TMDB** | Primary discovery/catalog enrichment after agreement | Movie details, aliases, genres, keywords, credits/director, release dates/certifications, languages, images, external IDs, popularity, vote average/count | Region-keyed provider response powered by JustWatch; TMDB rating/popularity are TMDB signals, not certifications | Free non-commercial with attribution; commercial use requires written agreement; six-month maximum cache and purge-on-termination constraints [10] | **Use for student MVP** with attribution and no commercial launch; commercial agreement before monetization |
| **IMDb datasets/API** | Licensed high-quality title/person/ratings enrichment | Daily TSV title/name/credits/aliases/ratings; richer commercial dictionary/API; image references | IMDb audience rating/votes; no documented general provider-offer field | Public datasets are personal/non-commercial; production needs written license, including image/caching/redistribution terms [13][14][15] | Do not make public TSV the production database; consider only under permitted coursework use |
| **Wikidata** | Open identity, multilingual labels, claims, cross-links | Q-IDs, labels, aliases, statements, qualifiers, references, rank; P31/P136/P921/P161/P57/P577/P364/P495/P2047 | No authoritative current rating/popularity/availability | Structured data is CC0/public-domain-oriented; preserve claim provenance and revision [17][18][19] | **Use selectively** for open enrichment and ID resolution |
| **Wikimedia Commons** | Rights-reviewed supplemental imagery | File metadata, captions, creator, license, source, dimensions, hashes, thumbnails | None | Per-file license; comply with attribution/share-alike/modification terms; Wikimedia gives no warranty [22][23] | Optional; rights-review queue required |
| **OMDb** | Prototype IMDb-ID lookup/search | Basic title, year, plot, genre, director, cast, ratings, poster URL, box office (response shape must be contract-tested) | Ratings array may contain upstream source labels; no provider offers/popularity field | Personal/non-commercial terms; no confirmed commercial mirror/cache rights [27][29] | Prototype only; not a commercial foundation |
| **JustWatch** | Contracted localized availability and streaming ranks | Offer/provider, monetization, presentation, prices, currencies, dates, links; title metadata and rank windows | Strong availability layer; country/locale-specific | Partner contract/token; branded country-specific JustWatch link required; public terms incomplete [31][32] | Defer until partner agreement |
| **Watchmode** | Self-serve availability for a non-commercial MVP; paid production option | Sources, providers, deeplinks, regions; title detail includes ratings, content ratings, images, similar titles, cast/crew | Subscription/rent/buy/free/TV sources; user/critic/popularity percentile metrics | Free plan non-commercial, 2,500 credits/month, max three countries; free data refresh/delete within 30 days; paid terms apply [33][34][35] | **Optional for student MVP**, upgrade/replace before monetization |
| **MPA/CARA** | US certification reference | Rating, year, certificate number, descriptors | Jurisdictional certification, not a universal age score | Internal non-commercial site use; written permission needed for reuse [36][37] | Link out or license; do not scrape/build mirror |
| **BBFC** | UK classification and content advice | Classification, version/use, descriptors, director, cast, genres, runtime, distributor | Version- and use-specific cinema/physical/VOD records | DSA/licences; verbatim display, accuracy, branding, updates, and redistribution restrictions [39][40] | Add only after DSA; never reuse cinema rating for streaming automatically |
| **Common Sense Media** | Editorial parental guidance | Age rating, content-grid categories, topics/themes, parent guidance, talking points | Editorial guidance, not statutory certificate | Partnership API key; agreement controls commercial rights, retention, display, and rate limits [41][42][43] | Later phase if parents/safety is core |
| **Trakt** | Licensed social/catalog signal | Ratings, votes, popularity/trending, releases, translations, images, credits | Community/user ratings and trends | General terms personal/non-commercial; written permission needed [45][46] | Avoid until commercial permission |
| **Letterboxd** | Not presently suitable as an API backend | Film pages and user/community data are not an approved source for this use | User ratings/lists/popularity not licensed for this project | Access request-only and current exclusion for recommendation projects [47][48] | Do not use |
| **Fanart.tv** | Optional artwork enrichment | ID-keyed posters/backgrounds/logos, language, dimensions, likes | None | Asset-specific copyright permission required [49][50] | Do not rely on without asset-level rights |
| **MovieGlu** | Theatrical/cinema availability | Cinemas, showtimes, now/coming soon, images/trailers | Theatre schedules, not streaming | Production terms/contact; cache linked to expiry [51][52] | Only if theatrical discovery is in scope |
| **Utelly** | Contract-dependent aggregation | Title/third-party ID lookup and trends advertised | Streaming aggregation | Public commercial/caching terms insufficient | Investigate only after contract review |
| **Movie of the Night** | Alternative commercial availability source | Country offers, service, deeplink, price, quality, audio/subtitles, IDs, metadata | Broad regional availability | Commercial apps permitted with attribution, functional storage; restrictions and image caveats apply [54][55] | Consider as a paid/contracted Watchmode alternative |

## 4. Data architecture

### 4.1 Design principles

1. **Canonical internal identity:** use an application UUID (`movie_id`) as the primary key. Store TMDB `id`, IMDb `tconst`, Wikidata Q-ID, JustWatch ID, Watchmode ID, and other IDs as nullable, source-scoped mappings.
2. **Source-scoped facts:** never overwrite a TMDB rating with an IMDb rating or a BBFC classification with a CSM age recommendation.
3. **Provenance at field or row-family level:** retain source, endpoint/product, source identifier, retrieval time, locale/region, source revision, license profile, expiry, and raw hash.
4. **Claims, not silent truth:** Wikidata statements retain property, value, qualifiers, references, and rank. Conflicts go to a review queue.
5. **Availability is an offer, not a title attribute:** key it by movie, region, provider, monetization type, presentation/quality, and valid/fetched timestamps.
6. **Artwork is a rights object:** store the asset's source page, creator, license, attribution text, hash, dimensions, and review status—not just a URL.
7. **User data is separate:** user preferences, feedback, ratings, and watch history are first-party data and must not be confused with vendor metrics.

### 4.2 Actionable Postgres schema example

The following is an illustrative starting point, not a substitute for a vendor's contract:

```sql
create table movie (
  movie_id uuid primary key,
  canonical_title text not null,
  original_title text,
  media_type text not null check (media_type in ('movie','series','episode','unknown')),
  release_year smallint,
  runtime_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table source_identity (
  movie_id uuid not null references movie(movie_id),
  source text not null,
  external_id text not null,
  object_type text not null,
  locale text,
  is_primary boolean not null default false,
  remapped_to text,
  confidence numeric(4,3),
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  primary key (source, external_id, object_type),
  unique (movie_id, source, object_type)
);

create table field_provenance (
  provenance_id bigserial primary key,
  movie_id uuid references movie(movie_id),
  source text not null,
  source_id text,
  endpoint_or_product text not null,
  field_path text not null,
  locale text,
  region text,
  retrieved_at timestamptz not null,
  observed_at timestamptz,
  expires_at timestamptz,
  license_profile text,
  raw_sha256 bytea,
  value_json jsonb not null
);

create table credit (
  credit_row_id bigserial primary key,
  movie_id uuid not null references movie(movie_id),
  source text not null,
  credit_id text,
  person_external_id text not null,
  person_name text,
  department text,
  job text,
  character_name text,
  billing_order integer,
  qualifiers jsonb,
  source_retrieved_at timestamptz not null
);

create unique index credit_identity_uq on credit (
  movie_id, source, person_external_id,
  coalesce(credit_id, ''), coalesce(character_name, '')
);

create table rating_snapshot (
  movie_id uuid not null references movie(movie_id),
  source text not null,
  metric text not null,
  value numeric,
  vote_count integer,
  region text,
  locale text,
  observed_at timestamptz not null,
  expires_at timestamptz,
  raw jsonb,
  primary key (movie_id, source, metric, observed_at)
);

create table certification (
  movie_id uuid not null references movie(movie_id),
  source text not null,
  territory char(2) not null,
  scheme text not null,
  certification text not null,
  descriptor text,
  version_or_use text,
  classified_at date,
  source_url text,
  retrieved_at timestamptz not null,
  primary key (movie_id, source, territory, scheme, version_or_use)
);

create table availability_offer (
  offer_id bigserial primary key,
  movie_id uuid not null references movie(movie_id),
  source text not null,
  source_offer_id text,
  region char(2) not null,
  provider_id text,
  provider_name text,
  monetization_type text not null,
  presentation_type text,
  price numeric,
  currency char(3),
  click_url text,
  provider_link text,
  valid_from timestamptz,
  valid_to timestamptz,
  fetched_at timestamptz not null,
  expires_at timestamptz,
  attribution_required boolean not null default false,
  raw jsonb,
  unique (source, source_offer_id, region, monetization_type)
);

create table image_asset (
  asset_id bigserial primary key,
  movie_id uuid not null references movie(movie_id),
  source text not null,
  source_file_id text,
  asset_kind text not null,
  source_url text,
  description_url text,
  storage_url text,
  sha256 bytea,
  width integer,
  height integer,
  language char(2),
  creator text,
  license_code text,
  license_url text,
  attribution_text text,
  rights_status text not null default 'review_required',
  retrieved_at timestamptz not null,
  expires_at timestamptz
);

create table ingestion_batch (
  batch_id uuid primary key,
  source text not null,
  product_or_endpoint text not null,
  source_revision text,
  started_at timestamptz not null,
  completed_at timestamptz,
  raw_location text,
  license_profile text not null,
  content_hash bytea,
  status text not null
);

create table user_movie_signal (
  user_id uuid not null,
  movie_id uuid not null references movie(movie_id),
  signal_type text not null,
  value numeric,
  created_at timestamptz not null default now(),
  primary key (user_id, movie_id, signal_type)
);
```

**Implementation note:** PostgreSQL does not allow `coalesce()` directly in a normal primary-key definition. In production, use a generated normalized credit key, a nullable-safe unique index, or make `credit_id` non-null through an ingestion-generated surrogate. The example is intentionally explicit about the desired uniqueness rule and should be adjusted before migration.

### 4.3 Identity resolution

Resolve in this order:

1. Exact source ID (`tmdb_id`, `tt...`, Q-ID, Watchmode/JustWatch ID).
2. Cross-source ID returned by an authoritative endpoint.
3. Normalized title + media type + release year/date + runtime, with director/cast corroboration.
4. Manual review for collisions, remaps, remakes, regional titles, series-versus-film conflicts, and re-releases.

Keep IMDb `remappedTo`, Wikidata entity revision, and all alternate titles rather than deleting the original identifier. Never merge on title alone. Store an identity-match decision and confidence so an operator can reverse it.

## 5. Ingestion strategy

### 5.1 Adapter pipeline

Use one server-side adapter per source with a common envelope:

```json
{
  "source": "tmdb",
  "endpoint_or_product": "movie-details",
  "source_id": "550",
  "locale": "en-US",
  "region": "US",
  "retrieved_at": "2026-01-01T00:00:00Z",
  "source_revision": null,
  "license_profile": "tmdb-noncommercial-prototype",
  "expires_at": "2026-06-30T00:00:00Z",
  "raw_sha256": "...",
  "payload": {}
}
```

The flow should be:

1. **Discover/resolve:** search a source or ingest a user-supplied ID.
2. **Stage raw response:** restricted JSONB/object storage, with hash, endpoint, locale, region, and license profile.
3. **Validate:** schema and required-ID checks; detect type changes, duplicate IDs, unexpected nulls, and provider errors.
4. **Normalize:** upsert canonical movie/source identities and source-specific child tables.
5. **Promote atomically:** swap the batch into read models only after validation.
6. **Record provenance:** every source-derived field points to its batch/row provenance.
7. **Expire or purge:** a scheduled job removes or invalidates data at `expires_at`, at contract cancellation, or on takedown request.

IMDb commercial bulk guidance specifically supports staged/versioned ingestion because short-lived cross-file inconsistencies can occur. The same staging-plus-atomic-promotion pattern is prudent for all providers [15][16].

### 5.2 Source-specific ingestion

- **TMDB:** Fetch details plus credits/keywords/images/release dates on demand. Use `append_to_response` for compatible same-namespace endpoints, deduplicate concurrent requests, and use the change endpoint for incremental refresh. Store image paths and authorized URLs; construct image URLs from the returned configuration rather than hard-coding a size [4][6][7][8].
- **IMDb:** If a licensed commercial bulk product is purchased, stage a revision, validate cross-file IDs, then promote. For public TSVs, isolate any permitted coursework copy from a production database; do not republish or use it as a commercial catalog [13][14].
- **Wikidata:** Start with narrow ID/API lookups and batched claims. Retain statements, qualifiers, references, rank, entity revision, and retrieval time. Defer full dumps/SPARQL until scale requires them; weekly entity dumps and incremental dumps are available [17][19].
- **Commons:** Query only needed imageinfo/extmetadata keys because extmetadata is expensive. Put every file in `review_required` until its description page, license, creator, source, and intended use are verified [22][23].
- **Watchmode/JustWatch/Movie of the Night:** Refresh offers independently from descriptive metadata. Preserve provider/region/monetization/presentation/price/click URL and source timestamps. Never infer that an absent offer means the film is unavailable.
- **Certifications and editorial guidance:** Store source, territory, version/use, exact rating text/descriptor, classification date, and last verified time. Do not collapse MPA, BBFC, CSM, IMDb certificate data, and user safety preferences into one `age_rating` column.

### 5.3 Refresh policy

| Data class | Starting refresh policy | Reason / caveat |
|---|---|---|
| Canonical IDs and stable titles | On demand plus weekly or source-change refresh | Stable, but remaps and corrections occur. |
| Credits, genres, keywords | Weekly to monthly; on demand for viewed titles | More stable than offers, but source edits occur. |
| Popularity, votes, charts | Daily or short TTL | Metrics are time-varying and source-specific. |
| Release dates/certifications | On change or weekly during release windows | Territory, version, and re-release changes matter. |
| Streaming offers/prices | Daily to several times per day where contract/credits allow | Availability and price are volatile; retain checked-at. |
| Artwork | On reference change; revalidate rights and URL | URLs, licenses, takedowns, and upstream assets can change. |
| Wikimedia API responses | Conditional GET with ETag/Last-Modified | Use caching and 304 revalidation [24][25]. |

## 6. Legal and licensing considerations

This report is an engineering strategy, not legal advice. Before launch, have counsel or the vendor provide a written interpretation of the exact product, territory, user volume, display, caching, derived-feature, image, attribution, deletion, and termination rights.

### TMDB

Verified public terms: free developer access is for non-commercial use with attribution; commercial use requires contacting sales/obtaining a separate agreement. The license is non-exclusive, non-transferable, and non-sublicensable. Terms prohibit caching TMDB information over six months, derivatives, resale/lease/sublicensing, misleading source presentation, use as an image host for banner ads, excessive bandwidth, and ML/AI training or AI-based applications. On termination, TMDB requires cessation and purge of cached content [1][2][10][12].

**Operational consequence:** a student prototype can use TMDB only within the non-commercial scope and attribution rules. A personalized commercial or AI-based recommendation app should not launch on the public terms alone. Treat the commercial agreement as a prerequisite.

### IMDb

Verified public dataset permission is personal/non-commercial; scraping, robots, alteration, republication, resale, and repurposing into an online/offline movie database are restricted. The public acknowledgement is **“Information courtesy of IMDb (https://www.imdb.com). Used with permission.”** Commercial products/API and richer fields require an agreement. Image URLs do not imply a right to copy, host, transform, or redistribute [13][14][15][16].

**Operational consequence:** do not present the public daily TSV as a free commercial catalog. If licensed, record product, revision, effective date, fields, image rights, retention, and deletion obligations.

### Wikidata and Wikimedia Commons

Wikidata structured data is generally CC0/public-domain-oriented, while prose and other namespaces may be CC BY-SA; retain license metadata. Commons files are individually licensed, commonly CC BY/CC BY-SA/public domain, and reuse requires the applicable attribution, license-link, modification, and ShareAlike obligations. Wikimedia warns it provides no warranty that a file's copyright status is correct [17][18][22][23].

**Operational consequence:** open structured metadata is appropriate for enrichment, but Commons artwork requires per-file review. Store creator, source page, license URL/code, attribution, modification notes, and takedown state.

### OMDb

The current key page displays a 1,000-daily-limit account type, but the terms grant use/copy of contributions solely for personal, non-commercial purposes and restrict copying, downloading, archiving, distribution, indexing, commercial use, and building a business on the contributions [27][28][29]. The CC BY-NC link does not override stricter OMDb terms or upstream rights [30].

**Operational consequence:** use OMDb only for a non-commercial prototype or after written commercial, caching, poster, attribution, and upstream-rights confirmation. Do not create a durable commercial mirror by default.

### Availability sources

- **JustWatch:** partner token follows a contract; public docs require branded, country-specific JustWatch links beside integrations. Public docs do not establish general redistribution, caching, free-tier, or pricing rights [31][32].
- **Watchmode:** free Developer access is non-commercial and limited; non-image data may be used in an owned app under plan terms, but resale/third-party sharing is prohibited, free data has a 30-day refresh/deletion rule, and images may be third-party/unlicensed. Hotlinking is prohibited [33][34][35].
- **Movie of the Night:** commercial apps are permitted subject to attribution and other terms; functional local storage is allowed, but standalone redistribution/competing products and third-party artwork rights remain restricted [54][55].
- **MovieGlu:** evaluation and production terms are separate; cache schedules must honor `Expires`, and public release/server storage may be restricted [51][52].

### Certifications and editorial guidance

MPA/CARA, BBFC, Common Sense Media, and IMDb certificates should be displayed as **source- and territory-specific records**, not universal legal truth. BBFC requires appropriate licensing for film-information apps and distinguishes cinema, physical, VOD, and streaming versions. Common Sense content is editorial guidance, not a statutory certificate. MPA site terms do not authorize commercial copying [36][37][39][40][41][43].

## 7. Rate-limit and reliability strategy

Implement a connector-specific scheduler rather than one global request loop:

1. **Token bucket per provider and credential.** Configure capacity and refill from the current contract/docs. Never hard-code a quota as permanent.
2. **Bounded concurrency.** Start conservatively (for example, 2–8 concurrent requests per provider) and raise only after observing headers and vendor guidance.
3. **Single-flight deduplication.** Coalesce concurrent requests for the same source ID, endpoint, locale, region, and field set.
4. **Batching.** Use TMDB append-to-response; IMDb GraphQL field selection/multi-entity queries; Wikimedia batched requests; source-supported bulk revisions.
5. **Retry policy.** Retry 429, 408, and transient 5xx with exponential backoff and full jitter. Honor `Retry-After`; do not retry authentication, license, or schema errors blindly.
6. **Circuit breaker and stale-while-revalidate.** Serve a labeled last-known-good response when permitted, while a background worker retries. Do not hide stale offers or certifications.
7. **Observability.** Record request count, latency, status, provider, endpoint, quota headers, retry count, cache hit/miss, and source revision. Alert before quota exhaustion.
8. **Backfill queue.** Prioritize titles viewed, searched, or needed for a recommendation; do not bulk scrape the entire catalog.

Known documented examples:

- TMDB: legacy 40 requests/10 seconds is disabled; current guidance says an upper limit is somewhere around 40 requests/second and may change; respect 429 [3].
- OMDb: current page displays 1,000 requests/day for the shown free account type; no official per-second quota was found [28].
- Wikimedia: no single app-style quota; use descriptive User-Agent/contact, gzip, conservative batching, `maxlag` for background work, and backoff/`Retry-After` [24][26].
- Watchmode: 2,500 monthly credits on the free Developer plan, with endpoint credit costs subject to plan/docs [34].
- Trakt: 1,000 GET calls per five minutes, one write per second, 429 and rate headers documented [45].
- Common Sense Media: current v3 materials say 100 unique requests/minute; an older overview says 5/minute. Treat the signed partnership agreement as authoritative [41][43].
- JustWatch, Movie of the Night, Utelly, and commercial IMDb products: use contract/credential-specific limits; public pages do not establish a universal quota.

## 8. Caching strategy

Use a `cache_entry` abstraction with `source`, `source_id`, endpoint/field set, locale, region, fetched time, `expires_at`, `etag`, `last_modified`, raw hash, license profile, and purge status. Separate **operational cache** from **permanent application records**; a cache entry is not automatically a right to retain the underlying content.

Recommended starting rules:

- **TMDB:** never retain TMDB information over six months; prefer much shorter TTLs for popularity and offers. Purge all content on termination [10].
- **Watchmode:** free-plan data must be refreshed or deleted within 30 days; paid-plan storage follows the active subscription and current-data conditions; delete on cancellation [35].
- **JustWatch:** public docs do not disclose TTL/redistribution rules; default to short-lived offer cache plus outbound link until the partner contract says otherwise [31][32].
- **Movie of the Night:** refresh image URLs within the documented approximate six-to-twelve-month life and enforce free image-bandwidth limits; retain only what the terms permit [54][55].
- **MovieGlu:** honor response `Expires`; do not use an expired showtime as current inventory [51][52].
- **Wikimedia:** use ETag/Last-Modified conditional requests and retain only rights-cleared files under the project's operational retention policy [24][25].
- **IMDb/OMDb/Trakt:** do not assume a durable cache or database-mirroring right from public access. Cache only under the applicable license/terms.

When a source is stale, display **“last checked [timestamp]”**, not a current-availability claim. For provider offers, allow the UI to say “No verified offer returned for this region at last check” rather than “not available.”

## 9. Data not to permanently store by default

Unless a written license explicitly permits it, do **not** permanently store or redistribute:

- Raw TMDB, IMDb, OMDb, Trakt, Watchmode, JustWatch, or other provider payloads beyond the applicable retention window.
- A full cross-source movie database assembled from public non-commercial files or APIs.
- Posters, backdrops, logos, headshots, trailers, or provider logos merely because a URL was returned.
- Commons files without a recorded license/creator/source review.
- Watch-provider prices/offers as evergreen facts or a promise of entitlement.
- Certification or editorial text copied into a new universal “age rating” field without the source, territory, version/use, and terms.
- Provider-specific user reviews, social ratings, charts, or popularity data under an unlicensed derivative schema.
- Embeddings, recommendation training sets, or other derivatives where the source terms prohibit AI/ML use or derivatives; TMDB's public terms are especially restrictive [10].
- API keys, partner tokens, AWS credentials, or personally identifying user data in raw snapshots/logs.

What may be retained is contract-dependent. A prudent default is to store stable source IDs, minimal normalized facts needed for the user-visible feature, field provenance, short-lived cache metadata, and outbound links—then delete raw content and assets when the license, TTL, takedown, or termination rule requires it.

## 10. Rollout phases

### Phase 0 — rights and scope gate

- Define whether the project is coursework, private research, public non-commercial, or revenue-generating.
- Decide whether personalization is deterministic rules or ML/AI; re-check TMDB terms before using any TMDB-derived data in an AI-based application.
- Create a source register with owner, field, territory, license profile, attribution, TTL, deletion, and contact.
- Obtain written vendor confirmation before relying on uncertain caching, commercial use, image rights, or redistribution.

### Phase 1 — student prototype (non-commercial)

- TMDB details/credits/keywords/images/release dates with required attribution.
- Internal UUID plus TMDB IDs and optional Wikidata Q-IDs.
- Optional Commons thumbnail only after license review.
- Optional Watchmode availability in at most three countries and within 2,500 monthly credits, with 30-day refresh/delete discipline.
- Basic user preference tables; no public IMDb/OMDb/Trakt mirror.
- Manual audit of 50–100 titles for identity, locale, artwork, and availability freshness.

### Phase 2 — controlled beta

- Add adapter isolation, staging, provenance UI, request metrics, retry/circuit-breakers, and purge jobs.
- Add parent/safety data only after CSM/BBFC/MPA rights and field scope are confirmed.
- Add Watchmode paid plan or another contracted availability source; show source badges and checked-at timestamps.
- Implement identity review tooling for remakes, releases, series/episode collisions, and title aliases.

### Phase 3 — production launch

- Execute TMDB commercial agreement, or replace TMDB fields with a licensed commercial catalog.
- License IMDb content only if the product requires IMDb-specific ratings, keywords, credits, or images.
- Contract JustWatch for broad offer coverage and branded links, or finalize a paid Watchmode/Movie of the Night arrangement.
- Perform image-rights and certification-rights review by territory.
- Implement data export/purge on termination, takedown workflow, audit logs, and a quarterly terms/quota review.

### Phase 4 — scale and optimization

- Move from on-demand enrichment to change feeds/bulk revisions where licensed.
- Add read models for search and recommendations without copying restricted raw datasets.
- Use provider-specific freshness scoring, not a universal “availability confidence.”
- Reconcile provider discrepancies with source-specific display, manual review, and explainable user-facing provenance.

## 11. Final recommendation

For a student MVP, **TMDB + careful Wikidata enrichment + optional Watchmode availability** is the most practical stack. It gives enough title, genre, keyword, credit, image-reference, language, release, and regional availability capability without building a scraper. Use TMDB only as permitted for a non-commercial project, ship its exact attribution/non-endorsement notice, keep Watchmode within its free-plan limits and deletion rule, and treat Wikidata/Commons as open/rights-reviewed enrichment rather than a ratings or streaming system.

For a commercial app, do not rely on the public/free terms as a production license. Make the launch conditional on signed rights for catalog fields, images, ratings, availability, retention, attribution, derived features, and termination. Build the provider-agnostic Postgres model now so that TMDB, IMDb, JustWatch, Watchmode, Movie of the Night, BBFC, CSM, and future sources can be replaced or added without changing the user model.

## References

[1] TMDB, “Getting Started,” https://developer.themoviedb.org/docs/getting-started  
[2] TMDB, “API FAQ,” https://developer.themoviedb.org/docs/faq  
[3] TMDB, “Rate Limiting,” https://developer.themoviedb.org/docs/rate-limiting  
[4] TMDB, “Movie Details,” https://developer.themoviedb.org/reference/movie-details  
[5] TMDB, “Movie Credits,” https://developer.themoviedb.org/reference/movie-credits  
[6] TMDB, “Movie Keywords,” https://developer.themoviedb.org/reference/movie-keywords  
[7] TMDB, “Movie Release Dates,” https://developer.themoviedb.org/reference/movie-release-dates  
[8] TMDB, “Movie Images / Image Basics / Configuration Details,” https://developer.themoviedb.org/reference/movie-images ; https://developer.themoviedb.org/docs/image-basics ; https://developer.themoviedb.org/reference/configuration-details  
[9] TMDB, “Movie Watch Providers,” https://developer.themoviedb.org/reference/movie-watch-providers  
[10] TMDB, “API Terms of Use,” https://www.themoviedb.org/api-terms-of-use  
[11] TMDB, “Logos and Attribution,” https://www.themoviedb.org/about/logos-attribution  
[12] TMDB, “API for Business,” https://www.themoviedb.org/api-for-business  
[13] IMDb, “Non-Commercial Datasets,” https://developer.imdb.com/non-commercial-datasets/  
[14] IMDb, “Can I use IMDb data in my software?,” https://help.imdb.com/article/imdb/general-information/can-i-use-imdb-data-in-my-software/G5JTRESSHJBBHTGX  
[15] IMDb, “Content Licensing,” https://help.imdb.com/article/imdb/general-information/content-licensing/GZGA5HDQ8NE97LVR  
[16] IMDb, “Developer / API Documentation,” https://developer.imdb.com/ ; https://data.imdb.com/documentation/api-documentation/  
[17] Wikidata, “Data Access,” https://www.wikidata.org/wiki/Wikidata:Data_access  
[18] Wikidata, “Licensing,” https://www.wikidata.org/wiki/Wikidata:Licensing  
[19] Wikidata, “Database Download,” https://www.wikidata.org/wiki/Wikidata:Database_download  
[20] Wikibase, “Data Model Primer,” https://www.mediawiki.org/wiki/Wikibase/DataModel/Primer  
[21] Wikidata, property pages for genre, cast, director, release date, https://www.wikidata.org/wiki/Property:P136 ; https://www.wikidata.org/wiki/Property:P161 ; https://www.wikidata.org/wiki/Property:P57 ; https://www.wikidata.org/wiki/Property:P577  
[22] Wikimedia Commons, “Structured Data / API,” https://commons.wikimedia.org/wiki/Commons:Structured_data ; https://commons.wikimedia.org/wiki/Commons:API  
[23] Wikimedia Commons, “Licensing and Reusing Content,” https://commons.wikimedia.org/wiki/Commons:Licensing ; https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia  
[24] Wikimedia, “API Access Policy / Etiquette,” https://www.mediawiki.org/wiki/Wikimedia_APIs/Access_policy ; https://www.mediawiki.org/wiki/API:Etiquette  
[25] Wikimedia, “Conditional Requests,” https://www.mediawiki.org/wiki/Wikimedia_APIs/Conditional_requests  
[26] Wikimedia, “API Rate Limits FAQ,” https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits/FAQ  
[27] OMDb, “The Open Movie Database,” http://www.omdbapi.com/  
[28] OMDb, “API Key,” https://www.omdbapi.com/apikey.aspx  
[29] OMDb, “Terms / Legal,” https://www.omdbapi.com/legal.htm  
[30] Creative Commons, “Attribution-NonCommercial 4.0,” https://creativecommons.org/licenses/by-nc/4.0/  
[31] JustWatch, “Partner API Documentation,” https://apis.justwatch.com/docs/api/ ; https://apis.justwatch.com/docs/api/reference/  
[32] JustWatch, “Widget Terms and Conditions,” https://apis.justwatch.com/docs/widget/terms_and_conditions/  
[33] Watchmode, “API Documentation,” https://api.watchmode.com/ ; https://api.watchmode.com/docs/  
[34] Watchmode, “Request API Key / Developer Plan,” https://api.watchmode.com/requestApiKey/  
[35] Watchmode, “Terms and Conditions,” https://api.watchmode.com/tc  
[36] MPA/CARA, “Ratings Guide,” https://www.filmratings.com/ratings-guide/  
[37] MPA/CARA, “Terms of Use,” https://www.filmratings.com/terms-of-use/  
[38] BBFC, “Release Information Example,” https://www.bbfc.co.uk/release/dr-seuss-the-lorax-q29sbgvjdglvbjpwwc0zodkwotm  
[39] BBFC, “VOD and Streaming Services,” https://www.bbfc.co.uk/using-a-bbfc-age-rating/vod-and-streaming-services  
[40] BBFC, “Data Services Agreement,” https://darkroom.bbfc.co.uk/original/c72d4758a7d39d6ec97bc88dac3add95:64e2d83ea63ca9449cd5fda2d78d1f1a/bbfc-data-services-agreement-04022021-final.pdf  
[41] Common Sense Media, “API v3,” https://www.commonsensemedia.org/developers/api/v3  
[42] Common Sense Media, “API v3 Implementation Guide,” https://www.commonsensemedia.org/developers/api/v3/implementation-guide  
[43] Common Sense Media, “Terms of Use / API Overview,” https://www.commonsensemedia.org/about-us/our-mission/site-terms-use ; https://www.commonsensemedia.org/developers/api-overview  
[44] Common Sense Media, “Our Ratings Methodology,” https://www.commonsensemedia.org/about-us/our-mission/about-our-ratings  
[45] Trakt, “API Documentation,” https://trakt.docs.apiary.io/ ; https://trakt.docs.apiary.io/reference/movies/summary/get-a-movie-summary  
[46] Trakt, “Terms,” https://app.trakt.tv/terms  
[47] Letterboxd, “API Beta / Film Data,” https://letterboxd.com/api-beta/ ; https://letterboxd.com/about/film-data/  
[48] Letterboxd, “Terms of Use,” https://letterboxd.com/legal/terms-of-use/  
[49] Fanart.tv, “API v3.2,” https://api.fanart.tv/  
[50] Fanart.tv, “Terms / Copyright Notice,” https://fanart.tv/B3uPt  
[51] MovieGlu, “API Setup and Index,” https://developer.movieglu.com/v2/api-index/setup/  
[52] MovieGlu, “Terms of Use,” https://developer.movieglu.com/company/terms-of-use/  
[53] Utelly, “Developer / Aggregation Use Cases,” https://www.utelly.com/media-and-entertainment-solutions/use-cases/developers  
[54] Movie of the Night, “API Documentation / Shows / Images,” https://docs.movieofthenight.com/ ; https://docs.movieofthenight.com/resource/shows ; https://docs.movieofthenight.com/guide/images  
[55] Movie of the Night, “Terms and Conditions,” https://developers.movieofthenight.com/terms-and-conditions

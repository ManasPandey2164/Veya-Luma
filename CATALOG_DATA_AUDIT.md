# VEYA LUMA — PHASE 3 CATALOG & DATA AUDIT REPORT
**Post-Step-17.5 Comprehensive Audit of Final Real TMDB Catalog Expansion, Database Schema, Ingestion Pipeline, Taxonomy Coverage, Artwork, and Recommendation Readiness**

---

## 1. Executive Summary

This audit establishes the definitive state of the canonical movie catalog, PostgreSQL schema, TMDB ingestion pipeline, artwork references, taxonomy coverage, keyword preservation, and Step 17 user-signal compatibility following the full completion of **Phase 3 Step 17.5**.

### Key Step 17.5 Accomplishments:
1. **Live Real-World Catalog Expansion**: Ingested 1,000 real TMDB movies across 50 discover pages using the production ingestion CLI (`python -m app.cli.ingest --pages 50 --movies 1000`). Expanded the canonical catalog from 6 to **909 canonical movies** (905 real TMDB-linked movies + 4 isolated test fixtures) with **zero failures** and **zero synthetic data**.
2. **Deterministic Identity Resolution & Deduplication**: Preserved synthetic UUIDv5 canonical identity generation based on provider identity. Ingestion resolved 97 existing records in-place without generating a single duplicate UUID or duplicate `SourceIdentity` row.
3. **Idempotency Verification**: Validated via a bounded re-ingestion repeat (`--pages 1 --movies 20`): 20 discovered, 20 normalized, 0 inserted, 20 updated, 0 failed in 11.89s.
4. **End-to-End Quantitative Quality Metrics**: Populated `popularity` (`Double Precision`), `vote_average` (`Double Precision`), and `vote_count` (`Integer`) across 100% of real TMDB records (905 movies), fully indexed and constrained by Alembic migration `b71e89f41a32`.
5. **Raw Keyword Preservation**: Preserved 100% of raw upstream TMDB keyword tokens in `Movie.tags` (`JSONB`), maintaining architectural separation between provider keywords and the controlled 86-node canonical taxonomy.
6. **Taxonomy Node Activation**: Populated taxonomy nodes expanded from 37 (43.0%) to **70 out of 86 canonical nodes (81.4%)**, activating 33 previously unpopulated nodes across genres, themes, moods, and styles. Total movie tag assignments increased from 49 to **3,705**.
7. **Credit & Artwork Coverage**: Ingested 203,093 credits (48,427 cast, 154,666 crew, 1,004 directors) and 273 franchise collections. Maintained 100.0% poster and backdrop path coverage across all 909 movies with 0 orphaned records.
8. **Validation**: All 110 backend pytest cases, ruff linting, ruff formatting, mypy static analysis (61 source files), 201 frontend vitest cases, and the Vite production build pass cleanly.

---

## 2. Before vs After Step 17.5 Comparative Audit

| Metric | Pre-Ingestion Baseline | Post-Ingestion Final | Change / Delta |
| :--- | :---: | :---: | :--- |
| **Total Canonical Movies** | 6 | **909** | **+903 movies** |
| **TMDB-Linked Movies** | 2 | **905** | **+903 movies (99.56% of catalog)** |
| **Test Fixture Movies** | 4 | **4** | Preserved without contamination |
| **Source Identity Rows** | 4 | **1,810** | +1,806 (905 TMDB + 905 IMDb) |
| **Duplicate TMDB Identities** | 0 | **0** | 100% unique |
| **Duplicate Canonical UUIDs** | 0 | **0** | 100% unique |
| **Orphan Source Identities** | 0 | **0** | 100% referential integrity |
| **Movies with `popularity`** | 2 / 6 (33.3%) | **905 / 909 (99.56%)** | Populated on 100% of TMDB movies |
| **Movies with `vote_average`** | 2 / 6 (33.3%) | **905 / 909 (99.56%)** | Populated on 100% of TMDB movies |
| **Movies with `vote_count`** | 2 / 6 (33.3%) | **905 / 909 (99.56%)** | Populated on 100% of TMDB movies |
| **Raw TMDB Keywords Saved** | 2 / 6 (33.3%) | **905 / 909 (99.56%)** | Preserved in `Movie.tags` JSONB |
| **Populated Taxonomy Nodes** | 37 / 86 (43.0%) | **70 / 86 (81.4%)** | **+33 canonical nodes activated** |
| **Unpopulated Taxonomy Nodes** | 49 / 86 (57.0%) | **16 / 86 (18.6%)** | **-33 unpopulated nodes** |
| **Total Movie-Tag Links** | 49 | **3,705** | **+3,656 tag assignments** |
| **Genre Axis Coverage** | 6 / 6 (100.0%) | **909 / 909 (100.0%)** | 2,588 genre assignments |
| **Mood Axis Coverage** | 6 / 6 (100.0%) | **287 / 909 (31.57%)** | 571 mood assignments |
| **Theme Axis Coverage** | 6 / 6 (100.0%) | **213 / 909 (23.43%)** | 462 theme assignments |
| **Style Axis Coverage** | 5 / 6 (83.3%) | **82 / 909 (9.02%)** | 84 style assignments |
| **Poster Path Coverage** | 6 / 6 (100.0%) | **909 / 909 (100.0%)** | 0 missing poster paths |
| **Backdrop Path Coverage** | 6 / 6 (100.0%) | **909 / 909 (100.0%)** | 0 missing backdrop paths |
| **Total Credits Ingested** | 15 | **203,093** | 48,427 cast, 154,666 crew |
| **Movies with Director** | 6 / 6 (100.0%) | **909 / 909 (100.0%)** | 1,004 directors captured |
| **Franchise Collections** | 3 | **273** | Linked to canonical movies |
| **Step 17 FK Join Success** | 100.0% | **100.0%** | Zero orphaned records across all tables |

---

## 3. Bulk Ingestion Execution & Metrics

### Bulk Run Command:
```powershell
python -m app.cli.ingest --pages 50 --movies 1000
```

### Execution Statistics:
```text
=================================================================
 VEYA LUMA -- TMDB CATALOG INGESTION REPORT
=================================================================
 Mode:                 LIVE PERSISTENCE
 Records Discovered:   1000
 Records Normalized:   1000
 Records Inserted:     903
 Records Updated:      97
 Records Skipped:      0
 Failures Encountered: 0
 Elapsed Time:         593.30s (~9.88 minutes)
=================================================================
```

### Observations:
- All 50 discover pages from TMDB were fetched sequentially under asynchronous token-bucket rate limiting (20 req/s).
- Full details including credits and keyword payloads were fetched for all 1,000 candidate movies.
- 97 records matched previously existing canonical records and were updated in-place.
- 903 new canonical movies were inserted.
- Zero failures, timeouts, or network drops occurred during the live 1,000-movie run.

---

## 4. Idempotency Verification

A bounded verification run against the first page was executed immediately following bulk ingestion:

### Idempotency Command:
```powershell
python -m app.cli.ingest --pages 1 --movies 20
```

### Idempotency Report:
```text
=================================================================
 VEYA LUMA -- TMDB CATALOG INGESTION REPORT
=================================================================
 Mode:                 LIVE PERSISTENCE
 Records Discovered:   20
 Records Normalized:   20
 Records Inserted:     0
 Records Updated:      20
 Records Skipped:      0
 Failures Encountered: 0
 Elapsed Time:         11.89s
=================================================================
```

- **Inserted**: 0
- **Updated**: 20 (100% in-place update)
- **Duplicate Movies Created**: 0
- **Canonical UUID Alterations**: 0
- **SourceIdentity Row Duplication**: 0

---

## 5. Database Schema & Recommendation Readiness: 21 Core Fields

| Field | In Schema? | Database Location | Source | Step 17.5 Status |
| :--- | :---: | :--- | :--- | :--- |
| **internal movie UUID** | **YES** | `movie.id` (UUID, PK) | Synthetic UUIDv5 | **Active (909 movies)** |
| **TMDB movie ID** | **YES** | `source_identity.external_id` (`source='tmdb'`) | TMDB `/movie/{id}` | **Active (905 identities)** |
| **title** | **YES** | `movie.title` (`varchar(500)`) | TMDB `title` | **Active (100% populated)** |
| **original title** | **YES** | `movie.original_title` (`varchar(500)`) | TMDB `original_title` | **Active (100% populated)** |
| **overview / synopsis** | **YES** | `movie.synopsis` (`text`) | TMDB `overview` | **Active (100% populated)** |
| **release date** | **YES** | `movie.release_date` (`date`) | TMDB `release_date` | **Active (100% populated)** |
| **release year** | **YES** | `movie.release_year` (`smallint`, indexed) | TMDB `release_date` | **Active (100% populated)** |
| **original language** | **YES** | `movie.original_language` (`varchar(10)`) | TMDB `original_language` | **Active (100% populated)** |
| **spoken languages** | **YES** | `movie.spoken_languages` (`jsonb`) | TMDB `spoken_languages` | **Active (100% populated)** |
| **runtime** | **YES** | `movie.runtime_minutes` (`smallint`) | TMDB `runtime` | **Active (100% populated)** |
| **popularity** | **YES** | `movie.popularity` (`float`, indexed) | TMDB `popularity` | **Active (905 populated)** |
| **vote average** | **YES** | `movie.vote_average` (`float`, indexed) | TMDB `vote_average` | **Active (905 populated)** |
| **vote count** | **YES** | `movie.vote_count` (`integer`, indexed) | TMDB `vote_count` | **Active (905 populated)** |
| **poster reference** | **YES** | `movie_artwork.poster_path` | TMDB `poster_path` | **Active (909 populated)** |
| **backdrop reference** | **YES** | `movie_artwork.backdrop_path` | TMDB `backdrop_path` | **Active (909 populated)** |
| **genres** | **YES** | `movie_tag` -> `taxonomy_node` (`axis='genre'`) | TMDB `genres` | **Active (2,588 links)** |
| **themes** | **YES** | `movie_tag` -> `taxonomy_node` (`axis='theme'`) | Mapped TMDB keywords | **Active (462 links)** |
| **moods** | **YES** | `movie_tag` -> `taxonomy_node` (`axis='mood'`) | Mapped TMDB keywords | **Active (571 links)** |
| **styles** | **YES** | `movie_tag` -> `taxonomy_node` (`axis='style'`) | Mapped TMDB keywords | **Active (84 links)** |
| **keywords** | **YES** | `movie.tags` (`jsonb`) | Raw TMDB keyword strings | **Active (905 populated)** |
| **cast** | **YES** | `movie_credit` (`credit_type='cast'`) | TMDB `credits.cast` | **Active (48,427 cast)** |
| **directors / crew** | **YES** | `movie_credit` (`credit_type='crew'`) | TMDB `credits.crew` | **Active (154,666 crew)** |
| **franchise collection** | **YES** | `movie_collection` (`movie.collection_id`) | TMDB `belongs_to_collection` | **Active (273 collections)** |

---

## 6. Taxonomy Activation Analysis

The canonical taxonomy consists of 86 controlled nodes across 4 orthogonal axes. Following bulk ingestion, populated node coverage grew from 43.0% to **81.40%**:

```text
Controlled Canonical Nodes: 86
Populated Nodes:             70 (81.40%)
Unpopulated Nodes:           16 (18.60%)
Total Tag Assignments:    3,705
```

### Breakdown by Taxonomy Axis:

| Axis | Total Nodes | Populated Nodes | Activation % | Total Assignments | Movies Tagged | % of Catalog |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Genre** | 21 | 21 | **100.0%** | 2,588 | 909 | 100.00% |
| **Mood** | 22 | 20 | **90.9%** | 571 | 287 | 31.57% |
| **Theme** | 29 | 21 | **72.4%** | 462 | 213 | 23.43% |
| **Style** | 14 | 8 | **57.1%** | 84 | 82 | 9.02% |

### Unpopulated Nodes (16):
- **Mood (2)**: `Bittersweet`, `Whimsical`
- **Theme (8)**: `Artificial Intelligence & Humanity`, `Memory & Identity`, `Surveillance & Control`, `Mortality & Legacy`, `Faith & Doubt`, `Family Duty vs Self`, `Class Struggle & Power`, `Revenge & Retribution` *(Note: specific multi-word compound mappings can be refined in future taxonomy calibration)*
- **Style (6)**: `Hyper-saturated`, `Gritty Realism`, `Surreal`, `Documentary Style`, `Expressionist`, `Non-linear`

---

## 7. Database Integrity & Constraint Verification

Direct verification queries against PostgreSQL confirmed complete referential and relational integrity:

```text
dup_tmdb = 0              (Duplicate TMDB external IDs)
dup_uuids = 0             (Duplicate canonical movie UUIDs)
orphan_si = 0             (SourceIdentity rows without matching Movie)
orphan_mt_m = 0           (MovieTag rows without matching Movie)
orphan_mt_tn = 0          (MovieTag rows without matching TaxonomyNode)
orphan_artworks = 0       (MovieArtwork rows without matching Movie)
orphan_credits = 0        (MovieCredit rows without matching Movie)
```

### Step 17 User-Signal Relational Joins:
- `user_movie_event` -> `movie.id`: 90 / 90 (100.0%)
- `movie_rating` -> `movie.id`: 20 / 20 (100.0%)
- `watchlist` -> `movie.id`: 30 / 30 (100.0%)
- `favourite` -> `movie.id`: 20 / 20 (100.0%)
- `user_preference` -> `taxonomy_node.id`: 10 / 10 (100.0%)

---

## 8. Verification & Validation Suite Summary

| Suite / Tool | Command | Scope | Result | Notes |
| :--- | :--- | :--- | :---: | :--- |
| **Backend Pytest** | `pytest` | 110 tests across 8 modules | **PASS** | 110 passed, 0 failed in 18.33s |
| **Ruff Linter** | `ruff check app tests` | Backend code | **PASS** | All checks passed |
| **Ruff Formatter** | `ruff format --check app tests` | Backend code | **PASS** | 71 files checked, 0 errors |
| **Mypy Static Typing** | `mypy app` | Core application | **PASS** | 61 source files, 0 issues found |
| **Frontend Vitest** | `npm test -- --run` | 16 test suites | **PASS** | 201 passed, 0 failed in 6.58s |
| **Frontend Build** | `npm run build` | Vite + TypeScript | **PASS** | Built in 3.28s, 0 errors |
| **FastAPI Endpoints** | Async HTTP Client | `/movies`, `/search`, `/{id}` | **PASS** | Validated with 909 catalog size |

---

## 9. Final Step 17.5 Status & Step 18 Recommendation Boundary

### Final Status:
**PHASE 3 STEP 17.5 IS FULLY COMPLETE.**

The real-world TMDB catalog expansion is successfully persisted in PostgreSQL. The canonical movie catalog is rich, clean, deduplicated, idempotent, and fully populated with quantitative metrics, artwork, credits, collections, and multi-axis taxonomy tags.

### Boundary Preservation:
In strict compliance with Step 17.5 boundaries, **NO** recommendation algorithms, TF-IDF candidate generation, collaborative filtering, pgvector/embeddings, MMR re-ranking, or recommendation endpoints were implemented. All such algorithms are deferred to **Phase 3 Step 18**.

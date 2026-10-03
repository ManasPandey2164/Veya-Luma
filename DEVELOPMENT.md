# Veya Luma — Developer Guide & Setup (DEVELOPMENT.md)

**System:** Veya Luma Cinematic Discovery  
**Phase:** Phase 0 — Foundation & Infrastructure  
**Source of Truth:** DECISION.md & ROADMAP.md  
**Date:** 2026-10-01  

---

## 1. Prerequisites & Tooling

Before setting up the repository, ensure your local workstation has the following installed:
* **Node.js:** v18.18+ or v20+ (LTS) & `npm` v9+
* **Python:** v3.11+
* **PostgreSQL:** v15+ (Local service or Docker)
* **Docker & Docker Compose:** Optional for local database containerization
* **Git:** v2.38+

---

## 2. Repository Layout

```text
d:/Recommender/
├── frontend/                 # React 18 + TypeScript + Vite + Tailwind CSS
├── backend/                  # Python 3.11+ FastAPI + SQLAlchemy + Alembic
│   ├── app/                  # Application source
│   ├── tests/                # Unit & integration test suites
│   └── alembic/              # Database migration scripts
├── ml/                       # Offline ML experimentation & evaluation
├── research/                 # Foundational research documents
├── design/                   # Visual language & design specifications
├── ARCHITECTURE.md           # System architecture contract
├── DATABASE.md               # PostgreSQL schema & entity specifications
├── API.md                    # REST API specifications
├── RECOMMENDATION.md         # Recommendation engine & algorithm specifications
├── DEVELOPMENT.md            # Local setup & developer workflows
├── PROJECT.md                # Product requirements document
├── DECISION.md               # Architectural source of truth
└── ROADMAP.md                # Phase-by-phase implementation schedule
```

---

## 3. Local Environment Setup

### 3.1 PostgreSQL Database Setup

#### Option A: Docker Compose (Recommended)
From the project root:
```bash
docker compose up -d db
```
The database will be accessible at `localhost:5432` with credentials:
* **Database:** `veya_luma`
* **User:** `veya_admin`
* **Password:** `obsidian_chamber_secret`

#### Option B: Local PostgreSQL
Create a database and role:
```sql
CREATE DATABASE veya_luma;
CREATE USER veya_admin WITH PASSWORD 'obsidian_chamber_secret';
GRANT ALL PRIVILEGES ON DATABASE veya_luma TO veya_admin;
```

---

### 3.2 Backend Setup (Python 3.11+ & FastAPI)

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment:**
   * **Windows (PowerShell):**
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   * **Linux/macOS:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install dependencies:**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   *Required variables in `backend/.env`:*
   ```ini
   ENVIRONMENT=development
   DEBUG=True
   PROJECT_NAME="Veya Luma"
   API_V1_STR=/api/v1
   SECRET_KEY=change_this_to_a_secure_random_64_character_hex_string_for_dev
   JWT_SECRET_KEY=
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=15
   REFRESH_TOKEN_EXPIRE_DAYS=7
   GUEST_SESSION_EXPIRE_DAYS=30
   AUTH_COOKIE_NAME=veya_refresh_token
   AUTH_COOKIE_SECURE=false

   # Database Connection
   DATABASE_URL=postgresql+asyncpg://veya_admin:obsidian_chamber_secret@localhost:5432/veya_luma
   SYNC_DATABASE_URL=postgresql://veya_admin:obsidian_chamber_secret@localhost:5432/veya_luma

   # TMDB Non-Commercial API Key (Optional for Phase 0; required for Phase 2 ingestion)
   TMDB_API_KEY=your_tmdb_api_key_here
   ```

5. **Run Database Migrations:**
   ```bash
   alembic upgrade head
   ```

6. **Seed Initial Development Catalog (Phase 0/1 Fixtures):**
   ```bash
   python -m app.db.seed
   ```

7. **Start the Backend Server:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   * Interactive API docs: `http://localhost:8000/docs`
   * Health check: `http://localhost:8000/health/live`

8. **Execute TMDB Catalog Ingestion (Step 14):**
   ```bash
   # Dry-run: discover, parse, normalize, and validate without database writes
   python -m app.cli.ingest --pages 2 --movies 20 --dry-run

   # Live bounded ingestion with configured TMDB credentials
   python -m app.cli.ingest --pages 2 --movies 40

   # Offline test ingestion using curated sample fixtures
   python -m app.cli.ingest --offline-sample
   ```

### 3.3 Authentication & Session Workflows (Step 16)

Veya Luma implements hybrid JWT + PostgreSQL authoritative persistent sessions with Argon2id password security:
1. **Anonymous Guest Sessions:**
   Visitors can explore discovery feeds anonymously. A transient session is created in `user_session` with `user_id = NULL`:
   ```bash
   curl -X POST http://localhost:8000/api/v1/auth/guest -H "Content-Type: application/json" -d "{}"
   ```
2. **Account Registration & Reconciliation:**
   Passwords must be 8-128 characters long and contain uppercase, lowercase, and a number or symbol. Passing an existing `guest_session_id` automatically reconciles the guest session:
   ```bash
   curl -X POST http://localhost:8000/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d "{\"email\":\"curator@veyaluma.internal\",\"password\":\"SecurePassword123!\",\"username\":\"auteur\",\"guest_session_id\":\"<UUID>\"}"
   ```
3. **Login & Session Management:**
   Returns short-lived (15 min) JWT access token and issues rotating refresh token via HTTP-only cookie `veya_refresh_token`:
   ```bash
   curl -X POST http://localhost:8000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d "{\"email\":\"curator@veyaluma.internal\",\"password\":\"SecurePassword123!\"}"
   ```
4. **Token Refresh (Rotation):**
   ```bash
   curl -X POST http://localhost:8000/api/v1/auth/refresh \
     -H "Content-Type: application/json" \
     -d "{\"refresh_token\":\"<raw_token>\"}"
   ```
5. **Inspecting Current Profile:**
   ```bash
   curl http://localhost:8000/api/v1/auth/me -H "Authorization: Bearer <access_token>"
   ```

---

### 3.5 Taste Signals, Feedback & Library Workflows (Step 17)

Step 17 provides persistent data collection for ratings, telemetry, explicit taxonomy affinities, and curated collections:

1. **Log Interaction Telemetry (Impressions, Clicks, Detail Views):**
   ```bash
   curl -X POST http://localhost:8000/api/v1/feedback/event \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <access_token>" \
     -d '{"movie_id":"<MOVIE_UUID>","event_type":"detail_view","source":"detail_page"}'
   ```
   *Guest sessions can log events by omitting the Bearer token and supplying `-H "X-Session-ID: <GUEST_UUID>"`.

2. **Rate a Movie:**
   ```bash
   curl -X POST http://localhost:8000/api/v1/feedback/rate \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <access_token>" \
     -d '{"movie_id":"<MOVIE_UUID>","rating":8.5,"source":"detail_page"}'
   ```

3. **Manage Watchlist:**
   ```bash
   # Add movie to watchlist
   curl -X POST http://localhost:8000/api/v1/library/watchlist \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <access_token>" \
     -d '{"movie_id":"<MOVIE_UUID>"}'

   # Remove movie from watchlist
   curl -X DELETE http://localhost:8000/api/v1/library/watchlist/<MOVIE_UUID> \
     -H "Authorization: Bearer <access_token>"
   ```

4. **Manage Favourites:**
   ```bash
   # Add movie to favourites
   curl -X POST http://localhost:8000/api/v1/library/favourites \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <access_token>" \
     -d '{"movie_id":"<MOVIE_UUID>"}'

   # Remove movie from favourites
   curl -X DELETE http://localhost:8000/api/v1/library/favourites/<MOVIE_UUID> \
     -H "Authorization: Bearer <access_token>"
   ```

5. **Explicit Taxonomy Affinities:**
   ```bash
   # Set affinity for a taxonomy node (e.g. Neo-Noir or Cyberpunk)
   curl -X PUT http://localhost:8000/api/v1/preferences/<NODE_INT_ID> \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <access_token>" \
     -d '{"affinity":0.9,"source":"onboarding"}'
   ```

---

### 3.4 Frontend Setup (React + Vite + Tailwind CSS)

The frontend architecture implements the 20 screen specifications defined in Stitch Project ID `6658946113334506031` ("Veya Luma Cinematic Discovery").

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   *Contents of `frontend/.env`:*
   ```ini
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   ```

4. **Start the Frontend Development Server:**
   ```bash
   npm run dev
   ```
   * Web App: `http://localhost:5173`

---

## 4. Code Standards & Tooling

### 4.1 Backend Quality Standards
- **Linter & Formatter:** [Ruff](https://astral.sh/ruff)
  ```bash
  ruff check .
  ruff format --check .
  ```
- **Type Checking:** [mypy](https://mypy.readthedocs.io/)
  ```bash
  mypy app
  ```
- **Testing:** [pytest](https://docs.pytest.org/)
  ```bash
  pytest -v
  ```

### 4.2 Frontend Quality Standards
- **Linter:** ESLint with TypeScript integration
  ```bash
  npm run lint
  ```
- **Type Checking:**
  ```bash
  npm run typecheck
  ```
- **Unit & Component Testing:** Vitest
  ```bash
  npm run test
  ```

---

## 5. Phase 0 Verification Checklist

Before advancing to Phase 1 (Product Shell implementation), verify that:
- [ ] Backend runs cleanly without warnings via `uvicorn app.main:app`.
- [ ] Frontend starts cleanly via `npm run dev` and renders a basic test shell.
- [ ] PostgreSQL connects successfully with asynchronous engine (`asyncpg`).
- [ ] Initial Alembic migration applies with zero errors (`alembic upgrade head`).
- [ ] Automated tests pass with clean exit codes (`pytest` and `npm run test`).
- [ ] `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `RECOMMENDATION.md`, and `DEVELOPMENT.md` are internally consistent with `DECISION.md`.

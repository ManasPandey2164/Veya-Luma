# Veya Luma — Personalized Movie Discovery Engine

> **Phase 0:** Project Foundation & Architectural Baseline  
> **Status:** Initialized & Verified  
> **Aesthetic:** Cinematic Luminary  

Veya Luma is an intelligent, personalized cinematic discovery engine designed to solve decision fatigue by learning user taste through lightweight, engaging, and transparent interactions.

**Veya Luma is a discovery and recommendation engine, NOT a streaming service (OTT platform).**

---

## Architecture & Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — High-level modular monolith architecture, security, and scalability.
- [DATABASE.md](DATABASE.md) — PostgreSQL schemas, multi-axis taxonomy, and provenance data models.
- [API.md](API.md) — OpenAPI REST endpoints for catalog, onboarding, recommendation, and telemetry.
- [RECOMMENDATION.md](RECOMMENDATION.md) — Stage 1 Content-Based TF-IDF, MMR diversity, and adaptive Taste Discovery.
- [DEVELOPMENT.md](DEVELOPMENT.md) — Comprehensive developer setup, toolchains, and verification instructions.
- [DECISION.md](DECISION.md) — Project architectural source of truth.
- [PROJECT.md](PROJECT.md) — Full product requirements and scope boundaries.
- [ROADMAP.md](ROADMAP.md) — Phased delivery plan.

---

## Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form, Zod.
- **Backend:** Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0 (asyncio + asyncpg), Alembic.
- **Database:** PostgreSQL 15+.
- **Cache / Message Queue:** Redis (Phase 0 infrastructure placeholder).
- **Design System:** Cinematic Luminary (Stitch Project ID: `6658946113334506031`).

---

## Quick Start (Phase 0)

### 1. Database Setup
Ensure PostgreSQL is running locally or via Docker:
```bash
docker compose up -d db redis
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\Activate.ps1
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```
- API Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### 3. Frontend Setup
```bash
cd frontend
npm.cmd install
npm.cmd run dev
```
- Web Application: `http://localhost:5173`

---

## Verification & Testing

- Backend tests: `pytest` in `backend/`
- Frontend tests: `npm.cmd run test` in `frontend/`
- Database migrations: `alembic upgrade head` in `backend/`

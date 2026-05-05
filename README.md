# 🏗️ InfraSight — India Infrastructure Transparency Platform

> A production-grade, data-first platform for tracking, verifying, and publishing
> public infrastructure project data across India.

---

## 🗂️ Project Structure

```
InfraSight/
├── backend/                    # FastAPI Python backend
│   ├── app/
│   │   ├── main.py             # Application entry point
│   │   ├── core/
│   │   │   ├── config.py       # Settings via env vars
│   │   │   ├── database.py     # Async SQLAlchemy engine
│   │   │   └── auth.py         # JWT + RBAC
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── api/v1/             # REST API endpoints
│   │   │   └── endpoints/
│   │   │       ├── projects.py
│   │   │       ├── search.py
│   │   │       ├── complaints.py
│   │   │       ├── updates.py
│   │   │       ├── auth.py
│   │   │       └── admin.py
│   │   ├── ingestion/          # DATA INGESTION LAYER
│   │   │   ├── scrapers.py     # PMGSY, Odisha e-Proc, manual seed
│   │   │   ├── pdf_parser.py   # PDF → structured data
│   │   │   └── scheduler.py    # Ingestion run orchestrator
│   │   ├── processing/         # DATA PROCESSING LAYER
│   │   │   └── normalizer.py   # Fuzzy dedup, geocoding, delay flagging
│   │   └── workers/            # Celery background tasks
│   │       ├── celery_app.py   # Celery + beat schedule
│   │       └── tasks.py        # Task definitions
│   ├── db/
│   │   └── init.sql            # Full PostgreSQL schema with PostGIS
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                   # Next.js 14 frontend
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   │   ├── page.tsx        # Homepage
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx    # Project listing + search + map
│   │   │   │   └── [id]/page.tsx  # Project detail
│   │   │   ├── globals.css     # Design system CSS
│   │   │   └── layout.tsx      # Root layout
│   │   ├── components/
│   │   │   ├── ui/Badges.tsx   # StatusBadge, TrustBadge, ProgressBar
│   │   │   ├── layout/Navbar.tsx
│   │   │   ├── projects/ProjectCard.tsx
│   │   │   └── map/ProjectMap.tsx  # Leaflet map
│   │   ├── lib/
│   │   │   ├── api.ts          # Axios API client
│   │   │   └── utils.ts        # Formatters, helpers
│   │   └── types/index.ts      # Shared TypeScript types
│   ├── package.json
│   ├── tailwind.config.ts
│   └── Dockerfile
│
├── data/
│   └── seed/
│       └── bhubaneswar_phase1.json  # 8 MVP seed projects
│
├── docker-compose.yml          # Full stack orchestration
├── .env.example                # Environment variable template
└── ARCHITECTURE.md             # System architecture documentation
```

---

## 🚀 Quick Start

### Prerequisites
- Docker + Docker Compose
- Node.js 20+ (for frontend dev)
- Python 3.11+ (for backend dev)

### 1. Clone & configure

```bash
cd InfraSight
cp .env.example .env
# Edit .env — set passwords and secret keys
```

### 2. Start full stack

```bash
docker-compose up -d
```

Services:
| Service        | URL                         |
|----------------|-----------------------------|
| Frontend       | http://localhost:3000        |
| Backend API    | http://localhost:8000        |
| API Docs       | http://localhost:8000/api/docs |
| PostgreSQL     | localhost:5432              |
| Redis          | localhost:6379              |

### 3. Frontend dev (local, without Docker)

```bash
cd frontend
npm install
npm run dev
```

### 4. Backend dev (local)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## 🔌 API Reference

### Projects

| Method | Endpoint                          | Auth     | Description              |
|--------|-----------------------------------|----------|--------------------------|
| GET    | `/api/v1/projects`                | Public   | List + filter projects   |
| GET    | `/api/v1/projects/{id}`           | Public   | Project detail           |
| POST   | `/api/v1/projects`                | Admin    | Create project           |
| PATCH  | `/api/v1/projects/{id}`           | Admin    | Update project           |
| DELETE | `/api/v1/projects/{id}`           | Admin    | Delete project           |
| PATCH  | `/api/v1/projects/{id}/verify`    | Verifier | Set verification status  |
| GET    | `/api/v1/projects/{id}/updates`   | Public   | Update timeline          |
| GET    | `/api/v1/projects/{id}/complaints`| Public   | Citizen complaints       |
| GET    | `/api/v1/projects/{id}/audit`     | Admin    | Full audit trail         |

### Search

| Method | Endpoint                  | Description                    |
|--------|---------------------------|--------------------------------|
| GET    | `/api/v1/search`          | Full-text + faceted search     |
| GET    | `/api/v1/search/map`      | Lightweight geo pins for map   |
| GET    | `/api/v1/search/suggest`  | Autocomplete suggestions       |

### Auth

| Method | Endpoint                  | Description        |
|--------|---------------------------|--------------------|
| POST   | `/api/v1/auth/register`   | User registration  |
| POST   | `/api/v1/auth/login`      | Login → JWT tokens |
| GET    | `/api/v1/auth/me`         | Current user info  |

### Complaints

| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| POST   | `/api/v1/complaints`              | Submit complaint         |
| GET    | `/api/v1/complaints/{id}`         | Get complaint            |
| POST   | `/api/v1/complaints/{id}/upvote`  | Upvote complaint         |
| PATCH  | `/api/v1/complaints/{id}/moderate`| Moderate (admin)         |

---

## 🗄️ Database

**PostgreSQL 16 + PostGIS 3.4**

Tables: `projects`, `contractors`, `authorities`, `data_sources`, `documents`,
`complaints`, `users`, `project_updates`, `verification_logs`, `ingestion_runs`

Key features:
- Full-text search via `tsvector` + `plainto_tsquery`
- Geospatial queries via PostGIS `GEOMETRY(Point, 4326)`
- Bounding box search with `ST_Within` + `ST_MakeEnvelope`
- Automatic `updated_at` triggers
- Full audit trail via `log_project_changes()` trigger
- Fuzzy text search via `pg_trgm` extension

---

## 🔐 Trust & Verification Model

Every project carries a `verification_status`:

| Status              | Meaning                                           |
|---------------------|---------------------------------------------------|
| `UNVERIFIED`        | Data ingested but not checked by a human          |
| `VERIFIED`          | Manually reviewed by InfraSight staff             |
| `COMMUNITY_VERIFIED`| Multiple citizen confirmations received           |
| `DISPUTED`          | Conflicting data found                            |
| `RETRACTED`         | Data found to be incorrect                        |

All changes are logged in `verification_logs` with actor, timestamp, and notes.

---

## 📊 Data Ingestion Sources (Phase 1)

| Source                      | Type    | Coverage         |
|-----------------------------|---------|------------------|
| PMGSY portal                | Scraper | Rural roads (national) |
| Odisha e-Procurement portal | Scraper | State tenders    |
| Manual seed JSON files      | Manual  | Phase 1 MVP data |

Phase 2+ sources:
- CPWD project monitoring
- NHAI project tracker
- State PWD websites
- PDF DPR parser
- CAG audit reports

---

## 📱 MVP Phased Roadmap

### Phase 1 (NOW) — Bhubaneswar, Roads
- ✅ 8 seed projects manually curated
- ✅ Full backend API
- ✅ Search + filter + map UI
- ✅ Trust/verification system
- ✅ Complaint submission

### Phase 2 — Odisha State
- Automated PMGSY + Odisha eProcurement scrapers
- 50+ projects
- PDF document parser
- Email notifications

### Phase 3 — Multi-State
- Add Maharashtra, Karnataka, Delhi
- Elasticsearch for full-text (replace PG FTS)
- B2G API partnerships
- NGO/media data export tools

### Phase 4 — National
- All 28 states + UTs
- Real-time data feeds
- Mobile app (React Native)
- ML-based delay prediction

---

## 💰 Monetization Strategy

| Tier     | Target        | Model                              |
|----------|---------------|------------------------------------|
| Free     | Citizens      | Full public read access            |
| B2G      | Government    | Data dashboards + API integrations |
| B2B      | Construction firms, banks | Analytics API         |
| NGO/Media| Watchdogs     | Bulk data exports, RTI integration |

---

## ⚠️ Legal & Sensitivity Notes

- All scraped data is from **public government sources**
- No personal data collected without consent
- Complaint evidence moderated before public display
- Rate limiting prevents abuse
- Data marked with source and timestamp — no unsourced claims

---

## 🧑‍💻 Contributing

1. Backend: Python 3.11 + FastAPI + async SQLAlchemy
2. Frontend: TypeScript + Next.js 14 + Tailwind CSS
3. Database: PostgreSQL migrations via Alembic (run `alembic revision --autogenerate`)
4. Tests: pytest for backend, Jest/Playwright for frontend

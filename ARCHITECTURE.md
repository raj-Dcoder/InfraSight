# InfraSight — System Architecture

## Overview

InfraSight is a 5-layer, data-first infrastructure transparency platform designed for India. It aggregates fragmented government project data (roads, bridges, buildings) into a unified, verifiable, and publicly accessible platform.

---

## Architecture Diagram (Logical)

```
┌──────────────────────────────────────────────────────────────────────┐
│                        PUBLIC USERS / ADMIN                          │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────────┐
│                  LAYER 5: FRONTEND (Next.js)                         │
│  • Map-based project explorer     • Project detail pages             │
│  • Search & filter UI             • Complaint submission             │
│  • Status indicators              • Mobile-first responsive           │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ REST/JSON
┌────────────────────────────▼─────────────────────────────────────────┐
│                  LAYER 4: BACKEND API (FastAPI)                      │
│  • /projects  /search  /complaints  /updates                         │
│  • JWT Authentication             • Rate limiting                    │
│  • Role-based access control      • OpenAPI docs                     │
└──────────┬─────────────────────────────────────────┬─────────────────┘
           │                                         │
┌──────────▼──────────────┐               ┌──────────▼──────────────┐
│  LAYER 3: TRUST &       │               │  LAYER 2: DATA          │
│  VERIFICATION           │               │  PROCESSING             │
│  • Source tagging       │               │  • Normalization        │
│  • Audit trail          │               │  • Deduplication        │
│  • Verification status  │               │  • Schema mapping       │
│  • Data versioning      │               │  • Missing value fill   │
└──────────┬──────────────┘               └──────────┬──────────────┘
           │                                         │
┌──────────▼─────────────────────────────────────────▼───────────────┐
│                  LAYER 1: DATA INGESTION                            │
│  • Web scrapers (Playwright)       • PDF parsers (pdfplumber)       │
│  • Manual admin entry              • Cron job scheduler (APScheduler)│
│  • Tender portal connectors        • Data source registry           │
└──────────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────────┐
│                  DATABASE LAYER (PostgreSQL + PostGIS)               │
│  Projects | Contractors | Authorities | Documents | DataSources      │
│  Complaints | Users | Updates | VerificationLogs                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Layer-by-Layer Breakdown

### Layer 1 — Data Ingestion
- **Scrapers**: Playwright-based scrapers for CPWD, PMGSY, state PWD portals
- **PDF Parser**: pdfplumber + regex pipelines for tender documents
- **Manual Entry**: Admin panel for curating verified seed data
- **Scheduler**: APScheduler cron jobs, configurable per source

### Layer 2 — Processing & Normalization
- Contractor name canonicalization (fuzzy matching)
- Project status enum standardization
- Geo-coordinate enrichment (Nominatim / Bhuvan API)
- Duplicate detection (hash + semantic similarity)

### Layer 3 — Trust & Verification
- Every data point tagged with: source_url, fetched_at, verified_by
- Verification tiers: `VERIFIED` | `UNVERIFIED` | `COMMUNITY`
- Full audit trail in VerificationLogs table
- Data versioning via row-level history tracking

### Layer 4 — Backend API
- FastAPI with async SQLAlchemy
- JWT-based auth with role system (admin / verifier / public)
- Pagination, filtering, full-text search
- OpenAPI docs auto-generated

### Layer 5 — Frontend
- Next.js 14 (App Router)
- Mapbox GL or Leaflet for map interface
- Tailwind CSS + shadcn/ui components
- Mobile-first, accessible UI

---

## Technology Choices

| Component         | Technology                    |
|-------------------|-------------------------------|
| Backend API       | FastAPI (Python 3.11)         |
| Database          | PostgreSQL 16 + PostGIS       |
| ORM               | SQLAlchemy 2.0 (async)        |
| Frontend          | Next.js 14 + Tailwind         |
| Scraping          | Playwright + BeautifulSoup    |
| PDF Parsing       | pdfplumber                    |
| Task Queue        | Celery + Redis                |
| Auth              | JWT (python-jose)             |
| Containerization  | Docker + Docker Compose       |
| Cloud Target      | AWS (RDS + ECS + CloudFront)  |
| Caching           | Redis                         |
| Search            | PostgreSQL FTS (phase 1)      |

---

## MVP Scope (Phase 1)

- City: **Bhubaneswar, Odisha**
- Category: **Roads**
- Projects: **10–20 manually curated**
- Auth: Admin only for data entry
- Public: Read-only map + listing + search

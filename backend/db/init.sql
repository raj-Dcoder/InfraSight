-- ============================================================
-- InfraSight — PostgreSQL Schema with PostGIS
-- Production-grade infrastructure transparency platform
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- for fuzzy text search
CREATE EXTENSION IF NOT EXISTS unaccent;  -- for accent-insensitive search

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE project_status AS ENUM (
    'PLANNED',
    'TENDERED',
    'IN_PROGRESS',
    'DELAYED',
    'COMPLETED',
    'ABANDONED',
    'ON_HOLD'
);

CREATE TYPE project_category AS ENUM (
    'ROAD',
    'BRIDGE',
    'BUILDING',
    'WATER',
    'SANITATION',
    'ELECTRICITY',
    'RAILWAY',
    'METRO',
    'PORT',
    'AIRPORT',
    'OTHER'
);

CREATE TYPE verification_status AS ENUM (
    'UNVERIFIED',
    'VERIFIED',
    'COMMUNITY_VERIFIED',
    'DISPUTED',
    'RETRACTED'
);

CREATE TYPE complaint_status AS ENUM (
    'SUBMITTED',
    'UNDER_REVIEW',
    'ESCALATED',
    'RESOLVED',
    'REJECTED'
);

CREATE TYPE user_role AS ENUM (
    'PUBLIC',
    'VERIFIER',
    'ADMIN',
    'SUPER_ADMIN'
);

CREATE TYPE data_source_type AS ENUM (
    'GOVERNMENT_PORTAL',
    'TENDER_SYSTEM',
    'PDF_DOCUMENT',
    'NEWS_SOURCE',
    'MANUAL_ENTRY',
    'CITIZEN_REPORT',
    'API'
);

-- ============================================================
-- TABLE: users
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    phone           VARCHAR(20),
    full_name       VARCHAR(255),
    hashed_password TEXT NOT NULL,
    role            user_role NOT NULL DEFAULT 'PUBLIC',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- TABLE: data_sources
-- Purpose: Registry of all raw data sources
-- ============================================================

CREATE TABLE data_sources (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    source_type     data_source_type NOT NULL,
    base_url        TEXT,
    description     TEXT,
    scraper_config  JSONB DEFAULT '{}'::jsonb,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_scraped_at TIMESTAMPTZ,
    scrape_interval_hours INT DEFAULT 24,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Known Indian government sources
INSERT INTO data_sources (name, source_type, base_url, description) VALUES
('PMGSY - Pradhan Mantri Gram Sadak Yojana', 'GOVERNMENT_PORTAL', 'https://pmgsy.nic.in', 'Rural road project monitoring'),
('CPWD - Central Public Works Department', 'GOVERNMENT_PORTAL', 'https://cpwd.gov.in', 'Central government construction projects'),
('MoRTH - Ministry of Road Transport', 'GOVERNMENT_PORTAL', 'https://morth.nic.in', 'National highways and roads'),
('GePNIC e-Procurement Portal', 'TENDER_SYSTEM', 'https://eprocure.gov.in', 'Central government tenders'),
('Odisha e-Procurement', 'TENDER_SYSTEM', 'https://tendersodisha.gov.in', 'Odisha state tenders'),
('NITI Aayog Project Monitoring', 'GOVERNMENT_PORTAL', 'https://projectmonitor.nic.in', 'Central scheme project tracker');

-- ============================================================
-- TABLE: contractors
-- ============================================================

CREATE TABLE contractors (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_name      VARCHAR(500) NOT NULL,
    aliases             TEXT[] DEFAULT '{}',
    registration_number VARCHAR(100),
    pan_number          VARCHAR(20),
    gst_number          VARCHAR(20),
    registered_state    VARCHAR(100),
    contact_email       VARCHAR(255),
    contact_phone       VARCHAR(20),
    website             TEXT,
    blacklisted         BOOLEAN NOT NULL DEFAULT FALSE,
    blacklist_reason    TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contractors_canonical_name ON contractors USING gin(to_tsvector('english', canonical_name));
CREATE INDEX idx_contractors_aliases ON contractors USING gin(aliases);

-- ============================================================
-- TABLE: authorities
-- Government bodies responsible for projects
-- ============================================================

CREATE TABLE authorities (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_name  VARCHAR(500) NOT NULL,
    aliases         TEXT[] DEFAULT '{}',
    authority_type  VARCHAR(100),  -- e.g., 'Municipal Corporation', 'State PWD', 'NHAI'
    state           VARCHAR(100),
    district        VARCHAR(100),
    city            VARCHAR(100),
    website         TEXT,
    nodal_officer   VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_authorities_name ON authorities USING gin(to_tsvector('english', canonical_name));

-- ============================================================
-- TABLE: projects  (CORE TABLE)
-- ============================================================

CREATE TABLE projects (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identification
    project_code            VARCHAR(100) UNIQUE,  -- official govt project ID if available
    title                   VARCHAR(1000) NOT NULL,
    description             TEXT,

    -- Classification
    category                project_category NOT NULL,
    sub_category            VARCHAR(100),
    status                  project_status NOT NULL DEFAULT 'PLANNED',

    -- Location
    state                   VARCHAR(100) NOT NULL,
    district                VARCHAR(100),
    city                    VARCHAR(100),
    ward                    VARCHAR(100),
    pincode                 VARCHAR(10),
    address                 TEXT,
    location                GEOMETRY(Point, 4326),  -- PostGIS geo point (lng, lat)
    location_polygon        GEOMETRY(MultiPolygon, 4326),  -- project area if known

    -- Parties
    contractor_id           UUID REFERENCES contractors(id) ON DELETE SET NULL,
    authority_id            UUID REFERENCES authorities(id) ON DELETE SET NULL,
    consultant_name         VARCHAR(500),
    supervisor_name         VARCHAR(500),

    -- Financial
    sanctioned_budget_inr   NUMERIC(18, 2),
    revised_budget_inr      NUMERIC(18, 2),
    expenditure_inr         NUMERIC(18, 2),
    funding_source          VARCHAR(255),  -- e.g., 'State Budget', 'World Bank', 'JNNURM'

    -- Timeline
    sanctioned_date         DATE,
    start_date              DATE,
    original_end_date       DATE,
    revised_end_date        DATE,
    actual_completion_date  DATE,
    delay_reason            TEXT,

    -- Progress
    physical_progress_pct   SMALLINT CHECK (physical_progress_pct BETWEEN 0 AND 100),
    financial_progress_pct  SMALLINT CHECK (financial_progress_pct BETWEEN 0 AND 100),

    -- Trust
    verification_status     verification_status NOT NULL DEFAULT 'UNVERIFIED',
    verified_by             UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at             TIMESTAMPTZ,
    data_source_id          UUID REFERENCES data_sources(id) ON DELETE SET NULL,
    source_url              TEXT,
    source_document_id      TEXT,  -- original ID from source system

    -- Advanced
    accountability_score    SMALLINT CHECK (accountability_score BETWEEN 0 AND 100),
    ai_insights             JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    raw_data                JSONB DEFAULT '{}'::jsonb,  -- original scraped payload
    tags                    TEXT[] DEFAULT '{}',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by              UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Performance indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_category ON projects(category);
CREATE INDEX idx_projects_state ON projects(state);
CREATE INDEX idx_projects_district ON projects(district);
CREATE INDEX idx_projects_city ON projects(city);
CREATE INDEX idx_projects_contractor ON projects(contractor_id);
CREATE INDEX idx_projects_authority ON projects(authority_id);
CREATE INDEX idx_projects_verification ON projects(verification_status);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- Full-text search index
CREATE INDEX idx_projects_fts ON projects USING gin(
    to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(city, '') || ' ' || state)
);

-- Geospatial index
CREATE INDEX idx_projects_location ON projects USING gist(location);
CREATE INDEX idx_projects_polygon ON projects USING gist(location_polygon);

-- JSONB index for raw data queries
CREATE INDEX idx_projects_raw_data ON projects USING gin(raw_data);

-- ============================================================
-- TABLE: project_updates
-- Timeline of status/progress changes
-- ============================================================

CREATE TABLE project_updates (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title               VARCHAR(500) NOT NULL,
    content             TEXT,
    update_type         VARCHAR(50),  -- 'STATUS_CHANGE', 'PROGRESS', 'FINANCIAL', 'DELAY', 'GENERAL'
    old_status          project_status,
    new_status          project_status,
    old_progress_pct    SMALLINT,
    new_progress_pct    SMALLINT,
    source_url          TEXT,
    data_source_id      UUID REFERENCES data_sources(id),
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_updates_project_id ON project_updates(project_id, created_at DESC);

-- ============================================================
-- TABLE: documents
-- PDFs, tenders, inspection reports attached to projects
-- ============================================================

CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title           VARCHAR(500) NOT NULL,
    document_type   VARCHAR(100),  -- 'TENDER', 'DPR', 'INSPECTION', 'PHOTO', 'RTI', 'NEWS'
    file_url        TEXT,          -- S3 or CDN URL
    original_url    TEXT,          -- source URL before download
    file_size_bytes BIGINT,
    mime_type       VARCHAR(100),
    extracted_text  TEXT,          -- parsed from PDF
    doc_metadata    JSONB DEFAULT '{}'::jsonb,
    uploaded_by     UUID REFERENCES users(id),
    is_verified     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_type ON documents(document_type);

-- ============================================================
-- TABLE: complaints
-- Citizen-submitted issues with evidence
-- ============================================================

CREATE TABLE complaints (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    submitted_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    submitter_name      VARCHAR(255),   -- for anonymous submissions
    submitter_email     VARCHAR(255),   -- for notifications
    submitter_phone     VARCHAR(20),

    title               VARCHAR(500) NOT NULL,
    description         TEXT NOT NULL,
    complaint_type      VARCHAR(100),   -- 'DELAY', 'QUALITY', 'CORRUPTION', 'SAFETY', 'OTHER'

    status              complaint_status NOT NULL DEFAULT 'SUBMITTED',
    moderated_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    moderation_notes    TEXT,

    -- Evidence
    evidence_urls       TEXT[] DEFAULT '{}',  -- S3 URLs of uploaded images/videos
    location            GEOMETRY(Point, 4326),

    -- Anti-abuse
    ip_address          INET,
    user_agent          TEXT,
    is_spam             BOOLEAN DEFAULT FALSE,
    spam_score          REAL DEFAULT 0,

    upvotes             INT DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_complaints_project_id ON complaints(project_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_created_at ON complaints(created_at DESC);

-- ============================================================
-- TABLE: verification_logs
-- Full audit trail for every data change
-- ============================================================

CREATE TABLE verification_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    action          VARCHAR(100) NOT NULL,  -- 'CREATED', 'UPDATED', 'VERIFIED', 'DISPUTED', etc.
    field_name      VARCHAR(100),           -- which field changed
    old_value       TEXT,
    new_value       TEXT,
    performed_by    UUID REFERENCES users(id),
    source_url      TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verification_logs_project ON verification_logs(project_id, created_at DESC);
CREATE INDEX idx_verification_logs_actor ON verification_logs(performed_by);

-- ============================================================
-- TABLE: ingestion_runs
-- Track ETL pipeline execution history
-- ============================================================

CREATE TABLE ingestion_runs (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_source_id      UUID REFERENCES data_sources(id),
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at         TIMESTAMPTZ,
    status              VARCHAR(50) DEFAULT 'RUNNING',  -- RUNNING, SUCCESS, PARTIAL, FAILED
    records_found       INT DEFAULT 0,
    records_inserted    INT DEFAULT 0,
    records_updated     INT DEFAULT 0,
    records_skipped     INT DEFAULT 0,
    error_log           TEXT,
    run_metadata        JSONB DEFAULT '{}'::jsonb
);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_complaints_updated_at
    BEFORE UPDATE ON complaints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-log verification changes
CREATE OR REPLACE FUNCTION log_project_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO verification_logs (project_id, action, performed_by)
        VALUES (NEW.id, 'CREATED', NEW.created_by);
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.verification_status != NEW.verification_status THEN
            INSERT INTO verification_logs (project_id, action, field_name, old_value, new_value, performed_by)
            VALUES (NEW.id, 'VERIFICATION_CHANGED', 'verification_status',
                    OLD.verification_status::text, NEW.verification_status::text, NEW.verified_by);
        END IF;
        IF OLD.status != NEW.status THEN
            INSERT INTO verification_logs (project_id, action, field_name, old_value, new_value)
            VALUES (NEW.id, 'STATUS_CHANGED', 'status',
                    OLD.status::text, NEW.status::text);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER project_audit_trigger
    AFTER INSERT OR UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION log_project_changes();

-- ============================================================
-- SEED DATA — Bhubaneswar Phase 1
-- ============================================================

-- Seed authority
INSERT INTO authorities (canonical_name, authority_type, state, district, city) VALUES
('Bhubaneswar Development Authority', 'Development Authority', 'Odisha', 'Khordha', 'Bhubaneswar'),
('Bhubaneswar Municipal Corporation', 'Municipal Corporation', 'Odisha', 'Khordha', 'Bhubaneswar'),
('Odisha Works Department', 'State PWD', 'Odisha', NULL, NULL),
('NHAI - National Highways Authority of India', 'Central Authority', NULL, NULL, NULL);

-- Seed contractor
INSERT INTO contractors (canonical_name, registered_state) VALUES
('Larsen & Toubro Limited', 'Maharashtra'),
('Afcons Infrastructure Limited', 'Maharashtra'),
('GR Infraprojects Limited', 'Rajasthan'),
('Local Contractor Pvt Ltd', 'Odisha');

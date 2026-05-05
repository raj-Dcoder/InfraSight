-- ============================================================
-- InfraSight: Seed Contractors & Authorities
-- ============================================================

-- Clear existing linked data first
TRUNCATE TABLE projects CASCADE;

-- ─── CONTRACTORS ───────────────────────────────────────────
DELETE FROM contractors;

INSERT INTO contractors (canonical_name, registered_state, website, aliases) VALUES
('Larsen & Toubro Limited',      'Maharashtra', 'https://larsentoubro.com',      ARRAY['L&T', 'L&T Construction']),
('Afcons Infrastructure Limited','Maharashtra', 'https://afcons.com',            ARRAY['Afcons']),
('GR Infraprojects Limited',     'Rajasthan',   'https://grinfraprojects.com',   ARRAY['GRIL', 'GR Infra']),
('Nagarjuna Construction Company','Telangana',  'https://nccltd.in',             ARRAY['NCC Ltd']),
('Tata Projects Limited',        'Telangana',   'https://tataprojects.com',      ARRAY['Tata Projects']),
('Dilip Buildcon Limited',       'Madhya Pradesh','https://dilipbuildcon.com',   ARRAY['DBL']),
('Shapoorji Pallonji',           'Maharashtra', 'https://shapoorjipallonji.com', ARRAY['SP Group']),
('Local Contractor Pvt Ltd',     'Odisha',      NULL,                            ARRAY[]::text[]);

-- ─── AUTHORITIES ────────────────────────────────────────────
DELETE FROM authorities;

INSERT INTO authorities (canonical_name, authority_type, state, city, website, nodal_officer) VALUES
('Odisha Works Department',                 'State PWD',                'Odisha',  'Bhubaneswar', 'https://works.odisha.gov.in',         'Principal Secretary, Works Dept.'),
('Bhubaneswar Development Authority',       'Urban Development Body',   'Odisha',  'Bhubaneswar', 'https://bda.gov.in',                  'Vice Chairman, BDA'),
('Bhubaneswar Municipal Corporation',       'Municipal Corporation',     'Odisha',  'Bhubaneswar', 'https://bmcbbsr.gov.in',              'Commissioner, BMC'),
('NHAI - National Highways Authority of India','Central Govt Agency',   'Central', 'New Delhi',   'https://nhai.gov.in',                 'Regional Officer, Odisha'),
('Smart City Bhubaneswar',                  'Smart City SPV',           'Odisha',  'Bhubaneswar', 'https://smartcitybhubaneswar.gov.in', 'CEO, Bhubaneswar Smart City Ltd.');

-- ─── PROJECT DATA (with contractor + authority links) ────────

INSERT INTO projects (
    project_code, title, category, status, state, district, city,
    sanctioned_budget_inr, source_url, physical_progress_pct, financial_progress_pct, location,
    contractor_id, authority_id, description, funding_source
) VALUES
(
  'OR-BBSR-2024-001',
  'Bhubaneswar Outer Ring Road - Phase 1 (Patia to Tamando)',
  'ROAD', 'IN_PROGRESS', 'Odisha', 'Khordha', 'Bhubaneswar',
  1150000000,
  'https://tendersodisha.gov.in/tenders/OR-BBSR-2024-001',
  45, 40,
  ST_SetSRID(ST_MakePoint(85.844, 20.260), 4326),
  (SELECT id FROM contractors WHERE canonical_name = 'Larsen & Toubro Limited'),
  (SELECT id FROM authorities WHERE canonical_name = 'Odisha Works Department'),
  'Construction of a 4-lane access-controlled outer ring road to decongest Bhubaneswar city traffic. Passes through Patia, Nandankanan and Tamando corridors.',
  'State Budget + ADB Loan'
),
(
  'OR-BBSR-2024-002',
  'Bhubaneswar-Cuttack Elevated Expressway',
  'ROAD', 'TENDERED', 'Odisha', 'Khordha', 'Bhubaneswar',
  2500000000,
  'https://tendersodisha.gov.in/tenders/OR-BBSR-2024-002',
  15, 25,
  ST_SetSRID(ST_MakePoint(85.830, 20.265), 4326),
  (SELECT id FROM contractors WHERE canonical_name = 'Afcons Infrastructure Limited'),
  (SELECT id FROM authorities WHERE canonical_name = 'Odisha Works Department'),
  'Elevated 6-lane expressway connecting Bhubaneswar and Cuttack, reducing travel time from 45 mins to under 20 mins.',
  'Central Road Fund (CRF)'
),
(
  'OR-BBSR-2024-003',
  'Ekamra-Khordha Road Widening & Beautification',
  'ROAD', 'PLANNED', 'Odisha', 'Khordha', 'Bhubaneswar',
  750000000,
  'https://bda.gov.in/projects/ekamra',
  0, 5,
  ST_SetSRID(ST_MakePoint(85.833, 20.240), 4326),
  (SELECT id FROM contractors WHERE canonical_name = 'Local Contractor Pvt Ltd'),
  (SELECT id FROM authorities WHERE canonical_name = 'Bhubaneswar Development Authority'),
  'Road widening from 2 to 4 lanes with landscaped medians, cycle tracks, and LED street lighting under Smart City Mission.',
  'Smart City Mission'
),
(
  'OR-BBSR-2024-004',
  'Dhauli Peace Pagoda Access Bridge',
  'BRIDGE', 'COMPLETED', 'Odisha', 'Khordha', 'Bhubaneswar',
  1800000000,
  'https://tendersodisha.gov.in/tenders/OR-BBSR-2024-004',
  100, 100,
  ST_SetSRID(ST_MakePoint(85.856, 20.275), 4326),
  (SELECT id FROM contractors WHERE canonical_name = 'GR Infraprojects Limited'),
  (SELECT id FROM authorities WHERE canonical_name = 'Bhubaneswar Municipal Corporation'),
  'A 4-lane bridge over the Daya River providing direct access to the Dhauli Peace Pagoda tourist site, reducing commute from 45 minutes to 10 minutes.',
  'Odisha Tourism Development'
),
(
  'OR-BBSR-2024-005',
  'Bhubaneswar Underground Sewerage Network - Phase II',
  'SANITATION', 'IN_PROGRESS', 'Odisha', 'Khordha', 'Bhubaneswar',
  3500000000,
  'https://owssb.nic.in/projects/sewerage',
  68, 60,
  ST_SetSRID(ST_MakePoint(85.850, 20.300), 4326),
  (SELECT id FROM contractors WHERE canonical_name = 'Local Contractor Pvt Ltd'),
  (SELECT id FROM authorities WHERE canonical_name = 'Bhubaneswar Municipal Corporation'),
  'Laying 210 km of underground sewerage pipes across 39 wards, connecting 1.2 lakh households to the central sewage treatment plant.',
  'AMRUT 2.0 (Centre + State)'
),
(
  'OR-BBSR-2024-006',
  'Biju Patnaik Airport Terminal 3 Expansion',
  'AIRPORT', 'TENDERED', 'Odisha', 'Khordha', 'Bhubaneswar',
  4200000000,
  'https://aai.aero/tenders',
  0, 0,
  ST_SetSRID(ST_MakePoint(85.818, 20.250), 4326),
  (SELECT id FROM contractors WHERE canonical_name = 'Larsen & Toubro Limited'),
  (SELECT id FROM authorities WHERE canonical_name = 'Odisha Works Department'),
  'A new terminal building doubling airport capacity to 10 million passengers per year, with integrated metro connectivity and modern apron facilities.',
  'Airport Authority of India (AAI)'
),
(
  'OR-BBSR-2024-007',
  'Smart Road - Janpath Corridor Upgrade',
  'ROAD', 'COMPLETED', 'Odisha', 'Khordha', 'Bhubaneswar',
  650000000,
  'https://smartcitybhubaneswar.gov.in/projects',
  100, 100,
  ST_SetSRID(ST_MakePoint(85.844, 20.290), 4326),
  (SELECT id FROM contractors WHERE canonical_name = 'Afcons Infrastructure Limited'),
  (SELECT id FROM authorities WHERE canonical_name = 'Bhubaneswar Development Authority'),
  'Full reconstruction of the 5 km Janpath corridor with smart lighting, CCTV surveillance, Wi-Fi hotspots, underground utilities and a public bicycle-sharing system.',
  'Smart City Mission'
),
(
  'OR-BBSR-2024-008',
  'Khandagiri Flyover Construction',
  'BRIDGE', 'DELAYED', 'Odisha', 'Khordha', 'Bhubaneswar',
  520000000,
  'https://tendersodisha.gov.in/tenders/OR-BBSR-2024-008',
  32, 45,
  ST_SetSRID(ST_MakePoint(85.774, 20.230), 4326),
  (SELECT id FROM contractors WHERE canonical_name = 'Local Contractor Pvt Ltd'),
  (SELECT id FROM authorities WHERE canonical_name = 'Bhubaneswar Municipal Corporation'),
  'A single-level flyover at the heavily congested Khandagiri–Baramunda junction. Currently delayed due to utility relocation disputes.',
  'State Budget'
),
(
  'OR-BBSR-2024-009',
  'NH-16 Bhubaneswar Bypass – 4 to 6 Lane Widening',
  'ROAD', 'IN_PROGRESS', 'Odisha', 'Khordha', 'Bhubaneswar',
  8500000000,
  'https://worksodisha.gov.in/projects',
  55, 50,
  ST_SetSRID(ST_MakePoint(85.820, 20.200), 4326),
  (SELECT id FROM contractors WHERE canonical_name = 'GR Infraprojects Limited'),
  (SELECT id FROM authorities WHERE canonical_name = 'NHAI - National Highways Authority of India'),
  'Widening of the 32 km Bhubaneswar bypass section of NH-16 from 4 to 6 lanes with service roads, grade separators and improved drainage.',
  'NHAI (Bharatmala Phase 1)'
),
(
  'OR-BBSR-2024-010',
  'Bhubaneswar Metro Rail Project - Phase 1 (Trisulia to Airport)',
  'METRO', 'PLANNED', 'Odisha', 'Khordha', 'Bhubaneswar',
  62550000000,
  'https://bmrcl.gov.in/phase1',
  0, 2,
  ST_SetSRID(ST_MakePoint(85.820, 20.350), 4326),
  (SELECT id FROM contractors WHERE canonical_name = 'Larsen & Toubro Limited'),
  (SELECT id FROM authorities WHERE canonical_name = 'Bhubaneswar Development Authority'),
  'Phase 1 of the Bhubaneswar Metro: 26.7 km elevated corridor with 20 stations from Trisulia in the north to Biju Patnaik International Airport, passing through the city centre.',
  'Central Govt + World Bank + State Share'
);

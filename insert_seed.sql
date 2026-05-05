TRUNCATE TABLE projects CASCADE;
INSERT INTO projects (
        project_code, title, category, status, state, district, city, 
        sanctioned_budget_inr, source_url, physical_progress_pct, financial_progress_pct, location,
        contractor_id, authority_id
    ) VALUES (
        'OR-BBSR-2024-001', 
        'Construction of 4-Lane Flyover at Khandagiri Intersection', 
        'ROAD'::project_category, 
        'IN_PROGRESS'::project_status, 
        'Odisha', 
        'Khordha', 
        'Bhubaneswar', 
        1150000000, 
        'https://tendersodisha.gov.in/tenders/OR-BBSR-2024-001', 
        45, 
        40, 
        ST_SetSRID(ST_MakePoint(85.78, 20.26), 4326),
        (SELECT id FROM contractors WHERE canonical_name = 'Larsen & Toubro Limited'),
        (SELECT id FROM authorities WHERE canonical_name = 'Odisha Works Department')
    );
INSERT INTO projects (
        project_code, title, category, status, state, district, city, 
        sanctioned_budget_inr, source_url, physical_progress_pct, financial_progress_pct, location,
        contractor_id, authority_id
    ) VALUES (
        'OR-BBSR-2024-002', 
        'Upgradation of Capital Hospital to Super Specialty', 
        'BUILDING'::project_category, 
        'DELAYED'::project_status, 
        'Odisha', 
        'Khordha', 
        'Bhubaneswar', 
        2500000000, 
        'https://tendersodisha.gov.in/tenders/OR-BBSR-2024-002', 
        15, 
        25, 
        ST_SetSRID(ST_MakePoint(85.815, 20.265), 4326),
        (SELECT id FROM contractors WHERE canonical_name = 'Afcons Infrastructure Limited'),
        (SELECT id FROM authorities WHERE canonical_name = 'Odisha Works Department')
    );
INSERT INTO projects (
        project_code, title, category, status, state, district, city, 
        sanctioned_budget_inr, source_url, physical_progress_pct, financial_progress_pct, location,
        contractor_id, authority_id
    ) VALUES (
        'OR-BBSR-2024-003', 
        'Ekamra Kshetra Heritage Project Phase 1', 
        'OTHER'::project_category, 
        'PLANNED'::project_status, 
        'Odisha', 
        'Khordha', 
        'Bhubaneswar', 
        750000000, 
        'https://bda.gov.in/projects/ekamra', 
        NULL, 
        5, 
        ST_SetSRID(ST_MakePoint(85.83, 20.24), 4326),
        (SELECT id FROM contractors WHERE canonical_name = 'Local Contractor Pvt Ltd'),
        (SELECT id FROM authorities WHERE canonical_name = 'Bhubaneswar Development Authority')
    );
INSERT INTO projects (
        project_code, title, category, status, state, district, city, 
        sanctioned_budget_inr, source_url, physical_progress_pct, financial_progress_pct, location,
        contractor_id, authority_id
    ) VALUES (
        'OR-BBSR-2024-004', 
        'New Inter-State Bus Terminal (ISBT) at Baramunda', 
        'BUILDING'::project_category, 
        'COMPLETED'::project_status, 
        'Odisha', 
        'Khordha', 
        'Bhubaneswar', 
        1800000000, 
        'https://tendersodisha.gov.in/tenders/OR-BBSR-2024-004', 
        100, 
        100, 
        ST_SetSRID(ST_MakePoint(85.795, 20.275), 4326),
        (SELECT id FROM contractors WHERE canonical_name = 'GR Infraprojects Limited'),
        (SELECT id FROM authorities WHERE canonical_name = 'Bhubaneswar Municipal Corporation')
    );
INSERT INTO projects (
        project_code, title, category, status, state, district, city, 
        sanctioned_budget_inr, source_url, physical_progress_pct, financial_progress_pct, location,
        contractor_id, authority_id
    ) VALUES (
        'OR-BBSR-2024-005', 
        'Integrated Sewerage System for Bhubaneswar City District II', 
        'SANITATION'::project_category, 
        'IN_PROGRESS'::project_status, 
        'Odisha', 
        'Khordha', 
        'Bhubaneswar', 
        3500000000, 
        'https://owssb.nic.in/projects/sewerage', 
        68, 
        60, 
        ST_SetSRID(ST_MakePoint(85.82, 20.3), 4326),
        (SELECT id FROM contractors WHERE canonical_name = 'Local Contractor Pvt Ltd'),
        (SELECT id FROM authorities WHERE canonical_name = 'Bhubaneswar Municipal Corporation')
    );
INSERT INTO projects (
        project_code, title, category, status, state, district, city, 
        sanctioned_budget_inr, source_url, physical_progress_pct, financial_progress_pct, location,
        contractor_id, authority_id
    ) VALUES (
        'OR-BBSR-2024-006', 
        'Expansion of Biju Patnaik International Airport Terminal 3', 
        'AIRPORT'::project_category, 
        'TENDERED'::project_status, 
        'Odisha', 
        'Khordha', 
        'Bhubaneswar', 
        4200000000, 
        'https://aai.aero/tenders', 
        NULL, 
        NULL, 
        ST_SetSRID(ST_MakePoint(85.815, 20.25), 4326),
        (SELECT id FROM contractors WHERE canonical_name = 'Larsen & Toubro Limited'),
        (SELECT id FROM authorities WHERE canonical_name = 'Odisha Works Department')
    );
INSERT INTO projects (
        project_code, title, category, status, state, district, city, 
        sanctioned_budget_inr, source_url, physical_progress_pct, financial_progress_pct, location,
        contractor_id, authority_id
    ) VALUES (
        'OR-BBSR-2024-007', 
        'Smart City Multi-Level Car Parking at Saheed Nagar', 
        'BUILDING'::project_category, 
        'COMPLETED'::project_status, 
        'Odisha', 
        'Khordha', 
        'Bhubaneswar', 
        650000000, 
        'https://smartcitybhubaneswar.gov.in/projects', 
        100, 
        100, 
        ST_SetSRID(ST_MakePoint(85.84, 20.29), 4326),
        (SELECT id FROM contractors WHERE canonical_name = 'Afcons Infrastructure Limited'),
        (SELECT id FROM authorities WHERE canonical_name = 'Bhubaneswar Development Authority')
    );
INSERT INTO projects (
        project_code, title, category, status, state, district, city, 
        sanctioned_budget_inr, source_url, physical_progress_pct, financial_progress_pct, location,
        contractor_id, authority_id
    ) VALUES (
        'OR-BBSR-2024-008', 
        'Drainage Renovation of Daya West Canal', 
        'WATER'::project_category, 
        'DELAYED'::project_status, 
        'Odisha', 
        'Khordha', 
        'Bhubaneswar', 
        520000000, 
        'https://tendersodisha.gov.in/tenders/OR-BBSR-2024-008', 
        32, 
        45, 
        ST_SetSRID(ST_MakePoint(85.85, 20.23), 4326),
        (SELECT id FROM contractors WHERE canonical_name = 'Local Contractor Pvt Ltd'),
        (SELECT id FROM authorities WHERE canonical_name = 'Bhubaneswar Municipal Corporation')
    );
INSERT INTO projects (
        project_code, title, category, status, state, district, city, 
        sanctioned_budget_inr, source_url, physical_progress_pct, financial_progress_pct, location,
        contractor_id, authority_id
    ) VALUES (
        'OR-BBSR-2024-009', 
        'Development of Outer Ring Road (Southern Phase)', 
        'ROAD'::project_category, 
        'IN_PROGRESS'::project_status, 
        'Odisha', 
        'Khordha', 
        'Bhubaneswar', 
        8500000000, 
        'https://worksodisha.gov.in/projects', 
        55, 
        50, 
        ST_SetSRID(ST_MakePoint(85.8, 20.2), 4326),
        (SELECT id FROM contractors WHERE canonical_name = 'GR Infraprojects Limited'),
        (SELECT id FROM authorities WHERE canonical_name = 'NHAI - National Highways Authority of India')
    );
INSERT INTO projects (
        project_code, title, category, status, state, district, city, 
        sanctioned_budget_inr, source_url, physical_progress_pct, financial_progress_pct, location,
        contractor_id, authority_id
    ) VALUES (
        'OR-BBSR-2024-010', 
        'Bhubaneswar Metro Rail Project - Phase 1 (Trisulia to Biju Patnaik Airport)', 
        'METRO'::project_category, 
        'PLANNED'::project_status, 
        'Odisha', 
        'Khordha', 
        'Bhubaneswar', 
        62550000000, 
        'https://bmrcl.gov.in/phase1', 
        NULL, 
        2, 
        ST_SetSRID(ST_MakePoint(85.82, 20.35), 4326),
        (SELECT id FROM contractors WHERE canonical_name = 'Larsen & Toubro Limited'),
        (SELECT id FROM authorities WHERE canonical_name = 'Bhubaneswar Development Authority')
    );
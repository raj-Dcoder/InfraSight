import json
import os

with open("backend/data/seed/bhubaneswar_projects.json", "r") as f:
    projects = json.load(f)

sql_statements = ["TRUNCATE TABLE projects CASCADE;"]

for p in projects:
    c_name = p.get('contractor').replace("'", "''") if p.get('contractor') else ""
    a_name = p.get('authority').replace("'", "''") if p.get('authority') else ""
    contractor_query = f"(SELECT id FROM contractors WHERE canonical_name = '{c_name}')" if p.get('contractor') else "NULL"
    authority_query = f"(SELECT id FROM authorities WHERE canonical_name = '{a_name}')" if p.get('authority') else "NULL"

    sql = f"""
    INSERT INTO projects (
        project_code, title, category, status, state, district, city, 
        sanctioned_budget_inr, source_url, physical_progress_pct, financial_progress_pct, location,
        contractor_id, authority_id
    ) VALUES (
        '{p.get('id')}', 
        '{p.get('title').replace("'", "''")}', 
        '{p.get('category')}'::project_category, 
        '{p.get('status')}'::project_status, 
        '{p.get('state')}', 
        '{p.get('district')}', 
        '{p.get('city')}', 
        {p.get('budget') or 'NULL'}, 
        '{p.get('source_url')}', 
        {p.get('physical_progress') or 'NULL'}, 
        {p.get('financial_progress') or 'NULL'}, 
        ST_SetSRID(ST_MakePoint({p.get('lng', 0)}, {p.get('lat', 0)}), 4326),
        {contractor_query},
        {authority_query}
    );
    """
    sql_statements.append(sql.strip())

with open("insert_seed.sql", "w") as f:
    f.write("\n".join(sql_statements))

print("SQL generated successfully.")

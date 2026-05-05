# 📖 Data Ingestion Guide: Adding New Projects

This guide explains how to add infrastructure projects for any city or state into the InfraSight platform.

---

## 🛠️ The Process (Step-by-Step)

### 1. Create a Data File
Navigate to the seed directory and create a new JSON file.
- **Path**: `data/seed/`
- **Naming Convention**: `city_name_projects.json` (e.g., `mumbai_projects.json`)

### 2. Prepare the JSON Structure
Every project must follow this exact schema to be accepted by the database.

```json
[
  {
    "title": "Project Name",
    "description": "Detailed description of the work being done.",
    "state": "State Name",
    "city": "City Name",
    "category": "ROAD", 
    "status": "IN_PROGRESS",
    "sanctioned_budget_inr": 5000000,
    "authority_name": "Government Body Name",
    "contractor_name": "Company Name",
    "original_end_date": "YYYY-MM-DD",
    "lat": 12.3456,
    "lng": 78.9012,
    "source_url": "https://link-to-official-tender.gov.in",
    "source_document_id": "UNIQUE-ID-123"
  }
]
```

### 3. Valid Options for Enums
To avoid errors, ensure you use these exact uppercase strings for categories and statuses:

| **Categories** | **Statuses** |
| :--- | :--- |
| `ROAD`, `BRIDGE`, `BUILDING` | `PLANNED`, `TENDERED` |
| `WATER`, `SANITATION`, `METRO` | `IN_PROGRESS`, `DELAYED` |
| `ELECTRICITY`, `OTHER` | `COMPLETED`, `ABANDONED` |

### 4. Run the Ingestion Command
Since you are running in Docker, place the JSON file in the repo-level `data/seed/` directory and execute this command in your terminal to sync the new file with the database:

```bash
docker exec -it infrasight_backend python run_seed.py
```

---

## 💡 Important Rules

1.  **Unique IDs**: The `source_document_id` is how the system identifies the project. If you use the same ID twice, the system will **update** the existing project instead of creating a new one.
2.  **Coordinates**: If `lat` and `lng` are missing or `0`, the project will not show up on the map.
3.  **Budgets**: Do not use commas in the `sanctioned_budget_inr`. Use raw numbers (e.g., `1000000` for 10 Lakhs).

---

## ✅ Verification
After running the command, visit the **Projects Page** (`/projects`) and use the search bar or city filter to confirm your data is live.

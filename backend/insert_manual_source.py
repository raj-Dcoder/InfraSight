import asyncio
import sys

sys.path.append("/app")

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.project import DataSource

async def setup():
    async with AsyncSessionLocal() as db:
        # Use raw SQL to bypass SQLAlchemy Enum casting issues
        from sqlalchemy import text
        existing = await db.execute(text("SELECT id FROM data_sources WHERE source_type = 'MANUAL_ENTRY'"))
        if not existing.first():
            await db.execute(text("""
                INSERT INTO data_sources (name, source_type, base_url, description, scraper_config, is_active)
                VALUES ('Manual JSON Seed', 'MANUAL_ENTRY', 'local', 'Reads pre-structured JSON seed files', '{"seed_dir": "/app/data/seed"}', true)
            """))
            await db.commit()
            print("Inserted MANUAL_ENTRY DataSource.")
        else:
            print("MANUAL_ENTRY DataSource already exists.")
            
        # Run scrapers again
        from app.ingestion.scheduler import run_all_active_scrapers
        results = await run_all_active_scrapers()
        print("Ingestion Results:", results)

if __name__ == "__main__":
    asyncio.run(setup())

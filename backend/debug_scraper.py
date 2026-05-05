import asyncio
import sys
sys.path.append("/app")

from app.ingestion.scrapers import ManualDataScraper
from app.core.database import AsyncSessionLocal
from sqlalchemy import text, select
from app.models.project import DataSource

async def debug():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("SELECT id FROM data_sources WHERE source_type = 'MANUAL_ENTRY'"))
        source_id = res.scalar()
        source = (await db.execute(select(DataSource).where(DataSource.id == source_id))).scalar_one_or_none()
        
    scraper = ManualDataScraper({"seed_dir": "/app/data/seed"})
    res = await scraper.run(source)
    print("Result:", res)

if __name__ == "__main__":
    asyncio.run(debug())

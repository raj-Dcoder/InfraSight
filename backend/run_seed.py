import asyncio
import uuid
import json
import os
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, init_db
from app.models.project import DataSource, Project, ProjectCategory, ProjectStatus, VerificationStatus
from app.ingestion.scrapers import ManualDataScraper

async def run_seed():
    await init_db()
    async with AsyncSessionLocal() as db:
        # Check if source exists, else create
        result = await db.execute(select(DataSource).where(DataSource.name == "Manual Seed Phase 1"))
        source = result.scalar_one_or_none()
        
        if not source:
            source = DataSource(
                id=uuid.uuid4(),
                name="Manual Seed Phase 1",
                source_type="MANUAL_ENTRY",
                description="Manual seed data for MVP"
            )
            db.add(source)
            await db.commit()
            await db.refresh(source)
            
        print("Using DataSource:", source.id)
        
        scraper = ManualDataScraper({"seed_dir": "/app/data/seed"})
        res = await scraper.run(source)
        print("Seed result:", res)

if __name__ == "__main__":
    asyncio.run(run_seed())

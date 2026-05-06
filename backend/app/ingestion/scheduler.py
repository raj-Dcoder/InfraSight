"""
Data ingestion scheduler — manages scraper execution and ingestion runs.
"""
import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select, update
from app.core.database import AsyncSessionLocal
from app.models.project import DataSource

logger = logging.getLogger(__name__)


async def run_all_active_scrapers():
    """Fetch all active data sources and run their scrapers."""
    async with AsyncSessionLocal() as db:
        sources = (await db.execute(
            select(DataSource).where(DataSource.is_active == True)
        )).scalars().all()

    results = {}
    for source in sources:
        try:
            result = await run_single_scraper(str(source.id))
            results[source.name] = result
        except Exception as e:
            logger.error(f"Scraper failed for {source.name}: {e}")
            results[source.name] = {"status": "failed", "error": str(e)}

    return results


async def run_single_scraper(source_id: str):
    """Run the appropriate scraper for a data source."""
    async with AsyncSessionLocal() as db:
        source = (await db.execute(
            select(DataSource).where(DataSource.id == source_id)
        )).scalar_one_or_none()

        if not source:
            return {"status": "not_found"}

        # Create ingestion run record
        from app.models.project import IngestionRun
        run = IngestionRun(data_source_id=source.id, status="RUNNING")
        db.add(run)
        await db.flush()
        run_id = run.id
        await db.commit()

    try:
        # Dispatch to the correct scraper
        from app.ingestion import scrapers
        scraper = scrapers.get_scraper(source.source_type, source.scraper_config or {})
        result = await scraper.run(source)

        async with AsyncSessionLocal() as db:
            from sqlalchemy import update as sa_update
            from app.models.project import IngestionRun as IR
            await db.execute(
                sa_update(IR).where(IR.id == run_id).values(
                    status="SUCCESS",
                    finished_at=datetime.now(timezone.utc),
                    records_found=result.get("found", 0),
                    records_inserted=result.get("inserted", 0),
                    records_updated=result.get("updated", 0),
                    records_skipped=result.get("skipped", 0),
                )
            )
            # Update last scraped timestamp
            await db.execute(
                sa_update(DataSource)
                .where(DataSource.id == source_id)
                .values(last_scraped_at=datetime.now(timezone.utc))
            )
            await db.commit()

        return result

    except Exception as e:
        async with AsyncSessionLocal() as db:
            from sqlalchemy import update as sa_update
            from app.models.project import IngestionRun as IR
            await db.execute(
                sa_update(IR).where(IR.id == run_id).values(
                    status="FAILED",
                    finished_at=datetime.now(timezone.utc),
                    error_log=str(e),
                )
            )
            await db.commit()
        raise

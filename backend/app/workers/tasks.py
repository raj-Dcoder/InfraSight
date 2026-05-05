"""
Celery tasks for data ingestion, normalization, and maintenance.
"""
import asyncio
import logging
from datetime import date
from typing import Optional

from celery import shared_task
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


def run_async(coro):
    """Run an async coroutine from a sync Celery task."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, name="app.workers.tasks.run_all_scrapers", max_retries=3)
def run_all_scrapers(self):
    """Trigger all active scrapers in sequence."""
    from app.ingestion.scheduler import run_all_active_scrapers
    try:
        result = run_async(run_all_active_scrapers())
        logger.info(f"All scrapers completed: {result}")
        return result
    except Exception as exc:
        logger.error(f"Scraper run failed: {exc}")
        raise self.retry(exc=exc, countdown=300)


@celery_app.task(bind=True, name="app.workers.tasks.run_scraper", max_retries=3)
def run_scraper(self, source_id: str):
    """Run scraper for a specific data source."""
    from app.ingestion.scheduler import run_single_scraper
    try:
        result = run_async(run_single_scraper(source_id))
        return result
    except Exception as exc:
        raise self.retry(exc=exc, countdown=120)


@celery_app.task(name="app.workers.tasks.normalize_projects")
def normalize_projects():
    """
    Normalization pass:
    - Canonicalize contractor names (fuzzy match)
    - Fill missing geo-coordinates via Nominatim
    - Detect duplicates
    """
    from app.processing.normalizer import normalize_all
    run_async(normalize_all())


@celery_app.task(name="app.workers.tasks.flag_delayed_projects")
def flag_delayed_projects():
    """Update status to DELAYED for projects past their end date."""
    from app.processing.normalizer import detect_and_flag_delays
    run_async(detect_and_flag_delays())


@celery_app.task(name="app.workers.tasks.process_pdf")
def process_pdf(document_id: str):
    """Extract structured data from an uploaded PDF document."""
    from app.ingestion.pdf_parser import extract_from_document
    run_async(extract_from_document(document_id))

"""
Data normalization pipeline.

Handles:
- Contractor name canonicalization via fuzzy matching
- Missing geo-coordinate enrichment (Nominatim)
- Duplicate detection
- Project status normalization
"""
import asyncio
import logging
from typing import Optional

import httpx
from rapidfuzz import fuzz, process
from sqlalchemy import select, update

from app.core.database import AsyncSessionLocal
from app.models.project import Project, Contractor, VerificationStatus

logger = logging.getLogger(__name__)

# Threshold for fuzzy name match (0-100)
CONTRACTOR_MATCH_THRESHOLD = 85


async def normalize_all():
    """Run the full normalization pipeline."""
    logger.info("Starting normalization pass")
    await enrich_missing_geocoordinates()
    await canonicalize_contractors()
    logger.info("Normalization pass complete")


async def enrich_missing_geocoordinates():
    """
    For projects with city/district but no geo point,
    query Nominatim (OSM geocoder) to get coordinates.
    """
    async with AsyncSessionLocal() as db:
        projects = (await db.execute(
            select(Project).where(
                Project.location.is_(None),
                Project.city.isnot(None),
            ).limit(100)  # Process in batches
        )).scalars().all()

    for project in projects:
        query = f"{project.city}, {project.district or ''}, {project.state}, India"
        coords = await _nominatim_geocode(query)
        if coords:
            lat, lng = coords
            from geoalchemy2.shape import from_shape
            from shapely.geometry import Point
            async with AsyncSessionLocal() as db:
                await db.execute(
                    update(Project)
                    .where(Project.id == project.id)
                    .values(location=from_shape(Point(lng, lat), srid=4326))
                )
                await db.commit()
            logger.info(f"Geocoded project {project.id}: {lat},{lng}")
        # Be respectful to Nominatim — 1 req/sec
        await asyncio.sleep(1.1)


async def _nominatim_geocode(query: str) -> Optional[tuple[float, float]]:
    """Query OSM Nominatim. Returns (lat, lng) or None."""
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": query,
        "format": "json",
        "limit": 1,
        "countrycodes": "in",
    }
    headers = {"User-Agent": "InfraSight/1.0 contact@infrasight.in"}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params, headers=headers)
            data = resp.json()
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as e:
        logger.warning(f"Nominatim error for '{query}': {e}")
    return None


async def canonicalize_contractors():
    """
    Fuzzy-match raw contractor names from project.raw_data
    against known contractors table, or create new entry.
    """
    async with AsyncSessionLocal() as db:
        known = (await db.execute(select(Contractor))).scalars().all()
        known_names = {c.canonical_name: c.id for c in known}
        all_aliases = {alias: c.id for c in known for alias in (c.aliases or [])}

        unmatched_projects = (await db.execute(
            select(Project).where(Project.contractor_id.is_(None))
            .limit(200)
        )).scalars().all()

    for project in unmatched_projects:
        raw_name = project.raw_data.get("contractor") or project.raw_data.get("contractor_name")
        if not raw_name:
            continue

        # Fuzzy match against canonical names
        match = process.extractOne(
            raw_name,
            list(known_names.keys()),
            scorer=fuzz.token_sort_ratio,
            score_cutoff=CONTRACTOR_MATCH_THRESHOLD,
        )

        if match:
            contractor_id = known_names[match[0]]
            logger.info(f"Matched '{raw_name}' → '{match[0]}' (score: {match[1]})")
        else:
            # Create new contractor
            async with AsyncSessionLocal() as db:
                new_contractor = Contractor(canonical_name=raw_name, aliases=[raw_name])
                db.add(new_contractor)
                await db.flush()
                contractor_id = new_contractor.id
                known_names[raw_name] = contractor_id
                await db.commit()
            logger.info(f"Created new contractor: '{raw_name}'")

        async with AsyncSessionLocal() as db:
            await db.execute(
                update(Project)
                .where(Project.id == project.id)
                .values(contractor_id=contractor_id)
            )
            await db.commit()


async def detect_and_flag_delays():
    """
    Flag projects as DELAYED where today > end_date and not completed.
    """
    from datetime import date
    from app.models.project import ProjectStatus

    today = date.today()
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            update(Project)
            .where(
                Project.status.in_([ProjectStatus.IN_PROGRESS, ProjectStatus.ON_HOLD]),
                Project.original_end_date < today,
                Project.revised_end_date.is_(None) |
                (Project.revised_end_date < today),
            )
            .values(status=ProjectStatus.DELAYED)
            .returning(Project.id)
        )
        flagged = result.fetchall()
        await db.commit()
        logger.info(f"Flagged {len(flagged)} projects as DELAYED")

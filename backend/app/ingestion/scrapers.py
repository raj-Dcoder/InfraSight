"""
Web scraper implementations for Indian government portals.

Each scraper follows the BaseScraper interface:
    async def run(source: DataSource) -> dict

Real scrapers use Playwright for JS-heavy portals and
BeautifulSoup for static HTML.
"""
import asyncio
import logging
import hashlib
import json
from abc import ABC, abstractmethod
from typing import Optional
from datetime import date, datetime

import httpx
from bs4 import BeautifulSoup

from app.core.database import AsyncSessionLocal
from app.models.project import Project, ProjectCategory, ProjectStatus, VerificationStatus

logger = logging.getLogger(__name__)


class BaseScraper(ABC):
    def __init__(self, config: dict):
        self.config = config

    @abstractmethod
    async def run(self, source) -> dict:
        pass

    async def _fetch_html(self, url: str, retries: int = 3) -> Optional[str]:
        """HTTP fetch with retries and Indian govt portal headers."""
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; InfraSight-Bot/1.0; +https://infrasight.in/bot)",
            "Accept-Language": "en-IN,en;q=0.9",
        }
        for attempt in range(retries):
            try:
                async with httpx.AsyncClient(timeout=30, verify=False) as client:
                    resp = await client.get(url, headers=headers, follow_redirects=True)
                    resp.raise_for_status()
                    return resp.text
            except Exception as e:
                logger.warning(f"Fetch attempt {attempt+1} failed for {url}: {e}")
                if attempt < retries - 1:
                    await asyncio.sleep(2 ** attempt)
        return None

    def _source_hash(self, data: dict) -> str:
        """Generate stable hash to detect duplicates."""
        key = json.dumps(data, sort_keys=True, default=str)
        return hashlib.sha256(key.encode()).hexdigest()

    async def _upsert_project(
        self,
        db,
        source,
        title: str,
        state: str,
        category: ProjectCategory,
        status: ProjectStatus = ProjectStatus.PLANNED,
        description: Optional[str] = None,
        city: Optional[str] = None,
        district: Optional[str] = None,
        contractor_name: Optional[str] = None,
        sanctioned_budget: Optional[float] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        source_url: Optional[str] = None,
        source_doc_id: Optional[str] = None,
        raw_data: Optional[dict] = None,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        physical_progress: Optional[int] = None,
        funding_source: Optional[str] = None,
    ) -> tuple[bool, bool]:
        """Insert or skip project. Returns (inserted, updated)."""
        from sqlalchemy import select

        # Check by source_document_id first
        existing = None
        if source_doc_id:
            existing = (await db.execute(
                select(Project).where(
                    Project.source_document_id == source_doc_id,
                    Project.data_source_id == source.id,
                )
            )).scalar_one_or_none()

        if existing:
            return False, False  # Skip duplicate

        project = Project(
            title=title[:1000],
            description=description,
            category=category,
            status=status,
            state=state,
            city=city,
            district=district,
            sanctioned_budget_inr=sanctioned_budget,
            start_date=start_date,
            original_end_date=end_date,
            data_source_id=source.id,
            source_url=source_url,
            source_document_id=source_doc_id,
            raw_data=raw_data or {},
            verification_status=VerificationStatus.UNVERIFIED,
            physical_progress_pct=physical_progress,
            funding_source=funding_source,
        )
        
        if lat is not None and lng is not None:
            from geoalchemy2.shape import from_shape
            from shapely.geometry import Point
            project.location = from_shape(Point(lng, lat), srid=4326)
            
        db.add(project)
        return True, False


class PMGSYScraper(BaseScraper):
    """
    Scraper for PMGSY (Pradhan Mantri Gram Sadak Yojana).
    URL: https://pmgsy.nic.in

    In production: Use Playwright to navigate state-wise project lists.
    MVP: Uses PMGSY open data API or HTML parsing of public reports.
    """

    async def run(self, source) -> dict:
        inserted = 0
        found = 0

        # PMGSY provides state-wise road project data
        # This is the known public URL pattern for road projects
        states_to_scrape = self.config.get("states", ["Odisha"])

        for state in states_to_scrape:
            url = f"{source.base_url}/stateprojects/{state.lower().replace(' ', '_')}"
            html = await self._fetch_html(url)
            if not html:
                logger.warning(f"No HTML returned for PMGSY {state}")
                continue

            soup = BeautifulSoup(html, "html.parser")
            rows = soup.select("table.project-table tr[data-id]")
            found += len(rows)

            async with AsyncSessionLocal() as db:
                for row in rows:
                    cells = row.select("td")
                    if len(cells) < 5:
                        continue

                    project_id = row.get("data-id", "")
                    title = cells[1].get_text(strip=True)
                    district = cells[2].get_text(strip=True)
                    budget_text = cells[3].get_text(strip=True).replace(",", "").replace("₹", "")

                    try:
                        budget = float(budget_text) if budget_text else None
                    except ValueError:
                        budget = None

                    ok, _ = await self._upsert_project(
                        db=db,
                        source=source,
                        title=title or f"PMGSY Road Project {project_id}",
                        state=state,
                        district=district,
                        category=ProjectCategory.ROAD,
                        status=ProjectStatus.IN_PROGRESS,
                        sanctioned_budget=budget,
                        source_url=url,
                        source_doc_id=f"pmgsy_{project_id}",
                        raw_data={c.get("data-field", f"col_{i}"): c.get_text(strip=True) for i, c in enumerate(cells)},
                    )
                    if ok:
                        inserted += 1

        return {"found": found, "inserted": inserted, "updated": 0}


class OdishaEProcScraper(BaseScraper):
    """
    Scraper for Odisha e-Procurement portal (tendersodisha.gov.in).
    Focus: Road construction tenders in Bhubaneswar (Phase 1 MVP).
    """

    async def run(self, source) -> dict:
        inserted = 0
        found = 0

        search_url = (
            f"{source.base_url}/nicgep/app?component=%24DirectLink&page=FrontEndAdvancedSearch"
            "&service=page&category=WORKS&state=ODISHA"
        )

        html = await self._fetch_html(search_url)
        if not html:
            return {"found": 0, "inserted": 0, "updated": 0}

        soup = BeautifulSoup(html, "html.parser")
        tender_rows = soup.select("table#tableid tr.even, table#tableid tr.odd")
        found = len(tender_rows)

        async with AsyncSessionLocal() as db:
            for row in tender_rows:
                cells = row.select("td")
                if len(cells) < 4:
                    continue

                tender_id = cells[0].get_text(strip=True)
                title = cells[2].get_text(strip=True)
                dept = cells[1].get_text(strip=True)
                link_tag = cells[2].find("a")
                source_url = f"{source.base_url}{link_tag['href']}" if link_tag else None

                ok, _ = await self._upsert_project(
                    db=db,
                    source=source,
                    title=title or f"Odisha PWD Tender {tender_id}",
                    state="Odisha",
                    city="Bhubaneswar",
                    category=ProjectCategory.ROAD,
                    status=ProjectStatus.TENDERED,
                    source_url=source_url,
                    source_doc_id=f"odisha_tender_{tender_id}",
                    raw_data={"tender_id": tender_id, "dept": dept},
                )
                if ok:
                    inserted += 1

        return {"found": found, "inserted": inserted, "updated": 0}


class ManualDataScraper(BaseScraper):
    """
    Reads pre-structured JSON seed files from /app/data/seed/.
    Used for Phase 1 MVP manual data entry.
    """

    async def run(self, source) -> dict:
        import os
        import json

        seed_dir = self.config.get("seed_dir", "/app/data/seed")
        inserted = 0
        found = 0

        for fname in os.listdir(seed_dir):
            if not fname.endswith(".json"):
                continue

            fpath = os.path.join(seed_dir, fname)
            with open(fpath) as f:
                records = json.load(f)

            if not isinstance(records, list):
                records = [records]

            found += len(records)
            print(f"Reading file: {fname}, found {len(records)} records")
            async with AsyncSessionLocal() as db:
                for record in records:
                    try:
                        ok, _ = await self._upsert_project(
                            db=db,
                            source=source,
                            title=record.get("title", "Untitled"),
                            state=record.get("state", "Odisha"),
                            description=record.get("description"),
                            city=record.get("city"),
                            district=record.get("district"),
                            category=ProjectCategory[record.get("category", "ROAD")],
                            status=ProjectStatus[record.get("status", "IN_PROGRESS")],
                            sanctioned_budget=record.get("budget", record.get("sanctioned_budget_inr")),
                            source_url=record.get("source_url"),
                            source_doc_id=record.get("id", record.get("source_document_id")),
                            raw_data=record,
                            lat=record.get("lat"),
                            lng=record.get("lng"),
                            physical_progress=record.get("physical_progress", record.get("physical_progress_pct")),
                            funding_source=record.get("funding_source"),
                        )
                        if ok:
                            inserted += 1
                    except Exception as e:
                        await db.rollback()
                        print(f"Failed to upsert record {record.get('id')}: {e}")
                await db.commit()
            print(f"Finished processing {fname}. Inserted: {inserted}")

        return {"found": found, "inserted": inserted, "updated": 0}


def get_scraper(source_type: str, config: dict) -> BaseScraper:
    """Factory: return the right scraper for a given source type."""
    registry = {
        "GOVERNMENT_PORTAL": PMGSYScraper,
        "TENDER_SYSTEM": OdishaEProcScraper,
        "MANUAL_ENTRY": ManualDataScraper,
    }
    cls = registry.get(source_type, ManualDataScraper)
    return cls(config)

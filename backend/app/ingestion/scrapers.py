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
from datetime import date, datetime, timezone

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

    def _with_ingestion_metadata(self, raw_data: Optional[dict]) -> dict:
        """Attach stable source metadata without losing original scraped fields."""
        data = dict(raw_data or {})
        data["_ingestion"] = {
            "source_hash": self._source_hash(raw_data or {}),
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }
        return data

    def _scope_value(self, key: str) -> Optional[str]:
        value = self.config.get(key)
        if value is None:
            return None
        return str(value).strip().lower()

    def _keyword_match(self, *values: Optional[str]) -> bool:
        keywords = [str(k).strip().lower() for k in self.config.get("keywords", []) if str(k).strip()]
        if not keywords:
            return True
        haystack = " ".join(str(v or "").lower() for v in values)
        return any(keyword in haystack for keyword in keywords)

    def _record_matches_scope(self, record: dict) -> bool:
        for key in ("state", "district", "city"):
            expected = self._scope_value(key)
            if expected and str(record.get(key, "")).strip().lower() != expected:
                return False

        expected_category = self._scope_value("category")
        if expected_category and str(record.get("category", "")).strip().upper() != expected_category.upper():
            return False

        text_fields = [
            record.get("title"),
            record.get("description"),
            record.get("department"),
            record.get("authority"),
            record.get("source_document_id"),
        ]
        if not self._keyword_match(*text_fields):
            return False

        return self._date_in_scope(record)

    def _parse_date(self, value) -> Optional[date]:
        if not value:
            return None
        if isinstance(value, date):
            return value
        try:
            return datetime.fromisoformat(str(value)[:10]).date()
        except ValueError:
            return None

    def _date_in_scope(self, record: dict) -> bool:
        date_from = self._parse_date(self.config.get("date_from"))
        date_to = self._parse_date(self.config.get("date_to"))
        if not date_from and not date_to:
            return True

        candidates = [
            self._parse_date(record.get("date")),
            self._parse_date(record.get("published_date")),
            self._parse_date(record.get("tender_date")),
            self._parse_date(record.get("sanctioned_date")),
            self._parse_date(record.get("start_date")),
            self._parse_date(record.get("end_date")),
            self._parse_date(record.get("original_end_date")),
        ]
        known_dates = [d for d in candidates if d is not None]
        if not known_dates:
            return True

        return any(
            (date_from is None or candidate >= date_from)
            and (date_to is None or candidate <= date_to)
            for candidate in known_dates
        )

    def _configured_category(self, default: ProjectCategory) -> ProjectCategory:
        category = self.config.get("category")
        if not category:
            return default
        try:
            return ProjectCategory[str(category).upper()]
        except KeyError:
            return default

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
        """Insert or update a project. Returns (inserted, updated)."""
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

            if existing is None:
                # Admin-created source rows can change over time. Treat the
                # source document id as the stronger duplicate key so reruns do
                # not create another public project for the same official record.
                existing = (await db.execute(
                    select(Project).where(Project.source_document_id == source_doc_id)
                )).scalars().first()

        if existing:
            changed = False
            raw_with_meta = self._with_ingestion_metadata(raw_data)
            source_hash = raw_with_meta["_ingestion"]["source_hash"]
            old_hash = (existing.raw_data or {}).get("_ingestion", {}).get("source_hash")

            # Keep human-verified facts stable; still preserve latest source payload
            # so reviewers can compare official data against the verified record.
            can_update_facts = existing.verification_status in (
                VerificationStatus.UNVERIFIED,
                VerificationStatus.DISPUTED,
            )

            if old_hash != source_hash:
                existing.raw_data = raw_with_meta
                changed = True

            if source_url and existing.source_url != source_url:
                existing.source_url = source_url
                changed = True

            if can_update_facts:
                updates = {
                    "title": title[:1000] if title else None,
                    "description": description,
                    "category": category,
                    "status": status,
                    "state": state,
                    "city": city,
                    "district": district,
                    "sanctioned_budget_inr": sanctioned_budget,
                    "start_date": start_date,
                    "original_end_date": end_date,
                    "physical_progress_pct": physical_progress,
                    "funding_source": funding_source,
                }
                for field, value in updates.items():
                    if value is not None and getattr(existing, field) != value:
                        setattr(existing, field, value)
                        changed = True

                if existing.location is None and lat is not None and lng is not None:
                    from geoalchemy2.shape import from_shape
                    from shapely.geometry import Point
                    existing.location = from_shape(Point(lng, lat), srid=4326)
                    changed = True

            return False, changed

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
            raw_data=self._with_ingestion_metadata(raw_data),
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
        updated = 0
        skipped = 0
        found = 0
        requested_category = self._scope_value("category")
        if requested_category and requested_category != ProjectCategory.ROAD.value.lower():
            return {"found": 0, "inserted": 0, "updated": 0, "skipped": 0}

        # PMGSY provides state-wise road project data
        # This is the known public URL pattern for road projects
        states_to_scrape = self.config.get("states") or [self.config.get("state") or "Odisha"]

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
                    city = self.config.get("city")

                    candidate = {
                        "title": title,
                        "state": state,
                        "district": district,
                        "city": city,
                        "category": ProjectCategory.ROAD.value,
                    }
                    if not self._record_matches_scope(candidate):
                        skipped += 1
                        continue

                    try:
                        budget = float(budget_text) if budget_text else None
                    except ValueError:
                        budget = None

                    was_inserted, was_updated = await self._upsert_project(
                        db=db,
                        source=source,
                        title=title or f"PMGSY Road Project {project_id}",
                        state=state,
                        city=city,
                        district=district,
                        category=ProjectCategory.ROAD,
                        status=ProjectStatus.IN_PROGRESS,
                        sanctioned_budget=budget,
                        source_url=url,
                        source_doc_id=f"pmgsy_{project_id}",
                        raw_data={c.get("data-field", f"col_{i}"): c.get_text(strip=True) for i, c in enumerate(cells)},
                    )
                    if was_inserted:
                        inserted += 1
                    elif was_updated:
                        updated += 1
                    else:
                        skipped += 1
                await db.commit()

        return {"found": found, "inserted": inserted, "updated": updated, "skipped": skipped}


class OdishaEProcScraper(BaseScraper):
    """
    Scraper for Odisha e-Procurement portal (tendersodisha.gov.in).
    Focus: Road construction tenders in Bhubaneswar (Phase 1 MVP).
    """

    async def run(self, source) -> dict:
        inserted = 0
        updated = 0
        found = 0
        skipped = 0

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
                state = self.config.get("state") or "Odisha"
                city = self.config.get("city") or "Bhubaneswar"
                district = self.config.get("district")
                category = self._configured_category(ProjectCategory.ROAD)

                candidate = {
                    "title": title,
                    "description": dept,
                    "department": dept,
                    "state": state,
                    "district": district,
                    "city": city,
                    "category": category.value,
                    "source_document_id": tender_id,
                }
                if not self._record_matches_scope(candidate):
                    skipped += 1
                    continue

                was_inserted, was_updated = await self._upsert_project(
                    db=db,
                    source=source,
                    title=title or f"Odisha PWD Tender {tender_id}",
                    state=state,
                    city=city,
                    district=district,
                    category=category,
                    status=ProjectStatus.TENDERED,
                    source_url=source_url,
                    source_doc_id=f"odisha_tender_{tender_id}",
                    raw_data={"tender_id": tender_id, "dept": dept},
                )
                if was_inserted:
                    inserted += 1
                elif was_updated:
                    updated += 1
                else:
                    skipped += 1
            await db.commit()

        return {"found": found, "inserted": inserted, "updated": updated, "skipped": skipped}


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
        updated = 0
        found = 0
        skipped = 0

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
                        candidate = {
                            **record,
                            "category": record.get("category", "ROAD"),
                            "source_document_id": record.get("id", record.get("source_document_id")),
                        }
                        if not self._record_matches_scope(candidate):
                            skipped += 1
                            continue

                        was_inserted, was_updated = await self._upsert_project(
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
                        if was_inserted:
                            inserted += 1
                        elif was_updated:
                            updated += 1
                        else:
                            skipped += 1
                    except Exception as e:
                        await db.rollback()
                        print(f"Failed to upsert record {record.get('id')}: {e}")
                await db.commit()
            print(f"Finished processing {fname}. Inserted: {inserted}, Updated: {updated}, Skipped: {skipped}")

        return {"found": found, "inserted": inserted, "updated": updated, "skipped": skipped}


def get_scraper(source_type: str, config: dict) -> BaseScraper:
    """Factory: return the right scraper for a given source type."""
    registry = {
        "GOVERNMENT_PORTAL": PMGSYScraper,
        "TENDER_SYSTEM": OdishaEProcScraper,
        "MANUAL_ENTRY": ManualDataScraper,
    }
    cls = registry.get(source_type, ManualDataScraper)
    return cls(config)

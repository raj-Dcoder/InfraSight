from datetime import date
import unittest

from app.ingestion.scrapers import BaseScraper
from app.models.project import ProjectCategory


class DummyScraper(BaseScraper):
    async def run(self, source) -> dict:
        return {"found": 0, "inserted": 0, "updated": 0, "skipped": 0}


class ScraperHelperTests(unittest.TestCase):
    def test_with_ingestion_metadata_preserves_raw_data_and_adds_hash(self):
        scraper = DummyScraper({})
        enriched = scraper._with_ingestion_metadata({"id": "abc", "title": "Road Work"})

        self.assertEqual(enriched["id"], "abc")
        self.assertEqual(enriched["title"], "Road Work")
        self.assertIn("source_hash", enriched["_ingestion"])
        self.assertIn("fetched_at", enriched["_ingestion"])

    def test_source_hash_is_stable_for_same_data_with_different_key_order(self):
        scraper = DummyScraper({})

        self.assertEqual(
            scraper._source_hash({"a": 1, "b": 2}),
            scraper._source_hash({"b": 2, "a": 1}),
        )

    def test_record_matches_scope_respects_city_category_keywords_and_dates(self):
        scraper = DummyScraper({
            "city": "Bhubaneswar",
            "category": "ROAD",
            "keywords": ["bridge"],
            "date_from": "2026-01-01",
            "date_to": "2026-12-31",
        })

        self.assertTrue(scraper._record_matches_scope({
            "title": "Canal bridge approach road",
            "state": "Odisha",
            "city": "Bhubaneswar",
            "category": "ROAD",
            "published_date": date(2026, 5, 1),
        }))

        self.assertFalse(scraper._record_matches_scope({
            "title": "Drain construction",
            "state": "Odisha",
            "city": "Cuttack",
            "category": "ROAD",
            "published_date": date(2026, 5, 1),
        }))

    def test_configured_category_falls_back_when_invalid(self):
        self.assertEqual(
            DummyScraper({"category": "METRO"})._configured_category(ProjectCategory.ROAD),
            ProjectCategory.METRO,
        )
        self.assertEqual(
            DummyScraper({"category": "NOT_REAL"})._configured_category(ProjectCategory.ROAD),
            ProjectCategory.ROAD,
        )


if __name__ == "__main__":
    unittest.main()

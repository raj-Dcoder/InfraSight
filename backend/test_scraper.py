import asyncio
import sys
import os

# Add /app to sys.path so we can import app modules when running inside docker
sys.path.append("/app")

from app.ingestion.scrapers import OdishaEProcScraper
from app.models.project import DataSource

async def test_scraper():
    # Create a mock data source
    mock_source = DataSource(
        id="00000000-0000-0000-0000-000000000001",
        base_url="https://tendersodisha.gov.in"
    )
    
    scraper = OdishaEProcScraper(config={})
    print(f"Running scraper for {mock_source.base_url}...")
    
    try:
        url = f"{mock_source.base_url}/nicgep/app?page=FrontEndLatestActiveTenders&service=page"
        html = await scraper._fetch_html(url)
        if html:
            with open("/app/tenders_dump2.html", "w", encoding="utf-8") as f:
                f.write(html)
            print("Saved to /app/tenders_dump2.html")
        else:
            print("Failed to fetch HTML.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_scraper())

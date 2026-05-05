import asyncio
import sys

sys.path.append("/app")

from app.ingestion.scrapers import PMGSYScraper
from app.models.project import DataSource

async def test_scraper():
    mock_source = DataSource(
        id="00000000-0000-0000-0000-000000000002",
        base_url="https://omms.nic.in"
    )
    
    scraper = PMGSYScraper(config={"states": ["Odisha"]})
    print(f"Running scraper for {mock_source.base_url}...")
    
    url = f"{mock_source.base_url}/stateprojects/odisha"
    try:
        html = await scraper._fetch_html(url)
        if html:
            print(f"Successfully fetched HTML: {len(html)} bytes")
        else:
            print("Failed to fetch HTML.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_scraper())

import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path="/usr/bin/chromium",
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        )
        page = await browser.new_page()
        
        print("Navigating to homepage...")
        try:
            await page.goto("https://tendersodisha.gov.in", timeout=30000)
            await page.wait_for_load_state("networkidle", timeout=10000)
            
            content = await page.content()
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(content, 'html.parser')
            
            print("Looking for XML or RSS links:")
            for a in soup.find_all("a", href=True):
                href = a['href']
                if 'xml' in href.lower() or 'rss' in href.lower() or 'feed' in href.lower():
                    print("Found:", href)
                    
        except Exception as e:
            print(f"Error: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())

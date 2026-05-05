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
        
        search_url = "https://tendersodisha.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndAdvancedSearch&service=page&category=WORKS&state=ODISHA"
        print(f"Navigating to {search_url}...")
        try:
            await page.goto(search_url, timeout=30000)
            await page.wait_for_load_state("networkidle", timeout=10000)
            
            content = await page.content()
            if "captcha" in content.lower():
                print("CAPTCHA detected!")
            else:
                print("NO CAPTCHA detected.")
            
            rows = await page.locator("table#tableid tr.even, table#tableid tr.odd").count()
            print(f"Found {rows} tender rows.")
            
            if rows > 0:
                print(await page.locator("table#tableid").inner_text())
                
        except Exception as e:
            print(f"Error: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())

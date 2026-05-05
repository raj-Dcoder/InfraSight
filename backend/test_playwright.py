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
        
        print("Navigating to tendersodisha.gov.in...")
        try:
            await page.goto("https://tendersodisha.gov.in/nicgep/app?page=FrontEndLatestActiveTenders&service=page", timeout=30000)
            await page.wait_for_load_state("networkidle", timeout=10000)
            print("Loaded. Saving screenshot...")
            await page.screenshot(path="/app/tendersodisha.png", full_page=True)
            
            content = await page.content()
            print(f"Content length: {len(content)}")
            if "captcha" in content.lower():
                print("CAPTCHA detected in page source!")
            
            # Let's try finding the table
            rows = await page.locator("table#tableid tr.even, table#tableid tr.odd").count()
            print(f"Found {rows} tender rows.")
            
        except Exception as e:
            print(f"Error: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())

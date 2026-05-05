import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path="/usr/bin/chromium",
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )
        page = await browser.new_page()
        
        urls = [
            "https://tendersodisha.gov.in/nicgep/app?page=FrontEndLatestActiveTenders&service=rss",
            "https://tendersodisha.gov.in/nicgep/app?page=RSSFeed&service=page"
        ]
        
        for u in urls:
            print(f"Trying {u}")
            try:
                r = await page.goto(u, timeout=10000)
                print(r.status, r.headers.get('content-type'))
                print(await page.content()[:200])
            except Exception as e:
                print(f"Error: {e}")
                
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())

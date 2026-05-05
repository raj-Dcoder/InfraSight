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
        
        url = "https://tendersodisha.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndAdvancedSearch&service=page&category=WORKS&state=ODISHA"
        print(f"Loading {url}")
        await page.goto(url)
        await page.wait_for_load_state("networkidle")
        
        content = await page.content()
        if "captcha" in content.lower():
            print("CAPTCHA found, attempting to find image...")
            # Look for captcha image
            img_locator = page.locator("img#captchaImage")
            if await img_locator.count() > 0:
                await img_locator.screenshot(path="/app/captcha.png")
                print("Saved captcha.png")
            else:
                print("No captcha image element found")
                
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())

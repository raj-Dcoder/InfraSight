import asyncio
import sys
sys.path.append("/app")

from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def clean():
    async with AsyncSessionLocal() as db:
        await db.execute(text('DELETE FROM projects'))
        await db.commit()
        print("Deleted existing projects.")

if __name__ == "__main__":
    asyncio.run(clean())

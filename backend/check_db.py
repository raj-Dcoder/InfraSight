import asyncio
import sys

sys.path.append("/app")
from sqlalchemy import select, func
from app.core.database import AsyncSessionLocal
from app.models.project import Project

async def count_projects():
    async with AsyncSessionLocal() as db:
        count = (await db.execute(select(func.count(Project.id)))).scalar()
        print(f"Total projects in DB: {count}")
        
        projects = (await db.execute(select(Project.title, Project.status))).all()
        for p in projects:
            print(f"- {p.title} ({p.status})")

if __name__ == "__main__":
    asyncio.run(count_projects())

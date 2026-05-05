import asyncio
import sys
sys.path.append("/app")

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.core.auth import hash_password

async def create_admin():
    async with AsyncSessionLocal() as db:
        admin_email = "admin@infrasight.com"
        exists = (await db.execute(select(User).where(User.email == admin_email))).scalar_one_or_none()
        
        if not exists:
            admin = User(
                email=admin_email,
                hashed_password=hash_password("admin123"),
                full_name="System Admin",
                role=UserRole.SUPER_ADMIN,
                is_active=True,
                is_verified=True
            )
            db.add(admin)
            await db.commit()
            print("Created admin user: admin@infrasight.com / admin123")
        else:
            print("Admin user already exists.")

if __name__ == "__main__":
    asyncio.run(create_admin())

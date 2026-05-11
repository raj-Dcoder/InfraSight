import asyncio
import os
import sys
sys.path.append("/app")

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.core.auth import hash_password

async def create_admin():
    async with AsyncSessionLocal() as db:
        admin_email = os.getenv("ADMIN_EMAIL", "admin@infrasight.com")
        admin_password = os.getenv("ADMIN_PASSWORD")
        if not admin_password or len(admin_password) < 12:
            raise RuntimeError("Set ADMIN_PASSWORD to a strong value with at least 12 characters")

        exists = (await db.execute(select(User).where(User.email == admin_email))).scalar_one_or_none()
        
        if not exists:
            admin = User(
                email=admin_email,
                hashed_password=hash_password(admin_password),
                full_name="System Admin",
                role=UserRole.SUPER_ADMIN,
                is_active=True,
                is_verified=True
            )
            db.add(admin)
            await db.commit()
            print(f"Created admin user: {admin_email}")
        else:
            print("Admin user already exists.")

if __name__ == "__main__":
    asyncio.run(create_admin())

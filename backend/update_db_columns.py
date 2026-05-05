
import asyncio
from sqlalchemy import text
from app.core.database import engine

async def update_db():
    columns = [
        ("pincode", "VARCHAR(10)"),
        ("consultant_name", "VARCHAR(500)"),
        ("supervisor_name", "VARCHAR(500)"),
        ("delay_reason", "TEXT"),
        ("accountability_score", "SMALLINT"),
        ("ai_insights", "JSONB DEFAULT '{}'::jsonb"),
    ]
    
    async with engine.begin() as conn:
        for col_name, col_type in columns:
            try:
                # Check if column exists first
                check_sql = text(f"SELECT column_name FROM information_schema.columns WHERE table_name='projects' AND column_name='{col_name}'")
                result = await conn.execute(check_sql)
                if not result.fetchone():
                    print(f"Adding column {col_name}...")
                    await conn.execute(text(f"ALTER TABLE projects ADD COLUMN {col_name} {col_type}"))
                else:
                    print(f"Column {col_name} already exists.")
            except Exception as e:
                print(f"Error adding {col_name}: {e}")

if __name__ == "__main__":
    asyncio.run(update_db())

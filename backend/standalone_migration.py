
import asyncio
import asyncpg
import os

async def update_db():
    # Credentials from .env or default
    user = "infrasight_user"
    password = "INFRAPWD@rajveer321"
    database = "infrasight"
    host = "localhost"
    port = "5432"

    print(f"Connecting to database {database} on {host}...")
    try:
        conn = await asyncpg.connect(
            user=user,
            password=password,
            database=database,
            host=host,
            port=port
        )
    except Exception as e:
        print(f"Failed to connect: {e}")
        # Try docker-compose service name just in case
        try:
            print("Trying 'db' host...")
            conn = await asyncpg.connect(
                user=user,
                password=password,
                database=database,
                host="db",
                port=port
            )
        except Exception as e2:
            print(f"Failed to connect to 'db' host: {e2}")
            return

    columns = [
        ("pincode", "VARCHAR(10)"),
        ("consultant_name", "VARCHAR(500)"),
        ("supervisor_name", "VARCHAR(500)"),
        ("delay_reason", "TEXT"),
        ("accountability_score", "SMALLINT"),
        ("ai_insights", "JSONB DEFAULT '{}'::jsonb"),
    ]
    
    for col_name, col_type in columns:
        try:
            # Check if column exists
            exists = await conn.fetchval(
                f"SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='{col_name}')"
            )
            if not exists:
                print(f"Adding column {col_name}...")
                await conn.execute(f"ALTER TABLE projects ADD COLUMN {col_name} {col_type}")
            else:
                print(f"Column {col_name} already exists.")
        except Exception as e:
            print(f"Error adding {col_name}: {e}")

    await conn.close()
    print("Migration finished.")

if __name__ == "__main__":
    asyncio.run(update_db())

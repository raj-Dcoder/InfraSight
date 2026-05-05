# InfraSight Deployment Guide

There are two realistic deployment modes.

## Full App With All Services Working

For API, frontend, PostGIS, Redis, Celery worker, Celery beat, scheduled scraping, delayed-project checks, and local file uploads, use one Always Free VPS and run:

```powershell
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

The best zero-monthly-cost target is Oracle Cloud Always Free Compute. It can run Docker Compose with the whole stack on a single VM, but it requires you to create an Oracle Cloud account and availability can vary by region.

Copy `.env.production.example` to `.env.production`, then update:

```text
POSTGRES_PASSWORD=...
SECRET_KEY=...
PUBLIC_BASE_URL=http://YOUR_SERVER_IP:8000
PUBLIC_API_URL=http://YOUR_SERVER_IP:8000
CORS_ORIGINS=["http://YOUR_SERVER_IP:3000"]
```

Then seed the database:

```powershell
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend python run_seed.py
```

Open:

```text
http://YOUR_SERVER_IP:3000
http://YOUR_SERVER_IP:8000/api/docs
```

Uploaded files are stored in the Docker volume `uploads_data` and served from `/uploads/...`.

## Split Free Demo Deployment

This setup keeps costs at zero for a demo/MVP:

- Frontend: Vercel Hobby, free
- Backend API: Render free web service
- Database: Supabase free Postgres with PostGIS

The split free version does not run the Celery worker/beat scheduler continuously. Use manual JSON seed data and the public API/UI. Always-on scraping/Redis workers usually require a paid worker or the single-VM deployment above.

## 1. Create The Database On Supabase

1. Create a free Supabase project.
2. In Supabase SQL Editor, run `backend/db/init.sql`.
3. Make sure PostGIS is enabled. Supabase supports the PostGIS extension from the dashboard/SQL editor.
4. Copy the pooler or direct Postgres connection string.
5. Convert it for SQLAlchemy async by changing the scheme:

```text
postgresql://USER:PASSWORD@HOST:PORT/DB
```

to:

```text
postgresql+asyncpg://USER:PASSWORD@HOST:PORT/DB
```

## 2. Deploy Backend API On Render

1. Push this repo to GitHub.
2. In Render, create a new Blueprint from the repo, or create a Docker Web Service manually.
3. If creating manually:
   - Root directory: `backend`
   - Runtime: Docker
   - Instance type: Free
   - Health check path: `/health`
4. Add environment variables:

```text
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=postgresql+asyncpg://...
SECRET_KEY=<long random secret>
CORS_ORIGINS=["https://YOUR-VERCEL-APP.vercel.app","http://localhost:3000"]
REDIS_URL=redis://localhost:6379/0
```

After deploy, your API should answer:

```text
https://YOUR-RENDER-SERVICE.onrender.com/health
https://YOUR-RENDER-SERVICE.onrender.com/api/docs
```

## 3. Seed The Database

Run this from the backend locally after setting `DATABASE_URL` to the Supabase URL:

```powershell
cd backend
pip install -r requirements.txt
$env:DATABASE_URL="postgresql+asyncpg://..."
python run_seed.py
```

If you use Docker instead, mount the repo data folder so `/app/data/seed` exists.

## 4. Deploy Frontend On Vercel

1. Import the GitHub repo into Vercel.
2. Set the project root directory to `frontend`.
3. Add environment variable:

```text
NEXT_PUBLIC_API_URL=https://YOUR-RENDER-SERVICE.onrender.com
NEXT_PUBLIC_MAPBOX_TOKEN=
```

4. Deploy.

## 5. Update CORS

After Vercel gives you the final URL, go back to Render and set:

```text
CORS_ORIGINS=["https://YOUR-VERCEL-APP.vercel.app","http://localhost:3000"]
```

Then redeploy the Render service.

## Free-Tier Caveats

- Render free web services spin down when inactive, so the first request can be slow.
- Render free service hours are limited per month.
- Supabase free projects can pause after inactivity and have storage limits.
- Background scraping, Redis, Celery workers, and file uploads are not fully covered by this free deployment.

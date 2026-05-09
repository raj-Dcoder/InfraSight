"""V1 API router — aggregates all sub-routers."""
from fastapi import APIRouter

from app.api.v1.endpoints import projects, search, complaints, auth, admin, updates, parties, analytics

router = APIRouter()

router.include_router(auth.router,       prefix="/auth",       tags=["Authentication"])
router.include_router(projects.router,   prefix="/projects",   tags=["Projects"])
router.include_router(search.router,     prefix="/search",     tags=["Search"])
router.include_router(complaints.router, prefix="/complaints", tags=["Complaints"])
router.include_router(updates.router,    prefix="/updates",    tags=["Updates"])
router.include_router(admin.router,      prefix="/admin",      tags=["Admin"])
router.include_router(parties.router,    prefix="",            tags=["Parties"])
router.include_router(analytics.router,  prefix="/analytics",  tags=["Analytics"])

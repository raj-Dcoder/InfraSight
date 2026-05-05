"""
InfraSight FastAPI Application Entry Point
"""
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.database import init_db
from app.api.v1 import router as api_v1_router
import structlog

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    logger.info("InfraSight starting up", environment=settings.ENVIRONMENT)
    await init_db()
    yield
    logger.info("InfraSight shutting down")


# Rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="InfraSight API",
    description="""
    ## InfraSight — India Infrastructure Transparency Platform
    
    A production-grade public data platform that aggregates, verifies, and presents
    infrastructure project data across India.
    
    ### Authentication
    - Public endpoints: No auth required
    - Complaint submission: Optional auth
    - Admin endpoints: JWT Bearer token required
    """,
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Local uploaded files. In production this should be backed by a Docker volume
# or replaced with S3/R2 once the project needs external object storage.
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# API Routes
app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "platform": "InfraSight",
    }

"""
Application configuration via environment variables.
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    APP_NAME: str = "InfraSight"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://infrasight_user:infrasight_pass@localhost:5432/infrasight"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://infrasight.in",
    ]

    # Storage (S3)
    S3_BUCKET: str = "infrasight-uploads"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "ap-south-1"
    UPLOAD_DIR: str = "/app/uploads"
    PUBLIC_BASE_URL: str = "http://localhost:8000"
    MAX_UPLOAD_SIZE_MB: int = 25

    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

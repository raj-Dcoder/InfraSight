"""
Application configuration via environment variables.
"""
from pydantic_settings import BaseSettings
from typing import List
from pydantic import model_validator
from sqlalchemy.engine import URL


class Settings(BaseSettings):
    # App
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    APP_NAME: str = "InfraSight"

    # Database
    DATABASE_URL: str = ""
    POSTGRES_DB: str = "infrasight"
    POSTGRES_USER: str = "infrasight_user"
    POSTGRES_PASSWORD: str = "infrasight_pass"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    SECRET_KEY: str = "dev-only-change-me"
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
    ALLOWED_UPLOAD_MIME_TYPES: List[str] = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "video/mp4",
    ]

    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    @property
    def database_url(self):
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return URL.create(
            "postgresql+asyncpg",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_HOST,
            port=self.POSTGRES_PORT,
            database=self.POSTGRES_DB,
        )

    @model_validator(mode="after")
    def validate_production_settings(self):
        if self.ENVIRONMENT.lower() == "production":
            weak_secrets = {"", "dev-only-change-me", "change-me-in-production"}
            if self.SECRET_KEY in weak_secrets or len(self.SECRET_KEY) < 32:
                raise ValueError("SECRET_KEY must be set to a strong value in production")
            if self.DEBUG:
                raise ValueError("DEBUG must be false in production")
        return self

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

"""
Celery application factory with beat schedule.
"""
from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "infrasight",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,

    # Beat schedule — ETL cron jobs
    beat_schedule={
        # Run all scrapers daily at 2 AM IST
        "scrape-all-daily": {
            "task": "app.workers.tasks.run_all_scrapers",
            "schedule": crontab(hour=2, minute=0),
        },
        # Normalize and deduplicate every 6 hours
        "normalize-data": {
            "task": "app.workers.tasks.normalize_projects",
            "schedule": crontab(minute=0, hour="*/6"),
        },
        # Flag delayed projects every hour
        "flag-delayed": {
            "task": "app.workers.tasks.flag_delayed_projects",
            "schedule": crontab(minute=30),
        },
    },
)

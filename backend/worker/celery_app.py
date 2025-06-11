from celery import Celery
from backend.core.config import settings

celery_app = Celery(
    "worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["backend.worker.tasks"],  # Tell Celery where to find task modules
)

# Optional: Update Celery configuration with more advanced settings if needed
celery_app.conf.update(
    task_track_started=True,
)

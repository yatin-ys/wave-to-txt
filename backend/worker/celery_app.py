from celery import Celery
from backend.core.config import settings

celery_app = Celery(
    "worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["backend.worker.tasks", "backend.worker.rag_tasks"],
)

celery_app.conf.update(
    task_track_started=True,
    broker_connection_retry_on_startup=True,
)

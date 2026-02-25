from celery import Celery

from app.config import settings

celery = Celery(
    "worker",
    broker=settings.celery_broker_url,
    backend=settings.celery_broker_url,
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)


@celery.task
def example_task(name: str) -> str:
    return f"Hello, {name}!"

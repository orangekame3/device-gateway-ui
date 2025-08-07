from celery import Celery
from .config import settings

# Create Celery app
celery_app = Celery(
    "device_gateway_ui",
    broker=f"redis://{getattr(settings, 'redis_host', 'localhost')}:{getattr(settings, 'redis_port', 6379)}",
    backend=f"redis://{getattr(settings, 'redis_host', 'localhost')}:{getattr(settings, 'redis_port', 6379)}",
    include=['app.tasks']
)

# Configure Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_routes={
        'app.tasks.*': {'queue': 'device_gateway_queue'},
    },
)

# Configure Celery Beat - use default scheduler for now
celery_app.conf.beat_schedule_filename = '/tmp/celerybeat-schedule'
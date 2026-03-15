---
title: "Monitoring Celery with Flower"
estimatedMinutes: 30
---

# Monitoring Celery with Flower

You have tasks queuing, workers processing, and retries firing. But how do you know if things are actually working? If a task silently fails, if the queue is backing up, or if a worker crashes, you need to find out before your users do.

Flower is a real-time web-based monitoring tool for Celery. It shows you active tasks, worker status, queue depth, execution times, and failure rates. Think of it as the dashboard for your background job system.

---

## Why Monitoring Matters

Without monitoring, you are flying blind. Here are real scenarios where Flower saves you:

**Queue backup.** Your email provider starts responding slowly (2 seconds instead of 200ms). Tasks pile up faster than workers can process them. Without monitoring, you do not realize this until users complain they never got their confirmation emails. With Flower, you see the queue depth climbing and can add more workers or investigate the root cause.

**Worker crashes.** A Celery worker runs out of memory and gets killed by the OS. Docker Compose might restart it, but during the downtime, no tasks are processed. Flower shows you worker status: online, offline, heartbeat timestamps.

**Retry storms.** A misconfigured task retries immediately on every failure, creating thousands of retry tasks that overwhelm your broker. Flower shows you the task states breakdown (pending, started, retrying, failed) so you can identify the problem.

**Performance regression.** A task that used to take 200ms is now taking 5 seconds because of a missing database index. Flower tracks execution times so you can spot regressions.

---

## Setting Up Flower

Flower is a Python package that ships with Celery. Add it to your requirements:

```txt
# backend/requirements.txt
django==5.1
djangorestframework==3.15
psycopg[binary]==3.2
redis==5.2
celery==5.4
flower==2.0
```

Add Flower as a Docker Compose service:

```yaml
# docker-compose.yml
services:
  # ... db, redis, backend, celery-worker from previous lessons ...

  flower:
    build: ./backend
    command: celery -A gather flower --port=5555 --broker_api=redis://redis:6379/0
    ports:
      - "5555:5555"
    depends_on:
      redis:
        condition: service_healthy
    environment:
      - REDIS_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/1
```

Start Flower:

```bash
docker compose up -d flower
```

Open your browser to `http://localhost:5555`. You should see the Flower dashboard.

---

## The Flower Dashboard

Flower's interface has several key sections:

### Workers Tab

The Workers tab is your first stop. It shows every connected Celery worker:

| Column | What It Tells You |
|--------|-------------------|
| Worker name | The hostname and PID of the worker process |
| Status | Online or Offline |
| Active | Number of tasks currently being executed |
| Processed | Total tasks processed since the worker started |
| Failed | Total tasks that raised exceptions |
| Succeeded | Total tasks that completed successfully |
| Load average | CPU load on the worker's machine |
| Uptime | How long the worker has been running |

If a worker disappears from this list, it has crashed or lost its connection to Redis. Flower uses Celery's heartbeat mechanism (workers send periodic pings) to detect this.

### Tasks Tab

The Tasks tab shows individual task executions. You can filter by:

- **State**: PENDING, RECEIVED, STARTED, SUCCESS, FAILURE, RETRY, REVOKED
- **Task name**: Filter by specific task (e.g., `events.tasks.send_rsvp_confirmation_email`)
- **Time range**: See tasks from the last hour, day, or custom range

Each task entry shows:

- Task UUID
- Task name
- Arguments (the `args` and `kwargs` passed to the task)
- State
- Worker that processed it
- Runtime (how long execution took)
- Received time, started time, completed time
- Exception info (if the task failed)

Click on a task UUID to see its full details, including the exception traceback for failed tasks.

### Broker Tab

The Broker tab shows the state of your Redis queues:

- **Queue name** (e.g., `celery`, `email`, `processing`)
- **Messages in queue** (pending tasks waiting for a worker)
- **Consumers** (workers listening on each queue)

This is where you spot queue backups. If the "Messages" column keeps growing while "Consumers" stays the same, your workers cannot keep up with the incoming task volume.

### Monitor Tab

The Monitor tab shows time-series graphs:

- **Task completion rate** (tasks/second)
- **Task failure rate** (failures/second)
- **Task runtime** (average execution time)
- **Queue length over time**

These graphs help you spot trends. A gradually increasing average runtime might indicate a database performance issue. A spike in failures might correlate with a third-party service outage.

---

## Flower API

Flower also exposes a REST API for programmatic access. This is useful for integrating with your own monitoring and alerting:

```bash
# List all workers
curl http://localhost:5555/api/workers

# List active tasks
curl http://localhost:5555/api/tasks

# Get task info by ID
curl http://localhost:5555/api/task/info/a1b2c3d4-e5f6-7890-abcd-ef1234567890

# Get queue lengths
curl http://localhost:5555/api/queues/length
```

Example response from the workers endpoint:

```json
{
  "celery@worker-1": {
    "status": true,
    "active": 2,
    "processed": 1547,
    "failed": 12,
    "succeeded": 1535,
    "stats": {
      "total": {
        "events.tasks.send_rsvp_confirmation_email": 823,
        "events.tasks.process_waitlist": 412,
        "events.tasks.notify_organizer_of_rsvp": 312
      }
    }
  }
}
```

---

## Alerting on Queue Depth

Flower's dashboard is great for manual investigation, but you also need automated alerts. A simple approach is a periodic task that checks queue depth and sends an alert:

```python
# backend/events/tasks.py

import redis as redis_lib
from celery import shared_task
from django.conf import settings

import logging

logger = logging.getLogger(__name__)

QUEUE_DEPTH_THRESHOLD = 100


@shared_task
def check_queue_health():
    """Monitor queue depth and alert if tasks are backing up."""
    r = redis_lib.Redis.from_url(settings.CELERY_BROKER_URL)

    queues_to_check = ["celery", "email", "processing"]
    alerts = []

    for queue_name in queues_to_check:
        depth = r.llen(queue_name)
        logger.info("Queue %s: %d pending tasks", queue_name, depth)

        if depth > QUEUE_DEPTH_THRESHOLD:
            alerts.append({
                "queue": queue_name,
                "depth": depth,
                "threshold": QUEUE_DEPTH_THRESHOLD,
            })

    if alerts:
        logger.warning(
            "Queue depth alert: %s",
            ", ".join(
                f"{a['queue']}={a['depth']} (threshold: {a['threshold']})"
                for a in alerts
            ),
        )
        # In production, send this to Slack, PagerDuty, or your alerting system
        # send_slack_alert.delay(f"Queue backup detected: {alerts}")

    return {"queues_checked": len(queues_to_check), "alerts": len(alerts)}
```

Schedule this with Celery Beat to run every 5 minutes:

```python
# backend/gather/settings.py

from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    "check-queue-health": {
        "task": "events.tasks.check_queue_health",
        "schedule": 300.0,  # every 5 minutes (in seconds)
    },
}
```

---

## Celery Beat: The Task Scheduler

Celery Beat is a scheduler that sends tasks to the queue at defined intervals. It is the cron of the Celery world. Add it to Docker Compose:

```yaml
# docker-compose.yml
services:
  # ... existing services ...

  celery-beat:
    build: ./backend
    command: celery -A gather beat -l INFO --schedule=/tmp/celerybeat-schedule
    depends_on:
      redis:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgres://gather:gather@db:5432/gather
      - REDIS_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/1
```

The `--schedule` flag tells Beat where to store its schedule state file. This file tracks the last time each periodic task was sent so that restarting Beat does not cause duplicate task submissions.

Some example periodic tasks for Gather:

```python
# backend/gather/settings.py

from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    "check-queue-health": {
        "task": "events.tasks.check_queue_health",
        "schedule": 300.0,  # every 5 minutes
    },
    "send-event-reminders": {
        "task": "events.tasks.send_event_reminders",
        "schedule": crontab(hour=9, minute=0),  # daily at 9 AM
    },
    "cleanup-expired-drafts": {
        "task": "events.tasks.cleanup_expired_drafts",
        "schedule": crontab(hour=2, minute=0),  # daily at 2 AM
    },
    "generate-weekly-organizer-reports": {
        "task": "events.tasks.generate_weekly_reports",
        "schedule": crontab(hour=8, minute=0, day_of_week=1),  # Mondays at 8 AM
    },
}
```

**Important**: Only run one instance of Celery Beat. Unlike workers (which you can scale horizontally), Beat is a single-process scheduler. Running two Beat instances will submit duplicate tasks.

---

## Celery Events and Signals

Celery emits events at every stage of the task lifecycle. Flower consumes these events to build its dashboard, but you can also use them for custom monitoring:

```python
# backend/gather/celery.py

from celery.signals import (
    task_prerun,
    task_postrun,
    task_failure,
    task_retry,
    worker_ready,
    worker_shutdown,
)

import logging
import time

logger = logging.getLogger("celery.monitoring")


@task_prerun.connect
def task_started_handler(sender=None, task_id=None, task=None, **kwargs):
    """Log when a task starts executing."""
    logger.info("Task started: %s[%s]", task.name, task_id)


@task_postrun.connect
def task_completed_handler(
    sender=None, task_id=None, task=None, retval=None, state=None, **kwargs
):
    """Log when a task finishes."""
    logger.info("Task %s: %s[%s] result=%s", state, task.name, task_id, retval)


@task_failure.connect
def task_failed_handler(
    sender=None, task_id=None, exception=None, traceback=None, **kwargs
):
    """Log task failures with details."""
    logger.error(
        "Task failed: %s[%s] exception=%s",
        sender.name,
        task_id,
        str(exception),
    )


@task_retry.connect
def task_retry_handler(sender=None, request=None, reason=None, **kwargs):
    """Log task retries."""
    logger.warning(
        "Task retrying: %s[%s] reason=%s attempt=%d",
        sender.name,
        request.id,
        str(reason),
        request.retries + 1,
    )


@worker_ready.connect
def worker_started(**kwargs):
    logger.info("Celery worker is ready")


@worker_shutdown.connect
def worker_stopped(**kwargs):
    logger.info("Celery worker is shutting down")
```

These signal handlers give you structured logs that feed into your observability stack. In Module 07, you will connect these to OpenTelemetry for distributed tracing.

---

## The Complete Docker Compose Stack

Here is the full Docker Compose configuration with all the services you have built in this module:

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: gather
      POSTGRES_USER: gather
      POSTGRES_PASSWORD: gather
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  backend:
    build: ./backend
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_started
      redis:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgres://gather:gather@db:5432/gather
      - REDIS_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/1
      - EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

  celery-worker:
    build: ./backend
    command: celery -A gather worker -l INFO -E
    volumes:
      - ./backend:/app
    depends_on:
      db:
        condition: service_started
      redis:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgres://gather:gather@db:5432/gather
      - REDIS_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/1
      - EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

  celery-beat:
    build: ./backend
    command: celery -A gather beat -l INFO --schedule=/tmp/celerybeat-schedule
    depends_on:
      redis:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgres://gather:gather@db:5432/gather
      - REDIS_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/1

  flower:
    build: ./backend
    command: celery -A gather flower --port=5555
    ports:
      - "5555:5555"
    depends_on:
      redis:
        condition: service_healthy
    environment:
      - REDIS_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/1

volumes:
  postgres_data:
  redis_data:
```

Note the `-E` flag on the celery-worker command. This enables Celery events, which Flower needs to receive real-time task state updates. Without it, Flower can only see workers but not individual task executions.

Start everything:

```bash
docker compose up -d
```

Verify all services are running:

```bash
docker compose ps
```

You should see six services: `db`, `redis`, `backend`, `celery-worker`, `celery-beat`, and `flower`. Open `http://localhost:5555` to see the Flower dashboard with your worker connected and ready.

---

## Key Takeaways

- Flower is a real-time monitoring dashboard for Celery. Access it at `http://localhost:5555`.
- The Workers tab shows worker status, processed task counts, and failure rates.
- The Tasks tab lets you inspect individual task executions, including arguments, runtime, and error details.
- The Broker tab shows queue depth, which is the primary metric for detecting backups.
- Use Celery Beat for periodic tasks (scheduled reports, health checks, cleanup jobs). Only run one Beat instance.
- Add the `-E` flag to your Celery worker command to enable events for Flower monitoring.
- Build automated alerts on queue depth so you catch problems before users notice.
- Celery signals give you hooks for custom logging and monitoring at every stage of the task lifecycle.

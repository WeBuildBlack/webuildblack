---
title: "Module Project: Async RSVP Pipeline"
estimatedMinutes: 75
---

# Async RSVP Pipeline

Move Gather's entire RSVP confirmation flow from synchronous to asynchronous processing. You will build three Celery tasks (confirmation email, waitlist update, organizer notification), add retry with exponential backoff, configure a dead letter queue for permanently failed tasks, and set up Flower for monitoring. Everything runs in Docker Compose.

## Overview

Right now, Gather's RSVP endpoint does everything synchronously: creates the RSVP, sends a confirmation email, checks the waitlist, and notifies the organizer. The response takes 3 to 4 seconds. By the end of this project, the endpoint will return in under 15 milliseconds. All the heavy work happens in Celery workers running alongside Django.

## What You'll Practice

- Configuring Celery with Django and Redis (from Lesson 3)
- Defining tasks with `@shared_task` and passing serializable arguments (from Lesson 3)
- Implementing exponential backoff with `retry_backoff` and `retry_jitter` (from Lesson 4)
- Making tasks idempotent with idempotency keys (from Lesson 4)
- Building a dead letter queue for permanently failed tasks (from Lesson 4)
- Running Celery Beat for periodic health checks (from Lesson 5)
- Monitoring with Flower (from Lesson 5)

## Prerequisites

- Docker and Docker Compose installed
- Completed Module 02 (your Gather project has Django + PostgreSQL in Docker Compose)
- Basic familiarity with Django models and views

## Project Setup

Create the following file structure inside your Gather project. Files marked with `(starter)` contain scaffolding with `# TODO:` markers for you to complete. Files marked with `(complete)` are provided in full.

```
gather/
├── docker-compose.yml                  (starter)
├── backend/
│   ├── Dockerfile                      (complete)
│   ├── requirements.txt                (starter)
│   ├── gather/
│   │   ├── __init__.py                 (starter)
│   │   ├── celery.py                   (starter)
│   │   └── settings.py                 (starter - add Celery config)
│   └── events/
│       ├── models.py                   (starter)
│       ├── tasks.py                    (starter)
│       ├── views.py                    (starter)
│       └── admin.py                    (starter)
```

---

## Step 1: Docker Compose and Dependencies

### requirements.txt

Add the packages you need for Celery and Redis:

```txt
# backend/requirements.txt
django==5.1
djangorestframework==3.15
psycopg[binary]==3.2
redis==5.2
celery==5.4
flower==2.0
```

### Dockerfile

Use this Dockerfile for the backend (provided complete):

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

### docker-compose.yml

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

  # TODO: Add celery-worker service
  # - Use the same build context as backend (./backend)
  # - Command: celery -A gather worker -l INFO -E
  # - Mount the same volume as backend
  # - Depends on: db (service_started) and redis (service_healthy)
  # - Same environment variables as backend
  # - The -E flag enables events for Flower monitoring

  # TODO: Add celery-beat service
  # - Use the same build context as backend (./backend)
  # - Command: celery -A gather beat -l INFO --schedule=/tmp/celerybeat-schedule
  # - Depends on: redis (service_healthy)
  # - Same environment variables as backend (needs REDIS_URL)
  # - IMPORTANT: Only run ONE instance of beat

  # TODO: Add flower service
  # - Use the same build context as backend (./backend)
  # - Command: celery -A gather flower --port=5555
  # - Map port 5555:5555
  # - Depends on: redis (service_healthy)
  # - Needs REDIS_URL and CELERY_RESULT_BACKEND environment variables

volumes:
  postgres_data:
  redis_data:
```

---

## Step 2: Celery Configuration

### gather/__init__.py

```python
# backend/gather/__init__.py

# TODO: Import the Celery app so it is loaded when Django starts
# Hint: from .celery import app as celery_app
# Then set __all__ = ("celery_app",)
```

### gather/celery.py

```python
# backend/gather/celery.py

import os

from celery import Celery

# TODO: Set the default Django settings module for the celery program
# Hint: os.environ.setdefault("DJANGO_SETTINGS_MODULE", "gather.settings")

# TODO: Create the Celery app with the name "gather"
# app = Celery(...)

# TODO: Load configuration from Django settings using the "CELERY" namespace
# Hint: app.config_from_object("django.conf:settings", namespace="CELERY")

# TODO: Auto-discover tasks in all installed Django apps
# Hint: app.autodiscover_tasks()
```

### gather/settings.py (additions)

Add these Celery settings to the bottom of your existing `settings.py`:

```python
# backend/gather/settings.py

# ... existing Django settings above ...

# ---------------------
# Celery Configuration
# ---------------------

# TODO: Set the broker URL from the REDIS_URL environment variable
# Default to "redis://localhost:6379/0" if not set
# Setting name: CELERY_BROKER_URL

# TODO: Set the result backend from CELERY_RESULT_BACKEND environment variable
# Default to "redis://localhost:6379/1" if not set
# Setting name: CELERY_RESULT_BACKEND

# TODO: Configure serialization to use JSON (not pickle)
# CELERY_TASK_SERIALIZER = ?
# CELERY_RESULT_SERIALIZER = ?
# CELERY_ACCEPT_CONTENT = ?

# TODO: Set the timezone to match Django's TIME_ZONE setting
# CELERY_TIMEZONE = ?

# TODO: Enable task tracking (CELERY_TASK_TRACK_STARTED)
# This allows Flower to show "STARTED" state

# TODO: Enable late acknowledgment (CELERY_TASK_ACKS_LATE)
# This prevents task loss if a worker crashes mid-execution

# TODO: Set prefetch multiplier to 1 (CELERY_WORKER_PREFETCH_MULTIPLIER)
# This ensures fair task distribution across workers

# TODO: Set result expiration to 24 hours in seconds (CELERY_RESULT_EXPIRES)

# TODO: Add Celery Beat schedule with a queue health check task
# Run "events.tasks.check_queue_health" every 300 seconds
# CELERY_BEAT_SCHEDULE = { ... }
```

---

## Step 3: Models

Add the models needed for idempotency tracking and the dead letter queue:

```python
# backend/events/models.py

from django.conf import settings
from django.db import models


class Event(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="organized_events",
    )
    capacity = models.PositiveIntegerField(default=100)
    has_waitlist = models.BooleanField(default=False)
    starts_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class RSVP(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="rsvps")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="rsvps",
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ("confirmed", "Confirmed"),
            ("cancelled", "Cancelled"),
        ],
        default="confirmed",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["event", "user"]

    def __str__(self):
        return f"{self.user} -> {self.event} ({self.status})"


class WaitlistEntry(models.Model):
    event = models.ForeignKey(
        Event, on_delete=models.CASCADE, related_name="waitlist_entries"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="waitlist_entries",
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ("waiting", "Waiting"),
            ("promoted", "Promoted"),
            ("expired", "Expired"),
        ],
        default="waiting",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.user} waitlisted for {self.event} ({self.status})"


# TODO: Create a ProcessedTask model for idempotency tracking
# Fields:
#   - idempotency_key: CharField, max_length=255, unique=True
#   - task_name: CharField, max_length=255
#   - processed_at: DateTimeField, auto_now_add=True
#   - result: JSONField, null=True
# Add a Meta class with an index on idempotency_key


# TODO: Create a DeadLetterTask model for permanently failed tasks
# Fields:
#   - task_id: CharField, max_length=255, unique=True
#   - task_name: CharField, max_length=255, db_index=True
#   - task_args: JSONField, default=list
#   - task_kwargs: JSONField, default=dict
#   - exception: TextField
#   - failed_at: DateTimeField
#   - replayed_at: DateTimeField, null=True, blank=True
#   - resolved: BooleanField, default=False
# Add a Meta class with ordering=["-failed_at"]
# Add a __str__ method showing task_name[task_id] failed at failed_at
```

---

## Step 4: Tasks

This is the core of the project. Implement the Celery tasks:

```python
# backend/events/tasks.py

import json
import logging
import smtplib
from datetime import datetime

import redis as redis_lib
from celery import Task, shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.db import IntegrityError
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


# ---------------------------------------------------------
# Base Task Class (Dead Letter Queue)
# ---------------------------------------------------------

class GatherTask(Task):
    """Base task class that routes permanently failed tasks to the DLQ."""

    # TODO: Implement the on_failure method
    # This method is called when a task fails permanently (all retries exhausted)
    # Parameters: self, exc, task_id, args, kwargs, einfo
    #
    # Steps:
    # 1. Call handle_dead_letter.delay() with:
    #    - task_name=self.name
    #    - task_args=args
    #    - task_kwargs=kwargs
    #    - exception_info=str(einfo)
    #    - task_id=task_id
    # 2. Call super().on_failure(exc, task_id, args, kwargs, einfo)


# Shared retry options for email tasks
EMAIL_TASK_OPTIONS = {
    "autoretry_for": (smtplib.SMTPException, ConnectionError, TimeoutError),
    "max_retries": 5,
    "retry_backoff": 30,
    "retry_backoff_max": 600,
    "retry_jitter": True,
    "base": GatherTask,
}


# ---------------------------------------------------------
# Dead Letter Queue Task
# ---------------------------------------------------------

@shared_task
def handle_dead_letter(task_name, task_args, task_kwargs, exception_info, task_id):
    """Store permanently failed tasks for investigation and replay."""
    # TODO: Import DeadLetterTask from events.models
    # TODO: Create a DeadLetterTask record with:
    #   - task_id=task_id
    #   - task_name=task_name
    #   - task_args=task_args (already a list, store directly)
    #   - task_kwargs=task_kwargs (already a dict, store directly)
    #   - exception=str(exception_info)
    #   - failed_at=datetime.now()
    # TODO: Log an error message with the task name, ID, and args
    pass


# ---------------------------------------------------------
# Helper: Idempotency Check
# ---------------------------------------------------------

def _check_idempotency(key, task_name):
    """Check if a task has already been processed. Returns True if already done."""
    from events.models import ProcessedTask
    return ProcessedTask.objects.filter(idempotency_key=key).exists()


def _mark_processed(key, task_name, result):
    """Mark a task as processed. Handles race conditions gracefully."""
    from events.models import ProcessedTask
    try:
        ProcessedTask.objects.create(
            idempotency_key=key,
            task_name=task_name,
            result=result,
        )
    except IntegrityError:
        pass  # Another worker already marked this as processed


# ---------------------------------------------------------
# Task 1: RSVP Confirmation Email
# ---------------------------------------------------------

@shared_task(**EMAIL_TASK_OPTIONS)
def send_rsvp_confirmation_email(user_id, event_id):
    """Send RSVP confirmation email to the user (idempotent)."""
    # TODO: Generate an idempotency key: f"rsvp_email:{user_id}:{event_id}"
    # TODO: Check idempotency with _check_idempotency(). If already processed,
    #       return {"status": "already_sent", "idempotency_key": key}

    # TODO: Import User model (get_user_model()) and Event model
    # TODO: Fetch the user and event by ID
    # TODO: If user or event does not exist, return {"status": "skipped"}

    # TODO: Send the confirmation email using Django's send_mail:
    #   subject: f"You're going to {event.title}!"
    #   from_email: "noreply@gather.dev"
    #   recipient_list: [user.email]
    #   message: A plain text version (e.g., f"Hi {user.first_name}, ...")
    #
    # Note: In dev, EMAIL_BACKEND=console prints to stdout instead of sending

    # TODO: Mark as processed with _mark_processed()
    # TODO: Log success and return {"status": "sent", "user_id": ..., "event_id": ...}
    pass


# ---------------------------------------------------------
# Task 2: Waitlist Processing
# ---------------------------------------------------------

@shared_task(
    autoretry_for=(ConnectionError, TimeoutError),
    max_retries=3,
    retry_backoff=10,
    retry_jitter=True,
    base=GatherTask,
)
def process_waitlist(event_id):
    """Check if anyone can be promoted from the waitlist (idempotent)."""
    from events.models import Event

    # TODO: Fetch the event. If it does not exist, return {"status": "skipped"}.

    # TODO: If the event does not have a waitlist (event.has_waitlist is False),
    #       return {"status": "no_waitlist", "event_id": event_id}

    # TODO: Count confirmed RSVPs. If count >= event.capacity,
    #       return {"status": "at_capacity", "event_id": event_id}

    # TODO: Get the next person on the waitlist:
    #       event.waitlist_entries.filter(status="waiting")
    #           .order_by("created_at").first()
    #       If nobody is waiting, return {"status": "empty_waitlist"}

    # TODO: Use a conditional update to promote them (idempotent):
    #       updated = event.waitlist_entries.filter(
    #           id=next_in_line.id, status="waiting"
    #       ).update(status="promoted")
    #
    #       If updated == 0, another worker already did it.
    #       Return {"status": "already_promoted"}

    # TODO: Queue send_waitlist_promotion_email.delay() for the promoted user

    # TODO: Return {"status": "promoted", "user_id": ..., "event_id": ...}
    pass


# ---------------------------------------------------------
# Task 3: Waitlist Promotion Email
# ---------------------------------------------------------

@shared_task(**EMAIL_TASK_OPTIONS)
def send_waitlist_promotion_email(user_id, event_id):
    """Notify a user they've been promoted from the waitlist (idempotent)."""
    # TODO: Generate idempotency key: f"waitlist_email:{user_id}:{event_id}"
    # TODO: Check idempotency. If already processed, return early.

    # TODO: Fetch user and event. If either does not exist, return skipped.

    # TODO: Send email:
    #   subject: f"You're off the waitlist for {event.title}!"
    #   from_email: "noreply@gather.dev"
    #   recipient_list: [user.email]

    # TODO: Mark as processed.
    # TODO: Return {"status": "sent", "user_id": ..., "event_id": ...}
    pass


# ---------------------------------------------------------
# Task 4: Organizer Notification
# ---------------------------------------------------------

@shared_task(**EMAIL_TASK_OPTIONS)
def notify_organizer_of_rsvp(organizer_id, attendee_id, event_id):
    """Notify the event organizer about a new RSVP (idempotent)."""
    # TODO: Generate idempotency key: f"organizer_rsvp:{organizer_id}:{attendee_id}:{event_id}"
    # TODO: Check idempotency. If already processed, return early.

    # TODO: Fetch organizer, attendee, and event by ID.
    #       If any does not exist, return skipped.

    # TODO: Send email:
    #   subject: f"New RSVP: {attendee.get_full_name()} is going to {event.title}"
    #   from_email: "noreply@gather.dev"
    #   recipient_list: [organizer.email]

    # TODO: Mark as processed.
    # TODO: Return {"status": "sent", "organizer_id": ..., "event_id": ...}
    pass


# ---------------------------------------------------------
# Task 5: Queue Health Check (Periodic)
# ---------------------------------------------------------

QUEUE_DEPTH_THRESHOLD = 100


@shared_task
def check_queue_health():
    """Monitor queue depth and log alerts if tasks are backing up."""
    # TODO: Create a Redis connection from settings.CELERY_BROKER_URL
    #       r = redis_lib.Redis.from_url(settings.CELERY_BROKER_URL)

    # TODO: Check the length of these queues: ["celery", "email", "processing"]
    #       Use r.llen(queue_name) for each

    # TODO: For each queue, log the depth at INFO level
    # TODO: If any queue exceeds QUEUE_DEPTH_THRESHOLD, log a WARNING

    # TODO: Return {"queues_checked": count, "alerts": alert_count}
    pass
```

---

## Step 5: Views

Update the RSVP endpoint to use background tasks:

```python
# backend/events/views.py

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Event, RSVP
from .tasks import (
    send_rsvp_confirmation_email,
    process_waitlist,
    notify_organizer_of_rsvp,
)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_rsvp(request, event_id):
    """Create an RSVP and queue background tasks for notifications."""
    # TODO: Fetch the event with select_related("organizer")
    #       Return 404 if not found

    # TODO: Create the RSVP record
    #       Handle the case where the user already has an RSVP (unique_together)
    #       Return 409 Conflict with a message if duplicate

    # TODO: Queue three background tasks:
    #   1. send_rsvp_confirmation_email.delay(user_id, event_id)
    #   2. process_waitlist.delay(event_id)
    #   3. notify_organizer_of_rsvp.delay(organizer_id, attendee_id, event_id)

    # TODO: Return 201 Created with {"id": rsvp.id, "status": rsvp.status}
    pass
```

---

## Step 6: Admin Registration

Register the new models in Django admin for easy inspection:

```python
# backend/events/admin.py

from django.contrib import admin
from .models import (
    Event,
    RSVP,
    WaitlistEntry,
    ProcessedTask,
    DeadLetterTask,
)


# TODO: Register all five models with the admin site
# For DeadLetterTask, create a ModelAdmin with:
#   - list_display: task_name, task_id, failed_at, resolved
#   - list_filter: task_name, resolved
#   - search_fields: task_id, task_name
#   - readonly_fields: task_id, task_name, task_args, task_kwargs, exception, failed_at
#
# For ProcessedTask, create a ModelAdmin with:
#   - list_display: idempotency_key, task_name, processed_at
#   - search_fields: idempotency_key, task_name
```

---

## Verification Checklist

After completing all the TODO items, verify your work:

### 1. Start all services

```bash
docker compose up -d --build
docker compose ps
```

You should see six services running: `db`, `redis`, `backend`, `celery-worker`, `celery-beat`, `flower`.

### 2. Run migrations

```bash
docker compose exec backend python manage.py makemigrations events
docker compose exec backend python manage.py migrate
```

### 3. Check Celery task discovery

```bash
docker compose logs celery-worker | grep "\[tasks\]" -A 10
```

You should see all five tasks listed:

```
[tasks]
  . events.tasks.check_queue_health
  . events.tasks.handle_dead_letter
  . events.tasks.notify_organizer_of_rsvp
  . events.tasks.process_waitlist
  . events.tasks.send_rsvp_confirmation_email
  . events.tasks.send_waitlist_promotion_email
```

### 4. Test the RSVP flow

Create a test user and event in the Django shell:

```bash
docker compose exec backend python manage.py shell
```

```python
from django.contrib.auth import get_user_model
from events.models import Event
from django.utils import timezone

User = get_user_model()
user = User.objects.create_user("testuser", "test@example.com", "password")
organizer = User.objects.create_user("organizer", "organizer@example.com", "password")
event = Event.objects.create(
    title="Brooklyn Tech Meetup",
    organizer=organizer,
    capacity=50,
    starts_at=timezone.now() + timezone.timedelta(days=7),
)
print(f"Event ID: {event.id}, User ID: {user.id}")
```

Then test the tasks directly:

```python
from events.tasks import send_rsvp_confirmation_email
result = send_rsvp_confirmation_email.delay(user.id, event.id)
print(f"Task ID: {result.id}")
print(f"Status: {result.status}")
# Wait a moment, then:
print(f"Result: {result.get(timeout=10)}")
```

### 5. Check Flower

Open `http://localhost:5555` in your browser. You should see:

- One worker on the Workers tab
- Your test task(s) on the Tasks tab
- Queue status on the Broker tab

### 6. Test idempotency

Run the same task again with the same arguments:

```python
result2 = send_rsvp_confirmation_email.delay(user.id, event.id)
print(result2.get(timeout=10))
# Should return: {"status": "already_sent", "idempotency_key": "rsvp_email:1:1"}
```

### 7. Verify the health check runs

Wait 5 minutes (or check Celery Beat logs) and look for the health check:

```bash
docker compose logs celery-worker | grep "check_queue_health"
```

---

## Stretch Goals

If you finish early, try these extensions:

1. **Add task routing.** Create separate `email` and `default` queues. Route email tasks to the `email` queue. Run a second worker that only handles email.

2. **Build a replay endpoint.** Create a Django management command that queries `DeadLetterTask` records where `resolved=False` and replays them. Mark them as replayed with a timestamp.

3. **Add task rate limiting.** Use Celery's `rate_limit` parameter to limit email tasks to 10 per second, preventing you from overwhelming your email provider.

4. **Test failure handling.** Create a task that always raises an exception and verify that it retries with backoff and eventually lands in the dead letter queue.

5. **Add Prometheus metrics.** Export Celery task counts, durations, and queue depths as Prometheus metrics using the `celery-exporter` package.

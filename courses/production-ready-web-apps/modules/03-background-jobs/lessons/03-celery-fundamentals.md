---
title: "Celery Fundamentals"
estimatedMinutes: 45
---

# Celery Fundamentals

Redis is running and ready to hold messages. Now you need something to produce those messages and something to consume them. That is what Celery does. Celery is a distributed task queue for Python. It handles serializing your function calls into messages, pushing them onto the broker, and running them in separate worker processes.

In this lesson, you will configure Celery with Django, define your first tasks, and trace the full lifecycle of a message from an HTTP request through Redis to a background worker.

---

## Celery Architecture

Celery has three core components:

```
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│    Client    │──push───▶│    Broker    │──pull───▶│    Worker    │
│  (Django)    │          │   (Redis)    │          │  (Celery)    │
│              │          │              │          │              │
│  task.delay()│          │  Redis List  │          │  Executes    │
│  creates msg │          │  holds msgs  │          │  the task fn │
└──────────────┘          └──────────────┘          └──────────────┘
```

**Client**: Your Django application code. When you call `send_confirmation_email.delay(user_id, event_id)`, the Celery client serializes this into a JSON message and pushes it onto a Redis list.

**Broker**: Redis. It holds the message until a worker is ready to process it. If no workers are running, messages accumulate in the list. When a worker becomes available, it pops the next message.

**Worker**: A separate process (not your Django web server) that runs in a loop: pop a message from Redis, deserialize it, call the function with the arguments, repeat. You can run multiple workers to process tasks in parallel.

There is an optional fourth component:

**Result backend**: A storage location where workers can write the return value of a task. Celery supports Redis, a database, or other backends for this. For Gather, most tasks are "fire and forget" (send an email, resize an image), so you will configure a result backend but only use it when you need to check whether a task succeeded.

---

## Setting Up Celery in Django

Celery integration with Django requires three files. Start with the Celery app configuration:

```python
# backend/gather/celery.py

import os

from celery import Celery

# Set Django settings module for the celery program
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "gather.settings")

# Create the Celery app
app = Celery("gather")

# Load config from Django settings, using the CELERY_ namespace
# This means all Celery settings in settings.py start with CELERY_
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks in all installed apps
# Celery will look for a tasks.py file in each app listed in INSTALLED_APPS
app.autodiscover_tasks()
```

Next, make sure the Celery app is loaded when Django starts:

```python
# backend/gather/__init__.py

from .celery import app as celery_app

__all__ = ("celery_app",)
```

This import ensures the Celery app is created when Django initializes, which registers all task decorators.

Finally, add Celery settings to your Django configuration:

```python
# backend/gather/settings.py

# ... existing settings ...

# ---------------------
# Celery Configuration
# ---------------------

# Broker: where tasks are queued
CELERY_BROKER_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

# Result backend: where task results are stored
CELERY_RESULT_BACKEND = os.environ.get(
    "CELERY_RESULT_BACKEND", "redis://localhost:6379/1"
)

# Serialization: use JSON for human-readable messages
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]

# Timezone: use Django's timezone setting
CELERY_TIMEZONE = TIME_ZONE

# Task result expiration: clean up results after 24 hours
CELERY_RESULT_EXPIRES = 86400  # seconds

# Task tracking: enable started state for monitoring
CELERY_TASK_TRACK_STARTED = True

# Late acknowledgment: acknowledge tasks after execution, not before
# This prevents task loss if a worker crashes mid-execution
CELERY_TASK_ACKS_LATE = True

# Prefetch multiplier: how many tasks a worker prefetches
# 1 means each worker only grabs one task at a time (fair distribution)
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
```

Let's break down the important settings:

- **`CELERY_TASK_SERIALIZER = "json"`**: Tasks are serialized as JSON. This is safer than Python's `pickle` (the old default) because JSON cannot execute arbitrary code during deserialization.
- **`CELERY_TASK_ACKS_LATE = True`**: By default, Celery tells Redis "I got it" before executing the task. With late acknowledgment, it waits until the task finishes. If the worker crashes, the message stays in Redis and another worker can pick it up.
- **`CELERY_WORKER_PREFETCH_MULTIPLIER = 1`**: Prevents a single worker from hoarding tasks. Each worker grabs one task, finishes it, then grabs the next. This matters when you have tasks with varying execution times.

---

## Defining Tasks

Tasks are regular Python functions decorated with `@shared_task`. The `shared_task` decorator registers the function with Celery without requiring a direct import of the Celery app instance:

```python
# backend/events/tasks.py

from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string


@shared_task
def send_rsvp_confirmation_email(user_id, event_id):
    """Send RSVP confirmation email to the user."""
    from django.contrib.auth import get_user_model
    from events.models import Event

    User = get_user_model()
    user = User.objects.get(id=user_id)
    event = Event.objects.get(id=event_id)

    html_content = render_to_string(
        "emails/rsvp_confirmation.html",
        {"event": event, "user": user},
    )

    send_mail(
        subject=f"You're going to {event.title}!",
        message="",
        html_message=html_content,
        from_email="noreply@gather.dev",
        recipient_list=[user.email],
    )

    return {"status": "sent", "user_id": user_id, "event_id": event_id}
```

**Important pattern: pass IDs, not objects.** Notice that the function accepts `user_id` and `event_id` (integers), not Django model instances. Task arguments must be JSON-serializable. You cannot serialize a Django model object to JSON, so you pass the ID and re-fetch the object inside the task. This also ensures you get the freshest data when the task executes (which might be seconds or minutes after it was queued).

**Imports inside the function.** The `from events.models import Event` import is inside the function body, not at the top of the file. This avoids circular import issues that are common in Django apps. The import only runs when the task executes, at which point Django is fully initialized.

Here are a few more tasks for the RSVP flow:

```python
# backend/events/tasks.py (continued)

@shared_task
def process_waitlist(event_id):
    """Check if anyone can be promoted from the waitlist."""
    from events.models import Event

    event = Event.objects.get(id=event_id)

    if not event.has_waitlist:
        return {"status": "no_waitlist", "event_id": event_id}

    # Check if there's capacity
    rsvp_count = event.rsvps.filter(status="confirmed").count()
    if rsvp_count >= event.capacity:
        return {"status": "at_capacity", "event_id": event_id}

    # Promote the next person
    next_in_line = (
        event.waitlist_entries
        .filter(status="waiting")
        .order_by("created_at")
        .first()
    )

    if not next_in_line:
        return {"status": "empty_waitlist", "event_id": event_id}

    next_in_line.status = "promoted"
    next_in_line.save()

    # Queue an email to the promoted person (task calling another task)
    send_waitlist_promotion_email.delay(next_in_line.user_id, event_id)

    return {
        "status": "promoted",
        "user_id": next_in_line.user_id,
        "event_id": event_id,
    }


@shared_task
def send_waitlist_promotion_email(user_id, event_id):
    """Notify a user they've been promoted from the waitlist."""
    from django.contrib.auth import get_user_model
    from events.models import Event

    User = get_user_model()
    user = User.objects.get(id=user_id)
    event = Event.objects.get(id=event_id)

    html_content = render_to_string(
        "emails/waitlist_promoted.html",
        {"event": event, "user": user},
    )

    send_mail(
        subject=f"You're off the waitlist for {event.title}!",
        message="",
        html_message=html_content,
        from_email="noreply@gather.dev",
        recipient_list=[user.email],
    )

    return {"status": "sent", "user_id": user_id, "event_id": event_id}


@shared_task
def notify_organizer_of_rsvp(organizer_id, attendee_id, event_id):
    """Send the event organizer a notification about a new RSVP."""
    from django.contrib.auth import get_user_model
    from events.models import Event

    User = get_user_model()
    organizer = User.objects.get(id=organizer_id)
    attendee = User.objects.get(id=attendee_id)
    event = Event.objects.get(id=event_id)

    html_content = render_to_string(
        "emails/organizer_new_rsvp.html",
        {"event": event, "attendee": attendee},
    )

    send_mail(
        subject=f"New RSVP: {attendee.get_full_name()} is going to {event.title}",
        message="",
        html_message=html_content,
        from_email="noreply@gather.dev",
        recipient_list=[organizer.email],
    )

    return {
        "status": "sent",
        "organizer_id": organizer_id,
        "event_id": event_id,
    }
```

---

## Calling Tasks: delay() vs apply_async()

There are two ways to send a task to the queue:

### delay() -- Simple Arguments

`delay()` is shorthand for the most common case. Pass arguments directly:

```python
# These are equivalent:
send_rsvp_confirmation_email.delay(user_id=42, event_id=7)
send_rsvp_confirmation_email.delay(42, 7)
```

### apply_async() -- Full Control

`apply_async()` gives you control over execution options:

```python
from datetime import timedelta

# Execute with a 30-second delay (e.g., "undo" window)
send_rsvp_confirmation_email.apply_async(
    args=[42, 7],
    countdown=30,
)

# Execute at a specific time
from django.utils import timezone
send_rsvp_confirmation_email.apply_async(
    args=[42, 7],
    eta=timezone.now() + timedelta(hours=1),
)

# Send to a specific queue
send_rsvp_confirmation_email.apply_async(
    args=[42, 7],
    queue="email",
)

# Set a hard time limit (kill if not done in 60 seconds)
send_rsvp_confirmation_email.apply_async(
    args=[42, 7],
    time_limit=60,
)

# Set an expiration (discard if not picked up within 5 minutes)
send_rsvp_confirmation_email.apply_async(
    args=[42, 7],
    expires=300,
)
```

For Gather's RSVP flow, `delay()` is sufficient. You will use `apply_async()` when you need retry control (Lesson 4) or task routing.

---

## Updating the RSVP View

Now refactor the synchronous RSVP endpoint to use background tasks:

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
    event = Event.objects.select_related("organizer").get(id=event_id)

    # Step 1: Create the RSVP (this is the only synchronous operation)
    rsvp = RSVP.objects.create(
        event=event,
        user=request.user,
        status="confirmed",
    )

    # Step 2: Queue background tasks (each takes ~2ms to enqueue)
    send_rsvp_confirmation_email.delay(
        user_id=request.user.id,
        event_id=event.id,
    )

    process_waitlist.delay(event_id=event.id)

    notify_organizer_of_rsvp.delay(
        organizer_id=event.organizer.id,
        attendee_id=request.user.id,
        event_id=event.id,
    )

    # Step 3: Return immediately
    return Response(
        {"id": rsvp.id, "status": rsvp.status},
        status=status.HTTP_201_CREATED,
    )
```

Compare the timing:

| Version | Steps in request | Response time |
|---------|-----------------|---------------|
| Before (synchronous) | DB write + 3 emails | ~4,000ms |
| After (async) | DB write + 3 queue pushes | ~11ms |

The user gets a response 360 times faster. The emails still get sent. They just happen in a separate process.

---

## Task Routing and Queues

By default, all tasks go to a single queue called `celery`. As your application grows, you might want to separate tasks by type so that slow tasks do not block fast ones:

```python
# backend/gather/settings.py

from kombu import Queue

CELERY_TASK_QUEUES = (
    Queue("default"),
    Queue("email"),
    Queue("processing"),
)

CELERY_TASK_DEFAULT_QUEUE = "default"

CELERY_TASK_ROUTES = {
    "events.tasks.send_rsvp_confirmation_email": {"queue": "email"},
    "events.tasks.send_waitlist_promotion_email": {"queue": "email"},
    "events.tasks.notify_organizer_of_rsvp": {"queue": "email"},
    "events.tasks.process_waitlist": {"queue": "default"},
    # Future: image processing tasks go to "processing"
}
```

Then run dedicated workers for each queue:

```bash
# Worker for email tasks only
celery -A gather worker -Q email -l INFO --concurrency=2

# Worker for default tasks
celery -A gather worker -Q default -l INFO --concurrency=4

# Worker for all queues (development)
celery -A gather worker -Q default,email,processing -l INFO
```

For Gather's current scale, a single worker handling all queues is fine. You will add queue routing when you add image processing in Module 05.

---

## Docker Compose: The Full Stack

Add the Celery worker to your Docker Compose configuration:

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

  celery-worker:
    build: ./backend
    command: celery -A gather worker -l INFO
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

volumes:
  postgres_data:
  redis_data:
```

The `celery-worker` service uses the same Docker image as `backend` but runs a different command. Instead of `python manage.py runserver`, it runs `celery -A gather worker -l INFO`. The `-l INFO` flag sets the log level so you can see tasks being received and completed.

Start everything:

```bash
docker compose up -d
```

Watch the worker logs:

```bash
docker compose logs -f celery-worker
```

You should see output like:

```
[config]
.> app:         gather:0x...
.> transport:   redis://redis:6379/0
.> results:     redis://redis:6379/1
.> concurrency: 4 (prefork)

[queues]
.> celery           exchange=celery(direct) key=celery

[tasks]
  . events.tasks.notify_organizer_of_rsvp
  . events.tasks.process_waitlist
  . events.tasks.send_rsvp_confirmation_email
  . events.tasks.send_waitlist_promotion_email

[2026-03-14 10:00:00,000: INFO/MainProcess] celery@worker ready.
```

Celery discovered all four tasks from `events/tasks.py` and is waiting for messages.

---

## Tracing the Full Flow

Let's trace exactly what happens when a user RSVPs to an event:

**1. User clicks "I'm Going" in the Next.js frontend.**

The frontend sends `POST /api/events/42/rsvp` with the user's auth token.

**2. Django receives the request.**

The `create_rsvp` view runs. It creates the RSVP database record (5ms).

**3. Django queues three tasks.**

Each `.delay()` call serializes the task name and arguments into a JSON message and pushes it onto the Redis list. Here is what one of those messages looks like:

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "task": "events.tasks.send_rsvp_confirmation_email",
  "args": [42, 7],
  "kwargs": {},
  "retries": 0,
  "eta": null,
  "expires": null
}
```

Three messages are pushed to Redis in about 6ms total.

**4. Django returns 201 Created.**

Total response time: approximately 11ms. The user sees confirmation instantly.

**5. The Celery worker pops the first message from Redis.**

The worker deserializes the message, looks up the function `events.tasks.send_rsvp_confirmation_email`, and calls it with `args=[42, 7]`.

**6. The task function executes.**

It fetches the User and Event from the database, renders the email template, and calls `send_mail()`. This takes about 1.5 seconds, but the user does not notice because it is happening in a background process.

**7. The worker logs the result and pops the next message.**

```
[INFO] Task events.tasks.send_rsvp_confirmation_email[a1b2c3d4] succeeded
  in 1.523s: {'status': 'sent', 'user_id': 42, 'event_id': 7}
```

**8. The worker processes the remaining two tasks.**

Each task runs independently. If one fails, the others are unaffected.

---

## Testing Tasks Locally

During development, you might want to run tasks synchronously (without a worker) to simplify debugging. Add this to your test settings:

```python
# backend/gather/settings_test.py

from .settings import *

# Run Celery tasks synchronously during tests
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
```

With `CELERY_TASK_ALWAYS_EAGER = True`, calling `task.delay()` executes the function immediately in the same process. This is useful for unit tests but should never be used in production.

You can also call task functions directly (without Celery) for quick testing:

```python
# In Django shell
from events.tasks import send_rsvp_confirmation_email

# Call directly (synchronous, no Celery involved)
result = send_rsvp_confirmation_email(user_id=42, event_id=7)
print(result)

# Call via Celery (asynchronous, requires worker)
async_result = send_rsvp_confirmation_email.delay(42, 7)
print(async_result.id)       # Task UUID
print(async_result.status)   # PENDING, STARTED, SUCCESS, or FAILURE
print(async_result.get(timeout=10))  # Wait for result (blocks)
```

The `.get()` method blocks until the task completes, which defeats the purpose of background processing. Only use it in tests or debugging, never in production view code.

---

## Key Takeaways

- Celery has three components: the client (Django), the broker (Redis), and the worker (a separate process that runs tasks).
- Define tasks with `@shared_task` in a `tasks.py` file inside each Django app.
- Always pass serializable arguments (IDs, strings, numbers) to tasks, not Django model objects.
- `delay()` is the simple way to queue a task. `apply_async()` gives you control over countdown, queue routing, time limits, and expiration.
- The Celery worker runs as a separate Docker Compose service using the same image as your Django backend but with a different command.
- `CELERY_TASK_ACKS_LATE = True` prevents task loss if a worker crashes mid-execution.
- Use `CELERY_TASK_ALWAYS_EAGER = True` in tests to run tasks synchronously without a worker.

In the next lesson, you will learn what happens when tasks fail and how to handle it gracefully.

---
title: "Retry Strategies and Idempotency"
estimatedMinutes: 40
---

# Retry Strategies and Idempotency

Your tasks will fail. The email provider will have an outage. The database will be temporarily unreachable. A network timeout will interrupt a webhook delivery. The question is not whether tasks fail, but what happens when they do.

A naive retry strategy (just run it again immediately) creates its own problems. A failed email task that retries instantly five times in a row hammers the email provider during an outage, making recovery harder. And if the task partially succeeded before failing (created a record but failed to send the email), retrying blindly might create duplicate records.

This lesson covers two interconnected topics: retry strategies (how to retry intelligently) and idempotency (how to make retries safe).

---

## What Happens When a Task Fails

By default, when a Celery task raises an exception, three things happen:

1. The worker logs the exception and traceback.
2. The task status is set to `FAILURE` in the result backend.
3. The task is gone. It does not retry, and it does not go anywhere. The message is acknowledged (removed from Redis), and the failure is only visible in your logs.

Here is what a failure looks like in the Celery worker output:

```
[ERROR] Task events.tasks.send_rsvp_confirmation_email[a1b2c3d4] raised
  unexpected: ConnectionError('Failed to connect to SMTP server')

Traceback (most recent call last):
  File "events/tasks.py", line 24, in send_rsvp_confirmation_email
    send_mail(...)
  ...
ConnectionError: Failed to connect to SMTP server
```

The user who RSVPed never gets their confirmation email, and nobody is notified. This is the default behavior, and it is not acceptable for production.

---

## Automatic Retries

Celery supports automatic retries with the `autoretry_for` parameter:

```python
# backend/events/tasks.py

from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
import smtplib


@shared_task(
    autoretry_for=(smtplib.SMTPException, ConnectionError, TimeoutError),
    max_retries=5,
    default_retry_delay=60,  # seconds
)
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

With this configuration:

- If the task raises `SMTPException`, `ConnectionError`, or `TimeoutError`, Celery automatically retries it.
- It waits 60 seconds between retries.
- It gives up after 5 retries.
- Other exceptions (like `User.DoesNotExist`) still fail immediately. You do not want to retry a task that is failing because of a logic error.

---

## Exponential Backoff

A fixed 60-second delay between retries is better than immediate retries, but it is not optimal. If the email provider is down, retrying every 60 seconds for 5 minutes creates unnecessary load. Exponential backoff increases the delay with each retry:

| Retry | Delay (exponential) | Delay (fixed 60s) |
|-------|--------------------|--------------------|
| 1st | 30s | 60s |
| 2nd | 60s | 60s |
| 3rd | 120s | 60s |
| 4th | 240s | 60s |
| 5th | 480s | 60s |

Celery has built-in support for exponential backoff with jitter (randomness to prevent thundering herd):

```python
@shared_task(
    autoretry_for=(smtplib.SMTPException, ConnectionError, TimeoutError),
    max_retries=5,
    retry_backoff=30,        # base delay in seconds
    retry_backoff_max=600,   # cap at 10 minutes
    retry_jitter=True,       # add randomness to prevent thundering herd
)
def send_rsvp_confirmation_email(user_id, event_id):
    # ... same as before ...
```

The `retry_backoff=30` means the first retry waits approximately 30 seconds, the second waits approximately 60, the third approximately 120, and so on. The `retry_jitter=True` adds random variation so that 1,000 failed tasks do not all retry at the exact same second.

The `retry_backoff_max=600` caps the delay at 10 minutes. Without a cap, the 5th retry would wait 480 seconds (8 minutes), which is reasonable, but the 10th would wait over 8 hours.

---

## Manual Retry Control

Sometimes you need more control than `autoretry_for` provides. Use `self.retry()` for custom retry logic:

```python
@shared_task(bind=True, max_retries=5)
def send_rsvp_confirmation_email(self, user_id, event_id):
    """Send RSVP confirmation email with custom retry logic."""
    from django.contrib.auth import get_user_model
    from events.models import Event

    User = get_user_model()

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        # Don't retry: the user was deleted, this task is invalid
        return {"status": "skipped", "reason": "user_not_found"}

    try:
        event = Event.objects.get(id=event_id)
    except Event.DoesNotExist:
        # Don't retry: the event was deleted
        return {"status": "skipped", "reason": "event_not_found"}

    try:
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
    except (smtplib.SMTPException, ConnectionError) as exc:
        # Retry with exponential backoff
        backoff = 30 * (2 ** self.request.retries)
        raise self.retry(exc=exc, countdown=min(backoff, 600))

    return {"status": "sent", "user_id": user_id, "event_id": event_id}
```

Key details:

- **`bind=True`**: Makes `self` available inside the task, giving you access to `self.request.retries` (current retry count) and `self.retry()`.
- **`self.request.retries`**: The number of times this task has been retried so far (0 on the first attempt).
- **`raise self.retry(exc=exc, countdown=...)`**: Re-raises the exception after scheduling a retry. The `countdown` parameter sets the delay in seconds.
- **Different handling per exception type**: `User.DoesNotExist` returns immediately (no retry). `SMTPException` triggers a retry. This distinction is important.

---

## Dead Letter Queues

After exhausting all retries, a task is marked as `FAILURE` and disappears. For critical tasks, you need a way to capture permanently failed tasks so you can investigate and replay them. This is a dead letter queue (DLQ).

Celery does not have a built-in DLQ, but you can implement one with a failure callback:

```python
# backend/events/tasks.py

import json
import logging
from datetime import datetime

from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task
def handle_dead_letter(task_name, task_args, task_kwargs, exception_info, task_id):
    """Store permanently failed tasks for investigation and replay."""
    from events.models import DeadLetterTask

    DeadLetterTask.objects.create(
        task_id=task_id,
        task_name=task_name,
        task_args=json.dumps(task_args),
        task_kwargs=json.dumps(task_kwargs),
        exception=str(exception_info),
        failed_at=datetime.now(),
    )

    logger.error(
        "Task permanently failed: %s[%s] args=%s",
        task_name,
        task_id,
        task_args,
    )
```

Create a Django model to store dead letters:

```python
# backend/events/models.py

class DeadLetterTask(models.Model):
    task_id = models.CharField(max_length=255, unique=True)
    task_name = models.CharField(max_length=255, db_index=True)
    task_args = models.JSONField(default=list)
    task_kwargs = models.JSONField(default=dict)
    exception = models.TextField()
    failed_at = models.DateTimeField()
    replayed_at = models.DateTimeField(null=True, blank=True)
    resolved = models.BooleanField(default=False)

    class Meta:
        ordering = ["-failed_at"]

    def __str__(self):
        return f"{self.task_name}[{self.task_id}] failed at {self.failed_at}"
```

Now wire it up with a base task class that all your tasks inherit from:

```python
# backend/events/tasks.py

from celery import Task


class GatherTask(Task):
    """Base task class that sends permanently failed tasks to the DLQ."""

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Called when a task fails permanently (all retries exhausted)."""
        if self.request.retries >= self.max_retries:
            handle_dead_letter.delay(
                task_name=self.name,
                task_args=args,
                task_kwargs=kwargs,
                exception_info=str(einfo),
                task_id=task_id,
            )
        super().on_failure(exc, task_id, args, kwargs, einfo)


@shared_task(
    base=GatherTask,
    autoretry_for=(smtplib.SMTPException, ConnectionError, TimeoutError),
    max_retries=5,
    retry_backoff=30,
    retry_backoff_max=600,
    retry_jitter=True,
)
def send_rsvp_confirmation_email(user_id, event_id):
    # ... same implementation ...
```

With this setup, any task that uses `base=GatherTask` will automatically record itself in the `DeadLetterTask` table after exhausting all retries. You can then build a simple admin view to inspect and replay failed tasks:

```python
# Replay a dead letter task
from celery import current_app

dead_letter = DeadLetterTask.objects.get(id=42)
task = current_app.tasks[dead_letter.task_name]
task.apply_async(
    args=json.loads(dead_letter.task_args),
    kwargs=json.loads(dead_letter.task_kwargs),
)
dead_letter.replayed_at = datetime.now()
dead_letter.save()
```

---

## The Idempotency Problem

Retries introduce a dangerous problem: what if a task partially succeeds and then fails?

Consider this scenario:

1. The `send_rsvp_confirmation_email` task starts executing.
2. It successfully sends the email via SMTP.
3. The worker crashes before it can acknowledge the task to Redis.
4. Because `CELERY_TASK_ACKS_LATE = True`, Redis still has the message.
5. Another worker picks up the message and executes the task again.
6. The user receives two confirmation emails.

For email, a duplicate is annoying but not catastrophic. For other operations, duplicates are dangerous:

- Processing a payment twice charges the customer double.
- Creating a database record twice violates unique constraints or creates duplicates.
- Sending a webhook twice might trigger duplicate actions in external systems.

A task is **idempotent** if running it multiple times produces the same result as running it once. Your goal is to make every task idempotent.

---

## Making Tasks Idempotent

There are several strategies for ensuring idempotency:

### Strategy 1: Idempotency Keys in the Database

Track which tasks have already been processed using a unique key:

```python
# backend/events/models.py

class ProcessedTask(models.Model):
    """Tracks which tasks have been processed to prevent duplicates."""
    idempotency_key = models.CharField(max_length=255, unique=True)
    task_name = models.CharField(max_length=255)
    processed_at = models.DateTimeField(auto_now_add=True)
    result = models.JSONField(null=True)

    class Meta:
        indexes = [
            models.Index(fields=["idempotency_key"]),
        ]
```

```python
# backend/events/tasks.py

from django.db import IntegrityError


@shared_task(
    autoretry_for=(smtplib.SMTPException, ConnectionError, TimeoutError),
    max_retries=5,
    retry_backoff=30,
    retry_jitter=True,
)
def send_rsvp_confirmation_email(user_id, event_id):
    """Send RSVP confirmation email (idempotent)."""
    from django.contrib.auth import get_user_model
    from events.models import Event, ProcessedTask

    # Generate a deterministic idempotency key
    idempotency_key = f"rsvp_email:{user_id}:{event_id}"

    # Check if already processed
    if ProcessedTask.objects.filter(idempotency_key=idempotency_key).exists():
        return {"status": "already_sent", "idempotency_key": idempotency_key}

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

    # Record that we processed this task
    try:
        ProcessedTask.objects.create(
            idempotency_key=idempotency_key,
            task_name="send_rsvp_confirmation_email",
            result={"status": "sent", "user_id": user_id, "event_id": event_id},
        )
    except IntegrityError:
        # Another worker already processed this (race condition)
        pass

    return {"status": "sent", "user_id": user_id, "event_id": event_id}
```

The idempotency key `rsvp_email:{user_id}:{event_id}` is deterministic. No matter how many times the task runs, the second execution finds the existing `ProcessedTask` record and skips the email.

### Strategy 2: Database-Level Uniqueness

For tasks that create database records, use unique constraints:

```python
@shared_task
def process_waitlist(event_id):
    """Promote the next person from the waitlist (idempotent)."""
    from events.models import Event, WaitlistPromotion

    event = Event.objects.get(id=event_id)

    next_in_line = (
        event.waitlist_entries
        .filter(status="waiting")
        .order_by("created_at")
        .select_for_update()  # Lock the row to prevent race conditions
        .first()
    )

    if not next_in_line:
        return {"status": "empty_waitlist"}

    # Use update with a filter to make the state change atomic
    # This only updates if the status is still "waiting"
    updated = (
        event.waitlist_entries
        .filter(id=next_in_line.id, status="waiting")
        .update(status="promoted")
    )

    if updated == 0:
        # Another worker already promoted this person
        return {"status": "already_promoted", "user_id": next_in_line.user_id}

    send_waitlist_promotion_email.delay(next_in_line.user_id, event_id)

    return {"status": "promoted", "user_id": next_in_line.user_id}
```

The key technique here is the conditional update: `.filter(id=next_in_line.id, status="waiting").update(status="promoted")`. This is an atomic operation. If two workers try to promote the same person simultaneously, only one of them will get `updated == 1`. The other gets `updated == 0` and skips the email. No duplicates.

### Strategy 3: Natural Idempotency

Some operations are naturally idempotent. Setting a value is idempotent; incrementing is not:

```python
# Idempotent: running this twice produces the same result
user.email_verified = True
user.save()

# NOT idempotent: running this twice doubles the count
event.rsvp_count += 1
event.save()

# Make it idempotent: compute from the source of truth
event.rsvp_count = event.rsvps.filter(status="confirmed").count()
event.save()
```

When designing tasks, prefer "set to computed value" over "increment by one." If the task runs twice, the computed value will be the same both times.

---

## Putting It All Together: Gather's Retry Configuration

Here is the recommended retry configuration for different types of tasks in Gather:

```python
# backend/events/tasks.py

import smtplib

from celery import shared_task

# Email tasks: retry on SMTP failures, idempotent via ProcessedTask
EMAIL_TASK_OPTIONS = {
    "autoretry_for": (smtplib.SMTPException, ConnectionError, TimeoutError),
    "max_retries": 5,
    "retry_backoff": 30,
    "retry_backoff_max": 600,
    "retry_jitter": True,
    "base": GatherTask,
}


@shared_task(**EMAIL_TASK_OPTIONS)
def send_rsvp_confirmation_email(user_id, event_id):
    # ... idempotent implementation ...


@shared_task(**EMAIL_TASK_OPTIONS)
def send_waitlist_promotion_email(user_id, event_id):
    # ... idempotent implementation ...


@shared_task(**EMAIL_TASK_OPTIONS)
def notify_organizer_of_rsvp(organizer_id, attendee_id, event_id):
    # ... idempotent implementation ...


# Data processing tasks: retry on DB errors, naturally idempotent
@shared_task(
    autoretry_for=(ConnectionError, TimeoutError),
    max_retries=3,
    retry_backoff=10,
    retry_jitter=True,
    base=GatherTask,
)
def process_waitlist(event_id):
    # ... idempotent via conditional update ...
```

---

## Key Takeaways

- Tasks fail in production. Without retry logic, failed tasks are silently lost.
- Use `autoretry_for` to automatically retry on specific exceptions. Never retry on logic errors (like `DoesNotExist`).
- Exponential backoff with jitter prevents thundering herd problems. Set `retry_backoff`, `retry_backoff_max`, and `retry_jitter=True`.
- After exhausting retries, route permanently failed tasks to a dead letter queue for investigation and replay.
- Retries require idempotency. A task that can run twice must produce the same result both times.
- Use idempotency keys, conditional database updates, or naturally idempotent operations to make your tasks safe.
- Prefer "set to computed value" over "increment by one" when updating data in background tasks.

In the next lesson, you will set up Flower to monitor your tasks in real time.

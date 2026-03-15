---
title: "Why Synchronous Is Not Enough"
estimatedMinutes: 35
---

# Why Synchronous Is Not Enough

You built the RSVP endpoint for Gather. A user clicks "I'm Going," your Django view creates the RSVP record, sends a confirmation email, updates the waitlist, and returns a response. It works. Ship it.

Then you check your metrics. The average RSVP request takes 2.8 seconds. Your users are staring at a spinner for nearly three seconds just to confirm their attendance at a meetup. Some of them click the button again, creating duplicate RSVPs. Others give up entirely.

The problem is not your code quality. The problem is that you are doing too much work inside a single HTTP request.

---

## The Synchronous Bottleneck

Here is what Gather's RSVP endpoint looks like right now:

```python
# gather/events/views.py

from django.core.mail import send_mail
from django.template.loader import render_to_string
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Event, RSVP


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_rsvp(request, event_id):
    event = Event.objects.select_related("organizer").get(id=event_id)

    # Step 1: Create the RSVP (fast, ~5ms)
    rsvp = RSVP.objects.create(
        event=event,
        user=request.user,
        status="confirmed",
    )

    # Step 2: Send confirmation email (slow, ~1500ms)
    html_content = render_to_string(
        "emails/rsvp_confirmation.html",
        {"event": event, "user": request.user},
    )
    send_mail(
        subject=f"You're going to {event.title}!",
        message="",
        html_message=html_content,
        from_email="noreply@gather.dev",
        recipient_list=[request.user.email],
    )

    # Step 3: Check and update waitlist (moderate, ~200ms)
    if event.has_waitlist:
        waitlist_entry = event.waitlist_entries.filter(
            status="waiting"
        ).order_by("created_at").first()
        if waitlist_entry:
            waitlist_entry.status = "promoted"
            waitlist_entry.save()
            # Send another email to the promoted person (~1500ms)
            send_mail(
                subject=f"You're off the waitlist for {event.title}!",
                message="",
                html_message=render_to_string(
                    "emails/waitlist_promoted.html",
                    {"event": event, "user": waitlist_entry.user},
                ),
                from_email="noreply@gather.dev",
                recipient_list=[waitlist_entry.user.email],
            )

    # Step 4: Notify the organizer (slow, ~800ms)
    send_mail(
        subject=f"New RSVP: {request.user.get_full_name()} is going to {event.title}",
        message="",
        html_message=render_to_string(
            "emails/organizer_new_rsvp.html",
            {"event": event, "attendee": request.user},
        ),
        from_email="noreply@gather.dev",
        recipient_list=[event.organizer.email],
    )

    return Response(
        {"id": rsvp.id, "status": rsvp.status},
        status=status.HTTP_201_CREATED,
    )
```

Let's trace the timing:

| Step | Operation | Duration |
|------|-----------|----------|
| 1 | Create RSVP record | ~5ms |
| 2 | Render template + send confirmation email | ~1,500ms |
| 3 | Query waitlist + send promotion email | ~1,700ms |
| 4 | Send organizer notification email | ~800ms |
| **Total** | | **~4,005ms** |

The user's browser is locked up for four seconds. The only operation the user actually needs to wait for is Step 1: creating the RSVP record. Everything else is a side effect that could happen after the response is sent.

---

## The User Experience Impact

Four seconds might not sound catastrophic, but the effects cascade:

**Perceived performance degrades trust.** Research from Google and Amazon has shown that every 100ms of added latency reduces conversion rates. A four-second RSVP flow makes Gather feel broken, even though it technically works.

**Users retry.** When a button press does not produce feedback within about one second, users click again. Your endpoint might create duplicate RSVPs, send duplicate emails, or throw integrity errors. You end up building defensive code to handle a problem that should not exist.

**Server resources are wasted.** While your Django process is blocked waiting for the email provider's SMTP server to respond, it cannot handle other requests. With synchronous workers (like Gunicorn's default sync worker), each blocked request holds an entire worker process hostage. If you have 4 workers and 4 users RSVP simultaneously, every subsequent request queues up.

**Failure cascades are dangerous.** If your email provider goes down, every RSVP request fails. Not because there is anything wrong with creating an RSVP record, but because you coupled a critical user action (confirming attendance) to a non-critical side effect (sending an email). The email provider's downtime becomes your downtime.

---

## The Request/Response Cycle

To understand the solution, you need a clear mental model of how web requests work.

In the synchronous model, everything happens in sequence within a single request:

```
User clicks "RSVP"
    │
    ▼
Browser sends POST /api/events/42/rsvp
    │
    ▼
Django receives request
    │
    ├── Create RSVP record (5ms)
    ├── Send confirmation email (1500ms)  ← blocked
    ├── Update waitlist + email (1700ms)  ← blocked
    ├── Send organizer email (800ms)      ← blocked
    │
    ▼
Django returns 201 Created (after ~4000ms)
    │
    ▼
Browser shows "You're going!"
```

The key insight: the user does not care about the email. They care about confirmation that their RSVP was recorded. Everything else can happen in the background.

The asynchronous model separates the critical path from the side effects:

```
User clicks "RSVP"
    │
    ▼
Browser sends POST /api/events/42/rsvp
    │
    ▼
Django receives request
    │
    ├── Create RSVP record (5ms)
    ├── Queue email task (2ms)
    ├── Queue waitlist task (2ms)
    ├── Queue organizer notification task (2ms)
    │
    ▼
Django returns 201 Created (after ~11ms)      ← 360x faster
    │
    ▼
Browser shows "You're going!"

Meanwhile, in the background:
    ├── Worker picks up email task → sends email
    ├── Worker picks up waitlist task → promotes + emails
    └── Worker picks up notification task → emails organizer
```

The response time drops from 4 seconds to 11 milliseconds. The user gets instant feedback. The emails still get sent, just not inside the request/response cycle.

---

## What Is Background Processing?

Background processing means executing work outside the HTTP request/response cycle. Instead of doing the work immediately, you place a message describing the work onto a queue. A separate process (called a worker) reads messages from the queue and executes them independently.

This pattern has three components:

1. **Producer**: The code that creates the message. In Gather's case, the RSVP view is the producer. It says "send a confirmation email to user 47 for event 42" and puts that message on the queue.

2. **Message broker**: The system that holds the queue. It receives messages from producers and delivers them to consumers. Redis, RabbitMQ, and Amazon SQS are common brokers. We will use Redis.

3. **Consumer (worker)**: The process that reads messages from the queue and executes the work. In our stack, this will be a Celery worker process.

The critical property of this architecture: the producer does not wait for the consumer to finish. It drops the message on the queue and moves on. This is sometimes called "fire and forget," though as you will learn in Lesson 4, responsible background processing is more like "fire and verify."

---

## Beyond Email: Where Background Jobs Shine

Email is the most common example, but background processing is essential for many categories of work:

### Image and File Processing

When a user uploads a profile photo, you need to resize it to multiple dimensions, convert it to WebP, and upload thumbnails to cloud storage. This can take 5 to 15 seconds. In Module 05, you will build exactly this pipeline for Gather event cover images.

```python
# This would block the upload request for 10+ seconds
def upload_avatar(request):
    image = request.FILES["avatar"]
    save_original(image)
    create_thumbnail(image, size=(150, 150))   # ~2s
    create_medium(image, size=(600, 600))       # ~3s
    convert_to_webp(image)                      # ~2s
    upload_to_s3(image)                         # ~3s
    return Response({"status": "uploaded"})

# With background processing: save original, return immediately
def upload_avatar(request):
    image = request.FILES["avatar"]
    path = save_original(image)
    process_avatar.delay(path)  # Queue the heavy work
    return Response({"status": "processing"})
```

### Report Generation

Generating a CSV export of all 10,000 attendees across 200 events involves heavy database queries, data transformation, and file creation. This is a classic background job. The user requests the report, gets a "we're generating your report" response, and receives a download link (via email or in-app notification) when it is ready.

### Webhook Delivery

If Gather integrates with Slack (posting event updates to a channel) or Zapier (triggering automations), you need to deliver webhooks to external URLs. External services might be slow, down, or rate-limited. Background jobs let you queue webhook deliveries, retry on failure, and avoid coupling your response time to a third party's uptime.

### Scheduled and Periodic Tasks

Some work is not triggered by a user action but needs to happen on a schedule. Examples from Gather:

- Send reminder emails 24 hours before an event starts
- Clean up expired draft events every night
- Generate weekly analytics reports for organizers
- Sync RSVP counts to a search index

These are perfect for a task scheduler like Celery Beat, which you will configure in the module project.

### Data Synchronization

When Gather needs to push data to an external analytics service, CRM, or search engine, you do not want to block the user's request while waiting for a third-party API. Queue it, let a worker handle it, and retry if the external service is temporarily unavailable.

---

## The Architecture You Will Build

By the end of this module, your Gather development environment will look like this:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Next.js   │────▶│   Django    │────▶│     Redis       │
│  Frontend   │     │   API       │     │  (message broker)│
└─────────────┘     └─────────────┘     └────────┬────────┘
                                                  │
                                         ┌────────▼────────┐
                                         │  Celery Worker  │
                                         │  (background    │
                                         │   task runner)  │
                                         └────────┬────────┘
                                                  │
                                         ┌────────▼────────┐
                                         │  Celery Beat    │
                                         │  (task          │
                                         │   scheduler)    │
                                         └────────┬────────┘
                                                  │
                                         ┌────────▼────────┐
                                         │    Flower       │
                                         │  (monitoring    │
                                         │   dashboard)    │
                                         └─────────────────┘
```

All of these services will run in Docker Compose alongside your existing PostgreSQL database. Here is a preview of the services you will add:

```yaml
# docker-compose.yml (preview, you'll build this incrementally)
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  celery-worker:
    build: ./backend
    command: celery -A gather worker -l INFO
    depends_on:
      - redis
      - db

  celery-beat:
    build: ./backend
    command: celery -A gather beat -l INFO
    depends_on:
      - redis

  flower:
    build: ./backend
    command: celery -A gather flower --port=5555
    ports:
      - "5555:5555"
    depends_on:
      - redis
```

---

## What You Will Learn in This Module

This module takes you from synchronous everything to a production-grade background job system:

- **Lesson 2**: Redis as a message broker. You will set up Redis, understand its data structures, and learn why it is the right choice for Gather.
- **Lesson 3**: Celery fundamentals. You will define tasks, configure Celery with Django, and trace a message from HTTP request to background execution.
- **Lesson 4**: Retry strategies and idempotency. You will handle failures gracefully with exponential backoff and ensure tasks are safe to run multiple times.
- **Lesson 5**: Monitoring with Flower. You will set up real-time visibility into your task queues and learn to diagnose problems before users notice them.
- **Project**: You will rebuild Gather's entire RSVP flow as an async pipeline with email tasks, retry logic, dead letter handling, and a Flower monitoring dashboard.

The skills from this module carry forward. In Module 04, you will reuse Redis for caching. In Module 05, you will use Celery for image processing. In Module 06, you will use Redis Pub/Sub for real-time features. Background processing is the foundation that makes all of these possible.

---

## Key Takeaways

- Synchronous request processing blocks the user while performing work they do not need to wait for.
- The fix is to separate the critical path (what the user needs) from side effects (what can happen later).
- Background processing uses a producer, a message broker, and workers to execute tasks outside the request/response cycle.
- This pattern applies to email, file processing, webhooks, scheduled jobs, report generation, and data synchronization.
- You will use Redis as the broker and Celery as the task framework, both running in Docker Compose alongside Django.

Next, you will set up Redis and learn how it works as a message broker.

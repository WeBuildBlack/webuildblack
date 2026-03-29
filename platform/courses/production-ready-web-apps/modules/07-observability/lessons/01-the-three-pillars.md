---
title: "The Three Pillars of Observability"
estimatedMinutes: 35
---

# The Three Pillars of Observability

It's 3am. Your phone buzzes. A PagerDuty alert says RSVP latency has spiked to 8 seconds. Users are complaining on social media. Your boss is awake and asking questions.

What do you do?

If your answer is "SSH into the server and start tailing logs," you are about to have a very long night. If your answer is "open the Grafana dashboard, check the latency graph, find the correlated trace, and read the structured logs for that request," you are about to have a much shorter one.

That is the difference between monitoring and observability. Monitoring tells you *that* something is wrong. Observability helps you understand *why* it is wrong, even when the failure mode is something you never anticipated.

---

## Monitoring vs. Observability

Monitoring is about known unknowns. You define thresholds ("alert me if CPU exceeds 90%"), and the system notifies you when those thresholds are crossed. Monitoring answers pre-defined questions.

Observability is about unknown unknowns. It gives you the data and tools to ask questions you did not think of in advance. When a new kind of failure happens (and it will), an observable system lets you investigate without deploying new code or adding new logging statements.

Think of it this way. Monitoring is a smoke detector. It tells you there is a fire. Observability is the ability to walk through the building, see where the smoke is coming from, trace the wiring, and figure out that the fire started because a Celery worker exhausted the Redis connection pool during a spike in RSVP traffic.

---

## The Three Pillars

Observability rests on three types of telemetry data, each with a distinct purpose:

1. **Logs**: Discrete events that happened at a specific point in time
2. **Metrics**: Numeric measurements aggregated over time
3. **Traces**: The path of a single request through your system

Each pillar answers different questions. You need all three because no single one tells the full story.

### Pillar 1: Logs

A log is a timestamped record of something that happened. Every `print()` statement you have ever written is a log (a bad one, but a log nonetheless).

```python
# This is logging (the bad kind)
print(f"User {user.id} RSVPed to event {event.id}")

# This is also logging (slightly better)
import logging
logger = logging.getLogger(__name__)
logger.info(f"User {user.id} RSVPed to event {event.id}")
```

Logs answer the question: **What happened?**

They are the most detailed telemetry type. A log entry can contain any information you want: the user ID, the event ID, the request duration, the SQL query that ran, the exception traceback. When something goes wrong, logs are where you go for specifics.

The problem with logs is scale. A busy application generates millions of log lines per day. Searching through them without structure or indexing is like searching for a needle in a haystack while the haystack is on fire.

### Pillar 2: Metrics

A metric is a numeric value measured over time. CPU usage, request count, response latency, queue depth. Metrics are cheap to collect, cheap to store, and cheap to query because they are pre-aggregated numbers rather than individual events.

```python
# Metric examples
rsvp_requests_total = 45_230       # Counter: always goes up
active_connections = 47            # Gauge: goes up and down
response_latency_seconds = 0.045   # Histogram: distribution of values
```

Metrics answer the question: **How is the system behaving right now?**

They are the backbone of dashboards and alerts. When you see a graph of p95 latency over time, that is metrics. When PagerDuty wakes you up because error rate exceeded 5%, that is a metric crossing a threshold.

The limitation of metrics is that they are aggregated. A metric tells you "the average response time is 200ms" but not "request abc123 took 8 seconds because the database query for event 4567 did a sequential scan." For that, you need traces or logs.

### Pillar 3: Traces

A trace follows a single request from start to finish as it moves through your system. In a modern web application, a single user action (clicking "RSVP") might touch:

1. The Next.js frontend (server-side rendering)
2. The Django API (processing the RSVP)
3. PostgreSQL (inserting the record)
4. Redis (invalidating the cache)
5. Celery (sending the confirmation email)

A trace connects all of these steps into a single timeline, showing exactly where time was spent.

```
Trace: RSVP Request (total: 1.3s)
├── Next.js SSR          12ms
├── Django API          1,288ms
│   ├── Auth middleware     2ms
│   ├── DB: Check capacity 3ms
│   ├── DB: Insert RSVP    5ms
│   ├── Cache invalidate   4ms
│   ├── Send email       800ms  <-- Here's your problem
│   └── Send notification 470ms
└── Response               4ms
```

Traces answer the question: **Where is the time going?**

They are the most powerful debugging tool for distributed systems because they show causality. You can see that the RSVP endpoint is slow *because* it is sending emails synchronously, not because the database is slow.

---

## How the Pillars Work Together

The real power comes from combining all three. Here is how you would investigate the 3am RSVP latency spike:

### Step 1: Metrics Tell You Something Is Wrong

Your Grafana dashboard shows p95 latency for `POST /api/events/{id}/rsvp/` jumped from 150ms to 8 seconds at 2:47am. Error rate is at 12%. You can see it on the graph, clear as day.

**Question answered**: What is broken? The RSVP endpoint. When did it start? 2:47am.

### Step 2: Traces Tell You Where the Time Goes

You click on a slow request in Jaeger (your trace viewer). The trace shows:

```
Total: 8.2s
├── Django middleware    3ms
├── DB: Check capacity  2ms
├── DB: Insert RSVP     2ms
├── Cache invalidate    1ms
└── Celery: Send email  8,192ms  <-- 8 seconds!
```

The Celery task for sending email is taking 8 seconds. Every other operation is fast.

**Question answered**: Where is the time being spent? In the email-sending Celery task.

### Step 3: Logs Tell You Why

You search logs for the trace ID from that slow request and find:

```json
{
  "timestamp": "2026-03-14T02:47:12Z",
  "level": "ERROR",
  "trace_id": "abc123def456",
  "service": "celery-worker",
  "message": "SMTP connection timeout after 8000ms",
  "smtp_host": "smtp.sendgrid.net",
  "retry_count": 3,
  "error": "ConnectionTimeoutError: Connection to smtp.sendgrid.net:587 timed out"
}
```

The email provider is down (or unreachable). Every RSVP request is blocking for 8 seconds waiting for the SMTP connection to time out.

**Question answered**: Why is it slow? The email provider is timing out.

### The Fix

Now you know the root cause in under 5 minutes. The immediate fix is to make email sending truly async (fire-and-forget to the Celery queue, don't wait for the result). The longer-term fix is to add a circuit breaker so that when the email provider is down, you stop trying after a few failures and queue the emails for later.

Without all three pillars, you would be guessing. Metrics alone would tell you it is slow but not why. Logs alone would show the SMTP errors but you would not know which endpoint is affected. Traces alone would show the slow span but not the error details.

---

## Structured Logging vs. Printf Debugging

Let's talk about the first pillar in more detail, because most developers get it wrong.

### The Problem with Unstructured Logs

Most applications start with logging like this:

```python
logger.info(f"User {user.id} RSVPed to event {event.id} - status: {status}")
logger.error(f"Failed to send email to {user.email}: {str(e)}")
logger.warning(f"Event {event.id} is at capacity ({event.capacity})")
```

These logs are human-readable, which feels good. But try answering these questions from a million of them:

- How many RSVP errors happened in the last hour?
- Which events had the most failures?
- What was the average response time for user 42's requests?

You cannot answer any of these without parsing free-text strings with regex. That is fragile, slow, and error-prone.

### Structured Logging

Structured logging means emitting logs as key-value pairs (usually JSON) instead of free-text strings:

```python
# Unstructured (bad for machines)
logger.info(f"User {user.id} RSVPed to event {event.id}")

# Structured (good for machines AND humans)
logger.info(
    "rsvp_created",
    extra={
        "user_id": user.id,
        "event_id": event.id,
        "status": status,
        "response_time_ms": response_time,
        "trace_id": get_current_trace_id(),
    }
)
```

The structured version produces JSON:

```json
{
  "timestamp": "2026-03-14T15:30:00Z",
  "level": "INFO",
  "message": "rsvp_created",
  "user_id": 42,
  "event_id": 1234,
  "status": "confirmed",
  "response_time_ms": 145,
  "trace_id": "abc123def456"
}
```

Now you can query your logs like a database:

- `message == "rsvp_created" AND level == "ERROR"` for RSVP failures
- `event_id == 1234 AND level == "ERROR"` for failures on a specific event
- `trace_id == "abc123def456"` to find every log from a single request

### Setting Up Structured Logging in Django

Here is a practical configuration using `python-json-logger`:

```bash
pip install python-json-logger
```

```python
# settings.py

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "format": "%(asctime)s %(name)s %(levelname)s %(message)s",
            "rename_fields": {
                "asctime": "timestamp",
                "levelname": "level",
            },
        },
        "console": {
            "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "console",
        },
        "json_file": {
            "class": "logging.FileHandler",
            "filename": "logs/gather.json",
            "formatter": "json",
        },
    },
    "root": {
        "handlers": ["console", "json_file"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console", "json_file"],
            "level": "WARNING",
            "propagate": False,
        },
        "gather": {
            "handlers": ["console", "json_file"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
```

With this configuration, logs go to two places: pretty-printed to the console for local development and JSON-formatted to a file for production. Log aggregation tools (which you will set up in Lesson 4) consume the JSON format.

---

## Log Levels and When to Use Each

Python's logging module defines five standard levels. Using them correctly is important because it determines what shows up in production versus development.

| Level | When to Use | Example |
|-------|-------------|---------|
| **DEBUG** | Detailed diagnostic info. Only on in development. | `DB query took 3ms, returned 42 rows` |
| **INFO** | Normal operations worth recording. | `User 42 RSVPed to event 1234` |
| **WARNING** | Something unexpected but not an error. | `Event 1234 is at 95% capacity` |
| **ERROR** | Something failed, but the app continues. | `Failed to send confirmation email` |
| **CRITICAL** | The app cannot continue. | `Database connection pool exhausted` |

A common mistake is logging everything at INFO level. If every database query, cache lookup, and template render gets an INFO log, you will generate so much noise that the important signals get buried. Be disciplined:

- **DEBUG**: Anything useful for development. Turn off in production.
- **INFO**: Business events (user actions, job completions, deployments).
- **WARNING**: Things that might become problems (approaching limits, deprecated usage).
- **ERROR**: Things that are problems right now (failed operations, unhandled exceptions).
- **CRITICAL**: The building is on fire (database down, out of memory, data corruption).

---

## Putting It All Together: A Mental Model

Think of observability like a hospital's patient monitoring system:

- **Metrics** are the vital signs monitor. Heart rate, blood pressure, oxygen saturation. Continuous numbers that tell you the overall health at a glance. When a number crosses a threshold, an alarm sounds.

- **Logs** are the medical chart. Detailed notes about what happened, when, and what was done. "Patient complained of chest pain at 14:30. Administered aspirin. Ordered ECG."

- **Traces** are like following a patient through the hospital. They arrived at reception (10 minutes), moved to triage (5 minutes), waited for a room (45 minutes), saw a doctor (15 minutes), went to radiology (30 minutes). The trace shows the entire journey and makes it obvious where the bottleneck is (waiting for a room).

No single piece tells the whole story. Together, they give you complete visibility into your system's health.

---

## What We'll Build in This Module

Over the next four lessons and the module project, you will add full observability to Gather:

1. **Distributed tracing** with OpenTelemetry, capturing every request as it flows through Django, PostgreSQL, Redis, and Celery
2. **Metrics collection** with Prometheus, tracking latency histograms, error rates, cache hit ratios, and queue depths
3. **Log aggregation** with Loki, centralizing structured logs and making them searchable by trace ID
4. **Dashboards** in Grafana, visualizing all three data types in one place
5. **Incident response** processes, including runbooks and blameless postmortems

By the end of this module, when your phone buzzes at 3am, you will know exactly where to look, what questions to ask, and how to fix the problem in minutes instead of hours.

---

## Key Takeaways

1. **Observability is not monitoring**. Monitoring answers pre-defined questions. Observability lets you ask new questions about failures you never anticipated.

2. **You need all three pillars**. Metrics tell you something is wrong. Traces tell you where the problem is. Logs tell you why it happened.

3. **Structured logging is non-negotiable**. JSON logs with consistent fields are queryable. Free-text logs with string interpolation are not.

4. **The pillars connect through correlation**. A trace ID links a metric anomaly to a specific trace to the exact log entries for that request. This chain is what makes debugging fast.

5. **Invest in observability before you need it**. The worst time to add logging and tracing is during a production incident at 3am. The best time is right now.

In the next lesson, you will set up distributed tracing with OpenTelemetry and see exactly how requests flow through the Gather stack.

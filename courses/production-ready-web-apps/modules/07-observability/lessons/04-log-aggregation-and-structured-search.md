---
title: "Log Aggregation and Structured Search"
estimatedMinutes: 35
---

# Log Aggregation and Structured Search

You have traces showing how requests flow through your system. You have metrics showing the system's vital signs. But when you need to know exactly *what* happened during a specific request (the error message, the SQL statement that failed, the user input that triggered a bug), you need logs.

The problem is that in a distributed system, logs are scattered across multiple containers. Django logs are in one place, Celery worker logs in another, Nginx logs somewhere else. Searching across all of them manually is painful. What you need is centralized log aggregation: all logs flowing into one place, structured, searchable, and linked to your traces.

In this lesson, you will set up structured logging with `structlog`, centralize logs with Grafana Loki, and connect everything through correlation IDs.

---

## Why structlog Over python-json-logger

In Lesson 1, you saw `python-json-logger` as a structured logging option. It works, but `structlog` is more powerful for production use. The key differences:

- **Bound loggers**: You can bind context (like `user_id` or `request_id`) once and have it automatically included in every subsequent log call
- **Processor pipeline**: You can chain processors that enrich, filter, or transform log events
- **Development-friendly output**: Pretty, colored console output in development, JSON in production, same code

```bash
pip install structlog
```

### Configuring structlog for Django

```python
# settings.py

import structlog
import logging

# Configure structlog
structlog.configure(
    processors=[
        # Add log level as a string
        structlog.stdlib.add_log_level,
        # Add the logger name
        structlog.stdlib.add_logger_name,
        # Add timestamp in ISO format
        structlog.processors.TimeStamper(fmt="iso"),
        # If in development, render pretty colored output
        # If in production, render JSON
        structlog.dev.ConsoleRenderer()
        if os.getenv("ENVIRONMENT") == "development"
        else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

# Also configure Python's standard logging to output JSON in production
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "format": "%(asctime)s %(name)s %(levelname)s %(message)s",
        },
        "console": {
            "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "console"
            if os.getenv("ENVIRONMENT") == "development"
            else "json",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {"level": "WARNING", "propagate": True},
        "celery": {"level": "INFO", "propagate": True},
        "gather": {"level": "DEBUG" if DEBUG else "INFO", "propagate": True},
    },
}
```

### Using structlog in Views

```python
# events/views.py

import structlog

logger = structlog.get_logger()


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_rsvp(request, event_id):
    # Bind context that will appear in every log from this function
    log = logger.bind(
        user_id=request.user.id,
        event_id=event_id,
        endpoint="create_rsvp",
    )

    log.info("rsvp_request_received")

    event = Event.objects.get(id=event_id)
    confirmed_count = RSVP.objects.filter(event=event, status="confirmed").count()

    if confirmed_count >= event.capacity:
        rsvp_status = "waitlisted"
        log.info("event_at_capacity", capacity=event.capacity, confirmed=confirmed_count)
    else:
        rsvp_status = "confirmed"

    rsvp, created = RSVP.objects.get_or_create(
        event=event,
        user=request.user,
        defaults={"status": rsvp_status},
    )

    if not created:
        log.warning("duplicate_rsvp", rsvp_id=rsvp.id)
        return Response({"detail": "Already RSVPed"}, status=409)

    log.info(
        "rsvp_created",
        rsvp_id=rsvp.id,
        status=rsvp_status,
    )

    return Response({"status": rsvp_status}, status=201)
```

In development, this produces readable output:

```
2026-03-14T15:30:00Z [info     ] rsvp_request_received  endpoint=create_rsvp event_id=42 user_id=7
2026-03-14T15:30:00Z [info     ] rsvp_created           endpoint=create_rsvp event_id=42 rsvp_id=1234 status=confirmed user_id=7
```

In production, it produces JSON:

```json
{"timestamp": "2026-03-14T15:30:00Z", "level": "info", "event": "rsvp_request_received", "endpoint": "create_rsvp", "event_id": 42, "user_id": 7}
{"timestamp": "2026-03-14T15:30:00Z", "level": "info", "event": "rsvp_created", "endpoint": "create_rsvp", "event_id": 42, "user_id": 7, "rsvp_id": 1234, "status": "confirmed"}
```

---

## Correlation IDs: Connecting Logs to Traces

The most powerful feature of an observable system is the ability to jump from a metric anomaly to a trace to the exact log entries for that request. The bridge is the **correlation ID**, specifically the trace ID from OpenTelemetry.

### Adding trace_id to Every Log

Create a structlog processor that extracts the current trace ID and adds it to every log entry:

```python
# gather/logging_processors.py

from opentelemetry import trace


def add_trace_context(logger, method_name, event_dict):
    """
    Add OpenTelemetry trace_id and span_id to every log entry.
    This lets you search logs by trace ID to find all logs
    for a single request.
    """
    span = trace.get_current_span()
    if span and span.is_recording():
        ctx = span.get_span_context()
        # Format as hex strings (same format Jaeger uses)
        event_dict["trace_id"] = format(ctx.trace_id, "032x")
        event_dict["span_id"] = format(ctx.span_id, "016x")
    return event_dict
```

Add this processor to the structlog pipeline:

```python
# settings.py (updated structlog configuration)

from gather.logging_processors import add_trace_context

structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        add_trace_context,  # <-- Inject trace_id into every log
        structlog.dev.ConsoleRenderer()
        if os.getenv("ENVIRONMENT") == "development"
        else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)
```

Now every log entry includes the trace ID:

```json
{
  "timestamp": "2026-03-14T15:30:00Z",
  "level": "info",
  "event": "rsvp_created",
  "trace_id": "7f3a2b1c4d5e6f7a8b9c0d1e2f3a4b5c",
  "span_id": "1234567890abcdef",
  "user_id": 7,
  "event_id": 42,
  "rsvp_id": 1234,
  "status": "confirmed"
}
```

When you find a slow trace in Jaeger, copy its trace ID and search your logs. Every log entry from that request (across Django, Celery, and any other service) will appear.

---

## Log Levels in Practice

In Lesson 1, you learned the five standard log levels. Here is how to apply them consistently across Gather:

### DEBUG: Development Only

```python
log.debug("cache_lookup", key=cache_key, ttl=300)
log.debug("sql_query_executed", query=str(queryset.query), rows=len(results))
log.debug("serializer_validated", fields=list(serializer.validated_data.keys()))
```

Never enable DEBUG in production. The volume will overwhelm your log storage and obscure important signals.

### INFO: Business Events

```python
log.info("rsvp_created", rsvp_id=rsvp.id, status="confirmed")
log.info("event_created", event_id=event.id, organizer_id=user.id)
log.info("user_registered", user_id=user.id, method="email")
log.info("email_sent", recipient=user.email, template="rsvp_confirmation")
log.info("celery_task_completed", task="send_rsvp_confirmation", duration_ms=145)
```

INFO logs record things that happened successfully. They are the audit trail of your application.

### WARNING: Approaching Limits

```python
log.warning("event_near_capacity", event_id=event.id, capacity=100, confirmed=95)
log.warning("rate_limit_approaching", user_id=user.id, requests=90, limit=100)
log.warning("slow_query_detected", query="SELECT ...", duration_ms=500)
log.warning("celery_queue_growing", queue="default", depth=500)
```

WARNING logs indicate conditions that might become problems. They should not trigger pages but should be reviewed regularly.

### ERROR: Something Failed

```python
log.error("rsvp_creation_failed", event_id=event_id, error=str(e))
log.error("email_delivery_failed", recipient=user.email, smtp_error=str(e))
log.error("cache_connection_lost", redis_host=redis_host)
log.error("celery_task_failed", task="send_rsvp_confirmation", error=str(e), retry_count=2)
```

ERROR logs mean something broke for a specific request or operation. The system is still running, but this request failed.

### CRITICAL: System-Level Failure

```python
log.critical("database_connection_pool_exhausted", active=100, max=100)
log.critical("redis_unavailable", host=redis_host, consecutive_failures=10)
log.critical("disk_space_critical", mount="/var/log", used_percent=98)
```

CRITICAL logs mean the system itself is in danger. These should always trigger immediate alerts.

---

## Centralized Log Aggregation with Loki

Grafana Loki is a log aggregation system designed to work with Grafana. Unlike Elasticsearch (which indexes the full text of every log), Loki only indexes labels (like `service`, `level`, and `trace_id`). This makes it much cheaper to run while still supporting fast queries when you know what you are looking for.

### Adding Loki to Docker Compose

```yaml
# docker-compose.yml (add to existing services)

services:
  # ... existing services ...

  loki:
    image: grafana/loki:2.9.4
    ports:
      - "3100:3100"
    volumes:
      - ./monitoring/loki-config.yml:/etc/loki/local-config.yaml
      - loki_data:/loki
    command: -config.file=/etc/loki/local-config.yaml

  promtail:
    image: grafana/promtail:2.9.4
    volumes:
      - ./monitoring/promtail-config.yml:/etc/promtail/config.yml
      - /var/log:/var/log
      - gather_logs:/app/logs  # Mount the log directory from Django
    command: -config.file=/etc/promtail/config.yml
    depends_on:
      - loki

volumes:
  loki_data:
  gather_logs:
```

### Loki Configuration

```yaml
# monitoring/loki-config.yml

auth_enabled: false

server:
  http_listen_port: 3100

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h  # 7 days
  retention_period: 720h            # 30 days
```

### Promtail Configuration

Promtail is the agent that ships logs to Loki. It tails log files and sends them:

```yaml
# monitoring/promtail-config.yml

server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # Scrape Django JSON logs
  - job_name: gather-api
    static_configs:
      - targets:
          - localhost
        labels:
          job: gather-api
          service: django
          __path__: /app/logs/gather.json

    pipeline_stages:
      # Parse JSON log lines
      - json:
          expressions:
            level: level
            trace_id: trace_id
            event: event
            timestamp: timestamp

      # Use the log's own timestamp
      - timestamp:
          source: timestamp
          format: "2006-01-02T15:04:05Z"

      # Promote fields to Loki labels for fast querying
      - labels:
          level:
          trace_id:
          event:

  # Scrape Celery worker logs
  - job_name: gather-worker
    static_configs:
      - targets:
          - localhost
        labels:
          job: gather-worker
          service: celery
          __path__: /app/logs/celery.json

    pipeline_stages:
      - json:
          expressions:
            level: level
            trace_id: trace_id
            event: event
      - labels:
          level:
          trace_id:
```

### Adding Loki as a Grafana Data Source

```yaml
# monitoring/grafana/provisioning/datasources/loki.yml

apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: false
    jsonData:
      derivedFields:
        # Make trace_id clickable, linking to Jaeger
        - datasourceUid: jaeger
          matcherRegex: '"trace_id":"(\w+)"'
          name: TraceID
          url: "$${__value.raw}"
```

The `derivedFields` configuration is important. It tells Grafana to parse `trace_id` from log lines and create a clickable link to Jaeger. When you find an interesting log entry, one click takes you to the full trace. This is the correlation loop in action: metrics lead to traces, traces lead to logs, logs link back to traces.

---

## Querying Logs in Grafana

Once Loki is connected, you can query logs in Grafana's Explore view using LogQL.

### Basic Queries

```logql
# All logs from the Django API
{service="django"}

# Only error-level logs
{service="django", level="error"}

# Logs from a specific trace
{trace_id="7f3a2b1c4d5e6f7a8b9c0d1e2f3a4b5c"}

# RSVP-related events
{service="django", event=~"rsvp.*"}
```

### Text Search

```logql
# Logs containing a specific error message
{service="django"} |= "ConnectionTimeoutError"

# Logs mentioning a specific event ID
{service="django"} | json | event_id=42

# Logs with response time over 1 second
{service="django"} | json | response_time_ms > 1000
```

### Aggregation

```logql
# Error count per minute
count_over_time({service="django", level="error"}[1m])

# Rate of RSVP creations
count_over_time({service="django", event="rsvp_created"}[5m])
```

---

## Log Retention Policies

Logs consume storage. Without retention policies, your log volume grows indefinitely. Here are practical guidelines:

| Log Level | Retention | Rationale |
|---|---|---|
| DEBUG | Not stored in production | Too voluminous, only useful during development |
| INFO | 30 days | Covers most investigation windows |
| WARNING | 90 days | Useful for trend analysis |
| ERROR | 180 days | Needed for recurring bug investigation |
| CRITICAL | 1 year | May be needed for compliance or postmortems |

In Loki, set retention at the configuration level (as shown above) or use label-based retention rules for different levels:

```yaml
# monitoring/loki-config.yml (add to limits_config)

limits_config:
  retention_period: 720h  # 30 days default

  retention_stream:
    - selector: '{level="error"}'
      priority: 1
      period: 4320h   # 180 days for errors
    - selector: '{level="critical"}'
      priority: 2
      period: 8760h   # 365 days for critical
```

---

## The Correlation Loop in Practice

Here is the complete workflow for investigating a production issue using all three pillars:

1. **Grafana dashboard** shows p95 latency spiked (metric)
2. You click on the time range to drill into the **Prometheus** data and see that `POST /api/events/{id}/rsvp/` is the slow endpoint
3. You switch to **Loki** in Grafana and search for `{service="django", event="rsvp_created"} | json | response_time_ms > 2000` to find slow RSVP logs
4. Each log entry has a `trace_id`. You click it, and Grafana opens the trace in **Jaeger**
5. The trace shows that `celery.apply_async send_rsvp_confirmation` took 6 seconds
6. You search Loki for `{service="celery", trace_id="abc123"}` and find `SMTP connection timeout`
7. Root cause identified. Total investigation time: 3 minutes.

This loop only works when all three pillars are in place and connected through correlation IDs. That is why structured logging with trace context injection is non-negotiable in a production system.

---

## Key Takeaways

1. **Use structlog for Python logging**. Bound loggers, processor pipelines, and automatic JSON output make it the best choice for production Django applications.

2. **Inject trace_id into every log entry**. This is the bridge between logs and traces. Without it, correlation requires manual timestamp matching, which is slow and unreliable.

3. **Loki is a cost-effective log aggregation solution**. It indexes labels (not full text), making it cheaper than Elasticsearch while still supporting the queries you need.

4. **Promtail ships logs to Loki**. Configure it to parse your JSON logs and promote key fields (level, trace_id, event) to Loki labels for fast querying.

5. **LogQL queries follow a simple pattern**: select by labels, then filter by content. `{service="django", level="error"} |= "timeout"` covers most use cases.

6. **Set retention policies early**. Storage grows fast. Define how long to keep each log level before your disk fills up.

7. **The correlation loop is the goal**. Metrics (something is wrong) to traces (where it is slow) to logs (why it is slow). All connected by trace_id.

In the next lesson, you will learn what to do once you have found the problem: incident response, runbooks, and blameless postmortems.

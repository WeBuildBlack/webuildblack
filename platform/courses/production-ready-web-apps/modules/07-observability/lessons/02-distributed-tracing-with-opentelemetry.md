---
title: "Distributed Tracing with OpenTelemetry"
estimatedMinutes: 45
---

# Distributed Tracing with OpenTelemetry

When a user clicks "RSVP" in Gather, the request touches at least four systems: the Django API, PostgreSQL, Redis, and a Celery worker. If that request is slow, which system is the bottleneck? Without tracing, you are guessing. With tracing, you can see a timeline of exactly where every millisecond went.

In this lesson, you will instrument Gather with OpenTelemetry, the vendor-neutral standard for distributed tracing. By the end, you will have traces flowing from Django through the database, cache, and task queue into Jaeger, a trace visualization tool.

---

## What Is a Trace?

A **trace** represents the entire lifecycle of a single request through your system. It is made up of **spans**, where each span represents one unit of work.

Here is a simplified example of an RSVP request trace:

```
Trace ID: 7f3a2b1c4d5e6f7a8b9c0d1e2f3a4b5c

[Span 1] POST /api/events/42/rsvp/  (total: 245ms)
  ├── [Span 2] AuthMiddleware.process_request  (2ms)
  ├── [Span 3] SELECT * FROM events_event WHERE id=42  (3ms)
  ├── [Span 4] SELECT * FROM events_rsvp WHERE event_id=42 AND user_id=7  (1ms)
  ├── [Span 5] INSERT INTO events_rsvp ...  (4ms)
  ├── [Span 6] Redis DEL cache:event:42  (1ms)
  └── [Span 7] Celery: send_rsvp_confirmation  (enqueue: 2ms)
```

### Key Concepts

**Trace ID**: A unique identifier shared by all spans in the same trace. This is the string that connects everything together. When you search for a trace ID in Jaeger, you see every span that belongs to that request.

**Span**: A named, timed operation. Each span has:
- A **name** (what happened, like `POST /api/events/42/rsvp/`)
- A **start time** and **duration**
- A **parent span** (creating the tree structure)
- **Attributes** (key-value pairs with additional context)
- A **status** (OK or ERROR)

**Parent-child relationships**: Spans form a tree. The root span is the incoming HTTP request. Child spans are the operations it triggers (database queries, cache lookups, task enqueues). This tree structure is what makes traces so powerful for understanding where time is spent.

**Trace context propagation**: When Django calls PostgreSQL, or when it enqueues a Celery task, the trace ID must be passed along so that the child operation's span is linked to the parent. This is called context propagation, and OpenTelemetry handles it automatically for supported libraries.

---

## Why OpenTelemetry?

Before OpenTelemetry (OTel), every observability vendor had its own instrumentation library. If you used Datadog, you installed `ddtrace`. If you used New Relic, you installed `newrelic`. Switching vendors meant rewriting all your instrumentation.

OpenTelemetry is a CNCF (Cloud Native Computing Foundation) project that provides a single, vendor-neutral API for generating telemetry data. You instrument your code once with OTel, then send the data to any compatible backend: Jaeger, Zipkin, Datadog, Honeycomb, Grafana Tempo, or dozens of others.

The OpenTelemetry ecosystem has three parts:

1. **API**: The interfaces you code against (creating spans, recording attributes)
2. **SDK**: The implementation that processes and exports telemetry data
3. **Instrumentation libraries**: Auto-instrumentation for popular frameworks (Django, psycopg2, redis, celery)

---

## Installing OpenTelemetry for Django

Start by installing the core packages and the auto-instrumentation libraries for every component in the Gather stack:

```bash
pip install \
  opentelemetry-api \
  opentelemetry-sdk \
  opentelemetry-exporter-otlp \
  opentelemetry-instrumentation-django \
  opentelemetry-instrumentation-psycopg2 \
  opentelemetry-instrumentation-redis \
  opentelemetry-instrumentation-celery \
  opentelemetry-instrumentation-requests \
  opentelemetry-instrumentation-logging
```

Each `opentelemetry-instrumentation-*` package knows how to hook into a specific library and automatically create spans for its operations. You do not need to modify your Django views, database queries, or Celery tasks. The instrumentation wraps them transparently.

---

## Configuring the OTel SDK

Create a dedicated module for OpenTelemetry setup. This runs once at application startup:

```python
# gather/telemetry.py

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.django import DjangoInstrumentor
from opentelemetry.instrumentation.psycopg2 import Psycopg2Instrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.celery import CeleryInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor

import os


def configure_opentelemetry():
    """
    Set up OpenTelemetry tracing for the Gather application.
    Call this once at startup (in manage.py or wsgi.py).
    """
    # Resource identifies this service in traces
    resource = Resource.create({
        "service.name": os.getenv("OTEL_SERVICE_NAME", "gather-api"),
        "service.version": os.getenv("APP_VERSION", "1.0.0"),
        "deployment.environment": os.getenv("ENVIRONMENT", "development"),
    })

    # Create and configure the tracer provider
    provider = TracerProvider(resource=resource)

    # Export spans to Jaeger (or any OTLP-compatible backend)
    otlp_exporter = OTLPSpanExporter(
        endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317"),
        insecure=True,  # Use TLS in production
    )

    # BatchSpanProcessor buffers spans and sends them in batches
    # This avoids adding latency to every request
    provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

    # Set this provider as the global default
    trace.set_tracer_provider(provider)

    # Auto-instrument all the libraries Gather uses
    DjangoInstrumentor().instrument()
    Psycopg2Instrumentor().instrument()
    RedisInstrumentor().instrument()
    CeleryInstrumentor().instrument()
    RequestsInstrumentor().instrument()

    # Inject trace_id and span_id into log records
    LoggingInstrumentor().instrument(set_logging_format=True)
```

### What Each Instrumentor Does

| Instrumentor | What It Traces |
|---|---|
| `DjangoInstrumentor` | Every HTTP request (method, path, status code, duration) |
| `Psycopg2Instrumentor` | Every SQL query (statement text, database name, duration) |
| `RedisInstrumentor` | Every Redis command (GET, SET, DEL, duration) |
| `CeleryInstrumentor` | Task enqueue, task execution, task result |
| `RequestsInstrumentor` | Outgoing HTTP calls (to external APIs) |
| `LoggingInstrumentor` | Adds trace_id and span_id to Python log records |

### Calling configure_opentelemetry at Startup

Hook into Django's WSGI entry point so tracing starts before any request is handled:

```python
# gather/wsgi.py

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gather.settings')

# Initialize OpenTelemetry before the WSGI app loads
from gather.telemetry import configure_opentelemetry
configure_opentelemetry()

application = get_wsgi_application()
```

For Celery workers, do the same in the Celery app configuration:

```python
# gather/celery.py

import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gather.settings')

# Initialize OpenTelemetry for the worker process
from gather.telemetry import configure_opentelemetry
configure_opentelemetry()

app = Celery('gather')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
```

---

## Auto-Instrumentation in Action

With the configuration above, you do not need to change any application code. Here is what happens automatically when a user RSVPs to an event:

1. **DjangoInstrumentor** creates a root span: `POST /api/events/42/rsvp/`
2. Inside that span, **Psycopg2Instrumentor** creates child spans for each SQL query:
   - `SELECT FROM events_event WHERE id = 42`
   - `SELECT FROM events_rsvp WHERE event_id = 42 AND user_id = 7`
   - `INSERT INTO events_rsvp (event_id, user_id, status) VALUES (42, 7, 'confirmed')`
3. **RedisInstrumentor** creates a span for the cache invalidation: `DEL cache:event:42`
4. **CeleryInstrumentor** creates a span for the task enqueue: `celery.apply_async send_rsvp_confirmation`
5. On the Celery worker, **CeleryInstrumentor** creates a new span for task execution, linked to the original trace via propagated context

All of this happens without a single line of tracing code in your views or tasks. That is the power of auto-instrumentation.

---

## Adding Manual Spans for Business Logic

Auto-instrumentation covers infrastructure operations (HTTP, SQL, Redis, Celery). But sometimes you need visibility into your own business logic. For that, you create manual spans.

```python
# events/views.py

from opentelemetry import trace
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from events.models import Event, RSVP

# Get a tracer for this module
tracer = trace.get_tracer(__name__)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_rsvp(request, event_id):
    # The root span (POST /api/events/{id}/rsvp/) is created
    # automatically by DjangoInstrumentor

    with tracer.start_as_current_span("check_event_capacity") as span:
        event = Event.objects.get(id=event_id)
        confirmed_count = RSVP.objects.filter(
            event=event, status="confirmed"
        ).count()

        span.set_attribute("event.id", event.id)
        span.set_attribute("event.capacity", event.capacity)
        span.set_attribute("event.confirmed_count", confirmed_count)

        if confirmed_count >= event.capacity:
            span.set_attribute("rsvp.result", "waitlisted")
            rsvp_status = "waitlisted"
        else:
            span.set_attribute("rsvp.result", "confirmed")
            rsvp_status = "confirmed"

    with tracer.start_as_current_span("create_rsvp_record") as span:
        rsvp, created = RSVP.objects.get_or_create(
            event=event,
            user=request.user,
            defaults={"status": rsvp_status},
        )
        span.set_attribute("rsvp.id", rsvp.id)
        span.set_attribute("rsvp.created", created)
        span.set_attribute("rsvp.status", rsvp.status)

        if not created:
            span.set_attribute("rsvp.already_exists", True)
            return Response(
                {"detail": "Already RSVPed"}, status=status.HTTP_409_CONFLICT
            )

    with tracer.start_as_current_span("invalidate_event_cache") as span:
        from django.core.cache import cache
        cache_key = f"event:{event_id}"
        cache.delete(cache_key)
        span.set_attribute("cache.key", cache_key)

    with tracer.start_as_current_span("enqueue_notifications") as span:
        from events.tasks import send_rsvp_confirmation, notify_organizer
        send_rsvp_confirmation.delay(rsvp.id)
        notify_organizer.delay(rsvp.id)
        span.set_attribute("tasks.enqueued", 2)

    return Response({"status": rsvp_status}, status=status.HTTP_201_CREATED)
```

Now the trace for this request shows not just "it took 245ms" but exactly how that time broke down across checking capacity, creating the record, invalidating cache, and enqueuing notifications.

### Recording Errors in Spans

When an exception occurs, record it on the span so it shows up in the trace:

```python
from opentelemetry import trace
from opentelemetry.trace import StatusCode

tracer = trace.get_tracer(__name__)


def process_rsvp_with_error_handling(event_id, user):
    with tracer.start_as_current_span("process_rsvp") as span:
        try:
            span.set_attribute("event.id", event_id)
            span.set_attribute("user.id", user.id)

            event = Event.objects.get(id=event_id)
            rsvp = RSVP.objects.create(
                event=event, user=user, status="confirmed"
            )

            span.set_attribute("rsvp.id", rsvp.id)
            span.set_status(StatusCode.OK)
            return rsvp

        except Event.DoesNotExist:
            span.set_status(StatusCode.ERROR, "Event not found")
            span.record_exception(Event.DoesNotExist(
                f"Event {event_id} does not exist"
            ))
            raise

        except Exception as e:
            span.set_status(StatusCode.ERROR, str(e))
            span.record_exception(e)
            raise
```

The `record_exception` method adds the exception type, message, and traceback as a span event. When you view this trace in Jaeger, the failed span shows up in red with the full error details.

---

## Trace Context Propagation

For tracing to work across service boundaries, the trace ID must travel with the request. This is called context propagation.

### HTTP Propagation

When Django makes an outgoing HTTP request (for example, calling an external API), the `RequestsInstrumentor` automatically adds trace context headers:

```
traceparent: 00-7f3a2b1c4d5e6f7a8b9c0d1e2f3a4b5c-1234567890abcdef-01
```

This `traceparent` header follows the W3C Trace Context standard. Any service that understands this header can link its spans to the same trace.

### Celery Propagation

The `CeleryInstrumentor` handles propagation through Celery's message headers. When you call `task.delay()`, the current trace context is injected into the Celery message. When the worker picks up the task, it extracts the context and creates a child span linked to the original trace.

This means the email-sending task that runs on a separate Celery worker appears in the same trace as the HTTP request that triggered it. You can follow the entire RSVP flow from the API endpoint through to the email delivery, even though it crosses process boundaries.

### Manual Propagation

If you need to propagate context through a system that OTel does not auto-instrument (for example, a custom message queue), you can do it manually:

```python
from opentelemetry import context, trace
from opentelemetry.propagate import inject, extract


def send_to_custom_queue(message):
    """Inject trace context into message headers."""
    headers = {}
    inject(headers)  # Adds traceparent header
    message["trace_headers"] = headers
    queue.send(message)


def process_from_custom_queue(message):
    """Extract trace context from message headers."""
    ctx = extract(message.get("trace_headers", {}))
    with trace.get_tracer(__name__).start_as_current_span(
        "process_message", context=ctx
    ) as span:
        # This span is linked to the original trace
        span.set_attribute("message.type", message["type"])
        handle_message(message)
```

---

## Viewing Traces in Jaeger

Jaeger is an open-source trace visualization tool. It stores traces and provides a web UI for searching and inspecting them. Let's add it to the Gather Docker Compose setup:

```yaml
# docker-compose.yml (add to existing services)

services:
  # ... existing services (db, redis, django, celery) ...

  jaeger:
    image: jaegertracing/all-in-one:1.54
    ports:
      - "16686:16686"   # Jaeger UI
      - "4317:4317"     # OTLP gRPC receiver
      - "4318:4318"     # OTLP HTTP receiver
    environment:
      COLLECTOR_OTLP_ENABLED: "true"
```

That is it. Jaeger's `all-in-one` image includes the collector, storage (in-memory for development), and the web UI.

### Environment Variables for Django

Tell OpenTelemetry where to send traces:

```bash
# .env
OTEL_SERVICE_NAME=gather-api
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317
ENVIRONMENT=development
```

For the Celery worker, use a different service name so traces distinguish between the API and worker:

```bash
# Worker-specific env
OTEL_SERVICE_NAME=gather-worker
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317
```

### Using the Jaeger UI

Start the stack and make some requests:

```bash
docker compose up -d

# Create some traffic
curl -X POST http://localhost:8000/api/events/1/rsvp/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

Open `http://localhost:16686` in your browser. In the Jaeger UI:

1. Select **gather-api** from the Service dropdown
2. Click **Find Traces**
3. Click on any trace to see the span timeline

You will see the full tree: the root HTTP span, child spans for each database query, the Redis cache invalidation, and the Celery task enqueue. Click on any span to see its attributes, duration, and any recorded errors.

### Searching for Specific Traces

Jaeger supports searching by:

- **Service**: Filter by `gather-api` or `gather-worker`
- **Operation**: Filter by `POST /api/events/{id}/rsvp/` or `celery.run send_rsvp_confirmation`
- **Tags**: Search by `event.id=42` or `rsvp.status=waitlisted`
- **Duration**: Find traces longer than a threshold (e.g., `minDuration=1s`)
- **Trace ID**: Paste a specific trace ID to find it directly

The Tags search is why adding attributes to your manual spans matters. Without `event.id` as a span attribute, you cannot search for all traces related to event 42.

---

## Sampling: Controlling Trace Volume

In production, tracing every single request generates enormous amounts of data. A service handling 10,000 requests per second produces 10,000 traces per second. That is expensive to store and process.

Sampling reduces the volume by only recording a percentage of traces:

```python
# gather/telemetry.py (updated with sampling)

from opentelemetry.sdk.trace.sampling import TraceIdRatioBased, ParentBased

def configure_opentelemetry():
    # Sample 10% of traces in production, 100% in development
    sample_rate = float(os.getenv("OTEL_TRACES_SAMPLER_ARG", "1.0"))

    sampler = ParentBased(
        root=TraceIdRatioBased(sample_rate)
    )

    provider = TracerProvider(
        resource=resource,
        sampler=sampler,
    )
    # ... rest of configuration
```

`ParentBased` means: if this request is part of an existing trace (from an upstream service), respect that trace's sampling decision. If it is a new trace, apply the ratio-based sampler. This ensures that once a trace is sampled, all its spans across all services are recorded. You never get a partial trace.

Set the sample rate via environment variable:

```bash
# Development: trace everything
OTEL_TRACES_SAMPLER_ARG=1.0

# Production: trace 10%
OTEL_TRACES_SAMPLER_ARG=0.1
```

Even at 10% sampling, you will capture enough slow and error traces to debug issues. And if a specific trace matters (like one you found in an error log), you can always search by its trace ID, as long as it was sampled.

---

## Key Takeaways

1. **A trace is a tree of spans** representing a single request's journey through your system. The trace ID links all spans together.

2. **OpenTelemetry is the vendor-neutral standard**. Instrument once, export to any backend. This avoids vendor lock-in and lets you switch observability platforms without changing application code.

3. **Auto-instrumentation covers infrastructure**. Install the right `opentelemetry-instrumentation-*` packages, call `.instrument()`, and every Django request, SQL query, Redis command, and Celery task gets traced automatically.

4. **Manual spans cover business logic**. Use `tracer.start_as_current_span()` to add visibility into your own code, especially for operations that are important to your domain (capacity checks, RSVP processing, notification dispatch).

5. **Context propagation links services**. OpenTelemetry automatically propagates trace context through HTTP headers and Celery messages. A single trace can span multiple processes and machines.

6. **Sampling controls cost**. In production, sample a percentage of traces to keep storage costs manageable. Use `ParentBased` sampling to ensure complete traces.

7. **Span attributes enable searching**. The more context you add to spans (user IDs, event IDs, status codes), the easier it is to find the traces that matter.

In the next lesson, you will add the second pillar: metrics with Prometheus and Grafana dashboards.

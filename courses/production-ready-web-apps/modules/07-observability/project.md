---
title: "Gather Observability Stack"
estimatedMinutes: 90
---

# Project: Gather Observability Stack

In this project, you will add full observability to Gather. By the end, you will have distributed tracing, application metrics, centralized logging, a Grafana dashboard, and an incident runbook. All services will run in Docker Compose alongside the existing Gather stack.

This is a substantial project. Take your time with each section. The observability infrastructure you build here is the same stack used by production systems serving millions of users (just at a smaller scale).

---

## What You Will Build

1. **OpenTelemetry auto-instrumentation** for Django, PostgreSQL, Redis, and Celery
2. **Custom spans** for RSVP business logic (capacity check, record creation, cache invalidation)
3. **Prometheus metrics**: latency histograms, cache hit rate counter, queue depth gauge, error rate
4. **Grafana dashboard** with panels for p50/p95/p99 latency, cache hit rate, Celery queue depth, and error rate
5. **Centralized logging** with Loki, including trace ID correlation
6. **Incident runbook** for "RSVP endpoint latency > 2s"

---

## Prerequisites

Make sure you have the Gather stack running from previous modules:

```bash
cd gather-production-starter
docker compose up -d
```

Verify the Django API responds:

```bash
curl http://localhost:8000/api/events/
```

---

## Part 1: OpenTelemetry Instrumentation

### Step 1.1: Install Dependencies

Add the OpenTelemetry packages to your requirements:

```txt
# requirements.txt (add these lines)
opentelemetry-api==1.23.0
opentelemetry-sdk==1.23.0
opentelemetry-exporter-otlp==1.23.0
opentelemetry-instrumentation-django==0.44b0
opentelemetry-instrumentation-psycopg2==0.44b0
opentelemetry-instrumentation-redis==0.44b0
opentelemetry-instrumentation-celery==0.44b0
opentelemetry-instrumentation-requests==0.44b0
opentelemetry-instrumentation-logging==0.44b0
```

```bash
pip install -r requirements.txt
```

### Step 1.2: Create the Telemetry Configuration

Create `gather/telemetry.py`:

```python
# gather/telemetry.py

import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.trace.sampling import ParentBased, TraceIdRatioBased
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource


def configure_opentelemetry():
    """
    Initialize OpenTelemetry tracing.
    Call once at app startup (wsgi.py and celery.py).
    """
    resource = Resource.create({
        "service.name": os.getenv("OTEL_SERVICE_NAME", "gather-api"),
        "service.version": os.getenv("APP_VERSION", "1.0.0"),
        "deployment.environment": os.getenv("ENVIRONMENT", "development"),
    })

    sample_rate = float(os.getenv("OTEL_TRACES_SAMPLER_ARG", "1.0"))
    sampler = ParentBased(root=TraceIdRatioBased(sample_rate))

    provider = TracerProvider(resource=resource, sampler=sampler)

    otlp_exporter = OTLPSpanExporter(
        endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317"),
        insecure=True,
    )
    provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
    trace.set_tracer_provider(provider)

    # TODO: Auto-instrument Django
    # Import DjangoInstrumentor and call .instrument()

    # TODO: Auto-instrument psycopg2
    # Import Psycopg2Instrumentor and call .instrument()

    # TODO: Auto-instrument Redis
    # Import RedisInstrumentor and call .instrument()

    # TODO: Auto-instrument Celery
    # Import CeleryInstrumentor and call .instrument()

    # TODO: Auto-instrument outgoing HTTP requests
    # Import RequestsInstrumentor and call .instrument()

    # TODO: Inject trace context into log records
    # Import LoggingInstrumentor and call .instrument(set_logging_format=True)
```

### Step 1.3: Hook Into WSGI and Celery

```python
# gather/wsgi.py

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gather.settings')

# TODO: Import and call configure_opentelemetry() BEFORE get_wsgi_application()

application = get_wsgi_application()
```

```python
# gather/celery.py

import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gather.settings')

# TODO: Import and call configure_opentelemetry() for the worker process
# Hint: The worker needs its own OTEL_SERVICE_NAME (e.g., "gather-worker")

app = Celery('gather')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
```

### Step 1.4: Add Custom Spans to RSVP Logic

Open `events/views.py` and add manual spans around the RSVP business logic:

```python
# events/views.py

from opentelemetry import trace

tracer = trace.get_tracer(__name__)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_rsvp(request, event_id):
    """Create an RSVP with OpenTelemetry tracing."""

    # TODO: Create a span named "check_event_capacity"
    # Inside the span:
    #   - Fetch the event
    #   - Count confirmed RSVPs
    #   - Set span attributes: event.id, event.capacity, event.confirmed_count
    #   - Determine RSVP status (confirmed vs waitlisted)

    # TODO: Create a span named "create_rsvp_record"
    # Inside the span:
    #   - Call RSVP.objects.get_or_create(...)
    #   - Set span attributes: rsvp.id, rsvp.created, rsvp.status
    #   - Handle the "already exists" case (return 409)

    # TODO: Create a span named "invalidate_event_cache"
    # Inside the span:
    #   - Delete the cache key for this event
    #   - Set span attribute: cache.key

    # TODO: Create a span named "enqueue_notifications"
    # Inside the span:
    #   - Call send_rsvp_confirmation.delay(rsvp.id)
    #   - Call notify_organizer.delay(rsvp.id)
    #   - Set span attribute: tasks.enqueued = 2

    return Response({"status": rsvp_status}, status=status.HTTP_201_CREATED)
```

### Step 1.5: Add Jaeger to Docker Compose

```yaml
# docker-compose.yml (add this service)

  jaeger:
    image: jaegertracing/all-in-one:1.54
    ports:
      - "16686:16686"
      - "4317:4317"
      - "4318:4318"
    environment:
      COLLECTOR_OTLP_ENABLED: "true"
```

Add environment variables to the Django and Celery services:

```yaml
  django:
    # ... existing config ...
    environment:
      OTEL_SERVICE_NAME: gather-api
      OTEL_EXPORTER_OTLP_ENDPOINT: http://jaeger:4317
      ENVIRONMENT: development

  celery-worker:
    # ... existing config ...
    environment:
      OTEL_SERVICE_NAME: gather-worker
      OTEL_EXPORTER_OTLP_ENDPOINT: http://jaeger:4317
      ENVIRONMENT: development
```

### Verification

```bash
docker compose up -d --build

# Create some RSVP traffic
curl -X POST http://localhost:8000/api/events/1/rsvp/ \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json"

# Open Jaeger UI
open http://localhost:16686
```

In Jaeger, select the `gather-api` service and click "Find Traces." You should see traces with child spans for database queries, Redis commands, and your custom business logic spans.

---

## Part 2: Prometheus Metrics

### Step 2.1: Install django-prometheus

```txt
# requirements.txt (add)
django-prometheus==2.3.1
```

### Step 2.2: Configure django-prometheus

```python
# settings.py

# TODO: Add "django_prometheus" to INSTALLED_APPS

# TODO: Add PrometheusBeforeMiddleware as the FIRST middleware
# TODO: Add PrometheusAfterMiddleware as the LAST middleware

# TODO: Change the database ENGINE to "django_prometheus.db.backends.postgresql"

# TODO: Change the cache BACKEND to "django_prometheus.cache.backends.redis.RedisCache"
```

### Step 2.3: Expose the /metrics Endpoint

```python
# gather/urls.py

# TODO: Add the django-prometheus URL pattern
# path("", include("django_prometheus.urls")),
```

### Step 2.4: Define Custom Metrics

Create `events/metrics.py`:

```python
# events/metrics.py

from prometheus_client import Counter, Gauge, Histogram

# TODO: Define a Counter for RSVP creations
# Name: gather_rsvp_created_total
# Help: "Total RSVPs created"
# Labels: status (confirmed/waitlisted)

# TODO: Define a Histogram for RSVP processing duration
# Name: gather_rsvp_processing_seconds
# Help: "Time to process an RSVP request"
# Buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]

# TODO: Define a Counter for cache hits
# Name: gather_cache_hit_total
# Help: "Cache hits"
# Labels: cache_key_prefix

# TODO: Define a Counter for cache misses
# Name: gather_cache_miss_total
# Help: "Cache misses"
# Labels: cache_key_prefix

# TODO: Define a Gauge for Celery queue depth
# Name: gather_celery_queue_depth
# Help: "Number of pending tasks in Celery queue"
# Labels: queue_name

# TODO: Define a Counter for error responses
# Name: gather_error_responses_total
# Help: "Total error responses (4xx and 5xx)"
# Labels: status_code, endpoint
```

### Step 2.5: Instrument the RSVP View

Update `events/views.py` to record custom metrics:

```python
# events/views.py

import time
from events.metrics import (
    rsvp_created_total,
    rsvp_processing_seconds,
    cache_hit_total,
    cache_miss_total,
)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_rsvp(request, event_id):
    start = time.time()

    # ... your existing RSVP logic with OTel spans ...

    # TODO: After creating the RSVP, observe the processing duration
    # rsvp_processing_seconds.observe(time.time() - start)

    # TODO: Increment the RSVP counter with the status label
    # rsvp_created_total.labels(status=rsvp_status).inc()

    return Response({"status": rsvp_status}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def event_detail(request, event_id):
    cache_key = f"event:{event_id}"
    cached = cache.get(cache_key)

    if cached:
        # TODO: Increment cache_hit_total with cache_key_prefix="event"
        return Response(cached)

    # TODO: Increment cache_miss_total with cache_key_prefix="event"
    event = Event.objects.get(id=event_id)
    data = EventSerializer(event).data
    cache.set(cache_key, data, timeout=300)
    return Response(data)
```

### Step 2.6: Queue Depth Metric (Celery Beat Task)

```python
# events/tasks.py

# TODO: Create a Celery task called update_queue_metrics that:
# 1. Connects to Redis using settings.CELERY_BROKER_URL
# 2. For each queue name ("default", "email", "notifications"):
#    - Gets the queue length with r.llen(queue_name)
#    - Sets celery_queue_depth.labels(queue_name=queue_name).set(depth)
# 3. Register this as a Celery Beat task running every 15 seconds
```

### Step 2.7: Add Prometheus to Docker Compose

```yaml
# docker-compose.yml (add this service)

  prometheus:
    image: prom/prometheus:v2.50.0
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.retention.time=15d"
```

Create the Prometheus configuration:

```yaml
# monitoring/prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: "gather-api"
    metrics_path: /metrics
    static_configs:
      - targets: ["django:8000"]
        labels:
          service: "gather-api"
```

### Verification

```bash
docker compose up -d --build

# Check that the /metrics endpoint works
curl http://localhost:8000/metrics | head -20

# Check that Prometheus is scraping
open http://localhost:9090/targets
```

All targets should show "UP" in the Prometheus targets page.

---

## Part 3: Grafana Dashboard

### Step 3.1: Add Grafana to Docker Compose

```yaml
# docker-compose.yml (add this service)

  grafana:
    image: grafana/grafana:10.3.0
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: gather-dev
      GF_USERS_ALLOW_SIGN_UP: "false"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
```

### Step 3.2: Provision the Prometheus Data Source

```yaml
# monitoring/grafana/provisioning/datasources/prometheus.yml

apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

### Step 3.3: Create the Dashboard JSON

Create a dashboard with six panels. Save this as `monitoring/grafana/provisioning/dashboards/gather-overview.json`:

```json
{
  "dashboard": {
    "title": "Gather Overview",
    "uid": "gather-overview",
    "timezone": "utc",
    "refresh": "10s",
    "panels": [
      {
        "id": 1,
        "title": "Request Latency (p50 / p95 / p99)",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 },
        "targets": [
          {
            "expr": "histogram_quantile(0.50, sum by (le) (rate(django_http_requests_latency_seconds_by_view_method_bucket[5m])))",
            "legendFormat": "p50"
          },
          {
            "expr": "histogram_quantile(0.95, sum by (le) (rate(django_http_requests_latency_seconds_by_view_method_bucket[5m])))",
            "legendFormat": "p95"
          },
          {
            "expr": "histogram_quantile(0.99, sum by (le) (rate(django_http_requests_latency_seconds_by_view_method_bucket[5m])))",
            "legendFormat": "p99"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s"
          }
        }
      },
      {
        "id": 2,
        "title": "Request Rate (req/s)",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 },
        "targets": [
          {
            "expr": "sum by (method) (rate(django_http_requests_total_by_method_total[1m]))",
            "legendFormat": "{{method}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "reqps"
          }
        }
      },
      {
        "id": 3,
        "title": "Cache Hit Rate (%)",
        "type": "stat",
        "gridPos": { "h": 8, "w": 6, "x": 0, "y": 8 },
        "targets": [
          {
            "expr": "100 * sum(rate(gather_cache_hit_total[5m])) / (sum(rate(gather_cache_hit_total[5m])) + sum(rate(gather_cache_miss_total[5m])))",
            "legendFormat": "Hit Rate"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "steps": [
                { "value": 0, "color": "red" },
                { "value": 70, "color": "yellow" },
                { "value": 90, "color": "green" }
              ]
            }
          }
        }
      },
      {
        "id": 4,
        "title": "Celery Queue Depth",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 6, "x": 6, "y": 8 },
        "targets": [
          {
            "expr": "gather_celery_queue_depth",
            "legendFormat": "{{queue_name}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "short"
          }
        }
      },
      {
        "id": 5,
        "title": "Error Rate (%)",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 6, "x": 12, "y": 8 },
        "targets": [
          {
            "expr": "100 * sum(rate(django_http_responses_total_by_status_total{status=~\"5..\"}[5m])) / sum(rate(django_http_responses_total_by_status_total[5m]))",
            "legendFormat": "5xx Error Rate"
          },
          {
            "expr": "100 * sum(rate(django_http_responses_total_by_status_total{status=~\"4..\"}[5m])) / sum(rate(django_http_responses_total_by_status_total[5m]))",
            "legendFormat": "4xx Error Rate"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 1, "color": "yellow" },
                { "value": 5, "color": "red" }
              ]
            }
          }
        }
      },
      {
        "id": 6,
        "title": "RSVP Processing Time (p95)",
        "type": "timeseries",
        "gridPos": { "h": 8, "w": 6, "x": 18, "y": 8 },
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum by (le) (rate(gather_rsvp_processing_seconds_bucket[5m])))",
            "legendFormat": "p95 RSVP Processing"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "thresholds": {
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 0.5, "color": "yellow" },
                { "value": 2, "color": "red" }
              ]
            }
          }
        }
      }
    ]
  }
}
```

Create the dashboard provisioning config:

```yaml
# monitoring/grafana/provisioning/dashboards/dashboards.yml

apiVersion: 1

providers:
  - name: "Gather Dashboards"
    orgId: 1
    folder: "Gather"
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /etc/grafana/provisioning/dashboards
      foldersFromFilesStructure: false
```

### Verification

```bash
docker compose up -d --build

# Open Grafana
open http://localhost:3001
# Login: admin / gather-dev
```

Navigate to Dashboards and find "Gather Overview." You should see all six panels. Generate traffic to populate the graphs:

```bash
# Generate RSVP traffic
for i in $(seq 1 20); do
  curl -s -X POST http://localhost:8000/api/events/$((i % 5 + 1))/rsvp/ \
    -H "Authorization: Bearer <your-token>" \
    -H "Content-Type: application/json" &
done
wait

# Generate read traffic
for i in $(seq 1 50); do
  curl -s http://localhost:8000/api/events/$((i % 10 + 1))/ > /dev/null &
done
wait
```

---

## Part 4: Centralized Logging with Loki

### Step 4.1: Install structlog

```txt
# requirements.txt (add)
structlog==24.1.0
python-json-logger==2.0.7
```

### Step 4.2: Create the Trace Context Log Processor

```python
# gather/logging_processors.py

from opentelemetry import trace


def add_trace_context(logger, method_name, event_dict):
    """Add trace_id and span_id to every log entry."""
    # TODO: Get the current span from opentelemetry.trace
    # TODO: If the span exists and is recording:
    #   - Get the span context
    #   - Add trace_id as a 32-character hex string to event_dict
    #   - Add span_id as a 16-character hex string to event_dict
    # TODO: Return event_dict
    pass
```

### Step 4.3: Configure structlog in settings.py

```python
# settings.py

# TODO: Configure structlog with these processors (in order):
# 1. structlog.stdlib.add_log_level
# 2. structlog.stdlib.add_logger_name
# 3. structlog.processors.TimeStamper(fmt="iso")
# 4. add_trace_context (your custom processor)
# 5. ConsoleRenderer for development, JSONRenderer for production
#
# Set wrapper_class=structlog.stdlib.BoundLogger
# Set logger_factory=structlog.stdlib.LoggerFactory()
```

### Step 4.4: Add Loki and Promtail to Docker Compose

```yaml
# docker-compose.yml (add these services)

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
      - gather_logs:/app/logs
    command: -config.file=/etc/promtail/config.yml
    depends_on:
      - loki
```

Create the Loki configuration:

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
```

Create the Promtail configuration:

```yaml
# monitoring/promtail-config.yml

server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: gather
    static_configs:
      - targets:
          - localhost
        labels:
          job: gather
          __path__: /app/logs/*.json

    pipeline_stages:
      - json:
          expressions:
            level: level
            trace_id: trace_id
            event: event
      - labels:
          level:
          trace_id:
          event:
```

### Step 4.5: Add Loki as a Grafana Data Source

```yaml
# monitoring/grafana/provisioning/datasources/loki.yml

apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: false
```

### Verification

```bash
docker compose up -d --build

# Generate some traffic
curl -X POST http://localhost:8000/api/events/1/rsvp/ \
  -H "Authorization: Bearer <your-token>"

# Open Grafana, go to Explore, select Loki as the data source
# Query: {job="gather"}
```

You should see JSON log entries with trace IDs. Click on a trace_id value to see if it links to Jaeger (if you configured the derived fields in the Loki data source).

---

## Part 5: Incident Runbook

Create a file called `runbooks/rsvp-latency.md` in your project root:

```markdown
# Runbook: RSVP Endpoint Latency > 2s

## Overview

<!-- TODO: Write a 2-3 sentence description of what this alert means,
     why it matters, and what user impact looks like -->

**Severity**: SEV 2
**Owner**: Backend team
**Dashboard**: http://localhost:3001/d/gather-overview
**Alert**: RSVP Latency > 2s (p95) for 5+ minutes

## Diagnosis Steps

### Step 1: Check the Grafana Dashboard

<!-- TODO: List the specific panels to check and what to look for:
     - Latency panel: Is it just RSVP or all endpoints?
     - Error rate panel: Are there 5xx errors?
     - Queue depth panel: Is the Celery queue backing up?
     - Cache hit rate: Did it drop? -->

### Step 2: Check for Correlated Events

<!-- TODO: List things to check:
     - Recent deploys
     - Traffic spikes
     - Infrastructure changes
     - External service status (email provider, etc.) -->

### Step 3: Examine Traces in Jaeger

<!-- TODO: Write step-by-step instructions:
     1. Open Jaeger at http://localhost:16686
     2. Select service: gather-api
     3. Set operation: POST /api/events/{id}/rsvp/
     4. Set min duration: 2s
     5. What to look for in the span timeline
     6. Decision tree based on which span is slow -->

### Step 4: Check Logs in Grafana/Loki

<!-- TODO: Write specific LogQL queries to run:
     - Find error logs: {service="django", level="error"}
     - Find slow RSVP logs by trace_id
     - Search for known error patterns -->

## Mitigation Options

<!-- TODO: List 4-5 mitigation options ordered from least to most disruptive.
     For each option, include the exact command to run. Examples:
     1. Scale up workers
     2. Restart a stuck service
     3. Disable non-critical features
     4. Rollback recent deploy
     5. Enable maintenance mode -->

## Escalation

<!-- TODO: Define when to escalate and to whom -->

## Post-Incident Checklist

<!-- TODO: List the steps to take after the incident is resolved:
     1. Verify metrics have returned to normal
     2. Post all-clear message
     3. Schedule postmortem
     4. Create follow-up tickets -->
```

Fill in every `TODO` section with specific, actionable content. Reference the actual Grafana URLs, Jaeger queries, and Docker Compose commands for your setup. The runbook should be detailed enough that someone who has never seen this system before could follow it during an incident.

---

## Final Docker Compose

Your complete `docker-compose.yml` should include all of these services:

```yaml
services:
  db:
    image: postgres:15
    # ... existing config ...

  redis:
    image: redis:7-alpine
    # ... existing config ...

  django:
    # ... existing config with OTEL env vars ...

  celery-worker:
    # ... existing config with OTEL env vars ...

  celery-beat:
    # ... existing config ...

  jaeger:
    image: jaegertracing/all-in-one:1.54
    ports:
      - "16686:16686"
      - "4317:4317"
    environment:
      COLLECTOR_OTLP_ENABLED: "true"

  prometheus:
    image: prom/prometheus:v2.50.0
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:10.3.0
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: gather-dev
    volumes:
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning

  loki:
    image: grafana/loki:2.9.4
    ports:
      - "3100:3100"
    volumes:
      - ./monitoring/loki-config.yml:/etc/loki/local-config.yaml

  promtail:
    image: grafana/promtail:2.9.4
    volumes:
      - ./monitoring/promtail-config.yml:/etc/promtail/config.yml
      - gather_logs:/app/logs
    depends_on:
      - loki
```

---

## Acceptance Criteria

Your project is complete when:

1. **Traces appear in Jaeger** for RSVP requests, showing Django, PostgreSQL, Redis, and Celery spans plus your custom business logic spans
2. **Prometheus scrapes successfully** (all targets show "UP" at http://localhost:9090/targets)
3. **The /metrics endpoint** returns custom metrics (gather_rsvp_created_total, gather_cache_hit_total, etc.)
4. **The Grafana dashboard** shows all six panels with live data: latency percentiles, request rate, cache hit rate, queue depth, error rate, and RSVP processing time
5. **Logs appear in Loki** (queryable in Grafana Explore) with trace_id fields
6. **The runbook** is complete with no remaining TODO markers, and includes specific commands, queries, and decision trees

---

## Stretch Goals

If you finish early:

1. **Add a Grafana alert** that fires when RSVP p95 latency exceeds 2s for 5 minutes
2. **Configure Jaeger links in Loki** so clicking a trace_id in a log entry opens the trace in Jaeger
3. **Add a "Database Connections" panel** to Grafana using PostgreSQL exporter metrics
4. **Write a second runbook** for "Celery queue depth > 500 for 10 minutes"
5. **Add a custom metric** for RSVP waitlist rate (percentage of RSVPs that are waitlisted vs confirmed)

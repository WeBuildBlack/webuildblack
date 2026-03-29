---
title: "Metrics and Dashboards"
estimatedMinutes: 40
---

# Metrics and Dashboards

Traces show you what happened to a single request. Metrics show you what is happening to your entire system, right now, over the last hour, or over the last month. They are the numbers that power your dashboards, trigger your alerts, and tell you whether your application is healthy or on fire.

In this lesson, you will set up Prometheus for metrics collection, add custom metrics to Gather, and build Grafana dashboards that give you real-time visibility into latency, throughput, errors, and resource utilization.

---

## What Is a Metric?

A metric is a numeric measurement taken over time. Every metric has:

- A **name** (e.g., `http_requests_total`)
- A **type** (counter, gauge, or histogram)
- **Labels** (key-value pairs that add dimensions, like `method="POST"` or `endpoint="/api/events/"`)
- A **value** (the number itself)

Metrics are fundamentally different from logs and traces because they are **aggregated**. You do not store one data point per request. Instead, you store summary statistics (counts, sums, averages, percentiles) that describe the behavior of many requests over a time window. This makes metrics cheap to store and fast to query, even at massive scale.

---

## Metric Types

Prometheus defines three core metric types. Understanding the difference is essential for choosing the right one.

### Counter

A counter is a value that only goes up (or resets to zero on restart). Use counters for things you count: requests served, errors returned, emails sent, RSVPs created.

```python
from prometheus_client import Counter

# Total HTTP requests, labeled by method and endpoint
http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests",
    labelnames=["method", "endpoint", "status_code"],
)

# Usage: increment on every request
http_requests_total.labels(
    method="POST",
    endpoint="/api/events/42/rsvp/",
    status_code="201",
).inc()
```

You never query a counter's raw value. Instead, you query its **rate of change**. "We got 500 requests in the last minute" is `rate(http_requests_total[1m])`. "Our error rate is 2%" is `rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m])`.

### Gauge

A gauge is a value that can go up or down. Use gauges for things that have a current state: active connections, queue depth, memory usage, cache size.

```python
from prometheus_client import Gauge

# Current number of active WebSocket/SSE connections
active_connections = Gauge(
    "active_connections",
    "Number of active SSE connections",
)

# Current depth of the Celery task queue
celery_queue_depth = Gauge(
    "celery_queue_depth",
    "Number of tasks waiting in the Celery queue",
    labelnames=["queue_name"],
)

# Usage
active_connections.inc()    # Connection opened
active_connections.dec()    # Connection closed
celery_queue_depth.labels(queue_name="default").set(42)  # Set to exact value
```

Gauges are queried directly. "How many tasks are in the queue right now?" is just `celery_queue_depth{queue_name="default"}`.

### Histogram

A histogram measures the distribution of values, typically durations or sizes. It automatically buckets observations and calculates percentiles.

```python
from prometheus_client import Histogram

# Response latency in seconds
request_latency = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    labelnames=["method", "endpoint"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
)

# Usage: observe a duration
import time

start = time.time()
# ... handle request ...
duration = time.time() - start
request_latency.labels(method="POST", endpoint="/api/events/42/rsvp/").observe(duration)
```

The `buckets` parameter defines the boundaries. With the buckets above, Prometheus tracks how many requests took less than 10ms, less than 25ms, less than 50ms, and so on. This lets you calculate percentiles like p50, p95, and p99 without storing every individual request duration.

Histograms are the most important metric type for latency monitoring. The PromQL function `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))` gives you the p95 latency over the last 5 minutes.

---

## Prometheus: Pull-Based Metrics Collection

Prometheus is an open-source monitoring system that collects metrics by **pulling** them from your application. This is different from push-based systems where your app sends metrics to a collector.

The workflow is:

1. Your Django app exposes a `/metrics` endpoint that returns all current metric values in Prometheus text format
2. Prometheus scrapes this endpoint at a regular interval (typically every 15 seconds)
3. Prometheus stores the time-series data in its local database
4. Grafana queries Prometheus to build dashboards

### Why Pull-Based?

Pull-based collection has several advantages:

- **Prometheus controls the rate**. It will not overwhelm your app with collection requests.
- **Health checking is built in**. If Prometheus cannot scrape your app, it knows the app is down.
- **No client-side buffering**. Your app does not need to manage a queue of unsent metrics.
- **Easy to test**. You can curl the `/metrics` endpoint to see what Prometheus sees.

---

## Adding Prometheus to Gather

### Install django-prometheus

The `django-prometheus` package integrates Prometheus metrics with Django automatically:

```bash
pip install django-prometheus
```

```python
# settings.py

INSTALLED_APPS = [
    # ... existing apps ...
    "django_prometheus",
]

MIDDLEWARE = [
    "django_prometheus.middleware.PrometheusBeforeMiddleware",
    # ... existing middleware ...
    "django_prometheus.middleware.PrometheusAfterMiddleware",
]
```

The two middleware components wrap every request. `PrometheusBeforeMiddleware` records the start time, and `PrometheusAfterMiddleware` records the duration and status code. Together, they automatically generate:

- `django_http_requests_total_by_method_total` (counter, by HTTP method)
- `django_http_requests_total_by_transport_total` (counter, HTTP vs HTTPS)
- `django_http_requests_total_by_view_transport_method_total` (counter, by view name, transport, method)
- `django_http_responses_total_by_status_total` (counter, by status code)
- `django_http_requests_latency_seconds_by_view_method` (histogram, by view and method)

### Expose the /metrics Endpoint

```python
# gather/urls.py

from django.urls import path, include

urlpatterns = [
    # ... existing URL patterns ...
    path("", include("django_prometheus.urls")),
]
```

This adds a `/metrics` endpoint. Test it:

```bash
curl http://localhost:8000/metrics
```

You will see output like:

```
# HELP django_http_requests_total_by_method_total Count of requests by method
# TYPE django_http_requests_total_by_method_total counter
django_http_requests_total_by_method_total{method="GET"} 1523.0
django_http_requests_total_by_method_total{method="POST"} 287.0

# HELP django_http_requests_latency_seconds_by_view_method Histogram of request latency by view
# TYPE django_http_requests_latency_seconds_by_view_method histogram
django_http_requests_latency_seconds_by_view_method_bucket{le="0.01",method="GET",view="event-list"} 1200.0
django_http_requests_latency_seconds_by_view_method_bucket{le="0.025",method="GET",view="event-list"} 1450.0
...
```

### Instrument Database Connections

Replace the default database engine with the Prometheus-wrapped version to get connection metrics:

```python
# settings.py

DATABASES = {
    "default": {
        "ENGINE": "django_prometheus.db.backends.postgresql",  # was django.db.backends.postgresql
        "NAME": os.getenv("DB_NAME", "gather_dev"),
        "USER": os.getenv("DB_USER", "gather"),
        "PASSWORD": os.getenv("DB_PASSWORD", ""),
        "HOST": os.getenv("DB_HOST", "localhost"),
        "PORT": os.getenv("DB_PORT", "5432"),
    }
}
```

Similarly, instrument the Redis cache:

```python
# settings.py

CACHES = {
    "default": {
        "BACKEND": "django_prometheus.cache.backends.redis.RedisCache",  # Prometheus-wrapped
        "LOCATION": os.getenv("REDIS_URL", "redis://localhost:6379/1"),
    }
}
```

Now you get metrics for database query counts, connection pool usage, cache hits, and cache misses, all automatically.

---

## Custom Metrics for Gather

The auto-generated metrics cover HTTP and infrastructure. But you also want business-level metrics specific to Gather. Define these in a dedicated module:

```python
# events/metrics.py

from prometheus_client import Counter, Gauge, Histogram

# RSVP metrics
rsvp_created_total = Counter(
    "gather_rsvp_created_total",
    "Total RSVPs created",
    labelnames=["status", "event_id"],
)

rsvp_processing_seconds = Histogram(
    "gather_rsvp_processing_seconds",
    "Time to process an RSVP request (business logic only)",
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0],
)

# Cache metrics
cache_hit_total = Counter(
    "gather_cache_hit_total",
    "Cache hits",
    labelnames=["cache_key_prefix"],
)

cache_miss_total = Counter(
    "gather_cache_miss_total",
    "Cache misses",
    labelnames=["cache_key_prefix"],
)

# Queue metrics
celery_queue_depth = Gauge(
    "gather_celery_queue_depth",
    "Number of pending tasks in Celery queue",
    labelnames=["queue_name"],
)

# Event metrics
active_events_total = Gauge(
    "gather_active_events_total",
    "Number of events with a future date",
)

events_at_capacity = Gauge(
    "gather_events_at_capacity",
    "Number of events that have reached full capacity",
)
```

### Using Custom Metrics in Views

```python
# events/views.py

import time
from events.metrics import (
    rsvp_created_total,
    rsvp_processing_seconds,
    cache_hit_total,
    cache_miss_total,
)


@api_view(["GET"])
def event_detail(request, event_id):
    """Get event detail, with cache metrics."""
    cache_key = f"event:{event_id}"
    cached = cache.get(cache_key)

    if cached:
        cache_hit_total.labels(cache_key_prefix="event").inc()
        return Response(cached)

    cache_miss_total.labels(cache_key_prefix="event").inc()
    event = Event.objects.get(id=event_id)
    data = EventSerializer(event).data
    cache.set(cache_key, data, timeout=300)
    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_rsvp(request, event_id):
    """Create RSVP with business metrics."""
    start = time.time()

    # ... RSVP business logic ...
    rsvp = RSVP.objects.create(
        event_id=event_id,
        user=request.user,
        status=rsvp_status,
    )

    duration = time.time() - start
    rsvp_processing_seconds.observe(duration)
    rsvp_created_total.labels(status=rsvp_status, event_id=str(event_id)).inc()

    return Response({"status": rsvp_status}, status=status.HTTP_201_CREATED)
```

### Updating Queue Depth on a Schedule

The Celery queue depth gauge needs to be updated periodically. Use a Celery beat task:

```python
# events/tasks.py

from celery import shared_task
from events.metrics import celery_queue_depth
import redis


@shared_task
def update_queue_metrics():
    """Update Celery queue depth gauge. Runs every 15 seconds via Celery Beat."""
    r = redis.from_url(settings.CELERY_BROKER_URL)

    for queue_name in ["default", "email", "notifications"]:
        depth = r.llen(queue_name)
        celery_queue_depth.labels(queue_name=queue_name).set(depth)
```

```python
# settings.py (Celery Beat schedule)

CELERY_BEAT_SCHEDULE = {
    "update-queue-metrics": {
        "task": "events.tasks.update_queue_metrics",
        "schedule": 15.0,  # Every 15 seconds
    },
}
```

---

## Setting Up Prometheus and Grafana

Add Prometheus and Grafana to your Docker Compose stack:

```yaml
# docker-compose.yml (add to existing services)

services:
  # ... existing services ...

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

volumes:
  prometheus_data:
  grafana_data:
```

### Prometheus Configuration

```yaml
# monitoring/prometheus.yml

global:
  scrape_interval: 15s      # How often to pull metrics
  evaluation_interval: 15s  # How often to evaluate alerting rules

scrape_configs:
  - job_name: "gather-api"
    metrics_path: /metrics
    static_configs:
      - targets: ["django:8000"]
        labels:
          service: "gather-api"

  - job_name: "gather-worker"
    metrics_path: /metrics
    static_configs:
      - targets: ["celery-worker:8001"]
        labels:
          service: "gather-worker"
```

### Grafana Data Source Provisioning

Auto-configure Grafana to connect to Prometheus on startup:

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

---

## PromQL Basics

PromQL (Prometheus Query Language) is how you query metrics. You need to know a handful of functions to build effective dashboards.

### Instant Queries

A simple metric name returns its current value:

```promql
# Current value of all HTTP request counters
django_http_requests_total_by_method_total
```

### Range Queries and rate()

The `rate()` function calculates the per-second rate of change over a time window. This is the most common function for counters:

```promql
# Requests per second over the last 5 minutes
rate(django_http_requests_total_by_method_total[5m])

# Error rate (5xx responses per second)
rate(django_http_responses_total_by_status_total{status=~"5.."}[5m])
```

### Percentiles with histogram_quantile()

For latency histograms, use `histogram_quantile()`:

```promql
# p50 (median) latency
histogram_quantile(0.50,
  rate(django_http_requests_latency_seconds_by_view_method_bucket[5m])
)

# p95 latency
histogram_quantile(0.95,
  rate(django_http_requests_latency_seconds_by_view_method_bucket[5m])
)

# p99 latency
histogram_quantile(0.99,
  rate(django_http_requests_latency_seconds_by_view_method_bucket[5m])
)
```

### Filtering with Labels

```promql
# Only POST requests
rate(django_http_requests_total_by_method_total{method="POST"}[5m])

# Only the RSVP endpoint
rate(django_http_requests_latency_seconds_by_view_method_bucket{view="create-rsvp"}[5m])

# All 4xx and 5xx status codes
rate(django_http_responses_total_by_status_total{status=~"[45].."}[5m])
```

### Aggregation

```promql
# Total request rate across all endpoints
sum(rate(django_http_requests_total_by_method_total[5m]))

# Average latency by endpoint
avg by (view) (
  rate(django_http_requests_latency_seconds_by_view_method_sum[5m])
  /
  rate(django_http_requests_latency_seconds_by_view_method_count[5m])
)
```

---

## Building a Grafana Dashboard

Grafana dashboards are defined as JSON. Here is a practical dashboard for Gather with four essential panels.

### Panel 1: Request Rate

Shows requests per second, broken down by HTTP method:

```json
{
  "title": "Request Rate",
  "type": "timeseries",
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
}
```

### Panel 2: Latency Percentiles

Shows p50, p95, and p99 latency on the same graph:

```json
{
  "title": "Response Latency (p50 / p95 / p99)",
  "type": "timeseries",
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
      "unit": "s",
      "thresholds": {
        "steps": [
          { "value": 0, "color": "green" },
          { "value": 0.2, "color": "yellow" },
          { "value": 1.0, "color": "red" }
        ]
      }
    }
  }
}
```

### Panel 3: Error Rate

Shows the percentage of responses that are 5xx errors:

```json
{
  "title": "Error Rate (%)",
  "type": "timeseries",
  "targets": [
    {
      "expr": "100 * sum(rate(django_http_responses_total_by_status_total{status=~\"5..\"}[5m])) / sum(rate(django_http_responses_total_by_status_total[5m]))",
      "legendFormat": "5xx Error Rate"
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
}
```

### Panel 4: Celery Queue Depth

Shows how many tasks are waiting in each Celery queue:

```json
{
  "title": "Celery Queue Depth",
  "type": "timeseries",
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
}
```

### Cache Hit Rate Panel

```json
{
  "title": "Cache Hit Rate (%)",
  "type": "stat",
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
}
```

To import the full dashboard, save it as a JSON file and use Grafana's import feature (the `+` button in the sidebar, then "Import dashboard").

---

## The RED and USE Methods

Two frameworks help you decide which metrics to collect.

### RED Method (for request-driven services)

For every service endpoint, track:

- **R**ate: Requests per second
- **E**rrors: Failed requests per second
- **D**uration: Latency distribution (histograms)

This is exactly what `django-prometheus` gives you out of the box.

### USE Method (for resources)

For every resource (CPU, memory, disk, connections), track:

- **U**tilization: How full is the resource? (e.g., "80% of DB connections in use")
- **S**aturation: How much work is queued? (e.g., "15 tasks waiting in Celery queue")
- **E**rrors: Error count for the resource (e.g., "3 connection timeouts")

Between RED (for services) and USE (for resources), you cover the most common failure modes.

---

## Key Takeaways

1. **Metrics are aggregated numbers over time**. They are cheap to store and fast to query, making them ideal for dashboards and alerting.

2. **Choose the right metric type**. Counters for things that only increase (requests, errors). Gauges for things that fluctuate (connections, queue depth). Histograms for distributions (latency, response sizes).

3. **Prometheus pulls metrics from your app**. Your app exposes a `/metrics` endpoint, and Prometheus scrapes it on a schedule.

4. **django-prometheus gives you HTTP metrics for free**. Request rate, response codes, and latency histograms, all without custom code.

5. **Custom metrics cover business logic**. RSVP counts, cache hit rates, and queue depths require manual instrumentation, but the code is minimal.

6. **PromQL is essential**. Learn `rate()`, `histogram_quantile()`, `sum by ()`, and label filtering. These four concepts cover 90% of dashboard queries.

7. **Use RED for services, USE for resources**. Together, they ensure you are measuring the right things.

In the next lesson, you will complete the triad by setting up centralized log aggregation with Loki, connecting logs to traces via correlation IDs.

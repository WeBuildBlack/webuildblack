---
title: "Deployment Strategies"
estimatedMinutes: 40
---

# Deployment Strategies

You have a working Gather application. It is instrumented with OpenTelemetry, monitored with Grafana dashboards, and backed by incident runbooks. Your observability stack from Module 07 tells you when something is wrong.

But right now, deploying a new version of Gather means downtime. You stop the old containers, start the new ones, and hope nothing breaks. During that window (even if it is only 30 seconds), users see errors. RSVP submissions fail. Event pages return 502s. Organizers lose trust.

Zero-downtime deployment is not a luxury. It is a baseline requirement for any production application that real people depend on.

This lesson covers three deployment strategies: rolling deploys, blue-green deploys, and canary deploys. You will learn how each one works, what tradeoffs it carries, and when to choose it. By the end, you will have a concrete plan for deploying Gather without dropping a single request.

---

## The Problem with Stop-and-Start

Here is what a naive deployment looks like with Docker Compose:

```bash
# The "just restart it" deploy
docker compose down
docker compose pull
docker compose up -d
```

During `docker compose down`, every container stops. The database connections close. The Celery workers abandon their tasks mid-execution. The nginx reverse proxy has nothing to route to. Any request that arrives during this window gets a connection refused error.

Even if the downtime is short, the consequences compound:

- Users in the middle of submitting an RSVP lose their action with no feedback.
- Search engine crawlers that hit a 502 may temporarily deindex your pages.
- Webhook deliveries from Stripe or Slack fail, requiring manual reconciliation.
- Celery workers that die mid-task may leave data in an inconsistent state.

The goal of every strategy in this lesson is the same: deploy new code without ever having zero healthy instances serving traffic.

---

## Strategy 1: Rolling Deploys

A rolling deploy updates instances one at a time. You have multiple replicas of your application running behind a load balancer. The deploy process takes one instance out of rotation, updates it, verifies it is healthy, puts it back, and moves to the next.

### How It Works

```
Time 0: All instances running v1
┌──────────┐  ┌──────────┐  ┌──────────┐
│  App v1  │  │  App v1  │  │  App v1  │
│ (healthy)│  │ (healthy)│  │ (healthy)│
└──────────┘  └──────────┘  └──────────┘

Time 1: Instance 1 updating, traffic goes to 2 and 3
┌──────────┐  ┌──────────┐  ┌──────────┐
│  App v2  │  │  App v1  │  │  App v1  │
│(starting)│  │ (healthy)│  │ (healthy)│
└──────────┘  └──────────┘  └──────────┘

Time 2: Instance 1 healthy, instance 2 updating
┌──────────┐  ┌──────────┐  ┌──────────┐
│  App v2  │  │  App v2  │  │  App v1  │
│ (healthy)│  │(starting)│  │ (healthy)│
└──────────┘  └──────────┘  └──────────┘

Time 3: All instances running v2
┌──────────┐  ┌──────────┐  ┌──────────┐
│  App v2  │  │  App v2  │  │  App v2  │
│ (healthy)│  │ (healthy)│  │ (healthy)│
└──────────┘  └──────────┘  └──────────┘
```

### Implementing Rolling Deploys with Docker Compose

Docker Compose does not have built-in rolling deploy support, but you can simulate it by scaling and updating incrementally:

```yaml
# docker-compose.yml
services:
  django:
    build: ./backend
    command: gunicorn gather.wsgi:application --bind 0.0.0.0:8000 --workers 4
    deploy:
      replicas: 3
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health/"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - django
```

With `docker compose up -d --no-deps --build django`, Docker Compose recreates the Django containers. However, by default it stops all replicas and starts new ones, which still causes downtime. For true rolling behavior, you need an orchestrator like Kubernetes or Docker Swarm.

### Rolling Deploy with Docker Swarm

Docker Swarm has native rolling update support:

```yaml
# docker-compose.swarm.yml
services:
  django:
    image: gather-api:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1        # Update one container at a time
        delay: 30s             # Wait 30s between updates
        failure_action: rollback
        monitor: 60s           # Watch for 60s after update
        order: start-first     # Start new before stopping old
      rollback_config:
        parallelism: 0         # Roll back all at once
        order: stop-first
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health/"]
      interval: 10s
      timeout: 5s
      retries: 3
```

The key settings:

- **`parallelism: 1`** updates one instance at a time, keeping the others healthy.
- **`order: start-first`** starts the new version before stopping the old one, so capacity never drops.
- **`failure_action: rollback`** automatically reverts if the health check fails.
- **`monitor: 60s`** watches the new instance for a full minute before moving to the next.

### Tradeoffs

| Advantage | Disadvantage |
|-----------|--------------|
| Low resource overhead (no duplicate environment) | Both versions run simultaneously during rollout |
| Simple to understand and implement | Rollback is slow (must reverse the process) |
| Works well for stateless services | Database schema changes are tricky |
| Built into most orchestrators | Debugging is harder with mixed versions |

### When to Use Rolling Deploys

Rolling deploys work best for **stateless services that can tolerate version mixing**. If v1 and v2 of your API are compatible (same database schema, same API contracts), rolling deploys are the simplest path to zero downtime.

For Gather, rolling deploys are a good fit for **Celery workers**. Workers are stateless, they pull tasks from Redis, and you can run v1 and v2 workers side by side without conflict. The old workers finish their current tasks while new workers pick up new ones.

---

## Strategy 2: Blue-Green Deploys

A blue-green deploy maintains two identical environments. One (call it "blue") serves live traffic. The other ("green") sits idle or runs the previous version. To deploy, you push the new version to the idle environment, verify it works, and then switch the router to point at it.

### How It Works

```
Phase 1: Blue is live, green is idle
                    ┌──────────────┐
                    │    Router    │
                    │   (nginx)    │
                    └──────┬───────┘
                           │
              ┌────────────┴──── ─ ─ ─ ─ ─ ─ ┐
              │
              ▼                               ▼
       ┌──────────┐                    ┌──────────┐
       │  BLUE    │                    │  GREEN   │
       │  App v1  │                    │  (idle)  │
       │  (live)  │                    │          │
       └──────────┘                    └──────────┘

Phase 2: Deploy v2 to green, test it
                    ┌──────────────┐
                    │    Router    │
                    │   (nginx)    │
                    └──────┬───────┘
                           │
              ┌────────────┴──── ─ ─ ─ ─ ─ ─ ┐
              │
              ▼                               ▼
       ┌──────────┐                    ┌──────────┐
       │  BLUE    │                    │  GREEN   │
       │  App v1  │                    │  App v2  │
       │  (live)  │                    │ (testing)│
       └──────────┘                    └──────────┘

Phase 3: Switch traffic to green
                    ┌──────────────┐
                    │    Router    │
                    │   (nginx)    │
                    └──────┬───────┘
                           │
              ┌─ ─ ─ ─ ─ ─┴────────────────┐
                                            │
              ▼                             ▼
       ┌──────────┐                  ┌──────────┐
       │  BLUE    │                  │  GREEN   │
       │  App v1  │                  │  App v2  │
       │(standby) │                  │  (live)  │
       └──────────┘                  └──────────┘
```

### Implementing Blue-Green with Docker Compose and nginx

This is the approach you will implement in the project. Here is the architecture:

```yaml
# docker-compose.yml
services:
  django-blue:
    build: ./backend
    command: gunicorn gather.wsgi:application --bind 0.0.0.0:8000 --workers 4
    container_name: gather-blue
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health/"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
    environment:
      - DEPLOYMENT_COLOR=blue
    depends_on:
      db:
        condition: service_healthy

  django-green:
    build: ./backend
    command: gunicorn gather.wsgi:application --bind 0.0.0.0:8000 --workers 4
    container_name: gather-green
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health/"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
    environment:
      - DEPLOYMENT_COLOR=green
    depends_on:
      db:
        condition: service_healthy

  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
    depends_on:
      - django-blue
      - django-green
```

The nginx config uses an upstream that points to the active environment:

```nginx
# nginx/conf.d/gather.conf

# Active upstream (switch between blue and green)
upstream gather_backend {
    server gather-blue:8000;
}

# Standby upstream (for health checking the new deploy)
upstream gather_standby {
    server gather-green:8000;
}

server {
    listen 80;
    server_name gather.dev;

    location / {
        proxy_pass http://gather_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Internal endpoint to test the standby environment
    location /standby/ {
        internal;
        proxy_pass http://gather_standby;
    }
}
```

To switch traffic, you swap the upstream and reload nginx:

```bash
#!/bin/bash
# deploy.sh -- Blue-green deploy script

set -euo pipefail

CURRENT=$(grep "server gather-" nginx/conf.d/gather.conf | head -1 | grep -o 'blue\|green')

if [ "$CURRENT" = "blue" ]; then
    NEW="green"
else
    NEW="blue"
fi

echo "Current: $CURRENT, deploying to: $NEW"

# Step 1: Build and start the new environment
docker compose build "django-$NEW"
docker compose up -d "django-$NEW"

# Step 2: Wait for health check
echo "Waiting for django-$NEW to become healthy..."
for i in $(seq 1 30); do
    if docker inspect --format='{{.State.Health.Status}}' "gather-$NEW" 2>/dev/null | grep -q "healthy"; then
        echo "django-$NEW is healthy"
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo "ERROR: django-$NEW failed health check. Aborting."
        docker compose stop "django-$NEW"
        exit 1
    fi
    sleep 2
done

# Step 3: Switch nginx upstream
sed -i "s/server gather-$CURRENT:8000/server gather-$NEW:8000/" nginx/conf.d/gather.conf
docker compose exec nginx nginx -s reload

echo "Traffic switched to $NEW"

# Step 4: Stop the old environment (optional, keep for quick rollback)
# docker compose stop "django-$CURRENT"
echo "Keeping $CURRENT running for rollback. Run: docker compose stop django-$CURRENT"
```

### Rollback

Rollback with blue-green is instant. You already have the previous version running. Just switch the nginx upstream back:

```bash
#!/bin/bash
# rollback.sh

CURRENT=$(grep "server gather-" nginx/conf.d/gather.conf | head -1 | grep -o 'blue\|green')

if [ "$CURRENT" = "blue" ]; then
    ROLLBACK="green"
else
    ROLLBACK="blue"
fi

# Verify rollback target is still running
if ! docker inspect --format='{{.State.Health.Status}}' "gather-$ROLLBACK" 2>/dev/null | grep -q "healthy"; then
    echo "ERROR: gather-$ROLLBACK is not healthy. Cannot roll back."
    exit 1
fi

sed -i "s/server gather-$CURRENT:8000/server gather-$ROLLBACK:8000/" nginx/conf.d/gather.conf
docker compose exec nginx nginx -s reload

echo "Rolled back from $CURRENT to $ROLLBACK"
```

### Tradeoffs

| Advantage | Disadvantage |
|-----------|--------------|
| Instant rollback (old version still running) | Double the infrastructure resources |
| Full testing before traffic switch | Database must be compatible with both versions |
| Clean separation (no version mixing) | More complex setup than rolling deploys |
| Simple mental model | Idle environment is wasted capacity |

### When to Use Blue-Green Deploys

Blue-green is ideal for **critical, user-facing services where rollback speed matters**. For Gather, the Django API is the right candidate. If a deploy introduces a bug in the RSVP flow, you need to roll back in seconds, not minutes.

Blue-green does require both versions to be compatible with the same database schema. This means database migrations need careful planning, which we will cover next.

---

## Strategy 3: Canary Deploys

A canary deploy routes a small percentage of traffic to the new version while the majority continues hitting the old version. You monitor error rates and performance. If the canary looks healthy, you gradually increase the percentage. If it looks bad, you route 100% back to the old version.

### How It Works

```
Phase 1: 5% canary
                    ┌──────────────┐
                    │    Router    │
                    │  (95% / 5%) │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              │ 95%                5%   │
              ▼                         ▼
       ┌──────────┐              ┌──────────┐
       │  App v1  │              │  App v2  │
       │  (main)  │              │ (canary) │
       └──────────┘              └──────────┘

Phase 2: Metrics look good, increase to 25%
Phase 3: Still good, increase to 50%
Phase 4: Looks great, promote to 100%
```

### Implementing Canary with nginx

nginx supports weighted upstreams, which makes canary routing straightforward:

```nginx
# nginx/conf.d/gather-canary.conf

upstream gather_main {
    server gather-blue:8000 weight=95;
    server gather-green:8000 weight=5;
}

server {
    listen 80;
    server_name gather.dev;

    location / {
        proxy_pass http://gather_main;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

A more sophisticated approach uses a header or cookie to make canary routing sticky (so the same user always hits the same version during a session):

```nginx
upstream gather_stable {
    server gather-blue:8000;
}

upstream gather_canary {
    server gather-green:8000;
}

split_clients "${remote_addr}${uri}" $upstream_variant {
    5%     "canary";
    *      "stable";
}

map $upstream_variant $backend {
    "canary"  gather_canary;
    default   gather_stable;
}

server {
    listen 80;
    server_name gather.dev;

    location / {
        proxy_pass http://$backend;
        proxy_set_header Host $host;
        proxy_set_header X-Deployment-Variant $upstream_variant;
    }
}
```

The `X-Deployment-Variant` header lets your Django app and your monitoring tools know which version served each request. This is essential for comparing error rates between the canary and stable versions.

### Monitoring the Canary

A canary is only useful if you watch it. You need to compare metrics between the two versions in real time. From Module 07, you already have Prometheus and Grafana set up. Add a label for the deployment variant:

```python
# gather/middleware.py

import os
from prometheus_client import Counter, Histogram

DEPLOYMENT_COLOR = os.environ.get("DEPLOYMENT_COLOR", "unknown")

http_requests = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status", "deployment"],
)

http_duration = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration",
    ["method", "endpoint", "deployment"],
)


class DeploymentMetricsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        import time

        start = time.time()
        response = self.get_response(request)
        duration = time.time() - start

        endpoint = self._normalize_path(request.path)

        http_requests.labels(
            method=request.method,
            endpoint=endpoint,
            status=response.status_code,
            deployment=DEPLOYMENT_COLOR,
        ).inc()

        http_duration.labels(
            method=request.method,
            endpoint=endpoint,
            deployment=DEPLOYMENT_COLOR,
        ).observe(duration)

        return response

    def _normalize_path(self, path):
        """Collapse IDs to prevent high-cardinality labels."""
        import re
        return re.sub(r"/\d+", "/:id", path)
```

In Grafana, you can then build a dashboard panel that compares the error rate of the canary vs. the stable version:

```promql
# Error rate for canary
sum(rate(http_requests_total{deployment="green", status=~"5.."}[5m]))
/
sum(rate(http_requests_total{deployment="green"}[5m]))

# Error rate for stable
sum(rate(http_requests_total{deployment="blue", status=~"5.."}[5m]))
/
sum(rate(http_requests_total{deployment="blue"}[5m]))
```

If the canary error rate is significantly higher than stable, you pull the canary and investigate.

### Tradeoffs

| Advantage | Disadvantage |
|-----------|--------------|
| Lowest risk (only small % of users affected) | Most complex to set up and monitor |
| Real production traffic validates the deploy | Requires good observability (you already have it) |
| Gradual rollout catches issues early | Both versions run simultaneously |
| Data-driven deployment decisions | Needs enough traffic for statistical significance |

### When to Use Canary Deploys

Canary deploys are best for **high-traffic applications where you want statistical confidence** before a full rollout. If Gather serves 10,000 requests per minute, a 5% canary gives you 500 requests per minute to evaluate. That is enough to detect a spike in 500 errors within a few minutes.

For smaller applications, canary deploys may not provide enough traffic to the new version to detect problems quickly. In that case, blue-green is simpler and equally effective.

---

## Database Migrations and Deployment Compatibility

Every strategy above has the same requirement: during the deploy, both the old and new version of your code must work with the same database schema. This is called **backward-compatible migrations**, and ignoring it is the most common cause of deployment failures.

### The Problem

Suppose you rename a column:

```python
# migrations/0042_rename_event_date.py
class Migration(migrations.Migration):
    operations = [
        migrations.RenameField(
            model_name="event",
            old_name="event_date",
            new_name="starts_at",
        ),
    ]
```

If you run this migration before deploying the new code, the old code (which references `event_date`) immediately starts throwing errors. If you deploy the new code before running the migration, the new code (which references `starts_at`) throws errors.

### The Expand-and-Contract Pattern

The solution is to split breaking changes into multiple deploys:

**Deploy 1: Expand.** Add the new column alongside the old one. Backfill data. Update code to write to both columns but read from the old one.

```python
# migrations/0042_add_starts_at.py
class Migration(migrations.Migration):
    operations = [
        migrations.AddField(
            model_name="event",
            name="starts_at",
            field=models.DateTimeField(null=True),
        ),
    ]
```

```python
# models.py (Deploy 1 version)
class Event(models.Model):
    event_date = models.DateTimeField()  # Old column, still primary
    starts_at = models.DateTimeField(null=True)  # New column, being populated

    def save(self, *args, **kwargs):
        # Write to both columns
        if self.starts_at is None:
            self.starts_at = self.event_date
        super().save(*args, **kwargs)
```

**Deploy 2: Migrate.** Run a data migration to backfill all existing rows. Update code to read from the new column.

```python
# migrations/0043_backfill_starts_at.py
from django.db import migrations


def backfill(apps, schema_editor):
    Event = apps.get_model("events", "Event")
    Event.objects.filter(starts_at__isnull=True).update(starts_at=models.F("event_date"))


class Migration(migrations.Migration):
    operations = [
        migrations.RunPython(backfill, migrations.RunPython.noop),
    ]
```

**Deploy 3: Contract.** Remove the old column. Code only references the new column.

```python
# migrations/0044_remove_event_date.py
class Migration(migrations.Migration):
    operations = [
        migrations.RemoveField(
            model_name="event",
            name="event_date",
        ),
    ]
```

This is more work than a single rename, but it means every deploy is safe. The old code and the new code can both run against the same database at any point during the process.

### Rules for Safe Migrations

1. **Never rename columns in a single step.** Use expand-and-contract.
2. **Never remove columns that running code still references.**
3. **Always add new columns as nullable** (or with a default value).
4. **Run migrations before deploying new code** when adding columns.
5. **Run migrations after deploying new code** when removing columns.
6. **Test migrations against a copy of production data** before applying them.

---

## Choosing a Strategy for Gather

Here is the deployment plan for Gather's services:

| Service | Strategy | Why |
|---------|----------|-----|
| Django API | Blue-green | User-facing, needs instant rollback |
| Celery workers | Rolling | Stateless, can mix versions safely |
| Next.js frontend | Blue-green or platform-managed | Vercel/Netlify handle this automatically |
| Database migrations | Expand-and-contract | Required for any zero-downtime strategy |
| nginx | In-place reload | `nginx -s reload` is graceful, no downtime |

In the module project, you will implement blue-green deploys for the Django API and rolling deploys for Celery workers. You will also practice the expand-and-contract pattern for a database migration.

---

## Key Takeaways

- Stop-and-start deploys cause downtime, even if it is brief. Users notice.
- Rolling deploys update instances one at a time. Simple but slow to roll back, and both versions run simultaneously.
- Blue-green deploys maintain two environments and switch traffic instantly. Fast rollback, but double the resources.
- Canary deploys route a small percentage of traffic to the new version. Lowest risk, but requires good observability and enough traffic.
- Database migrations must be backward-compatible for any zero-downtime strategy. Use the expand-and-contract pattern for breaking schema changes.
- For Gather: blue-green for the Django API, rolling for Celery workers, expand-and-contract for migrations.

Next, you will learn how to decouple deployment from release using feature flags.

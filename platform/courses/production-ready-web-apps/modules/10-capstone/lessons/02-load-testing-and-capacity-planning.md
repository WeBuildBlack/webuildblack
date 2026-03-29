---
title: "Load Testing and Capacity Planning"
estimatedMinutes: 45
---

# Load Testing and Capacity Planning

You think your app is fast. Your local tests pass. Your staging environment looks good. But you've never actually proven it can handle real traffic. That's what load testing is for.

Load testing answers the questions that no amount of code review can: How many users can this system actually handle? Where does it break first? What does degradation look like? These aren't theoretical concerns. They're the difference between a confident launch and a 3am incident.

In this lesson, you'll learn how to use Locust (a Python-based load testing framework) to simulate realistic user behavior against your Gather instance, interpret the results, and use those numbers to plan capacity for production.

## Why Load Testing Matters Before Launch

Every system has a breaking point. The goal of load testing isn't to prevent that breaking point from existing. It's to know exactly where it is so you can make informed decisions.

Without load testing, you're guessing. "I think it can handle 1,000 users" is not the same as "I've proven it handles 1,000 concurrent users with p95 response times under 500ms and zero errors." One is hope. The other is engineering.

Load testing gives you three critical pieces of information:

1. **Maximum throughput**: How many requests per second can your system handle before errors start?
2. **Latency under load**: Response times at 10% capacity vs 50% vs 90%. The shape of this curve tells you a lot about your bottlenecks.
3. **Failure mode**: When the system breaks, how does it break? Does it return errors gracefully, or does it crash and take the database with it?

### Types of Load Tests

**Smoke test**: A minimal load (5-10 users) to verify the test scripts work and the system responds correctly. Run this first.

**Load test**: The target load you expect in production (e.g., 500 concurrent users). Run this for 10-15 minutes to check for stability.

**Stress test**: Push beyond your target (e.g., 2x or 3x expected load) to find the breaking point. This tells you your safety margin.

**Soak test**: Run at normal load for an extended period (1-4 hours). This catches memory leaks, connection pool exhaustion, and other problems that only appear over time.

## Locust: Python-Based Load Testing

We're using Locust for load testing because it's written in Python (which you already know from Django), its test scripts are plain Python code (not XML or YAML configuration), and it has a web UI for monitoring tests in real time.

### Installation

```bash
pip install locust
```

### Your First Locust Test

A Locust test defines simulated users as Python classes. Each user class describes the behavior of one type of user:

```python
# locustfile.py
from locust import HttpUser, task, between

class GatherUser(HttpUser):
    # Wait 1-3 seconds between tasks (simulates think time)
    wait_time = between(1, 3)

    @task(3)  # Weight: 3x more likely than weight-1 tasks
    def browse_events(self):
        self.client.get("/api/events/")

    @task(1)
    def view_event_detail(self):
        self.client.get("/api/events/1/")
```

The `@task` decorator marks methods as user actions. The number in parentheses is the weight. In this example, users browse the event list three times for every one time they view a detail page. The `wait_time` simulates real human behavior. Real users don't click a link, get the response, and immediately click the next one. They read, scroll, and think.

### Running Locust

```bash
# Start with the web UI
locust -f locustfile.py --host=http://localhost:8000

# Or run headless (good for CI/CD)
locust -f locustfile.py --host=http://localhost:8000 \
  --headless \
  --users 100 \
  --spawn-rate 10 \
  --run-time 5m \
  --html report.html
```

The `--spawn-rate` controls how quickly users are added. A spawn rate of 10 means 10 new users per second. With 100 target users and a spawn rate of 10, it takes 10 seconds to reach full load. This ramp-up period is important because it lets you see how the system behaves as load increases.

The web UI (default: http://localhost:8089) shows live charts of:
- Total requests per second
- Response time percentiles (median, p95, p99)
- Number of active users
- Failure count and failure rate

## Writing Realistic Locust Test Scripts

A load test is only as good as its simulation. If your test just hammers one endpoint with GET requests, you'll learn how fast that one endpoint is, but you won't learn how your system behaves under realistic conditions.

### User Behavior Modeling

Real Gather users don't all do the same thing. Some browse. Some RSVP. Some upload images. A realistic test models this distribution:

```python
from locust import HttpUser, task, between, events
import json
import random
import os


class GatherBrowser(HttpUser):
    """
    Simulates a casual user who mostly browses events.
    70% of users fall into this category.
    """
    weight = 7  # 70% of spawned users will be browsers
    wait_time = between(2, 5)

    def on_start(self):
        """Called when a simulated user starts. Log in."""
        self.client.post("/api/auth/login/", json={
            "email": f"loadtest-browser-{self.environment.runner.user_count}@test.com",
            "password": "testpassword123"
        })
        # Fetch event IDs to use in subsequent requests
        response = self.client.get("/api/events/?limit=50")
        if response.status_code == 200:
            data = response.json()
            self.event_ids = [e["id"] for e in data.get("results", [])]
        else:
            self.event_ids = list(range(1, 51))

    @task(5)
    def browse_event_list(self):
        """Browse paginated event listings."""
        page = random.randint(1, 10)
        self.client.get(f"/api/events/?page={page}&page_size=20",
                       name="/api/events/?page=[N]")

    @task(3)
    def view_event_detail(self):
        """View a specific event's detail page."""
        if self.event_ids:
            event_id = random.choice(self.event_ids)
            self.client.get(f"/api/events/{event_id}/",
                           name="/api/events/[id]/")

    @task(1)
    def search_events(self):
        """Search for events by keyword."""
        keywords = ["python", "javascript", "react", "django", "community"]
        keyword = random.choice(keywords)
        self.client.get(f"/api/events/?search={keyword}",
                       name="/api/events/?search=[kw]")


class GatherActiveUser(HttpUser):
    """
    Simulates an active user who browses and RSVPs.
    25% of users fall into this category.
    """
    weight = 25  # 25% of spawned users
    wait_time = between(1, 3)

    def on_start(self):
        response = self.client.post("/api/auth/login/", json={
            "email": f"loadtest-active-{self.environment.runner.user_count}@test.com",
            "password": "testpassword123"
        })
        response = self.client.get("/api/events/?limit=50")
        if response.status_code == 200:
            data = response.json()
            self.event_ids = [e["id"] for e in data.get("results", [])]
        else:
            self.event_ids = list(range(1, 51))

    @task(4)
    def browse_events(self):
        page = random.randint(1, 5)
        self.client.get(f"/api/events/?page={page}",
                       name="/api/events/?page=[N]")

    @task(3)
    def view_event_detail(self):
        if self.event_ids:
            event_id = random.choice(self.event_ids)
            self.client.get(f"/api/events/{event_id}/",
                           name="/api/events/[id]/")

    @task(2)
    def rsvp_to_event(self):
        """RSVP to a random event (write operation)."""
        if self.event_ids:
            event_id = random.choice(self.event_ids)
            self.client.post(f"/api/events/{event_id}/rsvp/",
                            name="/api/events/[id]/rsvp/")

    @task(1)
    def view_my_rsvps(self):
        self.client.get("/api/users/me/rsvps/")


class GatherOrganizer(HttpUser):
    """
    Simulates an event organizer who uploads images.
    5% of users fall into this category.
    """
    weight = 5  # 5% of spawned users
    wait_time = between(3, 8)

    def on_start(self):
        self.client.post("/api/auth/login/", json={
            "email": f"loadtest-organizer-{self.environment.runner.user_count}@test.com",
            "password": "testpassword123"
        })

    @task(3)
    def browse_own_events(self):
        self.client.get("/api/users/me/events/")

    @task(2)
    def view_event_analytics(self):
        self.client.get("/api/events/1/analytics/",
                       name="/api/events/[id]/analytics/")

    @task(1)
    def upload_event_image(self):
        """
        Request a presigned upload URL and simulate an image upload.
        The actual upload goes to S3, not your application server.
        """
        # Step 1: Get presigned URL from your API
        response = self.client.post("/api/uploads/presigned-url/", json={
            "filename": "event-banner.jpg",
            "content_type": "image/jpeg"
        })

        if response.status_code == 200:
            # Step 2: In production, the browser uploads directly to S3.
            # In load testing, we just verify the presigned URL was generated.
            # Actually uploading to S3 would test S3, not your app.
            pass
```

### Key Patterns in Realistic Tests

**The `name` parameter**: Notice the `name="/api/events/[id]/"` in the requests. Without this, Locust would track every unique URL separately (`/api/events/1/`, `/api/events/2/`, etc.). The `name` parameter groups them into one entry in the results.

**The `on_start` method**: Runs once when a simulated user starts. Use it for authentication, fetching test data, and other setup that real users do once per session.

**User weights**: The `weight` attribute on each user class controls the proportion of each type. In our example, 70% browsers, 25% active users, 5% organizers. This should match your real traffic distribution.

**Think time**: The `wait_time = between(1, 3)` adds a random delay between 1 and 3 seconds between tasks. Real users don't fire requests as fast as possible. Without think time, you're testing a DDoS scenario, not a realistic workload.

## Ramping Up Users

How you increase load matters. A sudden spike of 1,000 users is a different test than a gradual ramp to 1,000 users. Both are useful, but they test different things.

### Gradual Ramp (Finding Capacity)

```python
# In your Locust config or command line:
# --users 1000 --spawn-rate 50
# This adds 50 users per second, reaching 1000 in 20 seconds
```

A gradual ramp lets you watch the response time curve as load increases. You'll typically see a pattern like this:

```
Users:   0-200    Response Time: 30ms (flat, system is comfortable)
Users: 200-500    Response Time: 80ms (rising, starting to feel it)
Users: 500-800    Response Time: 300ms (climbing fast, approaching limit)
Users: 800-1000   Response Time: 1200ms (degraded, errors starting)
Users: 1000+      Response Time: timeouts (system is overwhelmed)
```

The "knee" of this curve (where response times start climbing sharply) is your practical capacity limit. In this example, it's around 500 users. That doesn't mean you can't serve 800, but you should plan for 500 if you want consistent sub-second response times.

### Step Load (Finding Breaking Points)

Locust supports custom load shapes for more controlled ramp patterns:

```python
from locust import LoadTestShape

class StepLoadShape(LoadTestShape):
    """
    Step load: increase users in steps of 100 every 2 minutes.
    Hold each level to get stable measurements.
    """
    step_time = 120    # seconds per step
    step_load = 100    # users added per step
    spawn_rate = 20    # users spawned per second during ramp
    time_limit = 1200  # total test duration (20 minutes)

    def tick(self):
        run_time = self.get_run_time()

        if run_time > self.time_limit:
            return None  # Stop the test

        current_step = run_time // self.step_time
        target_users = (current_step + 1) * self.step_load

        return (target_users, self.spawn_rate)
```

Step loading is excellent for identifying exactly which step causes degradation. If performance is fine at 400 users but degrades at 500, you know your capacity boundary.

## Reading Locust Results

Locust generates a wealth of data. Here's how to interpret the key metrics:

### Requests Per Second (RPS)

This is your throughput. Higher is better, but only if response times and error rates stay healthy. Watch for RPS plateauing while you're still adding users. That's a sign your system has hit a bottleneck.

```
If you're targeting 1,000 concurrent users with 1-3 second think time:
  Expected RPS = 1,000 users / 2 seconds average think time = 500 RPS

If your system maxes out at 300 RPS, you can only support about 600 users.
```

### Response Time Percentiles

The average response time is almost useless. What matters are the percentiles:

- **Median (p50)**: Half of requests are faster than this. This is your "typical" user experience.
- **p95**: 95% of requests are faster than this. This is the experience for most users.
- **p99**: 99% of requests are faster than this. This catches outliers.

Why percentiles matter more than averages:

```
Scenario A: All requests take 100ms
  Average: 100ms, p95: 100ms, p99: 100ms

Scenario B: 95% of requests take 50ms, 5% take 1,050ms
  Average: 100ms, p95: 1,050ms, p99: 1,050ms

Same average. Completely different user experience.
Scenario B has 1 in 20 users waiting over a second.
```

For Gather, your performance targets should be:

| Endpoint | p95 Target | p99 Target |
|---|---|---|
| Event listing (cached) | < 100ms | < 200ms |
| Event listing (uncached) | < 500ms | < 1s |
| Event detail | < 200ms | < 500ms |
| RSVP creation | < 500ms | < 1s |
| Image upload URL | < 200ms | < 500ms |

### Failure Rate

Any error rate above 0.1% during normal load is a problem. Common failure modes:

- **Connection refused**: Your app can't accept more connections. Check PgBouncer pool size and Gunicorn worker count.
- **Timeout (no response)**: Requests are taking too long. Check for slow queries, lock contention, or resource exhaustion.
- **500 Internal Server Error**: Application code is crashing under load. Check logs for the specific exception.
- **429 Too Many Requests**: Rate limiting is kicking in. This might be intentional (protecting the system) or misconfigured (blocking legitimate traffic).

### Locust HTML Report

Running Locust with `--html report.html` generates a standalone report with:

- Request statistics table (min, max, median, p95, p99 for each endpoint)
- Response time distribution charts
- Requests per second over time
- Failure rate over time
- Number of concurrent users over time

Save these reports. They're your evidence that the system meets its performance targets.

## Capacity Planning

Load testing tells you what your system can do right now. Capacity planning tells you what you need for the future.

### The Formula

```
Required instances = (Target RPS / RPS per instance) * Safety factor

Example:
  Target: 1,000 concurrent users = ~500 RPS
  Your load test shows 1 Django instance handles 200 RPS
  Minimum instances = 500 / 200 = 2.5 -> round up to 3

  Apply safety factor of 1.5 (for traffic spikes):
  Recommended instances = 3 * 1.5 = 4.5 -> round up to 5
```

### What to Scale

Not everything scales the same way. Here's a guide based on what you've built in this course:

**Scales horizontally (add more instances)**:
- Django API servers (stateless, behind load balancer)
- Celery workers (independent, pull from shared queue)
- Next.js frontend servers (stateless)

**Scales vertically (bigger instance)**:
- PostgreSQL primary (more CPU, RAM, IOPS)
- Redis (more memory for larger cache)

**Doesn't need to scale (managed services)**:
- S3 (effectively infinite)
- CDN (CloudFront scales automatically)
- Load balancer (ALB scales automatically)

### Database Capacity Planning

The database is almost always the bottleneck. Here's how to plan:

```
PostgreSQL connection math:
  PgBouncer pool size: 20 connections to PostgreSQL
  Each connection can handle ~100 simple queries/second
  Total capacity: 20 * 100 = 2,000 queries/second

  With caching (80% cache hit rate from Module 04):
  Database queries = 500 RPS * 0.20 = 100 queries/second
  That's well within our 2,000 QPS capacity.

  Without caching:
  Database queries = 500 RPS = 500 queries/second
  Still within capacity, but you'd want to add read replicas
  for complex queries (search, analytics).
```

### Redis Capacity Planning

```
Redis memory math:
  Cached event listings: 10 pages * 50 KB = 500 KB
  Cached event details: 1,000 events * 5 KB = 5 MB
  Session data: 10,000 sessions * 1 KB = 10 MB
  Total: ~16 MB (Redis can handle hundreds of MB easily)

Redis throughput:
  Single Redis instance: 100,000+ operations/second
  Your load: ~1,000 cache operations/second
  Redis is not your bottleneck.
```

### Celery Worker Planning

```
Celery throughput math:
  RSVP rate at peak: 100 RSVPs/second
  Each RSVP triggers 2 tasks (email + notification)
  Task throughput needed: 200 tasks/second

  Each Celery worker handles ~10 tasks/second
  (assuming 100ms average task duration)
  Workers needed: 200 / 10 = 20 workers

  With 4 workers per instance: 20 / 4 = 5 Celery instances
```

## Applying This to Gather

Let's design a complete load test scenario for Gather that you'll implement in the project:

### Test Environment Setup

1. **Seed your database** with realistic data: 10,000 events, 200,000 RSVPs, 5,000 users
2. **Prime your cache** by warming Redis with the most common queries
3. **Configure monitoring** so you can watch Grafana dashboards during the test
4. **Isolate the environment** so other traffic doesn't affect results

### Test Scenario

```
Phase 1 (0-2 min):   Ramp to 200 users   -- smoke test
Phase 2 (2-5 min):   Hold at 200          -- baseline measurements
Phase 3 (5-7 min):   Ramp to 500 users    -- moderate load
Phase 4 (7-10 min):  Hold at 500          -- sustained load measurements
Phase 5 (10-12 min): Ramp to 1,000 users  -- target load
Phase 6 (12-17 min): Hold at 1,000        -- target load measurements
Phase 7 (17-19 min): Ramp to 1,500 users  -- stress test
Phase 8 (19-22 min): Hold at 1,500        -- find the breaking point
Phase 9 (22-25 min): Ramp down to 0       -- recovery test
```

### What to Measure During the Test

While Locust runs, monitor these in Grafana (your Module 07 dashboards):

- **Application metrics**: Request rate, response time percentiles, error rate
- **Database metrics**: Active connections, query duration, transactions/second
- **Redis metrics**: Hit rate, memory usage, connected clients
- **Celery metrics**: Queue depth, task success/failure rate, processing time
- **System metrics**: CPU usage, memory usage, disk I/O per container

### Pass/Fail Criteria

Define these before you run the test, not after:

| Metric | Target | Measured |
|---|---|---|
| Event listing p95 | < 500ms | ___ ms |
| RSVP creation p95 | < 1,000ms | ___ ms |
| Error rate at 1,000 users | < 0.1% | ___ % |
| RPS at 1,000 users | > 400 | ___ RPS |
| Database connections | < 80% pool | ___ / ___ |
| Redis cache hit rate | > 80% | ___ % |

If any metric misses its target, you have a specific area to investigate and optimize. That's the power of load testing: it turns "it's slow" into "event listing queries exceed p95 target at 700 concurrent users because the search endpoint bypasses the cache."

## Key Takeaways

1. **Load test before launch, not after**. Finding bottlenecks in staging is cheap. Finding them in production costs users and revenue.
2. **Model realistic behavior**. A load test that only hits one endpoint is not a load test. It's a benchmark.
3. **Percentiles over averages**. p95 and p99 tell you about your worst-case users. Averages hide problems.
4. **Capacity planning is math**. Measure throughput per instance, divide by your target, add a safety factor.
5. **Save your reports**. Load test results are documentation. They prove your system meets its targets and give you a baseline for future comparisons.

In the project, you'll build a complete Locust test suite, run it against your Gather instance, and prove your system is production-ready.

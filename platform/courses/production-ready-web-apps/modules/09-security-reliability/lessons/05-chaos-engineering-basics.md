---
title: "Chaos Engineering Basics"
estimatedMinutes: 35
---

# Chaos Engineering Basics

You've built circuit breakers. You've set up backups. You've written fallback strategies. You believe your system handles failure gracefully.

But do you know it does?

There's a gap between "we designed for failure" and "we've proven it works under failure." Chaos engineering closes that gap. Instead of waiting for production to surprise you, you deliberately inject failures in a controlled environment and observe what happens.

## Why Break Things on Purpose

Every distributed system has failure modes. Some you've thought about (email service goes down), and some you haven't (Redis connection pool exhausted, DNS resolution hangs for 30 seconds, disk fills up silently). The failures you haven't thought about are the ones that cause incidents.

Chaos engineering works because it shifts failure discovery from reactive to proactive. You find the bugs in your error handling before your users do.

### The Netflix Origin Story

Netflix pioneered this practice with Chaos Monkey, a tool that randomly terminates virtual machines in production. Their reasoning: AWS instances fail all the time, so Netflix services should handle instance loss gracefully. By killing instances constantly, they forced every team to build resilient services.

You don't need to operate at Netflix scale to benefit from this thinking. Even a small application like Gather has dependencies that can fail, and testing that failure handling works is more valuable than assuming it does.

## Principles of Chaos Engineering

The Principles of Chaos Engineering (published by Netflix) describe a scientific approach:

### 1. Start with a Hypothesis

Before injecting any failure, define what you expect to happen. "When Redis is unavailable, RSVP creation should still succeed, but the response will not include real-time attendee counts."

Without a hypothesis, you're just breaking things. With a hypothesis, you're running an experiment.

### 2. Define Steady State

What does "working correctly" look like for your system? Define measurable metrics:

- RSVP endpoint responds in under 200ms at p95
- Event listing page returns 200 status codes
- Background tasks are processed within 5 minutes
- Error rate stays below 1%

These are your steady-state metrics. The chaos experiment measures whether they hold under failure conditions.

### 3. Introduce Realistic Failures

Inject failures that actually happen in production:

- Network latency between services (50ms to 2000ms)
- Service unavailability (connection refused)
- Slow responses (10-second timeout)
- Packet loss (5% to 50%)
- DNS resolution failures
- Disk full
- Memory pressure

Do not inject unrealistic failures like "all servers crash simultaneously" unless you're specifically testing for that scenario.

### 4. Minimize Blast Radius

Start small. Run experiments in a staging environment first. When you move to production (eventually), affect a small percentage of traffic. Always have a way to stop the experiment immediately.

### 5. Run Experiments Continuously

A single chaos test proves your system is resilient right now. Systems change. Dependencies change. Run chaos experiments regularly (weekly or as part of CI) to catch regressions.

## Toxiproxy: Simulating Network Failures

Toxiproxy is a TCP proxy that sits between your application and its dependencies. It lets you add "toxics" (latency, timeouts, data corruption) to the connection without modifying your application code.

```
Application → Toxiproxy (port 6380) → Redis (port 6379)
```

Instead of connecting directly to Redis on port 6379, your application connects to Toxiproxy on port 6380. Toxiproxy forwards traffic to the real Redis, but you can add toxics at any time to simulate failure conditions.

### Setting Up Toxiproxy

Add Toxiproxy to Docker Compose:

```yaml
# docker-compose.chaos.yml

services:
  toxiproxy:
    image: ghcr.io/shopify/toxiproxy:latest
    ports:
      - "8474:8474"      # Toxiproxy API
      - "16379:16379"    # Proxied Redis
      - "15432:15432"    # Proxied PostgreSQL
      - "18025:18025"    # Proxied email (SMTP)
    depends_on:
      - redis
      - db
```

### Configuring Proxies

After Toxiproxy starts, create proxies using its API or CLI:

```bash
# Create a proxy for Redis
curl -X POST http://localhost:8474/proxies \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "redis",
    "listen": "0.0.0.0:16379",
    "upstream": "redis:6379"
  }'

# Create a proxy for PostgreSQL
curl -X POST http://localhost:8474/proxies \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "postgres",
    "listen": "0.0.0.0:15432",
    "upstream": "db:5432"
  }'
```

Configure your application to connect through the proxies:

```python
# gather/settings/chaos.py (extends base settings)

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://toxiproxy:16379/0',  # Through Toxiproxy
    },
}

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'HOST': 'toxiproxy',
        'PORT': '15432',  # Through Toxiproxy
        'NAME': 'gather',
        'USER': 'gather',
        'PASSWORD': 'gather',
    },
}
```

### Adding Toxics

Now you can inject failures without touching your application:

```bash
# Add 500ms latency to Redis
curl -X POST http://localhost:8474/proxies/redis/toxics \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "latency",
    "type": "latency",
    "attributes": {"latency": 500, "jitter": 100}
  }'

# Simulate Redis being completely down (100% of connections reset)
curl -X POST http://localhost:8474/proxies/redis/toxics \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "down",
    "type": "reset_peer",
    "attributes": {"timeout": 0}
  }'

# Add 5% packet loss to PostgreSQL connections
curl -X POST http://localhost:8474/proxies/postgres/toxics \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "packet_loss",
    "type": "limit_data",
    "attributes": {"bytes": 0},
    "toxicity": 0.05
  }'

# Simulate a slow database (2 second latency)
curl -X POST http://localhost:8474/proxies/postgres/toxics \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "slow_db",
    "type": "latency",
    "attributes": {"latency": 2000, "jitter": 500}
  }'
```

### Removing Toxics

When the experiment is over, remove the toxics:

```bash
# Remove a specific toxic
curl -X DELETE http://localhost:8474/proxies/redis/toxics/latency

# Remove all toxics from a proxy by resetting it
curl -X POST http://localhost:8474/reset
```

### Toxiproxy Python Client

For more structured experiments, use the Python client:

```python
# chaos/experiments.py

import toxiproxy
from toxiproxy.api import Toxiproxy

proxy_api = Toxiproxy(host='localhost', port=8474)


def simulate_redis_failure():
    """Simulate complete Redis failure."""
    redis_proxy = proxy_api.get_proxy('redis')

    # Disable the proxy entirely
    redis_proxy.disable()

    print("Redis proxy disabled. Redis is now unreachable.")
    print("Run your tests, then call restore_redis()")


def restore_redis():
    """Restore Redis connectivity."""
    redis_proxy = proxy_api.get_proxy('redis')
    redis_proxy.enable()
    print("Redis proxy re-enabled.")


def simulate_slow_redis(latency_ms=1000):
    """Add latency to Redis connections."""
    redis_proxy = proxy_api.get_proxy('redis')
    redis_proxy.add_toxic(
        name='slow',
        type='latency',
        attributes={'latency': latency_ms, 'jitter': latency_ms // 10},
    )
    print(f"Added {latency_ms}ms latency to Redis.")


def simulate_database_timeout():
    """Simulate database connection timeouts."""
    pg_proxy = proxy_api.get_proxy('postgres')
    pg_proxy.add_toxic(
        name='timeout',
        type='timeout',
        attributes={'timeout': 5000},  # 5 second timeout
    )
    print("Database connections will now timeout after 5 seconds.")
```

## Running a Chaos Experiment

Let's walk through a complete experiment for Gather: verifying that Redis failure doesn't break RSVP creation.

### Hypothesis

"When Redis is unavailable, users can still RSVP to events. Caching and real-time features will be degraded, but the core RSVP flow (create RSVP, queue confirmation email) will continue to work using the database as a fallback."

### Steady State

- RSVP endpoint returns 201 within 200ms (p95)
- Event detail page loads in under 500ms
- Error rate below 1%

### Experiment Script

```python
# chaos/test_redis_failure.py

import time
import requests
import statistics

API_BASE = 'http://localhost:8000/api'
TOXIPROXY_API = 'http://localhost:8474'


def measure_rsvp_creation(event_id, token, num_requests=20):
    """Measure RSVP endpoint performance."""
    latencies = []
    errors = 0

    for i in range(num_requests):
        start = time.time()
        try:
            response = requests.post(
                f'{API_BASE}/events/{event_id}/rsvp/',
                headers={'Authorization': f'Token {token}'},
                timeout=10,
            )
            latency = (time.time() - start) * 1000
            latencies.append(latency)

            if response.status_code >= 500:
                errors += 1
        except requests.RequestException:
            errors += 1

    return {
        'p50': statistics.median(latencies) if latencies else 0,
        'p95': sorted(latencies)[int(len(latencies) * 0.95)] if latencies else 0,
        'error_rate': errors / num_requests,
    }


def run_experiment(event_id, token):
    """Run the Redis failure chaos experiment."""
    print("=" * 60)
    print("CHAOS EXPERIMENT: Redis Failure Impact on RSVP")
    print("=" * 60)

    # 1. Measure steady state
    print("\n--- Phase 1: Measuring steady state ---")
    baseline = measure_rsvp_creation(event_id, token)
    print(f"  Baseline p50: {baseline['p50']:.0f}ms")
    print(f"  Baseline p95: {baseline['p95']:.0f}ms")
    print(f"  Baseline error rate: {baseline['error_rate']:.1%}")

    # 2. Inject failure
    print("\n--- Phase 2: Injecting Redis failure ---")
    requests.post(f'{TOXIPROXY_API}/proxies/redis/toxics', json={
        'name': 'down',
        'type': 'reset_peer',
        'attributes': {'timeout': 0},
    })
    print("  Redis connections are now being reset.")

    # Wait for connections to drain
    time.sleep(2)

    # 3. Measure under failure
    print("\n--- Phase 3: Measuring under failure ---")
    failure = measure_rsvp_creation(event_id, token)
    print(f"  Failure p50: {failure['p50']:.0f}ms")
    print(f"  Failure p95: {failure['p95']:.0f}ms")
    print(f"  Failure error rate: {failure['error_rate']:.1%}")

    # 4. Restore and measure recovery
    print("\n--- Phase 4: Restoring Redis ---")
    requests.delete(f'{TOXIPROXY_API}/proxies/redis/toxics/down')
    time.sleep(2)

    recovery = measure_rsvp_creation(event_id, token)
    print(f"  Recovery p50: {recovery['p50']:.0f}ms")
    print(f"  Recovery p95: {recovery['p95']:.0f}ms")
    print(f"  Recovery error rate: {recovery['error_rate']:.1%}")

    # 5. Evaluate results
    print("\n--- Results ---")
    passed = True

    if failure['error_rate'] > 0.10:
        print(f"  FAIL: Error rate under failure ({failure['error_rate']:.1%}) exceeds 10%")
        passed = False
    else:
        print(f"  PASS: Error rate under failure ({failure['error_rate']:.1%}) within threshold")

    if failure['p95'] > 5000:
        print(f"  FAIL: p95 latency under failure ({failure['p95']:.0f}ms) exceeds 5 seconds")
        passed = False
    else:
        print(f"  PASS: p95 latency under failure ({failure['p95']:.0f}ms) within threshold")

    if recovery['error_rate'] > 0.01:
        print(f"  FAIL: Error rate after recovery ({recovery['error_rate']:.1%}) not back to normal")
        passed = False
    else:
        print(f"  PASS: Error rate recovered to normal ({recovery['error_rate']:.1%})")

    print(f"\n{'EXPERIMENT PASSED' if passed else 'EXPERIMENT FAILED'}")
    return passed


if __name__ == '__main__':
    import sys
    event_id = sys.argv[1] if len(sys.argv) > 1 else '1'
    token = sys.argv[2] if len(sys.argv) > 2 else 'test-token'
    success = run_experiment(event_id, token)
    sys.exit(0 if success else 1)
```

### Reading the Results

If the experiment passes, your circuit breakers and fallbacks are working. RSVPs are created even without Redis, though features that depend on caching will be slower.

If it fails, you've found a real problem. Maybe your Django cache backend raises an exception instead of returning a cache miss. Maybe the Celery broker connection blocks for 30 seconds before timing out. These are exactly the bugs you want to find before production finds them for you.

## Game Days

A game day is a scheduled event where your team intentionally runs chaos experiments and practices incident response. It's the operational equivalent of a fire drill.

### Game Day Structure

**1. Preparation (1 week before)**
- Choose 3 to 5 failure scenarios to test
- Write hypotheses for each scenario
- Ensure monitoring dashboards are ready
- Brief all participants on the plan
- Prepare a rollback plan for each scenario

**2. Execution (2 to 4 hours)**
- Start each experiment with a clear announcement
- Inject the failure
- Observe dashboards and application behavior
- Record what happened versus what you expected
- Restore normal operation before the next experiment

**3. Retrospective (30 minutes after)**
- Which hypotheses held? Which didn't?
- What surprised you?
- What needs to be fixed before the next game day?
- Assign action items with owners and deadlines

### Example Game Day Scenarios for Gather

| Scenario | Injection Method | What to Observe |
|----------|-----------------|-----------------|
| Redis failure | Toxiproxy reset_peer | RSVP creation, cache fallbacks, Celery task queueing |
| Database latency (2s) | Toxiproxy latency | Page load times, timeout handling, error rates |
| Email service down | Toxiproxy disable SMTP proxy | Circuit breaker activation, pending email queue, user experience |
| Worker crash | `docker compose stop celery-worker` | Task accumulation, Flower alerts, recovery time |
| Full disk | Fill the volume (in staging only) | Log rotation, backup failures, PostgreSQL behavior |

### Game Day Rules

1. **Never run chaos experiments in production without a kill switch.** You must be able to stop the experiment instantly.
2. **Start in staging.** Only move to production after you've validated your tools and procedures in staging.
3. **Monitor everything.** If you can't observe the impact, the experiment is wasted.
4. **Document findings.** Write down what happened, not just what you expected.
5. **Fix what you find.** A game day that generates action items but no follow-through is theater.

## Integrating Chaos into CI

For ongoing confidence, run lightweight chaos tests in your CI pipeline:

```yaml
# .github/workflows/chaos.yml

name: Chaos Tests

on:
  schedule:
    - cron: '0 4 * * 1'  # Weekly on Monday at 4 AM

jobs:
  chaos-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Start services with Toxiproxy
        run: docker compose -f docker-compose.yml -f docker-compose.chaos.yml up -d

      - name: Wait for services
        run: |
          sleep 15
          curl --retry 10 --retry-delay 2 http://localhost:8000/health/

      - name: Configure Toxiproxy proxies
        run: |
          curl -X POST http://localhost:8474/proxies -d '{"name":"redis","listen":"0.0.0.0:16379","upstream":"redis:6379"}'
          curl -X POST http://localhost:8474/proxies -d '{"name":"postgres","listen":"0.0.0.0:15432","upstream":"db:5432"}'

      - name: Run chaos experiments
        run: python chaos/test_redis_failure.py 1 test-token

      - name: Collect logs on failure
        if: failure()
        run: docker compose logs > chaos-logs.txt

      - name: Upload logs
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: chaos-logs
          path: chaos-logs.txt
```

## What's Next

You now have the tools and techniques to test your system's resilience: circuit breakers handle the runtime failures, backups handle the data protection, and chaos engineering verifies that everything actually works. In the project, you'll put all of this together in a comprehensive resilience audit for Gather.

---
title: "Latency, Throughput, and the 99th Percentile"
estimatedMinutes: 40
---

# Latency, Throughput, and the 99th Percentile

Every conversation about system performance starts with two numbers: how fast (latency) and how many (throughput). In this lesson, you'll learn what those numbers actually mean, why the way most people measure them is wrong, and how to think about performance like a production engineer.

## Latency: How Long Does One Thing Take?

**Latency** is the time between a request being sent and a response being received. When a user clicks "RSVP" on Gather, latency is the time between that click and the confirmation appearing on screen.

Latency is measured in milliseconds (ms) for web applications. Here's a rough guide for how users perceive latency:

| Latency | User Perception |
|---------|----------------|
| < 100ms | Feels instant |
| 100-300ms | Noticeable but smooth |
| 300-1000ms | Feels sluggish |
| 1-3 seconds | Frustrating, user wonders if it's broken |
| > 3 seconds | User leaves or refreshes |

These thresholds come from decades of research in human-computer interaction. Google found that adding 500ms to search results caused a 20% drop in traffic. Amazon found that every 100ms of latency cost them 1% of sales.

### What Contributes to Latency

Let's trace a single request through Gather and see where time is spent:

```
User clicks "RSVP"
  │
  ├── Network: Browser to server          ~20ms
  │
  ├── Next.js: Receive request, route      ~2ms
  │
  ├── Next.js to Django: Internal API call ~5ms
  │
  ├── Django: Authentication middleware     ~3ms
  │
  ├── Django: Parse request, validate       ~2ms
  │
  ├── Database: Check capacity              ~5ms
  │    (SELECT COUNT(*) FROM rsvps WHERE event_id = ?)
  │
  ├── Database: Insert RSVP record          ~3ms
  │    (INSERT INTO rsvps ...)
  │
  ├── Django: Send confirmation email     ~800ms  ← PROBLEM
  │
  ├── Django: Serialize response            ~1ms
  │
  ├── Network: Server to browser           ~20ms
  │
  Total                                   ~861ms
```

Notice that 93% of the total latency comes from one step: sending the email synchronously. This is a classic example of a latency bottleneck hiding in plain sight. We'll fix this in Module 3 (Background Jobs) by moving email sending to an async task queue.

### Latency Is Not a Single Number

Here's where things get interesting. Latency varies from request to request. Even the same endpoint responding to the same type of request will have different latency each time, depending on:

- Database connection availability
- Cache hits vs. cache misses
- Network conditions
- Server CPU load
- Garbage collection pauses
- Other queries running at the same time

If you measure 1,000 requests to `GET /api/events/`, you might see a distribution like this:

```
Latency Distribution for GET /api/events/
(1,000 requests)

Count
  │
80│       ██
  │      ████
60│     ██████
  │    ████████
40│   ██████████
  │  ████████████
20│ █████████████░░░
  │██████████████░░░░░░░
  │█████████████████░░░░░░░░░░░░         ░
  └──────────────────────────────────────────
  10  20  30  40  50  60  80  100  200  500  ms

  █ = Most requests (the "body")
  ░ = Tail latency (the "long tail")
```

Most requests complete in 20-50ms. But some take 200ms, and a few unlucky ones take 500ms. Those slow outliers in the "long tail" are where the real problems hide.

## Why Averages Lie

Quick quiz: if the average response time for your API is 45ms, is your API fast?

The answer is: **you don't have enough information to know.**

Consider two APIs, both with an average (mean) response time of 45ms:

**API A (Consistent):**
```
Request times: 40, 42, 44, 46, 48, 45, 43, 47, 44, 46, 45
Average: 45ms
All requests between 40-48ms
```

**API B (Inconsistent):**
```
Request times: 10, 12, 11, 10, 12, 10, 11, 10, 12, 350, 10
Average: 44ms
Most requests at 10-12ms, but one at 350ms
```

API B has a *lower* average, but one in every ten requests takes 350ms. For the user who gets that 350ms request, the experience is terrible. And if you're handling 10,000 requests per minute, that means 1,000 users per minute are having a terrible experience.

The average hides this problem completely.

### The Math of Why Averages Fail

Averages (arithmetic mean) are misleading for latency because latency distributions are not symmetric. They have a **long right tail**: most values cluster around the low end, but a few extreme values stretch far to the right.

When you average a skewed distribution, the mean gets pulled toward the tail, away from the value most users actually experience. You end up with a number that describes neither the typical case nor the worst case.

```
Average (mean): 45ms
           │
           ▼
  ┌────────────────────────────────────┐
  │  █████████                         │
  │ ████████████                       │
  │███████████████                     │
  │██████████████████░                 │
  │█████████████████████░░░░           │
  │████████████████████████░░░░░░░  ░  │
  └────────────────────────────────────┘
  10     30     50     100    200   500ms

  The average is at 45ms, but the most common
  experience is ~25ms, and the worst is ~500ms.
  The average tells you neither of these things.
```

## Percentiles: The Right Way to Measure

Instead of averages, production engineers use **percentiles**. A percentile tells you: "X% of requests are faster than this value."

The key percentiles:

| Percentile | Notation | Meaning |
|-----------|----------|---------|
| 50th | p50 (median) | Half of requests are faster than this |
| 95th | p95 | 95% of requests are faster than this |
| 99th | p99 | 99% of requests are faster than this |
| 99.9th | p999 | 999 out of 1000 requests are faster than this |

Let's revisit API B with percentiles:

```python
import numpy as np

response_times = [10, 12, 11, 10, 12, 10, 11, 10, 12, 350, 10]

print(f"Mean:  {np.mean(response_times):.0f}ms")   # 44ms (misleading)
print(f"p50:   {np.percentile(response_times, 50):.0f}ms")   # 11ms (typical)
print(f"p95:   {np.percentile(response_times, 95):.0f}ms")   # 181ms (uh oh)
print(f"p99:   {np.percentile(response_times, 99):.0f}ms")   # 333ms (real problem)
```

Now the picture is clear: most requests are fast (11ms), but the tail is severe (333ms at p99). The percentiles tell the full story that the average hides.

### Why p99 Matters More Than You Think

You might think: "Only 1% of requests are slow. That's fine."

Let's do the math for Gather at scale:

- 100,000 active users
- Each user loads an average of 5 pages per session
- Each page makes 3 API calls
- Total: 1,500,000 API calls per day

At p99 = 350ms:
- 1% of 1,500,000 = **15,000 slow requests per day**
- That's roughly **10 slow requests per minute**, all day long

But it gets worse. A single page load makes multiple API calls. If each call has independent 1% chance of being slow, the probability of the *entire page* being fast is:

```
P(all 3 calls fast) = 0.99 x 0.99 x 0.99 = 0.97

P(at least one slow call) = 1 - 0.97 = 0.03 = 3%
```

So 3% of page loads (45,000 per day) will feel slow to the user, even though each individual API has a "great" p99. This effect compounds with every additional service call in the chain.

### The Coordinated Omission Problem

There's an even subtler issue with latency measurement. Most benchmarking tools send requests at a fixed rate regardless of response time. But in the real world, when your server is slow, requests pile up.

Imagine you're measuring latency by sending one request per second:

```
Second 1: Send request, get response in 20ms    ✓
Second 2: Send request, get response in 25ms    ✓
Second 3: Send request, get response in 2000ms  ✗ (slow!)
Second 4: Send request... but the server is still
          processing second 3's request
```

If your tool ignores the fact that second 4's request was *delayed* by second 3's slowness, you're undercounting the actual user-experienced latency. This is called **coordinated omission**, and it makes your latency numbers look better than they really are.

Tools like `wrk2` and `Vegeta` handle this correctly. We'll use them in Module 10 for realistic load testing.

## Throughput: How Many Things at Once?

**Throughput** is the number of operations your system can handle per unit of time. For web applications, it's typically measured in **requests per second (RPS)** or **queries per second (QPS)**.

If latency is "how fast can one car go," throughput is "how many cars can pass through the intersection per hour."

### Measuring Throughput

A quick benchmark of Gather's event listing endpoint:

```bash
# Using wrk to measure throughput
# 4 threads, 100 connections, 30 second test
wrk -t4 -c100 -d30s http://localhost:8000/api/events/

# Example output:
#   Requests/sec: 850.23
#   Transfer/sec: 2.34MB
#   Latency (avg): 117ms
#   Latency (p99): 890ms
```

This tells us the Django API can handle about 850 requests per second for the events endpoint before latency degrades significantly.

### The Relationship Between Latency and Throughput

Latency and throughput are related, but not in the simple way you might expect. They're governed by **Little's Law**:

```
L = λ x W

Where:
  L = number of requests in the system (concurrency)
  λ = throughput (requests per second)
  W = average time in system (latency)
```

In practical terms: if each request takes 100ms (W = 0.1s) and you have 10 worker threads (L = 10), your maximum throughput is:

```
λ = L / W = 10 / 0.1 = 100 requests per second
```

This reveals an important insight: **reducing latency increases throughput without adding hardware.** If you optimize that 100ms endpoint down to 50ms:

```
λ = L / W = 10 / 0.05 = 200 requests per second
```

You just doubled your throughput by making each request faster. This is why database query optimization (Module 2) and caching (Module 4) are so powerful: they reduce latency, which automatically increases throughput.

### Throughput Bottlenecks

Every system has a bottleneck that limits throughput. Common bottlenecks in web applications:

**CPU-bound:**
```
Your server's CPU is maxed out processing requests.
Symptoms: High CPU usage, response times increase linearly with load.
Fix: Optimize code, add more workers, or scale horizontally.
```

**I/O-bound:**
```
Your server is waiting on database queries, API calls, or disk reads.
Symptoms: Low CPU usage but high latency, many threads in "waiting" state.
Fix: Connection pooling, caching, async processing.
```

**Memory-bound:**
```
Your server is running out of RAM, causing swapping or OOM kills.
Symptoms: Sudden latency spikes, processes getting killed.
Fix: Reduce memory footprint, add RAM, or scale horizontally.
```

**Connection-bound:**
```
You've hit the limit of available database or network connections.
Symptoms: "Too many connections" errors, requests queuing.
Fix: Connection pooling (PgBouncer), reduce connection hold time.
```

For Gather, the most likely bottleneck at 100K users is **connection-bound**. PostgreSQL's default max of 100 connections will be exhausted long before CPU or memory becomes an issue.

## Measuring in Practice: Django + Next.js

Let's look at how to measure latency and throughput in the Gather stack.

### Django: Adding Timing Middleware

```python
# backend/middleware/timing.py
import time
import logging

logger = logging.getLogger('performance')

class TimingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.perf_counter()

        response = self.get_response(request)

        duration_ms = (time.perf_counter() - start) * 1000

        logger.info(
            'request_completed',
            extra={
                'method': request.method,
                'path': request.path,
                'status': response.status_code,
                'duration_ms': round(duration_ms, 2),
            }
        )

        # Add timing header for debugging
        response['X-Response-Time'] = f'{duration_ms:.2f}ms'

        return response
```

```python
# backend/settings.py
MIDDLEWARE = [
    'middleware.timing.TimingMiddleware',  # First in the list
    'django.middleware.security.SecurityMiddleware',
    # ... rest of middleware
]
```

### Next.js: Measuring Server-Side Render Time

```typescript
// frontend/src/lib/timing.ts
export function withTiming<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();

  return fn().then((result) => {
    const duration = performance.now() - start;
    console.log(
      JSON.stringify({
        event: "timing",
        label,
        duration_ms: Math.round(duration * 100) / 100,
      })
    );
    return result;
  });
}

// Usage in a page component
export default async function EventsPage() {
  const events = await withTiming("fetch_events", () =>
    fetch(`${process.env.API_URL}/api/events/`).then((r) => r.json())
  );

  return <EventList events={events} />;
}
```

### Quick Load Test with wrk

```bash
# Install wrk (macOS)
brew install wrk

# Basic throughput test
wrk -t2 -c50 -d10s http://localhost:8000/api/events/

# With latency percentiles
wrk -t2 -c50 -d10s --latency http://localhost:8000/api/events/

# Example output:
#  Thread Stats   Avg      Stdev     Max   +/- Stdev
#    Latency    58.32ms   45.67ms  512.00ms   87.23%
#    Req/Sec   210.45     42.31    320.00     71.00%
#  Latency Distribution
#     50%   42.00ms
#     75%   67.00ms
#     90%  105.00ms
#     99%  310.00ms
#  4189 requests in 10.01s, 11.52MB read
#  Requests/sec:    418.48
#  Transfer/sec:      1.15MB
```

Read these results carefully:

- **p50 = 42ms**: The typical request is fast.
- **p99 = 310ms**: One in 100 requests takes 7x longer than typical.
- **Throughput = 418 RPS**: Under moderate load, we handle about 400 requests per second.
- **Max = 512ms**: The slowest single request took half a second.

This gives us a baseline. As we optimize Gather throughout the course, we'll run these benchmarks again to measure improvement.

## Setting Performance Targets

For Gather at 100K users, here are our targets (these come from our "production-ready" criteria in Lesson 1):

| Metric | Target | Current (estimated) | Gap |
|--------|--------|-------------------|-----|
| p50 latency (reads) | < 50ms | ~42ms | On target |
| p95 latency (reads) | < 150ms | ~105ms | On target |
| p99 latency (reads) | < 200ms | ~310ms | 110ms over |
| p50 latency (writes) | < 100ms | ~860ms | Way over |
| Throughput | 500 RPS | ~418 RPS | Need 20% more |
| Error rate | < 0.1% | ~0% (low load) | Unknown at scale |

The reads are close, but writes (like the RSVP endpoint) are way off because of synchronous email sending. And our throughput numbers will drop significantly under real concurrent load because we haven't set up connection pooling yet.

## SLOs: Making Performance Promises

In production, you formalize these targets as **Service Level Objectives (SLOs)**. An SLO is a promise about how your system will perform.

Example SLOs for Gather:

```
SLO 1: 99% of event listing requests (GET /api/events/)
       will complete in under 200ms, measured over a
       rolling 30-day window.

SLO 2: 99.9% of all API requests will return a
       non-error response (status < 500), measured
       over a rolling 30-day window.

SLO 3: 95% of RSVP creation requests will complete
       in under 300ms, measured over a rolling
       30-day window.
```

The related terms:

- **SLI (Service Level Indicator)**: The metric you measure (e.g., p99 latency)
- **SLO (Service Level Objective)**: The target for that metric (e.g., p99 < 200ms)
- **SLA (Service Level Agreement)**: A contractual promise with consequences for missing the SLO (e.g., refund if SLO is missed)

For Gather, we'll define SLIs and SLOs. We probably don't need SLAs unless we're selling to enterprise customers.

## Key Takeaways

1. **Latency** is how long one request takes. **Throughput** is how many requests per second your system handles.

2. **Never use averages for latency.** Use percentiles: p50 (typical), p95 (most users), p99 (worst case that still matters).

3. **p99 matters** because at scale, 1% of requests is still thousands of users. And multiple API calls per page make the compound probability worse.

4. **Little's Law** (L = lambda x W) connects latency and throughput. Reducing latency automatically increases throughput.

5. **Measure before optimizing.** Add timing middleware, run load tests, establish baselines.

6. **Set SLOs** to define what "fast enough" means for your application.

## Up Next

Now that you know how to measure performance, the next lesson covers the two fundamental strategies for handling more load: making your existing server bigger (vertical scaling) or adding more servers (horizontal scaling). You'll learn when each approach makes sense and which parts of Gather can scale which way.

---
title: "The Caching Hierarchy"
estimatedMinutes: 35
---

# The Caching Hierarchy

Every time a user opens Gather's event page, a chain of work kicks off. The browser sends an HTTP request. A load balancer routes it to a server. Django parses the URL, hits the database, serializes the result, and sends JSON back. The frontend renders it into HTML. This entire round trip might take 200-500ms, and every single request repeats the same work, even if the event data hasn't changed in hours.

Caching is the practice of storing the result of expensive work so you can skip the work next time. It is the single most impactful performance optimization you can make to a web application. A well-cached page that took 300ms to generate can be served in under 5ms.

But caching isn't just one technique. It's a hierarchy of layers, each with different speeds, capacities, and tradeoffs. Understanding this hierarchy is essential before you start adding cache calls to your code. Otherwise, you'll cache the wrong things, at the wrong layer, with the wrong expiration, and create bugs that are harder to debug than the performance problems you were trying to solve.

---

## The Memory Hierarchy: From CPU to Disk

Before we talk about web caching, let's start at the hardware level. Your server's processor has its own caching hierarchy that illustrates the fundamental tradeoff: **speed vs. capacity**.

### L1 Cache (Per-Core)

- **Size**: 32-64 KB per core
- **Latency**: ~1 nanosecond (1 billionth of a second)
- **What it stores**: The most recently accessed data and instructions for a single CPU core

This is the fastest memory on the entire machine. It's tiny because it's built directly into the processor die, using the most expensive transistor technology. You don't control what goes here. The CPU manages it automatically.

### L2 Cache (Per-Core)

- **Size**: 256 KB - 1 MB per core
- **Latency**: ~3-5 nanoseconds
- **What it stores**: A larger working set of data for each core

Still extremely fast, but about 3-5x slower than L1. Also managed automatically by the CPU.

### L3 Cache (Shared)

- **Size**: 4-64 MB (shared across all cores)
- **Latency**: ~10-20 nanoseconds
- **What it stores**: Data that multiple cores might need

The last level of CPU cache. Shared across all cores, so when one core loads data from RAM, other cores can find it in L3 without making their own RAM trip.

### RAM (Main Memory)

- **Size**: 8-256 GB on typical servers
- **Latency**: ~50-100 nanoseconds
- **What it stores**: Running programs, open files, OS data, application state

About 10-100x slower than L1 cache, but about a million times larger. This is where Redis stores its data, which is why Redis is so fast compared to disk-based databases.

### SSD/Disk

- **Size**: 256 GB - several TB
- **Latency**: ~25,000-100,000 nanoseconds (SSD) or ~5,000,000+ nanoseconds (spinning disk)
- **What it stores**: Everything persistent: databases, files, logs

This is where PostgreSQL stores your Gather event data. Even with an SSD, disk access is roughly 1,000x slower than RAM access.

### The Pattern

Notice the pattern at every level:

| Layer | Latency | Capacity | Cost per GB |
|-------|---------|----------|-------------|
| L1 Cache | ~1 ns | 64 KB | Extreme |
| L2 Cache | ~4 ns | 512 KB | Very high |
| L3 Cache | ~15 ns | 32 MB | High |
| RAM | ~75 ns | 64 GB | Moderate |
| SSD | ~50,000 ns | 1 TB | Low |
| HDD | ~5,000,000 ns | 4 TB | Very low |

Every layer is roughly 10-100x slower than the one above it but 10-100x larger. This tradeoff between speed and capacity is a law of physics, not a design choice. Faster memory requires more power, more heat dissipation, and more expensive materials.

---

## The Web Caching Hierarchy

Now let's map this concept to web applications. Just like hardware has layers of caches, your application stack has layers where you can store precomputed results. Starting from the closest layer to the database and moving outward toward the user:

### Layer 1: Database Query Cache

PostgreSQL has a shared buffer cache (typically 25% of system RAM) that keeps frequently accessed pages in memory. When you run the same query twice, the second execution is faster because the data pages are already in RAM instead of on disk.

```sql
-- First execution: reads from disk, ~50ms
SELECT * FROM events WHERE id = 42;

-- Second execution: data pages in shared_buffers, ~2ms
SELECT * FROM events WHERE id = 42;
```

You control this with PostgreSQL's `shared_buffers` setting (which you configured in Module 02). But this only helps with repeated identical queries on the same database server. It doesn't reduce the overhead of query parsing, planning, serialization, or network round trips between Django and PostgreSQL.

### Layer 2: Application Cache (Redis)

This is the first layer you fully control as a developer. Instead of querying the database every time, you store the result in Redis (an in-memory data store) and check Redis first.

```python
import json
from django.core.cache import cache

def get_event(event_id):
    cache_key = f"event:{event_id}"

    # Check cache first
    cached = cache.get(cache_key)
    if cached:
        return json.loads(cached)  # Cache hit: ~1ms

    # Cache miss: query database (~20ms)
    event = Event.objects.get(id=event_id)
    data = EventSerializer(event).data

    # Store in cache for next time
    cache.set(cache_key, json.dumps(data), timeout=300)  # 5 minutes

    return data
```

Redis stores data in RAM, so reads take about 0.1-1ms compared to 5-50ms for a database query. This is where you'll spend most of your time in this module.

### Layer 3: Response Cache (Full Page or API Response)

Instead of caching individual database results, you cache the entire HTTP response. Django can do this at the view level:

```python
from django.views.decorators.cache import cache_page

@cache_page(60 * 5)  # Cache entire response for 5 minutes
def event_detail(request, event_id):
    event = Event.objects.get(id=event_id)
    return JsonResponse(EventSerializer(event).data)
```

This skips not just the database query, but also serialization, template rendering, and all the middleware processing. The cached response is returned directly.

### Layer 4: Reverse Proxy Cache (Nginx, Varnish)

A reverse proxy sits in front of your application server and can cache responses before they even reach Django. Nginx can serve cached responses in under 1ms, without waking up a Django process at all.

```nginx
# Nginx caching configuration
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=gather:10m max_size=1g;

server {
    location /api/events/ {
        proxy_cache gather;
        proxy_cache_valid 200 5m;
        proxy_cache_use_stale error timeout updating;
        proxy_pass http://django;
    }
}
```

This is powerful for APIs with high read traffic and low write frequency, which describes Gather's event listings perfectly.

### Layer 5: CDN (Content Delivery Network)

A CDN is a network of servers distributed across the globe. When a user in London requests Gather's event page, the CDN serves it from a server in London instead of sending the request all the way to your origin server in Virginia.

```
User in London → CDN Edge (London, ~20ms) → Your Server (Virginia, ~150ms)
```

CDNs cache static assets (images, CSS, JavaScript) and can also cache API responses and full HTML pages. Vercel's Edge Network (which hosts Gather's Next.js frontend) is a CDN.

### Layer 6: Browser Cache

The user's own browser stores resources locally. When a user visits an event page, the browser can serve CSS, JavaScript, images, and even API responses from its local cache without making any network request at all. Latency: 0ms.

```
Cache-Control: max-age=3600, public
```

This is the fastest possible cache because there's no network involved. But it's also the hardest to invalidate, since you can't reach into a user's browser and delete their cached data.

---

## The "Closer to the User" Principle

The caching hierarchy follows a simple rule: **the closer the cache is to the user, the faster the response, but the harder it is to invalidate**.

```
Browser Cache     →  0ms latency    →  Hardest to invalidate
CDN Edge          →  5-30ms         →  Requires cache purge API
Reverse Proxy     →  <1ms           →  Server-side control
Application Cache →  1-5ms          →  Full programmatic control
Database Cache    →  2-10ms         →  Automatic (LRU eviction)
Database Disk     →  10-50ms        →  Always fresh (source of truth)
```

For Gather, this means:
- **Event listings that rarely change** (past events, venue info) can be cached aggressively at the CDN and browser level
- **Dynamic data that changes frequently** (RSVP counts, available spots) should be cached at the application level with short TTLs or event-driven invalidation
- **User-specific data** (my RSVPs, my profile) should only be cached at the application level, never at shared layers like CDN

---

## Cache Hit Ratio: The Number That Matters

The **cache hit ratio** measures how often your cache actually has the data you need:

```
Hit Ratio = Cache Hits / (Cache Hits + Cache Misses)
```

A cache hit ratio of 95% means that 95 out of every 100 requests are served from cache, and only 5 hit the database. Here's why this number matters so much:

### Example: Gather Event API

Suppose your event detail API endpoint handles 1,000 requests per minute:
- **Without cache**: 1,000 database queries/minute
- **With 90% hit ratio**: 100 database queries/minute (10x reduction)
- **With 99% hit ratio**: 10 database queries/minute (100x reduction)

Going from 90% to 99% seems like a small improvement, but it reduces database load by another 10x. Each percentage point near the top matters enormously.

### What Affects Hit Ratio?

Several factors determine your cache hit ratio:

**TTL (Time to Live)**: Longer TTLs mean data stays in cache longer, increasing hits. But stale data becomes more likely.

```python
# Short TTL: lower hit ratio, fresher data
cache.set("event:42", data, timeout=60)      # 1 minute

# Long TTL: higher hit ratio, possibly stale data
cache.set("event:42", data, timeout=3600)    # 1 hour
```

**Cache key cardinality**: If every request generates a unique cache key, your hit ratio will be near zero. This happens when you include user-specific data or timestamps in cache keys.

```python
# Bad: unique per user, defeats the purpose for shared data
cache_key = f"event:{event_id}:user:{user_id}"

# Good: shared across all users viewing the same event
cache_key = f"event:{event_id}"
```

**Cache size**: If your cache is too small, old entries get evicted before they can be reused. Redis uses an LRU (Least Recently Used) eviction policy by default when memory is full.

**Traffic patterns**: An event page that gets 10,000 views per hour will have a much higher hit ratio than one that gets 2 views per day, even with the same TTL.

### Monitoring Hit Ratio

Redis provides built-in stats for monitoring:

```bash
redis-cli INFO stats | grep keyspace
# keyspace_hits:158420
# keyspace_misses:12380

# Hit ratio: 158420 / (158420 + 12380) = 92.7%
```

In production, you should monitor this metric continuously. If your hit ratio drops suddenly, it usually means something is wrong with your cache key strategy or your invalidation logic is too aggressive.

---

## How Caching Reduces Database Load

Let's connect this back to Gather's architecture. In Module 02, you optimized queries and added indexes to handle 100K events. In Module 03, you moved slow operations to Celery background tasks. Caching is the next multiplier.

Consider Gather's event detail page. Without caching, every page view triggers:

1. A Django query for the event (with related venue and organizer data)
2. A query for the RSVP count
3. A query for the user's RSVP status (if logged in)
4. JSON serialization of all this data
5. A Next.js server-side render of the page

Steps 1-2 are the same for every user viewing the same event. Only step 3 is user-specific. By caching the shared data (steps 1-2) in Redis, you eliminate most database queries entirely.

```
Before caching:
  1,000 users view event → 3,000 database queries

After caching event data (5-min TTL, ~99% hit ratio):
  1,000 users view event → ~10 queries for event data
                          + 1,000 queries for user RSVP status
                          = ~1,010 database queries (66% reduction)
```

And if you cache the user's RSVP status too (invalidated when they RSVP):

```
After caching everything:
  1,000 users view event → ~10 event queries + ~10 RSVP queries
                          = ~20 database queries (99% reduction)
```

That's the power of caching. You're not just making individual requests faster. You're fundamentally reducing the load on your database, which means your existing hardware can handle 10-100x more traffic.

---

## When NOT to Cache

Caching isn't free. It adds complexity, introduces the possibility of stale data, and can create subtle bugs. Here are situations where caching can do more harm than good:

**Write-heavy data**: If data changes on every request, the cache will be invalidated constantly and your hit ratio will be near zero. The cache overhead (serialize, store, check, invalidate) actually makes things slower.

**Security-sensitive data**: Authentication tokens, payment information, and personal data should generally not be cached in shared caches. A misconfigured cache key could leak one user's data to another.

**Rarely accessed data**: If a particular event page gets 2 views per day, caching it wastes memory without meaningfully improving performance. Cache your hot paths, not everything.

**Data that must be real-time**: If stale data is unacceptable (current stock prices, live auction bids), caching adds dangerous delay. Use a different strategy like WebSockets instead.

---

## What You'll Build in This Module

Over the next four lessons and the module project, you'll implement caching at three layers of Gather's stack:

1. **Application cache with Redis** (Lesson 02): Cache event queries using Django's cache framework with `django-redis`
2. **Cache invalidation** (Lesson 03): Automatically invalidate cached data when events are updated or RSVPs change, using Django signals
3. **HTTP caching** (Lesson 04): Set `Cache-Control` headers and ETags on API responses so browsers and proxies can cache without even hitting Django
4. **CDN and edge caching** (Lesson 05): Configure Next.js ISR and Vercel's edge network to serve event pages from the CDN

By the end, Gather's event detail page will go from ~300ms to under 30ms for cached requests, and your database load will drop by 90%+.

---

## Key Takeaways

- Caching stores the result of expensive work so you can skip the work on subsequent requests
- The caching hierarchy spans from CPU registers to CDN edge servers, with each layer trading speed for capacity
- The closer a cache is to the user, the faster the response, but the harder it is to invalidate
- Cache hit ratio is the most important caching metric. A 99% hit ratio reduces database load by 100x compared to no cache
- Not everything should be cached. Focus on read-heavy, shared data that changes infrequently
- Redis (which you already have running from Module 03) will serve as Gather's application cache

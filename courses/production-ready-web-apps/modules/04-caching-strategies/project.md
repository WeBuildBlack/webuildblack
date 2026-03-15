---
title: "Speed Up Gather"
estimatedMinutes: 75
---

# Module Project: Speed Up Gather

In this project, you'll implement three caching layers for Gather's event detail page, then benchmark the results to prove the improvement. By the end, the same page that currently takes 200-400ms will respond in under 30ms for cached requests, and your database load will drop dramatically.

You'll work across the entire stack: Django (application cache + HTTP headers), and Next.js (ISR + edge caching). This mirrors real-world performance optimization, where a single feature often requires changes across multiple services.

---

## Prerequisites

Before starting, make sure:
- Docker Compose is running with PostgreSQL, Redis, Django, and the Next.js frontend
- Your database is seeded with at least 1,000 events (from Module 02)
- Redis is accessible on port 6379 (from Module 03's Celery setup)
- You can access the Django API at `http://localhost:8000/api/events/`
- You can access the Next.js frontend at `http://localhost:3000/events/`

---

## Step 1: Baseline Benchmark

Before adding any caching, measure the current performance so you can prove the improvement later.

### Benchmark the Django API

Create a benchmarking script:

```bash
# scripts/benchmark-event-api.sh

#!/bin/bash
EVENT_ID=${1:-1}
REQUESTS=${2:-50}
API_URL="http://localhost:8000/api/events/${EVENT_ID}/"

echo "Benchmarking: ${API_URL}"
echo "Requests: ${REQUESTS}"
echo "---"

TOTAL_TIME=0
for i in $(seq 1 $REQUESTS); do
    TIME=$(curl -s -o /dev/null -w "%{time_total}" "$API_URL")
    TOTAL_TIME=$(echo "$TOTAL_TIME + $TIME" | bc)
    echo "Request $i: ${TIME}s"
done

AVG=$(echo "scale=4; $TOTAL_TIME / $REQUESTS" | bc)
echo "---"
echo "Average response time: ${AVG}s"
echo "Total time: ${TOTAL_TIME}s"
```

Run it:

```bash
chmod +x scripts/benchmark-event-api.sh
./scripts/benchmark-event-api.sh 1 50
```

Record these baseline numbers. You'll compare against them after implementing caching.

### Benchmark with curl Timing

For a quick single-request benchmark:

```bash
# Detailed timing breakdown
curl -w "\n  DNS:        %{time_namelookup}s\n  Connect:    %{time_connect}s\n  TTFB:       %{time_starttransfer}s\n  Total:      %{time_total}s\n" \
  -o /dev/null -s http://localhost:8000/api/events/1/
```

---

## Step 2: Implement Redis Application Cache

Now add the first caching layer: Redis-backed application caching with event-driven invalidation.

### 2a: Install and Configure django-redis

```bash
pip install django-redis
```

Add to your `requirements.txt`, then configure the cache backend:

```python
# gather/settings.py

# TODO: Add the CACHES configuration
# Requirements:
# - Use django_redis.cache.RedisCache as the backend
# - Connect to redis://redis:6379/1 (database 1, separate from Celery on db 0)
# - Use JSONSerializer for readable cached values
# - Set KEY_PREFIX to "gather"
# - Set default TIMEOUT to 300 seconds (5 minutes)
# - Configure connection pooling with max 50 connections
# - Enable RETRY_ON_TIMEOUT

CACHES = {
    "default": {
        # TODO: Configure the Redis cache backend here
    }
}
```

### 2b: Create Cache Key Helpers

```python
# events/cache_keys.py

# TODO: Implement the following cache key functions.
# Each function should return a string following the pattern: resource:id:sub-resource
# Use colons as separators (Redis convention).


def event_detail_key(event_id: int) -> str:
    """Cache key for full event detail data.
    Example: event:42
    """
    # TODO: Return the cache key string
    pass


def event_rsvp_count_key(event_id: int) -> str:
    """Cache key for an event's RSVP count.
    Example: event:42:rsvp_count
    """
    # TODO: Return the cache key string
    pass


def user_event_rsvp_key(user_id: int, event_id: int) -> str:
    """Cache key for a specific user's RSVP status on a specific event.
    Example: user:15:event:42:rsvp
    """
    # TODO: Return the cache key string
    pass


def event_list_version_key() -> str:
    """Cache key for the event list version number (used for versioned invalidation)."""
    # TODO: Return the cache key string
    pass


def event_list_key(category: str = None, page: int = 1) -> str:
    """Versioned cache key for event listings.
    Should include the current version number from event_list_version_key().
    Example: events:v3:upcoming:page:1 or events:v3:category:tech:page:1
    """
    # TODO: Get the current version from cache (default to 1 if not set)
    # TODO: Build and return the versioned cache key
    pass


def bump_event_list_version() -> int:
    """Increment the event list version, effectively invalidating all list caches.
    Returns the new version number.
    """
    # TODO: Use cache.incr() to bump the version
    # TODO: Handle the case where the key doesn't exist yet
    pass
```

### 2c: Add Caching to the Event Detail View

```python
# events/views.py

from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.cache import cache
from .cache_keys import event_detail_key, event_rsvp_count_key, user_event_rsvp_key
from .models import Event, RSVP
from .serializers import EventDetailSerializer


class EventDetailView(APIView):
    def get(self, request, event_id):
        # TODO: Implement three-layer caching for the event detail response.
        #
        # Layer 1: Event detail data
        # - Check cache using event_detail_key(event_id)
        # - On miss: query with select_related("venue", "organizer"), serialize, cache for 300s
        # - On hit: use cached data
        #
        # Layer 2: RSVP count
        # - Check cache using event_rsvp_count_key(event_id)
        # - On miss: count RSVPs from database, cache for 30s
        # - On hit: use cached count
        # - Add rsvp_count to the event data dict
        #
        # Layer 3: User RSVP status (only for authenticated users)
        # - Check cache using user_event_rsvp_key(user_id, event_id)
        # - On miss: check RSVP.objects.filter(...).exists(), cache with no timeout
        # - On hit: use cached boolean
        # - Add has_rsvpd to the event data dict
        # - For anonymous users: set has_rsvpd to False
        #
        # Return Response(event_data)

        pass
```

### 2d: Add Signal-Based Cache Invalidation

```python
# events/signals.py

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
from django.db import transaction
import logging

from .models import Event, RSVP
from .cache_keys import (
    event_detail_key,
    event_rsvp_count_key,
    user_event_rsvp_key,
    bump_event_list_version,
)

logger = logging.getLogger(__name__)


# TODO: Implement signal handlers for cache invalidation.
#
# Handler 1: invalidate_event_cache
# - Trigger: post_save and post_delete on Event model
# - Actions:
#   1. Delete the event detail cache key
#   2. Bump the event list version (invalidates all listing caches)
#   3. Log what was invalidated
# - Use transaction.on_commit() to ensure the DB write is committed first
#
# Handler 2: invalidate_rsvp_cache
# - Trigger: post_save and post_delete on RSVP model
# - Actions:
#   1. Delete the RSVP count cache key for the event
#   2. Delete the user's RSVP status cache key
#   3. Log what was invalidated
# - Use transaction.on_commit() to ensure the DB write is committed first
```

Register the signals:

```python
# events/apps.py

from django.apps import AppConfig


class EventsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "events"

    def ready(self):
        # TODO: Import events.signals to register signal handlers
        pass
```

### 2e: Verify Application Caching

After implementing, verify it works:

```bash
# Clear all cache keys
docker compose exec redis redis-cli -n 1 FLUSHDB

# Watch Redis commands in real-time
docker compose exec redis redis-cli -n 1 MONITOR

# In another terminal, hit the API twice
curl http://localhost:8000/api/events/1/
# Monitor should show SET (cache miss, stored result)

curl http://localhost:8000/api/events/1/
# Monitor should show GET (cache hit, no database query)

# Verify the data is in Redis
docker compose exec redis redis-cli -n 1 GET "gather:1:event:1"
# Should show JSON event data
```

---

## Step 3: Add HTTP Cache Headers and ETags

Add HTTP-level caching so browsers and proxies can cache responses without hitting Django at all.

### 3a: Update the Event Detail View with Headers

```python
# events/views.py (update your EventDetailView)

import hashlib

class EventDetailView(APIView):
    def get(self, request, event_id):
        # ... (your caching logic from Step 2) ...

        # TODO: Add HTTP caching headers to the response.
        #
        # For authenticated users:
        # - Set Cache-Control to "private, no-cache"
        # - This prevents CDNs from caching user-specific responses
        #
        # For anonymous users:
        # - Compute an ETag by hashing the response data with hashlib.md5
        # - Format the ETag as a quoted string: '"<hash>"'
        # - Check the request's If-None-Match header (request.META.get("HTTP_IF_NONE_MATCH"))
        # - If it matches the ETag, return Response(status=304)
        # - Otherwise, set these response headers:
        #   - ETag: the computed ETag
        #   - Cache-Control: "public, max-age=30, s-maxage=120"
        #   - Vary: "Accept"

        pass
```

### 3b: Update the Event List View with Headers

```python
# events/views.py

class EventListView(APIView):
    """GET /api/events/ -- Public event listing with caching."""

    def get(self, request):
        # TODO: Implement cached event listing with HTTP headers.
        #
        # 1. Read page and category from query params
        # 2. Check cache using event_list_key(category, page)
        # 3. On miss: query, paginate (20 per page), serialize, cache for 120s
        # 4. Compute an ETag from the response data
        # 5. Check If-None-Match for conditional response (304)
        # 6. Set headers:
        #    - Cache-Control: public, max-age=60, s-maxage=300
        #    - ETag: computed hash
        #    - Vary: Accept

        pass
```

### 3c: Verify HTTP Caching

```bash
# Check response headers
curl -v http://localhost:8000/api/events/1/ 2>&1 | grep -iE "(cache-control|etag|vary)"
# Should show:
# Cache-Control: public, max-age=30, s-maxage=120
# ETag: "abc123..."
# Vary: Accept

# Test conditional request (should return 304)
ETAG=$(curl -s -D - http://localhost:8000/api/events/1/ 2>&1 | grep -i etag | awk '{print $2}' | tr -d '\r')
curl -v -H "If-None-Match: $ETAG" http://localhost:8000/api/events/1/ 2>&1 | grep "< HTTP"
# Should show: < HTTP/1.1 304 Not Modified
```

---

## Step 4: Configure Next.js ISR and Edge Caching

Add the frontend caching layer with Incremental Static Regeneration.

### 4a: Update the Event Detail Page with ISR

```typescript
// app/events/[id]/page.tsx

// TODO: Implement ISR for the event detail page.
//
// 1. Create a generateStaticParams() function that:
//    - Fetches the top 50 events from your Django API
//    - Returns an array of { id: string } objects
//
// 2. Create a getEvent(id) function that:
//    - Fetches from your Django API: ${process.env.API_URL}/api/events/${id}/
//    - Uses the Next.js fetch option: { next: { revalidate: 60 } }
//    - Returns the parsed JSON or null on error
//
// 3. Create the page component that:
//    - Calls getEvent(params.id)
//    - Renders the event title, date, venue, RSVP count, and description
//    - Shows "Event not found" for null results
//
// 4. Export generateMetadata() for SEO with the event title and description
```

### 4b: Add Custom Cache Headers in next.config.js

```javascript
// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      // TODO: Configure three cache header rules:
      //
      // Rule 1: Static assets (/_next/static/:path*)
      // - Cache-Control: public, max-age=31536000, immutable
      // - These have hashed filenames, so they can be cached forever
      //
      // Rule 2: Event pages (/events/:id)
      // - Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=300
      // - Browser always revalidates, CDN caches for 60s, serves stale for up to 5 min
      //
      // Rule 3: API proxy routes (/api/:path*)
      // - Cache-Control: no-store
      // - Never cache API proxy routes at the CDN level
    ];
  },
};

module.exports = nextConfig;
```

### 4c: Add On-Demand Revalidation Endpoint

```typescript
// app/api/revalidate/route.ts

import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

// TODO: Implement the on-demand revalidation endpoint.
//
// 1. Parse the JSON body for { secret, path }
// 2. Verify that secret matches process.env.REVALIDATION_SECRET
//    - Return 401 if it doesn't match
// 3. Call revalidatePath(path) to purge the ISR cache for that path
// 4. Return { revalidated: true, path }
//
// This endpoint will be called by Django signals when event data changes.
```

### 4d: Wire Django Signals to Frontend Revalidation

```python
# events/signals.py (add to your existing signal handlers)

import requests
from django.conf import settings

# TODO: Add a signal handler that triggers Next.js on-demand revalidation.
#
# Handler: revalidate_frontend_cache
# - Trigger: post_save on Event model
# - Action: POST to {FRONTEND_URL}/api/revalidate with:
#   - secret: settings.REVALIDATION_SECRET
#   - path: f"/events/{instance.id}"
# - Use transaction.on_commit() so it fires after the DB write is committed
# - Wrap in try/except: frontend revalidation is best-effort (don't fail the request)
# - Set a 5-second timeout on the HTTP request
```

---

## Step 5: Post-Caching Benchmark

Now measure the improvement.

### API Benchmark

```bash
# Run the same benchmark script from Step 1
./scripts/benchmark-event-api.sh 1 50
```

Compare with your baseline. You should see:
- **First request** (cache miss): Similar to baseline (maybe slightly slower due to cache write)
- **Subsequent requests** (cache hits): 5-20x faster than baseline

### Detailed Timing Comparison

```bash
# Clear cache first (to measure a miss)
docker compose exec redis redis-cli -n 1 DEL "gather:1:event:1"

# Cache miss timing
echo "=== Cache MISS ==="
curl -w "Total: %{time_total}s\n" -o /dev/null -s http://localhost:8000/api/events/1/

# Cache hit timing
echo "=== Cache HIT ==="
curl -w "Total: %{time_total}s\n" -o /dev/null -s http://localhost:8000/api/events/1/

# Conditional request timing (304)
echo "=== Conditional Request (304) ==="
ETAG=$(curl -s -D - http://localhost:8000/api/events/1/ | grep -i etag | awk '{print $2}' | tr -d '\r')
curl -w "Total: %{time_total}s\n" -o /dev/null -s -H "If-None-Match: $ETAG" http://localhost:8000/api/events/1/
```

Expected results:
- Cache miss: 150-400ms (database query + serialization + cache write)
- Cache hit: 5-30ms (Redis read + serialization)
- 304 response: 3-15ms (Redis read + ETag comparison, no body)

### Simple Load Test

```bash
# Install hey (HTTP load generator)
# macOS: brew install hey
# Linux: go install github.com/rakyll/hey@latest

# 200 requests, 10 concurrent
hey -n 200 -c 10 http://localhost:8000/api/events/1/
```

Compare the output against a no-cache baseline. Focus on:
- **Average response time**: Should be 5-10x lower
- **p99 response time**: Should be much more consistent
- **Requests per second**: Should be 5-10x higher

### Monitor Redis Hit Ratio

```bash
# Check Redis cache stats
docker compose exec redis redis-cli -n 1 INFO stats | grep keyspace
# keyspace_hits: <number>
# keyspace_misses: <number>
# Calculate: hits / (hits + misses) = hit ratio
```

After the load test, your hit ratio should be 95%+ because the same event is being requested repeatedly.

---

## Step 6: Write a Summary

Create a brief document summarizing your results:

```markdown
# Caching Benchmark Results

## Baseline (No Cache)
- Average response time: ___ms
- p99 response time: ___ms
- Requests/second: ___

## With Application Cache (Redis)
- Cache hit response time: ___ms
- Cache miss response time: ___ms
- Hit ratio: ___%

## With HTTP Caching (ETags)
- 304 response time: ___ms
- Bandwidth saved: ___%

## With ISR (Next.js Frontend)
- ISR page load time: ___ms
- Revalidation time: ___ms

## Database Load Reduction
- Queries/request (before): ___
- Queries/request (after, cache hit): ___
- Reduction: ___%
```

---

## Stretch Goals

If you finish early, try these:

1. **Add cache warming**: Write a management command that pre-populates the Redis cache for the top 100 most-viewed events
2. **Monitor with Django Debug Toolbar**: Install django-debug-toolbar and compare the SQL queries panel before and after caching
3. **Implement thundering herd protection**: Use Redis locks to ensure only one request populates the cache on a miss while others wait
4. **Add cache metrics**: Log cache hits and misses as custom metrics and visualize them (preparation for Module 07's observability stack)

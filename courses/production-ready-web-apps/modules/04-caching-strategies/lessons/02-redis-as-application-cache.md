---
title: "Redis as Application Cache"
estimatedMinutes: 40
---

# Redis as Application Cache

You already have Redis running in your Docker Compose stack from Module 03, where it serves as Celery's message broker. Now you're going to use the same Redis instance for a second purpose: caching Django query results so they never hit PostgreSQL.

Django has a built-in cache framework that provides a clean, backend-agnostic API. You call `cache.get()` and `cache.set()` in your code, and Django handles the serialization, storage, and retrieval. By plugging in `django-redis` as the backend, those calls translate directly to Redis `GET` and `SET` commands, giving you sub-millisecond reads from an in-memory data store.

In this lesson, you'll configure the Redis cache backend, learn the cache API, establish naming conventions for cache keys, and apply caching to Gather's event detail queries.

---

## Setting Up django-redis

You already have Redis running on port 6379 (from your Module 03 Docker Compose config). The `django-redis` package connects Django's cache framework to that Redis instance.

### Install the Package

```bash
pip install django-redis
```

Add it to your `requirements.txt`:

```
django-redis==5.4.0
```

### Configure the Cache Backend

In `gather/settings.py`, add the cache configuration:

```python
# gather/settings.py

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://redis:6379/1",  # Use database 1 (Celery uses 0)
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "SERIALIZER": "django_redis.serializers.json.JSONSerializer",
            "SOCKET_CONNECT_TIMEOUT": 5,
            "SOCKET_TIMEOUT": 5,
            "RETRY_ON_TIMEOUT": True,
            "MAX_CONNECTIONS": 50,
            "CONNECTION_POOL_KWARGS": {
                "max_connections": 50,
            },
        },
        "KEY_PREFIX": "gather",
        "TIMEOUT": 300,  # Default TTL: 5 minutes
    }
}
```

A few things to note about this configuration:

**`LOCATION: redis://redis:6379/1`**: Redis supports 16 databases (numbered 0-15). Celery uses database 0, so you use database 1 for caching. This keeps the two concerns isolated. If you ever need to flush the cache without affecting Celery's task queue, you can run `redis-cli -n 1 FLUSHDB`.

**`JSONSerializer`**: By default, `django-redis` uses Python's `pickle` for serialization. Pickle is faster and supports more Python types, but JSON is safer (no arbitrary code execution risk) and easier to debug. You can inspect cached values directly in `redis-cli` and see readable JSON.

**`KEY_PREFIX: "gather"`**: Every cache key will be prefixed with `gather:`. This prevents key collisions if you ever share the Redis instance with another application.

**`TIMEOUT: 300`**: The default TTL (Time to Live) for cached values is 300 seconds (5 minutes). You can override this per key.

### Verify the Connection

Open a Django shell and test:

```python
python manage.py shell

>>> from django.core.cache import cache
>>> cache.set("test_key", {"status": "connected"}, timeout=30)
>>> cache.get("test_key")
{'status': 'connected'}
>>> cache.delete("test_key")
True
>>> cache.get("test_key")  # Returns None after deletion
>>>
```

You can also verify from the Redis CLI:

```bash
docker compose exec redis redis-cli -n 1
127.0.0.1:6379[1]> KEYS gather:*
(empty array)  # You deleted it, so it's gone

# Set something from Django shell, then check here:
127.0.0.1:6379[1]> KEYS gather:*
1) "gather:1:test_key"
127.0.0.1:6379[1]> GET "gather:1:test_key"
"{\"status\": \"connected\"}"
127.0.0.1:6379[1]> TTL "gather:1:test_key"
(integer) 27  # Seconds remaining
```

Notice the full key format: `gather:1:test_key`. The `gather` prefix comes from `KEY_PREFIX`, the `1` comes from Django's cache key versioning (you can increment this to bulk-invalidate all keys), and `test_key` is your key name.

---

## The Cache API

Django's cache framework provides a clean, dictionary-like API. Here are the operations you'll use most often.

### get and set

The fundamental operations. `set` stores a value with an optional TTL. `get` retrieves it, returning `None` if the key doesn't exist or has expired.

```python
from django.core.cache import cache

# Store a value for 5 minutes
cache.set("event:42", {"title": "Brooklyn Tech Meetup", "rsvp_count": 127}, timeout=300)

# Retrieve it
event = cache.get("event:42")
# Returns: {"title": "Brooklyn Tech Meetup", "rsvp_count": 127}

# Key doesn't exist or expired
result = cache.get("event:99999")
# Returns: None

# Provide a default value for misses
result = cache.get("event:99999", default={})
# Returns: {}
```

### get_or_set

Combines the check-and-populate pattern into a single call. If the key exists, it returns the cached value. If not, it calls the provided callable, caches the result, and returns it.

```python
from django.core.cache import cache

def fetch_event(event_id):
    """Expensive database query."""
    event = Event.objects.select_related("venue", "organizer").get(id=event_id)
    return EventSerializer(event).data

# First call: cache miss, calls fetch_event, stores result
data = cache.get_or_set("event:42", lambda: fetch_event(42), timeout=300)

# Second call: cache hit, returns stored value without calling fetch_event
data = cache.get_or_set("event:42", lambda: fetch_event(42), timeout=300)
```

**Important**: Pass a `lambda` or callable, not the function result. If you write `cache.get_or_set("event:42", fetch_event(42))`, the function executes immediately regardless of whether the cache has the value.

### delete

Remove a specific key from the cache:

```python
cache.delete("event:42")
```

Returns `True` if the key existed and was deleted, `False` if the key didn't exist.

### delete_many and clear

For bulk operations:

```python
# Delete specific keys
cache.delete_many(["event:42", "event:43", "event:44"])

# Delete ALL keys (careful with this in production)
cache.clear()
```

### get_many and set_many

Batch operations are more efficient than individual calls because they use Redis's `MGET` and `MSET` commands, which make a single round trip instead of one per key.

```python
# Fetch multiple events in one Redis call
events = cache.get_many(["event:42", "event:43", "event:44"])
# Returns: {"event:42": {...}, "event:43": {...}}
# Missing keys are omitted from the dict

# Store multiple values in one Redis call
cache.set_many({
    "event:42": event_42_data,
    "event:43": event_43_data,
    "event:44": event_44_data,
}, timeout=300)
```

### incr and decr

Atomically increment or decrement a numeric value. This is useful for counters like RSVP counts.

```python
# Initialize counter
cache.set("event:42:rsvp_count", 127)

# Atomic increment (thread-safe)
new_count = cache.incr("event:42:rsvp_count")
# Returns: 128

# Atomic decrement
new_count = cache.decr("event:42:rsvp_count")
# Returns: 127
```

These are atomic operations, meaning they're safe to call from multiple concurrent requests without race conditions.

---

## Cache Key Naming Conventions

Good cache key naming is crucial. Bad keys lead to collisions, debugging nightmares, and accidental cache invalidation. Here's the convention you'll use for Gather:

### The Pattern

```
{resource}:{identifier}:{sub-resource}
```

### Examples

```python
# Event data
"event:42"                    # Full event detail
"event:42:rsvps"              # RSVP list for event 42
"event:42:rsvp_count"         # RSVP count for event 42

# Event listings
"events:upcoming"             # List of upcoming events
"events:upcoming:page:1"      # Paginated listing, page 1
"events:category:tech"        # Events filtered by category

# User-specific data
"user:15:rsvps"               # User 15's RSVP list
"user:15:event:42:rsvp"       # User 15's RSVP status for event 42

# Computed/aggregated data
"stats:events:total"          # Total event count
"stats:rsvps:today"           # Today's RSVP count
```

### Rules

1. **Use colons as separators**: They're the Redis convention and show up clearly in `redis-cli` key listings
2. **Start with the resource type**: Makes it easy to find all keys for a resource using `KEYS event:*` (in development, never in production)
3. **Use numeric IDs, not slugs**: IDs are immutable. If an event's slug changes, you don't want orphaned cache keys
4. **Keep keys short**: Redis stores keys in memory. `event:42` is better than `gather_application_event_detail_id_42`
5. **Never include user-specific data in shared cache keys**: `event:42` is shared. `user:15:event:42:rsvp` is per-user

### Helper Function

Create a utility to enforce consistent key naming:

```python
# gather/cache_keys.py

def event_detail_key(event_id: int) -> str:
    return f"event:{event_id}"

def event_rsvp_count_key(event_id: int) -> str:
    return f"event:{event_id}:rsvp_count"

def event_list_key(category: str = None, page: int = 1) -> str:
    if category:
        return f"events:category:{category}:page:{page}"
    return f"events:upcoming:page:{page}"

def user_rsvp_key(user_id: int, event_id: int) -> str:
    return f"user:{user_id}:event:{event_id}:rsvp"
```

Using functions instead of f-strings scattered throughout your code ensures consistency and makes it easy to find all the places that create or reference a particular key.

---

## Timeouts and TTL Strategy

TTL (Time to Live) determines how long a cached value survives before Redis automatically deletes it. Choosing the right TTL is a balancing act between freshness and performance.

### TTL Guidelines for Gather

| Data Type | TTL | Reasoning |
|-----------|-----|-----------|
| Event detail (title, description, venue) | 5 minutes (300s) | Changes infrequently, but should reflect edits reasonably quickly |
| RSVP count | 30 seconds | Changes frequently, but a 30-second delay is acceptable |
| Event listings (upcoming events page) | 2 minutes (120s) | New events are created occasionally, short TTL keeps the list fresh |
| User's RSVP status | 0 (no TTL, invalidate on change) | Must reflect the user's actual action immediately |
| Static reference data (categories, venues) | 1 hour (3600s) | Rarely changes, safe to cache aggressively |
| Computed stats (total events, monthly active users) | 10 minutes (600s) | Expensive to compute, acceptable staleness |

### Setting TTL in Code

```python
from django.core.cache import cache

# Use the default timeout (300s from settings)
cache.set("event:42", data)

# Override with a specific timeout
cache.set("event:42:rsvp_count", count, timeout=30)

# Cache forever (no expiration). Only do this for data you explicitly invalidate.
cache.set("venue:5", venue_data, timeout=None)
```

### Why Not Cache Forever?

It's tempting to set long TTLs or no TTL and rely entirely on explicit invalidation. The problem is that invalidation logic has bugs. If your invalidation signal doesn't fire (maybe a bulk update bypasses Django's ORM), stale data can persist indefinitely.

TTL acts as a safety net. Even if your invalidation logic fails, the data will refresh within the TTL window. This is called the "belt and suspenders" approach: explicit invalidation for correctness, TTL for insurance.

---

## Caching QuerySets, Serialized Responses, and Computed Values

Not all data is equally cache-friendly. Let's look at what you should and shouldn't cache.

### Cache Serialized Data, Not QuerySets

Django QuerySets are lazy. They don't hit the database until you iterate over them. This makes them unsuitable for caching directly.

```python
# BAD: Caching a queryset object (not the data)
qs = Event.objects.filter(is_published=True)
cache.set("events:published", qs)  # This caches the queryset object, not results

# When you later do cache.get("events:published"), you get a queryset
# that will execute a NEW query when iterated. No performance benefit.

# GOOD: Cache the evaluated, serialized data
events = list(Event.objects.filter(is_published=True).values(
    "id", "title", "start_date", "venue__name", "rsvp_count"
))
cache.set("events:published", events, timeout=120)

# Even better: cache the serialized API response
events = Event.objects.filter(is_published=True)
data = EventListSerializer(events, many=True).data
cache.set("events:published", data, timeout=120)
```

### Cache Computed Values

Some values are expensive to compute but don't change often. These are excellent caching candidates.

```python
from django.db.models import Count, Avg
from django.core.cache import cache

def get_event_stats():
    cache_key = "stats:events:overview"
    stats = cache.get(cache_key)
    if stats:
        return stats

    # Expensive aggregation query
    stats = Event.objects.filter(is_published=True).aggregate(
        total_events=Count("id"),
        avg_rsvps=Avg("rsvp_count"),
        total_rsvps=Count("rsvps"),
    )
    cache.set(cache_key, stats, timeout=600)  # 10 minutes
    return stats
```

### Cache API Responses

For DRF views, you can cache the entire serialized response:

```python
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.cache import cache

class EventDetailView(APIView):
    def get(self, request, event_id):
        cache_key = f"event:{event_id}"
        data = cache.get(cache_key)

        if data is None:
            try:
                event = Event.objects.select_related(
                    "venue", "organizer"
                ).get(id=event_id, is_published=True)
            except Event.DoesNotExist:
                return Response({"error": "Event not found"}, status=404)

            data = EventDetailSerializer(event).data
            cache.set(cache_key, data, timeout=300)

        return Response(data)
```

---

## Per-View Caching with @cache_page

Django provides a decorator that caches the entire HTTP response for a view. This is the fastest way to add caching, but it's also the least flexible.

```python
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator

# Function-based view
@cache_page(60 * 5)  # 5 minutes
def event_list(request):
    events = Event.objects.filter(is_published=True)
    return JsonResponse({"events": list(events.values())})

# Class-based view
class EventDetailView(APIView):
    @method_decorator(cache_page(60 * 5))
    def get(self, request, event_id):
        event = Event.objects.get(id=event_id)
        return Response(EventDetailSerializer(event).data)
```

### How @cache_page Works

1. On the first request, Django executes the view normally and stores the full HTTP response (headers + body) in the cache
2. The cache key includes the URL path and query parameters, so `/api/events/42` and `/api/events/43` are cached separately
3. On subsequent requests to the same URL, Django returns the cached response without executing the view at all

### When to Use @cache_page vs. Low-Level Cache

| Use @cache_page when... | Use low-level cache API when... |
|------------------------|-------------------------------|
| The entire response is cacheable | Only part of the response is cacheable |
| All users see the same response | Response varies per user |
| Simple invalidation (TTL only) is fine | You need event-driven invalidation |
| You want the quickest win | You need fine-grained control |

For Gather's event detail API, the low-level cache API is better because:
- You want to invalidate the cache immediately when an event is updated (not wait for TTL)
- The RSVP count changes frequently and has a different TTL than the event details
- Some response data is user-specific (whether the current user has RSVP'd)

---

## Applying to Gather: Caching Event Detail Queries

Let's implement caching for Gather's most-hit endpoint, the event detail API. Here's the complete pattern using the low-level cache API.

```python
# events/cache_keys.py

def event_detail_key(event_id: int) -> str:
    """Cache key for full event detail (title, description, venue, organizer)."""
    return f"event:{event_id}"

def event_rsvp_count_key(event_id: int) -> str:
    """Cache key for event RSVP count."""
    return f"event:{event_id}:rsvp_count"

def user_event_rsvp_key(user_id: int, event_id: int) -> str:
    """Cache key for whether a specific user has RSVP'd to an event."""
    return f"user:{user_id}:event:{event_id}:rsvp"
```

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
        # Layer 1: Get event data from cache
        event_cache_key = event_detail_key(event_id)
        event_data = cache.get(event_cache_key)

        if event_data is None:
            # Cache miss: query the database
            try:
                event = Event.objects.select_related(
                    "venue", "organizer"
                ).get(id=event_id, is_published=True)
            except Event.DoesNotExist:
                return Response({"error": "Event not found"}, status=404)

            event_data = EventDetailSerializer(event).data
            cache.set(event_cache_key, event_data, timeout=300)  # 5 minutes

        # Layer 2: Get RSVP count (shorter TTL, changes more often)
        rsvp_cache_key = event_rsvp_count_key(event_id)
        rsvp_count = cache.get(rsvp_cache_key)

        if rsvp_count is None:
            rsvp_count = RSVP.objects.filter(event_id=event_id).count()
            cache.set(rsvp_cache_key, rsvp_count, timeout=30)  # 30 seconds

        event_data["rsvp_count"] = rsvp_count

        # Layer 3: Get user-specific RSVP status (if authenticated)
        if request.user.is_authenticated:
            user_rsvp_key = user_event_rsvp_key(request.user.id, event_id)
            has_rsvpd = cache.get(user_rsvp_key)

            if has_rsvpd is None:
                has_rsvpd = RSVP.objects.filter(
                    event_id=event_id, user=request.user
                ).exists()
                # No TTL: invalidate explicitly when user RSVPs/cancels
                cache.set(user_rsvp_key, has_rsvpd, timeout=None)

            event_data["has_rsvpd"] = has_rsvpd
        else:
            event_data["has_rsvpd"] = False

        return Response(event_data)
```

This implementation uses three separate cache keys with different TTLs:
- **Event data** (300s TTL): Title, description, venue, organizer. Changes rarely.
- **RSVP count** (30s TTL): Changes with every RSVP. Short TTL keeps it reasonably fresh.
- **User RSVP status** (no TTL): Invalidated explicitly when the user RSVPs or cancels. This ensures the UI always reflects the user's last action.

### Testing the Cache

You can verify caching is working by checking Redis:

```bash
# Watch Redis commands in real-time
docker compose exec redis redis-cli -n 1 MONITOR

# In another terminal, hit the API
curl http://localhost:8000/api/events/42/

# You'll see SET commands on the first request:
# "SET" "gather:1:event:42" "{...}" "EX" "300"

# Hit it again:
curl http://localhost:8000/api/events/42/

# You'll see GET commands (no database query):
# "GET" "gather:1:event:42"
```

You can also measure the difference with Django Debug Toolbar or simple timing:

```python
import time
from django.core.cache import cache

# Clear cache to force a miss
cache.delete("event:42")

start = time.time()
# ... fetch event (cache miss, hits DB)
print(f"Cache miss: {(time.time() - start) * 1000:.1f}ms")
# Output: Cache miss: 23.4ms

start = time.time()
# ... fetch event again (cache hit)
print(f"Cache hit: {(time.time() - start) * 1000:.1f}ms")
# Output: Cache hit: 0.8ms
```

---

## Key Takeaways

- `django-redis` connects Django's cache framework to your existing Redis instance, using a separate database (db 1) from Celery (db 0)
- The cache API provides `get`, `set`, `delete`, `get_or_set`, `get_many`, `set_many`, and atomic `incr`/`decr` operations
- Cache keys should follow a consistent `resource:id:sub-resource` naming pattern. Use helper functions to enforce this
- Different data types deserve different TTLs. Rarely-changing event details get 5 minutes, frequently-changing RSVP counts get 30 seconds
- Cache serialized data (dicts, lists), not Django QuerySet objects
- `@cache_page` is the fastest way to add caching but offers the least control. Use the low-level API when you need different TTLs or event-driven invalidation
- Always cache the result of the work (serialized data), not the mechanism (queryset)

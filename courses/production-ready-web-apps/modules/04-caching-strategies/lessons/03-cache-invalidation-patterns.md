---
title: "Cache Invalidation Patterns"
estimatedMinutes: 45
---

# Cache Invalidation Patterns

There's a famous quote in computer science (attributed to Phil Karlton): "There are only two hard things in Computer Science: cache invalidation and naming things."

Cache invalidation is the process of removing or updating cached data when the underlying source data changes. Get it wrong, and your users see stale data (an event shows 45 RSVPs when the actual count is 78). Get it too aggressive, and you invalidate so often that the cache provides no benefit.

In this lesson, you'll learn four invalidation strategies, understand the tradeoffs of each, and implement event-driven invalidation for Gather using Django signals. By the end, when someone RSVPs to a Gather event, the cached RSVP count will be updated immediately, not 30 seconds later when the TTL expires.

---

## Strategy 1: TTL-Based Expiration

The simplest invalidation strategy is no explicit invalidation at all. You set a TTL when you cache the data, and Redis automatically deletes it when the TTL expires. The next request triggers a cache miss, which fetches fresh data from the database.

```python
# Cache event data for 5 minutes
cache.set("event:42", event_data, timeout=300)

# After 300 seconds, Redis deletes the key automatically
# Next request gets a cache miss and fetches fresh data
```

### Pros

- **Simple**: No invalidation code to write or maintain
- **Predictable**: Data is never more than TTL seconds stale
- **Self-healing**: If your invalidation logic has bugs, TTL ensures eventual freshness

### Cons

- **Staleness window**: Data can be up to TTL seconds old. A 5-minute TTL means a user who updates an event title won't see the change for up to 5 minutes.
- **Thundering herd**: When a popular key expires, many concurrent requests all get cache misses simultaneously and all hit the database at once. This can overload the database exactly when you need caching the most.
- **Wasted evictions**: The key expires even if the data hasn't changed. The next request does an unnecessary database query to re-cache the same data.

### When to Use It

TTL-based expiration works well for data where:
- Some staleness is acceptable (event listings, aggregated stats)
- The data changes unpredictably (you can't easily hook into every change)
- The cache is a "nice to have" optimization, not a correctness requirement

You already use this strategy for Gather's event detail cache (300s TTL) and RSVP count (30s TTL) from Lesson 02. It's a good starting point, but for RSVP counts, we can do better.

---

## Strategy 2: Write-Through Cache

In a write-through cache, every write to the database also writes to the cache. The cache is always up to date because updates go to both stores simultaneously.

```python
from django.core.cache import cache
from .cache_keys import event_detail_key

def update_event(event_id, **fields):
    # Step 1: Update the database
    event = Event.objects.get(id=event_id)
    for key, value in fields.items():
        setattr(event, key, value)
    event.save()

    # Step 2: Update the cache with the new data
    data = EventDetailSerializer(event).data
    cache.set(event_detail_key(event_id), data, timeout=300)

    return event
```

### Pros

- **Always fresh**: The cache is updated in the same operation as the database, so reads always return current data
- **No thundering herd**: The key is always populated, so there are no mass cache misses
- **Predictable latency**: Every read is a cache hit (after the first write)

### Cons

- **Write penalty**: Every write is slower because it must update both the database and the cache
- **Consistency risk**: If the cache write fails after the database write succeeds, the cache contains stale data until TTL expires. You need error handling for this case.
- **Wasted writes**: If you cache data that's rarely read, you're doing extra work on every write for no benefit

### Implementation with Error Handling

```python
def update_event(event_id, **fields):
    event = Event.objects.get(id=event_id)
    for key, value in fields.items():
        setattr(event, key, value)
    event.save()

    # Update cache, but don't fail the request if Redis is down
    try:
        data = EventDetailSerializer(event).data
        cache.set(event_detail_key(event_id), data, timeout=300)
    except Exception:
        # Cache write failed. Delete the key so the next read
        # gets fresh data from the database instead of stale cache.
        try:
            cache.delete(event_detail_key(event_id))
        except Exception:
            pass  # Redis is completely down. TTL will handle it.

    return event
```

### When to Use It

Write-through works well when:
- Reads far outnumber writes (event details: read 1000x, updated rarely)
- Freshness is important (user profiles, event titles)
- You control all the write paths (you can add cache updates to every place that modifies the data)

---

## Strategy 3: Cache-Aside (Lazy Loading)

Cache-aside is the pattern you implemented in Lesson 02. The application checks the cache first. On a miss, it loads from the database and populates the cache. The cache is only populated on demand.

```python
def get_event(event_id):
    cache_key = event_detail_key(event_id)

    # Check cache
    data = cache.get(cache_key)
    if data is not None:
        return data  # Cache hit

    # Cache miss: load from database
    event = Event.objects.select_related("venue", "organizer").get(id=event_id)
    data = EventDetailSerializer(event).data

    # Populate cache for next time
    cache.set(cache_key, data, timeout=300)

    return data
```

When data is modified, you **invalidate** (delete) the cache key rather than updating it:

```python
def update_event(event_id, **fields):
    event = Event.objects.get(id=event_id)
    for key, value in fields.items():
        setattr(event, key, value)
    event.save()

    # Invalidate: delete the cache key
    cache.delete(event_detail_key(event_id))
    # Next read will be a cache miss and will fetch fresh data

    return event
```

### Pros

- **Only caches what's needed**: Unlike write-through, you don't cache data that nobody reads
- **Resilient**: If Redis goes down, the application still works (just slower, hitting the database directly)
- **Simple invalidation**: Deleting a key is simpler and more reliable than updating it (you don't need to reconstruct the serialized data)

### Cons

- **Initial latency**: The first request after invalidation is a cache miss (slower)
- **Thundering herd** (same as TTL): After invalidation, multiple concurrent requests all miss and hit the database
- **Stale reads possible**: Between a database write and cache invalidation, a concurrent read can serve stale data from cache

### Cache-Aside vs. Write-Through

| Aspect | Cache-Aside | Write-Through |
|--------|-------------|---------------|
| Cache populated | On read (lazy) | On write (eager) |
| Write speed | Fast (just delete key) | Slower (serialize + store) |
| Read after update | First read is a miss | Always a hit |
| Memory usage | Lower (only caches read data) | Higher (caches all written data) |
| Best for | Read-heavy, many records | Read-heavy, few records |

For Gather, cache-aside is the right default. You have thousands of events, but only a fraction are "hot" (viewed frequently). Caching all of them (write-through) would waste memory on events nobody is viewing.

---

## Strategy 4: Event-Driven Invalidation with Django Signals

This is the strategy you'll implement for Gather. Instead of relying on TTL or manually calling `cache.delete()` in every view that modifies data, you use Django signals to automatically invalidate the cache whenever a model is saved or deleted.

### What Are Django Signals?

Django signals are a notification system. When certain actions happen (a model is saved, a request starts, a user logs in), Django sends a signal. You can register receiver functions that run whenever a specific signal fires.

The two signals you care about for caching:

- **`post_save`**: Fires after a model instance is saved (created or updated)
- **`post_delete`**: Fires after a model instance is deleted

### Implementing Signal-Based Invalidation

Create a signals file in your events app:

```python
# events/signals.py

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
import logging

from .models import Event, RSVP
from .cache_keys import (
    event_detail_key,
    event_rsvp_count_key,
    user_event_rsvp_key,
    event_list_key,
)

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Event)
@receiver(post_delete, sender=Event)
def invalidate_event_cache(sender, instance, **kwargs):
    """Invalidate event detail cache when an event is created, updated, or deleted."""
    cache_key = event_detail_key(instance.id)
    cache.delete(cache_key)
    logger.info(f"Cache invalidated: {cache_key}")

    # Also invalidate listing caches (since the event list may have changed)
    # We use a pattern-based approach here: delete known listing keys
    cache.delete_many([
        event_list_key(page=1),
        event_list_key(page=2),
        event_list_key(page=3),
    ])
    logger.info("Cache invalidated: event listing pages 1-3")


@receiver(post_save, sender=RSVP)
@receiver(post_delete, sender=RSVP)
def invalidate_rsvp_cache(sender, instance, **kwargs):
    """Invalidate RSVP-related caches when an RSVP is created or deleted."""
    event_id = instance.event_id
    user_id = instance.user_id

    # Invalidate the RSVP count for this event
    count_key = event_rsvp_count_key(event_id)
    cache.delete(count_key)
    logger.info(f"Cache invalidated: {count_key}")

    # Invalidate the user's RSVP status for this event
    user_key = user_event_rsvp_key(user_id, event_id)
    cache.delete(user_key)
    logger.info(f"Cache invalidated: {user_key}")
```

### Registering Signals

Django signals must be registered when the app starts. The standard pattern is to import them in your app's `ready()` method:

```python
# events/apps.py

from django.apps import AppConfig


class EventsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "events"

    def ready(self):
        import events.signals  # noqa: F401 (import triggers signal registration)
```

Make sure your app is in `INSTALLED_APPS`:

```python
# gather/settings.py

INSTALLED_APPS = [
    # ...
    "events.apps.EventsConfig",
]
```

### How It Works End to End

Here's the complete flow when a user RSVPs to an event:

```
1. POST /api/events/42/rsvp/
   └── View creates RSVP object: RSVP.objects.create(event_id=42, user=request.user)

2. Django saves the RSVP to PostgreSQL
   └── post_save signal fires

3. invalidate_rsvp_cache() runs:
   └── Deletes "event:42:rsvp_count" from Redis
   └── Deletes "user:15:event:42:rsvp" from Redis

4. Next request for event 42:
   └── cache.get("event:42:rsvp_count") returns None (cache miss)
   └── Query: SELECT COUNT(*) FROM rsvps WHERE event_id = 42 → 128
   └── cache.set("event:42:rsvp_count", 128, timeout=30)
   └── Response includes rsvp_count: 128 (fresh data)
```

The RSVP count is always accurate, and you didn't have to remember to invalidate the cache in every view that creates or deletes RSVPs.

---

## Versioned Cache Keys

Sometimes you need to invalidate a group of related keys, but you don't know all the specific keys. For example, Gather's event listing supports filtering and pagination:

```python
"events:upcoming:page:1"
"events:upcoming:page:2"
"events:category:tech:page:1"
"events:category:music:page:1"
# ... potentially dozens of combinations
```

When an event is created or updated, all of these listing caches are stale. You could try to delete them all, but you'd need to track every combination of filters and pages. Instead, use **versioned cache keys**.

### The Version Pattern

Add a version number to your cache keys. When you want to invalidate all keys in a group, increment the version. Old keys become unreachable (they'll expire via TTL later), and new requests create fresh keys with the new version.

```python
# events/cache_keys.py

from django.core.cache import cache

def _get_event_list_version() -> int:
    """Get the current version number for event list caches."""
    version = cache.get("events:list_version")
    if version is None:
        version = 1
        cache.set("events:list_version", version, timeout=None)
    return version

def bump_event_list_version() -> int:
    """Increment the version, invalidating all event list caches."""
    try:
        return cache.incr("events:list_version")
    except ValueError:
        # Key doesn't exist, initialize it
        cache.set("events:list_version", 1, timeout=None)
        return 1

def event_list_key(category: str = None, page: int = 1) -> str:
    """Generate a versioned cache key for event listings."""
    version = _get_event_list_version()
    if category:
        return f"events:v{version}:category:{category}:page:{page}"
    return f"events:v{version}:upcoming:page:{page}"
```

### Using Versioned Keys

```python
# In your event list view
def get_events(request):
    page = int(request.GET.get("page", 1))
    category = request.GET.get("category")
    cache_key = event_list_key(category=category, page=page)

    data = cache.get(cache_key)
    if data is None:
        # Fetch from database and cache
        events = Event.objects.filter(is_published=True)
        if category:
            events = events.filter(category=category)
        paginator = Paginator(events, 20)
        page_obj = paginator.get_page(page)
        data = EventListSerializer(page_obj, many=True).data
        cache.set(cache_key, data, timeout=120)

    return Response(data)
```

```python
# In your signal handler
@receiver(post_save, sender=Event)
@receiver(post_delete, sender=Event)
def invalidate_event_cache(sender, instance, **kwargs):
    # Invalidate the specific event detail
    cache.delete(event_detail_key(instance.id))

    # Invalidate ALL event listing caches by bumping the version
    new_version = bump_event_list_version()
    logger.info(f"Event list cache version bumped to v{new_version}")
```

When the version bumps from `v3` to `v4`, all existing listing keys like `events:v3:upcoming:page:1` become orphaned. No request will ever look them up again. They'll sit in Redis until their TTL expires and Redis evicts them.

This is a small memory tradeoff (orphaned keys use space briefly) in exchange for simple, reliable invalidation of an arbitrary number of related keys.

---

## Handling Bulk Operations

Django signals work great for individual model saves, but they have a gap: **bulk operations bypass signals**.

```python
# This fires post_save for each RSVP... but creates N+1 database queries
for user_id in user_ids:
    RSVP.objects.create(event_id=42, user_id=user_id)
    # Signal fires for each one ✓

# This is faster (single INSERT)... but does NOT fire any signals
RSVP.objects.bulk_create([
    RSVP(event_id=42, user_id=uid) for uid in user_ids
])
# No signals fired ✗
```

The same applies to `QuerySet.update()`, `QuerySet.delete()`, and raw SQL queries. These are faster because they bypass the ORM's per-instance processing, but that also means they bypass signals.

### Solutions

**Option 1: Manually invalidate after bulk operations.**

```python
# Bulk create RSVPs
RSVP.objects.bulk_create(rsvp_objects)

# Manually invalidate the cache
cache.delete(event_rsvp_count_key(event_id))
for rsvp in rsvp_objects:
    cache.delete(user_event_rsvp_key(rsvp.user_id, event_id))
```

**Option 2: Create a helper function that wraps bulk operations with invalidation.**

```python
# events/services.py

from django.core.cache import cache
from .models import RSVP
from .cache_keys import event_rsvp_count_key, user_event_rsvp_key

def bulk_create_rsvps(event_id: int, user_ids: list[int]) -> list[RSVP]:
    """Create multiple RSVPs and invalidate related caches."""
    rsvps = RSVP.objects.bulk_create([
        RSVP(event_id=event_id, user_id=uid) for uid in user_ids
    ])

    # Invalidate caches
    keys_to_delete = [event_rsvp_count_key(event_id)]
    keys_to_delete.extend(
        user_event_rsvp_key(uid, event_id) for uid in user_ids
    )
    cache.delete_many(keys_to_delete)

    return rsvps
```

**Option 3: Always use the ORM's per-instance methods for operations that affect cached data.** This is the safest approach, at the cost of performance for large bulk operations.

For Gather, Option 2 is the best balance. RSVPs are created one at a time in normal usage (users RSVP individually), so signals handle 99% of cases. For the rare bulk import scenario, you use the service function.

---

## Putting It All Together: Gather's Invalidation Strategy

Here's a summary of the invalidation approach for each type of cached data in Gather:

| Cached Data | Strategy | Trigger | TTL (Safety Net) |
|-------------|----------|---------|------------------|
| Event detail | Signal-based (post_save/post_delete on Event) | Event created/updated/deleted | 300s |
| RSVP count | Signal-based (post_save/post_delete on RSVP) | RSVP created/deleted | 30s |
| User RSVP status | Signal-based (post_save/post_delete on RSVP) | RSVP created/deleted | None (explicit only) |
| Event listings | Versioned keys + signal on Event | Event created/updated/deleted | 120s |
| Aggregate stats | TTL only | N/A | 600s |

This combines the best of all strategies:
- **Signals** for immediate invalidation of data that must be fresh
- **Versioned keys** for efficient invalidation of groups of related keys
- **TTL as a safety net** for everything, ensuring eventual freshness even if invalidation logic has a bug
- **No TTL for user-specific data** that is invalidated explicitly and must reflect the user's own actions immediately

---

## Debugging Cache Invalidation

When your data is stale and you're not sure why, here are debugging techniques:

### Check If the Key Exists

```bash
docker compose exec redis redis-cli -n 1
127.0.0.1:6379[1]> EXISTS gather:1:event:42
(integer) 1  # Key exists (might be stale)

127.0.0.1:6379[1]> TTL gather:1:event:42
(integer) 187  # Expires in 187 seconds

127.0.0.1:6379[1]> GET gather:1:event:42
# Shows the cached JSON, so you can compare it with the database
```

### Watch Signal Execution

```python
# Add logging to your signal handlers
@receiver(post_save, sender=RSVP)
def invalidate_rsvp_cache(sender, instance, **kwargs):
    logger.info(
        f"post_save signal fired for RSVP: "
        f"event_id={instance.event_id}, user_id={instance.user_id}"
    )
    # ... invalidation logic
```

Then check your logs:

```bash
docker compose logs -f django | grep "signal fired"
```

### Monitor Redis Commands

```bash
# Watch all commands hitting Redis in real-time
docker compose exec redis redis-cli -n 1 MONITOR
```

When you save an event, you should see `DEL` commands from your signal handlers. If you don't, the signal isn't firing (check that `events/signals.py` is imported in `ready()`).

### Common Pitfalls

1. **Forgot to import signals in `ready()`**: The signal handlers exist but are never registered. Django doesn't error. It just silently doesn't fire them.

2. **Using `bulk_create`/`update()`/`delete()` QuerySet methods**: These bypass signals. Wrap them with manual invalidation.

3. **Cache key mismatch**: The key you invalidate doesn't match the key you read. Use the same helper functions for both operations.

4. **Signal fires before commit**: By default, `post_save` fires before the database transaction is committed. If another request reads the cache, gets a miss, and queries the database before the transaction commits, it caches the old data. Use `transaction.on_commit()` for critical invalidation:

```python
from django.db import transaction

@receiver(post_save, sender=RSVP)
def invalidate_rsvp_cache(sender, instance, **kwargs):
    def do_invalidation():
        cache.delete(event_rsvp_count_key(instance.event_id))
        cache.delete(user_event_rsvp_key(instance.user_id, instance.event_id))

    transaction.on_commit(do_invalidation)
```

This ensures the cache is invalidated only after the new data is committed and visible to other database queries.

---

## Key Takeaways

- TTL-based expiration is the simplest strategy but allows staleness up to the TTL duration
- Write-through caches update cache on every write, ensuring freshness at the cost of write latency
- Cache-aside (lazy loading) only caches data on read, keeping memory usage efficient
- Django signals (`post_save`, `post_delete`) enable automatic cache invalidation without scattering `cache.delete()` calls throughout your views
- Versioned cache keys let you invalidate groups of related keys (like paginated listings) by incrementing a version number
- Bulk ORM operations (`bulk_create`, `update()`, `delete()`) bypass signals. Wrap them with manual invalidation.
- Always use TTL as a safety net, even when you have explicit invalidation. Invalidation logic can have bugs.
- Use `transaction.on_commit()` for cache invalidation to avoid race conditions between cache deletion and database commit

---
title: "HTTP Caching"
estimatedMinutes: 35
---

# HTTP Caching

So far, you've been caching data inside your application. Redis sits between Django and PostgreSQL, reducing database queries. But every request still reaches Django. The server still processes the URL, runs middleware, checks the cache, serializes the response, and sends it back over the network.

HTTP caching takes this a step further. By setting the right response headers, you tell browsers and intermediary proxies to cache the response. Subsequent requests for the same resource never reach your server at all. The browser serves the response from its local cache, or a proxy serves it from a shared cache. Zero latency from your server's perspective, because the request never arrives.

In this lesson, you'll learn how HTTP caching works, master the `Cache-Control` header and its directives, implement conditional requests with ETags, and apply these to Gather's event listing API.

---

## How HTTP Caching Works

HTTP caching is built into the protocol itself. When your server sends a response, it can include headers that tell downstream caches (browsers, proxies, CDNs) whether and how long to cache the response.

```
Client Request → CDN → Reverse Proxy → Django
                  ↕         ↕
              CDN Cache   Proxy Cache
                  ↕
            Browser Cache
```

Each layer in this chain can store a copy of the response. On the next request for the same URL, the closest cache with a valid copy returns it immediately.

### The Two Questions of HTTP Caching

Every caching decision comes down to two questions:

1. **Is this response cacheable?** (Determined by `Cache-Control` headers)
2. **Is the cached copy still valid?** (Determined by TTL, ETags, or `Last-Modified`)

---

## Cache-Control Headers

The `Cache-Control` header is the primary mechanism for controlling HTTP caching. It's a comma-separated list of directives that tell caches what to do with the response.

### Core Directives

#### `max-age=<seconds>`

Tells the cache to store the response and serve it without contacting the server for the specified number of seconds.

```http
Cache-Control: max-age=300
```

This means: "This response is valid for 5 minutes. Don't bother the server again during that time."

After 300 seconds, the cached copy is considered "stale." The cache will contact the server to get a fresh copy (or validate the existing one).

#### `s-maxage=<seconds>`

Same as `max-age`, but only applies to **shared caches** (CDNs, reverse proxies). Private caches (browsers) ignore it and use `max-age` instead.

```http
Cache-Control: max-age=60, s-maxage=300
```

This means: "Browsers, cache for 1 minute. CDNs, cache for 5 minutes."

Why different values? You might want the CDN to cache aggressively (reducing server load), while keeping the browser cache short so users see updates sooner when they refresh the page.

#### `no-cache`

Despite its name, `no-cache` does **not** prevent caching. It means: "You can store this response, but you must validate it with the server before using it."

```http
Cache-Control: no-cache
```

The cache stores the response but sends a conditional request (using ETags or `Last-Modified`) to the server before serving the cached copy. If the server confirms the data hasn't changed, the cache serves the stored copy without downloading the response body again. This is called **revalidation**.

#### `no-store`

This actually prevents caching. The response must not be stored by any cache, period.

```http
Cache-Control: no-store
```

Use this for sensitive data: authentication responses, payment details, personal account pages.

#### `private`

The response is intended for a single user and must not be stored by shared caches (CDNs, proxies). Only the user's browser can cache it.

```http
Cache-Control: private, max-age=60
```

Use this for user-specific data: "My RSVPs," "My profile," authenticated API responses.

#### `public`

The response can be stored by any cache, including shared caches. This is the default for most responses, but explicitly declaring it is useful when the response includes an `Authorization` header (which normally prevents shared caching).

```http
Cache-Control: public, max-age=300, s-maxage=600
```

### Common Header Combinations for Gather

```python
# Event listing API (public, read by everyone)
# CDN caches for 5 minutes, browsers for 1 minute
Cache-Control: public, max-age=60, s-maxage=300

# Event detail API (public, high traffic)
# CDN caches for 2 minutes, browsers for 30 seconds
Cache-Control: public, max-age=30, s-maxage=120

# User's RSVP status (user-specific, must not be shared)
# Browser only, revalidate every time
Cache-Control: private, no-cache

# Authentication endpoints (sensitive, never cache)
Cache-Control: no-store

# Static assets (CSS, JS, images with hashed filenames)
# Cache for 1 year (content-addressed, filename changes on update)
Cache-Control: public, max-age=31536000, immutable
```

---

## ETags and Conditional Requests

ETags (Entity Tags) let caches validate whether their stored copy is still current without downloading the full response body. This is particularly valuable for large API responses.

### How ETags Work

1. The server includes an `ETag` header in the response. The ETag is a string that uniquely identifies the response content (typically a hash).

```http
HTTP/1.1 200 OK
Content-Type: application/json
ETag: "a1b2c3d4e5"
Cache-Control: no-cache

{"title": "Brooklyn Tech Meetup", "rsvp_count": 127}
```

2. On the next request, the client sends the ETag back in an `If-None-Match` header:

```http
GET /api/events/42/ HTTP/1.1
If-None-Match: "a1b2c3d4e5"
```

3. The server compares the ETag with the current content:
   - **If it matches**: The data hasn't changed. Server responds with `304 Not Modified` and an empty body. The client uses its cached copy.
   - **If it doesn't match**: The data has changed. Server responds with `200 OK` and the full response body plus a new ETag.

```http
HTTP/1.1 304 Not Modified
ETag: "a1b2c3d4e5"
```

The 304 response is tiny (just headers, no body), so it's much faster than sending the full response even though the request still reaches the server.

### Implementing ETags in Django

Django has built-in support for ETags via the `@condition` decorator and the `ConditionalGetMiddleware`.

#### Option 1: ConditionalGetMiddleware (Automatic)

Add the middleware to your settings:

```python
# gather/settings.py

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.cache.UpdateCacheMiddleware",     # Must be first cache middleware
    "django.middleware.common.CommonMiddleware",
    "django.middleware.cache.FetchFromCacheMiddleware",  # Must be last cache middleware
    # ...
    "django.middleware.http.ConditionalGetMiddleware",   # Handles ETags
]
```

This middleware automatically:
- Generates an ETag by hashing the response content (using MD5)
- Checks incoming `If-None-Match` headers
- Returns `304 Not Modified` when the ETag matches

The downside is that Django still executes the entire view to generate the response content before it can compute the ETag. You save bandwidth but not server-side processing.

#### Option 2: The @condition Decorator (Efficient)

The `@condition` decorator lets you compute the ETag without generating the full response. If the ETag matches, Django skips the view entirely.

```python
# events/views.py

from django.views.decorators.http import condition
from django.core.cache import cache
import hashlib

def event_etag(request, event_id):
    """Compute an ETag based on the event's last modification time and RSVP count."""
    # Use cached data to compute the ETag without hitting the database
    event_data = cache.get(f"event:{event_id}")
    rsvp_count = cache.get(f"event:{event_id}:rsvp_count")

    if event_data is None or rsvp_count is None:
        return None  # No ETag available, proceed with full response

    # Create a hash from the data that affects the response
    raw = f"{event_data.get('updated_at')}:{rsvp_count}"
    return hashlib.md5(raw.encode()).hexdigest()


@condition(etag_func=event_etag)
def event_detail(request, event_id):
    """Full event detail view. Only executes if ETag doesn't match."""
    # ... normal view logic
```

For DRF views, you can implement ETags manually:

```python
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.cache import cache
import hashlib

class EventDetailView(APIView):
    def get(self, request, event_id):
        # Get cached data
        cache_key = f"event:{event_id}"
        event_data = cache.get(cache_key)

        if event_data is None:
            event = Event.objects.select_related("venue", "organizer").get(
                id=event_id, is_published=True
            )
            event_data = EventDetailSerializer(event).data
            cache.set(cache_key, event_data, timeout=300)

        rsvp_count = cache.get(f"event:{event_id}:rsvp_count")
        if rsvp_count is None:
            rsvp_count = RSVP.objects.filter(event_id=event_id).count()
            cache.set(f"event:{event_id}:rsvp_count", rsvp_count, timeout=30)

        event_data["rsvp_count"] = rsvp_count

        # Compute ETag from the response data
        content_hash = hashlib.md5(
            str(event_data).encode()
        ).hexdigest()
        etag = f'"{content_hash}"'

        # Check If-None-Match header
        if_none_match = request.META.get("HTTP_IF_NONE_MATCH")
        if if_none_match == etag:
            return Response(status=304)

        response = Response(event_data)
        response["ETag"] = etag
        response["Cache-Control"] = "public, max-age=30, s-maxage=120"
        return response
```

---

## Last-Modified and If-Modified-Since

`Last-Modified` is an alternative to ETags that uses timestamps instead of hashes. The server sends the last modification time:

```http
HTTP/1.1 200 OK
Last-Modified: Sat, 14 Mar 2026 15:30:00 GMT
```

The client sends it back on the next request:

```http
GET /api/events/42/ HTTP/1.1
If-Modified-Since: Sat, 14 Mar 2026 15:30:00 GMT
```

If the data hasn't been modified since that timestamp, the server returns `304 Not Modified`.

```python
from django.views.decorators.http import condition
from django.utils.http import http_date

def event_last_modified(request, event_id):
    """Return the last modification time for an event."""
    try:
        event = Event.objects.only("updated_at").get(id=event_id)
        return event.updated_at
    except Event.DoesNotExist:
        return None

@condition(last_modified_func=event_last_modified)
def event_detail(request, event_id):
    # ... view logic
```

### ETags vs. Last-Modified

| Aspect | ETags | Last-Modified |
|--------|-------|---------------|
| Precision | Byte-level (hash of content) | Second-level (timestamp) |
| Computation | Must generate hash | Just read a timestamp |
| Best for | API responses, dynamic content | Static files, simple resources |
| Multiple factors | Can incorporate any data into hash | Only one timestamp |

For Gather's API responses, ETags are the better choice because the response depends on multiple factors (event data, RSVP count, user RSVP status).

---

## The Vary Header

The `Vary` header tells caches that the response depends on specific request headers. Without it, a cache might serve the wrong version of a response.

### The Problem

Gather's event detail API returns different data depending on whether the user is authenticated:
- **Anonymous**: No `has_rsvpd` field
- **Authenticated**: Includes `has_rsvpd: true/false`

If a CDN caches the anonymous version and serves it to an authenticated user, that user won't see their RSVP status.

### The Solution

```http
Vary: Authorization, Accept
```

This tells caches: "The response varies based on the `Authorization` and `Accept` headers. Cache separate versions for each unique combination of these header values."

```python
class EventDetailView(APIView):
    def get(self, request, event_id):
        # ... build response ...

        response = Response(event_data)

        if request.user.is_authenticated:
            # User-specific response, don't share across users
            response["Cache-Control"] = "private, no-cache"
        else:
            # Anonymous response, safe to share
            response["Cache-Control"] = "public, max-age=30, s-maxage=120"
            response["Vary"] = "Accept"

        return response
```

### Common Vary Values

- **`Vary: Accept`**: Response format varies (JSON vs. HTML)
- **`Vary: Authorization`**: Response varies by authenticated user (use with caution, can reduce CDN hit ratio dramatically)
- **`Vary: Accept-Encoding`**: Response varies by compression (gzip vs. brotli). Usually handled by the web server automatically.
- **`Vary: Accept-Language`**: Response varies by language (if you have i18n)

**Warning**: `Vary: Authorization` effectively makes every authenticated user get their own cached copy, which can balloon CDN storage. For user-specific data, prefer `Cache-Control: private` (browser-only caching) over `Vary: Authorization`.

---

## Django's Cache Middleware

Django provides three middleware classes for HTTP caching. You've already seen `ConditionalGetMiddleware` for ETags. The other two handle full response caching.

### UpdateCacheMiddleware and FetchFromCacheMiddleware

These work as a pair. `UpdateCacheMiddleware` stores responses in the cache. `FetchFromCacheMiddleware` serves cached responses without executing the view.

```python
# gather/settings.py

MIDDLEWARE = [
    "django.middleware.cache.UpdateCacheMiddleware",     # Must be FIRST
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    # ... other middleware ...
    "django.middleware.cache.FetchFromCacheMiddleware",  # Must be LAST
]

# Site-wide cache settings
CACHE_MIDDLEWARE_ALIAS = "default"       # Which cache backend to use
CACHE_MIDDLEWARE_SECONDS = 600           # Default cache time (10 minutes)
CACHE_MIDDLEWARE_KEY_PREFIX = "http"     # Prefix to separate from app cache keys
```

This caches every page site-wide, which is too aggressive for most applications. For Gather, you should use per-view caching instead.

### Per-View Cache Headers with a Decorator

A more targeted approach is to set `Cache-Control` headers per view:

```python
from django.views.decorators.cache import cache_control

@cache_control(public=True, max_age=30, s_maxage=120)
def event_list(request):
    # ... view logic
    return JsonResponse(data)

@cache_control(private=True, no_cache=True)
def my_rsvps(request):
    # ... view logic
    return JsonResponse(data)

@cache_control(no_store=True)
def login(request):
    # ... view logic
    return JsonResponse(data)
```

For DRF class-based views, apply the decorator using `method_decorator`:

```python
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control

class EventListView(APIView):
    @method_decorator(cache_control(public=True, max_age=60, s_maxage=300))
    def get(self, request):
        events = Event.objects.filter(is_published=True)
        data = EventListSerializer(events, many=True).data
        return Response(data)
```

---

## Applying to Gather: Event Listing API Headers

Let's implement proper HTTP caching headers for Gather's event listing and detail APIs.

```python
# events/views.py

import hashlib
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.cache import cache
from .cache_keys import event_list_key, event_detail_key, event_rsvp_count_key


class EventListView(APIView):
    """
    GET /api/events/
    Public endpoint. Cache aggressively at CDN and browser.
    """
    @method_decorator(cache_control(public=True, max_age=60, s_maxage=300))
    def get(self, request):
        page = int(request.query_params.get("page", 1))
        category = request.query_params.get("category")
        cache_key = event_list_key(category=category, page=page)

        data = cache.get(cache_key)
        if data is None:
            events = Event.objects.filter(is_published=True).select_related("venue")
            if category:
                events = events.filter(category=category)
            paginator = Paginator(events, 20)
            page_obj = paginator.get_page(page)
            data = {
                "events": EventListSerializer(page_obj, many=True).data,
                "total_pages": paginator.num_pages,
                "current_page": page,
            }
            cache.set(cache_key, data, timeout=120)

        # Compute ETag from cached data
        content_hash = hashlib.md5(str(data).encode()).hexdigest()
        etag = f'"{content_hash}"'

        if_none_match = request.META.get("HTTP_IF_NONE_MATCH")
        if if_none_match == etag:
            return Response(status=304)

        response = Response(data)
        response["ETag"] = etag
        response["Vary"] = "Accept"
        return response


class EventDetailView(APIView):
    """
    GET /api/events/<id>/
    Mixed: public data + optional user-specific data.
    """
    def get(self, request, event_id):
        # Fetch event data (from Redis or DB)
        event_data = cache.get(event_detail_key(event_id))
        if event_data is None:
            try:
                event = Event.objects.select_related(
                    "venue", "organizer"
                ).get(id=event_id, is_published=True)
            except Event.DoesNotExist:
                return Response({"error": "Event not found"}, status=404)
            event_data = EventDetailSerializer(event).data
            cache.set(event_detail_key(event_id), event_data, timeout=300)

        rsvp_count = cache.get(event_rsvp_count_key(event_id))
        if rsvp_count is None:
            rsvp_count = RSVP.objects.filter(event_id=event_id).count()
            cache.set(event_rsvp_count_key(event_id), rsvp_count, timeout=30)
        event_data["rsvp_count"] = rsvp_count

        # Build response with appropriate caching headers
        response = Response(event_data)

        if request.user.is_authenticated:
            # User-specific: check RSVP status, private cache only
            has_rsvpd = RSVP.objects.filter(
                event_id=event_id, user=request.user
            ).exists()
            event_data["has_rsvpd"] = has_rsvpd
            response = Response(event_data)
            response["Cache-Control"] = "private, no-cache"
        else:
            # Anonymous: public, CDN-cacheable
            content_hash = hashlib.md5(str(event_data).encode()).hexdigest()
            etag = f'"{content_hash}"'

            if_none_match = request.META.get("HTTP_IF_NONE_MATCH")
            if if_none_match == etag:
                return Response(status=304)

            response["ETag"] = etag
            response["Cache-Control"] = "public, max-age=30, s-maxage=120"
            response["Vary"] = "Accept"

        return response
```

### Testing with curl

You can verify your caching headers with `curl -v`:

```bash
# First request: full response
curl -v http://localhost:8000/api/events/ 2>&1 | grep -E "(< HTTP|< Cache|< ETag|< Vary)"
# < HTTP/1.1 200 OK
# < Cache-Control: public, max-age=60, s-maxage=300
# < ETag: "a1b2c3d4e5f6"
# < Vary: Accept

# Second request with ETag: should get 304
curl -v -H 'If-None-Match: "a1b2c3d4e5f6"' http://localhost:8000/api/events/ 2>&1 | grep "< HTTP"
# < HTTP/1.1 304 Not Modified
```

The 304 response is much smaller than the full 200 response, saving bandwidth. Combined with CDN caching (`s-maxage=300`), most users won't even reach your server.

---

## Key Takeaways

- HTTP caching headers (`Cache-Control`, `ETag`, `Vary`) tell browsers and CDNs whether and how long to cache responses
- `max-age` controls browser cache duration. `s-maxage` controls shared cache (CDN) duration. Use both for different strategies at each layer.
- `no-cache` means "revalidate before using." `no-store` means "never cache." These are not the same.
- ETags enable conditional requests: the server can respond with `304 Not Modified` when the data hasn't changed, saving bandwidth
- The `Vary` header prevents caches from serving the wrong response when output depends on request headers
- Use `private` for user-specific data (browser caching only) and `public` for shared data (CDN caching allowed)
- Set caching headers per view, not site-wide. Different endpoints have different caching requirements.
- Django's `@cache_control` decorator and `ConditionalGetMiddleware` make implementation straightforward

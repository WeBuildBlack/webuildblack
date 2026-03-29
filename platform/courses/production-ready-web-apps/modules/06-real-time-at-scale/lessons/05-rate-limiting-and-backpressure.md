---
title: "Rate Limiting and Backpressure"
estimatedMinutes: 35
---

# Rate Limiting and Backpressure

You have a live RSVP system that scales across multiple instances. Now you need to protect it. Without rate limiting, a single user (or bot) can slam your RSVP endpoint hundreds of times per second, flooding Redis Pub/Sub with messages, overloading your SSE connections, and potentially exhausting your database connections.

This lesson covers two sides of the same problem: rate limiting (preventing abuse at the front door) and backpressure (handling overload gracefully when it happens anyway).

## Why Rate Limiting Matters for Real-Time

Rate limiting is important for any API, but real-time systems amplify the impact of abuse. Here is why.

In a normal REST API, one abusive client sends 100 requests. Your server handles 100 extra requests. That is it.

In a real-time system, one abusive client sends 100 RSVP requests. Each one triggers a Celery task, which publishes to Redis Pub/Sub, which delivers a message to every connected SSE client. If 1,000 people are watching the event, those 100 abusive requests generate 100,000 SSE messages. The amplification factor is massive.

```
1 abusive request
    ├── 1 database write
    ├── 1 Celery task
    ├── 1 Redis Pub/Sub message
    └── 1,000 SSE deliveries (one per connected client)

100 abusive requests = 100,000 SSE deliveries
```

## Rate Limiting Algorithms

Before implementing anything, let's understand the two most common algorithms.

### Token Bucket

Imagine a bucket that holds tokens. It starts full and refills at a steady rate. Each request costs one token. If the bucket is empty, the request is rejected.

```
Bucket capacity: 10 tokens
Refill rate: 1 token per 6 seconds (10 per minute)

Time 0:00  - Bucket: 10 tokens
Request 1  - Bucket: 9 tokens  ✅
Request 2  - Bucket: 8 tokens  ✅
...
Request 10 - Bucket: 0 tokens  ✅
Request 11 - Bucket: 0 tokens  ❌ (rejected)
Time 0:06  - Bucket: 1 token   (refilled)
Request 12 - Bucket: 0 tokens  ✅
```

**Characteristics:**
- Allows short bursts up to the bucket capacity
- Smooths out to the refill rate over time
- Simple to implement with Redis

### Sliding Window

Count requests within a moving time window. If the count exceeds the limit, reject the request.

```
Window: 1 minute
Limit: 10 requests per window

Time 0:00  - Count: 0/10
Request at 0:05 - Count: 1/10  ✅
Request at 0:10 - Count: 2/10  ✅
...
Request at 0:50 - Count: 10/10 ✅
Request at 0:55 - Count: 10/10 ❌ (rejected)
Time 1:05  - First request drops off window
Request at 1:06 - Count: 10/10 ✅
```

**Characteristics:**
- More predictable than token bucket (no bursts)
- More memory-intensive (needs to track timestamps)
- Better for strict per-minute/per-hour limits

### Which to Use

For Gather's RSVP endpoint, a sliding window is the better choice. We want a hard limit of 10 RSVPs per minute per user, with no burst allowance. An RSVP is a deliberate action; there is no legitimate reason to RSVP 10 times in rapid succession.

## Implementing Rate Limiting with Django

### Using django-ratelimit

The `django-ratelimit` package provides a decorator that makes rate limiting straightforward:

```bash
pip install django-ratelimit
```

```python
# events/views.py
from django_ratelimit.decorators import ratelimit
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@ratelimit(key='user', rate='10/m', method='POST', block=True)
def create_rsvp(request, event_id):
    """Create an RSVP. Rate limited to 10 per minute per user."""
    # ... (same implementation as before)
```

The `@ratelimit` decorator:
- `key='user'`: Rate limit per authenticated user
- `rate='10/m'`: 10 requests per minute
- `method='POST'`: Only rate limit POST requests
- `block=True`: Return 403 Forbidden when rate limit is exceeded

### Custom Rate Limit Response

By default, `django-ratelimit` returns a generic 403 response. Let's customize it to return a proper JSON error with rate limit headers:

```python
# events/middleware.py
from django.http import JsonResponse
from django_ratelimit.exceptions import Ratelimited


class RateLimitMiddleware:
    """Return a JSON response with rate limit headers on 429."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        if isinstance(exception, Ratelimited):
            return JsonResponse(
                {
                    'error': 'Rate limit exceeded',
                    'detail': 'Too many requests. Please try again later.',
                    'retry_after': 60,
                },
                status=429,
                headers={
                    'Retry-After': '60',
                    'X-RateLimit-Limit': '10',
                },
            )
        return None
```

```python
# settings.py
MIDDLEWARE = [
    # ... other middleware ...
    'events.middleware.RateLimitMiddleware',
]

# Use block=False so the exception is raised (middleware catches it)
RATELIMIT_EXCEPTION_CLASS = 'django_ratelimit.exceptions.Ratelimited'
```

### Rate Limiting with Redis Backend

By default, `django-ratelimit` uses Django's cache framework. For a multi-instance deployment, you need a shared backend. Redis is the obvious choice since we already have it:

```python
# settings.py
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://localhost:6379/0'),
    }
}

# django-ratelimit will use the default cache
RATELIMIT_USE_CACHE = 'default'
```

This ensures that rate limit counters are shared across all Django instances. A user who sends 5 requests to Django-1 and 5 requests to Django-2 hits the limit at 10 total, not 10 per instance.

### DRF Throttling (Alternative)

If you prefer to use Django REST Framework's built-in throttling instead of `django-ratelimit`:

```python
# events/throttles.py
from rest_framework.throttling import UserRateThrottle


class RSVPRateThrottle(UserRateThrottle):
    rate = '10/min'
    scope = 'rsvp'
```

```python
# events/views.py
from events.throttles import RSVPRateThrottle

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_rsvp(request, event_id):
    """Create an RSVP. Rate limited to 10 per minute per user."""
    # DRF throttling is applied via throttle_classes
    request.throttle_classes = [RSVPRateThrottle]
    # ... rest of the view
```

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_RATES': {
        'rsvp': '10/min',
    },
}
```

DRF throttling returns a `429 Too Many Requests` response automatically with a `Retry-After` header. It is well-integrated with DRF's error handling.

### Handling Rate Limits on the Client

The Next.js frontend should handle 429 responses gracefully:

```typescript
// lib/api.ts
export async function createRSVP(eventId: number): Promise<RSVPResult> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/events/${eventId}/rsvp/`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.status === 429) {
    const data = await response.json();
    const retryAfter = parseInt(
      response.headers.get('Retry-After') || '60'
    );
    throw new RateLimitError(
      data.detail || 'Too many requests',
      retryAfter
    );
  }

  if (!response.ok) {
    throw new Error('Failed to RSVP');
  }

  return response.json();
}

class RateLimitError extends Error {
  retryAfter: number;
  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}
```

```tsx
// components/RSVPButton.tsx
'use client';

import { useState } from 'react';
import { createRSVP } from '@/lib/api';

export function RSVPButton({ eventId }: { eventId: number }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(
    'idle'
  );
  const [error, setError] = useState<string | null>(null);

  const handleRSVP = async () => {
    setStatus('loading');
    setError(null);

    try {
      await createRSVP(eventId);
      setStatus('done');
    } catch (err) {
      if (err instanceof RateLimitError) {
        setError(
          `Slow down. Try again in ${err.retryAfter} seconds.`
        );
      } else {
        setError('Something went wrong. Please try again.');
      }
      setStatus('error');
    }
  };

  return (
    <div>
      <button
        onClick={handleRSVP}
        disabled={status === 'loading' || status === 'done'}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        {status === 'done' ? 'RSVPed!' : 'RSVP'}
      </button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}
```

## Backpressure

Rate limiting prevents abuse at the front door. Backpressure handles what happens when the system is overwhelmed despite rate limiting. Maybe a viral event gets 50,000 RSVPs in an hour. Each one is legitimate, but the volume is still more than the system can handle in real time.

### What Is Backpressure?

Backpressure is a system's ability to push back when it cannot keep up with incoming work. Without backpressure, work piles up indefinitely until something crashes.

Think of it like a sink. Water flows in from the faucet (incoming requests). Water drains out (processed requests). If the water flows in faster than it drains, the sink fills up. Without backpressure, the sink overflows and floods the kitchen. With backpressure, you turn the faucet down or let water overflow into a drain instead of onto the floor.

### Monitoring Queue Depth

The first step is knowing when you are falling behind. Monitor the Celery task queue depth:

```python
# events/monitoring.py
import redis
from django.conf import settings


def get_queue_depth(queue_name='celery'):
    """Get the number of pending tasks in a Celery queue."""
    r = redis.Redis.from_url(settings.REDIS_URL)
    return r.llen(queue_name)


def check_system_health():
    """Check if the system is keeping up with incoming work."""
    depth = get_queue_depth()

    if depth > 1000:
        return {
            'status': 'overloaded',
            'queue_depth': depth,
            'recommendation': 'Enable degraded mode',
        }
    elif depth > 100:
        return {
            'status': 'busy',
            'queue_depth': depth,
            'recommendation': 'Monitor closely',
        }
    else:
        return {
            'status': 'healthy',
            'queue_depth': depth,
        }
```

### Graceful Degradation

When the system is overloaded, serve cached data instead of real-time data. This keeps the application working even when the real-time pipeline is backed up.

```python
# events/views.py
from django.core.cache import cache
from events.monitoring import get_queue_depth


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@ratelimit(key='user', rate='10/m', method='POST', block=True)
def create_rsvp(request, event_id):
    """Create an RSVP with backpressure awareness."""

    # Check system health
    queue_depth = get_queue_depth()

    # Create the RSVP (always do this)
    event = Event.objects.get(id=event_id)
    rsvp = RSVP.objects.create(event=event, user=request.user)
    new_count = event.rsvps.count()

    if queue_depth > 500:
        # System is busy. Skip the Celery task and update the cache
        # directly. The SSE stream will pick up the cached value.
        cache.set(
            f'event:{event_id}:rsvp_count',
            new_count,
            timeout=60
        )
        return Response({
            'rsvp_id': rsvp.id,
            'count': new_count,
            'realtime': False,  # Tell the client this is not live
        }, status=status.HTTP_201_CREATED)

    # Normal path: queue async processing
    process_rsvp.delay(event.id, request.user.id, new_count)

    return Response({
        'rsvp_id': rsvp.id,
        'count': new_count,
        'realtime': True,
    }, status=status.HTTP_201_CREATED)
```

### Degraded Mode for SSE

When the system is overloaded, SSE clients can fall back to polling the cache:

```python
# events/views.py

@require_GET
def rsvp_stream(request, event_id):
    """SSE stream with degraded mode fallback."""

    def event_stream():
        event = Event.objects.get(id=event_id)
        last_count = event.rsvps.count()

        yield sse_event(
            {"count": last_count, "event_id": event_id},
            event_type="rsvp_update"
        )
        yield "retry: 5000\n\n"

        r = redis.Redis.from_url(settings.REDIS_URL)
        pubsub = r.pubsub()
        pubsub.subscribe(f"event:{event_id}:rsvps")

        try:
            while True:
                message = pubsub.get_message(timeout=15)

                if message is None:
                    # Heartbeat, but also check the cache for
                    # updates that bypassed Pub/Sub during overload
                    cached_count = cache.get(
                        f'event:{event_id}:rsvp_count'
                    )
                    if cached_count and cached_count != last_count:
                        last_count = cached_count
                        yield sse_event(
                            {
                                "count": cached_count,
                                "event_id": event_id,
                                "source": "cache",
                            },
                            event_type="rsvp_update"
                        )
                    else:
                        yield ": heartbeat\n\n"
                    continue

                if message['type'] == 'message':
                    data = json.loads(message['data'])
                    last_count = data.get('count', last_count)
                    yield sse_event(
                        data,
                        event_type="rsvp_update"
                    )
        finally:
            pubsub.unsubscribe()
            pubsub.close()
            r.close()

    response = StreamingHttpResponse(
        event_stream(),
        content_type='text/event-stream'
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response
```

During normal operation, updates flow through Redis Pub/Sub and arrive instantly. During overload, the SSE endpoint checks the cache during heartbeat intervals. Updates might arrive with a 15-second delay instead of instantly, but the system stays up and data stays accurate.

### Celery Task Priority

Another backpressure strategy: prioritize important tasks over less important ones. RSVP count updates are more time-sensitive than confirmation emails.

```python
# events/tasks.py

@shared_task(bind=True, max_retries=3, queue='high')
def publish_rsvp_update(self, event_id, new_count):
    """Publish RSVP update to Redis Pub/Sub. High priority."""
    r = redis.Redis.from_url(settings.REDIS_URL)
    r.publish(
        f"event:{event_id}:rsvps",
        json.dumps({"count": new_count, "event_id": event_id})
    )


@shared_task(bind=True, max_retries=3, queue='low')
def send_rsvp_email(self, event_id, user_id):
    """Send RSVP confirmation email. Low priority."""
    # ... email sending logic ...
```

Configure Celery workers to process high-priority queues first:

```bash
# Worker that processes both queues, high first
celery -A gather_backend worker -Q high,low --loglevel=info

# Or run separate workers for each priority
celery -A gather_backend worker -Q high --loglevel=info --concurrency=4
celery -A gather_backend worker -Q low --loglevel=info --concurrency=2
```

## Rate Limiting the SSE Endpoint

Don't forget to rate limit the SSE endpoint itself. A malicious client could open thousands of SSE connections and exhaust your server's capacity:

```python
# events/views.py

@require_GET
@ratelimit(key='ip', rate='5/m', method='GET', block=True)
def rsvp_stream(request, event_id):
    """SSE stream. Limited to 5 connections per minute per IP."""
    # ... same implementation ...
```

5 connections per minute per IP is generous for legitimate use (a user might open the event page in multiple tabs) while preventing connection-flooding attacks.

## Putting It All Together

Here is the complete protection strategy for Gather's real-time system:

| Layer | Protection | Configuration |
|-------|-----------|---------------|
| RSVP API | Per-user rate limit | 10 requests/minute |
| SSE endpoint | Per-IP rate limit | 5 connections/minute |
| nginx | Connection limit | `limit_conn` per IP |
| Celery | Queue depth monitoring | Alert at 100, degrade at 500 |
| SSE stream | Cache fallback | Check cache during heartbeats |
| Client | Retry-After handling | Show user-friendly message |

```nginx
# nginx rate limiting (defense in depth)
limit_conn_zone $binary_remote_addr zone=sse_conn:10m;

location ~ /api/events/\d+/rsvp-stream/ {
    limit_conn sse_conn 5;  # Max 5 SSE connections per IP
    # ... rest of SSE proxy config ...
}
```

## Key Takeaways

- Rate limiting is critical for real-time systems because of the amplification effect. One abusive request can trigger thousands of SSE deliveries.
- Use a sliding window algorithm for RSVP rate limiting (10 requests per minute per user). No burst allowance needed for deliberate actions.
- Store rate limit counters in Redis so they are shared across all Django instances. Without shared storage, users can bypass limits by hitting different instances.
- Backpressure prevents cascading failures during legitimate traffic spikes. Monitor Celery queue depth and switch to degraded mode (cached data) when the system cannot keep up.
- Graceful degradation means the application stays up with slightly stale data rather than crashing with no data. SSE streams check the cache during heartbeat intervals as a fallback.
- Rate limit the SSE endpoint too, not just the RSVP API. Connection flooding is a real attack vector.
- Defense in depth: rate limit at multiple layers (application, nginx, cloud provider) so no single layer is a single point of failure.

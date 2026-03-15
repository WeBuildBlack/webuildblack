---
title: "Server-Sent Events with Django"
estimatedMinutes: 40
---

# Server-Sent Events with Django

Now that we know SSE is the right tool for Gather's live RSVP feature, let's build it. In this lesson, you will implement an SSE endpoint in Django using `StreamingHttpResponse`, connect to it from a Next.js frontend with the `EventSource` API, and handle reconnection gracefully.

## The SSE Protocol in Detail

Before we write any code, let's understand exactly what goes over the wire. An SSE response is a standard HTTP response with two special characteristics:

1. The `Content-Type` header is `text/event-stream`
2. The body is a stream of text events that never ends (until the client disconnects)

### Message Format

Each SSE message consists of one or more fields, followed by a blank line:

```
field: value\n
field: value\n
\n
```

The blank line (double newline `\n\n`) marks the end of a message. Here is a complete example of a stream with three messages:

```
retry: 5000

data: {"count": 47}

event: rsvp_update
data: {"count": 48, "user_name": "Tanya"}
id: evt-001

event: rsvp_update
data: {"count": 49, "user_name": "Jerome"}
id: evt-002

```

Let's break down each field:

**`data:`** contains the message payload. If your data spans multiple lines, use multiple `data:` fields. They get concatenated with newlines:

```
data: line one
data: line two
data: line three

```

The client receives: `"line one\nline two\nline three"`

**`event:`** specifies a custom event type. Without it, the message fires the generic `onmessage` handler. With it, the client uses `addEventListener('rsvp_update', handler)`.

**`id:`** sets the last event ID. If the connection drops, the browser sends this back as the `Last-Event-ID` header when reconnecting. This lets the server replay missed events.

**`retry:`** tells the browser how many milliseconds to wait before attempting reconnection. The default varies by browser (usually around 3 seconds).

**Comments** start with a colon and are ignored. They are useful as heartbeats to keep the connection alive:

```
: heartbeat

```

## Building the SSE Endpoint in Django

### The Streaming View

Django's `StreamingHttpResponse` accepts a generator function. Instead of building the entire response in memory, it yields chunks as they become available. This is exactly what we need for SSE.

```python
# events/views.py
import json
import time
from django.http import StreamingHttpResponse
from django.views.decorators.http import require_GET
from events.models import Event


def sse_event(data, event_type=None, event_id=None):
    """Format a single SSE message."""
    message = ""
    if event_id:
        message += f"id: {event_id}\n"
    if event_type:
        message += f"event: {event_type}\n"
    message += f"data: {json.dumps(data)}\n\n"
    return message


def heartbeat():
    """Send a comment to keep the connection alive."""
    return ": heartbeat\n\n"


@require_GET
def rsvp_stream(request, event_id):
    """Stream live RSVP count updates for a specific event."""

    def event_stream():
        # Send initial state
        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            yield sse_event(
                {"error": "Event not found"},
                event_type="error"
            )
            return

        current_count = event.rsvps.count()
        yield sse_event(
            {"count": current_count, "event_id": event_id},
            event_type="rsvp_update",
            event_id=f"rsvp-{int(time.time())}"
        )

        # Poll for changes (we'll replace this with Redis Pub/Sub
        # in the next lesson)
        last_count = current_count
        heartbeat_interval = 15  # seconds
        last_heartbeat = time.time()

        while True:
            time.sleep(1)

            # Send heartbeat to keep connection alive
            if time.time() - last_heartbeat >= heartbeat_interval:
                yield heartbeat()
                last_heartbeat = time.time()

            # Check for count changes
            event.refresh_from_db()
            new_count = event.rsvps.count()

            if new_count != last_count:
                last_count = new_count
                yield sse_event(
                    {"count": new_count, "event_id": event_id},
                    event_type="rsvp_update",
                    event_id=f"rsvp-{int(time.time())}"
                )

    response = StreamingHttpResponse(
        event_stream(),
        content_type='text/event-stream'
    )
    # Prevent buffering at every layer
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'  # nginx
    return response
```

### URL Configuration

```python
# events/urls.py
from django.urls import path
from events.views import rsvp_stream

urlpatterns = [
    # ... existing event API routes ...
    path(
        'events/<int:event_id>/rsvp-stream/',
        rsvp_stream,
        name='rsvp-stream'
    ),
]
```

### Critical Headers

Three headers make SSE work correctly through the full infrastructure stack:

```python
response['Content-Type'] = 'text/event-stream'   # Required by spec
response['Cache-Control'] = 'no-cache'            # Prevent proxy caching
response['X-Accel-Buffering'] = 'no'              # Tell nginx not to buffer
```

Without `X-Accel-Buffering: no`, nginx will buffer the response and only send it to the client when the buffer fills up (usually 4KB or 8KB). Your client will see nothing for minutes while events silently accumulate in the buffer.

### The Polling Problem (Temporary)

You probably noticed that our `event_stream` generator polls the database every second. This works, but it has the same problem as long polling: it wastes database queries. With 1,000 connected clients, that is 1,000 queries per second just to check if a number changed.

In Lesson 3, we will replace this polling loop with Redis Pub/Sub. The generator will block on a Redis subscription instead of sleeping and querying, which is far more efficient.

## Connecting from Next.js with EventSource

### Basic Connection

The browser's `EventSource` API makes connecting to an SSE endpoint trivially simple:

```typescript
// components/LiveRsvpCount.tsx
'use client';

import { useEffect, useState } from 'react';

interface RsvpData {
  count: number;
  event_id: number;
}

export function LiveRsvpCount({ eventId }: { eventId: number }) {
  const [count, setCount] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource(
      `${process.env.NEXT_PUBLIC_API_URL}/api/events/${eventId}/rsvp-stream/`
    );

    source.addEventListener('rsvp_update', (event) => {
      const data: RsvpData = JSON.parse(event.data);
      setCount(data.count);
      setConnected(true);
    });

    source.onerror = () => {
      setConnected(false);
      // EventSource will automatically reconnect
    };

    return () => {
      source.close();
    };
  }, [eventId]);

  if (count === null) {
    return <span className="text-gray-400">Loading...</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-2xl font-bold">{count}</span>
      <span className="text-gray-600">RSVPs</span>
      {connected ? (
        <span className="inline-block w-2 h-2 bg-green-500 rounded-full"
              title="Live" />
      ) : (
        <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"
              title="Reconnecting..." />
      )}
    </div>
  );
}
```

### Using the Component

```tsx
// app/events/[id]/page.tsx
import { LiveRsvpCount } from '@/components/LiveRsvpCount';

export default async function EventPage({
  params
}: {
  params: { id: string }
}) {
  const eventId = parseInt(params.id);

  return (
    <div>
      <h1>Community Hackathon</h1>
      <LiveRsvpCount eventId={eventId} />
      {/* ... rest of event details ... */}
    </div>
  );
}
```

## Handling Reconnection

One of SSE's best features is automatic reconnection. When the connection drops, the browser waits (using the `retry` value) and then reconnects. But there are nuances worth understanding.

### Last-Event-ID

When the browser reconnects, it sends the last received event ID as a header:

```
GET /api/events/42/rsvp-stream/ HTTP/1.1
Last-Event-ID: rsvp-1710432000
```

Your Django view can use this to send only events the client missed:

```python
@require_GET
def rsvp_stream(request, event_id):
    last_event_id = request.META.get('HTTP_LAST_EVENT_ID')

    def event_stream():
        if last_event_id:
            # Client is reconnecting. Send any events they missed.
            # For RSVP counts, we just need the current state.
            event = Event.objects.get(id=event_id)
            yield sse_event(
                {"count": event.rsvps.count(), "event_id": event_id},
                event_type="rsvp_update",
                event_id=f"rsvp-{int(time.time())}"
            )

        # Continue with normal streaming...
        # (same as before)
```

For RSVP counts, reconnection is simple: just send the current count. For ordered event streams (like a chat log), you would need to replay events since the last ID, which requires storing recent events in Redis or a database.

### Reconnection Timing

You can control the reconnection delay by sending a `retry:` field:

```python
def event_stream():
    # Tell the browser to reconnect after 5 seconds if disconnected
    yield "retry: 5000\n\n"

    # Send initial state...
```

In production, you want to balance two concerns:
- **Too short** (500ms): creates a thundering herd if the server goes down. Thousands of clients reconnecting simultaneously can overwhelm the server as it comes back up.
- **Too long** (60s): users see stale data for a full minute after a brief network blip.

A retry value of 3000 to 5000 milliseconds works well for most applications. If you need more sophisticated backoff, handle it on the client side:

```typescript
// Custom reconnection with exponential backoff
function connectWithBackoff(eventId: number, attempt = 0) {
  const source = new EventSource(
    `${process.env.NEXT_PUBLIC_API_URL}/api/events/${eventId}/rsvp-stream/`
  );

  source.addEventListener('rsvp_update', (event) => {
    attempt = 0;  // Reset on successful message
    const data = JSON.parse(event.data);
    updateCount(data.count);
  });

  source.onerror = () => {
    source.close();  // Close the auto-reconnecting source
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
    console.log(`Reconnecting in ${delay}ms (attempt ${attempt + 1})`);
    setTimeout(() => connectWithBackoff(eventId, attempt + 1), delay);
  };

  return source;
}
```

## CORS Configuration

If your Django API and Next.js frontend are on different origins (which they are in Gather: `api.gather.example.com` vs `gather.example.com`), you need to configure CORS for SSE.

Install and configure `django-cors-headers`:

```bash
pip install django-cors-headers
```

```python
# settings.py
INSTALLED_APPS = [
    # ...
    'corsheaders',
    # ...
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Must be high in the list
    'django.middleware.common.CommonMiddleware',
    # ...
]

CORS_ALLOWED_ORIGINS = [
    "https://gather.example.com",
    "http://localhost:3000",  # Next.js dev server
]

# Allow credentials if you need authentication on the SSE endpoint
CORS_ALLOW_CREDENTIALS = True
```

### EventSource and Credentials

By default, `EventSource` does not send cookies or authentication headers. If your SSE endpoint requires authentication, you need to pass the `withCredentials` option:

```typescript
const source = new EventSource(
  `${process.env.NEXT_PUBLIC_API_URL}/api/events/${eventId}/rsvp-stream/`,
  { withCredentials: true }
);
```

If you need to send a custom header (like a JWT token), `EventSource` does not support custom headers. You have two options:

**Option 1: Pass the token as a query parameter**

```typescript
const source = new EventSource(
  `/api/events/${eventId}/rsvp-stream/?token=${accessToken}`
);
```

```python
# Django view
def rsvp_stream(request, event_id):
    token = request.GET.get('token')
    if not token or not verify_token(token):
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    # ... proceed with streaming
```

This is less secure (tokens in URLs can end up in logs), but it is the standard approach for SSE authentication.

**Option 2: Use a fetch-based SSE library**

Libraries like `@microsoft/fetch-event-source` use `fetch` instead of `EventSource`, which supports custom headers:

```typescript
import { fetchEventSource } from '@microsoft/fetch-event-source';

await fetchEventSource(
  `${process.env.NEXT_PUBLIC_API_URL}/api/events/${eventId}/rsvp-stream/`,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    onmessage(event) {
      const data = JSON.parse(event.data);
      updateCount(data.count);
    },
    onerror(err) {
      console.error('SSE error:', err);
    },
  }
);
```

For Gather, the RSVP count is public data (anyone can see how many people are attending), so authentication on the SSE endpoint is not needed. Keep it simple.

## Django Worker Considerations

There is an important deployment detail to understand. Each SSE connection holds open a Django worker for the entire duration of the stream. If you are running Gunicorn with 4 sync workers, you can only serve 4 simultaneous SSE connections before all workers are occupied.

### Solution: Async Workers or Threads

You have several options:

**Gunicorn with threads:**

```bash
gunicorn gather_backend.wsgi:application \
  --workers 4 \
  --threads 4 \
  --worker-class gthread
```

This gives you 16 concurrent connections (4 workers x 4 threads). Threads are lightweight and work well for I/O-bound work like SSE streaming.

**Gunicorn with gevent (greenlets):**

```bash
pip install gevent
gunicorn gather_backend.wsgi:application \
  --workers 4 \
  --worker-class gevent \
  --worker-connections 1000
```

Gevent uses cooperative multitasking with greenlets. Each worker can handle up to 1,000 concurrent connections, giving you 4,000 total. This is the most common production setup for SSE with Django.

**Important:** When using gevent, you need to monkey-patch standard library modules at startup. Gunicorn handles this automatically when you use the gevent worker class.

### Connection Limits

Even with gevent, each connection consumes memory (roughly 10-50KB per greenlet depending on stack depth). Plan your capacity:

| Workers | Worker Class | Connections Each | Total Capacity |
|---------|-------------|-----------------|----------------|
| 4 | sync | 1 | 4 |
| 4 | gthread (4 threads) | 4 | 16 |
| 4 | gevent | 1,000 | 4,000 |

For Gather, gevent with 4 workers gives us 4,000 concurrent SSE connections per Django instance. If we need more, we scale horizontally (more instances), which we will cover in Lesson 4.

## Testing Your SSE Endpoint

### With curl

```bash
curl -N -H "Accept: text/event-stream" \
  http://localhost:8000/api/events/42/rsvp-stream/
```

The `-N` flag disables curl's output buffering so you see events as they arrive. You should see:

```
retry: 5000

event: rsvp_update
data: {"count": 47, "event_id": 42}
id: rsvp-1710432000

: heartbeat

event: rsvp_update
data: {"count": 48, "event_id": 42}
id: rsvp-1710432015

```

### With the Browser DevTools

Open the Network tab in Chrome DevTools and filter by "EventStream". Click on the SSE request to see the event stream in real time. The "EventStream" tab shows parsed events with their type, data, and ID.

### With a Quick Script

```python
# test_sse.py
import requests

url = 'http://localhost:8000/api/events/42/rsvp-stream/'
response = requests.get(url, stream=True)

for line in response.iter_lines():
    if line:
        print(line.decode('utf-8'))
```

## Key Takeaways

- SSE uses `StreamingHttpResponse` with `Content-Type: text/event-stream` in Django. The view returns a generator that yields formatted SSE messages.
- The SSE protocol is plain text with four fields: `data:`, `event:`, `id:`, and `retry:`. Messages are separated by blank lines.
- The `EventSource` API in the browser handles connection management and automatic reconnection. The `Last-Event-ID` header enables resuming from where the client left off.
- CORS must be configured when the API and frontend are on different origins. Custom auth headers require either query parameters or a fetch-based SSE library.
- Each SSE connection holds a Django worker. Use Gunicorn's gevent worker class to handle thousands of concurrent connections per process.
- Always send heartbeat comments to keep connections alive through proxies and load balancers that have idle timeouts.
- Our current implementation polls the database, which does not scale. In the next lesson, we will replace that with Redis Pub/Sub.

---
title: "WebSockets vs SSE vs Long Polling"
estimatedMinutes: 35
---

# WebSockets vs SSE vs Long Polling

Traditional HTTP follows a simple pattern: the client sends a request, the server sends a response, and the connection closes. That works perfectly for loading pages and submitting forms. But what happens when you need the server to push data to the client the moment something changes?

In Gather, users want to see the RSVP count update in real time as other people register for an event. They don't want to refresh the page to find out that 47 people are now attending. They want to watch the number tick up live.

There are three main approaches to making this happen: long polling, Server-Sent Events (SSE), and WebSockets. Each has real tradeoffs, and choosing the wrong one can cost you weeks of unnecessary complexity.

## Long Polling

Long polling is the oldest trick in the real-time playbook. It works entirely within normal HTTP.

### How It Works

1. The client sends a regular HTTP request to the server
2. Instead of responding immediately, the server holds the connection open
3. When new data is available (or a timeout occurs), the server sends a response
4. The client immediately sends another request
5. Repeat forever

```javascript
// Client-side long polling
async function pollForUpdates(eventId) {
  while (true) {
    try {
      const response = await fetch(
        `/api/events/${eventId}/rsvp-count?timeout=30`
      );
      const data = await response.json();

      if (data.updated) {
        updateRsvpCount(data.count);
      }

      // Immediately poll again
    } catch (error) {
      // Wait before retrying on error
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}
```

```python
# Django view for long polling
import time
from django.http import JsonResponse
from events.models import Event

def rsvp_count_poll(request, event_id):
    timeout = int(request.GET.get('timeout', 30))
    last_count = int(request.GET.get('last_count', 0))

    event = Event.objects.get(id=event_id)
    start = time.time()

    # Hold the connection open until the count changes or timeout
    while time.time() - start < timeout:
        current_count = event.rsvps.count()
        if current_count != last_count:
            return JsonResponse({
                'updated': True,
                'count': current_count
            })
        time.sleep(1)  # Check every second

    return JsonResponse({'updated': False, 'count': last_count})
```

### The Problems

Long polling has significant downsides at scale:

- **Connection overhead**: Every poll cycle creates a new HTTP connection with full headers
- **Server threads**: Each waiting client ties up a server thread (or worker process). With 10,000 users watching an event, that is 10,000 blocked workers.
- **Latency gap**: There is always a delay between when data changes and when the next poll picks it up
- **Database load**: That `time.sleep(1)` loop hammers your database with queries

Long polling made sense in 2005 when it was the only option. Today, it is a fallback for environments where nothing else works.

## WebSockets

WebSockets provide full-duplex, bidirectional communication over a single TCP connection. The client and server can both send messages at any time.

### How It Works

1. The client sends an HTTP request with an `Upgrade: websocket` header
2. The server responds with `101 Switching Protocols`
3. The connection upgrades from HTTP to the WebSocket protocol
4. Both sides can now send frames (messages) at any time
5. The connection stays open until either side closes it

```javascript
// Client-side WebSocket
const ws = new WebSocket('wss://gather.example.com/ws/events/42/rsvps');

ws.onopen = () => {
  console.log('Connected to RSVP stream');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateRsvpCount(data.count);
};

ws.onclose = (event) => {
  console.log('Disconnected:', event.code, event.reason);
  // Implement reconnection logic manually
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

### WebSocket Strengths

- **Full-duplex**: Both client and server can send messages independently
- **Low latency**: No HTTP overhead per message after the initial handshake
- **Efficient**: Frames have minimal overhead (as low as 2 bytes for small messages)
- **Real bidirectional**: Perfect for chat, collaborative editing, multiplayer games

### WebSocket Complications

WebSockets are powerful, but that power comes with complexity:

**Infrastructure complexity.** WebSockets don't work with standard HTTP infrastructure out of the box. Load balancers need sticky sessions or WebSocket-aware routing. Reverse proxies need special configuration. CDNs can't cache WebSocket traffic.

**Django is not built for WebSockets.** Django's request/response model doesn't support persistent connections. You need Django Channels, which adds ASGI, Daphne or Uvicorn, and a channel layer (usually Redis). That is a significant architectural change.

```python
# Django Channels consumer (requires ASGI setup)
# This is NOT regular Django. It requires:
# - channels + channels-redis packages
# - ASGI application configuration
# - Daphne or Uvicorn server
# - Redis channel layer

from channels.generic.websocket import AsyncJsonWebsocketConsumer

class RsvpConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.event_id = self.scope['url_route']['kwargs']['event_id']
        self.group_name = f'event_{self.event_id}_rsvps'

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def rsvp_update(self, event):
        await self.send_json({
            'count': event['count']
        })
```

**Connection management.** WebSocket connections are stateful. You need to handle reconnection, heartbeats, authentication, and connection lifecycle on both client and server. The browser's `WebSocket` API has no built-in reconnection.

**Scaling is harder.** Every WebSocket connection is tied to a specific server instance. If you have 4 Django instances, a user connected to instance 2 won't receive messages published on instance 3 without a shared pub/sub layer.

## Server-Sent Events (SSE)

SSE provides a simple, HTTP-native way for the server to push data to the client. It is one-directional: the server sends events, and the client listens.

### How It Works

1. The client opens a connection using the `EventSource` API
2. The server responds with `Content-Type: text/event-stream`
3. The server keeps the connection open and sends events as they occur
4. If the connection drops, the browser automatically reconnects

```javascript
// Client-side SSE with EventSource
const source = new EventSource('/api/events/42/rsvp-stream');

source.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateRsvpCount(data.count);
};

source.addEventListener('rsvp', (event) => {
  const data = JSON.parse(event.data);
  updateRsvpCount(data.count);
});

source.onerror = (error) => {
  // Browser handles reconnection automatically
  console.log('SSE connection error, reconnecting...');
};
```

### Why SSE Wins for Gather

Let's look at why SSE is the right choice for Gather's live RSVP feature:

**The data flows one way.** Users don't send RSVP updates through the real-time channel. They click a button, which sends a normal POST request to the API. The server then pushes the updated count to everyone watching. This is exactly what SSE is designed for.

**It runs on plain HTTP.** SSE uses standard HTTP responses with a special content type. No protocol upgrade, no special server. Load balancers, reverse proxies, and CDNs handle it without special configuration.

**Built-in reconnection.** The `EventSource` API automatically reconnects if the connection drops. It even sends a `Last-Event-ID` header so the server can resume from where it left off. With WebSockets, you write all of that yourself.

**Works with Django's WSGI model.** You can implement SSE with Django's `StreamingHttpResponse`. No need for Channels, ASGI, or a different server. (There are caveats with worker threads, which we'll address in the next lesson.)

**Simple protocol.** The SSE wire format is plain text. Easy to debug, easy to implement, easy to understand.

### The SSE Protocol Format

SSE messages are plain text, separated by double newlines. Each line is a field:

```
data: {"count": 47, "event_id": 42}

data: {"count": 48, "event_id": 42}

event: rsvp
data: {"count": 49, "event_id": 42, "user": "Marcus"}

id: 1710432000
event: rsvp
data: {"count": 50, "event_id": 42, "user": "Aisha"}
retry: 5000

```

The fields:

| Field | Purpose |
|-------|---------|
| `data:` | The message payload. Can span multiple lines. |
| `event:` | Custom event type (client uses `addEventListener` for these) |
| `id:` | Event ID. Sent back as `Last-Event-ID` header on reconnection. |
| `retry:` | Tells the browser how many milliseconds to wait before reconnecting |

### Browser Support

SSE is supported in all modern browsers. The `EventSource` API has been available since:

- Chrome 6 (2010)
- Firefox 6 (2011)
- Safari 5 (2010)
- Edge 79 (2020, Chromium-based)

The notable exception is Internet Explorer, which never supported it. Since IE is long dead, this is not a concern for any modern application.

For environments where `EventSource` is not available (some older mobile WebViews, for example), you can use a polyfill or fall back to long polling.

## Comparison Summary

| Feature | Long Polling | SSE | WebSockets |
|---------|-------------|-----|------------|
| Direction | Client-to-server requests | Server-to-client | Bidirectional |
| Protocol | HTTP | HTTP | ws:// / wss:// |
| Reconnection | Manual | Automatic | Manual |
| Django support | Native | Native (StreamingHttpResponse) | Requires Channels + ASGI |
| Infrastructure | Standard HTTP | Standard HTTP | Needs WebSocket-aware proxies |
| Overhead per message | Full HTTP headers | ~5 bytes | ~2 bytes |
| Browser API | fetch/XMLHttpRequest | EventSource | WebSocket |
| Best for | Legacy fallback | Server push (notifications, feeds, live data) | Chat, games, collaborative editing |

## When to Use Each

**Use WebSockets when:**
- The client needs to send frequent messages to the server through the same connection
- You are building chat, collaborative editing, or multiplayer features
- Sub-millisecond latency matters in both directions
- You have the infrastructure to support it (ASGI, WebSocket-aware load balancers)

**Use SSE when:**
- The server pushes updates and the client mostly listens
- You want automatic reconnection without writing it yourself
- You want to keep your existing HTTP infrastructure
- You are building live dashboards, notification feeds, or status updates

**Use long polling when:**
- You are stuck behind a proxy that strips SSE connections
- You need to support extremely old browsers
- The update frequency is very low (once per minute or less)

## For Gather: SSE Is the Clear Winner

Gather's real-time RSVP feature has a simple data flow:

1. User clicks "RSVP" and sends a POST request
2. Server updates the database and publishes an event
3. All connected clients receive the updated count

This is a textbook server-push pattern. SSE gives us everything we need with minimal complexity. No protocol upgrades, no ASGI migration, no manual reconnection logic. We will build on top of Django's `StreamingHttpResponse` and the `EventSource` API.

In the next lesson, we will implement this from scratch.

## Key Takeaways

- Long polling is a legacy approach that wastes connections and server threads. Avoid it unless you have no alternative.
- WebSockets provide full-duplex communication but add significant infrastructure complexity. They are the right tool for chat and collaborative features, not for simple server-push.
- SSE is HTTP-native, has built-in reconnection, and works with Django's standard request model. For server-to-client push like live RSVP counts, it is the simplest and most appropriate choice.
- The `EventSource` API handles reconnection, last-event tracking, and custom event types out of the box.
- Choosing the simplest tool that solves the problem is a production engineering skill. WebSockets are more powerful, but SSE is more appropriate for Gather's use case.

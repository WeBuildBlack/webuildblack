---
title: "Scaling Real-Time Across Instances"
estimatedMinutes: 35
---

# Scaling Real-Time Across Instances

So far, we have SSE streaming with Redis Pub/Sub working on a single Django instance. But in production, Gather runs multiple Django instances behind a load balancer. Each instance is a separate machine (or container) with its own Gunicorn process, its own memory, and its own set of SSE connections.

This lesson covers how to make real-time updates work across all instances, how to manage thousands of persistent connections, and how to scale horizontally without breaking the live experience.

## The Multi-Instance Architecture

Here is what a production deployment of Gather looks like:

```
                    ┌─────────────────┐
                    │  nginx / ALB     │
                    │  Load Balancer   │
                    └────────┬────────┘
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Django 1 │  │ Django 2 │  │ Django 3 │
        │ Gunicorn │  │ Gunicorn │  │ Gunicorn │
        │ 4 workers│  │ 4 workers│  │ 4 workers│
        │ (gevent) │  │ (gevent) │  │ (gevent) │
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             │              │              │
             └──────────────┼──────────────┘
                            │
                    ┌───────▼───────┐
                    │  Redis        │
                    │  (Pub/Sub +   │
                    │   Celery)     │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │  PostgreSQL   │
                    └───────────────┘
```

Three Django instances, each running 4 gevent workers with 1,000 connections per worker. That is 12,000 potential SSE connections across the cluster.

## Why Redis Pub/Sub Already Solves Cross-Instance

Here is the good news: if you followed Lesson 3, cross-instance updates already work. Here is why.

Every SSE endpoint, regardless of which Django instance it runs on, subscribes to the same Redis Pub/Sub channel. Redis is external to all Django instances. When a Celery task publishes to `event:42:rsvps`, Redis delivers that message to every subscriber on every instance simultaneously.

```
  Celery Worker publishes to Redis
              │
              ▼
    Redis channel "event:42:rsvps"
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
  Django 1  Django 2  Django 3
  (300 SSE  (450 SSE  (250 SSE
   clients)  clients)  clients)
```

All 1,000 connected clients across all three instances receive the update at the same time. No additional code needed. This is the power of an external message bus.

## Configuring nginx for SSE

The load balancer needs special configuration for SSE connections. Without it, nginx will buffer responses, time out connections, or close them prematurely.

### nginx Configuration

```nginx
# /etc/nginx/conf.d/gather.conf

upstream django_backend {
    # Use least_conn for SSE so long-lived connections
    # are distributed evenly across instances
    least_conn;

    server django-1:8000;
    server django-2:8000;
    server django-3:8000;
}

server {
    listen 80;
    server_name gather.example.com;

    # Regular API requests
    location /api/ {
        proxy_pass http://django_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SSE streaming endpoints need special settings
    location ~ /api/events/\d+/rsvp-stream/ {
        proxy_pass http://django_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Disable buffering so events stream through immediately
        proxy_buffering off;

        # Disable response caching
        proxy_cache off;

        # Keep the connection open for a long time
        proxy_read_timeout 3600s;  # 1 hour
        proxy_send_timeout 3600s;

        # HTTP/1.1 is required for chunked transfer encoding
        proxy_http_version 1.1;

        # Remove Connection header to allow keep-alive
        proxy_set_header Connection '';

        # Pass through the X-Accel-Buffering header from Django
        # (Django sets this to "no" in the SSE view)
    }

    # Next.js frontend (or proxy to Vercel)
    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Key nginx Settings Explained

**`proxy_buffering off`**: By default, nginx buffers the entire upstream response before sending it to the client. For SSE, this means the client sees nothing until the buffer fills (usually 4-8KB). Turning this off makes nginx forward each chunk immediately.

**`proxy_read_timeout 3600s`**: nginx closes connections that have been idle (no data received from upstream) for longer than this timeout. The default is 60 seconds. Since our SSE endpoint sends heartbeats every 15 seconds, a 1-hour timeout gives plenty of margin.

**`proxy_http_version 1.1`**: SSE requires HTTP/1.1 for chunked transfer encoding. Without this, nginx may use HTTP/1.0 to the upstream, which does not support streaming.

**`proxy_set_header Connection ''`**: Removes the `Connection: close` header that nginx adds by default with HTTP/1.0 proxying. This keeps the upstream connection alive.

**`least_conn`**: The `least_conn` load balancing algorithm assigns new connections to the server with the fewest active connections. This is better than round-robin for SSE because long-lived SSE connections would otherwise stack up unevenly.

### Why Not Sticky Sessions?

Some real-time setups require sticky sessions (routing the same client to the same server). SSE with Redis Pub/Sub does not need this because:

- Any instance can serve any client's SSE stream
- All instances subscribe to the same Redis channels
- The client does not send messages through the SSE connection (it uses regular POST requests for RSVPs)

If a client reconnects and gets routed to a different instance, everything still works. The new instance subscribes to the same Redis channel and sends the current count.

## Connection Management

### Keeping Connections Alive

SSE connections need to survive through multiple layers that have idle timeouts:

```
Browser ──> CDN/Proxy ──> nginx ──> Gunicorn ──> Django
  (EventSource          (60s       (3600s       (gevent
   auto-reconnect)       default)   configured)  greenlet)
```

Heartbeats are the solution. Our SSE endpoint sends a comment (`: heartbeat\n\n`) every 15 seconds. This keeps the connection "active" at every layer.

```python
# In the SSE generator
message = pubsub.get_message(timeout=15)
if message is None:
    yield ": heartbeat\n\n"  # Prevents timeout at every layer
    continue
```

The 15-second interval is chosen to be well under nginx's read timeout (60s default, 3600s configured) and any CDN/proxy timeout you might have.

### Detecting Disconnected Clients

When a client closes the browser tab or loses network connectivity, the SSE connection breaks. But the Django generator does not know this immediately. The generator discovers the disconnect when it tries to yield data and the underlying TCP connection is gone.

With gevent, this raises a `BrokenPipeError` or similar exception. Our `finally` block handles cleanup:

```python
def event_stream():
    r = redis.Redis.from_url(settings.REDIS_URL)
    pubsub = r.pubsub()
    pubsub.subscribe(f"event:{event_id}:rsvps")

    try:
        while True:
            message = pubsub.get_message(timeout=15)
            if message is None:
                yield ": heartbeat\n\n"
                continue
            if message['type'] == 'message':
                yield format_sse_event(message)
    except (BrokenPipeError, ConnectionResetError, GeneratorExit):
        # Client disconnected
        pass
    finally:
        pubsub.unsubscribe()
        pubsub.close()
        r.close()
```

### Tracking Active Connections

For operational visibility, track how many SSE connections each instance is serving:

```python
# events/sse_metrics.py
import threading

_connection_count = 0
_lock = threading.Lock()


def increment_connections():
    global _connection_count
    with _lock:
        _connection_count += 1
    return _connection_count


def decrement_connections():
    global _connection_count
    with _lock:
        _connection_count -= 1
    return _connection_count


def get_connection_count():
    return _connection_count
```

```python
# In the SSE view
from events.sse_metrics import increment_connections, decrement_connections

def event_stream():
    increment_connections()
    try:
        # ... streaming logic ...
    finally:
        decrement_connections()
        pubsub.unsubscribe()
        pubsub.close()
```

Expose this as a health check endpoint:

```python
# events/views.py
from django.http import JsonResponse
from events.sse_metrics import get_connection_count

def sse_health(request):
    return JsonResponse({
        'active_sse_connections': get_connection_count(),
        'max_connections': 4000,  # 4 workers x 1000 connections
    })
```

## Memory and Connection Limits

### Per-Instance Capacity Planning

Each SSE connection consumes resources:

| Resource | Per Connection | 1,000 Connections | 4,000 Connections |
|----------|---------------|-------------------|-------------------|
| Gevent greenlet | ~10-50 KB | ~10-50 MB | ~40-200 MB |
| Redis connection | ~10 KB | ~10 MB | ~40 MB |
| File descriptor | 1 | 1,000 | 4,000 |
| TCP buffer | ~16 KB | ~16 MB | ~64 MB |

A single Django instance with 4 gevent workers can handle around 4,000 SSE connections using roughly 200-400 MB of memory. That is very reasonable for a server with 2-4 GB of RAM.

### File Descriptor Limits

Each SSE connection requires one file descriptor on the server. The default Linux limit is often 1,024. You need to increase it:

```bash
# /etc/security/limits.conf
* soft nofile 65536
* hard nofile 65536
```

Or in the Gunicorn systemd service:

```ini
# /etc/systemd/system/gunicorn.service
[Service]
LimitNOFILE=65536
```

Or in Docker Compose:

```yaml
services:
  django:
    image: gather-django:latest
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
```

### Redis Connection Limits

Each SSE connection creates a Redis Pub/Sub subscription, which requires a Redis connection. Redis defaults to `maxclients 10000`. With 3 Django instances at 4,000 connections each, you need 12,000 Redis connections just for Pub/Sub (plus connections for Celery, caching, etc.).

Increase the limit in redis.conf:

```
maxclients 20000
```

Or use a connection pool with shared subscriptions. Instead of each SSE connection having its own Redis subscription, one subscriber per event per instance can fan out to all local connections:

```python
# events/sse_hub.py
import json
import threading
import redis
from django.conf import settings


class SSEHub:
    """
    Manages Redis subscriptions efficiently.
    One Redis subscription per event per instance,
    fanning out to all local SSE connections.
    """

    def __init__(self):
        self._subscribers = {}  # channel -> set of queues
        self._lock = threading.Lock()
        self._redis = redis.Redis.from_url(settings.REDIS_URL)

    def subscribe(self, channel):
        """
        Subscribe to a channel. Returns a queue that will
        receive messages.
        """
        import queue
        q = queue.Queue()

        with self._lock:
            if channel not in self._subscribers:
                self._subscribers[channel] = set()
                # Start a listener thread for this channel
                self._start_listener(channel)
            self._subscribers[channel].add(q)

        return q

    def unsubscribe(self, channel, q):
        """Remove a queue from a channel's subscribers."""
        with self._lock:
            if channel in self._subscribers:
                self._subscribers[channel].discard(q)
                if not self._subscribers[channel]:
                    del self._subscribers[channel]
                    # Redis listener will exit on its own

    def _start_listener(self, channel):
        """Start a background thread that listens to Redis."""
        def listener():
            pubsub = self._redis.pubsub()
            pubsub.subscribe(channel)
            try:
                for message in pubsub.listen():
                    if message['type'] != 'message':
                        continue
                    with self._lock:
                        queues = self._subscribers.get(channel, set()).copy()
                    if not queues:
                        break  # No more subscribers
                    for q in queues:
                        try:
                            q.put_nowait(message['data'])
                        except Exception:
                            pass  # Queue full or closed
            finally:
                pubsub.unsubscribe()
                pubsub.close()

        t = threading.Thread(target=listener, daemon=True)
        t.start()


# Global singleton
sse_hub = SSEHub()
```

This hub uses one Redis connection per unique event channel, regardless of how many clients are watching that event. For a popular event with 500 viewers, that is 1 Redis connection instead of 500.

## Horizontal Scaling Pattern

Adding capacity is straightforward:

1. **Deploy a new Django instance** with the same configuration
2. **Add it to the nginx upstream** block
3. **No Redis changes needed**. The new instance subscribes to the same channels.
4. **No client changes needed**. Clients connect to the load balancer, which routes them to any available instance.

```nginx
upstream django_backend {
    least_conn;
    server django-1:8000;
    server django-2:8000;
    server django-3:8000;
    server django-4:8000;  # New instance
}
```

The new instance immediately starts receiving SSE connections and Redis Pub/Sub messages. No migration, no state transfer, no coordination.

### Scaling Triggers

Monitor these metrics to know when to add instances:

| Metric | Warning Threshold | Action |
|--------|------------------|--------|
| SSE connections per instance | > 3,000 (75% of 4,000) | Add instance |
| Memory usage | > 80% of available RAM | Add instance or increase RAM |
| Redis connections | > 8,000 (80% of maxclients) | Increase Redis limit or use SSE Hub |
| Heartbeat failures | > 1% of connections | Check network, increase timeouts |

## Docker Compose for Local Testing

Here is a Docker Compose setup that simulates the multi-instance architecture locally:

```yaml
# docker-compose.yml
version: '3.8'

services:
  django-1:
    build: ./backend
    command: >
      gunicorn gather_backend.wsgi:application
      --bind 0.0.0.0:8000
      --workers 2
      --worker-class gevent
      --worker-connections 100
    environment:
      - REDIS_URL=redis://redis:6379/0
      - DATABASE_URL=postgres://gather:gather@postgres:5432/gather
    depends_on:
      - redis
      - postgres

  django-2:
    build: ./backend
    command: >
      gunicorn gather_backend.wsgi:application
      --bind 0.0.0.0:8000
      --workers 2
      --worker-class gevent
      --worker-connections 100
    environment:
      - REDIS_URL=redis://redis:6379/0
      - DATABASE_URL=postgres://gather:gather@postgres:5432/gather
    depends_on:
      - redis
      - postgres

  celery:
    build: ./backend
    command: celery -A gather_backend worker --loglevel=info
    environment:
      - REDIS_URL=redis://redis:6379/0
      - DATABASE_URL=postgres://gather:gather@postgres:5432/gather
    depends_on:
      - redis
      - postgres

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - django-1
      - django-2

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: gather
      POSTGRES_USER: gather
      POSTGRES_PASSWORD: gather
    ports:
      - "5432:5432"
```

Run it and test cross-instance updates:

```bash
# Start everything
docker compose up -d

# Open two SSE connections (may land on different instances)
curl -N http://localhost/api/events/1/rsvp-stream/ &
curl -N http://localhost/api/events/1/rsvp-stream/ &

# Publish a test message via redis-cli
docker compose exec redis redis-cli PUBLISH "event:1:rsvps" '{"count": 99}'

# Both curl sessions should show the update simultaneously
```

## Key Takeaways

- Redis Pub/Sub inherently works across instances because it is external to Django. Any process that subscribes to a Redis channel receives messages regardless of which machine it runs on.
- nginx requires specific configuration for SSE: disable buffering, increase read timeouts, use HTTP/1.1, and use `least_conn` load balancing.
- Sticky sessions are not needed. Any instance can serve any client's SSE stream because all instances subscribe to the same Redis channels.
- Each SSE connection consumes memory (greenlet + Redis connection + file descriptor). Plan capacity around 4,000 connections per instance with gevent workers.
- Increase file descriptor limits (`nofile`) and Redis `maxclients` for high-connection workloads.
- Use an SSE Hub to reduce Redis connections by sharing one subscription per event per instance, fanning out to local clients.
- Horizontal scaling is as simple as adding a new instance to the nginx upstream. No coordination or state migration required.

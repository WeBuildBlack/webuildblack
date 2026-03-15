---
title: "Redis Pub/Sub for Cross-Process Communication"
estimatedMinutes: 40
---

# Redis Pub/Sub for Cross-Process Communication

In the last lesson, we built an SSE endpoint that polls the database every second to check if the RSVP count changed. That works, but it is wasteful. With 1,000 connected clients, that is 1,000 database queries per second just to ask "did anything change?" and get "no" 99% of the time.

We need a better pattern. When someone RSVPs, the system should proactively notify all connected SSE streams that the count changed. That is exactly what Redis Pub/Sub does.

## The Multi-Process Problem

Before we jump into Pub/Sub, let's understand why in-memory solutions fail in production.

You might think: "Why not just use a Python variable or an in-memory queue?" The answer is that Django runs multiple worker processes.

```
                    ┌──────────────────┐
                    │   Load Balancer   │
                    └────────┬─────────┘
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Worker 1 │  │ Worker 2 │  │ Worker 3 │
        │          │  │          │  │          │
        │ SSE conn │  │ SSE conn │  │ SSE conn │
        │ Client A │  │ Client B │  │ Client C │
        └──────────┘  └──────────┘  └──────────┘
```

When Gunicorn starts with `--workers 4`, it forks 4 separate Python processes. Each process has its own memory space. A variable set in Worker 1 is invisible to Workers 2, 3, and 4.

If Client A's RSVP request is handled by Worker 1, and Client B is listening for SSE updates on Worker 2, there is no way for Worker 1 to tell Worker 2 that the count changed. They are completely isolated processes.

This is where Redis comes in. It sits outside all the Django processes and acts as a shared message bus.

## Redis Pub/Sub Fundamentals

Redis Pub/Sub is a messaging system built into Redis. It has three concepts:

1. **Channels**: Named message streams (like `event:42:rsvps`)
2. **Publishers**: Processes that send messages to a channel
3. **Subscribers**: Processes that listen for messages on a channel

When a publisher sends a message to a channel, every subscriber listening on that channel receives it immediately. Messages are not stored. If no one is listening, the message is lost. This is fine for our use case because SSE clients that reconnect will get the current count from the database.

### Basic Pub/Sub with redis-py

```python
# Publisher (in one terminal)
import redis

r = redis.Redis(host='localhost', port=6379, db=0)
r.publish('event:42:rsvps', '{"count": 48}')
```

```python
# Subscriber (in another terminal)
import redis

r = redis.Redis(host='localhost', port=6379, db=0)
pubsub = r.pubsub()
pubsub.subscribe('event:42:rsvps')

for message in pubsub.listen():
    if message['type'] == 'message':
        print(f"Received: {message['data'].decode('utf-8')}")
```

The `pubsub.listen()` call blocks until a message arrives. This is perfect for our SSE generator, which needs to block until there is something to send.

### Message Types

When you call `pubsub.listen()`, you receive messages of different types:

```python
# Subscribe message (received when subscription starts)
{'type': 'subscribe', 'pattern': None, 'channel': b'event:42:rsvps', 'data': 1}

# Actual data message
{'type': 'message', 'pattern': None, 'channel': b'event:42:rsvps', 'data': b'{"count": 48}'}

# Unsubscribe message
{'type': 'unsubscribe', 'pattern': None, 'channel': b'event:42:rsvps', 'data': 0}
```

Always filter for `type == 'message'` to get actual data.

### Pattern Subscriptions

You can subscribe to multiple channels using glob patterns:

```python
pubsub.psubscribe('event:*:rsvps')

# This will receive messages from:
# - event:42:rsvps
# - event:99:rsvps
# - event:1337:rsvps
```

Pattern messages have `type == 'pmessage'` and include the matching pattern:

```python
{
    'type': 'pmessage',
    'pattern': b'event:*:rsvps',
    'channel': b'event:42:rsvps',
    'data': b'{"count": 48}'
}
```

## Integrating Pub/Sub with Celery

In Module 3, we set up Celery with Redis as the broker for background jobs. Now we will combine Celery tasks with Redis Pub/Sub. The flow is:

1. User RSVPs via the API
2. The API view updates the database and queues a Celery task
3. The Celery task processes any async work (email confirmation, etc.) and publishes to Redis Pub/Sub
4. SSE endpoints are subscribed to the Redis channel and forward the message to clients

### The RSVP API View

```python
# events/views.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from events.models import Event, RSVP
from events.tasks import process_rsvp


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_rsvp(request, event_id):
    """Create an RSVP and trigger async processing."""
    try:
        event = Event.objects.get(id=event_id)
    except Event.DoesNotExist:
        return Response(
            {'error': 'Event not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if user already RSVPed
    if RSVP.objects.filter(event=event, user=request.user).exists():
        return Response(
            {'error': 'Already RSVPed'},
            status=status.HTTP_409_CONFLICT
        )

    # Create the RSVP
    rsvp = RSVP.objects.create(event=event, user=request.user)
    new_count = event.rsvps.count()

    # Queue async processing (email, notifications, pub/sub publish)
    process_rsvp.delay(event.id, request.user.id, new_count)

    return Response(
        {'rsvp_id': rsvp.id, 'count': new_count},
        status=status.HTTP_201_CREATED
    )
```

### The Celery Task

```python
# events/tasks.py
import json
import redis
from celery import shared_task
from django.conf import settings


@shared_task(bind=True, max_retries=3)
def process_rsvp(self, event_id, user_id, new_count):
    """
    Process an RSVP asynchronously:
    1. Send confirmation email
    2. Publish live update via Redis Pub/Sub
    """
    try:
        # Import here to avoid circular imports
        from events.models import Event, RSVP
        from django.contrib.auth import get_user_model
        User = get_user_model()

        event = Event.objects.get(id=event_id)
        user = User.objects.get(id=user_id)

        # 1. Send confirmation email (already built in Module 3)
        send_rsvp_confirmation_email(event, user)

        # 2. Publish the updated count to Redis Pub/Sub
        r = redis.Redis.from_url(settings.REDIS_URL)
        channel = f"event:{event_id}:rsvps"
        payload = json.dumps({
            "event_id": event_id,
            "count": new_count,
            "action": "rsvp_created",
            "user_name": user.get_full_name() or user.username,
        })
        r.publish(channel, payload)

        return {
            'status': 'success',
            'event_id': event_id,
            'new_count': new_count,
        }

    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)


def send_rsvp_confirmation_email(event, user):
    """Send RSVP confirmation. (Built in Module 3.)"""
    # ... email sending logic ...
    pass
```

### Redis Configuration

Add the Redis URL to your Django settings:

```python
# settings.py
import os

REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

# Celery already uses this from Module 3
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
```

## Upgrading the SSE Endpoint

Now let's replace the database-polling loop in our SSE view with a Redis Pub/Sub subscription:

```python
# events/views.py
import json
import time
import redis
from django.conf import settings
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


@require_GET
def rsvp_stream(request, event_id):
    """Stream live RSVP updates using Redis Pub/Sub."""

    def event_stream():
        # 1. Send the current count immediately
        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            yield sse_event({"error": "Event not found"}, event_type="error")
            return

        current_count = event.rsvps.count()
        yield sse_event(
            {"count": current_count, "event_id": event_id},
            event_type="rsvp_update",
            event_id=f"rsvp-{int(time.time())}"
        )

        # 2. Set reconnection interval
        yield "retry: 5000\n\n"

        # 3. Subscribe to Redis Pub/Sub channel
        r = redis.Redis.from_url(settings.REDIS_URL)
        pubsub = r.pubsub()
        channel = f"event:{event_id}:rsvps"
        pubsub.subscribe(channel)

        try:
            # 4. Listen for messages with a timeout for heartbeats
            while True:
                message = pubsub.get_message(timeout=15)

                if message is None:
                    # Timeout reached, send heartbeat
                    yield ": heartbeat\n\n"
                    continue

                if message['type'] != 'message':
                    continue

                # 5. Forward the Redis message as an SSE event
                data = json.loads(message['data'])
                yield sse_event(
                    data,
                    event_type="rsvp_update",
                    event_id=f"rsvp-{int(time.time())}"
                )
        finally:
            # 6. Clean up when the client disconnects
            pubsub.unsubscribe(channel)
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

### What Changed

Compare this to the polling version from Lesson 2:

| Aspect | Polling Version | Pub/Sub Version |
|--------|----------------|-----------------|
| Database queries | 1 per second per client | 1 total (initial count) |
| Latency | Up to 1 second | Near-instant |
| CPU usage | Constant (sleep + query loop) | Near-zero (blocks on Redis) |
| Scalability | O(n) queries for n clients | O(1) per event |

The Pub/Sub version is dramatically more efficient. When nothing is happening, the `get_message(timeout=15)` call blocks on Redis, consuming essentially no CPU. When a message arrives, every subscriber gets it simultaneously.

### Understanding get_message vs listen

We use `pubsub.get_message(timeout=15)` instead of `pubsub.listen()` for an important reason. `listen()` blocks indefinitely until a message arrives, which means we can never send heartbeats. `get_message(timeout=15)` returns `None` after 15 seconds if no message arrives, giving us a chance to send a heartbeat and keep the connection alive.

```python
# DON'T use listen() for SSE. You can't send heartbeats.
for message in pubsub.listen():  # Blocks forever between messages
    yield format_sse(message)

# DO use get_message() with a timeout
while True:
    message = pubsub.get_message(timeout=15)
    if message is None:
        yield ": heartbeat\n\n"  # Keep connection alive
        continue
    # Process message...
```

## The Complete Data Flow

Here is the full picture of what happens when someone clicks "RSVP" on the Gather event page:

```
User clicks "RSVP"
       │
       ▼
  POST /api/events/42/rsvp/
       │
       ▼
  Django API view
  ├── Creates RSVP in PostgreSQL
  ├── Gets new count
  └── Queues process_rsvp.delay()
       │
       ▼
  Celery Worker picks up task
  ├── Sends confirmation email
  └── r.publish("event:42:rsvps", '{"count": 48}')
       │
       ▼
  Redis Pub/Sub delivers to ALL subscribers
       │
       ├──────────────┬──────────────┐
       ▼              ▼              ▼
  SSE Stream 1   SSE Stream 2   SSE Stream 3
  (Worker 1)     (Worker 2)     (Worker 3)
       │              │              │
       ▼              ▼              ▼
  Client A        Client B      Client C
  sees "48"       sees "48"     sees "48"
```

The key insight: it does not matter which Django worker handles the RSVP request. The Celery task publishes to Redis, and every SSE stream subscribed to that channel receives the update. This works across multiple processes, multiple servers, and even multiple data centers.

## Redis Pub/Sub Characteristics

There are a few important things to know about Redis Pub/Sub behavior:

### Fire and Forget

Messages are not persisted. If no one is subscribed when a message is published, it is gone. This is fine for RSVP counts because reconnecting clients get the current count from the database.

If you need guaranteed delivery, use Redis Streams instead of Pub/Sub. We will not need that for Gather.

### No Message History

Unlike Kafka or RabbitMQ, Redis Pub/Sub has no concept of replaying past messages. A subscriber only receives messages published after it subscribes. Again, this is fine because our SSE endpoint sends the current count on connection, then streams changes.

### Subscriber Connection Cost

Each Pub/Sub subscription uses one Redis connection. With 4,000 SSE connections per Django instance, that is 4,000 Redis connections. Redis can handle around 10,000 connections by default (configurable with `maxclients`). For larger deployments, use connection pooling or Redis Cluster.

```python
# Use a connection pool to manage Redis connections efficiently
import redis

pool = redis.ConnectionPool.from_url(
    settings.REDIS_URL,
    max_connections=5000
)

def get_redis():
    return redis.Redis(connection_pool=pool)
```

### Channel Naming Conventions

Use descriptive, hierarchical channel names:

```python
# Good: specific and namespaced
f"event:{event_id}:rsvps"
f"event:{event_id}:comments"
f"user:{user_id}:notifications"

# Bad: vague or flat
f"updates"
f"rsvp-{event_id}"
```

## Testing the Integration

### Manual Testing with redis-cli

Open three terminal windows:

**Terminal 1: Start the SSE stream**
```bash
curl -N http://localhost:8000/api/events/42/rsvp-stream/
```

**Terminal 2: Monitor Redis channels**
```bash
redis-cli MONITOR
```

**Terminal 3: Simulate a publish**
```bash
redis-cli PUBLISH "event:42:rsvps" '{"count": 48, "event_id": 42, "action": "rsvp_created"}'
```

You should see the event appear in Terminal 1 immediately after publishing in Terminal 3.

### Automated Testing

```python
# events/tests/test_rsvp_stream.py
import json
import threading
import time
import redis
from django.test import TestCase, override_settings
from django.test.client import Client
from events.models import Event


class RsvpStreamTest(TestCase):
    def setUp(self):
        self.event = Event.objects.create(
            title="Test Event",
            capacity=100
        )
        self.redis = redis.Redis.from_url('redis://localhost:6379/0')

    def test_stream_receives_published_message(self):
        """SSE stream should receive messages published to Redis."""
        client = Client()
        response = client.get(
            f'/api/events/{self.event.id}/rsvp-stream/',
            HTTP_ACCEPT='text/event-stream'
        )

        # The response is a StreamingHttpResponse
        self.assertEqual(response['Content-Type'], 'text/event-stream')

        # Read the initial event
        content = next(response.streaming_content).decode('utf-8')
        self.assertIn('rsvp_update', content)

    def test_publish_triggers_sse_event(self):
        """Publishing to Redis should produce an SSE event."""
        # Publish a message in a separate thread after a short delay
        def publish_after_delay():
            time.sleep(0.5)
            self.redis.publish(
                f"event:{self.event.id}:rsvps",
                json.dumps({"count": 5, "event_id": self.event.id})
            )

        thread = threading.Thread(target=publish_after_delay)
        thread.start()

        # Collect SSE events
        client = Client()
        response = client.get(
            f'/api/events/{self.event.id}/rsvp-stream/',
            HTTP_ACCEPT='text/event-stream'
        )

        events_received = []
        for chunk in response.streaming_content:
            decoded = chunk.decode('utf-8')
            events_received.append(decoded)
            if len(events_received) >= 2:  # Initial + published
                break

        thread.join()

        # Verify we got the published event
        all_content = ''.join(events_received)
        self.assertIn('"count": 5', all_content)
```

## Key Takeaways

- In-memory communication between Django workers is impossible because each worker is a separate process with isolated memory. You need an external message broker.
- Redis Pub/Sub provides instant, fan-out messaging across all subscribed processes. When one process publishes, every subscriber receives the message simultaneously.
- The improved SSE endpoint subscribes to a Redis channel and blocks with `get_message(timeout=15)` instead of polling the database. This reduces database load from O(n) queries per second to O(1) per event.
- Celery tasks handle the async work (email, notifications) and then publish to Redis Pub/Sub. This cleanly separates "do the work" from "notify everyone."
- Use `get_message(timeout=N)` instead of `listen()` so you can send SSE heartbeats during quiet periods.
- Redis Pub/Sub is fire-and-forget. Messages are not stored. For RSVP counts this is fine because reconnecting clients get the current state from the database.
- Name your channels descriptively with a hierarchical pattern like `event:{id}:rsvps`.

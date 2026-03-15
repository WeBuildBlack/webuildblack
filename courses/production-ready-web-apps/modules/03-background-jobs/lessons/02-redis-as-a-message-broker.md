---
title: "Redis as a Message Broker"
estimatedMinutes: 35
---

# Redis as a Message Broker

Before you can run background tasks, you need somewhere to put them. The message broker is the middleman between your Django application (which creates tasks) and your Celery workers (which execute them). You could use RabbitMQ, Amazon SQS, or even a PostgreSQL table. For Gather, you are going to use Redis.

Redis is an in-memory data structure server. It is fast (sub-millisecond operations), simple to run, and versatile. You will use it as a message broker in this lesson, as a cache in Module 04, and as a Pub/Sub channel in Module 06. One tool, three roles. That is why Redis is the right choice for Gather.

---

## What Is Redis?

Redis (Remote Dictionary Server) stores data in memory as key-value pairs. Unlike a traditional database that writes to disk first, Redis keeps everything in RAM, which makes it extremely fast. It does persist data to disk periodically for durability, but speed is the primary design goal.

What makes Redis more than a simple key-value store is its support for rich data structures:

| Data Structure | Redis Type | Example Use |
|---------------|------------|-------------|
| Simple values | String | Cache a rendered HTML page |
| Lists | List | Message queue (FIFO) |
| Sets | Set | Track unique visitors |
| Sorted sets | Sorted Set | Leaderboard, rate limiting |
| Hash maps | Hash | Store object fields (like a user profile) |
| Pub/Sub channels | Pub/Sub | Real-time event broadcasting |
| Streams | Stream | Event log with consumer groups |

For task queues, the most relevant structures are **Lists** and **Streams**. Celery uses Lists by default: it pushes task messages onto a Redis list, and workers pop messages off the other end.

---

## Setting Up Redis with Docker Compose

You already have Docker Compose running Django and PostgreSQL for Gather. Adding Redis is straightforward. Open your `docker-compose.yml` and add the Redis service:

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: gather
      POSTGRES_USER: gather
      POSTGRES_PASSWORD: gather
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  backend:
    build: ./backend
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_started
      redis:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgres://gather:gather@db:5432/gather
      - REDIS_URL=redis://redis:6379/0

volumes:
  postgres_data:
  redis_data:
```

Key details about the Redis service:

- **`redis:7-alpine`**: The Alpine-based image is tiny (about 11MB) and includes everything you need.
- **Port 6379**: The default Redis port. Mapped to localhost so you can connect with `redis-cli` from your host machine.
- **`redis_data` volume**: Persists Redis data across container restarts. Without this, stopping the container would lose all queued tasks.
- **Healthcheck**: Docker Compose will wait until Redis responds to `PING` before starting services that depend on it.

Start everything up:

```bash
docker compose up -d
```

Verify Redis is running:

```bash
docker compose exec redis redis-cli ping
# PONG
```

If you see `PONG`, Redis is ready.

---

## Redis CLI Basics

Before connecting from Python, spend a few minutes with `redis-cli` to understand how Redis works at the lowest level. Connect to the Redis container:

```bash
docker compose exec redis redis-cli
```

You are now in an interactive Redis shell. Try these commands:

### Strings (GET/SET)

```redis
SET greeting "hello from Gather"
# OK

GET greeting
# "hello from Gather"

SET user:42:name "Devin Jackson"
# OK

GET user:42:name
# "Devin Jackson"

# Set with expiration (60 seconds)
SET session:abc123 "user_id:42" EX 60
# OK

TTL session:abc123
# (integer) 58
```

The `EX` flag sets a time-to-live in seconds. After 60 seconds, the key is automatically deleted. You will use this heavily for caching in Module 04.

### Lists (LPUSH/RPUSH/LPOP/RPOP)

Lists are the data structure Celery uses for task queues. They work like a double-ended queue (deque):

```redis
# Push tasks onto the right end
RPUSH task_queue '{"task": "send_email", "user_id": 42}'
# (integer) 1

RPUSH task_queue '{"task": "send_email", "user_id": 43}'
# (integer) 2

RPUSH task_queue '{"task": "update_waitlist", "event_id": 7}'
# (integer) 3

# Check the queue length
LLEN task_queue
# (integer) 3

# See all items without removing them
LRANGE task_queue 0 -1
# 1) "{\"task\": \"send_email\", \"user_id\": 42}"
# 2) "{\"task\": \"send_email\", \"user_id\": 43}"
# 3) "{\"task\": \"update_waitlist\", \"event_id\": 7}"

# Pop from the left end (FIFO: first in, first out)
LPOP task_queue
# "{\"task\": \"send_email\", \"user_id\": 42}"

LLEN task_queue
# (integer) 2
```

This is exactly how Celery's Redis broker works under the hood. Celery serializes task information as a JSON message, pushes it onto a Redis list with `RPUSH`, and workers consume messages with `LPOP` (actually `BLPOP`, the blocking variant, which waits for new messages instead of returning immediately when the list is empty).

### Hashes (HSET/HGET)

Hashes store field-value pairs under a single key, like a Python dictionary:

```redis
HSET event:42 title "Brooklyn Tech Meetup" capacity 100 rsvp_count 73
# (integer) 3

HGET event:42 title
# "Brooklyn Tech Meetup"

HGETALL event:42
# 1) "title"
# 2) "Brooklyn Tech Meetup"
# 3) "capacity"
# 4) "100"
# 5) "rsvp_count"
# 6) "73"

HINCRBY event:42 rsvp_count 1
# (integer) 74
```

You will use hashes in Module 04 for caching structured data.

### Pub/Sub

Pub/Sub lets you broadcast messages to multiple subscribers in real time:

```redis
# In one terminal (subscriber):
SUBSCRIBE event_updates
# Waiting for messages...

# In another terminal (publisher):
PUBLISH event_updates '{"event_id": 42, "rsvp_count": 74}'
# (integer) 1
```

The subscriber receives the message instantly. You will use this pattern in Module 06 for live RSVP count updates.

Clean up your test data before moving on:

```redis
DEL greeting user:42:name task_queue event:42
# (integer) 4
```

Type `exit` to leave `redis-cli`.

---

## Connecting from Python

Install the `redis` Python package in your backend's requirements:

```txt
# backend/requirements.txt
django==5.1
djangorestframework==3.15
psycopg[binary]==3.2
redis==5.2
celery==5.4
```

Now test the connection from Python. You can run this in a Django shell or as a standalone script:

```python
# Test Redis connection
import redis

r = redis.Redis.from_url("redis://localhost:6379/0")

# Test basic connectivity
print(r.ping())  # True

# Test string operations
r.set("test_key", "hello from Python")
print(r.get("test_key"))  # b'hello from Python'

# Test list operations (simulating a task queue)
r.rpush("python_queue", '{"task": "send_email", "to": "user@example.com"}')
r.rpush("python_queue", '{"task": "resize_image", "path": "/uploads/photo.jpg"}')

print(r.llen("python_queue"))  # 2

message = r.lpop("python_queue")
print(message)  # b'{"task": "send_email", "to": "user@example.com"}'

# Clean up
r.delete("test_key", "python_queue")
```

Notice that Redis returns bytes (`b'hello from Python'`), not strings. You can configure the client to decode automatically:

```python
r = redis.Redis.from_url("redis://localhost:6379/0", decode_responses=True)
r.set("test_key", "hello")
print(r.get("test_key"))  # 'hello' (string, not bytes)
```

In your Django project, you will not interact with Redis directly for task queues. Celery handles that for you. But you will use the `redis` package directly in Module 04 (caching) and Module 06 (Pub/Sub), so understanding the low-level API matters.

---

## Redis Database Numbers

A single Redis server provides 16 logical databases, numbered 0 through 15. They share the same memory and server process but have isolated key namespaces. By default, connections use database 0.

For Gather, use separate databases for different purposes:

```python
# settings.py

# Database 0: Celery broker (task queue messages)
CELERY_BROKER_URL = "redis://redis:6379/0"

# Database 1: Celery result backend (task results, optional)
CELERY_RESULT_BACKEND = "redis://redis:6379/1"

# Database 2: Django cache (Module 04)
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": "redis://redis:6379/2",
    }
}
```

This separation means you can flush the cache (database 2) without destroying queued tasks (database 0). In production, you might use entirely separate Redis instances, but database numbers work well for development and small-to-medium deployments.

---

## Why Redis Over RabbitMQ?

You will encounter recommendations for RabbitMQ as a Celery broker. RabbitMQ is a dedicated message broker with features like message acknowledgment, dead letter exchanges, exchange routing patterns (fanout, topic, headers), and clustering. For complex messaging architectures, it is the better tool.

For Gather, Redis is the right choice for three reasons:

**1. Simplicity.** Redis is one binary, one port, one configuration. RabbitMQ requires Erlang, has its own management UI, and introduces concepts like exchanges, bindings, and virtual hosts. For a team adding background jobs for the first time, Redis has a much lower learning curve.

**2. Multi-purpose.** You need Redis anyway for caching (Module 04) and Pub/Sub (Module 06). Using it as the Celery broker means one fewer service to run, monitor, and maintain. RabbitMQ would be an additional service that only handles task queues.

**3. Performance for our scale.** At Gather's target of 100K users, Redis handles task queue throughput easily. Redis can process hundreds of thousands of operations per second. RabbitMQ's advantages (message durability guarantees, complex routing) matter more at massive scale or when you need advanced messaging patterns.

The tradeoff: Redis is less durable than RabbitMQ for message queues. If Redis crashes before a worker processes a message, that message could be lost. RabbitMQ persists messages to disk by default. For Gather's use case (emails, notifications, image processing), occasional message loss is acceptable because you can detect and recover from it. If you were building a financial transaction system, you would choose RabbitMQ or a managed service like Amazon SQS.

---

## Redis in Production: Quick Notes

You are running Redis in Docker for development, but here are a few things to keep in mind for production:

**Memory limits.** Redis stores everything in RAM. Set `maxmemory` to prevent Redis from consuming all available memory. For a task broker, 256MB to 1GB is typically plenty:

```redis
CONFIG SET maxmemory 512mb
CONFIG SET maxmemory-policy noeviction
```

The `noeviction` policy means Redis will return errors when memory is full rather than silently deleting keys. For a task broker, you want to know when the queue is backing up, not silently lose tasks.

**Persistence.** Redis offers two persistence modes: RDB (periodic snapshots) and AOF (append-only file logging every write). For a task broker, RDB snapshots every few minutes are sufficient. The Alpine Docker image enables RDB by default.

**Managed services.** In production, consider using a managed Redis service: AWS ElastiCache, Google Cloud Memorystore, or Redis Cloud. They handle replication, failover, backups, and monitoring. The connection URL is the only thing that changes in your Django settings.

---

## Verifying Your Setup

Before moving to Celery in the next lesson, verify that your Docker Compose setup is working correctly:

```bash
# Start all services
docker compose up -d

# Verify Redis is healthy
docker compose exec redis redis-cli ping
# PONG

# Check Redis info
docker compose exec redis redis-cli info server | head -5
# # Server
# redis_version:7.x.x
# redis_mode:standalone
# ...

# Test from the Django container
docker compose exec backend python -c "
import redis
r = redis.Redis.from_url('redis://redis:6379/0')
print('Connected:', r.ping())
print('Redis version:', r.info()['redis_version'])
"
# Connected: True
# Redis version: 7.x.x
```

If all three checks pass, your broker is ready. In the next lesson, you will install Celery, define your first task, and trace a message from an HTTP request through Redis to a background worker.

---

## Key Takeaways

- Redis is an in-memory data structure server that serves as Gather's message broker, cache, and Pub/Sub channel.
- Celery uses Redis Lists as task queues: producers push messages with `RPUSH`, workers consume them with `BLPOP`.
- Docker Compose makes it easy to add Redis alongside your existing Django and PostgreSQL services.
- Use separate Redis database numbers (0 through 15) to isolate broker, result backend, and cache data.
- Redis is simpler and more versatile than RabbitMQ for Gather's scale, and you will reuse it for caching and real-time features in later modules.

---
title: "Horizontal vs. Vertical Scaling"
estimatedMinutes: 35
---

# Horizontal vs. Vertical Scaling

Your app is getting more traffic than it can handle. You need more capacity. You have two options: make your existing machine bigger, or add more machines. This lesson covers both approaches, when to use each, and what changes about your application architecture when you go from one server to many.

## Vertical Scaling: The Bigger Machine

**Vertical scaling** (scaling up) means upgrading your existing server with more CPU, RAM, or faster storage.

```
Before:                     After:
┌──────────────┐           ┌──────────────────────┐
│  2 CPU cores │           │  16 CPU cores         │
│  4 GB RAM    │           │  64 GB RAM            │
│  50 GB SSD   │           │  500 GB NVMe SSD      │
│              │           │                       │
│  Django API  │    ──>    │  Django API            │
│  PostgreSQL  │           │  PostgreSQL            │
│              │           │                       │
│  $20/month   │           │  $320/month            │
└──────────────┘           └──────────────────────┘
```

### Advantages of Vertical Scaling

**Simplicity.** Your application code doesn't change at all. No distributed systems complexity, no network calls between services, no data synchronization issues. Everything is still on one machine.

**No architectural changes.** If your app works on a small server, it works on a big server. Same deployment process, same debugging workflow, same everything.

**Low latency between components.** When Django and PostgreSQL are on the same machine, database queries travel through shared memory or a local socket, not across a network. This eliminates network latency for the most common operation.

### Limits of Vertical Scaling

**There's a ceiling.** The biggest cloud server you can rent (as of 2026) has about 448 CPU cores and 24 TB of RAM. That's a lot, but it's a hard limit. You can't make a machine bigger than the biggest machine that exists.

**Cost scales non-linearly.** Doubling your server's specs often more than doubles the cost. Going from 4 to 8 cores might cost 2x, but going from 64 to 128 cores might cost 3-4x.

**Single point of failure.** If your one big server goes down, everything goes down. No redundancy, no failover, no graceful degradation.

**Downtime for upgrades.** Resizing a server usually requires a reboot. That means downtime, even if it's just a few minutes.

### When Vertical Scaling Makes Sense

Vertical scaling is the right first move when:

- You're early stage with fewer than 10,000 users
- Your bottleneck is CPU or RAM, not I/O or connections
- You haven't exhausted basic optimizations (indexes, caching, query tuning)
- Engineering time is more expensive than server costs
- You need a quick fix while planning a proper scaling strategy

For Gather, vertical scaling would help if we moved to a server with more RAM for PostgreSQL's buffer cache and more CPU cores for Django workers. But it won't solve our connection limit problem or our synchronous email bottleneck.

## Horizontal Scaling: More Machines

**Horizontal scaling** (scaling out) means running multiple copies of your application behind a load balancer.

```
                         ┌──────────────┐
                    ┌───>│  Django #1   │
                    │    │  4 CPU / 8GB │
┌──────────┐       │    └──────────────┘
│  Load    │───────┤
│ Balancer │───────┤    ┌──────────────┐
└──────────┘       │    │  Django #2   │
                    ├───>│  4 CPU / 8GB │
                    │    └──────────────┘
                    │
                    │    ┌──────────────┐
                    └───>│  Django #3   │
                         │  4 CPU / 8GB │
                         └──────────────┘
```

### Advantages of Horizontal Scaling

**No ceiling (in theory).** Need more capacity? Add another server. You can scale to thousands of instances if needed. That's how Netflix, Google, and Amazon handle their traffic.

**Fault tolerance.** If one server crashes, the others keep running. The load balancer routes traffic away from the dead server. Users might not even notice.

**Cost efficiency.** Three medium servers often cost less than one huge server with equivalent total capacity.

**Rolling updates.** You can update servers one at a time. Take server 1 out of the pool, update it, put it back, repeat for server 2 and 3. Zero downtime.

### The Catch: Statefulness

Horizontal scaling works perfectly when your application is **stateless**, meaning each request can be handled by any server independently. But many applications store state in ways that make this difficult.

Common sources of statefulness:

**In-memory sessions:**

```python
# This breaks with multiple servers!
# Session data is stored in Django's memory
# If request 1 hits server A and request 2 hits server B,
# server B doesn't have the session data from server A

SESSION_ENGINE = 'django.contrib.sessions.backends.cache'  # local memory
```

**Local file storage:**

```python
# If a user uploads a file to server A,
# server B can't serve that file
MEDIA_ROOT = '/app/media/'  # local filesystem
```

**In-memory caches:**

```python
# Each server has its own cache. A cache write on server A
# is invisible to server B
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}
```

The fix for all of these is the same: **externalize the state.** Move sessions, files, and caches to shared external services.

```python
# Sessions: Use database or Redis
SESSION_ENGINE = 'django.contrib.sessions.backends.db'

# Files: Use object storage (S3, MinIO)
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'

# Cache: Use Redis
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://redis:6379/0',
    }
}
```

## Load Balancers: The Traffic Cop

A **load balancer** sits in front of your servers and distributes incoming requests across them. It's the key component that makes horizontal scaling work.

```
Client Request
      │
      ▼
┌─────────────────┐
│  Load Balancer   │
│                  │
│  Algorithms:     │
│  - Round Robin   │
│  - Least Conn    │
│  - IP Hash       │
│  - Weighted      │
└────────┬────────┘
    ┌────┼────┐
    ▼    ▼    ▼
  App1  App2  App3
```

### Load Balancing Algorithms

**Round Robin:** Requests go to servers in order. Server 1, then 2, then 3, then back to 1. Simple and fair, but doesn't account for server load or response time.

```
Request 1 → Server A
Request 2 → Server B
Request 3 → Server C
Request 4 → Server A
Request 5 → Server B
...
```

**Least Connections:** Sends each request to whichever server currently has the fewest active connections. Better than round robin when some requests take longer than others.

```
Server A: 5 active connections
Server B: 2 active connections  ← next request goes here
Server C: 8 active connections
```

**IP Hash:** Routes requests from the same client IP to the same server. Useful when you need "sticky sessions" (keeping a user on the same server). However, this reduces the effectiveness of load balancing.

**Weighted:** Assigns a weight to each server based on its capacity. A server with weight 3 gets three times as many requests as a server with weight 1. Useful when your servers have different specs.

### Health Checks

Load balancers periodically check if each server is healthy. If a server fails the health check, it's removed from the pool until it recovers.

```python
# Django health check endpoint
# backend/health/views.py

from django.http import JsonResponse
from django.db import connection

def health_check(request):
    """Load balancer hits this endpoint every 10 seconds."""
    try:
        # Check database connectivity
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")

        return JsonResponse({
            "status": "healthy",
            "database": "connected",
        })
    except Exception as e:
        return JsonResponse(
            {"status": "unhealthy", "error": str(e)},
            status=503
        )
```

```nginx
# nginx load balancer configuration
upstream django_backend {
    least_conn;

    server django1:8000 max_fails=3 fail_timeout=30s;
    server django2:8000 max_fails=3 fail_timeout=30s;
    server django3:8000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;

    location / {
        proxy_pass http://django_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /health {
        proxy_pass http://django_backend;
        access_log off;  # Don't log health checks
    }
}
```

## Stateless vs. Stateful: The Key Distinction

The ease of horizontal scaling depends entirely on whether a component is stateless or stateful.

**Stateless components** don't remember anything between requests. Each request carries all the information needed to process it (via headers, tokens, request body). You can add or remove instances freely.

**Stateful components** store data that must persist or be shared across requests. Scaling them requires strategies like replication, sharding, or consensus protocols.

Let's classify Gather's components:

| Component | Stateful? | Scale Strategy |
|-----------|-----------|---------------|
| Next.js SSR | No (if using external cache) | Horizontal, easy |
| Django API | No (if sessions are external) | Horizontal, easy |
| PostgreSQL | Yes (stores all data) | Vertical first, then read replicas |
| File uploads | Yes (images on disk) | Move to object storage (S3) |
| User sessions | Yes (if in memory) | Move to Redis or database |

Notice the pattern: **make stateful things stateless by externalizing their state.** This is one of the most important architectural patterns for scaling web applications.

### The Shared-Nothing Architecture

The ideal horizontal scaling architecture is called **shared-nothing**: each application server has no local state and shares nothing with the other servers except the external data stores they all connect to.

```
┌──────────────────────────────────────────────┐
│                STATELESS TIER                 │
│                                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  │ Django 1 │  │ Django 2 │  │ Django 3 │     │
│  │ (no local│  │ (no local│  │ (no local│     │
│  │  state)  │  │  state)  │  │  state)  │     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │              │              │          │
└───────┼──────────────┼──────────────┼──────────┘
        │              │              │
┌───────┼──────────────┼──────────────┼──────────┐
│       ▼              ▼              ▼          │
│  ┌─────────┐  ┌──────────┐  ┌────────────┐   │
│  │PostgreSQL│  │  Redis    │  │ Object     │   │
│  │(data)    │  │ (cache +  │  │ Storage    │   │
│  │          │  │  sessions)│  │ (files)    │   │
│  └──────────┘  └──────────┘  └────────────┘   │
│                                                │
│                STATEFUL TIER                   │
└────────────────────────────────────────────────┘
```

In this architecture:
- Any Django server can handle any request
- If Django 2 crashes, Django 1 and 3 keep serving
- Adding Django 4 is as simple as starting another container
- The stateful tier (databases, caches, storage) is managed separately with its own scaling strategy

## Scaling Gather's Components

Let's walk through each piece of Gather and identify the scaling strategy:

### Django API Workers

**Strategy: Horizontal scaling**

Django workers are CPU-bound (processing requests) and I/O-bound (waiting on database queries). Running more workers on more machines directly increases throughput.

```bash
# Run Django with Gunicorn, 4 workers per container
gunicorn gather.wsgi:application \
    --workers 4 \
    --worker-class gthread \
    --threads 2 \
    --bind 0.0.0.0:8000 \
    --timeout 30

# Scale to 3 containers = 12 workers total
# docker-compose.yml
services:
  api:
    build: ./backend
    deploy:
      replicas: 3
```

Each worker can handle one request at a time (with threads, a few concurrent requests). More workers means more concurrent requests.

### Next.js Frontend

**Strategy: Horizontal scaling**

Next.js servers are stateless when configured properly. Server-side rendering is CPU-intensive, so more instances directly increases the number of concurrent page renders.

```bash
# next.config.js already set up for stateless operation
# Just run more instances behind the load balancer
services:
  frontend:
    build: ./frontend
    deploy:
      replicas: 2
```

### PostgreSQL

**Strategy: Vertical first, then read replicas**

PostgreSQL is inherently stateful. You can't just run three copies of it independently because they'd have different data. Scaling strategies:

1. **Vertical scaling**: Give it more RAM (for caching data in memory), faster SSDs, more CPU. This is the first and simplest move.

2. **Read replicas**: Run secondary PostgreSQL instances that replicate from the primary. Route read queries (SELECT) to replicas, write queries (INSERT, UPDATE, DELETE) to the primary.

```
Write queries ──> Primary DB ──replication──> Replica DB 1 <── Read queries
                                         └──> Replica DB 2 <── Read queries
```

3. **Connection pooling**: PgBouncer sits between your app and PostgreSQL, multiplexing hundreds of application connections onto a smaller number of database connections (covered in Module 2).

### File Storage

**Strategy: Move to object storage**

Local file storage doesn't scale horizontally because files on Server A aren't available on Server B. The solution is object storage (like Amazon S3, DigitalOcean Spaces, or MinIO for self-hosting). All servers read and write to the same storage service.

```python
# backend/settings.py

# Before: local storage (doesn't scale)
MEDIA_ROOT = '/app/media/'

# After: S3-compatible object storage (scales infinitely)
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
AWS_STORAGE_BUCKET_NAME = 'gather-uploads'
AWS_S3_REGION_NAME = 'us-east-1'
```

We'll implement this fully in Module 5 (Object Storage and File Processing).

## Making the Decision: Vertical or Horizontal?

Here's a decision framework:

```
Is your bottleneck database queries?
  ├── YES → Optimize queries first (indexes, caching)
  │         then scale PostgreSQL vertically
  │         then add read replicas if needed
  │
  └── NO → Is your bottleneck CPU/memory on the app server?
            ├── YES, and you're on a small server
            │   → Scale vertically (it's simpler)
            │
            ├── YES, and you're already on a big server
            │   → Scale horizontally (add more instances)
            │
            └── NO → Is your bottleneck I/O (email, file processing)?
                     → Move to async processing (Module 3)
```

For most web applications at the Gather stage (thousands of users growing toward 100K), the recommended sequence is:

1. **Optimize first**: Fix slow queries, add indexes, set up caching (free)
2. **Scale vertically**: Upgrade to a bigger server ($50-200/month)
3. **Add connection pooling**: PgBouncer for PostgreSQL ($0, just configuration)
4. **Scale horizontally**: Run 2-4 API instances behind a load balancer ($100-400/month)
5. **Add read replicas**: If reads are the bottleneck ($100-200/month per replica)

This sequence gives you the most improvement at each step with the least architectural complexity.

## Common Scaling Mistakes

**Premature horizontal scaling.** Running 10 API instances when you have 100 users is wasting money and adding complexity. Scale when you need to, not because it sounds cool.

**Ignoring the database.** Adding more API servers doesn't help if they're all waiting on the same slow database query. The database is almost always the real bottleneck.

**Sticky sessions as a crutch.** Using IP-based sticky sessions to avoid making your app stateless just delays the problem. Externalize your state properly.

**Scaling everything equally.** Your API might need 4 instances while your frontend only needs 2. Scale each component based on its actual load.

**Forgetting about the data layer.** Scaling stateless services is relatively easy. Scaling databases, caches, and storage requires fundamentally different approaches. Don't underestimate this.

## Key Takeaways

1. **Vertical scaling** (bigger machine) is simpler but has limits. Start here when you're small.

2. **Horizontal scaling** (more machines) is more complex but has no ceiling. It requires stateless application servers.

3. **Externalize state** (sessions, files, caches) to shared services so your app servers are stateless and interchangeable.

4. **Load balancers** distribute traffic across instances. Use health checks to automatically remove failed servers.

5. **Scale the bottleneck**, not everything. Identify which component is the constraint before throwing hardware at the problem.

6. **The database is special.** It's stateful by nature and requires its own scaling strategy (vertical first, then read replicas or sharding).

## Up Next

We've talked about scaling strategies, but there's a fundamental tradeoff in distributed systems that constrains your choices. The CAP theorem describes the three things a distributed system can provide (consistency, availability, and partition tolerance) and proves you can only have two at once. Understanding this tradeoff is essential for making good architectural decisions.

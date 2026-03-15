---
title: "Connection Pooling with PgBouncer"
estimatedMinutes: 35
---

# Connection Pooling with PgBouncer

You have optimized your queries and added indexes. Gather's event listing loads in under a millisecond. Then your app hits 200 concurrent users and the database starts rejecting connections with this error:

```
django.db.utils.OperationalError: FATAL: too many connections for role "gather_user"
```

This is the connection exhaustion problem, and it hits almost every Django app that scales beyond a single server. The fix is a connection pooler, and PgBouncer is the industry standard.

---

## The Connection Problem

Every time Django handles a request, it needs a database connection. Here is what happens by default:

1. A request arrives at Django
2. Django opens a new TCP connection to PostgreSQL
3. PostgreSQL forks a new backend process (each connection gets its own OS process)
4. Django runs queries
5. The request finishes
6. Django closes the connection
7. PostgreSQL terminates the backend process

Each PostgreSQL backend process consumes about 5-10MB of RAM. If you have 100 connections, that is 500MB-1GB just for connection overhead, before any query work.

PostgreSQL's default `max_connections` is 100. On a typical cloud database instance with 4GB RAM, you can safely handle maybe 200 connections before memory pressure causes performance degradation. That sounds like a lot until you do the math.

### The Math

A single Django process handles one request at a time (Python's GIL). To handle concurrent requests, you run multiple worker processes with Gunicorn:

```
Workers = (2 * CPU cores) + 1
```

On a 4-core server, that is 9 workers. Each worker holds a database connection. If you run 2 Django servers behind a load balancer, that is 18 connections just for web traffic. Add Celery workers for background jobs (say 8 workers), a management command that runs cron jobs (1 connection), and Django Debug Toolbar in staging (more connections). You are already at 27+ connections from a small deployment.

Now scale to production. 4 web servers with 9 workers each = 36 connections. 2 Celery servers with 16 workers each = 32 connections. That is 68 connections, and you have not even accounted for connection churn (opening and closing connections is expensive) or connection spikes (a traffic burst hits all workers at once).

At 100K users, you might have 10 web servers. That is 90 web connections + 32 Celery connections + overhead = easily 150+ connections. You have blown past PostgreSQL's default limit.

### Django's CONN_MAX_AGE

Django has a built-in connection persistence setting:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'gather',
        'CONN_MAX_AGE': 600,  # Keep connections alive for 10 minutes
    }
}
```

This helps because it avoids the overhead of opening and closing connections on every request. But it does not solve the fundamental problem: each Django worker still holds its own connection. You are not pooling connections across workers. You are just reusing them within a single worker.

`CONN_MAX_AGE` is a per-worker cache, not a pool.

---

## What PgBouncer Does

PgBouncer sits between your application and PostgreSQL. Instead of each Django worker opening its own connection to PostgreSQL, all workers connect to PgBouncer. PgBouncer maintains a smaller pool of actual PostgreSQL connections and multiplexes the application connections across them.

```
Django Worker 1 ──┐
Django Worker 2 ──┤
Django Worker 3 ──┤                    ┌── PostgreSQL Connection 1
Django Worker 4 ──┼── PgBouncer Pool ──┤── PostgreSQL Connection 2
Django Worker 5 ──┤                    └── PostgreSQL Connection 3
Celery Worker 1 ──┤
Celery Worker 2 ──┘
```

Seven application connections share three PostgreSQL connections. PgBouncer hands out a real connection when a query needs to run and returns it to the pool immediately after.

### The Three Pooling Modes

PgBouncer has three modes, each with different tradeoffs.

#### Session Pooling

A client gets a PostgreSQL connection for the entire duration of its TCP connection to PgBouncer. The connection is returned to the pool only when the client disconnects.

```ini
pool_mode = session
```

This is the safest mode. It supports all PostgreSQL features, including prepared statements, session-level variables, and LISTEN/NOTIFY. But it is also the least efficient, because a connection is reserved even when the client is idle (waiting for the next HTTP request, for example).

Session pooling helps with connection setup overhead but does not reduce the number of concurrent connections much.

#### Transaction Pooling

A client gets a PostgreSQL connection only for the duration of a transaction. Between transactions, the connection is returned to the pool and can be used by another client.

```ini
pool_mode = transaction
```

This is the most common mode for web applications. A typical Django request runs 3-5 queries in a transaction that takes a few milliseconds. Between requests, the worker is idle for hundreds of milliseconds (waiting for the next HTTP request). Transaction pooling reclaims that idle time.

The restrictions: you cannot use prepared statements, session-level variables (like `SET search_path`), or advisory locks across transactions. For Django, this is usually fine. Django does not use prepared statements by default, and most apps do not use session-level features.

**This is the mode you should use for Gather.**

#### Statement Pooling

A client gets a connection for a single SQL statement. Between statements, even within a transaction, the connection can be reassigned.

```ini
pool_mode = statement
```

This is the most aggressive mode and the most restrictive. Multi-statement transactions do not work, which means Django's `@transaction.atomic` would break. Do not use this mode with Django.

---

## Setting Up PgBouncer with Docker Compose

Add PgBouncer to Gather's existing Docker Compose file. Assuming you already have PostgreSQL running:

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: gather
      POSTGRES_USER: gather_user
      POSTGRES_PASSWORD: gather_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gather_user -d gather"]
      interval: 5s
      timeout: 5s
      retries: 5

  pgbouncer:
    image: edoburu/pgbouncer:1.22.0
    environment:
      DATABASE_URL: postgres://gather_user:gather_password@db:5432/gather
      POOL_MODE: transaction
      DEFAULT_POOL_SIZE: 20
      MIN_POOL_SIZE: 5
      MAX_CLIENT_CONN: 200
      MAX_DB_CONNECTIONS: 25
      RESERVE_POOL_SIZE: 5
      RESERVE_POOL_TIMEOUT: 3
      SERVER_RESET_QUERY: DISCARD ALL
      AUTH_TYPE: plain
    ports:
      - "6432:5432"
    depends_on:
      db:
        condition: service_healthy

  web:
    build: .
    command: gunicorn gather_backend.wsgi:application --bind 0.0.0.0:8000 --workers 4
    environment:
      DATABASE_URL: postgres://gather_user:gather_password@pgbouncer:5432/gather
    ports:
      - "8000:8000"
    depends_on:
      - pgbouncer

volumes:
  postgres_data:
```

Notice the key detail: the `web` service connects to `pgbouncer` on port 5432, not directly to `db`. PgBouncer proxies the connection transparently.

---

## PgBouncer Configuration Explained

Let's break down the environment variables.

### Pool Sizing

```
DEFAULT_POOL_SIZE: 20
```

PgBouncer maintains 20 connections to PostgreSQL per database/user combination. These are the actual PostgreSQL connections that get shared across all clients.

```
MIN_POOL_SIZE: 5
```

Keep at least 5 connections open even when idle. This avoids the overhead of opening new connections during traffic spikes.

```
MAX_CLIENT_CONN: 200
```

Accept up to 200 incoming connections from Django workers, Celery workers, and other clients. These are cheap (PgBouncer handles them in a single process using async I/O, not one process per connection like PostgreSQL).

```
MAX_DB_CONNECTIONS: 25
```

Never open more than 25 actual connections to PostgreSQL, even under heavy load. This is your hard ceiling to protect the database.

### Reserve Pool

```
RESERVE_POOL_SIZE: 5
RESERVE_POOL_TIMEOUT: 3
```

If all 20 default pool connections are in use and a client has been waiting for 3 seconds, PgBouncer creates up to 5 additional connections (up to `MAX_DB_CONNECTIONS`). This handles brief traffic spikes without making them wait forever.

### Server Reset

```
SERVER_RESET_QUERY: DISCARD ALL
```

When a connection is returned to the pool after a transaction, PgBouncer runs `DISCARD ALL` to reset any session state (temporary tables, session variables). This prevents one client's session state from leaking to another client.

---

## Django Configuration for PgBouncer

Update Gather's database settings to work with PgBouncer:

```python
# gather_backend/settings.py
import dj_database_url

DATABASES = {
    'default': dj_database_url.config(
        default='postgres://gather_user:gather_password@pgbouncer:5432/gather',
        conn_max_age=0,  # Important: let PgBouncer manage connection lifetime
    )
}

# Disable server-side cursors (incompatible with transaction pooling)
DATABASES['default']['DISABLE_SERVER_SIDE_CURSORS'] = True
```

### Why CONN_MAX_AGE = 0?

With PgBouncer in transaction pooling mode, you want Django to release connections back to PgBouncer after each request. Setting `CONN_MAX_AGE=0` tells Django to close the connection at the end of each request. PgBouncer handles the actual connection lifecycle.

If you set `CONN_MAX_AGE=600` with PgBouncer, Django would hold onto the PgBouncer connection for 10 minutes, defeating the purpose of transaction pooling. The PgBouncer connection would be reserved for one Django worker the entire time, even between requests.

### Why Disable Server-Side Cursors?

Django uses server-side cursors for `iterator()` queries on large result sets. Server-side cursors require a persistent connection (they are session-level objects). In transaction pooling mode, the connection might get reassigned between queries, breaking the cursor. Disabling them makes Django use client-side cursors, which are compatible with transaction pooling.

```python
# This works fine with PgBouncer (client-side cursor)
for event in Event.objects.all().iterator(chunk_size=1000):
    process(event)
```

---

## Connection Limits Math

Here is how to calculate the right pool size for Gather at 100K users.

### Step 1: Estimate Concurrent Requests

Assume 100K registered users with 5% daily active (5,000 DAU). During peak hour, 20% of DAU is active simultaneously: 1,000 concurrent users. Each user makes a request every 10 seconds on average: 100 requests per second.

### Step 2: Calculate Required Workers

Each Django request takes about 50ms on average (including database queries). A single Gunicorn worker handles 1000ms / 50ms = 20 requests per second. To handle 100 req/s, you need at least 5 workers.

In practice, add headroom for slow requests and spikes. Run 4 servers with 4 workers each = 16 workers total.

### Step 3: Size PgBouncer Pool

Each worker uses a database connection for about 10ms per request (the query portion of the 50ms request time). That means each worker needs a database connection only 20% of the time. With transaction pooling, 16 workers sharing a pool of 5 connections would have enough capacity. But add headroom:

```
DEFAULT_POOL_SIZE = 20   # Comfortable headroom for 16 workers
MAX_DB_CONNECTIONS = 30  # Hard limit including reserve pool
MAX_CLIENT_CONN = 200    # Accept all workers + Celery + overhead
```

### Step 4: Verify PostgreSQL Limits

Check your PostgreSQL instance's `max_connections`:

```sql
SHOW max_connections;
```

The default is 100. Your PgBouncer `MAX_DB_CONNECTIONS` (30) is well under that. Leave room for direct connections (admin queries, migrations) and other services:

```
PgBouncer: 30
Admin/migrations: 5
Monitoring: 5
Total: 40 out of 100
```

Plenty of headroom.

---

## Monitoring PgBouncer

PgBouncer exposes statistics through a virtual `pgbouncer` database. Connect to it and query stats:

```bash
psql -h localhost -p 6432 -U gather_user pgbouncer
```

```sql
-- Current pool status
SHOW POOLS;

-- Active and waiting clients
SHOW CLIENTS;

-- Connection statistics
SHOW STATS;

-- Per-database connection counts
SHOW DATABASES;
```

The `SHOW POOLS` output tells you how many connections are active, idle, and waiting:

```
 database |   user      | cl_active | cl_waiting | sv_active | sv_idle | sv_used | sv_tested | sv_login | maxwait
----------+-------------+-----------+------------+-----------+---------+---------+-----------+----------+---------
 gather   | gather_user |        12 |          0 |         4 |      16 |       0 |         0 |        0 |       0
```

- **cl_active**: 12 client connections currently in a transaction
- **cl_waiting**: 0 clients waiting for a server connection (this should stay at 0)
- **sv_active**: 4 PostgreSQL connections currently running queries
- **sv_idle**: 16 PostgreSQL connections idle in the pool, ready for use

If `cl_waiting` is consistently above 0, your pool is too small. Increase `DEFAULT_POOL_SIZE`.

---

## Common PgBouncer Issues

### Prepared Statement Errors

If you see:

```
ERROR: prepared statement "S_1" already exists
```

Your application is using prepared statements, which are incompatible with transaction pooling. In Django, this usually comes from third-party libraries. The fix is to disable prepared statements in the library or switch to session pooling mode.

### "No more connections allowed" Errors

If `MAX_CLIENT_CONN` is too low, PgBouncer rejects new connections:

```
ERROR: no more connections allowed (max_client_conn)
```

Increase `MAX_CLIENT_CONN`. This is cheap; PgBouncer can handle thousands of client connections with minimal memory.

### Slow Query Timeouts

If a long-running query holds a server connection for 30 seconds, that connection is unavailable to the pool the entire time. Add query timeouts:

```ini
query_timeout = 30
```

This kills queries that run longer than 30 seconds, freeing the connection. Make sure your application handles the timeout error gracefully.

---

## Key Takeaways

1. **Connection exhaustion** is the most common scaling bottleneck after slow queries. It hits when the number of application workers exceeds PostgreSQL's connection limit.

2. **PgBouncer in transaction pooling mode** is the standard solution. It lets hundreds of application connections share a small pool of PostgreSQL connections.

3. **Set CONN_MAX_AGE=0** in Django when using PgBouncer transaction pooling. Let PgBouncer manage connection lifetime.

4. **Disable server-side cursors** in Django for PgBouncer compatibility.

5. **Size your pool** based on actual concurrency, not total workers. With transaction pooling, you need far fewer PostgreSQL connections than application workers.

6. **Monitor `cl_waiting`** in PgBouncer stats. If clients are waiting, your pool is too small.

In the next lesson, you will learn how to run database migrations without taking your application offline.

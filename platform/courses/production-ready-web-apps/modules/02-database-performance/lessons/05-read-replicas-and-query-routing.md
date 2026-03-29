---
title: "Read Replicas and Query Routing"
estimatedMinutes: 35
---

# Read Replicas and Query Routing

You have indexed your queries, set up PgBouncer, and learned to run migrations safely. Gather is handling 100K users. But as traffic grows, you notice that the primary database CPU is consistently at 80% during peak hours. Most of that load is read traffic: listing events, checking RSVP counts, loading user profiles. Writes (creating events, submitting RSVPs) are only 10-15% of total queries.

This is the classic read-heavy workload pattern, and the solution is read replicas. You create one or more copies of your database that stay synchronized with the primary. Then you route read queries to the replicas, freeing up the primary to handle writes.

---

## How PostgreSQL Replication Works

PostgreSQL uses **streaming replication** to keep replicas in sync with the primary. Here is the flow:

1. A write happens on the primary (INSERT, UPDATE, DELETE)
2. PostgreSQL writes the change to the Write-Ahead Log (WAL)
3. The WAL record is streamed to each replica over a TCP connection
4. Each replica applies the WAL record to its own copy of the data

This happens continuously, with typical replication lag under 1 millisecond on a local network. But lag can spike during heavy write bursts, network issues, or when a replica is catching up after being offline.

### Synchronous vs. Asynchronous Replication

**Asynchronous** (default): The primary does not wait for replicas to confirm receipt of the WAL. Writes are fast, but there is a window where a replica might be slightly behind. If the primary crashes, uncommitted WAL records could be lost.

**Synchronous**: The primary waits for at least one replica to confirm before committing the transaction. This guarantees no data loss but adds latency to every write (the network round-trip time to the replica).

For Gather, asynchronous replication is the right choice. The occasional millisecond of read lag is acceptable, and you do not want to slow down every RSVP submission by waiting for a replica to acknowledge.

---

## Setting Up a Read Replica with Docker Compose

Add a replica to Gather's Docker Compose setup:

```yaml
# docker-compose.yml
services:
  db-primary:
    image: postgres:16
    environment:
      POSTGRES_DB: gather
      POSTGRES_USER: gather_user
      POSTGRES_PASSWORD: gather_password
      POSTGRES_HOST_AUTH_METHOD: md5
    volumes:
      - primary_data:/var/lib/postgresql/data
      - ./docker/postgres/primary-init.sh:/docker-entrypoint-initdb.d/init.sh
    ports:
      - "5432:5432"
    command: >
      postgres
      -c wal_level=replica
      -c max_wal_senders=3
      -c max_replication_slots=3
      -c hot_standby=on

  db-replica:
    image: postgres:16
    environment:
      PGUSER: replicator
      PGPASSWORD: replicator_password
    volumes:
      - replica_data:/var/lib/postgresql/data
    ports:
      - "5433:5432"
    depends_on:
      - db-primary

  pgbouncer:
    image: edoburu/pgbouncer:1.22.0
    environment:
      DATABASE_URL: postgres://gather_user:gather_password@db-primary:5432/gather
      POOL_MODE: transaction
      DEFAULT_POOL_SIZE: 20
      MAX_CLIENT_CONN: 200
    ports:
      - "6432:5432"
    depends_on:
      - db-primary

  pgbouncer-replica:
    image: edoburu/pgbouncer:1.22.0
    environment:
      DATABASE_URL: postgres://gather_user:gather_password@db-replica:5432/gather
      POOL_MODE: transaction
      DEFAULT_POOL_SIZE: 20
      MAX_CLIENT_CONN: 200
    ports:
      - "6433:5432"
    depends_on:
      - db-replica

volumes:
  primary_data:
  replica_data:
```

The primary initialization script sets up replication:

```bash
#!/bin/bash
# docker/postgres/primary-init.sh

# Create replication user
psql -U gather_user -d gather -c "
  CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'replicator_password';
"

# Allow replication connections
echo "host replication replicator all md5" >> "$PGDATA/pg_hba.conf"
```

The replica needs to be initialized from a base backup of the primary. In production, you would use `pg_basebackup`. For local development, most cloud providers (AWS RDS, Cloud SQL, Supabase) handle replica creation through their dashboard or CLI.

---

## Django's DATABASE_ROUTERS

Django has built-in support for multiple databases. You define them in `DATABASES` and use a router to direct queries to the appropriate database.

### Step 1: Define Both Databases

```python
# gather_backend/settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'gather',
        'USER': 'gather_user',
        'PASSWORD': 'gather_password',
        'HOST': 'pgbouncer',       # Primary through PgBouncer
        'PORT': '5432',
        'CONN_MAX_AGE': 0,
        'OPTIONS': {
            'options': '-c default_transaction_read_only=off',
        },
    },
    'replica': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'gather',
        'USER': 'gather_user',
        'PASSWORD': 'gather_password',
        'HOST': 'pgbouncer-replica',  # Replica through PgBouncer
        'PORT': '5432',
        'CONN_MAX_AGE': 0,
        'OPTIONS': {
            'options': '-c default_transaction_read_only=on',
        },
    },
}

DATABASE_ROUTERS = ['gather_backend.routers.PrimaryReplicaRouter']
```

The `default_transaction_read_only=on` option adds a safety net: if your code accidentally tries to write to the replica, PostgreSQL raises an error instead of silently failing.

### Step 2: Create the Router

```python
# gather_backend/routers.py
import random

class PrimaryReplicaRouter:
    """
    Route read queries to the replica, write queries to the primary.
    """

    # Models that should always read from primary
    # (e.g., because they need absolute consistency after writes)
    PRIMARY_ONLY_MODELS = set()

    def db_for_read(self, model, **hints):
        """
        Route reads to the replica unless the model requires primary reads.
        """
        if model._meta.label in self.PRIMARY_ONLY_MODELS:
            return 'default'

        # If we're inside a transaction.atomic() block, stay on primary
        # to avoid reading stale data after a write
        if hints.get('instance') and hasattr(hints['instance'], '_state'):
            if hints['instance']._state.db == 'default':
                return 'default'

        return 'replica'

    def db_for_write(self, model, **hints):
        """
        All writes go to the primary.
        """
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations between objects from any database.
        """
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Only run migrations on the primary.
        """
        return db == 'default'
```

### How the Router Works

Every time Django runs a query, it calls the appropriate router method:

- `Event.objects.all()` calls `db_for_read()`, which returns `'replica'`
- `Event.objects.create(...)` calls `db_for_write()`, which returns `'default'`
- `python manage.py migrate` calls `allow_migrate()`, which only allows the primary

---

## Replication Lag and Its Implications

Replication lag is the time between when a write happens on the primary and when it appears on the replica. In practice, this creates a consistency problem.

### The Classic Bug

1. User submits an RSVP (write goes to primary)
2. Page redirects to the event detail page
3. Event detail page reads RSVPs from the replica
4. The RSVP is not there yet (replica is 50ms behind)
5. User thinks their RSVP was lost

This is called a **read-your-writes consistency** violation. The user wrote data and then immediately read stale data.

### Solution 1: Force Primary Reads After Writes

Use Django's `using()` to explicitly route to the primary when you know the user just wrote data:

```python
# views.py
from django.shortcuts import redirect
from django.db import transaction

class RSVPCreateView(APIView):
    def post(self, request, event_id):
        with transaction.atomic():
            rsvp = RSVP.objects.create(
                event_id=event_id,
                user=request.user,
                status='confirmed',
            )

        # Set a session flag so the next read uses primary
        request.session['read_from_primary_until'] = (
            timezone.now() + timezone.timedelta(seconds=5)
        ).isoformat()

        return redirect('event-detail', pk=event_id)
```

Then in a middleware, check the flag:

```python
# gather_backend/middleware.py
import threading
from django.utils import timezone

# Thread-local storage for the current request's routing preference
_routing_context = threading.local()

def get_force_primary():
    return getattr(_routing_context, 'force_primary', False)

class ReplicaLagMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Check if this request should read from primary
        read_until = request.session.get('read_from_primary_until')
        if read_until:
            read_until_dt = timezone.datetime.fromisoformat(read_until)
            if timezone.now() < read_until_dt:
                _routing_context.force_primary = True
            else:
                del request.session['read_from_primary_until']
                _routing_context.force_primary = False
        else:
            _routing_context.force_primary = False

        response = self.get_response(request)
        _routing_context.force_primary = False
        return response
```

Update the router to check this flag:

```python
# gather_backend/routers.py
from gather_backend.middleware import get_force_primary

class PrimaryReplicaRouter:
    def db_for_read(self, model, **hints):
        if get_force_primary():
            return 'default'

        if model._meta.label in self.PRIMARY_ONLY_MODELS:
            return 'default'

        return 'replica'

    # ... rest of router ...
```

For 5 seconds after any write, all reads for that user go to the primary. This gives the replica time to catch up.

### Solution 2: Use `using()` Explicitly

For critical reads where you absolutely need current data, bypass the router entirely:

```python
# Always read from primary for this specific query
rsvp = RSVP.objects.using('default').filter(
    event_id=event_id,
    user=request.user,
).first()
```

This is simpler but requires you to remember it everywhere. The middleware approach is more systematic.

---

## When to Use Replicas vs. Caching

Both replicas and caching reduce load on the primary database, but they solve different problems.

### Use Read Replicas When

- Your queries return different results for different inputs (event listings filtered by date, user-specific data)
- Data freshness within a few seconds is acceptable
- You need the full power of SQL (joins, aggregations, filtering)
- Your read load would overwhelm a single database server

### Use Caching (Redis/Memcached) When

- The same query is repeated frequently with the same result (homepage event count, site-wide stats)
- You can tolerate data that is minutes old
- The result is expensive to compute (complex aggregations)
- You want sub-millisecond response times

### Use Both When

- Route reads to replicas for personalized queries (user's RSVPs, organizer's events)
- Cache popular, shared data in Redis (trending events, category counts)
- Keep writes on the primary

For Gather at 100K users, the recommended architecture:

```
                         ┌── Redis (cached counts, trending)
                         │
User Request ── Django ──┼── Primary (writes, post-write reads)
                         │
                         └── Replica (general reads, listings)
```

---

## Applying to Gather: Route Event Listings to Replica

The event listing endpoint is Gather's most-hit read endpoint. Let's make sure it uses the replica.

```python
# events/views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from events.models import Event
from events.serializers import EventSerializer

class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = Event.objects.select_related('organizer').order_by('date')

        # Filter by upcoming events
        if self.action == 'list':
            qs = qs.filter(date__gte=timezone.now())

        return qs

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)
```

With the router in place, `self.action == 'list'` (a GET request) automatically routes to the replica. `perform_create` (a POST request) automatically routes to the primary. You do not need to add any `using()` calls.

Verify by checking the SQL logs. Enable query logging in your settings:

```python
# settings.py (development only)
LOGGING = {
    'version': 1,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django.db.backends': {
            'level': 'DEBUG',
            'handlers': ['console'],
        },
    },
}
```

When you load the event listing page, you should see queries going to the `replica` database. When you create an event, the INSERT goes to `default`.

---

## Monitoring Replication Lag

Keep an eye on replication lag in production. High lag means your replicas are serving stale data.

### On the Primary

```sql
SELECT
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    (sent_lsn - replay_lsn) AS replication_lag_bytes,
    write_lag,
    flush_lag,
    replay_lag
FROM pg_stat_replication;
```

### On the Replica

```sql
SELECT
    now() - pg_last_xact_replay_timestamp() AS replication_lag;
```

This returns the time since the last replayed transaction. If this exceeds a few seconds, investigate. Common causes:

- **Heavy write load on primary**: The replica cannot apply WAL records fast enough
- **Network issues**: WAL streaming is delayed
- **Replica under-provisioned**: The replica needs more CPU or I/O capacity
- **Long-running queries on replica**: A query that takes 30 seconds holds a snapshot, preventing cleanup and causing the replica to fall behind

### Alert Thresholds

Set up monitoring alerts for replication lag:

- **Warning**: Lag > 1 second
- **Critical**: Lag > 10 seconds
- **Emergency**: Lag > 60 seconds (consider removing replica from rotation)

---

## Key Takeaways

1. **Read replicas** offload read traffic from the primary database. Most web applications are 80-90% reads, so this can dramatically reduce primary load.

2. **Django's DATABASE_ROUTERS** let you route reads and writes to different databases with minimal code changes.

3. **Replication lag** causes read-your-writes consistency issues. Mitigate with session-based primary routing after writes.

4. **Use `using('default')`** for critical reads that must return current data.

5. **Replicas and caching serve different purposes**. Use replicas for personalized, varied queries. Use caching for repeated, shared results.

6. **Monitor replication lag** and alert when it exceeds thresholds. High lag means stale reads.

In the module project, you will put all of these concepts together: seeding data, profiling queries, adding indexes, setting up PgBouncer, writing a zero-downtime migration, and benchmarking the results.

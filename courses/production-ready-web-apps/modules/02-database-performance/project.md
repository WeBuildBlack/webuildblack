---
title: "Gather Under Load"
estimatedMinutes: 90
---

# Gather Under Load

Your Gather event platform works great in development. In this project, you will find out what happens when it meets real-world data volumes. You will seed the database with 100K events and 1M RSVPs, profile the slow queries that emerge, add strategic indexes, set up PgBouncer for connection pooling, write a zero-downtime migration, and benchmark everything before and after.

By the end, you will have hands-on experience with every optimization technique from this module and a clear methodology for diagnosing and fixing database performance problems.

## What You'll Practice

- Seeding large datasets with a Django management command (Lesson 1, 2)
- Profiling queries with Django Debug Toolbar and EXPLAIN ANALYZE (Lesson 1)
- Adding strategic indexes based on query analysis (Lesson 2)
- Setting up PgBouncer with Docker Compose (Lesson 3)
- Writing a zero-downtime migration for a new field (Lesson 4)
- Benchmarking with Locust (all lessons)

## Prerequisites

- Gather backend from the Full-Stack Python course (Django + DRF)
- Docker and Docker Compose installed
- Python 3.12+
- Completed all five lessons in this module

## Project Setup

Make sure your Gather project is running with Docker Compose. Your starting `docker-compose.yml` should have at least a `db` (PostgreSQL) and `web` (Django) service.

Install the additional packages you will need:

```bash
cd gather-backend
source .venv/bin/activate
pip install django-debug-toolbar locust Faker
pip freeze > requirements.txt
```

---

## Step 1: Seed the Database

Create a management command that generates realistic test data at production scale.

```python
# events/management/commands/seed_load_test.py
import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from faker import Faker

from events.models import Event, RSVP

fake = Faker()


class Command(BaseCommand):
    help = 'Seed database with production-scale test data for load testing'

    def add_arguments(self, parser):
        parser.add_argument('--users', type=int, default=10_000)
        parser.add_argument('--events', type=int, default=100_000)
        parser.add_argument('--rsvps', type=int, default=1_000_000)
        parser.add_argument('--batch-size', type=int, default=5_000)

    def handle(self, *args, **options):
        num_users = options['users']
        num_events = options['events']
        num_rsvps = options['rsvps']
        batch_size = options['batch_size']

        self.stdout.write('Clearing existing data...')
        RSVP.objects.all().delete()
        Event.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

        # --- Create Users ---
        self.stdout.write(f'Creating {num_users} users...')
        # TODO: Use bulk_create to insert users in batches.
        # Generate users with unique usernames and emails using Faker.
        # Print progress every batch_size users.
        # Store the created user objects in a list called `users`.

        # --- Create Events ---
        self.stdout.write(f'Creating {num_events} events...')
        now = timezone.now()
        locations = [
            'Brooklyn Commons', 'Manhattan Tech Hub', 'Queens Innovation Center',
            'Bronx Community Hall', 'Harlem Studio', 'Downtown Conference Center',
            'Williamsburg Loft', 'DUMBO Workshop Space', 'Park Slope Library',
            'Fort Greene Cultural Center',
        ]

        # TODO: Use bulk_create to insert events in batches.
        # For each event:
        #   - title: use fake.catch_phrase() or similar
        #   - description: use fake.paragraph(nb_sentences=5)
        #   - date: random datetime between now - 180 days and now + 180 days
        #   - location: random choice from the locations list
        #   - capacity: random integer between 10 and 500
        #   - organizer: random choice from users
        # Print progress every batch_size events.
        # Store created events in a list called `events`.

        # --- Create RSVPs ---
        self.stdout.write(f'Creating {num_rsvps} RSVPs...')
        statuses = ['confirmed', 'confirmed', 'confirmed', 'waitlisted', 'cancelled']

        # TODO: Use bulk_create with ignore_conflicts=True to insert RSVPs in batches.
        # For each RSVP:
        #   - event: random choice from events
        #   - user: random choice from users
        #   - status: random choice from statuses (weighted toward 'confirmed')
        # Use ignore_conflicts=True because the unique_together constraint
        # will reject duplicate (event, user) pairs.
        # Print progress every batch_size RSVPs.

        # --- Print Summary ---
        self.stdout.write(self.style.SUCCESS(
            f'\nSeeding complete:\n'
            f'  Users:  {User.objects.count()}\n'
            f'  Events: {Event.objects.count()}\n'
            f'  RSVPs:  {RSVP.objects.count()}'
        ))

        # --- Update PostgreSQL Statistics ---
        # TODO: Execute raw SQL to run ANALYZE on both events_event and events_rsvp tables.
        # This ensures the query planner has accurate statistics for the new data.
        # Use: from django.db import connection
```

Run the seed command:

```bash
python manage.py seed_load_test
```

This should take 2-5 minutes depending on your machine. When it finishes, verify the counts in the Django shell:

```python
from events.models import Event, RSVP
print(f'Events: {Event.objects.count()}')
print(f'RSVPs: {RSVP.objects.count()}')
```

---

## Step 2: Profile Slow Queries

Now that you have production-scale data, profile the three key queries from the lessons.

### Set Up Django Debug Toolbar

```python
# gather_backend/settings.py (add to INSTALLED_APPS and MIDDLEWARE)

# TODO: Add 'debug_toolbar' to INSTALLED_APPS.
# TODO: Add 'debug_toolbar.middleware.DebugToolbarMiddleware' to the top of MIDDLEWARE.
# TODO: Set INTERNAL_IPS = ['127.0.0.1']
# TODO: Add debug toolbar URL pattern to urls.py:
#   if settings.DEBUG:
#       import debug_toolbar
#       urlpatterns = [path('__debug__/', include(debug_toolbar.urls))] + urlpatterns
```

### Create a Profiling Script

```python
# events/management/commands/profile_queries.py
from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone
from django.db.models import Count, Q

from events.models import Event, RSVP


class Command(BaseCommand):
    help = 'Profile key Gather queries with EXPLAIN ANALYZE'

    def explain(self, qs, label):
        """Run EXPLAIN ANALYZE on a queryset and print results."""
        sql, params = qs.query.sql_with_params()
        explain_sql = f'EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) {sql}'

        self.stdout.write(f'\n{"=" * 60}')
        self.stdout.write(f'QUERY: {label}')
        self.stdout.write(f'{"=" * 60}')

        with connection.cursor() as cursor:
            cursor.execute(explain_sql, params)
            for row in cursor.fetchall():
                self.stdout.write(row[0])

    def handle(self, *args, **options):
        now = timezone.now()

        # TODO: Profile Query 1 -- Event Listing
        # Create a queryset that filters upcoming events, orders by date,
        # uses select_related('organizer'), and limits to 20 results.
        # Call self.explain(qs, 'Event Listing (upcoming, first 20)')

        # TODO: Profile Query 2 -- RSVP Check
        # Create a queryset that checks if user_id=1 has an RSVP for event_id=1.
        # Call self.explain(qs, 'RSVP Check (single user + event)')

        # TODO: Profile Query 3 -- Event with RSVP Count
        # Create a queryset that gets upcoming events annotated with a count
        # of confirmed RSVPs, ordered by date, limited to 20.
        # Call self.explain(qs, 'Event Listing with RSVP Count')

        # TODO: Profile Query 4 -- User's RSVP History
        # Create a queryset that gets all confirmed RSVPs for user_id=1,
        # with select_related('event'), ordered by event date.
        # Call self.explain(qs, "User's Confirmed RSVPs")

        self.stdout.write(self.style.SUCCESS('\nProfiling complete. Review the output above.'))
        self.stdout.write('Look for:')
        self.stdout.write('  - Seq Scan on large tables')
        self.stdout.write('  - High "Rows Removed by Filter" counts')
        self.stdout.write('  - Sort operations that could be avoided with indexes')
        self.stdout.write('  - High "Buffers: read" counts (disk I/O)')
```

Run the profiling script and save the output:

```bash
python manage.py profile_queries > profile_before.txt 2>&1
cat profile_before.txt
```

Record the execution time for each query. You will compare these with the "after" results.

---

## Step 3: Add Strategic Indexes

Based on your profiling results, add the indexes that will have the most impact.

```python
# events/models.py

class Event(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    date = models.DateTimeField()
    location = models.CharField(max_length=200)
    capacity = models.IntegerField(default=50)
    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organized_events')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            # TODO: Add an index on 'date' for the event listing query.
            # This should speed up WHERE date >= ... ORDER BY date queries.

            # TODO: Add a composite index on ('organizer', 'date') for the
            # organizer dashboard query.
        ]


class RSVP(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='rsvps')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rsvps')
    status = models.CharField(max_length=20, choices=[
        ('confirmed', 'Confirmed'),
        ('waitlisted', 'Waitlisted'),
        ('cancelled', 'Cancelled'),
    ])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['event', 'user']
        indexes = [
            # TODO: Add a composite index on ('user', 'status') for the
            # user's RSVP history query filtered by status.

            # TODO: Add a partial index on 'event' WHERE status='confirmed'
            # for the confirmed RSVP count aggregation.
            # Use: models.Index(
            #     fields=['event'],
            #     name='idx_rsvp_confirmed',
            #     condition=models.Q(status='confirmed'),
            # )
        ]
```

Generate and apply the migration:

```bash
python manage.py makemigrations events -n add_performance_indexes
python manage.py migrate
```

Now re-run the profiling script and compare:

```bash
python manage.py profile_queries > profile_after.txt 2>&1
cat profile_after.txt
```

You should see dramatic improvements. Document the before and after times for each query.

---

## Step 4: Set Up PgBouncer

Add PgBouncer to your Docker Compose file to handle connection pooling.

```yaml
# docker-compose.yml -- add the pgbouncer service

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

  # TODO: Add a pgbouncer service with the following configuration:
  #   - Image: edoburu/pgbouncer:1.22.0
  #   - DATABASE_URL pointing to the db service
  #   - POOL_MODE: transaction
  #   - DEFAULT_POOL_SIZE: 20
  #   - MIN_POOL_SIZE: 5
  #   - MAX_CLIENT_CONN: 200
  #   - MAX_DB_CONNECTIONS: 25
  #   - RESERVE_POOL_SIZE: 5
  #   - SERVER_RESET_QUERY: DISCARD ALL
  #   - AUTH_TYPE: plain
  #   - Port mapping: 6432:5432
  #   - depends_on db with condition: service_healthy

  web:
    build: .
    command: gunicorn gather_backend.wsgi:application --bind 0.0.0.0:8000 --workers 4
    environment:
      # TODO: Update DATABASE_URL to point to pgbouncer instead of db directly.
      # Change the host from 'db' to 'pgbouncer' and port from 5432 to 5432
      # (PgBouncer's internal port).
      DATABASE_URL: postgres://gather_user:gather_password@db:5432/gather
    ports:
      - "8000:8000"
    depends_on:
      - db

volumes:
  postgres_data:
```

Update Django settings for PgBouncer compatibility:

```python
# gather_backend/settings.py

# TODO: Update DATABASES to work with PgBouncer:
# 1. Set CONN_MAX_AGE to 0 (let PgBouncer manage connection lifetime)
# 2. Set DISABLE_SERVER_SIDE_CURSORS to True (required for transaction pooling)
# Example:
# DATABASES = {
#     'default': {
#         ...
#         'CONN_MAX_AGE': 0,
#         'DISABLE_SERVER_SIDE_CURSORS': True,
#     }
# }
```

Rebuild and verify:

```bash
docker compose up -d --build
```

Test that the application still works by hitting the event listing endpoint:

```bash
curl http://localhost:8000/api/events/ | python -m json.tool | head -20
```

Verify PgBouncer stats:

```bash
docker compose exec pgbouncer psql -U gather_user -h 127.0.0.1 -p 5432 pgbouncer -c "SHOW POOLS;"
```

---

## Step 5: Write a Zero-Downtime Migration

Add a `category` field to the Event model using the safe three-step pattern.

### Step 5a: Add Nullable Column

```python
# events/models.py
class Event(models.Model):
    # ... existing fields ...
    # TODO: Add a 'category' field as CharField(max_length=50, null=True, blank=True).
    # This is Step 1 of the three-step safe migration pattern.
    pass
```

```bash
python manage.py makemigrations events -n add_category_nullable
python manage.py migrate
```

### Step 5b: Backfill Existing Data

```python
# events/management/commands/backfill_category.py
from django.core.management.base import BaseCommand
from events.models import Event


CATEGORY_CHOICES = ['Workshop', 'Meetup', 'Conference', 'Hackathon', 'Social', 'Panel']


class Command(BaseCommand):
    help = 'Backfill category field for existing events'

    def add_arguments(self, parser):
        parser.add_argument('--batch-size', type=int, default=2000)
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **options):
        batch_size = options['batch_size']
        dry_run = options['dry_run']

        total = Event.objects.filter(category__isnull=True).count()
        self.stdout.write(f'Found {total} events without category')

        if dry_run:
            self.stdout.write('Dry run complete. No changes made.')
            return

        # TODO: Implement batch backfill loop:
        # 1. Query for a batch of event IDs where category IS NULL (limit to batch_size)
        # 2. If no IDs returned, break the loop
        # 3. Update those events with a random category from CATEGORY_CHOICES
        #    (use random.choice for each batch, or assign deterministically based on ID)
        # 4. Print progress: "Updated X / total events"
        # 5. Repeat until no null categories remain

        self.stdout.write(self.style.SUCCESS('Backfill complete.'))
```

```bash
python manage.py backfill_category --dry-run
python manage.py backfill_category
```

### Step 5c: Make Column Required

```python
# events/migrations/XXXX_make_category_required.py
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('events', 'XXXX_add_category_nullable'),  # Update with actual name
    ]

    operations = [
        # TODO: Implement the safe NOT NULL migration using four RunSQL steps:
        #
        # Step 1: Add a NOT VALID check constraint
        # SQL: ALTER TABLE events_event ADD CONSTRAINT category_not_null
        #      CHECK (category IS NOT NULL) NOT VALID;
        # Reverse: DROP CONSTRAINT IF EXISTS category_not_null
        #
        # Step 2: Validate the constraint (scans table, does not block writes)
        # SQL: ALTER TABLE events_event VALIDATE CONSTRAINT category_not_null;
        # Reverse: RunSQL.noop
        #
        # Step 3: Set NOT NULL (instant because constraint is validated)
        # SQL: ALTER TABLE events_event ALTER COLUMN category SET NOT NULL;
        # Reverse: ALTER COLUMN category DROP NOT NULL
        #
        # Step 4: Drop the redundant check constraint
        # SQL: ALTER TABLE events_event DROP CONSTRAINT IF EXISTS category_not_null;
        # Reverse: RunSQL.noop
    ]
```

Apply and verify:

```bash
python manage.py migrate

# Verify the column is NOT NULL
python manage.py shell -c "
from django.db import connection
with connection.cursor() as c:
    c.execute(\"\"\"
        SELECT column_name, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'events_event' AND column_name = 'category'
    \"\"\")
    print(c.fetchone())
"
```

---

## Step 6: Benchmark Before and After

Create a Locust load test to measure the real-world impact of your optimizations.

```python
# locustfile.py
from locust import HttpUser, task, between


class GatherUser(HttpUser):
    wait_time = between(1, 3)

    # TODO: Implement a setup method (on_start) that:
    # 1. Creates a test user or logs in via the API
    # 2. Stores the auth token for subsequent requests

    @task(5)
    def list_events(self):
        """Most common action: browse upcoming events."""
        # TODO: Send a GET request to /api/events/
        # Include the auth token in headers if required.
        pass

    @task(3)
    def view_event_detail(self):
        """View a specific event's details."""
        # TODO: Send a GET request to /api/events/{id}/
        # Use a random event ID between 1 and 100000.
        pass

    @task(2)
    def check_my_rsvps(self):
        """Check the user's RSVP history."""
        # TODO: Send a GET request to the user's RSVP endpoint.
        pass

    @task(1)
    def create_rsvp(self):
        """RSVP to a random event."""
        # TODO: Send a POST request to create an RSVP for a random event.
        # Handle the case where the user already RSVPed (409 or similar).
        pass
```

### Running the Benchmark

Run two rounds: one without your optimizations (revert indexes and PgBouncer) and one with everything in place.

```bash
# Start the app
docker compose up -d

# Run Locust with 50 concurrent users for 60 seconds
locust -f locustfile.py --host=http://localhost:8000 --users 50 --spawn-rate 10 --run-time 60s --headless --csv=results
```

Locust generates CSV files with response time percentiles. Compare:

- **Median response time** (p50)
- **95th percentile response time** (p95)
- **Requests per second**
- **Failure rate**

You should see significant improvements in all four metrics after adding indexes and PgBouncer.

---

## Deliverables Checklist

When you are done, verify you have completed each step:

- [ ] Seed command creates 100K events + 1M RSVPs successfully
- [ ] Profiling script runs EXPLAIN ANALYZE on all four key queries
- [ ] `profile_before.txt` shows Seq Scans and high execution times
- [ ] Strategic indexes added (date, organizer+date, user+status, confirmed partial)
- [ ] `profile_after.txt` shows Index Scans and lower execution times
- [ ] PgBouncer running in Docker Compose with transaction pooling
- [ ] Django configured with CONN_MAX_AGE=0 and DISABLE_SERVER_SIDE_CURSORS=True
- [ ] Category field added via three-step zero-downtime migration pattern
- [ ] Backfill command populates all 100K events with a category
- [ ] NOT NULL constraint applied safely with NOT VALID + VALIDATE
- [ ] Locust benchmark runs and produces response time CSV output
- [ ] Before/after comparison documented with specific numbers

## Stretch Goals

- Add a covering index for the event listing query (include title and location)
- Set up a read replica in Docker Compose and add a Django database router
- Add PgBouncer monitoring to a Grafana dashboard (preview of Module 07)
- Write a concurrent index creation migration using `AddIndexConcurrently`

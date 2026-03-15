---
title: "Database Migrations Without Downtime"
estimatedMinutes: 40
---

# Database Migrations Without Downtime

You have added a new field to your Event model. You run `makemigrations`, review the migration file, and run `migrate`. On your development machine with 100 rows, it finishes in milliseconds. In production with 100K events and active users, that same migration locks the entire `events_event` table for 30 seconds while PostgreSQL rewrites every row. During those 30 seconds, every request that touches the events table hangs, times out, or errors. Your users see a broken app.

This is the table lock problem, and it catches teams off guard because migrations that are instant in development become destructive in production. This lesson teaches you the patterns for running migrations safely on live databases with zero downtime.

---

## Why ALTER TABLE Locks Tables

When you add a column with a default value in PostgreSQL (versions before 11), PostgreSQL must rewrite every row in the table to include the new column's default value. During this rewrite, it holds an **ACCESS EXCLUSIVE** lock on the table, blocking all reads and writes.

PostgreSQL 11+ improved this: adding a column with a constant default no longer rewrites the table. The default is stored in the catalog and applied on read. But many other operations still require locks:

| Operation | Lock Type | Blocks Reads? | Blocks Writes? |
|-----------|-----------|--------------|----------------|
| ADD COLUMN (no default or constant default) | ACCESS EXCLUSIVE (brief) | Yes (briefly) | Yes (briefly) |
| ADD COLUMN with volatile default | ACCESS EXCLUSIVE | Yes | Yes |
| SET NOT NULL | ACCESS EXCLUSIVE | Yes | Yes |
| ADD FOREIGN KEY | SHARE ROW EXCLUSIVE | No | Yes |
| CREATE INDEX | SHARE | No | Yes |
| CREATE INDEX CONCURRENTLY | None (effectively) | No | No |
| DROP COLUMN | ACCESS EXCLUSIVE (brief) | Yes (briefly) | Yes (briefly) |
| ALTER COLUMN TYPE | ACCESS EXCLUSIVE | Yes | Yes |

The problem is not just the lock itself. It is the **lock queue**. If your migration is waiting to acquire a lock, every subsequent query on that table queues up behind it. Even a migration that would take 1 second can cause a 30-second outage if it spends 29 seconds waiting for existing queries to finish.

---

## Pattern 1: Add Nullable Column, Backfill, Add Constraint

The safest way to add a required field is a three-step process spread across multiple deployments.

### Scenario: Add a "category" Field to Events

You want every event to have a category (e.g., "Workshop", "Meetup", "Conference"). The naive approach:

```python
# DON'T DO THIS IN PRODUCTION
class Event(models.Model):
    category = models.CharField(max_length=50, default='Meetup')
```

With Django's `makemigrations`, this generates:

```python
migrations.AddField(
    model_name='event',
    name='category',
    field=models.CharField(default='Meetup', max_length=50),
)
```

On PostgreSQL 11+, this is actually safe because the default is constant. But what if you want the field to be NOT NULL and you need to backfill existing data with different values based on business logic? That requires the three-step approach.

### Step 1: Add the Column as Nullable (Deploy 1)

```python
# events/models.py
class Event(models.Model):
    # ... existing fields ...
    category = models.CharField(max_length=50, null=True, blank=True)
```

```bash
python manage.py makemigrations events -n add_category_nullable
python manage.py migrate
```

The generated SQL:

```sql
ALTER TABLE events_event ADD COLUMN category VARCHAR(50) NULL;
```

This is nearly instantaneous on any table size because PostgreSQL only updates the catalog. No rows are rewritten. The lock is held for microseconds.

Your application code should handle `category=None` gracefully during this transition period. Update your serializers:

```python
class EventSerializer(serializers.ModelSerializer):
    category = serializers.CharField(required=False, default='Meetup')
```

### Step 2: Backfill Existing Data (Deploy 2 or Management Command)

Create a management command that updates rows in batches:

```python
# events/management/commands/backfill_category.py
from django.core.management.base import BaseCommand
from events.models import Event

class Command(BaseCommand):
    help = 'Backfill category field for existing events'

    def add_arguments(self, parser):
        parser.add_argument('--batch-size', type=int, default=1000)
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **options):
        batch_size = options['batch_size']
        dry_run = options['dry_run']

        # Count rows to update
        total = Event.objects.filter(category__isnull=True).count()
        self.stdout.write(f'Found {total} events without category')

        if dry_run:
            self.stdout.write('Dry run, no changes made')
            return

        updated = 0
        while True:
            # Get a batch of IDs to update
            batch_ids = list(
                Event.objects.filter(category__isnull=True)
                .values_list('id', flat=True)[:batch_size]
            )

            if not batch_ids:
                break

            # Update the batch
            count = Event.objects.filter(id__in=batch_ids).update(category='Meetup')
            updated += count
            self.stdout.write(f'Updated {updated}/{total} events')

        self.stdout.write(self.style.SUCCESS(f'Backfill complete: {updated} events updated'))
```

Run it:

```bash
python manage.py backfill_category --dry-run
python manage.py backfill_category --batch-size=500
```

Why batch? If you run `Event.objects.filter(category__isnull=True).update(category='Meetup')` on 100K rows, it holds a row-level lock on all 100K rows for the duration. Batching limits the lock scope and lets other queries interleave.

### Step 3: Add the NOT NULL Constraint (Deploy 3)

Once all rows have a value, make the column required:

```python
# events/models.py
class Event(models.Model):
    category = models.CharField(max_length=50, default='Meetup')  # Remove null=True
```

```bash
python manage.py makemigrations events -n make_category_required
```

Django generates:

```python
migrations.AlterField(
    model_name='event',
    name='category',
    field=models.CharField(default='Meetup', max_length=50),
)
```

The SQL:

```sql
ALTER TABLE events_event ALTER COLUMN category SET NOT NULL;
```

On PostgreSQL 12+, if you first add a CHECK constraint with `NOT VALID`, the SET NOT NULL check becomes instant:

```python
# events/migrations/0006_make_category_required.py
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('events', '0005_backfill_category'),
    ]

    operations = [
        # Step 1: Add a NOT VALID check constraint (no full table scan)
        migrations.RunSQL(
            sql="ALTER TABLE events_event ADD CONSTRAINT category_not_null CHECK (category IS NOT NULL) NOT VALID;",
            reverse_sql="ALTER TABLE events_event DROP CONSTRAINT IF EXISTS category_not_null;",
        ),
        # Step 2: Validate the constraint (scans table but does not block writes)
        migrations.RunSQL(
            sql="ALTER TABLE events_event VALIDATE CONSTRAINT category_not_null;",
            reverse_sql=migrations.RunSQL.noop,
        ),
        # Step 3: Now SET NOT NULL is instant because PostgreSQL sees the valid constraint
        migrations.RunSQL(
            sql="ALTER TABLE events_event ALTER COLUMN category SET NOT NULL;",
            reverse_sql="ALTER TABLE events_event ALTER COLUMN category DROP NOT NULL;",
        ),
        # Step 4: Drop the now-redundant check constraint
        migrations.RunSQL(
            sql="ALTER TABLE events_event DROP CONSTRAINT IF EXISTS category_not_null;",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
```

The `NOT VALID` trick is key. Adding a `NOT VALID` constraint only checks new rows, so it is instant. `VALIDATE CONSTRAINT` scans existing rows but only holds a `SHARE UPDATE EXCLUSIVE` lock, which does not block reads or writes. Once the constraint is validated, `SET NOT NULL` can skip the full scan because PostgreSQL knows all rows already pass the check.

---

## Pattern 2: Creating Indexes Without Downtime

A standard `CREATE INDEX` holds a `SHARE` lock, blocking writes for the entire duration of the index build. On a 100K-row table, this might take a few seconds. On a 10M-row table, it could take minutes.

The solution is `CREATE INDEX CONCURRENTLY`:

```sql
CREATE INDEX CONCURRENTLY idx_event_category ON events_event (category);
```

This builds the index without blocking writes. It takes longer (two table scans instead of one) but your application keeps running normally.

### In Django

Django's `AddIndex` operation does not use `CONCURRENTLY` by default. You need to use `AddIndexConcurrently` from `django.contrib.postgres`:

```python
from django.contrib.postgres.operations import AddIndexConcurrently

class Migration(migrations.Migration):
    atomic = False  # Required for CONCURRENTLY

    dependencies = [
        ('events', '0006_make_category_required'),
    ]

    operations = [
        AddIndexConcurrently(
            model_name='event',
            index=models.Index(fields=['category', 'date'], name='idx_event_category_date'),
        ),
    ]
```

Notice `atomic = False`. Concurrent index creation cannot run inside a transaction, so you must disable the migration's transaction wrapper. This means if the migration fails partway through, it will not roll back automatically. You may need to clean up the invalid index manually:

```sql
-- Check for invalid indexes
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_event%';

-- Drop an invalid index from a failed concurrent build
DROP INDEX CONCURRENTLY IF EXISTS idx_event_category_date;
```

---

## Pattern 3: Renaming Columns Safely

Renaming a column seems simple, but `ALTER TABLE RENAME COLUMN` is instant in PostgreSQL. The real problem is your application code. If you deploy the migration before updating the code, your app tries to query the old column name and crashes. If you update the code first, it tries to query the new column name before the migration runs.

### The Safe Approach

1. **Add the new column** (nullable, same type)
2. **Deploy code** that writes to both old and new columns
3. **Backfill** the new column from the old column
4. **Deploy code** that reads from the new column
5. **Drop the old column**

This is a lot of steps for a rename. In practice, if you can tolerate a brief outage (a few seconds), a direct rename is fine for small tables. Use the multi-step approach only for large, heavily queried tables.

For Django, there is a simpler option. Use `db_column` to change the Python name without changing the database column:

```python
class Event(models.Model):
    # Rename in Python from 'name' to 'title' without touching the database
    title = models.CharField(max_length=200, db_column='name')
```

This changes the Python attribute name but still queries the `name` column in SQL. No migration needed, no downtime risk.

---

## Pattern 4: Changing Column Types Safely

Changing a column type (e.g., `CharField` to `TextField`, or `IntegerField` to `BigIntegerField`) is one of the most dangerous migrations because PostgreSQL must rewrite every row.

### Safe Approach for Expanding Integer Size

The classic case is running out of integer range. Your `id` column is `INTEGER` (max 2.1 billion) and you are approaching the limit.

```python
# DON'T DO THIS DIRECTLY
# This rewrites the entire table
class Event(models.Model):
    id = models.BigAutoField(primary_key=True)
```

Instead:

1. Add a new `BigInteger` column
2. Add a trigger to keep it in sync
3. Backfill existing rows
4. Swap the columns
5. Drop the old column

This is complex enough that you should use a tool like `pg_repack` or plan for a maintenance window on very large tables.

### Safe Approach for CharField to TextField

Good news: `VARCHAR(200)` to `TEXT` is a no-op in PostgreSQL. Text types are stored the same way internally. Just drop the length constraint:

```sql
ALTER TABLE events_event ALTER COLUMN description TYPE TEXT;
```

This is instant because PostgreSQL only updates the catalog.

---

## Testing Migrations Against Production-Sized Data

Never trust a migration that you only tested with 100 rows. Here is how to test safely.

### Step 1: Create a Test Database with Realistic Size

```python
# events/management/commands/seed_test_data.py
from django.core.management.base import BaseCommand
from events.models import Event, RSVP
from django.contrib.auth.models import User
from django.utils import timezone
import random

class Command(BaseCommand):
    help = 'Seed database with production-scale test data'

    def handle(self, *args, **options):
        self.stdout.write('Creating users...')
        users = User.objects.bulk_create([
            User(username=f'user_{i}', email=f'user_{i}@example.com')
            for i in range(1000)
        ], batch_size=500)

        self.stdout.write('Creating events...')
        events = Event.objects.bulk_create([
            Event(
                title=f'Event {i}',
                description=f'Description for event {i}',
                date=timezone.now() + timezone.timedelta(days=random.randint(-365, 365)),
                location=f'Location {i % 50}',
                capacity=random.randint(10, 500),
                organizer=random.choice(users),
            )
            for i in range(100_000)
        ], batch_size=5000)

        self.stdout.write('Creating RSVPs...')
        rsvps = []
        for event in random.sample(events, min(50000, len(events))):
            for user in random.sample(users, random.randint(1, 20)):
                rsvps.append(RSVP(
                    event=event,
                    user=user,
                    status=random.choice(['confirmed', 'waitlisted', 'cancelled']),
                ))
        RSVP.objects.bulk_create(rsvps, batch_size=5000, ignore_conflicts=True)

        self.stdout.write(self.style.SUCCESS(
            f'Created {User.objects.count()} users, '
            f'{Event.objects.count()} events, '
            f'{RSVP.objects.count()} RSVPs'
        ))
```

### Step 2: Time Your Migrations

```bash
# Seed the test database
python manage.py seed_test_data

# Time the migration
time python manage.py migrate events 0007_your_migration

# Check for locks during migration (in another terminal)
psql -c "SELECT pid, mode, relation::regclass, granted
         FROM pg_locks
         WHERE relation = 'events_event'::regclass;"
```

### Step 3: Use a Lock Timeout

Add a lock timeout to your migration so it fails fast instead of blocking other queries indefinitely:

```python
migrations.RunSQL(
    sql=[
        "SET lock_timeout = '5s';",
        "ALTER TABLE events_event ADD COLUMN category VARCHAR(50);",
        "RESET lock_timeout;",
    ],
    reverse_sql="ALTER TABLE events_event DROP COLUMN IF EXISTS category;",
),
```

If the lock cannot be acquired within 5 seconds, the migration fails with an error instead of blocking everything. You can retry during a quieter period.

---

## Django Migration Safety Checklist

Before running any migration in production, check these items:

1. **Does it add a column?** If nullable or with a constant default, it is safe. If NOT NULL without a default, use the three-step pattern.

2. **Does it create an index?** Use `AddIndexConcurrently` with `atomic = False`.

3. **Does it add a constraint?** Use `NOT VALID` then `VALIDATE CONSTRAINT` separately.

4. **Does it change a column type?** Check if PostgreSQL can do it in-place. If not, use the add/backfill/swap pattern.

5. **Does it delete a column?** Make sure no code references it first. The actual DROP is fast.

6. **Does it rename anything?** Consider using `db_column` instead of a real rename.

7. **Have you tested with production-sized data?** Time it. Check the locks.

8. **Do you have a rollback plan?** Write the `reverse_sql` for every `RunSQL` operation.

---

## Key Takeaways

1. **ALTER TABLE operations can lock tables**, blocking all reads and writes. The lock queue makes even brief locks dangerous under load.

2. **The three-step pattern** (add nullable, backfill in batches, add constraint) is the safest way to add required fields.

3. **CREATE INDEX CONCURRENTLY** builds indexes without blocking writes. Always use it in production via Django's `AddIndexConcurrently`.

4. **NOT VALID constraints** let you add and validate CHECK constraints without blocking writes.

5. **Test migrations against production-sized data**. A migration that is instant on 100 rows might lock a table for minutes on 100K rows.

6. **Set lock timeouts** to fail fast instead of blocking the entire application.

In the next lesson, you will learn how to scale reads by routing queries to read replicas.

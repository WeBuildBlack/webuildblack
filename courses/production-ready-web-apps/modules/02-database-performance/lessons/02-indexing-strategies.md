---
title: "Indexing Strategies"
estimatedMinutes: 45
---

# Indexing Strategies

In the previous lesson, you saw Gather's queries struggling with sequential scans on large tables. The fix for most of those problems is the same: add the right index. But "add an index" is not as simple as it sounds. There are different types of indexes, each suited to different query patterns. Adding the wrong index wastes disk space and slows down writes without helping reads. Adding the right index can turn an 85ms query into a 0.5ms query.

This lesson covers the index types you will use most often in production PostgreSQL databases, when each one is appropriate, and how to apply them to Gather using Django's ORM.

---

## How B-Tree Indexes Work

The default index type in PostgreSQL is the B-tree (balanced tree). When you add `db_index=True` to a Django model field or create an index in a migration, you get a B-tree unless you specify otherwise.

A B-tree organizes data in a sorted tree structure. Each node contains multiple keys and pointers, keeping the tree shallow even for millions of rows. Looking up a value requires traversing only 3-4 levels deep, regardless of table size. That is why index lookups are O(log n) while sequential scans are O(n).

Here is the key insight: a B-tree stores data in sorted order. This means it is efficient for:

- **Equality lookups**: `WHERE date = '2026-03-15'`
- **Range queries**: `WHERE date >= '2026-03-01' AND date <= '2026-03-31'`
- **Sorting**: `ORDER BY date` (no separate sort step needed)
- **Prefix matching**: `WHERE title LIKE 'Django%'` (but not `LIKE '%Django'`)

It is not efficient for:

- **Substring searches**: `WHERE title LIKE '%workshop%'` (use full-text search or trigram indexes instead)
- **Array or JSON containment**: `WHERE tags @> ARRAY['python']` (use GIN indexes)

---

## Single-Column Indexes

The simplest index covers one column. Let's fix the event listing query from the previous lesson.

### In Django

```python
# events/models.py
class Event(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    date = models.DateTimeField(db_index=True)  # Add this
    location = models.CharField(max_length=200)
    capacity = models.IntegerField(default=50)
    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organized_events')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

The `db_index=True` parameter tells Django to create a B-tree index on the `date` column when you run `makemigrations` and `migrate`.

### The Generated SQL

```sql
CREATE INDEX "events_event_date_idx" ON "events_event" ("date");
```

### The Impact

Run the event listing query again with EXPLAIN ANALYZE:

```
Limit  (cost=0.42..15.30 rows=20 width=312) (actual time=0.035..0.180 rows=20 loops=1)
  ->  Index Scan using events_event_date_idx on events_event  (cost=0.42..825.30 rows=25000 width=312) (actual time=0.030..0.170 rows=20 loops=1)
        Index Cond: (date >= '2026-03-14 12:00:00+00'::timestamp with time zone)
Planning Time: 0.095 ms
Execution Time: 0.210 ms
```

From 48ms to 0.2ms. The query is 240x faster. Notice:

- **No Sort node**. The B-tree index returns rows already sorted by date.
- **No "Rows Removed by Filter"**. The index skips directly to matching rows.
- **Only 20 rows read**. The `Limit` pushes down into the index scan, so PostgreSQL stops after finding 20 matching rows.

---

## Composite Indexes (Multi-Column)

A composite index covers multiple columns. The column order matters: PostgreSQL can use a composite index for queries that filter on a prefix of its columns, but not for queries that skip the first column.

### When to Use Composite Indexes

Use a composite index when queries frequently filter or sort on the same combination of columns. The classic example in Gather is the RSVP lookup:

```python
# This query runs on every event detail page
RSVP.objects.filter(event_id=event_id, user_id=user_id)
```

A single-column index on `event_id` would help, but the query filters on both `event_id` AND `user_id`. A composite index handles both conditions in a single lookup.

### In Django

Django provides two ways to define composite indexes. The modern approach uses `Meta.indexes`:

```python
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
            models.Index(fields=['event', 'user'], name='idx_rsvp_event_user'),
            models.Index(fields=['user', 'status'], name='idx_rsvp_user_status'),
        ]
```

Wait. You already have `unique_together = ['event', 'user']`. In PostgreSQL, a unique constraint automatically creates a unique index. So the first composite index in the `indexes` list is actually redundant. The `unique_together` already gives you an index on `(event_id, user_id)`.

Let's verify with `\d events_rsvp` in psql:

```
Indexes:
    "events_rsvp_pkey" PRIMARY KEY, btree (id)
    "events_rsvp_event_id_user_id_uniq" UNIQUE CONSTRAINT, btree (event_id, user_id)
```

That unique constraint index handles the RSVP lookup query perfectly. Remove the duplicate:

```python
class Meta:
    unique_together = ['event', 'user']
    indexes = [
        models.Index(fields=['user', 'status'], name='idx_rsvp_user_status'),
    ]
```

### Column Order Matters

The `idx_rsvp_user_status` index on `(user_id, status)` supports these queries:

```python
# Uses the index (filters on first column)
RSVP.objects.filter(user_id=42)

# Uses the index (filters on both columns in order)
RSVP.objects.filter(user_id=42, status='confirmed')

# Does NOT use this index efficiently (skips first column)
RSVP.objects.filter(status='confirmed')
```

Think of it like a phone book sorted by last name, then first name. You can look up "Jackson" (last name only) or "Jackson, Devin" (both), but you cannot efficiently look up everyone named "Devin" regardless of last name.

### The EXPLAIN ANALYZE Difference

Before the composite index on `(user_id, status)`:

```
Seq Scan on events_rsvp  (cost=0.00..22541.00 rows=250 width=48) (actual time=12.300..85.100 rows=237 loops=1)
  Filter: ((user_id = 42) AND (status = 'confirmed'))
  Rows Removed by Filter: 999763
```

After:

```
Index Scan using idx_rsvp_user_status on events_rsvp  (cost=0.42..12.50 rows=250 width=48) (actual time=0.025..0.180 rows=237 loops=1)
  Index Cond: ((user_id = 42) AND (status = 'confirmed'))
```

From 85ms scanning a million rows to 0.18ms reading exactly the rows we need.

---

## Partial Indexes

A partial index only covers rows that match a condition. This makes the index smaller, faster, and more targeted.

### When to Use Partial Indexes

Use a partial index when your queries consistently filter to a subset of the table. In Gather, most queries about events only care about upcoming ones. Past events are still in the table for historical data, but the active queries rarely touch them.

### In Django

```python
class Event(models.Model):
    # ... fields ...

    class Meta:
        indexes = [
            models.Index(
                fields=['date'],
                name='idx_event_upcoming',
                condition=models.Q(date__gte='2026-01-01'),
            ),
        ]
```

Wait, that hardcodes a date. For a partial index on upcoming events, you would write raw SQL in a migration instead:

```python
# events/migrations/0003_add_partial_index.py
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('events', '0002_add_indexes'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE INDEX idx_event_active ON events_event (date)
                WHERE date >= NOW() - INTERVAL '1 year';
            """,
            reverse_sql="DROP INDEX IF EXISTS idx_event_active;",
        ),
    ]
```

Actually, using `NOW()` in a partial index condition creates a static value at index creation time, not a dynamic one. A better approach is to use a condition that stays useful, like indexing only non-cancelled events:

```python
# A more practical partial index for Gather
migrations.RunSQL(
    sql="""
        CREATE INDEX idx_rsvp_confirmed ON events_rsvp (event_id)
        WHERE status = 'confirmed';
    """,
    reverse_sql="DROP INDEX IF EXISTS idx_rsvp_confirmed;",
),
```

This index only includes confirmed RSVPs. If 40% of RSVPs are cancelled or waitlisted, this index is 40% smaller than a full index. The query for counting confirmed RSVPs per event becomes much faster:

```python
# Count confirmed RSVPs for an event
RSVP.objects.filter(event_id=event_id, status='confirmed').count()
```

```
Index Only Scan using idx_rsvp_confirmed on events_rsvp  (cost=0.29..4.50 rows=150 width=0) (actual time=0.015..0.045 rows=147 loops=1)
  Index Cond: (event_id = 1234)
  Heap Fetches: 0
```

The `WHERE status = 'confirmed'` is baked into the index, so PostgreSQL does not even need to check that condition at query time.

---

## Covering Indexes (INCLUDE)

A covering index includes extra columns that are not part of the search key but are needed in the query result. This enables index-only scans by avoiding trips back to the table.

### When to Use Covering Indexes

Use them when you have a frequent query that filters on column A but also selects columns B and C. By including B and C in the index, PostgreSQL can answer the entire query from the index without touching the table heap.

### Example: Event Listing

The event listing page needs `title`, `date`, and `location`:

```python
Event.objects.filter(
    date__gte=timezone.now()
).values('id', 'title', 'date', 'location').order_by('date')[:20]
```

A covering index:

```python
migrations.RunSQL(
    sql="""
        CREATE INDEX idx_event_listing ON events_event (date)
        INCLUDE (title, location);
    """,
    reverse_sql="DROP INDEX IF EXISTS idx_event_listing;",
),
```

Now the query gets an index-only scan:

```
Limit  (cost=0.42..8.20 rows=20 width=220) (actual time=0.020..0.095 rows=20 loops=1)
  ->  Index Only Scan using idx_event_listing on events_event  (cost=0.42..612.10 rows=25000 width=220) (actual time=0.018..0.090 rows=20 loops=1)
        Index Cond: (date >= '2026-03-14 12:00:00+00'::timestamp with time zone)
        Heap Fetches: 0
```

`Heap Fetches: 0` confirms that PostgreSQL never touched the table. Everything came from the index.

### The Tradeoff

Covering indexes are larger because they store extra columns. They also slow down writes because every INSERT and UPDATE must maintain the extra data. Only create them for truly hot queries that run thousands of times per minute.

---

## Identifying Missing Indexes

You do not have to guess which indexes to add. PostgreSQL tells you exactly where the problems are.

### Method 1: pg_stat_user_tables

This view shows sequential scan counts per table:

```sql
SELECT
    relname AS table_name,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY seq_tup_read DESC;
```

```
 table_name    | seq_scan | seq_tup_read | idx_scan | idx_tup_fetch
---------------+----------+--------------+----------+--------------
 events_rsvp   |    15234 |   15234000000|      120 |          4800
 events_event  |     8421 |    842100000 |     2100 |         42000
```

If `seq_tup_read` is in the billions and `idx_scan` is low, that table is being sequentially scanned constantly. It needs indexes.

### Method 2: pg_stat_user_indexes

Check which indexes are actually being used:

```sql
SELECT
    indexrelname AS index_name,
    idx_scan,
    idx_tup_read,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

Indexes with `idx_scan = 0` are unused. They waste disk space and slow down writes. Consider dropping them.

### Method 3: Django Debug Toolbar

In development, install `django-debug-toolbar` to see the SQL queries each page generates, how long each takes, and how many duplicates exist:

```bash
pip install django-debug-toolbar
```

```python
# settings.py (development only)
INSTALLED_APPS = [
    # ...
    'debug_toolbar',
]

MIDDLEWARE = [
    'debug_toolbar.middleware.DebugToolbarMiddleware',
    # ...
]

INTERNAL_IPS = ['127.0.0.1']
```

The toolbar's SQL panel shows you every query, its duration, and the EXPLAIN output. Look for queries over 10ms and queries that run more than once per page load.

---

## Applying Indexes to Gather

Based on the query analysis from the previous lesson, here are the indexes Gather needs:

```python
# events/models.py

class Event(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    date = models.DateTimeField(db_index=True)
    location = models.CharField(max_length=200)
    capacity = models.IntegerField(default=50)
    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organized_events')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            # Listing page: upcoming events sorted by date
            models.Index(fields=['date', 'title'], name='idx_event_date_title'),
            # Organizer dashboard: events by organizer
            models.Index(fields=['organizer', 'date'], name='idx_event_organizer_date'),
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
            # User's RSVP history filtered by status
            models.Index(fields=['user', 'status'], name='idx_rsvp_user_status'),
            # Count confirmed RSVPs per event (partial index)
            models.Index(
                fields=['event'],
                name='idx_rsvp_confirmed',
                condition=models.Q(status='confirmed'),
            ),
        ]
```

Generate and apply the migration:

```bash
python manage.py makemigrations events
python manage.py migrate
```

---

## Index Anti-Patterns

### 1. Indexing Every Column

Each index consumes disk space and slows down INSERT, UPDATE, and DELETE operations. Only index columns that appear in WHERE, JOIN, or ORDER BY clauses of frequent queries.

### 2. Redundant Indexes

An index on `(event_id, user_id)` already covers queries that filter on `event_id` alone. A separate index on just `event_id` is redundant. Check for overlapping prefixes.

### 3. Indexing Low-Cardinality Columns

A column with only 3 possible values (like `status` with 'confirmed', 'waitlisted', 'cancelled') is a poor candidate for a standalone index. PostgreSQL is better off with a sequential scan than jumping around an index that matches 33% of the table. However, low-cardinality columns work well as the second column in a composite index or as a partial index condition.

### 4. Forgetting to ANALYZE After Bulk Loads

After loading large amounts of data, PostgreSQL's table statistics are stale. The query planner might choose a sequential scan over an index scan because it thinks the table is small. Always run `ANALYZE` after bulk operations:

```sql
ANALYZE events_event;
ANALYZE events_rsvp;
```

Django runs this automatically during `migrate`, but not after management command bulk loads.

---

## Key Takeaways

1. **B-tree indexes** handle equality, range, sorting, and prefix matching. They are the right choice for most columns.

2. **Composite indexes** serve queries that filter on multiple columns. Column order must match your query patterns, with the most selective column first.

3. **Partial indexes** cover a subset of rows. Use them when queries consistently filter to the same subset (e.g., only confirmed RSVPs).

4. **Covering indexes** include extra columns to enable index-only scans. Use them for hot queries that select a small set of columns.

5. **Check `pg_stat_user_tables`** to find tables suffering from excessive sequential scans.

6. **Every index has a cost**. It uses disk space and slows writes. Only create indexes that serve real, frequent queries.

In the next lesson, you will learn how to handle another scaling bottleneck: database connection exhaustion.

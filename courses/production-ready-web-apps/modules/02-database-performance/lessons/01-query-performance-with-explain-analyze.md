---
title: "Query Performance with EXPLAIN ANALYZE"
estimatedMinutes: 40
---

# Query Performance with EXPLAIN ANALYZE

Your Django app works great in development with 50 events in the database. Then you deploy to production, real users show up, and suddenly the event listing page takes 4 seconds to load. What changed? The query plan changed. With 50 rows, PostgreSQL can scan the entire table in microseconds. With 100,000 rows, that same scan becomes a real problem.

The tool that makes this visible is `EXPLAIN ANALYZE`. It shows you exactly how PostgreSQL executes a query: which indexes it uses (or doesn't), how many rows it expects versus how many it actually finds, and where the time goes. Learning to read this output is the single most valuable database skill you can develop. It turns "the database is slow" from a vague complaint into a specific, fixable problem.

---

## Your First EXPLAIN ANALYZE

Start with a simple query against Gather's events table. Assume you have the standard Event model from the Full-Stack Python course:

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
```

Open a Django shell and look at the SQL that Django generates:

```python
from django.db import connection
from events.models import Event

# Get upcoming events
qs = Event.objects.filter(date__gte='2026-03-01').order_by('date')

# Print the SQL without executing it
print(qs.query)
```

This prints something like:

```sql
SELECT "events_event"."id", "events_event"."title", "events_event"."description",
       "events_event"."date", "events_event"."location", "events_event"."capacity",
       "events_event"."organizer_id", "events_event"."created_at", "events_event"."updated_at"
FROM "events_event"
WHERE "events_event"."date" >= '2026-03-01T00:00:00+00:00'
ORDER BY "events_event"."date" ASC
```

Now run that SQL with `EXPLAIN ANALYZE` in your PostgreSQL console (or through Django):

```python
from django.db import connection

sql = """
EXPLAIN ANALYZE
SELECT "events_event"."id", "events_event"."title", "events_event"."description",
       "events_event"."date", "events_event"."location", "events_event"."capacity",
       "events_event"."organizer_id", "events_event"."created_at", "events_event"."updated_at"
FROM "events_event"
WHERE "events_event"."date" >= '2026-03-01T00:00:00+00:00'
ORDER BY "events_event"."date" ASC;
"""

with connection.cursor() as cursor:
    cursor.execute(sql)
    for row in cursor.fetchall():
        print(row[0])
```

---

## Reading the Output

Here is typical output for the query above on a table with 100,000 events:

```
Sort  (cost=4250.23..4312.73 rows=25000 width=312) (actual time=45.123..48.456 rows=24832 loops=1)
  Sort Key: date
  Sort Method: external merge  Disk: 7528kB
  ->  Seq Scan on events_event  (cost=0.00..2541.00 rows=25000 width=312) (actual time=0.012..18.345 rows=24832 loops=1)
        Filter: (date >= '2026-03-01 00:00:00+00'::timestamp with time zone)
        Rows Removed by Filter: 75168
Planning Time: 0.085 ms
Execution Time: 52.789 ms
```

That is a lot of information packed into a few lines. Let's break it apart piece by piece.

### The Tree Structure

EXPLAIN ANALYZE output is a tree. Each indented line is a child operation that feeds into its parent. In this example:

1. The inner node is a **Seq Scan** (sequential scan) that reads the entire `events_event` table
2. The outer node is a **Sort** that orders the results by date

PostgreSQL executes from the inside out. It scans the table first, then sorts the results.

### Cost Estimates

Every node shows `cost=X..Y`. These are PostgreSQL's estimated costs in arbitrary units:

- **X** (startup cost): How much work before the first row can be returned
- **Y** (total cost): How much work to return all rows

```
Seq Scan on events_event  (cost=0.00..2541.00 ...)
```

The `0.00` startup cost means the sequential scan can start returning rows immediately. The `2541.00` total cost is the estimated work to scan the entire table.

```
Sort  (cost=4250.23..4312.73 ...)
```

The sort has a high startup cost (`4250.23`) because it needs to receive all rows before it can start outputting sorted results. This makes sense: you cannot sort until you have everything.

### Estimated vs. Actual Rows

This is where bugs hide. Every node shows both what PostgreSQL expected and what actually happened:

```
(cost=... rows=25000 ...) (actual time=... rows=24832 ...)
```

- **rows=25000**: PostgreSQL estimated 25,000 rows would match the filter
- **rows=24832**: The actual number was 24,832

When these numbers are close, the query planner made a good decision. When they diverge wildly (estimated 100, actual 50,000), the planner chose the wrong strategy. This is one of the most common sources of slow queries.

### Time

The `actual time=X..Y` values are in milliseconds:

- **X**: Time to return the first row
- **Y**: Time to return the last row

```
Seq Scan  (actual time=0.012..18.345 ...)
```

The scan started producing rows almost instantly (0.012ms) and took 18.3ms total. That's not bad for 100K rows, but watch what happens when this table grows to a million rows.

### Rows Removed by Filter

```
Rows Removed by Filter: 75168
```

This line tells you that PostgreSQL read 100,000 rows (75,168 + 24,832) but only kept 24,832. The other 75,168 rows were read from disk, loaded into memory, and then thrown away. That is wasted work, and it is the exact kind of problem an index solves.

---

## Sequential Scan vs. Index Scan

The most important distinction in query plans is between these two scan types.

### Sequential Scan (Seq Scan)

A sequential scan reads every row in the table from start to finish. It is the simplest strategy and sometimes the best one. If you are selecting 80% of the table, reading everything in order from disk is faster than jumping around with an index.

But when you only need a small fraction of the rows, a sequential scan wastes enormous effort. Imagine looking for a specific word in a 500-page book by reading every page. That is a sequential scan.

### Index Scan

An index scan uses a B-tree (or other index structure) to jump directly to the matching rows. It is like using the index at the back of that 500-page book to go straight to the right page.

```
Index Scan using idx_event_date on events_event  (cost=0.42..825.30 rows=25000 width=312) (actual time=0.025..8.234 rows=24832 loops=1)
  Index Cond: (date >= '2026-03-01 00:00:00+00'::timestamp with time zone)
```

Notice the differences from the sequential scan:

- **Total cost dropped** from 2541 to 825 (the planner expects less work)
- **No "Rows Removed by Filter"** because the index only reads matching rows
- **Actual time dropped** from 18ms to 8ms
- **No separate Sort node** because the B-tree index returns rows in order

### Index-Only Scan

Even better than an index scan is an index-only scan. This happens when the index itself contains all the columns the query needs, so PostgreSQL never touches the table at all:

```
Index Only Scan using idx_event_date_title on events_event  (cost=0.42..612.10 rows=25000 width=220) (actual time=0.018..4.567 rows=24832 loops=1)
  Index Cond: (date >= '2026-03-01 00:00:00+00'::timestamp with time zone)
  Heap Fetches: 0
```

The `Heap Fetches: 0` means zero table lookups. Everything came from the index. This is the fastest possible scan type.

### Bitmap Index Scan

Sometimes PostgreSQL chooses a middle ground. A bitmap index scan first builds a bitmap of matching row locations from the index, then reads those rows from the table in physical order:

```
Bitmap Heap Scan on events_event  (cost=285.00..1850.00 rows=25000 width=312) (actual time=2.345..12.678 rows=24832 loops=1)
  Recheck Cond: (date >= '2026-03-01 00:00:00+00'::timestamp with time zone)
  ->  Bitmap Index Scan on idx_event_date  (cost=0.00..278.75 rows=25000 width=0) (actual time=1.890..1.890 rows=24832 loops=1)
        Index Cond: (date >= '2026-03-01 00:00:00+00'::timestamp with time zone)
```

PostgreSQL uses this when too many rows match for a regular index scan (jumping around randomly would be slower than reading sequentially) but few enough that a full sequential scan would also waste effort. It is a hybrid approach.

---

## The BUFFERS Option

Add `BUFFERS` to get I/O details:

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT ...
```

This adds lines like:

```
Buffers: shared hit=412 read=1538
```

- **shared hit=412**: 412 pages were found in PostgreSQL's shared buffer cache (memory)
- **read=1538**: 1,538 pages had to be read from disk

This tells you about your cache hit ratio. In this case, only 21% of pages were cached. If you run the same query again, you might see:

```
Buffers: shared hit=1950
```

Now everything is cached. The first run tells you about cold performance (after a restart or when data hasn't been accessed recently). The second tells you about warm performance. Production databases usually run warm, but you should optimize for cold performance too, because after a restart or when PostgreSQL evicts pages to make room for other data, your queries need to stay fast.

---

## Profiling Django ORM Queries

You do not always want to copy SQL manually. Here is a helper function that runs EXPLAIN ANALYZE on any Django QuerySet:

```python
# utils/profiling.py
from django.db import connection

def explain_queryset(qs, analyze=True, buffers=True):
    """
    Run EXPLAIN ANALYZE on a Django QuerySet and print the results.
    """
    sql, params = qs.query.sql_with_params()

    options = []
    if analyze:
        options.append("ANALYZE")
    if buffers:
        options.append("BUFFERS")

    explain_sql = f"EXPLAIN ({', '.join(options)}) {sql}"

    with connection.cursor() as cursor:
        cursor.execute(explain_sql, params)
        for row in cursor.fetchall():
            print(row[0])
```

Usage in the Django shell:

```python
from events.models import Event
from utils.profiling import explain_queryset

# Profile the event listing query
upcoming = Event.objects.filter(date__gte='2026-03-01').order_by('date')[:20]
explain_queryset(upcoming)

# Profile RSVP lookup
from events.models import RSVP
user_rsvps = RSVP.objects.filter(user_id=42).select_related('event')
explain_queryset(user_rsvps)
```

---

## Practical: Profiling Gather's Key Queries

Let's profile the three most important queries in Gather and understand what we see.

### Query 1: Event Listing Page

The homepage shows upcoming events ordered by date:

```python
qs = Event.objects.filter(
    date__gte=timezone.now()
).select_related('organizer').order_by('date')[:20]
```

Without indexes, the EXPLAIN ANALYZE output looks like this:

```
Limit  (cost=4312.73..4312.78 rows=20 width=312) (actual time=48.500..48.510 rows=20 loops=1)
  ->  Sort  (cost=4250.23..4312.73 rows=25000 width=312) (actual time=48.490..48.500 rows=20 loops=1)
        Sort Key: events_event.date
        Sort Method: top-N heapsort  Memory: 32kB
        ->  Seq Scan on events_event  (cost=0.00..2541.00 rows=25000 width=312) (actual time=0.015..18.200 rows=24832 loops=1)
              Filter: (date >= '2026-03-14 12:00:00+00'::timestamp with time zone)
              Rows Removed by Filter: 75168
Planning Time: 0.120 ms
Execution Time: 48.600 ms
```

The problem is clear. PostgreSQL scans all 100K rows, filters down to ~25K, sorts them, and then takes the first 20. Most of that work is wasted. With an index on `date`, it can jump to the right spot, read 20 rows in order, and stop.

### Query 2: RSVP Check (Is User RSVPed?)

Every event detail page checks if the current user has RSVPed:

```python
qs = RSVP.objects.filter(event_id=event_id, user_id=user_id)
```

```
Seq Scan on events_rsvp  (cost=0.00..22541.00 rows=1 width=48) (actual time=35.200..85.400 rows=1 loops=1)
  Filter: ((event_id = 1234) AND (user_id = 42))
  Rows Removed by Filter: 999999
Planning Time: 0.050 ms
Execution Time: 85.450 ms
```

This is scanning a million RSVP rows to find one. The `rows=1` in the estimate is correct (the `unique_together` constraint tells PostgreSQL only one row can match), but without an index, it still has to scan the entire table to find it. This is a 85ms query that should take under 1ms.

### Query 3: Event RSVP Count

The listing page shows how many confirmed RSVPs each event has:

```python
from django.db.models import Count, Q

qs = Event.objects.filter(
    date__gte=timezone.now()
).annotate(
    rsvp_count=Count('rsvps', filter=Q(rsvps__status='confirmed'))
).order_by('date')[:20]
```

```
Limit  (cost=25000.00..25000.05 rows=20 width=320)
  ->  Sort  (cost=25000.00..25062.50 rows=25000 width=320)
        Sort Key: events_event.date
        ->  Hash Left Join  (cost=18000.00..24500.00 rows=25000 width=320)
              Hash Cond: (events_event.id = events_rsvp.event_id)
              ->  Seq Scan on events_event  (cost=0.00..2541.00 rows=25000 width=312)
                    Filter: (date >= '2026-03-14 12:00:00+00'::timestamp with time zone)
              ->  Hash  (cost=15000.00..15000.00 rows=500000 width=12)
                    ->  Seq Scan on events_rsvp  (cost=0.00..15000.00 rows=500000 width=12)
                          Filter: (status = 'confirmed')
```

Two sequential scans feeding into a hash join. The RSVP table scan alone reads 500K rows. This query will only get slower as the platform grows.

---

## Key Takeaways

1. **Always use ANALYZE**, not just EXPLAIN. Without ANALYZE, you only see estimates. The actual numbers often tell a different story.

2. **Watch for Seq Scan on large tables**. A sequential scan on a small table (under 10K rows) is usually fine. On a large table, it is a red flag.

3. **Compare estimated vs. actual rows**. Large discrepancies mean stale statistics. Run `ANALYZE events_event;` to update them.

4. **Look at Rows Removed by Filter**. If PostgreSQL removes 99% of rows after scanning, an index on the filter column would eliminate that waste.

5. **Use BUFFERS to understand I/O**. High `read` counts mean disk I/O, which is the slowest part of any query.

6. **Profile with production-sized data**. A query that runs fine on 100 rows might fall apart on 100,000. Always test with realistic data volumes.

In the next lesson, you will learn how to create the right indexes to fix every problem we identified here.

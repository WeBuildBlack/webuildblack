---
title: "Indexes and Query Optimization"
estimatedMinutes: 30
---

# Indexes and Query Optimization

A query that takes 2 milliseconds on a table with 1,000 rows can take 20 seconds on a table with 10 million rows -- unless the right indexes are in place. Understanding how PostgreSQL finds rows is the difference between an application that stays fast under load and one that grinds to a halt. This lesson explains what indexes are, when to create them, how to read a query plan, and how to avoid the trap of over-indexing.

---

## What Is an Index?

An index is a separate data structure that the database maintains alongside a table. It stores a sorted copy of one or more columns, along with pointers to the corresponding table rows.

The classic analogy: imagine a book. Finding all mentions of "PostgreSQL" without an index means reading every page (a sequential scan). An index in the back of the book tells you exactly which pages contain that term.

In database terms:

- **Without an index**: the database reads every row in the table to find matches (sequential scan)
- **With an index**: the database looks up the value in a sorted B-tree structure and jumps directly to the matching rows

### The B-tree Analogy

Most PostgreSQL indexes use a B-tree (balanced tree) structure. Imagine a binary search:

If you want to find user_id = 7 in a sorted list of 1,000,000 IDs:
- Without index: scan up to 1,000,000 values
- With B-tree index: make ~20 comparisons (log2 of 1,000,000) to find the page containing 7, then read that page

B-trees stay balanced as data is inserted and deleted, so lookup time remains O(log n) regardless of table size.

---

## How PostgreSQL Uses Indexes

PostgreSQL's query planner decides whether to use an index or do a sequential scan based on statistics it maintains about the table. For small tables (a few hundred rows), a sequential scan is often faster than an index lookup because the overhead of reading the index outweighs the benefit. For larger tables with selective queries, indexes are essential.

Situations where PostgreSQL can use an index:

```sql
-- Equality lookups (most common)
SELECT * FROM users WHERE email = 'devin@example.com';
-- Can use index on users(email)

-- Range queries
SELECT * FROM posts WHERE created_at > '2026-01-01';
-- Can use index on posts(created_at)

-- Sorting (if the index covers the ORDER BY column)
SELECT * FROM posts ORDER BY created_at DESC LIMIT 10;
-- Index on posts(created_at DESC) allows index scan without sorting

-- JOIN conditions
SELECT * FROM posts p JOIN users u ON u.id = p.user_id;
-- Index on posts(user_id) helps the join

-- Situations where indexes are NOT used:
-- Function calls on the indexed column
SELECT * FROM users WHERE LOWER(email) = 'devin@example.com';
-- Wrapping email in LOWER() prevents the index from being used
-- Fix: use a functional index: CREATE INDEX ON users(LOWER(email))
```

---

## Creating Indexes

```sql
-- Basic index on a single column
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at);
CREATE INDEX idx_users_email ON users(email);

-- Descending index (for queries that ORDER BY col DESC)
CREATE INDEX idx_posts_created_at_desc ON posts(created_at DESC);

-- Composite index on multiple columns
-- Useful when you frequently filter by both columns together
CREATE INDEX idx_posts_user_published ON posts(user_id, published);

-- A composite index (a, b) can be used for:
--   WHERE a = ?                 (uses the index)
--   WHERE a = ? AND b = ?       (uses the index)
--   ORDER BY a, b               (uses the index)
-- But NOT for:
--   WHERE b = ?                 (cannot use -- must start with a)

-- Unique index (also enforces uniqueness -- same as UNIQUE constraint)
CREATE UNIQUE INDEX idx_users_email_unique ON users(email);

-- Partial index: only index rows matching a condition
-- Smaller and faster than a full index when you query a subset frequently
CREATE INDEX idx_posts_published_true ON posts(created_at)
  WHERE published = TRUE;
-- This index only helps queries with WHERE published = TRUE

-- Functional index: index the result of a function
CREATE INDEX idx_users_lower_email ON users(LOWER(email));
-- Now this query can use the index:
-- SELECT * FROM users WHERE LOWER(email) = 'devin@example.com';

-- GIN index for JSONB and text search
CREATE INDEX idx_posts_tags_gin ON posts USING GIN (tags);
-- Enables fast queries like: WHERE 'javascript' = ANY(tags)

-- Drop an index
DROP INDEX idx_posts_user_id;
DROP INDEX IF EXISTS idx_posts_user_id;

-- Create concurrently (does not lock the table -- safe for production)
CREATE INDEX CONCURRENTLY idx_posts_user_id ON posts(user_id);
```

Primary keys and `UNIQUE` constraints automatically create indexes. You do not need to add a separate index for `id` or `email UNIQUE` columns -- they already have one.

---

## `EXPLAIN ANALYZE`: Reading Query Plans

`EXPLAIN ANALYZE` is how you verify whether PostgreSQL is using your indexes and how long queries actually take:

```sql
-- EXPLAIN: shows the plan without running the query
EXPLAIN SELECT * FROM posts WHERE user_id = 1;

-- EXPLAIN ANALYZE: runs the query and shows actual vs. estimated times
EXPLAIN ANALYZE SELECT * FROM posts WHERE user_id = 1;

-- EXPLAIN (ANALYZE, BUFFERS): also shows buffer/cache usage
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM posts WHERE user_id = 1;
```

### Reading the Output

```
-- Before adding index:
Seq Scan on posts  (cost=0.00..234.00 rows=15 width=500)
                   (actual time=0.123..45.789 rows=15 loops=1)
  Filter: (user_id = 1)
  Rows Removed by Filter: 9985
Planning Time: 0.5 ms
Execution Time: 46.2 ms

-- After adding index:
Index Scan using idx_posts_user_id on posts  (cost=0.29..8.31 rows=15 width=500)
                                              (actual time=0.012..0.089 rows=15 loops=1)
  Index Cond: (user_id = 1)
Planning Time: 0.3 ms
Execution Time: 0.1 ms
```

Key terms to understand:

- **Seq Scan**: sequential scan -- reads every row in the table. Often a sign an index is missing or not being used.
- **Index Scan**: uses an index. Shows which index in the node name.
- **Index Only Scan**: all needed data is in the index itself -- no table read required. Very fast.
- **Bitmap Heap Scan**: used when many rows match -- combines index results before reading table pages. More efficient than individual Index Scans for high-selectivity cases.
- **cost=X..Y**: estimated cost units. First number is startup cost (before first row), second is total cost.
- **actual time=X..Y**: actual milliseconds measured during ANALYZE. First is time to return first row, second is total.
- **rows=N**: estimated (in EXPLAIN) or actual (in EXPLAIN ANALYZE) number of rows.
- **Rows Removed by Filter**: rows read but discarded. High numbers with Seq Scan = index opportunity.

### Common Query Plan Problems

```sql
-- Problem: Sequential scan on a large table with a simple WHERE clause
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 123;
-- If you see Seq Scan and "Rows Removed by Filter" is high:
-- Add: CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- Problem: Sort step in the plan
EXPLAIN ANALYZE SELECT * FROM posts ORDER BY created_at DESC LIMIT 10;
-- If you see a Sort node before the Limit node:
-- Add: CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- Problem: The planner estimates 1 row but 10000 are returned (stale statistics)
-- Fix: update statistics
ANALYZE posts;
-- Or for all tables:
ANALYZE;
```

---

## When to Add an Index

Add an index when:

1. **You filter by a column frequently**: `WHERE user_id = ?`, `WHERE email = ?`, `WHERE status = ?`
2. **You join on a column**: `JOIN orders ON orders.customer_id = customers.id` -- index `orders.customer_id`
3. **You sort a column and paginate**: `ORDER BY created_at DESC LIMIT 10` -- index `created_at`
4. **EXPLAIN ANALYZE shows a sequential scan with high "Rows Removed"** on a table with many rows

A practical checklist for a new table:

```sql
-- For a posts table, start with these:
CREATE INDEX idx_posts_user_id ON posts(user_id);        -- FK lookup
CREATE INDEX idx_posts_created_at ON posts(created_at);  -- sorting/pagination
-- The primary key already has an index
-- UNIQUE columns already have indexes
```

---

## The Cost of Indexes

Indexes are not free. Every index you add:

- **Slows down writes**: INSERT, UPDATE, and DELETE must maintain every index on the table
- **Uses disk space**: each index takes storage, sometimes as much as the table itself
- **Uses memory**: the query planner caches indexes in `shared_buffers`

A table with 15 indexes has 15 data structures to update on every write. For a high-write table (like a log or events table), excessive indexes can become a bottleneck.

**Guidelines for avoiding over-indexing:**

- Start with no extra indexes beyond primary keys and unique constraints
- Add indexes when you observe slow queries in production or in `EXPLAIN ANALYZE`
- Do not index columns with very low cardinality (few distinct values) if the table is small -- a `boolean` column on a 500-row table never needs an index
- Audit indexes periodically: `SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;` shows unused indexes
- For development and test databases, run realistic amounts of data (millions of rows) to make query plans meaningful

---

## Key Takeaways

- An index is a sorted data structure (B-tree by default) that allows the database to find rows without scanning the entire table, reducing lookups from O(n) to O(log n).
- PostgreSQL automatically creates indexes for `PRIMARY KEY` and `UNIQUE` constraints. You do not need to add them manually.
- Add indexes on foreign key columns, frequently-filtered columns, and columns used in `ORDER BY` for paginated queries.
- `EXPLAIN ANALYZE` reveals what the query planner actually does. `Seq Scan` with high "Rows Removed" is a signal to consider an index. `Index Scan` confirms the index is being used.
- Partial indexes (`WHERE published = TRUE`) and functional indexes (`LOWER(email)`) are powerful tools for specific query patterns.
- Every index slows writes and uses storage. Add indexes based on observed performance problems, not preemptively. Use `pg_stat_user_indexes` to find unused indexes.

---

## Try It Yourself

**Exercise 1: Observe a Sequential Scan**
Insert 10,000 rows into a `products` table (use `generate_series` to do this efficiently: `INSERT INTO products (name, price) SELECT 'Product ' || i, (random() * 100)::numeric(10,2) FROM generate_series(1, 10000) i;`). Run `EXPLAIN ANALYZE SELECT * FROM products WHERE name = 'Product 5000';`. Observe the sequential scan and execution time. Add an index on `name` and run the same `EXPLAIN ANALYZE`. Note the difference in execution time and plan type.

**Exercise 2: Sorting with an Index**
Using the 10,000-row products table, run `EXPLAIN ANALYZE SELECT * FROM products ORDER BY price DESC LIMIT 10;`. Note the Sort step. Add an index on `price DESC` and re-run. Observe whether the Sort step disappears from the plan.

**Exercise 3: Find Unused Indexes**
After creating several indexes on your table, run some queries that only use some of them. Then query `SELECT indexname, idx_scan FROM pg_stat_user_indexes WHERE tablename = 'products';` to see which indexes have been scanned. Drop any that have never been used.
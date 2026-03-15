---
title: "Table Design and Data Types"
estimatedMinutes: 35
---

# Table Design and Data Types

The decisions you make when designing your database schema have long-term consequences. A table with the wrong data types or missing constraints will cause data quality problems that are expensive to fix later. A primary key strategy chosen casually can become a performance bottleneck at scale. This lesson covers the most important PostgreSQL data types, how to use constraints to enforce data integrity, and the primary key debate between SERIAL integers and UUIDs.

---

## Core Data Types

PostgreSQL has dozens of data types. Here are the ones you will use in almost every project:

### Text Types

```sql
-- TEXT: Variable-length string with no size limit
-- Use this for most string data
name TEXT
bio  TEXT
body TEXT

-- VARCHAR(n): Variable-length string with a max length
-- In PostgreSQL, TEXT and VARCHAR(n) have identical performance.
-- VARCHAR(n) adds a constraint that enforces the length limit.
username VARCHAR(50)
country_code VARCHAR(2)

-- CHAR(n): Fixed-length string, padded with spaces
-- Rarely useful in modern PostgreSQL. Prefer TEXT or VARCHAR.
state_code CHAR(2)
```

In PostgreSQL, `TEXT` and `VARCHAR` are stored identically -- there is no performance reason to prefer one over the other. Use `TEXT` for open-ended strings and `VARCHAR(n)` when you want the database to enforce a length limit (like ISO country codes).

### Numeric Types

```sql
-- INTEGER (or INT): 4-byte integer. Range: -2,147,483,648 to 2,147,483,647
-- Use for IDs, counts, quantities
id      INTEGER
qty     INTEGER

-- BIGINT: 8-byte integer. Range: up to ~9.2 * 10^18
-- Use when INTEGER range is not enough
views   BIGINT

-- SMALLINT: 2-byte integer. Range: -32,768 to 32,767
-- Use when you need to save space and values are small
rating  SMALLINT

-- NUMERIC(precision, scale): Exact decimal number
-- precision = total significant digits, scale = digits after decimal point
-- Use for money and any calculation where floating-point errors are unacceptable
price   NUMERIC(10, 2)  -- up to 99,999,999.99
tax_rate NUMERIC(5, 4)  -- e.g. 0.0825

-- FLOAT / DOUBLE PRECISION: Approximate floating-point
-- Faster but imprecise. Fine for scientific measurements, bad for money.
latitude  FLOAT
longitude FLOAT
```

**Never use `FLOAT` for money.** Floating-point arithmetic is imprecise: `0.1 + 0.2` does not equal `0.3` in floating-point math. Use `NUMERIC` for any financial values.

### Boolean

```sql
-- BOOLEAN: TRUE, FALSE, or NULL
-- PostgreSQL also accepts 't', 'f', 'yes', 'no', '1', '0'
published  BOOLEAN DEFAULT FALSE
is_active  BOOLEAN DEFAULT TRUE
email_verified BOOLEAN NOT NULL DEFAULT FALSE

SELECT * FROM users WHERE is_active = TRUE;
SELECT * FROM users WHERE NOT email_verified;
```

### Date and Time Types

```sql
-- TIMESTAMPTZ: Timestamp with timezone (recommended for most use cases)
-- Stored in UTC, returned in the session timezone
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ
deleted_at TIMESTAMPTZ  -- NULL means not deleted (soft delete pattern)

-- TIMESTAMP: Timestamp without timezone
-- Avoid unless you have a specific reason. Missing timezone info causes bugs.

-- DATE: Date only (no time component)
-- Good for birthdays, event dates, anything without a specific time
birth_date DATE
event_date DATE

-- TIME: Time only (no date)
-- Rarely used. Usually TIMESTAMPTZ is more appropriate.

-- INTERVAL: Duration
SELECT NOW() + INTERVAL '7 days';      -- one week from now
SELECT NOW() - INTERVAL '1 hour';      -- one hour ago
SELECT '2026-03-14'::DATE - '2026-01-01'::DATE; -- 72 (days between dates)
```

**Always use `TIMESTAMPTZ` for timestamps.** Plain `TIMESTAMP` has no timezone information, which causes subtle bugs when your application or database server moves to a different timezone.

### UUID

```sql
-- UUID: Universally Unique Identifier
-- 128-bit value, typically displayed as 32 hex digits in 5 groups:
-- 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

-- Generate a UUID in PostgreSQL
SELECT gen_random_uuid();

-- Use as primary key
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE
);
```

### JSONB

```sql
-- JSONB: Binary JSON storage
-- Stores arbitrary JSON. Indexed, queryable, and faster than TEXT-stored JSON.

CREATE TABLE events (
  id         SERIAL PRIMARY KEY,
  type       TEXT NOT NULL,
  payload    JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO events (type, payload)
VALUES ('user.signup', '{"email": "devin@example.com", "plan": "free"}');

-- Query JSON fields with -> (returns JSON) and ->> (returns text)
SELECT payload->>'email' FROM events WHERE type = 'user.signup';
SELECT payload->'metadata'->>'source' FROM events;

-- Filter on JSON values
SELECT * FROM events WHERE payload->>'plan' = 'free';

-- Index a JSONB field for fast filtering
CREATE INDEX idx_events_type ON events USING GIN (payload);
```

`JSONB` is powerful for storing metadata, settings, or event payloads that vary in structure. Do not overuse it -- if data has a consistent structure, model it as proper columns instead.

---

## Constraints

Constraints enforce data integrity rules at the database level. They catch invalid data before it is committed, regardless of where the data came from.

```sql
CREATE TABLE products (
  id          SERIAL PRIMARY KEY,

  -- NOT NULL: Column must have a value
  name        TEXT NOT NULL,

  -- UNIQUE: No two rows can have the same value in this column
  sku         TEXT NOT NULL UNIQUE,

  -- CHECK: Arbitrary boolean condition must be true
  price       NUMERIC(10, 2) NOT NULL CHECK (price >= 0),

  -- DEFAULT: Value used when no value is provided
  in_stock    BOOLEAN NOT NULL DEFAULT TRUE,
  quantity    INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Constraints can also be named and defined at the table level (after all columns):

```sql
CREATE TABLE order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity   INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,

  -- Table-level check constraint
  CONSTRAINT quantity_positive CHECK (quantity > 0),
  CONSTRAINT price_positive CHECK (unit_price > 0),

  -- Table-level unique constraint across multiple columns
  CONSTRAINT unique_order_product UNIQUE (order_id, product_id),

  -- Table-level foreign keys (more readable when multiple)
  CONSTRAINT fk_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES products(id)
);
```

Named constraints produce clearer error messages: instead of "check constraint violated" you get "check constraint quantity_positive violated on table order_items".

---

## Primary Keys: SERIAL vs UUID

Every table should have a primary key. Two common strategies:

### SERIAL (Auto-Incrementing Integer)

```sql
-- SERIAL is equivalent to:
-- id INTEGER NOT NULL DEFAULT nextval('tablename_id_seq')

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  -- id will be: 1, 2, 3, 4, ...
  title TEXT NOT NULL
);
```

Pros:
- Simple and compact (4 bytes)
- Auto-increments without any application logic
- Sequential, which is cache-friendly for range scans

Cons:
- Sequential IDs leak information (users can guess how many records exist)
- Difficult to merge data from multiple databases (ID collisions)
- Hard to generate IDs in application code before inserting

### UUID Primary Keys

```sql
-- gen_random_uuid() generates a UUID v4 using secure random numbers
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL
);

-- IDs look like: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
```

Pros:
- Globally unique -- safe to merge data from multiple sources
- Can be generated in application code before inserting
- Does not reveal business information (record count, ordering)

Cons:
- 16 bytes vs 4 bytes per key
- Random UUIDs cause index fragmentation (inserts land in random positions in the B-tree)
- Less human-readable for debugging

**Recommendation for most web APIs**: Use `gen_random_uuid()` for tables whose IDs are exposed in URLs or APIs (users, posts, orders). Use `SERIAL` for internal lookup tables or join tables where the ID never leaves the database.

---

## Naming Conventions

Consistent naming makes schemas easier to read. Follow these conventions:

```sql
-- Table names: plural, snake_case
users, posts, comments, order_items

-- Column names: snake_case
user_id, created_at, first_name, is_active

-- Primary key: always name it "id"
id SERIAL PRIMARY KEY
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Foreign keys: referenced_table_id (singular table name + _id)
user_id    REFERENCES users(id)
post_id    REFERENCES posts(id)
parent_id  REFERENCES categories(id)  -- self-reference

-- Boolean columns: prefix with is_ or has_
is_active, is_verified, has_paid, is_deleted

-- Timestamp columns: use _at suffix
created_at, updated_at, deleted_at, published_at

-- Index names: idx_tablename_columnname
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_users_email ON users(email);

-- Constraint names: type_table_column
CONSTRAINT fk_posts_user_id FOREIGN KEY ...
CONSTRAINT check_products_price CHECK ...
CONSTRAINT uq_users_email UNIQUE ...
```

---

## Schema for the Blog API

Here is a complete, well-designed schema for the blog API built in Module 6. This is what Module 8 will use when replacing the in-memory store:

```sql
-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS users;

-- Users table
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  bio        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Posts table
CREATE TABLE posts (
  id         SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL CHECK (LENGTH(title) BETWEEN 1 AND 200),
  body       TEXT NOT NULL,
  tags       TEXT[] DEFAULT '{}',
  published  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Comments table
CREATE TABLE comments (
  id         SERIAL PRIMARY KEY,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author     TEXT,
  body       TEXT NOT NULL CHECK (LENGTH(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_comments_post_id ON comments(post_id);

-- Verify the schema
\dt
\d posts
```

Notice that `posts.id` uses `SERIAL` (it is internal to the API), while `users.id` uses `UUID` (it would be exposed in auth tokens and profile URLs).

---

## Key Takeaways

- Use `TEXT` for most string columns. Use `VARCHAR(n)` when you want the database to enforce a maximum length. They have identical performance.
- Use `NUMERIC(precision, scale)` for money and any value where precision matters. Never use `FLOAT` for financial data.
- Always use `TIMESTAMPTZ` for timestamps, not `TIMESTAMP`. The timezone information prevents subtle bugs.
- `NOT NULL`, `UNIQUE`, `CHECK`, and `DEFAULT` constraints enforce data integrity at the database level, independent of application code.
- Name constraints explicitly to get clear error messages when they are violated.
- `SERIAL` (integer) primary keys are compact and simple. `UUID` primary keys (using `gen_random_uuid()`) are globally unique and do not leak business information. Use UUID for IDs exposed externally.
- Consistent naming conventions (snake_case, `_id` suffixes for foreign keys, `_at` suffixes for timestamps) make schemas readable at a glance.

---

## Try It Yourself

**Exercise 1: Design a Schema**
Design a schema for an e-commerce order system. You need tables for: `customers` (id UUID, email, name, created_at), `products` (id SERIAL, name, price NUMERIC, in_stock BOOLEAN), and `orders` (id SERIAL, customer_id UUID FK, total NUMERIC, status enum-like as TEXT with CHECK, placed_at TIMESTAMPTZ). Write the `CREATE TABLE` statements and run them in psql.

**Exercise 2: Constraints in Action**
Using your schema from Exercise 1, try to insert invalid data and confirm the constraints catch it: insert a product with a negative price, insert an order without a customer_id, insert two products with the same name (if you add a UNIQUE constraint), and insert an order with an invalid status. Observe the error messages.

**Exercise 3: JSONB Column**
Add a `metadata JSONB` column to your `products` table. Insert products with metadata like `{"color": "red", "weight_kg": 0.5}`. Query products where `metadata->>'color' = 'red'`. Try querying a nested value. Then add a GIN index on the metadata column: `CREATE INDEX idx_products_metadata ON products USING GIN (metadata);`.
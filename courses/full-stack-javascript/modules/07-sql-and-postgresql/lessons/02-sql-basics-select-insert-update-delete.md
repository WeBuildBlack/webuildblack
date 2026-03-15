---
title: "SQL Basics: SELECT, INSERT, UPDATE, DELETE"
estimatedMinutes: 40
---

# SQL Basics: SELECT, INSERT, UPDATE, DELETE

SQL (Structured Query Language) is the language you use to communicate with a relational database. It is the same language whether you are using PostgreSQL, MySQL, or SQLite -- the syntax is standardized with minor variations between databases. This lesson covers the four fundamental operations: creating tables, inserting data, querying it, updating it, and deleting it. By the end, you will be able to build and query any basic data set from scratch.

---

## Creating Tables with `CREATE TABLE`

Before you can store data, you need a table. `CREATE TABLE` defines the table name, its columns, and the data type of each column.

```sql
CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  bio        TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Breaking this down:

- `SERIAL` is a shorthand for an auto-incrementing integer. The database assigns 1, 2, 3... automatically.
- `PRIMARY KEY` makes this column the unique identifier for each row.
- `TEXT NOT NULL` means a text value that cannot be null -- the column must have a value.
- `UNIQUE` means no two rows can have the same value in this column.
- `DEFAULT NOW()` uses the current timestamp as the default value when no value is provided.

Create a table for posts:

```sql
CREATE TABLE posts (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  published  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Drop a table (be careful -- this deletes all data too)
DROP TABLE posts;

-- Drop only if it exists (does not throw an error if table is missing)
DROP TABLE IF EXISTS posts;
```

`REFERENCES users(id)` creates a foreign key -- this enforces that every `user_id` in the posts table must match an existing `id` in the users table. `ON DELETE CASCADE` means if a user is deleted, all their posts are automatically deleted too.

---

## `INSERT INTO`: Adding Data

```sql
-- Insert a single row
INSERT INTO users (email, name) VALUES ('devin@example.com', 'Devin');

-- Insert with all columns specified
INSERT INTO users (email, name, bio)
VALUES ('alex@example.com', 'Alex', 'Backend engineer and mentor');

-- Insert multiple rows at once
INSERT INTO users (email, name) VALUES
  ('sam@example.com', 'Sam'),
  ('jordan@example.com', 'Jordan'),
  ('riley@example.com', 'Riley');

-- Insert and return the created row (very useful in application code)
INSERT INTO users (email, name) VALUES ('new@example.com', 'New User')
RETURNING *;

-- Return only specific columns
INSERT INTO users (email, name) VALUES ('other@example.com', 'Other')
RETURNING id, created_at;
```

`RETURNING` is a PostgreSQL feature that returns the inserted row. This is how you get the auto-generated `id` after an insert -- which you need to build links between records.

---

## `SELECT`: Querying Data

`SELECT` retrieves rows from a table. It is the most frequently used SQL statement.

```sql
-- Select all columns from a table
SELECT * FROM users;

-- Select specific columns
SELECT id, email, name FROM users;

-- Rename columns in output with aliases
SELECT id, email AS contact, name AS full_name FROM users;

-- Filter rows with WHERE
SELECT * FROM users WHERE email = 'devin@example.com';
SELECT * FROM posts WHERE published = TRUE;
SELECT * FROM posts WHERE user_id = 1;

-- Comparison operators: =, !=, <, >, <=, >=
SELECT * FROM users WHERE id > 3;
SELECT * FROM posts WHERE title != 'Untitled';

-- Combine conditions with AND and OR
SELECT * FROM posts WHERE published = TRUE AND user_id = 1;
SELECT * FROM users WHERE id = 1 OR id = 2;

-- Pattern matching with LIKE
SELECT * FROM users WHERE name LIKE 'D%';       -- starts with D
SELECT * FROM users WHERE email LIKE '%@gmail.com'; -- ends with @gmail.com
SELECT * FROM posts WHERE title ILIKE '%javascript%'; -- case-insensitive

-- Match against a list with IN
SELECT * FROM users WHERE id IN (1, 2, 5);
SELECT * FROM posts WHERE title IN ('Hello World', 'Getting Started');

-- NULL checks (cannot use = with NULL)
SELECT * FROM posts WHERE updated_at IS NULL;
SELECT * FROM posts WHERE updated_at IS NOT NULL;

-- Sorting with ORDER BY
SELECT * FROM posts ORDER BY created_at DESC;  -- newest first
SELECT * FROM users ORDER BY name ASC;         -- alphabetical
SELECT * FROM posts ORDER BY user_id ASC, created_at DESC; -- multiple columns

-- Limiting results
SELECT * FROM posts ORDER BY created_at DESC LIMIT 10;

-- Pagination: skip N rows, take M
SELECT * FROM posts ORDER BY created_at DESC LIMIT 10 OFFSET 20;
-- OFFSET 20 skips the first 20 rows (page 3 with limit 10)
```

---

## Aggregate Functions

Aggregate functions compute a single value from multiple rows.

```sql
-- Count rows
SELECT COUNT(*) FROM users;           -- total users
SELECT COUNT(*) FROM posts WHERE published = TRUE; -- published posts

-- Sum, average, min, max on numeric columns
SELECT SUM(price) FROM orders;
SELECT AVG(price) FROM orders;
SELECT MIN(price), MAX(price) FROM orders;

-- Round floating point results
SELECT ROUND(AVG(price), 2) FROM orders;

-- String aggregation: join values into a single string
SELECT STRING_AGG(name, ', ' ORDER BY name) FROM users;
-- Result: Alex, Devin, Jordan, Riley, Sam
```

### `GROUP BY`: Aggregating by Category

`GROUP BY` groups rows by a column's value, then applies aggregate functions to each group.

```sql
-- Count posts per user
SELECT user_id, COUNT(*) AS post_count
FROM posts
GROUP BY user_id
ORDER BY post_count DESC;

-- Result:
-- user_id | post_count
-- --------+-----------
--       1 |         12
--       3 |          7
--       2 |          3

-- Average post length per user
SELECT user_id, ROUND(AVG(LENGTH(body)), 0) AS avg_chars
FROM posts
GROUP BY user_id;

-- Count of posts by publication status
SELECT published, COUNT(*) AS count
FROM posts
GROUP BY published;
```

### `HAVING`: Filtering Groups

`WHERE` filters individual rows before grouping. `HAVING` filters groups after aggregation.

```sql
-- Only show users who have written more than 5 posts
SELECT user_id, COUNT(*) AS post_count
FROM posts
GROUP BY user_id
HAVING COUNT(*) > 5
ORDER BY post_count DESC;

-- Contrast: WHERE filters before grouping
-- Only count published posts, then filter groups > 5
SELECT user_id, COUNT(*) AS published_count
FROM posts
WHERE published = TRUE
GROUP BY user_id
HAVING COUNT(*) > 5;
```

---

## `UPDATE`: Modifying Data

```sql
-- Update a specific row
UPDATE users SET name = 'Devin Jackson' WHERE id = 1;

-- Update multiple columns at once
UPDATE posts
SET title = 'Updated Title',
    updated_at = NOW()
WHERE id = 42;

-- Update with a calculation
UPDATE orders SET total = subtotal * 1.08 WHERE tax_included = FALSE;

-- Update multiple rows at once (WHERE matches multiple rows)
UPDATE posts SET published = TRUE WHERE user_id = 1;

-- Update and return the modified row
UPDATE users SET bio = 'New bio' WHERE id = 1 RETURNING *;

-- IMPORTANT: UPDATE without WHERE updates every row in the table
-- This sets ALL posts to published -- almost never what you want
-- UPDATE posts SET published = TRUE;
```

Always include a `WHERE` clause in `UPDATE` statements unless you genuinely intend to update every row. Many databases and ORMs add safeguards against this, but raw SQL will not stop you.

---

## `DELETE`: Removing Data

```sql
-- Delete a specific row
DELETE FROM users WHERE id = 5;

-- Delete multiple rows
DELETE FROM posts WHERE published = FALSE;
DELETE FROM posts WHERE created_at < '2020-01-01';

-- Delete and return what was deleted
DELETE FROM users WHERE id = 5 RETURNING *;

-- Delete all rows from a table (leaves the table structure intact)
DELETE FROM sessions;

-- TRUNCATE is faster for deleting all rows (resets sequences too)
TRUNCATE posts RESTART IDENTITY;
-- RESTART IDENTITY resets SERIAL counters back to 1

-- IMPORTANT: DELETE without WHERE deletes every row
-- This empties the entire table:
-- DELETE FROM users;
```

---

## Useful Built-in Functions

PostgreSQL has a rich set of built-in functions for working with common data types:

```sql
-- String functions
SELECT UPPER('hello');           -- 'HELLO'
SELECT LOWER('HELLO');           -- 'hello'
SELECT LENGTH('hello world');    -- 11
SELECT TRIM('  hello  ');        -- 'hello'
SELECT SUBSTRING('hello' FROM 2 FOR 3); -- 'ell'
SELECT CONCAT('hello', ' ', 'world');   -- 'hello world'
SELECT REPLACE('hello world', 'world', 'postgres'); -- 'hello postgres'

-- Number functions
SELECT ROUND(3.14159, 2);   -- 3.14
SELECT CEIL(3.1);           -- 4
SELECT FLOOR(3.9);          -- 3
SELECT ABS(-5);             -- 5

-- Date and time functions
SELECT NOW();               -- current timestamp with timezone
SELECT CURRENT_DATE;        -- today's date
SELECT EXTRACT(YEAR FROM NOW());   -- 2026
SELECT EXTRACT(MONTH FROM NOW());  -- 3
SELECT AGE(created_at) FROM users WHERE id = 1; -- interval since creation

-- Type casting
SELECT '42'::INTEGER;       -- string to integer
SELECT 42::TEXT;            -- integer to string
SELECT '2026-03-14'::DATE;  -- string to date
SELECT NOW()::DATE;         -- timestamp to date (drops time)

-- Conditional expressions
SELECT id, title,
  CASE
    WHEN published = TRUE THEN 'Published'
    ELSE 'Draft'
  END AS status
FROM posts;

-- COALESCE: return first non-null value
SELECT COALESCE(bio, 'No bio provided') FROM users;
```

---

## Putting It Together: A Sample Session

Here is a complete example you can run in psql to practice:

```sql
-- Create the table
CREATE TABLE articles (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  views      INTEGER DEFAULT 0,
  published  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed some data
INSERT INTO articles (title, body, published) VALUES
  ('Getting Started with PostgreSQL', 'PostgreSQL is a powerful database...', TRUE),
  ('Understanding Indexes', 'Indexes speed up queries by...', TRUE),
  ('Draft: Transactions Explained', 'Transactions ensure data integrity...', FALSE),
  ('SQL Joins Made Easy', 'Joins combine rows from multiple tables...', TRUE),
  ('Draft: Advanced Aggregations', 'Window functions allow...', FALSE);

-- Query published articles, newest first
SELECT id, title, views
FROM articles
WHERE published = TRUE
ORDER BY created_at DESC;

-- Count articles by status
SELECT published, COUNT(*) AS count
FROM articles
GROUP BY published;

-- Update views for a specific article
UPDATE articles SET views = views + 1 WHERE id = 1
RETURNING id, title, views;

-- Publish all drafts
UPDATE articles SET published = TRUE WHERE published = FALSE
RETURNING id, title;

-- Delete articles with zero views
DELETE FROM articles WHERE views = 0;

-- Clean up
DROP TABLE articles;
```

---

## Key Takeaways

- `CREATE TABLE` defines a table with named columns and data types. `DROP TABLE` removes it permanently including all data.
- `INSERT INTO ... VALUES (...)` adds rows. Use `RETURNING *` to get back the inserted row, including auto-generated IDs.
- `SELECT` retrieves data. Narrow results with `WHERE`, sort with `ORDER BY`, and paginate with `LIMIT` and `OFFSET`.
- Aggregate functions (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`) compute values across rows. Use `GROUP BY` to aggregate by category and `HAVING` to filter groups.
- `UPDATE ... SET ... WHERE` modifies rows. Always include `WHERE` or you will update every row in the table.
- `DELETE FROM ... WHERE` removes rows. Always include `WHERE` or you will delete every row.
- PostgreSQL has rich built-in functions for strings, numbers, dates, and type casting. `COALESCE` handles nulls, `CASE` provides conditional logic.

---

## Try It Yourself

**Exercise 1: Products Table**
Create a `products` table with: `id` (SERIAL PRIMARY KEY), `name` (TEXT NOT NULL), `price` (NUMERIC(10,2) NOT NULL), `in_stock` (BOOLEAN DEFAULT TRUE), `created_at` (TIMESTAMPTZ DEFAULT NOW()). Insert 5 products with different prices. Query all in-stock products ordered by price ascending. Query the average price.

**Exercise 2: Aggregations**
Using the products table, write queries to: count how many products are in stock vs. out of stock, find the most expensive product, find all products under $20.00, and update all out-of-stock products to set `in_stock = TRUE`. Use `RETURNING` to see which rows were updated.

**Exercise 3: Pagination**
Insert enough rows in your products table to have at least 15. Write a query that simulates page 2 of a list showing 5 items per page, ordered by price descending. Verify the correct rows are returned by comparing to a full `SELECT *`.
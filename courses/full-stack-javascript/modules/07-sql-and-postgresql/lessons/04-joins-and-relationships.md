---
title: "Joins and Relationships"
estimatedMinutes: 40
---

# Joins and Relationships

Real applications have data spread across multiple tables. A blog has users, posts, and comments. An e-commerce site has customers, orders, products, and line items. A school system has students, courses, and enrollments. Joins are what let you query across these related tables and bring their data together into a single result. This lesson covers the three main relationship types, the join operations that traverse them, and practical patterns for building the blog API schema.

---

## Types of Relationships

### One-to-Many

One row in table A corresponds to many rows in table B. This is the most common relationship type.

Examples:
- One user has many posts
- One post has many comments
- One customer has many orders
- One category has many products

Implementation: add a foreign key column to the "many" side pointing to the "one" side.

```sql
CREATE TABLE users (
  id    SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name  TEXT NOT NULL
);

CREATE TABLE posts (
  id      SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title   TEXT NOT NULL,
  body    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE comments (
  id      SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author  TEXT,
  body    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Many-to-Many

One row in table A corresponds to many rows in table B, and vice versa. A student enrolls in many courses, and each course has many students.

Implementation: a **junction table** (also called a join table or associative table) holds foreign keys to both tables.

```sql
CREATE TABLE posts (
  id    SERIAL PRIMARY KEY,
  title TEXT NOT NULL
);

CREATE TABLE tags (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Junction table: one row per post-tag pair
CREATE TABLE post_tags (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)  -- composite primary key: no duplicates
);
```

### One-to-One

One row in A corresponds to exactly one row in B. Used to split a table with many columns, or to store optional data separately.

```sql
CREATE TABLE users (
  id    SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE
);

-- Profile data stored separately -- optional, not all users have one
CREATE TABLE user_profiles (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  avatar_url TEXT,
  website    TEXT,
  location   TEXT
);
```

---

## `ON DELETE` Options

When a parent row is deleted, PostgreSQL needs to know what to do with child rows:

```sql
-- CASCADE: delete child rows automatically when parent is deleted
REFERENCES users(id) ON DELETE CASCADE
-- Deleting user 1 also deletes all their posts and comments

-- SET NULL: set the foreign key to NULL when parent is deleted
REFERENCES users(id) ON DELETE SET NULL
-- Deleting a user sets post.user_id to NULL (column must allow NULL)

-- RESTRICT (default): prevent deletion if child rows exist
REFERENCES users(id) ON DELETE RESTRICT
-- Trying to delete user 1 with posts will throw an error

-- SET DEFAULT: set foreign key to its DEFAULT value
REFERENCES users(id) ON DELETE SET DEFAULT
-- Rarely used

-- NO ACTION: similar to RESTRICT but checked at end of transaction
REFERENCES users(id) ON DELETE NO ACTION
```

`CASCADE` is usually the right choice for child data that cannot meaningfully exist without its parent (like comments without posts). Use `RESTRICT` when you want to force explicit cleanup before deletion.

---

## INNER JOIN

`INNER JOIN` returns rows where the join condition matches in **both** tables. Rows without a match are excluded.

```sql
-- Get all posts with their author's name
SELECT
  posts.id,
  posts.title,
  users.name AS author_name,
  posts.created_at
FROM posts
INNER JOIN users ON posts.user_id = users.id
ORDER BY posts.created_at DESC;

-- Using aliases to shorten queries
SELECT
  p.id,
  p.title,
  u.name AS author
FROM posts p
JOIN users u ON p.user_id = u.id  -- JOIN without INNER is INNER JOIN
ORDER BY p.created_at DESC;

-- Three-way join: posts with author and comment count
SELECT
  p.id,
  p.title,
  u.name AS author,
  COUNT(c.id) AS comment_count
FROM posts p
JOIN users u ON p.user_id = u.id
LEFT JOIN comments c ON c.post_id = p.id  -- LEFT JOIN to include posts with no comments
GROUP BY p.id, p.title, u.name
ORDER BY p.created_at DESC;

-- Filter joined data with WHERE
SELECT p.id, p.title, u.name
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE u.email = 'devin@example.com'
ORDER BY p.created_at DESC;
```

---

## LEFT JOIN

`LEFT JOIN` returns all rows from the left table, plus matching rows from the right table. When there is no match, right-table columns are `NULL`.

```sql
-- Get all users and their post count (including users with zero posts)
SELECT
  u.id,
  u.name,
  COUNT(p.id) AS post_count
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
GROUP BY u.id, u.name
ORDER BY post_count DESC;

-- Users u.id=3 might have post_count = 0 (NULL counted as 0 by COUNT(p.id))
-- COUNT(p.id) counts non-NULL values -- correct even with LEFT JOIN
-- COUNT(*) would count 1 for rows with no posts, which would be wrong here

-- Find users with NO posts (anti-join pattern)
SELECT u.id, u.name
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
WHERE p.id IS NULL;  -- no matching post rows = user has no posts

-- All posts with their latest comment (if any)
SELECT
  p.id,
  p.title,
  MAX(c.created_at) AS last_comment_at
FROM posts p
LEFT JOIN comments c ON c.post_id = p.id
GROUP BY p.id, p.title;
```

---

## RIGHT JOIN

`RIGHT JOIN` returns all rows from the right table plus matching rows from the left. In practice, it is rarely used -- you can always rewrite a RIGHT JOIN as a LEFT JOIN by swapping the table order.

```sql
-- These two queries return the same result:

-- Using RIGHT JOIN
SELECT u.name, p.title
FROM posts p
RIGHT JOIN users u ON p.user_id = u.id;

-- Equivalent using LEFT JOIN (preferred -- more readable)
SELECT u.name, p.title
FROM users u
LEFT JOIN posts p ON p.user_id = u.id;
```

Stick to `INNER JOIN` and `LEFT JOIN`. They cover essentially all use cases.

---

## Many-to-Many Queries

Querying a many-to-many relationship requires joining through the junction table:

```sql
-- Set up sample data
INSERT INTO posts (title) VALUES ('JavaScript Tips'), ('PostgreSQL Guide');
INSERT INTO tags (name) VALUES ('javascript'), ('database'), ('tutorial');

-- Tag a post
INSERT INTO post_tags (post_id, tag_id)
SELECT p.id, t.id
FROM posts p, tags t
WHERE p.title = 'JavaScript Tips' AND t.name IN ('javascript', 'tutorial');

-- Get all tags for a post
SELECT p.title, t.name AS tag
FROM posts p
JOIN post_tags pt ON pt.post_id = p.id
JOIN tags t ON t.id = pt.tag_id
WHERE p.title = 'JavaScript Tips'
ORDER BY t.name;

-- Get all posts with a specific tag
SELECT p.id, p.title
FROM posts p
JOIN post_tags pt ON pt.post_id = p.id
JOIN tags t ON t.id = pt.tag_id
WHERE t.name = 'javascript'
ORDER BY p.created_at DESC;

-- Get post count per tag
SELECT t.name, COUNT(pt.post_id) AS post_count
FROM tags t
LEFT JOIN post_tags pt ON pt.tag_id = t.id
GROUP BY t.id, t.name
ORDER BY post_count DESC;
```

---

## Self-Joins

A self-join joins a table to itself. Common for hierarchical data like organizational charts, category trees, or threaded comments.

```sql
-- Table with a self-referencing foreign key
CREATE TABLE categories (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL,
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL
  -- NULL parent_id = root category
);

INSERT INTO categories (name, parent_id) VALUES
  ('Technology', NULL),
  ('Programming', 1),
  ('Databases', 1),
  ('JavaScript', 2),
  ('PostgreSQL', 3);

-- Self-join: get each category with its parent's name
SELECT
  c.id,
  c.name,
  parent.name AS parent_name
FROM categories c
LEFT JOIN categories parent ON parent.id = c.parent_id
ORDER BY c.parent_id NULLS FIRST, c.name;

-- Result:
-- id | name        | parent_name
-- ---+-------------+------------
--  1 | Technology  |
--  2 | Programming | Technology
--  3 | Databases   | Technology
--  4 | JavaScript  | Programming
--  5 | PostgreSQL  | Databases
```

---

## Subqueries

A subquery is a query nested inside another query. They can appear in `WHERE`, `FROM`, or `SELECT` clauses:

```sql
-- Subquery in WHERE: posts by users who signed up in 2026
SELECT id, title
FROM posts
WHERE user_id IN (
  SELECT id FROM users WHERE created_at >= '2026-01-01'
);

-- Subquery in FROM (derived table): most commented posts
SELECT p.title, comment_counts.count
FROM posts p
JOIN (
  SELECT post_id, COUNT(*) AS count
  FROM comments
  GROUP BY post_id
) AS comment_counts ON comment_counts.post_id = p.id
ORDER BY comment_counts.count DESC
LIMIT 10;

-- Correlated subquery: posts that have at least one comment
SELECT id, title
FROM posts p
WHERE EXISTS (
  SELECT 1 FROM comments c WHERE c.post_id = p.id
);
```

For many cases, `JOIN` is more efficient than a subquery. But subqueries can be more readable when the logic is complex.

---

## Practical Example: Blog API Queries

Here are the queries the blog API from Module 6 will run when it connects to Postgres in Module 8:

```sql
-- GET /api/posts?page=1&limit=10
SELECT
  p.id,
  p.title,
  p.body,
  p.tags,
  p.created_at,
  COUNT(c.id) AS comment_count
FROM posts p
LEFT JOIN comments c ON c.post_id = p.id
GROUP BY p.id
ORDER BY p.created_at DESC
LIMIT $1 OFFSET $2;
-- $1 = limit, $2 = (page - 1) * limit

-- GET /api/posts/:id
SELECT id, title, body, tags, created_at, updated_at
FROM posts
WHERE id = $1;

-- POST /api/posts
INSERT INTO posts (title, body, tags)
VALUES ($1, $2, $3)
RETURNING *;

-- PUT /api/posts/:id
UPDATE posts
SET title = $2, body = $3, tags = $4, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- DELETE /api/posts/:id (comments auto-deleted via CASCADE)
DELETE FROM posts WHERE id = $1 RETURNING id;

-- GET /api/posts/:postId/comments
SELECT id, author, body, created_at
FROM comments
WHERE post_id = $1
ORDER BY created_at ASC;

-- POST /api/posts/:postId/comments
INSERT INTO comments (post_id, author, body)
VALUES ($1, $2, $3)
RETURNING *;
```

The `$1`, `$2` placeholders are parameterized query syntax. They are covered in Lesson 06 when connecting Postgres to Node.js.

---

## Key Takeaways

- One-to-many relationships are modeled with a foreign key on the "many" side (e.g., `posts.user_id` references `users.id`).
- Many-to-many relationships require a junction table with foreign keys to both tables (e.g., `post_tags` with `post_id` and `tag_id`).
- `ON DELETE CASCADE` automatically deletes child rows when the parent is deleted. `ON DELETE RESTRICT` (default) prevents deletion if children exist.
- `INNER JOIN` returns only rows with matches in both tables. `LEFT JOIN` returns all rows from the left table plus matches from the right (NULL when no match).
- `COUNT(column)` counts non-NULL values. With a LEFT JOIN, use `COUNT(right_table.id)` rather than `COUNT(*)` to correctly count zero when there are no matching rows.
- The anti-join pattern (`LEFT JOIN ... WHERE right.id IS NULL`) finds parent rows with no children.
- Self-joins let you query hierarchical data by joining a table to itself with table aliases.

---

## Try It Yourself

**Exercise 1: One-to-Many**
Create `authors` and `books` tables. Insert 3 authors and 6 books (2 per author). Write a query that returns each book with its author's name. Write a second query that returns each author with their book count, including authors with zero books.

**Exercise 2: Many-to-Many**
Add a `genres` table and a `book_genres` junction table. Tag each book with 1-2 genres. Write queries to: get all genres for a specific book, get all books in a specific genre, and get genre names alongside book titles in a single result set.

**Exercise 3: Anti-Join**
Write a query that finds all authors who have not written any books. Then insert a book for one of those authors and confirm the query no longer includes them. Write a second query that finds genres with no books tagged to them.
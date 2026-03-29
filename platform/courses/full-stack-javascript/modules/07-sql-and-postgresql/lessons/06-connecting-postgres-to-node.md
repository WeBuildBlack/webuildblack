---
title: "Connecting PostgreSQL to Node.js"
estimatedMinutes: 35
---

# Connecting PostgreSQL to Node.js

You have learned SQL and you have built an Express API. Now it is time to connect them. This lesson covers the `pg` (node-postgres) library, the difference between a Pool and a Client, parameterized queries, SQL injection prevention, and how to structure a `db.js` module that your route handlers can use. By the end, you will have the foundation for migrating the blog API from its in-memory store to a real database.

---

## The `pg` Library

`pg` is the most widely used PostgreSQL client for Node.js. It is the underlying driver for Prisma, Drizzle, Sequelize, and most other Node PostgreSQL tools. Using `pg` directly means you write raw SQL -- which gives you full control and teaches you what those ORMs are generating under the hood.

Install it:

```bash
npm install pg
npm install dotenv
```

---

## Pool vs. Client

`pg` exposes two primary classes:

**`Client`**: A single database connection. You must manually connect and disconnect it. Good for scripts or one-off operations.

```javascript
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://localhost:5432/blog_development',
});

await client.connect();
const result = await client.query('SELECT NOW()');
console.log(result.rows[0]);
await client.end(); // must manually disconnect
```

**`Pool`**: A managed pool of connections. Clients are checked out from the pool when a query runs and returned when it completes. This is what you use in a web server.

```javascript
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,                   // max connections in pool (default: 10)
  idleTimeoutMillis: 30000,  // close idle connections after 30s
  connectionTimeoutMillis: 2000, // throw if connection takes > 2s
});

// pool.query() handles checkout and return automatically
const result = await pool.query('SELECT NOW()');
console.log(result.rows[0]);
// No end() call needed -- the pool manages connections
```

A web server handling 100 simultaneous requests does not open 100 database connections. That would overwhelm most PostgreSQL servers (which default to 100 max connections). Instead, a pool maintains a fixed set of connections (typically 5-20) and queues queries when all connections are busy.

**Use `Pool` for web servers. Use `Client` for one-time scripts.**

---

## Connection Strings

PostgreSQL connection strings follow this format:

```
postgresql://[user[:password]@][host][:port][/database][?options]
```

Examples:

```bash
# Local development (no password, OS user auth)
postgresql://localhost:5432/blog_development

# With username and password
postgresql://postgres:mypassword@localhost:5432/blog_development

# Hosted database (Supabase, Railway, Render)
postgresql://user:password@db.example.supabase.co:5432/postgres?sslmode=require
```

Store the connection string in a `.env` file, never in source code:

```bash
# .env
DATABASE_URL=postgresql://localhost:5432/blog_development
NODE_ENV=development
```

```javascript
// Load .env values into process.env
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
```

---

## Parameterized Queries and SQL Injection

**SQL injection** is one of the most dangerous web vulnerabilities. It happens when user input is concatenated directly into a SQL query string:

```javascript
// NEVER DO THIS -- SQL injection vulnerability
const email = req.query.email;
// Attacker can send: ' OR 1=1 --
const result = await pool.query(
  `SELECT * FROM users WHERE email = '${email}'`
);
// If email is: ' OR 1=1 --
// The query becomes: SELECT * FROM users WHERE email = '' OR 1=1 --'
// Which returns every user in the table
```

The fix is **parameterized queries**. Pass values separately from the SQL string:

```javascript
// CORRECT -- parameterized query
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [email] // array of parameter values
);
// PostgreSQL treats $1 as a data value, never as SQL
// No matter what email contains, it cannot change the query structure
```

`$1`, `$2`, etc. are positional placeholders. The `pg` library sends them to PostgreSQL separately from the query text. The database server never interprets the values as SQL.

```javascript
// Multiple parameters
const result = await pool.query(
  'SELECT * FROM posts WHERE user_id = $1 AND published = $2 ORDER BY created_at DESC LIMIT $3',
  [userId, true, 10]
);
// $1 = userId, $2 = true, $3 = 10

// INSERT with RETURNING
const inserted = await pool.query(
  'INSERT INTO posts (title, body, user_id) VALUES ($1, $2, $3) RETURNING *',
  [title, body, userId]
);
const newPost = inserted.rows[0];

// UPDATE
const updated = await pool.query(
  'UPDATE posts SET title = $1, body = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
  [title, body, postId]
);
const post = updated.rows[0]; // undefined if no row matched

// DELETE
const deleted = await pool.query(
  'DELETE FROM posts WHERE id = $1 RETURNING id',
  [postId]
);
// deleted.rowCount === 0 means no row was found
```

**Always use parameterized queries. Never concatenate user input into SQL strings.**

---

## The Query Result Object

```javascript
const result = await pool.query('SELECT * FROM posts WHERE user_id = $1', [1]);

// result.rows: array of row objects
// [{ id: 1, title: 'Hello', body: '...', created_at: Date }, ...]

// result.rowCount: number of rows returned (SELECT) or affected (INSERT/UPDATE/DELETE)

// result.command: 'SELECT', 'INSERT', 'UPDATE', or 'DELETE'

const posts = result.rows;            // all rows
const first = result.rows[0];         // first row (undefined if empty)
const count = result.rowCount;        // count

// Column names are lowercase, matching your SQL column names
// Use snake_case in SQL to match PostgreSQL convention
const createdAt = posts[0].created_at;  // not posts[0].createdAt
```

---

## Creating a `db.js` Module

Create a single module that exports a configured pool -- import it everywhere you need database access:

```javascript
// src/lib/db.js
import pg from 'pg';
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => console.log('PostgreSQL pool connected'));
pool.on('error', (err) => console.error('PostgreSQL pool error:', err));

// Convenience wrapper that logs query details in development
export async function query(sql, params) {
  const start = Date.now();
  const result = await pool.query(sql, params);
  if (process.env.NODE_ENV !== 'production') {
    console.log({
      sql: sql.replace(/\s+/g, ' ').substring(0, 80),
      duration: `${Date.now() - start}ms`,
      rows: result.rowCount,
    });
  }
  return result;
}

// For transactions: borrow a client from the pool
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release(); // always return client to pool
  }
}
```

---

## Running Queries from Express Routes

Here is how the blog API routes look when using real database queries:

```javascript
// src/routes/posts.js
import { Router } from 'express';
import { query } from '../lib/db.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { createPostSchema, updatePostSchema, postIdSchema, paginationSchema } from '../lib/validators.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/AppError.js';

const router = Router();

// GET /api/posts?page=1&limit=10
router.get('/', validateQuery(paginationSchema), asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const offset = (page - 1) * limit;

  const [postsResult, countResult] = await Promise.all([
    query(
      `SELECT p.*, COUNT(c.id)::int AS comment_count
       FROM posts p
       LEFT JOIN comments c ON c.post_id = p.id
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    query('SELECT COUNT(*) FROM posts'),
  ]);

  res.json({
    posts: postsResult.rows,
    page,
    limit,
    total: parseInt(countResult.rows[0].count),
  });
}));

// GET /api/posts/:id
router.get('/:id', validateParams(postIdSchema), asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
  if (result.rowCount === 0) throw notFound('Post');
  res.json({ post: result.rows[0] });
}));

// POST /api/posts
router.post('/', validateBody(createPostSchema), asyncHandler(async (req, res) => {
  const { title, body, author, tags } = req.body;
  const result = await query(
    'INSERT INTO posts (title, body, tags) VALUES ($1, $2, $3) RETURNING *',
    [title, body, tags]
  );
  res.status(201).json({ post: result.rows[0] });
}));

// PUT /api/posts/:id -- use COALESCE so omitted fields keep their current value
router.put('/:id',
  validateParams(postIdSchema),
  validateBody(updatePostSchema),
  asyncHandler(async (req, res) => {
    const { title, body, tags } = req.body;
    const result = await query(
      `UPDATE posts
       SET title = COALESCE($2, title),
           body  = COALESCE($3, body),
           tags  = COALESCE($4, tags),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id, title ?? null, body ?? null, tags ?? null]
    );
    if (result.rowCount === 0) throw notFound('Post');
    res.json({ post: result.rows[0] });
  })
);

// DELETE /api/posts/:id
router.delete('/:id', validateParams(postIdSchema), asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM posts WHERE id = $1 RETURNING id', [req.params.id]);
  if (result.rowCount === 0) throw notFound('Post');
  res.status(204).end();
}));

export default router;
```

---

## A Note on ORMs

You may have heard of Prisma, Drizzle, Sequelize, or TypeORM. These are Object-Relational Mappers -- they generate SQL from a higher-level API.

Instead of writing:
```javascript
await pool.query('SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC', [userId])
```

Prisma lets you write:
```javascript
await prisma.post.findMany({
  where: { userId },
  orderBy: { createdAt: 'desc' }
});
```

ORMs reduce boilerplate and provide type safety with TypeScript. The tradeoffs: complex queries are harder to express than raw SQL, and it is not always clear what SQL is being generated.

This course teaches `pg` directly because understanding raw SQL transfers to any ORM, any language, and any database. Once you are comfortable with SQL, learning any ORM takes a day or two.

---

## Key Takeaways

- Install `pg` with `npm install pg`. It is the foundation for all PostgreSQL interaction in Node.js.
- Use `Pool` for web servers (manages multiple connections automatically). Use `Client` only for one-time scripts.
- Store the connection string in a `.env` file as `DATABASE_URL`. Never put it in source code. Load it with `dotenv`.
- Always use parameterized queries with `$1`, `$2` placeholders. Never concatenate user input into SQL strings. Parameterization is the primary defense against SQL injection.
- Query results are in `result.rows` (array of plain objects) and `result.rowCount` (rows returned or affected).
- Create a `src/lib/db.js` module that exports a single configured pool. Import it in route files.
- ORMs like Prisma and Drizzle generate SQL for you. Understanding raw SQL makes every ORM easier to use and debug.

---

## Try It Yourself

**Exercise 1: Connect to Your Database**
Create a new Node.js project (or use the one from Module 6). Install `pg` and `dotenv`. Create a `.env` file with `DATABASE_URL=postgresql://localhost:5432/your_database`. Create `src/lib/db.js` with a Pool. Write a script `src/test-connection.js` that queries `SELECT NOW()` and logs the result. Run it to verify the connection works.

**Exercise 2: CRUD with Raw SQL**
Create a `todos` table in your database. Write a `src/lib/todos.js` module that exports: `getAllTodos()`, `getTodoById(id)`, `createTodo(text)`, `updateTodo(id, done)`, and `deleteTodo(id)`. Each function uses parameterized queries. Write a `src/seed-todos.js` script that calls these functions to create, update, and list todos.

**Exercise 3: Connect Your Blog API**
Take the Module 6 blog API project. Create the posts and comments tables in PostgreSQL using the schema from Lesson 03. Replace the in-memory store in `src/lib/store.js` with real database queries using `db.js`. Run the same manual tests you did in Module 6 and verify the API behavior is identical -- except the data now persists across server restarts.
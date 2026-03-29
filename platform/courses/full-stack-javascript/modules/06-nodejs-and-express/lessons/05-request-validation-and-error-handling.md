---
title: "Request Validation and Error Handling"
estimatedMinutes: 35
---

# Request Validation and Error Handling

One of the first things that breaks in a real API is bad input. A missing required field, a string where a number is expected, an ID in the wrong format -- any of these can cause a confusing 500 error or, worse, corrupt data in your database. Good APIs validate input at the boundary, return clear error messages, and handle unexpected failures without crashing. This lesson covers Zod for schema-based validation and a pattern for centralized, consistent error handling.

---

## Why Validation Matters

Consider what happens without validation:

```javascript
// No validation -- dangerous
app.post('/api/posts', async (req, res) => {
  const post = await db.createPost(req.body);
  // If req.body.title is undefined, the database may throw an opaque error
  // If req.body.authorId is not a UUID, the query fails unpredictably
  res.status(201).json(post);
});
```

The client gets a 500 with no actionable information. Compare that to a validated endpoint where the client gets a 400 with specific field errors. Clear error messages make APIs much easier to work with for teammates, future maintainers, and external consumers.

---

## Introducing Zod

Zod is a TypeScript-first schema validation library that works just as well in plain JavaScript. You define a schema describing the shape and constraints of your data, then parse incoming data against it. If the data matches, Zod returns the parsed (and type-coerced) result. If not, Zod returns detailed error messages.

Install it:

```bash
npm install zod
```

Basic usage:

```javascript
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Must be a valid email address'),
  age: z.number().int().min(0).max(150).optional(),
});

// safeParse() returns a result object instead of throwing
const result = userSchema.safeParse({ name: '', email: 'not-an-email' });

if (result.success) {
  console.log(result.data); // the validated, coerced data
} else {
  console.log(result.error.issues);
  // [
  //   { path: ['name'], message: 'Name is required' },
  //   { path: ['email'], message: 'Must be a valid email address' }
  // ]
}
```

Use `safeParse()` in route handlers. It lets you handle validation errors without wrapping every call in try/catch.

---

## Common Zod Schema Types

```javascript
import { z } from 'zod';

// Strings
z.string().min(1)                       // non-empty
z.string().min(1).max(500)              // bounded length
z.string().email()                      // valid email
z.string().url()                        // valid URL
z.string().uuid()                       // valid UUID v4
z.string().regex(/^[a-z-]+$/)          // custom pattern

// Numbers
z.number().int()                        // integers only
z.number().positive()                  // > 0
z.number().min(0).max(100)             // bounded range

// Booleans, dates, enums
z.boolean()
z.string().datetime()                   // ISO 8601 string
z.enum(['draft', 'published', 'archived'])

// Arrays
z.array(z.string()).min(1).max(10)

// Optional and nullable
z.string().optional()                  // string | undefined
z.string().nullable()                  // string | null

// Coerce string to number (essential for route params and query strings)
z.coerce.number().int().positive()

// Make all fields optional (useful for PUT/PATCH)
const updateSchema = createSchema.partial();

// Transform at parse time
z.string().transform(val => val.trim())
```

---

## Schemas for the Blog API

```javascript
// src/lib/validators.js
import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  body: z.string().min(1, 'Body is required'),
  author: z.string().min(1).optional(),
  tags: z.array(z.string()).optional().default([]),
});

// .partial() makes every field optional
export const updatePostSchema = createPostSchema.partial();

// For route params: coerce the string ':id' to a number
export const postIdSchema = z.object({
  id: z.coerce.number().int().positive('Post ID must be a positive integer'),
});

export const createCommentSchema = z.object({
  body: z.string().min(1, 'Comment body is required').max(2000),
  author: z.string().min(1).optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});
```

`z.coerce.number()` is essential for route parameters and query strings because Express always provides them as strings.

---

## A Validation Middleware Factory

Instead of calling `safeParse` in every route handler, create reusable middleware factories:

```javascript
// src/middleware/validate.js

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: result.error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    // Replace req.body with the parsed (coerced/transformed) data
    req.body = result.data;
    next();
  };
}

export function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid route parameters',
        issues: result.error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    req.params = result.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        issues: result.error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    req.query = result.data;
    next();
  };
}
```

Using these in routes:

```javascript
router.get('/', validateQuery(paginationSchema), async (req, res) => {
  // req.query.page and req.query.limit are now numbers, not strings
  const { page, limit } = req.query;
  res.json({ page, limit, posts: [] });
});

router.get('/:id', validateParams(postIdSchema), async (req, res) => {
  // req.params.id is now a number
  res.json({ id: req.params.id });
});

router.post('/', validateBody(createPostSchema), async (req, res) => {
  // req.body is validated and all transforms applied
  res.status(201).json({ post: req.body });
});
```

---

## A Custom `AppError` Class

Extend the built-in `Error` to carry an HTTP status code:

```javascript
// src/lib/AppError.js

export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Convenience factory functions
export const notFound = (resource = 'Resource') =>
  new AppError(`${resource} not found`, 404);

export const badRequest = (message) =>
  new AppError(message, 400);

export const unauthorized = (message = 'Unauthorized') =>
  new AppError(message, 401);

export const forbidden = (message = 'Forbidden') =>
  new AppError(message, 403);
```

```javascript
import { notFound } from '../lib/AppError.js';

router.get('/:id', validateParams(postIdSchema), async (req, res, next) => {
  const post = posts.get(req.params.id);
  if (!post) {
    return next(notFound('Post')); // error handler receives this and sends 404
  }
  res.json({ post });
});
```

---

## The `asyncHandler` Wrapper

Every async route needs a try/catch to forward errors to the error middleware. Eliminate that boilerplate:

```javascript
// src/lib/asyncHandler.js

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

Route handlers become clean:

```javascript
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/AppError.js';

router.get('/:id',
  validateParams(postIdSchema),
  asyncHandler(async (req, res) => {
    const post = await db.findPost(req.params.id);
    if (!post) throw notFound('Post'); // caught automatically, passed to next()
    res.json({ post });
  })
);
```

Any thrown error -- from your code or a dependency -- is caught and forwarded to the error handler.

---

## The Centralized Error Handler

```javascript
// src/middleware/errorHandler.js
import { AppError } from '../lib/AppError.js';

export function errorHandler(err, req, res, next) {
  console.error({
    requestId: req.id,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
  });

  let statusCode = 500;
  let message = 'Internal server error';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.name === 'SyntaxError' && err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON in request body';
  }

  const response = {
    error: { message, statusCode, requestId: req.id },
  };

  if (process.env.NODE_ENV !== 'production') {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
```

Register it last in `app.js` -- after all routes, after the 404 handler.

---

## Consistent Error Response Shape

Every error your API returns should follow the same JSON structure:

```json
{
  "error": {
    "message": "Post not found",
    "statusCode": 404,
    "requestId": "3f9a1c2d-..."
  }
}
```

For validation errors:

```json
{
  "error": "Validation failed",
  "issues": [
    { "path": "title", "message": "Required" },
    { "path": "body", "message": "String must contain at least 1 character(s)" }
  ]
}
```

Pick a shape and stick to it. Inconsistent error formats are one of the most frustrating things to deal with as an API consumer.

---

## Putting It All Together

A complete route file with validation and error handling:

```javascript
// src/routes/posts.js
import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import {
  createPostSchema, updatePostSchema, postIdSchema, paginationSchema,
} from '../lib/validators.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/AppError.js';

const router = Router();

// In-memory store -- will be replaced with Postgres in Module 8
const posts = new Map();
let nextId = 1;

router.get('/', validateQuery(paginationSchema), asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const all = Array.from(posts.values());
  const start = (page - 1) * limit;
  res.json({ posts: all.slice(start, start + limit), page, limit, total: all.length });
}));

router.get('/:id', validateParams(postIdSchema), asyncHandler(async (req, res) => {
  const post = posts.get(req.params.id);
  if (!post) throw notFound('Post');
  res.json({ post });
}));

router.post('/', validateBody(createPostSchema), asyncHandler(async (req, res) => {
  const id = nextId++;
  const post = { id, ...req.body, createdAt: new Date().toISOString() };
  posts.set(id, post);
  res.status(201).json({ post });
}));

router.put('/:id',
  validateParams(postIdSchema),
  validateBody(updatePostSchema),
  asyncHandler(async (req, res) => {
    const existing = posts.get(req.params.id);
    if (!existing) throw notFound('Post');
    const updated = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
    posts.set(req.params.id, updated);
    res.json({ post: updated });
  })
);

router.delete('/:id', validateParams(postIdSchema), asyncHandler(async (req, res) => {
  if (!posts.has(req.params.id)) throw notFound('Post');
  posts.delete(req.params.id);
  res.status(204).end();
}));

export default router;
```

---

## Key Takeaways

- Validate all incoming data at the API boundary. Bad input should return a 400 with a clear explanation, not a 500 with a cryptic database error.
- Zod schemas define the shape and constraints of your data. Use `safeParse()` to handle validation errors without try/catch.
- `z.coerce.number()` is essential for route params and query strings, which Express always provides as strings.
- A validation middleware factory (`validateBody`, `validateParams`, `validateQuery`) keeps route handlers clean by separating validation logic.
- `AppError` extends `Error` to carry an HTTP status code. Use factory functions like `notFound()` and `badRequest()` for common cases.
- `asyncHandler` wraps async route handlers to automatically forward thrown errors to Express's error middleware, eliminating boilerplate try/catch blocks.
- All errors should return a consistent JSON shape. Pick one structure and use it everywhere.

---

## Try It Yourself

**Exercise 1: Zod Schemas**
Create a Zod schema for a `Product` with: `name` (string, 1-100 chars), `price` (number, positive), `category` (enum of 'electronics', 'clothing', 'food'), `inStock` (boolean, default true), and `tags` (array of strings, max 5 items, optional). Test it with `safeParse` against valid and invalid inputs and log the results.

**Exercise 2: Validation Middleware**
Using the `validateBody` factory from this lesson, add validation to a POST route for creating a product. Confirm: valid input creates the product, a missing `name` returns 400 with a message, a negative `price` returns 400, and an invalid `category` returns 400.

**Exercise 3: AppError and asyncHandler**
Add a `GET /api/products/:id` route that throws `notFound('Product')` when the product does not exist. Wrap it with `asyncHandler`. Add the centralized error handler to your app. Confirm that hitting a missing ID returns `{ "error": { "message": "Product not found", "statusCode": 404 } }`.

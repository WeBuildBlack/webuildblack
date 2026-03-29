---
title: "Routing and Middleware"
estimatedMinutes: 40
---

# Routing and Middleware

Middleware is the most important concept in Express. Once you understand it, every other Express feature -- body parsing, authentication, logging, error handling -- becomes a variation on the same pattern. This lesson covers how middleware works, the built-in middleware that comes with Express, how to write your own, and how to organize routes for a larger application using `express.Router`.

---

## What Is Middleware

In Express, a middleware function is any function with this signature:

```javascript
function myMiddleware(req, res, next) {
  // do something with req and/or res
  next(); // pass control to the next middleware or route handler
}
```

When a request comes in, Express runs it through a pipeline of middleware functions in the order they were added with `app.use()`. Each middleware can:

1. Read or modify `req` (add properties, parse headers, etc.)
2. Read or modify `res` (set headers, etc.)
3. End the request by calling `res.json()`, `res.send()`, etc.
4. Call `next()` to pass control to the next function in the pipeline

If a middleware ends the request (sends a response), the remaining middleware and route handlers are skipped. If it calls `next()`, the pipeline continues. If it does neither, the request hangs indefinitely -- a common bug to watch for.

Here is a visual model of the middleware pipeline:

```
Request arrives
      |
      v
[express.json()]    -- parses body, calls next()
      |
      v
[requestLogger]     -- logs the request, calls next()
      |
      v
[authMiddleware]    -- checks token, calls next() or sends 401
      |
      v
[Route Handler]     -- sends response (ends pipeline)
      |
      v
[errorHandler]      -- only runs if next(error) was called
```

---

## Built-in Middleware

Express ships with three useful middleware functions.

### `express.json()`

Parses incoming requests with a `Content-Type: application/json` header. Without this, `req.body` is `undefined` for JSON requests.

```javascript
app.use(express.json());

app.post('/api/posts', (req, res) => {
  // req.body is now a parsed JavaScript object
  console.log(req.body); // { title: 'Hello', body: 'World' }
  res.status(201).json(req.body);
});
```

### `express.urlencoded()`

Parses URL-encoded bodies -- the format HTML forms submit by default.

```javascript
app.use(express.urlencoded({ extended: true }));

// Now req.body works for form submissions too
app.post('/submit-form', (req, res) => {
  console.log(req.body); // { username: 'devin', password: '...' }
});
```

### `express.static()`

Serves static files (HTML, CSS, images, JavaScript) from a directory.

```javascript
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Now files in public/ are accessible at their filename:
// public/index.html -> http://localhost:3000/
// public/styles.css -> http://localhost:3000/styles.css
// public/logo.png   -> http://localhost:3000/logo.png

// Optionally mount at a prefix
app.use('/assets', express.static(path.join(__dirname, 'public')));
// public/logo.png -> http://localhost:3000/assets/logo.png
```

---

## Writing Custom Middleware

Custom middleware is where you add cross-cutting concerns: logging, authentication, rate limiting, request IDs, and more. Any function with `(req, res, next)` is middleware.

### Request Logger

```javascript
// src/middleware/logger.js
export function requestLogger(req, res, next) {
  const start = Date.now();

  // 'finish' fires after the response is sent
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.path} ${res.statusCode} ${duration}ms`
    );
    // Example output:
    // 2026-03-14T12:00:00.000Z GET /api/posts 200 5ms
  });

  next(); // must call next() or the request hangs
}
```

```javascript
// src/app.js
import { requestLogger } from './middleware/logger.js';

app.use(requestLogger); // applies to every request
```

### Request ID Middleware

Attaching a unique ID to every request makes it much easier to trace a specific request through your logs.

```javascript
// src/middleware/requestId.js
import { randomUUID } from 'crypto';

export function attachRequestId(req, res, next) {
  // Use the client-provided ID if available (useful when proxying)
  // otherwise generate a new one
  req.id = req.headers['x-request-id'] || randomUUID();

  // Echo the ID back in the response headers
  res.set('X-Request-Id', req.id);

  next();
}
```

```javascript
// Use it before your logger so the logger can include the ID
app.use(attachRequestId);
app.use(requestLogger);
```

### Middleware Order Matters

Middleware runs in the order it is registered. This means the sequence you call `app.use()` is significant.

```javascript
// CORRECT order
app.use(attachRequestId);   // runs first
app.use(requestLogger);     // has access to req.id set above
app.use(express.json());    // parses body
app.use('/api', apiRouter); // routes run after all middleware above

// WRONG: if express.json() came after the route, req.body would be undefined in route handlers
```

### Route-Specific Middleware

Middleware can be applied to a specific route instead of globally. Pass it as an argument before the handler:

```javascript
// This middleware only runs for this one route
app.post('/api/posts', validatePostBody, createPost);

function validatePostBody(req, res, next) {
  const { title, body } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: 'title and body are required' });
  }
  next();
}

function createPost(req, res) {
  // We know title and body exist here
  res.status(201).json({ id: 1, ...req.body });
}
```

You can also pass an array of middleware:

```javascript
app.put('/api/posts/:id', [authenticate, authorize('author'), validatePostBody], updatePost);
```

---

## `express.Router`

When your application has many routes, defining them all on `app` makes `app.js` unwieldy. `express.Router` lets you create modular route groups, each in their own file.

```javascript
// src/routes/posts.js
import { Router } from 'express';

const router = Router();

// All routes here are relative to where this router is mounted
// If mounted at /api/posts, then '/' means /api/posts

router.get('/', (req, res) => {
  res.json({ posts: [] });
});

router.get('/:id', (req, res) => {
  res.json({ id: req.params.id });
});

router.post('/', (req, res) => {
  res.status(201).json({ post: req.body });
});

router.put('/:id', (req, res) => {
  res.json({ updated: req.params.id });
});

router.delete('/:id', (req, res) => {
  res.status(204).end();
});

export default router;
```

```javascript
// src/routes/comments.js
import { Router } from 'express';

// mergeParams: true is required to access :postId from the parent router
const router = Router({ mergeParams: true });

router.get('/', (req, res) => {
  const { postId } = req.params;
  res.json({ postId, comments: [] });
});

router.post('/', (req, res) => {
  const { postId } = req.params;
  res.status(201).json({ postId, comment: req.body });
});

export default router;
```

```javascript
// src/app.js
import express from 'express';
import postsRouter from './routes/posts.js';
import commentsRouter from './routes/comments.js';

const app = express();
app.use(express.json());

// Mount routers at path prefixes
app.use('/api/posts', postsRouter);

// Nested router: /api/posts/:postId/comments
// The :postId param is defined in the posts mount, but accessible
// in commentsRouter because of mergeParams: true
app.use('/api/posts/:postId/comments', commentsRouter);

export default app;
```

Now your routes are organized by resource. Adding a new resource means creating a new file in `routes/` and adding one `app.use()` line in `app.js`.

### Router-Level Middleware

You can add middleware to a router that applies only to routes in that router:

```javascript
// src/routes/admin.js
import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// This middleware applies to every route in this router
router.use(requireAdmin);

router.get('/stats', (req, res) => {
  res.json({ users: 100, posts: 500 });
});

router.delete('/posts/:id', (req, res) => {
  res.status(204).end();
});

export default router;
```

```javascript
// Mounted in app.js
app.use('/api/admin', adminRouter);
```

---

## Error-Handling Middleware

Express has a special type of middleware for handling errors. It has four parameters instead of three: `(err, req, res, next)`.

```javascript
// src/middleware/errorHandler.js

// Must be the LAST app.use() call in app.js
export function errorHandler(err, req, res, next) {
  // Log the error internally
  console.error({
    message: err.message,
    stack: err.stack,
    requestId: req.id,
    method: req.method,
    path: req.path,
  });

  // Don't leak internal errors in production
  const isDev = process.env.NODE_ENV !== 'production';

  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    error: {
      message: statusCode < 500 ? err.message : 'Internal server error',
      // Only include stack traces in development
      ...(isDev && { stack: err.stack }),
      requestId: req.id,
    },
  });
}
```

To trigger the error handler from a route, call `next(error)`:

```javascript
app.get('/api/posts/:id', async (req, res, next) => {
  try {
    const post = await db.findPost(req.params.id);
    if (!post) {
      const err = new Error('Post not found');
      err.statusCode = 404;
      return next(err); // pass to error handler
    }
    res.json({ post });
  } catch (error) {
    next(error); // pass unexpected errors to error handler
  }
});
```

Wire everything up in the correct order in `app.js`:

```javascript
// src/app.js
import express from 'express';
import { attachRequestId } from './middleware/requestId.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import postsRouter from './routes/posts.js';
import commentsRouter from './routes/comments.js';

const app = express();

// 1. Pre-route middleware (order matters)
app.use(attachRequestId);
app.use(requestLogger);
app.use(express.json());

// 2. Routes
app.use('/api/posts', postsRouter);
app.use('/api/posts/:postId/comments', commentsRouter);

// 3. 404 handler (catches any unmatched routes)
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// 4. Error handler (must be last, must have 4 params)
app.use(errorHandler);

export default app;
```

The 404 handler and error handler must come after all routes. The error handler must come after the 404 handler.

---

## A Complete Middleware Stack Example

Here is a condensed view of the full stack you will build in the module project:

```javascript
// src/middleware/requestId.js
import { randomUUID } from 'crypto';

export function attachRequestId(req, res, next) {
  req.id = req.headers['x-request-id'] || randomUUID();
  res.set('X-Request-Id', req.id);
  next();
}

// src/middleware/logger.js
export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[${req.id}] ${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
  });
  next();
}

// src/middleware/errorHandler.js
export function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    requestId: req.id,
  });
}
```

---

## Key Takeaways

- Middleware functions have the signature `(req, res, next)`. They run in the order they are registered with `app.use()`.
- Every middleware must either send a response or call `next()`. Doing neither leaves the request hanging.
- The three built-in middleware functions are `express.json()` (parse JSON bodies), `express.urlencoded()` (parse form bodies), and `express.static()` (serve files).
- Custom middleware is how you add logging, authentication, request IDs, and other cross-cutting concerns. Attach properties to `req` to pass data downstream.
- `express.Router` lets you organize routes into separate files, each mounted at a path prefix in `app.js`. Use `{ mergeParams: true }` on nested routers that need parent route params.
- Error-handling middleware has four parameters: `(err, req, res, next)`. Trigger it by calling `next(error)` from a route. It must be registered last.
- The correct order in `app.js` is: pre-route middleware, routes, 404 handler, error handler.

---

## Try It Yourself

**Exercise 1: Request Logger**
Add a request logger middleware to an Express app that logs the method, path, status code, and response time in milliseconds for every request. Format it as: `[2026-03-14T12:00:00Z] GET /api/posts 200 3ms`. Make sure it logs the status code (not just the request), which means using `res.on('finish', ...)`.

**Exercise 2: Organize Routes with Router**
Take an existing Express app with all routes defined on `app` and refactor it so each resource has its own router file. Create `routes/users.js` and `routes/products.js`, each with at least three routes. Mount both in `app.js` with `app.use()`.

**Exercise 3: Error Handler**
Add a centralized error handler to your app. Create an `AppError` class that extends `Error` and accepts a `message` and `statusCode`. Throw `AppError` instances in route handlers for 404 and validation failures. Verify that all errors return a consistent JSON shape: `{ error: { message, statusCode, requestId } }`.

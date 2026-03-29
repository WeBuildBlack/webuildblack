---
title: "Error Handling Across the Stack"
estimatedMinutes: 35
---

# Error Handling Across the Stack

Things go wrong. A database query fails. A user submits bad data. The network drops out. A server crashes at 2am. Error handling is not an afterthought -- it is part of the feature. This lesson covers error handling at every layer of the stack: Express middleware, database errors, client-side fetch errors, React Error Boundaries, and the patterns that tie them together into a consistent, debuggable system.

---

## A Consistent Error Response Format

Before writing any error handling code, decide on the shape of every error response your API sends. Consistency matters because your React code needs to parse these responses reliably.

Use this format throughout the blog API:

```json
{
  "error": "Post not found",
  "status": 404,
  "details": "No post with id 99 exists"
}
```

The `error` field is a human-readable message safe to display to users. The `status` field mirrors the HTTP status code (useful when error bodies get logged out of context). The `details` field is optional -- use it for validation errors, never for stack traces in production.

Define this shape once and use it everywhere:

```javascript
// server/src/lib/AppError.js

// A custom error class that carries an HTTP status code
export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Factory functions for common error types
export const notFound = (resource) =>
  new AppError(`${resource} not found`, 404);

export const badRequest = (message, details = null) =>
  new AppError(message, 400, details);

export const conflict = (message) =>
  new AppError(message, 409);

export const internalError = (message = 'Something went wrong') =>
  new AppError(message, 500);
```

---

## Server-Side Error Middleware

Express has a special error-handling middleware signature: four parameters instead of three. The first parameter is the error.

```javascript
// server/src/middleware/errorHandler.js

export function errorHandler(err, req, res, next) {
  // Log the full error for debugging
  console.error({
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  // AppError: we set the status code intentionally
  if (err.name === 'AppError') {
    return res.status(err.statusCode).json({
      error: err.message,
      status: err.statusCode,
      ...(err.details && { details: err.details }),
    });
  }

  // PostgreSQL errors: map common codes to HTTP statuses
  if (err.code) {
    if (err.code === '23505') { // unique_violation
      return res.status(409).json({ error: 'A record with that value already exists', status: 409 });
    }
    if (err.code === '23503') { // foreign_key_violation
      return res.status(400).json({ error: 'Referenced record does not exist', status: 400 });
    }
    if (err.code === '22P02') { // invalid_text_representation (e.g., non-integer id)
      return res.status(400).json({ error: 'Invalid ID format', status: 400 });
    }
  }

  // Unhandled errors: send a generic 500
  // Never send the stack trace or internal error details to clients in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Something went wrong'
    : err.message;

  res.status(500).json({ error: message, status: 500 });
}
```

Register it in `app.js` **after all routes**:

```javascript
// server/src/app.js
import express from 'express';
import cors from 'cors';
import postsRouter from './routes/posts.js';
import commentsRouter from './routes/comments.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.use('/api/posts', postsRouter);

// Error handler must be the last middleware registered
app.use(errorHandler);

export default app;
```

---

## The `asyncHandler` Wrapper

Express does not catch errors thrown from async route handlers by default. Without a wrapper, an unhandled promise rejection in a route silently crashes the request and leaves the client hanging.

```javascript
// Without asyncHandler -- unhandled rejection, client gets no response
router.get('/:id', async (req, res) => {
  const result = await query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
  // If query() throws, Express never calls the error handler
  res.json({ post: result.rows[0] });
});
```

The fix is a wrapper that catches the rejected promise and passes it to `next()`:

```javascript
// server/src/lib/asyncHandler.js
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

Now every async route is protected:

```javascript
// server/src/routes/posts.js
import { Router } from 'express';
import { query } from '../lib/db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound, badRequest } from '../lib/AppError.js';

const router = Router();

router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw badRequest('Post ID must be a number');

  const result = await query('SELECT * FROM posts WHERE id = $1', [id]);
  if (result.rowCount === 0) throw notFound('Post');

  res.json({ post: result.rows[0] });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { title, body } = req.body;
  if (!title?.trim()) throw badRequest('title is required');
  if (!body?.trim()) throw badRequest('body is required');

  const result = await query(
    'INSERT INTO posts (title, body) VALUES ($1, $2) RETURNING *',
    [title.trim(), body.trim()]
  );
  res.status(201).json({ post: result.rows[0] });
}));
```

When a throw reaches `asyncHandler`, it calls `next(err)`, which passes the error to `errorHandler`. The client always gets a structured JSON response.

---

## Client-Side Error Handling in Fetch Calls

The `apiFetch` wrapper from Lesson 2 already throws on non-OK responses. Now you need components to handle those thrown errors gracefully.

The key insight: different errors warrant different responses.

```javascript
// src/api/posts.js
async function apiFetch(path, options = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
  } catch (networkError) {
    // fetch() itself rejected -- the server is unreachable
    throw new Error('Cannot connect to the server. Check your connection.');
  }

  if (!response.ok) {
    // The server responded with an error status
    let body;
    try {
      body = await response.json();
    } catch {
      body = {};
    }
    const message = body.error || `Request failed: ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  if (response.status === 204) return null;
  return response.json();
}
```

In components, catch errors and display them appropriately:

```jsx
function CreatePostForm({ onCreated }) {
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const data = await postsApi.create({ title, body });
      onCreated(data.post);
    } catch (err) {
      // Show the server's error message to the user
      // err.status lets you handle specific cases if needed
      if (err.status === 400) {
        setError(err.message); // validation error -- show inline
      } else if (err.status === 409) {
        setError('A post with that title already exists.');
      } else {
        setError('Could not publish the post. Please try again.');
        console.error('Unexpected error:', err); // log unexpected errors
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <p role="alert" className="error-message">{error}</p>
      )}
      {/* ... inputs ... */}
    </form>
  );
}
```

The `role="alert"` attribute tells screen readers to announce the error message. This is a small addition that significantly improves accessibility.

---

## React Error Boundaries

JavaScript errors thrown during rendering (not in event handlers or async code) will crash the entire React component tree and show a blank page. Error Boundaries catch these errors and display a fallback UI instead.

```jsx
// src/components/ErrorBoundary.jsx
import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // Called when a descendant component throws during rendering
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // Called after the error is caught -- use for logging
  componentDidCatch(error, info) {
    console.error('React Error Boundary caught:', error, info.componentStack);
    // In production, send to an error tracking service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      // You can render any fallback UI
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Something went wrong.</h2>
          <p>Try refreshing the page.</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

Error Boundaries must be class components -- there is no hook equivalent for the rendering lifecycle where they operate. Wrap sections of your app:

```jsx
// src/App.jsx
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <div className="app">
      <nav>/* nav always renders */</nav>

      <ErrorBoundary fallback={<p>Could not load posts. Please refresh.</p>}>
        <PostList />
      </ErrorBoundary>

      <ErrorBoundary>
        <CreatePostForm />
      </ErrorBoundary>
    </div>
  );
}
```

Place Error Boundaries around logical sections, not individual components. If `PostList` crashes, you want the `CreatePostForm` to still render (and vice versa). Do not wrap the entire app in one boundary -- a single error would take down everything.

---

## User-Friendly Error Messages

The error messages in your API responses are what users will see. Write them for users, not developers.

```javascript
// Not helpful to users:
throw new AppError('pg error: relation "posts" does not exist', 500);
throw new AppError('ECONNREFUSED', 500);

// Helpful:
throw new AppError('Could not load posts. Please try again.', 500);
throw notFound('Post');                    // "Post not found"
throw badRequest('title is required');     // "title is required"
```

A few rules:

1. **Never expose stack traces or internal error messages to users in production.** They reveal your code structure and can aid attackers.
2. **Be specific about validation errors.** "title is required" is better than "Invalid request". Users can act on specific messages.
3. **Be vague about server errors.** "Something went wrong, please try again" is appropriate for 500s. Do not say "Database connection failed."
4. **Log the real error on the server.** You need the full details for debugging. The user just needs enough to know what to do.

---

## Handling 404s for Non-Existent Routes

Add a catch-all route in Express to handle requests to endpoints that do not exist:

```javascript
// server/src/app.js -- after all routes, before errorHandler
app.use((req, res, next) => {
  next(new AppError(`Cannot ${req.method} ${req.path}`, 404));
});

app.use(errorHandler);
```

Without this, Express returns a plain HTML "Cannot GET /api/typo" page when a client calls a non-existent endpoint. With it, you get a consistent JSON error.

---

## Global Error Handling Patterns

Two more patterns worth adding for production robustness:

**Unhandled promise rejections** (Node.js):

```javascript
// server/src/index.js
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
  // In production you may want to exit and let the process manager restart
  // process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1); // Cannot safely continue after an uncaught exception
});
```

**Request timeout** (prevent hung requests):

```javascript
// Middleware to time out requests that take too long
app.use((req, res, next) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(503).json({ error: 'Request timed out', status: 503 });
    }
  }, 10000); // 10 seconds

  res.on('finish', () => clearTimeout(timeout));
  next();
});
```

---

## Key Takeaways

- Define a consistent JSON error response shape (`{ error, status, details }`) and use it in every error response. React code can then parse errors reliably across all endpoints.
- Use a custom `AppError` class with a `statusCode` property. Factory functions like `notFound()` and `badRequest()` make throwing descriptive errors concise.
- Register an Express error handler middleware (four parameters: `err, req, res, next`) as the last middleware in `app.js`. It catches all errors forwarded via `next(err)` or thrown in `asyncHandler`.
- Wrap every async route handler with `asyncHandler`. Without it, thrown errors and rejected promises in async routes are silently swallowed.
- In `apiFetch`, distinguish network errors (fetch rejected) from HTTP errors (response.ok is false). Attach `err.status` so components can handle specific status codes differently.
- React Error Boundaries catch rendering errors and display fallback UI instead of a blank page. Wrap logical sections of the app, not individual components.
- In production, log the real error on the server and send only a generic message to the client. Never expose stack traces, SQL errors, or internal implementation details in API responses.

---

## Try It Yourself

**Exercise 1: Add the Error Handler**
Copy the `AppError` class, `asyncHandler` wrapper, and `errorHandler` middleware into your server project. Register the error handler in `app.js` after all routes. Update two route handlers to use `throw notFound(...)` and `throw badRequest(...)` instead of inline `res.status(400).json(...)` calls. Test with curl that errors still return JSON.

**Exercise 2: Improve Client Error Handling**
Update your `apiFetch` wrapper to catch network errors separately from HTTP errors, and attach `err.status` to errors from non-OK responses. Update `CreatePostForm` to display different messages for 400 errors (show the server message) versus 500 errors (show a generic "try again" message).

**Exercise 3: Add an Error Boundary**
Create an `ErrorBoundary` component. Wrap your `PostList` in it. To test it works, temporarily throw an error inside `PostList`'s render (e.g., `throw new Error('test')`). Confirm the fallback UI appears instead of a blank page. Remove the test throw and confirm the list renders normally.

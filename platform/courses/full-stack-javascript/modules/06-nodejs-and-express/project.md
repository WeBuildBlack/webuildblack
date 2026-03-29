---
title: "Module Project: REST API Server"
estimatedMinutes: 90
---

# Module Project: REST API Server

In this project you will build a fully functional Blog REST API with an in-memory data store. This API is the foundation for two future modules: Module 08 migrates it to a PostgreSQL database and adds a React frontend, and Module 09 adds authentication. Build it cleanly -- the route structure, validation, and error handling you put in place here will carry forward.

---

## What You Are Building

A REST API server for a blog with the following endpoints:

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/posts | List all posts (with pagination) |
| GET | /api/posts/:id | Get a single post |
| POST | /api/posts | Create a post |
| PUT | /api/posts/:id | Update a post |
| DELETE | /api/posts/:id | Delete a post |
| GET | /api/posts/:postId/comments | List comments on a post |
| POST | /api/posts/:postId/comments | Add a comment to a post |

---

## Project Setup

```bash
mkdir blog-api
cd blog-api
npm init -y
npm install express zod
npm install --save-dev nodemon
```

Update `package.json`:

```json
{
  "name": "blog-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

Create this directory structure:

```
blog-api/
  src/
    index.js
    app.js
    routes/
      posts.js
      comments.js
    middleware/
      logger.js
      requestId.js
      validate.js
      errorHandler.js
    lib/
      validators.js
      AppError.js
      asyncHandler.js
      store.js         <- in-memory data store
  .gitignore
```

---

## Starter Code

### `src/lib/store.js` -- In-Memory Data Store

This module holds your application data. It will be replaced with a real database in Module 8.

```javascript
// src/lib/store.js
// In-memory store for posts and comments.
// Module 8 will replace this with PostgreSQL.

// TODO: Create a Map to store posts, keyed by post ID
// const posts = new Map();

// TODO: Create a Map to store comments, keyed by comment ID
// const comments = new Map();

// TODO: Create counters for auto-incrementing IDs
// let postIdCounter = 1;
// let commentIdCounter = 1;

// TODO: Export functions for CRUD operations on posts:
//
// getAllPosts()              -> returns array of all posts
// getPostById(id)           -> returns post or undefined
// createPost(data)          -> creates post, returns it
// updatePost(id, data)      -> updates post, returns it or undefined
// deletePost(id)            -> returns true if deleted, false if not found

// TODO: Export functions for CRUD operations on comments:
//
// getCommentsByPostId(postId)       -> returns array of comments for a post
// createComment(postId, data)       -> creates comment, returns it or null if post not found
```

### `src/lib/validators.js`

```javascript
// src/lib/validators.js
import { z } from 'zod';

// TODO: Define createPostSchema with:
// - title: string, min 1 char, max 200 chars (message: 'Title is required')
// - body: string, min 1 char (message: 'Body is required')
// - author: string, min 1 char, optional
// - tags: array of strings, optional, default []

// TODO: Define updatePostSchema as createPostSchema.partial()

// TODO: Define postIdSchema with:
// - id: coerce to number, int, positive

// TODO: Define createCommentSchema with:
// - body: string, min 1 char, max 2000 chars (message: 'Comment body is required')
// - author: string, min 1 char, optional

// TODO: Define paginationSchema with:
// - page: coerce number, int, positive, optional, default 1
// - limit: coerce number, int, positive, max 100, optional, default 10
```

### `src/lib/AppError.js`

```javascript
// src/lib/AppError.js

// TODO: Create the AppError class that extends Error
// - constructor(message, statusCode = 500)
// - sets this.name = 'AppError'
// - calls Error.captureStackTrace if available

// TODO: Export factory functions:
// - notFound(resource)     -> new AppError(`${resource} not found`, 404)
// - badRequest(message)    -> new AppError(message, 400)
// - unauthorized(message)  -> new AppError(message, 401)
```

### `src/lib/asyncHandler.js`

```javascript
// src/lib/asyncHandler.js

// TODO: Export asyncHandler(fn) that wraps an async route handler
// and forwards any errors to next()
//
// export function asyncHandler(fn) {
//   return (req, res, next) => {
//     Promise.resolve(fn(req, res, next)).catch(next);
//   };
// }
```

### `src/middleware/validate.js`

```javascript
// src/middleware/validate.js

// TODO: Export validateBody(schema) -- validates req.body
// On failure: res.status(400).json({ error: "Validation failed", issues: [...] })
// On success: sets req.body = result.data and calls next()

// TODO: Export validateParams(schema) -- validates req.params
// On failure: res.status(400).json({ error: "Invalid route parameters", issues: [...] })
// On success: sets req.params = result.data and calls next()

// TODO: Export validateQuery(schema) -- validates req.query
// On failure: res.status(400).json({ error: "Invalid query parameters", issues: [...] })
// On success: sets req.query = result.data and calls next()

// All issue objects should have: { path: string, message: string }
```

### `src/middleware/logger.js` and `src/middleware/requestId.js`

```javascript
// src/middleware/requestId.js
import { randomUUID } from 'crypto';

// TODO: Export attachRequestId middleware
// - Sets req.id from X-Request-Id header or generates a new UUID
// - Sets X-Request-Id response header
// - Calls next()

// src/middleware/logger.js

// TODO: Export requestLogger middleware
// - Records start time
// - On res "finish" event, logs: [req.id] METHOD /path STATUS Xms
// - Calls next()
```

### `src/middleware/errorHandler.js`

```javascript
// src/middleware/errorHandler.js
import { AppError } from '../lib/AppError.js';

// TODO: Export errorHandler(err, req, res, next) -- 4-parameter error middleware
// - Log the error (method, path, message, stack)
// - If AppError: use err.statusCode and err.message
// - If SyntaxError with type 'entity.parse.failed': 400 'Invalid JSON in request body'
// - Otherwise: 500 "Internal server error"
// - In non-production environments, include err.stack in the response
// - Response shape: { error: { message, statusCode, requestId: req.id } }
```

### `src/routes/posts.js`

```javascript
// src/routes/posts.js
import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { createPostSchema, updatePostSchema, postIdSchema, paginationSchema } from '../lib/validators.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/AppError.js';
import * as store from '../lib/store.js';

const router = Router();

// TODO: GET / -- List all posts with pagination
// - validateQuery(paginationSchema)
// - Get all posts from store
// - Slice by page/limit
// - Return { posts, page, limit, total }

// TODO: GET /:id -- Get single post
// - validateParams(postIdSchema)
// - Look up post from store
// - If not found: throw notFound('Post')
// - Return { post }

// TODO: POST / -- Create post
// - validateBody(createPostSchema)
// - Create post in store (add createdAt: new Date().toISOString())
// - Return 201 { post }

// TODO: PUT /:id -- Update post
// - validateParams(postIdSchema), validateBody(updatePostSchema)
// - If not found: throw notFound('Post')
// - Update in store (add updatedAt: new Date().toISOString())
// - Return { post }

// TODO: DELETE /:id -- Delete post
// - validateParams(postIdSchema)
// - If not found: throw notFound('Post')
// - Delete from store, also delete all comments for this post
// - Return 204 (no body)

export default router;
```

### `src/routes/comments.js`

```javascript
// src/routes/comments.js
import { Router } from 'express';
import { validateBody, validateParams } from '../middleware/validate.js';
import { createCommentSchema, postIdSchema } from '../lib/validators.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/AppError.js';
import * as store from '../lib/store.js';

// mergeParams: true is required to access :postId from the parent route
const router = Router({ mergeParams: true });

// TODO: GET / -- Get all comments for a post
// - validateParams(postIdSchema)
// - If post not found: throw notFound('Post')
// - Return { comments, postId }

// TODO: POST / -- Add a comment to a post
// - validateParams(postIdSchema), validateBody(createCommentSchema)
// - If post not found: throw notFound('Post')
// - Create comment in store (add createdAt: new Date().toISOString())
// - Return 201 { comment }

export default router;
```

### `src/app.js`

```javascript
// src/app.js
import express from 'express';
import { attachRequestId } from './middleware/requestId.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import postsRouter from './routes/posts.js';
import commentsRouter from './routes/comments.js';

const app = express();

// TODO: Wire up middleware in correct order:
// 1. attachRequestId
// 2. requestLogger
// 3. express.json()

// TODO: Mount routes:
// app.use('/api/posts', postsRouter);
// app.use('/api/posts/:postId/comments', commentsRouter);

// TODO: Add 404 handler for unmatched routes

// TODO: Add errorHandler (must be last)

export default app;
```

### `src/index.js`

```javascript
// src/index.js
import app from './app.js';

const PORT = process.env.PORT || 3000;

// TODO: Start the server
// app.listen(PORT, () => { console.log(...) });
```

---

## Acceptance Criteria

Your API must satisfy all of the following:

### Posts

- [ ] `GET /api/posts` returns `{ posts: [], page: 1, limit: 10, total: 0 }` on an empty store
- [ ] `POST /api/posts` with `{ title, body }` returns 201 with the created post including an auto-generated `id` and `createdAt`
- [ ] `POST /api/posts` with missing `title` returns 400 with `{ error: "Validation failed", issues: [...] }`
- [ ] `GET /api/posts/:id` returns the post when it exists
- [ ] `GET /api/posts/99` returns 404 with `{ error: { message: "Post not found", statusCode: 404 } }` when post does not exist
- [ ] `PUT /api/posts/:id` updates only the provided fields and adds `updatedAt`
- [ ] `DELETE /api/posts/:id` returns 204 and the post is no longer returned by GET
- [ ] `GET /api/posts?page=2&limit=5` returns the correct slice of posts
- [ ] `GET /api/posts?limit=abc` returns 400 (invalid query param)

### Comments

- [ ] `GET /api/posts/:postId/comments` returns comments for that post
- [ ] `POST /api/posts/:postId/comments` creates a comment linked to the post
- [ ] `GET /api/posts/99/comments` returns 404 when post does not exist
- [ ] `POST /api/posts/:postId/comments` with empty body returns 400

### Infrastructure

- [ ] Every response includes an `X-Request-Id` header
- [ ] Every request is logged: `[requestId] METHOD /path STATUS Xms`
- [ ] Sending malformed JSON returns 400 `Invalid JSON in request body`
- [ ] `GET /api/nonexistent` returns 404 `Route GET /api/nonexistent not found`

---

## Manual Testing Guide

Use any HTTP client (Postman, Insomnia, VS Code REST Client, or a similar tool) to test each endpoint. Here is a suggested sequence:

1. Create 3 posts
2. List all posts -- confirm all 3 appear
3. Get post by ID -- confirm the data matches
4. Update post title -- confirm `updatedAt` appears
5. Add 2 comments to post 1
6. List comments for post 1 -- confirm both appear
7. Delete post 1
8. Try to get deleted post -- confirm 404
9. Try to add a comment to deleted post -- confirm 404
10. Test validation: POST /api/posts with missing title
11. Test pagination: create 15 posts, then GET /api/posts?page=2&limit=5

---

## Stretch Goals

Completed the core requirements? Try these additions:

**Stretch 1: Search**
Add a `?search=` query parameter to `GET /api/posts` that filters posts by title (case-insensitive contains). Example: `GET /api/posts?search=hello` returns only posts whose title includes "hello".

**Stretch 2: Sorting**
Add `?sort=` and `?order=asc|desc` query parameters to `GET /api/posts`. Support sorting by `createdAt` (default) and `title`. Add them to your `paginationSchema`.

**Stretch 3: Comment Counts**
Add a `commentCount` field to each post in the `GET /api/posts` response showing how many comments that post has.

**Stretch 4: Health Check Endpoint**
Add `GET /api/health` that returns `{ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() }`.

---

## Submission Checklist

Before marking this project complete:

- [ ] All 7 routes are implemented and pass the acceptance criteria above
- [ ] Validation returns consistent error shapes for all invalid inputs
- [ ] `AppError` and `asyncHandler` are used throughout (no bare try/catch)
- [ ] All requests are logged with request ID and response time
- [ ] `node_modules/` and any `.env` files are in `.gitignore`
- [ ] The server starts cleanly with `npm run dev`
- [ ] You can explain what `mergeParams: true` does and why it is needed for the comments router
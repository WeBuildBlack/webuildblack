---
title: "Module Project: Full-Stack Blog"
estimatedMinutes: 90
---

# Module Project: Full-Stack Blog

In this project you will build a complete full-stack blog application from scratch. The backend migrates the Module 06 in-memory blog API to PostgreSQL. The frontend is a React app built with Vite that reads, creates, edits, and deletes posts, and supports comments on each post. Both live in a monorepo and run together with a single `npm run dev` command.

When you finish, you will have:
- A `server/` directory: Express API backed by PostgreSQL
- A `client/` directory: React + Vite frontend
- A root `package.json` using `concurrently` to run both
- A PostgreSQL migration file and a working database schema
- All CRUD operations wired end-to-end
- Proper loading states, error handling, and a production-ready file structure

---

## Part 0: Project Setup

### 0.1 Create the Monorepo

```bash
mkdir blog-fullstack
cd blog-fullstack
npm init -y
npm install --save-dev concurrently
```

Update the root `package.json`:

```json
{
  "name": "blog-fullstack",
  "private": true,
  "scripts": {
    "dev": "concurrently --names \"server,client\" --prefix-colors \"blue,green\" \"npm run dev --prefix server\" \"npm run dev --prefix client\"",
    "install:all": "npm install --prefix server && npm install --prefix client"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}
```

### 0.2 Create the Server

```bash
mkdir server
cd server
npm init -y
npm install express cors dotenv pg
npm install --save-dev nodemon
```

Update `server/package.json`:

```json
{
  "name": "blog-api",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  }
}
```

### 0.3 Create the Client

```bash
cd ..
npm create vite@latest client -- --template react
cd client
npm install
```

### 0.4 Create `.env` Files and `.gitignore`

```bash
# server/.env
PORT=3001
DATABASE_URL=postgresql://localhost:5432/blog_development
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

```bash
# client/.env
VITE_API_URL=http://localhost:3001
```

```bash
# .gitignore (root)
node_modules/
server/node_modules/
client/node_modules/
server/.env
client/.env
client/dist/
```

---

## Part 1: Database Migration

### 1.1 Create the Schema File

Create `server/migrations/001_initial_schema.sql`:

```sql
-- TODO: Create the posts table with the following columns:
--   id: auto-incrementing primary key
--   title: text, not null
--   body: text, not null
--   created_at: timestamp with timezone, defaults to NOW()
--   updated_at: timestamp with timezone, defaults to NOW()

-- TODO: Create the comments table with the following columns:
--   id: auto-incrementing primary key
--   post_id: foreign key referencing posts(id) with ON DELETE CASCADE
--   body: text, not null
--   author: text, not null, defaults to 'Anonymous'
--   created_at: timestamp with timezone, defaults to NOW()

-- TODO: Create an index on comments(post_id) for faster lookups
```

### 1.2 Run the Migration

```bash
psql -d blog_development -f server/migrations/001_initial_schema.sql
```

---

## Part 2: Server -- Database Module

Create `server/src/lib/db.js`:

```javascript
// TODO: Import pg and dotenv/config
// TODO: Validate that DATABASE_URL is set (throw if missing)
// TODO: Create and export a Pool with the DATABASE_URL connection string
// TODO: Add ssl: { rejectUnauthorized: false } when NODE_ENV === 'production'
// TODO: Export a query(sql, params) helper function that calls pool.query
// TODO: Add a pool.on('error') handler that logs pool errors

import pg from 'pg';
const { Pool } = pg;

// TODO: Complete this module
export const pool = null; // replace with real Pool
export async function query(sql, params) {
  // TODO: implement
}
```

---

## Part 3: Server -- Shared Utilities

### 3.1 `asyncHandler`

Create `server/src/lib/asyncHandler.js`:

```javascript
// TODO: Export an asyncHandler function that wraps an async Express route handler.
// It should return a new function (req, res, next) that calls fn(req, res, next)
// and passes any thrown error to next().

export function asyncHandler(fn) {
  // TODO: implement
}
```

### 3.2 `AppError`

Create `server/src/lib/AppError.js`:

```javascript
// TODO: Export an AppError class extending Error with:
//   - constructor(message, statusCode = 500, details = null)
//   - this.name = 'AppError'
//   - this.statusCode
//   - this.details

// TODO: Export factory functions:
//   notFound(resource) -- 404
//   badRequest(message, details) -- 400
//   conflict(message) -- 409

export class AppError extends Error {
  // TODO: implement
}

export const notFound = (resource) => { /* TODO */ };
export const badRequest = (message, details = null) => { /* TODO */ };
export const conflict = (message) => { /* TODO */ };
```

### 3.3 Error Handler Middleware

Create `server/src/middleware/errorHandler.js`:

```javascript
// TODO: Export an errorHandler(err, req, res, next) middleware that:
//   1. Logs: timestamp, method, path, error message, stack (dev only)
//   2. If err is an AppError, respond with err.statusCode and err.message
//   3. If err.code is '23505' (pg unique violation), respond with 409
//   4. If err.code is '22P02' (invalid int), respond with 400
//   5. Otherwise respond with 500 -- use a generic message in production

export function errorHandler(err, req, res, next) {
  // TODO: implement
}
```

---

## Part 4: Server -- Routes

### 4.1 Posts Router

Create `server/src/routes/posts.js`:

```javascript
import { Router } from 'express';
import { query } from '../lib/db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound, badRequest } from '../lib/AppError.js';

const router = Router();

// TODO: GET / -- return all posts ordered by created_at DESC
// Response: { posts: Post[] }

// TODO: GET /:id -- return a single post by id
// Validate that id is a valid integer
// Return 404 if not found
// Response: { post: Post }

// TODO: POST / -- create a new post
// Required fields: title (string), body (string)
// Return 400 if either is missing or blank
// Response: { post: Post } with status 201

// TODO: PUT /:id -- update a post's title and/or body
// Use COALESCE so omitted fields keep their existing value
// Return 404 if the post doesn't exist
// Response: { post: Post }

// TODO: DELETE /:id -- delete a post by id
// Return 404 if not found
// Return 204 No Content on success

export default router;
```

### 4.2 Comments Router

Create `server/src/routes/comments.js`:

```javascript
import { Router } from 'express';
import { query } from '../lib/db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound, badRequest } from '../lib/AppError.js';

// Use mergeParams: true so :postId from the parent router is available
const router = Router({ mergeParams: true });

// TODO: GET / -- return all comments for a post (use req.params.postId)
// Return 404 if the post itself doesn't exist
// Response: { comments: Comment[] }

// TODO: POST / -- add a comment to a post
// Required: body (string). Optional: author (string, default 'Anonymous')
// Return 404 if the post doesn't exist
// Response: { comment: Comment } with status 201

export default router;
```

### 4.3 App Configuration

Create `server/src/app.js`:

```javascript
import express from 'express';
import cors from 'cors';
import postsRouter from './routes/posts.js';
import commentsRouter from './routes/comments.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// TODO: Add cors() middleware -- allow CLIENT_URL from process.env
// TODO: Add express.json() middleware
// TODO: Mount postsRouter at /api/posts
// TODO: Mount commentsRouter at /api/posts/:postId/comments
// TODO: Add a 404 catch-all for unknown routes (before errorHandler)
// TODO: Register errorHandler as the last middleware

export default app;
```

### 4.4 Server Entry Point

Create `server/src/index.js`:

```javascript
import 'dotenv/config';
import app from './app.js';

// TODO: Read PORT from process.env, default to 3001
// TODO: Start the server and log the URL
// TODO: Add process.on handlers for unhandledRejection and uncaughtException
```

---

## Part 5: Client -- API Module

Create `client/src/api/posts.js`:

```javascript
// TODO: Read BASE_URL from import.meta.env.VITE_API_URL
// TODO: Implement apiFetch(path, options) that:
//   - Calls fetch with Content-Type: application/json
//   - Catches network errors and throws a user-friendly message
//   - Throws on non-OK responses, attaching err.status
//   - Returns null for 204 responses, otherwise returns response.json()

// TODO: Export postsApi with: getAll, getOne, create, update, remove
// TODO: Export commentsApi with: getByPost, create

const BASE_URL = import.meta.env.VITE_API_URL;

async function apiFetch(path, options = {}) {
  // TODO: implement
}

export const postsApi = {
  getAll:  ()         => { /* TODO */ },
  getOne:  (id)       => { /* TODO */ },
  create:  (post)     => { /* TODO */ },
  update:  (id, data) => { /* TODO */ },
  remove:  (id)       => { /* TODO */ },
};

export const commentsApi = {
  getByPost: (postId)          => { /* TODO */ },
  create:    (postId, comment) => { /* TODO */ },
};
```

---

## Part 6: Client -- Custom Hook

Create `client/src/hooks/useFetch.js`:

```javascript
import { useState, useEffect, useCallback } from 'react';

// TODO: Implement useFetch(url) that returns { data, loading, error, refetch }
// Requirements:
//   - Tracks loading, error, and data state
//   - Fetches on mount and when url changes
//   - Supports a refetch() function that re-triggers the fetch
//   - Sets cancelled = true in the cleanup function to avoid state updates
//     after unmount

export function useFetch(url) {
  // TODO: implement
}
```

---

## Part 7: Client -- Components

### 7.1 Error Boundary

Create `client/src/components/ErrorBoundary.jsx`:

```jsx
import { Component } from 'react';

// TODO: Implement an ErrorBoundary class component that:
//   - Has state: { hasError: false, error: null }
//   - Implements getDerivedStateFromError
//   - Implements componentDidCatch (log the error)
//   - Renders this.props.fallback (or a default message) when hasError is true
//   - Includes a "Try Again" button that resets hasError to false

export class ErrorBoundary extends Component {
  // TODO: implement
}
```

### 7.2 Post List

Create `client/src/components/PostList.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { useFetch } from '../hooks/useFetch.js';
import { postsApi } from '../api/posts.js';

// TODO: Build PostList component
// - Use useFetch to load posts from VITE_API_URL + '/api/posts'
// - Sync fetched data into local posts state so mutations can update the list
// - Show loading, error, and empty states
// - Render a PostCard for each post, passing onUpdated and onDeleted callbacks
// - Include a "New Post" button or section for CreatePostForm

export function PostList() {
  // TODO: implement
}
```

### 7.3 Post Card

Create `client/src/components/PostCard.jsx`:

```jsx
import { useState } from 'react';
import { postsApi } from '../api/posts.js';
import { EditPostForm } from './EditPostForm.jsx';
import { CommentSection } from './CommentSection.jsx';

// TODO: Build PostCard component that receives { post, onUpdated, onDeleted }
// - Displays post title, body, and created_at
// - Has Delete button (with confirmation, per-item loading state)
// - Has Edit button that toggles EditPostForm inline
// - Has Show Comments toggle that reveals CommentSection

export function PostCard({ post, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // TODO: implement handleDelete
  // TODO: implement render

  return null; // TODO: replace with real JSX
}
```

### 7.4 Create Post Form

Create `client/src/components/CreatePostForm.jsx`:

```jsx
import { useState } from 'react';
import { postsApi } from '../api/posts.js';

// TODO: Build CreatePostForm that receives { onCreated }
// - Controlled inputs for title and body
// - Validate: both fields required before submit
// - Disable form while submitting
// - Clear inputs and call onCreated(post) on success
// - Display error message on failure

export function CreatePostForm({ onCreated }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    // TODO: implement
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* TODO: render inputs, error message, submit button */}
    </form>
  );
}
```

### 7.5 Edit Post Form

Create `client/src/components/EditPostForm.jsx`:

```jsx
import { useState } from 'react';
import { postsApi } from '../api/posts.js';

// TODO: Build EditPostForm that receives { post, onUpdated, onCancel }
// - Pre-populate inputs with post.title and post.body
// - Disable form while saving
// - Call onUpdated(updatedPost) on success
// - Show error message on failure
// - Cancel button calls onCancel()

export function EditPostForm({ post, onUpdated, onCancel }) {
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    // TODO: implement
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* TODO: render inputs, error message, save and cancel buttons */}
    </form>
  );
}
```

### 7.6 Comment Section

Create `client/src/components/CommentSection.jsx`:

```jsx
import { useState } from 'react';
import { useFetch } from '../hooks/useFetch.js';
import { commentsApi } from '../api/posts.js';

// TODO: Build CommentSection that receives { postId }
// - Use useFetch to load comments from /api/posts/:postId/comments
// - Display each comment's body, author, and created_at
// - Include a small form with body and author inputs to add a new comment
// - Append the new comment to the local list on success
// - Show loading and error states

export function CommentSection({ postId }) {
  // TODO: implement
}
```

---

## Part 8: Wire It Together

Update `client/src/App.jsx`:

```jsx
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { PostList } from './components/PostList.jsx';

function App() {
  return (
    <div className="app">
      <header>
        <h1>Full-Stack Blog</h1>
      </header>
      <main>
        <ErrorBoundary fallback={<p>Could not load the blog. Please refresh.</p>}>
          <PostList />
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default App;
```

---

## Stretch Goals

Once the core app is working, try extending it:

1. **Pagination**: Add `?page=` and `?limit=` query parameters to `GET /api/posts`. Show "Next" and "Previous" buttons in the React app.
2. **Search**: Add a `?q=` query parameter to `GET /api/posts` that filters by title (case-insensitive `ILIKE`). Add a search input to the React app.
3. **Optimistic delete**: Implement optimistic deletion for posts (remove immediately, restore on API failure).
4. **Loading skeletons**: Replace the "Loading..." text with placeholder skeleton cards while posts are fetching.
5. **Production deployment**: Deploy the server to Render and the client to Vercel following the steps in Lesson 4.

---

## Submission Checklist

Before submitting, verify:

- [ ] `npm run dev` from the root starts both servers without errors
- [ ] `GET /api/posts` returns an array of posts from PostgreSQL (not an in-memory store)
- [ ] Creating a post via the React form stores it in the database and appears in the list
- [ ] Editing a post updates the database and reflects in the UI without a page refresh
- [ ] Deleting a post removes it from the database and removes it from the list
- [ ] Adding a comment stores it and appears in the comment section
- [ ] All forms show a loading state while the API call is in flight
- [ ] All forms show an error message on API failure
- [ ] Navigating away and back to the app shows previously saved posts (data persists in PostgreSQL)
- [ ] No `.env` files are committed to git
- [ ] The `server/.env.example` and `client/.env.example` files exist and list all required variables

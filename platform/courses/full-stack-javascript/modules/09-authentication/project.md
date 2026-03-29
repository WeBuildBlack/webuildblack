---
title: "Module Project: Secure Auth System"
estimatedMinutes: 90
---

# Module Project: Secure Auth System

You have been building the Full-Stack Blog across this course. By the end of Module 08, you had a working Express API with PostgreSQL (posts + comments CRUD) and a React frontend built with Vite. Right now, anyone can create, edit, or delete any post. That changes in this project.

By the end of this project, your blog will have:

- A `users` table with hashed passwords
- Registration and login endpoints using bcrypt + JWT
- An httpOnly cookie-based auth flow
- A `requireAuth` middleware protecting write operations
- Ownership checks so only a post's author can edit or delete it
- A React `AuthContext` providing login state across the app
- Login and registration forms in the UI
- A `ProtectedRoute` component guarding client-side routes

---

## What You Are Building

```
Full-Stack Blog -- Auth Layer

server/
  migrations/
    002_add_users.sql         -- users table + add user_id to posts
  routes/
    auth.js                   -- /register, /login, /logout, /me
  middleware/
    requireAuth.js            -- JWT verification middleware
    requireOwnership.js       -- Post ownership check middleware

client/
  src/
    context/
      AuthContext.jsx          -- Auth state + login/logout/register functions
    components/
      ProtectedRoute.jsx       -- Redirects to /login if not authenticated
      LoginForm.jsx            -- Email/password login form
      RegisterForm.jsx         -- Registration form
    pages/
      LoginPage.jsx
      RegisterPage.jsx
```

---

## Part 1: Database Migration

Create `server/migrations/002_add_users.sql`:

```sql
-- TODO: Create the users table
-- Requirements:
--   id (serial primary key)
--   email (unique, not null)
--   password_hash (varchar 255, not null)
--   display_name (varchar 100, nullable)
--   role (varchar 20, not null, default 'author', check in ('reader','author','admin'))
--   created_at (timestamptz, default now())
--   updated_at (timestamptz, default now())
-- Add an index on email for fast lookups

-- TODO: Add user_id column to the posts table
-- Requirements:
--   user_id references users(id) on delete cascade
--   Make it nullable first (so existing posts don't break), then add the constraint

-- Hint: ALTER TABLE posts ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
```

Run the migration:

```bash
psql -d your_blog_db -f server/migrations/002_add_users.sql
```

Verify with `\d users` and `\d posts` in psql.

---

## Part 2: Server -- Auth Routes

Create `server/routes/auth.js` with four endpoints.

### POST /api/auth/register

```javascript
// server/routes/auth.js
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const router = express.Router();

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// TODO: Implement POST /register
// Steps:
//   1. Validate email, password (min 8 chars), and optional displayName
//   2. Check if email is already taken (return 409 if so)
//   3. Hash the password with bcrypt
//   4. Insert the user into the database
//   5. Sign a JWT with { userId, email, role }
//   6. Set the token as an httpOnly cookie
//   7. Return 201 with user data (no password_hash)

router.post('/register', async (req, res) => {
  // TODO: implement
});

// TODO: Implement POST /login
// Steps:
//   1. Validate email and password are present
//   2. Look up user by email
//   3. Always run bcrypt.compare() (use DUMMY_HASH if user not found -- timing attack prevention)
//   4. If invalid, return 401 with generic message
//   5. Sign a JWT with { userId, email, role }
//   6. Set the token as an httpOnly cookie
//   7. Return 200 with user data

const DUMMY_HASH = '$2b$12$invalidhashfortimingXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.';

router.post('/login', async (req, res) => {
  // TODO: implement
});

// TODO: Implement POST /logout
// Clear the token cookie and return 200

router.post('/logout', (req, res) => {
  // TODO: implement
});

// TODO: Implement GET /me
// Use requireAuth middleware
// Return the current user from the database (no password_hash)

router.get('/me', /* requireAuth here */ async (req, res) => {
  // TODO: implement
});

export default router;
```

---

## Part 3: Server -- Auth Middleware

Create `server/middleware/requireAuth.js`:

```javascript
// server/middleware/requireAuth.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export function requireAuth(req, res, next) {
  // TODO: Read the token from req.cookies.token
  // If no token, return 401

  // TODO: Call jwt.verify(token, JWT_SECRET)
  // If valid: attach decoded payload to req.user and req.userId, then next()
  // If TokenExpiredError: return 401 with 'Session expired. Please log in again.'
  // If any other error: return 401 with 'Invalid token'
}
```

Create `server/middleware/requireOwnership.js`:

```javascript
// server/middleware/requireOwnership.js
import pool from '../db.js';

// Checks that req.userId matches the post's user_id
// (or the user is an admin)
export async function requireOwnership(req, res, next) {
  const postId = req.params.id;

  // TODO: Query the posts table for the post with req.params.id
  // If not found, return 404

  // TODO: Check if post.user_id === req.userId OR req.user.role === 'admin'
  // If not, return 403
  // If yes, attach post to req.post (so the route handler doesn't re-query) and call next()
}
```

---

## Part 4: Wire Up Protected Routes

Update `server/routes/posts.js` to protect write operations:

```javascript
import { requireAuth } from '../middleware/requireAuth.js';
import { requireOwnership } from '../middleware/requireOwnership.js';

// Public routes (no middleware needed):
//   GET /api/posts
//   GET /api/posts/:id

// Protected -- must be logged in:
//   POST /api/posts        requireAuth
//   PUT /api/posts/:id     requireAuth, requireOwnership
//   DELETE /api/posts/:id  requireAuth, requireOwnership

// TODO: Add requireAuth and requireOwnership to the correct routes
// Make sure POST /api/posts sets user_id from req.userId when inserting
```

Also update `server/index.js`:

```javascript
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';

// TODO: Add these before your existing middleware:
app.use(helmet());
app.use(cookieParser());

// TODO: Register auth routes
app.use('/api/auth', authRoutes);
```

Install new dependencies:

```bash
npm install jsonwebtoken bcrypt cookie-parser helmet
```

---

## Part 5: React -- AuthContext

Create `client/src/context/AuthContext.jsx`:

```jsx
// client/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // null = not checked yet? Use isLoading below
  const [isLoading, setIsLoading] = useState(true);

  // TODO: On mount, call GET /api/auth/me to restore auth state
  // If 200: setUser(data.user)
  // If 401: setUser(null) (not an error -- just not logged in)
  // Always: setIsLoading(false) when done

  useEffect(() => {
    // TODO: implement
  }, []);

  async function login(email, password) {
    // TODO: POST /api/auth/login with { email, password }
    // credentials: 'include' is required for the cookie to be set
    // On success: setUser(data.user), return { success: true }
    // On failure: return { success: false, error: data.error }
  }

  async function register(email, password, displayName) {
    // TODO: POST /api/auth/register with { email, password, displayName }
    // credentials: 'include'
    // On success: setUser(data.user), return { success: true }
    // On failure: return { success: false, error: data.error }
  }

  async function logout() {
    // TODO: POST /api/auth/logout
    // credentials: 'include'
    // Always: setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

Wrap your app in `AuthProvider` in `client/src/main.jsx`:

```jsx
// client/src/main.jsx
import { AuthProvider } from './context/AuthContext.jsx';

// TODO: Wrap <App /> with <AuthProvider>
```

---

## Part 6: React -- ProtectedRoute Component

```jsx
// client/src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();

  // TODO: While isLoading is true, show a loading spinner or null
  // (Prevents flash of redirect before /me check completes)

  // TODO: If not loading and user is null, redirect to /login
  // Use <Navigate to="/login" replace />

  // TODO: Otherwise, render children
}
```

---

## Part 7: React -- Login and Register Forms

Create `client/src/components/LoginForm.jsx`:

```jsx
// client/src/components/LoginForm.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // TODO: Call login(email, password) from AuthContext
    // On success: navigate to '/'
    // On failure: setError(result.error)
    // Always: setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* TODO: email input, password input, error display, submit button */}
      {/* Disable the submit button while isSubmitting is true */}
    </form>
  );
}
```

Create `client/src/components/RegisterForm.jsx` following the same structure, with an additional `displayName` field.

---

## Part 8: Update the Post UI

In your post list or post detail component, show edit/delete controls only to the post's author:

```jsx
// In your PostCard or PostDetail component
import { useAuth } from '../context/AuthContext.jsx';

export function PostCard({ post }) {
  const { user } = useAuth();

  // TODO: Only render edit/delete buttons if user?.id === post.user_id
  // Hint: the API should return user_id with each post for this check
  //   UPDATE your GET /api/posts query to include user_id in the response
}
```

---

## Submission Checklist

Before marking this project complete, verify each item:

- [ ] `users` table exists with `email`, `password_hash`, `role`, and timestamps
- [ ] `posts` table has a `user_id` column referencing `users`
- [ ] `POST /api/auth/register` creates a user and returns a JWT cookie
- [ ] `POST /api/auth/login` verifies credentials and returns a JWT cookie
- [ ] `POST /api/auth/logout` clears the token cookie
- [ ] `GET /api/auth/me` returns the current user when authenticated
- [ ] `requireAuth` middleware returns 401 when no valid JWT is present
- [ ] `requireOwnership` middleware returns 403 when the post belongs to another user
- [ ] `POST /api/posts` requires authentication and sets `user_id`
- [ ] `PUT /api/posts/:id` requires auth and ownership
- [ ] `DELETE /api/posts/:id` requires auth and ownership
- [ ] React `AuthContext` restores auth state on page refresh via `/me`
- [ ] `ProtectedRoute` redirects unauthenticated users to `/login`
- [ ] Login and register forms work end-to-end with proper error handling
- [ ] Edit/delete buttons only appear for the post's author in the UI

---

## Stretch Goals

These are not required to complete the module, but each one adds meaningful production-level polish.

**Refresh tokens.** Implement a refresh token flow: short-lived access tokens (15 min) + long-lived refresh tokens (7 days) stored in a separate httpOnly cookie. Add `POST /api/auth/refresh` and a `refresh_tokens` table to track issued tokens (for revocation on logout).

**Forgot password.** Add `POST /api/auth/forgot-password` that generates a short-lived reset token (stored in the database), and `POST /api/auth/reset-password` that verifies the token and updates the hash. Email delivery can be simulated by logging the reset URL to the console.

**Rate limiting on auth routes.** Add `express-rate-limit` to limit `POST /api/auth/login` and `POST /api/auth/register` to 10 requests per 15 minutes per IP. Test it by attempting 11 rapid logins and confirming the 429 response.

**Email verification.** Add a `verified` boolean to the `users` table. On registration, generate a verification token and send a link (log it to console). Add `GET /api/auth/verify-email?token=...` to flip the flag. Prevent unverified users from creating posts.

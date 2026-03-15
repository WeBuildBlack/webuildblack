---
title: "Session-Based Authentication"
estimatedMinutes: 40
---

# Session-Based Authentication

Sessions are one of the oldest and most reliable patterns for web authentication. Before JWTs existed, sessions powered virtually every login system on the web. They are still widely used today, particularly in server-rendered apps, and understanding how they work makes you a better engineer regardless of which pattern you end up using.

---

## How Sessions Work

When a user logs in successfully, the server creates a session: a record stored server-side that represents an authenticated user. The server sends the client a session ID (a random, opaque string) via a cookie. On every subsequent request, the browser automatically sends that cookie, and the server looks up the corresponding session to identify the user.

```
Browser                            Server                        Session Store
  |                                  |                               |
  |-- POST /login (email+password) ->|                               |
  |                                  | 1. Verify credentials         |
  |                                  | 2. Create session             |
  |                                  |-- Store { userId: 42 } ------>|
  |                                  |<-- sessionId: "abc123" -------|
  |<-- Set-Cookie: sid=abc123 -------|                               |
  |                                  |                               |
  |-- GET /dashboard (sid=abc123) -->|                               |
  |                                  |-- Lookup "abc123" ----------->|
  |                                  |<-- { userId: 42 } ------------|
  |                                  | 3. Attach user to req         |
  |<-- 200 Dashboard data -----------|                               |
```

The session ID itself is meaningless: it is just a random token pointing to data on the server. This is the key difference from JWTs, where the token itself carries the user data.

---

## Setting Up express-session

Install the package:

```bash
npm install express-session
```

For production you will also want a persistent session store. The default in-memory store loses all sessions when the server restarts, which is not acceptable in production. For development, the default is fine.

```javascript
// server/index.js
import express from 'express';
import session from 'express-session';

const app = express();
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,  // Used to sign the cookie
  resave: false,                        // Don't save session if unmodified
  saveUninitialized: false,             // Don't create session until something is stored
  cookie: {
    httpOnly: true,    // Prevents JavaScript from reading the cookie
    secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
    sameSite: 'lax',   // CSRF protection (more on this later)
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days in milliseconds
  },
}));
```

The `secret` is a random string used to cryptographically sign the session cookie. If an attacker tries to tamper with the cookie value, the signature will not match and the session will be rejected. Use a long, random value from your environment:

```bash
# Generate a secure secret (run this once and store in .env)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Session Store Options

The default `MemoryStore` is explicitly not recommended for production by the express-session documentation. All sessions are stored in the Node.js process memory, which means:

- Sessions are lost when the server restarts
- Memory grows unboundedly with active users
- Multiple server instances cannot share sessions

For production, use a dedicated store:

```bash
# Redis (fastest, most common for sessions)
npm install connect-redis ioredis

# PostgreSQL (if you are already running Postgres)
npm install connect-pg-simple

# MongoDB
npm install connect-mongo
```

```javascript
// Example: PostgreSQL session store (great for apps already on Postgres)
import pgSession from 'connect-pg-simple';
import pool from './db.js';

const PgStore = pgSession(session);

app.use(session({
  store: new PgStore({
    pool,                  // Your existing pg Pool
    tableName: 'sessions', // Will be created automatically
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: true, sameSite: 'lax' },
}));
```

For this module's project, the in-memory default is fine for local development.

---

## Login and Logout Flow

Here is the complete login route using sessions:

```javascript
// server/routes/auth.js
import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../db.js';

const router = express.Router();

// Reuse this constant from lesson 2 -- keeps timing consistent
const DUMMY_HASH = '$2b$12$invalidhashfortimingXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, password_hash, display_name FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    const user = result.rows[0];

    // Always run bcrypt.compare() -- prevents timing attacks
    const hashToCompare = user ? user.password_hash : DUMMY_HASH;
    const isValid = await bcrypt.compare(password, hashToCompare);

    if (!user || !isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Regenerate session ID after login to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).json({ error: 'Login failed' });
      }

      // Store user info in the session
      req.session.userId = user.id;
      req.session.email = user.email;

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
        },
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    // Clear the cookie on the client
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

export default router;
```

Two things to call out here.

**`req.session.regenerate()`** creates a new session ID after login. This prevents session fixation attacks, where an attacker sets a known session ID on your cookie before you log in, then uses that ID after you authenticate.

**`req.session.destroy()`** on logout removes the session from the store entirely. Just deleting the cookie client-side is not sufficient: the session would still exist on the server and could be replayed by someone who copied the cookie value.

---

## Writing the Auth Middleware

Now that sessions work, you need a middleware function that protects routes requiring authentication. The pattern is simple: check if `req.session.userId` exists before allowing the request to proceed.

```javascript
// server/middleware/requireAuth.js

export function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  // Attach userId to req for downstream handlers
  req.userId = req.session.userId;
  next();
}
```

Apply it to protected routes:

```javascript
// server/routes/posts.js
import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import pool from '../db.js';

const router = express.Router();

// Public: anyone can read posts
router.get('/', async (req, res) => {
  const result = await pool.query(
    'SELECT posts.*, users.display_name AS author_name FROM posts JOIN users ON posts.user_id = users.id ORDER BY created_at DESC'
  );
  res.json(result.rows);
});

// Protected: must be logged in to create a post
router.post('/', requireAuth, async (req, res) => {
  const { title, content } = req.body;
  const result = await pool.query(
    'INSERT INTO posts (title, content, user_id) VALUES ($1, $2, $3) RETURNING *',
    [title, content, req.userId]
  );
  res.status(201).json(result.rows[0]);
});
```

The middleware is reusable across all routes. Pass it as the second argument to any route that requires login.

---

## Checking Auth Status on the Client

Your React app needs to know if the user is logged in when it first loads. Add a `/me` endpoint:

```javascript
// In your auth router
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, display_name, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});
```

On the React side, call `GET /api/auth/me` when the app loads. If it returns 200, the user is authenticated. If it returns 401, they need to log in.

---

## Session Security: Cookie Flags

The cookie settings in `express-session` are not optional extras. Each one addresses a real attack vector.

```javascript
cookie: {
  httpOnly: true,
  // Prevents JavaScript (including XSS-injected scripts) from reading the cookie.
  // Without this, document.cookie exposes the session ID.

  secure: process.env.NODE_ENV === 'production',
  // Only send the cookie over HTTPS. Without this, the session ID can be
  // intercepted in transit on HTTP connections. Always true in production.

  sameSite: 'lax',
  // Controls when the cookie is sent on cross-site requests.
  // 'lax': sent on top-level navigations, but not on cross-site API requests.
  // 'strict': never sent on cross-site requests (breaks OAuth flows).
  // 'none': always sent (requires secure: true; needed for cross-origin APIs).
  // For same-origin apps, 'lax' is the right balance.

  maxAge: 7 * 24 * 60 * 60 * 1000,
  // Session expiry in milliseconds. After this, the cookie is deleted
  // by the browser. The server-side session may still exist -- your session
  // store should have its own cleanup/TTL configured.
}
```

For a React SPA calling a separate Express API (different port or domain during development), you will also need to configure CORS:

```bash
npm install cors
```

```javascript
import cors from 'cors';

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173', // Vite default
  credentials: true,  // Required for cookies to be sent cross-origin
}));
```

And on the client side, include credentials in every fetch:

```javascript
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',  // Required to send and receive cookies cross-origin
  body: JSON.stringify({ email, password }),
});
```

---

## When to Choose Sessions

Sessions are a strong choice in several scenarios:

- Server-rendered applications (traditional Express + template engines)
- Apps where immediate logout is critical (banking, healthcare)
- Applications that do not need to scale horizontally beyond a shared session store
- When you want simplicity and do not need stateless tokens

The next lesson covers JWTs, which take a different approach. Understanding both lets you make an informed choice for any project.

---

## Key Takeaways

- Sessions store auth state on the server; the client only holds an opaque session ID in a cookie
- `express-session` manages session creation, reading, and the cookie lifecycle
- The in-memory session store is development-only: use Redis or PostgreSQL in production
- Call `req.session.regenerate()` after login to prevent session fixation attacks
- `req.session.destroy()` on logout removes the server-side session: clearing the cookie alone is not enough
- `requireAuth` middleware checks `req.session.userId` and returns 401 if missing
- Cookie flags (`httpOnly`, `secure`, `sameSite`) are not optional: each one blocks a real attack vector

---

## Try It Yourself

**Exercise 1.** Implement the full session-based login and logout in your blog app. Then test the cookie in DevTools: after login, open Application > Cookies and confirm the session cookie is present with `HttpOnly` checked. After logout, confirm it is gone.

**Exercise 2.** Add the `requireAuth` middleware to your blog's `POST /api/posts` route. Test three scenarios: (1) create a post while logged in (should work), (2) create a post while logged out (should return 401), and (3) log out and then try to use the same session cookie from before logout (should return 401 because the session was destroyed).

**Exercise 3.** Research the connect-pg-simple package. Write out (in comments in a new file `server/notes/session-store.js`) what SQL table it creates, how it handles session expiry, and what configuration changes you would make to `express-session` to switch from the default MemoryStore to the Postgres store. You do not need to implement it, just document your understanding.

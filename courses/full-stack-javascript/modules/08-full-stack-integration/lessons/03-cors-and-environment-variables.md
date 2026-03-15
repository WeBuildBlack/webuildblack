---
title: "CORS and Environment Variables"
estimatedMinutes: 35
---

# CORS and Environment Variables

Two topics trip up almost every developer the first time they connect a frontend to a backend: CORS errors and environment variable mismatches. These are not bugs in your code -- they are browser security policies and configuration patterns you have to understand once, and then they stop being a problem. This lesson covers both completely.

---

## The Same-Origin Policy

Browsers enforce the **same-origin policy**: a script loaded from one origin cannot make requests to a different origin unless that other origin explicitly permits it.

An origin is defined by three things: protocol, hostname, and port. Two URLs have the same origin only if all three match exactly.

```
http://localhost:5173    <-- Vite dev server (your React app)
http://localhost:3001    <-- Express API

These are different origins. The ports differ.
The browser will block the React app from fetching the Express API
unless the Express API sends the right CORS headers.
```

```
https://blog.vercel.app      <-- your deployed React app
https://blog-api.onrender.com  <-- your deployed Express API

Also different origins. The hostnames differ.
Same CORS rules apply in production.
```

This policy exists to protect users. Without it, a malicious website could make API calls to your bank's website using your logged-in session cookies. The same-origin policy prevents that by blocking cross-origin requests by default.

---

## What a CORS Error Looks Like

When your React app tries to fetch your Express API without CORS configured, you see this in the browser console:

```
Access to fetch at 'http://localhost:3001/api/posts' from origin
'http://localhost:5173' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

The request actually reaches your server. Express processes it and sends a response. But the browser inspects the response headers and, finding no `Access-Control-Allow-Origin` header, refuses to give the response to your JavaScript code. It throws a network error instead.

This means CORS errors are solved on the **server**, not the client. You tell your Express API which origins are allowed.

---

## The `cors` Middleware

The `cors` npm package makes this straightforward. Install it in your server directory:

```bash
npm install cors
```

The simplest configuration allows all origins:

```javascript
// server/src/app.js
import express from 'express';
import cors from 'cors';

const app = express();

// Allow all origins -- fine for development, not for production
app.use(cors());
app.use(express.json());
```

For production, restrict to your actual client origin:

```javascript
// server/src/app.js
import express from 'express';
import cors from 'cors';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',               // Vite dev server
  'https://blog.vercel.app',             // your deployed React app
  process.env.CLIENT_URL,                // set in production .env
].filter(Boolean); // remove undefined values

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // needed if you send cookies or Authorization headers
}));

app.use(express.json());
```

The `cors()` call must come **before** your route definitions. Middleware runs in order, and you want CORS headers added to every response before any route handler runs.

---

## Preflight Requests

For certain requests (those using methods other than GET/POST, or custom headers like `Authorization`), the browser sends a preliminary `OPTIONS` request before the real request. This is called a preflight. The browser is asking the server: "Are you OK with me sending this request?"

```
Browser sends:
OPTIONS /api/posts
Origin: http://localhost:5173
Access-Control-Request-Method: DELETE
Access-Control-Request-Headers: Content-Type

Server must respond:
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

The `cors()` middleware handles preflight requests automatically. But you need to make sure OPTIONS requests can reach your CORS middleware -- they must not be blocked by authentication middleware earlier in the chain.

```javascript
// If you add auth middleware, let OPTIONS through first
app.use(cors(corsOptions));    // handles preflight
app.use(express.json());
app.use('/api', authMiddleware); // auth only runs on actual API routes
app.use('/api/posts', postsRouter);
```

---

## Environment Variables on the Server

Your Express server needs configuration that should not be in source code: the database URL, API keys, port number, and the allowed client origin. These go in a `.env` file and are loaded with `dotenv`.

Install dotenv in your server directory:

```bash
npm install dotenv
```

Create `server/.env`:

```bash
# server/.env -- never commit this file
PORT=3001
DATABASE_URL=postgresql://localhost:5432/blog_development
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

Load it at the very top of your server entry point, before any other imports that might read `process.env`:

```javascript
// server/src/index.js
import 'dotenv/config'; // loads .env into process.env immediately

import app from './app.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
```

Access variables anywhere in your server code via `process.env`:

```javascript
// server/src/lib/db.js
import pg from 'pg';
const { Pool } = pg;

// Fail fast if the required variable is missing
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // In production, Render and Railway provide SSL-enabled connection strings.
  // Add ssl: { rejectUnauthorized: false } if connecting to a managed DB.
  ...(process.env.NODE_ENV === 'production' && {
    ssl: { rejectUnauthorized: false },
  }),
});
```

---

## Environment Variables on the Client

Vite uses a different system for environment variables than Node.js. A few key differences:

**1. Vite variables must be prefixed with `VITE_` to be exposed to browser code.**

Any variable in `client/.env` without the `VITE_` prefix is invisible to your React code. This is intentional: you do not want secrets like API keys accidentally bundled into your JavaScript and shipped to users' browsers.

```bash
# client/.env -- values are embedded in the JavaScript bundle at build time
VITE_API_URL=http://localhost:3001

# This is NOT accessible in React code (no VITE_ prefix):
SECRET_API_KEY=abc123   # never put secrets in client .env
```

**2. Access Vite variables with `import.meta.env`, not `process.env`.**

```javascript
// In React code:
const apiUrl = import.meta.env.VITE_API_URL;
// => "http://localhost:3001" in development
// => "https://blog-api.onrender.com" in production
```

**3. Vite replaces the variables at build time**, not at runtime. When you run `vite build`, Vite reads the `.env` file and bakes the values directly into the compiled JavaScript files. This means if you want a different API URL in production, you set the environment variable in Vercel's dashboard -- not in a file deployed with your code.

```javascript
// src/api/posts.js
const BASE_URL = import.meta.env.VITE_API_URL;

if (!BASE_URL) {
  throw new Error('VITE_API_URL is not set. Check your .env file.');
}
```

---

## The `.env` File Hierarchy

Both Vite and dotenv support multiple `.env` files with different precedence:

```
.env              -- loaded in all environments
.env.local        -- loaded in all environments, gitignored (personal overrides)
.env.development  -- loaded only when NODE_ENV=development
.env.production   -- loaded only when NODE_ENV=production
```

For a simple project, one `.env` file per package (server and client) is enough. The critical rule: **`.env` files with real secrets must be in `.gitignore`**.

```bash
# .gitignore at the project root
.env
.env.local
server/.env
client/.env
node_modules/
```

Commit `.env.example` files that show the required variables without values:

```bash
# server/.env.example -- safe to commit
PORT=3001
DATABASE_URL=
NODE_ENV=development
CLIENT_URL=
```

```bash
# client/.env.example -- safe to commit
VITE_API_URL=http://localhost:3001
```

New teammates clone the repo, copy `.env.example` to `.env`, fill in their values, and start working. No secrets in the repository.

---

## Common CORS Mistakes

**Mistake 1: Adding CORS headers manually and getting them wrong.**

```javascript
// Don't do this -- easy to get wrong and inconsistent
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

// Use the cors() package instead. It handles all the edge cases.
app.use(cors({ origin: allowedOrigins }));
```

**Mistake 2: Putting `cors()` after your routes.**

```javascript
// Wrong -- routes defined before cors() won't have CORS headers
app.get('/api/posts', handler);
app.use(cors()); // too late

// Correct -- cors() must come first
app.use(cors());
app.get('/api/posts', handler);
```

**Mistake 3: Forgetting that `cors()` must handle OPTIONS for preflight.**

The `cors()` middleware automatically handles OPTIONS requests. If you add other middleware before `cors()` that blocks OPTIONS (like authentication), preflights will fail and your non-GET requests will be blocked.

**Mistake 4: Thinking the error is in the client code.**

CORS errors are solved in the server. When you see a CORS error in the browser console, go to your Express server and check the CORS configuration, not your React code.

---

## Key Takeaways

- The same-origin policy blocks browser JavaScript from fetching a different origin (different protocol, hostname, or port) unless the server explicitly allows it with CORS headers.
- CORS is a server-side fix. The `cors` npm package adds the correct headers automatically. Call `app.use(cors(...))` before your route definitions.
- In production, restrict CORS to your specific client origin using the `origin` option. Never use `cors()` with no configuration in production for an authenticated app.
- For preflight requests (OPTIONS), the `cors()` middleware handles them automatically. Ensure auth middleware does not block OPTIONS before `cors()` runs.
- Server environment variables use `dotenv` and are accessed via `process.env`. Load dotenv at the very top of your entry point.
- Client (Vite) environment variables must be prefixed with `VITE_` and are accessed via `import.meta.env`. They are baked in at build time -- secrets do not belong here.
- Commit `.env.example` files, never `.env` files. Add all `.env` variants to `.gitignore`.

---

## Try It Yourself

**Exercise 1: Reproduce and Fix a CORS Error**
Start your Express API without any CORS configuration. Open your React app and try to fetch from it. Screenshot the CORS error in the browser console. Now add the `cors()` middleware with your React app's origin in the allowed list. Confirm the error is gone.

**Exercise 2: Set Up Environment Variables**
Create `.env` files for both `server/` and `client/`. Set `PORT`, `DATABASE_URL`, `NODE_ENV`, and `CLIENT_URL` in the server. Set `VITE_API_URL` in the client. Create corresponding `.env.example` files. Update `db.js` to throw a clear error if `DATABASE_URL` is missing. Update `src/api/posts.js` to read the base URL from `import.meta.env.VITE_API_URL`.

**Exercise 3: Production CORS Config**
Update your Express CORS configuration to use the function form of `origin`, checking against an array that includes both `http://localhost:5173` and whatever value `CLIENT_URL` has in `process.env`. Test that requests from `localhost:5173` succeed and log what happens when you temporarily change the origin to a value not in the allowed list.

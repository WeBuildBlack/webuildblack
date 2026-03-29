---
title: "JWT Authentication"
estimatedMinutes: 40
---

# JWT Authentication

JSON Web Tokens are the dominant authentication pattern for modern SPAs and APIs. If you have worked with any contemporary JavaScript stack (React + Express, Next.js, or any REST API consumed by a mobile app), you have almost certainly encountered JWTs. This lesson explains how they work, how to implement them correctly, and where the tradeoffs land relative to sessions.

---

## What Is a JWT?

A JSON Web Token is a compact, self-contained token that encodes claims (assertions about a user) and is cryptographically signed so the server can verify it has not been tampered with.

A JWT looks like this:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQyLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJpYXQiOjE3MDk3NjgwMDAsImV4cCI6MTcwOTg1NDQwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

It is three Base64URL-encoded segments separated by dots:

```
HEADER.PAYLOAD.SIGNATURE
```

**Header:** Metadata about the token type and signing algorithm.

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload:** The claims. This is the actual data you are encoding.

```json
{
  "userId": 42,
  "email": "user@example.com",
  "iat": 1709768000,
  "exp": 1709854400
}
```

`iat` (issued at) and `exp` (expiration) are standard JWT claims measured in Unix seconds. `exp` is how JWTs handle session expiry without server-side storage.

**Signature:** Created by signing `HEADER.PAYLOAD` with a secret key. The signature is what makes the token trustworthy.

```
HMACSHA256(
  base64url(header) + "." + base64url(payload),
  SECRET_KEY
)
```

When the server receives a token, it recomputes the signature using the same secret key and compares it to the signature in the token. If they match, the token is authentic and unmodified. If they do not match, the token was tampered with and should be rejected.

The payload is **not encrypted.** Anyone can decode the Base64URL and read it. Never put sensitive information (passwords, full SSNs, credit card numbers) in a JWT payload.

---

## Installing jsonwebtoken

```bash
npm install jsonwebtoken
```

Add the JWT secret to your environment:

```bash
# .env
JWT_SECRET=your-very-long-random-secret-here
JWT_EXPIRES_IN=24h
```

Generate a secure secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Signing and Verifying Tokens

```javascript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Create a token for a user after successful login
function createToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      // expiresIn accepts: '15m', '24h', '7d', or seconds as a number
    }
  );
}

// Verify a token and extract the payload
function verifyToken(token) {
  try {
    // Returns the decoded payload if valid
    // Throws if the token is invalid, expired, or tampered
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null; // Invalid token
  }
}
```

---

## The JWT Login Endpoint

```javascript
// server/routes/auth.js
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const router = express.Router();

const DUMMY_HASH = '$2b$12$invalidhashfortimingXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.';
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

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
    const hashToCompare = user ? user.password_hash : DUMMY_HASH;
    const isValid = await bcrypt.compare(password, hashToCompare);

    if (!user || !isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Sign the token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Option A: Send token in an httpOnly cookie (more secure)
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours in ms
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

router.post('/logout', (req, res) => {
  // For cookie-based JWTs: clear the cookie
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

export default router;
```

---

## Where to Store the Token

This is one of the most debated topics in JWT authentication, and the answer depends on your threat model.

**Option A: httpOnly Cookie**

The server sets the token as an httpOnly cookie. The browser sends it automatically on every request. JavaScript cannot read it.

```
Pros:
  - Not accessible via JavaScript, so XSS cannot steal it
  - Browser handles sending it automatically
  - Works with SameSite for CSRF protection

Cons:
  - Requires CORS + credentials: 'include' for cross-origin SPAs
  - Requires CSRF protection for state-changing requests if SameSite is 'none'
```

**Option B: Memory (React state, not localStorage)**

The server returns the token in the JSON response body. The client stores it in memory (a React context variable). It is lost on page refresh.

```
Pros:
  - Not vulnerable to XSS reading localStorage
  - Works cleanly cross-origin without CORS cookie issues

Cons:
  - Lost on refresh (requires a refresh token flow to restore)
  - More complex client-side state management
```

**Option C: localStorage**

The client stores the token in `localStorage`. Simple but insecure.

```
Pros:
  - Survives page refresh
  - Easy to implement

Cons:
  - Any XSS vulnerability in your app exposes the token
  - localStorage is accessible to any JavaScript on the page
  - Not recommended for sensitive applications
```

For the module project, you will use httpOnly cookies. It is the most secure option for a same-domain or same-origin setup and requires the least additional complexity.

---

## The JWT Auth Middleware

```javascript
// server/middleware/requireAuth.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export function requireAuth(req, res, next) {
  // Check for token in cookie first
  let token = req.cookies?.token;

  // Fall back to Authorization header (for API clients that cannot use cookies)
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Attach the decoded payload to the request object
    req.user = decoded;   // { userId, email, iat, exp }
    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

To read cookies in Express, install and use the cookie-parser middleware:

```bash
npm install cookie-parser
```

```javascript
// server/index.js
import cookieParser from 'cookie-parser';
app.use(cookieParser());
```

---

## Access Tokens and Refresh Tokens

A 24-hour expiry means users get logged out every day. A 30-day expiry means a stolen token is valid for 30 days. Refresh tokens solve this tradeoff.

The pattern works like this:

```
1. Login returns two tokens:
   - Access token: short-lived (15 minutes), used for API requests
   - Refresh token: long-lived (7-30 days), used only to get new access tokens

2. Client stores:
   - Access token: in memory (React state)
   - Refresh token: in httpOnly cookie

3. When the access token expires:
   - Client calls POST /auth/refresh
   - Server validates the refresh token, issues a new access token
   - No login required

4. On logout:
   - Delete the refresh token from the database
   - Clear both cookies/memory
```

Here is a minimal refresh endpoint:

```javascript
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  try {
    // Verify the refresh token (uses a different secret)
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // In a production system, check the token against a database allowlist
    // to support true logout (revocation)
    const user = await pool.query(
      'SELECT id, email, display_name FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!user.rows.length) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Issue a new short-lived access token
    const newAccessToken = jwt.sign(
      { userId: user.rows[0].id, email: user.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.cookie('token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.json({ message: 'Token refreshed' });
  } catch (error) {
    res.clearCookie('refreshToken');
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});
```

The module project uses a single 24-hour access token (no refresh flow) for simplicity. The stretch goal at the end of the project adds refresh tokens.

---

## JWT vs Sessions: Comparison

| Concern | Sessions | JWT |
|---|---|---|
| Server state | Stored server-side | Stateless |
| Logout | Immediate (delete session) | Hard without a blocklist |
| Horizontal scaling | Needs shared session store | Works natively |
| Token size | Small cookie (session ID only) | Larger (payload encoded) |
| Revocation | Trivial | Requires token blocklist |
| Best fit | Server-rendered apps, admin panels | SPAs, mobile clients, microservices |

Neither is universally better. Sessions are simpler when you control all servers and need immediate revocation. JWTs are better when you have multiple services, mobile clients, or need stateless verification.

---

## Key Takeaways

- A JWT is a signed, Base64URL-encoded token with three parts: header, payload, and signature
- The payload is readable by anyone with the token; never put sensitive data in it
- `jwt.sign()` creates a token; `jwt.verify()` validates the signature and expiry
- Storing the token in an httpOnly cookie protects it from XSS; localStorage does not
- The JWT auth middleware reads the token from a cookie or Authorization header, verifies it, and attaches the decoded user to `req.user`
- Refresh tokens allow short-lived access tokens without frequent logins
- Sessions win on immediate revocation; JWTs win on stateless horizontal scaling

---

## Try It Yourself

**Exercise 1.** Decode a JWT without a library to understand its structure. After a successful login, copy the token value. In Node.js, run: `Buffer.from('PAYLOAD_SEGMENT', 'base64url').toString()` where `PAYLOAD_SEGMENT` is the middle part of the token. Confirm you can read the userId and expiry without the secret key. This reinforces why you never put sensitive data in the payload.

**Exercise 2.** Switch the blog app from session auth (lesson 3) to JWT auth using the patterns in this lesson. Replace `express-session` with `cookie-parser` and `jsonwebtoken`. Update the `requireAuth` middleware to read from the JWT cookie instead of the session. Run your existing tests to confirm the same routes still protect the same endpoints.

**Exercise 3.** Add a `GET /api/auth/me` endpoint that uses `requireAuth` and returns the current user from the database. In the React app, call this endpoint on page load to restore the auth state. Handle the 401 case by clearing any auth state and showing the login form.

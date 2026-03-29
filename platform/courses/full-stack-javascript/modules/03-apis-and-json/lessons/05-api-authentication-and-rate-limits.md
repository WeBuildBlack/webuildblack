---
title: "API Authentication and Rate Limits"
estimatedMinutes: 35
---

# API Authentication and Rate Limits

Most APIs that expose real data or perform real actions require authentication. Without it, anyone could read private data, submit transactions, or exhaust your usage quota. Authentication tells the server *who* is making the request. Authorization then determines *what* that caller is allowed to do.

Rate limits are the other side of the same coin. Even authenticated callers can only make so many requests per unit of time. Exceeding limits produces `429 Too Many Requests` errors and, in some cases, temporary bans. Handling both authentication and rate limits correctly is what separates code that works in development from code that holds up in production.

---

## API Keys

API keys are the simplest form of authentication. The API provider gives you a secret string. You include it in every request. The server looks it up, finds your account, and decides whether to fulfill the request.

### API Key as a Query Parameter

Some APIs (especially simpler or older ones) accept the key as a query parameter. This is convenient but less secure because URLs get logged in server logs, browser history, and network monitoring tools.

```javascript
// Less secure: key in the URL (visible in logs and history)
const apiKey = process.env.OPENWEATHER_API_KEY; // always from environment
const city = "Brooklyn";

const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=imperial`;
const response = await fetch(url);
const weather = await response.json();
```

### API Key as a Header

Sending the key in a request header is significantly more secure. Headers are not logged the same way URLs are, and they don't appear in browser history.

```javascript
// More secure: key in a header
const response = await fetch("https://api.example.com/data", {
  headers: {
    // The header name varies by API -- check the documentation
    "X-API-Key": process.env.EXAMPLE_API_KEY,
    "Accept": "application/json",
  },
});
```

Some APIs use a custom header name (`X-API-Key`, `X-Auth-Token`, `Api-Key`). Others use `Authorization` with a custom scheme. Always check the documentation for the exact header name and format.

---

## Bearer Token Authentication

Bearer token authentication is the most common pattern for modern APIs. A "bearer token" is a credential that grants access to whoever holds it (the "bearer"). You send it in the `Authorization` header using the `Bearer` scheme.

```javascript
// Authorization: Bearer <token>
async function fetchProtectedResource(token) {
  const response = await fetch("https://api.example.com/profile", {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
    },
  });

  if (response.status === 401) {
    // Token is missing, expired, or invalid
    throw new Error("Unauthorized: token is invalid or expired");
  }

  if (response.status === 403) {
    // Token is valid but this account lacks permission
    throw new Error("Forbidden: you don't have access to this resource");
  }

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}
```

Bearer tokens are often JWTs (JSON Web Tokens). JWTs are Base64-encoded JSON objects that contain claims about the user. They're signed by the server so they can't be tampered with. You can inspect a JWT's contents at jwt.io without needing any tools.

```
A JWT looks like three Base64url strings joined by dots:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
│                                    │ │                                                                                │ │                                          │
└────────────────────────────────────┘ └────────────────────────────────────────────────────────────────────────────────┘ └──────────────────────────────────────────┘
            Header                                                     Payload                                                        Signature
      (algorithm, type)                                     (user ID, name, expiry, etc.)                               (server verifies this hasn't been tampered)
```

JWTs have an expiry time (`exp` claim). When a token expires, the server returns 401 and you need to get a new one. How you get new tokens depends on the authentication flow used.

---

## OAuth 2.0 Overview

OAuth 2.0 is the protocol behind "Login with Google," "Login with GitHub," and similar social login buttons. It lets users authorize your application to access their data on another service without giving you their password.

You won't implement OAuth from scratch in this module (that's covered in the auth module), but understanding the conceptual flow is important because you'll encounter OAuth tokens when working with third-party APIs.

```
The OAuth 2.0 Authorization Code Flow:

1. Your app redirects the user to the API provider's authorization page
   https://github.com/login/oauth/authorize?client_id=abc&scope=repo&redirect_uri=...

2. User logs in and grants permission on the provider's site

3. Provider redirects back to your app with a short-lived authorization code
   https://yourapp.com/callback?code=xyz789

4. Your server exchanges the code for an access token (server-to-server, never in the browser)
   POST https://github.com/login/oauth/access_token
   { client_id, client_secret, code }

5. Provider returns an access token (and often a refresh token)
   { access_token: "gho_abc...", token_type: "bearer", scope: "repo" }

6. Your app uses the access token as a Bearer token for API calls
   Authorization: Bearer gho_abc...
```

The key insight: the user's password never touches your application. The access token is scoped (it can only do what the user approved), and it expires. This is much safer than alternatives where you'd store user credentials.

When an OAuth access token expires, you use the refresh token to get a new access token without requiring the user to log in again:

```javascript
// Conceptual refresh token flow
async function refreshAccessToken(refreshToken) {
  const response = await fetch("https://api.example.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.OAUTH_CLIENT_ID,
      client_secret: process.env.OAUTH_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    // Refresh token itself has expired -- user must log in again
    throw new Error("Session expired -- please log in again");
  }

  const tokens = await response.json();
  return tokens.access_token;
}
```

---

## Handling 401 and 403 Responses

`401 Unauthorized` and `403 Forbidden` are different errors with different causes and different fixes.

| Status | Meaning | Common Causes | Fix |
|---|---|---|---|
| 401 | Not authenticated | Missing token, expired token, invalid API key | Re-authenticate or refresh token |
| 403 | Not authorized | Valid token, but wrong permissions | Check account tier, scope, or resource ownership |

```javascript
// A token-refreshing fetch wrapper
async function authenticatedFetch(url, options = {}, tokenStore) {
  // Try the request with the current token
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "Authorization": `Bearer ${tokenStore.accessToken}`,
    },
  });

  // If we get a 401, try refreshing the token once
  if (response.status === 401 && tokenStore.refreshToken) {
    try {
      const newToken = await refreshAccessToken(tokenStore.refreshToken);
      tokenStore.accessToken = newToken; // update the stored token

      // Retry the original request with the new token
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          "Authorization": `Bearer ${newToken}`,
        },
      });
    } catch {
      // Refresh failed -- user needs to log in
      throw new Error("Session expired -- please log in again");
    }
  }

  if (response.status === 403) {
    throw new Error("Access denied: your account lacks permission for this action");
  }

  return response;
}
```

---

## Rate Limiting

APIs limit how many requests you can make in a given time window to protect their infrastructure and ensure fair access for all callers. When you exceed the limit, you get a `429 Too Many Requests` response.

Most APIs communicate rate limit information through response headers:

```
X-RateLimit-Limit: 100        -- total requests allowed per window
X-RateLimit-Remaining: 42     -- requests remaining in current window
X-RateLimit-Reset: 1741965600 -- Unix timestamp when the window resets
Retry-After: 30               -- seconds to wait before retrying (on 429)
```

Different APIs use different header names, but the pattern is the same. Always check the documentation.

```javascript
// Read rate limit headers from any response
function getRateLimitInfo(response) {
  const limit = response.headers.get("X-RateLimit-Limit");
  const remaining = response.headers.get("X-RateLimit-Remaining");
  const reset = response.headers.get("X-RateLimit-Reset");
  const retryAfter = response.headers.get("Retry-After");

  return {
    limit: limit ? parseInt(limit) : null,
    remaining: remaining ? parseInt(remaining) : null,
    // Convert Unix timestamp to a Date object
    resetAt: reset ? new Date(parseInt(reset) * 1000) : null,
    retryAfterSeconds: retryAfter ? parseInt(retryAfter) : null,
  };
}

// Proactively avoid hitting limits
async function fetchWithRateLimitAwareness(url, options = {}) {
  const response = await fetch(url, options);
  const rateLimit = getRateLimitInfo(response);

  // Warn when running low on remaining requests
  if (rateLimit.remaining !== null && rateLimit.remaining < 10) {
    console.warn(
      `Rate limit warning: only ${rateLimit.remaining} requests remaining. ` +
      `Resets at ${rateLimit.resetAt?.toLocaleTimeString()}`
    );
  }

  return response;
}
```

---

## Implementing Retry with Exponential Backoff

When you hit a rate limit (429) or a transient server error (503, 504), the right response is to wait and retry. Exponential backoff means you wait longer with each retry, which prevents hammering an already-stressed server.

```javascript
// Retry with exponential backoff
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Success -- return immediately
      if (response.ok) {
        return response;
      }

      // Rate limited -- respect the Retry-After header if present
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const waitMs = retryAfter
          ? parseInt(retryAfter) * 1000 // server told us how long to wait
          : Math.min(1000 * Math.pow(2, attempt), 30000); // exponential backoff, max 30s

        if (attempt < maxRetries) {
          console.log(`Rate limited. Waiting ${waitMs}ms before retry ${attempt + 1}/${maxRetries}`);
          await sleep(waitMs);
          continue; // retry the loop
        }
      }

      // Transient server errors -- retry with backoff
      if (response.status === 503 || response.status === 504) {
        const waitMs = Math.min(1000 * Math.pow(2, attempt), 30000);

        if (attempt < maxRetries) {
          console.log(`Server error ${response.status}. Waiting ${waitMs}ms before retry`);
          await sleep(waitMs);
          continue;
        }
      }

      // Non-retryable error (400, 401, 403, 404, 500) -- return as-is
      return response;

    } catch (networkError) {
      // Network failure -- retry with backoff
      lastError = networkError;
      const waitMs = Math.min(1000 * Math.pow(2, attempt), 30000);

      if (attempt < maxRetries) {
        console.log(`Network error. Waiting ${waitMs}ms before retry ${attempt + 1}/${maxRetries}`);
        await sleep(waitMs);
      }
    }
  }

  // All retries exhausted
  throw lastError ?? new Error(`Request to ${url} failed after ${maxRetries} retries`);
}

// Promise-based sleep utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Usage
const response = await fetchWithRetry(
  "https://api.example.com/data",
  { headers: { "Authorization": `Bearer ${token}` } },
  3 // up to 3 retries
);
```

The backoff sequence with this code (base 1000ms, exponential, max 30s):
- Attempt 0: immediate
- Retry 1: wait 1s
- Retry 2: wait 2s
- Retry 3: wait 4s

For high-volume scripts, add jitter (a small random offset) to the wait time. This prevents a thundering herd problem where multiple clients all retry at exactly the same moment after a rate limit window resets.

```javascript
// Add jitter: wait the backoff amount plus up to 1 extra second, randomly
const jitter = Math.random() * 1000;
const waitMs = Math.min(1000 * Math.pow(2, attempt) + jitter, 30000);
```

---

## Storing Secrets Safely

API keys and tokens are secrets. They must never appear in your source code or get committed to version control.

**Use environment variables.** In Node.js:

```javascript
// Load from environment -- never hardcode values here
const apiKey = process.env.MY_SERVICE_API_KEY;
const apiSecret = process.env.MY_SERVICE_API_SECRET;

if (!apiKey) {
  throw new Error("MY_SERVICE_API_KEY environment variable is not set");
}
```

**Use a `.env` file for local development.** The `dotenv` package loads a `.env` file into `process.env`:

```
# .env (never commit this file)
MY_SERVICE_API_KEY=sk_live_abc123def456
MY_SERVICE_API_SECRET=secret_xyz789

# .gitignore must include:
# .env
# .env.local
# .env.*.local
```

**Never expose secrets to the browser.** In a web app, anything your frontend JavaScript can access is readable by any user who opens devtools. API keys with significant permissions must only be used in server-side code.

```javascript
// WRONG: this runs in the browser -- the key is exposed to all users
const response = await fetch(`https://api.example.com/data?key=${MY_SECRET_KEY}`);

// RIGHT: proxy through your own backend
// Browser calls your server
const response = await fetch("/api/external-data");
// Your server (Node.js) calls the external API with the secret key
// The browser never sees the key
```

**Use separate keys for development and production.** Most API providers let you create multiple API keys. Use a test/sandbox key in development. Use the production key only in your deployed environment, stored as an environment variable in your hosting provider's dashboard.

---

## Key Takeaways

- API keys should be sent in request headers, not query parameters. Headers are more secure because they're not logged in URLs or browser history.
- Bearer token authentication sends a token in the `Authorization: Bearer <token>` header. JWTs are a common token format.
- OAuth 2.0 lets users authorize your app to access their data on a third-party service without sharing their password. You receive access and refresh tokens.
- `401 Unauthorized` means authentication failed or is missing. `403 Forbidden` means authentication succeeded but you lack permission.
- Rate limits are enforced per time window. Check `X-RateLimit-Remaining` headers proactively. Handle `429` responses gracefully.
- Implement retry with exponential backoff for `429`, `503`, and `504` responses. Add jitter for high-volume scripts.
- API keys and tokens are secrets. Store them in environment variables only. Never commit them to source control. Never expose them to browser code.

---

## Try It Yourself

1. Sign up for a free API key at OpenWeatherMap (openweathermap.org/api). Write a function `getCurrentWeather(city)` that sends the API key as a query parameter (`appid`). Then write a second version that sends it as an `X-API-Key` header. Compare the two approaches and note any differences in how the API responds.

2. Implement a `fetchWithRetry` function that handles only `429` responses (no other retries). It should read the `Retry-After` header if present and fall back to a 2-second wait if not. Test it by calling any rate-limited API endpoint rapidly in a loop.

3. Audit your current project's environment variable usage. Check that no API keys or tokens are hardcoded anywhere in your JavaScript files. Add a `validateEnv()` function that checks for required environment variables at startup and throws a descriptive error if any are missing.

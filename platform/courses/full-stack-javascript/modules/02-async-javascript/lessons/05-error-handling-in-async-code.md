---
title: "Error Handling in Async Code"
estimatedMinutes: 35
---

# Error Handling in Async Code

Handling errors in asynchronous code is harder than in synchronous code. The call stack doesn't help you -- by the time a Promise rejects or a callback fires with an error, the original try/catch that initiated the operation is long gone. You need deliberate strategies, not just instinct.

This lesson covers the full toolkit: try/catch with async/await, .catch() with Promise chains, custom error classes for structured error information, unhandled rejection detection, retry patterns with exponential backoff, and request cancellation with AbortController.

These aren't just best practices for production apps -- they're habits that make debugging significantly faster at every stage of development.

---

## `try/catch` with Async/Await

The cleanest error handling for sequential async operations uses `try/catch` blocks inside `async` functions. When an `await`ed Promise rejects, it throws -- and `catch` intercepts it just like a synchronous throw.

```javascript
async function loadUserDashboard(userId) {
  try {
    const user = await fetchUser(userId);
    const orders = await fetchOrders(user.id);
    return { user, orders };
  } catch (err) {
    // Any failed await above lands here
    console.error("Dashboard load failed:", err.message);
    // Re-throw so the caller can also handle it if needed
    throw err;
  }
}
```

You can also use multiple `try/catch` blocks within one function when different errors deserve different responses:

```javascript
async function processPayment(orderId, paymentDetails) {
  let order;

  try {
    order = await fetchOrder(orderId);
  } catch (err) {
    // Specific handling for "order not found" vs. other fetch failures
    throw new Error(`Could not load order ${orderId}: ${err.message}`);
  }

  try {
    const charge = await chargeCard(paymentDetails);
    await updateOrderStatus(order.id, "paid");
    return charge;
  } catch (err) {
    // Payment failures get logged differently than fetch failures
    console.error("Payment failed for order", order.id, err.message);
    await updateOrderStatus(order.id, "payment_failed");
    throw err;
  }
}
```

---

## `.catch()` on Promise Chains

When working with `.then()` chains, attach `.catch()` at the end to handle any rejection in the chain.

```javascript
fetchUser(userId)
  .then((user) => fetchOrders(user.id))
  .then((orders) => renderOrders(orders))
  .catch((err) => {
    // Handles rejections from any step above
    showErrorToast(`Failed to load orders: ${err.message}`);
  });
```

You can also use `.catch()` mid-chain to recover from specific errors and continue:

```javascript
fetchUserPreferences(userId)
  .catch((err) => {
    // Preferences failed -- use defaults and continue
    console.warn("Preferences unavailable, using defaults:", err.message);
    return getDefaultPreferences();
  })
  .then((preferences) => {
    // This runs whether we got real preferences or defaults
    applyPreferences(preferences);
  });
```

If `.catch()` returns a value (not a rejected Promise), the chain resumes in the fulfilled state.

---

## Custom Error Classes

Throwing generic `Error` objects makes it hard for callers to know what kind of failure occurred. Custom error classes let you communicate the error type structurally.

```javascript
// Base class for application errors
class AppError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

// Specific error types
class NotFoundError extends AppError {
  constructor(resource, id) {
    super(`${resource} with id ${id} not found`);
    this.name = "NotFoundError";
    this.code = "NOT_FOUND";
    this.resource = resource;
    this.id = id;
  }
}

class NetworkError extends AppError {
  constructor(url, statusCode) {
    super(`Network request to ${url} failed with status ${statusCode}`);
    this.name = "NetworkError";
    this.code = "NETWORK_ERROR";
    this.url = url;
    this.statusCode = statusCode;
  }
}

class ValidationError extends AppError {
  constructor(field, reason) {
    super(`Validation failed for "${field}": ${reason}`);
    this.name = "ValidationError";
    this.code = "VALIDATION_ERROR";
    this.field = field;
  }
}
```

Now callers can distinguish between error types:

```javascript
async function loadUser(userId) {
  if (typeof userId !== "number") {
    throw new ValidationError("userId", "must be a number");
  }

  const response = await fetch(`/api/users/${userId}`);

  if (response.status === 404) {
    throw new NotFoundError("User", userId);
  }

  if (!response.ok) {
    throw new NetworkError(`/api/users/${userId}`, response.status);
  }

  return response.json();
}

// Caller can handle each type differently
async function handleUserRequest(userId) {
  try {
    const user = await loadUser(userId);
    return user;
  } catch (err) {
    if (err instanceof ValidationError) {
      return { error: "Bad request", detail: err.message, status: 400 };
    }
    if (err instanceof NotFoundError) {
      return { error: "Not found", detail: err.message, status: 404 };
    }
    if (err instanceof NetworkError) {
      return { error: "Service unavailable", detail: err.message, status: 503 };
    }
    // Unknown error -- re-throw
    throw err;
  }
}
```

---

## Unhandled Promise Rejections

A Promise that rejects with no `.catch()` handler (or no surrounding `try/catch` when awaited) is an **unhandled rejection**. In Node.js, these will eventually crash your process. In browsers, they print a warning.

```javascript
// This rejection is unhandled -- will crash Node.js or log a browser warning
async function badCode() {
  const data = await fetchData(); // if this rejects, no one catches it
  return data;
}

badCode(); // called without await and without .catch()
```

### Detecting Unhandled Rejections in Node.js

```javascript
// Attach a global handler to catch anything that slips through
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Promise rejection:", reason);
  console.error("Promise:", promise);

  // In production: log to your monitoring system before exiting
  // logger.error({ event: "unhandledRejection", reason });

  // Crash the process intentionally -- an unknown state is dangerous
  process.exit(1);
});
```

### In the Browser

```javascript
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled rejection:", event.reason);

  // Prevent the default browser console warning if you're handling it yourself
  event.preventDefault();
});
```

The global handler is a safety net, not a replacement for proper per-operation error handling. Code that relies on the global handler for normal error flow is code with missing error handling.

---

## Retry with Exponential Backoff

Network requests fail for transient reasons: a server is briefly overloaded, a DNS lookup times out, a mobile connection drops for a second. For these cases, retrying with increasing delays is often the right response.

**Exponential backoff**: each retry waits longer than the previous one (typically doubling the delay). Adding a random "jitter" prevents multiple clients from retrying at exactly the same time and overwhelming a recovering server.

```javascript
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, maxAttempts = 3) {
  const baseDelay = 500; // start with 500ms

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, options);

      // Treat non-2xx responses as errors worth retrying (e.g., 503 Service Unavailable)
      if (!response.ok && response.status >= 500) {
        throw new NetworkError(url, response.status);
      }

      return response; // success -- return immediately
    } catch (err) {
      const isLastAttempt = attempt === maxAttempts;

      if (isLastAttempt) {
        // Out of retries -- propagate the error
        throw new Error(`Request to ${url} failed after ${maxAttempts} attempts: ${err.message}`);
      }

      // Calculate delay: 500ms, 1000ms, 2000ms, ...
      const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);

      // Add up to 20% random jitter to spread out retries
      const jitter = Math.random() * exponentialDelay * 0.2;

      const waitMs = Math.round(exponentialDelay + jitter);

      console.warn(`Attempt ${attempt} failed. Retrying in ${waitMs}ms...`);
      await delay(waitMs);
    }
  }
}

// Usage
async function loadCriticalData() {
  try {
    const response = await fetchWithRetry("/api/critical-data", {}, 4);
    return response.json();
  } catch (err) {
    console.error("All retries exhausted:", err.message);
    throw err;
  }
}
```

**When to retry:** Transient server errors (5xx), network timeouts, DNS failures.

**When NOT to retry:** Client errors (4xx -- bad input, not authorized, not found), validation failures, or any error where retrying won't change the outcome.

---

## AbortController: Cancellation

Sometimes you need to cancel an in-flight request: the user navigated away, a timeout expired, a newer request superseded the old one. `AbortController` is the standard API for this.

```javascript
const controller = new AbortController();

// Pass the signal to fetch
fetch("/api/large-dataset", { signal: controller.signal })
  .then((res) => res.json())
  .then((data) => console.log("Loaded:", data.length, "items"))
  .catch((err) => {
    if (err.name === "AbortError") {
      console.log("Request was cancelled"); // expected, not a real error
    } else {
      console.error("Request failed:", err.message); // unexpected failure
    }
  });

// Cancel the request after 5 seconds
setTimeout(() => controller.abort(), 5000);
```

### Cancellation with Async/Await

```javascript
async function loadWithTimeout(url, timeoutMs) {
  const controller = new AbortController();

  // Set a timeout that aborts the request
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const data = await response.json();
    return data;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    // Always clear the timeout, even if fetch succeeded before it fired
    clearTimeout(timeoutId);
  }
}
```

### Cancelling Previous Requests in React (or any UI framework)

A common pattern: when a search input changes, cancel the previous search request before starting the new one.

```javascript
let activeController = null;

async function search(query) {
  // Cancel any in-flight request from the previous search
  if (activeController) {
    activeController.abort();
  }

  activeController = new AbortController();

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
      signal: activeController.signal,
    });
    const results = await response.json();
    displayResults(results);
  } catch (err) {
    if (err.name !== "AbortError") {
      // Don't show an error for intentional cancellations
      showError("Search failed: " + err.message);
    }
  } finally {
    activeController = null;
  }
}
```

---

## Error Handling Strategies for Production

A few principles that hold up across different codebases and team sizes:

**1. Handle errors at the right level**

Catch errors where you have enough context to do something useful. Let errors propagate up if the current level can't make a meaningful decision about them.

```javascript
// Low-level: re-throw with added context
async function fetchUser(id) {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new NetworkError(`/api/users/${id}`, res.status);
    return res.json();
  } catch (err) {
    if (err instanceof NetworkError) throw err; // already has good context
    throw new Error(`fetchUser(${id}) failed: ${err.message}`); // add context
  }
}

// High-level: catch and decide what the user sees
async function handleProfilePageLoad(userId) {
  try {
    const user = await fetchUser(userId);
    renderProfile(user);
  } catch (err) {
    if (err instanceof NotFoundError) {
      renderNotFoundPage();
    } else {
      renderErrorPage("Profile failed to load. Please try again.");
    }
  }
}
```

**2. Never silently swallow errors**

```javascript
// BAD: the error disappears
try {
  await riskyOperation();
} catch (err) {
  // empty catch -- no logging, no re-throw, nothing
}

// GOOD: at minimum, log it
try {
  await riskyOperation();
} catch (err) {
  console.error("riskyOperation failed:", err);
  // then decide: re-throw, return a fallback, or continue
}
```

**3. Use `finally` for guaranteed cleanup**

```javascript
async function withDatabaseConnection(fn) {
  const conn = await openConnection();
  try {
    return await fn(conn);
  } finally {
    // Runs whether fn succeeded, threw, or was aborted
    await conn.close();
  }
}
```

**4. Distinguish between expected and unexpected errors**

Expected errors (not found, unauthorized, invalid input) are part of normal program flow. Unexpected errors (null reference, network timeout after retries, disk full) indicate something is actually wrong. Log and handle them differently.

```javascript
async function getPost(postId) {
  const post = await fetchPost(postId);

  if (!post) {
    // Expected: return null and let the caller decide what to show
    return null;
  }

  return post;
}

// vs.

async function savePost(post) {
  try {
    await db.save(post);
  } catch (err) {
    // Unexpected: the database should be reachable. Log with full context.
    logger.error({ event: "db_save_failed", post: post.id, error: err.message, stack: err.stack });
    throw err;
  }
}
```

---

## Key Takeaways

- Use `try/catch` with async/await for sequential async operations. One block can cover multiple awaited calls.
- Use `.catch()` at the end of Promise chains, or mid-chain when you want to recover and continue.
- Custom error classes (extending `Error`) let callers handle different failure types with `instanceof` checks. Always set `.name` and a useful `.code`.
- Always attach a `process.on("unhandledRejection")` handler in Node.js as a safety net. In browsers, use `window.addEventListener("unhandledrejection")`.
- Retry with exponential backoff for transient network failures. Add jitter to prevent thundering herd. Don't retry 4xx errors.
- `AbortController` cancels in-flight `fetch` requests. Check `err.name === "AbortError"` to distinguish intentional cancellation from real failures.
- Never silently swallow errors. Use `finally` for cleanup. Handle errors at the level that has enough context to respond meaningfully.

---

## Try It Yourself

1. Write a `retry(asyncFn, maxAttempts, baseDelayMs)` utility function that takes any async function (no arguments), retries it on failure up to `maxAttempts` times, and uses exponential backoff between retries. Test it by passing a function that fails the first two times and succeeds on the third.

2. Create three custom error classes: `AuthError` (for 401/403 responses), `NotFoundError` (for 404), and `ServerError` (for 5xx). Write a `safeFetch(url)` function that wraps `fetch`, throws the appropriate custom error based on the response status, and returns parsed JSON on success. Then write a caller that handles each error type differently.

3. Build a `cancellableSearch(query, timeoutMs)` function using `AbortController` and `fetch`. It should:
   - Cancel any previous in-flight search before starting a new one
   - Also cancel automatically if `timeoutMs` elapses without a response
   - Return the results array on success
   - Return an empty array if the request was cancelled (intentional or timeout)
   - Throw only for genuine network failures

   Test it by calling it rapidly with different queries to verify old requests are properly cancelled.

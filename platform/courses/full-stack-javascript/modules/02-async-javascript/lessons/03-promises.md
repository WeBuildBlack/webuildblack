---
title: "Promises"
estimatedMinutes: 40
---

# Promises

A Promise is a JavaScript object that represents the eventual result of an asynchronous operation. It's a placeholder for a value that isn't available yet. Instead of passing a callback into a function and hoping it gets called correctly, you get an object back immediately -- one you can chain, combine, and pass around like any other value.

Promises don't make asynchronous code synchronous. They make it manageable. This lesson covers the full Promise API: creating them, chaining them, handling errors, and combining multiple Promises in parallel.

---

## Promise States

Every Promise is in exactly one of three states at any moment:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   pending  ──► fulfilled  (resolved with a value)   │
│               ▲                                     │
│   pending  ──► rejected   (failed with a reason)    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

| State | Meaning | Can transition to |
|---|---|---|
| `pending` | Operation in progress | `fulfilled` or `rejected` |
| `fulfilled` | Operation succeeded | None (terminal) |
| `rejected` | Operation failed | None (terminal) |

Once a Promise settles (either fulfilled or rejected), its state never changes. This is a key difference from callbacks, which can theoretically be called multiple times or never at all.

---

## Creating Promises

You create a Promise with the `Promise` constructor, passing an **executor function**. The executor receives two functions: `resolve` (call with the success value) and `reject` (call with the error reason).

```javascript
const myPromise = new Promise(function (resolve, reject) {
  // Do some work here -- sync or async

  const success = true;

  if (success) {
    resolve("Operation succeeded!"); // Promise moves to fulfilled
  } else {
    reject(new Error("Something went wrong")); // Promise moves to rejected
  }
});
```

Here's a practical example: wrapping `setTimeout` in a Promise to create a delay utility.

```javascript
function delay(ms) {
  return new Promise(function (resolve) {
    // After ms milliseconds, resolve the Promise with no value
    setTimeout(resolve, ms);
  });
}

// Usage
delay(1000).then(function () {
  console.log("1 second has passed");
});
```

And a fetch-like example with potential failure:

```javascript
function fetchUser(userId) {
  return new Promise(function (resolve, reject) {
    // Simulate a network request with setTimeout
    setTimeout(function () {
      if (userId <= 0) {
        reject(new Error(`Invalid userId: ${userId}`));
        return;
      }

      // Simulate a successful response
      const user = { id: userId, name: "Marcus Webb", role: "engineer" };
      resolve(user);
    }, 200);
  });
}
```

---

## `.then()`, `.catch()`, `.finally()`

These three methods are how you consume a Promise's result.

### `.then(onFulfilled, onRejected)`

`.then()` takes up to two callbacks: one for success, one for failure. In practice, most code only passes the success handler and uses `.catch()` separately for errors.

```javascript
fetchUser(1)
  .then(function (user) {
    // Runs when the Promise fulfills
    console.log("Got user:", user.name);
  });
```

### `.catch(onRejected)`

`.catch(fn)` is shorthand for `.then(undefined, fn)`. It handles rejections.

```javascript
fetchUser(-1)
  .then(function (user) {
    console.log("Got user:", user.name);
  })
  .catch(function (err) {
    // Runs when the Promise rejects
    console.error("Error:", err.message);
  });
```

### `.finally(onSettled)`

`.finally(fn)` runs whether the Promise fulfilled or rejected. Use it for cleanup: closing a loading spinner, releasing a lock, logging completion.

```javascript
showLoadingSpinner();

fetchUser(1)
  .then(function (user) {
    displayUser(user);
  })
  .catch(function (err) {
    showErrorMessage(err.message);
  })
  .finally(function () {
    // Always runs -- success or failure
    hideLoadingSpinner();
  });
```

---

## Promise Chaining

Here's where Promises become significantly more useful than callbacks. `.then()` returns a **new Promise**. If you return a value from a `.then()` handler, the next `.then()` in the chain receives that value. If you return a Promise, the chain waits for that Promise to settle before continuing.

```javascript
fetchUser(1)
  .then(function (user) {
    console.log("Step 1: got user", user.name);
    // Return a new Promise -- the chain waits for it
    return fetchOrdersForUser(user.id);
  })
  .then(function (orders) {
    console.log("Step 2: got", orders.length, "orders");
    // Return a plain value -- the next .then gets it directly
    return orders.filter((order) => order.status === "pending");
  })
  .then(function (pendingOrders) {
    console.log("Step 3: pending orders:", pendingOrders.length);
  })
  .catch(function (err) {
    // One .catch handles errors from ALL steps above
    console.error("Pipeline failed:", err.message);
  });
```

Compare that shape to the equivalent callback pyramid from the last lesson. Same sequential logic, but flat and readable from top to bottom.

One `.catch()` at the bottom handles errors from every step. If any Promise in the chain rejects, execution skips directly to `.catch()`.

---

## Error Recovery in Chains

A `.catch()` can also recover from an error and let the chain continue. If the `.catch()` handler returns a value (not a rejected Promise), the next `.then()` after it receives that value as a success.

```javascript
fetchUser(999) // This user doesn't exist -- will reject
  .catch(function (err) {
    console.warn("User not found, using default:", err.message);
    // Return a fallback value to recover and continue the chain
    return { id: 0, name: "Anonymous", role: "guest" };
  })
  .then(function (user) {
    // This runs with either the real user or the fallback
    console.log("Displaying profile for:", user.name);
  });
```

---

## Static Promise Methods

These static methods on the `Promise` object let you work with multiple Promises at once.

### `Promise.resolve()` and `Promise.reject()`

Create an already-settled Promise. Useful for testing, defaults, and converting non-Promise values into the Promise pipeline.

```javascript
// Returns a Promise that's already fulfilled with the given value
const p = Promise.resolve(42);
p.then((val) => console.log(val)); // 42

// Returns a Promise that's already rejected
const e = Promise.reject(new Error("forced failure"));
e.catch((err) => console.error(err.message));
```

### `Promise.all(iterable)` -- All or Nothing

Takes an array of Promises. Returns a new Promise that:
- **Fulfills** when all input Promises fulfill, with an array of their values in the same order.
- **Rejects** immediately if any input Promise rejects, with that rejection reason.

```javascript
const userIds = [1, 2, 3];

// Fetch all three users in parallel
Promise.all(userIds.map((id) => fetchUser(id)))
  .then(function (users) {
    // users is [user1, user2, user3] -- in the same order as the input
    console.log("All users loaded:", users.map((u) => u.name));
  })
  .catch(function (err) {
    // If ANY of the three fetches fail, this runs
    console.error("At least one fetch failed:", err.message);
  });
```

Use `Promise.all` when you need every result and one failure means the whole operation failed (like loading required resources before showing a page).

### `Promise.allSettled(iterable)` -- Wait for All, Report Each

Returns a Promise that fulfills (never rejects) when all input Promises settle, with an array of result objects describing each outcome.

```javascript
const requests = [
  fetchUser(1),    // will succeed
  fetchUser(-1),   // will fail
  fetchUser(3),    // will succeed
];

Promise.allSettled(requests).then(function (results) {
  results.forEach(function (result, index) {
    if (result.status === "fulfilled") {
      console.log(`Request ${index} succeeded:`, result.value.name);
    } else {
      console.log(`Request ${index} failed:`, result.reason.message);
    }
  });
});
```

Use `Promise.allSettled` when you want to process whatever succeeded and log whatever failed, without one failure stopping the whole thing. This is the right choice for the module project.

### `Promise.race(iterable)` -- First One Wins

Settles with the same value or reason as the first Promise to settle (whether fulfilled or rejected).

```javascript
// Implement a timeout for any Promise-based operation
function withTimeout(promise, ms) {
  const timeout = new Promise(function (_, reject) {
    setTimeout(function () {
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);
  });

  // Whichever settles first wins
  return Promise.race([promise, timeout]);
}

// fetchUser has 3 seconds to complete before we give up
withTimeout(fetchUser(1), 3000)
  .then((user) => console.log("Got user:", user.name))
  .catch((err) => console.error("Failed:", err.message));
```

### `Promise.any(iterable)` -- First Success Wins

Fulfills with the value of the first Promise that **fulfills**. Only rejects if **all** input Promises reject (with an `AggregateError`).

```javascript
// Try multiple endpoints -- use whichever responds first successfully
const endpoints = [
  fetch("https://api-primary.example.com/data"),
  fetch("https://api-backup.example.com/data"),
  fetch("https://api-fallback.example.com/data"),
];

Promise.any(endpoints)
  .then((response) => response.json())
  .then((data) => console.log("Got data from fastest available endpoint:", data))
  .catch((err) => {
    // AggregateError: all three failed
    console.error("All endpoints failed:", err.errors);
  });
```

---

## Converting Callbacks to Promises (Promisify)

When you need to work with older callback-based APIs, you can wrap them in Promises. This is called **promisifying**.

```javascript
// Manual promisify for a single function
function readFileAsync(path, encoding) {
  return new Promise(function (resolve, reject) {
    fs.readFile(path, encoding, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}
```

For Node.js error-first callbacks specifically, `util.promisify` does this automatically:

```javascript
const { promisify } = require("util");
const fs = require("fs");

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

// Now these return Promises
readFileAsync("./input.json", "utf8")
  .then((data) => JSON.parse(data))
  .then((parsed) => {
    parsed.processedAt = new Date().toISOString();
    return writeFileAsync("./output.json", JSON.stringify(parsed, null, 2));
  })
  .then(() => console.log("Done"))
  .catch((err) => console.error("Failed:", err.message));
```

Modern Node.js also ships `fs/promises`, which exports already-promisified versions of all `fs` methods:

```javascript
const fs = require("fs/promises");

// No wrapping needed -- these are already Promise-based
fs.readFile("./data.json", "utf8")
  .then((data) => console.log(data))
  .catch((err) => console.error(err.message));
```

---

## Common Promise Mistakes

**Mistake 1: Forgetting to return inside `.then()`**

```javascript
// BROKEN: the chain doesn't wait for fetchOrders
fetchUser(1).then(function (user) {
  fetchOrders(user.id); // missing return -- the Promise is abandoned
}).then(function (orders) {
  console.log(orders); // orders is undefined
});

// CORRECT: return the Promise so the chain waits for it
fetchUser(1).then(function (user) {
  return fetchOrders(user.id); // the chain waits for this
}).then(function (orders) {
  console.log(orders); // correct
});
```

**Mistake 2: Nested `.then()` instead of chaining**

```javascript
// BROKEN: re-creates the callback pyramid
fetchUser(1).then(function (user) {
  fetchOrders(user.id).then(function (orders) {
    // nested -- error handling is now fragmented
  });
});

// CORRECT: flat chain
fetchUser(1)
  .then((user) => fetchOrders(user.id))
  .then((orders) => console.log(orders));
```

**Mistake 3: Creating a new Promise unnecessarily**

```javascript
// BROKEN: "Promise constructor anti-pattern"
function getUser(id) {
  return new Promise(function (resolve, reject) {
    fetchUser(id) // fetchUser already returns a Promise
      .then((user) => resolve(user))
      .catch((err) => reject(err));
  });
}

// CORRECT: just return the existing Promise
function getUser(id) {
  return fetchUser(id);
}
```

---

## Key Takeaways

- A Promise represents a future value in one of three states: `pending`, `fulfilled`, or `rejected`. Once settled, the state never changes.
- Use `new Promise(resolve, reject)` to create a Promise from scratch. Pass an error to `reject`, a value to `resolve`.
- `.then()` handles success, `.catch()` handles failure, `.finally()` runs regardless. All return new Promises.
- Return Promises (or values) from `.then()` handlers to keep the chain flat. Forgetting `return` is the most common Promise bug.
- `Promise.all` fails fast if any Promise rejects. `Promise.allSettled` waits for everything and reports each outcome individually.
- `Promise.race` returns the first to settle; `Promise.any` returns the first to succeed.
- Use `util.promisify` or `fs/promises` to convert callback-based Node.js APIs to Promises.

---

## Try It Yourself

1. Write a `delay(ms)` function that returns a Promise resolving after `ms` milliseconds. Then use it to build a `sequence(fns, delayMs)` function that calls each function in `fns` with a `delayMs` pause between each call. Use `.then()` chaining, not async/await.

2. You have three JSON placeholder API endpoints:
   - `https://jsonplaceholder.typicode.com/users/1`
   - `https://jsonplaceholder.typicode.com/posts?userId=1`
   - `https://jsonplaceholder.typicode.com/todos?userId=1`

   Fetch all three simultaneously with `Promise.all`. Log the user's name, how many posts they have, and how many todos they have. Add a `.catch()` that logs a friendly error message if anything fails.

3. Modify your solution from exercise 2 to use `Promise.allSettled` instead of `Promise.all`. For any request that failed, log the error. For any that succeeded, log the result count. This should work even if one of the three URLs is intentionally broken.

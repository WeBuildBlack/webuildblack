---
title: "Async/Await"
estimatedMinutes: 35
---

# Async/Await

Async/await is syntax built on top of Promises. It does not introduce a new async model -- it gives you a way to write Promise-based code that reads like synchronous code. Every `async` function returns a Promise. Every `await` expression pauses that function until a Promise settles. Under the hood, it's the same event loop and the same microtask queue you've already learned about.

The reason async/await matters: sequential async operations expressed as chains of `.then()` calls get complicated quickly. Async/await flattens that into straight top-to-bottom code, which is easier to read, easier to step through in a debugger, and easier to handle errors in.

---

## The `async` Keyword

Putting `async` in front of a function declaration does two things:

1. The function always returns a Promise. If you return a plain value, it's automatically wrapped in `Promise.resolve(value)`. If you throw an error, the returned Promise rejects with that error.
2. The `await` keyword is now valid inside the function body.

```javascript
// This function returns a Promise<string>
async function greet(name) {
  return `Hello, ${name}`;
}

// Calling it gives you a Promise, not the string directly
greet("Imani").then((msg) => console.log(msg)); // Hello, Imani
```

```javascript
// async arrow function syntax
const fetchData = async (url) => {
  const response = await fetch(url);
  return response.json();
};
```

```javascript
// async method in a class or object
const api = {
  async getUser(id) {
    const response = await fetch(`/api/users/${id}`);
    return response.json();
  },
};
```

---

## The `await` Keyword

`await` pauses the execution of the enclosing `async` function until the Promise to its right settles. It then returns the fulfilled value. If the Promise rejects, it throws the rejection reason as an error (which you can catch with `try/catch`).

```javascript
async function loadUserProfile(userId) {
  // Execution pauses here until fetchUser resolves
  const user = await fetchUser(userId);

  // This line only runs after fetchUser has completed
  console.log("Loaded user:", user.name);

  // Execution pauses again until fetchOrders resolves
  const orders = await fetchOrders(user.id);

  console.log("Loaded orders:", orders.length);

  return { user, orders };
}
```

Compare this to the equivalent `.then()` chain:

```javascript
// .then() version -- same logic, harder to follow
function loadUserProfile(userId) {
  return fetchUser(userId)
    .then(function (user) {
      console.log("Loaded user:", user.name);
      return fetchOrders(user.id).then(function (orders) {
        // orders needs to be in scope with user -- requires nesting or outer variable
        console.log("Loaded orders:", orders.length);
        return { user, orders };
      });
    });
}
```

The async/await version is a direct translation that's easier to read at a glance.

---

## Error Handling with `try/catch`

When an awaited Promise rejects, it throws -- which means you can use standard `try/catch` blocks, the same as synchronous code.

```javascript
async function loadDashboard(userId) {
  try {
    const user = await fetchUser(userId);
    const orders = await fetchOrders(user.id);
    const stats = await fetchStats(user.id);

    return buildDashboard(user, orders, stats);
  } catch (err) {
    // Any of the three awaits above can throw, and this catch handles all of them
    console.error("Dashboard load failed:", err.message);
    throw err; // re-throw so the caller knows it failed
  }
}
```

This is significantly cleaner than placing `.catch()` after every step in a chain. One `try/catch` block covers the entire async sequence.

---

## Sequential vs. Parallel Execution

This is one of the most important async/await concepts to internalize. When you `await` inside a loop or write multiple consecutive `await` statements, you're running things **sequentially** -- each waits for the previous to finish before starting.

### Sequential (one at a time)

```javascript
async function loadUsersSequentially(userIds) {
  const users = [];

  for (const id of userIds) {
    // Each iteration waits for the previous fetch to complete before starting the next.
    // With 5 users and 200ms per fetch, this takes ~1000ms total.
    const user = await fetchUser(id);
    users.push(user);
  }

  return users;
}
```

This is correct but slow when the operations are independent. If you don't need the result of one to start the next, you can run them in parallel.

### Parallel (all at once)

```javascript
async function loadUsersInParallel(userIds) {
  // Start all fetches immediately -- none waits for another
  const promises = userIds.map((id) => fetchUser(id));

  // Wait for all of them to finish
  // With 5 users and 200ms per fetch, this takes ~200ms total
  const users = await Promise.all(promises);

  return users;
}
```

The key pattern: **start all Promises first, then await them together with `Promise.all`**.

### The Classic Mistake: Sequential Await When You Want Parallel

```javascript
// SLOW: these three fetches run one after another (~600ms)
async function loadDashboardSlow(userId) {
  const user = await fetchUser(userId);       // 200ms
  const orders = await fetchOrders(userId);   // 200ms (waits for user)
  const stats = await fetchStats(userId);     // 200ms (waits for orders)
  return { user, orders, stats };
}

// FAST: all three fetches run simultaneously (~200ms)
async function loadDashboardFast(userId) {
  const [user, orders, stats] = await Promise.all([
    fetchUser(userId),
    fetchOrders(userId),
    fetchStats(userId),
  ]);
  return { user, orders, stats };
}
```

The rule: if operations are **independent** (each doesn't need the result of the previous), use `Promise.all`. If operations are **dependent** (step B needs the result of step A), use sequential `await`.

---

## Returning Values from `async` Functions

Because `async` functions always return Promises, callers need to either `await` them or use `.then()`.

```javascript
async function calculate() {
  return 42;
}

// Option 1: await in an async context
async function main() {
  const result = await calculate();
  console.log(result); // 42
}

// Option 2: .then() in any context
calculate().then((result) => console.log(result)); // 42
```

You can mix and match. `async/await` and `.then()` chains are interoperable -- they're both working with Promises.

---

## Top-Level Await

In modern JavaScript (ES2022+), you can use `await` at the top level of an ES module without wrapping it in an `async` function. This is called **top-level await**.

```javascript
// In a .mjs file or a module with "type": "module" in package.json

const response = await fetch("https://api.example.com/data");
const data = await response.json();

console.log("Loaded at module startup:", data);
```

Top-level await pauses the module from finishing its initialization until the awaited value resolves. Other modules that import from this module will also wait. Use it for one-time setup operations at module load time (connecting to a database, loading config, etc.).

In Node.js scripts without ES module syntax, wrap your top-level async work in an immediately-invoked async function (IIFE):

```javascript
// CommonJS script: top-level await not available
(async function () {
  const data = await loadConfig();
  await startServer(data);
  console.log("Server running");
})();
```

---

## Rewriting `.then()` Chains as Async/Await

Let's work through a real refactor. Here's a `.then()` chain that fetches a user, their posts, and the first post's comments:

```javascript
// Original: .then() chain
function getUserPostsAndComments(userId) {
  return fetch(`/api/users/${userId}`)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((user) => {
      return fetch(`/api/posts?userId=${user.id}`)
        .then((res) => res.json())
        .then((posts) => ({ user, posts }));
    })
    .then(({ user, posts }) => {
      return fetch(`/api/comments?postId=${posts[0].id}`)
        .then((res) => res.json())
        .then((comments) => ({ user, posts, comments }));
    })
    .catch((err) => {
      console.error("Failed:", err.message);
      throw err;
    });
}
```

Refactored with async/await:

```javascript
// Refactored: async/await
async function getUserPostsAndComments(userId) {
  try {
    const userRes = await fetch(`/api/users/${userId}`);
    if (!userRes.ok) throw new Error(`HTTP ${userRes.status}`);
    const user = await userRes.json();

    const postsRes = await fetch(`/api/posts?userId=${user.id}`);
    const posts = await postsRes.json();

    const commentsRes = await fetch(`/api/comments?postId=${posts[0].id}`);
    const comments = await commentsRes.json();

    return { user, posts, comments };
  } catch (err) {
    console.error("Failed:", err.message);
    throw err;
  }
}
```

Both do exactly the same work. The async/await version reads like a synchronous sequence of steps, making it much easier to reason about.

---

## Async/Await with `Promise.allSettled`

Async/await and the static Promise methods work together naturally.

```javascript
async function loadDashboardWithPartialFailure(userId) {
  // All three requests start simultaneously
  const results = await Promise.allSettled([
    fetchUser(userId),
    fetchOrders(userId),
    fetchNotifications(userId),
  ]);

  const [userResult, ordersResult, notificationsResult] = results;

  // Process each result individually
  const user = userResult.status === "fulfilled"
    ? userResult.value
    : null;

  const orders = ordersResult.status === "fulfilled"
    ? ordersResult.value
    : [];

  const notifications = notificationsResult.status === "fulfilled"
    ? notificationsResult.value
    : [];

  // Log any failures for monitoring
  results
    .filter((r) => r.status === "rejected")
    .forEach((r) => console.warn("Partial failure:", r.reason.message));

  return { user, orders, notifications };
}
```

---

## Common Async/Await Mistakes

**Mistake 1: Forgetting `await` entirely**

```javascript
async function getUser(id) {
  const user = fetchUser(id); // MISSING await -- user is a Promise, not a user object
  console.log(user.name);     // undefined -- user is a Promise, not an object
}
```

**Mistake 2: Using `await` in a non-async function**

```javascript
// SyntaxError: await is not valid in non-async functions
function getUser(id) {
  const user = await fetchUser(id);
}
```

**Mistake 3: Unnecessary sequential awaits for independent operations**

```javascript
// Slow -- no dependency between these two calls
async function loadData() {
  const posts = await fetchPosts();      // wait 200ms
  const comments = await fetchComments(); // wait another 200ms
  return { posts, comments };            // 400ms total
}

// Fast -- run both in parallel
async function loadData() {
  const [posts, comments] = await Promise.all([fetchPosts(), fetchComments()]);
  return { posts, comments }; // 200ms total
}
```

**Mistake 4: Unhandled rejections in fire-and-forget async calls**

```javascript
// DANGEROUS: if logActivity rejects, the error is silently swallowed
async function handleRequest(req) {
  const result = await processRequest(req);
  logActivity(req, result); // no await, no .catch() -- rejection disappears
  return result;
}

// BETTER: attach a .catch() to handle the error even without awaiting
async function handleRequest(req) {
  const result = await processRequest(req);
  logActivity(req, result).catch((err) => console.error("Log failed:", err.message));
  return result;
}
```

---

## Key Takeaways

- `async` functions always return a Promise. `await` pauses the function until that Promise settles and returns the fulfilled value.
- Error handling with `try/catch` in async functions works exactly like synchronous error handling -- one block covers multiple async steps.
- Sequential `await` statements run operations one at a time. Use `Promise.all` with `await` to run independent operations in parallel.
- The most common performance mistake: writing sequential `await` for operations that have no dependency on each other.
- Async/await is syntax sugar over Promises, not a replacement. You still need `Promise.all`, `Promise.allSettled`, and `.catch()` for many patterns.
- Top-level `await` is available in ES modules. In CommonJS, wrap top-level async work in an async IIFE.
- Always handle rejections: either `await` and use `try/catch`, or attach `.catch()` to fire-and-forget calls.

---

## Try It Yourself

1. Write an `async` function `fetchWithRetry(url, maxAttempts)` that attempts to `fetch` the given URL. If the request fails, it retries up to `maxAttempts` times. Between each retry, wait 500ms using a `delay` function (write that too). Log each attempt number. If all attempts fail, throw the last error.

2. You have this sequential code. Identify which `await` calls are sequential when they could be parallel, then rewrite it to run all independent operations in parallel using `Promise.all`:

   ```javascript
   async function buildReport(teamId) {
     const team = await fetchTeam(teamId);
     const members = await fetchMembers(teamId);
     const projects = await fetchProjects(teamId);
     const budget = await fetchBudget(teamId);
     return { team, members, projects, budget };
   }
   ```

3. Convert this `.then()` chain to async/await. Preserve the error handling behavior:

   ```javascript
   function processOrder(orderId) {
     return fetchOrder(orderId)
       .then((order) => validateOrder(order))
       .then((validOrder) => chargePayment(validOrder.total))
       .then((payment) => sendConfirmationEmail(payment.orderId))
       .then(() => ({ success: true }))
       .catch((err) => ({ success: false, error: err.message }));
   }
   ```

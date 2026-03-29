---
title: "The Fetch API and HTTP Methods"
estimatedMinutes: 40
---

# The Fetch API and HTTP Methods

JavaScript's `fetch()` function is your primary tool for making HTTP requests from the browser or from Node.js (version 18+). It replaced the older, more cumbersome `XMLHttpRequest` API and has become a standard part of the web platform. Knowing `fetch()` well means you can communicate with any HTTP API from any JavaScript environment.

This lesson covers the full `fetch()` API: making GET, POST, PUT, PATCH, and DELETE requests, reading the Response object, setting headers and request bodies, building a reusable API client wrapper, and handling timeouts with `AbortController`.

---

## fetch() Basics

The simplest `fetch()` call takes a URL and returns a Promise that resolves to a `Response` object:

```javascript
// Basic GET request
const response = await fetch("https://jsonplaceholder.typicode.com/posts/1");

// The Response object is NOT the data yet -- it's metadata + a stream
console.log(response.status);     // 200
console.log(response.ok);         // true (status is 200-299)
console.log(response.statusText); // "OK"
console.log(response.url);        // "https://jsonplaceholder.typicode.com/posts/1"

// Parse the body -- this is a second async step
const post = await response.json();
console.log(post.title); // "sunt aut facere repellat..."
```

Notice the two-step process. `fetch()` resolves when the *headers* arrive, before the body has been fully downloaded. You then call a body-reading method (like `.json()`) to get the actual data. This design lets you inspect headers and decide whether to even read the body before consuming it.

---

## The Response Object

The `Response` object has several important properties and methods:

```javascript
const response = await fetch("https://jsonplaceholder.typicode.com/users");

// Status information
console.log(response.status);     // 200
console.log(response.ok);         // true for 200-299, false otherwise
console.log(response.statusText); // "OK"
console.log(response.redirected); // true if a redirect was followed

// Headers
console.log(response.headers.get("Content-Type"));  // "application/json; charset=utf-8"
console.log(response.headers.get("X-RateLimit-Remaining")); // "99" (or null)

// Body reading methods (each can only be called once per response)
const data = await response.json();   // parse as JSON
// OR
const text = await response.text();   // get as raw string
// OR
const blob = await response.blob();   // get as Blob (for images/files)
// OR
const buffer = await response.arrayBuffer(); // get as ArrayBuffer (binary data)
```

**Important:** The body can only be read once. Once you call `.json()`, `.text()`, or any other body reader, the stream is consumed. If you need to read the body twice (say, to log the raw text and also parse it), clone the response first:

```javascript
const response = await fetch("https://api.example.com/data");
const cloned = response.clone(); // clone before reading

const rawText = await response.text();
console.log("Raw response:", rawText); // log the raw string

const data = await cloned.json(); // parse the clone
```

---

## GET Requests

GET is the default method. Use it to read data without modifying anything on the server.

```javascript
// Simple GET -- no options needed
async function getPost(postId) {
  const response = await fetch(
    `https://jsonplaceholder.typicode.com/posts/${postId}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch post ${postId}: ${response.status}`);
  }

  return response.json();
}

// GET with query parameters -- build the URL manually or use URLSearchParams
async function searchPosts(userId, limit = 10) {
  // URLSearchParams safely encodes special characters in values
  const params = new URLSearchParams({
    userId: userId,
    _limit: limit,
  });

  const response = await fetch(
    `https://jsonplaceholder.typicode.com/posts?${params}`
  );

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status}`);
  }

  return response.json();
}

// Usage
const posts = await searchPosts(1, 5); // fetches /posts?userId=1&_limit=5
console.log(`Found ${posts.length} posts`);
```

---

## POST Requests

POST creates a new resource. You must set the `Content-Type` header to `application/json` and serialize your data with `JSON.stringify()`.

```javascript
async function createPost(postData) {
  const response = await fetch("https://jsonplaceholder.typicode.com/posts", {
    method: "POST",
    headers: {
      // Tell the server what format you're sending
      "Content-Type": "application/json",
      // Tell the server what format you want back
      "Accept": "application/json",
    },
    // Convert your JavaScript object to a JSON string
    body: JSON.stringify(postData),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`POST failed (${response.status}): ${errorBody}`);
  }

  // 201 Created -- the server returns the created resource with its new ID
  const created = await response.json();
  return created;
}

// Usage
const newPost = await createPost({
  title: "Getting Started with REST APIs",
  body: "APIs are the connective tissue of modern web applications...",
  userId: 1,
});

console.log("Created post ID:", newPost.id); // server-assigned ID
```

---

## PUT and PATCH Requests

Both PUT and PATCH update existing resources. The distinction matters:

- **PUT** replaces the entire resource. Any fields you omit are set to their default/empty values.
- **PATCH** updates only the fields you provide. Other fields remain unchanged.

```javascript
// PUT: replace the entire post
// If you omit "body", the server may set it to null or ""
async function replacePost(postId, postData) {
  const response = await fetch(
    `https://jsonplaceholder.typicode.com/posts/${postId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postData), // must include ALL fields
    }
  );

  if (!response.ok) {
    throw new Error(`PUT failed: ${response.status}`);
  }

  return response.json();
}

// PATCH: update only specific fields
// Other fields on the server remain untouched
async function updatePostTitle(postId, newTitle) {
  const response = await fetch(
    `https://jsonplaceholder.typicode.com/posts/${postId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }), // only send what's changing
    }
  );

  if (!response.ok) {
    throw new Error(`PATCH failed: ${response.status}`);
  }

  return response.json();
}
```

In practice, PATCH is usually the right choice for update operations. Sending the entire resource with PUT is risky if another user updated a different field between when you read the data and when you submitted your change.

---

## DELETE Requests

DELETE removes a resource. DELETE requests typically have no body and return either `200 OK` with the deleted resource, or `204 No Content` with no body.

```javascript
async function deletePost(postId) {
  const response = await fetch(
    `https://jsonplaceholder.typicode.com/posts/${postId}`,
    {
      method: "DELETE",
      // No body needed for DELETE
    }
  );

  // 204 No Content means success with no body to parse
  if (response.status === 204) {
    return { success: true };
  }

  if (!response.ok) {
    throw new Error(`DELETE failed: ${response.status}`);
  }

  // Some APIs return 200 with the deleted resource in the body
  return response.json();
}
```

---

## Request Headers

Headers let you send metadata with your request. Common uses: authentication, content negotiation, and API versioning.

```javascript
async function fetchWithAuth(url, token) {
  const response = await fetch(url, {
    headers: {
      // Bearer token authentication (JWT or API token)
      "Authorization": `Bearer ${token}`,

      // Tell server what format to respond with
      "Accept": "application/json",

      // Some APIs version via headers instead of the URL
      "API-Version": "2026-01",

      // Custom headers for tracing or feature flags
      "X-Request-ID": crypto.randomUUID(),
    },
  });

  if (response.status === 401) {
    throw new Error("Token expired or invalid -- re-authenticate");
  }

  if (!response.ok) {
    throw new Error(`Request to ${url} failed: ${response.status}`);
  }

  return response.json();
}
```

---

## Building a Reusable API Client

Repeating headers, error handling, and JSON serialization in every `fetch()` call is tedious and error-prone. A thin wrapper function solves this.

```javascript
// A reusable API client that handles the common patterns
function createApiClient(baseUrl, defaultHeaders = {}) {
  async function request(path, options = {}) {
    const url = `${baseUrl}${path}`;

    // Merge default headers with request-specific headers
    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...defaultHeaders,
      ...options.headers, // request-level headers override defaults
    };

    // Build the final fetch options
    const fetchOptions = {
      ...options,
      headers,
      // Serialize the body if it's an object
      body: options.body ? JSON.stringify(options.body) : undefined,
    };

    const response = await fetch(url, fetchOptions);

    // Handle common error cases centrally
    if (response.status === 401) {
      throw new Error("Unauthorized -- check your API credentials");
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After") ?? "unknown";
      throw new Error(`Rate limited -- retry after ${retryAfter} seconds`);
    }

    if (!response.ok) {
      // Try to get an error message from the response body
      let errorMessage;
      try {
        const errorBody = await response.json();
        errorMessage = errorBody.message ?? errorBody.error ?? response.statusText;
      } catch {
        errorMessage = response.statusText;
      }
      throw new Error(`${options.method ?? "GET"} ${path} failed (${response.status}): ${errorMessage}`);
    }

    // 204 No Content has no body to parse
    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  // Convenience methods for each HTTP verb
  return {
    get: (path, options) => request(path, { ...options, method: "GET" }),
    post: (path, body, options) => request(path, { ...options, method: "POST", body }),
    put: (path, body, options) => request(path, { ...options, method: "PUT", body }),
    patch: (path, body, options) => request(path, { ...options, method: "PATCH", body }),
    delete: (path, options) => request(path, { ...options, method: "DELETE" }),
  };
}

// Create an instance for a specific API
const api = createApiClient("https://jsonplaceholder.typicode.com");

// Now every call is clean and consistent
const posts = await api.get("/posts?_limit=5");
const created = await api.post("/posts", { title: "New Post", userId: 1, body: "Content here" });
const updated = await api.patch("/posts/1", { title: "Updated Title" });
await api.delete("/posts/1");
```

This pattern is used in virtually every production codebase. Libraries like `axios` and `ky` are essentially polished versions of this pattern with more features. But knowing how to write your own means you understand exactly what's happening and don't need a dependency for simple cases.

---

## AbortController for Timeouts

By default, `fetch()` has no timeout. A request to a slow or unresponsive server will hang indefinitely. `AbortController` gives you the ability to cancel requests.

```javascript
// Fetch with a timeout using AbortController
async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  // AbortController lets you cancel the request
  const controller = new AbortController();

  // Set a timer to abort the request after timeoutMs milliseconds
  const timeoutId = setTimeout(() => {
    controller.abort(); // triggers an AbortError in the fetch
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal, // attach the abort signal
    });

    // Request completed -- cancel the timeout timer
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
  } catch (err) {
    clearTimeout(timeoutId);

    // Distinguish between timeout and other errors
    if (err.name === "AbortError") {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }

    throw err; // re-throw other errors unchanged
  }
}

// Usage -- fail fast after 3 seconds
const data = await fetchWithTimeout(
  "https://jsonplaceholder.typicode.com/posts",
  {},
  3000
);
```

You can also use `AbortController` to cancel requests based on user actions, such as canceling an in-flight search when the user types new characters:

```javascript
let currentSearchController = null;

async function searchUsers(query) {
  // Cancel any pending search from before
  if (currentSearchController) {
    currentSearchController.abort();
  }

  currentSearchController = new AbortController();

  try {
    const params = new URLSearchParams({ q: query });
    const response = await fetch(`/api/users/search?${params}`, {
      signal: currentSearchController.signal,
    });

    return response.json();
  } catch (err) {
    if (err.name === "AbortError") {
      // This is expected when a new search starts -- not an error
      return null;
    }
    throw err;
  }
}
```

---

## Key Takeaways

- `fetch()` returns a Promise that resolves to a `Response` object when headers arrive. Call `.json()` or `.text()` on the response to read the body.
- `response.ok` is `true` for status codes 200-299. Always check it before parsing the body.
- The response body stream can only be read once. Use `response.clone()` if you need to read it twice.
- POST, PUT, and PATCH require setting `"Content-Type": "application/json"` and serializing the body with `JSON.stringify()`.
- PUT replaces a full resource. PATCH updates only the specified fields. Prefer PATCH for partial updates.
- Wrap `fetch()` in a reusable client function to centralize error handling, header management, and serialization.
- Use `AbortController` to implement timeouts and to cancel stale requests.

---

## Try It Yourself

1. Build a function called `getPosts(limit)` that fetches posts from JSONPlaceholder with a `_limit` query parameter using `URLSearchParams`. Call it with a few different limit values and log the number of results each time.

2. Implement a `createComment(postId, name, email, body)` function that POSTs to `https://jsonplaceholder.typicode.com/comments` with the correct headers and JSON body. Log the response (JSONPlaceholder will return the created comment with an ID, even though nothing is actually saved).

3. Extend the `createApiClient` function above to accept an `authToken` option in the constructor and automatically attach `Authorization: Bearer <token>` to every request. Test it by creating a client with a fake token and verifying the header appears in the request (check the Network tab in devtools).

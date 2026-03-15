---
title: "Working with REST APIs"
estimatedMinutes: 40
---

# Working with REST APIs

Knowing how to fire off a `fetch()` request is only part of the picture. Working effectively with REST APIs means understanding the design conventions that make APIs predictable, knowing how to map the operations you want to perform onto HTTP methods and URLs, and handling the pagination, filtering, and nested resource patterns you'll encounter in real-world APIs.

This lesson moves from mechanics to patterns. By the end, you'll be able to read API documentation confidently and translate any REST API's design into clean, organized JavaScript code.

---

## REST Principles

REST isn't a rigid specification. It's a set of architectural constraints. Understanding the key ones helps you reason about any REST API you encounter, even when the documentation is sparse.

**Statelessness.** Every request must contain all the information needed to understand it. The server doesn't remember anything between requests. If you need authentication, you send credentials with every request. If you need context, you include it in the URL or body. This is why you always send an `Authorization` header rather than "logging in" once and having the server remember your session.

**Uniform Interface.** Resources are identified by URLs, and you interact with them using standard HTTP methods. The same URL can support multiple operations depending on the method used.

**Resource-Based.** REST APIs expose *nouns* (users, posts, orders), not *verbs* (getUser, createPost, cancelOrder). The verb comes from the HTTP method. This is why good REST APIs have URLs like `/orders/42/cancel` rather than `/cancelOrder?id=42`.

**Representations.** A resource (a user, a product) can be represented in multiple formats. The client and server negotiate the format via `Accept` and `Content-Type` headers. In practice, almost everyone uses JSON.

---

## CRUD to HTTP Method Mapping

Every REST operation maps to a combination of an HTTP method and a URL. This table is one of the most useful things to memorize:

| Operation | HTTP Method | URL | Notes |
|---|---|---|---|
| List all resources | GET | `/users` | Returns an array |
| Get one resource | GET | `/users/42` | Returns an object |
| Create a resource | POST | `/users` | Body contains new data; returns created resource |
| Replace a resource | PUT | `/users/42` | Body must include all fields |
| Partial update | PATCH | `/users/42` | Body includes only changed fields |
| Delete a resource | DELETE | `/users/42` | Often returns 204 No Content |

```javascript
// Reading the table as code:

// GET /users -- list all users
const users = await api.get("/users");

// GET /users/42 -- get one user
const user = await api.get("/users/42");

// POST /users -- create a new user
const newUser = await api.post("/users", {
  name: "Aaliyah Johnson",
  email: "aaliyah@example.com",
  role: "member",
});

// PATCH /users/42 -- update the user's name only
const updated = await api.patch("/users/42", { name: "Aaliyah J." });

// DELETE /users/42 -- remove the user
await api.delete("/users/42");
```

---

## URL Structure and Resource Naming

Good REST URL design follows a few consistent conventions. Understanding them makes it easier to predict what URLs an API will use before you read its documentation.

**Use plural nouns for collections.**

```
/users        -- the collection of all users
/users/42     -- the specific user with ID 42
/posts        -- the collection of all posts
/posts/17     -- the specific post with ID 17
```

**Use IDs to identify specific resources.**

IDs go in the URL path, not query parameters. `/users/42` is correct REST style. `/users?id=42` is less conventional for identifying a single resource.

**Use nested paths for related resources.**

When one resource belongs to another, nest it:

```
/users/42/posts         -- all posts written by user 42
/users/42/posts/17      -- post 17 written by user 42
/posts/17/comments      -- all comments on post 17
/posts/17/comments/5    -- comment 5 on post 17
```

**Use kebab-case for multi-word resource names.**

```
/blog-posts         -- correct
/blogPosts          -- less common
/blog_posts         -- acceptable but less conventional
```

**Keep URLs lowercase.**

`/Users/42` and `/users/42` might work the same way, but consistency matters. Lowercase is the convention.

---

## Query Parameters for Filtering, Sorting, and Pagination

Query parameters go after the `?` in a URL. They don't identify a resource. They modify *how* the server returns the resource (which items to include, in what order, how many at a time).

```
/posts?userId=1           -- filter: only posts by user 1
/posts?status=published   -- filter: only published posts
/posts?sort=createdAt     -- sort by creation date
/posts?sort=-createdAt    -- sort descending (- prefix is a common convention)
/posts?limit=10&page=2    -- pagination: 10 per page, second page
/posts?q=javascript       -- full-text search
```

Here's how to build these URLs in JavaScript:

```javascript
// URLSearchParams handles encoding special characters automatically
function buildQuery(baseUrl, params) {
  const queryString = new URLSearchParams(params).toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

// Fetch with filtering and sorting
async function getPosts({ userId, status, sort, limit, page } = {}) {
  const params = {};

  // Only add params that were provided (don't send undefined values)
  if (userId !== undefined) params.userId = userId;
  if (status !== undefined) params.status = status;
  if (sort !== undefined) params.sort = sort;
  if (limit !== undefined) params._limit = limit;  // JSONPlaceholder uses _limit
  if (page !== undefined) params._page = page;      // JSONPlaceholder uses _page

  const url = buildQuery("https://jsonplaceholder.typicode.com/posts", params);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.status}`);
  }

  return response.json();
}

// Examples
const userPosts = await getPosts({ userId: 1 });
const firstPage = await getPosts({ limit: 10, page: 1 });
const latestPosts = await getPosts({ sort: "-createdAt", limit: 5 });
```

---

## Pagination Patterns

Real APIs rarely return all records in a single response. Returning thousands of records at once would be slow and expensive. APIs paginate their results, and they do it in a few different ways.

### Offset/Page Pagination

The most common pattern. You specify a page number and a page size.

```javascript
// GET /posts?page=2&limit=20
// Returns items 21-40

async function getAllPosts() {
  const allPosts = [];
  let page = 1;
  const limit = 20;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({ page, _limit: limit });
    const response = await fetch(
      `https://jsonplaceholder.typicode.com/posts?${params}`
    );
    const posts = await response.json();

    allPosts.push(...posts);

    // When a page returns fewer items than the limit, we're on the last page
    hasMore = posts.length === limit;
    page++;
  }

  return allPosts;
}
```

### Cursor-Based Pagination

More efficient for large datasets. Instead of a page number, you get a `cursor` (an opaque token) that points to your position in the result set. Send the cursor with your next request to get the next page.

```javascript
// Some APIs return pagination info in the response body
// Example response shape:
// {
//   "data": [...],
//   "pagination": {
//     "nextCursor": "eyJpZCI6IDEwMH0=",
//     "hasNextPage": true
//   }
// }

async function fetchAllWithCursor(baseUrl) {
  const allItems = [];
  let cursor = null;

  do {
    const params = new URLSearchParams({ limit: 20 });
    if (cursor) params.set("cursor", cursor);

    const response = await fetch(`${baseUrl}?${params}`);
    const result = await response.json();

    allItems.push(...result.data);
    cursor = result.pagination.nextCursor;
  } while (result.pagination.hasNextPage);

  return allItems;
}
```

### Link Header Pagination

Some APIs (like GitHub's) put pagination URLs in the `Link` response header rather than the body.

```javascript
// GitHub API response header:
// Link: <https://api.github.com/repos/owner/repo/issues?page=2>; rel="next",
//       <https://api.github.com/repos/owner/repo/issues?page=5>; rel="last"

function parseLinkHeader(linkHeader) {
  if (!linkHeader) return {};

  const links = {};
  // Each entry looks like: <url>; rel="name"
  for (const part of linkHeader.split(",")) {
    const match = part.trim().match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) {
      links[match[2]] = match[1]; // e.g., { next: "url", last: "url" }
    }
  }
  return links;
}

async function fetchGitHubIssues(repo) {
  const allIssues = [];
  let url = `https://api.github.com/repos/${repo}/issues?per_page=30`;

  while (url) {
    const response = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
    });

    const issues = await response.json();
    allIssues.push(...issues);

    // Follow the "next" link if it exists
    const links = parseLinkHeader(response.headers.get("Link"));
    url = links.next ?? null; // null stops the loop
  }

  return allIssues;
}
```

---

## JSONPlaceholder API Exercises

JSONPlaceholder is the perfect sandbox for practicing REST patterns. It supports all HTTP methods and returns realistic fake data.

```
Base URL: https://jsonplaceholder.typicode.com

Resources:
/posts      -- 100 posts
/comments   -- 500 comments
/albums     -- 100 albums
/photos     -- 5000 photos
/todos      -- 200 todos
/users      -- 10 users

Relationships:
Each post has a userId
Each comment has a postId
Each album has a userId
Each photo has an albumId
Each todo has a userId
```

Let's practice the common patterns:

```javascript
// Exercise 1: Get all todos for a specific user
async function getUserTodos(userId) {
  const params = new URLSearchParams({ userId });
  const response = await fetch(
    `https://jsonplaceholder.typicode.com/todos?${params}`
  );
  return response.json();
}

// Exercise 2: Get all comments on a specific post
async function getPostComments(postId) {
  // Two equivalent approaches:

  // Approach A: query parameter
  const response1 = await fetch(
    `https://jsonplaceholder.typicode.com/comments?postId=${postId}`
  );

  // Approach B: nested resource URL
  const response2 = await fetch(
    `https://jsonplaceholder.typicode.com/posts/${postId}/comments`
  );

  // Both return the same data
  return response1.json();
}

// Exercise 3: Get a user and their posts in parallel
async function getUserWithPosts(userId) {
  // Promise.all fires both requests simultaneously instead of sequentially
  const [user, posts] = await Promise.all([
    fetch(`https://jsonplaceholder.typicode.com/users/${userId}`).then(r => r.json()),
    fetch(`https://jsonplaceholder.typicode.com/posts?userId=${userId}`).then(r => r.json()),
  ]);

  return { ...user, posts };
}
```

---

## Working with Nested Resources

Nested resource URLs appear in any API that models relationships between entities. A few patterns to know:

```javascript
// Create a comment on a specific post
async function addComment(postId, commentData) {
  const response = await fetch(
    `https://jsonplaceholder.typicode.com/posts/${postId}/comments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(commentData),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to add comment: ${response.status}`);
  }

  return response.json(); // returns the created comment with its ID
}

// Update a specific comment (by comment ID, not by post ID)
// Once a resource exists, operate on it by its own ID
async function updateComment(commentId, updates) {
  const response = await fetch(
    `https://jsonplaceholder.typicode.com/comments/${commentId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }
  );

  return response.json();
}
```

A useful rule: when *listing or creating*, use the nested URL (`/posts/17/comments`). When *reading, updating, or deleting* a resource you already have an ID for, use the flat URL (`/comments/5`). Both are valid REST, and most APIs support both patterns.

---

## Error Handling Patterns

Production-grade API code handles errors at every level: network failures, HTTP errors, and application-level errors buried in the response body.

```javascript
// A complete error-handling pattern for REST API calls
async function apiCall(url, options = {}) {
  let response;

  // Network-level errors (no internet, DNS failure, server unreachable)
  try {
    response = await fetch(url, options);
  } catch (networkError) {
    throw new Error(`Network error calling ${url}: ${networkError.message}`);
  }

  // HTTP-level errors (4xx, 5xx)
  if (!response.ok) {
    // Try to extract error details from the response body
    let errorDetails = {};
    try {
      errorDetails = await response.json();
    } catch {
      // Body wasn't JSON -- that's fine, we'll use the status text
    }

    const message = errorDetails.message
      ?? errorDetails.error
      ?? response.statusText;

    const error = new Error(`${response.status}: ${message}`);
    error.status = response.status;        // attach status for callers to check
    error.details = errorDetails;          // attach full error body
    throw error;
  }

  // 204 No Content -- successful but no body
  if (response.status === 204) {
    return null;
  }

  // Application-level: parse the body
  return response.json();
}

// Callers can check the error type
try {
  const user = await apiCall("https://api.example.com/users/999");
} catch (err) {
  if (err.status === 404) {
    console.log("User not found -- show empty state");
  } else if (err.status === 401) {
    console.log("Not authenticated -- redirect to login");
  } else {
    console.error("Unexpected error:", err.message);
  }
}
```

---

## Key Takeaways

- REST APIs expose resources (nouns) at URLs, and you operate on them with HTTP methods (verbs).
- The CRUD-to-HTTP mapping: GET reads, POST creates, PUT replaces, PATCH updates partially, DELETE removes.
- Use plural nouns in URLs (`/users`), IDs to identify specific resources (`/users/42`), and nested paths for relationships (`/users/42/posts`).
- Query parameters handle filtering, sorting, and pagination. They modify what gets returned, not what resource is identified.
- APIs paginate large collections. Know the three patterns: offset/page, cursor-based, and Link header pagination.
- `Promise.all()` lets you fire independent API calls in parallel, which can dramatically reduce total load time.
- Handle errors at three levels: network failures, HTTP status codes, and application-level errors in the response body.

---

## Try It Yourself

1. Using JSONPlaceholder, write an `async` function `getFullPost(postId)` that fetches a post and its comments in parallel using `Promise.all`. Return an object with the post data and a `comments` array merged together.

2. Implement a `paginate(url, limit)` function that fetches all pages of a JSONPlaceholder resource (using the `_limit` and `_page` query parameters) and returns the full combined array. Test it on `/todos` with a limit of 20.

3. Write a function `searchTodos(userId, completed)` that builds a query string from the provided filters (omitting any that are `undefined`) and fetches matching todos from JSONPlaceholder. Test it with just a `userId`, just a `completed` value, and both together.

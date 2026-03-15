---
title: "What Are APIs?"
estimatedMinutes: 30
---

# What Are APIs?

You've built web pages, written JavaScript, and made things respond to user actions. Now it's time to connect your applications to the outside world. APIs (Application Programming Interfaces) are how your code talks to other software systems: weather services, payment processors, databases, social platforms, and your own backend. Understanding APIs is one of the most practical skills you can develop as a full-stack developer. Nearly every feature in a modern web app depends on one.

This lesson covers what APIs are, how HTTP requests and responses are structured, what status codes mean, and why APIs are central to full-stack development. By the end, you'll have a clear mental model of what actually happens when your browser fetches data from a server.

---

## The Restaurant Analogy

Before the technical details, here's a way to make the concept concrete.

Imagine you're at a restaurant. You (the client) want food. The kitchen (the server) has the food. But you don't walk into the kitchen yourself. You work through a waiter (the API). You tell the waiter what you want (the request), the waiter communicates that to the kitchen, and brings back your food (the response). The waiter also enforces rules: you can only order things on the menu, and there are specific ways to place an order.

APIs work the same way. Your application sends a structured request to a server. The server processes that request and sends back a structured response. You don't need to know anything about how the server's database is organized or how its code works. You just need to know the API's rules: what requests are valid and what responses look like.

The key word in "Application Programming Interface" is *interface*. An interface defines a contract. As long as both sides honor the contract, either side can change its internal implementation without breaking the other.

---

## What Is REST?

Most web APIs you'll work with are REST APIs. REST stands for Representational State Transfer. It's not a protocol or a formal standard. It's an architectural style: a set of constraints that, when followed, produce APIs that are predictable, scalable, and easy to use.

The core idea: you interact with *resources* (users, products, orders, posts) using standard HTTP methods. Each resource has a URL. The URL identifies what you're working with. The HTTP method specifies what you want to do with it.

```
Resource:  a user with ID 42
URL:       https://api.example.com/users/42
Methods:   GET (read), PUT (update), DELETE (remove)
```

REST APIs use the web's existing infrastructure. HTTP, URLs, and status codes are all you need. This is why REST became the dominant style for web APIs. Developers already understood HTTP. REST just applied HTTP's existing semantics to application data.

---

## HTTP Request Anatomy

Every HTTP request has four components: the method, the URL, the headers, and (optionally) the body.

```
┌─────────────────────────────────────────────────────────────┐
│ HTTP REQUEST                                                 │
├─────────────────────────────────────────────────────────────┤
│ METHOD   GET                                                 │
│ URL      https://api.example.com/users/42                   │
│ HEADERS  Accept: application/json                           │
│          Authorization: Bearer abc123token                  │
│          Content-Type: application/json                     │
├─────────────────────────────────────────────────────────────┤
│ BODY     (empty for GET requests)                           │
│          {"name": "Jordan"} for POST/PUT requests            │
└─────────────────────────────────────────────────────────────┘
```

**The Method** tells the server what operation you want to perform. The five most common methods are:

| Method | Purpose | Typical Body? |
|--------|---------|---------------|
| GET | Read a resource | No |
| POST | Create a new resource | Yes |
| PUT | Replace a resource entirely | Yes |
| PATCH | Update part of a resource | Yes |
| DELETE | Remove a resource | Rarely |

**The URL** identifies the resource you're working with. URLs have structure:

```
https://api.example.com/v1/users/42/posts?limit=10&page=2
│       │               │  │     │  │     │
│       │               │  │     │  │     └── Query parameters
│       │               │  │     │  └──────── Sub-resource (posts by user 42)
│       │               │  │     └─────────── Resource ID
│       │               │  └───────────────── Resource type
│       │               └────────────────────── API version prefix
│       └────────────────────────────────────── Domain
└────────────────────────────────────────────── Protocol
```

**The Headers** are key-value pairs that carry metadata about the request. Common headers include:

```javascript
// Tell the server what response format you can accept
"Accept": "application/json"

// Tell the server what format your request body is in
"Content-Type": "application/json"

// Send credentials to authenticate yourself
"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

// Custom headers (often prefixed with X-)
"X-API-Key": "your-api-key-here"
```

**The Body** carries data you're sending to the server. GET and DELETE requests have no body. POST, PUT, and PATCH requests typically include a body with the data you're creating or modifying.

---

## HTTP Response Anatomy

The server's response mirrors the request structure: a status code, headers, and a body.

```
┌─────────────────────────────────────────────────────────────┐
│ HTTP RESPONSE                                                │
├─────────────────────────────────────────────────────────────┤
│ STATUS   200 OK                                             │
├─────────────────────────────────────────────────────────────┤
│ HEADERS  Content-Type: application/json                     │
│          Content-Length: 156                                │
│          X-RateLimit-Remaining: 94                          │
├─────────────────────────────────────────────────────────────┤
│ BODY     {                                                  │
│            "id": 42,                                        │
│            "name": "Jordan Williams",                       │
│            "email": "jordan@example.com",                   │
│            "createdAt": "2026-01-15T10:30:00Z"              │
│          }                                                  │
└─────────────────────────────────────────────────────────────┘
```

The **status code** is a three-digit number that tells you immediately whether your request succeeded or failed, and why. Always check the status code before trying to use the response body.

---

## HTTP Status Code Families

Status codes are grouped into five families by their first digit. Learn the families and you'll understand any status code you encounter, even unfamiliar ones.

### 1xx: Informational

Rarely seen in day-to-day API work. The server is telling you it received the request and is still processing it.

```
100 Continue           -- Server got headers, client can send body
101 Switching Protocols -- Server is switching protocols (e.g., to WebSockets)
```

### 2xx: Success

The request was received, understood, and processed successfully.

```
200 OK              -- Standard success (GET, PUT, PATCH)
201 Created         -- Resource was created successfully (POST)
204 No Content      -- Success, but no body to return (DELETE)
206 Partial Content -- Streaming or range request succeeded
```

### 3xx: Redirection

The client needs to take additional action, usually following a redirect to a new URL.

```
301 Moved Permanently -- Resource has a new permanent URL
302 Found             -- Temporary redirect
304 Not Modified      -- Your cached version is still valid
```

### 4xx: Client Errors

Something was wrong with your request. These are yours to fix.

```
400 Bad Request         -- Malformed syntax or invalid parameters
401 Unauthorized        -- Authentication required or credentials invalid
403 Forbidden           -- Authenticated but not permitted
404 Not Found           -- Resource doesn't exist at this URL
405 Method Not Allowed  -- This HTTP method isn't supported here
409 Conflict            -- Request conflicts with current server state
422 Unprocessable       -- Validation errors on submitted data
429 Too Many Requests   -- Rate limit exceeded
```

### 5xx: Server Errors

Something went wrong on the server's side. Not your fault to fix (unless you wrote the server).

```
500 Internal Server Error -- Generic server failure
502 Bad Gateway           -- Upstream server returned a bad response
503 Service Unavailable   -- Server is overloaded or down for maintenance
504 Gateway Timeout       -- Upstream server didn't respond in time
```

Here's how status code checking looks in practice:

```javascript
async function fetchUser(userId) {
  const response = await fetch(`https://api.example.com/users/${userId}`);

  // Handle specific error cases with clear messages
  if (response.status === 404) {
    throw new Error(`User ${userId} not found`);
  }

  if (response.status === 401) {
    throw new Error("Authentication required -- check your API key");
  }

  if (response.status === 429) {
    throw new Error("Rate limit hit -- slow down requests");
  }

  // response.ok is true for any 2xx status code
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  // Safe to parse the body now
  const user = await response.json();
  return user;
}
```

---

## Why APIs Matter for Full-Stack Development

Even if you're building a full-stack app where you control both the frontend and backend, the browser and server are separate processes communicating over HTTP. The API you design for your own app follows the same principles as any public API.

Beyond your own backend, APIs let you integrate capabilities that would take months to build yourself:

| Capability | API Provider | What You'd Build Without It |
|---|---|---|
| Payments | Stripe, Square | PCI-compliant card processing, fraud detection |
| Auth | Auth0, Clerk | Login, OAuth, MFA, session management |
| Email | SendGrid, Postmark | Deliverability, bounce tracking, templates |
| Maps | Google Maps, Mapbox | Geocoding, routing, map tile rendering |
| AI | OpenAI, Anthropic | Large language model infrastructure |
| SMS | Twilio | Carrier integrations, number provisioning |

Every one of these is an API. Your job as a developer is to make HTTP requests, interpret responses, and handle errors gracefully. The providers handle the hard parts.

---

## The Request/Response Cycle

Here's what actually happens between when your code calls `fetch()` and when you get data back:

```
Your App                  Network                  API Server
   │                         │                         │
   │── fetch(url) ──────────>│                         │
   │                         │── HTTP request ────────>│
   │                         │                         │── Parse request
   │                         │                         │── Authenticate caller
   │                         │                         │── Query database
   │                         │                         │── Build response body
   │                         │<── HTTP response ───────│
   │<── Promise resolves ────│                         │
   │── response.json() ─────>│ (parse body locally)    │
   │<── JavaScript object ───│                         │
```

The round trip typically takes 50-500ms depending on server location and network conditions. That's why you always use `async/await` (or Promises) when working with APIs. The response doesn't arrive instantly. Your code must wait for it without blocking the rest of the program.

---

## A Real API Request in Practice

JSONPlaceholder (jsonplaceholder.typicode.com) is a free public API built specifically for testing and prototyping. No sign-up required.

```javascript
// Fetch a single post by ID
// JSONPlaceholder returns fake but realistic data
const response = await fetch("https://jsonplaceholder.typicode.com/posts/1");

// Check the status before touching the body
if (!response.ok) {
  console.error(`Failed to fetch post: ${response.status}`);
  return;
}

// Parse the JSON response body into a JavaScript object
const post = await response.json();

// The response looks like:
// {
//   "userId": 1,
//   "id": 1,
//   "title": "sunt aut facere repellat provident occaecati...",
//   "body": "quia et suscipit..."
// }
console.log("Post title:", post.title);
console.log("Author user ID:", post.userId);
```

You can run this in your browser's developer console right now. Open the console on any page, paste the code, and see a real API response. Notice that:

1. The URL identifies the resource (post with ID 1)
2. No method specified means GET (the default)
3. The response body is JSON
4. The data is an object with a consistent, predictable structure

---

## Key Takeaways

- APIs are contracts between clients and servers. They define what requests are valid and what responses will look like.
- REST APIs use HTTP methods (GET, POST, PUT, PATCH, DELETE) to perform operations on resources identified by URLs.
- Every HTTP request has a method, URL, headers, and an optional body.
- Every HTTP response has a status code, headers, and a body.
- Status code families: 2xx success, 3xx redirect, 4xx client error, 5xx server error.
- Always check the status code before parsing a response body.
- APIs let you integrate external capabilities without building them from scratch.

---

## Try It Yourself

1. Open your browser's developer tools, go to the Network tab, and reload any webpage. Click on one of the requests. Find the request method, status code, and `Content-Type` response header. Everything you just learned about request/response anatomy is visible right there for every single request your browser makes.

2. Open the browser console and run:
   ```javascript
   const res = await fetch("https://jsonplaceholder.typicode.com/users/1");
   console.log("Status:", res.status);
   console.log("OK:", res.ok);
   const user = await res.json();
   console.log("User:", user);
   ```
   Then change the URL to `/users/999` (a user that doesn't exist) and observe the status code difference.

3. Pick one real public API from this list and spend 10 minutes reading its documentation: OpenWeatherMap, GitHub REST API, or The Movie Database (TMDB) API. Find three things: the base URL, what authentication method it uses, and what one specific endpoint returns.

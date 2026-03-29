---
title: "Building a Server with Express"
estimatedMinutes: 35
---

# Building a Server with Express

Node's built-in `http` module can create a web server, but handling routes, parsing request bodies, and sending structured responses with raw `http` code is tedious. Express is a minimal web framework that wraps Node's `http` module and gives you a clean, expressive API for building web servers and REST APIs. It is the most widely used Node.js framework, with decades of community support and documentation. This lesson covers everything you need to go from zero to a working server.

---

## Why Express

Before looking at Express, here is what a simple server looks like with Node's raw `http` module:

```javascript
// Raw Node.js HTTP server
import http from 'http';

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/posts') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ posts: [] }));
  } else if (req.method === 'POST' && req.url === '/api/posts') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const data = JSON.parse(body);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(3000);
```

That is already messy for just two routes. With Express, the same logic becomes:

```javascript
import express from 'express';

const app = express();
app.use(express.json()); // parse JSON bodies automatically

app.get('/api/posts', (req, res) => {
  res.json({ posts: [] });
});

app.post('/api/posts', (req, res) => {
  res.status(201).json(req.body);
});

app.listen(3000);
```

Express handles body parsing, content-type headers, routing, and much more -- so you can focus on your application logic.

---

## Setting Up a Project

Start with a fresh project:

```bash
mkdir blog-api
cd blog-api
npm init -y
```

Edit `package.json` to add `"type": "module"` and a dev script:

```json
{
  "name": "blog-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  }
}
```

Install dependencies:

```bash
npm install express
npm install --save-dev nodemon
```

Create the entry file:

```bash
mkdir src
```

---

## Hello World

```javascript
// src/index.js
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Define a route: GET /
app.get('/', (req, res) => {
  res.send('Hello from Express!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
```

Run it:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser. You should see "Hello from Express!".

`app.get(path, handler)` registers a route. The handler receives two arguments: `req` (the incoming request) and `res` (the response you send back). This handler pattern appears in every Express application you will ever write.

---

## The `req` Object

`req` represents the incoming HTTP request. It carries everything the client sent.

```javascript
app.get('/demo', (req, res) => {
  console.log(req.method);       // 'GET'
  console.log(req.url);          // '/demo?sort=desc'
  console.log(req.path);         // '/demo'
  console.log(req.headers);      // { 'content-type': 'application/json', ... }
  console.log(req.ip);           // '::1' (localhost) or client IP
});

// Route parameters -- accessed via req.params
app.get('/users/:userId/posts/:postId', (req, res) => {
  console.log(req.params);
  // { userId: '42', postId: '7' }
});

// Query strings -- accessed via req.query
// GET /search?q=javascript&page=2&limit=10
app.get('/search', (req, res) => {
  console.log(req.query);
  // { q: 'javascript', page: '2', limit: '10' }
  // Note: all query values are strings -- parse numbers yourself
  const page = parseInt(req.query.page) || 1;
});

// Request body -- accessed via req.body
// Requires express.json() middleware (covered below)
app.post('/users', (req, res) => {
  console.log(req.body);
  // { name: 'Devin', email: 'devin@example.com' }
});
```

---

## The `res` Object

`res` is your tool for sending a response back to the client.

```javascript
app.get('/examples', (req, res) => {
  // Send plain text
  res.send('Hello');

  // Send JSON (sets Content-Type: application/json automatically)
  res.json({ message: 'Hello' });

  // Set a status code, then send
  res.status(201).json({ id: 1, message: 'Created' });
  res.status(404).json({ error: 'Not found' });
  res.status(400).json({ error: 'Bad request', details: 'Missing title field' });

  // Send a file
  res.sendFile('/absolute/path/to/file.pdf');

  // Redirect
  res.redirect('/new-path');
  res.redirect(301, '/permanent-new-path');

  // Set custom headers before sending
  res.set('X-Request-Id', 'abc-123');
  res.json({ ok: true });

  // End the response with no body (204 No Content)
  res.status(204).end();
});
```

One important rule: **you can only send one response per request.** Calling `res.json()` after `res.send()` will throw an error. A common mistake:

```javascript
// WRONG -- sends two responses
app.get('/bad', (req, res) => {
  if (!req.query.id) {
    res.status(400).json({ error: 'Missing id' });
    // Missing 'return' -- code continues executing!
  }
  res.json({ id: req.query.id });
});

// CORRECT -- use return to stop execution
app.get('/good', (req, res) => {
  if (!req.query.id) {
    return res.status(400).json({ error: 'Missing id' });
  }
  res.json({ id: req.query.id });
});
```

Get into the habit of using `return` before every early `res.json()` call.

---

## Route Parameters

Route parameters are named segments of the URL path, prefixed with `:`. They let you capture dynamic values from the URL.

```javascript
// :id matches any string in that position
app.get('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  // req.params.id is always a string
  const postId = parseInt(id);

  if (isNaN(postId)) {
    return res.status(400).json({ error: 'Invalid post ID' });
  }

  res.json({ postId, message: `Fetching post ${postId}` });
});

// Multiple parameters
app.get('/api/posts/:postId/comments/:commentId', (req, res) => {
  const { postId, commentId } = req.params;
  res.json({ postId, commentId });
});

// Optional segments with ?
app.get('/api/posts/:id/:format?', (req, res) => {
  const { id, format = 'json' } = req.params;
  res.json({ id, format });
});
```

---

## Query Strings

Query strings come after the `?` in a URL. Express parses them automatically into `req.query`.

```javascript
// GET /api/posts?page=2&limit=10&sort=createdAt&order=desc
app.get('/api/posts', (req, res) => {
  const {
    page = '1',
    limit = '10',
    sort = 'createdAt',
    order = 'desc',
  } = req.query;

  // All query values are strings -- convert as needed
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  res.json({
    page: pageNum,
    limit: limitNum,
    sort,
    order,
    message: 'Returning paginated posts',
  });
});
```

Query strings are ideal for filtering, sorting, pagination, and search -- things that are optional and modify how a resource is returned, not which resource you are targeting.

---

## Parsing Request Bodies

By default, Express does not parse incoming request bodies. You have to add middleware to enable this. Express ships with two built-in body parsers:

```javascript
import express from 'express';

const app = express();

// Parse JSON bodies: Content-Type: application/json
app.use(express.json());

// Parse URL-encoded bodies: Content-Type: application/x-www-form-urlencoded
// (what HTML forms send by default)
app.use(express.urlencoded({ extended: true }));
```

Call `app.use()` with these middleware functions **before** defining your routes. Once added, `req.body` is automatically populated for POST, PUT, and PATCH requests.

```javascript
app.post('/api/posts', (req, res) => {
  const { title, body, author } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'title and body are required' });
  }

  // Create the post...
  res.status(201).json({ id: 1, title, body, author });
});
```

---

## nodemon: Auto-Restarting During Development

Stopping and restarting your server every time you change a file gets old fast. nodemon watches your files and restarts the server automatically.

Install it as a dev dependency:

```bash
npm install --save-dev nodemon
```

Add a dev script to `package.json`:

```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  }
}
```

Run it:

```bash
npm run dev
```

Now every time you save a `.js` file, nodemon restarts the server within a second. You can configure it with a `nodemon.json` file or a `nodemon` key in `package.json`:

```json
{
  "nodemon": {
    "watch": ["src"],
    "ext": "js,json",
    "ignore": ["node_modules"]
  }
}
```

---

## Separating `app.js` from `index.js`

As your application grows, it is a good idea to keep the Express app configuration separate from the server startup code. This makes the app easier to test.

```javascript
// src/app.js
import express from 'express';

const app = express();

// Middleware
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Blog API is running' });
});

app.get('/api/posts', (req, res) => {
  res.json({ posts: [] });
});

// Export the app -- index.js will call app.listen()
export default app;
```

```javascript
// src/index.js
import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
```

`app.js` exports a configured Express instance. `index.js` imports it and starts listening. Your test files can import `app` directly without starting the server.

---

## A Complete Working Example

Here is a small server with a few routes to see everything together:

```javascript
// src/app.js
import express from 'express';

const app = express();
app.use(express.json());

// In-memory posts array (Module 6 project will use a Map)
const posts = [
  { id: 1, title: 'Hello World', body: 'My first post', author: 'Devin' },
  { id: 2, title: 'Node.js Rocks', body: 'Building APIs is fun', author: 'Alex' },
];

// GET all posts
app.get('/api/posts', (req, res) => {
  res.json({ posts });
});

// GET a single post by ID
app.get('/api/posts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const post = posts.find(p => p.id === id);

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  res.json({ post });
});

// POST a new post
app.post('/api/posts', (req, res) => {
  const { title, body, author } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'title and body are required' });
  }

  const newPost = {
    id: posts.length + 1,
    title,
    body,
    author: author || 'Anonymous',
  };

  posts.push(newPost);
  res.status(201).json({ post: newPost });
});

export default app;
```

Test these routes with `curl` in another terminal:

```bash
# Get all posts
curl http://localhost:3000/api/posts

# Get a single post
curl http://localhost:3000/api/posts/1

# Create a post
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"title": "New Post", "body": "Some content", "author": "Me"}'

# Try a post that does not exist
curl http://localhost:3000/api/posts/99
```

---

## Key Takeaways

- Express wraps Node's `http` module with a clean routing and middleware API. Install it with `npm install express`.
- `app.get()`, `app.post()`, `app.put()`, `app.delete()` register route handlers. Each handler receives `req` and `res`.
- `req.params` holds URL route parameters (`:id`), `req.query` holds query string values, and `req.body` holds the parsed request body.
- `res.json()` sends JSON with the correct Content-Type header. Chain `res.status(code).json(data)` to set the HTTP status code.
- Always use `return` before early `res.json()` calls to prevent sending multiple responses.
- `express.json()` must be added with `app.use()` before your routes to enable JSON body parsing.
- Separate `app.js` (Express configuration) from `index.js` (server startup) to make testing easier.
- Use nodemon in development (`npm run dev`) so the server restarts automatically on file changes.

---

## Try It Yourself

**Exercise 1: Basic Routes**
Create a new Express server with three routes: `GET /` returns a JSON welcome message, `GET /api/health` returns `{ status: 'ok', timestamp: <current ISO string> }`, and `GET /api/echo` returns whatever query parameters were sent (i.e., `GET /api/echo?name=Devin&city=Brooklyn` returns `{ name: 'Devin', city: 'Brooklyn' }`).

**Exercise 2: CRUD for a Resource**
Build a simple in-memory contacts API. Store contacts in an array. Implement `GET /api/contacts` (list all), `GET /api/contacts/:id` (get one, 404 if not found), `POST /api/contacts` (create, require `name` and `email`), and `DELETE /api/contacts/:id` (remove, 404 if not found). Test each route with curl.

**Exercise 3: Query Filtering**
Add a `GET /api/contacts/search` route that accepts a `?name=` query parameter and returns all contacts whose name contains that string (case-insensitive). If no query is provided, return all contacts. Test with several names.

---
title: "Full-Stack Architecture"
estimatedMinutes: 35
---

# Full-Stack Architecture

You have built a REST API with Express and PostgreSQL. You have built interactive UIs with React. Now you will connect them. This lesson is about stepping back and understanding the full picture: how a React component's button click eventually results in a row being written to a PostgreSQL database, and how that data finds its way back to the screen. Understanding this flow end-to-end is what separates a developer who can follow tutorials from one who can build and debug real applications.

---

## The Three-Tier Architecture

Most web applications follow a three-tier architecture. Each tier has a single responsibility:

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Tier 1)                      │
│           React app running in the browser              │
│  Renders UI, handles user interactions, fetches data    │
└───────────────────────────┬─────────────────────────────┘
                            │  HTTP requests (JSON)
                            │  over the network
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    SERVER (Tier 2)                      │
│           Express API running on Node.js                │
│  Validates requests, runs business logic, queries DB    │
└───────────────────────────┬─────────────────────────────┘
                            │  SQL queries
                            │  over a local connection
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  DATABASE (Tier 3)                      │
│           PostgreSQL storing persistent data            │
│  Stores, retrieves, and enforces data integrity         │
└─────────────────────────────────────────────────────────┘
```

Each tier communicates only with the tier directly adjacent to it. The client never talks directly to the database. The database does not know React exists. This separation is intentional: it means you can change your database from PostgreSQL to something else without touching your React code, or you can rewrite your frontend without changing your API.

---

## How a Request Travels Through the Stack

Here is the complete journey for a user clicking "Load Posts" on your blog app:

**1. The user triggers an event in React.**

```jsx
// PostList.jsx
function PostList() {
  const [posts, setPosts] = useState([]);

  async function loadPosts() {
    // Step 1: React calls fetch() -- an HTTP GET request leaves the browser
    const response = await fetch('http://localhost:3001/api/posts');
    const data = await response.json();
    setPosts(data.posts);
  }

  useEffect(() => {
    loadPosts();
  }, []);

  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
}
```

**2. The HTTP request arrives at Express.**

```javascript
// server/src/routes/posts.js
router.get('/', asyncHandler(async (req, res) => {
  // Step 2: Express receives GET /api/posts
  // Step 3: Express queries PostgreSQL
  const result = await query(
    'SELECT * FROM posts ORDER BY created_at DESC LIMIT 20'
  );
  // Step 4: Express sends the rows back as JSON
  res.json({ posts: result.rows });
}));
```

**3. PostgreSQL executes the SQL and returns rows.**

**4. Express serializes the rows to JSON and responds.**

**5. React receives the JSON, updates state, and re-renders.**

That entire round trip, in production, typically takes 50-200 milliseconds. During that time the user needs feedback. This is why loading states matter, and you will build them in the next lesson.

---

## The Monorepo Structure

For this module's project, you will organize the client and server as two separate applications inside a single repository. This is called a monorepo.

```
blog-fullstack/
├── client/                  # React app (Vite)
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── api/             # Functions that call the Express API
│   ├── .env                 # VITE_API_URL=http://localhost:3001
│   ├── vite.config.js
│   └── package.json
│
├── server/                  # Express + PostgreSQL API
│   ├── src/
│   │   ├── index.js
│   │   ├── app.js
│   │   ├── routes/
│   │   │   ├── posts.js
│   │   │   └── comments.js
│   │   └── lib/
│   │       └── db.js
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   ├── .env                 # DATABASE_URL, PORT
│   └── package.json
│
├── package.json             # Root: "dev" script using concurrently
└── .gitignore
```

Each folder is its own Node.js project with its own `package.json` and `node_modules`. The root `package.json` does not install application dependencies -- it just provides convenience scripts that run both apps at once.

**Why keep them separate?**

- The client builds to static files (HTML/CSS/JS). The server runs as a Node process. They have fundamentally different build and deployment workflows.
- Keeping them separate makes it natural to deploy the client to Vercel and the server to Render.
- Each has its own environment variables with different prefixes and different security requirements.

---

## The Root package.json

The root `package.json` installs `concurrently` and defines a single `dev` command:

```json
{
  "name": "blog-fullstack",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev --prefix server\" \"npm run dev --prefix client\"",
    "install:all": "npm install --prefix server && npm install --prefix client"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}
```

Running `npm run dev` from the project root starts both servers simultaneously:

- Express listens on `http://localhost:3001`
- Vite dev server listens on `http://localhost:5173`

You will see both servers' output in a single terminal, color-coded by `concurrently` so you can tell them apart.

---

## Ports and the Two-Server Development Workflow

In production, there is typically one server. The Express app serves the compiled React files as static assets, and the browser makes API calls to the same origin. But in development, running `vite build` every time you change a React component would be painfully slow. Instead, you run two separate servers.

```
Development:
  Browser at http://localhost:5173 (Vite dev server)
    |-- loads React app (hot module replacement, instant updates)
    |-- fetch('/api/posts') --> but wait, that's not right...
    |-- fetch('http://localhost:3001/api/posts') --> hits Express

Production:
  Browser at https://yourblog.vercel.app
    |-- loads React app (pre-built static files from Vercel)
    |-- fetch('/api/posts') --> same origin, hits Vercel serverless
    OR
    |-- fetch('https://api.yourblog.com/api/posts') --> Render backend
```

This difference in how the API URL is constructed between development and production is why environment variables exist. You set `VITE_API_URL=http://localhost:3001` in development and `VITE_API_URL=https://your-api.onrender.com` in production. Lesson 3 covers this in detail.

---

## Two Approaches: Separate Servers vs. Monolith

There are two common ways to structure a full-stack app in production:

**Option A: Separate servers (recommended for this course)**

The client and server deploy independently. Vercel hosts the React build. Render hosts the Express API. The client calls the API using an absolute URL stored in an environment variable.

```
Vercel (client):  https://blog.vercel.app
                      |
                      | VITE_API_URL=https://blog-api.onrender.com
                      v
Render (server):  https://blog-api.onrender.com
                      |
                      | DATABASE_URL
                      v
Render (DB):      PostgreSQL managed database
```

Advantages: Independent scaling, independent deployments, clear separation.

**Option B: Express serves the React build (monolith)**

You run `vite build` which outputs static files to `client/dist/`. Then you configure Express to serve those files. Everything runs as a single server.

```javascript
// In production, serve the React build from Express
import path from 'path';

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));

  // All non-API routes return the React index.html (SPA behavior)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}
```

Advantages: Single deployment, no CORS configuration needed, simpler.

Lesson 4 covers both deployment strategies in depth. For the project, you will implement Option A because it reflects how most professional teams operate.

---

## The API Contract

The client and server communicate through a shared API contract: a set of agreed-upon endpoints, request shapes, and response shapes. Both sides must honor this contract or things break.

For the blog, the contract looks like this:

| Method | Endpoint | Request Body | Response |
|--------|----------|-------------|---------|
| GET | /api/posts | -- | `{ posts: Post[] }` |
| GET | /api/posts/:id | -- | `{ post: Post }` |
| POST | /api/posts | `{ title, body }` | `{ post: Post }` |
| PUT | /api/posts/:id | `{ title?, body? }` | `{ post: Post }` |
| DELETE | /api/posts/:id | -- | 204 No Content |
| GET | /api/posts/:postId/comments | -- | `{ comments: Comment[] }` |
| POST | /api/posts/:postId/comments | `{ body, author }` | `{ comment: Comment }` |

The `Post` shape from the database:

```javascript
// What the server returns for every post
{
  id: 1,
  title: "My First Post",
  body: "Post content here...",
  created_at: "2026-03-01T10:30:00.000Z",
  updated_at: "2026-03-01T10:30:00.000Z"
}
```

Defining this contract before writing either the client or server code saves you from mismatches where the client expects `post.content` but the server sends `post.body`. Document it in a `API.md` file in the project root.

---

## Development Workflow

Here is the workflow you will use throughout this module:

1. **Start both servers** from the project root: `npm run dev`
2. **Open the React app** in the browser: `http://localhost:5173`
3. **Open your API** in a second tab or use curl to test it directly: `http://localhost:3001/api/posts`
4. **Make changes** to either the client or server. React hot-reloads instantly. The server restarts via nodemon within a second.
5. **Check the browser console** for network errors (CORS issues, 404s, 500s).
6. **Check the terminal** for server-side errors (stack traces, SQL errors).

The most important debugging habit in full-stack development: when something breaks, determine which tier the error comes from. Is the React component receiving wrong data? That is probably an API response shape issue. Is the Express route returning a 500? That is a server-side error -- check the terminal. Is the request not reaching Express at all? That is likely a CORS issue or a wrong URL.

---

## Key Takeaways

- Three-tier architecture separates the client (React), server (Express), and database (PostgreSQL). Each tier communicates only with the tier adjacent to it.
- A user action in React triggers an HTTP fetch request to Express. Express runs a SQL query. PostgreSQL returns rows. Express sends JSON back. React re-renders with the data.
- The monorepo structure keeps `client/` and `server/` as separate Node.js projects inside one repository. `concurrently` runs both dev servers with a single command.
- In development, the React app runs on port 5173 and the Express API runs on port 3001. In production, they can be separate services or Express can serve the React build.
- The API contract defines endpoints, request shapes, and response shapes. Document it before building. Both sides must honor it.
- When debugging, identify which tier the error belongs to: browser console for client issues, terminal for server issues.

---

## Try It Yourself

**Exercise 1: Draw the Data Flow**
Pick a feature you use every day -- a Twitter/X like button, a Google search result, a GitHub commit list. Sketch the three-tier flow for that feature: what event does the user trigger, what HTTP request goes to the server, what database query runs, what does the response look like, and how does the UI update? Be specific about request methods and rough response shapes.

**Exercise 2: Scaffold the Monorepo**
Create the `blog-fullstack/` directory structure described in this lesson. Initialize both `client/` (with `npm create vite@latest client -- --template react`) and `server/` (with `npm init -y`). Add the root `package.json` with the `concurrently` dev script. Run `npm run dev` and confirm both servers start. You do not need any routes or components yet -- just verify the structure and the concurrent startup work.

**Exercise 3: Identify the Contract**
Look at the Module 6 blog API you built. List every endpoint, its method, what it expects in the request, and what it returns. Write this as a simple markdown table (like the one in this lesson). This is your API contract for the module project.

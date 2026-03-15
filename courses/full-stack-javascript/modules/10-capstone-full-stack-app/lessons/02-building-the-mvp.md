---
title: "Building the MVP"
estimatedMinutes: 45
---

# Building the MVP

You have a schema, an endpoint list, wireframes, and a GitHub repo. It is time to build. This lesson covers the recommended order to tackle a full-stack project, how to use a vertical slices approach to make steady progress, how to manage your git workflow, and how to debug the three most common categories of full-stack issues: network errors, server-side bugs, and database problems.

The goal here is not to explain syntax you already know -- you have spent nine modules on that. The goal is to give you a process that keeps you moving forward without getting stuck or overwhelmed.

---

## Build Order: Database First

The most reliable order for building a full-stack application is database first, then API, then frontend. Here is why this sequence works:

**Database first** because every layer above it depends on it. If your schema changes -- a column gets renamed, a relationship gets restructured -- you potentially have to update your SQL queries, your API responses, and your React components. Getting it stable first reduces churn everywhere else.

**API second** because you can test it completely with a tool like Postman or `curl` before you write a single React component. If your API works correctly in isolation, frontend bugs are definitely frontend bugs. This separation makes debugging vastly faster.

**Frontend last** because React components are consuming data that already works. You know the exact shape of every API response because you built it. Forms submit to endpoints you have already tested.

This does not mean you never go back. You will. But having a direction keeps you from writing a React component that calls an endpoint that does not exist yet, then switching context to build the endpoint, then forgetting what you were doing in the component.

---

## Step 1: Set Up the Database

Start with a `schema.sql` file in your `server/` directory. Write all your `CREATE TABLE` statements with constraints. Run it against your local PostgreSQL database.

```sql
-- server/schema.sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE recipes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  prep_time_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ingredients (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT,
  unit TEXT
);
```

Apply it:

```
psql -d your_database_name -f server/schema.sql
```

Then open `psql` and verify:

```
\dt
\d recipes
```

If the tables look right, move on. If you realize you missed a column, alter the table now while it is empty -- it is much easier than after data exists.

---

## Step 2: Build the Express Server

Set up your Express app with just enough structure to be organized without being over-engineered.

```
server/
  index.js         -- App entry point, starts server
  app.js           -- Express app setup, mounts routers
  db.js            -- pg Pool configuration
  middleware/
    auth.js        -- authenticateToken middleware
  routes/
    auth.js        -- /api/auth/*
    recipes.js     -- /api/recipes/*
  controllers/
    authController.js
    recipeController.js
```

Your `db.js` reads from environment variables:

```javascript
// server/db.js
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

export default pool;
```

Your `app.js` mounts routers and global middleware:

```javascript
// server/app.js
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import recipesRouter from './routes/recipes.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/recipes', recipesRouter);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
```

Build auth first -- register and login endpoints, plus the `authenticateToken` middleware. Once those work (test them in Postman), every other protected route just uses the middleware you already verified.

---

## Step 3: Build API Routes Vertically

"Vertical slice" means: pick one complete feature and build it from database to API to frontend before moving to the next feature. Do not build all your Express routes first, then all your React components.

For example, take "create and list recipes" as your first vertical slice:

1. Write the SQL queries (`INSERT INTO recipes`, `SELECT * FROM recipes JOIN users...`)
2. Write the controller functions that call those queries
3. Wire the controllers to the router
4. Test with Postman -- verify the response shape is exactly what your frontend will need
5. Build the React list page that calls `GET /api/recipes`
6. Build the create recipe form that calls `POST /api/recipes`
7. Test the full flow end to end

Then move to the next slice: edit and delete recipes. Then: save/unsave. Each slice is a complete, working piece of the app.

This approach means you always have something working. You can demo it at any point. You never have a "nothing works because it is all 50% done" situation.

---

## Step 4: Set Up the React Frontend

Create your Vite + React app inside `client/`:

```
npm create vite@latest client -- --template react
cd client
npm install
npm install react-router-dom axios
```

Your initial structure:

```
client/src/
  main.jsx           -- Entry point, wraps app in BrowserRouter
  App.jsx            -- Route definitions
  context/
    AuthContext.jsx  -- Current user state, login/logout functions
  pages/
    HomePage.jsx
    LoginPage.jsx
    RegisterPage.jsx
    RecipeListPage.jsx
    RecipeDetailPage.jsx
    CreateRecipePage.jsx
  components/
    Navbar.jsx
    RecipeCard.jsx
    ProtectedRoute.jsx
  api/
    client.js        -- Axios instance with base URL + auth header
```

Set up your Axios client to attach the JWT automatically:

```javascript
// client/src/api/client.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

This means every API call automatically includes the token. You do not have to remember to attach it manually in every component.

---

## The Vertical Slice in Practice

Here is what a complete vertical slice looks like for the recipe list feature.

Backend (already tested in Postman):

```javascript
// server/controllers/recipeController.js
export async function listRecipes(req, res) {
  try {
    const result = await pool.query(`
      SELECT r.id, r.title, r.description, r.prep_time_minutes,
             r.created_at, u.username as author
      FROM recipes r
      JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('listRecipes error:', err);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
}
```

Frontend:

```javascript
// client/src/pages/RecipeListPage.jsx
import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import RecipeCard from '../components/RecipeCard';

export default function RecipeListPage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient.get('/api/recipes')
      .then(res => setRecipes(res.data))
      .catch(() => setError('Failed to load recipes'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;
  if (recipes.length === 0) return <p>No recipes yet. Be the first to add one!</p>;

  return (
    <div>
      <h1>All Recipes</h1>
      {recipes.map(recipe => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
}
```

Notice the loading and error states -- they make the user experience functional even when things are slow or broken. You will polish these in the next lesson, but having them from the start is good practice.

---

## Debugging Full-Stack Issues

Full-stack debugging is harder because the bug could be in three different places. Here is a systematic approach for each category.

**Network errors (the request never reaches the server or comes back wrong):**

Open the browser's Network tab. Find the failing request. Check:

- Status code (404 means wrong URL, 401 means auth failed, 500 means server error)
- Request headers (is the `Authorization` header present and correct?)
- Request body (is the JSON payload shaped correctly?)
- Response body (what did the server actually say?)

Most network issues are either a wrong URL (typo in the path, wrong port, missing `/api` prefix) or a CORS error. For CORS: check that your `cors()` config in Express matches the URL your React app is running on.

**Server-side errors (Express throws, SQL fails):**

Look at your terminal where the Node server is running. Express errors print there. A 500 response from your server almost always has a stack trace in the terminal -- read it.

Common patterns:

```
column "recipe_id" does not exist
```
-- A column name mismatch between your schema and your query.

```
null value in column "user_id" violates not-null constraint
```
-- You forgot to pass `req.user.id` to your INSERT, or your auth middleware is not running on this route.

```
relation "recipe" does not exist
```
-- You typed the table name wrong. Check `\dt` in psql.

**SQL errors (query logic is wrong):**

Test your SQL in `psql` directly before putting it in a controller. Copy the query, paste it into `psql`, and replace the `$1` placeholders with literal values:

```sql
SELECT r.id, r.title, u.username as author
FROM recipes r
JOIN users u ON r.user_id = u.id
WHERE r.id = 5;
```

If it works in `psql` but fails in Node, the issue is how you are passing parameters or calling the query. If it fails in `psql`, the SQL itself needs fixing.

---

## Git Workflow During the Build

Commit at natural stopping points, not all at once at the end of the day.

Good times to commit:

- After a migration runs cleanly
- After an API endpoint passes your Postman tests
- After a React page renders correctly with real data
- After you fix a bug

```
git add server/routes/recipes.js server/controllers/recipeController.js
git commit -m "feat: add GET /api/recipes and GET /api/recipes/:id endpoints"

git add client/src/pages/RecipeListPage.jsx client/src/components/RecipeCard.jsx
git commit -m "feat: build recipe list page with loading and error states"
```

Specific file staging (`git add <filename>`) rather than `git add .` keeps your commits clean and focused. It also protects you from accidentally committing your `.env` file.

If you finish a feature branch, push it, open a PR, and merge it before starting the next branch:

```
git push origin feature/recipe-crud
# open PR on GitHub, merge
git checkout main
git pull
git checkout -b feature/save-recipes
```

---

## Staying Focused on MVP

The biggest threat to finishing is scope creep -- adding things mid-build that were not in the MVP plan.

When you get an idea for a new feature while building, write it down in your stretch features list and keep going. Do not act on it now. The idea will still be there when the MVP is deployed.

Some signs you are drifting from scope:

- You are building a feature that does not appear in any of your MVP user stories
- You are redesigning something that already works because you think it could look better
- You are researching a new library when the built-in approach works fine

Check your GitHub Issues board regularly. If a task is "In Progress" for more than two days, it is either too big (break it down) or you are solving the wrong problem (re-read the user story).

---

## Key Takeaways

- Build in order: database schema first, Express API second, React frontend third. Each layer depends on the one below it being stable.
- Use vertical slices: build one complete feature end to end before starting the next. This keeps the app in a working state at every stage.
- Set up an Axios client with a request interceptor early -- automatic JWT attachment saves repeated boilerplate across every component.
- Debug by layer. Network tab for request/response issues, terminal for server errors, psql directly for SQL logic problems.
- Commit at natural checkpoints, not at the end of the day. Stage specific files rather than `git add .` to keep commits focused and your `.env` safe.
- Write down new ideas instead of acting on them. Your stretch list is for ideas that come up during the build. Finish the MVP first.

---

## Try It Yourself

1. Set up your project's database. Write your full `schema.sql`, apply it to a local database, and verify with `\dt` and `\d tablename` in psql. If anything looks wrong, fix it now.

2. Build the Express server scaffold: `app.js`, `db.js`, `middleware/auth.js`, and your first router file. Implement register and login endpoints, test both in Postman until they return correct responses, then apply `authenticateToken` to one protected route and verify it rejects requests without a valid token.

3. Pick your first vertical slice -- the core list/browse feature of your app. Build it all the way through: SQL query in psql, controller function, router registration, then the React page that fetches and displays the data. Do not move to the next feature until this one works end to end.

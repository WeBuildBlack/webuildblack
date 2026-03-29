---
title: "Module Project: Full-Stack Capstone"
estimatedMinutes: 150
---

# Module Project: Full-Stack Capstone

This is it. Everything you have built across nine modules -- advanced JavaScript, async patterns, APIs, React, Node, SQL, full-stack integration, and authentication -- comes together here. You are going to design, build, and deploy a complete full-stack application from scratch.

There are no starter files. No scaffolded components. No pre-written SQL. You own the whole thing.

---

## Choose Your Project

Pick one of the three guided briefs below, or bring your own idea if it meets the minimum requirements. All three briefs are scoped for a week of focused part-time work. Read all of them before choosing -- pick the one that genuinely interests you, because that interest will carry you through the hard parts.

---

### Brief A: Event Board

**What it is:** A community platform for discovering and posting local events. Users can browse events without an account, create and manage their own events when registered, and RSVP to events they want to attend.

**Who uses it:** Community organizers posting events, and community members finding things to do.

**Core features (MVP):**

- Browse all upcoming events without an account (sorted by date)
- Filter events by category (social, educational, professional, cultural, etc.)
- View a single event with full details and RSVP count
- Register and log in
- Create, edit, and delete your own events
- RSVP to events (one RSVP per user per event; can un-RSVP)
- View a dashboard of events you created and events you RSVPed to

**Suggested database schema:**

```sql
users
-----
id, email, password_hash, username, created_at

events
------
id, user_id (FK), title, description, location,
event_date (TIMESTAMPTZ), category, max_capacity,
created_at, updated_at

rsvps
-----
id, user_id (FK), event_id (FK), created_at
UNIQUE(user_id, event_id)
```

**Suggested API endpoints:**

```
GET    /api/events                    -- List events (query: ?category=, ?upcoming=true)
GET    /api/events/:id                -- Single event with RSVP count
POST   /api/events          (auth)    -- Create event
PUT    /api/events/:id       (auth)   -- Update own event
DELETE /api/events/:id       (auth)   -- Delete own event
POST   /api/events/:id/rsvp  (auth)   -- RSVP to event
DELETE /api/events/:id/rsvp  (auth)   -- Cancel RSVP
GET    /api/dashboard         (auth)  -- My events + my RSVPs
POST   /api/auth/register             -- Register
POST   /api/auth/login                -- Login
GET    /api/auth/me           (auth)  -- Current user
```

**Stretch features:** Search by keyword, calendar view, event image upload, email reminders, waiting list when event is at capacity.

---

### Brief B: Recipe Share

**What it is:** A platform for sharing and discovering recipes. Users can browse recipes publicly, post their own with ingredients and steps, save recipes from other users, and rate recipes they have tried.

**Who uses it:** Home cooks who want to share what they make and find recipes from a community they trust.

**Core features (MVP):**

- Browse all recipes without an account
- View a single recipe with ingredients and instructions
- Register and log in
- Create, edit, and delete your own recipes (with ingredients stored separately)
- Save recipes from other users to a personal collection
- View your saved recipes
- View a profile page showing all recipes by a given user

**Suggested database schema:**

```sql
users
-----
id, email, password_hash, username, created_at

recipes
-------
id, user_id (FK), title, description, prep_time_minutes,
cook_time_minutes, servings, created_at, updated_at

ingredients
-----------
id, recipe_id (FK), name, quantity, unit, sort_order

saved_recipes
-------------
id, user_id (FK), recipe_id (FK), saved_at
UNIQUE(user_id, recipe_id)
```

**Suggested API endpoints:**

```
GET    /api/recipes                      -- List all recipes
GET    /api/recipes/:id                  -- Single recipe with ingredients
POST   /api/recipes           (auth)     -- Create recipe + ingredients
PUT    /api/recipes/:id        (auth)    -- Update own recipe
DELETE /api/recipes/:id        (auth)    -- Delete own recipe
GET    /api/users/:username/recipes      -- Public profile: all recipes by user
GET    /api/saved               (auth)   -- My saved recipes
POST   /api/saved               (auth)   -- Save a recipe (body: { recipeId })
DELETE /api/saved/:recipeId     (auth)   -- Unsave a recipe
POST   /api/auth/register                -- Register
POST   /api/auth/login                   -- Login
GET    /api/auth/me             (auth)   -- Current user
```

**Note on ingredients:** When creating or updating a recipe, accept an array of ingredients in the request body. In your controller, use a transaction: INSERT the recipe first (get the new `id`), then INSERT all ingredients with that `recipe_id`. If any ingredient INSERT fails, roll back the whole transaction.

```javascript
// Transaction pattern for recipe creation
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const recipeResult = await client.query(
    'INSERT INTO recipes (user_id, title, description) VALUES ($1, $2, $3) RETURNING *',
    [req.user.id, title, description]
  );
  const recipeId = recipeResult.rows[0].id;
  for (const ing of ingredients) {
    await client.query(
      'INSERT INTO ingredients (recipe_id, name, quantity, unit) VALUES ($1, $2, $3, $4)',
      [recipeId, ing.name, ing.quantity, ing.unit]
    );
  }
  await client.query('COMMIT');
  res.status(201).json(recipeResult.rows[0]);
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```

**Stretch features:** Recipe ratings (1-5 stars with average displayed), search by ingredient, ingredient scaling by servings, tag/category system, print-friendly layout.

---

### Brief C: Study Tracker

**What it is:** A personal productivity tool for tracking study sessions, setting weekly goals, and visualizing progress over time. Users log what they studied, how long, and how they felt about it.

**Who uses it:** Self-taught developers, bootcamp students, or anyone building a learning habit who wants data on their own progress.

**Core features (MVP):**

- Register and log in (this app is private -- all data is auth-protected)
- Log a study session: subject, duration in minutes, date, difficulty rating (1-5), notes
- View all past sessions in a list, sorted by date
- Edit or delete a session
- Set a weekly study goal (minutes per week)
- Dashboard: total minutes this week, sessions this week, current streak (consecutive days with at least one session), all-time total minutes
- Visualize sessions over time: a simple week-by-week summary showing total minutes per week for the last 8 weeks

**Suggested database schema:**

```sql
users
-----
id, email, password_hash, username,
weekly_goal_minutes INTEGER DEFAULT 300,
created_at

study_sessions
--------------
id, user_id (FK), subject, duration_minutes INTEGER,
session_date DATE, difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
notes TEXT, created_at

subjects
--------
id, user_id (FK), name, color_hex
UNIQUE(user_id, name)
```

**Suggested API endpoints:**

```
POST   /api/auth/register                  -- Register
POST   /api/auth/login                     -- Login
GET    /api/auth/me             (auth)     -- Current user
PUT    /api/auth/me             (auth)     -- Update weekly goal

GET    /api/sessions            (auth)     -- All my sessions (query: ?subject=, ?limit=)
POST   /api/sessions            (auth)     -- Log a session
PUT    /api/sessions/:id        (auth)     -- Edit a session
DELETE /api/sessions/:id        (auth)     -- Delete a session

GET    /api/stats                (auth)    -- Dashboard stats (current week, streak, all-time)
GET    /api/stats/weekly         (auth)    -- Last 8 weeks, total minutes per week

GET    /api/subjects             (auth)    -- My subjects
POST   /api/subjects             (auth)    -- Create a subject
```

**Note on the stats endpoint:** The weekly stats query is a good place to use PostgreSQL's `date_trunc` and `generate_series` functions to return a row for every week even if the user did not study that week:

```sql
SELECT
  date_trunc('week', gs.week) AS week_start,
  COALESCE(SUM(s.duration_minutes), 0) AS total_minutes
FROM generate_series(
  NOW() - INTERVAL '7 weeks',
  NOW(),
  INTERVAL '1 week'
) AS gs(week)
LEFT JOIN study_sessions s
  ON date_trunc('week', s.session_date::TIMESTAMPTZ) = date_trunc('week', gs.week)
  AND s.user_id = $1
GROUP BY week_start
ORDER BY week_start;
```

**Stretch features:** Subject breakdown chart, export sessions as CSV, study buddy (share progress summary with a friend), Pomodoro timer integrated with session logging, mobile-first PWA.

---

### Open Project

Bring your own idea. It must meet all minimum requirements below. Before building, write a two-sentence description of what it does and who uses it, your user story list (8+ stories, MVP marked), database schema, and API endpoint list. Review these with a peer or mentor before starting.

---

## Minimum Requirements

Regardless of which brief you choose, your completed project must include all of the following:

**Database:**
- At least 3 tables with relationships (foreign keys)
- At least one one-to-many relationship (e.g., user has many recipes)
- At least one constraint beyond NOT NULL (UNIQUE, CHECK, or a join table with a composite unique constraint)
- Schema defined in a `schema.sql` file that can be run to recreate the database from scratch

**Backend:**
- Express 4 server with organized route and controller files
- Full CRUD on at least one resource (create, read, update, delete)
- User registration and login with bcrypt password hashing
- JWT-based authentication with a middleware function protecting all private routes
- Zod validation on at least two request bodies (e.g., register, create resource)
- Proper HTTP status codes (201 for creation, 401 for auth failures, 404 for not found, 400 for validation errors)
- Authorization checks: users can only modify their own data
- Error handling middleware that returns JSON errors (not HTML stack traces)

**Frontend:**
- React 18 with Vite
- React Router with at least 4 distinct routes
- Auth context (or equivalent state management) providing current user and login/logout to the component tree
- Protected routes that redirect unauthenticated users to login
- Loading, error, and empty states on all data-fetching components
- At least one form with client-side validation before API submission
- Responsive design: usable at 375px width

**Deployment:**
- Backend deployed to Render
- Frontend deployed to Vercel
- All secrets in environment variables (nothing hardcoded)
- Live demo URL in README

**Documentation:**
- README with project description, screenshots, tech stack, local setup instructions, and API reference

---

## Project Timeline (6-Day Plan)

Use this as a guide, not a rigid schedule. Adjust based on your pace.

**Day 1: Plan**
- Finalize project choice and write the two-sentence description
- Write 8+ user stories, mark MVP vs. stretch
- Sketch database schema on paper
- Write full API endpoint list
- Wireframe all pages (low-fidelity)
- Create GitHub repo, initial folder structure, `.gitignore`
- Draft `README.md` with description, features, and tech stack (live demo link TBD)

**Day 2: Backend foundation**
- Write `schema.sql` and apply to local database
- Set up Express server: `app.js`, `db.js`, `middleware/auth.js`
- Build auth endpoints: `POST /api/auth/register`, `POST /api/auth/login`
- Add Zod validation to both
- Test register and login in Postman
- Apply `authenticateToken` middleware to one protected route as a smoke test
- Commit: `feat: auth endpoints and JWT middleware`

**Day 3: Backend complete**
- Build all remaining API routes (full CRUD on primary resource + secondary resources)
- Test every endpoint in Postman -- verify correct status codes, response shapes, and auth enforcement
- Add authorization checks (user can only edit/delete their own records)
- Add error handling middleware
- Commit after each major route group: `feat: recipe CRUD endpoints`, `feat: saved recipes endpoints`

**Day 4: Frontend foundation**
- Create Vite + React app, install dependencies (react-router-dom, axios)
- Set up Axios client with base URL and auth header interceptor
- Build `AuthContext`: register, login, logout, persisted token from localStorage
- Build `ProtectedRoute` component
- Set up React Router with all routes (pages can be empty shells for now)
- Build `Navbar` with login/logout state
- Build login and register pages -- test the full auth flow end to end
- Commit: `feat: auth context, protected routes, login/register pages`

**Day 5: Frontend features**
- Build every page in your wireframes -- list, detail, create/edit forms, dashboard
- Add loading, error, and empty states to every data-fetching component
- Add client-side form validation with field-level error messages
- Add disabled + loading state to all submit buttons
- Test every user flow end to end in the browser
- Commit after each page: `feat: recipe list page`, `feat: create recipe form`

**Day 6: Polish and deploy**
- Mobile responsiveness pass (check every page at 375px, fix layout breaks)
- Final bug sweep: test all user flows as a logged-out user, as a logged-in user, and as a user trying to access another user's data
- Deploy backend to Render (provision Render PostgreSQL, run schema, set env vars)
- Deploy frontend to Vercel (set `VITE_API_URL` env var)
- Update README: add live demo URL and screenshots
- Commit: `feat: deployment config and production env setup`

---

## Submission Checklist

Before marking this project complete, verify each item:

**Database and backend:**
- [ ] `schema.sql` creates all tables cleanly when run on a fresh database
- [ ] Register endpoint hashes passwords with bcrypt (never stores plaintext)
- [ ] Login endpoint returns a JWT on success
- [ ] Protected routes return 401 without a valid token
- [ ] Attempting to edit/delete another user's resource returns 403
- [ ] All validated endpoints return 400 with field-level error messages on bad input
- [ ] Server returns JSON errors (not HTML) for all error conditions
- [ ] No hardcoded secrets anywhere in the codebase

**Frontend:**
- [ ] Unauthenticated users are redirected to login when accessing protected routes
- [ ] Login persists across page refresh (token in localStorage, user re-fetched on load)
- [ ] All data-fetching components show loading state, error state, and empty state
- [ ] All forms have client-side validation before API submission
- [ ] Submit buttons are disabled and show feedback during in-flight requests
- [ ] App is usable at 375px width (no horizontal overflow, tap targets accessible)

**Deployment:**
- [ ] Backend is live on Render and responding to API requests
- [ ] Frontend is live on Vercel and communicating with the Render backend
- [ ] CORS config allows requests from the Vercel frontend URL
- [ ] All environment variables set in both Render and Vercel dashboards
- [ ] `.env` files are in `.gitignore` and not committed

**Documentation:**
- [ ] README includes: description, screenshots, tech stack, local setup, API reference, live demo link
- [ ] `schema.sql` is committed so anyone can recreate the database

---

## Peer Review Guidelines

If you are doing a peer review exchange, use these questions to give useful feedback:

**Does it work?**
- Walk through the core user flow (register, create something, view it, edit it, delete it). Did everything work?
- Try accessing a protected route while logged out. What happened?
- Try the app on a mobile screen. What is broken?

**Is the code readable?**
- Are function and variable names clear without needing comments to explain them?
- Are controllers and routes organized sensibly? Could you find a specific endpoint quickly?
- Are there any obviously repeated blocks of code that could be extracted into a shared function?

**Is it secure?**
- Open the Network tab. Are JWTs being sent as `Authorization: Bearer` headers (not in query strings)?
- Can you manually hit `PUT /api/[resource]/[id]` with another user's resource ID? What does the server return?
- Is there any evidence of secrets in the source code or git history?

**Feedback format:**
- Two things that work well (be specific)
- Two concrete suggestions for improvement
- One question about a technical decision they made

---

## Going Further

Once your MVP is deployed and submitted, here are ways to extend the project that will also demonstrate growth to employers:

- Add TypeScript to the Express server: start by typing your request/response shapes and database query results
- Write Supertest integration tests for your API endpoints (aim for coverage on auth, CRUD, and authorization checks)
- Add a GitHub Actions workflow that runs tests on every push to `main`
- Replace the simple week-over-week stats with a chart library (Recharts works well with React)
- Add pagination to your list endpoints (`GET /api/recipes?page=2&limit=20`) and update the frontend to handle it
- Implement refresh tokens so JWTs can be short-lived without logging users out constantly

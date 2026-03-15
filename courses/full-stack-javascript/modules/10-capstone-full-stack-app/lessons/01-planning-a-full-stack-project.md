---
title: "Planning a Full-Stack Project"
estimatedMinutes: 45
---

# Planning a Full-Stack Project

You have built a full-stack blog application. You know how to design a database, write an Express API, connect a React frontend, and add JWT authentication. Those are real, professional-level skills. Now you get to apply all of them to something you own completely.

This module is the capstone. There are no hand-holding code-alongs here -- you are the engineer, and this is your project. But before a single line of code gets written, good planning separates a project that ships from one that stalls at 80% forever. This lesson covers how to plan a full-stack application the way working engineers actually do it.

---

## Choosing a Project Idea

The best capstone project idea has three qualities: it solves a real problem (even a small one), it fits within the scope of what you can build in roughly a week, and it genuinely interests you. Interest matters more than you might expect. When you hit a bug at hour three of a Saturday, caring about what you are building is what keeps you going.

Some questions to pressure-test your idea:

- Can you describe who uses this and what they do with it in two sentences?
- Does it require at least one database table with relationships?
- Does it need user accounts?
- Is it a CRUD app at its core? (Most web apps are, and that is fine.)

If your idea feels too big, that is a signal. A project that does three things well is far more impressive than one that attempts ten things and finishes none. A focused, polished, deployed application beats an ambitious, half-built one every time.

**Ideas to consider if you are starting from scratch:**

- A task manager for a specific domain (cooking prep, job applications, workout tracking)
- A community board for a local group (events, resources, announcements)
- A personal finance tracker with categories and monthly summaries
- A reading list with notes and ratings
- A small marketplace for a niche (handmade goods, tutoring sessions, local services)

Pick one and commit. You can always build the next idea after this one.

---

## Writing User Stories

A user story is a plain-English description of what a user needs to do. The format is simple:

```
As a [type of user], I want to [do something] so that [I get some value].
```

User stories keep you focused on behavior, not implementation. They stop you from over-engineering features nobody needs.

For a recipe sharing app, your stories might look like:

```
As a visitor, I want to browse recipes without an account so that I can explore before signing up.
As a registered user, I want to create a recipe with a title, ingredients, and steps so that others can make my dish.
As a registered user, I want to edit or delete my own recipes so that I can keep them accurate.
As a user, I want to search recipes by name or ingredient so that I can find something specific quickly.
As a user, I want to save recipes from other users so that I can find them later.
```

Write 8 to 12 user stories for your project. Then separate them into two lists:

**MVP (must ship):** The minimum stories that make the app genuinely useful.
**Stretch features:** Everything else. Nice to have, but not required to call it done.

Be honest about which column each story belongs in. Most projects stall because developers treat stretch features like requirements.

---

## Designing Your Database Schema

Your database is the foundation. Everything else -- your API, your frontend -- is built on top of it. Getting the schema roughly right before you start saves hours of painful migrations later.

Start on paper. Literally. A notebook, a whiteboard, or a notes app. Draw boxes for your tables. Write the column names inside them. Draw lines between tables to show relationships.

For the recipe app:

```
users
------
id          SERIAL PRIMARY KEY
email       TEXT UNIQUE NOT NULL
password_hash TEXT NOT NULL
username    TEXT UNIQUE NOT NULL
created_at  TIMESTAMPTZ DEFAULT NOW()

recipes
-------
id          SERIAL PRIMARY KEY
user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE
title       TEXT NOT NULL
description TEXT
prep_time_minutes INTEGER
created_at  TIMESTAMPTZ DEFAULT NOW()
updated_at  TIMESTAMPTZ DEFAULT NOW()

ingredients
-----------
id          SERIAL PRIMARY KEY
recipe_id   INTEGER REFERENCES recipes(id) ON DELETE CASCADE
name        TEXT NOT NULL
quantity    TEXT
unit        TEXT

saved_recipes
-------------
id          SERIAL PRIMARY KEY
user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE
recipe_id   INTEGER REFERENCES recipes(id) ON DELETE CASCADE
saved_at    TIMESTAMPTZ DEFAULT NOW()
UNIQUE(user_id, recipe_id)
```

As you sketch, ask:

- Where is the foreign key? (It goes on the "many" side of a one-to-many relationship.)
- Do I need a join table? (For many-to-many relationships, yes.)
- What columns need to be NOT NULL? What needs a UNIQUE constraint?
- What needs an index for performance? (Foreign key columns and any column you filter by frequently.)

You do not need to get this perfect. You will make small adjustments as you build. But having a documented starting point means you are making intentional changes, not thrashing.

---

## Planning Your API Endpoints

Once you have a schema, your API endpoints follow naturally. For each resource where users perform actions, you need routes.

A clean way to document endpoints before building them:

```
Auth
POST   /api/auth/register    -- Create account, return JWT
POST   /api/auth/login       -- Verify credentials, return JWT
GET    /api/auth/me          -- Get current user (protected)

Recipes
GET    /api/recipes          -- List all recipes (public)
GET    /api/recipes/:id      -- Single recipe with ingredients (public)
POST   /api/recipes          -- Create recipe (protected)
PUT    /api/recipes/:id      -- Update recipe (protected, owner only)
DELETE /api/recipes/:id      -- Delete recipe (protected, owner only)

Saved Recipes
GET    /api/saved            -- List my saved recipes (protected)
POST   /api/saved            -- Save a recipe (protected)
DELETE /api/saved/:recipeId  -- Unsave a recipe (protected)
```

Write this list out before you open your code editor. It gives you a concrete checklist to build from. When you sit down to write your Express router, you know exactly what needs to exist.

Notice: each endpoint has a clear HTTP method, a path, a short description, and a note about whether it requires authentication. That note matters -- it tells you exactly where to apply your `authenticateToken` middleware.

---

## Wireframing (Low-Fidelity)

You do not need design skills or Figma for this. A wireframe is just a sketch of what appears on each screen: boxes for layout, labels for content, arrows for navigation.

Identify the pages your app needs:

- Home / landing page (what does an unauthenticated visitor see?)
- List page (browse all recipes, events, etc.)
- Detail page (single item with full content)
- Create / edit form
- User dashboard or profile page
- Login and register pages

For each page, sketch three things:

1. What data is displayed?
2. What actions can the user take from here?
3. How do they arrive at this page, and where can they go next?

Your wireframes do not need to be beautiful. They just need to exist before you write React components. Otherwise you end up making UI decisions while simultaneously debugging Express routes, and both suffer.

---

## Creating Your GitHub Repository

Version control from day one, no exceptions.

Create the repo on GitHub first, then clone it locally:

```
git clone https://github.com/yourusername/your-project-name.git
cd your-project-name
mkdir client server
touch README.md .gitignore
```

A solid `.gitignore` for a full-stack project:

```gitignore
# Dependencies
node_modules/
client/node_modules/

# Environment variables -- never commit these
.env
.env.local
.env.production

# Build output
client/dist/
dist/

# OS and editor noise
.DS_Store
.vscode/
*.swp
```

Then use GitHub Issues as a lightweight project board. Create one issue per MVP user story. Label them by area: `backend`, `frontend`, `database`, `auth`. When you start working on one, drag it to "In Progress." When it is done, close it.

This is not bureaucracy -- it is a way to stay oriented when you are deep in a feature and lose track of what is left to do.

---

## Git Workflow: Feature Branches

Do not commit everything to `main`. Use feature branches.

```
git checkout -b feature/recipe-create
# build the feature
git add .
git commit -m "feat: add POST /api/recipes endpoint with Zod validation"
git push origin feature/recipe-create
# open a pull request on GitHub, merge to main
```

Branch names should describe what you are building: `feature/auth-register`, `feature/recipe-list-ui`, `fix/save-recipe-duplicate-error`. Meaningful commit messages tell a story -- "WIP" and "stuff" tell you nothing three days later when you are debugging.

You are working solo, so you can merge your own PRs. But going through the process builds the habit and gives you a clean record of what changed and when.

---

## Estimating Scope: MVP vs. Stretch

Here is a common trap: a developer scopes a project, underestimates how long each feature takes, and ends up with something half-done. The fix is to be honest about your MVP.

A rough estimation exercise for a week-long capstone:

| Task | Estimated Time |
|---|---|
| Database schema + migrations | 1 hour |
| Auth endpoints (register, login, middleware) | 2-3 hours |
| Core CRUD API routes | 3-4 hours |
| React app structure + React Router | 2 hours |
| List and detail pages | 3 hours |
| Create / edit forms | 2-3 hours |
| Protected routes + auth context | 2 hours |
| Deployment (Render + Vercel) | 2-3 hours |
| Polish and README | 2 hours |

That totals roughly 20 to 22 hours -- a full week of part-time work. If you add search, ratings, image uploads, email notifications, and a dark mode to that MVP list, you will not finish. Pick the core, ship it, then add stretch features afterward.

---

## Writing Your README Before You Code

This sounds backwards, but it works. Writing your README first forces you to articulate exactly what you are building and why. It also means when you deploy, documentation already exists.

Your README should include:

- Project name and a one-sentence description
- What problem it solves and who it is for
- Tech stack (React, Express, PostgreSQL, etc.)
- Features list (bulleted, based on your MVP user stories)
- Local setup instructions (how to run it)
- API endpoint documentation (the list you already wrote)
- Database schema summary
- Live demo link (fill in after deployment)
- Screenshots (add after you have a UI)

You will keep updating this as you build. But starting with a draft forces clarity and saves time at the end when you are tired and just want to be done.

---

## Key Takeaways

- A good capstone idea is focused, genuinely interesting to you, and solvable with the stack you know. Tight scope ships; broad scope stalls.
- User stories describe behavior from the user's perspective, not implementation details. Write 8 to 12 and split them ruthlessly into MVP and stretch.
- Design your database schema on paper before writing any code. The schema is the foundation everything else depends on.
- Document your API endpoints as a checklist before opening any router files: method, path, description, and whether auth is required.
- Wireframe every page, even roughly. Separating UI decisions from backend decisions means both get your full attention.
- Create your GitHub repo immediately and use feature branches from day one. One branch per feature, meaningful commit messages every time.
- Estimate your MVP scope honestly. If the total exceeds your available time, cut features -- not sleep.

---

## Try It Yourself

1. Choose your capstone project idea (or pick one of the guided briefs in the project file). Write a two-sentence description: what it does and who uses it. Say it out loud or share it with someone -- if they do not immediately understand it, simplify.

2. Write your full user story list, at least 8 stories. Mark each one as MVP or Stretch. Confirm your MVP list is something you could realistically build and deploy in a week.

3. On paper or in a notes app: sketch your database schema (every table, every column, every foreign key and relationship), then write out your full API endpoint list with HTTP methods, paths, and auth requirements. These two artifacts are your build plan.

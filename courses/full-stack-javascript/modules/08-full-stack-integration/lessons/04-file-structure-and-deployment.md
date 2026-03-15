---
title: "File Structure and Deployment"
estimatedMinutes: 35
---

# File Structure and Deployment

You have a working full-stack app on your machine. Now it is time to get it onto the internet. This lesson covers the final monorepo layout, how to use `concurrently` to run both servers in development, how to build a production version, and how to deploy the backend to Render and the frontend to Vercel. By the end, you will have a publicly accessible URL for both.

---

## The Final Monorepo Layout

Here is the complete directory structure for the blog project:

```
blog-fullstack/
├── client/
│   ├── public/
│   │   └── favicon.ico
│   ├── src/
│   │   ├── main.jsx            # React entry point
│   │   ├── App.jsx             # Root component with routing
│   │   ├── api/
│   │   │   └── posts.js        # All API calls (apiFetch wrapper)
│   │   ├── hooks/
│   │   │   └── useFetch.js     # Generic GET hook
│   │   └── components/
│   │       ├── PostList.jsx
│   │       ├── PostCard.jsx
│   │       ├── CreatePostForm.jsx
│   │       ├── EditPostForm.jsx
│   │       └── CommentSection.jsx
│   ├── .env                    # VITE_API_URL=http://localhost:3001
│   ├── .env.example
│   ├── .gitignore
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── index.js            # Server entry: loads .env, calls app.listen()
│   │   ├── app.js              # Express config: cors, json, routes
│   │   ├── routes/
│   │   │   ├── posts.js        # /api/posts CRUD
│   │   │   └── comments.js     # /api/posts/:id/comments
│   │   └── lib/
│   │       ├── db.js           # pg Pool + query helper
│   │       └── asyncHandler.js # wraps async route handlers
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   ├── .env                    # DATABASE_URL, PORT, CLIENT_URL
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
│
├── package.json                # Root: concurrently dev script
├── .gitignore                  # Root: node_modules, .env files
└── README.md
```

Each package has its own `node_modules`. You will run `npm install` separately in both `client/` and `server/`. The root `package.json` does not install application packages -- just `concurrently` for the dev workflow.

---

## The `concurrently` Dev Script

`concurrently` is a small utility that runs multiple commands in the same terminal, with color-coded output so you can tell them apart.

Install it at the root:

```bash
npm install --save-dev concurrently
```

Root `package.json`:

```json
{
  "name": "blog-fullstack",
  "private": true,
  "scripts": {
    "dev": "concurrently --names \"server,client\" --prefix-colors \"blue,green\" \"npm run dev --prefix server\" \"npm run dev --prefix client\"",
    "install:all": "npm install --prefix server && npm install --prefix client",
    "build": "npm run build --prefix client"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}
```

Running `npm run dev` from the project root starts:
- Express on `http://localhost:3001` (via nodemon, auto-restarts on server file changes)
- Vite on `http://localhost:5173` (with hot module replacement for instant React updates)

Server output appears in blue, client output in green. If either process crashes, `concurrently` stops both.

The `--prefix server` and `--prefix client` flags tell npm to run the script inside those subdirectories. It is equivalent to `cd server && npm run dev`.

---

## Server-Side `package.json`

```json
{
  "name": "blog-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "express": "^4.18.0",
    "pg": "^8.11.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

The `start` script is what Render uses in production. The `dev` script is what `concurrently` invokes locally.

---

## Client-Side `package.json`

Created by `npm create vite@latest` -- you will see something like:

```json
{
  "name": "blog-client",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^5.0.0"
  }
}
```

`vite build` compiles your React app to static files in `client/dist/`. Those files are what Vercel serves.

---

## Production Build: How Vite Works

During development, Vite serves JavaScript modules directly to the browser using native ES modules. There is no bundling -- it is fast because files are served as-is. When you run `vite build`, Vite:

1. Bundles all your JavaScript into optimized chunks
2. Minifies and tree-shakes (removes unused code)
3. Generates hashed filenames for cache busting
4. Outputs static files to `client/dist/`

```bash
# From the client/ directory:
npm run build

# Output:
# dist/
#   index.html
#   assets/
#     index-Bq3fK7mR.js     (hashed filename)
#     index-Dn9PqX1w.css
```

The `dist/` directory is a self-contained static site. Any static hosting service (Vercel, Netlify, GitHub Pages, S3) can serve it.

---

## Option A: Deploying to Render (Backend) + Vercel (Frontend)

This is the recommended approach for this course. Two separate deploys, two separate services.

### Deploying the Backend to Render

Render is a cloud platform that can run Node.js servers on a free tier.

**Step 1: Push your code to GitHub.**

Make sure your repository includes both `client/` and `server/`. The `.gitignore` should exclude `node_modules/` and `.env` files.

**Step 2: Create a Render account** at render.com.

**Step 3: Create a new Web Service on Render.**

- Connect your GitHub repository
- Set the **Root Directory** to `server`
- Set the **Build Command** to `npm install`
- Set the **Start Command** to `npm start`
- Choose the free tier

**Step 4: Add environment variables in the Render dashboard.**

Under "Environment", add:

```
DATABASE_URL=<your production PostgreSQL connection string>
NODE_ENV=production
CLIENT_URL=https://your-blog.vercel.app
PORT=10000
```

Render provides managed PostgreSQL databases. You can create one from the Render dashboard and copy the connection string it gives you.

**Step 5: Deploy.** Render builds and starts your server. You will get a URL like `https://blog-api.onrender.com`.

Test it: visit `https://blog-api.onrender.com/api/posts` in your browser. You should see your posts JSON.

### Deploying the Frontend to Vercel

**Step 1: Create a Vercel account** at vercel.com.

**Step 2: Import your GitHub repository.**

- Set the **Root Directory** to `client`
- Framework Preset: Vite (Vercel detects this automatically)
- Build Command: `npm run build`
- Output Directory: `dist`

**Step 3: Add the environment variable in the Vercel dashboard.**

Under "Environment Variables":

```
VITE_API_URL=https://blog-api.onrender.com
```

This is the production API URL from step 5 above. Vercel injects this during the build step.

**Step 4: Deploy.** You get a URL like `https://blog.vercel.app`.

**Step 5: Update CORS on the server.**

Go back to Render and add `CLIENT_URL=https://blog.vercel.app`. Trigger a redeploy. The Express CORS configuration reads `process.env.CLIENT_URL` and allows requests from Vercel.

---

## Option B: Express Serves the React Build

In this approach, you run one server that handles both API requests and serves the static React files.

```javascript
// server/src/app.js (production addition)
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ... existing middleware and routes ...

if (process.env.NODE_ENV === 'production') {
  // Serve compiled React files
  const clientBuildPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientBuildPath));

  // For any route that is not an API route, return index.html
  // This enables React Router to handle client-side navigation
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}
```

The `app.get('*')` catch-all must come after all your API routes. If a request matches `/api/posts`, Express handles it. If nothing else matches, Express serves `index.html` and React Router takes over.

To build for this approach, add a build script to the root `package.json`:

```json
{
  "scripts": {
    "build": "npm run build --prefix client",
    "start": "npm start --prefix server"
  }
}
```

Render would use `Root Directory: .` (the repo root), `Build Command: npm run build`, and `Start Command: npm start`.

**When to use each option**: Use Option A (separate deploys) when you expect to scale the frontend and backend independently, when you want separate deployment pipelines, or when your team has separate frontend and backend engineers. Use Option B when you want simplicity -- one service, one deployment, no CORS configuration needed.

---

## The `.gitignore` Files

You need a `.gitignore` in each relevant location:

```bash
# server/.gitignore
node_modules/
.env
.env.local
dist/

# client/.gitignore
node_modules/
.env
.env.local
dist/

# .gitignore (root)
node_modules/
.env
```

Committing `node_modules/` would bloat your repository by hundreds of megabytes. Committing `.env` would expose your database password and API keys.

---

## Key Takeaways

- The monorepo has `client/` and `server/` as separate Node.js projects. Each has its own `package.json`, `node_modules`, and `.env` file. The root `package.json` holds only `concurrently` and convenience scripts.
- `concurrently` runs both servers in one terminal with color-coded output. The `--prefix` flag tells npm which subdirectory to run in.
- `vite build` compiles the React app to static files in `client/dist/`. These files are what Vercel serves.
- For Option A: deploy the Express API to Render (set Root Directory to `server`, Build Command `npm install`, Start Command `npm start`) and the React app to Vercel (set Root Directory to `client`).
- After deploying, update the CORS allowed origins in your server with the production Vercel URL, and set `VITE_API_URL` in Vercel to the production Render URL.
- For Option B: Express serves the compiled React files in production. The `app.get('*')` catch-all returns `index.html` for any non-API route, enabling client-side routing.

---

## Try It Yourself

**Exercise 1: Verify the Build**
From your `client/` directory, run `npm run build`. Open the generated `client/dist/index.html` in a browser (or run `npm run preview` for Vite's local preview server). Confirm your app loads from the built static files, not the dev server.

**Exercise 2: Set Up Production Environment Variables**
Create `server/.env.example` and `client/.env.example` with all required variable names (no values). Add all `.env` variants to `.gitignore`. Verify that `git status` shows no `.env` files staged.

**Exercise 3: Deploy**
Push your project to a GitHub repository. Deploy the server to Render and the client to Vercel following the steps in this lesson. Set the production environment variables in both dashboards. Update the Express CORS config with the Vercel URL. Confirm you can load the React app from the Vercel URL and that it successfully fetches posts from the Render backend.

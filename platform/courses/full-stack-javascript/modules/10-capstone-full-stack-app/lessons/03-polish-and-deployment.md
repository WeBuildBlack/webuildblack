---
title: "Polish and Deployment"
estimatedMinutes: 40
---

# Polish and Deployment

Your MVP works. The data flows from PostgreSQL through Express to React and back. Users can create accounts, log in, and do the core things your app is designed for. That is a real accomplishment -- many people who start projects never reach this point.

Now comes the work that turns a functioning prototype into something you are proud to show. This lesson covers the UI states that make an app feel complete, the README that makes your project stand out to employers, and the deployment steps that put your work in front of the world.

---

## The Three States Every Data-Fetching Component Needs

A component that fetches data has three possible situations to handle: it is loading, it encountered an error, or it has data. If you only handle the "has data" case, the other two produce confusing blank screens or silent failures.

**Loading state:** Show feedback immediately while the request is in flight.

```javascript
function RecipeListPage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient.get('/api/recipes')
      .then(res => setRecipes(res.data))
      .catch(() => setError('Could not load recipes. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading recipes...</div>;
  if (error) return <div className="error">{error}</div>;
  // render data below
}
```

A simple "Loading..." message is fine. A spinner is better. The point is that the user knows something is happening.

**Error state:** Tell the user what went wrong and what they can do about it. "An error occurred" is not helpful. "Could not load recipes -- check your connection and try again" is. Avoid exposing raw error messages from your API to end users in production.

**Empty state:** What appears when the request succeeds but returns zero results? A blank page looks broken. A message like "No recipes yet -- be the first to add one!" with a link to the create form is both informative and action-orienting.

```javascript
if (recipes.length === 0) {
  return (
    <div className="empty-state">
      <p>No recipes yet.</p>
      <a href="/recipes/new">Add the first one</a>
    </div>
  );
}
```

Go through every data-fetching component in your app and add all three states. This single pass will make your app feel dramatically more professional.

---

## Form Validation UX

You have Zod validation on the server. The server correctly rejects bad input. But waiting for a round trip to the server to tell a user "email is required" is bad UX. Validate on the client too.

The simplest approach: check required fields on submit before the API call fires.

```javascript
function CreateRecipePage() {
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [errors, setErrors] = useState({});

  function validate(data) {
    const errs = {};
    if (!data.title.trim()) errs.title = 'Title is required';
    if (data.title.length > 200) errs.title = 'Title must be 200 characters or fewer';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(formData);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return; // stop here, do not call the API
    }
    // proceed with API call
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          value={formData.title}
          onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
        />
        {errors.title && <span className="field-error">{errors.title}</span>}
      </div>
      <button type="submit">Save Recipe</button>
    </form>
  );
}
```

Also disable the submit button while a request is in flight to prevent double-submits:

```javascript
const [submitting, setSubmitting] = useState(false);

async function handleSubmit(e) {
  e.preventDefault();
  setSubmitting(true);
  try {
    await apiClient.post('/api/recipes', formData);
    navigate('/recipes');
  } catch (err) {
    setErrors({ form: 'Failed to save recipe. Please try again.' });
  } finally {
    setSubmitting(false);
  }
}

// in the JSX:
<button type="submit" disabled={submitting}>
  {submitting ? 'Saving...' : 'Save Recipe'}
</button>
```

These patterns -- field-level errors, disabled submit button, feedback during submission -- are what separates a form that feels like a real product from one that feels like a demo.

---

## Responsive Design Check

Open your app on a phone (or use Chrome DevTools device simulation at 375px width). Go through every page. Common issues to fix:

- Navigation: does it stack or collapse gracefully? A horizontal nav bar at 375px often needs a hamburger menu or vertical stacking.
- Forms: are inputs full-width? Narrow inputs on mobile are hard to use.
- Cards and lists: do they reflow to single column? Side-by-side cards at 375px are usually too narrow.
- Tables: tables break badly on mobile. Consider converting tabular data to stacked cards on small screens.
- Touch targets: buttons and links should be at least 44x44px to be tappable without precision.

Basic responsive fixes with CSS:

```css
/* Make images responsive */
img {
  max-width: 100%;
  height: auto;
}

/* Card grid: 3 columns on desktop, 1 on mobile */
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .card-grid {
    grid-template-columns: 1fr;
  }
}

/* Forms: full-width inputs on mobile */
@media (max-width: 600px) {
  input, textarea, select {
    width: 100%;
    box-sizing: border-box;
  }
}
```

You do not need a perfect mobile design. You need a design that does not break and is usable.

---

## Writing a README That Gets Noticed

Your README is often the first thing a recruiter or hiring manager sees when they look at your GitHub. A strong README shows you can communicate, document, and think about your project holistically.

Structure it this way:

```markdown
# Project Name

One sentence: what it is and who it is for.

[Live Demo](https://your-app.vercel.app) | [Backend API](https://your-api.onrender.com)

## Screenshots

[Include 2-3 screenshots of the main pages]

## Features

- Feature one (with brief note on what it demonstrates technically)
- Feature two
- Feature three

## Tech Stack

**Frontend:** React 18, Vite, React Router, Axios
**Backend:** Node.js, Express 4, PostgreSQL
**Auth:** bcrypt, JSON Web Tokens
**Deployment:** Render (API), Vercel (client)

## Running Locally

### Prerequisites
- Node.js 18+
- PostgreSQL

### Setup

1. Clone the repo
2. Set up the database: `psql -d your_db -f server/schema.sql`
3. Copy `.env.example` to `.env` and fill in your values
4. Install dependencies: `npm install` in both `/server` and `/client`
5. Start the server: `cd server && npm run dev`
6. Start the client: `cd client && npm run dev`

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | No | Create account |
| POST | /api/auth/login | No | Get JWT |
| GET | /api/recipes | No | List all recipes |
| POST | /api/recipes | Yes | Create recipe |
```

Screenshots are the highest-impact addition you can make. They let someone understand your project in seconds without clicking through to the live demo.

---

## Deploying the Backend to Render

Render's free tier hosts Node.js web services. The build takes a few minutes but the setup is straightforward.

**Before you deploy:**

1. Make sure your `package.json` has a `start` script:
```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  }
}
```

2. Your server must listen on `process.env.PORT`:
```javascript
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

3. Create a `render.yaml` in your `server/` directory (optional but helpful):
```yaml
services:
  - type: web
    name: your-app-api
    env: node
    buildCommand: npm install
    startCommand: npm start
```

**Render deployment steps:**

1. Push your server code to GitHub (in a dedicated repo or a `server/` subfolder)
2. Go to [render.com](https://render.com), sign up, and click "New Web Service"
3. Connect your GitHub repo
4. Set the root directory to `server` if your backend is in a subfolder
5. Add environment variables in the Render dashboard:
   - `DATABASE_URL` (Render can provision a PostgreSQL database -- use that connection string)
   - `JWT_SECRET`
   - `CLIENT_URL` (your Vercel URL, which you will get in the next step)
   - `NODE_ENV=production`
6. Click "Create Web Service"

Render will build and deploy. Your API will be live at `https://your-app-api.onrender.com`.

**Important:** Free tier services on Render spin down after 15 minutes of inactivity. The first request after a spin-down takes 30-60 seconds. This is expected behavior on the free tier -- it is not a bug.

Run your schema SQL against the Render PostgreSQL database using the connection string Render provides:

```
psql your_render_connection_string -f server/schema.sql
```

---

## Deploying the Frontend to Vercel

Vercel is purpose-built for Vite and React projects. Deployment is nearly automatic.

**Before you deploy:**

1. Your React app needs to know the backend URL. Use an environment variable:
```javascript
// client/src/api/client.js
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});
```

2. Create a `client/.env.example`:
```
VITE_API_URL=http://localhost:3000
```

**Vercel deployment steps:**

1. Push your client code to GitHub
2. Go to [vercel.com](https://vercel.com), sign up, and click "Add New Project"
3. Import your GitHub repo
4. Set the root directory to `client` if your frontend is in a subfolder
5. Vercel auto-detects Vite -- the build command (`npm run build`) and output directory (`dist`) will be set automatically
6. Add environment variables:
   - `VITE_API_URL=https://your-app-api.onrender.com`
7. Click "Deploy"

Your frontend will be live at `https://your-app.vercel.app` within about 60 seconds.

**After both are deployed:** Go back to Render and update the `CLIENT_URL` environment variable to your Vercel URL. This ensures your CORS config allows requests from your live frontend.

---

## Environment Variables in Production

A common deployment mistake: forgetting environment variables and watching everything fail silently. Go through this checklist before calling a deployment done.

Server (Render):
- `DATABASE_URL` -- PostgreSQL connection string
- `JWT_SECRET` -- long random string, not the same as your local dev secret
- `CLIENT_URL` -- your Vercel frontend URL (for CORS)
- `NODE_ENV=production`

Client (Vercel):
- `VITE_API_URL` -- your Render backend URL

**Never commit `.env` files.** Confirm your `.gitignore` has `.env` and `.env.local` before any final push. If you accidentally commit secrets, revoke them immediately (rotate your JWT secret, regenerate database credentials) -- do not just delete the commit.

---

## What to Learn Next

You have built and deployed a full-stack application. Here is an honest map of where to go from here.

**TypeScript** is the natural next step. TypeScript adds static types to JavaScript. In a full-stack app, you define types for your API responses once and use them in both your Express controllers and your React components. It catches bugs before they run. Most professional React and Node codebases use TypeScript.

**Testing** is what separates code you wrote from code you trust. Start with Vitest for unit tests on utility functions, then React Testing Library for component tests, then Supertest for API endpoint tests. You do not need 100% coverage -- you need tests on the parts of your app that would hurt most if they broke silently.

**CI/CD with GitHub Actions** automates running tests on every push and blocking deploys if tests fail. Once you have tests, a GitHub Action that runs them on every PR takes about 20 lines of YAML to set up.

**Docker** packages your application and its dependencies into a container that runs identically in development and production. It solves "works on my machine" problems permanently and is standard at most engineering organizations.

**SQL depth** -- you used basic CRUD and JOINs. Next: window functions, CTEs (WITH clauses), query optimization with EXPLAIN ANALYZE, database indexes, and transactions for multi-step operations.

Pick one of these and spend focused time on it. You now have a real project to apply it to.

---

## Key Takeaways

- Every data-fetching component needs three states: loading, error, and empty. Handling all three is what makes an app feel complete rather than prototype-level.
- Client-side form validation catches obvious errors before the API call fires. Disable the submit button during submission to prevent double-requests.
- A mobile responsiveness pass (start at 375px width) catches the most common layout breaks in about an hour.
- A README with screenshots and a live demo link communicates your project clearly to anyone who lands on the repo, including people making hiring decisions.
- Render hosts the Express backend (free tier, note the cold start on inactivity). Vercel hosts the React frontend (auto-detects Vite, near-instant deploys).
- After both services are live, update CORS config on the backend to accept requests from your production frontend URL.
- TypeScript, testing, and CI/CD are the three most valuable next skills to build on top of everything you have learned here.

---

## Try It Yourself

1. Open your app on a phone screen (or Chrome DevTools at 375px). Screenshot every page that looks broken. Fix the top three issues you find using CSS media queries or flexbox/grid adjustments.

2. Pick two forms in your app. Add client-side validation that catches empty required fields before the API call. Add a disabled + loading state to the submit button. Test by submitting an empty form and by submitting while the network is throttled (DevTools Network tab, set to "Slow 3G").

3. Write and publish your README. Include at least two screenshots of your deployed app, the tech stack, setup instructions, and a link to the live demo. Share the GitHub link with someone and ask if they understand what the project does within 30 seconds of reading it.

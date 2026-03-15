---
title: "Cloud Deployment Platforms"
estimatedMinutes: 35
---

# Cloud Deployment Platforms

You have containers. You have CI/CD. The next question: where does your code actually run? Ten years ago, the answer was usually "rent a Linux server and manage it yourself." Today, deployment platforms handle the infrastructure so you can focus on your application. They provision servers, manage SSL certificates, scale when traffic spikes, and roll back when deployments fail.

For Gather, you need two platforms: one for the Next.js frontend and one for the Django backend. Each has different runtime requirements, so each benefits from a platform tailored to its stack.

---

## Platform Comparison

The deployment platform landscape is crowded. Here are the options most relevant to a project like Gather:

| Platform | Best For | Free Tier | Database | Deploy Method |
|---|---|---|---|---|
| **Vercel** | Next.js, React, static sites | 100GB bandwidth, serverless | No (use external) | Git push |
| **Railway** | Full-stack apps, Python, Node | $5/month credit | Built-in Postgres | Git push or CLI |
| **Render** | Full-stack apps, background jobs | 750 hours/month | Built-in Postgres | Git push |
| **Fly.io** | Docker containers, edge deployment | 3 shared VMs | Built-in Postgres | CLI (`fly deploy`) |
| **AWS/GCP/Azure** | Anything, full control | Complex free tiers | Managed options | Many (CLI, console, IaC) |

For learning and small projects, Vercel and Railway offer the best developer experience. For large-scale production, AWS, GCP, and Azure provide more control at the cost of more complexity. You do not need AWS to deploy a side project, and you do not need Vercel to run a distributed system. Choose the right tool for the scale you are operating at.

For Gather, the recommended split:

- **Vercel** for the Next.js frontend (Vercel built Next.js, so the integration is seamless)
- **Railway** for the Django backend + PostgreSQL (excellent Python support, built-in database)

---

## Deploying Next.js to Vercel

Vercel was created by the team behind Next.js. Deploying a Next.js app to Vercel is about as frictionless as deployment gets.

### Connect Your Repository

1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account.
2. Click "Add New Project."
3. Select the repository containing your Gather frontend.
4. Vercel detects it is a Next.js project and configures the build settings automatically.
5. If your Next.js app is in a subdirectory (like `gather-frontend/`), set the "Root Directory" to that path.
6. Click "Deploy."

That is it. Vercel installs dependencies, runs `npm run build`, and deploys the output. The entire process takes about 60 seconds.

### Environment Variables

Your frontend needs to know where the backend API lives. In Vercel:

1. Go to your project's Settings tab.
2. Click "Environment Variables."
3. Add `NEXT_PUBLIC_API_URL` with the value `https://your-backend.railway.app/api` (you will get this URL after deploying the backend).
4. Select which environments the variable applies to (Production, Preview, Development).

Variables prefixed with `NEXT_PUBLIC_` are embedded in the client-side JavaScript bundle at build time. They are visible to users. Never put secrets in `NEXT_PUBLIC_` variables.

### Preview Deployments

One of Vercel's best features is preview deployments. Every time you open a pull request, Vercel automatically builds and deploys that branch to a unique URL like `gather-frontend-git-add-rsvp-yourname.vercel.app`. You can share this URL with teammates for review, test the changes in a real environment, and catch issues before merging.

Preview deployments use the "Preview" environment variables, which can differ from production. This lets you point preview deployments at a staging API while production points at the real one.

### Custom Domain

To use a custom domain:

1. Go to your project's Settings, then Domains.
2. Add your domain (e.g., `gather.app`).
3. Vercel provides DNS records to add at your domain registrar.
4. SSL is configured automatically.

---

## Deploying Django to Railway

Railway is a platform that runs your code in containers. It supports any language and framework, but its Python support is particularly smooth. It can also provision a PostgreSQL database with one click.

### Project Setup

Before deploying, make sure your Django project has these files in the root of `gather-backend/`:

**Procfile** tells Railway how to start your application:

```
web: gunicorn gather_backend.wsgi:application --bind 0.0.0.0:$PORT
```

The `$PORT` variable is set by Railway. Unlike local development where you choose port 8000, Railway assigns a port dynamically.

**runtime.txt** specifies the Python version:

```
python-3.12.3
```

**requirements.txt** should include your production dependencies. Make sure these are present:

```
django
djangorestframework
gunicorn
psycopg2-binary
python-decouple
dj-database-url
whitenoise
django-cors-headers
```

Update your `gather_backend/settings.py` to handle production configuration:

```python
import dj_database_url

# Database: use DATABASE_URL in production, SQLite locally
DATABASES = {
    "default": dj_database_url.config(
        default="sqlite:///db.sqlite3",
        conn_max_age=600,
    )
}

# Static files with WhiteNoise
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # Add after SecurityMiddleware
    # ... rest of middleware
]

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}
```

`dj-database-url` parses the `DATABASE_URL` environment variable (which Railway sets automatically) into Django's database configuration format. WhiteNoise serves static files directly from Django, eliminating the need for a separate file server like nginx.

### Deploy to Railway

1. Go to [railway.app](https://railway.app) and sign in with your GitHub account.
2. Click "New Project" and select "Deploy from GitHub repo."
3. Select your repository and set the root directory to `gather-backend/` if needed.
4. Railway detects the Procfile and starts building.

### Add PostgreSQL

1. In your Railway project dashboard, click "New" and select "Database," then "Add PostgreSQL."
2. Railway provisions a Postgres instance and automatically sets the `DATABASE_URL` environment variable in your backend service.
3. No manual database configuration needed.

### Environment Variables

In your Railway service settings, add the remaining environment variables:

```
SECRET_KEY=your-production-secret-key
DEBUG=False
ALLOWED_HOSTS=your-backend.railway.app
CORS_ALLOWED_ORIGINS=https://gather.app
```

Generate a strong `SECRET_KEY` with Python:

```python
from django.core.management.utils import get_random_secret_key
print(get_random_secret_key())
```

### Run Migrations

Railway provides a CLI and a web console for running commands. To run migrations:

```bash
railway run python manage.py migrate
railway run python manage.py createsuperuser
```

Or use the Railway dashboard's "Command" tab to execute commands directly.

### Custom Domain

1. In your Railway service settings, go to the "Networking" section.
2. Click "Custom Domain" and add your domain (e.g., `api.gather.app`).
3. Add the provided CNAME record at your domain registrar.
4. Railway configures SSL automatically.

---

## CORS: Connecting Frontend and Backend

When your frontend at `https://gather.app` makes API requests to `https://api.gather.app`, the browser enforces Cross-Origin Resource Sharing (CORS) rules. Without proper CORS configuration, the browser blocks these requests.

In your Django settings:

```python
INSTALLED_APPS = [
    # ...
    "corsheaders",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # Must be before CommonMiddleware
    # ...
]

CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:3000",
).split(",")
```

In development, the frontend runs at `http://localhost:3000`. In production, it runs at `https://gather.app`. The environment variable lets you configure this per environment without changing code.

On the Next.js side, API calls use the `NEXT_PUBLIC_API_URL` variable:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function getEvents() {
  const response = await fetch(`${API_URL}/events/`);
  if (!response.ok) throw new Error("Failed to fetch events");
  return response.json();
}
```

---

## Database Management in Production

Your production database contains real user data. Treat it with care.

**Backups.** Railway and Render both offer automated daily backups. Enable them. Also create manual backups before running migrations that modify existing data. Railway's PostgreSQL addon includes point-in-time recovery on paid plans.

**Connection pooling.** Each Django worker opens a database connection. With multiple workers, you can exhaust your connection limit. The `conn_max_age=600` setting in `dj_database_url.config()` keeps connections alive for 10 minutes instead of opening a new one for every request. For higher traffic, consider adding `django-db-connection-pool` or using an external pooler like PgBouncer.

**Migrations in production.** Always run migrations as part of your deployment process. Railway lets you add a release command that runs before the new version starts serving traffic:

Add to your `Procfile`:

```
web: gunicorn gather_backend.wsgi:application --bind 0.0.0.0:$PORT
release: python manage.py migrate
```

The `release` command runs once during each deployment, before the `web` process starts. This ensures your database schema is always in sync with your code.

---

## Monitoring Deploy Health

After every deployment, verify that your application is actually working:

1. Check the platform's deploy logs for errors.
2. Hit your health check endpoints (you will build these in the next lesson).
3. Test a core user flow (create an account, browse events, RSVP).
4. Check error monitoring (Sentry, covered in the next lesson) for new errors.

Both Vercel and Railway show deployment logs in their dashboards. Get in the habit of checking them after every deploy, even when CI is green. A passing test suite does not guarantee a successful deployment. Missing environment variables, database connection issues, and file permission problems can all cause a green CI build to fail in production.

---

## Key Takeaways

1. Deployment platforms (Vercel, Railway, Render, Fly.io) handle infrastructure so you can focus on your application code.
2. Vercel is the best choice for Next.js apps, with seamless integration, preview deployments, and automatic SSL.
3. Railway is excellent for Python/Django apps, with built-in PostgreSQL and simple environment variable management.
4. CORS configuration is required when your frontend and backend run on different domains. Use `django-cors-headers` and configure allowed origins per environment.
5. Production databases need backups, connection pooling, and careful migration management. Use a `release` command to run migrations during deployment.
6. Environment variables keep configuration out of code. Each platform provides a way to set them per environment (production, preview, development).
7. Always verify deployment health after every deploy by checking logs, health endpoints, and error monitoring.

## Try It Yourself

Deploy a simple Django project to Railway. Create a new Django project with one model (a "Note" with a title and body), add DRF with a ViewSet, create a Procfile and runtime.txt, push to GitHub, and deploy. Verify you can access the API at the Railway-provided URL. Then add a PostgreSQL database and confirm your data persists across deployments.

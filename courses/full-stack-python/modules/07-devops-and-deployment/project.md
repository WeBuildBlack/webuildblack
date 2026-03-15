---
title: "Module Project: CI/CD Pipeline"
estimatedMinutes: 75
---

# Gather DevOps: Full CI/CD Pipeline

Set up the complete DevOps infrastructure for Gather. You will containerize both services, build an automated CI/CD pipeline with GitHub Actions, deploy to cloud platforms, and add monitoring. By the end, every push to main will automatically test, build, and deploy your application.

## Overview

This project ties together every lesson in the module. You will write Dockerfiles for both services, compose them into a local development stack, create CI workflows that validate every pull request, add CD steps that deploy on merge, and set up Sentry for production error tracking. This is the same DevOps setup used by professional engineering teams.

## What You'll Practice

- Writing production Dockerfiles with layer caching and multi-stage builds (Lesson 2)
- Composing multiple services with Docker Compose (Lesson 2)
- Building CI workflows with GitHub Actions, matrix testing, and caching (Lesson 3)
- Deploying to Vercel and Railway with CD automation (Lessons 3 and 4)
- Setting up error tracking with Sentry (Lesson 5)
- Building health check endpoints with dependency verification (Lesson 5)

## Prerequisites

- Docker Desktop installed ([docker.com/get-started](https://www.docker.com/get-started/))
- A GitHub account with your Gather repo pushed
- A Vercel account (free tier)
- A Railway account (free tier)
- A Sentry account (free tier)
- Completed all five lessons in this module

## Project Setup

Make sure your Gather project has this structure:

```
gather/
├── gather-frontend/          # Next.js app from Modules 01-04
│   ├── src/
│   ├── package.json
│   ├── next.config.js
│   └── tsconfig.json
├── gather-backend/           # Django app from Modules 05-06
│   ├── gather_backend/
│   ├── events/
│   ├── manage.py
│   └── requirements.txt
└── docker-compose.yml        # You will create this
```

---

## Step 1: Dockerfile for the Django Backend

Create `gather-backend/Dockerfile`. The image should use Python 3.12, install system dependencies for PostgreSQL, install pip packages with layer caching, and run the app with gunicorn.

```dockerfile
# gather-backend/Dockerfile

# TODO: Use python:3.12-slim as the base image

# TODO: Set PYTHONDONTWRITEBYTECODE and PYTHONUNBUFFERED environment variables

# TODO: Set WORKDIR to /app

# TODO: Install system dependencies (gcc, libpq-dev) and clean up apt cache

# TODO: Copy requirements.txt first (layer caching optimization)

# TODO: Install Python dependencies with --no-cache-dir

# TODO: Copy the rest of the application code

# TODO: Run collectstatic for production static files

# TODO: Expose port 8000

# TODO: Set CMD to run gunicorn on 0.0.0.0:8000
```

Create `gather-backend/.dockerignore`:

```
# TODO: Add entries to exclude virtual environments, __pycache__,
# .pyc files, .env, .git, .pytest_cache, and db.sqlite3
```

Verify your Dockerfile builds:

```bash
cd gather-backend
docker build -t gather-backend .
```

---

## Step 2: Multi-Stage Dockerfile for the Next.js Frontend

Create `gather-frontend/Dockerfile`. This uses three stages: dependency installation, building, and a production runner. The final image should contain only the built output and run as a non-root user.

First, update `gather-frontend/next.config.js` to enable standalone output:

```typescript
const nextConfig = {
  output: "standalone",
};

export default nextConfig;
```

Now write the Dockerfile:

```dockerfile
# gather-frontend/Dockerfile

# --- Stage 1: Dependencies ---
# TODO: Use node:20-alpine, name the stage "deps"
# TODO: Set WORKDIR to /app
# TODO: Copy package.json and package-lock.json
# TODO: Run npm ci

# --- Stage 2: Builder ---
# TODO: Use node:20-alpine, name the stage "builder"
# TODO: Set WORKDIR to /app
# TODO: Copy node_modules from the deps stage
# TODO: Copy all source code
# TODO: Set NEXT_TELEMETRY_DISABLED=1
# TODO: Run npm run build

# --- Stage 3: Runner ---
# TODO: Use node:20-alpine, name the stage "runner"
# TODO: Set WORKDIR to /app
# TODO: Set NODE_ENV=production and NEXT_TELEMETRY_DISABLED=1
# TODO: Create a non-root user (nodejs group, nextjs user)
# TODO: Copy public/ from builder
# TODO: Copy .next/standalone from builder (chown to nextjs:nodejs)
# TODO: Copy .next/static from builder (chown to nextjs:nodejs)
# TODO: Switch to the nextjs user
# TODO: Expose port 3000
# TODO: Set CMD to run "node server.js"
```

Create `gather-frontend/.dockerignore`:

```
# TODO: Add entries to exclude node_modules, .next, .env files, .git
```

Verify:

```bash
cd gather-frontend
docker build -t gather-frontend .
```

---

## Step 3: Docker Compose for the Full Stack

Create `docker-compose.yml` in your project root. Define three services: a PostgreSQL database, the Django backend, and the Next.js frontend. The backend should wait for the database to be healthy before starting.

```yaml
# docker-compose.yml

# TODO: Define the "db" service
#   - Use postgres:16-alpine image
#   - Set POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD environment variables
#   - Mount a named volume for data persistence at /var/lib/postgresql/data
#   - Expose port 5432
#   - Add a healthcheck using pg_isready

# TODO: Define the "backend" service
#   - Build from ./gather-backend
#   - Set environment variables: DATABASE_URL (using db hostname),
#     SECRET_KEY, DEBUG, ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS
#   - Expose port 8000
#   - Use depends_on with condition: service_healthy for the db
#   - Mount ./gather-backend as a bind volume to /app

# TODO: Define the "frontend" service
#   - Build from ./gather-frontend
#   - Set NEXT_PUBLIC_API_URL to http://localhost:8000/api
#   - Expose port 3000
#   - Use depends_on for the backend service

# TODO: Define the named volume for postgres data
```

Test the full stack:

```bash
docker compose up --build
```

Verify all three services start. In a separate terminal:

```bash
# Run migrations
docker compose exec backend python manage.py migrate

# Create a superuser
docker compose exec backend python manage.py createsuperuser

# Check the frontend
curl http://localhost:3000

# Check the backend API
curl http://localhost:8000/api/events/
```

---

## Step 4: GitHub Actions CI Workflow

Create `.github/workflows/ci.yml`. The workflow should run on pushes and PRs to `main`, with separate jobs for the frontend and backend.

```yaml
# .github/workflows/ci.yml
name: Gather CI

# TODO: Set triggers for push to main and pull_request to main

jobs:
  frontend:
    name: Frontend Checks
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./gather-frontend

    # TODO: Add matrix strategy for node-version [18, 20]

    steps:
      # TODO: Checkout code using actions/checkout@v4

      # TODO: Set up Node.js using actions/setup-node@v4
      #   - Use the matrix node-version
      #   - Enable npm caching with cache-dependency-path

      # TODO: Install dependencies with npm ci

      # TODO: Run linting (npm run lint)

      # TODO: Run type checking (npx tsc --noEmit)

      # TODO: Run tests (npm test)

  backend:
    name: Backend Checks
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./gather-backend

    # TODO: Add matrix strategy for python-version ["3.11", "3.12"]

    # TODO: Add postgres service container
    #   - Use postgres:16-alpine
    #   - Set POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
    #   - Expose port 5432
    #   - Add health check options

    steps:
      # TODO: Checkout code

      # TODO: Set up Python using actions/setup-python@v5
      #   - Use the matrix python-version
      #   - Enable pip caching

      # TODO: Install dependencies (upgrade pip, install requirements.txt)

      # TODO: Run linting with Ruff (ruff check .)

      # TODO: Run tests with environment variables
      #   - DATABASE_URL pointing to the service container
      #   - SECRET_KEY (test value)
      #   - DEBUG=False
      #   - ALLOWED_HOSTS=localhost
```

Push this workflow to GitHub and verify it runs:

```bash
git add .github/workflows/ci.yml
git commit -m "feat: add CI workflow for frontend and backend"
git push origin main
```

Check the Actions tab in your GitHub repo. Both jobs should run and pass (or fail with actionable error messages).

---

## Step 5: CD Workflow for Backend Deployment

Create `.github/workflows/deploy.yml`. This workflow deploys the Django backend to Railway when code is pushed to main and CI passes.

```yaml
# .github/workflows/deploy.yml
name: Deploy

# TODO: Trigger on push to main

jobs:
  # TODO: Add a "ci" job that references the CI workflow
  #   uses: ./.github/workflows/ci.yml

  deploy-backend:
    name: Deploy Backend to Railway
    runs-on: ubuntu-latest
    # TODO: Add "needs: ci" to wait for CI to pass

    steps:
      # TODO: Checkout code

      # TODO: Install Railway CLI (npm install -g @railway/cli)

      # TODO: Deploy using "railway up --service gather-backend"
      #   - Set RAILWAY_TOKEN from secrets
```

Before this works, you need to add your Railway token as a GitHub secret:

1. Get your Railway token: `railway login` then `railway whoami` (or generate a project token in Railway's dashboard).
2. Go to your GitHub repo, then Settings, then Secrets and variables, then Actions.
3. Add a secret named `RAILWAY_TOKEN` with your token value.

---

## Step 6: Sentry Error Tracking

Set up Sentry for both services.

### Backend (Django)

```python
# gather_backend/settings.py

# TODO: Import sentry_sdk at the top of settings.py

# TODO: Initialize Sentry with:
#   - dsn from SENTRY_DSN environment variable (default to empty string)
#   - traces_sample_rate of 0.1
#   - send_default_pii set to False
#   - environment from ENVIRONMENT variable (default "development")
```

### Frontend (Next.js)

```bash
cd gather-frontend
npx @sentry/wizard@latest -i nextjs
```

After the wizard runs, verify the configuration:

```typescript
// sentry.client.config.ts

// TODO: Verify Sentry.init includes:
//   - dsn from NEXT_PUBLIC_SENTRY_DSN
//   - sampleRate: 1.0 for development, 0.2 for production
//   - tracesSampleRate: 0.1
//   - enabled: only in production
```

Add the Sentry DSN to your environment variables:
- Vercel: Add `NEXT_PUBLIC_SENTRY_DSN` in the project settings
- Railway: Add `SENTRY_DSN` in the service variables

---

## Step 7: Health Check Endpoint

Add a health check to the Django backend that verifies both the server and database are operational.

```python
# events/views.py

# TODO: Create a health_check view function that:
#   1. Creates a response dict with "status" and "checks" keys
#   2. Tests database connectivity by executing "SELECT 1" with a cursor
#   3. Returns {"status": "healthy", "checks": {"database": "connected"}}
#      with status 200 if the database query succeeds
#   4. Returns {"status": "unhealthy", "checks": {"database": "<error>"}}
#      with status 503 if the database query fails
```

```python
# gather_backend/urls.py

# TODO: Add the health check URL pattern:
#   path("api/health/", health_check, name="health-check")
```

Verify the health check works:

```bash
docker compose up -d
docker compose exec backend python manage.py migrate
curl http://localhost:8000/api/health/
```

Expected output:

```json
{"status": "healthy", "checks": {"database": "connected"}}
```

---

## Expected Output

When everything is complete, you should have:

1. **Docker**: `docker compose up --build` starts all three services (Postgres, Django, Next.js) with a single command.
2. **CI**: Every push and PR to `main` triggers automated linting, type checking, and testing for both frontend and backend.
3. **CD**: Merging to `main` automatically deploys the backend to Railway (after CI passes).
4. **Monitoring**: Sentry captures unhandled errors in both services with full stack traces.
5. **Health**: `GET /api/health/` returns the backend's operational status with database connectivity.

---

## Stretch Goals

1. **Add the frontend CD step.** Extend the deploy workflow to deploy the Next.js frontend to Vercel using the Vercel CLI and `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` secrets.

2. **Add a staging environment.** Create a second Railway service for staging. Modify the CD workflow to deploy to staging on push to a `develop` branch and to production on push to `main`. Add a manual approval step before production deploys using GitHub Actions environments.

3. **Build a status dashboard.** Create a `/status` page in the Next.js app that pings both the frontend and backend health endpoints and displays their status. Use the `revalidate` option to cache the result for 60 seconds. Style it with your Gather branding.

---

## Submission Checklist

- [ ] `gather-backend/Dockerfile` builds successfully with `docker build -t gather-backend .`
- [ ] `gather-backend/.dockerignore` excludes virtual environments, caches, and secrets
- [ ] `gather-frontend/Dockerfile` uses multi-stage build and runs as non-root user
- [ ] `gather-frontend/.dockerignore` excludes node_modules, .next, and env files
- [ ] `docker-compose.yml` starts all three services with `docker compose up --build`
- [ ] Database data persists across `docker compose down` and `docker compose up` (named volume)
- [ ] `.github/workflows/ci.yml` runs lint, type check, and tests for both services
- [ ] CI uses matrix strategy to test across multiple runtime versions
- [ ] CI uses dependency caching to speed up runs
- [ ] `.github/workflows/deploy.yml` deploys backend to Railway on merge to main
- [ ] Railway deployment token is stored as a GitHub secret (never in code)
- [ ] Sentry is configured for both Django and Next.js
- [ ] `GET /api/health/` returns status 200 with database connectivity check
- [ ] All CI checks pass on GitHub Actions

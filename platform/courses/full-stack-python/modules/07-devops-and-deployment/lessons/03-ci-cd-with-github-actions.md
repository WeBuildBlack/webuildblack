---
title: "CI/CD with GitHub Actions"
estimatedMinutes: 40
---

# CI/CD with GitHub Actions

Your Gather stack runs locally with Docker Compose. But here is a scenario that will happen sooner than you think: someone opens a pull request, the code looks fine in review, you merge it, and the app breaks in production. A test was failing, but nobody ran the tests. A type error slipped through because nobody ran the type checker. A linting rule was violated, but nobody noticed.

CI/CD prevents this. Continuous Integration (CI) automatically runs your tests, linters, and type checkers on every push and pull request. Continuous Deployment (CD) automatically deploys your code when it passes all checks. Together, they create a safety net that catches problems before they reach users.

---

## CI vs. CD

These two terms are often used together, but they solve different problems.

**Continuous Integration (CI)** means automatically building and testing your code every time someone pushes changes. The goal is to detect integration problems early. If two developers change the same file and their changes conflict, CI catches it. If a new feature breaks an existing test, CI catches it. If someone introduces a type error, CI catches it.

CI answers the question: "Is this code safe to merge?"

**Continuous Deployment (CD)** means automatically deploying your code to production after it passes all CI checks. Some teams use Continuous Delivery instead, which means the code is always in a deployable state but requires a manual approval step before deployment. The distinction:

- **Continuous Delivery**: code is tested and ready to deploy. A human clicks the button.
- **Continuous Deployment**: code is tested and deployed automatically. No human in the loop.

CD answers the question: "How do we get this code to users?"

For Gather, you will set up CI first (automated testing on every PR) and then add CD (automatic deployment on merge to main).

---

## GitHub Actions: The Basics

GitHub Actions is GitHub's built-in CI/CD platform. It is free for public repositories and includes 2,000 minutes per month for private repos on the free tier. Workflows are defined in YAML files inside the `.github/workflows/` directory.

The key concepts:

**Workflow**: A YAML file that defines an automated process. You can have multiple workflows in a repo.

**Trigger**: The event that starts a workflow. Common triggers include `push` (code pushed to a branch), `pull_request` (PR opened or updated), `schedule` (cron-based), and `workflow_dispatch` (manual).

**Job**: A set of steps that run on a single runner (virtual machine). Jobs in the same workflow run in parallel by default.

**Step**: A single task within a job. A step can run a shell command or use a pre-built action.

**Action**: A reusable unit of code. GitHub and the community publish thousands of actions for common tasks (checking out code, setting up Node, caching dependencies).

Here is the simplest possible workflow:

```yaml
# .github/workflows/hello.yml
name: Hello World

on: push

jobs:
  greet:
    runs-on: ubuntu-latest
    steps:
      - name: Say hello
        run: echo "Hello from GitHub Actions!"
```

This runs on every push to any branch. It starts an Ubuntu virtual machine, and the single step prints a message. Not very useful, but it shows the structure.

---

## Building the Gather CI Workflow

Now build something real. This workflow will run on every push and pull request, checking both the frontend and backend.

Create `.github/workflows/ci.yml`:

```yaml
name: Gather CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # ──────────────────────────────────────
  # Frontend checks: lint, type check, test
  # ──────────────────────────────────────
  frontend:
    name: Frontend Checks
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./gather-frontend

    strategy:
      matrix:
        node-version: [18, 20]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"
          cache-dependency-path: ./gather-frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Run tests
        run: npm test

  # ──────────────────────────────────────
  # Backend checks: lint, type check, test
  # ──────────────────────────────────────
  backend:
    name: Backend Checks
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./gather-backend

    strategy:
      matrix:
        python-version: ["3.11", "3.12"]

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: gather_test
          POSTGRES_USER: gather_user
          POSTGRES_PASSWORD: gather_password
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U gather_user -d gather_test"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python ${{ matrix.python-version }}
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
          cache: "pip"

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      - name: Lint with Ruff
        run: ruff check .

      - name: Run tests
        env:
          DATABASE_URL: postgres://gather_user:gather_password@localhost:5432/gather_test
          SECRET_KEY: test-secret-key-not-for-production
          DEBUG: "False"
          ALLOWED_HOSTS: localhost
        run: python manage.py test
```

There is a lot here. Break it down section by section.

---

## Triggers

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

This workflow runs in two situations: when code is pushed directly to `main`, and when a pull request targeting `main` is opened or updated. It does not run on pushes to feature branches (unless they have a PR open against main). This keeps CI focused on code that is headed toward production.

---

## Matrix Strategy

```yaml
strategy:
  matrix:
    node-version: [18, 20]
```

The matrix strategy runs the same job multiple times with different configurations. For the frontend, it tests against Node 18 and Node 20. For the backend, it tests against Python 3.11 and 3.12. This ensures your code works across the versions your team might be using.

GitHub Actions creates a separate runner for each combination. With two Node versions and two Python versions, you get four parallel jobs. If any of them fail, the entire workflow fails, and the PR shows a red X.

---

## Caching Dependencies

```yaml
- name: Set up Node.js ${{ matrix.node-version }}
  uses: actions/setup-node@v4
  with:
    node-version: ${{ matrix.node-version }}
    cache: "npm"
    cache-dependency-path: ./gather-frontend/package-lock.json
```

Installing dependencies is often the slowest step in CI. Caching stores the installed packages between runs. The `cache` option on `actions/setup-node` automatically caches the npm cache directory. If your `package-lock.json` hasn't changed since the last run, the cached packages are restored instead of downloaded again. This can cut minutes off your CI time.

For Python, the `actions/setup-python` action has a similar `cache: "pip"` option.

---

## Service Containers

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_DB: gather_test
      POSTGRES_USER: gather_user
      POSTGRES_PASSWORD: gather_password
    ports:
      - 5432:5432
```

The backend tests need a PostgreSQL database. GitHub Actions lets you define service containers that run alongside your job. This Postgres container starts before your steps run and is accessible at `localhost:5432`. The health check ensures the database is ready before tests execute.

This is similar to the `db` service in your Docker Compose file, but managed by GitHub Actions instead.

---

## Secrets Management

Notice that the test workflow uses hardcoded test credentials. That is fine for test databases. But your CD workflow will need real credentials (API keys, deployment tokens). Never put those in your workflow file.

GitHub provides encrypted secrets that are injected as environment variables at runtime:

1. Go to your repo on GitHub.
2. Navigate to Settings, then Secrets and variables, then Actions.
3. Click "New repository secret."
4. Add your secret (e.g., `RAILWAY_TOKEN`).

Reference it in your workflow:

```yaml
env:
  RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

Secrets are masked in logs. If a step accidentally prints a secret, GitHub replaces it with `***`. They are not available to workflows triggered by pull requests from forks, which prevents external contributors from stealing your credentials.

---

## The CD Workflow

Once CI is green, you want to deploy automatically on merge to main. Here is a separate workflow for deployment:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  # Run CI checks first
  ci:
    uses: ./.github/workflows/ci.yml

  deploy-backend:
    name: Deploy Backend to Railway
    runs-on: ubuntu-latest
    needs: ci
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: railway up --service gather-backend

  deploy-frontend:
    name: Deploy Frontend to Vercel
    runs-on: ubuntu-latest
    needs: ci
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Vercel CLI
        run: npm install -g vercel

      - name: Deploy to Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: vercel deploy --prod --token=$VERCEL_TOKEN
```

The `needs: ci` line ensures deployment only happens after all CI checks pass. If any test fails, deployment is skipped. The `ci` job uses a reusable workflow reference (`uses: ./.github/workflows/ci.yml`) to avoid duplicating the CI configuration.

---

## Branch Protection Rules

CI is only effective if you actually require it to pass before merging. GitHub's branch protection rules enforce this:

1. Go to your repo's Settings, then Branches.
2. Click "Add rule" for the `main` branch.
3. Enable "Require status checks to pass before merging."
4. Select your CI jobs (Frontend Checks, Backend Checks).
5. Enable "Require pull request reviews before merging" (optional but recommended).

With these rules in place, no one can merge a PR with failing tests, not even repo admins (unless they choose to bypass). This is the enforcement mechanism that makes CI meaningful.

---

## Status Badges

Add a status badge to your README so everyone can see whether CI is passing at a glance:

```markdown
![CI](https://github.com/your-username/gather/actions/workflows/ci.yml/badge.svg)
```

This renders as a green "passing" or red "failing" badge. It builds trust with contributors and makes the project look professional.

---

## Key Takeaways

1. Continuous Integration automatically builds and tests your code on every push and pull request, catching problems before they reach production.
2. Continuous Deployment automatically deploys code that passes all checks, removing manual deployment steps and human error.
3. GitHub Actions workflows are YAML files in `.github/workflows/` with triggers, jobs, and steps.
4. Matrix strategies test your code across multiple runtime versions (Node 18/20, Python 3.11/3.12) in parallel.
5. Dependency caching speeds up CI by reusing installed packages between runs when lock files haven't changed.
6. Secrets management keeps sensitive credentials (API keys, deploy tokens) encrypted and out of your workflow files.
7. Branch protection rules enforce that CI must pass before a PR can be merged, making automated checks mandatory rather than optional.

## Try It Yourself

Create a `.github/workflows/ci.yml` file for a personal project (or a fresh test repo). Start with just one job that checks out the code and runs your existing test suite. Push it to GitHub and watch the Actions tab to see it run. Then add a second job for linting. Once both jobs pass, enable branch protection to require them.

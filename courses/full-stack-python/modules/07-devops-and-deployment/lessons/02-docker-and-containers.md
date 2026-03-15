---
title: "Docker and Containers"
estimatedMinutes: 40
---

# Docker and Containers

In the last lesson, you listed every manual step needed to run Gather from scratch. Installing Python, installing Node, setting up Postgres, creating virtual environments, running migrations, configuring environment variables. It is a lot. And if any version is slightly different from what you tested with, things break in confusing ways.

Docker eliminates this entire class of problem. You define your environment once in a file, and Docker builds an identical copy of that environment every time, on any machine. Your teammate on Windows, your CI server running Ubuntu, your production server on Railway. They all run the exact same thing.

---

## Containers vs. Virtual Machines

You might have heard of virtual machines (VMs). A VM runs a complete operating system on top of your existing operating system. It has its own kernel, its own filesystem, its own network stack. VMs are fully isolated, but they are heavy. Each VM might consume gigabytes of RAM and take minutes to start.

Containers take a different approach. Instead of running a full operating system, a container shares the host machine's kernel and only packages the application code, libraries, and configuration needed to run. This makes containers lightweight (megabytes instead of gigabytes) and fast (they start in seconds instead of minutes).

| Feature | Virtual Machine | Container |
|---|---|---|
| Isolation | Full OS with its own kernel | Shares host kernel, isolated filesystem |
| Size | Gigabytes | Megabytes |
| Startup time | Minutes | Seconds |
| Resource usage | Heavy (each VM runs a full OS) | Light (only app + dependencies) |
| Use case | Running different operating systems | Packaging and deploying applications |

For our purposes, containers are the right tool. We don't need to run a different operating system. We need to package our Django app with Python 3.12 and our Next.js app with Node 20, make sure they have the right dependencies, and run them together.

---

## Images vs. Containers

Two terms you will see constantly: **image** and **container**. An image is a blueprint. A container is a running instance of that blueprint.

Think of it like a class and an object in programming. The class defines the structure. The object is a live instance with its own state. You can create multiple containers from the same image, each running independently.

You build an image from a Dockerfile. You run a container from an image.

```bash
docker build -t gather-backend .    # Build an image called "gather-backend"
docker run gather-backend            # Start a container from that image
```

---

## Writing the Django Dockerfile

A Dockerfile is a text file with instructions that tell Docker how to build an image. Each instruction creates a layer, and Docker caches layers to speed up subsequent builds. Here is the Dockerfile for the Gather Django backend.

Create a file called `Dockerfile` in your `gather-backend/` directory:

```dockerfile
# Use the official Python 3.12 slim image as the base
FROM python:3.12-slim

# Set environment variables
# PYTHONDONTWRITEBYTECODE: prevents Python from writing .pyc files
# PYTHONUNBUFFERED: ensures output is sent straight to the terminal
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory inside the container
WORKDIR /app

# Install system dependencies needed for psycopg2
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (Docker layer caching optimization)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Collect static files for production
RUN python manage.py collectstatic --noinput

# Expose port 8000
EXPOSE 8000

# Run the application with gunicorn
CMD ["gunicorn", "gather_backend.wsgi:application", "--bind", "0.0.0.0:8000"]
```

Walk through each instruction:

**FROM python:3.12-slim** sets the base image. The `slim` variant includes Python and essential system tools but leaves out extras like compilers and documentation. It is smaller and more secure than the full image.

**ENV** sets environment variables that persist throughout the container's life. `PYTHONDONTWRITEBYTECODE` keeps the container clean. `PYTHONUNBUFFERED` ensures you see log output immediately.

**WORKDIR /app** creates a directory called `/app` inside the container and makes it the current directory for all subsequent instructions. Similar to running `cd /app`, but it also creates the directory if it does not exist.

**RUN apt-get** installs system-level packages. We need `gcc` and `libpq-dev` to compile `psycopg2`, the PostgreSQL adapter. The `rm -rf /var/lib/apt/lists/*` at the end cleans up the package cache to keep the image small.

**COPY requirements.txt .** copies just the requirements file first. This is a deliberate optimization. Docker caches each layer. If your requirements haven't changed, Docker reuses the cached layer from the next `RUN pip install` step, skipping a potentially slow dependency install. If you copied all files first, any code change would invalidate the cache and force a full reinstall.

**COPY . .** copies the rest of your application code into the container.

**EXPOSE 8000** documents which port the container listens on. It does not actually publish the port (that happens at runtime).

**CMD** specifies the default command when the container starts. Gunicorn is a production-grade WSGI server for Python. It replaces the `python manage.py runserver` command you use in development.

---

## The .dockerignore File

Just like `.gitignore` keeps files out of your Git repo, `.dockerignore` keeps files out of your Docker image. Without it, Docker copies everything in the build context (your project directory) into the image, including things you definitely do not want there.

Create a `.dockerignore` in your `gather-backend/` directory:

```
.venv/
__pycache__/
*.pyc
.env
.git/
.gitignore
*.md
.pytest_cache/
db.sqlite3
```

This keeps virtual environments, compiled Python files, secrets, and Git history out of your production image. The result is a smaller, faster, more secure image.

---

## Multi-Stage Build for Next.js

The Next.js Dockerfile is more interesting because it uses a multi-stage build. The idea: use one stage to build your application (which requires dev dependencies like TypeScript, ESLint, etc.) and a separate stage to run it (which only needs the production output). This dramatically reduces the final image size.

Create a `Dockerfile` in your `gather-frontend/` directory:

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only what's needed to run
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

Three stages, each with a clear purpose:

1. **deps** installs node_modules. `npm ci` (clean install) is faster and more deterministic than `npm install` because it installs exactly what is in the lock file.
2. **builder** copies in the source code and runs `npm run build`. This compiles TypeScript, optimizes assets, and generates the production bundle.
3. **runner** starts from a clean Alpine image and copies only the built output. No source code, no dev dependencies, no TypeScript compiler. Just the files needed to serve the app.

The `--chown=nextjs:nodejs` flag sets file ownership so the app runs as a non-root user. This is a security best practice. If an attacker exploits a vulnerability in your app, they get limited permissions instead of root access.

For this multi-stage build to work, you need standalone output mode in your `next.config.js`:

```typescript
const nextConfig = {
  output: "standalone",
};

export default nextConfig;
```

Create a `.dockerignore` in your `gather-frontend/` directory:

```
node_modules/
.next/
.env*
.git/
.gitignore
*.md
```

---

## Docker Compose: Running the Full Stack

You now have Dockerfiles for both services. But running `docker build` and `docker run` separately for each service, plus managing a PostgreSQL container, is tedious. Docker Compose lets you define all your services in one file and manage them with a single command.

Create a `docker-compose.yml` in your project root (the directory that contains both `gather-backend/` and `gather-frontend/`):

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: gather
      POSTGRES_USER: gather_user
      POSTGRES_PASSWORD: gather_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gather_user -d gather"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./gather-backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgres://gather_user:gather_password@db:5432/gather
      SECRET_KEY: django-insecure-local-dev-key
      DEBUG: "True"
      ALLOWED_HOSTS: localhost,127.0.0.1,backend
      CORS_ALLOWED_ORIGINS: http://localhost:3000
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./gather-backend:/app

  frontend:
    build:
      context: ./gather-frontend
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000/api
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

Walk through the key concepts:

**services** defines each container in your stack. We have three: `db` (PostgreSQL), `backend` (Django), and `frontend` (Next.js).

**image: postgres:16-alpine** pulls a pre-built PostgreSQL image from Docker Hub. No Dockerfile needed for the database.

**environment** sets environment variables inside the container. Notice that `DATABASE_URL` uses `db` as the hostname, not `localhost`. Inside Docker Compose, services refer to each other by their service name. The `db` service is reachable at the hostname `db` on port 5432.

**volumes** with `postgres_data:/var/lib/postgresql/data` creates a named volume. Without this, your database data would disappear every time you stop the container. Named volumes persist data between container restarts. The `./gather-backend:/app` bind mount in the backend service maps your local code directory into the container, so code changes are reflected without rebuilding the image.

**depends_on** with `condition: service_healthy` tells Docker Compose to wait until PostgreSQL passes its health check before starting the backend. Without this, Django might try to connect to the database before it is ready.

**ports** maps container ports to host ports. `"8000:8000"` means port 8000 on your machine maps to port 8000 inside the container.

---

## Essential Docker Compose Commands

With your `docker-compose.yml` in place, here are the commands you will use daily:

```bash
# Build images and start all services
docker compose up --build

# Start services in the background (detached mode)
docker compose up -d

# View logs from all services
docker compose logs

# View logs from a specific service, following new output
docker compose logs -f backend

# Stop all services
docker compose down

# Stop all services AND delete the database volume
docker compose down -v

# Run a one-off command in a service container
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser

# Rebuild a single service
docker compose build backend
```

The most common workflow: run `docker compose up --build` the first time, then `docker compose up` on subsequent runs (Docker caches the build). When you change dependencies (requirements.txt or package.json), rebuild with `--build`.

To run Django migrations after starting the stack:

```bash
docker compose exec backend python manage.py migrate
```

This runs the `migrate` command inside the already-running `backend` container. You can use `exec` to run any command: a Django shell, a database dump, running tests.

---

## Putting It All Together

Start the entire Gather stack:

```bash
docker compose up --build
```

Docker will build the backend image (installing Python dependencies, copying code), build the frontend image (installing node_modules, running the Next.js build), pull the PostgreSQL image, create the network and volume, and start all three containers. The first build takes a few minutes. Subsequent builds are faster thanks to layer caching.

Once everything is running, open `http://localhost:3000` to see the Next.js frontend and `http://localhost:8000/api/` to see the Django API. They are running in isolated containers but communicating over a Docker network that Compose created automatically.

Any new contributor can clone your repo and run `docker compose up --build`. No Python version conflicts. No missing Postgres installation. No "works on my machine." One command, full stack, every time.

---

## Key Takeaways

1. Containers package your application with all its dependencies into a portable, reproducible unit that runs identically on any machine.
2. Docker images are blueprints built from Dockerfiles. Containers are running instances of images.
3. Layer caching in Dockerfiles makes builds faster. Copy dependency files first and install them before copying source code.
4. Multi-stage builds reduce image size by separating the build environment from the production runtime.
5. Docker Compose defines multi-service applications in a single YAML file, replacing manual container orchestration with one command.
6. Named volumes persist data (like database files) between container restarts. Bind mounts map local directories into containers for live development.
7. Services in a Docker Compose network reference each other by service name (e.g., `db` instead of `localhost`).

## Try It Yourself

Write a `Dockerfile` for a simple Python Flask application that returns "Hello, Gather!" on the root route. Then write a `docker-compose.yml` that runs both the Flask app and a Redis container. The Flask app should connect to Redis using the service name `redis` as the hostname. Test that `docker compose up --build` starts both services and that you can reach the Flask app at `http://localhost:5000`.

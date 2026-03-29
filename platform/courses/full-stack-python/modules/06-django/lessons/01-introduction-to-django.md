---
title: "Introduction to Django"
estimatedMinutes: 30
---

# Introduction to Django

You've built backends with Express. You know how to set up routes, wire up middleware, connect to a database, and send JSON responses. That experience is about to pay off in a big way, because Django follows many of the same patterns. The difference is that Django ships with almost everything built in, while Express makes you assemble the pieces yourself.

Think about what it takes to get a basic Express API running. You install Express, then you go find a router structure, an ORM (Sequelize, Knex, Prisma), an authentication library, a validation layer, a migration tool, an admin panel, and maybe a CORS package. Each one has its own docs, its own configuration, its own version compatibility. Django ships with all of that out of the box. Database ORM, migrations, authentication, admin interface, form validation, CSRF protection, session management, and more. This is what the Django community calls "batteries included."

That philosophy is not about being opinionated for the sake of it. It means that Django projects tend to look similar to each other. When you join a new Django codebase, you already know where the models live, how URLs are routed, and where the settings are configured. Compare that to the wild variation you see across Express projects, where every team has a different folder structure and a different stack of packages.

In this module, you'll build the backend for Gather (our community event platform) using Django and Django REST Framework. By the end, you'll have a fully functional REST API with models, authentication, permissions, tests, and a deployment pipeline.

---

## Installing Django and Django REST Framework

Make sure you have your virtual environment active from Module 05. If you need a refresher, create a new one:

```bash
mkdir gather-backend && cd gather-backend
python3 -m venv .venv
source .venv/bin/activate
```

Now install Django and Django REST Framework (DRF). DRF is the standard library for building APIs with Django. Almost every Django API project uses it.

```bash
pip install django djangorestframework
pip freeze > requirements.txt
```

That `pip freeze` command saves your exact package versions, similar to how `package-lock.json` works in Node.

---

## Creating the Project

Django has a built-in command for scaffolding projects:

```bash
django-admin startproject gather_backend .
```

The dot at the end tells Django to create the project in the current directory instead of nesting it inside another folder. Here's what you get:

```
gather-backend/
├── manage.py
├── requirements.txt
├── gather_backend/
│   ├── __init__.py
│   ├── asgi.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
└── .venv/
```

If this looks unfamiliar, here's how it maps to an Express project:

| Django File | Express Equivalent | Purpose |
|---|---|---|
| `manage.py` | `npx` / npm scripts | CLI tool for running commands (server, migrations, shell) |
| `settings.py` | `config.js` or `.env` loader | All project configuration in one place |
| `urls.py` | `app.use()` route mounting | Top-level URL routing |
| `wsgi.py` / `asgi.py` | `server.js` / `app.listen()` | Entry point for the web server |
| `__init__.py` | (no equivalent) | Marks directory as a Python package |

The `gather_backend/` inner folder is your project configuration package. It contains settings and the root URL configuration. Think of it as the control center.

---

## Creating an App

Django organizes code into "apps," which are self-contained modules with their own models, views, URLs, and tests. A single Django project can contain multiple apps. This is different from Express, where you typically organize by feature folders or route files within one application.

Create the events app:

```bash
python3 manage.py startapp events
```

This generates:

```
events/
├── __init__.py
├── admin.py          # Admin panel configuration
├── apps.py           # App metadata
├── migrations/       # Database migration files (auto-generated)
│   └── __init__.py
├── models.py         # Data models (like Sequelize/Prisma models)
├── tests.py          # Tests (built-in test runner)
└── views.py          # Request handlers (like Express route handlers)
```

Now register the app in your project. Open `gather_backend/settings.py` and add both `events` and `rest_framework` to `INSTALLED_APPS`:

```python
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    # Local
    "events",
]
```

Notice all the `django.contrib` packages already listed. That's the "batteries included" philosophy in action. You get an admin panel, authentication, sessions, and static file serving without installing anything extra.

---

## The settings.py File

This is the single configuration file for your entire Django project. In Express, you might scatter configuration across environment variables, a config module, middleware setup calls, and package-specific config files. Django puts it all in one place.

Here are the key settings to understand right now:

```python
# Database configuration - defaults to SQLite (good for development)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# Middleware - runs on every request, like Express middleware
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# Where Django looks for the root URL configuration
ROOT_URLCONF = "gather_backend.urls"
```

The `MIDDLEWARE` list works like Express middleware, but the order is predefined and each middleware handles a specific concern. In Express, you'd write `app.use(cors())`, `app.use(session())`, `app.use(express.json())` one by one. Django declares them all in this list.

The database defaults to SQLite, which is perfect for development. You don't need to install or configure anything. No Docker, no running a Postgres server. Just start coding and the database file appears automatically. You'll switch to PostgreSQL when you deploy.

---

## The Request Lifecycle

When a request hits your Django server, here's what happens:

```
HTTP Request
    ↓
WSGI Server (development: runserver, production: gunicorn)
    ↓
Middleware Stack (top to bottom)
    ↓
URL Router (urls.py) → matches URL pattern to a view
    ↓
View Function/Class → processes request, talks to models
    ↓
Response Object
    ↓
Middleware Stack (bottom to top)
    ↓
HTTP Response
```

Compare this to Express:

```
HTTP Request
    ↓
Express Server (app.listen)
    ↓
Middleware Chain (in order of app.use)
    ↓
Router → matches URL pattern to a handler
    ↓
Route Handler → processes request
    ↓
Response (res.json / res.send)
    ↓
HTTP Response
```

The flow is nearly identical. The main difference is that Django's middleware runs in both directions (request going in, response going out), while Express middleware typically runs in one direction with `next()` calls.

---

## Your First View

Let's wire up a simple endpoint to prove everything works. Open `events/views.py`:

```python
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def health_check(request):
    return Response({"status": "ok", "app": "Gather Backend"})
```

In Express, that would look like:

```javascript
// Express equivalent
app.get("/api/health/", (req, res) => {
  res.json({ status: "ok", app: "Gather Backend" });
});
```

Now create a URL configuration for the events app. Create a new file, `events/urls.py`:

```python
from django.urls import path
from . import views

urlpatterns = [
    path("health/", views.health_check, name="health-check"),
]
```

And connect it to the project's root URL configuration. Open `gather_backend/urls.py`:

```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("events.urls")),
]
```

The `include()` function works like Express's `app.use("/api", eventsRouter)`. It mounts all the URLs from `events/urls.py` under the `/api/` prefix. So your health check endpoint lives at `/api/health/`.

---

## Running the Development Server

Start the server:

```bash
python3 manage.py runserver
```

You'll see output like:

```
Watching for file changes with StatReloader
Performing system checks...

System check identified no issues (0 silenced).

You have 18 unapplied migration(s)...
Run 'python manage.py migrate' to apply them.

March 14, 2026 - 12:00:00
Django version 5.1, using settings 'gather_backend.settings'
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
```

The warning about unapplied migrations is normal. Django's built-in apps (auth, sessions, admin) come with their own migrations. Run them now:

```bash
python3 manage.py migrate
```

This creates all the default tables (users, sessions, groups, permissions) in your SQLite database. Think of it as running the initial schema setup.

Now visit `http://127.0.0.1:8000/api/health/` in your browser. You'll see something unexpected: a nicely formatted HTML page showing your JSON response, with buttons for different HTTP methods and a form for submitting data. This is DRF's Browsable API, a built-in web interface for testing your endpoints. It's like having Postman built into your API. Try the same URL with `curl` and you'll get plain JSON:

```bash
curl http://127.0.0.1:8000/api/health/
```

```json
{"status":"ok","app":"Gather Backend"}
```

---

## Django vs Express: A Quick Reference

Here's a reference table for the patterns you'll encounter throughout this module:

| Concept | Express | Django |
|---|---|---|
| Install | `npm install express` | `pip install django` |
| Scaffold | `express-generator` (optional) | `django-admin startproject` |
| Feature module | Router file | App (`startapp`) |
| Configuration | Scattered (env, config files) | `settings.py` (centralized) |
| Database ORM | Sequelize / Prisma / Knex | Built-in ORM |
| Migrations | Sequelize CLI / Prisma migrate | `makemigrations` + `migrate` |
| Auth | passport.js / custom | Built-in `django.contrib.auth` |
| Admin panel | Build your own or use AdminBro | Built-in `django.contrib.admin` |
| Dev server | `node server.js` or `nodemon` | `manage.py runserver` (auto-reloads) |
| Test runner | Jest / Mocha / Vitest | Built-in `manage.py test` |
| Package lock | `package-lock.json` | `requirements.txt` (manual freeze) |

---

## Key Takeaways

1. Django follows a "batteries included" philosophy, shipping with an ORM, migrations, authentication, admin panel, and testing framework out of the box. Express requires you to choose and install each piece separately.
2. Django projects are organized into "apps" that encapsulate models, views, URLs, and tests. This is similar to feature-based folder organization in Express, but more formalized.
3. The `settings.py` file centralizes all project configuration, unlike Express where config is often scattered across multiple files and environment variable loaders.
4. Django's request lifecycle (middleware, URL routing, view, response) mirrors the Express flow closely. The middleware stack and URL-to-handler matching work the same conceptually.
5. Django REST Framework (DRF) adds API-specific tools on top of Django, including the Browsable API, which gives you a built-in web interface for testing endpoints.
6. The `manage.py` script is your CLI tool for everything: running the server, creating migrations, opening a shell, running tests, and more.
7. Django's development server auto-reloads on file changes, just like `nodemon` in the Node ecosystem.

---

## Try It Yourself

1. Add a second endpoint, `api/info/`, that returns a JSON response with the Gather platform name, version number, and a list of available features (events, RSVPs, categories). Wire it up in `events/urls.py` and test it in the browser and with `curl`.

2. Explore the Django admin panel. Run `python3 manage.py createsuperuser` to create an admin account, then visit `http://127.0.0.1:8000/admin/`. Log in and look around. You haven't registered any models yet, but you'll see the built-in User and Group management. Think about how much code it would take to build this in Express.

3. Open `gather_backend/settings.py` and read through every setting. For each `MIDDLEWARE` entry, look up what it does in the Django docs. Try commenting one out (like `CsrfViewMiddleware`) and see what changes. Then uncomment it, because you want that protection in production.

---
title: "Testing and Deployment"
estimatedMinutes: 35
---

# Testing and Deployment

You've built a full API with models, serializers, views, authentication, and permissions. Before shipping it to production, you need two things: tests that prove it works and a deployment setup that keeps it running. Django provides a built-in testing framework, and DRF extends it with tools specifically designed for testing APIs. On the deployment side, you'll prepare your project for Railway, a hosting platform that makes deploying Django straightforward.

In Module 04 (Testing Web Applications), you wrote tests with Jest, Vitest, and Cypress. The concepts transfer directly: arrange your test data, act by calling a function or endpoint, and assert that the result matches your expectation. Django's test runner is similar to Jest but uses Python's `unittest` module as its foundation.

---

## Django's Test Framework

Django's test framework gives you:

- A test runner (`python3 manage.py test`)
- A `TestCase` class with automatic database transactions (each test gets a clean database)
- A test client for making HTTP requests without a running server
- DRF's `APITestCase` with additional tools for authentication and request formatting

### Test File Organization

Tests live in `events/tests.py` by default. For larger test suites, replace it with a `tests/` directory:

```
events/
├── tests/
│   ├── __init__.py
│   ├── test_models.py
│   ├── test_serializers.py
│   └── test_views.py
```

Each test file contains test classes, and each class contains test methods. Method names must start with `test_`:

```python
from django.test import TestCase

class CategoryModelTest(TestCase):
    def test_str_returns_name(self):
        # This method will be discovered and run
        pass

    def helper_method(self):
        # This will NOT be run as a test (no "test_" prefix)
        pass
```

---

## Testing Models

Model tests verify that your data layer works correctly: field defaults, relationships, custom methods, and constraints.

```python
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from events.models import Category, Event, RSVP


class CategoryModelTest(TestCase):
    def test_str_returns_name(self):
        category = Category.objects.create(name="Workshop", slug="workshop")
        self.assertEqual(str(category), "Workshop")

    def test_ordering_is_alphabetical(self):
        Category.objects.create(name="Workshop", slug="workshop")
        Category.objects.create(name="Meetup", slug="meetup")
        Category.objects.create(name="Conference", slug="conference")
        categories = list(Category.objects.values_list("name", flat=True))
        self.assertEqual(categories, ["Conference", "Meetup", "Workshop"])


class EventModelTest(TestCase):
    def setUp(self):
        """Runs before every test method. Create shared test data here."""
        self.user = User.objects.create_user(
            username="devin",
            email="devin@gather.io",
            password="testpass123",
        )
        self.category = Category.objects.create(name="Workshop", slug="workshop")
        self.event = Event.objects.create(
            title="Django Workshop",
            description="Learn Django",
            organizer=self.user,
            category=self.category,
            location="Brooklyn, NY",
            start_time=timezone.now() + timedelta(days=7),
            end_time=timezone.now() + timedelta(days=7, hours=3),
            capacity=30,
            is_published=True,
        )

    def test_str_returns_title(self):
        self.assertEqual(str(self.event), "Django Workshop")

    def test_is_upcoming_for_future_event(self):
        self.assertTrue(self.event.is_upcoming)

    def test_is_upcoming_for_past_event(self):
        self.event.start_time = timezone.now() - timedelta(days=1)
        self.event.save()
        self.assertFalse(self.event.is_upcoming)

    def test_spots_remaining_with_no_rsvps(self):
        self.assertEqual(self.event.spots_remaining, 30)

    def test_spots_remaining_with_confirmed_rsvps(self):
        attendee = User.objects.create_user("maya", "maya@gather.io", "pass123")
        RSVP.objects.create(event=self.event, attendee=attendee, status="confirmed")
        self.assertEqual(self.event.spots_remaining, 29)

    def test_spots_remaining_excludes_cancelled_rsvps(self):
        attendee = User.objects.create_user("maya", "maya@gather.io", "pass123")
        RSVP.objects.create(event=self.event, attendee=attendee, status="cancelled")
        self.assertEqual(self.event.spots_remaining, 30)
```

The `setUp()` method runs before each test, giving every test a clean starting point. Django wraps each test in a database transaction and rolls it back afterward, so tests never interfere with each other. This is like Jest's `beforeEach`, but with automatic database cleanup.

Run the tests:

```bash
python3 manage.py test events
```

Output:

```
Found 7 test(s).
Creating test database for alias 'default'...
.......
----------------------------------------------------------------------
Ran 7 tests in 0.15s

OK
```

Django creates a separate test database automatically. You never test against your development data.

---

## Testing API Endpoints

DRF's `APITestCase` extends Django's `TestCase` with an `APIClient` that makes it easy to test API endpoints:

```python
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from events.models import Category, Event, RSVP


class EventAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="devin",
            email="devin@gather.io",
            password="testpass123",
        )
        self.token = Token.objects.create(user=self.user)
        self.category = Category.objects.create(name="Workshop", slug="workshop")
        self.event = Event.objects.create(
            title="Django Workshop",
            description="Learn Django",
            organizer=self.user,
            category=self.category,
            location="Brooklyn, NY",
            start_time=timezone.now() + timedelta(days=7),
            end_time=timezone.now() + timedelta(days=7, hours=3),
            capacity=30,
            is_published=True,
        )

    def authenticate(self):
        """Helper to set the auth token on the test client."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

    def test_list_events_returns_published_events(self):
        response = self.client.get("/api/events/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Django Workshop")

    def test_list_events_excludes_unpublished(self):
        Event.objects.create(
            title="Draft Event",
            description="Not ready",
            organizer=self.user,
            location="NYC",
            start_time=timezone.now() + timedelta(days=14),
            end_time=timezone.now() + timedelta(days=14, hours=2),
            is_published=False,
        )
        response = self.client.get("/api/events/")
        self.assertEqual(len(response.data), 1)  # Only the published event

    def test_retrieve_event_detail(self):
        response = self.client.get(f"/api/events/{self.event.pk}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Django Workshop")
        self.assertIn("spots_remaining", response.data)

    def test_create_event_requires_authentication(self):
        data = {
            "title": "New Event",
            "description": "A new event",
            "location": "Manhattan, NY",
            "start_time": "2026-05-01T18:00:00Z",
            "end_time": "2026-05-01T20:00:00Z",
            "capacity": 50,
        }
        response = self.client.post("/api/events/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_event_with_authentication(self):
        self.authenticate()
        data = {
            "title": "New Event",
            "description": "A new event",
            "location": "Manhattan, NY",
            "start_time": "2026-05-01T18:00:00Z",
            "end_time": "2026-05-01T20:00:00Z",
            "capacity": 50,
        }
        response = self.client.post("/api/events/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "New Event")
        self.assertEqual(Event.objects.count(), 2)

    def test_update_event_by_organizer(self):
        self.authenticate()
        data = {"title": "Updated Workshop"}
        response = self.client.patch(
            f"/api/events/{self.event.pk}/", data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertEqual(self.event.title, "Updated Workshop")

    def test_update_event_by_non_organizer_forbidden(self):
        other_user = User.objects.create_user("other", "other@gather.io", "pass123")
        other_token = Token.objects.create(user=other_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {other_token.key}")

        data = {"title": "Hacked Title"}
        response = self.client.patch(
            f"/api/events/{self.event.pk}/", data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_event_by_organizer(self):
        self.authenticate()
        response = self.client.delete(f"/api/events/{self.event.pk}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Event.objects.count(), 0)

    def test_retrieve_nonexistent_event_returns_404(self):
        response = self.client.get("/api/events/9999/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
```

Key patterns to notice:

**`self.client`** is DRF's `APIClient`, pre-configured for JSON requests. It works like `supertest` in the Express/Node testing world.

**`self.client.credentials()`** sets authentication headers for subsequent requests. Call it once in a helper method and all following requests are authenticated.

**`format="json"`** tells the client to send the data as JSON (sets the Content-Type header automatically).

**`response.data`** contains the parsed response body. No need to call `.json()` like you would with `fetch`.

**`self.event.refresh_from_db()`** reloads the instance from the database, picking up any changes made by the API call. Without this, the in-memory object still has the old values.

---

## Testing Auth Endpoints

```python
class AuthAPITest(APITestCase):
    def test_register_creates_user_and_returns_token(self):
        data = {
            "username": "newuser",
            "email": "new@gather.io",
            "password": "securepass123",
        }
        response = self.client.post("/api/auth/register/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["user"]["username"], "newuser")
        self.assertTrue(User.objects.filter(username="newuser").exists())

    def test_register_rejects_duplicate_username(self):
        User.objects.create_user("existing", "existing@gather.io", "pass123")
        data = {
            "username": "existing",
            "email": "new@gather.io",
            "password": "pass123",
        }
        response = self.client.post("/api/auth/register/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_returns_token(self):
        User.objects.create_user("devin", "devin@gather.io", "testpass123")
        data = {"username": "devin", "password": "testpass123"}
        response = self.client.post("/api/auth/login/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)

    def test_login_rejects_wrong_password(self):
        User.objects.create_user("devin", "devin@gather.io", "testpass123")
        data = {"username": "devin", "password": "wrongpass"}
        response = self.client.post("/api/auth/login/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
```

Run all tests:

```bash
python3 manage.py test events -v 2
```

The `-v 2` flag gives verbose output, showing each test name and result:

```
test_create_event_requires_authentication (events.tests.EventAPITest.test_create_event_requires_authentication) ... ok
test_create_event_with_authentication (events.tests.EventAPITest.test_create_event_with_authentication) ... ok
test_register_creates_user_and_returns_token (events.tests.AuthAPITest.test_register_creates_user_and_returns_token) ... ok
...
```

---

## Deployment Preparation

Getting Django ready for production requires a few configuration changes. Development settings (DEBUG=True, SQLite, no HTTPS) are dangerous in production. Here's the checklist.

### 1. Environment Variables with python-decouple

Install `python-decouple` to read settings from environment variables:

```bash
pip install python-decouple
```

Update `settings.py`:

```python
from decouple import config

SECRET_KEY = config("SECRET_KEY")
DEBUG = config("DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost").split(",")
```

Create a `.env` file for local development (never commit this):

```
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

### 2. Database Configuration with dj-database-url

Install `dj-database-url` to parse database connection strings:

```bash
pip install dj-database-url
```

```python
import dj_database_url

DATABASES = {
    "default": dj_database_url.config(
        default="sqlite:///db.sqlite3",
        conn_max_age=600,
    )
}
```

This reads the `DATABASE_URL` environment variable. If it's not set, it falls back to SQLite. Railway (and most hosting platforms) set `DATABASE_URL` automatically when you provision a PostgreSQL database.

### 3. Static Files with WhiteNoise

Django needs a way to serve static files (CSS, JS, images for the admin panel) in production. WhiteNoise handles this without a separate web server like Nginx:

```bash
pip install whitenoise
```

```python
# settings.py
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

Collect static files before deployment:

```bash
python3 manage.py collectstatic --noinput
```

### 4. Gunicorn as the WSGI Server

Django's `runserver` is for development only. Gunicorn is the standard production WSGI server:

```bash
pip install gunicorn
```

### 5. Update requirements.txt

```bash
pip freeze > requirements.txt
```

Your `requirements.txt` should include:

```
django>=5.1
djangorestframework>=3.15
python-decouple>=3.8
dj-database-url>=2.1
whitenoise>=6.6
gunicorn>=22.0
psycopg2-binary>=2.9
```

The `psycopg2-binary` package is the PostgreSQL adapter for Python. Railway provides PostgreSQL, so you need this.

---

## Deploying to Railway

Railway is a platform-as-a-service (PaaS) that makes deploying Django straightforward. It's similar to Heroku but with a more generous free tier.

### 1. Create a Procfile

Create a file named `Procfile` (no extension) in your project root:

```
web: gunicorn gather_backend.wsgi --bind 0.0.0.0:$PORT
```

This tells Railway to start Gunicorn, pointing it at your project's WSGI application.

### 2. Create a runtime.txt (Optional)

```
python-3.12
```

### 3. Deploy to Railway

1. Push your code to a GitHub repository
2. Go to [railway.app](https://railway.app) and create a new project
3. Connect your GitHub repo
4. Add a PostgreSQL database (click "New" and select "Database" then "PostgreSQL")
5. Railway automatically sets `DATABASE_URL` for you
6. Add your environment variables in the Railway dashboard:
   - `SECRET_KEY`: generate a new random key (`python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`)
   - `DEBUG`: `False`
   - `ALLOWED_HOSTS`: your Railway domain (e.g., `gather-backend-production.up.railway.app`)
7. Railway detects the Procfile and deploys automatically

### 4. Post-Deploy Verification

After deployment, run migrations on the production database. Railway lets you run commands through the dashboard or CLI:

```bash
python3 manage.py migrate
python3 manage.py createsuperuser
```

Verify your endpoints:

```bash
# Health check
curl https://your-app.up.railway.app/api/health/

# Register a user
curl -X POST https://your-app.up.railway.app/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "email": "test@gather.io", "password": "testpass123"}'

# List events
curl https://your-app.up.railway.app/api/events/
```

Check the admin panel at `https://your-app.up.railway.app/admin/` to confirm everything is working.

---

## Production Settings Checklist

Before going live, verify these settings in `settings.py`:

```python
# Security
DEBUG = False  # NEVER True in production
SECRET_KEY = config("SECRET_KEY")  # From environment, not hardcoded
ALLOWED_HOSTS = config("ALLOWED_HOSTS").split(",")

# HTTPS
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=True, cast=bool)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000  # 1 year

# Browsable API disabled in production
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
}
```

---

## Key Takeaways

1. Django's test framework provides `TestCase` with automatic database transactions, so each test starts with a clean database. DRF's `APITestCase` adds an `APIClient` for testing endpoints without a running server.
2. The `setUp()` method creates shared test data before each test, similar to Jest's `beforeEach`. Use it to create users, tokens, and model instances that multiple tests need.
3. Test authentication by calling `self.client.credentials()` to set the auth token. Test permissions by making requests as different users and asserting the correct status codes (401 for unauthenticated, 403 for unauthorized).
4. Use `python-decouple` for environment variables, `dj-database-url` for database configuration, and `whitenoise` for static files. These three packages handle the biggest differences between development and production settings.
5. Gunicorn replaces Django's development server in production. The Procfile tells Railway (or any PaaS) how to start your application.
6. Always run tests before deploying (`python3 manage.py test`), and verify the deployment by hitting your health check and auth endpoints with `curl`.
7. Production security requires `DEBUG=False`, HTTPS enforcement, secure cookies, and a secret key loaded from the environment. Never ship with development defaults.

---

## Try It Yourself

1. Write tests for the RSVP flow: test that an authenticated user can RSVP to an event, that duplicate RSVPs are rejected (unique constraint), and that only the RSVP owner can cancel their RSVP. Aim for at least 4 new test methods.

2. Add a test for the serializer validation: create an `EventSerializer` with `end_time` before `start_time` and assert that `serializer.is_valid()` returns `False` with the correct error message.

3. Deploy your Gather backend to Railway. Walk through the full process: push to GitHub, connect the repo, provision a PostgreSQL database, set environment variables, and verify with `curl`. Then create a superuser and explore the admin panel on your live deployment.

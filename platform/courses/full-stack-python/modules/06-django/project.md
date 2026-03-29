---
title: "Module Project: Django REST API"
estimatedMinutes: 90
---

# Gather Backend: Django REST API

Build the complete backend for Gather, a community event platform, using Django and Django REST Framework. You'll create models, serializers, ViewSets, authentication, permissions, tests, and deploy to Railway.

## Overview

This project brings together everything from the six lessons in this module. You'll start from scratch with `django-admin startproject`, define your data models, build a full REST API with DRF ViewSets and Routers, add token-based authentication, enforce ownership-based permissions, write a comprehensive test suite, and deploy to Railway. By the end, you'll have a production-ready API that a frontend application can consume.

## What You'll Practice

- Setting up a Django project with DRF (Lesson 1)
- Defining models with relationships, custom methods, and migrations (Lesson 2)
- Building views and configuring URL routing (Lesson 3)
- Creating serializers, ViewSets, and Routers for a complete CRUD API (Lesson 4)
- Implementing token authentication and custom permissions (Lesson 5)
- Writing tests with APITestCase and deploying to Railway (Lesson 6)

## Prerequisites

- Python 3.12+ installed
- Completed all six lessons in this module
- A GitHub account (for deployment)
- A Railway account (free tier, for deployment)

## Project Setup

```bash
mkdir gather-backend && cd gather-backend
python3 -m venv .venv
source .venv/bin/activate
pip install django djangorestframework python-decouple dj-database-url whitenoise gunicorn psycopg2-binary
pip freeze > requirements.txt
django-admin startproject gather_backend .
python3 manage.py startapp events
```

Create a `.env` file for local development:

```
SECRET_KEY=django-insecure-change-me-before-deploying
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

---

## Step 1: Configure the Project

Open `gather_backend/settings.py` and configure it for development and future production use.

```python
# gather_backend/settings.py
import os
from pathlib import Path
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config("SECRET_KEY")
DEBUG = config("DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework.authtoken",
    # Local
    "events",
]

# TODO: Add WhiteNoise to MIDDLEWARE (after SecurityMiddleware)
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # TODO: Add "whitenoise.middleware.WhiteNoiseMiddleware" here
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "gather_backend.urls"

# TODO: Configure DATABASES using dj-database-url
# Use dj_database_url.config() with a SQLite fallback for local development
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# TODO: Configure REST_FRAMEWORK with default authentication and permission classes
# - DEFAULT_AUTHENTICATION_CLASSES: TokenAuthentication + SessionAuthentication
# - DEFAULT_PERMISSION_CLASSES: IsAuthenticatedOrReadOnly
REST_FRAMEWORK = {}

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# TODO: Configure STORAGES for WhiteNoise compressed static files

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]
```

---

## Step 2: Define Models

Create the data models for Gather in `events/models.py`.

```python
# events/models.py
from django.db import models
from django.conf import settings
from django.utils import timezone


class Category(models.Model):
    # TODO: Add fields
    # - name: CharField, max_length=100, unique
    # - slug: SlugField, max_length=100, unique
    # - description: TextField, blank allowed

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["name"]

    # TODO: Add __str__ method that returns the category name
    pass


class Event(models.Model):
    # TODO: Add fields
    # - title: CharField, max_length=200
    # - description: TextField
    # - organizer: ForeignKey to AUTH_USER_MODEL, CASCADE on delete, related_name="organized_events"
    # - category: ForeignKey to Category, SET_NULL on delete, null and blank allowed, related_name="events"
    # - location: CharField, max_length=300
    # - start_time: DateTimeField
    # - end_time: DateTimeField
    # - capacity: PositiveIntegerField, default=50
    # - is_published: BooleanField, default=False
    # - created_at: DateTimeField, auto_now_add
    # - updated_at: DateTimeField, auto_now

    class Meta:
        ordering = ["-start_time"]

    # TODO: Add __str__ method that returns the event title

    # TODO: Add is_upcoming property (return True if start_time is in the future)

    # TODO: Add spots_remaining property (capacity minus confirmed RSVPs)
    pass


class RSVP(models.Model):
    STATUS_CHOICES = [
        ("confirmed", "Confirmed"),
        ("waitlisted", "Waitlisted"),
        ("cancelled", "Cancelled"),
    ]

    # TODO: Add fields
    # - event: ForeignKey to Event, CASCADE on delete, related_name="rsvps"
    # - attendee: ForeignKey to AUTH_USER_MODEL, CASCADE on delete, related_name="rsvps"
    # - status: CharField, max_length=20, choices=STATUS_CHOICES, default="confirmed"
    # - created_at: DateTimeField, auto_now_add

    class Meta:
        unique_together = ["event", "attendee"]
        verbose_name = "RSVP"
        verbose_name_plural = "RSVPs"

    # TODO: Add __str__ method: "{attendee.username} - {event.title} ({status})"
    pass
```

After defining your models, generate and apply migrations:

```bash
python3 manage.py makemigrations events
python3 manage.py migrate
```

Register models in `events/admin.py`:

```python
# events/admin.py
from django.contrib import admin
from .models import Category, Event, RSVP

# TODO: Register Category with list_display=["name", "slug"] and prepopulated_fields

# TODO: Register Event with list_display, list_filter, and search_fields

# TODO: Register RSVP with list_display and list_filter
```

---

## Step 3: Create Serializers

Create `events/serializers.py` with serializers for each model.

```python
# events/serializers.py
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator
from .models import Event, Category, RSVP


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        # TODO: Set fields to ["id", "name", "slug", "description"]
        fields = []


class RSVPSerializer(serializers.ModelSerializer):
    # TODO: Add read-only fields for attendee_name (source: attendee.username)
    #       and event_title (source: event.title)

    class Meta:
        model = RSVP
        # TODO: Set fields including the nested read-only fields
        fields = []
        read_only_fields = ["created_at"]
        # TODO: Add UniqueTogetherValidator for event + attendee


class EventSerializer(serializers.ModelSerializer):
    organizer = serializers.StringRelatedField(read_only=True)
    # TODO: Add category_name field (source: category.name, read_only)
    # TODO: Add spots_remaining field (read_only IntegerField)

    class Meta:
        model = Event
        # TODO: Set fields list with all necessary fields
        fields = []
        read_only_fields = ["created_at", "updated_at"]

    # TODO: Add validate_capacity method (must be between 1 and 10000)

    # TODO: Add validate method to check end_time > start_time


class EventDetailSerializer(serializers.ModelSerializer):
    organizer = serializers.StringRelatedField(read_only=True)
    # TODO: Nest CategorySerializer for category (read_only)
    # TODO: Nest RSVPSerializer for rsvps (many=True, read_only)
    # TODO: Add spots_remaining field

    class Meta:
        model = Event
        # TODO: Set fields including nested category and rsvps
        fields = []
```

---

## Step 4: Build ViewSets and Register with Router

Create ViewSets in `events/views.py` and register them in `events/urls.py`.

```python
# events/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from .models import Event, Category, RSVP
from .serializers import (
    EventSerializer,
    EventDetailSerializer,
    CategorySerializer,
    RSVPSerializer,
)
# TODO: Import your custom permissions (you'll create them in Step 5)


@api_view(["GET"])
def health_check(request):
    return Response({"status": "ok", "app": "Gather Backend"})


# TODO: Create register view
# - Accept POST with username, email, password
# - Validate all fields are present
# - Check for duplicate username and email
# - Create user and token
# - Return user data and token with 201 status
@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    pass


# TODO: Create login view
# - Accept POST with username and password
# - Validate credentials
# - Return user data and token
# - Return 401 for invalid credentials
@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    pass


class CategoryViewSet(viewsets.ModelViewSet):
    # TODO: Set queryset, serializer_class, and lookup_field="slug"
    pass


class EventViewSet(viewsets.ModelViewSet):
    # TODO: Set queryset (filter for published events only)
    # TODO: Set permission_classes

    # TODO: Implement get_serializer_class to return EventDetailSerializer
    #       for retrieve action and EventSerializer for everything else

    # TODO: Implement perform_create to set organizer to request.user
    pass


class RSVPViewSet(viewsets.ModelViewSet):
    serializer_class = RSVPSerializer
    # TODO: Set permission_classes

    # TODO: Implement get_queryset to filter by event_pk from URL kwargs

    # TODO: Implement perform_create to set attendee and event_id
    pass
```

```python
# events/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
# TODO: Register EventViewSet and CategoryViewSet with the router

app_name = "events"

urlpatterns = [
    path("health/", views.health_check, name="health-check"),
    path("auth/register/", views.register, name="register"),
    path("auth/login/", views.login, name="login"),
    path("", include(router.urls)),
    # TODO: Add nested RSVP route: events/<int:event_pk>/rsvps/
]
```

Wire the app URLs into the project:

```python
# gather_backend/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("events.urls")),
]
```

---

## Step 5: Add Authentication and Custom Permissions

Create `events/permissions.py` with a custom permission class.

```python
# events/permissions.py
from rest_framework import permissions


class IsEventOrganizer(permissions.BasePermission):
    """
    Only the event organizer can edit or delete the event.
    Read access is allowed for everyone.
    """

    # TODO: Implement has_object_permission
    # - Allow all SAFE_METHODS (GET, HEAD, OPTIONS)
    # - For write methods, check obj.organizer == request.user
    pass


class IsRSVPOwnerOrAdmin(permissions.BasePermission):
    """
    Only the RSVP attendee or an admin can modify/delete the RSVP.
    """

    # TODO: Implement has_object_permission
    # - Allow all SAFE_METHODS
    # - For write methods, check obj.attendee == request.user or request.user.is_staff
    pass
```

Go back to `events/views.py` and import these permissions. Apply `IsEventOrganizer` to `EventViewSet` and `IsRSVPOwnerOrAdmin` to `RSVPViewSet`.

---

## Step 6: Run the Server and Test Manually

Apply all migrations and start the server:

```bash
python3 manage.py migrate
python3 manage.py runserver
```

Test the full flow with `curl`:

```bash
# Health check
curl http://127.0.0.1:8000/api/health/

# Register
curl -X POST http://127.0.0.1:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username": "devin", "email": "devin@gather.io", "password": "testpass123"}'

# Login
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "devin", "password": "testpass123"}'

# Create a category (use your token)
curl -X POST http://127.0.0.1:8000/api/categories/ \
  -H "Authorization: Token YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"name": "Workshop", "slug": "workshop", "description": "Hands-on learning"}'

# Create an event
curl -X POST http://127.0.0.1:8000/api/events/ \
  -H "Authorization: Token YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"title": "Django Workshop", "description": "Learn Django", "location": "Brooklyn, NY", "start_time": "2026-04-01T18:00:00Z", "end_time": "2026-04-01T21:00:00Z", "capacity": 30, "category": 1, "is_published": true}'

# List events
curl http://127.0.0.1:8000/api/events/

# Get event detail
curl http://127.0.0.1:8000/api/events/1/

# RSVP to the event
curl -X POST http://127.0.0.1:8000/api/events/1/rsvps/ \
  -H "Authorization: Token YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"event": 1, "attendee": 1}'
```

### Expected Output

**GET /api/events/**:
```json
[
    {
        "id": 1,
        "title": "Django Workshop",
        "description": "Learn Django",
        "organizer": "devin",
        "category": 1,
        "category_name": "Workshop",
        "location": "Brooklyn, NY",
        "start_time": "2026-04-01T18:00:00Z",
        "end_time": "2026-04-01T21:00:00Z",
        "capacity": 30,
        "spots_remaining": 30,
        "is_published": true,
        "created_at": "2026-03-14T12:00:00Z",
        "updated_at": "2026-03-14T12:00:00Z"
    }
]
```

**GET /api/events/1/**:
```json
{
    "id": 1,
    "title": "Django Workshop",
    "description": "Learn Django",
    "organizer": "devin",
    "category": {
        "id": 1,
        "name": "Workshop",
        "slug": "workshop",
        "description": "Hands-on learning"
    },
    "location": "Brooklyn, NY",
    "start_time": "2026-04-01T18:00:00Z",
    "end_time": "2026-04-01T21:00:00Z",
    "capacity": 30,
    "spots_remaining": 29,
    "is_published": true,
    "rsvps": [
        {
            "id": 1,
            "event": 1,
            "event_title": "Django Workshop",
            "attendee": 1,
            "attendee_name": "devin",
            "status": "confirmed",
            "created_at": "2026-03-14T12:05:00Z"
        }
    ],
    "created_at": "2026-03-14T12:00:00Z",
    "updated_at": "2026-03-14T12:00:00Z"
}
```

---

## Step 7: Write Tests

Create `events/tests.py` with at least 10 tests covering models, authentication, and API endpoints.

```python
# events/tests.py
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from .models import Category, Event, RSVP


class CategoryModelTest(TestCase):
    # TODO: Test __str__ returns the category name
    # TODO: Test ordering is alphabetical
    pass


class EventModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("devin", "devin@gather.io", "pass123")
        self.event = Event.objects.create(
            title="Test Event",
            description="A test event",
            organizer=self.user,
            location="Brooklyn, NY",
            start_time=timezone.now() + timedelta(days=7),
            end_time=timezone.now() + timedelta(days=7, hours=3),
            capacity=30,
            is_published=True,
        )

    # TODO: Test __str__ returns the title
    # TODO: Test is_upcoming returns True for future events
    # TODO: Test spots_remaining returns capacity when no RSVPs exist
    # TODO: Test spots_remaining decreases with confirmed RSVPs
    pass


class AuthAPITest(APITestCase):
    # TODO: Test registration creates user and returns token
    # TODO: Test registration rejects duplicate username
    # TODO: Test login returns token with valid credentials
    # TODO: Test login rejects wrong password
    pass


class EventAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("devin", "devin@gather.io", "pass123")
        self.token = Token.objects.create(user=self.user)
        self.event = Event.objects.create(
            title="Test Event",
            description="A test",
            organizer=self.user,
            location="Brooklyn, NY",
            start_time=timezone.now() + timedelta(days=7),
            end_time=timezone.now() + timedelta(days=7, hours=3),
            capacity=30,
            is_published=True,
        )

    def authenticate(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

    # TODO: Test list events returns published events
    # TODO: Test create event requires authentication (expect 401)
    # TODO: Test create event with valid token succeeds (expect 201)
    # TODO: Test update event by organizer succeeds
    # TODO: Test update event by non-organizer returns 403
    # TODO: Test delete event by organizer succeeds
    pass
```

Run your tests:

```bash
python3 manage.py test events -v 2
```

All tests should pass. Aim for at least 10 passing tests before moving on to deployment.

---

## Step 8: Deploy to Railway

1. Initialize a git repository and push to GitHub:

```bash
git init
echo ".venv/\ndb.sqlite3\n.env\n__pycache__/\n*.pyc\nstaticfiles/" > .gitignore
git add .
git commit -m "feat: complete Gather backend with DRF"
git remote add origin https://github.com/YOUR_USERNAME/gather-backend.git
git push -u origin main
```

2. Create a `Procfile` in the project root:

```
web: gunicorn gather_backend.wsgi --bind 0.0.0.0:$PORT
```

3. Create a `runtime.txt`:

```
python-3.12
```

4. Go to [railway.app](https://railway.app), create a new project, and connect your GitHub repo.

5. Add a PostgreSQL database from the Railway dashboard.

6. Set environment variables in Railway:
   - `SECRET_KEY`: generate with `python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
   - `DEBUG`: `False`
   - `ALLOWED_HOSTS`: your Railway domain

7. After deployment, run migrations via Railway's CLI or dashboard.

8. Verify your endpoints with `curl` against the production URL.

---

## Stretch Goals

1. **Search and Filtering**: Add a search endpoint that accepts `?search=django&category=workshop&start_after=2026-04-01` query parameters. Use `django-filter` for declarative filtering on the ViewSet.

2. **Pagination**: Configure DRF's `PageNumberPagination` globally in `settings.py`. Set a page size of 10. Test by creating more than 10 events and verifying the paginated response includes `count`, `next`, and `previous` fields.

3. **Custom Action for RSVP**: Add an `@action(detail=True, methods=["post"])` on the EventViewSet at `/api/events/{pk}/rsvp/` that creates an RSVP for the current user. Check capacity before allowing the RSVP and return a 400 error if the event is full.

---

## Submission Checklist

- [ ] Django project runs locally with `python3 manage.py runserver`
- [ ] 4+ models defined (Category, Event, RSVP, plus Django's User)
- [ ] ModelSerializer for each model with appropriate fields and validation
- [ ] ViewSets registered with a Router, generating full CRUD endpoints
- [ ] Token-based authentication with register and login endpoints
- [ ] Custom `IsEventOrganizer` permission enforced on EventViewSet
- [ ] 10+ tests passing with `python3 manage.py test events -v 2`
- [ ] All manual `curl` tests return expected responses
- [ ] Deployed to Railway with PostgreSQL
- [ ] Production environment variables set (SECRET_KEY, DEBUG=False, ALLOWED_HOSTS)
- [ ] Health check endpoint responds on production URL

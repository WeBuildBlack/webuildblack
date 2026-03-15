---
title: "Gather Live -- SSE with Redis Pub/Sub for Live RSVP Counts"
estimatedMinutes: 75
---

# Gather Live: Real-Time RSVP Counts

Build a live RSVP system for Gather where users see the RSVP count update in real time across multiple server instances. You will implement an SSE endpoint backed by Redis Pub/Sub, connect it to a Next.js frontend, rate limit the RSVP API, and verify that updates propagate across multiple Django instances behind nginx.

## Overview

This project brings together everything from the five lessons in this module:

- SSE streaming with Django's `StreamingHttpResponse` (Lesson 2)
- Redis Pub/Sub for cross-process communication (Lesson 3)
- Multi-instance architecture with nginx (Lesson 4)
- Rate limiting and backpressure (Lesson 5)

By the end, you will have a Docker Compose stack running two Django instances behind nginx, with live RSVP updates flowing from the API through Celery and Redis Pub/Sub to every connected browser.

## What You'll Build

```
Browser (Next.js)                    Browser (Next.js)
   │  EventSource                       │  EventSource
   │  GET /api/events/1/rsvp-stream/    │  GET /api/events/1/rsvp-stream/
   │                                    │
   └──────────────┬─────────────────────┘
                  │
           ┌──────▼──────┐
           │    nginx     │
           │ (load bal.)  │
           └──────┬───────┘
           ┌──────┴──────┐
           ▼              ▼
     ┌──────────┐  ┌──────────┐
     │ Django 1 │  │ Django 2 │
     │ (gevent) │  │ (gevent) │
     └────┬─────┘  └────┬─────┘
          │              │
          └──────┬───────┘
                 │ Redis Pub/Sub subscribe
          ┌──────▼──────┐
          │    Redis     │
          └──────┬───────┘
                 │ Pub/Sub publish
          ┌──────▼──────┐
          │   Celery     │
          │   Worker     │
          └──────────────┘
```

## Prerequisites

- Docker and Docker Compose installed
- Completed Modules 1-5 of this course (or equivalent experience)
- Familiarity with the Gather codebase from previous modules

## Project Setup

Create a new directory for this project and set up the file structure:

```bash
mkdir gather-live && cd gather-live
mkdir -p backend/events frontend nginx
```

### Step 1: Backend Dependencies

Create the backend requirements file:

```
# backend/requirements.txt
django==5.1
djangorestframework==3.15
django-ratelimit==4.1
django-cors-headers==4.4
redis==5.0
celery==5.4
gunicorn==22.0
gevent==24.2
psycopg2-binary==2.9
```

### Step 2: Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  django-1:
    build: ./backend
    command: >
      gunicorn gather_backend.wsgi:application
      --bind 0.0.0.0:8000
      --workers 2
      --worker-class gevent
      --worker-connections 100
    environment:
      - REDIS_URL=redis://redis:6379/0
      - DATABASE_URL=postgres://gather:gather@postgres:5432/gather
      - DJANGO_SETTINGS_MODULE=gather_backend.settings
      - INSTANCE_NAME=django-1
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - ./backend:/app

  django-2:
    build: ./backend
    command: >
      gunicorn gather_backend.wsgi:application
      --bind 0.0.0.0:8000
      --workers 2
      --worker-class gevent
      --worker-connections 100
    environment:
      - REDIS_URL=redis://redis:6379/0
      - DATABASE_URL=postgres://gather:gather@postgres:5432/gather
      - DJANGO_SETTINGS_MODULE=gather_backend.settings
      - INSTANCE_NAME=django-2
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - ./backend:/app

  celery:
    build: ./backend
    command: celery -A gather_backend worker --loglevel=info
    environment:
      - REDIS_URL=redis://redis:6379/0
      - DATABASE_URL=postgres://gather:gather@postgres:5432/gather
      - DJANGO_SETTINGS_MODULE=gather_backend.settings
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - ./backend:/app

  nginx:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - django-1
      - django-2

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: gather
      POSTGRES_USER: gather
      POSTGRES_PASSWORD: gather
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gather"]
      interval: 5s
      timeout: 5s
      retries: 5

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8080
    depends_on:
      - nginx
    volumes:
      - ./frontend:/app
      - /app/node_modules
```

### Step 3: Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["gunicorn", "gather_backend.wsgi:application", "--bind", "0.0.0.0:8000"]
```

### Step 4: nginx Configuration

```nginx
# nginx/default.conf
upstream django_backend {
    least_conn;
    server django-1:8000;
    server django-2:8000;
}

server {
    listen 80;

    # Regular API requests
    location /api/ {
        proxy_pass http://django_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # SSE endpoints need special configuration
    # TODO: Add an SSE-specific location block for /api/events/<id>/rsvp-stream/
    # Requirements:
    # - Match URLs like /api/events/42/rsvp-stream/
    # - Disable proxy buffering
    # - Disable proxy caching
    # - Set proxy_read_timeout to 3600 seconds
    # - Set proxy_send_timeout to 3600 seconds
    # - Use HTTP/1.1
    # - Clear the Connection header
    # - Pass through Host and X-Real-IP headers
}
```

---

## Part 1: Django SSE Endpoint

Create the Django project structure:

```bash
cd backend
django-admin startproject gather_backend .
python manage.py startapp events
```

### Settings

```python
# backend/gather_backend/settings.py
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get(
    'SECRET_KEY',
    'django-insecure-dev-only-change-in-production'
)
DEBUG = os.environ.get('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'events',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'events.middleware.RateLimitMiddleware',
]

ROOT_URLCONF = 'gather_backend.urls'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'gather',
        'USER': 'gather',
        'PASSWORD': 'gather',
        'HOST': os.environ.get('DB_HOST', 'postgres'),
        'PORT': '5432',
    }
}

REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': REDIS_URL,
    }
}

CORS_ALLOW_ALL_ORIGINS = True  # Dev only. Lock this down in production.

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
}

RATELIMIT_USE_CACHE = 'default'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
```

### Celery Configuration

```python
# backend/gather_backend/celery.py
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gather_backend.settings')

app = Celery('gather_backend')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
```

```python
# backend/gather_backend/__init__.py
from .celery import app as celery_app

__all__ = ('celery_app',)
```

### Models

```python
# backend/events/models.py
from django.db import models
from django.contrib.auth.models import User


class Event(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    date = models.DateTimeField()
    capacity = models.PositiveIntegerField(default=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    @property
    def rsvp_count(self):
        return self.rsvps.count()


class RSVP(models.Model):
    event = models.ForeignKey(
        Event, on_delete=models.CASCADE, related_name='rsvps'
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('event', 'user')

    def __str__(self):
        return f"{self.user.username} -> {self.event.title}"
```

### Rate Limit Middleware

```python
# backend/events/middleware.py
from django.http import JsonResponse

# TODO: Import the Ratelimited exception from django_ratelimit
# TODO: Implement the RateLimitMiddleware class
#
# The middleware should:
# 1. Accept get_response in __init__ and store it
# 2. In __call__, just return self.get_response(request)
# 3. In process_exception, check if the exception is a Ratelimited instance
# 4. If it is, return a JsonResponse with:
#    - status=429
#    - body: {"error": "Rate limit exceeded", "detail": "Too many requests. Please try again later.", "retry_after": 60}
#    - headers: Retry-After: 60
# 5. If it's not a Ratelimited exception, return None

class RateLimitMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        # TODO: Handle Ratelimited exceptions here
        return None
```

### Celery Task

```python
# backend/events/tasks.py
import json
import redis
from celery import shared_task
from django.conf import settings


@shared_task(bind=True, max_retries=3)
def process_rsvp(self, event_id, user_id, new_count):
    """
    Process an RSVP asynchronously:
    1. Publish the updated count to Redis Pub/Sub
    """
    # TODO: Implement this task
    #
    # Steps:
    # 1. Create a Redis connection using settings.REDIS_URL
    # 2. Define the channel name as f"event:{event_id}:rsvps"
    # 3. Create a JSON payload with event_id, count, and action fields
    # 4. Publish the payload to the Redis channel
    # 5. Return a dict with status, event_id, and new_count
    #
    # Handle exceptions by retrying with exponential backoff:
    #   raise self.retry(exc=exc, countdown=2 ** self.request.retries)

    pass
```

### Views

```python
# backend/events/views.py
import json
import os
import time

import redis
from django.conf import settings
from django.http import StreamingHttpResponse, JsonResponse
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import csrf_exempt
from django_ratelimit.decorators import ratelimit
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from events.models import Event, RSVP
from events.tasks import process_rsvp


def sse_event(data, event_type=None, event_id=None):
    """Format a single SSE message."""
    message = ""
    if event_id:
        message += f"id: {event_id}\n"
    if event_type:
        message += f"event: {event_type}\n"
    message += f"data: {json.dumps(data)}\n\n"
    return message


# TODO: Implement the RSVP API endpoint
#
# Requirements:
# - POST method only
# - Allow any user for demo purposes (use @permission_classes([AllowAny]))
# - Rate limited to 10 requests per minute per IP
#   Use: @ratelimit(key='ip', rate='10/m', method='POST', block=True)
# - Check if the event exists (return 404 if not)
# - Create the RSVP (for demo, use user_id=1 or create a simple approach)
# - Get the new RSVP count
# - Queue the process_rsvp Celery task with .delay()
# - Return 201 with the rsvp_id and count

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def create_rsvp(request, event_id):
    """Create an RSVP and trigger async processing."""
    pass


# TODO: Implement the SSE streaming endpoint
#
# Requirements:
# - GET method only
# - Rate limited to 5 connections per minute per IP
# - Create a generator function called event_stream() that:
#   a. Fetches the event from the database (return error event if not found)
#   b. Sends the current RSVP count as the first event
#   c. Sends "retry: 5000\n\n" to set reconnection interval
#   d. Creates a Redis connection and subscribes to f"event:{event_id}:rsvps"
#   e. Loops forever:
#      - Calls pubsub.get_message(timeout=15)
#      - If None (timeout), yields a heartbeat comment ": heartbeat\n\n"
#      - If type is 'message', parses JSON and yields an SSE event
#   f. In a finally block, unsubscribes and closes Redis connections
# - Return StreamingHttpResponse with content_type='text/event-stream'
# - Set Cache-Control: no-cache header
# - Set X-Accel-Buffering: no header

@require_GET
def rsvp_stream(request, event_id):
    """Stream live RSVP updates via SSE."""
    pass


@require_GET
def event_detail(request, event_id):
    """Get event details with current RSVP count."""
    try:
        event = Event.objects.get(id=event_id)
    except Event.DoesNotExist:
        return JsonResponse({'error': 'Event not found'}, status=404)

    return JsonResponse({
        'id': event.id,
        'title': event.title,
        'description': event.description,
        'date': event.date.isoformat(),
        'capacity': event.capacity,
        'rsvp_count': event.rsvp_count,
    })


def health(request):
    """Health check endpoint."""
    instance = os.environ.get('INSTANCE_NAME', 'unknown')
    return JsonResponse({
        'status': 'ok',
        'instance': instance,
    })
```

### URL Configuration

```python
# backend/gather_backend/urls.py
from django.contrib import admin
from django.urls import path
from events.views import (
    create_rsvp,
    rsvp_stream,
    event_detail,
    health,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health, name='health'),
    path(
        'api/events/<int:event_id>/',
        event_detail,
        name='event-detail'
    ),
    path(
        'api/events/<int:event_id>/rsvp/',
        create_rsvp,
        name='create-rsvp'
    ),
    path(
        'api/events/<int:event_id>/rsvp-stream/',
        rsvp_stream,
        name='rsvp-stream'
    ),
]
```

### Seed Data Management Command

```python
# backend/events/management/commands/seed.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from events.models import Event


class Command(BaseCommand):
    help = 'Seed the database with sample events'

    def handle(self, *args, **options):
        # Create a test user
        user, created = User.objects.get_or_create(
            username='testuser',
            defaults={
                'email': 'test@gather.example.com',
                'is_active': True,
            }
        )
        if created:
            user.set_password('testpass123')
            user.save()
            self.stdout.write(f'Created user: {user.username}')

        # Create sample events
        events_data = [
            {
                'title': 'Brooklyn Tech Meetup',
                'description': 'Monthly community meetup for tech professionals.',
                'date': timezone.now() + timedelta(days=7),
                'capacity': 100,
            },
            {
                'title': 'Python Workshop',
                'description': 'Hands-on workshop covering Django and DRF.',
                'date': timezone.now() + timedelta(days=14),
                'capacity': 50,
            },
            {
                'title': 'Mavens I/O Conference',
                'description': 'Annual conference celebrating Black excellence in tech.',
                'date': timezone.now() + timedelta(days=30),
                'capacity': 500,
            },
        ]

        for data in events_data:
            event, created = Event.objects.get_or_create(
                title=data['title'],
                defaults=data,
            )
            if created:
                self.stdout.write(f'Created event: {event.title}')
            else:
                self.stdout.write(f'Event already exists: {event.title}')

        self.stdout.write(self.style.SUCCESS('Seed data complete.'))
```

Create the management command directory structure:

```bash
mkdir -p backend/events/management/commands
touch backend/events/management/__init__.py
touch backend/events/management/commands/__init__.py
```

---

## Part 2: Next.js Frontend

### Frontend Setup

```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
```

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
```

### Live RSVP Component

```tsx
// frontend/app/components/LiveRsvpCount.tsx
'use client';

import { useEffect, useState } from 'react';

interface LiveRsvpCountProps {
  eventId: number;
  initialCount: number;
}

// TODO: Implement the LiveRsvpCount component
//
// This component should:
// 1. Use useState for:
//    - count (initialized to initialCount)
//    - connected (boolean, starts false)
//    - lastUpdate (string or null for timestamp display)
//
// 2. Use useEffect to:
//    a. Create an EventSource pointing to
//       ${process.env.NEXT_PUBLIC_API_URL}/api/events/${eventId}/rsvp-stream/
//    b. Listen for 'rsvp_update' events (use addEventListener, not onmessage)
//    c. On each event, parse the JSON data, update count and lastUpdate
//    d. Set connected to true when the first event arrives
//    e. On error, set connected to false (EventSource reconnects automatically)
//    f. Return a cleanup function that calls source.close()
//
// 3. Render:
//    - The count in large bold text
//    - A green dot when connected, yellow dot when disconnected
//    - The last update timestamp if available
//    - A subtle animation or transition when the count changes (optional)

export function LiveRsvpCount({ eventId, initialCount }: LiveRsvpCountProps) {
  const [count, setCount] = useState(initialCount);
  const [connected, setConnected] = useState(false);

  // TODO: Add useEffect with EventSource connection

  return (
    <div className="flex items-center gap-3">
      <span className="text-4xl font-bold">{count}</span>
      <div>
        <span className="text-gray-600 text-lg">RSVPs</span>
        <div className="flex items-center gap-1 mt-1">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              connected ? 'bg-green-500' : 'bg-yellow-500'
            }`}
          />
          <span className="text-xs text-gray-400">
            {connected ? 'Live' : 'Connecting...'}
          </span>
        </div>
      </div>
    </div>
  );
}
```

### RSVP Button Component

```tsx
// frontend/app/components/RSVPButton.tsx
'use client';

import { useState } from 'react';

interface RSVPButtonProps {
  eventId: number;
}

// TODO: Implement the RSVPButton component
//
// This component should:
// 1. Use useState for status ('idle' | 'loading' | 'done' | 'error')
//    and error (string | null)
//
// 2. Implement a handleRSVP async function that:
//    a. Sets status to 'loading'
//    b. POSTs to ${process.env.NEXT_PUBLIC_API_URL}/api/events/${eventId}/rsvp/
//    c. If response status is 429, parse the body, show the rate limit message
//    d. If response status is 409, show "Already RSVPed"
//    e. If successful, set status to 'done'
//    f. On any other error, show a generic error message
//
// 3. Render:
//    - A button that calls handleRSVP on click
//    - Disabled when status is 'loading' or 'done'
//    - Error message displayed below the button when present

export function RSVPButton({ eventId }: RSVPButtonProps) {
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'done' | 'error'
  >('idle');
  const [error, setError] = useState<string | null>(null);

  const handleRSVP = async () => {
    // TODO: Implement RSVP POST with rate limit handling
  };

  return (
    <div>
      <button
        onClick={handleRSVP}
        disabled={status === 'loading' || status === 'done'}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium
                   hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors"
      >
        {status === 'loading' && 'Sending...'}
        {status === 'done' && 'RSVPed!'}
        {status === 'idle' && 'RSVP'}
        {status === 'error' && 'Try Again'}
      </button>
      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}
```

### Event Page

```tsx
// frontend/app/page.tsx

import { LiveRsvpCount } from './components/LiveRsvpCount';
import { RSVPButton } from './components/RSVPButton';

// TODO: Implement the event page
//
// This page should:
// 1. Fetch event details from the API at build/request time
//    GET ${process.env.NEXT_PUBLIC_API_URL}/api/events/1/
//    (Use a try/catch; show a fallback if the API is not available)
//
// 2. Display:
//    - Event title, description, date
//    - The LiveRsvpCount component with the initial count from the API
//    - The RSVPButton component
//    - A note explaining that updates are live across all connected browsers
//
// 3. Style it cleanly with Tailwind CSS

export default async function Home() {
  let event = null;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://nginx'}/api/events/1/`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      event = await res.json();
    }
  } catch {
    // API not available yet
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg w-full">
        <h1 className="text-3xl font-bold mb-2">
          {event?.title || 'Gather Live Demo'}
        </h1>
        <p className="text-gray-600 mb-6">
          {event?.description || 'Start the backend to see live RSVP updates.'}
        </p>

        <div className="border-t border-b py-6 my-6">
          <LiveRsvpCount
            eventId={event?.id || 1}
            initialCount={event?.rsvp_count || 0}
          />
        </div>

        <RSVPButton eventId={event?.id || 1} />

        <p className="text-xs text-gray-400 mt-6">
          Open this page in multiple browser tabs to see live updates
          propagate across all of them. The count updates are delivered
          via Server-Sent Events backed by Redis Pub/Sub.
        </p>
      </div>
    </main>
  );
}
```

---

## Part 3: Rate Limiting

Go back to the backend and complete the rate limiting implementation.

### Tasks

1. **Complete the `RateLimitMiddleware`** in `backend/events/middleware.py`. Import `Ratelimited` from `django_ratelimit.exceptions` and return a proper 429 JSON response with a `Retry-After` header.

2. **Add rate limiting to `create_rsvp`**. Use the `@ratelimit` decorator with `key='ip'`, `rate='10/m'`, and `block=True`.

3. **Add rate limiting to `rsvp_stream`**. Use `key='ip'`, `rate='5/m'`, and `block=True` to prevent connection flooding.

4. **Test rate limiting** by sending more than 10 RSVP requests in a minute:

```bash
# Send 12 rapid RSVP requests
for i in $(seq 1 12); do
  echo "Request $i:"
  curl -s -o /dev/null -w "HTTP %{http_code}" \
    -X POST http://localhost:8080/api/events/1/rsvp/
  echo ""
done

# Requests 11 and 12 should return HTTP 429
```

---

## Part 4: Cross-Instance Verification

This is the most important test. Verify that SSE updates propagate across both Django instances.

### Test Plan

1. **Start the stack:**

```bash
docker compose up -d
docker compose exec django-1 python manage.py migrate
docker compose exec django-1 python manage.py seed
```

2. **Open two SSE connections** (they may land on different instances):

```bash
# Terminal 1
curl -N http://localhost:8080/api/events/1/rsvp-stream/

# Terminal 2
curl -N http://localhost:8080/api/events/1/rsvp-stream/
```

3. **Send an RSVP:**

```bash
# Terminal 3
curl -X POST http://localhost:8080/api/events/1/rsvp/
```

4. **Verify both Terminal 1 and Terminal 2** show the updated count at the same time.

5. **Test with the browser.** Open `http://localhost:3000` in two different browser tabs. Click RSVP in one tab. Both tabs should show the count update live.

6. **Verify cross-instance by checking nginx logs:**

```bash
docker compose logs nginx | grep rsvp-stream
```

You should see the two SSE connections routed to different backend instances.

### Bonus: Load Test

Open 10 browser tabs to the event page. Then send 50 RSVPs rapidly:

```bash
for i in $(seq 1 50); do
  curl -s -X POST http://localhost:8080/api/events/1/rsvp/ &
done
wait
```

All 10 tabs should show the count updating in real time. Some requests may be rate-limited (returning 429), which is correct behavior.

---

## Completion Checklist

When you are done, verify each of these works:

- [ ] `docker compose up` starts all services without errors
- [ ] `GET /api/events/1/` returns event details with RSVP count
- [ ] `GET /api/events/1/rsvp-stream/` returns `Content-Type: text/event-stream` and streams events
- [ ] `POST /api/events/1/rsvp/` creates an RSVP and returns the new count
- [ ] SSE streams receive updates within 1 second of an RSVP being created
- [ ] Updates appear on SSE streams connected to both Django instances
- [ ] Sending more than 10 RSVPs per minute returns 429
- [ ] Opening more than 5 SSE connections per minute from the same IP returns 429
- [ ] The Next.js frontend shows live RSVP count updates
- [ ] Heartbeat comments appear every 15 seconds on idle SSE connections
- [ ] Closing a browser tab does not cause errors in the Django logs

## Stretch Goals

If you finish early, try these:

1. **Add the SSE Hub** from Lesson 4 to reduce Redis connections. Instead of one Redis subscription per SSE client, share one subscription per event per instance.

2. **Add backpressure monitoring.** Create a `/api/health/detailed/` endpoint that shows the Celery queue depth and active SSE connection count.

3. **Add a "who just RSVPed" animation.** Include the user's name in the Pub/Sub payload and show a brief toast notification on the frontend when someone RSVPs.

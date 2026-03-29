---
title: "Module Project: Gather Zero-Downtime Deploy"
estimatedMinutes: 90
---

# Gather Zero-Downtime Deploy

Build a complete zero-downtime deployment pipeline for Gather. You will implement blue-green deploys with Docker Compose and nginx, create a Terraform configuration for a staging environment, add a feature flag for the "event recommendations" feature with a 10% rollout, and practice a rollback. By the end, you will have a deployment workflow where no user ever sees a 502 error during a release.

## Overview

Right now, deploying Gather means running `docker compose down` and `docker compose up`. During that window, every request fails. In this project, you will eliminate that window entirely. You will also decouple deployment from release by gating a new feature behind a flag, so you can deploy the code and control who sees it without another deploy.

## What You'll Practice

- Blue-green deployment with Docker Compose and nginx (from Lesson 1)
- Feature flags with percentage-based rollout (from Lesson 2)
- Infrastructure as Code with Terraform and the Docker provider (from Lesson 3)
- Health checks and readiness probes (from Lesson 4)
- Configuration management for multiple environments (from Lesson 5)

## Prerequisites

- Docker and Docker Compose installed
- Terraform installed (`brew install terraform` or equivalent)
- Completed Module 07 (your Gather project has Django, PostgreSQL, Redis, Celery, nginx, and OpenTelemetry)

## Project Setup

Create the following file structure inside your Gather project. Files marked with `(starter)` contain scaffolding with `# TODO:` markers for you to complete. Files marked with `(complete)` are provided in full.

```
gather/
├── docker-compose.yml                     (starter)
├── deploy.sh                              (starter)
├── rollback.sh                            (starter)
├── nginx/
│   └── conf.d/
│       └── gather.conf                    (starter)
├── backend/
│   ├── Dockerfile                         (complete - from previous modules)
│   ├── requirements.txt                   (starter)
│   ├── gather/
│   │   ├── settings.py                    (starter)
│   │   ├── feature_flags.py              (starter)
│   │   └── urls.py                        (starter)
│   └── events/
│       ├── views.py                       (starter)
│       └── recommendations.py             (starter)
├── terraform/
│   └── staging/
│       ├── main.tf                        (starter)
│       ├── variables.tf                   (starter)
│       └── outputs.tf                     (starter)
└── scripts/
    └── smoke-test.sh                      (starter)
```

---

## Step 1: Blue-Green Docker Compose Setup

### docker-compose.yml

Set up the blue and green Django instances, shared database, Redis, and nginx:

```yaml
# docker-compose.yml

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: gather
      POSTGRES_USER: gather
      POSTGRES_PASSWORD: ${DB_PASSWORD:-gather-local}
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gather"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - gather

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
    networks:
      - gather

  django-blue:
    build: ./backend
    container_name: gather-blue
    command: gunicorn gather.wsgi:application --bind 0.0.0.0:8000 --workers 4
    environment:
      - DATABASE_URL=postgres://gather:${DB_PASSWORD:-gather-local}@db:5432/gather
      - REDIS_URL=redis://redis:6379/0
      - DEPLOYMENT_COLOR=blue
      - DJANGO_SETTINGS_MODULE=gather.settings
      # TODO: Add UNLEASH_URL and UNLEASH_API_TOKEN environment variables
      # for feature flag integration
    healthcheck:
      # TODO: Add a health check that hits your /health/ endpoint
      # Use: CMD curl -f http://localhost:8000/health/
      # Set interval to 10s, timeout to 5s, retries to 3, start_period to 30s
      test: ["CMD", "echo", "placeholder"]
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - gather

  django-green:
    build: ./backend
    container_name: gather-green
    command: gunicorn gather.wsgi:application --bind 0.0.0.0:8000 --workers 4
    environment:
      - DATABASE_URL=postgres://gather:${DB_PASSWORD:-gather-local}@db:5432/gather
      - REDIS_URL=redis://redis:6379/0
      - DEPLOYMENT_COLOR=green
      - DJANGO_SETTINGS_MODULE=gather.settings
      # TODO: Add UNLEASH_URL and UNLEASH_API_TOKEN environment variables
    healthcheck:
      # TODO: Add the same health check as django-blue
      test: ["CMD", "echo", "placeholder"]
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - gather

  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
    depends_on:
      - django-blue
      - django-green
    networks:
      - gather

  # TODO: Add an Unleash service for feature flags
  # Image: unleashorg/unleash-server:6
  # Port: 4242
  # It needs its own PostgreSQL database (unleash-db)
  # Environment: DATABASE_URL, DATABASE_SSL=false
  # Depends on: unleash-db with service_healthy condition

  # TODO: Add an unleash-db service (postgres:16-alpine)
  # with POSTGRES_USER=unleash, POSTGRES_PASSWORD=unleash, POSTGRES_DB=unleash
  # Include a health check and a named volume

networks:
  gather:

volumes:
  db_data:
  # TODO: Add a volume for unleash-db data
```

### nginx/conf.d/gather.conf

Configure nginx to route traffic to the active environment:

```nginx
# nginx/conf.d/gather.conf

# TODO: Define an upstream block called "gather_backend"
# that routes to gather-blue:8000 by default
# This is the upstream that the deploy script will swap
# between "gather-blue:8000" and "gather-green:8000"

upstream gather_backend {
    server gather-blue:8000;
}

server {
    listen 80;
    server_name _;

    # TODO: Add a location block for "/" that:
    # 1. Proxies to http://gather_backend
    # 2. Sets the Host header to $host
    # 3. Sets X-Real-IP to $remote_addr
    # 4. Sets X-Forwarded-For to $proxy_add_x_forwarded_for
    # 5. Sets X-Forwarded-Proto to $scheme

    # TODO: Add a location block for "/nginx-health" that returns 200
    # with the text "ok" (for nginx's own health check)
    # Use: return 200 "ok";
    # Set: add_header Content-Type text/plain;
}
```

---

## Step 2: Deploy and Rollback Scripts

### deploy.sh

Write the blue-green deploy script:

```bash
#!/bin/bash
# deploy.sh -- Blue-green zero-downtime deploy for Gather
set -euo pipefail

NGINX_CONF="nginx/conf.d/gather.conf"

# TODO: Determine the currently active color by grepping the nginx config
# Hint: grep for "server gather-" and extract "blue" or "green"
CURRENT="blue"  # Replace this with the actual detection

if [ "$CURRENT" = "blue" ]; then
    NEW="green"
else
    NEW="blue"
fi

echo "============================================"
echo "  Deploying to: $NEW"
echo "  Current live:  $CURRENT"
echo "============================================"

# Step 1: Build the new version
echo "[1/5] Building django-$NEW..."
docker compose build "django-$NEW"

# Step 2: Start the new environment
echo "[2/5] Starting django-$NEW..."
docker compose up -d "django-$NEW"

# Step 3: Wait for health check
echo "[3/5] Waiting for django-$NEW to become healthy..."
# TODO: Write a loop that checks the container health status
# Use: docker inspect --format='{{.State.Health.Status}}' "gather-$NEW"
# Loop up to 30 times, sleeping 2 seconds between checks
# If the container becomes "healthy", break out of the loop
# If you reach 30 iterations, print an error and exit 1
echo "PLACEHOLDER: Implement health check loop"

# Step 4: Switch nginx upstream
echo "[4/5] Switching traffic to $NEW..."
# TODO: Use sed to replace "server gather-$CURRENT:8000" with
# "server gather-$NEW:8000" in the nginx config file
# Then reload nginx with: docker compose exec nginx nginx -s reload

# Step 5: Run smoke tests
echo "[5/5] Running smoke tests..."
# TODO: Call the smoke test script
# ./scripts/smoke-test.sh

echo "============================================"
echo "  Deploy complete. $NEW is now live."
echo "  Rollback: ./rollback.sh"
echo "  Stop old: docker compose stop django-$CURRENT"
echo "============================================"
```

### rollback.sh

Write the rollback script:

```bash
#!/bin/bash
# rollback.sh -- Instant rollback to the previous deployment
set -euo pipefail

NGINX_CONF="nginx/conf.d/gather.conf"

# TODO: Determine the currently active color
CURRENT="blue"  # Replace with actual detection

if [ "$CURRENT" = "blue" ]; then
    ROLLBACK_TO="green"
else
    ROLLBACK_TO="blue"
fi

echo "Rolling back from $CURRENT to $ROLLBACK_TO..."

# TODO: Verify the rollback target is healthy
# Use docker inspect to check the health status of "gather-$ROLLBACK_TO"
# If it is not healthy, print an error and exit 1

# TODO: Swap the nginx upstream (same sed command as deploy.sh)
# and reload nginx

echo "Rolled back to $ROLLBACK_TO successfully."
echo "The $CURRENT environment is still running for debugging."
```

### scripts/smoke-test.sh

Write a basic smoke test:

```bash
#!/bin/bash
# scripts/smoke-test.sh -- Verify the deployment is working
set -euo pipefail

BASE_URL="${1:-http://localhost}"

echo "Running smoke tests against $BASE_URL..."

# TODO: Test the health endpoint
# curl -sf "$BASE_URL/health/" > /dev/null
# If it fails, print "FAIL: /health/ returned non-200" and exit 1
# If it succeeds, print "PASS: /health/"

# TODO: Test the API root (or main page)
# curl -sf "$BASE_URL/api/events/" > /dev/null
# Same pass/fail pattern

# TODO: Test that the response includes the expected deployment color
# curl -s "$BASE_URL/health/" | grep -q '"status"'
# This verifies the response is valid JSON with a status field

# TODO: Print a summary
# "All smoke tests passed." or exit with the number of failures

echo "Smoke tests complete."
```

---

## Step 3: Feature Flags for Event Recommendations

### requirements.txt

Add the Unleash client:

```txt
# backend/requirements.txt (add to your existing requirements)
UnleashClient==6.0.1
```

### gather/feature_flags.py

Create the feature flag client:

```python
# backend/gather/feature_flags.py
"""
Feature flag client for Gather.

Uses Unleash for percentage-based rollouts and feature gating.
Falls back to a simple in-memory store if Unleash is unavailable,
so the application never crashes due to a flag service outage.
"""

import os
import logging

logger = logging.getLogger(__name__)

# TODO: Import UnleashClient from the UnleashClient package

# TODO: Read UNLEASH_URL and UNLEASH_API_TOKEN from environment variables
# Default UNLEASH_URL to "http://unleash:4242/api"
# Default UNLEASH_API_TOKEN to "" (empty string)
UNLEASH_URL = ""
UNLEASH_API_TOKEN = ""

# In-memory fallback flags (used when Unleash is unavailable)
_fallback_flags = {
    "event-recommendations": False,
}

_client = None


def initialize():
    """
    Initialize the Unleash client.
    Call this once at application startup (e.g., in AppConfig.ready()).
    """
    global _client

    # TODO: Check if UNLEASH_URL and UNLEASH_API_TOKEN are set
    # If either is empty, log a warning and return (use fallback flags)

    # TODO: Create an UnleashClient instance with:
    #   url=UNLEASH_URL
    #   app_name="gather"
    #   instance_id=f"gather-{os.environ.get('DEPLOYMENT_COLOR', 'unknown')}"
    #   custom_headers={"Authorization": UNLEASH_API_TOKEN}
    #
    # Then call initialize_client() on it
    # Wrap in try/except and log errors (do not crash the application)

    pass


def is_enabled(flag_name: str, user_id: str = None, default: bool = None) -> bool:
    """
    Check if a feature flag is enabled.

    Args:
        flag_name: The name of the feature flag.
        user_id: Optional user ID for percentage-based rollouts.
        default: Fallback value if the flag is not found anywhere.

    Returns:
        True if the flag is enabled, False otherwise.
    """
    # TODO: If _client is available, use it to check the flag
    # Build a context dict with "userId" if user_id is provided
    # Return _client.is_enabled(flag_name, context, default_value=...)

    # TODO: If _client is not available, fall back to _fallback_flags
    # If the flag is not in _fallback_flags, use the default parameter
    # If default is None, return False

    return False  # Replace with your implementation
```

### events/recommendations.py

Create a stub recommendations module:

```python
# backend/events/recommendations.py
"""
Event recommendation engine for Gather.

This is a simplified version for demonstrating feature flags.
A production implementation would use collaborative filtering
or a recommendation service.
"""

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from django.contrib.auth.models import User
    from events.models import Event

logger = logging.getLogger(__name__)


def get_recommendations(user: "User", current_event: "Event", limit: int = 5) -> list:
    """
    Get event recommendations for a user based on their RSVP history.

    Args:
        user: The requesting user.
        current_event: The event currently being viewed.
        limit: Maximum number of recommendations to return.

    Returns:
        A list of recommended Event objects.
    """
    # TODO: Import the Event model
    # from events.models import Event

    # TODO: Find events the user has RSVPd to (exclude the current event)
    # rsvped_event_ids = Rsvp.objects.filter(
    #     user=user
    # ).values_list("event_id", flat=True)

    # TODO: Find other users who RSVPd to the same events
    # similar_user_ids = Rsvp.objects.filter(
    #     event_id__in=rsvped_event_ids
    # ).exclude(user=user).values_list("user_id", flat=True).distinct()

    # TODO: Find events those similar users RSVPd to (that the current user has not)
    # recommended_events = Event.objects.filter(
    #     rsvps__user_id__in=similar_user_ids
    # ).exclude(
    #     id__in=rsvped_event_ids
    # ).exclude(
    #     id=current_event.id
    # ).distinct()[:limit]

    # TODO: Log that recommendations were generated
    # logger.info(f"Generated {len(recommended_events)} recommendations for user {user.id}")

    # TODO: Return the recommended events
    # return list(recommended_events)

    # Placeholder: return empty list until you implement the query logic
    return []
```

### events/views.py

Add the feature flag check to the event detail view:

```python
# backend/events/views.py (add to your existing views)
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

# TODO: Import the feature flag module
# from gather.feature_flags import is_enabled

# TODO: Import the recommendations module
# from events.recommendations import get_recommendations

from events.models import Event
from events.serializers import EventSerializer


class EventDetailView(APIView):
    def get(self, request, event_id):
        event = get_object_or_404(Event, id=event_id)
        serializer = EventSerializer(event)
        data = serializer.data

        # TODO: Check if "event-recommendations" flag is enabled for this user
        # Use is_enabled("event-recommendations", user_id=str(request.user.id))
        # If enabled, call get_recommendations(request.user, event)
        # and add the results to data["recommendations"]
        # Wrap in try/except so a recommendation failure does not break the view

        return Response(data)
```

### gather/urls.py

Add the health and readiness endpoints:

```python
# backend/gather/urls.py (add these URL patterns)
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache


def health_check(request):
    """Liveness probe: is the process running?"""
    # TODO: Return a JsonResponse with {"status": "ok"}
    # Include the DEPLOYMENT_COLOR from the environment
    pass


def readiness_check(request):
    """Readiness probe: can this instance serve traffic?"""
    checks = {}

    # TODO: Check database connectivity
    # Execute "SELECT 1" with a cursor
    # Set checks["database"] to "ok" on success, error message on failure

    # TODO: Check Redis connectivity
    # Use cache.set and cache.get with a test key
    # Set checks["redis"] to "ok" on success, error message on failure

    # TODO: If any check failed, return status 503 with {"status": "not ready", "checks": checks}
    # If all checks passed, return status 200 with {"status": "ready", "checks": checks}

    return JsonResponse({"status": "not implemented"}, status=501)


# Add to urlpatterns:
# path("health/", health_check, name="health"),
# path("ready/", readiness_check, name="readiness"),
```

---

## Step 4: Terraform Staging Environment

### terraform/staging/variables.tf

```hcl
# terraform/staging/variables.tf

variable "db_password" {
  description = "PostgreSQL password for the staging database"
  type        = string
  sensitive   = true
}

# TODO: Add a variable "django_image" with type string and default "gather-api:latest"

# TODO: Add a variable "environment" with type string and default "staging"

# TODO: Add a variable "nginx_port" with type number and default 8080
# This is the external port for accessing the staging environment
```

### terraform/staging/main.tf

```hcl
# terraform/staging/main.tf

terraform {
  required_version = ">= 1.7"

  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {
  host = "unix:///var/run/docker.sock"
}

# ─── Network ───────────────────────────────────────────────

resource "docker_network" "staging" {
  name = "gather-staging"
}

# ─── Database ──────────────────────────────────────────────

resource "docker_image" "postgres" {
  name         = "postgres:16-alpine"
  keep_locally = true
}

# TODO: Create a docker_volume resource called "db_data"
# Name it "gather-staging-db-data"

# TODO: Create a docker_container resource called "db"
# Name: "gather-staging-db"
# Image: docker_image.postgres.image_id
# Environment: POSTGRES_DB=gather, POSTGRES_USER=gather, POSTGRES_PASSWORD from var.db_password
# Mount the db_data volume to /var/lib/postgresql/data
# Attach to the staging network
# Add a healthcheck: pg_isready -U gather, interval 10s, timeout 5s, retries 5

# ─── Redis ─────────────────────────────────────────────────

resource "docker_image" "redis" {
  name         = "redis:7-alpine"
  keep_locally = true
}

# TODO: Create a docker_container resource called "redis"
# Name: "gather-staging-redis"
# Image: docker_image.redis.image_id
# Attach to the staging network
# Add a healthcheck: redis-cli ping, interval 10s, timeout 3s, retries 3

# ─── Django ────────────────────────────────────────────────

resource "docker_image" "django" {
  name         = var.django_image
  keep_locally = true
}

# TODO: Create a docker_container resource called "django"
# Name: "gather-staging-django"
# Image: docker_image.django.image_id
# Command: ["gunicorn", "gather.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2"]
# Environment:
#   - DATABASE_URL referencing the db container name and var.db_password
#   - REDIS_URL referencing the redis container name
#   - DJANGO_SETTINGS_MODULE=gather.settings
#   - ENVIRONMENT=var.environment
#   - DEPLOYMENT_COLOR=staging
# Attach to the staging network
# Add a healthcheck: curl -f http://localhost:8000/health/, interval 15s, timeout 5s, retries 3
# depends_on: db and redis containers

# ─── nginx ─────────────────────────────────────────────────

resource "docker_image" "nginx" {
  name         = "nginx:1.25-alpine"
  keep_locally = true
}

# TODO: Create a docker_container resource called "nginx"
# Name: "gather-staging-nginx"
# Image: docker_image.nginx.image_id
# Port: internal 80, external var.nginx_port
# Use the "upload" block to write an inline nginx config that proxies to gather-staging-django:8000
# Attach to the staging network
# depends_on: django container
```

### terraform/staging/outputs.tf

```hcl
# terraform/staging/outputs.tf

# TODO: Create an output "staging_url" that shows the URL to access the staging environment
# Value: "http://localhost:${docker_container.nginx.ports[0].external}"

# TODO: Create an output "db_container_name" that shows the database container name
# Value: docker_container.db.name

# TODO: Create an output "environment" that shows the environment name
# Value: var.environment
```

---

## Step 5: Putting It All Together

### Full Deployment Flow

Follow this sequence to verify everything works end to end:

1. **Start the base services**:
   ```bash
   docker compose up -d db redis nginx django-blue unleash unleash-db
   ```

2. **Configure the feature flag** in Unleash:
   - Open http://localhost:4242 (admin / unleash4all)
   - Create a feature toggle called `event-recommendations`
   - Add a "Gradual rollout" strategy set to 10%
   - Use `userId` as the stickiness parameter

3. **Deploy a new version** (blue-green swap):
   ```bash
   # Make a code change, then:
   ./deploy.sh
   ```

4. **Verify the deploy**:
   ```bash
   ./scripts/smoke-test.sh
   curl -s http://localhost/health/ | python3 -m json.tool
   ```

5. **Test the feature flag**: Make requests as different users and confirm that roughly 10% see recommendations in the response.

6. **Ramp the rollout**: In the Unleash UI, change the rollout from 10% to 50%, then to 100%. No redeploy needed.

7. **Practice a rollback**:
   ```bash
   ./rollback.sh
   curl -s http://localhost/health/ | python3 -m json.tool
   # Confirm the deployment color switched back
   ```

8. **Create the staging environment** with Terraform:
   ```bash
   cd terraform/staging
   terraform init
   terraform plan -var="db_password=staging-secret"
   terraform apply -var="db_password=staging-secret"
   # Access staging at http://localhost:8080
   curl http://localhost:8080/health/
   ```

9. **Tear down staging**:
   ```bash
   terraform destroy -var="db_password=staging-secret"
   ```

---

## Acceptance Criteria

Your project is complete when:

- [ ] Blue and green Django containers both start and pass health checks
- [ ] `deploy.sh` swaps traffic from one color to the other without dropping requests
- [ ] `rollback.sh` switches back to the previous color instantly
- [ ] The Unleash feature flag gates "event recommendations" at 10%
- [ ] Increasing the flag percentage in the Unleash UI changes behavior without a redeploy
- [ ] `smoke-test.sh` verifies the health endpoint and API are responding
- [ ] `terraform apply` creates a working staging environment on a different port
- [ ] `terraform destroy` cleanly removes all staging resources
- [ ] The health endpoint returns the deployment color (blue, green, or staging)
- [ ] The readiness endpoint checks both database and Redis connectivity

## Stretch Goals

- Add a Grafana dashboard panel that shows request latency split by `feature.event_recommendations=true` vs. `false`
- Write a `canary-deploy.sh` script that uses nginx weighted upstreams to send 5% of traffic to the new version
- Add a `terraform/production/` configuration that differs from staging (more workers, different resource limits)
- Integrate Doppler for secrets management and remove all hardcoded environment variables from docker-compose.yml

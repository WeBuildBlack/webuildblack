---
title: "Gather Resilience Audit"
estimatedMinutes: 75
---

# Gather Resilience Audit

In this project, you'll perform a comprehensive resilience audit on Gather. You'll scan for OWASP security issues and fix the top findings, add a circuit breaker to the email service with Prometheus metrics, create an automated PostgreSQL backup pipeline, and run chaos experiments with toxiproxy to verify graceful degradation.

By the end, Gather will be hardened against the most common security vulnerabilities and proven to handle dependency failures without crashing.

## Prerequisites

Make sure you have the following from previous modules:

- Gather running in Docker Compose (Django, Next.js, PostgreSQL, Redis, Celery)
- Prometheus and Grafana configured (Module 07)
- A working RSVP endpoint with email confirmation via Celery (Module 03)

## Part 1: OWASP Security Audit (20 minutes)

Scan Gather's Django configuration and API endpoints for security issues, then fix the top three findings.

### Step 1: Run Django's Deployment Check

Create a management command that runs the deployment check and outputs results in a structured format:

```python
# events/management/commands/security_audit.py

from django.core.management.base import BaseCommand
from django.core.checks import run_checks, Tags


class Command(BaseCommand):
    help = 'Run a security audit against OWASP Top 10 checklist'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING('Gather Security Audit'))
        self.stdout.write('=' * 60)

        # Phase 1: Django deployment checks
        self.stdout.write('\n--- Django Deployment Checks ---')
        issues = run_checks(tags=[Tags.security], include_deployment_checks=True)

        if issues:
            for issue in issues:
                level = 'ERROR' if issue.is_serious() else 'WARNING'
                self.stdout.write(f'  [{level}] {issue.id}: {issue.msg}')
        else:
            self.stdout.write('  All deployment checks passed.')

        # Phase 2: OWASP configuration checks
        self.stdout.write('\n--- OWASP Configuration Checks ---')

        # TODO: Import Django settings and check each of the following:
        #
        # 1. DEBUG must be False
        #    - Read settings.DEBUG
        #    - Print PASS or FAIL
        #
        # 2. ALLOWED_HOSTS must not be empty or contain '*'
        #    - Read settings.ALLOWED_HOSTS
        #    - Print PASS or FAIL with the current value
        #
        # 3. SECURE_SSL_REDIRECT must be True
        #    - Print PASS or FAIL
        #
        # 4. SESSION_COOKIE_SECURE must be True
        #    - Print PASS or FAIL
        #
        # 5. CSRF_COOKIE_SECURE must be True
        #    - Print PASS or FAIL
        #
        # 6. SECURE_HSTS_SECONDS must be >= 31536000 (1 year)
        #    - Print PASS or FAIL with the current value
        #
        # 7. X_FRAME_OPTIONS must be 'DENY' or 'SAMEORIGIN'
        #    - Print PASS or FAIL with the current value
        #
        # 8. SECURE_CONTENT_TYPE_NOSNIFF must be True
        #    - Print PASS or FAIL
        #
        # 9. Check that 'corsheaders' is in INSTALLED_APPS
        #    and CORS_ALLOW_ALL_ORIGINS is not True
        #    - Print PASS or FAIL
        #
        # 10. Check that REST_FRAMEWORK has DEFAULT_THROTTLE_CLASSES set
        #     - Print PASS or FAIL

        # Phase 3: Endpoint checks
        self.stdout.write('\n--- Endpoint Security Checks ---')

        # TODO: Use Django's test client to check the following:
        #
        # 1. GET / returns security headers:
        #    - X-Content-Type-Options: nosniff
        #    - X-Frame-Options: DENY or SAMEORIGIN
        #    - Check for Content-Security-Policy header (at least report-only)
        #    - Print PASS or FAIL for each header
        #
        # 2. POST /api/auth/login/ with wrong credentials should:
        #    - Return 401 (not 500)
        #    - Not leak information about whether the username exists
        #    - Print PASS or FAIL
        #
        # 3. POST /api/events/ without authentication should:
        #    - Return 401 or 403 (not 500)
        #    - Print PASS or FAIL

        self.stdout.write('\n' + '=' * 60)
        self.stdout.write('Audit complete. Fix all FAIL items before deploying.')
```

### Step 2: Fix Missing CSP Header

Add Content Security Policy to Gather's Django configuration:

```python
# gather/settings/production.py

# TODO: Install django-csp (add to requirements.txt) and configure:
#
# 1. Add 'csp.middleware.CSPMiddleware' to MIDDLEWARE
#    (after SecurityMiddleware, before CommonMiddleware)
#
# 2. Set CSP directives:
#    - CSP_DEFAULT_SRC = ("'self'",)
#    - CSP_SCRIPT_SRC = ("'self'",)
#    - CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")
#    - CSP_IMG_SRC = ("'self'", "data:", "https://gather-uploads.s3.amazonaws.com")
#    - CSP_FONT_SRC = ("'self'",)
#    - CSP_CONNECT_SRC = ("'self'",)
#    - CSP_FRAME_SRC = ("'none'",)
#    - CSP_OBJECT_SRC = ("'none'",)
#    - CSP_BASE_URI = ("'self'",)
#    - CSP_FORM_ACTION = ("'self'",)
#
# 3. Start in report-only mode:
#    - CSP_REPORT_ONLY = True
#    - CSP_REPORT_URI = '/api/csp-reports/'
#
# 4. Create a CSP report collection endpoint (see below)
```

Create the CSP report endpoint:

```python
# events/views.py (add to existing file)

# TODO: Create a CSPReportView that:
#
# 1. Accepts POST requests at /api/csp-reports/
# 2. Does NOT require authentication (browsers send these automatically)
# 3. Has rate limiting to prevent report flooding (use BurstRateThrottle or similar)
# 4. Parses the JSON body and logs the violation:
#    - blocked_uri
#    - violated_directive
#    - document_uri
# 5. Returns 204 No Content
# 6. Catches JSON decode errors gracefully
```

### Step 3: Fix CORS Configuration

```python
# gather/settings/production.py

# TODO: Configure django-cors-headers for production:
#
# 1. Ensure 'corsheaders' is in INSTALLED_APPS
# 2. Ensure 'corsheaders.middleware.CorsMiddleware' is in MIDDLEWARE
#    before CommonMiddleware
# 3. Set CORS_ALLOWED_ORIGINS to only allow the Gather frontend domain:
#    - 'https://gather.webuildblack.com'
# 4. Set CORS_ALLOW_CREDENTIALS = True
# 5. Explicitly set CORS_ALLOW_HEADERS (accept, authorization, content-type,
#    x-csrftoken, x-requested-with)
# 6. Explicitly set CORS_ALLOW_METHODS (GET, POST, PUT, PATCH, DELETE, OPTIONS)
# 7. Make sure CORS_ALLOW_ALL_ORIGINS is NOT set to True
#    (remove it or set it to False)
```

### Step 4: Add Rate Limiting to Auth Endpoints

```python
# events/throttles.py

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

# TODO: Create three throttle classes:
#
# 1. LoginRateThrottle (extends AnonRateThrottle)
#    - scope = 'login'
#    - This will use the 'login' rate from DEFAULT_THROTTLE_RATES
#
# 2. RSVPRateThrottle (extends UserRateThrottle)
#    - scope = 'rsvp'
#
# 3. EventCreateRateThrottle (extends UserRateThrottle)
#    - scope = 'event_create'
```

```python
# gather/settings/base.py (add to REST_FRAMEWORK config)

# TODO: Add throttle configuration to REST_FRAMEWORK:
#
# 'DEFAULT_THROTTLE_CLASSES': [
#     'rest_framework.throttling.AnonRateThrottle',
#     'rest_framework.throttling.UserRateThrottle',
# ],
# 'DEFAULT_THROTTLE_RATES': {
#     'anon': '60/minute',
#     'user': '120/minute',
#     'login': '5/minute',
#     'rsvp': '30/hour',
#     'event_create': '10/hour',
# },
```

```python
# auth/views.py (or wherever your login view is)

# TODO: Apply LoginRateThrottle to the login endpoint:
#
# class LoginView(APIView):
#     throttle_classes = [LoginRateThrottle]
#     ...
```

## Part 2: Circuit Breaker for Email Service (20 minutes)

Add a circuit breaker to Gather's email sending with Prometheus metrics to monitor circuit state.

### Step 1: Install Dependencies

```
# requirements.txt (add these)
pybreaker>=1.0.0
prometheus_client>=0.20.0
```

### Step 2: Create Circuit Breaker with Prometheus Metrics

```python
# events/circuit_breakers.py

import os
import pybreaker
import redis
from prometheus_client import Counter, Gauge

# TODO: Create Prometheus metrics for the circuit breaker:
#
# 1. A Gauge named 'circuit_breaker_state' with label 'breaker_name'
#    - Values: 0 = closed, 1 = half-open, 2 = open
#
# 2. A Counter named 'circuit_breaker_failures_total' with label 'breaker_name'
#
# 3. A Counter named 'circuit_breaker_state_changes_total'
#    with labels 'breaker_name', 'from_state', 'to_state'
#
# 4. A Counter named 'circuit_breaker_calls_total'
#    with labels 'breaker_name', 'result' (success, failure, rejected)


# TODO: Create a PrometheusBreakListener class that extends
# pybreaker.CircuitBreakerListener:
#
# 1. state_change(self, cb, old_state, new_state):
#    - Update the circuit_breaker_state gauge
#    - Increment the state_changes counter
#    - Log the state change at WARNING level
#
# 2. failure(self, cb, exc):
#    - Increment the failures counter
#    - Increment the calls counter with result='failure'
#
# 3. success(self, cb):
#    - Increment the calls counter with result='success'


# TODO: Create an email_breaker CircuitBreaker instance:
#
# 1. fail_max = 5
# 2. reset_timeout = 60
# 3. name = 'email_service'
# 4. listeners = [PrometheusBreakListener()]
# 5. If REDIS_URL is set in environment, use CircuitRedisStorage
#    for shared state across Celery workers.
#    Otherwise, use the default in-memory storage.
# 6. exclude = [ValueError, KeyError] (programming errors, not service failures)
```

### Step 3: Wrap Email Sending with Circuit Breaker

```python
# events/tasks.py (modify existing email task)

import pybreaker
from celery import shared_task
from events.circuit_breakers import email_breaker

# TODO: Create a private function _send_email decorated with @email_breaker:
#
# @email_breaker
# def _send_email(to, subject, body):
#     """Send email through the configured backend. Protected by circuit breaker."""
#     # Use Django's send_mail
#     from django.core.mail import send_mail
#     send_mail(
#         subject=subject,
#         message=body,
#         from_email='noreply@gather.dev',
#         recipient_list=[to],
#     )


# TODO: Modify the existing send_rsvp_confirmation_email task to:
#
# 1. Call _send_email instead of send_mail directly
#
# 2. Catch pybreaker.CircuitBreakerError separately from other exceptions:
#    - On CircuitBreakerError: retry after breaker's reset_timeout + 10 seconds
#      (this gives the service time to recover before retrying)
#    - On other exceptions: use Celery's default retry backoff
#
# 3. When the circuit is open, also create a PendingEmail record
#    so the email can be sent later by the process_pending_emails task
#
# 4. Log the outcome at each step (sent, circuit_open, failed)


# TODO: Create a periodic task process_pending_emails that:
#
# 1. Checks if the email circuit breaker is in the OPEN state.
#    If so, skip processing and return early.
#
# 2. Queries PendingEmail objects where sent_at is null
#    and attempts < 10, ordered by created_at, limit 50.
#
# 3. For each pending email:
#    - Try to send it using _send_email
#    - On success: set sent_at to now, save
#    - On CircuitBreakerError: break the loop (stop trying)
#    - On other exceptions: increment attempts, save
#
# 4. Return a dict with 'sent' count and 'remaining' count
```

### Step 4: Create PendingEmail Model

```python
# events/models.py (add to existing file)

# TODO: Create a PendingEmail model with:
#
# - to_email: EmailField
# - subject: CharField(max_length=255)
# - body: TextField
# - created_at: DateTimeField(auto_now_add=True)
# - sent_at: DateTimeField(null=True, blank=True)
# - attempts: IntegerField(default=0)
#
# Add an index on (sent_at, attempts) for efficient querying of unsent emails.
# Add Meta ordering by created_at.
#
# Don't forget to create and run the migration:
#   python manage.py makemigrations events
#   python manage.py migrate
```

## Part 3: Automated PostgreSQL Backup (15 minutes)

Create an automated backup pipeline with scheduled dumps and restore verification.

### Step 1: Backup Script

```bash
#!/bin/bash
# scripts/backup-database.sh

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/gather}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/gather_${TIMESTAMP}.dump"
LOG_FILE="${BACKUP_DIR}/backup.log"

# TODO: Implement the following:
#
# 1. Create the backup directory if it doesn't exist
#    mkdir -p "${BACKUP_DIR}"
#
# 2. Define a log() function that writes timestamped messages
#    to both stdout and the log file
#
# 3. Run pg_dump with:
#    - Custom format (-Fc)
#    - Compression level 6 (-Z 6)
#    - Host from DB_HOST env var (default: localhost)
#    - User from DB_USER env var (default: gather)
#    - Database from DB_NAME env var (default: gather)
#    - Output to BACKUP_FILE
#    - Redirect stderr to LOG_FILE
#
# 4. Verify the backup file exists and is larger than 1KB
#    (a suspiciously small dump usually means an error)
#    - Use stat to get the file size
#    - Exit with code 1 if the file is too small
#
# 5. Log the backup file path and size
#
# 6. Delete backup files older than RETENTION_DAYS
#    - Use find with -mtime +${RETENTION_DAYS} -delete
#    - Log how many files were deleted
#
# 7. Log "Backup complete"
```

### Step 2: Restore Verification Script

```bash
#!/bin/bash
# scripts/verify-backup.sh

set -euo pipefail

BACKUP_FILE="${1:?Usage: verify-backup.sh <backup-file>}"
TEST_DB="gather_restore_test_$(date +%s)"

# TODO: Implement the following:
#
# 1. Define a log() function (same pattern as backup script)
#
# 2. Create a cleanup() function that drops the test database
#    and register it with trap so it runs on EXIT
#
# 3. Create the test database using createdb:
#    - Host from DB_HOST (default: localhost)
#    - User from DB_USER (default: gather)
#    - Database name: TEST_DB
#
# 4. Record the start time: RESTORE_START=$(date +%s)
#
# 5. Run pg_restore:
#    - Into the test database
#    - With --no-owner and --no-privileges flags
#    - From BACKUP_FILE
#
# 6. Record the end time and calculate duration in seconds
#
# 7. Verify critical tables have data:
#    - Define an array: TABLES=("events_event" "events_rsvp" "auth_user")
#    - For each table, SELECT COUNT(*)
#    - If any table has 0 rows, set a flag indicating failure
#    - Log "OK" or "WARNING" for each table with its row count
#
# 8. Log the restore duration
#
# 9. If restore took longer than 14400 seconds (4 hours),
#    log a WARNING about RTO risk
#
# 10. Exit with code 0 if all tables have data, code 1 otherwise
```

### Step 3: Docker Compose Backup Service

```yaml
# docker-compose.yml (add this service)

# TODO: Add a backup service that:
#
# 1. Uses the postgres:16-alpine image
#
# 2. Mounts two volumes:
#    - ./scripts:/scripts (to access your backup scripts)
#    - backup_data:/backups (persistent volume for backups)
#
# 3. Sets environment variables for database connection:
#    - PGHOST=db
#    - PGUSER=gather
#    - PGPASSWORD=${DB_PASSWORD:-gather}
#    - PGDATABASE=gather
#    - DB_HOST=db
#    - DB_USER=gather
#    - DB_NAME=gather
#
# 4. Runs in a loop:
#    - Execute /scripts/backup-database.sh
#    - Execute /scripts/verify-backup.sh with the latest backup file
#    - Sleep 21600 (6 hours)
#
# 5. Depends on the db service
#
# Also add backup_data to the volumes section at the bottom
# of docker-compose.yml
```

### Step 4: Cron Schedule for Non-Docker Environments

```bash
# TODO: Create a crontab entry file at scripts/backup-crontab
#
# The file should contain:
#
# 1. A comment header explaining what each job does
#
# 2. Run backup-database.sh every 6 hours (0 */6 * * *)
#    Redirect stdout and stderr to /var/log/gather-backup.log
#
# 3. Run verify-backup.sh with the latest backup file daily at 4 AM (0 4 * * *)
#    The script should find the latest .dump file in /backups/gather/
#    and pass it as an argument
#    Redirect stdout and stderr to /var/log/gather-backup-verify.log
#
# Install with: crontab scripts/backup-crontab
```

## Part 4: Toxiproxy Fault Injection (20 minutes)

Simulate Redis failure and verify Gather degrades gracefully.

### Step 1: Docker Compose with Toxiproxy

```yaml
# docker-compose.chaos.yml

# TODO: Create a Docker Compose override file that adds Toxiproxy:
#
# 1. Add a toxiproxy service:
#    - Image: ghcr.io/shopify/toxiproxy:latest
#    - Expose ports:
#      - 8474:8474 (Toxiproxy API)
#      - 16379:16379 (proxied Redis)
#      - 15432:15432 (proxied PostgreSQL)
#    - Depends on: redis, db
#
# 2. Add a toxiproxy-setup service:
#    - Image: curlimages/curl:latest
#    - Depends on: toxiproxy
#    - Runs curl commands to create two proxies:
#      a. "redis" proxy: listen on 0.0.0.0:16379, upstream redis:6379
#      b. "postgres" proxy: listen on 0.0.0.0:15432, upstream db:5432
#    - Use a shell script that waits for Toxiproxy API to be ready
#      before creating proxies (retry curl with a loop)
```

### Step 2: Chaos Settings

```python
# gather/settings/chaos.py

# TODO: Create a Django settings file that extends the base settings
# and routes connections through Toxiproxy:
#
# 1. Import everything from base settings:
#    from .base import *
#
# 2. Override CACHES to point Redis at toxiproxy:16379
#    instead of redis:6379
#
# 3. Override DATABASES to point PostgreSQL at toxiproxy:15432
#    instead of db:5432
#
# 4. Override CELERY_BROKER_URL to use toxiproxy:16379
#
# 5. Set a flag: CHAOS_MODE = True
#    (useful for conditional logic in the app)
```

### Step 3: Chaos Experiment Script

```python
# chaos/test_redis_failure.py

import sys
import time
import json
import statistics
import requests

API_BASE = 'http://localhost:8000/api'
TOXIPROXY_API = 'http://localhost:8474'

# TODO: Implement the following functions:
#
# 1. measure_endpoint(url, method='GET', headers=None, data=None, num_requests=20)
#    - Make num_requests requests to the given URL
#    - Record latency (in milliseconds) for each request
#    - Count errors (status >= 500 or connection errors)
#    - Return a dict with:
#      - 'p50': median latency
#      - 'p95': 95th percentile latency
#      - 'error_rate': errors / num_requests
#      - 'status_codes': dict of status_code -> count
#
# 2. inject_redis_failure()
#    - POST to Toxiproxy API to add a 'reset_peer' toxic
#      on the redis proxy with timeout=0
#    - Print confirmation message
#
# 3. remove_redis_failure()
#    - DELETE the toxic from the redis proxy
#    - Print confirmation message
#
# 4. run_experiment(event_id, auth_token)
#    This is the main experiment function:
#
#    a. Print experiment header with hypothesis:
#       "When Redis is unavailable, RSVP creation should still succeed.
#        Caching features will be degraded, but the core flow works."
#
#    b. Phase 1: Measure steady state
#       - Measure GET /api/events/{event_id}/ (event detail)
#       - Measure POST /api/events/{event_id}/rsvp/ (RSVP creation)
#       - Print baseline metrics
#
#    c. Phase 2: Inject Redis failure
#       - Call inject_redis_failure()
#       - Wait 2 seconds for connections to drain
#
#    d. Phase 3: Measure under failure
#       - Measure the same endpoints
#       - Print failure metrics
#
#    e. Phase 4: Restore and measure recovery
#       - Call remove_redis_failure()
#       - Wait 2 seconds for recovery
#       - Measure the same endpoints
#       - Print recovery metrics
#
#    f. Phase 5: Evaluate results against thresholds:
#       - Error rate under failure must be < 10% (for RSVP creation)
#       - p95 latency under failure must be < 5000ms
#       - Error rate after recovery must be < 1%
#       - Recovery p95 must be within 2x of baseline p95
#
#    g. Print PASS or FAIL for each criterion
#
#    h. Print overall EXPERIMENT PASSED or EXPERIMENT FAILED
#
#    i. Return True if all criteria pass, False otherwise


# TODO: Add a __main__ block that:
# 1. Reads event_id from sys.argv[1] (default: '1')
# 2. Reads auth_token from sys.argv[2] (default: 'test-token')
# 3. Calls run_experiment(event_id, auth_token)
# 4. Exits with code 0 on success, 1 on failure
```

### Step 4: Verify Circuit Breaker Integration

```python
# chaos/test_circuit_breaker.py

# TODO: Create a second experiment that verifies the email circuit breaker:
#
# 1. Hypothesis: "When the email service is down, RSVP creation succeeds
#    and the confirmation email is queued for later delivery.
#    The circuit breaker opens after 5 failures and stops attempting
#    email delivery until the service recovers."
#
# 2. Steady state: RSVP creation returns 201, email is sent within 5 seconds
#
# 3. Experiment steps:
#    a. Create a Toxiproxy proxy for the email service (SMTP port)
#    b. Inject failure (reset_peer toxic)
#    c. Create 10 RSVPs rapidly
#    d. Verify: all RSVPs succeeded (201 status)
#    e. Check Prometheus metrics endpoint for:
#       - circuit_breaker_state{breaker_name="email_service"} == 2 (open)
#       - circuit_breaker_failures_total{breaker_name="email_service"} >= 5
#    f. Check PendingEmail table has entries (via admin API or Django management command)
#    g. Remove the toxic (restore email service)
#    h. Wait for circuit breaker reset_timeout (60s) + buffer (10s)
#    i. Trigger process_pending_emails task
#    j. Verify PendingEmail entries now have sent_at set
#
# 4. Evaluate: all RSVPs succeeded, circuit opened, emails queued and later sent
```

## Putting It All Together

Start the full chaos testing stack:

```bash
# Start all services with Toxiproxy
docker compose -f docker-compose.yml -f docker-compose.chaos.yml up -d

# Wait for services to be ready
sleep 10

# Run the security audit
docker compose exec django python manage.py security_audit

# Run the Redis failure experiment
python chaos/test_redis_failure.py 1 your-auth-token

# Run the circuit breaker experiment
python chaos/test_circuit_breaker.py

# Check that backups are running
docker compose logs backup

# Verify the latest backup
docker compose exec backup /scripts/verify-backup.sh /backups/gather/$(ls -t /backups/gather/*.dump | head -1)
```

## Stretch Goals

If you finish early, try these additional challenges:

1. **Add a Grafana dashboard panel** that shows circuit breaker state for all breakers. Use the `circuit_breaker_state` gauge with a state map (0=green/closed, 1=yellow/half-open, 2=red/open).

2. **Create a database latency experiment** using Toxiproxy to add 2 seconds of latency to PostgreSQL. Verify that Gather's pages still load (from cache) and that error rates stay below 5%.

3. **Add backup upload to S3-compatible storage** using MinIO in Docker Compose. Modify the backup script to upload each dump to MinIO after creation.

4. **Write a chaos test for Celery worker failure.** Stop the Celery worker container, create RSVPs, restart the worker, and verify all queued tasks are processed.

## What You've Built

After completing this project, Gather has:

- A security audit command that checks Django configuration against OWASP best practices
- Content Security Policy headers (in report-only mode, ready to enforce)
- Properly configured CORS with an explicit origin allowlist
- Rate limiting on authentication and sensitive endpoints
- A circuit breaker on the email service that fails fast when the service is down
- Prometheus metrics tracking circuit breaker state for alerting
- A pending email queue for reliable delivery when the circuit is open
- Automated PostgreSQL backups every 6 hours with 7-day retention
- A restore verification script that proves backups are usable
- Toxiproxy-based chaos experiments that verify graceful degradation
- A reproducible chaos testing setup in Docker Compose

This is what production-ready means. Not just "it works," but "it works when things go wrong."

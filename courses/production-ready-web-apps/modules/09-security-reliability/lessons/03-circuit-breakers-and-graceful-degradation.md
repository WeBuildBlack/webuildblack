---
title: "Circuit Breakers and Graceful Degradation"
estimatedMinutes: 35
---

# Circuit Breakers and Graceful Degradation

Gather's RSVP flow sends a confirmation email through an external email service. When that service goes down, every RSVP request waits for a timeout, then fails. If the email service is having a bad day, your users are having a worse one.

The circuit breaker pattern solves this. Instead of waiting for a service that's clearly broken, you fail fast and fall back to an alternative. The name comes from electrical circuit breakers: when too much current flows, the breaker trips open and stops the flow before something catches fire.

## The Problem with Naive Retries

Consider what happens without a circuit breaker when the email service goes down:

```python
# Without circuit breaker
def send_confirmation_email(user, event):
    try:
        response = requests.post(
            'https://api.emailservice.com/send',
            json={'to': user.email, 'subject': f"RSVP confirmed: {event.title}"},
            timeout=5,
        )
        response.raise_for_status()
    except requests.RequestException:
        # Retry immediately? The service is still down.
        # Wait and retry? The user is still waiting.
        raise
```

If the email service is down and you have 100 users trying to RSVP, all 100 requests will wait 5 seconds for the timeout. That's 100 connections held open, 100 Celery workers blocked, and zero emails sent. Your entire application slows down because of one failing dependency.

## Circuit Breaker States

A circuit breaker has three states:

**Closed (normal operation).** Requests flow through to the downstream service. The circuit breaker counts failures. If failures exceed a threshold within a time window, the breaker transitions to Open.

**Open (failing fast).** All requests are immediately rejected without calling the downstream service. No more wasted connections, no more timeouts. After a configurable timeout period, the breaker transitions to Half-Open.

**Half-Open (testing recovery).** The breaker allows a single request through to test whether the downstream service has recovered. If the request succeeds, the breaker transitions back to Closed. If it fails, the breaker returns to Open.

```
                     ┌──────────────┐
          success    │              │  failure threshold
      ┌──────────────│    Closed    │──────────────────┐
      │              │              │                  │
      │              └──────────────┘                  │
      │                                                │
      │              ┌──────────────┐                  │
      │   success    │              │   failure        │
      └──────────────│  Half-Open   │──────────────┐   │
                     │              │              │   │
                     └──────────────┘              │   │
                           ▲                       │   │
                           │  timeout expires       │   │
                           │                       ▼   ▼
                     ┌──────────────┐
                     │              │
                     │     Open     │
                     │              │
                     └──────────────┘
```

## Implementing with pybreaker

`pybreaker` is a Python implementation of the circuit breaker pattern. It's lightweight, well-tested, and works with any callable.

```bash
pip install pybreaker
```

### Basic Usage

```python
import pybreaker
import requests

# Create a circuit breaker
email_breaker = pybreaker.CircuitBreaker(
    fail_max=5,          # Open after 5 consecutive failures
    reset_timeout=60,    # Try again after 60 seconds
    name='email_service',
)


@email_breaker
def send_email(to, subject, body):
    """Send an email through the external service."""
    response = requests.post(
        'https://api.emailservice.com/send',
        json={'to': to, 'subject': subject, 'body': body},
        timeout=5,
    )
    response.raise_for_status()
    return response.json()
```

When you decorate a function with `@email_breaker`, pybreaker wraps every call:

1. If the breaker is **Closed**, it calls the function normally. If the function raises an exception, the failure counter increments. After 5 failures, the breaker opens.
2. If the breaker is **Open**, it immediately raises `pybreaker.CircuitBreakerError` without calling the function.
3. If the breaker is **Half-Open**, it lets one call through. Success closes the breaker. Failure reopens it.

### Handling CircuitBreakerError

```python
import pybreaker
import logging

logger = logging.getLogger(__name__)


def send_rsvp_confirmation(user, event):
    """Send RSVP confirmation with circuit breaker protection."""
    try:
        send_email(
            to=user.email,
            subject=f"You're going to {event.title}!",
            body=f"Hi {user.first_name}, your RSVP is confirmed.",
        )
        logger.info('confirmation_email_sent', extra={
            'user_id': user.id,
            'event_id': event.id,
        })
    except pybreaker.CircuitBreakerError:
        # Circuit is open. Don't even try.
        logger.warning('email_circuit_open', extra={
            'user_id': user.id,
            'event_id': event.id,
            'action': 'queued_for_retry',
        })
        # Fall back to a retry queue (we'll build this next)
        queue_email_for_later(user, event)
    except requests.RequestException as e:
        # Request failed, but breaker might still be closed
        logger.error('email_send_failed', extra={
            'user_id': user.id,
            'event_id': event.id,
            'error': str(e),
        })
        queue_email_for_later(user, event)
```

### Custom Failure Detection

By default, pybreaker treats any exception as a failure. You can customize this with listeners:

```python
class EmailBreakerListener(pybreaker.CircuitBreakerListener):
    """Log circuit breaker state changes."""

    def state_change(self, cb, old_state, new_state):
        logger.warning(
            'circuit_breaker_state_change',
            extra={
                'breaker': cb.name,
                'old_state': old_state.name,
                'new_state': new_state.name,
            },
        )

    def failure(self, cb, exc):
        logger.info(
            'circuit_breaker_failure_recorded',
            extra={
                'breaker': cb.name,
                'fail_count': cb.fail_counter,
                'fail_max': cb.fail_max,
                'error': str(exc),
            },
        )

    def success(self, cb):
        logger.info(
            'circuit_breaker_success',
            extra={
                'breaker': cb.name,
                'state': cb.current_state.name,
            },
        )


email_breaker = pybreaker.CircuitBreaker(
    fail_max=5,
    reset_timeout=60,
    name='email_service',
    listeners=[EmailBreakerListener()],
    exclude=[ValueError, KeyError],  # Don't count these as failures
)
```

The `exclude` parameter is important. A `ValueError` from bad input is a bug in your code, not a service failure. Only infrastructure errors (connection timeouts, HTTP 500s) should trigger the breaker.

## Integrating with Celery

In Gather, email sending already happens in Celery tasks (from Module 03). Adding a circuit breaker to a Celery task requires some thought about where the breaker state lives.

### The Shared State Problem

Each Celery worker is a separate process. A `pybreaker.CircuitBreaker` instance in one worker doesn't know about failures in another worker. If you have four workers and each needs five failures to trip the breaker, you need 20 total failures before any worker stops trying.

For most applications, this per-worker isolation is acceptable. The breaker still prevents cascading failures within each worker, and 20 failures happen fast when a service is truly down.

If you need shared state across workers, use Redis as the storage backend:

```python
import pybreaker
import redis

redis_client = redis.Redis.from_url(os.environ.get('REDIS_URL', 'redis://localhost:6379/0'))

# Shared circuit breaker state across all workers
email_breaker = pybreaker.CircuitBreaker(
    fail_max=5,
    reset_timeout=60,
    name='email_service',
    state_storage=pybreaker.CircuitRedisStorage(
        pybreaker.STATE_CLOSED,
        redis_client,
        namespace='gather',
    ),
    listeners=[EmailBreakerListener()],
)
```

With Redis storage, all workers share the same failure counter and state. Five failures across any combination of workers will trip the breaker for everyone.

### Circuit Breaker in a Celery Task

```python
# events/tasks.py

import pybreaker
from celery import shared_task
from django.conf import settings

email_breaker = pybreaker.CircuitBreaker(
    fail_max=5,
    reset_timeout=60,
    name='email_service',
)


@email_breaker
def _send_email_via_service(to, subject, body):
    """Low-level email send. Protected by circuit breaker."""
    from django.core.mail import send_mail
    send_mail(
        subject=subject,
        message=body,
        from_email='noreply@gather.dev',
        recipient_list=[to],
    )


@shared_task(
    max_retries=5,
    retry_backoff=30,
    retry_backoff_max=600,
    retry_jitter=True,
)
def send_rsvp_confirmation_email(user_id, event_id):
    """Send RSVP confirmation with circuit breaker protection."""
    from django.contrib.auth import get_user_model
    from events.models import Event

    User = get_user_model()

    try:
        user = User.objects.get(id=user_id)
        event = Event.objects.get(id=event_id)
    except (User.DoesNotExist, Event.DoesNotExist):
        return {'status': 'skipped', 'reason': 'user_or_event_not_found'}

    try:
        _send_email_via_service(
            to=user.email,
            subject=f"You're going to {event.title}!",
            body=f"Hi {user.first_name}, your RSVP to {event.title} is confirmed.",
        )
        return {'status': 'sent', 'user_id': user_id, 'event_id': event_id}

    except pybreaker.CircuitBreakerError:
        # Circuit is open. Retry later when it might be closed.
        raise send_rsvp_confirmation_email.retry(
            countdown=email_breaker.reset_timeout + 10,
            exc=Exception('Email circuit breaker is open'),
        )
```

Notice the retry strategy when the circuit is open. Instead of retrying with normal backoff, we wait for the breaker's reset timeout plus a small buffer. This gives the downstream service time to recover before we try again.

## Fallback Strategies

A circuit breaker prevents cascading failures, but users still need their confirmation. Fallback strategies provide alternative behavior when the primary path is unavailable.

### Strategy 1: Queue and Retry Later

Store the email in a database table and process it when the service recovers:

```python
# events/models.py

class PendingEmail(models.Model):
    to_email = models.EmailField()
    subject = models.CharField(max_length=255)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    attempts = models.IntegerField(default=0)

    class Meta:
        ordering = ['created_at']
```

```python
# events/tasks.py

@shared_task
def process_pending_emails():
    """Periodic task: retry pending emails when circuit is closed."""
    if email_breaker.current_state == pybreaker.STATE_OPEN:
        return {'status': 'skipped', 'reason': 'circuit_open'}

    pending = PendingEmail.objects.filter(
        sent_at__isnull=True,
        attempts__lt=10,
    )[:50]  # Process in batches

    sent_count = 0
    for email in pending:
        try:
            _send_email_via_service(email.to_email, email.subject, email.body)
            email.sent_at = timezone.now()
            email.save()
            sent_count += 1
        except pybreaker.CircuitBreakerError:
            break  # Circuit opened, stop trying
        except Exception:
            email.attempts += 1
            email.save()

    return {'sent': sent_count, 'remaining': pending.count() - sent_count}
```

### Strategy 2: Degrade the User Experience

Instead of sending an email, show an in-app notification:

```python
def handle_rsvp_confirmation(user, event):
    """Send confirmation, falling back to in-app notification."""
    try:
        _send_email_via_service(
            to=user.email,
            subject=f"You're going to {event.title}!",
            body=f"Your RSVP is confirmed.",
        )
    except (pybreaker.CircuitBreakerError, Exception):
        # Fallback: create an in-app notification
        Notification.objects.create(
            user=user,
            title="RSVP Confirmed",
            message=f"Your RSVP to {event.title} is confirmed. "
                    "A confirmation email will be sent shortly.",
            notification_type="rsvp_confirmation",
        )
```

### Strategy 3: Return Cached or Stale Data

For read endpoints, serve cached data when the database is slow:

```python
from django.core.cache import cache


def get_event_detail(event_id):
    """Get event details with cache fallback."""
    cache_key = f'event:{event_id}'

    try:
        event = Event.objects.select_related('organizer').get(id=event_id)
        # Update cache on successful read
        event_data = EventSerializer(event).data
        cache.set(cache_key, event_data, timeout=300)
        return event_data
    except Exception:
        # Database issue: serve from cache
        cached = cache.get(cache_key)
        if cached:
            cached['_stale'] = True  # Let the frontend know
            return cached
        raise  # No cache available, nothing we can do
```

## Monitoring Circuit Breaker State

Your Prometheus and Grafana stack from Module 07 should track breaker state changes. Export metrics from the listener:

```python
from prometheus_client import Counter, Gauge

circuit_breaker_state = Gauge(
    'circuit_breaker_state',
    'Current state of circuit breaker (0=closed, 1=half_open, 2=open)',
    ['breaker_name'],
)

circuit_breaker_failures = Counter(
    'circuit_breaker_failures_total',
    'Total failures recorded by circuit breaker',
    ['breaker_name'],
)

circuit_breaker_state_changes = Counter(
    'circuit_breaker_state_changes_total',
    'Total state transitions',
    ['breaker_name', 'from_state', 'to_state'],
)


STATE_VALUES = {
    'closed': 0,
    'half-open': 1,
    'open': 2,
}


class PrometheusBreakListener(pybreaker.CircuitBreakerListener):
    def state_change(self, cb, old_state, new_state):
        circuit_breaker_state.labels(breaker_name=cb.name).set(
            STATE_VALUES.get(new_state.name, -1)
        )
        circuit_breaker_state_changes.labels(
            breaker_name=cb.name,
            from_state=old_state.name,
            to_state=new_state.name,
        ).inc()

    def failure(self, cb, exc):
        circuit_breaker_failures.labels(breaker_name=cb.name).inc()
```

Create a Grafana alert when a breaker opens:

```
# Grafana alert rule (PromQL)
circuit_breaker_state{breaker_name="email_service"} == 2
```

This fires an alert whenever the email circuit breaker enters the Open state. Your on-call engineer gets notified immediately, not after users start complaining.

## Choosing the Right Parameters

The `fail_max` and `reset_timeout` values depend on your service's behavior:

| Parameter | Low Value | High Value |
|-----------|-----------|------------|
| `fail_max` | Trips quickly, more false positives | Trips slowly, more wasted requests |
| `reset_timeout` | Recovers quickly, more probes to failing service | Recovers slowly, longer degraded experience |

For Gather's email service:

- **`fail_max=5`**: Five consecutive failures strongly suggests a real outage, not a fluke.
- **`reset_timeout=60`**: One minute is enough time for most transient issues to resolve. Long enough to avoid hammering a struggling service, short enough that emails aren't delayed too long.

Start conservative (lower `fail_max`, higher `reset_timeout`) and tune based on your monitoring data.

## What's Next

Circuit breakers protect your application from failing dependencies. But what happens when your own database fails? In the next lesson, we'll cover database backups and disaster recovery: how to ensure Gather's data survives hardware failures, human errors, and the occasional catastrophe.

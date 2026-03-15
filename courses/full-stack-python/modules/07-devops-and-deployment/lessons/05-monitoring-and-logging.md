---
title: "Monitoring and Logging"
estimatedMinutes: 30
---

# Monitoring and Logging

Your app is deployed. CI/CD is running. Everything looks green. Then a user sends you a message: "I tried to RSVP to the Brooklyn Tech Meetup and got a white screen." You check the site. It works for you. You ask what browser they are using. They don't know. You ask them to try again. They already closed the tab.

Without monitoring, this is your debugging experience. Something broke for someone, somewhere, and you have zero information about what happened. With monitoring, you get an alert the moment the error occurs, with the exact stack trace, the user's browser, the URL they were on, and the request that triggered it.

Monitoring is not optional for production applications. You cannot fix what you cannot see.

---

## Error Tracking with Sentry

Sentry is the most widely used error tracking platform for web applications. It captures unhandled exceptions, gives you the full stack trace with local variables, groups similar errors together, and tracks whether errors are new or recurring. The free tier includes 5,000 errors per month, which is plenty for a project like Gather.

### Setting Up Sentry for Next.js

Install the Sentry SDK for Next.js:

```bash
cd gather-frontend
npx @sentry/wizard@latest -i nextjs
```

The wizard creates configuration files and walks you through connecting to your Sentry project. It generates three files:

- `sentry.client.config.ts` (browser-side error tracking)
- `sentry.server.config.ts` (server-side error tracking)
- `sentry.edge.config.ts` (edge runtime error tracking)

The core configuration looks like this:

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 100% of errors in development, 20% in production
  sampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Performance monitoring: capture 10% of transactions
  tracesSampleRate: 0.1,

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",
});
```

The `dsn` (Data Source Name) is a URL that tells the Sentry SDK where to send errors. You get this from your Sentry project settings. Add it as an environment variable in Vercel.

The `sampleRate` controls what percentage of errors are sent. In production with high traffic, sending every single error can exceed your quota. Start at 1.0 (100%) and reduce if needed.

### Integrating with Error Boundaries

In Module 02, you learned about React error boundaries. Sentry provides its own error boundary that automatically captures errors and sends them to Sentry:

```typescript
// app/layout.tsx
import * as Sentry from "@sentry/nextjs";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Sentry.ErrorBoundary
          fallback={({ error, resetError }) => (
            <div role="alert">
              <h2>Something went wrong</h2>
              <p>Our team has been notified and is looking into it.</p>
              <button onClick={resetError}>Try again</button>
            </div>
          )}
        >
          {children}
        </Sentry.ErrorBoundary>
      </body>
    </html>
  );
}
```

When an unhandled error crashes a component tree, Sentry captures the error with full context (component stack, breadcrumbs of user actions leading up to the crash, browser info) and displays the fallback UI instead of a white screen.

---

### Setting Up Sentry for Django

Install the Sentry SDK for Python:

```bash
cd gather-backend
pip install sentry-sdk
pip freeze > requirements.txt
```

Add Sentry to your Django settings:

```python
# gather_backend/settings.py
import sentry_sdk

sentry_sdk.init(
    dsn=config("SENTRY_DSN", default=""),
    traces_sample_rate=0.1,
    send_default_pii=False,  # Don't send personally identifiable information
    environment=config("ENVIRONMENT", default="development"),
)
```

The Django SDK automatically captures:

- Unhandled exceptions in views
- 500 errors
- Logging calls at the `ERROR` level and above
- Database query performance (if `traces_sample_rate` > 0)

Setting `send_default_pii=False` prevents Sentry from capturing user IP addresses, email addresses, and other personal data. This is important for privacy and GDPR compliance. You can still manually attach non-PII context when needed.

The `environment` parameter tags errors with their environment (development, staging, production). This lets you filter the Sentry dashboard to see only production errors, ignoring noise from development.

---

## Structured Logging

Sentry captures exceptions. But not every important event is an exception. A user creating an account, an API rate limit being hit, a background job completing successfully. These are events you want to record but that don't crash the application.

This is where logging comes in. The key principle: logs should be structured (JSON) rather than plain text. Structured logs are searchable, filterable, and parseable by machines.

Compare these two log lines:

```
# Unstructured (hard to parse)
2026-03-14 10:23:45 - User john@example.com created event "Brooklyn Tech Meetup"

# Structured (easy to parse and search)
{"timestamp": "2026-03-14T10:23:45Z", "level": "info", "event": "event_created", "user_email": "john@example.com", "event_title": "Brooklyn Tech Meetup", "event_id": 42}
```

The structured version can be filtered by any field. Show me all `event_created` logs from the last hour. Show me all logs related to user `john@example.com`. Show me all `error` level logs. With unstructured text, you are stuck with regex.

### Python Logging

Python has a built-in `logging` module. Configure it in your Django settings:

```python
# gather_backend/settings.py
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "format": "%(asctime)s %(name)s %(levelname)s %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "gather": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
```

Install the JSON formatter:

```bash
pip install python-json-logger
pip freeze > requirements.txt
```

Use the logger in your views and models:

```python
import logging

logger = logging.getLogger("gather")

class EventViewSet(viewsets.ModelViewSet):
    def perform_create(self, serializer):
        event = serializer.save(organizer=self.request.user)
        logger.info(
            "Event created",
            extra={
                "event_id": event.id,
                "event_title": event.title,
                "organizer_id": self.request.user.id,
            },
        )
```

The `extra` dictionary adds structured fields to the JSON output. When this log line is printed, it looks like:

```json
{"asctime": "2026-03-14 10:23:45", "name": "gather", "levelname": "INFO", "message": "Event created", "event_id": 42, "event_title": "Brooklyn Tech Meetup", "organizer_id": 7}
```

Deployment platforms like Railway and Vercel capture stdout and make it searchable in their log dashboards.

---

## Health Check Endpoints

A health check endpoint is a simple route that returns "OK" when your application is running correctly. Deployment platforms, load balancers, and uptime monitors hit this endpoint regularly to verify your app is alive.

A basic health check just confirms the server is responding. A more useful health check also verifies critical dependencies like the database.

### Django Health Check

```python
# events/views.py (or create a dedicated health app)
from django.http import JsonResponse
from django.db import connection

def health_check(request):
    health = {"status": "healthy", "checks": {}}

    # Check database connectivity
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health["checks"]["database"] = "connected"
    except Exception as e:
        health["status"] = "unhealthy"
        health["checks"]["database"] = str(e)
        return JsonResponse(health, status=503)

    return JsonResponse(health, status=200)
```

Wire it up in your URLs:

```python
# gather_backend/urls.py
from events.views import health_check

urlpatterns = [
    path("api/health/", health_check, name="health-check"),
    # ... other URLs
]
```

The endpoint returns a 200 status with `{"status": "healthy"}` when everything is working, or a 503 status with details about what failed. The 503 status code tells load balancers and monitoring tools that the service is unhealthy, so they can route traffic elsewhere or send alerts.

### Next.js Health Check

```typescript
// app/api/healthz/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    checks: {} as Record<string, string>,
  };

  // Check backend API connectivity
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    const response = await fetch(`${apiUrl}/health/`, {
      signal: AbortSignal.timeout(5000),
    });

    health.checks.backend = response.ok ? "connected" : "unreachable";

    if (!response.ok) {
      health.status = "degraded";
    }
  } catch (error) {
    health.status = "degraded";
    health.checks.backend = "unreachable";
  }

  const statusCode = health.status === "healthy" ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
```

The frontend health check does something extra: it pings the backend API. If the backend is down, the frontend reports itself as "degraded" rather than "unhealthy," because the frontend can still serve cached pages and static content even if the API is temporarily unavailable.

---

## Uptime Monitoring

Health check endpoints are only useful if something is checking them. Uptime monitoring services ping your endpoints at regular intervals and alert you when they go down.

Free options:

- **UptimeRobot** (50 monitors, 5-minute intervals, free)
- **Better Uptime** (10 monitors, 3-minute intervals, free)
- **Cronitor** (5 monitors, 1-minute intervals, free)

Set up monitors for both health endpoints:

1. `https://api.gather.app/api/health/` (Django backend)
2. `https://gather.app/api/healthz` (Next.js frontend)

Configure alerts via email or Slack. When a monitor detects a failure (non-200 response or timeout), you get notified immediately. Most services also provide a public status page you can share with users.

---

## Alerting Strategy

Not every alert deserves the same urgency. A good alerting strategy has tiers:

**Critical (immediate notification):** Application is completely down. Health check failing. Database unreachable. These alerts should wake you up at night (if Gather had nighttime users).

**Warning (check within an hour):** Error rate has increased. Response times are elevated. Disk space is running low. These indicate something is wrong but the app is still functioning.

**Informational (check during work hours):** New error type appeared in Sentry. Deploy completed successfully. Background job took longer than usual. These are good to know but do not require immediate action.

For a project like Gather, start simple:

- UptimeRobot pings both health endpoints every 5 minutes and sends a Slack notification on failure
- Sentry sends a Slack notification for new error types
- Railway/Vercel send deploy notifications to Slack

As the project grows and more users depend on it, you can add more sophisticated monitoring (response time thresholds, error rate alerts, custom metrics).

---

## Key Takeaways

1. Monitoring lets you detect and diagnose production issues before users report them. Without it, you are debugging blind.
2. Sentry captures unhandled exceptions with full stack traces, browser info, and user context, for both Next.js and Django.
3. Error boundaries combined with Sentry provide a graceful fallback UI while still capturing the error details for your team.
4. Structured JSON logging makes logs searchable and filterable, unlike plain text messages.
5. Health check endpoints verify that your application and its dependencies (database, external APIs) are functioning correctly.
6. Uptime monitoring services ping your health endpoints regularly and alert you when they detect failures.
7. A tiered alerting strategy (critical, warning, informational) prevents alert fatigue while ensuring urgent issues get immediate attention.

## Try It Yourself

Create a free Sentry account and set up a test project. Build a simple Next.js page with a button that throws an error when clicked. Wrap the page in a `Sentry.ErrorBoundary` and verify that (1) the fallback UI renders and (2) the error appears in your Sentry dashboard with a full stack trace. Then add the Django SDK to a test Django project, trigger a 500 error by accessing a broken view, and confirm it appears in Sentry with the request details.

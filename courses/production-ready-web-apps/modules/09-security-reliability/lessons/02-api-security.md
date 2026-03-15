---
title: "API Security"
estimatedMinutes: 40
---

# API Security

In the last lesson, you walked through the OWASP Top 10 and saw how Django and Next.js protect you at a high level. Now it's time to zoom in on the attack surface that matters most for Gather: the API.

Every endpoint you expose is a door. Rate limiting, input validation, CORS, CSP, and CSRF protection are the locks. Some of these locks are already installed by Django and Next.js. Others you need to add yourself. And a few are installed but easy to accidentally remove.

Let's secure Gather's RSVP and event creation endpoints, one layer at a time.

## Rate Limiting for Security

You saw rate limiting briefly in the OWASP lesson as a design concern. Here we'll implement it as a security control. The difference matters: design-level rate limiting prevents abuse. Security-level rate limiting prevents attacks.

### DRF Throttling

Django REST Framework ships with three throttle classes:

```python
# gather/settings.py

REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '20/minute',      # Unauthenticated users
        'user': '60/minute',      # Authenticated users
        'rsvp': '5/minute',       # RSVP-specific limit
        'event_create': '3/hour', # Event creation limit
    },
}
```

The `AnonRateThrottle` identifies users by IP address. The `UserRateThrottle` identifies users by their authenticated user ID, which is more reliable (IP-based throttling can be bypassed with proxies, and it punishes users behind shared NATs).

### Per-Endpoint Throttles

Apply stricter limits to sensitive endpoints:

```python
# events/throttles.py

from rest_framework.throttling import UserRateThrottle


class RSVPRateThrottle(UserRateThrottle):
    scope = 'rsvp'


class EventCreateRateThrottle(UserRateThrottle):
    scope = 'event_create'


class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'
```

```python
# events/views.py

from .throttles import RSVPRateThrottle, EventCreateRateThrottle


class RSVPCreateView(generics.CreateAPIView):
    serializer_class = RSVPSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [RSVPRateThrottle]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class EventCreateView(generics.CreateAPIView):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [EventCreateRateThrottle]

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)
```

### Throttle Response Headers

When a user hits the limit, DRF returns a `429 Too Many Requests` response with a `Retry-After` header. The response body looks like this:

```json
{
    "detail": "Request was throttled. Expected available in 42 seconds."
}
```

### Redis-Backed Throttling

The default throttle backend uses Django's cache framework. For production with multiple servers, you need a shared backend:

```python
# gather/settings.py

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://localhost:6379/0'),
    },
}
```

This ensures throttle state is shared across all Django instances. Without this, a user could hit 60 requests per minute on each server, effectively bypassing the limit.

## Input Validation with DRF Serializers

Serializers are your first line of defense against malicious input. Every field should have explicit validation. Never trust the client.

### Strict Event Serializer

```python
# events/serializers.py

from rest_framework import serializers
from django.utils import timezone

from .models import Event


class EventCreateSerializer(serializers.ModelSerializer):
    title = serializers.CharField(
        max_length=200,
        min_length=3,
        help_text="Event title, 3-200 characters"
    )
    description = serializers.CharField(
        max_length=5000,
        required=False,
        allow_blank=True,
    )
    capacity = serializers.IntegerField(
        min_value=1,
        max_value=10000,
    )
    starts_at = serializers.DateTimeField()

    class Meta:
        model = Event
        fields = ['title', 'description', 'capacity', 'starts_at']

    def validate_title(self, value):
        """Reject titles that look like injection attempts."""
        # Strip HTML tags
        import re
        if re.search(r'<[^>]+>', value):
            raise serializers.ValidationError(
                "HTML tags are not allowed in event titles."
            )
        return value.strip()

    def validate_starts_at(self, value):
        """Events must be in the future."""
        if value <= timezone.now():
            raise serializers.ValidationError(
                "Event start time must be in the future."
            )
        return value

    def validate(self, data):
        """Cross-field validation."""
        # Prevent unreasonably far-future events (possible data entry errors)
        if data.get('starts_at'):
            max_future = timezone.now() + timezone.timedelta(days=365)
            if data['starts_at'] > max_future:
                raise serializers.ValidationError(
                    "Events cannot be scheduled more than one year in advance."
                )
        return data
```

### RSVP Serializer with Business Logic

```python
# events/serializers.py (continued)

class RSVPCreateSerializer(serializers.Serializer):
    event_id = serializers.IntegerField()

    def validate_event_id(self, value):
        """Ensure the event exists, is in the future, and has capacity."""
        try:
            event = Event.objects.get(id=value)
        except Event.DoesNotExist:
            raise serializers.ValidationError("Event not found.")

        if event.starts_at <= timezone.now():
            raise serializers.ValidationError(
                "Cannot RSVP to an event that has already started."
            )

        confirmed_count = event.rsvps.filter(status='confirmed').count()
        if confirmed_count >= event.capacity:
            raise serializers.ValidationError(
                "This event is at capacity."
            )

        self.context['event'] = event
        return value
```

### What Not to Validate in Serializers

Serializers handle data shape and basic business rules. They should not:

- Make external API calls (use the view or a task for that)
- Perform expensive database queries (keep validation fast)
- Implement authorization logic (use DRF permissions for that)

## CORS Configuration

Cross-Origin Resource Sharing (CORS) controls which domains can make requests to your API from a browser. Without proper CORS, any website could make authenticated requests to Gather's API using your users' cookies.

### How CORS Works

When a browser makes a cross-origin request, it first sends a "preflight" `OPTIONS` request asking the server what's allowed. The server responds with headers listing permitted origins, methods, and headers. If the server says yes, the browser sends the actual request. If not, the browser blocks it.

```
Browser → OPTIONS /api/events/ (preflight)
Server → Access-Control-Allow-Origin: https://gather.example.com
Browser → POST /api/events/ (actual request)
```

### Django CORS Setup

Install `django-cors-headers`:

```bash
pip install django-cors-headers
```

```python
# gather/settings.py

INSTALLED_APPS = [
    # ... existing apps ...
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Must be before CommonMiddleware
    'django.middleware.common.CommonMiddleware',
    # ... rest of middleware ...
]

# NEVER do this in production:
# CORS_ALLOW_ALL_ORIGINS = True

# Explicit allowlist
CORS_ALLOWED_ORIGINS = [
    'https://gather.example.com',
    'https://www.gather.example.com',
]

# In development, add localhost
if DEBUG:
    CORS_ALLOWED_ORIGINS += [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ]

# Only allow cookies/credentials from allowed origins
CORS_ALLOW_CREDENTIALS = True

# Restrict allowed headers
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'origin',
    'x-csrftoken',
    'x-requested-with',
]

# Restrict allowed methods
CORS_ALLOW_METHODS = [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
]
```

### Common CORS Mistakes

**Setting `CORS_ALLOW_ALL_ORIGINS = True` in production.** This disables CORS protection entirely. Any website can make requests to your API.

**Forgetting to include the CSRF token header.** If your frontend sends the CSRF token in a header (which it should), you need `x-csrftoken` in `CORS_ALLOW_HEADERS`.

**Placing the CORS middleware in the wrong position.** `CorsMiddleware` must come before `CommonMiddleware` in the middleware list. If it comes after, the CORS headers won't be added to responses.

## Content Security Policy

Content Security Policy (CSP) tells browsers which sources of content are allowed on your pages. It's the strongest defense against XSS attacks because even if an attacker injects a `<script>` tag, the browser refuses to execute it if the source isn't in your CSP.

### Django CSP Setup

Install `django-csp`:

```bash
pip install django-csp
```

```python
# gather/settings.py

MIDDLEWARE = [
    # ... existing middleware ...
    'csp.middleware.CSPMiddleware',
]

# Content Security Policy
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'",)
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")  # Needed for some CSS frameworks
CSP_IMG_SRC = ("'self'", "data:", "https://res.cloudinary.com")
CSP_FONT_SRC = ("'self'", "https://fonts.gstatic.com")
CSP_CONNECT_SRC = ("'self'",)
CSP_FRAME_SRC = ("'none'",)
CSP_OBJECT_SRC = ("'none'",)
CSP_BASE_URI = ("'self'",)
CSP_FORM_ACTION = ("'self'",)
```

### CSP in Next.js

For the Next.js frontend, set CSP headers in `next.config.js`:

```typescript
// next.config.js

const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",  // Next.js needs these in dev
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://res.cloudinary.com",
  "font-src 'self' https://fonts.gstatic.com",
  `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL}`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: cspHeader },
        ],
      },
    ];
  },
};
```

### Report-Only Mode

When first deploying CSP, use report-only mode to catch violations without breaking your site:

```python
# gather/settings.py

# Start in report-only mode
CSP_REPORT_ONLY = True
CSP_REPORT_URI = '/api/csp-reports/'
```

This lets you collect violation reports, fix any legitimate sources you missed, and then switch to enforcement mode by setting `CSP_REPORT_ONLY = False`.

## CSRF Protection in Django + Next.js

Cross-Site Request Forgery (CSRF) tricks a user's browser into making unwanted requests to your API. Django has built-in CSRF protection, but connecting it to a Next.js frontend requires some configuration.

### How Django CSRF Works

Django generates a CSRF token and stores it in a cookie. For every state-changing request (POST, PUT, DELETE), Django expects the token to be included either in the request body or in a header. If the token is missing or invalid, Django returns a 403.

### Configuring CSRF for a Separate Frontend

When your frontend is on a different domain (or port), you need to configure Django to accept CSRF tokens from it:

```python
# gather/settings.py

# Allow the frontend to read the CSRF cookie
CSRF_COOKIE_HTTPONLY = False  # Frontend JS needs to read this
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = True  # Only in production

# Trust the frontend origin
CSRF_TRUSTED_ORIGINS = [
    'https://gather.example.com',
    'https://www.gather.example.com',
]

if DEBUG:
    CSRF_TRUSTED_ORIGINS += [
        'http://localhost:3000',
    ]
```

### Next.js CSRF Integration

On the frontend, read the CSRF token from the cookie and include it in every request:

```typescript
// lib/api.ts

function getCSRFToken(): string {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrftoken') {
      return value;
    }
  }
  return '';
}

export async function apiPost(url: string, data: unknown) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken(),
    },
    credentials: 'include',  // Send cookies cross-origin
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}
```

### DRF API Authentication Options

For API endpoints, you have an alternative to session/CSRF auth: token-based authentication. This sidesteps CSRF entirely because the token is sent in a header, not a cookie.

```python
# gather/settings.py

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        # Session auth (for browser-based requests, requires CSRF)
        'rest_framework.authentication.SessionAuthentication',
        # Token auth (for API clients, no CSRF needed)
        'rest_framework.authentication.TokenAuthentication',
    ],
}
```

The tradeoff: session auth is simpler for browser-based apps but requires CSRF handling. Token auth is simpler for API clients but requires secure token storage. For Gather's Next.js frontend, session auth with CSRF is the better choice because the browser manages the session cookie automatically.

For mobile apps or third-party integrations, JWT (using `djangorestframework-simplejwt`) is the standard approach:

```python
# gather/settings.py

from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}
```

Short-lived access tokens (15 minutes) limit the damage window if a token is compromised. Refresh tokens are rotated on each use and blacklisted after rotation, so a stolen refresh token can only be used once.

## API Auth Best Practices

Here is a checklist for Gather's API security:

### 1. Always Use HTTPS

```python
# gather/settings.py (production)
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

### 2. Use Permission Classes on Every View

Never rely on global defaults alone. Be explicit:

```python
# GOOD: Permission class is visible on the view
class EventDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated, IsOrganizerOrReadOnly]

# BAD: Relying on default, easy to forget what it is
class EventDetailView(generics.RetrieveAPIView):
    pass  # What permission does this use? Who knows?
```

### 3. Validate Everything at the Serializer Level

```python
class EventCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ['title', 'description', 'capacity', 'starts_at']
        # Explicitly list fields. NEVER use fields = '__all__'
        # __all__ exposes every model field, including ones you don't
        # want users to set (like organizer, created_at, etc.)
```

### 4. Return Minimal Error Information

```python
# BAD: Leaks internal details
{"error": "User with email admin@gather.dev exists in table auth_user"}

# GOOD: Generic message
{"error": "An account with this email already exists."}
```

### 5. Log Security Events

```python
import structlog

security_logger = structlog.get_logger('security')

class RSVPCreateView(generics.CreateAPIView):
    throttle_classes = [RSVPRateThrottle]

    def throttled(self, request, wait):
        security_logger.warning(
            'rate_limit_exceeded',
            user_id=request.user.id if request.user.is_authenticated else None,
            ip_address=request.META.get('REMOTE_ADDR'),
            endpoint='rsvp_create',
            wait_seconds=wait,
        )
        super().throttled(request, wait)
```

## Securing Gather's Endpoints: A Summary

Here's what we've added to Gather in this lesson:

| Layer | Protection | Implementation |
|-------|-----------|----------------|
| Rate limiting | Prevents brute force and abuse | DRF throttle classes per endpoint |
| Input validation | Rejects malicious or malformed data | DRF serializers with custom validators |
| CORS | Blocks unauthorized cross-origin requests | django-cors-headers with explicit allowlist |
| CSP | Prevents XSS by restricting content sources | django-csp middleware |
| CSRF | Blocks cross-site request forgery | Django CSRF + X-CSRFToken header from Next.js |
| Authentication | Verifies user identity | Session auth (browser) + JWT (API clients) |
| Authorization | Enforces access control | DRF permission classes on every view |

Each layer catches a different category of attack. No single layer is sufficient on its own. Together, they form a defense-in-depth strategy that makes Gather significantly harder to compromise.

## What's Next

Your API endpoints are locked down. But what happens when one of the services Gather depends on goes down? In the next lesson, we'll build circuit breakers and graceful degradation strategies so Gather stays functional even when external services fail.

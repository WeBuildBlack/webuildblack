---
title: "OWASP Top 10 for Django and Next.js"
estimatedMinutes: 40
---

# OWASP Top 10 for Django and Next.js

Your app is deployed. It has observability. Users are signing up. And somewhere out there, someone is poking at your endpoints with a tool called Burp Suite, looking for ways in.

Security isn't a feature you bolt on at the end. It's a property of the system you've been building all along. The good news is that Django and Next.js both have strong security defaults. The bad news is that defaults only protect you if you understand what they're doing and don't accidentally disable them.

The OWASP Top 10 is the industry-standard list of the most critical web application security risks. Updated periodically (we're working with the 2021 edition), it represents the consensus of security researchers on what actually gets exploited in the wild. Let's walk through each one and see exactly how it applies to Gather.

## A01: Broken Access Control

Broken access control is the number one risk on the list, and for good reason. It's the category of bugs where users can do things they shouldn't be allowed to do.

### What It Looks Like

A user changes the event ID in the URL and edits someone else's event. An unauthenticated user accesses an admin endpoint because nobody checked permissions. A regular user escalates to admin by changing a field in their profile.

### How Django Helps

Django REST Framework provides permission classes that make access control declarative:

```python
# events/views.py
from rest_framework import permissions

class IsOrganizerOrReadOnly(permissions.BasePermission):
    """Only the event organizer can modify the event."""

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed for any request
        if request.method in permissions.SAFE_METHODS:
            return True
        # Write permissions only for the organizer
        return obj.organizer == request.user


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOrganizerOrReadOnly]
```

### What You Still Need to Do

Permission classes only protect you if you actually use them. Every viewset needs explicit permission classes. Never rely on "security through obscurity" (hiding the URL). Always filter querysets to scope data to the current user where appropriate:

```python
class MyEventsViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users only see their own events
        return Event.objects.filter(organizer=self.request.user)
```

### How Next.js Helps

Next.js middleware can protect routes before they even reach your page components:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

  // Protect dashboard and admin routes
  if (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Admin routes need additional role check
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Decode token and check role (simplified)
    const payload = decodeToken(token);
    if (payload?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}
```

### What You Still Need to Do

Middleware only checks authentication at the route level. You still need to verify authorization in your API calls. Never trust client-side role checks as the sole protection. Always validate on the server.

## A02: Cryptographic Failures

Previously called "Sensitive Data Exposure," this category covers failures to protect data in transit and at rest.

### What It Looks Like

Passwords stored in plain text. API responses that include sensitive fields (password hashes, SSNs, tokens). Data transmitted over HTTP instead of HTTPS. Weak hashing algorithms for passwords.

### How Django Helps

Django uses PBKDF2 with SHA256 for password hashing by default, and you can upgrade to Argon2:

```python
# settings.py
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
]
```

Django also provides security-related settings for production:

```python
# settings.py - production security settings
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
```

### What You Still Need to Do

Be deliberate about what your serializers expose. Never include sensitive fields in API responses:

```python
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        # Explicitly list fields. Never use '__all__' on user models.
        fields = ['id', 'username', 'first_name', 'last_name', 'email']
        # Extra safety: explicitly exclude sensitive fields
        read_only_fields = ['id', 'email']
```

For Gather, make sure RSVP endpoints don't leak other users' email addresses or personal details to event organizers unless the user has opted in.

## A03: Injection

Injection attacks happen when untrusted data is sent to an interpreter as part of a command or query.

### SQL Injection

The classic. If you're building SQL strings with user input, you're vulnerable:

```python
# NEVER DO THIS
def search_events(request):
    query = request.GET.get('q')
    events = Event.objects.raw(f"SELECT * FROM events WHERE title LIKE '%{query}%'")
    # An attacker sends: q=' OR 1=1; DROP TABLE events; --
```

### How Django Helps

Django's ORM parameterizes all queries automatically:

```python
# This is safe. Django parameterizes the input.
events = Event.objects.filter(title__icontains=query)

# Even raw queries can be safe if you use parameters
events = Event.objects.raw(
    "SELECT * FROM events WHERE title LIKE %s",
    [f'%{query}%']
)
```

### What You Still Need to Do

If you ever use `raw()`, `extra()`, or `RawSQL()`, always use parameterized queries. Better yet, avoid them entirely. The ORM handles 99% of use cases. If you're reaching for raw SQL, ask yourself if there's an ORM way first.

Also watch out for NoSQL injection if you're using MongoDB or similar, and LDAP injection if you integrate with directory services. The principle is always the same: never interpolate user input into query strings.

## A04: Insecure Design

This is about flawed architecture, not flawed implementation. It's the difference between a lock that can be picked (implementation bug) and a door with no lock at all (design flaw).

### What It Looks Like

No rate limiting on authentication endpoints, allowing unlimited password guesses. No account lockout after failed attempts. A password reset flow that reveals whether an email exists in the system. An RSVP endpoint with no capacity checks, allowing overbooking.

### Apply to Gather

Gather's RSVP endpoint needs a design-level check:

```python
class RSVPViewSet(viewsets.ModelViewSet):
    def create(self, request, *args, **kwargs):
        event = get_object_or_404(Event, pk=request.data.get('event_id'))

        # Design-level protection: check capacity
        current_count = event.rsvps.filter(status='confirmed').count()
        if current_count >= event.capacity:
            return Response(
                {"error": "Event is at capacity"},
                status=status.HTTP_409_CONFLICT
            )

        # Design-level protection: prevent duplicate RSVPs
        if RSVP.objects.filter(user=request.user, event=event).exists():
            return Response(
                {"error": "Already RSVPed"},
                status=status.HTTP_409_CONFLICT
            )

        # Proceed with creation
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user, event=event)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
```

Notice the race condition here. Two simultaneous requests could both pass the capacity check. We addressed this in the database module with `SELECT ... FOR UPDATE`, but it's worth calling out again: security is often a concurrency problem.

## A05: Security Misconfiguration

The most common vulnerability in production systems. Default credentials, unnecessary features enabled, verbose error messages leaking stack traces, missing security headers.

### Django Checklist

Django has a built-in security checker:

```bash
python manage.py check --deploy
```

This will warn you about missing security settings. Run it before every deployment. Here's a production settings example with common misconfigurations fixed:

```python
# settings.py - production
DEBUG = False  # NEVER True in production
ALLOWED_HOSTS = ['gather.webuildblack.com', 'api.gather.webuildblack.com']

# Don't expose detailed errors
ADMINS = [('WBB Ops', 'ops@webuildblack.com')]

# Security headers
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
```

### Next.js Security Headers

Configure security headers in `next.config.js`:

```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

## A06: Vulnerable and Outdated Components

Using libraries with known vulnerabilities. This is especially dangerous in the JavaScript ecosystem where a single project can have hundreds of transitive dependencies.

### What You Should Do

Audit your dependencies regularly:

```bash
# Python
pip audit

# JavaScript
npm audit

# Check for outdated packages
pip list --outdated
npm outdated
```

Set up automated alerts. GitHub's Dependabot does this for free:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "pip"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10

  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

Pin your dependencies. Use `pip freeze > requirements.txt` and `package-lock.json`. In production, you want reproducible builds, not "whatever the latest version is."

## A07: Identification and Authentication Failures

Weak passwords, credential stuffing, session fixation, missing multi-factor authentication.

### How Django Helps

Django ships with password validators:

```python
# settings.py
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
     'OPTIONS': {'min_length': 10}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Session security
SESSION_COOKIE_AGE = 3600  # 1 hour
SESSION_COOKIE_HTTPONLY = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
```

### For Gather's API Authentication

If you're using token-based auth (JWT or DRF tokens), implement token rotation and expiry:

```python
# settings.py - Django REST Framework with SimpleJWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}
```

Short-lived access tokens (15 minutes) limit the damage if a token is compromised. Refresh token rotation means each refresh token can only be used once.

## A08: Software and Data Integrity Failures

This covers cases where code or data is used without verifying its integrity. CI/CD pipeline attacks, unsigned updates, insecure deserialization.

### Insecure Deserialization in Python

Never use `pickle` to deserialize untrusted data:

```python
# NEVER DO THIS with untrusted input
import pickle
data = pickle.loads(request.body)  # Remote code execution!

# Use JSON instead
import json
data = json.loads(request.body)  # Safe. JSON can't execute code.
```

### CI/CD Pipeline Security

Lock down your GitHub Actions:

```yaml
# Pin actions to specific commit SHAs, not tags
- uses: actions/checkout@a5ac7e51b41094c92402da3b24376905380afc29  # v4.1.6
  # NOT: actions/checkout@v4 (tags can be moved)

# Limit permissions
permissions:
  contents: read
  packages: write
```

### Subresource Integrity for CDN Assets

If you load any scripts or styles from a CDN in your Next.js app, use SRI hashes:

```html
<script
  src="https://cdn.example.com/lib.js"
  integrity="sha384-abc123..."
  crossorigin="anonymous"
></script>
```

## A09: Security Logging and Monitoring Failures

You built observability in Module 07. Now apply it to security. If someone is brute-forcing your login endpoint, will you know?

### What to Log

```python
# events/views.py
import logging

security_logger = logging.getLogger('security')

class LoginView(APIView):
    def post(self, request):
        username = request.data.get('username')
        user = authenticate(
            username=username,
            password=request.data.get('password')
        )

        if user is None:
            security_logger.warning(
                'Failed login attempt',
                extra={
                    'username': username,
                    'ip': request.META.get('REMOTE_ADDR'),
                    'user_agent': request.META.get('HTTP_USER_AGENT'),
                }
            )
            return Response(
                {"error": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        security_logger.info(
            'Successful login',
            extra={
                'user_id': user.id,
                'ip': request.META.get('REMOTE_ADDR'),
            }
        )
        # ... generate and return token
```

### Alert on Patterns

In your Prometheus/Grafana stack from Module 07, create alerts for:

- More than 10 failed logins from the same IP in 5 minutes
- Any access to admin endpoints from non-admin users
- Unusual API traffic patterns (10x normal request rate)
- Any 403 responses (someone hitting endpoints they shouldn't)

```python
# metrics.py
from prometheus_client import Counter

failed_login_counter = Counter(
    'auth_login_failures_total',
    'Total failed login attempts',
    ['ip_address']
)

access_denied_counter = Counter(
    'auth_access_denied_total',
    'Total access denied responses',
    ['endpoint', 'user_id']
)
```

## A10: Server-Side Request Forgery (SSRF)

SSRF happens when your server makes HTTP requests based on user input without validating the destination. An attacker can use your server to access internal services, cloud metadata endpoints, or other resources that should be unreachable from the outside.

### What It Looks Like in Gather

Imagine a feature where organizers can add an event image by URL:

```python
# DANGEROUS: fetching arbitrary URLs
def import_image(request):
    url = request.data.get('image_url')
    response = requests.get(url)  # What if url = 'http://169.254.169.254/latest/meta-data/'?
    # Attacker just read your AWS credentials
```

### How to Prevent It

Validate and restrict URLs before making requests:

```python
from urllib.parse import urlparse
import ipaddress

ALLOWED_SCHEMES = {'http', 'https'}
BLOCKED_NETWORKS = [
    ipaddress.ip_network('10.0.0.0/8'),
    ipaddress.ip_network('172.16.0.0/12'),
    ipaddress.ip_network('192.168.0.0/16'),
    ipaddress.ip_network('169.254.0.0/16'),  # AWS metadata
    ipaddress.ip_network('127.0.0.0/8'),      # Loopback
]

def validate_url(url):
    parsed = urlparse(url)

    if parsed.scheme not in ALLOWED_SCHEMES:
        raise ValueError(f"Scheme {parsed.scheme} not allowed")

    # Resolve hostname to IP and check against blocked ranges
    import socket
    ip = socket.gethostbyname(parsed.hostname)
    ip_addr = ipaddress.ip_address(ip)

    for network in BLOCKED_NETWORKS:
        if ip_addr in network:
            raise ValueError(f"Access to internal networks is not allowed")

    return url
```

## The Security Mindset

Security is not a checklist you complete once. It's a way of thinking about your code. Every time you write an endpoint, ask:

1. Who is allowed to call this? (Authentication)
2. What are they allowed to do? (Authorization)
3. What happens if they send garbage? (Input validation)
4. What happens if they send too much? (Rate limiting)
5. Am I leaking anything in the response? (Data exposure)
6. Would I know if someone was abusing this? (Logging)

In the next lesson, we'll apply this mindset specifically to Gather's API endpoints with concrete rate limiting, input validation, and security header configurations.

## Key Takeaways

- The OWASP Top 10 represents the most commonly exploited vulnerabilities in web applications
- Django and Next.js provide strong defaults (ORM parameterization, template auto-escaping, CSRF protection) but only if you don't bypass them
- Broken access control is the number one risk. Every endpoint needs explicit permission checks.
- Run `python manage.py check --deploy` before every production deployment
- Set up automated dependency auditing with Dependabot, `pip audit`, and `npm audit`
- Security logging is not optional. If you can't detect an attack, you can't respond to it.
- SSRF is increasingly common as apps integrate with more external services. Always validate URLs before making server-side requests.

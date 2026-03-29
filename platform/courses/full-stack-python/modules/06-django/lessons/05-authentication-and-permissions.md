---
title: "Authentication and Permissions"
estimatedMinutes: 35
---

# Authentication and Permissions

Every API needs to answer two questions: "Who is making this request?" (authentication) and "Are they allowed to do this?" (authorization/permissions). In Express, you typically handle both with middleware. You install Passport.js or write a custom JWT middleware, extract the user from the token, and then check permissions inside each route handler. Django and DRF follow the same pattern but provide much of it out of the box.

Django ships with a complete authentication system: user model, password hashing, sessions, groups, and permissions. DRF builds on top of that with pluggable authentication classes and a declarative permissions system. Instead of writing `if (!req.user) return res.status(401).json(...)` in every route, you declare permission classes on your views and DRF enforces them automatically.

In this lesson, you'll set up token-based authentication for the Gather API, build custom permission classes, and create login/register endpoints.

---

## Django's Built-In Auth System

Django's `django.contrib.auth` provides:

- A `User` model with username, email, password (hashed with PBKDF2 by default), and permissions
- Password hashing and verification (you never store plain-text passwords)
- Session-based authentication (login/logout with server-side sessions)
- Groups and permissions for role-based access control
- A `createsuperuser` management command for admin accounts

You've already been using this. When you ran `User.objects.create_user()` in the Django shell, that was the built-in auth system. The admin panel login uses it too.

In Express, you'd build all of this yourself or use Passport.js with a strategy (passport-local, passport-jwt). Django gives you the entire stack from day one.

---

## DRF Authentication Classes

DRF supports multiple authentication methods through pluggable classes. Each class examines the incoming request and attempts to identify the user.

### SessionAuthentication

This uses Django's session cookies. When a user logs in through the admin panel or a login view, Django sets a session cookie. DRF reads that cookie to identify the user. This is what makes the Browsable API work. You log in through the browser, and subsequent requests carry the session cookie.

### TokenAuthentication

This uses a simple token (a long random string) sent in the `Authorization` header. It's similar to how you used JWTs in your Express projects, but simpler: the token is stored in the database and looked up on each request.

Setting it up requires three steps.

**Step 1: Add to INSTALLED_APPS**

```python
# gather_backend/settings.py
INSTALLED_APPS = [
    # ... existing apps ...
    "rest_framework",
    "rest_framework.authtoken",  # Add this
    "events",
]
```

**Step 2: Run migrations**

```bash
python3 manage.py migrate
```

This creates an `authtoken_token` table that maps tokens to users.

**Step 3: Configure DRF defaults**

```python
# gather_backend/settings.py
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
}
```

Both authentication classes are listed because you want token auth for API clients (mobile apps, frontend SPAs, curl) and session auth for the Browsable API (browser).

### How Token Auth Works

The client sends the token in the `Authorization` header:

```bash
curl -H "Authorization: Token abc123def456..." http://127.0.0.1:8000/api/events/
```

DRF's `TokenAuthentication` class:

1. Reads the `Authorization` header
2. Extracts the token after "Token "
3. Looks it up in the `authtoken_token` table
4. If found, sets `request.user` to the associated user
5. If not found, `request.user` is `AnonymousUser`

Compare this to JWT authentication in Express:

```javascript
// Express JWT middleware
const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}
```

Django's token auth is database-backed rather than stateless. The trade-off: tokens can be revoked instantly (delete the row), but each request requires a database lookup. For most applications, this is a perfectly acceptable trade-off.

### JWT Authentication (Optional)

If you prefer stateless JWTs, the `djangorestframework-simplejwt` package provides JWT support:

```bash
pip install djangorestframework-simplejwt
```

```python
# settings.py
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
}
```

For Gather, we'll stick with TokenAuthentication. It's simpler, built into DRF, and doesn't require an additional package.

---

## Login and Register Endpoints

You need endpoints for users to create accounts and get their tokens. Create these views in `events/views.py` (or a separate `auth_views.py` if you prefer):

```python
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    username = request.data.get("username")
    email = request.data.get("email")
    password = request.data.get("password")

    if not all([username, email, password]):
        return Response(
            {"error": "username, email, and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(username=username).exists():
        return Response(
            {"error": "Username already taken."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(email=email).exists():
        return Response(
            {"error": "Email already registered."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
    )
    token = Token.objects.create(user=user)

    return Response(
        {
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
            },
            "token": token.key,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get("username")
    password = request.data.get("password")

    if not all([username, password]):
        return Response(
            {"error": "username and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response(
            {"error": "Invalid credentials."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.check_password(password):
        return Response(
            {"error": "Invalid credentials."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
        },
        "token": token.key,
    })
```

Register these in your URL configuration:

```python
# events/urls.py
urlpatterns = [
    path("auth/register/", views.register, name="register"),
    path("auth/login/", views.login, name="login"),
    # ... other urls ...
]
```

Test the flow:

```bash
# Register
curl -X POST http://127.0.0.1:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username": "jordan", "email": "jordan@gather.io", "password": "securepass123"}'

# Response:
# {"user": {"id": 3, "username": "jordan", "email": "jordan@gather.io"}, "token": "abc123..."}

# Login
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "jordan", "password": "securepass123"}'

# Use the token
curl http://127.0.0.1:8000/api/events/ \
  -H "Authorization: Token abc123..."
```

---

## Permission Classes

Permissions control what authenticated (or unauthenticated) users can do. DRF provides several built-in permission classes:

| Permission Class | Description |
|---|---|
| `AllowAny` | No restrictions (public endpoint) |
| `IsAuthenticated` | Must be logged in |
| `IsAdminUser` | Must be a staff/admin user |
| `IsAuthenticatedOrReadOnly` | Logged in for write operations, anyone can read |

### Applying Permissions Globally

Set a default in `settings.py` that applies to all views:

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
}
```

With `IsAuthenticatedOrReadOnly` as the global default:

- Anyone can make GET requests (list and detail views)
- Only authenticated users can make POST, PUT, PATCH, or DELETE requests
- This matches the typical pattern for a public API

### Applying Permissions Per View

Override the global default on specific views:

```python
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser


# FBV: use the decorator
@api_view(["POST"])
@permission_classes([AllowAny])  # Override: anyone can register
def register(request):
    pass


# CBV / ViewSet: set the class attribute
class EventViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    # ...
```

### Custom Permission: IsEventOrganizer

Built-in permissions handle common cases, but you'll need custom permissions for business logic. For Gather, only the organizer who created an event should be able to edit or delete it. Other authenticated users can view events and RSVP, but they shouldn't modify someone else's event.

Create `events/permissions.py`:

```python
from rest_framework import permissions


class IsEventOrganizer(permissions.BasePermission):
    """
    Only the event organizer can edit or delete the event.
    All authenticated users can create events.
    Anyone can read (handled by IsAuthenticatedOrReadOnly).
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed for any request (GET, HEAD, OPTIONS)
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions only for the organizer
        return obj.organizer == request.user
```

DRF permissions have two methods:

- `has_permission(self, request, view)`: called on every request, before the view logic runs. Good for checking authentication status or request-level rules.
- `has_object_permission(self, request, view, obj)`: called when the view retrieves a specific object (detail, update, delete). Good for checking ownership.

The `SAFE_METHODS` constant contains `("GET", "HEAD", "OPTIONS")`. These are read-only methods that don't modify data.

Apply it to your ViewSet:

```python
from .permissions import IsEventOrganizer


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.filter(is_published=True)
    permission_classes = [IsAuthenticatedOrReadOnly, IsEventOrganizer]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return EventDetailSerializer
        return EventSerializer

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)
```

When multiple permission classes are listed, DRF requires ALL of them to return `True`. The request must be authenticated (or read-only) AND the user must be the organizer (or making a read-only request).

Test it:

```bash
# Register two users
curl -X POST http://127.0.0.1:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username": "alex", "email": "alex@gather.io", "password": "pass123"}'

curl -X POST http://127.0.0.1:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username": "kai", "email": "kai@gather.io", "password": "pass123"}'

# Alex creates an event (save the token from register response)
curl -X POST http://127.0.0.1:8000/api/events/ \
  -H "Authorization: Token alex_token_here" \
  -H "Content-Type: application/json" \
  -d '{"title": "My Event", "description": "Test", "location": "NYC", "start_time": "2026-04-01T18:00:00Z", "end_time": "2026-04-01T20:00:00Z", "capacity": 50}'

# Alex can update their own event (200 OK)
curl -X PATCH http://127.0.0.1:8000/api/events/1/ \
  -H "Authorization: Token alex_token_here" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}'

# Kai tries to update Alex's event (403 Forbidden)
curl -X PATCH http://127.0.0.1:8000/api/events/1/ \
  -H "Authorization: Token kai_token_here" \
  -H "Content-Type: application/json" \
  -d '{"title": "Hacked Title"}'
```

---

## Custom Permission for RSVPs

Here's another example. For RSVPs, only the attendee who created the RSVP (or an admin) should be able to cancel it:

```python
class IsRSVPOwnerOrAdmin(permissions.BasePermission):
    """
    Only the attendee who made the RSVP or an admin can modify/delete it.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.attendee == request.user or request.user.is_staff
```

Apply it to the RSVP ViewSet:

```python
class RSVPViewSet(viewsets.ModelViewSet):
    serializer_class = RSVPSerializer
    permission_classes = [IsAuthenticated, IsRSVPOwnerOrAdmin]

    def get_queryset(self):
        return RSVP.objects.filter(event_id=self.kwargs["event_pk"])

    def perform_create(self, serializer):
        serializer.save(
            attendee=self.request.user,
            event_id=self.kwargs["event_pk"],
        )
```

---

## Comparing to Express Middleware

In Express, you'd typically write authentication and authorization as middleware functions:

```javascript
// Express auth middleware
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Express authorization middleware
function requireOwner(req, res, next) {
  if (req.event.organizerId !== req.user.id) {
    return res.status(403).json({ error: "Not authorized" });
  }
  next();
}

// Usage
router.put("/events/:id", requireAuth, loadEvent, requireOwner, updateEvent);
```

Django's approach is more declarative. Instead of chaining middleware functions, you list permission classes on the view. The framework handles the execution order and error responses. Both approaches work, but Django's is more consistent across the codebase because every developer uses the same pattern.

---

## Security Best Practices

A few security notes for your Gather API:

1. **Never return the password hash.** The built-in User model doesn't include it in queries by default, but if you create a UserSerializer, explicitly exclude the `password` field.

2. **Use HTTPS in production.** Token authentication sends the token in plain text. Without HTTPS, anyone on the network can intercept it.

3. **Set token expiration.** DRF's built-in tokens don't expire. For production, either use `djangorestframework-simplejwt` (which has expiration built in) or implement manual expiration by checking the token's `created` timestamp.

4. **Rate limit login attempts.** The login endpoint is vulnerable to brute-force attacks. Add rate limiting with `django-ratelimit` or DRF's throttling classes.

5. **Validate password strength.** Django has built-in password validators. Enable them in `settings.py`:

```python
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
```

---

## Key Takeaways

1. Django ships with a complete authentication system (User model, password hashing, sessions) that Express requires third-party packages to replicate.
2. DRF's `TokenAuthentication` is a database-backed token system that's simpler than JWT but allows instant revocation. For stateless auth, use `djangorestframework-simplejwt`.
3. Permission classes are the Django equivalent of Express authorization middleware. Built-in options (`IsAuthenticated`, `IsAuthenticatedOrReadOnly`, `IsAdminUser`) cover common cases.
4. Custom permissions extend `BasePermission` and implement `has_permission()` (request-level) and `has_object_permission()` (object-level). This is cleaner than ad-hoc checks inside route handlers.
5. The `IsEventOrganizer` pattern (check `obj.organizer == request.user`) is reusable for any resource with an owner. You'll use this pattern frequently.
6. Permission classes are declarative: you list them on the view and DRF enforces them. Multiple classes are combined with AND logic.
7. Always set global permission defaults in `settings.py` so new endpoints are secure by default, then override per-view as needed.

---

## Try It Yourself

1. Create a `/api/auth/me/` endpoint that returns the current user's profile (id, username, email) when called with a valid token. Return a 401 error for unauthenticated requests. This is a common pattern for frontend apps to check if the user's session is still valid.

2. Create a `IsRSVPCapacityAvailable` permission that checks whether the event has spots remaining before allowing a new RSVP to be created. Return a 403 with a message like "This event is at capacity" if no spots are left. Add it to the RSVP ViewSet's `permission_classes`.

3. Implement a logout endpoint at `/api/auth/logout/` that deletes the user's token. After calling this endpoint, subsequent requests with that token should fail with a 401. Test the full flow: register, use the token, logout, verify the token no longer works.

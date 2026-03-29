---
title: "Views and URL Routing"
estimatedMinutes: 35
---

# Views and URL Routing

In Express, you define routes and attach handler functions to them. Django works the same way conceptually, but uses a different vocabulary. What Express calls "route handlers," Django calls "views." What Express calls `app.use()` or `router.get()`, Django calls `path()` and `include()`. The mental model is the same: match a URL pattern, call a function, return a response.

Django gives you two ways to write views: function-based views (FBVs) and class-based views (CBVs). FBVs are simple functions that take a request and return a response, just like Express handlers. CBVs use Python classes to organize related HTTP methods (GET, POST, PUT, DELETE) into one place. You'll learn both in this lesson, because real Django projects use a mix.

We're building on the Gather models from Lesson 2. By the end of this lesson, you'll have working API endpoints for listing events, retrieving event details, and creating new events.

---

## URL Configuration Basics

Django's URL routing lives in `urls.py` files. You've already seen the basics in Lesson 1. Here's a deeper look at how it works.

### The Root URL Configuration

Your project's `gather_backend/urls.py` is the entry point for all URL routing:

```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("events.urls")),
]
```

The `path()` function takes a URL pattern and maps it to either a view or another set of URLs (via `include()`). This is directly analogous to Express:

```javascript
// Express equivalent
app.use("/admin", adminRouter);
app.use("/api", eventsRouter);
```

### App-Level URLs

Your `events/urls.py` defines the routes specific to the events app:

```python
from django.urls import path
from . import views

app_name = "events"

urlpatterns = [
    path("health/", views.health_check, name="health-check"),
    path("events/", views.event_list, name="event-list"),
    path("events/<int:pk>/", views.event_detail, name="event-detail"),
    path("categories/", views.category_list, name="category-list"),
]
```

A few things to notice:

**`app_name`** sets a namespace for URL names, preventing collisions if multiple apps define a route with the same name.

**`name` parameter** gives each route a name you can reference elsewhere (in templates, tests, or `reverse()`). Express doesn't have a built-in equivalent. You'd typically just hardcode the path string.

**`<int:pk>`** is a path converter. It captures part of the URL and passes it to the view as a keyword argument. Django validates the type automatically. `<int:pk>` means "capture an integer and pass it as `pk`."

Here are the available path converters:

| Converter | Pattern | Example |
|---|---|---|
| `str` (default) | Any non-empty string, excluding `/` | `<str:slug>` matches `"python-workshop"` |
| `int` | Zero or positive integer | `<int:pk>` matches `42` |
| `slug` | ASCII letters, numbers, hyphens, underscores | `<slug:slug>` matches `"my-event-2026"` |
| `uuid` | UUID format | `<uuid:id>` matches `"075194d3-6885-..."` |

In Express, you'd use `:pk` and validate the type manually in the handler:

```javascript
// Express equivalent
router.get("/events/:pk", (req, res) => {
  const pk = parseInt(req.params.pk);
  if (isNaN(pk)) return res.status(400).json({ error: "Invalid ID" });
  // ...
});
```

Django's path converters handle this validation automatically and return a 404 if the pattern doesn't match.

---

## Function-Based Views

Function-based views (FBVs) are the simplest way to write views. They're functions that take a `request` object and return a `Response` object. If you're comfortable with Express handler functions, FBVs will feel natural.

### A Basic List View

```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Event, Category


@api_view(["GET"])
def event_list(request):
    events = Event.objects.filter(is_published=True)
    data = [
        {
            "id": event.id,
            "title": event.title,
            "organizer": event.organizer.username,
            "location": event.location,
            "start_time": event.start_time.isoformat(),
            "capacity": event.capacity,
        }
        for event in events
    ]
    return Response(data)
```

The `@api_view(["GET"])` decorator is from Django REST Framework. It does three things:

1. Restricts the view to the specified HTTP methods (returns 405 Method Not Allowed for others)
2. Wraps Django's raw `HttpRequest` in DRF's `Request` object, which adds `.data` for parsed request bodies
3. Returns DRF's `Response` object, which handles content negotiation (JSON, Browsable API, etc.)

Compare this to Express:

```javascript
// Express equivalent
router.get("/events", async (req, res) => {
  const events = await Event.findAll({ where: { isPublished: true } });
  const data = events.map((event) => ({
    id: event.id,
    title: event.title,
    organizer: event.organizer.username,
    location: event.location,
    startTime: event.startTime.toISOString(),
    capacity: event.capacity,
  }));
  res.json(data);
});
```

Almost identical. The view function pattern is the same; only the syntax differs.

### A Detail View with URL Parameters

```python
@api_view(["GET"])
def event_detail(request, pk):
    try:
        event = Event.objects.get(pk=pk, is_published=True)
    except Event.DoesNotExist:
        return Response(
            {"error": "Event not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    data = {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "organizer": event.organizer.username,
        "category": event.category.name if event.category else None,
        "location": event.location,
        "start_time": event.start_time.isoformat(),
        "end_time": event.end_time.isoformat(),
        "capacity": event.capacity,
        "spots_remaining": event.spots_remaining,
    }
    return Response(data)
```

The `pk` parameter comes from the URL pattern `<int:pk>`. Django passes it directly to the view function as a keyword argument. In Express, you'd access it through `req.params.pk`.

Notice the `Event.DoesNotExist` exception. Every Django model has a built-in `DoesNotExist` exception that `.get()` raises when no matching record exists. This is different from Sequelize's `.findByPk()`, which returns `null`.

### Handling Multiple HTTP Methods

A single FBV can handle multiple HTTP methods by checking `request.method`:

```python
@api_view(["GET", "POST"])
def event_list(request):
    if request.method == "GET":
        events = Event.objects.filter(is_published=True)
        data = [
            {
                "id": event.id,
                "title": event.title,
                "location": event.location,
                "start_time": event.start_time.isoformat(),
            }
            for event in events
        ]
        return Response(data)

    elif request.method == "POST":
        # request.data is already parsed (like Express's req.body with express.json())
        title = request.data.get("title")
        description = request.data.get("description")
        location = request.data.get("location")
        start_time = request.data.get("start_time")
        end_time = request.data.get("end_time")

        if not all([title, description, location, start_time, end_time]):
            return Response(
                {"error": "Missing required fields"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        event = Event.objects.create(
            title=title,
            description=description,
            organizer=request.user,
            location=location,
            start_time=start_time,
            end_time=end_time,
        )
        return Response(
            {"id": event.id, "title": event.title},
            status=status.HTTP_201_CREATED,
        )
```

The `request.data` attribute is DRF's equivalent of `req.body` in Express. DRF automatically parses JSON, form data, and multipart data. You don't need to install a body parser middleware.

This works, but handling GET and POST in the same function starts getting messy. For CRUD endpoints with all four methods (GET, POST, PUT, DELETE), the function becomes long and hard to read. That's where class-based views come in.

---

## Class-Based Views

Class-based views (CBVs) organize HTTP methods as class methods. Instead of checking `request.method` inside an if/else chain, you define separate `get()`, `post()`, `put()`, and `delete()` methods on a class.

### APIView: The Foundation

DRF's `APIView` is the base class for all class-based API views:

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Event


class EventListView(APIView):
    def get(self, request):
        events = Event.objects.filter(is_published=True)
        data = [
            {
                "id": event.id,
                "title": event.title,
                "location": event.location,
                "start_time": event.start_time.isoformat(),
            }
            for event in events
        ]
        return Response(data)

    def post(self, request):
        title = request.data.get("title")
        description = request.data.get("description")
        location = request.data.get("location")
        start_time = request.data.get("start_time")
        end_time = request.data.get("end_time")

        if not all([title, description, location, start_time, end_time]):
            return Response(
                {"error": "Missing required fields"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        event = Event.objects.create(
            title=title,
            description=description,
            organizer=request.user,
            location=location,
            start_time=start_time,
            end_time=end_time,
        )
        return Response(
            {"id": event.id, "title": event.title},
            status=status.HTTP_201_CREATED,
        )


class EventDetailView(APIView):
    def get_object(self, pk):
        try:
            return Event.objects.get(pk=pk, is_published=True)
        except Event.DoesNotExist:
            return None

    def get(self, request, pk):
        event = self.get_object(pk)
        if not event:
            return Response(
                {"error": "Event not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        data = {
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "organizer": event.organizer.username,
            "location": event.location,
            "start_time": event.start_time.isoformat(),
            "end_time": event.end_time.isoformat(),
            "capacity": event.capacity,
            "spots_remaining": event.spots_remaining,
        }
        return Response(data)

    def put(self, request, pk):
        event = self.get_object(pk)
        if not event:
            return Response(
                {"error": "Event not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        event.title = request.data.get("title", event.title)
        event.description = request.data.get("description", event.description)
        event.location = request.data.get("location", event.location)
        event.save()

        return Response({"id": event.id, "title": event.title})

    def delete(self, request, pk):
        event = self.get_object(pk)
        if not event:
            return Response(
                {"error": "Event not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        event.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
```

### Wiring Up CBVs in URLs

Class-based views need `.as_view()` when registered in URL patterns:

```python
from django.urls import path
from . import views

app_name = "events"

urlpatterns = [
    path("health/", views.health_check, name="health-check"),
    path("events/", views.EventListView.as_view(), name="event-list"),
    path("events/<int:pk>/", views.EventDetailView.as_view(), name="event-detail"),
]
```

The `.as_view()` call converts the class into a callable that Django's URL router can use. It creates a new instance of the class for each request, then dispatches to the correct method (get, post, put, delete) based on the HTTP method.

---

## FBV vs CBV: When to Use Which

Express doesn't have this choice. Every route handler is a function. Django gives you both, and here's a practical guide:

**Use FBVs when:**
- The endpoint is simple (one or two HTTP methods)
- You want maximum readability for a one-off endpoint
- You're writing utility endpoints (health checks, webhook receivers)

**Use CBVs when:**
- You need full CRUD (all four HTTP methods on the same URL)
- You want to share logic between methods (like `get_object()`)
- You plan to use DRF's more advanced features (ViewSets, mixins, generic views)

Here's the same endpoint written both ways. Notice how the CBV is more organized but has more boilerplate:

```python
# FBV: 12 lines
@api_view(["GET"])
def category_list(request):
    categories = Category.objects.all()
    data = [{"id": c.id, "name": c.name, "slug": c.slug} for c in categories]
    return Response(data)


# CBV: 8 lines (but with class overhead)
class CategoryListView(APIView):
    def get(self, request):
        categories = Category.objects.all()
        data = [{"id": c.id, "name": c.name, "slug": c.slug} for c in categories]
        return Response(data)
```

For simple read-only endpoints, FBVs are perfectly fine. As endpoints grow more complex, CBVs scale better. In the next lesson, you'll learn about ViewSets, which take CBVs even further and eliminate most of the boilerplate you see above.

---

## The Request Object

DRF's `Request` object wraps Django's `HttpRequest` and adds several useful properties:

| Property | Express Equivalent | Description |
|---|---|---|
| `request.data` | `req.body` | Parsed request body (JSON, form data, multipart) |
| `request.query_params` | `req.query` | Query string parameters |
| `request.user` | `req.user` (with passport) | Authenticated user (or `AnonymousUser`) |
| `request.method` | `req.method` | HTTP method string |
| `request.META` | `req.headers` | Request metadata (headers, server info) |
| `request.FILES` | `req.files` (with multer) | Uploaded files |

A common pattern for handling query parameters:

```python
@api_view(["GET"])
def event_list(request):
    events = Event.objects.filter(is_published=True)

    # Filter by category if query param is present
    category = request.query_params.get("category")
    if category:
        events = events.filter(category__slug=category)

    # Search by title
    search = request.query_params.get("search")
    if search:
        events = events.filter(title__icontains=search)

    # Pagination
    limit = int(request.query_params.get("limit", 20))
    offset = int(request.query_params.get("offset", 0))
    events = events[offset:offset + limit]

    data = [{"id": e.id, "title": e.title} for e in events]
    return Response(data)
```

This gives you endpoints like:
- `GET /api/events/` (all published events)
- `GET /api/events/?category=workshop` (filtered by category)
- `GET /api/events/?search=python&limit=10` (search with pagination)

QuerySet slicing (`events[offset:offset + limit]`) translates to SQL `LIMIT` and `OFFSET`, so it's efficient even with large datasets.

---

## Response Objects and Status Codes

DRF's `Response` class handles serialization and content negotiation. You pass it a Python dict or list, and it converts to JSON (or HTML for the Browsable API):

```python
# Simple response (200 OK by default)
return Response({"message": "Hello"})

# With explicit status code
return Response({"id": 1}, status=status.HTTP_201_CREATED)

# No body (204 No Content)
return Response(status=status.HTTP_204_NO_CONTENT)

# Error response
return Response(
    {"error": "Not found"},
    status=status.HTTP_404_NOT_FOUND,
)
```

DRF provides named constants for every HTTP status code through `rest_framework.status`. Using `status.HTTP_201_CREATED` instead of the integer `201` makes your code self-documenting.

Compare to Express:

```javascript
// Express
res.status(201).json({ id: 1 });
res.status(204).end();
res.status(404).json({ error: "Not found" });
```

---

## Testing Your Views

Update your `events/urls.py` with the views you've built in this lesson, start the development server, and test with `curl`:

```bash
# List events
curl http://127.0.0.1:8000/api/events/

# Get event detail
curl http://127.0.0.1:8000/api/events/1/

# Create an event (will fail without auth, which we'll add in Lesson 5)
curl -X POST http://127.0.0.1:8000/api/events/ \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Event", "description": "A test", "location": "NYC", "start_time": "2026-04-01T18:00:00Z", "end_time": "2026-04-01T20:00:00Z"}'

# Filter by category
curl "http://127.0.0.1:8000/api/events/?category=workshop"

# Search
curl "http://127.0.0.1:8000/api/events/?search=django"
```

You should also test in the browser. DRF's Browsable API at `http://127.0.0.1:8000/api/events/` renders a nice HTML interface with forms for POST requests.

---

## Key Takeaways

1. Django URL routing uses `path()` and `include()`, which map directly to Express's `router.get()` and `app.use()`. Path converters (`<int:pk>`) provide built-in type validation that Express requires manual code for.
2. Function-based views (FBVs) are simple functions decorated with `@api_view`. They work exactly like Express route handlers and are ideal for simple endpoints.
3. Class-based views (CBVs) organize HTTP methods into class methods (`get()`, `post()`, `put()`, `delete()`). They scale better for CRUD endpoints and enable code reuse through inheritance.
4. DRF's `Request` object provides `request.data` (parsed body) and `request.query_params` (query string), which correspond to Express's `req.body` and `req.query`.
5. The `Response` class handles JSON serialization and content negotiation automatically. Named status constants (`status.HTTP_201_CREATED`) make your code self-documenting.
6. URL namespacing (`app_name`) and named routes (`name="event-list"`) let you reference URLs by name instead of hardcoding path strings, reducing bugs when URLs change.
7. Both FBVs and CBVs are valid choices. Use FBVs for simple endpoints and CBVs for full CRUD resources. Real Django projects mix both.

---

## Try It Yourself

1. Add a `CategoryListView` (CBV) and a `CategoryDetailView` (CBV) to your views. Register them in `events/urls.py`. Test listing all categories and getting a single category by its slug (use `<slug:slug>` as the path converter).

2. Add query parameter filtering to your event list endpoint: filter by `start_date` (events starting after a given date) and `location` (case-insensitive contains). Test with `curl` using query strings like `?start_date=2026-04-01&location=brooklyn`.

3. Build an RSVP list view (FBV) at `/api/events/<int:event_pk>/rsvps/` that returns all RSVPs for a given event. Notice how you access the `event_pk` parameter from the URL in the view function. This pattern of nesting resources under a parent is common in REST APIs.

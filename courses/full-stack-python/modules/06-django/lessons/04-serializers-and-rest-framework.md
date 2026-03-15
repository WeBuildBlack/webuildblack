---
title: "Serializers and Django REST Framework"
estimatedMinutes: 40
---

# Serializers and Django REST Framework

In the last lesson, you built views that manually constructed dictionaries from model instances. For every endpoint, you wrote out the fields one by one: `{"id": event.id, "title": event.title, ...}`. That approach works, but it has problems. There's no input validation. There's no consistent error formatting. And the field mapping is duplicated everywhere.

Django REST Framework solves this with serializers. A serializer is a class that handles two jobs: converting model instances to JSON (serialization) and converting incoming JSON to validated Python data (deserialization). If you've used Zod schemas in TypeScript to validate API input and then formatted the response separately, imagine those two steps combined into one reusable class.

In this lesson, you'll replace your manual dictionaries with serializers, then level up to ViewSets and Routers, which can reduce a full CRUD API to about 10 lines of code.

---

## What Serializers Do

A serializer sits between your views and your models. On the way out (response), it converts a model instance into a dictionary that DRF's `Response` serializes to JSON. On the way in (request), it validates incoming data and can create or update model instances.

```
Request:  JSON → Serializer (validate) → Model instance
Response: Model instance → Serializer (transform) → JSON
```

Compare this to Express, where you'd handle these steps separately:

- Input validation: Zod, Joi, express-validator, or manual checks
- Response formatting: manual mapping in the route handler (`res.json({ id: event.id, ... })`)
- Object creation: ORM's `.create()` method

Django serializers unify all three into one class.

---

## Basic Serializer

Here's a serializer written from scratch (without any model integration):

```python
from rest_framework import serializers


class EventSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    title = serializers.CharField(max_length=200)
    description = serializers.CharField()
    location = serializers.CharField(max_length=300)
    start_time = serializers.DateTimeField()
    end_time = serializers.DateTimeField()
    capacity = serializers.IntegerField(default=50, min_value=1)
    is_published = serializers.BooleanField(default=False)

    def create(self, validated_data):
        return Event.objects.create(**validated_data)

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance
```

Each field declaration does double duty: it defines the output format (which fields appear in the JSON response) and the input validation rules (is this field required? what type must it be? what are the constraints?).

The `read_only=True` on `id` means this field appears in the output but is ignored in the input. You don't want users setting their own IDs.

To use this serializer in a view:

```python
# Serializing (model → JSON)
event = Event.objects.get(pk=1)
serializer = EventSerializer(event)
return Response(serializer.data)  # .data is the dict

# Serializing a list
events = Event.objects.all()
serializer = EventSerializer(events, many=True)
return Response(serializer.data)

# Deserializing (JSON → model)
serializer = EventSerializer(data=request.data)
if serializer.is_valid():
    event = serializer.save()  # calls create()
    return Response(EventSerializer(event).data, status=status.HTTP_201_CREATED)
return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

The `serializer.errors` dictionary provides structured validation errors that clients can display:

```json
{
    "title": ["This field is required."],
    "start_time": ["Datetime has wrong format. Use one of these formats instead: YYYY-MM-DDThh:mm[:ss[.uuuuuu]][+HH:MM|-HH:MM|Z]."]
}
```

Compare this to Express with Zod:

```javascript
// Express + Zod equivalent
const EventSchema = z.object({
  title: z.string().max(200),
  description: z.string(),
  location: z.string().max(300),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  capacity: z.number().int().min(1).default(50),
});

router.post("/events", async (req, res) => {
  const result = EventSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json(result.error);
  const event = await Event.create(result.data);
  res.status(201).json(event);
});
```

The Zod approach handles validation, but you still need separate code for response formatting. The Django serializer handles both.

---

## ModelSerializer

Writing out every field manually gets tedious, especially when the fields mirror your model exactly. `ModelSerializer` generates the serializer fields automatically from your model definition:

```python
from rest_framework import serializers
from .models import Event, Category, RSVP


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description"]


class EventSerializer(serializers.ModelSerializer):
    organizer = serializers.StringRelatedField(read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    spots_remaining = serializers.IntegerField(read_only=True)

    class Meta:
        model = Event
        fields = [
            "id",
            "title",
            "description",
            "organizer",
            "category",
            "category_name",
            "location",
            "start_time",
            "end_time",
            "capacity",
            "spots_remaining",
            "is_published",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class RSVPSerializer(serializers.ModelSerializer):
    attendee_name = serializers.CharField(source="attendee.username", read_only=True)
    event_title = serializers.CharField(source="event.title", read_only=True)

    class Meta:
        model = RSVP
        fields = ["id", "event", "event_title", "attendee", "attendee_name", "status", "created_at"]
        read_only_fields = ["created_at"]
```

The `Meta` inner class tells the serializer which model to use and which fields to include. `ModelSerializer` inspects the model and generates the appropriate serializer fields automatically. It knows that `CharField(max_length=200)` on the model should become `CharField(max_length=200)` on the serializer, that `ForeignKey` should become `PrimaryKeyRelatedField`, and so on.

Key features to notice:

**`StringRelatedField`** renders the related object's `__str__()` output. For `organizer`, this shows the username string instead of the user's ID.

**`source` parameter** lets you pull data from related objects or model properties. `source="category.name"` follows the ForeignKey and reads the category's name field.

**`read_only_fields`** in Meta is a shortcut for marking multiple fields as read-only without declaring them explicitly.

**The `fields` list controls exactly what appears in the API.** Never use `fields = "__all__"` in production. It exposes every field on the model, which is a security risk when you add new fields later.

---

## Nested Serializers

Sometimes you want to include related objects as nested JSON instead of just IDs. For example, when returning an event, you might want the full category object instead of just `category: 3`:

```python
class EventDetailSerializer(serializers.ModelSerializer):
    organizer = serializers.StringRelatedField(read_only=True)
    category = CategorySerializer(read_only=True)
    rsvps = RSVPSerializer(many=True, read_only=True)
    spots_remaining = serializers.IntegerField(read_only=True)

    class Meta:
        model = Event
        fields = [
            "id",
            "title",
            "description",
            "organizer",
            "category",
            "location",
            "start_time",
            "end_time",
            "capacity",
            "spots_remaining",
            "is_published",
            "rsvps",
            "created_at",
            "updated_at",
        ]
```

This produces responses like:

```json
{
    "id": 1,
    "title": "Intro to Django",
    "description": "Learn Django from scratch",
    "organizer": "devin",
    "category": {
        "id": 1,
        "name": "Workshop",
        "slug": "workshop",
        "description": ""
    },
    "location": "Brooklyn, NY",
    "start_time": "2026-03-21T12:00:00Z",
    "end_time": "2026-03-21T15:00:00Z",
    "capacity": 30,
    "spots_remaining": 29,
    "is_published": true,
    "rsvps": [
        {
            "id": 1,
            "event": 1,
            "event_title": "Intro to Django",
            "attendee": 2,
            "attendee_name": "maya",
            "status": "confirmed",
            "created_at": "2026-03-14T12:00:00Z"
        }
    ],
    "created_at": "2026-03-14T12:00:00Z",
    "updated_at": "2026-03-14T12:00:00Z"
}
```

A common pattern is to use a simpler serializer for list views (less data, faster queries) and a detailed serializer for detail views (full nested data). The `EventSerializer` for lists, `EventDetailSerializer` for the detail endpoint.

---

## Validation

Serializers support validation at three levels.

### Field-Level Validation

Define a method named `validate_<fieldname>` to validate a single field:

```python
class EventSerializer(serializers.ModelSerializer):
    # ... fields ...

    def validate_capacity(self, value):
        if value < 1:
            raise serializers.ValidationError("Capacity must be at least 1.")
        if value > 10000:
            raise serializers.ValidationError("Capacity cannot exceed 10,000.")
        return value

    def validate_title(self, value):
        if len(value.strip()) < 3:
            raise serializers.ValidationError("Title must be at least 3 characters.")
        return value
```

### Object-Level Validation

Override `validate()` to check relationships between fields:

```python
    def validate(self, data):
        start = data.get("start_time")
        end = data.get("end_time")
        if start and end and end <= start:
            raise serializers.ValidationError({
                "end_time": "End time must be after start time."
            })
        return data
```

### Built-In Validators

Django and DRF provide validators you can attach to fields:

```python
from rest_framework.validators import UniqueTogetherValidator

class RSVPSerializer(serializers.ModelSerializer):
    class Meta:
        model = RSVP
        fields = ["id", "event", "attendee", "status", "created_at"]
        validators = [
            UniqueTogetherValidator(
                queryset=RSVP.objects.all(),
                fields=["event", "attendee"],
                message="You have already RSVPed to this event."
            )
        ]
```

---

## ViewSets and Routers

Here's where DRF really separates itself from Express. A ViewSet combines the logic for an entire resource (list, create, retrieve, update, delete) into a single class. A Router auto-generates the URL patterns for you.

### Defining ViewSets

```python
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from .models import Event, Category, RSVP
from .serializers import (
    EventSerializer,
    EventDetailSerializer,
    CategorySerializer,
    RSVPSerializer,
)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    lookup_field = "slug"


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.filter(is_published=True)
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return EventDetailSerializer
        return EventSerializer

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)


class RSVPViewSet(viewsets.ModelViewSet):
    serializer_class = RSVPSerializer

    def get_queryset(self):
        return RSVP.objects.filter(event_id=self.kwargs["event_pk"])

    def perform_create(self, serializer):
        serializer.save(
            attendee=self.request.user,
            event_id=self.kwargs["event_pk"],
        )
```

Look at `CategoryViewSet`. It's three lines of configuration, and you get a full CRUD API: list all categories, create a category, retrieve one by slug, update a category, and delete a category. Five endpoints from three lines.

Key methods to know:

**`get_serializer_class()`** lets you use different serializers for different actions. The `self.action` attribute tells you which action is being performed: `list`, `create`, `retrieve`, `update`, `partial_update`, or `destroy`.

**`perform_create()`** hooks into the create process. Instead of overriding `create()` entirely, you just add the extra data (like setting the organizer to the current user). The serializer handles everything else.

**`get_queryset()`** customizes which objects the ViewSet operates on. For RSVPs, we filter by the event ID from the URL.

### Registering with a Router

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"events", views.EventViewSet, basename="event")
router.register(r"categories", views.CategoryViewSet, basename="category")

app_name = "events"

urlpatterns = [
    path("health/", views.health_check, name="health-check"),
    path("", include(router.urls)),
]
```

The `DefaultRouter` auto-generates these URL patterns:

| URL | HTTP Method | Action | Name |
|---|---|---|---|
| `/api/events/` | GET | List all events | `event-list` |
| `/api/events/` | POST | Create an event | `event-list` |
| `/api/events/{pk}/` | GET | Retrieve one event | `event-detail` |
| `/api/events/{pk}/` | PUT | Update an event | `event-detail` |
| `/api/events/{pk}/` | PATCH | Partial update | `event-detail` |
| `/api/events/{pk}/` | DELETE | Delete an event | `event-detail` |
| `/api/categories/` | GET | List categories | `category-list` |
| `/api/categories/` | POST | Create a category | `category-list` |
| `/api/categories/{slug}/` | GET | Retrieve by slug | `category-detail` |

The router also generates an API root view at `/api/` that lists all registered endpoints. In Express, you'd write each of these routes manually.

### Nested Routes for RSVPs

For RSVPs nested under events (`/api/events/1/rsvps/`), you can add a manual URL pattern alongside the router:

```python
urlpatterns = [
    path("health/", views.health_check, name="health-check"),
    path("", include(router.urls)),
    path(
        "events/<int:event_pk>/rsvps/",
        views.RSVPViewSet.as_view({"get": "list", "post": "create"}),
        name="event-rsvps",
    ),
]
```

---

## The Browsable API

One of DRF's most useful features is the Browsable API. When you visit any API endpoint in a web browser, DRF renders an interactive HTML page where you can:

- See the response data formatted as JSON
- Submit GET, POST, PUT, PATCH, and DELETE requests
- Fill out forms with proper field types and validation
- Navigate between related endpoints

Visit `http://127.0.0.1:8000/api/` in your browser to see the API root. Click through to each endpoint. Try creating an event using the HTML form at the bottom of the events list page.

This is like having Postman built into your API. It's especially useful during development and for onboarding new team members. No Express equivalent exists out of the box.

You can disable the Browsable API in production by setting the default renderer in `settings.py`:

```python
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
}
```

---

## Putting It All Together

Here's the complete `events/serializers.py` file with all the serializers you've built in this lesson:

```python
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator
from .models import Event, Category, RSVP


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description"]


class RSVPSerializer(serializers.ModelSerializer):
    attendee_name = serializers.CharField(source="attendee.username", read_only=True)
    event_title = serializers.CharField(source="event.title", read_only=True)

    class Meta:
        model = RSVP
        fields = ["id", "event", "event_title", "attendee", "attendee_name", "status", "created_at"]
        read_only_fields = ["created_at"]
        validators = [
            UniqueTogetherValidator(
                queryset=RSVP.objects.all(),
                fields=["event", "attendee"],
                message="You have already RSVPed to this event."
            )
        ]


class EventSerializer(serializers.ModelSerializer):
    organizer = serializers.StringRelatedField(read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    spots_remaining = serializers.IntegerField(read_only=True)

    class Meta:
        model = Event
        fields = [
            "id", "title", "description", "organizer", "category",
            "category_name", "location", "start_time", "end_time",
            "capacity", "spots_remaining", "is_published",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_capacity(self, value):
        if value < 1:
            raise serializers.ValidationError("Capacity must be at least 1.")
        if value > 10000:
            raise serializers.ValidationError("Capacity cannot exceed 10,000.")
        return value

    def validate(self, data):
        start = data.get("start_time")
        end = data.get("end_time")
        if start and end and end <= start:
            raise serializers.ValidationError({
                "end_time": "End time must be after start time."
            })
        return data


class EventDetailSerializer(serializers.ModelSerializer):
    organizer = serializers.StringRelatedField(read_only=True)
    category = CategorySerializer(read_only=True)
    rsvps = RSVPSerializer(many=True, read_only=True)
    spots_remaining = serializers.IntegerField(read_only=True)

    class Meta:
        model = Event
        fields = [
            "id", "title", "description", "organizer", "category",
            "location", "start_time", "end_time", "capacity",
            "spots_remaining", "is_published", "rsvps",
            "created_at", "updated_at",
        ]
```

Create this file at `events/serializers.py`. You'll import from it in your views.

---

## Key Takeaways

1. Serializers handle both serialization (model to JSON) and deserialization (JSON to validated data), combining what you'd do with Zod schemas and manual response formatting in Express.
2. `ModelSerializer` auto-generates serializer fields from your model, eliminating boilerplate. Specify fields explicitly in `Meta.fields` rather than using `"__all__"` for security.
3. Nested serializers let you include related objects as embedded JSON instead of just foreign key IDs. Use simpler serializers for list views and detailed ones for single-object views.
4. Validation operates at three levels: field-level (`validate_<fieldname>`), object-level (`validate()`), and declarative (`validators` in Meta). DRF returns structured error responses automatically.
5. ViewSets combine list, create, retrieve, update, and delete logic into a single class. A `ModelViewSet` with a queryset and serializer gives you full CRUD in three lines.
6. Routers auto-generate URL patterns from ViewSets, eliminating manual URL configuration for standard CRUD endpoints.
7. The Browsable API provides a built-in web interface for testing your API endpoints, saving you from switching to Postman or curl during development.

---

## Try It Yourself

1. Create an `EventCreateSerializer` that only accepts the fields needed for creating an event (title, description, location, start_time, end_time, capacity, category). Use it in the `EventViewSet` by returning it from `get_serializer_class()` when `self.action == "create"`. This separates your input schema from your output schema, a common production pattern.

2. Add a custom action to the `EventViewSet` that lets users RSVP to an event. Use the `@action` decorator: `@action(detail=True, methods=["post"])`. The endpoint should be `POST /api/events/{pk}/rsvp/` and should create an RSVP for the current user. Return a 400 error if the event is at capacity.

3. Experiment with the Browsable API. Visit `/api/events/` in your browser, create an event using the HTML form, then navigate to its detail view. Try updating and deleting through the web interface. Notice how the form fields match your serializer validation rules.

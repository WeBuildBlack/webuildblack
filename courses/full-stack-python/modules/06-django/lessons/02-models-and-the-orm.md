---
title: "Models and the ORM"
estimatedMinutes: 40
---

# Models and the ORM

In your Express projects, you've probably used Sequelize, Prisma, or Knex to interact with your database. Maybe you wrote raw SQL. Django takes a different approach: it has a built-in ORM that's tightly integrated with the rest of the framework. Your models are Python classes, each class maps to a database table, and each instance maps to a row. You never write SQL directly (though you can if you need to).

The Django ORM handles schema definition, migrations, queries, relationships, and validation. In the Express world, you'd need separate tools for each of those. Here, it's one system with one API.

In this lesson, you'll define the data models for Gather, create and run migrations, and learn the query API that replaces raw SQL.

---

## Defining Models

Open `events/models.py`. This is where all your data models live. Each model is a Python class that inherits from `django.db.models.Model`, and each class attribute represents a database column.

Here's the full set of models for Gather:

```python
from django.db import models
from django.conf import settings
from django.utils import timezone


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Event(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="organized_events",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events",
    )
    location = models.CharField(max_length=300)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    capacity = models.PositiveIntegerField(default=50)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_time"]

    def __str__(self):
        return self.title

    @property
    def is_upcoming(self):
        return self.start_time > timezone.now()

    @property
    def spots_remaining(self):
        return self.capacity - self.rsvps.filter(status="confirmed").count()


class RSVP(models.Model):
    STATUS_CHOICES = [
        ("confirmed", "Confirmed"),
        ("waitlisted", "Waitlisted"),
        ("cancelled", "Cancelled"),
    ]

    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="rsvps",
    )
    attendee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="rsvps",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="confirmed",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["event", "attendee"]
        verbose_name = "RSVP"
        verbose_name_plural = "RSVPs"

    def __str__(self):
        return f"{self.attendee.username} - {self.event.title} ({self.status})"
```

That's a lot of code, so let's break down the key concepts.

---

## Field Types

Each model attribute is a field type that maps to a SQL column type. Here are the ones used above, compared to SQL:

| Django Field | SQL Equivalent | Purpose |
|---|---|---|
| `CharField(max_length=200)` | `VARCHAR(200)` | Short text with a maximum length |
| `TextField()` | `TEXT` | Long text, no length limit |
| `SlugField()` | `VARCHAR` + index | URL-friendly string (auto-validates format) |
| `PositiveIntegerField()` | `INTEGER CHECK (>=0)` | Non-negative integer |
| `BooleanField(default=False)` | `BOOLEAN` | True/False |
| `DateTimeField()` | `TIMESTAMP` | Date and time |
| `DateTimeField(auto_now_add=True)` | `TIMESTAMP DEFAULT NOW()` | Set once on creation |
| `DateTimeField(auto_now=True)` | (trigger-based) | Updated every time the record is saved |

Field options you'll use constantly:

- `blank=True` means the field can be submitted as empty in forms and serializers. It's a validation rule, not a database constraint.
- `null=True` means the database column allows NULL values.
- `default=value` sets a default if no value is provided.
- `unique=True` adds a UNIQUE constraint to the column.
- `choices=[...]` restricts the field to a predefined set of values, like an enum.

A common mistake: using `null=True` on string fields. Django convention is to use `blank=True` for strings and represent "empty" as an empty string, not NULL. That way you have one representation of "no value" instead of two.

---

## Relationships

Django supports all the relationship types you know from SQL, but expresses them as Python field types.

### ForeignKey (Many-to-One)

```python
organizer = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.CASCADE,
    related_name="organized_events",
)
```

This creates an `organizer_id` column in the database. The `on_delete` argument specifies what happens when the referenced record is deleted:

- `CASCADE`: delete this record too (if a user is deleted, delete their events)
- `SET_NULL`: set this field to NULL (requires `null=True`)
- `PROTECT`: prevent the deletion entirely

The `related_name` lets you traverse the relationship in reverse. With `related_name="organized_events"`, you can write `user.organized_events.all()` to get all events a user organized.

In Express with Sequelize, you'd define this relationship separately:

```javascript
// Sequelize equivalent
User.hasMany(Event, { as: "organized_events", foreignKey: "organizerId" });
Event.belongsTo(User, { as: "organizer", foreignKey: "organizerId" });
```

Django handles both directions from a single `ForeignKey` declaration.

### ManyToManyField

If you needed a many-to-many relationship (like tags on events), it would look like this:

```python
tags = models.ManyToManyField("Tag", related_name="events", blank=True)
```

Django automatically creates the junction table for you. No need to define it manually.

---

## The __str__ Method and Meta Class

Every model should define `__str__`. This controls how the object appears in the admin panel, the Django shell, and log output:

```python
def __str__(self):
    return self.title
```

Without it, you'd see `Event object (1)` everywhere, which is useless for debugging.

The `Meta` inner class configures model-level behavior:

```python
class Meta:
    ordering = ["-start_time"]              # Default sort order (- means descending)
    verbose_name_plural = "categories"      # Fixes "Categorys" in admin
    unique_together = ["event", "attendee"] # Composite unique constraint
```

---

## Model Properties

The `@property` decorator lets you define computed attributes that behave like regular fields but aren't stored in the database:

```python
@property
def spots_remaining(self):
    return self.capacity - self.rsvps.filter(status="confirmed").count()
```

You can access this like `event.spots_remaining` (no parentheses). It runs the query every time it's accessed. This is useful for values that depend on related data and would be stale if cached in a column.

---

## Migrations

Migrations are Django's way of syncing your Python model definitions with the actual database schema. If you've used Prisma Migrate or Sequelize migrations, this will feel familiar, but with one key difference: Django auto-generates migrations by comparing your current models to the previous migration state.

### Step 1: Generate the Migration

```bash
python3 manage.py makemigrations events
```

Output:

```
Migrations for 'events':
  events/migrations/0001_initial.py
    - Create model Category
    - Create model Event
    - Create model RSVP
```

Django inspected your models, compared them to the last known state (no previous migrations), and generated a migration file. Open `events/migrations/0001_initial.py` to see the generated code. Each migration is a Python file with a list of operations (CreateModel, AddField, AlterField, etc.).

### Step 2: Apply the Migration

```bash
python3 manage.py migrate
```

This executes the SQL to create your tables. Django tracks which migrations have been applied in a `django_migrations` table, so it never runs the same migration twice.

### The Migration Workflow

Every time you change a model (add a field, rename a field, change a relationship), you repeat the same two steps:

```bash
python3 manage.py makemigrations
python3 manage.py migrate
```

Compare this to the Express ecosystem: with Sequelize, you either write migrations manually or use `sequelize-cli migration:generate`. With Prisma, you run `prisma migrate dev`. Django's approach is closest to Prisma's, where migrations are generated from your schema definition.

---

## The Django Shell

The Django shell is an interactive Python REPL with your project's models and settings pre-loaded. It's the best way to learn the ORM.

```bash
python3 manage.py shell
```

First, create some test data:

```python
from django.contrib.auth.models import User
from events.models import Category, Event, RSVP
from django.utils import timezone
from datetime import timedelta

# Create a user
user = User.objects.create_user("devin", "devin@gather.io", "testpass123")

# Create categories
workshop = Category.objects.create(name="Workshop", slug="workshop")
meetup = Category.objects.create(name="Meetup", slug="meetup")

# Create events
event1 = Event.objects.create(
    title="Intro to Django",
    description="Learn Django from scratch",
    organizer=user,
    category=workshop,
    location="Brooklyn, NY",
    start_time=timezone.now() + timedelta(days=7),
    end_time=timezone.now() + timedelta(days=7, hours=3),
    capacity=30,
    is_published=True,
)

event2 = Event.objects.create(
    title="React Patterns Meetup",
    description="Advanced React patterns discussion",
    organizer=user,
    category=meetup,
    location="Manhattan, NY",
    start_time=timezone.now() + timedelta(days=14),
    end_time=timezone.now() + timedelta(days=14, hours=2),
    capacity=25,
    is_published=True,
)

# Create an RSVP
attendee = User.objects.create_user("maya", "maya@gather.io", "testpass123")
rsvp = RSVP.objects.create(event=event1, attendee=attendee, status="confirmed")
```

---

## ORM Queries

Now that you have data, here are the essential query methods. Every model has an `objects` manager that provides the query interface.

### Retrieving Records

```python
# Get all events
Event.objects.all()

# Get a single record by primary key
Event.objects.get(pk=1)

# Get a single record by field value
Event.objects.get(title="Intro to Django")

# Filter (returns a QuerySet, like an array of results)
Event.objects.filter(is_published=True)
Event.objects.filter(category=workshop)
Event.objects.filter(start_time__gte=timezone.now())  # gte = greater than or equal

# Exclude
Event.objects.exclude(is_published=False)

# Order by
Event.objects.order_by("start_time")   # ascending
Event.objects.order_by("-start_time")  # descending
```

### Field Lookups

Django uses double-underscore syntax for query operators. This replaces the SQL `WHERE` clause:

| Lookup | SQL Equivalent | Example |
|---|---|---|
| `exact` (default) | `= value` | `title="Django"` |
| `iexact` | `ILIKE value` | `title__iexact="django"` |
| `contains` | `LIKE '%value%'` | `title__contains="Django"` |
| `icontains` | `ILIKE '%value%'` | `title__icontains="django"` |
| `gt` / `gte` | `>` / `>=` | `capacity__gte=20` |
| `lt` / `lte` | `<` / `<=` | `capacity__lt=50` |
| `in` | `IN (...)` | `status__in=["confirmed", "waitlisted"]` |
| `startswith` | `LIKE 'value%'` | `title__startswith="Intro"` |
| `isnull` | `IS NULL` | `category__isnull=True` |

### QuerySet Chaining

QuerySets are lazy. They don't hit the database until you evaluate them (iterate, slice, or call a method like `.count()`). You can chain filters:

```python
upcoming_workshops = (
    Event.objects
    .filter(is_published=True)
    .filter(category__name="Workshop")
    .filter(start_time__gte=timezone.now())
    .order_by("start_time")
)
```

This generates a single SQL query, no matter how many `.filter()` calls you chain. Compare this to building a Knex query:

```javascript
// Knex equivalent
const events = await knex("events")
  .where("is_published", true)
  .where("category_id", workshopId)
  .where("start_time", ">=", new Date())
  .orderBy("start_time");
```

### Aggregation

```python
from django.db.models import Count, Avg, Max, Min

# Count RSVPs per event
Event.objects.annotate(rsvp_count=Count("rsvps"))

# Get the annotated value
event = Event.objects.annotate(rsvp_count=Count("rsvps")).first()
event.rsvp_count  # e.g., 5

# Aggregate across all records
Event.objects.aggregate(
    total_events=Count("id"),
    avg_capacity=Avg("capacity"),
    max_capacity=Max("capacity"),
)
# Returns: {"total_events": 2, "avg_capacity": 27.5, "max_capacity": 30}
```

### Creating, Updating, and Deleting

```python
# Create
new_event = Event.objects.create(
    title="Python Workshop",
    description="Hands-on Python",
    organizer=user,
    location="Brooklyn, NY",
    start_time=timezone.now() + timedelta(days=21),
    end_time=timezone.now() + timedelta(days=21, hours=2),
)

# Update a single record
event = Event.objects.get(pk=1)
event.title = "Updated Title"
event.save()

# Bulk update
Event.objects.filter(is_published=False).update(is_published=True)

# Delete
event.delete()

# Bulk delete
Event.objects.filter(start_time__lt=timezone.now()).delete()
```

### Traversing Relationships

Django lets you follow relationships in both directions using the double-underscore syntax:

```python
# Forward: event -> category (follow the ForeignKey)
Event.objects.filter(category__name="Workshop")

# Reverse: user -> events (using related_name)
user.organized_events.all()

# Reverse: event -> rsvps
event1.rsvps.all()
event1.rsvps.filter(status="confirmed").count()
```

---

## Registering Models in Admin

One of Django's standout features is the built-in admin panel. Register your models in `events/admin.py`:

```python
from django.contrib import admin
from .models import Category, Event, RSVP


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ["title", "organizer", "category", "start_time", "is_published"]
    list_filter = ["is_published", "category", "start_time"]
    search_fields = ["title", "description"]


@admin.register(RSVP)
class RSVPAdmin(admin.ModelAdmin):
    list_display = ["attendee", "event", "status", "created_at"]
    list_filter = ["status"]
```

Now visit `http://127.0.0.1:8000/admin/` and you'll see full CRUD interfaces for all three models, with filtering, search, and pagination. Building something equivalent in Express would take days.

---

## Key Takeaways

1. Django models are Python classes where each attribute maps to a database column. The model definition is your single source of truth for the database schema.
2. Django auto-generates migrations by diffing your current models against the previous migration state. The two-step workflow (`makemigrations` then `migrate`) keeps your database in sync with your code.
3. The ORM uses lazy QuerySets that can be chained and only hit the database when evaluated. This is similar to building queries with Knex or Prisma's fluent API.
4. Double-underscore lookups (`__gte`, `__contains`, `__isnull`) replace SQL WHERE operators and let you filter across relationships (`category__name="Workshop"`).
5. `ForeignKey` defines many-to-one relationships and creates reverse accessors via `related_name`, handling both directions from a single declaration.
6. The `__str__` method, `Meta` class, and `@property` decorator customize how models behave in the admin, shell, and your application code.
7. The Django admin gives you a full CRUD interface for every registered model with almost no code, saving significant development time compared to building admin panels from scratch.

---

## Try It Yourself

1. Add a `Tag` model with a `name` field and a `ManyToManyField` on `Event` called `tags`. Run `makemigrations` and `migrate`, then use the shell to add tags to events. Query all events with a specific tag using `Event.objects.filter(tags__name="python")`.

2. Open the Django shell and write queries to answer these questions about your test data: How many confirmed RSVPs does each event have? Which events have more than 20 spots remaining? Which categories have the most events?

3. Add a `max_rsvps_per_user` field to the `Event` model (default 1). Run `makemigrations`, inspect the generated migration file, then run `migrate`. Notice how Django handles adding a column to an existing table with data.

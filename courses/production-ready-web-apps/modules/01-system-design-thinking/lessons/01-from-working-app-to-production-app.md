---
title: "From Working App to Production App"
estimatedMinutes: 35
isFreePreview: true
---

# From Working App to Production App

You built an app. It works. Your demo went great. Users are signing up.

And then 10,000 of them show up at the same time.

This module is about what happens next. Not the panic (though there will be some of that), but the systematic thinking that separates "it works on my machine" from "it works for 100,000 people at 3am on a Saturday."

## What You'll Build in This Course

Throughout this course, you'll take a real application called **Gather** and transform it from a working prototype into a production-grade platform capable of handling 100,000 concurrent users.

Gather is an event management platform (think Meetup or Eventbrite, but focused on community events). It was built in the Full-Stack Python course using Django, Django REST Framework, Next.js, and PostgreSQL. If you took that course, you already know the codebase. If you didn't, don't worry. We'll get you up to speed in this lesson.

By the end of this course, Gather will have:

- Database query optimization and connection pooling
- Background job processing with Celery and Redis
- Multi-layer caching (browser, CDN, application, database)
- Object storage with async image processing
- Real-time updates via Server-Sent Events
- Full observability with OpenTelemetry, Prometheus, and Grafana
- Zero-downtime deployments with blue-green strategy
- Security hardening and chaos testing
- Load testing proving it handles 1,000 concurrent users on modest hardware

## The "It Works" Trap

Here's a pattern that plays out at startups, agencies, and side projects every single day:

1. Developer builds an app
2. App works great in development (1 user, local database, no network latency)
3. App gets deployed
4. App works great for the first 50 users
5. App starts getting slow around 500 users
6. App falls over at 5,000 users
7. Developer starts Googling "how to scale Django" at 2am

The problem isn't that the developer did anything wrong. The problem is that building for correctness and building for production are two different skills. Your computer science degree (or bootcamp, or self-taught journey) taught you the first one. This course teaches the second.

## What Changes at Scale

Let's be specific about what breaks. Here are the most common failure modes when an app goes from dozens of users to thousands:

### Database Becomes the Bottleneck

In development, your database queries return instantly because the tables have 20 rows. With 100,000 events and 2 million RSVPs, that unindexed `WHERE` clause takes 4 seconds instead of 4 milliseconds.

```sql
-- This query works fine with 100 events
SELECT e.*, COUNT(r.id) as rsvp_count
FROM events e
LEFT JOIN rsvps r ON r.event_id = e.id
WHERE e.date >= NOW()
GROUP BY e.id
ORDER BY e.date;

-- With 100K events and 2M RSVPs, this query will
-- take several seconds and lock your database
```

### Connection Exhaustion

Django's default database configuration opens a new PostgreSQL connection for every request. PostgreSQL has a hard limit (typically 100 connections by default). At 100 concurrent requests, you're already at that limit. At 1,000, your app is returning 500 errors.

```
# What your logs look like at 3am
OperationalError: FATAL: too many connections for role "gather_app"
OperationalError: FATAL: too many connections for role "gather_app"
OperationalError: FATAL: too many connections for role "gather_app"
```

### Synchronous Processing Blocks Everything

When a user RSVPs to an event, your app probably does something like this:

```python
def create_rsvp(request, event_id):
    # 1. Create the RSVP record (~5ms)
    rsvp = RSVP.objects.create(user=request.user, event_id=event_id)

    # 2. Send confirmation email (~800ms waiting for SMTP)
    send_confirmation_email(request.user, event)

    # 3. Notify the event organizer (~500ms waiting for SMTP)
    send_organizer_notification(event.organizer, rsvp)

    # 4. Update RSVP count cache (~2ms)
    update_rsvp_count(event_id)

    return Response({"status": "confirmed"})
```

The user clicked one button, but they're waiting 1.3 seconds because the server is sending emails synchronously. Multiply that by 500 simultaneous RSVPs for a popular event, and you've got 500 worker threads all blocked waiting on an email server.

### Static Files Crush Your Server

Every page load triggers requests for CSS, JavaScript, images, and fonts. If your Django server is serving those files, it's spending CPU cycles on file I/O instead of processing business logic. With 10,000 users browsing events, your server is spending 90% of its capacity serving the same `logo.png` over and over.

### No Visibility Into What's Happening

When your app is slow, can you answer these questions?

- Which endpoint is the slowest?
- How many requests per second are you handling?
- What's your database connection pool utilization?
- How much memory is each worker using?
- Is the problem getting worse or stabilizing?

If the answer is "I'd have to SSH into the server and check," you don't have observability. You're flying blind.

## Meet Gather: The Current Architecture

Gather's current architecture is straightforward. Here's what we're working with:

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Browser    │────>│  Next.js (SSR)   │────>│  Django API  │
│  (React UI)  │<────│  Port 3000       │<────│  Port 8000   │
└─────────────┘     └──────────────────┘     └──────┬───────┘
                                                     │
                                              ┌──────┴───────┐
                                              │  PostgreSQL   │
                                              │  Port 5432    │
                                              └──────────────┘
```

### The Django Backend (API)

The Django backend uses Django REST Framework to expose a JSON API. Here are the key models:

```python
# events/models.py (simplified)

class Event(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    organizer = models.ForeignKey(User, on_delete=models.CASCADE)
    date = models.DateTimeField()
    location = models.CharField(max_length=300)
    capacity = models.PositiveIntegerField(default=100)
    image = models.ImageField(upload_to='events/', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date']

class RSVP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='rsvps')
    status = models.CharField(
        max_length=20,
        choices=[('confirmed', 'Confirmed'), ('waitlisted', 'Waitlisted')],
        default='confirmed'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'event']

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    events = models.ManyToManyField(Event, related_name='categories', blank=True)
```

Key API endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/events/` | GET | List events (paginated) |
| `/api/events/{id}/` | GET | Event detail with RSVP count |
| `/api/events/` | POST | Create event (auth required) |
| `/api/events/{id}/rsvp/` | POST | RSVP to event (auth required) |
| `/api/events/{id}/rsvps/` | GET | List RSVPs for event |
| `/api/categories/` | GET | List categories |
| `/api/users/me/` | GET | Current user profile |
| `/api/auth/register/` | POST | User registration |
| `/api/auth/login/` | POST | Get JWT token |

### The Next.js Frontend

The Next.js frontend uses the App Router with server-side rendering. It calls the Django API for all data and handles routing, SEO, and the interactive UI.

```typescript
// src/app/events/[id]/page.tsx (simplified)

export default async function EventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const event = await fetch(
    `${process.env.API_URL}/api/events/${params.id}/`,
    { next: { revalidate: 60 } }
  ).then((res) => res.json());

  return (
    <main>
      <EventHeader event={event} />
      <RSVPButton eventId={event.id} spotsLeft={event.capacity - event.rsvp_count} />
      <EventDetails event={event} />
      <AttendeeList eventId={event.id} />
    </main>
  );
}
```

### The Database

PostgreSQL stores everything: users, events, RSVPs, categories. The current schema has no custom indexes beyond Django's auto-generated ones (primary keys, foreign keys, unique constraints). No connection pooling. No read replicas.

### What's Missing (and What We'll Add)

Here's a preview of the production infrastructure we'll build throughout this course:

```
                    ┌─────────┐
                    │   CDN   │  (static assets, image variants)
                    └────┬────┘
                         │
┌──────────┐      ┌──────┴──────┐      ┌──────────────┐
│ Browser  │─────>│ Load        │─────>│ Next.js x 2  │
│          │<─────│ Balancer    │<─────│ (SSR + SSE)  │
└──────────┘      └──────┬──────┘      └──────┬───────┘
                         │                     │
                  ┌──────┴──────┐       ┌──────┴───────┐
                  │ Django x 4  │       │    Redis     │
                  │ (API +      │──────>│  (cache +    │
                  │  Workers)   │<──────│   pub/sub)   │
                  └──────┬──────┘       └──────────────┘
                         │
                  ┌──────┴──────┐       ┌──────────────┐
                  │ PgBouncer   │       │ Celery       │
                  │ (pool)      │       │ Workers x 2  │
                  └──────┬──────┘       └──────┬───────┘
                         │                     │
                  ┌──────┴──────┐       ┌──────┴───────┐
                  │ PostgreSQL  │       │ Object       │
                  │ (primary)   │       │ Storage (S3) │
                  └──────┬──────┘       └──────────────┘
                         │
                  ┌──────┴──────┐       ┌──────────────┐
                  │ PostgreSQL  │       │ Prometheus + │
                  │ (read       │       │ Grafana      │
                  │  replica)   │       │ (monitoring) │
                  └─────────────┘       └──────────────┘
```

Each module in this course adds a piece of that architecture. By the end, you'll understand not just *how* to add each component, but *why* it belongs there and *when* you'd choose it.

## Gather Checkpoint: Starting Without Full-Stack Python

If you didn't take the Full-Stack Python course, you can still follow along. Here's how to get the Gather starter repo set up:

### Prerequisites

Make sure you have these installed:

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- Docker and Docker Compose
- Git

### Clone and Set Up

```bash
# Clone the Gather starter repo
git clone https://github.com/WeBuildBlack/gather-production-starter.git
cd gather-production-starter

# The repo has two directories:
# backend/   -- Django + DRF API
# frontend/  -- Next.js App Router

# Set up the backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Edit with your database credentials

# Create the database
createdb gather_dev

# Run migrations and seed data
python manage.py migrate
python manage.py seed_data  # Creates 50 events, 200 users, 1000 RSVPs

# Start the Django server
python manage.py runserver
```

```bash
# In a new terminal, set up the frontend
cd frontend
npm install
cp .env.example .env.local  # API_URL=http://localhost:8000

# Start the Next.js dev server
npm run dev
```

Visit `http://localhost:3000` and you should see the Gather homepage with a list of upcoming events.

### Docker Compose (Alternative)

If you prefer Docker, the repo includes a `docker-compose.yml` that starts everything:

```bash
docker compose up --build
```

This starts PostgreSQL, the Django API, and the Next.js frontend. The seed data runs automatically on first boot.

### Verify Your Setup

Run through this checklist to make sure everything is working:

1. Homepage loads at `http://localhost:3000` and shows events
2. You can register a new account
3. You can log in and RSVP to an event
4. The API responds at `http://localhost:8000/api/events/`
5. The Django admin is accessible at `http://localhost:8000/admin/` (create a superuser with `python manage.py createsuperuser`)

If any of these fail, check the troubleshooting section in the repo's README.

## How This Course Is Structured

Each module follows the same pattern:

1. **Learn the concepts** through lessons with real-world examples and analogies
2. **See the code** with practical implementations in Gather
3. **Build it yourself** in the module project, adding that capability to your Gather fork
4. **Test your understanding** with the module quiz

The modules build on each other. Module 2 (Database Performance) feeds into Module 4 (Caching), which feeds into Module 6 (Real-Time). By the capstone in Module 10, you'll load-test the entire system and prove it can handle production traffic.

## What "Production-Ready" Actually Means

Let's define our target. By the end of this course, Gather will meet these criteria:

| Dimension | Target |
|-----------|--------|
| **Latency** | p95 response time under 200ms for reads |
| **Throughput** | 500+ requests/second sustained |
| **Availability** | Zero-downtime deployments |
| **Durability** | Automated daily backups with point-in-time recovery |
| **Observability** | Dashboards for latency, errors, throughput, saturation |
| **Security** | OWASP Top 10 addressed, secrets managed properly |
| **Resilience** | Graceful degradation when dependencies fail |

These aren't arbitrary numbers. They represent the baseline expectations for a production web application serving real users. Throughout this course, you'll learn how to measure each one and how to hit those targets.

## Up Next

In the next lesson, we'll dig into the two most fundamental metrics of system performance: latency and throughput. You'll learn why averages are misleading, why the 99th percentile matters more than you think, and how to measure both in a real application.

Let's get started.

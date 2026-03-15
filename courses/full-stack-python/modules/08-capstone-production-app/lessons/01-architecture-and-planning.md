---
title: "Architecture and Planning"
estimatedMinutes: 45
---

# Architecture and Planning

You made it. Seven modules of TypeScript, advanced React, state management, testing, Python, Django, and DevOps. Every one of those skills was building toward this moment: shipping a production feature from database to deployment. This is the module where everything connects.

The capstone is not a toy project. You are extending Gather, the community event platform you have been building throughout this course, with a real feature that touches every layer of the stack. By the end, you will have a portfolio piece that demonstrates full-stack production engineering. The kind of project that makes hiring managers stop scrolling.

---

## The Gather Architecture

Before you add anything new, you need a clear mental model of what already exists. Here is the full Gather system as it stands after Module 07.

**Frontend (Next.js + TypeScript):**
- App Router with server and client components
- Zustand for UI state (modals, filters, sidebar)
- TanStack Query for all API data fetching and caching
- Vitest + React Testing Library for component tests
- Playwright for end-to-end tests
- Sentry for error tracking
- Deployed to Vercel

**Backend (Django + DRF):**
- Django REST Framework with ModelSerializers and ViewSets
- Token authentication with custom permissions
- PostgreSQL database
- Structured JSON logging
- Health check endpoint
- Deployed to Railway via Docker

**Infrastructure:**
- Docker Compose for local development (frontend, backend, PostgreSQL)
- GitHub Actions CI pipeline (lint, type check, test, build)
- Automatic deployment on merge to `main`
- Sentry monitoring on both frontend and backend

**Data models you have built:**
- `User` (Django's built-in, extended with profile fields)
- `Event` (title, description, date, location, capacity, category, organizer)
- `RSVP` (user, event, status, created_at)
- `Category` (name, slug, description)

This is a solid foundation. Every feature you add will plug into these existing patterns.

---

## Choose Your Feature

You will pick one of four features to build for your capstone. Each one is scoped to be completable in a few hours while still requiring work across the full stack. Read through all four options before deciding. Pick the one that interests you most, or the one that fills a gap in your portfolio.

### Option 1: Waitlist System

When an event reaches its capacity, users should be able to join a waitlist. If someone cancels their RSVP, the first person on the waitlist gets promoted automatically.

**Database changes:**
- Add a `WaitlistEntry` model with fields: `user`, `event`, `position`, `created_at`, `promoted_at` (nullable)
- Add a `status` field to `WaitlistEntry`: `waiting`, `promoted`, `expired`

**API endpoints:**
- `POST /api/events/{id}/waitlist/` to join the waitlist
- `DELETE /api/events/{id}/waitlist/` to leave the waitlist
- `GET /api/events/{id}/waitlist/` to see the waitlist (organizers only)
- Update the existing RSVP cancellation logic to trigger waitlist promotion

**Frontend components:**
- "Join Waitlist" button that appears when an event is full
- Waitlist position indicator ("You are #3 on the waitlist")
- Optimistic UI for joining and leaving the waitlist
- Organizer view showing the full waitlist

**Tests needed:**
- Django unit tests for waitlist promotion logic
- API tests for join/leave/view endpoints
- Component tests for waitlist button states
- E2E test for the full join-waitlist-then-get-promoted flow

---

### Option 2: Recurring Events

Organizers should be able to create events that repeat on a schedule (weekly, biweekly, monthly). The system generates individual event instances from the recurrence pattern.

**Database changes:**
- Add a `RecurrenceRule` model: `frequency` (weekly/biweekly/monthly), `day_of_week`, `start_date`, `end_date`, `parent_event` (FK to Event)
- Add an `is_recurring` flag and `recurrence_rule` FK to `Event`
- Individual occurrences are regular `Event` rows linked to the parent via `parent_event`

**API endpoints:**
- `POST /api/events/` extended to accept recurrence rules
- `GET /api/events/{id}/occurrences/` to list all occurrences
- `PUT /api/events/{id}/occurrences/` to update all future occurrences
- Django management command `generate_occurrences` to create upcoming event instances

**Frontend components:**
- Recurrence selector in the event creation form (frequency, end date)
- "This is a recurring event" badge on event cards
- Calendar-style view showing upcoming occurrences
- "Edit this event" vs. "Edit all future events" modal

**Tests needed:**
- Unit tests for date generation logic (edge cases: month boundaries, leap years)
- API tests for creating and querying recurring events
- Component tests for the recurrence selector
- E2E test for creating a recurring event and viewing its occurrences

---

### Option 3: Admin Analytics Dashboard

Organizers need a dashboard showing event statistics: attendance trends, popular categories, RSVP conversion rates, and peak event times.

**Database changes:**
- No new models needed. This feature is read-only, built on aggregation queries over existing data.
- Add a database view or Django queryset annotations for common aggregations

**API endpoints:**
- `GET /api/analytics/overview/` with total events, total RSVPs, average attendance
- `GET /api/analytics/trends/` with attendance data grouped by week or month
- `GET /api/analytics/categories/` with event and RSVP counts per category
- `GET /api/analytics/peak-times/` with event distribution by day of week and hour
- All endpoints restricted to staff users

**Frontend components:**
- Dashboard page with summary stat cards (total events, RSVPs, conversion rate)
- Line chart for attendance trends over time (Recharts)
- Bar chart for category popularity (Recharts)
- Heatmap or bar chart for peak event times
- Date range filter for all charts

**Tests needed:**
- Django tests for aggregation queries with known test data
- API tests for permission enforcement (non-staff users get 403)
- Component tests for chart rendering with mock data
- E2E test for navigating to the dashboard and verifying data loads

---

### Option 4: Comments and Discussion

Users should be able to discuss events through threaded comments. Organizers can pin important comments and moderate the discussion.

**Database changes:**
- Add a `Comment` model: `user`, `event`, `parent_comment` (nullable FK for threading), `body`, `is_pinned`, `created_at`, `updated_at`
- Add a `is_deleted` soft-delete flag for moderation

**API endpoints:**
- `POST /api/events/{id}/comments/` to create a comment (or reply)
- `GET /api/events/{id}/comments/` to list comments with nested replies
- `PUT /api/comments/{id}/` to edit your own comment
- `DELETE /api/comments/{id}/` to soft-delete (author or organizer)
- `POST /api/comments/{id}/pin/` to pin a comment (organizer only)

**Frontend components:**
- Comment thread with nested replies (2 levels deep max)
- Comment form with real-time character count
- Pinned comment displayed at top of thread
- "Delete" and "Pin" actions with appropriate permissions
- Optimistic UI for posting new comments

**Tests needed:**
- Django tests for nested comment serialization
- API tests for permission logic (edit own, delete own or as organizer, pin as organizer)
- Component tests for the comment thread rendering
- E2E test for posting a comment, replying, and seeing the thread update

---

## Architecture Decision Records

Before you write any code, document your technical decisions. An Architecture Decision Record (ADR) is a short document that captures a significant design choice, the context behind it, and the reasoning for the decision. ADRs are standard practice on professional engineering teams because they answer the question that every developer eventually asks about unfamiliar code: "Why was it done this way?"

Here is the template:

```markdown
# ADR-001: [Title of Decision]

## Status
Accepted

## Context
What is the situation? What problem are you solving? What constraints exist?

## Decision
What did you decide to do?

## Consequences
What are the trade-offs? What becomes easier? What becomes harder?

## Alternatives Considered
What other approaches did you evaluate, and why did you reject them?
```

For example, if you chose the waitlist feature, your ADR might look like this:

```markdown
# ADR-001: Waitlist Promotion Strategy

## Status
Accepted

## Context
When events reach capacity, users need to join a waitlist. When an RSVP is
cancelled, the next person on the waitlist should be promoted. We need to
decide whether promotion happens synchronously (during the RSVP cancellation
request) or asynchronously (via a background job).

## Decision
Promote synchronously in the RSVP cancellation view. When an RSVP is
cancelled, immediately promote the first waitlist entry and send a
notification.

## Consequences
- Simpler implementation (no background job infrastructure needed)
- Promotion is immediate, so waitlisted users get notified right away
- If the notification service is slow, the RSVP cancellation response
  will be slower
- If two RSVPs are cancelled simultaneously, we need database-level
  locking to prevent double-promotion

## Alternatives Considered
- Async promotion via Celery task: more scalable but adds infrastructure
  complexity (Redis, Celery worker) that is overkill for Gather's current
  scale
- Cron job that checks for openings every 5 minutes: simpler but creates
  a delay that feels broken to users
```

Write at least one ADR for your chosen feature before you start coding. Put it in a `docs/` folder in your project or at the top of your PR description.

---

## Task Breakdown: Vertical Slices

The most common mistake in planning a full-stack feature is breaking it down by layer: "First build all the models, then all the serializers, then all the endpoints, then all the components." This horizontal approach means nothing works until everything works. You cannot test, demo, or get feedback until the very end.

Instead, break your work into vertical slices. Each slice delivers a thin but complete piece of functionality from database to UI.

For the waitlist feature, vertical slices look like this:

**Slice 1: Join a waitlist (happy path)**
- Django model + migration
- Serializer + ViewSet with POST endpoint
- TypeScript types for waitlist response
- TanStack Query mutation hook
- "Join Waitlist" button component
- One Django test, one component test

**Slice 2: Leave a waitlist**
- DELETE endpoint
- Mutation hook for leaving
- Button state change (joined vs. not joined)
- Tests for leaving

**Slice 3: Waitlist promotion on RSVP cancel**
- Update RSVP cancellation logic
- Promotion logic with position management
- Django tests for promotion edge cases

**Slice 4: Organizer waitlist view**
- GET endpoint with permission check
- Waitlist list component
- Permission-based UI (show only to organizers)

Each slice can be completed, tested, committed, and even deployed independently. If you run out of time after slice 2, you still have a working (if incomplete) feature. This is how professional teams manage risk on deadlines.

---

## Git Workflow for the Capstone

Create a feature branch from `main`:

```bash
git checkout -b feat/waitlist-system
```

Make small, meaningful commits as you complete each vertical slice:

```bash
git commit -m "feat: add WaitlistEntry model and migration"
git commit -m "feat: add waitlist join/leave API endpoints"
git commit -m "test: add Django tests for waitlist promotion"
git commit -m "feat: add Join Waitlist button with optimistic UI"
git commit -m "test: add component tests for waitlist states"
git commit -m "feat: add organizer waitlist view"
git commit -m "test: add Playwright E2E test for waitlist flow"
git commit -m "docs: add ADR for waitlist promotion strategy"
```

When the feature is complete, open a pull request against `main`. Write a clear PR description that includes your ADR, a summary of the changes, screenshots of the UI, and testing instructions. This PR is part of your portfolio. Treat it like a code review submission at a job.

---

## Key Takeaways

1. The Gather architecture spans Next.js, Django, PostgreSQL, Docker, GitHub Actions, Vercel, and Railway. Your capstone feature must integrate with all of these layers.
2. Choosing a feature that genuinely interests you will keep your momentum high through the final stretch.
3. Architecture Decision Records capture the "why" behind technical choices, making your codebase understandable to future developers (including future you).
4. Vertical slices deliver working functionality at every step, unlike horizontal layer-by-layer approaches that only work when everything is done.
5. Small, conventional commits tell the story of how you built the feature, which is valuable both for code review and for demonstrating your process to employers.
6. Planning before coding is not wasted time. A 30-minute planning session will save you hours of rework.

## Try It Yourself

Pick your capstone feature right now. Write an ADR for the most significant technical decision in your feature. Then create a task breakdown with 3 to 5 vertical slices. For each slice, list the specific files you will create or modify. Do not write any code yet. Just plan. Share your plan with a peer or in the WBB Slack community for feedback before you start building.

---
title: "Module Project: Production Capstone"
estimatedMinutes: 150
---

# Module Project: Production Capstone

This is it. Your final project. Everything you have learned across eight modules comes together here: TypeScript, advanced React, state management, testing, Python, Django, and DevOps. You will extend Gather with a production feature that spans the entire stack, from database migration to live deployment with monitoring.

This is not a guided tutorial. You are the engineer. You will make the architectural decisions, write the code, test it, deploy it, and present it. The scaffolding below gives you structure, but the implementation is yours.

When you finish, you will have a portfolio piece that demonstrates exactly what hiring managers look for: the ability to ship a complete, tested, production-grade feature.

---

## Choose Your Feature

Pick one of these four features. Each one requires meaningful work across the full stack. Choose based on what interests you or what fills a gap in your portfolio.

### Option 1: Waitlist System
When events reach capacity, users can join a waitlist. When an RSVP is cancelled, the next waitlisted user is automatically promoted. Requires: Django model with position tracking, join/leave/list API endpoints, custom promotion service, React waitlist button with optimistic updates, Playwright E2E test.

### Option 2: Recurring Events
Organizers can create events that repeat weekly, biweekly, or monthly. The system generates individual event instances from a recurrence pattern. Requires: RecurrenceRule model, date generation logic, extended event creation API, recurrence selector component, calendar UI, management command for generating future occurrences.

### Option 3: Admin Analytics Dashboard
A dashboard showing event statistics: attendance trends, popular categories, RSVP conversion rates, peak times. Requires: Django aggregation queries, staff-only API endpoints, Recharts integration, server components for initial data load, date range filtering.

### Option 4: Comments and Discussion
Threaded comments on event pages. Organizers can pin comments and moderate the discussion. Requires: Comment model with self-referential FK for threading, nested serializer, permission-based moderation actions, comment thread component, optimistic posting.

---

## Requirements (All Features)

Regardless of which feature you choose, your implementation must meet these requirements. They are not suggestions. They are the minimum bar for a production-grade feature.

### TypeScript
- Zero `any` types anywhere in your code. Use `unknown` with type narrowing, generics, or explicit interfaces instead.
- All API response types defined as TypeScript interfaces.
- Discriminated unions or proper type narrowing for any conditional logic based on data shape.

### Advanced React (Module 02)
- At least one advanced pattern: compound component, render prop, or higher-order component. Examples:
  - Compound component: a `<WaitlistProvider>` / `<WaitlistPosition>` / `<WaitlistActions>` composition
  - Render prop: a `<WaitlistData>` component that takes a render function for flexible display
  - HOC: a `withWaitlistAccess` wrapper that handles auth and permission checks

### State Management (Module 03)
- TanStack Query for all API data fetching. No `useState` + `useEffect` for server data.
- At least one optimistic update with proper rollback on error.
- Query keys follow a consistent naming convention.

### Django Backend (Module 06)
- New model(s) with appropriate field types, constraints, and indexes.
- DRF serializer(s) exposing only necessary fields.
- ViewSet or APIView with proper HTTP methods and status codes.
- At least one custom permission class or explicit permission check.
- Business logic in a service module, not in the view.

### Testing (Module 04)
- Minimum 10 tests total across these categories:
  - 3+ Django unit tests (model logic, service functions)
  - 2+ Django API tests (endpoint behavior, permissions)
  - 3+ frontend component tests (Vitest + React Testing Library)
  - 1+ Playwright E2E test (full user journey)
  - 1+ edge case test (empty state, error state, or concurrent access)

### DevOps (Module 07)
- CI pipeline green: lint, type check, and all tests pass on push.
- Backend deployed to Railway via Docker.
- Frontend deployed to Vercel.
- Sentry error tracking active on both frontend and backend.
- Health check endpoints returning 200.

### Documentation
- Professional README with: project description, tech stack table, setup instructions, test commands, architecture overview, and at least one screenshot.
- At least one Architecture Decision Record (ADR).

---

## Step-by-Step Scaffold: Waitlist Feature

If you chose the waitlist feature, follow these steps. If you chose a different feature, adapt the pattern: the sequence (plan, backend, types, data layer, UI, tests, deploy, polish) is the same for every option.

### Step 1: Plan

- [ ] Write ADR-001 for your most significant technical decision (e.g., synchronous vs. asynchronous waitlist promotion)
- [ ] Create a task breakdown with 3 to 5 vertical slices
- [ ] Create your feature branch: `git checkout -b feat/waitlist-system`
- [ ] Add your ADR to `docs/adr-001-waitlist-promotion.md`
- [ ] Commit: `git commit -m "docs: add ADR for waitlist promotion strategy"`

### Step 2: Backend Model and Migration

- [ ] Add `WaitlistEntry` model to `events/models.py`
  - Fields: `user` (FK), `event` (FK), `position` (PositiveIntegerField), `status` (CharField with TextChoices), `created_at`, `promoted_at` (nullable)
  - Meta: `ordering = ["position"]`, `unique_together = [("user", "event")]`
  - Index on `["event", "status", "position"]`
- [ ] Generate migration: `python manage.py makemigrations events`
- [ ] Apply migration: `python manage.py migrate`
- [ ] Verify in Django shell: `python manage.py shell` then `from events.models import WaitlistEntry; print(WaitlistEntry.Status.choices)`
- [ ] Commit: `git commit -m "feat: add WaitlistEntry model and migration"`

### Step 3: Backend Serializer, ViewSet, and Service

- [ ] Create `WaitlistEntrySerializer` in `events/serializers.py`
  - Fields: `id`, `username` (from related user), `position`, `status`, `created_at`
  - All fields read-only except none (creation is handled in the ViewSet)
- [ ] Create `WaitlistViewSet` in `events/views.py`
  - `join` action (POST): validate event is full, check not already on waitlist, assign next position in `transaction.atomic()`
  - `leave` action (DELETE): delete the user's waiting entry, return 404 if not found
  - `list_entries` action (GET): organizer-only, return all waiting entries
- [ ] Create `promote_next_waitlist_entry()` in `events/services.py`
  - Use `select_for_update()` to prevent race conditions
  - Update status to PROMOTED, set `promoted_at`, create RSVP
  - Return the promoted entry or None if waitlist is empty
- [ ] Wire up URLs: `router.register` or manual `path()` entries for the waitlist endpoints
- [ ] Call `promote_next_waitlist_entry()` from your existing RSVP cancellation logic
- [ ] Commit: `git commit -m "feat: add waitlist API endpoints and promotion service"`

### Step 4: Backend Tests

- [ ] Create `events/tests/test_waitlist.py`
- [ ] Test: promotes first-in-line when spot opens
- [ ] Test: creates RSVP on promotion
- [ ] Test: returns None when waitlist is empty
- [ ] Test: skips already-promoted entries
- [ ] Test: API returns 409 when user is already on waitlist
- [ ] Test: API returns 400 when event is not full
- [ ] Test: only organizer can view full waitlist (403 for others)
- [ ] Run tests: `python manage.py test events.tests.test_waitlist -v 2`
- [ ] Commit: `git commit -m "test: add Django tests for waitlist endpoints and promotion"`

### Step 5: TypeScript Types

- [ ] Create `src/types/waitlist.ts`
  - `WaitlistEntry` interface: `id`, `username`, `position`, `status` (union type), `created_at`
  - `WaitlistJoinResponse` interface
  - `WaitlistErrorResponse` interface
- [ ] Commit: `git commit -m "feat: add TypeScript types for waitlist API"`

### Step 6: TanStack Query Hooks

- [ ] Create `src/hooks/useWaitlist.ts`
  - `useWaitlistPosition(eventId)`: query hook that fetches the current user's waitlist position
  - `useJoinWaitlist(eventId)`: mutation with optimistic update (set placeholder entry on mutate, roll back on error, invalidate on settle)
  - `useLeaveWaitlist(eventId)`: mutation with optimistic update (set position to null on mutate, roll back on error, invalidate on settle)
- [ ] Verify query keys follow your naming convention
- [ ] Commit: `git commit -m "feat: add TanStack Query hooks for waitlist operations"`

### Step 7: React Components

- [ ] Create `src/components/events/WaitlistButton.tsx`
  - Renders nothing when event is not full
  - Shows "Join Waitlist" button when user is not on waitlist
  - Shows position indicator and "Leave Waitlist" button when user is on waitlist
  - Shows loading skeleton while data is fetching
  - Disables buttons during pending mutations
  - All interactive elements have `aria-label` attributes
- [ ] Integrate at least one advanced React pattern (compound component, render prop, or HOC)
- [ ] Add the `WaitlistButton` to the event detail page, conditionally rendered when the event is at capacity
- [ ] Verify mobile layout at 375px width
- [ ] Commit: `git commit -m "feat: add WaitlistButton component with optimistic UI"`

### Step 8: Frontend Tests

- [ ] Create `src/components/events/__tests__/WaitlistButton.test.tsx`
- [ ] Test: renders nothing when event is not full
- [ ] Test: shows join button when event is full and user is not on waitlist
- [ ] Test: shows position and leave button when user is on waitlist
- [ ] Test: calls join mutation on click
- [ ] Test: shows loading skeleton while loading
- [ ] Run tests: `npx vitest run`
- [ ] Commit: `git commit -m "test: add component tests for WaitlistButton"`

### Step 9: E2E Test

- [ ] Create `e2e/waitlist.spec.ts`
- [ ] Test: user can join waitlist when event is full (verify button appears, click join, see position)
- [ ] Test: user can leave the waitlist (verify leave button, click, see join button again)
- [ ] Seed test data with a full event in your Playwright fixtures
- [ ] Run: `npx playwright test e2e/waitlist.spec.ts`
- [ ] Commit: `git commit -m "test: add Playwright E2E tests for waitlist flow"`

### Step 10: Deploy and Verify

- [ ] Run the full pre-deploy checklist from Lesson 03
- [ ] Verify Docker builds: `docker compose build`
- [ ] Push feature branch: `git push origin feat/waitlist-system`
- [ ] Open PR with description, screenshots, and testing instructions
- [ ] Wait for CI to pass (lint, type check, tests, build)
- [ ] Merge to `main`
- [ ] Verify deployment:
  - [ ] Backend health check returns 200
  - [ ] Frontend health check returns 200
  - [ ] No new errors in Sentry
  - [ ] Manual smoke test of the waitlist feature in production
- [ ] Commit any post-deploy fixes on a new branch if needed

### Step 11: Polish

- [ ] Write a professional README (use the template from Lesson 03)
- [ ] Add at least one screenshot or GIF of your feature in action
- [ ] Record a 2-to-3-minute demo video (optional but highly recommended)
- [ ] Commit: `git commit -m "docs: add professional README and screenshots"`

---

## Stretch Goals

If you finish the core requirements and want to push further, pick one or more of these stretch goals.

### Stretch 1: Real-Time WebSocket Updates

When a user is promoted from the waitlist, they see a real-time notification without refreshing the page. Use Django Channels on the backend and a WebSocket connection on the frontend. When `promote_next_waitlist_entry()` runs, it broadcasts a message to the promoted user's WebSocket channel. The frontend receives the message and invalidates the relevant TanStack Query cache, triggering a re-render that shows the updated RSVP status.

### Stretch 2: Email Notifications

When a user is promoted from the waitlist, they receive an email notification in addition to the in-app update. Use Django's `send_mail` with an SMTP backend (Gmail SMTP or SendGrid free tier). Create an HTML email template that includes the event name, date, and a link to the event page. Make email sending asynchronous so it does not slow down the RSVP cancellation response.

### Stretch 3: Admin Moderation Panel

Build an admin-only page where organizers can manage the waitlist manually: reorder entries, remove users, promote specific users out of order, and export the waitlist as CSV. Use a compound component pattern for the sortable list. Add confirmation modals for destructive actions. Write component tests for the reorder and remove interactions.

---

## Submission Checklist

Before you consider this project complete, verify every item below. This is your final quality gate.

**Code:**
- [ ] Zero `any` types in TypeScript code (search: `grep -rn ": any" src/`)
- [ ] Zero `console.log` statements in committed code
- [ ] No hardcoded URLs, API keys, or user data
- [ ] All functions and components have clear, descriptive names
- [ ] Props interfaces defined for every component (no inline types)

**React and State:**
- [ ] At least one advanced React pattern (compound, render prop, or HOC)
- [ ] TanStack Query used for all API data (no `useState` + `useEffect` for server data)
- [ ] At least one optimistic update with rollback
- [ ] Loading, error, and empty states handled in every data-dependent component

**Django:**
- [ ] New model(s) with proper field types, constraints, and indexes
- [ ] Serializer(s) expose only necessary fields (no leaking internal data)
- [ ] ViewSet/APIView with correct HTTP status codes
- [ ] At least one custom permission check
- [ ] Business logic in service module, not in views
- [ ] `transaction.atomic()` used where concurrent access is possible

**Testing:**
- [ ] 10+ tests total (unit + component + integration + E2E)
- [ ] Happy paths tested
- [ ] At least 2 edge cases tested
- [ ] At least 1 permission/auth test
- [ ] All tests pass: `python manage.py test` and `npx vitest run` and `npx playwright test`

**DevOps:**
- [ ] CI pipeline passes (lint + type check + test + build)
- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Vercel
- [ ] Health check endpoints return 200 in production
- [ ] Sentry configured and capturing errors
- [ ] Docker Compose builds and runs locally

**Documentation:**
- [ ] Professional README with tech stack, setup instructions, and screenshot
- [ ] At least one ADR in `docs/`
- [ ] PR description includes summary, screenshots, and testing instructions

---

## What's Next

You have shipped a production application. That is a real accomplishment, and it puts you ahead of most self-taught developers who stop at tutorials. Here are paths forward depending on where your interests take you.

**Mobile Development.** Your Django API already serves JSON. Build a React Native or Flutter client that consumes the same endpoints. You already know TypeScript and component architecture, so React Native will feel familiar.

**Cloud Infrastructure.** You deployed to managed platforms (Railway, Vercel). The next level is managing infrastructure yourself: AWS (EC2, RDS, S3, CloudFront), Terraform for infrastructure as code, Kubernetes for container orchestration. This path leads to DevOps and platform engineering roles.

**System Design.** You built a monolithic backend. Learn how to decompose it: microservices, message queues (RabbitMQ, SQS), event-driven architecture, caching layers (Redis), CDNs. This knowledge is essential for senior engineering interviews.

**Open Source Contribution.** You have used Next.js, Django, TanStack Query, and Playwright. Pick one of those projects, read through their open issues labeled "good first issue," and submit a PR. Contributing to the tools you use is one of the best ways to deepen your understanding and build professional credibility.

**Share what you know.** Write a blog post, record a tutorial, or mentor someone in the WBB community who is earlier in their journey. Teaching forces you to solidify your own understanding, and it strengthens the community that supported you.

Whatever you choose, you are not starting from zero. You are starting from a deployed, tested, production-grade application. Build on that foundation.

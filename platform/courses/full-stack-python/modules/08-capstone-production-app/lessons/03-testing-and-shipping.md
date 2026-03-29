---
title: "Testing and Shipping"
estimatedMinutes: 60
---

# Testing and Shipping

Your feature is built. The Django models are migrated, the API endpoints return the right data, the React components render correctly, and your unit tests pass. But "it works on my machine" is not the same as "it works in production." This lesson covers the final stretch: end-to-end testing, the pre-deploy checklist, the deployment itself, post-deploy verification, and (because this is the last lesson of the course) preparing your project for your portfolio.

This is the part where many developers rush. Do not rush. The difference between a side project and a production application is this final 10% of effort.

---

## End-to-End Testing with Playwright

Unit tests and component tests verify individual pieces. End-to-end tests verify that the pieces work together the way a real user would experience them: clicking buttons, filling forms, navigating pages, and seeing results.

Write a Playwright test for your capstone feature. Here is an example for the waitlist system. The test creates an event at capacity, has a second user try to join, verifies the waitlist flow, then cancels an RSVP and checks that the waitlisted user gets promoted.

```typescript
// e2e/waitlist.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Waitlist System", () => {
  test("user can join waitlist when event is full", async ({ page, context }) => {
    // Log in as the organizer and create a full event
    await page.goto("/login");
    await page.getByLabel("Email").fill("organizer@example.com");
    await page.getByLabel("Password").fill("testpass123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("/dashboard");

    // Navigate to a full event (seeded in test data)
    await page.goto("/events/brooklyn-tech-meetup");

    // Verify the event shows as full
    await expect(page.getByText(/this event is full/i)).toBeVisible();

    // Open a second browser context for a different user
    const waitlistPage = await context.newPage();
    await waitlistPage.goto("/login");
    await waitlistPage.getByLabel("Email").fill("attendee@example.com");
    await waitlistPage.getByLabel("Password").fill("testpass123");
    await waitlistPage.getByRole("button", { name: "Sign in" }).click();
    await waitlistPage.waitForURL("/dashboard");

    // Navigate to the same full event
    await waitlistPage.goto("/events/brooklyn-tech-meetup");

    // Join the waitlist
    const joinButton = waitlistPage.getByRole("button", {
      name: /join the waitlist/i,
    });
    await expect(joinButton).toBeVisible();
    await joinButton.click();

    // Verify waitlist position is shown
    await expect(
      waitlistPage.getByText(/you are #1 on the waitlist/i)
    ).toBeVisible();

    // Verify leave button appears
    await expect(
      waitlistPage.getByRole("button", { name: /leave the waitlist/i })
    ).toBeVisible();
  });

  test("user can leave the waitlist", async ({ page }) => {
    // Log in and navigate to event where user is already waitlisted
    await page.goto("/login");
    await page.getByLabel("Email").fill("waitlisted@example.com");
    await page.getByLabel("Password").fill("testpass123");
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.goto("/events/brooklyn-tech-meetup");

    // Should see current waitlist position
    await expect(page.getByText(/you are #\d+ on the waitlist/i)).toBeVisible();

    // Leave the waitlist
    await page.getByRole("button", { name: /leave the waitlist/i }).click();

    // Should see join button again
    await expect(
      page.getByRole("button", { name: /join the waitlist/i })
    ).toBeVisible();
  });
});
```

A few Playwright patterns worth noting:

- **`getByRole` and `getByLabel`** selectors are preferred over CSS selectors. They mirror how screen readers navigate the page, so if your test can find the element, assistive technology can too.
- **`waitForURL`** pauses the test until navigation completes. Without it, the test might try to interact with the login page after the redirect has started but before it finishes.
- **Multiple browser contexts** let you simulate two different users in the same test. This is essential for testing features that involve interaction between users (like waitlist promotion when someone cancels).

Run the E2E tests:

```bash
cd gather-frontend
npx playwright test e2e/waitlist.spec.ts
```

If a test fails, Playwright generates a trace file you can open in the Trace Viewer. The trace shows a screenshot at every step, the network requests, and the console output. This is far more useful than a stack trace alone.

```bash
npx playwright show-trace test-results/waitlist-trace.zip
```

---

## Pre-Deploy Checklist

Before you push to `main` and trigger a production deployment, verify every item on this list. Skip nothing. Each item exists because someone, somewhere, shipped a bug that it would have caught.

### Code Quality

- [ ] **TypeScript strict mode passes.** Run `npx tsc --noEmit` and fix every error. No `// @ts-ignore` comments unless accompanied by a detailed explanation.
- [ ] **Zero `any` types.** Search your codebase: `grep -rn ": any" src/`. If you find any, replace them with proper types or `unknown`.
- [ ] **Linter passes.** Run `npx eslint src/ --max-warnings 0`. Treat warnings as errors for the final push.
- [ ] **No `console.log` statements.** Search for them: `grep -rn "console.log" src/`. Use structured logging (M07) or remove them entirely.

### Testing

- [ ] **All unit tests pass.** Django: `python manage.py test`. Frontend: `npx vitest run`.
- [ ] **All E2E tests pass.** `npx playwright test`.
- [ ] **Test coverage is reasonable.** You do not need 100%, but every critical path (happy path, error handling, permission checks) should be covered.

### Accessibility

- [ ] **Keyboard navigation works.** Tab through every interactive element on your new feature. Can you reach and activate everything without a mouse?
- [ ] **ARIA labels are present.** Every button, input, and dynamic region has accessible text.
- [ ] **Color contrast passes.** Use the browser DevTools accessibility audit or the axe extension.

### Responsive Design

- [ ] **Mobile layout works.** Open DevTools, toggle device toolbar, check at 375px width (iPhone SE). Does your feature still look correct and usable?
- [ ] **No horizontal scrolling.** On mobile, nothing should overflow the viewport.

### Environment and Infrastructure

- [ ] **Environment variables are set in production.** Check Railway (backend) and Vercel (frontend) dashboards. Every variable in `.env.example` should have a production value.
- [ ] **Database migrations are ready.** Run `python manage.py showmigrations` and confirm your new migration is listed. It will run automatically on deploy if your `Dockerfile` or Railway config includes `python manage.py migrate`.
- [ ] **Docker builds successfully.** Run `docker compose build` locally. If it fails locally, it will fail in CI.
- [ ] **Sentry DSN is configured.** Verify `NEXT_PUBLIC_SENTRY_DSN` (frontend) and `SENTRY_DSN` (backend) are set in production.

---

## The Deployment

If your CI/CD pipeline from Module 07 is configured correctly, deployment is straightforward: push your feature branch, open a PR, wait for CI to pass, merge to `main`, and the CD pipeline handles the rest.

```bash
# Push your feature branch
git push origin feat/waitlist-system

# Open a PR (using GitHub CLI)
gh pr create --title "feat: add waitlist system" \
  --body "Adds waitlist functionality for full events.

## Changes
- WaitlistEntry model with position tracking and promotion logic
- Join/leave/list API endpoints with permission checks
- WaitlistButton component with optimistic updates
- 10 tests (4 Django, 5 component, 1 E2E)

## ADR
See docs/adr-001-waitlist-promotion.md

## Screenshots
[attach mobile and desktop screenshots]

## How to Test
1. Create an event with capacity 2
2. RSVP as two different users
3. Try to RSVP as a third user, verify waitlist button appears
4. Join the waitlist, verify position indicator
5. Cancel one RSVP, verify waitlisted user gets promoted"
```

Watch the CI pipeline in the GitHub Actions tab. It should run:

1. **Lint** (ESLint + Ruff)
2. **Type check** (TypeScript `tsc --noEmit`)
3. **Backend tests** (Django test runner)
4. **Frontend tests** (Vitest)
5. **Build** (Next.js build + Docker build)

When CI passes and your PR is approved, merge to `main`. The CD pipeline deploys:

- **Backend:** Railway detects the push, builds the Docker image, runs migrations, starts the new container.
- **Frontend:** Vercel detects the push, builds the Next.js app, deploys to the edge network.

Both deployments typically complete within 2 to 3 minutes.

---

## Post-Deploy Verification

The deploy succeeded. The CI is green. But "deployed" is not the same as "working." Do these checks within 15 minutes of every production deployment.

**1. Check Sentry for new errors.** Open your Sentry dashboard and filter by the last 15 minutes. If you see new errors that match your feature, investigate immediately. A clean Sentry dashboard after deploy is a good sign.

**2. Hit the health endpoints.**

```bash
# Backend health
curl https://api.your-app.com/api/health/

# Frontend health
curl https://your-app.com/api/healthz
```

Both should return `{"status": "healthy"}`. If either returns an error or times out, check the deployment logs in Railway or Vercel.

**3. Manual smoke test.** Open the production URL in an incognito browser window and walk through your feature as a user would. For the waitlist feature: find a full event, join the waitlist, verify the position shows, leave the waitlist. This takes 2 minutes and catches issues that automated tests miss (like a missing environment variable that only matters in production).

**4. Check the logs.** Open Railway's log viewer and look for your structured log messages. You should see the `"Waitlist entry promoted"` or `"No waitlist entries to promote"` messages from your service function. If the logs are silent, your code might not be executing at all.

---

## Retrospective

Take 15 minutes to reflect on the entire course, not just this module. Write your answers somewhere (a notes app, a journal, a Notion page). This is not busy work. Professional engineering teams run retrospectives after every project because reflection is how you convert experience into growth.

**What went well?**
Which module felt most natural to you? Where did you build something you are genuinely proud of? What skill feels solid enough that you could teach it to someone else?

**What was hard?**
Where did you get stuck the longest? Which concept required the most re-reading? What felt frustrating or unclear? (This is valuable data. If something was hard, it usually means the mental model was not quite right, and now you can identify exactly which mental model needs reinforcement.)

**What surprised you?**
Was there a moment where something clicked and changed how you think about building software? A pattern that seemed unnecessary until you saw its value in practice? A tool that turned out to be more useful than you expected?

**What do you want to learn next?**
You now have a production full-stack application. Where does your curiosity pull you? Mobile development? Cloud infrastructure? System design? Machine learning? Open source contribution? Write down the first thing that comes to mind.

---

## Portfolio Presentation

Your Gather project is a portfolio piece. How you present it matters almost as much as how you built it. A hiring manager will spend 30 seconds on your GitHub repo before deciding whether to keep reading. Make those 30 seconds count.

### Professional README Template

Your README should follow this structure:

```markdown
# Gather - Community Event Platform

> A full-stack event platform built with Next.js, Django REST Framework,
> PostgreSQL, and Docker. Features real-time RSVP tracking, waitlist
> management, and automated deployment via GitHub Actions.

![Gather Screenshot](docs/screenshots/dashboard.png)

## Tech Stack

| Layer          | Technology                                    |
|----------------|-----------------------------------------------|
| Frontend       | Next.js 14, TypeScript, TanStack Query, Zustand |
| Backend        | Django 5, Django REST Framework, PostgreSQL    |
| Testing        | Vitest, React Testing Library, Playwright      |
| Infrastructure | Docker, GitHub Actions, Railway, Vercel, Sentry |

## Features

- Event creation with capacity limits and category filtering
- RSVP system with automatic waitlist promotion
- Real-time updates via WebSocket (stretch goal)
- Admin analytics dashboard with attendance trends
- Fully typed API layer with zero `any` types
- 95%+ test coverage on critical paths

## Architecture

[Include a simple diagram showing Frontend -> API -> Database]

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.12+
- Docker and Docker Compose
- PostgreSQL 16

### Quick Start

    git clone https://github.com/yourusername/gather.git
    cd gather
    cp .env.example .env  # Fill in your values
    docker compose up -d
    cd gather-frontend && npm install && npm run dev
    cd gather-backend && pip install -r requirements.txt && python manage.py migrate && python manage.py runserver

### Running Tests

    # Backend
    cd gather-backend && python manage.py test

    # Frontend unit tests
    cd gather-frontend && npx vitest run

    # E2E tests
    cd gather-frontend && npx playwright test

## API Documentation

[Link to your DRF browsable API or a brief endpoint summary]

## Deployment

Backend deploys to Railway on merge to `main`.
Frontend deploys to Vercel on merge to `main`.
CI pipeline runs lint, type check, and tests on every PR.
```

### Recording a Demo Video

A 2-to-3-minute demo video is worth more than any README. Record yourself walking through the feature you built:

1. Show the event page and the RSVP flow (or whichever feature you chose)
2. Demonstrate the edge case handling (full event, waitlist, promotion)
3. Show the test suite running and passing
4. Show the CI/CD pipeline in GitHub Actions
5. Open Sentry and show the error tracking dashboard

Use a screen recording tool like Loom (free), QuickTime (Mac), or OBS (open source). Speak naturally. You are not presenting to a lecture hall. You are showing a colleague what you built and how it works.

### Writing About Your Project

Post about your project on LinkedIn, your blog, or the WBB Slack community. Structure your post around the problem you solved, not the technologies you used.

Instead of: "I built a full-stack app with Next.js, Django, TypeScript, Docker, and GitHub Actions."

Try: "I built a waitlist system that automatically promotes users when spots open up. The tricky part was preventing race conditions when two people cancel their RSVPs at the same time. Here is how I solved it with database-level locking."

The second version demonstrates engineering thinking. The first version is a grocery list of technologies.

---

## You Did It

This is the end of Production-Ready Web Apps. You started with TypeScript fundamentals and ended with a deployed, monitored, tested full-stack application. You can write type-safe code that catches bugs at compile time. You can build advanced React components that are accessible, composable, and testable. You can manage server state with optimistic updates. You can write tests at every level of the testing pyramid. You can build a Python backend with Django and a REST API. You can containerize, deploy, and monitor your applications.

That is not a list of technologies. That is the skill set of a production engineer.

The WBB community is here for you as you keep building. Share your capstone in Slack. Give feedback on someone else's project. Help the next person who is stuck where you were stuck three months ago. That is how communities grow.

Now go ship something.

---

## Key Takeaways

1. End-to-end tests with Playwright verify the full user journey across frontend and backend, catching integration issues that unit tests miss.
2. A pre-deploy checklist covering code quality, testing, accessibility, responsiveness, and infrastructure prevents the most common production failures.
3. Post-deploy verification (Sentry, health checks, smoke tests, logs) confirms that a green CI pipeline actually resulted in a working production deployment.
4. Retrospectives convert experience into actionable learning. Identifying what was hard tells you exactly where to focus your continued growth.
5. A professional README with screenshots, setup instructions, and architecture context makes your project accessible to anyone who visits your repo.
6. When writing about your project, lead with the problem you solved, not the technologies you used. Engineering thinking is more compelling than a tech stack list.
7. You are a production engineer now. The skills you built in this course are the same ones used by professionals shipping software every day.

## Try It Yourself

Deploy your capstone feature to production. Run through every item on the pre-deploy checklist. After deployment, check Sentry, hit your health endpoints, and do a manual smoke test. Then write a professional README for your project, record a 2-to-3-minute demo video, and share both in the WBB Slack community. Finally, write a short retrospective covering what went well, what was hard, and what you want to learn next. Post it somewhere you will revisit in six months.

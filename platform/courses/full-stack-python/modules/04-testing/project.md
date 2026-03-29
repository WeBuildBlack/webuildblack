---
title: "Module Project: Test Suite"
estimatedMinutes: 75
---

# Module Project: Test Suite

Build a comprehensive test suite for Gather, the community event platform. You'll write unit tests for utility functions, component tests for React UI, integration tests for multi-step features, and E2E tests for critical user flows.

## Overview

Throughout this module, you've learned four layers of testing: unit tests with Vitest, component tests with React Testing Library, integration tests with MSW, and E2E tests with Playwright. Now you'll put it all together. Starting from a working Gather application, you'll set up the testing infrastructure and write tests that cover the most important parts of the platform.

By the end, you'll have a test suite that gives you confidence to ship changes without fear of breaking critical user flows.

## What You'll Practice

- Configuring Vitest with coverage reporting (from Lesson 2: Unit Testing with Vitest)
- Writing unit tests for pure utility functions with edge cases (from Lesson 2: Unit Testing with Vitest)
- Testing React components with React Testing Library queries and userEvent (from Lesson 3: Testing React Components)
- Setting up MSW handlers for mock API responses (from Lesson 4: Integration and API Testing)
- Writing integration tests for multi-component features (from Lesson 4: Integration and API Testing)
- Configuring Playwright for E2E tests (from Lesson 5: End-to-End Testing with Playwright)
- Writing E2E tests with the Page Object Model (from Lesson 5: End-to-End Testing with Playwright)
- Running a coverage report and interpreting the results (from Lesson 1: Testing Philosophy and Strategy)

## Prerequisites

- **Node.js 18+** installed
- Completed all five lessons in this module (or equivalent testing knowledge)
- Familiarity with the Gather domain (events, RSVPs, users, organizers)

## Project Setup

Create the project directory and install dependencies:

```bash
mkdir gather-test-suite && cd gather-test-suite
npm init -y
npm install react react-dom next @tanstack/react-query zustand
npm install --save-dev typescript vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw @playwright/test
npx playwright install chromium
```

Create the Vitest config:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/*.d.ts',
        'src/test/**/*',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Create the Playwright config:

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
});
```

Create the test setup file:

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

Create the directory structure:

```bash
mkdir -p src/test/mocks
mkdir -p src/utils
mkdir -p src/components
mkdir -p src/features/events
mkdir -p src/hooks
mkdir -p src/types
mkdir -p e2e/pages
```

Add scripts to `package.json`:

```typescript
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## Step 1: Set Up MSW Handlers

Create the mock server and handlers that your integration tests will use.

```typescript
// src/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

// TODO: Import the GatherEvent type from '@/types'

// TODO: Create a createMockEvent factory function that returns a valid GatherEvent
//   with sensible defaults and accepts a Partial<GatherEvent> for overrides.
//   Default values:
//     id: 'evt_001'
//     title: 'Brooklyn Tech Meetup'
//     slug: 'brooklyn-tech-meetup'
//     description: 'A community tech meetup'
//     status: 'published'
//     category: 'meetup'
//     startDate: '2026-04-15T18:00:00Z'
//     location: { name: 'WBB HQ', address: '147 Front St', city: 'Brooklyn', state: 'NY' }
//     capacity: 50
//     rsvpCount: 30
//     isPublic: true
//     tags: ['tech']
//     organizerId: 'usr_001'
//     createdAt: '2026-01-01T00:00:00Z'
//     updatedAt: '2026-01-01T00:00:00Z'

// TODO: Create a mockEvents array with 4 events:
//   1. Brooklyn Tech Meetup (meetup)
//   2. React Workshop (workshop, rsvpCount: 15, capacity: 30)
//   3. Community Hackathon (hackathon, rsvpCount: 80, capacity: 100)
//   4. Design Systems Talk (meetup, rsvpCount: 50, capacity: 50) -- full event

// TODO: Define handlers array with these endpoints:
//   - GET /api/events: return paginated list, support ?category= filter
//   - GET /api/events/:id: return single event by ID, 404 if not found
//   - POST /api/events/:id/rsvp: return a new RSVP object, 404 if event not found
//   - DELETE /api/events/:id/rsvp: return 204 No Content

export const handlers = [
  // TODO: Implement handlers here
];
```

---

## Step 2: Write Unit Tests for Utility Functions

Create the utility functions and their test files. Write at least **8 unit tests** across these files.

```typescript
// src/utils/format-date.ts

// TODO: Implement formatEventDate(isoString: string): string
//   - Parse the ISO string into a Date
//   - Return "Invalid date" if the string can't be parsed
//   - Format as: "Wednesday, April 15, 2026" (using toLocaleDateString with en-US locale)

// TODO: Implement formatEventTime(isoString: string): string
//   - Parse the ISO string into a Date
//   - Return "Invalid time" if the string can't be parsed
//   - Format as: "6:00 PM" (using toLocaleTimeString with en-US locale, hour: 'numeric', minute: '2-digit')

// TODO: Implement getRelativeTime(isoString: string, now?: Date): string
//   - Calculate the difference in days between the event date and now
//   - Return: "Past event" (negative), "Today" (0), "Tomorrow" (1),
//     "In X days" (2-7), "In X weeks" (8-30), "In X months" (31+)
```

```typescript
// src/utils/format-date.test.ts

// TODO: Write tests for formatEventDate:
//   - formats a valid ISO string to a readable date
//   - returns "Invalid date" for a garbage string
//   - returns "Invalid date" for an empty string

// TODO: Write tests for formatEventTime:
//   - formats a valid ISO string to a readable time
//   - returns "Invalid time" for a garbage string

// TODO: Write tests for getRelativeTime:
//   - returns "Today" for today's date
//   - returns "Tomorrow" for tomorrow
//   - returns "In X days" for dates within a week
//   - returns "Past event" for past dates
```

```typescript
// src/utils/event-stats.ts

// TODO: Implement calculateAttendeePercentage(rsvpCount: number, capacity: number): number
//   - Return Math.round((rsvpCount / capacity) * 100)
//   - Return 0 if capacity is 0 or negative

// TODO: Implement getAvailableSpots(rsvpCount: number, capacity: number): number
//   - Return Math.max(0, capacity - rsvpCount)

// TODO: Implement isEventFull(rsvpCount: number, capacity: number): boolean
//   - Return true if rsvpCount >= capacity

// TODO: Implement isEventAlmostFull(rsvpCount: number, capacity: number, threshold?: number): boolean
//   - Default threshold: 0.9
//   - Return true if percentage >= threshold AND event is not completely full
//   - Return false if capacity is 0 or negative
```

```typescript
// src/utils/event-stats.test.ts

// TODO: Write tests for calculateAttendeePercentage:
//   - calculates percentage correctly (25/50 = 50)
//   - rounds to nearest whole number (1/3 = 33)
//   - returns 100 when full
//   - returns 0 when capacity is zero
//   - handles zero RSVPs

// TODO: Write tests for getAvailableSpots:
//   - returns remaining spots
//   - returns 0 when full
//   - returns 0 when overbooked (never negative)

// TODO: Write tests for isEventFull and isEventAlmostFull
```

```typescript
// src/utils/validate-event-form.ts

// TODO: Define EventFormData interface with:
//   title: string, description: string, startDate: string,
//   capacity: string, category: string

// TODO: Define ValidationErrors as { [field: string]: string }

// TODO: Implement validateEventForm(data: EventFormData): ValidationErrors
//   Validate:
//   - title: required, min 3 chars, max 100 chars (trim whitespace)
//   - description: required, min 10 chars
//   - startDate: required, valid date, must be in the future
//   - capacity: required, must be a number, min 1, max 10000
//   - category: required, must be one of: workshop, meetup, conference, social, hackathon

// TODO: Implement isFormValid(errors: ValidationErrors): boolean
```

```typescript
// src/utils/validate-event-form.test.ts

// TODO: Create a validFormData() factory function

// TODO: Write tests for validateEventForm:
//   - returns no errors for valid data
//   - requires a title
//   - requires title to be at least 3 characters
//   - requires a description with at least 10 characters
//   - rejects invalid categories
//   - rejects capacity of 0
//   - rejects non-numeric capacity

// TODO: Write tests for isFormValid
```

```typescript
// src/utils/filter-events.ts

// TODO: Define EventFilters interface with optional fields:
//   category?: string, search?: string

// TODO: Implement filterEvents(events: GatherEvent[], filters: EventFilters): GatherEvent[]
//   - Filter by category (exact match)
//   - Filter by search term (case-insensitive match on title or location name)
//   - Return all events when no filters are applied
```

```typescript
// src/utils/filter-events.test.ts

// TODO: Create a factory function for test events

// TODO: Write tests for filterEvents:
//   - returns all events when no filters applied
//   - filters by category
//   - filters by search term (case-insensitive)
//   - combines multiple filters
//   - returns empty array when no events match
//   - handles empty events array
```

---

## Step 3: Write Component Tests

Write at least **5 component tests** across these files.

```tsx
// src/components/EventCard.test.tsx

// TODO: Import render, screen from @testing-library/react
// TODO: Import userEvent from @testing-library/user-event
// TODO: Import the EventCard component
// TODO: Create a createEvent factory function

// TODO: Write tests:
//   1. renders the event title as a heading
//   2. displays the attendance count (e.g., "30/50 attending")
//   3. shows the event location name
//   4. calls onRSVP with the event ID when the RSVP button is clicked
//   5. disables the RSVP button when the event is full
```

```tsx
// src/components/RSVPButton.test.tsx

// TODO: Import render, screen from @testing-library/react
// TODO: Import userEvent from @testing-library/user-event
// TODO: Import the RSVPButton component

// TODO: Write tests:
//   1. shows "RSVP" when not RSVPed
//   2. shows "Cancel RSVP" when already RSVPed
//   3. shows "Updating..." while the toggle is in progress
//   4. toggles state after a successful click
//   5. remains in original state if the toggle fails
```

```tsx
// src/components/EventForm.test.tsx

// TODO: Import render, screen from @testing-library/react
// TODO: Import userEvent from @testing-library/user-event
// TODO: Import the EventForm component

// TODO: Write tests:
//   1. renders all form fields (title, description, date, capacity, category)
//   2. shows validation errors when submitting an empty form
//   3. calls onSubmit with form data when all fields are valid
//   4. does not call onSubmit when validation fails
```

```tsx
// src/components/FilterPanel.test.tsx

// TODO: Write tests for a FilterPanel component that has:
//   - A category dropdown
//   - A search input
//   Tests:
//   1. renders category options
//   2. calls onFilterChange when category is selected
//   3. calls onFilterChange when search text is entered
```

```tsx
// src/components/EventList.test.tsx

// TODO: Write tests for an EventList component:
//   1. renders a list of event cards
//   2. shows "No events found" when the list is empty
//   3. renders the correct number of event cards
```

---

## Step 4: Write Integration Tests

Write at least **2 integration tests** that exercise multi-component features with MSW.

```tsx
// src/features/events/EventListPage.test.tsx

// TODO: Import render, screen from @testing-library/react
// TODO: Import userEvent from @testing-library/user-event
// TODO: Import QueryClient, QueryClientProvider from @tanstack/react-query
// TODO: Import the EventListPage component

// TODO: Create a renderWithQueryClient helper

// TODO: Write integration tests:
//   1. "loads events from the API and displays them"
//      - Render EventListPage
//      - Wait for loading to finish (findAllByRole('article'))
//      - Assert that all 4 mock events appear
//
//   2. "filters events by category"
//      - Render EventListPage
//      - Wait for initial load
//      - Select "workshop" from the category filter
//      - Assert that only the React Workshop appears
//      - Assert that other events are not visible
```

```tsx
// src/features/events/RSVPFlow.test.tsx

// TODO: Write integration tests for the RSVP flow:
//   1. "user RSVPs to an event and sees updated state"
//      - Render EventDetailPage with eventId="evt_001"
//      - Wait for the event to load
//      - Click the RSVP button
//      - Assert that the button changes to "Cancel RSVP"
//
//   2. "shows error when RSVP fails"
//      - Override the POST handler to return 500
//      - Render EventDetailPage
//      - Click RSVP
//      - Assert that an error message appears
```

---

## Step 5: Set Up Playwright

Verify Playwright is configured and can run:

```bash
npx playwright test --list
```

Create the Page Object classes:

```typescript
// e2e/pages/EventsPage.ts

// TODO: Import Page, Locator, expect from @playwright/test

// TODO: Create an EventsPage class with:
//   Properties:
//     page: Page
//     eventCards: Locator (getByRole('article'))
//     categoryFilter: Locator (getByLabel(/category/i))
//     searchInput: Locator (getByPlaceholder(/search/i))
//
//   Methods:
//     goto(): navigate to /events and wait for first event card
//     filterByCategory(category: string): select category option
//     searchFor(query: string): fill search input
//     clickEvent(title: string): click event by title text
//     getEventCount(): return number of article elements
```

```typescript
// e2e/pages/EventDetailPage.ts

// TODO: Create an EventDetailPage class with:
//   Properties:
//     page: Page
//     rsvpButton: Locator
//     cancelRsvpButton: Locator
//
//   Methods:
//     rsvp(): click RSVP and wait for Cancel RSVP to appear
//     cancelRsvp(): click Cancel RSVP and wait for RSVP to appear
//     expectTitle(title: string): assert heading is visible
```

---

## Step 6: Write E2E Tests

Write at least **2 E2E tests** for Gather's critical paths.

```typescript
// e2e/browse-events.spec.ts
import { test, expect } from '@playwright/test';

// TODO: Import EventsPage from './pages/EventsPage'

// TODO: Write E2E tests:
//   1. "user can browse the events page"
//      - Navigate to /events
//      - Assert that event cards are visible
//      - Assert that the page title/heading is correct
//
//   2. "user can filter events by category"
//      - Navigate to /events
//      - Select a category filter
//      - Assert that the displayed events match the filter
//
//   3. "user can search for events"
//      - Navigate to /events
//      - Type a search query
//      - Assert that matching events appear
```

```typescript
// e2e/rsvp-flow.spec.ts
import { test, expect } from '@playwright/test';

// TODO: Import EventsPage and EventDetailPage from './pages/'

// TODO: Write E2E tests:
//   1. "user can RSVP to an event"
//      - Navigate to /events
//      - Click on an event
//      - Click the RSVP button
//      - Assert that the button changes to Cancel RSVP
//
//   2. "user sees full event cannot be RSVPed"
//      - Navigate to the full event (evt_004)
//      - Assert that the RSVP button is disabled
```

---

## Step 7: Run Coverage Report

Run the full test suite with coverage:

```bash
npm run test:coverage
```

## Expected Output

After running `npm run test:coverage`, you should see output similar to this:

```
 ✓ src/utils/format-date.test.ts (8)
 ✓ src/utils/event-stats.test.ts (10)
 ✓ src/utils/validate-event-form.test.ts (9)
 ✓ src/utils/filter-events.test.ts (6)
 ✓ src/components/EventCard.test.tsx (5)
 ✓ src/components/RSVPButton.test.tsx (5)
 ✓ src/components/EventForm.test.tsx (4)
 ✓ src/components/FilterPanel.test.tsx (3)
 ✓ src/components/EventList.test.tsx (3)
 ✓ src/features/events/EventListPage.test.tsx (2)
 ✓ src/features/events/RSVPFlow.test.tsx (2)

 Test Files  11 passed (11)
      Tests  57 passed (57)

-----------------------------|---------|----------|---------|---------|
File                         | % Stmts | % Branch | % Funcs | % Lines |
-----------------------------|---------|----------|---------|---------|
All files                    |   78.5  |    72.0  |   85.0  |   78.5  |
 utils/                      |   95.0  |    90.0  |  100.0  |   95.0  |
  format-date.ts             |  100.0  |   100.0  |  100.0  |  100.0  |
  event-stats.ts             |  100.0  |   100.0  |  100.0  |  100.0  |
  validate-event-form.ts     |   90.0  |    80.0  |  100.0  |   90.0  |
  filter-events.ts           |   90.0  |    80.0  |  100.0  |   90.0  |
 components/                 |   75.0  |    65.0  |   80.0  |   75.0  |
  EventCard.tsx              |   90.0  |    80.0  |  100.0  |   90.0  |
  RSVPButton.tsx             |   85.0  |    75.0  |  100.0  |   85.0  |
  EventForm.tsx              |   70.0  |    60.0  |   80.0  |   70.0  |
  FilterPanel.tsx            |   60.0  |    50.0  |   60.0  |   60.0  |
  EventList.tsx              |   70.0  |    60.0  |   80.0  |   70.0  |
-----------------------------|---------|----------|---------|---------|
```

After running `npm run test:e2e`, you should see:

```
  ✓ e2e/browse-events.spec.ts:7:5 › user can browse the events page (2.1s)
  ✓ e2e/browse-events.spec.ts:15:5 › user can filter events by category (1.8s)
  ✓ e2e/browse-events.spec.ts:24:5 › user can search for events (1.5s)
  ✓ e2e/rsvp-flow.spec.ts:7:5 › user can RSVP to an event (2.4s)
  ✓ e2e/rsvp-flow.spec.ts:18:5 › user sees full event cannot be RSVPed (1.6s)

  5 passed (9.4s)
```

---

## Stretch Goals

1. **Add visual regression testing.** Use Playwright's `toHaveScreenshot()` matcher to capture baseline screenshots of the events page and compare them on subsequent runs. This catches unintended visual changes (broken layouts, missing images, wrong colors) that functional tests miss.

2. **Write a test for an accessibility violation.** Install `@axe-core/playwright` and write an E2E test that runs an accessibility audit on the events page. Fix any violations it finds (missing alt text, insufficient color contrast, missing ARIA labels).

3. **Add a GitHub Actions workflow for the full test suite.** Create `.github/workflows/test.yml` that runs unit/integration tests with Vitest, then E2E tests with Playwright. Upload the Playwright HTML report and coverage report as artifacts. Add a coverage threshold check that fails the build if coverage drops below 70%.

---

## Submission Checklist

Your project is complete when:

- [ ] Vitest config is set up with jsdom environment and coverage reporting
- [ ] MSW server and handlers are configured in `src/test/mocks/`
- [ ] At least 8 unit tests pass across `format-date.test.ts`, `event-stats.test.ts`, `validate-event-form.test.ts`, and `filter-events.test.ts`
- [ ] At least 5 component tests pass across `EventCard.test.tsx`, `RSVPButton.test.tsx`, `EventForm.test.tsx`, `FilterPanel.test.tsx`, and `EventList.test.tsx`
- [ ] At least 2 integration tests pass in `EventListPage.test.tsx` and `RSVPFlow.test.tsx`
- [ ] Playwright is configured with at least the Chromium project
- [ ] At least 2 E2E tests pass in `browse-events.spec.ts` and `rsvp-flow.spec.ts`
- [ ] Page Object classes exist for `EventsPage` and `EventDetailPage`
- [ ] `npm run test:coverage` reports 70%+ statement coverage on utility files
- [ ] All tests follow the pattern of testing behavior, not implementation details
- [ ] Factory functions (`createEvent`, `createMockEvent`, `validFormData`) are used for test data
- [ ] No test depends on another test's state (each test is independent)

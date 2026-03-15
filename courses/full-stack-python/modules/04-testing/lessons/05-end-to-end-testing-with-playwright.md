---
title: "End-to-End Testing with Playwright"
estimatedMinutes: 40
---

# End-to-End Testing with Playwright

Unit tests and integration tests verify pieces of your application in isolation. They mock the network, use a virtual DOM, and run in Node.js. End-to-end (E2E) tests are different. They launch a real browser, load your actual application, and interact with it the way a real user would. Nothing is mocked. The full stack runs: your frontend, your API, your database.

E2E tests give you the highest confidence that your application works. They also cost the most: they're slower, more brittle, and harder to debug. That's why you write fewer of them and save them for the critical paths that must never break.

In this lesson, you'll set up Playwright, write E2E tests for Gather's most important user flows, learn the Page Object Model for maintainable tests, and prepare your tests for CI.

---

## Why Playwright?

Playwright is a browser automation framework from Microsoft. It drives Chromium, Firefox, and WebKit (Safari's engine) with a single API. Compared to Cypress (the previous popular choice), Playwright offers:

- **Multi-browser support.** Test across Chrome, Firefox, and Safari from one test suite.
- **Parallel execution by default.** Tests run in parallel across browsers and workers.
- **Auto-waiting.** Playwright automatically waits for elements to be visible, enabled, and stable before interacting with them. No manual `waitFor` calls in most cases.
- **Powerful debugging tools.** Trace viewer, screenshot comparison, video recording, and a step-by-step inspector.
- **Full network control.** Intercept requests, mock responses, and modify headers at the browser level.

---

## Setup

Install Playwright and its browser binaries:

```bash
npm init playwright@latest
```

This command creates a `playwright.config.ts` file and installs browser binaries. Customize the config for Gather:

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'html' : 'list',

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
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

Key settings:

- **`testDir: './e2e'`** keeps E2E tests separate from unit/integration tests.
- **`webServer`** starts your dev server automatically before tests run. In CI, it starts fresh; locally, it reuses a running server.
- **`trace: 'on-first-retry'`** captures a detailed trace (DOM snapshots, network requests, console logs) when a test fails and retries. This is invaluable for debugging.
- **`projects`** runs tests across multiple browsers. You can run a single browser during development and all browsers in CI.

Add scripts to `package.json`:

```typescript
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

Create the E2E test directory:

```bash
mkdir e2e
```

---

## Writing Your First E2E Test

E2E tests use Playwright's `test` and `expect` from `@playwright/test` (not from Vitest). Each test gets a fresh browser context, so there's no state bleeding between tests.

```typescript
// e2e/home.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('displays the Gather hero section', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /gather/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /browse events/i })).toBeVisible();
  });

  test('navigates to the events page', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: /browse events/i }).click();

    await expect(page).toHaveURL('/events');
    await expect(page.getByRole('heading', { name: /events/i })).toBeVisible();
  });
});
```

Notice the differences from Vitest tests:

- **`test` and `expect` come from `@playwright/test`**, not from Vitest.
- **Every assertion uses `await expect(...)`** because Playwright assertions are async and auto-wait.
- **`page` is a fixture** that provides a fresh browser page for each test.
- **`page.goto('/')`** navigates to your actual running application (at `baseURL`).

---

## Testing the Events Page

Here's a more complete test for browsing and filtering events:

```typescript
// e2e/events.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Events Page', () => {
  test('displays a list of events', async ({ page }) => {
    await page.goto('/events');

    // Wait for event cards to appear
    const eventCards = page.getByRole('article');
    await expect(eventCards.first()).toBeVisible();

    // Verify at least one event is displayed
    const count = await eventCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('filters events by category', async ({ page }) => {
    await page.goto('/events');

    // Wait for initial load
    await expect(page.getByRole('article').first()).toBeVisible();
    const initialCount = await page.getByRole('article').count();

    // Select a category filter
    await page.getByLabel(/category/i).selectOption('workshop');

    // Wait for the filtered results to render
    // The count should change (assuming not all events are workshops)
    await expect(async () => {
      const filteredCount = await page.getByRole('article').count();
      expect(filteredCount).toBeLessThan(initialCount);
    }).toPass();

    // Verify that visible events are workshops
    const firstCard = page.getByRole('article').first();
    await expect(firstCard.getByText('workshop')).toBeVisible();
  });

  test('searches for events by name', async ({ page }) => {
    await page.goto('/events');

    await expect(page.getByRole('article').first()).toBeVisible();

    // Type a search query
    await page.getByPlaceholder(/search/i).fill('Brooklyn');

    // Wait for filtered results
    await expect(page.getByText('Brooklyn Tech Meetup')).toBeVisible();
  });

  test('navigates to event detail page', async ({ page }) => {
    await page.goto('/events');

    await expect(page.getByRole('article').first()).toBeVisible();

    // Click on an event
    await page.getByText('Brooklyn Tech Meetup').click();

    // Should navigate to the detail page
    await expect(page).toHaveURL(/\/events\//);
    await expect(page.getByRole('heading', { name: 'Brooklyn Tech Meetup' })).toBeVisible();
  });
});
```

---

## Testing the RSVP Flow

This is one of Gather's critical paths. An E2E test verifies the full flow: browse events, open an event, RSVP, and see confirmation.

```typescript
// e2e/rsvp.spec.ts
import { test, expect } from '@playwright/test';

test.describe('RSVP Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Log in before each test (assumes a test user exists)
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('testpassword123');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for redirect to dashboard or home
    await expect(page).toHaveURL(/\/(dashboard|events)?$/);
  });

  test('RSVPs to an event and sees confirmation', async ({ page }) => {
    // Navigate to an event with available spots
    await page.goto('/events');
    await page.getByText('Brooklyn Tech Meetup').click();

    // Verify the event detail page loaded
    await expect(page.getByRole('heading', { name: 'Brooklyn Tech Meetup' })).toBeVisible();

    // Click the RSVP button
    await page.getByRole('button', { name: 'RSVP' }).click();

    // Wait for the confirmation
    await expect(page.getByRole('button', { name: /cancel rsvp/i })).toBeVisible();

    // The attendee count should have incremented
    await expect(page.getByText(/attending/)).toBeVisible();
  });

  test('cancels an existing RSVP', async ({ page }) => {
    // Navigate to an event where the user already has an RSVP
    await page.goto('/events');
    await page.getByText('Brooklyn Tech Meetup').click();

    // If already RSVPed, cancel
    const cancelButton = page.getByRole('button', { name: /cancel rsvp/i });
    if (await cancelButton.isVisible()) {
      await cancelButton.click();

      // Confirm cancellation
      await expect(page.getByRole('button', { name: 'RSVP' })).toBeVisible();
    }
  });
});
```

---

## Authentication in E2E Tests

Most E2E flows require a logged-in user. Logging in through the UI before every test is slow. Playwright offers a better approach: save the authenticated state and reuse it.

```typescript
// e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('test@example.com');
  await page.getByLabel(/password/i).fill('testpassword123');
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for the login to complete
  await expect(page).toHaveURL(/\/(dashboard|events)?$/);

  // Save the authenticated state (cookies, localStorage)
  await page.context().storageState({ path: authFile });
});
```

Then reference this setup in your config:

```typescript
// In playwright.config.ts, add a setup project
{
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
}
```

Now every test in the 'chromium' project starts with the user already logged in, without going through the login UI every time.

---

## Testing Event Creation (Organizer Flow)

```typescript
// e2e/create-event.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Create Event', () => {
  test('organizer creates a new event', async ({ page }) => {
    await page.goto('/events/new');

    // Fill in the event form
    await page.getByLabel(/title/i).fill('Playwright Community Meetup');
    await page.getByLabel(/description/i).fill(
      'Join us for an evening of testing talks and hands-on Playwright workshops.'
    );
    await page.getByLabel(/date/i).fill('2026-08-15T18:00');
    await page.getByLabel(/capacity/i).fill('75');
    await page.getByLabel(/category/i).selectOption('meetup');

    // Submit the form
    await page.getByRole('button', { name: /create event/i }).click();

    // Should redirect to the new event's detail page
    await expect(page).toHaveURL(/\/events\//);
    await expect(
      page.getByRole('heading', { name: 'Playwright Community Meetup' })
    ).toBeVisible();

    // Verify the details appear correctly
    await expect(page.getByText('75')).toBeVisible();
    await expect(page.getByText('meetup')).toBeVisible();
  });

  test('shows validation errors for invalid input', async ({ page }) => {
    await page.goto('/events/new');

    // Submit empty form
    await page.getByRole('button', { name: /create event/i }).click();

    // Validation errors should appear
    await expect(page.getByText(/title is required/i)).toBeVisible();
    await expect(page.getByText(/description is required/i)).toBeVisible();
  });
});
```

---

## The Page Object Model

As your E2E test suite grows, you'll notice repeated patterns: navigating to pages, filling forms, clicking buttons. The Page Object Model (POM) extracts these interactions into reusable classes.

```typescript
// e2e/pages/EventsPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class EventsPage {
  readonly page: Page;
  readonly eventCards: Locator;
  readonly categoryFilter: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.eventCards = page.getByRole('article');
    this.categoryFilter = page.getByLabel(/category/i);
    this.searchInput = page.getByPlaceholder(/search/i);
  }

  async goto() {
    await this.page.goto('/events');
    await expect(this.eventCards.first()).toBeVisible();
  }

  async filterByCategory(category: string) {
    await this.categoryFilter.selectOption(category);
  }

  async searchFor(query: string) {
    await this.searchInput.fill(query);
  }

  async clickEvent(title: string) {
    await this.page.getByText(title).click();
  }

  async getEventCount(): Promise<number> {
    return this.eventCards.count();
  }
}
```

```typescript
// e2e/pages/EventDetailPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class EventDetailPage {
  readonly page: Page;
  readonly rsvpButton: Locator;
  readonly cancelRsvpButton: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.rsvpButton = page.getByRole('button', { name: 'RSVP' });
    this.cancelRsvpButton = page.getByRole('button', { name: /cancel rsvp/i });
    this.heading = page.getByRole('heading').first();
  }

  async rsvp() {
    await this.rsvpButton.click();
    await expect(this.cancelRsvpButton).toBeVisible();
  }

  async cancelRsvp() {
    await this.cancelRsvpButton.click();
    await expect(this.rsvpButton).toBeVisible();
  }

  async expectTitle(title: string) {
    await expect(this.page.getByRole('heading', { name: title })).toBeVisible();
  }
}
```

Now your tests read like user stories:

```typescript
// e2e/events-with-pom.spec.ts
import { test, expect } from '@playwright/test';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';

test('user browses events and RSVPs', async ({ page }) => {
  const eventsPage = new EventsPage(page);
  const detailPage = new EventDetailPage(page);

  await eventsPage.goto();
  await eventsPage.filterByCategory('meetup');
  await eventsPage.clickEvent('Brooklyn Tech Meetup');

  await detailPage.expectTitle('Brooklyn Tech Meetup');
  await detailPage.rsvp();
});
```

The POM pattern makes tests easier to read and maintain. If the login form changes from an email field to a username field, you update one page object instead of every test.

---

## Playwright Auto-Waiting

One of Playwright's strongest features is automatic waiting. When you write:

```typescript
await page.getByRole('button', { name: 'RSVP' }).click();
```

Playwright automatically:

1. Waits for the element to appear in the DOM
2. Waits for the element to be visible (not hidden by CSS)
3. Waits for the element to be stable (not animating)
4. Waits for the element to be enabled (not disabled)
5. Scrolls the element into view if necessary
6. Clicks the center of the element

This eliminates the most common source of flaky E2E tests: race conditions where the test tries to interact with an element before it's ready. In Cypress, you'd need explicit `cy.wait()` calls or `.should('be.visible')` guards. In Playwright, it just works.

If you need to wait for a specific condition beyond the defaults, use `expect` with auto-retry:

```typescript
// Waits up to 5 seconds (default timeout) for the assertion to pass
await expect(page.getByText('Event created successfully')).toBeVisible();

// Custom timeout for slow operations
await expect(page.getByRole('article')).toHaveCount(4, { timeout: 10000 });
```

---

## Debugging Failed Tests

When an E2E test fails, Playwright gives you powerful debugging tools.

### Screenshots

The config already captures screenshots on failure (`screenshot: 'only-on-failure'`). Find them in the `test-results/` directory.

### Traces

When a test fails and retries (`trace: 'on-first-retry'`), Playwright captures a trace file. Open it with:

```bash
npx playwright show-trace test-results/events-chromium/trace.zip
```

The trace viewer shows:

- A timeline of every action the test took
- DOM snapshots at each step (you can inspect the page as it looked at each point)
- Network requests and responses
- Console logs

### Debug Mode

Run a single test in debug mode with the Playwright Inspector:

```bash
npx playwright test e2e/events.spec.ts --debug
```

This opens a browser window with a step-by-step debugger. You can pause at any point, inspect the page, and resume.

### UI Mode

For the best development experience, use UI mode:

```bash
npx playwright test --ui
```

This opens an interactive panel where you can run tests, see results, inspect traces, and re-run individual tests. It's the closest thing to a test IDE.

---

## CI Considerations

E2E tests in CI need a few adjustments:

### Headless Mode

Playwright runs headless by default (no visible browser window). This works out of the box in CI.

### Single Worker

Run with a single worker in CI to avoid resource contention:

```typescript
workers: process.env.CI ? 1 : undefined,
```

### Retries

Flaky tests are a reality in E2E testing. Add retries in CI:

```typescript
retries: process.env.CI ? 2 : 0,
```

### Docker Support

Some CI environments (like GitHub Actions) need system dependencies for browser rendering. Playwright provides a Docker image:

```yaml
# .github/workflows/e2e.yml
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --project=chromium
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

The `--with-deps` flag installs system libraries needed for the browser. Upload the report as an artifact so you can inspect failures.

### Running Only Critical Tests in CI

You don't need to run all E2E tests on every commit. Tag critical tests and run only those:

```typescript
// Tag with @critical
test('user can RSVP to an event @critical', async ({ page }) => {
  // ...
});
```

```bash
npx playwright test --grep @critical
```

Run the full suite on `main` branch merges, and only `@critical` tests on PR builds.

---

## Key Takeaways

1. **E2E tests drive a real browser against your real application.** Nothing is mocked. They give you the highest confidence but cost the most to run and maintain.
2. **Save E2E tests for critical paths.** Browse events, RSVP, create events, authentication. If it would cost you users when broken, it deserves an E2E test.
3. **Playwright's auto-waiting eliminates most flakiness.** It waits for elements to be visible, stable, and enabled before interacting. You rarely need manual waits.
4. **The Page Object Model keeps E2E tests maintainable.** Extract page interactions into reusable classes. When the UI changes, update one class instead of every test.
5. **Use `storageState` to avoid logging in through the UI in every test.** Authenticate once in a setup file and reuse the session across tests.
6. **Traces and screenshots are essential for debugging CI failures.** Configure `trace: 'on-first-retry'` and upload the Playwright report as a CI artifact.
7. **Run E2E tests in CI with headless browsers, retries, and a single worker.** Tag critical tests with `@critical` and run the full suite only on merges to main.

---

## Try It Yourself

1. Install Playwright in a project and run `npx playwright test --ui` to explore UI mode. Run the example test that comes with the install.
2. Write an E2E test that navigates to a page, fills out a form, and submits it. Verify the success message appears.
3. Create a Page Object for a login page in one of your projects. Include methods for `fillEmail`, `fillPassword`, `submit`, and `expectLoggedIn`.
4. Write an E2E test that fails on purpose (assert on text that doesn't exist). Inspect the screenshot and trace that Playwright generates.
5. Set up authentication state saving with `storageState`. Measure how much faster your test suite is when tests don't log in individually.
6. Add Playwright to a GitHub Actions workflow. Upload the HTML report as an artifact and view it after a run.
7. Write a mobile viewport test using the `'Pixel 5'` device profile. Does your application's responsive design hold up?

---
title: "Integration and API Testing"
estimatedMinutes: 40
---

# Integration and API Testing

Unit tests verify individual functions. Component tests verify individual UI pieces. But most bugs don't live in isolated units. They live in the seams between units: a component that fetches data and passes it to a child, a form that validates input and sends it to an API, a filter panel that updates a URL and triggers a re-fetch.

Integration tests exercise these seams. They render multiple components working together, let data flow through real hooks and state management, and verify that a complete user flow produces the right result. The key difference from E2E tests: you still mock the network layer, so tests stay fast and deterministic. The key difference from component tests: you test the full feature, not just one component.

In this lesson, you'll use Mock Service Worker (MSW) to intercept network requests and test Gather's multi-component features end-to-end within the test environment.

---

## Mock Service Worker (MSW)

MSW intercepts network requests at the service worker level. Unlike mocking `fetch` directly, MSW lets your actual application code run unchanged. Your components call `fetch` or use TanStack Query, the request goes through the normal code path, and MSW intercepts it before it hits the network. This makes your tests more realistic because you're testing the real request/response flow.

### Installation

```bash
npm install --save-dev msw
```

### Setting Up Request Handlers

Create a file that defines your mock API responses:

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';
import type { GatherEvent } from '@/types';

// Factory for consistent test data
function createMockEvent(overrides: Partial<GatherEvent> = {}): GatherEvent {
  return {
    id: 'evt_001',
    title: 'Brooklyn Tech Meetup',
    slug: 'brooklyn-tech-meetup',
    description: 'A community tech meetup in Brooklyn.',
    status: 'published',
    category: 'meetup',
    startDate: '2026-04-15T18:00:00Z',
    location: { name: 'WBB HQ', address: '147 Front St', city: 'Brooklyn', state: 'NY' },
    capacity: 50,
    rsvpCount: 30,
    isPublic: true,
    tags: ['tech', 'community'],
    organizerId: 'usr_001',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export const mockEvents: GatherEvent[] = [
  createMockEvent({ id: 'evt_001', title: 'Brooklyn Tech Meetup', category: 'meetup' }),
  createMockEvent({ id: 'evt_002', title: 'React Workshop', category: 'workshop' }),
  createMockEvent({ id: 'evt_003', title: 'Community Hackathon', category: 'hackathon' }),
  createMockEvent({
    id: 'evt_004',
    title: 'Design Systems Talk',
    category: 'meetup',
    rsvpCount: 50,
    capacity: 50,
  }),
];

export const handlers = [
  // GET /api/events -- list events with optional category filter
  http.get('/api/events', ({ request }) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');

    let events = mockEvents;
    if (category) {
      events = events.filter((e) => e.category === category);
    }

    return HttpResponse.json({
      items: events,
      total: events.length,
      page: 1,
      pageSize: 20,
      hasNextPage: false,
    });
  }),

  // GET /api/events/:id -- single event
  http.get('/api/events/:id', ({ params }) => {
    const event = mockEvents.find((e) => e.id === params.id);

    if (!event) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Event not found', statusCode: 404 },
        { status: 404 }
      );
    }

    return HttpResponse.json(event);
  }),

  // POST /api/events/:id/rsvp -- RSVP to an event
  http.post('/api/events/:id/rsvp', async ({ params }) => {
    const event = mockEvents.find((e) => e.id === params.id);

    if (!event) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Event not found', statusCode: 404 },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      id: 'rsvp_001',
      eventId: event.id,
      userId: 'usr_current',
      status: 'attending',
      respondedAt: new Date().toISOString(),
      plusOne: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }),

  // DELETE /api/events/:id/rsvp -- Cancel RSVP
  http.delete('/api/events/:id/rsvp', () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

export { createMockEvent };
```

### Setting Up the MSW Server

Create a server instance that runs during tests:

```typescript
// src/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

Wire it into your test setup so every test file gets the mock server automatically:

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

// Start the server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset handlers between tests (removes any runtime overrides)
afterEach(() => server.resetHandlers());

// Close the server after all tests
afterAll(() => server.close());
```

The `onUnhandledRequest: 'error'` option causes tests to fail if a component makes an API call you haven't mocked. This catches unhandled requests early, rather than letting them silently fail or hit a real server.

---

## Writing Integration Tests

With MSW running, your integration tests render real components, let them fetch data through their normal code paths, and assert on the resulting UI. Here's an integration test for Gather's event listing feature:

```tsx
// src/features/events/EventListPage.test.tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EventListPage } from './EventListPage';

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('EventListPage', () => {
  it('loads and displays events from the API', async () => {
    renderWithQueryClient(<EventListPage />);

    // Page should show a loading state initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Wait for events to load
    const eventCards = await screen.findAllByRole('article');
    expect(eventCards).toHaveLength(4);

    // Verify the event titles appear
    expect(screen.getByText('Brooklyn Tech Meetup')).toBeInTheDocument();
    expect(screen.getByText('React Workshop')).toBeInTheDocument();
    expect(screen.getByText('Community Hackathon')).toBeInTheDocument();
    expect(screen.getByText('Design Systems Talk')).toBeInTheDocument();
  });

  it('filters events by category', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<EventListPage />);

    // Wait for initial load
    await screen.findAllByRole('article');

    // Select the "workshop" category filter
    await user.selectOptions(screen.getByLabelText(/category/i), 'workshop');

    // Wait for the filtered results
    const filteredCards = await screen.findAllByRole('article');
    expect(filteredCards).toHaveLength(1);
    expect(screen.getByText('React Workshop')).toBeInTheDocument();

    // Other events should not be visible
    expect(screen.queryByText('Brooklyn Tech Meetup')).not.toBeInTheDocument();
  });

  it('shows a message when no events match the filter', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<EventListPage />);

    await screen.findAllByRole('article');

    // Type a search that won't match anything
    await user.type(screen.getByLabelText(/search/i), 'xyznonexistent');

    expect(await screen.findByText(/no events found/i)).toBeInTheDocument();
  });
});
```

Notice what's different from the component tests in Lesson 3:

- **No mock data passed as props.** The component fetches its own data through TanStack Query, and MSW provides the responses.
- **Async flow is real.** The test waits for the loading state to disappear and data to render, just like a user would wait.
- **Multiple components work together.** The `EventListPage` renders a filter panel, event cards, and an empty state, and the test verifies all of them.

---

## Testing the RSVP Flow

Here's a more complex integration test that covers a multi-step user flow: loading an event detail page, clicking the RSVP button, and seeing the updated state.

```tsx
// src/features/events/EventDetailPage.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EventDetailPage } from './EventDetailPage';

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('EventDetailPage', () => {
  it('loads event details and allows RSVP', async () => {
    const user = userEvent.setup();

    // Render the detail page for event evt_001
    renderWithQueryClient(<EventDetailPage eventId="evt_001" />);

    // Wait for the event to load
    expect(await screen.findByRole('heading', { name: 'Brooklyn Tech Meetup' })).toBeInTheDocument();

    // Verify event details
    expect(screen.getByText('WBB HQ')).toBeInTheDocument();
    expect(screen.getByText('30/50 attending')).toBeInTheDocument();

    // Click the RSVP button
    const rsvpButton = screen.getByRole('button', { name: 'RSVP' });
    await user.click(rsvpButton);

    // After successful RSVP, the button should change
    expect(await screen.findByRole('button', { name: 'Cancel RSVP' })).toBeInTheDocument();
  });

  it('shows an error when the event is not found', async () => {
    renderWithQueryClient(<EventDetailPage eventId="evt_nonexistent" />);

    expect(await screen.findByText(/event not found/i)).toBeInTheDocument();
  });

  it('disables RSVP for full events', async () => {
    renderWithQueryClient(<EventDetailPage eventId="evt_004" />);

    // evt_004 has rsvpCount === capacity (50/50)
    await screen.findByRole('heading', { name: 'Design Systems Talk' });

    const button = screen.getByRole('button', { name: /full/i });
    expect(button).toBeDisabled();
  });
});
```

---

## Overriding Handlers Per Test

Sometimes you need a specific test to return different data than the default handlers. MSW lets you override handlers at runtime:

```typescript
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

it('shows an error state when the API fails', async () => {
  // Override the events endpoint for this test only
  server.use(
    http.get('/api/events', () => {
      return HttpResponse.json(
        { code: 'INTERNAL_ERROR', message: 'Something went wrong', statusCode: 500 },
        { status: 500 }
      );
    })
  );

  renderWithQueryClient(<EventListPage />);

  expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
});
```

The override only lasts for this test. The `server.resetHandlers()` call in `afterEach` (from your setup file) restores the defaults.

---

## Testing Forms That Submit to APIs

Integration tests for forms verify the complete flow: fill fields, submit, assert on the API call and the resulting UI change.

```tsx
// src/features/events/CreateEventPage.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateEventPage } from './CreateEventPage';

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <CreateEventPage />
    </QueryClientProvider>
  );
}

describe('CreateEventPage', () => {
  it('submits the form and shows a success message', async () => {
    const user = userEvent.setup();

    // Add a handler for the create endpoint
    server.use(
      http.post('/api/events', async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;

        return HttpResponse.json({
          id: 'evt_new',
          ...body,
          rsvpCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { status: 201 });
      })
    );

    renderPage();

    await user.type(screen.getByLabelText(/title/i), 'New Community Event');
    await user.type(
      screen.getByLabelText(/description/i),
      'A brand new community event for everyone to enjoy.'
    );
    await user.type(screen.getByLabelText(/date/i), '2026-07-01T18:00');
    await user.type(screen.getByLabelText(/capacity/i), '100');
    await user.selectOptions(screen.getByLabelText(/category/i), 'social');

    await user.click(screen.getByRole('button', { name: /create event/i }));

    // Success message should appear
    expect(await screen.findByText(/event created/i)).toBeInTheDocument();
  });

  it('shows an error message when the API returns an error', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('/api/events', () => {
        return HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Slug already taken', statusCode: 400 },
          { status: 400 }
        );
      })
    );

    renderPage();

    await user.type(screen.getByLabelText(/title/i), 'Duplicate Event');
    await user.type(
      screen.getByLabelText(/description/i),
      'This event will trigger a validation error from the API.'
    );
    await user.type(screen.getByLabelText(/date/i), '2026-07-01T18:00');
    await user.type(screen.getByLabelText(/capacity/i), '50');
    await user.selectOptions(screen.getByLabelText(/category/i), 'meetup');

    await user.click(screen.getByRole('button', { name: /create event/i }));

    expect(await screen.findByText(/slug already taken/i)).toBeInTheDocument();
  });
});
```

---

## Snapshot Testing

Snapshot testing captures the rendered output of a component and saves it to a file. On subsequent runs, Vitest compares the current output to the saved snapshot. If they differ, the test fails.

```typescript
import { render } from '@testing-library/react';
import { EventCard } from './EventCard';

it('matches the snapshot', () => {
  const { container } = render(<EventCard event={createEvent()} />);
  expect(container.firstChild).toMatchSnapshot();
});
```

The first time this runs, Vitest creates a `.snap` file with the rendered HTML. On subsequent runs, it compares the output. If the HTML changes, the test fails and you choose to update the snapshot or fix the regression.

### When Snapshots Are Useful

- **Catching unintended changes.** If a component's output changes unexpectedly, the snapshot test catches it.
- **Quick coverage for stable components.** For components that rarely change, a snapshot is a low-effort way to ensure they don't break.
- **Documenting output.** The `.snap` file shows exactly what the component renders, serving as a reference.

### When Snapshots Are Harmful

- **Large, complex components.** If the snapshot is 200 lines of HTML, nobody reads it. Developers blindly update snapshots when they fail, which defeats the purpose.
- **Components that change frequently.** If every PR updates the snapshot, the test provides noise instead of signal.
- **False confidence.** A snapshot passing means the output matches, not that the output is correct. If the initial snapshot captured a bug, every future run confirms the bug.

The general recommendation: use snapshots sparingly, for small and stable components. For everything else, write explicit assertions about specific behavior.

### Inline Snapshots

For small outputs, inline snapshots keep the expected value in the test file itself:

```typescript
it('renders the event category badge', () => {
  const { container } = render(<CategoryBadge category="workshop" />);

  expect(container.firstChild).toMatchInlineSnapshot(`
    <span class="badge badge-workshop">
      workshop
    </span>
  `);
});
```

Vitest fills in the inline snapshot value automatically the first time you run it. This keeps the expected output visible in the test file rather than a separate `.snap` file.

---

## Testing Next.js API Routes

If your Gather project uses Next.js API routes, you can test them directly by calling the route handler function:

```typescript
// src/app/api/events/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');

  // In production, this would query a database
  const events = await fetchEventsFromDB({ category });

  return NextResponse.json({
    items: events,
    total: events.length,
  });
}
```

```typescript
// src/app/api/events/route.test.ts
import { describe, it, expect, vi } from 'vitest';
import { GET } from './route';

// Mock the database layer
vi.mock('@/lib/db', () => ({
  fetchEventsFromDB: vi.fn().mockResolvedValue([
    { id: 'evt_001', title: 'Brooklyn Meetup', category: 'meetup' },
    { id: 'evt_002', title: 'React Workshop', category: 'workshop' },
  ]),
}));

describe('GET /api/events', () => {
  it('returns a list of events', async () => {
    const request = new Request('http://localhost:3000/api/events');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toHaveLength(2);
    expect(data.total).toBe(2);
  });

  it('filters by category when provided', async () => {
    const { fetchEventsFromDB } = await import('@/lib/db');

    const request = new Request('http://localhost:3000/api/events?category=meetup');
    await GET(request);

    expect(fetchEventsFromDB).toHaveBeenCalledWith({ category: 'meetup' });
  });
});
```

This tests the route handler as a function without starting a server. You mock the database layer and verify that the handler processes request parameters correctly and returns the right response shape.

---

## Integration Test Patterns

### Pattern 1: Load, Interact, Verify

The most common integration test pattern. Load a page, wait for data, interact with the UI, verify the result.

```typescript
it('filters events and shows results', async () => {
  const user = userEvent.setup();
  renderWithQueryClient(<EventListPage />);

  // Load
  await screen.findAllByRole('article');

  // Interact
  await user.selectOptions(screen.getByLabelText(/category/i), 'workshop');

  // Verify
  const cards = await screen.findAllByRole('article');
  expect(cards).toHaveLength(1);
});
```

### Pattern 2: Happy Path + Error Path

Always test what happens when things go right and when they go wrong.

```typescript
describe('RSVP flow', () => {
  it('succeeds and updates the UI', async () => {
    // ... happy path
  });

  it('shows an error when the API fails', async () => {
    server.use(
      http.post('/api/events/:id/rsvp', () => {
        return HttpResponse.json(
          { code: 'SERVER_ERROR', message: 'Service unavailable', statusCode: 503 },
          { status: 503 }
        );
      })
    );
    // ... error path
  });
});
```

### Pattern 3: Verify Request Payload

Sometimes you need to verify that the component sends the right data to the API. Capture the request in MSW:

```typescript
it('sends the correct RSVP payload', async () => {
  let capturedBody: unknown;

  server.use(
    http.post('/api/events/:id/rsvp', async ({ request }) => {
      capturedBody = await request.json();
      return HttpResponse.json({ id: 'rsvp_001', status: 'attending' });
    })
  );

  const user = userEvent.setup();
  renderWithQueryClient(<EventDetailPage eventId="evt_001" />);

  await screen.findByRole('heading', { name: 'Brooklyn Tech Meetup' });
  await user.click(screen.getByRole('button', { name: 'RSVP' }));

  // Wait for the request to complete
  await screen.findByRole('button', { name: 'Cancel RSVP' });

  expect(capturedBody).toEqual(
    expect.objectContaining({ eventId: 'evt_001' })
  );
});
```

---

## When to Use Integration Tests vs Unit Tests

| Use Unit Tests When... | Use Integration Tests When... |
|----------------------|------------------------------|
| Testing pure logic (no UI, no side effects) | Testing a feature that spans multiple components |
| The function has many edge cases | The flow involves data fetching + rendering |
| You want fast feedback on a specific calculation | You want confidence that a user flow works end-to-end |
| The code is used in many places (shared utilities) | The behavior depends on how components interact |

A practical rule: if the test requires `render()`, it's probably an integration or component test. If it's just `expect(fn(input)).toBe(output)`, it's a unit test.

---

## Key Takeaways

1. **Integration tests verify that multiple components work together correctly.** They catch bugs that unit tests miss: incorrect data passing, broken hooks, state management issues.
2. **MSW intercepts network requests at the service worker level.** Your application code runs unchanged, making tests more realistic than mocking `fetch` directly.
3. **Set up MSW handlers in a shared file and override them per test when needed.** Call `server.resetHandlers()` in `afterEach` to prevent state leaks.
4. **Use `findBy` queries for async content.** After a component fetches data, use `await screen.findByText(...)` to wait for the content to appear.
5. **Test both happy paths and error paths.** Override MSW handlers to return error responses and verify your error UI works.
6. **Use snapshots sparingly.** They're useful for small, stable components but become noise generators for complex or frequently-changing UI.
7. **Integration tests give you the most confidence per test.** If you have limited testing time, prioritize integration tests over unit tests for user-facing features.

---

## Try It Yourself

1. Write an MSW handler for `GET /api/events/:id/rsvps` that returns a list of RSVPs. Write an integration test that loads the event detail page and verifies the attendee list renders.
2. Add a handler override that returns an empty list and test that the "No attendees yet" message appears.
3. Write an integration test for a search feature: type a query, verify the API is called with the search parameter, verify the filtered results appear.
4. Test the loading state by adding a delay to your MSW handler with `await new Promise(r => setTimeout(r, 100))`. Verify the loading indicator appears before the data.
5. Write a snapshot test for a small, stable component (like a footer or a logo). Then modify the component slightly and observe how the snapshot diff works.
6. Create an MSW handler for `PATCH /api/events/:id` and write an integration test for editing an event's title.
7. Write an integration test that combines filtering and pagination: select a category, verify the page count updates, click "Next Page," verify different events appear.

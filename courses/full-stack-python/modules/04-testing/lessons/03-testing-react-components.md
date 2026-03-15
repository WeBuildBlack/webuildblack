---
title: "Testing React Components"
estimatedMinutes: 40
---

# Testing React Components

Unit tests verify that individual functions produce correct outputs. But Gather isn't a collection of utility functions. It's a React application with components that render UI, respond to clicks, validate form input, and display data from an API. Testing these components requires a different approach.

React Testing Library (RTL) is the standard tool for testing React components. Its core philosophy is simple: test your components the way a user would interact with them. Don't check internal state. Don't inspect the component tree. Instead, render the component, find elements the way a user would (by text, label, role), and interact with them the way a user would (clicking, typing, submitting forms).

In this lesson, you'll write component tests for Gather's EventCard, RSVPButton, and EventForm. You'll learn the query API, user interaction patterns, and how to handle components that depend on providers and hooks.

---

## Setup

Install React Testing Library and its dependencies alongside Vitest:

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Update your `vitest.config.ts` to use the jsdom environment for component tests:

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
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Create the setup file that extends Vitest's matchers with DOM-specific assertions:

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
```

This gives you matchers like `toBeInTheDocument()`, `toHaveTextContent()`, `toBeDisabled()`, and `toBeVisible()`.

---

## The RTL Philosophy

React Testing Library was created by Kent C. Dodds with a guiding principle:

> "The more your tests resemble the way your software is used, the more confidence they can give you."

This means:

- **Find elements by their accessible role, label, or text.** Don't reach into the component's internals with `querySelector('.my-class')` or by checking state variables.
- **Interact with elements the way a user would.** Click buttons, type in inputs, submit forms. Don't call component methods directly.
- **Assert on what the user sees.** Check that text appears on screen, that buttons are disabled, that error messages show up. Don't assert on internal state or implementation details.

---

## Render, Screen, and Queries

Every component test follows three steps: render the component, find elements, assert on them.

```typescript
import { render, screen } from '@testing-library/react';

render(<EventCard event={mockEvent} />);

const title = screen.getByText('Brooklyn Tech Meetup');
expect(title).toBeInTheDocument();
```

**`render()`** renders the component into a virtual DOM (provided by jsdom).

**`screen`** is the global query object. You use it to find elements after rendering.

### Query Types: getBy, queryBy, findBy

RTL provides three families of queries, each with different behavior when the element isn't found:

| Query | Element found | Element NOT found | Async? |
|-------|--------------|-------------------|--------|
| `getBy` | Returns element | **Throws error** | No |
| `queryBy` | Returns element | Returns `null` | No |
| `findBy` | Returns element | **Throws error** | Yes (waits) |

**Use `getBy`** when you expect the element to be there. If it's missing, the test fails with a clear error. This is your default choice.

```typescript
// The element must exist right now
const heading = screen.getByRole('heading', { name: 'Brooklyn Tech Meetup' });
```

**Use `queryBy`** when you want to assert that something is NOT rendered. Since `getBy` throws when the element is missing, you can't use it to check absence.

```typescript
// Assert that no error message is showing
const error = screen.queryByText('Something went wrong');
expect(error).not.toBeInTheDocument();
```

**Use `findBy`** when the element appears asynchronously (after data loads, after a state update, after a timer). `findBy` returns a Promise that resolves when the element appears or rejects after a timeout.

```typescript
// Wait for the element to appear (e.g., after an API call)
const eventList = await screen.findByRole('list');
expect(eventList).toBeInTheDocument();
```

### Query Priorities

RTL recommends querying by these selectors, in order of preference:

1. **`getByRole`** -- accessible role (button, heading, textbox, link). Best choice because it reflects what assistive technologies see.
2. **`getByLabelText`** -- form inputs associated with a label. The way users find form fields.
3. **`getByPlaceholderText`** -- fallback for inputs without labels (but add labels if you can).
4. **`getByText`** -- visible text content. Good for headings, paragraphs, buttons with text.
5. **`getByDisplayValue`** -- current value of an input.
6. **`getByTestId`** -- `data-testid` attribute. Last resort when no accessible query works.

Prefer `getByRole` whenever possible. It ensures your components are accessible and tests them the way screen readers interact with them.

---

## Testing the EventCard Component

Here's a simple Gather component and its test:

```tsx
// src/components/EventCard.tsx
import type { GatherEvent } from '@/types';
import { formatEventDate } from '@/utils/format-date';
import { calculateAttendeePercentage, isEventFull } from '@/utils/event-stats';

interface EventCardProps {
  event: GatherEvent;
  onRSVP?: (eventId: string) => void;
}

export function EventCard({ event, onRSVP }: EventCardProps) {
  const full = isEventFull(event.rsvpCount, event.capacity);
  const percentage = calculateAttendeePercentage(event.rsvpCount, event.capacity);

  return (
    <article aria-label={event.title}>
      <div>
        <span>{event.category}</span>
      </div>
      <h3>{event.title}</h3>
      <p>{formatEventDate(event.startDate)}</p>
      <p>{event.location.name}</p>
      <div>
        <span>{event.rsvpCount}/{event.capacity} attending</span>
        <div
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Attendance"
        >
          <div style={{ width: `${percentage}%` }} />
        </div>
      </div>
      {onRSVP && (
        <button
          onClick={() => onRSVP(event.id)}
          disabled={full}
        >
          {full ? 'Event Full' : 'RSVP'}
        </button>
      )}
    </article>
  );
}
```

```tsx
// src/components/EventCard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { EventCard } from './EventCard';
import type { GatherEvent } from '@/types';

function createEvent(overrides: Partial<GatherEvent> = {}): GatherEvent {
  return {
    id: 'evt_001',
    title: 'Brooklyn Tech Meetup',
    slug: 'brooklyn-tech-meetup',
    description: 'A community tech meetup',
    status: 'published',
    category: 'meetup',
    startDate: '2026-04-15T18:00:00Z',
    location: { name: 'WBB HQ', address: '147 Front St', city: 'Brooklyn', state: 'NY' },
    capacity: 50,
    rsvpCount: 30,
    isPublic: true,
    tags: ['tech'],
    organizerId: 'usr_001',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('EventCard', () => {
  it('renders the event title', () => {
    render(<EventCard event={createEvent()} />);

    expect(screen.getByRole('heading', { name: 'Brooklyn Tech Meetup' })).toBeInTheDocument();
  });

  it('renders the event location', () => {
    render(<EventCard event={createEvent()} />);

    expect(screen.getByText('WBB HQ')).toBeInTheDocument();
  });

  it('renders the category badge', () => {
    render(<EventCard event={createEvent({ category: 'workshop' })} />);

    expect(screen.getByText('workshop')).toBeInTheDocument();
  });

  it('displays the attendance count', () => {
    render(<EventCard event={createEvent({ rsvpCount: 30, capacity: 50 })} />);

    expect(screen.getByText('30/50 attending')).toBeInTheDocument();
  });

  it('sets the progress bar value correctly', () => {
    render(<EventCard event={createEvent({ rsvpCount: 25, capacity: 50 })} />);

    const progressBar = screen.getByRole('progressbar', { name: 'Attendance' });
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
  });

  it('shows RSVP button when onRSVP is provided', () => {
    render(<EventCard event={createEvent()} onRSVP={() => {}} />);

    expect(screen.getByRole('button', { name: 'RSVP' })).toBeInTheDocument();
  });

  it('does not show RSVP button when onRSVP is not provided', () => {
    render(<EventCard event={createEvent()} />);

    expect(screen.queryByRole('button', { name: 'RSVP' })).not.toBeInTheDocument();
  });

  it('disables the RSVP button when the event is full', () => {
    render(<EventCard event={createEvent({ rsvpCount: 50, capacity: 50 })} onRSVP={() => {}} />);

    const button = screen.getByRole('button', { name: 'Event Full' });
    expect(button).toBeDisabled();
  });

  it('calls onRSVP with the event ID when clicked', async () => {
    const user = userEvent.setup();
    const handleRSVP = vi.fn();

    render(<EventCard event={createEvent({ id: 'evt_042' })} onRSVP={handleRSVP} />);

    await user.click(screen.getByRole('button', { name: 'RSVP' }));

    expect(handleRSVP).toHaveBeenCalledTimes(1);
    expect(handleRSVP).toHaveBeenCalledWith('evt_042');
  });
});
```

---

## User Interactions with userEvent

`@testing-library/user-event` simulates realistic user interactions. It fires the full sequence of browser events (mousedown, mouseup, click, focus, blur, keydown, keyup) rather than just the final event. Always prefer `userEvent` over `fireEvent`.

```typescript
import userEvent from '@testing-library/user-event';

// Always call setup() first
const user = userEvent.setup();

// Click a button
await user.click(screen.getByRole('button', { name: 'RSVP' }));

// Type in an input
await user.type(screen.getByLabelText('Event Title'), 'Brooklyn Meetup');

// Clear an input and type new text
await user.clear(screen.getByLabelText('Event Title'));
await user.type(screen.getByLabelText('Event Title'), 'New Title');

// Select from a dropdown
await user.selectOptions(screen.getByLabelText('Category'), 'workshop');

// Keyboard interactions
await user.keyboard('{Enter}');
await user.tab();
```

Key difference from `fireEvent`: `userEvent` methods are all `async`. You must `await` them.

---

## Testing the RSVPButton Component

This component manages its own loading state and calls an async handler:

```tsx
// src/components/RSVPButton.tsx
import { useState } from 'react';

interface RSVPButtonProps {
  eventId: string;
  initialRSVP: boolean;
  onToggle: (eventId: string, isRSVPing: boolean) => Promise<void>;
  disabled?: boolean;
}

export function RSVPButton({ eventId, initialRSVP, onToggle, disabled = false }: RSVPButtonProps) {
  const [isRSVPed, setIsRSVPed] = useState(initialRSVP);
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    try {
      const newStatus = !isRSVPed;
      await onToggle(eventId, newStatus);
      setIsRSVPed(newStatus);
    } catch {
      // Error handled by parent
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
    >
      {isLoading ? 'Updating...' : isRSVPed ? 'Cancel RSVP' : 'RSVP'}
    </button>
  );
}
```

```tsx
// src/components/RSVPButton.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { RSVPButton } from './RSVPButton';

describe('RSVPButton', () => {
  it('shows "RSVP" when not yet RSVPed', () => {
    render(
      <RSVPButton eventId="evt_001" initialRSVP={false} onToggle={vi.fn()} />
    );

    expect(screen.getByRole('button', { name: 'RSVP' })).toBeInTheDocument();
  });

  it('shows "Cancel RSVP" when already RSVPed', () => {
    render(
      <RSVPButton eventId="evt_001" initialRSVP={true} onToggle={vi.fn()} />
    );

    expect(screen.getByRole('button', { name: 'Cancel RSVP' })).toBeInTheDocument();
  });

  it('shows "Updating..." while the toggle is in progress', async () => {
    const user = userEvent.setup();

    // Create a promise we control so we can test the loading state
    let resolveToggle: () => void;
    const togglePromise = new Promise<void>((resolve) => {
      resolveToggle = resolve;
    });
    const handleToggle = vi.fn().mockReturnValue(togglePromise);

    render(
      <RSVPButton eventId="evt_001" initialRSVP={false} onToggle={handleToggle} />
    );

    await user.click(screen.getByRole('button', { name: 'RSVP' }));

    // While the promise is pending, button should show loading state
    expect(screen.getByRole('button', { name: 'Updating...' })).toBeDisabled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');

    // Resolve the promise to complete the toggle
    resolveToggle!();
  });

  it('toggles from RSVP to Cancel RSVP after a successful click', async () => {
    const user = userEvent.setup();
    const handleToggle = vi.fn().mockResolvedValue(undefined);

    render(
      <RSVPButton eventId="evt_001" initialRSVP={false} onToggle={handleToggle} />
    );

    await user.click(screen.getByRole('button', { name: 'RSVP' }));

    expect(await screen.findByRole('button', { name: 'Cancel RSVP' })).toBeInTheDocument();
    expect(handleToggle).toHaveBeenCalledWith('evt_001', true);
  });

  it('remains in original state if the toggle fails', async () => {
    const user = userEvent.setup();
    const handleToggle = vi.fn().mockRejectedValue(new Error('Network error'));

    render(
      <RSVPButton eventId="evt_001" initialRSVP={false} onToggle={handleToggle} />
    );

    await user.click(screen.getByRole('button', { name: 'RSVP' }));

    // After the error, button should revert to original state
    expect(await screen.findByRole('button', { name: 'RSVP' })).toBeInTheDocument();
  });

  it('is disabled when the disabled prop is true', () => {
    render(
      <RSVPButton eventId="evt_001" initialRSVP={false} onToggle={vi.fn()} disabled />
    );

    expect(screen.getByRole('button', { name: 'RSVP' })).toBeDisabled();
  });
});
```

Notice the controlled promise pattern in the "Updating..." test. By creating a promise and holding its `resolve` function, you can test the component while it's in a loading state. This is a common technique for testing async UI.

---

## Testing Forms: The EventForm

Forms are where component testing really shines. You can test validation, user input, and form submission in a way that mirrors exactly how a user would fill out the form:

```tsx
// src/components/EventForm.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { EventForm } from './EventForm';

describe('EventForm', () => {
  it('renders all form fields', () => {
    render(<EventForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/capacity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create event/i })).toBeInTheDocument();
  });

  it('shows validation errors when submitting an empty form', async () => {
    const user = userEvent.setup();

    render(<EventForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /create event/i }));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('Description is required')).toBeInTheDocument();
  });

  it('shows a validation error for a short title', async () => {
    const user = userEvent.setup();

    render(<EventForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/title/i), 'Hi');
    await user.click(screen.getByRole('button', { name: /create event/i }));

    expect(await screen.findByText('Title must be at least 3 characters')).toBeInTheDocument();
  });

  it('calls onSubmit with form data when all fields are valid', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(<EventForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/title/i), 'Brooklyn Tech Meetup');
    await user.type(
      screen.getByLabelText(/description/i),
      'Join us for an evening of tech talks and community.'
    );
    await user.type(screen.getByLabelText(/date/i), '2026-06-15T18:00');
    await user.type(screen.getByLabelText(/capacity/i), '50');
    await user.selectOptions(screen.getByLabelText(/category/i), 'meetup');

    await user.click(screen.getByRole('button', { name: /create event/i }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Brooklyn Tech Meetup',
        capacity: '50',
        category: 'meetup',
      })
    );
  });

  it('does not call onSubmit when validation fails', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(<EventForm onSubmit={handleSubmit} />);

    await user.click(screen.getByRole('button', { name: /create event/i }));

    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('clears validation errors when the user starts typing', async () => {
    const user = userEvent.setup();

    render(<EventForm onSubmit={vi.fn()} />);

    // Submit empty form to trigger errors
    await user.click(screen.getByRole('button', { name: /create event/i }));
    expect(await screen.findByText('Title is required')).toBeInTheDocument();

    // Start typing in the title field
    await user.type(screen.getByLabelText(/title/i), 'B');

    // Error should clear
    expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
  });
});
```

A few things to notice in these tests:

- **Regex queries** like `/title/i` are case-insensitive and match partial text. This makes tests resilient to minor label changes ("Event Title" vs "Title").
- **`queryByText` for absence checks.** You can't use `getByText` to assert something isn't there because it throws.
- **No implementation details.** The tests never check React state, never inspect the DOM tree structure, and never reference CSS classes. They only check what a user would see.

---

## Testing Hooks with renderHook

If you have custom hooks that contain complex logic, test them directly with `renderHook`:

```typescript
// src/hooks/use-event-filters.ts
import { useState, useMemo } from 'react';
import type { GatherEvent } from '@/types';
import { filterEvents } from '@/utils/filter-events';

export function useEventFilters(events: GatherEvent[]) {
  const [category, setCategory] = useState<string>('');
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => filterEvents(events, { category: category || undefined, search: search || undefined }),
    [events, category, search]
  );

  return { filtered, category, setCategory, search, setSearch };
}
```

```typescript
// src/hooks/use-event-filters.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useEventFilters } from './use-event-filters';
import type { GatherEvent } from '@/types';

function createEvent(overrides: Partial<GatherEvent> = {}): GatherEvent {
  return {
    id: 'evt_001',
    title: 'Default Event',
    slug: 'default-event',
    status: 'published',
    category: 'meetup',
    startDate: '2026-06-15T18:00:00Z',
    location: { name: 'WBB HQ', address: '147 Front St', city: 'Brooklyn', state: 'NY' },
    capacity: 50,
    rsvpCount: 10,
    isPublic: true,
    tags: [],
    organizerId: 'usr_001',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('useEventFilters', () => {
  const events = [
    createEvent({ id: 'evt_001', title: 'React Workshop', category: 'workshop' }),
    createEvent({ id: 'evt_002', title: 'Brooklyn Meetup', category: 'meetup' }),
    createEvent({ id: 'evt_003', title: 'Hackathon', category: 'hackathon' }),
  ];

  it('returns all events when no filters are set', () => {
    const { result } = renderHook(() => useEventFilters(events));

    expect(result.current.filtered).toHaveLength(3);
  });

  it('filters by category when setCategory is called', () => {
    const { result } = renderHook(() => useEventFilters(events));

    act(() => {
      result.current.setCategory('workshop');
    });

    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0]?.title).toBe('React Workshop');
  });

  it('filters by search term when setSearch is called', () => {
    const { result } = renderHook(() => useEventFilters(events));

    act(() => {
      result.current.setSearch('brooklyn');
    });

    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0]?.title).toBe('Brooklyn Meetup');
  });

  it('combines category and search filters', () => {
    const { result } = renderHook(() => useEventFilters(events));

    act(() => {
      result.current.setCategory('meetup');
      result.current.setSearch('brooklyn');
    });

    expect(result.current.filtered).toHaveLength(1);
  });
});
```

`renderHook` renders the hook in a minimal wrapper component. `act` wraps state updates so React processes them before you assert on the results.

---

## Provider Wrappers

Many components need context providers (for routing, state, API clients). Create a reusable wrapper:

```typescript
// src/test/test-utils.tsx
import { ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

function AllProviders({ children }: { children: ReactNode }) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

function renderWithProviders(ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export { renderWithProviders, createTestQueryClient };
```

Now use `renderWithProviders` instead of `render` whenever a component needs TanStack Query:

```typescript
import { renderWithProviders } from '@/test/test-utils';

it('loads and displays events', async () => {
  renderWithProviders(<EventList />);
  // ...
});
```

Setting `retry: false` in the test query client prevents TanStack Query from retrying failed requests. In tests, you want failures to surface immediately. Setting `gcTime: 0` prevents cached data from leaking between tests.

---

## Avoiding Common Mistakes

### 1. Don't test implementation details

```typescript
// Bad: Tests internal state
expect(component.state.isOpen).toBe(true);

// Good: Tests what the user sees
expect(screen.getByRole('dialog')).toBeVisible();
```

### 2. Don't use container.querySelector

```typescript
// Bad: Brittle, tied to DOM structure
const title = container.querySelector('.event-card__title');

// Good: Accessible query
const title = screen.getByRole('heading', { name: 'Brooklyn Meetup' });
```

### 3. Don't use fireEvent when userEvent works

```typescript
// Less realistic: Fires only the click event
fireEvent.click(button);

// More realistic: Fires mousedown, mouseup, click, focus sequence
await user.click(button);
```

### 4. Don't forget to await async interactions

```typescript
// Bug: userEvent returns a promise that you must await
user.click(button); // Missing await!

// Correct
await user.click(button);
```

---

## Key Takeaways

1. **React Testing Library tests components from the user's perspective.** Find elements by role, label, or text. Interact by clicking and typing. Assert on visible output.
2. **Use `getBy` when the element must exist, `queryBy` to check absence, and `findBy` when the element appears asynchronously.** Mixing these up is one of the most common RTL mistakes.
3. **`userEvent` is always preferred over `fireEvent`.** It simulates realistic browser event sequences and is closer to how real users interact with your app.
4. **Factory functions (like `createEvent`) keep test data manageable.** Override only the properties that matter for each test case.
5. **Use `renderHook` and `act` to test custom hooks directly.** This avoids writing throwaway wrapper components just to test hook logic.
6. **Create a `renderWithProviders` wrapper for components that need context.** Set `retry: false` and `gcTime: 0` in test query clients to prevent flaky tests.
7. **Never test implementation details.** If your test breaks when you refactor internals without changing behavior, the test is coupled too tightly to the implementation.

---

## Try It Yourself

1. Write tests for an `EventBadge` component that shows "Free" for events with `priceCents === 0` and the formatted price otherwise. Test both cases.
2. Add a test for `EventCard` that verifies the formatted date appears correctly. You may need to account for timezone differences in your assertions.
3. Write a test for a `SearchInput` component that calls an `onSearch` callback after the user types. Should the callback fire on every keystroke, or after a debounce? Write the test first, then decide.
4. Test a component that renders differently based on screen size. Hint: you can mock `window.matchMedia` with `vi.fn()`.
5. Create a `renderWithProviders` wrapper that includes a Zustand store. Pass initial state as an option.
6. Write tests for an `EmptyState` component that shows different messages based on whether the user has applied filters or not.
7. Pick a component from one of your own projects and write three tests for it using the RTL patterns from this lesson.

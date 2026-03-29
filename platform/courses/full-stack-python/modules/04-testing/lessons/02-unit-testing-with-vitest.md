---
title: "Unit Testing with Vitest"
estimatedMinutes: 40
---

# Unit Testing with Vitest

Unit tests are the fastest, cheapest tests you can write. They exercise a single function with known inputs and assert expected outputs. No DOM, no network, no database. Just pure logic in, verified results out.

In this lesson, you'll set up Vitest as Gather's test runner and write unit tests for the utility functions that power the platform. By the end, you'll have a suite of fast, reliable tests covering date formatting, percentage calculations, event filtering, and form validation.

---

## Why Vitest?

Vitest is a test runner built on top of Vite. If your project already uses Vite (and Gather does), Vitest shares the same config and transformation pipeline. That means your tests understand TypeScript, JSX, path aliases, and ES modules out of the box, with no extra configuration.

Compared to Jest (the previous standard), Vitest offers:

- **Native ESM support.** No more worrying about `import` vs `require` in test files.
- **Shared Vite config.** Path aliases, plugins, and transforms just work.
- **Speed.** Vitest uses Vite's fast HMR engine to re-run only affected tests on file changes.
- **Jest-compatible API.** If you know Jest, you know Vitest. The `describe`, `it`, `expect` API is nearly identical.

---

## Setting Up Vitest

Install Vitest and its dependencies:

```bash
npm install --save-dev vitest @vitest/coverage-v8
```

Create a Vitest config file. If you already have a `vite.config.ts`, you can add the test config directly. For clarity, you'll use a dedicated `vitest.config.ts`:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
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

Add test scripts to your `package.json`:

```typescript
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

The difference: `vitest` runs in watch mode (re-runs on file changes), `vitest run` runs once and exits, and `vitest run --coverage` generates a coverage report.

With `globals: true` in the config, you can use `describe`, `it`, `expect`, and other test functions without importing them. If you prefer explicit imports (some teams do), set `globals: false` and import from `vitest`:

```typescript
import { describe, it, expect } from 'vitest';
```

---

## Your First Test

Create a utility function and its test file side by side. This is the convention you'll follow throughout Gather:

```
src/
  utils/
    format-date.ts
    format-date.test.ts
```

First, the utility function:

```typescript
// src/utils/format-date.ts

export function formatEventDate(isoString: string): string {
  const date = new Date(isoString);

  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatEventTime(isoString: string): string {
  const date = new Date(isoString);

  if (isNaN(date.getTime())) {
    return 'Invalid time';
  }

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function getRelativeTime(isoString: string, now: Date = new Date()): string {
  const date = new Date(isoString);
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Past event';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays <= 30) return `In ${Math.ceil(diffDays / 7)} weeks`;
  return `In ${Math.ceil(diffDays / 30)} months`;
}
```

Now the test file:

```typescript
// src/utils/format-date.test.ts
import { describe, it, expect } from 'vitest';
import { formatEventDate, formatEventTime, getRelativeTime } from './format-date';

describe('formatEventDate', () => {
  it('formats a valid ISO string to a readable date', () => {
    const result = formatEventDate('2026-04-15T18:00:00Z');
    expect(result).toBe('Wednesday, April 15, 2026');
  });

  it('returns "Invalid date" for a garbage string', () => {
    const result = formatEventDate('not-a-date');
    expect(result).toBe('Invalid date');
  });

  it('returns "Invalid date" for an empty string', () => {
    const result = formatEventDate('');
    expect(result).toBe('Invalid date');
  });
});

describe('getRelativeTime', () => {
  const referenceDate = new Date('2026-04-10T12:00:00Z');

  it('returns "Today" when the event is today', () => {
    expect(getRelativeTime('2026-04-10T18:00:00Z', referenceDate)).toBe('Today');
  });

  it('returns "Tomorrow" when the event is tomorrow', () => {
    expect(getRelativeTime('2026-04-11T18:00:00Z', referenceDate)).toBe('Tomorrow');
  });

  it('returns "In X days" for events within a week', () => {
    expect(getRelativeTime('2026-04-14T18:00:00Z', referenceDate)).toBe('In 4 days');
  });

  it('returns "Past event" for events in the past', () => {
    expect(getRelativeTime('2026-04-01T18:00:00Z', referenceDate)).toBe('Past event');
  });
});
```

Run it:

```bash
npx vitest run src/utils/format-date.test.ts
```

You should see output like:

```
 ✓ src/utils/format-date.test.ts (6)
   ✓ formatEventDate (3)
     ✓ formats a valid ISO string to a readable date
     ✓ returns "Invalid date" for a garbage string
     ✓ returns "Invalid date" for an empty string
   ✓ getRelativeTime (4)
     ✓ returns "Today" when the event is today
     ✓ returns "Tomorrow" when the event is tomorrow
     ✓ returns "In X days" for events within a week
     ✓ returns "Past event" for events in the past

 Test Files  1 passed (1)
      Tests  7 passed (7)
```

---

## The describe / it / expect Pattern

Every test file follows the same structure:

```typescript
describe('name of the unit being tested', () => {
  it('description of expected behavior', () => {
    // Arrange: set up inputs
    const input = 'some value';

    // Act: call the function
    const result = myFunction(input);

    // Assert: check the output
    expect(result).toBe('expected value');
  });
});
```

**`describe`** groups related tests. You can nest `describe` blocks for sub-categories.

**`it`** (or `test`, they're identical) defines a single test case. The string should read like a sentence: "it formats a valid ISO string to a readable date."

**`expect`** wraps a value and gives you access to matchers.

---

## Matchers: The Assertion Toolkit

Vitest provides a rich set of matchers. Here are the ones you'll use most often:

### Equality

```typescript
// Strict equality (===). Use for primitives.
expect(2 + 2).toBe(4);
expect('hello').toBe('hello');

// Deep equality. Use for objects and arrays.
expect({ name: 'Brooklyn Meetup' }).toEqual({ name: 'Brooklyn Meetup' });
expect([1, 2, 3]).toEqual([1, 2, 3]);

// toBe checks reference equality for objects (they must be the same object).
// toEqual checks that every property matches (different objects, same shape).
```

### Truthiness

```typescript
expect(true).toBeTruthy();
expect(0).toBeFalsy();
expect(null).toBeNull();
expect(undefined).toBeUndefined();
expect('hello').toBeDefined();
```

### Numbers

```typescript
expect(10).toBeGreaterThan(5);
expect(10).toBeGreaterThanOrEqual(10);
expect(5).toBeLessThan(10);
expect(0.1 + 0.2).toBeCloseTo(0.3); // Floating point comparison
```

### Strings

```typescript
expect('Brooklyn Tech Meetup').toContain('Brooklyn');
expect('hello@example.com').toMatch(/^[^@]+@[^@]+\.[^@]+$/);
```

### Arrays

```typescript
expect(['react', 'typescript', 'vitest']).toContain('typescript');
expect([1, 2, 3]).toHaveLength(3);
```

### Errors

```typescript
// Test that a function throws
expect(() => validateEventForm({})).toThrow();
expect(() => validateEventForm({})).toThrow('Title is required');
expect(() => validateEventForm({})).toThrowError(/required/i);
```

---

## Testing Gather's Utility Functions

Now write tests for several of Gather's core utilities. Start with a percentage calculator:

```typescript
// src/utils/event-stats.ts

export function calculateAttendeePercentage(rsvpCount: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.round((rsvpCount / capacity) * 100);
}

export function getAvailableSpots(rsvpCount: number, capacity: number): number {
  return Math.max(0, capacity - rsvpCount);
}

export function isEventFull(rsvpCount: number, capacity: number): boolean {
  return rsvpCount >= capacity;
}

export function isEventAlmostFull(rsvpCount: number, capacity: number, threshold = 0.9): boolean {
  if (capacity <= 0) return false;
  return rsvpCount / capacity >= threshold && rsvpCount < capacity;
}
```

```typescript
// src/utils/event-stats.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateAttendeePercentage,
  getAvailableSpots,
  isEventFull,
  isEventAlmostFull,
} from './event-stats';

describe('calculateAttendeePercentage', () => {
  it('calculates the percentage of capacity filled', () => {
    expect(calculateAttendeePercentage(25, 50)).toBe(50);
  });

  it('rounds to the nearest whole number', () => {
    expect(calculateAttendeePercentage(1, 3)).toBe(33);
  });

  it('returns 100 when the event is full', () => {
    expect(calculateAttendeePercentage(50, 50)).toBe(100);
  });

  it('returns 0 when capacity is zero', () => {
    expect(calculateAttendeePercentage(10, 0)).toBe(0);
  });

  it('returns 0 when capacity is negative', () => {
    expect(calculateAttendeePercentage(10, -5)).toBe(0);
  });

  it('handles zero RSVPs', () => {
    expect(calculateAttendeePercentage(0, 50)).toBe(0);
  });
});

describe('getAvailableSpots', () => {
  it('returns remaining spots', () => {
    expect(getAvailableSpots(30, 50)).toBe(20);
  });

  it('returns 0 when the event is full', () => {
    expect(getAvailableSpots(50, 50)).toBe(0);
  });

  it('returns 0 when overbooked (never negative)', () => {
    expect(getAvailableSpots(55, 50)).toBe(0);
  });
});

describe('isEventFull', () => {
  it('returns true when RSVPs equal capacity', () => {
    expect(isEventFull(50, 50)).toBe(true);
  });

  it('returns true when RSVPs exceed capacity', () => {
    expect(isEventFull(55, 50)).toBe(true);
  });

  it('returns false when spots remain', () => {
    expect(isEventFull(30, 50)).toBe(false);
  });
});

describe('isEventAlmostFull', () => {
  it('returns true when above the default 90% threshold', () => {
    expect(isEventAlmostFull(46, 50)).toBe(true);
  });

  it('returns false when below the threshold', () => {
    expect(isEventAlmostFull(40, 50)).toBe(false);
  });

  it('returns false when completely full (not "almost" full)', () => {
    expect(isEventAlmostFull(50, 50)).toBe(false);
  });

  it('accepts a custom threshold', () => {
    expect(isEventAlmostFull(40, 50, 0.8)).toBe(true);
    expect(isEventAlmostFull(35, 50, 0.8)).toBe(false);
  });

  it('returns false when capacity is zero', () => {
    expect(isEventAlmostFull(0, 0)).toBe(false);
  });
});
```

---

## Testing Event Filtering

Here's a more complex utility with several test cases:

```typescript
// src/utils/filter-events.ts
import type { GatherEvent } from '@/types';

export interface EventFilters {
  category?: string;
  search?: string;
  upcoming?: boolean;
}

export function filterEvents(events: GatherEvent[], filters: EventFilters): GatherEvent[] {
  return events.filter((event) => {
    if (filters.category && event.category !== filters.category) {
      return false;
    }

    if (filters.search) {
      const query = filters.search.toLowerCase();
      const matchesTitle = event.title.toLowerCase().includes(query);
      const matchesLocation = event.location.name.toLowerCase().includes(query);
      if (!matchesTitle && !matchesLocation) {
        return false;
      }
    }

    if (filters.upcoming) {
      const now = new Date();
      const eventDate = new Date(event.startDate);
      if (eventDate < now) {
        return false;
      }
    }

    return true;
  });
}
```

```typescript
// src/utils/filter-events.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { filterEvents } from './filter-events';
import type { GatherEvent } from '@/types';

// Factory function to create test events
function createEvent(overrides: Partial<GatherEvent> = {}): GatherEvent {
  return {
    id: 'evt_001',
    title: 'Default Event',
    slug: 'default-event',
    description: 'A test event',
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

describe('filterEvents', () => {
  let events: GatherEvent[];

  beforeEach(() => {
    events = [
      createEvent({ id: 'evt_001', title: 'React Workshop', category: 'workshop' }),
      createEvent({ id: 'evt_002', title: 'Brooklyn Tech Meetup', category: 'meetup' }),
      createEvent({ id: 'evt_003', title: 'Community Hackathon', category: 'hackathon' }),
      createEvent({
        id: 'evt_004',
        title: 'Past Meetup',
        category: 'meetup',
        startDate: '2024-01-01T18:00:00Z',
      }),
    ];
  });

  it('returns all events when no filters are applied', () => {
    const result = filterEvents(events, {});
    expect(result).toHaveLength(4);
  });

  it('filters by category', () => {
    const result = filterEvents(events, { category: 'meetup' });
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.category === 'meetup')).toBe(true);
  });

  it('filters by search term in title', () => {
    const result = filterEvents(events, { search: 'react' });
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('React Workshop');
  });

  it('search is case-insensitive', () => {
    const result = filterEvents(events, { search: 'BROOKLYN' });
    expect(result).toHaveLength(1);
  });

  it('combines multiple filters', () => {
    const result = filterEvents(events, { category: 'meetup', search: 'brooklyn' });
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('Brooklyn Tech Meetup');
  });

  it('returns an empty array when no events match', () => {
    const result = filterEvents(events, { search: 'nonexistent' });
    expect(result).toEqual([]);
  });

  it('handles an empty events array', () => {
    const result = filterEvents([], { category: 'meetup' });
    expect(result).toEqual([]);
  });
});
```

Notice the `createEvent` factory function. Instead of repeating the full event object in every test, you create a helper that builds a valid event with sensible defaults. Override only the properties that matter for each test. This pattern keeps your tests focused and readable.

---

## Testing Form Validation

Validation functions are perfect candidates for unit testing because they have many edge cases:

```typescript
// src/utils/validate-event-form.ts

export interface EventFormData {
  title: string;
  description: string;
  startDate: string;
  capacity: string;
  category: string;
}

export interface ValidationErrors {
  [field: string]: string;
}

export function validateEventForm(data: EventFormData): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!data.title.trim()) {
    errors.title = 'Title is required';
  } else if (data.title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters';
  } else if (data.title.trim().length > 100) {
    errors.title = 'Title must be 100 characters or fewer';
  }

  if (!data.description.trim()) {
    errors.description = 'Description is required';
  } else if (data.description.trim().length < 10) {
    errors.description = 'Description must be at least 10 characters';
  }

  if (!data.startDate) {
    errors.startDate = 'Start date is required';
  } else {
    const date = new Date(data.startDate);
    if (isNaN(date.getTime())) {
      errors.startDate = 'Invalid date format';
    } else if (date < new Date()) {
      errors.startDate = 'Start date must be in the future';
    }
  }

  const capacity = parseInt(data.capacity, 10);
  if (!data.capacity) {
    errors.capacity = 'Capacity is required';
  } else if (isNaN(capacity)) {
    errors.capacity = 'Capacity must be a number';
  } else if (capacity < 1) {
    errors.capacity = 'Capacity must be at least 1';
  } else if (capacity > 10000) {
    errors.capacity = 'Capacity cannot exceed 10,000';
  }

  const validCategories = ['workshop', 'meetup', 'conference', 'social', 'hackathon'];
  if (!data.category) {
    errors.category = 'Category is required';
  } else if (!validCategories.includes(data.category)) {
    errors.category = 'Invalid category';
  }

  return errors;
}

export function isFormValid(errors: ValidationErrors): boolean {
  return Object.keys(errors).length === 0;
}
```

```typescript
// src/utils/validate-event-form.test.ts
import { describe, it, expect } from 'vitest';
import { validateEventForm, isFormValid } from './validate-event-form';
import type { EventFormData } from './validate-event-form';

function validFormData(overrides: Partial<EventFormData> = {}): EventFormData {
  return {
    title: 'Brooklyn Tech Meetup',
    description: 'Join us for an evening of tech talks and networking in Brooklyn.',
    startDate: '2026-12-15T18:00:00Z',
    capacity: '50',
    category: 'meetup',
    ...overrides,
  };
}

describe('validateEventForm', () => {
  it('returns no errors for valid data', () => {
    const errors = validateEventForm(validFormData());
    expect(errors).toEqual({});
    expect(isFormValid(errors)).toBe(true);
  });

  describe('title validation', () => {
    it('requires a title', () => {
      const errors = validateEventForm(validFormData({ title: '' }));
      expect(errors.title).toBe('Title is required');
    });

    it('requires at least 3 characters', () => {
      const errors = validateEventForm(validFormData({ title: 'Hi' }));
      expect(errors.title).toBe('Title must be at least 3 characters');
    });

    it('rejects titles over 100 characters', () => {
      const errors = validateEventForm(validFormData({ title: 'A'.repeat(101) }));
      expect(errors.title).toBe('Title must be 100 characters or fewer');
    });

    it('trims whitespace before validating', () => {
      const errors = validateEventForm(validFormData({ title: '   ' }));
      expect(errors.title).toBe('Title is required');
    });
  });

  describe('capacity validation', () => {
    it('requires capacity', () => {
      const errors = validateEventForm(validFormData({ capacity: '' }));
      expect(errors.capacity).toBe('Capacity is required');
    });

    it('rejects non-numeric values', () => {
      const errors = validateEventForm(validFormData({ capacity: 'abc' }));
      expect(errors.capacity).toBe('Capacity must be a number');
    });

    it('rejects zero', () => {
      const errors = validateEventForm(validFormData({ capacity: '0' }));
      expect(errors.capacity).toBe('Capacity must be at least 1');
    });

    it('rejects values over 10,000', () => {
      const errors = validateEventForm(validFormData({ capacity: '10001' }));
      expect(errors.capacity).toBe('Capacity cannot exceed 10,000');
    });
  });

  describe('category validation', () => {
    it('rejects invalid categories', () => {
      const errors = validateEventForm(validFormData({ category: 'party' }));
      expect(errors.category).toBe('Invalid category');
    });

    it('accepts all valid categories', () => {
      const categories = ['workshop', 'meetup', 'conference', 'social', 'hackathon'];
      for (const category of categories) {
        const errors = validateEventForm(validFormData({ category }));
        expect(errors.category).toBeUndefined();
      }
    });
  });
});

describe('isFormValid', () => {
  it('returns true for an empty errors object', () => {
    expect(isFormValid({})).toBe(true);
  });

  it('returns false when errors exist', () => {
    expect(isFormValid({ title: 'Title is required' })).toBe(false);
  });
});
```

---

## Mocking with vi.fn() and vi.mock()

Sometimes a function depends on something external: an API call, a date, a random number. Mocking lets you replace that dependency with a controlled substitute.

### vi.fn(): Creating Mock Functions

`vi.fn()` creates a function you can spy on. You can check if it was called, what arguments it received, and control what it returns:

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('mock function basics', () => {
  it('tracks calls and arguments', () => {
    const mockCallback = vi.fn();

    mockCallback('hello');
    mockCallback('world');

    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenCalledWith('hello');
    expect(mockCallback).toHaveBeenLastCalledWith('world');
  });

  it('can return specific values', () => {
    const mockFetch = vi.fn()
      .mockReturnValueOnce({ status: 200, data: [] })
      .mockReturnValueOnce({ status: 404, data: null });

    const first = mockFetch();
    const second = mockFetch();

    expect(first.status).toBe(200);
    expect(second.status).toBe(404);
  });

  it('can return promises', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ events: [] });

    const result = await mockFetch();
    expect(result.events).toEqual([]);
  });
});
```

### vi.mock(): Replacing Entire Modules

`vi.mock()` replaces an entire module import with a mock. This is useful when a function you're testing imports another module:

```typescript
// src/utils/analytics.ts
import { trackEvent } from '@/lib/analytics-client';

export function trackRSVP(eventId: string, userId: string): void {
  trackEvent('rsvp_created', {
    eventId,
    userId,
    timestamp: new Date().toISOString(),
  });
}
```

```typescript
// src/utils/analytics.test.ts
import { describe, it, expect, vi } from 'vitest';
import { trackRSVP } from './analytics';
import { trackEvent } from '@/lib/analytics-client';

// Replace the analytics-client module with mocks
vi.mock('@/lib/analytics-client', () => ({
  trackEvent: vi.fn(),
}));

describe('trackRSVP', () => {
  it('sends an rsvp_created event with the correct data', () => {
    trackRSVP('evt_001', 'usr_001');

    expect(trackEvent).toHaveBeenCalledWith('rsvp_created', expect.objectContaining({
      eventId: 'evt_001',
      userId: 'usr_001',
    }));
  });
});
```

The `expect.objectContaining()` matcher checks that the argument includes the specified properties without requiring an exact match. This is useful when the object contains dynamic values (like the timestamp) that you don't want to assert on.

---

## Testing Async Code

Testing async functions is straightforward in Vitest. Just mark your test function as `async` and use `await`:

```typescript
// src/utils/event-api.ts
export async function fetchEventById(id: string): Promise<GatherEvent | null> {
  const response = await fetch(`/api/events/${id}`);

  if (!response.ok) {
    return null;
  }

  return response.json();
}
```

```typescript
// src/utils/event-api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchEventById } from './event-api';

describe('fetchEventById', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns event data for a valid ID', async () => {
    const mockEvent = { id: 'evt_001', title: 'Brooklyn Meetup' };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockEvent),
    });

    const result = await fetchEventById('evt_001');

    expect(result).toEqual(mockEvent);
    expect(fetch).toHaveBeenCalledWith('/api/events/evt_001');
  });

  it('returns null for a 404 response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const result = await fetchEventById('evt_999');

    expect(result).toBeNull();
  });
});
```

---

## Setup and Teardown

`beforeEach` and `afterEach` run before and after every test in a `describe` block. Use them to reset state between tests:

```typescript
describe('event utilities', () => {
  beforeEach(() => {
    // Runs before each test. Reset mocks, clear data, etc.
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // Runs after each test. Clean up side effects.
  });

  it('test one', () => { /* ... */ });
  it('test two', () => { /* ... */ });
});
```

There are also `beforeAll` and `afterAll` for setup that only needs to happen once per `describe` block. Use these for expensive operations like starting a test database.

### Why vi.restoreAllMocks() Matters

If you mock `fetch` in one test, that mock carries over to the next test unless you restore it. Always call `vi.restoreAllMocks()` in `beforeEach` to ensure each test starts with a clean slate. This prevents the most common source of flaky tests: test order dependency.

---

## Test File Organization

Follow these conventions for Gather (and most projects):

1. **Co-locate test files.** Place `format-date.test.ts` next to `format-date.ts`. This makes it easy to find the tests for any file.

2. **One describe per function.** If a file exports three functions, use three top-level `describe` blocks (or nest them under a parent `describe` for the module).

3. **Name tests clearly.** The `it` string should describe the expected behavior: "returns 0 when capacity is zero," not "test case 3."

4. **Use factory functions.** Create helpers like `createEvent()` or `validFormData()` to build test data with sensible defaults.

5. **Test edge cases.** For every function, consider: What happens with empty input? Zero? Negative numbers? Null? Extremely large values?

```
src/
  utils/
    format-date.ts
    format-date.test.ts
    event-stats.ts
    event-stats.test.ts
    filter-events.ts
    filter-events.test.ts
    validate-event-form.ts
    validate-event-form.test.ts
```

---

## Key Takeaways

1. **Vitest is the modern test runner for Vite-based projects.** It shares Vite's config, understands TypeScript natively, and provides a Jest-compatible API.
2. **The describe/it/expect pattern structures every test.** `describe` groups, `it` defines a case, `expect` asserts results.
3. **Use `toBe` for primitives and `toEqual` for objects and arrays.** This is the most common source of unexpected test failures.
4. **Factory functions keep test data clean.** Create helpers like `createEvent()` that build valid objects with overrideable defaults, so each test only specifies what matters.
5. **`vi.fn()` creates spy functions, `vi.mock()` replaces entire modules.** Use mocks to isolate the unit you're testing from its dependencies.
6. **Always restore mocks in `beforeEach`.** Call `vi.restoreAllMocks()` to prevent state leaking between tests.
7. **Test edge cases aggressively.** Empty strings, zero, negative numbers, invalid inputs. These are where most bugs live.

---

## Try It Yourself

1. Write a `formatCapacity(rsvpCount: number, capacity: number): string` function that returns strings like "48/50" or "FULL" when at capacity. Write at least 4 test cases for it.
2. Add a test for `getRelativeTime` that handles events more than 30 days away. What should the output be for an event 90 days from now?
3. Write a `sortEvents` function that sorts events by date (earliest first) and write tests for it. Include a test for events with the same date.
4. Add negative number handling to `calculateAttendeePercentage`. Should it return 0? Throw an error? Write the test first (TDD style), then update the function.
5. Create a mock for `localStorage` using `vi.fn()` and write a test for a function that reads/writes event bookmarks.
6. Run `npx vitest run --coverage` on your test files. Which lines have 100% coverage? Which branches are uncovered?
7. Refactor one of your test files to use `beforeEach` for shared setup. Does it make the tests more or less readable?

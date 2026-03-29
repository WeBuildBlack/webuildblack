---
title: "Server State with TanStack Query"
estimatedMinutes: 40
---

# Server State with TanStack Query

You have been fetching data from APIs since you started building React apps. The pattern is familiar: `useEffect` to trigger the fetch, `useState` for the data, another `useState` for loading, another for errors. Maybe a cleanup function to avoid updating unmounted components. Multiply that by every API call in your application, and you have hundreds of lines of boilerplate that all look the same.

TanStack Query replaces that entire pattern with a declarative hook. You tell it what data you want and how to fetch it. It handles loading states, error states, caching, background refetching, stale data management, and cache invalidation. You write a fraction of the code, and the result is more correct than what you would build by hand.

In this lesson, you will set up TanStack Query in a Next.js 14 project, build typed query hooks for Gather's event data, handle mutations for creating and updating events, and learn the caching model that makes it all work.

---

## Why Server State Is Different

In Lesson 1, you categorized state and identified that server state has properties that client state does not:

- **You do not own it.** The server is the source of truth. Your local copy is just a cache.
- **It can become stale.** Another user might update the data while you are looking at it.
- **Fetching is asynchronous.** Every read operation has loading and error states.
- **It needs deduplication.** If three components request the same event list, you should fetch it once, not three times.

These properties make `useState` + `useEffect` a poor fit. You end up reimplementing caching, deduplication, and background refetching in every component. TanStack Query gives you all of that out of the box.

---

## Setting Up TanStack Query

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

TanStack Query requires a `QueryClient` and a `QueryClientProvider` at the root of your application. In Next.js 14 with the App Router, you create a client-side provider component:

```tsx
// src/providers/QueryProvider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // Data is fresh for 60 seconds
            gcTime: 5 * 60 * 1000, // Unused data stays in cache for 5 minutes
            retry: 1, // Retry failed requests once
            refetchOnWindowFocus: false, // Disable for development, enable in prod
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

Two important details here. First, the `QueryClient` is created inside `useState` (not `useRef` or a module-level variable) to ensure each server-side render gets a fresh client. This prevents data leaking between requests in SSR. Second, the devtools component adds a floating panel in development that shows every query's state, cache contents, and timing. It is invaluable for debugging.

Add the provider to your root layout:

```tsx
// src/app/layout.tsx
import { QueryProvider } from '@/providers/QueryProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
```

---

## useQuery: Reading Data

The `useQuery` hook is the foundation of TanStack Query. You give it a unique key and a function that returns a promise. It handles everything else.

```typescript
import { useQuery } from '@tanstack/react-query';

const result = useQuery({
  queryKey: ['events'],
  queryFn: () => fetch('/api/events').then((res) => res.json()),
});
```

The return value gives you everything you need to render any loading state:

```typescript
const {
  data,       // The resolved data (undefined until loaded)
  isLoading,  // True on the first load (no cached data yet)
  isFetching, // True whenever a fetch is in progress (including background refetches)
  isError,    // True if the query failed
  error,      // The error object
  isSuccess,  // True if the query resolved successfully
  refetch,    // Function to manually trigger a refetch
} = result;
```

The distinction between `isLoading` and `isFetching` matters. `isLoading` is true only when there is no cached data and the query is fetching for the first time. `isFetching` is true during any fetch, including background refetches when stale data is already being displayed. Use `isLoading` for initial loading spinners. Use `isFetching` for subtle background indicators (like a small spinner in the corner while fresh data loads behind already-visible content).

---

## Query Keys: The Cache Address System

Query keys are arrays that uniquely identify a piece of cached data. TanStack Query uses them to deduplicate requests, cache results, and invalidate stale data. Getting the key structure right is one of the most important architectural decisions you will make.

### Key Conventions

```typescript
// List of all events
queryKey: ['events']

// Filtered events
queryKey: ['events', { category: 'Tech', search: 'brooklyn' }]

// Single event by ID
queryKey: ['events', 'evt_001']

// Event attendees
queryKey: ['events', 'evt_001', 'attendees']

// Current user's RSVPs
queryKey: ['user', 'rsvps']
```

The conventions are:

1. **Start with the resource type** ('events', 'user', 'notifications').
2. **Add an ID for single-resource queries** ('events', eventId).
3. **Add sub-resources as additional segments** ('events', eventId, 'attendees').
4. **Add filter objects for filtered lists** ('events', { category, search }).

TanStack Query matches keys with deep equality. `['events', { category: 'Tech' }]` and `['events', { category: 'Art' }]` are different cache entries. But `['events', { category: 'Tech', search: '' }]` and `['events', { search: '', category: 'Tech' }]` are the same, because object key order does not matter in deep comparison.

### Query Key Factories

For consistency across your application, define a key factory:

```typescript
// src/lib/queryKeys.ts
import type { EventFilters } from '@/types/events';

export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (filters: EventFilters) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
  attendees: (id: string) => [...eventKeys.detail(id), 'attendees'] as const,
};

export const userKeys = {
  all: ['user'] as const,
  rsvps: () => [...userKeys.all, 'rsvps'] as const,
  profile: () => [...userKeys.all, 'profile'] as const,
};
```

Using a factory ensures that every component that queries events uses the same key structure. It also makes cache invalidation precise, which you will see shortly.

---

## Building Typed Query Hooks for Gather

Now you will build the query hooks that Gather's components will consume. Each hook encapsulates the query key, the fetch function, and TypeScript types so that consumers get a clean, typed interface.

### Types First

```typescript
// src/types/events.ts
export interface GatherEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  category: string;
  description: string;
  capacity: number;
  attendeeCount: number;
  coverImage: string;
  organizer: {
    name: string;
    email: string;
  };
}

export interface EventFilters {
  category?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateEventInput {
  title: string;
  date: string;
  location: string;
  category: string;
  description: string;
  capacity: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
```

### API Client

```typescript
// src/lib/api.ts
import type {
  GatherEvent,
  EventFilters,
  CreateEventInput,
  PaginatedResponse,
} from '@/types/events';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export const eventsApi = {
  getAll: (filters?: EventFilters): Promise<GatherEvent[]> => {
    const params = new URLSearchParams();
    if (filters?.category) params.set('category', filters.category);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);

    const query = params.toString();
    return fetchJSON<GatherEvent[]>(`${BASE_URL}/events${query ? `?${query}` : ''}`);
  },

  getById: (id: string): Promise<GatherEvent> =>
    fetchJSON<GatherEvent>(`${BASE_URL}/events/${id}`),

  create: (input: CreateEventInput): Promise<GatherEvent> =>
    fetchJSON<GatherEvent>(`${BASE_URL}/events`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  toggleRSVP: (eventId: string): Promise<{ rsvped: boolean; attendeeCount: number }> =>
    fetchJSON(`${BASE_URL}/events/${eventId}/rsvp`, { method: 'POST' }),
};
```

### The useEvents Hook

```typescript
// src/hooks/useEvents.ts
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api';
import { eventKeys } from '@/lib/queryKeys';
import type { EventFilters } from '@/types/events';

export function useEvents(filters?: EventFilters) {
  return useQuery({
    queryKey: eventKeys.list(filters ?? {}),
    queryFn: () => eventsApi.getAll(filters),
    staleTime: 30 * 1000, // Events list is fresh for 30 seconds
  });
}
```

That is the entire hook. No `useEffect`. No `useState` triple. No cleanup function. No cancelled flag. The component that calls `useEvents({ category: 'Tech' })` gets `data`, `isLoading`, and `error` with full type inference. If another component calls `useEvents({ category: 'Tech' })` with the same filters, TanStack Query deduplicates the request and shares the cached result.

### The useEvent Hook (Single Event)

```typescript
// src/hooks/useEvent.ts
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api';
import { eventKeys } from '@/lib/queryKeys';

export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => eventsApi.getById(id),
    enabled: !!id, // Do not fetch if id is empty
  });
}
```

The `enabled` option prevents the query from running until a condition is met. This is useful when the ID comes from a route parameter that might not be available yet, or when a query depends on the result of another query.

---

## useMutation: Writing Data

Queries read data. Mutations write data. The `useMutation` hook handles POST, PUT, PATCH, and DELETE operations with built-in loading, error, and success states.

### The useCreateEvent Hook

```typescript
// src/hooks/useCreateEvent.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api';
import { eventKeys } from '@/lib/queryKeys';
import type { CreateEventInput } from '@/types/events';

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEventInput) => eventsApi.create(input),

    onSuccess: () => {
      // Invalidate event lists so they refetch with the new event included
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },

    onError: (error) => {
      console.error('Failed to create event:', error.message);
    },
  });
}
```

Using the mutation in a component:

```tsx
'use client';

import { useCreateEvent } from '@/hooks/useCreateEvent';
import { useState } from 'react';

export function CreateEventForm() {
  const [title, setTitle] = useState('');
  const createEvent = useCreateEvent();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createEvent.mutate({
      title,
      date: '2026-05-01T18:00:00Z',
      location: 'WBB HQ',
      category: 'Tech',
      description: 'A great event',
      capacity: 50,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <button type="submit" disabled={createEvent.isPending}>
        {createEvent.isPending ? 'Creating...' : 'Create Event'}
      </button>
      {createEvent.isError && <p>Error: {createEvent.error.message}</p>}
      {createEvent.isSuccess && <p>Event created.</p>}
    </form>
  );
}
```

The mutation object provides `isPending`, `isError`, `isSuccess`, and `error`, just like `useQuery`. No manual loading state management needed.

---

## Understanding the Cache: staleTime vs gcTime

TanStack Query's caching model revolves around two timers. Understanding them is essential for configuring your queries correctly.

**`staleTime`** (default: 0): How long data is considered fresh after being fetched. While data is fresh, TanStack Query returns it from the cache without refetching. Once data becomes stale, TanStack Query will refetch it in the background the next time a component mounts or the window regains focus.

**`gcTime`** (default: 5 minutes): How long unused data stays in the cache after all components that consume it have unmounted. "gc" stands for garbage collection. When the timer expires, the data is removed from the cache entirely.

Here is the lifecycle:

```
1. Component mounts, calls useQuery(['events'])
2. No cache exists --> fetch from API --> show loading state
3. Data arrives --> cache it --> show data
4. staleTime starts counting

   [FRESH for staleTime duration]
   Component re-mounts --> return cached data instantly, no refetch

   [STALE after staleTime expires]
   Component re-mounts --> return cached data immediately, refetch in background
   Background refetch completes --> update cache --> re-render with new data

5. All components using this query unmount
6. gcTime starts counting

   [INACTIVE for gcTime duration]
   Component re-mounts --> return cached data, refetch in background

   [GARBAGE COLLECTED after gcTime expires]
   Component re-mounts --> no cache --> fetch from API --> show loading state again
```

### Choosing staleTime Values

- **0 (default)**: Data is always considered stale. Every mount triggers a background refetch. Good for data that changes constantly.
- **30 seconds**: Good for lists that change moderately (event listings, search results).
- **5 minutes**: Good for data that changes infrequently (user profile, event categories).
- **Infinity**: Data is never stale. Useful for truly static data (country lists, configuration).

For Gather, reasonable defaults would be:

```typescript
// Event list: refetch every 30 seconds
useQuery({ queryKey: ['events'], queryFn: fetchEvents, staleTime: 30_000 });

// Single event detail: fresh for 60 seconds
useQuery({ queryKey: ['events', id], queryFn: fetchEvent, staleTime: 60_000 });

// Event categories: changes very rarely
useQuery({ queryKey: ['categories'], queryFn: fetchCategories, staleTime: 10 * 60_000 });
```

---

## Cache Invalidation

When a mutation changes data on the server, the cached data becomes incorrect. You need to tell TanStack Query to refetch the affected queries. This is cache invalidation.

```typescript
const queryClient = useQueryClient();

// Invalidate ALL event queries (lists, details, attendees -- everything)
queryClient.invalidateQueries({ queryKey: eventKeys.all });

// Invalidate only event lists (not individual event details)
queryClient.invalidateQueries({ queryKey: eventKeys.lists() });

// Invalidate a specific event's detail
queryClient.invalidateQueries({ queryKey: eventKeys.detail('evt_001') });
```

Key matching is hierarchical. Invalidating `['events']` also invalidates `['events', 'list']`, `['events', 'detail', 'evt_001']`, and any other key that starts with `['events']`. This is why the key factory structure matters: it gives you precise control over what gets invalidated.

**When to invalidate:**

- After creating a new event: invalidate event lists (the new event should appear)
- After updating an event: invalidate that event's detail and the list it belongs to
- After toggling an RSVP: invalidate the event detail (attendee count changed) and the user's RSVP list
- After deleting an event: invalidate event lists

---

## Replacing useEffect Data Fetching

Here is a concrete before-and-after. This is the pattern TanStack Query replaces:

```tsx
// BEFORE: manual useEffect + useState (do not write this anymore)
function EventList() {
  const [events, setEvents] = useState<GatherEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchEvents() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch('/api/events');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        if (!cancelled) {
          setEvents(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchEvents();
    return () => { cancelled = true; };
  }, []);

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <ul>
      {events.map((event) => (
        <li key={event.id}>{event.title}</li>
      ))}
    </ul>
  );
}
```

```tsx
// AFTER: TanStack Query
function EventList() {
  const { data: events, isLoading, error } = useEvents();

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <ul>
      {events?.map((event) => (
        <li key={event.id}>{event.title}</li>
      ))}
    </ul>
  );
}
```

The "after" version is shorter, but the real win is everything you did not have to write: no cleanup function, no cancelled flag, no manual cache management, no re-fetch logic, no stale closure bugs. TanStack Query handles all of it internally.

---

## TypeScript Integration

TanStack Query infers types from your `queryFn` return type. If `eventsApi.getAll()` returns `Promise<GatherEvent[]>`, then `data` in `useQuery` is automatically typed as `GatherEvent[] | undefined`. The `undefined` accounts for the initial loading state before data arrives.

You can also pass explicit type parameters when inference is not enough:

```typescript
// Type is inferred from queryFn (preferred approach)
const { data } = useQuery({
  queryKey: ['events'],
  queryFn: () => eventsApi.getAll(),
});
// data: GatherEvent[] | undefined  (inferred automatically)

// Explicit type parameter (use when inference falls short)
const { data } = useQuery<GatherEvent[], Error>({
  queryKey: ['events'],
  queryFn: () => eventsApi.getAll(),
});
// data: GatherEvent[] | undefined
// error: Error | null
```

For mutations, the types flow from `mutationFn`:

```typescript
const mutation = useMutation({
  mutationFn: (input: CreateEventInput) => eventsApi.create(input),
});

// mutation.mutate expects a CreateEventInput argument
// mutation.data is GatherEvent | undefined (inferred from eventsApi.create return type)
```

Prefer inference over explicit type parameters. If your API client is well-typed, TanStack Query picks up the types automatically with no duplication.

---

## Key Takeaways

1. **Server state is fundamentally different from client state.** It is asynchronous, shared with a remote source of truth, can become stale, and needs caching. TanStack Query is purpose-built for these concerns.
2. **useQuery replaces the useEffect + useState data-fetching pattern** with a declarative hook that handles loading, error, caching, deduplication, and background refetching automatically.
3. **Query keys are cache addresses.** Structure them hierarchically (resource type, id, sub-resource) and use a key factory for consistency across your entire application.
4. **staleTime controls freshness.** While data is fresh, TanStack Query serves it from cache without refetching. Set it based on how frequently the underlying data actually changes.
5. **gcTime controls cache retention.** Unused data stays in the cache for `gcTime` after all consumers unmount, then gets garbage collected.
6. **useMutation handles write operations** with built-in pending, error, and success states. Invalidate related queries in the `onSuccess` callback to keep cached data consistent.
7. **TanStack Query infers TypeScript types from your queryFn.** A well-typed API client means fully typed query results with zero extra annotation.

---

## Try It Yourself

1. Set up TanStack Query in a Next.js 14 project with the `QueryProvider` pattern shown above. Open the React Query Devtools panel and explore the interface.
2. Create a mock API endpoint at `/api/events` that returns a JSON array of events with a 500ms delay. Build a `useEvents` hook and render the data in a component. Watch the query appear in Devtools.
3. Navigate away from the component and back. Observe that the data loads instantly from cache (no loading spinner) while a background refetch happens. Change `staleTime` to `Infinity` and see the difference.
4. Build a `useCreateEvent` mutation. After a successful creation, invalidate the events list query and verify that it refetches automatically.
5. Call `useEvents()` from two different components on the same page. Check the Network tab in your browser. You should see only one request, not two. This is deduplication in action.
6. Set `staleTime` to 5000 (5 seconds). Watch a query go from "fresh" to "stale" in the Devtools timeline. Mount a component that reads the stale query and observe the background refetch.
7. Build a query key factory following the pattern in this lesson. Use it in all your hooks, then verify that `invalidateQueries({ queryKey: eventKeys.all })` invalidates both list and detail queries.

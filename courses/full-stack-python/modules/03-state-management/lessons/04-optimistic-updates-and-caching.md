---
title: "Optimistic Updates and Caching"
estimatedMinutes: 40
---

# Optimistic Updates and Caching

When a user clicks the RSVP button on a Gather event, they expect the UI to respond immediately. They do not want to see a spinner, wait 300 milliseconds for the server to respond, and then see the button change. The best applications feel instant because they update the UI before the server confirms the change. If the server later rejects the update, the UI rolls back.

This pattern is called an optimistic update, and TanStack Query has first-class support for it. In this lesson, you will build an optimistic RSVP toggle for Gather, implement infinite scrolling for paginated event lists, learn to prefetch data on hover for instant page transitions, and explore advanced caching strategies that make your application feel fast even on slow connections.

---

## The Optimistic Update Pattern

Here is the flow of a standard (pessimistic) mutation:

```
1. User clicks RSVP
2. Show a loading spinner on the button
3. Send POST /api/events/evt_001/rsvp to the server
4. Wait for the server response (200-500ms)
5. Update the UI with the server's response
```

And here is the optimistic flow:

```
1. User clicks RSVP
2. Immediately update the UI (toggle the button, increment attendee count)
3. Send POST /api/events/evt_001/rsvp to the server in the background
4. If the server confirms: done, the UI is already correct
5. If the server rejects: roll back the UI to its previous state
```

The optimistic approach feels instant. The user sees their action reflected immediately, and in the vast majority of cases, the server will confirm the change. The rare rollback is a small price for a dramatically better experience.

---

## Building the Optimistic RSVP Toggle

TanStack Query's `useMutation` hook supports three callbacks that enable optimistic updates: `onMutate`, `onError`, and `onSettled`. Here is how they work together:

```typescript
// src/hooks/useToggleRSVP.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api';
import { eventKeys } from '@/lib/queryKeys';
import type { GatherEvent } from '@/types/events';

export function useToggleRSVP(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => eventsApi.toggleRSVP(eventId),

    onMutate: async () => {
      // Step 1: Cancel any in-flight queries for this event
      // This prevents a background refetch from overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: eventKeys.detail(eventId) });

      // Step 2: Snapshot the current cached data (for rollback)
      const previousEvent = queryClient.getQueryData<GatherEvent>(
        eventKeys.detail(eventId)
      );

      // Step 3: Optimistically update the cache
      if (previousEvent) {
        queryClient.setQueryData<GatherEvent>(
          eventKeys.detail(eventId),
          {
            ...previousEvent,
            attendeeCount: previousEvent.attendeeCount + 1,
          }
        );
      }

      // Step 4: Return the snapshot as context (used by onError for rollback)
      return { previousEvent };
    },

    onError: (_error, _variables, context) => {
      // Rollback: restore the snapshot from onMutate
      if (context?.previousEvent) {
        queryClient.setQueryData(
          eventKeys.detail(eventId),
          context.previousEvent
        );
      }
    },

    onSettled: () => {
      // After success or failure, refetch to ensure cache matches server truth
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    },
  });
}
```

Walk through each callback:

**`onMutate`** runs before the mutation function fires. This is where you:
1. Cancel in-flight queries so they do not overwrite your optimistic update.
2. Snapshot the current data so you can restore it on error.
3. Apply the optimistic update to the cache using `setQueryData`.
4. Return the snapshot as "context" that the other callbacks can access.

**`onError`** runs if the mutation fails. You receive the context from `onMutate` and use it to roll back the cache to its previous state. The user sees the UI revert.

**`onSettled`** runs after the mutation finishes, whether it succeeded or failed. You invalidate the query to trigger a fresh fetch from the server. This ensures the cache eventually matches the server's truth, even if the optimistic update was slightly wrong (for example, another user also RSVPed simultaneously).

### Using the Hook in a Component

```tsx
// src/components/RSVPButton.tsx
'use client';

import { useToggleRSVP } from '@/hooks/useToggleRSVP';

interface RSVPButtonProps {
  eventId: string;
  attendeeCount: number;
}

export function RSVPButton({ eventId, attendeeCount }: RSVPButtonProps) {
  const toggleRSVP = useToggleRSVP(eventId);

  return (
    <div>
      <button
        onClick={() => toggleRSVP.mutate()}
        disabled={toggleRSVP.isPending}
        aria-label={`RSVP to event. Current attendees: ${attendeeCount}`}
      >
        RSVP ({attendeeCount})
      </button>
      {toggleRSVP.isError && (
        <p role="alert">Failed to RSVP. Please try again.</p>
      )}
    </div>
  );
}
```

When the user clicks the button, the attendee count increments instantly. If the server rejects the RSVP (maybe the event is full), the count rolls back and an error message appears.

---

## Optimistic Updates on List Queries

The RSVP example updated a single event detail. But what if you need to optimistically update an item within a list? The same pattern applies, but you modify the array in the cache:

```typescript
// Optimistically updating an event within a list
onMutate: async () => {
  await queryClient.cancelQueries({ queryKey: eventKeys.lists() });

  const previousEvents = queryClient.getQueryData<GatherEvent[]>(
    eventKeys.list({})
  );

  if (previousEvents) {
    queryClient.setQueryData<GatherEvent[]>(
      eventKeys.list({}),
      previousEvents.map((event) =>
        event.id === eventId
          ? { ...event, attendeeCount: event.attendeeCount + 1 }
          : event
      )
    );
  }

  return { previousEvents };
},
```

The key difference: you use `.map()` to produce a new array with the updated item, keeping all other items unchanged. The rollback in `onError` replaces the entire list with the snapshot.

---

## Infinite Queries with useInfiniteQuery

Gather's event feed can grow to hundreds of events. Loading them all at once is wasteful. Instead, you load a page at a time and let the user scroll to load more. TanStack Query has a dedicated hook for this: `useInfiniteQuery`.

```typescript
// src/hooks/useInfiniteEvents.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { eventKeys } from '@/lib/queryKeys';
import type { GatherEvent, PaginatedResponse } from '@/types/events';

const PAGE_SIZE = 20;

async function fetchEventPage(page: number): Promise<PaginatedResponse<GatherEvent>> {
  const response = await fetch(`/api/events?page=${page}&pageSize=${PAGE_SIZE}`);
  if (!response.ok) throw new Error('Failed to fetch events');
  return response.json();
}

export function useInfiniteEvents() {
  return useInfiniteQuery({
    queryKey: [...eventKeys.all, 'infinite'],
    queryFn: ({ pageParam }) => fetchEventPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
  });
}
```

The key differences from `useQuery`:

- **`initialPageParam`**: The starting page number (usually 1 or 0).
- **`getNextPageParam`**: A function that receives the last fetched page and returns the next page parameter. Return `undefined` to signal that there are no more pages.
- **`queryFn` receives `pageParam`**: Instead of calling your fetch function directly, TanStack Query passes the current page parameter via the context object.

### Rendering Infinite Data

The data from `useInfiniteQuery` is structured differently than `useQuery`. Instead of a flat array, you get a `pages` array where each element is one page of results:

```tsx
// src/components/InfiniteEventList.tsx
'use client';

import { useInfiniteEvents } from '@/hooks/useInfiniteEvents';
import { useEffect, useRef } from 'react';

export function InfiniteEventList() {
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteEvents();

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for automatic loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.5 }
    );

    const el = loadMoreRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) return <p>Loading events...</p>;
  if (error) return <p>Error: {error.message}</p>;

  // Flatten all pages into a single array for rendering
  const allEvents = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div>
      <ul>
        {allEvents.map((event) => (
          <li key={event.id}>
            <h3>{event.title}</h3>
            <p>{event.location}</p>
          </li>
        ))}
      </ul>

      {/* Sentinel element: when it enters the viewport, load more */}
      <div ref={loadMoreRef} style={{ height: 1 }}>
        {isFetchingNextPage && <p>Loading more...</p>}
        {!hasNextPage && allEvents.length > 0 && <p>You have reached the end.</p>}
      </div>
    </div>
  );
}
```

The `IntersectionObserver` watches a sentinel `<div>` at the bottom of the list. When the user scrolls it into view, `fetchNextPage()` fires automatically. This creates a seamless infinite scroll experience without the user pressing a "Load More" button. If you prefer an explicit button, replace the observer with a `<button onClick={() => fetchNextPage()}>`.

### Important: data.pages, Not data

The most common mistake with `useInfiniteQuery` is accessing `data` as if it were a flat array. It is not. `data.pages` is an array of pages, and you need `data.pages.flatMap(page => page.data)` to get a flat list. Forgetting this will give you a confusing TypeScript error or render nothing.

---

## Cache Warming: Prefetch on Hover

When a user hovers over an event card, they are likely about to click it. You can use that 100-200ms of hover time to prefetch the event detail, so the transition feels instant:

```typescript
// src/hooks/usePrefetchEvent.ts
import { useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api';
import { eventKeys } from '@/lib/queryKeys';
import { useCallback } from 'react';

export function usePrefetchEvent() {
  const queryClient = useQueryClient();

  const prefetch = useCallback(
    (eventId: string) => {
      queryClient.prefetchQuery({
        queryKey: eventKeys.detail(eventId),
        queryFn: () => eventsApi.getById(eventId),
        staleTime: 60 * 1000, // Do not re-prefetch if data is less than 60s old
      });
    },
    [queryClient]
  );

  return prefetch;
}
```

Using it in a component:

```tsx
'use client';

import { usePrefetchEvent } from '@/hooks/usePrefetchEvent';
import Link from 'next/link';
import type { GatherEvent } from '@/types/events';

export function EventCard({ event }: { event: GatherEvent }) {
  const prefetch = usePrefetchEvent();

  return (
    <Link
      href={`/events/${event.id}`}
      onMouseEnter={() => prefetch(event.id)}
      onFocus={() => prefetch(event.id)}
    >
      <article>
        <h3>{event.title}</h3>
        <p>{event.location}</p>
        <p>{event.attendeeCount} attending</p>
      </article>
    </Link>
  );
}
```

When the user hovers (or focuses with keyboard), `prefetchQuery` starts fetching the event detail in the background. By the time they click, the data is already in the cache. The detail page renders instantly with no loading spinner. This is one of those small details that separates a good application from a great one.

Notice the `onFocus` handler. Keyboard users navigate with Tab, and `onFocus` fires when the link receives focus. Always pair `onMouseEnter` with `onFocus` for accessibility.

---

## Placeholder Data

Sometimes you already have partial data for a query before it fetches. For example, the event list already has each event's title and attendee count. When the user navigates to an event detail page, you can show this partial data immediately while the full detail loads in the background:

```typescript
// src/hooks/useEvent.ts (enhanced with placeholder data)
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api';
import { eventKeys } from '@/lib/queryKeys';
import type { GatherEvent } from '@/types/events';

export function useEvent(id: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => eventsApi.getById(id),
    enabled: !!id,
    placeholderData: () => {
      // Look through cached event lists for this event
      const cachedLists = queryClient.getQueriesData<GatherEvent[]>({
        queryKey: eventKeys.lists(),
      });

      for (const [, events] of cachedLists) {
        const found = events?.find((event) => event.id === id);
        if (found) return found;
      }

      return undefined;
    },
  });
}
```

The `placeholderData` function searches through all cached event lists for the event with the matching ID. If found, it uses that data immediately while the full detail query fetches in the background. The user sees content right away instead of a loading spinner.

Unlike `initialData`, placeholder data does not populate the cache permanently. Once the real query resolves, the placeholder is replaced. This is the correct choice here because the list data might be incomplete (missing the full description, for example).

---

## Select: Transforming Query Data

The `select` option lets you transform or filter query data before it reaches the component. The transformation runs on every render, but only triggers a re-render if the selected result changes:

```typescript
// Get only upcoming events
export function useUpcomingEvents() {
  return useQuery({
    queryKey: eventKeys.list({}),
    queryFn: () => eventsApi.getAll(),
    select: (events) =>
      events.filter((event) => new Date(event.date) > new Date()),
  });
}

// Get only event titles and IDs (for a dropdown)
export function useEventOptions() {
  return useQuery({
    queryKey: eventKeys.list({}),
    queryFn: () => eventsApi.getAll(),
    select: (events) =>
      events.map((event) => ({ value: event.id, label: event.title })),
  });
}
```

Both hooks share the same cache entry (`eventKeys.list({})`). The `select` function transforms the cached data for each consumer. This is more efficient than fetching different endpoints for different views of the same data.

---

## Parallel Queries

When a page needs data from multiple independent endpoints, run the queries in parallel:

```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api';
import { eventKeys, userKeys } from '@/lib/queryKeys';

export function EventDetailPage({ eventId }: { eventId: string }) {
  // These two queries run simultaneously, not sequentially
  const eventQuery = useQuery({
    queryKey: eventKeys.detail(eventId),
    queryFn: () => eventsApi.getById(eventId),
  });

  const attendeesQuery = useQuery({
    queryKey: eventKeys.attendees(eventId),
    queryFn: () => fetch(`/api/events/${eventId}/attendees`).then((r) => r.json()),
  });

  if (eventQuery.isLoading || attendeesQuery.isLoading) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <h1>{eventQuery.data?.title}</h1>
      <p>{attendeesQuery.data?.length} attendees</p>
    </div>
  );
}
```

TanStack Query fires both requests at the same time. You do not need `Promise.all` or any special handling. Each query independently manages its loading, error, and caching states.

---

## Cache Invalidation Strategies for Real Applications

In production, invalidation gets nuanced. Here are strategies beyond the basics:

**Targeted invalidation after mutation:**

```typescript
onSuccess: (data, variables) => {
  // Invalidate the specific event that was updated
  queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.eventId) });
  // Also invalidate any list that might contain this event
  queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
},
```

**Direct cache update (skip the refetch):**

```typescript
onSuccess: (newEvent) => {
  // Instead of invalidating and refetching, update the cache directly
  queryClient.setQueryData(eventKeys.detail(newEvent.id), newEvent);
},
```

This is faster than invalidation because it skips the network round trip. Use it when the mutation response contains the full updated object.

**Invalidate on window focus (production setting):**

```typescript
new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // Refetch stale queries when user returns to the tab
    },
  },
});
```

This keeps data fresh when users switch between tabs. A user might RSVP from their phone while the desktop tab is open. When they return to the desktop tab, stale queries refetch automatically.

---

## Key Takeaways

1. **Optimistic updates make the UI feel instant.** Update the cache in `onMutate` before the server responds, roll back in `onError` if the server rejects, and refetch in `onSettled` to ensure eventual consistency.
2. **Always cancel in-flight queries before an optimistic update.** This prevents a background refetch from overwriting your optimistic changes.
3. **useInfiniteQuery handles paginated data.** Use `getNextPageParam` to drive pagination and `data.pages.flatMap()` to flatten pages into a renderable list.
4. **Prefetching on hover makes page transitions feel instant.** Use `queryClient.prefetchQuery` in `onMouseEnter` and `onFocus` handlers.
5. **Placeholder data shows partial cached data immediately** while the full query loads. Use it when the list view already contains some of the detail data.
6. **The `select` option transforms query data** without duplicating cache entries. Multiple components can select different views of the same cached data.
7. **Direct cache updates with `setQueryData` are faster than invalidation** when the mutation response contains the full updated object.

---

## Try It Yourself

1. Build the `useToggleRSVP` hook with full optimistic update support (onMutate, onError, onSettled). Simulate a server failure by throwing an error in 30% of requests and verify the rollback works.
2. Create a paginated API endpoint that returns 5 events per page. Build `useInfiniteEvents` and render an infinite scroll list with an IntersectionObserver. Verify that scrolling to the bottom loads the next page.
3. Add prefetch-on-hover to your event cards. Open the Network tab and observe the prefetch request firing on hover. Navigate to the event detail page and confirm it renders with no loading state.
4. Implement placeholder data in your `useEvent` hook. Navigate from the event list to a detail page and notice that partial data appears instantly while the full detail fetches.
5. Build two components that use the same query key but different `select` functions. Verify that they share one cache entry but render different data.
6. After an optimistic update, intentionally delay the `onSettled` invalidation by 3 seconds. Observe the UI showing the optimistic data during the delay, then updating to the server-confirmed data. This demonstrates the eventual consistency model.
7. Combine optimistic updates with infinite queries. Build an RSVP button inside an infinite event list and optimistically update the attendee count within the correct page of the infinite query data.

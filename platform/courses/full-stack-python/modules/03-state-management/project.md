---
title: "Module Project: Real-Time Feed"
estimatedMinutes: 75
---

# Module Project: Real-Time Feed

In this project, you will build a complete event feed for Gather that combines every state management technique from this module. The feed will use Zustand for UI filters, TanStack Query for server data, optimistic updates for RSVP toggling, infinite scrolling for paginated results, a WebSocket hook for live attendee counts, and prefetching on hover for instant detail page transitions.

This is where everything comes together into a single, working application.

---

## What You'll Practice

- Creating typed Zustand stores for shared UI state
- Building TanStack Query hooks with query key factories
- Implementing optimistic updates with rollback on failure
- Rendering infinite scrolling lists with `useInfiniteQuery`
- Building a custom `useWebSocket` hook with reconnection
- Integrating WebSocket messages into the TanStack Query cache
- Prefetching data on hover with `queryClient.prefetchQuery`
- TypeScript throughout (no `any` types)

---

## Prerequisites

- Completed all 5 lessons in this module
- Node.js 18+ installed
- Familiarity with TypeScript (from Module 01)
- Familiarity with Next.js 14 App Router (from Module 02)
- Basic command line skills

---

## Project Setup

Create a new Next.js 14 project:

```bash
npx create-next-app@14 gather-feed --typescript --tailwind --eslint --app --src-dir
cd gather-feed
npm install zustand @tanstack/react-query @tanstack/react-query-devtools
```

### Mock API Server

Create a mock API that simulates paginated events, RSVP toggling, and a WebSocket server. Install the `ws` package for the WebSocket server:

```bash
npm install --save-dev ws @types/ws concurrently
```

Create the mock server at `mock-server.ts`:

```typescript
// mock-server.ts
import { createServer } from 'http';
import { WebSocketServer, type WebSocket } from 'ws';

// --- Mock Data ---
interface MockEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  category: string;
  description: string;
  capacity: number;
  attendeeCount: number;
  coverImage: string;
  organizer: { name: string; email: string };
}

const CATEGORIES = ['Tech', 'Art', 'Music', 'Food', 'Career', 'Community'];

function generateEvents(count: number): MockEvent[] {
  const events: MockEvent[] = [];
  for (let i = 1; i <= count; i++) {
    events.push({
      id: `evt_${String(i).padStart(3, '0')}`,
      title: `Event ${i}: ${CATEGORIES[i % CATEGORIES.length]} Gathering`,
      date: new Date(2026, 3, 1 + i).toISOString(),
      location: '147 Front Street, Brooklyn, NY',
      category: CATEGORIES[i % CATEGORIES.length] ?? 'Tech',
      description: `A community ${CATEGORIES[i % CATEGORIES.length]?.toLowerCase()} event in Brooklyn.`,
      capacity: 50 + (i * 10),
      attendeeCount: Math.floor(Math.random() * 40),
      coverImage: `/placeholder-${(CATEGORIES[i % CATEGORIES.length] ?? 'tech').toLowerCase()}.jpg`,
      organizer: { name: 'Devin Jackson', email: 'devin@webuildblack.com' },
    });
  }
  return events;
}

const allEvents = generateEvents(100);

// --- HTTP Server ---
const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', `http://localhost:3001`);

  // GET /api/events (paginated)
  if (url.pathname === '/api/events' && req.method === 'GET') {
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20');
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');

    let filtered = allEvents;
    if (category) filtered = filtered.filter((e) => e.category === category);
    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter((e) => e.title.toLowerCase().includes(lower));
    }

    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    setTimeout(() => {
      res.writeHead(200);
      res.end(JSON.stringify({
        data,
        total: filtered.length,
        page,
        pageSize,
        hasMore: start + pageSize < filtered.length,
      }));
    }, 300);
    return;
  }

  // GET /api/events/:id
  const detailMatch = url.pathname.match(/^\/api\/events\/(evt_\d+)$/);
  if (detailMatch && req.method === 'GET') {
    const event = allEvents.find((e) => e.id === detailMatch[1]);
    if (!event) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    setTimeout(() => {
      res.writeHead(200);
      res.end(JSON.stringify(event));
    }, 200);
    return;
  }

  // POST /api/events/:id/rsvp
  const rsvpMatch = url.pathname.match(/^\/api\/events\/(evt_\d+)\/rsvp$/);
  if (rsvpMatch && req.method === 'POST') {
    const event = allEvents.find((e) => e.id === rsvpMatch[1]);
    if (!event) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    event.attendeeCount += 1;

    // Broadcast updated count to WebSocket clients
    broadcastToEvent(event.id, {
      type: 'attendee_count',
      eventId: event.id,
      count: event.attendeeCount,
    });

    setTimeout(() => {
      res.writeHead(200);
      res.end(JSON.stringify({ rsvped: true, attendeeCount: event.attendeeCount }));
    }, 300);
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

// --- WebSocket Server ---
const wss = new WebSocketServer({ server, path: '/ws' });

const subscriptions = new Map<string, Set<WebSocket>>();

function broadcastToEvent(eventId: string, message: unknown) {
  const clients = subscriptions.get(eventId);
  if (!clients) return;
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

wss.on('connection', (ws) => {
  let subscribedEventId: string | null = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'subscribe' && typeof msg.eventId === 'string') {
        subscribedEventId = msg.eventId;
        if (!subscriptions.has(msg.eventId)) {
          subscriptions.set(msg.eventId, new Set());
        }
        subscriptions.get(msg.eventId)?.add(ws);
      }
    } catch {
      // Ignore invalid messages
    }
  });

  ws.on('close', () => {
    if (subscribedEventId) {
      subscriptions.get(subscribedEventId)?.delete(ws);
    }
  });
});

server.listen(3001, () => {
  console.log('Mock API server running on http://localhost:3001');
  console.log('WebSocket server running on ws://localhost:3001/ws');
});
```

Add scripts to `package.json`:

```typescript
// In package.json "scripts":
// "mock-server": "npx tsx mock-server.ts",
// "dev:all": "concurrently \"npm run dev\" \"npm run mock-server\""
```

Run both servers with `npm run dev:all`.

---

## Step-by-Step Instructions

### Step 1: Set Up the Zustand Filter Store

Create the Zustand store for UI filters that the filter sidebar and event list will share.

**File: `src/stores/useFilterStore.ts`**

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// TODO: Define the FilterState interface with:
//   - category: string (empty string means "all categories")
//   - searchText: string
//   - dateRange: { start: string; end: string } (ISO strings, empty if unset)

// TODO: Define the FilterActions interface with:
//   - setCategory: (category: string) => void
//   - setSearchText: (text: string) => void
//   - setDateRange: (range: { start: string; end: string }) => void
//   - clearFilters: () => void

// TODO: Define FilterStore as FilterState & FilterActions

// TODO: Create an initialState constant with all fields set to defaults

// TODO: Export useFilterStore using create<FilterStore>()(devtools(...))
//   - Wrap in devtools middleware with name 'FilterStore'
//   - Implement all four actions using set()
//   - clearFilters should reset to initialState
```

### Step 2: Build TanStack Query Hooks

Set up the QueryProvider, define query keys, build the API client, and create typed hooks.

**File: `src/providers/QueryProvider.tsx`**

```tsx
'use client';

// TODO: Create a QueryProvider component that:
//   1. Creates a QueryClient inside useState (for SSR safety)
//   2. Sets default staleTime to 30 seconds, gcTime to 5 minutes
//   3. Wraps children in QueryClientProvider
//   4. Includes ReactQueryDevtools with initialIsOpen={false}
```

**File: `src/lib/queryKeys.ts`**

```typescript
// TODO: Define an eventKeys factory with:
//   - all: ['events'] as const
//   - lists: () => [...eventKeys.all, 'list'] as const
//   - list: (filters) => [...eventKeys.lists(), filters] as const
//   - details: () => [...eventKeys.all, 'detail'] as const
//   - detail: (id: string) => [...eventKeys.details(), id] as const
```

**File: `src/types/events.ts`**

```typescript
// TODO: Define these interfaces:
//   - GatherEvent (id, title, date, location, category, description,
//     capacity, attendeeCount, coverImage, organizer: { name, email })
//   - EventFilters (category?, search?, startDate?, endDate?)
//   - PaginatedResponse<T> (data: T[], total, page, pageSize, hasMore)
```

**File: `src/lib/api.ts`**

```typescript
// TODO: Build an eventsApi object with:
//   - getAll(filters?): fetch GET /api/events with query params, return GatherEvent[]
//   - getPaginated(page, pageSize, filters?): return PaginatedResponse<GatherEvent>
//   - getById(id): fetch GET /api/events/:id, return GatherEvent
//   - toggleRSVP(eventId): fetch POST /api/events/:id/rsvp, return { rsvped, attendeeCount }
//
// Point BASE_URL to http://localhost:3001
// Use a typed fetchJSON<T> helper that throws on non-ok responses
```

**File: `src/hooks/useEvents.ts`**

```typescript
// TODO: Export a useEvents(filters?) hook that:
//   1. Reads category and searchText from useFilterStore (with selectors)
//   2. Merges store filters with any passed-in filters
//   3. Calls useQuery with eventKeys.list(mergedFilters) and eventsApi.getAll
//   4. Returns the query result
```

**File: `src/hooks/useEvent.ts`**

```typescript
// TODO: Export a useEvent(id) hook that:
//   1. Calls useQuery with eventKeys.detail(id) and eventsApi.getById
//   2. Sets enabled: !!id
//   3. Uses placeholderData to search cached list queries for this event
//   4. Returns the query result
```

### Step 3: Implement Optimistic RSVP Toggle

**File: `src/hooks/useToggleRSVP.ts`**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api';
import { eventKeys } from '@/lib/queryKeys';
import type { GatherEvent } from '@/types/events';

// TODO: Export a useToggleRSVP(eventId) hook that returns a useMutation with:
//
//   mutationFn: calls eventsApi.toggleRSVP(eventId)
//
//   onMutate:
//     1. Cancel in-flight queries for eventKeys.detail(eventId)
//     2. Snapshot current event data with getQueryData
//     3. Optimistically update the cache: increment attendeeCount by 1
//     4. Return { previousEvent } as context
//
//   onError:
//     1. Receive context from onMutate
//     2. Roll back: setQueryData to context.previousEvent
//
//   onSettled:
//     1. Invalidate eventKeys.detail(eventId) to refetch server truth
//     2. Invalidate eventKeys.lists() so list views update too
```

### Step 4: Add Infinite Scrolling

**File: `src/hooks/useInfiniteEvents.ts`**

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api';
import { eventKeys } from '@/lib/queryKeys';
import { useFilterStore } from '@/stores/useFilterStore';
import { useShallow } from 'zustand/react/shallow';

// TODO: Export a useInfiniteEvents() hook that:
//   1. Reads category and searchText from the filter store
//   2. Uses queryKey: [...eventKeys.all, 'infinite', { category, searchText }]
//   3. Calls eventsApi.getPaginated(pageParam, 20, { category, search: searchText })
//   4. Sets initialPageParam to 1
//   5. getNextPageParam returns lastPage.hasMore ? lastPage.page + 1 : undefined
```

**File: `src/components/InfiniteEventList.tsx`**

```tsx
'use client';

import { useInfiniteEvents } from '@/hooks/useInfiniteEvents';
import { useEffect, useRef } from 'react';

// TODO: Build the InfiniteEventList component that:
//   1. Calls useInfiniteEvents() to get paginated data
//   2. Flattens data.pages into a single array with flatMap(page => page.data)
//   3. Renders each event as a card (title, date, location, attendee count)
//   4. Creates a ref for a sentinel <div> at the bottom of the list
//   5. Sets up an IntersectionObserver that calls fetchNextPage when the sentinel
//      enters the viewport (check hasNextPage and !isFetchingNextPage first)
//   6. Shows "Loading more..." while isFetchingNextPage is true
//   7. Shows "You've reached the end." when hasNextPage is false
//   8. Cleans up the observer on unmount
```

### Step 5: Build the useWebSocket Hook

**File: `src/hooks/useWebSocket.ts`**

```typescript
// TODO: Build the useWebSocket<T> hook as described in Lesson 5:
//   1. Accept options: url, onMessage, onOpen?, onClose?, onError?,
//      shouldReconnect (default true), maxReconnectAttempts (default 5), enabled (default true)
//   2. Store callbacks in refs to avoid reconnection on callback changes
//   3. Implement connect() that creates a new WebSocket and attaches event listeners
//   4. Parse incoming messages as JSON and call onMessage with typed data
//   5. Implement attemptReconnect() with exponential backoff (1s, 2s, 4s, 8s, 16s)
//   6. Clean up on unmount: clear reconnect timers, close the WebSocket with code 1000
//   7. Return { send, isConnected, reconnectAttempt }
```

### Step 6: Integrate WebSocket with Query Cache

**File: `src/components/LiveAttendeeCount.tsx`**

```tsx
'use client';

// TODO: Build a LiveAttendeeCount component that:
//   1. Accepts { eventId: string }
//   2. Uses useEvent(eventId) to read the current attendee count
//   3. Connects to ws://localhost:3001/ws with useWebSocket
//   4. On connection open, sends { type: 'subscribe', eventId } to the server
//   5. On incoming 'attendee_count' messages, updates the TanStack Query cache
//      using queryClient.setQueryData on eventKeys.detail(eventId)
//   6. Displays the attendee count and a "live" indicator when connected
//   7. Shows "reconnecting..." when disconnected
```

### Step 7: Add Prefetch on Hover

**File: `src/components/EventCard.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api';
import { eventKeys } from '@/lib/queryKeys';
import type { GatherEvent } from '@/types/events';
import { useCallback } from 'react';

// TODO: Build an EventCard component that:
//   1. Accepts { event: GatherEvent }
//   2. Renders a Link to /events/${event.id} with event title, date, location,
//      category, and attendee count
//   3. On onMouseEnter AND onFocus, calls queryClient.prefetchQuery
//      with eventKeys.detail(event.id) and eventsApi.getById(event.id)
//   4. Sets staleTime on the prefetch to avoid re-prefetching within 60 seconds
```

---

## Expected Output

When complete, your application should:

1. **Filter sidebar**: Selecting a category or typing a search term updates the event list instantly via the Zustand filter store. Filters persist across the filter sidebar and the event list without prop drilling.

2. **Infinite event list**: The first 20 events load on page load. Scrolling to the bottom automatically loads the next 20. A "Loading more..." indicator appears during fetch. "You've reached the end." appears after the last page.

3. **Optimistic RSVP**: Clicking the RSVP button on an event card immediately increments the attendee count. If you simulate a server error (modify the mock server to fail 30% of the time), the count rolls back.

4. **Live attendee count**: On the event detail page, the attendee count updates in real-time via WebSocket. Opening the event in two browser tabs and RSVPing in one shows the count update in the other.

5. **Prefetch on hover**: Hovering over an event card prefetches the detail data. Clicking through to the detail page renders with no loading state because the data is already cached.

6. **Devtools**: The React Query Devtools panel shows all active queries, their state (fresh, stale, fetching), and cache contents. The Redux DevTools show Zustand filter store changes.

---

## Stretch Goals

1. **Add optimistic RSVP within the infinite list.** When the user RSVPs from the list view (not the detail page), optimistically update the attendee count within the correct page of the infinite query data. This requires mapping through `data.pages` to find and update the right event.

2. **Build a notification toast for WebSocket events.** When a new RSVP comes in via WebSocket, show a brief toast notification at the bottom of the screen ("Maya just RSVPed to Brooklyn Tech Meetup"). Auto-dismiss after 3 seconds. Use Zustand to manage a notifications queue.

3. **Sync filters with URL search params.** Instead of storing filters only in Zustand, also reflect them in the URL as query parameters (`?category=Tech&search=brooklyn`). When the page loads, initialize the Zustand store from the URL params. When filters change, update the URL using Next.js `useRouter`. This makes filtered views shareable and bookmarkable.

---

## Submission Checklist

Before considering this project complete, verify:

- [ ] A Zustand `useFilterStore` manages category, searchText, and dateRange with typed actions
- [ ] A `QueryProvider` wraps the app with a properly configured `QueryClient`
- [ ] A query key factory (`eventKeys`) is used consistently in all hooks
- [ ] `useEvents` reads filters from the Zustand store and passes them as query key + query params
- [ ] `useEvent` uses `placeholderData` to show cached list data while the detail fetches
- [ ] `useToggleRSVP` implements full optimistic updates (onMutate snapshot, onError rollback, onSettled invalidation)
- [ ] `useInfiniteEvents` powers an infinite scroll list with IntersectionObserver
- [ ] `useWebSocket` handles connection, typed messages, exponential backoff reconnection, and cleanup
- [ ] WebSocket `attendee_count` messages update the TanStack Query cache via `setQueryData`
- [ ] Event cards prefetch detail data on hover and focus
- [ ] All code uses TypeScript with no `any` types
- [ ] The app builds without errors (`npm run build`)

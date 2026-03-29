---
title: "Module Project: Advanced Dashboard"
estimatedMinutes: 90
---

# Module Project: Advanced Dashboard

In this project, you will build an event dashboard for Gather using advanced React patterns and Next.js 14. You will combine compound components, Suspense boundaries, error boundaries, lazy loading, Server Components, and Server Actions into a single, production-quality application.

This is where everything from the module comes together.

---

## What You'll Practice

- Compound component pattern with Context and the namespace API
- Suspense boundaries for granular loading states
- Error boundaries for resilient section-level error handling
- Code splitting with `React.lazy` for the admin panel
- Server Components for data fetching (no `useEffect`)
- Server Actions for creating new events
- TypeScript throughout (no `any` types)

---

## Prerequisites

- Completed all 6 lessons in this module
- Node.js 18+ installed
- Familiarity with TypeScript (from Module 01)
- Basic command line skills

---

## Project Setup

Create a new Next.js 14 project:

```bash
npx create-next-app@14 gather-dashboard --typescript --tailwind --eslint --app --src-dir
cd gather-dashboard
```

Create a mock data file at `src/lib/data.ts` for your events:

```typescript
export interface GatherEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  category: string;
  attendeeCount: number;
  coverImage: string;
  description: string;
  organizer: {
    name: string;
    email: string;
  };
}

export const mockEvents: GatherEvent[] = [
  {
    id: "1",
    title: "Brooklyn Tech Meetup",
    date: "2026-04-15T18:00:00Z",
    location: "147 Front Street, Brooklyn, NY",
    category: "Tech",
    attendeeCount: 45,
    coverImage: "/placeholder-tech.jpg",
    description: "Monthly meetup for Brooklyn-based engineers to share projects and connect.",
    organizer: { name: "Devin Jackson", email: "devin@webuildblack.com" },
  },
  {
    id: "2",
    title: "Art in the Park",
    date: "2026-04-20T14:00:00Z",
    location: "Prospect Park, Brooklyn, NY",
    category: "Art",
    attendeeCount: 120,
    coverImage: "/placeholder-art.jpg",
    description: "Outdoor art showcase featuring local Brooklyn artists.",
    organizer: { name: "Maya Johnson", email: "maya@example.com" },
  },
  {
    id: "3",
    title: "Community Cook-Off",
    date: "2026-05-01T12:00:00Z",
    location: "Fort Greene Park, Brooklyn, NY",
    category: "Food",
    attendeeCount: 80,
    coverImage: "/placeholder-food.jpg",
    description: "Bring your best dish and compete for the Golden Spatula.",
    organizer: { name: "Chris Williams", email: "chris@example.com" },
  },
  {
    id: "4",
    title: "Resume Workshop",
    date: "2026-05-10T10:00:00Z",
    location: "Brooklyn Public Library",
    category: "Career",
    attendeeCount: 30,
    coverImage: "/placeholder-career.jpg",
    description: "Get your resume reviewed by hiring managers from top companies.",
    organizer: { name: "Aisha Thompson", email: "aisha@example.com" },
  },
  {
    id: "5",
    title: "Jazz Night",
    date: "2026-05-15T20:00:00Z",
    location: "BAM Cafe, Brooklyn, NY",
    category: "Music",
    attendeeCount: 200,
    coverImage: "/placeholder-music.jpg",
    description: "Live jazz performances featuring emerging Brooklyn musicians.",
    organizer: { name: "Marcus Bell", email: "marcus@example.com" },
  },
];
```

Create a simulated async data fetcher at `src/lib/api.ts`:

```typescript
import { mockEvents, type GatherEvent } from "./data";

// Simulate network delay
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getEvents(): Promise<GatherEvent[]> {
  await delay(800); // Simulate API latency
  return mockEvents;
}

export async function getEventById(id: string): Promise<GatherEvent | null> {
  await delay(500);
  return mockEvents.find((e) => e.id === id) ?? null;
}

export async function getEventsByCategory(category: string): Promise<GatherEvent[]> {
  await delay(600);
  return mockEvents.filter(
    (e) => e.category.toLowerCase() === category.toLowerCase()
  );
}
```

---

## Step-by-Step Instructions

### Step 1: Build the Compound FilterPanel Component

Create the compound `FilterPanel` component with Context-based state sharing.

**File: `src/components/FilterPanel.tsx`**

```tsx
"use client";

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";

// TODO: Define the FilterState interface with three properties:
//   - search: string
//   - categories: string[] (selected categories)
//   - dateRange: { start: string; end: string } (ISO date strings, empty string if unset)

// TODO: Define the FilterContextValue interface with:
//   - state: FilterState
//   - updateSearch: (query: string) => void
//   - toggleCategory: (category: string) => void
//   - setDateRange: (start: string, end: string) => void
//   - clearAll: () => void

// TODO: Create the FilterContext with createContext<FilterContextValue | null>(null)

// TODO: Create a useFilterContext() hook that:
//   1. Calls useContext(FilterContext)
//   2. Throws a descriptive error if the context is null
//   3. Returns the context value

// TODO: Build FilterPanelRoot component that:
//   1. Accepts { children, onFilterChange?, className? }
//   2. Manages FilterState with useState
//   3. Creates memoized updater functions with useCallback
//   4. Provides the context value (memoized with useMemo)
//   5. Calls onFilterChange whenever state changes
//   6. Renders a <div> with role="search" wrapping {children}

// TODO: Build FilterSearch component that:
//   1. Accepts { placeholder?, className? }
//   2. Reads state.search and updateSearch from useFilterContext()
//   3. Renders an accessible <input> with a <label>

// TODO: Build FilterCategory component that:
//   1. Accepts { options: string[], label?, className? }
//   2. Reads state.categories and toggleCategory from useFilterContext()
//   3. Renders a <fieldset> with chip-style buttons
//   4. Uses aria-pressed to indicate selected categories

// TODO: Build FilterDateRange component that:
//   1. Accepts { className? }
//   2. Reads state.dateRange and setDateRange from useFilterContext()
//   3. Renders two <input type="date"> fields (From / To)

// TODO: Build FilterClear component that:
//   1. Accepts { label? }
//   2. Reads clearAll from useFilterContext()
//   3. Renders a button that calls clearAll

// TODO: Combine everything with Object.assign:
// export const FilterPanel = Object.assign(FilterPanelRoot, {
//   Search: FilterSearch,
//   Category: FilterCategory,
//   DateRange: FilterDateRange,
//   Clear: FilterClear,
// });
```

### Step 2: Add Suspense Boundaries Around Data-Loading Sections

Create loading states for different sections of the dashboard.

**File: `src/app/loading.tsx`**

```tsx
// TODO: Export a default function that renders a skeleton dashboard:
//   - A skeleton filter bar (gray rectangles where filters will be)
//   - A skeleton grid of 4-6 event card placeholders
//   - Use CSS animations or Tailwind's animate-pulse for shimmer effect
```

**File: `src/app/events/[id]/loading.tsx`**

```tsx
// TODO: Export a default function that renders a skeleton event detail:
//   - Skeleton image placeholder
//   - Skeleton title and date lines
//   - Skeleton description paragraph
//   - Skeleton RSVP button
```

### Step 3: Build the Error Boundary

Create a reusable error boundary component and the route-level error files.

**File: `src/components/ErrorBoundary.tsx`**

```tsx
"use client";

import React from "react";

// TODO: Define FallbackProps interface with:
//   - error: Error
//   - resetError: () => void

// TODO: Define ErrorBoundaryProps interface with:
//   - children: React.ReactNode
//   - fallback?: React.ReactNode | ((props: FallbackProps) => React.ReactNode)
//   - onError?: (error: Error, errorInfo: React.ErrorInfo) => void

// TODO: Define ErrorBoundaryState with:
//   - hasError: boolean
//   - error: Error | null

// TODO: Build the ErrorBoundary class component with:
//   1. Constructor initializing state to { hasError: false, error: null }
//   2. static getDerivedStateFromError that returns { hasError: true, error }
//   3. componentDidCatch that logs the error and calls props.onError if provided
//   4. A resetError method that sets state back to { hasError: false, error: null }
//   5. render() that:
//      - If hasError and fallback is a function, calls fallback({ error, resetError })
//      - If hasError and fallback is a ReactNode, renders it
//      - If hasError with no fallback, renders a default error UI with a "Try again" button
//      - Otherwise renders this.props.children
```

**File: `src/app/error.tsx`**

```tsx
"use client";

// TODO: Export a default Client Component that:
//   1. Accepts { error: Error, reset: () => void }
//   2. Renders an error message and a "Try again" button that calls reset
```

**File: `src/app/events/[id]/error.tsx`**

```tsx
"use client";

// TODO: Export a default Client Component for event detail errors:
//   1. Accepts { error: Error, reset: () => void }
//   2. Renders a contextual error message ("Could not load this event")
//   3. Includes a "Try again" button and a link back to /events
```

### Step 4: Create the AsyncBoundary Wrapper

**File: `src/components/AsyncBoundary.tsx`**

```tsx
"use client";

import { Suspense } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import type { FallbackProps } from "./ErrorBoundary";

// TODO: Define AsyncBoundaryProps with:
//   - children: React.ReactNode
//   - loadingFallback?: React.ReactNode
//   - errorFallback?: React.ReactNode | ((props: FallbackProps) => React.ReactNode)

// TODO: Build the AsyncBoundary component that:
//   1. Wraps children in ErrorBoundary (with errorFallback)
//   2. Inside the ErrorBoundary, wraps children in Suspense (with loadingFallback)
//   3. Uses sensible defaults for both fallbacks
```

### Step 5: Lazy-Load the Admin Panel

**File: `src/components/AdminPanel.tsx`**

```tsx
"use client";

// TODO: Build an AdminPanel component that displays:
//   - A heading "Admin Dashboard"
//   - A summary stats section (Total Events: X, Total Attendees: Y)
//   - A table listing all events with columns: Title, Date, Category, Attendees
//   - Accept events as a prop: { events: GatherEvent[] }
//   - This component will be lazy-loaded, so it can be large without affecting initial load
```

**File: `src/app/page.tsx`** (integrate lazy loading)

```tsx
// TODO: At the top of the file (this is a Client Component for lazy loading):
//   1. Add "use client"
//   2. Import { lazy, Suspense, useState } from "react"
//   3. Lazy-load AdminPanel: const AdminPanel = lazy(() => import("@/components/AdminPanel"))
//   4. Add a "Show Admin Panel" toggle button
//   5. When toggled, render AdminPanel inside a Suspense boundary with a loading fallback
```

### Step 6: Server Component Event Listing Page

**File: `src/app/events/page.tsx`**

```tsx
import { getEvents } from "@/lib/api";

// TODO: Build an async Server Component that:
//   1. Awaits getEvents() to fetch the event list
//   2. Renders a heading and event grid
//   3. Does NOT use "use client"  --  this is a Server Component
//   4. Imports and renders a Client Component for interactive filtering (FilterPanel)
//      - Pass the events as initial data to a Client Component wrapper
//      - The Client Component handles filtering, the Server Component handles fetching
```

### Step 7: Server Action for Creating Events

**File: `src/app/actions/events.ts`**

```typescript
"use server";

// TODO: Build a createEvent Server Action that:
//   1. Accepts FormData
//   2. Extracts title, date, location, description, category from the form data
//   3. Validates that title and date are present (throw an error if not)
//   4. Logs the new event data to the server console
//   5. Calls revalidatePath("/events") to refresh the event listing
//   6. For now, just log the data  --  do not persist it
```

**File: `src/app/create/page.tsx`**

```tsx
// TODO: Build a create event page that:
//   1. Uses "use client" (it has form interactions)
//   2. Imports the createEvent Server Action
//   3. Renders a form with fields for: title, date, location, description, category
//   4. Uses <form action={createEvent}> to submit via the Server Action
//   5. Includes a SubmitButton component that uses useFormStatus for pending state
```

---

## Expected Output

When complete, your application should:

1. **Event listing page** (`/events`): Fetches events on the server, displays them in a grid. Shows a skeleton while loading.
2. **Filtering**: The `FilterPanel` compound component lets users filter by search text, category, and date range. Filters are composable and rearrangeable.
3. **Event detail page** (`/events/[id]`): Server-fetched event details with a client-side RSVP button.
4. **Error handling**: Each section has its own error boundary. Errors in one section do not crash others. `error.tsx` files provide route-level error handling.
5. **Admin panel**: Lazy-loaded behind a toggle. Only downloads the JavaScript when the user opens it.
6. **Create event**: A form that submits through a Server Action, logging data on the server and revalidating the events page.

---

## Stretch Goals

1. **Add virtualization.** Install `@tanstack/react-virtual` and virtualize the event list so it performs well with 500+ events. Generate more mock events with a loop in `data.ts`.

2. **Build a second compound component.** Create a `Tabs` component with `Tabs.Root`, `Tabs.List`, `Tabs.Tab`, and `Tabs.Panel`. Use it on the event detail page to switch between "Details," "Attendees," and "Discussion" sections.

3. **Add optimistic updates to the RSVP button.** Use `useOptimisticAction` (or manual optimistic state) so the button updates immediately when clicked, before the server response comes back. Show a subtle undo option if the user changes their mind.

---

## Submission Checklist

Before considering this project complete, verify:

- [ ] `FilterPanel` uses the compound component pattern with Context (not prop drilling)
- [ ] `FilterPanel.Search`, `FilterPanel.Category`, `FilterPanel.DateRange`, and `FilterPanel.Clear` all work independently and compose freely
- [ ] At least two `Suspense` boundaries with skeleton fallbacks exist (event listing and event detail)
- [ ] At least two `ErrorBoundary` instances wrap independent sections
- [ ] The admin panel is lazy-loaded with `React.lazy` and wrapped in `Suspense`
- [ ] The event listing page (`/events`) is a Server Component with `async`/`await` data fetching
- [ ] A Server Action handles the create event form submission
- [ ] `error.tsx` files exist at the route level with retry functionality
- [ ] All code uses TypeScript with no `any` types
- [ ] The app builds without errors (`npm run build`)

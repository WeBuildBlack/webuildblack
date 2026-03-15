---
title: "Server Components and Next.js"
estimatedMinutes: 40
---

# Server Components and Next.js

Everything you have written in React so far runs in the browser. The JavaScript ships to the user's device, executes, fetches data from APIs, and renders the UI. Server Components flip this model: components run on the server, send rendered HTML to the client, and never ship their JavaScript to the browser.

Next.js 14 with the App Router is the most mature framework for Server Components today. In this lesson, you will set up a Next.js project from scratch, learn the server/client component split, and build Gather pages that fetch data on the server and handle interactions on the client.

---

## Setting Up Next.js 14 with the App Router

Create a new Next.js project with TypeScript:

```bash
npx create-next-app@14 gather-app --typescript --tailwind --eslint --app --src-dir
```

This generates a project with:
- The App Router (`src/app/` directory)
- TypeScript configured
- Tailwind CSS for styling
- ESLint for linting

The `src/app/` directory is where all your routes live. Every folder becomes a URL path. Every `page.tsx` file becomes a page.

```
src/app/
├── layout.tsx          # Root layout (wraps all pages)
├── page.tsx            # Home page (/)
├── events/
│   ├── page.tsx        # Event listing (/events)
│   └── [id]/
│       └── page.tsx    # Event detail (/events/123)
└── create/
    └── page.tsx        # Create event (/create)
```

---

## File-Based Routing

Next.js App Router uses the file system as the router. Here are the conventions:

| File | Purpose |
|------|---------|
| `page.tsx` | The UI for a route. Makes the route publicly accessible. |
| `layout.tsx` | Shared UI that wraps child routes. Persists across navigations. |
| `loading.tsx` | Loading UI (automatically wrapped in Suspense). |
| `error.tsx` | Error UI (automatically wrapped in an Error Boundary). |
| `not-found.tsx` | 404 UI for the route. |

**Dynamic routes** use square brackets: `[id]`, `[slug]`, `[eventId]`.

```tsx
// src/app/events/[id]/page.tsx
interface EventPageProps {
  params: { id: string };
}

export default function EventPage({ params }: EventPageProps) {
  return <div>Event ID: {params.id}</div>;
}
```

Visiting `/events/abc123` renders this component with `params.id` equal to `"abc123"`.

**Layout nesting** is automatic. A layout in `src/app/layout.tsx` wraps everything. A layout in `src/app/events/layout.tsx` wraps only the events section:

```tsx
// src/app/layout.tsx  --  wraps the entire app
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

```tsx
// src/app/events/layout.tsx  --  wraps only /events and its children
export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="events-layout">
      <aside className="events-sidebar">
        <EventCategoryNav />
      </aside>
      <section className="events-content">{children}</section>
    </div>
  );
}
```

When a user visits `/events/abc123`, Next.js renders `RootLayout > EventsLayout > EventPage`. The navbar and footer come from the root layout. The sidebar comes from the events layout. The event detail comes from the page.

---

## Server Components vs. Client Components

In the App Router, **every component is a Server Component by default.** This is the fundamental shift from previous React development.

**Server Components:**
- Run on the server at request time (or build time for static pages)
- Can directly access databases, file systems, and environment variables
- Cannot use hooks (`useState`, `useEffect`, `useContext`)
- Cannot use browser APIs (`window`, `document`, `localStorage`)
- Cannot use event handlers (`onClick`, `onChange`)
- Their JavaScript is never sent to the browser

**Client Components:**
- Run in the browser (and on the server for the initial HTML render)
- Can use hooks, browser APIs, and event handlers
- Marked with `"use client"` at the top of the file
- Their JavaScript is shipped to the browser

Here is the decision table:

| What you need | Component type |
|---|---|
| Fetch data from a database or API | Server |
| Read files or environment variables | Server |
| Display static or server-fetched content | Server |
| Use `useState`, `useEffect`, or other hooks | Client |
| Handle user interactions (`onClick`, form inputs) | Client |
| Use browser APIs (`localStorage`, `window`) | Client |
| Use Context providers or consumers | Client |

The rule of thumb: **start with Server Components. Add `"use client"` only when you need interactivity or browser APIs.** Push client components as far down the tree as possible.

---

## Async Server Components for Data Fetching

Server Components can be `async` functions. This means you can `await` data directly in the component, with no `useEffect`, no loading state management, and no client-side fetch calls.

Here is a Gather event listing page as a Server Component:

```tsx
// src/app/events/page.tsx  --  Server Component (no "use client")
interface GatherEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  attendeeCount: number;
  coverImage: string;
}

async function getEvents(): Promise<GatherEvent[]> {
  const response = await fetch("https://api.gather.example/events", {
    next: { revalidate: 60 }, // Cache for 60 seconds
  });

  if (!response.ok) {
    throw new Error("Failed to fetch events");
  }

  return response.json();
}

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <div className="events-page">
      <h1>Upcoming Events</h1>
      <div className="event-grid">
        {events.map((event) => (
          <div key={event.id} className="event-card">
            <img src={event.coverImage} alt={event.title} />
            <h2>{event.title}</h2>
            <p>{event.date}</p>
            <p>{event.location}</p>
            <span>{event.attendeeCount} attending</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Compare this to the client-side equivalent. No `useState` for the events array. No `useEffect` for the fetch call. No `isLoading` state. No error state management. The component is a plain function that awaits data and returns JSX.

**Data fetching benefits of Server Components:**
- **No client-server waterfall.** The data is fetched on the server, right next to your database or API. No round trip from the browser.
- **No loading state code.** Next.js handles loading UI with `loading.tsx` (see below).
- **No exposing API keys.** Environment variables stay on the server. The client never sees them.
- **Automatic caching.** The `next` option on `fetch` controls caching and revalidation.

---

## Client Components for Interactivity

When you need interactivity, create a Client Component with `"use client"`:

```tsx
// src/components/RSVPButton.tsx
"use client";

import { useState } from "react";

interface RSVPButtonProps {
  eventId: string;
  initialCount: number;
}

export function RSVPButton({ eventId, initialCount }: RSVPButtonProps) {
  const [hasRSVPd, setHasRSVPd] = useState(false);
  const [count, setCount] = useState(initialCount);

  const handleRSVP = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "POST",
      });

      if (response.ok) {
        setHasRSVPd(true);
        setCount((c) => c + 1);
      }
    } catch (error) {
      console.error("RSVP failed:", error);
    }
  };

  return (
    <button
      onClick={handleRSVP}
      disabled={hasRSVPd}
      className={`rsvp-button ${hasRSVPd ? "rsvp-button--confirmed" : ""}`}
    >
      {hasRSVPd ? `You're going (${count})` : `RSVP (${count})`}
    </button>
  );
}
```

Now use it inside a Server Component:

```tsx
// src/app/events/[id]/page.tsx  --  Server Component
import { RSVPButton } from "@/components/RSVPButton";

async function getEvent(id: string): Promise<GatherEvent> {
  const response = await fetch(`https://api.gather.example/events/${id}`);
  if (!response.ok) throw new Error("Event not found");
  return response.json();
}

export default async function EventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const event = await getEvent(params.id);

  return (
    <div className="event-detail">
      <h1>{event.title}</h1>
      <p>{event.date}</p>
      <p>{event.location}</p>
      <p>{event.description}</p>

      {/* Client Component for interactivity */}
      <RSVPButton eventId={event.id} initialCount={event.attendeeCount} />
    </div>
  );
}
```

The event detail page is a Server Component. It fetches data on the server without exposing any API calls to the client. The `RSVPButton` is a Client Component because it needs `useState` and `onClick`. Only the button's JavaScript ships to the browser, not the entire page.

---

## Server Actions for Mutations

Server Actions are functions that run on the server but can be called from Client Components. They are used for form submissions, data mutations, and any operation that should happen server-side.

Define a Server Action in a separate file:

```tsx
// src/app/actions/events.ts
"use server";

import { revalidatePath } from "next/cache";

interface CreateEventData {
  title: string;
  date: string;
  location: string;
  description: string;
}

export async function createEvent(formData: FormData): Promise<void> {
  const data: CreateEventData = {
    title: formData.get("title") as string,
    date: formData.get("date") as string,
    location: formData.get("location") as string,
    description: formData.get("description") as string,
  };

  // Validate
  if (!data.title || !data.date) {
    throw new Error("Title and date are required");
  }

  // Save to database (this runs on the server)
  const response = await fetch("https://api.gather.example/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.API_SECRET_KEY}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to create event");
  }

  // Revalidate the events page cache so the new event appears
  revalidatePath("/events");
}
```

Use the Server Action in a Client Component form:

```tsx
// src/app/create/page.tsx
"use client";

import { createEvent } from "@/app/actions/events";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? "Creating..." : "Create Event"}
    </button>
  );
}

export default function CreateEventPage() {
  return (
    <div className="create-event">
      <h1>Create a New Event</h1>

      <form action={createEvent} className="event-form">
        <label>
          Event Title
          <input type="text" name="title" required />
        </label>

        <label>
          Date
          <input type="datetime-local" name="date" required />
        </label>

        <label>
          Location
          <input type="text" name="location" />
        </label>

        <label>
          Description
          <textarea name="description" rows={5} />
        </label>

        <SubmitButton />
      </form>
    </div>
  );
}
```

Key points about Server Actions:

- The `"use server"` directive marks functions as Server Actions
- They receive `FormData` when used as a form `action`
- They run on the server, so they can access databases, secrets, and internal APIs
- `revalidatePath` tells Next.js to refetch data for a specific route
- `useFormStatus` provides the `pending` state for loading indicators

---

## loading.tsx and error.tsx Conventions

Next.js automatically wraps your pages with Suspense and Error Boundaries using special files.

**`loading.tsx`** creates an automatic Suspense boundary:

```tsx
// src/app/events/loading.tsx
export default function EventsLoading() {
  return (
    <div className="events-loading">
      <div className="skeleton-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-image" />
            <div className="skeleton-title" />
            <div className="skeleton-text" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

When the events page is loading (the async Server Component is awaiting data), Next.js shows this skeleton UI automatically. No manual `Suspense` wrapper needed.

**`error.tsx`** creates an automatic Error Boundary:

```tsx
// src/app/events/error.tsx
"use client"; // Error components must be Client Components

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function EventsError({ error, reset }: ErrorPageProps) {
  return (
    <div className="error-page" role="alert">
      <h2>Failed to load events</h2>
      <p>Something went wrong while fetching the event list.</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

The `reset` function re-renders the route segment, giving the Server Component another chance to succeed. The `error.tsx` file must be a Client Component (it uses `onClick`).

**`not-found.tsx`** handles 404s:

```tsx
// src/app/events/[id]/not-found.tsx
export default function EventNotFound() {
  return (
    <div className="not-found">
      <h2>Event Not Found</h2>
      <p>The event you are looking for does not exist or has been removed.</p>
      <a href="/events">Browse all events</a>
    </div>
  );
}
```

Trigger it from a Server Component with `notFound()`:

```tsx
import { notFound } from "next/navigation";

export default async function EventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const event = await getEvent(params.id);

  if (!event) {
    notFound(); // Renders the nearest not-found.tsx
  }

  return <div>{event.title}</div>;
}
```

---

## Putting It All Together

Here is a complete Gather event detail page using all the patterns from this lesson:

```tsx
// src/app/events/[id]/page.tsx  --  Server Component
import { notFound } from "next/navigation";
import { RSVPButton } from "@/components/RSVPButton";
import { ShareButton } from "@/components/ShareButton";

async function getEvent(id: string): Promise<GatherEvent | null> {
  try {
    const response = await fetch(
      `https://api.gather.example/events/${id}`,
      { next: { revalidate: 30 } }
    );
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Failed to fetch event");
    return response.json();
  } catch {
    throw new Error("Could not connect to the events service");
  }
}

export default async function EventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const event = await getEvent(params.id);

  if (!event) {
    notFound();
  }

  return (
    <article className="event-detail">
      <header>
        <h1>{event.title}</h1>
        <time dateTime={event.date}>{new Date(event.date).toLocaleDateString()}</time>
        <p>Hosted by {event.organizer.name}</p>
      </header>

      <img
        src={event.coverImage}
        alt={`Cover image for ${event.title}`}
        className="event-cover"
      />

      <section className="event-info">
        <p>{event.description}</p>
        <p>Location: {event.location}</p>
      </section>

      <div className="event-actions">
        {/* Client Components for interactivity */}
        <RSVPButton eventId={event.id} initialCount={event.attendeeCount} />
        <ShareButton title={event.title} url={`/events/${event.id}`} />
      </div>
    </article>
  );
}
```

The server handles data fetching, SEO-ready HTML rendering, and secret management. Client Components handle only the interactive pieces (RSVP, share). Loading and error states are managed by `loading.tsx` and `error.tsx` in the same directory.

---

## Key Takeaways

1. **Next.js App Router** uses file-based routing. Each folder is a route, `page.tsx` is the page UI, and `layout.tsx` wraps child routes.
2. **All components are Server Components by default** in the App Router. They run on the server and never ship JavaScript to the browser.
3. **Client Components** require the `"use client"` directive. Use them only for interactivity, hooks, and browser APIs. Push them as far down the tree as possible.
4. **Async Server Components** fetch data directly with `await`. No `useEffect`, no loading state management, no client-side fetch calls.
5. **Server Actions** (`"use server"`) handle mutations like form submissions. They run on the server but can be called from Client Components via form `action` or direct invocation.
6. **`loading.tsx` and `error.tsx`** provide automatic Suspense and Error Boundary wrappers for each route segment, matching the patterns from the previous lesson.
7. **The server/client split** keeps sensitive data (API keys, database credentials) on the server while minimizing the JavaScript shipped to the browser.

---

## Try It Yourself

Build a minimal Gather event app with Next.js 14:

1. Create a new Next.js project with the App Router.
2. Build an event listing page (`/events`) as a Server Component. Mock the data with a local array or a JSON file (no real API needed).
3. Build an event detail page (`/events/[id]`) as a Server Component. Use `notFound()` for invalid IDs.
4. Create a Client Component `RSVPButton` with `useState` to track whether the user has RSVP'd.
5. Add `loading.tsx` with a skeleton UI for the events page.
6. Add `error.tsx` with a retry button.
7. Create a `createEvent` Server Action and a form page at `/create` that uses it (just log the form data to the server console).

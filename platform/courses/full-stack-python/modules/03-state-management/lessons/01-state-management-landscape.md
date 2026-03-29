---
title: "The State Management Landscape"
estimatedMinutes: 30
---

# The State Management Landscape

Every React application manages state. A modal is open or closed. A list of events came back from an API. A search input holds whatever the user just typed. A URL query string says which page to show.

But not all state is created equal. The modal toggle and the API data have completely different lifetimes, different update patterns, and different failure modes. Treating them the same way (stuffing everything into one global store, for example) creates applications that are hard to reason about, slow to render, and painful to debug.

In this lesson, you will learn to categorize state by what it represents and where it lives. You will survey the major state management libraries in the React ecosystem. And you will build a decision framework that tells you which tool to reach for based on the problem you are solving. By the end, you will have mapped every piece of state in the Gather event platform to its correct category, setting up the architectural decisions for the rest of this module.

---

## The Four Categories of State

State in a React application falls into four distinct categories. Each one has different characteristics, and recognizing which category a piece of state belongs to is the first step toward choosing the right tool to manage it.

### 1. UI State

UI state controls what the user sees on screen at any given moment. It is local, synchronous, and ephemeral. If the user refreshes the page, losing this state is usually fine.

Examples in Gather:

- Whether the filter sidebar is open or collapsed
- Which modal is currently visible (create event, RSVP confirmation, share link)
- Whether a dropdown menu is expanded
- The active tab on an event detail page (Details, Attendees, Discussion)
- Tooltip visibility

UI state is typically owned by a single component or a small subtree. It rarely needs to be shared across distant parts of the application. `useState` and `useReducer` handle most UI state perfectly well. When UI state needs to be shared across unrelated components (like a global sidebar toggle), a lightweight store works better than prop drilling.

### 2. Server State

Server state is data that lives on a remote server and is fetched into your application. It is the most complex category because it introduces concerns that local state never has:

- **Asynchronous by nature.** Fetching takes time. You need loading and error states.
- **Shared ownership.** The server is the source of truth, not your component. Your local copy can become stale.
- **Caching.** You do not want to re-fetch the same data every time a component mounts.
- **Background updates.** Other users might change the data while you are looking at it.
- **Pagination and infinite loading.** The full dataset may not fit in one response.

Examples in Gather:

- The list of events from the API
- A single event's detail data
- The current user's RSVP list
- Attendee counts
- Search results

Server state is where most applications get into trouble. Developers reach for `useEffect` plus `useState`, build a loading/error/data triple, and end up with dozens of nearly identical data-fetching patterns scattered across components. Dedicated server state libraries (TanStack Query, SWR) exist specifically to solve this problem.

### 3. Form State

Form state tracks user input as they fill out a form: field values, validation errors, touched/dirty status, and submission state. It sits in an interesting middle ground. It is local to the form component, but it can become complex when forms have many fields, cross-field validation, or multi-step flows.

Examples in Gather:

- The "Create Event" form (title, date, location, description, category, capacity)
- The RSVP form (name, email, plus-one count)
- Profile settings (display name, bio, notification preferences)
- Search and filter inputs (these overlap with UI state)

For simple forms (a search bar, a single input), `useState` is enough. For complex forms with validation, libraries like React Hook Form or Formik provide structure. The key insight is that form state is temporary. Once the user submits, the form state is discarded and the result becomes server state.

### 4. URL State

URL state is data encoded in the URL itself: path parameters, query strings, and hash fragments. It is unique because the browser manages it, it survives page refreshes, and it is shareable (you can send someone a link to a filtered view).

Examples in Gather:

- `/events/evt_001` (the event ID is URL state)
- `/events?category=Tech&search=brooklyn` (filters as query params)
- `/events?page=3` (pagination)
- `/events#attendees` (scroll target)

In Next.js 14, URL state is handled by the router (`useSearchParams`, `usePathname`, `useRouter`). You generally do not need a state management library for URL state. The router is the state manager.

---

## The State Management Library Landscape

The React ecosystem has produced many state management libraries. Here is an honest survey of the major options, grouped by what they do well.

### Global Client State (UI State Stores)

**Redux / Redux Toolkit**
Redux was the dominant state management library from 2015 to roughly 2020. It uses a single global store, actions dispatched as plain objects, and reducer functions that return new state. Redux Toolkit (RTK) modernized the API with `createSlice` and `createAsyncThunk`, removing much of the boilerplate.

Redux is still a solid choice for applications with complex client-side state that many components need to read and write. But for most applications, it is overkill. The indirection of actions, reducers, and selectors adds cognitive overhead that simpler tools avoid.

**Zustand**
Zustand (German for "state") is a minimal store library. You define a store with a plain function, read from it with a hook, and update it by calling methods on the store. No providers, no reducers, no action types. It supports middleware (persistence, devtools, immer) and scales well with a slice pattern. Zustand is the best default choice for global UI state in 2026.

**Jotai**
Jotai takes an atomic approach. Instead of one store, you define individual atoms (pieces of state), and components subscribe to only the atoms they need. This gives you fine-grained reactivity without selectors. Jotai is excellent when you have many independent pieces of state that different components consume.

**Recoil**
Recoil was Facebook's experimental atomic state library. It introduced atoms and selectors (derived state). Development has slowed significantly, and for new projects, Jotai is the more actively maintained alternative.

### Server State

**TanStack Query (React Query)**
TanStack Query is purpose-built for server state. It manages caching, background refetching, stale-while-revalidate, optimistic updates, pagination, and infinite scrolling. It replaces the `useEffect` + `useState` data-fetching pattern entirely. If your application fetches data from APIs, TanStack Query should be your first choice.

**SWR**
SWR (stale-while-revalidate) is Vercel's data-fetching library. It is simpler than TanStack Query and covers the most common use cases. TanStack Query has more features (mutations, infinite queries, query invalidation strategies), but SWR is a fine choice for simpler applications.

**RTK Query**
If you are already using Redux Toolkit, RTK Query is its built-in data-fetching layer. It generates hooks from API endpoint definitions. It is powerful but couples your data fetching to Redux.

### Form State

**React Hook Form**
The most popular form library. It uses uncontrolled inputs by default for performance, provides a `useForm` hook with registration, validation, and submission handling. TypeScript support is excellent.

**React Context + useReducer**
For simple forms, a context provider with `useReducer` gives you full control without a library dependency.

---

## The Decision Framework

When you encounter a new piece of state, ask these questions in order:

**1. Does this state come from a server/API?**
Yes: Use TanStack Query (or SWR). Do not manage server data with useState + useEffect.

**2. Does this state belong in the URL?**
Yes: Use Next.js router (useSearchParams, usePathname). Keep filters, pagination, and resource IDs in the URL so they are shareable and bookmarkable.

**3. Is this form input state?**
Yes: Use React Hook Form for complex forms, useState for simple ones.

**4. Does this state need to be shared across distant components?**
Yes: Use Zustand for a small number of shared values, Jotai for many independent atoms.
No: Use useState or useReducer in the component that owns it.

**5. Is this state only used by one component or a parent-child pair?**
Yes: Use useState. Do not over-engineer it.

The framework boils down to one principle: **use the simplest tool that solves the actual problem.** "Just use Redux for everything" made sense when Redux was the only mature option. Today, specialized tools handle each state category better than any single library handles all of them.

---

## Mapping Gather's State

Here is every piece of state in the Gather event platform, categorized:

| State | Category | Tool |
|-------|----------|------|
| Event list from API | Server | TanStack Query |
| Single event detail | Server | TanStack Query |
| RSVP status for current user | Server | TanStack Query (mutation) |
| Attendee count (real-time) | Server + WebSocket | TanStack Query + WebSocket |
| Filter: selected category | UI (shared) | Zustand |
| Filter: date range | UI (shared) | Zustand |
| Filter: search text | UI (shared) | Zustand |
| Sidebar open/closed | UI (shared) | Zustand |
| Active modal | UI (shared) | Zustand |
| Current event ID | URL | Next.js router |
| Current page/offset | URL | Next.js searchParams |
| Active category filter in URL | URL | Next.js searchParams |
| Create Event form fields | Form | React Hook Form or useState |
| RSVP form fields | Form | useState |
| Tooltip visibility | UI (local) | useState |
| Dropdown expanded | UI (local) | useState |

Notice the pattern. Server data goes through TanStack Query. Shared UI state goes through Zustand. URL-representable state goes through the router. Local UI state stays in `useState`. No single library handles everything, and that is the point.

---

## Why "Just Use Redux" Is Outdated

Redux emerged in 2015 when React had no Context API, no hooks, and no built-in way to share state between components. It solved a real problem. But the ecosystem has evolved:

- **React Context** (2018) handles simple shared state without a library.
- **Hooks** (2019) made local state management with `useState` and `useReducer` expressive enough for most UI state.
- **TanStack Query** (2020) proved that server state and client state are fundamentally different and should be managed separately.
- **Zustand, Jotai, and Valtio** (2020-2021) showed that global client state does not require the ceremony of actions, reducers, and middleware.

If you start a new project today and put everything in Redux, you are fighting against the grain. You will write more boilerplate, manage cache invalidation manually, and build loading/error state tracking that TanStack Query gives you for free.

That said, Redux is not dead. Large existing codebases run on it successfully. Redux Toolkit dramatically improved the developer experience. If you join a team using Redux, learn it well. But for new projects, the combination of TanStack Query (server state) + Zustand (client state) + router (URL state) covers more ground with less code.

---

## What You Will Build in This Module

Over the next four lessons and the module project, you will implement Gather's state management layer:

- **Lesson 2**: Build Zustand stores for UI state (filters, sidebar, modals) with TypeScript, middleware, and the slice pattern.
- **Lesson 3**: Replace `useEffect` data fetching with TanStack Query. Build typed query hooks for events, event details, and mutations.
- **Lesson 4**: Implement optimistic updates for RSVP toggling, infinite scrolling for event lists, and cache prefetching on hover.
- **Lesson 5**: Add real-time data with WebSockets, integrate live updates into the TanStack Query cache, and handle reconnection.
- **Project**: Combine everything into a working real-time event feed with filters, optimistic updates, infinite scrolling, and live attendee counts.

Each lesson builds on the previous one. By the end, you will have a state management architecture that handles every category of state with the right tool.

---

## Key Takeaways

1. **State falls into four categories**: UI state, server state, form state, and URL state. Each has different characteristics and different ideal tools.
2. **Server state is the most complex category** because it involves caching, staleness, background updates, and asynchronous loading. Dedicated libraries like TanStack Query handle this far better than manual `useEffect` patterns.
3. **UI state that is shared across distant components** belongs in a lightweight store like Zustand. UI state that is local to one component belongs in `useState`.
4. **URL state is managed by the router.** Filters, pagination, and resource IDs should live in the URL so they are shareable and survive page refreshes.
5. **"Just use Redux for everything" is outdated.** The ecosystem now has specialized tools that handle each state category better than any single library.
6. **The decision framework is simple**: ask what kind of state it is, then pick the simplest tool that solves the problem.
7. **Categorizing state before writing code** saves you from architectural mistakes that are expensive to fix later.

---

## Try It Yourself

1. Open a React project you have built before (or browse one on GitHub). List every piece of state you can find and categorize each one as UI, server, form, or URL state.
2. For each piece of server state, check whether it is managed with `useEffect` + `useState`. Note how many lines of loading/error handling code each one requires.
3. Identify any state that is prop-drilled through more than two levels. Would a Zustand store or React Context simplify it?
4. Look at the URL. Is there state that could live in query parameters (filters, sort order, active tab) but currently lives in component state? What would you gain by moving it to the URL?
5. Find a form in the project. Is its state managed with controlled inputs and `useState`? Count the number of `onChange` handlers. Would React Hook Form reduce the boilerplate?
6. Draw a rough state architecture diagram for the project, showing which tool manages each category. Compare it to the Gather mapping table above.
7. If the project uses Redux, identify which pieces of Redux state are actually server state that TanStack Query could manage instead.

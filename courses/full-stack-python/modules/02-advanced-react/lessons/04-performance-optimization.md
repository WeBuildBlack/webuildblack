---
title: "Performance Optimization"
estimatedMinutes: 40
---

# Performance Optimization

React is fast by default. The virtual DOM diffing algorithm, batched updates, and efficient reconciliation handle most applications without any manual tuning. But "most" is not "all." When you have a list of 500 event cards, a complex admin dashboard, or a real-time attendee counter, understanding *why* components re-render and *how* to prevent unnecessary work becomes essential.

This lesson covers React's re-render model, profiling tools, memoization techniques, and code splitting. Every optimization includes a Gather-specific example so you can see the pattern in context.

---

## When and Why Components Re-Render

A React component re-renders in three situations:

1. **Its state changes.** Calling `setState` or a state setter from `useState` triggers a re-render.
2. **Its parent re-renders.** When a parent re-renders, all of its children re-render by default, regardless of whether their props changed.
3. **A Context it consumes changes.** When a Context provider's value changes, every component that calls `useContext` for that Context re-renders.

This is the critical insight: **React does not check whether props have actually changed before re-rendering children.** If the parent renders, the child renders. Full stop.

Here is a concrete example from Gather:

```tsx
function EventPage() {
  const [rsvpCount, setRsvpCount] = useState(0);

  return (
    <div>
      <EventHeader title="Brooklyn Tech Meetup" />
      <EventDescription description="Join us for an evening of..." />
      <RSVPButton
        count={rsvpCount}
        onRSVP={() => setRsvpCount((c) => c + 1)}
      />
    </div>
  );
}
```

When someone clicks the RSVP button, `rsvpCount` changes, and `EventPage` re-renders. This causes `EventHeader` and `EventDescription` to re-render too, even though their props have not changed. For simple components, this is fine. React's diffing is fast. But if `EventDescription` renders complex markdown or `EventHeader` includes an animated SVG, those re-renders add up.

---

## React DevTools Profiler

Before optimizing anything, measure. The React DevTools Profiler shows you exactly which components rendered, how long each render took, and why it happened.

**Setup:**
1. Install the React DevTools browser extension (Chrome or Firefox)
2. Open DevTools and navigate to the "Profiler" tab
3. Click the record button, interact with your app, then stop recording

**What to look for:**
- **Flame chart:** Shows each component as a bar. Gray bars did not render. Colored bars rendered. Brighter colors mean longer render times.
- **"Why did this render?" toggle:** Enable this in the Profiler settings. It shows whether a component rendered because of state change, parent render, or context change.
- **Ranked chart:** Sorts components by render duration. Start optimization with the slowest renderers.

**Practical workflow for Gather:**

1. Open the event listing page with 50+ events
2. Start profiling
3. Type in the search box (this triggers re-renders)
4. Stop profiling
5. Look for event cards that re-rendered unnecessarily (they did not change, but the parent did)

Only optimize what the profiler tells you is slow. Premature optimization creates complexity without benefit.

---

## React.memo

`React.memo` is a higher-order component that tells React: "Only re-render this component if its props have actually changed." It wraps a component and adds a shallow comparison of props before each render.

```tsx
interface EventCardProps {
  event: GatherEvent;
  onSelect: (id: string) => void;
}

const EventCard = memo(function EventCard({ event, onSelect }: EventCardProps) {
  console.log(`Rendering EventCard: ${event.title}`);

  return (
    <div className="event-card" onClick={() => onSelect(event.id)}>
      <img src={event.coverImage} alt={event.title} />
      <h3>{event.title}</h3>
      <p>{event.date}</p>
      <span>{event.attendeeCount} attending</span>
    </div>
  );
});
```

Now, when the parent re-renders, `EventCard` will only re-render if the `event` or `onSelect` prop is a different reference.

**When to use `React.memo`:**
- Components that render frequently but rarely change (list items, table rows)
- Components with expensive rendering (complex SVGs, markdown rendering, large DOM trees)
- Components low in the tree that are re-rendered because of parent state changes they do not care about

**When NOT to use `React.memo`:**
- Components that almost always receive new props on every render (the comparison cost is wasted)
- Simple, lightweight components (the overhead of comparison exceeds the cost of re-rendering)
- Components that render differently every time anyway

**The shallow comparison trap:** `React.memo` does a shallow equality check. For primitive props (strings, numbers, booleans), this works perfectly. For objects, arrays, and functions, it compares *references*, not values. A new object `{ name: "test" }` created on every render will always be a different reference, defeating `React.memo` entirely.

---

## useMemo for Expensive Computations

`useMemo` caches the result of a computation and only recalculates when its dependencies change.

Here is a Gather example: filtering and sorting a large event list.

```tsx
function EventList({ events, searchQuery, sortBy }: EventListProps) {
  // Without useMemo  --  runs on every render
  const filteredAndSorted = events
    .filter((e) => e.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "date") return a.date.localeCompare(b.date);
      return b.attendeeCount - a.attendeeCount;
    });

  return (
    <div>
      {filteredAndSorted.map((event) => (
        <EventCard key={event.id} event={event} onSelect={handleSelect} />
      ))}
    </div>
  );
}
```

If this component re-renders because of an unrelated state change (like a modal opening), it re-filters and re-sorts the entire list for no reason. With 500 events, that is noticeable.

```tsx
function EventList({ events, searchQuery, sortBy }: EventListProps) {
  const filteredAndSorted = useMemo(() => {
    return events
      .filter((e) => e.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === "date") return a.date.localeCompare(b.date);
        return b.attendeeCount - a.attendeeCount;
      });
  }, [events, searchQuery, sortBy]);

  return (
    <div>
      {filteredAndSorted.map((event) => (
        <EventCard key={event.id} event={event} onSelect={handleSelect} />
      ))}
    </div>
  );
}
```

Now the filtering and sorting only rerun when `events`, `searchQuery`, or `sortBy` actually change. If the component re-renders for other reasons, the cached result is reused.

**When to use `useMemo`:**
- Filtering, sorting, or transforming large arrays
- Computing derived data from props or state
- Creating objects that are passed to memoized children (to maintain reference stability)

**When to skip it:**
- Simple calculations (adding two numbers, string concatenation)
- Values that change on every render anyway
- When you have not measured a performance problem

---

## useCallback for Stable Function References

`useCallback` returns a memoized version of a callback function that only changes when its dependencies change. Its primary use is maintaining stable references for functions passed to memoized children.

Remember the `EventCard` wrapped in `React.memo`? There is a subtle problem:

```tsx
function EventList({ events }: { events: GatherEvent[] }) {
  // This creates a new function on every render
  const handleSelect = (id: string) => {
    console.log("Selected event:", id);
  };

  return (
    <div>
      {events.map((event) => (
        // React.memo is useless here  --  `onSelect` is a new reference every time
        <EventCard key={event.id} event={event} onSelect={handleSelect} />
      ))}
    </div>
  );
}
```

Every time `EventList` renders, it creates a new `handleSelect` function. Even though the function does the same thing, it is a different object in memory. `React.memo` sees a new `onSelect` reference and re-renders every card.

The fix:

```tsx
function EventList({ events }: { events: GatherEvent[] }) {
  const handleSelect = useCallback((id: string) => {
    console.log("Selected event:", id);
  }, []); // Empty deps  --  this function never changes

  return (
    <div>
      {events.map((event) => (
        <EventCard key={event.id} event={event} onSelect={handleSelect} />
      ))}
    </div>
  );
}
```

Now `handleSelect` is the same reference across renders (unless dependencies change), and `React.memo` can properly skip re-renders.

**The relationship between `React.memo`, `useMemo`, and `useCallback`:**

| Tool | Caches | Purpose |
|------|--------|---------|
| `React.memo` | Component render output | Skip re-rendering when props have not changed |
| `useMemo` | Computed value | Skip expensive recalculations |
| `useCallback` | Function reference | Keep function identity stable for memoized children |

These three tools work as a system. `React.memo` on the child is pointless without `useCallback` on the function props and `useMemo` on the object props passed to it.

---

## Code Splitting with React.lazy

Code splitting breaks your app into smaller JavaScript bundles that load on demand. Instead of shipping your entire app in one bundle (including the admin panel that 99% of users never see), you load each section only when the user navigates to it.

`React.lazy` handles this with dynamic imports:

```tsx
import { lazy, Suspense } from "react";

// These components are split into separate bundles
const AdminPanel = lazy(() => import("./admin/AdminPanel"));
const EventAnalytics = lazy(() => import("./analytics/EventAnalytics"));

function GatherApp() {
  const { user } = useAuth();

  return (
    <div>
      <EventList />

      {user?.isAdmin && (
        <Suspense fallback={<LoadingSpinner label="Loading admin panel..." />}>
          <AdminPanel />
        </Suspense>
      )}

      <Suspense fallback={<div>Loading analytics...</div>}>
        <EventAnalytics />
      </Suspense>
    </div>
  );
}
```

**How it works:**
1. `import("./admin/AdminPanel")` tells the bundler (Webpack, Vite) to put `AdminPanel` in a separate file
2. `React.lazy` wraps the dynamic import so React knows it is asynchronous
3. When the component is first rendered, React loads the bundle and shows the `Suspense` fallback while waiting
4. Once loaded, the component renders normally. Subsequent renders use the cached module.

**Route-level code splitting** is the most impactful pattern. Each page is a separate bundle:

```tsx
import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

const HomePage = lazy(() => import("./pages/HomePage"));
const EventDetailPage = lazy(() => import("./pages/EventDetailPage"));
const CreateEventPage = lazy(() => import("./pages/CreateEventPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoadingIndicator />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/events/new" element={<CreateEventPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </Suspense>
  );
}
```

Users who only browse events never download the code for creating events or viewing profiles. This reduces the initial bundle size significantly.

---

## List Virtualization

When rendering very long lists (hundreds or thousands of items), the DOM itself becomes the bottleneck. Each DOM node uses memory and slows down layout calculations, even if the element is scrolled off-screen.

Virtualization renders only the items currently visible in the viewport, plus a small buffer above and below. As the user scrolls, items enter and leave the rendered set.

The `@tanstack/react-virtual` library handles this:

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

function VirtualizedEventList({ events }: { events: GatherEvent[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // estimated height of each event card in pixels
  });

  return (
    <div
      ref={parentRef}
      className="event-list-scroll"
      style={{ height: "600px", overflow: "auto" }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const event = events[virtualItem.index];
          return (
            <div
              key={event.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <EventCard event={event} onSelect={handleSelect} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

With 1,000 events, the DOM contains roughly 10-15 event cards at any time instead of 1,000. Scrolling remains smooth because only a few elements are created and destroyed as the user scrolls.

**When to virtualize:**
- Lists with 100+ items
- Lists where each item has complex DOM (images, buttons, badges)
- Infinite scroll implementations

**When not to virtualize:**
- Short lists (under 50 items). The overhead is not worth it.
- Lists where users need to Ctrl+F search the page content (virtualized items not in the DOM will not match browser search)

---

## Optimization Decision Checklist

Before reaching for any optimization tool, run through this checklist:

1. **Is there actually a performance problem?** Use the React DevTools Profiler. If renders are under 16ms, users will not notice.
2. **Can you restructure the component tree?** Moving state closer to where it is used often eliminates unnecessary re-renders without any memoization.
3. **Is `React.memo` appropriate?** Only if the component re-renders often with the same props and the render is expensive.
4. **Are you memoizing the right things?** `React.memo` on a child is pointless if you are passing new object or function references from the parent on every render.
5. **Is code splitting worth the added complexity?** For routes and large features, almost always yes. For small components, usually no.
6. **Is virtualization needed?** Only for genuinely long lists. Measure first.

The best optimization is often the simplest: restructure your components so state changes affect fewer parts of the tree.

---

## Key Takeaways

1. **React re-renders all children** when a parent re-renders, regardless of whether props changed. This is the root cause of most unnecessary renders.
2. **Use the React DevTools Profiler** before optimizing anything. Measure, identify bottlenecks, then optimize. Never guess.
3. **`React.memo`** wraps a component to skip re-renders when props have not changed (shallow comparison). Use it for expensive components that render frequently with stable props.
4. **`useMemo`** caches computed values and recalculates only when dependencies change. Use it for expensive filtering, sorting, or derived data.
5. **`useCallback`** caches function references. Pair it with `React.memo` on children to prevent unnecessary re-renders caused by new function references.
6. **Code splitting with `React.lazy`** loads components on demand, reducing the initial bundle size. Route-level splitting gives the biggest wins.
7. **List virtualization** renders only visible items in long lists, keeping the DOM small and scrolling smooth. Use `@tanstack/react-virtual` for implementation.

---

## Try It Yourself

Take the Gather event listing page and optimize it:

1. Wrap `EventCard` in `React.memo`. Add a `console.log` to confirm it stops re-rendering when the parent re-renders but props are unchanged.
2. Use `useMemo` to cache the filtered and sorted event list so it only recalculates when the search query or sort order changes.
3. Use `useCallback` for the `onSelect` handler passed to each `EventCard`.
4. Add route-level code splitting: lazy-load the event creation page and the admin dashboard. Wrap them in `Suspense` with appropriate loading fallbacks.
5. Profile the before and after with React DevTools. Note the difference in render count and duration.

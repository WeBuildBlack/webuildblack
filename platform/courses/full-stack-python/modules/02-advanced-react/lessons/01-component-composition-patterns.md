---
title: "Component Composition Patterns"
estimatedMinutes: 35
---

# Component Composition Patterns

As your React applications grow, you will inevitably face a question: how do you share data and behavior between components without creating a tangled mess? In this lesson, we will look at the problem of prop drilling, explore composition as a solution, and build real patterns you will use throughout the Gather event platform.

By the end of this lesson, you will understand why composition beats configuration, how to use children and slot patterns effectively, and how to separate data-fetching logic from presentation.

---

## The Prop Drilling Problem

Prop drilling happens when you pass data through multiple layers of components that do not actually need it. They are just middlemen, forwarding props along to a deeply nested child.

Here is a common scenario in Gather. You fetch the current user at the top level, and four components deep, the `RSVPButton` needs to know who is logged in:

```tsx
// App.tsx
function App() {
  const [user, setUser] = useState<User | null>(null);

  return <EventPage user={user} />;
}

// EventPage.tsx  --  does not use `user`, just passes it along
function EventPage({ user }: { user: User | null }) {
  return (
    <div className="event-page">
      <EventHeader />
      <EventDetails user={user} />
    </div>
  );
}

// EventDetails.tsx  --  also does not use `user`, just passes it along
function EventDetails({ user }: { user: User | null }) {
  return (
    <div className="event-details">
      <EventDescription />
      <RSVPSection user={user} />
    </div>
  );
}

// RSVPSection.tsx  --  finally uses `user`
function RSVPSection({ user }: { user: User | null }) {
  return (
    <div>
      {user ? (
        <button>RSVP as {user.name}</button>
      ) : (
        <button>Sign in to RSVP</button>
      )}
    </div>
  );
}
```

The `EventPage` and `EventDetails` components have no business knowing about `user`. They are just courier services. This creates several problems:

1. **Tight coupling.** Every component in the chain depends on the `user` prop, even if it never reads it.
2. **Refactoring pain.** Renaming or restructuring the `user` type means updating every intermediate component.
3. **Testing difficulty.** You cannot render `EventPage` in a test without also providing a `user` prop it does not care about.
4. **Readability.** New developers reading `EventPage` see a `user` prop and wonder, "Where is this used here?" The answer: nowhere.

Composition patterns solve this by restructuring *how* components relate to each other, rather than adding more props.

---

## Children as Composition

The simplest composition tool in React is `children`. Instead of configuring a component through props, you compose it by wrapping content inside it.

Consider a `Card` component for Gather. The configuration approach looks like this:

```tsx
// Configuration approach  --  rigid
interface CardProps {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  body: string;
  footer?: React.ReactNode;
}

function Card({ title, subtitle, imageUrl, body, footer }: CardProps) {
  return (
    <div className="card">
      {imageUrl && <img src={imageUrl} alt="" />}
      <h3>{title}</h3>
      {subtitle && <p className="subtitle">{subtitle}</p>}
      <p>{body}</p>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}
```

Every new layout variation requires a new prop. Want to add a badge? Add a `badge` prop. Want an action menu? Add an `actions` prop. The prop list grows endlessly.

The composition approach is more flexible:

```tsx
// Composition approach  --  flexible
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

function Card({ children, className = "" }: CardProps) {
  return <div className={`card ${className}`}>{children}</div>;
}

// Usage  --  the consumer controls the layout
function EventCard({ event }: { event: GatherEvent }) {
  return (
    <Card>
      <img src={event.coverImage} alt={event.title} />
      <h3>{event.title}</h3>
      <p className="subtitle">{event.date}</p>
      <p>{event.description}</p>
      <div className="card-footer">
        <span>{event.attendeeCount} attending</span>
        <RSVPButton eventId={event.id} />
      </div>
    </Card>
  );
}
```

The `Card` component does not need to know what an event is. It provides styling and structure. The consumer provides the content. This is the core idea of composition: **the parent controls what goes inside, the child controls how it is rendered.**

---

## The Slot Pattern

Sometimes `children` is not enough. You need multiple "slots" where content can go. The slot pattern uses named props to accept `React.ReactNode` values for different areas of a component.

Here is an `EventLayout` for Gather with header, body, and footer slots:

```tsx
interface EventLayoutProps {
  header: React.ReactNode;
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
}

function EventLayout({ header, children, sidebar, footer }: EventLayoutProps) {
  return (
    <div className="event-layout">
      <header className="event-layout__header">{header}</header>
      <div className="event-layout__body">
        <main className="event-layout__content">{children}</main>
        {sidebar && (
          <aside className="event-layout__sidebar">{sidebar}</aside>
        )}
      </div>
      {footer && (
        <footer className="event-layout__footer">{footer}</footer>
      )}
    </div>
  );
}
```

Now the event detail page can fill these slots with whatever it needs:

```tsx
function EventDetailPage({ event }: { event: GatherEvent }) {
  return (
    <EventLayout
      header={
        <div>
          <h1>{event.title}</h1>
          <p>Hosted by {event.organizer.name}</p>
        </div>
      }
      sidebar={
        <div>
          <RSVPButton eventId={event.id} />
          <EventDateWidget date={event.date} />
          <EventLocationMap location={event.location} />
        </div>
      }
      footer={
        <div>
          <ShareButtons url={event.url} />
          <ReportLink eventId={event.id} />
        </div>
      }
    >
      <EventDescription description={event.description} />
      <AttendeeList attendees={event.attendees} />
    </EventLayout>
  );
}
```

The `EventLayout` handles the grid/flex layout, responsive behavior, and spacing. The page component decides what content goes where. Neither component needs to know about the other's internals.

**When to use slots vs. children:**

| Situation | Use |
|---|---|
| Single content area | `children` |
| Multiple distinct areas | Slot props (`header`, `footer`, etc.) |
| Content order matters for layout | Slot props |
| Wrapper/decorator pattern | `children` |

---

## Inversion of Control

Inversion of control (IoC) is a design principle where a component gives its consumer control over behavior that it would normally handle internally. Instead of the component making decisions, it exposes hooks for the consumer to make decisions.

Here is a practical example. A `SortableList` component could sort items internally:

```tsx
// Without IoC  --  the component controls sorting
function SortableList({ items }: { items: GatherEvent[] }) {
  const [sortBy, setSortBy] = useState<"date" | "name">("date");

  const sorted = [...items].sort((a, b) => {
    if (sortBy === "date") return a.date.localeCompare(b.date);
    return a.title.localeCompare(b.title);
  });

  return (
    <div>
      <select onChange={(e) => setSortBy(e.target.value as "date" | "name")}>
        <option value="date">By Date</option>
        <option value="name">By Name</option>
      </select>
      {sorted.map((item) => (
        <EventCard key={item.id} event={item} />
      ))}
    </div>
  );
}
```

This only works for events sorted by date or name. What about sorting by attendee count? By distance? The component cannot handle every case.

With IoC, the consumer provides the sort logic and the render logic:

```tsx
interface SortableListProps<T> {
  items: T[];
  sortOptions: { label: string; compareFn: (a: T, b: T) => number }[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

function SortableList<T>({
  items,
  sortOptions,
  renderItem,
  keyExtractor,
}: SortableListProps<T>) {
  const [sortIndex, setSortIndex] = useState(0);

  const sorted = [...items].sort(sortOptions[sortIndex].compareFn);

  return (
    <div>
      <select onChange={(e) => setSortIndex(Number(e.target.value))}>
        {sortOptions.map((option, i) => (
          <option key={option.label} value={i}>
            {option.label}
          </option>
        ))}
      </select>
      {sorted.map((item) => (
        <div key={keyExtractor(item)}>{renderItem(item)}</div>
      ))}
    </div>
  );
}
```

Now it works with any data type, any sort criteria, and any rendering:

```tsx
<SortableList
  items={events}
  sortOptions={[
    { label: "Soonest", compareFn: (a, b) => a.date.localeCompare(b.date) },
    { label: "Most Popular", compareFn: (a, b) => b.attendeeCount - a.attendeeCount },
  ]}
  renderItem={(event) => <EventCard event={event} />}
  keyExtractor={(event) => event.id}
/>
```

The component manages the sorting state and UI. The consumer controls *what* gets sorted, *how* it gets sorted, and *how* items render.

---

## Container / Presentational Split

This classic pattern separates components into two roles:

- **Container components** handle data fetching, state management, and business logic. They know *where* data comes from.
- **Presentational components** handle rendering and styling. They know *how* things look. They receive data as props and have no side effects.

Here is the pattern applied to Gather's event listing:

```tsx
// Presentational  --  knows nothing about APIs or state management
interface EventGridProps {
  events: GatherEvent[];
  isLoading: boolean;
  onEventClick: (eventId: string) => void;
}

function EventGrid({ events, isLoading, onEventClick }: EventGridProps) {
  if (isLoading) {
    return <div className="skeleton-grid">{/* skeleton cards */}</div>;
  }

  if (events.length === 0) {
    return <p>No events found. Check back soon.</p>;
  }

  return (
    <div className="event-grid">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          onClick={() => onEventClick(event.id)}
        />
      ))}
    </div>
  );
}
```

```tsx
// Container  --  handles data fetching and navigation
function EventListContainer() {
  const [events, setEvents] = useState<GatherEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchEvents() {
      try {
        const response = await fetch("/api/events");
        const data: GatherEvent[] = await response.json();
        setEvents(data);
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEvents();
  }, []);

  const handleEventClick = (eventId: string) => {
    navigate(`/events/${eventId}`);
  };

  return (
    <EventGrid
      events={events}
      isLoading={isLoading}
      onEventClick={handleEventClick}
    />
  );
}
```

The benefits are immediate:

- **`EventGrid` is easy to test.** Pass it an array of events and assert on the output. No mocking APIs.
- **`EventGrid` is reusable.** Use it on the homepage, a search results page, or a user's "my events" page. The data source does not matter.
- **`EventListContainer` is swappable.** Fetch from a different API, add caching, or use a state management library. The grid does not change.

With modern React, you will often use custom hooks instead of container components for data fetching. But the principle remains the same: separate what data you need from how you display it.

---

## Solving the Prop Drilling Problem with Composition

Let us revisit the prop drilling example from the beginning. Instead of threading `user` through four layers, restructure the component tree so the parent passes `user` directly to the component that needs it:

```tsx
function App() {
  const [user, setUser] = useState<User | null>(null);

  return (
    <EventPage>
      <EventHeader />
      <EventDetails>
        <EventDescription />
        <RSVPSection user={user} />
      </EventDetails>
    </EventPage>
  );
}

function EventPage({ children }: { children: React.ReactNode }) {
  return <div className="event-page">{children}</div>;
}

function EventDetails({ children }: { children: React.ReactNode }) {
  return <div className="event-details">{children}</div>;
}
```

Now `EventPage` and `EventDetails` never see the `user` prop. The `App` component passes `user` directly to `RSVPSection`. The intermediate components just provide layout through `children`.

This does not solve every prop drilling scenario (sometimes the data truly originates deep in the tree, or many distant components need the same data). For those cases, you will reach for React Context, which we will cover in the compound components lesson. But composition should always be your first attempt.

---

## Key Takeaways

1. **Prop drilling** creates tight coupling between components that do not use the data they pass along. Composition patterns reduce this coupling.
2. **`children` is your simplest composition tool.** Use it when a component wraps a single content area without needing to know what that content is.
3. **The slot pattern** (named `React.ReactNode` props) extends composition to multiple content areas, giving the consumer control over header, sidebar, footer, and other sections.
4. **Inversion of control** means giving the consumer decision-making power through callbacks, render functions, and configuration props, rather than hardcoding behavior.
5. **Container/presentational split** separates data fetching from rendering, making presentational components easy to test, reuse, and understand.
6. **Composition over configuration** is a guiding principle. Prefer components that accept `children` or slots over components with ever-growing prop lists.
7. **Restructuring the component tree** can eliminate prop drilling entirely, without adding new abstractions or state management libraries.

---

## Try It Yourself

Build a `PageLayout` component for Gather with the following slots: `navbar`, `hero`, `children` (main content), and `footer`. Then create two pages that use it:

1. A **homepage** with a large hero banner, event highlights in the main area, and a footer with social links.
2. An **event detail page** with a smaller hero (event cover image), event info in the main area, and a footer with share buttons.

Both pages should use the same `PageLayout` but look completely different based on what they pass into each slot. The `PageLayout` itself should handle responsive layout (stack on mobile, grid on desktop) without knowing anything about events or homepages.

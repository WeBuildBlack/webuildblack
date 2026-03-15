---
title: "Render Props and Higher-Order Components"
estimatedMinutes: 35
---

# Render Props and Higher-Order Components

Before hooks existed, React developers needed ways to share stateful logic between components. Two patterns emerged: render props and higher-order components (HOCs). Both are still used today in specific situations, and understanding them is essential for reading library code, maintaining legacy codebases, and recognizing when they are genuinely the right tool.

In this lesson, you will build both patterns from scratch using Gather examples, learn how TypeScript makes them safer, and understand when hooks have replaced them (and when they have not).

---

## The Render Prop Pattern

A render prop is a function prop that a component uses to determine what to render. Instead of hardcoding JSX inside a component, you pass a function that returns JSX, and the component calls that function with its internal state.

Here is the classic example: a component that tracks mouse position.

```tsx
interface MousePosition {
  x: number;
  y: number;
}

interface MouseTrackerProps {
  render: (position: MousePosition) => React.ReactNode;
}

function MouseTracker({ render }: MouseTrackerProps) {
  const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0 });

  const handleMouseMove = (event: React.MouseEvent) => {
    setPosition({ x: event.clientX, y: event.clientY });
  };

  return (
    <div onMouseMove={handleMouseMove} style={{ height: "100vh" }}>
      {render(position)}
    </div>
  );
}
```

The consumer decides what to do with the mouse coordinates:

```tsx
// Show coordinates as text
<MouseTracker
  render={({ x, y }) => (
    <p>Mouse is at ({x}, {y})</p>
  )}
/>

// Move an element to follow the cursor
<MouseTracker
  render={({ x, y }) => (
    <div
      style={{
        position: "absolute",
        left: x - 10,
        top: y - 10,
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: "#7D4E21",
      }}
    />
  )}
/>
```

The `MouseTracker` component manages the state. The consumer controls the rendering. This is inversion of control applied to rendering.

### Function as Child (Children Render Prop)

A common variation uses `children` as the render function instead of a named prop:

```tsx
interface MouseTrackerProps {
  children: (position: MousePosition) => React.ReactNode;
}

function MouseTracker({ children }: MouseTrackerProps) {
  const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0 });

  const handleMouseMove = (event: React.MouseEvent) => {
    setPosition({ x: event.clientX, y: event.clientY });
  };

  return (
    <div onMouseMove={handleMouseMove} style={{ height: "100vh" }}>
      {children(position)}
    </div>
  );
}

// Usage
<MouseTracker>
  {({ x, y }) => <p>Mouse: ({x}, {y})</p>}
</MouseTracker>
```

Both approaches work. The `children` variant reads more naturally in JSX but can confuse developers who expect `children` to be regular React nodes.

---

## Building a Data Fetcher Render Prop

Let us build something practical for Gather: a generic `DataFetcher` component that handles loading, error, and success states.

```tsx
interface DataFetcherState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

interface DataFetcherProps<T> {
  url: string;
  children: (state: DataFetcherState<T>) => React.ReactNode;
}

function DataFetcher<T>({ url, children }: DataFetcherProps<T>) {
  const [state, setState] = useState<DataFetcherState<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setState({ data: null, isLoading: true, error: null });

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data: T = await response.json();

        if (!cancelled) {
          setState({ data, isLoading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Unknown error";
          setState({ data: null, isLoading: false, error: message });
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return <>{children(state)}</>;
}
```

Now you can use it for any API endpoint in Gather:

```tsx
<DataFetcher<GatherEvent[]> url="/api/events">
  {({ data, isLoading, error }) => {
    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={error} />;
    if (!data) return null;

    return (
      <div className="event-grid">
        {data.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    );
  }}
</DataFetcher>
```

Notice the TypeScript generic `<T>`. When you write `DataFetcher<GatherEvent[]>`, the `data` inside the render function is typed as `GatherEvent[] | null`. The consumer gets full type safety without any type assertions.

---

## The Higher-Order Component Pattern

A higher-order component (HOC) is a function that takes a component and returns a new, enhanced component. The HOC wraps the original component with additional behavior, like authentication checks, logging, or data injection.

Here is the syntax:

```typescript
function withSomething<P>(WrappedComponent: React.ComponentType<P>): React.FC<Omit<P, "something">>
```

That type signature is dense. Let us break it down by building a real example: a `withAuth` HOC that protects Gather pages requiring authentication.

```tsx
interface User {
  id: string;
  name: string;
  email: string;
}

// The HOC injects a `user` prop into the wrapped component
interface WithAuthProps {
  user: User;
}

function withAuth<P extends WithAuthProps>(
  WrappedComponent: React.ComponentType<P>
) {
  // The returned component accepts all of P's props EXCEPT `user`
  type OuterProps = Omit<P, keyof WithAuthProps>;

  function AuthenticatedComponent(props: OuterProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      async function checkAuth() {
        try {
          const response = await fetch("/api/auth/me");
          if (response.ok) {
            const userData: User = await response.json();
            setUser(userData);
          }
        } catch {
          // Not authenticated
        } finally {
          setIsLoading(false);
        }
      }

      checkAuth();
    }, []);

    if (isLoading) {
      return <LoadingSpinner />;
    }

    if (!user) {
      return <LoginPrompt message="Sign in to access this page" />;
    }

    // Cast is needed because TypeScript cannot verify the full prop intersection
    return <WrappedComponent {...(props as unknown as P)} user={user} />;
  }

  // Preserve the display name for React DevTools
  const wrappedName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";
  AuthenticatedComponent.displayName = `withAuth(${wrappedName})`;

  return AuthenticatedComponent;
}
```

Using the HOC:

```tsx
interface EventDashboardProps {
  user: User;
}

function EventDashboard({ user }: EventDashboardProps) {
  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p>Your upcoming events:</p>
      {/* Dashboard content */}
    </div>
  );
}

// Wrap the component  --  the exported version handles auth automatically
const ProtectedEventDashboard = withAuth(EventDashboard);

// Usage  --  no need to pass `user`, the HOC provides it
function App() {
  return <ProtectedEventDashboard />;
}
```

The `ProtectedEventDashboard` component checks authentication, shows a loading state, redirects unauthenticated users, and injects the `user` prop. The original `EventDashboard` stays simple and focused on rendering.

---

## Composing Multiple HOCs

HOCs can be stacked, but this is where they start getting unwieldy:

```tsx
interface EventAdminPageProps {
  user: User;
  theme: Theme;
  analytics: AnalyticsTracker;
}

function EventAdminPage({ user, theme, analytics }: EventAdminPageProps) {
  // Page content
  return <div>Admin page for {user.name}</div>;
}

// Stacking HOCs  --  each wraps the previous result
const EnhancedEventAdminPage = withAnalytics(
  withTheme(
    withAuth(EventAdminPage)
  )
);
```

This works, but it creates several problems:

- **Prop origin is unclear.** Where does `theme` come from? You have to trace through the HOC chain.
- **Name collisions.** If two HOCs inject a prop with the same name, one silently overwrites the other.
- **TypeScript complexity.** The generic types compound with each wrapper, making error messages cryptic.
- **Debugging.** React DevTools shows a deep nesting of wrapper components.

---

## When Hooks Replaced These Patterns

React 16.8 introduced hooks, which solve the same problem (sharing stateful logic) with a simpler API. The `DataFetcher` render prop becomes a `useFetch` hook:

```tsx
function useFetch<T>(url: string): DataFetcherState<T> {
  const [state, setState] = useState<DataFetcherState<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setState({ data: null, isLoading: true, error: null });

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data: T = await response.json();
        if (!cancelled) {
          setState({ data, isLoading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Unknown error";
          setState({ data: null, isLoading: false, error: message });
        }
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [url]);

  return state;
}

// Usage  --  clean and straightforward
function EventList() {
  const { data: events, isLoading, error } = useFetch<GatherEvent[]>("/api/events");

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!events) return null;

  return (
    <div className="event-grid">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
```

The `withAuth` HOC becomes a `useAuth` hook:

```tsx
function useAuth(): { user: User | null; isLoading: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data))
      .finally(() => setIsLoading(false));
  }, []);

  return { user, isLoading };
}

function EventDashboard() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!user) return <LoginPrompt />;

  return <h1>Welcome, {user.name}</h1>;
}
```

Hooks are simpler, composable without nesting, and TypeScript-friendly. For most new code, hooks are the right choice.

---

## When Render Props and HOCs Still Make Sense

Despite hooks, these older patterns remain valuable in specific situations:

**Render props are useful when:**
- You are building a library component that needs to give consumers rendering control (tooltips, popovers, dropdown menus)
- The shared logic involves rendering a wrapper element (like the `MouseTracker`'s `<div onMouseMove>`)
- You want to share logic in class components that cannot use hooks

**HOCs are useful when:**
- You need to wrap a component at the module level (route guards, page-level authentication)
- You are working with libraries that expect HOCs (some older routing or state management libraries)
- You need to modify the component tree structure (adding error boundaries, wrapping with providers)

**A helpful rule:** If the shared logic is *stateful behavior*, use a hook. If the shared logic involves *wrapping JSX structure*, render props or HOCs may still be the cleaner choice.

---

## TypeScript Tips for These Patterns

Typing render props and HOCs correctly is one of the harder parts of TypeScript with React. Here are the key patterns:

**Generic render props** use a type parameter on the component:

```tsx
// The generic flows from the component to the render function
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
}

function List<T>({ items, renderItem }: ListProps<T>) {
  return <ul>{items.map((item, i) => <li key={i}>{renderItem(item, i)}</li>)}</ul>;
}

// TypeScript infers T from the `items` prop
<List
  items={events}
  renderItem={(event) => <span>{event.title}</span>}  // event is GatherEvent
/>
```

**HOC type constraints** use `extends` to require specific props:

```tsx
// P must include WithAuthProps  --  the HOC will provide them
function withAuth<P extends WithAuthProps>(
  Component: React.ComponentType<P>
): React.FC<Omit<P, keyof WithAuthProps>> {
  // ...
}
```

**Forwarding refs through HOCs** requires `React.forwardRef`:

```tsx
function withTooltip<P extends object>(WrappedComponent: React.ComponentType<P>) {
  const WithTooltipComponent = React.forwardRef<HTMLDivElement, P & { tooltip: string }>(
    ({ tooltip, ...props }, ref) => (
      <div ref={ref} title={tooltip}>
        <WrappedComponent {...(props as unknown as P)} />
      </div>
    )
  );

  WithTooltipComponent.displayName = `withTooltip(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return WithTooltipComponent;
}
```

---

## Key Takeaways

1. **Render props** let a component delegate rendering to its consumer by accepting a function that returns JSX. The component provides data, the consumer provides the UI.
2. **Function-as-child** is a variant of render props that uses `children` as the render function, reading naturally in JSX.
3. **Higher-order components** wrap a component to inject props or behavior. They are functions that take a component and return an enhanced component.
4. **HOCs can be composed** by stacking them, but deep nesting causes readability, debugging, and type safety problems.
5. **Hooks replaced most uses** of render props and HOCs by providing a simpler way to share stateful logic without wrapper components or function-as-child patterns.
6. **Render props still shine** for library components that need to give consumers rendering control, and for logic that inherently involves wrapping JSX elements.
7. **TypeScript generics** make both patterns type-safe. Use `<T>` on render prop components and `extends` constraints on HOC type parameters.

---

## Try It Yourself

Build two things for Gather:

1. A `<Toggleable>` render prop component that manages open/close state. It should call its `children` function with `{ isOpen: boolean, toggle: () => void }`. Use it to build a collapsible event description and a modal trigger, both from the same `Toggleable` component.

2. A `withLogging` HOC that logs to the console whenever the wrapped component mounts, unmounts, or receives new props. Type it properly so the wrapped component's props flow through unchanged. Use it on an `EventCard` component and verify the console output.

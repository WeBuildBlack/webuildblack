---
title: "Error Boundaries and Suspense"
estimatedMinutes: 35
---

# Error Boundaries and Suspense

Production applications crash. APIs return 500 errors, user input triggers edge cases, and third-party scripts throw unexpected exceptions. Without error boundaries, a single JavaScript error in one component takes down your entire React application, leaving users staring at a blank white screen.

Suspense solves a different but related problem: loading states. Instead of scattering `if (isLoading) return <Spinner />` checks through every component, Suspense lets you declare loading fallbacks at the boundary level.

In this lesson, you will build both, then combine them into an `AsyncBoundary` component that handles errors and loading in one clean wrapper.

---

## How React Handles Errors (Without Boundaries)

By default, when a component throws an error during rendering, React unmounts the entire component tree. The user sees nothing. No error message, no fallback UI, no way to recover. Just a blank page and an error in the console.

This behavior is intentional. React's philosophy is that a broken UI is worse than no UI. But in practice, you do not want a bug in the attendee list to take down the entire Gather event page. The event title, date, and location are still valid. Only the attendee section is broken.

Error boundaries solve this by catching errors at a specific level of the tree and rendering fallback UI instead of crashing everything above them.

---

## Building an Error Boundary

Error boundaries are one of the few cases where you must use a class component. React does not offer a hooks-based API for catching render errors. The two lifecycle methods you need are:

- **`static getDerivedStateFromError(error)`**: Called when a child throws. Returns new state to trigger a fallback render.
- **`componentDidCatch(error, errorInfo)`**: Called after the error is caught. Use this for logging or reporting.

```tsx
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Report to an error tracking service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div role="alert" className="error-boundary-fallback">
          <h2>Something went wrong</h2>
          <p>This section could not be loaded. Please try refreshing the page.</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

Usage is straightforward:

```tsx
function EventDetailPage({ eventId }: { eventId: string }) {
  return (
    <div className="event-detail">
      <ErrorBoundary>
        <EventHeader eventId={eventId} />
      </ErrorBoundary>

      <ErrorBoundary>
        <EventDescription eventId={eventId} />
      </ErrorBoundary>

      <ErrorBoundary
        fallback={<p>Could not load attendees. Please try again later.</p>}
      >
        <AttendeeList eventId={eventId} />
      </ErrorBoundary>
    </div>
  );
}
```

If `AttendeeList` crashes, only the attendee section shows the fallback. The header and description continue working normally.

---

## A More Capable Error Boundary

The basic version works, but a production error boundary should support:

1. **Recovery** (retry rendering the children)
2. **Custom fallback with error details** (so the fallback UI can show contextual information)
3. **Reset on navigation** (clear the error when the user navigates to a different page)

```tsx
interface FallbackProps {
  error: Error;
  resetError: () => void;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((props: FallbackProps) => React.ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset the boundary when resetKeys change (e.g., route changes)
    if (this.state.hasError && this.props.resetKeys) {
      const hasChanged = this.props.resetKeys.some(
        (key, i) => key !== prevProps.resetKeys?.[i]
      );
      if (hasChanged) {
        this.setState({ hasError: false, error: null });
      }
    }
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;

      // Function fallback  --  receives error and reset function
      if (typeof fallback === "function") {
        return fallback({
          error: this.state.error,
          resetError: this.resetError,
        });
      }

      // ReactNode fallback
      if (fallback) {
        return fallback;
      }

      // Default fallback
      return (
        <div role="alert" className="error-boundary-fallback">
          <h2>Something went wrong</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error.message}</pre>
          </details>
          <button onClick={this.resetError}>Try again</button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

The function fallback pattern is especially useful:

```tsx
<ErrorBoundary
  fallback={({ error, resetError }) => (
    <div className="error-card">
      <h3>Failed to load attendees</h3>
      <p>{error.message}</p>
      <button onClick={resetError}>Retry</button>
    </div>
  )}
  resetKeys={[eventId]}
>
  <AttendeeList eventId={eventId} />
</ErrorBoundary>
```

When `eventId` changes (the user navigates to a different event), the boundary resets automatically, giving the new event a fresh chance to render.

---

## Granular Boundaries

A common mistake is wrapping the entire app in a single error boundary. This defeats the purpose. If a bug in the footer crashes the boundary, the entire app goes down.

Instead, place boundaries at meaningful section boundaries:

```tsx
function GatherApp() {
  return (
    <ErrorBoundary fallback={<FullPageError />}>
      {/* Top-level boundary as a last resort */}
      <Navbar />

      <main>
        <ErrorBoundary resetKeys={[location.pathname]}>
          {/* Page-level boundary  --  resets on navigation */}
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
          </Routes>
        </ErrorBoundary>
      </main>

      <Footer />
    </ErrorBoundary>
  );
}
```

Inside the event detail page, add section-level boundaries:

```tsx
function EventDetailPage({ eventId }: { eventId: string }) {
  return (
    <div>
      <EventHeader eventId={eventId} />

      <div className="event-body">
        <ErrorBoundary fallback={<p>Could not load event details.</p>}>
          <EventContent eventId={eventId} />
        </ErrorBoundary>

        <ErrorBoundary fallback={<p>Could not load the map.</p>}>
          <EventMap location={event.location} />
        </ErrorBoundary>

        <ErrorBoundary fallback={<p>Could not load comments.</p>}>
          <CommentSection eventId={eventId} />
        </ErrorBoundary>
      </div>
    </div>
  );
}
```

Each section fails independently. A broken map does not hide the event details or comments.

**What error boundaries do NOT catch:**
- Event handler errors (use try/catch inside handlers)
- Asynchronous code (use try/catch in async functions)
- Server-side rendering errors
- Errors in the error boundary itself

Error boundaries only catch errors during rendering, lifecycle methods, and constructors of their child component tree.

---

## Suspense for Loading States

`Suspense` declares a loading boundary. When a child component is not ready to render (because it is loading data or code), React shows the `Suspense` fallback instead.

You have already seen `Suspense` with `React.lazy` for code splitting:

```tsx
const AdminPanel = lazy(() => import("./admin/AdminPanel"));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AdminPanel />
    </Suspense>
  );
}
```

But `Suspense` also works with data fetching libraries that support it. React Query (TanStack Query), Relay, and Next.js all integrate with Suspense to handle loading states declaratively.

Here is the pattern with a Suspense-compatible data fetcher:

```tsx
function EventPage({ eventId }: { eventId: string }) {
  return (
    <div>
      <h1>Event Details</h1>

      <Suspense fallback={<EventDetailSkeleton />}>
        <EventDetail eventId={eventId} />
      </Suspense>

      <Suspense fallback={<AttendeeListSkeleton />}>
        <AttendeeList eventId={eventId} />
      </Suspense>
    </div>
  );
}
```

Each section has its own loading state. The event details can appear as soon as they load, while the attendee list still shows a skeleton. This is a much better user experience than a single loading spinner for the entire page.

**Nested Suspense boundaries** create a progressive loading experience:

```tsx
<Suspense fallback={<PageSkeleton />}>
  <EventPage>
    <Suspense fallback={<HeaderSkeleton />}>
      <EventHeader />
    </Suspense>

    <Suspense fallback={<ContentSkeleton />}>
      <EventContent />
    </Suspense>
  </EventPage>
</Suspense>
```

React resolves from the inside out. If only `EventContent` is loading, its `Suspense` boundary shows `ContentSkeleton` while `EventHeader` renders normally. If the entire `EventPage` is loading, the outer boundary shows `PageSkeleton`.

---

## Combining Error Boundaries and Suspense: AsyncBoundary

In practice, every data-loading section needs both error handling and loading states. Writing both wrappers every time is tedious:

```tsx
{/* This gets repetitive */}
<ErrorBoundary fallback={<ErrorMessage />}>
  <Suspense fallback={<Skeleton />}>
    <EventContent />
  </Suspense>
</ErrorBoundary>
```

Combine them into a single `AsyncBoundary` component:

```tsx
interface AsyncBoundaryProps {
  children: React.ReactNode;
  loadingFallback?: React.ReactNode;
  errorFallback?:
    | React.ReactNode
    | ((props: FallbackProps) => React.ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: unknown[];
}

function AsyncBoundary({
  children,
  loadingFallback = <LoadingSpinner />,
  errorFallback,
  onError,
  resetKeys,
}: AsyncBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={errorFallback}
      onError={onError}
      resetKeys={resetKeys}
    >
      <Suspense fallback={loadingFallback}>{children}</Suspense>
    </ErrorBoundary>
  );
}
```

Now each section needs just one wrapper:

```tsx
function EventDetailPage({ eventId }: { eventId: string }) {
  return (
    <div className="event-detail">
      <AsyncBoundary
        loadingFallback={<HeaderSkeleton />}
        errorFallback={<p>Could not load event header.</p>}
        resetKeys={[eventId]}
      >
        <EventHeader eventId={eventId} />
      </AsyncBoundary>

      <AsyncBoundary
        loadingFallback={<ContentSkeleton />}
        errorFallback={({ error, resetError }) => (
          <div>
            <p>Failed to load event details: {error.message}</p>
            <button onClick={resetError}>Retry</button>
          </div>
        )}
        resetKeys={[eventId]}
      >
        <EventContent eventId={eventId} />
      </AsyncBoundary>

      <AsyncBoundary
        loadingFallback={<AttendeeSkeleton />}
        errorFallback={<p>Could not load attendees.</p>}
      >
        <AttendeeList eventId={eventId} />
      </AsyncBoundary>
    </div>
  );
}
```

Clean, consistent, and each section handles its own loading and error states independently.

---

## Designing Fallback UI

Good fallback UI is not an afterthought. It is part of the user experience.

**Loading fallbacks:**
- Use skeleton screens that match the shape of the loaded content. This reduces perceived loading time.
- Avoid generic spinners for content areas. They do not communicate what is loading.
- Keep skeletons simple. Animated shimmer effects are fine. Complex animations are distracting.

**Error fallbacks:**
- Explain what went wrong in plain language ("Could not load attendees," not "Error: NETWORK_ERR_CONNECTION_REFUSED")
- Offer a recovery action ("Retry" button that calls `resetError`)
- Preserve the rest of the page. Do not collapse the layout when one section fails.
- Consider whether the error is retryable. A network error might resolve on retry. A 404 will not.

Here is a reusable error fallback component for Gather:

```tsx
interface SectionErrorProps {
  title: string;
  message?: string;
  onRetry?: () => void;
}

function SectionError({ title, message, onRetry }: SectionErrorProps) {
  return (
    <div role="alert" className="section-error">
      <h3 className="section-error__title">{title}</h3>
      {message && <p className="section-error__message">{message}</p>}
      {onRetry && (
        <button className="section-error__retry" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
```

---

## Key Takeaways

1. **Without error boundaries,** a single component error crashes the entire React application, leaving users with a blank screen.
2. **Error boundaries are class components** that use `getDerivedStateFromError` and `componentDidCatch` to catch render errors and display fallback UI.
3. **Place boundaries at section-level,** not app-level. Each independent section of a page should fail gracefully without taking down unrelated sections.
4. **Error boundaries do not catch** event handler errors, async errors, or server-side errors. Use try/catch for those.
5. **Suspense declares loading boundaries** with a fallback prop. It works with `React.lazy` for code splitting and with compatible data fetching libraries for data loading.
6. **Combine both into an `AsyncBoundary`** component that handles loading and error states in a single wrapper, reducing boilerplate and enforcing consistency.
7. **Design fallback UI intentionally.** Skeleton screens for loading, clear error messages with retry buttons for errors. Fallbacks are part of the user experience, not afterthoughts.

---

## Try It Yourself

Build an error boundary system for a Gather event detail page with three sections:

1. **Event header** (title, date, organizer). If this fails, show a simple text fallback with the event ID.
2. **Event map** (location embed). If this fails, show a text address instead. Include a "Reload map" button.
3. **Comments section** (user-generated content). If this fails, hide the section entirely with a subtle "Comments unavailable" message.

For each section, create a skeleton loading state and wrap everything in `AsyncBoundary` components. To test your error boundaries, create a component that intentionally throws an error (you can use a button that sets state to trigger an error in the render phase).

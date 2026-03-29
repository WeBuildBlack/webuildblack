---
title: "TypeScript with React"
estimatedMinutes: 35
isFreePreview: false
---

# TypeScript with React

You've learned TypeScript's type system, and you already know React from the Full-Stack JavaScript course. This lesson brings them together. You'll learn how to type React components, hooks, event handlers, and context so that your Gather UI components are fully type-safe.

The good news: React and TypeScript work together seamlessly. React's API was designed with generics, and the `@types/react` package provides comprehensive type definitions. Most of the time, TypeScript infers the right types automatically. This lesson focuses on the cases where you need to be explicit, and on patterns that prevent common mistakes.

---

## Typing Function Components

There are two ways to type a React component. One is better than the other.

### The Recommended Way: Explicit Props Interface

```typescript
interface EventCardProps {
  event: GatherEvent;
  onRSVP: (eventId: string) => void;
  showOrganizer?: boolean;
}

function EventCard({ event, onRSVP, showOrganizer = false }: EventCardProps) {
  return (
    <div className="event-card">
      <h3>{event.title}</h3>
      <p>{event.location.name}</p>
      <p>{event.rsvpCount} / {event.capacity} attending</p>
      {showOrganizer && <p>Organized by {event.organizerId}</p>}
      <button onClick={() => onRSVP(event.id)}>RSVP</button>
    </div>
  );
}
```

The props are destructured in the function parameter, and the type annotation is the `EventCardProps` interface. Default values (like `showOrganizer = false`) work exactly as they do in plain JavaScript.

### The `React.FC` Approach (and Why to Avoid It)

You'll see this in older codebases:

```typescript
// Not recommended
const EventCard: React.FC<EventCardProps> = ({ event, onRSVP, showOrganizer = false }) => {
  // ...
};
```

`React.FC` (Function Component) has several downsides:

1. **It implicitly accepts `children`**, even when your component doesn't use them. This hides bugs where someone passes children to a component that ignores them.
2. **It doesn't support generics well.** If you need a generic component, `React.FC` makes it awkward.
3. **Default props behave differently.** Type inference for default values is less reliable with `React.FC`.
4. **The React team doesn't recommend it.** The official React TypeScript documentation uses plain function declarations.

Stick with explicit props interfaces and regular function declarations. It's simpler, more flexible, and gives better type inference.

---

## Typing Props Patterns

### Children Props

When your component accepts children, type them explicitly with `React.ReactNode`:

```typescript
interface CardProps {
  title: string;
  children: React.ReactNode;
}

function Card({ title, children }: CardProps) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div className="card-body">{children}</div>
    </div>
  );
}
```

`React.ReactNode` is the broadest type for renderable content: strings, numbers, JSX elements, arrays, `null`, `undefined`, and booleans. It covers everything you'd pass between JSX tags.

If you need children to be a specific type (like a render function), be more precise:

```typescript
interface DataListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

function DataList<T>({ items, renderItem }: DataListProps<T>) {
  return <ul>{items.map((item, i) => <li key={i}>{renderItem(item)}</li>)}</ul>;
}

// Usage
<DataList
  items={events}
  renderItem={(event) => <span>{event.title}</span>}
  // TypeScript infers event: GatherEvent from the items prop
/>
```

### Callback Props

Type callback functions with explicit parameter and return types:

```typescript
interface RSVPButtonProps {
  eventId: string;
  currentStatus: RSVPStatus | null;
  onStatusChange: (eventId: string, newStatus: RSVPStatus) => void;
  disabled?: boolean;
}

function RSVPButton({ eventId, currentStatus, onStatusChange, disabled }: RSVPButtonProps) {
  const handleClick = () => {
    const nextStatus: RSVPStatus = currentStatus === 'attending' ? 'declined' : 'attending';
    onStatusChange(eventId, nextStatus);
  };

  return (
    <button onClick={handleClick} disabled={disabled}>
      {currentStatus === 'attending' ? 'Cancel RSVP' : 'RSVP'}
    </button>
  );
}
```

### Spread Props and HTML Attributes

Sometimes your component wraps a native HTML element and should accept all of that element's attributes:

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

function Button({ variant, isLoading, children, className, ...rest }: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} ${className ?? ''}`}
      disabled={isLoading || rest.disabled}
      {...rest}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
}

// Accepts all standard button attributes plus your custom ones
<Button variant="primary" type="submit" aria-label="Submit form">
  Create Event
</Button>
```

By extending `React.ButtonHTMLAttributes<HTMLButtonElement>`, your component automatically accepts `onClick`, `disabled`, `type`, `aria-label`, and every other valid button attribute. No manual typing needed.

---

## Typing Hooks

### useState

`useState` is generic. TypeScript infers the type from the initial value in most cases:

```typescript
// Inferred as string
const [title, setTitle] = useState('');

// Inferred as number
const [capacity, setCapacity] = useState(50);

// Inferred as boolean
const [isPublic, setIsPublic] = useState(true);
```

You need an explicit type parameter when the initial value doesn't represent the full type:

```typescript
// Initial value is null, but the state will eventually hold a GatherEvent
const [selectedEvent, setSelectedEvent] = useState<GatherEvent | null>(null);

// Initial value is an empty array, but it will hold GatherEvent objects
const [events, setEvents] = useState<GatherEvent[]>([]);

// Without the type parameter, TypeScript infers never[] for an empty array
const [items, setItems] = useState([]); // Type: never[] -- this is a bug!
```

**Rule:** Always provide a type parameter when your initial value is `null` or an empty array.

### useReducer

`useReducer` shines with TypeScript because you can type the state and actions as a **discriminated union**. This ensures every action is handled correctly:

```typescript
// Define the state shape
interface EventFormState {
  title: string;
  description: string;
  category: EventCategory;
  capacity: number;
  isPublic: boolean;
  isSubmitting: boolean;
  error: string | null;
}

// Define all possible actions as a discriminated union
type EventFormAction =
  | { type: 'SET_FIELD'; field: keyof EventFormState; value: string | number | boolean }
  | { type: 'SET_CATEGORY'; category: EventCategory }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; error: string }
  | { type: 'RESET' };

const initialState: EventFormState = {
  title: '',
  description: '',
  category: 'meetup',
  capacity: 50,
  isPublic: true,
  isSubmitting: false,
  error: null,
};

function eventFormReducer(state: EventFormState, action: EventFormAction): EventFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_CATEGORY':
      return { ...state, category: action.category };
    case 'SUBMIT_START':
      return { ...state, isSubmitting: true, error: null };
    case 'SUBMIT_SUCCESS':
      return { ...initialState };
    case 'SUBMIT_ERROR':
      return { ...state, isSubmitting: false, error: action.error };
    case 'RESET':
      return { ...initialState };
  }
}

// In your component
function EventForm() {
  const [state, dispatch] = useReducer(eventFormReducer, initialState);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'SUBMIT_START' });
    // ...
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={state.title}
        onChange={(e) =>
          dispatch({ type: 'SET_FIELD', field: 'title', value: e.target.value })
        }
      />
      {state.error && <p className="error">{state.error}</p>}
      <button disabled={state.isSubmitting}>
        {state.isSubmitting ? 'Creating...' : 'Create Event'}
      </button>
    </form>
  );
}
```

The discriminated union on `action.type` means TypeScript knows exactly which properties are available on each action. If you dispatch `{ type: 'SUBMIT_ERROR' }` without the `error` property, TypeScript errors immediately.

### useContext with Proper Null Handling

Context is where many TypeScript React projects get sloppy. Here's the right way to do it:

```typescript
// 1. Define the context value type
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// 2. Create context with null as the initial value
const AuthContext = React.createContext<AuthContextValue | null>(null);

// 3. Create a custom hook that handles the null check
function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// 4. Create the provider
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    login: async (email, password) => {
      // ... authentication logic
    },
    logout: () => {
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 5. Use it in components -- no null checks needed!
function ProfileButton() {
  const { user, isAuthenticated, logout } = useAuth();
  // TypeScript knows user is User | null, isAuthenticated is boolean, etc.

  if (!isAuthenticated) return <a href="/login">Log in</a>;
  return <button onClick={logout}>{user?.displayName}</button>;
}
```

The critical pattern here is the `useAuth()` hook that throws if the context is null. This means every component that calls `useAuth()` is guaranteed to get a non-null `AuthContextValue`. Without this pattern, you'd need null checks everywhere you use the context.

Why use `null` as the initial `createContext` value instead of a default object? Because a default object would let you use the context outside a provider *without any error*. Your components would silently get stub values. The null pattern catches this mistake immediately.

---

## Typing Event Handlers

React has specific types for every DOM event. Here are the ones you'll use most:

```typescript
function EventForm() {
  // Input change events
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value); // TypeScript knows this is a string
  };

  // Textarea change events
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log(e.target.value);
  };

  // Select change events
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log(e.target.value);
  };

  // Form submit events
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // ... submit logic
  };

  // Click events
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log(e.clientX, e.clientY);
  };

  // Keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // ... submit on enter
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input onChange={handleTitleChange} onKeyDown={handleKeyDown} />
      <textarea onChange={handleDescriptionChange} />
      <select onChange={handleCategoryChange}>
        <option value="meetup">Meetup</option>
        <option value="workshop">Workshop</option>
      </select>
      <button onClick={handleClick} type="submit">Create</button>
    </form>
  );
}
```

The pattern is consistent: `React.{EventType}<{HTMLElementType}>`. The element type determines what properties are available on `e.target` (like `.value` for inputs, `.checked` for checkboxes).

**Pro tip:** If you can't remember the exact type, write the handler inline first and hover over the parameter in VS Code:

```typescript
// Let TypeScript infer it, then extract to a named function if needed
<input onChange={(e) => {
  // Hover over 'e' -- VS Code shows React.ChangeEvent<HTMLInputElement>
}} />
```

---

## Working with Third-Party Types

Most popular libraries publish TypeScript types, either built-in or via the `@types` namespace on npm.

### Installing Type Definitions

```bash
# Libraries with built-in types (no extra install needed)
npm install next          # Types included
npm install @supabase/supabase-js  # Types included

# Libraries that need separate type definitions
npm install --save-dev @types/react @types/react-dom
npm install --save-dev @types/node
```

When you `npm install` a package, check if types are included by looking for a `types` or `typings` field in the package's `package.json`. If there's no built-in types, search for `@types/package-name` on npm.

### When Types Don't Exist

Occasionally you'll use a library with no type definitions. You have three options:

```typescript
// Option 1: Declare the module with 'any' (quick and dirty)
// Create a file: src/types/untyped-lib.d.ts
declare module 'untyped-lib';

// Option 2: Write minimal type declarations for what you use
declare module 'untyped-lib' {
  export function doSomething(input: string): Promise<string>;
  export interface Config {
    apiKey: string;
    timeout: number;
  }
}

// Option 3: Use require with a type assertion (last resort)
const lib = require('untyped-lib') as {
  doSomething: (input: string) => Promise<string>;
};
```

Option 2 is the best balance of effort and safety. You don't need to type the entire library, just the parts you actually use.

---

## Building Typed Gather Components

Let's build three real components for the Gather platform, applying everything from this lesson.

### EventCard Component

```typescript
interface EventCardProps {
  event: GatherEvent;
  onRSVP?: (eventId: string) => void;
  variant?: 'compact' | 'full';
}

function EventCard({ event, onRSVP, variant = 'full' }: EventCardProps) {
  const spotsLeft = event.capacity - event.rsvpCount;
  const isFull = spotsLeft <= 0;

  const formattedDate = new Date(event.startDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  if (variant === 'compact') {
    return (
      <div className="event-card-compact">
        <span className="event-title">{event.title}</span>
        <span className="event-date">{formattedDate}</span>
        <span className="event-spots">{spotsLeft} spots</span>
      </div>
    );
  }

  return (
    <article className="event-card">
      {event.imageUrl && <img src={event.imageUrl} alt={event.title} />}
      <div className="event-card-body">
        <span className="event-category">{event.category}</span>
        <h3>{event.title}</h3>
        <p className="event-date">{formattedDate}</p>
        <p className="event-location">{event.location.name}</p>
        <p className="event-spots">
          {isFull ? 'Event is full' : `${spotsLeft} spots remaining`}
        </p>
        {onRSVP && !isFull && (
          <button onClick={() => onRSVP(event.id)} className="rsvp-button">
            RSVP
          </button>
        )}
      </div>
    </article>
  );
}
```

### RSVPButton Component

```typescript
interface RSVPButtonProps {
  eventId: string;
  currentStatus: RSVPStatus | null;
  isFull: boolean;
  onStatusChange: (eventId: string, status: RSVPStatus) => Promise<void>;
}

function RSVPButton({ eventId, currentStatus, isFull, onStatusChange }: RSVPButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      if (currentStatus === 'attending') {
        await onStatusChange(eventId, 'declined');
      } else {
        await onStatusChange(eventId, 'attending');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isFull && currentStatus !== 'attending') {
    return <button disabled className="rsvp-button rsvp-full">Event Full</button>;
  }

  const label = isLoading
    ? 'Updating...'
    : currentStatus === 'attending'
      ? 'Cancel RSVP'
      : 'RSVP';

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`rsvp-button ${currentStatus === 'attending' ? 'rsvp-cancel' : 'rsvp-attend'}`}
    >
      {label}
    </button>
  );
}
```

### EventForm Component

```typescript
interface EventFormProps {
  onSubmit: (data: CreateEventPayload) => Promise<void>;
  initialData?: Partial<CreateEventPayload>;
}

// Reusing our utility type from Lesson 3
type CreateEventPayload = Omit<GatherEvent, 'id' | 'createdAt' | 'updatedAt' | 'rsvpCount'>;

function EventForm({ onSubmit, initialData }: EventFormProps) {
  const [state, dispatch] = useReducer(eventFormReducer, {
    ...initialState,
    ...initialData,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'SUBMIT_START' });

    try {
      await onSubmit({
        title: state.title,
        description: state.description,
        category: state.category,
        capacity: state.capacity,
        isPublic: state.isPublic,
        slug: state.title.toLowerCase().replace(/\s+/g, '-'),
        status: 'draft',
        startDate: new Date().toISOString(),
        location: { name: '', address: '', city: '', state: '' },
        tags: [],
        organizerId: '',
      });
      dispatch({ type: 'SUBMIT_SUCCESS' });
    } catch (err) {
      dispatch({
        type: 'SUBMIT_ERROR',
        error: err instanceof Error ? err.message : 'Something went wrong',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="event-form">
      <label>
        Event Title
        <input
          type="text"
          value={state.title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            dispatch({ type: 'SET_FIELD', field: 'title', value: e.target.value })
          }
          required
        />
      </label>

      <label>
        Category
        <select
          value={state.category}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            dispatch({ type: 'SET_CATEGORY', category: e.target.value as EventCategory })
          }
        >
          <option value="meetup">Meetup</option>
          <option value="workshop">Workshop</option>
          <option value="conference">Conference</option>
          <option value="social">Social</option>
          <option value="hackathon">Hackathon</option>
        </select>
      </label>

      <label>
        Capacity
        <input
          type="number"
          value={state.capacity}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            dispatch({ type: 'SET_FIELD', field: 'capacity', value: Number(e.target.value) })
          }
          min={1}
        />
      </label>

      {state.error && <p className="form-error">{state.error}</p>}

      <button type="submit" disabled={state.isSubmitting}>
        {state.isSubmitting ? 'Creating...' : 'Create Event'}
      </button>
    </form>
  );
}
```

---

## Key Takeaways

1. **Use explicit props interfaces instead of `React.FC`.** Destructure props in the function parameter and type them with a named interface.
2. **`React.ReactNode` is the correct type for children.** It covers strings, JSX, arrays, null, and everything else renderable.
3. **Provide explicit type parameters to `useState`** when the initial value is `null` or an empty array. Otherwise, let TypeScript infer.
4. **Type `useReducer` actions as a discriminated union.** Each action has a `type` string literal, and TypeScript verifies every action is handled in the switch statement.
5. **Use the null-context pattern for `useContext`.** Create context with `null`, write a custom hook that throws if null, and every consumer gets a guaranteed non-null value.
6. **Event handler types follow the pattern `React.{Event}<{Element}>`** -- for example, `React.ChangeEvent<HTMLInputElement>`.
7. **Extend `React.HTMLAttributes` or element-specific attributes** (like `React.ButtonHTMLAttributes<HTMLButtonElement>`) when wrapping native HTML elements.

---

## Try It Yourself

1. Create an `EventCard` component with typed props for `event: GatherEvent`, `onRSVP: (id: string) => void`, and an optional `showDescription?: boolean`.
2. Build an `RSVPButton` component that accepts `currentStatus: RSVPStatus | null` and `onStatusChange: (status: RSVPStatus) => Promise<void>`. Include loading state with `useState<boolean>`.
3. Create a `useAuth` context following the null-context pattern. Include `user: User | null`, `login`, and `logout` in the context value.
4. Type a form that uses `useReducer` with at least 4 different action types in a discriminated union. Include `SET_FIELD`, `SUBMIT_START`, `SUBMIT_SUCCESS`, and `SUBMIT_ERROR`.
5. Create a `SearchInput` component that extends `React.InputHTMLAttributes<HTMLInputElement>` and adds a custom `onSearch: (query: string) => void` prop.
6. Write a generic `DataList<T>` component that accepts `items: T[]` and `renderItem: (item: T) => React.ReactNode`. Verify that TypeScript infers `T` when you use it.

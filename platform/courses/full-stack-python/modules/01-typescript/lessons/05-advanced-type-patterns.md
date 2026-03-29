---
title: "Advanced Type Patterns"
estimatedMinutes: 35
isFreePreview: false
---

# Advanced Type Patterns

You've covered the fundamentals: primitive types, interfaces, generics, and React integration. This lesson is about patterns that separate beginner TypeScript from production TypeScript. These are the techniques you'll reach for when modeling complex state, handling API responses, and building libraries that other developers consume.

Every pattern in this lesson solves a real problem you'll encounter in the Gather codebase. Discriminated unions model async data loading. Type guards safely narrow types from API responses. The `satisfies` operator catches config errors without losing type inference. These aren't academic exercises. They're tools you'll use in the module project and throughout the rest of the course.

---

## Discriminated Unions for Async State

The most important advanced pattern in TypeScript is the **discriminated union**. You saw it briefly with `useReducer` actions. Now let's use it for something every frontend app needs: modeling the lifecycle of an API request.

### The Problem

Most developers model async state like this:

```typescript
// The "bag of booleans" approach -- fragile and error-prone
interface AsyncState {
  data: GatherEvent[] | null;
  loading: boolean;
  error: string | null;
}
```

This type allows impossible states. Can `loading` be `true` while `data` is also set? Can `error` be non-null while `loading` is `true`? The type says yes to both, but your UI doesn't handle those combinations. Impossible states lead to impossible bugs.

### The Solution: Discriminated Unions

Model each state as a separate type, united by a discriminant property:

```typescript
type AsyncData<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };
```

Each variant has a `status` field (the **discriminant**) with a string literal type. TypeScript uses this field to determine which variant you're working with. The key benefit: `data` only exists when `status` is `'success'`, and `error` only exists when `status` is `'error'`. Impossible states are literally unrepresentable.

```typescript
function EventList() {
  const [state, setState] = useState<AsyncData<GatherEvent[]>>({ status: 'idle' });

  useEffect(() => {
    setState({ status: 'loading' });

    fetchData<GatherEvent[]>('/events')
      .then((response) => setState({ status: 'success', data: response.data }))
      .catch((err) => setState({ status: 'error', error: err.message }));
  }, []);

  switch (state.status) {
    case 'idle':
      return null;
    case 'loading':
      return <p>Loading events...</p>;
    case 'success':
      return (
        <ul>
          {state.data.map((event) => (
            // TypeScript knows state.data is GatherEvent[] here
            <li key={event.id}>{event.title}</li>
          ))}
        </ul>
      );
    case 'error':
      return <p className="error">Failed to load events: {state.error}</p>;
      // TypeScript knows state.error is string here
  }
}
```

Inside each case, TypeScript **narrows** the type automatically. In the `'success'` case, TypeScript knows `state.data` exists and is `GatherEvent[]`. In the `'error'` case, it knows `state.error` exists and is a `string`. You don't need type assertions or null checks.

### API Result Type

Apply the same pattern to API responses throughout the Gather client:

```typescript
type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

interface ApiError {
  code: string;
  message: string;
  statusCode: number;
}

async function apiGet<T>(endpoint: string): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`https://api.gather.app/v1${endpoint}`);
    if (!response.ok) {
      return {
        ok: false,
        error: {
          code: 'HTTP_ERROR',
          message: response.statusText,
          statusCode: response.status,
        },
      };
    }
    const data: T = await response.json();
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
        statusCode: 0,
      },
    };
  }
}

// Usage: the discriminant forces you to handle errors
const result = await apiGet<GatherEvent[]>('/events');

if (result.ok) {
  console.log(result.data);   // Type: GatherEvent[]
} else {
  console.error(result.error); // Type: ApiError
}
```

This pattern eliminates try/catch at the call site and makes error handling explicit. You can't accidentally access `result.data` without first checking `result.ok`. This is the pattern you'll use in the module project.

---

## Type Narrowing and Type Guards

TypeScript narrows types automatically when you use certain JavaScript expressions. Understanding narrowing lets you write code that is both safe and concise.

### Built-in Narrowing

```typescript
// typeof narrowing
function formatValue(value: string | number): string {
  if (typeof value === 'string') {
    return value.toUpperCase(); // TypeScript knows: string
  }
  return value.toFixed(2); // TypeScript knows: number
}

// instanceof narrowing
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message; // TypeScript knows: Error
  }
  return String(error);
}

// "in" operator narrowing
interface EventWithVenue {
  title: string;
  venue: { name: string; address: string };
}

interface EventOnline {
  title: string;
  streamUrl: string;
}

type AnyEvent = EventWithVenue | EventOnline;

function getEventLocation(event: AnyEvent): string {
  if ('venue' in event) {
    return event.venue.name; // TypeScript knows: EventWithVenue
  }
  return event.streamUrl; // TypeScript knows: EventOnline
}

// Truthiness narrowing
function getDescription(event: GatherEvent): string {
  if (event.description) {
    return event.description; // TypeScript knows: string (not undefined)
  }
  return 'No description provided';
}
```

### Custom Type Guard Functions

When built-in narrowing isn't enough, write a **type guard function**. A type guard is a function that returns `paramName is Type`:

```typescript
// Type guard: checks if an unknown API response is a valid GatherEvent
function isGatherEvent(value: unknown): value is GatherEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'title' in value &&
    'startDate' in value &&
    'capacity' in value &&
    typeof (value as GatherEvent).id === 'string' &&
    typeof (value as GatherEvent).title === 'string'
  );
}

// Usage
const data: unknown = await response.json();

if (isGatherEvent(data)) {
  console.log(data.title); // TypeScript knows: GatherEvent
  console.log(data.capacity); // Full autocomplete
} else {
  console.error('Invalid event data');
}
```

The `value is GatherEvent` return type is a **type predicate**. It tells TypeScript: "If this function returns true, narrow the type of `value` to `GatherEvent` in the calling scope."

Type guards are especially useful for validating data from external sources: API responses, URL parameters, local storage, user input.

### Array Filtering with Type Guards

Type guards work with `.filter()` to narrow array types:

```typescript
type EventOrNull = GatherEvent | null;

const mixedResults: EventOrNull[] = [event1, null, event2, null, event3];

// Without type guard: TypeScript doesn't narrow
const filtered = mixedResults.filter((e) => e !== null);
// Type: EventOrNull[] -- still includes null!

// With type guard: TypeScript narrows correctly
const events = mixedResults.filter((e): e is GatherEvent => e !== null);
// Type: GatherEvent[] -- null is gone
```

The inline type predicate `(e): e is GatherEvent =>` tells TypeScript that the filter callback is a type guard. This is a pattern you'll use frequently when processing API data.

---

## The `satisfies` Operator

Added in TypeScript 4.9, `satisfies` checks that a value matches a type without widening the inferred type. This sounds subtle, but it solves a real problem.

### The Problem

```typescript
type EventCategoryConfig = Record<EventCategory, { label: string; color: string }>;

// Using a type annotation: works, but you lose literal type inference
const categoryConfig: EventCategoryConfig = {
  workshop: { label: 'Workshop', color: '#4A90D9' },
  meetup: { label: 'Meetup', color: '#7B61FF' },
  conference: { label: 'Conference', color: '#F5A623' },
  social: { label: 'Social', color: '#50E3C2' },
  hackathon: { label: 'Hackathon', color: '#D0021B' },
};

// TypeScript knows categoryConfig.workshop.color is type `string`
// But we want it to know it's specifically '#4A90D9'
```

### The Solution

```typescript
const categoryConfig = {
  workshop: { label: 'Workshop', color: '#4A90D9' },
  meetup: { label: 'Meetup', color: '#7B61FF' },
  conference: { label: 'Conference', color: '#F5A623' },
  social: { label: 'Social', color: '#50E3C2' },
  hackathon: { label: 'Hackathon', color: '#D0021B' },
} satisfies EventCategoryConfig;

// TypeScript still validates that all categories are present
// AND it preserves the literal types:
categoryConfig.workshop.color; // Type: '#4A90D9' (not just string)
```

`satisfies` validates the structure without changing the inferred type. It's perfect for configuration objects, route definitions, and any constant data where you want both validation and precise types.

### Catching Missing Keys

If you forget a category, `satisfies` catches it immediately:

```typescript
const categoryConfig = {
  workshop: { label: 'Workshop', color: '#4A90D9' },
  meetup: { label: 'Meetup', color: '#7B61FF' },
  // Missing: conference, social, hackathon
} satisfies EventCategoryConfig;
// ERROR: Type is missing properties: 'conference', 'social', 'hackathon'
```

---

## `as const` for Literal Inference

By default, TypeScript infers the widest reasonable type for object and array literals:

```typescript
const eventCategories = ['workshop', 'meetup', 'conference', 'social', 'hackathon'];
// Type: string[] -- too wide! We lose the specific values.

const config = { maxEvents: 100, defaultCategory: 'meetup' };
// Type: { maxEvents: number; defaultCategory: string } -- too wide!
```

`as const` tells TypeScript to infer the narrowest possible type:

```typescript
const eventCategories = ['workshop', 'meetup', 'conference', 'social', 'hackathon'] as const;
// Type: readonly ['workshop', 'meetup', 'conference', 'social', 'hackathon']

const config = { maxEvents: 100, defaultCategory: 'meetup' } as const;
// Type: { readonly maxEvents: 100; readonly defaultCategory: 'meetup' }
```

This is useful when you want to derive a type from a runtime value:

```typescript
const EVENT_CATEGORIES = ['workshop', 'meetup', 'conference', 'social', 'hackathon'] as const;

// Derive the union type from the array
type EventCategory = (typeof EVENT_CATEGORIES)[number];
// Type: 'workshop' | 'meetup' | 'conference' | 'social' | 'hackathon'

// Now you have both a runtime array (for rendering dropdowns, validation)
// and a compile-time type (for type safety) from a single source of truth
```

This pattern keeps your types and runtime values in sync. If you add `'panel'` to the array, the `EventCategory` type automatically includes it.

---

## Mapped Types

Mapped types transform every property of an existing type. You've already used built-in mapped types (`Partial`, `Required`, `Readonly`). Here's how they work under the hood:

```typescript
// Partial<T> is implemented like this:
type MyPartial<T> = {
  [K in keyof T]?: T[K];
};

// Readonly<T> is implemented like this:
type MyReadonly<T> = {
  readonly [K in keyof T]: T[K];
};
```

The syntax `[K in keyof T]` iterates over every key of `T`. You can use this to build custom transformations:

```typescript
// Make all properties nullable
type Nullable<T> = {
  [K in keyof T]: T[K] | null;
};

type NullableEvent = Nullable<GatherEvent>;
// { id: string | null; title: string | null; startDate: string | null; ... }

// Convert all properties to their string representations (for form data)
type FormValues<T> = {
  [K in keyof T]: string;
};

type EventFormValues = FormValues<Pick<GatherEvent, 'title' | 'capacity' | 'category'>>;
// { title: string; capacity: string; category: string }
```

You won't write custom mapped types every day, but understanding them helps you read library types and combine utility types effectively.

---

## Conditional Types (Brief)

Conditional types choose between two types based on a condition:

```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;  // true
type B = IsString<number>;  // false
```

The syntax `T extends U ? X : Y` reads as: "If `T` is assignable to `U`, the type is `X`. Otherwise, it's `Y`."

A practical example for Gather:

```typescript
// Extract the response type based on whether the endpoint returns a list or single item
type ResponseType<T> = T extends Array<infer U> ? PaginatedList<U> : ApiResponse<T>;

// If T is GatherEvent[], ResponseType resolves to PaginatedList<GatherEvent>
// If T is GatherEvent, ResponseType resolves to ApiResponse<GatherEvent>
```

The `infer` keyword extracts a type from within a conditional. `T extends Array<infer U>` means: "If T is an array, capture the element type as U." You'll see `infer` in library types and utility type definitions. You rarely need to write it in application code, but recognizing it helps you read type errors.

---

## Template Literal Types (Brief)

TypeScript can manipulate string types at the type level:

```typescript
type EventEndpoint = `/events/${string}`;
type UserEndpoint = `/users/${string}`;

type APIEndpoint = EventEndpoint | UserEndpoint;

function apiCall(endpoint: APIEndpoint): void {
  // ...
}

apiCall('/events/evt_001');     // OK
apiCall('/users/usr_001');      // OK
apiCall('/rsvps/rsvp_001');     // ERROR: not assignable to APIEndpoint
```

For Gather, template literal types can type your API routes:

```typescript
type GatherEndpoint =
  | '/events'
  | `/events/${string}`
  | '/users/me'
  | `/users/${string}`
  | `/events/${string}/rsvps`;

async function gatherFetch<T>(endpoint: GatherEndpoint): Promise<T> {
  const response = await fetch(`https://api.gather.app/v1${endpoint}`);
  return response.json();
}

gatherFetch('/events');              // OK
gatherFetch('/events/evt_001');      // OK
gatherFetch('/events/evt_001/rsvps'); // OK
gatherFetch('/posts/123');           // ERROR: not a valid GatherEndpoint
```

This is a lightweight form of API route validation at the type level. Full type-safe API clients (like tRPC or Hono) take this concept much further.

---

## Practical Pattern: Exhaustive Object Mapping

Combine `satisfies`, `as const`, and `Record` for fully type-safe lookup objects:

```typescript
const STATUS_CONFIG = {
  draft: { label: 'Draft', color: '#9CA3AF', icon: 'edit' },
  published: { label: 'Live', color: '#10B981', icon: 'check-circle' },
  cancelled: { label: 'Cancelled', color: '#EF4444', icon: 'x-circle' },
  completed: { label: 'Completed', color: '#6366F1', icon: 'archive' },
} as const satisfies Record<EventStatus, { label: string; color: string; icon: string }>;

// TypeScript guarantees:
// 1. Every EventStatus has an entry (from Record + satisfies)
// 2. Literal types are preserved (from as const)
// 3. No extra keys are allowed (from satisfies)

function getStatusConfig(status: EventStatus) {
  return STATUS_CONFIG[status];
  // Return type includes the exact literal values, not just string
}

const config = getStatusConfig('published');
// config.color is '#10B981', not just string
```

This is one of the most useful patterns in production TypeScript. Use it for any constant mapping: status labels, role permissions, route configs, feature flags.

---

## Key Takeaways

1. **Discriminated unions model mutually exclusive states.** Use them for async loading states (`idle | loading | success | error`) and API results (`ok: true | ok: false`). They make impossible states unrepresentable.
2. **Type narrowing happens automatically** with `typeof`, `instanceof`, `in`, and truthiness checks. Inside a narrowed branch, TypeScript knows the specific type.
3. **Custom type guards (`value is Type`)** narrow types from external data: API responses, user input, local storage. Use them when built-in narrowing isn't sufficient.
4. **`satisfies` validates without widening.** Use it for configuration objects where you want both validation (all keys present) and precise literal types.
5. **`as const` infers the narrowest possible type.** Combine it with `typeof` to derive union types from runtime arrays, keeping types and values in sync.
6. **Template literal types** can validate string patterns at the type level, useful for API routes and string-based identifiers.
7. **Combine patterns for maximum safety.** `as const satisfies Record<Union, Shape>` gives you exhaustive, literal-typed, validated configuration objects.

---

## Try It Yourself

1. Create an `AsyncData<T>` discriminated union with four states: `idle`, `loading`, `success` (with `data: T`), and `error` (with `error: string`). Write a React component that renders different UI for each state.
2. Create an `ApiResult<T>` type with `{ ok: true; data: T } | { ok: false; error: ApiError }`. Write a function that fetches data and returns `ApiResult<T>` instead of throwing exceptions.
3. Write a type guard function `isUser(value: unknown): value is User` that validates an unknown value has the required User properties.
4. Use `as const` to define an array of event categories, then derive the `EventCategory` union type from it using `typeof` and indexed access.
5. Create a `STATUS_CONFIG` object using `as const satisfies Record<EventStatus, { label: string; color: string }>`. Verify that removing a status causes a compile error.
6. Write a `.filter()` call that uses an inline type predicate to remove `null` values from an array of `(GatherEvent | null)[]` and returns `GatherEvent[]`.

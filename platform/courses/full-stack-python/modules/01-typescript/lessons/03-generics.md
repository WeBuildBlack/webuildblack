---
title: "Generics"
estimatedMinutes: 35
isFreePreview: false
---

# Generics

You've built a solid set of types for Gather: events, users, RSVPs. But what happens when you need to write a function that works with *any* of those types? Say you want a function that fetches data from the API. It could return a `GatherEvent`, a `User`, or a list of `RSVP` objects. Without generics, you'd have three options: write three nearly identical functions, use `any` (defeating the purpose of TypeScript), or use `unknown` (safe but inconvenient).

Generics give you a fourth option: write one function that preserves type safety for whatever type you pass in. They're TypeScript's answer to "I want this to work with multiple types, but I still want the compiler to check everything."

This lesson will take generics from abstract concept to practical tool. By the end, you'll have a generic `ApiResponse<T>` type and a `fetchData<T>()` function that form the backbone of Gather's typed API client.

---

## The Problem Generics Solve

Consider this function that wraps an API response:

```typescript
// Without generics: three separate functions that do the same thing
function wrapEventResponse(data: GatherEvent): { data: GatherEvent; fetchedAt: string } {
  return { data, fetchedAt: new Date().toISOString() };
}

function wrapUserResponse(data: User): { data: User; fetchedAt: string } {
  return { data, fetchedAt: new Date().toISOString() };
}

function wrapRSVPResponse(data: RSVP): { data: RSVP; fetchedAt: string } {
  return { data, fetchedAt: new Date().toISOString() };
}
```

The logic is identical in all three. Only the type differs. This is exactly the duplication that generics eliminate.

---

## Your First Generic Function

A generic function uses a **type parameter** (a placeholder for a type) that gets filled in when the function is called:

```typescript
function wrapResponse<T>(data: T): { data: T; fetchedAt: string } {
  return { data, fetchedAt: new Date().toISOString() };
}
```

The `<T>` after the function name declares a type parameter called `T`. Think of it like a function parameter, but for types. When you call the function, TypeScript figures out what `T` should be:

```typescript
// TypeScript infers T = GatherEvent from the argument
const eventResponse = wrapResponse(myEvent);
// Type: { data: GatherEvent; fetchedAt: string }

// TypeScript infers T = User from the argument
const userResponse = wrapResponse(myUser);
// Type: { data: User; fetchedAt: string }

// You can also specify T explicitly (rarely needed)
const rsvpResponse = wrapResponse<RSVP>(myRSVP);
// Type: { data: RSVP; fetchedAt: string }
```

One function. Full type safety. No `any`. No duplication.

### The Classic Example: Identity Function

The simplest possible generic function is the identity function, which returns exactly what you pass in:

```typescript
function identity<T>(value: T): T {
  return value;
}

const num = identity(42);       // Type: number (inferred, T = number)
const str = identity('hello');  // Type: string (inferred, T = string)
```

This isn't useful on its own, but it shows the core mechanic: `T` is determined by the argument, and TypeScript tracks it through the return type.

---

## Generic Interfaces

You can parameterize interfaces the same way:

```typescript
// A generic API response wrapper
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  timestamp: string;
}

// Usage: specify the type parameter when you use the interface
const eventResponse: ApiResponse<GatherEvent> = {
  data: {
    id: 'evt_001',
    title: 'Brooklyn Tech Meetup',
    // ... all GatherEvent properties
  },
  status: 200,
  message: 'OK',
  timestamp: '2026-04-15T10:00:00Z',
};

const userResponse: ApiResponse<User> = {
  data: {
    id: 'usr_001',
    email: 'maya@example.com',
    // ... all User properties
  },
  status: 200,
  message: 'OK',
  timestamp: '2026-04-15T10:00:00Z',
};
```

Both responses are fully typed. `eventResponse.data.title` autocompletes. `userResponse.data.email` autocompletes. The compiler knows exactly what's inside each `data` field.

### Paginated Lists

A common pattern in APIs is returning paginated data. Generics make this type reusable:

```typescript
interface PaginatedList<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

// A paginated list of events
type EventList = PaginatedList<GatherEvent>;

// A paginated list of users
type UserList = PaginatedList<User>;

function renderEventList(list: PaginatedList<GatherEvent>): void {
  console.log(`Showing ${list.items.length} of ${list.total} events`);
  for (const event of list.items) {
    console.log(`- ${event.title} (${event.rsvpCount}/${event.capacity})`);
    //              ^^^^^ autocomplete works: TypeScript knows items are GatherEvent[]
  }
}
```

---

## Building a Generic Fetch Function

Here's where generics become essential. Let's build a `fetchData<T>()` function for the Gather API client:

```typescript
const API_BASE = 'https://api.gather.app/v1';

async function fetchData<T>(endpoint: string): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}${endpoint}`);

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  return {
    data: json as T,
    status: response.status,
    message: 'OK',
    timestamp: new Date().toISOString(),
  };
}
```

Now you can call it with any type:

```typescript
// Fetch a single event
const eventResponse = await fetchData<GatherEvent>('/events/evt_001');
console.log(eventResponse.data.title); // TypeScript knows this is a string

// Fetch a paginated list of events
const eventsResponse = await fetchData<PaginatedList<GatherEvent>>('/events?page=1');
console.log(eventsResponse.data.items[0]?.title); // Still fully typed

// Fetch the current user
const userResponse = await fetchData<User>('/me');
console.log(userResponse.data.displayName); // TypeScript knows this is a string
```

Notice that you need to explicitly specify `<GatherEvent>` when calling `fetchData`. TypeScript can't infer the return type from the endpoint string (it doesn't know that `/events/evt_001` returns a `GatherEvent`). In the module project, you'll create typed endpoint functions that handle this so callers don't need to specify the type parameter manually.

---

## Constraining Generics with `extends`

Sometimes a generic type parameter shouldn't accept *any* type. You can constrain it using `extends`:

```typescript
// T must have an 'id' property that is a string
function getEntityId<T extends { id: string }>(entity: T): string {
  return entity.id;
}

getEntityId(myEvent); // OK: GatherEvent has id: string
getEntityId(myUser);  // OK: User has id: string
getEntityId(42);      // ERROR: number doesn't have an 'id' property
```

The constraint `T extends { id: string }` means: "T can be any type, as long as it has at least an `id` property of type `string`." This is useful when your function needs to access specific properties but should still be generic.

### Constraining to Your Domain Types

For Gather, you can constrain generics to `BaseEntity`:

```typescript
// Works with any entity that extends BaseEntity
function sortByCreatedDate<T extends BaseEntity>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

const sortedEvents = sortByCreatedDate(events);
// Type: GatherEvent[] (not just BaseEntity[])

const sortedUsers = sortByCreatedDate(users);
// Type: User[] (TypeScript preserves the specific type)
```

The key insight: the return type is `T[]`, not `BaseEntity[]`. TypeScript preserves the specific type that was passed in. If you pass `GatherEvent[]`, you get `GatherEvent[]` back with full autocomplete.

### Multiple Type Parameters

Functions can have more than one type parameter:

```typescript
function mergeObjects<A, B>(a: A, b: B): A & B {
  return { ...a, ...b };
}

const eventWithMetadata = mergeObjects(
  { title: 'Tech Meetup', capacity: 50 },
  { featured: true, priority: 1 }
);
// Type: { title: string; capacity: number } & { featured: boolean; priority: number }
// All four properties are available with autocomplete
```

### The `keyof` Constraint

A common pattern is constraining a type parameter to be a valid key of another type:

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const event: GatherEvent = { /* ... */ };

const title = getProperty(event, 'title');     // Type: string
const capacity = getProperty(event, 'capacity'); // Type: number
const oops = getProperty(event, 'color');      // ERROR: '"color"' is not assignable
                                                // to 'keyof GatherEvent'
```

`keyof T` produces a union of all property names of `T`. So `keyof GatherEvent` is `'id' | 'title' | 'slug' | 'status' | ...`. The constraint `K extends keyof T` ensures you can only pass valid property names.

---

## Utility Types

TypeScript ships with built-in generic types called **utility types**. These transform existing types into new ones. Here are the ones you'll use constantly:

### Partial\<T\>

Makes all properties optional. Perfect for update operations where you only send the fields that changed:

```typescript
// All properties of GatherEvent, but all optional
type EventUpdate = Partial<GatherEvent>;

function updateEvent(id: string, updates: Partial<GatherEvent>): Promise<GatherEvent> {
  return fetchData<GatherEvent>(`/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

// Only send the fields you want to change
await updateEvent('evt_001', { title: 'Updated Title', capacity: 100 });
```

### Required\<T\>

The opposite of `Partial`. Makes all properties required:

```typescript
// Even description, endDate, imageUrl are now required
type CompleteEvent = Required<GatherEvent>;
```

### Pick\<T, Keys\>

Creates a type with only the specified properties:

```typescript
// Just the fields needed for an event card preview
type EventPreview = Pick<GatherEvent, 'id' | 'title' | 'startDate' | 'location' | 'imageUrl'>;

function renderEventCard(event: EventPreview): string {
  return `${event.title} at ${event.location.name}`;
  // Only id, title, startDate, location, and imageUrl are available
}
```

### Omit\<T, Keys\>

Creates a type with all properties *except* the specified ones:

```typescript
// Everything except server-generated fields -- useful for "create" payloads
type CreateEventPayload = Omit<GatherEvent, 'id' | 'createdAt' | 'updatedAt' | 'rsvpCount'>;

function createEvent(payload: CreateEventPayload): Promise<GatherEvent> {
  return fetchData<GatherEvent>('/events', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
```

### Record\<K, V\>

Creates an object type with keys of type `K` and values of type `V` (you saw this in Lesson 2):

```typescript
// Map event IDs to their RSVP counts
type RSVPCountMap = Record<string, number>;

// Map each category to its display config
type CategoryConfig = Record<EventCategory, { label: string; icon: string; color: string }>;
```

### Combining Utility Types

Utility types compose naturally. This is where they become truly useful:

```typescript
// An event creation form: all fields from GatherEvent, minus server-generated ones,
// with everything optional (because the form starts empty)
type EventFormData = Partial<Omit<GatherEvent, 'id' | 'createdAt' | 'updatedAt' | 'rsvpCount'>>;

// An admin event view: pick specific fields and make them all required
type AdminEventRow = Required<Pick<GatherEvent, 'id' | 'title' | 'status' | 'organizerId' | 'rsvpCount'>>;
```

---

## Generic React Hook Signatures (Preview)

In the next lesson, you'll use generics extensively with React. Here's a quick preview of what that looks like:

```typescript
// useState is generic -- it infers T from the initial value
const [events, setEvents] = useState<GatherEvent[]>([]);
// events: GatherEvent[]
// setEvents: (value: GatherEvent[] | ((prev: GatherEvent[]) => GatherEvent[])) => void

// A custom hook that fetches any type of data
function useApiData<T>(endpoint: string): {
  data: T | null;
  loading: boolean;
  error: string | null;
} {
  // Implementation in the next lesson
}

// Usage: the type parameter flows through
const { data: events } = useApiData<GatherEvent[]>('/events');
// events: GatherEvent[] | null
```

Generics are what make React's hooks type-safe. When you call `useState<GatherEvent[]>([])`, TypeScript knows that `events` is `GatherEvent[]` and that `setEvents` only accepts `GatherEvent[]` values. All of that is powered by generics.

---

## Common Mistakes

### Mistake 1: Using `any` Instead of Generics

```typescript
// Bad: you lose all type safety
function getFirst(items: any[]): any {
  return items[0];
}

// Good: type safety is preserved
function getFirst<T>(items: T[]): T | undefined {
  return items[0];
}
```

### Mistake 2: Unnecessary Type Parameters

```typescript
// Bad: T is only used once, so it adds no value
function logLength<T extends { length: number }>(item: T): void {
  console.log(item.length);
}

// Good: just use the constraint directly
function logLength(item: { length: number }): void {
  console.log(item.length);
}
```

A good rule: if a type parameter only appears once in the function signature, you probably don't need it.

### Mistake 3: Over-Engineering with Generics

Not everything needs to be generic. If a function only ever works with `GatherEvent`, just type it as `GatherEvent`. Make it generic when you actually reuse it with multiple types.

---

## Key Takeaways

1. **Generics are type parameters.** They let you write functions and interfaces that work with multiple types while preserving type safety.
2. **TypeScript infers generic types from arguments** most of the time. You only need to specify them explicitly when inference isn't possible (like `fetchData<GatherEvent>()`).
3. **`extends` constrains generics** so they must have certain properties. Use `T extends BaseEntity` to require an `id`, `createdAt`, and `updatedAt`.
4. **Utility types are built-in generics.** `Partial<T>`, `Pick<T, K>`, `Omit<T, K>`, and `Record<K, V>` transform types without writing new interfaces.
5. **Utility types compose.** `Partial<Omit<GatherEvent, 'id'>>` is a valid, useful type for form data.
6. **`keyof T` produces a union of property names.** Combined with `extends`, it lets you write functions that only accept valid property keys.
7. **Don't over-genericize.** If a type parameter only appears once in the signature, or the function only works with one type, skip the generic.

---

## Try It Yourself

1. Write a generic `findById<T extends BaseEntity>(items: T[], id: string): T | undefined` function. Test it with arrays of `GatherEvent`, `User`, and `RSVP`.
2. Create an `ApiResponse<T>` interface with `data: T`, `status: number`, `message: string`, and `timestamp: string`.
3. Create a `PaginatedList<T>` interface with `items: T[]`, `total: number`, `page: number`, `pageSize: number`, and `hasNextPage: boolean`.
4. Write a generic `async fetchData<T>(endpoint: string): Promise<ApiResponse<T>>` function that calls `fetch()` and returns typed data.
5. Use `Omit` to create a `CreateEventPayload` type that removes `id`, `createdAt`, `updatedAt`, and `rsvpCount` from `GatherEvent`.
6. Use `Pick` to create an `EventSummary` type with only `id`, `title`, `startDate`, and `rsvpCount`.
7. Combine `Partial` and `Omit` to create an `EventFormData` type for a partially-filled event creation form.

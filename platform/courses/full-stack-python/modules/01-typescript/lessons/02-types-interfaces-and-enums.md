---
title: "Types, Interfaces, and Enums"
estimatedMinutes: 35
isFreePreview: false
---

# Types, Interfaces, and Enums

In the last lesson, you saw how TypeScript catches bugs at compile time using type annotations. Now it's time to learn the full type system. You'll go from basic primitive annotations to building a complete set of domain types for the Gather event platform.

By the end of this lesson, you'll be able to model any real-world data structure in TypeScript: events, users, RSVPs, API payloads, form state, and more. You'll know when to use interfaces vs type aliases, why union types often beat enums, and how to use optional and readonly properties to express exactly what your data looks like.

---

## Primitive Type Annotations

TypeScript has the same primitive types as JavaScript, plus a few extras:

```typescript
// The basics
let eventTitle: string = 'Brooklyn Tech Meetup';
let capacity: number = 50;
let isPublic: boolean = true;

// null and undefined are their own types
let cancelledAt: null = null;
let description: undefined = undefined;

// Two TypeScript-specific types you'll use often
let eventId: string | null = null;     // Union type (covered below)
let metadata: unknown = fetchFromAPI(); // Safe "I don't know yet" type
```

The `: string` after a variable name is a **type annotation**. It tells TypeScript (and anyone reading your code) what type of value this variable holds.

### When You Don't Need Annotations: Type Inference

TypeScript is smart. If you assign a value at declaration, TypeScript infers the type automatically:

```typescript
// TypeScript infers these types -- no annotation needed
let title = 'Brooklyn Tech Meetup';   // inferred as string
let capacity = 50;                     // inferred as number
let isPublic = true;                   // inferred as boolean
const maxEvents = 100;                 // inferred as 100 (literal type, because const)

// Hover over these in VS Code to see the inferred types
```

**Rule of thumb:** Don't annotate when TypeScript can infer. Add annotations when:
- The type isn't obvious from the value (function parameters, return types)
- You want to be explicit for readability
- You're declaring a variable without initializing it
- The inferred type is too narrow or too wide

```typescript
// Annotation needed: no initial value
let nextEventDate: Date;

// Annotation needed: function parameters
function greet(name: string): string {
  return `Welcome to Gather, ${name}!`;
}

// No annotation needed: return type is inferred from the return statement
function add(a: number, b: number) {
  return a + b; // TypeScript infers return type as number
}
```

---

## Arrays and Tuples

### Arrays

Two syntaxes, same result:

```typescript
// Both are equivalent. Use whichever your team prefers.
const eventIds: string[] = ['evt_001', 'evt_002', 'evt_003'];
const capacities: Array<number> = [50, 100, 200];

// TypeScript infers array types too
const tags = ['tech', 'community', 'free']; // inferred as string[]
```

With `"noUncheckedIndexedAccess": true` in your tsconfig (which you should always enable), accessing an array element returns `T | undefined`:

```typescript
const first = eventIds[0]; // Type: string | undefined
// You must check before using it
if (first !== undefined) {
  console.log(first.toUpperCase()); // Safe: TypeScript knows it's string here
}
```

### Tuples

Tuples are fixed-length arrays where each position has a specific type:

```typescript
// A coordinate pair: [latitude, longitude]
const wbbHQ: [number, number] = [40.7024, -73.9875];

// A key-value pair: [key, value]
const setting: [string, boolean] = ['emailNotifications', true];

// Named tuples (for readability)
type Coordinate = [lat: number, lng: number];
const eventLocation: Coordinate = [40.7024, -73.9875];
```

Tuples are useful when you need a lightweight pair or triple without creating a full object type.

---

## Interfaces

Interfaces define the shape of an object. They're the primary tool you'll use to model domain data in TypeScript.

```typescript
interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  joinedAt: string;
}
```

Now any object typed as `User` must have exactly these properties with these types:

```typescript
const member: User = {
  id: 'usr_001',
  email: 'maya@example.com',
  displayName: 'Maya Johnson',
  avatarUrl: 'https://gather.app/avatars/maya.jpg',
  joinedAt: '2026-01-15T10:00:00Z',
};
```

Missing a property? TypeScript errors. Added an extra property in an object literal? TypeScript errors. Wrong type on any property? TypeScript errors. This is the safety net.

### Optional Properties

Not every property is always present. Use `?` to mark optional properties:

```typescript
interface GatherEvent {
  id: string;
  title: string;
  description?: string;        // Optional: might not have a description yet
  startDate: string;
  endDate?: string;             // Optional: some events have no set end time
  location: string;
  capacity: number;
  rsvpCount: number;
  imageUrl?: string;            // Optional: not every event has a cover image
  isPublic: boolean;
  organizerId: string;
}
```

Optional properties have type `T | undefined`. When you access `event.description`, TypeScript knows it could be `undefined` and will require you to handle that case.

### Readonly Properties

Use `readonly` for properties that should never be reassigned after creation:

```typescript
interface GatherEvent {
  readonly id: string;          // Can't accidentally overwrite the ID
  readonly organizerId: string; // Event organizer doesn't change
  title: string;                // Can be updated
  startDate: string;            // Can be rescheduled
  // ...
}

const event: GatherEvent = {
  id: 'evt_001',
  organizerId: 'usr_001',
  title: 'Tech Meetup',
  startDate: '2026-04-15T18:00:00Z',
};

event.title = 'Brooklyn Tech Meetup'; // OK: title is mutable
event.id = 'evt_999';                 // ERROR: Cannot assign to 'id' because it is read-only
```

### Interface Extension

Interfaces can extend other interfaces. This is how you build type hierarchies without duplication:

```typescript
interface BaseEntity {
  readonly id: string;
  createdAt: string;
  updatedAt: string;
}

interface User extends BaseEntity {
  email: string;
  displayName: string;
  avatarUrl?: string;
}

interface GatherEvent extends BaseEntity {
  title: string;
  startDate: string;
  location: string;
  capacity: number;
  organizerId: string;
}

// User now has: id, createdAt, updatedAt, email, displayName, avatarUrl
// GatherEvent now has: id, createdAt, updatedAt, title, startDate, location, capacity, organizerId
```

Every entity in your system has `id`, `createdAt`, and `updatedAt`. You define them once in `BaseEntity` and extend from there.

---

## Type Aliases

Type aliases create a name for any type. They look similar to interfaces but have different capabilities:

```typescript
type EventId = string;
type Coordinate = [number, number];
type EventCallback = (event: GatherEvent) => void;
```

### Interfaces vs Type Aliases: When to Use Each

This is one of the most common questions in TypeScript. Here's the practical answer:

**Use interfaces for object shapes** (things with properties):

```typescript
// Interface: ideal for objects
interface User {
  id: string;
  email: string;
  displayName: string;
}

// Interfaces can be extended
interface AdminUser extends User {
  permissions: string[];
}

// Interfaces support declaration merging
interface User {
  role: string; // This adds 'role' to the existing User interface
}
```

**Use type aliases for everything else** (unions, tuples, primitives, computed types):

```typescript
// Type alias: unions, tuples, primitives
type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };
type EventId = string;
type Coordinate = [number, number];
```

The key technical difference: interfaces support **declaration merging** (defining the same interface twice adds properties to it), while type aliases do not. For most application code this doesn't matter. The simple rule: interfaces for objects, type aliases for everything else.

---

## Union Types (and Why They Often Beat Enums)

A **union type** represents a value that can be one of several types:

```typescript
// A variable that's either a string or null
let selectedEventId: string | null = null;

// A parameter that accepts multiple types
function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString();
}
```

### String Literal Unions

When a value can only be one of a specific set of strings, use a **string literal union**:

```typescript
type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
type EventCategory = 'workshop' | 'meetup' | 'conference' | 'social' | 'hackathon';
type RSVPStatus = 'attending' | 'waitlisted' | 'declined';

interface GatherEvent {
  id: string;
  title: string;
  status: EventStatus;
  category: EventCategory;
}

const event: GatherEvent = {
  id: 'evt_001',
  title: 'Code & Coffee',
  status: 'published',
  category: 'social',
};

event.status = 'archived'; // ERROR: Type '"archived"' is not assignable to type 'EventStatus'
```

### Why Not Enums?

TypeScript has an `enum` keyword, and you'll encounter it in older codebases:

```typescript
// Enum approach (you'll see this, but shouldn't write it for new code)
enum EventStatus {
  Draft = 'draft',
  Published = 'published',
  Cancelled = 'cancelled',
  Completed = 'completed',
}
```

Three reasons to prefer union types over enums:

**1. Enums generate runtime code.** Unlike every other TypeScript feature, enums are not erased at compile time. They emit JavaScript objects. Union types are fully erased.

```typescript
// This enum compiles to a JavaScript object:
enum Direction { Up = 'UP', Down = 'DOWN' }

// Generated JavaScript:
var Direction;
(function (Direction) {
  Direction["Up"] = "UP";
  Direction["Down"] = "DOWN";
})(Direction || (Direction = {}));

// This union type compiles to... nothing. It's erased completely:
type Direction = 'UP' | 'DOWN';
```

**2. Enums require imports.** To use an enum value, you must import the enum. With a union type, you just write the string literal.

**3. Enums don't play well with plain strings.** If your API returns `"draft"` as a string, you can't directly compare it to `EventStatus.Draft` without assertions. Union types work naturally with string values.

The exception: numeric enums can be useful for bit flags or when you genuinely need runtime access to the set of values. For 95% of cases, string literal unions are the better choice.

---

## Building the Gather Type System

Let's put everything together and build the core types for the Gather platform. These types will follow you through the rest of the module and course.

```typescript
// types/gather.ts

/** Base entity with standard metadata fields */
interface BaseEntity {
  readonly id: string;
  createdAt: string;
  updatedAt: string;
}

/** Geographic coordinates */
type Coordinate = [lat: number, lng: number];

// ─── Event Types ───────────────────────────────────────────

type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
type EventCategory = 'workshop' | 'meetup' | 'conference' | 'social' | 'hackathon';

interface EventLocation {
  name: string;
  address: string;
  city: string;
  state: string;
  coordinates?: Coordinate;
}

interface GatherEvent extends BaseEntity {
  title: string;
  description?: string;
  slug: string;
  status: EventStatus;
  category: EventCategory;
  startDate: string;
  endDate?: string;
  location: EventLocation;
  capacity: number;
  rsvpCount: number;
  imageUrl?: string;
  isPublic: boolean;
  tags: string[];
  organizerId: string;
}

// ─── User Types ────────────────────────────────────────────

type UserRole = 'attendee' | 'organizer' | 'admin';

interface User extends BaseEntity {
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  role: UserRole;
  eventsAttended: number;
  eventsOrganized: number;
}

// ─── RSVP Types ────────────────────────────────────────────

type RSVPStatus = 'attending' | 'waitlisted' | 'declined';

interface RSVP extends BaseEntity {
  eventId: string;
  userId: string;
  status: RSVPStatus;
  respondedAt: string;
  plusOne: boolean;
  note?: string;
}
```

Notice how each type is focused and composable. `EventLocation` is its own interface because it has multiple properties and could be reused elsewhere (user profiles, venue directories). The `BaseEntity` interface eliminates duplication across all entity types.

---

## Narrowing Union Types

When you have a union type, TypeScript needs you to **narrow** it before you can use type-specific operations:

```typescript
function getEventLabel(status: EventStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'published':
      return 'Live';
    case 'cancelled':
      return 'Cancelled';
    case 'completed':
      return 'Completed';
  }
}
```

With `strict` mode enabled, TypeScript verifies that your switch statement is **exhaustive**, covering every possible value of the union. If you add a new status like `'archived'` to `EventStatus` but forget to add a case, TypeScript will error.

You can make exhaustiveness checking even more explicit:

```typescript
function getEventLabel(status: EventStatus): string {
  switch (status) {
    case 'draft': return 'Draft';
    case 'published': return 'Live';
    case 'cancelled': return 'Cancelled';
    case 'completed': return 'Completed';
    default:
      // If all cases are handled, 'status' is type 'never' here.
      // If you add a new status and forget a case, this line will error.
      const exhaustiveCheck: never = status;
      throw new Error(`Unhandled status: ${exhaustiveCheck}`);
  }
}
```

We'll cover more narrowing techniques in Lesson 5. For now, know that TypeScript pushes you toward handling every case, which is exactly what production code needs.

---

## Index Signatures and Record

Sometimes you need an object where the keys aren't known ahead of time:

```typescript
// Index signature: keys are strings, values are numbers
interface RSVPCounts {
  [eventId: string]: number;
}

const counts: RSVPCounts = {
  'evt_001': 48,
  'evt_002': 112,
  'evt_003': 25,
};

// The Record utility type does the same thing more concisely
type RSVPCountMap = Record<string, number>;

// Record with a union key type is even more powerful
type EventStatusCounts = Record<EventStatus, number>;

const statusCounts: EventStatusCounts = {
  draft: 3,
  published: 12,
  cancelled: 1,
  completed: 8,
}; // Must include ALL four statuses -- TypeScript enforces this
```

`Record<K, V>` creates an object type with keys of type `K` and values of type `V`. When `K` is a union type, every member of the union must be present as a key. This is useful for lookup tables and mappings.

---

## Key Takeaways

1. **TypeScript infers types when possible.** Only add annotations when the type isn't obvious, for function parameters, or when declaring without initializing.
2. **Use interfaces for object shapes** and type aliases for unions, tuples, and computed types.
3. **Prefer string literal unions over enums.** Unions are erased at compile time, require no imports, and work naturally with string values from APIs.
4. **Optional properties (`?`)** model data that might not be present. Readonly properties prevent accidental mutation.
5. **Interface extension (`extends`)** eliminates duplication across related types, like `BaseEntity` for shared `id`, `createdAt`, and `updatedAt` fields.
6. **`Record<K, V>`** creates typed key-value mappings. When the key is a union, TypeScript ensures every key is present.
7. **Exhaustive switch statements** on union types guarantee you handle every case, and TypeScript will tell you if you miss one.

---

## Try It Yourself

1. Create a `types/gather.ts` file in your Gather project with the `BaseEntity`, `GatherEvent`, `User`, and `RSVP` interfaces from this lesson.
2. Add a `Venue` interface with `name`, `address`, `capacity`, `amenities` (array of strings), and an optional `website` property. Make it extend `BaseEntity`.
3. Create a `NotificationPreference` type alias as a union: `'email' | 'push' | 'sms' | 'none'`. Add it as a property on `User`.
4. Write a function `getStatusBadgeColor(status: EventStatus): string` that returns a CSS color for each status. Use a switch statement and the `never` exhaustiveness check.
5. Create a `Record<EventCategory, string>` that maps each category to an emoji. TypeScript should error if you leave any category out.
6. Try adding a new value to `EventCategory` (like `'panel'`) and see how many places TypeScript flags as needing updates.

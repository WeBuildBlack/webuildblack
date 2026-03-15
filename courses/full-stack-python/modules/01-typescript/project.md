---
title: "Module Project: Type-Safe API Client"
estimatedMinutes: 75
---

# Type-Safe API Client

Convert an untyped JavaScript API client for the Gather event platform into a fully typed TypeScript module with zero uses of `any`.

## Overview

You've spent the module learning TypeScript's type system: interfaces, generics, utility types, discriminated unions, and type guards. Now you're going to apply all of it at once. You'll take a working but untyped JavaScript API client and convert it to TypeScript, adding type safety at every layer. The final client will have generic request methods, discriminated union error handling, typed endpoint functions, and custom type guards for validating API responses. If it compiles, it works.

## What You'll Practice

- Defining domain interfaces with optional and readonly properties (from Lesson 2: Types, Interfaces, and Enums)
- Writing generic functions and interfaces for reusable API wrappers (from Lesson 3: Generics)
- Using utility types (`Omit`, `Partial`, `Pick`) to derive request/response types (from Lesson 3: Generics)
- Discriminated union result types for explicit error handling (from Lesson 5: Advanced Type Patterns)
- Custom type guard functions for validating API responses (from Lesson 5: Advanced Type Patterns)
- Template literal types for API route validation (from Lesson 5: Advanced Type Patterns)

## Prerequisites

- **Node.js 18+** installed
- **TypeScript 5+** installed globally or as a dev dependency
- Completed all five lessons in this module (or equivalent TypeScript knowledge)

## Project Setup

```bash
mkdir gather-api-client && cd gather-api-client
npm init -y
npm install --save-dev typescript
npx tsc --init
```

Update your `tsconfig.json` with these settings:

```typescript
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "outDir": "./dist",
    "sourceMap": true,
    "declaration": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

Create the project files:

```bash
mkdir src
touch src/types.ts src/client.ts src/endpoints.ts src/guards.ts src/index.ts
```

## Step-by-Step Instructions

### Step 1: Define the Domain Types

Create `src/types.ts` with the core Gather domain types. Start from the scaffold below and fill in the TODO sections:

```typescript
// src/types.ts

// ─── Base Types ────────────────────────────────────────────

// TODO: Define a BaseEntity interface with:
//   - readonly id: string
//   - createdAt: string
//   - updatedAt: string

// TODO: Define an EventStatus type alias as a string literal union:
//   'draft' | 'published' | 'cancelled' | 'completed'

// TODO: Define an EventCategory type alias as a string literal union:
//   'workshop' | 'meetup' | 'conference' | 'social' | 'hackathon'

// TODO: Define an RSVPStatus type alias:
//   'attending' | 'waitlisted' | 'declined'

// TODO: Define a UserRole type alias:
//   'attendee' | 'organizer' | 'admin'

// ─── Domain Interfaces ────────────────────────────────────

// TODO: Define an EventLocation interface with:
//   - name: string
//   - address: string
//   - city: string
//   - state: string
//   - coordinates (optional): [number, number]

// TODO: Define a GatherEvent interface extending BaseEntity with:
//   - title: string
//   - description (optional): string
//   - slug: string
//   - status: EventStatus
//   - category: EventCategory
//   - startDate: string
//   - endDate (optional): string
//   - location: EventLocation
//   - capacity: number
//   - rsvpCount: number
//   - imageUrl (optional): string
//   - isPublic: boolean
//   - tags: string[]
//   - organizerId: string

// TODO: Define a User interface extending BaseEntity with:
//   - email: string
//   - displayName: string
//   - avatarUrl (optional): string
//   - bio (optional): string
//   - role: UserRole
//   - eventsAttended: number
//   - eventsOrganized: number

// TODO: Define an RSVP interface extending BaseEntity with:
//   - eventId: string
//   - userId: string
//   - status: RSVPStatus
//   - respondedAt: string
//   - plusOne: boolean
//   - note (optional): string

// ─── API Types ─────────────────────────────────────────────

// TODO: Define an ApiError interface with:
//   - code: string
//   - message: string
//   - statusCode: number

// TODO: Define an ApiResult<T> discriminated union type:
//   - Success: { ok: true; data: T }
//   - Failure: { ok: false; error: ApiError }

// TODO: Define a PaginatedList<T> interface with:
//   - items: T[]
//   - total: number
//   - page: number
//   - pageSize: number
//   - hasNextPage: boolean

// ─── Payload Types (derived with utility types) ───────────

// TODO: Use Omit to define CreateEventPayload:
//   GatherEvent without id, createdAt, updatedAt, rsvpCount

// TODO: Use Partial + Omit to define UpdateEventPayload:
//   All GatherEvent fields optional, except id/createdAt/updatedAt/rsvpCount removed

// TODO: Use Omit to define CreateRSVPPayload:
//   RSVP without id, createdAt, updatedAt, respondedAt

// Export all types
```

### Step 2: Build the Generic API Client

Create `src/client.ts` with a generic API client class. The client wraps `fetch` and returns `ApiResult<T>` instead of throwing errors:

```typescript
// src/client.ts

// TODO: Import your types from './types'

interface ClientConfig {
  baseUrl: string;
  headers?: Record<string, string>;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean>;
}

// TODO: Implement the ApiClient class
class ApiClient {
  // TODO: Store baseUrl and default headers as private readonly properties

  constructor(config: ClientConfig) {
    // TODO: Initialize baseUrl and headers from config
  }

  // TODO: Implement a private buildUrl method that:
  //   - Takes an endpoint string and optional params Record
  //   - Returns a full URL string with query parameters appended
  //   - Example: buildUrl('/events', { page: '1', limit: '10' })
  //     returns 'https://api.gather.app/v1/events?page=1&limit=10'

  // TODO: Implement a generic request<T> method that:
  //   - Takes an endpoint (string) and options (RequestOptions)
  //   - Returns Promise<ApiResult<T>>
  //   - Uses fetch() to make the HTTP request
  //   - Returns { ok: true, data: T } on success
  //   - Returns { ok: false, error: ApiError } on HTTP errors
  //   - Returns { ok: false, error: ApiError } on network errors
  //   - NEVER throws -- all errors are returned as ApiResult

  // TODO: Implement convenience methods that delegate to request<T>:
  //   - get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<ApiResult<T>>
  //   - post<T>(endpoint: string, body: unknown): Promise<ApiResult<T>>
  //   - put<T>(endpoint: string, body: unknown): Promise<ApiResult<T>>
  //   - patch<T>(endpoint: string, body: unknown): Promise<ApiResult<T>>
  //   - delete<T>(endpoint: string): Promise<ApiResult<T>>
}

export { ApiClient };
export type { ClientConfig, RequestOptions };
```

### Step 3: Write Type Guard Functions

Create `src/guards.ts` with type guard functions that validate unknown data from API responses:

```typescript
// src/guards.ts

// TODO: Import your types from './types'

// TODO: Implement isGatherEvent(value: unknown): value is GatherEvent
//   Check that value is a non-null object with these required properties:
//   - id (string), title (string), slug (string), status (valid EventStatus),
//     startDate (string), capacity (number), rsvpCount (number),
//     isPublic (boolean), organizerId (string)
//   Hint: Create a helper function isValidStatus(s: unknown): s is EventStatus
//   that checks if a string is one of the valid status values

// TODO: Implement isUser(value: unknown): value is User
//   Check for: id (string), email (string), displayName (string),
//   role (valid UserRole), eventsAttended (number), eventsOrganized (number)

// TODO: Implement isApiError(value: unknown): value is ApiError
//   Check for: code (string), message (string), statusCode (number)

// TODO: Implement a generic isPaginatedList<T> guard:
//   isPaginatedList(value: unknown, itemGuard: (item: unknown) => item is T): value is PaginatedList<T>
//   Check that value has items (array where every element passes itemGuard),
//   total (number), page (number), pageSize (number), hasNextPage (boolean)

// Export all guards
```

### Step 4: Create Typed Endpoint Functions

Create `src/endpoints.ts` with typed functions for each API endpoint. These wrap the generic client so callers never need to specify type parameters:

```typescript
// src/endpoints.ts

// TODO: Import ApiClient from './client'
// TODO: Import types from './types'
// TODO: Import guards from './guards'

// TODO: Create a function createEventEndpoints(client: ApiClient) that returns
//   an object with these typed methods:

//   list(params?: { page?: number; limit?: number; category?: EventCategory; status?: EventStatus })
//     -> Promise<ApiResult<PaginatedList<GatherEvent>>>
//     Calls client.get<PaginatedList<GatherEvent>>('/events', params)

//   getById(id: string)
//     -> Promise<ApiResult<GatherEvent>>
//     Calls client.get<GatherEvent>(`/events/${id}`)

//   create(payload: CreateEventPayload)
//     -> Promise<ApiResult<GatherEvent>>
//     Calls client.post<GatherEvent>('/events', payload)

//   update(id: string, payload: UpdateEventPayload)
//     -> Promise<ApiResult<GatherEvent>>
//     Calls client.patch<GatherEvent>(`/events/${id}`, payload)

//   remove(id: string)
//     -> Promise<ApiResult<void>>
//     Calls client.delete<void>(`/events/${id}`)

// TODO: Create a function createRSVPEndpoints(client: ApiClient) that returns
//   an object with these typed methods:

//   listForEvent(eventId: string)
//     -> Promise<ApiResult<PaginatedList<RSVP>>>
//     Calls client.get<PaginatedList<RSVP>>(`/events/${eventId}/rsvps`)

//   create(payload: CreateRSVPPayload)
//     -> Promise<ApiResult<RSVP>>
//     Calls client.post<RSVP>(`/events/${payload.eventId}/rsvps`, payload)

//   cancel(eventId: string, rsvpId: string)
//     -> Promise<ApiResult<void>>
//     Calls client.delete<void>(`/events/${eventId}/rsvps/${rsvpId}`)

// TODO: Create a function createUserEndpoints(client: ApiClient) that returns
//   an object with these typed methods:

//   me()
//     -> Promise<ApiResult<User>>
//     Calls client.get<User>('/users/me')

//   getById(id: string)
//     -> Promise<ApiResult<User>>
//     Calls client.get<User>(`/users/${id}`)

//   update(id: string, payload: Partial<Pick<User, 'displayName' | 'bio' | 'avatarUrl'>>)
//     -> Promise<ApiResult<User>>
//     Calls client.patch<User>(`/users/${id}`, payload)

// Export all endpoint creators
```

### Step 5: Assemble the SDK

Create `src/index.ts` that ties everything together into a single SDK entry point:

```typescript
// src/index.ts

// TODO: Import ApiClient and ClientConfig from './client'
// TODO: Import endpoint creators from './endpoints'
// TODO: Re-export all types from './types'
// TODO: Re-export all guards from './guards'

// TODO: Define a GatherSDK interface with:
//   - events: (return type of createEventEndpoints)
//   - rsvps: (return type of createRSVPEndpoints)
//   - users: (return type of createUserEndpoints)

// TODO: Implement createGatherSDK(config: ClientConfig): GatherSDK
//   - Creates an ApiClient instance
//   - Returns an object with events, rsvps, and users endpoint groups

// Export createGatherSDK
```

### Step 6: Verify with a Usage Script

Create `src/demo.ts` to verify your types work end-to-end. This file won't run (no real API), but it must compile with zero errors:

```typescript
// src/demo.ts

import { createGatherSDK } from './index';
import type { GatherEvent, EventCategory, ApiResult, PaginatedList } from './types';

const sdk = createGatherSDK({
  baseUrl: 'https://api.gather.app/v1',
  headers: { 'Authorization': 'Bearer test-token' },
});

async function demo() {
  // List events -- result is ApiResult<PaginatedList<GatherEvent>>
  const eventsResult = await sdk.events.list({ page: 1, category: 'meetup' });

  if (eventsResult.ok) {
    // TODO: TypeScript should know eventsResult.data is PaginatedList<GatherEvent>
    //   Log the total count and the title of each event
    console.log(`Total events: ${eventsResult.data.total}`);
    for (const event of eventsResult.data.items) {
      console.log(`- ${event.title} (${event.rsvpCount}/${event.capacity})`);
    }
  } else {
    // TODO: TypeScript should know eventsResult.error is ApiError
    console.error(`Error ${eventsResult.error.statusCode}: ${eventsResult.error.message}`);
  }

  // Create an event -- TypeScript enforces CreateEventPayload shape
  const createResult = await sdk.events.create({
    title: 'Brooklyn Tech Meetup',
    slug: 'brooklyn-tech-meetup',
    status: 'draft',
    category: 'meetup',
    startDate: '2026-04-15T18:00:00Z',
    location: {
      name: 'WBB HQ',
      address: '147 Front Street',
      city: 'Brooklyn',
      state: 'NY',
    },
    capacity: 50,
    isPublic: true,
    tags: ['tech', 'community'],
    organizerId: 'usr_001',
  });

  if (createResult.ok) {
    console.log(`Created event: ${createResult.data.id}`);

    // Update just the title -- Partial payload
    const updateResult = await sdk.events.update(createResult.data.id, {
      title: 'Brooklyn Tech Meetup: April Edition',
    });

    if (updateResult.ok) {
      console.log(`Updated: ${updateResult.data.title}`);
    }
  }

  // Get current user
  const userResult = await sdk.users.me();
  if (userResult.ok) {
    console.log(`Logged in as ${userResult.data.displayName}`);
  }
}

demo();
```

### Step 7: Compile and Verify

Run the TypeScript compiler. Your goal: **zero errors, zero `any` types**.

```bash
npx tsc --noEmit
```

If you see errors, read them carefully. TypeScript error messages tell you exactly what's wrong and where. Fix each one until the build passes cleanly.

Then check for accidental `any` usage:

```bash
npx tsc --noEmit --strict 2>&1
```

Search your source files for any remaining `any`:

```bash
grep -rn ": any\|as any\|<any>" src/
```

If that command produces any output, replace each `any` with a proper type.

## Expected Output

After running `npx tsc --noEmit`, you should see:

```
(no output -- clean compilation means no errors)
```

Your `dist/` folder (after running `npx tsc`) should contain:
- `types.js` + `types.d.ts` (types are erased, but declarations are generated)
- `client.js` + `client.d.ts`
- `guards.js` + `guards.d.ts`
- `endpoints.js` + `endpoints.d.ts`
- `index.js` + `index.d.ts`
- `demo.js` + `demo.d.ts`

The `.d.ts` files are your public API type definitions. Anyone importing your SDK gets full autocomplete and type checking.

## Stretch Goals

1. **Add request/response interceptors** to the `ApiClient`. Define an `Interceptor` type as `(config: RequestInit) => RequestInit` for request interceptors and `(response: Response) => Response` for response interceptors. Store them as arrays and run them in sequence. This is how real HTTP clients (like Axios) work.

2. **Add retry logic with typed config.** Create a `RetryConfig` interface with `maxRetries: number`, `retryDelay: number`, and `retryableStatuses: number[]`. Add a `retry` option to the `ClientConfig` and implement automatic retries for failed requests. The retry should only apply to GET requests and only for status codes in the `retryableStatuses` array.

3. **Create a type-safe mock client for testing.** Write a `createMockSDK()` function that returns the same `GatherSDK` interface but resolves with hardcoded data instead of making HTTP calls. Use this to verify that your types are correct without needing a real API. Bonus: use `Partial<GatherEvent>` and `Required` to let callers override specific fields in the mock data.

## Submission Checklist

Your project is done when:

- [ ] All six files exist in `src/`: `types.ts`, `client.ts`, `guards.ts`, `endpoints.ts`, `index.ts`, `demo.ts`
- [ ] `npx tsc --noEmit` produces zero errors
- [ ] `grep -rn "any" src/` returns no matches for `: any`, `as any`, or `<any>`
- [ ] `ApiResult<T>` is a discriminated union with `ok: true` and `ok: false` variants
- [ ] `ApiClient` has generic `get<T>`, `post<T>`, `put<T>`, `patch<T>`, and `delete<T>` methods
- [ ] All endpoint functions return `Promise<ApiResult<T>>` with specific types (not `any` or `unknown`)
- [ ] `CreateEventPayload` and `UpdateEventPayload` are derived from `GatherEvent` using `Omit` and `Partial`
- [ ] At least one type guard function validates unknown data with a `value is T` return type
- [ ] `demo.ts` compiles and demonstrates discriminated union narrowing (`if (result.ok)` pattern)
- [ ] The SDK entry point re-exports all public types for consumers

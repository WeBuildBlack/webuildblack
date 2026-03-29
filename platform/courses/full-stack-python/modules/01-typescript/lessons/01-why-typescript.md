---
title: "Why TypeScript?"
estimatedMinutes: 30
isFreePreview: true
---

# Why TypeScript?

You know JavaScript. You can build full-stack apps with React and Node, query databases, and ship to production. So why learn another language that compiles down to JavaScript anyway?

Because JavaScript lets you ship bugs that TypeScript catches before your code ever runs.

This isn't a theoretical concern. Every production JavaScript codebase has a category of bugs that only appear at runtime: a misspelled property name, a function called with the wrong argument type, an object that's `undefined` when you expected it to have data. TypeScript eliminates these bugs entirely by checking your code at compile time, before it reaches your users.

Throughout this course, you'll be building **Gather**, a community event platform (think Luma or Eventbrite). By the end of this module, you'll have a fully typed foundation for Gather's API client. But first, you need to understand what TypeScript actually is and why production teams treat it as non-negotiable.

---

## A Bug That TypeScript Prevents

Here's a scenario you've probably lived through. You're building an event listing feature and you write this JavaScript:

```javascript
function formatEventDate(event) {
  const date = new Date(event.startDate);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Later, somewhere else in the codebase...
const event = {
  title: 'Brooklyn Tech Meetup',
  start_date: '2026-04-15T18:00:00Z',  // Note: start_date, not startDate
  location: 'WBB HQ',
};

console.log(formatEventDate(event));
// Output: "Invalid Date"
```

The property is `start_date` (snake_case from your API), but the function reads `startDate` (camelCase). JavaScript doesn't complain. It just evaluates `event.startDate` as `undefined`, passes that to `new Date()`, and you get "Invalid Date" on your page. No error in your console. No crash. Just wrong output that a user reports three days later.

Now here's the same code in TypeScript:

```typescript
interface GatherEvent {
  title: string;
  startDate: string;
  location: string;
}

function formatEventDate(event: GatherEvent): string {
  const date = new Date(event.startDate);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const event = {
  title: 'Brooklyn Tech Meetup',
  start_date: '2026-04-15T18:00:00Z',
  location: 'WBB HQ',
};

console.log(formatEventDate(event));
// TypeScript ERROR (before the code ever runs):
// Argument of type '{ title: string; start_date: string; location: string; }'
// is not assignable to parameter of type 'GatherEvent'.
// Object literal may only specify known properties, and 'start_date'
// does not exist in type 'GatherEvent'.
```

TypeScript catches this instantly. Your editor underlines it in red. The build fails. The bug never ships. That's the value proposition in one example.

---

## What TypeScript Actually Is

TypeScript is a **superset of JavaScript** created by Microsoft in 2012. "Superset" means that all valid JavaScript is also valid TypeScript. You can rename a `.js` file to `.ts` and it will (mostly) compile. TypeScript adds one thing on top of JavaScript: a static type system.

Here's the mental model:

```
TypeScript = JavaScript + Static Types
```

When you write TypeScript, you add type annotations to your variables, function parameters, and return values. The TypeScript compiler (`tsc`) reads these annotations, checks that your code is consistent with them, and then strips them out to produce plain JavaScript. The output is regular JS that runs in any browser or Node.js environment.

```typescript
// TypeScript (what you write)
function greet(name: string): string {
  return `Hello, ${name}!`;
}

// JavaScript (what gets compiled)
function greet(name) {
  return `Hello, ${name}!`;
}
```

The type annotations (`: string`) are gone in the output. They exist only at development time to help you catch mistakes. There is zero runtime overhead.

### Key Facts

- **TypeScript compiles to JavaScript.** It targets ES5, ES6, ESNext, or whatever you configure. The output is readable JS.
- **Types are erased at runtime.** There is no TypeScript runtime. Your deployed code is JavaScript.
- **Adoption is massive.** Over 90% of the top 1000 npm packages include TypeScript type definitions. React, Next.js, Express, and Prisma all provide first-class TypeScript support.
- **It's gradual.** You can adopt TypeScript file by file. Strict mode is opt-in. You don't need to type everything on day one.

---

## Why Production Teams Use TypeScript

If it just compiled to JavaScript anyway, why bother? Here are the concrete reasons every production codebase you work on will likely be TypeScript:

### 1. Catch bugs before runtime

You saw this already. Property typos, wrong argument types, null/undefined access, missing return values. TypeScript catches all of these at compile time. In a codebase with 50,000 lines of code and five contributors, this saves hours of debugging per week.

### 2. Self-documenting code

Type annotations serve as living documentation. When you see this function signature:

```typescript
function createEvent(
  title: string,
  startDate: Date,
  capacity: number,
  isPublic: boolean
): Promise<GatherEvent>
```

You know exactly what it expects and what it returns. No need to read the implementation, no need to check the README, no guessing.

### 3. Editor intelligence

TypeScript powers autocomplete, inline documentation, and refactoring tools in VS Code. When you type `event.` and see a dropdown of every available property with their types, that's TypeScript's language server at work. This alone makes you faster.

### 4. Safe refactoring

Renaming a property in a JavaScript codebase is terrifying. You do a find-and-replace, hope you got everything, and pray nothing breaks. In TypeScript, you rename a property in the interface and the compiler immediately tells you every file that needs to be updated. Refactoring goes from scary to routine.

### 5. Better team collaboration

When multiple developers work on the same codebase, types act as contracts between modules. You can change the internals of a function without worrying about breaking callers, as long as the types still match. The compiler enforces the contract.

---

## Setting Up a TypeScript Project

Let's set up a TypeScript project from scratch. You'll use this setup throughout the module.

### Install TypeScript

```bash
mkdir gather-types && cd gather-types
npm init -y
npm install --save-dev typescript
```

### Initialize the Config

```bash
npx tsc --init
```

This creates a `tsconfig.json` file with dozens of commented-out options. Here's a cleaned-up version with the settings that matter for a modern web project:

```typescript
// tsconfig.json
{
  "compilerOptions": {
    // Language & Environment
    "target": "ES2022",              // Output modern JS (your Node/browser supports it)
    "module": "ESNext",              // Use ES modules (import/export)
    "moduleResolution": "bundler",   // Works with Vite, Next.js, esbuild
    "lib": ["ES2022", "DOM"],        // Available globals (browser + modern JS)

    // Type Checking (the important stuff)
    "strict": true,                  // Enable ALL strict checks (this is the big one)
    "noUncheckedIndexedAccess": true, // arr[0] is T | undefined, not just T
    "noUnusedLocals": true,          // Error on unused variables
    "noUnusedParameters": true,      // Error on unused function params

    // Output
    "outDir": "./dist",              // Compiled JS goes here
    "sourceMap": true,               // Generate .map files for debugging
    "declaration": true,             // Generate .d.ts type definition files

    // Module Interop
    "esModuleInterop": true,         // Better CommonJS/ESM compatibility
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,            // Skip type-checking node_modules .d.ts files

    // Path Aliases (optional, but useful)
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### The Options That Matter Most

**`"strict": true`** is the single most important setting. It enables a bundle of strict checks all at once:

| Check | What It Does |
|-------|-------------|
| `strictNullChecks` | `null` and `undefined` are their own types, not assignable to everything |
| `strictFunctionTypes` | Function parameter types are checked correctly |
| `strictBindCallApply` | `bind`, `call`, and `apply` are type-checked |
| `strictPropertyInitialization` | Class properties must be initialized |
| `noImplicitAny` | You must declare types when TypeScript can't infer them |
| `noImplicitThis` | `this` must have a known type |
| `alwaysStrict` | Emits `"use strict"` in every file |

Always use `"strict": true`. If you see a project with it turned off, that project is accumulating type debt.

**`"noUncheckedIndexedAccess": true`** is not included in `strict` but it should be. Without it, accessing an array element like `arr[0]` returns `T`. With it, `arr[0]` returns `T | undefined`, which forces you to handle the case where the index is out of bounds. This catches real bugs.

---

## Your First TypeScript File

Create a file at `src/index.ts`:

```typescript
// src/index.ts

interface GatherEvent {
  id: string;
  title: string;
  startDate: string;
  location: string;
  capacity: number;
  rsvpCount: number;
}

function getAvailableSpots(event: GatherEvent): number {
  return event.capacity - event.rsvpCount;
}

function isEventFull(event: GatherEvent): boolean {
  return getAvailableSpots(event) <= 0;
}

const techMeetup: GatherEvent = {
  id: 'evt_001',
  title: 'Brooklyn Tech Meetup',
  startDate: '2026-04-15T18:00:00Z',
  location: '147 Front Street, Brooklyn',
  capacity: 50,
  rsvpCount: 48,
};

console.log(`${techMeetup.title}: ${getAvailableSpots(techMeetup)} spots left`);
console.log(`Full? ${isEventFull(techMeetup)}`);
```

### Compile and Run

```bash
npx tsc
node dist/index.js
```

Output:

```
Brooklyn Tech Meetup: 2 spots left
Full? false
```

Look at the generated `dist/index.js`. You'll see plain JavaScript with no type annotations. That's TypeScript working as designed: types checked at build time, erased at runtime.

---

## The Gather Codebase

Throughout this module, you'll build the type system for Gather's core domain. By the end, you'll have typed interfaces for events, users, RSVPs, and API responses. You'll use generics to create a type-safe API client. You'll integrate TypeScript with React components.

Here's what you'll type across the five lessons:

| Lesson | Types You'll Build |
|--------|-------------------|
| Lesson 2: Types, Interfaces, Enums | `GatherEvent`, `User`, `RSVP`, `EventStatus`, `EventCategory` |
| Lesson 3: Generics | `ApiResponse<T>`, `PaginatedList<T>`, `fetchData<T>()` |
| Lesson 4: TypeScript with React | `EventCardProps`, `RSVPButtonProps`, `EventFormState` |
| Lesson 5: Advanced Patterns | `ApiResult<T>` (discriminated union), type guards, narrowing |

Each lesson builds on the previous one. By the module project, you'll combine everything into a fully typed API client with zero uses of `any`.

---

## Key Takeaways

1. **TypeScript is a superset of JavaScript** that adds static types. All valid JS is valid TS.
2. **Types are erased at compile time.** There is no runtime overhead. Your deployed code is plain JavaScript.
3. **TypeScript catches entire categories of bugs** before your code runs: property typos, wrong argument types, null access, and more.
4. **`"strict": true` in tsconfig.json is non-negotiable.** It enables all the checks that make TypeScript worth using.
5. **TypeScript makes your editor smarter.** Autocomplete, inline docs, and safe refactoring all depend on type information.
6. **Adoption is gradual.** You can add TypeScript to an existing JS project one file at a time.
7. **Production teams use TypeScript by default.** React, Next.js, and most major frameworks provide first-class TS support.

---

## Try It Yourself

1. Create a new TypeScript project with `npm init -y && npm install --save-dev typescript && npx tsc --init`.
2. Set `"strict": true` and `"noUncheckedIndexedAccess": true` in your `tsconfig.json`.
3. Create a `src/index.ts` file with a `GatherEvent` interface that has at least 6 properties.
4. Write a function that takes a `GatherEvent` and returns a formatted summary string.
5. Deliberately introduce a bug (misspell a property name, pass the wrong type) and observe the compiler error.
6. Compile with `npx tsc` and inspect the generated JavaScript in `dist/`. Notice how the type annotations are stripped out.
7. Try passing `null` to your function. With `strictNullChecks` enabled, what happens?

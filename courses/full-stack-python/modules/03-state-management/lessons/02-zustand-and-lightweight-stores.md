---
title: "Zustand and Lightweight Stores"
estimatedMinutes: 35
---

# Zustand and Lightweight Stores

In the previous lesson, you categorized state and identified that shared UI state (filters, sidebar toggles, active modals) belongs in a lightweight global store. Now you will build those stores with Zustand.

Zustand is a small, fast, and unopinionated state management library. It has no providers, no reducers, and no action type strings. You create a store with a function, consume it with a hook, and update it by calling methods directly. TypeScript integration is first-class. Middleware for persistence, devtools, and immutable updates plugs in cleanly.

By the end of this lesson, you will have built two fully typed Zustand stores for the Gather event platform: a filter store and a UI store. You will understand when Zustand is the right choice and when React Context is enough.

---

## Installing Zustand

```bash
npm install zustand
```

That is the only dependency. Zustand has zero peer dependencies and weighs about 1KB gzipped.

---

## Creating Your First Store

A Zustand store is created with the `create` function. You pass it a callback that receives a `set` function and returns an object with your state and actions:

```typescript
import { create } from 'zustand';

interface CounterStore {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));
```

A few things to notice:

- **`create<CounterStore>`** takes a type parameter. This gives you full type safety on the store's shape and every method.
- **`set`** is how you update state. You can pass a partial object (`set({ count: 0 })`) or a function that receives the current state and returns a partial update (`set((state) => ({ count: state.count + 1 }))`).
- **Actions live in the store.** There are no separate action creators or dispatch functions. You call `increment()` directly.
- **No Provider required.** Unlike React Context, you do not need to wrap your component tree in a provider. The store exists outside of React and any component can access it.

### Using the Store in Components

```tsx
function Counter() {
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);
  const reset = useCounterStore((state) => state.reset);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+1</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

Notice the **selector pattern**: `useCounterStore((state) => state.count)`. This is important. By selecting only the `count` value, this component will only re-render when `count` changes. If you called `useCounterStore()` without a selector, the component would re-render on every store update, including changes to unrelated fields.

### Selector Best Practices

```typescript
// Good: component only re-renders when count changes
const count = useCounterStore((state) => state.count);

// Good: selecting a function (functions are stable references)
const increment = useCounterStore((state) => state.increment);

// Bad: selects the entire store, re-renders on ANY change
const store = useCounterStore();

// Good: select multiple values with shallow comparison
import { useShallow } from 'zustand/react/shallow';

const { count, increment } = useCounterStore(
  useShallow((state) => ({ count: state.count, increment: state.increment }))
);
```

The `useShallow` import is critical when you select multiple values into an object. Without it, Zustand creates a new object reference on every render, causing unnecessary re-renders. `useShallow` performs a shallow comparison of the selected values.

---

## Building the Gather Filter Store

Now for something real. Gather needs a filter store that tracks the active category, date range, and search text. Multiple components need to read these values (the event list, the filter sidebar, the active filter chips), and multiple components need to update them.

```typescript
// src/stores/useFilterStore.ts
import { create } from 'zustand';

interface DateRange {
  start: string; // ISO date string, empty string if unset
  end: string;
}

interface FilterState {
  category: string;
  dateRange: DateRange;
  searchText: string;
}

interface FilterActions {
  setCategory: (category: string) => void;
  setDateRange: (range: DateRange) => void;
  setSearchText: (text: string) => void;
  clearFilters: () => void;
}

type FilterStore = FilterState & FilterActions;

const initialState: FilterState = {
  category: '',
  dateRange: { start: '', end: '' },
  searchText: '',
};

export const useFilterStore = create<FilterStore>((set) => ({
  ...initialState,

  setCategory: (category) => set({ category }),

  setDateRange: (dateRange) => set({ dateRange }),

  setSearchText: (searchText) => set({ searchText }),

  clearFilters: () => set(initialState),
}));
```

Separating `FilterState` from `FilterActions` into distinct interfaces is a pattern worth adopting. It makes the store's shape self-documenting: here is the data, and here is what you can do with it. The `initialState` constant also gives you a clean way to reset.

### Consuming the Filter Store

Here is how the filter sidebar and the event list both consume this store:

```tsx
// src/components/FilterSidebar.tsx
'use client';

import { useFilterStore } from '@/stores/useFilterStore';

const CATEGORIES = ['Tech', 'Art', 'Music', 'Food', 'Career', 'Community'];

export function FilterSidebar() {
  const category = useFilterStore((s) => s.category);
  const searchText = useFilterStore((s) => s.searchText);
  const setCategory = useFilterStore((s) => s.setCategory);
  const setSearchText = useFilterStore((s) => s.setSearchText);
  const clearFilters = useFilterStore((s) => s.clearFilters);

  return (
    <aside aria-label="Event filters">
      <div>
        <label htmlFor="search">Search events</label>
        <input
          id="search"
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search by title or location..."
        />
      </div>

      <fieldset>
        <legend>Category</legend>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(category === cat ? '' : cat)}
            aria-pressed={category === cat}
          >
            {cat}
          </button>
        ))}
      </fieldset>

      <button onClick={clearFilters}>Clear all filters</button>
    </aside>
  );
}
```

```tsx
// src/components/EventList.tsx
'use client';

import { useFilterStore } from '@/stores/useFilterStore';
import { useShallow } from 'zustand/react/shallow';

export function EventList({ events }: { events: GatherEvent[] }) {
  const { category, searchText, dateRange } = useFilterStore(
    useShallow((s) => ({
      category: s.category,
      searchText: s.searchText,
      dateRange: s.dateRange,
    }))
  );

  const filtered = events.filter((event) => {
    if (category && event.category !== category) return false;
    if (searchText && !event.title.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }
    if (dateRange.start && event.date < dateRange.start) return false;
    if (dateRange.end && event.date > dateRange.end) return false;
    return true;
  });

  return (
    <ul>
      {filtered.map((event) => (
        <li key={event.id}>{event.title}</li>
      ))}
    </ul>
  );
}
```

The filter sidebar writes to the store. The event list reads from it. Neither component knows about the other. No prop drilling. No context providers to wrap around a shared ancestor.

---

## Building the Gather UI Store

Gather also needs a UI store for layout state: whether the sidebar is open, which modal is active, and similar toggles.

```typescript
// src/stores/useUIStore.ts
import { create } from 'zustand';

type ModalType = 'createEvent' | 'rsvpConfirm' | 'shareLink' | null;

interface UIStore {
  sidebarOpen: boolean;
  activeModal: ModalType;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (modal: ModalType) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  activeModal: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
}));
```

Using a union type for `ModalType` is more type-safe than a plain string. TypeScript will catch any typo when you call `openModal('createEvetn')` because that string is not in the union.

---

## Zustand Middleware

Zustand supports middleware that wraps the store creation function to add behavior. Three middleware options are especially useful.

### persist: Save State to localStorage

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FilterStore {
  category: string;
  searchText: string;
  setCategory: (category: string) => void;
  setSearchText: (text: string) => void;
}

export const useFilterStore = create<FilterStore>()(
  persist(
    (set) => ({
      category: '',
      searchText: '',
      setCategory: (category) => set({ category }),
      setSearchText: (searchText) => set({ searchText }),
    }),
    {
      name: 'gather-filters', // localStorage key
      partialState: ['category'], // only persist category, not searchText
    }
  )
);
```

Note the extra `()` after `create<FilterStore>()`. When using middleware, you call `create` as a curried function. This is a TypeScript requirement for proper type inference through the middleware chain.

The `persist` middleware serializes state to `localStorage` (by default) and restores it on page load. The `partialState` option lets you choose which fields to persist. You probably want to persist the selected category across sessions, but not the search text.

### devtools: Connect to Redux DevTools

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useUIStore = create<UIStore>()(
  devtools(
    (set) => ({
      sidebarOpen: true,
      activeModal: null,
      toggleSidebar: () =>
        set(
          (state) => ({ sidebarOpen: !state.sidebarOpen }),
          undefined,
          'toggleSidebar' // action name in DevTools
        ),
      openModal: (modal) =>
        set({ activeModal: modal }, undefined, 'openModal'),
      closeModal: () =>
        set({ activeModal: null }, undefined, 'closeModal'),
    }),
    { name: 'UIStore' } // store name in DevTools
  )
);
```

The third argument to `set` is the action name that appears in Redux DevTools. This gives you time-travel debugging for your Zustand stores at zero extra cost.

### immer: Immutable Updates with Mutable Syntax

For stores with nested state, writing immutable updates gets verbose. The `immer` middleware lets you write mutations directly:

```bash
npm install immer
```

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface EventDraftStore {
  draft: {
    title: string;
    details: {
      location: string;
      capacity: number;
    };
    tags: string[];
  };
  updateTitle: (title: string) => void;
  updateLocation: (location: string) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
}

export const useEventDraftStore = create<EventDraftStore>()(
  immer((set) => ({
    draft: {
      title: '',
      details: { location: '', capacity: 50 },
      tags: [],
    },

    updateTitle: (title) =>
      set((state) => {
        state.draft.title = title; // Looks like mutation, but immer makes it immutable
      }),

    updateLocation: (location) =>
      set((state) => {
        state.draft.details.location = location; // Nested update, no spread needed
      }),

    addTag: (tag) =>
      set((state) => {
        state.draft.tags.push(tag); // Array push, immer handles immutability
      }),

    removeTag: (tag) =>
      set((state) => {
        state.draft.tags = state.draft.tags.filter((t) => t !== tag);
      }),
  }))
);
```

Without immer, the `updateLocation` action would require spreading at every nesting level: `set((state) => ({ draft: { ...state.draft, details: { ...state.draft.details, location } } }))`. Immer eliminates this entirely.

### Combining Middleware

Middleware composes by nesting:

```typescript
export const useFilterStore = create<FilterStore>()(
  devtools(
    persist(
      (set) => ({
        // ... store definition
      }),
      { name: 'gather-filters' }
    ),
    { name: 'FilterStore' }
  )
);
```

The outermost middleware runs first. Put `devtools` on the outside so it can observe everything, and `persist` on the inside so it serializes the actual state.

---

## The Slice Pattern for Large Stores

As an application grows, a single store can become unwieldy. The slice pattern splits a large store into independent slices that are combined into one store:

```typescript
// src/stores/slices/filterSlice.ts
import type { StateCreator } from 'zustand';

export interface FilterSlice {
  category: string;
  searchText: string;
  setCategory: (category: string) => void;
  setSearchText: (text: string) => void;
}

export const createFilterSlice: StateCreator<FilterSlice> = (set) => ({
  category: '',
  searchText: '',
  setCategory: (category) => set({ category }),
  setSearchText: (searchText) => set({ searchText }),
});
```

```typescript
// src/stores/slices/uiSlice.ts
import type { StateCreator } from 'zustand';

export interface UISlice {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
});
```

```typescript
// src/stores/useAppStore.ts
import { create } from 'zustand';
import { createFilterSlice, type FilterSlice } from './slices/filterSlice';
import { createUISlice, type UISlice } from './slices/uiSlice';

type AppStore = FilterSlice & UISlice;

export const useAppStore = create<AppStore>()((...args) => ({
  ...createFilterSlice(...args),
  ...createUISlice(...args),
}));
```

Each slice is defined independently with its own interface and creator function. The combined store merges them with the spread operator. Components can still select from any slice:

```typescript
const category = useAppStore((s) => s.category); // from FilterSlice
const sidebarOpen = useAppStore((s) => s.sidebarOpen); // from UISlice
```

Use the slice pattern when a single store file exceeds 100-150 lines. For Gather, keeping separate `useFilterStore` and `useUIStore` files is simpler than combining them. The slice pattern shines in larger applications with five or more distinct state domains.

---

## Zustand vs. React Context: When to Use Each

Both Zustand and React Context can share state across components. Here is how to choose:

| Criteria | React Context | Zustand |
|----------|--------------|---------|
| Re-render behavior | All consumers re-render when any context value changes | Components re-render only when their selected value changes |
| Provider requirement | Must wrap components in a Provider | No Provider needed |
| Middleware | None built-in | persist, devtools, immer, and custom |
| DevTools | React DevTools only | Redux DevTools integration |
| Server Components | Works with "use client" boundary | Works with "use client" boundary |
| Setup complexity | Low (createContext + Provider) | Low (create + hook) |
| Best for | Theme, locale, auth status (infrequent changes) | Filters, UI toggles, any state that changes often |

**Use React Context when:**
- State changes infrequently (theme, locale, authenticated user)
- You want co-location with a specific component subtree (compound components from Module 02)
- You do not need middleware or DevTools
- The provider wraps a small subtree, not the entire app

**Use Zustand when:**
- State changes frequently (search input, filter selections, sidebar toggles)
- Multiple distant components need to read and write the same state
- You want persistence, devtools, or immer middleware
- You want to avoid the "everything re-renders" problem that Context has with frequent updates

For Gather, filters change on every keystroke and click. Multiple components consume them. Zustand is the clear choice. But if Gather had a theme context that changed once when the user toggles dark mode, React Context would be perfectly adequate.

---

## Key Takeaways

1. **Zustand stores are created with `create<Type>()` and consumed with a hook.** No providers, no reducers, no action type strings.
2. **Always use selectors** when reading from a store. `useStore((s) => s.value)` prevents unnecessary re-renders. Use `useShallow` when selecting multiple values into an object.
3. **Separate state interfaces from action interfaces** to make your store's shape self-documenting.
4. **Zustand middleware** adds persistence (`persist`), debugging (`devtools`), and clean nested updates (`immer`) with minimal configuration.
5. **The slice pattern** splits large stores into independently defined pieces that combine into one store. Use it when a store file exceeds 100-150 lines.
6. **Zustand wins over Context for frequently updating shared state.** Context re-renders all consumers on any change. Zustand re-renders only the components that select the changed value.
7. **Context is still the right choice** for infrequently changing values like theme, locale, or compound component patterns.

---

## Try It Yourself

1. Create a new Next.js 14 project and install Zustand. Build a `useFilterStore` with `category`, `searchText`, and `dateRange` fields. Add typed actions for each.
2. Create two components that share the filter store: a `FilterBar` that writes to it and a `ResultsCount` that reads from it and displays "Showing X events matching [category]". Verify that both components stay in sync.
3. Add the `persist` middleware to your filter store so the selected category survives a page refresh. Open the browser's Application tab and find the value in localStorage.
4. Add the `devtools` middleware and open Redux DevTools in your browser. Toggle the category a few times and watch the state changes appear in the timeline.
5. Create a nested state shape (like the `EventDraftStore` example) and try updating a deeply nested value without immer. Then add the `immer` middleware and compare the code.
6. Experiment with the re-render difference between Context and Zustand. Create a Context-based store and a Zustand store with the same shape. Add `console.log('rendered')` to two consumer components. Update one value and see which consumers re-render in each approach.
7. Build a slice-based store with three slices (filters, ui, notifications). Combine them into one store and verify that selectors from all three slices work.

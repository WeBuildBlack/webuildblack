---
title: "Compound Components"
estimatedMinutes: 35
---

# Compound Components

Some UI components have multiple parts that need to share state without the consumer having to wire them together manually. Think of an HTML `<select>` and its `<option>` elements: the select manages which option is active, and the options register themselves with the select. They work as a team. The compound component pattern brings this idea to custom React components.

In this lesson, you will build a `FilterPanel` compound component for Gather's event search, learning how Context makes implicit state sharing possible and how TypeScript keeps the API safe.

---

## What Problem Compound Components Solve

Consider a filter panel for Gather events. Users can filter by category, date range, and search text. The naive approach passes everything through props on a single component:

```tsx
interface FilterPanelProps {
  categories: string[];
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
  startDate: Date | null;
  endDate: Date | null;
  onDateRangeChange: (start: Date | null, end: Date | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClear: () => void;
  showCategoryFilter?: boolean;
  showDateFilter?: boolean;
  showSearch?: boolean;
}
```

That is 12 props, and the list grows with every new filter type. Want to add a location filter? Add three more props. Want to rearrange the filter order? You cannot, because the component controls the layout internally.

Compound components solve this with a different API shape:

```tsx
<FilterPanel onFilterChange={handleFilterChange}>
  <FilterPanel.Search placeholder="Search events..." />
  <FilterPanel.Category
    options={["Music", "Tech", "Art", "Food", "Sports"]}
  />
  <FilterPanel.DateRange />
</FilterPanel>
```

The consumer controls which filters appear and in what order. The `FilterPanel` manages the shared filter state internally. Each subcomponent reads and writes to that shared state through React Context.

---

## Building the Foundation with Context

The shared state lives in a Context that only the compound component's children can access.

Start by defining the types:

```tsx
interface FilterState {
  search: string;
  categories: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

interface FilterContextValue {
  state: FilterState;
  updateSearch: (query: string) => void;
  toggleCategory: (category: string) => void;
  setDateRange: (start: Date | null, end: Date | null) => void;
  clearAll: () => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);
```

Notice the Context default is `null`. This is intentional. If a subcomponent tries to use the context outside of a `FilterPanel`, it should fail with a clear error, not silently return undefined values.

Create a custom hook that enforces this:

```tsx
function useFilterContext(): FilterContextValue {
  const context = useContext(FilterContext);

  if (!context) {
    throw new Error(
      "FilterPanel compound components must be rendered inside <FilterPanel>. " +
      "Make sure you are using FilterPanel.Search, FilterPanel.Category, etc. " +
      "as children of <FilterPanel>."
    );
  }

  return context;
}
```

This error message is specific and actionable. When a developer accidentally renders `<FilterPanel.Search />` outside of a `<FilterPanel>`, they will know exactly what went wrong.

---

## The Root Component

The root component provides the Context and manages state:

```tsx
interface FilterPanelRootProps {
  children: React.ReactNode;
  onFilterChange?: (state: FilterState) => void;
  className?: string;
}

function FilterPanelRoot({
  children,
  onFilterChange,
  className = "",
}: FilterPanelRootProps) {
  const [state, setState] = useState<FilterState>({
    search: "",
    categories: [],
    dateRange: { start: null, end: null },
  });

  // Notify parent whenever filters change
  const previousStateRef = useRef(state);
  useEffect(() => {
    if (previousStateRef.current !== state && onFilterChange) {
      onFilterChange(state);
    }
    previousStateRef.current = state;
  }, [state, onFilterChange]);

  const updateSearch = useCallback((query: string) => {
    setState((prev) => ({ ...prev, search: query }));
  }, []);

  const toggleCategory = useCallback((category: string) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  }, []);

  const setDateRange = useCallback(
    (start: Date | null, end: Date | null) => {
      setState((prev) => ({
        ...prev,
        dateRange: { start, end },
      }));
    },
    []
  );

  const clearAll = useCallback(() => {
    setState({
      search: "",
      categories: [],
      dateRange: { start: null, end: null },
    });
  }, []);

  const contextValue = useMemo<FilterContextValue>(
    () => ({ state, updateSearch, toggleCategory, setDateRange, clearAll }),
    [state, updateSearch, toggleCategory, setDateRange, clearAll]
  );

  return (
    <FilterContext.Provider value={contextValue}>
      <div className={`filter-panel ${className}`} role="search">
        {children}
      </div>
    </FilterContext.Provider>
  );
}
```

Key decisions here:

- `useCallback` on the updater functions so they have stable references. This prevents unnecessary re-renders of subcomponents that receive them.
- `useMemo` on the context value for the same reason.
- The `role="search"` attribute adds accessibility semantics.

---

## Building Subcomponents

Each subcomponent consumes the context and manages its own piece of the filter UI.

### Search

```tsx
interface FilterSearchProps {
  placeholder?: string;
  className?: string;
}

function FilterSearch({
  placeholder = "Search...",
  className = "",
}: FilterSearchProps) {
  const { state, updateSearch } = useFilterContext();

  return (
    <div className={`filter-panel__search ${className}`}>
      <label htmlFor="filter-search" className="sr-only">
        Search events
      </label>
      <input
        id="filter-search"
        type="text"
        value={state.search}
        onChange={(e) => updateSearch(e.target.value)}
        placeholder={placeholder}
        className="filter-panel__search-input"
      />
    </div>
  );
}
```

### Category

```tsx
interface FilterCategoryProps {
  options: string[];
  label?: string;
  className?: string;
}

function FilterCategory({
  options,
  label = "Categories",
  className = "",
}: FilterCategoryProps) {
  const { state, toggleCategory } = useFilterContext();

  return (
    <fieldset className={`filter-panel__category ${className}`}>
      <legend className="filter-panel__category-label">{label}</legend>
      <div className="filter-panel__category-options">
        {options.map((option) => {
          const isSelected = state.categories.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggleCategory(option)}
              className={`filter-chip ${isSelected ? "filter-chip--active" : ""}`}
              aria-pressed={isSelected}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
```

### DateRange

```tsx
interface FilterDateRangeProps {
  className?: string;
}

function FilterDateRange({ className = "" }: FilterDateRangeProps) {
  const { state, setDateRange } = useFilterContext();

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    setDateRange(date, state.dateRange.end);
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    setDateRange(state.dateRange.start, date);
  };

  return (
    <fieldset className={`filter-panel__date-range ${className}`}>
      <legend>Date Range</legend>
      <div className="filter-panel__date-inputs">
        <label>
          From
          <input
            type="date"
            value={
              state.dateRange.start
                ? state.dateRange.start.toISOString().split("T")[0]
                : ""
            }
            onChange={handleStartChange}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={
              state.dateRange.end
                ? state.dateRange.end.toISOString().split("T")[0]
                : ""
            }
            onChange={handleEndChange}
          />
        </label>
      </div>
    </fieldset>
  );
}
```

### Clear Button

```tsx
function FilterClear({ label = "Clear all filters" }: { label?: string }) {
  const { clearAll } = useFilterContext();

  return (
    <button
      type="button"
      onClick={clearAll}
      className="filter-panel__clear"
    >
      {label}
    </button>
  );
}
```

---

## The Namespace Pattern

Now you need to attach the subcomponents to `FilterPanel` so users can write `FilterPanel.Search`, `FilterPanel.Category`, etc. In TypeScript, you do this by creating a namespace object:

```tsx
export const FilterPanel = Object.assign(FilterPanelRoot, {
  Search: FilterSearch,
  Category: FilterCategory,
  DateRange: FilterDateRange,
  Clear: FilterClear,
});
```

`Object.assign` merges the subcomponents onto the root component function. The result is a single export that acts as both a component and a namespace.

For TypeScript to understand this, no extra type annotations are needed. `Object.assign` preserves the types of both arguments. `FilterPanel` is callable (it is a function component) and has `.Search`, `.Category`, `.DateRange`, and `.Clear` properties.

Here is the complete usage:

```tsx
function EventExplorer() {
  const handleFilterChange = (filters: FilterState) => {
    console.log("Active filters:", filters);
    // Fetch filtered events from API
  };

  return (
    <div className="event-explorer">
      <FilterPanel onFilterChange={handleFilterChange}>
        <FilterPanel.Search placeholder="Search events in Brooklyn..." />
        <FilterPanel.Category
          options={["Music", "Tech", "Art", "Food", "Sports", "Networking"]}
        />
        <FilterPanel.DateRange />
        <FilterPanel.Clear />
      </FilterPanel>

      {/* Event results would go here */}
    </div>
  );
}
```

The consumer controls which filters appear, their order, and their configuration. Want a page that only has search and categories? Just omit `DateRange` and `Clear`. Want categories before search? Swap the order. The compound component does not care.

---

## Flexible Composition in Action

The real payoff comes when you need different filter layouts for different pages:

```tsx
// Homepage  --  minimal filters
function HomepageFilters() {
  return (
    <FilterPanel onFilterChange={fetchEvents}>
      <FilterPanel.Search placeholder="Find events near you..." />
      <FilterPanel.Category options={["This Week", "This Weekend", "Free"]} />
    </FilterPanel>
  );
}

// Admin page  --  all filters, custom layout
function AdminFilters() {
  return (
    <FilterPanel onFilterChange={fetchEvents} className="admin-filters">
      <div className="admin-filters__row">
        <FilterPanel.Search placeholder="Search by title or organizer..." />
        <FilterPanel.Clear label="Reset" />
      </div>
      <div className="admin-filters__row">
        <FilterPanel.Category
          options={["Published", "Draft", "Cancelled", "Sold Out"]}
          label="Status"
        />
        <FilterPanel.DateRange />
      </div>
    </FilterPanel>
  );
}
```

Notice that the admin page wraps subcomponents in layout `<div>` elements. The compound component does not break because it uses Context, not direct children inspection. The subcomponents can be nested at any depth within the root.

---

## Validation: Ensuring Correct Children

Sometimes you want to verify that only valid subcomponents are used inside the root. There are two approaches:

**Runtime validation** (the context hook approach we already use): If someone renders a random `<div>` inside `FilterPanel`, it just renders normally. Only components that call `useFilterContext()` will throw if used outside the provider. This is usually sufficient.

**Strict validation** (checking children types): You can inspect `React.Children` and warn about unexpected children, but this is fragile. It breaks when consumers wrap subcomponents in other components or conditionals. In practice, the context-based approach with a good error message is the better path.

The error message from `useFilterContext` is your validation layer. Make it clear, specific, and helpful. Developers will see it immediately in development and know how to fix it.

---

## Compound Components vs. Hooks

You might wonder: why not just use hooks for the filter state?

```tsx
// Hook approach
function EventExplorer() {
  const { search, categories, dateRange, updateSearch, toggleCategory, setDateRange, clearAll } = useFilters();

  return (
    <div>
      <input value={search} onChange={(e) => updateSearch(e.target.value)} />
      {/* ... manually wire up every filter UI element */}
    </div>
  );
}
```

This works, but the consumer has to build all the filter UI from scratch every time. The compound component gives you pre-built, accessible filter UI pieces that automatically share state. The hook approach gives you the logic but not the UI.

**Use compound components when** you are building a reusable UI component with multiple pieces that share implicit state (tabs, accordions, menus, filter panels, form wizards).

**Use hooks when** you need to share logic but not UI, or when the consuming components have very different visual designs.

---

## Real-World Examples

Many popular React libraries use compound components:

- **Radix UI**: `Dialog.Root`, `Dialog.Trigger`, `Dialog.Content`
- **Headless UI**: `Menu.Button`, `Menu.Items`, `Menu.Item`
- **Reach UI**: `Tabs`, `TabList`, `Tab`, `TabPanels`, `TabPanel`
- **React Aria**: `Select`, `Label`, `Button`, `Popover`, `ListBox`

These libraries prove the pattern scales well. They also demonstrate that compound components pair naturally with accessibility: the root component can manage focus, ARIA attributes, and keyboard navigation, while subcomponents inherit this behavior automatically.

---

## Key Takeaways

1. **Compound components** let related UI pieces share implicit state through React Context, eliminating the need for the consumer to wire up state manually.
2. **The root component** provides the Context and manages shared state. Subcomponents consume the Context through a custom hook.
3. **The namespace pattern** (`Object.assign`) attaches subcomponents to the root, enabling the clean `FilterPanel.Search` dot-notation API.
4. **Consumers control composition.** They decide which subcomponents to render, in what order, and with what wrapper elements. The compound component does not dictate layout.
5. **A null default Context** with a descriptive error in the consumer hook provides clear validation when subcomponents are used outside the root.
6. **Compound components bundle logic and UI together.** Use them when you want reusable, pre-built pieces. Use hooks when you only need to share logic.
7. **Major React UI libraries** (Radix, Headless UI, Reach) validate this pattern at scale, particularly for accessible, composable component APIs.

---

## Try It Yourself

Build a `Tabs` compound component for Gather's event detail page with the following API:

```tsx
<Tabs defaultTab="details">
  <Tabs.List>
    <Tabs.Tab id="details">Details</Tabs.Tab>
    <Tabs.Tab id="attendees">Attendees</Tabs.Tab>
    <Tabs.Tab id="discussion">Discussion</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel id="details">Event details content...</Tabs.Panel>
  <Tabs.Panel id="attendees">Attendee list...</Tabs.Panel>
  <Tabs.Panel id="discussion">Discussion thread...</Tabs.Panel>
</Tabs>
```

Requirements:
- `Tabs` manages the active tab in Context
- `Tabs.Tab` highlights when active and switches tabs on click
- `Tabs.Panel` only renders its children when its `id` matches the active tab
- Add proper ARIA attributes (`role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`)
- Type everything with TypeScript. No `any` types.

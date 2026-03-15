---
title: "useRef and useMemo"
estimatedMinutes: 35
---

# useRef and useMemo

Not everything in a component needs to cause a re-render when it changes. Not every computed value needs to be recalculated on every render. `useRef` and `useMemo` both exist to handle situations where React's default behavior -- "re-render when anything changes, recompute everything each render" -- is either unnecessary or wrong. This lesson covers both hooks, plus `useCallback`, and the critical question of when NOT to reach for them.

---

## useRef: Two Use Cases

`useRef` returns a mutable object with a single property: `.current`. The key property: changing `.current` does not trigger a re-render. The ref object itself is stable -- the same object reference across every render.

This gives `useRef` two distinct use cases:
1. Accessing DOM elements directly
2. Storing mutable values that should not trigger re-renders

---

## Use Case 1: DOM Refs

The most common use of `useRef` is getting a direct reference to a DOM element -- for things React cannot do declaratively.

```jsx
import { useRef } from 'react';

function SearchForm() {
  // Create a ref -- initially null, set by React when the element mounts
  const inputRef = useRef(null);

  function handleButtonClick() {
    // Access the actual DOM element and focus it
    inputRef.current.focus();
  }

  return (
    <div>
      {/* Attach the ref to an element with the ref attribute */}
      <input
        ref={inputRef}
        type="search"
        placeholder="Search..."
      />
      <button onClick={handleButtonClick}>Focus Search</button>
    </div>
  );
}
```

React sets `ref.current` to the DOM element when it mounts and resets it to `null` when the element unmounts.

Common DOM ref use cases:

```jsx
function VideoPlayer({ src, playing }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;

    if (playing) {
      videoRef.current.play();    // Imperative DOM API call
    } else {
      videoRef.current.pause();
    }
  }, [playing]);

  return <video ref={videoRef} src={src} />;
}
```

```jsx
function AutoScrollList({ messages }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom whenever messages change
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="message-list">
      {messages.map(msg => <MessageItem key={msg.id} message={msg} />)}
      <div ref={bottomRef} />  {/* Invisible anchor at the bottom */}
    </div>
  );
}
```

---

## Use Case 2: Mutable Values That Don't Trigger Re-renders

Sometimes you need to store a value across renders but changing it should NOT cause a re-render. Storing it in state would cause unnecessary re-renders. Storing it in a regular variable loses it between renders (every render creates a new variable). A ref persists across renders without causing them.

### Storing previous values

```jsx
import { useRef, useEffect } from 'react';

function PriceDisplay({ price }) {
  const prevPriceRef = useRef(null);

  useEffect(() => {
    // After render, update the ref to the current price
    prevPriceRef.current = price;
  });

  const prevPrice = prevPriceRef.current;
  const increased = prevPrice !== null && price > prevPrice;
  const decreased = prevPrice !== null && price < prevPrice;

  return (
    <div>
      <span className={increased ? 'price--up' : decreased ? 'price--down' : ''}>
        ${price.toFixed(2)}
      </span>
      {prevPrice !== null && (
        <span className="price-change">
          {increased ? '▲' : decreased ? '▼' : ''}
          {prevPrice !== null ? ` (was $${prevPrice.toFixed(2)})` : ''}
        </span>
      )}
    </div>
  );
}
```

### Storing timer/interval IDs

```jsx
function Stopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  // Store the interval ID in a ref -- changing it shouldn't cause a re-render
  const intervalRef = useRef(null);

  function start() {
    if (intervalRef.current) return;  // Already running
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsed(prev => prev + 10);
    }, 10);
  }

  function stop() {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
  }

  function reset() {
    stop();
    setElapsed(0);
  }

  return (
    <div>
      <p>{(elapsed / 1000).toFixed(2)}s</p>
      <button onClick={start} disabled={running}>Start</button>
      <button onClick={stop} disabled={!running}>Stop</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

Storing the interval ID in state would cause a re-render every time you start or stop the timer. A ref stores it silently.

### Storing a flag to avoid stale closures

```jsx
function DataPoller({ url, interval = 5000 }) {
  const [data, setData] = useState(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const poll = async () => {
      while (isMountedRef.current) {
        const res = await fetch(url);
        const json = await res.json();

        if (isMountedRef.current) {
          setData(json);
        }

        await new Promise(resolve => setTimeout(resolve, interval));
      }
    };

    poll();

    return () => {
      isMountedRef.current = false;
    };
  }, [url, interval]);

  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
```

---

## useMemo: Memoizing Computed Values

`useMemo` caches the result of a computation and only recalculates it when its dependencies change. It is the hook version of "compute this only when the inputs change."

```jsx
import { useMemo } from 'react';

function ProductCatalog({ products, filters }) {
  // Without useMemo: this runs on EVERY render, even when products and filters didn't change
  const filteredProducts = products
    .filter(p => !filters.category || p.category === filters.category)
    .filter(p => !filters.minPrice || p.price >= filters.minPrice)
    .filter(p => !filters.maxPrice || p.price <= filters.maxPrice)
    .sort((a, b) => a.price - b.price);

  // With useMemo: only recalculates when products or filters change
  const filteredProductsMemo = useMemo(() => {
    return products
      .filter(p => !filters.category || p.category === filters.category)
      .filter(p => !filters.minPrice || p.price >= filters.minPrice)
      .filter(p => !filters.maxPrice || p.price <= filters.maxPrice)
      .sort((a, b) => a.price - b.price);
  }, [products, filters]);  // Dependencies: recompute when these change

  return (
    <div>
      {filteredProductsMemo.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

The syntax: `useMemo(() => computedValue, [dependencies])`. It takes a function (not the value directly) and returns the cached result.

Another common use: creating derived data that would otherwise be recomputed expensively:

```jsx
function CohortStats({ members }) {
  const stats = useMemo(() => {
    const total = members.length;
    const active = members.filter(m => m.status === 'active').length;
    const completed = members.filter(m => m.status === 'completed').length;
    const placed = members.filter(m => m.placed).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const placementRate = completed > 0 ? Math.round((placed / completed) * 100) : 0;

    return { total, active, completed, placed, completionRate, placementRate };
  }, [members]);  // Only recompute when members array changes

  return (
    <div className="stats-grid">
      <StatCard label="Total" value={stats.total} />
      <StatCard label="Active" value={stats.active} />
      <StatCard label="Completed" value={stats.completed} />
      <StatCard label="Placed" value={stats.placed} />
      <StatCard label="Completion Rate" value={`${stats.completionRate}%`} />
      <StatCard label="Placement Rate" value={`${stats.placementRate}%`} />
    </div>
  );
}
```

---

## useCallback: Memoizing Functions

`useCallback` is `useMemo` for functions. It caches a function reference so the same function object is returned across renders (until dependencies change).

```jsx
import { useCallback } from 'react';

function ParentList({ items }) {
  const [selected, setSelected] = useState(null);

  // Without useCallback: a new handleSelect function is created on every render.
  // If passed to a memoized child, the child re-renders because the function reference changed.
  const handleSelect = useCallback((id) => {
    setSelected(id);
  }, []);  // No dependencies: function never changes

  return (
    <ul>
      {items.map(item => (
        <MemoizedItem
          key={item.id}
          item={item}
          onSelect={handleSelect}    // Stable reference -- MemoizedItem won't re-render unnecessarily
          isSelected={item.id === selected}
        />
      ))}
    </ul>
  );
}
```

`useCallback(fn, deps)` is equivalent to `useMemo(() => fn, deps)`. Both return cached values -- `useMemo` caches the result of calling a function, `useCallback` caches the function itself.

---

## When NOT to Memoize

This is the most important part of this lesson: **memoization has a cost**. `useMemo` and `useCallback` add complexity and memory overhead. They make sense only when there is a measurable benefit.

Do NOT use `useMemo`/`useCallback` for:
- Simple computations (`price * quantity`, string concatenation, simple boolean checks)
- Components that are fast to render anyway
- Situations where you have not measured a performance problem

```jsx
// Unnecessary -- this computation is trivial
const fullName = useMemo(() => `${firstName} ${lastName}`, [firstName, lastName]);
// Just do:
const fullName = `${firstName} ${lastName}`;

// Unnecessary -- simple boolean, computed instantly
const isValid = useMemo(() => email.includes('@'), [email]);
// Just do:
const isValid = email.includes('@');
```

Use `useMemo` for:
- Filtering/sorting large arrays (hundreds of items or more)
- Expensive mathematical computations
- Creating objects or arrays passed to deeply memoized child components where referential stability matters

Use `useCallback` for:
- Functions passed as props to components wrapped in `React.memo`
- Functions listed in `useEffect` dependency arrays that would otherwise change on every render

The React team's guidance: write your code first. Measure with the Profiler if you notice slowness. Memoize only where the profiler shows a real problem.

---

## Referential Equality and Why It Matters

Understanding when to memoize requires understanding referential equality. Two objects or arrays that look the same are not `===` equal in JavaScript:

```javascript
{ a: 1 } === { a: 1 }    // false -- different references
[1, 2, 3] === [1, 2, 3]  // false -- different references
() => {} === () => {}    // false -- different references

const obj = { a: 1 };
obj === obj               // true -- same reference
```

React uses `===` to compare dependency array values. If you create a new object or array inside a component without memoization, it has a new reference on every render -- even if the values are the same. This causes effects and memoized components to see it as "changed" every render.

```jsx
// Problem: new object reference every render
function Parent() {
  const config = { theme: 'dark', lang: 'en' };  // New object every render

  useEffect(() => {
    applyConfig(config);
  }, [config]);  // Runs every render because config is always a new reference
}

// Fix: memoize the object
function Parent() {
  const config = useMemo(() => ({ theme: 'dark', lang: 'en' }), []);  // Stable reference

  useEffect(() => {
    applyConfig(config);
  }, [config]);  // Runs only once -- config reference is stable
}
```

---

## Key Takeaways

- `useRef` returns a stable object with a `.current` property. Changing `.current` does not trigger a re-render. Use it to access DOM elements directly and to store mutable values (timer IDs, previous values, mounted flags) that should not cause re-renders.
- Attach a ref to a DOM element with `ref={myRef}`. React sets `ref.current` to the element on mount and to `null` on unmount.
- `useMemo` caches the result of a computation and only recalculates when dependencies change. Use it for expensive operations on large datasets -- not for trivial computations.
- `useCallback` caches a function reference. Use it when passing callbacks to memoized child components or listing functions in `useEffect` dependency arrays.
- Both `useMemo` and `useCallback` have overhead. Do not add them preemptively. Measure first, then optimize.
- Referential equality (`===`) is why memoization matters: objects and arrays created inline get new references every render, causing effects and memoized components to treat them as changed.

---

## Try It Yourself

**Exercise 1**: Build a `FocusOnMount` component that automatically focuses an `<input>` element when it renders. Use `useRef` and `useEffect` to achieve this without any button click.

**Exercise 2**: Create a `FilteredTable` component that accepts a large array of `{ id, name, department, salary }` objects and a `filterText` string as props. Use `useMemo` to compute the filtered rows only when `data` or `filterText` changes. Add a counter to the component that increments on a button click -- verify via console logging that the filter computation does NOT re-run when only the counter changes.

**Exercise 3**: Build a `PreviousValue` custom display that shows both the current and previous value of any number passed as a prop. Use `useRef` and `useEffect` to capture the previous value after each render. Test it by passing a counter that increments with a button click.

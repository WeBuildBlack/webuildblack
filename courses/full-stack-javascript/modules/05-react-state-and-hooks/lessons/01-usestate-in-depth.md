---
title: "useState in Depth"
estimatedMinutes: 40
---

# useState in Depth

You have already seen `useState` used for simple string and boolean values. But `useState` has behaviors that trip up even experienced React developers -- batching, stale closures, functional updates, and immutable state for arrays and objects. This lesson covers all of it. Understanding `useState` at this depth makes every other hook easier to learn and prevents entire categories of bugs.

---

## The Mental Model

Every call to `useState` creates a piece of state tied to a specific component instance. React stores that state outside the component function -- so when React re-renders the component (calls the function again), the state value from the previous render is handed back to you.

```jsx
import { useState } from 'react';

function Counter() {
  // React hands back the current value each render.
  // On first render: count = 0 (the initial value)
  // On second render (after increment): count = 1
  // On third render: count = 2, and so on
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

State updates trigger re-renders. When you call `setCount(1)`, React schedules a re-render, calls `Counter` again, and this time `useState(0)` returns `[1, setCount]` -- the `0` initial value is ignored after the first render.

---

## The Updater Function Pattern

The most important thing to understand about `setState` calls: they are asynchronous. The state does not update immediately when you call the setter -- it updates on the next render.

This creates a problem when you call the setter multiple times in the same event handler:

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  function handleTripleIncrement() {
    // All three calls see count = 0 (the value from this render)
    setCount(count + 1);  // schedules: set to 0+1 = 1
    setCount(count + 1);  // schedules: set to 0+1 = 1 (same!)
    setCount(count + 1);  // schedules: set to 0+1 = 1 (same!)
    // Result: count becomes 1, not 3
  }

  return <button onClick={handleTripleIncrement}>Triple Increment: {count}</button>;
}
```

The fix is the **updater function pattern**: pass a function to the setter instead of a value. React calls this function with the most recent state value -- guaranteed to be current, not stale.

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  function handleTripleIncrement() {
    // Each updater receives the latest state from the previous call
    setCount(prev => prev + 1);  // prev=0, schedules: 1
    setCount(prev => prev + 1);  // prev=1, schedules: 2
    setCount(prev => prev + 1);  // prev=2, schedules: 3
    // Result: count becomes 3
  }

  return <button onClick={handleTripleIncrement}>Triple Increment: {count}</button>;
}
```

**Use the updater function whenever the new state depends on the previous state.** This includes increment/decrement, toggle, and any operation that reads the current value to compute the next one.

```jsx
// Common patterns using updater functions
setCount(prev => prev + 1);                      // increment
setCount(prev => prev - 1);                      // decrement
setIsOpen(prev => !prev);                        // toggle
setItems(prev => [...prev, newItem]);             // add to array
setItems(prev => prev.filter(item => item.id !== id)); // remove from array
```

---

## Immutable Updates for Objects

When state is an object, you must replace the entire object -- not mutate properties in place. React uses reference equality (`===`) to detect state changes. If you mutate an object in place, the reference stays the same and React does not re-render.

```jsx
function ProfileForm() {
  const [profile, setProfile] = useState({
    name: 'Alex',
    email: 'alex@example.com',
    bio: '',
  });

  // Wrong: mutating the object directly
  function handleNameChangeBroken(e) {
    profile.name = e.target.value;  // Mutates in place -- React won't re-render
    setProfile(profile);            // Same reference -- React skips this update
  }

  // Right: create a new object with the spread operator
  function handleNameChange(e) {
    setProfile(prev => ({
      ...prev,               // Copy all existing properties
      name: e.target.value,  // Override just the changed property
    }));
  }

  // Generic handler for multiple fields
  function handleChange(e) {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  }

  return (
    <form>
      <input name="name" value={profile.name} onChange={handleChange} />
      <input name="email" value={profile.email} onChange={handleChange} />
      <textarea name="bio" value={profile.bio} onChange={handleChange} />
    </form>
  );
}
```

---

## Immutable Updates for Arrays

Arrays in state need the same treatment. Never use mutating methods like `push`, `pop`, `splice`, or `sort` on state arrays. Use non-mutating alternatives.

```jsx
function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn React', done: false },
    { id: 2, text: 'Build a project', done: false },
  ]);

  // Adding: use spread to create a new array
  function addTodo(text) {
    const newTodo = { id: Date.now(), text, done: false };
    setTodos(prev => [...prev, newTodo]);
  }

  // Removing: use filter (returns a new array)
  function removeTodo(id) {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  }

  // Updating one item: use map (returns a new array)
  function toggleTodo(id) {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id
          ? { ...todo, done: !todo.done }  // New object for the changed item
          : todo                           // Unchanged items stay the same
      )
    );
  }

  // Reordering: use slice and spread (never sort() in place)
  function sortByText() {
    setTodos(prev => [...prev].sort((a, b) => a.text.localeCompare(b.text)));
  }

  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>
          <input
            type="checkbox"
            checked={todo.done}
            onChange={() => toggleTodo(todo.id)}
          />
          <span style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
            {todo.text}
          </span>
          <button onClick={() => removeTodo(todo.id)}>Delete</button>
        </li>
      ))}
      <button onClick={() => addTodo('New task')}>Add Task</button>
      <button onClick={sortByText}>Sort</button>
    </ul>
  );
}
```

**Cheat sheet -- array state operations:**

| Operation | Wrong (mutates) | Right (creates new) |
|-----------|----------------|---------------------|
| Add to end | `arr.push(item)` | `[...arr, item]` |
| Add to start | `arr.unshift(item)` | `[item, ...arr]` |
| Remove by index | `arr.splice(i, 1)` | `arr.filter((_, idx) => idx !== i)` |
| Remove by id | `arr.splice(...)` | `arr.filter(x => x.id !== id)` |
| Update item | `arr[i].prop = val` | `arr.map(x => x.id === id ? {...x, prop: val} : x)` |
| Sort | `arr.sort(fn)` | `[...arr].sort(fn)` |
| Reverse | `arr.reverse()` | `[...arr].reverse()` |

---

## Nested State Updates

Updating nested objects requires spreading at every level you want to change:

```jsx
function SettingsForm() {
  const [settings, setSettings] = useState({
    profile: {
      name: 'Jordan',
      avatar: '/avatar.png',
    },
    notifications: {
      email: true,
      slack: false,
      weekly: true,
    },
    theme: 'dark',
  });

  // Update a nested field -- spread both the outer and inner objects
  function toggleEmailNotifications() {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        email: !prev.notifications.email,
      },
    }));
  }

  // Update a top-level field
  function setTheme(theme) {
    setSettings(prev => ({ ...prev, theme }));
  }
}
```

When your nested state gets three or more levels deep, it is a sign to flatten the structure or use `useReducer` (covered in Lesson 5 of this module). Deep nesting makes immutable updates verbose and error-prone.

---

## Batching

React 18 introduced automatic batching: multiple state updates in the same event handler (or inside a `setTimeout`, `Promise`, or async function) are batched into a single re-render. This is a performance optimization.

```jsx
function Component() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('');

  function handleClick() {
    // In React 18, both updates are batched -- only ONE re-render happens
    setCount(c => c + 1);
    setText('updated');
  }

  // Before React 18, async code required manual batching via ReactDOM.unstable_batchedUpdates.
  // In React 18, this is also batched automatically:
  async function handleAsync() {
    const data = await fetchSomething();
    setCount(c => c + 1);  // batched
    setText(data.text);    // batched -- only one re-render
  }
}
```

You rarely need to think about batching explicitly. Just know that multiple `setState` calls in the same synchronous block do not cause multiple re-renders.

---

## Lazy Initialization

The initial value passed to `useState` is only used on the first render. But if computing that initial value is expensive (reading from localStorage, parsing a large dataset), you pay the computation cost on every render -- even though the result is discarded after the first one.

The fix: pass a function as the initial value instead of the value itself. React calls this function only once.

```jsx
// Problem: localStorage.getItem runs on every render
const [preferences, setPreferences] = useState(
  JSON.parse(localStorage.getItem('preferences') || '{}')
);

// Fix: pass an initializer function -- runs only on first render
const [preferences, setPreferences] = useState(() => {
  const stored = localStorage.getItem('preferences');
  return stored ? JSON.parse(stored) : {};
});
```

The difference: `useState(expensiveComputation())` calls `expensiveComputation` every render. `useState(() => expensiveComputation())` calls it only once. Use this pattern whenever your initial state is non-trivial to compute.

---

## Common Mistakes

**Mistake 1: Deriving state from props in useState**

```jsx
// Wrong: initial value is set once from props -- won't update when props change
function PriceDisplay({ priceCents }) {
  const [price, setPrice] = useState(priceCents / 100);  // Stuck at initial prop value
  return <span>${price}</span>;
}

// Right: compute derived values directly in the render body
function PriceDisplay({ priceCents }) {
  const price = (priceCents / 100).toFixed(2);  // Recomputes on every render
  return <span>${price}</span>;
}
```

If a value can be computed from props or other state, do not put it in state. Compute it during render.

**Mistake 2: Creating objects/arrays in the initial value that get recreated each render**

```jsx
// Wrong: new array created every render (doesn't cause a bug here, but wastes memory)
const [filters, setFilters] = useState({ category: '', minPrice: 0, maxPrice: 999 });

// This is fine for simple objects -- the mistake is when you try to mutate:
const [tags, setTags] = useState(['react', 'javascript']);
// Never do: tags.push('typescript')  -- mutates the current state array
```

**Mistake 3: Forgetting that state updates are async**

```jsx
function Form() {
  const [value, setValue] = useState('');

  function handleChange(e) {
    setValue(e.target.value);
    // This logs the OLD value -- setValue hasn't run yet
    console.log(value);  // Still the previous value
  }
}
```

If you need to use the new value immediately after setting it, either use it from `e.target.value` directly or use `useEffect` to react to the state change.

---

## Key Takeaways

- `useState` stores state outside the component function and hands it back on each render. The initial value is only used on the first render.
- Use the updater function (`setState(prev => ...)`) whenever new state depends on previous state. It guarantees you are working with the most recent value.
- Never mutate state objects or arrays in place. Always create new values: spread operators for objects, and non-mutating array methods (`.filter()`, `.map()`, `[...arr]`) for arrays.
- Nested state updates require spreading at every changed level. Very deep nesting is a signal to flatten the structure or move to `useReducer`.
- React 18 batches multiple state updates in the same event handler into a single re-render.
- Lazy initialization (`useState(() => expensiveFunction())`) runs the initializer only once -- use it for computations that read from localStorage, parse data, or do anything non-trivial on startup.
- Do not store derived values in state. If a value can be computed from existing state or props, compute it during render.

---

## Try It Yourself

**Exercise 1**: Build a `Counter` component with increment, decrement, reset, and "add 5" buttons. Implement "add 5" using the updater function pattern (call `setCount` 5 times in a loop). Verify the count increases by exactly 5 each click.

**Exercise 2**: Build a `UserPreferences` component that stores a state object with `theme` (light/dark), `fontSize` (sm/md/lg), and `language` fields. Render a form that edits each field. Use a single generic `handleChange` function. Add a "Reset to defaults" button that restores the initial values.

**Exercise 3**: Create a `PersistentNotes` component that stores a notes string in `useState` AND syncs it to `localStorage`. Use lazy initialization to load the stored value on first render. Update `localStorage` every time the state changes (you will need `useEffect` for this -- look it up ahead of the next lesson, or leave a TODO comment).

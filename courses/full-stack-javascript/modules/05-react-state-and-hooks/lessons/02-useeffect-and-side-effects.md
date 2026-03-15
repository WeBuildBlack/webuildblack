---
title: "useEffect and Side Effects"
estimatedMinutes: 40
---

# useEffect and Side Effects

React components are functions that take props and state and return JSX. That's the pure part. But real applications also need to interact with the outside world: fetch data from an API, update the document title, subscribe to a WebSocket, sync state to localStorage. These interactions are called **side effects** -- they happen alongside the render, not as part of it. `useEffect` is React's hook for running side effects.

---

## What a Side Effect Is

A side effect is anything your component does that affects something outside its own render output.

Examples:
- Fetching data from an API
- Setting `document.title`
- Adding/removing event listeners
- Starting/stopping timers (`setTimeout`, `setInterval`)
- Subscribing to a data stream
- Writing to localStorage or sessionStorage
- Logging to an analytics service

React's rendering must stay pure -- given the same props and state, a component should return the same JSX every time. Side effects go in `useEffect` so React can control when they run.

---

## The Basic Pattern

```jsx
import { useState, useEffect } from 'react';

function DocumentTitle({ page }) {
  useEffect(() => {
    // This runs after the component renders
    document.title = `${page} | We Build Black`;

    // Optional: return a cleanup function
    return () => {
      document.title = 'We Build Black';
    };
  }, [page]);  // Dependency array: re-run when `page` changes

  return <h1>{page}</h1>;
}
```

`useEffect` takes two arguments:
1. A callback function containing the side effect
2. A dependency array that controls when the effect runs

---

## The Dependency Array

The dependency array is the most important concept in `useEffect`. It tells React when to re-run the effect.

**Three forms:**

```jsx
// Form 1: No dependency array -- runs after EVERY render
useEffect(() => {
  console.log('Runs after every render');
});

// Form 2: Empty array -- runs only once after the first render (like componentDidMount)
useEffect(() => {
  console.log('Runs once on mount');
}, []);

// Form 3: Array with dependencies -- runs after first render AND whenever any dependency changes
useEffect(() => {
  console.log(`userId changed to: ${userId}`);
}, [userId]);
```

The rule: **include every reactive value the effect uses in the dependency array**. A reactive value is any prop, state variable, or value derived from them that is used inside the effect.

```jsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // This effect uses `userId` -- it must be in the dependency array
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => setUser(data));
  }, [userId]);  // Correct: re-fetches when userId changes

  if (!user) return <p>Loading...</p>;
  return <h1>{user.name}</h1>;
}
```

If you use a value inside an effect but leave it out of the dependency array, the effect runs with a stale (outdated) version of that value. This is a stale closure bug.

---

## Cleanup Functions

Some effects need to be undone when the component unmounts or before the effect runs again. Return a cleanup function from the effect to handle this.

```jsx
function SearchInput({ onSearch }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    // Start a debounced search
    const timer = setTimeout(() => {
      if (query) onSearch(query);
    }, 500);

    // Cleanup: clear the timeout if query changes before 500ms is up
    // Also runs when the component unmounts
    return () => {
      clearTimeout(timer);
    };
  }, [query, onSearch]);

  return (
    <input
      value={query}
      onChange={e => setQuery(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

When does the cleanup run?
1. Before the effect runs again (when dependencies change)
2. When the component unmounts

Without the cleanup in the example above, each keystroke would schedule a new timer without canceling the previous one -- leading to multiple search requests firing as the user types.

### Event listener cleanup

```jsx
function useKeyPress(targetKey, callback) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === targetKey) {
        callback();
      }
    }

    // Add listener when component mounts
    document.addEventListener('keydown', handleKeyDown);

    // Remove listener when component unmounts or dependencies change
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [targetKey, callback]);
}
```

Without cleanup, every mount adds a new listener. After several mount/unmount cycles you have many listeners firing the same callback -- a memory leak.

---

## Data Fetching Pattern

Fetching data in `useEffect` is the most common use case. Here is the complete, correct pattern:

```jsx
function CourseList() {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Track whether this effect instance is still current
    let cancelled = false;

    async function fetchCourses() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/courses');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Only update state if this effect hasn't been cleaned up
        if (!cancelled) {
          setCourses(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchCourses();

    // Cleanup: mark as cancelled if the component unmounts or userId changes
    return () => {
      cancelled = true;
    };
  }, []);  // Empty array: fetch once on mount

  if (isLoading) return <p>Loading courses...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <ul>
      {courses.map(course => (
        <li key={course.slug}>{course.title}</li>
      ))}
    </ul>
  );
}
```

The `cancelled` flag prevents a **race condition**: if the component unmounts while a fetch is in flight, the async callback could still fire and try to call `setData` on an unmounted component. Setting `cancelled = true` in the cleanup prevents that state update.

### Fetching when a dependency changes

```jsx
function UserPosts({ userId }) {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchPosts() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/users/${userId}/posts`);
        const data = await res.json();
        if (!cancelled) setPosts(data);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchPosts();
    return () => { cancelled = true; };
  }, [userId]);  // Re-fetches whenever userId changes

  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {posts.map(post => <PostCard key={post.id} post={post} />)}
    </div>
  );
}
```

---

## Stale Closures

A stale closure is when an effect (or callback inside an effect) "closes over" a variable from a previous render instead of the current one. This is one of the most common `useEffect` bugs.

```jsx
function Timer() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // This effect closes over `count` from the render when it ran.
    // If the dependency array is empty, `count` is always 0 inside the interval.
    const interval = setInterval(() => {
      console.log(count);         // Always logs 0 -- stale closure
      setCount(count + 1);        // Always sets to 1 -- wrong!
    }, 1000);

    return () => clearInterval(interval);
  }, []);  // Bug: count is used inside but not listed as a dependency
}

// Fix option 1: Add count to the dependency array (but this restarts the interval every second)
useEffect(() => {
  const interval = setInterval(() => {
    setCount(count + 1);
  }, 1000);
  return () => clearInterval(interval);
}, [count]);  // Restarts the interval whenever count changes

// Fix option 2: Use the updater function -- no need to read count at all
useEffect(() => {
  const interval = setInterval(() => {
    setCount(prev => prev + 1);  // Reads the latest value via the updater
  }, 1000);
  return () => clearInterval(interval);
}, []);  // Empty array is correct now -- no stale closure
```

When an effect does not need to read a state value to compute the next one, use the updater function to avoid the stale closure entirely.

---

## Rules of Effects

React enforces two rules for all hooks, including `useEffect`:

**Rule 1: Only call hooks at the top level.** Never call hooks inside conditionals, loops, or nested functions.

```jsx
// Wrong
function Component({ shouldFetch }) {
  if (shouldFetch) {
    useEffect(() => { /* ... */ }, []);  // Breaks rules of hooks
  }
}

// Right: put the condition inside the effect
function Component({ shouldFetch }) {
  useEffect(() => {
    if (!shouldFetch) return;  // Condition inside the effect
    // fetch logic...
  }, [shouldFetch]);
}
```

**Rule 2: Only call hooks from React function components or custom hooks.** Not from regular JavaScript functions, class components, or outside React.

These rules exist because React identifies hooks by their call order. If the order changes (as it would with a conditional hook call), React cannot correctly associate each hook with its stored state.

The `eslint-plugin-react-hooks` package enforces these rules automatically. It is included by default in Vite React projects.

---

## Common Patterns

### Running code only once after the first render

```jsx
useEffect(() => {
  // Runs once after the component first appears in the DOM
  initializeAnalytics();
  loadSavedData();
}, []);
```

### Syncing state to an external system

```jsx
function ThemeProvider({ theme }) {
  useEffect(() => {
    // Keep the document in sync with React state
    document.documentElement.setAttribute('data-theme', theme);
    return () => {
      document.documentElement.removeAttribute('data-theme');
    };
  }, [theme]);
}
```

### Subscribing to a WebSocket or event emitter

```jsx
function LiveFeed({ channelId }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const socket = new WebSocket(`wss://api.example.com/channels/${channelId}`);

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages(prev => [...prev, message]);
    };

    // Cleanup: close the connection when channelId changes or component unmounts
    return () => {
      socket.close();
    };
  }, [channelId]);

  return (
    <ul>
      {messages.map(msg => <li key={msg.id}>{msg.text}</li>)}
    </ul>
  );
}
```

---

## Key Takeaways

- Side effects are any interaction with the outside world (API calls, DOM mutations, timers, subscriptions). They go in `useEffect`, not in the render body.
- The dependency array controls when the effect runs: no array means every render; `[]` means once on mount; `[dep1, dep2]` means after mount and whenever any dependency changes.
- Include every reactive value the effect uses in the dependency array. Missing dependencies cause stale closures -- the effect runs with outdated values.
- Return a cleanup function from effects that start subscriptions, timers, or event listeners. The cleanup runs before the next execution of the effect and when the component unmounts.
- Use a `cancelled` boolean flag to prevent async fetch callbacks from updating state after the component unmounts (prevents race conditions and state-on-unmounted-component warnings).
- When an effect uses state only to compute the next state value, use the updater function pattern to avoid stale closures without adding the state to the dependency array.
- Never call hooks inside conditionals or loops. Put the condition inside the hook instead.

---

## Try It Yourself

**Exercise 1**: Build a `WindowSize` component that displays the current window width and height. Use `useEffect` to add a `resize` event listener to `window` and update state when the window size changes. Make sure your cleanup removes the listener. Verify in DevTools that no listeners accumulate across re-renders.

**Exercise 2**: Create a `GitHubProfile` component that accepts a `username` prop and fetches profile data from `https://api.github.com/users/{username}`. Handle loading, error, and success states. Add the `cancelled` flag pattern to prevent stale updates. Verify that changing the `username` prop cancels the previous fetch and starts a new one.

**Exercise 3**: Build a `Stopwatch` component with start, stop, and reset buttons. Use `useEffect` with `setInterval` to update the elapsed time. Use the updater function pattern for the time increment. Ensure the interval is properly cleaned up when the stopwatch is stopped or the component unmounts.

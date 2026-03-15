---
title: "Custom Hooks"
estimatedMinutes: 35
---

# Custom Hooks

The moment you start repeating the same combination of `useState`, `useEffect`, and other hooks across multiple components, you are ready for custom hooks. A custom hook is just a function whose name starts with `use` and that calls other hooks inside it. It lets you extract stateful logic into a reusable unit -- separate from the component that uses it. This lesson builds several practical custom hooks you will reach for regularly.

---

## What a Custom Hook Is

A custom hook is a plain JavaScript function that:
1. Has a name that starts with `use` (this is required -- it signals to React and linting tools that it follows the rules of hooks)
2. Calls one or more React hooks inside it
3. Returns whatever values the calling component needs

```jsx
// Before: logic mixed into the component
function ProfilePage({ userId }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => { if (!cancelled) { setUser(data); setIsLoading(false); } })
      .catch(err => { if (!cancelled) { setError(err.message); setIsLoading(false); } });
    return () => { cancelled = true; };
  }, [userId]);

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  return <h1>{user.name}</h1>;
}

// After: logic extracted into a custom hook
function useFetch(url) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => {
        if (!cancelled) { setData(json); setIsLoading(false); }
      })
      .catch(err => {
        if (!cancelled) { setError(err.message); setIsLoading(false); }
      });

    return () => { cancelled = true; };
  }, [url]);

  return { data, isLoading, error };
}

// Component is now clean -- just consumes the hook
function ProfilePage({ userId }) {
  const { data: user, isLoading, error } = useFetch(`/api/users/${userId}`);

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  return <h1>{user.name}</h1>;
}
```

The hook owns the logic. The component owns the rendering. They are separate concerns.

---

## useLocalStorage

Reading and writing to localStorage is a pattern that appears constantly in web apps. Here is a `useLocalStorage` hook that works exactly like `useState` but automatically persists to localStorage:

```jsx
import { useState, useEffect } from 'react';

function useLocalStorage(key, initialValue) {
  // Lazy initialization: read from localStorage on first render only
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // Sync to localStorage whenever the value changes
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(storedValue));
    } catch {
      // localStorage may be unavailable (private browsing, storage quota exceeded)
      console.warn(`Could not write to localStorage for key: ${key}`);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

// Usage: identical API to useState
function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage('app-theme', 'light');

  return (
    <button onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}>
      Current theme: {theme}
    </button>
  );
}
```

The component does not need to know anything about localStorage. It just uses `useLocalStorage` exactly like `useState`.

---

## useFetch

A more complete `useFetch` hook that handles loading, error, and re-fetching:

```jsx
import { useState, useEffect, useCallback } from 'react';

function useFetch(url, options = {}) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async () => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      if (!cancelled) setData(json);
    } catch (err) {
      if (!cancelled) setError(err.message);
    } finally {
      if (!cancelled) setIsLoading(false);
    }

    return () => { cancelled = true; };
  }, [url]);  // Re-create execute when url changes

  // Run on mount and whenever url changes
  useEffect(() => {
    execute();
  }, [execute]);

  // Also expose execute so callers can trigger a manual refresh
  return { data, isLoading, error, refetch: execute };
}

// Usage
function CourseList() {
  const { data: courses, isLoading, error, refetch } = useFetch('/api/courses');

  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {error && (
        <div>
          <p>Failed to load: {error}</p>
          <button onClick={refetch}>Try Again</button>
        </div>
      )}
      {courses && courses.map(course => (
        <CourseCard key={course.slug} course={course} />
      ))}
    </div>
  );
}
```

---

## useDebounce

Debouncing delays processing a rapidly-changing value until it settles. Essential for search inputs -- you do not want to fire an API call on every keystroke.

```jsx
import { useState, useEffect } from 'react';

function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set a timer to update the debounced value after the delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timer if value changes before the delay is up
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Usage: only fires a search when the user stops typing for 400ms
function SearchPage() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);

  const { data: results, isLoading } = useFetch(
    debouncedQuery ? `/api/search?q=${encodeURIComponent(debouncedQuery)}` : null
  );

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search courses..."
      />
      {isLoading && <p>Searching...</p>}
      {results && results.map(result => (
        <SearchResult key={result.id} result={result} />
      ))}
    </div>
  );
}
```

The hook is 12 lines. Without it, the debounce logic would be tangled into the component alongside the search state and fetch logic.

---

## useMediaQuery

Detecting screen size in React without a media query hook means either hardcoding breakpoints in CSS only (and losing them in JS) or writing the same `window.matchMedia` setup every time.

```jsx
import { useState, useEffect } from 'react';

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    // Lazy init: check immediately on first render (avoids flash)
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    function handleChange(event) {
      setMatches(event.matches);
    }

    // Modern API
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}

// Usage
function Navigation() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  return (
    <nav>
      {isMobile ? <MobileMenu /> : <DesktopMenu />}
    </nav>
  );
}
```

---

## Rules of Hooks (Applied to Custom Hooks)

The rules of hooks apply to custom hooks exactly the same as to built-in hooks:

**Rule 1**: Call hooks at the top level of your custom hook function -- not inside conditions, loops, or nested functions.

```jsx
// Wrong: conditional hook call inside a custom hook
function useConditionalData(shouldFetch, url) {
  if (shouldFetch) {
    const [data, setData] = useState(null);  // Breaks rules of hooks
    useEffect(() => { /* fetch */ }, [url]);
  }
}

// Right: hooks at the top level, condition inside the effect
function useConditionalData(shouldFetch, url) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!shouldFetch) return;  // Condition inside the hook body
    // fetch logic...
  }, [shouldFetch, url]);
  return data;
}
```

**Rule 2**: Only call hooks from React function components or other custom hooks. Not from regular functions, class components, or outside React.

These rules enable React to track hook state correctly across renders. The `eslint-plugin-react-hooks` package enforces them automatically.

---

## Composing Custom Hooks

Custom hooks can call other custom hooks. This is how you build layered, composable abstractions:

```jsx
// Base hook: localStorage persistence
function useLocalStorage(key, initialValue) {
  // ... (from earlier)
}

// Composed hook: user preferences with localStorage persistence
function useUserPreferences() {
  const [preferences, setPreferences] = useLocalStorage('user-prefs', {
    theme: 'light',
    fontSize: 'md',
    reducedMotion: false,
    emailNotifications: true,
  });

  function setTheme(theme) {
    setPreferences(prev => ({ ...prev, theme }));
  }

  function setFontSize(fontSize) {
    setPreferences(prev => ({ ...prev, fontSize }));
  }

  function toggleEmailNotifications() {
    setPreferences(prev => ({
      ...prev,
      emailNotifications: !prev.emailNotifications,
    }));
  }

  return {
    preferences,
    setTheme,
    setFontSize,
    toggleEmailNotifications,
  };
}

// Component: clean and simple, all logic in the hook
function SettingsPanel() {
  const { preferences, setTheme, setFontSize, toggleEmailNotifications } = useUserPreferences();

  return (
    <div>
      <select value={preferences.theme} onChange={e => setTheme(e.target.value)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
      <select value={preferences.fontSize} onChange={e => setFontSize(e.target.value)}>
        <option value="sm">Small</option>
        <option value="md">Medium</option>
        <option value="lg">Large</option>
      </select>
      <label>
        <input
          type="checkbox"
          checked={preferences.emailNotifications}
          onChange={toggleEmailNotifications}
        />
        Email Notifications
      </label>
    </div>
  );
}
```

---

## Testing Custom Hooks

Custom hooks can be tested independently of any component using the `@testing-library/react` package's `renderHook` utility:

```javascript
import { renderHook, act } from '@testing-library/react';
import useLocalStorage from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns the initial value when no stored value exists', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('returns the stored value when one exists', () => {
    localStorage.setItem('test-key', JSON.stringify('stored'));
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('stored');
  });

  it('updates localStorage when the value changes', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    act(() => {
      result.current[1]('updated');
    });
    expect(localStorage.getItem('test-key')).toBe('"updated"');
  });
});
```

Testing hooks in isolation -- separate from any UI -- makes them easier to validate and refactor.

---

## Key Takeaways

- A custom hook is a function whose name starts with `use` and that calls React hooks inside it. It lets you extract stateful logic into a reusable unit separate from components.
- Custom hooks are the right tool when you find yourself copying the same combination of `useState` + `useEffect` across multiple components.
- `useLocalStorage` wraps `useState` with automatic persistence to localStorage. `useFetch` encapsulates the fetch/loading/error pattern. `useDebounce` delays processing a changing value.
- The rules of hooks apply to custom hooks exactly as to built-in hooks: call hooks at the top level, only from function components or other custom hooks.
- Custom hooks can call other custom hooks. This enables layered abstractions where each layer handles a specific concern.
- Test custom hooks independently using `renderHook` from `@testing-library/react`. This validates the logic without needing to render any UI.

---

## Try It Yourself

**Exercise 1**: Build a `useToggle` hook that accepts an initial boolean value and returns `[value, toggle]`. The `toggle` function should flip the value. Add an optional `forceOn` and `forceOff` function to the returned object as well. Use it in at least two different components (a dropdown menu and an accordion panel).

**Exercise 2**: Create a `useFormField` hook that accepts an initial value and a validator function. It should return `{ value, onChange, error, isTouched }`. The `onChange` handler updates the value. `isTouched` becomes `true` after the first change. `error` is the result of calling the validator on the current value (return `null` for no error, a string for an error message). Use it to build a form with at least 3 fields.

**Exercise 3**: Build a `useOnClickOutside` hook that accepts a `ref` and a `callback`. When the user clicks anywhere outside the element referenced by the ref, call the callback. Use `useEffect` to attach a `mousedown` event listener to `document`. Use this hook to close a dropdown menu when clicking outside it.

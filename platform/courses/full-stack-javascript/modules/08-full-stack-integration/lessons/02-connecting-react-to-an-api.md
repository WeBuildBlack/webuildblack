---
title: "Connecting React to an API"
estimatedMinutes: 40
---

# Connecting React to an API

React components display data and respond to user input. But they start with no data -- they have to fetch it. This lesson covers everything you need to make React talk to your Express API: a reusable `useFetch` hook, CRUD operations for every HTTP method, loading and error states that keep users informed, form submissions that create and update resources, and the optimistic update pattern that makes apps feel fast.

---

## The Anatomy of a Fetch Call in React

Before building abstractions, here is the raw pattern for fetching data inside a component:

```jsx
import { useState, useEffect } from 'react';

function PostList() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // useEffect runs after the component mounts
    async function fetchPosts() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('http://localhost:3001/api/posts');

        // fetch() only rejects on network failure, not HTTP errors.
        // You must check response.ok for 4xx and 5xx status codes.
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        setPosts(data.posts);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, []); // empty array: run once on mount

  if (loading) return <p>Loading posts...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <ul>
      {posts.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

This works, but notice the problem: you need this same `loading`, `error`, and `data` state pattern for every component that fetches. That is a lot of repetition. The solution is a custom hook.

---

## Building a `useFetch` Hook

A custom hook is just a function that starts with `use` and uses other hooks internally. Here is a `useFetch` hook that handles the boilerplate for any GET request:

```javascript
// src/hooks/useFetch.js
import { useState, useEffect, useCallback } from 'react';

export function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // refreshKey increments to trigger a re-fetch on demand
  const [refreshKey, setRefreshKey] = useState(0);
  const refetch = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (!url) return;

    let cancelled = false; // prevent state update on unmounted component

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(url);
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || `Request failed with status ${response.status}`);
        }
        const json = await response.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    // Cleanup: if the component unmounts before fetch completes, ignore the result
    return () => { cancelled = true; };
  }, [url, refreshKey]);

  return { data, loading, error, refetch };
}
```

Now your components become much simpler:

```jsx
function PostList() {
  const { data, loading, error, refetch } = useFetch('http://localhost:3001/api/posts');

  if (loading) return <p>Loading posts...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <>
      <button onClick={refetch}>Refresh</button>
      <ul>
        {data.posts.map(post => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </>
  );
}
```

The `cancelled` flag in the cleanup function is important. If the user navigates away before the fetch completes, React unmounts the component. Without the flag, the effect would try to call `setData` on an unmounted component -- a common source of memory leak warnings in development.

---

## The API Module Pattern

Rather than writing `fetch('http://localhost:3001/api/posts')` throughout your components, centralize all API calls in one place. This is the same separation of concerns you applied on the server with route files.

```javascript
// src/api/posts.js

// Read the base URL from Vite environment variables (set in .env)
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// A thin wrapper around fetch that handles JSON and errors consistently
async function apiFetch(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${response.status}`);
  }

  // 204 No Content has no body to parse
  if (response.status === 204) return null;

  return response.json();
}

// Export one function per API operation
export const postsApi = {
  getAll: ()         => apiFetch('/api/posts'),
  getOne: (id)       => apiFetch(`/api/posts/${id}`),
  create: (post)     => apiFetch('/api/posts', { method: 'POST', body: JSON.stringify(post) }),
  update: (id, post) => apiFetch(`/api/posts/${id}`, { method: 'PUT', body: JSON.stringify(post) }),
  remove: (id)       => apiFetch(`/api/posts/${id}`, { method: 'DELETE' }),
};

export const commentsApi = {
  getByPost: (postId)       => apiFetch(`/api/posts/${postId}/comments`),
  create: (postId, comment) => apiFetch(`/api/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify(comment),
  }),
};
```

Now components import from `../api/posts` instead of constructing raw fetch calls. If the API URL or an endpoint path changes, you fix it in one file.

---

## Performing CRUD Operations

Reading data with `useFetch` covers GET requests. Create, update, and delete are triggered by user actions, so they use event handlers and local mutation state rather than `useEffect`.

**Creating a post (POST)**:

```jsx
import { useState } from 'react';
import { postsApi } from '../api/posts';

function CreatePostForm({ onCreated }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault(); // prevent the browser's default form navigation
    if (!title.trim() || !body.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const data = await postsApi.create({ title, body });
      setTitle('');
      setBody('');
      onCreated(data.post); // tell parent component about the new post
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="error">{error}</p>}
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Post title"
        disabled={submitting}
        required
      />
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Post body"
        disabled={submitting}
        required
      />
      <button type="submit" disabled={submitting || !title.trim()}>
        {submitting ? 'Publishing...' : 'Publish Post'}
      </button>
    </form>
  );
}
```

**Deleting a post (DELETE)**:

```jsx
function DeleteButton({ postId, onDeleted }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm('Delete this post?')) return;

    setDeleting(true);
    try {
      await postsApi.remove(postId);
      onDeleted(postId); // remove from parent's list
    } catch (err) {
      alert(`Could not delete: ${err.message}`);
      setDeleting(false);
    }
  }

  return (
    <button onClick={handleDelete} disabled={deleting}>
      {deleting ? 'Deleting...' : 'Delete'}
    </button>
  );
}
```

**Updating a post (PUT)**:

```jsx
function EditPostForm({ post, onUpdated, onCancel }) {
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const data = await postsApi.update(post.id, { title, body });
      onUpdated(data.post);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="error">{error}</p>}
      <input value={title} onChange={e => setTitle(e.target.value)} disabled={saving} />
      <textarea value={body} onChange={e => setBody(e.target.value)} disabled={saving} />
      <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      <button type="button" onClick={onCancel} disabled={saving}>Cancel</button>
    </form>
  );
}
```

---

## Lifting State: Managing the Post List

When a child component creates, updates, or deletes a post, the parent managing the list needs to know. The pattern is lifting state to the nearest common ancestor and passing callback props down.

```jsx
function BlogApp() {
  const { data, loading, error } = useFetch(`${import.meta.env.VITE_API_URL}/api/posts`);
  const [posts, setPosts] = useState([]);

  // Sync fetched data into local state so we can modify it
  useEffect(() => {
    if (data?.posts) setPosts(data.posts);
  }, [data]);

  function handleCreated(newPost) {
    // Prepend the new post so it appears at the top
    setPosts(prev => [newPost, ...prev]);
  }

  function handleUpdated(updatedPost) {
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
  }

  function handleDeleted(deletedId) {
    setPosts(prev => prev.filter(p => p.id !== deletedId));
  }

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <CreatePostForm onCreated={handleCreated} />
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      ))}
    </div>
  );
}
```

The key insight: `posts` state lives in `BlogApp`. Child components receive callbacks. When a child performs an operation, it calls the callback with the result, and the parent updates the shared list without a full page reload or re-fetch.

---

## Optimistic Updates

An optimistic update applies a change to the UI immediately, before the API call completes. If the API call fails, you roll back. This makes the app feel significantly faster.

For deleting a post, the standard approach makes the user wait 200-400ms for the server to confirm before the post disappears. With optimistic updates, the post is gone the instant they click:

```jsx
function handleDeleteOptimistic(postId) {
  // Save the post before removing it, in case we need to restore it
  const postToRemove = posts.find(p => p.id === postId);

  // Step 1: Update the UI immediately
  setPosts(prev => prev.filter(p => p.id !== postId));

  // Step 2: Call the API in the background
  postsApi.remove(postId).catch(err => {
    // Step 3: If it fails, restore the post
    console.error('Delete failed, rolling back:', err.message);
    alert(`Could not delete post. It has been restored.`);
    setPosts(prev => [postToRemove, ...prev]);
  });
}
```

Optimistic updates work best for operations that rarely fail (deleting your own content in an authenticated app, toggling a like). For operations that may frequently fail (form submissions with server-side validation), wait for the server response before updating the UI.

---

## Loading States Done Right

A spinner is better than nothing, but skeleton loading feels more professional and reduces layout shift.

**Skeleton loading** shows placeholder shapes while real content loads:

```jsx
function PostSkeleton() {
  return (
    <div className="post-card post-card--skeleton">
      <div className="skeleton-line skeleton-line--title" />
      <div className="skeleton-line" />
      <div className="skeleton-line skeleton-line--short" />
    </div>
  );
}

// In the list component, render skeletons instead of a spinner:
if (loading) {
  return (
    <div>
      {[1, 2, 3].map(i => <PostSkeleton key={i} />)}
    </div>
  );
}
```

**Per-item loading** shows feedback only on the specific item being acted on, not the whole page:

```jsx
function PostCard({ post, onDeleted }) {
  const [deleting, setDeleting] = useState(false);

  return (
    // Fade the card while the delete is in flight
    <div className="post-card" style={{ opacity: deleting ? 0.5 : 1 }}>
      <h2>{post.title}</h2>
      <p>{post.body}</p>
      <button onClick={handleDelete} disabled={deleting}>
        {deleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  );
}
```

Always disable form controls while a submission is in flight. A user who clicks "Publish" twice because nothing appeared to happen will create two posts. Setting `disabled={submitting}` is the simplest fix.

---

## Key Takeaways

- `fetch()` only rejects on network errors. Always check `response.ok` for HTTP error status codes (4xx, 5xx). Skipping this check means your app silently ignores server errors.
- Build a custom `useFetch` hook to avoid repeating loading, error, and data state in every component. Include a `cancelled` flag in the cleanup function to prevent state updates on unmounted components.
- Centralize all API calls in a module (like `src/api/posts.js`) that reads the base URL from environment variables. Components import named functions, not raw `fetch` calls.
- For mutations (POST, PUT, DELETE), use local `submitting` state to disable form controls during the API call. This prevents double-submits and gives users clear feedback.
- Lift state to the nearest common ancestor and pass callback props (`onCreated`, `onUpdated`, `onDeleted`) down to children so mutations trigger re-renders in the right place without a full re-fetch.
- Optimistic updates apply UI changes before the server responds, then roll back on failure. Use them for low-risk operations where perceived speed matters.

---

## Try It Yourself

**Exercise 1: Build a Posts Feed**
Using `useFetch`, build a `PostList` component that fetches `GET /api/posts` and renders each post's title and a snippet of the body. Show a loading state, an error state, and a "No posts yet" empty state. Add a Refresh button that re-triggers the fetch using `refetch`.

**Exercise 2: Add a Create Form**
Build a `CreatePostForm` component with controlled inputs for title and body. On submit, call `POST /api/posts` using `postsApi.create`. Disable the form while submitting, clear the inputs on success, and call an `onCreated(post)` callback. Wire it up to `BlogApp` so new posts appear at the top of the list without a page refresh.

**Exercise 3: Implement Optimistic Delete**
Add a Delete button to each post card. Implement optimistic deletion: remove the post from the list immediately, then make the API call. If the API call fails, restore the post and show an error message. To test the rollback, temporarily make `postsApi.remove` throw an error and confirm the post reappears.

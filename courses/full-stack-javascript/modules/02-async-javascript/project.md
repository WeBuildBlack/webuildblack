---
title: "Module Project: Async Data Dashboard"
estimatedMinutes: 75
---

# Module Project: Async Data Dashboard

In this project you'll build a browser-based dashboard that fetches live data from three public APIs simultaneously, displays the results in a clean layout, and handles partial failures gracefully. One slow or failing API should never block the rest of the page from loading.

You'll practice:

- Fetching from multiple APIs in parallel with `Promise.allSettled`
- Rendering results incrementally as they arrive
- Handling network errors and displaying fallback UI for failed panels
- Cancelling stale requests when the user refreshes the dashboard
- Building a retry mechanism for transient failures

---

## What You'll Build

A single-page dashboard with three data panels:

| Panel | API | Data shown |
|---|---|---|
| Top Stories | Hacker News API | 5 most recent top story titles + scores |
| Random User | RandomUser API | Name, location, email, avatar |
| Dad Joke | icanhazdadjoke API | A random dad joke |

The dashboard has a **Refresh** button. Clicking it cancels any in-flight requests and fetches fresh data.

Each panel shows:
- A loading skeleton while its request is in flight
- The data when the request succeeds
- An error message with a "Retry" button if the request fails

---

## API Reference

All three are free, require no API key, and support CORS from the browser.

**Hacker News (two-step fetch):**

```
GET https://hacker-news.firebaseio.com/v0/topstories.json
→ Returns an array of story IDs (up to 500)

GET https://hacker-news.firebaseio.com/v0/item/{id}.json
→ Returns { id, title, score, url, by, time, descendants }
```

Fetch the top story IDs, then fetch the first 5 item details in parallel.

**Random User:**

```
GET https://randomuser.me/api/
→ Returns { results: [{ name, location, email, picture, ... }] }
```

**Dad Joke:**

```
GET https://icanhazdadjoke.com/
Headers: Accept: application/json
→ Returns { id, joke, status }
```

---

## Project Structure

Create these files in a new folder (e.g., `async-dashboard/`):

```
async-dashboard/
├── index.html
├── styles.css
└── app.js
```

---

## Starter Code

### `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Async Data Dashboard</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header>
    <h1>Async Data Dashboard</h1>
    <button id="refresh-btn">Refresh</button>
  </header>

  <main class="dashboard">
    <!-- Panel 1: Hacker News Top Stories -->
    <section class="panel" id="panel-stories">
      <h2>Top Stories</h2>
      <div class="panel-content">
        <!-- TODO: JavaScript will render content here -->
      </div>
    </section>

    <!-- Panel 2: Random User -->
    <section class="panel" id="panel-user">
      <h2>Random User</h2>
      <div class="panel-content">
        <!-- TODO: JavaScript will render content here -->
      </div>
    </section>

    <!-- Panel 3: Dad Joke -->
    <section class="panel" id="panel-joke">
      <h2>Dad Joke</h2>
      <div class="panel-content">
        <!-- TODO: JavaScript will render content here -->
      </div>
    </section>
  </main>

  <script src="app.js"></script>
</body>
</html>
```

### `styles.css`

```css
/* Base styles -- feel free to customize */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: system-ui, sans-serif;
  background: #f4f4f5;
  color: #111;
  min-height: 100vh;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  background: #2C170B;
  color: white;
}

#refresh-btn {
  padding: 0.5rem 1.25rem;
  background: #AE8156;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
}

#refresh-btn:hover { background: #7D4E21; }
#refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
}

.panel {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.panel h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #2C170B;
  border-bottom: 2px solid #AE8156;
  padding-bottom: 0.5rem;
}

/* Skeleton loading state */
.skeleton {
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 4px;
  height: 1rem;
  margin-bottom: 0.75rem;
}

.skeleton.tall { height: 4rem; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Error state */
.error-state {
  color: #b91c1c;
  font-size: 0.9rem;
}

.retry-btn {
  margin-top: 0.75rem;
  padding: 0.4rem 1rem;
  background: transparent;
  border: 1px solid #b91c1c;
  color: #b91c1c;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.retry-btn:hover { background: #fef2f2; }

/* Story list */
.story-list { list-style: none; }
.story-list li { padding: 0.5rem 0; border-bottom: 1px solid #f3f4f6; font-size: 0.9rem; }
.story-list li:last-child { border-bottom: none; }
.story-score { font-weight: 600; color: #AE8156; margin-right: 0.5rem; }

/* User card */
.user-card { display: flex; gap: 1rem; align-items: flex-start; }
.user-card img { width: 64px; height: 64px; border-radius: 50%; }
.user-info p { font-size: 0.875rem; color: #555; margin-top: 0.2rem; }
.user-info strong { font-size: 1rem; color: #111; }

/* Joke */
.joke-text { font-size: 1rem; line-height: 1.6; font-style: italic; color: #333; }
```

### `app.js` (Starter -- complete the TODOs)

```javascript
// ============================================================
// app.js -- Async Data Dashboard
// ============================================================

// TODO 1: Track the current AbortController so we can cancel
// in-flight requests when the user clicks Refresh.
// Declare a module-level variable to hold it.
let activeController = null;

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * TODO 2: Implement the delay utility.
 * Returns a Promise that resolves after `ms` milliseconds.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
function delay(ms) {
  // TODO: implement using setTimeout + new Promise
}

/**
 * TODO 3: Implement fetchWithRetry.
 * Wraps fetch() with up to `maxAttempts` retries on network failure
 * or 5xx responses. Uses exponential backoff (500ms, 1000ms, 2000ms...).
 * Passes the AbortController signal through to fetch so retries can
 * be cancelled too.
 *
 * DO NOT retry on 4xx errors (client errors won't be fixed by retrying).
 * If the signal is aborted, stop retrying and let the AbortError propagate.
 *
 * @param {string} url
 * @param {RequestInit} options - fetch options (signal should be included)
 * @param {number} maxAttempts
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options = {}, maxAttempts = 3) {
  // TODO: implement retry loop with exponential backoff
  // Hint: check err.name === "AbortError" to stop retrying on cancellation
}

// ============================================================
// RENDERING HELPERS
// ============================================================

/**
 * TODO 4: Implement showSkeleton.
 * Renders a loading skeleton inside the panel's .panel-content element.
 * Use the CSS class "skeleton" for the placeholder bars.
 * The `count` parameter controls how many skeleton bars to show.
 *
 * @param {string} panelId - e.g., "panel-stories"
 * @param {number} count - number of skeleton bars
 */
function showSkeleton(panelId, count = 3) {
  // TODO: select the panel, clear its content, append `count` skeleton divs
}

/**
 * TODO 5: Implement showError.
 * Renders an error message and a Retry button inside the panel.
 * The Retry button should call the provided `retryFn` when clicked.
 *
 * @param {string} panelId
 * @param {string} message
 * @param {Function} retryFn - called when the user clicks Retry
 */
function showError(panelId, message, retryFn) {
  // TODO: render error message + retry button
  // The retry button should call retryFn() when clicked
}

/**
 * Helper: get the .panel-content element for a given panel ID.
 */
function getPanelContent(panelId) {
  return document.querySelector(`#${panelId} .panel-content`);
}

// ============================================================
// DATA FETCHERS
// ============================================================

/**
 * TODO 6: Implement fetchTopStories.
 * 1. Fetch the top story IDs from Hacker News.
 * 2. Take the first 5 IDs.
 * 3. Fetch all 5 story details IN PARALLEL (not sequentially).
 * 4. Return an array of story objects: [{ title, score, url }, ...]
 *
 * Pass `signal` to every fetch call so they can be cancelled.
 *
 * @param {AbortSignal} signal
 * @returns {Promise<Array<{title: string, score: number, url: string}>>}
 */
async function fetchTopStories(signal) {
  // TODO: implement two-step HN fetch
  // Step 1: GET https://hacker-news.firebaseio.com/v0/topstories.json
  // Step 2: GET the first 5 item details in parallel
}

/**
 * TODO 7: Implement fetchRandomUser.
 * Fetch one random user from the RandomUser API.
 * Return an object: { name, location, email, avatarUrl }
 *
 * @param {AbortSignal} signal
 * @returns {Promise<{name: string, location: string, email: string, avatarUrl: string}>}
 */
async function fetchRandomUser(signal) {
  // TODO: fetch from https://randomuser.me/api/
  // Parse results[0] into { name, location, email, avatarUrl }
  // name: `${first} ${last}`, location: `${city}, ${country}`, avatarUrl: picture.medium
}

/**
 * TODO 8: Implement fetchDadJoke.
 * Fetch a random dad joke. Requires Accept: application/json header.
 * Return just the joke string.
 *
 * @param {AbortSignal} signal
 * @returns {Promise<string>}
 */
async function fetchDadJoke(signal) {
  // TODO: fetch from https://icanhazdadjoke.com/
  // Headers: { Accept: "application/json" }
  // Return data.joke
}

// ============================================================
// RENDER FUNCTIONS
// ============================================================

/**
 * TODO 9: Implement renderStories.
 * Renders the stories array as an unordered list inside #panel-stories.
 * Each list item should show the story score and title.
 * If story.url exists, make the title a link.
 *
 * Use the CSS classes: story-list, story-score
 *
 * @param {Array<{title: string, score: number, url?: string}>} stories
 */
function renderStories(stories) {
  // TODO: build a <ul class="story-list"> with <li> items
}

/**
 * TODO 10: Implement renderUser.
 * Renders the user card inside #panel-user.
 * Show avatar image, full name (bold), location, and email.
 *
 * Use the CSS classes: user-card, user-info
 *
 * @param {{ name: string, location: string, email: string, avatarUrl: string }} user
 */
function renderUser(user) {
  // TODO: build user card HTML
}

/**
 * TODO 11: Implement renderJoke.
 * Renders the joke text inside #panel-joke.
 * Use the CSS class: joke-text
 *
 * @param {string} joke
 */
function renderJoke(joke) {
  // TODO: build joke paragraph
}

// ============================================================
// DASHBOARD ORCHESTRATION
// ============================================================

/**
 * TODO 12: Implement loadPanel.
 * This is the core function for loading a single panel.
 * It should:
 *   1. Show a skeleton with `skeletonCount` bars
 *   2. Await the `fetchFn` (which receives the AbortSignal)
 *   3. Call `renderFn` with the fetched data on success
 *   4. Call showError with a friendly message and a retry callback on failure
 *      (do NOT show an error for AbortError -- that's an intentional cancel)
 *
 * @param {string} panelId
 * @param {Function} fetchFn - async (signal) => data
 * @param {Function} renderFn - (data) => void
 * @param {AbortSignal} signal
 * @param {number} skeletonCount
 */
async function loadPanel(panelId, fetchFn, renderFn, signal, skeletonCount = 3) {
  // TODO: show skeleton, fetch data, render or show error
}

/**
 * TODO 13: Implement loadDashboard.
 * This is the main orchestration function. It should:
 *   1. Cancel any in-flight requests from a previous load
 *      (abort the existing activeController if it exists)
 *   2. Create a new AbortController and store it in activeController
 *   3. Disable the Refresh button (add "disabled" attribute)
 *   4. Start all THREE panels loading simultaneously (not sequentially)
 *      using Promise.allSettled so one failure doesn't block others
 *   5. Re-enable the Refresh button when all panels have settled
 *
 * Each panel should load independently -- a slow or failing panel
 * must not delay the others.
 */
async function loadDashboard() {
  // TODO: implement full orchestration
  // Hint: use Promise.allSettled with three loadPanel calls
}

// ============================================================
// INITIALIZATION
// ============================================================

// TODO 14: Wire up the Refresh button and load the dashboard on startup.
// The Refresh button click should call loadDashboard().
// Call loadDashboard() once when the script first runs.

document.getElementById("refresh-btn").addEventListener("click", () => {
  // TODO: call loadDashboard
});

// TODO: call loadDashboard once on page load
```

---

## Implementation Guide

Work through the TODOs in order. Each builds on the previous.

**TODOs 1-3 (utilities):** These are pure JavaScript with no DOM interaction. Test them in isolation using `console.log` before moving on.

**TODOs 4-5 (skeleton + error UI):** Open `index.html` in the browser and test `showSkeleton("panel-stories", 4)` from the console before integrating it into `loadPanel`.

**TODOs 6-8 (fetchers):** Test each fetcher independently in the browser console by calling `fetchTopStories(new AbortController().signal)` etc. Confirm the data shape matches what the render functions expect.

**TODOs 9-11 (renderers):** Test with hardcoded mock data before connecting to real API data.

**TODO 12 (loadPanel):** This is the most important function. It ties skeleton, fetch, render, and error handling together for a single panel.

**TODO 13 (loadDashboard):** Once `loadPanel` works for each panel individually, use `Promise.allSettled` to launch all three simultaneously.

**TODO 14 (init):** The last step -- wire up the button and fire the first load.

---

## Stretch Goals

Work on these after the core requirements are complete.

**Stretch 1: Per-panel loading time display**

Show how long each panel took to load. Capture `Date.now()` before and after each fetch and display it below the panel content (e.g., "Loaded in 312ms").

**Stretch 2: Stale data indicator**

After each successful load, record the timestamp. Add text below the panel content that shows "Last updated X seconds ago" and updates every 10 seconds using `setInterval`.

**Stretch 3: Auto-refresh**

Add a checkbox labeled "Auto-refresh every 30s." When checked, call `loadDashboard()` on a 30-second interval using `setInterval`. When unchecked, clear the interval.

**Stretch 4: Offline detection**

Listen for the browser's `online` and `offline` events (`window.addEventListener("offline", ...)`). When the browser goes offline, show a banner at the top of the page. When it comes back online, automatically refresh the dashboard.

**Stretch 5: Request waterfall visualization**

Render a simple horizontal bar chart below the dashboard showing when each panel's fetch started and ended (relative timing). This is similar to the Network tab in DevTools and reinforces parallel vs. sequential timing concepts.

---

## Submission Checklist

Before you consider this project complete, verify each item:

- [ ] All three panels load simultaneously (not one after another) -- confirm with the Network tab in DevTools
- [ ] A failing panel shows an error message with a working Retry button -- test by temporarily breaking a URL
- [ ] The Refresh button cancels in-flight requests -- confirm with the Network tab (look for cancelled requests)
- [ ] Rapid clicks on Refresh don't cause multiple simultaneous full loads
- [ ] The Refresh button is disabled while loading and re-enabled when all panels settle
- [ ] AbortErrors are silently ignored (no error shown to user when refresh cancels a previous load)
- [ ] The page is usable on a mobile-sized viewport (check with browser DevTools device simulation)
- [ ] No unhandled Promise rejections in the browser console during normal operation or intentional errors

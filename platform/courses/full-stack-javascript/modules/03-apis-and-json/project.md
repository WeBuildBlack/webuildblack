---
title: "Module Project: API Explorer"
estimatedMinutes: 75
---

# Module Project: API Explorer

You've learned what APIs are, how JSON works, how to use `fetch()`, how REST conventions are structured, and how to handle authentication and rate limits. Now you'll put it all together by building an **API Explorer**: a browser-based tool that lets you browse and test public APIs, display formatted and readable JSON responses, and manage request history.

This is a real utility that developers use every day in some form (Postman and Insomnia are professional versions of exactly this idea). Yours will be simpler, but fully functional.

---

## What You're Building

A single-page web application with three panels:

```
┌────────────────────────────────────────────────────────────────┐
│  API Explorer                                          WBB     │
├──────────────────┬─────────────────────────────────────────────┤
│                  │                                             │
│  Request Panel   │  Response Panel                            │
│                  │                                             │
│  Method: [GET v] │  Status: 200 OK  [Time: 143ms]             │
│  URL: [_______]  │                                             │
│  Headers: [+]    │  {                                         │
│  Body: [+]       │    "id": 1,                                │
│                  │    "name": "Jordan Williams",               │
│  [Send Request]  │    "email": "jordan@example.com"           │
│                  │  }                                         │
│  History (5)     │                                             │
│  > GET /users/1  │  [Copy JSON]  [Format: Pretty v]           │
│  > GET /posts    │                                             │
│  > POST /posts   │                                             │
└──────────────────┴─────────────────────────────────────────────┘
```

---

## Project Structure

```
api-explorer/
├── index.html       -- main HTML structure
├── styles.css       -- layout and styling
└── app.js           -- all application logic
```

---

## Starter Code

### index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>API Explorer</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header>
    <h1>API Explorer</h1>
    <p class="subtitle">Test any public REST API from your browser</p>
  </header>

  <main class="explorer-layout">

    <!-- Left panel: request builder -->
    <section class="request-panel" aria-label="Request builder">

      <div class="field-group">
        <label for="method-select">Method</label>
        <select id="method-select">
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      <div class="field-group">
        <label for="url-input">URL</label>
        <input
          type="url"
          id="url-input"
          placeholder="https://jsonplaceholder.typicode.com/posts/1"
          autocomplete="off"
        />
      </div>

      <!-- TODO: Add a collapsible "Headers" section -->
      <!-- It should show a dynamic list of key/value input pairs -->
      <!-- with an "Add Header" button and a remove button per row -->
      <div class="field-group collapsible" id="headers-section">
        <button class="collapsible-toggle" aria-expanded="false" aria-controls="headers-body">
          Headers <span class="header-count">(0)</span>
        </button>
        <div class="collapsible-body" id="headers-body" hidden>
          <div id="headers-list">
            <!-- TODO: Dynamically render header rows here -->
          </div>
          <button type="button" id="add-header-btn" class="btn-secondary">
            + Add Header
          </button>
        </div>
      </div>

      <!-- TODO: Add a collapsible "Body" section -->
      <!-- It should show a textarea for JSON input -->
      <!-- Only enable it when method is POST, PUT, or PATCH -->
      <div class="field-group collapsible" id="body-section">
        <button class="collapsible-toggle" aria-expanded="false" aria-controls="body-content">
          Body
        </button>
        <div class="collapsible-body" id="body-content" hidden>
          <textarea
            id="body-input"
            placeholder='{"key": "value"}'
            rows="6"
            spellcheck="false"
          ></textarea>
          <p id="body-validation-msg" class="validation-msg" hidden></p>
        </div>
      </div>

      <button type="button" id="send-btn" class="btn-primary">
        Send Request
      </button>

      <!-- TODO: Add a "Quick Load" section with preset URLs -->
      <!-- Include at least 5 preset requests from different resources -->
      <div class="presets-section">
        <h3>Quick Load</h3>
        <ul id="presets-list">
          <!-- TODO: Render preset buttons here -->
        </ul>
      </div>

      <!-- History panel -->
      <div class="history-section">
        <h3>
          History
          <button type="button" id="clear-history-btn" class="btn-link">Clear</button>
        </h3>
        <ul id="history-list" aria-label="Request history">
          <!-- TODO: Dynamically render history items here -->
        </ul>
      </div>

    </section>

    <!-- Right panel: response viewer -->
    <section class="response-panel" aria-label="Response viewer">

      <div class="response-meta" id="response-meta" hidden>
        <span id="status-badge" class="status-badge"></span>
        <span id="response-time" class="response-time"></span>
        <span id="response-size" class="response-size"></span>
      </div>

      <!-- TODO: Add response format tabs: "Pretty", "Raw", "Headers" -->
      <div class="response-tabs" id="response-tabs" hidden>
        <button class="tab active" data-tab="pretty">Pretty</button>
        <button class="tab" data-tab="raw">Raw</button>
        <button class="tab" data-tab="headers">Headers</button>
      </div>

      <div id="response-placeholder" class="response-placeholder">
        <p>Send a request to see the response here.</p>
      </div>

      <!-- TODO: This pre element will display the formatted JSON response -->
      <pre id="response-body" class="response-body" hidden></pre>

      <!-- TODO: Wire up the copy button to copy the current response text -->
      <div class="response-actions" id="response-actions" hidden>
        <button type="button" id="copy-btn" class="btn-secondary">Copy JSON</button>
      </div>

    </section>

  </main>

  <script src="app.js" type="module"></script>
</body>
</html>
```

### styles.css

```css
/* Base styles and CSS custom properties */
:root {
  --color-dark-brown: #2C170B;
  --color-medium-brown: #7D4E21;
  --color-warm-brown: #AE8156;
  --color-gold: #C9A84C;
  --color-bg: #0f0f0f;
  --color-surface: #1a1a1a;
  --color-surface-2: #242424;
  --color-border: #333;
  --color-text: #e8e8e8;
  --color-text-muted: #888;
  --color-success: #4ade80;
  --color-warning: #facc15;
  --color-error: #f87171;
  --font-mono: "Fira Code", "Cascadia Code", "Consolas", monospace;
  --font-sans: "Inter", "Segoe UI", system-ui, sans-serif;
  --radius: 6px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font-sans);
  background: var(--color-bg);
  color: var(--color-text);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  background: var(--color-dark-brown);
  padding: 1rem 1.5rem;
  border-bottom: 2px solid var(--color-medium-brown);
}

header h1 { font-size: 1.25rem; font-weight: 700; }
header .subtitle { font-size: 0.8rem; color: var(--color-warm-brown); margin-top: 0.2rem; }

.explorer-layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  flex: 1;
  gap: 0;
  overflow: hidden;
}

/* TODO: Add responsive styles for screens narrower than 768px */
/* The two panels should stack vertically on small screens */

.request-panel {
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  padding: 1.25rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.response-panel {
  background: var(--color-bg);
  padding: 1.25rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field-group { display: flex; flex-direction: column; gap: 0.4rem; }
.field-group label { font-size: 0.75rem; text-transform: uppercase; color: var(--color-text-muted); letter-spacing: 0.05em; }

select, input[type="url"], textarea {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text);
  padding: 0.5rem 0.75rem;
  font-family: var(--font-sans);
  font-size: 0.875rem;
  width: 100%;
}

select:focus, input:focus, textarea:focus {
  outline: 2px solid var(--color-gold);
  outline-offset: -1px;
}

textarea { font-family: var(--font-mono); resize: vertical; }

.btn-primary {
  background: var(--color-medium-brown);
  color: white;
  border: none;
  border-radius: var(--radius);
  padding: 0.6rem 1.25rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-primary:hover { background: var(--color-warm-brown); }
.btn-primary:disabled { background: var(--color-border); cursor: not-allowed; }

.btn-secondary {
  background: var(--color-surface-2);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  cursor: pointer;
}
.btn-secondary:hover { border-color: var(--color-warm-brown); }

.btn-link {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 0.8rem;
  text-decoration: underline;
}

.collapsible-toggle {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0.4rem 0.75rem;
  text-align: left;
  width: 100%;
}

.collapsible-body { margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; }

.header-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.4rem; align-items: center; }
.header-row input { padding: 0.35rem 0.5rem; font-size: 0.8rem; }

.validation-msg { font-size: 0.75rem; color: var(--color-error); }

.response-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.status-badge {
  font-weight: 700;
  font-size: 0.9rem;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
}
.status-badge.success { background: rgba(74, 222, 128, 0.15); color: var(--color-success); }
.status-badge.redirect { background: rgba(250, 204, 21, 0.15); color: var(--color-warning); }
.status-badge.client-error { background: rgba(248, 113, 113, 0.15); color: var(--color-error); }
.status-badge.server-error { background: rgba(248, 113, 113, 0.15); color: var(--color-error); }

.response-time, .response-size {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.response-tabs { display: flex; gap: 0.25rem; border-bottom: 1px solid var(--color-border); padding-bottom: 0.5rem; }
.tab {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius);
}
.tab.active { background: var(--color-surface); color: var(--color-gold); }

.response-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 200px;
  color: var(--color-text-muted);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius);
}

.response-body {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-family: var(--font-mono);
  font-size: 0.825rem;
  line-height: 1.6;
  overflow: auto;
  padding: 1rem;
  white-space: pre-wrap;
  word-break: break-all;
  flex: 1;
}

.response-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }

.history-section h3, .presets-section h3 {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

#history-list, #presets-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.history-item, .preset-item {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.4rem 0.75rem;
  text-align: left;
  width: 100%;
}
.history-item:hover, .preset-item:hover { border-color: var(--color-warm-brown); }

.method-badge {
  font-weight: 700;
  font-size: 0.7rem;
  margin-right: 0.4rem;
  opacity: 0.85;
}
.method-GET { color: var(--color-success); }
.method-POST { color: var(--color-gold); }
.method-PUT { color: #60a5fa; }
.method-PATCH { color: #c084fc; }
.method-DELETE { color: var(--color-error); }
```

### app.js

```javascript
// app.js -- API Explorer application logic
// Module 03 Project: APIs & JSON

// ─── State ───────────────────────────────────────────────────────────────────

const state = {
  history: [],        // array of { method, url, headers, body, response, time }
  activeTab: "pretty", // "pretty" | "raw" | "headers"
  currentResponse: null, // the most recent Response object
};

// ─── Preset Requests ─────────────────────────────────────────────────────────

// TODO: Define at least 5 preset requests
// Each preset should have: { label, method, url, headers?, body? }
// Include presets from different JSONPlaceholder resources (posts, users, todos, comments)
// and at least one POST preset with a body
const PRESETS = [
  // TODO: Add preset objects here
  // Example shape:
  // {
  //   label: "Get all posts",
  //   method: "GET",
  //   url: "https://jsonplaceholder.typicode.com/posts",
  // },
];

// ─── DOM References ──────────────────────────────────────────────────────────

const methodSelect = document.getElementById("method-select");
const urlInput = document.getElementById("url-input");
const headersSection = document.getElementById("headers-section");
const headersList = document.getElementById("headers-list");
const addHeaderBtn = document.getElementById("add-header-btn");
const bodySection = document.getElementById("body-section");
const bodyInput = document.getElementById("body-input");
const bodyValidationMsg = document.getElementById("body-validation-msg");
const sendBtn = document.getElementById("send-btn");
const presetsListEl = document.getElementById("presets-list");
const historyListEl = document.getElementById("history-list");
const responseMeta = document.getElementById("response-meta");
const statusBadge = document.getElementById("status-badge");
const responseTimeEl = document.getElementById("response-time");
const responseSizeEl = document.getElementById("response-size");
const responseTabsEl = document.getElementById("response-tabs");
const responsePlaceholder = document.getElementById("response-placeholder");
const responseBodyEl = document.getElementById("response-body");
const responseActionsEl = document.getElementById("response-actions");
const copyBtn = document.getElementById("copy-btn");
const clearHistoryBtn = document.getElementById("clear-history-btn");

// ─── Initialization ───────────────────────────────────────────────────────────

function init() {
  renderPresets();
  bindEventListeners();
  // TODO: Load history from localStorage so it persists across page reloads
}

// ─── Event Listeners ─────────────────────────────────────────────────────────

function bindEventListeners() {
  sendBtn.addEventListener("click", handleSendRequest);

  // TODO: Bind the "Add Header" button to addHeaderRow()
  // TODO: Bind collapsible toggles to toggleCollapsible()
  // TODO: Bind the method select to updateBodySectionVisibility()
  //   (Body should only be enabled for POST, PUT, PATCH)
  // TODO: Bind response tab buttons to handleTabChange()
  // TODO: Bind the copy button to handleCopyResponse()
  // TODO: Bind the clear history button to clearHistory()
  // TODO: Add a "keydown" listener on the URL input so pressing Enter sends the request
  // TODO: Add an "input" listener on the body textarea to validateJsonBody()
}

// ─── Core: Send Request ───────────────────────────────────────────────────────

async function handleSendRequest() {
  const url = urlInput.value.trim();
  const method = methodSelect.value;

  // TODO: Validate the URL is not empty -- show an error in the UI if it is

  // TODO: Validate the URL is a valid URL -- use the URL constructor in a try/catch
  // If invalid, show a validation error below the URL input

  // TODO: Collect headers from the header rows (getHeadersFromUI())

  // TODO: Validate the body textarea contains valid JSON if the method requires a body
  // Show an error if it's not valid JSON

  // TODO: Disable the send button and show a loading state while the request is in flight

  const startTime = performance.now();

  // TODO: Call sendRequest(method, url, headers, body) inside a try/catch
  // On success: call handleResponse(response, elapsed)
  // On network error: show a clear error message in the response panel

  const elapsed = Math.round(performance.now() - startTime);

  // TODO: Re-enable the send button after the request completes (success or error)
}

async function sendRequest(method, url, headers = {}, body = null) {
  // TODO: Build the fetch options object
  // - Set the method
  // - Set the headers (merge with Content-Type: application/json if body is present)
  // - Stringify and attach the body if it's not null and method supports a body

  // TODO: Call fetch() and return the response
  // Do NOT call response.json() here -- the caller will handle body parsing
}

// ─── Response Handling ────────────────────────────────────────────────────────

async function handleResponse(response, elapsedMs) {
  // TODO: Store the response in state.currentResponse

  // TODO: Show the response meta bar (status badge, time, size)
  // - Set the status badge text to "${status} ${statusText}" (e.g., "200 OK")
  // - Apply the correct CSS class based on status code family:
  //   2xx = "success", 3xx = "redirect", 4xx = "client-error", 5xx = "server-error"
  // - Set response time to "${elapsedMs}ms"

  // TODO: Read the response body as text (not json -- we want the raw string)

  // TODO: Calculate response size in KB from the body text length

  // TODO: Store the body text so the tab switcher can display it
  //   - "pretty" tab: call formatJson(bodyText) to pretty-print if it's valid JSON
  //   - "raw" tab: show the raw body text
  //   - "headers" tab: format the response headers as a readable list

  // TODO: Show the response body pre element and hide the placeholder

  // TODO: Show the response tabs and actions bar

  // TODO: Add this request + response to the history (addToHistory())
}

// ─── JSON Formatting ─────────────────────────────────────────────────────────

function formatJson(text) {
  // TODO: Try to parse the text as JSON and re-stringify it with 2-space indentation
  // If parsing fails (it's not JSON), return the original text unchanged
  // Tip: use JSON.parse() and JSON.stringify(parsed, null, 2)
}

// ─── Headers UI ──────────────────────────────────────────────────────────────

function addHeaderRow(key = "", value = "") {
  // TODO: Create a new header row element with:
  //   - A key input (placeholder: "Header name")
  //   - A value input (placeholder: "Header value")
  //   - A remove button (calls removeHeaderRow when clicked)
  // Append the row to headersList
  // Update the header count badge in the toggle button
}

function removeHeaderRow(rowElement) {
  // TODO: Remove the row from the DOM
  // Update the header count badge
}

function getHeadersFromUI() {
  // TODO: Read all header rows from headersList
  // Return a plain object: { "Header-Name": "header-value", ... }
  // Skip rows where the key input is empty
}

// ─── Body Validation ─────────────────────────────────────────────────────────

function validateJsonBody() {
  const text = bodyInput.value.trim();

  if (!text) {
    // Empty body is fine
    bodyValidationMsg.hidden = true;
    return true;
  }

  // TODO: Try to parse the body text as JSON
  // If valid: hide the validation message, return true
  // If invalid: show the validation message with the parse error, return false
}

// ─── Collapsible Sections ────────────────────────────────────────────────────

function toggleCollapsible(toggleButton) {
  // TODO: Toggle the aria-expanded attribute on the button
  // Toggle the hidden attribute on the collapsible body (use aria-controls to find it)
}

// ─── Tab Switching ────────────────────────────────────────────────────────────

function handleTabChange(tabName) {
  // TODO: Update state.activeTab
  // TODO: Update active class on tab buttons
  // TODO: Update the content displayed in responseBodyEl based on tabName:
  //   "pretty" -- show formatted JSON
  //   "raw" -- show raw response text
  //   "headers" -- format and show response headers
}

function formatResponseHeaders(response) {
  // TODO: Iterate over response.headers entries
  // Format as "Header-Name: value\n" for each header
  // Return the full string
}

// ─── History ─────────────────────────────────────────────────────────────────

function addToHistory(method, url, responseStatus, bodyText) {
  // TODO: Create a history entry object with: method, url, responseStatus, bodyText, timestamp
  // Prepend it to state.history (newest first)
  // Keep only the last 20 entries to avoid unbounded growth
  // Re-render the history list
  // TODO (stretch): Persist to localStorage
}

function renderHistory() {
  // TODO: Clear historyListEl
  // For each entry in state.history, create a list item button:
  //   - Show: [METHOD BADGE] /path/to/resource  [status code]
  //   - Clicking the item should reload that request into the request panel
  //   - Clicking should also re-display that response in the response panel
  // If history is empty, show a "No history yet" message
}

function clearHistory() {
  // TODO: Clear state.history
  // Re-render the history list
  // TODO (stretch): Clear localStorage
}

function loadHistoryEntry(entry) {
  // TODO: Populate the method select and URL input from the history entry
  // Display the stored response in the response panel
}

// ─── Presets ─────────────────────────────────────────────────────────────────

function renderPresets() {
  // TODO: Clear presetsListEl
  // For each preset in PRESETS, create a button list item
  // Clicking a preset should populate the method, URL, headers, and body fields
  // and immediately send the request
}

function loadPreset(preset) {
  // TODO: Set methodSelect.value to preset.method
  // Set urlInput.value to preset.url
  // Clear and re-populate header rows from preset.headers (if any)
  // Set bodyInput.value to preset.body (if any), otherwise clear it
  // Update body section visibility based on the method
  // Trigger handleSendRequest()
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function updateBodySectionVisibility() {
  // TODO: Check the current method
  // If POST, PUT, or PATCH: enable the body textarea and remove any "disabled" styling
  // If GET or DELETE: clear the body textarea and disable it (add visual indicator)
}

async function handleCopyResponse() {
  // TODO: Get the text currently displayed in responseBodyEl
  // Use navigator.clipboard.writeText() to copy it
  // Briefly change the button text to "Copied!" and revert after 1.5 seconds
}

function showError(message) {
  // TODO: Display an error message in the response panel
  // Replace the placeholder content with a styled error message
  // Make sure the error is accessible (visible text, not just color)
}

// ─── Start the app ───────────────────────────────────────────────────────────

init();
```

---

## Implementation Guide

Complete the TODOs in order. Each builds on the previous.

**Phase 1: Core request/response (get this working first)**
1. Implement `sendRequest()` to build and fire the `fetch()` call
2. Implement `handleSendRequest()` with basic URL validation and the fetch call
3. Implement `handleResponse()` to show the status badge and formatted body
4. Implement `formatJson()` to pretty-print JSON responses

**Phase 2: UI interactions**
5. Implement collapsible toggles (`toggleCollapsible`)
6. Implement `addHeaderRow()`, `removeHeaderRow()`, and `getHeadersFromUI()`
7. Implement `updateBodySectionVisibility()` and `validateJsonBody()`
8. Wire up all event listeners in `bindEventListeners()`

**Phase 3: History and presets**
9. Define 5+ presets in the `PRESETS` array
10. Implement `renderPresets()` and `loadPreset()`
11. Implement `addToHistory()`, `renderHistory()`, and `loadHistoryEntry()`

**Phase 4: Tab switching and copy**
12. Implement `handleTabChange()` and `formatResponseHeaders()`
13. Implement `handleCopyResponse()`

---

## Stretch Goals

Once the core features work, try these enhancements:

1. **LocalStorage persistence.** Save and restore request history across page reloads using `localStorage.setItem` and `localStorage.getItem` with `JSON.stringify`/`JSON.parse`.

2. **Syntax highlighting.** Add basic JSON syntax highlighting to the pretty view by using a regex to color strings, numbers, booleans, and null values different colors using `<span>` elements.

3. **Request timing breakdown.** Use the `performance` API or `PerformanceObserver` to show DNS lookup, TCP connection, and response time separately.

4. **Shareable links.** Encode the current request (method, URL, headers, body) as a base64 URL parameter so you can share a link that pre-populates the explorer.

5. **AbortController timeout.** Add a timeout input (default 10 seconds) and wire up `AbortController` to cancel requests that run too long.

---

## Submission Checklist

Before marking this project complete, verify:

- [ ] Sending a GET request to a JSONPlaceholder URL shows a formatted JSON response with status badge and time
- [ ] Sending a POST request with a JSON body shows the created resource in the response
- [ ] Invalid URLs show a clear error message (not a browser crash)
- [ ] Non-JSON responses (like HTML error pages) display as raw text without throwing
- [ ] Adding and removing custom headers works correctly
- [ ] Body section is only enabled for POST, PUT, and PATCH
- [ ] Invalid JSON in the body shows a validation error before sending
- [ ] At least 5 presets load and fire correctly
- [ ] History records each request and clicking a history item reloads it
- [ ] The copy button copies the response text to the clipboard
- [ ] Response tab switching (Pretty / Raw / Headers) works correctly
- [ ] The layout looks reasonable on both desktop and mobile widths

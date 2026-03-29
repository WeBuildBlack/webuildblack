---
title: "Building Interactive Features"
estimatedMinutes: 50
---

# Building Interactive Features

Over the past four lessons, you have built up a powerful toolkit. You can select elements, modify them, and respond to events. Now it is time to combine these skills to build real interactive features, the kind of things you see on actual websites every day.

This lesson is about patterns. Just like a carpenter has standard techniques for joining wood, web developers have standard patterns for building interactive UI. Once you learn these patterns, you can adapt them to countless situations.

We will also introduce two new browser APIs: **localStorage** for saving data and **fetch()** for loading data from the internet. These round out your browser JavaScript skills and prepare you for the module project.

---

## The Pattern: Selecting + Modifying + Events

Every interactive feature follows the same three-step pattern:

1. **Select** the elements involved (buttons, containers, inputs)
2. **Listen** for an event (click, submit, keydown)
3. **Modify** the DOM in response (show/hide, add/remove, update text)

Once you see this pattern, you will recognize it in every interactive website. Let's apply it to build three features you encounter everywhere.

---

## Pattern 1: Modal / Popup

A **modal** is a box that appears on top of the page, usually to show a message, a form, or a confirmation dialog. The user clicks a button to open it, and clicks an X (or a backdrop) to close it.

The trick: the modal HTML is *always* on the page, but hidden with CSS. JavaScript just toggles a class to show and hide it.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Modal Example</title>
    <style>
      /* The overlay covers the entire screen */
      .modal-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.6);
        justify-content: center;
        align-items: center;
      }

      /* When "active" is added, show the overlay with flexbox */
      .modal-overlay.active {
        display: flex;
      }

      .modal-box {
        background: white;
        padding: 32px;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
      }

      .modal-close {
        float: right;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
      }
    </style>
    <script src="modal.js" defer></script>
  </head>
  <body>
    <h1>Join We Build Black</h1>
    <button id="open-modal-btn">Learn More</button>

    <div id="modal" class="modal-overlay">
      <div class="modal-box">
        <button class="modal-close" id="close-modal-btn">&times;</button>
        <h2>About Our Programs</h2>
        <p>We Build Black offers free technical education and workforce development programs for the Black community. From beginner workshops to advanced career preparation, we have a path for you.</p>
        <button id="signup-btn">Sign Up Now</button>
      </div>
    </div>
  </body>
</html>
```

```javascript
// modal.js
const openBtn = document.querySelector("#open-modal-btn");
const closeBtn = document.querySelector("#close-modal-btn");
const modal = document.querySelector("#modal");

// Open the modal
openBtn.addEventListener("click", function() {
  modal.classList.add("active");
});

// Close with the X button
closeBtn.addEventListener("click", function() {
  modal.classList.remove("active");
});

// Close by clicking the dark overlay (but NOT the modal box itself)
modal.addEventListener("click", function(event) {
  // event.target is the overlay itself, not a child element
  if (event.target === modal) {
    modal.classList.remove("active");
  }
});

// Close with the Escape key
document.addEventListener("keydown", function(event) {
  if (event.key === "Escape") {
    modal.classList.remove("active");
  }
});
```

Notice how the JavaScript is straightforward. Just `classList.add("active")` and `classList.remove("active")`. All the visual work happens in CSS. This is the clean separation between JavaScript (behavior) and CSS (appearance) in action.

---

## Pattern 2: Accordion / FAQ

An **accordion** is a list of sections where clicking a heading expands or collapses the content below it. This is perfect for FAQs, settings panels, and content-heavy pages.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>FAQ Accordion</title>
    <style>
      .accordion-item {
        border: 1px solid #ddd;
        margin-bottom: 4px;
        border-radius: 8px;
        overflow: hidden;
      }

      .accordion-header {
        width: 100%;
        padding: 16px;
        background: #f8f8f8;
        border: none;
        text-align: left;
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .accordion-body {
        padding: 0 16px;
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease, padding 0.3s ease;
      }

      .accordion-item.open .accordion-body {
        max-height: 200px;
        padding: 16px;
      }

      .accordion-item.open .accordion-header .arrow {
        transform: rotate(180deg);
      }

      .arrow {
        transition: transform 0.3s ease;
      }
    </style>
    <script src="accordion.js" defer></script>
  </head>
  <body>
    <h1>Frequently Asked Questions</h1>
    <div id="faq-accordion">
      <div class="accordion-item">
        <button class="accordion-header">
          What is We Build Black?
          <span class="arrow">&#9660;</span>
        </button>
        <div class="accordion-body">
          <p>We Build Black is a 501(c)(3) non-profit that empowers the Black community through technical education and professional development. We were founded in 2016 in Brooklyn, NY.</p>
        </div>
      </div>
      <div class="accordion-item">
        <button class="accordion-header">
          Are the programs free?
          <span class="arrow">&#9660;</span>
        </button>
        <div class="accordion-body">
          <p>Yes! All of our programs, including Fast Track, Crowns of Code, and The Bridge, are completely free for participants.</p>
        </div>
      </div>
      <div class="accordion-item">
        <button class="accordion-header">
          How do I join?
          <span class="arrow">&#9660;</span>
        </button>
        <div class="accordion-body">
          <p>Join our Slack community to connect with other members and hear about upcoming cohorts and events. You can also apply directly to specific programs through our website.</p>
        </div>
      </div>
    </div>
  </body>
</html>
```

```javascript
// accordion.js
const accordion = document.querySelector("#faq-accordion");

// Event delegation - one listener for all headers
accordion.addEventListener("click", function(event) {
  // Find the closest accordion-header that was clicked
  const header = event.target.closest(".accordion-header");

  if (header) {
    // Get the parent accordion-item
    const item = header.parentElement;

    // Toggle it open/closed
    item.classList.toggle("open");
  }
});
```

We used `event.target.closest(".accordion-header")` here. The `closest()` method walks up the DOM tree from `event.target` and returns the first ancestor that matches the selector. This is useful because the user might click the arrow `<span>` inside the button. `closest()` ensures we still find the header button regardless of which child was clicked.

---

## Pattern 3: Tab Navigation

**Tabs** let users switch between different content panels without leaving the page. One tab is active and its content is visible; the others are hidden.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Tab Navigation</title>
    <style>
      .tab-buttons { display: flex; gap: 0; border-bottom: 2px solid #ddd; }
      .tab-btn {
        padding: 12px 24px;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 16px;
        border-bottom: 3px solid transparent;
        margin-bottom: -2px;
      }
      .tab-btn.active { border-bottom-color: #7D4E21; font-weight: bold; color: #7D4E21; }
      .tab-panel { display: none; padding: 20px; }
      .tab-panel.active { display: block; }
    </style>
    <script src="tabs.js" defer></script>
  </head>
  <body>
    <h1>Our Programs</h1>

    <div class="tab-buttons">
      <button class="tab-btn active" data-tab="fast-track">Fast Track</button>
      <button class="tab-btn" data-tab="crowns">Crowns of Code</button>
      <button class="tab-btn" data-tab="bridge">The Bridge</button>
    </div>

    <div id="fast-track" class="tab-panel active">
      <h2>Fast Track</h2>
      <p>A 6-month workforce development program with a $6,000 stipend. Members learn Android development, UX design, or data analytics with mentorship and partner internship opportunities.</p>
    </div>
    <div id="crowns" class="tab-panel">
      <h2>Crowns of Code</h2>
      <p>A free youth coding program that teaches kids ages 10-17 the fundamentals of programming through hands-on projects and community mentorship.</p>
    </div>
    <div id="bridge" class="tab-panel">
      <h2>The Bridge</h2>
      <p>An 8-week interview accountability program. Members join pods, practice DSA and system design, do mock interviews, and support each other through the job search process.</p>
    </div>
  </body>
</html>
```

```javascript
// tabs.js
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

tabButtons.forEach(function(button) {
  button.addEventListener("click", function() {
    // Remove "active" from ALL buttons and panels
    tabButtons.forEach(function(btn) {
      btn.classList.remove("active");
    });
    tabPanels.forEach(function(panel) {
      panel.classList.remove("active");
    });

    // Add "active" to the clicked button
    button.classList.add("active");

    // Find and show the matching panel using the data-tab attribute
    const tabId = button.dataset.tab;
    const targetPanel = document.querySelector("#" + tabId);
    targetPanel.classList.add("active");
  });
});
```

The key here is the `data-tab` attribute connecting each button to its panel. When a button is clicked, we read `button.dataset.tab` to find out which panel to show. This is a clean way to connect related elements without relying on their position in the DOM.

---

## Introduction to `localStorage`

Everything we have built so far disappears when the user refreshes the page. Variables reset, DOM changes vanish, and the user starts from scratch. **`localStorage`** lets you save data in the browser that persists across page refreshes and even browser restarts.

Think of `localStorage` as a small notebook that the browser keeps for your website. Your JavaScript can write notes in it, and those notes will still be there the next time the user visits.

### The Basics

`localStorage` stores data as key-value pairs, where both the key and value are **strings**:

```javascript
// Save a value
localStorage.setItem("username", "Devin");

// Read a value
const name = localStorage.getItem("username");
console.log(name); // "Devin"

// Remove a value
localStorage.removeItem("username");

// Clear everything (use with caution!)
localStorage.clear();
```

### Storing Objects and Arrays

Since `localStorage` only stores strings, you need to convert objects and arrays to JSON strings before saving, and parse them back when reading. You learned about objects and arrays in Module 08. Now we add `JSON.stringify()` and `JSON.parse()` to work with them in storage:

```javascript
// Save an array
const skills = ["HTML", "CSS", "JavaScript"];
localStorage.setItem("mySkills", JSON.stringify(skills));

// Read it back
const savedSkills = JSON.parse(localStorage.getItem("mySkills"));
console.log(savedSkills); // ["HTML", "CSS", "JavaScript"]
console.log(savedSkills[0]); // "HTML"

// Save an object
const user = { name: "Aisha", track: "UX Design", milestone: 3 };
localStorage.setItem("currentUser", JSON.stringify(user));

// Read it back
const savedUser = JSON.parse(localStorage.getItem("currentUser"));
console.log(savedUser.name); // "Aisha"
```

**`JSON.stringify()`** converts a JavaScript value (object, array, etc.) into a JSON string.
**`JSON.parse()`** converts a JSON string back into a JavaScript value.

### Handling Missing Data

When you try to `getItem()` a key that does not exist, it returns `null`. Always check for this:

```javascript
const saved = localStorage.getItem("tasks");

if (saved) {
  // Data exists - parse it
  const tasks = JSON.parse(saved);
  console.log("Loaded tasks:", tasks);
} else {
  // No data yet - start fresh
  console.log("No saved tasks found");
  const tasks = [];
}
```

### Practical Example: Saving User Preferences

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Theme Preference</title>
    <style>
      body { font-family: sans-serif; padding: 24px; transition: background-color 0.3s, color 0.3s; }
      body.dark { background-color: #1a1a1a; color: #e0e0e0; }
      button { padding: 10px 20px; cursor: pointer; font-size: 16px; }
    </style>
    <script src="theme.js" defer></script>
  </head>
  <body>
    <h1>Theme Preference</h1>
    <p>Your theme choice will be remembered!</p>
    <button id="theme-toggle">Toggle Dark Mode</button>
  </body>
</html>
```

```javascript
// theme.js
const toggleBtn = document.querySelector("#theme-toggle");

// On page load, check if the user previously chose dark mode
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  document.body.classList.add("dark");
}

// Toggle theme and save the preference
toggleBtn.addEventListener("click", function() {
  document.body.classList.toggle("dark");

  // Save the current state
  if (document.body.classList.contains("dark")) {
    localStorage.setItem("theme", "dark");
  } else {
    localStorage.setItem("theme", "light");
  }
});
```

Refresh the page. Your theme choice is remembered. That is what `localStorage` gives you.

---

## Introduction to `fetch()`

So far, all the data in our examples has been hardcoded in JavaScript files. But real web applications load data from the internet, from APIs, databases, and other servers. The browser's built-in `fetch()` function lets you do exactly that.

### What Is an API?

An **API** (Application Programming Interface) is, for our purposes, simply **a URL that returns data instead of a web page.** When you visit `https://webuildblack.com`, the server sends back HTML. But when you visit an API URL, the server sends back *data*, usually in JSON format, which you already know from Module 08.

There are many free public APIs you can use. Here is one that returns a random piece of advice:

```
https://api.adviceslip.com/advice
```

If you paste that URL into your browser, you will see JSON data instead of a web page. `fetch()` lets your JavaScript request that data and use it.

### Using `fetch()` with `.then()`

```javascript
fetch("https://api.adviceslip.com/advice")
  .then(function(response) {
    return response.json(); // Convert the response to a JavaScript object
  })
  .then(function(data) {
    console.log(data.slip.advice); // Use the data
  });
```

This reads: "Fetch data from this URL. When the response arrives, convert it to JSON. When that conversion is done, log the advice."

The `.then()` pattern is necessary because fetching data from the internet takes time. The browser sends the request and continues running your other code. When the data arrives (maybe a few hundred milliseconds later), the `.then()` callback runs. This is called **asynchronous** code. It does not block everything while waiting.

### Using `fetch()` with `async/await`

The `async/await` syntax (which you can think of as a modern alternative to `.then()`) makes asynchronous code read more like regular code:

```javascript
async function getAdvice() {
  const response = await fetch("https://api.adviceslip.com/advice");
  const data = await response.json();
  console.log(data.slip.advice);
}

getAdvice();
```

The `await` keyword pauses the function until the data arrives, then continues to the next line. This only works inside functions marked with `async`.

Both approaches do the same thing. `async/await` is generally easier to read and write, so we will prefer it going forward.

### Displaying Fetched Data on the Page

Here is a complete example that fetches data and displays it:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Random Advice</title>
    <style>
      #advice-text { font-size: 20px; font-style: italic; min-height: 40px; }
      button { padding: 10px 20px; cursor: pointer; font-size: 16px; margin-top: 12px; }
    </style>
    <script src="advice.js" defer></script>
  </head>
  <body>
    <h1>Advice of the Moment</h1>
    <p id="advice-text">Click the button for advice...</p>
    <button id="advice-btn">Get Advice</button>
  </body>
</html>
```

```javascript
// advice.js
const adviceText = document.querySelector("#advice-text");
const adviceBtn = document.querySelector("#advice-btn");

async function fetchAdvice() {
  adviceText.textContent = "Loading...";

  try {
    const response = await fetch("https://api.adviceslip.com/advice");
    const data = await response.json();
    adviceText.textContent = '"' + data.slip.advice + '"';
  } catch (error) {
    adviceText.textContent = "Could not load advice. Check your connection.";
    console.error("Fetch error:", error);
  }
}

adviceBtn.addEventListener("click", fetchAdvice);

// Also load one when the page first opens
fetchAdvice();
```

### Error Handling with `try/catch`

Network requests can fail. The user might be offline, the API might be down, or the URL might be wrong. Always wrap `fetch()` in a `try/catch` block:

```javascript
async function loadData() {
  try {
    const response = await fetch("https://some-api.com/data");

    // Check if the response was successful
    if (!response.ok) {
      throw new Error("Server returned " + response.status);
    }

    const data = await response.json();
    // Use the data...
  } catch (error) {
    console.error("Something went wrong:", error.message);
    // Show a user-friendly error message on the page
  }
}
```

`try` runs the code. If anything throws an error, execution jumps immediately to the `catch` block. This prevents your app from crashing and lets you show the user a helpful message instead.

---

## When to Use a Framework

At this point, you might be thinking: "Building interactive pages with manual DOM manipulation is a lot of code." You are right. For the projects you are building now (a few interactive features on a page) vanilla JavaScript and the DOM are perfect. But as applications grow more complex, managing all the DOM updates by hand becomes difficult.

This is why JavaScript **frameworks** like **React**, **Vue**, and **Svelte** exist. They let you describe what the page should look like based on your data, and they handle all the DOM updates automatically. Instead of writing `createElement`, `appendChild`, `classList.toggle`, and keeping track of which elements need updating, you write a template that says "here is my data, here is how to display it" and the framework does the rest.

You do not need to learn a framework right now. Everything you have learned in this module (how the DOM works, how events flow, how to select and modify elements) is the foundation that frameworks are built on. Understanding the DOM makes learning any framework dramatically easier, because you understand what is happening under the hood.

When you are ready, WBB's "AI Engineering for Web Devs" course builds on these skills and introduces modern tooling.

---

## Key Takeaways

1. Every interactive feature follows the same pattern: **select elements**, **listen for events**, **modify the DOM** in response.
2. **Modals** use `classList.add("active")` and `classList.remove("active")` to show and hide. All visual styling stays in CSS.
3. **Accordions** and **tabs** use the same class-toggling approach, often with `data-` attributes to connect buttons to their content panels.
4. **`localStorage`** saves string data in the browser that persists across page refreshes. Use `JSON.stringify()` to save objects/arrays and `JSON.parse()` to read them back.
5. **`fetch()`** loads data from URLs (APIs) asynchronously. Use `async/await` for readable code and always wrap network requests in `try/catch` for error handling.
6. **`response.json()`** converts a fetch response into a JavaScript object you can work with.
7. The DOM skills you have learned in this module are the **foundation** that JavaScript frameworks like React and Vue are built on. Understanding the DOM makes learning any framework much easier.

---

## Try It Yourself

Build a "Bookmarks Manager" page with these features. Create `bookmarks.html` and `bookmarks.js`:

**HTML structure:**
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>My Bookmarks</title>
    <style>
      body { font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 0 20px; }
      .bookmark { display: flex; justify-content: space-between; align-items: center; padding: 12px; border: 1px solid #ddd; margin: 4px 0; border-radius: 8px; }
      .bookmark a { text-decoration: none; color: #7D4E21; font-weight: bold; }
      .delete-btn { background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
      input, button { padding: 8px 12px; font-size: 14px; }
      #add-form { display: flex; gap: 8px; margin-bottom: 16px; }
      #add-form input { flex: 1; }
      #random-quote { font-style: italic; padding: 16px; background: #f5f0eb; border-radius: 8px; min-height: 20px; margin-bottom: 24px; }
    </style>
    <script src="bookmarks.js" defer></script>
  </head>
  <body>
    <h1>My Bookmarks</h1>

    <div id="random-quote">Loading a quote...</div>

    <form id="add-form">
      <input type="text" id="name-input" placeholder="Site name" required>
      <input type="url" id="url-input" placeholder="https://example.com" required>
      <button type="submit">Add</button>
    </form>

    <div id="bookmarks-container"></div>
  </body>
</html>
```

**Implement these features in `bookmarks.js`:**

1. **Load bookmarks from `localStorage`** on page load. If there are saved bookmarks, display them. If not, start with an empty list.
2. **Add bookmarks**: When the form is submitted, create a bookmark object with `name` and `url`, add it to your bookmarks array, save the array to `localStorage`, and display the new bookmark on the page.
3. **Delete bookmarks**: Each bookmark should have a "Delete" button. Use event delegation on the bookmarks container. When clicked, remove the bookmark from the array, update `localStorage`, and remove it from the page.
4. **Fetch a random quote**: When the page loads, fetch a quote from `https://api.adviceslip.com/advice` and display it in the `#random-quote` div. Include error handling.

Hints:
- Each bookmark div should look like: `<div class="bookmark"><a href="URL" target="_blank">NAME</a><button class="delete-btn" data-index="0">Delete</button></div>`
- Use `data-index` attributes to know which bookmark to delete
- Create a `renderBookmarks()` function that clears the container and re-renders all bookmarks from the array. Call this after every add or delete

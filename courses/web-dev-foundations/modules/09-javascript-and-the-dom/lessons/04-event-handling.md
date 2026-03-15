---
title: "Event Handling"
estimatedMinutes: 50
---

# Event Handling

So far, everything we have done with the DOM happens the instant the page loads. JavaScript runs, changes some elements, and then stops. But real web applications need to *respond* to users. When they click a button, type in a form, press a key, or hover over an image.

This is where **events** come in.

Think of events like a doorbell. When someone presses the doorbell (an event occurs), you hear it and go answer the door (your code responds). Without the doorbell, you would never know someone was there. Without events, your JavaScript would never know the user did something.

In this lesson, you will learn how to listen for events, respond to them, and build pages that truly interact with users.

---

## What Are Events?

An **event** is something that happens on the page. The browser detects it and lets your JavaScript know about it. Events can come from the user or from the browser itself:

**User events:**
- Clicking a button
- Typing in an input field
- Submitting a form
- Moving the mouse over an element
- Pressing a key on the keyboard
- Scrolling the page

**Browser events:**
- The page finishes loading
- An image finishes downloading
- The browser window is resized

Every time one of these things happens, the browser creates an **event object** with details about what happened, and your JavaScript can run code in response.

---

## `addEventListener()`: The Right Way to Handle Events

The standard way to respond to events is `addEventListener()`. You call it on the element you want to watch, tell it which event to listen for, and give it a function to run when that event occurs:

```javascript
element.addEventListener("eventName", functionToRun);
```

Here is a complete example:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Click Counter</title>
    <script src="counter.js" defer></script>
  </head>
  <body>
    <h1>Click Counter</h1>
    <p id="count-display">Clicks: 0</p>
    <button id="click-btn">Click Me!</button>
  </body>
</html>
```

```javascript
// counter.js
const button = document.querySelector("#click-btn");
const display = document.querySelector("#count-display");
let count = 0;

button.addEventListener("click", function() {
  count = count + 1;
  display.textContent = "Clicks: " + count;
});
```

Let's break this down:

1. We select the button and the display paragraph
2. We create a `count` variable starting at 0
3. We call `addEventListener("click", ...)` on the button
4. Every time the button is clicked, the function runs: it increments `count` and updates the display text

The function passed to `addEventListener` is called a **callback function**, a function "called back" by the browser when the event happens. You wrote callback functions in Module 08 with array methods like `forEach()`. Same concept here.

### Named Functions as Event Handlers

Instead of writing the function inline, you can define it separately and pass it by name:

```javascript
function handleClick() {
  count = count + 1;
  display.textContent = "Clicks: " + count;
}

button.addEventListener("click", handleClick);
```

Notice we pass `handleClick` without parentheses. `handleClick`, not `handleClick()`. We are passing the function itself, not calling it. The browser will call it when the event happens.

Using named functions makes your code more readable and also allows you to remove the listener later (which we will cover soon).

---

## Common Events

Here are the events you will use most often:

### Click Events

```javascript
// Runs when the element is clicked
button.addEventListener("click", function() {
  console.log("Button was clicked!");
});
```

### Input and Change Events

```javascript
const nameInput = document.querySelector("#name-input");

// "input" fires on EVERY keystroke as the user types
nameInput.addEventListener("input", function() {
  console.log("Current value:", nameInput.value);
});

// "change" fires when the user finishes editing and moves away (blur)
nameInput.addEventListener("change", function() {
  console.log("Final value:", nameInput.value);
});
```

The `input` event is great for live feedback (like showing a character count as someone types). The `change` event is better for when you only care about the final value.

### Focus and Blur Events

```javascript
const emailInput = document.querySelector("#email-input");

// "focus" fires when the user clicks into the input
emailInput.addEventListener("focus", function() {
  console.log("User is now editing the email field");
});

// "blur" fires when the user clicks away from the input
emailInput.addEventListener("blur", function() {
  console.log("User left the email field");
});
```

### Mouse Events

```javascript
const card = document.querySelector(".program-card");

// Mouse enters the element
card.addEventListener("mouseover", function() {
  card.classList.add("hovered");
});

// Mouse leaves the element
card.addEventListener("mouseout", function() {
  card.classList.remove("hovered");
});
```

### Keyboard Events

```javascript
// Listen for key presses on the whole document
document.addEventListener("keydown", function(event) {
  console.log("Key pressed:", event.key);
});

// "keyup" fires when the key is released
document.addEventListener("keyup", function(event) {
  console.log("Key released:", event.key);
});
```

### Submit Events

```javascript
const form = document.querySelector("#signup-form");

form.addEventListener("submit", function(event) {
  event.preventDefault(); // Stop the form from reloading the page
  console.log("Form submitted!");
});
```

We will dig deeper into `submit` and `preventDefault()` shortly.

---

## The Event Object

When an event happens, the browser creates an **event object** that contains details about what occurred. Your callback function can receive this object as a parameter:

```javascript
button.addEventListener("click", function(event) {
  console.log(event);        // The full event object
  console.log(event.type);   // "click"
  console.log(event.target); // The element that was clicked
});
```

The parameter name is up to you. `event`, `e`, or `evt` are all common. We will use `event` throughout this course for clarity.

### `event.target`: What Was Clicked?

`event.target` is the specific element that triggered the event. This is incredibly useful:

```html
<div class="toolbar">
  <button class="tool-btn">Bold</button>
  <button class="tool-btn">Italic</button>
  <button class="tool-btn">Underline</button>
</div>
```

```javascript
const toolbar = document.querySelector(".toolbar");

toolbar.addEventListener("click", function(event) {
  console.log("You clicked:", event.target.textContent);
  // Logs "Bold", "Italic", or "Underline" depending on which button was clicked
});
```

### `event.type`: What Kind of Event?

```javascript
function handleInteraction(event) {
  console.log("Event type:", event.type);
}

button.addEventListener("click", handleInteraction);   // "click"
button.addEventListener("mouseover", handleInteraction); // "mouseover"
```

### `event.preventDefault()`: Stop Default Behavior

Some elements have default behaviors built into the browser. Links navigate to a URL. Forms submit and reload the page. `preventDefault()` stops that default behavior so you can handle things with JavaScript instead.

This is essential for forms:

```html
<form id="contact-form">
  <input type="text" id="name" placeholder="Your name" required>
  <input type="email" id="email" placeholder="Your email" required>
  <button type="submit">Send</button>
</form>
```

```javascript
const form = document.querySelector("#contact-form");

form.addEventListener("submit", function(event) {
  // Stop the page from reloading
  event.preventDefault();

  // Now handle the form data with JavaScript
  const name = document.querySelector("#name").value;
  const email = document.querySelector("#email").value;

  console.log("Name:", name);
  console.log("Email:", email);

  // You could send this data to an API, display a confirmation, etc.
});
```

Without `event.preventDefault()`, the browser would reload the page when the form is submitted, and your JavaScript would never have a chance to read the values.

---

## Form Handling in Depth

Forms are one of the most common things you will handle with events. Here is a more complete example:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Registration Form</title>
    <style>
      .error { color: #dc3545; font-size: 14px; margin-top: 4px; }
      .success { color: #28a745; padding: 12px; background: #d4edda; border-radius: 8px; }
      input { display: block; margin: 8px 0; padding: 8px; width: 250px; }
      button { padding: 10px 20px; margin-top: 8px; cursor: pointer; }
    </style>
    <script src="registration.js" defer></script>
  </head>
  <body>
    <h1>Register for Fast Track</h1>
    <form id="registration-form">
      <label for="fullname">Full Name</label>
      <input type="text" id="fullname" placeholder="Your full name">
      <span id="name-error" class="error"></span>

      <label for="email">Email</label>
      <input type="email" id="email" placeholder="your@email.com">
      <span id="email-error" class="error"></span>

      <button type="submit">Register</button>
    </form>
    <div id="result"></div>
  </body>
</html>
```

```javascript
// registration.js
const form = document.querySelector("#registration-form");
const nameInput = document.querySelector("#fullname");
const emailInput = document.querySelector("#email");
const nameError = document.querySelector("#name-error");
const emailError = document.querySelector("#email-error");
const result = document.querySelector("#result");

form.addEventListener("submit", function(event) {
  event.preventDefault();

  // Clear previous errors
  nameError.textContent = "";
  emailError.textContent = "";

  // Validate
  let isValid = true;

  if (nameInput.value.trim() === "") {
    nameError.textContent = "Please enter your name";
    isValid = false;
  }

  if (emailInput.value.trim() === "") {
    emailError.textContent = "Please enter your email";
    isValid = false;
  } else if (!emailInput.value.includes("@")) {
    emailError.textContent = "Please enter a valid email";
    isValid = false;
  }

  if (isValid) {
    result.innerHTML = "";
    const successMsg = document.createElement("p");
    successMsg.classList.add("success");
    successMsg.textContent = "Welcome, " + nameInput.value.trim() + "! You are registered.";
    result.appendChild(successMsg);

    // Clear the form
    form.reset();
  }
});
```

This example shows a pattern you will use in almost every project: listen for the `submit` event, prevent the default page reload, validate the inputs, show error messages if something is wrong, and display a success message if everything checks out.

---

## Event Delegation

Imagine a company has a receptionist at the front desk. When someone calls, the receptionist answers and routes the call to the right person. The company does not give every single employee their own phone line. That would be wasteful and hard to manage. One person handles all incoming calls and forwards them.

**Event delegation** works the same way. Instead of attaching an event listener to every individual element, you attach **one listener to a parent element** and let it handle events from all its children. When a child element is clicked (or any event fires), the event "bubbles up" to the parent, and the parent's listener catches it.

### Why Do We Need This?

Consider a to-do list where users can add new items. If you attach click listeners to each `<li>` when the page loads, new items added later will not have listeners:

```javascript
// This only works for items that exist RIGHT NOW
const items = document.querySelectorAll(".todo-item");
items.forEach(function(item) {
  item.addEventListener("click", function() {
    item.classList.toggle("completed");
  });
});
// Items added later? They won't respond to clicks!
```

Event delegation solves this:

```html
<ul id="todo-list">
  <li class="todo-item">Learn HTML</li>
  <li class="todo-item">Learn CSS</li>
  <li class="todo-item">Learn JavaScript</li>
</ul>
```

```javascript
const todoList = document.querySelector("#todo-list");

// One listener on the parent handles ALL items, even ones added later
todoList.addEventListener("click", function(event) {
  // Check if the clicked element is a todo item
  if (event.target.classList.contains("todo-item")) {
    event.target.classList.toggle("completed");
  }
});

// Now add a new item - it works automatically!
const newItem = document.createElement("li");
newItem.classList.add("todo-item");
newItem.textContent = "Learn the DOM";
todoList.appendChild(newItem);
// Clicking the new item WORKS - the parent listener catches it
```

The key is `event.target`. It tells you exactly which child element was clicked, even though the listener is on the parent. You check `event.target` to make sure it is the type of element you care about, and then act on it.

### Event Bubbling

Event delegation works because of **event bubbling**. When you click an `<li>`, the browser does not just fire the click event on the `<li>`. It fires it on the `<li>`, then on the `<ul>` (parent), then on the `<body>` (grandparent), then on the `<html>`, and finally on the `document`. The event "bubbles up" through every ancestor.

This means a listener on any ancestor element will catch events from its descendants. That is why putting one listener on the `<ul>` catches clicks on any `<li>` inside it.

If you ever need to stop an event from bubbling up (rare, but it happens), use `event.stopPropagation()`:

```javascript
childElement.addEventListener("click", function(event) {
  event.stopPropagation(); // The parent will NOT hear about this click
});
```

---

## Removing Event Listeners

To remove an event listener, you use `removeEventListener()` with the same event type and the same function reference:

```javascript
function handleClick() {
  console.log("Clicked!");
}

// Add the listener
button.addEventListener("click", handleClick);

// Later, remove it
button.removeEventListener("click", handleClick);
```

**Important**: This only works with named functions. If you used an anonymous function (written inline), you cannot remove it because you have no reference to it:

```javascript
// You CANNOT remove this - there's no way to reference the function later
button.addEventListener("click", function() {
  console.log("Clicked!");
});
```

A common pattern is a button that should only work once:

```javascript
function handleOneTimeClick() {
  console.log("This only runs once!");
  button.removeEventListener("click", handleOneTimeClick);
}

button.addEventListener("click", handleOneTimeClick);
```

There is also a shortcut using the `once` option:

```javascript
button.addEventListener("click", function() {
  console.log("This only runs once!");
}, { once: true });
```

---

## Keyboard Events

Keyboard events let you respond to key presses, which is useful for keyboard shortcuts, game controls, or accessible navigation:

```javascript
document.addEventListener("keydown", function(event) {
  console.log("Key:", event.key);         // "a", "Enter", "ArrowUp", "Escape"
  console.log("Code:", event.code);       // "KeyA", "Enter", "ArrowUp", "Escape"
});
```

`event.key` gives you the character or key name ("a", "Enter", "Escape"). `event.code` gives you the physical key location ("KeyA"), which stays the same regardless of keyboard layout.

Here is a practical example. Pressing Escape to close a modal:

```javascript
document.addEventListener("keydown", function(event) {
  if (event.key === "Escape") {
    const modal = document.querySelector("#modal");
    if (modal) {
      modal.classList.add("hidden");
    }
  }
});
```

And a simple keyboard shortcut:

```javascript
document.addEventListener("keydown", function(event) {
  // Ctrl+K (or Cmd+K on Mac) to focus the search bar
  if ((event.ctrlKey || event.metaKey) && event.key === "k") {
    event.preventDefault(); // Stop the browser's default Ctrl+K behavior
    document.querySelector("#search-input").focus();
  }
});
```

`event.ctrlKey`, `event.shiftKey`, `event.altKey`, and `event.metaKey` (the Cmd key on Mac) are boolean properties that tell you if those modifier keys were held down.

---

## Practical Examples

### Form Validation on Submit

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Signup Validation</title>
    <style>
      .error-field { border: 2px solid #dc3545; }
      .error-message { color: #dc3545; font-size: 13px; }
    </style>
    <script src="validation.js" defer></script>
  </head>
  <body>
    <h1>Join We Build Black</h1>
    <form id="signup">
      <div>
        <label for="username">Username (at least 3 characters)</label>
        <input type="text" id="username">
        <p id="username-msg" class="error-message"></p>
      </div>
      <div>
        <label for="password">Password (at least 8 characters)</label>
        <input type="password" id="password">
        <p id="password-msg" class="error-message"></p>
      </div>
      <button type="submit">Sign Up</button>
    </form>
  </body>
</html>
```

```javascript
// validation.js
const form = document.querySelector("#signup");

form.addEventListener("submit", function(event) {
  event.preventDefault();

  const username = document.querySelector("#username");
  const password = document.querySelector("#password");
  const usernameMsg = document.querySelector("#username-msg");
  const passwordMsg = document.querySelector("#password-msg");

  // Reset
  username.classList.remove("error-field");
  password.classList.remove("error-field");
  usernameMsg.textContent = "";
  passwordMsg.textContent = "";

  let valid = true;

  if (username.value.trim().length < 3) {
    username.classList.add("error-field");
    usernameMsg.textContent = "Username must be at least 3 characters";
    valid = false;
  }

  if (password.value.length < 8) {
    password.classList.add("error-field");
    passwordMsg.textContent = "Password must be at least 8 characters";
    valid = false;
  }

  if (valid) {
    console.log("Form is valid! Username:", username.value);
  }
});
```

### Click Counter with Reset

```html
<p>Count: <span id="count">0</span></p>
<button id="increment">+1</button>
<button id="reset">Reset</button>
```

```javascript
const countDisplay = document.querySelector("#count");
const incrementBtn = document.querySelector("#increment");
const resetBtn = document.querySelector("#reset");
let count = 0;

incrementBtn.addEventListener("click", function() {
  count = count + 1;
  countDisplay.textContent = count;
});

resetBtn.addEventListener("click", function() {
  count = 0;
  countDisplay.textContent = count;
});
```

---

## Key Takeaways

1. **Events** are things that happen on a page (clicks, key presses, form submissions) that your JavaScript can detect and respond to.
2. **`addEventListener("event", callback)`** is the standard way to handle events. It takes an event name and a function to run when that event occurs.
3. The **event object** (`event`) is passed to your callback and contains details: `event.target` (which element triggered it), `event.type` (what kind of event), and `event.preventDefault()` (stop the default browser behavior).
4. **`event.preventDefault()`** is essential for form handling. Without it, submitting a form reloads the page.
5. **Event delegation** means putting one listener on a parent element and using `event.target` to identify which child was interacted with. This works for dynamically added elements and is more efficient than individual listeners.
6. Events **bubble up** from child to parent to grandparent. This is why event delegation works.
7. Use `removeEventListener()` with a named function reference to remove a listener, or pass `{ once: true }` for one-time listeners.

---

## Try It Yourself

Create `events-practice.html` and `events-practice.js`. Start with this HTML:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Event Practice</title>
    <style>
      .highlight { background-color: #AE8156; color: white; }
      .completed { text-decoration: line-through; opacity: 0.5; }
      #color-preview { width: 100px; height: 100px; border: 2px solid #333; margin: 8px 0; }
      #key-display { font-size: 24px; font-weight: bold; padding: 20px; border: 1px solid #ccc; min-height: 40px; }
    </style>
    <script src="events-practice.js" defer></script>
  </head>
  <body>
    <h1>Event Practice</h1>

    <h2>1. Click Counter</h2>
    <p>Count: <span id="count">0</span></p>
    <button id="add-btn">Add</button>
    <button id="subtract-btn">Subtract</button>
    <button id="reset-btn">Reset</button>

    <h2>2. Live Color Preview</h2>
    <input type="color" id="color-picker" value="#2C170B">
    <div id="color-preview"></div>
    <p id="color-value">#2C170B</p>

    <h2>3. Key Display</h2>
    <p>Press any key:</p>
    <div id="key-display">Press a key...</div>

    <h2>4. Task List (Event Delegation)</h2>
    <ul id="task-list">
      <li class="task">Review HTML notes</li>
      <li class="task">Practice CSS Grid</li>
      <li class="task">Build a DOM project</li>
    </ul>
    <input type="text" id="new-task-input" placeholder="New task...">
    <button id="add-task-btn">Add Task</button>
  </body>
</html>
```

In your JavaScript file, implement these features:

1. **Click Counter**: Make the Add button increment the count, the Subtract button decrement it (do not go below 0), and the Reset button set it back to 0.
2. **Live Color Preview**: When the color picker value changes (use the `input` event), update the `#color-preview` div's background color and display the hex value in `#color-value`.
3. **Key Display**: When any key is pressed (use `keydown` on the document), show the key name in `#key-display` (use `event.key`).
4. **Task List**: Use event delegation on `#task-list` so clicking any task toggles the `completed` class. Then make the "Add Task" button create new `<li>` elements from the input value and add them to the list. New tasks should also respond to clicks (thanks to event delegation).

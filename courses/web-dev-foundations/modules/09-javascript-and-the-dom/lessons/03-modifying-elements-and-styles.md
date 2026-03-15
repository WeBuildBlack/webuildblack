---
title: "Modifying Elements and Styles"
estimatedMinutes: 45
---

# Modifying Elements and Styles

You know how to find elements in the DOM. Now it is time to change them. This is where JavaScript becomes truly powerful for building web pages. You can rewrite text, swap out images, toggle classes, change colors, and even create entirely new elements from scratch.

Think of it like redecorating a room. In the last lesson, you learned how to walk into any room in the building (select elements). Now you are going to repaint the walls, swap out the furniture, hang new artwork, and even build new rooms that were not in the original blueprint.

By the end of this lesson, you will know how to modify any element on a page (its content, its attributes, its styles) and how to create and remove elements entirely.

---

## Changing Text Content

The two main properties for changing an element's text are `textContent` and `innerHTML`. They look similar but behave very differently.

### `textContent`: Plain Text Only

`textContent` gets or sets the plain text inside an element. It treats everything as text, including HTML tags:

```html
<h1 id="greeting">Hello, World!</h1>
```

```javascript
const heading = document.querySelector("#greeting");

// Read the text
console.log(heading.textContent); // "Hello, World!"

// Change the text
heading.textContent = "Welcome to We Build Black!";
```

If you include HTML tags in the value, they are displayed as literal text, not rendered as HTML:

```javascript
heading.textContent = "Welcome to <em>We Build Black</em>!";
// Shows on screen: Welcome to <em>We Build Black</em>!
// The <em> tags appear as visible text, not as italics
```

### `innerHTML`: HTML Content

`innerHTML` gets or sets the HTML markup inside an element. It parses HTML tags and renders them:

```javascript
heading.innerHTML = "Welcome to <em>We Build Black</em>!";
// Shows on screen: Welcome to We Build Black!
// "We Build Black" appears in italics because <em> is rendered as HTML
```

You can use `innerHTML` to insert complex HTML structures:

```javascript
const container = document.querySelector("#announcements");
container.innerHTML = `
  <h2>Latest News</h2>
  <ul>
    <li>Mavens I/O Conference: March 15</li>
    <li>Fast Track applications open</li>
  </ul>
`;
```

### Security Warning About `innerHTML`

**Never use `innerHTML` with user input.** If you put text from a user (like a form field or URL parameter) directly into `innerHTML`, a malicious user could inject JavaScript code that runs on your page. This attack is called **Cross-Site Scripting (XSS)**.

```javascript
// DANGEROUS - never do this!
const userInput = '<img src="x" onerror="alert(\'hacked!\')">';
container.innerHTML = userInput; // This would run the attacker's code!

// SAFE - use textContent for user-provided text
container.textContent = userInput; // Displays as harmless text
```

**Rule of thumb**: Use `textContent` when you are setting plain text (especially anything from a user). Use `innerHTML` only when you are inserting HTML that *you* wrote and control.

---

## Modifying Attributes

Every HTML attribute you learned about in Module 04 (`src`, `href`, `alt`, `type`, `placeholder`, `value`) can be read and changed with JavaScript.

### `getAttribute()` and `setAttribute()`

```html
<a id="donate-link" href="/donate" class="cta-button">Donate</a>
<img id="hero-image" src="images/event.jpg" alt="Community event photo">
```

```javascript
const link = document.querySelector("#donate-link");
const image = document.querySelector("#hero-image");

// Read an attribute
console.log(link.getAttribute("href")); // "/donate"
console.log(image.getAttribute("alt")); // "Community event photo"

// Change an attribute
link.setAttribute("href", "https://donate.webuildblack.com");
image.setAttribute("src", "images/new-event.jpg");
image.setAttribute("alt", "Workshop participants collaborating");
```

### `removeAttribute()`

```javascript
// Remove an attribute entirely
link.removeAttribute("target"); // Removes target="_blank" if it existed
```

### Direct Property Access

For common attributes, you can also access them directly as properties on the element object:

```javascript
// These work the same as getAttribute/setAttribute for most attributes
console.log(link.href);
link.href = "https://donate.webuildblack.com";

console.log(image.src);
image.src = "images/new-event.jpg";
image.alt = "Workshop participants collaborating";

// For form inputs, .value is especially useful
const nameInput = document.querySelector("#name-input");
console.log(nameInput.value);       // What the user typed
nameInput.value = "";               // Clear the input
nameInput.placeholder = "Enter your name";
```

Direct property access is often simpler and more readable. Use `getAttribute()`/`setAttribute()` when you need to work with custom attributes or `data-` attributes.

### Data Attributes

HTML5 introduced `data-` attributes for storing custom information on elements. You access them through the `dataset` property:

```html
<div class="program-card" data-program="fast-track" data-cohort="2026-Q1">
  <h3>Fast Track</h3>
</div>
```

```javascript
const card = document.querySelector(".program-card");

// Read data attributes
console.log(card.dataset.program); // "fast-track"
console.log(card.dataset.cohort);  // "2026-Q1"

// Set data attributes
card.dataset.status = "active";
// This adds data-status="active" to the HTML element
```

Notice the naming: `data-program` in HTML becomes `dataset.program` in JavaScript. If the attribute has hyphens like `data-start-date`, it becomes camelCase in JavaScript: `dataset.startDate`.

---

## Working with Classes: `classList`

Changing an element's CSS classes is one of the most common things you will do with JavaScript. Instead of writing inline styles, you define classes in your CSS and then add or remove them with JavaScript. The `classList` property gives you a clean set of methods for this.

### `classList.add()`

```html
<div id="notification" class="notification">
  You have been enrolled successfully!
</div>
```

```css
.notification { padding: 16px; border-radius: 8px; }
.notification.success { background-color: #d4edda; color: #155724; }
.notification.error { background-color: #f8d7da; color: #721c24; }
.notification.hidden { display: none; }
```

```javascript
const notification = document.querySelector("#notification");

// Add a class
notification.classList.add("success");
// Element now has classes: "notification success"
```

### `classList.remove()`

```javascript
// Remove a class
notification.classList.remove("success");
notification.classList.add("error");
// Element now has classes: "notification error"
```

### `classList.toggle()`

`toggle()` adds a class if the element does not have it, or removes it if it does. This is perfect for show/hide patterns, dark mode switches, and any on/off behavior:

```javascript
// If "hidden" is NOT on the element, add it (hides the notification)
// If "hidden" IS on the element, remove it (shows the notification)
notification.classList.toggle("hidden");
```

### `classList.contains()`

Check whether an element has a specific class:

```javascript
if (notification.classList.contains("error")) {
  console.log("There is an error to display");
}
```

### Why `classList` Is Better Than Direct Style Manipulation

You could change an element's appearance by setting inline styles directly (we will cover that next), but `classList` is almost always the better approach:

1. **Separation of concerns**: Your styles stay in CSS where they belong, and JavaScript just toggles them on and off
2. **Reusability**: The same class can be applied to many elements
3. **Easier to maintain**: Change the look by editing CSS, without touching JavaScript
4. **Better performance**: The browser handles class-based style changes more efficiently
5. **Easier to debug**: You can see which classes an element has in DevTools

---

## Modifying Inline Styles

Sometimes you need to set a style directly, perhaps a value calculated by JavaScript, like a dynamic width or position. You can do this through the `element.style` property:

```javascript
const box = document.querySelector("#box");

// Set individual style properties
box.style.backgroundColor = "brown";
box.style.color = "white";
box.style.padding = "20px";
box.style.borderRadius = "8px";
box.style.fontSize = "18px";
```

Notice two important things:

1. **CSS property names use camelCase in JavaScript**: `background-color` becomes `backgroundColor`, `font-size` becomes `fontSize`, `border-radius` becomes `borderRadius`. The hyphenated CSS names do not work as JavaScript property names.

2. **Values are always strings**: even numbers need units: `"20px"`, not `20`.

Reading inline styles:

```javascript
console.log(box.style.backgroundColor); // "brown"
```

**Important**: `element.style` only reads *inline* styles (styles set directly on the element with the `style` attribute or via JavaScript). It does not read styles that come from CSS stylesheets. To read the *computed* style (the actual style being applied), use `getComputedStyle()`:

```javascript
const computedStyles = getComputedStyle(box);
console.log(computedStyles.backgroundColor); // works even if set in CSS
console.log(computedStyles.fontSize);
```

Remember: prefer `classList` for styling whenever possible. Use `element.style` only when you need dynamic values that cannot be predefined in CSS.

---

## Creating New Elements

This is where things get really exciting. You can create entirely new HTML elements with JavaScript and add them to the page. These are elements that were never in the original HTML file.

### `document.createElement()`

```javascript
// Create a new <p> element (it exists in memory but is NOT on the page yet)
const newParagraph = document.createElement("p");

// Set its content
newParagraph.textContent = "This paragraph was created by JavaScript!";

// Add classes
newParagraph.classList.add("highlight");

// Set attributes
newParagraph.setAttribute("id", "dynamic-message");
```

At this point, the element exists in JavaScript's memory, but it is not visible on the page. You need to insert it into the DOM.

### `appendChild()`: Add as Last Child

```javascript
// Add the new paragraph to the end of the body
document.body.appendChild(newParagraph);
```

The element now appears at the bottom of the page. `appendChild()` adds the new element as the **last child** of whatever element you call it on:

```html
<ul id="team">
  <li>Devin</li>
  <li>Aisha</li>
</ul>
```

```javascript
const team = document.querySelector("#team");

const newMember = document.createElement("li");
newMember.textContent = "Marcus";
team.appendChild(newMember);
// The list now has: Devin, Aisha, Marcus
```

### `prepend()`: Add as First Child

```javascript
const firstMember = document.createElement("li");
firstMember.textContent = "Jasmine";
team.prepend(firstMember);
// The list now has: Jasmine, Devin, Aisha, Marcus
```

### `before()` and `after()`: Add Next to an Element

```javascript
const aisha = team.children[1]; // The "Aisha" <li> (originally second, now second after Jasmine)

const newAfterAisha = document.createElement("li");
newAfterAisha.textContent = "Tanya";
aisha.after(newAfterAisha);
// The list now has: Jasmine, Devin, Aisha, Tanya, Marcus

const newBeforeAisha = document.createElement("li");
newBeforeAisha.textContent = "Chris";
aisha.before(newBeforeAisha);
// The list now has: Jasmine, Devin, Chris, Aisha, Tanya, Marcus
```

### `insertBefore()`: The Classic Way

`insertBefore()` is an older method called on the *parent* element. It takes two arguments: the new element and the element to insert before:

```javascript
const referenceElement = team.children[2]; // "Chris"
const another = document.createElement("li");
another.textContent = "Kai";
team.insertBefore(another, referenceElement);
// Inserts "Kai" before "Chris"
```

The newer `before()` and `after()` methods are easier to read and understand, so prefer those in new code.

---

## Removing Elements

### `remove()`: Remove an Element

```javascript
const notification = document.querySelector("#notification");
notification.remove(); // Gone from the page
```

### `removeChild()`: Remove a Child from Its Parent

This is the older approach, where you call `removeChild()` on the parent:

```javascript
const list = document.querySelector("#team");
const lastItem = list.lastElementChild;
list.removeChild(lastItem);
```

`remove()` is simpler and more modern. Use it unless you need to support very old browsers.

---

## Cloning Elements

`cloneNode()` creates a copy of an existing element. Pass `true` to clone the element *and all its children* (a deep clone), or `false` to clone only the element itself:

```html
<div class="template-card">
  <h3>Program Name</h3>
  <p>Description goes here</p>
</div>
```

```javascript
const template = document.querySelector(".template-card");

// Deep clone - copies the div AND the h3 and p inside it
const copy = template.cloneNode(true);

// Customize the clone
copy.querySelector("h3").textContent = "Fast Track";
copy.querySelector("p").textContent = "6-month workforce development program";

// Add it to the page
document.body.appendChild(copy);
```

Cloning is useful when you have a pattern you want to repeat, like cards, list items, or table rows. Clone the template, customize it, and insert it.

---

## Practical Examples

### Building a Dynamic List

Here is a complete example that creates a list from an array of data. This is a pattern you will use constantly:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Dynamic List</title>
    <script src="dynamic-list.js" defer></script>
  </head>
  <body>
    <h1>WBB Programs</h1>
    <ul id="program-list"></ul>
  </body>
</html>
```

```javascript
// dynamic-list.js
const programs = [
  "Fast Track - Workforce development with $6,000 stipend",
  "Crowns of Code - Youth coding program",
  "Mavens I/O - Annual technology conference",
  "The Bridge - Interview accountability program",
  "She Builds Black - Women's chapter"
];

const list = document.querySelector("#program-list");

programs.forEach(function(program) {
  const item = document.createElement("li");
  item.textContent = program;
  list.appendChild(item);
});
```

The page starts with an empty `<ul>`. JavaScript creates and inserts each `<li>` dynamically. This is how real web applications work. Data comes from somewhere (an array, an API, a database) and JavaScript builds the page from it.

### Toggling Dark Mode

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Dark Mode Toggle</title>
    <style>
      body { font-family: sans-serif; padding: 24px; transition: background-color 0.3s, color 0.3s; }
      body.dark-mode { background-color: #1a1a1a; color: #f0f0f0; }
      .toggle-btn { padding: 10px 20px; cursor: pointer; font-size: 16px; }
    </style>
    <script src="dark-mode.js" defer></script>
  </head>
  <body>
    <h1>Dark Mode Example</h1>
    <p>Click the button to toggle dark mode.</p>
    <button class="toggle-btn" id="dark-toggle">Toggle Dark Mode</button>
  </body>
</html>
```

```javascript
// dark-mode.js
const toggleBtn = document.querySelector("#dark-toggle");

toggleBtn.addEventListener("click", function() {
  document.body.classList.toggle("dark-mode");
});
```

This example uses `classList.toggle()` to add or remove the `dark-mode` class on the `<body>` element. All the visual changes are defined in CSS. JavaScript just flips the switch. (Don't worry about `addEventListener` yet. We will cover it in detail in the next lesson.)

### Updating a Profile Card

```html
<div id="profile-card">
  <h2 id="profile-name">Name</h2>
  <p id="profile-role">Role</p>
  <img id="profile-avatar" src="" alt="Profile photo">
</div>
```

```javascript
const profileName = document.querySelector("#profile-name");
const profileRole = document.querySelector("#profile-role");
const profileAvatar = document.querySelector("#profile-avatar");

// Update the card with real data
profileName.textContent = "Devin Jackson";
profileRole.textContent = "Founder, We Build Black";
profileAvatar.src = "images/devin.jpg";
profileAvatar.alt = "Photo of Devin Jackson";

// Add a status class
document.querySelector("#profile-card").classList.add("active");
```

---

## Key Takeaways

1. **`textContent`** sets or gets plain text and is safe for user input. **`innerHTML`** sets or gets HTML markup. Never use it with user-provided data because of XSS security risks.
2. **Attributes** can be read and changed with `getAttribute()`, `setAttribute()`, and `removeAttribute()`, or accessed directly as properties like `element.href` and `element.src`.
3. **`classList`** is the best way to manage styles through JavaScript: use `add()`, `remove()`, `toggle()`, and `contains()` to work with CSS classes.
4. **Inline styles** (`element.style.propertyName`) use camelCase names and string values. Use them only for dynamic values that cannot be predefined in CSS.
5. **`document.createElement()`** creates new elements in memory. Use `appendChild()`, `prepend()`, `before()`, or `after()` to insert them into the page.
6. **`element.remove()`** removes an element from the page.
7. **`cloneNode(true)`** creates a deep copy of an element and all its children, useful for repeating patterns like cards or list items.

---

## Try It Yourself

Create `modifier-practice.html` and `modifier-practice.js`. Start with this HTML:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>DOM Modifier Practice</title>
    <style>
      .highlight { background-color: #AE8156; color: white; padding: 4px 8px; border-radius: 4px; }
      .completed { text-decoration: line-through; opacity: 0.6; }
      .card { border: 1px solid #ccc; padding: 16px; margin: 8px 0; border-radius: 8px; }
    </style>
    <script src="modifier-practice.js" defer></script>
  </head>
  <body>
    <h1 id="page-title">Modifier Practice</h1>
    <p id="description">This page will be modified by JavaScript.</p>

    <h2>My Skills</h2>
    <ul id="skills-list">
      <li>HTML</li>
      <li>CSS</li>
    </ul>

    <h2>Courses</h2>
    <div id="course-container"></div>
  </body>
</html>
```

In your JavaScript file, do the following:

1. Change the `<h1>` text to "DOM Modification Complete!"
2. Add the `highlight` class to the `<h1>`
3. Change the `<p>` text using `innerHTML` to include a `<strong>` tag: "This page was <strong>successfully</strong> modified."
4. Add three new `<li>` elements to the skills list: "JavaScript", "DOM Manipulation", and "Git"
5. Add the `completed` class to the first two skills (HTML and CSS) since you have already learned those
6. Create three course cards inside `#course-container`. Each card should be a `<div>` with the class `card`, containing an `<h3>` and a `<p>`. Use this data:
   - "Web Dev Foundations" / "Build your first website from scratch"
   - "AI Engineering" / "Build AI-powered web applications"
   - "Data Analytics" / "Turn data into actionable insights"
7. Remove the original `<p id="description">` element from the page (after you have changed it, remove it entirely)

Open the page and verify that all your modifications appear correctly.

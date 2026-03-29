---
title: "Selecting and Traversing Elements"
estimatedMinutes: 45
---

# Selecting and Traversing Elements

In the last lesson, you used `document.getElementById()` to grab a single element and change its text. That was your first DOM selection, and it worked great. But real web pages have dozens or hundreds of elements, and you need precise tools to find exactly the ones you want.

Think of the DOM as a large building with many rooms. `getElementById()` is like knowing someone's exact apartment number. It gets you to one specific place. But what if you need to find all the conference rooms? Or every room on the third floor? Or the room next door to where you already are?

In this lesson, you will learn every major way to select elements in the DOM, and how to move between related elements using traversal. By the end, you will be able to find any element on any page.

---

## `document.getElementById()`: Selecting by ID

You already know this one from Lesson 1. It finds a single element by its `id` attribute:

```html
<h1 id="page-title">Welcome</h1>
<p id="subtitle">Learn to code with us.</p>
```

```javascript
const title = document.getElementById("page-title");
const subtitle = document.getElementById("subtitle");

console.log(title.textContent);    // "Welcome"
console.log(subtitle.textContent); // "Learn to code with us."
```

Key things to remember:

- It returns **one element** (or `null` if no element has that ID)
- IDs must be **unique** on the page. Only one element should have any given ID (you learned this rule in Module 04)
- You pass the ID **without** the `#` symbol. Just the name itself
- It is fast because the browser indexes IDs for quick lookups

`getElementById()` is reliable and clear, but it only works when the element has an ID. For more flexible selection, we need `querySelector()`.

---

## `document.querySelector()`: The Modern Workhorse

`querySelector()` lets you select an element using **any CSS selector**, the same selectors you learned in Module 05. This makes it incredibly versatile:

```html
<nav class="main-nav">
  <a href="/" class="nav-link active">Home</a>
  <a href="/about" class="nav-link">About</a>
  <a href="/contact" class="nav-link">Contact</a>
</nav>
<section id="hero">
  <h1>We Build Black</h1>
  <p class="tagline">Empowering through technology.</p>
</section>
```

```javascript
// Select by ID (same result as getElementById)
const hero = document.querySelector("#hero");

// Select by class name
const tagline = document.querySelector(".tagline");

// Select by tag name
const nav = document.querySelector("nav");

// Select by attribute
const homeLink = document.querySelector('a[href="/"]');

// Select with combined selectors
const activeLink = document.querySelector(".main-nav .active");
const heroHeading = document.querySelector("#hero h1");
```

`querySelector()` returns the **first element** that matches the selector. If no element matches, it returns `null`.

**When should you use `querySelector()` vs `getElementById()`?** Both work for IDs. Many developers use `querySelector()` for everything because it is consistent. One method that handles all selection patterns. Others prefer `getElementById()` for IDs specifically because it is slightly faster and makes the intent clearer. Either approach is fine. Throughout this module, we will mostly use `querySelector()` because of its flexibility.

---

## `document.querySelectorAll()`: Selecting Multiple Elements

`querySelector()` returns the *first* match. When you need *all* matching elements, use `querySelectorAll()`:

```html
<ul class="team-list">
  <li class="member">Devin</li>
  <li class="member">Aisha</li>
  <li class="member">Marcus</li>
  <li class="member">Jasmine</li>
</ul>
```

```javascript
// Select ALL elements with the class "member"
const members = document.querySelectorAll(".member");

console.log(members.length); // 4
console.log(members[0].textContent); // "Devin"
console.log(members[2].textContent); // "Marcus"
```

`querySelectorAll()` returns a **NodeList**, a collection of all matching elements. You can access items by index (like an array), check its `.length`, and loop through it:

```javascript
// Loop through all members with forEach
members.forEach(function(member) {
  console.log(member.textContent);
});

// Or with a for...of loop
for (const member of members) {
  console.log(member.textContent);
}
```

### NodeList vs Array

A NodeList looks like an array and acts like an array in many ways, but it is not technically an array. It has `.length` and supports `forEach()`, but it does not have array methods like `.map()`, `.filter()`, or `.reduce()`.

If you need those array methods, convert the NodeList to a real array:

```javascript
// Method 1: Array.from()
const membersArray = Array.from(members);

// Method 2: Spread operator
const membersArray2 = [...members];

// Now you can use array methods
const names = membersArray.map(member => member.textContent);
console.log(names); // ["Devin", "Aisha", "Marcus", "Jasmine"]
```

You learned about arrays, `.map()`, and `.filter()` in Module 08. Those skills transfer directly to working with DOM elements. You just need to convert the NodeList first.

---

## Older Selection Methods

You may encounter these older methods in existing code or tutorials:

```javascript
// Select all elements with a specific class name
const members = document.getElementsByClassName("member");

// Select all elements with a specific tag name
const paragraphs = document.getElementsByTagName("p");

// Select all li elements inside a specific element
const listItems = document.getElementsByTagName("li");
```

These return an **HTMLCollection**, which is similar to a NodeList but does not support `forEach()` directly. You would need to convert it to an array first or use a traditional `for` loop.

**Our recommendation**: Use `querySelector()` and `querySelectorAll()` for everything. They are more flexible, more consistent, and use the CSS selector syntax you already know. The older methods still work fine, but there is no advantage to using them in new code.

---

## Traversing the DOM

Sometimes you have already selected one element and you need to find a related element: its parent, its children, or its neighbor. Instead of making a new `querySelector()` call, you can *traverse* (walk) the DOM tree from your current position.

Think of DOM traversal like navigating a building. You are standing in a specific room (your selected element). From there, you can go:
- **Up** to the floor above (parent element)
- **Down** to a room on a floor below (child elements)
- **Sideways** to the room next door (sibling elements)

### Moving Up: `parentElement`

```html
<div class="card">
  <h2 class="card-title">JavaScript Workshop</h2>
  <p class="card-body">Learn DOM manipulation.</p>
</div>
```

```javascript
const cardTitle = document.querySelector(".card-title");

// Go up to the parent
const card = cardTitle.parentElement;
console.log(card.className); // "card"
```

### Moving Down: `children`, `firstElementChild`, `lastElementChild`

```html
<ul id="skills-list">
  <li>HTML</li>
  <li>CSS</li>
  <li>JavaScript</li>
  <li>React</li>
</ul>
```

```javascript
const list = document.querySelector("#skills-list");

// Get all child elements
console.log(list.children);            // HTMLCollection of 4 <li> elements
console.log(list.children.length);     // 4
console.log(list.children[1].textContent); // "CSS"

// Get the first child element
console.log(list.firstElementChild.textContent); // "HTML"

// Get the last child element
console.log(list.lastElementChild.textContent);  // "React"
```

### Moving Sideways: `nextElementSibling`, `previousElementSibling`

```html
<div class="steps">
  <div class="step" id="step-1">Step 1: Learn HTML</div>
  <div class="step" id="step-2">Step 2: Learn CSS</div>
  <div class="step" id="step-3">Step 3: Learn JavaScript</div>
</div>
```

```javascript
const step2 = document.querySelector("#step-2");

// Go to the next sibling
const step3 = step2.nextElementSibling;
console.log(step3.textContent); // "Step 3: Learn JavaScript"

// Go to the previous sibling
const step1 = step2.previousElementSibling;
console.log(step1.textContent); // "Step 1: Learn HTML"

// What if there's no next sibling?
const afterStep3 = step3.nextElementSibling;
console.log(afterStep3); // null - there's nothing after the last one
```

### Why Use "Element" Versions?

You might see properties like `parentNode`, `firstChild`, `nextSibling` (without "Element" in the name). These include *all* nodes, including invisible text nodes created by whitespace and line breaks in your HTML. That leads to confusing results:

```javascript
// Without "Element" - includes text nodes from whitespace
console.log(list.firstChild); // Might be a text node ("\n  "), not the <li>!

// With "Element" - only actual HTML elements
console.log(list.firstElementChild); // The first <li>, guaranteed
```

**Always use the "Element" versions**: `parentElement`, `children`, `firstElementChild`, `lastElementChild`, `nextElementSibling`, `previousElementSibling`. They give you the actual HTML elements and skip the invisible whitespace nodes.

---

## Storing References in Variables

When you select an element, store it in a variable if you plan to use it more than once. This is more efficient (the browser does not have to search the DOM again) and makes your code easier to read:

```javascript
// Less efficient - searching the DOM three times
document.querySelector("#username").textContent = "Devin";
document.querySelector("#username").style.color = "blue";
document.querySelector("#username").classList.add("highlighted");

// Better - search once, reuse the reference
const username = document.querySelector("#username");
username.textContent = "Devin";
username.style.color = "blue";
username.classList.add("highlighted");
```

Name your variables clearly so anyone reading your code knows what element they refer to. Use names like `submitButton`, `emailInput`, `navLinks`, or `errorMessage`. Not `x`, `el`, or `thing`.

---

## Practical Examples

Let's look at some real-world selection patterns you will use constantly.

### Selecting Navigation Links

```html
<nav id="main-nav">
  <a href="/" class="nav-link">Home</a>
  <a href="/programs" class="nav-link">Programs</a>
  <a href="/about" class="nav-link">About</a>
  <a href="/donate" class="nav-link">Donate</a>
</nav>
```

```javascript
// Select all nav links
const navLinks = document.querySelectorAll("#main-nav .nav-link");
console.log(`Found ${navLinks.length} navigation links`);

navLinks.forEach(function(link) {
  console.log(`${link.textContent} → ${link.href}`);
});
```

### Finding Form Inputs

```html
<form id="signup-form">
  <input type="text" id="name-input" placeholder="Your name">
  <input type="email" id="email-input" placeholder="Your email">
  <select id="track-select">
    <option value="">Choose a track</option>
    <option value="android">Android Dev</option>
    <option value="ux">UX Design</option>
    <option value="data">Data Analytics</option>
  </select>
  <button type="submit">Sign Up</button>
</form>
```

```javascript
// Select the form
const form = document.querySelector("#signup-form");

// Select individual inputs
const nameInput = document.querySelector("#name-input");
const emailInput = document.querySelector("#email-input");
const trackSelect = document.querySelector("#track-select");

// Select the submit button
const submitBtn = document.querySelector('#signup-form button[type="submit"]');

// Read values (after user has typed in them)
console.log(nameInput.value);
console.log(emailInput.value);
console.log(trackSelect.value);
```

### Navigating a List

```html
<ul id="announcements">
  <li>Mavens I/O Conference: March 15</li>
  <li>Fast Track applications open</li>
  <li>New Crowns of Code cohort starting</li>
</ul>
```

```javascript
const list = document.querySelector("#announcements");

// Get all list items
const items = list.children;
console.log(`${items.length} announcements`);

// Get the first announcement
console.log("First:", list.firstElementChild.textContent);

// Get the last announcement
console.log("Last:", list.lastElementChild.textContent);

// Start at the first item and walk forward
let current = list.firstElementChild;
while (current !== null) {
  console.log("→", current.textContent);
  current = current.nextElementSibling;
}
```

---

## Checking If an Element Exists

Whenever you select an element, there is a chance it does not exist on the page (maybe you typed the ID wrong, or the element is on a different page). Always check before trying to use it:

```javascript
const sidebar = document.querySelector("#sidebar");

if (sidebar) {
  // Safe to use sidebar - it exists
  sidebar.textContent = "Updated sidebar content";
} else {
  console.log("No sidebar found on this page");
}
```

If you try to read `.textContent` or any other property on `null`, JavaScript will throw an error: `TypeError: Cannot read properties of null`. This is one of the most common DOM errors beginners encounter, and checking for `null` is the fix.

---

## Key Takeaways

1. **`document.getElementById("id")`** selects a single element by its unique ID. It is fast, simple, and returns `null` if not found.
2. **`document.querySelector("selector")`** selects the first element matching any CSS selector. It is the most flexible and commonly used selection method.
3. **`document.querySelectorAll("selector")`** selects all matching elements and returns a **NodeList**, which you can loop through with `forEach()` or convert to an array with `Array.from()` or the spread operator.
4. **DOM traversal** lets you move between related elements: `parentElement` (up), `children`/`firstElementChild`/`lastElementChild` (down), and `nextElementSibling`/`previousElementSibling` (sideways).
5. Always use the **"Element" versions** of traversal properties to skip invisible whitespace text nodes.
6. **Store element references in variables** when you need to use them more than once. It is more efficient and more readable.
7. Always **check if an element exists** (is not `null`) before trying to use it, to avoid `TypeError` crashes.

---

## Try It Yourself

Create an HTML file called `selector-practice.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Selector Practice</title>
    <script src="selector-practice.js" defer></script>
  </head>
  <body>
    <header id="site-header">
      <h1>We Build Black</h1>
      <nav>
        <a href="/" class="nav-link active">Home</a>
        <a href="/programs" class="nav-link">Programs</a>
        <a href="/about" class="nav-link">About</a>
      </nav>
    </header>
    <main>
      <section id="programs">
        <h2>Our Programs</h2>
        <div class="program-card">
          <h3>Fast Track</h3>
          <p>Workforce development</p>
        </div>
        <div class="program-card">
          <h3>Crowns of Code</h3>
          <p>Youth coding</p>
        </div>
        <div class="program-card">
          <h3>The Bridge</h3>
          <p>Interview accountability</p>
        </div>
      </section>
    </main>
  </body>
</html>
```

In `selector-practice.js`, complete these challenges:

1. Select the `<h1>` inside the header and log its text content
2. Select all elements with the class `nav-link` and log how many there are
3. Select only the link with the class `active` and log its text
4. Select all elements with the class `program-card` and loop through them, logging each `<h3>` text (hint: use `querySelector("h3")` on each card element)
5. Select the `#programs` section, then use traversal to get its `firstElementChild` and log it
6. Select the second `.program-card` ("Crowns of Code") and use `previousElementSibling` and `nextElementSibling` to log the names of the programs before and after it
7. Select all `.program-card` elements, convert the NodeList to an array, and use `.map()` to create an array of just the program names (the `<h3>` text from each card). Log the array.

Open the page and check the console to verify all your selections work correctly.

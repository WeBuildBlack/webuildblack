---
title: "What Is the DOM?"
estimatedMinutes: 40
---

# What Is the DOM?

In Module 08, you wrote JavaScript that ran in the terminal using Node.js. You created variables, wrote functions, looped through arrays, and built objects. All of that happened in a text-only world. No colors, no buttons, no web pages. Just input and output in a terminal window.

Now it is time to bring JavaScript into the browser. This is where things get exciting, because the browser gives JavaScript a superpower: the ability to read, change, and control everything you see on a web page. The tool that makes this possible is called the **DOM**.

By the end of this lesson, you will understand what the DOM is, how the browser creates it, and how to write your first lines of JavaScript that interact with a live web page.

---

## From Node.js to the Browser

In Module 08, you ran JavaScript like this:

```bash
node my-script.js
```

Node.js is a JavaScript runtime that works outside the browser. It is great for scripts, servers, and tools, but it has no concept of a web page. There is no HTML, no CSS, no buttons to click.

The browser is a *different* JavaScript runtime. When you open a web page, the browser runs JavaScript too, but it gives your code access to the page itself. You can change text, add new elements, respond to clicks, and update styles, all in real time.

Think of it this way: Node.js is like having a conversation over the phone. You can talk and get responses, but you cannot see or touch anything in the other person's room. The browser is like being *in* the room. You can see everything, pick things up, move furniture around, and react when someone walks through the door.

The bridge between your JavaScript code and the web page is the DOM.

---

## What the DOM Actually Is

**DOM** stands for **Document Object Model**. Let's break that down:

- **Document**: the web page (your HTML file)
- **Object**: JavaScript objects that represent every piece of the page
- **Model**: a structured representation, a model of the page that your code can work with

Here is the key idea: **the DOM is a live representation of your HTML page, built by the browser, that JavaScript can read and modify.**

Think of it like this. When you write HTML, you are drawing a blueprint for a building. The HTML file *describes* what should exist: headings, paragraphs, images, links. But a blueprint is not a building. You cannot walk through a blueprint or rearrange its rooms.

When the browser loads your HTML, it *constructs the building* from that blueprint. The result is the DOM. The DOM is the actual, living structure that you see on screen. And just like a real building, you can walk through it, repaint the walls, add new rooms, or tear down a wall, all while people are inside.

When you change the DOM with JavaScript, the browser immediately updates what the user sees. Change a heading's text in the DOM, and the heading changes on screen. Add a new list item to the DOM, and it appears on the page. This is what makes web pages interactive.

---

## The DOM Tree Structure

The DOM is organized as a **tree**, a structure where every element is connected to a parent, and can have children. If you have ever seen a family tree, you already understand the concept.

Consider this simple HTML page:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>My Page</title>
  </head>
  <body>
    <h1>Hello, World!</h1>
    <p>Welcome to my site.</p>
  </body>
</html>
```

The browser reads this and builds a tree that looks like this:

```
document
  └── html
        ├── head
        │     └── title
        │           └── "My Page"
        └── body
              ├── h1
              │     └── "Hello, World!"
              └── p
                    └── "Welcome to my site."
```

At the very top is the **document**, the root of everything. Below it is `html`, which has two children: `head` and `body`. The `head` contains a `title`, and the `body` contains an `h1` and a `p`. Even the text inside elements ("Hello, World!") is a node in the tree.

Every item in this tree is called a **node**. Element nodes represent HTML tags. Text nodes represent the text content inside those tags. The relationships between nodes use family terms: **parent**, **child**, **sibling**, just like a family tree.

In the example above:
- `html` is the **parent** of `head` and `body`
- `head` and `body` are **siblings** (they share the same parent)
- `h1` is a **child** of `body`
- `body` is the **parent** of both `h1` and `p`

These relationships will become important in the next lesson when we learn to navigate through the DOM tree.

---

## How Browsers Parse HTML into the DOM

When you navigate to a web page, the browser goes through these steps:

1. **Download** the HTML file from the server (or read it from your local filesystem)
2. **Parse** the HTML: read it character by character, from top to bottom
3. **Build the DOM tree**: create JavaScript objects for every element, text node, and attribute
4. **Apply CSS**: match styles to elements and calculate what everything should look like
5. **Render** the page: paint pixels on screen based on the DOM and CSS

This happens incredibly fast, usually in milliseconds. But understanding the order matters because your JavaScript cannot interact with elements that have not been parsed yet. If the browser has not built a DOM node for your `<h1>`, your JavaScript cannot find it. This is why *where* you place your `<script>` tag matters, which we will cover shortly.

---

## The `document` Object: Your Entry Point

In the browser, JavaScript has access to a special global object called `document`. This is your entry point into the DOM. Every time you want to find, change, or create an element on the page, you start with `document`.

Open any web page right now and try this:

1. Right-click anywhere on the page and select **Inspect** (or press `Ctrl+Shift+I` on Windows/Linux, `Cmd+Option+I` on Mac)
2. Click the **Console** tab
3. Type `document` and press Enter

You will see the entire DOM tree for that page. The `document` object is always available in browser JavaScript. You never need to import it or create it.

Here are a few things you can do with `document` right away:

```javascript
// Get the page title (the text in the browser tab)
console.log(document.title);

// Get the body element
console.log(document.body);

// Get the head element
console.log(document.head);

// Get the full URL of the page
console.log(document.URL);
```

Try typing each of these into the browser console on any website. You are reading the DOM right now.

---

## Adding JavaScript to HTML

In Module 08, your JavaScript lived in standalone `.js` files that you ran with Node.js. In the browser, you need to connect your JavaScript to an HTML page using the `<script>` tag.

There are two main approaches:

### Inline Script

You can write JavaScript directly inside a `<script>` tag in your HTML:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>My First DOM Script</title>
  </head>
  <body>
    <h1>Hello!</h1>

    <script>
      console.log("This JavaScript is running in the browser!");
      console.log(document.title);
    </script>
  </body>
</html>
```

This works for quick experiments, but for anything beyond a few lines, you want to keep your JavaScript in a separate file.

### External Script File

Create a separate `.js` file and link to it with the `src` attribute:

**index.html**:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>My First DOM Script</title>
  </head>
  <body>
    <h1>Hello!</h1>

    <script src="script.js"></script>
  </body>
</html>
```

**script.js**:
```javascript
console.log("This JavaScript is running from an external file!");
console.log(document.title);
```

This is the standard approach for real projects. It keeps your HTML clean and your JavaScript organized. This is the same separation of concerns you learned about in Module 04 with HTML structure and Module 05 with CSS styles. HTML handles structure, CSS handles appearance, and JavaScript handles behavior.

**Important**: When a `<script>` tag has a `src` attribute, any code written *inside* that tag is ignored. Pick one or the other: `src` for external files, or inline code. Not both.

---

## Where to Place Your `<script>` Tag

The placement of your `<script>` tag matters because the browser parses HTML from top to bottom. When it encounters a `<script>` tag, it stops parsing HTML, runs the JavaScript, and then continues. If your script tries to access an element that has not been parsed yet, it will fail.

### Option 1: End of `<body>` (Classic Approach)

Place the `<script>` tag right before the closing `</body>` tag:

```html
<body>
    <h1 id="greeting">Hello!</h1>
    <p>Some content here.</p>

    <!-- Script goes LAST, after all HTML elements -->
    <script src="script.js"></script>
</body>
```

By the time the browser reaches your script, every HTML element above it has already been parsed and added to the DOM. Your JavaScript can safely find and modify those elements.

### Option 2: `defer` in `<head>` (Modern Approach)

Add the `defer` attribute to a `<script>` in the `<head>`:

```html
<head>
    <meta charset="UTF-8">
    <title>My Page</title>
    <script src="script.js" defer></script>
</head>
<body>
    <h1 id="greeting">Hello!</h1>
    <p>Some content here.</p>
</body>
```

The `defer` attribute tells the browser: "Start downloading this script right away, but do not *run* it until the entire HTML document has been parsed." This gives you the best of both worlds. The script starts downloading early (saving time), but it waits for the DOM to be ready before executing.

**Which should you use?** Either approach works reliably. The `defer` approach is considered modern best practice because the browser can start downloading the script sooner. Throughout this module, we will use the `defer` approach, but you will see both in real-world code.

### What Goes Wrong Without `defer`?

Here is what happens if you put a script in the `<head>` without `defer`:

```html
<head>
    <script src="script.js"></script>  <!-- No defer! -->
</head>
<body>
    <h1 id="greeting">Hello!</h1>
</body>
```

```javascript
// script.js
const heading = document.getElementById("greeting");
console.log(heading); // null - the h1 doesn't exist yet!
```

The script runs before the `<body>` has been parsed, so `getElementById("greeting")` returns `null`. The element simply does not exist in the DOM yet. Adding `defer` fixes this completely.

---

## `console.log` in the Browser

You already know `console.log()` from Module 08. You used it in the terminal to see output from your Node.js scripts. In the browser, `console.log()` works the same way, but the output goes to the **browser DevTools console** instead of the terminal.

To see it:

1. Open your HTML file in a browser (double-click the file, or use a local development server)
2. Open DevTools: right-click the page and select **Inspect**, then click the **Console** tab
3. Your `console.log()` output appears here

The DevTools console is your best friend for debugging. You can also type JavaScript directly into the console to test things out, just like you did with Node.js in the terminal, but now you have access to the entire web page.

```javascript
// Try these in the console on any web page:
console.log("Hello from the console!");
console.log(document.title);
console.log(document.body.children.length);
```

The console also highlights errors in red. If your JavaScript has a bug (a typo, a missing variable, a failed DOM lookup) you will see an error message here with the file name and line number. Get comfortable keeping the console open while you work. It will save you hours of confusion.

---

## The `window` Object

The browser gives your JavaScript one more important global object: `window`. The `window` object represents the browser window (or tab) itself. It is the top-level object. Everything else, including `document`, lives inside it.

```javascript
// These two lines do the same thing:
console.log(window.document.title);
console.log(document.title);

// The window object has useful properties:
console.log(window.innerWidth);    // width of the browser window in pixels
console.log(window.innerHeight);   // height of the browser window in pixels
console.log(window.location.href); // the current URL
```

You usually do not need to type `window.` because the browser assumes it. When you write `document`, the browser knows you mean `window.document`. When you write `console.log()`, you are really calling `window.console.log()`.

For now, just know that `window` exists and represents the browser environment. We will use specific `window` features like `localStorage` later in this module.

---

## Your First DOM Interaction

Let's put everything together. Create a folder for this lesson's practice, and add two files:

**index.html**:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>My First DOM Page</title>
    <script src="script.js" defer></script>
  </head>
  <body>
    <h1 id="main-heading">Welcome to We Build Black</h1>
    <p id="description">Learning to code, one step at a time.</p>
  </body>
</html>
```

**script.js**:
```javascript
// Read the page title
console.log("Page title:", document.title);

// Read the body element
console.log("Body element:", document.body);

// Change the page title (look at the browser tab!)
document.title = "DOM in action!";
console.log("New page title:", document.title);

// Access the h1 element by its ID
const heading = document.getElementById("main-heading");
console.log("Heading text:", heading.textContent);

// Change the heading text
heading.textContent = "You Just Changed the DOM!";

// Access the paragraph and change its text too
const description = document.getElementById("description");
description.textContent = "This text was changed by JavaScript. The DOM is alive!";
```

Open `index.html` in your browser. You will see the modified text, not the original HTML content, but the text your JavaScript set. Look at the browser tab. The title changed too. Open the DevTools console to see your `console.log()` output.

**Notice something important**: if you right-click the page and select "View Page Source," you will see the *original* HTML, the blueprint. But if you right-click and select "Inspect," you will see the *current DOM*, the live building that JavaScript modified. The HTML file on disk did not change. Only the DOM in memory changed.

This is the core of everything we will build in this module: **JavaScript reads the DOM, modifies it, and the browser updates the screen.**

---

## Key Takeaways

1. The **DOM (Document Object Model)** is a live, tree-structured representation of your HTML page that JavaScript can read and modify in real time.
2. When the browser loads HTML, it **parses** it and **builds the DOM tree**. If HTML is the blueprint, the DOM is the actual building.
3. Every item in the DOM tree is a **node**, and nodes have relationships: parent, child, and sibling, just like a family tree.
4. The **`document` object** is your entry point to the DOM. Use it to find and change anything on the page.
5. Connect JavaScript to HTML using the **`<script>` tag** with the `src` attribute for external files, and add the **`defer` attribute** to ensure the DOM is ready before your code runs.
6. **`console.log()` in the browser** outputs to the DevTools console (right-click > Inspect > Console), not the terminal.
7. The **`window` object** represents the browser environment and is the parent of `document`, but you rarely need to reference it directly.

---

## Try It Yourself

Create an HTML file called `dom-explorer.html` and a JavaScript file called `dom-explorer.js`. Here is your HTML:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>DOM Explorer</title>
    <script src="dom-explorer.js" defer></script>
  </head>
  <body>
    <h1 id="title">DOM Explorer</h1>
    <p id="info">Original paragraph text.</p>
    <ul id="skills">
      <li>HTML</li>
      <li>CSS</li>
      <li>JavaScript</li>
    </ul>
  </body>
</html>
```

In `dom-explorer.js`, write JavaScript that does the following:

1. Log the page title to the console
2. Change the page title to your name
3. Change the `<h1>` text to say "I am exploring the DOM!"
4. Change the `<p>` text to say "This page was modified by JavaScript."
5. Log how many children the `<body>` element has (hint: `document.body.children.length`)
6. Log how many `<li>` items are inside the `<ul>` (hint: get the `<ul>` by its ID, then check its `children.length`)

Open the page in your browser, check the console output, and confirm everything changed on screen. You just took your first steps into DOM manipulation.

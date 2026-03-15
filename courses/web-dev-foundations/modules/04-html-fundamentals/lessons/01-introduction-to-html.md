---
title: "Introduction to HTML"
estimatedMinutes: 40
isFreePreview: true
---

# Introduction to HTML

Every website you have ever visited -- Google, Instagram, Wikipedia, your bank's login page -- is built on the same foundation: **HTML**. Before there are colors, animations, or interactive features, there is HTML. It is the starting point for everything on the web, and today you are going to learn how it works.

You do not need any prior coding experience. If you can write an email or a text message, you have the skills you need to start writing HTML right now.

---

## What Is HTML?

HTML stands for **HyperText Markup Language**. Let's break that down:

- **HyperText** means text that links to other text. When you click a link on a webpage and it takes you somewhere else, that is hypertext in action.
- **Markup** means adding special instructions to regular text so a computer knows how to display it.
- **Language** means it follows a set of rules, just like English or Spanish. Learn the rules, and you can communicate with any web browser on the planet.

Think of HTML as **the skeleton of a webpage**. When you look at a person, you see skin, hair, clothes, and movement. But underneath all of that is a skeleton that gives the body its structure. Without bones, a body would just be a shapeless blob on the floor. HTML works the same way for websites. It provides the structure -- the headings, paragraphs, images, links, and buttons -- that everything else is built on top of.

Later in this course, you will learn CSS (the skin, clothes, and appearance) and JavaScript (the muscles and movement). But HTML comes first because without structure, there is nothing to style or animate.

---

## How Browsers Read HTML

When you type a web address into your browser and hit Enter, here is what happens:

1. Your browser sends a request to a server (a computer somewhere in the world that stores the website's files).
2. The server sends back an HTML file -- a plain text document with special tags in it.
3. Your browser reads that HTML file from top to bottom.
4. As it reads, it builds a visual representation of the page on your screen.

This is an important concept: **your browser is an HTML reader**. Chrome, Firefox, Safari, Edge -- they are all programs designed to read HTML files and turn them into the visual pages you interact with every day.

The HTML file itself is just text. There is nothing magical about it. You could open it in Notepad or any text editor and read every word. The browser simply interprets the special tags you write and decides how to display the content.

---

## Creating Your First HTML File

Let's write some HTML right now. Open your text editor (VS Code, which we set up earlier in this course, is perfect for this) and create a new file. Save it as `my-first-page.html`.

Type the following into the file:

```html
Hello, world! I just wrote my first HTML.
```

That is it. Save the file. Now find it on your computer and double-click it. Your default web browser will open and display:

> Hello, world! I just wrote my first HTML.

Congratulations -- you just made a webpage. It is not fancy, but it is real. The browser read your text and displayed it. That is HTML at its most basic.

But we can do much better than plain text. Let's add some structure.

---

## The Basic HTML Document Structure

Every proper HTML page follows a specific structure. Think of it like the blueprint of a house. Every house needs a foundation, walls, and a roof. Every HTML page needs these key pieces:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My First Web Page</title>
  </head>
  <body>
    <h1>Welcome to My Page</h1>
    <p>This is my very first real HTML page. I built this!</p>
  </body>
</html>
```

Let's walk through each piece:

### `<!DOCTYPE html>`

This line tells the browser: "This document is written in HTML5" (the current version of HTML). It always goes at the very top of the file. You write it once and never think about it again.

### `<html lang="en">`

This is the **root element** -- the container that holds everything else on the page. The `lang="en"` part tells the browser the page is written in English. This helps screen readers pronounce words correctly and helps search engines understand your content.

### `<head>`

The `<head>` section contains **information about the page** that visitors do not see directly. Think of it like the backstage area of a theater -- it is essential for the show, but the audience never sees it.

Inside the head, you will typically find:

- `<meta charset="UTF-8">` -- Tells the browser which character set to use. UTF-8 supports virtually every language and symbol, from English to Arabic to emojis.
- `<meta name="viewport" ...>` -- Makes your page display correctly on mobile devices. Without this line, your page might look tiny on a phone.
- `<title>` -- The text that appears in the browser tab. This is also what shows up in Google search results.

### `<body>`

The `<body>` section contains **everything visitors actually see** on the page. All your text, images, links, buttons, videos -- everything visible goes inside the body. This is where you will spend most of your time writing HTML.

Here is a simple way to remember it:

| Section | What Goes Here | Visitors See It? |
|---------|---------------|-------------------|
| `<head>` | Page title, settings, metadata | No (except the tab title) |
| `<body>` | All visible content | Yes |

---

## Understanding Elements, Tags, and Attributes

Now that you have seen the big picture, let's zoom in on the building blocks of HTML.

### Elements and Tags

An HTML **element** is a piece of content wrapped in tags. Tags are the special instructions that tell the browser what kind of content something is.

Most elements have an **opening tag** and a **closing tag**:

```html
<p>This is a paragraph of text.</p>
```

- `<p>` is the **opening tag**. It says "a paragraph starts here."
- `</p>` is the **closing tag**. The forward slash `/` says "the paragraph ends here."
- Everything between the opening and closing tags is the **content** of the element.
- The whole thing together -- opening tag, content, and closing tag -- is the **element**.

Here are a few more examples:

```html
<!-- A main heading -->
<h1>Welcome to We Build Black</h1>

<!-- A paragraph -->
<p>We empower the Black community through technical education.</p>

<!-- A link -->
<a href="https://webuildblack.com">Visit our website</a>

<!-- An emphasized word -->
<p>HTML is <em>really</em> important.</p>
```

Notice the `<!-- -->` syntax? Those are **HTML comments**. Browsers ignore them completely. They are notes you write for yourself or other developers reading your code. Use them freely -- they will not show up on the page.

### Self-Closing Elements

Some elements do not have content between tags, so they do not need a closing tag. These are called **void elements** (sometimes called self-closing elements):

```html
<!-- A line break (like pressing Enter in a document) -->
<br>

<!-- An image -->
<img src="photo.jpg" alt="A description of the photo">

<!-- A horizontal line across the page -->
<hr>

<!-- A text input field -->
<input type="text" placeholder="Enter your name">
```

These elements do their job just by existing. An `<img>` tag displays an image. A `<br>` tag creates a line break. No closing tag needed.

### Attributes

Attributes provide **extra information** about an element. They always go inside the opening tag and follow the pattern `name="value"`.

```html
<a href="https://webuildblack.com" target="_blank">Visit WBB</a>
```

This anchor (`<a>`) element has two attributes:

- `href="https://webuildblack.com"` -- the URL the link points to
- `target="_blank"` -- tells the browser to open the link in a new tab

Some attributes are shared across many elements (like `id` and `class`, which you will use constantly later). Other attributes are specific to certain elements (like `href` for links or `src` for images).

Here are a few common attributes you will see throughout this module:

| Attribute | Used On | Purpose |
|-----------|---------|---------|
| `id` | Any element | Gives the element a unique identifier |
| `class` | Any element | Groups elements for styling |
| `href` | `<a>` | The URL the link points to |
| `src` | `<img>`, `<video>`, `<audio>` | The file to display or play |
| `alt` | `<img>` | Description for screen readers and when images fail to load |
| `type` | `<input>` | What kind of input (text, email, password, etc.) |

---

## Nesting Elements Properly

HTML elements can go inside other elements. This is called **nesting**, and it is one of the most important concepts in HTML.

Think of it like boxes inside boxes. You might have a big shipping box, and inside it there are smaller boxes, and inside those there might be individual items wrapped in tissue paper. HTML works the same way:

```html
<body>
  <h1>My Favorite Books</h1>
  <p>Here are some books I recommend:</p>
  <ul>
    <li>The Color Purple by Alice Walker</li>
    <li>Kindred by Octavia Butler</li>
    <li>Between the World and Me by Ta-Nehisi Coates</li>
  </ul>
</body>
```

In this example:

- The `<body>` is the outer box, containing everything.
- Inside the body, there is an `<h1>`, a `<p>`, and a `<ul>` (unordered list).
- Inside the `<ul>`, there are three `<li>` (list item) elements.

Each level is called a **child** of the element above it. The `<li>` elements are children of `<ul>`. The `<ul>` is a child of `<body>`. This parent-child relationship is a concept you will use throughout your entire web development career.

### The Golden Rule of Nesting

**Elements must be closed in the reverse order they were opened.** If you open `<p>` and then open `<strong>` inside it, you must close `<strong>` before you close `<p>`:

```html
<!-- CORRECT: Close inner tags before outer tags -->
<p>This is <strong>very important</strong> information.</p>

<!-- WRONG: Tags are overlapping, not properly nested -->
<p>This is <strong>very important</p></strong>
```

Think of it like stacking cups. You put a big cup down, then a medium cup inside it, then a small cup inside that. To unstack them, you take the small cup out first, then the medium. You cannot pull the big cup out while the others are still inside it.

A helpful trick: draw lines connecting each opening tag to its closing tag. If any lines cross, your nesting is wrong.

### Indentation

Notice how the code examples above use **indentation** (spaces at the beginning of lines) to show which elements are inside other elements. This is not required -- the browser does not care about extra spaces, tabs, or blank lines. But indentation makes your code dramatically easier to read.

Every time you nest an element inside another, indent it by two spaces:

```html
<body>
  <h1>Title</h1>
  <div>
    <p>A paragraph inside a div.</p>
    <p>Another paragraph inside the same div.</p>
  </div>
</body>
```

VS Code can help with this. When you press Enter after typing an opening tag, it will often auto-indent the next line for you. You can also select a block of code and press `Shift+Tab` to decrease indentation or `Tab` to increase it.

Your future self will thank you for writing clean, well-indented code. So will anyone else who reads your code.

---

## Viewing Your HTML Files in a Browser

You already opened an HTML file by double-clicking it. Here are a few more tips for working with HTML files during this course:

**Refreshing the page**: After you make changes to your HTML file in VS Code and save it, switch to your browser and press `Ctrl+R` (Windows/Linux) or `Cmd+R` (Mac) to reload the page and see your changes.

**Using Live Server**: If you installed the Live Server extension in VS Code (from Module 01), right-click your HTML file and select "Open with Live Server." This will automatically refresh the browser every time you save the file. It is a huge time-saver.

**Viewing the source**: Right-click any webpage and select "View Page Source" to see the raw HTML behind it. Try this on your favorite websites. You will see that even the most complex pages are built from the same elements you are learning right now.

---

## Putting It All Together

Let's create a complete HTML page that uses everything you have learned. Create a new file called `about-me.html` and type this in:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>About Me</title>
  </head>
  <body>
    <h1>About Me</h1>
    <p>Hi! My name is <strong>Your Name</strong> and I am learning web development.</p>

    <h2>Things I Enjoy</h2>
    <ul>
      <li>Cooking</li>
      <li>Music</li>
      <li>Learning new things</li>
    </ul>

    <h2>Why I Am Learning to Code</h2>
    <p>I want to build websites and apps that <em>make a difference</em> in my community.</p>

    <p>Check out <a href="https://webuildblack.com">We Build Black</a> for more resources.</p>
  </body>
</html>
```

Save this file and open it in your browser. You should see a properly structured page with a title in the browser tab, headings, paragraphs, a list, and a clickable link.

You built that. Every character in that file was written by you, and a web browser understood every word.

---

## Key Takeaways

1. **HTML is the skeleton of every webpage.** It provides the structure that CSS styles and JavaScript makes interactive.
2. **HTML stands for HyperText Markup Language.** It is a set of rules for adding structure to text content so browsers can display it.
3. **Every HTML page has the same basic structure:** `<!DOCTYPE html>`, `<html>`, `<head>`, and `<body>`.
4. **The `<head>` is backstage, the `<body>` is the stage.** Metadata goes in the head; visible content goes in the body.
5. **Elements are made of tags.** Most have an opening tag (`<p>`) and a closing tag (`</p>`), with content in between. Void elements like `<br>` and `<img>` have no closing tag.
6. **Attributes add extra information** to elements, written as `name="value"` inside the opening tag.
7. **Nesting means putting elements inside other elements.** Always close inner tags before outer tags, and use indentation to keep your code readable.

---

## Try It Yourself

Create a file called `my-community.html` that includes:

1. The complete HTML document structure (`<!DOCTYPE html>`, `<html>`, `<head>`, `<body>`).
2. A `<title>` that shows "My Community" in the browser tab.
3. An `<h1>` heading with your neighborhood or city name.
4. A paragraph describing one thing you love about where you live.
5. An `<h2>` heading that says "People Who Inspire Me."
6. An unordered list (`<ul>`) with at least three names of people who inspire you -- family, friends, public figures, anyone.
7. A paragraph with a link (`<a>`) to any website you visit regularly.
8. At least two HTML comments explaining parts of your code.

Open it in your browser when you are done. Adjust the text, add more content, and experiment. You cannot break anything -- the worst that happens is the page looks a little off, and you fix it. That is exactly how every web developer in the world learned.

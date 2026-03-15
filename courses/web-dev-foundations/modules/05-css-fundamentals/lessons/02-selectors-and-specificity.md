---
title: "Selectors and Specificity"
estimatedMinutes: 45
---

# Selectors and Specificity

In the last lesson, you wrote CSS rules that targeted elements by their tag name: `h1`, `p`, `a`. That works great when you want *every* heading or *every* paragraph to look the same. But real websites aren't that simple.

What if you want the navigation links to be white, but the links in your article to be blue? What if you want one specific paragraph to stand out? What if you want to change something only when a user hovers over it?

That's where selectors come in. Selectors are how you tell CSS *exactly* which elements you want to style. The more selectors you know, the more precisely you can control your designs.

---

## Element Selectors

You already know these from Lesson 01. An element selector targets every instance of an HTML tag:

```css
/* Every <h1> on the page */
h1 {
    color: #2C170B;
    font-size: 36px;
}

/* Every <p> on the page */
p {
    line-height: 1.6;
}

/* Every <a> on the page */
a {
    color: #7D4E21;
}
```

Element selectors are broad. They grab *everything* matching that tag. Think of it like saying "all chairs in the building should be brown." Simple, but you don't always want every chair the same color.

---

## Class Selectors

Classes are the **workhorse** of CSS selectors. You'll use them more than any other type.

First, you add a `class` attribute to your HTML elements (remember attributes from Module 04?):

```html
<p class="intro">This is the introduction paragraph.</p>
<p>This is a regular paragraph.</p>
<p class="intro">This one also has the intro class.</p>
```

Then you target that class in CSS with a dot (`.`) before the name:

```css
.intro {
    font-size: 20px;
    font-weight: bold;
    color: #2C170B;
}
```

Only the elements with `class="intro"` get those styles. The regular paragraph is unaffected.

**Key facts about classes**:

- Multiple elements can share the same class
- One element can have multiple classes (separated by spaces)
- Class names are case-sensitive (`intro` and `Intro` are different)
- Use lowercase with hyphens for multi-word names: `class="hero-section"`, not `class="heroSection"` or `class="Hero Section"`

An element with multiple classes:

```html
<button class="btn btn-primary btn-large">Sign Up</button>
```

```css
.btn {
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}

.btn-primary {
    background-color: #7D4E21;
    color: white;
}

.btn-large {
    font-size: 20px;
    padding: 15px 30px;
}
```

This is a powerful pattern. The `.btn` class handles the base button styles. The `.btn-primary` class adds the color scheme. The `.btn-large` class adjusts the size. Mix and match as needed. You could have a `.btn .btn-primary` that's regular-sized, or a `.btn .btn-large` with a different color class.

---

## ID Selectors

IDs are selected with a hash symbol (`#`):

```html
<header id="main-header">
    <h1>My Website</h1>
</header>
```

```css
#main-header {
    background-color: #2C170B;
    color: white;
    padding: 20px;
    text-align: center;
}
```

**IDs vs. Classes, the key difference**:

| Feature | Class (`.`) | ID (`#`) |
|---------|-------------|----------|
| Reusable? | Yes, use on many elements | No, must be unique per page |
| Specificity | Lower | Higher |
| Best for | Styling patterns that repeat | Unique landmarks, JavaScript hooks |

**The professional consensus**: Use classes for styling. IDs have their place (anchor links, JavaScript targeting), but classes give you more flexibility. If you find yourself reaching for an ID to style something, use a class instead.

---

## Grouping Selectors

When multiple selectors share the same styles, group them with commas to avoid repetition:

```css
/* Instead of writing the same styles three times... */
h1 {
    font-family: Georgia, serif;
    color: #2C170B;
}

h2 {
    font-family: Georgia, serif;
    color: #2C170B;
}

h3 {
    font-family: Georgia, serif;
    color: #2C170B;
}

/* ...group them into one rule */
h1, h2, h3 {
    font-family: Georgia, serif;
    color: #2C170B;
}
```

You can group any selectors: elements, classes, IDs, or any combination:

```css
.card-title, .sidebar-title, .footer-heading {
    font-size: 18px;
    font-weight: bold;
    text-transform: uppercase;
}
```

---

## Descendant Selectors

A descendant selector targets elements *inside* other elements. You write two selectors separated by a space:

```css
/* Only links that are inside a <nav> */
nav a {
    color: white;
    text-decoration: none;
    padding: 10px;
}
```

This leaves all other links on the page untouched. Only the `<a>` elements that are descendants (children, grandchildren, etc.) of `<nav>` get styled.

```html
<nav>
    <a href="#">Home</a>       <!-- Styled: white, no underline -->
    <a href="#">About</a>      <!-- Styled: white, no underline -->
</nav>

<main>
    <a href="#">Read more</a>  <!-- NOT styled by nav a -->
</main>
```

You can chain as many levels as you need:

```css
/* List items inside unordered lists inside the main section */
main ul li {
    margin-bottom: 8px;
}
```

But keep it to 2-3 levels. Deeper chains become fragile. If you rearrange your HTML, the styles break. A class is usually a better choice for deeply nested elements.

---

## Child Selectors

The child selector (`>`) is more strict than the descendant selector. It only targets *direct* children, not grandchildren or deeper:

```css
/* Only <li> elements that are DIRECT children of <ul> */
ul > li {
    list-style-type: square;
}
```

Here's the difference:

```html
<ul>
    <li>Direct child, gets styled</li>   <!-- YES: direct child of ul -->
    <li>
        <ul>
            <li>Nested item</li>           <!-- NO: grandchild, not direct child -->
        </ul>
    </li>
</ul>
```

With `ul > li`, only the top-level list items are affected. With `ul li` (descendant), *all* list items at any depth would be affected.

---

## Pseudo-Classes

Pseudo-classes let you style elements based on their **state** or **position**, things that aren't written in the HTML but depend on what's happening in the browser.

They start with a single colon (`:`).

### Interactive States

```css
/* When the user hovers their mouse over a link */
a:hover {
    color: #AE8156;
    text-decoration: underline;
}

/* When a link or button has keyboard focus (tabbing through the page) */
a:focus {
    outline: 2px solid #7D4E21;
    outline-offset: 2px;
}

/* While a button is being clicked/pressed */
button:active {
    transform: scale(0.98);
}
```

The `:hover` pseudo-class is one you'll use constantly. It creates those satisfying visual changes when you move your mouse over buttons, links, cards, and more.

The `:focus` pseudo-class is important for **accessibility**. Remember from Module 04 how we discussed people who navigate with keyboards? `:focus` styles show them where they are on the page. Always make sure focused elements are visually distinct.

### Position-Based Pseudo-Classes

These target elements based on where they sit among their siblings:

```css
/* The first <li> in any list */
li:first-child {
    font-weight: bold;
}

/* The last <li> in any list */
li:last-child {
    border-bottom: none;
}

/* Every odd-numbered row (1st, 3rd, 5th...), great for table striping */
tr:nth-child(odd) {
    background-color: #f9f9f9;
}

/* Every 3rd item */
li:nth-child(3n) {
    color: #7D4E21;
}
```

The `:nth-child()` pseudo-class is powerful. You can pass it:
- A number: `:nth-child(3)`, the 3rd element
- `odd` or `even`, alternating elements
- A formula: `:nth-child(3n)` for every 3rd, `:nth-child(2n+1)` for every odd one

---

## Pseudo-Elements

Pseudo-elements let you style *parts* of an element or insert decorative content. They use double colons (`::`):

```css
/* Style just the first line of a paragraph */
p::first-line {
    font-weight: bold;
    font-size: 1.1em;
}

/* Style the first letter (drop cap effect) */
p::first-letter {
    font-size: 2em;
    float: left;
    margin-right: 5px;
    color: #7D4E21;
}

/* Add decorative content before an element */
.quote::before {
    content: "\201C";   /* Left double quotation mark */
    font-size: 2em;
    color: #AE8156;
}

/* Add decorative content after an element */
.quote::after {
    content: "\201D";   /* Right double quotation mark */
    font-size: 2em;
    color: #AE8156;
}
```

The `::before` and `::after` pseudo-elements are special. They only work with the `content` property. They let you add decorative text, icons, or visual flourishes without cluttering your HTML. You'll see them used a lot as you progress.

For now, just know they exist. You don't need to master them right away.

---

## Specificity: How the Browser Decides Which Rule Wins

Here's a scenario. You have a paragraph with a class:

```html
<p class="highlight">This text is... what color?</p>
```

```css
p {
    color: black;
}

.highlight {
    color: gold;
}
```

The text is **gold**. But why? The `p` rule applies to this element (it's a paragraph), and so does `.highlight` (it has that class). How does the browser choose?

**Specificity** is a scoring system that determines which rule wins when multiple rules target the same element.

Think of it like a video game point system with different tiers:

| Selector Type | Points | Example |
|---------------|--------|---------|
| Element selectors | 1 point | `p`, `h1`, `div` |
| Class selectors | 10 points | `.highlight`, `.btn` |
| ID selectors | 100 points | `#main-header` |
| Inline styles | 1000 points | `style="color: red"` |

The rule with the highest score wins. Let's score some selectors:

```css
p { }                    /* 1 point (one element) */
.highlight { }           /* 10 points (one class) */
p.highlight { }          /* 11 points (one element + one class) */
#main-header { }         /* 100 points (one ID) */
#main-header .title { }  /* 110 points (one ID + one class) */
nav ul li a { }          /* 4 points (four elements) */
nav .menu-link { }       /* 11 points (one element + one class) */
```

So in our example, `.highlight` (10 points) beats `p` (1 point), and the text turns gold.

**A few more examples**:

```css
/* Which color wins on <p class="intro" id="welcome">? */
p { color: black; }            /* 1 point */
.intro { color: blue; }        /* 10 points */
p.intro { color: green; }      /* 11 points */
#welcome { color: red; }       /* 100 points, RED WINS */
```

The point values (1, 10, 100, 1000) are a simplification to help you think about it. In reality, they're separate categories, and 20 element selectors don't outrank 1 class. But the mental model works perfectly for everyday CSS.

---

## The `!important` Escape Hatch

There's a nuclear option that overrides everything:

```css
p {
    color: red !important;  /* This ALWAYS wins, regardless of specificity */
}
```

**Do not use `!important`** unless you absolutely have to. Here's why:

- It makes debugging a nightmare. You can't figure out why styles aren't applying because something somewhere has `!important`
- It creates an arms race. Once you use `!important`, the only way to override *that* is another `!important` with higher specificity
- It's a sign of disorganized CSS. If you need `!important`, your selectors probably need restructuring

The one legitimate use case: overriding third-party CSS (like a widget or plugin) where you don't control the original styles. Even then, try increasing specificity first.

---

## The Cascade: Order Matters

When two selectors have *the same* specificity, the one that appears **later** in the CSS file wins:

```css
.message {
    color: blue;
}

/* Same specificity (10 points each), this one wins because it's last */
.message {
    color: red;
}
```

The full cascade algorithm considers three things, in this priority order:

1. **Importance**: `!important` declarations beat normal ones
2. **Specificity**: higher-scoring selectors beat lower-scoring ones
3. **Source order**: when importance and specificity are equal, the last rule wins

This is why it's called *Cascading* Style Sheets. Styles cascade down through these layers of priority.

**Practical tip**: Organize your CSS from general to specific. Start with broad element styles, then add class-based styles, then any exceptions. This way, the natural cascade works in your favor instead of fighting you.

```css
/* General (low specificity, early in file) */
a {
    color: #7D4E21;
    text-decoration: none;
}

/* Specific (higher specificity, later in file) */
nav a {
    color: white;
}

/* Exception (same or higher specificity, latest in file) */
nav a.active {
    font-weight: bold;
    border-bottom: 2px solid white;
}
```

---

## Putting It All Together

Here's a practical example that uses several selector types:

```html
<nav class="main-nav">
    <a href="#" class="nav-link active">Home</a>
    <a href="#" class="nav-link">About</a>
    <a href="#" class="nav-link">Projects</a>
    <a href="#" class="nav-link">Contact</a>
</nav>

<main>
    <article>
        <h2>My Latest Project</h2>
        <p class="lead">This is the introductory paragraph.</p>
        <p>This is a regular paragraph in the article.</p>
        <p>Another regular paragraph.</p>
    </article>
</main>
```

```css
/* Element selector: all links */
a {
    text-decoration: none;
}

/* Descendant selector: links inside the nav */
.main-nav a {
    padding: 10px 15px;
    color: white;
}

/* Class selector: the active page link */
.nav-link.active {
    font-weight: bold;
    border-bottom: 2px solid white;
}

/* Pseudo-class: hover effect on nav links */
.nav-link:hover {
    background-color: rgba(255, 255, 255, 0.1);
}

/* Class selector: lead paragraph stands out */
.lead {
    font-size: 1.2em;
    font-weight: 500;
    color: #555;
}

/* Pseudo-class: first paragraph in article */
article p:first-of-type {
    margin-top: 0;
}
```

---

## Key Takeaways

1. **Element selectors** (`h1`, `p`) target all instances of a tag. They are broad and simple.
2. **Class selectors** (`.classname`) are the most versatile and commonly used. They should be your go-to for styling.
3. **ID selectors** (`#idname`) are high-specificity and must be unique per page. Prefer classes for styling.
4. **Descendant selectors** (`nav a`) target elements nested inside others. Keep the chain to 2-3 levels.
5. **Pseudo-classes** (`:hover`, `:focus`, `:nth-child()`) style elements based on state or position. They are essential for interactive design.
6. **Specificity is a scoring system.** Element = 1 point, class = 10 points, ID = 100 points, inline = 1000 points. Higher score wins.
7. **When specificity ties, the last rule wins.** Organize your CSS from general to specific for a smooth cascade.

---

## Try It Yourself

Using the practice project from Lesson 01:

1. Add classes to your HTML elements: give the header a class of `hero`, each `<section>` a class of `content-section`, and the skills list items a class of `skill-item`.
2. Write CSS rules using class selectors to style `.hero` with a dark background and light text.
3. Use a descendant selector to style links inside the `<nav>` differently from links in the `<main>`.
4. Add a `:hover` effect to your navigation links. Try changing the background color or adding an underline.
5. Use `:nth-child(odd)` on your list items to give alternating items a subtle background color.
6. Create a specificity conflict on purpose: target the same element with an element selector and a class selector with different colors. Confirm that the class wins.
7. Add `:focus` styles to your links so keyboard users can see where they are on the page.

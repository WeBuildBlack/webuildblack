---
title: "CSS Variables and Best Practices"
estimatedMinutes: 40
---

# CSS Variables and Best Practices

You've come a long way in this module. You know how to select elements, control the box model, style colors and typography, and add smooth transitions. Now let's talk about writing CSS that's **organized, maintainable, and professional**.

Early in your learning, it's fine to write CSS however it comes to mind. But as your projects grow (even a single-page website can have hundreds of CSS rules) messy CSS becomes a real problem. You'll spend more time *finding* the rule you need to change than actually changing it.

This lesson introduces CSS custom properties (variables) for consistency, organizational patterns for clarity, and common pitfalls to avoid. Think of this as leveling up from "CSS that works" to "CSS that works *and* is pleasant to maintain."

---

## CSS Custom Properties (Variables)

Imagine you're building a website and you use the color `#7D4E21` in 47 different places: buttons, links, borders, backgrounds, shadows. Then the client says "can we make the brown a little lighter?" You'd have to find and change all 47 instances. Miss one, and your site has an inconsistent color.

CSS custom properties (also called CSS variables) solve this completely.

### Defining Variables

Custom properties start with two dashes (`--`) and are defined inside a selector:

```css
:root {
    --color-primary: #7D4E21;
    --color-primary-dark: #2C170B;
    --color-primary-light: #AE8156;
    --color-background: #FDFBF8;
    --color-text: #2C170B;
    --color-text-light: #5a4a3c;
}
```

`:root` targets the `<html>` element. Putting variables here makes them available **everywhere** in your CSS. It's the convention for global variables.

### Using Variables

Reference a variable with `var()`:

```css
.btn {
    background-color: var(--color-primary);
    color: white;
}

.btn:hover {
    background-color: var(--color-primary-light);
}

a {
    color: var(--color-primary);
}

h1, h2, h3 {
    color: var(--color-primary-dark);
}
```

Now when you need to change that brown, you update it in **one place** (the `:root` definition) and every element using `var(--color-primary)` updates automatically.

### Fallback Values

You can provide a fallback in case a variable isn't defined:

```css
.card {
    /* If --card-padding isn't defined, use 20px */
    padding: var(--card-padding, 20px);
}
```

This is handy for component-level defaults.

### Building a Complete Theme

Here's a realistic set of variables for a project:

```css
:root {
    /* Colors */
    --color-primary: #7D4E21;
    --color-primary-dark: #2C170B;
    --color-primary-light: #AE8156;
    --color-accent: #D4A76A;
    --color-background: #FDFBF8;
    --color-surface: #FFFFFF;
    --color-text: #2C170B;
    --color-text-light: #5a4a3c;
    --color-border: #e8e0d8;
    --color-error: #C0392B;
    --color-success: #27AE60;

    /* Typography */
    --font-heading: 'Arvo', serif;
    --font-body: 'Roboto', sans-serif;
    --font-mono: 'Courier New', monospace;

    /* Spacing */
    --space-xs: 4px;
    --space-sm: 8px;
    --space-md: 16px;
    --space-lg: 24px;
    --space-xl: 40px;
    --space-xxl: 64px;

    /* Borders */
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 16px;
    --radius-full: 50%;

    /* Shadows */
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.12);

    /* Transitions */
    --transition-fast: 0.15s ease;
    --transition-normal: 0.3s ease;
}
```

Now your entire stylesheet can reference these tokens:

```css
body {
    font-family: var(--font-body);
    color: var(--color-text);
    background-color: var(--color-background);
    line-height: 1.6;
}

h1, h2, h3 {
    font-family: var(--font-heading);
    color: var(--color-primary-dark);
}

.card {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-lg);
    box-shadow: var(--shadow-sm);
    transition: box-shadow var(--transition-normal), transform var(--transition-normal);
}

.card:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-4px);
}

.btn {
    background-color: var(--color-primary);
    color: white;
    padding: var(--space-sm) var(--space-lg);
    border-radius: var(--radius-sm);
    transition: background-color var(--transition-fast);
}

.btn:hover {
    background-color: var(--color-primary-light);
}
```

This is clean, consistent, and remarkably easy to maintain. Want to change the brand color? One line. Want to tighten all the spacing? Update a few variables. Want to adjust the shadow intensity? One place.

### Scope and Override

Variables respect CSS scope. You can override them for specific sections:

```css
:root {
    --color-primary: #7D4E21;
    --color-text: #2C170B;
    --bg: #FDFBF8;
}

/* Override for a dark section */
.dark-section {
    --color-text: #FFFFFF;
    --bg: #2C170B;
}

/* These rules use whatever value is in scope */
.section-title {
    color: var(--color-text);
}

.section {
    background-color: var(--bg);
}
```

Inside `.dark-section`, `--color-text` resolves to white and `--bg` resolves to dark brown. Everywhere else, they use the `:root` values. This is the foundation of dark mode, theme switching, and component-level customization.

---

## CSS Organization

As your stylesheet grows, a consistent structure keeps you sane. Here are the patterns that professional developers follow.

### File Structure

Organize your CSS from broad to specific, top to bottom:

```css
/* ===========================
   1. CSS RESET
   =========================== */
*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

/* ===========================
   2. CUSTOM PROPERTIES
   =========================== */
:root {
    --color-primary: #7D4E21;
    /* ... */
}

/* ===========================
   3. BASE / GLOBAL STYLES
   =========================== */
body {
    font-family: var(--font-body);
    color: var(--color-text);
    line-height: 1.6;
}

a { color: var(--color-primary); }
img { max-width: 100%; display: block; }

/* ===========================
   4. LAYOUT
   =========================== */
.container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 var(--space-md);
}

/* ===========================
   5. COMPONENTS
   =========================== */
.btn { /* ... */ }
.card { /* ... */ }
.nav { /* ... */ }

/* ===========================
   6. SECTIONS / PAGE-SPECIFIC
   =========================== */
.hero { /* ... */ }
.features { /* ... */ }
.footer { /* ... */ }

/* ===========================
   7. UTILITIES (small, single-purpose)
   =========================== */
.text-center { text-align: center; }
.mt-lg { margin-top: var(--space-lg); }
.hidden { display: none; }
```

This top-to-bottom flow mirrors the cascade: general rules first, specific rules last. Later rules naturally override earlier ones when needed.

### Property Ordering

Within a single rule, group related properties together. There are different conventions, but here's a widely used one:

```css
.card {
    /* 1. Layout & positioning */
    display: flex;
    position: relative;

    /* 2. Box model */
    width: 100%;
    max-width: 400px;
    padding: var(--space-lg);
    margin-bottom: var(--space-lg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);

    /* 3. Typography */
    font-family: var(--font-body);
    font-size: 1rem;
    line-height: 1.6;
    color: var(--color-text);

    /* 4. Visual (colors, shadows, backgrounds) */
    background-color: var(--color-surface);
    box-shadow: var(--shadow-sm);

    /* 5. Transitions & animations */
    transition: transform var(--transition-normal);
}
```

You don't need to memorize this order. Just be consistent within your project. The goal is that you (or a teammate) can scan a rule and quickly find the property you're looking for.

---

## BEM Naming Convention

As your projects grow, you'll start naming classes like `.header-nav-link-active-hover` and lose track of what styles what. **BEM** (Block, Element, Modifier) is a naming convention that solves this.

BEM has three parts:

- **Block**: A standalone component (`.card`, `.nav`, `.hero`)
- **Element**: A part of that component, separated by double underscores (`.card__title`, `.card__body`)
- **Modifier**: A variation of the block or element, separated by double hyphens (`.card--featured`, `.btn--large`)

```css
/* Block */
.card {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-lg);
}

/* Elements (parts of the card) */
.card__title {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: var(--space-sm);
}

.card__body {
    color: var(--color-text-light);
    line-height: 1.6;
}

.card__link {
    color: var(--color-primary);
    text-decoration: none;
}

/* Modifiers (variations) */
.card--featured {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-md);
}

.card--compact {
    padding: var(--space-md);
}
```

```html
<div class="card card--featured">
    <h3 class="card__title">Featured Program</h3>
    <p class="card__body">Join our Fast Track workforce training program.</p>
    <a href="#" class="card__link">Learn More</a>
</div>
```

BEM keeps your class names descriptive and your CSS flat (no deep nesting). You don't *have* to use BEM, but it's the most popular convention in the industry and you'll encounter it on many codebases.

---

## Common Beginner Mistakes

Let's address some patterns that trip up new CSS developers. Spotting these early will save you hours of confusion.

### 1. Using IDs for Styling

```css
/* AVOID: high specificity makes it hard to override */
#main-header {
    background-color: #2C170B;
}

/* PREFER: class selectors are flexible and lower specificity */
.main-header {
    background-color: #2C170B;
}
```

IDs have 100 specificity points, making them hard to override without `!important`. Use classes for styling.

### 2. Over-Qualifying Selectors

```css
/* AVOID: unnecessarily specific */
div.container ul.nav-list li.nav-item a.nav-link {
    color: white;
}

/* PREFER: simple, flat, low specificity */
.nav-link {
    color: white;
}
```

Long selector chains are fragile (they break if you change the HTML structure) and hard to override. Keep selectors as short as possible.

### 3. Using Margin to Create Space Inside a Container

```css
/* AVOID: margin is OUTSIDE the element */
.card {
    background-color: white;
    margin: 20px;  /* This pushes OTHER elements away, doesn't create internal space */
}

/* PREFER: padding is INSIDE the element */
.card {
    background-color: white;
    padding: 20px;  /* This creates space between the border and the content */
}
```

Use padding for internal spacing, margin for external spacing.

### 4. Setting Fixed Heights

```css
/* AVOID: content might overflow */
.card {
    height: 200px;  /* What if the content is taller than 200px? */
}

/* PREFER: let content determine the height */
.card {
    min-height: 200px;  /* At least 200px, but can grow */
}
```

### 5. Forgetting the Box-Sizing Reset

If your layouts are consistently a few pixels off, check whether you've set `box-sizing: border-box`. Without it, padding and borders add to the width, which throws off your calculations.

### 6. Reaching for `!important`

If you find yourself using `!important`, step back and ask: "Can I solve this by restructuring my selectors?" Almost always, the answer is yes.

---

## CSS Reset vs. Normalize

Every browser has a built-in default stylesheet that makes headings big, paragraphs have margins, lists have bullets, and so on. Different browsers have *slightly different* defaults, which can cause inconsistencies.

Two solutions:

### CSS Reset

A reset strips *all* default styles, giving you a blank slate:

```css
*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

/* You may also want to reset list styles and other defaults */
ul, ol {
    list-style: none;
}

a {
    text-decoration: none;
    color: inherit;
}

img {
    max-width: 100%;
    display: block;
}

button, input, textarea, select {
    font: inherit;   /* Form elements don't inherit font by default */
}
```

**Pro**: Complete control. Nothing surprises you.
**Con**: You have to explicitly define every style (margins, list bullets, etc.).

### Normalize.css

Normalize preserves useful browser defaults while fixing cross-browser inconsistencies. You can find it at [necolas.github.io/normalize.css](https://necolas.github.io/normalize.css/).

**Pro**: Less work. Headings still look like headings, lists still have bullets.
**Con**: You're building on top of browser defaults, which can still surprise you.

### Which Should You Use?

For learning, a **minimal reset** is the best approach. It's simple, explicit, and teaches you to build every style intentionally:

```css
/* Minimal modern reset */
*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

html {
    font-size: 100%;   /* Respect user's browser font size setting */
}

img, picture, svg {
    max-width: 100%;
    display: block;
}

button, input, textarea, select {
    font: inherit;
}
```

Put this at the very top of your stylesheet, before anything else.

---

## Performance Basics

CSS performance rarely matters for small sites, but understanding the basics now builds good habits for larger projects.

### Keep Selectors Simple

The browser reads selectors **right to left**. For `nav ul li a`, it first finds every `<a>` on the page, then checks which ones are inside an `<li>`, then inside a `<ul>`, then inside a `<nav>`. The simpler the selector, the less work the browser does.

```css
/* Slower: browser has to check every <a>, then climb the tree */
nav ul li a { color: white; }

/* Faster: browser just checks for the class */
.nav-link { color: white; }
```

For most projects, this difference is unnoticeable. But it's a good reason to prefer classes over deeply nested selectors.

### Minimize Repaints and Reflows

As you learned in the transitions lesson, animating `transform` and `opacity` is GPU-accelerated and fast. Animating `width`, `height`, `margin`, or `padding` causes the browser to recalculate layout (reflow) and repaint, which is slower.

### Use Shorthand Properties

Shorthand reduces file size and is easier to read:

```css
/* AVOID: verbose */
.card {
    margin-top: 20px;
    margin-right: 20px;
    margin-bottom: 20px;
    margin-left: 20px;
    border-width: 1px;
    border-style: solid;
    border-color: #ccc;
}

/* PREFER: shorthand */
.card {
    margin: 20px;
    border: 1px solid #ccc;
}
```

### Remove Unused CSS

As projects evolve, old styles accumulate. Periodically review your CSS and remove rules that no longer target anything in the HTML. DevTools' "Coverage" tab (in Chrome) can show you which CSS rules are unused on a given page.

---

## Putting It All Together

Here's a complete, well-organized stylesheet using everything from this lesson:

```css
/* ===========================
   RESET
   =========================== */
*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

img { max-width: 100%; display: block; }
button, input { font: inherit; }

/* ===========================
   CUSTOM PROPERTIES
   =========================== */
:root {
    --color-primary: #7D4E21;
    --color-dark: #2C170B;
    --color-light: #AE8156;
    --color-bg: #FDFBF8;
    --color-surface: #FFFFFF;
    --color-text: #2C170B;
    --color-border: #e8e0d8;

    --font-heading: 'Arvo', serif;
    --font-body: 'Roboto', sans-serif;

    --space-sm: 8px;
    --space-md: 16px;
    --space-lg: 24px;
    --space-xl: 40px;

    --radius: 8px;
    --shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    --transition: 0.3s ease;
}

/* ===========================
   BASE STYLES
   =========================== */
body {
    font-family: var(--font-body);
    color: var(--color-text);
    background-color: var(--color-bg);
    line-height: 1.6;
}

h1, h2, h3 {
    font-family: var(--font-heading);
    line-height: 1.2;
    margin-bottom: var(--space-md);
}

a {
    color: var(--color-primary);
    text-decoration: none;
    transition: color var(--transition);
}

a:hover {
    color: var(--color-light);
}

/* ===========================
   COMPONENTS
   =========================== */

/* Button */
.btn {
    display: inline-block;
    padding: var(--space-sm) var(--space-lg);
    background-color: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    font-size: 1rem;
    transition: background-color var(--transition), transform 0.2s ease;
}

.btn:hover {
    background-color: var(--color-light);
    transform: translateY(-2px);
}

.btn--outline {
    background-color: transparent;
    border: 2px solid var(--color-primary);
    color: var(--color-primary);
}

.btn--outline:hover {
    background-color: var(--color-primary);
    color: white;
}

/* Card */
.card {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: var(--space-lg);
    box-shadow: var(--shadow);
    transition: transform var(--transition), box-shadow var(--transition);
}

.card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.card__title {
    font-size: 1.25rem;
    margin-bottom: var(--space-sm);
}

.card__text {
    color: var(--color-text);
    opacity: 0.8;
}
```

Notice how readable this is. Variables give every value a name. BEM gives every class a purpose. The file flows from general to specific. Anyone reading this stylesheet, including future you, can quickly understand and modify it.

---

## Key Takeaways

1. **CSS custom properties (`--name` / `var(--name)`)** let you define values once and reuse them everywhere. Define globals on `:root`, override locally on specific elements.
2. **Build a theme system** with variables for colors, fonts, spacing, borders, shadows, and transitions. Changing your entire design becomes a matter of editing a few lines.
3. **Organize CSS from broad to specific**: reset, variables, base styles, layout, components, page-specific, utilities. This works *with* the cascade instead of against it.
4. **BEM naming (Block__Element--Modifier)** keeps class names descriptive and CSS selectors flat. You don't have to use it, but you should know it.
5. **Avoid common mistakes**: don't style with IDs, don't over-nest selectors, don't use fixed heights, don't reach for `!important`. Use classes, keep selectors short, use `min-height`, and restructure instead.
6. **Start every project with a minimal CSS reset.** At minimum, set `box-sizing: border-box` on everything and reset default margins/padding.
7. **Simple selectors perform better** than deeply nested ones. Prefer `.nav-link` over `header nav ul li a`. Your future self (and the browser) will appreciate it.

---

## Try It Yourself

Using your practice project:

1. Create a `:root` block with at least 6 CSS variables: a primary color, a dark and light variant, a background color, a text color, and a font family. Replace all hardcoded values in your CSS with `var()` references.
2. Add spacing variables (`--space-sm`, `--space-md`, `--space-lg`) and use them for all your padding and margin values.
3. Create a `--transition` variable set to `0.3s ease` and use it in all your `transition` properties.
4. Reorganize your CSS file to follow the structure: reset, variables, base styles, components, sections.
5. Rename at least one component's classes to use BEM: for example, `.card`, `.card__title`, `.card__body`, `.card--featured`.
6. Review your CSS for the common mistakes listed in this lesson. Are you using any IDs for styling? Any long selector chains? Any fixed heights? Fix them.
7. Add a "dark section" to your HTML. Override `--color-text` and `--bg` on that section's class to create a dark-themed block that automatically styles its children.

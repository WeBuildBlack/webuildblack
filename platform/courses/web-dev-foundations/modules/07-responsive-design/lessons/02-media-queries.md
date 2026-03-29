---
title: "Media Queries"
estimatedMinutes: 40
---

# Media Queries

In the last lesson, you learned the mobile-first mindset: start with a simple single-column layout and add complexity as the screen gets wider. But *how* do you actually tell the browser "when the screen is this wide, change the layout"?

The answer is **media queries** -- CSS's built-in system for applying styles based on the characteristics of the device or browser window. If you have ever written an `if` statement in any context (even "if it's raining, bring an umbrella"), you already understand the concept. Media queries are just `if` statements for screen size.

By the end of this lesson, you will be writing media queries confidently, choosing the right breakpoints for your designs, and using advanced media features like detecting dark mode and reduced motion preferences.

---

## What Is a Media Query?

A media query is a CSS rule that says: "Only apply these styles **if** a certain condition is true."

Here is the basic syntax:

```css
@media (min-width: 768px) {
  /* These styles ONLY apply when the browser window is 768px wide or wider */
  .sidebar {
    display: block;
  }
}
```

Let's break this down piece by piece:

- `@media` -- This keyword tells the browser "here comes a conditional rule."
- `(min-width: 768px)` -- This is the **condition**. It means "if the viewport (browser window) is at least 768 pixels wide."
- `{ ... }` -- Inside the curly braces, you write normal CSS rules. These rules *only* take effect when the condition is true.

Think of it like a bouncer at a club. The bouncer (the media query) checks your ID (the screen width). If you meet the requirement (768px or wider), you get in (the styles apply). If you don't meet the requirement, you stay outside (the styles are ignored).

Here is a concrete example. Imagine you have a navigation menu that you want to hide on mobile (replaced by a hamburger menu) but show on tablets and desktops:

```css
/* Mobile: navigation is hidden by default */
.desktop-nav {
  display: none;
}

/* Tablet and up: show the navigation */
@media (min-width: 768px) {
  .desktop-nav {
    display: flex;
    gap: 2rem;
  }
}
```

On a phone (say, 375px wide), the condition `min-width: 768px` is **false**, so `.desktop-nav` stays hidden. On a tablet (768px or wider), the condition is **true**, so `.desktop-nav` becomes a flex container and appears on screen.

---

## min-width vs max-width

This is one of the most important distinctions in responsive design, and it connects directly to the mobile-first approach from Lesson 01.

### `min-width` (Mobile-First)

`min-width` means "apply these styles when the screen is **at least** this wide." It is used for mobile-first design because you are *adding* styles as the screen grows.

```css
/* Base styles: mobile (applies to ALL screen sizes) */
.content {
  padding: 1rem;
  font-size: 1rem;
}

/* 768px and UP */
@media (min-width: 768px) {
  .content {
    padding: 2rem;
    font-size: 1.1rem;
  }
}

/* 1024px and UP */
@media (min-width: 1024px) {
  .content {
    padding: 3rem;
    font-size: 1.2rem;
  }
}
```

The cascade works in your favor here. A 1200px-wide desktop matches *both* `min-width: 768px` and `min-width: 1024px`, so the 1024px styles override the 768px styles (because they come later in the file). A 500px phone matches *neither*, so it only gets the base styles.

### `max-width` (Desktop-First)

`max-width` means "apply these styles when the screen is **at most** this wide." It is used for desktop-first design because you are *removing* complexity as the screen shrinks.

```css
/* Base styles: desktop (applies to ALL screen sizes) */
.content {
  padding: 3rem;
  font-size: 1.2rem;
}

/* 1023px and BELOW */
@media (max-width: 1023px) {
  .content {
    padding: 2rem;
    font-size: 1.1rem;
  }
}

/* 767px and BELOW */
@media (max-width: 767px) {
  .content {
    padding: 1rem;
    font-size: 1rem;
  }
}
```

Both approaches produce the same visual result. But as we discussed in Lesson 01, **mobile-first (`min-width`) is the standard**. It is cleaner, performs better, and aligns with how CSS naturally cascades. Throughout this course, we will always use `min-width`.

**A quick rule of thumb**: If you are writing `min-width`, you are doing mobile-first. If you are writing `max-width`, you are doing desktop-first. Stick with `min-width`.

---

## Choosing Breakpoints

A **breakpoint** is the screen width at which your layout changes. In the examples above, `768px` and `1024px` are breakpoints.

Here are common breakpoints you will see across the industry:

| Breakpoint | Typical Target |
|-----------|---------------|
| 480px | Large phones (landscape) |
| 768px | Tablets (portrait) |
| 1024px | Tablets (landscape) / small laptops |
| 1200px | Standard desktops |
| 1440px | Large desktops |

But here is the thing: **do not choose breakpoints based on specific devices.** Phones and tablets come in hundreds of sizes. The iPhone 16 is 393px wide. The Samsung Galaxy S24 is 360px. The iPad Mini is 744px. Chasing individual devices is a losing game.

Instead, **let your content tell you where the breakpoints should be.**

Here is the process:

1. Open your page in the browser's responsive mode (from Lesson 01).
2. Start with the narrowest width (around 320px).
3. Slowly drag the viewport wider.
4. Watch your layout. At some point, things will start to look awkward -- maybe there is too much empty space on the sides, or a single column of text is uncomfortably wide, or cards are stretched out like pancakes.
5. **That** is where you add a breakpoint.

This approach is called **content-driven breakpoints**, and it produces better results than device-driven breakpoints because it adapts to *your* specific design rather than arbitrary device dimensions.

That said, the common breakpoints listed above are a perfectly fine starting point. Most designs naturally break at similar widths. Just do not treat them as gospel -- if your design looks great at 700px and breaks at 850px, your breakpoint should be 850px, not 768px.

---

## Writing Media Queries in Practice

Let's build something real. Here is a simple page with a header, a main content area, and a sidebar:

```html
<div class="page-layout">
  <main class="main-content">
    <h2>Latest Articles</h2>
    <article>
      <h3>Getting Started with Web Development</h3>
      <p>Everything you need to know to begin your coding journey...</p>
    </article>
    <article>
      <h3>Understanding CSS Layout</h3>
      <p>Master Flexbox and Grid to build any layout you can imagine...</p>
    </article>
  </main>

  <aside class="sidebar">
    <h2>About the Author</h2>
    <p>A passionate developer sharing knowledge with the community.</p>
    <h2>Categories</h2>
    <ul>
      <li>HTML</li>
      <li>CSS</li>
      <li>JavaScript</li>
    </ul>
  </aside>
</div>
```

Now the CSS, mobile-first:

```css
/* ============================
   BASE STYLES (Mobile)
   ============================ */

.page-layout {
  width: 90%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 0;
}

.main-content {
  margin-bottom: 2rem;
}

.main-content article {
  background-color: #f9f5f0;
  padding: 1.5rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  border-left: 4px solid #7D4E21;
}

.sidebar {
  background-color: #2C170B;
  color: white;
  padding: 1.5rem;
  border-radius: 8px;
}

.sidebar h2 {
  color: #AE8156;
  margin-bottom: 0.5rem;
}

.sidebar ul {
  list-style: none;
  padding: 0;
}

.sidebar li {
  padding: 0.25rem 0;
}

/* ============================
   TABLET (768px+)
   ============================ */

@media (min-width: 768px) {
  .page-layout {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 2rem;
  }

  .main-content {
    margin-bottom: 0;  /* Grid handles spacing now */
  }
}

/* ============================
   DESKTOP (1024px+)
   ============================ */

@media (min-width: 1024px) {
  .page-layout {
    gap: 3rem;
  }

  .main-content article {
    padding: 2rem;
  }
}
```

Walk through what happens at each size:

- **Mobile (under 768px)**: Everything stacks vertically. Main content is on top, sidebar is below. The `page-layout` is just a regular block element -- no grid.
- **Tablet (768px+)**: The `page-layout` becomes a CSS Grid with two columns. The main content takes up two-thirds of the space (`2fr`), and the sidebar takes up one-third (`1fr`). They sit side by side.
- **Desktop (1024px+)**: The gap between columns widens, and articles get more padding. Everything else stays the same because the tablet styles still apply (remember, `min-width: 768px` is still true at 1024px).

---

## Combining Media Queries

You can combine multiple conditions in a single media query using `and`:

```css
/* Apply only when width is between 768px and 1023px */
@media (min-width: 768px) and (max-width: 1023px) {
  .sidebar {
    font-size: 0.9rem;
  }
}
```

This targets *only* tablet-sized screens -- not phones, not desktops. It is useful when you need a style that applies to a specific range, but use it sparingly. Most of the time, `min-width` alone is all you need.

You can also use a comma (which acts like an `or` operator):

```css
/* Apply when screen is very narrow OR in landscape orientation */
@media (max-width: 480px), (orientation: landscape) {
  .hero-image {
    height: 200px;
  }
}
```

---

## Beyond Screen Width: Other Media Features

Screen width is the most common condition, but media queries can detect much more. Here are three features that every modern developer should know.

### `orientation`

Detect whether the device is in portrait (taller than wide) or landscape (wider than tall):

```css
@media (orientation: landscape) {
  .hero {
    height: 60vh;  /* Shorter hero in landscape since vertical space is limited */
  }
}

@media (orientation: portrait) {
  .hero {
    height: 80vh;
  }
}
```

### `prefers-color-scheme`

This detects whether the user has set their operating system to dark mode or light mode. It lets you automatically match their preference:

```css
/* Default: light theme */
body {
  background-color: #ffffff;
  color: #333333;
}

/* If the user prefers dark mode */
@media (prefers-color-scheme: dark) {
  body {
    background-color: #1a1a1a;
    color: #e0e0e0;
  }

  .card {
    background-color: #2d2d2d;
    border-color: #444;
  }

  a {
    color: #AE8156;  /* WBB warm brown works great as a dark-mode accent */
  }
}
```

This is a fantastic way to show your users that you care about their experience. More and more people use dark mode, and respecting that preference without asking them to flip a toggle is a great touch.

### `prefers-reduced-motion`

Some users have vestibular disorders or motion sensitivities that make animations uncomfortable or even physically painful. The `prefers-reduced-motion` media query lets you respect their system setting:

```css
/* Default: include animations */
.card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

/* If user prefers reduced motion, disable the animation */
@media (prefers-reduced-motion: reduce) {
  .card {
    transition: none;
  }

  .card:hover {
    transform: none;
    /* Keep the shadow change -- it's subtle enough */
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}
```

This is not just a nice-to-have -- it is an accessibility requirement in many contexts. Making your animations respect `prefers-reduced-motion` is a sign of a thoughtful, professional developer.

---

## Organizing Your Media Queries

As your CSS files grow, you need a system for organizing media queries. There are two common approaches:

### Approach 1: Grouped at the Bottom

Put all your base styles first, then group all media queries at the bottom of the file:

```css
/* ========== BASE STYLES ========== */
.header { ... }
.nav { ... }
.main { ... }
.sidebar { ... }
.footer { ... }

/* ========== TABLET (768px+) ========== */
@media (min-width: 768px) {
  .header { ... }
  .nav { ... }
  .main { ... }
  .sidebar { ... }
}

/* ========== DESKTOP (1024px+) ========== */
@media (min-width: 1024px) {
  .header { ... }
  .nav { ... }
  .main { ... }
}
```

**Pros**: Easy to see all styles for each breakpoint in one place.
**Cons**: The styles for a single component (like `.nav`) are scattered across the file.

### Approach 2: Co-located with Components

Put each component's media queries right after its base styles:

```css
/* ========== HEADER ========== */
.header {
  padding: 1rem;
}

@media (min-width: 768px) {
  .header {
    padding: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .header {
    padding: 2rem;
  }
}

/* ========== NAV ========== */
.nav {
  display: none;
}

@media (min-width: 768px) {
  .nav {
    display: flex;
  }
}
```

**Pros**: Everything about one component is in one place. Easier to maintain.
**Cons**: Media query declarations are repeated throughout the file.

**Both approaches work fine.** For the projects in this course, we will use Approach 1 (grouped at the bottom) because it is easier to follow when you are learning. As you get more comfortable, you might prefer Approach 2 for larger projects.

---

## Building a Responsive Layout: Putting It All Together

Let's combine everything from this lesson into one example. We will build a simple blog layout that transforms from a single-column mobile view to a multi-column desktop view, complete with a responsive header:

```css
/* ============================
   BASE STYLES (Mobile)
   ============================ */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #fff;
}

.container {
  width: 90%;
  max-width: 1200px;
  margin: 0 auto;
}

/* Header: stacked logo and nav on mobile */
.site-header {
  background-color: #2C170B;
  color: white;
  padding: 1rem;
}

.site-header h1 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.header-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.header-nav a {
  color: #AE8156;
  text-decoration: none;
}

/* Blog posts: single column */
.blog-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  padding: 2rem 0;
}

.blog-post {
  background-color: #f9f5f0;
  padding: 1.5rem;
  border-radius: 8px;
}

.blog-post h2 {
  color: #2C170B;
  margin-bottom: 0.5rem;
}

/* ============================
   TABLET STYLES (768px+)
   ============================ */

@media (min-width: 768px) {
  /* Header: logo and nav side by side */
  .site-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .site-header h1 {
    margin-bottom: 0;
  }

  .header-nav {
    flex-direction: row;
    gap: 1.5rem;
  }

  /* Blog: two columns */
  .blog-grid {
    grid-template-columns: 1fr 1fr;
  }
}

/* ============================
   DESKTOP STYLES (1024px+)
   ============================ */

@media (min-width: 1024px) {
  /* Blog: three columns */
  .blog-grid {
    grid-template-columns: 1fr 1fr 1fr;
    gap: 2rem;
  }

  .blog-post {
    padding: 2rem;
  }
}

/* ============================
   DARK MODE
   ============================ */

@media (prefers-color-scheme: dark) {
  body {
    background-color: #1a1a1a;
    color: #e0e0e0;
  }

  .blog-post {
    background-color: #2d2d2d;
  }

  .blog-post h2 {
    color: #AE8156;
  }
}

/* ============================
   REDUCED MOTION
   ============================ */

@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }
}
```

Notice the progression:

1. Base styles handle mobile -- everything is simple, single-column, stacked.
2. At 768px, the header rearranges and blog posts become a two-column grid.
3. At 1024px, the grid expands to three columns with more generous spacing.
4. Dark mode and reduced motion queries handle user preferences regardless of screen size.

---

## Key Takeaways

1. **Media queries are conditional CSS rules** -- they apply styles only when a specific condition (like screen width) is met. Think of them as `if` statements for your design.
2. **Use `min-width` for mobile-first design.** Write base styles for mobile, then use `@media (min-width: ...)` to add styles for wider screens. Avoid `max-width` unless you have a specific reason.
3. **Choose breakpoints based on your content, not specific devices.** Slowly widen your viewport until the design breaks, and add a breakpoint there. Common starting points are 768px and 1024px.
4. **Media queries can be combined** with `and` (both conditions must be true) or commas (either condition can be true).
5. **`prefers-color-scheme` detects dark mode** -- use it to automatically match your user's system preference.
6. **`prefers-reduced-motion` is an accessibility essential** -- respect users who have disabled animations in their system settings.
7. **Organize media queries consistently** -- either grouped by breakpoint at the end of your file, or co-located with each component. Pick one approach and stick with it.

---

## Try It Yourself

1. Take the demo from Lesson 01 (the portfolio page with the card grid) and add a `prefers-color-scheme: dark` media query. Choose dark background and light text colors that look good together.

2. Create a simple two-section page (a "hero" area and a "features" grid). Write mobile-first CSS with breakpoints at 768px and 1024px. The hero should stack image and text on mobile, then go side by side on tablet. The features grid should go from 1 column to 2 columns to 3 columns.

3. Experiment with `prefers-reduced-motion`. Add a hover transition to a button (like `background-color` changing over 0.3 seconds), then write a reduced-motion query that removes the transition. To test it, go to your system's accessibility settings and enable "Reduce motion."

4. Practice finding content-driven breakpoints. Build a page with a long paragraph of text in a container. Start at 320px width and slowly widen the viewport. At what width does the text line become uncomfortably long? That is where you should cap the `max-width` or adjust the layout.

5. Write a media query that only targets screens between 768px and 1023px (tablet only). Inside it, change the background color of the body. Verify that the style does not apply on phones or desktops.

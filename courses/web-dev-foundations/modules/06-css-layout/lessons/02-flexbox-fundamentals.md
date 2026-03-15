---
title: "Flexbox Fundamentals"
estimatedMinutes: 45
---

# Flexbox Fundamentals

In the last lesson, you learned how to position individual elements on a page: pinning a badge to a card corner, fixing a navbar to the top of the screen, stacking layers with `z-index`. That's essential stuff. But what about the everyday layout challenges? How do you put three cards side by side? How do you center something (truly center it) both horizontally and vertically? How do you build a navigation bar where links sit in a row?

Before 2015, developers used `float`, `inline-block`, and all kinds of creative hacks to build these layouts. It was painful. Then CSS Flexbox arrived, and it changed everything.

---

## The Problem Flexbox Solves

Think about arranging books on a shelf. You want them in a neat row, evenly spaced, all the same height. You might want some books pushed to the left, others to the right. Maybe you want the shelf to wrap to a second row when there are too many books.

Without Flexbox, CSS had no good way to say "put these items in a row and distribute the space between them." You had to fake it with floats (which were designed for wrapping text around images, not building layouts) or `inline-block` (which introduced weird whitespace gaps).

Flexbox was designed specifically for this. It gives you a simple, powerful system for laying out items in **one direction** (either a row or a column) with precise control over alignment, spacing, and sizing.

---

## The Flex Container and Flex Items

Flexbox works with two roles: the **container** and its **items**.

- The **flex container** is the parent element. You turn it on with `display: flex`.
- The **flex items** are the direct children of that container. They automatically become flexible.

```html
<div class="shelf">
    <div class="book">HTML</div>
    <div class="book">CSS</div>
    <div class="book">JavaScript</div>
</div>
```

```css
/* The container: the bookshelf */
.shelf {
    display: flex;  /* This one line activates Flexbox */
}

/* The items: the books */
.book {
    background-color: #7D4E21;
    color: white;
    padding: 20px;
    margin: 5px;
    border-radius: 4px;
}
```

That's it. One line, `display: flex`, and your three books that were stacking vertically now sit side by side in a row. No floats, no hacks, no pain.

The bookshelf analogy works well here. The `.shelf` is the physical shelf (the container). The `.book` elements are the items sitting on it. Flexbox gives you control over how those books are arranged on that shelf.

---

## Main Axis and Cross Axis

This is the most important concept in Flexbox. Everything revolves around two invisible lines: the **main axis** and the **cross axis**.

- The **main axis** is the direction items flow. By default, it runs **horizontally** (left to right).
- The **cross axis** is perpendicular to the main axis. By default, it runs **vertically** (top to bottom).

Think of a clothesline. The rope itself is the main axis. That's the direction the clothes hang along. The cross axis is the vertical direction, how far down each item hangs.

Why does this matter? Because the properties that control alignment are tied to these axes. `justify-content` aligns items along the **main axis**. `align-items` aligns items along the **cross axis**. Once you internalize this, Flexbox clicks into place.

---

## flex-direction: Choosing the Flow

The `flex-direction` property controls which way the main axis runs. It has four values:

```css
.container {
    display: flex;
    flex-direction: row;            /* Default: items flow left to right */
}

.container-reversed {
    display: flex;
    flex-direction: row-reverse;    /* Items flow right to left */
}

.container-column {
    display: flex;
    flex-direction: column;         /* Items flow top to bottom (like normal block) */
}

.container-column-reversed {
    display: flex;
    flex-direction: column-reverse; /* Items flow bottom to top */
}
```

The key insight: **changing `flex-direction` swaps the axes**. When you set `flex-direction: column`, the main axis becomes vertical and the cross axis becomes horizontal. This means `justify-content` will now work vertically, and `align-items` will work horizontally. The properties don't change. The axes they refer to do.

```css
/* Vertical stack with items centered horizontally */
.vertical-menu {
    display: flex;
    flex-direction: column;
    align-items: center;   /* Centers on the cross axis, which is now horizontal */
}
```

Most of the time, you'll use `row` (the default) or `column`. The reversed values are occasionally handy for reordering content visually without changing the HTML.

---

## justify-content: Spacing Along the Main Axis

`justify-content` controls how items are distributed along the **main axis**. This is where spacing gets really good.

```css
.container {
    display: flex;
    justify-content: flex-start;    /* Default: items bunch up at the start */
}
```

Here are all the values, with the default `flex-direction: row` (so main axis is horizontal):

```css
/* Items packed to the left (start of the main axis) */
.start {
    display: flex;
    justify-content: flex-start;   /* [A B C              ] */
}

/* Items packed to the right (end of the main axis) */
.end {
    display: flex;
    justify-content: flex-end;     /* [              A B C] */
}

/* Items centered along the main axis */
.center {
    display: flex;
    justify-content: center;       /* [       A B C       ] */
}

/* Equal space BETWEEN items (no space at edges) */
.between {
    display: flex;
    justify-content: space-between; /* [A       B       C] */
}

/* Equal space AROUND items (half-size space at edges) */
.around {
    display: flex;
    justify-content: space-around;  /* [  A     B     C  ] */
}

/* Truly equal space everywhere (same gap at edges and between) */
.evenly {
    display: flex;
    justify-content: space-evenly;  /* [   A    B    C   ] */
}
```

`space-between` is probably the most useful. It's perfect for navigation bars where you want items spread across the full width. `center` is the go-to for centering content. `space-evenly` gives you the most uniform spacing.

---

## align-items: Alignment Along the Cross Axis

While `justify-content` handles the main axis, `align-items` handles the **cross axis**, the perpendicular direction. With the default `flex-direction: row`, this means vertical alignment.

```css
/* Items stretched to fill the container height (default) */
.stretch {
    display: flex;
    align-items: stretch;       /* All items become the same height */
}

/* Items aligned to the top */
.top {
    display: flex;
    align-items: flex-start;    /* Items hug the top edge */
}

/* Items aligned to the bottom */
.bottom {
    display: flex;
    align-items: flex-end;      /* Items hug the bottom edge */
}

/* Items centered vertically */
.middle {
    display: flex;
    align-items: center;        /* Items sit in the vertical middle */
}

/* Items aligned to their text baselines */
.baseline {
    display: flex;
    align-items: baseline;      /* Lines up the text across items of different sizes */
}
```

The default value, `stretch`, is actually one of the most powerful. It makes all flex items the same height as the tallest item. This solves the age-old problem of getting equal-height cards in a row, something that was nearly impossible before Flexbox.

```css
/* Equal-height cards, just by being flex items! */
.card-row {
    display: flex;
    align-items: stretch;  /* This is the default, but writing it makes intent clear */
}

.card {
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    margin: 10px;
}
```

Even if one card has two lines of text and another has ten, they'll both be the same height. The shorter card stretches to match. That's `align-items: stretch` at work.

---

## flex-wrap: Handling Overflow

By default, flex items try to fit on one line, even if it means they shrink. If you have ten items in a row and the container isn't wide enough, they'll squish together.

`flex-wrap` lets items wrap to the next line instead:

```css
.container {
    display: flex;
    flex-wrap: nowrap;    /* Default: all items stay on one line, may shrink */
}

.wrapping-container {
    display: flex;
    flex-wrap: wrap;      /* Items wrap to the next line when they don't fit */
}

.reverse-wrap {
    display: flex;
    flex-wrap: wrap-reverse;  /* Wraps upward instead of downward */
}
```

`flex-wrap: wrap` is essential for responsive designs. When the screen gets smaller, items that don't fit will gracefully drop to the next row:

```css
.card-grid {
    display: flex;
    flex-wrap: wrap;
}

.card {
    width: 300px;        /* Each card wants to be 300px wide */
    margin: 10px;
}
```

On a wide screen, you might see three cards per row. On a tablet, two. On a phone, one. The cards wrap naturally without a single media query.

---

## gap: Clean Spacing Between Items

Before the `gap` property existed, you had to use margins on each flex item to create spacing. The problem? The first and last items would have extra margin at the edges. You'd need hacks to remove it.

The `gap` property fixes this cleanly. It adds space **between** items without adding space at the outer edges:

```css
.container {
    display: flex;
    gap: 20px;           /* 20px of space between each item */
}

/* You can also set row and column gaps separately */
.wrapping-container {
    display: flex;
    flex-wrap: wrap;
    row-gap: 20px;       /* Space between rows */
    column-gap: 15px;    /* Space between columns */
}

/* Or use the shorthand */
.shorthand {
    display: flex;
    flex-wrap: wrap;
    gap: 20px 15px;      /* row-gap column-gap */
}
```

`gap` is cleaner, simpler, and more predictable than margins. Use it whenever you can. It's supported in all modern browsers.

---

## Practical Pattern: Centering a Div

The "how do I center a div" question has been a running joke in web development for years. With Flexbox, the answer is two lines:

```css
.parent {
    display: flex;
    justify-content: center;   /* Center on the main axis (horizontal) */
    align-items: center;       /* Center on the cross axis (vertical) */
    height: 100vh;             /* Make the container full viewport height */
}

.child {
    /* This element is now perfectly centered on the page */
    background-color: #7D4E21;
    color: white;
    padding: 40px;
    border-radius: 8px;
}
```

```html
<div class="parent">
    <div class="child">I'm centered!</div>
</div>
```

That's it. No hacks, no `position: absolute` with `transform`, no table-cell tricks. Just `justify-content: center` and `align-items: center`. This is one of the moments where Flexbox's elegance really shines.

---

## Practical Pattern: Horizontal Navigation

Here's a clean navigation bar using Flexbox:

```html
<nav class="main-nav">
    <a href="#" class="nav-link">Home</a>
    <a href="#" class="nav-link">Programs</a>
    <a href="#" class="nav-link">Courses</a>
    <a href="#" class="nav-link">About</a>
    <a href="#" class="nav-link">Contact</a>
</nav>
```

```css
.main-nav {
    display: flex;
    gap: 10px;                     /* Space between links */
    background-color: #2C170B;
    padding: 15px 20px;
}

.nav-link {
    color: white;
    text-decoration: none;
    padding: 8px 16px;
    border-radius: 4px;
    transition: background-color 0.2s ease;
}

.nav-link:hover {
    background-color: #7D4E21;
}
```

The links sit in a row with consistent spacing, and you didn't need to set `display: inline-block` on each one, fight with whitespace, or clear any floats.

---

## Practical Pattern: Card Row

Three cards in a row, evenly spaced, all the same height:

```html
<section class="card-row">
    <article class="card">
        <h3>Fast Track</h3>
        <p>A 6-month workforce training program with stipends for participants who complete milestones.</p>
    </article>
    <article class="card">
        <h3>Crowns of Code</h3>
        <p>Youth coding workshops that introduce young people to programming through creative projects.</p>
    </article>
    <article class="card">
        <h3>The Bridge</h3>
        <p>An 8-week accountability program helping members land their next tech role through structured interview prep and peer support.</p>
    </article>
</section>
```

```css
.card-row {
    display: flex;
    gap: 20px;
    padding: 20px;
}

.card {
    flex: 1;                        /* Each card grows equally to fill the row */
    background-color: white;
    padding: 25px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-top: 4px solid #7D4E21;  /* A subtle brand accent */
}

.card h3 {
    color: #2C170B;
    margin-bottom: 10px;
}

.card p {
    color: #555;
    line-height: 1.6;
}
```

The `flex: 1` on each card tells them to grow equally and share the available space. Even though "The Bridge" card has more text, all three cards are the same height thanks to the default `align-items: stretch`. We'll dig deeper into `flex: 1` and how `flex-grow` works in the next lesson.

---

## Putting It All Together

Here's a more complete example that combines several Flexbox concepts: a page header with a logo on the left and navigation on the right:

```html
<header class="site-header">
    <div class="logo">
        <img src="wbb-logo.svg" alt="We Build Black" height="40">
    </div>
    <nav class="header-nav">
        <a href="#">Programs</a>
        <a href="#">Courses</a>
        <a href="#">Community</a>
        <a href="#">Donate</a>
    </nav>
</header>
```

```css
.site-header {
    display: flex;
    justify-content: space-between;  /* Logo left, nav right */
    align-items: center;             /* Vertically centered */
    padding: 15px 30px;
    background-color: #2C170B;
}

.header-nav {
    display: flex;                   /* Nested flex container */
    gap: 20px;
}

.header-nav a {
    color: white;
    text-decoration: none;
    padding: 8px 16px;
    border-radius: 4px;
    transition: background-color 0.2s ease;
}

.header-nav a:hover {
    background-color: #7D4E21;
}
```

Notice the **nested flex containers**. The `<header>` is a flex container with two items: the logo and the nav. The `<nav>` is *also* a flex container for its link children. Nesting flex containers is a perfectly normal and common pattern. A flex item can be a flex container at the same time.

---

## Key Takeaways

1. **Flexbox is for one-dimensional layout.** It arranges items in a row or a column with precise control over spacing and alignment.
2. **`display: flex` on the parent** activates Flexbox. Its direct children become flex items automatically.
3. **Main axis vs cross axis** is the core mental model. By default, the main axis is horizontal and the cross axis is vertical. `flex-direction: column` swaps them.
4. **`justify-content`** distributes items along the main axis. Use `space-between` for spreading items apart, `center` for centering.
5. **`align-items`** aligns items along the cross axis. The default `stretch` gives you equal-height items, a classic Flexbox superpower.
6. **`flex-wrap: wrap`** lets items break to the next line instead of shrinking. Essential for responsive layouts.
7. **`gap`** creates clean spacing between items without the edge-margin problems of traditional approaches.

---

## Try It Yourself

1. Create a horizontal navigation bar with five links using `display: flex` and `gap`. Try different `justify-content` values (`flex-start`, `center`, `space-between`, `space-evenly`) and observe how the links rearrange.
2. Center a box both horizontally and vertically inside a full-viewport container using `justify-content: center` and `align-items: center`.
3. Build a row of three cards using Flexbox. Give each card `flex: 1` so they share space equally. Add enough text to one card to make it taller, and notice how the other cards stretch to match.
4. Change one of your flex containers to `flex-direction: column`. Observe how the items stack vertically and how `justify-content` and `align-items` swap their visual behavior.
5. Create a flex container with six items, each 200px wide. Set `flex-wrap: wrap` and resize your browser window. Watch the items wrap to new rows as the window shrinks.
6. Build the site header pattern from this lesson: logo on the left, navigation links on the right, everything vertically centered. Use `justify-content: space-between`.

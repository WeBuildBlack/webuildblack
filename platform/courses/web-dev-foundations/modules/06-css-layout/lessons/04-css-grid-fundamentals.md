---
title: "CSS Grid Fundamentals"
estimatedMinutes: 45
---

# CSS Grid Fundamentals

Flexbox let you arrange items in a single direction, a row or a column. It's brilliant for navigation bars, card rows, and centering content. But what about laying out an entire page? What about a dashboard with cards of different sizes? What about a photo gallery where some images span multiple rows?

For those jobs, you need **CSS Grid**.

CSS Grid is the most complete layout system in CSS. It lets you define **rows and columns** simultaneously, then place items precisely within that grid. If Flexbox is arranging books on a single shelf, Grid is designing the entire bookcase: deciding how many shelves there are, how tall each shelf is, and how wide each section is.

---

## What Is CSS Grid?

Think of a **spreadsheet**. A spreadsheet has rows going across and columns going down. Every cell sits at the intersection of a row and a column. You can merge cells, resize rows, and resize columns. That's exactly what CSS Grid lets you do with your web page.

Or think of a **city block layout**. The streets form a grid. Buildings (your content) fill in the blocks between the streets. Some buildings take up one block. Some span two blocks. The grid defines the structure; the buildings fill it in.

CSS Grid gives you two capabilities that Flexbox doesn't:

1. **Two-dimensional control**: rows AND columns at the same time
2. **Explicit placement**: you can say exactly which row and column an item should occupy

---

## Turning On Grid

Just like Flexbox, Grid has a **container** (parent) and **items** (children). You activate it with `display: grid`.

```html
<div class="grid-container">
  <div class="item">1</div>
  <div class="item">2</div>
  <div class="item">3</div>
  <div class="item">4</div>
  <div class="item">5</div>
  <div class="item">6</div>
</div>
```

```css
.grid-container {
  display: grid;
}
```

By itself, `display: grid` doesn't look any different from normal block layout. Items still stack vertically. The real layout starts when you define columns and rows.

---

## Defining Columns: grid-template-columns

`grid-template-columns` tells the browser how many columns you want and how wide each one should be.

```css
.grid-container {
  display: grid;
  grid-template-columns: 200px 200px 200px; /* Three columns, each 200px wide */
}
```

Now your six items arrange themselves into a grid: three items per row, two rows total. The browser fills items left to right, top to bottom, automatically.

You can mix different column widths:

```css
.grid-container {
  display: grid;
  grid-template-columns: 250px 1fr 150px;
  /* First column: fixed at 250px
     Second column: takes all remaining space
     Third column: fixed at 150px */
}
```

That `1fr` is a new unit. We'll cover it in depth shortly. For now, know that it means "take up the remaining space."

---

## Defining Rows: grid-template-rows

`grid-template-rows` works the same way, but for rows:

```css
.grid-container {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 100px 200px;
  /* First row: 100px tall
     Second row: 200px tall */
}
```

If you have more items than fit in your defined rows, the browser creates additional rows automatically. These are called **implicit** rows (more on that shortly).

---

## The fr Unit

The `fr` unit is one of the best things about CSS Grid. It stands for **fraction**, a share of the available space.

```css
.grid-container {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr; /* Three equal columns */
}
```

This creates three columns that each take one-third of the available width. If the container is 900px wide, each column gets 300px. If it's 1200px wide, each gets 400px. The columns are always proportional.

You can mix `fr` with fixed sizes:

```css
.layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  /* Sidebar: always 250px
     Main content: takes whatever space is left */
}
```

And you can use different `fr` values to create proportional columns:

```css
.layout {
  display: grid;
  grid-template-columns: 1fr 2fr;
  /* First column gets 1 share
     Second column gets 2 shares, twice as wide */
}
```

Think of `fr` like splitting a restaurant bill. If three people split a bill equally, each pays `1fr` (one share). If one person ate a lot more and agrees to pay double, they pay `2fr` while everyone else pays `1fr`. The total is divided proportionally.

---

## The repeat() Function

Typing `1fr 1fr 1fr 1fr 1fr 1fr` for six equal columns gets tedious. The `repeat()` function is your shortcut:

```css
/* Instead of this: */
.grid { grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr; }

/* Write this: */
.grid { grid-template-columns: repeat(6, 1fr); }
/* "Repeat 1fr six times": six equal columns */
```

You can repeat any column definition:

```css
/* Three columns of 200px each */
.grid { grid-template-columns: repeat(3, 200px); }

/* A repeating pattern: 100px then 1fr, repeated three times */
.grid { grid-template-columns: repeat(3, 100px 1fr); }
/* Creates: 100px 1fr 100px 1fr 100px 1fr, six columns total */
```

You can also mix `repeat()` with other values:

```css
/* Fixed sidebar + three equal content columns */
.layout {
  display: grid;
  grid-template-columns: 250px repeat(3, 1fr);
  /* Creates: 250px 1fr 1fr 1fr */
}
```

---

## gap, row-gap, and column-gap

Just like Flexbox, Grid uses the `gap` property for spacing between items. It adds space **between** items without extra space at the outer edges.

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px; /* 20px between all rows and all columns */
}
```

You can set row and column gaps separately:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  row-gap: 20px;    /* Space between rows */
  column-gap: 30px; /* Space between columns */
}

/* Or use the shorthand with two values */
.grid-shorthand {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px 30px; /* row-gap column-gap */
}
```

---

## Automatic Item Placement

By default, Grid places items automatically. Items fill in left to right, top to bottom, like reading a page. When a row is full, items wrap to the next row.

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
```

```html
<div class="grid">
  <div>1</div>  <!-- Row 1, Column 1 -->
  <div>2</div>  <!-- Row 1, Column 2 -->
  <div>3</div>  <!-- Row 1, Column 3 -->
  <div>4</div>  <!-- Row 2, Column 1 -->
  <div>5</div>  <!-- Row 2, Column 2 -->
  <div>6</div>  <!-- Row 2, Column 3 -->
</div>
```

Six items, three columns. The browser creates two rows automatically and fills them in. You didn't have to write a single line of placement code. This auto-flow is one of Grid's most convenient features.

---

## Explicit vs Implicit Grid

This is an important distinction to understand.

The **explicit grid** is what you define with `grid-template-columns` and `grid-template-rows`. These are the tracks you've deliberately created.

The **implicit grid** is what the browser creates automatically when there are more items than your template can hold.

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 3 columns explicitly defined */
  grid-template-rows: 150px;            /* Only 1 row explicitly defined */
}
```

If you put six items in this grid, the first three fill the explicit first row (150px tall). But items 4, 5, and 6 need a second row that you didn't define. The browser creates an **implicit row** automatically. By default, implicit rows are sized by their content, only as tall as they need to be.

You can control the size of implicit rows (and columns) with `grid-auto-rows`:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 150px; /* All auto-created rows will be 150px tall */
}
```

Now every row, whether you explicitly defined it or the browser created it, is 150px tall. This is especially useful when you don't know how many items you'll have (like a dynamic list of cards or products).

---

## The minmax() Function

`minmax()` lets you set a **minimum and maximum size** for rows or columns. It's incredibly useful for creating flexible layouts that don't break.

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: minmax(100px, auto);
  /* Each row is AT LEAST 100px tall,
     but grows taller if the content needs more room */
}
```

Think of `minmax()` as setting guardrails. You're saying: "This row should be at least 100px, but if a card has lots of text, let the row grow to fit. Just don't ever go below 100px."

```css
/* A sidebar that's at least 200px but can grow */
.layout {
  display: grid;
  grid-template-columns: minmax(200px, 300px) 1fr;
  /* Sidebar: between 200px and 300px
     Main: takes the rest */
}
```

Common pairings:
- `minmax(100px, auto)`: at least 100px, but grows with content
- `minmax(200px, 1fr)`: at least 200px, but can take up to 1 share of available space
- `minmax(0, 1fr)`: can shrink to nothing if needed (this is actually the default behavior of `1fr`)

---

## auto-fit and auto-fill: Responsive Grids Without Media Queries

This is where CSS Grid gets truly powerful. Instead of specifying exactly how many columns you want, you can tell the browser: "Make as many columns as will fit."

### auto-fill

`auto-fill` creates as many columns of a given size as can fit in the container. If there's leftover space, it stays empty.

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 200px);
  gap: 16px;
}
```

On a 1000px screen, you'd get about four 200px columns (accounting for gaps). On a 600px screen, about two. The number of columns adjusts automatically. No media queries needed.

### auto-fit

`auto-fit` works like `auto-fill`, but with one key difference: when there are fewer items than available columns, `auto-fit` **collapses the empty columns** and lets existing items stretch to fill the space.

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}
```

This single line is the most useful Grid declaration you'll ever write. Let's unpack it:

- `repeat(auto-fit, ...)`: create as many columns as will fit
- `minmax(250px, 1fr)`: each column is at least 250px wide but can grow to fill remaining space

The result: on a wide screen, you might see four cards per row. Make the window narrower, and it automatically drops to three, then two, then one. Each card grows to fill its column. No card is ever narrower than 250px. No media queries needed.

**This single line replaces what used to require multiple media queries:**

```css
/* The old way; don't do this anymore when auto-fit works */
@media (min-width: 600px) { .grid { columns: 2; } }
@media (min-width: 900px) { .grid { columns: 3; } }
@media (min-width: 1200px) { .grid { columns: 4; } }
```

### auto-fill vs auto-fit: When It Matters

The difference only shows when you have **fewer items than available column slots**:

- **`auto-fill`**: Keeps the empty column tracks. Items don't stretch past their `minmax` max.
- **`auto-fit`**: Collapses empty tracks. Items stretch to fill the full container width.

If you have a full grid (most column slots occupied), they behave identically. For most real-world use cases, **`auto-fit` is what you want** because it gives you the stretchy, responsive behavior that looks best.

---

## Practical Examples

Let's build real layouts with everything you've learned.

### Simple 3-Column Layout

```css
.three-col {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  padding: 20px;
}

.three-col .card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

```html
<div class="three-col">
  <div class="card">
    <h3>Card One</h3>
    <p>Content goes here.</p>
  </div>
  <div class="card">
    <h3>Card Two</h3>
    <p>More content here.</p>
  </div>
  <div class="card">
    <h3>Card Three</h3>
    <p>Even more content.</p>
  </div>
</div>
```

### Responsive Image Grid

```html
<div class="image-grid">
  <img src="https://picsum.photos/400/300?random=1" alt="Photo 1">
  <img src="https://picsum.photos/400/300?random=2" alt="Photo 2">
  <img src="https://picsum.photos/400/300?random=3" alt="Photo 3">
  <img src="https://picsum.photos/400/300?random=4" alt="Photo 4">
  <img src="https://picsum.photos/400/300?random=5" alt="Photo 5">
  <img src="https://picsum.photos/400/300?random=6" alt="Photo 6">
  <img src="https://picsum.photos/400/300?random=7" alt="Photo 7">
  <img src="https://picsum.photos/400/300?random=8" alt="Photo 8">
</div>
```

```css
.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  padding: 20px;
}

.image-grid img {
  width: 100%;
  height: 220px;
  object-fit: cover;   /* Crop images to fill uniformly */
  border-radius: 8px;
  display: block;
}
```

This grid adapts to any screen size with zero media queries. Images fill the available columns and look consistent thanks to `object-fit: cover` (which you may remember from the CSS properties in Module 05; it crops the image to fill its container while maintaining aspect ratio).

### Dashboard Layout

```html
<div class="dashboard">
  <div class="stat-card">Total Members: 340</div>
  <div class="stat-card">Active Cohorts: 3</div>
  <div class="stat-card">Completion Rate: 78%</div>
  <div class="stat-card">Jobs Placed: 42</div>
  <div class="main-chart">Chart area</div>
  <div class="recent-activity">Recent activity</div>
</div>
```

```css
.dashboard {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(120px, auto);
  gap: 20px;
  padding: 20px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  display: flex;               /* Flexbox INSIDE a Grid item */
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 600;
  color: #2C170B;
}

.main-chart {
  grid-column: span 3;        /* Stretches across 3 of the 4 columns */
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  min-height: 300px;
}

.recent-activity {
  grid-column: span 1;        /* Takes the remaining 1 column */
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}
```

Notice `grid-column: span 3` on the chart. That's how you make an item stretch across multiple columns. We'll cover `span` and explicit placement in the next lesson.

Also notice the **Flexbox inside Grid** pattern on `.stat-card`. Grid handles the overall dashboard layout (positioning each card in the grid). Flexbox handles the internal alignment of each card's content (centering the text). This Grid-for-layout, Flexbox-for-content pattern is extremely common and effective.

---

## Key Takeaways

1. **CSS Grid is for two-dimensional layout.** It controls rows AND columns at the same time, unlike Flexbox which handles one direction at a time.
2. **`display: grid`** activates Grid on the parent. Define columns with `grid-template-columns` and rows with `grid-template-rows`.
3. The **`fr` unit** represents a fraction of available space. `1fr 1fr 1fr` creates three equal columns. `1fr 2fr` makes the second column twice as wide.
4. **`repeat()`** saves you from repetitive typing. `repeat(3, 1fr)` is the same as `1fr 1fr 1fr` but cleaner.
5. **`minmax()`** sets size guardrails for tracks. `minmax(100px, auto)` means "at least 100px, but grow with content."
6. **`repeat(auto-fit, minmax(250px, 1fr))`** is the single most useful Grid declaration. It creates a fully responsive grid that adjusts its column count automatically, with no media queries.
7. **Grid and Flexbox work together beautifully.** Use Grid for the overall page or section layout, and Flexbox for aligning content within each grid cell.

---

## Try It Yourself

1. **Three-column card grid**: Create a grid with three equal columns using `repeat(3, 1fr)`. Add six cards with titles and descriptions. Use `gap` for spacing.

2. **Responsive photo grid**: Create a grid of eight placeholder images using `repeat(auto-fit, minmax(200px, 1fr))`. Use images from `https://picsum.photos/400/300?random=1` (change the number for each image). Resize your browser and watch the columns adjust automatically.

3. **Sidebar layout**: Create a two-column layout with a fixed 250px sidebar and a fluid main content area using `250px 1fr`. Put a list of links in the sidebar and some paragraphs in the main area.

4. **Dashboard**: Build a simple dashboard with four small stat cards in a row (each `1fr`) and a larger chart area below that spans three columns using `grid-column: span 3`.

5. **Experiment with fr**: Create a three-column grid with `1fr 2fr 1fr`. Notice how the middle column is always twice as wide as the sides, regardless of screen width.

6. **Bonus**: Compare `auto-fit` vs `auto-fill`. Create a grid with only two items but space for four columns. Use `auto-fill` first and notice the empty tracks. Switch to `auto-fit` and watch the items stretch to fill the full width.

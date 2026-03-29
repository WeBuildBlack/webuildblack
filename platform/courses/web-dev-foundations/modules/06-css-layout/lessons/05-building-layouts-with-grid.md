---
title: "Building Layouts with Grid"
estimatedMinutes: 45
---

# Building Layouts with Grid

In the last lesson, you learned the fundamentals of CSS Grid: defining columns and rows, the `fr` unit, `repeat()`, `minmax()`, and the incredibly useful `auto-fit` pattern. You built grids where items flowed into place automatically.

Now it's time to take full control. In this lesson, you'll learn how to **name your layout regions**, **place items exactly where you want them**, and **build complete page layouts** that used to require complex hacks. You'll also learn how to combine Grid and Flexbox, using each tool for what it does best.

By the end of this lesson, you'll be able to look at any web page design and know exactly how to build its layout.

---

## grid-template-areas: Naming Your Layout

This is the most intuitive way to define a layout in CSS. Instead of thinking in numbers and coordinates, you literally **draw your layout** using names.

```css
.page {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: 80px 1fr 60px;
  grid-template-areas:
    "header  header"
    "sidebar main"
    "footer  footer";
  min-height: 100vh;
}
```

Read that `grid-template-areas` property. Can you see the layout? Two columns, three rows. The header spans both columns. The sidebar is on the left, main content on the right. The footer spans both columns.

Each string in quotes represents one row. Each word in that string represents one column. When the same name appears in adjacent cells, that area spans across them.

Now you assign items to those named areas with `grid-area`:

```css
.page__header  { grid-area: header; }
.page__sidebar { grid-area: sidebar; }
.page__main    { grid-area: main; }
.page__footer  { grid-area: footer; }
```

```html
<div class="page">
  <header class="page__header">Header</header>
  <aside class="page__sidebar">Sidebar</aside>
  <main class="page__main">Main Content</main>
  <footer class="page__footer">Footer</footer>
</div>
```

That's it. You've built a complete page layout. What makes `grid-template-areas` so great is that anyone reading your CSS can immediately understand the layout. It reads like a visual blueprint.

### Rules for grid-template-areas

1. Every row must have the **same number of names** (matching your column count)
2. Named areas must form **rectangles**. You can't make an L-shape or a T-shape
3. Use a **period `.`** for empty cells

```css
.layout {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-areas:
    "header header header"
    "sidebar main main"
    "sidebar . footer";
  /* The period creates an empty cell; nothing goes there */
}
```

---

## Placing Items with grid-column and grid-row

While `grid-template-areas` is great for full page layouts, sometimes you need to place items more precisely. `grid-column` and `grid-row` let you specify exactly which grid lines an item starts and ends at.

### Understanding Grid Lines

Grid lines are the invisible lines between (and around) your columns and rows. A three-column grid has **four column lines** numbered 1 through 4:

```
Line 1    Line 2    Line 3    Line 4
  |  Col 1  |  Col 2  |  Col 3  |
```

Similarly, a two-row grid has three row lines numbered 1 through 3.

### Placing Items

```css
.item-a {
  grid-column: 1 / 3;  /* Start at line 1, end at line 3, spans 2 columns */
  grid-row: 1 / 2;     /* Start at line 1, end at line 2, just 1 row */
}
```

The syntax is `start-line / end-line`. So `grid-column: 1 / 3` means "start at column line 1 and stretch to column line 3," which covers columns 1 and 2.

### The span Keyword

Instead of counting line numbers, you can use `span` to say "take up this many tracks":

```css
.wide-item {
  grid-column: span 2;  /* Span across 2 columns, wherever I am */
}

.tall-item {
  grid-row: span 3;     /* Span across 3 rows */
}

.featured {
  grid-column: span 2;
  grid-row: span 2;     /* A big 2x2 area */
}
```

This is what we used in the dashboard example from the last lesson. `span` is simpler than line numbers when you just want an item to be wider or taller than normal.

### Combining Start Position with Span

```css
.item {
  grid-column: 2 / span 2;  /* Start at column line 2, span 2 columns */
  /* Same result as: grid-column: 2 / 4; */
}
```

---

## grid-area: The Shorthand

`grid-area` can work two ways. You've already seen it with named areas:

```css
.header { grid-area: header; } /* Place me in the "header" area */
```

But it also works as a shorthand for line-based placement:

```css
.item {
  grid-area: 1 / 2 / 3 / 4;
  /* row-start / column-start / row-end / column-end */
}
```

The named area syntax is much more readable, so use that for page layouts. Use line numbers and `span` for finer control within a grid.

---

## Building a Complete Page Layout

Let's build a full page layout from scratch using `grid-template-areas`.

```html
<div class="site">
  <header class="site__header">
    <nav class="navbar">
      <a href="/" class="navbar__logo">We Build Black</a>
      <ul class="navbar__links">
        <li><a href="/programs">Programs</a></li>
        <li><a href="/courses">Courses</a></li>
        <li><a href="/about">About</a></li>
      </ul>
    </nav>
  </header>

  <aside class="site__sidebar">
    <h3>Categories</h3>
    <ul>
      <li><a href="#">Web Development</a></li>
      <li><a href="#">Data Analytics</a></li>
      <li><a href="#">UX Design</a></li>
      <li><a href="#">Mobile Dev</a></li>
    </ul>
  </aside>

  <main class="site__main">
    <h1>Welcome to Our Learning Platform</h1>
    <p>Explore courses designed to help you break into tech.</p>
  </main>

  <footer class="site__footer">
    <p>2026 We Build Black. All rights reserved.</p>
  </footer>
</div>
```

```css
.site {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header  header"
    "sidebar main"
    "footer  footer";
  min-height: 100vh;
  gap: 0; /* Sections touch each other, no spacing */
}

.site__header {
  grid-area: header;
  background-color: #2C170B;
  color: white;
}

.site__sidebar {
  grid-area: sidebar;
  background-color: #f0e6dc;
  padding: 24px;
}

.site__main {
  grid-area: main;
  padding: 32px;
}

.site__footer {
  grid-area: footer;
  background-color: #2C170B;
  color: white;
  padding: 20px;
  text-align: center;
}

/* The navbar inside the header uses Flexbox */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 30px;
}

.navbar__links {
  display: flex;
  list-style: none;
  gap: 20px;
  margin: 0;
  padding: 0;
}

.navbar__links a {
  color: white;
  text-decoration: none;
}
```

Notice the pattern: **Grid defines where things go** (the overall page structure). **Flexbox handles alignment within those areas** (the navbar links). This is the Grid + Flexbox partnership in action.

The row definition `auto 1fr auto` is important:
- First row (`auto`): the header takes only as much height as it needs
- Middle row (`1fr`): the sidebar/main area takes ALL remaining space
- Last row (`auto`): the footer takes only as much height as it needs

This ensures the footer stays at the bottom even when content is short.

---

## Combining Grid and Flexbox

Here's the golden rule: **Grid for layout, Flexbox for content.**

Grid excels at defining the overall structure: where the header, sidebar, main content, and footer go. Flexbox excels at aligning items within those regions: centering text, spacing buttons, arranging card internals.

```css
/* GRID: Page-level layout */
.page {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header"
    "main"
    "footer";
  min-height: 100vh;
}

/* FLEXBOX: Navigation inside the header */
.header__nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 30px;
}

/* GRID: Card grid inside the main area */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  padding: 30px;
}

/* FLEXBOX: Content inside each card */
.card {
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card__description {
  flex: 1; /* Push the button to the bottom */
}

.card__button {
  margin-top: auto;
}
```

This nesting is perfectly normal and encouraged:

1. **Grid** positions the header, main, and footer on the page
2. Inside the header, **Flexbox** arranges the logo and navigation links
3. Inside the main area, **Grid** creates a responsive card layout
4. Inside each card, **Flexbox** stacks and aligns the card's content

You can nest as many levels as you need. Each container only cares about its direct children.

---

## Common Grid Patterns

### Magazine / Newspaper Layout

```css
.magazine {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(150px, auto);
  gap: 16px;
  padding: 20px;
}

/* Featured article spans 2 columns and 2 rows */
.article--featured {
  grid-column: span 2;
  grid-row: span 2;
}

/* Wide article spans the full width */
.article--wide {
  grid-column: 1 / -1; /* Line 1 to the last line, full width */
}

.article {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}
```

```html
<div class="magazine">
  <article class="article article--featured">Featured Story</article>
  <article class="article">Article 2</article>
  <article class="article">Article 3</article>
  <article class="article">Article 4</article>
  <article class="article article--wide">Full-Width Banner</article>
  <article class="article">Article 6</article>
  <article class="article">Article 7</article>
  <article class="article">Article 8</article>
  <article class="article">Article 9</article>
</div>
```

The trick `grid-column: 1 / -1` is handy. `-1` means "the last grid line," so the item stretches across all columns regardless of how many there are.

### Dashboard with Different-Sized Cards

```css
.dashboard {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: auto;
  grid-template-areas:
    "stats1 stats2 stats3 stats4"
    "chart  chart  chart  activity"
    "chart  chart  chart  activity"
    "table  table  recent recent";
  gap: 20px;
  padding: 20px;
}

.dash-stats1   { grid-area: stats1; }
.dash-stats2   { grid-area: stats2; }
.dash-stats3   { grid-area: stats3; }
.dash-stats4   { grid-area: stats4; }
.dash-chart    { grid-area: chart; }
.dash-activity { grid-area: activity; }
.dash-table    { grid-area: table; }
.dash-recent   { grid-area: recent; }
```

With `grid-template-areas`, you can read the dashboard layout like a map. The chart takes up a 3x2 block. The activity feed sits beside it. The table and recent items split the bottom row.

### Image Gallery with Featured Items

```css
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  grid-auto-rows: 200px;
  gap: 12px;
}

/* Make certain images larger */
.gallery__item--featured {
  grid-column: span 2;
  grid-row: span 2;
}

.gallery img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  display: block;
}
```

```html
<div class="gallery">
  <div class="gallery__item gallery__item--featured">
    <img src="https://picsum.photos/600/600?random=1" alt="Featured photo">
  </div>
  <div class="gallery__item">
    <img src="https://picsum.photos/300/300?random=2" alt="Photo 2">
  </div>
  <div class="gallery__item">
    <img src="https://picsum.photos/300/300?random=3" alt="Photo 3">
  </div>
  <div class="gallery__item">
    <img src="https://picsum.photos/300/300?random=4" alt="Photo 4">
  </div>
  <div class="gallery__item">
    <img src="https://picsum.photos/300/300?random=5" alt="Photo 5">
  </div>
  <div class="gallery__item gallery__item--featured">
    <img src="https://picsum.photos/600/600?random=6" alt="Another featured photo">
  </div>
  <div class="gallery__item">
    <img src="https://picsum.photos/300/300?random=7" alt="Photo 7">
  </div>
  <div class="gallery__item">
    <img src="https://picsum.photos/300/300?random=8" alt="Photo 8">
  </div>
</div>
```

Featured photos span 2 columns and 2 rows, making them four times the area of regular photos. The `auto-fit` with `minmax` handles responsiveness, and `object-fit: cover` keeps all images looking clean regardless of their natural proportions.

### Full Page Layout with Three Columns

```css
.full-page {
  display: grid;
  grid-template-columns: 220px 1fr 220px;
  grid-template-rows: 70px 1fr 60px;
  grid-template-areas:
    "header header  header"
    "left   content right"
    "footer footer  footer";
  min-height: 100vh;
}

.full-page__header  { grid-area: header; }
.full-page__left    { grid-area: left; }
.full-page__content { grid-area: content; }
.full-page__right   { grid-area: right; }
.full-page__footer  { grid-area: footer; }
```

A classic three-column layout with header and footer. The middle column takes all remaining space with `1fr`. The sidebars are fixed at 220px each.

---

## Grid Alignment Properties

Grid has its own set of alignment properties, similar to Flexbox but working in two dimensions.

### justify-items and align-items

These align items **within their grid cells**.

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 200px);
  grid-auto-rows: 200px;

  justify-items: center;  /* Horizontal alignment within each cell */
  align-items: center;    /* Vertical alignment within each cell */
}
```

Values: `start`, `end`, `center`, `stretch` (default).

With the default `stretch`, items fill their entire cell. With `center`, items sit in the middle of their cell, taking only the space their content needs.

### justify-content and align-content

These align **the entire grid** within its container. This is useful when the grid tracks don't fill the whole container.

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 200px); /* 600px of columns in total */
  width: 1000px;                           /* But the container is wider */

  justify-content: center;  /* Center the grid horizontally in the container */
  /* Other values: start, end, space-between, space-around, space-evenly */
}
```

Think of it this way:
- `justify-items` / `align-items` = align items **inside their cells**
- `justify-content` / `align-content` = align the **whole grid inside its container**

---

## Responsive Grid Without Media Queries

You've already seen the `auto-fit` + `minmax` pattern. Let's reinforce it because it's enormously useful:

```css
.responsive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}
```

This single declaration creates a grid that:
- Shows 4 columns on a wide desktop
- Drops to 3 columns on a narrower desktop
- Drops to 2 columns on a tablet
- Shows 1 column on a phone

All without a single `@media` query. The grid does the math automatically.

For a page layout with a sidebar that needs to collapse on mobile, you will need a media query, but `grid-template-areas` makes it clean:

```css
.page {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  min-height: 100vh;
}

/* On screens narrower than 768px, stack everything vertically */
@media (max-width: 768px) {
  .page {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "main"
      "sidebar"
      "footer";
  }
}
```

Notice how readable the layout change is. On mobile, everything goes single-column with main content above the sidebar. Anyone reading this CSS can instantly picture both layouts.

---

## Debugging Grid with DevTools

Browser DevTools have excellent Grid inspectors, even better than the Flexbox ones.

**In Chrome or Firefox:**

1. Right-click on the grid container and select "Inspect"
2. In the Elements panel, look for a **"grid"** badge next to the element. Click it to toggle a visual overlay
3. The overlay shows **grid lines with numbers**, track sizes, gap spacing, and area names
4. In Chrome, go to the "Layout" tab in DevTools to see all grids on the page and toggle overlays with options for line numbers, area names, and track sizes

The Grid inspector shows you:
- **Numbered grid lines**, so you can see where `grid-column: 1 / 3` would place an item
- **Named areas**: if you're using `grid-template-areas`, you'll see the names right on the overlay
- **Track sizes**: the actual pixel width and height of each column and row
- **Gaps**, highlighted so you can verify spacing

If your Grid layout isn't working as expected:
- Check that `display: grid` is on the **parent**, not the items
- Verify your `grid-template-areas` strings all have the **same number of names** per row
- Make sure named areas form **rectangles**. No L-shapes or T-shapes
- Check that `grid-area` names on items **match exactly** (including spelling and case) the names in `grid-template-areas`

---

## Choosing Between Flexbox and Grid: The Decision Guide

After five lessons, you know both tools well. Here's your decision framework:

**Choose Flexbox when:**
- You're laying out items in **one direction**, a row or a column
- The **content** should determine how much space each item gets
- You're building a **component**: navigation bar, button group, card internals, media object, form row
- You need to **center** something
- Items should **wrap** naturally to the next line

**Choose Grid when:**
- You need **rows and columns** at the same time
- The **layout structure** should determine where items go (not the content)
- You're defining a **page layout**: header, sidebar, main, footer
- You want items to **span** multiple rows or columns
- You need a **gallery or dashboard** with items of different sizes
- You want a **responsive grid** that adjusts column count automatically

**Choose both when:**
- You're building a **real web page** (which is almost always)
- Grid for the page structure, Flexbox for the components inside each Grid area

A practical way to decide: ask yourself, "Am I arranging items along a single line, or am I placing items in a two-dimensional area?" Single line means Flexbox. Two-dimensional area means Grid. A full page means both.

---

## Key Takeaways

1. **`grid-template-areas`** lets you name your layout regions and visualize your grid right in the CSS. It's the most readable way to define a page layout.
2. **`grid-column` and `grid-row`** place items precisely using grid line numbers. The **`span`** keyword makes items stretch across multiple tracks without counting lines.
3. **`grid-column: 1 / -1`** stretches an item across all columns. `-1` always means "the last grid line."
4. **Grid + Flexbox is the standard approach** for real layouts. Grid handles where things go on the page. Flexbox handles how things are aligned within each area.
5. **Responsive layouts with `grid-template-areas`** are clean and readable. Rewriting the area template inside a media query lets you completely restructure a page layout in a few lines.
6. **Grid alignment** has four key properties: `justify-items` and `align-items` for items within cells, `justify-content` and `align-content` for the grid within its container.
7. **The DevTools Grid inspector** shows numbered lines, named areas, and track sizes, making it straightforward to debug any Grid layout issue.

---

## Try It Yourself

1. **Page layout with named areas**: Build a page with `grid-template-areas` that has a header spanning the full width, a sidebar on the left (200px), a main content area taking the remaining space, and a footer spanning the full width. Add background colors to each section so you can see the layout clearly.

2. **Magazine layout**: Create a four-column grid with articles. Make one article span 2 columns and 2 rows (the featured story). Make one article span all 4 columns (a banner) using `grid-column: 1 / -1`. Fill the rest with regular single-cell articles.

3. **Responsive page layout**: Take your layout from exercise 1 and add a media query for screens under 768px. In the mobile version, stack everything in a single column with main content above the sidebar.

4. **Grid + Flexbox combo**: Build a page where Grid handles the overall layout (header, main, footer) and the main area contains a responsive card grid using `repeat(auto-fit, minmax(250px, 1fr))`. Inside each card, use Flexbox with `flex-direction: column` and `flex: 1` on the description to push action links to the bottom.

5. **Image gallery with featured photos**: Create a gallery using CSS Grid. Most images take one cell, but make two images span 2 columns and 2 rows using `grid-column: span 2` and `grid-row: span 2`. Use `object-fit: cover` on all images for clean cropping.

6. **Bonus**: Build a dashboard layout using `grid-template-areas`. Include four stat cards across the top row, a large chart area (3 columns wide, 2 rows tall), an activity feed beside the chart, and a data table spanning the bottom. Open DevTools and use the Grid inspector to verify your layout matches your template.

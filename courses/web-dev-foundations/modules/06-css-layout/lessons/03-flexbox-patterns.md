---
title: "Common Flexbox Patterns"
estimatedMinutes: 40
---

# Common Flexbox Patterns

You've got the Flexbox fundamentals down: containers and items, axes, `justify-content`, `align-items`, wrapping, and `gap`. Now it's time to go deeper. In this lesson, you'll learn the flex item properties that give you fine-grained control over how individual items grow, shrink, and behave. Then we'll build the most common layout patterns you'll encounter in real-world web development.

By the end of this lesson, you'll have a toolkit of ready-to-use patterns that cover the vast majority of layouts you'll ever need to build with Flexbox.

---

## Flex Item Properties

In the last lesson, we focused on properties for the **container** (parent). Now we're focusing on properties for the **items** (children). These control how each individual item behaves within the flex container.

### flex-grow

`flex-grow` tells an item whether it should **expand** to fill extra space in the container, and if so, how much of that extra space it should claim.

- `flex-grow: 0` (the default): "Don't grow. Stay at my natural size."
- `flex-grow: 1`: "Grow to fill available space."

```css
.container {
  display: flex;
  gap: 15px;
}

.sidebar {
  width: 250px;
  flex-grow: 0;  /* Stay at 250px, don't take extra space */
}

.main-content {
  flex-grow: 1;  /* Take ALL the leftover space */
}
```

Think of it like splitting a pizza among friends. The pizza is the extra space in the container. `flex-grow` decides how many slices each person gets. If you and two friends each have `flex-grow: 1`, you split evenly (one share each). If you have `flex-grow: 2` and your friends have `flex-grow: 1`, you get twice as many slices as each friend.

```css
.item-a { flex-grow: 1; } /* Gets 1 share of extra space */
.item-b { flex-grow: 2; } /* Gets 2 shares, grows twice as much as A or C */
.item-c { flex-grow: 1; } /* Gets 1 share of extra space */
/* Total: 4 shares. B gets half the extra space. A and C each get a quarter. */
```

### flex-shrink

`flex-shrink` is the opposite of `flex-grow`. It controls whether an item should **shrink** when the container doesn't have enough room for everything at full size.

- `flex-shrink: 1` (the default): "Yes, shrink me if needed."
- `flex-shrink: 0`: "Don't shrink me. I keep my size no matter what."

```css
.logo {
  flex-shrink: 0;  /* Never squish the logo */
  width: 150px;
}

.search-bar {
  flex-shrink: 1;  /* This can get smaller when space is tight */
  width: 400px;
}
```

Use `flex-shrink: 0` on items that must keep a certain size: logos, icons, avatars, fixed-width sidebars. Let other elements flex around them.

### flex-basis

`flex-basis` sets the **starting size** of a flex item before any growing or shrinking happens. Think of it as the item's ideal size, what it wants to be before Flexbox starts distributing extra space or reclaiming space.

```css
.item {
  flex-basis: 300px; /* "I'd like to be 300px, please" */
}
```

- `flex-basis: auto` (the default): use whatever `width` is set, or the content size
- `flex-basis: 0`: pretend I have no starting size; distribute space purely by `flex-grow` ratios
- `flex-basis: 300px`: start at 300px, then grow or shrink from there

`flex-basis` is similar to `width` (in a row layout) or `height` (in a column layout), but it's designed specifically for Flexbox and works better with `flex-grow` and `flex-shrink`.

---

## The flex Shorthand

In practice, you'll almost never write `flex-grow`, `flex-shrink`, and `flex-basis` separately. The `flex` shorthand combines all three:

```css
/* flex: grow shrink basis */
.item {
  flex: 1 1 auto;
}
```

Here are the values you'll use most often:

### flex: 1

```css
.item {
  flex: 1;
  /* Expands to: flex-grow: 1; flex-shrink: 1; flex-basis: 0; */
}
```

This is the most commonly used flex value. It means: "Grow to fill space, shrink if needed, and start from zero so all items with `flex: 1` share space equally." When every item in a container has `flex: 1`, they all end up the same size.

### flex: 0 0 auto

```css
.item {
  flex: 0 0 auto;
  /* Don't grow, don't shrink, be my natural size */
}
```

Use this for items that should stay exactly the size of their content or their set `width`. The item is rigid. It won't flex at all.

### flex: 0 0 250px

```css
.sidebar {
  flex: 0 0 250px;
  /* Don't grow, don't shrink, always be exactly 250px */
}
```

A fixed-width element. No flexibility whatsoever. Perfect for sidebars that must always be the same width.

### flex: 1 0 300px

```css
.card {
  flex: 1 0 300px;
  /* Grow if there's room, never shrink below 300px */
}
```

This gives you an item with a minimum size of 300px that happily grows when extra space is available. Great for cards in a wrapping layout.

---

## align-self: Overriding Alignment for One Item

Remember `align-items` on the container? It aligns *all* items along the cross axis. But sometimes you need **one item** to break the rule.

`align-self` goes on an individual item and overrides the container's `align-items` for just that item.

```css
.container {
  display: flex;
  align-items: flex-start; /* All items align to the top */
  height: 400px;
}

.rebel-item {
  align-self: flex-end; /* But THIS item goes to the bottom */
}
```

The values are the same as `align-items`: `auto`, `flex-start`, `flex-end`, `center`, `baseline`, `stretch`.

### The margin-top: auto Trick

Here's one of the most powerful techniques in Flexbox. In a flex container, an `auto` margin absorbs all available space in that direction. Setting `margin-top: auto` on an item pushes it as far down as possible.

```css
/* A card where the button always sticks to the bottom */
.card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
}

.card__title {
  font-size: 1.25rem;
  margin-bottom: 8px;
}

.card__description {
  color: #555;
  line-height: 1.6;
  /* Takes its natural height */
}

.card__button {
  margin-top: auto; /* Absorbs ALL available space above, pushes button to the bottom */
  padding: 10px 20px;
  background-color: #7D4E21;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.card__button:hover {
  background-color: #2C170B;
}
```

The `margin-top: auto` tells the browser: "Put as much space as possible above me." The button slides to the very bottom of the card, regardless of how much description text there is. It's like saying "maximize the gap between me and what's above me."

---

## order: Reordering Items Visually

By default, flex items appear in the order they're written in the HTML. The `order` property changes the visual order without touching your markup.

All items default to `order: 0`. Lower numbers come first. Items with the same `order` value keep their HTML source order.

```css
.item-a { order: 3; } /* Appears last visually */
.item-b { order: 1; } /* Appears first visually */
.item-c { order: 2; } /* Appears second visually */
```

A common use is rearranging layout on smaller screens:

```css
/* On mobile, show main content before the sidebar */
@media (max-width: 768px) {
  .layout {
    flex-direction: column;
  }
  .sidebar {
    order: 2; /* Show sidebar after main content */
  }
  .main-content {
    order: 1; /* Show main content first */
  }
}
```

**Accessibility note**: Screen readers and keyboard navigation follow the HTML source order, not the visual order set by `order`. Make sure your HTML order makes logical reading sense for people using assistive technology. Use `order` for visual tweaks only.

---

## Common Flexbox Patterns

Let's build the patterns you'll reach for again and again.

### Navigation: Logo Left, Links Right

The most common Flexbox pattern on the web:

```html
<nav class="navbar">
  <a href="/" class="navbar__logo">
    <img src="wbb-logo.svg" alt="We Build Black" height="36">
  </a>
  <ul class="navbar__links">
    <li><a href="/programs">Programs</a></li>
    <li><a href="/courses">Courses</a></li>
    <li><a href="/about">About</a></li>
    <li><a href="/donate" class="btn-donate">Donate</a></li>
  </ul>
</nav>
```

```css
.navbar {
  display: flex;
  justify-content: space-between; /* Logo left, links right */
  align-items: center;            /* Vertically centered */
  padding: 12px 30px;
  background-color: #2C170B;
}

.navbar__logo img {
  display: block; /* Removes the tiny gap below inline images */
}

.navbar__links {
  display: flex;   /* Nested flex container, links go horizontal */
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 8px;
}

.navbar__links a {
  color: white;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 6px;
  transition: background-color 0.2s ease; /* Smooth hover from Module 05 */
}

.navbar__links a:hover {
  background-color: #7D4E21;
}

.btn-donate {
  background-color: #AE8156;
  font-weight: 600;
}
```

The key: `justify-content: space-between` on the navbar pushes the logo to the far left and the link list to the far right. The links list is itself a flex container, so the `<a>` tags sit side by side with `gap`.

### Equal-Height Cards with Bottom-Aligned Actions

Three cards, different content lengths, all the same height, with "Learn More" links consistently at the bottom:

```html
<div class="card-row">
  <article class="card">
    <h3 class="card__title">Fast Track</h3>
    <p class="card__desc">A 6-month workforce training program with paid stipends for participants who hit milestones. Tracks include Android Development, UX Design, and Data Analytics.</p>
    <a href="#" class="card__link">Learn More</a>
  </article>
  <article class="card">
    <h3 class="card__title">Crowns of Code</h3>
    <p class="card__desc">Youth coding workshops for ages 10-17.</p>
    <a href="#" class="card__link">Learn More</a>
  </article>
  <article class="card">
    <h3 class="card__title">The Bridge</h3>
    <p class="card__desc">An 8-week virtual accountability program helping community members land their next tech role through structured interview prep, peer pods, and weekly coaching.</p>
    <a href="#" class="card__link">Learn More</a>
  </article>
</div>
```

```css
.card-row {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.card {
  flex: 1 0 280px;         /* Grow equally, min 280px, wrap below that */
  display: flex;            /* Card is ALSO a flex container */
  flex-direction: column;   /* Stack content vertically */
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-top: 4px solid #7D4E21;
}

.card__title {
  color: #2C170B;
  margin: 0 0 12px;
}

.card__desc {
  color: #555;
  line-height: 1.6;
  flex: 1;                 /* Description absorbs all remaining vertical space */
}

.card__link {
  margin-top: 16px;
  color: #7D4E21;
  font-weight: 600;
  text-decoration: none;
}

.card__link:hover {
  text-decoration: underline;
}
```

The key trick: each card is both a flex item (in the row) and a flex container (for its own content). Setting `flex: 1` on `.card__desc` makes the description stretch to fill all extra vertical space, pushing the "Learn More" link to the bottom of every card, even though the Crowns of Code card has much less text.

### Holy Grail Layout

Header on top, footer on bottom, sidebar and main content in the middle:

```html
<div class="page">
  <header class="page__header">Header</header>
  <div class="page__body">
    <aside class="page__sidebar">Sidebar</aside>
    <main class="page__main">Main Content</main>
  </div>
  <footer class="page__footer">Footer</footer>
</div>
```

```css
.page {
  display: flex;
  flex-direction: column;  /* Stack header, body, footer vertically */
  min-height: 100vh;       /* At least full viewport height */
}

.page__header {
  background-color: #2C170B;
  color: white;
  padding: 20px 30px;
}

.page__body {
  display: flex;           /* Side-by-side sidebar + main */
  flex: 1;                 /* Grow to fill all remaining vertical space */
}

.page__sidebar {
  flex: 0 0 260px;        /* Fixed 260px, no growing, no shrinking */
  background-color: #f0e6dc;
  padding: 20px;
}

.page__main {
  flex: 1;                /* Takes all remaining horizontal space */
  padding: 30px;
}

.page__footer {
  background-color: #2C170B;
  color: white;
  padding: 20px 30px;
  text-align: center;
}
```

The essential line is `flex: 1` on `.page__body`. The page is a column flex container with `min-height: 100vh`. The header and footer take their natural height. `.page__body` stretches to fill everything in between, automatically pushing the footer to the bottom, even with very little content.

### Centering Anything

```css
.center-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
```

Three lines. Works for any content. The long nightmare of centering a div is officially over.

### Footer Stuck to Bottom

Even without the full holy grail layout, this simple pattern ensures the footer never floats up when content is short:

```css
body {
  margin: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

main {
  flex: 1; /* Grows to push footer to the bottom */
}
```

### Media Object: Image + Text Side by Side

This pattern is everywhere: comments, testimonials, team bios, notifications:

```html
<div class="media">
  <img src="avatar.jpg" alt="Jordan Williams" class="media__avatar">
  <div class="media__body">
    <h4 class="media__name">Jordan Williams</h4>
    <p class="media__text">Just completed Fast Track milestone 3! The mentorship from our Shopify partner has been incredible.</p>
    <span class="media__date">March 10, 2026</span>
  </div>
</div>
```

```css
.media {
  display: flex;
  gap: 16px;
  align-items: flex-start; /* Avatar stays at top, doesn't stretch to fill height */
  padding: 20px;
  background: white;
  border-radius: 8px;
}

.media__avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;    /* Circular avatar */
  object-fit: cover;     /* Crop image to fill the circle */
  flex-shrink: 0;        /* NEVER squish the avatar */
}

.media__body {
  flex: 1;               /* Text takes remaining space */
}

.media__name {
  margin: 0 0 4px;
  color: #2C170B;
  font-weight: 600;
}

.media__text {
  margin: 0 0 8px;
  color: #555;
  line-height: 1.5;
}

.media__date {
  font-size: 0.85rem;
  color: #999;
}
```

`flex-shrink: 0` on the avatar is critical. Without it, a long block of text could compress the avatar image on narrow screens. The avatar keeps its size; the text wraps instead.

---

## Debugging Flexbox with DevTools

When your layout misbehaves, browser Developer Tools are your best friend.

**In Chrome or Firefox:**

1. Right-click on the flex container and select "Inspect"
2. In the Elements panel, look for a small **"flex"** badge next to the element. Click it to toggle a visual overlay
3. The overlay shows item boundaries, gap spacing, and free space
4. In the Styles panel, look for the **Flexbox editor**. Clickable buttons let you change `flex-direction`, `justify-content`, `align-items`, and `flex-wrap` in real time

**Common debugging checklist:**

- **Items not side by side?** Make sure `display: flex` is on the parent, not the items
- **Items not wrapping?** Add `flex-wrap: wrap` to the container
- **Items not growing?** Add `flex: 1` to the items you want to grow
- **One item getting squished?** Add `flex-shrink: 0` to protect it
- **Alignment seems wrong?** Remember `justify-content` = main axis, `align-items` = cross axis. If `flex-direction` changed, the axes swapped
- **Unexpected spacing?** Check for margins on items. With `gap`, you usually don't need extra margins

---

## Flexbox vs Grid: When to Choose Each

You'll learn CSS Grid in the next two lessons. Here's the quick decision guide:

| Use Flexbox | Use Grid |
|---|---|
| One-dimensional layout (row OR column) | Two-dimensional layout (rows AND columns) |
| Items should flex and share space | Items should snap to a defined grid |
| Component layout (nav, card internals, form) | Page layout (header + sidebar + main + footer) |
| You want items to wrap naturally | You want precise control over placement |
| Content drives the size | The grid structure drives the size |

In real projects, you'll use **both**. Grid for the page structure, Flexbox for the components inside grid cells. You'll see this combination in Lesson 05.

---

## Key Takeaways

1. **`flex-grow`** controls how items expand to fill extra space. `flex-grow: 0` (default) stays at natural size. `flex-grow: 1` claims its share of the leftover space.
2. **`flex-shrink: 0`** prevents an item from shrinking. Use it on elements that must keep their dimensions (logos, avatars, fixed sidebars).
3. **`flex: 1`** is the most commonly used flex shorthand. It means "grow equally, shrink if needed, start from zero," making all items with `flex: 1` share space equally.
4. **`align-self`** lets a single item override the container's `align-items`. Combined with **`margin-top: auto`**, you can push an item to the bottom of a flex column. Perfect for card buttons.
5. **`order`** rearranges items visually without changing HTML. Use it for responsive reordering, but keep your HTML in a logical reading order for accessibility.
6. The **card pattern** (flex container with `flex-direction: column`, `flex: 1` on the middle content, and bottom-aligned actions) is one of the most useful and reusable Flexbox patterns.
7. **Flexbox handles one dimension** (row or column). When you need rows AND columns at the same time, reach for CSS Grid.

---

## Try It Yourself

Build a complete page using the Flexbox patterns from this lesson:

1. **Navigation bar**: Logo on the left, links on the right, a colored "Donate" button as the last link. Use nested flex containers (the nav is a flex container, and the links list is another flex container inside it).

2. **Hero section**: A full-width section with a heading, a paragraph, and two buttons ("Get Started" and "Learn More") side by side. Center everything horizontally. Use `gap` between the buttons.

3. **Three program cards**: Each card has a title, description of varying length, and a "Learn More" link. All cards should be equal height with links at the bottom. Use `flex: 1` on the descriptions.

4. **Testimonial**: Build a media object with a circular avatar, a name, a quote, and a date. Use `flex-shrink: 0` on the avatar.

5. **Footer at the bottom**: Three columns (About, Quick Links, Contact) that sit side by side on wide screens. Use `flex-wrap: wrap` so they stack on narrow screens. Make sure the footer stays at the bottom of the viewport even when page content is short.

6. **Bonus**: Use `order` to rearrange the footer columns visually (put Contact first, Links second, About third) without changing the HTML order.

---
title: "Display and Positioning"
estimatedMinutes: 45
---

# Display and Positioning

In Module 05, you learned how to style individual elements: colors, fonts, spacing, borders, even animations. But here's the thing: knowing how to make a button look good is different from knowing where to *put* that button on the page. That's what this entire module is about. **Layout**.

Before we get to the powerful layout tools (Flexbox and Grid, coming in the next lessons), we need to understand how browsers decide where things go in the first place. That's what this lesson covers: the default rules, and how to break them when you need to.

---

## A Quick Review: Display Types

You touched on `display` values in Module 05. Let's make sure these are locked in, because everything in layout builds on this foundation.

Every HTML element has a default `display` value. It's either **block**, **inline**, or **inline-block**.

### Block Elements

Block elements take up the **full width** available and start on a **new line**. Think of them like paragraphs in a book. Each one gets its own line, stretching from margin to margin.

```html
<div>I'm a block element</div>
<p>I'm also a block element</p>
<h2>Me too</h2>
```

```css
/* Block elements naturally stack vertically */
/* Each one sits below the previous one */
div, p, h2 {
  background-color: #f0e6dc;
  margin-bottom: 10px;
}
```

Common block elements: `<div>`, `<p>`, `<h1>`-`<h6>`, `<section>`, `<header>`, `<footer>`, `<main>`, `<nav>`, `<ul>`, `<ol>`, `<li>`, `<form>`.

### Inline Elements

Inline elements only take up as **much width as their content needs** and do **not** start on a new line. They flow within text, like words in a sentence.

```html
<p>This is a <strong>bold</strong> word and a <a href="#">link</a> inside a paragraph.</p>
```

You **cannot** set `width`, `height`, or vertical `margin` on inline elements. They just flow with the text.

Common inline elements: `<span>`, `<a>`, `<strong>`, `<em>`, `<img>` (technically inline by default), `<code>`.

### Inline-Block Elements

Inline-block is the hybrid. Elements sit **inline** (side by side, like words), but you **can** set `width`, `height`, `margin`, and `padding` on them, like block elements.

```css
.badge {
  display: inline-block;
  padding: 5px 15px;
  background-color: #7D4E21;
  color: white;
  border-radius: 20px;
  margin-right: 8px;
}
```

```html
<span class="badge">HTML</span>
<span class="badge">CSS</span>
<span class="badge">JavaScript</span>
```

This puts three styled badges side by side on the same line. Without `inline-block`, you couldn't control their padding and size while keeping them on one line.

---

## display: none vs visibility: hidden

Sometimes you want to hide an element. CSS gives you two ways, and they work very differently.

### display: none

This completely **removes** the element from the page layout. It's as if the element doesn't exist. Other elements fill in the space where it was.

```css
.hidden {
  display: none;
}
```

Think of it like taking a book off a shelf. The other books slide over to fill the gap.

### visibility: hidden

This makes the element **invisible**, but it still **takes up space**. The element is there, you just can't see it.

```css
.invisible {
  visibility: hidden;
}
```

Think of it like putting an invisible cloak on the book. The book is still on the shelf, still taking up space. The other books don't move. You just can't see it.

### When to use each

```css
/* Use display: none when you want the element completely gone */
/* Good for: toggle menus, tabs, conditional content */
.menu--closed {
  display: none;
}

/* Use visibility: hidden when you want to reserve the space */
/* Good for: placeholders, preventing layout shifts */
.loading-placeholder {
  visibility: hidden;
}
```

---

## The Normal Document Flow

Before you can break the rules, you need to know what the rules are.

**Normal document flow** is how browsers lay out elements by default, without any special positioning or layout CSS. The rules are simple:

1. **Block elements** stack vertically, one on top of another, from top to bottom
2. **Inline elements** flow horizontally, left to right (in English and other LTR languages), wrapping to the next line when they run out of room
3. Elements appear in the **same order** they're written in the HTML
4. Each element takes up space and **pushes** the next element down or to the right

Picture a document in a word processor. Headings and paragraphs stack top to bottom. Bold and italic text flows inline within those paragraphs. That's normal document flow.

```html
<header>I'm at the top</header>
<nav>I'm below the header</nav>
<main>I'm below the nav</main>
<footer>I'm at the very bottom</footer>
```

Without any CSS, these four elements stack vertically, each taking the full width of the page. That's the normal flow in action.

---

## The position Property

The `position` property lets you take elements out of the normal flow (or adjust them within it). It has five values, and each one changes the rules.

### position: static (The Default)

Every element starts with `position: static`. This means "follow normal document flow." The element goes where it naturally belongs.

```css
.box {
  position: static; /* This is the default; you don't need to write it */
}
```

When an element is `static`, the properties `top`, `right`, `bottom`, and `left` have **no effect**. The element just sits in the flow.

### position: relative

`position: relative` keeps the element **in the normal flow** (it still takes up its original space), but lets you **nudge** it from its normal position using `top`, `right`, `bottom`, and `left`.

```css
.nudged-box {
  position: relative;
  top: 20px;   /* Push it 20px DOWN from where it would normally be */
  left: 30px;  /* Push it 30px to the RIGHT from where it would normally be */
}
```

Think of it like a student in a classroom. Their assigned seat (their spot in the flow) is still reserved. Nobody else sits there. But the student scoots their chair 20 pixels down and 30 pixels to the right. The gap where they were supposed to be? Still there.

Important detail: `top: 20px` means "push it 20px **away from the top** of its normal position," which means it moves **down**. It's the direction you're pushing *from*, not the direction it moves *to*.

```html
<div class="box">Box 1</div>
<div class="box nudged">Box 2 (nudged)</div>
<div class="box">Box 3</div>
```

```css
.box {
  width: 200px;
  height: 80px;
  background-color: #AE8156;
  margin-bottom: 10px;
  color: white;
  padding: 10px;
}

.nudged {
  position: relative;
  top: 15px;
  left: 40px;
  background-color: #7D4E21;
}
```

Box 2 appears shifted down and to the right, but Box 3 stays where it would normally be, because Box 2 still reserves its original space in the flow.

### position: absolute

This is where things get interesting. `position: absolute` **removes** the element from the normal document flow entirely. Other elements act as if it doesn't exist. The element is then positioned relative to its **nearest positioned ancestor**, the closest parent element that has a `position` value other than `static`.

If no ancestor is positioned, the element positions itself relative to the entire page (the `<html>` element).

```css
.parent {
  position: relative;  /* This makes it the reference point for absolute children */
  width: 400px;
  height: 300px;
  background-color: #f0e6dc;
}

.child {
  position: absolute;
  top: 10px;     /* 10px from the TOP of .parent */
  right: 10px;   /* 10px from the RIGHT edge of .parent */
  width: 100px;
  height: 50px;
  background-color: #7D4E21;
  color: white;
}
```

```html
<div class="parent">
  <p>This paragraph flows normally inside the parent.</p>
  <div class="child">I'm absolutely positioned!</div>
</div>
```

The `.child` is pulled out of the flow and pinned to the top-right corner of `.parent`. The paragraph doesn't know the child exists. It doesn't leave space for it.

**The most common pattern**: set the parent to `position: relative` (which doesn't move it at all if you don't add `top`/`left`/etc.) and the child to `position: absolute`. This is the go-to technique for overlays, badges, close buttons, and anything that needs to sit on top of another element.

```css
/* Badge on a product card */
.card {
  position: relative;  /* Reference point */
  width: 300px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card__badge {
  position: absolute;  /* Placed relative to .card */
  top: -10px;
  right: -10px;
  background-color: #e74c3c;
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;           /* We'll learn this next lesson! */
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
}
```

### position: fixed

`position: fixed` is like `absolute`, but instead of being positioned relative to a parent element, it's positioned relative to the **browser window** (the viewport). It **stays in place even when you scroll**.

```css
.fixed-nav {
  position: fixed;
  top: 0;          /* Stick to the very top of the window */
  left: 0;
  width: 100%;
  background-color: #2C170B;
  color: white;
  padding: 15px 20px;
  z-index: 1000;   /* Stay on top of everything (more on this below) */
}
```

Think of it like a sticky note on your computer monitor. You can scroll the document behind it all day. That sticky note isn't going anywhere.

Common uses: navigation bars that stay at the top, "back to top" buttons in the bottom corner, chat widgets, cookie consent banners.

**Watch out**: Fixed elements are removed from the normal flow, so the content behind them will slide underneath. You'll often need to add padding or margin to the `body` or the next element to prevent content from hiding behind a fixed nav:

```css
body {
  padding-top: 70px; /* Height of the fixed nav, so content isn't hidden behind it */
}
```

### position: sticky

`position: sticky` is the hybrid that combines `relative` and `fixed`. The element scrolls normally with the page (like `relative`) until it reaches a **threshold** you set with `top`, `right`, `bottom`, or `left`. At that point, it "sticks" in place (like `fixed`).

```css
.sticky-header {
  position: sticky;
  top: 0;   /* Stick when the element reaches the top of the viewport */
  background-color: #2C170B;
  color: white;
  padding: 15px 20px;
}
```

Picture a table of contents in a long document. As you scroll, the section header scrolls normally. But once it reaches the top of the screen, it sticks there so you always know what section you're in. When the next section header scrolls up, it pushes the first one away and takes its place.

**Important**: `sticky` only works when you set at least one of `top`, `right`, `bottom`, or `left`. Also, the sticky element stays within its parent container. Once the parent scrolls out of view, the sticky element goes with it.

---

## z-index: Stacking Elements

When elements overlap (because of positioning), which one shows on top? That's what `z-index` controls.

Think of it like stacking papers on a desk. Each paper has a layer number. Paper with a higher number sits on top of papers with lower numbers.

```css
.box-a {
  position: absolute;
  top: 50px;
  left: 50px;
  z-index: 1;   /* Bottom layer */
  background-color: #AE8156;
}

.box-b {
  position: absolute;
  top: 70px;
  left: 70px;
  z-index: 2;   /* Middle layer, on top of box-a */
  background-color: #7D4E21;
}

.box-c {
  position: absolute;
  top: 90px;
  left: 90px;
  z-index: 3;   /* Top layer, on top of everything */
  background-color: #2C170B;
}
```

Key rules for `z-index`:

1. **It only works on positioned elements**, those with `position` set to `relative`, `absolute`, `fixed`, or `sticky`. It has no effect on `static` elements.
2. **Higher values stack on top** of lower values.
3. **Negative values** are allowed. They push elements *behind* other content.
4. Without `z-index`, overlapping positioned elements stack in **source order**. The one written later in the HTML appears on top.

A common convention is to use `z-index` values in increments of 10 or 100. This way, if you need to slip something in between later, you have room:

```css
/* Layering system */
.background-decoration { z-index: 10; }
.content-cards { z-index: 20; }
.dropdown-menu { z-index: 100; }
.modal-overlay { z-index: 500; }
.modal-dialog { z-index: 510; }
.toast-notification { z-index: 1000; }
```

---

## Common Positioning Patterns

Let's put it all together with patterns you'll use constantly.

### Fixed Navigation Bar

```css
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 60px;
  background-color: #2C170B;
  color: white;
  padding: 0 20px;
  z-index: 1000;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Push page content below the fixed nav */
body {
  margin-top: 60px;
}
```

### Overlay / Modal

```css
/* Dark backdrop covering the whole screen */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  z-index: 500;
}

/* The modal dialog itself, centered on screen */
.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%); /* Remember transforms from Module 05? */
  width: 500px;
  max-width: 90%;
  background-color: white;
  border-radius: 12px;
  padding: 30px;
  z-index: 510; /* Above the overlay */
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}
```

Notice how the modal uses `transform: translate(-50%, -50%)` from Module 05 to center itself perfectly. Setting `top: 50%` and `left: 50%` puts the top-left corner in the center of the screen. The `translate` then shifts it back by half its own width and height, putting the center of the modal at the center of the screen.

### Image with Overlay Text

```css
.image-container {
  position: relative;
  display: inline-block;
}

.image-container img {
  display: block;
  width: 100%;
  border-radius: 8px;
}

.image-container .overlay-text {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  color: white;
  padding: 20px;
  border-radius: 0 0 8px 8px;
}
```

```html
<div class="image-container">
  <img src="community-event.jpg" alt="WBB community meetup">
  <div class="overlay-text">
    <h3>Community Meetup</h3>
    <p>Join us every third Thursday</p>
  </div>
</div>
```

---

## When to Use Positioning vs Flexbox/Grid

Here's a simple decision guide:

- **Positioning** (`relative`, `absolute`, `fixed`, `sticky`): Use for placing **specific individual elements** in precise locations. Overlays, badges, fixed navbars, sticky headers, tooltips.
- **Flexbox** (next lesson): Use for **one-dimensional layouts**, arranging items in a row or a column. Navigation links, card rows, centering content.
- **Grid** (Lesson 04): Use for **two-dimensional layouts**, rows AND columns together. Full page layouts, image galleries, dashboards.

Positioning is like placing individual picture frames on a wall. You decide exactly where each one goes. Flexbox and Grid are like arranging furniture in a room. You define the system, and items flow into place.

You'll often **combine** all three. A page might use Grid for the overall layout, Flexbox for the navigation bar within the header, and `position: absolute` for a notification badge on a button.

---

## Key Takeaways

1. **Block elements** take full width and stack vertically. **Inline elements** flow side by side. **Inline-block** gives you the best of both: side by side with control over size and spacing.
2. `display: none` removes an element from the layout entirely. `visibility: hidden` makes it invisible but keeps its space reserved.
3. **Normal document flow** is the browser's default layout: block elements stack top to bottom, inline elements flow left to right.
4. `position: relative` nudges an element from its normal spot while keeping its space in the flow. It's also essential as a reference point for absolutely positioned children.
5. `position: absolute` pulls an element out of the flow and positions it relative to its nearest positioned ancestor. The parent-relative, child-absolute pattern is one of the most useful in CSS.
6. `position: fixed` locks an element to the viewport. It stays put when you scroll. `position: sticky` scrolls normally until it hits a threshold, then sticks.
7. `z-index` controls stacking order for positioned elements. Higher values sit on top. Use a layering system with gaps (10, 100, 500, 1000) to keep things manageable.

---

## Try It Yourself

Build a simple page layout that uses three positioning techniques:

1. Create a **fixed navigation bar** at the top of the page with a dark background and white text. Make sure your page content doesn't hide behind it.
2. Create a **card component** (300px wide, with some padding and a subtle box shadow). Inside the card, add an image and a "NEW" badge in the top-right corner using `position: absolute`.
3. Add a **"Back to Top" button** in the bottom-right corner of the viewport using `position: fixed`. Style it as a circle with a background color from the WBB brand palette.
4. Add enough content to the page so it scrolls. Test that your fixed nav stays at the top, the badge stays on the card, and the back-to-top button stays in the corner.
5. **Bonus**: Try adding a `position: sticky` section header that sticks to the top of the page (below the fixed nav) as you scroll through a long section.

Focus on getting comfortable with the parent-relative, child-absolute pattern. You'll use it constantly in real projects.

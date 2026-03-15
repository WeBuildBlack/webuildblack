---
title: "Responsive Navigation Patterns"
estimatedMinutes: 35
---

# Responsive Navigation Patterns

Navigation is the backbone of every website. It is how people find what they are looking for. And it is also one of the *hardest* things to make responsive.

Think about it: on a desktop, you might have a horizontal bar with eight or ten links stretched across the top of the page. Plenty of room. But on a phone? Those same ten links would either be so tiny they are impossible to tap, or they would overflow off the edge of the screen.

This is the responsive navigation challenge, and every website has to solve it. In this lesson, you are going to learn the most common patterns for handling navigation across all screen sizes -- including building a **CSS-only hamburger menu** step by step.

---

## The Challenge: Navigation on Every Screen

A typical desktop navigation looks like this:

```
┌──────────────────────────────────────────────────────────────────┐
│  Logo    Home    About    Programs    Courses    Contact    Donate │
└──────────────────────────────────────────────────────────────────┘
```

There is plenty of horizontal room for all those links. But on a phone:

```
┌────────────────┐
│  Logo  Home  Ab│ ← Cut off! Can't see all links
└────────────────┘
```

You have three options:
1. Let the links overflow and require horizontal scrolling (terrible)
2. Stack the links vertically, pushing your content way down (not great)
3. Collapse the navigation into a menu that users open when they need it (the standard solution)

Option 3 is what the **hamburger menu** does -- those three horizontal lines you see on almost every mobile website. When you tap them, the full navigation appears. When you are done, you close it and the navigation tucks away.

Let's build one.

---

## Pattern 1: CSS-Only Hamburger Menu

The most common mobile navigation pattern uses JavaScript to toggle a menu open and closed. But you can build a perfectly functional hamburger menu with **pure CSS** using a technique called the "checkbox hack." No JavaScript required.

Here is the concept: a hidden checkbox controls whether the menu is visible. When the checkbox is checked, the menu shows. When it is unchecked, the menu hides. A `<label>` styled to look like a hamburger icon acts as the click target.

Let's build it step by step.

### Step 1: The HTML Structure

```html
<header class="site-header">
  <div class="header-container">
    <a href="/" class="logo">MyWebsite</a>

    <!-- Hidden checkbox that controls the menu -->
    <input type="checkbox" id="nav-toggle" class="nav-toggle">

    <!-- Label styled as hamburger icon -->
    <label for="nav-toggle" class="nav-toggle-label" aria-label="Toggle navigation menu">
      <span></span>
      <span></span>
      <span></span>
    </label>

    <!-- The navigation menu -->
    <nav class="main-nav" aria-label="Main navigation">
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/about">About</a></li>
        <li><a href="/programs">Programs</a></li>
        <li><a href="/courses">Courses</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
    </nav>
  </div>
</header>
```

A few important things to notice:

- The `<input type="checkbox">` is connected to the `<label>` by the `for="nav-toggle"` attribute matching the checkbox's `id="nav-toggle"`. Clicking the label toggles the checkbox.
- The `<label>` contains three `<span>` elements -- these will become the three lines of the hamburger icon.
- The `aria-label="Toggle navigation menu"` on the label tells screen readers what this button does. Without it, a screen reader user would hear "checkbox" and have no idea what it is for.
- The `<nav>` element has `aria-label="Main navigation"` to identify it for assistive technology.

### Step 2: Hide the Checkbox and Style the Hamburger

```css
/* Hide the checkbox visually but keep it accessible */
.nav-toggle {
  position: absolute;
  top: -9999px;
  left: -9999px;
}

/* Hamburger icon (the three lines) */
.nav-toggle-label {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  cursor: pointer;
  width: 30px;
  height: 30px;
  padding: 4px 0;
}

.nav-toggle-label span {
  display: block;
  width: 100%;
  height: 3px;
  background-color: white;
  border-radius: 2px;
  transition: transform 0.3s ease, opacity 0.3s ease;
}
```

The checkbox is pushed way off-screen. Users never see it or interact with it directly. The `<label>` is styled as a column of three short, horizontal bars -- the hamburger icon.

### Step 3: Style the Navigation Menu (Hidden by Default)

```css
/* Navigation menu: hidden on mobile by default */
.main-nav {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background-color: #2C170B;
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.4s ease;
}

.main-nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.main-nav li {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.main-nav a {
  display: block;
  padding: 1rem 1.5rem;
  color: white;
  text-decoration: none;
  font-size: 1.1rem;
}

.main-nav a:hover,
.main-nav a:focus {
  background-color: #7D4E21;
}
```

The menu is hidden using `max-height: 0` and `overflow: hidden`. We use `max-height` instead of `display: none` because you can animate `max-height` with a transition, creating a smooth slide-down effect. `display: none` cannot be animated.

### Step 4: Show the Menu When Checkbox Is Checked

Here is the key CSS that makes it all work:

```css
/* When the checkbox is checked, show the menu */
.nav-toggle:checked ~ .main-nav {
  max-height: 500px;  /* Large enough to show all links */
}
```

The `~` is the **general sibling combinator**. It selects any `.main-nav` element that is a sibling of `.nav-toggle` and comes after it in the HTML. When the checkbox is checked (via clicking the label), this rule kicks in and the menu slides open.

### Step 5: Animate the Hamburger to an X

A nice touch: when the menu is open, transform the hamburger icon into an X to indicate it can be closed:

```css
/* When menu is open, animate hamburger to X */
.nav-toggle:checked ~ .nav-toggle-label span:nth-child(1) {
  transform: translateY(8px) rotate(45deg);
}

.nav-toggle:checked ~ .nav-toggle-label span:nth-child(2) {
  opacity: 0;
}

.nav-toggle:checked ~ .nav-toggle-label span:nth-child(3) {
  transform: translateY(-8px) rotate(-45deg);
}
```

The top line rotates 45 degrees and moves down. The middle line fades out. The bottom line rotates -45 degrees and moves up. Together, they form an X. The `transition` on the spans (from Step 2) makes this animation smooth.

### Step 6: The Header Container

```css
.site-header {
  background-color: #2C170B;
  position: relative;  /* Needed for the absolute positioning of the nav */
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  width: 90%;
  max-width: 1200px;
  margin: 0 auto;
}

.logo {
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
  text-decoration: none;
}
```

### Step 7: Transform to Horizontal Nav on Desktop

Now the responsive part. On wider screens, we hide the hamburger and show the links horizontally:

```css
@media (min-width: 768px) {
  /* Hide the hamburger icon */
  .nav-toggle-label {
    display: none;
  }

  /* Show the nav as a horizontal bar */
  .main-nav {
    position: static;        /* Remove absolute positioning */
    max-height: none;        /* Always visible */
    overflow: visible;
    background-color: transparent;
  }

  .main-nav ul {
    display: flex;
    gap: 0.5rem;
  }

  .main-nav li {
    border-bottom: none;
  }

  .main-nav a {
    padding: 0.5rem 1rem;
    border-radius: 4px;
  }
}
```

At 768px and wider:
- The hamburger label disappears.
- The nav becomes a static element (no longer absolutely positioned over the page).
- `max-height: none` ensures the menu is always visible regardless of the checkbox state.
- The `<ul>` becomes a flex container, arranging links horizontally.

This is the full hamburger-to-horizontal-nav pattern. It is the most common responsive navigation implementation on the web, and you just built it with zero JavaScript.

---

## Accessibility: Making Your Nav Usable for Everyone

A responsive nav that only works for sighted mouse users is only half done. Here are the accessibility requirements:

### Touch Targets

On mobile, fingers are the pointing device, and fingers are much less precise than a mouse cursor. The **minimum touch target size is 44x44 pixels** (this comes from Apple's Human Interface Guidelines and WCAG 2.5.5). Links and buttons need enough padding to be easy to tap:

```css
.main-nav a {
  display: block;
  padding: 1rem 1.5rem;     /* Creates a generous tap target */
  min-height: 44px;         /* Ensures minimum touch target height */
}
```

A link with just text and no padding might only be 16px tall -- far too small for a finger to tap accurately.

### Keyboard Navigation

Users who navigate with a keyboard (Tab key to move between links, Enter to activate) need to be able to access all navigation links. The checkbox hack works with keyboard by default because `<label>` elements are clickable via keyboard when associated with a form input.

Test your nav by pressing Tab repeatedly. You should be able to:
1. Tab to the hamburger label (and it should have a visible focus indicator)
2. Press Enter or Space to toggle the menu
3. Tab through each link in the menu
4. Each link should have a visible focus ring

Add focus styles to make keyboard navigation visible:

```css
.nav-toggle-label:focus-within,
.main-nav a:focus {
  outline: 2px solid #AE8156;
  outline-offset: 2px;
}

/* Also handle focus on the checkbox itself (label clicks pass through) */
.nav-toggle:focus ~ .nav-toggle-label {
  outline: 2px solid #AE8156;
  outline-offset: 2px;
}
```

### ARIA Attributes

The `aria-label` attributes we added in Step 1 are essential. Without them, screen reader users would have no idea what the hamburger icon does. Here is a summary of the ARIA attributes used:

- `aria-label="Toggle navigation menu"` on the label -- describes the hamburger button's purpose
- `aria-label="Main navigation"` on the `<nav>` -- identifies the navigation landmark

For a more robust implementation, you could also add `aria-expanded` to indicate whether the menu is open or closed, but that requires JavaScript to toggle the attribute value.

---

## Pattern 2: Bottom Navigation Bar

You have seen this on every mobile app -- a row of icons pinned to the bottom of the screen. This pattern works well for websites with a small number of primary sections (usually 3-5).

```html
<nav class="bottom-nav" aria-label="Primary navigation">
  <a href="/" class="bottom-nav-item">
    <span class="nav-icon">&#x1F3E0;</span>
    <span class="nav-label">Home</span>
  </a>
  <a href="/courses" class="bottom-nav-item">
    <span class="nav-icon">&#x1F4DA;</span>
    <span class="nav-label">Courses</span>
  </a>
  <a href="/community" class="bottom-nav-item">
    <span class="nav-icon">&#x1F465;</span>
    <span class="nav-label">Community</span>
  </a>
  <a href="/profile" class="bottom-nav-item">
    <span class="nav-icon">&#x1F464;</span>
    <span class="nav-label">Profile</span>
  </a>
</nav>
```

```css
/* Bottom nav: only visible on mobile */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  background-color: #2C170B;
  padding: 0.5rem 0;
  border-top: 1px solid #7D4E21;
  z-index: 100;
}

.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: #AE8156;
  font-size: 0.75rem;
  padding: 0.5rem;
  min-width: 44px;     /* Touch target */
  min-height: 44px;
}

.nav-icon {
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
}

.bottom-nav-item:hover,
.bottom-nav-item:focus {
  color: white;
}

/* Important: add padding to the bottom of the page so content
   doesn't get hidden behind the fixed nav */
body {
  padding-bottom: 4rem;
}

/* Hide bottom nav on larger screens, use traditional top nav instead */
@media (min-width: 768px) {
  .bottom-nav {
    display: none;
  }

  body {
    padding-bottom: 0;
  }
}
```

The bottom nav is pinned to the bottom of the viewport with `position: fixed`. On tablet and desktop, it disappears and you would use a traditional top navigation bar instead.

**When to use bottom nav**: When you have 3-5 primary sections and want an app-like feel. It is great for mobile but does not translate well to desktop.

---

## Pattern 3: Priority+ Navigation

The Priority+ pattern shows as many navigation links as will fit, and collapses the rest into a "More" dropdown. This is commonly seen on news sites and social media platforms.

The concept:

```
Wide screen:   Home  About  Programs  Courses  Events  Contact  Donate
Medium screen: Home  About  Programs  Courses  [More ▼]
Narrow screen: Home  About  [More ▼]
```

A pure CSS version uses `overflow: hidden` and a fixed height to only show links that fit:

```css
.priority-nav {
  display: flex;
  overflow: hidden;
  height: 3rem;        /* Only one row of links */
}

.priority-nav a {
  white-space: nowrap;  /* Prevent links from wrapping */
  padding: 0.75rem 1rem;
  flex-shrink: 0;       /* Don't let links shrink */
}
```

A full Priority+ implementation usually requires a bit of JavaScript to measure which links fit and which should go into the dropdown. But the concept is important to understand: **show what fits, hide the rest.**

---

## Complete Responsive Nav Example

Let's put it all together into one complete, copy-paste-ready example that goes from a hamburger menu on mobile to a horizontal nav on desktop:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Responsive Navigation</title>
  <link rel="stylesheet" href="nav-styles.css">
</head>
<body>
  <header class="site-header">
    <div class="header-container">
      <a href="/" class="logo">WBB Recipes</a>

      <input type="checkbox" id="nav-toggle" class="nav-toggle">
      <label for="nav-toggle" class="nav-toggle-label" aria-label="Toggle navigation menu">
        <span></span>
        <span></span>
        <span></span>
      </label>

      <nav class="main-nav" aria-label="Main navigation">
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/recipes">Recipes</a></li>
          <li><a href="/about">About</a></li>
          <li><a href="/submit">Submit a Recipe</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <main class="container">
    <h1>Welcome to WBB Recipes</h1>
    <p>Explore recipes from our community. Resize this window to see the nav change!</p>
  </main>
</body>
</html>
```

```css
/* ============================
   RESET & BASE
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
}

.container {
  width: 90%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 0;
}

/* ============================
   HEADER & LOGO
   ============================ */

.site-header {
  background-color: #2C170B;
  position: relative;
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  width: 90%;
  max-width: 1200px;
  margin: 0 auto;
}

.logo {
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
  text-decoration: none;
}

/* ============================
   HAMBURGER ICON
   ============================ */

.nav-toggle {
  position: absolute;
  top: -9999px;
  left: -9999px;
}

.nav-toggle-label {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  cursor: pointer;
  width: 30px;
  height: 30px;
  z-index: 10;
}

.nav-toggle-label span {
  display: block;
  width: 100%;
  height: 3px;
  background-color: white;
  border-radius: 2px;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

/* Hamburger → X animation */
.nav-toggle:checked ~ .nav-toggle-label span:nth-child(1) {
  transform: translateY(8px) rotate(45deg);
}

.nav-toggle:checked ~ .nav-toggle-label span:nth-child(2) {
  opacity: 0;
}

.nav-toggle:checked ~ .nav-toggle-label span:nth-child(3) {
  transform: translateY(-8px) rotate(-45deg);
}

/* Focus ring on hamburger when using keyboard */
.nav-toggle:focus ~ .nav-toggle-label {
  outline: 2px solid #AE8156;
  outline-offset: 4px;
  border-radius: 2px;
}

/* ============================
   MOBILE NAV (default)
   ============================ */

.main-nav {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background-color: #2C170B;
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.4s ease;
  z-index: 5;
}

.nav-toggle:checked ~ .main-nav {
  max-height: 500px;
}

.main-nav ul {
  list-style: none;
}

.main-nav li {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.main-nav a {
  display: block;
  padding: 1rem 1.5rem;
  color: white;
  text-decoration: none;
  font-size: 1.1rem;
  min-height: 44px;
}

.main-nav a:hover,
.main-nav a:focus {
  background-color: #7D4E21;
  outline: none;
}

/* ============================
   DESKTOP NAV (768px+)
   ============================ */

@media (min-width: 768px) {
  .nav-toggle-label {
    display: none;
  }

  .main-nav {
    position: static;
    max-height: none;
    overflow: visible;
    background-color: transparent;
    transition: none;
  }

  .main-nav ul {
    display: flex;
    gap: 0.25rem;
  }

  .main-nav li {
    border-bottom: none;
  }

  .main-nav a {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 1rem;
  }
}

/* ============================
   REDUCED MOTION
   ============================ */

@media (prefers-reduced-motion: reduce) {
  .nav-toggle-label span {
    transition: none;
  }

  .main-nav {
    transition: none;
  }
}
```

Test this by opening it in your browser and toggling responsive mode. On narrow screens, you will see the hamburger icon. Click it and the menu slides down. On wider screens, the hamburger disappears and the links spread out horizontally.

---

## Screen Reader Testing

A quick way to test how your navigation sounds to screen reader users:

1. **On Mac**: Turn on VoiceOver with `Cmd + F5`. Navigate your page with the Tab key and listen.
2. **On Windows**: Download NVDA (free) and navigate your page.
3. **Quick check**: Does the screen reader announce "Toggle navigation menu" when you reach the hamburger? Can you open the menu and navigate through all links? Is the navigation landmark announced ("Main navigation")?

You do not need to become a screen reader expert, but spending five minutes testing your navigation with one will catch major accessibility issues.

---

## Key Takeaways

1. **Navigation is the hardest part of responsive design** because it must transition from a compact mobile format to a spacious desktop layout while staying accessible.
2. **The CSS-only hamburger menu** uses a hidden checkbox, a styled label (the hamburger icon), and the `:checked` pseudo-class with sibling selectors to toggle the menu open and closed -- no JavaScript needed.
3. **Touch targets must be at least 44x44 pixels.** Mobile users are tapping with fingertips, not clicking with a precise mouse cursor. Add generous padding to links and buttons.
4. **Accessibility is not optional.** Use `aria-label` on the hamburger toggle and `<nav>` element. Ensure keyboard users can Tab through all links. Add visible focus indicators.
5. **The hamburger-to-horizontal pattern** is the most common responsive nav: hamburger menu on mobile, horizontal link bar on desktop, switched with a media query at 768px.
6. **Bottom navigation bars** work well for app-like sites with 3-5 primary sections but are hidden on desktop in favor of traditional top navigation.
7. **Always test with keyboard navigation** (Tab through everything) and consider testing with a screen reader to catch accessibility issues.

---

## Try It Yourself

1. Build the complete CSS-only hamburger menu from this lesson. Test it on both mobile simulation and desktop width. Verify the hamburger transforms into an X when opened.

2. Tab through your navigation using only the keyboard. Can you open the menu, navigate to every link, and close it again without touching the mouse? If not, debug your accessibility.

3. Modify the hamburger menu to appear at a different breakpoint. Instead of 768px, try 1024px. Notice how the hamburger stays visible longer.

4. Add a `prefers-reduced-motion` query that removes the slide animation from the hamburger menu and the X transformation. The menu should still work -- it just should not animate.

5. Experiment with the bottom navigation pattern. Create a four-item bottom nav that appears on mobile and disappears on desktop. Make sure each item meets the 44x44px minimum touch target.

6. Take the recipe page from your previous module projects. What kind of navigation does it need? Start thinking about how you will make it responsive for this module's project.

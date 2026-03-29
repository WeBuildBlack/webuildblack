---
title: "Module Project: Photo Gallery"
estimatedMinutes: 90
---

# Module Project: Photo Gallery

Time to put everything together. In this project, you'll build a **responsive photo gallery page** that uses both CSS Grid and Flexbox, the two layout powerhouses you've learned throughout this module.

You'll create a full page layout with a navigation bar, a filter sidebar, a photo grid with featured images, and a footer. Every technique from this module (positioning, Flexbox, Grid, named areas, `auto-fit`, `span`, and more) comes into play.

---

## What You're Building

Your finished page will have:

- A **fixed navigation bar** at the top (Flexbox: logo left, links right)
- A **page layout** using CSS Grid with named areas (sidebar, gallery, footer)
- A **filter sidebar** with category buttons stacked vertically (Flexbox column)
- A **photo grid** where most photos are the same size, but some "featured" photos span 2 columns or 2 rows (CSS Grid with `auto-fit` + `minmax`)
- **Photo cards** with an image on top and a caption below (Flexbox column)
- **Hover effects** on photos: a scale transform and an overlay with text (using `position: absolute` from Lesson 01)
- **CSS variables** for consistent spacing and colors (from Module 05)

---

## Starter HTML

Create a file called `index.html` and paste this complete HTML structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WBB Community Gallery</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>

  <!-- Fixed Navigation Bar -->
  <nav class="navbar">
    <a href="/" class="navbar__logo">WBB Gallery</a>
    <ul class="navbar__links">
      <li><a href="#" class="navbar__link">Home</a></li>
      <li><a href="#" class="navbar__link">Events</a></li>
      <li><a href="#" class="navbar__link">Programs</a></li>
      <li><a href="#" class="navbar__link">About</a></li>
    </ul>
  </nav>

  <!-- Page Layout Container -->
  <div class="page">

    <!-- Filter Sidebar -->
    <aside class="sidebar">
      <h3 class="sidebar__title">Filter by Category</h3>
      <div class="sidebar__filters">
        <button class="filter-btn filter-btn--active">All Photos</button>
        <button class="filter-btn">Community Events</button>
        <button class="filter-btn">Workshops</button>
        <button class="filter-btn">Hackathons</button>
        <button class="filter-btn">Conferences</button>
        <button class="filter-btn">Meetups</button>
      </div>
    </aside>

    <!-- Photo Gallery Grid -->
    <main class="gallery">

      <!-- Featured Photo (spans 2 columns and 2 rows) -->
      <div class="photo-card photo-card--featured">
        <div class="photo-card__image-wrapper">
          <img src="https://picsum.photos/800/800?random=1" alt="Mavens I/O Conference keynote speaker on stage">
          <div class="photo-card__overlay">
            <span class="photo-card__overlay-text">Mavens I/O 2025</span>
          </div>
        </div>
        <div class="photo-card__info">
          <h4 class="photo-card__title">Mavens I/O Conference</h4>
          <p class="photo-card__meta">Conference &bull; March 2025</p>
        </div>
      </div>

      <!-- Regular Photos -->
      <div class="photo-card">
        <div class="photo-card__image-wrapper">
          <img src="https://picsum.photos/400/300?random=2" alt="Community members collaborating at a workshop">
          <div class="photo-card__overlay">
            <span class="photo-card__overlay-text">View Photo</span>
          </div>
        </div>
        <div class="photo-card__info">
          <h4 class="photo-card__title">CSS Workshop</h4>
          <p class="photo-card__meta">Workshop &bull; February 2025</p>
        </div>
      </div>

      <div class="photo-card">
        <div class="photo-card__image-wrapper">
          <img src="https://picsum.photos/400/300?random=3" alt="Hackathon team presenting their project">
          <div class="photo-card__overlay">
            <span class="photo-card__overlay-text">View Photo</span>
          </div>
        </div>
        <div class="photo-card__info">
          <h4 class="photo-card__title">Build Day Hackathon</h4>
          <p class="photo-card__meta">Hackathon &bull; January 2025</p>
        </div>
      </div>

      <div class="photo-card">
        <div class="photo-card__image-wrapper">
          <img src="https://picsum.photos/400/300?random=4" alt="Community meetup networking session">
          <div class="photo-card__overlay">
            <span class="photo-card__overlay-text">View Photo</span>
          </div>
        </div>
        <div class="photo-card__info">
          <h4 class="photo-card__title">Monthly Meetup</h4>
          <p class="photo-card__meta">Meetup &bull; December 2024</p>
        </div>
      </div>

      <!-- Wide Featured Photo (spans 2 columns) -->
      <div class="photo-card photo-card--wide">
        <div class="photo-card__image-wrapper">
          <img src="https://picsum.photos/800/400?random=5" alt="Fast Track cohort graduation ceremony">
          <div class="photo-card__overlay">
            <span class="photo-card__overlay-text">Fast Track Graduation</span>
          </div>
        </div>
        <div class="photo-card__info">
          <h4 class="photo-card__title">Fast Track Cohort 5 Graduation</h4>
          <p class="photo-card__meta">Community Event &bull; November 2024</p>
        </div>
      </div>

      <div class="photo-card">
        <div class="photo-card__image-wrapper">
          <img src="https://picsum.photos/400/300?random=6" alt="Youth coding workshop participants">
          <div class="photo-card__overlay">
            <span class="photo-card__overlay-text">View Photo</span>
          </div>
        </div>
        <div class="photo-card__info">
          <h4 class="photo-card__title">Crowns of Code Session</h4>
          <p class="photo-card__meta">Workshop &bull; October 2024</p>
        </div>
      </div>

      <div class="photo-card">
        <div class="photo-card__image-wrapper">
          <img src="https://picsum.photos/400/300?random=7" alt="Panel discussion at a community event">
          <div class="photo-card__overlay">
            <span class="photo-card__overlay-text">View Photo</span>
          </div>
        </div>
        <div class="photo-card__info">
          <h4 class="photo-card__title">Tech Panel Discussion</h4>
          <p class="photo-card__meta">Community Event &bull; September 2024</p>
        </div>
      </div>

      <div class="photo-card">
        <div class="photo-card__image-wrapper">
          <img src="https://picsum.photos/400/300?random=8" alt="Members working together on laptops">
          <div class="photo-card__overlay">
            <span class="photo-card__overlay-text">View Photo</span>
          </div>
        </div>
        <div class="photo-card__info">
          <h4 class="photo-card__title">Co-Working Session</h4>
          <p class="photo-card__meta">Meetup &bull; August 2024</p>
        </div>
      </div>

      <!-- Tall Featured Photo (spans 2 rows) -->
      <div class="photo-card photo-card--tall">
        <div class="photo-card__image-wrapper">
          <img src="https://picsum.photos/400/800?random=9" alt="Speaker at She Builds Black event">
          <div class="photo-card__overlay">
            <span class="photo-card__overlay-text">She Builds Black</span>
          </div>
        </div>
        <div class="photo-card__info">
          <h4 class="photo-card__title">She Builds Black Kickoff</h4>
          <p class="photo-card__meta">Community Event &bull; July 2024</p>
        </div>
      </div>

      <div class="photo-card">
        <div class="photo-card__image-wrapper">
          <img src="https://picsum.photos/400/300?random=10" alt="Mentorship pairing ceremony">
          <div class="photo-card__overlay">
            <span class="photo-card__overlay-text">View Photo</span>
          </div>
        </div>
        <div class="photo-card__info">
          <h4 class="photo-card__title">Mentor Match Day</h4>
          <p class="photo-card__meta">Community Event &bull; June 2024</p>
        </div>
      </div>

      <div class="photo-card">
        <div class="photo-card__image-wrapper">
          <img src="https://picsum.photos/400/300?random=11" alt="Group photo at a weekend workshop">
          <div class="photo-card__overlay">
            <span class="photo-card__overlay-text">View Photo</span>
          </div>
        </div>
        <div class="photo-card__info">
          <h4 class="photo-card__title">Weekend Intensive</h4>
          <p class="photo-card__meta">Workshop &bull; May 2024</p>
        </div>
      </div>

      <div class="photo-card">
        <div class="photo-card__image-wrapper">
          <img src="https://picsum.photos/400/300?random=12" alt="Demo day presentations">
          <div class="photo-card__overlay">
            <span class="photo-card__overlay-text">View Photo</span>
          </div>
        </div>
        <div class="photo-card__info">
          <h4 class="photo-card__title">Demo Day</h4>
          <p class="photo-card__meta">Hackathon &bull; April 2024</p>
        </div>
      </div>

    </main>

    <!-- Footer -->
    <footer class="footer">
      <p>&copy; 2026 We Build Black. Built with pride in Brooklyn, NY.</p>
    </footer>

  </div>

</body>
</html>
```

---

## Starter CSS

Create a file called `styles.css`. The foundation below gives you CSS variables, a reset, and section comments with `TODO` markers telling you exactly what to build. Your job is to replace every `TODO` with working CSS.

```css
/* ============================================
   CSS VARIABLES
   ============================================ */
:root {
  /* Colors */
  --color-dark-brown: #2C170B;
  --color-medium-brown: #7D4E21;
  --color-warm-brown: #AE8156;
  --color-cream: #f0e6dc;
  --color-dark-olive: #200E03;
  --color-white: #ffffff;
  --color-light-gray: #f5f5f5;
  --color-text: #333333;
  --color-text-light: #777777;

  /* Spacing */
  --space-xs: 8px;
  --space-sm: 12px;
  --space-md: 20px;
  --space-lg: 30px;
  --space-xl: 40px;

  /* Layout */
  --navbar-height: 64px;
  --sidebar-width: 220px;

  /* Borders & Shadows */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.1);
  --shadow-hover: 0 8px 24px rgba(0, 0, 0, 0.15);

  /* Transitions */
  --transition-fast: 0.2s ease;
  --transition-normal: 0.3s ease;
}

/* ============================================
   RESET & BASE STYLES
   ============================================ */
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: var(--color-text);
  background-color: var(--color-light-gray);
  line-height: 1.5;
}

img {
  max-width: 100%;
  display: block;
}

a {
  text-decoration: none;
  color: inherit;
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

button {
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
}

/* ============================================
   NAVIGATION BAR
   TODO: Make this a fixed navigation bar using position: fixed
   TODO: Use Flexbox to place the logo on the left and links on the right
   TODO: Vertically center all items with align-items
   TODO: Set a z-index so the navbar stays above all other content
   TODO: Use var(--navbar-height) for the height
   TODO: Dark brown background, white text
   TODO: Add hover effects to the links (background color change with transition)
   ============================================ */
.navbar {
  /* TODO: position, top, left, width, height */
  /* TODO: display flex, justify-content, align-items */
  /* TODO: background-color, color, padding, z-index */
}

.navbar__logo {
  /* TODO: font-size, font-weight, color */
}

.navbar__links {
  /* TODO: display flex, gap */
}

.navbar__link {
  /* TODO: color, padding, border-radius */
  /* TODO: transition for hover effect */
}

.navbar__link:hover {
  /* TODO: background-color change on hover */
}

/* ============================================
   PAGE LAYOUT
   TODO: Use CSS Grid with grid-template-areas
   TODO: Two columns: var(--sidebar-width) for sidebar, 1fr for gallery
   TODO: Define areas: "sidebar gallery" and "footer footer"
   TODO: Set min-height so footer stays at the bottom
   TODO: Add padding-top equal to var(--navbar-height) so content
         doesn't hide behind the fixed nav
   ============================================ */
.page {
  /* TODO: display grid */
  /* TODO: grid-template-columns */
  /* TODO: grid-template-rows: 1fr auto */
  /* TODO: grid-template-areas */
  /* TODO: min-height, padding-top */
}

/* ============================================
   FILTER SIDEBAR
   TODO: Assign to the "sidebar" grid area
   TODO: Add padding and a background color (cream or light gray)
   TODO: Use Flexbox column layout for the filter buttons
   TODO: Add gap between buttons
   TODO: Style the active button with a filled background
   TODO: Add hover effects with transitions
   ============================================ */
.sidebar {
  /* TODO: grid-area: sidebar */
  /* TODO: background-color, padding */
}

.sidebar__title {
  /* TODO: font-size, color, margin-bottom */
}

.sidebar__filters {
  /* TODO: display flex, flex-direction column, gap */
}

.filter-btn {
  /* TODO: padding, background (transparent or light), border */
  /* TODO: border-radius, color, text-align left */
  /* TODO: transition for hover */
}

.filter-btn:hover {
  /* TODO: background-color, color changes */
}

.filter-btn--active {
  /* TODO: filled background (medium-brown), white text, no border */
}

/* ============================================
   PHOTO GALLERY GRID
   TODO: Assign to the "gallery" grid area
   TODO: Use CSS Grid with repeat(auto-fit, minmax(250px, 1fr))
         for responsive columns
   TODO: Set grid-auto-rows for consistent row heights (around 280px)
   TODO: Add gap and padding
   ============================================ */
.gallery {
  /* TODO: grid-area: gallery */
  /* TODO: display grid, grid-template-columns with auto-fit */
  /* TODO: grid-auto-rows, gap, padding */
}

/* ============================================
   FEATURED PHOTO VARIATIONS
   TODO: .photo-card--featured spans 2 columns AND 2 rows
   TODO: .photo-card--wide spans 2 columns (1 row)
   TODO: .photo-card--tall spans 2 rows (1 column)
   ============================================ */
.photo-card--featured {
  /* TODO: grid-column: span 2; grid-row: span 2 */
}

.photo-card--wide {
  /* TODO: grid-column: span 2 */
}

.photo-card--tall {
  /* TODO: grid-row: span 2 */
}

/* ============================================
   PHOTO CARD
   TODO: Use Flexbox with flex-direction: column (image top, info bottom)
   TODO: Background white, border-radius, box-shadow, overflow hidden
   TODO: Add a hover effect: slight scale-up with transform
   TODO: Add transition for the transform and box-shadow
   ============================================ */
.photo-card {
  /* TODO: display flex, flex-direction column */
  /* TODO: background, border-radius, box-shadow, overflow */
  /* TODO: transition for transform and box-shadow */
}

.photo-card:hover {
  /* TODO: transform: scale(1.02 or 1.03) */
  /* TODO: box-shadow: var(--shadow-hover) */
}

/* ============================================
   PHOTO IMAGE & HOVER OVERLAY
   TODO: .photo-card__image-wrapper needs position: relative
         and overflow: hidden (for the overlay)
   TODO: It should take up all available space with flex: 1
   TODO: The image should fill the wrapper (width: 100%, height: 100%)
         with object-fit: cover
   TODO: The overlay uses position: absolute to cover the entire image
         (top: 0, left: 0, width: 100%, height: 100%)
   TODO: Overlay has a semi-transparent dark background
   TODO: Overlay starts hidden (opacity: 0) with a transition on opacity
   TODO: On card hover, overlay becomes visible (opacity: 1)
   TODO: Overlay text is centered using Flexbox (display flex,
         justify-content center, align-items center)
   ============================================ */
.photo-card__image-wrapper {
  /* TODO: position relative, overflow hidden, flex 1 */
}

.photo-card__image-wrapper img {
  /* TODO: width 100%, height 100%, object-fit cover */
}

.photo-card__overlay {
  /* TODO: position absolute covering the full wrapper */
  /* TODO: background rgba dark, opacity 0, transition */
  /* TODO: display flex, centering */
}

.photo-card:hover .photo-card__overlay {
  /* TODO: opacity 1 */
}

.photo-card__overlay-text {
  /* TODO: color white, font-weight bold, font-size, letter-spacing */
}

/* ============================================
   PHOTO CARD INFO
   TODO: Padding for the caption area below the image
   TODO: Style the title (font size, color, margin)
   TODO: Style the meta text (smaller, lighter color)
   ============================================ */
.photo-card__info {
  /* TODO: padding */
}

.photo-card__title {
  /* TODO: margin, font-size, color */
}

.photo-card__meta {
  /* TODO: margin, font-size, color (text-light) */
}

/* ============================================
   FOOTER
   TODO: Assign to the "footer" grid area
   TODO: Dark background, white text, centered, padding
   ============================================ */
.footer {
  /* TODO: grid-area footer */
  /* TODO: background-color, color, text-align, padding */
}

/* ============================================
   RESPONSIVE: MOBILE LAYOUT (max-width: 768px)
   TODO: Change the page to a single-column layout
   TODO: Update grid-template-areas so sidebar stacks above gallery
   TODO: Optionally make sidebar filters horizontal
         (flex-direction: row, flex-wrap: wrap)
   ============================================ */
@media (max-width: 768px) {
  .page {
    /* TODO: grid-template-columns: 1fr */
    /* TODO: grid-template-areas: "sidebar" "gallery" "footer" */
  }

  .sidebar__filters {
    /* TODO: flex-direction row, flex-wrap wrap for horizontal filters */
  }

  .filter-btn {
    /* TODO: Adjust sizing for horizontal layout if needed */
  }
}
```

---

## Requirements Checklist

Use this checklist to track your progress. Every item should be checked off before you consider the project complete.

### Layout (CSS Grid)
- [ ] Page uses `display: grid` with `grid-template-areas` for the overall structure
- [ ] Sidebar is `var(--sidebar-width)` wide, gallery takes the remaining space (`1fr`)
- [ ] Footer spans the full width (both columns)
- [ ] `min-height` on `.page` ensures the footer reaches the bottom of the viewport

### Navigation Bar (Flexbox + Positioning)
- [ ] Navbar uses `position: fixed` to stay at the top of the viewport
- [ ] Logo is on the left, links are on the right (`justify-content: space-between`)
- [ ] All items are vertically centered (`align-items: center`)
- [ ] Navbar has a `z-index` high enough to stay above all other content
- [ ] Page has `padding-top` equal to the navbar height so content is not hidden behind the nav
- [ ] Links have hover effects with a smooth transition

### Photo Grid (CSS Grid)
- [ ] Gallery uses `repeat(auto-fit, minmax(250px, 1fr))` for responsive columns
- [ ] `grid-auto-rows` sets a consistent row height
- [ ] `.photo-card--featured` spans 2 columns AND 2 rows
- [ ] `.photo-card--wide` spans 2 columns
- [ ] `.photo-card--tall` spans 2 rows
- [ ] `gap` provides consistent spacing between photos

### Filter Sidebar (Flexbox)
- [ ] Filter buttons are stacked vertically using `flex-direction: column`
- [ ] `gap` provides spacing between buttons
- [ ] The active filter button (`.filter-btn--active`) has a distinct filled style
- [ ] Buttons have hover effects with transitions

### Photo Cards (Flexbox + Positioning)
- [ ] Each card uses Flexbox with `flex-direction: column` (image on top, info below)
- [ ] Cards have `border-radius`, `background-color`, and `box-shadow`
- [ ] Cards have `overflow: hidden` so rounded corners clip the image
- [ ] Hover effect: card scales up slightly with `transform: scale()`
- [ ] Hover effect: overlay text fades in over the image
- [ ] `.photo-card__image-wrapper` has `position: relative` (anchor for the overlay)
- [ ] `.photo-card__overlay` uses `position: absolute` covering the full image area
- [ ] Overlay starts with `opacity: 0` and transitions to `opacity: 1` on hover
- [ ] Overlay text is centered with Flexbox
- [ ] Images use `object-fit: cover` for consistent sizing across different photo aspect ratios

### CSS Variables
- [ ] Colors reference CSS variables from `:root` (not hardcoded hex values)
- [ ] Spacing uses CSS variable values where appropriate
- [ ] Navbar height and sidebar width use their respective CSS variables

### Responsive (Mobile)
- [ ] At 768px and below, the page switches to a single-column grid layout
- [ ] The sidebar stacks above the gallery on mobile
- [ ] The photo grid still responds to width changes on mobile (fewer columns)

---

## Hints

Try to complete the project without these. If you get stuck on a specific section, check the relevant hint.

1. **Fixed navbar**: `position: fixed; top: 0; left: 0; width: 100%; height: var(--navbar-height); z-index: 1000;` and add `padding-top: var(--navbar-height)` to `.page`.

2. **Page Grid**: `grid-template-columns: var(--sidebar-width) 1fr;` with `grid-template-areas: "sidebar gallery" "footer footer";` and `grid-template-rows: 1fr auto;`.

3. **Gallery Grid**: `grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); grid-auto-rows: 280px;`

4. **Featured spanning**: `.photo-card--featured { grid-column: span 2; grid-row: span 2; }`, and the image inside needs `width: 100%; height: 100%; object-fit: cover;` to fill the larger cell.

5. **Image wrapper and overlay**: The wrapper needs `position: relative; overflow: hidden; flex: 1;`. The overlay needs `position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); opacity: 0; transition: opacity var(--transition-normal); display: flex; justify-content: center; align-items: center;`.

6. **Card hover**: On `.photo-card`, set `transition: transform var(--transition-normal), box-shadow var(--transition-normal);`. On `.photo-card:hover`, set `transform: scale(1.03); box-shadow: var(--shadow-hover);`.

---

## Stretch Goals

Finished the core project? Challenge yourself with these additions:

### 1. Lightbox Overlay
Build a full-screen lightbox that would display when a photo is clicked. Create the HTML and CSS for the lightbox in its "open" state (we haven't learned JavaScript yet, so just build the visual). Use `position: fixed` to cover the entire viewport, a semi-transparent dark background, the photo centered with Flexbox, and a close button positioned in the top-right corner with `position: absolute`. Add a caption below the photo.

### 2. CSS-Only Filter Focus States
Add `:focus-visible` styles to the filter buttons that match the active state. This makes the sidebar fully keyboard-navigable, an important accessibility feature. The `:focus-visible` pseudo-class only shows the focus ring for keyboard navigation, not mouse clicks, giving you the best of both worlds.

### 3. Masonry-Style Variation
Give different photo cards different `grid-row: span` values to create an asymmetric, Pinterest-like gallery. Some cards span 1 row, others span 2, creating a varied and dynamic visual rhythm. You'll need to adjust `grid-auto-rows` to a smaller base value (like 140px) so that spanning 2 rows creates a nicely proportioned photo.

### 4. Animated Card Entrance
Make cards appear to slide up into view when the page loads. Set each card to start with `opacity: 0; transform: translateY(30px);` and create a CSS `@keyframes` animation that brings them to `opacity: 1; transform: translateY(0);`. Use `animation-delay` on each card (e.g., `.photo-card:nth-child(2) { animation-delay: 0.1s; }`) to stagger the entrance so cards appear one after another.

---

## Submission Checklist

Before you consider this project complete, verify each item:

- [ ] Open `index.html` in your browser. The full page displays correctly
- [ ] The navbar stays fixed at the top when you scroll down
- [ ] The sidebar shows filter buttons stacked vertically on the left
- [ ] The photo grid shows approximately 3 columns on a desktop-width screen
- [ ] Featured photos (`.photo-card--featured`) are noticeably larger than regular photos
- [ ] The wide photo (`.photo-card--wide`) stretches across 2 columns
- [ ] The tall photo (`.photo-card--tall`) stretches across 2 rows
- [ ] Hovering over any photo shows the overlay text fading in
- [ ] Hovering over any photo card causes a subtle scale-up effect
- [ ] The footer sits at the bottom of the page
- [ ] Resize your browser to under 768px. The layout switches to a single column with the sidebar stacking above the gallery
- [ ] All colors and spacing reference CSS variables from `:root`
- [ ] Open DevTools and use the Grid inspector to verify your grid lines and named areas
- [ ] Your CSS has no remaining `TODO` comments. Every section is fully implemented

---
title: "Module Project: Responsive Recipe Page"
estimatedMinutes: 90
---

# Module Project: Responsive Recipe Page

It is time to bring everything from this module together. You are going to take the recipe page you have been building throughout this course -- the one you structured with HTML in Module 04 and styled with CSS in Module 05 -- and make it fully responsive.

When you are done, your recipe page will look great on a phone, a tablet, and a desktop monitor. The navigation will transform from a hamburger menu to a horizontal bar. The layout will shift from a single column to a multi-column design. Typography will scale fluidly. Images will adapt. This is the real deal.

---

## Getting Started

If you have your recipe page from earlier modules, use that. If you are starting fresh or want a clean foundation, use the complete starter code below.

### Fallback Starter HTML

Create a file called `recipe.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Jollof Rice Recipe | WBB Recipes</title>
    <link rel="stylesheet" href="recipe-styles.css">
</head>
<body>
    <!-- HEADER & NAVIGATION -->
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

    <!-- HERO IMAGE -->
    <div class="hero">
        <img
            src="https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=1200&h=600&fit=crop"
            alt="A vibrant pot of jollof rice garnished with fresh vegetables"
            class="hero-img"
            width="1200"
            height="600"
        >
    </div>

    <!-- MAIN CONTENT -->
    <main class="container">
        <div class="recipe-layout">
            <!-- Recipe Header -->
            <div class="recipe-header">
                <h1>Classic Jollof Rice</h1>
                <p class="recipe-tagline">
                    A beloved West African dish that brings people together. Rich,
                    flavorful, and perfect for feeding a crowd.
                </p>
                <div class="recipe-meta">
                    <span class="meta-item">Prep: 20 min</span>
                    <span class="meta-item">Cook: 45 min</span>
                    <span class="meta-item">Servings: 6</span>
                    <span class="meta-item">Difficulty: Intermediate</span>
                </div>
            </div>

            <!-- Ingredients Sidebar -->
            <aside class="ingredients">
                <h2>Ingredients</h2>
                <ul>
                    <li>2 cups long-grain rice</li>
                    <li>6 large tomatoes, blended</li>
                    <li>3 red bell peppers, blended</li>
                    <li>2 scotch bonnet peppers (adjust to taste)</li>
                    <li>1 large onion, diced</li>
                    <li>3 tablespoons tomato paste</li>
                    <li>1/3 cup vegetable oil</li>
                    <li>2 cups chicken or vegetable broth</li>
                    <li>2 teaspoons thyme</li>
                    <li>2 teaspoons curry powder</li>
                    <li>1 teaspoon garlic powder</li>
                    <li>1 teaspoon ginger powder</li>
                    <li>2 bay leaves</li>
                    <li>Salt to taste</li>
                    <li>1 tablespoon butter (optional)</li>
                </ul>
            </aside>

            <!-- Instructions -->
            <section class="instructions">
                <h2>Instructions</h2>
                <ol>
                    <li>
                        <strong>Prepare the base:</strong> Blend the tomatoes, red bell
                        peppers, and scotch bonnet peppers until smooth. Set aside.
                    </li>
                    <li>
                        <strong>Cook the sauce:</strong> Heat the vegetable oil in a large
                        pot over medium heat. Add the diced onion and cook until translucent,
                        about 3-4 minutes. Add the tomato paste and fry for 2 minutes,
                        stirring constantly.
                    </li>
                    <li>
                        <strong>Add the blend:</strong> Pour in the blended tomato-pepper
                        mixture. Cook on medium-high heat, stirring occasionally, until the
                        sauce reduces and the oil floats to the top, about 20-25 minutes.
                        This step is crucial for flavor.
                    </li>
                    <li>
                        <strong>Season it:</strong> Add thyme, curry powder, garlic powder,
                        ginger powder, bay leaves, and salt. Stir well and cook for another
                        2 minutes.
                    </li>
                    <li>
                        <strong>Add rice and broth:</strong> Rinse the rice thoroughly and
                        add it to the pot. Pour in the chicken or vegetable broth. Stir to
                        combine. The liquid should be about an inch above the rice.
                    </li>
                    <li>
                        <strong>Cook the rice:</strong> Bring to a boil, then reduce heat to
                        the lowest setting. Cover tightly with aluminum foil and the pot lid
                        to trap steam. Cook for 30-35 minutes without opening the lid.
                    </li>
                    <li>
                        <strong>Finish:</strong> Remove from heat. Add butter if using. Fluff
                        with a fork, remove bay leaves, and let rest for 5 minutes before
                        serving.
                    </li>
                </ol>
            </section>

            <!-- Chef's Notes -->
            <section class="notes">
                <h2>Chef's Notes</h2>
                <ul>
                    <li>The key to great jollof rice is patience with the sauce. Let it cook
                        down until the oil separates. Don't rush this step.</li>
                    <li>For a smoky flavor (party jollof style), let the bottom of the rice
                        slightly char in the last few minutes of cooking.</li>
                    <li>Adjust scotch bonnet peppers based on your heat tolerance. Start with
                        one if you prefer milder flavors.</li>
                    <li>This recipe works great with chicken, fish, or plantains on the side.</li>
                </ul>
            </section>
        </div>

        <!-- Feedback Form -->
        <section class="feedback-section">
            <h2>Rate This Recipe</h2>
            <form class="feedback-form" action="#" method="post">
                <div class="form-group">
                    <label for="name">Your Name</label>
                    <input type="text" id="name" name="name" placeholder="Enter your name" required>
                </div>
                <div class="form-group">
                    <label for="rating">Rating</label>
                    <select id="rating" name="rating" required>
                        <option value="">Select a rating</option>
                        <option value="5">5 - Outstanding</option>
                        <option value="4">4 - Great</option>
                        <option value="3">3 - Good</option>
                        <option value="2">2 - Fair</option>
                        <option value="1">1 - Needs Improvement</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="comment">Your Review</label>
                    <textarea id="comment" name="comment" rows="4" placeholder="Tell us what you thought..."></textarea>
                </div>
                <button type="submit" class="submit-btn">Submit Review</button>
            </form>
        </section>
    </main>

    <!-- FOOTER -->
    <footer class="site-footer">
        <div class="footer-container">
            <div class="footer-section">
                <h3>WBB Recipes</h3>
                <p>Sharing recipes from the community, for the community.</p>
            </div>
            <div class="footer-section">
                <h3>Quick Links</h3>
                <ul>
                    <li><a href="/">Home</a></li>
                    <li><a href="/recipes">Recipes</a></li>
                    <li><a href="/submit">Submit a Recipe</a></li>
                </ul>
            </div>
            <div class="footer-section">
                <h3>Connect</h3>
                <ul>
                    <li><a href="#">Instagram</a></li>
                    <li><a href="#">Twitter</a></li>
                    <li><a href="#">Slack Community</a></li>
                </ul>
            </div>
        </div>
        <p class="copyright">&copy; 2026 We Build Black. All rights reserved.</p>
    </footer>
</body>
</html>
```

### Fallback Starter CSS

Create a file called `recipe-styles.css`. This contains base styles that are intentionally NOT responsive -- that is your job. The TODO markers tell you exactly what to add:

```css
/* ============================================================
   RECIPE PAGE - STARTER STYLES
   Your job: Make this page responsive using mobile-first design.
   Look for TODO markers throughout this file.
   ============================================================ */

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
    background-color: #fff;
}

img {
    max-width: 100%;
    height: auto;
    display: block;
}

/* ============================
   TYPOGRAPHY
   TODO: Replace these fixed font sizes with clamp() for fluid typography.

   Suggested clamp() values:
   - h1: clamp(1.75rem, 4vw, 3rem)
   - h2: clamp(1.375rem, 3vw, 2rem)
   - h3: clamp(1.125rem, 2.5vw, 1.5rem)
   - body/p: clamp(1rem, 1.5vw, 1.125rem)
   ============================ */

h1 {
    font-size: 2rem;
    color: #2C170B;
    line-height: 1.2;
    margin-bottom: 0.5rem;
}

h2 {
    font-size: 1.5rem;
    color: #2C170B;
    margin-bottom: 1rem;
}

h3 {
    font-size: 1.25rem;
    color: #2C170B;
    margin-bottom: 0.5rem;
}

/* ============================
   CONTAINER
   ============================ */

.container {
    width: 90%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem 0;
}

/* ============================
   HEADER & NAVIGATION
   TODO: Build the responsive hamburger menu.

   Mobile (default):
   - Hide the nav links behind a hamburger menu
   - Hamburger icon visible (three lines)
   - Nav slides down when checkbox is checked

   Tablet/Desktop (768px+):
   - Hide the hamburger icon
   - Show nav links horizontally using Flexbox
   - Logo and nav side by side
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

/* TODO: Hide the checkbox off-screen */
.nav-toggle {
    /* position: absolute;
       top: -9999px;
       left: -9999px; */
}

/* TODO: Style the hamburger icon (three lines) using the label's three <span> elements.
   - Use display: flex; flex-direction: column; gap: 5px;
   - Each span: height: 3px, background: white, border-radius: 2px
   - Add transition for the X animation
*/
.nav-toggle-label {
    cursor: pointer;
}

.nav-toggle-label span {
    /* Your hamburger line styles here */
}

/* TODO: Animate hamburger to X when checked
   .nav-toggle:checked ~ .nav-toggle-label span:nth-child(1) { ... }
   .nav-toggle:checked ~ .nav-toggle-label span:nth-child(2) { ... }
   .nav-toggle:checked ~ .nav-toggle-label span:nth-child(3) { ... }
*/

/* TODO: Hide the nav by default on mobile
   - position: absolute; top: 100%; left: 0; width: 100%;
   - max-height: 0; overflow: hidden;
   - transition: max-height 0.4s ease;
   - background-color: #2C170B;
*/
.main-nav {
    /* Your mobile nav styles here */
}

/* TODO: Show the nav when checkbox is checked
   .nav-toggle:checked ~ .main-nav { max-height: 500px; }
*/

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
    min-height: 44px;
}

.main-nav a:hover,
.main-nav a:focus {
    background-color: #7D4E21;
}

/* ============================
   HERO IMAGE
   ============================ */

.hero {
    width: 100%;
}

.hero-img {
    width: 100%;
    height: auto;
    object-fit: cover;
}

/* TODO: On tablet (768px+), limit the hero height and crop with object-fit
   .hero-img { max-height: 400px; }
   On desktop (1024px+):
   .hero-img { max-height: 500px; }
*/

/* ============================
   RECIPE LAYOUT
   TODO: Make this a responsive grid layout.

   Mobile (default):
   - Single column, everything stacks vertically
   - Order: recipe-header, ingredients, instructions, notes

   Tablet (768px+):
   - Two columns: ingredients sidebar (300px) + main content (1fr)
   - recipe-header spans both columns
   - notes section spans both columns

   Desktop (1024px+):
   - Wider layout with more gap between columns
   ============================ */

.recipe-layout {
    /* TODO: Add grid layout styles */
    padding: 1rem 0;
}

.recipe-header {
    margin-bottom: 2rem;
}

.recipe-tagline {
    color: #555;
    margin-bottom: 1rem;
    max-width: 65ch;
}

.recipe-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.meta-item {
    background-color: #f9f5f0;
    padding: 0.375rem 0.75rem;
    border-radius: 4px;
    font-size: 0.875rem;
    color: #7D4E21;
    font-weight: 600;
}

/* ============================
   INGREDIENTS
   ============================ */

.ingredients {
    background-color: #f9f5f0;
    padding: 1.5rem;
    border-radius: 8px;
    border-left: 4px solid #7D4E21;
    margin-bottom: 2rem;
}

.ingredients ul {
    padding-left: 1.25rem;
}

.ingredients li {
    padding: 0.375rem 0;
    border-bottom: 1px solid rgba(125, 78, 33, 0.1);
}

.ingredients li:last-child {
    border-bottom: none;
}

/* ============================
   INSTRUCTIONS
   ============================ */

.instructions {
    margin-bottom: 2rem;
}

.instructions ol {
    padding-left: 1.5rem;
}

.instructions li {
    padding: 0.75rem 0;
    border-bottom: 1px solid #eee;
}

.instructions li:last-child {
    border-bottom: none;
}

/* ============================
   CHEF'S NOTES
   ============================ */

.notes {
    background-color: #2C170B;
    color: white;
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 2rem;
}

.notes h2 {
    color: #AE8156;
}

.notes ul {
    list-style: none;
    padding: 0;
}

.notes li {
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-left: 1.25rem;
    position: relative;
}

.notes li::before {
    content: "\2022";
    color: #AE8156;
    position: absolute;
    left: 0;
}

.notes li:last-child {
    border-bottom: none;
}

/* ============================
   FEEDBACK FORM
   TODO: Make the form responsive.

   Mobile (default):
   - Full-width form, stacked fields

   Tablet (768px+):
   - Name and Rating fields side by side (two columns)
   - Comment field spans full width

   Desktop (1024px+):
   - Constrain form max-width to 800px, center it
   ============================ */

.feedback-section {
    border-top: 2px solid #eee;
    padding-top: 2rem;
    margin-bottom: 2rem;
}

.feedback-form {
    /* TODO: Add responsive grid layout for form fields */
}

.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.375rem;
    font-weight: 600;
    color: #2C170B;
}

.form-group input,
.form-group select,
.form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;
    font-family: inherit;
    transition: border-color 0.2s ease;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    border-color: #7D4E21;
    outline: none;
}

.submit-btn {
    background-color: #7D4E21;
    color: white;
    border: none;
    padding: 0.875rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s ease;
    min-height: 44px;
}

.submit-btn:hover,
.submit-btn:focus {
    background-color: #2C170B;
}

/* ============================
   FOOTER
   TODO: Make the footer responsive.

   Mobile (default):
   - Single column, footer sections stacked
   - Center-aligned text

   Tablet (768px+):
   - Three columns using Flexbox or Grid
   - Left-aligned text

   Desktop (1024px+):
   - More spacing between columns
   ============================ */

.site-footer {
    background-color: #2C170B;
    color: white;
    padding: 2rem 0 1rem;
}

.footer-container {
    width: 90%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem;
    /* TODO: Add responsive column layout */
}

.footer-section {
    margin-bottom: 1.5rem;
}

.footer-section h3 {
    color: #AE8156;
    margin-bottom: 0.75rem;
}

.footer-section ul {
    list-style: none;
}

.footer-section li {
    margin-bottom: 0.375rem;
}

.footer-section a {
    color: #ccc;
    text-decoration: none;
}

.footer-section a:hover {
    color: white;
}

.copyright {
    text-align: center;
    padding-top: 1.5rem;
    margin-top: 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 0.875rem;
    color: #999;
    width: 90%;
    max-width: 1200px;
    margin-left: auto;
    margin-right: auto;
}


/* ============================================================
   RESPONSIVE STYLES
   TODO: Add your media queries below.

   Use the mobile-first approach (min-width queries).

   Recommended breakpoints:
   - 768px (tablet)
   - 1024px (desktop)

   Things to make responsive at each breakpoint:

   TABLET (768px+):
   - Navigation: hide hamburger, show horizontal links
   - Recipe layout: two-column grid (ingredients sidebar + instructions)
   - Hero image: constrain height
   - Form: name and rating side by side
   - Footer: three columns

   DESKTOP (1024px+):
   - Wider gaps in recipe grid
   - Larger typography (handled by clamp if you did that TODO)
   - Hero image: taller max-height
   - Form: constrain max-width and center
   - More generous padding overall
   ============================================================ */

/* --- TABLET BREAKPOINT (768px+) --- */
/* TODO: Add your tablet media query here */
/*
@media (min-width: 768px) {

}
*/

/* --- DESKTOP BREAKPOINT (1024px+) --- */
/* TODO: Add your desktop media query here */
/*
@media (min-width: 1024px) {

}
*/


/* ============================================================
   STRETCH GOALS
   These are optional challenges if you finish early.
   ============================================================ */

/* STRETCH GOAL 1: Dark Mode
   TODO: Add a prefers-color-scheme: dark media query.
   - Dark background for body (#1a1a1a)
   - Light text (#e0e0e0)
   - Adjust card, ingredients, and form backgrounds
   - Make sure links and accents are still visible
*/
/*
@media (prefers-color-scheme: dark) {

}
*/

/* STRETCH GOAL 2: Print Stylesheet
   TODO: Add a print media query.
   - Hide: header, footer, form, hero image
   - Show: recipe content only (ingredients, instructions, notes)
   - Use black text on white background
   - Remove background colors and border-radius
*/
/*
@media print {

}
*/

/* STRETCH GOAL 3: Reduced Motion
   TODO: Respect users who prefer reduced motion.
   - Remove all transitions
   - Remove any animations
*/
/*
@media (prefers-reduced-motion: reduce) {

}
*/
```

---

## Your Tasks

Work through these tasks in order. Each one builds on the previous one. Test in the browser's responsive mode after each task.

### Task 1: Fluid Typography

Replace the fixed font sizes in the Typography section with `clamp()` values. This single change will make your text scale smoothly across all screen sizes without any media queries.

**What to change:**
- `h1` font-size: `clamp(1.75rem, 4vw, 3rem)`
- `h2` font-size: `clamp(1.375rem, 3vw, 2rem)`
- `h3` font-size: `clamp(1.125rem, 2.5vw, 1.5rem)`
- Add to `body`: `font-size: clamp(1rem, 1.5vw, 1.125rem)`

**Test it:** Open responsive mode, drag the viewport from narrow to wide. Headings should scale smoothly with no jumps.

---

### Task 2: Responsive Navigation

Build the hamburger menu for mobile that transforms into a horizontal nav on tablet/desktop. Follow the TODO markers in the Navigation section.

**Mobile (default):**
- Hide the checkbox off-screen
- Style the three `<span>` elements inside the label as hamburger lines
- Hide `.main-nav` with `max-height: 0; overflow: hidden`
- Show it when checked: `.nav-toggle:checked ~ .main-nav { max-height: 500px; }`
- Animate hamburger to X using `:checked` and `:nth-child` selectors

**Tablet and Desktop (768px+):**
- Hide `.nav-toggle-label` with `display: none`
- Set `.main-nav` to `position: static; max-height: none; overflow: visible`
- Make `.main-nav ul` a flex row with `display: flex; gap: 0.5rem`

**Test it:** On mobile width, the hamburger should open and close the menu. On tablet width and above, the full nav should display horizontally.

---

### Task 3: Responsive Recipe Layout

This is the big one. Make the recipe content area use CSS Grid to rearrange at different breakpoints.

**Mobile (default):**
- Everything stacks in a single column (this is already the default behavior)

**Tablet (768px+):**
```css
.recipe-layout {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 2rem;
}

.recipe-header {
    grid-column: 1 / -1;  /* Spans both columns */
}

.notes {
    grid-column: 1 / -1;  /* Spans both columns */
}
```

This puts the ingredients in a sidebar on the left, with instructions on the right. The recipe header and chef's notes span the full width.

**Desktop (1024px+):**
```css
.recipe-layout {
    gap: 3rem;
}
```

**Test it:** On mobile, everything should stack. On tablet, ingredients should sit beside the instructions. On desktop, there should be more breathing room.

---

### Task 4: Responsive Hero Image

Constrain the hero image height on larger screens so it does not dominate the page:

**Tablet (768px+):**
```css
.hero-img {
    max-height: 400px;
    object-fit: cover;  /* Crop the image to fit instead of squishing it */
}
```

**Desktop (1024px+):**
```css
.hero-img {
    max-height: 500px;
}
```

---

### Task 5: Responsive Form

Make the feedback form use a two-column layout on larger screens.

**Tablet (768px+):**
```css
.feedback-form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

/* Comment field and submit button span full width */
.form-group:nth-child(3) {
    grid-column: 1 / -1;
}

.submit-btn {
    grid-column: 1 / -1;
}
```

**Desktop (1024px+):**
```css
.feedback-form {
    max-width: 800px;
}
```

---

### Task 6: Responsive Footer

Turn the footer into a multi-column layout.

**Mobile (default):** Already stacks. Optionally add `text-align: center`.

**Tablet (768px+):**
```css
.footer-container {
    display: flex;
    justify-content: space-between;
    gap: 2rem;
}

.footer-section {
    flex: 1;
    margin-bottom: 0;
}
```

**Desktop (1024px+):**
```css
.footer-container {
    gap: 3rem;
}
```

---

### Task 7: Responsive Spacing

Add responsive spacing using `clamp()` to key elements:

```css
.container {
    padding: clamp(1rem, 3vw, 2rem) 0;
}

.recipe-header {
    margin-bottom: clamp(1.5rem, 4vw, 3rem);
}

.feedback-section {
    padding-top: clamp(1.5rem, 4vw, 3rem);
}
```

---

## Stretch Goals

If you finish all the tasks above, try these optional challenges:

### Stretch Goal 1: Dark Mode

Add a `prefers-color-scheme: dark` media query that changes the page's color scheme to match the user's system preference. Consider:

- Body background: `#1a1a1a`, text color: `#e0e0e0`
- Ingredients card: `#2d2d2d` background
- Form inputs: dark background with light text and subtle borders
- Make sure the WBB brown accent colors (`#AE8156`, `#7D4E21`) still pop against dark backgrounds

### Stretch Goal 2: Print Stylesheet

Add a `@media print` query that creates a clean, printer-friendly version:

- Hide the header, footer, hero image, and feedback form
- Remove all background colors, border-radius, and decorative styles
- Use black text on a white background
- Show only the recipe content: title, ingredients, instructions, and notes
- Add the URL after links: `a[href]::after { content: " (" attr(href) ")"; }`

### Stretch Goal 3: Reduced Motion

Add a `prefers-reduced-motion: reduce` query that removes all transitions and animations:

```css
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        transition: none !important;
        animation: none !important;
    }
}
```

---

## Testing Checklist

Before you consider this project complete, test the following:

**At mobile width (375px):**
- [ ] Single-column layout, everything stacks vertically
- [ ] Hamburger menu visible, opens and closes on click
- [ ] All text is readable without zooming
- [ ] Images do not overflow the screen
- [ ] Form fields are full width and easy to tap
- [ ] No horizontal scrollbar

**At tablet width (768px):**
- [ ] Navigation switches to horizontal links
- [ ] Ingredients sidebar appears next to instructions
- [ ] Form name and rating fields are side by side
- [ ] Footer shows three columns
- [ ] Hero image is height-constrained

**At desktop width (1200px+):**
- [ ] Layout is centered with max-width container
- [ ] Generous spacing between elements
- [ ] Text line length is comfortable (not too wide)
- [ ] Everything looks polished and well-spaced

**Accessibility:**
- [ ] Can Tab through all navigation links with keyboard
- [ ] Hamburger menu can be toggled with keyboard (Enter/Space)
- [ ] Focus indicators are visible on all interactive elements
- [ ] Touch targets are at least 44x44px on mobile

**Bonus testing:**
- [ ] Slowly drag the viewport from 320px to 1440px -- no awkward widths where the layout breaks
- [ ] If you did Stretch Goal 1, toggle your system dark mode on/off and verify the page adapts
- [ ] If you did Stretch Goal 3, enable "Reduce motion" in system settings and verify transitions are gone

---

## Submission

You are done when your recipe page passes the testing checklist. Save your files, open them in the browser at various widths, and verify everything works.

Congratulations -- you have just built a fully responsive web page from scratch. The next time you visit any website on your phone and notice how smoothly it adapts, you will know exactly how it works. Because now you can build it yourself.

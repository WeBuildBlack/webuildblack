---
title: "Module Project: Personal Portfolio Site"
estimatedMinutes: 300
---

# Module Project: Personal Portfolio Site

This is it. The capstone project. Everything you have learned across ten modules comes together here.

You are going to build a complete, responsive, interactive personal portfolio website from scratch and deploy it to the internet. This is not a guided walkthrough. This is you, your skills, and a blank editor. The lessons in this module gave you examples, patterns, and guidance. Now you take what you need and make it your own.

When you are done, you will have a live website that showcases your work, demonstrates your technical skills, and tells your story. This project is your proof. Proof that you can plan, build, and ship a real website.

Let's go.

---

## Project Requirements

Your portfolio must include **all seven sections** listed below, meet the **technical requirements**, and be **deployed to a live URL**.

### Required Sections

#### 1. Navigation
- Responsive navigation bar: horizontal links on desktop, hamburger menu on mobile
- Smooth scrolling to each section when navigation links are clicked
- Navigation links should highlight to indicate the current section as the user scrolls

#### 2. Hero Section
- Your full name, displayed prominently
- A professional title (e.g., "Front-End Developer," "Software Engineer")
- A brief tagline or one-sentence description (who you are or what you do)
- A call-to-action button that scrolls to your projects section

#### 3. About Section
- A personal bio of two to three paragraphs
- A professional photo or a styled placeholder image
- Key facts or highlights about you (these can be inline or styled as a sidebar/list)

#### 4. Projects Section
- At least **three project cards** showcasing your work
- Each card must include:
  - A screenshot or preview image
  - The project title
  - A two-to-three sentence description
  - Technologies used (displayed as tags)
  - A link to the GitHub repository
  - A link to the live site (if available)
- You can use projects you built in this course. The responsive layout from Module 07, the interactive features from Module 09, or any practice project you are proud of

#### 5. Skills Section
- Technical skills organized by category (e.g., Languages, Tools, Concepts)
- Displayed visually (as tags, a grid, or categorized lists
- Do not use percentage-based progress bars. List the skills you actually have

#### 6. Contact Section
- A contact form with three fields: Name, Email, and Message
- All three fields are required
- JavaScript validation that shows clear error messages for empty fields and invalid email format
- A success state that appears after valid submission
- Links to your professional social media profiles (GitHub, LinkedIn, etc.)

#### 7. Footer
- Copyright notice with a dynamically generated year (using JavaScript)
- Links to your social profiles
- A "Back to Top" link

---

### Technical Requirements

These requirements map directly to the skills you have built across the course. Each one is labeled with the module where you learned it.

#### HTML (Module 04)
- Use semantic HTML elements throughout: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`
- Proper heading hierarchy: one `<h1>`, `<h2>` for section titles, `<h3>` for subsections. No skipped levels
- All images have descriptive `alt` attributes
- All form inputs have associated `<label>` elements with matching `for` and `id` attributes
- External links use `target="_blank"` with `rel="noopener noreferrer"`

#### CSS (Module 05)
- All styles in an external CSS stylesheet. No inline styles
- CSS custom properties (variables) for colors, fonts, and spacing
- A CSS reset (at minimum: `box-sizing: border-box`, margin/padding reset)
- Consistent typography using web fonts (e.g., Google Fonts) with system font fallbacks
- At least **five** CSS transitions or animations (e.g., hover effects on buttons, cards, links, navigation highlights, menu transitions)
- Clear visual hierarchy using font sizes, weights, colors, and spacing

#### CSS Layout (Module 06)
- CSS Grid used for at least one layout (project cards grid or skills grid)
- Flexbox used for at least one layout (navigation, footer, or card content)
- Both Grid and Flexbox must be present in the project

#### Responsive Design (Module 07)
- Mobile-first approach: base styles are for small screens, media queries add styles for larger screens
- At least **three breakpoints** (e.g., base mobile, 768px tablet, 1024px desktop)
- Responsive images that do not overflow their containers
- Fluid typography using `clamp()` for at least headings
- The site looks good and functions correctly at every width from 320px to 1920px

#### JavaScript (Modules 08, 09)
- Mobile hamburger menu toggle that opens and closes the navigation
- Contact form validation with meaningful error messages
- Smooth scrolling for navigation links (CSS `scroll-behavior` counts, but bonus for JS implementation)
- Dark mode toggle that switches the site between light and dark color schemes
- `localStorage` used to persist the dark mode preference across page loads
- Dynamic copyright year in the footer
- At least **one additional interactive feature** of your choice (see stretch goals for ideas)

#### Git & GitHub (Module 03)
- A Git repository with at least **ten meaningful commits**
- Commit messages follow conventional commit format (e.g., `feat:`, `fix:`, `docs:`, `style:`)
- A `README.md` that describes the project, lists technologies used, and includes a screenshot or link to the live site

#### Accessibility
- Keyboard navigable: all interactive elements reachable via Tab key
- Visible focus styles on all focusable elements
- `aria-label` on icon-only links and buttons
- `aria-expanded` on the hamburger menu toggle
- `aria-live="polite"` on form error messages
- Color contrast ratio of at least 4.5:1 for body text

#### Deployment (Module 10)
- Deployed to a live URL using GitHub Pages, Netlify, or Vercel
- All features work on the live site (not just locally)
- Site tested on at least one real mobile device

---

## Starter Template

Create your project folder and files. Below is the minimal starter code. The structure and setup are provided, but you build everything else.

### File Structure

```
portfolio/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── main.js
├── images/
│   └── (add your images here)
├── .gitignore
└── README.md
```

### index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Name | Portfolio</title>
    <meta name="description" content="Portfolio of Your Name - web developer.">

    <!-- TODO: Add your Google Fonts link here -->

    <link rel="stylesheet" href="css/styles.css">
</head>
<body>

    <!-- TODO: Build the site header with navigation -->
    <header class="site-header">
        <!-- Navigation: logo, hamburger toggle, nav links -->
    </header>

    <main>
        <!-- TODO: Hero section -->
        <section class="hero" id="hero">
            <!-- Name, title, tagline, CTA button -->
        </section>

        <!-- TODO: About section -->
        <section class="about" id="about">
            <!-- Section title, photo, bio paragraphs -->
        </section>

        <!-- TODO: Projects section -->
        <section class="projects" id="projects">
            <!-- Section title, project cards grid (at least 3 cards) -->
            <!-- Each card: image, title, description, tech tags, links -->
        </section>

        <!-- TODO: Skills section -->
        <section class="skills" id="skills">
            <!-- Section title, skills organized by category -->
        </section>

        <!-- TODO: Contact section -->
        <section class="contact" id="contact">
            <!-- Section title, intro text, contact form -->
            <!-- Form fields: name, email, message (all required) -->
            <!-- Error spans with aria-live="polite" -->
        </section>
    </main>

    <!-- TODO: Footer -->
    <footer class="footer">
        <!-- Copyright with dynamic year, social links, back to top -->
    </footer>

    <!-- TODO: Dark mode toggle button -->

    <script src="js/main.js"></script>
</body>
</html>
```

### css/styles.css

```css
/* ========================================
   CSS Custom Properties (Design Tokens)
   ======================================== */

:root {
    /* TODO: Define your color palette */
    --color-primary: ;
    --color-primary-dark: ;
    --color-bg: ;
    --color-bg-alt: ;
    --color-text: ;
    --color-text-light: ;
    --color-border: ;

    /* TODO: Define dark mode colors */
    --color-bg-dark: ;
    --color-text-dark: ;

    /* TODO: Define your fonts */
    --font-heading: ;
    --font-body: ;

    /* TODO: Define spacing scale */
    --space-sm: ;
    --space-md: ;
    --space-lg: ;

    /* TODO: Define transition speeds */
    --transition-fast: ;
    --transition-base: ;

    /* Layout */
    --max-width: 1100px;
    --nav-height: 70px;
}


/* ========================================
   CSS Reset
   ======================================== */

*,
*::before,
*::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html {
    scroll-behavior: smooth;
    scroll-padding-top: var(--nav-height);
}

body {
    font-family: var(--font-body);
    line-height: 1.6;
    color: var(--color-text);
    background-color: var(--color-bg);
}

img {
    max-width: 100%;
    height: auto;
    display: block;
}

a {
    text-decoration: none;
}

ul {
    list-style: none;
}


/* ========================================
   Dark Mode
   ======================================== */

/* TODO: Override CSS variables when body has .dark-mode class */


/* ========================================
   Navigation
   ======================================== */

/* TODO: Fixed header, flex nav, hamburger styles, nav list (hidden on mobile) */


/* ========================================
   Hero Section
   ======================================== */

/* TODO: Full-height hero, centered content, CTA button */


/* ========================================
   About Section
   ======================================== */

/* TODO: Image + text layout, circular profile photo */


/* ========================================
   Projects Section
   ======================================== */

/* TODO: CSS Grid for project cards, card styles, hover effects */


/* ========================================
   Skills Section
   ======================================== */

/* TODO: Grid or flex layout for skill categories, tag/chip styles */


/* ========================================
   Contact Section
   ======================================== */

/* TODO: Form styles, input focus states, error styles, submit button */


/* ========================================
   Footer
   ======================================== */

/* TODO: Footer layout, social links, back-to-top link */


/* ========================================
   Dark Mode Toggle Button
   ======================================== */

/* TODO: Fixed position button, bottom-right corner */


/* ========================================
   Responsive Design - Tablet (768px+)
   ======================================== */

@media (min-width: 768px) {
    /* TODO: Hide hamburger, show horizontal nav */
    /* TODO: Side-by-side about layout */
    /* TODO: 2-column project grid */
}


/* ========================================
   Responsive Design - Desktop (1024px+)
   ======================================== */

@media (min-width: 1024px) {
    /* TODO: 3-column project grid */
    /* TODO: Wider spacing and layout adjustments */
}
```

### js/main.js

```javascript
// ========================================
// Portfolio JavaScript
// ========================================

// --- Dynamic Copyright Year ---
// TODO: Find the year span in the footer and set its text to the current year

// --- Mobile Navigation Toggle ---
// TODO: Select the hamburger button and nav list
// TODO: Toggle the nav list visibility on button click
// TODO: Update aria-expanded attribute for accessibility
// TODO: Close the menu when a nav link is clicked

// --- Contact Form Validation ---
// TODO: Select the form and add a submit event listener
// TODO: Validate name (not empty)
// TODO: Validate email (not empty and valid format)
// TODO: Validate message (not empty)
// TODO: Show error messages next to invalid fields
// TODO: Clear errors when the user starts typing
// TODO: Show a success message when the form is valid

// --- Active Navigation Highlighting ---
// TODO: Listen for scroll events
// TODO: Determine which section is currently in view
// TODO: Add an "active" class to the corresponding nav link

// --- Dark Mode Toggle ---
// TODO: Check localStorage for a saved theme preference
// TODO: If no saved preference, check the user's system preference
// TODO: Apply the correct theme on page load
// TODO: Toggle the theme when the button is clicked
// TODO: Save the preference to localStorage
// TODO: Update the button icon/label to reflect the current mode
```

### .gitignore

```
.DS_Store
*.log
node_modules/
.env
Thumbs.db
```

### README.md

```markdown
# Portfolio - Your Name

Personal portfolio website built with HTML, CSS, and JavaScript.

## About

<!-- TODO: Write 2-3 sentences about your portfolio and what it showcases -->

## Built With

- HTML5: semantic elements, accessible markup
- CSS3: custom properties, Grid, Flexbox, responsive design, transitions
- JavaScript: DOM manipulation, form validation, localStorage, event handling
- Git & GitHub: version control, conventional commits

## Features

- Responsive design (mobile, tablet, desktop)
- Dark mode with saved preference
- Accessible navigation and form
- Contact form with client-side validation
- Smooth scrolling navigation

## Live Site

<!-- TODO: Add your deployed URL here -->

## Screenshot

<!-- TODO: Add a screenshot of your portfolio -->

## Author

<!-- TODO: Your name and links to your GitHub, LinkedIn, etc. -->
```

---

## Self-Assessment Checklist

Use this checklist to evaluate your work before submitting. This is organized by module so you can see exactly how each skill contributes to the final product.

### Terminal & Git (Modules 01, 03)

- [ ] Project created using terminal commands (`mkdir`, `touch`, etc.)
- [ ] Git repository initialized with `git init`
- [ ] At least 10 commits with meaningful messages
- [ ] Commit messages use conventional format (`feat:`, `fix:`, `docs:`, `style:`, `chore:`)
- [ ] `.gitignore` file present and appropriate
- [ ] `README.md` present with project description, tech stack, and live site link
- [ ] Repository pushed to GitHub

### HTML (Module 04)

- [ ] Document starts with `<!DOCTYPE html>` and `<html lang="en">`
- [ ] `<meta charset="UTF-8">` and `<meta name="viewport">` in `<head>`
- [ ] Semantic elements used: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`
- [ ] One `<h1>`, proper heading hierarchy (`<h2>`, `<h3>`, no skipped levels)
- [ ] All `<img>` tags have descriptive `alt` attributes
- [ ] All form inputs have associated `<label>` elements
- [ ] External links have `target="_blank"` and `rel="noopener noreferrer"`
- [ ] HTML passes the [W3C Validator](https://validator.w3.org/) with no errors

### CSS (Module 05)

- [ ] External stylesheet linked (no inline styles)
- [ ] CSS custom properties defined in `:root` for colors, fonts, and spacing
- [ ] CSS reset applied (`box-sizing`, margin/padding reset)
- [ ] Web fonts loaded (Google Fonts or similar) with system font fallbacks
- [ ] Consistent type scale for headings and body text
- [ ] At least 5 CSS transitions or animations
- [ ] Clear visual hierarchy through font sizes, weights, colors, and spacing
- [ ] Focus styles visible on all interactive elements

### CSS Layout (Module 06)

- [ ] CSS Grid used for at least one layout (e.g., project cards, skills)
- [ ] Flexbox used for at least one layout (e.g., navigation, footer, card content)
- [ ] Layouts handle content of varying lengths without breaking

### Responsive Design (Module 07)

- [ ] Mobile-first approach (base styles for small screens)
- [ ] At least 3 breakpoints with media queries
- [ ] Navigation transforms from hamburger to horizontal at wider screens
- [ ] Project cards reflow from 1 column to 2 to 3
- [ ] Images are responsive (`max-width: 100%`, `height: auto`)
- [ ] `clamp()` used for fluid typography on at least headings
- [ ] Site looks correct at 320px, 768px, and 1920px widths

### JavaScript (Modules 08, 09)

- [ ] Hamburger menu toggles navigation visibility
- [ ] `aria-expanded` updates when menu opens/closes
- [ ] Contact form validation prevents empty submissions
- [ ] Email validation checks for valid format
- [ ] Error messages display next to invalid fields
- [ ] Errors clear when the user starts typing
- [ ] Success message appears on valid submission
- [ ] Dark mode toggle switches between light and dark themes
- [ ] Theme preference saved to `localStorage`
- [ ] Saved preference restored on page load
- [ ] Copyright year dynamically set to current year
- [ ] At least one additional interactive feature implemented
- [ ] Navigation links highlight based on scroll position

### Accessibility

- [ ] All interactive elements reachable via keyboard (Tab, Enter, Escape)
- [ ] Visible focus indicators on all focusable elements
- [ ] `aria-label` on buttons and links that have no visible text (e.g., social icons, hamburger)
- [ ] `aria-expanded` on hamburger menu toggle
- [ ] `aria-live="polite"` on form error message containers
- [ ] Color contrast ratio of 4.5:1 or better for body text
- [ ] Screen reader tested (or checked with a tool like axe DevTools)

### Deployment (Module 10)

- [ ] Site deployed to a live URL (GitHub Pages, Netlify, or Vercel)
- [ ] All features work on the live site
- [ ] Tested on at least one real mobile device
- [ ] Lighthouse scores: Performance 80+, Accessibility 90+, Best Practices 80+, SEO 80+
- [ ] Live URL added to `README.md`

---

## Stretch Goals

If you complete all the requirements and want to push yourself further, try these:

### Animated Skill Bars
Instead of simple tags, create horizontal skill bars that animate in when they scroll into view. Use CSS `width` transitions triggered by JavaScript adding a class when the element enters the viewport.

### Typing Animation
Add a typing effect to your hero tagline where the text appears one character at a time. Implement this with JavaScript using `setInterval` to add one character at a time, or use CSS `@keyframes` with `steps()` and a blinking cursor.

### Scroll-Triggered Animations
Use the Intersection Observer API to fade in sections as they scroll into view. Create a CSS class like `.fade-in` with `opacity: 0` and `transform: translateY(20px)`, then use JavaScript to add a `.visible` class when the section enters the viewport.

### Blog Section
Add a blog or writing section where you share what you are learning. Create individual blog post pages linked from a list on the main page. Write at least one post about your experience learning to code.

### Testimonials Carousel
Add a section with testimonials or quotes from peers, mentors, or colleagues. Implement a simple carousel with previous/next buttons and auto-play functionality using JavaScript.

### Custom 404 Page
Create a `404.html` page that matches your portfolio's design. GitHub Pages and Netlify will automatically serve this page when someone visits a URL that does not exist on your site.

### Performance Optimization
Aim for a Lighthouse performance score of 95+. Optimize images with modern formats like WebP, add `preload` hints for critical resources, minimize CSS and JavaScript, and ensure above-the-fold content loads without render-blocking resources.

---

## Submission Checklist

Before you consider this project complete, verify every item:

- [ ] **All seven sections** are present and populated with real content (not placeholder text)
- [ ] **Navigation** works on mobile (hamburger) and desktop (horizontal links)
- [ ] **Smooth scrolling** takes users to the correct sections
- [ ] **Project cards** display at least three projects with images, descriptions, tech tags, and links
- [ ] **Contact form** validates all fields and shows appropriate error/success states
- [ ] **Dark mode** toggles correctly and persists across page refreshes
- [ ] **Copyright year** updates automatically
- [ ] **Responsive design** works from 320px to 1920px with no horizontal scrolling or overflow
- [ ] **CSS Grid and Flexbox** are both used in the layout
- [ ] **At least 5 transitions/animations** are visible (hover effects, menu animation, etc.)
- [ ] **Accessibility**: keyboard navigable, focus visible, ARIA attributes present, alt text on all images
- [ ] **Git history** has at least 10 meaningful commits with conventional messages
- [ ] **README.md** describes the project and includes the live URL
- [ ] **Deployed** to GitHub Pages, Netlify, or Vercel
- [ ] **Live URL** tested on a real mobile device
- [ ] **Lighthouse audit** run with scores noted
- [ ] **Portfolio URL** added to GitHub profile and LinkedIn

---

You have everything you need. Plan it, build it, ship it.

This is your portfolio. Make it yours. And when it is live, share it proudly. You earned it.

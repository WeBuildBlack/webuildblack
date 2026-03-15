---
title: "Building the Portfolio"
estimatedMinutes: 60
---

# Building the Portfolio

You have your plan. You have your content. You have your colors, fonts, and wireframe. Now it is time to build.

This lesson walks you through building a complete portfolio site step by step. We will write the HTML structure first, then layer on CSS styling, and finish with JavaScript interactivity. This follows the same workflow professional developers use: structure first, presentation second, behavior third.

This is a longer lesson than usual because you are putting together everything you have learned across nine modules. Take your time. Build one section at a time. Commit after each major step. And remember, you know how to do all of this. You have been practicing every skill you need since Module 01.

Let's build.

---

## Step 1: The HTML Structure

Open `index.html` and start with the document skeleton. This should feel familiar from Module 04. You have written this many times:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Name | Front-End Developer</title>
    <meta name="description" content="Portfolio of Your Name, front-end developer specializing in responsive, accessible web experiences.">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <!-- All your content goes here -->
    <script src="js/main.js"></script>
</body>
</html>
```

Notice the details. The `lang="en"` attribute helps screen readers pronounce content correctly. You learned about this in Module 04. The `viewport` meta tag ensures your responsive design works on mobile devices, as you practiced in Module 07. The `preconnect` hints tell the browser to establish a connection to Google Fonts early, which makes fonts load faster. The CSS loads in the `<head>` so styles are ready before the page renders, and the JavaScript loads at the bottom of `<body>` so it does not block rendering.

Now let's build out each section using semantic HTML.

### Navigation

```html
<header class="site-header">
    <nav class="nav" aria-label="Primary navigation">
        <a href="#" class="nav__logo">YN</a>
        <button class="nav__toggle" aria-label="Toggle navigation menu" aria-expanded="false">
            <span class="hamburger"></span>
        </button>
        <ul class="nav__list">
            <li><a href="#about" class="nav__link">About</a></li>
            <li><a href="#projects" class="nav__link">Projects</a></li>
            <li><a href="#skills" class="nav__link">Skills</a></li>
            <li><a href="#contact" class="nav__link">Contact</a></li>
        </ul>
    </nav>
</header>
```

There is a lot happening here, so let's break it down. The `<header>` is a semantic landmark. Screen readers announce it as the page header. The `<nav>` element with `aria-label` tells assistive technology this is the primary navigation. The hamburger button has `aria-label` so screen reader users know what it does, and `aria-expanded="false"` tells them the menu is currently closed. Your JavaScript will toggle this to `"true"` when the menu opens.

The navigation links use anchor links (`#about`, `#projects`) that point to section IDs on the page. These will work for scrolling even without JavaScript, which is progressive enhancement, the concept from Module 04 where core functionality works without JS.

### Hero Section

```html
<main>
    <section class="hero" id="hero">
        <div class="hero__content">
            <p class="hero__greeting">Hi, my name is</p>
            <h1 class="hero__name">Your Name</h1>
            <p class="hero__title">Front-End Developer</p>
            <p class="hero__tagline">I build accessible, responsive websites that look great and work for everyone.</p>
            <a href="#projects" class="hero__cta">See My Work</a>
        </div>
    </section>
```

The hero is the first thing visitors see, so make it count. Your name is the `<h1>`. There should be only one `<h1>` per page, and your name is the most important heading on your portfolio. The call-to-action is an `<a>` tag, not a `<button>`, because it navigates the user to another part of the page. This distinction matters for accessibility and semantics, as you learned in Module 04.

### About Section

```html
    <section class="about" id="about">
        <h2 class="section__title">About Me</h2>
        <div class="about__content">
            <div class="about__image-wrapper">
                <img src="images/profile.jpg" alt="Your Name smiling, wearing a blue shirt" class="about__image">
            </div>
            <div class="about__text">
                <p>Your first paragraph: who you are and what brought you to tech. Make it personal and genuine.</p>
                <p>Your second paragraph: what kind of work excites you and what you are building right now.</p>
                <p>Your third paragraph: what you are looking for and something memorable about you outside of coding.</p>
            </div>
        </div>
    </section>
```

The `alt` text on your image should describe what is in the photo, not just say "profile photo." A screen reader user should be able to picture what sighted users see. If you do not have a photo yet, you can use a placeholder. Just make sure to update it later.

### Projects Section

```html
    <section class="projects" id="projects">
        <h2 class="section__title">Projects</h2>
        <div class="projects__grid">
            <article class="project-card">
                <img src="images/project-1.jpg" alt="Screenshot of the Interactive Quiz app showing a question with multiple choice answers" class="project-card__image" loading="lazy">
                <div class="project-card__content">
                    <h3 class="project-card__title">Interactive Quiz App</h3>
                    <p class="project-card__description">A dynamic quiz application that tracks scores, provides instant feedback, and stores high scores in localStorage.</p>
                    <ul class="project-card__tech">
                        <li>HTML</li>
                        <li>CSS</li>
                        <li>JavaScript</li>
                    </ul>
                    <div class="project-card__links">
                        <a href="https://github.com/yourusername/quiz-app" class="project-card__link" target="_blank" rel="noopener noreferrer">GitHub</a>
                        <a href="https://yourusername.github.io/quiz-app" class="project-card__link" target="_blank" rel="noopener noreferrer">Live Site</a>
                    </div>
                </div>
            </article>

            <article class="project-card">
                <img src="images/project-2.jpg" alt="Screenshot of the Responsive Landing Page with a hero banner and feature cards" class="project-card__image" loading="lazy">
                <div class="project-card__content">
                    <h3 class="project-card__title">Responsive Landing Page</h3>
                    <p class="project-card__description">A fully responsive landing page built mobile-first with CSS Grid and Flexbox, featuring smooth animations and accessible navigation.</p>
                    <ul class="project-card__tech">
                        <li>HTML</li>
                        <li>CSS Grid</li>
                        <li>Flexbox</li>
                    </ul>
                    <div class="project-card__links">
                        <a href="#" class="project-card__link" target="_blank" rel="noopener noreferrer">GitHub</a>
                        <a href="#" class="project-card__link" target="_blank" rel="noopener noreferrer">Live Site</a>
                    </div>
                </div>
            </article>

            <article class="project-card">
                <img src="images/project-3.jpg" alt="Screenshot of the Weather Dashboard showing current temperature and a five-day forecast" class="project-card__image" loading="lazy">
                <div class="project-card__content">
                    <h3 class="project-card__title">Weather Dashboard</h3>
                    <p class="project-card__description">A weather application that fetches real-time data from an API and displays current conditions with a clean, intuitive interface.</p>
                    <ul class="project-card__tech">
                        <li>HTML</li>
                        <li>CSS</li>
                        <li>JavaScript</li>
                    </ul>
                    <div class="project-card__links">
                        <a href="#" class="project-card__link" target="_blank" rel="noopener noreferrer">GitHub</a>
                        <a href="#" class="project-card__link" target="_blank" rel="noopener noreferrer">Live Site</a>
                    </div>
                </div>
            </article>
        </div>
    </section>
```

Each project is wrapped in an `<article>` element because it is a self-contained piece of content, exactly as you learned in Module 04. The `loading="lazy"` attribute tells the browser to wait until the image is near the viewport before loading it, which improves performance. The `target="_blank"` on external links opens them in a new tab, and `rel="noopener noreferrer"` is a security best practice that prevents the new page from accessing your page's `window` object.

The tech stack list uses a `<ul>` because it is a list of items with no particular order. Keep your markup semantic and your CSS will have a solid foundation to work with.

### Skills Section

```html
    <section class="skills" id="skills">
        <h2 class="section__title">Skills</h2>
        <div class="skills__grid">
            <div class="skills__category">
                <h3 class="skills__category-title">Languages</h3>
                <ul class="skills__list">
                    <li class="skills__item">HTML5</li>
                    <li class="skills__item">CSS3</li>
                    <li class="skills__item">JavaScript (ES6+)</li>
                </ul>
            </div>
            <div class="skills__category">
                <h3 class="skills__category-title">Frameworks & Layout</h3>
                <ul class="skills__list">
                    <li class="skills__item">CSS Grid</li>
                    <li class="skills__item">Flexbox</li>
                    <li class="skills__item">Responsive Design</li>
                </ul>
            </div>
            <div class="skills__category">
                <h3 class="skills__category-title">Tools</h3>
                <ul class="skills__list">
                    <li class="skills__item">Git & GitHub</li>
                    <li class="skills__item">VS Code</li>
                    <li class="skills__item">Terminal / CLI</li>
                    <li class="skills__item">Chrome DevTools</li>
                </ul>
            </div>
            <div class="skills__category">
                <h3 class="skills__category-title">Concepts</h3>
                <ul class="skills__list">
                    <li class="skills__item">Accessibility (a11y)</li>
                    <li class="skills__item">Semantic HTML</li>
                    <li class="skills__item">Mobile-First Design</li>
                    <li class="skills__item">DOM Manipulation</li>
                </ul>
            </div>
        </div>
    </section>
```

### Contact Section

```html
    <section class="contact" id="contact">
        <h2 class="section__title">Get In Touch</h2>
        <p class="contact__intro">I'm currently looking for new opportunities. Whether you have a question, a project idea, or just want to say hi, my inbox is always open.</p>
        <form class="contact__form" id="contact-form" novalidate>
            <div class="form__group">
                <label for="name" class="form__label">Name</label>
                <input type="text" id="name" name="name" class="form__input" required autocomplete="name">
                <span class="form__error" id="name-error" aria-live="polite"></span>
            </div>
            <div class="form__group">
                <label for="email" class="form__label">Email</label>
                <input type="email" id="email" name="email" class="form__input" required autocomplete="email">
                <span class="form__error" id="email-error" aria-live="polite"></span>
            </div>
            <div class="form__group">
                <label for="message" class="form__label">Message</label>
                <textarea id="message" name="message" class="form__input form__textarea" rows="5" required></textarea>
                <span class="form__error" id="message-error" aria-live="polite"></span>
            </div>
            <button type="submit" class="form__submit">Send Message</button>
        </form>
    </section>
</main>
```

The `novalidate` attribute on the form tells the browser not to use its built-in validation popups. You will handle validation yourself with JavaScript, giving you full control over the error messages and styling. Each error `<span>` has `aria-live="polite"`, which means screen readers will announce the error message when it appears without interrupting whatever they are currently reading. This is the kind of accessibility detail that separates good developers from great ones.

Every `<input>` has a matching `<label>` with a `for` attribute that links it to the input's `id`. This is not optional. It is essential for accessibility. Clicking the label focuses the input, and screen readers announce the label when the input receives focus.

### Footer

```html
<footer class="footer">
    <div class="footer__content">
        <p class="footer__copyright">&copy; <span id="year"></span> Your Name. All rights reserved.</p>
        <ul class="footer__social">
            <li><a href="https://github.com/yourusername" target="_blank" rel="noopener noreferrer" aria-label="GitHub profile">GitHub</a></li>
            <li><a href="https://linkedin.com/in/yourusername" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile">LinkedIn</a></li>
            <li><a href="https://twitter.com/yourusername" target="_blank" rel="noopener noreferrer" aria-label="Twitter profile">Twitter</a></li>
        </ul>
        <a href="#hero" class="footer__top" aria-label="Back to top">Back to Top</a>
    </div>
</footer>
```

The `<span id="year"></span>` is empty in the HTML. JavaScript will fill it with the current year. That way you never need to manually update the copyright year. The social links have `aria-label` attributes that provide clearer context for screen readers, since "GitHub" alone might be ambiguous outside of its visual context.

Now commit your HTML:

```bash
git add index.html
git commit -m "feat: add HTML structure for all sections"
```

---

## Step 2: CSS Styling

Open `css/styles.css`. You are going to build the stylesheet from the ground up, using everything you learned in Modules 05, 06, and 07.

### CSS Custom Properties and Reset

Start with your design tokens and a simple reset:

```css
:root {
    /* Colors */
    --color-primary: #2563eb;
    --color-primary-dark: #1d4ed8;
    --color-secondary: #f59e0b;
    --color-bg: #ffffff;
    --color-bg-alt: #f8fafc;
    --color-text: #1e293b;
    --color-text-light: #64748b;
    --color-border: #e2e8f0;

    /* Dark mode colors (applied via .dark-mode class) */
    --color-bg-dark: #0f172a;
    --color-bg-alt-dark: #1e293b;
    --color-text-dark: #e2e8f0;
    --color-text-light-dark: #94a3b8;
    --color-border-dark: #334155;

    /* Typography */
    --font-heading: 'Space Grotesk', system-ui, sans-serif;
    --font-body: 'Inter', system-ui, sans-serif;
    --font-size-base: 1rem;
    --line-height-base: 1.6;

    /* Spacing */
    --space-xs: 0.5rem;
    --space-sm: 1rem;
    --space-md: 2rem;
    --space-lg: 4rem;
    --space-xl: 6rem;

    /* Transitions */
    --transition-fast: 200ms ease;
    --transition-base: 300ms ease;

    /* Layout */
    --max-width: 1100px;
    --nav-height: 70px;
}

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
    font-size: var(--font-size-base);
    line-height: var(--line-height-base);
    color: var(--color-text);
    background-color: var(--color-bg);
    transition: background-color var(--transition-base), color var(--transition-base);
}

img {
    max-width: 100%;
    height: auto;
    display: block;
}

a {
    color: var(--color-primary);
    text-decoration: none;
    transition: color var(--transition-fast);
}

a:hover {
    color: var(--color-primary-dark);
}

ul {
    list-style: none;
}
```

This is everything from Module 05 in action. CSS custom properties centralize your design decisions. The reset removes browser defaults so you start from a clean slate. `box-sizing: border-box` on everything means padding does not add to element widths, which makes layout math simpler, a concept you worked with throughout Module 06. `scroll-behavior: smooth` makes anchor link clicks scroll smoothly instead of jumping, and `scroll-padding-top` offsets the scroll position so the fixed navigation does not cover the section headings.

Notice the dark mode colors are defined but not applied yet. You will use JavaScript to toggle a `.dark-mode` class that swaps these values.

### Dark Mode Styles

Add the dark mode overrides:

```css
body.dark-mode {
    --color-bg: var(--color-bg-dark);
    --color-bg-alt: var(--color-bg-alt-dark);
    --color-text: var(--color-text-dark);
    --color-text-light: var(--color-text-light-dark);
    --color-border: var(--color-border-dark);
}
```

This is what makes CSS custom properties so useful. By reassigning the variable values when `.dark-mode` is present, every element that references those variables automatically updates. You do not need to write separate rules for every element. The cascade handles it.

### Navigation

```css
.site-header {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    background-color: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    z-index: 1000;
    transition: background-color var(--transition-base);
}

.nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: var(--max-width);
    margin: 0 auto;
    padding: 0 var(--space-sm);
    height: var(--nav-height);
}

.nav__logo {
    font-family: var(--font-heading);
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text);
}

.nav__toggle {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 40px;
    height: 40px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
}

.hamburger,
.hamburger::before,
.hamburger::after {
    display: block;
    width: 24px;
    height: 2px;
    background-color: var(--color-text);
    transition: transform var(--transition-base), opacity var(--transition-fast);
}

.hamburger {
    position: relative;
}

.hamburger::before,
.hamburger::after {
    content: '';
    position: absolute;
}

.hamburger::before {
    top: -7px;
}

.hamburger::after {
    top: 7px;
}

/* Hamburger animation when menu is open */
.nav__toggle[aria-expanded="true"] .hamburger {
    background-color: transparent;
}

.nav__toggle[aria-expanded="true"] .hamburger::before {
    top: 0;
    transform: rotate(45deg);
}

.nav__toggle[aria-expanded="true"] .hamburger::after {
    top: 0;
    transform: rotate(-45deg);
}

.nav__list {
    position: fixed;
    top: var(--nav-height);
    left: 0;
    width: 100%;
    background-color: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    padding: var(--space-sm) 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xs);
    transform: translateY(-100%);
    opacity: 0;
    visibility: hidden;
    transition: transform var(--transition-base), opacity var(--transition-base), visibility var(--transition-base);
}

.nav__list.active {
    transform: translateY(0);
    opacity: 1;
    visibility: visible;
}

.nav__link {
    font-family: var(--font-heading);
    font-size: 1.1rem;
    color: var(--color-text);
    padding: var(--space-xs) var(--space-sm);
    transition: color var(--transition-fast);
}

.nav__link:hover,
.nav__link.active {
    color: var(--color-primary);
}
```

This is a mobile-first navigation, just like you built in Module 07. On mobile, the nav list is hidden off-screen with `transform: translateY(-100%)` and becomes visible when the `.active` class is added by JavaScript. The hamburger icon uses CSS pseudo-elements (`::before` and `::after`) to create three lines, and when the menu is open, they animate into an X shape using `transform: rotate()`. This is a common pattern that uses transitions you learned in Module 05.

### Hero Section

```css
.hero {
    min-height: 100vh;
    display: flex;
    align-items: center;
    padding: calc(var(--nav-height) + var(--space-lg)) var(--space-sm) var(--space-lg);
}

.hero__content {
    max-width: var(--max-width);
    margin: 0 auto;
    width: 100%;
}

.hero__greeting {
    font-family: var(--font-heading);
    color: var(--color-primary);
    font-size: 1rem;
    margin-bottom: var(--space-xs);
}

.hero__name {
    font-family: var(--font-heading);
    font-size: clamp(2.5rem, 8vw, 4.5rem);
    font-weight: 700;
    line-height: 1.1;
    margin-bottom: var(--space-xs);
}

.hero__title {
    font-size: clamp(1.25rem, 4vw, 2rem);
    color: var(--color-text-light);
    margin-bottom: var(--space-sm);
}

.hero__tagline {
    max-width: 540px;
    color: var(--color-text-light);
    margin-bottom: var(--space-md);
}

.hero__cta {
    display: inline-block;
    padding: 0.75rem 2rem;
    background-color: var(--color-primary);
    color: #ffffff;
    border-radius: 6px;
    font-family: var(--font-heading);
    font-weight: 500;
    transition: background-color var(--transition-fast), transform var(--transition-fast);
}

.hero__cta:hover {
    background-color: var(--color-primary-dark);
    color: #ffffff;
    transform: translateY(-2px);
}
```

The `clamp()` function is from Module 07. It creates fluid typography that scales smoothly between a minimum and maximum size based on the viewport width. No media queries needed for the font sizes. The hero takes up the full viewport height with `min-height: 100vh` and uses Flexbox to vertically center the content. The CTA button has a subtle lift effect on hover with `transform: translateY(-2px)`.

### Section Styles and About

```css
section {
    padding: var(--space-xl) var(--space-sm);
}

.section__title {
    font-family: var(--font-heading);
    font-size: clamp(1.75rem, 5vw, 2.5rem);
    margin-bottom: var(--space-md);
    text-align: center;
}

.about {
    background-color: var(--color-bg-alt);
}

.about__content {
    max-width: var(--max-width);
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
}

.about__image {
    width: 250px;
    height: 250px;
    border-radius: 50%;
    object-fit: cover;
    border: 4px solid var(--color-primary);
}

.about__text p {
    margin-bottom: var(--space-sm);
    max-width: 65ch;
}
```

The `max-width: 65ch` on paragraphs limits line length to about 65 characters, which is optimal for readability. The `object-fit: cover` on the profile image ensures it fills the circular shape without distortion, regardless of the original image's aspect ratio.

### Project Cards

```css
.projects__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-md);
    max-width: var(--max-width);
    margin: 0 auto;
}

.project-card {
    background-color: var(--color-bg-alt);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    overflow: hidden;
    transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.project-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.project-card__image {
    width: 100%;
    height: 200px;
    object-fit: cover;
}

.project-card__content {
    padding: var(--space-sm);
}

.project-card__title {
    font-family: var(--font-heading);
    font-size: 1.25rem;
    margin-bottom: var(--space-xs);
}

.project-card__description {
    color: var(--color-text-light);
    margin-bottom: var(--space-sm);
    font-size: 0.95rem;
}

.project-card__tech {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: var(--space-sm);
}

.project-card__tech li {
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    color: var(--color-text-light);
}

.project-card__links {
    display: flex;
    gap: var(--space-sm);
}

.project-card__link {
    font-family: var(--font-heading);
    font-weight: 500;
    font-size: 0.9rem;
}
```

The project cards use CSS Grid for layout. On mobile, a single column (`grid-template-columns: 1fr`). You will add more columns in the responsive section. The cards have a hover effect that lifts them slightly and adds a shadow, which gives the interface a tactile, interactive feel. The tech tags use `flex-wrap: wrap` so they flow naturally when there are many tags on a small screen.

### Skills Section

```css
.skills {
    background-color: var(--color-bg-alt);
}

.skills__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-md);
    max-width: var(--max-width);
    margin: 0 auto;
}

.skills__category {
    text-align: center;
}

.skills__category-title {
    font-family: var(--font-heading);
    font-size: 1.1rem;
    margin-bottom: var(--space-sm);
    color: var(--color-primary);
}

.skills__list {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
}

.skills__item {
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.9rem;
    transition: border-color var(--transition-fast), color var(--transition-fast);
}

.skills__item:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
}
```

### Contact Form

```css
.contact {
    max-width: 600px;
    margin: 0 auto;
}

.contact__intro {
    text-align: center;
    color: var(--color-text-light);
    margin-bottom: var(--space-md);
    max-width: 50ch;
    margin-left: auto;
    margin-right: auto;
}

.contact__form {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
}

.form__label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.25rem;
    font-size: 0.9rem;
}

.form__input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid var(--color-border);
    border-radius: 6px;
    font-family: var(--font-body);
    font-size: 1rem;
    color: var(--color-text);
    background-color: var(--color-bg);
    transition: border-color var(--transition-fast);
}

.form__input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}

.form__input.error {
    border-color: #dc2626;
}

.form__error {
    display: block;
    color: #dc2626;
    font-size: 0.85rem;
    margin-top: 0.25rem;
    min-height: 1.25rem;
}

.form__textarea {
    resize: vertical;
    min-height: 120px;
}

.form__submit {
    padding: 0.75rem 2rem;
    background-color: var(--color-primary);
    color: #ffffff;
    border: none;
    border-radius: 6px;
    font-family: var(--font-heading);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color var(--transition-fast), transform var(--transition-fast);
    align-self: flex-start;
}

.form__submit:hover {
    background-color: var(--color-primary-dark);
    transform: translateY(-2px);
}
```

The form inputs have a clear focus state. When you tab to them or click them, the border changes color and a soft blue shadow appears. This replaces the browser's default outline with something that looks polished but is still clearly visible. The `.error` class turns the border red when validation fails, and the error messages have `min-height` so the layout does not jump when they appear.

### Footer

```css
.footer {
    background-color: var(--color-text);
    color: var(--color-bg);
    padding: var(--space-md) var(--space-sm);
}

.footer__content {
    max-width: var(--max-width);
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    text-align: center;
}

.footer__copyright {
    font-size: 0.9rem;
    opacity: 0.8;
}

.footer__social {
    display: flex;
    gap: var(--space-sm);
}

.footer__social a {
    color: var(--color-bg);
    opacity: 0.8;
    transition: opacity var(--transition-fast);
}

.footer__social a:hover {
    opacity: 1;
}

.footer__top {
    color: var(--color-bg);
    opacity: 0.8;
    font-size: 0.85rem;
}
```

### Responsive Design

Now add media queries for larger screens. Remember from Module 07. You are working mobile-first, so these media queries *add* styles as the screen gets wider:

```css
/* Tablet and up */
@media (min-width: 768px) {
    section {
        padding: var(--space-xl) var(--space-md);
    }

    .nav__toggle {
        display: none;
    }

    .nav__list {
        position: static;
        flex-direction: row;
        transform: none;
        opacity: 1;
        visibility: visible;
        border: none;
        padding: 0;
        gap: var(--space-xs);
        width: auto;
        background-color: transparent;
    }

    .about__content {
        flex-direction: row;
        text-align: left;
    }

    .projects__grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .skills__grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .footer__content {
        flex-direction: row;
        justify-content: space-between;
    }
}

/* Desktop */
@media (min-width: 1024px) {
    .projects__grid {
        grid-template-columns: repeat(3, 1fr);
    }

    .skills__grid {
        grid-template-columns: repeat(4, 1fr);
    }
}
```

At 768px, the hamburger disappears and the nav becomes a horizontal row. Project cards go from one column to two. At 1024px, project cards become three columns and skills fill four columns. This is the responsive breakpoint strategy from Module 07. Start with the mobile layout and progressively enhance for larger screens.

### Dark Mode Toggle Button

Add a fixed button for the dark mode toggle:

```css
.theme-toggle {
    position: fixed;
    bottom: var(--space-sm);
    right: var(--space-sm);
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 2px solid var(--color-border);
    background-color: var(--color-bg);
    cursor: pointer;
    font-size: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color var(--transition-fast), border-color var(--transition-fast);
    z-index: 999;
}

.theme-toggle:hover {
    border-color: var(--color-primary);
}
```

Commit your CSS:

```bash
git add css/styles.css
git commit -m "feat: add complete stylesheet with responsive design"
```

---

## Step 3: JavaScript Interactivity

Open `js/main.js`. Time to bring your page to life using everything from Modules 08 and 09.

### Dynamic Year

The simplest JavaScript on the page, and a great warm-up:

```javascript
// Dynamic copyright year
const yearSpan = document.getElementById('year');
if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
}
```

This replaces the empty `<span id="year"></span>` in the footer with the current year. `new Date().getFullYear()` returns the four-digit year. You will never need to manually update your copyright again.

### Mobile Menu Toggle

```javascript
// Mobile navigation toggle
const navToggle = document.querySelector('.nav__toggle');
const navList = document.querySelector('.nav__list');

if (navToggle && navList) {
    navToggle.addEventListener('click', () => {
        const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
        navToggle.setAttribute('aria-expanded', String(!isOpen));
        navList.classList.toggle('active');
    });

    // Close menu when a link is clicked
    navList.querySelectorAll('.nav__link').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.setAttribute('aria-expanded', 'false');
            navList.classList.remove('active');
        });
    });
}
```

This toggles the `.active` class on the nav list, which triggers the CSS transition you already wrote. It also updates `aria-expanded` so screen readers know whether the menu is open or closed. When a navigation link is clicked, the menu closes automatically. Otherwise on mobile, the user would have to manually close the menu after navigating, which is a bad experience.

### Form Validation

```javascript
// Contact form validation
const contactForm = document.getElementById('contact-form');

function showError(inputId, message) {
    const input = document.getElementById(inputId);
    const errorSpan = document.getElementById(`${inputId}-error`);
    if (input && errorSpan) {
        input.classList.add('error');
        errorSpan.textContent = message;
    }
}

function clearError(inputId) {
    const input = document.getElementById(inputId);
    const errorSpan = document.getElementById(`${inputId}-error`);
    if (input && errorSpan) {
        input.classList.remove('error');
        errorSpan.textContent = '';
    }
}

function validateEmail(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
}

if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        let isValid = true;

        const name = document.getElementById('name');
        const email = document.getElementById('email');
        const message = document.getElementById('message');

        // Validate name
        if (!name.value.trim()) {
            showError('name', 'Please enter your name.');
            isValid = false;
        } else {
            clearError('name');
        }

        // Validate email
        if (!email.value.trim()) {
            showError('email', 'Please enter your email address.');
            isValid = false;
        } else if (!validateEmail(email.value.trim())) {
            showError('email', 'Please enter a valid email address.');
            isValid = false;
        } else {
            clearError('email');
        }

        // Validate message
        if (!message.value.trim()) {
            showError('message', 'Please enter a message.');
            isValid = false;
        } else {
            clearError('message');
        }

        if (isValid) {
            // In a real portfolio, you would send this data to a service
            // like Formspree, Netlify Forms, or your own backend.
            // For now, show a success state:
            contactForm.innerHTML = `
                <div class="form__success" style="text-align: center; padding: 2rem 0;">
                    <p style="font-size: 1.25rem; font-weight: 500; margin-bottom: 0.5rem;">Message sent!</p>
                    <p style="color: var(--color-text-light);">Thank you for reaching out. I'll get back to you soon.</p>
                </div>
            `;
        }
    });

    // Clear errors on input
    ['name', 'email', 'message'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', () => clearError(id));
        }
    });
}
```

This is real-world form validation. The `e.preventDefault()` stops the form from submitting normally, so you can validate first, a technique from Module 09. The email validation uses a regular expression (regex) that checks for the basic `something@something.something` pattern. Errors clear as soon as the user starts typing in the field, which is a much better experience than making them resubmit the form.

### Active Navigation on Scroll

```javascript
// Highlight active nav link based on scroll position
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav__link');

function highlightNav() {
    const scrollPosition = window.scrollY + 150;

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');

        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

window.addEventListener('scroll', highlightNav);
```

As the user scrolls down the page, the navigation link for the current section gets highlighted. This uses `window.scrollY` and each section's `offsetTop` to determine which section is currently in view. The 150-pixel offset accounts for the fixed navigation bar height and provides a small buffer.

### Dark Mode Toggle

```javascript
// Dark mode toggle with localStorage
const themeToggle = document.querySelector('.theme-toggle');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

function setTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    if (themeToggle) {
        themeToggle.textContent = isDark ? '\u2600\uFE0F' : '\uD83C\uDF19';
        themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Check for saved preference, then system preference
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme === 'dark');
    } else {
        setTheme(prefersDark.matches);
    }
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.contains('dark-mode');
        setTheme(!isDark);
    });
}

initTheme();
```

This uses `localStorage`, the browser storage API you learned about in Module 09. When the user clicks the toggle, the theme preference is saved. When they return to your site, the preference is restored. If they have never set a preference, the code checks their operating system's color scheme preference with `window.matchMedia('(prefers-color-scheme: dark)')`. This is thoughtful UX: you respect the user's existing preference and remember their choice.

You also need to add the toggle button to your HTML. Add this just before the closing `</body>` tag, before the `<script>` tag:

```html
<button class="theme-toggle" aria-label="Switch to dark mode"></button>
```

Commit your JavaScript:

```bash
git add js/main.js index.html
git commit -m "feat: add JavaScript interactivity and dark mode"
```

---

## Tips for a Clean Build

**Less is more.** A simple site that works perfectly is more impressive than a complex site with broken features. If something is not working, simplify.

**White space is your friend.** Do not be afraid of empty space. Generous padding and margins make content easier to read and give your site a professional look.

**Test as you build.** Open your `index.html` in a browser after every major change. Use Chrome DevTools (right-click and choose "Inspect") to test responsive behavior. You have been doing this since Module 05.

**Validate your HTML.** Drop your HTML into the [W3C Validator](https://validator.w3.org/) and fix any errors. Clean markup is a sign of quality.

**Check your contrast.** Use Chrome DevTools' accessibility panel or the WebAIM contrast checker to verify your color combinations meet the WCAG AA standard.

**Commit often.** You planned your commit history in Lesson 01. Follow through. Small, focused commits are better than one giant commit at the end.

---

## Key Takeaways

1. Build in order: HTML structure first, CSS presentation second, JavaScript behavior third. This is how professional developers work.
2. Semantic HTML elements like `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, and `<footer>` give your page meaning, improve accessibility, and help with SEO.
3. CSS custom properties centralize your design tokens so you can restyle the entire site by changing a few values, and they make dark mode almost trivial to implement.
4. Mobile-first responsive design means your base CSS is for small screens, and media queries add layout complexity for larger screens.
5. `clamp()` creates fluid typography that scales smoothly without media queries. This is a technique from Module 07 that makes your text look great at every viewport width.
6. JavaScript form validation uses `preventDefault()`, DOM traversal, and class toggling, all skills from Modules 08 and 09 working together.
7. `localStorage` remembers user preferences across sessions, turning a simple toggle into a polished feature that respects the user's choice.

---

## Try It Yourself

1. **Build your HTML.** Using the examples in this lesson as a guide (but not copying them verbatim), write the complete HTML structure for your portfolio. Use your own content: the bio, project descriptions, and skills you drafted in Lesson 01. Commit when done.

2. **Style your site.** Create your CSS file with custom properties for your chosen colors and fonts. Style each section, starting with the navigation and hero. Test in the browser after each section. Use DevTools to preview mobile and desktop layouts. Commit after major milestones.

3. **Add interactivity.** Implement the hamburger menu toggle, form validation, dynamic year, and dark mode toggle. Test each feature in the browser. Make sure the menu works on mobile, the form shows errors correctly, and dark mode persists after refreshing the page.

4. **Polish and refine.** Resize your browser window from mobile to desktop and fix anything that looks off. Tab through the entire page with your keyboard and make sure every interactive element is reachable. Run the page through the W3C HTML Validator. Make a final commit.

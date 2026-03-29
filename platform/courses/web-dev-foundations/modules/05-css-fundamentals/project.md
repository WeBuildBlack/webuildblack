---
title: "Module Project: Style the Recipe Page"
estimatedMinutes: 90
---

# Module Project: Style the Recipe Page

It's time to bring everything together. In Module 04, you built a recipe page with HTML: semantic structure, headings, lists, images, a form, and navigation. Now you're going to transform that plain HTML into a beautiful, interactive, professionally styled page using everything you've learned in this module.

By the end of this project, you'll have a recipe page that looks like it belongs on a real cooking website, complete with custom fonts, a warm color scheme, smooth hover effects, and a styled contact form.

---

## What You'll Practice

- CSS custom properties for a consistent design system
- A CSS reset for cross-browser consistency
- Google Fonts for professional typography
- The box model: padding, margin, borders, and border-radius
- Colors, backgrounds, and gradients
- Transitions and transforms for interactive hover effects
- Display modes: block, inline, inline-block
- BEM-style class naming
- Organized, maintainable CSS structure

---

## Starter HTML

If you completed the Module 04 project, use your own recipe page. If you need a fresh start, use this HTML:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jollof Rice | WBB Recipes</title>

    <!-- TODO: Add Google Fonts link here (load BEFORE your stylesheet) -->

    <link rel="stylesheet" href="styles.css">
</head>
<body>

    <header class="site-header">
        <nav class="nav">
            <a href="#" class="nav__logo">WBB Recipes</a>
            <ul class="nav__list">
                <li class="nav__item"><a href="#about" class="nav__link">About</a></li>
                <li class="nav__item"><a href="#ingredients" class="nav__link">Ingredients</a></li>
                <li class="nav__item"><a href="#steps" class="nav__link">Steps</a></li>
                <li class="nav__item"><a href="#contact" class="nav__link">Contact</a></li>
            </ul>
        </nav>
    </header>

    <main>
        <section class="hero" id="about">
            <h1 class="hero__title">Jollof Rice</h1>
            <p class="hero__subtitle">A beloved West African classic that brings everyone to the table.</p>
        </section>

        <section class="recipe-intro">
            <div class="container">
                <div class="recipe-intro__content">
                    <h2 class="section-title">About This Recipe</h2>
                    <p>Jollof rice is more than a dish. It's a tradition, a celebration, and (let's be honest) a friendly rivalry between West African nations over who makes it best. This version uses a rich tomato base with aromatic spices that fill your kitchen with an incredible smell.</p>
                    <p>Prep time: <strong>20 minutes</strong> | Cook time: <strong>45 minutes</strong> | Serves: <strong>6</strong></p>
                </div>
                <div class="recipe-intro__image">
                    <img src="https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=600&h=400&fit=crop" alt="A vibrant plate of jollof rice garnished with fresh vegetables" class="recipe-image">
                </div>
            </div>
        </section>

        <section class="ingredients" id="ingredients">
            <div class="container">
                <h2 class="section-title">Ingredients</h2>
                <div class="ingredients__grid">
                    <div class="ingredient-card">
                        <h3 class="ingredient-card__title">Base</h3>
                        <ul class="ingredient-card__list">
                            <li>2 cups long grain rice</li>
                            <li>6 medium tomatoes, blended</li>
                            <li>3 red bell peppers, blended</li>
                            <li>2 scotch bonnet peppers</li>
                            <li>1 large onion, diced</li>
                        </ul>
                    </div>
                    <div class="ingredient-card">
                        <h3 class="ingredient-card__title">Spices</h3>
                        <ul class="ingredient-card__list">
                            <li>1 tsp thyme</li>
                            <li>2 tsp curry powder</li>
                            <li>1 tsp smoked paprika</li>
                            <li>2 bay leaves</li>
                            <li>Salt to taste</li>
                        </ul>
                    </div>
                    <div class="ingredient-card">
                        <h3 class="ingredient-card__title">Extras</h3>
                        <ul class="ingredient-card__list">
                            <li>3 tbsp tomato paste</li>
                            <li>1/3 cup vegetable oil</li>
                            <li>2 cups chicken stock</li>
                            <li>1 tsp garlic, minced</li>
                            <li>1 tsp ginger, grated</li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>

        <section class="steps" id="steps">
            <div class="container">
                <h2 class="section-title">Instructions</h2>
                <ol class="steps__list">
                    <li class="step">
                        <h3 class="step__title">Prepare the Base</h3>
                        <p class="step__text">Blend the tomatoes, red bell peppers, and scotch bonnet peppers until smooth. Set aside. Dice the onion.</p>
                    </li>
                    <li class="step">
                        <h3 class="step__title">Build the Sauce</h3>
                        <p class="step__text">Heat vegetable oil in a large pot over medium heat. Sauté the diced onion until translucent. Add tomato paste and fry for 2-3 minutes, stirring constantly.</p>
                    </li>
                    <li class="step">
                        <h3 class="step__title">Add Blended Peppers</h3>
                        <p class="step__text">Pour in the blended tomato-pepper mixture. Cook on medium-high heat for 20-25 minutes, stirring occasionally, until the sauce reduces and the oil floats to the top.</p>
                    </li>
                    <li class="step">
                        <h3 class="step__title">Season and Simmer</h3>
                        <p class="step__text">Add garlic, ginger, thyme, curry powder, smoked paprika, bay leaves, and salt. Stir well and cook for another 5 minutes.</p>
                    </li>
                    <li class="step">
                        <h3 class="step__title">Cook the Rice</h3>
                        <p class="step__text">Rinse the rice thoroughly. Add it to the pot along with the chicken stock. Stir once, cover tightly with foil and the pot lid, and cook on low heat for 30 minutes. Do not open the lid!</p>
                    </li>
                    <li class="step">
                        <h3 class="step__title">Fluff and Serve</h3>
                        <p class="step__text">Remove from heat and let it sit for 10 minutes. Fluff with a fork, remove the bay leaves, and serve with fried plantains or grilled chicken. Enjoy!</p>
                    </li>
                </ol>
            </div>
        </section>

        <section class="contact" id="contact">
            <div class="container">
                <h2 class="section-title">Share Your Version</h2>
                <p>Made this recipe? We'd love to hear about it! Drop us a note below.</p>
                <form class="form" action="#" method="POST">
                    <div class="form__group">
                        <label class="form__label" for="name">Your Name</label>
                        <input class="form__input" type="text" id="name" name="name" placeholder="e.g., Amara Johnson" required>
                    </div>
                    <div class="form__group">
                        <label class="form__label" for="email">Email</label>
                        <input class="form__input" type="email" id="email" name="email" placeholder="amara@example.com" required>
                    </div>
                    <div class="form__group">
                        <label class="form__label" for="rating">Rating</label>
                        <select class="form__input" id="rating" name="rating">
                            <option value="5">5 - Outstanding</option>
                            <option value="4">4 - Great</option>
                            <option value="3">3 - Good</option>
                            <option value="2">2 - Fair</option>
                            <option value="1">1 - Needs Work</option>
                        </select>
                    </div>
                    <div class="form__group">
                        <label class="form__label" for="message">Your Notes</label>
                        <textarea class="form__input form__textarea" id="message" name="message" rows="4" placeholder="I added extra scotch bonnet and it was fire..."></textarea>
                    </div>
                    <button type="submit" class="btn btn--primary">Submit</button>
                </form>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="container">
            <p class="footer__text">Made with love by <a href="#" class="footer__link">We Build Black</a></p>
        </div>
    </footer>

</body>
</html>
```

---

## Starter CSS

Create a file called `styles.css` in the same directory as your HTML. Copy this starter code and complete each `/* TODO */` section:

```css
/* ===========================
   1. CSS RESET
   =========================== */

/* TODO: Add the universal reset
   - Set box-sizing: border-box on *, *::before, *::after
   - Reset margin and padding to 0
   - Set img to max-width: 100% and display: block
   - Set button, input, textarea, select to font: inherit
*/


/* ===========================
   2. CUSTOM PROPERTIES
   =========================== */

:root {
    /* TODO: Define your color palette
       Create at least these variables:
       --color-primary        (a rich, warm brown, try #7D4E21)
       --color-primary-dark   (a deep brown, try #2C170B)
       --color-primary-light  (a warm tan, try #AE8156)
       --color-accent         (a gold or amber, try #D4A76A)
       --color-bg             (an off-white with warmth, try #FDFBF8)
       --color-surface        (white, #FFFFFF)
       --color-text           (dark brown for body text)
       --color-text-light     (lighter brown for secondary text)
       --color-border         (a subtle warm gray, try #e8e0d8)
    */

    /* TODO: Define font variables
       --font-heading   (choose a Google Font for headings, e.g., 'Playfair Display', serif)
       --font-body      (choose a Google Font for body, e.g., 'Source Sans 3', sans-serif)
    */

    /* TODO: Define spacing variables
       --space-xs: 4px;
       --space-sm: 8px;
       --space-md: 16px;
       --space-lg: 24px;
       --space-xl: 40px;
       --space-xxl: 80px;
    */

    /* TODO: Define border radius and shadow variables
       --radius-sm: 4px;
       --radius-md: 8px;
       --radius-lg: 16px;
       --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
       --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
       --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.12);
    */

    /* TODO: Define a transition variable
       --transition: 0.3s ease;
    */
}


/* ===========================
   3. BASE STYLES
   =========================== */

body {
    /* TODO: Set font-family using your --font-body variable
       Set color using --color-text
       Set background-color using --color-bg
       Set line-height to 1.6
       Set font-size to 1rem
    */
}

h1, h2, h3, h4 {
    /* TODO: Set font-family using --font-heading
       Set line-height to 1.2
       Set color using --color-primary-dark
    */
}

a {
    /* TODO: Set color using --color-primary
       Remove text-decoration
       Add a transition on color
    */
}

a:hover {
    /* TODO: Change color to --color-primary-light */
}


/* ===========================
   4. LAYOUT
   =========================== */

.container {
    /* TODO: Set max-width to 1100px
       Center with margin: 0 auto
       Add horizontal padding using --space-md or --space-lg
    */
}


/* ===========================
   5. NAVIGATION
   =========================== */

.site-header {
    /* TODO: Set background-color using --color-primary-dark
       Add padding using your spacing variables
       Consider making it sticky with position: sticky; top: 0; z-index: 100;
    */
}

.nav {
    /* TODO: Use display: flex to put the logo and links on one line
       Set justify-content: space-between and align-items: center
       Set max-width: 1100px and margin: 0 auto
    */
}

.nav__logo {
    /* TODO: Style the logo text
       Set color to white
       Set font-family to your heading font
       Set font-size to 1.5rem
       Set font-weight to bold
       Remove text-decoration
    */
}

.nav__list {
    /* TODO: Use display: flex to line up the nav items horizontally
       Remove list-style
       Set gap between items using your spacing variables
    */
}

.nav__link {
    /* TODO: Style nav links
       Set color to white (with slight transparency, try rgba(255,255,255,0.85))
       Set padding so the links have a comfortable click target
       Set text-decoration to none
       Set font-size to 0.9rem
       Add a transition on color AND background-color
    */
}

.nav__link:hover {
    /* TODO: Change color to full white
       Add a subtle background, try rgba(255, 255, 255, 0.1)
       Add border-radius for a rounded hover state
    */
}


/* ===========================
   6. HERO SECTION
   =========================== */

.hero {
    /* TODO: Create a gradient background
       Try: linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)
       Set color to white
       Center the text with text-align: center
       Add generous vertical padding (--space-xxl or more)
    */
}

.hero__title {
    /* TODO: Make this big and bold
       Set font-size to at least 3rem
       Set margin-bottom to --space-md
       Set color to white (override the heading default)
    */
}

.hero__subtitle {
    /* TODO: Style the subtitle
       Set font-size to 1.25rem
       Set max-width to 600px and center it with margin: 0 auto
       Add slight transparency with opacity: 0.9
    */
}


/* ===========================
   7. RECIPE INTRO
   =========================== */

.recipe-intro {
    /* TODO: Add vertical padding using --space-xxl */
}

.recipe-intro .container {
    /* TODO: Use display: flex to put the text and image side by side
       Set gap to --space-xl
       Set align-items: center
    */
}

.recipe-intro__content {
    /* TODO: Set flex: 1 so it shares space with the image */
}

.recipe-intro__content p {
    /* TODO: Add margin-bottom to space out paragraphs
       Set color to --color-text-light for a softer look
    */
}

.recipe-intro__image {
    /* TODO: Set flex: 1 so it shares space with the text */
}

.recipe-image {
    /* TODO: Set border-radius using --radius-lg
       Add a box-shadow using --shadow-md
       Add a transition on transform
    */
}

.recipe-image:hover {
    /* TODO: Add transform: scale(1.03) for a subtle zoom on hover */
}

.section-title {
    /* TODO: Style all section titles consistently
       Set font-size to 2rem
       Add margin-bottom using --space-lg
       Consider adding a bottom border with padding-bottom for a decorative underline
       Use --color-accent or --color-primary for the border color
    */
}


/* ===========================
   8. INGREDIENTS
   =========================== */

.ingredients {
    /* TODO: Set a background-color to differentiate this section (try --color-surface or a light tint)
       Add vertical padding
    */
}

.ingredients__grid {
    /* TODO: Use display: flex (or grid) to create a 3-column layout for the cards
       Add gap between cards
    */
}

.ingredient-card {
    /* TODO: Style each ingredient card
       Set flex: 1 so they share space equally
       Set background-color, padding, border-radius, and box-shadow
       Add a border-top (3px solid) using --color-accent for a pop of color
       Add a transition on transform and box-shadow
    */
}

.ingredient-card:hover {
    /* TODO: Lift the card on hover
       transform: translateY(-4px)
       Increase the box-shadow
    */
}

.ingredient-card__title {
    /* TODO: Style the card heading
       Set font-size, margin-bottom, and color
    */
}

.ingredient-card__list {
    /* TODO: Style the ingredient list
       Set list-style-type (try disc or circle)
       Add padding-left so bullets are visible
       Add spacing between items with li margin-bottom
    */
}

.ingredient-card__list li {
    /* TODO: Add margin-bottom for spacing between list items
       Set color to --color-text-light
    */
}


/* ===========================
   9. STEPS / INSTRUCTIONS
   =========================== */

.steps {
    /* TODO: Add vertical padding */
}

.steps__list {
    /* TODO: Remove default list styling (or customize the numbers)
       Set max-width for readability (try 800px)
       Center with margin: 0 auto
       Use counter-reset if you want custom-styled numbers
    */
    list-style: none;
    counter-reset: step-counter;
}

.step {
    /* TODO: Style each step
       Add padding and margin-bottom
       Add a left border using --color-accent (try 3px solid)
       Add padding-left for spacing from the border
       Add a transition on border-color
    */
}

.step:hover {
    /* TODO: Change border-color to --color-primary on hover */
}

.step__title {
    /* TODO: Style step headings
       Set font-size and margin-bottom
       Consider using a counter to add step numbers:
       - Use counter-increment: step-counter on .step
       - Use .step__title::before with content: "Step " counter(step-counter) ": "
    */
}

.step__text {
    /* TODO: Set color to --color-text-light
       Set line-height for readability
    */
}


/* ===========================
   10. CONTACT FORM
   =========================== */

.contact {
    /* TODO: Set background using a gradient or solid color
       Use --color-primary-dark for a dark section
       Set color to white
       Add generous vertical padding
    */
}

.contact .section-title {
    /* TODO: Override the section title color to white for this dark section */
}

.contact p {
    /* TODO: Add margin-bottom and set opacity for softer white text */
}

.form {
    /* TODO: Set max-width (try 600px) and center it
       Add margin-top for spacing from the intro text
    */
}

.form__group {
    /* TODO: Add margin-bottom to space out form fields */
}

.form__label {
    /* TODO: Set display: block so labels appear above inputs
       Add margin-bottom (small, like --space-xs)
       Set font-weight to 500 or 600
       Set font-size to 0.9rem
    */
}

.form__input {
    /* TODO: Style form inputs
       Set width: 100%
       Add padding (--space-sm or --space-md)
       Set border: 1px solid with a semi-transparent white (rgba(255,255,255,0.3))
       Set border-radius using --radius-sm
       Set background-color to rgba(255, 255, 255, 0.1) for a glassmorphism effect
       Set color to white
       Set font-size to 1rem
       Add a transition on border-color and background-color
    */
}

.form__input:focus {
    /* TODO: Style the focused state
       Set outline: none (we'll provide our own focus indicator)
       Change border-color to --color-accent or white
       Change background-color to rgba(255, 255, 255, 0.15)
    */
}

.form__input::placeholder {
    /* TODO: Set color to rgba(255, 255, 255, 0.5) */
}

.form__textarea {
    /* TODO: Set resize: vertical so users can only resize vertically */
}


/* ===========================
   11. BUTTON
   =========================== */

.btn {
    /* TODO: Style the base button
       Set display: inline-block
       Set padding, font-size, font-weight
       Remove border (border: none)
       Set border-radius
       Set cursor: pointer
       Add a transition on background-color, transform, and box-shadow
    */
}

.btn--primary {
    /* TODO: Style the primary button variant
       Set background-color using --color-accent
       Set color to --color-primary-dark (dark text on gold button)
    */
}

.btn--primary:hover {
    /* TODO: Lighten the background slightly
       Add transform: translateY(-2px) for the lift effect
       Add a box-shadow
    */
}

.btn--primary:active {
    /* TODO: Bring the button back down
       transform: translateY(0)
       Reduce the box-shadow
    */
}


/* ===========================
   12. FOOTER
   =========================== */

.footer {
    /* TODO: Style the footer
       Set background-color using --color-primary-dark
       Set color to white (with slight transparency)
       Set text-align: center
       Add padding
    */
}

.footer__link {
    /* TODO: Style footer links
       Set color to --color-accent
       Add a transition
    */
}

.footer__link:hover {
    /* TODO: Change color to white or lighten it */
}
```

---

## Requirements Checklist

Before you consider this project complete, make sure you've hit these marks:

### Must-Haves

- [ ] **CSS reset** at the top of your stylesheet (`box-sizing: border-box`, margin/padding reset)
- [ ] **CSS custom properties** for all colors, fonts, spacing, and transitions (at least 15 variables)
- [ ] **Google Fonts** loaded in the HTML `<head>` and applied via `font-family`
- [ ] **Color scheme** applied consistently using your CSS variables, no random hardcoded hex values in component styles
- [ ] **Navigation hover effects** with smooth transitions (color change, background change, or both)
- [ ] **At least 3 transitions** on different elements (buttons, cards, images, links, form inputs, pick any three)
- [ ] **Box model usage**: padding for internal spacing, margin for external spacing, border and border-radius for visual definition
- [ ] **Styled form** with custom input styles, focus states, and a styled submit button
- [ ] **Styled images** with border-radius and/or box-shadow
- [ ] **Organized CSS** following the structure in the starter (reset, variables, base, layout, components, sections)

### Nice-to-Haves

- [ ] BEM naming convention used throughout
- [ ] Step numbers displayed using CSS counters (`counter-reset`, `counter-increment`, `::before`)
- [ ] Smooth-scrolling when clicking nav links (`html { scroll-behavior: smooth; }`)
- [ ] A sticky navigation bar (`position: sticky; top: 0;`)

---

## Stretch Goals

If you've completed everything above and want an extra challenge:

### Dark Mode Toggle (CSS Only)

Create a `.dark-mode` class that overrides your CSS variables:

```css
.dark-mode {
    --color-bg: #1a1210;
    --color-surface: #2C170B;
    --color-text: #f5f0eb;
    --color-text-light: #c9b99a;
    --color-border: #4a3828;
}
```

Add a button in your HTML and this JavaScript to toggle it:

```html
<button onclick="document.body.classList.toggle('dark-mode')" class="btn" style="position: fixed; bottom: 20px; right: 20px;">
    Toggle Dark Mode
</button>
```

Because your entire stylesheet uses CSS variables, toggling dark mode takes just a few variable overrides. That's what a variable-based design system gives you.

### Animated Hero

Add a subtle animation to the hero title when the page loads:

```css
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.hero__title {
    animation: fadeInUp 0.8s ease forwards;
}

.hero__subtitle {
    animation: fadeInUp 0.8s ease 0.2s forwards;
    opacity: 0;  /* Start hidden, the animation fills to opacity: 1 */
}
```

---

## Submission Checklist

When you're done, verify:

1. Open `index.html` in your browser. Does it look polished and intentional?
2. Hover over buttons, cards, nav links, and images. Do transitions play smoothly?
3. Click into form fields. Do focus styles appear clearly?
4. Resize the browser window. Does anything break or overflow horizontally? (Full responsive design comes in a later module, but nothing should look broken.)
5. View your CSS file. Is it organized with clear section comments? Are there any hardcoded colors that should be variables?
6. Inspect elements with DevTools. Do the box model values make sense?
7. Check your HTML `<head>`. Is the Google Fonts `<link>` loading before your stylesheet?

You did it. You took a plain HTML document and turned it into something that looks and feels professional. That's a real skill, and you should be proud of the work you put in.

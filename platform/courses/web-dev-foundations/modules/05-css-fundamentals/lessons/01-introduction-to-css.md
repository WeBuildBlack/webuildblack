---
title: "Introduction to CSS"
estimatedMinutes: 40
isFreePreview: true
---

# Introduction to CSS

You just spent Module 04 building web pages with HTML. You created headings, paragraphs, lists, images, links, and forms. Everything worked, but let's be honest, it looked pretty plain. White background, black text, Times New Roman font. Your content was solid, but the presentation? Not quite there yet.

That's about to change. Welcome to CSS.

---

## What Is CSS?

**CSS** stands for **Cascading Style Sheets**. It's the language that controls how your HTML looks: colors, fonts, spacing, layout, animations, and everything visual.

Here's an analogy that makes it click: think of building a house.

- **HTML** is the **structure**: the walls, the rooms, the doors, the windows. It defines *what's there*.
- **CSS** is the **interior design and exterior paint**: the wall colors, the flooring, the furniture arrangement, the landscaping. It defines *how it looks*.

You could live in a house with bare drywall and concrete floors. It's functional. But CSS is what makes it feel like *home*.

Another way to think about it: if HTML is a person's skeleton and organs (the structure that makes everything work), CSS is the skin, the hair, the clothing, the accessories. Same person underneath, completely different presentation.

Every website you've ever visited uses CSS. That sleek landing page with the smooth animations? CSS. The bold typography on your favorite blog? CSS. The color scheme that makes a brand instantly recognizable? CSS.

---

## The Relationship Between HTML and CSS

HTML and CSS are partners, but they have separate jobs:

| HTML | CSS |
|------|-----|
| Defines content and structure | Defines presentation and style |
| Uses elements and tags | Uses selectors and properties |
| "This is a heading" | "Make this heading blue and 36px" |
| "This is a navigation menu" | "Make this menu horizontal with spacing" |
| "This is an image" | "Make this image rounded with a shadow" |

This separation is intentional and powerful. It means you can completely change how a website looks without touching any of the HTML. New brand colors? Update the CSS. Want a dark mode? CSS. Redesign for a new year? CSS. Same content, fresh look.

---

## Three Ways to Add CSS

There are three ways to apply CSS to your HTML. Let's look at all three, then talk about which one you should actually use.

### 1. Inline Styles

You can add styles directly to any HTML element using the `style` attribute:

```html
<h1 style="color: blue; font-size: 36px;">Welcome to My Site</h1>
<p style="color: gray; line-height: 1.6;">This is a paragraph with inline styles.</p>
```

**The problem**: Imagine styling every single element this way. If you have 50 paragraphs and want to change the color, you'd have to edit all 50 lines. It's like painting each wall in your house one brushstroke at a time with a different can of paint. Tedious and impossible to maintain.

**When it's OK**: Almost never. You might see it in emails or quick prototyping, but avoid it for real projects.

### 2. Internal Stylesheet (The `<style>` Tag)

You can write CSS rules inside a `<style>` tag in the `<head>` of your HTML document:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>My Page</title>
    <style>
        h1 {
            color: blue;
            font-size: 36px;
        }
        p {
            color: gray;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <h1>Welcome to My Site</h1>
    <p>This paragraph is styled from the style tag above.</p>
    <p>This one is too, automatically!</p>
</body>
</html>
```

**Better**: Now one rule applies to all `<p>` elements. Change it once, it changes everywhere on the page.

**The problem**: These styles only apply to *this one HTML file*. If your website has 10 pages, you'd need to copy the same styles into each one. Change a color? Update 10 files.

**When it's OK**: Quick demos, single-page experiments, or when you're learning (like right now).

### 3. External Stylesheet (The Best Way)

You write your CSS in a separate `.css` file and link it to your HTML:

**styles.css**:
```css
h1 {
    color: blue;
    font-size: 36px;
}

p {
    color: gray;
    line-height: 1.6;
}
```

**index.html**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>My Page</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <h1>Welcome to My Site</h1>
    <p>Styled from an external file!</p>
</body>
</html>
```

**Why this is the best approach**:
- **One file, many pages**: Link the same `styles.css` to every page on your site. Change it once, it updates everywhere.
- **Separation of concerns**: Your HTML stays clean and focused on content. Your CSS stays organized and focused on presentation.
- **Caching**: The browser downloads `styles.css` once and reuses it on every page, making your site faster.
- **Collaboration**: A designer can work on the CSS while a developer works on the HTML.

**This is what professionals use.** From this point forward, we'll use external stylesheets for everything.

---

## Linking a CSS File

Let's break down that `<link>` tag:

```html
<link rel="stylesheet" href="styles.css">
```

- `<link>`: a self-closing tag that connects an external resource
- `rel="stylesheet"`: tells the browser "this linked file is a stylesheet"
- `href="styles.css"`: the path to your CSS file (just like how `href` works on links and `src` works on images, from Module 04)

The `<link>` tag always goes in the `<head>` section, because the browser needs to know about styles *before* it starts rendering the page.

If your CSS file is in a subfolder:

```html
<!-- CSS file is in a "css" folder -->
<link rel="stylesheet" href="css/styles.css">
```

---

## Your First CSS Rule

Every CSS rule follows this pattern:

```css
selector {
    property: value;
}
```

Let's break it down:

- **Selector**: *what* you want to style (which HTML elements)
- **Property**: *what aspect* you want to change (color, size, spacing, etc.)
- **Value**: *how* you want to change it (blue, 20px, center, etc.)
- The property and value together, ending with a semicolon, are called a **declaration**
- Everything between the curly braces `{ }` is the **declaration block**

Here's a real example:

```css
/* Select all <h1> elements */
h1 {
    color: darkblue;         /* Change the text color */
    font-size: 36px;         /* Set the font size to 36 pixels */
    text-align: center;      /* Center the text */
}
```

You can have multiple declarations in one rule, and multiple rules in one stylesheet:

```css
/* Style the main heading */
h1 {
    color: darkblue;
    font-size: 36px;
    text-align: center;
}

/* Style all paragraphs */
p {
    color: #333333;
    font-size: 18px;
    line-height: 1.6;
}

/* Style all links */
a {
    color: coral;
    text-decoration: none;
}
```

Notice how each rule targets a different HTML element and applies its own set of styles. When the browser loads your HTML and CSS together, it matches up the selectors with the corresponding elements and applies the styles.

---

## How the Browser Applies Styles

When you load a web page, the browser does something like this:

1. Downloads and reads your HTML file
2. Finds the `<link>` tag and downloads your CSS file
3. Goes through every CSS rule and figures out which HTML elements each rule applies to
4. Applies the styles in order, from top to bottom

But here's where it gets interesting. What happens if two rules try to style the same element?

```css
p {
    color: blue;
}

p {
    color: red;
}
```

Which color wins? **Red**, because it comes *last*. When two rules have the same level of importance, the one that appears later in the file wins. This is part of what makes CSS "cascading." Styles flow down like a waterfall, and the last one to land takes effect.

We'll dig much deeper into how the browser decides which styles win in the next lesson on selectors and specificity. For now, just know: **order matters**.

The browser also applies some default styles before your CSS even loads. That's why an unstyled `<h1>` is big and bold, and a `<p>` has some spacing. These are called **user agent styles**, the browser's built-in defaults. Your CSS overrides them.

---

## CSS Comments

Just like HTML has comments (`<!-- like this -->`), CSS has its own comment syntax:

```css
/* This is a CSS comment */
/* The browser ignores everything between these markers */

h1 {
    color: darkblue;    /* This comment explains this specific line */
    font-size: 36px;
}

/*
   You can write multi-line comments too.
   Great for section headers in long stylesheets:
*/

/* =====================
   HEADER STYLES
   ===================== */
```

Use comments to:
- Explain *why* you made a styling choice (not just *what* the code does)
- Organize your stylesheet into sections
- Temporarily disable a style while debugging

---

## Setting Up Your Practice Project

Let's set up a mini project you'll use throughout this module. Create two files in the same folder:

**index.html**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CSS Practice</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>Learning CSS</h1>
        <p>My journey into web styling</p>
    </header>

    <nav>
        <a href="#">Home</a>
        <a href="#">About</a>
        <a href="#">Projects</a>
        <a href="#">Contact</a>
    </nav>

    <main>
        <section>
            <h2>What I'm Building</h2>
            <p>I'm learning to style web pages with CSS. Every lesson brings me closer to building beautiful, professional websites.</p>
            <p>This is my practice playground where I'll experiment with colors, fonts, spacing, and more.</p>
        </section>

        <section>
            <h2>My Skills</h2>
            <ul>
                <li>HTML fundamentals</li>
                <li>Document structure</li>
                <li>Forms and inputs</li>
                <li>Semantic HTML</li>
            </ul>
        </section>
    </main>

    <footer>
        <p>&copy; 2026 My CSS Practice Page</p>
    </footer>
</body>
</html>
```

**styles.css**:
```css
/* =====================
   CSS PRACTICE STYLESHEET
   ===================== */

/* Body styles */
body {
    font-family: Arial, sans-serif;
    color: #333333;
    background-color: #f5f5f5;
    line-height: 1.6;
}

/* Header styles */
h1 {
    color: #2C170B;
    font-size: 36px;
    text-align: center;
}

/* Paragraph styles */
p {
    font-size: 18px;
}

/* Link styles */
a {
    color: #7D4E21;
    text-decoration: none;
}
```

Open `index.html` in your browser. You should see your page with brown headings, a light gray background, and styled links. Now try changing some values in `styles.css`, save the file, and refresh your browser. See the changes instantly.

This is the feedback loop of CSS: write, save, refresh, see. Get comfortable with it, because you'll be doing it a lot.

---

## Key Takeaways

1. **CSS controls presentation.** It defines how your HTML content looks, including colors, fonts, spacing, and layout.
2. **HTML and CSS have separate jobs.** HTML handles structure and content, CSS handles visual presentation. Keep them separate.
3. **There are three ways to add CSS.** Inline styles, internal `<style>` tag, and external stylesheets. External stylesheets are the professional standard.
4. **The `<link>` tag connects CSS to HTML.** It goes in the `<head>` and points to your `.css` file with `href`.
5. **CSS rules follow a pattern.** `selector { property: value; }` is the fundamental building block of all CSS.
6. **The cascade means order matters.** When two identical selectors conflict, the one that comes last wins.
7. **CSS comments use `/* */` syntax.** Use them to organize and explain your stylesheets.

---

## Try It Yourself

1. Create the practice project above (both `index.html` and `styles.css`).
2. Change the `background-color` of the `body` to `#FFFFFF` (white) and see the difference.
3. Change the `h1` color to any color you like. Try `tomato`, `steelblue`, or `#FF6347`.
4. Add a new CSS rule that styles the `<footer>`. Give it a background color and center-aligned text.
5. Add a CSS rule that makes all `<li>` elements a different color from the paragraphs.
6. Try commenting out a rule (wrap it in `/* */`) and refresh. Notice how the browser falls back to its default styles.
7. Experiment! Break things! The best way to learn CSS is to change values and see what happens.

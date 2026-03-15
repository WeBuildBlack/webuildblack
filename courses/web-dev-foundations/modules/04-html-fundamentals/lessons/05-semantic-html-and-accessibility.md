---
title: "Semantic HTML and Accessibility"
estimatedMinutes: 40
---

# Semantic HTML and Accessibility

You now know how to build web pages with text, links, images, and forms. But there is a difference between a page that *works* and a page that is *well-built*. In this lesson, you will learn how to write HTML that is meaningful, organized, and usable by everyone -- including people with disabilities.

This is not a bonus topic. This is not a nice-to-have. Accessibility is a core skill that every professional web developer must understand. Over one billion people worldwide live with some form of disability. Building accessible websites is both the right thing to do and, in many cases, a legal requirement.

---

## What Is Semantic HTML?

The word **semantic** means "relating to meaning." Semantic HTML means using elements that **describe what their content is**, not just how it looks.

Think of it like **a building with clear signage versus blank walls**. Imagine walking into a large building where every door, hallway, and room looks identical -- no signs, no labels, no room numbers. You would have no idea where anything is. Now imagine the same building with clear signs: "Lobby," "Restrooms," "Conference Room A," "Exit." You can navigate instantly.

HTML works the same way. You could build an entire website using nothing but `<div>` elements (generic containers), and it would look fine in a browser. But to search engines, screen readers, and other software, it would be a building with blank walls. Nobody would know what anything means.

### `<div>` vs. Semantic Elements

The `<div>` element is a **generic container**. It has no meaning. It just groups things together:

```html
<!-- This works, but it tells us nothing about what's inside -->
<div>
  <div>We Build Black</div>
  <div>
    <div>Home</div>
    <div>Programs</div>
    <div>About</div>
  </div>
</div>
<div>
  <div>
    <div>Welcome to WBB</div>
    <div>We empower the Black community through tech education.</div>
  </div>
</div>
<div>
  <div>Copyright 2026 We Build Black</div>
</div>
```

A screen reader reads this as: "group, group, group, group, group..." The user has no idea what any of these sections are.

Now look at the same content with semantic elements:

```html
<header>
  <h1>We Build Black</h1>
  <nav>
    <a href="/">Home</a>
    <a href="/programs">Programs</a>
    <a href="/about">About</a>
  </nav>
</header>
<main>
  <section>
    <h2>Welcome to WBB</h2>
    <p>We empower the Black community through tech education.</p>
  </section>
</main>
<footer>
  <p>Copyright 2026 We Build Black</p>
</footer>
```

A screen reader reads this as: "banner, navigation with 3 links, main content, section heading: Welcome to WBB, footer." The user knows exactly where they are and can jump to any section instantly.

The visual result in the browser is nearly identical. The difference is entirely in **meaning** -- and that meaning matters enormously.

---

## The Semantic Elements

HTML5 introduced a set of elements specifically designed to describe the structure of a web page. Let's learn each one.

### `<header>`

The `<header>` element represents **introductory content** at the top of a page or section. It typically contains the site logo, site name, and navigation:

```html
<header>
  <img src="wbb-logo.svg" alt="We Build Black logo">
  <h1>We Build Black</h1>
  <nav>
    <a href="/">Home</a>
    <a href="/programs">Programs</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
  </nav>
</header>
```

A page can have multiple `<header>` elements -- for example, the page header and a header within an `<article>`. But most pages have one primary header at the top.

### `<nav>`

The `<nav>` element represents a **section of navigation links**. It tells screen readers: "This is a set of links for navigating the site."

```html
<nav>
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/programs">Programs</a></li>
    <li><a href="/about">About</a></li>
    <li><a href="/contact">Contact</a></li>
  </ul>
</nav>
```

Use `<nav>` for major navigation blocks (main menu, sidebar menu, footer links). You do not need it for every single group of links -- just the primary navigation sections.

### `<main>`

The `<main>` element represents the **primary content** of the page -- the content that is unique to this page and not repeated across other pages (unlike the header, nav, and footer, which usually appear on every page):

```html
<main>
  <h2>Our Programs</h2>
  <p>We offer several programs designed to empower our community...</p>
  <!-- All the main page content goes here -->
</main>
```

**There should be only one `<main>` element per page.** This element is crucial for screen reader users because they can use a keyboard shortcut to jump directly to the main content, skipping the header and navigation.

### `<section>`

The `<section>` element represents a **thematic grouping of content**, usually with a heading:

```html
<main>
  <section>
    <h2>Workforce Training</h2>
    <p>Our workforce programs prepare members for careers in tech...</p>
  </section>

  <section>
    <h2>Youth Programs</h2>
    <p>Crowns of Code introduces young people to programming...</p>
  </section>

  <section>
    <h2>Community Events</h2>
    <p>We host monthly meetups, workshops, and our annual conference...</p>
  </section>
</main>
```

Each `<section>` should have a heading (`<h2>`, `<h3>`, etc.) that describes its content. If you cannot think of a heading for a group of content, it might be better as a `<div>`.

### `<article>`

The `<article>` element represents a **self-contained, independently distributable piece of content**. If you could take the content out of the page and it would still make sense on its own (like in an RSS feed or email), it is an article:

```html
<article>
  <h2>Fast Track Winter 2026 Cohort Graduates</h2>
  <p><time datetime="2026-03-01">March 1, 2026</time></p>
  <p>We are proud to announce that all 12 members of our Winter 2026
  Fast Track cohort have successfully completed the program...</p>
</article>
```

Blog posts, news articles, forum posts, user comments, and product cards are all good candidates for `<article>`.

### `<aside>`

The `<aside>` element represents content that is **tangentially related** to the surrounding content. Think of it like a sidebar or a pull-quote in a magazine:

```html
<main>
  <article>
    <h2>Getting Started with HTML</h2>
    <p>HTML is the foundation of every website...</p>

    <aside>
      <h3>Did You Know?</h3>
      <p>HTML was invented by Tim Berners-Lee in 1991. The first
      website ever created is still online at info.cern.ch.</p>
    </aside>

    <p>To start writing HTML, you need a text editor...</p>
  </article>
</main>
```

Sidebars, pull-quotes, related links, advertisements, and "fun fact" boxes are good uses for `<aside>`.

### `<footer>`

The `<footer>` element represents **closing content** at the bottom of a page or section:

```html
<footer>
  <p>&copy; 2026 We Build Black. All rights reserved.</p>
  <nav>
    <a href="/privacy">Privacy Policy</a>
    <a href="/terms">Terms of Service</a>
  </nav>
  <p>147 Front Street, Brooklyn, NY 11201</p>
</footer>
```

Like `<header>`, a page can have multiple `<footer>` elements -- a page footer and footers within articles or sections.

---

## When to Use `<div>` vs. Semantic Elements

The rule is simple: **use a semantic element when one fits. Use `<div>` when none do.**

Here is a decision guide:

| Content | Use This Element |
|---------|-----------------|
| Site logo, name, and top navigation | `<header>` |
| Navigation links | `<nav>` |
| The main unique content of the page | `<main>` |
| A thematic group with a heading | `<section>` |
| A self-contained piece (blog post, card) | `<article>` |
| Sidebar, pull-quote, related info | `<aside>` |
| Copyright, bottom links, contact info | `<footer>` |
| A generic container for styling purposes | `<div>` |

`<div>` is not bad. It is just meaningless. If you need a container purely for visual layout (like wrapping elements so you can style them with CSS), `<div>` is the right choice. But if the content has a clear purpose, use the semantic element that matches.

---

## Introduction to Web Accessibility (a11y)

**Accessibility** (often abbreviated as **a11y** -- "a," then 11 letters, then "y") means designing websites that can be used by everyone, including people with disabilities.

Here are some of the ways people experience the web differently:

- **Blind users** use screen readers that read the page aloud and navigate by keyboard.
- **Low-vision users** may zoom in to 200-400% or use high-contrast color schemes.
- **Deaf users** need captions and transcripts for audio and video content.
- **Motor-impaired users** may navigate entirely with a keyboard, voice commands, or a switch device instead of a mouse.
- **Cognitive disabilities** mean some users need clear language, consistent navigation, and simple layouts.

Accessibility is not about building a separate "accessible version" of your site. It is about building **one site that works for everyone**. And the foundation of accessibility is the HTML you write.

---

## ARIA Labels and Roles

Sometimes semantic HTML alone is not enough to communicate the purpose of an element. **ARIA** (Accessible Rich Internet Applications) provides additional attributes that help screen readers understand your content.

### `aria-label`

Provides an accessible name for an element when the visible text is not sufficient:

```html
<!-- The link text "X" is not descriptive. aria-label helps. -->
<a href="https://twitter.com/webuildblack" aria-label="We Build Black on Twitter">
  X
</a>

<!-- A search button with just an icon -->
<button aria-label="Search">
  🔍
</button>
```

### `aria-labelledby`

Points to another element whose text serves as the label:

```html
<h2 id="programs-heading">Our Programs</h2>
<nav aria-labelledby="programs-heading">
  <a href="/fast-track">Fast Track</a>
  <a href="/the-bridge">The Bridge</a>
</nav>
```

### `role`

Explicitly defines the role of an element. This is mainly useful when you cannot use the right semantic element for some reason:

```html
<!-- If you must use a <div> as a button (not recommended, but sometimes necessary) -->
<div role="button" tabindex="0">Click Me</div>

<!-- Better: just use a <button> and you get the role for free -->
<button>Click Me</button>
```

**The first rule of ARIA: do not use ARIA if a native HTML element will do the job.** A `<button>` already tells screen readers it is a button. A `<nav>` already tells screen readers it is navigation. ARIA is a supplement, not a replacement for semantic HTML.

---

## Alt Text Best Practices

You learned about the `alt` attribute in Lesson 3, but let's go deeper because alt text is one of the most impactful things you can do for accessibility.

### Good Alt Text Describes the Content and Function

Ask yourself: "If I could not see this image, what information would I be missing?"

```html
<!-- Photo: describe what's in it -->
<img src="team.jpg" alt="Five We Build Black team members standing together at the 2025 Mavens I/O Conference, smiling at the camera">

<!-- Logo that links to homepage: describe the function -->
<a href="/"><img src="logo.svg" alt="We Build Black - go to homepage"></a>

<!-- Chart or graph: describe the data -->
<img src="growth-chart.png" alt="Bar chart showing WBB membership growth from 500 members in 2020 to 3,000 in 2025">

<!-- Decorative image: empty alt -->
<img src="divider.png" alt="">
```

### Alt Text Guidelines

1. **Be specific, not vague.** "Team photo" tells you nothing. "Five team members at a conference" paints a picture.
2. **Keep it concise.** One to two sentences is usually enough. Do not write a paragraph.
3. **Do not start with "Image of..." or "Picture of..."** Screen readers already announce it as an image. Starting with those words is redundant.
4. **Describe the function for linked images.** If clicking the image does something, describe what it does, not what it looks like.
5. **Use empty alt (`alt=""`) for decorative images.** This tells screen readers to skip them entirely.

---

## Keyboard Navigation

Not everyone uses a mouse. Many users navigate websites entirely with their keyboard using the **Tab** key to move between interactive elements (links, buttons, form fields) and **Enter** to activate them.

Your HTML is keyboard-accessible by default -- **if you use the right elements**:

```html
<!-- These are all keyboard-accessible out of the box -->
<a href="/about">About Us</a>
<button>Submit</button>
<input type="text" name="email">
<select name="role"><option>Frontend</option></select>
```

Problems arise when developers use the wrong elements:

```html
<!-- PROBLEM: <div> is not focusable by keyboard -->
<div onclick="doSomething()">Click me</div>

<!-- SOLUTION: Use a <button> instead -->
<button onclick="doSomething()">Click me</button>
```

A `<div>` with a click handler is invisible to keyboard users -- they cannot Tab to it, and pressing Enter does nothing. A `<button>` is focusable, activatable with Enter or Space, and announced by screen readers as a button. Always use the right element for the job.

### Focus Order

The order elements appear in your HTML determines the order a keyboard user tabs through them. Make sure your HTML source order matches the visual order on the page. If someone tabs through your form fields and the cursor jumps randomly around the page, your source order needs fixing.

### Skip Links

For pages with a lot of navigation at the top, add a "skip to content" link that lets keyboard users jump directly to the main content:

```html
<body>
  <!-- This link is usually hidden visually but available to screen readers and keyboard users -->
  <a href="#main-content" class="skip-link">Skip to main content</a>

  <header>
    <nav>
      <!-- Many navigation links here -->
    </nav>
  </header>

  <main id="main-content">
    <h1>Page Title</h1>
    <!-- Main content -->
  </main>
</body>
```

Without this, a keyboard user has to Tab through every navigation link on every page just to get to the content. Skip links are a small addition that makes a huge difference.

---

## Color Contrast

Even though color is styled with CSS, the decisions start in your HTML planning. Text must have sufficient contrast against its background so that people with low vision or color blindness can read it.

The **Web Content Accessibility Guidelines (WCAG)** require:

- **Normal text**: A contrast ratio of at least **4.5:1**
- **Large text** (18px bold or 24px regular): A contrast ratio of at least **3:1**

You can check contrast ratios with free tools:

- **WebAIM Contrast Checker**: [https://webaim.org/resources/contrastchecker/](https://webaim.org/resources/contrastchecker/)
- **Chrome DevTools**: Inspect an element, and Chrome shows the contrast ratio in the color picker.

For reference, WBB's brand colors:

| Color | Hex | Good contrast on white? |
|-------|-----|------------------------|
| Dark brown | #2C170B | Yes (ratio 14.4:1) |
| Medium brown | #7D4E21 | Yes (ratio 5.7:1) |
| Warm brown | #AE8156 | Borderline (ratio 3.3:1) -- use only for large text |
| White | #FFFFFF | Use on dark backgrounds |

Always test your color combinations. What looks readable to you might not be readable to someone with a visual impairment.

---

## Screen Readers: How They Interpret Your HTML

Understanding how screen readers work will change the way you write HTML.

A screen reader does not see your page the way you do. It reads the **HTML source code** and creates an **accessibility tree** -- a simplified version of the page that represents every element, its role, its name, and its state.

Here is what a screen reader announces for different elements:

| HTML | Screen Reader Announces |
|------|------------------------|
| `<h1>Welcome</h1>` | "Heading level 1, Welcome" |
| `<a href="/about">About Us</a>` | "Link, About Us" |
| `<button>Submit</button>` | "Button, Submit" |
| `<img src="..." alt="Team photo">` | "Image, Team photo" |
| `<nav>...</nav>` | "Navigation" |
| `<main>...</main>` | "Main" |
| `<input type="text" id="name"><label for="name">Full Name</label>` | "Full Name, text field" |
| `<div>Some text</div>` | "Some text" (no role announced) |

See the pattern? Semantic elements give screen readers context. A `<div>` with text in it is just... text. A `<button>` is announced as a button. A `<nav>` is announced as navigation. The more semantic your HTML, the more usable your site is for screen reader users.

### Screen Reader Navigation

Screen reader users do not read a page top to bottom. They navigate by **landmarks** (header, nav, main, footer), **headings** (h1 through h6), **links**, and **form fields**. This is why:

- Your **heading hierarchy matters** -- it is an outline of your page.
- Your **landmark elements matter** -- they are the map of your page.
- Your **link text matters** -- links are often read out of context.
- Your **labels matter** -- they give form fields their names.

---

## Testing Accessibility

You do not need to be an accessibility expert to test your pages. Here are practical steps you can take right now:

### 1. Navigate with Your Keyboard

Put your mouse away. Open your page and try to use it with only the keyboard:

- **Tab** to move forward through interactive elements.
- **Shift+Tab** to move backward.
- **Enter** to follow a link or press a button.
- **Space** to check a checkbox or press a button.
- **Arrow keys** to choose radio buttons or navigate dropdowns.

Can you reach every link, button, and form field? Can you see which element is focused? If not, there are accessibility problems to fix.

### 2. Check Your Headings

Look at your headings. Do they form a logical outline?

```
h1: We Build Black
  h2: Our Programs
    h3: Fast Track
    h3: Crowns of Code
  h2: Get Involved
    h3: Volunteer
    h3: Donate
```

If the outline does not make sense, restructure your headings.

### 3. Check All Images for Alt Text

Every `<img>` must have an `alt` attribute. Meaningful images need descriptive text. Decorative images need `alt=""`.

### 4. Check All Form Fields for Labels

Every input must have a corresponding `<label>` with a matching `for`/`id` pair.

### 5. Use a Free Automated Tool

- **WAVE** (Web Accessibility Evaluation Tool): [https://wave.webaim.org/](https://wave.webaim.org/) -- paste your URL and it highlights issues.
- **Lighthouse** in Chrome DevTools: Open DevTools (F12), go to the Lighthouse tab, and run an accessibility audit. It scores your page and tells you exactly what to fix.

Automated tools catch about 30-40% of accessibility issues. Manual testing (keyboard navigation, reading alt text, checking headings) catches the rest.

---

## Putting It All Together

Create a file called `semantic-page.html` that demonstrates proper semantic structure:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>We Build Black - Empowering Through Tech Education</title>
  </head>
  <body>
    <a href="#main-content" class="skip-link">Skip to main content</a>

    <header>
      <h1>We Build Black</h1>
      <nav aria-label="Main navigation">
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/programs">Programs</a></li>
          <li><a href="/about">About</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </nav>
    </header>

    <main id="main-content">
      <section aria-labelledby="mission-heading">
        <h2 id="mission-heading">Our Mission</h2>
        <p>We Build Black empowers the Black community to achieve
        socio-economic change through <strong>technical education</strong>
        and <strong>professional development</strong>.</p>
      </section>

      <section aria-labelledby="programs-heading">
        <h2 id="programs-heading">Our Programs</h2>

        <article>
          <h3>Fast Track</h3>
          <p>A workforce training program that pairs members with mentors
          and provides stipends for completing technical milestones.</p>
        </article>

        <article>
          <h3>The Bridge</h3>
          <p>An 8-week interview accountability program where members
          practice together in small pods.</p>
        </article>

        <article>
          <h3>Crowns of Code</h3>
          <p>A youth coding program that introduces young people to
          programming through creative projects.</p>
        </article>
      </section>

      <aside>
        <h2>Community Impact</h2>
        <ul>
          <li><strong>3,000+</strong> community members</li>
          <li><strong>200+</strong> program graduates</li>
          <li><strong>85%</strong> job placement rate</li>
        </ul>
      </aside>

      <section aria-labelledby="contact-heading">
        <h2 id="contact-heading">Get in Touch</h2>
        <form action="#" method="post">
          <label for="name">Your Name</label><br>
          <input type="text" id="name" name="name" required><br><br>

          <label for="email">Your Email</label><br>
          <input type="email" id="email" name="email" required><br><br>

          <label for="message">Message</label><br>
          <textarea id="message" name="message" rows="4" cols="50" required></textarea><br><br>

          <button type="submit">Send Message</button>
        </form>
      </section>
    </main>

    <footer>
      <nav aria-label="Footer navigation">
        <a href="/privacy">Privacy Policy</a> |
        <a href="/terms">Terms of Service</a>
      </nav>
      <p>&copy; 2026 We Build Black. 147 Front Street, Brooklyn, NY 11201.</p>
      <p>
        <a href="mailto:info@webuildblack.com" aria-label="Email We Build Black">info@webuildblack.com</a>
      </p>
    </footer>
  </body>
</html>
```

Open this page and test it:

1. Tab through the entire page with your keyboard. Can you reach every link, button, and form field?
2. Look at the heading structure. Does it form a logical outline?
3. Check every image (there are none in this example, but in your own pages, check them all).
4. Notice how the two `<nav>` elements have different `aria-label` values so screen readers can tell them apart.

---

## Key Takeaways

1. **Semantic HTML uses elements that describe what content is**, not just how it looks. It gives meaning to your page structure.
2. **Use `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, and `<footer>`** instead of generic `<div>` elements whenever possible.
3. **Use `<div>` only when no semantic element fits** -- it is a generic container for styling purposes.
4. **Accessibility (a11y) means building websites usable by everyone**, including people who use screen readers, keyboard navigation, or assistive technologies.
5. **ARIA attributes supplement semantic HTML** with additional accessibility information. But always prefer native semantic elements first.
6. **Write descriptive alt text** for meaningful images. Use `alt=""` for decorative images.
7. **Test with your keyboard.** If you cannot navigate your page without a mouse, it is not accessible.

---

## Try It Yourself

Take the `about-me.html` file you created in Lesson 1 and improve it:

1. Add a `<header>` with a `<nav>` containing at least three links (they can point to `#` for now).
2. Wrap your main content in a `<main>` element.
3. Organize your content into at least two `<section>` elements, each with an appropriate heading.
4. Add an `<aside>` with a fun fact about yourself.
5. Add a `<footer>` with a copyright notice and your email address as a `mailto:` link.
6. Add a skip link at the very top: `<a href="#main-content">Skip to main content</a>`.
7. Test by tabbing through the entire page. Make sure every interactive element is reachable.

Then open Chrome DevTools (F12), go to the Lighthouse tab, and run an accessibility audit. Aim for a score of 90 or higher. If you get any errors, read the descriptions and fix them -- Lighthouse tells you exactly what to change.

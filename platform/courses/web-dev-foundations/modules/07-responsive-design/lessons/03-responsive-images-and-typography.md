---
title: "Responsive Images and Typography"
estimatedMinutes: 35
---

# Responsive Images and Typography

You have learned how to make your layouts adapt to different screen sizes. But what about the content *inside* those layouts? A perfectly responsive grid means nothing if the images inside it overflow their containers or the text is too tiny to read on a phone.

In this lesson, you are going to master two critical pieces of responsive design: **images that scale gracefully** and **typography that stays readable at every size**. These are the details that separate a page that merely "works" on mobile from one that *feels* like it was designed for mobile.

---

## The Essential Responsive Image Rule

Let's start with the single most important CSS rule for images. If you remember nothing else from this lesson, remember this:

```css
img {
  max-width: 100%;
  height: auto;
}
```

That is it. Two lines. Here is what they do:

- `max-width: 100%` -- The image will never be wider than its container. If the container is 300px wide, the image shrinks to 300px. If the container is 800px wide, the image scales up to 800px (but never beyond its natural size).
- `height: auto` -- The height adjusts proportionally. The image keeps its original aspect ratio instead of getting stretched or squished.

Without these rules, a 1200px-wide image in a 375px-wide phone container would stick out 825 pixels to the right, causing a horizontal scrollbar. With these rules, it scales down to fit.

Let's see it in context:

```css
/* Global reset - apply to ALL images */
img {
  max-width: 100%;
  height: auto;
  display: block;  /* Removes the tiny gap below images caused by inline display */
}
```

Adding `display: block` is a nice bonus. By default, images are inline elements, which means there is a small gap underneath them (to leave room for text descenders like the tail of a "g"). Setting `display: block` removes that gap. It is a common practice in CSS resets.

You might see some developers use `width: 100%` instead of `max-width: 100%`. Here is the difference:

```css
/* width: 100% - image ALWAYS fills container, even if it's smaller naturally */
img {
  width: 100%;
  height: auto;
}

/* max-width: 100% - image fills container but never stretches beyond its natural size */
img {
  max-width: 100%;
  height: auto;
}
```

`max-width: 100%` is generally better because it prevents small images from being stretched beyond their natural resolution, which makes them look blurry. Use `width: 100%` only when you specifically want the image to always fill its container, like a full-width hero image.

---

## The `<picture>` Element

Sometimes you need more control than a single `<img>` tag can give you. Maybe you want to:

- Show a **different image** on mobile vs. desktop (a cropped version vs. a wide panoramic shot)
- Serve **modern image formats** (like WebP) to browsers that support them, with a fallback for browsers that don't
- Load **smaller file sizes** on mobile to save bandwidth

The `<picture>` element handles all of this:

```html
<picture>
  <!-- If viewport is 1024px+ wide, use the wide landscape image -->
  <source media="(min-width: 1024px)" srcset="hero-wide.jpg">

  <!-- If viewport is 768px+ wide, use a medium crop -->
  <source media="(min-width: 768px)" srcset="hero-medium.jpg">

  <!-- Default (mobile): use the tall, portrait-oriented crop -->
  <img src="hero-mobile.jpg" alt="A community of developers working together">
</picture>
```

The browser evaluates the `<source>` elements from top to bottom and uses the first one whose `media` condition matches. If none match, it falls back to the `<img>` tag. The `<img>` tag is **required** inside `<picture>` -- it serves as both the fallback and the place where you put your `alt` text.

### Serving Modern Image Formats

You can also use `<picture>` to serve different file formats:

```html
<picture>
  <!-- Modern browsers: use AVIF (smallest file size) -->
  <source type="image/avif" srcset="photo.avif">

  <!-- Fallback: use WebP (good compression, wide support) -->
  <source type="image/webp" srcset="photo.webp">

  <!-- Last resort: JPEG (universally supported) -->
  <img src="photo.jpg" alt="Students collaborating at a coding workshop">
</picture>
```

The browser picks the first format it supports. This means modern browsers get tiny, efficient AVIF files while older browsers still get a perfectly fine JPEG. Everyone wins.

### When to Use Each Image Format

| Format | Best For | File Size | Browser Support |
|--------|----------|-----------|-----------------|
| **AVIF** | Photos, complex images | Smallest | Modern browsers (Chrome, Firefox, Safari 16+) |
| **WebP** | Photos and graphics | Small | All modern browsers |
| **JPEG** | Photos | Medium | Everything |
| **PNG** | Graphics with transparency | Larger | Everything |
| **SVG** | Icons, logos, illustrations | Tiny (vector) | Everything |

For most projects, serving WebP with a JPEG fallback is a great default. Add AVIF if you want to go the extra mile.

---

## The `srcset` and `sizes` Attributes

The `<picture>` element lets you swap images based on viewport width. But what if you want to serve different *resolutions* of the same image? That is what `srcset` and `sizes` are for.

Modern phones have high-density screens (2x or 3x pixel density). An image that looks sharp on a regular screen looks blurry on a retina display unless you serve a higher-resolution version. But you do not want to send that giant file to a non-retina screen.

```html
<img
  src="photo-800.jpg"
  srcset="
    photo-400.jpg 400w,
    photo-800.jpg 800w,
    photo-1200.jpg 1200w
  "
  sizes="
    (min-width: 1024px) 33vw,
    (min-width: 768px) 50vw,
    100vw
  "
  alt="Developers at a community meetup"
>
```

Here is what each part does:

- `srcset` lists the available image files and their **actual widths** in pixels (the `w` descriptor).
- `sizes` tells the browser how wide the image will be *on screen* at different viewport widths. This helps the browser choose the right file from `srcset`.
- `src` is the fallback for browsers that do not support `srcset`.

In the example above:
- On desktop (1024px+), the image takes up about 33% of the viewport (`33vw`), so the browser might pick the 400w image.
- On tablet (768px+), the image takes up 50% of the viewport (`50vw`), so the browser might pick the 800w image.
- On mobile, the image fills the full width (`100vw`), so the browser might pick the 800w or 1200w image depending on the device pixel ratio.

The browser makes the final decision about which file to download. You give it the information; it picks the best option based on the actual device characteristics.

For most projects, `srcset` and `sizes` are a nice optimization but not strictly required. The responsive image rule (`max-width: 100%; height: auto`) handles the visual responsiveness. `srcset` and `sizes` optimize for *performance* -- serving appropriately-sized files so mobile users do not download unnecessarily large images.

---

## Lazy Loading Images

If your page has many images (like a photo gallery or a long article), you can improve performance by loading images only when they are about to scroll into view. This is called **lazy loading**, and it is incredibly easy to implement:

```html
<img
  src="photo.jpg"
  alt="Community event photo"
  loading="lazy"
  width="800"
  height="600"
>
```

That single `loading="lazy"` attribute tells the browser: "Don't download this image until the user scrolls close to it." Images that are already visible when the page loads (like a hero image at the top) are loaded immediately. Images further down the page are loaded on demand.

Two important notes:

1. **Do not lazy-load images that are visible on initial page load** (like your hero image or logo). These should load immediately for the best user experience.
2. **Always include `width` and `height` attributes** on lazy-loaded images. This tells the browser how much space to reserve before the image loads, preventing the annoying "layout shift" where content jumps around as images pop in.

```html
<!-- Hero image: loads immediately (no lazy loading) -->
<img src="hero.jpg" alt="Welcome banner" width="1200" height="600">

<!-- Gallery images: lazy load (below the fold) -->
<img src="gallery-1.jpg" alt="Workshop photo 1" loading="lazy" width="400" height="300">
<img src="gallery-2.jpg" alt="Workshop photo 2" loading="lazy" width="400" height="300">
<img src="gallery-3.jpg" alt="Workshop photo 3" loading="lazy" width="400" height="300">
```

---

## Responsive Typography: rem vs em vs px

Now let's talk about text. In Module 05, you used `px` (pixels) for font sizes. Pixels work, but they have a limitation: **they do not adapt**. A `16px` font is 16px on a phone and 16px on a 27-inch monitor. That might be fine for some situations, but responsive design often calls for text that scales.

CSS gives you three main units for text sizing:

### `px` (Pixels)

Fixed size. Does not change based on user preferences or screen size.

```css
h1 { font-size: 32px; }
p  { font-size: 16px; }
```

**The problem**: Many users adjust their browser's default font size for accessibility reasons (larger text for low vision, for example). When you set font sizes in `px`, you override that preference. The text stays at exactly the pixel size you specified, ignoring the user's settings.

### `em` (Relative to Parent)

An `em` is relative to the font size of the **parent element**.

```css
.parent {
  font-size: 16px;
}

.parent .child {
  font-size: 1.5em;   /* 1.5 x 16px = 24px */
}

.parent .child .grandchild {
  font-size: 1.5em;   /* 1.5 x 24px = 36px  ← compounds! */
}
```

The problem with `em` is **compounding**. Each nested element multiplies from its parent. In the example above, the grandchild ends up at 36px (1.5 x 1.5 x 16px), which might not be what you intended. Deeply nested elements can produce unexpected font sizes.

### `rem` (Relative to Root)

A `rem` is relative to the font size of the **root element** (`<html>`). It does not compound.

```css
html {
  font-size: 16px;  /* This is the browser default */
}

h1 { font-size: 2rem; }      /* 2 x 16px = 32px */
h2 { font-size: 1.5rem; }    /* 1.5 x 16px = 24px */
p  { font-size: 1rem; }      /* 1 x 16px = 16px */
small { font-size: 0.875rem; } /* 0.875 x 16px = 14px */
```

No matter how deeply nested an element is, `1rem` always equals the root font size. No compounding, no surprises.

**The best practice**: Use `rem` for font sizes. This respects user preferences (if they change their browser's default font size, everything scales proportionally) and avoids the compounding issue of `em`.

A helpful mental model: think of `rem` as "root em." One `rem` equals whatever the browser's base font size is (typically 16px, unless the user has changed it).

```css
/* Recommended approach */
body {
  font-size: 1rem;       /* Respects user's default */
  line-height: 1.6;
}

h1 { font-size: 2rem; }
h2 { font-size: 1.5rem; }
h3 { font-size: 1.25rem; }
```

---

## Fluid Typography with `clamp()`

Here is where things get really good. What if you want your heading to be smaller on mobile and larger on desktop, but you want it to scale *smoothly* between those sizes -- no media queries needed?

Meet `clamp()`:

```css
h1 {
  font-size: clamp(1.75rem, 4vw, 3rem);
}
```

`clamp()` takes three values:

1. **Minimum**: The smallest the font size will ever be (`1.75rem` = 28px)
2. **Preferred**: The ideal size, usually based on viewport width (`4vw` = 4% of the viewport width)
3. **Maximum**: The largest the font size will ever be (`3rem` = 48px)

Here is what happens:
- On a 375px phone: `4vw` = 15px, which is less than the minimum (28px), so the heading is 28px.
- On a 900px tablet: `4vw` = 36px, which is between min and max, so the heading is 36px.
- On a 1440px desktop: `4vw` = 57.6px, which exceeds the maximum (48px), so the heading is capped at 48px.

The text scales fluidly between the minimum and maximum with no media queries and no abrupt jumps. It is like having an automatic volume knob for your font sizes.

Here is a practical set of fluid typography rules:

```css
/* Fluid typography system */
h1 {
  font-size: clamp(1.75rem, 4vw, 3rem);
  line-height: 1.2;
}

h2 {
  font-size: clamp(1.375rem, 3vw, 2.25rem);
  line-height: 1.3;
}

h3 {
  font-size: clamp(1.125rem, 2.5vw, 1.5rem);
  line-height: 1.4;
}

p {
  font-size: clamp(1rem, 1.5vw, 1.125rem);
  line-height: 1.6;
}
```

Open DevTools, toggle responsive mode, and slowly drag the viewport width. Watch the text resize smoothly. That is `clamp()` in action.

---

## Viewport Units

You have been using `vw` inside `clamp()`, but viewport units are useful on their own too. Here are the four viewport units:

| Unit | Stands For | Definition |
|------|-----------|------------|
| `vw` | Viewport Width | 1% of the browser window's width |
| `vh` | Viewport Height | 1% of the browser window's height |
| `vmin` | Viewport Minimum | 1% of whichever is smaller (width or height) |
| `vmax` | Viewport Maximum | 1% of whichever is larger (width or height) |

```css
/* Full-screen hero section */
.hero {
  height: 100vh;       /* Exactly the height of the viewport */
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Responsive padding that scales with screen size */
.section {
  padding: 5vh 5vw;   /* Vertical and horizontal padding scale with the window */
}
```

**A warning about viewport units for font sizes**: Using `vw` alone for font sizes is problematic because the text becomes impossibly small on narrow screens and absurdly large on wide screens. That is why `clamp()` is the right approach -- it gives you the fluidity of `vw` with the safety rails of a minimum and maximum.

```css
/* BAD - no guardrails */
h1 {
  font-size: 5vw;  /* 18.75px on a phone, 96px on a wide monitor */
}

/* GOOD - clamp() adds guardrails */
h1 {
  font-size: clamp(1.75rem, 4vw, 3rem);
}
```

---

## Responsive Spacing

Typography is not just about font size -- the space around text matters too. Here is a pattern for responsive spacing using `clamp()`:

```css
.section {
  padding: clamp(1.5rem, 5vw, 4rem);
  margin-bottom: clamp(2rem, 6vw, 5rem);
}

.container {
  width: 90%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 clamp(1rem, 3vw, 2rem);
}
```

This gives you tight, space-efficient spacing on mobile and generous breathing room on desktop, with a smooth transition in between.

---

## Line Length for Readability

There is one more typography principle that affects responsiveness: **line length** (also called "measure" in typography). Research consistently shows that the ideal line length for reading is **45 to 75 characters per line**. Shorter lines feel choppy. Longer lines tire the eye because it has to travel too far before jumping back to the start of the next line.

On a wide desktop screen, a full-width paragraph can easily reach 120+ characters per line, which is exhausting to read. The fix is simple: cap the width of your text containers.

```css
/* Cap paragraph width for readability */
.article-content {
  max-width: 65ch;  /* ch = width of the "0" character in the current font */
  margin: 0 auto;
}
```

The `ch` unit is particularly useful here because it is based on the actual width of characters in the font, making it a natural fit for controlling line length. `65ch` gives you roughly 65 characters per line -- right in the sweet spot for readability.

You can also use `rem` or `px`:

```css
.article-content {
  max-width: 40rem;  /* About 640px at default font size, similar to 65ch */
}
```

This matters for responsiveness because on mobile, the screen is already narrow enough that line length is not a problem. But as the screen widens, text lines get uncomfortably long unless you add a `max-width`. This is another case where the max-width trick from Lesson 01 is invaluable.

---

## Putting It All Together

Here is a complete example that combines responsive images, fluid typography, and smart spacing:

```css
/* ============================
   BASE STYLES
   ============================ */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-size: 100%;  /* Respects user's default (usually 16px) */
}

body {
  font-family: Arial, sans-serif;
  line-height: 1.6;
  color: #333;
}

/* Responsive images globally */
img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* Fluid typography */
h1 { font-size: clamp(1.75rem, 4vw, 3rem); line-height: 1.2; }
h2 { font-size: clamp(1.375rem, 3vw, 2.25rem); line-height: 1.3; }
h3 { font-size: clamp(1.125rem, 2.5vw, 1.5rem); line-height: 1.4; }

/* Content container */
.container {
  width: 90%;
  max-width: 1200px;
  margin: 0 auto;
  padding: clamp(1rem, 3vw, 2rem);
}

/* Article text: capped line length */
.article-text {
  max-width: 65ch;
}

/* Responsive spacing between sections */
.section {
  margin-bottom: clamp(2rem, 6vw, 5rem);
}

/* Hero image: always full width of container */
.hero-img {
  width: 100%;
  height: auto;
  border-radius: 8px;
}
```

```html
<main class="container">
  <section class="section">
    <h1>Building for Every Screen</h1>

    <picture>
      <source media="(min-width: 1024px)" srcset="hero-wide.webp">
      <source media="(min-width: 768px)" srcset="hero-medium.webp">
      <img class="hero-img" src="hero-mobile.webp"
           alt="Developers working together at a community event"
           width="1200" height="600">
    </picture>
  </section>

  <section class="section">
    <h2>Our Mission</h2>
    <div class="article-text">
      <p>We believe everyone deserves access to technical education.
         Our programs are designed to meet you where you are and
         take you where you want to go.</p>
    </div>
  </section>

  <section class="section">
    <h2>Gallery</h2>
    <div class="image-grid">
      <img src="event-1.webp" alt="Workshop session" loading="lazy" width="400" height="300">
      <img src="event-2.webp" alt="Group discussion" loading="lazy" width="400" height="300">
      <img src="event-3.webp" alt="Demo day presentations" loading="lazy" width="400" height="300">
    </div>
  </section>
</main>
```

---

## Key Takeaways

1. **Every image needs `max-width: 100%; height: auto;`** to prevent overflow and maintain aspect ratio. This is the single most important responsive image rule.
2. **The `<picture>` element** lets you serve different images based on screen size (art direction) or different formats based on browser support (WebP, AVIF, JPEG).
3. **`srcset` and `sizes`** help the browser choose the right resolution image for the device, saving bandwidth on mobile.
4. **`loading="lazy"`** defers loading off-screen images until the user scrolls near them. Always include `width` and `height` to prevent layout shift.
5. **Use `rem` for font sizes** instead of `px`. It respects user preferences and avoids the compounding problem of `em`.
6. **`clamp()` creates fluid typography** that scales smoothly between a minimum and maximum size based on viewport width -- no media queries needed.
7. **Cap line length at 45-75 characters** using `max-width: 65ch` for readability. This is especially important on wide screens where text lines can become uncomfortably long.

---

## Try It Yourself

1. Create an HTML page with three large images. Without any CSS, open it on a simulated phone. Notice the horizontal scroll. Now add `img { max-width: 100%; height: auto; }` and refresh. Problem solved.

2. Build a `<picture>` element that serves a square-cropped image on mobile and a wide landscape image on desktop. Use the `media` attribute on `<source>` to switch at 768px.

3. Create a heading system using `clamp()`:
   - `h1`: minimum 1.75rem, maximum 3rem
   - `h2`: minimum 1.375rem, maximum 2.25rem
   - `h3`: minimum 1.125rem, maximum 1.5rem

   Open it in responsive mode and slowly resize. Watch the headings scale smoothly.

4. Add a paragraph with `max-width: 65ch` and another without any max-width. On a wide screen, compare how they read. The constrained paragraph should be noticeably more comfortable to read.

5. Add `loading="lazy"` to images at the bottom of a long page. Open the Network tab in DevTools and scroll down slowly. You should see the images loading as you approach them, not all at once when the page first loads.

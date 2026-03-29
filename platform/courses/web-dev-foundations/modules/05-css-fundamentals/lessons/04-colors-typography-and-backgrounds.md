---
title: "Colors, Typography, and Backgrounds"
estimatedMinutes: 50
---

# Colors, Typography, and Backgrounds

You've learned how to select elements, how they're sized and spaced as boxes, and how the cascade decides which rules win. Now it's time to make things *beautiful*.

This lesson is where CSS starts to feel like a creative superpower. Colors, fonts, and backgrounds are what transform a wall of plain text into something that communicates a mood, establishes a brand, and makes people actually *want* to keep reading.

We Build Black's own website uses a rich palette of browns and golds with clean typography. By the end of this lesson, you'll know how to build a color scheme and typographic system like that for your own projects.

---

## Color Values in CSS

CSS gives you several ways to express a color. They all end up doing the same thing (telling the browser how much red, green, and blue light to mix) but each format has its strengths.

### Named Colors

The simplest option. CSS has about 140 built-in color names:

```css
h1 {
    color: black;
}

.warning {
    color: tomato;
}

.success {
    background-color: forestgreen;
    color: white;
}
```

Named colors are great for quick prototyping, but you'll quickly outgrow them. Real brand colors rarely match a named color exactly.

### Hexadecimal (Hex)

Hex codes are the most common color format on the web. They start with `#` followed by six characters (0-9 and A-F):

```css
body {
    color: #2C170B;           /* WBB dark brown */
    background-color: #FFFFFF; /* White */
}

.accent {
    color: #7D4E21;           /* WBB medium brown */
}
```

The six characters are three pairs: **RR GG BB** (red, green, blue). Each pair ranges from `00` (none) to `FF` (maximum):

- `#FF0000` = full red, no green, no blue = **red**
- `#00FF00` = no red, full green, no blue = **green**
- `#0000FF` = no red, no green, full blue = **blue**
- `#000000` = nothing = **black**
- `#FFFFFF` = everything = **white**

**Shorthand hex**: When both characters in each pair are the same, you can shorten to three characters:

```css
color: #FF6600;  /* Full form */
color: #F60;     /* Shorthand, identical result */

color: #FFFFFF;  /* Full form */
color: #FFF;     /* Shorthand */
```

### RGB

`rgb()` uses decimal numbers (0-255) for each channel. Same concept as hex, but in a format some people find easier to read:

```css
body {
    color: rgb(44, 23, 11);     /* Same as #2C170B */
}

.accent {
    color: rgb(125, 78, 33);    /* Same as #7D4E21 */
}
```

### RGBA (RGB + Alpha/Transparency)

`rgba()` adds a fourth value: **alpha** (opacity), ranging from 0 (fully transparent) to 1 (fully opaque):

```css
/* Semi-transparent black overlay */
.overlay {
    background-color: rgba(0, 0, 0, 0.5);   /* 50% transparent black */
}

/* Subtle tinted background */
.highlight {
    background-color: rgba(125, 78, 33, 0.1);  /* 10% WBB brown tint */
}

/* Transparent to solid, great for hover effects */
.ghost-button {
    background-color: rgba(125, 78, 33, 0);     /* Fully transparent */
}
.ghost-button:hover {
    background-color: rgba(125, 78, 33, 0.15);  /* Subtle fill on hover */
}
```

RGBA is incredibly useful. Any time you need a color that you can see through (overlays, tinted backgrounds, subtle shadows) `rgba()` is your tool.

### HSL (Hue, Saturation, Lightness)

HSL describes colors the way humans think about them:

- **Hue**: The color itself, as a degree on a color wheel (0-360). 0=red, 120=green, 240=blue.
- **Saturation**: How vivid the color is (0%=gray, 100%=full color).
- **Lightness**: How light or dark (0%=black, 50%=normal, 100%=white).

```css
.primary {
    color: hsl(27, 58%, 31%);      /* A warm brown */
}

.primary-light {
    color: hsl(27, 58%, 51%);      /* Same hue, lighter */
}

.primary-dark {
    color: hsl(27, 58%, 15%);      /* Same hue, darker */
}
```

HSL is powerful for building color systems because you can create lighter and darker variants by simply adjusting the lightness value. The hue and saturation stay consistent.

Like RGBA, there's an `hsla()` version with alpha transparency:

```css
.overlay {
    background-color: hsla(27, 58%, 31%, 0.3);  /* 30% transparent brown */
}
```

---

## Text Color and Background Color

Two properties you'll use on nearly every project:

```css
/* color sets the TEXT color */
h1 {
    color: #2C170B;
}

/* background-color sets the BACKGROUND color */
.hero {
    background-color: #2C170B;
    color: white;  /* Light text on dark background */
}
```

**Contrast matters**: Always make sure your text has enough contrast against its background. Light text on a light background or dark text on a dark background is unreadable. A good rule of thumb: if you squint and can barely see the text, the contrast is too low.

Web accessibility guidelines (WCAG) recommend a contrast ratio of at least **4.5:1** for normal text. You can check yours at [webaim.org/resources/contrastchecker](https://webaim.org/resources/contrastchecker/).

---

## Typography: Making Text Look Professional

Typography is one of the quickest ways to make a website look polished. Bad fonts and spacing scream "amateur." Good typography whispers "I know what I'm doing."

### font-family

The `font-family` property sets the typeface. Always provide a **font stack**, a list of fallback fonts in case the first choice isn't available:

```css
body {
    /* Try Roboto first, then Helvetica, then any sans-serif font */
    font-family: 'Roboto', 'Helvetica Neue', Arial, sans-serif;
}

h1, h2, h3 {
    /* A serif font for headings */
    font-family: Georgia, 'Times New Roman', serif;
}

code {
    /* A monospace font for code */
    font-family: 'Courier New', Consolas, monospace;
}
```

The last value should always be a **generic family** (`serif`, `sans-serif`, `monospace`, `cursive`, or `system-ui`) as the ultimate fallback.

**Web-safe fonts** are fonts you can rely on being installed across most computers:

- **Sans-serif**: Arial, Helvetica, Verdana, Tahoma, Trebuchet MS
- **Serif**: Georgia, Times New Roman, Palatino
- **Monospace**: Courier New, Consolas, Lucida Console

### Google Fonts

Want something more unique? **Google Fonts** offers hundreds of free, high-quality fonts. Here's how to use them:

1. Visit [fonts.google.com](https://fonts.google.com/)
2. Browse and select fonts you like
3. Copy the `<link>` tag they give you
4. Paste it in your HTML `<head>`, **before** your CSS file

```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Site</title>

    <!-- Google Fonts: load BEFORE your stylesheet -->
    <link href="https://fonts.googleapis.com/css2?family=Arvo:wght@400;700&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">

    <!-- Your stylesheet -->
    <link rel="stylesheet" href="styles.css">
</head>
```

Then use them in your CSS:

```css
body {
    font-family: 'Roboto', sans-serif;
}

h1, h2, h3 {
    font-family: 'Arvo', serif;
}
```

**Tip**: Don't go wild with fonts. Two fonts is the sweet spot: one for headings, one for body text. Three is the maximum. More than that and your page looks like a ransom note.

### font-size

Sets the size of text. You can use several units:

```css
/* Pixels: fixed size, doesn't scale with user preferences */
p {
    font-size: 16px;
}

/* em: relative to the parent element's font size */
h1 {
    font-size: 2em;  /* 2x the parent's font size */
}

/* rem: relative to the ROOT element's font size (usually 16px) */
h1 {
    font-size: 2rem;   /* 2 x 16px = 32px */
}

p {
    font-size: 1rem;   /* 1 x 16px = 16px */
}

small {
    font-size: 0.875rem;  /* 0.875 x 16px = 14px */
}
```

**`rem` is the recommended unit for font sizes.** It's consistent (always relative to the root), and it respects users who have adjusted their browser's default font size for accessibility.

### font-weight

Controls how bold or light text appears:

```css
.light    { font-weight: 300; }     /* Light */
.normal   { font-weight: 400; }     /* Normal (default) */
.medium   { font-weight: 500; }     /* Medium */
.bold     { font-weight: 700; }     /* Bold */

/* You can also use keywords */
.bold     { font-weight: bold; }    /* Same as 700 */
.normal   { font-weight: normal; }  /* Same as 400 */
```

The numeric values only work if the font you're using actually includes those weights. When you load a Google Font, make sure to include the weights you need (see the `wght@300;400;500;700` in the URL above).

### font-style

Mainly used for italics:

```css
.quote {
    font-style: italic;
}

/* Remove italic from something that's italic by default */
em.no-emphasis {
    font-style: normal;
}
```

---

## Text Spacing and Alignment

### line-height

`line-height` sets the spacing between lines of text. It's one of the biggest readability upgrades you can make:

```css
/* Default is roughly 1.2, too tight for body text */
body {
    line-height: 1.6;   /* 1.6 times the font size, comfortable reading */
}

/* Headings can be tighter since they're short */
h1 {
    line-height: 1.2;
}
```

Use a unitless number (like `1.6`, not `1.6em` or `25.6px`). A unitless value scales proportionally with the font size, which is what you almost always want.

### letter-spacing and word-spacing

```css
/* Spread letters apart, great for uppercase headings */
.section-label {
    text-transform: uppercase;
    letter-spacing: 2px;    /* Extra space between each letter */
    font-size: 0.875rem;
}

/* Tighten letters, sometimes needed for large headings */
h1 {
    letter-spacing: -0.5px;
}

/* Adjust space between words (rarely needed) */
.wide-text {
    word-spacing: 4px;
}
```

### text-align

Controls horizontal alignment of text within its container:

```css
.hero {
    text-align: center;    /* Centered text */
}

.article-body {
    text-align: left;      /* Left-aligned (default for LTR languages) */
}

.price {
    text-align: right;     /* Right-aligned */
}

.justified {
    text-align: justify;   /* Stretched to fill the width, use sparingly */
}
```

### text-decoration

Controls underlines, overlines, and strikethroughs:

```css
/* Remove underline from links */
a {
    text-decoration: none;
}

/* Add underline on hover */
a:hover {
    text-decoration: underline;
}

/* Strikethrough for "old price" effect */
.old-price {
    text-decoration: line-through;
    color: #999;
}

/* Fancy underline with custom color and style */
.fancy-link {
    text-decoration: underline;
    text-decoration-color: #AE8156;
    text-decoration-thickness: 2px;
    text-underline-offset: 4px;   /* Space between text and underline */
}
```

### text-transform

Changes the capitalization of text without changing the HTML:

```css
.uppercase { text-transform: uppercase; }     /* ALL CAPS */
.lowercase { text-transform: lowercase; }     /* all lowercase */
.capitalize { text-transform: capitalize; }   /* First Letter Of Each Word */
```

`uppercase` with `letter-spacing` is a classic combination for labels and navigation.

---

## Background Properties

Backgrounds can be solid colors, images, gradients, or combinations of all three.

### background-color

You already know this one:

```css
.hero {
    background-color: #2C170B;
}
```

### background-image

Place an image behind the content of an element:

```css
.hero {
    background-image: url('images/hero-bg.jpg');
}
```

By default, background images tile (repeat) to fill the space. You'll almost always want to adjust that:

```css
.hero {
    background-image: url('images/hero-bg.jpg');
    background-size: cover;       /* Scale to cover the entire element */
    background-position: center;  /* Center the image */
    background-repeat: no-repeat; /* Don't tile */
}
```

- **`background-size: cover`**: scales the image to completely fill the element (may crop edges)
- **`background-size: contain`**: scales the image to fit entirely inside (may leave gaps)
- **`background-position: center`**: which part of the image stays visible when cropped
- **`background-repeat: no-repeat`**: show the image once, don't tile

You can combine these in a **shorthand**:

```css
.hero {
    background: url('images/hero-bg.jpg') center / cover no-repeat;
}
```

### Adding a Color Overlay to a Background Image

A common design pattern: a dark semi-transparent layer over a background image so text is readable on top of it:

```css
.hero {
    background-image:
        linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)),  /* Dark overlay */
        url('images/hero-bg.jpg');                                   /* Image underneath */
    background-size: cover;
    background-position: center;
    color: white;
    padding: 80px 20px;
    text-align: center;
}
```

The gradient layer sits on top of the image. Since it's a semi-transparent black, the image shows through dimly while white text pops on top.

---

## Gradients

Gradients are smooth transitions between two or more colors. They're created with CSS, not image files, so they're fast and resolution-independent.

### linear-gradient

Goes in a straight line from one color to another:

```css
/* Top to bottom (default direction) */
.gradient-1 {
    background: linear-gradient(#2C170B, #7D4E21);
}

/* Left to right */
.gradient-2 {
    background: linear-gradient(to right, #2C170B, #7D4E21);
}

/* Diagonal */
.gradient-3 {
    background: linear-gradient(to bottom right, #2C170B, #AE8156);
}

/* Specific angle */
.gradient-4 {
    background: linear-gradient(135deg, #2C170B, #7D4E21, #AE8156);
}

/* Three+ colors */
.gradient-5 {
    background: linear-gradient(to right, #2C170B, #7D4E21, #AE8156);
}
```

### radial-gradient

Radiates outward from a center point:

```css
/* Circle radiating from center */
.radial {
    background: radial-gradient(circle, #AE8156, #2C170B);
}

/* Spotlight effect */
.spotlight {
    background: radial-gradient(circle at top left, #7D4E21, #200E03);
}
```

Gradients are a great way to add visual depth without any image files. A subtle gradient background can make a section feel polished and intentional.

---

## Opacity

The `opacity` property controls the transparency of an **entire element**, including its content, text, and children:

```css
.faded {
    opacity: 0.5;   /* 50% transparent, everything inside fades */
}

.hidden {
    opacity: 0;     /* Fully transparent (invisible but still takes up space) */
}
```

**Important distinction**: `opacity` affects *everything* in the element. If you set `opacity: 0.5` on a div, the text inside also becomes 50% transparent. If you only want a transparent *background*, use `rgba()` or `hsla()` instead:

```css
/* This makes EVERYTHING 50% transparent (including text) */
.card {
    background-color: #2C170B;
    color: white;
    opacity: 0.5;  /* Text is also faded, probably not what you want */
}

/* This makes ONLY the background transparent; text stays solid */
.card {
    background-color: rgba(44, 23, 11, 0.5);  /* 50% transparent background */
    color: white;                               /* Text is fully opaque */
}
```

---

## Putting It All Together

Here's a complete hero section using everything from this lesson:

```html
<section class="hero">
    <h1 class="hero-title">We Build Black</h1>
    <p class="hero-subtitle">Empowering the Black community through tech education</p>
    <a href="#programs" class="hero-cta">Explore Programs</a>
</section>
```

```css
/* Google Fonts loaded in HTML <head> */

body {
    font-family: 'Roboto', sans-serif;
    color: #2C170B;
    line-height: 1.6;
}

.hero {
    background: linear-gradient(135deg, #2C170B 0%, #7D4E21 100%);
    color: white;
    text-align: center;
    padding: 100px 20px;
}

.hero-title {
    font-family: 'Arvo', serif;
    font-size: 3rem;
    font-weight: 700;
    letter-spacing: -1px;
    margin-bottom: 16px;
}

.hero-subtitle {
    font-size: 1.25rem;
    font-weight: 300;
    margin-bottom: 32px;
    opacity: 0.9;
}

.hero-cta {
    display: inline-block;
    padding: 14px 32px;
    background-color: #AE8156;
    color: white;
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 4px;
}
```

---

## Key Takeaways

1. **CSS offers multiple color formats**: named colors for quick work, hex (`#7D4E21`) for precision, `rgb()`/`rgba()` when you need transparency, and `hsl()` for building systematic color palettes.
2. **`rgba()` is your go-to for transparency.** It makes only the color transparent, unlike `opacity` which fades the entire element and its children.
3. **Use a font stack** with a generic family as the last fallback (`sans-serif`, `serif`, `monospace`).
4. **Google Fonts** lets you use professional typefaces for free. Load the `<link>` in your HTML `<head>` before your CSS file.
5. **`rem` is the best unit for font sizes.** It's consistent, accessible, and scales with user preferences.
6. **`line-height: 1.6`** on body text is one of the easiest readability wins you can get. Use a unitless value.
7. **`background-size: cover`** with **`background-position: center`** is the standard combo for full-bleed background images.

---

## Try It Yourself

Using your practice project:

1. Choose a two-color palette. Set one as `background-color` on your header and the other as the text `color`. Check the contrast.
2. Load a Google Font (pick one heading font and one body font). Apply the heading font to `h1, h2, h3` and the body font to `body`.
3. Set your body text to `font-size: 1rem` and `line-height: 1.6`. Notice how much more readable it becomes.
4. Add `text-transform: uppercase` and `letter-spacing: 2px` to a navigation or section label.
5. Create a hero section with a `linear-gradient` background, centered white text, and a call-to-action button.
6. Give an element a transparent background using `rgba()`. Then try `opacity` on the same element and notice how the text fades too.
7. Style your links: remove the default underline with `text-decoration: none`, then add it back on `:hover`.

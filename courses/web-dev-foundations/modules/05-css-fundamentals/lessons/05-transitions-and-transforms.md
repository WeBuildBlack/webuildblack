---
title: "Transitions and Transforms"
estimatedMinutes: 40
---

# Transitions and Transforms

Up to now, every style you've written takes effect *instantly*. You hover over a button and the color snaps from brown to gold. You focus on an input and the border just appears. It works, but it feels abrupt, like flipping a light switch.

Transitions turn that light switch into a **dimmer**. Instead of snapping from one state to another, elements *smoothly animate* between them. The color gradually shifts. The border fades in. The button gently grows. These small, subtle animations make a website feel alive and polished. They tell the user "something happened" without shouting.

Transforms, on the other hand, let you **move, resize, rotate, and skew** elements, often combined with transitions for slick hover effects.

Together, these two features will take your CSS from functional to professional.

---

## What Transitions Do

A CSS transition smoothly animates a property from one value to another over a duration you control. Without a transition, changes happen in a single frame, literally instantaneous. With a transition, the browser generates all the in-between frames for you.

```css
/* WITHOUT a transition: color changes instantly */
.btn {
    background-color: #7D4E21;
    color: white;
}

.btn:hover {
    background-color: #AE8156;
}
```

```css
/* WITH a transition: color fades smoothly over 0.3 seconds */
.btn {
    background-color: #7D4E21;
    color: white;
    transition: background-color 0.3s ease;
}

.btn:hover {
    background-color: #AE8156;
}
```

The `transition` property goes on the **base state** (not the `:hover` state). This way, the animation happens both when the user hovers *and* when they move away.

---

## The Transition Property

The `transition` shorthand takes up to four values:

```css
transition: property duration timing-function delay;
```

Let's break each one down:

### Which Property to Animate

The first value tells the browser *which* CSS property to transition:

```css
/* Only animate background-color */
.btn {
    transition: background-color 0.3s ease;
}

/* Only animate opacity */
.fade {
    transition: opacity 0.5s ease;
}

/* Animate ALL properties that change (convenient but less performant) */
.card {
    transition: all 0.3s ease;
}
```

Using `all` is easy but less efficient. The browser has to check every property for changes. It's fine for simple cases, but as you grow, get in the habit of specifying which properties you're animating.

### Duration

How long the animation takes. Use seconds (`s`) or milliseconds (`ms`):

```css
.fast   { transition: color 0.15s ease; }   /* Quick and snappy */
.normal { transition: color 0.3s ease; }    /* The sweet spot for most UI */
.slow   { transition: color 0.6s ease; }    /* Deliberate, noticeable */
```

**General guidelines**:
- **0.15s - 0.2s**: Micro-interactions (color changes, small highlights)
- **0.25s - 0.4s**: Standard UI transitions (buttons, cards)
- **0.5s - 0.8s**: Larger, more dramatic movements
- **Never exceed 1s** for UI elements. Anything longer feels sluggish

### Timing Functions

The timing function controls the *rhythm* of the animation. Does it start fast and slow down? Start slow and speed up? Stay constant?

```css
/* ease: starts fast, slows down at the end (default, most natural) */
.ease { transition: transform 0.3s ease; }

/* linear: constant speed throughout (feels mechanical) */
.linear { transition: transform 0.3s linear; }

/* ease-in: starts slow, speeds up (good for exits) */
.ease-in { transition: transform 0.3s ease-in; }

/* ease-out: starts fast, slows down (good for entrances) */
.ease-out { transition: transform 0.3s ease-out; }

/* ease-in-out: slow start, fast middle, slow end */
.ease-in-out { transition: transform 0.3s ease-in-out; }
```

For most hover effects, **`ease`** (the default) works great. Use `ease-out` for things sliding into view and `ease-in` for things sliding away. `linear` is really only for things like progress bars where constant speed makes sense.

### Delay

An optional wait time before the transition starts:

```css
/* Wait 0.1 seconds before starting the transition */
.tooltip {
    transition: opacity 0.3s ease 0.1s;
}
```

Delays are useful for tooltips (so they don't flicker when the mouse passes quickly) and for staggering multiple animations.

---

## Transitioning Multiple Properties

You can animate different properties with different settings by separating them with commas:

```css
.btn {
    background-color: #7D4E21;
    color: white;
    padding: 12px 24px;
    border-radius: 4px;
    transform: translateY(0);

    /* Animate background and transform separately */
    transition:
        background-color 0.3s ease,
        transform 0.2s ease;
}

.btn:hover {
    background-color: #AE8156;
    transform: translateY(-2px);   /* Lift up slightly */
}
```

This lets you fine-tune each animation independently. The background color fades over 0.3 seconds while the lift happens in 0.2 seconds.

---

## Common Transition Targets

Not every CSS property can be transitioned smoothly. Properties that work well are ones that have numeric values the browser can interpolate between. Here are the ones you'll use most:

```css
/* COLOR transitions */
.link {
    color: #7D4E21;
    transition: color 0.2s ease;
}
.link:hover {
    color: #AE8156;
}

/* BACKGROUND-COLOR transitions */
.card {
    background-color: white;
    transition: background-color 0.3s ease;
}
.card:hover {
    background-color: #f5f0eb;
}

/* OPACITY transitions (great for fade effects) */
.overlay {
    opacity: 0;
    transition: opacity 0.4s ease;
}
.overlay:hover {
    opacity: 1;
}

/* BOX-SHADOW transitions */
.card {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: box-shadow 0.3s ease;
}
.card:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

/* TRANSFORM transitions (we'll cover transforms next) */
.icon {
    transform: rotate(0deg);
    transition: transform 0.3s ease;
}
.icon:hover {
    transform: rotate(90deg);
}
```

Properties that **cannot** be transitioned include `display`, `font-family`, and `background-image` (without gradients). If it doesn't have a numeric value or color to interpolate, it won't animate.

---

## CSS Transforms

Transforms let you **move, resize, rotate, and skew** elements without disrupting the document flow. The element's original space in the layout is preserved. It just *visually* appears in a different position or shape.

Think of it like a hologram projector: the projector stays in place, but the image it shows can be moved, scaled, and rotated.

### translate (Move)

`translate` moves an element from its current position:

```css
/* Move 20px right and 10px down */
.shifted {
    transform: translate(20px, 10px);
}

/* Move only horizontally */
.shifted-x {
    transform: translateX(50px);
}

/* Move only vertically */
.shifted-y {
    transform: translateY(-10px);   /* Negative = upward */
}
```

`translateY(-2px)` on hover is a classic "lift" effect for buttons and cards. It creates a subtle sense of depth.

### scale (Resize)

`scale` grows or shrinks an element:

```css
/* 1 = normal size, 1.1 = 10% bigger, 0.9 = 10% smaller */
.grow {
    transform: scale(1.1);
}

.shrink {
    transform: scale(0.95);
}

/* Scale width and height independently */
.stretch {
    transform: scale(1.2, 0.8);   /* 120% wide, 80% tall */
}
```

A subtle `scale(1.05)` on hover makes cards and images feel interactive without being flashy.

### rotate

`rotate` spins an element around its center:

```css
/* Rotate 45 degrees clockwise */
.tilted {
    transform: rotate(45deg);
}

/* Rotate counterclockwise */
.tilted-back {
    transform: rotate(-15deg);
}

/* Full spin */
.spinner {
    transform: rotate(360deg);
}
```

### skew

`skew` tilts an element along one or both axes, creating a parallelogram effect:

```css
/* Skew horizontally */
.slanted {
    transform: skewX(10deg);
}

/* Skew vertically */
.leaning {
    transform: skewY(-5deg);
}

/* Skew both axes */
.distorted {
    transform: skew(10deg, 5deg);
}
```

Skew is the least commonly used transform, but it's great for creating dynamic, angular design elements.

---

## Combining Transforms

You can apply multiple transforms by listing them in a single `transform` property, separated by spaces:

```css
/* Move up, scale up, and rotate, all at once */
.card:hover {
    transform: translateY(-5px) scale(1.02) rotate(1deg);
}
```

**Order matters**: Transforms are applied right-to-left. In most cases the visual difference is subtle, but if you're combining translate with rotate, experiment with the order to get the result you want.

```css
/* Rotate first, then translate (moves along the rotated axis) */
.example-a {
    transform: translate(100px, 0) rotate(45deg);
}

/* Translate first, then rotate (moves straight, then rotates in place) */
.example-b {
    transform: rotate(45deg) translate(100px, 0);
}
```

---

## Practical Hover Effects

Let's build some real-world interactive effects using transitions and transforms together.

### The Lift Button

The most popular button hover effect on the modern web:

```css
.btn {
    display: inline-block;
    padding: 12px 28px;
    background-color: #7D4E21;
    color: white;
    text-decoration: none;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;

    /* Transition both transform and box-shadow */
    transition:
        transform 0.2s ease,
        box-shadow 0.2s ease;
}

.btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(44, 23, 11, 0.25);
}

/* Subtle press effect when clicking */
.btn:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(44, 23, 11, 0.2);
}
```

Three states: resting, hovering (lifted with shadow), and active/pressed (back down). This feels responsive and tactile.

### The Card Hover

```css
.card {
    background: white;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

    transition:
        transform 0.3s ease,
        box-shadow 0.3s ease;
}

.card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
}
```

### The Image Zoom

```css
.image-container {
    overflow: hidden;          /* Hide the parts that scale outside the container */
    border-radius: 8px;
}

.image-container img {
    width: 100%;
    display: block;
    transition: transform 0.4s ease;
}

.image-container:hover img {
    transform: scale(1.08);   /* Zoom in slightly */
}
```

The `overflow: hidden` on the container is the key. It crops the scaled image so it doesn't spill outside its frame.

### The Nav Link Underline

A smooth underline that grows from the center on hover:

```css
.nav-link {
    position: relative;
    text-decoration: none;
    color: #2C170B;
    padding: 8px 0;
}

/* The underline is a pseudo-element */
.nav-link::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;                   /* Start from center */
    width: 0;                    /* Hidden by default */
    height: 2px;
    background-color: #7D4E21;
    transition: width 0.3s ease, left 0.3s ease;
}

.nav-link:hover::after {
    width: 100%;                 /* Expand to full width */
    left: 0;                     /* Shift to left edge */
}
```

Don't worry if the `position` and `::after` parts are new. You'll learn positioning in a later module. For now, you can copy this pattern and customize the colors.

---

## Performance: Why Transforms Are Special

Not all CSS properties animate equally. When the browser animates something like `width` or `margin`, it has to recalculate the layout of the entire page for every frame. That's expensive and can cause jank (stuttery animation).

**Transforms and opacity are different.** The browser can hand them off to the GPU (the graphics processor), which handles them in a separate layer without recalculating layout. This means they're buttery smooth, even on slower devices.

The performance-friendly properties:

| Property | GPU Accelerated | Causes Layout Recalculation |
|----------|-----------------|---------------------------|
| `transform` | Yes | No |
| `opacity` | Yes | No |
| `width` / `height` | No | Yes |
| `margin` / `padding` | No | Yes |
| `top` / `left` | No | Yes |

**Practical rule**: When you want to move or resize something on hover, use `transform: translate()` and `transform: scale()` instead of changing `margin`, `top`, or `width`. Your animations will be smoother and your users will thank you.

```css
/* AVOID: animating margin causes layout recalculation */
.card:hover {
    margin-top: -4px;
}

/* PREFER: animating transform is GPU-accelerated */
.card:hover {
    transform: translateY(-4px);
}
```

---

## Putting It All Together

Here's a complete set of interactive components:

```html
<section class="features">
    <div class="feature-card">
        <h3>Learn to Code</h3>
        <p>Self-paced courses designed for beginners, built by our community.</p>
        <a href="#" class="feature-link">Get Started</a>
    </div>

    <div class="feature-card">
        <h3>Build Projects</h3>
        <p>Hands-on projects that go straight into your portfolio.</p>
        <a href="#" class="feature-link">See Projects</a>
    </div>

    <div class="feature-card">
        <h3>Get Hired</h3>
        <p>Interview prep, mentorship, and job placement support.</p>
        <a href="#" class="feature-link">Join a Cohort</a>
    </div>
</section>
```

```css
.features {
    display: flex;
    gap: 24px;
    padding: 40px;
    max-width: 1000px;
    margin: 0 auto;
}

.feature-card {
    flex: 1;
    padding: 32px 24px;
    background: white;
    border: 1px solid #e8e0d8;
    border-radius: 8px;
    text-align: center;

    transition:
        transform 0.3s ease,
        box-shadow 0.3s ease,
        border-color 0.3s ease;
}

.feature-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 12px 32px rgba(44, 23, 11, 0.1);
    border-color: #AE8156;
}

.feature-link {
    display: inline-block;
    margin-top: 16px;
    padding: 10px 24px;
    background-color: #7D4E21;
    color: white;
    text-decoration: none;
    border-radius: 4px;

    transition:
        background-color 0.2s ease,
        transform 0.2s ease;
}

.feature-link:hover {
    background-color: #AE8156;
    transform: translateY(-1px);
}

.feature-link:active {
    transform: translateY(0);
}
```

---

## Key Takeaways

1. **Transitions animate property changes over time** instead of instantly, turning a light switch into a dimmer. Place the `transition` property on the base state, not the `:hover` state.
2. **The transition shorthand is `property duration timing-function delay`.** For example, `transition: background-color 0.3s ease`.
3. **Keep durations between 0.15s and 0.5s** for UI elements. Anything longer feels sluggish.
4. **`ease` is the best default timing function** for most interactions. Use `ease-out` for entrances and `ease-in` for exits.
5. **Transforms (translate, scale, rotate, skew) modify an element visually** without changing the document layout. Combine multiple transforms in a single `transform` property.
6. **Use `transform` and `opacity` for animations.** They're GPU-accelerated and won't cause layout jank. Avoid animating `width`, `margin`, or `top`.
7. **The lift effect (`translateY(-2px)` + `box-shadow` on hover)** is the most popular interactive pattern on the modern web. Master it and you can make any interface feel responsive.

---

## Try It Yourself

Using your practice project:

1. Add `transition: background-color 0.3s ease` to your buttons and links. Hover over them and feel the difference.
2. Create a "lift" button: on hover, apply `transform: translateY(-2px)` and add a `box-shadow`. On `:active`, bring it back to `translateY(0)`.
3. Build a card that lifts on hover: use `transform: translateY(-4px)` and increase the `box-shadow`.
4. Create an image container with `overflow: hidden` and transition the image to `transform: scale(1.08)` on hover.
5. Experiment with timing functions: change `ease` to `linear`, `ease-in-out`, and `ease-out` on the same transition and observe how the animation feels different.
6. Try combining transforms: add `transform: translateY(-3px) rotate(1deg)` to a card on hover for a playful tilt effect.
7. Open DevTools and check the "Animations" panel (in Chrome) to slow down transitions and see exactly how they play out.

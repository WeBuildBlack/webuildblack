---
title: "Links, Images, and Media"
estimatedMinutes: 45
---

# Links, Images, and Media

So far, your web pages have been all text. Text is powerful, but the web is a multimedia experience. Links connect pages together into a web of information. Images make content visual and engaging. Audio and video bring your pages to life. In this lesson, you will learn how to add all of these to your HTML pages.

---

## Links: The Doors Between Pages

The link is the most important invention of the web. Without links, every webpage would be an island -- you would have to type the exact URL of every page you wanted to visit. Links are what make the web a *web*.

Think of links as **doors between rooms in a building**. Each webpage is a room, and links are the doors that let you walk from one room to another. Some doors lead to rooms in the same building (your website). Other doors lead outside to entirely different buildings (other websites).

### The Anchor Element

Links are created with the `<a>` (anchor) element:

```html
<a href="https://webuildblack.com">Visit We Build Black</a>
```

Let's break this down:

- `<a>` -- the opening tag for a link
- `href="https://webuildblack.com"` -- the **href** (hypertext reference) attribute tells the browser where the link goes
- `Visit We Build Black` -- the **link text**, what the user sees and clicks on
- `</a>` -- the closing tag

The `href` attribute is required. Without it, the `<a>` tag will not function as a link. The link text should be descriptive -- it should tell the user where they will end up. Avoid generic text like "click here."

```html
<!-- GOOD: Descriptive link text -->
<p>Learn more about <a href="/programs/fast-track.html">our Fast Track program</a>.</p>

<!-- BAD: Generic link text tells the user nothing -->
<p>To learn about our Fast Track program, <a href="/programs/fast-track.html">click here</a>.</p>
```

Why does this matter? Screen readers often read links out of context -- they might list all the links on a page. "Click here, click here, click here" is useless. "Our Fast Track program, volunteer opportunities, donate to WBB" is meaningful.

---

## Absolute vs. Relative URLs

URLs (web addresses) come in two flavors, and understanding the difference is essential.

### Absolute URLs

An **absolute URL** includes the full address, starting with `https://`. It is like giving someone the complete street address of a building:

```html
<!-- Links to an external website -->
<a href="https://www.google.com">Go to Google</a>

<!-- Links to a specific page on another site -->
<a href="https://github.com/WeBuildBlack">WBB on GitHub</a>
```

Use absolute URLs when linking to **other websites** -- pages that are not part of your own site.

### Relative URLs

A **relative URL** describes the location of a page *relative to the current page*. It is like giving someone directions from where they are standing: "Go down the hall and turn left."

```html
<!-- Links to a page in the same folder -->
<a href="about.html">About Us</a>

<!-- Links to a page in a subfolder -->
<a href="programs/fast-track.html">Fast Track</a>

<!-- Links to a page one folder up -->
<a href="../index.html">Back to Home</a>
```

The `../` means "go up one folder." If your file is inside a `programs/` folder and you want to link back to the homepage in the parent folder, you use `../index.html`.

Use relative URLs when linking to **pages on your own website**. They are shorter, and they keep working even if you move your site to a different domain.

### Linking to Sections on the Same Page

You can link to a specific section on the same page using an `id` attribute and a `#` symbol:

```html
<!-- Create a target with an id -->
<h2 id="contact">Contact Us</h2>
<p>Reach out at info@webuildblack.com</p>

<!-- Link to that target from anywhere on the page -->
<a href="#contact">Jump to Contact section</a>
```

When clicked, the browser scrolls down to the element with `id="contact"`. This is useful for long pages with a table of contents at the top.

### Email and Phone Links

You can create links that open the user's email app or phone dialer:

```html
<!-- Opens the default email app -->
<a href="mailto:info@webuildblack.com">Email us</a>

<!-- Opens the phone dialer on mobile -->
<a href="tel:+12125551234">Call us</a>
```

---

## Opening Links in New Tabs

Sometimes you want a link to open in a new browser tab instead of replacing the current page. Use the `target` attribute:

```html
<a href="https://github.com/WeBuildBlack" target="_blank" rel="noopener noreferrer">
  WBB on GitHub
</a>
```

Let's break down the attributes:

- `target="_blank"` -- Opens the link in a new tab.
- `rel="noopener noreferrer"` -- A security measure. Without it, the new page could potentially access information about the page that opened it. Always include `rel="noopener noreferrer"` when using `target="_blank"`.

**When to use new tabs**: External links (to other websites) are often opened in new tabs so users do not lose their place on your site. Links within your own site should usually navigate in the same tab.

---

## Images

Images make your pages visual, engaging, and informative. The `<img>` element is how you add them:

```html
<img src="wbb-logo.png" alt="We Build Black logo">
```

The `<img>` element is a void element -- no closing tag needed. It has two required attributes:

### `src` (Source)

The `src` attribute tells the browser where to find the image file. Like links, it can be absolute or relative:

```html
<!-- Relative path: image is in the same folder as the HTML file -->
<img src="photo.jpg" alt="Team photo">

<!-- Relative path: image is in an images subfolder -->
<img src="images/photo.jpg" alt="Team photo">

<!-- Absolute path: image hosted on another server -->
<img src="https://example.com/images/photo.jpg" alt="Team photo">
```

### `alt` (Alternative Text)

The `alt` attribute provides a **text description of the image**. This is critically important for three reasons:

1. **Accessibility**: Screen readers read the alt text aloud to blind and visually impaired users. Without it, they have no idea what the image shows.
2. **Broken images**: If the image fails to load (slow connection, wrong file path, server down), the alt text is displayed instead.
3. **Search engines**: Google cannot "see" images. It reads the alt text to understand what the image contains.

```html
<!-- GOOD: Descriptive alt text -->
<img src="team.jpg" alt="We Build Black team members at the 2025 Mavens I/O Conference">

<!-- BAD: Unhelpful alt text -->
<img src="team.jpg" alt="photo">

<!-- BAD: No alt text at all -->
<img src="team.jpg">
```

Write alt text as if you were describing the image to someone over the phone. Be specific and concise.

**One exception**: If an image is purely decorative (like a divider line or background pattern) and adds no information, use an empty alt attribute:

```html
<img src="decorative-border.png" alt="">
```

The empty `alt=""` tells screen readers to skip the image entirely.

### Width and Height

You can control the size of an image with the `width` and `height` attributes:

```html
<img src="logo.png" alt="We Build Black logo" width="200" height="100">
```

The values are in pixels. Setting both `width` and `height` is good practice because it tells the browser how much space to reserve for the image before it loads. This prevents the page from "jumping" as images load in.

If you set only one dimension, the browser automatically calculates the other to maintain the image's proportions:

```html
<!-- Set width only; height adjusts automatically -->
<img src="photo.jpg" alt="Community meetup" width="600">
```

---

## Image Formats: Choosing the Right One

Not all image formats are created equal. Each has strengths and trade-offs:

| Format | Best For | Transparency? | File Size | Quality |
|--------|----------|--------------|-----------|---------|
| **JPEG** (.jpg) | Photos, complex images | No | Small | Good (lossy compression) |
| **PNG** (.png) | Logos, screenshots, images with text | Yes | Medium-Large | Excellent (lossless) |
| **SVG** (.svg) | Icons, logos, simple graphics | Yes | Very small | Perfect at any size |
| **WebP** (.webp) | Everything (modern replacement) | Yes | Very small | Excellent |
| **GIF** (.gif) | Simple animations | Yes (limited) | Medium | Low (256 colors max) |

Here are practical guidelines:

- **Photographs** (people, landscapes, food): Use JPEG or WebP.
- **Logos and icons**: Use SVG if available, otherwise PNG.
- **Screenshots**: Use PNG.
- **Modern websites**: Use WebP when possible -- it gives you smaller files and better quality than JPEG or PNG. Just know that very old browsers may not support it.

---

## Audio and Video

HTML5 made it easy to embed audio and video directly in your pages, without needing third-party plugins.

### Audio

```html
<audio controls>
  <source src="podcast-episode.mp3" type="audio/mpeg">
  <source src="podcast-episode.ogg" type="audio/ogg">
  Your browser does not support the audio element.
</audio>
```

Key attributes:

- `controls` -- Displays play/pause buttons, volume slider, and a progress bar. Without this, the audio player is invisible.
- `<source>` elements let you provide the same audio in multiple formats. The browser uses the first format it supports.
- The text "Your browser does not support..." is a fallback message for very old browsers.

Other useful attributes:

```html
<!-- Autoplay (usually blocked by browsers unless muted) -->
<audio controls autoplay muted>
  <source src="music.mp3" type="audio/mpeg">
</audio>

<!-- Loop the audio -->
<audio controls loop>
  <source src="background-music.mp3" type="audio/mpeg">
</audio>
```

### Video

```html
<video controls width="640" height="360">
  <source src="workshop-recording.mp4" type="video/mp4">
  <source src="workshop-recording.webm" type="video/webm">
  Your browser does not support the video element.
</video>
```

Video works just like audio, with a few extra attributes:

- `width` and `height` set the dimensions of the video player.
- `poster` lets you set a thumbnail image that displays before the video plays:

```html
<video controls width="640" height="360" poster="thumbnail.jpg">
  <source src="workshop.mp4" type="video/mp4">
</video>
```

### Embedding YouTube Videos

Most of the time, you will embed videos from YouTube or Vimeo rather than hosting video files yourself (video files are huge). You do this with an `<iframe>`:

```html
<iframe
  width="560"
  height="315"
  src="https://www.youtube.com/embed/VIDEO_ID_HERE"
  title="Workshop Recording"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowfullscreen>
</iframe>
```

On YouTube, click "Share" then "Embed" on any video, and it gives you this code ready to paste. The `title` attribute is important for accessibility -- it describes what the iframe contains.

---

## The Figure and Figcaption Elements

When an image (or video, or code block) has a caption, wrap it in a `<figure>` element with a `<figcaption>`:

```html
<figure>
  <img src="mavens-io-2025.jpg" alt="Attendees at the Mavens I/O Conference listening to a keynote speaker on stage">
  <figcaption>Mavens I/O Conference 2025 -- Over 300 attendees gathered in Brooklyn.</figcaption>
</figure>
```

Think of `<figure>` like a framed photo on a wall with a label underneath it. The `<figure>` is the frame, the `<img>` is the photo, and the `<figcaption>` is the label.

This is better than just putting a paragraph under an image because it **semantically connects** the caption to the image. Screen readers and search engines understand that the caption describes that specific image.

You can also use `<figure>` for things other than images:

```html
<!-- A code example with a caption -->
<figure>
  <pre><code>&lt;h1&gt;Hello, world!&lt;/h1&gt;</code></pre>
  <figcaption>The simplest possible HTML heading.</figcaption>
</figure>
```

---

## Best Practices for Media on the Web

Here are guidelines that professional web developers follow:

### Images

1. **Always include alt text.** No exceptions (except purely decorative images, which get `alt=""`).
2. **Optimize file sizes.** A 5MB photograph will make your page load slowly. Use tools like TinyPNG or Squoosh to compress images before adding them to your site.
3. **Use the right format.** JPEG for photos, SVG for icons, PNG for screenshots, WebP for everything modern.
4. **Set width and height.** This prevents layout shifts as the page loads.

### Links

5. **Use descriptive link text.** "Learn about our programs" is better than "click here."
6. **Check your links.** Broken links frustrate users and hurt your search engine ranking.
7. **Use `rel="noopener noreferrer"`** with `target="_blank"` for security.

### Video and Audio

8. **Do not autoplay video with sound.** It is one of the most annoying things on the web. Users should control when media starts playing.
9. **Host large media on external platforms** (YouTube, Vimeo, SoundCloud) rather than on your own server. These platforms handle compression, bandwidth, and streaming for you.
10. **Always provide text alternatives.** Captions for video, transcripts for audio. Not everyone can watch or listen.

---

## Putting It All Together

Create a file called `gallery.html` that demonstrates everything from this lesson:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Brooklyn Photo Gallery</title>
  </head>
  <body>
    <h1>Brooklyn: My Neighborhood</h1>
    <p>A collection of images, links, and media from around Brooklyn, NY.</p>

    <h2>Photo Gallery</h2>

    <figure>
      <img src="https://placehold.co/600x400?text=Brooklyn+Bridge" alt="The Brooklyn Bridge spanning the East River at sunset" width="600" height="400">
      <figcaption>The Brooklyn Bridge at sunset -- one of the most iconic views in New York City.</figcaption>
    </figure>

    <figure>
      <img src="https://placehold.co/600x400?text=Prospect+Park" alt="Green trees and a walking path in Prospect Park" width="600" height="400">
      <figcaption>Prospect Park in the summer -- 585 acres of green space in the heart of Brooklyn.</figcaption>
    </figure>

    <h2>Useful Links</h2>
    <ul>
      <li><a href="https://webuildblack.com" target="_blank" rel="noopener noreferrer">We Build Black</a> -- Our home base in Brooklyn</li>
      <li><a href="https://www.brooklyn.org" target="_blank" rel="noopener noreferrer">Brooklyn Museum</a> -- World-class art and culture</li>
      <li><a href="#gallery-top">Back to top</a></li>
    </ul>

    <h2>A Sound of Brooklyn</h2>
    <audio controls>
      <source src="brooklyn-sounds.mp3" type="audio/mpeg">
      Your browser does not support the audio element.
    </audio>
    <p><small>Audio file not included -- replace the src with your own audio file to hear it play.</small></p>

    <hr>

    <p>Want to explore more? <a href="mailto:info@webuildblack.com">Contact us</a> or <a href="tel:+15551234567">give us a call</a>.</p>
  </body>
</html>
```

---

## Key Takeaways

1. **Links (`<a>`) are the connective tissue of the web.** Use the `href` attribute to specify where they go, and always write descriptive link text.
2. **Absolute URLs** (`https://...`) point to external sites. **Relative URLs** (`about.html`, `../index.html`) point to pages on your own site.
3. **Use `target="_blank"` with `rel="noopener noreferrer"`** to open external links in new tabs securely.
4. **Images (`<img>`) require two attributes:** `src` (the file location) and `alt` (a text description for accessibility).
5. **Choose the right image format:** JPEG for photos, PNG for screenshots, SVG for logos, WebP for modern performance.
6. **HTML5 `<audio>` and `<video>`** let you embed media directly. Always include the `controls` attribute so users can play/pause.
7. **`<figure>` and `<figcaption>`** semantically connect an image (or other media) with its caption.

---

## Try It Yourself

Create a file called `my-favorites.html` with the following:

1. An `<h1>` heading: "My Favorite Things."
2. An `<h2>` section called "Favorite Places" with at least two `<figure>` elements. Each figure should contain an `<img>` (use placeholder images from `https://placehold.co/400x300?text=Your+Text`) and a `<figcaption>`.
3. An `<h2>` section called "Favorite Websites" with an unordered list of at least three links to real websites. Each link should open in a new tab with proper security attributes.
4. An `<h2>` section called "Favorite Music" with an `<audio>` element (it is okay if you do not have an audio file -- include the element with a placeholder `src` and a fallback message).
5. At the bottom, include a link that says "Email me about your favorites" using `mailto:`.
6. Use a same-page link: add an `id` to your `<h1>` and create a "Back to top" link at the bottom.

Test all your links to make sure they work. Check that your images display. View the page in your browser and make sure it looks right.

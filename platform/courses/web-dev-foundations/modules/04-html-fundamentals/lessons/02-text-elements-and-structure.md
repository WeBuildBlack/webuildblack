---
title: "Text Elements and Structure"
estimatedMinutes: 45
---

# Text Elements and Structure

In the last lesson, you learned how to create an HTML page and put some basic content on it. Now it is time to go deeper. Every webpage is mostly text -- articles, menus, descriptions, instructions, lists. HTML gives you a rich set of elements to organize that text so it is clear, scannable, and meaningful.

Think about a newspaper. It does not just dump every word in one giant block. It has bold headlines, sub-headlines, columns, bullet points, and pull quotes. Each piece of formatting tells you something: "This is the main story," "This is a side note," "These items are related." HTML lets you do the same thing for the web.

---

## Headings: The Hierarchy of Your Page

HTML gives you six levels of headings, from `<h1>` (the biggest and most important) to `<h6>` (the smallest and least important):

```html
<h1>Main Headline</h1>
<h2>Section Title</h2>
<h3>Subsection Title</h3>
<h4>Sub-Subsection Title</h4>
<h5>Minor Heading</h5>
<h6>Smallest Heading</h6>
```

Think of headings like a newspaper:

- `<h1>` is the front-page headline -- there is usually only one per page.
- `<h2>` is a section headline, like "Sports," "Business," or "Local News."
- `<h3>` is a story headline within a section.
- `<h4>` through `<h6>` are for increasingly specific sub-points.

### Rules for Using Headings

**Use only one `<h1>` per page.** This is the main title of the page. Search engines like Google use it to understand what your page is about.

**Do not skip heading levels.** Go from `<h1>` to `<h2>` to `<h3>`, not from `<h1>` directly to `<h4>`. Skipping levels confuses screen readers and search engines.

**Headings are for structure, not size.** It is tempting to use an `<h3>` just because you want smaller text. Do not do this. Use the heading level that matches the content's importance. You will control the visual size with CSS later.

```html
<!-- CORRECT: Headings follow a logical hierarchy -->
<h1>We Build Black</h1>
<h2>Our Programs</h2>
<h3>Fast Track</h3>
<h3>Crowns of Code</h3>
<h2>Get Involved</h2>
<h3>Volunteer</h3>
<h3>Donate</h3>

<!-- WRONG: Headings chosen for visual size, not meaning -->
<h1>We Build Black</h1>
<h4>Our Programs</h4>   <!-- Skipped h2 and h3! -->
<h2>Fast Track</h2>     <!-- This is not more important than "Our Programs" -->
```

---

## Paragraphs

The `<p>` element is the workhorse of text content. Any block of text that forms a complete thought should be wrapped in a paragraph tag:

```html
<p>We Build Black is a 501(c)(3) non-profit organization founded in Brooklyn, NY. Our mission is to empower the Black community to achieve socio-economic change through technical education and professional development.</p>

<p>Since 2017, we have hosted conferences, run workforce training programs, and built a community of over 3,000 members across the tech industry.</p>
```

Each `<p>` element creates a new block of text with space above and below it. You do not need to add blank lines between paragraphs in your HTML -- the browser handles the spacing automatically.

**A common mistake**: putting all your text in one giant `<p>` tag. Break your content into logical paragraphs, just like you would in an essay or email. Each paragraph should cover one idea.

---

## Line Breaks and Horizontal Rules

### Line Breaks: `<br>`

Sometimes you need a line break within a paragraph without starting a whole new paragraph. The `<br>` element does this:

```html
<p>We Build Black<br>
147 Front Street<br>
Brooklyn, NY 11201</p>
```

This displays as:

> We Build Black
> 147 Front Street
> Brooklyn, NY 11201

Notice that `<br>` is a void element -- it has no closing tag and no content. It simply says "go to the next line right here."

**When to use `<br>`**: Addresses, poetry, song lyrics -- situations where line breaks are part of the content itself. Do not use `<br>` to add vertical space between sections. That is what CSS is for.

### Horizontal Rules: `<hr>`

The `<hr>` element creates a horizontal line across the page. It is used to indicate a thematic break between sections:

```html
<h2>Chapter 1: The Beginning</h2>
<p>It all started on a Tuesday morning...</p>

<hr>

<h2>Chapter 2: The Challenge</h2>
<p>Three weeks later, everything changed...</p>
```

Like `<br>`, the `<hr>` element is a void element with no closing tag. Use it sparingly -- headings usually do a better job of separating sections.

---

## Bold and Italic: Semantic vs. Visual

HTML gives you two ways to make text bold and two ways to make it italic. They look the same in the browser, but they mean different things.

### Bold Text

```html
<!-- Semantic: This text is important -->
<p>Please <strong>do not share your password</strong> with anyone.</p>

<!-- Visual: This text just looks bold -->
<p>My favorite color is <b>blue</b>.</p>
```

- `<strong>` means **"this content is important."** Screen readers will emphasize it, and search engines note it.
- `<b>` means **"make this text bold visually"** without implying extra importance.

### Italic Text

```html
<!-- Semantic: This text has emphasis -->
<p>You <em>must</em> complete all assignments to pass.</p>

<!-- Visual: This text is stylistically different -->
<p>The book <i>Beloved</i> by Toni Morrison is a masterpiece.</p>
```

- `<em>` means **"this content has emphasis."** A screen reader will change its tone of voice. "You MUST complete all assignments."
- `<i>` means **"this text is stylistically different"** -- used for book titles, foreign words, technical terms, or thoughts.

### Which Should You Use?

**Default to `<strong>` and `<em>`.** They carry meaning, which makes your HTML more accessible and more meaningful to search engines. Use `<b>` and `<i>` only when you specifically want a visual style without added importance.

Here is a quick reference:

| Element | Visual Effect | Meaning | Use When... |
|---------|--------------|---------|-------------|
| `<strong>` | **Bold** | Important content | Warning someone, key instructions |
| `<b>` | **Bold** | No special meaning | Keywords, product names |
| `<em>` | *Italic* | Emphasized content | Stressing a word in a sentence |
| `<i>` | *Italic* | Alternate voice/mood | Book titles, foreign words |

---

## Lists: Organizing Related Items

Lists are one of the most common HTML elements. Navigation menus, recipe ingredients, step-by-step instructions, feature comparisons -- they are all lists under the hood.

### Unordered Lists (Bullet Points)

Use `<ul>` when the order of items does not matter:

```html
<h2>Ingredients</h2>
<ul>
  <li>2 cups of flour</li>
  <li>1 cup of sugar</li>
  <li>3 eggs</li>
  <li>1 teaspoon of vanilla extract</li>
</ul>
```

This displays as a bulleted list:

- 2 cups of flour
- 1 cup of sugar
- 3 eggs
- 1 teaspoon of vanilla extract

### Ordered Lists (Numbered Steps)

Use `<ol>` when the order matters:

```html
<h2>Directions</h2>
<ol>
  <li>Preheat the oven to 350 degrees.</li>
  <li>Mix the dry ingredients in a large bowl.</li>
  <li>Add the eggs and vanilla extract.</li>
  <li>Pour the batter into a greased pan.</li>
  <li>Bake for 30 minutes or until golden brown.</li>
</ol>
```

This displays as a numbered list:

1. Preheat the oven to 350 degrees.
2. Mix the dry ingredients in a large bowl.
3. Add the eggs and vanilla extract.
4. Pour the batter into a greased pan.
5. Bake for 30 minutes or until golden brown.

### The Rules of Lists

- `<li>` elements **must** be direct children of `<ul>` or `<ol>`. You cannot put an `<li>` outside of a list.
- You **can** put almost anything inside an `<li>` -- paragraphs, images, links, even other lists.
- Use `<ul>` for items like ingredients, features, or navigation links. Use `<ol>` for steps, rankings, or anything sequential.

### Nested Lists

Lists can contain other lists. This is useful for outlines, sub-categories, or multi-level navigation:

```html
<h2>WBB Programs</h2>
<ul>
  <li>Workforce Training
    <ul>
      <li>Fast Track</li>
      <li>The Bridge</li>
    </ul>
  </li>
  <li>Youth Programs
    <ul>
      <li>Crowns of Code</li>
    </ul>
  </li>
  <li>Events
    <ul>
      <li>Mavens I/O Conference</li>
      <li>Monthly Meetups</li>
    </ul>
  </li>
</ul>
```

Notice how the nested `<ul>` goes **inside** the `<li>`, not after it. The inner list is content that belongs to that list item. Indentation makes this relationship clear.

---

## Blockquotes

The `<blockquote>` element is used for quoting content from another source. Browsers typically indent blockquotes to visually set them apart:

```html
<blockquote>
  <p>The function of education is to teach one to think intensively and to think critically. Intelligence plus character -- that is the goal of true education.</p>
</blockquote>
<p>-- Dr. Martin Luther King Jr.</p>
```

You can also use the `cite` attribute to reference the source URL:

```html
<blockquote cite="https://example.com/source-article">
  <p>Technology is best when it brings people together.</p>
</blockquote>
```

For shorter inline quotes within a sentence, use the `<q>` element instead:

```html
<p>As the saying goes, <q>knowledge is power.</q></p>
```

The browser will automatically add quotation marks around `<q>` content.

---

## Preformatted Text and Code

### Preformatted Text: `<pre>`

Normally, browsers collapse multiple spaces and line breaks into a single space. The `<pre>` element preserves your exact formatting -- every space, tab, and line break is displayed as you typed it:

```html
<pre>
Name         Role            Location
----         ----            --------
Devin        Founder         Brooklyn, NY
Sarah        Instructor      Manhattan, NY
Marcus       Mentor          Queens, NY
</pre>
```

This is useful for ASCII art, displaying data tables in plain text, or showing any content where exact spacing matters.

### Code: `<code>`

The `<code>` element marks text as computer code. Browsers typically display it in a monospace font (where every character takes up the same width, like a typewriter):

```html
<p>To create a paragraph, use the <code>&lt;p&gt;</code> element.</p>
```

For blocks of code (multiple lines), combine `<pre>` and `<code>`:

```html
<pre><code>&lt;!DOCTYPE html&gt;
&lt;html lang="en"&gt;
  &lt;head&gt;
    &lt;title&gt;My Page&lt;/title&gt;
  &lt;/head&gt;
&lt;/html&gt;</code></pre>
```

**Why `&lt;` and `&gt;` instead of `<` and `>`?** Because the browser would try to interpret `<html>` as an actual HTML tag instead of displaying it as text. These are called **HTML entities** -- special codes for characters that have meaning in HTML:

| Entity | Character | Name |
|--------|-----------|------|
| `&lt;` | `<` | Less than |
| `&gt;` | `>` | Greater than |
| `&amp;` | `&` | Ampersand |
| `&quot;` | " | Double quote |
| `&apos;` | ' | Apostrophe |
| `&nbsp;` | (space) | Non-breaking space |

You will not need these often, but knowing they exist will save you from confusion when you see them in other people's code.

---

## Other Useful Text Elements

Here are a few more text elements worth knowing:

### Superscript and Subscript

```html
<p>Water is H<sub>2</sub>O.</p>
<p>Einstein's famous equation: E = mc<sup>2</sup></p>
```

- `<sub>` pushes text below the baseline (subscript) -- great for chemical formulas.
- `<sup>` pushes text above the baseline (superscript) -- great for exponents and footnotes.

### Marking Text

```html
<p>Search results for "HTML": Learn <mark>HTML</mark> fundamentals with We Build Black.</p>
```

The `<mark>` element highlights text with a yellow background, like a highlighter pen on paper. Use it to draw attention to search terms or key phrases.

### Deleted and Inserted Text

```html
<p>The workshop is on <del>Saturday</del> <ins>Sunday</ins> at 2 PM.</p>
```

- `<del>` shows text with a strikethrough, indicating it has been removed.
- `<ins>` shows text with an underline, indicating it has been added.

### Small Text

```html
<p><small>Copyright 2026 We Build Black. All rights reserved.</small></p>
```

The `<small>` element represents side comments and small print, like copyright notices or legal disclaimers.

---

## Building a Well-Structured Text Document

Let's put everything together and build a complete page that uses all the text elements you have learned. Create a file called `community-newsletter.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WBB Community Newsletter - March 2026</title>
  </head>
  <body>
    <h1>We Build Black Community Newsletter</h1>
    <p><small>March 2026 Edition</small></p>

    <hr>

    <h2>This Month's Highlights</h2>

    <h3>Fast Track Cohort Graduates!</h3>
    <p>We are thrilled to announce that <strong>12 members</strong> of our
    Winter 2026 Fast Track cohort have completed the program. Every single
    graduate has <em>already</em> started interviewing for roles in their
    chosen track.</p>

    <blockquote>
      <p>Fast Track gave me the structure and accountability I needed. I went
      from feeling lost to landing three interviews in one week.</p>
    </blockquote>
    <p>-- Keisha, Fast Track Graduate, UX Design Track</p>

    <h3>Upcoming Events</h3>
    <ol>
      <li><strong>March 20:</strong> Monthly Meetup -- Intro to AI Engineering</li>
      <li><strong>March 27:</strong> She Builds Black Workshop -- Resume Review</li>
      <li><strong>April 3:</strong> The Bridge Kickoff -- Spring 2026 Cohort</li>
    </ol>

    <h2>Learning Corner</h2>
    <p>This month's tip: when writing HTML, always use
    <code>&lt;strong&gt;</code> instead of <code>&lt;b&gt;</code> when
    you want to indicate important content. Screen readers will
    <em>hear</em> the difference.</p>

    <h2>Community Shoutouts</h2>
    <ul>
      <li><mark>Marcus J.</mark> -- Landed a frontend developer role at a
      fintech startup!</li>
      <li><mark>Aisha T.</mark> -- Published her first open-source project
      on GitHub!</li>
      <li><mark>Devon R.</mark> -- Completed 100 days of code!</li>
    </ul>

    <hr>

    <p><small>&copy; 2026 We Build Black. 147 Front Street, Brooklyn, NY 11201.</small></p>
  </body>
</html>
```

Open this in your browser and look at how each element contributes to the page's structure. The headings create a clear hierarchy. The lists organize related items. The blockquote stands out as a testimonial. The semantic elements (`<strong>`, `<em>`, `<mark>`) add meaning beyond just visual styling.

---

## Key Takeaways

1. **Headings (`<h1>` through `<h6>`) create a content hierarchy.** Use one `<h1>` per page, and do not skip levels.
2. **Paragraphs (`<p>`) are the building blocks of text content.** Each paragraph should contain one complete idea.
3. **`<strong>` and `<em>` carry meaning** (importance and emphasis), while `<b>` and `<i>` are purely visual. Default to the semantic versions.
4. **Unordered lists (`<ul>`) are for items without a specific order.** Ordered lists (`<ol>`) are for sequential items. Both use `<li>` for individual items.
5. **Lists can be nested** inside other lists to create multi-level hierarchies.
6. **`<blockquote>` is for quoting external sources.** `<q>` is for shorter inline quotes.
7. **`<pre>` preserves whitespace formatting**, and `<code>` marks text as computer code. Combine them for code blocks.

---

## Try It Yourself

Create a file called `book-review.html` that includes:

1. An `<h1>` with the title of a book you have read (or want to read).
2. An `<h2>` that says "About the Author" with a paragraph about the author.
3. An `<h2>` that says "Summary" with at least two paragraphs summarizing the book (use `<em>` for any emphasized words).
4. A `<blockquote>` with your favorite quote from the book (or one you make up).
5. An `<h2>` that says "Why I Recommend It" with an ordered list of at least three reasons, ranked from most to least important.
6. An `<h2>` that says "Similar Books" with an unordered list of at least three other books.
7. A `<small>` element at the bottom with "Review written by [Your Name], March 2026."

Bonus: Add a nested list under one of the "Similar Books" entries with sub-items like "Also by this author" or "Same genre."

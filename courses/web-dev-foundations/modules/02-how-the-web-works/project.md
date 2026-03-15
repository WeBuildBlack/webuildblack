---
title: "Module Project: Request Inspector"
estimatedMinutes: 60
---

# Module Project: Request Inspector

Time to put everything you learned in this module into practice. In this project, you will use browser DevTools to inspect real websites, document what you find, and create your own "How the Web Works" explainer page.

This is a hands-on investigation project. You are playing detective, using DevTools to uncover what is really happening when a website loads.

---

## What You Will Need

- A web browser with DevTools (Chrome recommended)
- A text editor (VS Code, or any plain text editor)
- The starter files below

---

## Part 1: Website Investigation (3 Sites)

Pick three different types of websites to investigate. Choose one from each category:

- **A news site** (e.g., nytimes.com, bbc.com, npr.org)
- **An e-commerce site** (e.g., etsy.com, amazon.com, target.com)
- **A community or organization site** (e.g., webuildblack.com, wikipedia.org, your school's website)

For each website, create a section in your documentation file (use the template below) and record the following:

### URL Breakdown

Look at the URL in your browser's address bar and identify:
- The protocol (http or https)
- The domain name
- The path (if any)
- Any query strings or fragments

### Network Analysis

1. Open DevTools and go to the **Network** tab
2. Make sure the tab is clear (click the clear button or the circle-with-a-line icon)
3. **Reload the page** so all requests are captured
4. Record:
   - **Total number of requests** (shown at the bottom of the Network tab)
   - **Total data transferred** (also at the bottom)
   - **Page load time** (shown in the summary bar, labeled "Finish" or "Load")
   - **The largest file** (click the "Size" column header to sort by size)
   - **The file types loaded** (click the filter buttons. How many CSS files? JS files? Images?)

### Status Code Hunt

With the Network tab still showing all the requests from your page reload, find and list **5 different HTTP status codes**. For each one, record:
- The status code number
- The file/resource it was for
- What that status code means (refer back to your lesson notes)

Hint: Most requests will be 200. Look for 301s (redirects), 304s (cached), or even the occasional 404. You may need to scroll through the list or visit a page with a broken link.

### DOM Structure

Switch to the **Elements** tab and describe the high-level structure of the page:
- What is inside the `<head>` element? (List 3-4 things you see)
- What are the main structural elements inside `<body>`? (e.g., `<header>`, `<nav>`, `<main>`, `<footer>`)
- How deep does the nesting go? Pick one section and describe the parent-child relationships for 3-4 levels

---

## Part 2: HTML/CSS Inspection (1 Site)

Pick one of your three websites (or choose a new one) for a closer look at its HTML and CSS.

### Find Semantic HTML

Using the Elements tab, find and document **5 semantic HTML elements** the site uses. For each one, record:
- The element name (e.g., `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>`, `<aside>`)
- Where it appears in the page structure
- What content it contains

Do not worry if you do not know what all these elements do yet. You will learn them in the HTML module. For now, just find them and note what they seem to be used for.

### Modify a Heading

1. Use the inspect tool (cursor icon) to click on the page's main heading
2. In the Elements panel, double-click on the heading text
3. Change it to say: "I inspected this with DevTools!"
4. Describe what happened. Did the page update immediately? Does it affect the real website?

### Change a Background Color

1. Select a section or div element that has a visible background color
2. In the Styles panel, find the `background-color` property (or `background`)
3. Click on the color value and change it to something different
4. Record: what was the original color? What did you change it to? How did it look?

If you cannot find an element with a background color, select the `<body>` element and add one:
- Click the `+` button in the Styles panel
- Type `background-color: lightblue;`

### Identify the Body Font

1. Select a paragraph (`<p>`) element on the page
2. In the Styles panel, look for the `font-family` property
3. You might need to scroll through the styles or look in the "Computed" sub-tab
4. Record the font family used for body text

---

## Part 3: Build Your Own Explainer Page

Create a one-page HTML file that explains how the web works in your own words. This page is for you. It is your personal reference guide for everything you learned in this module.

Use the starter HTML file below. Replace every `<!-- TODO: ... -->` comment with your own content.

### Starter HTML File

Create a file called `how-the-web-works.html` and paste in the following starter code:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>How the Web Works: My Explainer</title>
    <style>
        body {
            font-family: Georgia, 'Times New Roman', serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.7;
            color: #2C170B;
            background-color: #FFF8F0;
        }

        h1 {
            color: #7D4E21;
            border-bottom: 3px solid #AE8156;
            padding-bottom: 10px;
        }

        h2 {
            color: #7D4E21;
            margin-top: 40px;
        }

        .diagram {
            background-color: #F5EDE4;
            border: 1px solid #AE8156;
            border-radius: 8px;
            padding: 20px;
            font-family: 'Courier New', monospace;
            white-space: pre;
            overflow-x: auto;
            margin: 20px 0;
        }

        .vocab-list {
            background-color: #F5EDE4;
            border-left: 4px solid #7D4E21;
            padding: 15px 20px;
            margin: 20px 0;
        }

        .vocab-list dt {
            font-weight: bold;
            color: #7D4E21;
            margin-top: 10px;
        }

        .vocab-list dd {
            margin-left: 20px;
            margin-bottom: 10px;
        }

        footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #AE8156;
            text-align: center;
            color: #7D4E21;
            font-size: 0.9em;
        }
    </style>
</head>
<body>

    <h1>How the Web Works</h1>
    <p><em>Written by: <!-- TODO: Add your name --></em></p>
    <p><em>Date: <!-- TODO: Add today's date --></em></p>

    <!-- ============================================ -->
    <h2>1. The Internet vs. the Web</h2>
    <!-- TODO: Explain the difference between the internet and the web
         in your own words. Use your own analogy. It does not have to be
         the same one from the lesson. Make it something that makes sense
         to YOU. (2-3 sentences) -->


    <!-- ============================================ -->
    <h2>2. Clients and Servers</h2>
    <!-- TODO: Explain the client-server model. What is a client?
         What is a server? Use your own analogy. (3-4 sentences) -->


    <!-- ============================================ -->
    <h2>3. The Request-Response Cycle</h2>
    <!-- TODO: Explain what happens when your browser requests a web page.
         Walk through the steps: request goes out, server processes it,
         response comes back. (3-5 sentences) -->

    <div class="diagram">
    <!-- TODO: Create a simple text/ASCII diagram showing the
         request-response cycle. It can be as simple or detailed
         as you like. Here is an example format:

         Browser  ----request---->  Server
         Browser  <---response----  Server

         Make it your own! -->
    </div>

    <!-- ============================================ -->
    <h2>4. HTTP Methods</h2>
    <!-- TODO: Explain GET and POST in your own words.
         Give one real-world example of each. (2-4 sentences) -->


    <!-- ============================================ -->
    <h2>5. Status Codes</h2>
    <!-- TODO: List at least 4 HTTP status codes.
         For each one, write the code number, its name,
         and what it means in plain language.
         Use a list, a table, or whatever format works for you. -->


    <!-- ============================================ -->
    <h2>6. DNS: The Phone Book of the Internet</h2>
    <!-- TODO: Explain what DNS does and why it is needed.
         Walk through the basic idea of how a domain name gets
         turned into an IP address. (3-5 sentences) -->


    <!-- ============================================ -->
    <h2>7. What Happens When You Visit a Website</h2>
    <!-- TODO: Tell the COMPLETE story from start to finish.
         You type a URL and press Enter. Walk through every step
         until the page appears on screen. Include DNS lookup,
         HTTP request, server response, and browser rendering.
         This is the big picture. (5-8 sentences or a numbered list) -->


    <!-- ============================================ -->
    <h2>Key Vocabulary</h2>
    <dl class="vocab-list">
        <!-- TODO: Define each of these terms in your own words.
             Do not copy definitions from the lessons. Put them
             in language that makes sense to you. -->

        <dt>Client</dt>
        <dd><!-- TODO: Your definition --></dd>

        <dt>Server</dt>
        <dd><!-- TODO: Your definition --></dd>

        <dt>HTTP / HTTPS</dt>
        <dd><!-- TODO: Your definition --></dd>

        <dt>URL</dt>
        <dd><!-- TODO: Your definition --></dd>

        <dt>DNS</dt>
        <dd><!-- TODO: Your definition --></dd>

        <dt>IP Address</dt>
        <dd><!-- TODO: Your definition --></dd>

        <dt>Domain Name</dt>
        <dd><!-- TODO: Your definition --></dd>

        <dt>Status Code</dt>
        <dd><!-- TODO: Your definition --></dd>

        <dt>GET Request</dt>
        <dd><!-- TODO: Your definition --></dd>

        <dt>POST Request</dt>
        <dd><!-- TODO: Your definition --></dd>

        <dt>DOM</dt>
        <dd><!-- TODO: Your definition --></dd>

        <dt>DevTools</dt>
        <dd><!-- TODO: Your definition --></dd>
    </dl>

    <footer>
        <p>Created as part of the Web Development Foundations course at We Build Black</p>
    </footer>

</body>
</html>
```

### What to Do

1. Save the starter code as `how-the-web-works.html`
2. Open the file in your browser (double-click it, or drag it into your browser window)
3. Replace every `<!-- TODO: ... -->` comment with your own content
4. Save and refresh your browser to see your changes
5. Use DevTools to inspect your own page. See how your HTML appears in the Elements tab

Your explainer should:
- Be written entirely in your own words (do not copy-paste from the lessons)
- Use analogies that make sense to you
- Include at least one ASCII art diagram in the diagram section
- Define all 12 vocabulary terms

---

## Stretch Goals

If you finish the main project and want to go further:

### Find an API Call

Many modern websites make requests to APIs (Application Programming Interfaces) to load data dynamically, things like social media feeds, product listings, or weather data.

1. Open the Network tab on a website you use regularly
2. Filter by **Fetch/XHR** (this shows API-style requests, not regular page resources)
3. Reload the page and interact with it (scroll, click, search)
4. Find a request that returns **JSON data** (in the Response tab, it will look like structured data with curly braces and key-value pairs)
5. Document: What URL was the API call made to? What data did it return? Can you guess what the data is for?

### Compare Load Performance

Pick two websites that serve a similar purpose (for example, two news sites or two e-commerce sites). Using the Network tab, compare:
- Number of requests
- Total data transferred
- Load time
- Largest file

Which site loads faster? Why do you think that is?

### Style Your Explainer

Add more CSS to your explainer page to make it look polished:
- Add a background color or gradient
- Style the headings with a different font
- Add borders or shadows to sections
- Make it look like something you would be proud to show someone

---

## Documentation Template

Use this markdown template for Parts 1 and 2. Create a file called `request-inspector-notes.md`:

```markdown
# Request Inspector: Investigation Notes

**Name:** [Your name]
**Date:** [Today's date]

---

## Site 1: [Website Name]

**URL:** [Full URL]
- Protocol: [http or https]
- Domain: [domain name]
- Path: [path, if any]

### Network Analysis
- Total requests: [number]
- Data transferred: [size]
- Load time: [time]
- Largest file: [filename, size]
- File type breakdown:
  - CSS files: [number]
  - JS files: [number]
  - Images: [number]
  - Fonts: [number]
  - Other: [number]

### Status Codes Found
1. [code] - [filename] - [what it means]
2. [code] - [filename] - [what it means]
3. [code] - [filename] - [what it means]
4. [code] - [filename] - [what it means]
5. [code] - [filename] - [what it means]

### DOM Structure Notes
- Inside `<head>`: [list 3-4 things]
- Main `<body>` structure: [list the top-level elements]
- Nesting example: [describe parent-child for one section]

---

## Site 2: [Website Name]

[Same structure as Site 1]

---

## Site 3: [Website Name]

[Same structure as Site 1]

---

## Deep Dive: [Website Name]

### Semantic HTML Elements Found
1. `<[element]>` - used for: [description]
2. `<[element]>` - used for: [description]
3. `<[element]>` - used for: [description]
4. `<[element]>` - used for: [description]
5. `<[element]>` - used for: [description]

### Heading Modification
- Original heading text: [text]
- I changed it to: [new text]
- What happened: [describe]

### Background Color Change
- Element selected: [which element]
- Original color: [color]
- New color: [color]
- How it looked: [describe]

### Body Font
- Font family: [font name(s)]
- Found in: [which panel/tab]
```

---

## Submission Checklist

Before you consider this project complete, make sure you have:

- [ ] **Part 1:** Investigated 3 different websites
- [ ] **Part 1:** Documented URL components for each site
- [ ] **Part 1:** Recorded network analysis data (requests, size, load time) for each site
- [ ] **Part 1:** Found and documented 5 HTTP status codes
- [ ] **Part 1:** Described the DOM structure for each site
- [ ] **Part 2:** Found and documented 5 semantic HTML elements
- [ ] **Part 2:** Modified a heading using the Elements tab
- [ ] **Part 2:** Changed a background color using the Styles panel
- [ ] **Part 2:** Identified the body font family
- [ ] **Part 3:** Created `how-the-web-works.html` from the starter code
- [ ] **Part 3:** Replaced ALL `<!-- TODO: ... -->` comments with your own content
- [ ] **Part 3:** Included at least one ASCII art diagram
- [ ] **Part 3:** Defined all 12 vocabulary terms in your own words
- [ ] **Part 3:** Opened your HTML file in a browser and verified it displays correctly
- [ ] **Part 3:** Used DevTools to inspect your own page

You did it! You have gone from "what even is a web request?" to inspecting real websites with professional tools. That is a huge step. Everything you build from here on out (HTML pages, CSS styles, JavaScript interactions) is built on the foundation you just established.

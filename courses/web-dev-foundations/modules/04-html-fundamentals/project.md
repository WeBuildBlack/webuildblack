---
title: "Module Project: Recipe Page"
estimatedMinutes: 90
---

# Module Project: Recipe Page

You have spent this module learning the building blocks of HTML -- document structure, text elements, links, images, forms, and semantic elements. Now it is time to bring everything together and build something real.

In this project, you will create a **complete recipe page** for a dish of your choice. This is not just a Module 04 project -- it is a **through-line project** that you will continue working on throughout the course. In Module 05, you will style it with CSS. In Module 07, you will make it responsive for mobile devices. The HTML you write today is the foundation that everything else will build on.

Choose a dish you know how to make or one you would love to try. It can be a family recipe, something from your culture, or a meal you cook every week. Make it personal -- this is your page.

## What You'll Practice

- Proper HTML document structure from Lesson 1 (DOCTYPE, html, head, body)
- Headings hierarchy and text elements from Lesson 2 (h1-h3, paragraphs, lists, blockquotes)
- Links, images, and media from Lesson 3 (anchor tags, img with alt text, figure/figcaption)
- Forms and inputs from Lesson 4 (form, labels, various input types, validation)
- Semantic HTML and accessibility from Lesson 5 (header, nav, main, footer, section, article, ARIA)

## Project Setup

Create a new folder for your project and set up the file:

```bash
mkdir recipe-page
cd recipe-page
```

Create a file called `index.html` inside the `recipe-page` folder. You can also create an `images` folder if you want to use local images, though placeholder images work perfectly fine.

## Starter Code

Copy this starter HTML into your `index.html` file. Every section has `<!-- TODO: ... -->` comments telling you what to build. Replace each TODO with real HTML content:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- TODO: Add a descriptive <title> for your recipe page -->
    <title>Recipe Page</title>
  </head>
  <body>

    <!-- TODO: Add a skip link for keyboard users -->
    <!-- Hint: <a href="#main-content">Skip to main content</a> -->


    <!-- ============================================ -->
    <!-- HEADER SECTION -->
    <!-- ============================================ -->
    <header>
      <!-- TODO: Add a site name or logo using an <h1> or <img> -->
      <!-- Example: <h1>Your Name's Kitchen</h1> -->


      <!-- TODO: Add a <nav> with links to sections on this page -->
      <!-- Include links to: #about, #ingredients, #instructions, #reviews -->
      <!-- Use an unordered list inside the nav for the links -->

    </header>


    <!-- ============================================ -->
    <!-- MAIN CONTENT -->
    <!-- ============================================ -->
    <main id="main-content">

      <!-- RECIPE HERO SECTION -->
      <section id="about">
        <!-- TODO: Add an <h2> with the name of your dish -->


        <!-- TODO: Add a <figure> with an image of the dish and a <figcaption> -->
        <!-- Use a placeholder image if you don't have a real photo: -->
        <!-- https://placehold.co/800x400?text=Your+Dish+Name -->
        <!-- Don't forget descriptive alt text! -->


        <!-- TODO: Add 1-2 paragraphs describing the dish -->
        <!-- What is it? Where does it come from? Why do you love it? -->
        <!-- Use <strong> or <em> to emphasize key words -->


        <!-- TODO: Add a blockquote with a quote about food or cooking -->
        <!-- This can be from a famous chef, a family member, or yourself -->

      </section>


      <!-- RECIPE DETAILS SECTION -->
      <section>
        <h2>Recipe Details</h2>

        <!-- TODO: Add an unordered list with the following info: -->
        <!-- Prep time, Cook time, Total time, Servings, Difficulty -->
        <!-- Example: <li><strong>Prep Time:</strong> 15 minutes</li> -->

      </section>


      <!-- INGREDIENTS SECTION -->
      <section id="ingredients">
        <!-- TODO: Add an <h2> heading: "Ingredients" -->


        <!-- TODO: Add an unordered list with at least 8 ingredients -->
        <!-- Be specific: "2 cups all-purpose flour" not just "flour" -->

      </section>


      <!-- INSTRUCTIONS SECTION -->
      <section id="instructions">
        <!-- TODO: Add an <h2> heading: "Instructions" -->


        <!-- TODO: Add an ordered list with at least 6 steps -->
        <!-- Each step should be a complete sentence -->
        <!-- Use <strong> to highlight key actions or temperatures -->

      </section>


      <!-- TIPS SECTION -->
      <aside>
        <!-- TODO: Add an <h2> heading: "Chef's Tips" -->


        <!-- TODO: Add an unordered list with 3-5 cooking tips -->
        <!-- These are helpful but not essential to the recipe -->

      </aside>


      <!-- RELATED LINKS SECTION -->
      <section>
        <h2>Learn More</h2>

        <!-- TODO: Add a paragraph with at least 2 links: -->
        <!-- 1. A link to the original recipe source (or a cooking website) -->
        <!--    This should open in a new tab with rel="noopener noreferrer" -->
        <!-- 2. A link to a related recipe on another site -->


        <!-- TODO: Add a link back to the top of the page -->
        <!-- Hint: <a href="#about">Back to top</a> -->

      </section>


      <!-- REVIEW FORM SECTION -->
      <section id="reviews">
        <h2>Submit Your Review</h2>
        <p>Tried this recipe? Let us know how it turned out!</p>

        <!-- TODO: Build a complete review form with <form action="#" method="post"> -->
        <!-- The form should include ALL of the following: -->

        <!-- 1. A <fieldset> for "Reviewer Information" with: -->
        <!--    - Text input for name (required) with a <label> -->
        <!--    - Email input for email (required) with a <label> -->

        <!-- 2. A <fieldset> for "Your Review" with: -->
        <!--    - A <select> dropdown for "Rating" with options: -->
        <!--      5 Stars, 4 Stars, 3 Stars, 2 Stars, 1 Star -->
        <!--    - Radio buttons for "Would you make this again?" -->
        <!--      Options: Yes, Maybe, No -->
        <!--    - A <select> dropdown for "Difficulty Level" with options: -->
        <!--      Easy, Medium, Hard -->
        <!--    - A <textarea> for "Your Comments" (required, minlength 20) -->

        <!-- 3. A checkbox: "Email me when new recipes are posted" -->

        <!-- 4. A submit button: "Submit Review" -->

        <!-- Remember: Every input needs a <label> with matching for/id! -->
        <!-- Remember: Use the required attribute on mandatory fields! -->

      </section>

    </main>


    <!-- ============================================ -->
    <!-- FOOTER SECTION -->
    <!-- ============================================ -->
    <footer>
      <!-- TODO: Add a copyright notice with your name and the year -->
      <!-- Use the &copy; entity for the copyright symbol -->


      <!-- TODO: Add a <nav> with at least 2 footer links -->
      <!-- Examples: link to your email (mailto:), link to WBB -->
      <!-- Give this nav an aria-label="Footer navigation" -->

    </footer>

  </body>
</html>
```

## Step-by-Step Guide

Work through the sections in order. After completing each section, save your file and refresh your browser to see the result.

### Step 1: Page Setup (5 minutes)

- Update the `<title>` to something descriptive like "Grandma's Jollof Rice Recipe" or "Classic Mac and Cheese."
- Add the skip link right after the opening `<body>` tag.

### Step 2: Header and Navigation (10 minutes)

- Add your site name in an `<h1>`.
- Build the `<nav>` with an unordered list of same-page links (`#about`, `#ingredients`, `#instructions`, `#reviews`).
- Click each nav link and make sure the corresponding section has the matching `id` attribute.

### Step 3: Recipe Hero Section (15 minutes)

- Add the dish name as an `<h2>`.
- Add a `<figure>` with an image (use `https://placehold.co/800x400?text=Your+Dish` if you do not have a photo) and a `<figcaption>`.
- Write 1-2 paragraphs about the dish. Be personal. Tell a story.
- Add a blockquote with a food-related quote.

### Step 4: Recipe Details, Ingredients, and Instructions (20 minutes)

- Add the details list (prep time, cook time, servings, difficulty).
- List at least 8 specific ingredients.
- Write at least 6 ordered steps. Use `<strong>` for key temperatures, times, and actions.

### Step 5: Tips, Links, and Aside (10 minutes)

- Add 3-5 cooking tips in the `<aside>`.
- Add external links (open in new tabs with proper `rel` attribute).
- Add a "Back to top" link.

### Step 6: Review Form (20 minutes)

This is the most complex section. Build it piece by piece:

1. Create the `<form>` with `action="#"` and `method="post"`.
2. Add the first `<fieldset>` with name and email inputs. Make sure each has a `<label>`.
3. Add the second `<fieldset>` with the rating dropdown, radio buttons, difficulty dropdown, and comments textarea.
4. Add the newsletter checkbox.
5. Add the submit button.
6. Test: try submitting with empty required fields. The browser should show validation errors.

### Step 7: Footer (5 minutes)

- Add the copyright notice.
- Add footer navigation with an `aria-label`.

### Step 8: Final Review (5 minutes)

- Tab through the entire page with your keyboard. Can you reach every link, button, and form field?
- Check that all images have alt text.
- Check that all form fields have labels.
- Check that your heading hierarchy makes sense (one `<h1>`, multiple `<h2>`s, `<h3>`s under `<h2>`s).
- Validate your HTML at [https://validator.w3.org/#validate_by_input](https://validator.w3.org/#validate_by_input) -- paste your code and fix any errors.

## Stretch Goals

Finished early or want an extra challenge? Try these:

### Stretch Goal 1: Nutrition Facts Table

Add a `<section>` with an `<h2>` heading "Nutrition Facts" and build an HTML table:

```html
<table>
  <thead>
    <tr>
      <th>Nutrient</th>
      <th>Amount</th>
      <th>% Daily Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Calories</td>
      <td>350</td>
      <td>18%</td>
    </tr>
    <!-- Add more rows for protein, carbs, fat, fiber, etc. -->
  </tbody>
</table>
```

Tables are an HTML element we have not covered yet, so this is a great chance to explore something new. The `<table>` element contains `<thead>` (header row) and `<tbody>` (data rows). Each row is a `<tr>`, with `<th>` for header cells and `<td>` for data cells.

### Stretch Goal 2: Embedded Cooking Video

Add a section with an embedded YouTube cooking video related to your dish:

```html
<section>
  <h2>Watch How It's Made</h2>
  <iframe
    width="560"
    height="315"
    src="https://www.youtube.com/embed/VIDEO_ID_HERE"
    title="How to make [your dish name]"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen>
  </iframe>
</section>
```

Search YouTube for a cooking tutorial for your chosen dish and replace `VIDEO_ID_HERE` with the actual video ID.

### Stretch Goal 3: Print-Friendly Section

Add a section specifically designed for printing. When someone prints a recipe, they usually only want the ingredients and instructions, not the header, navigation, form, and footer. Add a note about this:

```html
<section>
  <h2>Print This Recipe</h2>
  <p>Want a clean printout? Use your browser's print function
  (<strong>Ctrl+P</strong> or <strong>Cmd+P</strong>). In Module 05,
  we will add CSS to hide the navigation, form, and footer when
  printing so you get just the recipe.</p>

  <!-- In Module 05, you'll add this CSS:
  @media print {
    header nav, #reviews, footer { display: none; }
  }
  -->
</section>
```

## Submission Checklist

Before you consider this project complete, verify every item:

- [ ] Page has a valid HTML structure (`<!DOCTYPE html>`, `<html>`, `<head>`, `<body>`)
- [ ] `<title>` is descriptive and specific to the recipe
- [ ] Skip link is present and targets `#main-content`
- [ ] `<header>` contains the site name and a `<nav>` with working same-page links
- [ ] `<main>` wraps all primary content and has `id="main-content"`
- [ ] At least one `<figure>` with an `<img>` (including alt text) and `<figcaption>`
- [ ] Heading hierarchy is logical: one `<h1>`, multiple `<h2>`s, no skipped levels
- [ ] Ingredients are in an unordered list (`<ul>`) with at least 8 items
- [ ] Instructions are in an ordered list (`<ol>`) with at least 6 steps
- [ ] At least 2 external links with `target="_blank"` and `rel="noopener noreferrer"`
- [ ] At least 1 same-page link (e.g., "Back to top")
- [ ] Chef's tips are in an `<aside>` element
- [ ] Review form includes: text input, email input, select dropdown, radio buttons, textarea, checkbox, and a submit button
- [ ] Every form input has a corresponding `<label>` with matching `for`/`id`
- [ ] At least 3 form fields use the `required` attribute
- [ ] `<footer>` includes copyright notice and a `<nav>` with `aria-label`
- [ ] Page is keyboard-navigable (test by tabbing through the entire page)
- [ ] HTML validates with no errors at [validator.w3.org](https://validator.w3.org)

If you checked every box, congratulations -- you have built a professional-quality HTML page that is well-structured, accessible, and ready for styling. Save this project. You will use it again in Module 05 (CSS) and Module 07 (Responsive Design).

---
title: "Forms and Inputs"
estimatedMinutes: 50
---

# Forms and Inputs

Every time you log into a website, search for something on Google, sign up for a newsletter, or place an online order, you are using an HTML form. Forms are how websites collect information from users. They are the bridge between a person looking at a screen and data flowing into a system.

In this lesson, you will learn how to build forms from scratch. By the end, you will create a fully functional contact form with text inputs, dropdowns, radio buttons, checkboxes, and validation -- all in pure HTML.

---

## What Forms Do and How They Work

Think of an HTML form like a **paper form at a doctor's office**. You walk in, they hand you a clipboard with a form on it. The form has fields: name, date of birth, insurance number, checkboxes for symptoms, a text area for "describe your issue." You fill it out and hand it back to the receptionist, who processes the information.

HTML forms work the same way:

1. The webpage displays a form with various input fields.
2. The user fills in the fields (typing, selecting, checking boxes).
3. The user clicks a submit button.
4. The browser packages up all the data and sends it somewhere (usually a server) for processing.

Right now, we are focusing on **building the form** -- the HTML structure. Making the form actually *do* something with the data requires a server or JavaScript, which you will learn later. But the form itself is pure HTML, and it works beautifully on its own.

---

## The Form Element

Every form starts with the `<form>` element:

```html
<form action="/submit" method="post">
  <!-- All form fields go here -->
</form>
```

The two key attributes:

- **`action`** -- The URL where the form data should be sent when submitted. Think of it as the address on an envelope. For now, you can use `action="#"` as a placeholder since we do not have a server set up yet.
- **`method`** -- How the data should be sent. The two options are:
  - `"get"` -- Appends form data to the URL (visible in the address bar). Used for searches and filters.
  - `"post"` -- Sends data in the body of the request (hidden from the URL). Used for logins, signups, and any form that handles sensitive data.

```html
<!-- A search form uses GET (data appears in the URL: ?q=html+tutorial) -->
<form action="/search" method="get">
  <input type="text" name="q" placeholder="Search...">
  <button type="submit">Search</button>
</form>

<!-- A login form uses POST (password is not visible in the URL) -->
<form action="/login" method="post">
  <input type="email" name="email" placeholder="Email">
  <input type="password" name="password" placeholder="Password">
  <button type="submit">Log In</button>
</form>
```

**The `name` attribute is essential.** Every input needs a `name` attribute -- this is the label the server uses to identify each piece of data. Without `name`, the data from that field will not be sent.

---

## Text Inputs

The `<input>` element is the most versatile form element. By changing its `type` attribute, you can create many different kinds of input fields.

### Basic Text Input

```html
<input type="text" name="full-name" placeholder="Enter your full name">
```

- `type="text"` -- A single-line text field. The default type.
- `name="full-name"` -- The identifier for this data.
- `placeholder="Enter your full name"` -- Gray hint text that disappears when the user starts typing.

### Email Input

```html
<input type="email" name="email" placeholder="you@example.com">
```

The `email` type looks like a regular text field, but it has built-in smarts:

- On mobile phones, the keyboard shows the `@` symbol prominently.
- The browser validates that the input looks like an email address before allowing submission.

### Password Input

```html
<input type="password" name="password" placeholder="Enter your password">
```

Characters are hidden as dots or asterisks. The browser may also offer to save or generate a password.

### Number Input

```html
<input type="number" name="age" min="13" max="120" placeholder="Your age">
```

Displays a number field with up/down arrows. The `min` and `max` attributes restrict the allowed range.

### Other Useful Input Types

```html
<!-- Date picker -->
<input type="date" name="birthday">

<!-- Phone number (mobile keyboards show number pad) -->
<input type="tel" name="phone" placeholder="(555) 123-4567">

<!-- URL field -->
<input type="url" name="website" placeholder="https://yoursite.com">

<!-- Color picker -->
<input type="color" name="favorite-color" value="#7D4E21">

<!-- Range slider -->
<input type="range" name="experience" min="1" max="10" value="5">
```

Each type gives the browser hints about what kind of data to expect. On mobile devices, these hints change the keyboard layout. The `date` type even shows a calendar picker on most browsers.

---

## Labels: Connecting Text to Inputs

Every input field needs a label. Labels tell users what information a field is asking for. More importantly, they make forms **accessible** to people using screen readers.

The `<label>` element connects text to an input using the `for` attribute:

```html
<label for="full-name">Full Name</label>
<input type="text" id="full-name" name="full-name">
```

Here is how it works:

- The `<label>` has `for="full-name"`.
- The `<input>` has `id="full-name"`.
- The `for` attribute and `id` attribute must match exactly.

This connection does two important things:

1. **Screen readers** read the label when the user focuses on the input: "Full Name, text field."
2. **Clicking the label** focuses the input field. This is a bigger deal than it sounds -- it makes tiny checkboxes and radio buttons much easier to click because the entire label becomes a click target.

```html
<!-- Without a label: user must click the tiny checkbox -->
<input type="checkbox" name="agree"> I agree to the terms

<!-- With a label: user can click the text too -->
<input type="checkbox" id="agree" name="agree">
<label for="agree">I agree to the terms</label>
```

**Never skip labels.** A form without labels is like a paper form where all the fields are blank lines with no descriptions. Nobody would know what to fill in. This is what a screen reader user experiences when your inputs do not have labels.

You can also wrap the input inside the label, which automatically connects them without needing `for` and `id`:

```html
<label>
  Full Name
  <input type="text" name="full-name">
</label>
```

Both approaches work. The explicit `for`/`id` method is more common and is considered best practice because it is clearer and more flexible for styling with CSS.

---

## Textareas

When you need more than a single line of text -- like a message, comment, or bio -- use `<textarea>`:

```html
<label for="message">Your Message</label>
<textarea id="message" name="message" rows="5" cols="40" placeholder="Type your message here..."></textarea>
```

Key differences from `<input>`:

- `<textarea>` is **not** a void element -- it has opening and closing tags.
- `rows` and `cols` set the initial visible size (rows of text and characters wide).
- Users can type multiple lines and even resize the text area by dragging the corner (in most browsers).

If you want to pre-fill the textarea, put the text between the tags:

```html
<textarea id="bio" name="bio" rows="3">I am a web developer in training.</textarea>
```

---

## Select Dropdowns

When users need to choose from a predefined list of options, use `<select>` with `<option>` elements:

```html
<label for="program">Which program interests you?</label>
<select id="program" name="program">
  <option value="">-- Select a program --</option>
  <option value="fast-track">Fast Track</option>
  <option value="crowns-of-code">Crowns of Code</option>
  <option value="the-bridge">The Bridge</option>
  <option value="she-builds-black">She Builds Black</option>
</select>
```

- Each `<option>` has a `value` attribute -- this is the data that gets sent to the server.
- The text between `<option>` tags is what the user sees in the dropdown.
- The first option with an empty `value` acts as a placeholder prompt.

### Option Groups

For long lists, you can group options with `<optgroup>`:

```html
<label for="role">Target Role</label>
<select id="role" name="role">
  <optgroup label="Engineering">
    <option value="frontend">Frontend Developer</option>
    <option value="backend">Backend Developer</option>
    <option value="mobile">Mobile Developer</option>
  </optgroup>
  <optgroup label="Design">
    <option value="ux">UX Designer</option>
    <option value="ui">UI Designer</option>
  </optgroup>
  <optgroup label="Data">
    <option value="analyst">Data Analyst</option>
    <option value="scientist">Data Scientist</option>
  </optgroup>
</select>
```

The `<optgroup>` labels are not selectable -- they just act as category headers within the dropdown.

---

## Radio Buttons and Checkboxes

### Radio Buttons: Pick One

Radio buttons let users choose **exactly one option** from a group. Think of them like the buttons on an old car radio -- pressing one pops the others out.

```html
<p>How did you hear about us?</p>

<input type="radio" id="social-media" name="referral" value="social-media">
<label for="social-media">Social Media</label>

<input type="radio" id="friend" name="referral" value="friend">
<label for="friend">A Friend</label>

<input type="radio" id="search" name="referral" value="search">
<label for="search">Google Search</label>

<input type="radio" id="event" name="referral" value="event">
<label for="event">Community Event</label>
```

The key: all radio buttons in a group share the **same `name` attribute** (`name="referral"`). This is how the browser knows they belong together and should be mutually exclusive. Each one needs a unique `id` and `value`.

### Checkboxes: Pick Multiple

Checkboxes let users select **zero, one, or multiple options**:

```html
<p>What topics interest you? (Select all that apply)</p>

<input type="checkbox" id="html-css" name="interests" value="html-css">
<label for="html-css">HTML & CSS</label>

<input type="checkbox" id="javascript" name="interests" value="javascript">
<label for="javascript">JavaScript</label>

<input type="checkbox" id="python" name="interests" value="python">
<label for="python">Python</label>

<input type="checkbox" id="design" name="interests" value="design">
<label for="design">UX Design</label>
```

Like radio buttons, checkboxes in a group share the same `name` attribute. Unlike radio buttons, multiple checkboxes can be selected at the same time.

You can make a checkbox or radio button selected by default with the `checked` attribute:

```html
<input type="checkbox" id="newsletter" name="newsletter" value="yes" checked>
<label for="newsletter">Subscribe to our newsletter</label>
```

---

## Submit Buttons

Every form needs a way to submit the data. You have two options:

```html
<!-- Option 1: The <button> element (recommended) -->
<button type="submit">Send Message</button>

<!-- Option 2: An input with type="submit" -->
<input type="submit" value="Send Message">
```

The `<button>` element is preferred because you can put HTML inside it (like an icon and text together), while `<input type="submit">` only supports plain text.

You can also create a reset button that clears all form fields:

```html
<button type="reset">Clear Form</button>
```

Use reset buttons sparingly -- accidentally clearing a long form is frustrating for users.

---

## Basic Form Validation

HTML has built-in validation that checks user input **before** the form is submitted, without needing any JavaScript. This is one of the most powerful and underused features of HTML.

### Required Fields

```html
<label for="name">Name (required)</label>
<input type="text" id="name" name="name" required>
```

The `required` attribute prevents the form from submitting if the field is empty. The browser will show an error message automatically.

### Minimum and Maximum Length

```html
<label for="password">Password (at least 8 characters)</label>
<input type="password" id="password" name="password" minlength="8" maxlength="50" required>
```

- `minlength="8"` -- The user must type at least 8 characters.
- `maxlength="50"` -- The user cannot type more than 50 characters.

### Pattern Matching

The `pattern` attribute accepts a regular expression (a fancy way to define a text pattern):

```html
<label for="zip">ZIP Code (5 digits)</label>
<input type="text" id="zip" name="zip" pattern="[0-9]{5}" title="Please enter a 5-digit ZIP code">
```

- `pattern="[0-9]{5}"` -- Must be exactly 5 digits.
- `title="..."` -- This text appears in the browser's error tooltip when validation fails.

### Number Ranges

```html
<label for="rating">Rate your experience (1-5)</label>
<input type="number" id="rating" name="rating" min="1" max="5" required>
```

### Combining Validation Attributes

You can use multiple validation attributes on the same input:

```html
<label for="username">Username</label>
<input
  type="text"
  id="username"
  name="username"
  required
  minlength="3"
  maxlength="20"
  pattern="[a-zA-Z0-9_]+"
  title="Letters, numbers, and underscores only. 3-20 characters."
  placeholder="your_username">
```

This single input field enforces: the field cannot be empty, must be 3-20 characters, and can only contain letters, numbers, and underscores. All without a single line of JavaScript.

---

## Grouping Form Fields

For complex forms, use `<fieldset>` and `<legend>` to group related fields together:

```html
<fieldset>
  <legend>Personal Information</legend>

  <label for="first">First Name</label>
  <input type="text" id="first" name="first-name" required>

  <label for="last">Last Name</label>
  <input type="text" id="last" name="last-name" required>

  <label for="email">Email</label>
  <input type="email" id="email" name="email" required>
</fieldset>

<fieldset>
  <legend>Program Preferences</legend>

  <label for="program">Preferred Program</label>
  <select id="program" name="program">
    <option value="fast-track">Fast Track</option>
    <option value="the-bridge">The Bridge</option>
  </select>
</fieldset>
```

The `<fieldset>` draws a visual border around the group, and the `<legend>` appears as a label for the group. This is especially helpful for screen reader users because it provides context -- they know that the "First Name" and "Email" fields belong to the "Personal Information" section.

---

## Building a Complete Contact Form

Let's put everything together and build a real contact form. Create a file called `contact-form.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contact Us - We Build Black</title>
  </head>
  <body>
    <h1>Contact We Build Black</h1>
    <p>Have a question or want to get involved? Fill out the form below
    and we will get back to you within 48 hours.</p>

    <form action="#" method="post">

      <fieldset>
        <legend>Your Information</legend>

        <label for="full-name">Full Name</label><br>
        <input type="text" id="full-name" name="full-name" required
               placeholder="e.g., Jordan Smith"><br><br>

        <label for="email">Email Address</label><br>
        <input type="email" id="email" name="email" required
               placeholder="jordan@example.com"><br><br>

        <label for="phone">Phone Number (optional)</label><br>
        <input type="tel" id="phone" name="phone"
               placeholder="(555) 123-4567"><br>
      </fieldset>

      <br>

      <fieldset>
        <legend>Your Message</legend>

        <label for="subject">Subject</label><br>
        <select id="subject" name="subject" required>
          <option value="">-- Select a subject --</option>
          <option value="general">General Inquiry</option>
          <option value="programs">Programs & Enrollment</option>
          <option value="volunteer">Volunteering</option>
          <option value="partnership">Partnership / Sponsorship</option>
          <option value="press">Press & Media</option>
        </select><br><br>

        <label for="message">Message</label><br>
        <textarea id="message" name="message" rows="6" cols="50"
                  required minlength="20"
                  placeholder="Tell us what's on your mind..."></textarea><br>
      </fieldset>

      <br>

      <fieldset>
        <legend>A Little More About You</legend>

        <p>How did you hear about us?</p>
        <input type="radio" id="ref-social" name="referral" value="social-media">
        <label for="ref-social">Social Media</label><br>
        <input type="radio" id="ref-friend" name="referral" value="friend">
        <label for="ref-friend">A Friend</label><br>
        <input type="radio" id="ref-search" name="referral" value="search">
        <label for="ref-search">Google Search</label><br>
        <input type="radio" id="ref-event" name="referral" value="event">
        <label for="ref-event">Community Event</label><br><br>

        <input type="checkbox" id="newsletter" name="newsletter" value="yes" checked>
        <label for="newsletter">Subscribe to our newsletter</label><br>

        <input type="checkbox" id="terms" name="terms" value="agreed" required>
        <label for="terms">I agree to the <a href="#">Terms of Service</a></label>
      </fieldset>

      <br>

      <button type="submit">Send Message</button>
      <button type="reset">Clear Form</button>

    </form>
  </body>
</html>
```

Open this in your browser and try it out:

- Leave the name field empty and click "Send Message" -- you will see a validation error.
- Try typing an invalid email address -- the browser catches it.
- Try submitting with fewer than 20 characters in the message -- it will be rejected.
- Notice how clicking a label focuses the corresponding input.

This form does not actually send data anywhere (the `action="#"` keeps you on the same page), but the structure and validation are completely real. When you learn server-side programming later, you will swap `action="#"` for a real URL and the form will start processing submissions.

---

## Key Takeaways

1. **The `<form>` element wraps all form fields** and uses `action` (where to send data) and `method` (`get` or `post`) to control submission.
2. **Every input needs a `name` attribute** so its data is included when the form is submitted.
3. **The `<input>` element is versatile.** Change the `type` attribute to create text fields, email fields, passwords, numbers, dates, colors, and more.
4. **Labels are not optional.** Connect every `<label>` to its input with matching `for` and `id` attributes for accessibility.
5. **Use `<textarea>` for multi-line text**, `<select>` for dropdown menus, radio buttons for "pick one," and checkboxes for "pick multiple."
6. **HTML validation is powerful.** Use `required`, `minlength`, `maxlength`, `min`, `max`, and `pattern` to validate input without JavaScript.
7. **Group related fields with `<fieldset>` and `<legend>`** to organize complex forms and improve accessibility.

---

## Try It Yourself

Create a file called `event-registration.html` with a form that includes:

1. A `<fieldset>` for "Attendee Information" with fields for: first name (required), last name (required), email (required, email type), and phone number (optional, tel type).
2. A `<fieldset>` for "Event Details" with: a `<select>` dropdown to choose an event (at least 3 options), a `<textarea>` for "Dietary restrictions or special needs," and a number input for "How many guests are you bringing?" (min 0, max 5).
3. A radio button group asking "Will you attend in person or virtually?" with two options.
4. A checkbox for "I agree to the code of conduct" (required).
5. A checkbox for "Send me event reminders" (checked by default).
6. A submit button that says "Register."

Test the form in your browser. Try submitting with empty required fields and verify that validation messages appear. Click on labels and confirm they focus the corresponding inputs.

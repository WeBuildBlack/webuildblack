---
title: "Forms in React"
estimatedMinutes: 35
---

# Forms in React

Forms are where React's model really pays off. In plain HTML, form data lives in the DOM -- you read it when you need it. In React, form data lives in state, and the UI is always a reflection of that state. This means validation, submission, conditional logic, and multi-step flows all become straightforward JavaScript. This lesson covers controlled components, handling every input type, form validation, and submission handling.

---

## Controlled vs. Uncontrolled Components

React forms can be either **controlled** or **uncontrolled**.

An **uncontrolled** component lets the DOM manage the input's value. You read the value using a ref when needed (refs are covered in Module 5). This is closer to how plain HTML forms work.

A **controlled** component stores the input's value in React state. Every keystroke updates the state, and the input's displayed value comes from that state. React owns the data.

```jsx
// Uncontrolled: DOM owns the value
function UncontrolledForm() {
  const inputRef = React.useRef(null);

  function handleSubmit(e) {
    e.preventDefault();
    console.log(inputRef.current.value);  // Read from DOM on submit
  }

  return (
    <form onSubmit={handleSubmit}>
      <input ref={inputRef} type="text" defaultValue="" />
      <button type="submit">Submit</button>
    </form>
  );
}

// Controlled: React state owns the value
function ControlledForm() {
  const [name, setName] = React.useState('');

  function handleSubmit(e) {
    e.preventDefault();
    console.log(name);  // Already in state -- no DOM reading needed
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

**Use controlled components by default.** They give you:
- Instant access to the current value for validation and conditional logic
- The ability to programmatically reset, prefill, or transform values
- A single source of truth -- the UI always reflects the state

Use uncontrolled components only when you need to integrate with non-React code, handle file inputs (which cannot be controlled), or optimize a form with hundreds of fields where re-rendering on every keystroke causes a performance problem.

---

## The Controlled Component Pattern

The pattern is always the same:
1. State holds the value
2. The input's `value` prop is bound to that state
3. `onChange` updates the state on every keystroke

```jsx
function SignupForm() {
  const [email, setEmail] = React.useState('');

  return (
    <div>
      <label htmlFor="email">Email address</label>
      <input
        id="email"
        type="email"
        value={email}                            // Step 2: bind to state
        onChange={e => setEmail(e.target.value)} // Step 3: update state on change
        placeholder="you@example.com"
      />
      {/* You can use the value anywhere instantly */}
      <p>You typed: {email}</p>
    </div>
  );
}
```

`e.target.value` is the current value of the input after the user's change. Passing it directly to the state setter makes the input "controlled."

---

## Handling Multiple Inputs

When you have multiple fields, you have two options: separate state variables for each field, or a single state object.

**Separate state variables** -- clean for small forms:

```jsx
function LoginForm() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  return (
    <form>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
    </form>
  );
}
```

**Single state object** -- cleaner for larger forms, enables a single generic handler:

```jsx
function ApplicationForm() {
  const [formData, setFormData] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'frontend',
    experience: '',
  });

  // Generic change handler -- works for any input with a name attribute
  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,         // Keep all other fields
      [name]: value,   // Update only the changed field
    }));
  }

  return (
    <form>
      <input
        name="firstName"
        type="text"
        value={formData.firstName}
        onChange={handleChange}
        placeholder="First name"
      />
      <input
        name="lastName"
        type="text"
        value={formData.lastName}
        onChange={handleChange}
        placeholder="Last name"
      />
      <input
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="Email"
      />
      <select name="role" value={formData.role} onChange={handleChange}>
        <option value="frontend">Frontend</option>
        <option value="backend">Backend</option>
        <option value="mobile">Mobile</option>
        <option value="data">Data</option>
      </select>
      <textarea
        name="experience"
        value={formData.experience}
        onChange={handleChange}
        rows={4}
        placeholder="Describe your experience..."
      />
    </form>
  );
}
```

The `[name]: value` syntax uses a computed property key -- `name` is the `name` attribute of whichever input triggered the change. This single handler works for all inputs that follow the pattern.

---

## Select, Checkbox, and Radio

Different input types have slightly different patterns.

### Select

```jsx
function TrackSelector({ value, onChange }) {
  return (
    <div>
      <label htmlFor="track">Program Track</label>
      <select
        id="track"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">-- Select a track --</option>
        <option value="android">Android Development</option>
        <option value="ux">UX Design</option>
        <option value="data">Data Analytics</option>
      </select>
    </div>
  );
}
```

React controls which option is selected via the `value` prop on `<select>` itself -- not on the `<option>` elements. This differs from plain HTML where you set `selected` on the option.

### Checkbox

Checkboxes use `checked` instead of `value`, and `e.target.checked` instead of `e.target.value`:

```jsx
function TermsCheckbox({ checked, onChange }) {
  return (
    <label className="checkbox-label">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}  // .checked, not .value
      />
      I agree to the terms and conditions
    </label>
  );
}

// In a form with multiple checkboxes
function InterestForm() {
  const [interests, setInterests] = React.useState({
    webDev: false,
    mobileDev: false,
    dataScience: false,
    uxDesign: false,
  });

  function handleCheckboxChange(e) {
    const { name, checked } = e.target;
    setInterests(prev => ({ ...prev, [name]: checked }));
  }

  return (
    <fieldset>
      <legend>Areas of Interest</legend>
      {Object.entries(interests).map(([key, value]) => (
        <label key={key}>
          <input
            type="checkbox"
            name={key}
            checked={value}
            onChange={handleCheckboxChange}
          />
          {key}
        </label>
      ))}
    </fieldset>
  );
}
```

### Radio

Radio buttons share a `name` attribute and are controlled by comparing `value` to the current state:

```jsx
function ExperienceLevel({ value, onChange }) {
  const levels = [
    { value: 'beginner', label: 'Beginner (0-1 years)' },
    { value: 'intermediate', label: 'Intermediate (1-3 years)' },
    { value: 'senior', label: 'Senior (3+ years)' },
  ];

  return (
    <fieldset>
      <legend>Experience Level</legend>
      {levels.map(level => (
        <label key={level.value} className="radio-label">
          <input
            type="radio"
            name="experience"
            value={level.value}
            checked={value === level.value}  // Controlled via comparison
            onChange={e => onChange(e.target.value)}
          />
          {level.label}
        </label>
      ))}
    </fieldset>
  );
}
```

---

## Form Validation

Validate form data in state before allowing submission. There are two patterns: on-submit validation and real-time validation.

### On-Submit Validation

```jsx
function ContactForm() {
  const [formData, setFormData] = React.useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = React.useState({});
  const [submitted, setSubmitted] = React.useState(false);

  function validate(data) {
    const newErrors = {};

    if (!data.name.trim()) {
      newErrors.name = 'Name is required.';
    }
    if (!data.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!data.message.trim()) {
      newErrors.message = 'Message is required.';
    } else if (data.message.trim().length < 20) {
      newErrors.message = 'Message must be at least 20 characters.';
    }

    return newErrors;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear the error for this field when the user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }

  function handleSubmit(e) {
    e.preventDefault();  // Prevent browser form submission

    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;  // Stop here if there are errors
    }

    // No errors -- proceed with submission
    console.log('Submitting:', formData);
    setSubmitted(true);
  }

  if (submitted) {
    return <p className="success-message">Thanks! We'll be in touch.</p>;
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          aria-describedby={errors.name ? 'name-error' : undefined}
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <span id="name-error" className="field-error" role="alert">
            {errors.name}
          </span>
        )}
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          aria-describedby={errors.email ? 'email-error' : undefined}
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <span id="email-error" className="field-error" role="alert">
            {errors.email}
          </span>
        )}
      </div>

      <div className="field">
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          name="message"
          rows={5}
          value={formData.message}
          onChange={handleChange}
          aria-describedby={errors.message ? 'message-error' : undefined}
          aria-invalid={!!errors.message}
        />
        {errors.message && (
          <span id="message-error" className="field-error" role="alert">
            {errors.message}
          </span>
        )}
      </div>

      <button type="submit" className="btn btn--primary">Send Message</button>
    </form>
  );
}
```

### Accessibility Notes

The form above includes several important accessibility practices:
- `htmlFor` on labels connects them to inputs by `id` (screen readers announce the label when the input is focused)
- `aria-invalid={true}` signals an invalid field to assistive technology
- `aria-describedby` links the input to its error message
- `role="alert"` on error messages causes screen readers to announce them immediately when they appear
- `noValidate` on the form disables browser built-in validation so your custom validation controls the UX

---

## Submission Handling

Real form submissions usually involve an async API call. Handle the loading and error states:

```jsx
function NewsletterForm() {
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState('idle'); // idle | loading | success | error
  const [errorMessage, setErrorMessage] = React.useState('');

  async function handleSubmit(e) {
    e.preventDefault();

    if (!email.trim()) return;

    setStatus('loading');

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Something went wrong.');
      }

      setStatus('success');
      setEmail('');  // Reset the form
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        disabled={status === 'loading'}
      />
      <button
        type="submit"
        disabled={status === 'loading' || !email.trim()}
        className="btn btn--primary"
      >
        {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
      </button>

      {status === 'success' && (
        <p className="success-message">You're subscribed!</p>
      )}
      {status === 'error' && (
        <p className="error-message">{errorMessage}</p>
      )}
    </form>
  );
}
```

Using a `status` string (`'idle' | 'loading' | 'success' | 'error'`) instead of multiple booleans (`isLoading`, `isSuccess`, `isError`) ensures your states are mutually exclusive -- you cannot be in `loading` and `error` at the same time.

---

## Key Takeaways

- Controlled components bind input values to React state via `value` and `onChange`. This makes the state the single source of truth for form data.
- Use controlled components by default. Use uncontrolled components only for file inputs or when integrating with non-React libraries.
- For forms with multiple inputs, a single state object with a generic `handleChange` function that uses `[e.target.name]` as the key is cleaner than separate state variables for each field.
- Checkboxes use `checked` and `e.target.checked`. `<select>` is controlled via its `value` prop (not on individual `<option>` elements). Radio buttons use `checked={value === level.value}`.
- Validate on submit by running a validate function, storing errors in state, and returning early if errors exist. Clear each field's error when the user starts typing in that field.
- Include accessibility attributes on form fields: `htmlFor`/`id` pairs, `aria-invalid`, `aria-describedby`, and `role="alert"` on error messages.
- Use a `status` string (`'idle' | 'loading' | 'success' | 'error'`) to represent form submission state -- it keeps states mutually exclusive and is easier to reason about than multiple booleans.

---

## Try It Yourself

**Exercise 1**: Build a controlled `SearchInput` component that accepts `value`, `onChange`, and `placeholder` as props. Add a clear button that appears only when `value` is non-empty and calls `onChange('')` when clicked.

**Exercise 2**: Create a multi-step registration form with at least 3 steps. Store all form data in a single state object. Show a different set of fields at each step. Validate each step before allowing the user to advance. Show a review screen before final submission.

**Exercise 3**: Build a `ContactForm` that submits to a mock API endpoint (you can use `https://jsonplaceholder.typicode.com/posts` or create a simple handler that just logs the data). Handle the loading, success, and error states. Disable the submit button while loading. Reset the form on success and show an inline error message on failure.

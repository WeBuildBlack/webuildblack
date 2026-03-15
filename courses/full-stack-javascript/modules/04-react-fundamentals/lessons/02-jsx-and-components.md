---
title: "JSX and Components"
estimatedMinutes: 35
---

# JSX and Components

JSX looks like HTML but it is not. That distinction matters more than it seems. Once you understand what JSX actually is and how it compiles, you stop guessing at the rules and start reasoning about them. This lesson covers JSX syntax in depth, how to write solid function components, and how to structure your component files as your project grows.

---

## What JSX Actually Is

JSX is a syntax extension for JavaScript. It gets compiled by Vite (via esbuild under the hood) into regular JavaScript function calls before the browser ever sees it.

```jsx
// What you write:
const button = <button className="btn btn--primary" onClick={handleClick}>Save</button>;

// What it compiles to:
const button = React.createElement(
  'button',
  { className: 'btn btn--primary', onClick: handleClick },
  'Save'
);
```

You never need to write `React.createElement` yourself -- JSX handles it. But understanding this compilation explains every JSX rule. You are writing function call arguments, not HTML.

In React 17+, you do not need to `import React from 'react'` at the top of every file. The new JSX transform handles it automatically, and Vite projects set this up for you by default.

---

## The Rules of JSX

### Rule 1: Return a single root element

A component can only return one root element. If you need to return multiple siblings, wrap them.

```jsx
// This breaks -- two root elements at the same level
function BrokenComponent() {
  return (
    <h1>Title</h1>
    <p>Subtitle</p>   // SyntaxError: adjacent JSX elements must be wrapped
  );
}

// Fix option 1: wrap in a div
function FixedWithDiv() {
  return (
    <div>
      <h1>Title</h1>
      <p>Subtitle</p>
    </div>
  );
}

// Fix option 2: use a Fragment (adds no extra DOM node)
function FixedWithFragment() {
  return (
    <>
      <h1>Title</h1>
      <p>Subtitle</p>
    </>
  );
}
```

The `<>...</>` syntax is shorthand for `<React.Fragment>...</React.Fragment>`. Use Fragments when you do not want an extra wrapper `div` in the DOM -- for example, inside table rows or flex/grid containers where extra wrappers would break your layout.

### Rule 2: Use `className` instead of `class`

`class` is a reserved keyword in JavaScript. JSX uses `className` for CSS classes.

```jsx
// Wrong
<div class="card">...</div>

// Right
<div className="card">...</div>
```

### Rule 3: Self-close empty elements

Any element without children must be self-closed with a forward slash before the closing bracket.

```jsx
// Wrong
<img src="/logo.png" alt="Logo">
<input type="text">
<br>

// Right
<img src="/logo.png" alt="Logo" />
<input type="text" />
<br />
```

### Rule 4: Attributes use camelCase

HTML attributes with hyphens are written in camelCase in JSX. Event handlers follow the same pattern.

```jsx
// HTML attribute   JSX equivalent
// tabindex         tabIndex
// for (on label)   htmlFor
// onclick          onClick
// onmouseenter     onMouseEnter
// stroke-width     strokeWidth (SVG)

<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  tabIndex={0}
  onChange={handleChange}
/>
```

### Rule 5: Embed JavaScript with curly braces

Anywhere you want a JavaScript value inside JSX, use `{}`. You can put any expression inside -- variables, function calls, ternaries, template literals.

```jsx
function EventCard({ event }) {
  const formattedDate = new Date(event.date).toLocaleDateString();

  return (
    <div className="event-card">
      {/* Variable */}
      <h2>{event.title}</h2>

      {/* Function call result */}
      <p>{formattedDate}</p>

      {/* Ternary expression */}
      <span className={event.isFull ? 'status--full' : 'status--open'}>
        {event.isFull ? 'Sold Out' : `${event.spotsLeft} spots left`}
      </span>

      {/* Template literal for dynamic className */}
      <p className={`badge badge--${event.category}`}>{event.category}</p>
    </div>
  );
}
```

You cannot use statements (`if`, `for`, `while`) directly inside JSX. Statements do not produce a value -- expressions do. Use ternaries, `&&`, `.map()`, or move the logic above the return statement.

```jsx
// Does not work -- if is a statement, not an expression
function BadExample({ isLoggedIn }) {
  return (
    <div>
      {if (isLoggedIn) { <p>Welcome back</p> }}  // SyntaxError
    </div>
  );
}

// Move the logic above the return, or use a ternary
function GoodExample({ isLoggedIn }) {
  const message = isLoggedIn ? 'Welcome back' : 'Please sign in';

  return (
    <div>
      <p>{message}</p>
    </div>
  );
}
```

---

## Function Components

A React component is a function that:
1. Accepts a single `props` object as its argument (or destructures props directly in the parameter list)
2. Returns JSX (or `null` to render nothing)

```jsx
// Basic: receive the whole props object
function WelcomeBanner(props) {
  return (
    <div className="banner">
      <h1>Welcome, {props.name}!</h1>
    </div>
  );
}

// Preferred: destructure props in the parameter list
function WelcomeBanner({ name, subtitle }) {
  return (
    <div className="banner">
      <h1>Welcome, {name}!</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}
```

Arrow function components also work, but named function declarations are easier to debug -- they appear with their name in React DevTools and error stack traces.

```jsx
// Arrow function -- valid
const WelcomeBanner = ({ name }) => (
  <div className="banner">
    <h1>Welcome, {name}!</h1>
  </div>
);

// Named function declaration -- preferred for debugging clarity
function WelcomeBanner({ name }) {
  return (
    <div className="banner">
      <h1>Welcome, {name}!</h1>
    </div>
  );
}
```

---

## Naming Conventions

Component names must start with a capital letter. This is how React distinguishes between HTML elements (lowercase) and React components (capitalized).

```jsx
// Lowercase = HTML element
<div>, <p>, <button>, <section>

// Capitalized = React component
<UserCard />, <NavBar />, <PrimaryButton />
```

```jsx
function app() {   // Wrong -- React treats this as an unknown HTML element
  return <div>Hello</div>;
}

function App() {   // Right
  return <div>Hello</div>;
}
```

Use **PascalCase** for component names (first letter of every word capitalized). Use **camelCase** for variables, functions, and props.

---

## The `children` Prop

Every component automatically receives a special prop called `children`. It holds whatever JSX you place between the component's opening and closing tags.

```jsx
// A reusable card wrapper
function Card({ children, className }) {
  return (
    <div className={`card ${className || ''}`}>
      {children}
    </div>
  );
}

// Anything between <Card> and </Card> becomes children
function App() {
  return (
    <Card className="user-card">
      <img src="/avatar.png" alt="User avatar" />
      <h2>Alexis Washington</h2>
      <p>Senior Engineer</p>
    </Card>
  );
}
```

The `children` pattern is how you build layout components, wrappers, and containers. The `Card` component does not need to know what it contains -- it just renders whatever is passed.

```jsx
// A modal wrapper that accepts any content as children
function Modal({ children, title, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal__header">
          <h2>{title}</h2>
          <button onClick={onClose} aria-label="Close modal">x</button>
        </div>
        <div className="modal__body">
          {children}
        </div>
      </div>
    </div>
  );
}

// The Modal renders any content passed between its tags
function ConfirmDialog({ onClose, onConfirm }) {
  return (
    <Modal title="Confirm Action" onClose={onClose}>
      <p>Are you sure you want to delete this item?</p>
      <div className="modal__actions">
        <button onClick={onClose}>Cancel</button>
        <button onClick={onConfirm} className="btn--danger">Delete</button>
      </div>
    </Modal>
  );
}
```

---

## Fragments in Detail

Fragments let you return multiple elements without adding an extra node to the DOM. This matters for specific HTML structures and CSS layouts.

```jsx
// Problem: adding a wrapper div inside a <ul> produces invalid HTML
function MenuItems() {
  return (
    <div>           // Produces <ul><div><li>...</li></div></ul> -- invalid
      <li>Home</li>
      <li>About</li>
      <li>Contact</li>
    </div>
  );
}

// Solution: use a Fragment
function MenuItems() {
  return (
    <>
      <li>Home</li>
      <li>About</li>
      <li>Contact</li>
    </>
  );
}

function Nav() {
  return (
    <ul>
      <MenuItems />   // Renders three <li> elements directly inside <ul>
    </ul>
  );
}
```

Use the long-form `<React.Fragment>` when you need to add a `key` prop (covered in Lesson 5):

```jsx
function DataRows({ items }) {
  return items.map(item => (
    <React.Fragment key={item.id}>
      <dt>{item.label}</dt>
      <dd>{item.value}</dd>
    </React.Fragment>
  ));
}
```

---

## JSX Comments

Comments inside JSX markup must be wrapped in curly braces. Standard JavaScript `//` comments do not work inside JSX.

```jsx
function App() {
  return (
    <div>
      {/* Single-line comment in JSX */}
      <h1>Hello</h1>

      {/*
        Multi-line comment
        also works this way
      */}
      <p>Welcome</p>
    </div>
  );
}
```

Regular JavaScript comments work fine outside JSX -- before the return statement, between imports, and so on.

---

## Component Files and Structure

As your project grows, split components into their own files. Two common patterns:

**Flat structure** (good for small to medium projects):

```
src/
├── components/
│   ├── Avatar.jsx
│   ├── Button.jsx
│   ├── Card.jsx
│   └── NavBar.jsx
├── pages/
│   ├── HomePage.jsx
│   └── ProfilePage.jsx
└── App.jsx
```

**Feature-based structure** (good for larger projects):

```
src/
├── features/
│   ├── auth/
│   │   ├── LoginForm.jsx
│   │   └── SignupForm.jsx
│   └── dashboard/
│       ├── DashboardPage.jsx
│       └── StatsCard.jsx
└── components/          # Shared generic components
    ├── Button.jsx
    └── Modal.jsx
```

Start with the flat structure. You can reorganize when the project outgrows it.

Each component file follows this pattern:

```jsx
// src/components/CourseCard.jsx

// 1. Imports at the top
import Badge from './Badge';

// 2. The component function
function CourseCard({ course }) {
  const isFree = course.priceCents === 0;
  const priceLabel = isFree ? 'Free' : `$${(course.priceCents / 100).toFixed(2)}`;

  return (
    <div className="course-card">
      <img
        src={course.thumbnailUrl}
        alt={`${course.title} thumbnail`}
        className="course-card__image"
      />
      <div className="course-card__body">
        <h2>{course.title}</h2>
        <Badge text={course.difficulty} variant={course.difficulty} />
        <p>{course.description}</p>
        <div className="course-card__footer">
          <span className="course-card__price">{priceLabel}</span>
          <button className="btn btn--primary">
            {isFree ? 'Start Learning' : 'Enroll Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 3. Default export at the bottom
export default CourseCard;
```

For files that export multiple small related components, use named exports:

```jsx
// src/components/Typography.jsx
export function Heading({ children, level = 1 }) {
  const Tag = `h${level}`;   // Dynamic tag name must be capitalized or stored in a variable
  return <Tag className={`heading heading--${level}`}>{children}</Tag>;
}

export function BodyText({ children }) {
  return <p className="body-text">{children}</p>;
}

// Import with destructuring
import { Heading, BodyText } from './components/Typography';
```

---

## Key Takeaways

- JSX compiles to `React.createElement` calls. It is JavaScript with HTML-like syntax, not actual HTML.
- Components must return a single root element. Use Fragments (`<>...</>`) to group elements without adding extra DOM nodes.
- Use `className` (not `class`), camelCase event handlers (`onClick`, `onChange`), and self-close empty tags (`<img />`, `<input />`).
- JavaScript expressions go inside `{}` in JSX. Statements (`if`, `for`) cannot appear directly in JSX -- use ternaries, `&&`, or `.map()`.
- Component names must be capitalized (PascalCase). Lowercase names are treated as HTML elements by React.
- The `children` prop lets you build flexible wrapper and layout components that work with any content placed between their tags.
- Organize components in their own files with a default export. Start with a flat `components/` folder.

---

## Try It Yourself

**Exercise 1**: Create a `ProgramCard` component that accepts `name`, `description`, `duration`, and `tags` (array of strings) as props. Render the tags using `.map()` and apply a distinct `className` to each one. Export it as the default export from `src/components/ProgramCard.jsx`.

**Exercise 2**: Build a `PageLayout` component that accepts `title` and `children` as props. It should render a `<header>` with the title, a `<main>` containing children, and a `<footer>` with a copyright line. Use it in `App.jsx` with some placeholder content nested between its tags.

**Exercise 3**: Create a `DataList` component that renders a `<dl>` (definition list). Accept an array of `{ term, definition }` objects as a prop and render each pair as `<dt>` and `<dd>` elements using `React.Fragment` with a `key` prop. Open your browser's DevTools and confirm there are no extra wrapper elements inside the `<dl>` in the rendered HTML.

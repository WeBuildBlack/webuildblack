---
title: "Why React?"
estimatedMinutes: 35
isFreePreview: true
---

# Why React?

Building user interfaces with plain JavaScript works -- but it gets complicated fast. Once you have dozens of UI elements that need to stay in sync with your data, vanilla JS becomes a maze of `querySelector` calls, manual DOM updates, and bugs that appear when state gets out of sync with what's on screen. React was built to solve exactly that problem, and understanding *why* it exists makes everything else about it click faster.

---

## The Problem: Imperative UI

When you write vanilla JavaScript to update the DOM, you're telling the browser *how* to do something step by step. This is called **imperative** programming.

```javascript
// Imperative: you manage every step
function updateUserCard(user) {
  const nameEl = document.getElementById('user-name');
  const emailEl = document.getElementById('user-email');
  const avatarEl = document.getElementById('user-avatar');
  const statusEl = document.getElementById('user-status');

  nameEl.textContent = user.name;
  emailEl.textContent = user.email;
  avatarEl.src = user.avatarUrl;

  // Now you have to remember to update the status badge too
  if (user.isOnline) {
    statusEl.classList.add('online');
    statusEl.classList.remove('offline');
    statusEl.textContent = 'Online';
  } else {
    statusEl.classList.remove('online');
    statusEl.classList.add('offline');
    statusEl.textContent = 'Offline';
  }
}
```

This code isn't terrible for one component. But what happens when you have 30 components that all read from the same user object? What happens when the user object updates and you forget to call `updateUserCard`? What happens when another developer adds a field to the user object and doesn't know they need to update this function too?

The bugs multiply. The code becomes fragile. Keeping the UI in sync with data is something you have to manage entirely by hand.

---

## The React Way: Declarative UI

React flips the model. Instead of telling the browser *how* to update the DOM, you describe *what the UI should look like* for any given state. React figures out the *how*.

```jsx
// Declarative: you describe what the UI should look like
function UserCard({ user }) {
  return (
    <div className="user-card">
      <img src={user.avatarUrl} alt={user.name} />
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <span className={user.isOnline ? 'status online' : 'status offline'}>
        {user.isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}
```

When `user` changes, React re-renders `UserCard` automatically. You don't call any update functions. You don't track which DOM elements need touching. You just describe the relationship between data and UI, and React handles the rest.

This is the core insight behind React: **UI is a function of state**. Given the same inputs, you always get the same output.

---

## The Virtual DOM

You might wonder: if React re-renders components whenever data changes, doesn't that make it slow? Re-rendering the entire DOM every time anything changes would be extremely expensive.

React solves this with the **virtual DOM**: a lightweight JavaScript representation of the real DOM tree. Here's how it works:

1. When state changes, React creates a new virtual DOM tree describing what the UI *should* look like.
2. React compares the new virtual DOM tree against the previous one (this comparison is called **diffing** or **reconciliation**).
3. React calculates the minimum set of real DOM changes needed to match the new virtual DOM.
4. Only those specific changes get applied to the actual browser DOM.

```
Data changes
    ↓
React builds new virtual DOM
    ↓
React diffs new vs previous virtual DOM
    ↓
React makes targeted real DOM updates
```

The result: React does the minimal DOM work necessary, which is typically faster than manually updating the DOM yourself -- especially for complex UIs.

---

## The Component Model

React applications are built from **components**: self-contained, reusable pieces of UI. Every piece of your interface is a component, and components can contain other components.

```jsx
// Small, reusable components
function Avatar({ src, name }) {
  return <img src={src} alt={name} className="avatar" />;
}

function Badge({ text, variant }) {
  return <span className={`badge badge--${variant}`}>{text}</span>;
}

// Larger component that composes smaller ones
function UserCard({ user }) {
  return (
    <div className="user-card">
      <Avatar src={user.avatarUrl} name={user.name} />
      <div className="user-card__info">
        <h2>{user.name}</h2>
        <p>{user.email}</p>
        <Badge text={user.role} variant="primary" />
      </div>
    </div>
  );
}

// Page that composes UserCard
function TeamPage({ members }) {
  return (
    <div className="team-page">
      <h1>Our Team</h1>
      {members.map(member => (
        <UserCard key={member.id} user={member} />
      ))}
    </div>
  );
}
```

This composition model means you build UIs the same way you build with LEGO: start with small pieces and assemble them into larger structures. Each piece is independently understandable, testable, and reusable.

---

## Setting Up with Vite

React's old official starter tool, Create React App, is deprecated. The modern standard is **Vite** -- a build tool that is dramatically faster and actively maintained.

To create a new React project:

```bash
npm create vite@latest my-app -- --template react
cd my-app
npm install
npm run dev
```

Vite starts a dev server almost instantly and uses native ES modules in the browser during development, which means no bundling step while you work. Your changes reflect in the browser within milliseconds.

The project structure Vite creates:

```
my-app/
├── public/          # Static files served as-is
├── src/
│   ├── assets/      # Images, fonts
│   ├── App.jsx      # Root component
│   ├── App.css      # App-level styles
│   ├── main.jsx     # Entry point -- mounts React to the DOM
│   └── index.css    # Global styles
├── index.html       # HTML shell -- React mounts into <div id="root">
├── package.json
└── vite.config.js
```

Open `src/main.jsx` and you'll see:

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// This is where React takes over the DOM
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

`ReactDOM.createRoot` mounts your React application into the `<div id="root">` in `index.html`. Everything inside that div is managed by React from this point forward.

`React.StrictMode` is a development-only wrapper that activates extra warnings and helps surface bugs. Leave it in -- it causes no issues in production.

---

## Your First Component

Open `src/App.jsx` and replace everything with this:

```jsx
// src/App.jsx

// A simple function component
function Greeting({ name }) {
  return (
    <div>
      <h1>Hello, {name}!</h1>
      <p>Welcome to your first React component.</p>
    </div>
  );
}

// The root App component
function App() {
  return (
    <div className="app">
      <Greeting name="World" />
      <Greeting name="We Build Black" />
    </div>
  );
}

export default App;
```

Save the file. Vite's hot module replacement updates the browser instantly -- no manual refresh needed.

A few things to notice:
- Components are just functions that return JSX
- Component names are capitalized (`Greeting`, `App`)
- You pass data to components using attributes that look like HTML -- these are called **props**
- `{name}` inside JSX is how you output a JavaScript value

---

## JSX: A First Look

JSX is the syntax that looks like HTML inside your JavaScript. It's not actually HTML -- it's a syntax extension that gets compiled to JavaScript function calls.

```jsx
// This JSX:
const element = <h1 className="title">Hello</h1>;

// Compiles to:
const element = React.createElement('h1', { className: 'title' }, 'Hello');
```

You don't need to understand the compiled output -- Vite handles that automatically. But knowing that JSX is just JavaScript under the hood explains why it's so flexible: anywhere you can write JavaScript, you can write JSX.

A few JSX rules you need to know now (covered fully in the next lesson):
- Use `className` instead of `class` (since `class` is a reserved word in JavaScript)
- Every component must return a single root element
- JavaScript expressions go inside `{curly braces}`
- Self-closing tags need a slash: `<img />`, `<br />`, `<input />`

```jsx
function ProfileCard() {
  const username = 'alex_dev';
  const followerCount = 1204;

  return (
    // Single root div wraps everything
    <div className="profile-card">
      <img src="/avatar.png" alt="Profile" />  {/* self-closing */}
      <h2>{username}</h2>                       {/* expression */}
      <p>{followerCount} followers</p>          {/* expression in text */}
    </div>
  );
}
```

---

## Why React Specifically?

There are other UI frameworks -- Vue, Svelte, Angular, SolidJS. React's dominance comes from several factors:

**Ecosystem**: React has the largest ecosystem of any UI library. Nearly every third-party component, animation library, or UI kit has a React version. You will rarely need to build something from scratch.

**Job market**: React is the most-requested front-end skill in job postings by a wide margin. Learning React is a direct investment in your employability.

**Transferable concepts**: The ideas you learn in React -- components, props, state, unidirectional data flow -- show up in every other modern framework. React makes you a better developer regardless of what you use later.

**Community and resources**: Millions of developers use React. When you hit a problem, the answer exists somewhere -- Stack Overflow, GitHub issues, YouTube, blog posts. The support network is enormous.

**Meta and open source**: React is maintained by Meta (Facebook) and a large community of open-source contributors. It has been in active development since 2013 and shows no signs of going anywhere.

---

## Key Takeaways

- Imperative DOM manipulation requires you to manually keep UI in sync with data. React's declarative model lets you describe what the UI should look like and re-renders automatically when data changes.
- The virtual DOM lets React make targeted, efficient updates to the real DOM instead of rebuilding everything on each change.
- React applications are built from components: self-contained, composable, reusable pieces of UI.
- Vite (`npm create vite@latest`) is the modern way to set up a React project -- Create React App is deprecated.
- Components are functions that return JSX. JSX compiles to JavaScript function calls -- it is not HTML, but it looks similar.
- React's ecosystem, job market presence, and transferable concepts make it the highest-leverage UI library to learn right now.

---

## Try It Yourself

**Exercise 1**: Create a new Vite React project. Replace the contents of `App.jsx` with a component called `ProfileCard` that accepts `name`, `title`, and `company` as props and renders them in a styled card layout.

**Exercise 2**: Build a `Stats` component that accepts an array of `{ label, value }` objects as a prop and renders each stat in a grid. Pass in at least 4 stats from the parent `App` component (for example: "Students Trained", "Job Placements", "Cohorts Completed", "Partners").

**Exercise 3**: Look at `src/main.jsx` in your Vite project. Temporarily remove `<React.StrictMode>` and observe what changes in the browser console. Add it back. Read the [React StrictMode docs](https://react.dev/reference/react/StrictMode) to understand what protections it provides.

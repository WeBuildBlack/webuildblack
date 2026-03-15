---
title: "Module Project: Component Library"
estimatedMinutes: 90
---

# Module Project: Component Library

You have learned JSX, components, props, conditional rendering, list rendering, and forms. Now you are going to build something you will actually reuse throughout this course: a small component library.

A component library is a set of reusable, composable UI building blocks -- the same concept behind Tailwind UI, Chakra UI, or Material UI. Yours will be WBB-themed and will serve as the foundation for every project in the remaining modules.

By the end of this project you will have 6-8 production-quality components, a demo page that showcases them all, and a solid understanding of how real component libraries are structured.

---

## What You Will Build

A set of reusable UI components:

| Component | Description |
|-----------|-------------|
| `Button` | Multiple variants, sizes, states |
| `Card` | Flexible content container |
| `Input` | Labeled, validated text input |
| `Badge` | Status and category labels |
| `Alert` | Info, success, warning, error messages |
| `Avatar` | User image with fallback initials |
| `Modal` | Accessible overlay dialog |
| `Tooltip` | (Stretch goal) Hover information |

Plus a `Demo.jsx` page that renders all components in every state, so you can see them at a glance.

---

## Project Setup

Create a new Vite project for this module:

```bash
npm create vite@latest component-library -- --template react
cd component-library
npm install
npm run dev
```

Create your folder structure:

```
src/
├── components/
│   ├── Button/
│   │   ├── Button.jsx
│   │   └── Button.css
│   ├── Card/
│   │   ├── Card.jsx
│   │   └── Card.css
│   ├── Input/
│   │   ├── Input.jsx
│   │   └── Input.css
│   ├── Badge/
│   │   ├── Badge.jsx
│   │   └── Badge.css
│   ├── Alert/
│   │   ├── Alert.jsx
│   │   └── Alert.css
│   ├── Avatar/
│   │   ├── Avatar.jsx
│   │   └── Avatar.css
│   └── Modal/
│       ├── Modal.jsx
│       └── Modal.css
├── Demo.jsx
├── App.jsx
└── index.css
```

Add CSS variables to `src/index.css` for the WBB color palette:

```css
:root {
  --color-brown-dark: #2C170B;
  --color-brown-medium: #7D4E21;
  --color-brown-warm: #AE8156;
  --color-olive-dark: #200E03;
  --color-white: #ffffff;
  --color-black: #000000;
  --color-gray-100: #f5f5f5;
  --color-gray-200: #e5e5e5;
  --color-gray-500: #737373;
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-error: #dc2626;
  --color-info: #2563eb;

  --font-sans: 'Inter', system-ui, sans-serif;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.12);
}
```

---

## Component 1: Button

The Button component is the most fundamental. It needs to handle multiple variants, sizes, disabled state, and loading state.

```jsx
// src/components/Button/Button.jsx

function Button({
  children,
  variant,   // TODO: add default value
  size,      // TODO: add default value
  disabled,  // TODO: add default value
  loading,   // TODO: add default value
  onClick,
  type,      // TODO: add default value
  fullWidth, // TODO: add default value -- makes button 100% wide
}) {
  // TODO: Build the className string using the array/filter/join pattern.
  // Should produce classes like: "btn btn--primary btn--md btn--full"
  const className = [
    'btn',
    // TODO: add variant class
    // TODO: add size class
    // TODO: add fullWidth class conditionally
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
    >
      {/* TODO: Show a loading spinner when loading=true, children otherwise */}
      {/* Spinner can be a simple <span className="btn__spinner" /> */}
      {children}
    </button>
  );
}

export default Button;
```

```css
/* src/components/Button/Button.css */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s, transform 0.1s;
  text-decoration: none;
}

/* TODO: Add styles for .btn--primary, .btn--secondary, .btn--danger, .btn--ghost */
/* TODO: Add styles for .btn--sm, .btn--md, .btn--lg */
/* TODO: Add styles for .btn--full (width: 100%) */
/* TODO: Add styles for .btn:disabled */
/* TODO: Add a .btn__spinner keyframe animation */
```

---

## Component 2: Card

The Card component is a flexible container. It should accept a `header` prop for an optional title area and use `children` for the body content.

```jsx
// src/components/Card/Card.jsx

function Card({
  children,
  header,     // Optional: string or JSX for the card header
  footer,     // Optional: JSX for the card footer
  padding,    // TODO: default to 'md' -- controls inner padding size
  shadow,     // TODO: default to true
  hoverable,  // TODO: default to false -- adds hover lift effect
  className,
}) {
  // TODO: Build className string
  // TODO: Return a <div> with the computed class
  // TODO: Render header section only when header prop is provided
  // TODO: Render footer section only when footer prop is provided
  // TODO: Render children in the card body

  return (
    <div className={/* TODO */}>
      {/* TODO: conditional header */}
      <div className="card__body">
        {children}
      </div>
      {/* TODO: conditional footer */}
    </div>
  );
}

export default Card;
```

---

## Component 3: Input

A labeled, accessible input with built-in error display.

```jsx
// src/components/Input/Input.jsx

function Input({
  label,
  id,
  type,        // TODO: default to 'text'
  value,
  onChange,
  placeholder,
  error,       // Error message string -- shows below input when provided
  hint,        // Helper text -- shows below input when no error
  required,    // TODO: default to false
  disabled,    // TODO: default to false
  ...rest      // Forward any other input attributes
}) {
  // TODO: the error id should be `${id}-error` for aria-describedby
  // TODO: the hint id should be `${id}-hint` for aria-describedby

  return (
    <div className="input-field">
      {/* TODO: Render label with htmlFor={id} */}
      {/* TODO: Show required indicator (*) when required=true */}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={/* TODO */}
        aria-describedby={/* TODO: point to error id when error exists, hint id otherwise */}
        className={/* TODO: include 'input--error' class when error exists */}
        {...rest}
      />
      {/* TODO: Show error message with role="alert" when error exists */}
      {/* TODO: Show hint text when no error and hint is provided */}
    </div>
  );
}

export default Input;
```

---

## Component 4: Badge

A small label for status, categories, and counts.

```jsx
// src/components/Badge/Badge.jsx

function Badge({
  text,
  variant,   // TODO: default to 'default' -- options: default, success, warning, error, info, primary
  size,      // TODO: default to 'md' -- options: sm, md
  dot,       // TODO: default to false -- shows a colored dot before the text
}) {
  // TODO: Build className string
  // TODO: Return a <span> with the dot (if enabled) and the text

  return (
    <span className={/* TODO */}>
      {dot && <span className="badge__dot" aria-hidden="true" />}
      {text}
    </span>
  );
}

export default Badge;
```

---

## Component 5: Alert

An alert banner for feedback messages.

```jsx
// src/components/Alert/Alert.jsx

const ICONS = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✕',
};

function Alert({
  variant,     // TODO: default to 'info' -- options: info, success, warning, error
  title,       // Optional bold title line
  children,    // The message content
  onDismiss,   // Optional: callback to close the alert; shows X button when provided
}) {
  // TODO: Build className string with variant
  // TODO: Return the alert structure below

  return (
    <div
      className={/* TODO */}
      role="alert"
      aria-live="polite"
    >
      <span className="alert__icon" aria-hidden="true">
        {ICONS[variant]}
      </span>
      <div className="alert__content">
        {/* TODO: render title if provided */}
        <div className="alert__message">{children}</div>
      </div>
      {/* TODO: render dismiss button if onDismiss is provided */}
    </div>
  );
}

export default Alert;
```

---

## Component 6: Avatar

Displays a user avatar image with an accessible fallback to initials when the image fails to load or no `src` is provided.

```jsx
// src/components/Avatar/Avatar.jsx
import { useState } from 'react';

function Avatar({
  src,
  name,        // Used for alt text and initials fallback
  size,        // TODO: default to 'md' -- options: sm, md, lg, xl
  shape,       // TODO: default to 'circle' -- options: circle, square
}) {
  const [imgError, setImgError] = useState(false);

  // TODO: Compute initials from name (e.g., "Alex Johnson" -> "AJ")
  // Hint: split on spaces, take first letter of each word, join, uppercase, max 2 chars
  const initials = /* TODO */;

  // TODO: Build className string with size and shape
  const className = /* TODO */;

  // Show initials if no src, or if image failed to load
  if (!src || imgError) {
    return (
      <div className={`${className} avatar--initials`} aria-label={name}>
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className={className}
      onError={() => setImgError(true)}
    />
  );
}

export default Avatar;
```

---

## Component 7: Modal

An accessible modal dialog. This is the most complex component -- pay attention to the accessibility requirements.

```jsx
// src/components/Modal/Modal.jsx
import { useEffect } from 'react';

function Modal({
  isOpen,
  onClose,
  title,
  children,
  size,    // TODO: default to 'md' -- options: sm, md, lg, full
}) {
  // TODO: Use useEffect to:
  // 1. Add 'overflow: hidden' to document.body when modal is open (prevents background scrolling)
  // 2. Remove it when modal closes or component unmounts
  // 3. Listen for the Escape key and call onClose when pressed
  useEffect(() => {
    // TODO
  }, [isOpen, onClose]);

  // Return null when closed
  if (!isOpen) return null;

  return (
    // Overlay: clicking it closes the modal
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Panel: stop click propagation so clicking inside doesn't close the modal */}
      <div
        className={`modal-panel modal-panel--${size}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">{title}</h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
```

---

## The Demo Page

Create `src/Demo.jsx` that showcases every component in every meaningful state. This is your component library's documentation.

```jsx
// src/Demo.jsx
import { useState } from 'react';
import Button from './components/Button/Button';
import Card from './components/Card/Card';
import Input from './components/Input/Input';
import Badge from './components/Badge/Badge';
import Alert from './components/Alert/Alert';
import Avatar from './components/Avatar/Avatar';
import Modal from './components/Modal/Modal';

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: '48px' }}>
      <h2 style={{ borderBottom: '2px solid #2C170B', paddingBottom: '8px', marginBottom: '24px' }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        {children}
      </div>
    </section>
  );
}

function Demo() {
  const [modalOpen, setModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [alertDismissed, setAlertDismissed] = useState(false);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ color: '#2C170B', marginBottom: '48px' }}>WBB Component Library</h1>

      <Section title="Button">
        {/* TODO: Render Button in all variants: primary, secondary, danger, ghost */}
        {/* TODO: Render Button in all sizes: sm, md, lg */}
        {/* TODO: Render Button disabled */}
        {/* TODO: Render Button with loading=true */}
      </Section>

      <Section title="Badge">
        {/* TODO: Render Badge in all variants */}
        {/* TODO: Render Badge with dot=true */}
        {/* TODO: Render Badge in sm and md sizes */}
      </Section>

      <Section title="Alert">
        {/* TODO: Render Alert in all variants with sample messages */}
        {/* TODO: Render at least one Alert with onDismiss */}
      </Section>

      <Section title="Avatar">
        {/* TODO: Render Avatar with a real image src */}
        {/* TODO: Render Avatar with a broken src (to show initials fallback) */}
        {/* TODO: Render Avatar with no src */}
        {/* TODO: Render in all sizes */}
      </Section>

      <Section title="Input">
        <Input
          id="demo-input"
          label="Full Name"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Enter your name"
          hint="This is hint text"
        />
        <Input
          id="demo-input-error"
          label="Email"
          value=""
          onChange={() => {}}
          error="Please enter a valid email address"
          required
        />
      </Section>

      <Section title="Card">
        {/* TODO: Render Card with just children */}
        {/* TODO: Render Card with header and footer */}
        {/* TODO: Render Card with hoverable=true */}
      </Section>

      <Section title="Modal">
        <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Example Modal"
        >
          <p>This is the modal content. Press Escape or click outside to close.</p>
          <Button onClick={() => setModalOpen(false)}>Close</Button>
        </Modal>
      </Section>
    </div>
  );
}

export default Demo;
```

Update `App.jsx` to render the Demo page:

```jsx
// src/App.jsx
import Demo from './Demo';
import './index.css';

function App() {
  return <Demo />;
}

export default App;
```

---

## Stretch Goals

Once the core components are complete, try these extensions:

**Tooltip component**: A `Tooltip` component that wraps any element and shows a text tooltip on hover. Use CSS `position: absolute` and a `useState` boolean for visibility. Accept `content`, `position` (top/bottom/left/right), and `children` as props.

**Button with icon**: Extend `Button` to accept an optional `icon` prop (a React element). Render it before or after the label based on an `iconPosition` prop (left or right). Apply `aria-label` when the button has only an icon and no text children.

**Alert auto-dismiss**: Add an `autoDismissAfter` prop (number in milliseconds) to `Alert`. Use `useEffect` and `setTimeout` to call `onDismiss` automatically after that duration. Show a progress bar that drains over the duration.

**Component index file**: Create `src/components/index.js` that re-exports all components. Test that you can import everything from one place: `import { Button, Card, Input } from './components'`.

---

## Submission Checklist

Before considering this project complete:

- [ ] All 6 core components are implemented (Button, Card, Input, Badge, Alert, Avatar)
- [ ] Modal is implemented with Escape key support and body scroll lock
- [ ] Every component has all variants rendered in `Demo.jsx`
- [ ] Avatar shows initials fallback when image fails or no `src` provided
- [ ] Input shows error state with `aria-invalid` and `role="alert"` on the error message
- [ ] Modal has `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`
- [ ] Button disables when `disabled` or `loading` prop is true
- [ ] All CSS uses the CSS variables defined in `index.css`
- [ ] No inline styles except in the Demo page layout wrapper divs
- [ ] All components are exported as default from their files

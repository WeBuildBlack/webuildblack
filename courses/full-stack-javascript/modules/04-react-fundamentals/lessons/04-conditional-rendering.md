---
title: "Conditional Rendering"
estimatedMinutes: 30
---

# Conditional Rendering

Almost every real-world UI has elements that appear or disappear based on data. A loading spinner that shows while data is fetching. An error message that appears when a request fails. A login button for guests and a profile menu for authenticated users. React gives you multiple ways to handle these cases -- all of them using plain JavaScript logic, not special template directives. This lesson covers each pattern, when to use it, and the pitfalls to avoid.

---

## The Foundation: Components Can Return `null`

The simplest conditional rendering fact to understand first: a React component can return `null`, and when it does, nothing renders -- no DOM element, no whitespace, nothing.

```jsx
function SuccessBanner({ message, visible }) {
  if (!visible) return null;  // Render nothing when not visible

  return (
    <div className="banner banner--success">
      <p>{message}</p>
    </div>
  );
}

function App() {
  const [saved, setSaved] = React.useState(false);

  return (
    <div>
      <SuccessBanner message="Changes saved!" visible={saved} />
      <button onClick={() => setSaved(true)}>Save</button>
    </div>
  );
}
```

This early return pattern is clean and readable. The function exits immediately when there is nothing to show, and the main render path stays uncluttered.

---

## The `&&` Operator

The `&&` (AND) operator is the most common way to conditionally render something inside JSX. It works because of how JavaScript evaluates `&&`: if the left side is falsy, it returns the left side. If the left side is truthy, it returns the right side.

```jsx
function NotificationBadge({ count }) {
  return (
    <div className="nav-icon">
      <BellIcon />
      {/* Only renders the badge if count > 0 */}
      {count > 0 && (
        <span className="badge">{count}</span>
      )}
    </div>
  );
}
```

When `count` is `0`, the expression `0 > 0` is `false`, so nothing renders. This is the behavior you want.

**Important pitfall**: never use `&&` with a number that could be `0` as the left operand directly.

```jsx
// Bug: when items.length is 0, React renders the number 0 in the DOM
function ItemList({ items }) {
  return (
    <div>
      {items.length && <ul>{items.map(...)}</ul>}  // Renders "0" when empty
    </div>
  );
}

// Fix: convert to a boolean explicitly
function ItemList({ items }) {
  return (
    <div>
      {items.length > 0 && <ul>{items.map(...)}</ul>}  // Correct
      {/* Or: */}
      {!!items.length && <ul>{items.map(...)}</ul>}     // Also correct
    </div>
  );
}
```

This is one of the most common React bugs in the wild. The fix is simple: make your left operand a boolean expression, not a number.

---

## The Ternary Operator

When you need to choose between two different outputs, use a ternary: `condition ? ifTrue : ifFalse`.

```jsx
function AuthButton({ isLoggedIn, onLogin, onLogout }) {
  return (
    <div className="auth-controls">
      {isLoggedIn ? (
        <button onClick={onLogout} className="btn btn--secondary">
          Sign Out
        </button>
      ) : (
        <button onClick={onLogin} className="btn btn--primary">
          Sign In
        </button>
      )}
    </div>
  );
}
```

Ternaries work well for simple two-option choices. For more complex logic, they get nested and hard to read quickly.

```jsx
// Nested ternaries become hard to follow
function StatusDisplay({ status }) {
  return (
    <span className="status">
      {status === 'active'
        ? 'Active'
        : status === 'pending'
          ? 'Pending Approval'
          : status === 'suspended'
            ? 'Suspended'
            : 'Unknown'}
    </span>
  );
}
```

When you reach two levels of nesting, move the logic above the return statement.

---

## Moving Logic Above the Return

You are not limited to expressions inside JSX. Any logic that is complex or involves multiple branches belongs above the return statement, assigned to a variable.

```jsx
// Before: nested ternaries in JSX (hard to read)
function StatusBadge({ status }) {
  return (
    <span className={status === 'active' ? 'badge--green' : status === 'pending' ? 'badge--yellow' : 'badge--red'}>
      {status === 'active' ? 'Active' : status === 'pending' ? 'Pending' : 'Inactive'}
    </span>
  );
}

// After: logic above the return (easy to read)
function StatusBadge({ status }) {
  // Compute display values before the return
  const statusConfig = {
    active: { label: 'Active', className: 'badge--green' },
    pending: { label: 'Pending Approval', className: 'badge--yellow' },
    suspended: { label: 'Suspended', className: 'badge--red' },
  };

  const config = statusConfig[status] || { label: 'Unknown', className: 'badge--gray' };

  return (
    <span className={`badge ${config.className}`}>
      {config.label}
    </span>
  );
}
```

The JSX stays simple. The logic lives where it is easiest to read and test.

---

## Loading, Error, and Empty States

Real data fetching has three states you almost always need to handle: loading, error, and empty (no data). The early return pattern handles this naturally.

```jsx
function MemberDirectory({ members, isLoading, error }) {
  // Handle loading first
  if (isLoading) {
    return (
      <div className="loading-state">
        <Spinner />
        <p>Loading members...</p>
      </div>
    );
  }

  // Handle error second
  if (error) {
    return (
      <div className="error-state">
        <p>Something went wrong: {error.message}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  // Handle empty state third
  if (members.length === 0) {
    return (
      <div className="empty-state">
        <p>No members found.</p>
        <a href="/invite">Invite someone</a>
      </div>
    );
  }

  // Happy path -- render the actual content
  return (
    <ul className="member-list">
      {members.map(member => (
        <MemberCard key={member.id} member={member} />
      ))}
    </ul>
  );
}
```

The early return pattern makes each case explicit and independent. Each failure mode gets its own clear branch. The main render path only runs when you actually have data.

---

## Conditional CSS Classes

You often need to conditionally apply CSS classes based on state or props. Do this with a ternary or the array/join pattern.

```jsx
function NavLink({ href, label, isActive }) {
  return (
    <a
      href={href}
      className={`nav-link ${isActive ? 'nav-link--active' : ''}`}
    >
      {label}
    </a>
  );
}

// For more conditions, the array approach stays readable
function Card({ variant, isSelected, isDisabled, children }) {
  const classes = [
    'card',
    variant && `card--${variant}`,
    isSelected && 'card--selected',
    isDisabled && 'card--disabled',
  ]
    .filter(Boolean)   // Remove false/undefined/null entries
    .join(' ');

  return (
    <div className={classes}>
      {children}
    </div>
  );
}
```

The `.filter(Boolean)` trick removes any falsy values from the array before joining, so you never end up with class names like `"card false undefined"`.

---

## Showing and Hiding vs. Mounting and Unmounting

There is an important difference between two approaches to hiding content:

**CSS `display: none` / `visibility: hidden`**: The element stays in the DOM but is not visible. State inside the component is preserved.

**Conditional rendering** (returning `null` or not rendering the component): The component is removed from the DOM entirely. Its state is destroyed and will reset when it renders again.

```jsx
// Approach 1: CSS-based hiding -- component stays mounted, state preserved
function DrawerWithCSS({ isOpen, children }) {
  return (
    <div style={{ display: isOpen ? 'block' : 'none' }}>
      {children}
    </div>
  );
}

// Approach 2: Conditional rendering -- component unmounts, state resets
function DrawerWithConditional({ isOpen, children }) {
  if (!isOpen) return null;
  return (
    <div>
      {children}
    </div>
  );
}
```

**When to use each:**

Use CSS hiding when:
- The content has local state you want to preserve (like a form mid-fill)
- The component is expensive to re-mount (lots of setup work)
- You want CSS transitions on show/hide

Use conditional rendering when:
- You want the component to start fresh each time it appears
- You want the component's `useEffect` to run on each appearance
- The component does not need to exist in the DOM when hidden (accessibility benefit)

---

## Practical Example: A Feature-Rich Component

Combining all the patterns from this lesson:

```jsx
// src/components/CourseProgress.jsx
function CourseProgress({ enrollment }) {
  // Early returns for edge cases
  if (!enrollment) return null;

  const { course, isCompleted, progressPercent, currentLesson, isLocked } = enrollment;

  // Compute display values above the return
  const progressLabel = isCompleted
    ? 'Completed'
    : `${progressPercent}% complete`;

  const ctaLabel = isCompleted
    ? 'Review Course'
    : progressPercent === 0
      ? 'Start Learning'
      : 'Continue';

  const statusClass = isCompleted
    ? 'progress-card--completed'
    : isLocked
      ? 'progress-card--locked'
      : 'progress-card--active';

  return (
    <div className={`progress-card ${statusClass}`}>
      <div className="progress-card__header">
        <h3>{course.title}</h3>
        {/* Badge only shows when completed */}
        {isCompleted && (
          <span className="badge badge--success">Done</span>
        )}
      </div>

      {/* Progress bar only shows when not locked */}
      {!isLocked && (
        <div className="progress-bar" aria-label={progressLabel}>
          <div
            className="progress-bar__fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      <div className="progress-card__footer">
        <span className="progress-label">{progressLabel}</span>

        {/* Lock message or CTA button -- never both */}
        {isLocked ? (
          <span className="locked-message">Complete prerequisites to unlock</span>
        ) : (
          <a href={`/courses/${course.slug}`} className="btn btn--primary btn--sm">
            {ctaLabel}
          </a>
        )}
      </div>
    </div>
  );
}

export default CourseProgress;
```

---

## Key Takeaways

- A component can return `null` to render nothing. The early return pattern -- checking conditions at the top of the function and returning early -- keeps the main render path clean.
- Use `&&` for "show this thing if condition is true." Always use a boolean expression on the left side, not a raw number, to avoid accidentally rendering `0`.
- Use ternaries for "show this OR that." When ternaries nest more than one level deep, move the logic into variables above the return.
- The loading/error/empty/data pattern handles the four states of async data. Check each in order using early returns.
- Conditional CSS classes use ternaries for simple cases. For multiple conditions, the `[...].filter(Boolean).join(' ')` pattern stays readable.
- Conditional rendering unmounts components and destroys their state. CSS hiding keeps them mounted and preserves state. Choose based on whether you want state preserved.

---

## Try It Yourself

**Exercise 1**: Build a `FeatureFlag` component that accepts `enabled` (boolean) and `children` as props. When `enabled` is false, render a placeholder message ("This feature is coming soon") instead of the children. Use the early return pattern.

**Exercise 2**: Create a `DataCard` component that handles all four states: `isLoading` (show a skeleton placeholder), `error` (show the error message with a retry button), empty data array (show an empty state message), and populated data (render the content). Wire up each state with a prop so you can test them all from `App.jsx`.

**Exercise 3**: Build a `Tabs` component that accepts an array of `{ id, label, content }` tab objects and an `activeTab` id as props. Render all tab panels, but use CSS (`display: none` / `display: block` via inline styles) to show only the active one. Then rewrite it to use conditional rendering instead. Observe the difference in the DOM using browser DevTools.

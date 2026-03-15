---
title: "Props and Data Flow"
estimatedMinutes: 35
---

# Props and Data Flow

Props are how React components communicate. Understanding them fully -- not just the syntax but the philosophy -- is what separates components that are easy to maintain from ones that become a source of bugs. This lesson covers props in depth: how to pass them, how to receive them, how data flows through a component tree, and the patterns that keep your components flexible and reusable.

---

## What Props Are

Props (short for properties) are the arguments you pass to a React component. They work exactly like function arguments -- because components are functions.

```jsx
// A component is a function
function Greeting({ name }) {
  return <h1>Hello, {name}!</h1>;
}

// Using the component: props look like HTML attributes
function App() {
  return <Greeting name="Marcus" />;
}

// Under the hood, React calls: Greeting({ name: "Marcus" })
```

Props can be any JavaScript value: strings, numbers, booleans, arrays, objects, functions, or even other React elements.

```jsx
function ProductCard({ name, price, inStock, tags, onAddToCart }) {
  return (
    <div className="product-card">
      <h2>{name}</h2>
      <p>${price.toFixed(2)}</p>
      <p>{inStock ? 'In Stock' : 'Out of Stock'}</p>
      <ul>
        {tags.map(tag => <li key={tag}>{tag}</li>)}
      </ul>
      <button onClick={onAddToCart} disabled={!inStock}>
        Add to Cart
      </button>
    </div>
  );
}

function App() {
  function handleAddToCart() {
    console.log('Added to cart');
  }

  return (
    <ProductCard
      name="JavaScript: The Good Parts"
      price={24.99}
      inStock={true}
      tags={['books', 'programming', 'javascript']}
      onAddToCart={handleAddToCart}
    />
  );
}
```

Non-string props use curly braces: `price={24.99}`, `inStock={true}`, `tags={['books']}`. String props can use quotes: `name="JavaScript: The Good Parts"`. A boolean prop with value `true` can be written as a shorthand -- just `inStock` instead of `inStock={true}`.

---

## Destructuring Props

You can receive props as a whole object or destructure them in the parameter list. Destructuring is almost always cleaner.

```jsx
// Props as a whole object -- verbose to use inside the component
function Button(props) {
  return (
    <button
      className={`btn btn--${props.variant}`}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  );
}

// Destructured in the parameter list -- clean and self-documenting
function Button({ variant, onClick, disabled, children }) {
  return (
    <button
      className={`btn btn--${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
```

You can also destructure nested objects in the parameter list:

```jsx
function UserProfile({ user: { name, email, avatar } }) {
  return (
    <div className="profile">
      <img src={avatar} alt={name} />
      <h2>{name}</h2>
      <p>{email}</p>
    </div>
  );
}
```

If you find yourself destructuring three levels deep, the component probably needs a simpler interface. Deep nesting usually signals too much data is being passed as a single object.

---

## Default Props

Set default values for props directly in the destructuring syntax. If the parent does not pass a value for that prop, the default is used.

```jsx
function Button({ variant = 'primary', size = 'md', disabled = false, children }) {
  return (
    <button
      className={`btn btn--${variant} btn--${size}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

// All three of these work:
<Button>Submit</Button>                               // all defaults
<Button variant="secondary">Cancel</Button>           // overrides variant
<Button variant="danger" size="lg">Delete</Button>    // overrides variant and size
```

Default props make components easier to use. Callers only need to pass what they want to customize.

---

## One-Way Data Flow

React enforces a fundamental rule: **data flows down, actions flow up**. This is called unidirectional data flow.

- A parent component passes data to children via props.
- Children cannot modify the props they receive.
- When a child needs to trigger a change, it calls a function passed down as a prop.

```jsx
// Parent owns the data and the function to change it
function ParentComponent() {
  const [count, setCount] = React.useState(0);

  function handleIncrement() {
    setCount(count + 1);
  }

  return (
    // Parent passes both the value AND the update function
    <ChildComponent count={count} onIncrement={handleIncrement} />
  );
}

// Child receives data and a callback -- it never owns the state
function ChildComponent({ count, onIncrement }) {
  return (
    <div>
      <p>Count: {count}</p>
      {/* Child triggers the parent's function -- parent decides what happens */}
      <button onClick={onIncrement}>Increment</button>
    </div>
  );
}
```

This pattern keeps data predictable. At any point you can look at a component's props and know exactly where its data came from and who controls it.

---

## Props Are Read-Only

Never mutate props. Props are read-only from the receiving component's perspective.

```jsx
// Wrong -- mutating the props array directly
function BadComponent({ items }) {
  items.push({ id: 99, name: 'New item' });  // Never do this
  return (
    <ul>
      {items.map(item => <li key={item.id}>{item.name}</li>)}
    </ul>
  );
}

// Right -- create a new array, leave the original untouched
function GoodComponent({ items }) {
  const allItems = [...items, { id: 99, name: 'New item' }];
  return (
    <ul>
      {allItems.map(item => <li key={item.id}>{item.name}</li>)}
    </ul>
  );
}
```

Mutating props causes bugs that are extremely hard to track down. React assumes props are stable references. When you mutate them, React cannot detect the change, and your UI drifts out of sync with your data.

---

## The `children` Prop Revisited

`children` is a prop like any other -- it just has special syntax. Whatever JSX you place between a component's opening and closing tags becomes the `children` prop.

```jsx
function Section({ title, children }) {
  return (
    <section className="section">
      <h2 className="section__title">{title}</h2>
      <div className="section__body">
        {children}
      </div>
    </section>
  );
}

function App() {
  return (
    <Section title="Our Programs">
      <p>We offer workforce training, youth coding, and interview prep.</p>
      <a href="/programs">View all programs</a>
    </Section>
  );
}
```

You can also pass JSX as a named prop -- useful when a component has multiple distinct content areas:

```jsx
function TwoColumnLayout({ left, right }) {
  return (
    <div className="two-col">
      <aside className="two-col__sidebar">{left}</aside>
      <main className="two-col__main">{right}</main>
    </div>
  );
}

function App() {
  return (
    <TwoColumnLayout
      left={<NavMenu />}
      right={<PageContent />}
    />
  );
}
```

---

## Prop Drilling: A Preview

As your component tree grows deeper, you may end up passing a prop through multiple intermediate components that do not use it -- just to get it to the one that does. This is called prop drilling.

```jsx
// user needs to reach Avatar, but Header and Nav don't use it -- just pass it along
function App() {
  const user = { name: 'Jordan', avatar: '/avatar.png' };
  return <Header user={user} />;
}

function Header({ user }) {
  return <Nav user={user} />;    // Header does not use user
}

function Nav({ user }) {
  return <Avatar user={user} />; // Nav does not use user
}

function Avatar({ user }) {
  return <img src={user.avatar} alt={user.name} />;  // Avatar finally uses it
}
```

Prop drilling works fine at 2-3 levels. When it goes deeper, updating the data shape requires touching every intermediate component. The Context API (covered in Module 5) solves this for data that needs to be available across many levels of the tree.

---

## Practical Patterns

### Spreading props onto elements

When building wrapper components, use the rest/spread pattern to forward HTML attributes without listing them all by name:

```jsx
// Without spread -- must manually list every attribute you want to support
function Input({ type, id, placeholder, className, onChange, onBlur, value }) {
  return (
    <input
      type={type}
      id={id}
      placeholder={placeholder}
      className={`input ${className}`}
      onChange={onChange}
      onBlur={onBlur}
      value={value}
    />
  );
}

// With rest/spread -- forward everything not explicitly destructured
function Input({ className, ...rest }) {
  return (
    <input
      className={`input ${className || ''}`}
      {...rest}   // spreads type, id, placeholder, onChange, value, etc.
    />
  );
}

// Usage is identical either way
<Input type="email" id="email" placeholder="you@example.com" onChange={handleChange} />
```

Use spread carefully -- you want intentional prop forwarding, not accidental.

### Computed class names from props

A very common pattern: building a `className` string from prop values.

```jsx
function Badge({ text, variant = 'default', size = 'md' }) {
  const className = [
    'badge',
    `badge--${variant}`,
    `badge--${size}`,
  ].join(' ');

  return <span className={className}>{text}</span>;
}

// Produces: className="badge badge--success badge--sm"
<Badge text="Completed" variant="success" size="sm" />
```

The `clsx` library makes conditional class logic even cleaner for complex cases, but this array approach handles most situations cleanly.

---

## Putting It Together

A realistic multi-level component tree with props flowing through each level:

```jsx
// Smallest unit: a single stat display
function StatCard({ label, value, trend }) {
  return (
    <div className="stat-card">
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
      {trend !== undefined && (
        <span className={`stat-card__trend stat-card__trend--${trend > 0 ? 'up' : 'down'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
  );
}

// Mid-level: lays out a row of stats
function StatsRow({ stats }) {
  return (
    <div className="stats-row">
      {stats.map(stat => (
        <StatCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          trend={stat.trend}
        />
      ))}
    </div>
  );
}

// Top level: owns the data, passes it down
function CohortDashboard({ cohort }) {
  const stats = [
    { label: 'Enrolled', value: cohort.enrolledCount },
    { label: 'Active', value: cohort.activeCount, trend: cohort.activeTrend },
    { label: 'Completed', value: cohort.completedCount },
    { label: 'Placed', value: cohort.placedCount, trend: cohort.placedTrend },
  ];

  return (
    <div className="cohort-dashboard">
      <h1>{cohort.name}</h1>
      <p>Cohort {cohort.quarter} -- {cohort.program}</p>
      <StatsRow stats={stats} />
    </div>
  );
}

export default CohortDashboard;
```

---

## Key Takeaways

- Props are arguments passed to components. They can be any JavaScript value: strings, numbers, booleans, arrays, objects, functions, or JSX.
- Destructure props in the parameter list for cleaner code. Set defaults in the destructuring: `{ variant = 'primary' }`.
- Data flows down (parent to child via props). Actions flow up (child calls a function passed as a prop). This is unidirectional data flow.
- Props are read-only. Never mutate a prop -- create a new value instead.
- The `children` prop holds JSX nested between a component's tags. Named JSX props enable multi-slot layouts.
- Prop drilling works for shallow trees. The Context API handles deep trees where intermediate components should not have to know about data they do not use.
- The `...rest` spread pattern lets wrapper components forward arbitrary props to underlying elements without listing each one.

---

## Try It Yourself

**Exercise 1**: Build a `Button` component with `variant` (primary, secondary, danger), `size` (sm, md, lg), `disabled`, and `children` props -- all with defaults except `children`. Use the class name array pattern to compute the `className` string dynamically.

**Exercise 2**: Create a `ProfileList` component that accepts an array of `{ id, name, role, avatarUrl }` objects and an `onSelect` callback as props. Render a `ProfileCard` for each item, passing all fields plus the `onSelect` handler as props to each card.

**Exercise 3**: Build a `SplitLayout` component that accepts `left`, `right`, and `ratio` (a string like `'30/70'` or `'50/50'`) as props. Parse the ratio string to compute CSS `flex-basis` values using inline styles. Test it with two different ratios in `App.jsx`.

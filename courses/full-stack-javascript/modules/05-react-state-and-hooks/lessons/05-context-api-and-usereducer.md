---
title: "Context API and useReducer"
estimatedMinutes: 40
---

# Context API and useReducer

Two patterns in this lesson solve problems that come up in every serious React application. Context solves the prop drilling problem: sharing data across many levels of the component tree without passing it through every intermediate component. `useReducer` solves the complex state problem: managing state with multiple actions and interdependent fields that become unwieldy with `useState`. Combined, they give you a lightweight but capable state management system -- no external library required.

---

## The Prop Drilling Problem, Revisited

When you have data that many components at different levels need (like the current user, app theme, or cart contents), passing it through props works -- but it forces every intermediate component to accept and forward props it does not use.

```jsx
// Without Context: user prop drills through Layout and Sidebar just to reach UserMenu
function App() {
  const [user, setUser] = useState({ name: 'Jordan', role: 'admin' });
  return <Layout user={user} />;
}

function Layout({ user }) {
  return (
    <div>
      <Sidebar user={user} />   {/* Layout doesn't use user, just passes it */}
      <main>Content</main>
    </div>
  );
}

function Sidebar({ user }) {
  return (
    <aside>
      <UserMenu user={user} />  {/* Sidebar doesn't use user, just passes it */}
    </aside>
  );
}

function UserMenu({ user }) {
  return <span>Hello, {user.name}</span>;  {/* Finally uses it */}
}
```

Context lets you skip the intermediate components entirely.

---

## createContext and Provider

Context has two parts: the context object (created once) and the Provider (which supplies the value).

```jsx
import { createContext, useContext, useState } from 'react';

// 1. Create the context with a default value
// The default value is only used when a component is not inside any Provider
const UserContext = createContext(null);

// 2. Create a Provider component that wraps the part of the tree that needs this data
function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  function login(userData) {
    setUser(userData);
  }

  function logout() {
    setUser(null);
  }

  return (
    // Any component inside this Provider can access the value
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

// 3. Wrap your app (or a subtree) with the Provider
function App() {
  return (
    <UserProvider>
      <Layout />
    </UserProvider>
  );
}
```

The `value` prop on the Provider is what consumers receive. When the value changes, all consumers re-render.

---

## useContext

Any component inside a Provider can read the context value using `useContext`:

```jsx
// Intermediate components no longer need to know about user
function Layout() {
  return (
    <div>
      <Sidebar />
      <main>Content</main>
    </div>
  );
}

function Sidebar() {
  return <aside><UserMenu /></aside>;
}

// Only the component that needs the data uses useContext
function UserMenu() {
  const { user, logout } = useContext(UserContext);

  if (!user) return <a href="/login">Sign In</a>;

  return (
    <div>
      <span>Hello, {user.name}</span>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
```

`Layout` and `Sidebar` are completely clean -- they do not need to know that `UserContext` exists.

### Creating a custom hook for context

It is best practice to create a custom hook that wraps `useContext` for each context you create. This lets you add error checking and keeps consumption clean:

```jsx
// Encapsulate useContext in a custom hook
function useUser() {
  const context = useContext(UserContext);
  if (context === null) {
    throw new Error('useUser must be used inside a UserProvider');
  }
  return context;
}

// Usage: even cleaner
function UserMenu() {
  const { user, logout } = useUser();
  // ...
}
```

The error check catches the common mistake of using the hook outside its Provider -- you get a clear error message instead of a cryptic "cannot read property of undefined."

---

## useReducer: Managing Complex State

`useReducer` is an alternative to `useState` for managing state that involves multiple sub-values or where the next state depends on the current state in complex ways. It is modeled after the reducer pattern from Redux (but much simpler).

The pattern: instead of calling a setter directly, you **dispatch an action** describing what happened. A **reducer function** takes the current state and the action and returns the new state.

```jsx
import { useReducer } from 'react';

// 1. Define the initial state
const initialState = {
  items: [],
  isOpen: false,
  lastUpdated: null,
};

// 2. Write the reducer: a pure function (state, action) => newState
function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.id === action.payload.id);
      if (existingItem) {
        // Item already in cart: increment quantity
        return {
          ...state,
          items: state.items.map(item =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
          lastUpdated: Date.now(),
        };
      }
      // New item: add with quantity 1
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }],
        lastUpdated: Date.now(),
      };
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload),
        lastUpdated: Date.now(),
      };

    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: Math.max(0, action.payload.quantity) }
            : item
        ).filter(item => item.quantity > 0),  // Remove items with quantity 0
        lastUpdated: Date.now(),
      };

    case 'CLEAR_CART':
      return { ...state, items: [], lastUpdated: Date.now() };

    case 'OPEN_CART':
      return { ...state, isOpen: true };

    case 'CLOSE_CART':
      return { ...state, isOpen: false };

    default:
      return state;
  }
}

// 3. Use the reducer in a component
function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Expose friendly action creators instead of raw dispatch
  function addItem(product) {
    dispatch({ type: 'ADD_ITEM', payload: product });
  }

  function removeItem(productId) {
    dispatch({ type: 'REMOVE_ITEM', payload: productId });
  }

  function updateQuantity(productId, quantity) {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id: productId, quantity } });
  }

  function clearCart() {
    dispatch({ type: 'CLEAR_CART' });
  }

  // Derived values computed from state
  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items: state.items,
      isOpen: state.isOpen,
      itemCount,
      subtotal,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      openCart: () => dispatch({ type: 'OPEN_CART' }),
      closeCart: () => dispatch({ type: 'CLOSE_CART' }),
    }}>
      {children}
    </CartContext.Provider>
  );
}
```

---

## Combining Context and useReducer

Combining them is the pattern for lightweight app-level state management. Context distributes the state to any component that needs it. The reducer centralizes all state changes in a single place.

```jsx
// Full pattern: Context + useReducer for the shopping cart

const CartContext = createContext(null);

function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}

// CartProvider and cartReducer are defined above...

// Consumer components -- clean and simple
function AddToCartButton({ product }) {
  const { addItem } = useCart();
  return (
    <button onClick={() => addItem(product)} className="btn btn--primary">
      Add to Cart
    </button>
  );
}

function CartIcon() {
  const { itemCount, openCart } = useCart();
  return (
    <button onClick={openCart} aria-label={`Cart, ${itemCount} items`}>
      Cart
      {itemCount > 0 && <span className="badge">{itemCount}</span>}
    </button>
  );
}

function CartSummary() {
  const { items, subtotal, removeItem, updateQuantity } = useCart();

  if (items.length === 0) return <p>Your cart is empty.</p>;

  return (
    <div>
      {items.map(item => (
        <div key={item.id} className="cart-item">
          <span>{item.name}</span>
          <input
            type="number"
            min="1"
            value={item.quantity}
            onChange={e => updateQuantity(item.id, parseInt(e.target.value, 10))}
          />
          <span>${(item.price * item.quantity).toFixed(2)}</span>
          <button onClick={() => removeItem(item.id)}>Remove</button>
        </div>
      ))}
      <p>Subtotal: ${subtotal.toFixed(2)}</p>
    </div>
  );
}

// App wires it all together
function App() {
  return (
    <CartProvider>
      <Header />
      <ProductGrid />
      <CartDrawer />
    </CartProvider>
  );
}
```

Every component that touches cart data gets it from `useCart()`. No prop drilling. All state transitions are in `cartReducer`. To understand how the cart can possibly change, you read the reducer -- one function.

---

## When to Use Context vs. Prop Drilling

Context is not always the answer. Prop drilling is fine -- and often better -- for shallow, localized data sharing.

**Use prop drilling when:**
- The data only needs to go 2-3 levels deep
- Only a few components need the data
- The relationship between parent and child is tight and explicit

**Use Context when:**
- Data needs to be available many levels deep
- Many unrelated components need the same data (theme, user, language)
- Intermediate components should not know about the data at all

**Do not use Context as a replacement for all state.** Most state is local to one component or a small subtree. Local `useState` is simpler, faster, and easier to understand. Context shines for genuinely global or widely-shared state.

---

## When to Use useReducer vs. useState

**Use useState when:**
- State is a simple value (string, number, boolean)
- State updates are independent of each other
- You have 2-3 state variables with simple update logic

**Use useReducer when:**
- State is an object with multiple related fields
- Multiple actions need to update multiple fields together
- The next state depends on the current state in complex ways
- You want all state transitions documented in one place (the reducer)

```jsx
// useState is fine for this
const [isOpen, setIsOpen] = useState(false);
const [query, setQuery] = useState('');

// useReducer is better for this
const [state, dispatch] = useReducer(formReducer, {
  step: 1,
  formData: { name: '', email: '', role: '', track: '' },
  errors: {},
  isSubmitting: false,
  isComplete: false,
});
```

---

## Key Takeaways

- Context lets you share data across a component tree without prop drilling. Create it with `createContext`, provide it with `<Context.Provider value={...}>`, and consume it with `useContext`.
- Wrap `useContext` in a custom hook for each context you create. Add an error check for use outside the Provider. This gives cleaner code and helpful error messages.
- `useReducer` takes a reducer function `(state, action) => newState` and an initial state. You update state by dispatching action objects instead of calling setters directly.
- Combining Context + `useReducer` gives you a lightweight state management system: Context distributes state to any component that needs it, and the reducer centralizes all state transitions.
- Prop drilling (2-3 levels, few components) is often simpler than Context. Use Context for genuinely global or widely-shared data: auth state, theme, cart contents, language/locale.
- Use `useReducer` over `useState` when you have a state object with multiple related fields, multiple actions, or transitions that depend on several pieces of current state together.

---

## Try It Yourself

**Exercise 1**: Create a `ThemeContext` with a `ThemeProvider` that stores `theme` (light or dark) in state. Expose `theme` and `toggleTheme` through the context. Wrap your app in `ThemeProvider` and use `useTheme()` (a custom hook wrapping `useContext`) in a `ThemeToggle` button and at least two other components to change their appearance.

**Exercise 2**: Build a multi-step form using `useReducer`. The form should have 3 steps with different fields. The reducer should handle: `SET_FIELD`, `NEXT_STEP`, `PREV_STEP`, `SUBMIT`, and `RESET` actions. The `NEXT_STEP` action should only advance if the current step's fields are valid (add basic validation in the reducer).

**Exercise 3**: Implement a `NotificationContext` using Context + `useReducer` that manages a list of toast notifications. Support adding notifications (with `id`, `message`, `variant`, and `duration` fields) and removing them by `id`. Build a `useNotifications` hook, a `ToastContainer` component that renders all active notifications, and a `useNotifications().notify()` function that automatically removes each notification after its `duration` elapses.

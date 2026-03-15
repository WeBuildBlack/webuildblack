---
title: "Module Project: Shopping Cart"
estimatedMinutes: 90
---

# Module Project: Shopping Cart

You have learned `useState` in depth, `useEffect` for side effects, `useRef` and `useMemo` for optimization, custom hooks for reusable logic, and Context + `useReducer` for app-level state. This project pulls all of it together into a fully functional shopping cart application.

By the end you will have a product listing page, a cart sidebar, quantity controls, persistent cart state, and a complete Context + `useReducer` implementation -- the same architecture used in production e-commerce applications.

---

## What You Will Build

A course marketplace shopping cart with:

- Product listing page with filter by category
- "Add to Cart" button on each product
- Cart icon in the header showing the item count
- Sliding cart sidebar with quantity controls and a remove button
- Cart total and item subtotal display
- Cart persisted to `localStorage` (survives page refresh)
- Empty cart state and a "Continue Shopping" button
- Checkout button (mock -- just clears the cart and shows a success message)

---

## Project Setup

```bash
npm create vite@latest shopping-cart -- --template react
cd shopping-cart
npm install
npm run dev
```

You can import the component library you built in Module 04 (copy the `src/components/` folder), or re-implement a minimal `Button`, `Badge`, and `Card` for this project.

---

## Data: The Product Catalog

Create `src/data/products.js` with mock product data:

```javascript
// src/data/products.js
export const PRODUCTS = [
  {
    id: 'wdf-001',
    slug: 'web-dev-foundations',
    title: 'Web Dev Foundations',
    category: 'beginner',
    description: 'Start from zero: terminal, Git, HTML, CSS, JavaScript, and responsive design.',
    priceCents: 0,
    instructor: 'We Build Black',
    estimatedHours: 60,
    thumbnail: 'https://placehold.co/300x180/2C170B/AE8156?text=Web+Dev',
  },
  {
    id: 'aie-001',
    slug: 'ai-engineering',
    title: 'AI Engineering for Web Devs',
    category: 'intermediate',
    description: 'Build AI-powered web features using the OpenAI and Anthropic APIs.',
    priceCents: 4900,
    instructor: 'We Build Black',
    estimatedHours: 50,
    thumbnail: 'https://placehold.co/300x180/200E03/7D4E21?text=AI+Eng',
  },
  {
    id: 'fsjs-001',
    slug: 'full-stack-javascript',
    title: 'Full-Stack JavaScript',
    category: 'intermediate',
    description: 'React, Node.js, Express, PostgreSQL, and deployment.',
    priceCents: 4900,
    instructor: 'We Build Black',
    estimatedHours: 50,
    thumbnail: 'https://placehold.co/300x180/7D4E21/ffffff?text=Full+Stack',
  },
  {
    id: 'prwa-001',
    slug: 'production-ready-apps',
    title: 'Production-Ready Web Apps',
    category: 'advanced',
    description: 'Testing, CI/CD, security, performance, and monitoring for production.',
    priceCents: 6900,
    instructor: 'We Build Black',
    estimatedHours: 40,
    thumbnail: 'https://placehold.co/300x180/AE8156/200E03?text=Production',
  },
  {
    id: 'dsw-001',
    slug: 'design-systems',
    title: 'Design Systems with React',
    category: 'intermediate',
    description: 'Build a reusable component library with Storybook, tokens, and accessibility.',
    priceCents: 3900,
    instructor: 'We Build Black',
    estimatedHours: 30,
    thumbnail: 'https://placehold.co/300x180/2C170B/ffffff?text=Design+Sys',
  },
  {
    id: 'mob-001',
    slug: 'react-native-mobile',
    title: 'React Native Mobile Dev',
    category: 'advanced',
    description: 'Build iOS and Android apps with React Native and Expo.',
    priceCents: 5900,
    instructor: 'We Build Black',
    estimatedHours: 45,
    thumbnail: 'https://placehold.co/300x180/200E03/AE8156?text=Mobile',
  },
];

export const CATEGORIES = ['all', 'beginner', 'intermediate', 'advanced'];
```

---

## Step 1: Cart Reducer

Create `src/store/cartReducer.js`:

```javascript
// src/store/cartReducer.js

export const initialCartState = {
  items: [],       // Array of { ...product, quantity }
  isOpen: false,   // Whether the cart sidebar is visible
};

// TODO: Implement the cartReducer function.
// It should handle these action types:
//
// 'ADD_ITEM': payload = product object
//   - If the product is already in the cart, increment its quantity
//   - If it's new, add it with quantity: 1
//   - Free products (priceCents === 0) can be added, but note "Free" instead of a price
//
// 'REMOVE_ITEM': payload = product id (string)
//   - Remove the item with that id from the cart
//
// 'UPDATE_QUANTITY': payload = { id, quantity }
//   - Update the quantity for the item with that id
//   - If the resulting quantity is 0 or less, remove the item
//
// 'CLEAR_CART':
//   - Set items to an empty array
//
// 'OPEN_CART':
//   - Set isOpen to true
//
// 'CLOSE_CART':
//   - Set isOpen to false
//
// 'LOAD_CART': payload = items array
//   - Replace items with the payload (used for loading from localStorage)

export function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      // TODO: implement
    }
    case 'REMOVE_ITEM': {
      // TODO: implement
    }
    case 'UPDATE_QUANTITY': {
      // TODO: implement
    }
    case 'CLEAR_CART': {
      // TODO: implement
    }
    case 'OPEN_CART': {
      // TODO: implement
    }
    case 'CLOSE_CART': {
      // TODO: implement
    }
    case 'LOAD_CART': {
      // TODO: implement
    }
    default:
      return state;
  }
}
```

---

## Step 2: Cart Context and Provider

Create `src/store/CartContext.jsx`:

```jsx
// src/store/CartContext.jsx
import { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { cartReducer, initialCartState } from './cartReducer';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);

  // TODO: Load cart from localStorage on first render
  // Use useEffect with an empty dependency array
  // Parse the stored JSON and dispatch LOAD_CART with the items

  // TODO: Persist cart to localStorage whenever items change
  // Use useEffect with [state.items] as the dependency
  // Serialize to JSON and save under the key 'wbb-cart'

  // TODO: Compute derived values with useMemo
  // - itemCount: total number of items (sum of all quantities)
  // - subtotal: total price in cents (sum of price * quantity for each item)
  // Both should update only when state.items changes
  const itemCount = useMemo(() => {
    // TODO
  }, [state.items]);

  const subtotalCents = useMemo(() => {
    // TODO
  }, [state.items]);

  // Action creators: wrap dispatch calls in named functions
  function addItem(product) {
    dispatch({ type: 'ADD_ITEM', payload: product });
    dispatch({ type: 'OPEN_CART' });  // Open the cart when an item is added
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

  const value = {
    items: state.items,
    isOpen: state.isOpen,
    itemCount,
    subtotalCents,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    openCart: () => dispatch({ type: 'OPEN_CART' }),
    closeCart: () => dispatch({ type: 'CLOSE_CART' }),
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return context;
}
```

---

## Step 3: Components

### Header

```jsx
// src/components/Header.jsx
import { useCart } from '../store/CartContext';

function Header() {
  const { itemCount, openCart } = useCart();

  return (
    <header className="header">
      <div className="header__logo">
        <span>WBB</span>
        <span>Course Marketplace</span>
      </div>
      <button
        className="cart-button"
        onClick={openCart}
        aria-label={`Cart, ${itemCount} item${itemCount !== 1 ? 's' : ''}`}
      >
        {/* TODO: Cart icon (use an emoji or SVG) */}
        {/* TODO: Show badge with itemCount when itemCount > 0 */}
      </button>
    </header>
  );
}

export default Header;
```

### ProductCard

```jsx
// src/components/ProductCard.jsx
import { useCart } from '../store/CartContext';

function ProductCard({ product }) {
  const { items, addItem } = useCart();

  // TODO: Determine if this product is already in the cart
  const isInCart = /* TODO */;

  // TODO: Format the price for display
  // priceCents === 0 should display "Free"
  // Otherwise display "$XX.XX"
  const priceLabel = /* TODO */;

  function handleAddToCart() {
    addItem(product);
  }

  return (
    <div className="product-card">
      <img src={product.thumbnail} alt={product.title} className="product-card__image" />
      <div className="product-card__body">
        <div className="product-card__header">
          <h3 className="product-card__title">{product.title}</h3>
          {/* TODO: Render a Badge with the product.category */}
        </div>
        <p className="product-card__description">{product.description}</p>
        <div className="product-card__meta">
          <span>{product.estimatedHours}h</span>
          <span>{product.instructor}</span>
        </div>
        <div className="product-card__footer">
          <span className="product-card__price">{priceLabel}</span>
          <button
            className="btn btn--primary btn--sm"
            onClick={handleAddToCart}
            disabled={isInCart}
          >
            {isInCart ? 'In Cart' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
```

### ProductCatalog

```jsx
// src/components/ProductCatalog.jsx
import { useState, useMemo } from 'react';
import { PRODUCTS, CATEGORIES } from '../data/products';
import ProductCard from './ProductCard';

function ProductCatalog() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  // TODO: Use useMemo to compute filteredProducts from PRODUCTS and selectedCategory
  // When selectedCategory is 'all', show all products
  const filteredProducts = useMemo(() => {
    // TODO
  }, [selectedCategory]);

  return (
    <main className="catalog">
      <div className="catalog__header">
        <h1>Course Catalog</h1>
        {/* Category filter buttons */}
        <div className="category-filters">
          {CATEGORIES.map(category => (
            <button
              key={category}
              className={`filter-btn ${selectedCategory === category ? 'filter-btn--active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* TODO: Handle empty filtered state */}
      <div className="product-grid">
        {filteredProducts.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </main>
  );
}

export default ProductCatalog;
```

### CartSidebar

```jsx
// src/components/CartSidebar.jsx
import { useCart } from '../store/CartContext';

function CartItem({ item }) {
  const { removeItem, updateQuantity } = useCart();

  // TODO: Format item subtotal (item.priceCents * item.quantity / 100)
  const itemSubtotal = /* TODO */;

  return (
    <div className="cart-item">
      <div className="cart-item__info">
        <h4>{item.title}</h4>
        {item.priceCents === 0 ? (
          <span className="cart-item__price">Free</span>
        ) : (
          <span className="cart-item__price">${(item.priceCents / 100).toFixed(2)} each</span>
        )}
      </div>
      <div className="cart-item__controls">
        {/* TODO: Quantity control -- decrement button, quantity display, increment button */}
        {/* Decrement should call updateQuantity(item.id, item.quantity - 1) */}
        {/* Increment should call updateQuantity(item.id, item.quantity + 1) */}
        <span className="cart-item__subtotal">{itemSubtotal}</span>
        <button
          className="cart-item__remove"
          onClick={() => removeItem(item.id)}
          aria-label={`Remove ${item.title} from cart`}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function CartSidebar() {
  const { items, isOpen, closeCart, subtotalCents, clearCart } = useCart();
  const [checkoutDone, setCheckoutDone] = useState(false);

  function handleCheckout() {
    clearCart();
    setCheckoutDone(true);
    setTimeout(() => setCheckoutDone(false), 3000);
  }

  // TODO: When !isOpen, return null (sidebar is hidden)
  // OR: keep it in the DOM and use a CSS class to slide it in/out

  return (
    <div className={`cart-sidebar ${isOpen ? 'cart-sidebar--open' : ''}`}>
      {/* Overlay behind the sidebar */}
      <div className="cart-sidebar__overlay" onClick={closeCart} />

      <div className="cart-sidebar__panel">
        <div className="cart-sidebar__header">
          <h2>Your Cart</h2>
          <button onClick={closeCart} aria-label="Close cart">&times;</button>
        </div>

        <div className="cart-sidebar__body">
          {checkoutDone && (
            <div className="checkout-success">
              <p>Order placed! Thank you for supporting WBB.</p>
            </div>
          )}

          {/* TODO: Render empty state when items.length === 0 */}
          {/* TODO: Render list of CartItem components for each item */}
        </div>

        {items.length > 0 && (
          <div className="cart-sidebar__footer">
            <div className="cart-total">
              <span>Subtotal</span>
              {/* TODO: Display subtotalCents formatted as dollars */}
              <span>${(subtotalCents / 100).toFixed(2)}</span>
            </div>
            <button className="btn btn--primary btn--full" onClick={handleCheckout}>
              Checkout
            </button>
            <button className="btn btn--ghost btn--full" onClick={clearCart}>
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CartSidebar;
```

### App

```jsx
// src/App.jsx
import { CartProvider } from './store/CartContext';
import Header from './components/Header';
import ProductCatalog from './components/ProductCatalog';
import CartSidebar from './components/CartSidebar';
import './App.css';

function App() {
  return (
    <CartProvider>
      <div className="app">
        <Header />
        <ProductCatalog />
        <CartSidebar />
      </div>
    </CartProvider>
  );
}

export default App;
```

---

## Stretch Goals

**Coupon code**: Add a `coupon` field to the cart state. Handle an `APPLY_COUPON` action that accepts a code and sets a discount percentage (hardcode a few valid codes). Display the discounted total in the cart footer.

**Quantity input**: Replace the increment/decrement buttons on `CartItem` with a number `<input>` that calls `updateQuantity` on `onChange`. Handle the edge case of the user typing a non-numeric value.

**Order summary page**: Instead of just clearing the cart on checkout, navigate to an order summary screen (you can simulate routing by swapping a top-level state variable). Show the items, subtotal, and a "confirmation number" generated from `Date.now()`.

**Product search**: Add a search input to `ProductCatalog`. Use the `useDebounce` custom hook from Lesson 4 to debounce the search query. Filter products by both `selectedCategory` AND `searchQuery` in the same `useMemo`.

---

## Submission Checklist

Before considering this project complete:

- [ ] `cartReducer` handles all 7 action types correctly
- [ ] `CartProvider` loads cart from localStorage on first render (lazy init or `useEffect`)
- [ ] `CartProvider` persists cart to localStorage whenever `items` change
- [ ] `itemCount` and `subtotalCents` are computed with `useMemo`
- [ ] `Header` shows the correct item count badge
- [ ] `ProductCard` shows "In Cart" and disables the button when the product is already in the cart
- [ ] `ProductCatalog` filters by category using `useMemo`
- [ ] `CartSidebar` opens and closes correctly
- [ ] `CartItem` quantity controls work (increment, decrement, removes item at quantity 0)
- [ ] Refreshing the page restores the cart from localStorage
- [ ] The checkout flow clears the cart and shows a success message
- [ ] Free products display "Free" instead of "$0.00" everywhere
- [ ] `useCart` throws a helpful error when used outside `CartProvider`

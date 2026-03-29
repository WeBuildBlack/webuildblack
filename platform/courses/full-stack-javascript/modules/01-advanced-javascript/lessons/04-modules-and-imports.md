---
title: "Modules and Imports"
estimatedMinutes: 35
---

# Modules and Imports

Before ES modules, JavaScript had no native way to split code across files. Developers relied on global variables, IIFE patterns, and eventually CommonJS (the `require()` system Node.js popularized). Today, ES modules (ESM) are the standard -- built into browsers, Node.js, and every modern bundler. Understanding how modules work, and the differences between ESM and CommonJS, is essential for writing maintainable full-stack JavaScript.

This lesson covers named and default exports, import syntax, re-exports, dynamic imports, barrel files, and the module scope model.

---

## Why Modules Exist

The core problem modules solve: as an application grows, global state becomes unmanageable. Functions and variables from one file collide with names in another. Dependencies are implicit. Testing is difficult because you can't isolate units.

Modules solve this by giving each file its own scope. Variables and functions defined in a module are private to that file unless explicitly exported. Other files can only access what has been exported.

```javascript
// Without modules (pre-ES6): everything is global
var API_URL = 'https://api.example.com'; // Anyone can overwrite this
function fetchUser(id) { /* ... */ }     // Anyone can call or shadow this

// With modules: this file's scope is its own
const API_URL = 'https://api.example.com'; // Private to this module
export function fetchUser(id) { /* ... */ } // Only what you export is shared
```

---

## ES Module Syntax

### Named Exports

Named exports let you export multiple values from a single file. Each export has an explicit name, and importers reference it by that name.

```javascript
// utils/math.js
export const PI = 3.14159265358979;

export function add(a, b) {
  return a + b;
}

export function multiply(a, b) {
  return a * b;
}

// You can also export at the bottom in a single statement
// (some teams prefer this -- all exports are visible in one place)
const PI = 3.14159265358979;
function add(a, b) { return a + b; }
function multiply(a, b) { return a * b; }

export { PI, add, multiply };
```

Importing named exports:

```javascript
// Import specific names using destructuring-like syntax
import { add, multiply } from './utils/math.js';

console.log(add(2, 3));      // 5
console.log(multiply(4, 5)); // 20
```

You can rename imports to avoid collisions or for clarity:

```javascript
import { add as sum, multiply as product } from './utils/math.js';

console.log(sum(2, 3));     // 5
console.log(product(4, 5)); // 20
```

Import everything as a namespace object:

```javascript
import * as math from './utils/math.js';

console.log(math.PI);          // 3.14159265358979
console.log(math.add(2, 3));   // 5
```

### Default Exports

A default export represents the primary value a module exports. Each module can have at most one default export.

```javascript
// services/userService.js
export default class UserService {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
  }

  async getUser(id) {
    const res = await fetch(`${this.apiUrl}/users/${id}`);
    return res.json();
  }
}
```

```javascript
// A function as the default export
// utils/formatDate.js
export default function formatDate(date, locale = 'en-US') {
  return new Intl.DateTimeFormat(locale).format(date);
}
```

Importing a default export uses no curly braces, and you can name it anything:

```javascript
import UserService from './services/userService.js';
import formatDate from './utils/formatDate.js';
import DateFormatter from './utils/formatDate.js'; // Same module, different local name

const service = new UserService('https://api.example.com');
```

### Mixing Named and Default Exports

A module can have both a default export and named exports:

```javascript
// utils/validators.js

// Named exports: specific validators
export function isEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

export function isUrl(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

// Default export: the main thing this module provides
export default {
  isEmail,
  isUrl,
  isPhone: (str) => /^\+?[\d\s\-()]{10,}$/.test(str)
};
```

```javascript
// Import the default and a named export in one statement
import validators, { isEmail } from './utils/validators.js';

isEmail('jordan@example.com'); // true (named import)
validators.isUrl('https://example.com'); // true (default import)
```

---

## Re-exports

Re-exports let you pass through exports from another module. This is the mechanism behind barrel files and library entry points.

```javascript
// Re-export everything from another module
export * from './utils/math.js';

// Re-export specific named exports
export { add, multiply } from './utils/math.js';

// Re-export with renaming
export { add as sum } from './utils/math.js';

// Re-export a default as a named export
export { default as MathUtils } from './utils/math.js';
```

---

## Barrel Files

A barrel file is an `index.js` that re-exports from multiple modules in a directory, creating a single clean import point for the outside world.

```
utils/
├── index.js          ← barrel file
├── math.js
├── formatDate.js
├── validators.js
└── string.js
```

```javascript
// utils/index.js -- barrel file
export * from './math.js';
export * from './validators.js';
export { default as formatDate } from './formatDate.js';
export * from './string.js';
```

Now consumers import from the barrel instead of individual files:

```javascript
// Without barrel: multiple import paths, implementation detail exposed
import { add } from './utils/math.js';
import { isEmail } from './utils/validators.js';
import formatDate from './utils/formatDate.js';

// With barrel: single import path, internal structure hidden
import { add, isEmail, formatDate } from './utils';
```

Barrel files are standard in component libraries, utility packages, and any codebase where you want to keep internal organization flexible without breaking consumer import paths.

One caveat: barrel files can slow down build tools and increase bundle sizes if they re-export many things and tree-shaking isn't working properly. In very large codebases, sometimes direct imports are preferable. For most projects though, the ergonomic benefit is worth it.

---

## Module Scope

Every module has its own scope. Top-level variables are not global -- they are private to the module unless exported.

```javascript
// config.js
const SECRET = 'this-is-private'; // Not accessible outside this module

export const PUBLIC_CONFIG = {
  apiUrl: 'https://api.example.com',
  timeout: 5000
};
```

Modules are also singletons. When multiple files import from the same module, they all receive the same module instance. This has an important consequence: shared mutable state in a module is shared across all importers.

```javascript
// store.js
let count = 0; // Shared state

export function increment() { count++; }
export function getCount() { return count; }
```

```javascript
// a.js
import { increment } from './store.js';
increment(); // count is now 1

// b.js
import { getCount } from './store.js';
console.log(getCount()); // 1 -- same instance as a.js modified
```

This singleton behavior is by design. It's how module-level caches, registries, and state containers work.

---

## Dynamic Import

All the imports above are static: they are evaluated at parse time, before any code runs. Dynamic import lets you load a module at runtime, returning a Promise:

```javascript
// Static import: always loaded, even if never used
import heavyChart from './charts/HeavyChartLib.js';

// Dynamic import: only loaded when needed
async function renderChart(data) {
  const { default: HeavyChartLib } = await import('./charts/HeavyChartLib.js');
  return HeavyChartLib.render(data);
}
```

Dynamic import is the mechanism behind:

- **Code splitting**: bundle only what's needed for the current route
- **Lazy loading**: defer loading until a user action triggers it
- **Conditional loading**: load different modules based on environment or feature flags

```javascript
// Load a locale bundle only when needed
async function loadLocale(locale) {
  const messages = await import(`./locales/${locale}.js`);
  return messages.default;
}

// Load an admin module only if the user has the right role
async function initAdmin(user) {
  if (!user.isAdmin) return;
  const { AdminDashboard } = await import('./features/admin/index.js');
  AdminDashboard.init();
}
```

Dynamic imports also work with string expressions, but many bundlers (webpack, Vite) have limitations on how dynamic the expression can be while still performing code splitting at build time.

---

## ESM vs. CommonJS

Node.js originally used CommonJS (`require`/`module.exports`). ESM is now fully supported in Node.js (v12+), but CommonJS still exists widely in older packages and codebases. Knowing both is necessary for full-stack work.

```javascript
// CommonJS (CJS) -- the old Node.js way
const fs = require('fs');
const { join } = require('path');

const utils = require('./utils');
module.exports = { myFunction };
module.exports.namedExport = someValue;
```

```javascript
// ES Modules (ESM) -- the modern standard
import fs from 'fs';
import { join } from 'path';

import utils from './utils.js';
export { myFunction };
export const namedExport = someValue;
```

Key behavioral differences:

| Feature | CommonJS | ESM |
|---|---|---|
| Syntax | `require()` / `module.exports` | `import` / `export` |
| Loading | Synchronous, dynamic | Asynchronous, static |
| `this` at top level | `module.exports` | `undefined` |
| `__dirname` / `__filename` | Available | Not available (use `import.meta.url`) |
| Circular deps | Partial object returned | Live bindings |
| Tree shaking | Not possible | Supported |
| File extension | `.js` (default) | `.mjs` or `.js` with `"type": "module"` |

### Enabling ESM in Node.js

Two ways to tell Node.js to treat your files as ES modules:

```json
// package.json: opt the entire package into ESM
{
  "name": "my-app",
  "type": "module"
}
```

Or use the `.mjs` file extension on individual files. Without either of these, Node.js treats `.js` files as CommonJS.

### `import.meta` in ESM

The `__dirname` and `__filename` globals don't exist in ESM. The equivalent uses `import.meta.url`:

```javascript
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Reconstruct __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataPath = join(__dirname, 'data', 'users.json');
```

---

## Circular Dependencies

Circular dependencies occur when module A imports from module B, which imports from module A. JavaScript handles them -- but the behavior can surprise you.

```javascript
// a.js
import { b } from './b.js';
export const a = 'value from a';
console.log('a sees b as:', b); // May be undefined on first pass

// b.js
import { a } from './a.js';
export const b = 'value from b';
console.log('b sees a as:', a); // May be undefined on first pass
```

ESM uses "live bindings": when the export is eventually set, importers see the updated value. But at the time of initial evaluation, the imported binding may not yet have a value.

The practical advice: avoid circular dependencies. They are almost always a sign that the module structure needs to be reorganized. Common fix: extract the shared code into a third module that both A and B import from, breaking the cycle.

---

## Practical Module Organization

Here's a typical feature-based structure for a full-stack application:

```
src/
├── features/
│   ├── auth/
│   │   ├── index.js          ← barrel: exports AuthService, authMiddleware, etc.
│   │   ├── AuthService.js
│   │   ├── authMiddleware.js
│   │   └── authHelpers.js    ← private, not re-exported from barrel
│   └── users/
│       ├── index.js
│       ├── UserService.js
│       └── userValidators.js
├── utils/
│   ├── index.js              ← barrel for all utilities
│   ├── http.js
│   ├── formatters.js
│   └── validators.js
└── config/
    └── index.js
```

```javascript
// Clean imports using barrel files
import { AuthService, authMiddleware } from './features/auth/index.js';
import { formatCurrency, formatDate } from './utils/index.js';
```

---

## Key Takeaways

- ES modules give each file its own scope -- nothing is global unless exported.
- Named exports are referenced by their exact name; default exports can be imported with any name.
- Each module can have at most one default export, but any number of named exports.
- Re-exports allow modules to forward exports from other modules, enabling barrel files.
- Barrel files (`index.js`) aggregate exports from a directory, simplifying import paths for consumers.
- Modules are singletons: every importer shares the same instance, which enables shared state patterns.
- Dynamic `import()` returns a Promise and enables code splitting and lazy loading.
- ESM (static, async, tree-shakeable) and CommonJS (synchronous, dynamic) coexist in Node.js -- add `"type": "module"` to `package.json` to use ESM throughout.

---

## Try It Yourself

1. Create a small module `utils/string.js` with three named exports: `capitalize`, `slugify`, and `truncate`. Then create a barrel file `utils/index.js` that re-exports all three. Write the code that imports all three using only the barrel file path.

2. Refactor the following CommonJS code to use ES module syntax. Make the main export the default export and the helper functions named exports:

```javascript
// helpers.js (CommonJS)
function formatName(first, last) {
  return `${last}, ${first}`;
}

function formatPhone(digits) {
  return digits.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
}

module.exports = { formatName, formatPhone };
module.exports.default = formatName;
```

3. Write a function `loadPlugin(name)` that uses dynamic import to load a module from `./plugins/${name}.js` and calls the module's default export `init()` function. Handle the case where the plugin doesn't exist by catching the import error and logging a clear message.

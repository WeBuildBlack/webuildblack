---
title: "The Node Module System"
estimatedMinutes: 30
---

# The Node Module System

Every non-trivial Node.js application is made up of multiple files. The module system is what lets those files share code with each other. Node has had two module systems over its lifetime -- CommonJS (the original) and ESM (the modern standard) -- and understanding both is important because you'll encounter each in the wild. This course uses ESM, but you need to recognize CommonJS code so you can read documentation, install packages, and debug errors without confusion.

---

## CommonJS: The Original Module System

CommonJS was built into Node from the beginning. It uses `require()` to load modules and `module.exports` to expose them.

```javascript
// math.js (CommonJS)
function add(a, b) {
  return a + b;
}

function multiply(a, b) {
  return a * b;
}

module.exports = { add, multiply };
```

```javascript
// app.js (CommonJS)
const { add, multiply } = require('./math');
// No file extension needed -- Node assumes .js

console.log(add(2, 3));       // 5
console.log(multiply(4, 5));  // 20

// Requiring a built-in module
const fs = require('fs');
const path = require('path');

// Requiring an installed package
const express = require('express');
```

CommonJS has a few characteristics worth knowing:

- `require()` is synchronous -- it blocks and reads the file before continuing
- Modules are cached after the first `require()`, so the same file will not be executed twice
- `__dirname` and `__filename` are available automatically
- You can `require()` anywhere, including inside functions (though that is usually a code smell)

---

## ESM: The Modern Standard

ECMAScript Modules (ESM) were standardized in ES2015 and are now the recommended way to write JavaScript for both browsers and Node. ESM uses `import` and `export` statements.

```javascript
// math.js (ESM)
export function add(a, b) {
  return a + b;
}

export function multiply(a, b) {
  return a * b;
}

// Named exports let you export multiple things from one file
```

```javascript
// app.js (ESM)
import { add, multiply } from './math.js';
// File extension IS required in ESM

console.log(add(2, 3));
console.log(multiply(4, 5));

// Import everything as a namespace object
import * as math from './math.js';
console.log(math.add(1, 2));
```

ESM also supports default exports -- a single "main" thing a module exposes:

```javascript
// logger.js
export default function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}
```

```javascript
// app.js
import log from './logger.js';
// Default imports can be named anything on the importing side
import myLogger from './logger.js';

log('Server started');
```

A module can have both named and default exports, though keeping to one style per file is usually cleaner.

---

## Enabling ESM in Node.js

Node does not use ESM by default. You have two options to enable it.

**Option 1: Add `"type": "module"` to `package.json`** (what this course uses)

```json
{
  "type": "module"
}
```

With this set, all `.js` files in the project are treated as ESM. This is the cleanest approach for new projects.

**Option 2: Use `.mjs` file extensions**

Rename files to `.mjs` and Node will treat them as ESM regardless of `package.json`. Useful when you need to mix ESM and CommonJS in one project.

### The `__dirname` Problem in ESM

In CommonJS, `__dirname` is injected automatically. In ESM it is not available. Here is the standard workaround you will use throughout this course:

```javascript
import path from 'path';
import { fileURLToPath } from 'url';

// Reconstruct __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Now use __dirname normally
const configPath = path.join(__dirname, 'config.json');
```

`import.meta.url` is a string like `file:///Users/devin/projects/app/src/index.js`. `fileURLToPath` converts it to a regular file path, and `path.dirname` strips the filename.

---

## `package.json` Anatomy

Every Node.js project has a `package.json` file at its root. It is a JSON manifest that describes your project and its dependencies.

```json
{
  "name": "my-api",
  "version": "1.0.0",
  "description": "A REST API for our blog",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "node --test"
  },
  "dependencies": {
    "express": "^4.18.2",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

Breaking this down:

- **`name`**: Package name (lowercase, no spaces, hyphens OK). Required if you publish to npm.
- **`version`**: Semantic version. `1.0.0` = major.minor.patch.
- **`type`**: Set to `"module"` to use ESM throughout the project.
- **`main`**: The entry point when this package is imported by another project.
- **`scripts`**: Shortcuts for terminal commands. `npm run dev` runs the `dev` script.
- **`dependencies`**: Packages required to run the app in production.
- **`devDependencies`**: Packages only needed during development (testing, hot reload, linting).
- **`engines`**: Documents the required Node.js version.

### Version Ranges

The `^` and `~` prefixes in version numbers control what `npm install` accepts:

- `^4.18.2` -- compatible with 4.x.x. Accepts 4.18.3, 4.19.0, but NOT 5.0.0
- `~4.18.2` -- patch updates only. Accepts 4.18.3, but NOT 4.19.0
- `4.18.2` -- exact version. No flexibility.

In practice, `^` is the most common choice. It allows automatic security patches and minor features while protecting you from breaking changes.

---

## npm: Installing and Managing Packages

npm (Node Package Manager) comes bundled with Node. It connects to the npm registry, where over 2 million packages are published.

```bash
# Initialize a new project (creates package.json interactively)
npm init

# Initialize with defaults (no prompts)
npm init -y

# Install a package and add it to dependencies
npm install express

# Install multiple packages at once
npm install express zod

# Install a dev dependency
npm install --save-dev nodemon

# Install a specific version
npm install express@4.18.2

# Install all dependencies listed in package.json
npm install

# Remove a package
npm uninstall express

# Check for outdated packages
npm outdated

# Update packages (respects version ranges in package.json)
npm update
```

After running `npm install express`, three things happen:

1. The `express` package and all its dependencies are downloaded into `node_modules/`
2. `package.json` is updated to add `"express": "^4.18.2"` under `dependencies`
3. `package-lock.json` is created (or updated) with the exact version numbers of everything installed

**Always commit `package.json` and `package-lock.json`.** The lock file ensures everyone on your team (and every deployment environment) installs the exact same dependency versions.

**Never commit `node_modules/`.** It can contain hundreds of megabytes of files. It belongs in `.gitignore`.

---

## npx: Running Packages Without Installing

`npx` runs a package from the npm registry without permanently installing it. It is useful for scaffolding tools you only need once.

```bash
# Create a new project without installing the scaffolding tool globally
npx create-next-app@latest my-app

# Run a locally installed package binary directly
npx nodemon src/index.js

# Check which version of a package npx would use
npx --version some-package
```

When you run `npx some-tool`, npm checks if it is installed locally, then globally, and finally downloads and runs it temporarily. The temporary copy is cached so subsequent runs are fast.

---

## `.gitignore` for Node Projects

Your `.gitignore` file tells Git which files to ignore. For Node projects, at minimum:

```
# Dependencies -- never commit these
node_modules/

# Environment variables -- NEVER commit these
.env
.env.local
.env.*.local

# Build output
dist/
build/

# OS files
.DS_Store
Thumbs.db

# Editor files
.vscode/
.idea/
*.swp
```

The most critical entry is `node_modules/`. If you ever accidentally commit it, run `git rm -r --cached node_modules/` to remove it from Git tracking without deleting the actual files. Then add it to `.gitignore` and commit.

---

## Organizing Your Project with Modules

Good module organization makes code easier to navigate, test, and maintain. Here is a typical structure for an Express API:

```
src/
  index.js            -- Entry point: starts the server
  app.js              -- Express app setup (middleware, routes)
  routes/
    posts.js          -- Route handlers for /api/posts
    comments.js       -- Route handlers for /api/comments
  middleware/
    logger.js         -- Request logging middleware
    errorHandler.js   -- Centralized error handling
  lib/
    db.js             -- Database connection
    validators.js     -- Zod schemas
  utils/
    pagination.js     -- Shared utility functions
```

Each file is a module that exports exactly what other modules need. The entry point imports from `app.js`, which imports from `routes/`, which imports from `middleware/` and `lib/`. Dependencies flow in one direction -- no circular imports.

```javascript
// src/lib/validators.js
import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  authorId: z.string().uuid(),
});

// .partial() makes all fields optional -- useful for PATCH/PUT
export const updatePostSchema = createPostSchema.partial();
```

```javascript
// src/routes/posts.js
import { Router } from 'express';
import { createPostSchema } from '../lib/validators.js';

const router = Router();

router.post('/', (req, res) => {
  const result = createPostSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.flatten() });
  }
  // use result.data safely here
});

export default router;
```

```javascript
// src/app.js
import express from 'express';
import postsRouter from './routes/posts.js';

const app = express();
app.use(express.json());
app.use('/api/posts', postsRouter);

export default app;
```

```javascript
// src/index.js
import app from './app.js';

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

Separating app setup (`app.js`) from server startup (`index.js`) also makes testing easier. Your test suite can import `app` without actually binding to a port.

---

## Key Takeaways

- CommonJS uses `require()` and `module.exports`. ESM uses `import` and `export`. This course uses ESM throughout.
- To enable ESM in Node, add `"type": "module"` to `package.json`. All `.js` files in the project are then treated as ESM.
- In ESM, `__dirname` is not automatically available. Reconstruct it with `path.dirname(fileURLToPath(import.meta.url))`.
- `package.json` is the project manifest. `dependencies` are for production code; `devDependencies` are for tooling only.
- `npm install <package>` downloads to `node_modules/` and updates `package.json`. Always commit `package.json` and `package-lock.json`, never `node_modules/`.
- `npx` runs a package without permanently installing it -- useful for one-time scaffolding tools.
- Keep `node_modules/` and `.env` in `.gitignore`. Both should never be committed to version control.

---

## Try It Yourself

**Exercise 1: Initialize a Project**
Create a new directory called `module-practice`. Run `npm init -y` inside it. Add `"type": "module"` to the generated `package.json`. Create `src/utils/math.js` that exports `add`, `subtract`, `multiply`, and `divide` functions. Create `src/index.js` that imports all four and calls each with test values, logging the results. Run it with `node src/index.js`.

**Exercise 2: Install and Use a Package**
In the same project, install the `chalk` package (`npm install chalk`). Update `src/index.js` to use chalk to colorize your console output (errors in red, success in green). Add a `.gitignore` file with the standard Node.js entries.

**Exercise 3: npm Scripts**
Add three scripts to your `package.json`: `"start"` that runs `node src/index.js`, `"dev"` that runs `nodemon src/index.js` (install nodemon as a dev dependency first), and `"check"` that prints the Node version with `node --version`. Run each with `npm run <script-name>` and confirm each works.

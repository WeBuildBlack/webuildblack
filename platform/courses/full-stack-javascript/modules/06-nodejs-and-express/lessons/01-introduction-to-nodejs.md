---
title: "Introduction to Node.js"
estimatedMinutes: 35
---

# Introduction to Node.js

JavaScript started as a language that only ran inside web browsers. That changed in 2009 when Ryan Dahl released Node.js, a runtime that lets you execute JavaScript on a server or your local machine. Today Node.js powers everything from small command-line tools to the backend systems at Netflix, LinkedIn, and Uber. This lesson covers how Node works, what makes it different from browser JavaScript, and the built-in tools you'll use constantly as a backend developer.

---

## The V8 Engine

Every browser that runs JavaScript needs a JavaScript engine to parse and execute your code. Chrome uses V8, which is an open-source engine written in C++ by Google. V8 compiles JavaScript directly to machine code before executing it, which is why JavaScript performance has improved so dramatically over the past decade.

Node.js is built on top of V8. When you run `node script.js` in your terminal, Node feeds your file to V8, which compiles and runs it. The key difference: there's no browser, no DOM, no `window` object. Instead you get access to the file system, network, operating system APIs, and more.

Think of it this way:

- **Browser JavaScript**: V8 engine + Web APIs (DOM, fetch, localStorage, setTimeout)
- **Node.js**: V8 engine + Node APIs (fs, path, http, os, crypto, streams)

The JavaScript language itself is the same. `const`, `let`, arrow functions, classes, async/await -- all of that works identically. What's different is the environment those APIs live in.

---

## The Node Event Loop

Node.js is single-threaded, which sounds like a limitation but is actually a deliberate design choice. Rather than spawning a new thread for every incoming request (which is expensive), Node uses an **event loop** to handle concurrency.

Here's the basic model:

1. Your code runs synchronously on the main thread
2. When you start an async operation (read a file, make a network request), Node hands it off to the operating system
3. The OS completes the operation and signals Node
4. Node puts the callback on the event queue
5. When the call stack is empty, Node picks the next callback off the queue and runs it

This means Node can handle thousands of simultaneous connections without blocking. A single Node process serving a web API can handle a database query for user A while simultaneously reading a file for user B -- neither operation blocks the other.

The tradeoff: CPU-intensive work (image processing, complex math, encryption of huge files) can starve the event loop because it keeps the main thread busy. For that kind of work, Node provides worker threads, but that's an advanced topic. For most web APIs, the event loop model is excellent.

---

## Global Objects in Node.js

In the browser, the global object is `window`. In Node, it's `global` (or `globalThis` in modern code, which works in both environments). A few globals you'll use constantly:

```javascript
// __dirname: absolute path to the directory containing the current file
// (only available in CommonJS -- more on this in the next lesson)
console.log(__dirname); // /Users/you/projects/my-app/src

// __filename: absolute path to the current file
console.log(__filename); // /Users/you/projects/my-app/src/index.js

// process: information about the running Node process
console.log(process.version);   // v20.11.0
console.log(process.platform);  // darwin, linux, win32
console.log(process.cwd());     // current working directory
console.log(process.env.HOME);  // access environment variables

// process.argv: command-line arguments
// node script.js hello world
console.log(process.argv);
// ['node', '/path/to/script.js', 'hello', 'world']
// argv[0] is always 'node', argv[1] is the script path
// your actual arguments start at argv[2]

// process.exit: terminate the process
process.exit(0);  // 0 = success
process.exit(1);  // non-zero = error
```

The `process` object is extraordinarily useful. You'll use `process.env` constantly to read environment variables like database URLs and API keys.

---

## Built-in Modules

Node ships with a standard library of built-in modules. You don't install these -- they come with Node. Here are the ones you'll reach for most often.

### `path` -- File Path Utilities

Working with file paths is trickier than it looks. Paths use `/` on Mac/Linux and `\` on Windows. The `path` module handles this for you.

```javascript
import path from 'path';

// Join path segments safely (handles OS differences)
const filePath = path.join('/users', 'devin', 'projects', 'app.js');
// '/users/devin/projects/app.js'

// Get the directory name from a full path
path.dirname('/users/devin/projects/app.js'); // '/users/devin/projects'

// Get just the filename
path.basename('/users/devin/projects/app.js'); // 'app.js'

// Get just the extension
path.extname('/users/devin/projects/app.js'); // '.js'

// Build an absolute path from the current file's location
// In ESM modules, use import.meta.url instead of __dirname
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '..', 'config', 'settings.json');
```

Always use `path.join()` to build file paths. Concatenating strings like `'/dir' + '/' + 'file'` breaks when path segments have extra slashes or when the code runs on Windows.

### `os` -- Operating System Info

```javascript
import os from 'os';

console.log(os.platform());   // 'darwin', 'linux', 'win32'
console.log(os.arch());       // 'x64', 'arm64'
console.log(os.cpus().length); // number of CPU cores
console.log(os.totalmem());   // total RAM in bytes
console.log(os.freemem());    // free RAM in bytes
console.log(os.homedir());    // '/Users/devin'
console.log(os.hostname());   // 'devins-macbook-pro'

// Convert bytes to gigabytes
const totalGB = (os.totalmem() / 1024 ** 3).toFixed(2);
console.log(`Total RAM: ${totalGB} GB`);
```

You'll use `os` less often than `path` or `fs`, but it's handy for writing scripts that need to behave differently based on the system they're running on.

### `fs/promises` -- File System

This is where Node gets genuinely powerful. You can read, write, copy, move, and delete files and directories -- all from JavaScript.

```javascript
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Reading a file as a string
async function readConfig() {
  const configPath = path.join(__dirname, 'config.json');

  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(raw);
    console.log('Loaded config:', config);
    return config;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('Config file not found');
    } else {
      console.error('Failed to read config:', error.message);
    }
    throw error;
  }
}

// Writing a file (creates it if it doesn't exist, overwrites if it does)
async function saveData(data) {
  const outputPath = path.join(__dirname, 'output.json');
  const content = JSON.stringify(data, null, 2); // null, 2 = pretty print
  await fs.writeFile(outputPath, content, 'utf-8');
  console.log('Saved to', outputPath);
}

// Appending to a file (doesn't overwrite)
async function logEvent(message) {
  const logPath = path.join(__dirname, 'events.log');
  const line = `${new Date().toISOString()} -- ${message}\n`;
  await fs.appendFile(logPath, line, 'utf-8');
}

// Reading all files in a directory
async function listFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile()) {
      console.log('File:', entry.name);
    } else if (entry.isDirectory()) {
      console.log('Dir: ', entry.name);
    }
  }
}

// Checking if a file exists (without throwing)
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Creating a directory (mkdir -p equivalent)
async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
  // recursive: true means it won't throw if the directory already exists
}
```

Notice the import: `import fs from 'fs/promises'`. Node has an older callback-based `fs` module and a newer promise-based version. Always use `fs/promises` -- it works with async/await cleanly.

---

## The `process` Object in Depth

You already saw `process.env` and `process.argv`. Here are a few more uses that come up regularly:

```javascript
// Reading environment variables with a fallback
const port = process.env.PORT || 3000;
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1); // Exit with error code
}

// Parsing command-line arguments manually
// node script.js --name=devin --dry-run
const args = process.argv.slice(2); // Remove 'node' and script path

const flags = {};
for (const arg of args) {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    flags[key] = value !== undefined ? value : true;
  }
}

console.log(flags); // { name: 'devin', 'dry-run': true }

// Handling process signals (for graceful shutdown)
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  // Close database connections, finish in-flight requests, etc.
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  process.exit(1);
});
```

Setting up `uncaughtException` and `unhandledRejection` handlers is important in production Node applications. Without them, a crashed promise can silently fail and leave your application in a broken state.

---

## A Practical Example: A File Processing Script

Let's tie everything together with a real script. This one reads a JSON file, transforms the data, and writes the result to a new file.

```javascript
// process-data.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  // Read the command-line argument: node process-data.js input.json
  const inputFile = process.argv[2];

  if (!inputFile) {
    console.error('Usage: node process-data.js <input-file>');
    process.exit(1);
  }

  const inputPath = path.resolve(inputFile); // resolve to absolute path
  const outputPath = path.join(
    path.dirname(inputPath),
    `processed-${path.basename(inputPath)}`
  );

  console.log(`Reading: ${inputPath}`);

  // Read and parse the input
  const raw = await fs.readFile(inputPath, 'utf-8');
  const data = JSON.parse(raw);

  // Transform: add a processedAt timestamp to each record
  const processed = data.map((record) => ({
    ...record,
    processedAt: new Date().toISOString(),
  }));

  // Write the output
  await fs.writeFile(outputPath, JSON.stringify(processed, null, 2), 'utf-8');

  console.log(`Wrote ${processed.length} records to: ${outputPath}`);
}

// Run and handle errors
main().catch((error) => {
  console.error('Script failed:', error.message);
  process.exit(1);
});
```

This pattern -- an `async main()` function called at the bottom with a `.catch()` handler -- is a clean, standard way to structure Node scripts. You'll see it throughout this course.

---

## Key Takeaways

- Node.js is the V8 JavaScript engine plus Node-specific APIs, running outside the browser. The language is the same JavaScript you already know.
- The event loop lets Node handle thousands of concurrent operations without threads, by delegating I/O to the OS and running callbacks when results are ready.
- The `process` object gives you access to environment variables (`process.env`), command-line arguments (`process.argv`), and control over the running process (`process.exit`).
- `path` provides OS-safe path manipulation. Always use `path.join()` instead of string concatenation for file paths.
- `fs/promises` gives you async file system operations that work cleanly with async/await. Always import from `'fs/promises'`, not `'fs'`.
- In ESM modules (which this course uses), `__dirname` is not available by default. Reconstruct it with `path.dirname(fileURLToPath(import.meta.url))`.
- Structure scripts as `async function main() { ... }` called with `.catch()` to handle top-level errors cleanly.

---

## Try It Yourself

**Exercise 1: System Info Script**
Create a file called `system-info.js`. Use the `os` module to print the platform, number of CPUs, total RAM in GB, and the home directory. Run it with `node system-info.js`.

**Exercise 2: File Stats**
Write a script that accepts a file path as a command-line argument (`process.argv[2]`). Use `fs/promises` to read the file and print: the number of lines, the number of words, and the number of characters. If the file doesn't exist, print a helpful error message and exit with code 1.

**Exercise 3: Directory Tree**
Write a script that takes a directory path as an argument and prints all files and subdirectories in it, with files indented under their parent directory. Use `fs.readdir` with `{ withFileTypes: true }` to distinguish files from directories.

---
title: "The Event Loop"
estimatedMinutes: 35
---

# The Event Loop

JavaScript runs in a single thread. That means it can only do one thing at a time -- yet somehow it handles button clicks, network requests, timers, and file reads without freezing the page. Understanding how that works is not just academic: it changes how you write code, how you debug timing issues, and how you reason about what executes when.

The mechanism behind all of this is the event loop. Once you see how it works, a whole category of confusing bugs you've hit will suddenly make sense.

---

## The Call Stack

Every time your program calls a function, that function gets pushed onto the **call stack**. When the function returns, it gets popped off. The call stack is how JavaScript keeps track of what it's currently doing and where to return when it's done.

```javascript
function greet(name) {
  // This frame sits on top of main() while greet() runs
  return `Hello, ${name}`;
}

function main() {
  // main() is pushed onto the stack first
  const message = greet("Aaliyah"); // greet() is pushed on top
  console.log(message);             // greet() has returned by now
}

main();
```

Visually, the stack looks like this while `greet()` is executing:

```
┌──────────────────────────┐
│   greet("Aaliyah")       │  <-- top (currently executing)
├──────────────────────────┤
│   main()                 │
├──────────────────────────┤
│   (global scope)         │  <-- bottom
└──────────────────────────┘
```

When `greet` returns, it's popped off and `main` resumes. When `main` returns, it's popped off too. The stack is empty. The script has finished its synchronous work.

The call stack has a finite size. Call functions recursively without a base case and you'll eventually see "Maximum call stack size exceeded." That's a stack overflow.

---

## The Problem: Blocking

If the call stack can only do one thing at a time, what happens when you need to wait for something slow? A network request might take 500ms. Reading a large file might take 200ms. If JavaScript sat there waiting, nothing else could happen -- no clicks, no animations, no other code.

This is called **blocking**, and it's what the event loop exists to prevent.

The key insight: JavaScript doesn't wait. It offloads slow work to the environment (the browser or Node.js), keeps executing other code, and comes back to handle the result when it's ready.

---

## Web APIs and Node APIs

When you call `setTimeout`, `fetch`, `fs.readFile`, or `addEventListener`, you are not calling pure JavaScript. You are calling an API provided by the runtime environment.

In the browser, these are **Web APIs**: `setTimeout`, `fetch`, `XMLHttpRequest`, DOM events, `requestAnimationFrame`.

In Node.js, these are built-in modules backed by the **libuv** library: `fs`, `http`, `crypto`, `timers`.

These APIs run outside the JavaScript thread. They do their work (waiting for time, making a network request, reading a file) in the background. When they finish, they need a way to hand results back to JavaScript. That's where the queues come in.

---

## The Two Queues

There are two queues that hold work waiting to run.

### The Task Queue (Macro-task Queue)

Also called the callback queue or message queue. Callbacks from `setTimeout`, `setInterval`, I/O operations, and UI events land here when they're ready to run.

```javascript
setTimeout(() => {
  console.log("I came from the task queue");
}, 0);
```

Even with a delay of `0`, this callback does not run immediately. It gets placed in the task queue and waits for the call stack to be empty.

### The Microtask Queue

This queue holds callbacks from **Promises** and `queueMicrotask()`. It has higher priority than the task queue.

After every task (including the initial script execution), the JavaScript engine drains the **entire** microtask queue before picking the next task from the task queue. Every pending microtask runs before the next macro-task starts.

```javascript
Promise.resolve().then(() => {
  console.log("microtask queue");
});

setTimeout(() => {
  console.log("task queue");
}, 0);
```

Output:
```
microtask queue
task queue
```

Both are scheduled "immediately," but the Promise callback always runs first.

---

## The Event Loop: Putting It Together

Here is how the event loop works, step by step:

```
┌─────────────────────────────────────────────┐
│               Call Stack                    │
│   Currently executing JavaScript            │
└────────────────────┬────────────────────────┘
                     │ (stack empties)
                     ▼
┌─────────────────────────────────────────────┐
│            Microtask Queue                  │
│   Promise .then/.catch, queueMicrotask()    │
│   Drains COMPLETELY before moving on        │
└────────────────────┬────────────────────────┘
                     │ (microtask queue empties)
                     ▼
┌─────────────────────────────────────────────┐
│    Render (browser only, if needed)         │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│              Task Queue                     │
│   setTimeout, setInterval, I/O, UI events  │
│   ONE task is picked up per loop iteration  │
└────────────────────┬────────────────────────┘
                     │
                     └──────────────► (loop repeats)
```

The algorithm, simplified:

1. Execute the current task (the initial script is the first task).
2. Drain the entire microtask queue.
3. Render the page if needed (browser).
4. Pick the next task from the task queue and execute it.
5. Drain the entire microtask queue again.
6. Repeat.

---

## Execution Order Puzzles

Work through these examples. Write down your predicted output before reading the answer. That process is the fastest way to internalize the event loop.

**Puzzle 1: Basic ordering**

```javascript
console.log("A");

setTimeout(() => console.log("B"), 0);

console.log("C");
```

Output: `A`, `C`, `B`

`A` and `C` are synchronous -- they run as part of the current task. `B` is scheduled into the task queue and runs after the current script finishes.

**Puzzle 2: Microtasks beat tasks**

```javascript
console.log("start");

setTimeout(() => console.log("timeout"), 0);

Promise.resolve().then(() => console.log("promise"));

console.log("end");
```

Output: `start`, `end`, `promise`, `timeout`

Synchronous code runs first. Then microtasks drain. Then the task queue fires.

**Puzzle 3: Chained microtasks**

```javascript
Promise.resolve()
  .then(() => {
    console.log("promise 1");
    return Promise.resolve("chained");
  })
  .then((val) => {
    console.log("promise 2:", val);
  });

setTimeout(() => console.log("timeout"), 0);
```

Output: `promise 1`, `promise 2: chained`, `timeout`

Both promise callbacks run before the timeout because the microtask queue drains completely before the task queue is checked.

**Puzzle 4: Microtask scheduled from inside a task**

```javascript
setTimeout(() => {
  console.log("timeout 1");
  Promise.resolve().then(() => console.log("promise inside timeout"));
}, 0);

setTimeout(() => {
  console.log("timeout 2");
}, 0);
```

Output: `timeout 1`, `promise inside timeout`, `timeout 2`

After `timeout 1` runs, the engine drains microtasks (finds the promise callback) before picking up `timeout 2` from the task queue.

---

## `setTimeout(fn, 0)` Behavior

`setTimeout(fn, 0)` means: schedule this callback to run after the current synchronous code and all pending microtasks finish. It does not mean "run right now."

This is useful when you need to:

- Let the browser render a DOM change before running more code
- Break up a long synchronous task to keep the UI responsive
- Ensure a callback runs after other synchronously registered handlers

```javascript
function updateAndMeasure(element, text) {
  element.textContent = text;

  // The layout hasn't been recalculated yet at this line.
  // Defer the measurement until after the browser gets a chance to render.
  setTimeout(() => {
    console.log("Height after update:", element.offsetHeight);
  }, 0);
}
```

Two important caveats:

- The `0` is a **minimum delay**, not a guarantee. If the call stack is busy, the callback waits.
- Browsers enforce a minimum timer delay of ~4ms for nested timers (to prevent timer-based spinning).

---

## `requestAnimationFrame` (Browser)

`requestAnimationFrame` is a Web API that schedules a callback to run just before the browser paints the next frame -- typically around 60 times per second (every ~16ms).

Use it for animations, not for general deferred work.

```javascript
function animate(timestamp) {
  // timestamp is a DOMHighResTimeStamp (milliseconds since page load)
  const progress = (timestamp % 2000) / 2000; // cycles 0 to 1 over 2 seconds
  box.style.opacity = String(progress);

  // Schedule the next frame to keep the animation running
  requestAnimationFrame(animate);
}

// Kick off the animation loop
requestAnimationFrame(animate);
```

Using `setTimeout` for animations causes jitter because it is not synchronized to the display refresh rate. `requestAnimationFrame` callbacks are batched with the browser's rendering pipeline, making them the correct choice for any visual update.

---

## Starving the Event Loop

Because microtasks drain before the next task, a microtask that schedules another microtask can theoretically prevent the task queue from ever running.

```javascript
function infiniteMicrotasks() {
  // Each call schedules another microtask, which schedules another...
  Promise.resolve().then(infiniteMicrotasks);
}

infiniteMicrotasks();

// This never runs -- the microtask queue never empties
setTimeout(() => console.log("task queue"), 0);
```

This is rare in real code but good to know about. Long-running synchronous code has the same freezing effect -- it blocks the call stack from ever being empty, so neither the microtask queue nor the task queue can run.

```javascript
// This freezes the browser for ~5 seconds
const start = Date.now();
while (Date.now() - start < 5000) {
  // busy-wait -- never do this in real code
}
```

For CPU-intensive work in the browser, use **Web Workers** to run the computation in a separate thread without blocking the event loop.

---

## Key Takeaways

- JavaScript is single-threaded: the call stack executes one function at a time.
- Slow operations (network, timers, I/O) are handled by Web APIs or Node APIs running outside the JS thread.
- The **microtask queue** (Promises, `queueMicrotask`) has priority over the **task queue** (setTimeout, I/O, UI events).
- The event loop: run a task, drain all microtasks, render (browser), pick the next task -- then repeat.
- `setTimeout(fn, 0)` means "run after current synchronous code and all pending microtasks," not "run immediately."
- Synchronous code that runs too long blocks the event loop and freezes the page.
- Use `requestAnimationFrame` for browser animations instead of `setTimeout`.

---

## Try It Yourself

1. Without running the code first, write down the expected output of this snippet. Then run it and check your prediction:

   ```javascript
   console.log(1);
   setTimeout(() => console.log(2), 0);
   Promise.resolve().then(() => console.log(3));
   setTimeout(() => console.log(4), 0);
   Promise.resolve().then(() => {
     console.log(5);
     Promise.resolve().then(() => console.log(6));
   });
   console.log(7);
   ```

2. Write a function `deferToNextTask(fn)` that takes any function and schedules it to run in the next task (after all pending microtasks). Use `setTimeout` with a delay of `0`. Test it by calling it alongside `Promise.resolve().then(...)` to verify the ordering.

3. Open your browser's console and run the blocking loop below. Observe that it freezes the page. Then rewrite it to process the array in batches of 10,000 items using `setTimeout(fn, 0)` between batches, so the browser stays responsive:

   ```javascript
   const bigArray = Array.from({ length: 5_000_000 }, (_, i) => i);
   let sum = 0;
   for (const num of bigArray) {
     sum += num;
   }
   console.log("Sum:", sum);
   ```

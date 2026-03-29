---
title: "Module Project: Utility Library"
estimatedMinutes: 75
---

# Module Project: Utility Library

You're going to build a mini utility library -- a stripped-down version of what libraries like Lodash and Ramda provide. This project ties together everything from Module 01: destructuring, spread, rest parameters, arrow functions, template literals, modules, and iterators/generators.

By the end, you'll have a library of 9 reusable, well-tested utility functions that you can actually import and use in future projects throughout this course.

---

## What You're Building

A module at `lib/utils.js` that exports the following functions:

| Function | Description |
|---|---|
| `chunk(arr, size)` | Split an array into chunks of a given size |
| `deepClone(value)` | Recursively clone any value (no shared references) |
| `debounce(fn, ms)` | Delay function execution until after a pause in calls |
| `groupBy(arr, key)` | Group array items by a property value or key function |
| `pipe(...fns)` | Compose functions left-to-right |
| `flatten(arr, depth)` | Flatten a nested array to a given depth |
| `throttle(fn, ms)` | Limit how often a function can be called |
| `memoize(fn)` | Cache function results by arguments |
| `range(start, end, step)` | Generate a sequence of numbers (as a generator) |

---

## Project Setup

Your file structure should look like this:

```
utils-library/
├── lib/
│   └── utils.js        <- Your implementation goes here
├── tests/
│   └── utils.test.js   <- Manual tests (run with Node.js)
└── demo.js             <- Demo script showing your library in action
```

Create the three files. Start with `lib/utils.js` -- that's where all your work happens.

---

## Starter Code

Copy this into `lib/utils.js` and implement each function by replacing the `TODO` comments:

```javascript
// lib/utils.js
// WBB Utility Library -- Module 01 Project

/**
 * chunk(arr, size)
 * Split an array into consecutive chunks of the given size.
 * The last chunk may be smaller if the array doesn't divide evenly.
 *
 * chunk([1, 2, 3, 4, 5], 2) => [[1, 2], [3, 4], [5]]
 * chunk(['a', 'b', 'c', 'd'], 3) => [['a', 'b', 'c'], ['d']]
 */
export function chunk(arr, size) {
  // TODO: Validate that size is a positive integer
  // TODO: Use a loop to slice the array into chunks of 'size'
  // Hint: a while loop that increments an index by 'size' each iteration works well
  // Hint: use arr.slice(i, i + size) -- do not mutate the original array
  // Hint: push each slice into a result array, return the result
}


/**
 * deepClone(value)
 * Recursively clone a value so no nested object or array shares
 * a reference with the original.
 *
 * Handles: primitives, arrays, plain objects, Dates, null
 * Does NOT need to handle: functions, class instances, circular references
 *
 * const original = { a: 1, b: { c: [2, 3] } };
 * const copy = deepClone(original);
 * copy.b.c.push(4);
 * original.b.c // => [2, 3] -- unchanged
 */
export function deepClone(value) {
  // TODO: Return primitives (string, number, boolean, null, undefined) as-is
  // TODO: Handle Date objects: return new Date(value)
  // TODO: Handle arrays: return value.map(item => deepClone(item))
  // TODO: Handle plain objects: use Object.keys() to iterate, clone each value
  //   Build a new object: { [key]: deepClone(value[key]) } for each key
  // Hint: check Array.isArray() before checking typeof === 'object'
  //   because arrays are objects too
}


/**
 * debounce(fn, ms)
 * Return a debounced version of fn that delays invoking fn until after
 * 'ms' milliseconds have elapsed since the last call.
 *
 * Useful for search-as-you-type: wait until the user pauses before fetching.
 *
 * const search = debounce((query) => fetchResults(query), 300);
 * search('j');    // Timer starts
 * search('jo');   // Timer resets
 * search('jor');  // Timer resets
 * // 300ms later: fetchResults('jor') is called exactly once
 */
export function debounce(fn, ms) {
  // TODO: Declare a variable to hold the timeout ID (initialize to null)
  // TODO: Return a new function using rest parameters (...args) that:
  //   1. Calls clearTimeout on the existing timeout ID
  //   2. Sets a new timeout: after 'ms' ms, call fn(...args)
  //   3. Stores the new timeout ID in your variable
  // Hint: the returned function should be a regular function (not arrow)
  //   if you need to preserve 'this' -- or arrow is fine for most use cases
}


/**
 * groupBy(arr, keyOrFn)
 * Group array elements by the result of a key function or property name.
 * Returns an object where each key maps to an array of matching elements.
 *
 * groupBy([
 *   { name: 'Alex', role: 'dev' },
 *   { name: 'Sam', role: 'design' },
 *   { name: 'Jordan', role: 'dev' }
 * ], 'role')
 * => { dev: [{...Alex}, {...Jordan}], design: [{...Sam}] }
 *
 * groupBy([1.3, 2.1, 2.4], Math.floor)
 * => { 1: [1.3], 2: [2.1, 2.4] }
 */
export function groupBy(arr, keyOrFn) {
  // TODO: Determine the key function:
  //   - If keyOrFn is a string, create a function: item => item[keyOrFn]
  //   - If keyOrFn is already a function, use it directly
  // TODO: Use arr.reduce() to build the result object:
  //   - Compute the key for each item using your key function
  //   - If result[key] doesn't exist yet, initialize it to []
  //   - Push the current item into result[key]
  //   - Return the accumulator (result object) each iteration
}


/**
 * pipe(...fns)
 * Return a function that runs the input value through each function
 * in order, left-to-right, passing each output as the next input.
 *
 * const transform = pipe(
 *   x => x * 2,      // 5 => 10
 *   x => x + 1,      // 10 => 11
 *   x => x.toString() // 11 => '11'
 * );
 * transform(5) => '11'
 */
export function pipe(...fns) {
  // TODO: Return a function that takes an initial value
  // TODO: Use fns.reduce() to pass the value through each function:
  //   The accumulator starts as the initial value
  //   Each step: acc = fn(acc)
  // Hint: (value) => fns.reduce((acc, fn) => fn(acc), value)
}


/**
 * flatten(arr, depth = 1)
 * Flatten a nested array to the specified depth.
 * depth = 1 flattens one level; depth = Infinity flattens completely.
 * Do not use Array.prototype.flat() -- implement it yourself.
 *
 * flatten([1, [2, [3, [4]]]]) => [1, 2, [3, [4]]]          (depth 1)
 * flatten([1, [2, [3, [4]]]], 2) => [1, 2, 3, [4]]         (depth 2)
 * flatten([1, [2, [3, [4]]]], Infinity) => [1, 2, 3, 4]    (full)
 */
export function flatten(arr, depth = 1) {
  // TODO: Use arr.reduce() to build a flat array
  // For each item:
  //   - If the item is an array AND depth > 0:
  //       spread flatten(item, depth - 1) into the accumulator
  //   - Otherwise: push the item directly
  // Hint: [...acc, ...flatten(item, depth - 1)] or acc.concat(flatten(...))
}


/**
 * throttle(fn, ms)
 * Return a throttled version of fn that can only fire at most once
 * per 'ms' milliseconds. Calls during the cooldown period are ignored.
 *
 * Useful for scroll/resize handlers that fire many times per second.
 *
 * const onScroll = throttle(() => updateParallax(), 100);
 * window.addEventListener('scroll', onScroll);
 * // updateParallax() fires at most 10 times per second regardless of scroll speed
 */
export function throttle(fn, ms) {
  // TODO: Declare a boolean variable 'inCooldown' (initialize to false)
  // TODO: Return a function that:
  //   1. If inCooldown is true, return immediately (do nothing)
  //   2. Otherwise:
  //      - Call fn with the current arguments (use ...args rest + spread)
  //      - Set inCooldown to true
  //      - Set a timeout for 'ms' ms that sets inCooldown back to false
}


/**
 * memoize(fn)
 * Return a memoized version of fn that caches results by arguments.
 * Subsequent calls with the same arguments return the cached result
 * without invoking fn again.
 *
 * const slow = memoize(n => { console.log('computing'); return n * n; });
 * slow(4) => logs 'computing', returns 16
 * slow(4) => returns 16 -- no log, returned from cache
 * slow(5) => logs 'computing', returns 25
 *
 * Note: uses JSON.stringify for the cache key.
 * Works correctly for JSON-serializable arguments.
 */
export function memoize(fn) {
  // TODO: Create a Map to store { cacheKey => result } pairs
  // TODO: Return a function using ...args rest parameters that:
  //   1. Computes a cache key: JSON.stringify(args)
  //   2. If the Map has an entry for this key, return it
  //   3. Otherwise: call fn(...args), store result in Map, return result
}


/**
 * range(start, end, step = 1)
 * Generator function that yields numbers from start to end (inclusive).
 * Supports both ascending (positive step) and descending (negative step).
 *
 * [...range(1, 5)]        => [1, 2, 3, 4, 5]
 * [...range(0, 10, 2)]    => [0, 2, 4, 6, 8, 10]
 * [...range(5, 1, -1)]    => [5, 4, 3, 2, 1]
 */
export function* range(start, end, step = 1) {
  // TODO: Handle ascending ranges: step > 0, yield while current <= end
  // TODO: Handle descending ranges: step < 0, yield while current >= end
  // Hint: use a for loop or while loop with 'let current = start'
  //   and 'current += step' each iteration
  // Hint: for descending ranges you may need to infer a negative step
  //   or trust that the caller passes a negative step
}
```

---

## Tests

Copy this into `tests/utils.test.js`. Run it with `node tests/utils.test.js`:

```javascript
// tests/utils.test.js
import {
  chunk, deepClone, debounce, groupBy,
  pipe, flatten, throttle, memoize, range
} from '../lib/utils.js';

let passed = 0;
let failed = 0;

function assert(description, actual, expected) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    console.log(`  PASS: ${description}`);
    passed++;
  } else {
    console.log(`  FAIL: ${description}`);
    console.log(`    Expected: ${expectedStr}`);
    console.log(`    Actual:   ${actualStr}`);
    failed++;
  }
}

function assertNotSameRef(description, a, b) {
  if (a !== b) {
    console.log(`  PASS: ${description}`);
    passed++;
  } else {
    console.log(`  FAIL: ${description} -- values should not be the same reference`);
    failed++;
  }
}

// ---- chunk ----
console.log('\nchunk:');
assert('splits evenly', chunk([1, 2, 3, 4], 2), [[1, 2], [3, 4]]);
assert('last chunk is smaller', chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
assert('chunk size larger than array', chunk([1, 2], 5), [[1, 2]]);
assert('chunk size of 1', chunk([1, 2, 3], 1), [[1], [2], [3]]);
assert('does not mutate original', (() => {
  const arr = [1, 2, 3, 4];
  chunk(arr, 2);
  return arr;
})(), [1, 2, 3, 4]);

// ---- deepClone ----
console.log('\ndeepClone:');
const original = { a: 1, b: { c: [2, 3] } };
const clone = deepClone(original);
clone.b.c.push(4);
assert('does not mutate nested array in original', original.b.c, [2, 3]);
assertNotSameRef('nested object is a new reference', original.b, clone.b);
assertNotSameRef('nested array is a new reference', original.b.c, clone.b.c);
assert('clones a Date object', deepClone(new Date('2026-01-01')).toISOString(),
  new Date('2026-01-01').toISOString());
assert('handles primitive: number', deepClone(42), 42);
assert('handles primitive: null', deepClone(null), null);
assert('handles primitive: string', deepClone('hello'), 'hello');

// ---- groupBy ----
console.log('\ngroupBy:');
const people = [
  { name: 'Alex', role: 'dev' },
  { name: 'Sam', role: 'design' },
  { name: 'Jordan', role: 'dev' }
];
const byRole = groupBy(people, 'role');
assert('correct group keys', Object.keys(byRole).sort(), ['design', 'dev']);
assert('dev group has 2 members', byRole.dev.length, 2);
assert('design group has 1 member', byRole.design.length, 1);
assert('groups by function', groupBy([1.3, 2.1, 2.4], Math.floor),
  { '1': [1.3], '2': [2.1, 2.4] });

// ---- pipe ----
console.log('\npipe:');
const transform = pipe(
  x => x * 2,
  x => x + 1,
  x => x.toString()
);
assert('pipes functions left to right', transform(5), '11');
assert('single-function pipe works', pipe(x => x + 10)(5), 15);
assert('identity pipe (no functions)', pipe()(42), 42);

// ---- flatten ----
console.log('\nflatten:');
assert('flattens one level by default', flatten([1, [2, [3]]]), [1, 2, [3]]);
assert('flattens to depth 2', flatten([1, [2, [3, [4]]]], 2), [1, 2, 3, [4]]);
assert('flattens to Infinity', flatten([1, [2, [3, [4]]]], Infinity), [1, 2, 3, 4]);
assert('already flat array is unchanged', flatten([1, 2, 3]), [1, 2, 3]);
assert('empty array', flatten([]), []);

// ---- memoize ----
console.log('\nmemoize:');
let callCount = 0;
const square = memoize(n => { callCount++; return n * n; });
square(4);
square(4); // Should use cache
square(5); // New arg, should call fn
assert('fn called only once per unique argument set', callCount, 2);
assert('returns correct result for cached call', square(4), 16);
assert('returns correct result for new call', square(5), 25);
assert('works with multiple args', memoize((a, b) => a + b)(3, 4), 7);

// ---- range ----
console.log('\nrange:');
assert('ascending range', [...range(1, 5)], [1, 2, 3, 4, 5]);
assert('range with step', [...range(0, 10, 2)], [0, 2, 4, 6, 8, 10]);
assert('descending range', [...range(5, 1, -1)], [5, 4, 3, 2, 1]);
assert('single value range', [...range(3, 3)], [3]);
assert('range is lazy -- can take first N values', (() => {
  const result = [];
  for (const n of range(1, 1000000)) {
    result.push(n);
    if (result.length === 3) break;
  }
  return result;
})(), [1, 2, 3]);

// ---- summary ----
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
```

---

## Demo Script

Once your tests pass, fill in `demo.js` to show your library working end-to-end with realistic data:

```javascript
// demo.js
// Showcase the utility library with a course enrollment scenario

import {
  chunk, deepClone, groupBy, pipe, flatten, memoize, range
} from './lib/utils.js';

// Sample data: course enrollments
const enrollments = [
  { student: 'Alex',   course: 'web-dev',        module: 2, score: 88 },
  { student: 'Sam',    course: 'ai-engineering',  module: 1, score: 92 },
  { student: 'Jordan', course: 'web-dev',         module: 3, score: 75 },
  { student: 'Morgan', course: 'web-dev',         module: 2, score: 95 },
  { student: 'Riley',  course: 'ai-engineering',  module: 2, score: 71 },
  { student: 'Casey',  course: 'web-dev',         module: 1, score: 83 },
];

console.log('=== WBB Course Enrollment Analytics ===\n');

// TODO 1: Use groupBy to group enrollments by course.
// Print how many students are in each course.
const byCourse = groupBy(enrollments, 'course');
// console.log('Courses:', ...);

// TODO 2: Use pipe to build a score-to-grade transformer:
//   - Round the score to the nearest integer
//   - Convert to a letter grade (90+ = 'A', 80+ = 'B', 70+ = 'C', else = 'D')
//   - Return a formatted string like "88 (B)"
const formatScore = pipe(
  // TODO: add your transformation functions here
);
// console.log('Formatted scores:', enrollments.map(e => formatScore(e.score)));

// TODO 3: Use deepClone to create a working copy of enrollments.
// Modify a score in the copy and verify the original is unchanged.
const workingCopy = deepClone(enrollments);
// workingCopy[0].score = 0;
// console.log('Original first score still:', enrollments[0].score);

// TODO 4: Use chunk to create study pairs from web-dev students.
// Extract the student names, then chunk into pairs of 2.
const webDevStudents = byCourse['web-dev'].map(e => e.student);
const studyPairs = chunk(webDevStudents, 2);
console.log('Study pairs for web-dev:', studyPairs);

// TODO 5: Use range to generate module numbers for a 10-module course.
// Then use flatten to combine them with an array of bonus modules.
const coreModules = [...range(1, 10)];
const bonusContent = [[11, 12], [13]];
const allModules = flatten([coreModules, ...bonusContent]);
console.log('All module numbers:', allModules);

// TODO 6: Use memoize to cache the letter grade calculation.
// Call it multiple times with the same score and verify it only
// computes once (add a console.log inside the function to confirm).
const getGrade = memoize((score) => {
  // TODO: add console.log here so you can see when it runs vs. when it's cached
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  return 'D';
});

enrollments.forEach(e => console.log(`${e.student}: ${getGrade(e.score)}`));
// Call getGrade(88) again -- should NOT log "computing" a second time
console.log('Alex again (should be cached):', getGrade(88));
```

---

## Stretch Goals

After your tests pass and your demo runs, try these extensions:

1. **`omit(obj, ...keys)`**: Return a new object with the specified keys removed. Use object destructuring and rest to implement it -- no loops required.

2. **`pick(obj, ...keys)`**: Return a new object with only the specified keys. Implement two ways: once with `reduce`, once with destructuring.

3. **`curry(fn)`**: Return a curried version of `fn`. A curried function can be called with fewer arguments than it expects, returning a new function that waits for the rest. `curry((a, b, c) => a + b + c)(1)(2)(3)` should return `6`. `curry((a, b, c) => a + b + c)(1, 2)(3)` should also return `6`.

4. **`zip(...arrays)`**: Return an array of tuples pairing up elements from each array by position. `zip([1, 2, 3], ['a', 'b', 'c'])` should return `[[1, 'a'], [2, 'b'], [3, 'c']]`. Stop at the shortest array.

5. **Async generator `paginate(fetchFn)`**: A reusable async generator that calls `fetchFn(pageNumber)` starting at page 1, yields each result, and stops when `fetchFn` returns `null` or an empty array. Use it to simulate paginated API consumption.

---

## Submission Checklist

Before moving on to Module 02, verify each item:

- [ ] All 9 functions are implemented in `lib/utils.js`
- [ ] `node tests/utils.test.js` runs with 0 failures
- [ ] `demo.js` runs without errors and prints meaningful output
- [ ] No function mutates its input arguments (chunk, flatten, groupBy especially)
- [ ] `debounce` correctly delays and resets on rapid successive calls (test manually in a browser or with a small Node.js script using `setTimeout`)
- [ ] `throttle` ignores calls during the cooldown window (test the same way)
- [ ] `range` works for both ascending and descending sequences, and is genuinely lazy (the test suite verifies this)
- [ ] `deepClone` handles nested arrays, nested objects, and Date objects correctly
- [ ] All files use ESM (`export`/`import`) -- no `require()`
- [ ] At least one stretch goal attempted

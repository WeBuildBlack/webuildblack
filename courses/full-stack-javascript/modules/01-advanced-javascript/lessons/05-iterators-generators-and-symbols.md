---
title: "Iterators, Generators, and Symbols"
estimatedMinutes: 40
---

# Iterators, Generators, and Symbols

Most JavaScript developers use iterables every day -- arrays, strings, Maps, Sets -- without thinking about the protocol underneath them. But the iterator protocol is a standardized interface, and once you understand it, you can make any data structure work with `for...of`, spread, and destructuring. Generators give you a way to define sequences lazily, producing values only when asked. Symbols are the primitive type that makes all of this extensible without naming collisions.

These features are used in libraries, runtimes, and frameworks -- understanding them means you can read and write more of the JavaScript ecosystem confidently.

---

## Symbols

A Symbol is a unique, immutable primitive. Every Symbol is guaranteed to be different from every other Symbol, even if they have the same description:

```javascript
const sym1 = Symbol('id');
const sym2 = Symbol('id');

console.log(sym1 === sym2); // false -- always unique

console.log(typeof sym1);      // 'symbol'
console.log(sym1.toString());  // 'Symbol(id)'
console.log(sym1.description); // 'id'
```

### Why Symbols Exist

The main use case for Symbols is creating property keys that are guaranteed not to collide with any string key -- including keys added by other code or future JavaScript versions.

```javascript
const ID = Symbol('id');
const user = {
  name: 'Jordan',
  [ID]: 42  // Symbol key -- hidden from normal enumeration
};

console.log(user.name);  // 'Jordan'
console.log(user[ID]);   // 42

// Symbol keys do not show up in for...in, Object.keys(), or JSON.stringify
for (const key in user) {
  console.log(key); // Only 'name' -- ID is invisible
}

console.log(Object.keys(user)); // ['name']
JSON.stringify(user); // '{"name":"Jordan"}' -- ID key omitted
```

This makes Symbols useful for attaching metadata to objects without risk of collision or accidental serialization.

### Global Symbol Registry

Symbols created with `Symbol()` are always unique. If you need to share a Symbol across files or modules, use the global registry:

```javascript
// Any code that calls Symbol.for() with the same key gets the same Symbol
const sharedId = Symbol.for('app.userId');
const alsoSharedId = Symbol.for('app.userId');

console.log(sharedId === alsoSharedId); // true -- same registry entry

// Reverse lookup: get the key from a Symbol
Symbol.keyFor(sharedId); // 'app.userId'
```

---

## Well-Known Symbols

JavaScript uses a set of built-in Symbols to define customizable behaviors. These are called "well-known symbols" and they live as properties on the `Symbol` constructor.

### Symbol.iterator

`Symbol.iterator` is a method on an object that returns an iterator. Any object with this method is "iterable" and works with `for...of`, spread, destructuring, and `Array.from()`.

```javascript
// Arrays have Symbol.iterator built in
const arr = [1, 2, 3];
const iter = arr[Symbol.iterator]();

console.log(iter.next()); // { value: 1, done: false }
console.log(iter.next()); // { value: 2, done: false }
console.log(iter.next()); // { value: 3, done: false }
console.log(iter.next()); // { value: undefined, done: true }
```

### Symbol.toPrimitive

Defines how an object converts to a primitive value:

```javascript
const temperature = {
  celsius: 22,

  [Symbol.toPrimitive](hint) {
    // hint is 'number', 'string', or 'default'
    if (hint === 'number') return this.celsius;
    if (hint === 'string') return `${this.celsius}°C`;
    return this.celsius; // default
  }
};

console.log(+temperature);          // 22 (number hint)
console.log(`Temp: ${temperature}`); // "Temp: 22°C" (string hint)
console.log(temperature + 0);       // 22 (default hint)
```

### Other Well-Known Symbols

| Symbol | What it controls |
|---|---|
| `Symbol.iterator` | Makes an object iterable (`for...of`, spread, destructuring) |
| `Symbol.asyncIterator` | Makes an object async iterable (`for await...of`) |
| `Symbol.toPrimitive` | Controls type coercion |
| `Symbol.hasInstance` | Controls `instanceof` behavior |
| `Symbol.toStringTag` | Controls `Object.prototype.toString` output |
| `Symbol.species` | Controls which constructor is used for derived objects |

---

## The Iterator Protocol

An object is an iterator if it has a `next()` method that returns `{ value, done }`:

- `value`: the current value in the sequence
- `done`: `true` when the sequence is exhausted, `false` otherwise

An object is iterable if it has a `[Symbol.iterator]()` method that returns an iterator.

Let's build a custom iterable from scratch:

```javascript
// A range object: iterable from 'start' to 'end'
function createRange(start, end, step = 1) {
  return {
    // Symbol.iterator makes this object iterable
    [Symbol.iterator]() {
      let current = start;

      // Return the iterator object
      return {
        next() {
          if (current <= end) {
            const value = current;
            current += step;
            return { value, done: false };
          }
          return { value: undefined, done: true };
        }
      };
    }
  };
}

const range = createRange(1, 5);

// Works with for...of
for (const n of range) {
  console.log(n); // 1, 2, 3, 4, 5
}

// Works with spread
console.log([...range]); // [1, 2, 3, 4, 5]

// Works with destructuring
const [first, second, ...rest] = createRange(10, 50, 10);
console.log(first);  // 10
console.log(second); // 20
console.log(rest);   // [30, 40, 50]
```

### for...of vs. for...in

`for...of` iterates over values of an iterable. `for...in` iterates over enumerable property keys of an object. They are not interchangeable:

```javascript
const arr = ['a', 'b', 'c'];
arr.custom = 'extra';

for (const value of arr) {
  console.log(value); // 'a', 'b', 'c' -- values only
}

for (const key in arr) {
  console.log(key); // '0', '1', '2', 'custom' -- all enumerable keys
}
```

Use `for...of` with arrays, strings, Maps, Sets, and custom iterables. Use `for...in` when you specifically want property keys on a plain object.

---

## Generator Functions

Generator functions are a special syntax for writing iterators. They pause execution at each `yield` and resume when the caller asks for the next value.

```javascript
// The asterisk (*) marks this as a generator function
function* numbers() {
  yield 1;
  yield 2;
  yield 3;
  // Implicit return -- done: true after this
}

const gen = numbers();

console.log(gen.next()); // { value: 1, done: false }
console.log(gen.next()); // { value: 2, done: false }
console.log(gen.next()); // { value: 3, done: false }
console.log(gen.next()); // { value: undefined, done: true }

// Generators are iterable -- works with for...of
for (const n of numbers()) {
  console.log(n); // 1, 2, 3
}
```

The key insight: code between `yield` statements does not run until the next `next()` call. The generator is suspended at each `yield`, preserving its local state.

### Generators for Infinite Sequences

Generators are ideal for lazy sequences -- values are only computed when requested:

```javascript
// An infinite sequence of IDs
function* idGenerator(prefix = 'id') {
  let n = 1;
  while (true) {
    yield `${prefix}-${n++}`;
    // This loop runs forever, but the generator only produces a value
    // when someone calls .next() -- so it never blocks
  }
}

const ids = idGenerator('user');
console.log(ids.next().value); // 'user-1'
console.log(ids.next().value); // 'user-2'
console.log(ids.next().value); // 'user-3'
```

You'd never want to spread an infinite generator (`[...ids]` would run forever). But consuming it one value at a time or with a bounded loop is safe and useful.

### Practical Generator: Paginated API Fetching

Generators model pagination naturally -- fetch the next page only when needed:

```javascript
async function* fetchPages(url) {
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(`${url}?page=${page}&limit=20`);
    const data = await res.json();

    yield data.items; // Yield this page's items

    hasMore = data.hasNextPage;
    page++;
  }
}

// Consume pages one at a time
async function processAllUsers(apiUrl) {
  const pages = fetchPages(`${apiUrl}/users`);

  for await (const pageItems of pages) {
    for (const user of pageItems) {
      await processUser(user);
    }
    console.log('Processed a page');
  }
}
```

The `async function*` syntax creates an async generator, and `for await...of` consumes it. Each page is only fetched when the loop asks for the next iteration.

### Generator: Range (Cleaner Version)

The range example from earlier is much cleaner as a generator:

```javascript
function* range(start, end, step = 1) {
  for (let i = start; i <= end; i += step) {
    yield i;
  }
}

console.log([...range(1, 10, 2)]); // [1, 3, 5, 7, 9]
```

### Passing Values Into a Generator

`next()` can accept a value, which becomes the result of the `yield` expression inside the generator:

```javascript
function* adder() {
  let total = 0;
  while (true) {
    const n = yield total; // Pauses; next .next(value) puts value here
    if (n === null) break;
    total += n;
  }
  return total;
}

const add = adder();
add.next();   // Start the generator, get initial total (0)
add.next(10); // { value: 10, done: false }
add.next(20); // { value: 30, done: false }
add.next(5);  // { value: 35, done: false }
add.next(null); // { value: 35, done: true }
```

This two-way communication is powerful but used sparingly in practice. It's the foundation of libraries like `redux-saga`.

---

## Generator Delegation

Use `yield*` to delegate to another iterable from within a generator:

```javascript
function* flatten(arr) {
  for (const item of arr) {
    if (Array.isArray(item)) {
      yield* flatten(item); // Delegate to recursive call
    } else {
      yield item;
    }
  }
}

const nested = [1, [2, [3, 4]], [5, 6]];
console.log([...flatten(nested)]); // [1, 2, 3, 4, 5, 6]
```

`yield*` hands off to another iterable and yields each of its values in turn -- whether it's an array, a string, or another generator.

---

## Memoization with Symbols

Here's a pattern that combines Symbols and closures to build a private cache without polluting object properties:

```javascript
const CACHE = Symbol('cache');

function memoize(fn) {
  return function(...args) {
    // Attach cache to the function itself using a Symbol key
    // so it won't conflict with any property the function already has
    if (!fn[CACHE]) fn[CACHE] = new Map();

    const key = JSON.stringify(args);
    if (fn[CACHE].has(key)) {
      return fn[CACHE].get(key);
    }

    const result = fn.apply(this, args);
    fn[CACHE].set(key, result);
    return result;
  };
}

const expensiveCalc = memoize(function(n) {
  console.log('Computing...');
  return n * n;
});

expensiveCalc(5); // Logs "Computing..." -- result: 25
expensiveCalc(5); // No log -- returns cached 25
expensiveCalc(6); // Logs "Computing..." -- result: 36
```

---

## Custom Iterable: Tree Traversal

Here's a more complex example: making a tree structure iterable so it works with `for...of` in depth-first order:

```javascript
class TreeNode {
  constructor(value, children = []) {
    this.value = value;
    this.children = children;
  }

  // Make the node itself iterable
  *[Symbol.iterator]() {
    yield this.value; // Yield the current node's value

    for (const child of this.children) {
      yield* child; // Delegate to each child's iterator
    }
  }
}

const tree = new TreeNode('root', [
  new TreeNode('a', [
    new TreeNode('a1'),
    new TreeNode('a2')
  ]),
  new TreeNode('b', [
    new TreeNode('b1')
  ])
]);

// Now the tree works with all iterable consumers
console.log([...tree]);
// ['root', 'a', 'a1', 'a2', 'b', 'b1'] -- depth-first

for (const value of tree) {
  console.log(value);
}
```

The `*[Symbol.iterator]()` syntax defines a generator method directly on the class using the well-known Symbol as the key.

---

## Key Takeaways

- Symbols are unique, immutable primitives used as property keys to avoid naming collisions and hide implementation details from enumeration.
- `Symbol.for(key)` creates or retrieves a Symbol from the global registry -- useful for sharing across modules.
- Well-known Symbols like `Symbol.iterator` and `Symbol.toPrimitive` let you customize how objects interact with JavaScript's built-in operators and syntax.
- An object is iterable when it has a `[Symbol.iterator]()` method that returns an iterator (an object with `next()` returning `{ value, done }`).
- `for...of` works with any iterable; `for...in` enumerates string property keys -- they serve different purposes.
- Generator functions (`function*`) use `yield` to lazily produce values, preserving local state between calls.
- `yield*` delegates to another iterable, enabling clean recursive and compositional generators.
- Generators are ideal for lazy sequences, pagination, tree traversal, and any case where values should be produced on demand rather than all at once.

---

## Try It Yourself

1. Create a custom iterable `LinkedList` class. The list should store values in nodes (`{ value, next }`), have an `add(value)` method, and implement `[Symbol.iterator]()` so that `for...of` traverses the list from head to tail. Test it with spread: `[...myList]`.

2. Write a generator function `fibonacci()` that yields Fibonacci numbers indefinitely (0, 1, 1, 2, 3, 5, 8, ...). Then write a helper `take(n, iterable)` that returns the first `n` values from any iterable as an array. Use both together to get the first 10 Fibonacci numbers.

3. A data pipeline processes records in stages: filter, transform, and collect. Implement each stage as a generator that takes an iterable input:
   - `filter(pred, source)` -- yields items where `pred(item)` is true
   - `map(fn, source)` -- yields `fn(item)` for each item
   Compose them to process `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]` into the squares of all even numbers.

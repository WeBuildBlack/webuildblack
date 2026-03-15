---
title: "JSON Format and Parsing"
estimatedMinutes: 30
---

# JSON Format and Parsing

When your application talks to an API, the data moves back and forth as text. Not as JavaScript objects, not as database rows. Plain text. JSON (JavaScript Object Notation) is the format that nearly every modern web API uses to structure that text. It's lightweight, human-readable, and supported natively in every programming language worth knowing.

Understanding JSON deeply means understanding the subtle ways it differs from JavaScript, the common mistakes that break parsers, and the tools you have to transform data as it moves in and out of your application. This lesson covers all of it.

---

## JSON Syntax Rules

JSON looks a lot like JavaScript object literals, but it has strict rules that JavaScript does not. A JSON document is always one of these six value types:

- Object (`{}`)
- Array (`[]`)
- String (`"text"`)
- Number (`42`, `3.14`, `-7`)
- Boolean (`true` or `false`)
- Null (`null`)

Most real-world JSON is an object or an array at the top level. Here's a valid JSON document:

```json
{
  "id": 101,
  "name": "Aaliyah Johnson",
  "email": "aaliyah@example.com",
  "active": true,
  "score": 98.5,
  "tags": ["frontend", "react", "typescript"],
  "address": {
    "city": "Brooklyn",
    "state": "NY",
    "zip": "11201"
  },
  "notes": null
}
```

The rules that trip people up most often:

**All keys must be strings in double quotes.** Not single quotes. Not unquoted identifiers. Double quotes only.

```json
// VALID
{ "name": "Jordan" }

// INVALID -- single quotes
{ 'name': 'Jordan' }

// INVALID -- unquoted key
{ name: "Jordan" }
```

**No trailing commas.** After the last item in an object or array, there is no comma.

```json
// VALID
{ "a": 1, "b": 2 }

// INVALID -- trailing comma after "b": 2
{ "a": 1, "b": 2, }
```

**No comments.** JSON has no syntax for comments. None. If you need to document a JSON config file, you either use a superset format (like JSONC) or add a `"_comment"` key as a convention.

**String values must use double quotes.** Single-quoted strings are not valid JSON.

**Numbers cannot have leading zeros** (except `0` itself) and cannot be `NaN` or `Infinity`.

---

## JSON vs JavaScript Objects

JSON is a data format (text). A JavaScript object is a runtime value in memory. They look similar but are fundamentally different things. Here are the key differences:

| Feature | JSON | JavaScript Object |
|---|---|---|
| Keys | Must be double-quoted strings | Can be identifiers, strings, symbols |
| Strings | Double quotes only | Single or double quotes |
| Trailing commas | Not allowed | Allowed (in modern JS) |
| Comments | Not allowed | Allowed |
| `undefined` values | Not allowed | Allowed |
| Functions | Not allowed | Allowed |
| `NaN` / `Infinity` | Not allowed | Allowed |
| `Date` objects | Not allowed (stored as strings) | Allowed |

```javascript
// This is a valid JavaScript object literal
const user = {
  name: "Devin",       // unquoted key -- fine in JS
  active: true,
  greet() {            // function -- fine in JS, not in JSON
    return `Hi, ${this.name}`;
  },
  lastLogin: new Date(), // Date object -- fine in JS, not in JSON
};

// This is valid JSON (as a string)
const userJson = `{
  "name": "Devin",
  "active": true
}`;
// Notice: no function, no Date object, all keys double-quoted
```

---

## JSON.parse(): Text to Object

When an API returns JSON, your code receives it as a string. `JSON.parse()` converts that string into a JavaScript value you can work with.

```javascript
// A JSON string -- this is what travels over the network
const jsonString = '{"id": 5, "name": "Marcus", "score": 87.5, "tags": ["js", "node"]}';

// Parse it into a JavaScript object
const user = JSON.parse(jsonString);

console.log(user.name);      // "Marcus"
console.log(user.score);     // 87.5
console.log(user.tags[0]);   // "js"
console.log(typeof user);    // "object"
```

`JSON.parse()` throws a `SyntaxError` if the input is not valid JSON. Always wrap it in a try/catch when parsing data from external sources:

```javascript
function safeParseJson(text) {
  try {
    return { data: JSON.parse(text), error: null };
  } catch (err) {
    // The text was not valid JSON
    return { data: null, error: err.message };
  }
}

const result = safeParseJson('{"valid": true}');
console.log(result.data);   // { valid: true }

const bad = safeParseJson("not json at all");
console.log(bad.error);     // "Unexpected token 'o', "not json..." is not valid JSON"
```

Note: when you use `response.json()` with the Fetch API (covered in the next lesson), it calls `JSON.parse()` internally. You still get a rejected Promise if the body isn't valid JSON.

---

## JSON.stringify(): Object to Text

`JSON.stringify()` converts a JavaScript value into a JSON string. You use it when sending data to a server or storing data as text.

```javascript
const user = {
  id: 42,
  name: "Imani Clarke",
  active: true,
  tags: ["react", "python"],
};

// Convert to JSON string
const jsonString = JSON.stringify(user);
console.log(jsonString);
// '{"id":42,"name":"Imani Clarke","active":true,"tags":["react","python"]}'

// Prettify with indentation (great for logging and debugging)
const prettyJson = JSON.stringify(user, null, 2);
console.log(prettyJson);
// {
//   "id": 42,
//   "name": "Imani Clarke",
//   "active": true,
//   "tags": [
//     "react",
//     "python"
//   ]
// }
```

`JSON.stringify()` silently drops values that JSON can't represent:

```javascript
const obj = {
  name: "Test",
  fn: () => "hello",     // functions are dropped
  undef: undefined,      // undefined values are dropped
  nan: NaN,              // NaN becomes null
  inf: Infinity,         // Infinity becomes null
};

console.log(JSON.stringify(obj));
// '{"name":"Test","nan":null,"inf":null}'
// Notice: fn and undef are gone entirely
```

This is important to know. If you're missing data after a stringify/parse round-trip, check whether those values are representable in JSON.

---

## The Replacer and Reviver Functions

Both `JSON.stringify()` and `JSON.parse()` accept optional functions that let you control exactly how values are transformed.

### The Replacer (for stringify)

The replacer is the second argument to `JSON.stringify()`. You can pass a function or an array.

```javascript
const data = {
  id: 1,
  username: "aaliyah",
  password: "supersecret",  // never want to serialize this
  email: "aaliyah@example.com",
  internalCode: "XK-441",   // internal only
};

// Function replacer: return undefined to omit a key
const sanitized = JSON.stringify(data, (key, value) => {
  // Omit sensitive fields
  if (key === "password" || key === "internalCode") {
    return undefined;
  }
  return value; // keep everything else
});

console.log(sanitized);
// '{"id":1,"username":"aaliyah","email":"aaliyah@example.com"}'

// Array replacer: only include the listed keys
const minimal = JSON.stringify(data, ["id", "username"]);
console.log(minimal);
// '{"id":1,"username":"aaliyah"}'
```

### The Reviver (for parse)

The reviver is the second argument to `JSON.parse()`. It receives each key/value pair and lets you transform the value before it's added to the result.

```javascript
// JSON from an API with date strings (dates can't be JSON natively)
const apiResponse = `{
  "id": 10,
  "title": "Workshop: React Fundamentals",
  "startDate": "2026-04-01T14:00:00Z",
  "endDate": "2026-04-01T17:00:00Z"
}`;

// Without a reviver, dates are just strings
const rawEvent = JSON.parse(apiResponse);
console.log(typeof rawEvent.startDate); // "string"
console.log(rawEvent.startDate);        // "2026-04-01T14:00:00Z"

// With a reviver, convert ISO date strings to Date objects automatically
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

const event = JSON.parse(apiResponse, (key, value) => {
  // If the value is a string that looks like an ISO date, convert it
  if (typeof value === "string" && ISO_DATE_PATTERN.test(value)) {
    return new Date(value);
  }
  return value;
});

console.log(typeof event.startDate); // "object"
console.log(event.startDate instanceof Date); // true
console.log(event.startDate.getFullYear());   // 2026
```

---

## Handling Dates in JSON

Dates are one of the most common sources of confusion when working with JSON. JSON has no native date type. Dates are always stored as strings (typically in ISO 8601 format) or as Unix timestamps (numbers).

```javascript
const now = new Date();

// JSON.stringify converts Date objects to ISO strings automatically
const obj = { timestamp: now, label: "now" };
console.log(JSON.stringify(obj));
// '{"timestamp":"2026-03-14T15:30:00.000Z","label":"now"}'

// But JSON.parse does NOT convert them back automatically
const parsed = JSON.parse(JSON.stringify(obj));
console.log(parsed.timestamp);            // "2026-03-14T15:30:00.000Z" (string)
console.log(parsed.timestamp instanceof Date); // false

// You must convert back manually
const restored = new Date(parsed.timestamp);
console.log(restored instanceof Date);    // true
```

Three common patterns for working with dates across APIs:

```javascript
// Pattern 1: ISO 8601 string (most common, timezone-aware)
{ "createdAt": "2026-03-14T15:30:00.000Z" }

// Pattern 2: Unix timestamp in milliseconds (easy to work with in JS)
{ "createdAt": 1741963800000 }
// Usage: new Date(1741963800000)

// Pattern 3: Unix timestamp in seconds (common in older APIs)
{ "createdAt": 1741963800 }
// Usage: new Date(1741963800 * 1000)
```

Always check an API's documentation to know which format it uses. Some APIs mix formats across endpoints, which is unfortunate but real.

---

## Validating JSON

Before parsing data from external sources, it's good practice to validate that the structure matches what you expect. A simple approach uses optional chaining and nullish coalescing:

```javascript
function parseUserResponse(jsonString) {
  let raw;

  // Step 1: Parse the JSON string safely
  try {
    raw = JSON.parse(jsonString);
  } catch {
    throw new Error("Invalid JSON in response");
  }

  // Step 2: Validate the shape matches what you need
  if (typeof raw.id !== "number") {
    throw new Error("Expected response.id to be a number");
  }
  if (typeof raw.name !== "string") {
    throw new Error("Expected response.name to be a string");
  }

  // Step 3: Return a normalized object with safe defaults
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email ?? "",         // default to empty string if missing
    tags: Array.isArray(raw.tags) ? raw.tags : [],  // default to empty array
    active: raw.active ?? true,
  };
}
```

For production apps, consider a dedicated validation library like Zod (TypeScript) or Joi (JavaScript). They let you define a schema once and validate any data against it, with detailed error messages when validation fails.

---

## Common Gotchas

**Trailing commas crash parsers.** This is the number one JSON error. Many text editors and linters will flag it, but it's easy to introduce manually.

**Single quotes are not valid.** JSON requires double quotes for all strings, including keys. JavaScript is more forgiving, but JSON parsers are not.

**Large numbers lose precision.** JavaScript numbers are 64-bit floats. Integers larger than `Number.MAX_SAFE_INTEGER` (9,007,199,254,740,991) lose precision when parsed. Some APIs return large IDs as strings specifically to avoid this.

```javascript
// This integer is too large for JavaScript to represent exactly
const bigJson = '{"id": 9007199254740999}';
const parsed = JSON.parse(bigJson);
console.log(parsed.id); // 9007199254741000 -- wrong!

// The API should send it as a string instead
const safeJson = '{"id": "9007199254740999"}';
const safeParsed = JSON.parse(safeJson);
console.log(safeParsed.id); // "9007199254740999" -- correct (as string)
```

**`undefined` disappears.** If you set a value to `undefined` in JavaScript and stringify it, that key vanishes from the JSON output. Use `null` when you need to explicitly represent "no value."

**Circular references throw errors.** If an object references itself (directly or indirectly), `JSON.stringify()` throws. This comes up more than you'd expect when working with DOM nodes or complex data structures.

```javascript
const a = { name: "a" };
const b = { name: "b", ref: a };
a.ref = b; // circular reference

JSON.stringify(a); // TypeError: Converting circular structure to JSON
```

---

## Key Takeaways

- JSON is a text format with strict syntax: double-quoted string keys, no trailing commas, no comments, no functions, no `undefined`.
- `JSON.parse()` converts JSON text into a JavaScript value. It throws a `SyntaxError` on invalid JSON, so always use try/catch with external data.
- `JSON.stringify()` converts a JavaScript value to JSON text. Functions, `undefined`, and symbols are silently dropped.
- The replacer (stringify) and reviver (parse) functions let you control how values are transformed during serialization and deserialization.
- JSON has no native date type. Dates travel as ISO 8601 strings or Unix timestamps and must be converted back to `Date` objects manually.
- Large integers can lose precision when parsed. APIs that return large IDs sometimes send them as strings.
- Use `null` (not `undefined`) when you need to represent an explicitly absent value in JSON.

---

## Try It Yourself

1. Open your browser console and experiment with `JSON.stringify()` and `JSON.parse()`. Create a JavaScript object with a `Date`, a function, and an `undefined` value. Stringify it and observe what survives the round-trip. Then parse the result back.

2. Write a `dateAwareReviver` function that converts any string value matching the pattern `YYYY-MM-DD` (like `"2026-04-01"`) into a JavaScript `Date` object. Test it with `JSON.parse('{"event":"Workshop","date":"2026-04-01"}', dateAwareReviver)`.

3. Take this malformed JSON string and identify all the errors before trying to fix them:
   ```
   {
     name: 'Aaliyah',
     'score': 95,
     tags: ["js", "react",],
     active: undefined,
   }
   ```
   Rewrite it as valid JSON.

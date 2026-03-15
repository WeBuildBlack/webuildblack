---
title: "Template Literals and Enhanced Object Literals"
estimatedMinutes: 30
---

# Template Literals and Enhanced Object Literals

String concatenation and object construction are two of the most common operations in any JavaScript codebase. Building a URL from dynamic parts, formatting a message, constructing a database query, shaping the payload for an API request -- you do these things constantly. ES6 made both significantly cleaner through template literals and enhanced object literal syntax. This lesson covers both, including tagged templates, which unlock a set of patterns used by libraries like `styled-components`, `graphql-tag`, and SQL query builders.

---

## Template Literals

Template literals use backticks instead of quotes and support embedded expressions directly inside the string.

```javascript
const name = 'Jordan';
const role = 'engineer';

// Old concatenation approach
const message = 'Hello, ' + name + '! You are logged in as ' + role + '.';

// Template literal -- expressions go inside ${}
const message = `Hello, ${name}! You are logged in as ${role}.`;

console.log(message); // "Hello, Jordan! You are logged in as engineer."
```

### Expression Interpolation

Anything inside `${}` is a JavaScript expression. That includes ternaries, function calls, arithmetic, and method calls:

```javascript
const price = 2999; // cents
const quantity = 3;
const discount = 0.1;

const summary = `
  Subtotal: $${(price * quantity / 100).toFixed(2)}
  Discount: ${discount * 100}%
  Total: $${(price * quantity * (1 - discount) / 100).toFixed(2)}
`;

console.log(summary);
// Subtotal: $89.97
// Discount: 10%
// Total: $80.97
```

```javascript
const user = { name: 'Alex', verified: true };

// Ternary inside a template literal
const badge = `${user.name} ${user.verified ? '(verified)' : '(unverified)'}`;
console.log(badge); // "Alex (verified)"
```

### Multi-line Strings

Template literals preserve newlines, eliminating the need for `\n` or string concatenation across lines:

```javascript
// Old approach
const html = '<div class="card">\n' +
  '  <h2>' + title + '</h2>\n' +
  '  <p>' + body + '</p>\n' +
  '</div>';

// Template literal -- whitespace and newlines are literal
const html = `
  <div class="card">
    <h2>${title}</h2>
    <p>${body}</p>
  </div>
`;
```

One thing to be aware of: the newline after the opening backtick and any leading whitespace are included in the string. If you need to avoid a leading newline, start your content on the same line as the backtick, or use `.trim()`:

```javascript
const query = `
  SELECT *
  FROM users
  WHERE active = true
`.trim();
// No leading/trailing whitespace
```

### Nesting Template Literals

Template literals can be nested:

```javascript
const items = ['HTML', 'CSS', 'JavaScript'];

const list = `
  <ul>
    ${items.map(item => `<li>${item}</li>`).join('\n    ')}
  </ul>
`;
```

This is a common pattern for generating HTML strings, building SQL queries conditionally, or constructing log messages with embedded arrays.

---

## Tagged Templates

Tagged templates are one of the less-known but most powerful features of ES6. A tag is a function that receives the template literal's parts and interpolated values, and can process them however it wants.

```javascript
function tag(strings, ...values) {
  // strings: array of string literals between the expressions
  // values: array of interpolated values

  console.log(strings); // ['Hello, ', '! You have ', ' messages.']
  console.log(values);  // ['Jordan', 5]

  // You can reassemble, escape, transform, or return anything
  return strings.reduce((result, str, i) => {
    return result + str + (values[i] !== undefined ? values[i] : '');
  }, '');
}

const name = 'Jordan';
const count = 5;
const output = tag`Hello, ${name}! You have ${count} messages.`;
```

### Practical Tagged Template: HTML Escaping

One real use case is preventing XSS by escaping user-provided values before inserting them into HTML:

```javascript
function safeHtml(strings, ...values) {
  const escaped = values.map(v =>
    String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  );

  return strings.reduce((result, str, i) => {
    return result + str + (escaped[i] ?? '');
  }, '');
}

const userInput = '<script>alert("xss")</script>';
const html = safeHtml`<div class="comment">${userInput}</div>`;

console.log(html);
// <div class="comment">&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</div>
```

### Tagged Templates in Libraries

This is exactly how popular libraries work:

```javascript
// styled-components: tag returns a React component with those styles
const Button = styled.button`
  background: ${props => props.primary ? '#7D4E21' : 'white'};
  color: ${props => props.primary ? 'white' : '#7D4E21'};
  padding: 0.5rem 1rem;
`;

// graphql-tag: tag returns a parsed AST
const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      name
      email
    }
  }
`;

// sql (various libraries): tag sanitizes inputs, returns a safe query object
const result = await sql`SELECT * FROM users WHERE id = ${userId}`;
```

Tagged templates allow these libraries to give you template literal syntax (readable, multi-line, with interpolation) while doing their own processing underneath.

---

## Enhanced Object Literals

ES6 introduced several shorthand syntaxes for defining objects that reduce the boilerplate of common patterns.

### Shorthand Property Names

When a variable name matches the property key you want, you can omit the repetition:

```javascript
const name = 'Jordan';
const email = 'jordan@example.com';
const role = 'admin';

// Old approach -- key: value where key === variable name is redundant
const user = { name: name, email: email, role: role };

// Shorthand -- if the name matches, write it once
const user = { name, email, role };
```

This is ubiquitous in modern JavaScript. You'll see it constantly in function returns, object construction from API data, and test fixtures.

### Method Shorthand

Methods on objects no longer need the `function` keyword:

```javascript
// Old syntax
const api = {
  baseUrl: 'https://api.example.com',
  getUsers: function() {
    return fetch(`${this.baseUrl}/users`);
  },
  createUser: function(data) {
    return fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

// Method shorthand -- cleaner and reads more naturally
const api = {
  baseUrl: 'https://api.example.com',
  getUsers() {
    return fetch(`${this.baseUrl}/users`);
  },
  createUser(data) {
    return fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};
```

Method shorthand functions are regular functions (not arrows), so `this` works correctly when the method is called on the object.

### Computed Property Keys

You can use an expression as a property key by wrapping it in square brackets:

```javascript
const field = 'email';
const prefix = 'user';

// Dynamic property key from a variable
const obj = {
  [field]: 'jordan@example.com',        // { email: 'jordan@example.com' }
  [`${prefix}Name`]: 'Jordan',          // { userName: 'Jordan' }
  [`${prefix}Role`]: 'admin'            // { userRole: 'admin' }
};
```

Computed keys are useful when building objects dynamically, such as generating form state from an array of field names, or constructing API query parameters:

```javascript
// Build an update payload from only the changed fields
function buildPatch(changes) {
  return changes.reduce((patch, { field, value }) => {
    return { ...patch, [field]: value };
  }, {});
}

const patch = buildPatch([
  { field: 'name', value: 'Alex' },
  { field: 'role', value: 'admin' }
]);

console.log(patch); // { name: 'Alex', role: 'admin' }
```

### Getters and Setters

Enhanced object literals also support `get` and `set` keywords for defining computed properties with logic:

```javascript
const temperature = {
  _celsius: 20,

  get fahrenheit() {
    return this._celsius * 9 / 5 + 32;
  },

  set fahrenheit(f) {
    this._celsius = (f - 32) * 5 / 9;
  },

  get celsius() {
    return this._celsius;
  }
};

console.log(temperature.fahrenheit); // 68
temperature.fahrenheit = 100;
console.log(temperature.celsius);    // 37.77...
```

---

## Object.assign vs. Spread

Before object spread was available, `Object.assign()` was the standard way to merge objects. Understanding both helps you read older codebases and make informed choices.

```javascript
const defaults = { theme: 'dark', lang: 'en', timeout: 5000 };
const options = { lang: 'es', debug: true };

// Object.assign: mutates the first argument
const config1 = Object.assign({}, defaults, options);
// { theme: 'dark', lang: 'es', timeout: 5000, debug: true }

// Object spread: always creates a new object (no mutation)
const config2 = { ...defaults, ...options };
// { theme: 'dark', lang: 'es', timeout: 5000, debug: true }
```

Key differences:

| Feature | `Object.assign()` | Spread (`{...}`) |
|---|---|---|
| Mutates first arg | Yes (if not `{}`) | Never |
| Handles getters | Invokes them | Invokes them |
| Handles non-enumerable | No | No |
| Works with `null` prototype | Yes | No |
| Syntax clarity | Verbose | Concise |

For most use cases, object spread is preferred. `Object.assign()` still has its place when you intentionally want to mutate a target object (e.g., mixing into an existing prototype).

### Deep vs. Shallow: A Key Limitation

Both object spread and `Object.assign()` perform shallow copies. Nested objects are still shared by reference:

```javascript
const original = {
  name: 'Jordan',
  address: { city: 'Brooklyn', state: 'NY' }
};

const copy = { ...original };
copy.address.city = 'Manhattan'; // Mutates the nested object!

console.log(original.address.city); // 'Manhattan' -- original was affected
```

For deep cloning, you need `structuredClone()` (built into modern runtimes) or a utility like `lodash.cloneDeep()`. The module project has you implement a `deepClone` from scratch.

---

## Putting It Together: A Real-World Example

Here's a pattern you'll encounter constantly -- a configuration factory that combines all of these features:

```javascript
const ENV = 'production';
const version = '2.1.0';

function createApiConfig({
  baseUrl,
  timeout = 5000,
  retries = 3,
  headers = {}
} = {}) {
  const timestamp = new Date().toISOString();

  return {
    // Shorthand properties
    baseUrl,
    timeout,
    retries,

    // Computed key from outer variable
    [`${ENV}Mode`]: true,

    // Method shorthand
    getFullUrl(path) {
      return `${baseUrl}${path}`;
    },

    // Spread to merge caller headers with defaults
    headers: {
      'Content-Type': 'application/json',
      'X-App-Version': version,
      ...headers
    },

    // Template literal in a value
    userAgent: `MyApp/${version} (${ENV})`,

    // Getter
    get requestId() {
      return `req-${Date.now()}`;
    }
  };
}

const config = createApiConfig({
  baseUrl: 'https://api.example.com',
  headers: { Authorization: 'Bearer token123' }
});

console.log(config.getFullUrl('/users'));
// "https://api.example.com/users"

console.log(config.headers);
// { 'Content-Type': 'application/json', 'X-App-Version': '2.1.0', Authorization: 'Bearer token123' }
```

---

## Key Takeaways

- Template literals use backticks and support `${}` interpolation with any JavaScript expression.
- Multi-line template literals preserve whitespace and newlines -- use `.trim()` when you need clean output.
- Tagged templates let a function receive and process the parts of a template literal, enabling libraries like styled-components and graphql-tag.
- Shorthand property syntax eliminates `key: key` repetition when variable names match property names.
- Method shorthand removes the `function` keyword from object methods and keeps `this` working correctly.
- Computed property keys (`[expression]`) enable dynamic object construction.
- Object spread is preferred over `Object.assign()` for most merging and copying -- but both are shallow.

---

## Try It Yourself

1. Write a tagged template function called `highlight` that wraps each interpolated value in `<mark>` tags. For example, `highlight\`Hello, ${'Jordan'}! You have ${5} messages.\`` should return `"Hello, <mark>Jordan</mark>! You have <mark>5</mark> messages."`.

2. Rewrite the following object using all applicable ES6 enhanced object literal features (shorthand properties, method shorthand, computed keys):

```javascript
const prefix = 'get';
const host = 'localhost';
const port = 3000;

const server = {
  host: host,
  port: port,
  address: host + ':' + port,
  [prefix + 'Host']: function() { return this.host; },
  [prefix + 'Port']: function() { return this.port; }
};
```

3. Given `const original = { a: 1, b: { c: 2, d: [3, 4] } }`, demonstrate that object spread creates a shallow copy by modifying a nested value in the copy and showing the original is affected. Then fix the problem using `structuredClone()`.

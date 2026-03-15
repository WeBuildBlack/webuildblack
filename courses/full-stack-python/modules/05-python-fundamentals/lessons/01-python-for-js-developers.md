---
title: "Python for JavaScript Developers"
estimatedMinutes: 35
isFreePreview: false
---

# Python for JavaScript Developers

You know JavaScript. You can write async functions in your sleep, destructure objects without thinking, and debug a Promise chain while eating lunch. That puts you in a great position, because learning Python as your second language is going to feel surprisingly natural. The core programming concepts you already know (variables, functions, loops, conditionals, data structures) all transfer directly. The syntax is just different enough to keep things interesting.

So why add Python to your toolkit? Three reasons. First, Python dominates data science, machine learning, and AI engineering. You used Python-based APIs in the AI Engineering course, and now you'll understand what's happening on the other side of those endpoints. Second, Django (which you'll learn in Module 06) is one of the most productive web frameworks ever built, and it runs on Python. Third, the job market increasingly values developers who can work across both ecosystems. Full-stack roles at companies building AI-powered products almost always require both.

This lesson takes the Rosetta Stone approach. Every Python concept is shown side-by-side with the JavaScript you already know. By the end, you'll be reading and writing Python with confidence.

---

## Setting Up Python

### Installation

You need Python 3.12 or later. Check what you have:

```bash
python3 --version
```

If you need to install or upgrade:

- **macOS**: `brew install python@3.12`
- **Windows**: Download from [python.org](https://www.python.org/downloads/) and check "Add to PATH" during install
- **Linux**: `sudo apt install python3.12` (Ubuntu/Debian)

### Running Python Code

There are three ways to run Python, just like JavaScript:

| Method | JavaScript | Python |
|--------|-----------|--------|
| REPL (interactive) | `node` | `python3` |
| Run a file | `node app.js` | `python3 app.py` |
| One-liner | `node -e "console.log('hi')"` | `python3 -c "print('hi')"` |

Try the REPL now. Type `python3` in your terminal:

```python
>>> 2 + 2
4
>>> print("Hello from Python")
Hello from Python
>>> exit()
```

The `>>>` prompt means Python is waiting for input. Type `exit()` or press Ctrl+D to leave.

For the rest of this module, create a file called `playground.py` and run it with `python3 playground.py` after each change. This is your scratch pad.

---

## The Syntax Shift

Here's the biggest mental adjustment: **Python uses indentation to define code blocks, not curly braces.** This isn't a style preference. It's enforced by the language. If your indentation is wrong, your code won't run.

```javascript
// JavaScript
if (score > 90) {
  console.log("A grade");
  console.log("Great work!");
}
```

```python
# Python
if score > 90:
    print("A grade")
    print("Great work!")
```

Notice the differences: no parentheses around the condition (though they're allowed), a colon at the end of the `if` line, and indentation (4 spaces by convention) instead of braces. No semicolons either. Python uses newlines to end statements.

Here's a comprehensive syntax comparison table. Bookmark this and come back to it throughout the module:

| Concept | JavaScript | Python |
|---------|-----------|--------|
| Code blocks | `{ }` | Indentation (4 spaces) |
| Statement terminator | `;` (optional) | Newline |
| Single-line comment | `// comment` | `# comment` |
| Multi-line comment | `/* ... */` | `"""..."""` or `'''...'''` (docstrings) |
| Print output | `console.log()` | `print()` |
| Logical AND | `&&` | `and` |
| Logical OR | `\|\|` | `or` |
| Logical NOT | `!` | `not` |
| Equality | `===` (strict) | `==` (always strict) |
| Inequality | `!==` | `!=` |
| Null value | `null` / `undefined` | `None` |
| Boolean values | `true` / `false` | `True` / `False` |
| String interpolation | `` `Hello ${name}` `` | `f"Hello {name}"` |
| For loop | `for (let i = 0; i < 10; i++)` | `for i in range(10):` |
| For-of loop | `for (const item of array)` | `for item in list:` |
| Ternary | `x ? a : b` | `a if x else b` |

Python's `==` is always strict comparison (like JavaScript's `===`). There is no loose equality in Python, so you never have to worry about `0 == ""` being `true`.

---

## Variables

Python has no `let`, `const`, or `var`. You just assign a value to a name:

```javascript
// JavaScript
let name = "Devin";
const age = 30;
var city = "Brooklyn";  // don't use var, but you know it exists
```

```python
# Python
name = "Devin"
age = 30
city = "Brooklyn"
```

Python variables are dynamically typed, just like JavaScript. You can reassign a variable to a different type (though you probably shouldn't):

```python
x = 42        # int
x = "hello"   # now it's a string -- valid but confusing
```

There is no built-in `const` in Python. By convention, constants are written in `ALL_CAPS`:

```python
MAX_ATTENDEES = 500    # convention, not enforced
API_BASE_URL = "https://api.gather.dev"
```

Nothing stops you from reassigning `MAX_ATTENDEES`, but other developers will know you shouldn't.

One more naming convention to internalize: Python uses `snake_case` for variables and functions, not `camelCase`. This is specified in PEP 8, Python's official style guide, and the entire ecosystem follows it.

```javascript
// JavaScript
const eventName = "Launch Party";
const isRegistered = true;
function getAttendeeCount() { /* ... */ }
```

```python
# Python
event_name = "Launch Party"
is_registered = True
def get_attendee_count():
    pass  # ... we'll cover functions in Lesson 3
```

---

## Strings

Python strings work similarly to JavaScript strings, with a few key differences:

```javascript
// JavaScript
const single = 'hello';
const double = "hello";
const backtick = `hello ${name}, you are ${age} years old`;
const multiline = `
  This spans
  multiple lines
`;
```

```python
# Python
single = 'hello'
double = "hello"
fstring = f"hello {name}, you are {age} years old"
multiline = """
  This spans
  multiple lines
"""
```

The `f` prefix creates an **f-string** (formatted string literal). It's Python's version of JavaScript template literals. Any valid expression goes inside the curly braces:

```python
event_name = "Gather Launch Party"
attendees = 127
capacity = 200

print(f"{event_name}: {attendees}/{capacity} spots filled ({attendees/capacity:.0%})")
# Output: Gather Launch Party: 127/200 spots filled (64%)
```

That `:.0%` is a format specifier. Python f-strings have a mini-language for formatting numbers, padding, and alignment. JavaScript template literals don't have anything like this built in.

### Common String Methods

Most string methods you know from JavaScript exist in Python with slightly different names:

```javascript
// JavaScript
"hello world".toUpperCase()           // "HELLO WORLD"
"hello world".includes("world")       // true
"hello world".split(" ")              // ["hello", "world"]
"hello world".replace("world", "py")  // "hello py"
"  hello  ".trim()                    // "hello"
"hello world".startsWith("hello")     // true
"hello world".indexOf("world")        // 6
```

```python
# Python
"hello world".upper()                 # "HELLO WORLD"
"world" in "hello world"              # True  (use 'in' operator, not a method)
"hello world".split(" ")              # ["hello", "world"]
"hello world".replace("world", "py")  # "hello py"
"  hello  ".strip()                   # "hello"
"hello world".startswith("hello")     # True
"hello world".index("world")          # 6
```

Notice the `in` operator for checking substring membership. This is more Pythonic than calling a method. You'll see `in` used everywhere in Python.

---

## Numbers

JavaScript has one number type (`Number`, which is a 64-bit float). Python has two: `int` (integers with unlimited precision) and `float` (64-bit floating point):

```python
count = 42          # int
price = 29.99       # float
big = 10 ** 100     # int -- Python handles arbitrarily large integers

# Integer division (rounds down)
7 // 2              # 3 (no JS equivalent operator)
7 / 2               # 3.5 (regular division, always returns float)
7 % 2               # 1 (modulo, same as JS)
2 ** 10             # 1024 (exponentiation, like ** in JS)
```

The `//` operator (floor division) has no direct JavaScript equivalent. You'd need `Math.floor(7 / 2)` in JS.

Python will never give you `NaN` from dividing by zero. It raises a `ZeroDivisionError` exception instead. No more silently broken calculations.

---

## Booleans and Truthiness

```javascript
// JavaScript
let isActive = true;
let isDeleted = false;
```

```python
# Python
is_active = True     # capital T
is_deleted = False   # capital F
```

Truthiness works similarly but with important differences:

| Value | JavaScript | Python |
|-------|-----------|--------|
| Empty string `""` | Falsy | Falsy |
| Zero `0` | Falsy | Falsy |
| Empty array/list `[]` | **Truthy** | **Falsy** |
| Empty object/dict `{}` | **Truthy** | **Falsy** |
| `null`/`None` | Falsy | Falsy |
| `undefined` | Falsy | N/A (doesn't exist) |
| `NaN` | Falsy | N/A (not a common value) |

The big surprise: **empty collections are falsy in Python.** This is actually more intuitive, and it leads to clean patterns:

```python
attendees = []

# Pythonic way to check for empty list
if not attendees:
    print("No one has RSVPed yet")

# Works for dicts, sets, and strings too
if not event_title:
    print("Event needs a title")
```

In JavaScript you'd write `if (attendees.length === 0)` or use a more roundabout check. Python's approach is consistent across all collection types.

---

## None vs null/undefined

JavaScript has both `null` and `undefined`, which causes endless confusion. Python has one: `None`.

```javascript
// JavaScript
let x = null;         // explicitly empty
let y;                // undefined (declared but no value)
let z = undefined;    // explicitly undefined (weird but valid)
console.log(typeof null);      // "object" (a famous bug)
console.log(typeof undefined); // "undefined"
```

```python
# Python
x = None              # explicitly empty -- that's it, just one

# Check for None with 'is', not '=='
if x is None:
    print("x has no value")

if x is not None:
    print("x has a value")
```

Always use `is None` and `is not None` (identity check), not `== None`. This is both more Pythonic and more correct, because `==` can be overridden by custom classes.

---

## Control Flow

### if/elif/else

```javascript
// JavaScript
if (score >= 90) {
  grade = "A";
} else if (score >= 80) {
  grade = "B";
} else {
  grade = "C";
}
```

```python
# Python
if score >= 90:
    grade = "A"
elif score >= 80:    # elif, not "else if"
    grade = "B"
else:
    grade = "C"
```

### Ternary Expressions

```javascript
// JavaScript
const status = isActive ? "active" : "inactive";
```

```python
# Python
status = "active" if is_active else "inactive"
```

The Python ternary reads like English: "value if condition else other_value."

### Loops

```javascript
// JavaScript -- for loop
for (let i = 0; i < 5; i++) {
  console.log(i);
}

// JavaScript -- for-of
for (const event of events) {
  console.log(event.title);
}

// JavaScript -- while
while (queue.length > 0) {
  process(queue.shift());
}
```

```python
# Python -- for loop (using range)
for i in range(5):
    print(i)

# Python -- for-in (iterating a list)
for event in events:
    print(event["title"])

# Python -- while
while len(queue) > 0:
    process(queue.pop(0))
```

Python's `for` loop is always a for-each loop. There is no C-style `for (init; condition; increment)`. The `range()` function generates a sequence of numbers when you need indices:

```python
range(5)           # 0, 1, 2, 3, 4
range(2, 8)        # 2, 3, 4, 5, 6, 7
range(0, 10, 2)    # 0, 2, 4, 6, 8  (step of 2)
```

If you need both the index and the value (like `array.forEach((item, index) =>` in JS), use `enumerate()`:

```python
events = ["Workshop", "Meetup", "Conference"]

for index, event in enumerate(events):
    print(f"{index}: {event}")
# 0: Workshop
# 1: Meetup
# 2: Conference
```

---

## Putting It Together: A Gather Example

Here's a small program that brings together everything from this lesson. It manages event RSVPs for Gather:

```python
# gather_rsvp.py

# Constants
MAX_CAPACITY = 50
EVENT_NAME = "Python for JS Devs Workshop"

# Event data
attendees = ["Maya", "Jordan", "Alex", "Kai"]
waitlist = []
is_registration_open = True

# Display event info
print(f"Event: {EVENT_NAME}")
print(f"Registered: {len(attendees)}/{MAX_CAPACITY}")
print(f"Registration: {'Open' if is_registration_open else 'Closed'}")

# Process new RSVPs
new_rsvps = ["Taylor", "Morgan", "Riley"]

for name in new_rsvps:
    if not is_registration_open:
        print(f"Sorry {name}, registration is closed")
    elif len(attendees) >= MAX_CAPACITY:
        waitlist.append(name)
        print(f"{name} added to waitlist (position {len(waitlist)})")
    else:
        attendees.append(name)
        print(f"Welcome, {name}! You're attendee #{len(attendees)}")

# Final count
spots_left = MAX_CAPACITY - len(attendees)
print(f"\nFinal count: {len(attendees)} registered, {spots_left} spots remaining")

if not waitlist:
    print("No one on the waitlist")
else:
    print(f"Waitlist: {len(waitlist)} people waiting")
```

Run this with `python3 gather_rsvp.py`. Notice how readable the code is. That readability is one of Python's core design principles: code is read more often than it's written, so clarity counts.

---

## Key Takeaways

1. Python uses **indentation** (4 spaces) for code blocks instead of curly braces. This is enforced by the language, not just a style choice.
2. Variables need no keyword (`let`, `const`, `var`). Just assign with `=`. Use `snake_case` for names and `ALL_CAPS` for constants.
3. **f-strings** (`f"Hello {name}"`) are Python's template literals, with built-in format specifiers for numbers and alignment.
4. Python has `True`, `False`, and `None` (all capitalized). There is no `undefined`. Use `is None` instead of `== None`.
5. **Empty collections are falsy** in Python (empty lists, dicts, sets, strings), unlike JavaScript where `[]` and `{}` are truthy.
6. Logical operators are English words: `and`, `or`, `not` instead of `&&`, `||`, `!`.
7. The `for` loop is always a for-each. Use `range()` for numeric sequences and `enumerate()` when you need both index and value.

---

## Try It Yourself

1. **Translate a JS function**: Take any small JavaScript function you've written before (a utility, a helper, anything) and rewrite it in Python. Pay attention to where your fingers want to type braces and semicolons.

2. **Build an event formatter**: Write a Python script that takes a list of event dictionaries (each with `title`, `date`, and `attendee_count` keys) and prints a formatted summary for each one using f-strings. Include the total number of events and average attendance at the bottom.

3. **Truthiness explorer**: Create a script that tests the truthiness of these values and prints the results: `0`, `1`, `""`, `"hello"`, `[]`, `[1, 2]`, `{}`, `{"a": 1}`, `None`, `True`, `False`. Compare your predictions with what Python actually does.

4. **FizzBuzz in Python**: Classic for a reason. Write FizzBuzz (1 to 100) in Python. Then compare your solution to how you'd write it in JavaScript. Which reads more clearly?

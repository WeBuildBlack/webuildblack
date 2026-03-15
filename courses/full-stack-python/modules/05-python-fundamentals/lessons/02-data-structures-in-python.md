---
title: "Data Structures in Python"
estimatedMinutes: 35
isFreePreview: false
---

# Data Structures in Python

In JavaScript, you spend most of your time working with arrays and objects. Python has equivalents for both (lists and dictionaries), plus two more built-in types you'll reach for constantly: tuples and sets. Together, these four structures cover virtually every data modeling need.

This lesson walks through each one with JavaScript comparisons, then puts them all to work modeling Gather event data. By the end, you'll be comfortable choosing the right Python data structure for any situation.

---

## Lists (Python's Arrays)

A Python **list** is an ordered, mutable collection. It's the direct equivalent of a JavaScript array.

```javascript
// JavaScript
const events = ["Workshop", "Meetup", "Conference"];
events.push("Hackathon");
console.log(events[0]);         // "Workshop"
console.log(events.length);     // 4
```

```python
# Python
events = ["Workshop", "Meetup", "Conference"]
events.append("Hackathon")
print(events[0])                # "Workshop"
print(len(events))              # 4
```

The differences are small: `append()` instead of `push()`, `len()` as a function instead of `.length` as a property. Python uses standalone functions for many operations that JavaScript puts on the object itself.

### List Methods Comparison

| Operation | JavaScript | Python |
|-----------|-----------|--------|
| Add to end | `arr.push(item)` | `lst.append(item)` |
| Add multiple | `arr.push(...items)` | `lst.extend(items)` |
| Insert at index | `arr.splice(i, 0, item)` | `lst.insert(i, item)` |
| Remove last | `arr.pop()` | `lst.pop()` |
| Remove at index | `arr.splice(i, 1)` | `lst.pop(i)` |
| Remove by value | N/A (manual) | `lst.remove(value)` |
| Find index | `arr.indexOf(item)` | `lst.index(item)` |
| Check membership | `arr.includes(item)` | `item in lst` |
| Sort in place | `arr.sort()` | `lst.sort()` |
| Reverse in place | `arr.reverse()` | `lst.reverse()` |
| Length | `arr.length` | `len(lst)` |

### Slicing (a Python Superpower)

JavaScript doesn't have a concise syntax for extracting sublists. Python does, and it's one of the most useful features in the language:

```python
numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

numbers[2:5]      # [2, 3, 4]       -- from index 2 up to (not including) 5
numbers[:3]       # [0, 1, 2]       -- from the start up to index 3
numbers[7:]       # [7, 8, 9]       -- from index 7 to the end
numbers[-3:]      # [7, 8, 9]       -- last 3 elements
numbers[::2]      # [0, 2, 4, 6, 8] -- every 2nd element
numbers[::-1]     # [9, 8, 7, 6, 5, 4, 3, 2, 1, 0] -- reversed
```

The syntax is `list[start:stop:step]`. All three parts are optional. In JavaScript, you'd use `.slice()` for basic cases, but there's no equivalent for the step parameter.

```javascript
// JavaScript equivalents (where they exist)
numbers.slice(2, 5)    // [2, 3, 4]
numbers.slice(0, 3)    // [0, 1, 2]
numbers.slice(7)       // [7, 8, 9]
numbers.slice(-3)      // [7, 8, 9]
// No equivalent for step -- you'd need .filter() with index math
```

Slicing creates a new list. The original is unchanged. This is important to remember when you're passing data around.

---

## List Comprehensions

This is arguably Python's most distinctive feature. A **list comprehension** creates a new list by transforming and/or filtering an existing one, all in a single expression.

In JavaScript, you chain `.map()` and `.filter()`:

```javascript
// JavaScript: get names of large events
const events = [
  { title: "Workshop", attendees: 30 },
  { title: "Conference", attendees: 500 },
  { title: "Meetup", attendees: 15 },
  { title: "Hackathon", attendees: 200 },
];

const largeEventNames = events
  .filter(e => e.attendees >= 100)
  .map(e => e.title);
// ["Conference", "Hackathon"]
```

```python
# Python: same thing with a list comprehension
events = [
    {"title": "Workshop", "attendees": 30},
    {"title": "Conference", "attendees": 500},
    {"title": "Meetup", "attendees": 15},
    {"title": "Hackathon", "attendees": 200},
]

large_event_names = [e["title"] for e in events if e["attendees"] >= 100]
# ["Conference", "Hackathon"]
```

The structure is: `[expression for item in iterable if condition]`

Read it like English: "give me `e["title"]` for each `e` in `events` if `e["attendees"]` is at least 100."

Here are more examples showing the JavaScript chain vs Python comprehension pattern:

```javascript
// JavaScript: double all numbers
const doubled = numbers.map(n => n * 2);

// JavaScript: get even numbers
const evens = numbers.filter(n => n % 2 === 0);

// JavaScript: get lengths of all strings
const lengths = words.map(w => w.length);
```

```python
# Python: double all numbers
doubled = [n * 2 for n in numbers]

# Python: get even numbers
evens = [n for n in numbers if n % 2 == 0]

# Python: get lengths of all strings
lengths = [len(w) for w in words]
```

You can also nest comprehensions for more complex transformations, but keep it readable. If a comprehension takes more than one line to understand, use a regular `for` loop instead.

```python
# Flatten a list of lists
nested = [[1, 2], [3, 4], [5, 6]]
flat = [num for sublist in nested for num in sublist]
# [1, 2, 3, 4, 5, 6]

# JavaScript equivalent
const flat = nested.flat();
// or: nested.reduce((acc, sub) => [...acc, ...sub], [])
```

---

## Dictionaries (Python's Objects)

A Python **dictionary** (`dict`) is a collection of key-value pairs. It's the closest equivalent to a JavaScript object, though there are important differences.

```javascript
// JavaScript
const event = {
  title: "Gather Launch",
  date: "2026-04-15",
  capacity: 200,
};
console.log(event.title);        // "Gather Launch"
console.log(event["title"]);     // "Gather Launch" (bracket notation)
event.location = "Brooklyn";     // add a new property
```

```python
# Python
event = {
    "title": "Gather Launch",
    "date": "2026-04-15",
    "capacity": 200,
}
print(event["title"])            # "Gather Launch"
event["location"] = "Brooklyn"   # add a new key
```

**Key difference**: Python dictionaries always use bracket notation with string keys. There is no dot notation for dictionaries. If you write `event.title`, Python looks for an *attribute* on the dict object itself (which doesn't exist), not the key `"title"` inside it.

### Dictionary Methods

```python
event = {"title": "Gather Launch", "date": "2026-04-15", "capacity": 200}

# Access with default (avoids KeyError)
event.get("location", "TBD")     # "TBD" -- key doesn't exist, returns default
event["location"]                 # KeyError! -- crashes if key is missing

# Check if key exists
"title" in event                  # True
"location" in event               # False

# Get all keys, values, or pairs
event.keys()                      # dict_keys(["title", "date", "capacity"])
event.values()                    # dict_values(["Gather Launch", "2026-04-15", 200])
event.items()                     # dict_items([("title", "Gather Launch"), ...])

# Merge dictionaries
defaults = {"capacity": 100, "is_public": True}
overrides = {"capacity": 200, "title": "Gather Launch"}
merged = {**defaults, **overrides}    # same spread syntax idea as JS!
# {"capacity": 200, "is_public": True, "title": "Gather Launch"}

# Or use the | operator (Python 3.9+)
merged = defaults | overrides

# Remove a key
del event["capacity"]             # removes the key entirely
removed = event.pop("date")      # removes and returns the value
```

The `.get()` method is one of the most useful patterns in Python. In JavaScript, you'd use optional chaining (`event?.location`) or a fallback (`event.location || "TBD"`). Python's `.get(key, default)` is explicit and clean.

### Comparing Access Patterns

```javascript
// JavaScript -- accessing nested data
const city = event?.venue?.address?.city ?? "Unknown";
```

```python
# Python -- no optional chaining, use .get() chains or try/except
city = event.get("venue", {}).get("address", {}).get("city", "Unknown")
```

This is admittedly more verbose than JavaScript's optional chaining. For deeply nested access, many Python developers use try/except instead:

```python
try:
    city = event["venue"]["address"]["city"]
except KeyError:
    city = "Unknown"
```

### Dictionary Comprehensions

Just like list comprehensions, but for dictionaries:

```python
# Create a dict from a list of events: title -> attendee count
events = [
    {"title": "Workshop", "attendees": 30},
    {"title": "Conference", "attendees": 500},
]

attendance = {e["title"]: e["attendees"] for e in events}
# {"Workshop": 30, "Conference": 500}
```

```javascript
// JavaScript equivalent
const attendance = Object.fromEntries(
  events.map(e => [e.title, e.attendees])
);
```

The Python version is more concise and easier to read.

---

## Tuples (Immutable Lists)

A **tuple** is like a list, but it cannot be modified after creation. JavaScript has no built-in equivalent (the closest is `Object.freeze()` on an array, but that's not commonly used).

```python
# Create a tuple
coordinates = (40.6892, -74.0445)
rgb_color = (44, 23, 11)
single_item = (42,)   # note the trailing comma -- without it, it's just parentheses

# Access like a list
print(coordinates[0])   # 40.6892
print(len(rgb_color))   # 3

# But you can't modify
coordinates[0] = 0      # TypeError: 'tuple' object does not support item assignment
```

When would you use a tuple instead of a list? Three common cases:

1. **Return multiple values from a function** (the primary use case, covered in Lesson 3)
2. **Dictionary keys** (lists can't be dict keys because they're mutable, but tuples can)
3. **Data that shouldn't change** (coordinates, RGB values, database row results)

### Tuple Unpacking

This is similar to JavaScript destructuring, and it's used constantly in Python:

```javascript
// JavaScript destructuring
const [lat, lng] = [40.6892, -74.0445];
const [first, ...rest] = [1, 2, 3, 4, 5];
```

```python
# Python unpacking
lat, lng = (40.6892, -74.0445)
first, *rest = [1, 2, 3, 4, 5]    # rest = [2, 3, 4, 5]

# Works with any iterable, not just tuples
a, b, c = "abc"                     # a="a", b="b", c="c"
```

The `*rest` syntax in Python is like `...rest` in JavaScript. It collects the remaining items.

---

## Sets (Unique Values)

A **set** is an unordered collection of unique values. JavaScript has `Set`, and Python's version works similarly but with more built-in operations.

```javascript
// JavaScript
const tags = new Set(["python", "web", "python", "api"]);
console.log(tags.size);        // 3 (duplicates removed)
tags.add("django");
tags.has("python");            // true
tags.delete("web");
```

```python
# Python
tags = {"python", "web", "python", "api"}
print(len(tags))               # 3 (duplicates removed)
tags.add("django")
"python" in tags               # True
tags.remove("web")             # or tags.discard("web") -- discard won't error if missing
```

Note the syntax: `{}` with values (no key-value pairs) creates a set in Python. An empty `{}` creates a dict, not a set. Use `set()` for an empty set.

### Set Operations

This is where Python sets really shine. These operations are built into the language:

```python
frontend = {"react", "vue", "angular", "svelte"}
backend = {"django", "express", "fastapi", "react"}  # react appears in both (SSR)

# Union: everything in either set
all_frameworks = frontend | backend
# {"react", "vue", "angular", "svelte", "django", "express", "fastapi"}

# Intersection: only what's in both sets
full_stack = frontend & backend
# {"react"}

# Difference: in frontend but not backend
frontend_only = frontend - backend
# {"vue", "angular", "svelte"}

# Symmetric difference: in one but not both
exclusive = frontend ^ backend
# {"vue", "angular", "svelte", "django", "express", "fastapi"}
```

In JavaScript, you'd need to write these manually with `.filter()` and `.has()`. Python makes set operations first-class.

---

## Destructuring and Unpacking Compared

JavaScript destructuring and Python unpacking are conceptually the same. Here's a side-by-side reference:

```javascript
// JavaScript -- array destructuring
const [a, b] = [1, 2];
const [first, ...rest] = [1, 2, 3, 4];
const [x, , z] = [1, 2, 3];   // skip second element

// JavaScript -- object destructuring
const { title, date } = event;
const { title: eventTitle } = event;  // rename
const { location = "TBD" } = event;   // default value
```

```python
# Python -- sequence unpacking
a, b = [1, 2]
first, *rest = [1, 2, 3, 4]
x, _, z = [1, 2, 3]           # _ is convention for "don't care"

# Python -- no direct dict destructuring, but common patterns:
title = event["title"]
date = event["date"]

# Or unpack dict values in a specific order
title, date = event["title"], event["date"]

# Python 3.10+ structural pattern matching (similar to destructuring)
match event:
    case {"title": title, "date": date}:
        print(f"{title} on {date}")
```

Python doesn't have built-in dictionary destructuring like JavaScript's `const { title, date } = event`. The `match`/`case` statement (added in Python 3.10) is the closest equivalent, but it's primarily used for pattern matching, not everyday variable extraction.

---

## Nested Data Structures: Modeling Gather Events

Real application data is nested. Here's how you'd model Gather's event data in both languages:

```javascript
// JavaScript
const gatherEvents = [
  {
    id: "evt_001",
    title: "Python for JS Devs Workshop",
    organizer: { name: "Devin", role: "founder" },
    date: "2026-04-15",
    category: "workshop",
    attendees: ["Maya", "Jordan", "Alex"],
    capacity: 50,
    tags: new Set(["python", "beginner", "hands-on"]),
  },
];
```

```python
# Python
gather_events = [
    {
        "id": "evt_001",
        "title": "Python for JS Devs Workshop",
        "organizer": {"name": "Devin", "role": "founder"},
        "date": "2026-04-15",
        "category": "workshop",
        "attendees": ["Maya", "Jordan", "Alex"],
        "capacity": 50,
        "tags": {"python", "beginner", "hands-on"},
    },
]
```

Now let's work with this data to build an RSVP tracker:

```python
# Track RSVPs across all events
gather_events = [
    {
        "id": "evt_001",
        "title": "Python Workshop",
        "category": "workshop",
        "attendees": ["Maya", "Jordan", "Alex"],
        "capacity": 50,
    },
    {
        "id": "evt_002",
        "title": "React Meetup",
        "category": "meetup",
        "attendees": ["Jordan", "Taylor", "Morgan", "Alex"],
        "capacity": 30,
    },
    {
        "id": "evt_003",
        "title": "Career Panel",
        "category": "panel",
        "attendees": ["Maya", "Riley", "Taylor"],
        "capacity": 100,
    },
]

# Find events with available spots
available = [
    e["title"]
    for e in gather_events
    if len(e["attendees"]) < e["capacity"]
]
print(f"Events with spots: {available}")

# Count attendees per category
category_counts = {}
for event in gather_events:
    cat = event["category"]
    count = len(event["attendees"])
    category_counts[cat] = category_counts.get(cat, 0) + count

print(f"Attendance by category: {category_counts}")
# {"workshop": 3, "meetup": 4, "panel": 3}

# Find all unique attendees across all events using sets
all_attendees = set()
for event in gather_events:
    all_attendees.update(event["attendees"])

print(f"Unique attendees: {all_attendees}")
# {"Maya", "Jordan", "Alex", "Taylor", "Morgan", "Riley"}

# Who attends multiple events?
from collections import Counter
attendance_count = Counter(
    name
    for event in gather_events
    for name in event["attendees"]
)
repeat_attendees = {name for name, count in attendance_count.items() if count > 1}
print(f"Repeat attendees: {repeat_attendees}")
# {"Maya", "Jordan", "Alex", "Taylor"}
```

Notice how sets, list comprehensions, and dictionary methods work together naturally. The `Counter` class from the `collections` module is a dictionary subclass that counts occurrences. You'll find the `collections` module incredibly useful.

---

## Choosing the Right Data Structure

| Need | JavaScript | Python | Why |
|------|-----------|--------|-----|
| Ordered collection | Array | List | Both are mutable, indexed sequences |
| Key-value mapping | Object / Map | Dict | Python dicts are ordered (insertion order) since 3.7 |
| Immutable sequence | `Object.freeze([])` | Tuple | Use for fixed data, function returns, dict keys |
| Unique values | Set | Set | Use when you need deduplication or set math |
| Ordered + unique | Array + manual dedup | `list(dict.fromkeys(items))` | Preserves insertion order while removing duplicates |

A quick decision guide:
- **Need to modify it?** List (yes) or Tuple (no)
- **Need key-value pairs?** Dict
- **Need unique values or set operations?** Set
- **Returning multiple values from a function?** Tuple

---

## Key Takeaways

1. **Lists** are Python's arrays. They use `append()` instead of `push()`, and `len()` instead of `.length`. Slicing (`list[start:stop:step]`) is a powerful feature with no JavaScript equivalent.
2. **List comprehensions** (`[expr for item in iterable if condition]`) replace `.map().filter()` chains. They're more concise and considered idiomatic Python.
3. **Dictionaries** are key-value pairs accessed with bracket notation only (no dot notation). The `.get(key, default)` method prevents `KeyError` crashes.
4. **Tuples** are immutable lists, used for fixed data, multiple return values, and dictionary keys. Unpacking (`a, b = tuple`) works like JavaScript destructuring.
5. **Sets** store unique values and support built-in operations: union (`|`), intersection (`&`), difference (`-`), and symmetric difference (`^`).
6. **Empty collections are falsy** in Python. Use `if not my_list:` to check for empty.
7. Python's `collections` module (especially `Counter` and `defaultdict`) extends the built-in data structures with powerful specialized variants.

---

## Try It Yourself

1. **Event filter pipeline**: Create a list of 10 Gather event dictionaries with varying categories, dates, and attendee counts. Write list comprehensions to: (a) find all workshops, (b) find events with more than 20 attendees, (c) create a list of just the titles sorted by attendee count.

2. **Set operations practice**: Create two sets of attendee names (one for morning events, one for evening events). Find who attended both, who only attended morning events, and the total unique attendees across both.

3. **Nested data challenge**: Model a Gather event with nested organizer info, a list of attendee dictionaries (each with name, email, and RSVP status), and a set of tags. Write code that extracts all confirmed attendees' emails into a new list using a list comprehension.

4. **Dictionary counter**: Without using `Counter`, write a function that takes a list of event categories and returns a dictionary of category counts. Then rewrite it using a dictionary comprehension. Compare the two approaches.

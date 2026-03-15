---
title: "Functions and Modules"
estimatedMinutes: 35
isFreePreview: false
---

# Functions and Modules

Functions are where code gets reusable, and modules are where code gets organized. You've been writing both in JavaScript for a long time. Python's versions are similar in concept but different enough in syntax and convention to warrant a full lesson.

This lesson covers Python functions (including some features that have no JavaScript equivalent), the import system, the standard library, type hints, and decorators. That last one, decorators, will click immediately if you remember Higher-Order Components from Module 02. Same idea, different syntax.

---

## Defining Functions: def vs function

```javascript
// JavaScript -- function declaration
function greet(name) {
  return `Hello, ${name}!`;
}

// JavaScript -- arrow function
const greet = (name) => `Hello, ${name}!`;
```

```python
# Python -- function definition
def greet(name):
    return f"Hello, {name}!"
```

Python has one way to define functions: the `def` keyword. There are no arrow functions (though lambda expressions exist for tiny one-liners, which we'll cover later). Every function needs a colon after the parameter list and an indented body.

If a function doesn't explicitly return a value, it returns `None` (like JavaScript returning `undefined`).

```python
def log_event(title):
    print(f"Event created: {title}")
    # no return statement -- implicitly returns None

result = log_event("Workshop")
print(result)  # None
```

### Docstrings

Python has a convention for documenting functions that JavaScript lacks: the **docstring**. It's a string literal on the first line of the function body.

```python
def calculate_fill_rate(attendees, capacity):
    """Calculate what percentage of event capacity is filled.

    Args:
        attendees: Number of confirmed attendees.
        capacity: Maximum event capacity.

    Returns:
        Float between 0.0 and 1.0 representing the fill rate.
    """
    if capacity == 0:
        return 0.0
    return attendees / capacity
```

Docstrings aren't just comments. They're accessible at runtime via `help(calculate_fill_rate)` or `calculate_fill_rate.__doc__`. IDEs and documentation generators use them too. In JavaScript, you'd use JSDoc comments (`/** */`), but those are just comments with no runtime presence.

---

## Parameters: Positional, Keyword, and Default

JavaScript functions have positional parameters and default values. Python has those plus **keyword arguments**, which are a significant improvement for readability.

### Default Values

```javascript
// JavaScript
function createEvent(title, capacity = 100, isPublic = true) {
  return { title, capacity, isPublic };
}
```

```python
# Python
def create_event(title, capacity=100, is_public=True):
    return {"title": title, "capacity": capacity, "is_public": is_public}
```

Same concept. Default values are used when the argument isn't provided.

### Keyword Arguments

Here's where Python pulls ahead. When calling a function, you can specify arguments by name:

```python
# Positional (order matters)
create_event("Workshop", 50, False)

# Keyword (order doesn't matter, much more readable)
create_event("Workshop", is_public=False, capacity=50)

# Mix positional and keyword (positional must come first)
create_event("Workshop", capacity=50)
```

In JavaScript, when a function has many parameters, you often use an options object:

```javascript
// JavaScript -- the "options object" pattern
function createEvent({ title, capacity = 100, isPublic = true }) {
  return { title, capacity, isPublic };
}
createEvent({ title: "Workshop", isPublic: false });
```

Python's keyword arguments solve the same readability problem without needing a wrapper object. You can also force keyword-only arguments using `*`:

```python
def create_event(title, *, capacity=100, is_public=True):
    """The * means capacity and is_public MUST be passed as keywords."""
    return {"title": title, "capacity": capacity, "is_public": is_public}

create_event("Workshop", 50)            # TypeError!
create_event("Workshop", capacity=50)   # Works
```

---

## *args and **kwargs (Rest and Spread)

JavaScript has rest parameters (`...args`) and spread syntax (`...array`). Python has `*args` and `**kwargs`.

### *args (Positional Rest)

```javascript
// JavaScript -- rest parameters
function logAll(...messages) {
  messages.forEach(msg => console.log(msg));
}
logAll("hello", "world", "!");
```

```python
# Python -- *args collects extra positional arguments into a tuple
def log_all(*messages):
    for msg in messages:
        print(msg)

log_all("hello", "world", "!")
```

### **kwargs (Keyword Rest)

This has no direct JavaScript equivalent. `**kwargs` collects extra keyword arguments into a dictionary:

```python
def create_event(title, **metadata):
    """Accept any additional metadata as keyword arguments."""
    event = {"title": title}
    event.update(metadata)
    return event

event = create_event(
    "Workshop",
    category="education",
    location="Brooklyn",
    capacity=50
)
# {"title": "Workshop", "category": "education", "location": "Brooklyn", "capacity": 50}
```

### Spread Equivalent

```javascript
// JavaScript -- spread
const args = [1, 2, 3];
myFunction(...args);

const options = { capacity: 50, isPublic: true };
createEvent({ title: "Workshop", ...options });
```

```python
# Python -- unpack with * and **
args = [1, 2, 3]
my_function(*args)       # unpacks list into positional args

options = {"capacity": 50, "is_public": True}
create_event("Workshop", **options)   # unpacks dict into keyword args
```

The mnemonic: one star (`*`) for lists/tuples (positional), two stars (`**`) for dicts (keyword).

---

## Return Values: Multiple Returns via Tuple Unpacking

In JavaScript, a function can only return one value. If you need multiple values, you return an object or array:

```javascript
// JavaScript -- return multiple values via object
function getEventStats(events) {
  return {
    total: events.length,
    avgAttendees: events.reduce((s, e) => s + e.attendees, 0) / events.length,
  };
}
const { total, avgAttendees } = getEventStats(events);
```

Python functions can return multiple values directly using tuples (with implicit unpacking):

```python
# Python -- return multiple values
def get_event_stats(events):
    total = len(events)
    avg_attendees = sum(e["attendees"] for e in events) / total
    return total, avg_attendees    # returns a tuple: (total, avg_attendees)

total, avg_attendees = get_event_stats(events)  # tuple unpacking
```

No wrapping in an object, no destructuring syntax needed. The function returns a tuple, and the caller unpacks it. This pattern is used everywhere in Python.

---

## Lambda Functions vs Arrow Functions

Python has **lambda** expressions for tiny anonymous functions. They're more limited than JavaScript arrow functions, because they can only contain a single expression (no statements, no multiple lines).

```javascript
// JavaScript arrow functions
const double = (n) => n * 2;
const isLarge = (event) => event.attendees > 100;
events.sort((a, b) => a.date.localeCompare(b.date));
```

```python
# Python lambdas
double = lambda n: n * 2
is_large = lambda event: event["attendees"] > 100
events.sort(key=lambda e: e["date"])
```

Notice that Python's `sort()` takes a `key` function instead of a comparator. The `key` function extracts the value to sort by. This is simpler than JavaScript's comparator pattern for most cases:

```python
# Sort events by attendee count, descending
events.sort(key=lambda e: e["attendees"], reverse=True)

# Sort by multiple criteria (category first, then title)
events.sort(key=lambda e: (e["category"], e["title"]))
```

Use lambdas sparingly. If the logic is anything more than a simple expression, write a named function with `def`. Readability beats cleverness.

---

## The Import System

JavaScript has ES modules (`import`/`export`) and CommonJS (`require`). Python has its own import system that's conceptually similar to ES modules.

### Basic Imports

```javascript
// JavaScript ES modules
import fs from 'fs';
import { readFile, writeFile } from 'fs/promises';
import * as path from 'path';
```

```python
# Python imports
import os
from os import path
from pathlib import Path
import json
from datetime import datetime, timedelta
```

### How Python Finds Modules

When you write `import json`, Python looks in this order:
1. Built-in modules (compiled into Python)
2. Files in the current directory
3. Installed packages (in `site-packages`)
4. Standard library locations

### Import Styles

```python
# Import the whole module (access via module.thing)
import json
data = json.loads('{"key": "value"}')

# Import specific items (use directly)
from json import loads, dumps
data = loads('{"key": "value"}')

# Import with alias
import datetime as dt
now = dt.datetime.now()

from collections import Counter as C   # less common, but valid
```

The Python convention: use `import module` for standard library modules and `from module import thing` when you need specific items. Avoid `from module import *` (importing everything), as it pollutes your namespace.

---

## Standard Library Highlights

Python's standard library is famously comprehensive. The saying is "batteries included." Here are the modules you'll use most as a web developer:

```python
# json -- parse and serialize JSON (like JSON.parse/stringify)
import json
data = json.loads('{"title": "Workshop"}')    # string -> dict
text = json.dumps(data, indent=2)             # dict -> formatted string

# os and pathlib -- file system operations (like Node's fs and path)
from pathlib import Path
project_dir = Path(__file__).parent
config_path = project_dir / "config.json"     # / operator joins paths
exists = config_path.exists()

# datetime -- dates and times (no built-in Date like JS)
from datetime import datetime, timedelta
now = datetime.now()
next_week = now + timedelta(days=7)
formatted = now.strftime("%Y-%m-%d %H:%M")    # "2026-03-14 10:30"
parsed = datetime.strptime("2026-04-15", "%Y-%m-%d")

# sys -- system-specific parameters
import sys
print(sys.argv)        # command-line arguments (like process.argv)
sys.exit(1)            # exit with error code

# collections -- specialized containers
from collections import Counter, defaultdict
word_counts = Counter(["python", "python", "js", "python", "js"])
# Counter({"python": 3, "js": 2})

# typing -- type annotations (covered in detail below)
from typing import Optional, Union
```

### pathlib vs os.path

Python has two ways to work with file paths. The modern approach is `pathlib`:

```python
from pathlib import Path

# pathlib (modern, object-oriented)
config = Path("config") / "settings.json"
print(config.name)        # "settings.json"
print(config.suffix)      # ".json"
print(config.parent)      # Path("config")
print(config.exists())    # True/False

# os.path (older, functional)
import os
config = os.path.join("config", "settings.json")
print(os.path.basename(config))    # "settings.json"
print(os.path.exists(config))      # True/False
```

Use `pathlib` for new code. It's more readable and the `/` operator for joining paths is much cleaner than `os.path.join()`.

---

## Type Hints

You learned TypeScript in Module 01, so you already understand the value of type annotations. Python has type hints that serve a similar purpose, but with one critical difference: **Python type hints are not enforced at runtime.** They're documentation and tooling aids only.

```typescript
// TypeScript -- enforced by compiler
function createEvent(title: string, capacity: number): Event {
  return { title, capacity };
}
```

```python
# Python -- not enforced, but used by IDEs and type checkers (mypy, pyright)
def create_event(title: str, capacity: int) -> dict:
    return {"title": title, "capacity": capacity}
```

### Common Type Annotations

```python
# Basic types
name: str = "Gather"
count: int = 42
price: float = 29.99
is_active: bool = True
nothing: None = None

# Collections
events: list[str] = ["Workshop", "Meetup"]
config: dict[str, int] = {"capacity": 100, "min_age": 18}
coordinates: tuple[float, float] = (40.68, -74.04)
tags: set[str] = {"python", "web"}

# Optional (can be None)
from typing import Optional
location: Optional[str] = None    # str or None

# Union (multiple types)
from typing import Union
event_id: Union[str, int] = "evt_001"

# Python 3.10+ syntax (cleaner)
location: str | None = None
event_id: str | int = "evt_001"

# Function signatures
def get_attendees(event_id: str, limit: int = 50) -> list[dict[str, str]]:
    """Return a list of attendee dicts with 'name' and 'email' keys."""
    pass
```

### The typing Module

For complex types, import from `typing`:

```python
from typing import TypedDict, Literal, Callable

# TypedDict -- like a TypeScript interface for dicts
class Event(TypedDict):
    title: str
    capacity: int
    category: str
    is_public: bool

# Literal -- specific allowed values (like TS literal types)
Status = Literal["draft", "published", "cancelled"]

def update_status(event_id: str, status: Status) -> None:
    pass

# Callable -- function types
Handler = Callable[[str, int], bool]   # takes (str, int), returns bool
```

Even though Python won't enforce these at runtime, tools like **mypy** and **pyright** will catch type errors in your editor. Most professional Python projects use type hints extensively.

---

## Decorators

If you understood Higher-Order Components in Module 02, decorators will make immediate sense. A **decorator** is a function that wraps another function to extend its behavior, without modifying the original.

In JavaScript/React:

```javascript
// JavaScript -- Higher-Order Component (from Module 02)
function withAuth(Component) {
  return function AuthenticatedComponent(props) {
    if (!isLoggedIn()) return <Redirect to="/login" />;
    return <Component {...props} />;
  };
}

const ProtectedDashboard = withAuth(Dashboard);
```

In Python:

```python
# Python -- decorator (same concept: wrap a function to add behavior)
import time

def timer(func):
    """Measure how long a function takes to run."""
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        elapsed = time.time() - start
        print(f"{func.__name__} took {elapsed:.2f}s")
        return result
    return wrapper

@timer
def process_events(events):
    """Process a list of events."""
    for event in events:
        # ... processing logic
        pass
    return len(events)

# When you call process_events(), it automatically gets timed
count = process_events(my_events)
# Output: process_events took 0.03s
```

The `@timer` syntax is syntactic sugar for `process_events = timer(process_events)`. It's the same pattern as wrapping a React component with a HOC, but with cleaner syntax.

### Decorators with Arguments

```python
def require_role(role):
    """Only allow users with the specified role."""
    def decorator(func):
        def wrapper(user, *args, **kwargs):
            if user.get("role") != role:
                raise PermissionError(f"Requires {role} role")
            return func(user, *args, **kwargs)
        return wrapper
    return decorator

@require_role("admin")
def delete_event(user, event_id):
    print(f"Deleting event {event_id}")

# Usage
admin = {"name": "Devin", "role": "admin"}
guest = {"name": "Guest", "role": "viewer"}

delete_event(admin, "evt_001")   # Works
delete_event(guest, "evt_001")   # PermissionError: Requires admin role
```

### Common Built-in Decorators

```python
# @property -- make a method act like an attribute
class Event:
    def __init__(self, title, attendees, capacity):
        self.title = title
        self.attendees = attendees
        self.capacity = capacity

    @property
    def fill_rate(self):
        return len(self.attendees) / self.capacity

event = Event("Workshop", ["Maya", "Jordan"], 50)
print(event.fill_rate)   # 0.04 -- accessed like a property, not event.fill_rate()

# @staticmethod -- method that doesn't need self
# @classmethod -- method that gets the class as first argument
```

You'll encounter decorators constantly in Django (Module 06): `@login_required`, `@api_view`, `@permission_classes`, and more. Understanding them now will make Django feel natural.

---

## Putting It Together: Gather Event Helpers

Here's a module of utility functions for the Gather platform, using everything from this lesson:

```python
# gather_utils.py
"""Utility functions for processing Gather event data."""

from datetime import datetime
from typing import Optional
from collections import Counter


def summarize_event(
    title: str,
    attendees: list[str],
    capacity: int,
    *,
    category: str = "general",
) -> dict:
    """Create a summary dict for a single event."""
    return {
        "title": title,
        "category": category,
        "registered": len(attendees),
        "capacity": capacity,
        "fill_rate": len(attendees) / capacity if capacity > 0 else 0,
        "has_space": len(attendees) < capacity,
    }


def top_categories(events: list[dict], n: int = 5) -> list[tuple[str, int]]:
    """Return the top N most common event categories."""
    categories = [e["category"] for e in events]
    return Counter(categories).most_common(n)


def filter_events(
    events: list[dict],
    *,
    category: Optional[str] = None,
    min_attendees: int = 0,
    after: Optional[str] = None,
) -> list[dict]:
    """Filter events by category, minimum attendance, and/or date."""
    results = events

    if category:
        results = [e for e in results if e["category"] == category]

    if min_attendees > 0:
        results = [e for e in results if len(e["attendees"]) >= min_attendees]

    if after:
        cutoff = datetime.strptime(after, "%Y-%m-%d")
        results = [
            e for e in results
            if datetime.strptime(e["date"], "%Y-%m-%d") >= cutoff
        ]

    return results
```

Notice the keyword-only parameters (after `*`), type hints, docstrings, and list comprehensions working together. This is what idiomatic Python looks like.

---

## Key Takeaways

1. Functions use `def`, not `function` or arrow syntax. Docstrings on the first line document the function and are accessible at runtime.
2. **Keyword arguments** let you pass parameters by name (`create_event(capacity=50)`), making function calls self-documenting without needing an options object.
3. `*args` collects extra positional arguments into a tuple. `**kwargs` collects extra keyword arguments into a dict. Use `*` and `**` to unpack them back when calling.
4. Python functions can **return multiple values** via tuples with implicit unpacking: `total, average = get_stats(data)`.
5. **Type hints** work like TypeScript annotations but are not enforced at runtime. Use them for documentation and IDE support. Tools like mypy and pyright provide static checking.
6. **Decorators** wrap functions to add behavior, just like Higher-Order Components wrap React components. The `@decorator` syntax is sugar for `func = decorator(func)`.
7. Python's **standard library** includes json, pathlib, datetime, collections, sys, and dozens more. Check the standard library first before reaching for a third-party package.

---

## Try It Yourself

1. **Rewrite a JS utility**: Pick a utility function from a past JavaScript project and rewrite it in Python. Add type hints and a docstring. Use keyword-only arguments where it improves readability.

2. **Build a filter pipeline**: Write a `filter_events()` function that accepts `**kwargs` for flexible filtering (category, date range, minimum capacity, has_space). Each provided kwarg should narrow the results. Test it with sample Gather event data.

3. **Create a decorator**: Write a `@log_call` decorator that prints the function name and arguments every time the decorated function is called. Then write a `@retry(times=3)` decorator that re-runs the function up to 3 times if it raises an exception.

4. **Standard library scavenger hunt**: Without installing any packages, write a script that: reads a JSON file, extracts all dates from the data, sorts them chronologically, and prints the date range (earliest to latest) in a human-readable format. Use only the standard library.

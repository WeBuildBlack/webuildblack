---
title: "File I/O and Error Handling"
estimatedMinutes: 35
isFreePreview: false
---

# File I/O and Error Handling

Every real application reads and writes files. Configuration, data exports, logs, uploaded content. In JavaScript, you've used `fs.readFile()`, `fs.writeFile()`, and `JSON.parse()`. Python has equivalents for all of these, plus a critical pattern you'll use daily: the **context manager** (`with` statement).

This lesson covers reading and writing files, Python's error handling system (which has a useful feature JavaScript lacks), and working with JSON and CSV data. By the end, you'll build a practical script that reads Gather event data from JSON and writes a summary report to CSV.

---

## Reading Files: open() and Context Managers

In JavaScript (Node.js), reading a file looks like this:

```javascript
// JavaScript -- reading a file
import { readFileSync } from 'fs';

const content = readFileSync('events.json', 'utf-8');
console.log(content);

// Or async
import { readFile } from 'fs/promises';

const content = await readFile('events.json', 'utf-8');
```

In Python:

```python
# Python -- reading a file
with open("events.json", "r") as f:
    content = f.read()

print(content)
```

That `with` statement is a **context manager**. It automatically closes the file when the block exits, even if an error occurs. This is similar to wrapping your JavaScript code in try/finally:

```javascript
// JavaScript equivalent of Python's 'with' pattern
let fileHandle;
try {
  fileHandle = await fs.open('events.json', 'r');
  const content = await fileHandle.readFile({ encoding: 'utf-8' });
  console.log(content);
} finally {
  await fileHandle?.close();
}
```

The Python version is four lines. The JavaScript version is seven. Context managers are one of Python's best features for resource management.

### Reading Methods

```python
with open("events.json", "r") as f:
    # Read the entire file as one string
    content = f.read()

with open("events.json", "r") as f:
    # Read all lines into a list
    lines = f.readlines()   # ["line 1\n", "line 2\n", ...]

with open("events.json", "r") as f:
    # Read one line at a time (memory efficient for large files)
    first_line = f.readline()

# Iterate line by line (most Pythonic for large files)
with open("server.log", "r") as f:
    for line in f:
        if "ERROR" in line:
            print(line.strip())
```

The `"r"` in `open("file", "r")` is the mode. Common modes:

| Mode | Purpose | JavaScript equivalent |
|------|---------|----------------------|
| `"r"` | Read (default) | `fs.readFile()` |
| `"w"` | Write (overwrites) | `fs.writeFile()` |
| `"a"` | Append | `fs.appendFile()` |
| `"r+"` | Read and write | N/A (use separate calls in JS) |
| `"rb"` | Read binary | `fs.readFile()` without encoding |

---

## Writing Files

```javascript
// JavaScript
import { writeFileSync } from 'fs';

writeFileSync('output.txt', 'Hello, Gather!\n');

// Append
import { appendFileSync } from 'fs';
appendFileSync('log.txt', 'New entry\n');
```

```python
# Python -- write (creates or overwrites)
with open("output.txt", "w") as f:
    f.write("Hello, Gather!\n")

# Append
with open("log.txt", "a") as f:
    f.write("New entry\n")

# Write multiple lines
lines = ["Event 1: Workshop\n", "Event 2: Meetup\n", "Event 3: Panel\n"]
with open("events.txt", "w") as f:
    f.writelines(lines)
```

Always use the `with` statement when working with files. If you open a file without `with` and forget to close it, you risk file handle leaks, corrupted writes, and other hard-to-debug issues.

### The pathlib Alternative

The `pathlib` module (from Lesson 3) provides cleaner file I/O for simple cases:

```python
from pathlib import Path

# Read
content = Path("events.json").read_text()

# Write
Path("output.txt").write_text("Hello, Gather!\n")

# Read bytes (for binary files like images)
data = Path("logo.png").read_bytes()
```

For simple read-the-whole-file or write-the-whole-file operations, `pathlib` is more concise. For line-by-line processing, streaming, or appending, use `open()` with `with`.

---

## Error Handling: try/except vs try/catch

JavaScript and Python handle errors with very similar patterns. Python's version has one extra clause that's genuinely useful.

### Basic Pattern

```javascript
// JavaScript
try {
  const data = JSON.parse(rawText);
  console.log(data.title);
} catch (error) {
  console.error("Failed to parse JSON:", error.message);
} finally {
  console.log("Done.");
}
```

```python
# Python
try:
    data = json.loads(raw_text)
    print(data["title"])
except json.JSONDecodeError as error:
    print(f"Failed to parse JSON: {error}")
finally:
    print("Done.")
```

The terminology difference: JavaScript uses `catch`, Python uses `except`. JavaScript throws errors with `throw`, Python raises exceptions with `raise`.

### Catching Specific Exceptions

In JavaScript, you typically catch all errors and check the type inside the catch block. Python lets you catch specific exception types directly:

```javascript
// JavaScript -- one catch block, check type manually
try {
  const data = JSON.parse(rawText);
  processData(data);
} catch (error) {
  if (error instanceof SyntaxError) {
    console.error("Invalid JSON");
  } else if (error instanceof TypeError) {
    console.error("Data processing error");
  } else {
    throw error;  // re-throw unknown errors
  }
}
```

```python
# Python -- separate except blocks for each type
try:
    data = json.loads(raw_text)
    process_data(data)
except json.JSONDecodeError:
    print("Invalid JSON")
except TypeError as e:
    print(f"Data processing error: {e}")
except Exception as e:
    # Catch-all for unexpected errors
    print(f"Unexpected error: {e}")
    raise   # re-raise the exception
```

Each `except` clause handles one type of exception. This is cleaner and more explicit than JavaScript's approach.

### The else Clause (Python's Extra Feature)

Python's try/except has an `else` clause that runs **only if no exception occurred**. JavaScript doesn't have this.

```python
try:
    with open("events.json", "r") as f:
        data = json.load(f)
except FileNotFoundError:
    print("events.json not found, using defaults")
    data = {"events": []}
except json.JSONDecodeError:
    print("events.json contains invalid JSON")
    data = {"events": []}
else:
    # This only runs if NO exception was raised
    print(f"Loaded {len(data['events'])} events successfully")
finally:
    # This always runs
    print(f"Working with {len(data['events'])} events")
```

Why is `else` useful? It separates the code that might fail (in `try`) from the code that should only run on success (in `else`). Without it, you'd put the success logic inside the `try` block, which means any error it raises would also be caught by the `except` clauses. That can mask bugs.

The full structure:

```python
try:
    # Code that might raise an exception
except SomeError:
    # Handle that specific error
except AnotherError:
    # Handle a different error
else:
    # Runs only if try succeeded (no exceptions)
finally:
    # Always runs, success or failure
```

### Raising Exceptions

```javascript
// JavaScript
throw new Error("Event is full");
throw new TypeError("Expected a string");

// Custom error class
class EventFullError extends Error {
  constructor(eventId) {
    super(`Event ${eventId} is at capacity`);
    this.eventId = eventId;
  }
}
throw new EventFullError("evt_001");
```

```python
# Python
raise ValueError("Event is full")
raise TypeError("Expected a string")

# Custom exception class
class EventFullError(Exception):
    def __init__(self, event_id):
        self.event_id = event_id
        super().__init__(f"Event {event_id} is at capacity")

raise EventFullError("evt_001")
```

Python has a richer hierarchy of built-in exceptions. The ones you'll use most:

| Exception | When to use |
|-----------|-------------|
| `ValueError` | Wrong value (e.g., negative capacity) |
| `TypeError` | Wrong type (e.g., string where int expected) |
| `KeyError` | Missing dictionary key |
| `IndexError` | List index out of range |
| `FileNotFoundError` | File doesn't exist |
| `PermissionError` | No access to file/resource |
| `RuntimeError` | General runtime problem |
| `NotImplementedError` | Method not yet implemented |

### EAFP vs LBYL

Python has a cultural preference you won't find in JavaScript: **EAFP** (Easier to Ask Forgiveness than Permission). Instead of checking if something will work before doing it, just do it and handle the exception if it fails.

```python
# LBYL (Look Before You Leap) -- JavaScript-style thinking
if "title" in event:
    title = event["title"]
else:
    title = "Untitled"

# EAFP (Ask Forgiveness) -- Pythonic style
try:
    title = event["title"]
except KeyError:
    title = "Untitled"

# Though for this specific case, .get() is best
title = event.get("title", "Untitled")
```

EAFP is idiomatic Python. You'll see it everywhere in production Python code.

---

## Working with JSON

JSON handling is nearly identical between the two languages, with minor name differences:

```javascript
// JavaScript
const obj = JSON.parse('{"title": "Workshop"}');
const str = JSON.stringify(obj);
const pretty = JSON.stringify(obj, null, 2);
```

```python
# Python
import json

obj = json.loads('{"title": "Workshop"}')     # loads = load string
string = json.dumps(obj)                       # dumps = dump to string
pretty = json.dumps(obj, indent=2)

# Read JSON from a file directly
with open("events.json", "r") as f:
    data = json.load(f)                        # load (no 's') = load from file

# Write JSON to a file directly
with open("output.json", "w") as f:
    json.dump(data, f, indent=2)               # dump (no 's') = dump to file
```

The naming convention is consistent: functions ending in `s` work with **s**trings, functions without `s` work with **files**. `loads`/`dumps` for strings, `load`/`dump` for file objects.

### Type Mapping

| JSON | JavaScript | Python |
|------|-----------|--------|
| `{}` | Object | dict |
| `[]` | Array | list |
| `"string"` | String | str |
| `123` | Number | int |
| `1.5` | Number | float |
| `true`/`false` | Boolean | bool (`True`/`False`) |
| `null` | null | None |

The mapping is automatic. `json.loads()` converts JSON `null` to Python `None`, `true` to `True`, etc.

---

## Working with CSV

JavaScript doesn't have built-in CSV support. You'd use a library like `csv-parser` or `Papa Parse`. Python includes a full CSV module in the standard library.

### Reading CSV

```python
import csv

# Basic reader -- each row is a list of strings
with open("attendees.csv", "r") as f:
    reader = csv.reader(f)
    header = next(reader)    # skip header row
    for row in reader:
        print(row)           # ["Maya", "maya@email.com", "Workshop"]

# DictReader -- each row is a dictionary (much more useful)
with open("attendees.csv", "r") as f:
    reader = csv.DictReader(f)
    for row in reader:
        print(row["name"], row["email"])
```

`csv.DictReader` uses the first row as column names and gives you dictionaries. This is almost always what you want.

### Writing CSV

```python
import csv

# Basic writer
events = [
    ["Workshop", "2026-04-15", 30],
    ["Meetup", "2026-04-22", 45],
    ["Conference", "2026-05-01", 200],
]

with open("events.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["Title", "Date", "Attendees"])   # header
    writer.writerows(events)                            # all data rows

# DictWriter -- write from dictionaries
events = [
    {"title": "Workshop", "date": "2026-04-15", "attendees": 30},
    {"title": "Meetup", "date": "2026-04-22", "attendees": 45},
]

with open("events.csv", "w", newline="") as f:
    fieldnames = ["title", "date", "attendees"]
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(events)
```

The `newline=""` parameter prevents extra blank lines on Windows. Always include it when writing CSV files.

---

## Practical Example: Gather Event Data Pipeline

Let's bring everything together. This script reads a JSON export of Gather events, processes the data, handles errors gracefully, and writes a CSV summary report.

```python
# event_report.py
"""Read Gather event data from JSON and generate a CSV summary report."""

import json
import csv
from pathlib import Path
from datetime import datetime


def load_events(filepath: str) -> list[dict]:
    """Load events from a JSON file with error handling."""
    path = Path(filepath)

    try:
        with open(path, "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: {filepath} not found")
        return []
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {filepath}: {e}")
        return []
    else:
        events = data.get("events", [])
        print(f"Loaded {len(events)} events from {filepath}")
        return events


def process_event(event: dict) -> dict:
    """Transform a raw event into a summary row."""
    attendee_count = len(event.get("attendees", []))
    capacity = event.get("capacity", 0)
    fill_rate = attendee_count / capacity if capacity > 0 else 0

    return {
        "title": event.get("title", "Untitled"),
        "date": event.get("date", "Unknown"),
        "category": event.get("category", "general"),
        "attendees": attendee_count,
        "capacity": capacity,
        "fill_rate": f"{fill_rate:.0%}",
        "status": "Full" if attendee_count >= capacity else "Available",
    }


def write_report(rows: list[dict], output_path: str) -> None:
    """Write processed event data to a CSV file."""
    if not rows:
        print("No data to write")
        return

    fieldnames = rows[0].keys()

    with open(output_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Report written to {output_path} ({len(rows)} events)")


def main():
    # Load
    events = load_events("events.json")
    if not events:
        return

    # Process
    summary_rows = [process_event(event) for event in events]

    # Write
    write_report(summary_rows, "event_report.csv")

    # Print a quick summary to the terminal
    total_attendees = sum(row["attendees"] for row in summary_rows)
    full_events = [row for row in summary_rows if row["status"] == "Full"]
    print(f"\nTotal attendees across all events: {total_attendees}")
    print(f"Events at capacity: {len(full_events)}/{len(summary_rows)}")


if __name__ == "__main__":
    main()
```

This script demonstrates several patterns from the lesson: context managers for file handling, try/except/else for error handling, `.get()` with defaults for safe dictionary access, `csv.DictWriter` for output, and `pathlib` for path handling. The `if __name__ == "__main__"` pattern at the bottom is covered in the next lesson.

---

## Common Gotchas for JS Developers

**1. Forgetting the `with` statement**

```python
# Bad -- file might not get closed
f = open("data.json")
data = json.load(f)
# if an error occurs here, f never gets closed

# Good
with open("data.json") as f:
    data = json.load(f)
```

**2. Catching too broadly**

```python
# Bad -- hides bugs
try:
    process_events(data)
except:
    print("Something went wrong")

# Good -- catch specific exceptions
try:
    process_events(data)
except KeyError as e:
    print(f"Missing required field: {e}")
except ValueError as e:
    print(f"Invalid data: {e}")
```

**3. Confusing json.load() and json.loads()**

```python
# load() reads from a FILE object
with open("data.json") as f:
    data = json.load(f)

# loads() reads from a STRING
data = json.loads('{"key": "value"}')

# Common mistake: passing a filename to loads()
data = json.loads("data.json")   # JSONDecodeError!
```

**4. Missing newline="" in CSV writing**

```python
# Can produce double-spaced output on Windows
with open("report.csv", "w") as f:                      # missing newline=""
    writer = csv.writer(f)

# Correct
with open("report.csv", "w", newline="") as f:          # always include this
    writer = csv.writer(f)
```

---

## Key Takeaways

1. **Context managers** (`with open(...) as f:`) automatically close files when the block exits. Always use them. They replace the try/finally pattern you'd write in JavaScript.
2. Python's try/except has an **`else` clause** that runs only on success. Use it to separate "might fail" code from "on success" code. The full order is: try, except, else, finally.
3. **EAFP** (ask forgiveness, not permission) is Pythonic. Try the operation and handle the exception, rather than checking preconditions.
4. `json.load()`/`json.dump()` work with **files**. `json.loads()`/`json.dumps()` work with **strings**. The `s` stands for string.
5. `csv.DictReader` and `csv.DictWriter` map CSV rows to dictionaries, making column access readable and order-independent.
6. **Catch specific exceptions**, not bare `except:`. Catching everything hides bugs and makes debugging painful.
7. `pathlib.Path` provides clean file I/O for simple cases: `Path("file.txt").read_text()` and `Path("file.txt").write_text("content")`.

---

## Try It Yourself

1. **JSON round-trip**: Create a list of 5 Gather event dictionaries in Python. Write them to `events.json` with pretty formatting. Then read the file back and verify the data matches.

2. **Error handling drill**: Write a function `safe_load_config(filepath)` that reads a JSON config file and returns the parsed data. Handle three specific exceptions: `FileNotFoundError` (return default config), `PermissionError` (print a warning, return default), and `json.JSONDecodeError` (print the line number where parsing failed, return default). Use the `else` clause to log successful loads.

3. **CSV transformer**: Download or create a CSV file with event data (title, date, category, attendee_count, capacity). Write a script that reads it with `DictReader`, filters to events with more than 50% fill rate, and writes the results to a new CSV with an additional "fill_rate" column.

4. **Log analyzer**: Create a fake `server.log` file with lines like `[2026-03-14 10:30:15] INFO: Event created` and `[2026-03-14 10:30:16] ERROR: Database connection failed`. Write a script that reads the log, counts INFO vs ERROR vs WARNING lines, and prints a summary. Use the `in` operator and string methods.

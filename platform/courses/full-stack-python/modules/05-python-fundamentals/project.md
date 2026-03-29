---
title: "Module Project: Gather Event Analytics CLI"
estimatedMinutes: 75
---

# Gather Event Analytics CLI

Build a command-line tool that reads Gather event data from a JSON file, generates different analytics reports, and optionally exports results to CSV.

## Overview

You've spent this module learning Python through the lens of JavaScript. Now it's time to put all five lessons together in one project. You'll build a CLI analytics tool for Gather that parses command-line arguments, reads JSON data, processes it with list comprehensions and dictionary operations, handles errors gracefully, and writes output to the terminal or a CSV file. This is the kind of utility script that Python excels at, and you'll find yourself building tools like this regularly in your career.

## What You'll Practice

- Parsing command-line arguments with `argparse` (from Lesson 1: running Python scripts)
- Working with lists, dictionaries, and sets to analyze data (from Lesson 2: Data Structures)
- Writing functions with type hints, keyword arguments, and docstrings (from Lesson 3: Functions and Modules)
- Reading JSON and writing CSV with proper error handling (from Lesson 4: File I/O and Error Handling)
- Setting up a proper Python project with a virtual environment (from Lesson 5: Virtual Environments)

## Prerequisites

- **Python 3.12+** installed
- Completed all five lessons in this module
- A terminal and text editor

## Project Setup

```bash
mkdir gather-analytics && cd gather-analytics
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
```

No external packages are needed for this project. Everything uses Python's standard library.

Create the project files:

```bash
touch analytics.py events.json
```

### Sample Data: events.json

Copy this into `events.json`. This represents a Gather platform data export:

```json
{
  "exported_at": "2026-03-14T12:00:00Z",
  "platform": "Gather",
  "events": [
    {
      "id": "evt_001",
      "title": "Intro to Python Workshop",
      "organizer": "Devin Jackson",
      "date": "2026-01-15",
      "category": "workshop",
      "attendees": ["Maya", "Jordan", "Alex", "Kai", "Taylor", "Morgan"],
      "capacity": 30
    },
    {
      "id": "evt_002",
      "title": "React Advanced Patterns Meetup",
      "organizer": "Maya Chen",
      "date": "2026-01-22",
      "category": "meetup",
      "attendees": ["Jordan", "Alex", "Riley", "Casey"],
      "capacity": 25
    },
    {
      "id": "evt_003",
      "title": "Career Panel: Breaking Into Tech",
      "organizer": "Devin Jackson",
      "date": "2026-02-05",
      "category": "panel",
      "attendees": ["Maya", "Jordan", "Alex", "Kai", "Taylor", "Morgan", "Riley", "Casey", "Avery", "Quinn", "Sam", "Jamie"],
      "capacity": 50
    },
    {
      "id": "evt_004",
      "title": "Django REST Framework Deep Dive",
      "organizer": "Alex Rivera",
      "date": "2026-02-12",
      "category": "workshop",
      "attendees": ["Maya", "Kai", "Morgan", "Casey", "Avery", "Quinn", "Sam", "Jamie", "Drew", "Skyler"],
      "capacity": 20
    },
    {
      "id": "evt_005",
      "title": "Open Source Contribution Night",
      "organizer": "Jordan Lee",
      "date": "2026-02-19",
      "category": "meetup",
      "attendees": ["Alex", "Taylor", "Riley"],
      "capacity": 40
    },
    {
      "id": "evt_006",
      "title": "AI/ML for Web Developers",
      "organizer": "Devin Jackson",
      "date": "2026-03-01",
      "category": "workshop",
      "attendees": ["Maya", "Jordan", "Alex", "Kai", "Taylor", "Morgan", "Riley", "Casey", "Avery", "Quinn", "Sam", "Jamie", "Drew", "Skyler", "Reese"],
      "capacity": 30
    },
    {
      "id": "evt_007",
      "title": "Tech Interview Prep Session",
      "organizer": "Maya Chen",
      "date": "2026-03-05",
      "category": "workshop",
      "attendees": ["Jordan", "Kai", "Taylor", "Casey", "Quinn", "Drew"],
      "capacity": 15
    },
    {
      "id": "evt_008",
      "title": "Community Game Night",
      "organizer": "Riley Park",
      "date": "2026-03-08",
      "category": "social",
      "attendees": ["Maya", "Jordan", "Alex", "Kai", "Taylor", "Morgan", "Riley", "Casey"],
      "capacity": 50
    },
    {
      "id": "evt_009",
      "title": "TypeScript Migration Strategies",
      "organizer": "Alex Rivera",
      "date": "2026-03-12",
      "category": "meetup",
      "attendees": ["Maya", "Jordan", "Kai", "Morgan", "Avery", "Sam", "Skyler"],
      "capacity": 25
    },
    {
      "id": "evt_010",
      "title": "Mavens I/O Conference Preview",
      "organizer": "Devin Jackson",
      "date": "2026-03-20",
      "category": "panel",
      "attendees": ["Maya", "Jordan", "Alex", "Kai", "Taylor", "Morgan", "Riley", "Casey", "Avery", "Quinn", "Sam", "Jamie", "Drew", "Skyler", "Reese", "Emery", "Sage", "River", "Phoenix", "Rowan"],
      "capacity": 100
    },
    {
      "id": "evt_011",
      "title": "Python Testing with pytest",
      "organizer": "Maya Chen",
      "date": "2026-03-25",
      "category": "workshop",
      "attendees": ["Alex", "Kai", "Morgan", "Casey", "Quinn", "Sam", "Drew", "Skyler"],
      "capacity": 20
    },
    {
      "id": "evt_012",
      "title": "Design Systems Workshop",
      "organizer": "Jordan Lee",
      "date": "2026-04-02",
      "category": "workshop",
      "attendees": ["Maya", "Taylor", "Riley", "Avery", "Jamie", "Reese"],
      "capacity": 25
    }
  ]
}
```

---

## Step-by-Step Instructions

### Step 1: Set Up the CLI with argparse

Python's `argparse` module builds command-line interfaces. It's like `commander` or `yargs` in Node.js, but built into the standard library.

Create the argument parser in `analytics.py`:

```python
"""Gather Event Analytics CLI -- analyze event data from the Gather platform."""

import argparse
import json
import csv
import sys
from datetime import datetime
from collections import Counter


def parse_args():
    """Parse and return command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Analyze Gather event data and generate reports."
    )

    parser.add_argument(
        "report",
        choices=["summary", "top-organizers", "category-breakdown", "attendance-trends"],
        help="Type of report to generate",
    )

    parser.add_argument(
        "--file",
        default="events.json",
        help="Path to the events JSON file (default: events.json)",
    )

    parser.add_argument(
        "--output",
        choices=["terminal", "csv"],
        default="terminal",
        help="Output format (default: terminal)",
    )

    parser.add_argument(
        "--after",
        help="Only include events after this date (YYYY-MM-DD)",
    )

    parser.add_argument(
        "--before",
        help="Only include events before this date (YYYY-MM-DD)",
    )

    return parser.parse_args()


# TODO: Implement the remaining steps below


if __name__ == "__main__":
    args = parse_args()
    print(f"Report: {args.report}")
    print(f"File: {args.file}")
    print(f"Output: {args.output}")
    if args.after:
        print(f"After: {args.after}")
    if args.before:
        print(f"Before: {args.before}")
```

Test it by running:

```bash
python analytics.py summary
python analytics.py top-organizers --output csv
python analytics.py summary --after 2026-03-01
python analytics.py --help
```

The `--help` flag is generated automatically by argparse. Verify all four commands work before moving on.

---

### Step 2: Load and Validate the Events Data

Add a function to read the JSON file with proper error handling:

```python
def load_events(filepath: str) -> list[dict]:
    """Load events from a JSON file.

    Returns a list of event dictionaries, or exits with an error message
    if the file can't be read or parsed.
    """
    # TODO: Open the file using a context manager (with statement)
    # TODO: Parse the JSON data with json.load()
    # TODO: Handle FileNotFoundError -- print a message and sys.exit(1)
    # TODO: Handle json.JSONDecodeError -- print a message and sys.exit(1)
    # TODO: Use the 'else' clause to print how many events were loaded
    # TODO: Extract and return the "events" list from the data
    #       (use .get() with a default of [] in case the key is missing)
    pass
```

---

### Step 3: Implement Date Filtering

Add a function that filters events by date range:

```python
def filter_by_date(
    events: list[dict],
    *,
    after: str | None = None,
    before: str | None = None,
) -> list[dict]:
    """Filter events to those within the specified date range.

    Args:
        events: List of event dictionaries with "date" keys.
        after: Include events on or after this date (YYYY-MM-DD).
        before: Include events on or before this date (YYYY-MM-DD).

    Returns:
        Filtered list of events.
    """
    # TODO: Start with the full events list
    # TODO: If 'after' is provided, parse it to a datetime and filter
    #       events whose date is >= the cutoff
    #       Use datetime.strptime(date_string, "%Y-%m-%d") to parse
    # TODO: If 'before' is provided, do the same with <= comparison
    # TODO: Return the filtered list
    # HINT: List comprehensions make this clean and readable
    pass
```

---

### Step 4: Build the Summary Report

This report shows overall statistics: total events, total attendees, average attendance, fill rate, and the most popular category.

```python
def summary_report(events: list[dict]) -> dict:
    """Generate a summary report of all events.

    Returns a dict with keys: total_events, total_attendees,
    avg_attendance, avg_fill_rate, most_popular_category,
    fullest_event, emptiest_event.
    """
    # TODO: Calculate total_events (len of the list)
    # TODO: Calculate total_attendees (sum of len(e["attendees"]) for each event)
    # TODO: Calculate avg_attendance (total_attendees / total_events), round to 1 decimal
    # TODO: Calculate avg_fill_rate as a percentage string
    #       fill rate = attendees / capacity for each event, then average them
    # TODO: Find most_popular_category using Counter
    #       Counter([e["category"] for e in events]).most_common(1)[0]
    # TODO: Find fullest_event (highest attendees/capacity ratio)
    #       Use max() with a key function
    # TODO: Find emptiest_event (lowest attendees/capacity ratio)
    #       Use min() with a key function
    # TODO: Return all values in a dict
    pass


def print_summary(report: dict) -> None:
    """Print the summary report to the terminal."""
    # TODO: Print each key-value pair in a readable format
    # TODO: Use f-strings for formatting
    # Example output:
    #   === Gather Event Summary ===
    #   Total Events:          12
    #   Total Attendees:       105
    #   Average Attendance:    8.8
    #   Average Fill Rate:     34.2%
    #   Most Popular Category: workshop (6 events)
    #   Fullest Event:         Django REST Framework Deep Dive (50.0%)
    #   Emptiest Event:        Open Source Contribution Night (7.5%)
    pass
```

---

### Step 5: Build the Top Organizers Report

This report ranks organizers by number of events hosted and total attendees drawn.

```python
def top_organizers_report(events: list[dict]) -> list[dict]:
    """Generate a report of organizers ranked by events hosted.

    Returns a list of dicts with keys: organizer, events_hosted,
    total_attendees, avg_attendance.
    """
    # TODO: Build a dictionary mapping organizer name to their events
    #       Iterate through events and group them by organizer
    #       Use a defaultdict(list) or a regular dict with .setdefault()
    # TODO: For each organizer, calculate:
    #       - events_hosted: number of events
    #       - total_attendees: sum of all their events' attendees
    #       - avg_attendance: total_attendees / events_hosted, rounded
    # TODO: Sort by events_hosted descending, then by total_attendees descending
    # TODO: Return the sorted list of dicts
    pass


def print_top_organizers(rows: list[dict]) -> None:
    """Print the top organizers report to the terminal."""
    # TODO: Print a header row
    # TODO: Print each organizer's stats in aligned columns
    # HINT: f-strings with width specifiers help with alignment
    #       f"{'Name':<25} {'Events':>6} {'Total':>8} {'Avg':>6}"
    pass
```

---

### Step 6: Build the Category Breakdown Report

This report shows statistics per event category.

```python
def category_breakdown_report(events: list[dict]) -> list[dict]:
    """Generate a breakdown of events by category.

    Returns a list of dicts with keys: category, event_count,
    total_attendees, avg_attendance, avg_fill_rate.
    """
    # TODO: Group events by category (similar approach to Step 5)
    # TODO: For each category, calculate:
    #       - event_count
    #       - total_attendees
    #       - avg_attendance (rounded to 1 decimal)
    #       - avg_fill_rate as a percentage string
    # TODO: Sort by event_count descending
    # TODO: Return the list
    pass


def print_category_breakdown(rows: list[dict]) -> None:
    """Print the category breakdown to the terminal."""
    # TODO: Print header and rows with aligned columns
    pass
```

---

### Step 7: Add CSV Export

When the user passes `--output csv`, write the report data to a CSV file instead of printing to the terminal.

```python
def export_to_csv(rows: list[dict], report_name: str) -> None:
    """Export report data to a CSV file.

    The filename is based on the report name: {report_name}_report.csv

    Args:
        rows: List of dictionaries (each dict becomes a CSV row).
        report_name: Used to generate the output filename.
    """
    # TODO: Generate the filename from report_name (e.g., "summary_report.csv")
    # TODO: Handle the case where rows is empty (print a message and return)
    # TODO: Get fieldnames from the first row's keys
    # TODO: Open the file with newline="" and write using csv.DictWriter
    # TODO: Write the header row and all data rows
    # TODO: Print a confirmation message with the filename and row count
    #
    # NOTE: The summary report returns a single dict, not a list.
    #       You'll need to handle this case. One approach: wrap it in a list,
    #       or convert the dict to a list of {"metric": key, "value": value} rows.
    pass
```

---

### Step 8: Wire Everything Together in main()

```python
def main():
    """Main entry point: parse args, load data, run report, output results."""
    args = parse_args()

    # TODO: Load events from the file specified by args.file
    # TODO: Apply date filtering if args.after or args.before are provided
    # TODO: Check if any events remain after filtering (exit with message if not)
    # TODO: Based on args.report, call the appropriate report function:
    #       "summary"            -> summary_report() + print_summary()
    #       "top-organizers"     -> top_organizers_report() + print_top_organizers()
    #       "category-breakdown" -> category_breakdown_report() + print_category_breakdown()
    #       "attendance-trends"  -> (stretch goal -- see below)
    # TODO: If args.output == "csv", call export_to_csv() instead of the print function
    pass


if __name__ == "__main__":
    main()
```

---

## Expected Output

When your CLI is complete, these commands should produce clean output:

```bash
python analytics.py summary
```

```
=== Gather Event Summary ===
Total Events:          12
Total Attendees:       105
Average Attendance:    8.8
Average Fill Rate:     34.2%
Most Popular Category: workshop (6 events)
Fullest Event:         Django REST Framework Deep Dive (50.0%)
Emptiest Event:        Open Source Contribution Night (7.5%)
```

```bash
python analytics.py top-organizers
```

```
=== Top Organizers ===
Organizer                 Events  Total Attendees  Avg Attendance
Devin Jackson                  4               53           13.2
Maya Chen                      3               18            6.0
Alex Rivera                    2               17            8.5
Jordan Lee                     2                9            4.5
Riley Park                     1                8            8.0
```

```bash
python analytics.py category-breakdown --after 2026-03-01
```

```
=== Category Breakdown (filtered: after 2026-03-01) ===
Category     Events  Total Attendees  Avg Attendance  Avg Fill Rate
workshop          4               35             8.8          37.3%
panel             1               20            20.0          20.0%
social            1                8             8.0          16.0%
meetup            1                7             7.0          28.0%
```

```bash
python analytics.py summary --output csv
```

```
Report written to summary_report.csv (7 rows)
```

---

## Stretch Goals

1. **Attendance Trends report**: Implement the `attendance-trends` report type. Group events by month, show total events and average attendance per month, and indicate whether attendance is trending up or down compared to the previous month.

2. **Repeat attendee analysis**: Add a `--repeat-attendees` flag that shows which people attend the most events. Use sets to find overlap between events and Counter to rank attendees by frequency.

3. **Color output**: Use ANSI escape codes to add color to terminal output. Make headers bold, highlight events at capacity in red, and show high-attendance events in green. (Don't import any external packages.)

---

## Submission Checklist

Before considering this project complete, verify:

- [ ] All four report types produce correct output (`summary`, `top-organizers`, `category-breakdown`, and at minimum a placeholder for `attendance-trends`)
- [ ] `--help` shows usage information for all arguments
- [ ] `--after` and `--before` flags correctly filter events by date
- [ ] `--output csv` generates a properly formatted CSV file for each report type
- [ ] Error handling works: try a missing file, an invalid date, and an empty result set
- [ ] The code uses type hints on all function signatures
- [ ] Every function has a docstring
- [ ] The project runs from a virtual environment (`.venv` directory exists)
- [ ] No external packages required (standard library only)
- [ ] Code follows Python conventions: `snake_case` names, 4-space indentation, PEP 8 style

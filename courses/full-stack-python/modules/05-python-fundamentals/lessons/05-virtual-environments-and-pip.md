---
title: "Virtual Environments and pip"
estimatedMinutes: 30
isFreePreview: false
---

# Virtual Environments and pip

In JavaScript, every project has its own `node_modules` folder. You run `npm install`, dependencies land in that folder, and different projects can use different versions of the same package without conflict. You probably take this for granted.

Python doesn't work this way by default. Without intervention, `pip install` puts packages into a single global location. If Project A needs `requests==2.28` and Project B needs `requests==2.31`, you're in trouble. Virtual environments solve this problem. They give each project its own isolated set of packages, similar in purpose to `node_modules` but different in mechanism.

This lesson covers virtual environments, pip (Python's package manager), project structure conventions, and the patterns you'll need to set up the Django project in Module 06.

---

## Why Virtual Environments Exist

Here's the core difference between JavaScript and Python dependency management:

| Aspect | JavaScript (npm) | Python (pip) |
|--------|------------------|--------------|
| Default install location | `./node_modules` (per project) | System-wide Python path |
| Isolation | Automatic (per project) | Manual (requires virtual env) |
| Lock file | `package-lock.json` | `requirements.txt` (manual) or `pip freeze` |
| Package manifest | `package.json` | `requirements.txt` or `pyproject.toml` |
| Run scripts | `npx` or `npm run` | Activate the venv first |

In JavaScript, isolation is built into the system. In Python, you opt into isolation by creating a virtual environment. It's one extra step, but once it's part of your workflow, it becomes automatic.

What happens without a virtual environment:

1. You install Django 4.2 globally for Project A
2. Six months later, Project B needs Django 5.0
3. You run `pip install django==5.0`, which upgrades the global install
4. Project A breaks because Django 5.0 changed an API
5. You spend an afternoon debugging something that should never have happened

Virtual environments prevent this entirely.

---

## Creating and Using a Virtual Environment

### Step 1: Create It

Python includes a virtual environment module in the standard library. No extra installation needed.

```bash
python3 -m venv .venv
```

This creates a `.venv` directory in your project containing:
- A copy of the Python interpreter
- Its own `pip` installation
- An empty `site-packages` directory for your project's packages

The `.venv` name is a convention (like `node_modules`). Some developers use `venv` or `env`, but `.venv` is the most common. The leading dot hides it in file listings on macOS/Linux.

### Step 2: Activate It

```bash
# macOS / Linux
source .venv/bin/activate

# Windows (Command Prompt)
.venv\Scripts\activate

# Windows (PowerShell)
.venv\Scripts\Activate.ps1
```

When activated, your terminal prompt changes to show the environment name:

```bash
(.venv) $
```

This means all `python` and `pip` commands now use the virtual environment's copies. Any packages you install go into `.venv/lib/`, not the global Python installation.

### Step 3: Deactivate When Done

```bash
deactivate
```

Your prompt returns to normal. You're back to the global Python.

### Quick Reference

```bash
# Full workflow for a new project
mkdir gather-analytics && cd gather-analytics
python3 -m venv .venv
source .venv/bin/activate        # activate
pip install requests             # install into this venv only
python main.py                   # runs with this venv's Python
deactivate                       # leave the venv
```

---

## pip: Python's Package Manager

`pip` is to Python what `npm` is to JavaScript. Here's a side-by-side comparison:

### Installing Packages

```bash
# npm                              # pip
npm install express                 pip install flask
npm install express@4.18            pip install flask==3.0.0
npm install --save-dev jest         pip install pytest       # no separate dev flag
npm install                         pip install -r requirements.txt
```

Python doesn't have a built-in concept of "dev dependencies" like npm's `devDependencies`. By convention, some projects use two files: `requirements.txt` (production) and `requirements-dev.txt` (development/testing). But this isn't enforced by pip.

### Managing Packages

```bash
# List installed packages
pip list

# Show info about a package
pip show flask

# Uninstall a package
pip uninstall flask

# Upgrade a package
pip install --upgrade flask

# Check for outdated packages
pip list --outdated
```

### Freezing Dependencies

The equivalent of `package-lock.json` is generated manually with `pip freeze`:

```bash
# Generate a requirements file from currently installed packages
pip freeze > requirements.txt
```

This creates a file like:

```
click==8.1.7
flask==3.0.0
itsdangerous==2.1.2
jinja2==3.1.3
markupsafe==2.1.4
werkzeug==3.0.1
```

Every package is pinned to an exact version. To recreate this exact environment:

```bash
pip install -r requirements.txt
```

This is how you share your project with other developers. They clone the repo, create a venv, and run `pip install -r requirements.txt`. Same packages, same versions.

### Comparison Table

| Task | npm | pip |
|------|-----|-----|
| Install from manifest | `npm install` | `pip install -r requirements.txt` |
| Add a package | `npm install pkg` | `pip install pkg` |
| Remove a package | `npm uninstall pkg` | `pip uninstall pkg` |
| List installed | `npm list` | `pip list` |
| Generate lock file | Automatic (`package-lock.json`) | Manual (`pip freeze > requirements.txt`) |
| Run a script | `npm run dev` | No built-in equivalent (use Makefile or scripts) |

---

## Project Structure Conventions

JavaScript projects have `package.json` at the root. Python projects have their own conventions:

### Simple Script Project

```
gather-analytics/
├── .venv/                    # Virtual environment (like node_modules)
├── .gitignore                # Must include .venv/
├── requirements.txt          # Dependencies (like package.json)
├── main.py                   # Entry point
└── utils.py                  # Helper functions
```

### Module-Based Project (src Layout)

For larger projects, Python uses a "source" layout with packages (directories containing an `__init__.py` file):

```
gather-platform/
├── .venv/
├── .gitignore
├── requirements.txt
├── requirements-dev.txt      # Dev/test dependencies
├── pyproject.toml            # Modern project metadata (optional)
├── src/
│   └── gather/               # Your package
│       ├── __init__.py       # Makes this directory a Python package
│       ├── models.py
│       ├── api.py
│       └── utils/
│           ├── __init__.py
│           ├── formatting.py
│           └── validation.py
├── tests/
│   ├── __init__.py
│   ├── test_models.py
│   └── test_api.py
└── scripts/
    └── seed_data.py
```

### __init__.py Explained

The `__init__.py` file tells Python "this directory is a package that can be imported." It can be empty or contain initialization code:

```python
# src/gather/__init__.py
"""Gather platform core package."""

__version__ = "1.0.0"
```

```python
# src/gather/utils/__init__.py
"""Utility functions for the Gather platform."""

from .formatting import format_date, format_currency
from .validation import validate_email, validate_event
```

That second example re-exports functions from submodules, so users can write:

```python
from gather.utils import format_date
```

Instead of:

```python
from gather.utils.formatting import format_date
```

This is similar to barrel exports in JavaScript/TypeScript (`index.ts` files that re-export from submodules).

### JavaScript Comparison

| Python | JavaScript |
|--------|-----------|
| `__init__.py` | `index.js` / `index.ts` |
| Package (directory with `__init__.py`) | Module directory with `index.js` |
| `from gather.utils import format_date` | `import { formatDate } from './gather/utils'` |
| `import gather` | `import * as gather from './gather'` |

---

## The __name__ == "__main__" Pattern

You've probably seen this at the bottom of Python files:

```python
if __name__ == "__main__":
    main()
```

This is Python's way of determining whether a file is being run directly or imported as a module. It's similar to a concept that JavaScript doesn't have natively.

```python
# analytics.py

def calculate_stats(events):
    """Calculate event statistics."""
    total = len(events)
    avg_attendees = sum(e["attendees"] for e in events) / total
    return total, avg_attendees


def main():
    """Run analytics on sample data."""
    sample_events = [
        {"title": "Workshop", "attendees": 30},
        {"title": "Meetup", "attendees": 45},
    ]
    total, avg = calculate_stats(sample_events)
    print(f"Total events: {total}, Average attendance: {avg}")


if __name__ == "__main__":
    main()
```

When you run `python3 analytics.py` directly, Python sets `__name__` to `"__main__"`, so `main()` executes. But when another file imports this module:

```python
# report.py
from analytics import calculate_stats

# calculate_stats is available, but main() didn't run
```

The `main()` function does NOT execute on import. Without the `if __name__` guard, `main()` would run every time someone imported your module, which is almost never what you want.

JavaScript doesn't have this pattern because ES modules don't execute top-level code on import (only when explicitly called). But in Python, top-level code DOES execute on import. The `if __name__` guard prevents that.

---

## .gitignore for Python

Just like you never commit `node_modules`, you never commit `.venv`. Here's a Python `.gitignore`:

```
# Virtual environment
.venv/
env/
venv/

# Python cache files
__pycache__/
*.pyc
*.pyo

# Distribution
*.egg-info/
dist/
build/

# IDE
.vscode/
.idea/

# Environment variables
.env
.env.local
```

Python generates `__pycache__` directories and `.pyc` files (compiled bytecode) automatically. They speed up imports but should never be committed.

---

## pyproject.toml: The Modern Alternative

`requirements.txt` works, but it's minimal. Modern Python projects increasingly use `pyproject.toml` (similar in spirit to `package.json`):

```toml
[project]
name = "gather-analytics"
version = "1.0.0"
description = "Analytics tools for the Gather event platform"
requires-python = ">=3.12"
dependencies = [
    "requests>=2.31",
    "click>=8.1",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "mypy>=1.0",
]

[project.scripts]
gather-stats = "gather.cli:main"
```

This is the direction Python packaging is moving. For this course, `requirements.txt` is sufficient. You'll encounter `pyproject.toml` in open-source Django projects and larger codebases.

---

## Setting Up for Django (Module 06 Preview)

Everything in this lesson comes together when you start a Django project. Here's what that setup looks like, so the process feels familiar when you get to Module 06:

```bash
# Create project directory
mkdir gather-backend && cd gather-backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install Django
pip install django==5.0

# Freeze dependencies
pip freeze > requirements.txt

# Create the Django project
django-admin startproject config .

# Verify it works
python manage.py runserver
```

After running these commands, your project looks like:

```
gather-backend/
├── .venv/
├── requirements.txt          # contains: Django==5.0, asgiref, sqlparse
├── manage.py                 # Django's CLI (like npx in some ways)
└── config/
    ├── __init__.py
    ├── settings.py           # Project configuration
    ├── urls.py               # URL routing (like Express routes)
    ├── asgi.py
    └── wsgi.py
```

The virtual environment isolates Django to this project. The `requirements.txt` lets any collaborator recreate the exact same setup. The `__init__.py` file makes `config/` an importable Python package. Every concept from this lesson is in play.

---

## Quick Reference: New Project Checklist

When starting any Python project, follow this sequence:

```bash
# 1. Create project directory
mkdir my-project && cd my-project

# 2. Create virtual environment
python3 -m venv .venv

# 3. Activate it
source .venv/bin/activate

# 4. Upgrade pip (good practice)
pip install --upgrade pip

# 5. Install dependencies
pip install package1 package2

# 6. Freeze them
pip freeze > requirements.txt

# 7. Create .gitignore
echo ".venv/\n__pycache__/\n*.pyc\n.env" > .gitignore

# 8. Initialize git
git init && git add . && git commit -m "Initial project setup"
```

Compare to the JavaScript equivalent you already know:

```bash
mkdir my-project && cd my-project
npm init -y
npm install package1 package2
echo "node_modules/" > .gitignore
git init && git add . && git commit -m "Initial project setup"
```

The Python version has two extra steps (create venv, activate venv), but the workflow is otherwise the same.

---

## Key Takeaways

1. **Virtual environments** isolate project dependencies, similar to how `node_modules` works per-project in JavaScript. Create one with `python3 -m venv .venv` and activate with `source .venv/bin/activate`.
2. **pip** is Python's package manager. `pip install` adds packages, `pip freeze > requirements.txt` generates a lockfile, and `pip install -r requirements.txt` installs from it.
3. **Never commit `.venv/`** to git. It's like `node_modules`. Always add it to `.gitignore`.
4. The **`__init__.py`** file makes a directory importable as a Python package. It's the equivalent of `index.js` barrel exports in JavaScript.
5. The **`if __name__ == "__main__":`** guard prevents code from running when a file is imported. Use it in every file that has a `main()` function.
6. **`__pycache__/`** directories contain compiled bytecode files. They're auto-generated and should be gitignored.
7. For Django and larger projects, set up a **src layout** with `pyproject.toml`. For scripts and small tools, `requirements.txt` at the project root is sufficient.

---

## Try It Yourself

1. **Full project setup**: Create a new directory called `gather-tools`. Set up a virtual environment, activate it, install the `requests` and `python-dateutil` packages, freeze your dependencies, and create a proper `.gitignore`. Verify that `pip list` shows only your installed packages (not the global ones).

2. **Package structure**: Inside `gather-tools`, create a package called `gather` with three modules: `events.py` (event processing functions), `reports.py` (report generation), and `__init__.py` (re-export key functions from both modules). Write a `main.py` that imports from your package and runs a demo.

3. **Dual environment test**: Create two separate project directories. In one, install `requests==2.28.0`. In the other, install `requests==2.31.0`. Verify that each environment has the correct version by running `python -c "import requests; print(requests.__version__)"` in each.

4. **Prep for Django**: Follow the Django setup preview from this lesson. Create the project, run the development server, and visit `http://localhost:8000` to see the Django welcome page. Then deactivate the venv and try running the server again to see what happens (it should fail, proving the isolation works).

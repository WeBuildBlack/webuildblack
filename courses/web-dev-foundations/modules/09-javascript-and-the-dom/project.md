---
title: "Module Project: Task Manager"
estimatedMinutes: 90
---

# Module Project: Task Manager

You have spent this module learning how to select elements, modify the DOM, handle events, save data with `localStorage`, and fetch data from APIs. Now it is time to put all of those skills together in one cohesive project.

You are going to build a **Task Manager**, a fully interactive to-do list that runs entirely in the browser. Users can add tasks with priorities, mark them complete, delete them, filter by status, and see a count of remaining tasks. Best of all, their tasks will be saved to `localStorage` so nothing is lost when they close the browser.

This is not a toy project. Task managers are one of the most common applications built by developers learning frontend JavaScript, and the patterns you use here (dynamic list rendering, event delegation, state management, and persistent storage) are the same patterns used in professional applications.

---

## What You Are Building

Your completed task manager will have these features:

- An input field for the task name and a dropdown to select priority (Low, Medium, High)
- An "Add Task" button that adds the task to the list
- Each task displays its name, priority, and has buttons to complete and delete it
- Clicking the complete button toggles a strikethrough style on the task
- Clicking the delete button removes the task from the list
- Filter buttons (All, Active, Completed) show only the relevant tasks
- A counter showing how many active (incomplete) tasks remain
- All tasks are saved to `localStorage` and loaded when the page opens

---

## Starter Code

Create a project folder with two files: `index.html` and `app.js`. The HTML and CSS are provided complete below. **Your job is to write all the JavaScript in `app.js`.**

### `index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task Manager</title>
    <style>
      /* ===== Reset & Base ===== */
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background-color: #f5f0eb;
        color: #2C170B;
        min-height: 100vh;
        display: flex;
        justify-content: center;
        padding: 40px 16px;
      }

      /* ===== App Container ===== */
      .app {
        background: white;
        border-radius: 16px;
        box-shadow: 0 4px 24px rgba(44, 23, 11, 0.1);
        width: 100%;
        max-width: 560px;
        padding: 32px;
      }

      .app h1 {
        font-size: 28px;
        margin-bottom: 24px;
        color: #2C170B;
      }

      /* ===== Add Task Form ===== */
      .add-task-form {
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
      }

      #task-input {
        flex: 1;
        padding: 10px 14px;
        border: 2px solid #ddd;
        border-radius: 8px;
        font-size: 16px;
        outline: none;
        transition: border-color 0.2s;
      }

      #task-input:focus {
        border-color: #7D4E21;
      }

      #priority-select {
        padding: 10px 12px;
        border: 2px solid #ddd;
        border-radius: 8px;
        font-size: 14px;
        background: white;
        outline: none;
        cursor: pointer;
      }

      #add-task-btn {
        padding: 10px 20px;
        background-color: #7D4E21;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      #add-task-btn:hover {
        background-color: #2C170B;
      }

      /* ===== Filter Buttons ===== */
      .filters {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
      }

      .filter-btn {
        padding: 8px 16px;
        border: 2px solid #ddd;
        border-radius: 20px;
        background: white;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }

      .filter-btn.active {
        background-color: #7D4E21;
        color: white;
        border-color: #7D4E21;
      }

      .filter-btn:hover:not(.active) {
        border-color: #AE8156;
      }

      /* ===== Task List ===== */
      #task-list {
        list-style: none;
        margin-bottom: 16px;
      }

      .task-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-bottom: 1px solid #eee;
        transition: opacity 0.2s;
      }

      .task-item:last-child {
        border-bottom: none;
      }

      .task-item.completed .task-name {
        text-decoration: line-through;
        opacity: 0.5;
      }

      .task-name {
        flex: 1;
        font-size: 16px;
      }

      .task-priority {
        font-size: 12px;
        font-weight: bold;
        padding: 3px 10px;
        border-radius: 12px;
        text-transform: uppercase;
      }

      .priority-low { background: #d4edda; color: #155724; }
      .priority-medium { background: #fff3cd; color: #856404; }
      .priority-high { background: #f8d7da; color: #721c24; }

      .complete-btn, .delete-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 18px;
        padding: 4px;
        border-radius: 4px;
        transition: background-color 0.2s;
      }

      .complete-btn:hover { background-color: #d4edda; }
      .delete-btn:hover { background-color: #f8d7da; }

      /* ===== Task Counter ===== */
      #task-counter {
        font-size: 14px;
        color: #888;
        text-align: center;
        padding-top: 8px;
        border-top: 1px solid #eee;
      }

      /* ===== Empty State ===== */
      .empty-state {
        text-align: center;
        padding: 32px;
        color: #aaa;
        font-size: 16px;
      }
    </style>
    <script src="app.js" defer></script>
  </head>
  <body>
    <div class="app">
      <h1>Task Manager</h1>

      <div class="add-task-form">
        <input type="text" id="task-input" placeholder="What needs to be done?">
        <select id="priority-select">
          <option value="low">Low</option>
          <option value="medium" selected>Medium</option>
          <option value="high">High</option>
        </select>
        <button id="add-task-btn">Add</button>
      </div>

      <div class="filters">
        <button class="filter-btn active" data-filter="all">All</button>
        <button class="filter-btn" data-filter="active">Active</button>
        <button class="filter-btn" data-filter="completed">Completed</button>
      </div>

      <ul id="task-list"></ul>

      <p id="task-counter"></p>
    </div>
  </body>
</html>
```

---

## Your JavaScript: `app.js`

Open `app.js` and implement the following. Each section has detailed guidance and the code structure you should follow.

### Step 1: Set Up Your Data and Select Elements

```javascript
// ===== STATE =====
// Your tasks array is the "single source of truth" for the app.
// Each task is an object: { id: number, name: string, priority: string, completed: boolean }
// Load from localStorage if available, otherwise start with an empty array.

// TODO: Load tasks from localStorage (key: "tasks")
// If localStorage has saved tasks, parse them. If not, use an empty array.
let tasks = [];

// Track which filter is currently active
let currentFilter = "all";

// ===== DOM ELEMENTS =====
// TODO: Select all the DOM elements you will need:
// - #task-input (the text input)
// - #priority-select (the priority dropdown)
// - #add-task-btn (the add button)
// - #task-list (the <ul> where tasks are displayed)
// - #task-counter (the paragraph showing active task count)
// - All .filter-btn elements
```

### Step 2: Render Tasks

Create a function called `renderTasks()` that clears the task list and re-renders all tasks based on the current data and filter. This function will be called every time something changes.

```javascript
// ===== RENDER =====
// TODO: Create a renderTasks() function that:
//
// 1. Clears the #task-list innerHTML
//
// 2. Filters the tasks array based on currentFilter:
//    - "all" → show all tasks
//    - "active" → show only tasks where completed is false
//    - "completed" → show only tasks where completed is true
//
// 3. If no tasks match the filter, display an empty state message:
//    <li class="empty-state">No tasks to show</li>
//
// 4. For each task in the filtered array, create a <li> element:
//    <li class="task-item" data-id="TASK_ID">
//      <button class="complete-btn">CHECK_OR_UNDO</button>
//      <span class="task-name">TASK_NAME</span>
//      <span class="task-priority priority-LEVEL">LEVEL</span>
//      <button class="delete-btn">DELETE_SYMBOL</button>
//    </li>
//
//    - If the task is completed, add the class "completed" to the <li>
//    - The complete button text: use the string "✓" for incomplete tasks,
//      or "↩" for completed tasks
//    - The priority span class should be "task-priority priority-low",
//      "task-priority priority-medium", or "task-priority priority-high"
//    - The delete button text: use the string "✕"
//    - Set data-id on the <li> to the task's id
//
// 5. Update the task counter text: "X tasks remaining"
//    (count only tasks where completed is false)
//
// 6. Save the tasks array to localStorage (key: "tasks")
```

**Tip**: You can build each `<li>` using `document.createElement()` and `appendChild()`, or by building an HTML string and setting `innerHTML`. Both approaches work. Using `createElement` is safer (no XSS risk) and is good practice for this project.

### Step 3: Add Tasks

```javascript
// ===== ADD TASK =====
// TODO: Create a function called addTask() that:
//
// 1. Gets the value from #task-input and trim any whitespace
// 2. If the input is empty, return early (do nothing)
// 3. Creates a new task object:
//    { id: Date.now(), name: trimmedValue, priority: selectedPriority, completed: false }
//    - Date.now() gives a unique number (milliseconds since 1970) - good enough for a unique ID
// 4. Pushes the new task onto the tasks array
// 5. Clears the input field
// 6. Calls renderTasks()
//
// TODO: Add an event listener on #add-task-btn that calls addTask()
//
// TODO: Add a "keydown" event listener on #task-input so pressing Enter also adds a task
//       (check if event.key === "Enter")
```

### Step 4: Complete and Delete Tasks (Event Delegation)

```javascript
// ===== COMPLETE & DELETE =====
// TODO: Add a single click event listener on #task-list (event delegation)
//
// Inside the handler, check what was clicked:
//
// If event.target has the class "complete-btn":
//   1. Find the parent <li> element (event.target.closest(".task-item"))
//   2. Get the task ID from the <li>'s data-id attribute
//      (remember: dataset values are strings, so convert to a number with Number())
//   3. Find the task in the tasks array with that ID
//   4. Toggle its completed property (true becomes false, false becomes true)
//   5. Call renderTasks()
//
// If event.target has the class "delete-btn":
//   1. Find the parent <li> element
//   2. Get the task ID
//   3. Remove the task from the tasks array
//      (use .filter() to create a new array without that task)
//   4. Call renderTasks()
```

### Step 5: Filter Tasks

```javascript
// ===== FILTERS =====
// TODO: Add a click event listener to each .filter-btn
//
// When a filter button is clicked:
// 1. Remove the "active" class from ALL filter buttons
// 2. Add the "active" class to the clicked button
// 3. Set currentFilter to the button's data-filter value ("all", "active", or "completed")
// 4. Call renderTasks()
```

### Step 6: Initialize

```javascript
// ===== INIT =====
// TODO: Call renderTasks() once at the end of the file to display any saved tasks on page load
```

---

## Testing Your App

Work through this checklist to make sure everything works:

- [ ] **Add a task**: Type "Learn HTML" and click Add. It appears in the list with Medium priority.
- [ ] **Add with Enter key**: Type "Learn CSS" and press Enter. It appears.
- [ ] **Change priority**: Select "High" from the dropdown, type "Study for interview", click Add. It shows a red "HIGH" badge.
- [ ] **Empty input**: Click Add without typing anything. Nothing should happen.
- [ ] **Mark complete**: Click the checkmark on a task. It gets a strikethrough and the button changes to an undo symbol.
- [ ] **Undo complete**: Click the undo button. The task is active again.
- [ ] **Delete a task**: Click the X on a task. It is removed from the list.
- [ ] **Task counter**: Check that the counter correctly shows the number of *active* (not completed) tasks.
- [ ] **Filter: All**: Click "All". All tasks are shown.
- [ ] **Filter: Active**: Click "Active". Only incomplete tasks are shown.
- [ ] **Filter: Completed**: Click "Completed". Only completed tasks are shown.
- [ ] **Persistence**: Add several tasks, complete some, then refresh the page. Everything should still be there.
- [ ] **Empty state**: Delete all tasks (or filter to a category with none). You should see "No tasks to show."

---

## Stretch Goals

If you finish the core features and want to push further, try these:

1. **Edit task text**: Double-click a task name to turn it into an editable input field. Press Enter to save the change.
2. **Due dates**: Add a date input to the add form. Display the due date on each task and highlight tasks that are overdue.
3. **Categories/tags**: Add a text input for tags (e.g., "work", "personal"). Display tags as small badges on each task.
4. **Clear completed**: Add a "Clear Completed" button that removes all completed tasks at once.
5. **Drag to reorder**: Research the HTML Drag and Drop API and implement drag-to-reorder for tasks.
6. **Multiple lists**: Allow users to create named lists (e.g., "Work", "Personal", "Shopping") and switch between them.

---

## Submission Checklist

Before you consider this project complete, confirm:

- [ ] Tasks can be added with a name and priority
- [ ] Tasks can be marked complete and unmarked
- [ ] Tasks can be deleted
- [ ] Filters correctly show All / Active / Completed tasks
- [ ] The task counter accurately reflects active tasks
- [ ] Tasks persist across page refreshes (localStorage works)
- [ ] The empty state message shows when no tasks match the current filter
- [ ] No errors appear in the browser DevTools console
- [ ] The app handles edge cases: empty input, rapid clicking, refreshing mid-use

You built this. Every line of JavaScript, every DOM manipulation, every event handler. You wrote it. This is a real, functional web application. Take a screenshot, share it in the WBB Slack, and be proud of how far you have come.

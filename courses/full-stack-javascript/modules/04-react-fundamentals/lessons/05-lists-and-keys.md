---
title: "Lists and Keys"
estimatedMinutes: 30
---

# Lists and Keys

Rendering lists of data is something you will do in nearly every React component you write. Product catalogs, comment threads, navigation menus, notification feeds -- all of them are lists. React handles lists through plain JavaScript array methods, primarily `.map()`. This lesson covers how to render lists correctly, why the `key` prop matters deeply (and what breaks without it), common anti-patterns, and how to filter and sort before rendering.

---

## Rendering Lists with `.map()`

React renders arrays of elements just like single elements. `.map()` transforms an array of data into an array of JSX elements, which React renders in order.

```jsx
function ProgramList({ programs }) {
  return (
    <ul className="program-list">
      {programs.map(program => (
        <li key={program.id} className="program-list__item">
          <h3>{program.name}</h3>
          <p>{program.description}</p>
        </li>
      ))}
    </ul>
  );
}

// Example data
const programs = [
  { id: 'ft', name: 'Fast Track', description: 'Workforce training with stipends.' },
  { id: 'coc', name: 'Crowns of Code', description: 'Youth coding program.' },
  { id: 'tb', name: 'The Bridge', description: 'Interview accountability cohort.' },
];
```

The array returned by `.map()` is inserted directly into the JSX tree. React renders each element in sequence.

You can also extract the map into a variable above the return for readability:

```jsx
function ProgramList({ programs }) {
  const programItems = programs.map(program => (
    <li key={program.id} className="program-list__item">
      <h3>{program.name}</h3>
      <p>{program.description}</p>
    </li>
  ));

  return (
    <ul className="program-list">
      {programItems}
    </ul>
  );
}
```

Both approaches work. Use whichever is clearer in context. When the render logic for each item is complex, extracting it into its own component is even better:

```jsx
function ProgramCard({ program }) {
  return (
    <li className="program-card">
      <h3>{program.name}</h3>
      <p>{program.description}</p>
      <a href={`/programs/${program.slug}`}>Learn more</a>
    </li>
  );
}

function ProgramList({ programs }) {
  return (
    <ul className="program-list">
      {programs.map(program => (
        <ProgramCard key={program.id} program={program} />
      ))}
    </ul>
  );
}
```

---

## The `key` Prop: Why It Matters

When you render a list, React needs a way to identify each item so it can efficiently update only what changed -- not re-render the entire list. The `key` prop provides that identity.

```jsx
// React requires a key on each element in a list
{items.map(item => (
  <ItemComponent key={item.id} item={item} />
))}
```

Without keys, React gets a console warning and falls back to a naive diffing strategy that re-renders the entire list on every change. With proper keys, React can:

- Add a new item without re-rendering existing items
- Remove an item without disturbing others
- Reorder items (from a drag-and-drop or sort) without destroying component state

Let's make this concrete. Suppose you have a list of items with local state (like open/closed accordion panels) and you insert a new item at the beginning:

```jsx
// Without proper keys, React uses position to identify elements.
// Inserting at the front shifts every element's position by one,
// so React thinks EVERY item changed -- it re-renders all of them
// and may incorrectly match state to the wrong items.

// With proper keys (stable IDs), React correctly identifies:
// "item-3 is new, insert it. item-1 and item-2 are the same, leave their state alone."
```

**Keys must be:**
1. Unique among siblings (not globally unique -- just unique within the same list)
2. Stable across re-renders (the same item should always have the same key)
3. Strings or numbers (not objects)

```jsx
// Good: using a database/API ID
{users.map(user => <UserRow key={user.id} user={user} />)}

// Good: using a unique slug
{courses.map(course => <CourseCard key={course.slug} course={course} />)}

// Good: using a natural unique identifier
{countries.map(country => <Option key={country.code} country={country} />)}
```

---

## Anti-Pattern: Index as Key

Using the array index as a key is a common mistake. React accepts it without warning, but it causes subtle bugs.

```jsx
// Looks fine, but causes bugs
{items.map((item, index) => (
  <ItemComponent key={index} item={item} />
))}
```

The problem: index is positional, not identity-based. When the list order changes (a new item is inserted at the front, an item is deleted, the list is sorted), indices shift. React maps the new indices to the old component instances -- matching the wrong state to the wrong items.

Scenario: each item in your list has a text input with local state. User types "hello" into item #2. A new item is inserted at position 0. Now:

- What was index 0 is now index 1
- What was index 1 (with "hello" in the input) is now index 2
- React, using indices as keys, matches the input state from old index 1 to new index 1 -- but new index 1 is a different item

The text "hello" appears in the wrong input. This is silent, hard to reproduce, and maddening to debug.

**When index as key is acceptable:** only when all three are true:
1. The list is static (never reordered, filtered, or inserted into)
2. The items have no local state
3. You have no stable unique identifier

Even then, it is worth generating a stable ID if you can.

```jsx
// If your data has no ID, add one when you create it (not at render time)
const newItem = { ...itemData, id: crypto.randomUUID() };

// Don't generate IDs inside map -- that creates a new ID every render
// Wrong:
{items.map(item => <Item key={crypto.randomUUID()} item={item} />)}  // New key every render = always remounts

// Right: ID should be on the data, not generated during render
{items.map(item => <Item key={item.id} item={item} />)}
```

---

## Where the `key` Goes

The `key` prop goes on the outermost element returned from `.map()`, not necessarily the component's root element.

```jsx
// Key goes on the element returned from map -- not inside the component
{items.map(item => (
  <ItemCard key={item.id} item={item} />   // Correct: key on the mapped element
))}

// If you're using a Fragment as the outer wrapper:
{items.map(item => (
  <React.Fragment key={item.id}>
    <dt>{item.term}</dt>
    <dd>{item.definition}</dd>
  </React.Fragment>
))}

// The shorthand <> </> does NOT accept a key -- use React.Fragment for that
```

The `key` prop is not accessible inside the component -- it is for React's internal use only. If you need the ID inside the component, pass it as a separate prop:

```jsx
{items.map(item => (
  <ItemCard
    key={item.id}
    id={item.id}      // Pass it explicitly if the component needs it
    item={item}
  />
))}
```

---

## Filtering Lists

Filter data before rendering by chaining `.filter()` before `.map()`. This keeps your render logic simple.

```jsx
function ActiveCohortList({ cohorts }) {
  return (
    <ul>
      {cohorts
        .filter(cohort => cohort.status === 'active')
        .map(cohort => (
          <CohortCard key={cohort.id} cohort={cohort} />
        ))}
    </ul>
  );
}

// More complex filter with multiple conditions
function CourseList({ courses, filter }) {
  const filteredCourses = courses.filter(course => {
    const matchesDifficulty = !filter.difficulty || course.difficulty === filter.difficulty;
    const matchesPrice = !filter.freeOnly || course.priceCents === 0;
    const matchesSearch = !filter.query ||
      course.title.toLowerCase().includes(filter.query.toLowerCase());

    return matchesDifficulty && matchesPrice && matchesSearch;
  });

  if (filteredCourses.length === 0) {
    return <p className="empty-state">No courses match your filters.</p>;
  }

  return (
    <div className="course-grid">
      {filteredCourses.map(course => (
        <CourseCard key={course.slug} course={course} />
      ))}
    </div>
  );
}
```

---

## Sorting Lists

Sort data before rendering by calling `.slice()` first (to avoid mutating the original array) and then `.sort()`.

```jsx
function LeaderBoard({ members }) {
  // .slice() creates a copy so we don't mutate the prop
  const sorted = members
    .slice()
    .sort((a, b) => b.score - a.score);  // Descending by score

  return (
    <ol className="leaderboard">
      {sorted.map((member, index) => (
        <li key={member.id} className="leaderboard__item">
          <span className="rank">#{index + 1}</span>
          <span className="name">{member.name}</span>
          <span className="score">{member.score} pts</span>
        </li>
      ))}
    </ol>
  );
}
```

You can chain filter, sort, and map together:

```jsx
function FilteredSortedList({ items, query, sortBy }) {
  const displayItems = items
    .filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'date') return new Date(b.createdAt) - new Date(a.createdAt);
      return 0;
    })
    .map(item => (
      <ItemCard key={item.id} item={item} />
    ));

  return <div className="list">{displayItems}</div>;
}
```

When the transform chain gets long, extract it to a variable above the return for clarity.

---

## Nested Lists

You can nest `.map()` calls for nested data structures. Keep keys unique within each level.

```jsx
function CurriculumOutline({ modules }) {
  return (
    <div className="curriculum">
      {modules.map(module => (
        <div key={module.id} className="module">
          <h3>{module.title}</h3>
          <ul className="lesson-list">
            {module.lessons.map(lesson => (
              <li key={lesson.id} className="lesson-item">
                <span>{lesson.title}</span>
                <span className="duration">{lesson.estimatedMinutes} min</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

Each level of the nested `.map()` needs its own `key` prop on its outermost element.

---

## Key Takeaways

- Use `.map()` to transform arrays of data into arrays of JSX elements. For complex per-item rendering, extract the item into its own component.
- The `key` prop is required on every element returned from `.map()`. It lets React identify which items changed, added, or removed -- enabling efficient updates.
- Keys must be unique among siblings, stable across renders, and derived from the data (not generated at render time).
- Never use array index as a key when the list can be reordered, filtered, or inserted into. Index keys cause state to be matched to the wrong items after any positional change.
- The `key` prop belongs on the outermost element returned from `.map()`. Use `React.Fragment key={...}` when wrapping multiple elements. The shorthand `<>` does not accept a `key`.
- Chain `.filter()` before `.map()` to render subsets. Use `.slice().sort()` before `.map()` to render in a specific order -- `.slice()` prevents mutating the original array.

---

## Try It Yourself

**Exercise 1**: Build a `TagCloud` component that accepts an array of `{ id, label, count }` objects. Render each tag as a `<button>` with its label and count. Sort the tags by `count` in descending order before rendering. Use the `id` as each tag's key.

**Exercise 2**: Create a `FilterableList` component that accepts `items` (array of objects with `name` and `category`) and `selectedCategory` as props. Filter the list to only show items in the selected category. Handle the empty state when no items match. Use `null` as a sentinel value for `selectedCategory` to mean "show all."

**Exercise 3**: Build a `DataTable` component that accepts `columns` (array of `{ key, label }`) and `rows` (array of objects) as props. Render a `<table>` with a `<thead>` using the column labels and a `<tbody>` using the column keys to pull values from each row. Add a `key` prop to every `<tr>` and `<td>`. Test it by passing in cohort member data.

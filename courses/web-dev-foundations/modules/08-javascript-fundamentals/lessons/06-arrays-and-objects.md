---
title: "Arrays and Objects"
estimatedMinutes: 50
isFreePreview: false
---

# Arrays and Objects

So far, all of our variables have held a single value: one name, one number, one boolean. But real programs deal with *collections* of data. A class roster has 30 students. A shopping cart has multiple items. A social media profile has a name, a bio, a location, and a list of posts.

JavaScript gives you two powerful tools for organizing collections of data: **arrays** (ordered lists) and **objects** (labeled collections). Together, they form the backbone of how you structure information in every application you'll ever build.

---

## Arrays: Ordered Lists

An **array** is an ordered list of values. Think of it like a playlist on your phone. Each song has a position (track 1, track 2, track 3), and you can add songs, remove songs, skip around, or play through them in order.

### Creating Arrays

```javascript
// An array of strings
const fruits = ["apple", "banana", "cherry", "mango"];

// An array of numbers
const scores = [92, 85, 78, 96, 88];

// An array can hold any type of value
const mixed = ["Maya", 27, true, null];

// An empty array (you'll add items later)
const todoList = [];

console.log(fruits);  // [ 'apple', 'banana', 'cherry', 'mango' ]
console.log(scores);  // [ 92, 85, 78, 96, 88 ]
```

### Accessing Items by Index

Every item in an array has a numbered position called an **index**. Indexing starts at 0, not 1:

```javascript
const colors = ["red", "green", "blue", "yellow", "purple"];

console.log(colors[0]); // red (first item)
console.log(colors[1]); // green (second item)
console.log(colors[4]); // purple (fifth item)
console.log(colors[5]); // undefined (no sixth item)

// Get the last item using .length
console.log(colors[colors.length - 1]); // purple
```

Zero-based indexing trips up every beginner. Just remember: the first item is at position 0, the second at position 1, and so on. The last item is always at position `array.length - 1`.

### The length Property

```javascript
const names = ["Maya", "Marcus", "Aisha", "Jordan"];

console.log(names.length); // 4

// Use length to check if an array is empty
const emptyList = [];
if (emptyList.length === 0) {
  console.log("The list is empty");
}
```

---

## Array Methods: Adding and Removing

Arrays come with built-in methods for adding and removing items:

### push(): Add to the End

```javascript
const playlist = ["Song A", "Song B"];

playlist.push("Song C");
console.log(playlist); // [ 'Song A', 'Song B', 'Song C' ]

playlist.push("Song D", "Song E"); // You can push multiple items at once
console.log(playlist); // [ 'Song A', 'Song B', 'Song C', 'Song D', 'Song E' ]
```

### pop(): Remove from the End

```javascript
const playlist = ["Song A", "Song B", "Song C"];

const removed = playlist.pop(); // Removes and returns the last item
console.log(removed);  // Song C
console.log(playlist); // [ 'Song A', 'Song B' ]
```

### unshift(): Add to the Beginning

```javascript
const line = ["Marcus", "Aisha"];

line.unshift("Maya"); // Adds to the front
console.log(line); // [ 'Maya', 'Marcus', 'Aisha' ]
```

### shift(): Remove from the Beginning

```javascript
const line = ["Maya", "Marcus", "Aisha"];

const first = line.shift(); // Removes and returns the first item
console.log(first); // Maya
console.log(line);  // [ 'Marcus', 'Aisha' ]
```

Here's a quick reference:

| Method | What It Does | Where | Returns |
|--------|-------------|-------|---------|
| `push()` | Adds item(s) | End | New length |
| `pop()` | Removes item | End | Removed item |
| `unshift()` | Adds item(s) | Beginning | New length |
| `shift()` | Removes item | Beginning | Removed item |

Notice that `push`/`pop` work at the end and `unshift`/`shift` work at the beginning. These methods **modify the original array**. They don't create a new one.

---

## Iterating Arrays

You can loop through an array using a `for` loop (you already know how) or the more modern `forEach` method:

### for Loop

```javascript
const students = ["Maya", "Marcus", "Aisha", "Jordan", "Devin"];

for (let i = 0; i < students.length; i++) {
  console.log(`${i + 1}. ${students[i]}`);
}
// 1. Maya
// 2. Marcus
// 3. Aisha
// 4. Jordan
// 5. Devin
```

### forEach

`forEach` calls a function once for each item in the array. It's cleaner when you don't need the index:

```javascript
const students = ["Maya", "Marcus", "Aisha", "Jordan", "Devin"];

students.forEach((student) => {
  console.log(`Welcome, ${student}!`);
});
// Welcome, Maya!
// Welcome, Marcus!
// ...and so on
```

You can also get the index if you need it:

```javascript
students.forEach((student, index) => {
  console.log(`${index + 1}. ${student}`);
});
```

The function you pass to `forEach` is called a **callback function**, a function that gets called back by another function. This pattern is everywhere in JavaScript. The arrow function syntax makes it concise.

---

## The Big Three: map, filter, find

These three array methods are a big deal. They let you transform, filter, and search data without writing manual loops. Professional developers use them every day.

### map(): Transform Every Item

`map()` creates a **new array** by applying a function to every item in the original array. It's like running each item through a machine that transforms it:

```javascript
const prices = [10, 20, 30, 40, 50];

// Double every price
const doublePrices = prices.map((price) => price * 2);
console.log(doublePrices); // [ 20, 40, 60, 80, 100 ]

// The original array is unchanged
console.log(prices); // [ 10, 20, 30, 40, 50 ]
```

```javascript
const names = ["maya", "marcus", "aisha"];

// Capitalize every name
const capitalized = names.map((name) => {
  return name.charAt(0).toUpperCase() + name.slice(1);
});
console.log(capitalized); // [ 'Maya', 'Marcus', 'Aisha' ]
```

```javascript
// Add a label to each score
const scores = [92, 85, 78, 96];
const labeled = scores.map((score) => `Score: ${score}`);
console.log(labeled); // [ 'Score: 92', 'Score: 85', 'Score: 78', 'Score: 96' ]
```

The key thing about `map`: the new array always has the **same number of items** as the original. Every item goes in, a transformed item comes out.

### filter(): Keep Only What Matches

`filter()` creates a **new array** containing only the items that pass a test. The function you provide should return `true` (keep) or `false` (discard):

```javascript
const ages = [15, 22, 17, 30, 12, 25, 19];

// Keep only adults (18 and over)
const adults = ages.filter((age) => age >= 18);
console.log(adults); // [ 22, 30, 25, 19 ]

// Keep only teens (13-19)
const teens = ages.filter((age) => age >= 13 && age <= 19);
console.log(teens); // [ 15, 17, 19 ]
```

```javascript
const words = ["apple", "banana", "avocado", "cherry", "apricot"];

// Keep only words that start with "a"
const aWords = words.filter((word) => word.startsWith("a"));
console.log(aWords); // [ 'apple', 'avocado', 'apricot' ]
```

```javascript
const scores = [92, 45, 78, 31, 85, 67, 55, 98];

// Keep only passing scores (70+)
const passing = scores.filter((score) => score >= 70);
console.log(passing); // [ 92, 78, 85, 98 ]
console.log(`${passing.length} out of ${scores.length} passed`); // 4 out of 8 passed
```

The key thing about `filter`: the new array can have **fewer items** than the original (or the same number, if everything passes the test).

### find(): Get the First Match

`find()` returns the **first item** that matches a condition, or `undefined` if nothing matches:

```javascript
const numbers = [3, 7, 12, 5, 22, 8];

// Find the first number greater than 10
const firstBig = numbers.find((num) => num > 10);
console.log(firstBig); // 12 (not 22 - find stops at the first match)

// Find a number greater than 100
const huge = numbers.find((num) => num > 100);
console.log(huge); // undefined (nothing matched)
```

`find` is different from `filter` in an important way: `filter` returns an array of *all* matches, while `find` returns just the *first* match (not in an array, just the value itself).

### Chaining Methods

One of the most powerful patterns is **chaining** these methods together:

```javascript
const scores = [92, 45, 78, 31, 85, 67, 55, 98];

// Get passing scores, then format them as strings
const report = scores
  .filter((score) => score >= 70)
  .map((score) => `${score} (Pass)`)
;

console.log(report);
// [ '92 (Pass)', '78 (Pass)', '85 (Pass)', '98 (Pass)' ]
```

Read this left to right: start with `scores`, filter to only passing ones, then map each to a formatted string. Each method returns a new array, so you can chain another method right onto it.

---

## Objects: Labeled Collections

While arrays are ordered lists accessed by number (index), **objects** are collections of key-value pairs accessed by name. Think of an object like a contact card. Each piece of information has a label (name, phone, email) and a value.

### Creating Objects

```javascript
const student = {
  firstName: "Maya",
  lastName: "Johnson",
  age: 27,
  city: "Brooklyn",
  isActive: true,
  track: "UX Design"
};

console.log(student);
```

Each entry is a **property**, a key-value pair separated by a colon. Properties are separated by commas. The keys (also called property names) are on the left, and the values are on the right.

### Accessing Properties

You can access object properties in two ways:

```javascript
const student = {
  firstName: "Maya",
  lastName: "Johnson",
  age: 27,
  city: "Brooklyn"
};

// Dot notation (most common)
console.log(student.firstName); // Maya
console.log(student.age);      // 27

// Bracket notation (useful when the key is in a variable)
console.log(student["city"]);   // Brooklyn

const field = "lastName";
console.log(student[field]);    // Johnson
```

Use **dot notation** when you know the property name. Use **bracket notation** when the property name is stored in a variable or contains special characters.

### Adding, Updating, and Deleting Properties

```javascript
const profile = {
  name: "Marcus",
  role: "Student"
};

// Add a new property
profile.email = "marcus@email.com";
profile.cohort = "2026-Q1";

// Update an existing property
profile.role = "Graduate";

// Delete a property
delete profile.cohort;

console.log(profile);
// { name: 'Marcus', role: 'Graduate', email: 'marcus@email.com' }
```

Wait, didn't we declare `profile` with `const`? How can we change it? Good catch. With objects (and arrays), `const` prevents you from reassigning the variable to a completely new object. But you can still modify the *contents* of the object:

```javascript
const person = { name: "Maya" };

// This is fine - modifying the object's contents
person.name = "Maya Johnson";
person.age = 27;

// This would cause an error - reassigning the entire variable
// person = { name: "Someone Else" }; // ERROR
```

Think of it like a filing cabinet. `const` means you can't replace the whole cabinet with a different one, but you can add, remove, and update the files inside.

### Checking if a Property Exists

```javascript
const user = {
  name: "Maya",
  email: "maya@email.com"
};

// Using the "in" operator
console.log("name" in user);    // true
console.log("phone" in user);   // false

// Using optional check (common pattern)
if (user.phone) {
  console.log(`Phone: ${user.phone}`);
} else {
  console.log("No phone number on file");
}
```

---

## Nested Objects and Arrays of Objects

Real data is rarely flat. You'll often work with objects inside objects, arrays inside objects, and arrays of objects.

### Nested Objects

```javascript
const member = {
  name: "Maya Johnson",
  age: 27,
  address: {
    street: "147 Front Street",
    city: "Brooklyn",
    state: "NY",
    zip: "11201"
  },
  skills: ["HTML", "CSS", "JavaScript", "Figma"]
};

// Access nested properties by chaining dots
console.log(member.address.city);    // Brooklyn
console.log(member.address.zip);     // 11201

// Access array items inside an object
console.log(member.skills[0]);       // HTML
console.log(member.skills.length);   // 4
```

### Arrays of Objects

This is the most common data structure in real applications. Think of it as a spreadsheet. Each row is an object, each column is a property:

```javascript
const students = [
  { name: "Maya", score: 92, track: "UX Design" },
  { name: "Marcus", score: 85, track: "Android Dev" },
  { name: "Aisha", score: 96, track: "Data Analytics" },
  { name: "Jordan", score: 78, track: "Android Dev" },
  { name: "Devin", score: 88, track: "UX Design" }
];

// Access a specific student
console.log(students[0].name);  // Maya
console.log(students[2].score); // 96
```

This is where `map`, `filter`, and `find` really shine:

```javascript
// Get all student names
const names = students.map((student) => student.name);
console.log(names); // [ 'Maya', 'Marcus', 'Aisha', 'Jordan', 'Devin' ]

// Find students with scores above 90
const topStudents = students.filter((student) => student.score > 90);
console.log(topStudents);
// [ { name: 'Maya', score: 92, track: 'UX Design' },
//   { name: 'Aisha', score: 96, track: 'Data Analytics' } ]

// Find the student named "Jordan"
const jordan = students.find((student) => student.name === "Jordan");
console.log(jordan); // { name: 'Jordan', score: 78, track: 'Android Dev' }

// Get all Android Dev students' names
const androidDevs = students
  .filter((student) => student.track === "Android Dev")
  .map((student) => student.name);
console.log(androidDevs); // [ 'Marcus', 'Jordan' ]
```

See how readable this is? `filter` by track, then `map` to names. No manual loops, no counter variables, no pushing to temporary arrays. This is modern JavaScript at its best.

---

## Destructuring

**Destructuring** is a shorthand for pulling values out of objects and arrays into individual variables. It's syntactic sugar. It doesn't do anything you couldn't do without it, but it makes common patterns much cleaner.

### Object Destructuring

```javascript
const student = {
  name: "Maya",
  age: 27,
  city: "Brooklyn",
  track: "UX Design"
};

// Without destructuring
const name = student.name;
const age = student.age;
const city = student.city;

// With destructuring - same result, one line
const { name, age, city } = student;

console.log(name); // Maya
console.log(age);  // 27
console.log(city); // Brooklyn
```

The variable names must match the property names. You can also rename them:

```javascript
const { name: studentName, age: studentAge } = student;
console.log(studentName); // Maya
console.log(studentAge);  // 27
```

### Array Destructuring

```javascript
const colors = ["red", "green", "blue"];

// Without destructuring
const first = colors[0];
const second = colors[1];

// With destructuring
const [first, second, third] = colors;
console.log(first);  // red
console.log(second); // green
console.log(third);  // blue
```

### Destructuring in Function Parameters

This is one of the most common uses, pulling specific properties out of an object parameter:

```javascript
// Without destructuring
function displayStudent(student) {
  console.log(`${student.name} (${student.track}): ${student.score}`);
}

// With destructuring - cleaner
function displayStudent({ name, track, score }) {
  console.log(`${name} (${track}): ${score}`);
}

displayStudent({ name: "Maya", track: "UX Design", score: 92 });
// Maya (UX Design): 92
```

Destructuring is a "nice to know" at this stage. You'll see it more and more as you advance, and it will feel natural over time.

---

## Practical Examples

### Student Grade Tracker

```javascript
const students = [
  { name: "Maya", scores: [92, 88, 95, 90] },
  { name: "Marcus", scores: [78, 82, 75, 80] },
  { name: "Aisha", scores: [96, 94, 98, 100] },
  { name: "Jordan", scores: [65, 70, 72, 68] },
  { name: "Devin", scores: [85, 90, 88, 92] }
];

// Calculate each student's average
const results = students.map((student) => {
  let total = 0;
  for (let i = 0; i < student.scores.length; i++) {
    total += student.scores[i];
  }
  const average = total / student.scores.length;

  let grade;
  if (average >= 90) grade = "A";
  else if (average >= 80) grade = "B";
  else if (average >= 70) grade = "C";
  else grade = "F";

  return {
    name: student.name,
    average: average,
    grade: grade
  };
});

console.log("=== Student Report ===\n");
results.forEach((result) => {
  console.log(`${result.name}: ${result.average.toFixed(1)} (${result.grade})`);
});

// Find the top student
const topStudent = results.find((r) => {
  let highestAvg = 0;
  results.forEach((s) => {
    if (s.average > highestAvg) highestAvg = s.average;
  });
  return r.average === highestAvg;
});
console.log(`\nTop student: ${topStudent.name} with ${topStudent.average.toFixed(1)}`);

// Count students by grade
const aStudents = results.filter((r) => r.grade === "A");
const bStudents = results.filter((r) => r.grade === "B");
console.log(`\nA's: ${aStudents.length}, B's: ${bStudents.length}`);
```

### Inventory System

```javascript
const inventory = [
  { name: "Laptop", price: 999.99, quantity: 15, category: "Electronics" },
  { name: "Headphones", price: 49.99, quantity: 50, category: "Electronics" },
  { name: "Notebook", price: 4.99, quantity: 200, category: "Office" },
  { name: "Pen Pack", price: 7.99, quantity: 150, category: "Office" },
  { name: "Backpack", price: 39.99, quantity: 30, category: "Accessories" },
  { name: "Water Bottle", price: 12.99, quantity: 75, category: "Accessories" }
];

// Total inventory value
let totalValue = 0;
inventory.forEach((item) => {
  totalValue += item.price * item.quantity;
});
console.log(`Total inventory value: $${totalValue.toFixed(2)}`);

// Most expensive item
let mostExpensive = inventory[0];
for (let i = 1; i < inventory.length; i++) {
  if (inventory[i].price > mostExpensive.price) {
    mostExpensive = inventory[i];
  }
}
console.log(`Most expensive: ${mostExpensive.name} ($${mostExpensive.price})`);

// Items by category
const categories = ["Electronics", "Office", "Accessories"];
categories.forEach((category) => {
  const items = inventory.filter((item) => item.category === category);
  const categoryValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  console.log(`\n${category}:`);
  items.forEach((item) => {
    console.log(`  ${item.name} - $${item.price} (${item.quantity} in stock)`);
  });
  console.log(`  Category value: $${categoryValue.toFixed(2)}`);
});

// Low stock alert (fewer than 20 items)
const lowStock = inventory.filter((item) => item.quantity < 20);
if (lowStock.length > 0) {
  console.log("\n=== LOW STOCK ALERT ===");
  lowStock.forEach((item) => {
    console.log(`  ${item.name}: only ${item.quantity} left!`);
  });
}
```

### Playlist Manager

```javascript
const playlist = [
  { title: "Alright", artist: "Kendrick Lamar", durationSec: 219 },
  { title: "Golden", artist: "Jill Scott", durationSec: 254 },
  { title: "Electric", artist: "Alina Baraz", durationSec: 204 },
  { title: "Best Part", artist: "Daniel Caesar", durationSec: 219 },
  { title: "Brown Skin Girl", artist: "Beyonce", durationSec: 243 },
  { title: "The Light", artist: "Common", durationSec: 335 },
  { title: "Love Galore", artist: "SZA", durationSec: 275 }
];

// Format duration from seconds to M:SS
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

// Display the playlist
console.log("=== My Playlist ===\n");
playlist.forEach((song, index) => {
  console.log(`${index + 1}. "${song.title}" by ${song.artist} [${formatDuration(song.durationSec)}]`);
});

// Total playlist duration
const totalSeconds = playlist.reduce((sum, song) => sum + song.durationSec, 0);
const totalMins = Math.floor(totalSeconds / 60);
const remainingSecs = totalSeconds % 60;
console.log(`\nTotal: ${playlist.length} songs, ${totalMins}m ${remainingSecs}s`);

// Find the longest song
let longest = playlist[0];
for (let i = 1; i < playlist.length; i++) {
  if (playlist[i].durationSec > longest.durationSec) {
    longest = playlist[i];
  }
}
console.log(`Longest: "${longest.title}" by ${longest.artist} [${formatDuration(longest.durationSec)}]`);

// Shuffle the playlist (Fisher-Yates shuffle)
const shuffled = [...playlist]; // Create a copy
for (let i = shuffled.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  const temp = shuffled[i];
  shuffled[i] = shuffled[j];
  shuffled[j] = temp;
}

console.log("\n=== Shuffled ===\n");
shuffled.forEach((song, index) => {
  console.log(`${index + 1}. "${song.title}" by ${song.artist}`);
});
```

---

## Key Takeaways

1. **Arrays** are ordered lists created with `[]`. Access items by zero-based index: `array[0]` is the first item.
2. **push/pop** work at the end of arrays, **unshift/shift** work at the beginning. These methods modify the original array.
3. **map()** transforms every item and returns a new array of the same length. **filter()** keeps only items that pass a test. **find()** returns the first matching item.
4. **Objects** are key-value pairs created with `{}`. Access properties with dot notation (`obj.key`) or bracket notation (`obj["key"]`).
5. **Arrays of objects** are the most common data structure in real applications. Combined with map/filter/find, they let you query and transform data powerfully and readably.
6. **Nested data** (objects inside objects, arrays inside objects) is normal. Chain dot notation to drill into nested structures: `user.address.city`.
7. **Destructuring** lets you pull values out of arrays and objects into variables with concise syntax: `const { name, age } = person`.

---

## Try It Yourself

Create a file called `community-tracker.js` that manages a WBB community member directory:

1. Create an array of at least 6 member objects, each with: `name`, `email`, `track` (one of: "Frontend", "Backend", "UX Design", "Data"), `cohort` (like "2025-Q4" or "2026-Q1"), `completedMilestones` (a number 0-6), and `isActive` (boolean).

2. Write the following operations using array methods (no manual for loops for these):
   - Use `map` to create an array of just the member names
   - Use `filter` to find all active members
   - Use `filter` to find members who have completed all 6 milestones
   - Use `find` to look up a specific member by email
   - Use `filter` then `map` to get the names of all members in the "Frontend" track
   - Chain `filter` and `map` to create a "graduation list": names of active members who completed all 6 milestones

3. Calculate and display:
   - Total number of members
   - Number of active vs inactive members
   - Average milestones completed (use a loop or forEach to sum, then divide)
   - Number of members per track

4. Format and print a clean report to the console that shows all of this information.

Bonus: Add a function `addMember(members, newMember)` that adds a member to the array and returns the updated array. Add a function `deactivateMember(members, email)` that finds a member by email and sets `isActive` to `false`.

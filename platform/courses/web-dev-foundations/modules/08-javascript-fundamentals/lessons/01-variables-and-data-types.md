---
title: "Variables and Data Types"
estimatedMinutes: 45
isFreePreview: true
---

# Variables and Data Types

You've built web pages with HTML. You've styled them with CSS. Now it's time to bring them to life. JavaScript is the programming language that makes things *happen*. It's the difference between a poster on a wall and a conversation with another person. And today, you start learning how to speak it.

But here's the thing: we're not jumping into the browser yet. Before you start making buttons clickable and forms interactive, you need to understand JavaScript on its own terms. Think of it like learning to cook. You practice knife skills and seasoning before you try to run a dinner service. In this module, we'll write JavaScript in the terminal using Node.js, the same tool professional developers use to build servers, APIs, and automation scripts. You already know the terminal from Module 01, so you're set.

Let's get started.

---

## What Is JavaScript?

JavaScript is one of the most widely used programming languages in the world. It was created in 1995 to add interactivity to web pages, but it's grown far beyond that. Today, JavaScript runs in browsers, on servers, in mobile apps, and even on hardware devices. If you learn one programming language, JavaScript gives you the most reach.

Here's what makes JavaScript special for you right now:

- **It's beginner-friendly.** The syntax is readable, and you get instant feedback.
- **It's everywhere.** Every website you visit uses JavaScript.
- **It's in demand.** JavaScript consistently ranks as the most sought-after programming language in job postings.
- **It connects to everything you've learned.** HTML is the structure, CSS is the style, and JavaScript is the behavior.

In this module, we'll focus on the *fundamentals*: the building blocks you'll use in every JavaScript program you ever write.

---

## Setting Up: Your First JavaScript File

You've been writing HTML and CSS files. JavaScript files work the same way. They're just text files with a `.js` extension.

Open your terminal and create a new folder for this module's practice files:

```bash
mkdir js-fundamentals
cd js-fundamentals
```

Now create your first JavaScript file:

```bash
touch hello.js
```

Open `hello.js` in your code editor and type this:

```javascript
console.log("Hello, world!");
```

Save the file. Now go back to your terminal and run it:

```bash
node hello.js
```

You should see:

```
Hello, world!
```

That's it. You just wrote and ran your first JavaScript program. Let's break down what happened:

- `console.log()` is a built-in function that prints whatever you put between the parentheses to the terminal. Think of it as JavaScript's way of talking to you. You'll use it constantly to check what your code is doing.
- `"Hello, world!"` is a **string**, a piece of text. We'll cover strings in detail shortly.
- `node hello.js` tells Node.js to read your file and execute the JavaScript inside it.

From now on, this is your workflow: write code in a `.js` file, save it, run it with `node filename.js`, and see the output in your terminal.

---

## console.log(): Your Window Into What's Happening

Before we go further, let's talk about `console.log()` because you'll use it in almost every file you write while learning.

When your code runs, it's invisible. You can't see variables changing or calculations happening. `console.log()` is how you make the invisible visible. It prints values to the terminal so you can see what's going on.

```javascript
// You can log text
console.log("Learning JavaScript!");

// You can log numbers
console.log(42);

// You can log multiple things separated by commas
console.log("My age is", 25);

// You can log the result of calculations
console.log(10 + 5);
```

Save that in a file and run it. You'll see each value printed on its own line.

The lines that start with `//` are **comments**. JavaScript ignores them completely. They're notes for humans reading the code. Get in the habit of writing comments to explain *why* you're doing something.

---

## Variables: Labeled Boxes

A **variable** is a name that holds a value. That's it. Think of it like a labeled box:

- You write a label on the box (the variable name)
- You put something inside (the value)
- Later, you can open the box, check what's inside, or swap it for something new

In JavaScript, you create variables using two keywords: `let` and `const`.

### let: A Box You Can Refill

Use `let` when the value might change later:

```javascript
// Create a variable called "score" and put the number 0 inside
let score = 0;
console.log(score); // 0

// Later, update the score
score = 10;
console.log(score); // 10

// Update it again
score = 25;
console.log(score); // 25
```

Notice that you only use the `let` keyword when you first create the variable. After that, you just use the name.

### const: A Sealed Container

Use `const` when the value should never change:

```javascript
// This value won't change - the speed of light is the speed of light
const speedOfLight = 299792458;
console.log(speedOfLight);

// If you try to reassign a const, JavaScript will throw an error
// speedOfLight = 100; // ERROR: Assignment to constant variable
```

`const` stands for "constant." It's a promise to yourself and anyone reading your code: "This value is set. Don't touch it."

### Which Should You Use?

Here's a simple rule: **start with `const`. Switch to `let` only if you need to reassign the value.** This makes your code easier to understand because anyone reading it knows immediately which values might change and which won't.

```javascript
const name = "Maya";           // Name won't change - use const
const birthYear = 1998;        // Birth year won't change - use const
let currentScore = 0;          // Score will change as the game progresses - use let
let isLoggedIn = false;        // Login status will change - use let
```

### A Quick Word About var

You'll see `var` in older JavaScript code and tutorials. It's the original way to declare variables, and it still works. But `let` and `const` were introduced in 2015 because they behave more predictably. Modern JavaScript uses `let` and `const` exclusively, and so will we. If you see `var` in someone else's code, just know it works similarly to `let` but with some quirky behavior around scope (we'll cover scope in the functions lesson). Stick with `let` and `const`.

### Naming Variables

Variable names in JavaScript follow some rules:

```javascript
// Good variable names - descriptive and clear
let firstName = "Devin";
let totalPrice = 49.99;
let isStudent = true;
let numberOfItems = 3;

// Valid but not great - too short or vague
let x = 10;
let temp = "hello";

// Invalid - these will cause errors
// let 1stPlace = "Gold";    // Can't start with a number
// let my-name = "Devin";    // Can't use hyphens
// let let = "hello";        // Can't use reserved words
```

The convention in JavaScript is **camelCase**: start with a lowercase letter, and capitalize the first letter of each subsequent word. `firstName`, `totalPrice`, `numberOfItems`. This isn't required, but every JavaScript developer does it, and you should too.

---

## Data Types: What Goes In the Box

Every value in JavaScript has a **type**. The type determines what you can do with that value. Think of it like containers in a kitchen: you store flour in a canister, liquids in bottles, and ice cream in the freezer. Each container is designed for what's inside.

JavaScript has several data types. Let's cover the ones you'll use most.

### Strings: Text

A **string** is any piece of text. You create strings by wrapping text in quotes:

```javascript
const greeting = "Hello, world!";
const name = 'Maya Johnson';
const message = `Welcome to We Build Black!`;

console.log(greeting); // Hello, world!
console.log(name);     // Maya Johnson
console.log(message);  // Welcome to We Build Black!
```

You can use double quotes (`"`), single quotes (`'`), or backticks (`` ` ``). Double and single quotes work the same way. Backticks are special because they let you embed variables directly in your text using `${}`:

```javascript
const firstName = "Maya";
const age = 27;

// Template literal - uses backticks and ${}
const intro = `My name is ${firstName} and I am ${age} years old.`;
console.log(intro); // My name is Maya and I am 27 years old.
```

These backtick strings are called **template literals**, and they'll save you a lot of headaches. You'll use them constantly.

#### Useful String Properties and Methods

Strings come with built-in tools:

```javascript
const city = "Brooklyn";

// .length tells you how many characters are in the string
console.log(city.length); // 8

// .toUpperCase() converts to all caps
console.log(city.toUpperCase()); // BROOKLYN

// .toLowerCase() converts to all lowercase
console.log(city.toLowerCase()); // brooklyn

// .includes() checks if a string contains a specific piece of text
console.log(city.includes("Brook")); // true
console.log(city.includes("Queens")); // false

// .slice() extracts a portion of the string (start index, end index)
console.log(city.slice(0, 5)); // Brook
console.log(city.slice(5));    // lyn
```

A quick note: when you use `.toUpperCase()` or any string method, it gives you back a *new* string. The original doesn't change:

```javascript
const name = "maya";
const upperName = name.toUpperCase();

console.log(name);      // maya (unchanged)
console.log(upperName); // MAYA (new string)
```

### Numbers: Quantities

Numbers in JavaScript are straightforward. There's no difference between integers (whole numbers) and decimals. They're all just "numbers":

```javascript
const age = 25;
const price = 49.99;
const temperature = -5;
const million = 1000000;

console.log(age);         // 25
console.log(price);       // 49.99
console.log(temperature); // -5
```

You can do math with numbers:

```javascript
console.log(10 + 3);  // 13
console.log(10 - 3);  // 7
console.log(10 * 3);  // 30
console.log(10 / 3);  // 3.3333333333333335
```

#### The Math Object

JavaScript has a built-in `Math` object with useful tools:

```javascript
// Round a number to the nearest integer
console.log(Math.round(4.7));  // 5
console.log(Math.round(4.3));  // 4

// Round down (floor)
console.log(Math.floor(4.9));  // 4

// Round up (ceiling)
console.log(Math.ceil(4.1));   // 5

// Generate a random number between 0 and 1
console.log(Math.random());   // 0.7234... (different every time)

// Generate a random whole number between 1 and 10
const randomNum = Math.floor(Math.random() * 10) + 1;
console.log(randomNum);       // A number from 1 to 10
```

The random number pattern is worth memorizing. You'll use it in games, quizzes, and anywhere you need unpredictability.

### Booleans: Yes or No

A **boolean** is either `true` or `false`. That's it. Just two possible values. Booleans are named after mathematician George Boole, and they're the foundation of all decision-making in code.

```javascript
const isRaining = true;
const hasTicket = false;
const isOldEnough = age >= 18; // true if age is 18 or higher

console.log(isRaining);   // true
console.log(hasTicket);   // false
console.log(isOldEnough); // true (if age is 25)
```

You'll use booleans constantly with `if` statements (coming in Lesson 3).

### null and undefined: Nothing and Not Yet

These two types represent the absence of a value, but in different ways:

- **`undefined`** means "this variable exists but hasn't been given a value yet." It's JavaScript's default for "nothing here."
- **`null`** means "this variable intentionally has no value." It's a deliberate choice by the developer.

```javascript
let futureJob;
console.log(futureJob); // undefined - declared but never assigned

let middleName = null;
console.log(middleName); // null - intentionally set to "no value"
```

Think of it this way: `undefined` is an empty box you haven't put anything in yet. `null` is a box where you've consciously decided to leave it empty and labeled it "empty on purpose."

---

## The typeof Operator

Sometimes you need to check what type a value is. The `typeof` operator tells you:

```javascript
console.log(typeof "hello");     // string
console.log(typeof 42);          // number
console.log(typeof true);        // boolean
console.log(typeof undefined);   // undefined
console.log(typeof null);        // object (this is a known JavaScript bug!)

const name = "Maya";
console.log(typeof name);        // string

let score = 100;
console.log(typeof score);       // number
```

That `typeof null` returning `"object"` is a famous bug from the very first version of JavaScript in 1995. It's never been fixed because too much existing code depends on it. Just remember: `null` is NOT an object, despite what `typeof` says.

---

## Type Coercion: JavaScript's Quirky Behavior

JavaScript sometimes automatically converts values from one type to another. This is called **type coercion**, and it can surprise you if you're not expecting it.

```javascript
// The + operator with a string and a number? JavaScript turns the number into a string
console.log("5" + 3);   // "53" (string concatenation, not addition!)
console.log("10" + 20); // "1020" (same thing)

// But with -, *, / operators? JavaScript turns the string into a number
console.log("5" - 3);   // 2 (actual subtraction)
console.log("10" * 2);  // 20 (actual multiplication)
```

This is one of JavaScript's most notorious quirks. The `+` operator does double duty: it adds numbers AND joins strings. When JavaScript sees a string and a number with `+`, it assumes you want to join them. With `-`, `*`, and `/`, there's no string equivalent, so JavaScript converts the string to a number.

The takeaway: **be intentional about your data types.** If you have a string that should be a number, convert it explicitly:

```javascript
const userInput = "42";
const actualNumber = Number(userInput);
console.log(actualNumber + 8); // 50 (correct math!)
```

---

## Putting It All Together

Let's combine everything from this lesson into a real example, a simple profile card:

```javascript
// Profile data
const firstName = "Maya";
const lastName = "Johnson";
const age = 27;
const city = "Brooklyn";
const isStudent = true;
const memberSince = 2024;

// Calculate years of membership
const currentYear = 2026;
let yearsMember = currentYear - memberSince;

// Build the profile display
console.log("=== Member Profile ===");
console.log(`Name: ${firstName} ${lastName}`);
console.log(`Age: ${age}`);
console.log(`Location: ${city.toUpperCase()}`);
console.log(`Student: ${isStudent}`);
console.log(`Member for: ${yearsMember} years`);
console.log(`Name length: ${firstName.length + lastName.length} characters`);
console.log("=====================");
```

Run that file and you'll see a nicely formatted profile printed in your terminal. You just used variables, strings, numbers, booleans, template literals, string methods, and basic math, all in one program.

---

## Key Takeaways

1. **JavaScript files have a `.js` extension** and run in the terminal with `node filename.js`.
2. **`console.log()`** prints values to the terminal. Use it constantly to see what your code is doing.
3. **`let`** declares a variable whose value can change; **`const`** declares one that can't be reassigned. Start with `const`, switch to `let` only when needed.
4. **Strings** are text wrapped in quotes. Use backtick template literals (`` `${}` ``) to embed variables in strings.
5. **Numbers** work for both integers and decimals. The `Math` object gives you rounding, random numbers, and more.
6. **Booleans** are `true` or `false`. They are the foundation of decision-making in code.
7. **Type coercion** can surprise you. The `+` operator joins strings instead of adding when a string is involved. Be intentional about your types.

---

## Try It Yourself

Create a file called `about-me.js` and write a program that:

1. Stores your first name, last name, age, and city in variables (use `const` for each)
2. Creates a `let` variable called `codingExperience` set to `"beginner"`
3. Uses `typeof` to print the type of each variable
4. Uses a template literal to print a sentence like: "Hi, I'm Maya Johnson, a 27-year-old from Brooklyn. Coding experience: beginner."
5. Uses `.toUpperCase()` to print your city in all caps
6. Uses `Math.random()` to generate and print a random "lucky number" between 1 and 100
7. Changes `codingExperience` to `"learning"` and prints the updated value

Run it with `node about-me.js` and make sure everything prints correctly. If something doesn't look right, add more `console.log()` statements to investigate.

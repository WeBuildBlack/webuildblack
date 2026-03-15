---
title: "Functions"
estimatedMinutes: 50
isFreePreview: false
---

# Functions

Think about a recipe card. You write the recipe once (the ingredients, the steps, the timing) and then you can cook that dish anytime. You don't rewrite the recipe every time you want to make it. You just pull out the card and follow the steps.

**Functions** work exactly like recipe cards for your code. You write a block of instructions once, give it a name, and then "call" it whenever you need it. Functions are one of the most important concepts in programming. They make your code reusable, organized, and easier to understand.

---

## Your First Function

Here's a simple function that prints a greeting:

```javascript
// Define the function
function greet() {
  console.log("Hello! Welcome to We Build Black.");
  console.log("We're glad you're here.");
}

// Call the function
greet();
```

Let's break this down:

- **`function`**: the keyword that tells JavaScript you're creating a function
- **`greet`**: the name of your function (follows the same naming rules as variables)
- **`()`**: parentheses that can hold parameters (more on this next)
- **`{ ... }`**: curly braces containing the code that runs when the function is called
- **`greet()`**: calling (or "invoking") the function, which runs the code inside it

The key insight: defining a function doesn't run it. It just saves the instructions. The code only runs when you *call* the function with `()`.

```javascript
function sayGoodbye() {
  console.log("Goodbye! Keep building.");
}

// I can call this as many times as I want
sayGoodbye(); // Goodbye! Keep building.
sayGoodbye(); // Goodbye! Keep building.
sayGoodbye(); // Goodbye! Keep building.
```

Write once, use many times. That's what functions give you.

---

## Parameters and Arguments

Most recipe cards need ingredients. You can't make a cake without specifying how much flour to use. Similarly, most functions need **parameters**: pieces of information you pass in so the function can do its job.

```javascript
// "name" is a parameter - a placeholder for the actual value
function greetPerson(name) {
  console.log(`Hello, ${name}! Welcome to the community.`);
}

// "Maya" and "Marcus" are arguments - the actual values we pass in
greetPerson("Maya");    // Hello, Maya! Welcome to the community.
greetPerson("Marcus");  // Hello, Marcus! Welcome to the community.
greetPerson("Aisha");   // Hello, Aisha! Welcome to the community.
```

**Parameters** are the names listed in the function definition (like `name`). **Arguments** are the actual values you pass when calling the function (like `"Maya"`). People often use these terms interchangeably, and that's fine in conversation.

You can have multiple parameters. Just separate them with commas:

```javascript
function introduce(name, role, city) {
  console.log(`${name} is a ${role} based in ${city}.`);
}

introduce("Maya", "UX Designer", "Brooklyn");
// Maya is a UX Designer based in Brooklyn.

introduce("Devin", "Software Engineer", "Brooklyn");
// Devin is a Software Engineer based in Brooklyn.
```

The order matters: the first argument fills the first parameter, the second fills the second, and so on.

---

## Return Values

So far, our functions have printed things with `console.log()`. But functions can also **return** a value, handing something back to the code that called them. This is like a recipe that doesn't just describe how to cook, but actually produces the finished dish.

```javascript
function add(a, b) {
  return a + b;
}

const result = add(5, 3);
console.log(result); // 8

// You can use the returned value directly
console.log(add(10, 20)); // 30

// You can use it in expressions
const total = add(100, 50) + add(25, 25);
console.log(total); // 200
```

The `return` keyword does two things:

1. It sends a value back to the caller
2. It immediately exits the function. Any code after `return` won't run

```javascript
function checkAge(age) {
  if (age < 0) {
    return "Invalid age"; // Function exits here if age is negative
  }

  if (age >= 18) {
    return "Adult";
  }

  return "Minor"; // This only runs if neither condition above was true
}

console.log(checkAge(25));  // Adult
console.log(checkAge(12));  // Minor
console.log(checkAge(-3));  // Invalid age
```

### Functions Without return

If a function doesn't have a `return` statement, it returns `undefined` by default:

```javascript
function logMessage(msg) {
  console.log(msg);
  // No return statement
}

const value = logMessage("Hello");
console.log(value); // undefined
```

This is fine for functions whose job is to *do* something (like print output) rather than *calculate* something. But when a function's purpose is to produce a result, always use `return`.

---

## Default Parameters

Sometimes you want a parameter to have a fallback value if no argument is provided:

```javascript
function greet(name = "friend") {
  console.log(`Hello, ${name}!`);
}

greet("Maya");  // Hello, Maya!
greet();        // Hello, friend! (uses the default)
```

Default parameters are defined with `=` in the parameter list. They're useful for making functions more flexible:

```javascript
function calculateTip(mealCost, tipPercent = 18) {
  const tip = mealCost * (tipPercent / 100);
  const total = mealCost + tip;
  return total;
}

console.log(calculateTip(50));     // 59 (uses default 18% tip)
console.log(calculateTip(50, 20)); // 60 (uses 20% tip)
console.log(calculateTip(50, 25)); // 62.5 (uses 25% tip)
```

---

## Arrow Functions

Arrow functions are a shorter way to write functions, introduced in modern JavaScript. They use the `=>` symbol (which looks like an arrow):

```javascript
// Regular function
function add(a, b) {
  return a + b;
}

// Arrow function (same thing, shorter syntax)
const add = (a, b) => {
  return a + b;
};

// Even shorter: if the function body is a single return statement,
// you can skip the braces and the return keyword
const add = (a, b) => a + b;
```

Let's see more examples:

```javascript
// One parameter - parentheses are optional (but many teams include them anyway)
const double = (n) => n * 2;
console.log(double(5)); // 10

// No parameters - parentheses are required
const getGreeting = () => "Hello, world!";
console.log(getGreeting()); // Hello, world!

// Multiple lines - use braces and return
const describePerson = (name, age) => {
  const status = age >= 18 ? "adult" : "minor";
  return `${name} is ${age} years old (${status})`;
};
console.log(describePerson("Maya", 27)); // Maya is 27 years old (adult)
```

Arrow functions are popular because they're concise. You'll see them used frequently with array methods (Lesson 6). For now, practice both styles. Use whichever feels most comfortable, and know how to read the other.

---

## Function Expressions

There's actually another way to create functions: store them in a variable. This is called a **function expression**:

```javascript
// Function declaration (what we've been doing)
function multiply(a, b) {
  return a * b;
}

// Function expression (storing a function in a variable)
const divide = function(a, b) {
  return a / b;
};

// Arrow function (also a function expression)
const subtract = (a, b) => a - b;

// They all work the same way when called
console.log(multiply(6, 7)); // 42
console.log(divide(20, 4));  // 5
console.log(subtract(10, 3)); // 7
```

The main practical difference: function declarations are "hoisted," meaning you can call them before they appear in your code. Function expressions (including arrow functions) are not, so you must define them before you call them:

```javascript
// This works - declarations are hoisted
sayHi();
function sayHi() {
  console.log("Hi!");
}

// This causes an error - expressions are NOT hoisted
// sayBye(); // ERROR: Cannot access 'sayBye' before initialization
const sayBye = () => console.log("Bye!");
sayBye(); // This works because it's after the definition
```

For beginners, the simplest approach: define your functions before you call them, and this distinction won't matter.

---

## Scope: What Your Code Can See

**Scope** determines which variables are accessible from where in your code. Think of it like rooms in a house: if you're standing in the kitchen, you can see everything in the kitchen. You can also see the hallway (the shared space). But you can't see what's inside the bedroom unless you walk in there.

### Global Scope

Variables declared outside of any function are in the **global scope**, which means they're accessible everywhere:

```javascript
const appName = "Quiz Game"; // Global variable

function displayTitle() {
  // Can access appName because it's global
  console.log(`Welcome to ${appName}`);
}

function displayFooter() {
  // Can also access appName from here
  console.log(`Thanks for playing ${appName}`);
}

displayTitle();  // Welcome to Quiz Game
displayFooter(); // Thanks for playing Quiz Game
```

### Local Scope (Function Scope)

Variables declared inside a function are **local** to that function. They only exist within those curly braces:

```javascript
function calculateArea(width, height) {
  const area = width * height; // "area" is local to this function
  return area;
}

console.log(calculateArea(5, 3)); // 15
// console.log(area); // ERROR: area is not defined (it's local to calculateArea)
```

The variable `area` was born inside `calculateArea` and dies when the function finishes. Code outside the function can't see it. This is actually a good thing, because it means functions can't accidentally interfere with each other's variables.

### Block Scope

Variables declared with `let` and `const` inside any curly braces (`{}`) are scoped to that block:

```javascript
if (true) {
  const secret = "you can't see me outside";
  let count = 42;
  console.log(secret); // Works fine inside the block
}

// console.log(secret); // ERROR: secret is not defined
// console.log(count);  // ERROR: count is not defined
```

This is one of the main reasons we use `let` and `const` instead of `var`. The older `var` keyword doesn't respect block scope, which can lead to confusing bugs.

### Scope in Action

```javascript
const greeting = "Hello"; // Global

function outerFunction() {
  const middle = "from outer"; // Local to outerFunction

  function innerFunction() {
    const inner = "from inner"; // Local to innerFunction
    // innerFunction can see: greeting, middle, and inner
    console.log(`${greeting} ${middle} ${inner}`);
  }

  innerFunction();
  // outerFunction can see: greeting and middle
  // outerFunction CANNOT see: inner
}

outerFunction(); // Hello from outer from inner
// Global scope can see: greeting
// Global scope CANNOT see: middle or inner
```

The rule is simple: inner scopes can see outer scopes, but not the other way around. Like standing in a room with the door open. You can see the hallway, but people in the hallway can't see into your room.

---

## Pure Functions

A **pure function** is a function that:

1. Given the same inputs, always returns the same output
2. Has no side effects (doesn't change anything outside itself)

```javascript
// Pure function - same input always gives the same output
const calculateTax = (price, taxRate) => {
  return price * taxRate;
};

console.log(calculateTax(100, 0.08)); // Always 8
console.log(calculateTax(100, 0.08)); // Always 8 (same input, same output)

// NOT a pure function - it depends on an external variable
let taxRate = 0.08;
const calculateTaxImpure = (price) => {
  return price * taxRate; // Uses taxRate from outside the function
};

console.log(calculateTaxImpure(100)); // 8
taxRate = 0.10;
console.log(calculateTaxImpure(100)); // 10 (same input, different output!)
```

Pure functions are easier to test, easier to debug, and easier to understand. They're a goal to aim for. Not every function can be pure (functions that print to the console or read from files inherently have side effects), but the more pure functions you write, the cleaner your code will be.

---

## Building a Utility Library

Let's put everything together by building a collection of useful functions. This is how real codebases work: you build small, focused functions and combine them to solve bigger problems:

```javascript
// === String Utilities ===

const capitalize = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const formatName = (first, last) => {
  return `${capitalize(first)} ${capitalize(last)}`;
};

const truncate = (str, maxLength = 20) => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
};

// === Number Utilities ===

const clamp = (num, min, max) => {
  if (num < min) return min;
  if (num > max) return max;
  return num;
};

const formatCurrency = (cents) => {
  const dollars = (cents / 100).toFixed(2);
  return `$${dollars}`;
};

const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// === Validation Utilities ===

const isValidEmail = (email) => {
  return email.includes("@") && email.includes(".");
};

const isStrongPassword = (password) => {
  const hasMinLength = password.length >= 8;
  let hasUpper = false;
  let hasLower = false;
  let hasNumber = false;

  for (let i = 0; i < password.length; i++) {
    const char = password[i];
    if (char >= "A" && char <= "Z") hasUpper = true;
    if (char >= "a" && char <= "z") hasLower = true;
    if (char >= "0" && char <= "9") hasNumber = true;
  }

  return hasMinLength && hasUpper && hasLower && hasNumber;
};

// === Use the Utilities ===

console.log("=== String Utilities ===");
console.log(formatName("maya", "JOHNSON"));         // Maya Johnson
console.log(truncate("We Build Black empowers the community", 25)); // We Build Black empow...

console.log("\n=== Number Utilities ===");
console.log(clamp(150, 0, 100));    // 100 (capped at max)
console.log(clamp(-10, 0, 100));    // 0 (capped at min)
console.log(formatCurrency(4999));  // $49.99
console.log(getRandomInt(1, 10));   // Random number 1-10

console.log("\n=== Validation ===");
console.log(isValidEmail("maya@webuildblack.com")); // true
console.log(isValidEmail("not-an-email"));          // false
console.log(isStrongPassword("abc"));               // false
console.log(isStrongPassword("MyP4ssword"));        // true
```

Notice how each function does one specific thing. The `formatName` function calls `capitalize`. Functions can call other functions. This is how you build complex behavior from simple pieces.

---

## Practical Examples

### Temperature Converter

```javascript
const celsiusToFahrenheit = (celsius) => {
  return (celsius * 9/5) + 32;
};

const fahrenheitToCelsius = (fahrenheit) => {
  return (fahrenheit - 32) * 5/9;
};

const formatTemp = (degrees, unit) => {
  return `${degrees.toFixed(1)}°${unit}`;
};

// Convert some temperatures
const boiling = celsiusToFahrenheit(100);
const freezing = celsiusToFahrenheit(0);
const bodyTemp = celsiusToFahrenheit(37);

console.log(`Water boils at ${formatTemp(boiling, "F")}`);  // 212.0°F
console.log(`Water freezes at ${formatTemp(freezing, "F")}`); // 32.0°F
console.log(`Body temperature: ${formatTemp(bodyTemp, "F")}`); // 98.6°F

// Convert the other way
console.log(`72°F = ${formatTemp(fahrenheitToCelsius(72), "C")}`); // 22.2°C
```

### Tip Calculator

```javascript
function calculateBill(subtotal, tipPercent = 18, partySize = 1) {
  const tipAmount = subtotal * (tipPercent / 100);
  const total = subtotal + tipAmount;
  const perPerson = total / partySize;

  return {
    subtotal: subtotal,
    tipPercent: tipPercent,
    tipAmount: tipAmount,
    total: total,
    partySize: partySize,
    perPerson: perPerson
  };
}

function printReceipt(bill) {
  console.log("\n=== Receipt ===");
  console.log(`Subtotal:   $${bill.subtotal.toFixed(2)}`);
  console.log(`Tip (${bill.tipPercent}%): $${bill.tipAmount.toFixed(2)}`);
  console.log(`Total:      $${bill.total.toFixed(2)}`);
  if (bill.partySize > 1) {
    console.log(`Split ${bill.partySize} ways: $${bill.perPerson.toFixed(2)} each`);
  }
  console.log("===============\n");
}

// Dinner for 4 with 20% tip
const dinnerBill = calculateBill(124.50, 20, 4);
printReceipt(dinnerBill);

// Quick lunch, default tip
const lunchBill = calculateBill(15.75);
printReceipt(lunchBill);
```

Don't worry if the `return { ... }` syntax looks unfamiliar. That's returning an **object**, which we'll cover in detail in the next lesson. For now, just notice how the function bundles up several related values and hands them back as a package.

### Password Strength Checker

```javascript
function checkPasswordStrength(password) {
  let strength = 0;
  const feedback = [];

  // Check length
  if (password.length >= 8) {
    strength++;
  } else {
    feedback.push("Use at least 8 characters");
  }

  if (password.length >= 12) {
    strength++;
  }

  // Check for character types
  let hasUpper = false;
  let hasLower = false;
  let hasNumber = false;
  let hasSpecial = false;

  for (let i = 0; i < password.length; i++) {
    const char = password[i];
    if (char >= "A" && char <= "Z") hasUpper = true;
    else if (char >= "a" && char <= "z") hasLower = true;
    else if (char >= "0" && char <= "9") hasNumber = true;
    else hasSpecial = true;
  }

  if (hasUpper) { strength++; } else { feedback.push("Add an uppercase letter"); }
  if (hasLower) { strength++; } else { feedback.push("Add a lowercase letter"); }
  if (hasNumber) { strength++; } else { feedback.push("Add a number"); }
  if (hasSpecial) { strength++; } else { feedback.push("Add a special character (!@#$...)"); }

  // Determine rating
  let rating;
  if (strength <= 2) rating = "Weak";
  else if (strength <= 4) rating = "Medium";
  else if (strength <= 5) rating = "Strong";
  else rating = "Very Strong";

  return { rating, strength, maxStrength: 6, feedback };
}

function displayStrength(password) {
  const result = checkPasswordStrength(password);
  const bar = "=".repeat(result.strength) + "-".repeat(result.maxStrength - result.strength);

  console.log(`\nPassword: ${password}`);
  console.log(`Strength: [${bar}] ${result.rating} (${result.strength}/${result.maxStrength})`);

  if (result.feedback.length > 0) {
    console.log("Suggestions:");
    for (let i = 0; i < result.feedback.length; i++) {
      console.log(`  - ${result.feedback[i]}`);
    }
  }
}

displayStrength("abc");
displayStrength("password");
displayStrength("Hello123");
displayStrength("MyP@ss2026!");
```

---

## Key Takeaways

1. **Functions** let you write code once and reuse it as many times as you need. Define with `function name() {}` and call with `name()`.
2. **Parameters** let functions accept input. **Arguments** are the actual values you pass in. Order matters.
3. **`return`** sends a value back to the caller and exits the function. Without it, a function returns `undefined`.
4. **Default parameters** (`function greet(name = "friend")`) provide fallback values when no argument is given.
5. **Arrow functions** (`const add = (a, b) => a + b`) are a shorter syntax for writing functions, especially popular for small, single-purpose functions.
6. **Scope** determines where variables are accessible. Inner scopes can see outer scopes, but not the other way around. Variables declared inside a function stay inside that function.
7. **Pure functions** always produce the same output for the same input and don't modify anything outside themselves. Aim for purity when possible.

---

## Try It Yourself

Create a file called `my-utils.js` and build your own utility library with these functions:

1. **`reverseString(str)`**: Returns the string reversed (e.g., "hello" becomes "olleh"). Hint: loop through the string backwards and build a new string.

2. **`isPalindrome(str)`**: Returns `true` if the string reads the same forwards and backwards (e.g., "racecar" is a palindrome, "hello" is not). Use your `reverseString` function!

3. **`countWords(sentence)`**: Returns the number of words in a sentence. Hint: words are separated by spaces. You can loop through and count spaces, then add 1.

4. **`generatePassword(length)`**: Generates a random password of the given length using uppercase letters, lowercase letters, numbers, and special characters. Use `Math.random()` and a string containing all possible characters.

5. **`calculateGrade(scores)`**: Takes an array of numbers (don't worry if arrays feel new, just use bracket notation), calculates the average, and returns the letter grade. Use a loop to sum the scores. We'll learn more about arrays in the next lesson.

Test each function with multiple inputs and print the results:

```javascript
console.log(reverseString("We Build Black")); // kcalB dliuB eW
console.log(isPalindrome("racecar"));         // true
console.log(isPalindrome("hello"));           // false
console.log(countWords("We Build Black empowers the community")); // 6
console.log(generatePassword(12));            // Something like "kA3!mB9@nP2#"
```

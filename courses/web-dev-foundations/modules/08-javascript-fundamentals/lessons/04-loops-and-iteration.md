---
title: "Loops and Iteration"
estimatedMinutes: 45
isFreePreview: false
---

# Loops and Iteration

Imagine you work at a bakery and you need to put frosting on 200 cupcakes. You wouldn't write out separate instructions for each cupcake. "Frost cupcake 1, frost cupcake 2, frost cupcake 3..." You'd say: "Frost a cupcake. Repeat until all 200 are done." That's what loops do in programming. They let you repeat an action as many times as you need, without writing the same code over and over.

Loops are one of the most powerful tools in your programming toolkit. They're how you process lists of data, build patterns, run games, and handle any task that involves repetition.

---

## The for Loop

The `for` loop is the most common loop in JavaScript. It runs a block of code a specific number of times:

```javascript
for (let i = 0; i < 5; i++) {
  console.log(`Count: ${i}`);
}
// Output:
// Count: 0
// Count: 1
// Count: 2
// Count: 3
// Count: 4
```

There's a lot packed into that first line. Let's break it into three parts:

```javascript
for (initialization; condition; update) {
  // Code to repeat
}
```

1. **Initialization** (`let i = 0`): Runs once before the loop starts. Creates a counter variable, usually called `i`.
2. **Condition** (`i < 5`): Checked before each repetition. If `true`, the loop runs again. If `false`, the loop stops.
3. **Update** (`i++`): Runs after each repetition. Usually increments the counter.

Think of it as instructions for an assembly line: "Start at position 0. Keep going as long as you're before position 5. After each item, move to the next position."

```javascript
// Count from 1 to 10
for (let i = 1; i <= 10; i++) {
  console.log(i);
}

// Count by twos
for (let i = 0; i <= 20; i += 2) {
  console.log(i); // 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20
}

// Count backwards
for (let i = 10; i >= 1; i--) {
  console.log(i); // 10, 9, 8, ... 1
}
console.log("Liftoff!");
```

The counter variable `i` is just a regular variable. You can name it anything. But `i` is the universal convention for loop counters. If you have nested loops, the inner one typically uses `j`, then `k`.

### Using the Counter

The counter isn't just for controlling the loop. You can use it inside the loop body:

```javascript
// Calculate the sum of numbers 1 through 100
let sum = 0;
for (let i = 1; i <= 100; i++) {
  sum += i;
}
console.log(`Sum of 1 to 100: ${sum}`); // 5050

// Print a times table
const number = 7;
console.log(`\n=== ${number} Times Table ===`);
for (let i = 1; i <= 12; i++) {
  console.log(`${number} x ${i} = ${number * i}`);
}
```

---

## The while Loop

A `while` loop keeps running as long as its condition is `true`. Unlike a `for` loop, you manage the counter yourself:

```javascript
let count = 0;

while (count < 5) {
  console.log(`Count: ${count}`);
  count++;
}
```

The `while` loop is useful when you don't know in advance how many times you need to loop. Think of it like this: a `for` loop is "do this 10 times." A `while` loop is "keep doing this until something changes."

```javascript
// Simulate rolling a die until you get a 6
let roll = 0;
let attempts = 0;

while (roll !== 6) {
  roll = Math.floor(Math.random() * 6) + 1;
  attempts++;
  console.log(`Roll ${attempts}: ${roll}`);
}
console.log(`It took ${attempts} rolls to get a 6!`);
```

Every time you run this program, you'll get different results because `Math.random()` produces a different number each time. Some runs might take 1 roll, others might take 20.

### When to Use for vs while

- **`for` loop**: When you know how many times to repeat (count to 10, loop through 50 items)
- **`while` loop**: When you're repeating until a condition changes (keep asking until the user says "quit", keep rolling until you get a 6)

---

## The do...while Loop

The `do...while` loop is a variation of `while` that always runs at least once, because the condition is checked *after* the code runs:

```javascript
let number = 1;

do {
  console.log(`Number: ${number}`);
  number++;
} while (number <= 5);
```

This is useful when you need the code to execute at least one time before checking the condition:

```javascript
// Generate a random number and ensure it's above 50
let randomNum;

do {
  randomNum = Math.floor(Math.random() * 100) + 1;
  console.log(`Generated: ${randomNum}`);
} while (randomNum <= 50);

console.log(`Final number: ${randomNum} (above 50)`);
```

The `do...while` loop is the least common of the three. Most of the time, `for` and `while` will cover your needs. But when you need that "run at least once" guarantee, `do...while` is the right tool.

---

## break and continue

Sometimes you need more control over your loops. `break` and `continue` give you that.

### break: Exit the Loop Early

`break` immediately stops the loop and moves on to the code after it:

```javascript
// Search for a specific number
for (let i = 1; i <= 100; i++) {
  if (i === 42) {
    console.log(`Found it! The number is ${i}`);
    break; // Stop looping - no need to check 43 through 100
  }
}
console.log("Search complete.");
```

Without `break`, the loop would keep running through all 100 numbers even after finding 42. `break` saves time and processing.

### continue: Skip to the Next Iteration

`continue` skips the rest of the current iteration and jumps to the next one:

```javascript
// Print only odd numbers from 1 to 20
for (let i = 1; i <= 20; i++) {
  if (i % 2 === 0) {
    continue; // Skip even numbers
  }
  console.log(i); // Only runs for odd numbers
}
```

Here's another example. Skip items that don't meet a criteria:

```javascript
// Process scores, but skip invalid ones (below 0 or above 100)
const scores = [85, -5, 92, 101, 78, 0, 65];

let validTotal = 0;
let validCount = 0;

for (let i = 0; i < scores.length; i++) {
  if (scores[i] < 0 || scores[i] > 100) {
    console.log(`Skipping invalid score: ${scores[i]}`);
    continue;
  }
  validTotal += scores[i];
  validCount++;
}

console.log(`Average of valid scores: ${(validTotal / validCount).toFixed(1)}`);
```

Don't worry about the array syntax in that example. We'll cover arrays in depth in Lesson 6. For now, just notice how `continue` lets you skip certain iterations without stopping the entire loop.

---

## Looping Through Strings

Strings are sequences of characters, and you can loop through them character by character:

```javascript
const word = "JavaScript";

for (let i = 0; i < word.length; i++) {
  console.log(`Character ${i}: ${word[i]}`);
}
// Character 0: J
// Character 1: a
// Character 2: v
// ... and so on
```

This works because strings have a `.length` property and you can access individual characters with bracket notation (`word[0]`, `word[1]`, etc.), just like you would with a numbered list. The first character is at position 0, not position 1. This is called **zero-based indexing** and is standard in almost every programming language.

Here's a practical example, counting specific characters:

```javascript
const sentence = "She sells seashells by the seashore";
let sCount = 0;

for (let i = 0; i < sentence.length; i++) {
  if (sentence[i] === "s" || sentence[i] === "S") {
    sCount++;
  }
}

console.log(`The letter 's' appears ${sCount} times.`); // 8 times
```

---

## Nested Loops

You can put a loop inside another loop. The inner loop runs completely for each iteration of the outer loop. Think of it like a clock: the minute hand (inner loop) goes around 60 times for every single move of the hour hand (outer loop).

```javascript
// Multiplication table
console.log("=== Multiplication Table (1-5) ===\n");

for (let row = 1; row <= 5; row++) {
  let line = "";
  for (let col = 1; col <= 5; col++) {
    const product = row * col;
    // padStart adds spaces so numbers line up nicely
    line += String(product).padStart(4, " ");
  }
  console.log(line);
}
```

Output:

```
=== Multiplication Table (1-5) ===

   1   2   3   4   5
   2   4   6   8  10
   3   6   9  12  15
   4   8  12  16  20
   5  10  15  20  25
```

The `padStart(4, " ")` method pads the number with spaces so each takes up exactly 4 characters, making the columns align. Don't worry if nested loops feel tricky. They take practice. The key insight is that the inner loop resets and runs fully for every single step of the outer loop.

---

## Common Loop Patterns

These patterns come up again and again. Learn to recognize them and you'll solve problems faster.

### Counting

```javascript
// Count how many numbers between 1 and 100 are divisible by 7
let count = 0;

for (let i = 1; i <= 100; i++) {
  if (i % 7 === 0) {
    count++;
  }
}

console.log(`Numbers divisible by 7: ${count}`); // 14
```

### Accumulating

```javascript
// Calculate the factorial of a number (5! = 5 * 4 * 3 * 2 * 1 = 120)
const n = 5;
let factorial = 1;

for (let i = n; i >= 1; i--) {
  factorial *= i;
}

console.log(`${n}! = ${factorial}`); // 5! = 120
```

### Searching

```javascript
// Find the first number greater than 1000 that is divisible by both 7 and 13
let found = 0;

for (let i = 1001; i < 10000; i++) {
  if (i % 7 === 0 && i % 13 === 0) {
    found = i;
    break;
  }
}

console.log(`First number > 1000 divisible by 7 and 13: ${found}`); // 1001
```

### Building Strings

```javascript
// Build a progress bar
const total = 20;
const completed = 14;

let bar = "[";
for (let i = 0; i < total; i++) {
  if (i < completed) {
    bar += "=";
  } else {
    bar += " ";
  }
}
bar += "]";

const percent = Math.round((completed / total) * 100);
console.log(`${bar} ${percent}%`);
// [==============      ] 70%
```

---

## Avoiding Infinite Loops

An **infinite loop** runs forever because its condition never becomes `false`. This will freeze your terminal. You'll have to press `Ctrl + C` to force-stop the program.

```javascript
// DANGER: Infinite loop! Don't run this.
// let i = 0;
// while (i < 10) {
//   console.log(i);
//   // Oops - forgot to increment i! i is always 0, so i < 10 is always true
// }
```

Common causes of infinite loops:

1. **Forgetting to update the counter** in a `while` loop
2. **Updating the counter in the wrong direction** (decrementing when you should increment)
3. **A condition that can never become false** (e.g., `while (true)` without a `break`)

Tips to avoid them:

- Always double-check that your condition will eventually become `false`
- Make sure your counter is moving toward the stopping point
- When testing a new loop, start with a small number (loop 5 times, not 5000)
- Remember `Ctrl + C` is your emergency exit

---

## Practical Examples

### FizzBuzz

FizzBuzz is a classic programming challenge. Print numbers 1 to 30, but replace multiples of 3 with "Fizz", multiples of 5 with "Buzz", and multiples of both with "FizzBuzz":

```javascript
console.log("=== FizzBuzz ===\n");

for (let i = 1; i <= 30; i++) {
  if (i % 3 === 0 && i % 5 === 0) {
    console.log("FizzBuzz");
  } else if (i % 3 === 0) {
    console.log("Fizz");
  } else if (i % 5 === 0) {
    console.log("Buzz");
  } else {
    console.log(i);
  }
}
```

Notice that the `FizzBuzz` check (divisible by both 3 AND 5) must come first. If you check for 3 or 5 individually first, the combined case would never trigger. It's the same "order matters" principle from Lesson 3.

### Counting Characters

```javascript
const text = "We Build Black empowers the community through technology";

let vowels = 0;
let consonants = 0;
let spaces = 0;
let other = 0;

const vowelList = "aeiouAEIOU";

for (let i = 0; i < text.length; i++) {
  const char = text[i];

  if (char === " ") {
    spaces++;
  } else if (vowelList.includes(char)) {
    vowels++;
  } else if (char.toLowerCase() >= "a" && char.toLowerCase() <= "z") {
    consonants++;
  } else {
    other++;
  }
}

console.log(`\nText: "${text}"`);
console.log(`Vowels: ${vowels}`);
console.log(`Consonants: ${consonants}`);
console.log(`Spaces: ${spaces}`);
console.log(`Other: ${other}`);
console.log(`Total characters: ${text.length}`);
```

### Number Guessing Game (Simple Version)

```javascript
// The computer picks a random number, and we simulate guesses
const secretNumber = Math.floor(Math.random() * 20) + 1;
let guess = 0;
let attempts = 0;
const maxAttempts = 10;

console.log("=== Number Guessing Game ===");
console.log("I'm thinking of a number between 1 and 20.\n");

// Simulate guessing with a simple strategy: try 1, 2, 3, etc.
// (In the project, you'll use real user input!)
while (guess !== secretNumber && attempts < maxAttempts) {
  attempts++;
  guess = Math.floor(Math.random() * 20) + 1; // Random guess for simulation

  if (guess === secretNumber) {
    console.log(`Guess ${attempts}: ${guess} - Correct! You got it!`);
  } else if (guess < secretNumber) {
    console.log(`Guess ${attempts}: ${guess} - Too low!`);
  } else {
    console.log(`Guess ${attempts}: ${guess} - Too high!`);
  }
}

if (guess !== secretNumber) {
  console.log(`\nOut of attempts! The number was ${secretNumber}.`);
} else {
  console.log(`\nYou found it in ${attempts} ${attempts === 1 ? "attempt" : "attempts"}!`);
}
```

---

## Key Takeaways

1. **`for` loops** are ideal when you know how many times to repeat. They have three parts: initialization, condition, and update.
2. **`while` loops** repeat as long as a condition is true. Use them when you don't know the number of iterations in advance.
3. **`do...while` loops** always run at least once, then check the condition. Useful for "do this, then decide if we should do it again" situations.
4. **`break`** exits a loop immediately. **`continue`** skips to the next iteration. Both give you finer control over loop behavior.
5. **Strings are iterable.** You can loop through them character by character using bracket notation and `.length`.
6. **Common patterns** include counting, accumulating (running totals), searching (find and break), and building strings. Recognizing these patterns speeds up problem-solving.
7. **Avoid infinite loops** by ensuring your condition will eventually become `false`. Use `Ctrl + C` in the terminal as your emergency stop.

---

## Try It Yourself

Create a file called `loop-challenges.js` with these three challenges:

**Challenge 1: Pyramid Printer**: Use nested loops to print this pyramid pattern (5 rows):

```
    *
   ***
  *****
 *******
*********
```

Hint: Each row has leading spaces and then an odd number of stars. Row 1 has 4 spaces and 1 star. Row 2 has 3 spaces and 3 stars. See the pattern?

**Challenge 2: Sum of Digits**: Write a `while` loop that takes a number like 12345 and calculates the sum of its digits (1 + 2 + 3 + 4 + 5 = 15). Hint: use `% 10` to get the last digit and `Math.floor(number / 10)` to remove it.

**Challenge 3: Password Strength Meter**: Loop through a password string and count:
- Uppercase letters
- Lowercase letters
- Numbers (hint: check if `char >= "0" && char <= "9"`)
- Special characters (anything that's not a letter or number)

Then rate the password:
- "Weak" if it only has one type of character
- "Medium" if it has two types
- "Strong" if it has three types
- "Very Strong" if it has all four types

Test with passwords like `"hello"`, `"Hello123"`, `"P@ssw0rd!"`, and `"abc"`.

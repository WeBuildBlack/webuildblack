---
title: "Control Flow and Conditionals"
estimatedMinutes: 45
isFreePreview: false
---

# Control Flow and Conditionals

Up to now, your programs have been linear. JavaScript reads your code from top to bottom, executing every line in order. But real programs need to make decisions. Should the user see a welcome message or an error? Is the password strong enough? Does this person qualify for the program?

**Control flow** is how you tell your program to take different paths based on conditions. Think of it like a choose-your-own-adventure book: depending on the choices (conditions), the story (your program) goes in different directions. This is where your programs start to feel intelligent.

---

## The if Statement

The `if` statement is the most fundamental decision-making tool in JavaScript. It checks a condition, and if that condition is `true`, it runs the code inside the curly braces:

```javascript
const temperature = 95;

if (temperature > 90) {
  console.log("It's really hot outside! Stay hydrated.");
}
```

The structure is:

```javascript
if (condition) {
  // Code that runs ONLY if the condition is true
}
```

If the condition is `false`, JavaScript skips everything inside the braces and moves on:

```javascript
const temperature = 72;

if (temperature > 90) {
  console.log("It's really hot outside!"); // This line never runs
}

console.log("Have a great day!"); // This always runs, regardless
```

You can put any expression that produces a boolean inside the parentheses:

```javascript
const age = 25;
const isMember = true;

if (age >= 18) {
  console.log("You're an adult.");
}

if (isMember) {
  console.log("Welcome back, member!");
}

if (age >= 21 && isMember) {
  console.log("You can access the VIP section.");
}
```

---

## if...else

What if you want to do one thing when the condition is true and something *different* when it's false? That's what `else` is for:

```javascript
const hour = 14; // 2 PM in 24-hour time

if (hour < 12) {
  console.log("Good morning!");
} else {
  console.log("Good afternoon!");
}
```

The `else` block runs when the `if` condition is `false`. Every `if` can have at most one `else`, and it always comes right after the closing brace of the `if`.

```javascript
const balance = 250;
const withdrawAmount = 300;

if (withdrawAmount <= balance) {
  const newBalance = balance - withdrawAmount;
  console.log(`Withdrawal successful. New balance: $${newBalance}`);
} else {
  console.log("Insufficient funds. Please try a smaller amount.");
}
// Output: Insufficient funds. Please try a smaller amount.
```

---

## if...else if...else: Chaining Conditions

Sometimes you have more than two possibilities. You can chain multiple conditions together with `else if`:

```javascript
const score = 85;

if (score >= 90) {
  console.log("Grade: A");
} else if (score >= 80) {
  console.log("Grade: B");
} else if (score >= 70) {
  console.log("Grade: C");
} else if (score >= 60) {
  console.log("Grade: D");
} else {
  console.log("Grade: F");
}
// Output: Grade: B
```

Here's how JavaScript evaluates this:

1. Is `score >= 90`? No (85 is not >= 90). Move to the next condition.
2. Is `score >= 80`? Yes (85 >= 80). Run this block: print "Grade: B".
3. **Stop.** Once a condition is true, JavaScript runs that block and skips all the rest.

This "stop at the first match" behavior is important. Even though 85 is also >= 70 and >= 60, those conditions never get checked because `score >= 80` already matched.

### Order Matters

Because JavaScript stops at the first `true` condition, the order of your conditions matters:

```javascript
// WRONG ORDER - this always prints "Grade: D" for any passing score
const score = 95;

if (score >= 60) {
  console.log("Grade: D"); // 95 >= 60 is true, so this runs!
} else if (score >= 70) {
  console.log("Grade: C"); // Never reached for scores above 60
} else if (score >= 80) {
  console.log("Grade: B"); // Never reached
} else if (score >= 90) {
  console.log("Grade: A"); // Never reached
}
```

Always go from most specific to least specific. Check the highest threshold first.

---

## Truthy and Falsy Values

Here's something that catches beginners off guard: in JavaScript, you don't always need an explicit `true` or `false` in your conditions. JavaScript treats certain values as "falsy" (they act like `false`) and everything else as "truthy" (acts like `true`).

**Falsy values** (these all act like `false` in a condition):

```javascript
if (false)     { } // false is falsy (obviously)
if (0)         { } // zero is falsy
if ("")        { } // empty string is falsy
if (null)      { } // null is falsy
if (undefined) { } // undefined is falsy
if (NaN)       { } // NaN (Not a Number) is falsy
```

**Everything else is truthy**, including things you might not expect:

```javascript
if (42)            { console.log("truthy"); } // any non-zero number
if ("hello")       { console.log("truthy"); } // any non-empty string
if ("0")           { console.log("truthy"); } // string "0" is NOT empty
if ("false")       { console.log("truthy"); } // string "false" is NOT empty
```

This is useful for checking if a variable has a meaningful value:

```javascript
const username = "Maya";

if (username) {
  console.log(`Welcome, ${username}!`);
} else {
  console.log("Please enter your name.");
}
```

If `username` is an empty string `""`, `null`, or `undefined`, the `else` block runs. If it has any actual text, the `if` block runs. This is a common pattern you'll see in real codebases everywhere.

---

## The Ternary Operator

Sometimes you need a quick, one-line conditional. The **ternary operator** is a shorthand for a simple `if...else`:

```javascript
const age = 22;

// Regular if...else
let message;
if (age >= 18) {
  message = "adult";
} else {
  message = "minor";
}

// Same thing with the ternary operator
const message2 = age >= 18 ? "adult" : "minor";
```

The syntax is: `condition ? valueIfTrue : valueIfFalse`

It reads like a question: "Is age >= 18? If yes, use 'adult'. If no, use 'minor'."

```javascript
const score = 85;
const result = score >= 60 ? "Pass" : "Fail";
console.log(result); // Pass

const hour = 20;
const greeting = hour < 12 ? "Good morning" : "Good evening";
console.log(greeting); // Good evening

// You can use ternaries inside template literals
console.log(`Status: ${score >= 60 ? "Pass" : "Fail"}`);
```

The ternary is great for simple, two-way decisions. For anything more complex, use a regular `if...else`. Readability always wins over cleverness.

---

## Switch Statements

When you're comparing one value against many specific options, a `switch` statement can be cleaner than a long chain of `if...else if`:

```javascript
const day = "Wednesday";

switch (day) {
  case "Monday":
    console.log("Start of the work week. Let's go!");
    break;
  case "Tuesday":
    console.log("Taco Tuesday!");
    break;
  case "Wednesday":
    console.log("Halfway there. Keep pushing.");
    break;
  case "Thursday":
    console.log("Almost Friday!");
    break;
  case "Friday":
    console.log("TGIF! You made it.");
    break;
  case "Saturday":
  case "Sunday":
    console.log("Weekend vibes. Rest up.");
    break;
  default:
    console.log("That's not a valid day.");
}
// Output: Halfway there. Keep pushing.
```

Key things to notice:

- **`break`** is required after each case. Without it, JavaScript "falls through" to the next case and keeps running code. (This is actually what lets "Saturday" and "Sunday" share the same code above. Saturday has no `break`, so it falls through to Sunday's code.)
- **`default`** is like `else`. It runs if no case matches. Always include it.
- **`switch` uses strict equality** (`===`) to compare values.

When should you use `switch` vs `if...else if`? Use `switch` when you're comparing one variable against many specific values (like days of the week, menu options, or status codes). Use `if...else if` when your conditions involve ranges or complex expressions.

---

## Combining Conditions

Real-world decisions are rarely simple. You often need to combine multiple conditions using the logical operators you learned in the last lesson:

```javascript
const age = 22;
const isStudent = true;
const income = 35000;

// Check program eligibility
if (age >= 18 && age <= 30 && income < 50000) {
  console.log("You're eligible for the Fast Track program!");
} else {
  console.log("You don't meet the eligibility requirements.");
}

// Check discount eligibility (any one condition is enough)
if (isStudent || age >= 65 || income < 25000) {
  console.log("You qualify for a discount!");
}

// Nested conditions
if (age >= 18) {
  if (isStudent) {
    console.log("Student rate: $25");
  } else {
    console.log("Adult rate: $50");
  }
} else {
  console.log("Youth rate: $15");
}
```

Nested `if` statements work but can get hard to read quickly. When possible, flatten them with `&&`:

```javascript
// Instead of nesting:
if (age >= 18) {
  if (isStudent) {
    console.log("Student rate: $25");
  }
}

// Flatten with &&:
if (age >= 18 && isStudent) {
  console.log("Student rate: $25");
}
```

---

## Practical Examples

### Grade Calculator

```javascript
const studentName = "Marcus";
const homework = 88;
const midterm = 76;
const finalExam = 92;

// Calculate weighted average
const average = (homework * 0.3) + (midterm * 0.3) + (finalExam * 0.4);

let letterGrade;
let comment;

if (average >= 93) {
  letterGrade = "A";
  comment = "Outstanding work!";
} else if (average >= 90) {
  letterGrade = "A-";
  comment = "Excellent!";
} else if (average >= 87) {
  letterGrade = "B+";
  comment = "Great job!";
} else if (average >= 83) {
  letterGrade = "B";
  comment = "Good work, keep it up!";
} else if (average >= 80) {
  letterGrade = "B-";
  comment = "Solid effort.";
} else if (average >= 77) {
  letterGrade = "C+";
  comment = "Room for improvement.";
} else if (average >= 70) {
  letterGrade = "C";
  comment = "Let's set up a study plan.";
} else {
  letterGrade = "Below C";
  comment = "Please see the instructor.";
}

console.log(`\n=== Report Card ===`);
console.log(`Student: ${studentName}`);
console.log(`Homework: ${homework}  Midterm: ${midterm}  Final: ${finalExam}`);
console.log(`Average: ${average.toFixed(1)}`);
console.log(`Grade: ${letterGrade}`);
console.log(`Comment: ${comment}`);
console.log(`==================\n`);
```

### Eligibility Checker

```javascript
const applicantAge = 24;
const hasHighSchoolDiploma = true;
const yearsExperience = 1;
const isUSResident = true;
const hasFelony = false;

console.log("=== Program Eligibility Check ===\n");

// Check each requirement individually
const meetsAgeRequirement = applicantAge >= 18 && applicantAge <= 35;
const meetsEducation = hasHighSchoolDiploma;
const meetsResidency = isUSResident;
const clearBackground = !hasFelony;

// All requirements must be met
const isEligible = meetsAgeRequirement && meetsEducation && meetsResidency && clearBackground;

// Determine track recommendation based on experience
let recommendedTrack;

if (yearsExperience === 0) {
  recommendedTrack = "Foundations (beginner)";
} else if (yearsExperience <= 2) {
  recommendedTrack = "Accelerated (some experience)";
} else {
  recommendedTrack = "Advanced (career switcher)";
}

console.log(`Age requirement (18-35): ${meetsAgeRequirement ? "PASS" : "FAIL"}`);
console.log(`Education requirement: ${meetsEducation ? "PASS" : "FAIL"}`);
console.log(`Residency requirement: ${meetsResidency ? "PASS" : "FAIL"}`);
console.log(`Background check: ${clearBackground ? "PASS" : "FAIL"}`);
console.log(`\nOverall eligible: ${isEligible ? "YES" : "NO"}`);

if (isEligible) {
  console.log(`Recommended track: ${recommendedTrack}`);
}
```

### Simple Recommendation Engine

```javascript
const mood = "energetic";
const timeOfDay = "morning";
const isWeekend = true;

let recommendation;

if (mood === "tired" && timeOfDay === "morning") {
  recommendation = "Start with a coffee and some light stretching.";
} else if (mood === "tired" && timeOfDay === "evening") {
  recommendation = "Get some rest. Tomorrow is a new day.";
} else if (mood === "energetic" && isWeekend) {
  recommendation = "Great energy! Hit up a hackathon or build a side project.";
} else if (mood === "energetic" && !isWeekend) {
  recommendation = "Channel that energy into your toughest task today.";
} else if (mood === "stressed") {
  recommendation = isWeekend
    ? "Take a break. Go for a walk, call a friend."
    : "Break your work into smaller pieces. One step at a time.";
} else {
  recommendation = "Whatever you do today, make it count.";
}

console.log(`Mood: ${mood}`);
console.log(`Time: ${timeOfDay}`);
console.log(`Weekend: ${isWeekend}`);
console.log(`\nRecommendation: ${recommendation}`);
```

---

## Key Takeaways

1. **`if` statements** check a condition and run code only when it's true. Add `else` for a two-way decision, or chain `else if` for multiple options.
2. **Order matters** in `if...else if` chains. JavaScript stops at the first true condition, so put the most specific checks first.
3. **Truthy and falsy** values let you check for the presence of data without explicit comparisons. Empty strings, `0`, `null`, `undefined`, and `NaN` are all falsy.
4. **The ternary operator** (`condition ? ifTrue : ifFalse`) is a concise shorthand for simple two-way decisions, especially useful when assigning a value.
5. **`switch` statements** are clean alternatives to long `if...else if` chains when comparing one value against many specific options. Always include `break` and `default`.
6. **Combine conditions** with `&&` (AND), `||` (OR), and `!` (NOT) to build complex, real-world logic.
7. **Flatten nested conditions** with `&&` when possible to keep your code readable.

---

## Try It Yourself

Create a file called `ticket-pricer.js` that determines the price of a movie ticket based on these rules:

1. Create variables for the person's age, the show time (use a number like 14 for 2 PM), and whether they're a WBB member (boolean). Change these variables to test different scenarios.
   - Children (under 13): $8
   - Teens (13-17): $11
   - Adults (18-64): $14
   - Seniors (65+): $9
2. If it's a matinee showing (show time before 17, meaning before 5 PM), apply a $3 discount to any ticket.
3. If the person is a WBB member, they get an additional 10% off the (possibly already discounted) price.
4. Print a receipt showing:
   - The age group
   - Base price
   - Any discounts applied (matinee, member, or both)
   - Final price
5. If the final price ends up at $0 or below (shouldn't happen, but be safe), print "Error: Invalid price" instead of the receipt.

Test your program with different combinations: a 10-year-old at a matinee, a 25-year-old WBB member at an evening show, a 70-year-old senior at a matinee who is also a member. Make sure every path works correctly.

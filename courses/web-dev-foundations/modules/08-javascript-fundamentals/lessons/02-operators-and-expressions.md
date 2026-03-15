---
title: "Operators and Expressions"
estimatedMinutes: 40
isFreePreview: false
---

# Operators and Expressions

In the last lesson, you learned how to store values in variables. Now it's time to *do things* with those values. Operators are the verbs of programming. They take values and produce new values. Every calculation, every comparison, every decision your code makes starts with an operator.

By the end of this lesson, you'll be able to do math, compare values, combine conditions, and build expressions that power real programs. Let's dig in.

---

## Arithmetic Operators

You already know basic math operators from everyday life. JavaScript uses the same symbols, plus a couple of extras:

```javascript
// Addition
console.log(10 + 3);   // 13

// Subtraction
console.log(10 - 3);   // 7

// Multiplication
console.log(10 * 3);   // 30

// Division
console.log(10 / 3);   // 3.3333333333333335

// Remainder (modulo) - what's left over after division
console.log(10 % 3);   // 1  (10 divided by 3 is 3 remainder 1)
console.log(12 % 4);   // 0  (12 divides evenly by 4)
console.log(7 % 2);    // 1  (odd numbers always have remainder 1 when divided by 2)

// Exponentiation (power of)
console.log(2 ** 3);   // 8  (2 to the power of 3 = 2 * 2 * 2)
console.log(5 ** 2);   // 25 (5 squared)
```

The **remainder operator** (`%`) might be new to you. It gives you what's left over after division. This is surprisingly useful. You'll use it to check if a number is even or odd, to wrap around values, and for many other patterns:

```javascript
// Is a number even or odd?
const number = 15;
console.log(number % 2); // 1 - remainder of 1 means it's odd
// If number % 2 equals 0, the number is even

// What hour is it after adding hours?
const currentHour = 10;
const hoursToAdd = 15;
const newHour = (currentHour + hoursToAdd) % 24;
console.log(newHour); // 1 (it wraps around past 24)
```

---

## Assignment Operators

You've already used the basic assignment operator (`=`). JavaScript has shorthand versions that combine math with assignment:

```javascript
let score = 100;

// These two lines do the same thing:
score = score + 10;
score += 10;        // Shorthand: add 10 to the current value

// Same pattern for other operations:
score -= 5;   // Subtract 5 from score (same as score = score - 5)
score *= 2;   // Multiply score by 2 (same as score = score * 2)
score /= 4;   // Divide score by 4 (same as score = score / 4)

console.log(score);
```

These shorthand operators save typing and make your intent clearer. When you see `score += 10`, you immediately know: "The score is increasing by 10." It's a common pattern in games, shopping carts, counters, anywhere a value accumulates.

There are also two ultra-short shortcuts for adding or subtracting 1:

```javascript
let count = 0;
count++;  // Same as count += 1 or count = count + 1
count++;
count++;
console.log(count); // 3

count--;  // Same as count -= 1 or count = count - 1
console.log(count); // 2
```

`++` and `--` are called the **increment** and **decrement** operators. You'll see them everywhere, especially in loops (Lesson 4).

---

## Comparison Operators

Comparison operators compare two values and give you back a **boolean**, either `true` or `false`. These are the building blocks of decision-making in your code.

```javascript
const age = 25;

// Greater than
console.log(age > 18);   // true
console.log(age > 30);   // false

// Less than
console.log(age < 30);   // true
console.log(age < 18);   // false

// Greater than or equal to
console.log(age >= 25);  // true
console.log(age >= 26);  // false

// Less than or equal to
console.log(age <= 25);  // true
console.log(age <= 24);  // false

// Strict equality - are these the same value AND the same type?
console.log(age === 25);   // true
console.log(age === "25"); // false (number vs string)

// Strict inequality - are these NOT the same?
console.log(age !== 30);   // true
console.log(age !== 25);   // false
```

### Why === Instead of ==?

JavaScript has two kinds of equality: **strict** (`===`) and **loose** (`==`). The difference matters:

```javascript
// Strict equality (===) - checks value AND type
console.log(5 === 5);     // true  (same value, same type)
console.log(5 === "5");   // false (same value, different types)

// Loose equality (==) - converts types, then checks value
console.log(5 == "5");    // true  (JavaScript converts "5" to 5, then compares)
console.log(0 == false);  // true  (JavaScript considers these "equal")
console.log("" == false); // true  (this is getting weird)
```

Loose equality (`==`) tries to be "helpful" by converting types before comparing. But this helpfulness leads to surprising, hard-to-debug behavior. The JavaScript community overwhelmingly recommends: **always use `===` and `!==`.** Pretend `==` doesn't exist. You'll write more predictable, less buggy code.

---

## Logical Operators

Logical operators let you combine multiple conditions. Think of them as the "and," "or," and "not" of code.

### AND (&&)

The `&&` operator returns `true` only if **both** sides are true:

```javascript
const age = 25;
const hasID = true;

// Both conditions must be true
console.log(age >= 21 && hasID);        // true (25 >= 21 AND hasID is true)
console.log(age >= 21 && hasID === false); // false (age is fine, but no ID)

// Real-world: can this person enter the venue?
const canEnter = age >= 21 && hasID;
console.log(canEnter); // true
```

### OR (||)

The `||` operator returns `true` if **at least one** side is true:

```javascript
const isStudent = true;
const isSenior = false;

// At least one condition must be true
console.log(isStudent || isSenior); // true (isStudent is true)
console.log(false || false);        // false (neither is true)

// Real-world: does this person get a discount?
const getsDiscount = isStudent || isSenior;
console.log(getsDiscount); // true
```

### NOT (!)

The `!` operator flips a boolean. `true` becomes `false`, `false` becomes `true`:

```javascript
const isRaining = true;

console.log(!isRaining);  // false
console.log(!false);      // true

// Real-world: should we go outside?
const goOutside = !isRaining;
console.log(goOutside); // false (it's raining, so we stay inside)
```

You can combine these operators to build complex conditions:

```javascript
const temperature = 75;
const isWeekend = true;
const isRaining = false;

// Good day for a cookout?
const perfectDay = temperature > 70 && isWeekend && !isRaining;
console.log(perfectDay); // true
```

---

## String Concatenation vs Template Literals

You have two ways to combine strings with other values. Let's compare them:

### Concatenation with +

```javascript
const firstName = "Maya";
const lastName = "Johnson";

// String concatenation - joining strings with +
const fullName = firstName + " " + lastName;
console.log(fullName); // Maya Johnson

// Gets messy with multiple values
const age = 27;
const message = "My name is " + firstName + " " + lastName + " and I am " + age + " years old.";
console.log(message);
```

See how the second example is hard to read? All those quotes and plus signs make it easy to miss a space or misplace a quote.

### Template Literals with Backticks

```javascript
const firstName = "Maya";
const lastName = "Johnson";
const age = 27;

// Template literal - cleaner and easier to read
const message = `My name is ${firstName} ${lastName} and I am ${age} years old.`;
console.log(message); // My name is Maya Johnson and I am 27 years old.
```

Template literals are almost always the better choice. They're easier to read, easier to write, and less error-prone. You can also put expressions inside `${}`:

```javascript
const price = 49.99;
const taxRate = 0.08;

console.log(`Subtotal: $${price}`);
console.log(`Tax: $${(price * taxRate).toFixed(2)}`);
console.log(`Total: $${(price * (1 + taxRate)).toFixed(2)}`);
// Subtotal: $49.99
// Tax: $4.00
// Total: $53.99
```

The `.toFixed(2)` method rounds a number to 2 decimal places and returns it as a string, perfect for displaying money.

---

## Operator Precedence

When you have multiple operators in one expression, JavaScript follows an order of operations, just like math class. Multiplication and division happen before addition and subtraction:

```javascript
console.log(2 + 3 * 4);     // 14 (not 20 - multiplication first)
console.log((2 + 3) * 4);   // 20 (parentheses force addition first)
```

Here's the general order, from highest to lowest priority:

1. Parentheses `()`
2. Exponentiation `**`
3. Multiplication `*`, Division `/`, Remainder `%`
4. Addition `+`, Subtraction `-`
5. Comparison operators (`>`, `<`, `>=`, `<=`, `===`, `!==`)
6. Logical NOT `!`
7. Logical AND `&&`
8. Logical OR `||`
9. Assignment `=`, `+=`, etc.

You don't need to memorize this table. Just follow one rule: **when in doubt, use parentheses.** They make your intent explicit and your code readable:

```javascript
// Without parentheses - you have to know the precedence rules
const result = score > 50 && lives > 0 || hasCheatCode;

// With parentheses - crystal clear what you mean
const result = (score > 50 && lives > 0) || hasCheatCode;
```

---

## Building Expressions

An **expression** is any piece of code that produces a value. Every time you combine operators with values, you're building an expression. Understanding this concept unlocks how JavaScript thinks.

```javascript
// These are all expressions - they each produce a value
42                          // A number literal (value: 42)
"hello"                     // A string literal (value: "hello")
5 + 3                       // An arithmetic expression (value: 8)
age >= 18                   // A comparison expression (value: true or false)
firstName + " " + lastName  // A string expression (value: "Maya Johnson")
```

You can store the result of any expression in a variable:

```javascript
const total = price * quantity;
const isEligible = age >= 18 && hasID;
const displayName = `${firstName} ${lastName}`;
```

You can also use expressions anywhere a value is expected:

```javascript
console.log(5 + 3);           // Expression as an argument
console.log(age >= 18);       // Another expression as an argument
const doubled = (score + bonus) * 2;  // Expression inside expression
```

---

## Practical Examples

Let's put operators to work on problems you might actually encounter.

### Tip Calculator

```javascript
const mealCost = 45.00;
const tipPercent = 20;
const numberOfPeople = 3;

const tipAmount = mealCost * (tipPercent / 100);
const totalBill = mealCost + tipAmount;
const perPerson = totalBill / numberOfPeople;

console.log(`Meal cost: $${mealCost.toFixed(2)}`);
console.log(`Tip (${tipPercent}%): $${tipAmount.toFixed(2)}`);
console.log(`Total: $${totalBill.toFixed(2)}`);
console.log(`Per person: $${perPerson.toFixed(2)}`);
```

### Age Eligibility Checker

```javascript
const age = 16;
const hasParentPermission = true;

const canVote = age >= 18;
const canDrive = age >= 16;
const canSeeRatedRMovie = age >= 17 || hasParentPermission;

console.log(`Age: ${age}`);
console.log(`Can vote: ${canVote}`);               // false
console.log(`Can drive: ${canDrive}`);              // true
console.log(`Can see R movie: ${canSeeRatedRMovie}`); // true (parent permission)
```

### Name Formatter

```javascript
const first = "maya";
const middle = "rose";
const last = "johnson";

// Capitalize first letter of each name
const formatName = (name) => name.charAt(0).toUpperCase() + name.slice(1);

// Don't worry about the function syntax yet. We'll cover that in Lesson 5
// For now, focus on the string operations:
const firstUpper = first.charAt(0).toUpperCase() + first.slice(1);
const middleInitial = middle.charAt(0).toUpperCase() + ".";
const lastUpper = last.charAt(0).toUpperCase() + last.slice(1);

const formalName = `${lastUpper}, ${firstUpper} ${middleInitial}`;
console.log(formalName); // Johnson, Maya R.
```

The `.charAt(0)` method gets the character at position 0 (the first letter). Combined with `.toUpperCase()` and `.slice(1)` (the rest of the string), you can capitalize any word.

---

## Key Takeaways

1. **Arithmetic operators** (`+`, `-`, `*`, `/`, `%`, `**`) do math. The remainder operator `%` is especially useful for checking even/odd numbers and wrapping values.
2. **Assignment shortcuts** (`+=`, `-=`, `*=`, `/=`, `++`, `--`) update variables in place, making code shorter and clearer.
3. **Comparison operators** (`===`, `!==`, `>`, `<`, `>=`, `<=`) compare values and return booleans. Always use `===` (strict equality), never `==`.
4. **Logical operators** (`&&`, `||`, `!`) combine conditions. AND requires both sides to be true; OR requires at least one; NOT flips the value.
5. **Template literals** (backticks with `${}`) are cleaner and more readable than string concatenation with `+`.
6. **Use parentheses** to make operator precedence explicit. Don't rely on memorizing the order.
7. **An expression** is any code that produces a value. Understanding expressions is key to understanding how JavaScript evaluates your code.

---

## Try It Yourself

Create a file called `shopping-cart.js` that does the following:

1. Create `const` variables for three items with their prices (e.g., `const shirt = 29.99`)
2. Calculate the subtotal by adding all three prices together
3. Calculate a 15% discount on the subtotal (store the discount amount)
4. Calculate 8.875% sales tax on the discounted price
5. Calculate the final total (subtotal - discount + tax)
6. Use `console.log()` with template literals to print a formatted receipt:
   ```
   === Shopping Receipt ===
   Shirt:     $29.99
   Pants:     $49.99
   Shoes:     $89.99
   Subtotal:  $169.97
   Discount:  -$25.50
   Tax:       $12.82
   Total:     $157.30
   ========================
   ```
7. Add a variable `budget` and use a comparison to check if the total is within budget. Print whether the purchase is affordable: `Within budget: true`

Bonus: Use the remainder operator to check if the final total rounds to an even or odd dollar amount.

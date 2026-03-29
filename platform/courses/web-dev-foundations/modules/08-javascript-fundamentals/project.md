---
title: "Module Project: Quiz Game"
estimatedMinutes: 90
---

# Module Project: Quiz Game

It's time to put everything from this module together. You're going to build an interactive quiz game that runs in the terminal using Node.js. This project will test your understanding of variables, data types, operators, control flow, loops, functions, arrays, and objects, everything you've learned in Module 08.

The quiz game will ask the player multiple-choice questions, accept their answers, track their score, and display results at the end. It's a real, working program that you can show to friends and customize however you want.

---

## What You'll Build

Your quiz game will:

- Present at least 10 multiple-choice questions one at a time
- Accept user input from the terminal (A, B, C, or D)
- Tell the player if they got each question right or wrong
- Show the correct answer when they get one wrong
- Track and display a running score
- Show final results with a percentage and a personalized message
- Organize code into clean, reusable functions

Here's what a session might look like:

```
=== WBB JavaScript Quiz ===
Test your knowledge! 10 questions ahead.

Question 1 of 10:
What keyword declares a variable that CAN be reassigned?

  A) const
  B) let
  C) var
  D) fixed

Your answer: B

Correct! Nice work.
Score: 1/1

---

Question 2 of 10:
Which value is NOT falsy in JavaScript?

  A) 0
  B) ""
  C) "false"
  D) null

Your answer: A

Incorrect. The correct answer was C) "false"
"false" is a non-empty string, so it's truthy!
Score: 1/2

---

...

=== RESULTS ===
You got 8 out of 10 correct (80%)
Great job! You've got a solid grasp of the fundamentals.
```

---

## Getting User Input with readline

In the browser, you get user input from forms and buttons. In Node.js, you use a built-in module called `readline`. Setting it up involves some syntax we haven't covered yet (like promises and async/await), so we're providing the setup code for you. You don't need to understand every line of it right now. Just know that it gives you a function called `askQuestion` that pauses the program and waits for the user to type something.

Here's the readline setup you'll use. This goes at the top of your file:

```javascript
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// This function asks a question and returns the user's answer
function getInput(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}
```

And here's how you use it in your code:

```javascript
// The "async" keyword before the function lets us use "await" inside it
async function main() {
  const name = await getInput("What is your name? ");
  console.log(`Hello, ${name}!`);

  const color = await getInput("What is your favorite color? ");
  console.log(`${color} is a great choice!`);

  rl.close(); // Always close readline when you're done
}

main();
```

The `await` keyword pauses the program until the user types their answer and presses Enter. You'll learn what `async` and `await` really mean in a future course. For now, just follow the pattern: put `async` before your function, and `await` before `getInput()`.

---

## Starter Code

Create a file called `quiz-game.js` and paste in this starter code. Your job is to fill in every section marked with `// TODO`. Read the comments carefully. They explain what each section should do.

```javascript
// ============================================
// WBB JavaScript Quiz Game
// ============================================

const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function getInput(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

// ============================================
// QUIZ DATA
// ============================================

// TODO: Create an array called "questions" containing at least 10 question objects.
// Each object should have:
//   - question: (string) the question text
//   - options: (array of 4 strings) the answer choices
//   - correctIndex: (number 0-3) the index of the correct answer
//   - explanation: (string) a brief explanation of why the answer is correct
//
// Example:
// {
//   question: "What keyword declares a variable that CAN be reassigned?",
//   options: ["const", "let", "var", "fixed"],
//   correctIndex: 1,
//   explanation: "let declares a variable whose value can be changed later."
// }

const questions = [
  // TODO: Add your 10+ questions here
];

// ============================================
// HELPER FUNCTIONS
// ============================================

// TODO: Write a function called "displayQuestion" that takes a question object
// and its number (like 1, 2, 3...) and the total number of questions.
// It should print the question and its options formatted like:
//
// Question 3 of 10:
// What does === check for?
//
//   A) Value only
//   B) Type only
//   C) Value and type
//   D) Neither
//
// Hint: Use the letters array ["A", "B", "C", "D"] to label options.

function displayQuestion(questionObj, questionNumber, totalQuestions) {
  // TODO: Implement this function
}

// TODO: Write a function called "checkAnswer" that takes:
//   - the user's answer (a string like "A", "B", "C", or "D")
//   - the question object
// It should return true if the answer is correct, false otherwise.
// Hint: Convert the letter to an index (A=0, B=1, C=2, D=3)

function checkAnswer(userAnswer, questionObj) {
  // TODO: Implement this function
}

// TODO: Write a function called "getResultMessage" that takes a score and
// total number of questions, and returns a string message based on the percentage:
//   - 90-100%: "Outstanding! You really know your JavaScript!"
//   - 80-89%:  "Great job! You've got a solid grasp of the fundamentals."
//   - 70-79%:  "Good work! Review the topics you missed and you'll be an expert."
//   - 60-69%:  "Not bad! Keep practicing and reviewing the lessons."
//   - Below 60%: "Keep studying! Review the module lessons and try again."

function getResultMessage(score, total) {
  // TODO: Implement this function
}

// TODO: Write a function called "displayResults" that takes the score and total.
// It should print:
//   - A header line
//   - The score as "X out of Y correct"
//   - The percentage
//   - The appropriate message from getResultMessage
//   - A closing line

function displayResults(score, total) {
  // TODO: Implement this function
}

// ============================================
// MAIN GAME LOOP
// ============================================

async function playQuiz() {
  console.log("\n=== WBB JavaScript Quiz ===");
  console.log(`Test your knowledge! ${questions.length} questions ahead.\n`);

  let score = 0;

  // TODO: Loop through each question in the questions array.
  // For each question:
  //   1. Call displayQuestion to show it
  //   2. Use getInput to get the user's answer (prompt: "Your answer: ")
  //   3. Convert the answer to uppercase (so "a" and "A" both work)
  //   4. Validate that the answer is A, B, C, or D. If not, tell the user
  //      and count it as wrong (or ask again, your choice)
  //   5. Call checkAnswer to see if they got it right
  //   6. If correct: print a success message and increment score
  //   7. If incorrect: print what the correct answer was, including the explanation
  //   8. Print the current score (e.g., "Score: 3/5")
  //   9. Print a separator line (---) between questions

  for (let i = 0; i < questions.length; i++) {
    // TODO: Implement the game loop logic here
  }

  // Display final results
  displayResults(score, questions.length);

  rl.close();
}

// ============================================
// START THE GAME
// ============================================

playQuiz();
```

---

## Requirements Checklist

Before you consider this project complete, make sure you've done all of the following:

- [ ] Created at least 10 questions covering topics from this module (variables, data types, operators, control flow, loops, functions, arrays, objects)
- [ ] The `displayQuestion` function properly formats and prints each question with lettered options (A, B, C, D)
- [ ] The `checkAnswer` function correctly compares the user's answer to the correct answer
- [ ] The `getResultMessage` function returns different messages based on the score percentage
- [ ] The `displayResults` function prints a clean, formatted results summary
- [ ] The game loop correctly iterates through all questions
- [ ] User input is handled (converted to uppercase, validated as A/B/C/D)
- [ ] The score is tracked accurately throughout the game
- [ ] Correct answers show a success message
- [ ] Incorrect answers show the correct answer AND the explanation
- [ ] The game runs without errors from start to finish: `node quiz-game.js`

---

## Tips

- **Start small.** Get one question working before adding all 10. Hardcode a simple questions array with 2-3 items, make the loop work, then add more questions.
- **Test as you go.** After writing each function, add a quick `console.log` to test it before moving to the next one.
- **The letter-to-index conversion** is the trickiest part. One approach: create an object like `{ A: 0, B: 1, C: 2, D: 3 }` and look up the user's letter.
- **Don't forget `await`** before `getInput()`. Without it, the program won't wait for the user's answer.
- **Use the `\n` character** for blank lines in your output to keep things readable.

---

## Stretch Goals

Once the basic quiz is working, try adding these features:

### 1. Question Categories
Add a `category` property to each question (like "Variables", "Functions", "Arrays"). At the end, show a breakdown of how the player did in each category.

### 2. Timed Questions
Use `Date.now()` to measure how long each answer takes:
```javascript
const startTime = Date.now();
const answer = await getInput("Your answer: ");
const elapsedSeconds = (Date.now() - startTime) / 1000;
console.log(`(Answered in ${elapsedSeconds.toFixed(1)} seconds)`);
```

### 3. Question Shuffling
Shuffle the questions array before starting so the order is different every time. Use the Fisher-Yates shuffle from the arrays lesson.

### 4. Difficulty Levels
Add a `difficulty` property ("easy", "medium", "hard") to each question. Let the player choose a difficulty at the start and only show questions matching that level.

### 5. High Score Tracking
Use Node.js file system (`fs`) module to save high scores to a JSON file:
```javascript
const fs = require("fs");

// Save a score
function saveScore(name, score, total) {
  let scores = [];
  if (fs.existsSync("highscores.json")) {
    scores = JSON.parse(fs.readFileSync("highscores.json", "utf8"));
  }
  scores.push({ name, score, total, date: new Date().toISOString() });
  scores.sort((a, b) => (b.score / b.total) - (a.score / a.total));
  fs.writeFileSync("highscores.json", JSON.stringify(scores, null, 2));
}

// Display high scores
function showHighScores() {
  if (!fs.existsSync("highscores.json")) {
    console.log("No high scores yet!");
    return;
  }
  const scores = JSON.parse(fs.readFileSync("highscores.json", "utf8"));
  console.log("\n=== High Scores ===");
  scores.slice(0, 5).forEach((entry, i) => {
    const pct = Math.round((entry.score / entry.total) * 100);
    console.log(`${i + 1}. ${entry.name} - ${entry.score}/${entry.total} (${pct}%)`);
  });
}
```

### 6. Play Again
After showing results, ask "Would you like to play again? (Y/N)" and restart the quiz if they say yes.

---

## Submission Checklist

- [ ] File is named `quiz-game.js`
- [ ] Game runs without errors: `node quiz-game.js`
- [ ] All 10+ questions are original and cover module topics
- [ ] All four helper functions are implemented
- [ ] Game loop handles user input correctly
- [ ] Results display correctly with percentage and message
- [ ] Code is organized with clear comments
- [ ] At least one stretch goal attempted (optional but encouraged)

You've built a real interactive program. This quiz game demonstrates variables, data types, control flow, loops, functions, arrays, and objects, all working together. That's a huge milestone. Keep building.

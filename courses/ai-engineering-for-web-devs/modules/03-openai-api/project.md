---
title: "Module Project: AI Code Reviewer"
estimatedMinutes: 75
---

# AI Code Reviewer

Build a CLI tool that takes a source code file, streams a GPT-4o code review in real-time, and uses function calling to output structured findings with severity, line numbers, and suggestions.

## Overview

You now know the OpenAI API inside and out -- chat completions, streaming, function calling, and cost management. Time to combine all of it into one powerful tool. You'll build a CLI code reviewer that reads a JavaScript or Python file, sends it to GPT-4o with a carefully crafted system prompt, streams the review back to your terminal in real-time, and uses function calling to produce structured JSON findings you could feed into a CI pipeline or PR comment. This is a real tool you'll actually use.

## What You'll Practice

- Constructing multi-message conversations with system prompts (from Lesson 1: Chat Completions)
- Implementing streaming responses and processing chunks in real-time (from Lesson 2: Streaming)
- Defining and handling function calls / tool use (from Lesson 3: Function Calling)
- Tracking and displaying token usage and cost (from Lesson 4: Cost Management)
- Combining all four skills in a single, production-quality CLI tool

## Prerequisites

- **Node.js 18+** installed
- **OpenAI API key** with access to `gpt-4o`
- A code file to review (you'll create a sample one)
- Completed Module 01 and 02 projects or equivalent experience

## Project Setup

```bash
mkdir ai-code-reviewer && cd ai-code-reviewer
npm init -y
npm install openai
```

Create your `.env` file:

```bash
OPENAI_API_KEY=sk-your-key-here
```

Create the project files:

```bash
touch reviewer.js sample-code.js
```

Create a sample file to review. Put some intentionally imperfect code in `sample-code.js`:

```javascript
// sample-code.js -- A deliberately flawed file for the reviewer to analyze
const express = require("express");
const app = express();

app.get("/users", async (req, res) => {
  const query = "SELECT * FROM users WHERE name = '" + req.query.name + "'";
  const result = await db.query(query);
  res.json(result);
});

app.post("/login", async (req, res) => {
  const password = req.body.password;
  if (password == "admin123") {
    const token = Math.random().toString();
    res.json({ token: token, password: password });
  }
  res.status(401).json({ error: "unauthorized" });
});

app.get("/file", (req, res) => {
  const path = req.query.path;
  const content = require("fs").readFileSync(path, "utf-8");
  res.send(content);
});

app.listen(3000);
```

## Step-by-Step Instructions

### Step 1: Set Up the CLI and Read the File

```javascript
// reviewer.js
import OpenAI from 'openai';
import { readFileSync } from 'fs';

// Load env
const envFile = readFileSync('.env', 'utf-8');
for (const line of envFile.split('\n')) {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
}

const openai = new OpenAI();

// Parse command-line arguments
const filePath = process.argv[2];
const outputFormat = process.argv.includes('--json') ? 'json' : 'stream';

if (!filePath) {
  console.error('Usage: node reviewer.js <file-path> [--json]');
  console.error('  --json   Output structured findings as JSON (uses function calling)');
  console.error('  default  Stream the review to the terminal in real-time');
  process.exit(1);
}

// TODO: Read the file contents using readFileSync
// Handle the case where the file doesn't exist (try/catch)
let sourceCode;
try {
  sourceCode = // YOUR CODE HERE
} catch (e) {
  console.error(`Could not read file: ${filePath}`);
  process.exit(1);
}

// Add line numbers to the source code for reference
const numberedCode = sourceCode
  .split('\n')
  .map((line, i) => `${String(i + 1).padStart(4)}  ${line}`)
  .join('\n');

console.log(`\nReviewing: ${filePath} (${sourceCode.split('\n').length} lines)\n`);
```

### Step 2: Define the System Prompt

Write a system prompt that produces high-quality code reviews:

```javascript
const SYSTEM_PROMPT = `You are a senior software engineer conducting a thorough code review. You have 10+ years of experience and care deeply about code quality, security, and maintainability.

Review the code for:
1. **Security vulnerabilities** (SQL injection, XSS, path traversal, exposed secrets, etc.)
2. **Bugs and logic errors** (race conditions, missing error handling, off-by-one, etc.)
3. **Performance issues** (N+1 queries, unnecessary allocations, blocking operations, etc.)
4. **Best practices** (naming, structure, DRY, separation of concerns, etc.)
5. **Maintainability** (readability, documentation, testability, etc.)

For each finding:
- Reference the specific line number(s)
- Explain WHY it's a problem (not just WHAT)
- Provide a concrete fix with a code snippet
- Rate severity as: critical, warning, or suggestion

Be direct and constructive. Prioritize security issues first.`;
```

### Step 3: Build the Streaming Review

This is Mode 1 -- a streaming, human-readable review printed to the terminal:

```javascript
async function streamReview(code) {
  console.log('-'.repeat(60));
  console.log('CODE REVIEW (streaming)');
  console.log('-'.repeat(60) + '\n');

  const startTime = Date.now();

  // TODO: Create a streaming chat completion using openai.chat.completions.create()
  // Set these options:
  //   - model: 'gpt-4o'
  //   - stream: true
  //   - messages: system prompt + user message with the numbered code
  //   - max_tokens: 2000
  //
  // The user message should include the numbered code like:
  //   "Review the following code:\n\n```\n{numberedCode}\n```"

  const stream = await openai.chat.completions.create({
    // YOUR CODE HERE
  });

  let fullResponse = '';
  let tokenEstimate = 0;

  // TODO: Iterate over the stream using a for-await-of loop
  // For each chunk:
  //   1. Extract the content delta: chunk.choices[0]?.delta?.content
  //   2. If there's content, write it to stdout with process.stdout.write()
  //   3. Append to fullResponse for final stats
  //   4. Increment tokenEstimate (rough: count words in the delta)

  for await (const chunk of stream) {
    // YOUR CODE HERE
  }

  const elapsed = Date.now() - startTime;

  // Print final stats
  console.log('\n\n' + '-'.repeat(60));
  console.log(`Time: ${elapsed}ms | ~${fullResponse.split(/\s+/).length} words`);
  console.log('-'.repeat(60));
}
```

### Step 4: Define the Function Schema for Structured Output

This is Mode 2 -- using function calling to get structured findings:

```javascript
// Define the tool (function) schema that the model will call
const REVIEW_TOOL = {
  type: 'function',
  function: {
    name: 'submit_code_review',
    description: 'Submit structured code review findings',
    parameters: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'A 2-3 sentence overall assessment of the code quality',
        },
        findings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              // TODO: Define the schema for each finding
              // Each finding should have:
              //   - severity: enum of ["critical", "warning", "suggestion"]
              //   - category: enum of ["security", "bug", "performance", "best-practice", "maintainability"]
              //   - lineNumbers: array of integers (which lines are affected)
              //   - title: short title for the finding (string)
              //   - description: detailed explanation of the issue (string)
              //   - suggestion: the recommended fix with code snippet (string)

              // YOUR CODE HERE: Define all 6 properties with types and descriptions
            },
            required: ['severity', 'category', 'lineNumbers', 'title', 'description', 'suggestion'],
          },
        },
        overallRating: {
          type: 'string',
          enum: ['pass', 'pass-with-warnings', 'needs-changes', 'reject'],
          description: 'Overall review verdict',
        },
      },
      required: ['summary', 'findings', 'overallRating'],
    },
  },
};
```

### Step 5: Build the Structured Review

```javascript
async function structuredReview(code) {
  console.log('Running structured review (function calling)...\n');

  const startTime = Date.now();

  // TODO: Make a chat completion with tool_choice set to force function calling
  // Set these options:
  //   - model: 'gpt-4o'
  //   - messages: same system prompt + user message
  //   - tools: [REVIEW_TOOL]
  //   - tool_choice: { type: 'function', function: { name: 'submit_code_review' } }
  //   - max_tokens: 3000

  const response = await openai.chat.completions.create({
    // YOUR CODE HERE
  });

  const elapsed = Date.now() - startTime;

  // TODO: Extract the function call arguments from the response
  // Path: response.choices[0].message.tool_calls[0].function.arguments
  // This is a JSON string -- parse it!

  const toolCall = response.choices[0].message.tool_calls[0];
  const review = // YOUR CODE HERE: parse the arguments JSON

  // TODO: Extract token usage from response.usage
  const usage = response.usage;

  return { review, usage, elapsed };
}
```

### Step 6: Display Structured Results

```javascript
function displayStructuredReview(result) {
  const { review, usage, elapsed } = result;

  console.log('='.repeat(60));
  console.log('CODE REVIEW RESULTS');
  console.log('='.repeat(60));

  // Overall rating with color coding (using ANSI escape codes)
  const ratingColors = {
    'pass': '\x1b[32m',           // green
    'pass-with-warnings': '\x1b[33m', // yellow
    'needs-changes': '\x1b[33m',      // yellow
    'reject': '\x1b[31m',            // red
  };
  const reset = '\x1b[0m';
  const color = ratingColors[review.overallRating] || '';
  console.log(`\nVerdict: ${color}${review.overallRating.toUpperCase()}${reset}`);
  console.log(`\n${review.summary}\n`);

  // TODO: Sort findings by severity (critical first, then warning, then suggestion)
  const severityOrder = { critical: 0, warning: 1, suggestion: 2 };
  const sorted = // YOUR CODE HERE

  // TODO: Print each finding in a readable format:
  //   [CRITICAL] Security: SQL Injection (lines 7-8)
  //     Description...
  //     Suggestion...
  //
  // Use ANSI colors: red for critical, yellow for warning, cyan for suggestion
  // YOUR CODE HERE

  // Print stats
  console.log('\n' + '='.repeat(60));
  console.log('STATS');
  console.log('='.repeat(60));
  console.log(`Findings: ${review.findings.length} (${countBySeverity(review.findings)})`);
  console.log(`Time: ${elapsed}ms`);
  console.log(`Tokens: ${usage.prompt_tokens} in / ${usage.completion_tokens} out / ${usage.total_tokens} total`);

  // TODO: Calculate and display the cost
  // GPT-4o pricing: $2.50/1M input, $10.00/1M output
  const cost = // YOUR CODE HERE
  console.log(`Cost: $${cost.toFixed(6)}`);
  console.log('='.repeat(60));
}

function countBySeverity(findings) {
  const counts = { critical: 0, warning: 0, suggestion: 0 };
  for (const f of findings) counts[f.severity]++;
  return `${counts.critical} critical, ${counts.warning} warnings, ${counts.suggestion} suggestions`;
}
```

### Step 7: Wire It All Together

```javascript
async function main() {
  if (outputFormat === 'json') {
    // Structured mode: function calling + JSON output
    const result = await structuredReview(numberedCode);
    displayStructuredReview(result);

    // Also write raw JSON to a file for CI/pipeline use
    const outputPath = filePath.replace(/\.\w+$/, '.review.json');
    const { writeFileSync } = await import('fs');
    writeFileSync(outputPath, JSON.stringify(result.review, null, 2));
    console.log(`\nJSON written to: ${outputPath}`);
  } else {
    // Stream mode: real-time review in terminal
    await streamReview(numberedCode);
  }
}

main().catch(console.error);
```

### Step 8: Run Your Reviewer

```bash
# Stream a review to your terminal (watch it type in real-time)
node reviewer.js sample-code.js

# Get structured JSON findings via function calling
node reviewer.js sample-code.js --json

# Review a Python file (it works on any language)
node reviewer.js some-python-file.py

# Review your own code from another project
node reviewer.js ../my-project/src/app.js --json
```

### Step 9: Test with Different Files

Create a second sample file that's cleaner to see if the reviewer adjusts its severity:

```javascript
// clean-sample.js -- Better code to see if the reviewer gives appropriate feedback
import express from 'express';
import { pool } from './db.js';

const app = express();
app.use(express.json());

app.get('/users', async (req, res) => {
  try {
    const { name } = req.query;
    const result = await pool.query(
      'SELECT id, name, email FROM users WHERE name = $1',
      [name]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(process.env.PORT || 3000);
```

```bash
# Review the clean file -- does the severity change?
node reviewer.js clean-sample.js --json
```

Compare the findings between `sample-code.js` (should be "reject" or "needs-changes") and `clean-sample.js` (should be "pass" or "pass-with-warnings"). The reviewer should find critical security issues in the first file and only minor suggestions in the second.

## Expected Output

For `node reviewer.js sample-code.js --json`:

```
Reviewing: sample-code.js (18 lines)

Running structured review (function calling)...

============================================================
CODE REVIEW RESULTS
============================================================

Verdict: REJECT

This code has multiple critical security vulnerabilities including SQL injection,
path traversal, and exposed credentials. It should not be deployed in its current
state. Immediate remediation is required.

  [CRITICAL] Security: SQL Injection (lines 6-7)
    User input is directly concatenated into a SQL query string, allowing
    attackers to execute arbitrary SQL commands.
    Fix: Use parameterized queries...

  [CRITICAL] Security: Path Traversal (lines 19-21)
    User-controlled input is passed directly to readFileSync, allowing
    attackers to read any file on the server...

  [CRITICAL] Security: Hardcoded Credentials (lines 13-14)
    Password comparison uses a hardcoded string and loose equality...

  [WARNING] Bug: Missing Return Statement (line 16)
    After sending the success response, execution continues to line 17
    which sends a 401 response...

============================================================
STATS
============================================================
Findings: 6 (3 critical, 2 warnings, 1 suggestions)
Time: 3421ms
Tokens: 892 in / 1847 out / 2739 total
Cost: $0.020700
============================================================

JSON written to: sample-code.review.json
```

## Stretch Goals

1. **Add a `--fix` flag** that generates a corrected version of the file. After the structured review, make a second API call that takes the original code + findings and produces a fixed version. Write it to `<filename>.fixed.js`.

2. **Support a `--diff` output** that shows the review findings inline with the original code, similar to how `git diff` works. Use ANSI colors to highlight problem lines in red with the finding description below.

3. **Add cost tracking across reviews** -- write each review's cost to a `.reviewer-usage.json` file. When you run the tool, show a running total: "Session cost: $0.04 | Total lifetime cost: $1.23". This makes cost management tangible.

## Submission Checklist

Your project is done when:

- [ ] `node reviewer.js <file>` streams a real-time code review to the terminal
- [ ] `node reviewer.js <file> --json` uses function calling to output structured findings
- [ ] Each finding includes severity, category, line numbers, title, description, and suggestion
- [ ] Findings are sorted by severity (critical first)
- [ ] Token usage and cost are displayed after each review
- [ ] Structured JSON output is written to a `.review.json` file
- [ ] The tool handles missing files gracefully (error message, not crash)
- [ ] The tool produces meaningfully different results for flawed vs. clean code
- [ ] You've reviewed at least 3 different files with the tool

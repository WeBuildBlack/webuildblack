---
title: "Module Project: Prompt Lab"
estimatedMinutes: 75
---

# Prompt Lab

Build a prompt evaluation harness that tests multiple prompt variations against a test suite and scores them for accuracy.

## Overview

You learned that prompting is engineering, not guessing. Message roles shape behavior, few-shot examples teach by demonstration, chain-of-thought unlocks reasoning, and structured output gives you parseable JSON. Now you're going to prove it with data. You'll build a harness that takes a real task -- classifying customer support tickets -- writes 4 different prompt strategies, runs them against 15 labeled test cases, and generates an accuracy report that shows which approach actually works best.

## What You'll Practice

- Designing system prompts with clear roles and constraints (from Lesson 1: Message Roles)
- Writing few-shot examples that guide model behavior (from Lesson 2: Few-Shot Prompting)
- Implementing chain-of-thought prompting for better reasoning (from Lesson 3: Chain of Thought)
- Extracting structured JSON output from LLM responses (from Lesson 4: Structured Output)
- Evaluating prompt quality with measurable metrics, not vibes
- Comparing prompt strategies head-to-head on the same test data

## Prerequisites

- **Node.js 18+** installed
- **OpenAI API key** (we'll use `gpt-4o-mini` to keep costs under $0.05 for the full run)
- Completed Module 01 project or familiarity with making OpenAI API calls

## Project Setup

```bash
mkdir prompt-lab && cd prompt-lab
npm init -y
npm install openai
```

Create your `.env` file:

```bash
OPENAI_API_KEY=sk-your-key-here
```

Create the project files:

```bash
touch evaluator.js test-cases.json prompts.js
```

## Step-by-Step Instructions

### Step 1: Define Your Test Cases

The task: classify customer support tickets into a category and urgency level. Create `test-cases.json` with labeled examples:

```json
[
  {
    "id": 1,
    "ticket": "I've been charged twice for my subscription this month. I need a refund ASAP.",
    "expectedCategory": "billing",
    "expectedUrgency": "high"
  },
  {
    "id": 2,
    "ticket": "How do I export my data to CSV? I looked in settings but couldn't find it.",
    "expectedCategory": "how-to",
    "expectedUrgency": "low"
  },
  {
    "id": 3,
    "ticket": "The app crashes every time I try to upload a file larger than 10MB.",
    "expectedCategory": "bug",
    "expectedUrgency": "high"
  },
  {
    "id": 4,
    "ticket": "Can you add dark mode? It would really help with eye strain.",
    "expectedCategory": "feature-request",
    "expectedUrgency": "low"
  },
  {
    "id": 5,
    "ticket": "My account was locked after too many login attempts. I need to get in urgently for a client presentation in 30 minutes.",
    "expectedCategory": "account",
    "expectedUrgency": "high"
  }
]
```

**TODO: Add 10 more test cases** covering these categories: `billing`, `bug`, `how-to`, `feature-request`, `account`. Mix in edge cases -- tickets that could belong to multiple categories, ambiguous urgency, emotional language, very short messages, and very long ones. Aim for 15 total.

### Step 2: Write Four Prompt Strategies

Create `prompts.js` with four different approaches to the same classification task:

```javascript
// Strategy 1: Zero-Shot -- Just tell it what to do, no examples
export const zeroShot = {
  name: 'Zero-Shot',
  buildMessages(ticket) {
    return [
      {
        role: 'system',
        content: `You are a support ticket classifier. Classify the ticket into exactly one category (billing, bug, how-to, feature-request, account) and one urgency level (low, medium, high). Respond with ONLY valid JSON: {"category": "...", "urgency": "..."}`
      },
      {
        role: 'user',
        content: ticket
      }
    ];
  }
};

// Strategy 2: Few-Shot -- Teach by example
export const fewShot = {
  name: 'Few-Shot',
  buildMessages(ticket) {
    return [
      {
        role: 'system',
        content: 'You are a support ticket classifier. Respond with ONLY valid JSON: {"category": "...", "urgency": "..."}'
      },
      // TODO: Add 3 example user/assistant pairs that demonstrate correct classification
      // Each example should be a different category to give the model coverage
      //
      // Example format:
      // { role: 'user', content: 'I was charged $50 but my plan is only $20/month.' },
      // { role: 'assistant', content: '{"category": "billing", "urgency": "high"}' },
      //
      // YOUR CODE HERE: Add 3 example pairs (6 messages total)

      {
        role: 'user',
        content: ticket
      }
    ];
  }
};

// Strategy 3: Chain-of-Thought -- Make the model reason before answering
export const chainOfThought = {
  name: 'Chain-of-Thought',
  buildMessages(ticket) {
    // TODO: Design a system prompt that instructs the model to:
    //   1. First, identify what the customer's core issue is
    //   2. Then, determine which category it fits
    //   3. Then, assess urgency based on impact and time sensitivity
    //   4. Finally, output the JSON classification
    //
    // The system prompt should tell the model to think step-by-step
    // but still end with the JSON output on its own line.
    //
    // Hint: Tell the model to put its reasoning first, then output
    // a line starting with "RESULT:" followed by the JSON.

    return [
      {
        role: 'system',
        content: '' // YOUR CODE HERE
      },
      {
        role: 'user',
        content: ticket
      }
    ];
  }
};

// Strategy 4: Structured with role + constraints
export const structuredRole = {
  name: 'Structured Role',
  buildMessages(ticket) {
    // TODO: Design a detailed system prompt that:
    //   - Gives the model a specific persona (senior support manager, 10 years experience)
    //   - Defines each category with clear criteria
    //   - Defines urgency levels with specific rules:
    //       high = financial impact, data loss, or time-sensitive (< 24 hours)
    //       medium = functionality blocked but has workaround
    //       low = questions, suggestions, no immediate impact
    //   - Specifies the exact JSON output format
    //
    // This tests whether detailed role + criteria outperforms simpler prompts.

    return [
      {
        role: 'system',
        content: '' // YOUR CODE HERE
      },
      {
        role: 'user',
        content: ticket
      }
    ];
  }
};
```

### Step 3: Build the Evaluation Engine

Create `evaluator.js` -- this is the core of your harness:

```javascript
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { zeroShot, fewShot, chainOfThought, structuredRole } from './prompts.js';

// Load env
const envFile = readFileSync('.env', 'utf-8');
for (const line of envFile.split('\n')) {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
}

const openai = new OpenAI();
const testCases = JSON.parse(readFileSync('test-cases.json', 'utf-8'));

// All prompt strategies to evaluate
const strategies = [zeroShot, fewShot, chainOfThought, structuredRole];

async function classifyTicket(strategy, ticket) {
  const messages = strategy.buildMessages(ticket);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0, // Deterministic for fair evaluation
    max_tokens: 300,
  });

  const raw = response.choices[0].message.content;
  const tokens = response.usage.total_tokens;

  // TODO: Parse the JSON from the response
  // For chain-of-thought, the JSON might be after "RESULT:" -- handle that
  // For other strategies, the whole response should be JSON
  //
  // Hint: Try to find JSON in the response using a regex or
  // by looking for the last line that starts with "{"
  //
  // Return null if parsing fails -- don't crash the whole evaluation

  let parsed = null;
  try {
    // YOUR CODE HERE: Extract and parse the JSON from `raw`
    // Consider that CoT responses have reasoning text before the JSON
  } catch (e) {
    // Parse failed -- will count as incorrect
  }

  return { raw, parsed, tokens };
}
```

### Step 4: Build the Scoring Function

Add the scoring logic that compares model output to expected labels:

```javascript
function scoreResult(parsed, testCase) {
  if (!parsed) {
    return { categoryCorrect: false, urgencyCorrect: false, bothCorrect: false };
  }

  // TODO: Compare parsed.category to testCase.expectedCategory
  // TODO: Compare parsed.urgency to testCase.expectedUrgency
  // Normalize both to lowercase and trim whitespace before comparing

  const categoryCorrect = // YOUR CODE HERE
  const urgencyCorrect = // YOUR CODE HERE
  const bothCorrect = categoryCorrect && urgencyCorrect;

  return { categoryCorrect, urgencyCorrect, bothCorrect };
}
```

### Step 5: Run the Full Evaluation

Add the main evaluation loop:

```javascript
async function evaluate() {
  const results = {};

  for (const strategy of strategies) {
    console.log(`\nEvaluating: ${strategy.name}...`);
    results[strategy.name] = {
      scores: [],
      totalTokens: 0,
      failures: [],
    };

    for (const testCase of testCases) {
      // TODO: Call classifyTicket() for this strategy and test case
      // TODO: Score the result using scoreResult()
      // TODO: Push the score to results[strategy.name].scores
      // TODO: Track total tokens used
      // TODO: If parsed is null, push to failures array with the test case id
      //
      // Add a small delay between calls to respect rate limits:
      //   await new Promise(r => setTimeout(r, 200));

      // YOUR CODE HERE
    }
  }

  return results;
}
```

### Step 6: Generate the Report

Build a report function that shows how each strategy performed:

```javascript
function generateReport(results) {
  console.log('\n' + '='.repeat(70));
  console.log('PROMPT LAB EVALUATION REPORT');
  console.log('='.repeat(70));
  console.log(`Test cases: ${testCases.length}`);
  console.log(`Model: gpt-4o-mini (temperature: 0)\n`);

  // Header
  console.log(
    'Strategy'.padEnd(22) +
    'Category'.padEnd(12) +
    'Urgency'.padEnd(12) +
    'Both'.padEnd(12) +
    'Tokens'.padEnd(10) +
    'Parse Fails'
  );
  console.log('-'.repeat(70));

  // TODO: For each strategy, calculate and print:
  //   - Category accuracy: (# correct / total) as a percentage
  //   - Urgency accuracy: (# correct / total) as a percentage
  //   - Both correct: (# where both matched / total) as a percentage
  //   - Total tokens used
  //   - Number of parse failures
  //
  // YOUR CODE HERE: Loop through results and print each row

  // TODO: Print the winner (strategy with highest "both correct" %)
  console.log('\n' + '='.repeat(70));
  // YOUR CODE HERE

  // TODO: Print estimated total cost for the full evaluation run
  // Use gpt-4o-mini pricing: $0.15/1M input, $0.60/1M output
  // For simplicity, use total_tokens * $0.30/1M as an average
  // YOUR CODE HERE
}

// Run everything
async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  if (isDryRun) {
    console.log('[DRY RUN] Would evaluate these strategies:');
    strategies.forEach(s => console.log(`  - ${s.name}`));
    console.log(`Against ${testCases.length} test cases`);
    console.log(`Estimated API calls: ${strategies.length * testCases.length}`);
    return;
  }

  const results = await evaluate();
  generateReport(results);
}

main().catch(console.error);
```

### Step 7: Run and Analyze

```bash
# Dry run first to see what will happen
node evaluator.js --dry-run

# Run the full evaluation
node evaluator.js
```

Study the results. Ask yourself:
- Did few-shot beat zero-shot? By how much?
- Did chain-of-thought improve accuracy, or just use more tokens?
- Did the structured role prompt handle edge cases better?
- Which strategy had the most parse failures?

### Step 8: Iterate on Your Prompts

Based on your results, improve the losing strategies:

```javascript
// Look at which specific test cases each strategy got wrong
function generateDetailedReport(results) {
  for (const [name, data] of Object.entries(results)) {
    const wrong = data.scores
      .map((score, i) => ({ ...score, testCase: testCases[i] }))
      .filter(s => !s.bothCorrect);

    if (wrong.length > 0) {
      console.log(`\n${name} - Incorrect classifications:`);
      for (const w of wrong) {
        console.log(`  Ticket #${w.testCase.id}: "${w.testCase.ticket.slice(0, 60)}..."`);
        console.log(`    Expected: ${w.testCase.expectedCategory}/${w.testCase.expectedUrgency}`);
        console.log(`    Got:      ${w.parsed?.category || 'PARSE FAIL'}/${w.parsed?.urgency || 'PARSE FAIL'}`);
      }
    }
  }
}
```

Run the evaluation again after making changes. Can you get any strategy above 90% accuracy on both fields?

## Expected Output

```
Evaluating: Zero-Shot...
Evaluating: Few-Shot...
Evaluating: Chain-of-Thought...
Evaluating: Structured Role...

======================================================================
PROMPT LAB EVALUATION REPORT
======================================================================
Test cases: 15
Model: gpt-4o-mini (temperature: 0)

Strategy              Category    Urgency     Both        Tokens    Parse Fails
----------------------------------------------------------------------
Zero-Shot             80.0%       66.7%       60.0%       1,245     0
Few-Shot              86.7%       80.0%       73.3%       2,890     0
Chain-of-Thought      93.3%       86.7%       86.7%       4,120     1
Structured Role       93.3%       93.3%       93.3%       2,340     0

======================================================================
Winner: Structured Role (93.3% accuracy on both fields)
Total tokens used: 10,595
Estimated total cost: $0.003
======================================================================
```

## Stretch Goals

1. **Add a fifth strategy** that combines the best elements of your top performers. For example, a structured role prompt with few-shot examples AND chain-of-thought reasoning. Does combining techniques always help, or does it hit diminishing returns?

2. **Test across models** -- run the same evaluation against `gpt-4o` and compare. Does a better model make prompt strategy matter less? At what accuracy threshold does the cheaper model become "good enough"?

3. **Build a confusion matrix** that shows which categories get mixed up most often. For example, maybe "account" tickets keep getting classified as "billing." Use this to write targeted few-shot examples that fix the specific confusion.

## Submission Checklist

Your project is done when:

- [ ] `test-cases.json` contains at least 15 labeled test cases across all 5 categories
- [ ] `prompts.js` exports 4 distinct prompt strategies (zero-shot, few-shot, CoT, structured)
- [ ] `evaluator.js` runs all strategies against all test cases and produces a report
- [ ] The report shows per-strategy accuracy for category, urgency, and both combined
- [ ] Chain-of-thought responses are parsed correctly (JSON extracted from reasoning text)
- [ ] The `--dry-run` flag works and shows what would happen without making API calls
- [ ] You can articulate *why* your best-performing strategy outperformed the others
- [ ] Total evaluation cost is under $0.10 (using gpt-4o-mini)

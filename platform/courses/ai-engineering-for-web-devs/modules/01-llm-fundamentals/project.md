---
title: "Module Project: Model Showdown"
estimatedMinutes: 75
---

# Model Showdown

Build a CLI tool that sends the same prompt to multiple LLM APIs and displays a side-by-side comparison of outputs, token counts, latency, and estimated cost.

## Overview

You just learned that LLMs are "text in, text out" functions, that different models have different strengths, and that tokens are the currency you pay in. Now you're going to *feel* those differences firsthand. You'll build a command-line tool that fires the same prompt at both OpenAI and Anthropic, then prints a clean comparison table showing how the models differ in speed, verbosity, cost, and output quality. This is the tool you'll wish you had for every project going forward.

## What You'll Practice

- Setting up API keys and initializing SDK clients (from Lesson 1: What Are LLMs)
- Making real API calls to both OpenAI and Anthropic endpoints
- Reading token usage from API responses (from Lesson 3: Tokens, Context Windows, and Pricing)
- Calculating estimated cost using per-token pricing (from Lesson 3)
- Measuring latency for each API call
- Comparing model outputs side by side (from Lesson 4: The Model Landscape)
- Working with environment variables for secrets

## Prerequisites

- **Node.js 18+** installed (`node --version` to check)
- **OpenAI API key** -- sign up at [platform.openai.com](https://platform.openai.com) (free tier gives you some credits)
- **Anthropic API key** -- sign up at [console.anthropic.com](https://console.anthropic.com) (free tier available)
- A terminal and text editor you're comfortable with

## Project Setup

Open your terminal and set up the project:

```bash
mkdir model-showdown && cd model-showdown
npm init -y
npm install openai @anthropic-ai/sdk
```

Create a `.env` file (never commit this):

```bash
OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
```

**If you only have one API key** (e.g., only OpenAI), you can still complete this project by comparing different models from the same provider -- for example, `gpt-4o` vs `gpt-4o-mini`. The comparison is just as valuable.

Create the main file:

```bash
touch showdown.js
```

## Step-by-Step Instructions

### Step 1: Load Environment Variables and Initialize Clients

Create `showdown.js` and set up both API clients:

```javascript
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';

// Load .env file manually (no extra dependency needed)
const envFile = readFileSync('.env', 'utf-8');
for (const line of envFile.split('\n')) {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
}

// Initialize clients
const openai = new OpenAI(); // reads OPENAI_API_KEY from env
const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from env

// Model pricing per 1M tokens (input / output)
const PRICING = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o':      { input: 2.50, output: 10.00 },
  'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
  'claude-sonnet-4-20250514':  { input: 3.00, output: 15.00 },
};
```

### Step 2: Build the OpenAI Call Function

Write a function that calls OpenAI and captures everything you need to compare:

```javascript
async function callOpenAI(model, prompt) {
  const startTime = Date.now();

  // TODO: Make the API call using openai.chat.completions.create()
  // Use the model parameter, set temperature to 0 for consistency,
  // and set max_tokens to 1024
  const response = // YOUR CODE HERE

  const latencyMs = Date.now() - startTime;

  // TODO: Extract the response text from response.choices[0].message.content
  const text = // YOUR CODE HERE

  // TODO: Extract token usage from response.usage
  // Fields: prompt_tokens, completion_tokens, total_tokens
  const inputTokens = // YOUR CODE HERE
  const outputTokens = // YOUR CODE HERE

  // TODO: Calculate cost using the PRICING object
  // Formula: (tokens / 1_000_000) * rate
  const cost = // YOUR CODE HERE

  return {
    provider: 'OpenAI',
    model,
    text,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    latencyMs,
    cost,
  };
}
```

### Step 3: Build the Anthropic Call Function

Now write the equivalent for Anthropic. The API shape is different -- pay attention:

```javascript
async function callAnthropic(model, prompt) {
  const startTime = Date.now();

  // TODO: Make the API call using anthropic.messages.create()
  // Anthropic uses a different format:
  //   - model: the model string
  //   - max_tokens: 1024
  //   - messages: [{ role: 'user', content: prompt }]
  const response = // YOUR CODE HERE

  const latencyMs = Date.now() - startTime;

  // TODO: Extract the response text
  // Anthropic returns: response.content[0].text (not response.choices!)
  const text = // YOUR CODE HERE

  // TODO: Extract token usage from response.usage
  // Anthropic fields: input_tokens, output_tokens
  const inputTokens = // YOUR CODE HERE
  const outputTokens = // YOUR CODE HERE

  // TODO: Calculate cost using the PRICING object
  const cost = // YOUR CODE HERE

  return {
    provider: 'Anthropic',
    model,
    text,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    latencyMs,
    cost,
  };
}
```

### Step 4: Build the Comparison Display

Create a function that takes an array of results and prints a formatted comparison:

```javascript
function displayComparison(results, prompt) {
  console.log('\n' + '='.repeat(80));
  console.log('MODEL SHOWDOWN');
  console.log('='.repeat(80));
  console.log(`\nPrompt: "${prompt}"\n`);

  // TODO: Print a comparison table with these columns:
  //   - Provider/Model
  //   - Latency (ms)
  //   - Input Tokens
  //   - Output Tokens
  //   - Total Tokens
  //   - Est. Cost
  //
  // Use console.log with padEnd() for clean columns, e.g.:
  // console.log(
  //   'Model'.padEnd(30) +
  //   'Latency'.padEnd(12) +
  //   'In Tokens'.padEnd(12) +
  //   ...
  // );

  // YOUR CODE HERE: Print the header row
  // YOUR CODE HERE: Print a separator line
  // YOUR CODE HERE: Loop through results and print each row

  // Print the actual responses
  console.log('\n' + '-'.repeat(80));
  console.log('RESPONSES');
  console.log('-'.repeat(80));

  for (const result of results) {
    console.log(`\n>>> ${result.provider} (${result.model}):\n`);
    console.log(result.text);
    console.log();
  }
}
```

### Step 5: Wire It All Together

Build the main function that runs the showdown:

```javascript
async function main() {
  // Get the prompt from command line args, or use a default
  const prompt = process.argv[2] || 'Explain what a REST API is in 3 sentences. Be concise.';

  console.log('Starting Model Showdown...\n');

  // TODO: Run all four API calls in parallel using Promise.allSettled()
  // This way one failure doesn't kill the whole comparison.
  //
  // Call these four models:
  //   1. callOpenAI('gpt-4o-mini', prompt)
  //   2. callOpenAI('gpt-4o', prompt)
  //   3. callAnthropic('claude-3-5-haiku-20241022', prompt)
  //   4. callAnthropic('claude-sonnet-4-20250514', prompt)

  const settled = await Promise.allSettled([
    // YOUR CODE HERE: Add the four calls
  ]);

  // TODO: Filter for fulfilled results and extract values
  // For rejected results, log the error (model name + error message)
  const results = [];
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      console.error(`One model failed: ${result.reason.message}`);
    }
  }

  if (results.length === 0) {
    console.error('All models failed. Check your API keys.');
    process.exit(1);
  }

  displayComparison(results, prompt);

  // TODO: Print a summary showing:
  //   - Which model was fastest (lowest latencyMs)
  //   - Which model was cheapest (lowest cost)
  //   - Which model was most verbose (highest outputTokens)
  // YOUR CODE HERE
}

main().catch(console.error);
```

### Step 6: Run Your Showdown

```bash
# Run with the default prompt
node showdown.js

# Run with a custom prompt
node showdown.js "Write a JavaScript function that reverses a string. Include comments."

# Try a reasoning-heavy prompt
node showdown.js "What are 3 pros and 3 cons of microservices architecture?"

# Try a creative prompt
node showdown.js "Write a haiku about debugging code at 2am."
```

### Step 7: Add a Summary Report

After displaying the comparison, add a summary that highlights the winners in each category:

```javascript
function printSummary(results) {
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  // TODO: Find and print the fastest model (lowest latencyMs)
  const fastest = results.reduce((a, b) => a.latencyMs < b.latencyMs ? a : b);
  console.log(`Fastest:      ${fastest.model} (${fastest.latencyMs}ms)`);

  // TODO: Find and print the cheapest model (lowest cost)
  // YOUR CODE HERE

  // TODO: Find and print the most concise model (fewest output tokens)
  // YOUR CODE HERE

  // TODO: Calculate and print total cost of this showdown
  // YOUR CODE HERE

  console.log('='.repeat(80) + '\n');
}
```

## Expected Output

When you run `node showdown.js`, you should see something like:

```
Starting Model Showdown...

================================================================================
MODEL SHOWDOWN
================================================================================

Prompt: "Explain what a REST API is in 3 sentences. Be concise."

Model                         Latency     In Tkns    Out Tkns   Total Tkns Est. Cost
----------------------------------------------------------------------------------------------
OpenAI (gpt-4o-mini)          423ms       18         67         85         $0.000043
OpenAI (gpt-4o)               891ms       18         54         72         $0.000585
Anthropic (claude-3-5-haiku)  312ms       17         71         88         $0.000298
Anthropic (claude-sonnet)     1203ms      17         48         65         $0.000771

... [response text for each model] ...

================================================================================
SUMMARY
================================================================================
Fastest:      claude-3-5-haiku (312ms)
Cheapest:     gpt-4o-mini ($0.000043)
Most concise: claude-sonnet (48 output tokens)
Total cost:   $0.001697
================================================================================
```

## Stretch Goals

1. **Add a `--models` flag** that lets you pick which models to compare:
   ```bash
   node showdown.js --models gpt-4o,claude-sonnet "Your prompt here"
   ```

2. **Save results to JSON** -- add a `--output results.json` flag that writes the full comparison data (including timestamps) to a file. This is useful for tracking model performance over time.

3. **Add a "consistency check"** -- run the same prompt 3 times per model and report how much the outputs vary. Use this to explore how temperature affects consistency (try temperature 0 vs 0.7 vs 1.0).

## Submission Checklist

Your project is done when:

- [ ] Running `node showdown.js` makes real API calls to both OpenAI and Anthropic
- [ ] The tool displays a formatted comparison table with latency, token counts, and cost
- [ ] All four models (gpt-4o-mini, gpt-4o, claude-3-5-haiku, claude-sonnet) are compared
- [ ] Cost calculations use accurate per-token pricing from the PRICING object
- [ ] The tool accepts a custom prompt via command-line argument
- [ ] Failed API calls are handled gracefully (error message, not a crash)
- [ ] The summary section identifies the fastest, cheapest, and most concise model
- [ ] Your `.env` file contains valid API keys and is NOT committed to git

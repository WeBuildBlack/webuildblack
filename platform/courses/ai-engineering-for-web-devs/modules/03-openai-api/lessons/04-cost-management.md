---
title: "Cost Management"
estimatedMinutes: 60
---

# Cost Management

Here is a reality check: AI APIs can get expensive fast. A single `gpt-4o` call costs pennies, but multiply that by thousands of users and you are looking at a real bill. The difference between an AI feature that is profitable and one that bleeds money comes down to how well you manage costs.

In this lesson, you will learn how tokens translate to dollars, how to estimate and track costs, caching strategies that slash your bill, and how to choose the right model for each task.

---

## Understanding Tokens

Tokens are the currency of LLM APIs. Every API call is priced by the number of tokens consumed, split into **input tokens** (your prompt) and **output tokens** (the model's response).

### What Is a Token?

A token is roughly 3-4 characters of English text, or about 0.75 words. Here are some rules of thumb:

| Text                                  | Approximate Tokens |
| ------------------------------------- | ------------------ |
| "Hello"                               | 1                  |
| "Hello, how are you?"                 | 6                  |
| A typical paragraph (100 words)       | ~130               |
| A full page of text (500 words)       | ~670               |
| A medium blog post (2000 words)       | ~2,700             |
| A 500-line JavaScript file            | ~3,500             |

### Counting Tokens Precisely

For exact token counts, use the `tiktoken` library (OpenAI's official tokenizer).

#### Python

```bash
pip install tiktoken
```

```python
import tiktoken

def count_tokens(text: str, model: str = "gpt-4o") -> int:
    """Count the number of tokens in a text string."""
    encoding = tiktoken.encoding_for_model(model)
    return len(encoding.encode(text))

# Examples
print(count_tokens("Hello, world!"))       # 4
print(count_tokens("What is a closure in JavaScript?"))  # 8

# Count tokens in a full prompt
system_prompt = "You are a helpful coding tutor who explains concepts clearly."
user_message = "Explain the difference between var, let, and const in JavaScript."

total_input = count_tokens(system_prompt) + count_tokens(user_message)
print(f"Input tokens: {total_input}")  # ~25
```

#### JavaScript

```bash
npm install tiktoken
```

```javascript
import { encoding_for_model } from "tiktoken";

function countTokens(text, model = "gpt-4o") {
  const enc = encoding_for_model(model);
  const tokens = enc.encode(text);
  enc.free(); // Important: free the encoder to avoid memory leaks
  return tokens.length;
}

console.log(countTokens("Hello, world!")); // 4
console.log(countTokens("Explain closures in JavaScript.")); // 6
```

### Estimating Costs Before Making Calls

Build a cost estimator that checks before you spend:

```javascript
import { encoding_for_model } from "tiktoken";

const PRICING = {
  "gpt-4o": { input: 2.5 / 1_000_000, output: 10.0 / 1_000_000 },
  "gpt-4o-mini": { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
  "o1": { input: 15.0 / 1_000_000, output: 60.0 / 1_000_000 },
  "o3-mini": { input: 1.1 / 1_000_000, output: 4.4 / 1_000_000 },
};

function estimateCost(messages, model = "gpt-4o", estimatedOutputTokens = 500) {
  const enc = encoding_for_model(model);

  let inputTokens = 0;
  for (const msg of messages) {
    inputTokens += enc.encode(msg.content || "").length;
    inputTokens += 4; // Overhead per message (role, formatting)
  }
  enc.free();

  const pricing = PRICING[model];
  if (!pricing) throw new Error(`Unknown model: ${model}`);

  const inputCost = inputTokens * pricing.input;
  const outputCost = estimatedOutputTokens * pricing.output;
  const totalCost = inputCost + outputCost;

  return {
    inputTokens,
    estimatedOutputTokens,
    inputCost: `$${inputCost.toFixed(6)}`,
    outputCost: `$${outputCost.toFixed(6)}`,
    totalCost: `$${totalCost.toFixed(6)}`,
  };
}

// Example
const messages = [
  { role: "system", content: "You are a helpful coding tutor." },
  { role: "user", content: "Explain the event loop in Node.js in detail." },
];

console.log(estimateCost(messages, "gpt-4o", 800));
// { inputTokens: 22, estimatedOutputTokens: 800, inputCost: "$0.000055", ... }

console.log(estimateCost(messages, "gpt-4o-mini", 800));
// Much cheaper!
```

---

## Tracking Costs in Production

Every API response includes a `usage` field. Build a tracker:

### JavaScript Cost Tracker

```javascript
class CostTracker {
  constructor() {
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.callCount = 0;
    this.costByModel = {};
  }

  record(model, usage) {
    this.totalInputTokens += usage.prompt_tokens;
    this.totalOutputTokens += usage.completion_tokens;
    this.callCount++;

    if (!this.costByModel[model]) {
      this.costByModel[model] = {
        inputTokens: 0,
        outputTokens: 0,
        calls: 0,
      };
    }

    this.costByModel[model].inputTokens += usage.prompt_tokens;
    this.costByModel[model].outputTokens += usage.completion_tokens;
    this.costByModel[model].calls++;
  }

  getCost(model, inputTokens, outputTokens) {
    const pricing = PRICING[model];
    if (!pricing) return 0;
    return inputTokens * pricing.input + outputTokens * pricing.output;
  }

  getReport() {
    const report = {
      totalCalls: this.callCount,
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      models: {},
      totalCost: 0,
    };

    for (const [model, data] of Object.entries(this.costByModel)) {
      const cost = this.getCost(model, data.inputTokens, data.outputTokens);
      report.models[model] = { ...data, estimatedCost: `$${cost.toFixed(4)}` };
      report.totalCost += cost;
    }

    report.totalCost = `$${report.totalCost.toFixed(4)}`;
    return report;
  }
}

// Usage
const tracker = new CostTracker();

async function trackedCompletion(model, messages, options = {}) {
  const response = await openai.chat.completions.create({
    model,
    messages,
    ...options,
  });

  tracker.record(model, response.usage);

  return response;
}

// After many calls...
console.log(tracker.getReport());
```

### Python Cost Tracker

```python
from dataclasses import dataclass, field
from typing import Dict

PRICING = {
    "gpt-4o": {"input": 2.5 / 1_000_000, "output": 10.0 / 1_000_000},
    "gpt-4o-mini": {"input": 0.15 / 1_000_000, "output": 0.6 / 1_000_000},
    "o1": {"input": 15.0 / 1_000_000, "output": 60.0 / 1_000_000},
    "o3-mini": {"input": 1.1 / 1_000_000, "output": 4.4 / 1_000_000},
}

@dataclass
class CostTracker:
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    call_count: int = 0
    cost_by_model: Dict = field(default_factory=dict)

    def record(self, model: str, usage):
        self.total_input_tokens += usage.prompt_tokens
        self.total_output_tokens += usage.completion_tokens
        self.call_count += 1

        if model not in self.cost_by_model:
            self.cost_by_model[model] = {
                "input_tokens": 0,
                "output_tokens": 0,
                "calls": 0
            }

        self.cost_by_model[model]["input_tokens"] += usage.prompt_tokens
        self.cost_by_model[model]["output_tokens"] += usage.completion_tokens
        self.cost_by_model[model]["calls"] += 1

    def get_report(self) -> dict:
        total_cost = 0
        models = {}

        for model, data in self.cost_by_model.items():
            pricing = PRICING.get(model, {"input": 0, "output": 0})
            cost = (data["input_tokens"] * pricing["input"] +
                    data["output_tokens"] * pricing["output"])
            models[model] = {**data, "estimated_cost": f"${cost:.4f}"}
            total_cost += cost

        return {
            "total_calls": self.call_count,
            "total_input_tokens": self.total_input_tokens,
            "total_output_tokens": self.total_output_tokens,
            "models": models,
            "total_cost": f"${total_cost:.4f}"
        }

tracker = CostTracker()

def tracked_completion(model: str, messages: list, **kwargs):
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        **kwargs
    )
    tracker.record(model, response.usage)
    return response

# After running many calls:
print(tracker.get_report())
```

---

## Caching Strategies

Caching is the single most effective way to reduce API costs. If you have seen a prompt before, do not pay for it again.

### Strategy 1: Response Caching

Cache complete responses for identical or near-identical inputs:

```javascript
import crypto from "crypto";

class ResponseCache {
  constructor(ttlMinutes = 60) {
    this.cache = new Map();
    this.ttl = ttlMinutes * 60 * 1000;
  }

  getKey(messages, model) {
    const content = JSON.stringify({ messages, model });
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  get(messages, model) {
    const key = this.getKey(messages, model);
    const entry = this.cache.get(key);

    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.response;
  }

  set(messages, model, response) {
    const key = this.getKey(messages, model);
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
    });
  }
}

const cache = new ResponseCache(30); // 30-minute TTL

async function cachedCompletion(model, messages, options = {}) {
  // Check cache first
  const cached = cache.get(messages, model);
  if (cached) {
    console.log("Cache hit -- saved an API call!");
    return cached;
  }

  // Cache miss -- make the API call
  const response = await openai.chat.completions.create({
    model,
    messages,
    ...options,
  });

  cache.set(messages, model, response);
  return response;
}
```

**When caching works well:**
- FAQ bots where users ask similar questions
- Classification tasks with repeated inputs
- Data extraction from templates with similar structure

**When caching does NOT work:**
- Conversational AI where every message is unique
- Creative generation where variety is desired
- Prompts with real-time data (timestamps, live data)

### Strategy 2: OpenAI Prompt Caching

OpenAI automatically caches the prefix of your prompts. If the first part of your prompt is identical across requests, you get a 50% discount on those cached input tokens.

This happens automatically when:
- Your prompt is over 1024 tokens
- The prefix of your prompt matches a recent request (within ~5-10 minutes)

To take advantage of this, structure your prompts with the **static content first**:

```javascript
// GOOD: Static system prompt first, dynamic user content last
const messages = [
  {
    role: "system",
    content: `You are a code reviewer for a JavaScript project.

    Follow these rules:
    1. Check for security vulnerabilities
    2. Identify performance issues
    3. Suggest readability improvements
    4. Flag any anti-patterns
    5. Use clear, actionable language

    Format your response as:
    ## Security
    ## Performance
    ## Readability
    ## Anti-patterns

    [... more static instructions that push past 1024 tokens ...]`,
  },
  {
    role: "user",
    content: dynamicCodeToReview, // Only this part changes
  },
];
```

### Strategy 3: Semantic Caching

For user-facing applications, exact match caching misses too many opportunities. "What is JavaScript?" and "What's JS?" should return the same cached response.

Use embeddings to find semantically similar queries:

```javascript
import OpenAI from "openai";

const openai = new OpenAI();

class SemanticCache {
  constructor(similarityThreshold = 0.95) {
    this.entries = [];
    this.threshold = similarityThreshold;
  }

  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async getEmbedding(text) {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  }

  async get(query) {
    const queryEmbedding = await this.getEmbedding(query);

    for (const entry of this.entries) {
      const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);
      if (similarity >= this.threshold) {
        console.log(`Semantic cache hit (similarity: ${similarity.toFixed(3)})`);
        return entry.response;
      }
    }

    return null;
  }

  async set(query, response) {
    const embedding = await this.getEmbedding(query);
    this.entries.push({ query, embedding, response, timestamp: Date.now() });
  }
}
```

Note: The embedding call itself costs money (though very little -- `text-embedding-3-small` is $0.02 per million tokens). The savings only make sense if your completion calls are expensive.

---

## Choosing Models by Task

The biggest cost lever is choosing the right model. Here is a decision framework:

### Model Selection Guide

```
Is the task simple and well-defined?
  ├── Yes → gpt-4o-mini ($0.15 / $0.60 per million tokens)
  │   Examples: classification, extraction, formatting, simple Q&A
  │
  └── No → Does it require deep reasoning?
      ├── Yes → o3-mini or o1
      │   Examples: complex math, code debugging, multi-step analysis
      │
      └── No → gpt-4o ($2.50 / $10.00 per million tokens)
          Examples: creative writing, code generation, nuanced analysis
```

### Cost Comparison: Same Task, Different Models

Let us say you are classifying 10,000 customer messages (average 50 input tokens, 10 output tokens each):

| Model        | Input Cost        | Output Cost       | Total        |
| ------------ | ----------------- | ----------------- | ------------ |
| gpt-4o       | $1.25             | $1.00             | $2.25        |
| gpt-4o-mini  | $0.075            | $0.06             | $0.135       |

> Prices change frequently. Check [OpenAI's pricing page](https://openai.com/api/pricing/) for current rates.

That is a **16x cost difference** for a task where `gpt-4o-mini` likely performs just as well.

### Model Routing in Code

Build a router that picks the model based on the task:

```javascript
function selectModel(task) {
  const modelMap = {
    // Simple, structured tasks → cheapest model
    classify: "gpt-4o-mini",
    extract: "gpt-4o-mini",
    format: "gpt-4o-mini",
    summarize_short: "gpt-4o-mini",

    // Complex, nuanced tasks → capable model
    code_generation: "gpt-4o",
    creative_writing: "gpt-4o",
    analysis: "gpt-4o",
    conversation: "gpt-4o",

    // Deep reasoning → reasoning model
    debugging: "o3-mini",
    math: "o3-mini",
    research: "o3-mini",
  };

  return modelMap[task] || "gpt-4o-mini"; // Default to cheapest
}

async function smartCompletion(task, messages, options = {}) {
  const model = selectModel(task);
  console.log(`Task: ${task} → Model: ${model}`);

  return openai.chat.completions.create({
    model,
    messages,
    ...options,
  });
}

// Usage
await smartCompletion("classify", [
  { role: "user", content: "Is this email spam or not?" },
]);

await smartCompletion("code_generation", [
  { role: "user", content: "Write a React component for a user profile card." },
]);
```

---

## Reducing Token Usage

Beyond model selection, reduce the tokens you send and receive.

### Shorter Prompts

```javascript
// VERBOSE (42 tokens)
const verbose = {
  role: "system",
  content:
    "You are an AI assistant. Your job is to classify the sentiment of the following text. Please respond with either 'positive', 'negative', or 'neutral'. Do not include any other text in your response.",
};

// CONCISE (18 tokens)
const concise = {
  role: "system",
  content: "Classify sentiment as: positive, negative, or neutral. Reply with one word only.",
};
```

### Limit Output Length

```javascript
// Set max_tokens to prevent long responses when you need short ones
const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  max_tokens: 10, // Classification doesn't need more
  messages: [
    {
      role: "system",
      content: "Classify sentiment: positive, negative, or neutral.",
    },
    { role: "user", content: "I love this product!" },
  ],
});
```

### Batch Processing

If you have many independent requests, batch them to reduce per-request overhead:

```javascript
// Instead of 100 separate API calls for classification:
const texts = [
  "Great product!",
  "Terrible service.",
  "It was okay.",
  // ... 97 more
];

// Batch into groups and classify multiple at once
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

const batches = chunkArray(texts, 20); // 20 texts per API call

for (const batch of batches) {
  const numberedTexts = batch
    .map((text, i) => `${i + 1}. "${text}"`)
    .join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Classify each text's sentiment. Reply with the number and sentiment only, one per line. Example: 1. positive",
      },
      { role: "user", content: numberedTexts },
    ],
  });

  console.log(response.choices[0].message.content);
}
```

This turns 100 API calls into 5, reducing both cost and latency.

### OpenAI Batch API

For non-real-time workloads (like processing a backlog of documents or generating embeddings in bulk), OpenAI's [Batch API](https://platform.openai.com/docs/guides/batch) offers **50% cost savings**. Batch jobs complete within 24 hours. This is ideal for ingestion pipelines and offline processing where you do not need an immediate response.

---

## Setting Budget Limits

### OpenAI Dashboard Limits

Set spending limits in your OpenAI account settings at [platform.openai.com/settings](https://platform.openai.com/settings). You can set:

- **Monthly budget**: Hard cap on spending.
- **Email alerts**: Get notified at spending thresholds.

### Application-Level Limits

Implement your own guardrails:

```javascript
class BudgetGuard {
  constructor(dailyLimitCents = 500) {
    this.dailyLimitCents = dailyLimitCents;
    this.todaySpendCents = 0;
    this.lastReset = new Date().toDateString();
  }

  checkBudget() {
    // Reset daily counter
    const today = new Date().toDateString();
    if (today !== this.lastReset) {
      this.todaySpendCents = 0;
      this.lastReset = today;
    }

    if (this.todaySpendCents >= this.dailyLimitCents) {
      throw new Error(
        `Daily budget exceeded: $${(this.todaySpendCents / 100).toFixed(2)} / $${(this.dailyLimitCents / 100).toFixed(2)}`
      );
    }
  }

  recordSpend(usage, model) {
    const pricing = PRICING[model];
    if (!pricing) return;

    const costCents =
      (usage.prompt_tokens * pricing.input +
        usage.completion_tokens * pricing.output) *
      100;

    this.todaySpendCents += costCents;
  }
}

const budget = new BudgetGuard(500); // $5.00/day limit

async function budgetedCompletion(model, messages, options = {}) {
  budget.checkBudget(); // Throws if over budget

  const response = await openai.chat.completions.create({
    model,
    messages,
    ...options,
  });

  budget.recordSpend(response.usage, model);

  return response;
}
```

---

## Cost Management Dashboard

For a production app, build a simple dashboard to monitor costs:

```python
import json
from datetime import datetime, timedelta

class CostDashboard:
    def __init__(self):
        self.logs = []

    def log_call(self, model: str, input_tokens: int, output_tokens: int,
                 endpoint: str = "chat"):
        pricing = PRICING.get(model, {"input": 0, "output": 0})
        cost = input_tokens * pricing["input"] + output_tokens * pricing["output"]

        self.logs.append({
            "timestamp": datetime.now().isoformat(),
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_usd": cost,
            "endpoint": endpoint
        })

    def daily_summary(self, days: int = 7):
        cutoff = datetime.now() - timedelta(days=days)

        for day_offset in range(days):
            day = (cutoff + timedelta(days=day_offset + 1)).date()
            day_logs = [
                log for log in self.logs
                if datetime.fromisoformat(log["timestamp"]).date() == day
            ]

            total_cost = sum(log["cost_usd"] for log in day_logs)
            total_calls = len(day_logs)
            total_tokens = sum(
                log["input_tokens"] + log["output_tokens"] for log in day_logs
            )

            print(f"{day}: {total_calls} calls, {total_tokens:,} tokens, ${total_cost:.4f}")

    def model_breakdown(self):
        by_model = {}
        for log in self.logs:
            model = log["model"]
            if model not in by_model:
                by_model[model] = {"calls": 0, "cost": 0, "tokens": 0}
            by_model[model]["calls"] += 1
            by_model[model]["cost"] += log["cost_usd"]
            by_model[model]["tokens"] += log["input_tokens"] + log["output_tokens"]

        for model, data in sorted(by_model.items(), key=lambda x: -x[1]["cost"]):
            print(f"{model}: {data['calls']} calls, {data['tokens']:,} tokens, ${data['cost']:.4f}")
```

---

## Key Takeaways

1. **Know your tokens.** Use `tiktoken` to count tokens precisely. A token is roughly 3-4 characters or 0.75 words.
2. **Track every API call.** Log model, token counts, and costs for every request. You cannot optimize what you do not measure.
3. **Cache aggressively.** Response caching, prompt caching, and semantic caching can cut costs by 50-90% for many workloads.
4. **Choose the right model.** `gpt-4o-mini` handles most simple tasks at 1/16th the cost of `gpt-4o`. Route tasks to appropriate models.
5. **Reduce token usage.** Write concise prompts, set `max_tokens`, and batch multiple inputs into single requests.
6. **Set budget limits.** Use both OpenAI dashboard limits and application-level guards to prevent runaway spending.
7. **Output tokens cost more.** With `gpt-4o`, output tokens are 4x the price of input tokens. Keep responses concise.

---

## Try It Yourself

1. **Token Counter Tool**: Build a CLI tool that reads a file (or stdin) and reports the token count for different models. Use it to estimate the cost of processing your codebase.

2. **Cost Tracker Integration**: Add the `CostTracker` class to the chatbot you built in Lesson 01. Run 20 different questions and generate a cost report at the end.

3. **Model A/B Test**: Pick a classification task (e.g., sentiment analysis). Run the same 50 inputs through `gpt-4o` and `gpt-4o-mini`. Compare accuracy AND cost. Is the cheaper model good enough?

4. **Caching Experiment**: Implement the response cache and run the same FAQ 100 times. Compare costs with and without caching. Calculate the cache hit rate.

5. **Budget Alerting**: Extend the `BudgetGuard` to send a Slack notification (using the Slack API from earlier lessons) when spending crosses 80% of the daily limit.

---
title: "Tokens, Context Windows, and Pricing"
estimatedMinutes: 45
---

# Tokens, Context Windows, and Pricing

Tokens are the currency of the LLM world -- literally. You pay per token, your context window is measured in tokens, and the quality of your outputs depends on how efficiently you use your token budget. If you're going to build AI features into production apps, you need to understand tokenization the same way you understand HTTP status codes: not necessarily the deep internals, but definitely the practical implications.

As builders in our community, we're especially conscious of costs. Knowing how tokenization works lets you build powerful AI features without burning through your budget.

---

## What Is a Token?

A token is the fundamental unit that LLMs work with. It's not exactly a word, not exactly a character -- it's something in between. Tokens are produced by a **tokenizer**, which splits text into pieces that the model can process.

### How Tokenization Works

Most modern LLMs use **Byte Pair Encoding (BPE)** or a variant of it. The algorithm is elegant:

1. Start with every individual character as a token
2. Find the most frequently occurring pair of adjacent tokens in the training data
3. Merge that pair into a new token
4. Repeat thousands of times

The result is a vocabulary of tokens that includes individual characters (for rare words), common subwords, and frequent whole words:

```
"tokenization" → ["token", "ization"]
"the" → ["the"]                        # Common word = single token
"Anthropic" → ["Anthrop", "ic"]        # Less common = split
"🎉" → ["🎉"]                          # Emoji = single token (usually)
"   " → ["   "]                         # Whitespace is a token too
"https://api.example.com" → ["https", "://", "api", ".", "example", ".com"]
```

### Tokens Are NOT Words

This is a critical distinction. Here are some rules of thumb for English text:

- **1 token is approximately 4 characters** or **0.75 words**
- **100 tokens is approximately 75 words**
- **1,000 tokens is approximately 750 words** (about 1.5 pages)

But these are averages. Token counts vary by language, content type, and specific text:

```javascript
// These all have different token counts despite similar word counts:
"Hello world"           // 2 tokens
"Supercalifragilistic"  // 5 tokens (uncommon word gets split)
"const x = 42;"         // 4 tokens
"こんにちは"              // 3+ tokens (non-English often uses more tokens)
"{ \"key\": \"value\" }" // 7 tokens (JSON structure)
```

### Seeing Tokens in Action

OpenAI provides a tokenizer tool called `tiktoken`. Let's use it:

```python
# pip install tiktoken
import tiktoken

# GPT-4o uses the "o200k_base" tokenizer
enc = tiktoken.get_encoding("o200k_base")

text = "Building AI features for web applications is exciting!"
tokens = enc.encode(text)

print(f"Text: {text}")
print(f"Token count: {len(tokens)}")
print(f"Token IDs: {tokens}")
print(f"Individual tokens: {[enc.decode([t]) for t in tokens]}")

# Output:
# Text: Building AI features for web applications is exciting!
# Token count: 9
# Token IDs: [31233, 15592, 4396, 369, 3566, 8522, 382, 20207, 0]
# Individual tokens: ['Building', ' AI', ' features', ' for', ' web', ' applications', ' is', ' exciting', '!']
```

```javascript
// In JavaScript, you can use the js-tiktoken package
// npm install js-tiktoken
import { getEncoding } from 'js-tiktoken';

const enc = getEncoding('o200k_base');

const text = 'Building AI features for web applications is exciting!';
const tokens = enc.encode(text);

console.log(`Token count: ${tokens.length}`);  // 9
console.log(`Tokens: ${tokens}`);
```

### Why Different Models Have Different Tokenizers

Each model family has its own tokenizer with a different vocabulary:

| Model Family | Tokenizer | Vocabulary Size |
|-------------|-----------|----------------|
| GPT-4, GPT-4o | o200k_base | ~200,000 tokens |
| GPT-3.5 | cl100k_base | ~100,000 tokens |
| Claude | Custom BPE | ~100,000+ tokens |
| Llama 3 | Custom BPE | 128,000 tokens |

This means the same text may produce different token counts with different models. When estimating costs, always use the correct tokenizer for your model.

---

## Context Windows Explained

The **context window** (also called context length or max tokens) is the total number of tokens a model can process in a single request. This includes **everything**: your system prompt, conversation history, user message, AND the model's response.

```
┌──────────────────────────────────────────────────────────────┐
│                    Context Window (128K tokens)               │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ System Prompt│  │ Conversation │  │  Model's Response    │ │
│  │ (500 tokens) │  │   History    │  │  (up to max_tokens)  │ │
│  │              │  │ (2000 tokens)│  │                      │ │
│  └─────────────┘  └──────────────┘  └──────────────────────┘ │
│                                                               │
│  ◄──── Input tokens ────────────►  ◄── Output tokens ──────► │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Current Context Window Sizes

| Model | Context Window | Approximately |
|-------|---------------|---------------|
| GPT-4o | 128K tokens | ~96,000 words / ~190 pages |
| GPT-4o mini | 128K tokens | ~96,000 words |
| Claude 4 Sonnet | 200K tokens | ~150,000 words / ~300 pages |
| Claude Opus 4 | 200K tokens | ~150,000 words |
| Gemini 1.5 Pro | 2M tokens | ~1.5M words / ~3,000 pages |
| Gemini 2.0 Flash | 1M tokens | ~750,000 words |
| Llama 3 70B | 128K tokens | ~96,000 words |

### Input Tokens vs Output Tokens

API providers distinguish between:

- **Input tokens** (also called "prompt tokens"): Everything you send to the model
- **Output tokens** (also called "completion tokens"): Everything the model generates

This distinction matters because they're priced differently (output tokens typically cost 3-5x more than input tokens) and because you control them separately:

```javascript
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: systemPrompt },     // Input tokens
    { role: 'user', content: userMessage },         // Input tokens
  ],
  max_tokens: 1000,  // Limit output tokens (NOT total context)
});

// The response tells you exactly what you used
console.log(response.usage);
// {
//   prompt_tokens: 523,      // Input tokens
//   completion_tokens: 287,  // Output tokens
//   total_tokens: 810        // Total
// }
```

```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ],
    max_tokens=1000,
)

print(response.usage)
# CompletionUsage(prompt_tokens=523, completion_tokens=287, total_tokens=810)
```

### The "Lost in the Middle" Problem

Research has shown that LLMs tend to pay more attention to information at the **beginning** and **end** of the context window. Information buried in the middle of a long context may be partially ignored. This is called the "lost in the middle" problem.

Practical implications:
- Put critical instructions in the system prompt (beginning)
- Put the user's question or task at the end
- If inserting reference documents, put the most important ones first or last
- Consider summarizing middle content rather than including it verbatim

```javascript
// Good: Important context at the boundaries
const messages = [
  { role: 'system', content: 'You are a support agent. ALWAYS include a ticket number.' },  // Beginning
  { role: 'user', content: `Here is the conversation history:\n${longHistory}` },            // Middle (less critical)
  { role: 'user', content: 'Based on the above, what should the customer do next?' },        // End
];

// Less effective: Critical instruction buried in the middle of a long prompt
const messages = [
  { role: 'user', content: `${longDocument}\n\nALWAYS format as JSON.\n\n${moreLongDocument}` },
];
```

---

## Token Counting in Practice

When building production applications, you need to count tokens before sending requests to avoid exceeding context limits and to estimate costs.

### Counting Tokens Before API Calls

```javascript
import { getEncoding } from 'js-tiktoken';

const encoder = getEncoding('o200k_base');

function countTokens(text) {
  return encoder.encode(text).length;
}

function countMessageTokens(messages) {
  let totalTokens = 0;

  for (const message of messages) {
    // Each message has overhead tokens for role markers
    totalTokens += 4; // Approximate overhead per message
    totalTokens += countTokens(message.content);
  }

  totalTokens += 2; // Overhead for the reply priming

  return totalTokens;
}

// Before making an API call, check if you'll fit
const messages = [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: userInput },
];

const inputTokens = countMessageTokens(messages);
const maxOutputTokens = 1000;
const contextLimit = 128000;

if (inputTokens + maxOutputTokens > contextLimit) {
  console.warn('Input too long! Need to truncate or summarize.');
  // Implement truncation strategy
}
```

```python
import tiktoken

def count_tokens(text: str, model: str = "gpt-4o") -> int:
    encoding = tiktoken.encoding_for_model(model)
    return len(encoding.encode(text))

def count_message_tokens(messages: list, model: str = "gpt-4o") -> int:
    encoding = tiktoken.encoding_for_model(model)
    total = 0
    for message in messages:
        total += 4  # message overhead
        total += len(encoding.encode(message["content"]))
    total += 2  # reply priming
    return total

# Usage
user_input = "Explain the difference between SQL and NoSQL databases"
token_count = count_tokens(user_input)
print(f"Input is {token_count} tokens")  # ~10 tokens
```

### Handling Long Inputs

When user input exceeds your token budget, you have several strategies:

```javascript
// Strategy 1: Truncation (simple but lossy)
function truncateToTokenLimit(text, maxTokens) {
  const tokens = encoder.encode(text);
  if (tokens.length <= maxTokens) return text;

  const truncated = tokens.slice(0, maxTokens);
  return encoder.decode(truncated);
}

// Strategy 2: Chunking (process in pieces)
function chunkText(text, chunkSize, overlap = 100) {
  const tokens = encoder.encode(text);
  const chunks = [];

  for (let i = 0; i < tokens.length; i += chunkSize - overlap) {
    const chunk = tokens.slice(i, i + chunkSize);
    chunks.push(encoder.decode(chunk));
  }

  return chunks;
}

// Strategy 3: Summarize-then-process
async function summarizeAndProcess(longText, question) {
  // First, summarize the long text
  const summary = await llm.complete({
    prompt: `Summarize the following text, preserving key details:\n\n${longText}`,
    maxTokens: 500,
  });

  // Then, answer the question using the summary
  return await llm.complete({
    prompt: `Based on this summary:\n${summary}\n\nAnswer: ${question}`,
    maxTokens: 1000,
  });
}
```

---

## Pricing: What Tokens Cost

LLM API pricing is per-token, usually quoted per million tokens. Here's the current landscape:

### Major Model Pricing (as of early 2026)

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|----------------------|
| GPT-4o | $2.50 | $10.00 |
| GPT-4o mini | $0.15 | $0.60 |
| Claude 4 Sonnet | $3.00 | $15.00 |
| Claude Opus 4 | $15.00 | $75.00 |
| Gemini 1.5 Pro | $1.25 | $5.00 |
| Gemini 2.0 Flash | $0.10 | $0.40 |
| Llama 3 70B (hosted) | $0.80 | $0.80 |

> **Note:** Prices change frequently. Always check the official pricing pages at [platform.openai.com](https://platform.openai.com/docs/pricing) and [docs.anthropic.com](https://docs.anthropic.com/en/docs/about-claude/models) for current rates.

### Calculating Costs

```javascript
function estimateCost(inputTokens, outputTokens, model = 'gpt-4o') {
  const pricing = {
    'gpt-4o':       { input: 2.50, output: 10.00 },
    'gpt-4o-mini':  { input: 0.15, output: 0.60 },
    'claude-3.5':   { input: 3.00, output: 15.00 },
    'gemini-flash': { input: 0.10, output: 0.40 },
  };

  const rates = pricing[model];
  const inputCost = (inputTokens / 1_000_000) * rates.input;
  const outputCost = (outputTokens / 1_000_000) * rates.output;

  return {
    inputCost: inputCost.toFixed(6),
    outputCost: outputCost.toFixed(6),
    totalCost: (inputCost + outputCost).toFixed(6),
  };
}

// Example: Summarizing a 10-page document
const result = estimateCost(
  5000,  // ~10 pages input
  500,   // Summary output
  'gpt-4o'
);
console.log(result);
// { inputCost: '0.012500', outputCost: '0.005000', totalCost: '0.017500' }
// Less than 2 cents!
```

### Real-World Cost Examples

| Use Case | Input Tokens | Output Tokens | Model | Cost |
|----------|-------------|--------------|-------|------|
| Single chatbot response | 1,000 | 500 | GPT-4o | $0.008 |
| Summarize a blog post | 3,000 | 300 | GPT-4o mini | $0.0006 |
| Analyze a codebase file | 5,000 | 2,000 | Claude 4 Sonnet | $0.045 |
| Generate product descriptions (100x) | 50,000 | 50,000 | GPT-4o mini | $0.038 |
| Daily support chatbot (1000 conversations) | 2,000,000 | 1,000,000 | GPT-4o mini | $0.90 |

### Cost Optimization Strategies

```javascript
// 1. Use the smallest model that works
// Don't use GPT-4o for simple classification -- GPT-4o mini works fine
const model = taskRequiresReasoning ? 'gpt-4o' : 'gpt-4o-mini';

// 2. Cache responses for repeated queries
const cache = new Map();

async function cachedCompletion(prompt, options) {
  const cacheKey = JSON.stringify({ prompt, ...options });
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  const result = await llm.complete(prompt, options);
  cache.set(cacheKey, result);
  return result;
}

// 3. Limit output tokens
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages,
  max_tokens: 200,  // Don't let the model ramble
});

// 4. Batch similar requests
// Instead of 100 individual API calls, send batch requests
// OpenAI supports batch API with 50% discount

// 5. Use prompt caching (Anthropic and OpenAI both support this)
// Both providers offer prompt caching that dramatically reduces costs for repeated prompts.
// Anthropic's prompt caching lets you cache the first portion of repeated prompts (like
// system prompts and few-shot examples) for a 90% reduction on cached input tokens.
// OpenAI's caching is automatic for prompts longer than 1024 tokens, giving a 50% discount
// on the cached prefix. This is especially valuable for few-shot and RAG patterns where
// a large prompt prefix stays the same across many requests.
```

---

## Token Limits and Truncation Strategies

In production applications, you'll regularly need to manage token budgets. Here's a practical framework:

### The Token Budget Pattern

```javascript
class TokenBudget {
  constructor(contextLimit, reservedForOutput) {
    this.contextLimit = contextLimit;
    this.reservedForOutput = reservedForOutput;
    this.availableForInput = contextLimit - reservedForOutput;
  }

  allocate(components) {
    // components: [{ name, content, priority, minTokens }]
    const sorted = components.sort((a, b) => a.priority - b.priority);
    let remaining = this.availableForInput;
    const allocated = {};

    for (const comp of sorted) {
      const tokens = countTokens(comp.content);
      if (tokens <= remaining) {
        allocated[comp.name] = comp.content;
        remaining -= tokens;
      } else if (remaining >= comp.minTokens) {
        // Truncate to fit
        allocated[comp.name] = truncateToTokenLimit(comp.content, remaining);
        remaining = 0;
      }
      // If not enough space, skip this component
    }

    return { allocated, tokensUsed: this.availableForInput - remaining };
  }
}

// Usage
const budget = new TokenBudget(128000, 4000);  // GPT-4o, reserve 4K for response

const result = budget.allocate([
  { name: 'system', content: systemPrompt, priority: 1, minTokens: 100 },
  { name: 'history', content: chatHistory, priority: 3, minTokens: 500 },
  { name: 'context', content: relevantDocs, priority: 2, minTokens: 1000 },
  { name: 'userMessage', content: userInput, priority: 1, minTokens: 50 },
]);
```

### Conversation History Management

For chatbots, conversation history grows with each turn. You need a strategy to keep it within limits:

```javascript
function trimConversationHistory(messages, maxTokens) {
  // Always keep the system message
  const systemMessage = messages.find(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');

  // Always keep the latest user message
  const latestMessage = conversationMessages.pop();

  let tokenCount = countTokens(systemMessage.content) + countTokens(latestMessage.content);
  const keptMessages = [];

  // Add messages from most recent to oldest until we hit the limit
  for (let i = conversationMessages.length - 1; i >= 0; i--) {
    const msgTokens = countTokens(conversationMessages[i].content);
    if (tokenCount + msgTokens > maxTokens) break;
    keptMessages.unshift(conversationMessages[i]);
    tokenCount += msgTokens;
  }

  return [systemMessage, ...keptMessages, latestMessage];
}
```

```python
def trim_conversation_history(messages: list, max_tokens: int) -> list:
    """Keep system message, latest user message, and as many
    recent messages as fit within the token budget."""
    system_msg = next((m for m in messages if m["role"] == "system"), None)
    conversation = [m for m in messages if m["role"] != "system"]
    latest = conversation.pop()

    token_count = count_tokens(system_msg["content"]) + count_tokens(latest["content"])
    kept = []

    for msg in reversed(conversation):
        msg_tokens = count_tokens(msg["content"])
        if token_count + msg_tokens > max_tokens:
            break
        kept.insert(0, msg)
        token_count += msg_tokens

    result = []
    if system_msg:
        result.append(system_msg)
    result.extend(kept)
    result.append(latest)
    return result
```

---

## Special Tokens and Token Quirks

There are some tokenization behaviors that trip up developers:

### Whitespace Matters

Leading spaces are tokenized differently from embedded spaces:

```python
enc = tiktoken.get_encoding("o200k_base")

print(len(enc.encode("hello")))       # 1 token
print(len(enc.encode(" hello")))      # 1 token (leading space is part of the token)
print(len(enc.encode("  hello")))     # 2 tokens (double space creates separate token)
```

### Code Uses More Tokens Than Prose

Code tends to use more tokens per "word" because of special characters, indentation, and less common identifiers:

```python
prose = "The quick brown fox jumps over the lazy dog."
code = 'const quickBrownFox = () => { return "lazy dog"; };'

print(f"Prose: {count_tokens(prose)} tokens")  # ~10 tokens
print(f"Code: {count_tokens(code)} tokens")    # ~16 tokens
```

### Numbers Are Expensive

Large numbers and UUIDs can use surprisingly many tokens:

```python
print(count_tokens("42"))                                    # 1 token
print(count_tokens("123456789"))                             # 3 tokens
print(count_tokens("550e8400-e29b-41d4-a716-446655440000"))  # 12+ tokens
```

### Non-English Text Uses More Tokens

Tokenizers are trained primarily on English text, so other languages are less efficiently encoded:

```python
english = "Hello, how are you today?"         # ~7 tokens
spanish = "Hola, como estas hoy?"             # ~8 tokens
japanese = "こんにちは、お元気ですか？"           # ~12 tokens
arabic = "مرحبا، كيف حالك اليوم؟"              # ~15 tokens
```

This has real cost implications for multilingual applications.

---

## Monitoring Token Usage in Production

For production applications, tracking token usage is essential for cost management and debugging:

```javascript
class TokenUsageTracker {
  constructor() {
    this.usage = [];
  }

  track(requestId, model, usage) {
    this.usage.push({
      requestId,
      model,
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      timestamp: new Date().toISOString(),
      estimatedCost: this.calculateCost(model, usage),
    });
  }

  calculateCost(model, usage) {
    const rates = {
      'gpt-4o': { input: 2.50 / 1e6, output: 10.00 / 1e6 },
      'gpt-4o-mini': { input: 0.15 / 1e6, output: 0.60 / 1e6 },
    };
    const rate = rates[model] || rates['gpt-4o'];
    return (
      usage.prompt_tokens * rate.input +
      usage.completion_tokens * rate.output
    );
  }

  getSummary() {
    const totalCost = this.usage.reduce((sum, u) => sum + u.estimatedCost, 0);
    const totalTokens = this.usage.reduce((sum, u) => sum + u.totalTokens, 0);
    return {
      totalRequests: this.usage.length,
      totalTokens,
      totalCost: `$${totalCost.toFixed(4)}`,
      avgTokensPerRequest: Math.round(totalTokens / this.usage.length),
    };
  }
}

// Usage
const tracker = new TokenUsageTracker();

const response = await openai.chat.completions.create({ model: 'gpt-4o', messages });
tracker.track('req-123', 'gpt-4o', response.usage);

console.log(tracker.getSummary());
```

---

## Key Takeaways

1. **Tokens are the atomic units of LLMs** -- roughly 4 characters or 0.75 words in English. Different models use different tokenizers.

2. **Context windows define the total capacity** for input + output tokens. Everything must fit: system prompt, conversation history, user input, and the model's response.

3. **Input and output tokens are priced differently.** Output tokens typically cost 3-5x more. Optimize by limiting response length and choosing appropriately sized models.

4. **Count tokens before making API calls.** Use libraries like `tiktoken` (Python) or `js-tiktoken` (JavaScript) to avoid hitting context limits and to estimate costs.

5. **The "lost in the middle" problem is real.** Put critical information at the beginning (system prompt) or end (user question) of your context, not buried in the middle.

6. **Code, numbers, and non-English text use more tokens** than English prose. Account for this in multilingual or code-heavy applications.

7. **Implement token budget management** in production: conversation history trimming, input truncation, and usage tracking are essential patterns.

---

## Try It Yourself

**Exercise: Build a Token Counter CLI Tool**

Create a command-line tool that analyzes token usage for a given text or file:

```javascript
// token-counter.js
import { getEncoding } from 'js-tiktoken';
import { readFileSync } from 'fs';

const encoder = getEncoding('o200k_base');

const input = process.argv[2];

let text;
if (input && input.startsWith('@')) {
  // Read from file: node token-counter.js @myfile.txt
  text = readFileSync(input.slice(1), 'utf-8');
} else {
  text = input || 'Hello, world!';
}

const tokens = encoder.encode(text);

console.log(`Characters: ${text.length}`);
console.log(`Tokens: ${tokens.length}`);
console.log(`Ratio: ${(text.length / tokens.length).toFixed(2)} chars/token`);
console.log(`Estimated cost (GPT-4o input): $${((tokens.length / 1e6) * 2.5).toFixed(6)}`);
console.log(`Estimated cost (GPT-4o mini input): $${((tokens.length / 1e6) * 0.15).toFixed(6)}`);
```

**Challenge:** Extend it to:
1. Accept multiple files and show per-file and total token counts
2. Show the most "expensive" tokens (longest character sequences per token)
3. Estimate how many tokens of context window would remain for a response if this text were the entire prompt
4. Compare token counts across different model tokenizers

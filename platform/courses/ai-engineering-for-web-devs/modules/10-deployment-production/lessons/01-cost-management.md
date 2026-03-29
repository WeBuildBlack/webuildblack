---
title: "Managing LLM Costs in Production"
estimatedMinutes: 75
---

## Introduction

Here is a scenario that plays out more often than anyone likes to admit: you build a slick AI feature, launch it, users love it, and then your OpenAI bill arrives. Suddenly that $20/month side project is costing $2,000/month, and you are scrambling to figure out why.

LLM API costs can grow faster than almost any other infrastructure expense because they scale with *usage* and *complexity* simultaneously. More users means more requests. Longer conversations mean more tokens. Better prompts often mean longer prompts. Without deliberate cost management, you will blow through budgets fast.

This lesson teaches you how to build AI features that are powerful *and* affordable.

---

## Understanding LLM Pricing

### The Token Economy

LLM APIs charge by the token. A token is roughly 3/4 of a word in English. The sentence "What is machine learning?" is about 6 tokens.

Here are the current prices for popular models (as of early 2026):

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Best For |
|-------|----------------------|----------------------|----------|
| GPT-4o | $2.50 | $10.00 | Complex reasoning, high quality |
| GPT-4o-mini | $0.15 | $0.60 | Most production workloads |
| Claude 4 Sonnet | $3.00 | $15.00 | Long context, nuanced writing |
| Claude Haiku 4 | $0.25 | $1.25 | Fast, cheap, good enough |
| text-embedding-3-small | $0.02 | N/A | Embeddings |
| text-embedding-3-large | $0.13 | N/A | Higher quality embeddings |

**Key insight**: Output tokens are 2-4x more expensive than input tokens. A chatbot that generates long, verbose responses costs significantly more than one that is concise.

### Calculating Real Costs

Let's do the math for a real application. Imagine your BrainBase app has 100 daily active users, each asking 10 questions per day:

```
Per question (using GPT-4o-mini):
  - System prompt: ~500 tokens input
  - RAG context (5 chunks): ~2,500 tokens input
  - User question: ~50 tokens input
  - Conversation history: ~1,000 tokens input
  - Total input: ~4,100 tokens
  - Response: ~500 tokens output

Daily cost:
  - Input: 100 users x 10 questions x 4,100 tokens = 4.1M tokens
  - Output: 100 users x 10 questions x 500 tokens = 500K tokens
  - Input cost: 4.1M x $0.15/1M = $0.615
  - Output cost: 500K x $0.60/1M = $0.30
  - Total: ~$0.92/day = ~$27.50/month

Same math with GPT-4o:
  - Input cost: 4.1M x $2.50/1M = $10.25
  - Output cost: 500K x $10.00/1M = $5.00
  - Total: ~$15.25/day = ~$457.50/month
```

Choosing GPT-4o-mini over GPT-4o saves over $400/month for the same traffic. And the quality difference for most RAG tasks is minimal.

---

## Strategy 1: Model Selection

The most impactful cost optimization is choosing the right model for each task.

### Model Routing

Not every request needs your most powerful (and expensive) model. Route requests to different models based on complexity:

```typescript
// src/lib/ai/model-router.ts

interface ModelConfig {
  model: string;
  maxTokens: number;
  temperature: number;
}

export function selectModel(query: string, contextLength: number): ModelConfig {
  // Simple questions with short context -> cheapest model
  if (query.length < 100 && contextLength < 2000) {
    return {
      model: 'gpt-4o-mini',
      maxTokens: 300,
      temperature: 0.3,
    };
  }

  // Complex questions or long context -> better model
  if (
    query.includes('compare') ||
    query.includes('analyze') ||
    query.includes('explain the relationship') ||
    contextLength > 8000
  ) {
    return {
      model: 'gpt-4o',
      maxTokens: 1000,
      temperature: 0.5,
    };
  }

  // Default: balanced model
  return {
    model: 'gpt-4o-mini',
    maxTokens: 500,
    temperature: 0.3,
  };
}
```

### Python Model Router

```python
# model_router.py

def select_model(query: str, context_length: int) -> dict:
    """Route queries to the most cost-effective model."""

    # Classify query complexity
    complex_keywords = ["compare", "analyze", "synthesize", "explain why", "relationship between"]
    is_complex = any(kw in query.lower() for kw in complex_keywords)

    if is_complex or context_length > 8000:
        return {
            "model": "gpt-4o",
            "max_tokens": 1000,
            "temperature": 0.5,
        }

    return {
        "model": "gpt-4o-mini",
        "max_tokens": 500,
        "temperature": 0.3,
    }
```

### Using a Classifier for Routing

For more sophisticated routing, use a fast classifier to categorize queries:

```typescript
async function classifyComplexity(query: string): Promise<'simple' | 'moderate' | 'complex'> {
  const openai = new OpenAI();

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Classify the query complexity as "simple", "moderate", or "complex". Respond with only one word.',
      },
      { role: 'user', content: query },
    ],
    max_tokens: 5,
    temperature: 0,
  });

  const classification = response.choices[0].message.content?.trim().toLowerCase();

  if (classification === 'simple' || classification === 'moderate' || classification === 'complex') {
    return classification;
  }

  return 'moderate'; // Default
}
```

**Cost of the classifier itself**: This classification call uses ~50 input tokens and ~5 output tokens with GPT-4o-mini, costing roughly $0.000011. If it saves you from using GPT-4o on 50% of queries, the savings are massive.

### Batch API for Non-Realtime Workloads

Both OpenAI and Anthropic offer batch processing APIs at **50% cost reduction**:
- **OpenAI Batch API** (`/v1/batches`): Submit JSONL files, results within 24 hours
- **Anthropic Message Batches**: Submit up to 10,000 messages, results within 24 hours

Use batch APIs for document ingestion, evaluation runs, content generation, and any task that doesn't need real-time responses.

---

## Strategy 2: Prompt Optimization

Shorter prompts cost less. But short does not mean worse -- it means *efficient*.

### Before and After: System Prompt

**Expensive prompt (847 tokens):**

```
You are an incredibly helpful AI assistant called BrainBase. You have been
designed to help users find information in their uploaded documents. You should
always be polite, professional, and thorough in your responses. When answering
questions, you should reference the specific documents and sections where you
found the information. If you cannot find the answer in the provided context,
you should let the user know that you were unable to find relevant information
and suggest that they try rephrasing their question or uploading additional
documents that might contain the answer they are looking for. Please format
your responses using markdown when appropriate, including bullet points,
numbered lists, and code blocks. Always cite your sources using [Source N]
notation so that users can verify the information...
(continues for several more paragraphs)
```

**Optimized prompt (193 tokens):**

```
You are BrainBase. Answer using ONLY the provided context.

Rules:
- Cite sources as [Source N]
- Say "not found in documents" if context lacks the answer
- Use markdown formatting
- Be concise

CONTEXT:
{context}
```

Both prompts produce nearly identical response quality for RAG tasks. The optimized version saves 654 tokens per request. At 1,000 requests per day, that is 654,000 input tokens saved daily -- about $0.10/day with GPT-4o-mini or $1.64/day with GPT-4o.

### Compressing Conversation History

Long conversations accumulate tokens fast. Instead of sending the full history, summarize older messages:

```typescript
// src/lib/ai/history-compressor.ts
import OpenAI from 'openai';

const openai = new OpenAI();

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function compressHistory(
  messages: Message[],
  maxRecentMessages: number = 4
): Promise<Message[]> {
  if (messages.length <= maxRecentMessages) {
    return messages;
  }

  // Keep the most recent messages as-is
  const recentMessages = messages.slice(-maxRecentMessages);
  const olderMessages = messages.slice(0, -maxRecentMessages);

  // Summarize older messages
  const summaryResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Summarize this conversation in 2-3 sentences. Focus on key topics discussed and conclusions reached.',
      },
      {
        role: 'user',
        content: olderMessages.map(m => `${m.role}: ${m.content}`).join('\n'),
      },
    ],
    max_tokens: 150,
    temperature: 0,
  });

  const summary = summaryResponse.choices[0].message.content || '';

  return [
    { role: 'assistant' as const, content: `[Previous conversation summary: ${summary}]` },
    ...recentMessages,
  ];
}
```

### Reducing Context Size

Not all retrieved chunks are equally useful. Filter aggressively:

```typescript
function filterChunks(
  chunks: { content: string; similarity: number }[],
  maxTokens: number = 3000
): typeof chunks {
  let totalTokens = 0;
  const filtered: typeof chunks = [];

  // Sort by similarity (highest first)
  const sorted = [...chunks].sort((a, b) => b.similarity - a.similarity);

  for (const chunk of sorted) {
    // > **For accurate token counting**, use `tiktoken` (OpenAI) or `js-tiktoken`
    // > (npm). The `length / 4` approximation is reasonable for English text but
    // > can be off by 20-30% for code or non-English content.
    const chunkTokens = Math.ceil(chunk.content.length / 4); // Rough estimate
    if (totalTokens + chunkTokens > maxTokens) break;
    filtered.push(chunk);
    totalTokens += chunkTokens;
  }

  return filtered;
}
```

---

## Strategy 3: Usage Monitoring

You cannot optimize what you do not measure.

### Token Tracking Middleware

```typescript
// src/lib/ai/usage-tracker.ts

interface UsageRecord {
  userId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  endpoint: string;
  timestamp: Date;
}

// Pricing lookup (cents per 1M tokens)
// Note: these are in CENTS, not dollars. Divide by 100 to get dollars.
// gpt-4o: $2.50 input / $10.00 output per 1M tokens
// gpt-4o-mini: $0.15 input / $0.60 output per 1M tokens
const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 250, output: 1000 },
  'gpt-4o-mini': { input: 15, output: 60 },
  'text-embedding-3-small': { input: 2, output: 0 },
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const prices = PRICING[model];
  if (!prices) return 0;

  const inputCost = (inputTokens / 1_000_000) * prices.input;
  const outputCost = (outputTokens / 1_000_000) * prices.output;

  return inputCost + outputCost; // in cents
}

export async function trackUsage(record: UsageRecord): Promise<void> {
  // Store in your database
  const supabase = createServiceClient();

  await supabase.from('usage_logs').insert({
    user_id: record.userId,
    model: record.model,
    input_tokens: record.inputTokens,
    output_tokens: record.outputTokens,
    cost_cents: record.cost,
    endpoint: record.endpoint,
    created_at: record.timestamp.toISOString(),
  });
}
```

### Usage Dashboard Query

```sql
-- Daily cost breakdown by model
SELECT
  DATE(created_at) AS day,
  model,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  SUM(cost_cents) / 100.0 AS total_cost_dollars
FROM usage_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), model
ORDER BY day DESC, total_cost_dollars DESC;

-- Cost per user (top 10 most expensive users)
SELECT
  user_id,
  COUNT(*) AS request_count,
  SUM(cost_cents) / 100.0 AS total_cost_dollars,
  SUM(cost_cents) / 100.0 / COUNT(*) AS avg_cost_per_request
FROM usage_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_id
ORDER BY total_cost_dollars DESC
LIMIT 10;
```

### Setting Budget Alerts

```typescript
// src/lib/ai/budget-guard.ts

const DAILY_BUDGET_CENTS = 500; // $5/day
const USER_DAILY_BUDGET_CENTS = 50; // $0.50/user/day

export async function checkBudget(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  currentSpend: number;
}> {
  const supabase = createServiceClient();
  const today = new Date().toISOString().split('T')[0];

  // Check global daily spend
  const { data: globalSpend } = await supabase
    .from('usage_logs')
    .select('cost_cents')
    .gte('created_at', `${today}T00:00:00Z`);

  const totalSpend = globalSpend?.reduce((sum, r) => sum + r.cost_cents, 0) || 0;

  if (totalSpend >= DAILY_BUDGET_CENTS) {
    return {
      allowed: false,
      reason: 'Daily API budget exceeded. Service will resume tomorrow.',
      currentSpend: totalSpend,
    };
  }

  // Check per-user daily spend
  const { data: userSpend } = await supabase
    .from('usage_logs')
    .select('cost_cents')
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00Z`);

  const userTotal = userSpend?.reduce((sum, r) => sum + r.cost_cents, 0) || 0;

  if (userTotal >= USER_DAILY_BUDGET_CENTS) {
    return {
      allowed: false,
      reason: 'You have reached your daily usage limit. Please try again tomorrow.',
      currentSpend: userTotal,
    };
  }

  return { allowed: true, currentSpend: userTotal };
}
```

---

## Strategy 4: Reducing Token Waste

### Max Tokens Parameter

Always set `max_tokens` to limit response length:

```typescript
// Bad: no limit, model might generate 4000 tokens
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [...],
});

// Good: cap at what you actually need
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [...],
  max_tokens: 500, // Most answers fit in 500 tokens
});
```

### Stop Sequences

Use stop sequences to prevent the model from generating unnecessary content:

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [...],
  stop: ['\n\nNote:', '\n\nDisclaimer:', '---'], // Stop before boilerplate
});
```

### Structured Output for Predictable Costs

When you need structured data, use JSON mode to prevent verbose natural language:

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    {
      role: 'system',
      content: 'Extract entities from the text. Return JSON only.',
    },
    { role: 'user', content: documentText },
  ],
  response_format: { type: 'json_object' },
  max_tokens: 200,
});
```

---

## Python Cost Tracking Example

```python
# cost_tracker.py
import os
import json
from datetime import datetime, timezone
from supabase import create_client

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

# Pricing in DOLLARS per 1M tokens (unlike the TypeScript version which uses cents)
PRICING = {
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "text-embedding-3-small": {"input": 0.02, "output": 0.00},
}

def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost in dollars for a given API call."""
    prices = PRICING.get(model, {"input": 0, "output": 0})
    input_cost = (input_tokens / 1_000_000) * prices["input"]
    output_cost = (output_tokens / 1_000_000) * prices["output"]
    return input_cost + output_cost

def track_usage(user_id: str, model: str, usage: dict, endpoint: str):
    """Log API usage to the database."""
    input_tokens = usage.get("prompt_tokens", 0)
    output_tokens = usage.get("completion_tokens", 0)
    cost = calculate_cost(model, input_tokens, output_tokens)

    supabase.table("usage_logs").insert({
        "user_id": user_id,
        "model": model,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cost_cents": int(cost * 100),
        "endpoint": endpoint,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    return cost

# Usage with OpenAI
import openai
client = openai.OpenAI()

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello!"}],
    max_tokens=100,
)

cost = track_usage(
    user_id="user-123",
    model="gpt-4o-mini",
    usage=response.usage.model_dump(),
    endpoint="/api/chat",
)
print(f"This call cost ${cost:.6f}")
```

---

## Key Takeaways

- **Model selection** is the single highest-impact cost lever. GPT-4o-mini is 15-20x cheaper than GPT-4o and sufficient for most RAG workloads.
- **Prompt optimization** compounds over thousands of requests. Cutting 500 tokens from your system prompt saves real money at scale.
- **Usage monitoring** is not optional. Track every API call with model, token counts, and cost so you can identify waste and set budgets.
- **Budget guards** prevent runaway costs. Set daily limits at both the global and per-user level.
- Always set **max_tokens** to prevent unexpectedly long (and expensive) responses.
- The cost of an LLM classifier to route requests (~$0.00001/call) is negligible compared to the savings from routing simple queries to cheaper models.

---

## Try It Yourself

1. **Calculate your capstone costs**: Take the BrainBase app from Module 09 and estimate the monthly cost for 50 daily active users making 5 queries each. Calculate for both GPT-4o-mini and GPT-4o.

2. **Implement the usage tracker**: Add the `usage_logs` table to your Supabase project and integrate the `trackUsage` function into your chat API route. Monitor your own usage for a day.

3. **Optimize your system prompt**: Take the system prompt from your RAG chat and reduce it to under 200 tokens without losing response quality. Test both versions with 10 questions and compare.

4. **Build a cost dashboard**: Create a simple page in your app that queries `usage_logs` and shows daily cost charts. Use a charting library like Recharts or Chart.js.

5. **Implement model routing**: Add the `selectModel` function to your chat API. Route simple questions to GPT-4o-mini and complex analytical questions to GPT-4o. Track how often each model is used.

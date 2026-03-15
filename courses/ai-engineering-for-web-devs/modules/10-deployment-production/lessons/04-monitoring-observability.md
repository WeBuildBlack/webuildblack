---
title: "Monitoring and Observability for AI Applications"
estimatedMinutes: 75
---

## Introduction

Traditional web apps are relatively predictable: a request comes in, your code runs deterministically, and a response goes out. If something breaks, you check the logs, find the error, fix the code.

AI applications are different. The LLM is a black box that can produce different outputs for the same input, costs vary per request, quality degrades silently, and failures are often *soft* -- the app does not crash, it just gives a bad answer. You cannot debug what you cannot see.

This lesson teaches you how to build observability into your AI application so you can answer questions like:

- Why did the chatbot give a wrong answer to this user?
- Which queries are costing us the most money?
- Is our response quality getting better or worse over time?
- How long are users waiting for responses?
- Are our embeddings and retrieval actually working?

---

## What to Monitor in AI Applications

### The Three Pillars (Extended for AI)

Traditional observability has three pillars: logs, metrics, and traces. AI applications add two more:

| Pillar | Traditional | AI-Specific |
|--------|-------------|-------------|
| **Logs** | Error messages, request/response | Full prompts, completions, retrieved context |
| **Metrics** | Request count, latency, error rate | Token usage, cost, cache hit rate, similarity scores |
| **Traces** | Request lifecycle through services | Prompt chain: input -> retrieval -> augmentation -> generation |
| **Quality** | N/A | Response accuracy, groundedness, user satisfaction |
| **Cost** | Infrastructure spend | Per-request LLM cost, daily/monthly spend |

---

## Building a Logging System

### Structured LLM Logs

Every LLM call should produce a structured log entry:

```typescript
// src/lib/ai/observability/logger.ts

export interface LLMLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  sessionId: string;

  // Input
  model: string;
  systemPrompt: string;
  userMessage: string;
  retrievedChunks: {
    documentId: string;
    chunkId: string;
    similarity: number;
    contentPreview: string;
  }[];

  // Output
  response: string;
  finishReason: string;

  // Metrics
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  latencyMs: number;
  retrievalLatencyMs: number;
  generationLatencyMs: number;

  // Quality signals
  hadContext: boolean;
  topSimilarity: number;
  chunkCount: number;
  cached: boolean;
  cacheLayer?: string;

  // Safety
  inputFlagged: boolean;
  outputFlagged: boolean;
  piiDetected: boolean;
}

export async function logLLMCall(entry: LLMLogEntry): Promise<void> {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(JSON.stringify({
      level: 'info',
      type: 'llm_call',
      ...entry,
      // Truncate large fields for console readability
      systemPrompt: entry.systemPrompt.substring(0, 200) + '...',
      response: entry.response.substring(0, 200) + '...',
    }, null, 2));
  }

  // Store in database for analysis
  const supabase = createServiceClient();
  await supabase.from('llm_logs').insert({
    id: entry.id,
    user_id: entry.userId,
    session_id: entry.sessionId,
    model: entry.model,
    user_message: entry.userMessage,
    response: entry.response,
    input_tokens: entry.inputTokens,
    output_tokens: entry.outputTokens,
    cost_cents: entry.costCents,
    latency_ms: entry.latencyMs,
    retrieval_latency_ms: entry.retrievalLatencyMs,
    generation_latency_ms: entry.generationLatencyMs,
    had_context: entry.hadContext,
    top_similarity: entry.topSimilarity,
    chunk_count: entry.chunkCount,
    cached: entry.cached,
    cache_layer: entry.cacheLayer,
    finish_reason: entry.finishReason,
    created_at: entry.timestamp,
  });
}
```

### The LLM Logs Table

```sql
CREATE TABLE llm_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  model TEXT NOT NULL,
  user_message TEXT NOT NULL,
  response TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_cents FLOAT,
  latency_ms INTEGER,
  retrieval_latency_ms INTEGER,
  generation_latency_ms INTEGER,
  had_context BOOLEAN DEFAULT true,
  top_similarity FLOAT,
  chunk_count INTEGER,
  cached BOOLEAN DEFAULT false,
  cache_layer TEXT,
  finish_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_llm_logs_user_id ON llm_logs(user_id);
CREATE INDEX idx_llm_logs_created_at ON llm_logs(created_at);
CREATE INDEX idx_llm_logs_model ON llm_logs(model);
```

> **Privacy Consideration:** Storing full user messages and LLM responses raises privacy concerns, especially under GDPR/CCPA. Consider: redacting PII before logging, setting retention policies (e.g., delete logs after 30 days), and giving users the ability to request deletion of their data.

### Instrumented Chat Handler

Here is how to instrument your chat API route with timing and logging:

```typescript
// src/lib/ai/observability/instrumented-chat.ts
import { v4 as uuidv4 } from 'uuid';
import { logLLMCall, type LLMLogEntry } from './logger';
import { retrieveContext, buildRAGPrompt } from '../chat';
import { calculateCost } from '../usage-tracker';

export async function instrumentedChat(
  message: string,
  userId: string,
  sessionId: string,
  documentIds?: string[]
) {
  const logEntry: Partial<LLMLogEntry> = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    userId,
    sessionId,
    userMessage: message,
    cached: false,
  };

  const totalStart = performance.now();

  try {
    // Measure retrieval time
    const retrievalStart = performance.now();
    const context = await retrieveContext(message, documentIds);
    logEntry.retrievalLatencyMs = Math.round(performance.now() - retrievalStart);

    logEntry.hadContext = context.chunks.length > 0;
    logEntry.chunkCount = context.chunks.length;
    logEntry.topSimilarity = context.sources[0]?.similarity || 0;
    logEntry.retrievedChunks = context.sources.map(s => ({
      documentId: s.document_id,
      chunkId: '', // Would need to be passed through
      similarity: s.similarity,
      contentPreview: s.chunk_content.substring(0, 100),
    }));

    // Build prompt
    const { systemPrompt } = buildRAGPrompt(context);
    logEntry.systemPrompt = systemPrompt;
    logEntry.model = 'gpt-4o-mini';

    // Measure generation time
    const generationStart = performance.now();
    const openai = new OpenAI();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    });
    logEntry.generationLatencyMs = Math.round(performance.now() - generationStart);

    // Capture output metrics
    const completion = response.choices[0];
    logEntry.response = completion.message.content || '';
    logEntry.finishReason = completion.finish_reason;
    logEntry.inputTokens = response.usage?.prompt_tokens || 0;
    logEntry.outputTokens = response.usage?.completion_tokens || 0;
    logEntry.costCents = calculateCost(
      'gpt-4o-mini',
      logEntry.inputTokens,
      logEntry.outputTokens
    );

    logEntry.latencyMs = Math.round(performance.now() - totalStart);

    // Log the complete entry
    await logLLMCall(logEntry as LLMLogEntry);

    return {
      response: logEntry.response,
      sources: context.sources,
      metadata: {
        logId: logEntry.id,
        latencyMs: logEntry.latencyMs,
        cached: false,
      },
    };
  } catch (error) {
    logEntry.latencyMs = Math.round(performance.now() - totalStart);
    logEntry.response = `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`;
    logEntry.finishReason = 'error';

    await logLLMCall(logEntry as LLMLogEntry);
    throw error;
  }
}
```

> **Storage Planning:** At 1,000 requests/day with ~2KB per log entry, you'll accumulate ~60MB/month of log data. Set up log rotation or archival policies. Consider sampling (log every Nth request) for high-traffic applications.

---

## Metrics and Dashboards

### Key Metrics to Track

```sql
-- 1. Average latency breakdown (last 24 hours)
SELECT
  AVG(latency_ms) AS avg_total_ms,
  AVG(retrieval_latency_ms) AS avg_retrieval_ms,
  AVG(generation_latency_ms) AS avg_generation_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_total_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms) AS p99_total_ms
FROM llm_logs
WHERE created_at > NOW() - INTERVAL '24 hours';

-- 2. Cost breakdown by model (last 30 days)
SELECT
  model,
  COUNT(*) AS request_count,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  SUM(cost_cents) / 100.0 AS total_cost_dollars,
  AVG(cost_cents) / 100.0 AS avg_cost_per_request
FROM llm_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY model
ORDER BY total_cost_dollars DESC;

-- 3. Retrieval quality metrics
SELECT
  DATE(created_at) AS day,
  AVG(top_similarity) AS avg_top_similarity,
  AVG(chunk_count) AS avg_chunks_retrieved,
  COUNT(*) FILTER (WHERE had_context = false) AS no_context_count,
  COUNT(*) AS total_requests,
  ROUND(
    COUNT(*) FILTER (WHERE had_context = false)::numeric / COUNT(*)::numeric * 100, 1
  ) AS no_context_pct
FROM llm_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY day DESC;

-- 4. Cache effectiveness
SELECT
  DATE(created_at) AS day,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE cached = true) AS cache_hits,
  ROUND(
    COUNT(*) FILTER (WHERE cached = true)::numeric / COUNT(*)::numeric * 100, 1
  ) AS hit_rate_pct,
  SUM(cost_cents) FILTER (WHERE cached = false) / 100.0 AS actual_cost,
  SUM(cost_cents) / 100.0 AS cost_if_no_cache
FROM llm_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY day DESC;

-- 5. Error rate and types
SELECT
  DATE(created_at) AS day,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE finish_reason = 'error') AS errors,
  COUNT(*) FILTER (WHERE finish_reason = 'length') AS truncated,
  ROUND(
    COUNT(*) FILTER (WHERE finish_reason = 'error')::numeric / COUNT(*)::numeric * 100, 1
  ) AS error_rate_pct
FROM llm_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY day DESC;
```

### Building a Metrics API

```typescript
// src/app/api/admin/metrics/route.ts
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServiceClient();

  // Fetch key metrics in parallel
  const [latency, costs, quality, errors] = await Promise.all([
    // Average latency (last 24h)
    supabase.rpc('get_latency_metrics'),

    // Cost summary (last 30d)
    supabase.rpc('get_cost_metrics'),

    // Retrieval quality (last 7d)
    supabase.rpc('get_quality_metrics'),

    // Error rates (last 7d)
    supabase.rpc('get_error_metrics'),
  ]);

  return NextResponse.json({
    latency: latency.data,
    costs: costs.data,
    quality: quality.data,
    errors: errors.data,
    generatedAt: new Date().toISOString(),
  });
}
```

---

## Tools for AI Observability

### Langfuse (Open Source)

Langfuse is an open-source observability platform specifically designed for LLM applications. It captures traces, scores, and costs automatically.

```typescript
// src/lib/ai/observability/langfuse.ts
import { Langfuse } from 'langfuse';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
});

export async function tracedChat(
  message: string,
  userId: string,
  documentIds?: string[]
) {
  // Create a trace for this interaction
  const trace = langfuse.trace({
    name: 'rag-chat',
    userId,
    metadata: { documentIds },
  });

  // Span for retrieval
  const retrievalSpan = trace.span({
    name: 'retrieval',
    input: { query: message },
  });

  const context = await retrieveContext(message, documentIds);

  retrievalSpan.end({
    output: {
      chunkCount: context.chunks.length,
      topSimilarity: context.sources[0]?.similarity,
    },
  });

  // Span for prompt building
  const promptSpan = trace.span({ name: 'prompt-building' });
  const { systemPrompt } = buildRAGPrompt(context);
  promptSpan.end({ output: { promptLength: systemPrompt.length } });

  // Generation span (Langfuse tracks token usage automatically)
  const generation = trace.generation({
    name: 'chat-completion',
    model: 'gpt-4o-mini',
    input: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ],
  });

  const openai = new OpenAI();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ],
  });

  const result = response.choices[0].message.content || '';

  generation.end({
    output: result,
    usage: {
      input: response.usage?.prompt_tokens,
      output: response.usage?.completion_tokens,
    },
  });

  // Score the trace (optional -- can be done later by humans or automated evals)
  trace.score({
    name: 'has-context',
    value: context.chunks.length > 0 ? 1 : 0,
  });

  // Flush events (important in serverless)
  await langfuse.flushAsync();

  return { response: result, sources: context.sources, traceId: trace.id };
}
```

### Helicone (Proxy-Based)

Helicone sits as a proxy between your app and the LLM API, capturing all requests automatically with zero code changes:

```typescript
// Just change the base URL -- that's it
const openai = new OpenAI({
  baseURL: 'https://oai.helicone.ai/v1',
  defaultHeaders: {
    'Helicone-Auth': `Bearer ${process.env.HELICONE_API_KEY}`,
    'Helicone-User-Id': userId, // Track per-user metrics
  },
});

// All your existing code works unchanged
// Helicone captures: tokens, cost, latency, prompts, completions
```

### Python with Langfuse

```python
# langfuse_tracing.py
from langfuse import Langfuse
from langfuse.decorators import observe, langfuse_context
import openai

langfuse = Langfuse()
client = openai.OpenAI()

@observe(as_type="generation")
def generate_response(system_prompt: str, user_message: str):
    """LLM call with automatic Langfuse tracing."""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    )

    result = response.choices[0].message.content

    # Langfuse automatically captures tokens and cost
    langfuse_context.update_current_observation(
        usage={
            "input": response.usage.prompt_tokens,
            "output": response.usage.completion_tokens,
        }
    )

    return result

@observe()
def rag_chat(query: str, document_ids: list[str] | None = None):
    """Full RAG pipeline with tracing."""

    # Retrieval (automatically traced as a span)
    chunks, sources = retrieve_context(query, document_ids)

    # Build prompt
    system_prompt = build_rag_prompt(sources)

    # Generate (automatically traced as a generation)
    response = generate_response(system_prompt, query)

    # Score the interaction
    langfuse_context.score_current_trace(
        name="has_context",
        value=1 if chunks else 0,
    )

    return response, sources

# Usage
response, sources = rag_chat("What is retrieval-augmented generation?")
langfuse.flush()
```

---

## Quality Monitoring

### Automated Quality Scoring

Use an LLM to evaluate its own responses (LLM-as-judge):

```typescript
// src/lib/ai/observability/quality-scorer.ts
import OpenAI from 'openai';

const openai = new OpenAI();

interface QualityScore {
  groundedness: number;   // 1-5: Is the answer based on the provided context?
  relevance: number;      // 1-5: Does the answer address the question?
  completeness: number;   // 1-5: Does the answer fully cover the topic?
  overall: number;        // Average of the above
}

export async function scoreResponse(
  question: string,
  answer: string,
  context: string
): Promise<QualityScore> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an AI quality evaluator. Score the following answer on three criteria, each from 1 (worst) to 5 (best):

1. GROUNDEDNESS: Is the answer based on the provided context? (1 = fabricated, 5 = fully grounded)
2. RELEVANCE: Does the answer address the question asked? (1 = off-topic, 5 = directly answers)
3. COMPLETENESS: Does the answer fully cover the topic given the context? (1 = incomplete, 5 = thorough)

Respond with JSON only: {"groundedness": N, "relevance": N, "completeness": N}`,
      },
      {
        role: 'user',
        content: `CONTEXT:\n${context}\n\nQUESTION: ${question}\n\nANSWER: ${answer}`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 50,
    temperature: 0,
  });

  try {
    const scores = JSON.parse(response.choices[0].message.content || '{}');
    return {
      groundedness: scores.groundedness || 3,
      relevance: scores.relevance || 3,
      completeness: scores.completeness || 3,
      overall: (
        (scores.groundedness || 3) +
        (scores.relevance || 3) +
        (scores.completeness || 3)
      ) / 3,
    };
  } catch {
    return { groundedness: 3, relevance: 3, completeness: 3, overall: 3 };
  }
}
```

### User Feedback Collection

The most reliable quality signal comes from users:

```tsx
// src/components/chat/FeedbackButtons.tsx
'use client';

import { useState } from 'react';

interface FeedbackButtonsProps {
  messageId: string;
  onFeedback: (messageId: string, rating: 'positive' | 'negative', comment?: string) => void;
}

export function FeedbackButtons({ messageId, onFeedback }: FeedbackButtonsProps) {
  const [submitted, setSubmitted] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');

  const handleFeedback = (rating: 'positive' | 'negative') => {
    if (rating === 'negative') {
      setShowComment(true);
    } else {
      onFeedback(messageId, rating);
      setSubmitted(true);
    }
  };

  const submitNegative = () => {
    onFeedback(messageId, 'negative', comment);
    setSubmitted(true);
    setShowComment(false);
  };

  if (submitted) {
    return <p className="text-xs text-gray-400 mt-1">Thanks for the feedback!</p>;
  }

  return (
    <div className="mt-2">
      <div className="flex gap-2">
        <button
          onClick={() => handleFeedback('positive')}
          className="text-xs text-gray-400 hover:text-green-600 transition-colors"
          aria-label="Good response"
        >
          Thumbs up
        </button>
        <button
          onClick={() => handleFeedback('negative')}
          className="text-xs text-gray-400 hover:text-red-600 transition-colors"
          aria-label="Bad response"
        >
          Thumbs down
        </button>
      </div>

      {showComment && (
        <div className="mt-2 flex gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What was wrong?"
            className="text-xs border rounded px-2 py-1 flex-1"
          />
          <button
            onClick={submitNegative}
            className="text-xs bg-gray-200 rounded px-2 py-1 hover:bg-gray-300"
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Alerting

### Setting Up Alerts

```typescript
// src/lib/ai/observability/alerts.ts

interface AlertRule {
  name: string;
  condition: (metrics: any) => boolean;
  message: (metrics: any) => string;
  severity: 'info' | 'warning' | 'critical';
}

const ALERT_RULES: AlertRule[] = [
  {
    name: 'high-error-rate',
    condition: (m) => m.errorRate > 0.05, // > 5% errors
    message: (m) => `Error rate is ${(m.errorRate * 100).toFixed(1)}% (threshold: 5%)`,
    severity: 'critical',
  },
  {
    name: 'high-latency',
    condition: (m) => m.p95Latency > 10000, // > 10 seconds
    message: (m) => `P95 latency is ${m.p95Latency}ms (threshold: 10000ms)`,
    severity: 'warning',
  },
  {
    name: 'budget-threshold',
    condition: (m) => m.dailyCost > 4.00, // > $4/day
    message: (m) => `Daily cost is $${m.dailyCost.toFixed(2)} (budget: $5.00)`,
    severity: 'warning',
  },
  {
    name: 'low-retrieval-quality',
    condition: (m) => m.avgTopSimilarity < 0.75,
    message: (m) => `Average top similarity is ${m.avgTopSimilarity.toFixed(2)} (threshold: 0.75)`,
    severity: 'info',
  },
  {
    name: 'high-no-context-rate',
    condition: (m) => m.noContextRate > 0.3, // > 30% queries with no context
    message: (m) => `${(m.noContextRate * 100).toFixed(0)}% of queries found no relevant context`,
    severity: 'warning',
  },
];

export async function checkAlerts(metrics: any): Promise<void> {
  for (const rule of ALERT_RULES) {
    if (rule.condition(metrics)) {
      const alertMessage = `[${rule.severity.toUpperCase()}] ${rule.name}: ${rule.message(metrics)}`;
      console.warn(alertMessage);

      // In production, send to Slack, PagerDuty, email, etc.
      // await sendSlackAlert(alertMessage, rule.severity);
    }
  }
}
```

---

## Key Takeaways

- **Log everything**: Every LLM call should capture the full prompt, response, token usage, cost, and latency. You will need this data when debugging quality issues.
- **Break down latency**: Measure retrieval time and generation time separately. This tells you whether slow responses are a database problem or an LLM problem.
- **Quality monitoring** requires both automated scoring (LLM-as-judge) and user feedback (thumbs up/down). Neither is sufficient alone.
- **Tools like Langfuse and Helicone** dramatically reduce the effort needed to build observability. Langfuse is open source and free to self-host. Helicone requires only a URL change.
- **Alerting** catches problems before users complain. Set thresholds for error rates, latency, cost, and retrieval quality.
- The cost of observability (extra LLM calls for quality scoring, database storage for logs) is small compared to the cost of deploying a broken AI feature.

---

## Try It Yourself

1. **Instrument your chat API**: Add the `logLLMCall` function to your BrainBase app. Make 10 queries and then query the `llm_logs` table to see the data.

2. **Set up Langfuse**: Create a free account at [langfuse.com](https://langfuse.com) and integrate the tracing SDK. Send a few traced requests and explore the Langfuse dashboard.

3. **Build a metrics dashboard**: Create an admin page at `/admin/metrics` that shows daily request counts, average latency, total cost, and cache hit rates using the SQL queries from this lesson.

4. **Implement quality scoring**: Add automated quality scoring (groundedness, relevance, completeness) as a background task. Run it on a sample of responses (e.g., every 10th request) to keep costs low.

5. **Add user feedback**: Implement the thumbs up/down buttons on assistant messages. Store feedback in a `feedback` table linked to the `llm_logs` entry. After collecting 50 feedback items, analyze the correlation between automated quality scores and user satisfaction.

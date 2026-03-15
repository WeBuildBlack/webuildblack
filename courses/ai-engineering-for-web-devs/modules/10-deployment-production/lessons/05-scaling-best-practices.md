---
title: "Scaling and Best Practices for AI Features"
estimatedMinutes: 75
---

## Introduction

Your AI feature works. It is deployed, monitored, cached, and secured. Now users start showing up. Ten users become a hundred. A hundred become a thousand. And then you hit your first real scaling problem: rate limits.

LLM APIs are not like traditional APIs. They are slow (1-10 seconds per request), expensive (per token), and heavily rate-limited (especially on free and lower-tier plans). Scaling an AI application requires a fundamentally different approach than scaling a traditional web app where you can just throw more servers at the problem.

This lesson covers the patterns and practices you need to handle real-world scale:

1. **Rate limiting** -- protecting yourself from LLM API limits
2. **Queue-based processing** -- handling bursts without dropping requests
3. **Fallback models** -- graceful degradation when your primary model is unavailable
4. **Load testing** -- finding your breaking points before your users do
5. **Architecture patterns** -- designing for scale from the start

---

## Understanding LLM Rate Limits

### Provider Rate Limits

Every LLM provider has rate limits that restrict how many requests and tokens you can use per minute:

| Provider | Tier | Requests/min | Tokens/min |
|----------|------|-------------|------------|
| OpenAI | Free | 3 | 40,000 |
| OpenAI | Tier 1 ($5+) | 60 | 200,000 |
| OpenAI | Tier 2 ($50+) | 500 | 2,000,000 |
| OpenAI | Tier 3 ($100+) | 5,000 | 10,000,000 |
| Anthropic | Build (free) | 5 | 20,000 |
| Anthropic | Build ($5+) | 50 | 40,000 |
| Anthropic | Scale | 1,000+ | Custom |

**Critical insight**: A single user's conversation can consume 4,000+ tokens per request. With the free tier's 40,000 token/min limit, you can serve at most 10 concurrent users before hitting rate limits.

### Building a Rate Limiter for Outbound API Calls

This is different from rate limiting your users (which you built in Module 09). This rate limiter controls how fast *your server* calls the LLM API:

```typescript
// src/lib/ai/scaling/api-rate-limiter.ts

class TokenBucketRateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number; // tokens per ms
  private lastRefill: number;
  private queue: Array<{
    resolve: (value: void) => void;
    tokens: number;
  }> = [];

  constructor(maxTokensPerMinute: number) {
    this.maxTokens = maxTokensPerMinute;
    this.tokens = maxTokensPerMinute;
    this.refillRate = maxTokensPerMinute / 60_000; // per ms
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  async acquire(estimatedTokens: number): Promise<void> {
    this.refill();

    if (this.tokens >= estimatedTokens) {
      this.tokens -= estimatedTokens;
      return;
    }

    // Wait until enough tokens are available
    return new Promise((resolve) => {
      this.queue.push({ resolve, tokens: estimatedTokens });
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.queue.length === 0) return;

    const waitTime = Math.ceil(
      (this.queue[0].tokens - this.tokens) / this.refillRate
    );

    setTimeout(() => {
      this.refill();
      while (this.queue.length > 0 && this.tokens >= this.queue[0].tokens) {
        const item = this.queue.shift()!;
        this.tokens -= item.tokens;
        item.resolve();
      }
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }, Math.max(waitTime, 100));
  }
}

// Create rate limiters for different API endpoints
export const chatRateLimiter = new TokenBucketRateLimiter(180_000); // 180K tokens/min
export const embeddingRateLimiter = new TokenBucketRateLimiter(1_000_000); // 1M tokens/min

// Usage in API route:
// await chatRateLimiter.acquire(estimatedTokens);
// const response = await openai.chat.completions.create(...);
```

### Handling 429 Errors with Exponential Backoff

When you do hit rate limits, retry with backoff:

```typescript
// src/lib/ai/scaling/retry.ts

interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30_000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Only retry on rate limit (429) or server errors (5xx)
      const status = error?.status || error?.response?.status;
      if (status && status !== 429 && status < 500) {
        throw error; // Don't retry client errors
      }

      if (attempt === maxRetries) break;

      // Calculate delay with jitter
      const baseDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt);
      const jitter = Math.random() * baseDelay * 0.1; // 10% jitter
      const delay = Math.min(baseDelay + jitter, maxDelayMs);

      // Check for Retry-After header
      const retryAfter = error?.headers?.get?.('retry-after');
      const retryDelay = retryAfter
        ? parseInt(retryAfter) * 1000
        : delay;

      console.warn(
        `API call failed (attempt ${attempt + 1}/${maxRetries + 1}). ` +
        `Retrying in ${Math.round(retryDelay)}ms. Error: ${error.message}`
      );

      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw lastError || new Error('All retries failed');
}

// Usage:
const response = await withRetry(
  () => openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [...],
  }),
  { maxRetries: 3, initialDelayMs: 1000 }
);
```

### Python Retry with Backoff

```python
# retry.py
import time
import random
from functools import wraps
from typing import TypeVar, Callable

T = TypeVar("T")

def with_retry(
    max_retries: int = 3,
    initial_delay: float = 1.0,
    max_delay: float = 30.0,
    backoff_multiplier: float = 2.0,
):
    """Decorator for retrying API calls with exponential backoff."""

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            last_error = None

            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    status = getattr(e, "status_code", None) or getattr(e, "status", None)

                    # Only retry on 429 or 5xx
                    if status and status != 429 and status < 500:
                        raise

                    if attempt == max_retries:
                        break

                    delay = min(
                        initial_delay * (backoff_multiplier ** attempt),
                        max_delay
                    )
                    jitter = random.uniform(0, delay * 0.1)
                    total_delay = delay + jitter

                    print(f"Attempt {attempt + 1} failed: {e}. Retrying in {total_delay:.1f}s")
                    time.sleep(total_delay)

            raise last_error or Exception("All retries failed")

        return wrapper
    return decorator

# Usage
@with_retry(max_retries=3, initial_delay=1.0)
def call_openai(messages: list) -> str:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
    )
    return response.choices[0].message.content
```

---

## Queue-Based Processing

For workloads that can tolerate slight delays (like document ingestion, batch analysis, or email generation), use a queue to smooth out traffic spikes.

### Simple Queue with Database

```typescript
// src/lib/ai/scaling/job-queue.ts
import { createServiceClient } from '@/lib/supabase/server';

interface Job {
  id: string;
  type: string;
  payload: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: string;
  processedAt?: string;
}

export async function enqueueJob(type: string, payload: any): Promise<string> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('job_queue')
    .insert({
      type,
      payload,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to enqueue job: ${error.message}`);
  return data.id;
}

export async function processNextJob(): Promise<Job | null> {
  const supabase = createServiceClient();

  // Claim the next pending job (atomic operation)
  const { data: job, error } = await supabase
    .from('job_queue')
    .update({ status: 'processing', processed_at: new Date().toISOString() })
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .select()
    .single();

  if (error || !job) return null;

  try {
    // Process based on job type
    let result;

    switch (job.type) {
      case 'ingest-document':
        result = await processIngestion(job.payload);
        break;
      case 'batch-embed':
        result = await processBatchEmbedding(job.payload);
        break;
      case 'generate-summary':
        result = await processGenerateSummary(job.payload);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    // Mark as completed
    await supabase
      .from('job_queue')
      .update({ status: 'completed', result })
      .eq('id', job.id);

    return { ...job, status: 'completed', result };
  } catch (err) {
    // Mark as failed
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    await supabase
      .from('job_queue')
      .update({ status: 'failed', error: errorMessage })
      .eq('id', job.id);

    return { ...job, status: 'failed', error: errorMessage };
  }
}

// Worker loop (run on a background process or cron)
export async function startWorker(
  concurrency: number = 2,
  pollIntervalMs: number = 1000
): Promise<void> {
  console.log(`Queue worker started (concurrency: ${concurrency})`);

  // > **Serverless Limitation:** This `while (true)` worker pattern requires a
  // > long-running process (a VM, Railway, Render, etc.) -- it won't work in
  // > serverless environments like Vercel where functions have execution time
  // > limits. For serverless, use a cron-triggered function that processes a
  // > batch of jobs on each invocation.

  const activeJobs = new Set<Promise<any>>();

  while (true) {
    // Fill up to concurrency limit
    while (activeJobs.size < concurrency) {
      const jobPromise = processNextJob().then((job) => {
        activeJobs.delete(jobPromise);
        if (job) {
          console.log(`Job ${job.id} (${job.type}): ${job.status}`);
        }
      });
      activeJobs.add(jobPromise);
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}
```

### The Job Queue Table

```sql
CREATE TABLE job_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_job_queue_status ON job_queue(status, created_at);
```

### Using the Queue for Document Ingestion

Instead of processing documents synchronously in the API route (which might time out), enqueue the work:

```typescript
// Updated /api/ingest/route.ts
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const userId = formData.get('userId') as string;

  // Quick validation (keep this synchronous)
  if (!file || file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
  }

  // Store the file temporarily and enqueue processing
  const fileBuffer = Buffer.from(await file.arrayBuffer()).toString('base64');

  const jobId = await enqueueJob('ingest-document', {
    fileName: file.name,
    fileType: file.type,
    fileData: fileBuffer, // Base64 encoded
    userId,
  });

  // Return immediately with the job ID
  return NextResponse.json({
    jobId,
    status: 'queued',
    message: 'Document is being processed. Check status at /api/jobs/' + jobId,
  });
}
```

---

## Fallback Models

What happens when your primary LLM provider goes down? Or when you hit rate limits? You need fallback models.

### Multi-Provider Fallback

```typescript
// src/lib/ai/scaling/fallback.ts
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

interface ModelProvider {
  name: string;
  call: (messages: { role: string; content: string }[]) => Promise<string>;
  priority: number;
  healthy: boolean;
  lastError?: Date;
}

const openai = new OpenAI();
const anthropic = new Anthropic();

const providers: ModelProvider[] = [
  {
    name: 'openai-gpt4o-mini',
    priority: 1,
    healthy: true,
    call: async (messages) => {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages as any,
      });
      return response.choices[0].message.content || '';
    },
  },
  {
    name: 'anthropic-haiku',
    priority: 2,
    healthy: true,
    call: async (messages) => {
      const systemMsg = messages.find(m => m.role === 'system')?.content || '';
      const userMsgs = messages.filter(m => m.role !== 'system');

      // > **Tip:** In production, pin model versions (e.g.,
      // > `claude-haiku-4-20250514`) instead of using `-latest` aliases. This
      // > prevents unexpected behavior changes when new model versions are
      // > released.
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-20250514',
        max_tokens: 1024,
        system: systemMsg,
        messages: userMsgs as any,
      });

      return response.content[0].type === 'text' ? response.content[0].text : '';
    },
  },
  {
    name: 'openai-gpt4o',
    priority: 3, // Expensive fallback, last resort
    healthy: true,
    call: async (messages) => {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: messages as any,
      });
      return response.choices[0].message.content || '';
    },
  },
];

const HEALTH_CHECK_INTERVAL = 60_000; // Re-check unhealthy providers every 60s

export async function callWithFallback(
  messages: { role: string; content: string }[]
): Promise<{ response: string; provider: string }> {
  // Sort by priority, healthy providers first
  const sorted = [...providers]
    .filter(p => p.healthy || (p.lastError && Date.now() - p.lastError.getTime() > HEALTH_CHECK_INTERVAL))
    .sort((a, b) => a.priority - b.priority);

  for (const provider of sorted) {
    try {
      const response = await withRetry(
        () => provider.call(messages),
        { maxRetries: 1, initialDelayMs: 500 }
      );

      // Mark as healthy if it was previously unhealthy
      provider.healthy = true;

      return { response, provider: provider.name };
    } catch (error) {
      console.error(`Provider ${provider.name} failed:`, error);
      provider.healthy = false;
      provider.lastError = new Date();
      // Continue to next provider
    }
  }

  throw new Error('All LLM providers failed. Please try again later.');
}
```

### Python Fallback

```python
# fallback.py
import openai
import anthropic
from typing import Optional

openai_client = openai.OpenAI()
anthropic_client = anthropic.Anthropic()

PROVIDERS = [
    {
        "name": "openai-gpt4o-mini",
        "priority": 1,
        "healthy": True,
    },
    {
        "name": "anthropic-haiku",
        "priority": 2,
        "healthy": True,
    },
]

def call_provider(provider_name: str, messages: list[dict]) -> str:
    if provider_name == "openai-gpt4o-mini":
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
        )
        return response.choices[0].message.content

    elif provider_name == "anthropic-haiku":
        system_msg = next((m["content"] for m in messages if m["role"] == "system"), "")
        user_msgs = [m for m in messages if m["role"] != "system"]

        response = anthropic_client.messages.create(
            model="claude-haiku-4-20250514",
            max_tokens=1024,
            system=system_msg,
            messages=user_msgs,
        )
        return response.content[0].text

    raise ValueError(f"Unknown provider: {provider_name}")

def call_with_fallback(messages: list[dict]) -> tuple[str, str]:
    """Try each provider in order until one succeeds."""
    errors = []

    for provider in sorted(PROVIDERS, key=lambda p: p["priority"]):
        if not provider["healthy"]:
            continue

        try:
            response = call_provider(provider["name"], messages)
            return response, provider["name"]
        except Exception as e:
            errors.append(f"{provider['name']}: {e}")
            provider["healthy"] = False

    raise Exception(f"All providers failed: {'; '.join(errors)}")
```

---

## Load Testing AI Features

### Load Testing Strategy

AI features have unique load testing requirements:

1. **Token-aware**: Each request consumes different amounts of tokens
2. **Latency-sensitive**: 2-10 second response times are normal
3. **Rate-limit aware**: You will hit provider limits before infrastructure limits
4. **Cost-aware**: A load test can easily cost $50+ in API calls

### Load Test Script

```typescript
// scripts/load-test.ts
interface LoadTestConfig {
  baseUrl: string;
  concurrentUsers: number;
  requestsPerUser: number;
  delayBetweenRequestsMs: number;
  testQueries: string[];
}

interface LoadTestResult {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  requestsPerSecond: number;
  errors: Record<string, number>;
}

async function runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
  const latencies: number[] = [];
  const errors: Record<string, number> = {};
  let successCount = 0;
  let failureCount = 0;

  const startTime = Date.now();

  // Simulate concurrent users
  const userPromises = Array.from(
    { length: config.concurrentUsers },
    async (_, userIndex) => {
      for (let i = 0; i < config.requestsPerUser; i++) {
        const query = config.testQueries[
          Math.floor(Math.random() * config.testQueries.length)
        ];

        const requestStart = Date.now();

        try {
          const response = await fetch(`${config.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: query,
              userId: `load-test-user-${userIndex}`,
            }),
          });

          if (!response.ok) {
            const errorType = `HTTP ${response.status}`;
            errors[errorType] = (errors[errorType] || 0) + 1;
            failureCount++;
          } else {
            successCount++;
          }
        } catch (err: any) {
          const errorType = err.code || err.message || 'Unknown';
          errors[errorType] = (errors[errorType] || 0) + 1;
          failureCount++;
        }

        latencies.push(Date.now() - requestStart);

        // Delay between requests
        if (config.delayBetweenRequestsMs > 0) {
          await new Promise(r =>
            setTimeout(r, config.delayBetweenRequestsMs)
          );
        }
      }
    }
  );

  await Promise.all(userPromises);

  const totalTime = Date.now() - startTime;
  const sortedLatencies = latencies.sort((a, b) => a - b);

  return {
    totalRequests: latencies.length,
    successCount,
    failureCount,
    avgLatencyMs: Math.round(
      latencies.reduce((a, b) => a + b, 0) / latencies.length
    ),
    p50LatencyMs: sortedLatencies[Math.floor(sortedLatencies.length * 0.5)],
    p95LatencyMs: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)],
    p99LatencyMs: sortedLatencies[Math.floor(sortedLatencies.length * 0.99)],
    requestsPerSecond: latencies.length / (totalTime / 1000),
    errors,
  };
}

// Run the test
const results = await runLoadTest({
  baseUrl: 'http://localhost:3000',
  concurrentUsers: 5,
  requestsPerUser: 10,
  delayBetweenRequestsMs: 2000, // 2s between requests per user
  testQueries: [
    'What is machine learning?',
    'Explain the transformer architecture',
    'How does RAG work?',
    'What are embeddings used for?',
    'Compare GPT-4 and Claude',
  ],
});

console.log('Load Test Results:');
console.log(`Total requests: ${results.totalRequests}`);
console.log(`Success: ${results.successCount}, Failed: ${results.failureCount}`);
console.log(`Avg latency: ${results.avgLatencyMs}ms`);
console.log(`P50: ${results.p50LatencyMs}ms, P95: ${results.p95LatencyMs}ms, P99: ${results.p99LatencyMs}ms`);
console.log(`Throughput: ${results.requestsPerSecond.toFixed(2)} req/s`);
console.log('Errors:', results.errors);
```

### Load Testing Tips

1. **Start small**: Begin with 2 concurrent users and 5 requests each. Increase gradually.
2. **Use canned responses**: For testing infrastructure (not LLM quality), mock the LLM call to avoid API costs.
3. **Test with realistic queries**: Use actual user queries from your logs, not synthetic ones.
4. **Monitor during the test**: Watch your Langfuse/Helicone dashboard, Supabase metrics, and Vercel function logs simultaneously.
5. **Budget your test**: Calculate the cost before running. 50 requests at $0.001 each = $0.05. 5,000 requests = $5.

---

## Architecture Patterns for Scale

### Pattern 1: Separate Ingestion and Query Paths

```
                        ┌─────────────────┐
Upload ──> [API Route] ──> Job Queue ──> │  Worker Process  │ ──> pgvector
                                         │  (background)    │
                                         └─────────────────┘

                        ┌─────────────────┐
Query ──> [API Route] ──> Cache Check ──> │  LLM + Retrieval │ ──> Stream
                                          │  (real-time)     │
                                          └─────────────────┘
```

Ingestion is async (queued). Queries are synchronous (streaming). Different scaling requirements, different infrastructure.

### Pattern 2: Edge-First Architecture

```
User Request
     |
  [Edge Function]  ──> Cache check (KV store at edge)
     |                       |
     |               (cache hit) ──> Return immediately
     |
  (cache miss)
     |
  [Serverless Function]  ──> pgvector query ──> LLM call ──> Stream response
     |
  Cache the result at edge
```

Vercel Edge Functions run closer to the user, reducing latency for cached responses.

### Pattern 3: Pre-Computation

For predictable queries (like document summaries), compute answers ahead of time:

```typescript
// When a document is ingested, pre-generate common answers
async function preComputeResponses(documentId: string): Promise<void> {
  const standardQuestions = [
    'Summarize this document in 3 sentences.',
    'What are the key topics covered?',
    'List the main conclusions or recommendations.',
  ];

  for (const question of standardQuestions) {
    const response = await generateChatResponse(question, [documentId]);
    await setCachedResponse(question, response.text, response.sources, [documentId], 86400);
  }

  console.log(`Pre-computed ${standardQuestions.length} responses for document ${documentId}`);
}
```

---

## Production Checklist

Before you ship your AI feature to real users, run through this checklist:

### Infrastructure

```
[ ] Rate limiting on user-facing endpoints (per-user and global)
[ ] Rate limiting on outbound LLM API calls (token bucket)
[ ] Retry logic with exponential backoff for all API calls
[ ] Fallback models configured (at least 2 providers)
[ ] Queue-based processing for heavy workloads (ingestion)
[ ] Request timeouts set appropriately (30s for chat, 60s for ingestion)
```

### Cost Control

```
[ ] Usage tracking on every LLM call (model, tokens, cost)
[ ] Daily budget limits (global and per-user)
[ ] Model routing for cost optimization
[ ] Caching strategy implemented (at least exact match)
[ ] max_tokens set on all LLM calls
[ ] Prompt length optimized and monitored
```

### Safety

```
[ ] Input validation (length, content type, sanitization)
[ ] Content moderation (OpenAI Moderation API or equivalent)
[ ] Prompt injection detection
[ ] Output validation (system prompt leakage, PII)
[ ] PII detection and redaction on inputs and outputs
```

### Observability

```
[ ] Structured logging on every LLM call
[ ] Latency tracking (retrieval + generation breakdown)
[ ] Quality scoring (automated and/or user feedback)
[ ] Alerting for error rates, latency, and cost thresholds
[ ] Dashboard for daily metrics review
```

### User Experience

```
[ ] Loading/thinking states during LLM processing
[ ] Streaming responses (not waiting for full completion)
[ ] Error messages that are helpful, not technical
[ ] Graceful degradation when LLM is unavailable
[ ] Source citations on RAG responses
[ ] Conversation history persistence
```

---

## Key Takeaways

- **LLM rate limits are your primary scaling bottleneck**, not CPU or memory. Build token-aware rate limiters and respect provider limits.
- **Exponential backoff with jitter** is essential for handling 429 errors. Always check the `Retry-After` header.
- **Queue-based processing** decouples time-consuming work (document ingestion) from real-time interactions (chat), allowing each to scale independently.
- **Fallback models** across providers (OpenAI + Anthropic) ensure your app stays available even when one provider has issues.
- **Load testing** AI features requires cost-awareness. Budget your tests, start small, and use mock LLM responses for infrastructure testing.
- **Pre-computation** for predictable queries (document summaries, common questions) eliminates latency and cost for the most common use cases.
- The **production checklist** covers infrastructure, cost, safety, observability, and UX. Skip none of them.

---

## Try It Yourself

1. **Implement retry with backoff**: Add the `withRetry` wrapper to all OpenAI API calls in your BrainBase app. Test it by temporarily setting an invalid API key and verifying that retries happen with appropriate delays.

2. **Build the fallback system**: Sign up for both OpenAI and Anthropic free tiers. Implement `callWithFallback` so that if OpenAI fails, your app automatically falls back to Claude. Test by disabling your OpenAI API key.

3. **Run a load test**: Use the load test script to test your deployed app with 3 concurrent users making 5 requests each. Analyze the results -- what is your P95 latency? At what concurrency do you start getting rate limit errors?

4. **Set up queue-based ingestion**: Refactor your document ingestion to use the job queue pattern. Upload a document and verify it gets processed asynchronously. Add a "Processing..." status page that the user can check.

5. **Build a health check endpoint**: Create `/api/health` that checks connectivity to Supabase, OpenAI, and Anthropic. Use this for monitoring. If any provider is down, the health check should report it but the app should keep working via fallback.

6. **Complete the production checklist**: Go through every item in the production checklist above and check off what you have implemented. For anything missing, create a plan to add it. This is the difference between a project and a product.

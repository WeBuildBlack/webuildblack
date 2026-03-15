---
title: "Error Handling & Resilience for AI Features"
estimatedMinutes: 65
---

## Error Handling & Resilience for AI Features

Your AI feature works perfectly in development. You demo it to your team and it's flawless. Then you deploy it and within 24 hours you've hit a rate limit, a timeout, and a 500 error from the LLM provider, and your users saw a blank screen for each one.

AI API calls fail differently than typical web requests. They're slower (so timeouts hit more often), more expensive (so retries need to be smart), and the error messages are often cryptic. This lesson covers how to handle every failure mode gracefully.

---

## The Error Landscape: What Can Go Wrong

Here's every way an LLM API call can fail, ranked by how often you'll see each one:

| Error | HTTP Status | Frequency | Cause |
|-------|-------------|-----------|-------|
| Rate limit exceeded | 429 | Very common | Too many requests per minute |
| Request timeout | 408 / none | Common | Response took too long to generate |
| Server error | 500 | Occasional | Provider infrastructure issue |
| Invalid request | 400 | During development | Bad parameters, too many tokens |
| Authentication failure | 401 | Rare (after setup) | Expired or invalid API key |
| Context length exceeded | 400 | Common at scale | Conversation too long for model |
| Content filtered | 400 | Occasional | Content policy violation |
| Service unavailable | 503 | During incidents | Provider is down |
| Network error | none | Varies | DNS failure, connection reset |

---

## Retry Strategy: Exponential Backoff with Jitter

Not all errors should be retried. Here's the decision tree:

- **429 (Rate limit)**: Always retry, with backoff
- **500, 502, 503 (Server errors)**: Retry 2-3 times
- **408 / Timeout**: Retry once, maybe with a shorter prompt
- **400 (Bad request)**: Never retry (fix the request)
- **401 (Auth error)**: Never retry (fix the API key)

### TypeScript Implementation

```typescript
// utils/retry.ts

interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatuses: number[];
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryableStatuses: [429, 500, 502, 503],
};

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: Partial<RetryOptions> = {}
): Promise<Response> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const response = await fetch(url, init);

      // If the response is OK, return it
      if (response.ok) return response;

      // If the error is not retryable, throw immediately
      if (!opts.retryableStatuses.includes(response.status)) {
        const body = await response.json().catch(() => ({}));
        throw new APIError(
          body.error?.message || `HTTP ${response.status}`,
          response.status,
          false // not retryable
        );
      }

      // Check for Retry-After header (common with 429s)
      const retryAfter = response.headers.get('Retry-After');
      const retryAfterMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : null;

      // If this was our last attempt, throw
      if (attempt === opts.maxRetries) {
        throw new APIError(
          `Failed after ${opts.maxRetries + 1} attempts`,
          response.status,
          false
        );
      }

      // Calculate delay with exponential backoff + jitter
      const exponentialDelay = opts.baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * opts.baseDelayMs;
      const delay = Math.min(
        retryAfterMs || exponentialDelay + jitter,
        opts.maxDelayMs
      );

      console.log(
        `[Retry] Attempt ${attempt + 1}/${opts.maxRetries} ` +
        `failed with ${response.status}. Retrying in ${Math.round(delay)}ms`
      );

      await sleep(delay);
    } catch (error) {
      // Network errors (no response at all)
      if (error instanceof APIError) throw error;

      lastError = error as Error;

      if (attempt === opts.maxRetries) {
        throw new APIError(
          `Network error: ${lastError.message}`,
          0,
          false
        );
      }

      const delay = opts.baseDelayMs * Math.pow(2, attempt) +
        Math.random() * opts.baseDelayMs;
      console.log(
        `[Retry] Network error on attempt ${attempt + 1}. ` +
        `Retrying in ${Math.round(delay)}ms`
      );
      await sleep(delay);
    }
  }

  throw lastError || new Error('Unexpected retry failure');
}

class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public retryable: boolean
  ) {
    super(message);
    this.name = 'APIError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Python Implementation

```python
# utils/retry.py
import asyncio
import random
import httpx
from dataclasses import dataclass

RETRYABLE_STATUSES = {429, 500, 502, 503}

@dataclass
class RetryConfig:
    max_retries: int = 3
    base_delay: float = 1.0
    max_delay: float = 30.0

class APIError(Exception):
    def __init__(self, message: str, status_code: int, retryable: bool):
        super().__init__(message)
        self.status_code = status_code
        self.retryable = retryable

async def fetch_with_retry(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    config: RetryConfig = RetryConfig(),
    **kwargs
) -> httpx.Response:
    last_error = None

    for attempt in range(config.max_retries + 1):
        try:
            response = await client.request(method, url, **kwargs)

            if response.status_code < 400:
                return response

            if response.status_code not in RETRYABLE_STATUSES:
                body = response.json() if response.content else {}
                raise APIError(
                    body.get("error", {}).get("message", f"HTTP {response.status_code}"),
                    response.status_code,
                    retryable=False,
                )

            if attempt == config.max_retries:
                raise APIError(
                    f"Failed after {config.max_retries + 1} attempts",
                    response.status_code,
                    retryable=False,
                )

            # Calculate delay
            retry_after = response.headers.get("retry-after")
            if retry_after:
                delay = float(retry_after)
            else:
                delay = min(
                    config.base_delay * (2 ** attempt) + random.random(),
                    config.max_delay
                )

            print(f"[Retry] Attempt {attempt + 1}/{config.max_retries} "
                  f"failed with {response.status_code}. Retrying in {delay:.1f}s")
            await asyncio.sleep(delay)

        except httpx.RequestError as e:
            last_error = e
            if attempt == config.max_retries:
                raise APIError(f"Network error: {e}", 0, retryable=False)

            delay = config.base_delay * (2 ** attempt) + random.random()
            print(f"[Retry] Network error on attempt {attempt + 1}. "
                  f"Retrying in {delay:.1f}s")
            await asyncio.sleep(delay)

    raise last_error or Exception("Unexpected retry failure")
```

### Why Jitter Matters

Without jitter, if 100 clients all hit a rate limit at the same time, they'll all retry at exactly the same time, causing a "thundering herd" problem. Adding a random component spreads retries out:

```
Without jitter:
Client A: retry at 1s, 2s, 4s
Client B: retry at 1s, 2s, 4s    ← All clients retry simultaneously
Client C: retry at 1s, 2s, 4s

With jitter:
Client A: retry at 1.3s, 2.7s, 4.1s
Client B: retry at 0.8s, 2.2s, 4.9s    ← Retries spread out
Client C: retry at 1.1s, 2.4s, 3.8s
```

---

## Timeout Management

LLM calls are slow. A complex prompt with a long response can easily take 15-30 seconds. You need timeouts, but they have to be realistic.

### Setting Appropriate Timeouts

```typescript
// utils/ai-client.ts

const TIMEOUT_BY_OPERATION: Record<string, number> = {
  'chat': 30000,         // 30s for normal chat
  'summarize': 45000,    // 45s for summarization (long input)
  'generate-code': 60000, // 60s for code generation (long output)
  'embedding': 10000,    // 10s for embeddings (fast)
};

export async function callAI(
  operation: string,
  body: Record<string, unknown>
): Promise<Response> {
  const timeoutMs = TIMEOUT_BY_OPERATION[operation] || 30000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchWithRetry(
      '/api/ai/' + operation,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
      {
        maxRetries: 2,
        // Don't retry if already timing out -- shorter prompt might help
        retryableStatuses: [429, 500, 502, 503],
      }
    );
    return response;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new APIError(
        'Request timed out. Try a shorter message or try again later.',
        408,
        true
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### Streaming Timeout: A Different Problem

For streaming, the initial connection might succeed quickly, but then the stream might stall. You need a **chunk timeout** -- if no new data arrives within X seconds, something is wrong:

```typescript
// utils/stream-with-timeout.ts

export async function* streamWithTimeout(
  response: Response,
  chunkTimeoutMs = 10000
): AsyncGenerator<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    // Race between the next chunk and a timeout
    const result = await Promise.race([
      reader.read(),
      sleep(chunkTimeoutMs).then(() => 'timeout' as const),
    ]);

    if (result === 'timeout') {
      reader.cancel();
      throw new Error('Stream stalled -- no data received for ' +
        `${chunkTimeoutMs / 1000} seconds`);
    }

    const { done, value } = result as ReadableStreamReadResult<Uint8Array>;
    if (done) break;

    yield decoder.decode(value, { stream: true });
  }
}
```

---

## Graceful Degradation Patterns

When the AI service is down or slow, your app shouldn't break. Here are strategies for degrading gracefully.

### Pattern 1: Fallback Responses

```typescript
// utils/fallback.ts

const FALLBACK_RESPONSES: Record<string, string> = {
  'code-review': 'Our AI code review is temporarily unavailable. ' +
    'Please try again in a few minutes, or submit your code for ' +
    'manual review in the #code-review channel.',

  'chat': 'I\'m having trouble connecting right now. Here are some ' +
    'things you can try:\n' +
    '- Check our FAQ at /help\n' +
    '- Ask in the community Slack channel\n' +
    '- Try again in a few minutes',

  'summarize': 'Summarization is temporarily unavailable. ' +
    'The original content is displayed below.',
};

export function getFallbackResponse(feature: string): string {
  return FALLBACK_RESPONSES[feature] ||
    'This feature is temporarily unavailable. Please try again later.';
}
```

### Pattern 2: Cached Responses

For features with predictable inputs (like a FAQ chatbot), cache previous responses:

```typescript
// utils/response-cache.ts

interface CacheEntry {
  response: string;
  timestamp: number;
  ttlMs: number;
}

class ResponseCache {
  private cache = new Map<string, CacheEntry>();

  set(key: string, response: string, ttlMs = 3600000): void {
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      ttlMs,
    });

    // Evict old entries periodically
    if (this.cache.size > 1000) {
      this.evictExpired();
    }
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.response;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttlMs) {
        this.cache.delete(key);
      }
    }
  }
}

export const responseCache = new ResponseCache();
```

### Pattern 3: Queue and Notify

For non-urgent AI tasks, queue the request and notify the user when it's ready:

```typescript
// This pattern works great for things like:
// - AI-generated summaries of long documents
// - Batch code analysis
// - Content generation tasks

async function handleAITask(taskId: string, input: string) {
  try {
    const result = await callAI('summarize', { input });
    // Store result
    await saveResult(taskId, result);
    // Notify user (via email, push notification, or Slack)
    await notifyUser(taskId, 'Your summary is ready!');
  } catch (error) {
    // Queue for retry later
    await queueRetry(taskId, input);
    await notifyUser(taskId,
      'Your summary is taking longer than expected. ' +
      'We\'ll notify you when it\'s ready.'
    );
  }
}
```

---

## User-Facing Error Messages

Never show raw API errors to users. Map every error to a helpful message:

```typescript
// utils/error-messages.ts

export function getUserMessage(error: unknown): {
  title: string;
  message: string;
  action: string;
  showRetry: boolean;
} {
  if (error instanceof APIError) {
    switch (error.statusCode) {
      case 429:
        return {
          title: 'Slow down',
          message: 'You\'re sending messages too quickly.',
          action: 'Wait a moment and try again.',
          showRetry: true,
        };

      case 408:
        return {
          title: 'Request timed out',
          message: 'The AI took too long to respond.',
          action: 'Try a shorter message or try again.',
          showRetry: true,
        };

      case 400:
        if (error.message.includes('context length')) {
          return {
            title: 'Conversation too long',
            message: 'This conversation has gotten too long for the AI to process.',
            action: 'Start a new conversation to continue.',
            showRetry: false,
          };
        }
        if (error.message.includes('content')) {
          return {
            title: 'Content not allowed',
            message: 'Your message couldn\'t be processed due to content restrictions.',
            action: 'Please rephrase your message.',
            showRetry: false,
          };
        }
        return {
          title: 'Invalid request',
          message: 'Something was wrong with that request.',
          action: 'Please try rephrasing your message.',
          showRetry: false,
        };

      case 401:
        return {
          title: 'Authentication error',
          message: 'There\'s a configuration issue with the AI service.',
          action: 'Please contact support.',
          showRetry: false,
        };

      case 500:
      case 502:
      case 503:
        return {
          title: 'Service temporarily unavailable',
          message: 'The AI service is experiencing issues.',
          action: 'Please try again in a few minutes.',
          showRetry: true,
        };

      default:
        return {
          title: 'Something went wrong',
          message: 'An unexpected error occurred.',
          action: 'Please try again.',
          showRetry: true,
        };
    }
  }

  // Network errors
  if (error instanceof TypeError && (error as TypeError).message.includes('fetch')) {
    return {
      title: 'Connection error',
      message: 'Couldn\'t reach the server. Check your internet connection.',
      action: 'Make sure you\'re connected and try again.',
      showRetry: true,
    };
  }

  return {
    title: 'Something went wrong',
    message: 'An unexpected error occurred.',
    action: 'Please try again.',
    showRetry: true,
  };
}
```

### The Error UI Component

```tsx
// components/ErrorMessage.tsx
interface ErrorMessageProps {
  title: string;
  message: string;
  action: string;
  showRetry: boolean;
  onRetry?: () => void;
  onDismiss: () => void;
}

export function ErrorMessage({
  title,
  message,
  action,
  showRetry,
  onRetry,
  onDismiss,
}: ErrorMessageProps) {
  return (
    <div
      className="mx-4 my-2 rounded-xl border border-red-200 bg-red-50 p-4"
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* Error icon */}
        <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
          fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06
            1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72
            1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0
            00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
        </svg>

        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800">{title}</h3>
          <p className="text-sm text-red-700 mt-1">{message}</p>
          <p className="text-sm text-red-600 mt-1">{action}</p>

          <div className="flex gap-2 mt-3">
            {showRetry && onRetry && (
              <button
                onClick={onRetry}
                className="text-sm font-medium text-red-700 hover:text-red-800
                  bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg
                  transition-colors"
              >
                Try again
              </button>
            )}
            <button
              onClick={onDismiss}
              className="text-sm text-red-500 hover:text-red-700 px-3 py-1.5"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Rate Limiting: Protecting Yourself and Your Users

### Server-Side Rate Limiting

Implement rate limiting in your API route to prevent individual users from exhausting your API budget:

```typescript
// middleware/rate-limit.ts

// Simple in-memory rate limiter (use Redis in production)
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  userId: string,
  maxRequests = 20,
  windowMs = 60 * 60 * 1000 // 1 hour
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const record = requestCounts.get(userId);

  if (!record || now > record.resetAt) {
    // New window
    requestCounts.set(userId, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, retryAfterMs: 0 };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: record.resetAt - now,
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    retryAfterMs: 0,
  };
}
```

### Client-Side Rate Limit Awareness

Help users understand their rate limit status:

```typescript
// hooks/useRateLimit.ts
import { useState, useCallback } from 'react';

export function useRateLimit() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const updateFromResponse = useCallback((response: Response) => {
    const remainingHeader = response.headers.get('X-RateLimit-Remaining');
    if (remainingHeader) {
      setRemaining(parseInt(remainingHeader, 10));
    }

    if (response.status === 429) {
      const retryHeader = response.headers.get('Retry-After');
      if (retryHeader) {
        const retryMs = parseInt(retryHeader, 10) * 1000;
        setRetryAfter(Date.now() + retryMs);

        // Auto-clear when the retry period expires
        setTimeout(() => setRetryAfter(null), retryMs);
      }
    }
  }, []);

  const isLimited = retryAfter !== null && Date.now() < retryAfter;

  return {
    remaining,
    isLimited,
    retryAfter,
    updateFromResponse,
  };
}
```

Display this in the UI:

```tsx
{rateLimit.remaining !== null && rateLimit.remaining < 5 && (
  <p className="text-xs text-yellow-600 px-4 py-1">
    {rateLimit.remaining} requests remaining this hour
  </p>
)}

{rateLimit.isLimited && (
  <p className="text-xs text-red-600 px-4 py-1">
    Rate limited. Try again in{' '}
    {Math.ceil((rateLimit.retryAfter! - Date.now()) / 1000)} seconds.
  </p>
)}
```

---

## Circuit Breaker Pattern

If an API is consistently failing, stop hammering it. The circuit breaker pattern prevents cascading failures:

```typescript
// utils/circuit-breaker.ts

type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    private failureThreshold = 5,       // Open after 5 consecutive failures
    private resetTimeoutMs = 30000,     // Try again after 30 seconds
    private halfOpenSuccessThreshold = 2 // Close after 2 successes in half-open
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      // Check if enough time has passed to try again
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'half-open';
        this.successCount = 0;
        console.log('[CircuitBreaker] Transitioning to half-open');
      } else {
        throw new Error(
          'Service temporarily unavailable (circuit breaker open). ' +
          `Try again in ${Math.ceil(
            (this.resetTimeoutMs - (Date.now() - this.lastFailureTime)) / 1000
          )} seconds.`
        );
      }
    }

    try {
      const result = await fn();

      if (this.state === 'half-open') {
        this.successCount++;
        if (this.successCount >= this.halfOpenSuccessThreshold) {
          this.state = 'closed';
          this.failureCount = 0;
          console.log('[CircuitBreaker] Circuit closed (service recovered)');
        }
      } else {
        this.failureCount = 0; // Reset on success
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = 'open';
        console.log(
          `[CircuitBreaker] Circuit OPEN after ${this.failureCount} failures`
        );
      }

      throw error;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Usage
const aiCircuitBreaker = new CircuitBreaker();

async function callAIWithCircuitBreaker(messages: Message[]) {
  return aiCircuitBreaker.execute(async () => {
    const response = await fetchWithRetry('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    return response.json();
  });
}
```

---

## Logging and Monitoring

You can't fix what you can't see. Log every AI API interaction:

```typescript
// utils/ai-logger.ts

interface AILogEntry {
  timestamp: string;
  requestId: string;
  userId: string;
  operation: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  status: 'success' | 'error' | 'timeout' | 'rate_limited';
  errorMessage?: string;
  retryCount: number;
}

export function logAICall(entry: AILogEntry): void {
  // Structured JSON log -- easy to parse with log aggregation tools
  console.log(JSON.stringify({
    level: entry.status === 'success' ? 'info' : 'error',
    service: 'ai-api',
    ...entry,
    costEstimate: estimateCost(
      entry.model,
      entry.inputTokens,
      entry.outputTokens
    ),
  }));
}

function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const rates: Record<string, { input: number; output: number }> = {
    'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
    'gpt-4o': { input: 0.0025, output: 0.01 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  };
  const rate = rates[model] || { input: 0.01, output: 0.03 };
  return (inputTokens / 1000) * rate.input +
    (outputTokens / 1000) * rate.output;
}
```

### What to Monitor

Set up alerts for:

- **Error rate > 5%**: Something is wrong with the API or your code
- **Average latency > 10s**: The model might be overloaded, or your prompts are too long
- **Daily cost > budget**: You're spending more than expected
- **Rate limit hits > 10/hour**: You need to adjust your rate limiting or upgrade your API tier
- **Circuit breaker trips**: The AI service is having a sustained outage

---

## Putting It All Together: A Resilient API Route

Here's a production API route that handles every failure mode:

```typescript
// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { checkRateLimit } from '@/middleware/rate-limit';
import { CircuitBreaker } from '@/utils/circuit-breaker';
import { logAICall } from '@/utils/ai-logger';
import { nanoid } from 'nanoid';

const anthropic = new Anthropic();
const circuitBreaker = new CircuitBreaker(5, 30000);

export async function POST(req: NextRequest) {
  const requestId = nanoid();
  const startTime = Date.now();
  const userId = req.headers.get('x-user-id') || 'anonymous';

  // 1. Rate limiting
  const rateCheck = checkRateLimit(userId);
  if (!rateCheck.allowed) {
    logAICall({
      timestamp: new Date().toISOString(),
      requestId,
      userId,
      operation: 'chat',
      model: 'claude-sonnet-4-20250514',
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startTime,
      status: 'rate_limited',
      retryCount: 0,
    });

    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // 2. Input validation
  const body = await req.json().catch(() => null);
  if (!body?.messages?.length) {
    return NextResponse.json(
      { error: 'Messages array is required' },
      { status: 400 }
    );
  }

  // 3. Call LLM with circuit breaker
  try {
    const result = await circuitBreaker.execute(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await anthropic.messages.create(
          {
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: body.messages,
          },
          { signal: controller.signal }
        );
        return response;
      } finally {
        clearTimeout(timeout);
      }
    });

    // 4. Log success
    logAICall({
      timestamp: new Date().toISOString(),
      requestId,
      userId,
      operation: 'chat',
      model: 'claude-sonnet-4-20250514',
      inputTokens: result.usage.input_tokens,
      outputTokens: result.usage.output_tokens,
      latencyMs: Date.now() - startTime,
      status: 'success',
      retryCount: 0,
    });

    return NextResponse.json(
      { content: result.content[0].text, requestId },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateCheck.remaining),
          'X-Request-Id': requestId,
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logAICall({
      timestamp: new Date().toISOString(),
      requestId,
      userId,
      operation: 'chat',
      model: 'claude-sonnet-4-20250514',
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startTime,
      status: errorMessage.includes('abort') ? 'timeout' : 'error',
      errorMessage,
      retryCount: 0,
    });

    // 5. User-friendly error response
    if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
      return NextResponse.json(
        { error: 'Request timed out. Try a shorter message.', requestId },
        { status: 408 }
      );
    }

    if (errorMessage.includes('circuit breaker')) {
      return NextResponse.json(
        { error: 'AI service temporarily unavailable. Try again shortly.', requestId },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.', requestId },
      { status: 500 }
    );
  }
}
```

---

## Key Takeaways

- **Not all errors are equal.** Rate limits (429) and server errors (5xx) should be retried with exponential backoff. Bad requests (400) and auth errors (401) should not.
- **Exponential backoff with jitter** prevents thundering herd problems when many clients retry simultaneously.
- **Timeouts are mandatory.** LLM calls can hang. Set appropriate timeouts for each operation type, and implement chunk timeouts for streaming.
- **Degrade gracefully.** When the AI is down, show cached responses, fallback messages, or queue the request for later. Never show a blank screen.
- **User-facing errors should be helpful**, not technical. Tell users what happened and what they can do about it.
- **The circuit breaker pattern** stops your app from repeatedly calling a failing service, giving it time to recover.
- **Log everything.** You need request IDs, token counts, latency, and error details to debug production issues and track costs.

---

## Try It Yourself

1. **Starter exercise**: Implement the `fetchWithRetry` utility. Write a test that mocks a server returning 429 twice then 200, and verify that the retry logic works with proper delays.

2. **Intermediate exercise**: Add the `getUserMessage` error mapping to your chat UI. For each error type, display the appropriate error component with a retry button when applicable.

3. **Advanced exercise**: Implement the circuit breaker pattern in your API route. Simulate failures by randomly throwing errors in your LLM call, and verify that the circuit opens after 5 failures and half-opens after 30 seconds.

4. **Stretch goal**: Build a simple monitoring dashboard page (`/admin/ai-health`) that reads from your structured logs and displays: total requests today, error rate, average latency, estimated cost, and circuit breaker status. Use an in-memory store (no database needed for the exercise).

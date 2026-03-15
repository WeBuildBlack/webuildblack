---
title: "Architecture Patterns for AI Web Apps"
estimatedMinutes: 65
---

## Architecture Patterns for AI Web Apps

You know how to call an LLM API. You can craft prompts, stream responses, and handle tokens. But now comes the real question: **where does this code actually live in your web app?**

This lesson is about the architecture decisions that separate a weekend prototype from a production AI feature. We'll cover how to structure API routes as proxies, when to use edge functions, and the critical decision of client-side vs. server-side LLM calls.

---

## Why Architecture Matters for AI Features

AI features are different from typical CRUD operations in a few important ways:

- **They're expensive.** A single LLM call can cost 1-10 cents. Multiply that by thousands of users and you need control over who calls what.
- **They're slow.** A typical database query takes 5-50ms. An LLM call takes 1-30 seconds. Your architecture has to account for this.
- **They require secrets.** API keys for OpenAI, Anthropic, etc. must never touch the browser.
- **They're unpredictable.** LLM outputs vary in length, format, and quality. Your architecture needs guardrails.

---

## The Golden Rule: Never Call LLMs from the Client

Let's get this out of the way immediately. This is wrong:

```javascript
// BAD - Never do this in browser code
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  headers: {
    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_KEY}` // Exposed!
  },
  body: JSON.stringify({ model: 'gpt-4o', messages: [...] })
});
```

Even if you use environment variables prefixed with `NEXT_PUBLIC_`, the value gets bundled into your client-side JavaScript. Anyone can open DevTools and grab your API key. You'll wake up to a $500 bill and a revoked key.

**Always proxy LLM calls through your own server.**

---

## Pattern 1: API Route as Proxy

The most common and straightforward pattern. Your server acts as a middleman between the browser and the LLM provider.

### Next.js App Router (TypeScript)

```typescript
// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // Server-only, never exposed
});

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    // Validate input before sending to LLM
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Enforce a max message length to control costs
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.content.length > 4000) {
      return NextResponse.json(
        { error: 'Message too long. Keep it under 4000 characters.' },
        { status: 400 }
      );
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: 'You are a helpful coding assistant.',
      messages: messages,
    });

    return NextResponse.json({
      content: response.content[0].text,
      usage: response.usage,
    });
  } catch (error) {
    console.error('LLM API error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
```

### Python (FastAPI)

```python
# app/routers/chat.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from anthropic import Anthropic

router = APIRouter()
client = Anthropic()  # Uses ANTHROPIC_API_KEY env var

class ChatRequest(BaseModel):
    messages: list[dict]

class ChatResponse(BaseModel):
    content: str
    input_tokens: int
    output_tokens: int

@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="Messages required")

    # Guard against excessively long inputs
    last_msg = request.messages[-1].get("content", "")
    if len(last_msg) > 4000:
        raise HTTPException(status_code=400, detail="Message too long")

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system="You are a helpful coding assistant.",
            messages=request.messages,
        )

        return ChatResponse(
            content=response.content[0].text,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
        )
    except Exception as e:
        print(f"LLM error: {e}")
        raise HTTPException(status_code=500, detail="AI service unavailable")
```

### What This Pattern Gives You

- **Secret protection**: API keys stay on the server
- **Input validation**: Reject bad requests before they cost you money
- **Rate limiting**: Add middleware to control per-user request rates
- **Logging**: Track every LLM call for debugging and cost monitoring
- **Transformation**: Reshape the LLM response before sending it to the client

---

## Pattern 2: Edge Functions

Edge functions run on servers distributed globally, closer to your users. They start up in milliseconds (no cold start like traditional serverless) and are great for AI features that need low latency on the initial connection.

### When to Use Edge Functions

- **Streaming responses**: Edge functions are perfect for Server-Sent Events because they maintain long-lived connections efficiently
- **Global user base**: If your users are spread across continents, edge reduces the time to first byte
- **Simple transformations**: When you're mostly proxying with light validation

### When NOT to Use Edge Functions

- **Heavy processing**: Edge runtimes have limited CPU time and memory
- **Database-heavy operations**: If you need to read/write a lot of data alongside the LLM call, a standard server function is better
- **Large dependencies**: Edge bundles have size limits (usually 1-4MB)

### Next.js Edge Route

```typescript
// app/api/chat/route.ts
import Anthropic from '@anthropic-ai/sdk';

// This tells Next.js to run this route on the edge
export const runtime = 'edge';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Stream the response using Server-Sent Events
  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages,
  });

  // Convert the SDK stream to a web-standard ReadableStream
  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    start(controller) {
      stream.on('text', (text) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
        );
      });
      stream.on('finalMessage', () => {
        controller.enqueue(
          encoder.encode('data: [DONE]\n\n')
        );
        controller.close();
      });
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

---

## Pattern 3: The BFF (Backend for Frontend) Architecture

For larger applications, you might separate your AI backend into its own service. This is the Backend for Frontend pattern applied to AI.

```
Browser  -->  Next.js API Route  -->  AI Microservice  -->  LLM Provider
                (auth, rate limit)     (prompt mgmt,        (OpenAI,
                                        caching,             Anthropic)
                                        logging)
```

### When This Makes Sense

- Multiple frontend apps (web, mobile, internal tools) all need AI features
- You want a dedicated team managing AI infrastructure
- You need sophisticated prompt versioning and A/B testing
- Your AI service has its own scaling requirements

### TypeScript Implementation

```typescript
// ai-service/src/server.ts
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
app.use(express.json());

const anthropic = new Anthropic();

// Prompt registry - version and manage prompts centrally
const PROMPTS: Record<string, { system: string; version: string }> = {
  'code-review': {
    system: `You are a senior engineer reviewing code. Be constructive
             and specific. Point out bugs, suggest improvements, and
             explain your reasoning.`,
    version: '2.1',
  },
  'explain-code': {
    system: `You explain code to intermediate developers. Use clear
             language, avoid jargon where possible, and give examples.`,
    version: '1.3',
  },
};

app.post('/v1/complete', async (req, res) => {
  const { promptId, messages, userId } = req.body;

  const prompt = PROMPTS[promptId];
  if (!prompt) {
    return res.status(400).json({ error: `Unknown prompt: ${promptId}` });
  }

  // Log for analytics
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    action: 'llm_call',
    promptId,
    promptVersion: prompt.version,
    userId,
    inputLength: JSON.stringify(messages).length,
  }));

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: prompt.system,
    messages,
  });

  res.json({
    content: response.content[0].text,
    promptVersion: prompt.version,
    usage: response.usage,
  });
});

app.listen(3001, () => console.log('AI service running on :3001'));
```

---

## Client vs. Server: The Decision Framework

Here's a practical decision tree for where to put AI logic:

### Always Server-Side

- LLM API calls (secret protection)
- Embedding generation (API keys)
- Vector database queries (connection strings)
- Prompt template assembly (don't expose your prompts)
- Cost tracking and rate limiting

### Can Be Client-Side

- **Displaying** streamed responses (consuming SSE)
- Local text preprocessing (trimming, formatting before sending)
- UI state management (chat history, loading states)
- Running small ML models via WebAssembly or ONNX.js (e.g., local sentiment analysis)
- Caching responses in localStorage or IndexedDB

### The Gray Area: Hybrid Approaches

Some features benefit from a split approach:

```typescript
// Client: Preprocess locally, send to server for LLM
async function handleSubmit(userInput: string) {
  // Client-side: Clean up input
  const cleaned = userInput.trim().slice(0, 4000);

  // Client-side: Check cache first
  const cacheKey = hashString(cleaned);
  const cached = localStorage.getItem(`ai-${cacheKey}`);
  if (cached) {
    displayResponse(JSON.parse(cached));
    return;
  }

  // Server-side: The actual LLM call
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: cleaned }),
  });

  const data = await response.json();

  // Client-side: Cache the response
  localStorage.setItem(`ai-${cacheKey}`, JSON.stringify(data));
  displayResponse(data);
}
```

---

## Middleware Layer: What Goes Between the Client and the LLM

Your API route shouldn't just be a dumb proxy. Here's what a production middleware layer handles:

### Authentication & Authorization

```typescript
// middleware/auth.ts
export function requireAuth(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Verify JWT, check user exists, check subscription status
  const user = verifyToken(token);
  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  return user;
}
```

### Rate Limiting

```typescript
// middleware/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, '1 h'), // 20 requests per hour
});

export async function checkRateLimit(userId: string) {
  const { success, remaining, reset } = await ratelimit.limit(userId);
  if (!success) {
    return {
      limited: true,
      retryAfter: Math.ceil((reset - Date.now()) / 1000),
      remaining: 0,
    };
  }
  return { limited: false, remaining };
}
```

### Request/Response Logging

```typescript
// middleware/logging.ts
export function logAIRequest(params: {
  userId: string;
  endpoint: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  model: string;
  status: 'success' | 'error';
}) {
  // Structured log for cost tracking and debugging
  console.log(JSON.stringify({
    ...params,
    timestamp: new Date().toISOString(),
    costEstimate: estimateCost(params.model, params.inputTokens, params.outputTokens),
  }));
}

function estimateCost(model: string, input: number, output: number): number {
  const rates: Record<string, { input: number; output: number }> = {
    'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
    'gpt-4o': { input: 0.0025, output: 0.01 },
  };
  const rate = rates[model] || { input: 0.01, output: 0.03 };
  return (input / 1000) * rate.input + (output / 1000) * rate.output;
}
```

---

## Putting It All Together: A Complete API Route

Here's what a production-ready AI API route looks like with all the pieces:

```typescript
// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '@/middleware/auth';
import { checkRateLimit } from '@/middleware/rate-limit';
import { logAIRequest } from '@/middleware/logging';

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // 1. Authenticate
  const user = requireAuth(req);
  if (user instanceof NextResponse) return user;

  // 2. Rate limit
  const rateCheck = await checkRateLimit(user.id);
  if (rateCheck.limited) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
    );
  }

  // 3. Validate input
  const { messages } = await req.json();
  if (!messages?.length) {
    return NextResponse.json({ error: 'Messages required' }, { status: 400 });
  }

  try {
    // 4. Call LLM
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages,
    });

    // 5. Log
    logAIRequest({
      userId: user.id,
      endpoint: '/api/chat',
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      latencyMs: Date.now() - startTime,
      model: 'claude-sonnet-4-20250514',
      status: 'success',
    });

    // 6. Return response with rate limit headers
    return NextResponse.json(
      { content: response.content[0].text },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateCheck.remaining),
        },
      }
    );
  } catch (error) {
    logAIRequest({
      userId: user.id,
      endpoint: '/api/chat',
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startTime,
      model: 'claude-sonnet-4-20250514',
      status: 'error',
    });

    return NextResponse.json(
      { error: 'AI service temporarily unavailable' },
      { status: 503 }
    );
  }
}
```

---

> **Don't Forget CORS:** If your frontend and API are on different origins, you'll need to configure CORS headers. Next.js API routes serving the same origin don't need this, but separate API servers (Express, FastAPI) will.

---

## Common Architecture Mistakes

### 1. No Input Validation

Without validation, a user can send a 100,000-character message and burn through your budget in a single request. Always cap input length.

### 2. No Timeout

LLM calls can hang. Always set a timeout:

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000); // 30s

try {
  const response = await anthropic.messages.create(
    { model: 'claude-sonnet-4-20250514', max_tokens: 1024, messages },
    { signal: controller.signal }
  );
} finally {
  clearTimeout(timeout);
}
```

### 3. Exposing Raw LLM Errors

Never forward raw error messages from the LLM provider to your users. They can leak information about your setup. Always map to generic user-facing errors.

### 4. No Cost Controls

Set up billing alerts with your LLM provider. Implement per-user daily/monthly caps. Monitor token usage in your logs.

---

## Key Takeaways

- **Never call LLM APIs from client-side code.** Use API routes as a proxy to protect your keys, control costs, and add guardrails.
- **Edge functions** are excellent for streaming AI responses globally with low latency, but have runtime limitations.
- **The BFF pattern** scales well when multiple frontends need AI features or when you need centralized prompt management.
- **Your middleware layer** (auth, rate limiting, logging, validation) is just as important as the LLM call itself.
- **Client-side code** handles UX: displaying responses, managing state, and caching. Server-side code handles the AI: API calls, prompt assembly, and cost controls.

---

## Try It Yourself

1. **Starter exercise**: Create a Next.js API route that proxies requests to the Anthropic API. Add input validation that rejects messages over 2000 characters and returns a helpful error message.

2. **Intermediate exercise**: Add rate limiting to your API route using an in-memory Map (no Redis needed). Limit each user to 10 requests per minute. Return a `429` status with a `Retry-After` header.

3. **Advanced exercise**: Build a prompt registry (like the BFF example) that loads prompt templates from a JSON file. Your API route should accept a `promptId` parameter and look up the corresponding system prompt. Add a `/api/prompts` GET endpoint that returns available prompt IDs (but not the prompt content -- keep that server-side).

4. **Stretch goal**: Implement request logging that tracks token usage per user. Store logs in a JSON file or SQLite database. Build a simple `/api/usage` endpoint that returns a user's total token consumption for the current day.

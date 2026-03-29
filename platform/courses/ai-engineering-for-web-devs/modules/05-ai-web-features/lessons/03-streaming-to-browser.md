---
title: "Streaming AI Responses to the Browser"
estimatedMinutes: 65
---

## Streaming AI Responses to the Browser

Here's a scenario you've probably experienced: you ask ChatGPT a question and the response appears word by word, like someone typing in real time. That's not a UI trick -- the words are actually arriving from the server as they're generated. This is **streaming**, and it's the single biggest UX improvement you can make in an AI feature.

Without streaming, your user stares at a loading spinner for 5-15 seconds, then the entire response appears at once. With streaming, they see the first word in under a second, and the response builds progressively. Same total time, completely different experience.

In this lesson, you'll learn how to pipe an LLM's streaming output through your server to the browser using Server-Sent Events (SSE) and ReadableStream.

---

## How LLM Streaming Works Under the Hood

When you call an LLM with streaming enabled, the provider doesn't wait until the full response is generated. Instead, it sends back small chunks (usually individual tokens or small groups of tokens) as they're produced.

```
Timeline without streaming:
User sends → [====== 8 seconds of silence ======] → Full response appears

Timeline with streaming:
User sends → [0.3s] First word → [+0.1s] Next word → [+0.1s] ... → Done
```

The LLM provider sends these chunks using a protocol called **Server-Sent Events (SSE)** -- a simple HTTP-based streaming format that works in every browser.

---

## Server-Sent Events (SSE) Explained

SSE is a one-way streaming protocol built on HTTP. The server sends a series of text events to the client over a single, long-lived connection.

### The SSE Format

Each event is a plain text block separated by double newlines:

```
data: {"text": "Hello"}

data: {"text": " there"}

data: {"text": ", how"}

data: {"text": " can I help?"}

data: [DONE]

```

Rules:
- Each line starts with `data: ` followed by the payload
- Events are separated by `\n\n` (double newline)
- The connection stays open until the server closes it or sends a termination signal
- The `Content-Type` header must be `text/event-stream`

### Why SSE Over WebSockets?

For AI streaming, SSE is better than WebSockets because:

- **It's simpler**: SSE is just HTTP. No upgrade handshake, no special protocol.
- **It's one-directional**: LLM responses only flow server-to-client. You don't need bi-directional communication.
- **It works with standard HTTP infrastructure**: Load balancers, proxies, and CDNs handle SSE natively.
- **Automatic reconnection**: The browser's `EventSource` API handles reconnection for free.

---

## Building the Server: Next.js Streaming Route

Here's how to stream an LLM response through a Next.js API route:

### TypeScript (Next.js App Router)

```typescript
// app/api/chat/stream/route.ts
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  // Validate input
  if (!messages?.length) {
    return new Response(
      JSON.stringify({ error: 'Messages required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Create the streaming response from the LLM
  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages,
  });

  // Create a ReadableStream that converts LLM chunks to SSE format
  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        // Listen for text events from the SDK stream
        stream.on('text', (text) => {
          const data = JSON.stringify({ type: 'text', text });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        });

        // Listen for the final message (includes usage stats)
        stream.on('finalMessage', (message) => {
          const data = JSON.stringify({
            type: 'done',
            usage: message.usage,
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          controller.close();
        });

        // Listen for errors
        stream.on('error', (error) => {
          console.error('Stream error:', error);
          const data = JSON.stringify({
            type: 'error',
            message: 'An error occurred during generation',
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          controller.close();
        });
      } catch (error) {
        console.error('Stream setup error:', error);
        controller.error(error);
      }
    },

    cancel() {
      // User navigated away or closed the connection
      stream.abort();
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    },
  });
}
```

### Python (FastAPI)

```python
# app/routers/stream.py
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import anthropic
import json

router = APIRouter()
client = anthropic.AsyncAnthropic()

class StreamRequest(BaseModel):
    messages: list[dict]

@router.post("/api/chat/stream")
async def stream_chat(request: StreamRequest):
    async def event_generator():
        try:
            async with client.messages.stream(
                model="claude-sonnet-4-20250514",
                max_tokens=2048,
                messages=request.messages,
            ) as stream:
                async for text in stream.text_stream:
                    data = json.dumps({"type": "text", "text": text})
                    yield f"data: {data}\n\n"

                # Send final event with usage
                response = stream.get_final_message()
                done_data = json.dumps({
                    "type": "done",
                    "usage": {
                        "input_tokens": response.usage.input_tokens,
                        "output_tokens": response.usage.output_tokens,
                    }
                })
                yield f"data: {done_data}\n\n"

        except Exception as e:
            error_data = json.dumps({
                "type": "error",
                "message": str(e)
            })
            yield f"data: {error_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
```

---

## Building the Client: Consuming SSE in the Browser

Now let's consume this stream in React. There are two approaches: the native `fetch` API with `ReadableStream`, or the browser's `EventSource` API.

### Approach 1: fetch + ReadableStream (Recommended)

This approach gives you full control and works with POST requests:

```typescript
// hooks/useStreamingChat.ts
import { useState, useCallback, useRef } from 'react';
import { Message } from '@/types/chat';
import { nanoid } from 'nanoid';

export function useStreamingChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content,
      timestamp: new Date(),
      status: 'sent',
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsStreaming(true);
    setStreamingContent('');

    // Create abort controller for cancellation
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Get the ReadableStream from the response body
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });

        // Parse SSE events from the chunk
        // A chunk may contain multiple events or partial events
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6); // Remove "data: " prefix
          if (jsonStr === '[DONE]') continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.type === 'text') {
              fullContent += event.text;
              setStreamingContent(fullContent);
            } else if (event.type === 'error') {
              throw new Error(event.message);
            }
            // 'done' event: we'll handle below
          } catch (parseError) {
            // Skip malformed events
            if (parseError instanceof SyntaxError) continue;
            throw parseError;
          }
        }
      }

      // Add the complete assistant message
      const assistantMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        content: fullContent,
        timestamp: new Date(),
        status: 'sent',
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // User cancelled -- add partial response if any
        if (fullContent) {
          setMessages(prev => [
            ...prev,
            {
              id: nanoid(),
              role: 'assistant',
              content: fullContent + '\n\n*(Response cancelled)*',
              timestamp: new Date(),
              status: 'sent',
            },
          ]);
        }
      } else {
        console.error('Streaming error:', error);
        setMessages(prev =>
          prev.map(m =>
            m.id === userMessage.id ? { ...m, status: 'error' } : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      abortControllerRef.current = null;
    }
  }, [messages]);

  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    messages,
    isStreaming,
    streamingContent,
    sendMessage,
    cancelStream,
  };
}
```

### Approach 2: EventSource API

The `EventSource` API is simpler but only supports GET requests. You'd need to pass data via query parameters or use a session-based approach:

```typescript
// Only use this if your endpoint supports GET
function streamWithEventSource(sessionId: string) {
  const eventSource = new EventSource(`/api/chat/stream?session=${sessionId}`);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'text') {
      setStreamingContent(prev => prev + data.text);
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
    setIsStreaming(false);
  };
}
```

For AI chat, Approach 1 (fetch + ReadableStream) is almost always better because you need POST requests to send the message history.

---

## SSE Parsing: Handling Edge Cases

Real-world SSE streams have quirks. Here's a robust parser:

```typescript
// utils/sse-parser.ts

/**
 * Parse SSE events from a text chunk.
 * Handles partial events that span across chunks.
 */
export class SSEParser {
  private buffer = '';

  parse(chunk: string): Array<{ type: string; data: string }> {
    this.buffer += chunk;
    const events: Array<{ type: string; data: string }> = [];

    // Split on double newlines (event boundaries)
    const parts = this.buffer.split('\n\n');

    // The last part might be incomplete, keep it in the buffer
    this.buffer = parts.pop() || '';

    for (const part of parts) {
      const lines = part.split('\n');
      let eventType = 'message';
      let data = '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7);
        } else if (line.startsWith('data: ')) {
          data += line.slice(6);
        } else if (line.startsWith(':')) {
          // Comment line, ignore (used for keepalive)
        }
      }

      if (data) {
        events.push({ type: eventType, data });
      }
    }

    return events;
  }

  reset() {
    this.buffer = '';
  }
}
```

Usage with the streaming hook:

```typescript
const parser = new SSEParser();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  const events = parser.parse(chunk);

  for (const event of events) {
    try {
      const payload = JSON.parse(event.data);
      if (payload.type === 'text') {
        fullContent += payload.text;
        setStreamingContent(fullContent);
      }
    } catch {
      // Skip malformed JSON
    }
  }
}
```

---

## Progressive Rendering: Streaming + Markdown

One challenge with streaming: you're rendering markdown progressively, which means incomplete markdown. A code block might be open but not yet closed. A list might be half-built.

### The Problem

```
Streaming content at time T:
"Here's an example:\n\n```python\ndef hello():\n    print("

At this point, the markdown renderer sees an unclosed code block
and may render it incorrectly.
```

### Solution: Render What You Can

```tsx
// components/StreamingMessage.tsx
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface StreamingMessageProps {
  content: string;
  isStreaming: boolean;
}

export function StreamingMessage({ content, isStreaming }: StreamingMessageProps) {
  // Close any unclosed code blocks for rendering purposes
  const displayContent = isStreaming ? closeOpenBlocks(content) : content;

  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            return isInline ? (
              <code className="bg-gray-200 px-1 py-0.5 rounded text-sm" {...props}>
                {children}
              </code>
            ) : (
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            );
          },
        }}
      >
        {displayContent}
      </ReactMarkdown>

      {/* Blinking cursor while streaming */}
      {isStreaming && (
        <span className="inline-block w-2 h-5 bg-gray-800 animate-pulse ml-0.5" />
      )}
    </div>
  );
}

/**
 * Close any unclosed markdown code blocks so the renderer doesn't break.
 */
function closeOpenBlocks(text: string): string {
  const codeBlockCount = (text.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) {
    // Odd number of ``` means one is unclosed
    return text + '\n```';
  }
  return text;
}
```

---

## Integrating Streaming into the Chat UI

Update the ChatContainer to use the streaming hook:

```tsx
// components/ChatContainer.tsx (streaming version)
'use client';

import { useStreamingChat } from '@/hooks/useStreamingChat';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { StreamingMessage } from './StreamingMessage';

export function ChatContainer() {
  const {
    messages,
    isStreaming,
    streamingContent,
    sendMessage,
    cancelStream,
  } = useStreamingChat();

  return (
    <div className="flex flex-col h-dvh max-w-3xl mx-auto">
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">AI Chat</h1>
        {isStreaming && (
          <button
            onClick={cancelStream}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Stop generating
          </button>
        )}
      </header>

      <MessageList messages={messages} isLoading={false}>
        {/* Show streaming content as it arrives */}
        {isStreaming && streamingContent && (
          <div className="flex gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center
              justify-center flex-shrink-0">
              <span className="text-white text-sm">AI</span>
            </div>
            <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-gray-100
              px-4 py-3">
              <StreamingMessage
                content={streamingContent}
                isStreaming={true}
              />
            </div>
          </div>
        )}
      </MessageList>

      <ChatInput onSend={sendMessage} isLoading={isStreaming} />
    </div>
  );
}
```

---

## Performance Considerations

### 1. Throttle React Re-renders

Each new token triggers `setStreamingContent`, which re-renders the component. For fast streams, this can be 20-50 updates per second. Throttle it:

```typescript
import { useRef, useCallback } from 'react';

function useThrottledState<T>(initialValue: T, intervalMs = 50) {
  const [value, setValue] = useState<T>(initialValue);
  const pendingValue = useRef<T>(initialValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setThrottled = useCallback((newValue: T | ((prev: T) => T)) => {
    const resolved = typeof newValue === 'function'
      ? (newValue as (prev: T) => T)(pendingValue.current)
      : newValue;
    pendingValue.current = resolved;

    if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        setValue(pendingValue.current);
        timeoutRef.current = null;
      }, intervalMs);
    }
  }, [intervalMs]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        setValue(pendingValue.current);
      }
    };
  }, []);

  return [value, setThrottled] as const;
}
```

### 2. Virtualize Long Message Lists

If your chat grows to hundreds of messages, rendering them all is expensive. Use a virtualization library:

```typescript
import { Virtuoso } from 'react-virtuoso';

<Virtuoso
  data={messages}
  followOutput="smooth"   // Auto-scroll to new messages
  itemContent={(index, message) => (
    <MessageBubble key={message.id} message={message} />
  )}
/>
```

### 3. Avoid Re-rendering All Messages

When streaming content updates, only the streaming message component should re-render. Memoize the other message components:

```typescript
const MemoizedBubble = React.memo(MessageBubble);

// In the message list:
{messages.map(m => <MemoizedBubble key={m.id} message={m} />)}
```

---

## Debugging Streams

Streaming is harder to debug than regular HTTP. Here are some tips:

### 1. Browser DevTools Network Tab

Look for the SSE request. In Chrome, you'll see it as a long-lived request with "EventStream" in the type column. Click on it and check the "EventStream" tab to see individual events.

### 2. Server-Side Logging

Log every chunk you send:

```typescript
stream.on('text', (text) => {
  const data = JSON.stringify({ type: 'text', text });
  console.log(`[SSE] Sending: ${data.slice(0, 100)}`); // Truncate for readability
  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
});
```

### 3. curl for Testing

Test your streaming endpoint directly:

```bash
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Say hello"}]}' \
  --no-buffer
```

The `--no-buffer` flag ensures curl displays chunks as they arrive instead of buffering the entire response.

---

## Common Pitfalls

### Nginx/Reverse Proxy Buffering

If you deploy behind Nginx, it may buffer the entire response before forwarding it, defeating the purpose of streaming. Add this header:

```
X-Accel-Buffering: no
```

Or in your Nginx config:

```nginx
location /api/chat/stream {
    proxy_buffering off;
    proxy_cache off;
}
```

### Vercel / Serverless Timeouts

Vercel's free tier allows 10 seconds for standard serverless functions, but **60 seconds for streaming functions** (even on the free tier). Set `export const maxDuration = 60;` in your route file:

```typescript
// In your streaming route file
export const maxDuration = 60; // 60 seconds for streaming (free tier supports this)
```

### Missing `\n\n` in SSE Events

Each SSE event **must** end with two newlines. A single newline doesn't terminate the event. This is the most common SSE bug.

---

## Key Takeaways

- **Streaming transforms the UX** from "wait 10 seconds, see everything" to "see the first word in under a second." It's worth the complexity.
- **SSE (Server-Sent Events)** is the right protocol for AI streaming: simple, HTTP-based, one-directional, and well-supported.
- **Use `fetch` + `ReadableStream`** on the client (not `EventSource`) because you need POST requests for chat messages.
- **Handle edge cases**: partial SSE events across chunks, unclosed markdown blocks during streaming, and connection interruptions.
- **Throttle re-renders**: Each token triggers a state update. Batch them to keep the UI smooth.
- **Always add a cancel button**: Let users stop generation. Implement this with `AbortController`.

---

### Framework Alternative: Vercel AI SDK

The patterns above teach you the fundamentals of streaming. In production Next.js apps, the **Vercel AI SDK** (`ai` package) handles all of this:

```typescript
// Server: app/api/chat/route.ts
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    messages,
  });
  return result.toDataStreamResponse();
}

// Client: components/Chat.tsx
import { useChat } from 'ai/react';

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();
  // All streaming, state management, and error handling is built in
}
```

We teach the underlying mechanics so you understand what these frameworks do -- but for production, the Vercel AI SDK saves significant development time.

---

## Try It Yourself

1. **Starter exercise**: Modify the non-streaming API route from Lesson 01 to support streaming. Use the Anthropic SDK's `messages.stream()` method and return an SSE response.

2. **Intermediate exercise**: Build the `useStreamingChat` hook and connect it to a simple chat UI. Verify streaming works by watching the DevTools Network tab.

3. **Advanced exercise**: Implement the `SSEParser` class and use it to handle partial events correctly. Test by sending very long responses that span many chunks.

4. **Stretch goal**: Add a "Stop generating" button that aborts the stream mid-response and keeps the partial content as the AI's message. Add a token usage display that updates in real-time as the streaming response grows (use the rough estimate of 1 token per 4 characters).

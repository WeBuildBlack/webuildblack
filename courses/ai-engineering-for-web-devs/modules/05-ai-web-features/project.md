---
title: "Module Project: AI Chat Widget"
estimatedMinutes: 75
---

# AI Chat Widget

Build a reusable React chat component with streaming AI responses, backed by a Next.js API route.

## Overview

> **Provider Note:** This project uses the OpenAI SDK for variety -- showing you can apply the same patterns with any provider. The architecture, streaming, and error handling patterns are identical to what you learned with Anthropic in the lessons.

Everything you've built so far has been in the terminal. Now you're going full-stack. You'll create a Next.js app with a polished chat interface that streams responses from OpenAI in real-time -- message bubbles, a typing indicator, auto-scroll, error handling with retry, and basic rate limiting. This is the same core pattern behind every AI chatbot you've ever used, and after this project you'll know exactly how it works. By the end, you'll have a reusable component you can drop into any web project.

## What You'll Practice

- Designing the architecture for AI-powered web features (from Lesson 1: Architecture Patterns)
- Building a responsive chat UI with React components (from Lesson 2: Chat UI Components)
- Streaming AI responses from server to browser using Server-Sent Events (from Lesson 3: Streaming to Browser)
- Implementing error handling, retry logic, and rate limiting (from Lesson 4: Error Handling & Resilience)
- Connecting everything: API route to OpenAI to streaming response to React state

## Prerequisites

- **Node.js 18+** installed
- **OpenAI API key**
- Familiarity with React and Next.js basics (components, hooks, API routes)
- Completed Modules 01-04 or equivalent experience with LLM APIs

## Project Setup

```bash
npx create-next-app@latest ai-chat-widget --typescript --tailwind --app --eslint
cd ai-chat-widget
npm install openai
```

Create your `.env.local` file (Next.js convention):

```bash
OPENAI_API_KEY=sk-your-key-here
```

Verify the dev server runs:

```bash
npm run dev
# Open http://localhost:3000
```

## Step-by-Step Instructions

### Step 1: Build the API Route with Streaming

Create the server-side route that proxies requests to OpenAI and streams responses back:

```bash
mkdir -p app/api/chat
touch app/api/chat/route.ts
```

```typescript
// app/api/chat/route.ts
import OpenAI from 'openai';

const openai = new OpenAI();

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 10; // max requests
const RATE_WINDOW = 60_000; // per 60 seconds

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];

  // TODO: Filter timestamps to only keep those within the RATE_WINDOW
  // Then check if the count exceeds RATE_LIMIT
  // If under limit, add the current timestamp and return true
  // If over limit, return false

  const recent = // YOUR CODE HERE: filter timestamps within window
  rateLimitMap.set(ip, recent);

  if (recent.length >= RATE_LIMIT) {
    return false;
  }

  recent.push(now);
  return true;
}

export async function POST(request: Request) {
  // Rate limit check
  const ip = request.headers.get('x-forwarded-for') || 'anonymous';
  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Parse the request body
  const { messages } = await request.json();

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Messages array is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // TODO: Validate message format -- each message needs role and content
  // Reject if any message is missing required fields
  // YOUR CODE HERE

  try {
    // TODO: Create a streaming chat completion using OpenAI
    // Use these settings:
    //   - model: 'gpt-4o-mini' (fast and cheap for chat)
    //   - messages: prepend a system message, then include the user's messages
    //   - stream: true
    //   - max_tokens: 1024
    //
    // System message: "You are a helpful, friendly AI assistant. Keep responses
    //   concise and well-formatted. Use markdown for code blocks and lists."

    const stream = await openai.chat.completions.create({
      // YOUR CODE HERE
    });

    // TODO: Create a ReadableStream that forwards the OpenAI stream chunks
    // as Server-Sent Events (SSE) to the browser
    //
    // The pattern:
    //   1. Create a new ReadableStream with a start(controller) function
    //   2. Inside start, use a for-await-of loop over the OpenAI stream
    //   3. For each chunk, extract the content delta
    //   4. Encode it as SSE format: `data: ${JSON.stringify({ content })}\n\n`
    //   5. Enqueue the encoded chunk using controller.enqueue()
    //   6. After the loop, send `data: [DONE]\n\n` and close the controller

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              // YOUR CODE HERE: Encode and enqueue the SSE chunk
            }
          }
          // YOUR CODE HERE: Send [DONE] signal and close
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('OpenAI API error:', error);

    // TODO: Return appropriate error responses for different failure types
    // Check error.status for specific HTTP codes:
    //   - 429: Rate limited by OpenAI -> tell user to slow down
    //   - 401: Bad API key -> server config error
    //   - 500+: OpenAI is down -> try again later
    //   - Default: generic error message

    const status = error.status || 500;
    const message = // YOUR CODE HERE: pick message based on status
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

### Step 2: Create the Chat Hook

Build a custom React hook that manages chat state and streaming:

```bash
mkdir -p lib
touch lib/use-chat.ts
```

```typescript
// lib/use-chat.ts
'use client';

import { useState, useCallback, useRef } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UseChatReturn {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  retry: () => Promise<void>;
  clearMessages: () => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastUserMessage = useRef<string>('');

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return;

    setError(null);
    lastUserMessage.current = content;

    // Add the user's message to the list
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    // Create a placeholder for the assistant's response
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setIsStreaming(true);

    try {
      // TODO: Build the messages array to send to the API
      // Include the full conversation history (previous messages + new user message)
      // Map to { role, content } format (strip id and timestamp)
      const apiMessages = // YOUR CODE HERE

      // TODO: Make a POST request to /api/chat with the messages
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      // TODO: Read the SSE stream from the response body
      // Pattern:
      //   1. Get a reader from response.body.getReader()
      //   2. Create a TextDecoder
      //   3. Loop: read chunks, decode them, split by 'data: ' lines
      //   4. For each data line, parse the JSON and extract content
      //   5. Append content to the assistant message using setMessages
      //   6. Stop when you receive [DONE]

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines from the buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();

          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              // TODO: Update the assistant message's content by appending the new chunk
              // Use setMessages with a callback that finds the assistant message by id
              // and appends parsed.content to its content

              setMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantMessage.id
                    ? { ...msg, content: msg.content + parsed.content }
                    : msg
                )
              );
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
      // Remove the empty assistant message on error
      setMessages(prev => prev.filter(m => m.id !== assistantMessage.id));
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming]);

  // TODO: Implement the retry function
  // It should resend the last user message
  const retry = useCallback(async () => {
    if (!lastUserMessage.current) return;
    // Remove the last failed assistant message (if any) and the user message
    // Then re-send the user message
    // YOUR CODE HERE
  }, [sendMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isStreaming, error, sendMessage, retry, clearMessages };
}
```

### Step 3: Build the Chat UI Components

Create the main chat component:

```bash
mkdir -p components
touch components/ChatWidget.tsx components/MessageBubble.tsx components/ChatInput.tsx
```

**Message Bubble:**

```tsx
// components/MessageBubble.tsx
'use client';

import { Message } from '@/lib/use-chat';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
        }`}
      >
        {/* TODO: Render the message content
            For assistant messages, you might want to handle markdown later.
            For now, render as plain text with whitespace preserved. */}
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
          {/* TODO: Add a blinking cursor when this message is actively streaming
              Show a small blinking block character when isStreaming is true
              and the message is from the assistant */}
          {/* YOUR CODE HERE */}
        </p>

        {/* Timestamp */}
        <p className={`text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
```

**Chat Input:**

```tsx
// components/ChatInput.tsx
'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize the textarea as the user types
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [input]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input);
    setInput('');
  }

  // TODO: Handle Enter key to submit (but Shift+Enter for new line)
  function handleKeyDown(e: React.KeyboardEvent) {
    // YOUR CODE HERE: Check for Enter without Shift, call handleSubmit
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t border-gray-200">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? 'Waiting for response...' : 'Type a message...'}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2 text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   disabled:bg-gray-50 disabled:text-gray-400"
      />
      <button
        type="submit"
        disabled={disabled || !input.trim()}
        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white
                   hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                   transition-colors"
      >
        Send
      </button>
    </form>
  );
}
```

**Main Chat Widget:**

```tsx
// components/ChatWidget.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useChat } from '@/lib/use-chat';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';

export function ChatWidget() {
  const { messages, isStreaming, error, sendMessage, retry, clearMessages } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // TODO: Auto-scroll to the bottom when new messages arrive or content streams in
  // Use useEffect that depends on `messages` and scrolls messagesEndRef into view
  useEffect(() => {
    // YOUR CODE HERE
  }, [messages]);

  return (
    <div className="flex flex-col h-[600px] max-w-2xl mx-auto border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div>
          <h2 className="font-semibold text-gray-900">AI Assistant</h2>
          <p className="text-xs text-gray-500">
            {isStreaming ? 'Thinking...' : 'Online'}
          </p>
        </div>
        <button
          onClick={clearMessages}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Clear chat
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Send a message to start the conversation.
          </div>
        )}

        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isStreaming={
              isStreaming &&
              message.role === 'assistant' &&
              index === messages.length - 1
            }
          />
        ))}

        {/* TODO: Show an error banner with a retry button when error is not null
            The banner should display the error message and a "Retry" button
            that calls the retry function */}
        {error && (
          <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            {/* YOUR CODE HERE: error message + retry button */}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  );
}
```

### Step 4: Add the Widget to the Page

Replace the default page:

```tsx
// app/page.tsx
import { ChatWidget } from '@/components/ChatWidget';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">AI Chat Widget</h1>
        <p className="text-sm text-gray-500 mt-1">
          Built with Next.js + OpenAI Streaming
        </p>
      </div>
      <ChatWidget />
    </main>
  );
}
```

### Step 5: Test the Core Flow

```bash
npm run dev
```

Open `http://localhost:3000` and test:

1. Send a simple message like "Hello, who are you?"
2. Watch the response stream in real-time (you should see text appear word-by-word)
3. Send a follow-up that references the previous message to verify conversation history works
4. Open the browser's Network tab and inspect the `/api/chat` request -- you should see SSE chunks

### Step 6: Add the Typing Indicator

Go back to `MessageBubble.tsx` and add a blinking cursor for streaming messages:

```tsx
// Add this CSS to your globals.css (or inside a <style> tag)
// app/globals.css -- add at the bottom:
```

```css
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.typing-cursor {
  display: inline-block;
  width: 6px;
  height: 16px;
  background-color: currentColor;
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink 0.8s infinite;
}
```

Now update the MessageBubble to use it when `isStreaming` is true.

### Step 7: Handle Edge Cases

Test these scenarios and make sure your app handles them gracefully:

```bash
# 1. Stop your dev server and try sending a message
#    -> Should show a connection error, not crash

# 2. Send a very long message (paste a few paragraphs)
#    -> Should work, conversation should stay within token limits

# 3. Rapidly click Send multiple times
#    -> Should not send duplicate messages (disabled state should prevent this)

# 4. Remove your OPENAI_API_KEY from .env.local and restart
#    -> Should show a clear error message, not expose the stack trace
```

### Step 8: Polish and Run

Make sure everything works end to end:

```bash
npm run dev
```

Try a multi-turn conversation:
1. "What are the main differences between SQL and NoSQL databases?"
2. "Can you give me an example of when I'd pick each one?"
3. "Write me a simple MongoDB connection in Node.js"

Verify that:
- Responses stream in real-time with the typing cursor
- Messages auto-scroll as new content arrives
- The conversation history is maintained (model references previous messages)
- The error banner appears if you disconnect your internet
- The "Clear chat" button resets everything

## Expected Result

You should have a polished chat interface at `http://localhost:3000` that looks and feels like a real AI chatbot. Messages appear in bubbles, assistant responses stream in with a blinking cursor, the UI auto-scrolls, errors show a retry button, and rapid clicks don't break anything.

## Stretch Goals

1. **Add markdown rendering** to assistant messages. Install `react-markdown` and `remark-gfm`, then wrap assistant message content in a `<ReactMarkdown>` component. This makes code blocks, lists, and links render properly. Be careful with styling -- you'll need to add prose classes from Tailwind's typography plugin.

2. **Add a system prompt selector** at the top of the chat. Let users pick from preset personalities: "Helpful Assistant," "Code Tutor," "Creative Writer." Store the system prompt in React state and send it with each API call. This shows users how system prompts change model behavior.

3. **Add token usage display** below the chat. After each response, show the token count and estimated cost for the conversation. You'll need to update the API route to return usage data alongside the stream (send it as a final SSE event after `[DONE]`).

## Submission Checklist

Your project is done when:

- [ ] The Next.js app starts with `npm run dev` and loads at `http://localhost:3000`
- [ ] Sending a message triggers a streaming response that appears word-by-word
- [ ] The chat UI has message bubbles, a typing indicator, and auto-scroll
- [ ] Conversation history is maintained across multiple turns
- [ ] The API route implements rate limiting (returns 429 after too many requests)
- [ ] Error states display a banner with a retry button (not a white screen)
- [ ] Enter sends a message, Shift+Enter creates a new line
- [ ] The "Clear chat" button resets the conversation
- [ ] The app works correctly when you disconnect and reconnect your internet
- [ ] Input is disabled while a response is streaming (no double-sends)

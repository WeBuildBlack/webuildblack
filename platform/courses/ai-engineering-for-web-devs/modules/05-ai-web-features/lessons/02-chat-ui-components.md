---
title: "Building a Chat UI"
estimatedMinutes: 65
---

## Building a Chat UI

Every AI product ships a chat interface. ChatGPT, Claude, Gemini, Copilot -- they all center on the same core interaction: the user types a message, the AI responds. It looks simple, but building a chat UI that feels polished takes real thought.

In this lesson, you'll build a complete chat interface from scratch using React. We'll cover the message list, the input area, typing indicators, auto-scroll, and all the small details that separate a prototype from a product.

---

## The Anatomy of a Chat Interface

Before writing code, let's break down what a chat UI actually needs:

```
+------------------------------------------+
|  Header / Model Selector                 |
+------------------------------------------+
|                                          |
|  [Avatar] User message bubble            |
|                                          |
|  [Avatar] AI response bubble             |
|           with markdown rendering        |
|                                          |
|  [Avatar] User message bubble            |
|                                          |
|  [Typing indicator...]                   |
|                                          |
+------------------------------------------+
|  [Input field                ] [Send]    |
|  Character count: 234 / 4000             |
+------------------------------------------+
```

### Core Components

1. **MessageList** -- Scrollable container for all messages
2. **MessageBubble** -- Individual message with avatar, content, timestamp
3. **ChatInput** -- Text input with send button and character limit
4. **TypingIndicator** -- Visual feedback while AI is generating
5. **ChatContainer** -- Parent that manages state and API calls

---

## Data Model: Messages

First, define what a message looks like in your app:

```typescript
// types/chat.ts
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'error';
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}
```

In Python (if you're using a FastAPI backend with a React frontend):

```python
# models/chat.py
from pydantic import BaseModel
from datetime import datetime
from enum import Enum

class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"

class MessageStatus(str, Enum):
    SENDING = "sending"
    SENT = "sent"
    ERROR = "error"

class Message(BaseModel):
    id: str
    role: MessageRole
    content: str
    timestamp: datetime
    status: MessageStatus
```

---

## Component 1: MessageBubble

Each message needs to look different depending on who sent it:

```tsx
// components/MessageBubble.tsx
import { Message } from '@/types/chat';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center
          flex-shrink-0 ${isUser ? 'bg-blue-600' : 'bg-gray-700'}`}
      >
        <span className="text-white text-sm">
          {isUser ? 'You' : 'AI'}
        </span>
      </div>

      {/* Message content */}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3
          ${isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
          }
          ${message.status === 'error' ? 'border-2 border-red-400' : ''}
        `}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <ReactMarkdown
            components={{
              code({ node, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !match;
                return isInline ? (
                  <code
                    className="bg-gray-200 px-1.5 py-0.5 rounded text-sm"
                    {...props}
                  >
                    {children}
                  </code>
                ) : (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    className="rounded-lg my-2"
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}

        {/* Timestamp and status */}
        <div
          className={`text-xs mt-1 ${
            isUser ? 'text-blue-200' : 'text-gray-500'
          }`}
        >
          {formatDistanceToNow(message.timestamp, { addSuffix: true })}
          {message.status === 'sending' && ' - Sending...'}
          {message.status === 'error' && ' - Failed to send'}
        </div>
      </div>
    </div>
  );
}
```

> **Version Note:** This code works with `react-markdown` v8. In v9+, the `node` prop was removed from component signatures. Check your installed version and adjust accordingly.

### Why Markdown Rendering Matters

AI responses frequently contain:

- Code blocks with syntax highlighting
- Bullet points and numbered lists
- Bold and italic text
- Links
- Tables

Using `react-markdown` with a syntax highlighter gives you all of this out of the box. Without it, code examples show up as plain text and the response looks unprofessional.

---

## Component 2: TypingIndicator

The typing indicator tells users that the AI is working. This is critical UX -- without it, users don't know if the app is frozen or processing.

```tsx
// components/TypingIndicator.tsx
export function TypingIndicator() {
  return (
    <div className="flex gap-3 mb-4">
      {/* AI Avatar */}
      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center
        justify-center flex-shrink-0">
        <span className="text-white text-sm">AI</span>
      </div>

      {/* Bouncing dots */}
      <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1.5">
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}
```

### When to Show the Typing Indicator

Show it **immediately** when the user sends a message. Don't wait for the API to acknowledge the request. The user needs instant feedback that something is happening.

For streaming responses, you have two options:

1. **Show dots until first token arrives, then show the streaming text** (recommended)
2. Show dots for the entire generation (feels slower, less engaging)

```typescript
// Option 1: Replace dots with streaming content
const [showTyping, setShowTyping] = useState(false);
const [streamingContent, setStreamingContent] = useState('');

async function sendMessage(content: string) {
  setShowTyping(true);  // Show dots immediately

  const response = await fetch('/api/chat', { /* ... */ });
  const reader = response.body?.getReader();

  setShowTyping(false);  // Hide dots when first token arrives

  // Start showing the streaming text
  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;
    const text = new TextDecoder().decode(value);
    setStreamingContent(prev => prev + text);
  }
}
```

---

## Component 3: ChatInput

The input component handles user text entry, send actions, and provides feedback on character limits:

```tsx
// components/ChatInput.tsx
import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  maxLength?: number;
}

export function ChatInput({
  onSend,
  isLoading,
  maxLength = 4000,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as user types
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Send on Enter, newline on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const charCount = input.length;
  const isOverLimit = charCount > maxLength;
  const isNearLimit = charCount > maxLength * 0.9;

  return (
    <div className="border-t border-gray-200 p-4">
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? 'Waiting for response...' : 'Type a message...'}
            disabled={isLoading}
            rows={1}
            className="w-full resize-none rounded-xl border border-gray-300
              px-4 py-3 pr-12 focus:outline-none focus:border-blue-500
              focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50
              disabled:text-gray-400"
            aria-label="Chat message input"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading || isOverLimit}
          className="rounded-xl bg-blue-600 text-white px-4 py-3
            hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
            transition-colors flex-shrink-0"
          aria-label="Send message"
        >
          {isLoading ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4" fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>

      {/* Character count */}
      {isNearLimit && (
        <p className={`text-xs mt-1 text-right ${
          isOverLimit ? 'text-red-500' : 'text-yellow-600'
        }`}>
          {charCount.toLocaleString()} / {maxLength.toLocaleString()} characters
          {isOverLimit && ' - Message too long'}
        </p>
      )}
    </div>
  );
}
```

### Key UX Details

- **Enter to send, Shift+Enter for newline**: This is the universal convention for chat apps. Don't deviate from it.
- **Auto-resizing textarea**: A fixed single-line input is frustrating for longer messages. Let it grow, but cap the max height.
- **Disabled state while loading**: Prevent users from sending multiple messages while one is processing (unless your app supports that).
- **Character count near the limit**: Only show this when the user is close to the max. Showing "0 / 4000" all the time is noise.

---

## Component 4: MessageList with Auto-Scroll

The message list needs to scroll to the bottom when new messages arrive, but respect the user's scroll position if they've scrolled up to read earlier messages:

```tsx
// components/MessageList.tsx
import { useEffect, useRef, useState } from 'react';
import { Message } from '@/types/chat';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  // Detect if user has scrolled up
  function handleScroll() {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setUserScrolledUp(!isAtBottom);
  }

  // Auto-scroll to bottom when new messages arrive (if user hasn't scrolled up)
  useEffect(() => {
    if (!userScrolledUp) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, userScrolledUp]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4"
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
    >
      {/* Empty state */}
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full
          text-gray-400">
          <p className="text-lg font-medium">Start a conversation</p>
          <p className="text-sm mt-1">Type a message below to get started</p>
        </div>
      )}

      {/* Messages */}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {/* Typing indicator */}
      {isLoading && <TypingIndicator />}

      {/* Scroll anchor */}
      <div ref={bottomRef} />

      {/* "Scroll to bottom" button when user has scrolled up */}
      {userScrolledUp && (
        <button
          onClick={() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            setUserScrolledUp(false);
          }}
          className="fixed bottom-24 right-8 bg-white shadow-lg rounded-full
            p-2 border border-gray-200 hover:bg-gray-50 transition-colors"
          aria-label="Scroll to latest message"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24"
            stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
    </div>
  );
}
```

### Smart Auto-Scroll Logic

The key insight: **auto-scroll should only happen when the user is already at the bottom**. If they've scrolled up to re-read an earlier message, jumping them to the bottom is disorienting. The 50px threshold accounts for slight imprecision in scroll position.

---

## Component 5: ChatContainer (Putting It Together)

The parent component manages state and API communication:

```tsx
// components/ChatContainer.tsx
'use client';

import { useState, useCallback } from 'react';
import { Message } from '@/types/chat';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { nanoid } from 'nanoid';

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    // 1. Add user message immediately (optimistic update)
    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content,
      timestamp: new Date(),
      status: 'sent',
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // 2. Build messages array for API
      const apiMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      // 3. Call our API route (not the LLM directly!)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // 4. Add assistant message
      const assistantMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        status: 'sent',
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      // 5. Show error state on the user message
      setMessages(prev =>
        prev.map(m =>
          m.id === userMessage.id ? { ...m, status: 'error' } : m
        )
      );
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      {/* Header */}
      <header className="border-b border-gray-200 px-4 py-3 flex items-center
        justify-between">
        <h1 className="text-lg font-semibold">AI Chat</h1>
        <button
          onClick={() => setMessages([])}
          className="text-sm text-gray-500 hover:text-gray-700"
          disabled={messages.length === 0}
        >
          New Chat
        </button>
      </header>

      {/* Messages */}
      <MessageList messages={messages} isLoading={isLoading} />

      {/* Input */}
      <ChatInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  );
}
```

---

## Handling Conversation History

A critical detail: you need to send the **entire conversation history** to the LLM on every request. LLMs are stateless -- they don't remember previous messages unless you include them.

```typescript
// This is why we build the apiMessages array from ALL messages
const apiMessages = messages.map(m => ({
  role: m.role,
  content: m.content,
}));
```

### Managing Long Conversations

As conversations grow, you'll hit token limits. Here are strategies:

```typescript
// Strategy 1: Sliding window - keep only the last N messages
function getRecentMessages(messages: Message[], maxMessages = 20): Message[] {
  if (messages.length <= maxMessages) return messages;
  return messages.slice(-maxMessages);
}

// Strategy 2: Summarize older messages
async function summarizeHistory(messages: Message[]): Promise<string> {
  if (messages.length <= 10) return '';

  const olderMessages = messages.slice(0, -10);
  const response = await fetch('/api/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: olderMessages.map(m => `${m.role}: ${m.content}`).join('\n'),
    }),
  });

  const data = await response.json();
  return data.summary;
}

// Strategy 3: Token counting (approximate)
function estimateTokens(text: string): number {
  // Rough estimate: 1 token per 4 characters for English text
  return Math.ceil(text.length / 4);
}

function trimToTokenBudget(
  messages: Message[],
  maxTokens = 4000
): Message[] {
  let totalTokens = 0;
  const result: Message[] = [];

  // Always include the latest message
  // Then work backwards from newest to oldest
  for (let i = messages.length - 1; i >= 0; i--) {
    const messageTokens = estimateTokens(messages[i].content);
    if (totalTokens + messageTokens > maxTokens) break;
    totalTokens += messageTokens;
    result.unshift(messages[i]);
  }

  return result;
}
```

---

## Accessibility Checklist

Chat interfaces need careful accessibility work:

```tsx
// Use role="log" on the message container
<div role="log" aria-label="Chat messages" aria-live="polite">

// Label the input
<textarea aria-label="Chat message input" />

// Label the send button
<button aria-label="Send message">

// Announce new messages to screen readers
<div aria-live="polite" className="sr-only">
  {isLoading ? 'AI is generating a response' : ''}
</div>

// Make sure focus management works
// After sending, keep focus on the input
// After an error, announce the error
```

---

## Mobile Responsiveness

Chat UIs on mobile need special handling for the virtual keyboard:

```css
/* Prevent the page from scrolling behind the keyboard on iOS */
.chat-container {
  height: 100dvh; /* dynamic viewport height -- accounts for mobile browser chrome */
  display: flex;
  flex-direction: column;
}

/* Make sure the input stays visible above the keyboard */
.chat-input {
  position: sticky;
  bottom: 0;
  background: white;
  padding-bottom: env(safe-area-inset-bottom); /* iPhone notch */
}

/* Message bubbles should be narrower on mobile */
@media (max-width: 640px) {
  .message-bubble {
    max-width: 85%;
  }
}
```

---

## Key Takeaways

- **Component decomposition matters**: Split your chat UI into MessageBubble, MessageList, ChatInput, TypingIndicator, and ChatContainer. Each has a clear responsibility.
- **Optimistic updates**: Add the user's message to the UI immediately. Don't wait for the API to respond before showing their message.
- **Smart auto-scroll**: Scroll to the bottom for new messages, but respect the user's position if they've scrolled up.
- **Markdown rendering is essential**: AI responses contain code blocks, lists, and formatting. Render them properly with `react-markdown` and a syntax highlighter.
- **Accessibility is not optional**: Use ARIA roles, labels, and live regions. Test with a screen reader.
- **Mobile-first**: Use `100dvh`, handle the virtual keyboard, and test on real devices.

---

## Try It Yourself

1. **Starter exercise**: Build the MessageBubble and ChatInput components. Style user messages in blue and AI messages in gray. Test with hardcoded messages (no API needed yet).

2. **Intermediate exercise**: Add the full ChatContainer with real API integration. Send messages to your API route from the previous lesson and display responses. Add the typing indicator.

3. **Advanced exercise**: Implement conversation history management with the sliding window approach. Add a "token count" display in the header that shows approximately how many tokens the current conversation uses.

4. **Stretch goal**: Add a "retry" button on failed messages that re-sends the message. Add a "copy" button on AI responses that copies the text (or just the code block) to the clipboard. Add keyboard shortcuts: `Ctrl+N` for new chat, `Escape` to cancel a pending request.

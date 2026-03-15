---
title: "Streaming Responses"
estimatedMinutes: 60
---

# Streaming Responses

When you use ChatGPT in the browser, you see text appear word by word. That is streaming in action. Without streaming, your users stare at a loading spinner for 5-30 seconds while the entire response generates. With streaming, they see the first tokens arrive in under a second, creating a dramatically better experience.

In this lesson, you will learn how streaming works under the hood, how to implement it with the OpenAI SDK, and how to pipe streamed responses to a web frontend.

---

## Why Streaming Matters

Consider a typical API call that returns a 500-token response:

- **Without streaming**: User waits ~3-8 seconds for the complete response, then sees everything at once.
- **With streaming**: User sees the first words in ~200-500ms, and the rest fills in progressively.

The total time to completion is the same, but the *perceived* performance is dramatically better. This is not just a nice-to-have -- for production AI applications, streaming is essentially required.

---

## How Server-Sent Events (SSE) Work

Streaming responses from OpenAI use **Server-Sent Events (SSE)**, a web standard for pushing data from server to client over a single HTTP connection.

Here is what happens under the hood:

1. Your application opens an HTTP connection to OpenAI with `stream: true`.
2. Instead of one big JSON response, OpenAI sends back a series of small chunks.
3. Each chunk is a line starting with `data: ` followed by a JSON object.
4. The final chunk is `data: [DONE]` to signal completion.

Raw SSE data looks like this:

```
data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","choices":[{"delta":{"role":"assistant","content":""},"index":0}]}

data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","choices":[{"delta":{"content":"A"},"index":0}]}

data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","choices":[{"delta":{"content":" closure"},"index":0}]}

data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","choices":[{"delta":{"content":" is"},"index":0}]}

data: [DONE]
```

Notice the key difference: instead of `message`, each chunk has a `delta` object containing the incremental content.

---

## Basic Streaming with the OpenAI SDK

The OpenAI SDK makes streaming straightforward. You set `stream: true` and iterate over the response.

### JavaScript

```javascript
import OpenAI from "openai";

const openai = new OpenAI();

async function streamChat(userMessage) {
  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a helpful coding tutor." },
      { role: "user", content: userMessage },
    ],
    stream: true,
  });

  let fullResponse = "";

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      process.stdout.write(content); // Print without newline
      fullResponse += content;
    }
  }

  console.log("\n\n--- Stream complete ---");
  return fullResponse;
}

await streamChat("Explain the CSS box model in simple terms.");
```

### Python

```python
from openai import OpenAI

client = OpenAI()

def stream_chat(user_message: str) -> str:
    stream = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a helpful coding tutor."},
            {"role": "user", "content": user_message}
        ],
        stream=True
    )

    full_response = ""

    for chunk in stream:
        content = chunk.choices[0].delta.content
        if content:
            print(content, end="", flush=True)
            full_response += content

    print("\n\n--- Stream complete ---")
    return full_response

stream_chat("Explain the CSS box model in simple terms.")
```

---

## Handling the Stream Lifecycle

Each chunk in the stream has a `finish_reason` field. Understanding these helps you handle edge cases:

```javascript
for await (const chunk of stream) {
  const choice = chunk.choices[0];

  if (choice.finish_reason === "stop") {
    console.log("\n[Model finished naturally]");
    break;
  }

  if (choice.finish_reason === "length") {
    console.log("\n[Response hit max_tokens limit]");
    break;
  }

  if (choice.finish_reason === "tool_calls") {
    console.log("\n[Model wants to call a tool]");
    // Handle tool calls (covered in the next lesson)
    break;
  }

  const content = choice.delta?.content;
  if (content) {
    process.stdout.write(content);
  }
}
```

---

## Streaming to a Web Frontend

This is where streaming really shines. Let us build a complete server-to-browser streaming pipeline.

### Step 1: Express Server with SSE Endpoint

```javascript
// server.js
import express from "express";
import OpenAI from "openai";
import cors from "cors";

const app = express();
const openai = new OpenAI();

app.use(cors());
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  // Set headers for Server-Sent Events
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant for web developers.",
        },
        { role: "user", content: message },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        // Send each chunk as an SSE event
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Signal stream completion
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    console.error("Stream error:", error);
    res.write(
      `data: ${JSON.stringify({ error: "Something went wrong" })}\n\n`
    );
    res.end();
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
```

### Step 2: Frontend Consumer with EventSource / fetch

Using the Fetch API with a readable stream (more control than EventSource for POST requests):

```javascript
// client.js -- runs in the browser

async function streamResponse(userMessage) {
  const outputElement = document.getElementById("ai-response");
  outputElement.textContent = "";

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: userMessage }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    // SSE format: each event is "data: {...}\n\n"
    const lines = text.split("\n").filter((line) => line.startsWith("data: "));

    for (const line of lines) {
      const jsonStr = line.slice(6); // Remove "data: " prefix
      try {
        const data = JSON.parse(jsonStr);

        if (data.done) {
          console.log("Stream complete");
          return;
        }

        if (data.error) {
          outputElement.textContent += `\nError: ${data.error}`;
          return;
        }

        if (data.content) {
          outputElement.textContent += data.content;
        }
      } catch (e) {
        // Skip malformed JSON (can happen with chunk splitting)
      }
    }
  }
}

> **Production warning:** This simplified parser can break when SSE events are split across chunk boundaries. For production use, consider the `eventsource-parser` npm package which handles partial events correctly.

// Usage
document
  .getElementById("send-btn")
  .addEventListener("click", () => {
    const input = document.getElementById("user-input");
    streamResponse(input.value);
  });
```

### Step 3: Simple HTML Page

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Chat - Streaming Demo</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      max-width: 700px;
      margin: 2rem auto;
      padding: 0 1rem;
      background: #1a1a1a;
      color: #e0e0e0;
    }
    #ai-response {
      white-space: pre-wrap;
      background: #2a2a2a;
      padding: 1.5rem;
      border-radius: 8px;
      min-height: 100px;
      margin-top: 1rem;
      line-height: 1.6;
    }
    input {
      width: 70%;
      padding: 0.75rem;
      border-radius: 6px;
      border: 1px solid #444;
      background: #2a2a2a;
      color: #e0e0e0;
      font-size: 1rem;
    }
    button {
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      border: none;
      background: #7D4E21;
      color: white;
      font-size: 1rem;
      cursor: pointer;
    }
    button:hover { background: #AE8156; }
  </style>
</head>
<body>
  <h1>AI Chat (Streaming)</h1>
  <div>
    <input type="text" id="user-input" placeholder="Ask a coding question..." />
    <button id="send-btn">Send</button>
  </div>
  <div id="ai-response">Response will appear here...</div>
  <script src="client.js"></script>
</body>
</html>
```

---

## Python: Streaming with FastAPI

If your backend is Python, FastAPI has excellent streaming support:

```python
# server.py
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import json

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
client = OpenAI()

class ChatRequest(BaseModel):
    message: str

@app.post("/api/chat")
async def chat_stream(req: ChatRequest):
    def generate():
        stream = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": req.message}
            ],
            stream=True
        )

        for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                yield f"data: {json.dumps({'content': content})}\n\n"

        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )
```

Run it:

```bash
pip install fastapi uvicorn
uvicorn server:app --reload --port 3000
```

---

## Advanced: Collecting Token Usage from Streams

One downside of streaming is that you do not get `usage` data in each chunk by default. As of 2024, OpenAI added `stream_options` to fix this:

```javascript
const stream = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello" }],
  stream: true,
  stream_options: {
    include_usage: true,
  },
});

let usage = null;

for await (const chunk of stream) {
  if (chunk.usage) {
    // This appears in the final chunk
    usage = chunk.usage;
  }

  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    process.stdout.write(content);
  }
}

console.log("\nToken usage:", usage);
// { prompt_tokens: 9, completion_tokens: 42, total_tokens: 51 }
```

```python
stream = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
    stream=True,
    stream_options={"include_usage": True}
)

usage = None

for chunk in stream:
    if chunk.usage:
        usage = chunk.usage

    content = chunk.choices[0].delta.content
    if content:
        print(content, end="", flush=True)

print(f"\nTokens: {usage}")
```

---

## Handling Streaming Errors Gracefully

Streams can fail mid-response. Your code needs to handle disconnections, timeouts, and API errors:

```javascript
async function resilientStream(messages, maxRetries = 2) {
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        stream: true,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          process.stdout.write(content);
          fullResponse += content;
        }
      }

      return fullResponse;
    } catch (error) {
      attempt++;
      console.error(`\nStream failed (attempt ${attempt}):`, error.message);

      if (attempt > maxRetries) {
        throw new Error(
          `Stream failed after ${maxRetries + 1} attempts: ${error.message}`
        );
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
```

---

## Streaming with Abort Control

In a web app, users might navigate away or cancel a request. Use `AbortController` to clean up:

### Server-Side (Node.js)

```javascript
app.post("/api/chat", async (req, res) => {
  const controller = new AbortController();

  // If client disconnects, abort the OpenAI request
  req.on("close", () => {
    controller.abort();
    console.log("Client disconnected, aborting stream");
  });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await openai.chat.completions.create(
      {
        model: "gpt-4o",
        messages: [{ role: "user", content: req.body.message }],
        stream: true,
      },
      { signal: controller.signal }
    );

    for await (const chunk of stream) {
      if (controller.signal.aborted) break;

      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("Stream error:", error);
      res.write(
        `data: ${JSON.stringify({ error: "Stream failed" })}\n\n`
      );
    }
    res.end();
  }
});
```

### Client-Side (Browser)

```javascript
let currentController = null;

async function streamWithCancel(userMessage) {
  // Cancel any existing stream
  if (currentController) {
    currentController.abort();
  }

  currentController = new AbortController();
  const output = document.getElementById("ai-response");
  output.textContent = "";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage }),
      signal: currentController.signal,
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text
        .split("\n")
        .filter((l) => l.startsWith("data: "));

      for (const line of lines) {
        const data = JSON.parse(line.slice(6));
        if (data.content) {
          output.textContent += data.content;
        }
      }
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      output.textContent += "\n[Error: Stream failed]";
    }
  } finally {
    currentController = null;
  }
}

// Cancel button
document.getElementById("cancel-btn").addEventListener("click", () => {
  if (currentController) {
    currentController.abort();
    console.log("Stream cancelled by user");
  }
});
```

---

## Key Takeaways

1. **Streaming transforms user experience.** First-token latency drops from seconds to milliseconds, making AI features feel responsive.
2. **SSE is the underlying protocol.** Server-Sent Events send `data: {...}\n\n` formatted chunks over a single HTTP connection.
3. **The SDK handles the hard parts.** Use `stream: true` and iterate with `for await...of` (JS) or `for...in` (Python).
4. **Delta, not message.** Streaming chunks use `delta.content` instead of `message.content`. Build the full response by concatenating.
5. **Always handle stream interruptions.** Network errors, user cancellation, and timeouts can happen mid-stream.
6. **Use `stream_options: { include_usage: true }`** to get token counts from streaming responses.
7. **AbortController is essential for production.** Clean up server resources when clients disconnect.

---

## Try It Yourself

1. **Console Streamer**: Write a Node.js script that streams a response to the terminal character by character. Compare the experience to a non-streaming call.

2. **Build the Full Stack Demo**: Take the Express + HTML example from this lesson and get it running locally. Modify the system prompt and styling to match your own project.

3. **Typing Indicator**: Enhance the frontend to show a blinking cursor or "typing..." indicator while the stream is active, and hide it when complete.

4. **Stream vs. Non-Stream Benchmark**: Time both approaches for the same prompt. Measure time-to-first-token (streaming) vs. time-to-complete-response (non-streaming). Log the results.

5. **Cancel Button**: Implement the abort controller pattern and verify that cancelling a stream actually stops the OpenAI request (check your API usage dashboard to confirm tokens stop being consumed).

---

> **Library alternative:** The [Vercel AI SDK](https://sdk.vercel.ai/) (`ai` package) abstracts much of this streaming plumbing for Next.js apps. We teach the fundamentals here so you understand what's happening under the hood, but in production many teams use the AI SDK for convenience.

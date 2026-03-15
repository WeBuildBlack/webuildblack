---
title: "Chat Completions API"
estimatedMinutes: 60
---

# Chat Completions API

Welcome to the OpenAI API deep dive. If you have been experimenting with ChatGPT through the browser, you already understand the power of large language models. Now it is time to move that power into your own applications. In this lesson, you will learn how to set up the OpenAI SDK, make your first API call, and master the parameters that control how the model generates responses.

By the end of this lesson, you will be able to integrate OpenAI's Chat Completions API into any web application you build.

---

## Prerequisites

Before we start, make sure you have:

- An OpenAI account with API access at [platform.openai.com](https://platform.openai.com)
- An API key generated from the API Keys section of your dashboard
- Node.js 18+ or Python 3.9+ installed
- A basic understanding of REST APIs and async/await patterns

---

## Setting Up the OpenAI SDK

### JavaScript / TypeScript

Install the official OpenAI package:

```bash
npm install openai
```

Initialize the client:

```javascript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

**Important**: Never hardcode your API key. Always use environment variables. Create a `.env` file for local development:

```bash
# .env
OPENAI_API_KEY=sk-proj-your-key-here
```

If you are using Node.js, load environment variables with `dotenv`:

```bash
npm install dotenv
```

```javascript
import "dotenv/config";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

### Python

Install the official package:

```bash
pip install openai python-dotenv
```

Initialize the client:

```python
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
```

---

## Your First Chat Completion

The Chat Completions API works with a conversation model. You send a list of messages, and the model returns a response. Each message has a **role** and **content**.

### The Three Roles

| Role        | Purpose                                                        |
| ----------- | -------------------------------------------------------------- |
| `system`    | Sets the behavior and personality of the assistant             |
| `user`      | Represents the human sending a message                         |
| `assistant` | Represents previous responses from the model (for context)     |

### JavaScript Example

```javascript
import OpenAI from "openai";

const openai = new OpenAI();

async function askQuestion(question) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful coding tutor who explains concepts clearly with examples.",
      },
      {
        role: "user",
        content: question,
      },
    ],
  });

  return response.choices[0].message.content;
}

const answer = await askQuestion("What is a closure in JavaScript?");
console.log(answer);
```

### Python Example

```python
from openai import OpenAI

client = OpenAI()

def ask_question(question: str) -> str:
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": "You are a helpful coding tutor who explains concepts clearly with examples."
            },
            {
                "role": "user",
                "content": question
            }
        ]
    )
    return response.choices[0].message.content

answer = ask_question("What is a closure in JavaScript?")
print(answer)
```

---

## Understanding the Response Object

When you make a Chat Completions call, you get back a structured response. Here is what it looks like:

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1709558400,
  "model": "gpt-4o-2024-08-06",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "A closure is a function that remembers..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 32,
    "completion_tokens": 245,
    "total_tokens": 277
  }
}
```

Key fields to know:

- **`choices[0].message.content`** -- The actual text response from the model.
- **`choices[0].finish_reason`** -- Why the model stopped generating. Common values: `"stop"` (natural end), `"length"` (hit token limit), `"tool_calls"` (model wants to call a function).
- **`usage`** -- Token counts that determine your API cost. Always track this in production.

---

## Mastering the Parameters

The real power of the API comes from tuning the parameters. These knobs let you control creativity, length, and reliability.

### `temperature` (0 to 2, default: 1)

Controls randomness. Lower values make output more deterministic and focused. Higher values make output more creative and varied.

```javascript
// Deterministic -- good for code generation, data extraction, classification
const precise = await openai.chat.completions.create({
  model: "gpt-4o",
  temperature: 0,
  messages: [
    {
      role: "user",
      content: "Convert this date to ISO 8601: March 4, 2026",
    },
  ],
});

// Creative -- good for brainstorming, storytelling, marketing copy
const creative = await openai.chat.completions.create({
  model: "gpt-4o",
  temperature: 1.2,
  messages: [
    {
      role: "user",
      content: "Write a tagline for a coding bootcamp for the Black community",
    },
  ],
});
```

**When to use what:**

| Temperature | Use Case                                        |
| ----------- | ----------------------------------------------- |
| 0           | Code generation, data extraction, math          |
| 0.3 - 0.5  | Technical writing, summarization                |
| 0.7 - 1.0  | Conversational AI, general Q&A                  |
| 1.0 - 1.5  | Creative writing, brainstorming                 |

### `max_tokens` (integer)

The maximum number of tokens the model can generate in its response. This does NOT include the tokens in your prompt -- it only caps the output.

```javascript
// Short response -- good for classifications or yes/no answers
const short = await openai.chat.completions.create({
  model: "gpt-4o",
  max_tokens: 50,
  messages: [
    {
      role: "user",
      content: "Is JavaScript dynamically typed? Answer in one sentence.",
    },
  ],
});

// Longer response -- good for explanations, articles, code
const detailed = await openai.chat.completions.create({
  model: "gpt-4o",
  max_tokens: 2000,
  messages: [
    {
      role: "user",
      content: "Explain the event loop in Node.js with code examples.",
    },
  ],
});
```

**Pro tip**: Always set `max_tokens` in production. Without it, a runaway response could eat through your budget. Check `finish_reason` -- if it equals `"length"`, your response was cut off and you may need a higher limit.

> **Note for reasoning models:** OpenAI's reasoning models (`o1`, `o3-mini`) use `max_completion_tokens` instead of `max_tokens`, and do not support `temperature`, `top_p`, `frequency_penalty`, or `presence_penalty`. Always check the model's supported parameters.

### `top_p` (0 to 1, default: 1)

Also called "nucleus sampling." Instead of considering all possible next tokens, the model only considers tokens whose cumulative probability adds up to `top_p`.

```python
# Only consider the top 10% most likely tokens
response = client.chat.completions.create(
    model="gpt-4o",
    top_p=0.1,
    messages=[
        {"role": "user", "content": "What is the capital of France?"}
    ]
)
```

**OpenAI recommends**: Adjust either `temperature` OR `top_p`, not both at the same time. They control similar aspects of randomness and combining them can produce unpredictable results.

### `response_format` (Structured Outputs)

OpenAI supports structured output modes that constrain the model to produce valid JSON. Use `response_format: { type: 'json_object' }` for basic JSON mode (the model will always return valid JSON), or `response_format: { type: 'json_schema', json_schema: {...} }` for strict structured outputs where the response is guaranteed to match your exact schema. Structured outputs are especially useful for data extraction, classification, and any pipeline where you need to parse the model's response programmatically. See Module 02 Lesson 04 for a deeper dive on prompt engineering for structured outputs.

### `frequency_penalty` (-2 to 2, default: 0)

Penalizes tokens based on how often they have already appeared in the response. Positive values reduce repetition.

```javascript
const noRepeat = await openai.chat.completions.create({
  model: "gpt-4o",
  frequency_penalty: 0.8,
  messages: [
    {
      role: "user",
      content: "List 10 different ways to learn programming",
    },
  ],
});
```

### `presence_penalty` (-2 to 2, default: 0)

Penalizes tokens based on whether they have appeared at all (regardless of frequency). Positive values encourage the model to talk about new topics.

```javascript
const exploratory = await openai.chat.completions.create({
  model: "gpt-4o",
  presence_penalty: 0.6,
  messages: [
    {
      role: "user",
      content: "Tell me about the history of programming languages",
    },
  ],
});
```

---

## Multi-Turn Conversations

Real applications need conversation history. The API is stateless -- you must send the full conversation each time.

### JavaScript: Building a Conversation

```javascript
import OpenAI from "openai";
import readline from "readline";

const openai = new OpenAI();

const conversationHistory = [
  {
    role: "system",
    content:
      "You are a patient coding mentor. You help web developers learn new concepts step by step.",
  },
];

async function chat(userMessage) {
  conversationHistory.push({
    role: "user",
    content: userMessage,
  });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: conversationHistory,
    temperature: 0.7,
    max_tokens: 1000,
  });

  const assistantMessage = response.choices[0].message.content;

  conversationHistory.push({
    role: "assistant",
    content: assistantMessage,
  });

  return assistantMessage;
}

// Example usage
console.log(await chat("What is a Promise in JavaScript?"));
console.log(await chat("Can you show me an example with fetch?"));
console.log(await chat("How does async/await relate to this?"));
```

### Python: Building a Conversation

```python
from openai import OpenAI

client = OpenAI()

conversation_history = [
    {
        "role": "system",
        "content": "You are a patient coding mentor. You help web developers learn new concepts step by step."
    }
]

def chat(user_message: str) -> str:
    conversation_history.append({
        "role": "user",
        "content": user_message
    })

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=conversation_history,
        temperature=0.7,
        max_tokens=1000
    )

    assistant_message = response.choices[0].message.content
    conversation_history.append({
        "role": "assistant",
        "content": assistant_message
    })

    return assistant_message

# Example usage
print(chat("What is a Promise in JavaScript?"))
print(chat("Can you show me an example with fetch?"))
print(chat("How does async/await relate to this?"))
```

**Watch out for context limits**: As conversations grow, you will hit the model's context window. Strategies to handle this:

1. **Truncate old messages** -- Remove the earliest user/assistant pairs, but keep the system message.
2. **Summarize** -- Periodically summarize the conversation and replace old messages with the summary.
3. **Sliding window** -- Keep only the last N message pairs.

---

## Choosing the Right Model

OpenAI offers multiple models at different price and capability tiers:

| Model       | Best For                              | Context Window | Relative Cost |
| ----------- | ------------------------------------- | -------------- | ------------- |
| `gpt-4o`    | Complex reasoning, code, analysis     | 128K tokens    | $$            |
| `gpt-4o-mini` | Fast, cheap, good for simple tasks  | 128K tokens    | $             |
| `o1`        | Deep reasoning, math, science         | 200K tokens    | $$$           |
| `o3-mini`   | Reasoning tasks on a budget           | 200K tokens    | $$            |

Start with `gpt-4o-mini` for development and prototyping. Move to `gpt-4o` when you need higher quality. Use reasoning models (`o1`, `o3-mini`) only for tasks that genuinely require multi-step reasoning.

---

## Error Handling in Production

Always wrap API calls in proper error handling. The OpenAI SDK throws specific error types you can catch:

### JavaScript

```javascript
import OpenAI from "openai";

const openai = new OpenAI();

async function safeChatCompletion(messages, retries = 3) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 1000,
    });
    return { success: true, content: response.choices[0].message.content };
  } catch (error) {
    if (error instanceof OpenAI.RateLimitError) {
      if (retries <= 0) throw error;
      console.error(`Rate limited. Waiting before retry... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return safeChatCompletion(messages, retries - 1);
    }

    if (error instanceof OpenAI.AuthenticationError) {
      console.error("Invalid API key. Check your OPENAI_API_KEY.");
      return { success: false, error: "Authentication failed" };
    }

    if (error instanceof OpenAI.BadRequestError) {
      console.error("Bad request:", error.message);
      return { success: false, error: error.message };
    }

    console.error("Unexpected error:", error);
    return { success: false, error: "Something went wrong" };
  }
}
```

### Python

```python
from openai import OpenAI, RateLimitError, AuthenticationError, BadRequestError
import time

client = OpenAI()

def safe_chat_completion(messages: list, retries: int = 1) -> dict:
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=1000
        )
        return {"success": True, "content": response.choices[0].message.content}

    except RateLimitError:
        if retries > 0:
            print("Rate limited. Waiting before retry...")
            time.sleep(5)
            return safe_chat_completion(messages, retries - 1)
        return {"success": False, "error": "Rate limit exceeded"}

    except AuthenticationError:
        print("Invalid API key. Check your OPENAI_API_KEY.")
        return {"success": False, "error": "Authentication failed"}

    except BadRequestError as e:
        print(f"Bad request: {e.message}")
        return {"success": False, "error": e.message}

    except Exception as e:
        print(f"Unexpected error: {e}")
        return {"success": False, "error": "Something went wrong"}
```

---

## Practical Example: AI-Powered FAQ Bot

Let us put it all together by building a simple FAQ bot for a web application:

```javascript
import OpenAI from "openai";

const openai = new OpenAI();

const FAQ_CONTEXT = `
You are the FAQ assistant for We Build Black, a nonprofit that empowers
the Black community through technical education. Answer questions about
our programs: Fast Track (workforce training), Crowns of Code (youth coding),
and Mavens I/O (annual conference). If you don't know the answer, say so
honestly and suggest contacting info@webuildblack.com.
`;

async function answerFAQ(question) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    max_tokens: 500,
    messages: [
      { role: "system", content: FAQ_CONTEXT },
      { role: "user", content: question },
    ],
  });

  return {
    answer: response.choices[0].message.content,
    tokensUsed: response.usage.total_tokens,
  };
}

// Test it
const result = await answerFAQ("What is Fast Track?");
console.log(result.answer);
console.log(`Tokens used: ${result.tokensUsed}`);
```

---

## Key Takeaways

1. **The Chat Completions API is conversation-based.** You send an array of messages with roles (`system`, `user`, `assistant`) and the model responds.
2. **Always use environment variables for API keys.** Never hardcode secrets in your source code.
3. **`temperature` controls creativity.** Use 0 for deterministic tasks, 0.7-1.0 for conversational applications.
4. **Set `max_tokens` in production.** This prevents runaway responses and keeps costs predictable.
5. **The API is stateless.** You must send the full conversation history with every request.
6. **Handle errors gracefully.** Rate limits, auth errors, and bad requests all need specific handling.
7. **Choose the right model for the job.** Start cheap with `gpt-4o-mini`, scale up to `gpt-4o` when needed.

---

## Try It Yourself

1. **Hello World**: Set up the OpenAI SDK and make your first Chat Completions call. Try changing the system message to give the assistant a different personality.

2. **Temperature Experiment**: Ask the same question five times at `temperature: 0` and then five times at `temperature: 1.5`. Compare the variation in responses.

3. **Build a Mini Chatbot**: Create a command-line chatbot that maintains conversation history. Try asking follow-up questions and see how context affects the responses.

4. **Token Tracker**: Modify the FAQ bot example to log `usage.prompt_tokens` and `usage.completion_tokens` for each request. Run 10 different questions and calculate the total cost using OpenAI's pricing page.

5. **Error Handling Practice**: Intentionally trigger errors (invalid API key, empty messages array, exceeding context length) and verify your error handling catches each one.

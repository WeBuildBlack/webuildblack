---
title: "Anthropic Messages API"
estimatedMinutes: 60
---

# Anthropic Messages API

You have worked with OpenAI. Now it is time to learn Anthropic's API and Claude models. Why learn both? Because in production AI engineering, you want options. Different models excel at different tasks, and knowing multiple APIs lets you route work to the best tool for the job.

Claude is known for strong instruction following, careful reasoning, long-context handling, and a design philosophy centered on safety and helpfulness. In this lesson, you will set up the Anthropic SDK, understand the Messages API structure, master system prompts, and build your first Claude-powered features.

---

## Setting Up the Anthropic SDK

### Get Your API Key

1. Create an account at [console.anthropic.com](https://console.anthropic.com)
2. Navigate to API Keys in your account settings
3. Generate a new API key
4. Store it securely in your environment variables

### JavaScript / TypeScript

```bash
npm install @anthropic-ai/sdk
```

```javascript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

With dotenv for local development:

```javascript
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

### Python

```bash
pip install anthropic python-dotenv
```

```python
import os
from dotenv import load_dotenv
import anthropic

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
```

**Note**: Like OpenAI, the Anthropic SDK will automatically look for the `ANTHROPIC_API_KEY` environment variable if you do not pass it explicitly. So `anthropic.Anthropic()` works if the env var is set.

---

## Your First Message

The Anthropic Messages API has a similar concept to OpenAI's Chat Completions but with some important structural differences.

### JavaScript

```javascript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

async function askClaude(question) {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: question,
      },
    ],
  });

  return message.content[0].text;
}

const answer = await askClaude("What is a closure in JavaScript?");
console.log(answer);
```

### Python

```python
import anthropic

client = anthropic.Anthropic()

def ask_claude(question: str) -> str:
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[
            {"role": "user", "content": question}
        ]
    )
    return message.content[0].text

answer = ask_claude("What is a closure in JavaScript?")
print(answer)
```

---

## Key Differences from OpenAI

Before going further, let us clarify the structural differences between the two APIs. Understanding these will save you debugging time.

### 1. System Prompt Is a Separate Parameter

In OpenAI, the system prompt is a message with `role: "system"` in the messages array. In Anthropic, it is a **top-level parameter**:

```javascript
// OpenAI style (system message in the array)
const openaiMessages = [
  { role: "system", content: "You are a helpful tutor." },
  { role: "user", content: "Explain async/await." },
];

// Anthropic style (system is a separate parameter)
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  system: "You are a helpful tutor.",
  messages: [
    { role: "user", content: "Explain async/await." },
  ],
});
```

### 2. `max_tokens` Is Required

OpenAI defaults `max_tokens` to the model's maximum. Anthropic **requires** you to specify it. If you forget, you get an error.

```javascript
// This will fail -- max_tokens is required
await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  messages: [{ role: "user", content: "Hello" }],
}); // Error!

// This works
await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello" }],
});
```

### 3. Response Structure Differs

The response format is different from OpenAI:

```json
{
  "id": "msg_abc123",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "A closure is a function that remembers..."
    }
  ],
  "model": "claude-sonnet-4-20250514",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 25,
    "output_tokens": 150
  }
}
```

Key differences:
- **`content` is an array** of content blocks, not a single string. This allows mixed content (text + tool use) in one response.
- **`stop_reason`** instead of `finish_reason`. Values: `"end_turn"`, `"max_tokens"`, `"stop_sequence"`, `"tool_use"`.
- **`usage`** uses `input_tokens`/`output_tokens` instead of `prompt_tokens`/`completion_tokens`.

### 4. Messages Must Alternate Roles

Anthropic requires strict alternation between `user` and `assistant` roles. You cannot have two consecutive `user` messages:

```javascript
// This will fail -- two user messages in a row
const bad = [
  { role: "user", content: "Hello" },
  { role: "user", content: "How are you?" }, // Error!
];

// This works -- alternating roles
const good = [
  { role: "user", content: "Hello" },
  { role: "assistant", content: "Hi there! How can I help you?" },
  { role: "user", content: "How are you?" },
];
```

If you need to combine multiple user inputs, concatenate them into a single message.

---

## Mastering System Prompts

System prompts in Claude are powerful. They set the identity, rules, and behavior of the assistant. Claude is known for following system prompt instructions carefully, which makes this a critical skill.

### Basic System Prompt

```javascript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  system:
    "You are a senior JavaScript developer conducting a code review. Be thorough but constructive. Point out bugs, suggest improvements, and explain your reasoning.",
  messages: [
    {
      role: "user",
      content: `Review this code:\n\nfunction add(a, b) {\n  return a + b;\n}\n\nconsole.log(add("5", 3));`,
    },
  ],
});
```

### Structured System Prompts

For complex behaviors, use structured system prompts with clear sections:

```javascript
const systemPrompt = `You are the AI teaching assistant for We Build Black's web development course.

## Your Role
- Help students understand JavaScript, HTML, CSS, and web development concepts
- Provide clear explanations with practical code examples
- Encourage students and celebrate their progress
- If a student is stuck, guide them with questions rather than giving the answer directly

## Response Format
- Use markdown formatting for code blocks and emphasis
- Keep explanations under 300 words unless the student asks for more detail
- Always include a runnable code example when explaining a concept
- End each response with a follow-up question to check understanding

## Rules
- Never write complete homework solutions -- guide the student to the answer
- If asked about something outside web development, politely redirect
- Use inclusive, encouraging language
- If you are not sure about something, say so honestly`;

const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  system: systemPrompt,
  messages: [
    {
      role: "user",
      content: "I don't understand why my fetch call isn't working. It just hangs.",
    },
  ],
});
```

### Multi-Block System Prompts

Anthropic supports an array format for system prompts, which is useful for separating instructions from cached context:

```javascript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  system: [
    {
      type: "text",
      text: "You are a helpful coding assistant.",
    },
    {
      type: "text",
      text: "Here is the project's documentation:\n\n" + projectDocs,
      cache_control: { type: "ephemeral" },
    },
  ],
  messages: [
    { role: "user", content: "How do I set up the database connection?" },
  ],
});
```

The `cache_control` flag tells Anthropic to cache that block, reducing costs for repeated calls with the same documentation context (more on this in Lesson 03).

---

## Multi-Turn Conversations

Building conversations with Claude follows the same pattern as OpenAI -- you maintain a messages array and send the full history with each request.

### JavaScript Conversation Manager

```javascript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

class ClaudeConversation {
  constructor(systemPrompt, model = "claude-sonnet-4-20250514") {
    this.model = model;
    this.systemPrompt = systemPrompt;
    this.messages = [];
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
  }

  async send(userMessage) {
    this.messages.push({
      role: "user",
      content: userMessage,
    });

    const response = await anthropic.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: this.systemPrompt,
      messages: this.messages,
    });

    const assistantText = response.content[0].text;

    this.messages.push({
      role: "assistant",
      content: assistantText,
    });

    // Track token usage
    this.totalInputTokens += response.usage.input_tokens;
    this.totalOutputTokens += response.usage.output_tokens;

    return {
      text: assistantText,
      stopReason: response.stop_reason,
      usage: response.usage,
    };
  }

  getTokenUsage() {
    return {
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      messageCount: this.messages.length,
    };
  }

  reset() {
    this.messages = [];
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
  }
}

// Usage
const tutor = new ClaudeConversation(
  "You are a patient JavaScript tutor. Use simple language and practical examples."
);

const r1 = await tutor.send("What is the DOM?");
console.log(r1.text);

const r2 = await tutor.send("How do I select an element by its ID?");
console.log(r2.text);

const r3 = await tutor.send("Can you show me how to change its text content?");
console.log(r3.text);

console.log("Token usage:", tutor.getTokenUsage());
```

### Python Conversation Manager

```python
import anthropic

client = anthropic.Anthropic()

class ClaudeConversation:
    def __init__(self, system_prompt: str, model: str = "claude-sonnet-4-20250514"):
        self.model = model
        self.system_prompt = system_prompt
        self.messages = []
        self.total_input_tokens = 0
        self.total_output_tokens = 0

    def send(self, user_message: str) -> dict:
        self.messages.append({
            "role": "user",
            "content": user_message
        })

        response = client.messages.create(
            model=self.model,
            max_tokens=2048,
            system=self.system_prompt,
            messages=self.messages
        )

        assistant_text = response.content[0].text

        self.messages.append({
            "role": "assistant",
            "content": assistant_text
        })

        self.total_input_tokens += response.usage.input_tokens
        self.total_output_tokens += response.usage.output_tokens

        return {
            "text": assistant_text,
            "stop_reason": response.stop_reason,
            "usage": response.usage
        }

    def get_token_usage(self) -> dict:
        return {
            "total_input_tokens": self.total_input_tokens,
            "total_output_tokens": self.total_output_tokens,
            "message_count": len(self.messages)
        }

# Usage
tutor = ClaudeConversation(
    "You are a patient JavaScript tutor. Use simple language and practical examples."
)

r1 = tutor.send("What is the DOM?")
print(r1["text"])

r2 = tutor.send("How do I select an element by its ID?")
print(r2["text"])
```

---

## Streaming with Claude

Streaming works similarly to OpenAI but with slightly different event types:

### JavaScript

```javascript
const stream = anthropic.messages.stream({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  system: "You are a helpful coding assistant.",
  messages: [
    { role: "user", content: "Write a quicksort function in JavaScript." },
  ],
});

for await (const event of stream) {
  if (
    event.type === "content_block_delta" &&
    event.delta.type === "text_delta"
  ) {
    process.stdout.write(event.delta.text);
  }
}

// Get the final message with usage stats
const finalMessage = await stream.finalMessage();
console.log("\nUsage:", finalMessage.usage);
```

### Python

```python
with client.messages.stream(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    system="You are a helpful coding assistant.",
    messages=[
        {"role": "user", "content": "Write a quicksort function in JavaScript."}
    ]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)

# Access the final message
final = stream.get_final_message()
print(f"\nUsage: {final.usage}")
```

---

## Error Handling

The Anthropic SDK raises specific exceptions you should handle:

### JavaScript

```javascript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

async function safeClaudeCall(messages, system = "") {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system,
      messages,
    });

    return { success: true, content: response.content[0].text };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      console.error("Rate limited. Implement backoff.");
      return { success: false, error: "Rate limit exceeded", retryable: true };
    }

    if (error instanceof Anthropic.AuthenticationError) {
      console.error("Invalid API key.");
      return { success: false, error: "Authentication failed", retryable: false };
    }

    if (error instanceof Anthropic.BadRequestError) {
      console.error("Bad request:", error.message);
      return { success: false, error: error.message, retryable: false };
    }

    if (error instanceof Anthropic.APIError) {
      console.error("API error:", error.status, error.message);
      return {
        success: false,
        error: error.message,
        retryable: error.status >= 500,
      };
    }

    throw error; // Unexpected error
  }
}
```

### Python

```python
import anthropic

client = anthropic.Anthropic()

def safe_claude_call(messages: list, system: str = "") -> dict:
    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=system,
            messages=messages
        )
        return {"success": True, "content": response.content[0].text}

    except anthropic.RateLimitError:
        print("Rate limited. Implement backoff.")
        return {"success": False, "error": "Rate limit exceeded", "retryable": True}

    except anthropic.AuthenticationError:
        print("Invalid API key.")
        return {"success": False, "error": "Authentication failed", "retryable": False}

    except anthropic.BadRequestError as e:
        print(f"Bad request: {e.message}")
        return {"success": False, "error": e.message, "retryable": False}

    except anthropic.APIError as e:
        print(f"API error: {e.status_code} {e.message}")
        return {"success": False, "error": e.message, "retryable": e.status_code >= 500}
```

---

## Practical Example: Course Content Generator

Let us build something relevant -- a tool that generates lesson outlines for WBB courses:

```javascript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

async function generateLessonOutline(topic, targetAudience, durationMinutes) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: `You are a curriculum designer for We Build Black, a nonprofit that teaches
technical skills to the Black community. You create engaging, practical lesson plans.

Your outlines should:
- Start with clear learning objectives
- Include hands-on exercises (not just theory)
- Use real-world examples relevant to the audience
- Build progressively from simple to complex
- Include estimated time for each section`,
    messages: [
      {
        role: "user",
        content: `Create a lesson outline for: "${topic}"
Target audience: ${targetAudience}
Duration: ${durationMinutes} minutes

Return the outline in markdown format.`,
      },
    ],
  });

  return {
    outline: response.content[0].text,
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
  };
}

const result = await generateLessonOutline(
  "Introduction to REST APIs",
  "Web development beginners with basic JavaScript knowledge",
  90
);

console.log(result.outline);
console.log(`\nTokens used: ${result.tokensUsed}`);
```

---

## Key Takeaways

1. **System prompts are a top-level parameter in Anthropic**, not a message in the array. This is the most common source of errors when switching from OpenAI.
2. **`max_tokens` is required.** Always specify it. Start with 1024 for short responses, 4096 for longer ones.
3. **Messages must alternate roles.** No two consecutive `user` or `assistant` messages. Concatenate if needed.
4. **Response content is an array.** Access text with `response.content[0].text`, not `response.content` directly.
5. **Claude excels at following detailed system prompts.** Invest time in writing structured, clear system prompts with explicit rules and format requirements.
6. **Track `input_tokens` and `output_tokens`** from the usage object for cost management.
7. **The SDKs are similar in spirit.** If you know one, you can learn the other quickly -- just watch for the structural differences outlined above.

---

## Try It Yourself

1. **Hello Claude**: Set up the Anthropic SDK and make your first Messages API call. Try different system prompts and see how they change Claude's behavior.

2. **Side-by-Side Comparison**: Send the same question to both OpenAI and Anthropic. Compare response quality, tone, and token usage. Document the structural differences you notice in the responses.

3. **Conversation Builder**: Build a multi-turn conversation with Claude that maintains context. Ask three related questions and verify that Claude references earlier parts of the conversation.

4. **System Prompt Engineering**: Write a system prompt for a code review assistant. Test it with three different code snippets -- a clean one, a buggy one, and an insecure one. Refine the system prompt based on the results.

5. **Error Handling Practice**: Intentionally trigger each error type (invalid API key, missing max_tokens, two consecutive user messages) and verify your error handling catches them with useful messages.

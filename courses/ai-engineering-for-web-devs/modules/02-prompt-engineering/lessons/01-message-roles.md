---
title: "Message Roles: System, User, and Assistant"
estimatedMinutes: 50
---

# Message Roles: System, User, and Assistant

Every modern LLM API structures conversations using **message roles**. If you've ever used ChatGPT, you've interacted with this system without seeing it -- but as a developer, you're going to control it directly. Understanding message roles is the foundation of prompt engineering. Get this right, and everything else becomes easier.

Think of it like HTTP. You could try to explain REST to someone by describing TCP/IP packets, but it makes more sense to start with GET, POST, PUT, DELETE. Message roles are the "HTTP methods" of LLM communication -- the basic vocabulary you'll use in every single API call.

---

## The Three Roles

Modern chat-based LLM APIs use three message roles:

### 1. System Message

The **system message** sets the stage. It tells the model who it is, how it should behave, and what constraints to follow. The model treats system messages as high-authority instructions.

```javascript
{
  role: 'system',
  content: `You are a senior JavaScript developer helping junior devs learn.
- Always explain your reasoning step by step
- Include code examples in every response
- If you're unsure about something, say so
- Never suggest deprecated APIs`
}
```

### 2. User Message

The **user message** is what the human (or your application on behalf of the human) sends. It contains the actual request, question, or input data.

```javascript
{
  role: 'user',
  content: 'How do I handle errors in async/await functions?'
}
```

### 3. Assistant Message

The **assistant message** is the model's response. In multi-turn conversations, you include previous assistant messages to give the model context about what it already said.

```javascript
{
  role: 'assistant',
  content: 'You can handle errors in async/await using try/catch blocks...'
}
```

### Putting It Together

A complete API call with all three roles:

```javascript
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    {
      role: 'system',
      content: 'You are a helpful coding tutor. Explain concepts simply with examples.',
    },
    {
      role: 'user',
      content: 'What is a closure in JavaScript?',
    },
    {
      role: 'assistant',
      content: 'A closure is a function that remembers variables from the scope where it was created, even after that scope has finished executing.',
    },
    {
      role: 'user',
      content: 'Can you show me a practical example?',
    },
  ],
});
```

```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "system",
            "content": "You are a helpful coding tutor. Explain concepts simply with examples.",
        },
        {
            "role": "user",
            "content": "What is a closure in JavaScript?",
        },
        {
            "role": "assistant",
            "content": "A closure is a function that remembers variables from the scope where it was created, even after that scope has finished executing.",
        },
        {
            "role": "user",
            "content": "Can you show me a practical example?",
        },
    ],
)
```

The model sees the entire conversation history and generates a response that's contextually aware of everything that came before.

---

## The System Message: Your Most Powerful Tool

The system message is where most of the prompt engineering magic happens. It's your chance to shape the model's behavior before the user says anything.

### What Goes in a System Message

A well-crafted system message typically includes:

1. **Identity/Role**: Who is the model supposed to be?
2. **Behavior rules**: How should it act?
3. **Output format**: How should responses be structured?
4. **Constraints**: What should it NOT do?
5. **Context/Knowledge**: Background information it needs

Here's a real-world example for a customer support bot:

```javascript
const systemPrompt = `You are a customer support agent for TechStore, an online electronics retailer.

## Your Role
- Help customers with order inquiries, returns, and product questions
- Be friendly, professional, and efficient
- Resolve issues on the first interaction whenever possible

## Rules
- NEVER make up order information. If you don't have the data, say so and offer to connect them with a human agent
- NEVER discuss competitor products or pricing
- Always confirm the customer's order number before looking up details
- If a customer is frustrated, acknowledge their feelings before problem-solving

## Response Format
- Keep responses concise (2-4 paragraphs max)
- Use bullet points for multiple items or steps
- End every response with a clear next step or question

## Available Actions
You can help with:
- Checking order status (ask for order number)
- Processing returns (within 30-day window)
- Answering product questions (based on provided catalog data)
- Escalating to human support (for billing disputes, damaged items)

## Tone
Professional but warm. Use contractions. No corporate jargon.`;
```

### System Message Patterns That Work

**Pattern 1: The Role + Rules Pattern**

```javascript
const systemPrompt = `You are [ROLE].

## Rules
1. [Rule 1]
2. [Rule 2]
3. [Rule 3]

## Output Format
[How to structure responses]`;
```

**Pattern 2: The Expert Persona**

```javascript
const systemPrompt = `You are a senior backend engineer with 15 years of experience in Node.js, PostgreSQL, and distributed systems. You're mentoring a junior developer.

When reviewing code:
- Point out bugs and security issues first
- Suggest improvements with clear explanations
- Show both the original and improved code
- Rate the overall quality on a scale of 1-10`;
```

**Pattern 3: The Constrained Assistant**

```javascript
const systemPrompt = `You are a JSON extraction assistant. Your ONLY job is to extract structured data from unstructured text.

RULES:
- ONLY respond with valid JSON. No explanations, no markdown, no additional text.
- If a field cannot be determined from the input, use null.
- Never invent or assume data that isn't explicitly stated in the input.

OUTPUT SCHEMA:
{
  "name": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "company": "string or null",
  "role": "string or null"
}`;
```

### System Messages Across Providers

Different providers handle system messages slightly differently:

**OpenAI (GPT-4o)**
```javascript
// System message is a regular message with role: 'system'
const messages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello!' },
];
```

**Anthropic (Claude)**
```python
# System message is a separate parameter, not in the messages array
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    system="You are a helpful assistant.",  # Separate parameter
    messages=[
        {"role": "user", "content": "Hello!"},
    ],
    max_tokens=1024,
)
```

```javascript
// Same in JavaScript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  system: 'You are a helpful assistant.',  // Separate parameter
  messages: [
    { role: 'user', content: 'Hello!' },
  ],
  max_tokens: 1024,
});
```

This is an important API difference to keep in mind when building abstractions that work across providers.

> **Note:** OpenAI also introduced a `developer` role that provides stronger instruction-following than `system`. The `developer` role is positioned between system and user authority, meaning the model treats developer messages with higher priority than user messages. If you're building applications where you need to ensure certain instructions can't be overridden by user input, consider using the `developer` role instead of or alongside `system`.

---

## Multi-Turn Conversations: Building Chat History

In a real chatbot, you need to manage conversation history. The model has no memory between API calls -- you must send the full conversation every time.

### The Basic Pattern

```javascript
class ChatSession {
  constructor(systemPrompt, model = 'gpt-4o') {
    this.model = model;
    this.messages = [
      { role: 'system', content: systemPrompt },
    ];
  }

  async sendMessage(userMessage) {
    // Add the user's message to history
    this.messages.push({ role: 'user', content: userMessage });

    // Send the FULL history to the API
    const response = await openai.chat.completions.create({
      model: this.model,
      messages: this.messages,
    });

    const assistantMessage = response.choices[0].message.content;

    // Add the assistant's response to history
    this.messages.push({ role: 'assistant', content: assistantMessage });

    return assistantMessage;
  }

  getHistory() {
    return this.messages;
  }
}

// Usage
const chat = new ChatSession(
  'You are a friendly coding tutor specializing in web development.'
);

const response1 = await chat.sendMessage('What is React?');
console.log(response1);  // Explains React

const response2 = await chat.sendMessage('How does it compare to Vue?');
console.log(response2);  // Compares React and Vue, knowing the context

const response3 = await chat.sendMessage('Which should I learn first?');
console.log(response3);  // Gives recommendation, aware of entire conversation
```

```python
class ChatSession:
    def __init__(self, system_prompt: str, model: str = "gpt-4o"):
        self.model = model
        self.messages = [
            {"role": "system", "content": system_prompt}
        ]

    async def send_message(self, user_message: str) -> str:
        self.messages.append({"role": "user", "content": user_message})

        response = client.chat.completions.create(
            model=self.model,
            messages=self.messages,
        )

        assistant_message = response.choices[0].message.content
        self.messages.append({"role": "assistant", "content": assistant_message})

        return assistant_message
```

### Why This Matters: The Model Sees Everything

Every API call sends the entire conversation. This means:

1. **Token costs grow with conversation length.** Turn 1 sends just the system prompt + user message. Turn 10 sends the system prompt + all 10 user messages + all 9 assistant responses. Costs accumulate.

2. **You control what the model "remembers."** You can edit, summarize, or remove messages from the history before sending.

3. **You can inject assistant messages.** You can pre-fill what the assistant "said" to steer future responses.

```javascript
// Injecting context by pre-filling assistant messages
const messages = [
  { role: 'system', content: 'You are a Python tutor.' },
  { role: 'user', content: 'Teach me about decorators.' },
  {
    role: 'assistant',
    content: 'Great question! Let\'s start with the basics. A decorator is a function that takes another function as an argument and extends its behavior. Here\'s a simple example...',
  },
  {
    role: 'user',
    content: 'Can decorators take arguments?',
  },
  // The model now continues the conversation naturally,
  // building on the "previous" explanation
];
```

---

## Conversation Design Patterns

### Pattern 1: Context Injection

Insert relevant data into the conversation as if the assistant already knows it:

```javascript
// Inject database context into the conversation
async function answerWithContext(question, userId) {
  const userProfile = await db.getUser(userId);
  const orderHistory = await db.getOrders(userId);

  const messages = [
    {
      role: 'system',
      content: `You are a support agent for an e-commerce platform.

The customer you're helping has the following profile:
- Name: ${userProfile.name}
- Member since: ${userProfile.joinDate}
- Loyalty tier: ${userProfile.tier}

Their recent orders:
${orderHistory.map(o => `- Order #${o.id}: ${o.items.join(', ')} (${o.status})`).join('\n')}

Use this information to provide personalized support.`,
    },
    { role: 'user', content: question },
  ];

  return await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
  });
}

// The model can now answer "Where is my latest order?"
// because it has the order data in context
```

### Pattern 2: Conversation Summarization

When conversations get long, summarize older messages to save tokens:

```javascript
async function summarizeHistory(messages) {
  // Keep system prompt and last N messages
  const systemMsg = messages[0];
  const recentMessages = messages.slice(-6);  // Keep last 3 exchanges
  const oldMessages = messages.slice(1, -6);

  if (oldMessages.length === 0) return messages;

  // Summarize the old messages
  const summaryResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',  // Use cheap model for summarization
    messages: [
      {
        role: 'system',
        content: 'Summarize this conversation concisely, preserving key facts, decisions, and context needed for continuation.',
      },
      {
        role: 'user',
        content: oldMessages.map(m => `${m.role}: ${m.content}`).join('\n'),
      },
    ],
    max_tokens: 500,
  });

  const summary = summaryResponse.choices[0].message.content;

  return [
    systemMsg,
    {
      role: 'system',
      content: `Previous conversation summary: ${summary}`,
    },
    ...recentMessages,
  ];
}
```

### Pattern 3: Guided Conversations

Use assistant message prefilling to create structured, multi-step interactions:

```javascript
// A structured intake form conversation
const intakeFlow = [
  {
    role: 'system',
    content: `You are an intake assistant. Collect the following information one question at a time:
1. Full name
2. Email address
3. Project description
4. Budget range
5. Timeline

After collecting all info, output a JSON summary.
Ask ONE question at a time. Be conversational and friendly.`,
  },
  {
    role: 'assistant',
    content: "Hey there! I'd love to learn about your project. Let's start with the basics -- what's your full name?",
  },
];

// The conversation is pre-seeded, and the model will follow
// the intake flow naturally from here
```

---

## Advanced: Prefilling and Steering

One powerful technique is **prefilling** the assistant's response to steer the model's output format or direction.

### Forcing JSON Output

```javascript
// OpenAI approach: use response_format
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    {
      role: 'system',
      content: 'Extract contact information as JSON.',
    },
    {
      role: 'user',
      content: 'My name is Jordan Lee, you can reach me at jordan@example.com or 555-0123.',
    },
  ],
  response_format: { type: 'json_object' },  // Forces JSON output
});
```

```python
# Anthropic approach: prefill the assistant message
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    system="Extract contact information as JSON.",
    messages=[
        {
            "role": "user",
            "content": "My name is Jordan Lee, you can reach me at jordan@example.com or 555-0123.",
        },
        {
            "role": "assistant",
            "content": "{",  # Prefill forces Claude to continue the JSON
        },
    ],
    max_tokens=1024,
)

# Claude will continue from "{" and produce valid JSON
result = "{" + response.content[0].text
```

### Steering Tone and Style

```javascript
// Prefilling to steer response style
const messages = [
  {
    role: 'system',
    content: 'You explain programming concepts.',
  },
  {
    role: 'user',
    content: 'Explain event-driven architecture.',
  },
  {
    role: 'assistant',
    content: 'Alright, let me break this down with a real-world analogy.\n\n',
    // By prefilling this, you steer the model toward an
    // accessible, analogy-driven explanation
  },
];
```

---

## Common Mistakes and How to Avoid Them

### Mistake 1: No System Message

```javascript
// Bad: No guidance for the model
const messages = [
  { role: 'user', content: 'Review this code: function add(a,b) { return a+b }' },
];

// Good: Clear system message with expectations
const messages = [
  {
    role: 'system',
    content: `You are a code reviewer. For each piece of code:
1. Identify any bugs or issues
2. Suggest improvements
3. Rate the code quality 1-10
Respond in markdown format.`,
  },
  { role: 'user', content: 'Review this code: function add(a,b) { return a+b }' },
];
```

### Mistake 2: System Message Too Vague

```javascript
// Bad: Too vague
{ role: 'system', content: 'Be helpful.' }

// Good: Specific and actionable
{
  role: 'system',
  content: `You are a JavaScript expert helping developers debug issues.
- Ask clarifying questions if the problem is unclear
- Always show code examples
- Explain what caused the bug and how to prevent it in the future
- If the issue might be a known browser/Node.js bug, mention it`
}
```

### Mistake 3: Growing Conversation Without Limits

```javascript
// Bad: History grows forever
class BadChat {
  async send(message) {
    this.messages.push({ role: 'user', content: message });
    const response = await api.call(this.messages);  // Eventually exceeds context limit!
    this.messages.push({ role: 'assistant', content: response });
  }
}

// Good: Manage history with token limits
class GoodChat {
  async send(message) {
    this.messages.push({ role: 'user', content: message });

    // Trim if needed
    const tokenCount = countMessageTokens(this.messages);
    if (tokenCount > this.maxContextTokens * 0.8) {
      this.messages = await summarizeHistory(this.messages);
    }

    const response = await api.call(this.messages);
    this.messages.push({ role: 'assistant', content: response });
  }
}
```

### Mistake 4: Inconsistent Role Ordering

```javascript
// Bad: Multiple user messages in a row
// For Anthropic's API, consecutive same-role messages will return an error.
// Messages must alternate between `user` and `assistant`. OpenAI's API is more
// lenient but alternation is still a best practice.
const messages = [
  { role: 'user', content: 'Here is some context.' },
  { role: 'user', content: 'Now here is my question.' },
];

// Good: Combine into one message, or use system for context
const messages = [
  {
    role: 'system',
    content: 'Here is relevant context for the conversation: ...',
  },
  {
    role: 'user',
    content: 'Now here is my question: ...',
  },
];
```

---

## Building a Reusable Chat Component

Let's put everything together into a production-ready chat session manager:

```javascript
import OpenAI from 'openai';
import { getEncoding } from 'js-tiktoken';

const openai = new OpenAI();
const encoder = getEncoding('o200k_base');

function countTokens(text) {
  return encoder.encode(text).length;
}

class ChatSession {
  constructor({
    systemPrompt,
    model = 'gpt-4o',
    maxContextTokens = 120000,
    maxResponseTokens = 4096,
    temperature = 0.7,
  }) {
    this.model = model;
    this.maxContextTokens = maxContextTokens;
    this.maxResponseTokens = maxResponseTokens;
    this.temperature = temperature;
    this.messages = [];
    this.totalTokensUsed = 0;

    if (systemPrompt) {
      this.messages.push({ role: 'system', content: systemPrompt });
    }
  }

  async send(userMessage) {
    this.messages.push({ role: 'user', content: userMessage });

    // Ensure we're within context limits
    await this.trimIfNeeded();

    const response = await openai.chat.completions.create({
      model: this.model,
      messages: this.messages,
      max_tokens: this.maxResponseTokens,
      temperature: this.temperature,
    });

    const assistantMessage = response.choices[0].message.content;
    this.messages.push({ role: 'assistant', content: assistantMessage });

    this.totalTokensUsed += response.usage.total_tokens;

    return {
      content: assistantMessage,
      usage: response.usage,
      totalSessionTokens: this.totalTokensUsed,
    };
  }

  async trimIfNeeded() {
    const tokenCount = this.messages.reduce(
      (sum, m) => sum + countTokens(m.content) + 4,
      0
    );

    const budget = this.maxContextTokens - this.maxResponseTokens;

    if (tokenCount > budget * 0.9) {
      console.log(`Trimming history: ${tokenCount} tokens > ${budget * 0.9} budget`);
      // Keep system message and last 4 messages, summarize the rest
      const system = this.messages[0];
      const recent = this.messages.slice(-4);
      const middle = this.messages.slice(1, -4);

      if (middle.length > 0) {
        const summaryResp = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Summarize this conversation concisely. Preserve key facts and decisions.',
            },
            {
              role: 'user',
              content: middle.map(m => `[${m.role}]: ${m.content}`).join('\n\n'),
            },
          ],
          max_tokens: 500,
        });

        this.messages = [
          system,
          {
            role: 'system',
            content: `[Conversation summary]: ${summaryResp.choices[0].message.content}`,
          },
          ...recent,
        ];
      }
    }
  }

  reset() {
    const system = this.messages.find(m => m.role === 'system');
    this.messages = system ? [system] : [];
    this.totalTokensUsed = 0;
  }
}

export default ChatSession;
```

```python
# Python equivalent
import tiktoken
from openai import OpenAI

client = OpenAI()
encoder = tiktoken.get_encoding("o200k_base")


class ChatSession:
    def __init__(
        self,
        system_prompt: str = "",
        model: str = "gpt-4o",
        max_context_tokens: int = 120000,
        max_response_tokens: int = 4096,
        temperature: float = 0.7,
    ):
        self.model = model
        self.max_context_tokens = max_context_tokens
        self.max_response_tokens = max_response_tokens
        self.temperature = temperature
        self.messages = []
        self.total_tokens_used = 0

        if system_prompt:
            self.messages.append({"role": "system", "content": system_prompt})

    def send(self, user_message: str) -> dict:
        self.messages.append({"role": "user", "content": user_message})
        self._trim_if_needed()

        response = client.chat.completions.create(
            model=self.model,
            messages=self.messages,
            max_tokens=self.max_response_tokens,
            temperature=self.temperature,
        )

        assistant_message = response.choices[0].message.content
        self.messages.append({"role": "assistant", "content": assistant_message})
        self.total_tokens_used += response.usage.total_tokens

        return {
            "content": assistant_message,
            "usage": response.usage,
            "total_session_tokens": self.total_tokens_used,
        }

    def _count_tokens(self, text: str) -> int:
        return len(encoder.encode(text))

    def _trim_if_needed(self):
        token_count = sum(
            self._count_tokens(m["content"]) + 4 for m in self.messages
        )
        budget = self.max_context_tokens - self.max_response_tokens
        if token_count > budget * 0.9:
            # Summarize older messages (similar logic as JS version)
            pass

    def reset(self):
        system = next((m for m in self.messages if m["role"] == "system"), None)
        self.messages = [system] if system else []
        self.total_tokens_used = 0
```

---

## Key Takeaways

1. **Three roles define every LLM conversation**: system (instructions), user (input), and assistant (output). The model has no memory -- you send the full conversation every time.

2. **The system message is your most powerful prompt engineering tool.** Use it to define identity, behavior rules, output format, and constraints.

3. **Conversation history must be managed.** Token costs grow with each turn. Implement trimming and summarization strategies for long conversations.

4. **Different providers handle system messages differently.** OpenAI puts it in the messages array; Anthropic uses a separate `system` parameter. Build abstractions that handle both.

5. **Assistant prefilling steers output format and style.** You can pre-fill the beginning of the assistant's response to force JSON output or set the tone.

6. **Always alternate user and assistant messages.** Multiple consecutive messages of the same role can confuse the model.

---

## Try It Yourself

**Exercise: Build a Specialized Chatbot**

Create a chatbot for a specific use case relevant to your work or interests. Here are some ideas:

1. **Code Review Bot**: Takes code and provides detailed review feedback
2. **Meeting Summarizer**: Takes meeting notes and produces structured summaries
3. **API Documentation Helper**: Takes questions about an API and provides examples

Implement it using the `ChatSession` class above and focus on crafting a great system message:

```javascript
const codeReviewer = new ChatSession({
  systemPrompt: `You are a senior full-stack developer conducting code reviews.

## Review Process
1. First, identify any bugs or logical errors
2. Check for security vulnerabilities (SQL injection, XSS, etc.)
3. Evaluate code style and readability
4. Suggest performance improvements
5. Rate the code 1-10 with justification

## Format
Use markdown with clear sections for each review area.
Include "before" and "after" code snippets for suggested changes.

## Tone
Constructive and educational. Explain WHY something is a problem, not just WHAT.`,
  model: 'gpt-4o',
  temperature: 0.3,  // Lower temperature for more consistent reviews
});

// Test it
const review = await codeReviewer.send(`
Review this Express.js endpoint:

app.get('/users/:id', (req, res) => {
  const query = "SELECT * FROM users WHERE id = " + req.params.id;
  db.query(query, (err, results) => {
    res.json(results[0]);
  });
});
`);

console.log(review.content);
```

Try different system messages and compare how the outputs change. What happens when you add more specific rules? What happens when you remove constraints?

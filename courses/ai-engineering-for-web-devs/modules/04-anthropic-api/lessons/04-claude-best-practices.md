---
title: "Claude Best Practices"
estimatedMinutes: 60
---

# Claude Best Practices

You now know how to use the Anthropic Messages API, tool use, and long context. This final lesson in the module ties everything together with the patterns, techniques, and decision frameworks that separate beginner AI engineers from experienced ones.

We will cover how to get the best results from Claude, when to use Claude versus GPT, and the prompting techniques that are unique to working with Claude models.

---

## XML Tags: Claude's Secret Weapon

Claude is specifically trained to understand and respond to XML-style tags in prompts. This is one of the biggest practical differences between prompting Claude and prompting GPT models. Using XML tags consistently improves output quality, structure, and reliability.

### Why XML Tags Work

XML tags give Claude explicit, unambiguous boundaries between different parts of your prompt. Instead of relying on newlines or natural language transitions, tags make the structure machine-readable.

### Common Tag Patterns

```javascript
// Wrapping input data
const prompt = `Analyze the following code for bugs:

<code>
function calculateTotal(items) {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quanity; // typo in 'quantity'
  }
  return total;
}
</code>

List each bug you find inside <bugs> tags.`;
```

```javascript
// Separating instructions from context
const prompt = `<instructions>
You are reviewing a pull request. Focus on:
1. Security vulnerabilities
2. Performance issues
3. Code style violations
</instructions>

<context>
This PR adds a new user authentication endpoint to our Express.js API.
The team uses ESLint with the Airbnb config.
</context>

<code>
${pullRequestDiff}
</code>

Provide your review inside <review> tags with subsections for each category.`;
```

```javascript
// Multiple examples with tags
const prompt = `Convert natural language to SQL queries.

<example>
<input>Show me all users who signed up this month</input>
<output>SELECT * FROM users WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)</output>
</example>

<example>
<input>Count orders by status</input>
<output>SELECT status, COUNT(*) as count FROM orders GROUP BY status</output>
</example>

<input>${userQuery}</input>

Return only the SQL query inside <output> tags.`;
```

### Tags for Output Structure

You can tell Claude to use specific tags in its response, making parsing straightforward:

```javascript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 2048,
  messages: [
    {
      role: "user",
      content: `Analyze this job posting and extract structured information.

<job_posting>
${jobPostingText}
</job_posting>

Return your analysis in this exact format:
<title>Job title here</title>
<company>Company name</company>
<salary_range>Salary range or "Not specified"</salary_range>
<skills>
- Skill 1
- Skill 2
</skills>
<summary>2-3 sentence summary</summary>`,
    },
  ],
});

// Parse the XML-like output
const text = response.content[0].text;
const title = text.match(/<title>(.*?)<\/title>/s)?.[1]?.trim();
const company = text.match(/<company>(.*?)<\/company>/s)?.[1]?.trim();
const skills = text.match(/<skills>(.*?)<\/skills>/s)?.[1]?.trim();

console.log({ title, company, skills });
```

---

## Extended Thinking

Claude models offer an "extended thinking" feature where the model can reason through complex problems step by step before producing its final answer. This is particularly useful for math, logic, code debugging, and complex analysis.

### JavaScript

```javascript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 16000,
  thinking: {
    type: "enabled",
    budget_tokens: 10000,
  },
  messages: [
    {
      role: "user",
      content:
        "This React component re-renders 47 times when I click a button. Here's the code. Why is this happening and how do I fix it?\n\n```jsx\n" +
        componentCode +
        "\n```",
    },
  ],
});

// The response will contain thinking blocks and text blocks
for (const block of response.content) {
  if (block.type === "thinking") {
    console.log("=== Claude's reasoning ===");
    console.log(block.thinking);
    console.log("=========================");
  }
  if (block.type === "text") {
    console.log("\n=== Final answer ===");
    console.log(block.text);
  }
}
```

### Python

```python
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=16000,
    thinking={
        "type": "enabled",
        "budget_tokens": 10000,
    },
    messages=[
        {
            "role": "user",
            "content": f"Debug this code and explain the root cause:\n\n```python\n{buggy_code}\n```"
        }
    ]
)

for block in response.content:
    if block.type == "thinking":
        print("=== Reasoning ===")
        print(block.thinking)
    elif block.type == "text":
        print("=== Answer ===")
        print(block.text)
```

### When to Use Extended Thinking

| Use Extended Thinking                     | Skip Extended Thinking                 |
| ---------------------------------------- | -------------------------------------- |
| Complex debugging                        | Simple Q&A                             |
| Multi-step math/logic                    | Classification tasks                   |
| Architecture design decisions            | Text formatting/transformation         |
| Code review with subtle bugs             | Straightforward code generation        |
| Analyzing trade-offs between approaches  | Data extraction                        |

**Cost note**: Thinking tokens count toward your output token usage and are billed at the output token rate. Set `budget_tokens` to control the cost. Start with 5,000-10,000 for most tasks.

---

## Comparing Claude Models

Anthropic offers several Claude models. Picking the right one matters for both quality and cost.

### Model Lineup (as of early 2026)

| Model            | Strengths                                     | Context  | Relative Cost |
| ---------------- | --------------------------------------------- | -------- | ------------- |
| Claude Opus 4    | Most capable. Complex reasoning, nuance       | 200K     | $$$$          |
| Claude Sonnet 4  | Best balance of speed, cost, and capability   | 200K     | $$            |
| Claude Haiku 4   | Fastest and cheapest. Simple tasks.            | 200K     | $             |

### Choosing the Right Model

```javascript
function selectClaudeModel(task) {
  const modelMap = {
    // Simple, fast tasks → Haiku
    classification: "claude-haiku-4-20250514",
    extraction: "claude-haiku-4-20250514",
    formatting: "claude-haiku-4-20250514",
    summarize_short: "claude-haiku-4-20250514",

    // Balanced tasks → Sonnet
    code_generation: "claude-sonnet-4-20250514",
    analysis: "claude-sonnet-4-20250514",
    conversation: "claude-sonnet-4-20250514",
    writing: "claude-sonnet-4-20250514",
    tool_use: "claude-sonnet-4-20250514",

    // Complex, high-stakes tasks → Opus
    architecture_review: "claude-opus-4-20250514",
    complex_debugging: "claude-opus-4-20250514",
    research_synthesis: "claude-opus-4-20250514",
    critical_decisions: "claude-opus-4-20250514",
  };

  return modelMap[task] || "claude-sonnet-4-20250514";
}
```

---

## Claude vs. GPT: When to Use Which

As an AI engineer, you should know when each model family excels. Here is a practical comparison based on real-world usage patterns.

### Claude Tends to Excel At

1. **Instruction following**: Claude is particularly good at following complex, multi-step instructions precisely. If your prompt has 10 rules, Claude tends to follow all 10.

2. **Long document analysis**: With 200K context and prompt caching, Claude is the natural choice for document-heavy workflows.

3. **Careful, nuanced responses**: Claude tends to give more balanced, thoughtful responses on sensitive or ambiguous topics.

4. **XML-structured prompting**: Claude's training makes it particularly responsive to XML-tagged prompts.

5. **Tool use reliability**: Claude tends to generate well-formed tool arguments and follow tool descriptions carefully.

### GPT Models Tend to Excel At

1. **Broad ecosystem**: OpenAI has a larger ecosystem of fine-tuning (note: Anthropic fine-tuning is now available in limited availability), assistants API, and third-party integrations.

2. **Image generation**: DALL-E integration is seamlessly available through the same API.

3. **Real-time/voice**: GPT-4o has native multimodal capabilities including voice.

4. **JSON mode**: OpenAI's `response_format: { type: "json_object" }` guarantees valid JSON output.

5. **Speed**: GPT-4o-mini is extremely fast for simple tasks.

### Batch Processing

Both providers offer batch APIs for non-realtime workloads at reduced cost. Anthropic's **Message Batches API** provides 50% cost reduction for batch processing, similar to OpenAI's Batch API. This is ideal for evaluation, content generation, classification pipelines, and other workloads where you do not need an immediate response.

### Decision Framework

```
Is the task document-heavy (>50K tokens of context)?
  → Claude (200K context + prompt caching)

Is instruction-following critical (many rules, specific format)?
  → Claude (stronger instruction adherence)

Do you need guaranteed JSON output?
  → OpenAI (native JSON mode) or Claude (tool use for structured output)

Do you need image generation?
  → OpenAI (DALL-E)

Is it a simple classification/extraction at high volume?
  → Cheapest option: GPT-4o-mini or Claude Haiku

Is the task ambiguous or sensitive?
  → Claude (more cautious, balanced)

Do you need the absolute best reasoning?
  → Test both: Claude Opus vs. o1/o3
```

### Multi-Provider Architecture

The best production systems use both:

```javascript
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const anthropic = new Anthropic();
const openai = new OpenAI();

async function smartRoute(task, messages, options = {}) {
  const provider = selectProvider(task);

  if (provider === "anthropic") {
    const system = messages.find((m) => m.role === "system")?.content || "";
    const userMessages = messages.filter((m) => m.role !== "system");

    const response = await anthropic.messages.create({
      model: selectClaudeModel(task),
      max_tokens: options.maxTokens || 2048,
      system,
      messages: userMessages,
    });

    return {
      provider: "anthropic",
      content: response.content[0].text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  if (provider === "openai") {
    const response = await openai.chat.completions.create({
      model: selectOpenAIModel(task),
      messages,
      max_tokens: options.maxTokens || 2048,
    });

    return {
      provider: "openai",
      content: response.choices[0].message.content,
      usage: {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
      },
    };
  }
}

function selectProvider(task) {
  const anthropicTasks = [
    "document_analysis",
    "code_review",
    "instruction_following",
    "long_context",
    "tool_use",
  ];

  const openaiTasks = [
    "image_generation",
    "simple_classification",
    "json_extraction",
  ];

  if (anthropicTasks.includes(task)) return "anthropic";
  if (openaiTasks.includes(task)) return "openai";
  return "anthropic"; // Default
}
```

---

## Prompting Best Practices for Claude

### 1. Be Direct

Claude responds well to direct instructions. You do not need to add filler or be overly polite in your system prompt.

```javascript
// Less effective
const vague = "It would be great if you could maybe try to look at this code and let me know if there might be any issues, if that's okay.";

// More effective
const direct = "Review this code. List every bug, security vulnerability, and performance issue. For each issue, explain the problem and provide the fix.";
```

### 2. Give Examples (Few-Shot)

When you need a specific output format, show Claude examples:

```javascript
const systemPrompt = `Convert user questions into Notion API filter objects.

<example>
User: Show me all members in the Android Dev track
Filter: {"property": "Track", "select": {"equals": "Android Dev"}}
</example>

<example>
User: Find members who completed milestone 6
Filter: {"property": "Milestone", "select": {"equals": "6"}}
</example>

<example>
User: List everyone in the 2026-Q1 cohort who is still in progress
Filter: {"and": [{"property": "Cohort", "select": {"equals": "2026-Q1"}}, {"property": "Status", "status": {"equals": "In Progress"}}]}
</example>

Return only the JSON filter object, no additional text.`;
```

### 3. Use Prefilled Responses

You can start Claude's response by providing a partial `assistant` message. Claude will continue from where you left off:

```javascript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: "List three benefits of TypeScript for web development.",
    },
    {
      role: "assistant",
      content: "1.",
    },
  ],
});

// Claude will continue from "1." and produce a numbered list
```

This is powerful for:
- Forcing a specific output format (start with `{` for JSON, `[` for arrays)
- Skipping preamble ("Sure, I'd be happy to help...")
- Guiding the response structure

```javascript
// Force JSON output
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: `Extract the name and email from this text: "${inputText}". Return as JSON.`,
    },
    {
      role: "assistant",
      content: "{",
    },
  ],
});

// Parse the response (remember to prepend the "{" we started with)
const json = JSON.parse("{" + response.content[0].text);
```

### 4. Role Prompting

Give Claude a specific expert role for better domain performance:

```javascript
// Generic -- okay results
const generic = "Explain how database indexing works.";

// Role-specific -- better results
const rolePrompt = `You are a senior database administrator with 15 years of experience optimizing PostgreSQL at scale.

A junior developer on your team asks: "Why are my queries slow? Should I just add indexes to everything?"

Explain database indexing in a way that helps them understand when and how to use indexes effectively. Include real-world examples from web application development.`;
```

### 5. Chain of Thought Prompting

For complex reasoning, ask Claude to think step by step:

```javascript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 4096,
  messages: [
    {
      role: "user",
      content: `A user reports that our Express.js API returns 500 errors intermittently, about 5% of requests. The error logs show "ECONNRESET". The API connects to a PostgreSQL database and a Redis cache.

Think through this step by step:
1. What could cause intermittent ECONNRESET errors?
2. Which component is most likely the source?
3. How would you diagnose the root cause?
4. What is the fix?

Show your reasoning for each step.`,
    },
  ],
});
```

For even deeper reasoning on truly complex problems, use extended thinking (covered earlier in this lesson).

---

## Common Pitfalls and How to Avoid Them

### Pitfall 1: Ignoring Stop Reason

```javascript
// BAD -- assuming every response is complete
const text = response.content[0].text;

// GOOD -- checking why the response ended
if (response.stop_reason === "max_tokens") {
  console.warn("Response was truncated! Increase max_tokens or simplify the request.");
}

if (response.stop_reason === "end_turn") {
  // Normal completion
}
```

### Pitfall 2: Not Handling Content Block Types

```javascript
// BAD -- assuming there is always exactly one text block
const text = response.content[0].text; // Could crash if it's a tool_use block

// GOOD -- safely extracting text
const textBlocks = response.content.filter((b) => b.type === "text");
const text = textBlocks.map((b) => b.text).join("\n");
```

### Pitfall 3: Forgetting Message Alternation

```javascript
// BAD -- this will error
const messages = [
  { role: "user", content: "Hello" },
  { role: "user", content: "Can you help me?" }, // Two user messages in a row!
];

// GOOD -- combine into one message
const messages = [
  { role: "user", content: "Hello. Can you help me?" },
];

// OR -- add an assistant message between them
const messages = [
  { role: "user", content: "Hello" },
  { role: "assistant", content: "Hi! How can I help?" },
  { role: "user", content: "Can you help me with JavaScript?" },
];
```

### Pitfall 4: Not Setting Appropriate max_tokens

```javascript
// BAD -- requesting way more than needed wastes the model's "attention"
const classify = await anthropic.messages.create({
  model: "claude-haiku-4-20250514",
  max_tokens: 4096, // Only need 1 word!
  messages: [
    { role: "user", content: "Classify this as spam or not: 'You won a million dollars!'" },
  ],
});

// GOOD -- appropriate max_tokens for the task
const classify = await anthropic.messages.create({
  model: "claude-haiku-4-20250514",
  max_tokens: 50, // Plenty for a classification
  messages: [
    { role: "user", content: "Classify this as spam or not: 'You won a million dollars!'" },
  ],
});
```

---

## Building a Production-Ready Wrapper

Here is a wrapper class that implements all the best practices from this module:

```javascript
import Anthropic from "@anthropic-ai/sdk";

class ClaudeClient {
  constructor(options = {}) {
    this.client = new Anthropic({ apiKey: options.apiKey });
    this.defaultModel = options.model || "claude-sonnet-4-20250514";
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.callCount = 0;
  }

  async complete({ system, messages, model, maxTokens = 2048, tools, toolChoice, thinking }) {
    const params = {
      model: model || this.defaultModel,
      max_tokens: maxTokens,
      messages,
    };

    if (system) params.system = system;
    if (tools) params.tools = tools;
    if (toolChoice) params.tool_choice = toolChoice;
    if (thinking) params.thinking = thinking;

    const response = await this.client.messages.create(params);

    this.totalInputTokens += response.usage.input_tokens;
    this.totalOutputTokens += response.usage.output_tokens;
    this.callCount++;

    return response;
  }

  getText(response) {
    const textBlocks = response.content.filter((b) => b.type === "text");
    return textBlocks.map((b) => b.text).join("\n");
  }

  getToolCalls(response) {
    return response.content.filter((b) => b.type === "tool_use");
  }

  getThinking(response) {
    const thinkingBlocks = response.content.filter((b) => b.type === "thinking");
    return thinkingBlocks.map((b) => b.thinking).join("\n");
  }

  getStats() {
    return {
      calls: this.callCount,
      inputTokens: this.totalInputTokens,
      outputTokens: this.totalOutputTokens,
    };
  }
}

// Usage
const claude = new ClaudeClient();

const response = await claude.complete({
  system: "You are a helpful coding tutor.",
  messages: [{ role: "user", content: "Explain closures in JavaScript." }],
  maxTokens: 1024,
});

console.log(claude.getText(response));
console.log("Stats:", claude.getStats());
```

---

## Key Takeaways

1. **Use XML tags for structure.** Wrapping input data, instructions, and expected output format in XML tags consistently improves Claude's performance.
2. **Extended thinking is worth the tokens** for complex problems. Enable it for debugging, architecture decisions, and multi-step reasoning.
3. **Choose models by task.** Haiku for simple/fast, Sonnet for balanced, Opus for complex. Route automatically in your application.
4. **Claude and GPT have different strengths.** Use both in production. Claude for instruction following and long context; GPT for ecosystem breadth and JSON mode.
5. **Prefill assistant responses** to control output format and skip preamble. Start with `{` for JSON, `1.` for lists, or any prefix you need.
6. **Always check `stop_reason` and content block types.** Never assume the response structure -- handle tool_use blocks, truncated responses, and thinking blocks explicitly.
7. **Build a wrapper.** A thin client wrapper that handles model selection, token tracking, and response parsing will save you from repeating boilerplate across your codebase.

---

## Try It Yourself

1. **XML Tag Experiment**: Take a prompt that works reasonably well, then add XML tags to structure the input and specify the output format. Compare the quality of responses with and without tags.

2. **Multi-Provider App**: Build a small application that uses OpenAI for one task (e.g., image description) and Anthropic for another (e.g., detailed analysis). Use the `smartRoute` pattern from this lesson.

3. **Extended Thinking Debug Session**: Find a bug in one of your own projects. Give the buggy code to Claude with extended thinking enabled. Review the reasoning process and the final answer. Was the reasoning helpful?

4. **Model Comparison**: Send the same 10 prompts to Claude Haiku, Sonnet, and Opus (or their equivalents). Rate the quality of each response on a 1-5 scale. Is the quality difference worth the cost difference for your use case?

5. **Production Wrapper**: Extend the `ClaudeClient` class with retry logic (exponential backoff on rate limits), response caching, and a `--dry-run` mode that estimates cost without making API calls. Use this wrapper in all your future Claude API work.

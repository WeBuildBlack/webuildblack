---
title: "The ReAct Pattern"
estimatedMinutes: 60
---

## The ReAct Pattern

In the previous lesson you built a simple agent loop: call the LLM, execute tool calls, feed results back. That loop works, but the LLM's reasoning is implicit -- it decides what to do inside a black box, and you only see the tool calls that come out.

The **ReAct** pattern (Reasoning + Acting) makes the agent's thinking explicit. Before each action, the agent writes out its reasoning. This makes agents more debuggable, more reliable, and more transparent.

---

## What Is ReAct?

ReAct stands for **Re**asoning and **Act**ing. It was introduced in a 2022 paper by Yao et al. and has become the foundation for most production agent systems.

The idea is simple: force the agent to produce three things in sequence:

1. **Thought**: The agent's reasoning about what to do next
2. **Action**: The tool call the agent wants to make
3. **Observation**: The result of the tool call

```
Thought: I need to find out when WBB was founded. Let me search for that.
Action: web_search("We Build Black founding year")
Observation: We Build Black was founded in 2016 as Black Software Engineers of NYC Meetup, then incorporated as a 501(c)(3) in November 2017.

Thought: I now have the founding year. The user asked when WBB was founded, so I can answer.
Action: respond("We Build Black was founded in 2016 as a meetup and incorporated as a 501(c)(3) in 2017.")
```

Compare this to a non-ReAct agent where you only see:

```
[Tool call: web_search("We Build Black founding year")]
[Tool result: ...]
[Final answer: ...]
```

With ReAct, you can see *why* the agent made each decision. This is invaluable for debugging.

---

## Why Explicit Reasoning Helps

### 1. Debugging

When an agent gives a wrong answer, you can read the thought trace to find where the reasoning went wrong. Was it a bad search query? Did the agent misinterpret a tool result? Did it skip a step?

### 2. Reliability

Research shows that asking an LLM to "think step by step" (chain-of-thought prompting) improves accuracy. ReAct bakes this into every iteration of the agent loop.

### 3. Transparency

For user-facing applications, you can show the thought process to build trust: "Here is how I arrived at this answer."

### 4. Control

You can add rules to the thinking step: "Before using a tool, always consider whether you already have the information you need." This prevents unnecessary tool calls.

---

## Implementing ReAct in JavaScript

There are two approaches: structured (using the API's built-in tool calling) and text-based (parsing the model's raw output). Let us start with structured, since it is more reliable.

### Approach 1: Structured ReAct (Using Tool Calling API)

The OpenAI and Anthropic APIs have built-in tool calling. We can get ReAct-style behavior by asking the model to include its reasoning in the response.

```javascript
// agents/react-structured.js
import OpenAI from "openai";

const openai = new OpenAI();

// Tool definitions
const tools = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for information.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description: "Perform a mathematical calculation.",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string", description: "Math expression to evaluate, e.g. '6 * 1000'" },
        },
        required: ["expression"],
      },
    },
  },
];

// Tool implementations
const toolHandlers = {
  web_search: async ({ query }) => {
    console.log(`    [search] "${query}"`);
    // Simulated -- replace with real search API
    const results = {
      "Fast Track stipend": "Each of the 6 milestones pays a $1,000 stipend upon completion.",
      "WBB programs": "Programs include Fast Track (workforce), Crowns of Code (youth), and Mavens I/O (conference).",
      "Crowns of Code age": "Crowns of Code serves youth ages 10-17 in Brooklyn.",
    };
    const key = Object.keys(results).find(k => query.toLowerCase().includes(k.toLowerCase()));
    return key ? results[key] : `No results found for "${query}"`;
  },

  calculate: async ({ expression }) => {
    console.log(`    [calc] ${expression}`);
    try {
      // WARNING: This uses `Function()` which can execute arbitrary code.
      // For production, use a safe math parser like `mathjs`.
      // This is acceptable for a learning exercise only.
      const result = Function(`"use strict"; return (${expression})`)();
      return String(result);
    } catch (e) {
      return `Error: ${e.message}`;
    }
  },
};

async function reactAgent(task, maxIterations = 8) {
  const messages = [
    {
      role: "system",
      content: `You are a helpful assistant that solves tasks step by step.

IMPORTANT: Before each tool call, always explain your reasoning in the response content.
Think about:
- What information do I need?
- Which tool should I use and why?
- What have I learned so far?

When you have enough information to answer, provide your final response WITHOUT any tool calls.`,
    },
    { role: "user", content: task },
  ];

  for (let i = 0; i < maxIterations; i++) {
    console.log(`\n=== Step ${i + 1} ===`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools,
      tool_choice: "auto",
    });

    const message = response.choices[0].message;

    // Print the thought (content that comes with or before tool calls)
    if (message.content) {
      console.log(`  [Thought] ${message.content}`);
    }

    messages.push(message);

    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        const funcName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        console.log(`  [Action] ${funcName}(${JSON.stringify(args)})`);

        const handler = toolHandlers[funcName];
        const result = handler
          ? await handler(args)
          : `Error: Unknown tool "${funcName}"`;

        console.log(`  [Observation] ${result}`);

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }
    } else {
      // No tool calls -- agent is done
      console.log(`\n[Complete] Finished in ${i + 1} steps`);
      return message.content;
    }
  }

  return "Reached maximum iterations.";
}

// Test it
const answer = await reactAgent(
  "If all 6 Fast Track milestones pay the same stipend, what is the total a participant can earn?"
);
console.log(`\n=== Answer ===\n${answer}`);
```

> **Security Warning:** The `Function()` constructor (and Python's `eval()`) can execute arbitrary code. In production, replace with a safe math expression parser like the `mathjs` npm package: `import { evaluate } from 'mathjs'; return evaluate(expression);`

Running this produces a trace like:

```
=== Step 1 ===
  [Thought] I need to find out how much each Fast Track milestone pays.
  [Action] web_search({"query":"Fast Track stipend"})
  [Observation] Each of the 6 milestones pays a $1,000 stipend upon completion.

=== Step 2 ===
  [Thought] Now I know each milestone pays $1,000 and there are 6 milestones. Let me calculate the total.
  [Action] calculate({"expression":"6 * 1000"})
  [Observation] 6000

=== Step 3 ===
  [Thought] I have all the information I need. The total is $6,000.

[Complete] Finished in 3 steps

=== Answer ===
A Fast Track participant can earn a total of $6,000, with each of the 6 milestones paying a $1,000 stipend upon completion.
```

Notice how you can follow the agent's reasoning at every step. This is the power of ReAct.

---

### Approach 2: Text-Based ReAct (Parsing Raw Output)

Some models do not have structured tool calling. In that case, you prompt the model to output its thoughts and actions in a specific text format, and you parse them yourself.

```javascript
// agents/react-text.js
import OpenAI from "openai";

const openai = new OpenAI();

const REACT_PROMPT = `You are an assistant that solves tasks using the ReAct pattern.

Available tools:
- web_search(query): Search the web for information
- calculate(expression): Evaluate a math expression

You MUST follow this exact format for each step:

Thought: [Your reasoning about what to do next]
Action: [tool_name(arguments)]

After receiving an observation, continue with another Thought/Action pair.
When you have the final answer, use:

Thought: [Your final reasoning]
Answer: [Your final answer to the user]

NEVER skip the Thought step. Always reason before acting.`;

function parseResponse(text) {
  // Extract the last Thought
  const thoughtMatch = text.match(/Thought:\s*(.+?)(?=\n(?:Action|Answer))/s);
  const thought = thoughtMatch ? thoughtMatch[1].trim() : null;

  // Check for final answer
  const answerMatch = text.match(/Answer:\s*(.+)/s);
  if (answerMatch) {
    return { type: "answer", thought, answer: answerMatch[1].trim() };
  }

  // Check for action
  const actionMatch = text.match(/Action:\s*(\w+)\((.+?)\)/);
  if (actionMatch) {
    return {
      type: "action",
      thought,
      toolName: actionMatch[1],
      args: actionMatch[2].replace(/^["']|["']$/g, ""),  // Strip quotes
    };
  }

  return { type: "unknown", thought, raw: text };
}

async function reactAgentText(task, maxIterations = 8) {
  let prompt = `${REACT_PROMPT}\n\nTask: ${task}\n\n`;
  const history = [];

  for (let i = 0; i < maxIterations; i++) {
    console.log(`\n=== Step ${i + 1} ===`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt + history.join("\n") }],
      temperature: 0,
      max_tokens: 300,
    });

    const output = response.choices[0].message.content;
    const parsed = parseResponse(output);

    if (parsed.thought) {
      console.log(`  [Thought] ${parsed.thought}`);
    }

    if (parsed.type === "answer") {
      console.log(`\n[Complete] Finished in ${i + 1} steps`);
      return parsed.answer;
    }

    if (parsed.type === "action") {
      console.log(`  [Action] ${parsed.toolName}(${parsed.args})`);

      // Execute tool (simplified)
      let observation = "";
      if (parsed.toolName === "web_search") {
        observation = "Each Fast Track milestone pays a $1,000 stipend. There are 6 milestones total.";
      } else if (parsed.toolName === "calculate") {
        try {
          observation = String(Function(`"use strict"; return (${parsed.args})`)());
        } catch (e) {
          observation = `Error: ${e.message}`;
        }
      }

      console.log(`  [Observation] ${observation}`);

      history.push(output);
      history.push(`Observation: ${observation}\n`);
    }
  }

  return "Reached maximum iterations.";
}

const answer = await reactAgentText(
  "How much total money can a Fast Track participant earn from stipends?"
);
console.log(`\n=== Answer ===\n${answer}`);
```

### Structured vs. Text-Based: Which to Use?

| Approach | Pros | Cons |
|----------|------|------|
| **Structured** (API tool calling) | Reliable parsing, type safety, no prompt engineering for format | Requires API support, thoughts may be brief |
| **Text-based** (parse raw output) | Works with any model, full control over format | Fragile parsing, prompt engineering overhead |

**Recommendation**: Use structured tool calling when available (OpenAI, Anthropic, Gemini all support it). Fall back to text-based only when you need to use a model without tool calling support.

---

## ReAct in Python

```python
# agents/react_structured.py
import json
import openai

client = openai.OpenAI()

tools = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web for information.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"}
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate",
            "description": "Evaluate a math expression.",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {"type": "string", "description": "Math expression"}
                },
                "required": ["expression"],
            },
        },
    },
]

def handle_tool(name: str, args: dict) -> str:
    if name == "web_search":
        print(f'    [search] "{args["query"]}"')
        return "Each Fast Track milestone pays $1,000. There are 6 milestones."
    elif name == "calculate":
        print(f'    [calc] {args["expression"]}')
        return str(eval(args["expression"]))  # In production, use a safe evaluator
    return f"Unknown tool: {name}"

def react_agent(task: str, max_iterations: int = 8) -> str:
    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful assistant. Before each tool call, explain your reasoning. "
                "When you have the answer, respond without tool calls."
            ),
        },
        {"role": "user", "content": task},
    ]

    for i in range(max_iterations):
        print(f"\n=== Step {i + 1} ===")

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            tools=tools,
            tool_choice="auto",
        )
        message = response.choices[0].message

        if message.content:
            print(f"  [Thought] {message.content}")

        messages.append(message)

        if message.tool_calls:
            for tc in message.tool_calls:
                args = json.loads(tc.function.arguments)
                print(f"  [Action] {tc.function.name}({args})")

                result = handle_tool(tc.function.name, args)
                print(f"  [Observation] {result}")

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result,
                })
        else:
            print(f"\n[Complete] Finished in {i + 1} steps")
            return message.content

    return "Reached maximum iterations."

answer = react_agent("What is the total stipend a Fast Track participant can earn?")
print(f"\n=== Answer ===\n{answer}")
```

---

## ReAct Best Practices

### 1. Require Reasoning Before Action

The system prompt should explicitly require a thought before every action:

```javascript
// Good
"IMPORTANT: Before each tool call, explain your reasoning in the response content."

// Bad (no reasoning requirement)
"You have access to these tools. Use them to answer questions."
```

### 2. Limit Iterations

Always set a maximum. A typical agent should finish in 3-7 steps. If it needs more than 10, the task may be too complex or the agent is stuck.

```javascript
const MAX_ITERATIONS = 8;
```

### 3. Handle Tool Errors Gracefully

When a tool fails, the agent should be able to recover:

```javascript
let result;
try {
  result = await handler(args);
} catch (error) {
  result = `Tool error: ${error.message}. Try a different approach.`;
}
```

The error message should help the agent adjust its strategy, not just say "failed."

### 4. Log Everything

In production, log the full Thought/Action/Observation trace for every agent run. This is your debugging lifeline.

```javascript
function logStep(step, thought, action, observation) {
  const entry = {
    timestamp: new Date().toISOString(),
    step,
    thought,
    action,
    observation,
  };
  console.log(JSON.stringify(entry));
  // In production, write to a logging service
}
```

### 5. Add a "Reflection" Step

After several iterations, prompt the agent to reflect on its progress:

```javascript
if (i > 0 && i % 3 === 0) {
  messages.push({
    role: "user",
    content: "Pause and reflect: What have you learned so far? Are you making progress toward answering the original question? Do you need to change your approach?",
  });
}
```

This prevents the agent from going down unproductive paths.

---

## Debugging a ReAct Agent

When your agent produces a wrong answer or gets stuck, here is how to diagnose it:

### Step 1: Read the Full Trace

Print every Thought, Action, and Observation. The bug is usually visible in the reasoning.

### Step 2: Check the First Thought

If the agent's first thought is wrong, everything downstream will be wrong. The most common issue is the agent misunderstanding the task.

**Fix**: Improve the system prompt or add examples.

### Step 3: Check Tool Results

If the tool returns unexpected data, the agent will be confused.

**Fix**: Improve tool descriptions, add error handling, or fix the tool implementation.

### Step 4: Check for Loops

If the agent keeps calling the same tool with the same arguments, it is stuck.

**Fix**: Add loop detection that tracks previous actions and injects a "Try a different approach" message.

```javascript
// Simple loop detection
const actionHistory = [];

for (let i = 0; i < MAX_ITERATIONS; i++) {
  // ... get response ...

  if (message.tool_calls) {
    const actionKey = JSON.stringify(message.tool_calls.map(tc => ({
      name: tc.function.name,
      args: tc.function.arguments,
    })));

    if (actionHistory.includes(actionKey)) {
      messages.push({
        role: "user",
        content: "You have already tried this exact action. Try a different approach or provide your best answer with the information you have.",
      });
      continue;
    }

    actionHistory.push(actionKey);
  }
}
```

---

## Key Takeaways

- **ReAct = Reasoning + Acting.** The agent explicitly writes its reasoning (Thought) before each action, making the decision process transparent and debuggable.
- **The Thought/Action/Observation format** is the standard pattern: think about what to do, do it, observe the result, repeat.
- **Structured tool calling** (using the API's native function calling) is more reliable than text-based parsing. Use text-based ReAct only when the model does not support tool calling.
- **Always require reasoning before action** in the system prompt. This improves accuracy and makes debugging possible.
- **Log everything.** The ReAct trace is your debugging tool. Without it, agent failures are opaque.

---

## Try It Yourself

1. **Build a ReAct agent with 3 tools**: `web_search`, `calculate`, and `get_current_date`. Ask it: "How many days until the next Mavens I/O conference?" Watch it chain tools together.

2. **Add verbose logging.** Modify the agent to save each Thought/Action/Observation step to a JSON file. After the agent finishes, read the file and trace through the reasoning.

3. **Intentionally break a tool.** Make `web_search` return "Error: API rate limit exceeded" for the first call. Does the agent retry, try a different query, or give up? Adjust the system prompt to improve recovery behavior.

4. **Compare with and without reasoning.** Run the same task with the ReAct prompt ("explain your reasoning before each action") and without it. Compare the number of steps, the quality of tool arguments, and the final answer.

5. **Build a reflection mechanism.** After every 3 steps, inject a "reflect on your progress" message. Test with a complex task that requires 5+ steps. Does reflection reduce unnecessary steps?

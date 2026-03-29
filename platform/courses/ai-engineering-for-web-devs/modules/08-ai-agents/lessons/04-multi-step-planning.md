---
title: "Multi-Step Planning, Memory, and Guardrails"
estimatedMinutes: 60
---

## Multi-Step Planning, Memory, and Guardrails

So far your agents have been reactive: they take one step at a time, deciding what to do based on the last observation. This works for simple tasks, but complex tasks like "set up a new Fast Track cohort" require a plan -- multiple coordinated steps that build on each other.

In this lesson you will learn how to make agents plan ahead, handle failures gracefully, manage long-running context, and operate within safe boundaries.

---

## Why Agents Need Planning

Consider this task: "Launch the Q3 2026 Fast Track cohort."

A reactive agent would start doing things immediately -- maybe creating a Slack channel, maybe querying the database, maybe doing something random. Without a plan, the agent might:

- Create the Slack channel before having a member list
- Send welcome messages before setting up the Notion database
- Miss steps entirely because it forgot what was left to do

A planning agent first **creates a plan**, then **executes it step by step**, tracking what is done and what remains.

```
Task: Launch the Q3 2026 Fast Track cohort

Plan:
1. [ ] Create Notion database from cohort tracker template
2. [ ] Import enrolled member data into the database
3. [ ] Create Slack channel #cohort-2026-q3
4. [ ] Send welcome messages to all enrolled members
5. [ ] Set up daily reminder automation
6. [ ] Update website programs page with new cohort info

Executing step 1...
Executing step 2...
...
```

---

## Implementing a Planning Agent

### The Two-Phase Approach

The simplest planning strategy: use one LLM call to create the plan, then a separate agent loop to execute each step.

```javascript
// agents/planning-agent.js
import OpenAI from "openai";
import { createWBBTools } from "../tools/setup.js";

const openai = new OpenAI();
const tools = createWBBTools();

/**
 * Phase 1: Generate a plan for the given task.
 */
async function createPlan(task) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a task planner for We Build Black, a non-profit tech education org.

Given a task, break it into a numbered list of concrete, actionable steps.
Each step should be something that can be accomplished with one or two tool calls.

Available tools: ${tools.listNames().join(", ")}

Return ONLY the numbered plan, nothing else. Each step should be one line.
Mark any steps that depend on previous steps with [depends: N] where N is the step number.`,
      },
      { role: "user", content: task },
    ],
    temperature: 0,
  });

  const planText = response.choices[0].message.content;
  const steps = planText
    .split("\n")
    .filter(line => /^\d+\./.test(line.trim()))
    .map((line, i) => {
      const depMatch = line.match(/\[depends:\s*(\d+)\]/);
      return {
        id: i + 1,
        description: line.replace(/^\d+\.\s*/, "").replace(/\[depends:.*?\]/, "").trim(),
        status: "pending",
        dependsOn: depMatch ? parseInt(depMatch[1]) : null,
        result: null,
      };
    });

  return steps;
}

/**
 * Phase 2: Execute each step of the plan.
 */
async function executePlan(task, plan) {
  console.log("\n=== Plan ===");
  plan.forEach(step => {
    console.log(`  ${step.id}. [${step.status}] ${step.description}`);
  });

  for (const step of plan) {
    // Check dependencies
    if (step.dependsOn) {
      const dep = plan.find(s => s.id === step.dependsOn);
      if (dep && dep.status !== "complete") {
        console.log(`\nSkipping step ${step.id} -- depends on step ${step.dependsOn} which is not complete`);
        step.status = "skipped";
        continue;
      }
    }

    console.log(`\n--- Executing Step ${step.id}: ${step.description} ---`);
    step.status = "in_progress";

    // Build context from completed steps
    const completedContext = plan
      .filter(s => s.status === "complete")
      .map(s => `Step ${s.id} (${s.description}): ${s.result}`)
      .join("\n");

    const messages = [
      {
        role: "system",
        content: `You are executing step ${step.id} of a larger plan.

Original task: ${task}

Completed steps:
${completedContext || "(none yet)"}

Current step: ${step.description}

Execute this step using the available tools. When done, summarize what was accomplished.`,
      },
      { role: "user", content: `Execute: ${step.description}` },
    ];

    // Run mini agent loop for this step
    let stepResult = null;
    for (let i = 0; i < 5; i++) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        tools: tools.getDefinitions(),
        tool_choice: "auto",
      });

      const message = response.choices[0].message;
      if (message.content) console.log(`  [Agent] ${message.content}`);
      messages.push(message);

      if (!message.tool_calls) {
        stepResult = message.content;
        break;
      }

      for (const tc of message.tool_calls) {
        const args = JSON.parse(tc.function.arguments);
        console.log(`  [Tool] ${tc.function.name}(${JSON.stringify(args)})`);

        const result = await tools.execute(tc.function.name, args);
        const resultStr = result.error || JSON.stringify(result.result);
        console.log(`  [Result] ${resultStr.slice(0, 150)}...`);

        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: resultStr,
        });
      }
    }

    step.status = "complete";
    step.result = stepResult;
    console.log(`  [Done] Step ${step.id} complete`);
  }

  // Final summary
  console.log("\n=== Plan Execution Complete ===");
  plan.forEach(step => {
    const icon = step.status === "complete" ? "[x]" : step.status === "skipped" ? "[-]" : "[ ]";
    console.log(`  ${icon} Step ${step.id}: ${step.description}`);
  });

  return plan;
}

// Main entry point
async function planAndExecute(task) {
  console.log(`Task: ${task}\n`);

  const plan = await createPlan(task);
  const results = await executePlan(task, plan);

  return results;
}

await planAndExecute("Launch the Q3 2026 Fast Track cohort with 15 enrolled members");
```

### Python Implementation

```python
# agents/planning_agent.py
import json
import re
import openai

client = openai.OpenAI()

async def create_plan(task: str, tool_names: list[str]) -> list[dict]:
    """Generate a step-by-step plan for a task."""
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a task planner. Break the task into numbered actionable steps. "
                    f"Available tools: {', '.join(tool_names)}. "
                    "Return ONLY the numbered plan. Mark dependencies with [depends: N]."
                ),
            },
            {"role": "user", "content": task},
        ],
        temperature=0,
    )

    plan_text = response.choices[0].message.content
    steps = []
    for i, line in enumerate(plan_text.split("\n")):
        if not re.match(r"^\d+\.", line.strip()):
            continue
        dep_match = re.search(r"\[depends:\s*(\d+)\]", line)
        steps.append({
            "id": i + 1,
            "description": re.sub(r"^\d+\.\s*", "", line).strip(),
            "status": "pending",
            "depends_on": int(dep_match.group(1)) if dep_match else None,
            "result": None,
        })
    return steps

async def execute_step(step: dict, task: str, completed: list[dict], tools) -> str:
    """Execute a single plan step using the agent loop."""
    context = "\n".join(
        f"Step {s['id']} ({s['description']}): {s['result']}"
        for s in completed
    )

    messages = [
        {
            "role": "system",
            "content": (
                f"You are executing step {step['id']} of a plan.\n"
                f"Original task: {task}\n"
                f"Completed steps:\n{context or '(none)'}\n"
                f"Current step: {step['description']}\n"
                "Execute this step, then summarize what was accomplished."
            ),
        },
        {"role": "user", "content": f"Execute: {step['description']}"},
    ]

    for _ in range(5):
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            tools=tools.get_definitions(),
            tool_choice="auto",
        )
        message = response.choices[0].message
        messages.append(message)

        if not message.tool_calls:
            return message.content

        for tc in message.tool_calls:
            args = json.loads(tc.function.arguments)
            result = await tools.execute(tc.function.name, args)
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": json.dumps(result),
            })

    return "Step did not complete within iteration limit."
```

---

## Handling Failures

Things go wrong. APIs time out, data is missing, tools return errors. A production agent needs to handle failures without crashing or getting stuck.

### Retry with Backoff

```javascript
// utils/retry.js

/**
 * Retry a function with exponential backoff.
 */
export async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`  [Retry] Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Usage in tool handler
async ({ query }) => {
  return withRetry(async () => {
    const response = await fetch(`https://api.tavily.com/search?query=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error(`Search API returned ${response.status}`);
    const data = await response.json();
    return data.results.map(r => r.content).join("\n");
  });
}
```

### Step-Level Recovery

When a step in the plan fails, the agent should decide how to proceed:

```javascript
async function executeStepWithRecovery(step, task, completedSteps, tools, maxRecoveryAttempts = 3) {
  try {
    const result = await executeStep(step, task, completedSteps, tools);
    step.status = "complete";
    step.result = result;
    return true;
  } catch (error) {
    console.log(`  [Error] Step ${step.id} failed: ${error.message}`);

    // Check if we've exhausted recovery attempts
    if (maxRecoveryAttempts <= 0) {
      console.log(`  [Recovery] Max recovery attempts reached for step: ${step.description}. Skipping.`);
      step.status = "failed";
      step.result = `Max recovery attempts exceeded. Last error: ${error.message}`;
      return false;
    }

    // Ask the LLM what to do
    const recovery = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `A step in your plan failed. (${maxRecoveryAttempts} recovery attempts remaining)

Step: ${step.description}
Error: ${error.message}

Should you:
1. RETRY - Try the same step again
2. SKIP - Skip this step and continue (if it's not blocking)
3. MODIFY - Try a different approach to accomplish the same goal
4. ABORT - Stop the entire plan

Respond with one word: RETRY, SKIP, MODIFY, or ABORT.`,
        },
      ],
      temperature: 0,
      max_tokens: 10,
    });

    const decision = recovery.choices[0].message.content.trim().toUpperCase();
    console.log(`  [Recovery] Decision: ${decision} (${maxRecoveryAttempts} attempts remaining)`);

    switch (decision) {
      case "RETRY":
        return executeStepWithRecovery(step, task, completedSteps, tools, maxRecoveryAttempts - 1);
      case "SKIP":
        step.status = "skipped";
        step.result = `Skipped due to error: ${error.message}`;
        return true;
      case "MODIFY":
        step.description = `(Modified) Alternative approach for: ${step.description}`;
        return executeStepWithRecovery(step, task, completedSteps, tools, maxRecoveryAttempts - 1);
      case "ABORT":
        step.status = "failed";
        step.result = error.message;
        return false;  // Signals to stop the plan
      default:
        step.status = "failed";
        step.result = error.message;
        return false;
    }
  }
}
```

---

## Memory and Context Management

Agents that run for many steps accumulate a long conversation history. This creates two problems:

1. **Context window overflow**: The messages array exceeds the model's limit
2. **Attention degradation**: The model pays less attention to older messages

### Strategy 1: Sliding Window

Keep only the N most recent messages, plus the system prompt and original task.

```javascript
// memory/sliding-window.js

function trimMessages(messages, maxMessages = 20) {
  if (messages.length <= maxMessages) return messages;

  // Always keep: system prompt (index 0) and user task (index 1)
  const fixed = messages.slice(0, 2);
  const recent = messages.slice(-maxMessages + 2);

  // Add a summary of what was dropped
  const droppedCount = messages.length - maxMessages;
  fixed.push({
    role: "system",
    content: `[Context note: ${droppedCount} earlier messages were summarized. Key information from those messages should be in the conversation below.]`,
  });

  return [...fixed, ...recent];
}
```

### Strategy 2: Summarize and Replace

Periodically summarize older messages and replace them with the summary.

```javascript
// memory/summarizer.js

async function summarizeHistory(messages) {
  const historyText = messages
    .filter(m => m.role !== "system")
    .map(m => `${m.role}: ${m.content || "[tool call]"}`)
    .join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Summarize this conversation history into key facts and decisions. Be concise but preserve all important information, tool results, and decisions made.",
      },
      { role: "user", content: historyText },
    ],
    temperature: 0,
    max_tokens: 500,
  });

  return response.choices[0].message.content;
}

async function compactMessages(messages, summaryThreshold = 30) {
  if (messages.length < summaryThreshold) return messages;

  // Summarize the oldest messages (keep last 10 intact)
  const toSummarize = messages.slice(2, -10);  // Skip system prompt and keep recent
  const summary = await summarizeHistory(toSummarize);

  return [
    messages[0],  // System prompt
    messages[1],  // Original task
    { role: "system", content: `Summary of earlier work:\n${summary}` },
    ...messages.slice(-10),
  ];
}
```

### Strategy 3: External Memory Store

For agents that run over long periods or across sessions, store memories in a database.

```javascript
// memory/external-store.js

class AgentMemory {
  constructor() {
    this.shortTerm = [];  // Current conversation messages
    this.longTerm = [];   // Persisted facts and decisions
  }

  addMessage(message) {
    this.shortTerm.push(message);
  }

  /**
   * Save an important fact to long-term memory.
   */
  remember(fact) {
    this.longTerm.push({
      fact,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Build the context for the next LLM call.
   */
  buildContext() {
    const longTermContext = this.longTerm.length > 0
      ? `\nKey facts from previous work:\n${this.longTerm.map(m => `- ${m.fact}`).join("\n")}`
      : "";

    return {
      systemAddition: longTermContext,
      messages: this.shortTerm,
    };
  }

  /**
   * Serialize memory for persistence.
   */
  toJSON() {
    return {
      shortTerm: this.shortTerm,
      longTerm: this.longTerm,
    };
  }

  static fromJSON(data) {
    const memory = new AgentMemory();
    memory.shortTerm = data.shortTerm || [];
    memory.longTerm = data.longTerm || [];
    return memory;
  }
}

// Give the agent a "remember" tool
registry.register(
  "save_memory",
  "Save an important fact or decision to long-term memory. Use this when you learn something that might be useful in future steps.",
  {
    type: "object",
    properties: {
      fact: { type: "string", description: "The fact to remember" },
    },
    required: ["fact"],
  },
  async ({ fact }) => {
    memory.remember(fact);
    return `Saved to memory: "${fact}"`;
  }
);
```

---

## Guardrails

Guardrails are the rules and limits that keep agents from doing harm. Without them, an agent with powerful tools is a risk.

### 1. Iteration Limits

```javascript
const MAX_ITERATIONS = 15;    // Hard stop
const WARN_ITERATIONS = 10;   // Inject a warning message

for (let i = 0; i < MAX_ITERATIONS; i++) {
  if (i === WARN_ITERATIONS) {
    messages.push({
      role: "system",
      content: `Warning: You have used ${i} of ${MAX_ITERATIONS} iterations. Wrap up your task or provide a partial answer.`,
    });
  }
  // ... agent loop ...
}
```

### 2. Cost Limits

```javascript
let totalTokens = 0;
const MAX_TOKENS = 100_000;  // ~$0.50 with GPT-4o-mini

for (let i = 0; i < MAX_ITERATIONS; i++) {
  const response = await openai.chat.completions.create({ /* ... */ });

  totalTokens += response.usage.total_tokens;
  if (totalTokens > MAX_TOKENS) {
    console.log(`[Guard] Token limit reached (${totalTokens} tokens). Stopping.`);
    break;
  }
}
```

### 3. Tool Call Limits

Prevent the agent from spamming expensive tools:

```javascript
const toolCallCounts = {};
const TOOL_LIMITS = {
  web_search: 10,         // Max 10 searches per task
  send_slack_message: 3,  // Max 3 messages per task
  update_member_milestone: 5,
};

async function executeToolWithLimits(name, args) {
  toolCallCounts[name] = (toolCallCounts[name] || 0) + 1;

  if (TOOL_LIMITS[name] && toolCallCounts[name] > TOOL_LIMITS[name]) {
    return {
      error: `Tool "${name}" has been called ${toolCallCounts[name]} times, exceeding the limit of ${TOOL_LIMITS[name]}. Use information you already have.`,
    };
  }

  return tools.execute(name, args);
}
```

### 4. Output Validation

Check the agent's final output before returning it to the user:

```javascript
async function validateOutput(task, output) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a safety checker. Evaluate whether this output is:
1. SAFE - No harmful content, PII, or unauthorized actions
2. ON_TOPIC - Actually addresses the original task
3. COMPLETE - Provides a full answer (not a partial one)

Respond with JSON: { "safe": bool, "on_topic": bool, "complete": bool, "issues": [] }`,
      },
      {
        role: "user",
        content: `Task: ${task}\n\nOutput: ${output}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### 5. Input Sanitization

Prevent prompt injection through tool results:

```javascript
function sanitizeToolResult(result) {
  // Remove any prompt injection attempts
  const suspicious = [
    "ignore previous instructions",
    "ignore all instructions",
    "system prompt",
    "you are now",
    "new instructions",
  ];

  let sanitized = result;
  for (const phrase of suspicious) {
    if (sanitized.toLowerCase().includes(phrase)) {
      sanitized = sanitized.replace(
        new RegExp(phrase, "gi"),
        "[FILTERED]"
      );
      console.log(`[Guard] Filtered suspicious content: "${phrase}"`);
    }
  }

  return sanitized;
}
```

---

## Putting It All Together: A Production Agent

Here is a simplified but production-oriented agent that combines planning, memory, failure handling, and guardrails:

```javascript
// agents/production-agent.js
import OpenAI from "openai";
import { createWBBTools } from "../tools/setup.js";

const openai = new OpenAI();
const tools = createWBBTools();

class ProductionAgent {
  constructor(options = {}) {
    this.maxIterations = options.maxIterations || 15;
    this.maxTokens = options.maxTokens || 100_000;
    this.totalTokens = 0;
    this.toolCallCounts = {};
    this.memory = [];
    this.plan = null;
  }

  async run(task) {
    console.log(`\n[Agent] Starting task: ${task}\n`);

    // Phase 1: Plan
    this.plan = await this.createPlan(task);
    console.log("[Agent] Plan created:");
    this.plan.forEach(s => console.log(`  ${s.id}. ${s.description}`));

    // Phase 2: Execute
    for (const step of this.plan) {
      console.log(`\n[Agent] Executing: ${step.description}`);

      const success = await this.executeStep(step, task);
      if (!success) {
        console.log(`[Agent] Plan aborted at step ${step.id}`);
        break;
      }
    }

    // Phase 3: Summarize
    const summary = await this.summarize(task);
    console.log(`\n[Agent] Complete. Tokens used: ${this.totalTokens}`);
    return summary;
  }

  async createPlan(task) {
    // ... (same as createPlan above)
  }

  async executeStep(step, task) {
    const messages = [
      {
        role: "system",
        content: `Execute this step: ${step.description}\nOriginal task: ${task}\n${this.getMemoryContext()}`,
      },
      { role: "user", content: step.description },
    ];

    for (let i = 0; i < 5; i++) {
      // Check guardrails
      if (this.totalTokens > this.maxTokens) {
        console.log("[Guard] Token limit reached");
        return false;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        tools: tools.getDefinitions(),
        tool_choice: "auto",
      });

      this.totalTokens += response.usage.total_tokens;
      const message = response.choices[0].message;
      messages.push(message);

      if (!message.tool_calls) {
        step.status = "complete";
        step.result = message.content;
        this.memory.push(`Completed: ${step.description} -> ${message.content}`);
        return true;
      }

      for (const tc of message.tool_calls) {
        const args = JSON.parse(tc.function.arguments);
        const result = await tools.execute(tc.function.name, args);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }

    step.status = "incomplete";
    return true;
  }

  getMemoryContext() {
    if (this.memory.length === 0) return "";
    return `\nWhat you've done so far:\n${this.memory.map(m => `- ${m}`).join("\n")}`;
  }

  async summarize(task) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Summarize what was accomplished. Be concise.",
        },
        {
          role: "user",
          content: `Task: ${task}\n\nCompleted steps:\n${this.memory.join("\n")}`,
        },
      ],
    });
    return response.choices[0].message.content;
  }
}

// Usage
const agent = new ProductionAgent({ maxIterations: 15, maxTokens: 50_000 });
const result = await agent.run("Set up a new Q3 2026 Fast Track cohort");
console.log(`\nResult:\n${result}`);
```

---

## Agent Architecture Patterns

### Pattern 1: Single Agent

One agent with all tools. Simple but limited.

```
User --> [ Agent + All Tools ] --> Result
```

### Pattern 2: Router Agent

A coordinator agent delegates to specialized sub-agents.

```
User --> [ Router Agent ]
              |
         ┌────┼────┐
         v    v    v
      [Data] [Comms] [Web]
      Agent  Agent   Agent
```

### Pattern 3: Pipeline Agent

Agents connected in sequence, each handling one phase.

```
User --> [ Research Agent ] --> [ Analysis Agent ] --> [ Writing Agent ] --> Result
```

### Pattern 4: Debate Agents

Multiple agents propose answers, then critique each other.

```
User --> [ Agent A ] ──┐
     --> [ Agent B ] ──┤──> [ Judge Agent ] --> Best Answer
     --> [ Agent C ] ──┘
```

---

## Key Takeaways

- **Planning before execution** prevents agents from going off-track. Use a two-phase approach: create the plan first, then execute step by step.
- **Failure handling is not optional.** Implement retry with backoff, step-level recovery, and graceful degradation.
- **Memory management matters** for long-running agents. Use sliding windows, summarization, or external memory stores to stay within context limits.
- **Guardrails protect your users and your wallet.** Implement iteration limits, cost limits, tool call limits, output validation, and input sanitization.
- **Start with the simplest agent architecture** (single agent, few tools) and add complexity only when you have evidence you need it.

---

## Try It Yourself

1. **Build a planning agent** for the task: "Create a progress report for all active cohort members." The plan should include querying the database, analyzing completion rates, and formatting the report.

2. **Implement failure recovery.** Make one of your tools fail intermittently (50% chance of error). Does the agent retry? Does it adapt its strategy? Tune the recovery logic until the agent completes the task despite failures.

3. **Add memory management.** Run an agent on a task that requires 10+ steps. Implement message summarization so the context stays under 4000 tokens. Compare answer quality with and without summarization.

4. **Set up guardrails.** Add a cost tracker that stops the agent when spending exceeds $0.25. Add tool call limits. Test by giving the agent a deliberately vague task that could lead to many iterations.

5. **Build a two-agent system.** Create a "Research Agent" that gathers information, and a "Writing Agent" that takes the research output and creates a formatted report. Connect them in a pipeline. This is the foundation of multi-agent systems.

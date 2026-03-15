---
title: "What Are AI Agents?"
estimatedMinutes: 60
---

## What Are AI Agents?

Up to this point, every AI feature you have built follows the same pattern: the user sends a message, the LLM processes it, and you get a response back. One input, one output, done. That is a **simple LLM call**, and it works great for chat, summarization, and Q&A.

But what happens when the task is too complex for a single LLM call? What if the model needs to search the web, read the results, decide what to do next, query a database, and then write a summary based on everything it found? That is where **AI agents** come in.

An agent is an LLM that can **reason about what to do**, **take actions** using tools, **observe the results**, and **decide what to do next** -- in a loop, until the task is complete.

---

## Agents vs. Simple LLM Calls

Here is the fundamental difference:

### Simple LLM Call

```
User prompt --> LLM --> Response
```

The model sees the prompt, generates a response, and that is it. No loops, no tools, no decisions. You (the developer) are in full control of the flow.

### Agent

```
User task --> LLM thinks about what to do
                |
                v
          Take an action (call a tool)
                |
                v
          Observe the result
                |
                v
          Think again -- am I done?
                |
         ┌──────┴──────┐
         No             Yes
         |               |
         v               v
    Take another     Return final
      action          answer
```

The agent is in a **loop**. It decides what to do, does it, looks at what happened, and decides again. The developer provides the tools and guardrails, but the agent decides when and how to use them.

### A Concrete Example

**Simple LLM call**: "Summarize this article." You pass the article text, get a summary back.

**Agent**: "Research the top 3 competitors of We Build Black and write a comparison." The agent would need to:

1. Search the web for Black tech education organizations
2. Read several web pages
3. Extract key information about each organization
4. Compare them against WBB's programs
5. Write a structured comparison

No single LLM call can do all of that. The agent needs to take multiple actions and make decisions along the way.

---

## The Observe-Think-Act Loop

Every agent follows the same core loop, regardless of framework or implementation:

```
                    ┌─────────────┐
                    │   OBSERVE   │ <-- What just happened?
                    └──────┬──────┘    (tool results, user input, errors)
                           │
                           v
                    ┌─────────────┐
                    │    THINK    │ <-- What should I do next?
                    └──────┬──────┘    (reason about the observation)
                           │
                           v
                    ┌─────────────┐
                    │     ACT     │ <-- Execute an action
                    └──────┬──────┘    (call a tool, respond to user)
                           │
                           │
                    ┌──────┴──────┐
                    │  Done?      │
                    │  Yes → Stop │
                    │  No → Loop  │──────> back to OBSERVE
                    └─────────────┘
```

Let us trace through the competitor research example:

| Step | Phase | What Happens |
|------|-------|-------------|
| 1 | **Observe** | User asked "Research the top 3 competitors of WBB" |
| 2 | **Think** | I need to search for Black tech education organizations |
| 3 | **Act** | Call `web_search("Black tech education nonprofits NYC")` |
| 4 | **Observe** | Got results: /dev/color, Black Girls CODE, Code2040, ... |
| 5 | **Think** | I have candidate names. I need details about each one. Let me start with /dev/color. |
| 6 | **Act** | Call `read_webpage("https://devcolor.org/about")` |
| 7 | **Observe** | Got /dev/color's mission, programs, and founding year |
| 8 | **Think** | Good. Now I need Black Girls CODE. |
| 9 | **Act** | Call `read_webpage("https://blackgirlscode.com/about")` |
| 10 | **Observe** | Got Black Girls CODE's info |
| 11 | **Think** | I have enough data for 3 competitors. Time to write the comparison. |
| 12 | **Act** | Return final comparison to the user |

The key insight: the agent **decided** which tools to call, **which URLs** to visit, and **when to stop**. You did not hardcode any of that.

---

## Real-World Agent Examples

Agents are not science fiction. You are already using products powered by them:

### Code Assistants

GitHub Copilot's workspace feature and Claude Code are agents. When you ask them to fix a bug, they:
1. Read relevant files in your codebase
2. Understand the error
3. Propose a fix
4. Edit the files
5. Run tests to verify

### Customer Support

Modern support bots are agents that can:
1. Look up the customer's account
2. Check their order history
3. Query the knowledge base
4. Issue a refund or create a ticket
5. Send a confirmation email

### Data Analysis

When you ask ChatGPT to analyze a CSV file, it:
1. Reads the file
2. Writes Python code to analyze it
3. Executes the code
4. Reads the output
5. Writes a summary with charts

### Personal Assistants

Agents that can manage your calendar, send emails, book restaurants, and coordinate travel by calling multiple APIs in sequence.

---

## The Anatomy of an Agent

Every agent has four components:

### 1. The Brain (LLM)

The language model that does the reasoning. It reads the current state, decides what to do, and generates tool calls or responses. The quality of the LLM directly determines the quality of the agent.

### 2. Tools

Functions the agent can call to interact with the outside world. Examples:
- `web_search(query)` -- search the internet
- `read_file(path)` -- read a file
- `run_code(code)` -- execute code
- `send_email(to, subject, body)` -- send an email
- `query_database(sql)` -- run a database query

### 3. Memory

The agent's history of observations, thoughts, and actions. This is usually the conversation history (messages array), but can also include external memory (a database of past interactions).

### 4. Instructions

The system prompt that tells the agent who it is, what it can do, and what rules to follow. This is your primary control mechanism.

```
┌─────────────────────────────────────┐
│              AGENT                  │
│                                     │
│  ┌───────────┐    ┌──────────────┐  │
│  │   Brain   │    │    Tools     │  │
│  │   (LLM)   │◄──►│ web_search() │  │
│  │           │    │ read_file()  │  │
│  └─────┬─────┘    │ run_code()   │  │
│        │          └──────────────┘  │
│        │                            │
│  ┌─────┴─────┐    ┌──────────────┐  │
│  │  Memory   │    │ Instructions │  │
│  │ (history) │    │  (system     │  │
│  │           │    │   prompt)    │  │
│  └───────────┘    └──────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

---

## Your First Agent: A Minimal Implementation

Let us build a dead-simple agent that can answer questions by searching the web. No frameworks, no libraries -- just an LLM with a tool.

### JavaScript Implementation

```javascript
// agents/simple-agent.js
import OpenAI from "openai";

const openai = new OpenAI();

// Define our tool
const tools = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for current information. Use this when you need facts you don't know or that might have changed recently.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query",
          },
        },
        required: ["query"],
      },
    },
  },
];

// Simulate web search (replace with real API in production)
async function webSearch(query) {
  console.log(`  [Tool] Searching: "${query}"`);
  // In production, call a real search API (SerpAPI, Tavily, etc.)
  return `Search results for "${query}":\n1. We Build Black is a 501(c)(3) non-profit in Brooklyn, NY founded in 2016.\n2. WBB offers Fast Track, Crowns of Code, and Mavens I/O programs.\n3. Past sponsors include Google, JP Morgan Chase, and Microsoft.`;
}

// The agent loop
async function runAgent(userTask) {
  const messages = [
    {
      role: "system",
      content: `You are a helpful research assistant. You can search the web to find information.
Think step by step. When you have enough information to answer, provide your final response.`,
    },
    { role: "user", content: userTask },
  ];

  const MAX_ITERATIONS = 10;  // Safety limit

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    console.log(`\n--- Iteration ${i + 1} ---`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools,
      tool_choice: "auto",  // Let the model decide whether to use tools
    });

    const message = response.choices[0].message;
    messages.push(message);  // Add assistant's response to memory

    // Check if the model wants to call a tool
    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        console.log(`  [Think] Calling ${toolCall.function.name}(${JSON.stringify(args)})`);

        // Execute the tool
        let result;
        if (toolCall.function.name === "web_search") {
          result = await webSearch(args.query);
        } else {
          result = `Error: Unknown tool "${toolCall.function.name}"`;
        }

        // Add the tool result to memory
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });

        console.log(`  [Observe] Got result (${result.length} chars)`);
      }
    } else {
      // No tool calls -- the agent is done
      console.log(`\n[Done] Agent finished after ${i + 1} iterations`);
      return message.content;
    }
  }

  return "Agent reached maximum iterations without completing the task.";
}

// Run it
const answer = await runAgent("What programs does We Build Black offer and who are their sponsors?");
console.log(`\n=== Final Answer ===\n${answer}`);
```

### Python Implementation

```python
# agents/simple_agent.py
import json
import openai

client = openai.OpenAI()

tools = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web for current information.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query",
                    }
                },
                "required": ["query"],
            },
        },
    },
]

def web_search(query: str) -> str:
    """Simulate a web search (replace with real API in production)."""
    print(f'  [Tool] Searching: "{query}"')
    return (
        f'Search results for "{query}":\n'
        "1. We Build Black is a 501(c)(3) non-profit in Brooklyn, NY.\n"
        "2. WBB offers Fast Track, Crowns of Code, and Mavens I/O.\n"
        "3. Past sponsors include Google, JP Morgan Chase, and Microsoft."
    )

TOOL_FUNCTIONS = {"web_search": web_search}

def run_agent(user_task: str, max_iterations: int = 10) -> str:
    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful research assistant. You can search the web. "
                "Think step by step. When you have enough information, provide your final response."
            ),
        },
        {"role": "user", "content": user_task},
    ]

    for i in range(max_iterations):
        print(f"\n--- Iteration {i + 1} ---")

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            tools=tools,
            tool_choice="auto",
        )

        message = response.choices[0].message
        messages.append(message)

        if message.tool_calls:
            for tool_call in message.tool_calls:
                func_name = tool_call.function.name
                args = json.loads(tool_call.function.arguments)
                print(f"  [Think] Calling {func_name}({args})")

                func = TOOL_FUNCTIONS.get(func_name)
                result = func(**args) if func else f"Error: Unknown tool {func_name}"

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": result,
                })
                print(f"  [Observe] Got result ({len(result)} chars)")
        else:
            print(f"\n[Done] Agent finished after {i + 1} iterations")
            return message.content

    return "Agent reached maximum iterations."

answer = run_agent("What programs does We Build Black offer?")
print(f"\n=== Final Answer ===\n{answer}")
```

> **Cost Awareness:** Each agent iteration makes at least one LLM call. A 10-step agent run with GPT-4o (~2,000 input + 500 output tokens per step) costs roughly $0.10 total. With GPT-4o-mini, that drops to ~$0.005. Always set MAX_ITERATIONS and consider using cheaper models for agent loops.

### What Just Happened?

Look at the structure of that code. The agent loop is just 30 lines:

1. Send messages to the LLM (including tool definitions)
2. If the LLM returns tool calls, execute them and add results to messages
3. If the LLM returns a regular message (no tool calls), we are done
4. Repeat

That is the entire agent pattern. Everything else -- frameworks, orchestrators, planners -- is built on top of this loop.

---

## When to Use Agents vs. Simple Chains

Not every task needs an agent. Use this decision framework:

### Use a Simple LLM Call When:

- The task has a single, predictable step (summarize, translate, classify)
- You know exactly what information the model needs (it is all in the prompt)
- Latency matters and you cannot afford multiple LLM roundtrips
- The task does not require external data or actions

### Use a Chain (Fixed Sequence) When:

- The task has multiple steps, but you know the steps in advance
- Example: "Extract entities from text, then look them up in a database, then format a report"
- You control the flow; the LLM does not make routing decisions

### Use an Agent When:

- The task requires dynamic decision-making about which tools to use
- You cannot predict how many steps will be needed
- The task involves exploring, researching, or troubleshooting
- The LLM needs to react to intermediate results

### The Spectrum

```
Simple Call          Chain               Agent
|---------------------|---------------------|
"Summarize this"    "Extract, then       "Research this topic
                     look up, then        and write a report"
                     format"

More control  ◄──────────────────────────►  More autonomy
Less risk                                  More risk
Faster                                     Slower
```

---

## The Risks of Agents

Agents are powerful, but they come with real risks that you need to understand before building them.

### 1. Runaway Loops

An agent can get stuck in a loop, calling the same tool repeatedly or going down rabbit holes. Always set a **maximum iteration limit**.

```javascript
const MAX_ITERATIONS = 10;  // Never let an agent run forever
```

### 2. Unintended Actions

If an agent has a `delete_file` tool, it might decide to use it in ways you did not expect. **Only give agents the minimum tools they need.**

### 3. Cost Explosion

Each iteration is an LLM call. An agent that runs 15 iterations with GPT-4o costs 15x more than a single call. **Monitor token usage and set cost limits.**

### 4. Hallucinated Tool Calls

The LLM might try to call tools that do not exist or pass invalid arguments. **Always validate tool calls before executing them.**

```javascript
// Validate before executing
if (toolCall.function.name in TOOL_FUNCTIONS) {
  const args = JSON.parse(toolCall.function.arguments);
  // Validate args schema here
  result = await TOOL_FUNCTIONS[toolCall.function.name](args);
} else {
  result = `Error: Tool "${toolCall.function.name}" does not exist.`;
}
```

### 5. Security

If an agent can execute code or access databases, a malicious prompt could trick it into doing harmful things. **Implement sandboxing and permission checks.**

---

## How Modern Agent Frameworks Work

You do not have to build the agent loop from scratch every time. Frameworks like LangChain, LlamaIndex, CrewAI, and the OpenAI Agents SDK provide the loop, tool management, and memory for you. But understanding the raw loop (which you just built) is essential for debugging and customizing agents.

Here is how the frameworks map to the components you learned:

| Component | Raw Implementation | Framework Equivalent |
|-----------|-------------------|---------------------|
| Agent loop | `for` loop with tool call check | `AgentExecutor`, `Runner` |
| Tools | Functions + JSON schema | `@tool` decorator, tool classes |
| Memory | Messages array | `ConversationBufferMemory`, thread storage |
| Instructions | System prompt string | Agent config, persona, instructions |

We will use raw implementations in this module so you understand every piece. Once you are comfortable, adopting a framework will be straightforward.

---

## Key Takeaways

- **An agent is an LLM in a loop** that can reason, take actions using tools, observe results, and decide what to do next.
- **The core loop is simple**: call the LLM, check for tool calls, execute tools, add results to memory, repeat until done.
- **Agents are not always the right choice.** Use simple LLM calls for single-step tasks, chains for predictable multi-step tasks, and agents for dynamic, open-ended tasks.
- **Every agent has four components**: brain (LLM), tools (functions), memory (conversation history), and instructions (system prompt).
- **Agents carry real risks**: runaway loops, unintended actions, cost explosion, and security vulnerabilities. Always implement guardrails.

---

## Try It Yourself

1. **Run the simple agent** above with a real search API (try Tavily or SerpAPI, both have free tiers). Ask it to research a topic and observe how many iterations it takes.

2. **Add a second tool.** Give the agent a `get_current_date()` tool and ask it a question that requires knowing today's date. Watch how it decides which tool to use.

3. **Test the safety limits.** Ask the agent a question that would require 20+ searches. Does it hit the MAX_ITERATIONS limit? What happens when it does?

4. **Log the full conversation.** Print the entire `messages` array after the agent finishes. Study the sequence of assistant messages and tool results. This is the agent's "thought process."

5. **Compare agent vs. single call.** Ask the same question with and without tools. For example: "What is the weather in Brooklyn right now?" With a tool, the agent can actually look it up. Without a tool, the LLM can only guess. Note the difference in answer quality and confidence.

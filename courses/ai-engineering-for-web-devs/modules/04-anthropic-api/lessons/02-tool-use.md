---
title: "Claude Tool Use"
estimatedMinutes: 60
---

# Claude Tool Use

In the previous module, you learned function calling with OpenAI. Claude has its own tool use system that shares the same core idea -- the model decides when to call a function, your code executes it, and you send the result back -- but the implementation details differ in important ways.

Claude's tool use is known for being particularly reliable at following tool definitions and generating well-structured arguments. In this lesson, you will learn how to define tools, handle tool calls, and build multi-step workflows with Claude.

---

## Defining Tools for Claude

Tools in the Anthropic API are defined using JSON Schema, similar to OpenAI, but structured differently. Each tool has a `name`, `description`, and an `input_schema`:

### JavaScript

```javascript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const tools = [
  {
    name: "get_weather",
    description:
      "Get the current weather for a specified city. Call this when the user asks about weather conditions, temperature, or forecasts for a location.",
    input_schema: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "The city name, e.g., 'Brooklyn' or 'Atlanta'",
        },
        unit: {
          type: "string",
          enum: ["fahrenheit", "celsius"],
          description: "Temperature unit. Defaults to fahrenheit.",
        },
      },
      required: ["city"],
    },
  },
];
```

### Python

```python
tools = [
    {
        "name": "get_weather",
        "description": "Get the current weather for a specified city. Call this when the user asks about weather conditions, temperature, or forecasts for a location.",
        "input_schema": {
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "description": "The city name, e.g., 'Brooklyn' or 'Atlanta'"
                },
                "unit": {
                    "type": "string",
                    "enum": ["fahrenheit", "celsius"],
                    "description": "Temperature unit. Defaults to fahrenheit."
                }
            },
            "required": ["city"]
        }
    }
]
```

### Key Structural Differences from OpenAI

| Aspect             | OpenAI                                     | Anthropic                          |
| ------------------ | ------------------------------------------ | ---------------------------------- |
| Tool wrapper       | `{ type: "function", function: {...} }`    | Flat object with `name`, `description`, `input_schema` |
| Schema field       | `parameters`                               | `input_schema`                     |
| Tool call ID       | `tool_call_id`                             | `tool_use_id`                      |
| Tool result role   | `role: "tool"`                             | `role: "user"` with `tool_result` content block |
| Response location  | `message.tool_calls[]`                     | `content[]` blocks with `type: "tool_use"` |

These differences are subtle but critical. Let us walk through the full flow.

---

## Making a Tool Use Request

### JavaScript

```javascript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  tools: tools,
  messages: [
    {
      role: "user",
      content: "What's the weather like in Brooklyn today?",
    },
  ],
});

console.log("Stop reason:", response.stop_reason);
// "tool_use"

console.log("Content blocks:", JSON.stringify(response.content, null, 2));
```

The response content will contain one or more blocks. When Claude wants to use a tool, you will see a `tool_use` block:

```json
[
  {
    "type": "text",
    "text": "I'll check the weather in Brooklyn for you."
  },
  {
    "type": "tool_use",
    "id": "toolu_abc123",
    "name": "get_weather",
    "input": {
      "city": "Brooklyn",
      "unit": "fahrenheit"
    }
  }
]
```

Notice two important things:
1. Claude may include a `text` block **alongside** the `tool_use` block, explaining what it is doing.
2. The `input` is already a parsed object (not a JSON string like OpenAI's `arguments`).

---

## The Complete Tool Use Loop

Here is the full pattern for handling tool calls with Claude:

### JavaScript: Complete Example

```javascript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

// Function implementations
function getWeather(city, unit = "fahrenheit") {
  const mockData = {
    Brooklyn: { temp: 45, condition: "Partly cloudy", humidity: 65 },
    Atlanta: { temp: 62, condition: "Sunny", humidity: 45 },
    Oakland: { temp: 58, condition: "Foggy", humidity: 80 },
  };

  const data = mockData[city] || { temp: 50, condition: "Unknown", humidity: 50 };
  const temp =
    unit === "celsius"
      ? Math.round(((data.temp - 32) * 5) / 9)
      : data.temp;

  return { city, temperature: temp, unit, ...data, temp: undefined };
}

const availableFunctions = {
  get_weather: ({ city, unit }) => getWeather(city, unit),
};

// Tool definitions
const tools = [
  {
    name: "get_weather",
    description: "Get the current weather for a city.",
    input_schema: {
      type: "object",
      properties: {
        city: { type: "string", description: "City name" },
        unit: { type: "string", enum: ["fahrenheit", "celsius"] },
      },
      required: ["city"],
    },
  },
];

async function chatWithTools(userMessage) {
  const messages = [{ role: "user", content: userMessage }];

  // Step 1: Initial API call
  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    tools,
    messages,
  });

  // Step 2: Loop while Claude wants to use tools
  while (response.stop_reason === "tool_use") {
    // Add Claude's response to the conversation
    messages.push({
      role: "assistant",
      content: response.content,
    });

    // Find and execute all tool use blocks
    const toolResults = [];

    for (const block of response.content) {
      if (block.type === "tool_use") {
        console.log(`Calling ${block.name} with:`, block.input);

        const fn = availableFunctions[block.name];
        if (!fn) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: `Error: Unknown tool '${block.name}'`,
            is_error: true,
          });
          continue;
        }

        try {
          const result = fn(block.input);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        } catch (error) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: `Error executing ${block.name}: ${error.message}`,
            is_error: true,
          });
        }
      }
    }

    // Step 3: Send tool results back
    messages.push({
      role: "user",
      content: toolResults,
    });

    // Step 4: Get Claude's response incorporating the results
    response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      tools,
      messages,
    });
  }

  // Extract the final text response
  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock ? textBlock.text : "";
}

// Test it
const answer = await chatWithTools(
  "What's the weather in Brooklyn and Atlanta?"
);
console.log(answer);
```

### Python: Complete Example

```python
import json
import anthropic

client = anthropic.Anthropic()

def get_weather(city: str, unit: str = "fahrenheit") -> dict:
    mock_data = {
        "Brooklyn": {"temp": 45, "condition": "Partly cloudy", "humidity": 65},
        "Atlanta": {"temp": 62, "condition": "Sunny", "humidity": 45},
        "Oakland": {"temp": 58, "condition": "Foggy", "humidity": 80},
    }
    data = mock_data.get(city, {"temp": 50, "condition": "Unknown", "humidity": 50})
    temp = round((data["temp"] - 32) * 5 / 9) if unit == "celsius" else data["temp"]
    return {"city": city, "temperature": temp, "unit": unit,
            "condition": data["condition"], "humidity": data["humidity"]}

available_functions = {
    "get_weather": lambda args: get_weather(args["city"], args.get("unit", "fahrenheit")),
}

tools = [
    {
        "name": "get_weather",
        "description": "Get the current weather for a city.",
        "input_schema": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "City name"},
                "unit": {"type": "string", "enum": ["fahrenheit", "celsius"]}
            },
            "required": ["city"]
        }
    }
]

def chat_with_tools(user_message: str) -> str:
    messages = [{"role": "user", "content": user_message}]

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        tools=tools,
        messages=messages
    )

    while response.stop_reason == "tool_use":
        messages.append({"role": "assistant", "content": response.content})

        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                print(f"Calling {block.name} with: {block.input}")

                fn = available_functions.get(block.name)
                if fn:
                    try:
                        result = fn(block.input)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": json.dumps(result)
                        })
                    except Exception as e:
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": f"Error: {str(e)}",
                            "is_error": True
                        })
                else:
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": f"Unknown tool: {block.name}",
                        "is_error": True
                    })

        messages.append({"role": "user", "content": tool_results})

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            tools=tools,
            messages=messages
        )

    text_block = next((b for b in response.content if b.type == "text"), None)
    return text_block.text if text_block else ""

answer = chat_with_tools("What's the weather in Brooklyn and Atlanta?")
print(answer)
```

---

## Handling Tool Errors Gracefully

One major advantage of Claude's tool use: you can tell Claude when a tool call fails using the `is_error` flag, and it will adapt:

```javascript
// When a tool fails, mark the result as an error
toolResults.push({
  type: "tool_result",
  tool_use_id: block.id,
  content: "Error: Weather service is temporarily unavailable. Please try again later.",
  is_error: true,
});
```

Claude will see the error, acknowledge it to the user, and might try an alternative approach or explain that it could not complete the request. This is much better than crashing your application.

---

## Real-World Example: Member Database Assistant

Let us build a practical tool -- an assistant that can query and update a member database for WBB cohorts:

```javascript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

// Simulated database
const membersDB = new Map([
  ["1", { id: "1", name: "Jordan", track: "Android Dev", milestone: 4, cohort: "2026-Q1", email: "jordan@example.com" }],
  ["2", { id: "2", name: "Maya", track: "UX Design", milestone: 6, cohort: "2026-Q1", email: "maya@example.com" }],
  ["3", { id: "3", name: "Devon", track: "Data Analytics", milestone: 2, cohort: "2026-Q1", email: "devon@example.com" }],
  ["4", { id: "4", name: "Amara", track: "Android Dev", milestone: 5, cohort: "2025-Q4", email: "amara@example.com" }],
]);

// Tool implementations
function searchMembers({ track, cohort, min_milestone, max_milestone }) {
  let results = Array.from(membersDB.values());
  if (track) results = results.filter((m) => m.track === track);
  if (cohort) results = results.filter((m) => m.cohort === cohort);
  if (min_milestone) results = results.filter((m) => m.milestone >= min_milestone);
  if (max_milestone) results = results.filter((m) => m.milestone <= max_milestone);
  return { count: results.length, members: results };
}

function updateMilestone({ member_id, new_milestone }) {
  const member = membersDB.get(member_id);
  if (!member) return { success: false, error: `Member ${member_id} not found` };
  if (new_milestone < 1 || new_milestone > 6) {
    return { success: false, error: "Milestone must be between 1 and 6" };
  }

  const oldMilestone = member.milestone;
  member.milestone = new_milestone;
  membersDB.set(member_id, member);

  return {
    success: true,
    member: member.name,
    previousMilestone: oldMilestone,
    newMilestone: new_milestone,
  };
}

function getCohortStats({ cohort }) {
  const members = Array.from(membersDB.values()).filter(
    (m) => m.cohort === cohort
  );
  if (members.length === 0) return { error: `No members found for cohort ${cohort}` };

  const avgMilestone =
    members.reduce((sum, m) => sum + m.milestone, 0) / members.length;

  const trackBreakdown = {};
  for (const m of members) {
    trackBreakdown[m.track] = (trackBreakdown[m.track] || 0) + 1;
  }

  return {
    cohort,
    totalMembers: members.length,
    averageMilestone: Math.round(avgMilestone * 10) / 10,
    trackBreakdown,
    completionRate:
      Math.round(
        (members.filter((m) => m.milestone === 6).length / members.length) * 100
      ) + "%",
  };
}

const availableFunctions = {
  search_members: searchMembers,
  update_milestone: updateMilestone,
  get_cohort_stats: getCohortStats,
};

const tools = [
  {
    name: "search_members",
    description:
      "Search the WBB member database. Filter by track, cohort, or milestone range. Returns matching member records.",
    input_schema: {
      type: "object",
      properties: {
        track: {
          type: "string",
          enum: ["Android Dev", "UX Design", "Data Analytics"],
          description: "Filter by learning track",
        },
        cohort: {
          type: "string",
          description: "Filter by cohort ID, e.g., '2026-Q1'",
        },
        min_milestone: {
          type: "integer",
          description: "Minimum milestone (1-6, inclusive)",
        },
        max_milestone: {
          type: "integer",
          description: "Maximum milestone (1-6, inclusive)",
        },
      },
    },
  },
  {
    name: "update_milestone",
    description:
      "Update a member's milestone progress. Use only when explicitly asked to update progress.",
    input_schema: {
      type: "object",
      properties: {
        member_id: {
          type: "string",
          description: "The member's ID",
        },
        new_milestone: {
          type: "integer",
          description: "The new milestone number (1-6)",
        },
      },
      required: ["member_id", "new_milestone"],
    },
  },
  {
    name: "get_cohort_stats",
    description:
      "Get aggregate statistics for a cohort including average milestone, track breakdown, and completion rate.",
    input_schema: {
      type: "object",
      properties: {
        cohort: {
          type: "string",
          description: "Cohort ID, e.g., '2026-Q1'",
        },
      },
      required: ["cohort"],
    },
  },
];

// Reuse the chatWithTools function from above, updated with these tools
```

---

## Controlling Tool Use with `tool_choice`

Like OpenAI, you can control how Claude uses tools:

```javascript
// Let Claude decide (default)
tool_choice: { type: "auto" }

// Force Claude to use a specific tool
tool_choice: { type: "tool", name: "get_weather" }

// Force Claude to use any tool (must use at least one)
tool_choice: { type: "any" }
```

Anthropic also supports `disable_parallel_tool_use: true` in the request to prevent the model from calling multiple tools at once -- useful when your tools have side effects that conflict.

**Practical example: forced extraction**

When you need structured data extraction, force Claude to use a specific tool to guarantee structured output:

```javascript
const tools = [
  {
    name: "extract_contact_info",
    description: "Extract structured contact information from text.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        company: { type: "string" },
      },
      required: ["name"],
    },
  },
];

const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  tools,
  tool_choice: { type: "tool", name: "extract_contact_info" },
  messages: [
    {
      role: "user",
      content:
        "My name is Jordan Williams, I work at TechCorp. Reach me at jordan@techcorp.com or 555-0123.",
    },
  ],
});

// The tool_use block will have the structured data
const toolUseBlock = response.content.find((b) => b.type === "tool_use");
console.log(toolUseBlock.input);
// { name: "Jordan Williams", email: "jordan@techcorp.com", phone: "555-0123", company: "TechCorp" }
```

This is a powerful pattern for structured data extraction -- you get guaranteed JSON output without having to parse free-form text.

---

## Tool Use with Streaming

You can stream tool use responses too. The event types differ:

```javascript
const stream = anthropic.messages.stream({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  tools,
  messages: [{ role: "user", content: "What's the weather in Brooklyn?" }],
});

let currentToolInput = "";
let currentToolName = "";
let currentToolId = "";

for await (const event of stream) {
  if (event.type === "content_block_start") {
    if (event.content_block.type === "tool_use") {
      currentToolName = event.content_block.name;
      currentToolId = event.content_block.id;
      currentToolInput = "";
      console.log(`Tool call started: ${currentToolName}`);
    }
  }

  if (event.type === "content_block_delta") {
    if (event.delta.type === "text_delta") {
      process.stdout.write(event.delta.text);
    }
    if (event.delta.type === "input_json_delta") {
      currentToolInput += event.delta.partial_json;
    }
  }

  if (event.type === "content_block_stop") {
    if (currentToolName) {
      const input = JSON.parse(currentToolInput);
      console.log(`\nExecuting ${currentToolName}:`, input);
      // Execute the tool and continue...
      currentToolName = "";
    }
  }
}
```

---

## Key Takeaways

1. **Tool definitions use `input_schema`**, not `parameters`. The schema format is the same JSON Schema, but the wrapper structure differs from OpenAI.
2. **Tool results go in a `user` message** with `tool_result` content blocks, referenced by `tool_use_id`. This is different from OpenAI's `role: "tool"` approach.
3. **The `input` is already parsed.** Claude returns tool inputs as an object, not a JSON string. No need to `JSON.parse()` like with OpenAI.
4. **Use `is_error: true`** to tell Claude when a tool call failed. It will handle errors gracefully and communicate the issue to the user.
5. **`tool_choice` enables forced extraction.** By forcing a specific tool, you guarantee structured JSON output -- great for data extraction pipelines.
6. **The tool use loop can repeat.** Claude may need multiple rounds of tool calls for complex queries. Always loop until `stop_reason !== "tool_use"`.
7. **Claude is particularly reliable at tool use.** It tends to follow tool descriptions carefully and generate well-formed arguments, making it a strong choice for tool-heavy applications.

---

## Try It Yourself

1. **Port the OpenAI Example**: Take the weather function calling example from Module 03 and rewrite it for the Anthropic API. Pay attention to the structural differences in tool definitions and result handling.

2. **Multi-Tool Assistant**: Define three different tools (e.g., weather, calculator, dictionary) and build an assistant that can answer questions requiring any combination of them.

3. **Structured Data Extraction**: Use forced tool choice to extract structured information from unstructured text -- try it with job postings, event descriptions, or email signatures.

4. **Error Handling**: Build a tool that intentionally fails 50% of the time. Verify that Claude handles the `is_error` flag gracefully and communicates the failure to the user.

5. **Streaming Tool Use**: Implement the streaming tool use pattern. Build a UI that shows "Thinking..." text from Claude, then "Calling tool..." when a tool is invoked, then the final response.

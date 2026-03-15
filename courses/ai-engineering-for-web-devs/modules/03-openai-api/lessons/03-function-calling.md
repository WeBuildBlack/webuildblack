---
title: "Function Calling & Tool Use"
estimatedMinutes: 60
---

# Function Calling & Tool Use

So far, the models you have worked with can only generate text. That is powerful, but limited. What if you want the AI to check the weather, query a database, send an email, or update a user profile? That is where function calling comes in.

Function calling (also called "tool use") lets the model request that your code execute a specific function with specific arguments. The model does not actually run the function -- it tells you what to call and with what parameters, and you execute it and send back the result.

This is the foundation for building AI agents, and it is one of the most important patterns in AI engineering.

---

## How Function Calling Works

The flow has four steps:

```
1. You define available functions (tools) in your API call
2. The model decides whether to call a function based on the conversation
3. The model returns a tool_calls response with function name + arguments
4. You execute the function, then send the result back to the model
```

Think of it like this: the model is the brain, and your functions are its hands. It decides what to do, your code actually does it.

---

## Defining Functions

Functions are defined using JSON Schema. You describe the function's name, what it does, and what parameters it accepts.

### JavaScript Example: Weather Lookup

```javascript
import OpenAI from "openai";

const openai = new OpenAI();

const tools = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description:
        "Get the current weather for a given city. Use this when the user asks about weather conditions.",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "The city name, e.g., 'Brooklyn' or 'San Francisco'",
          },
          unit: {
            type: "string",
            enum: ["fahrenheit", "celsius"],
            description:
              "Temperature unit. Defaults to fahrenheit for US cities.",
          },
        },
        required: ["city"],
      },
    },
  },
];
```

### Python Example

```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get the current weather for a given city. Use this when the user asks about weather conditions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "The city name, e.g., 'Brooklyn' or 'San Francisco'"
                    },
                    "unit": {
                        "type": "string",
                        "enum": ["fahrenheit", "celsius"],
                        "description": "Temperature unit. Defaults to fahrenheit for US cities."
                    }
                },
                "required": ["city"]
            }
        }
    }
]
```

**Tips for writing good function definitions:**

- **Clear descriptions matter.** The model uses the description to decide when to call the function. Be specific about when it should and should not be used.
- **Use `enum` for constrained values.** This prevents the model from inventing invalid options.
- **Mark `required` fields explicitly.** The model will always provide required fields but may skip optional ones.
- **Use descriptive parameter names.** `city` is better than `loc` or `c`.

You can add `strict: true` to your function definition to enable Structured Outputs mode, which guarantees the model's arguments will exactly match your JSON Schema. This eliminates malformed JSON but requires all properties to be listed in `required`.

---

## Making the API Call with Tools

Pass your tools array to the API call:

### JavaScript

```javascript
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    {
      role: "user",
      content: "What's the weather like in Brooklyn today?",
    },
  ],
  tools: tools,
});

const message = response.choices[0].message;
console.log("Finish reason:", response.choices[0].finish_reason);
// "tool_calls"

console.log("Tool calls:", JSON.stringify(message.tool_calls, null, 2));
```

The response will look like this:

```json
{
  "role": "assistant",
  "content": null,
  "tool_calls": [
    {
      "id": "call_abc123",
      "type": "function",
      "function": {
        "name": "get_weather",
        "arguments": "{\"city\": \"Brooklyn\", \"unit\": \"fahrenheit\"}"
      }
    }
  ]
}
```

Notice:
- `content` is `null` -- the model chose to call a function instead of responding with text.
- `arguments` is a JSON **string**, not an object. You must parse it.
- Each tool call has a unique `id` that you will reference when sending the result back.

---

## The Complete Function Calling Loop

Here is the full pattern: send message, detect tool calls, execute them, send results back.

### JavaScript: Complete Example

```javascript
import OpenAI from "openai";

const openai = new OpenAI();

// Step 1: Define your actual function implementations
function getWeather(city, unit = "fahrenheit") {
  // In production, call a real weather API
  const mockData = {
    Brooklyn: { temp: 45, condition: "Partly cloudy" },
    "San Francisco": { temp: 58, condition: "Foggy" },
    Atlanta: { temp: 62, condition: "Sunny" },
  };

  const data = mockData[city] || { temp: 50, condition: "Unknown" };
  const temp =
    unit === "celsius"
      ? Math.round(((data.temp - 32) * 5) / 9)
      : data.temp;

  return {
    city,
    temperature: temp,
    unit,
    condition: data.condition,
  };
}

// Step 2: Map function names to implementations
const availableFunctions = {
  get_weather: (args) => getWeather(args.city, args.unit),
};

// Step 3: Define tools for the API
const tools = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current weather for a city",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name" },
          unit: {
            type: "string",
            enum: ["fahrenheit", "celsius"],
          },
        },
        required: ["city"],
      },
    },
  },
];

// Step 4: The conversation loop
async function chatWithTools(userMessage) {
  const messages = [{ role: "user", content: userMessage }];

  // First API call
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    tools,
  });

  const assistantMessage = response.choices[0].message;

  // Check if the model wants to call functions
  if (assistantMessage.tool_calls) {
    // Add the assistant's response (with tool_calls) to messages
    messages.push(assistantMessage);

    // Execute each tool call
    for (const toolCall of assistantMessage.tool_calls) {
      const functionName = toolCall.function.name;
      // Always wrap JSON.parse in a try/catch -- the model can occasionally
      // produce malformed JSON, especially with complex schemas.
      let functionArgs;
      try {
        functionArgs = JSON.parse(toolCall.function.arguments);
      } catch (parseError) {
        console.error("Failed to parse tool arguments:", parseError.message);
        continue;
      }

      console.log(`Calling ${functionName} with:`, functionArgs);

      // Execute the function
      const functionResult = availableFunctions[functionName](functionArgs);

      // Add the function result to messages
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(functionResult),
      });
    }

    // Second API call -- model incorporates the function results
    const finalResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools,
    });

    return finalResponse.choices[0].message.content;
  }

  // No tool calls -- model responded directly
  return assistantMessage.content;
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
from openai import OpenAI

client = OpenAI()

def get_weather(city: str, unit: str = "fahrenheit") -> dict:
    """Mock weather function -- replace with real API in production."""
    mock_data = {
        "Brooklyn": {"temp": 45, "condition": "Partly cloudy"},
        "San Francisco": {"temp": 58, "condition": "Foggy"},
        "Atlanta": {"temp": 62, "condition": "Sunny"},
    }
    data = mock_data.get(city, {"temp": 50, "condition": "Unknown"})
    temp = round((data["temp"] - 32) * 5 / 9) if unit == "celsius" else data["temp"]
    return {"city": city, "temperature": temp, "unit": unit, "condition": data["condition"]}

available_functions = {
    "get_weather": get_weather,
}

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather for a city",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "City name"},
                    "unit": {"type": "string", "enum": ["fahrenheit", "celsius"]}
                },
                "required": ["city"]
            }
        }
    }
]

def chat_with_tools(user_message: str) -> str:
    messages = [{"role": "user", "content": user_message}]

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        tools=tools
    )

    assistant_message = response.choices[0].message

    if assistant_message.tool_calls:
        messages.append(assistant_message)

        for tool_call in assistant_message.tool_calls:
            function_name = tool_call.function.name
            function_args = json.loads(tool_call.function.arguments)

            print(f"Calling {function_name} with: {function_args}")

            result = available_functions[function_name](**function_args)

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(result)
            })

        final_response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=tools
        )

        return final_response.choices[0].message.content

    return assistant_message.content

answer = chat_with_tools("What's the weather in Brooklyn and Atlanta?")
print(answer)
```

---

## Parallel Tool Calls

Notice in the example above, we asked about weather in **two** cities. The model can return multiple tool calls in a single response, and your code should handle all of them before sending results back.

```javascript
// The model might return:
{
  "tool_calls": [
    {
      "id": "call_001",
      "function": { "name": "get_weather", "arguments": "{\"city\": \"Brooklyn\"}" }
    },
    {
      "id": "call_002",
      "function": { "name": "get_weather", "arguments": "{\"city\": \"Atlanta\"}" }
    }
  ]
}
```

You can control this behavior with the `parallel_tool_calls` parameter -- set it to `false` if your tools have side effects that could conflict when run simultaneously.

You can execute these in parallel for better performance:

```javascript
if (assistantMessage.tool_calls) {
  messages.push(assistantMessage);

  // Execute all tool calls in parallel
  const results = await Promise.all(
    assistantMessage.tool_calls.map(async (toolCall) => {
      const name = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      const result = await availableFunctions[name](args);

      return {
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      };
    })
  );

  // Add all results to messages
  messages.push(...results);

  // Get the final response
  const finalResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    tools,
  });

  return finalResponse.choices[0].message.content;
}
```

---

## Real-World Example: Database Query Tool

Let us build something more practical -- a tool that lets the AI query a database of community members:

```javascript
import OpenAI from "openai";

const openai = new OpenAI();

// Simulated database
const membersDB = [
  { id: 1, name: "Jordan", track: "Android Dev", milestone: 4, cohort: "2026-Q1" },
  { id: 2, name: "Maya", track: "UX Design", milestone: 6, cohort: "2026-Q1" },
  { id: 3, name: "Devon", track: "Data Analytics", milestone: 2, cohort: "2026-Q1" },
  { id: 4, name: "Amara", track: "Android Dev", milestone: 5, cohort: "2025-Q4" },
  { id: 5, name: "Chris", track: "UX Design", milestone: 3, cohort: "2026-Q1" },
];

// Function implementations
function searchMembers({ track, cohort, minMilestone }) {
  let results = [...membersDB];
  if (track) results = results.filter((m) => m.track === track);
  if (cohort) results = results.filter((m) => m.cohort === cohort);
  if (minMilestone) results = results.filter((m) => m.milestone >= minMilestone);
  return { count: results.length, members: results };
}

function getMemberStats({ cohort }) {
  const cohortMembers = membersDB.filter((m) => m.cohort === cohort);
  const avgMilestone =
    cohortMembers.reduce((sum, m) => sum + m.milestone, 0) /
    cohortMembers.length;

  return {
    cohort,
    totalMembers: cohortMembers.length,
    averageMilestone: Math.round(avgMilestone * 10) / 10,
    trackBreakdown: cohortMembers.reduce((acc, m) => {
      acc[m.track] = (acc[m.track] || 0) + 1;
      return acc;
    }, {}),
  };
}

const tools = [
  {
    type: "function",
    function: {
      name: "search_members",
      description:
        "Search the member database by track, cohort, or milestone progress. Returns matching members.",
      parameters: {
        type: "object",
        properties: {
          track: {
            type: "string",
            enum: ["Android Dev", "UX Design", "Data Analytics"],
            description: "Filter by learning track",
          },
          cohort: {
            type: "string",
            description: "Filter by cohort, e.g., '2026-Q1'",
          },
          minMilestone: {
            type: "integer",
            description:
              "Minimum milestone number (1-6). Returns members at or above this milestone.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_member_stats",
      description:
        "Get aggregate statistics for a cohort -- total members, average milestone, track breakdown.",
      parameters: {
        type: "object",
        properties: {
          cohort: {
            type: "string",
            description: "The cohort to get stats for, e.g., '2026-Q1'",
          },
        },
        required: ["cohort"],
      },
    },
  },
];

const availableFunctions = {
  search_members: searchMembers,
  get_member_stats: getMemberStats,
};

// Usage
async function queryMembers(question) {
  const messages = [
    {
      role: "system",
      content:
        "You are an assistant for We Build Black that helps query member data. Use the available tools to answer questions about members, cohorts, and progress.",
    },
    { role: "user", content: question },
  ];

  let response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    tools,
  });

  let assistantMessage = response.choices[0].message;

  // Handle tool calls (could be multiple rounds)
  while (assistantMessage.tool_calls) {
    messages.push(assistantMessage);

    for (const toolCall of assistantMessage.tool_calls) {
      const fn = availableFunctions[toolCall.function.name];
      const args = JSON.parse(toolCall.function.arguments);
      const result = fn(args);

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }

    response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools,
    });

    assistantMessage = response.choices[0].message;
  }

  return assistantMessage.content;
}

console.log(
  await queryMembers(
    "How many members in the 2026-Q1 cohort are past milestone 3?"
  )
);
console.log(
  await queryMembers(
    "Give me stats for the current cohort and list all UX designers."
  )
);
```

---

## Controlling Tool Use Behavior

You can control whether and how the model uses tools with the `tool_choice` parameter:

```javascript
// Let the model decide (default)
tool_choice: "auto"

// Force the model to call a specific function
tool_choice: {
  type: "function",
  function: { name: "get_weather" }
}

// Prevent the model from calling any functions
tool_choice: "none"

// Require the model to call at least one function (any function)
tool_choice: "required"
```

**When to use `tool_choice`:**

- Use `"auto"` (default) for most cases. The model decides when tools are needed.
- Use `"required"` when you know the user's request definitely needs a tool call (e.g., "Look up order #12345").
- Use `"none"` when you want to force a text response, even if tools are available.
- Use a specific function when building a pipeline where a particular tool must always be called.

---

## Security Considerations

Function calling introduces real risk because you are letting the model influence what code your application executes.

### Validate Everything

```javascript
function executeToolCall(toolCall) {
  const name = toolCall.function.name;
  const args = JSON.parse(toolCall.function.arguments);

  // Only allow registered functions
  if (!availableFunctions[name]) {
    throw new Error(`Unknown function: ${name}`);
  }

  // Validate and sanitize arguments
  if (name === "search_members") {
    if (args.minMilestone && (args.minMilestone < 1 || args.minMilestone > 6)) {
      throw new Error("minMilestone must be between 1 and 6");
    }
    // Prevent injection: only allow known track values
    const validTracks = ["Android Dev", "UX Design", "Data Analytics"];
    if (args.track && !validTracks.includes(args.track)) {
      throw new Error(`Invalid track: ${args.track}`);
    }
  }

  return availableFunctions[name](args);
}
```

### Never Allow Destructive Operations Without Confirmation

```javascript
// BAD -- the model could delete data
const tools = [
  {
    type: "function",
    function: {
      name: "delete_member",
      description: "Delete a member from the database",
      // ...
    },
  },
];

// BETTER -- require explicit confirmation flow
const tools = [
  {
    type: "function",
    function: {
      name: "request_member_deletion",
      description:
        "Request deletion of a member. Returns a confirmation token that must be approved by an admin.",
      // ...
    },
  },
];
```

---

## Key Takeaways

1. **Function calling bridges AI and your code.** The model decides what to call, your code executes it, and the model interprets the result.
2. **Good descriptions are critical.** The model uses function and parameter descriptions to decide when and how to use each tool.
3. **The flow is: define tools, detect tool_calls, execute, send results back.** This loop can repeat multiple times for complex queries.
4. **The model can call multiple functions in parallel.** Handle all tool calls before making the next API request.
5. **Always validate tool call arguments.** Never trust the model's output -- treat it like untrusted user input.
6. **Use `tool_choice` to control behavior.** Force, prevent, or let the model decide about tool use.
7. **Function calling is the foundation of AI agents.** Master this pattern and you can build agents that interact with any API or database.

---

## Try It Yourself

1. **Extend the Weather Example**: Add a second tool, `get_forecast`, that returns a 5-day forecast. Ask the model "What's the weather today and what should I expect this week?" and verify it calls both tools.

2. **Build a Calculator Tool**: Define tools for `add`, `subtract`, `multiply`, and `divide`. Ask the model complex math questions and watch it chain tool calls.

3. **API Integration**: Replace the mock weather function with a real weather API call (try OpenWeatherMap's free tier). Handle the async API call within the tool execution.

4. **Multi-Turn with Tools**: Build a conversation where the first message triggers a tool call, and a follow-up question references the tool's result without needing another call.

5. **Security Audit**: Take the database query example and try to make the model call functions with invalid or malicious arguments. Add validation to prevent each attack vector.

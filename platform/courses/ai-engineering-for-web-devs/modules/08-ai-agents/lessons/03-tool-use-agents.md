---
title: "Giving Agents Tools"
estimatedMinutes: 60
---

## Giving Agents Tools

An agent without tools is just a chatbot. Tools are what give agents the ability to interact with the real world -- searching the web, querying databases, calling APIs, reading files, and taking actions on behalf of the user.

In this lesson you will learn how to design tools, build a tool registry, connect agents to real APIs, and handle the edge cases that come up in production.

---

## What Is a Tool?

A tool is a function that the LLM can call during its reasoning loop. You define what the tool does (its schema), and the LLM decides when and how to call it.

Every tool has three parts:

1. **Name**: A short identifier (e.g., `web_search`, `query_database`)
2. **Description**: A natural language explanation of what the tool does and when to use it
3. **Parameters**: A JSON Schema defining the inputs the tool accepts

```javascript
// The tool definition (what the LLM sees)
const tool = {
  type: "function",
  function: {
    name: "get_member_info",
    description: "Look up a WBB member's information by name. Returns their track, cohort, milestone progress, and contact info.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The member's full name (e.g., 'Aisha Johnson')",
        },
      },
      required: ["name"],
    },
  },
};

// The tool implementation (what actually runs)
async function getMemberInfo({ name }) {
  // In production, query Notion or your database
  const response = await notion.databases.query({
    database_id: process.env.NOTION_MEMBERS_DB_ID,
    filter: { property: "Name", title: { equals: name } },
  });
  return JSON.stringify(response.results[0]?.properties || { error: "Member not found" });
}
```

The LLM never sees your implementation code. It only sees the name, description, and parameter schema. This is why **good descriptions are critical** -- they are how the model decides when and how to use each tool.

---

## Designing Good Tool Descriptions

The tool description is the most important part. A vague description leads to misuse. A clear description leads to reliable behavior.

### Bad Descriptions

```javascript
// Too vague -- when should the LLM use this?
{ description: "Gets data" }

// Too technical -- the LLM doesn't need implementation details
{ description: "Executes a SQL SELECT query against the PostgreSQL cohort_members table with parameterized inputs" }

// Ambiguous -- could mean anything
{ description: "Process the member" }
```

### Good Descriptions

```javascript
// Clear purpose, usage guidance, and expected behavior
{
  description: "Search the WBB member directory by name. Use this when the user asks about a specific person's enrollment, progress, or contact information. Returns the member's track, cohort, current milestone, and email."
}

// Explicit about what it CAN'T do
{
  description: "Look up today's weather for a given city. Only supports US cities. Returns temperature, conditions, and humidity. Does NOT provide forecasts -- use get_weather_forecast for future weather."
}

// Includes examples of when to use it
{
  description: "Calculate a mathematical expression. Use this for any arithmetic, percentages, or unit conversions. Examples: '6 * 1000', '45000 * 0.30', '(12 + 8) / 4'. Does NOT support symbolic math or equations with variables."
}
```

### Parameter Descriptions Matter Too

```javascript
// Bad
{ description: "The query" }

// Good
{ description: "A natural language search query. Be specific -- 'WBB Fast Track stipend amount' works better than 'stipend'." }
```

### Designing Good Tool Output

What your tool *returns* to the LLM matters as much as the description. Keep tool output concise -- the LLM processes every token. Return structured data (JSON) rather than prose. Include only relevant fields. For search results, return titles + snippets, not full page content. For database queries, return formatted results, not raw SQL output.

---

## Building a Tool Registry

When your agent has more than 2-3 tools, managing them as a flat array gets messy. A tool registry centralizes tool definitions and implementations.

### JavaScript Tool Registry

```javascript
// tools/registry.js

/**
 * A registry for managing agent tools.
 * Keeps definitions (for the LLM) and handlers (for execution) together.
 */
export class ToolRegistry {
  constructor() {
    this.tools = new Map();  // name -> { definition, handler }
  }

  /**
   * Register a new tool.
   * @param {string} name - Tool name
   * @param {string} description - What the tool does
   * @param {object} parameters - JSON Schema for parameters
   * @param {Function} handler - Async function that executes the tool
   */
  register(name, description, parameters, handler) {
    this.tools.set(name, {
      definition: {
        type: "function",
        function: { name, description, parameters },
      },
      handler,
    });
  }

  /**
   * Get all tool definitions for the LLM API call.
   */
  getDefinitions() {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  /**
   * Execute a tool by name with given arguments.
   */
  async execute(name, args) {
    const tool = this.tools.get(name);
    if (!tool) {
      return { error: `Unknown tool: "${name}". Available tools: ${this.listNames().join(", ")}` };
    }

    try {
      const result = await tool.handler(args);
      return { success: true, result };
    } catch (error) {
      return { error: `Tool "${name}" failed: ${error.message}` };
    }
  }

  /**
   * List all registered tool names.
   */
  listNames() {
    return Array.from(this.tools.keys());
  }

  /**
   * Check if a tool exists.
   */
  has(name) {
    return this.tools.has(name);
  }
}
```

### Registering Tools

```javascript
// tools/setup.js
import { ToolRegistry } from "./registry.js";

export function createWBBTools() {
  const registry = new ToolRegistry();

  // Web search tool
  registry.register(
    "web_search",
    "Search the web for current information. Use when you need facts you don't know or that might have changed recently.",
    {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
      },
      required: ["query"],
    },
    async ({ query }) => {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query: query,
          max_results: 5
        })
      });
      const data = await response.json();
      return data.results.map(r => `${r.title}: ${r.content}`).join("\n\n");
    }
  );

  // Notion member lookup
  registry.register(
    "lookup_member",
    "Look up a WBB member's information by name. Returns track, cohort, milestone, and contact info.",
    {
      type: "object",
      properties: {
        name: { type: "string", description: "Member's full name" },
      },
      required: ["name"],
    },
    async ({ name }) => {
      // Query Notion API
      const response = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_MEMBERS_DB_ID}/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filter: { property: "Name", title: { contains: name } },
        }),
      });
      const data = await response.json();
      if (data.results.length === 0) return `No member found with name "${name}"`;
      return JSON.stringify(data.results[0].properties, null, 2);
    }
  );

  // Send Slack message
  registry.register(
    "send_slack_message",
    "Send a message to a Slack channel. Use only when explicitly asked to notify or message someone.",
    {
      type: "object",
      properties: {
        channel: { type: "string", description: "Slack channel name (e.g., 'general', 'cohort-2026-q1')" },
        message: { type: "string", description: "The message text to send" },
      },
      required: ["channel", "message"],
    },
    async ({ channel, message }) => {
      // In production, resolve channel name to ID first
      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channel, text: message }),
      });
      const data = await response.json();
      return data.ok ? `Message sent to #${channel}` : `Error: ${data.error}`;
    }
  );

  // Calculate
  registry.register(
    "calculate",
    "Evaluate a mathematical expression. Supports basic arithmetic and percentages.",
    {
      type: "object",
      properties: {
        expression: { type: "string", description: "Math expression (e.g., '6 * 1000', '45000 * 0.30')" },
      },
      required: ["expression"],
    },
    async ({ expression }) => {
      // WARNING: Function() can execute arbitrary code.
      // For production, use a safe math parser like `mathjs`.
      // This is acceptable for a learning exercise only.
      const result = Function(`"use strict"; return (${expression})`)();
      return String(result);
    }
  );

  // Get current date/time
  registry.register(
    "get_current_datetime",
    "Get the current date and time. Use when the user asks about today's date or you need to calculate deadlines.",
    {
      type: "object",
      properties: {},
    },
    async () => {
      return new Date().toISOString();
    }
  );

  return registry;
}
```

### Python Tool Registry

```python
# tools/registry.py
from dataclasses import dataclass, field
from typing import Callable, Any
import json

@dataclass
class Tool:
    name: str
    description: str
    parameters: dict
    handler: Callable

    @property
    def definition(self) -> dict:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }

class ToolRegistry:
    def __init__(self):
        self._tools: dict[str, Tool] = {}

    def register(self, name: str, description: str, parameters: dict, handler: Callable):
        self._tools[name] = Tool(name, description, parameters, handler)

    def get_definitions(self) -> list[dict]:
        return [tool.definition for tool in self._tools.values()]

    async def execute(self, name: str, args: dict) -> dict:
        tool = self._tools.get(name)
        if not tool:
            available = ", ".join(self._tools.keys())
            return {"error": f'Unknown tool: "{name}". Available: {available}'}
        try:
            result = await tool.handler(**args)
            return {"success": True, "result": result}
        except Exception as e:
            return {"error": f'Tool "{name}" failed: {str(e)}'}

    def has(self, name: str) -> bool:
        return name in self._tools

    def list_names(self) -> list[str]:
        return list(self._tools.keys())
```

---

## Using the Registry in an Agent

```javascript
// agents/tooled-agent.js
import OpenAI from "openai";
import { createWBBTools } from "../tools/setup.js";

const openai = new OpenAI();
const tools = createWBBTools();

async function runAgent(task) {
  const messages = [
    {
      role: "system",
      content: `You are the We Build Black operations assistant.
You help manage members, programs, and communications.

Available tools: ${tools.listNames().join(", ")}

Rules:
- Before sending any Slack message, confirm the content with the user
- Always explain your reasoning before using a tool
- If you're unsure, ask for clarification rather than guessing`,
    },
    { role: "user", content: task },
  ];

  for (let i = 0; i < 10; i++) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: tools.getDefinitions(),
      tool_choice: "auto",
    });

    const message = response.choices[0].message;
    if (message.content) console.log(`[Agent] ${message.content}`);
    messages.push(message);

    if (!message.tool_calls) return message.content;

    for (const tc of message.tool_calls) {
      const args = JSON.parse(tc.function.arguments);
      console.log(`[Tool] ${tc.function.name}(${JSON.stringify(args)})`);

      const result = await tools.execute(tc.function.name, args);
      const resultStr = result.error || JSON.stringify(result.result);

      console.log(`[Result] ${resultStr.slice(0, 200)}...`);

      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: resultStr,
      });
    }
  }
}

await runAgent("Look up member Aisha Johnson and tell me her current milestone progress.");
```

---

## Common Tool Categories

Here are the tool categories you will most often need:

### 1. Information Retrieval

```javascript
// Search, lookup, and read tools
"web_search"        // Search the internet
"lookup_member"     // Query a database
"read_document"     // Read a file or URL
"get_weather"       // Call a weather API
"search_knowledge"  // RAG-style vector search
```

### 2. Actions

```javascript
// Tools that change state
"send_slack_message"  // Send a notification
"create_event"        // Create a calendar event
"update_record"       // Update a database row
"send_email"          // Send an email
"create_channel"      // Create a Slack channel
```

### 3. Computation

```javascript
// Tools that process data
"calculate"         // Math operations
"run_code"          // Execute code in a sandbox
"generate_chart"    // Create a visualization
"format_data"       // Convert between formats (CSV→JSON, etc.)
```

### 4. System / Meta

```javascript
// Tools about the agent itself
"get_current_datetime"  // Current date and time
"ask_user"              // Request clarification from the user
"save_memory"           // Store information for later
"get_agent_status"      // Check how many iterations have been used
```

---

## Building Real-World Tools

### Tool 1: Database Query Tool

This tool lets the agent query your Notion database to find member information.

```javascript
// tools/notion-tools.js

export function registerNotionTools(registry) {
  registry.register(
    "query_members",
    "Query the WBB member directory. Can filter by track, cohort, milestone status, or search by name. Returns matching members with their details.",
    {
      type: "object",
      properties: {
        filter_by: {
          type: "string",
          enum: ["name", "track", "cohort", "status"],
          description: "Which field to filter on",
        },
        filter_value: {
          type: "string",
          description: "The value to filter for (e.g., 'Android Dev', '2026-Q1', 'In Progress')",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 10)",
        },
      },
      required: ["filter_by", "filter_value"],
    },
    async ({ filter_by, filter_value, limit = 10 }) => {
      const filterMap = {
        name: { property: "Name", title: { contains: filter_value } },
        track: { property: "Track", select: { equals: filter_value } },
        cohort: { property: "Cohort", select: { equals: filter_value } },
        status: { property: "Status", status: { equals: filter_value } },
      };

      const response = await fetch(
        `https://api.notion.com/v1/databases/${process.env.NOTION_MEMBERS_DB_ID}/query`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.NOTION_API_KEY}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filter: filterMap[filter_by],
            page_size: limit,
          }),
        }
      );

      const data = await response.json();
      const members = data.results.map(page => ({
        name: page.properties.Name?.title?.[0]?.plain_text || "Unknown",
        track: page.properties.Track?.select?.name || "N/A",
        cohort: page.properties.Cohort?.select?.name || "N/A",
        status: page.properties.Status?.status?.name || "N/A",
        milestone: page.properties.Milestone?.select?.name || "N/A",
        stipendPaid: page.properties["Stipend Paid"]?.number || 0,
      }));

      return JSON.stringify(members, null, 2);
    }
  );

  registry.register(
    "update_member_milestone",
    "Update a member's milestone progress. Use ONLY when explicitly asked to update a member's status.",
    {
      type: "object",
      properties: {
        member_page_id: {
          type: "string",
          description: "The Notion page ID of the member to update",
        },
        new_milestone: {
          type: "string",
          enum: ["1", "2", "3", "4", "5", "6"],
          description: "The milestone number to set",
        },
        status: {
          type: "string",
          enum: ["Not Started", "In Progress", "Complete"],
          description: "The new status",
        },
      },
      required: ["member_page_id", "new_milestone", "status"],
    },
    async ({ member_page_id, new_milestone, status }) => {
      const response = await fetch(`https://api.notion.com/v1/pages/${member_page_id}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${process.env.NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: {
            Milestone: { select: { name: new_milestone } },
            Status: { status: { name: status } },
            "Last Check-in": { date: { start: new Date().toISOString().split("T")[0] } },
          },
        }),
      });

      const data = await response.json();
      return data.id ? `Updated member ${member_page_id} to Milestone ${new_milestone} (${status})` : `Error: ${JSON.stringify(data)}`;
    }
  );
}
```

### Tool 2: Web Search with Real API

```javascript
// tools/search-tools.js

export function registerSearchTools(registry) {
  registry.register(
    "web_search",
    "Search the web for current information. Returns the top 5 results with titles, URLs, and content snippets.",
    {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
        max_results: { type: "number", description: "Number of results (default 5, max 10)" },
      },
      required: ["query"],
    },
    async ({ query, max_results = 5 }) => {
      // Using Tavily API (free tier: 1000 searches/month)
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query,
          max_results: Math.min(max_results, 10),
          include_answer: true,
        }),
      });

      const data = await response.json();

      let output = "";
      if (data.answer) output += `Summary: ${data.answer}\n\n`;

      output += data.results.map((r, i) =>
        `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.content}`
      ).join("\n\n");

      return output;
    }
  );
}
```

---

## Tool Safety and Permissions

Not all tools are equal. A `web_search` tool is read-only and low-risk. A `send_slack_message` tool takes a real action. A `delete_member` tool could be destructive. You need a permission model.

### Permission Levels

```javascript
// tools/permissions.js

const PERMISSION_LEVELS = {
  READ: "read",       // Safe: web_search, lookup_member, calculate
  WRITE: "write",     // Caution: send_message, update_record, create_event
  ADMIN: "admin",     // Danger: delete_record, modify_permissions
};

export class SafeToolRegistry extends ToolRegistry {
  register(name, description, parameters, handler, permission = PERMISSION_LEVELS.READ) {
    super.register(name, description, parameters, handler);
    this.tools.get(name).permission = permission;
  }

  async execute(name, args, options = {}) {
    const tool = this.tools.get(name);
    if (!tool) return { error: `Unknown tool: "${name}"` };

    // Require confirmation for write/admin actions
    if (tool.permission === PERMISSION_LEVELS.WRITE && !options.confirmed) {
      return {
        requiresConfirmation: true,
        message: `Tool "${name}" will perform a write action. Please confirm.`,
        pendingArgs: args,
      };
    }

    if (tool.permission === PERMISSION_LEVELS.ADMIN) {
      return {
        error: `Tool "${name}" requires admin approval and cannot be called by the agent directly.`,
      };
    }

    return super.execute(name, args);
  }
}
```

### Confirmation Flow

```javascript
// In the agent loop, handle confirmation
const result = await tools.execute(tc.function.name, args);

if (result.requiresConfirmation) {
  // Pause and ask the user
  console.log(`\n[Confirmation Required] ${result.message}`);
  console.log(`Action: ${tc.function.name}(${JSON.stringify(args)})`);

  const userConfirmed = await askUser("Proceed? (yes/no): ");

  if (userConfirmed.toLowerCase() === "yes") {
    const confirmedResult = await tools.execute(tc.function.name, args, { confirmed: true });
    // Continue with result
  } else {
    // Tell the agent the action was denied
    messages.push({
      role: "tool",
      tool_call_id: tc.id,
      content: "Action denied by user. Try a different approach or ask what the user would prefer.",
    });
  }
}
```

---

## How Many Tools Is Too Many?

More tools means more choices for the LLM, which means more potential for confusion. Here are guidelines:

| Number of Tools | Recommendation |
|-----------------|---------------|
| 1-5 | Ideal. The model can easily choose the right tool. |
| 6-15 | Fine with good descriptions. Group related tools logically. |
| 16-30 | Risky. Consider using tool selection as a two-step process. |
| 30+ | Problematic. Use a routing agent that selects a subset of tools first. |

### Routing Agent Pattern for Many Tools

```javascript
// For 30+ tools, use a two-stage approach:
// Stage 1: A "router" LLM selects which 5 tools are relevant
// Stage 2: The agent uses only those 5 tools

async function selectTools(task, allTools, maxTools = 5) {
  const toolSummaries = allTools.listNames().map(name => {
    const def = allTools.tools.get(name).definition.function;
    return `- ${def.name}: ${def.description}`;
  }).join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Given a task, select the ${maxTools} most relevant tools from this list:\n${toolSummaries}\n\nReturn ONLY tool names, one per line.`,
      },
      { role: "user", content: task },
    ],
    temperature: 0,
  });

  const selectedNames = response.choices[0].message.content
    .split("\n")
    .map(n => n.trim().replace(/^-\s*/, ""))
    .filter(n => allTools.has(n));

  // Build a filtered registry
  const filtered = new ToolRegistry();
  for (const name of selectedNames) {
    const tool = allTools.tools.get(name);
    filtered.tools.set(name, tool);
  }

  return filtered;
}
```

---

## Key Takeaways

- **Tools are what make agents useful.** Without tools, an agent is just a chatbot. With tools, it can search, query, compute, and take actions.
- **Tool descriptions are critical.** The LLM decides which tool to call based solely on the name and description. Write clear, specific descriptions with examples and limitations.
- **Use a tool registry** to manage tool definitions and handlers in one place. This makes it easy to add, remove, and test tools.
- **Implement permission levels** for tools. Read-only tools can be called freely. Write tools should require confirmation. Admin tools should require human approval.
- **Keep the tool count manageable.** 5-15 tools is the sweet spot. For larger tool sets, use a routing agent to select relevant tools first.
- **Always return structured errors** from tools so the agent can adjust its approach.

---

## Try It Yourself

1. **Build a 5-tool agent.** Register tools for `web_search`, `lookup_member`, `calculate`, `get_current_datetime`, and `send_slack_message`. Ask the agent to "find out how much stipend Aisha Johnson has earned and send a congratulations message to #general."

2. **Add confirmation for write tools.** Implement the confirmation flow so the agent pauses before sending the Slack message and shows you what it plans to send.

3. **Test with a bad tool call.** What happens when the agent calls `lookup_member` with a name that does not exist? Does it handle the error and try a different approach, or does it crash?

4. **Build a custom tool.** Create a tool that queries a real API you use (GitHub, weather, news, etc.). Register it and test it in the agent loop.

5. **Stress test with many tools.** Register 20 dummy tools with different descriptions. Does the agent still pick the right ones? At what point does it start making mistakes? Try the routing agent pattern to see if it helps.

---
title: "Module Project: Research Agent"
estimatedMinutes: 120
---

## Module Project: Research Agent

Build an AI agent that takes a research question, autonomously searches the web, reads relevant pages, takes notes, and produces a structured research brief. This is the most complex thing you've built in this course so far -- you'll implement the ReAct loop, a tool registry with real tools (web search, page reader, note-taker), multi-step planning, iteration limits, and a final report formatter. When you're done, you'll have an agent that can answer research questions you'd normally spend 30+ minutes on manually.

---

## What You'll Practice

- Understanding the difference between agents and simple LLM chains (Lesson 1: What Are AI Agents?)
- Implementing the ReAct (Reason + Act) loop with explicit thought/action/observation steps (Lesson 2: The ReAct Pattern)
- Building a tool registry with typed tool definitions and descriptions (Lesson 3: Giving Agents Tools)
- Designing tool descriptions that the LLM can reliably use (Lesson 3: Designing Good Tool Descriptions)
- Multi-step planning with plan generation, execution, and re-planning (Lesson 4: Multi-Step Planning)
- Implementing guardrails: iteration limits, error recovery, and cost tracking (Lesson 4: Guardrails)

---

## Prerequisites

Before you start, make sure you have:

- **Node.js 18+** installed
- **An OpenAI API key** (for chat completions -- this project is LLM-heavy)
- A free API key for web search. Options:
  - **Tavily** ([tavily.com](https://tavily.com)) -- 1,000 free searches/month, purpose-built for AI agents
  - **SerpAPI** ([serpapi.com](https://serpapi.com)) -- 100 free searches/month
  - Or use DuckDuckGo's instant answer API (no key needed, limited results)
- Completed Modules 1-5 (solid understanding of LLM APIs and tool use)

### Setup

```bash
# Create your project
mkdir research-agent && cd research-agent
npm init -y
npm install openai dotenv

# Create environment file
cat > .env << 'EOF'
OPENAI_API_KEY=sk-your-key-here
TAVILY_API_KEY=tvly-your-key-here
EOF

# Create folder structure
mkdir -p src/tools src/output
```

---

## Step-by-Step Instructions

### Step 1: Build the Tool Registry (15 min)

Create `src/tools/registry.js`. This is the backbone of your agent -- a system for registering, describing, and executing tools.

```javascript
// src/tools/registry.js

/**
 * Tool registry: stores tool definitions and executes them by name.
 * Each tool has a name, description, parameter schema, and execute function.
 */
export class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  register(tool) {
    // TODO: Validate that the tool has: name (string), description (string),
    // parameters (object with JSON Schema format), and execute (async function).
    // Throw an error if any are missing.
    this.tools.set(tool.name, tool);
  }

  getTool(name) {
    return this.tools.get(name);
  }

  /**
   * Return tool definitions formatted for OpenAI's tool_choice API.
   */
  getToolDefinitions() {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Execute a tool by name with the given arguments.
   * Returns the result as a string.
   */
  async execute(name, args) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);

    try {
      const result = await tool.execute(args);
      return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (err) {
      return `Error executing ${name}: ${err.message}`;
    }
  }

  listTools() {
    return Array.from(this.tools.values()).map(t => `${t.name}: ${t.description}`);
  }
}
```

### Step 2: Implement the Tools (15 min)

Create three tools: web search, page reader, and note-taker.

```javascript
// src/tools/web-search.js

/**
 * Search the web using the Tavily API (or your chosen search provider).
 * Returns a list of results with titles, URLs, and snippets.
 */
export const webSearchTool = {
  name: 'web_search',
  description: 'Search the web for information on a topic. Returns titles, URLs, and brief snippets. Use this when you need to find current information or sources on a topic.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query. Be specific and use keywords.',
      },
    },
    required: ['query'],
  },
  execute: async ({ query }) => {
    // TODO: Call the Tavily API (or your chosen search API)
    // POST https://api.tavily.com/search
    // Body: { api_key, query, max_results: 5, include_raw_content: false }
    // Return a formatted string with results: "1. [Title](URL)\n   Snippet..."

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: 5,
        include_raw_content: false,
      }),
    });

    if (!response.ok) throw new Error(`Search failed: ${response.status}`);
    const data = await response.json();

    // Format results for the agent
    return data.results
      .map((r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.content}`)
      .join('\n\n');
  },
};
```

```javascript
// src/tools/page-reader.js

/**
 * Fetch and extract text content from a URL.
 * Returns a truncated version of the page content.
 */
export const pageReaderTool = {
  name: 'read_page',
  description: 'Read the text content of a web page given its URL. Returns the main text content, truncated to a reasonable length. Use this after web_search to read promising results in detail.',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The full URL of the page to read.',
      },
    },
    required: ['url'],
  },
  execute: async ({ url }) => {
    // TODO: Fetch the page. Extract text content by stripping HTML tags.
    // Truncate to 3000 characters to fit in context. Return the text.
    // Handle errors gracefully (page not found, timeout, etc.)

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'ResearchAgent/1.0' },
      });
      clearTimeout(timeout);

      if (!resp.ok) return `Failed to read page: HTTP ${resp.status}`;

      const html = await resp.text();
      // Basic HTML to text: strip tags, decode entities, collapse whitespace
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return text.slice(0, 3000) + (text.length > 3000 ? '\n...[truncated]' : '');
    } catch (err) {
      clearTimeout(timeout);
      return `Failed to read page: ${err.message}`;
    }
  },
};
```

```javascript
// src/tools/note-taker.js

/**
 * The agent's scratchpad. Stores research notes that persist across turns.
 */
const notes = [];

export const noteTakerTool = {
  name: 'take_note',
  description: 'Save an important finding or insight to your research notes. Use this to record key facts, statistics, quotes, or conclusions as you research. Each note should be a self-contained observation with its source.',
  parameters: {
    type: 'object',
    properties: {
      note: {
        type: 'string',
        description: 'The research note to save. Include the source URL or title.',
      },
    },
    required: ['note'],
  },
  execute: async ({ note }) => {
    notes.push({ text: note, timestamp: new Date().toISOString() });
    return `Note saved. You now have ${notes.length} research note(s).`;
  },
};

export function getNotes() {
  return notes;
}

export function clearNotes() {
  notes.length = 0;
}
```

### Step 3: Build the ReAct Agent Loop (20 min)

Create `src/agent.js`. This is the brains of the operation -- the loop that reasons, picks a tool, observes the result, and decides what to do next.

```javascript
// src/agent.js
import 'dotenv/config';
import OpenAI from 'openai';
import { ToolRegistry } from './tools/registry.js';
import { webSearchTool } from './tools/web-search.js';
import { pageReaderTool } from './tools/page-reader.js';
import { noteTakerTool, getNotes, clearNotes } from './tools/note-taker.js';

const openai = new OpenAI();

const MAX_ITERATIONS = 10;
const MODEL = 'gpt-4o-mini';

// Set up tool registry
const registry = new ToolRegistry();
registry.register(webSearchTool);
registry.register(pageReaderTool);
registry.register(noteTakerTool);

const SYSTEM_PROMPT = `You are a thorough research agent. Given a research question, you search the web, read relevant pages, and compile a structured research brief.

Your approach:
1. Start by searching for the topic to get an overview
2. Read the most promising results to gather detailed information
3. Take notes on key findings, always including the source
4. Search for additional angles or perspectives if needed
5. When you have enough information (at least 3-5 solid sources), stop and say DONE

Be systematic. Don't just search once -- explore different angles of the question. Verify claims across multiple sources when possible.

When you have gathered enough research, respond with exactly: RESEARCH_COMPLETE`;

/**
 * Run the research agent on a question.
 * Returns the full conversation trace and collected notes.
 */
export async function runAgent(question) {
  clearNotes();
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Research question: ${question}\n\nBegin your research. Think step by step about what to search for first.` },
  ];

  let iterations = 0;
  let totalTokens = 0;
  const trace = []; // Log of each step for debugging

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    console.log(`\n--- Iteration ${iterations}/${MAX_ITERATIONS} ---`);

    // TODO: Call openai.chat.completions.create() with:
    //   model: MODEL
    //   messages: messages
    //   tools: registry.getToolDefinitions()
    //   tool_choice: 'auto'

    // TODO: Track token usage from response.usage

    const response = null; // Replace with actual API call
    const message = response.choices[0].message;
    messages.push(message);

    // Log the agent's reasoning
    if (message.content) {
      console.log(`Agent: ${message.content.slice(0, 200)}`);
      trace.push({ type: 'thought', content: message.content });
    }

    // Check if the agent is done researching
    if (message.content && message.content.includes('RESEARCH_COMPLETE')) {
      console.log('\nAgent has completed research.');
      break;
    }

    // If no tool calls, the agent is just thinking -- continue
    if (!message.tool_calls || message.tool_calls.length === 0) {
      // TODO: Handle the case where the agent responds without using tools
      // and hasn't said RESEARCH_COMPLETE. You might want to nudge it
      // with a user message like "Continue researching. Use your tools."
      continue;
    }

    // Execute each tool call
    for (const toolCall of message.tool_calls) {
      const { name } = toolCall.function;
      const args = JSON.parse(toolCall.function.arguments);

      console.log(`  Tool: ${name}(${JSON.stringify(args).slice(0, 100)})`);
      trace.push({ type: 'action', tool: name, args });

      // TODO: Execute the tool using registry.execute(name, args)
      // Push the result back into messages as a 'tool' role message:
      // { role: 'tool', tool_call_id: toolCall.id, content: result }
      // Log the observation (first 200 chars) and add to trace
    }
  }

  if (iterations >= MAX_ITERATIONS) {
    console.log(`\nReached iteration limit (${MAX_ITERATIONS}).`);
  }

  return {
    question,
    notes: getNotes(),
    trace,
    iterations,
    totalTokens,
  };
}
```

### Step 4: Build the Report Formatter (10 min)

Create `src/report.js`. After the agent gathers research, this formats it into a clean brief.

```javascript
// src/report.js
import OpenAI from 'openai';

const openai = new OpenAI();

/**
 * Take the agent's research notes and produce a structured brief.
 */
export async function generateReport(question, notes) {
  if (notes.length === 0) {
    return '## Research Brief\n\nNo research notes were collected. The agent may have hit an error or the iteration limit.';
  }

  const notesText = notes.map((n, i) => `${i + 1}. ${n.text}`).join('\n');

  // TODO: Call openai.chat.completions.create() with a prompt that:
  //   - Takes the research question and all collected notes
  //   - Produces a structured markdown brief with sections:
  //     ## Summary (2-3 sentence overview)
  //     ## Key Findings (bulleted list of main discoveries)
  //     ## Details (longer discussion organized by subtopic)
  //     ## Sources (numbered list of all URLs/sources referenced)
  //     ## Limitations (what wasn't covered, potential biases)
  //   - Uses model 'gpt-4o-mini', temperature 0.3
  //   - Max tokens: 2000

  const response = null; // Replace with actual API call

  return response.choices[0].message.content;
}
```

### Step 5: Wire It Together (5 min)

Create `src/main.js` -- the entry point that runs the agent and saves the report.

```javascript
// src/main.js
import 'dotenv/config';
import { writeFile } from 'fs/promises';
import { runAgent } from './agent.js';
import { generateReport } from './report.js';

const question = process.argv.slice(2).join(' ');

if (!question) {
  console.error('Usage: node src/main.js "Your research question here"');
  process.exit(1);
}

async function main() {
  console.log(`Researching: "${question}"\n`);
  const startTime = Date.now();

  // Phase 1: Research
  const result = await runAgent(question);
  console.log(`\nResearch phase complete: ${result.notes.length} notes in ${result.iterations} iterations`);
  console.log(`Tokens used: ${result.totalTokens.toLocaleString()}`);

  // Phase 2: Generate report
  console.log('\nGenerating research brief...');
  const report = await generateReport(question, result.notes);

  // Save the report
  const filename = `src/output/report-${Date.now()}.md`;
  await writeFile(filename, report);
  console.log(`\nReport saved to: ${filename}`);
  console.log(`Total time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

  // Print it
  console.log('\n' + '='.repeat(60) + '\n');
  console.log(report);
}

main().catch(console.error);
```

### Step 6: Test It

```bash
# Add "type": "module" to your package.json, then:

# Test with a focused research question
node src/main.js "What are the best practices for building RAG applications in 2026?"

# Try a comparison question
node src/main.js "Compare pgvector vs Pinecone for vector search in production"

# Try something current
node src/main.js "What happened at the latest AI safety summit?"
```

Watch the agent work. You should see it search, read pages, take notes, and sometimes search again with refined queries. The final report should synthesize information from multiple sources with proper citations.

---

## Stretch Goals

1. **Add a planning step**: Before the agent starts researching, have it generate a research plan (3-5 specific search queries it intends to run). After each search, have it check off completed steps and adjust the plan. This makes the agent more systematic and less likely to go in circles.

2. **Implement parallel tool execution**: When the agent wants to read multiple pages, execute those `read_page` calls in parallel using `Promise.all()` instead of sequentially. This can cut research time significantly. Be mindful of rate limits.

3. **Add a "fact checker" tool**: Create a fourth tool that takes a claim and its source, searches for corroborating or contradicting evidence, and returns a confidence score. The agent should use this to verify surprising or important claims before including them in the report.

4. **Rebuild with LangGraph**: Convert your ReAct agent loop into a LangGraph `StateGraph` with `agent` and `tools` nodes, a `should_continue` conditional edge, and a `MemorySaver` checkpointer. Add an `interrupt_before=["tools"]` step so you can inspect and approve tool calls before they execute. Compare the debugging experience (LangGraph's step-through state snapshots vs. your console.log traces) and note how persistence lets you resume a crashed research session.

5. **Build a CrewAI research crew**: Instead of one agent doing everything, create a three-agent crew: a Researcher (searches and extracts), a Writer (produces the report), and a Reviewer (checks accuracy and flags gaps). Run it on the same research question as your single-agent implementation and compare the output quality, token cost, and total execution time.

---

## Submission Checklist

Your project is complete when you can check off every item:

- [ ] `src/tools/registry.js` implements a tool registry that validates, stores, and executes tools
- [ ] `src/tools/web-search.js` calls a real search API and returns formatted results
- [ ] `src/tools/page-reader.js` fetches URLs, strips HTML, and returns truncated text content
- [ ] `src/tools/note-taker.js` stores and retrieves research notes across iterations
- [ ] `src/agent.js` implements the ReAct loop: the LLM reasons, picks tools, observes results, and iterates
- [ ] The agent respects the iteration limit (MAX_ITERATIONS) and stops gracefully
- [ ] The agent uses at least 2 different tools in a typical research run
- [ ] `src/report.js` generates a structured markdown brief with Summary, Key Findings, Details, Sources, and Limitations
- [ ] Reports are saved to `src/output/` with timestamps
- [ ] Running `node src/main.js "your question"` produces a coherent, multi-source research brief
- [ ] You can trace the agent's reasoning by reading the iteration logs (which tools it called and why)
- [ ] The agent handles errors gracefully (bad URLs, search failures) without crashing

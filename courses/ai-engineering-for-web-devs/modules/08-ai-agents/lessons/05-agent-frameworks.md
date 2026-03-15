---
title: "Agent Frameworks: LangGraph and CrewAI"
estimatedMinutes: 60
---

# Agent Frameworks: LangGraph and CrewAI

You built a ReAct agent from scratch. You understand the observe-think-act loop, tool calling, and multi-step planning. Now it's time to meet the frameworks that production teams actually use, because the from-scratch approach has limits that show up fast in real applications.

Your hand-rolled agent loop works for a demo. But in production, you need: persistent state across requests, human-in-the-loop approval steps, parallel tool execution, error recovery that doesn't restart the whole loop, and multi-agent coordination. Building all of that from scratch is months of work. LangGraph and CrewAI give you these capabilities out of the box.

---

## Why Agent Frameworks?

Here's what breaks when you scale your from-scratch agent:

| Problem | From Scratch | Framework |
|---------|-------------|-----------|
| State management | Variables in memory, lost on crash | Persistent checkpoints, resumable |
| Branching logic | Nested if/else in the loop | Visual graph with conditional edges |
| Human approval | Custom pause/resume logic | Built-in interrupt/resume |
| Parallel execution | Manual Promise.all | Declarative parallel branches |
| Multi-agent | One big loop doing everything | Specialized agents collaborating |
| Debugging | Console.log and prayer | Step-by-step traces, state snapshots |
| Error recovery | Retry the whole loop | Retry from the failed step |

You don't always need a framework. Simple single-tool agents are fine as a loop. But when your agent has 5+ tools, conditional logic, or needs to survive server restarts, a framework pays for itself.

---

## LangGraph: Agents as Graphs

LangGraph (from the LangChain team) models agents as **stateful graphs**. Instead of a loop, you define nodes (actions) and edges (transitions). The graph executes step by step, with state persisted at every checkpoint.

### Core Concepts

```
State → Node → Conditional Edge → Node → ... → END
```

- **State**: A typed object that flows through the graph, accumulating results
- **Nodes**: Functions that read state, do work, and return state updates
- **Edges**: Connections between nodes. Can be fixed or conditional
- **Conditional Edges**: Route to different nodes based on state (this is where the agent "decides")
- **Checkpointer**: Saves state at every step for persistence and human-in-the-loop

### Building a ReAct Agent with LangGraph (Python)

Let's rebuild your Research Agent as a LangGraph graph:

```python
# pip install langgraph langchain-openai

from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage

# Step 1: Define your state
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]  # Chat history accumulates
    iteration: int

# Step 2: Define your tools
@tool
def web_search(query: str) -> str:
    """Search the web for current information on a topic."""
    # In production, use a real search API (Tavily, Serper, etc.)
    return f"Search results for: {query}\n- Result 1: ...\n- Result 2: ..."

@tool
def extract_content(url: str) -> str:
    """Extract the main text content from a web page URL."""
    return f"Extracted content from {url}: ..."

@tool
def write_report(title: str, content: str) -> str:
    """Write a final research report with the given title and content."""
    return f"Report '{title}' saved successfully."

tools = [web_search, extract_content, write_report]

# Step 3: Define the agent node
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0).bind_tools(tools)

def agent_node(state: AgentState) -> dict:
    """The agent decides what to do next based on the conversation."""
    response = llm.invoke(state["messages"])
    return {
        "messages": [response],
        "iteration": state.get("iteration", 0) + 1,
    }

# Step 4: Define the routing logic
def should_continue(state: AgentState) -> str:
    """Decide whether to call tools, or finish."""
    last_message = state["messages"][-1]

    # Safety: stop after 10 iterations
    if state.get("iteration", 0) >= 10:
        return "end"

    # If the LLM wants to call tools, route to the tool node
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"

    # Otherwise, the agent is done
    return "end"

# Step 5: Build the graph
graph = StateGraph(AgentState)

# Add nodes
graph.add_node("agent", agent_node)
graph.add_node("tools", ToolNode(tools))

# Add edges
graph.set_entry_point("agent")
graph.add_conditional_edges("agent", should_continue, {
    "tools": "tools",
    "end": END,
})
graph.add_edge("tools", "agent")  # After tools run, go back to agent

# Compile
app = graph.compile()

# Run it
result = app.invoke({
    "messages": [HumanMessage(content="Research the current state of AI agents in 2026")],
    "iteration": 0,
})

# Print the final response
print(result["messages"][-1].content)
```

### The Graph Advantage: Visualizing the Flow

```
         ┌──────────┐
         │  START    │
         └────┬─────┘
              │
         ┌────▼─────┐
    ┌───►│  Agent   │◄───┐
    │    └────┬─────┘    │
    │         │          │
    │    should_continue │
    │    ┌────┴────┐     │
    │    │         │     │
    │  "tools"   "end"   │
    │    │         │     │
    │    ▼         ▼     │
    │ ┌──────┐  ┌─────┐ │
    └─┤Tools │  │ END │ │
      └──────┘  └─────┘ │
```

This is the same ReAct loop you built from scratch, but now it's explicit, debuggable, and extensible. Want to add a "human approval" step before the agent writes the report? Add a node and an edge. Want parallel tool execution? LangGraph handles it automatically when the LLM requests multiple tools.

### Adding Persistence (Python)

This is where LangGraph really shines. With a checkpointer, your agent survives server restarts:

```python
from langgraph.checkpoint.memory import MemorySaver

# Add a checkpointer (use SqliteSaver or PostgresSaver for production)
checkpointer = MemorySaver()
app = graph.compile(checkpointer=checkpointer)

# Run with a thread ID for persistence
config = {"configurable": {"thread_id": "research-123"}}
result = app.invoke(
    {"messages": [HumanMessage(content="Research AI agents")], "iteration": 0},
    config=config,
)

# Later, resume the same thread with a follow-up
result = app.invoke(
    {"messages": [HumanMessage(content="Now focus on the security risks")]},
    config=config,
)
# The agent remembers the entire previous conversation
```

### Adding Human-in-the-Loop (Python)

For agents that take real-world actions (sending messages, creating records), you want human approval:

```python
from langgraph.graph import StateGraph, END

# Compile with an interrupt point
app = graph.compile(
    checkpointer=checkpointer,
    interrupt_before=["tools"],  # Pause before executing any tool
)

# The agent runs until it wants to call a tool, then pauses
result = app.invoke(
    {"messages": [HumanMessage(content="Send a summary to the team Slack")]},
    config=config,
)

# At this point, the agent is paused. You can inspect what it wants to do:
pending_tools = result["messages"][-1].tool_calls
print(f"Agent wants to call: {pending_tools}")
# Output: Agent wants to call: [{'name': 'send_slack_message', 'args': {...}}]

# Human reviews and approves by resuming:
result = app.invoke(None, config=config)  # Resume from checkpoint
```

### LangGraph in JavaScript

```javascript
// npm install @langchain/langgraph @langchain/openai

import { StateGraph, END } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';

// Define state
const AgentState = Annotation.Root({
  messages: Annotation({ reducer: messagesStateReducer }),
  iteration: Annotation({ reducer: (_, b) => b, default: () => 0 }),
});

// Define tools
const webSearch = tool(
  async ({ query }) => `Search results for: ${query}`,
  {
    name: 'web_search',
    description: 'Search the web for current information.',
    schema: z.object({ query: z.string() }),
  }
);

const tools = [webSearch];
const llm = new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0 }).bindTools(tools);

// Build graph
const graph = new StateGraph(AgentState)
  .addNode('agent', async (state) => {
    const response = await llm.invoke(state.messages);
    return { messages: [response], iteration: state.iteration + 1 };
  })
  .addNode('tools', new ToolNode(tools))
  .addEdge('__start__', 'agent')
  .addConditionalEdges('agent', (state) => {
    const last = state.messages[state.messages.length - 1];
    if (state.iteration >= 10) return 'end';
    if (last.tool_calls?.length > 0) return 'tools';
    return 'end';
  }, { tools: 'tools', end: END })
  .addEdge('tools', 'agent');

const app = graph.compile();

const result = await app.invoke({
  messages: [new HumanMessage('Research AI agents')],
});
```

---

## CrewAI: Multi-Agent Collaboration

CrewAI takes a different approach. Instead of one agent with many tools, you create **multiple specialized agents** that collaborate on a task, each with their own role, expertise, and tools.

### Core Concepts

- **Agent**: A persona with a role, goal, backstory, and set of tools
- **Task**: A specific objective assigned to an agent, with expected output
- **Crew**: A team of agents working together on related tasks
- **Process**: How the crew executes (sequential, hierarchical, or consensual)

### Building a Research Crew (Python)

```python
# pip install crewai crewai-tools

from crewai import Agent, Task, Crew, Process
from crewai_tools import SerperDevTool, WebsiteSearchTool

# Step 1: Define specialized agents
researcher = Agent(
    role="Senior Research Analyst",
    goal="Find comprehensive, accurate information about the given topic",
    backstory="""You are an experienced research analyst who excels at
    finding and synthesizing information from multiple sources. You always
    verify claims across multiple sources before including them.""",
    tools=[SerperDevTool(), WebsiteSearchTool()],
    llm="gpt-4o-mini",
    max_iter=5,
    verbose=True,
)

writer = Agent(
    role="Technical Writer",
    goal="Transform research findings into clear, well-structured reports",
    backstory="""You are a skilled technical writer who can take complex
    research and turn it into accessible, well-organized documents. You
    focus on clarity and actionable insights.""",
    llm="gpt-4o-mini",
    verbose=True,
)

reviewer = Agent(
    role="Quality Reviewer",
    goal="Verify the accuracy and completeness of the report",
    backstory="""You are a detail-oriented editor who checks for factual
    accuracy, logical consistency, and completeness. You flag any claims
    that need better sourcing.""",
    llm="gpt-4o-mini",
    verbose=True,
)

# Step 2: Define tasks
research_task = Task(
    description="""Research the current state of AI agent frameworks in 2026.
    Cover: LangGraph, CrewAI, AutoGen, and any emerging frameworks.
    Focus on: architecture patterns, production readiness, community adoption,
    and real-world use cases. Include specific examples.""",
    expected_output="Detailed research notes with sources and key findings",
    agent=researcher,
)

writing_task = Task(
    description="""Using the research notes, write a comprehensive report.
    Structure: Executive Summary, Framework Comparison, Production Considerations,
    Recommendations. Use tables for comparisons. Keep it under 2000 words.""",
    expected_output="A well-structured markdown report",
    agent=writer,
)

review_task = Task(
    description="""Review the report for accuracy, completeness, and clarity.
    Check that all claims are supported by the research. Flag any gaps.
    Provide the final, polished version of the report.""",
    expected_output="Final reviewed and polished report in markdown",
    agent=reviewer,
)

# Step 3: Assemble and run the crew
crew = Crew(
    agents=[researcher, writer, reviewer],
    tasks=[research_task, writing_task, review_task],
    process=Process.sequential,  # Tasks run in order
    verbose=True,
)

result = crew.kickoff()
print(result.raw)
```

### How CrewAI Execution Works

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│ Researcher │────►│   Writer   │────►│  Reviewer  │
│            │     │            │     │            │
│ - Search   │     │ - Write    │     │ - Verify   │
│ - Extract  │     │ - Format   │     │ - Polish   │
│ - Analyze  │     │ - Cite     │     │ - Flag     │
└────────────┘     └────────────┘     └────────────┘
   research_task      writing_task      review_task
```

Each agent gets the output of the previous task as context. The researcher's notes flow to the writer, and the writer's draft flows to the reviewer. This mirrors how real teams work.

### Hierarchical Process

For complex tasks, you can use a manager agent that delegates:

```python
crew = Crew(
    agents=[researcher, writer, reviewer],
    tasks=[research_task, writing_task, review_task],
    process=Process.hierarchical,
    manager_llm="gpt-4o",  # The manager uses a stronger model
)
```

In hierarchical mode, the manager decides which agent handles what, can reassign tasks, and coordinates the overall workflow. This is useful when the task decomposition isn't known in advance.

---

## LangGraph vs. CrewAI: When to Use Which

| Factor | LangGraph | CrewAI |
|--------|----------|--------|
| **Mental model** | Graph of operations with state | Team of role-playing agents |
| **Best for** | Complex single-agent workflows with branching logic | Multi-agent collaboration on structured tasks |
| **State management** | Typed state object, persistent checkpoints | Implicit, passed between tasks |
| **Human-in-the-loop** | Built-in interrupt/resume | Limited (manual approval hooks) |
| **Parallelism** | Native parallel branches in the graph | Sequential or hierarchical process |
| **Debugging** | Step-through graph execution, state snapshots | Verbose logging, task-by-task output |
| **Learning curve** | Medium. Graph concepts are intuitive | Low. "Agents are people on a team" is easy to grasp |
| **Production readiness** | High. Built by the LangChain team, actively maintained | Growing. Newer, evolving quickly |
| **Ecosystem** | Integrates with all LangChain tools | Has its own tool ecosystem (crewai-tools) |

**Rule of thumb:**
- If your agent needs **complex control flow** (conditional branching, parallel execution, human approval, persistent state), use **LangGraph**.
- If your task naturally decomposes into **roles** (researcher, writer, reviewer, analyst), use **CrewAI**.
- If you're not sure, start with **LangGraph**. It's more flexible and has better production tooling.

---

## Other Frameworks Worth Knowing

The agent framework space moves fast. Here are others you'll see in job postings:

| Framework | Key Idea | When to Consider |
|-----------|----------|-----------------|
| **AutoGen** (Microsoft) | Multi-agent conversation. Agents talk to each other in a chat | Complex reasoning tasks that benefit from debate/discussion |
| **Semantic Kernel** (Microsoft) | Enterprise AI orchestration with .NET/Python/Java | Enterprise environments already using Microsoft stack |
| **Haystack** (deepset) | Pipelines for search and RAG | When you want a focused alternative to LangChain for RAG |
| **Claude Agent SDK** (Anthropic) | Lightweight agent loop with built-in tool use | When building agents specifically with Claude models |

You don't need to learn all of them. **LangGraph and CrewAI cover the majority of production use cases** and appear most frequently in job postings. The concepts transfer across frameworks: state management, tool integration, control flow, and error handling work similarly everywhere.

---

## Key Takeaways

1. **LangGraph** models agents as stateful graphs with nodes, edges, and checkpoints. It excels at complex single-agent workflows with branching, parallelism, and human-in-the-loop approval.

2. **CrewAI** models agents as teams of specialists. It excels when your task naturally breaks into roles with clear handoffs (research, write, review).

3. **Persistence changes everything.** LangGraph's checkpointer lets agents survive crashes, resume from interruptions, and maintain state across requests. This is the gap between a demo and a product.

4. **Human-in-the-loop is a production requirement.** Any agent that takes real-world actions (sending messages, creating records, making purchases) needs an approval step. LangGraph makes this a first-class feature.

5. **Framework knowledge is highly marketable.** LangGraph and CrewAI appear in a large share of AI engineering job postings. Knowing the concepts behind them (which you learned building from scratch) plus the framework APIs makes you a strong candidate.

---

## Try It Yourself

Pick one of these exercises:

1. **LangGraph**: Take your Research Agent project and rebuild it as a LangGraph graph. Add a human approval step before the `write_report` tool. Add persistence so you can resume research across sessions.

2. **CrewAI**: Build a "Content Pipeline" crew with three agents: a Researcher who finds information, a Writer who creates a blog post, and an Editor who polishes it. Run it on a topic relevant to your work.

3. **Compare**: Build the same agent task in both frameworks. Time yourself. Compare the code complexity, debuggability, and output quality. Write down which you'd choose for your next project and why.

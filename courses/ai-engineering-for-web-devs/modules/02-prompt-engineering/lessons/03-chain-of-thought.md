---
title: "Chain of Thought Prompting"
estimatedMinutes: 50
---

# Chain of Thought Prompting: Making LLMs Think Step by Step

Here's a fact that surprised researchers and should matter to you: **asking an LLM to "think step by step" before answering can dramatically improve its accuracy on complex tasks.** Not by 5% -- by 40%, 50%, sometimes more. This technique, called Chain of Thought (CoT) prompting, is one of the most powerful tools in your prompt engineering toolkit.

Why does it work? LLMs generate text token by token. When you ask a model to jump straight to an answer, it has to "figure everything out" in one forward pass. But when you ask it to reason through the problem first, each reasoning step becomes part of the context that informs the next step. It's like the difference between solving a math problem in your head versus writing out your work.

---

## The Basic Idea

### Without Chain of Thought

```javascript
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    {
      role: 'user',
      content: `A web server handles 150 requests per second. Each request
takes an average of 200ms to process. How many concurrent requests is
the server handling at any given moment, and how many worker threads
would you recommend if each thread can handle one request at a time?`,
    },
  ],
});
// Model might jump to an answer, possibly making calculation errors
```

### With Chain of Thought

```javascript
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    {
      role: 'user',
      content: `A web server handles 150 requests per second. Each request
takes an average of 200ms to process. How many concurrent requests is
the server handling at any given moment, and how many worker threads
would you recommend if each thread can handle one request at a time?

Think through this step by step.`,
    },
  ],
});
// Model shows its work:
// Step 1: 150 requests/second with 200ms processing time
// Step 2: In 1 second, each request occupies 0.2 seconds
// Step 3: Concurrent requests = 150 * 0.2 = 30 requests at any moment
// Step 4: You'd need at least 30 threads, recommend 40-50 for headroom
// Answer: 30 concurrent requests, recommend ~45 worker threads
```

That last line -- "Think through this step by step" -- is the simplest form of CoT prompting, and it works remarkably well.

---

## Types of Chain of Thought Prompting

### 1. Zero-Shot CoT

Just add "Let's think step by step" or a similar instruction. No examples needed.

```javascript
const systemPrompt = `You are a senior software architect.
When analyzing problems, always think through your reasoning step by step
before giving your final recommendation.`;

const messages = [
  { role: 'system', content: systemPrompt },
  {
    role: 'user',
    content: `Our e-commerce app currently uses a monolithic architecture
with a single PostgreSQL database. We're seeing slow query times during
flash sales (10x normal traffic). We have a team of 4 developers.
Should we migrate to microservices?`,
  },
];
```

The model will naturally break down the analysis:
1. Assess current pain points (slow queries during high traffic)
2. Consider team size and microservices overhead
3. Evaluate alternatives (caching, read replicas, query optimization)
4. Make a recommendation with justification

### 2. Few-Shot CoT

Provide examples that demonstrate the reasoning process:

```javascript
const messages = [
  {
    role: 'system',
    content: 'You are a system design expert. Show your reasoning step by step.',
  },
  // Example with demonstrated reasoning
  {
    role: 'user',
    content: 'Should I use WebSockets or Server-Sent Events for a live dashboard that shows real-time metrics?',
  },
  {
    role: 'assistant',
    content: `Let me think through this step by step.

**Step 1: Understand the requirements**
- Live dashboard showing real-time metrics
- Data flows primarily from server to client (metrics updates)
- Client likely doesn't need to send frequent data back

**Step 2: Compare the options**
- WebSockets: Full duplex (bidirectional), more complex, higher overhead
- SSE: Server-to-client only, simpler, built on HTTP, auto-reconnect

**Step 3: Consider the use case fit**
- Dashboard metrics are server-to-client → SSE is naturally suited
- No need for client-to-server streaming → WebSocket's bidirectionality is unnecessary
- SSE works over standard HTTP → easier to deploy behind load balancers and proxies
- SSE has built-in reconnection → more resilient for dashboards

**Step 4: Consider edge cases**
- If the dashboard later needs interactive features (user adjusts filters in real-time), WebSockets would be needed
- If supporting >10K concurrent connections, both have scaling considerations

**Recommendation**: Use Server-Sent Events (SSE). It's simpler, fits the unidirectional data flow, works over HTTP, and is easier to scale. If you later need bidirectional communication, you can add WebSocket endpoints for specific features.`,
  },
  // Actual question
  {
    role: 'user',
    content: 'Should I use Redis or Memcached for caching API responses in a Node.js application?',
  },
];
```

### 3. Structured CoT

Define a specific reasoning structure the model should follow:

```javascript
const systemPrompt = `You are a code review assistant. For every code review, follow this analysis framework:

## Analysis Framework

### 1. UNDERSTAND
- What does this code do?
- What is the intended behavior?

### 2. IDENTIFY ISSUES
- Security vulnerabilities
- Performance problems
- Logic errors
- Code style issues

### 3. EVALUATE SEVERITY
For each issue, classify as:
- CRITICAL: Will cause bugs or security issues in production
- IMPORTANT: Should be fixed but won't break things
- MINOR: Style or preference, optional to fix

### 4. RECOMMEND
- Specific fix for each issue
- Show corrected code
- Explain why the fix is better

### 5. SUMMARIZE
- Overall code quality score (1-10)
- Top 3 priorities

Always complete ALL five steps before giving your final assessment.`;
```

---

## Why Chain of Thought Works: The Developer's Explanation

Remember that LLMs generate text token by token, left to right. Each token is influenced by all the tokens that came before it. When the model writes out reasoning steps, those intermediate tokens become part of the context for subsequent tokens.

Think of it like this:

```javascript
// Without CoT: The model has to compute the answer "in one step"
// It's like writing a function that must return immediately
function answerDirectly(question) {
  return computeAnswer(question);  // All reasoning must happen internally
}

// With CoT: The model can "write to a scratchpad" as it thinks
// It's like writing a function that can use intermediate variables
function answerWithReasoning(question) {
  const step1 = analyzeQuestion(question);     // Written to output
  const step2 = gatherRelevantFacts(step1);    // Written to output
  const step3 = applyLogic(step2);             // Written to output
  const answer = synthesize(step3);            // Final answer
  return { reasoning: [step1, step2, step3], answer };
}
```

Each reasoning step in the output feeds into the next step's generation. The model literally uses its own written reasoning as additional context.

### Implications for Development

1. **Longer outputs cost more** but can be more accurate. CoT trades tokens for quality.
2. **You can extract just the final answer** after the reasoning is done (parse the output).
3. **Reasoning steps are useful for debugging** -- if the model gets the wrong answer, you can see where its reasoning went wrong.

---

## Advanced CoT Techniques

### Self-Consistency

One problem with CoT: the model might reason down a wrong path. **Self-consistency** addresses this by generating multiple reasoning chains and taking the most common answer:

```javascript
async function selfConsistentAnswer(question, numSamples = 5) {
  const answers = [];

  // Generate multiple reasoning chains
  const promises = Array(numSamples).fill(null).map(() =>
    openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Think step by step to solve this problem. End with "ANSWER: [your answer]"',
        },
        { role: 'user', content: question },
      ],
      temperature: 0.7,  // Some randomness to get diverse reasoning paths
    })
  );

  const responses = await Promise.all(promises);

  for (const response of responses) {
    const text = response.choices[0].message.content;
    // Extract the final answer from each reasoning chain
    const answerMatch = text.match(/ANSWER:\s*(.+?)$/mi);
    if (answerMatch) {
      answers.push(answerMatch[1].trim());
    }
  }

  // Return the most common answer (majority vote)
  const answerCounts = {};
  for (const answer of answers) {
    answerCounts[answer] = (answerCounts[answer] || 0) + 1;
  }

  const bestAnswer = Object.entries(answerCounts)
    .sort(([, a], [, b]) => b - a)[0];

  return {
    answer: bestAnswer[0],
    confidence: bestAnswer[1] / numSamples,
    allAnswers: answers,
  };
}

// Usage
const result = await selfConsistentAnswer(
  'A function receives 3 API calls per second. Each call takes 500ms. The function runs in a single thread. Will it handle the load? Why or why not?'
);

console.log(result);
// {
//   answer: "No, it cannot handle the load...",
//   confidence: 0.8,
//   allAnswers: ["No...", "No...", "No...", "No...", "It depends..."]
// }
```

### Step-Back Prompting

Before diving into the specific problem, ask the model to first consider the general principle:

```javascript
async function stepBackAndSolve(specificQuestion) {
  // Step 1: Ask for the general principle
  const stepBackResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: `Before answering the specific question below, first identify the general principle or concept that applies.

Question: ${specificQuestion}

What general principle should we apply here?`,
      },
    ],
  });

  const principle = stepBackResponse.choices[0].message.content;

  // Step 2: Now solve the specific problem using the principle
  const solutionResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Use the following general principle to guide your reasoning:

${principle}`,
      },
      {
        role: 'user',
        content: `Now, apply this principle to answer the specific question:

${specificQuestion}

Think step by step.`,
      },
    ],
  });

  return {
    principle,
    solution: solutionResponse.choices[0].message.content,
  };
}

// Usage
const result = await stepBackAndSolve(
  'Our React app re-renders 60 times per second when the user moves their mouse over a data table with 1000 rows. How do we fix the performance?'
);
// Step-back identifies: "The general principle is minimizing unnecessary re-renders in React through memoization, virtualization, and event throttling."
// Then applies it specifically to the mouse-over + large table scenario
```

### Tree of Thought

For complex problems, explore multiple reasoning branches:

```javascript
async function treeOfThought(problem, numBranches = 3) {
  // Generate multiple initial approaches
  const approachesResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are solving a complex problem. Generate ${numBranches} different approaches to solving it. For each approach, describe the first step and evaluate how promising it is (score 1-10).

Format:
APPROACH 1: [description]
FIRST STEP: [what to do first]
PROMISE SCORE: [1-10]
---
APPROACH 2: ...`,
      },
      { role: 'user', content: problem },
    ],
  });

  // Parse approaches and select the most promising
  const approaches = parseApproaches(approachesResponse.choices[0].message.content);
  const bestApproach = approaches.sort((a, b) => b.score - a.score)[0];

  // Develop the best approach fully
  const solutionResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: `Solve this problem using the following approach:

Problem: ${problem}

Approach: ${bestApproach.description}

Develop this approach step by step into a complete solution.`,
      },
    ],
  });

  return {
    approachesConsidered: approaches,
    selectedApproach: bestApproach,
    solution: solutionResponse.choices[0].message.content,
  };
}
```

---

## Practical CoT Templates for Web Development

### Template 1: Debugging

```javascript
const debuggingPrompt = `You are debugging a web application issue. Follow this process:

1. **REPRODUCE**: What are the exact steps to reproduce the issue?
2. **OBSERVE**: What is the actual behavior vs expected behavior?
3. **HYPOTHESIZE**: What are 3 possible causes, ranked by likelihood?
4. **INVESTIGATE**: For the most likely cause, what evidence would confirm or rule it out?
5. **FIX**: Propose a specific fix with code changes.
6. **VERIFY**: How would you verify the fix works?
7. **PREVENT**: What test or safeguard would prevent this bug from recurring?

Always complete all 7 steps.`;
```

### Template 2: API Design

```javascript
const apiDesignPrompt = `You are designing a REST API endpoint. Think through each aspect:

1. **PURPOSE**: What business need does this endpoint serve?
2. **METHOD & PATH**: What HTTP method and URL path are appropriate?
3. **INPUT**: What request body/parameters are needed? Validate each.
4. **PROCESSING**: What business logic runs? What services/databases are involved?
5. **OUTPUT**: What does the response look like? Define success and error responses.
6. **EDGE CASES**: What could go wrong? How do you handle each case?
7. **SECURITY**: What authentication/authorization is needed? What about rate limiting?
8. **EXAMPLE**: Show a complete request/response example.`;
```

### Template 3: Architecture Decisions

```javascript
const architecturePrompt = `You are making a technical architecture decision. Analyze it using this framework:

1. **CONTEXT**: What is the current system state and the problem being solved?
2. **OPTIONS**: List at least 3 viable approaches.
3. **CRITERIA**: Define evaluation criteria (cost, complexity, scalability, team skills, timeline).
4. **ANALYSIS**: Score each option against each criterion (1-5 scale).
5. **RISKS**: What are the risks of each option? How can they be mitigated?
6. **RECOMMENDATION**: Which option do you recommend and why?
7. **IMPLEMENTATION PLAN**: High-level steps to implement the recommendation.

Show your reasoning matrix as a table.`;
```

---

## CoT with Different Models

Different models respond differently to CoT prompting:

### GPT-4o

Responds well to both natural language CoT ("think step by step") and structured frameworks. Temperature 0 for consistency, 0.3-0.7 for creative problem-solving.

### Claude 4 Sonnet

Excels at structured CoT. Claude tends to be thorough and methodical -- sometimes overly so. You may need to add constraints:

```python
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    system="""Think through this step by step, but be concise.
For each step, use at most 2 sentences.
End with a clear, actionable recommendation.""",
    messages=[{"role": "user", "content": question}],
    max_tokens=1024,
)
```

### o1 / o3 (OpenAI Reasoning Models)

These models have CoT built in -- they "think" internally before responding. You don't need to ask them to reason step by step; they do it automatically. However, reasoning tokens may be partially visible depending on your API tier and the specific model version, and they cost more per token.

```javascript
// With o1/o3, you DON'T need CoT prompting
// The model reasons internally
const response = await openai.chat.completions.create({
  model: 'o1',
  messages: [
    {
      role: 'user',
      content: 'Design a database schema for a multi-tenant SaaS application with row-level security.',
      // No "think step by step" needed -- o1 does this automatically
    },
  ],
});
```

**Streaming tip:** When streaming CoT responses to users, they'll see the reasoning steps appear before the final answer. Consider collapsing the reasoning section in your UI or showing a "thinking..." indicator while the model works through its steps, then revealing only the final answer.

### Smaller Models (GPT-4o mini, Gemini Flash)

CoT helps smaller models more than larger ones, but the reasoning can be less reliable. For critical tasks with smaller models, use self-consistency:

```javascript
// Smaller models benefit most from CoT but may reason incorrectly
// Use self-consistency to compensate
const result = await selfConsistentAnswer(question, 5);
if (result.confidence < 0.6) {
  // Low agreement -- escalate to a larger model
  const betterResult = await askLargerModel(question);
}
```

---

## When NOT to Use Chain of Thought

CoT isn't always the right choice:

1. **Simple tasks**: Classification, extraction, formatting -- these don't need reasoning. CoT adds tokens and latency for no quality gain.

2. **When speed matters**: CoT increases output tokens significantly. If you need sub-second responses, skip the reasoning.

3. **When you're using reasoning models**: o1 and o3 already do CoT internally. Adding explicit CoT on top is redundant and can confuse them.

4. **When the model already gets it right**: If zero-shot gives you 98% accuracy, CoT might get you to 99% but at 3x the cost. Measure the ROI.

```javascript
// Decision function: should we use CoT?
function shouldUseCoT(task) {
  if (task.type === 'classification') return false;         // Too simple
  if (task.type === 'extraction') return false;             // Too simple
  if (task.latencyBudgetMs < 500) return false;             // Too slow
  if (task.model.startsWith('o1') || task.model.startsWith('o3')) return false;  // Built-in
  if (task.requiresReasoning) return true;                  // Yes!
  if (task.requiresMath) return true;                       // Yes!
  if (task.requiresMultiStep) return true;                  // Yes!
  return false;  // Default: skip it
}
```

---

## Parsing CoT Output

In production, you usually want the final answer, not the reasoning. Here's how to extract it:

```javascript
async function getAnswerWithReasoning(question) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Think through this step by step.
After your reasoning, clearly mark your final answer with:
###ANSWER###
[Your concise answer here]
###END###`,
      },
      { role: 'user', content: question },
    ],
  });

  const text = response.choices[0].message.content;

  // Extract just the answer
  const answerMatch = text.match(/###ANSWER###\s*([\s\S]*?)\s*###END###/);

  return {
    reasoning: text.split('###ANSWER###')[0].trim(),
    answer: answerMatch ? answerMatch[1].trim() : text,
    fullResponse: text,
  };
}

// Usage
const result = await getAnswerWithReasoning(
  'What caching strategy should I use for a social media feed that updates every few seconds?'
);

console.log(result.answer);     // Just the recommendation
console.log(result.reasoning);  // The full step-by-step analysis (for logging/debugging)
```

---

## Key Takeaways

1. **"Think step by step" dramatically improves reasoning quality.** For math, logic, multi-step analysis, and complex problem-solving, CoT prompting can improve accuracy by 40% or more.

2. **CoT works because each reasoning token informs the next.** The model uses its own written-out reasoning as additional context for subsequent generation.

3. **Three main approaches**: Zero-shot CoT (just ask to reason), few-shot CoT (show reasoning examples), and structured CoT (define a reasoning framework).

4. **Self-consistency improves reliability.** Generate multiple reasoning chains and take the majority answer to reduce the chance of following a wrong path.

5. **Don't use CoT for simple tasks.** Classification, extraction, and formatting don't benefit from step-by-step reasoning. You'll just waste tokens and add latency.

6. **Parsing matters in production.** Use clear delimiters (like `###ANSWER###`) to separate reasoning from the final answer so your application can extract what it needs.

7. **Reasoning models (o1, o3) have CoT built in.** Don't add explicit CoT prompting when using these models -- it's redundant.

---

## Try It Yourself

**Exercise: CoT for Code Review**

Build a code review assistant that uses structured Chain of Thought:

1. Create a system prompt with a multi-step review framework
2. Feed it 3 different code snippets of varying quality
3. Compare outputs with and without the CoT framework
4. Measure: Does the CoT version catch more issues? Is it more actionable?

```javascript
const codeSnippets = [
  // Snippet 1: Has a SQL injection vulnerability
  `app.get('/user', (req, res) => {
    const query = "SELECT * FROM users WHERE id = " + req.query.id;
    db.query(query).then(result => res.json(result));
  });`,

  // Snippet 2: Has a performance issue
  `async function getAllUserPosts(userIds) {
    const posts = [];
    for (const id of userIds) {
      const userPosts = await db.query('SELECT * FROM posts WHERE user_id = ?', [id]);
      posts.push(...userPosts);
    }
    return posts;
  }`,

  // Snippet 3: Has an error handling issue
  `async function fetchData(url) {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  }`,
];

// Test each snippet with and without CoT
for (const snippet of codeSnippets) {
  console.log('=== Without CoT ===');
  const basic = await reviewCode(snippet, { useCoT: false });
  console.log(basic);

  console.log('=== With CoT ===');
  const cot = await reviewCode(snippet, { useCoT: true });
  console.log(cot);
}
```

Which approach catches more issues? Which provides more actionable feedback? Record your observations.

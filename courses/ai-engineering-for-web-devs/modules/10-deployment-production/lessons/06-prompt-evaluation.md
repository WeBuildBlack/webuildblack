---
title: "Prompt Evaluation with Langfuse"
estimatedMinutes: 60
---

# Prompt Evaluation with Langfuse

You've built monitoring that tracks latency, cost, and error rates. But there's a critical gap: **is your AI actually giving good answers?** You can have 99.9% uptime, sub-200ms latency, and zero errors, and still have an AI that gives wrong, unhelpful, or inconsistent responses.

Prompt evaluation closes this gap. It answers: "When I change my prompt, does the output get better or worse?" Without eval, prompt engineering is guesswork. With it, you make data-driven decisions.

Langfuse is the leading open-source platform for LLM observability and evaluation. It gives you tracing (what happened in each request), evaluation datasets (standardized test cases), and scoring (automated and human quality ratings). It's free to self-host, has a generous cloud free tier, and integrates with every major LLM provider. LangSmith (by the LangChain team) does similar things, but Langfuse is provider-agnostic and open source.

---

## Why Prompt Evaluation Matters

Consider this scenario. Your RAG chatbot uses this system prompt:

```
Answer questions based on the provided context. Be helpful.
```

You rewrite it to:

```
Answer questions based ONLY on the provided context. If the context doesn't contain the answer, say "I don't have information about that." Cite sources using [1], [2] notation.
```

Is the new prompt better? "It feels better" isn't good enough for production. You need to measure:

- **Faithfulness**: Does the answer stick to the provided context? (The new prompt should score higher)
- **Relevance**: Does the answer address the question? (Both should be similar)
- **Citation accuracy**: Does the answer cite the right sources? (Only measurable with the new prompt)
- **Refusal accuracy**: Does the model correctly refuse when context is insufficient? (New capability to test)

Langfuse lets you build a test dataset, run both prompts against it, and compare scores.

---

## Setting Up Langfuse

### Cloud Setup (Fastest)

```bash
# Sign up at cloud.langfuse.com (free tier: 50K observations/month)
# Get your API keys from Project Settings

# Install the SDK
npm install langfuse           # JavaScript
# pip install langfuse         # Python
```

```bash
# Add to your .env
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASEURL=https://cloud.langfuse.com  # Or your self-hosted URL
```

### Self-Hosted (Free, Full Control)

```bash
# Docker Compose (PostgreSQL + Langfuse server)
git clone https://github.com/langfuse/langfuse.git
cd langfuse
docker compose up -d
# Langfuse is now running at http://localhost:3000
```

---

## Tracing: Seeing What Your AI Does

Before you can evaluate, you need to see what's happening. Langfuse tracing records every step of your AI pipeline.

### Instrumenting Your RAG Pipeline (JavaScript)

```javascript
import { Langfuse } from 'langfuse';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASEURL,
});

async function askDocsWithTracing(question) {
  // Create a trace for the entire request
  const trace = langfuse.trace({
    name: 'rag-query',
    input: { question },
    metadata: { userId: 'user-123' },
  });

  // Step 1: Embed the question
  const embeddingSpan = trace.span({ name: 'embed-query' });
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question,
  });
  embeddingSpan.end({
    output: { dimensions: embedding.data[0].embedding.length },
    metadata: { model: 'text-embedding-3-small', tokens: embedding.usage.total_tokens },
  });

  // Step 2: Retrieve documents
  const retrievalSpan = trace.span({ name: 'retrieval' });
  const results = await supabase.rpc('hybrid_search', {
    query_text: question,
    query_embedding: JSON.stringify(embedding.data[0].embedding),
    match_count: 5,
  });
  retrievalSpan.end({
    output: { resultCount: results.data.length, topScore: results.data[0]?.combined_score },
  });

  // Step 3: Generate answer (use Langfuse generation tracking)
  const generation = trace.generation({
    name: 'generate-answer',
    model: 'gpt-4o-mini',
    input: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Context:\n${formatContext(results.data)}\n\nQuestion: ${question}` },
    ],
    modelParameters: { temperature: 0.2, maxTokens: 1000 },
  });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Context:\n${formatContext(results.data)}\n\nQuestion: ${question}` },
    ],
    temperature: 0.2,
    max_tokens: 1000,
  });

  const answer = response.choices[0].message.content;

  generation.end({
    output: answer,
    usage: {
      input: response.usage.prompt_tokens,
      output: response.usage.completion_tokens,
      total: response.usage.total_tokens,
    },
  });

  // Complete the trace
  trace.update({ output: { answer, sourceCount: results.data.length } });

  // Flush to Langfuse (important in serverless environments)
  await langfuse.flushAsync();

  return { answer, sources: results.data };
}
```

### Instrumenting with Python

```python
from langfuse import Langfuse
from langfuse.decorators import observe, langfuse_context

langfuse = Langfuse()

# The @observe decorator automatically creates traces and spans
@observe()
def ask_docs(question: str) -> dict:
    langfuse_context.update_current_trace(
        input={"question": question},
        metadata={"user_id": "user-123"},
    )

    # Retrieval (automatically tracked as a span)
    results = retrieve(question)

    # Generation (automatically tracked)
    answer = generate(question, results)

    langfuse_context.update_current_trace(
        output={"answer": answer, "source_count": len(results)},
    )

    return {"answer": answer, "sources": results}

@observe()
def retrieve(question: str) -> list:
    embedding = openai.embeddings.create(
        model="text-embedding-3-small", input=question
    )
    results = supabase.rpc("hybrid_search", {...}).execute()
    return results.data

@observe(as_type="generation")
def generate(question: str, context: list) -> str:
    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[...],
        temperature=0.2,
    )
    # Token usage is automatically captured for generations
    langfuse_context.update_current_observation(
        usage={
            "input": response.usage.prompt_tokens,
            "output": response.usage.completion_tokens,
        },
    )
    return response.choices[0].message.content
```

The `@observe` decorator is the simplest way to instrument Python code. It automatically creates nested traces and spans based on your call stack.

---

## Building Evaluation Datasets

A dataset in Langfuse is a collection of test cases: inputs with expected outputs. Think of it as your test suite for prompts.

### Creating a Dataset (JavaScript)

```javascript
// Create the dataset
const dataset = await langfuse.createDataset({
  name: 'rag-eval-v1',
  description: 'Core evaluation questions for the docs Q&A bot',
});

// Add test cases (items)
const testCases = [
  {
    input: { question: 'How do I install the project?' },
    expectedOutput: {
      shouldMention: ['npm install', 'node_modules'],
      expectedSources: ['getting-started.md'],
      shouldNotMention: ['pip install'],  // Wrong ecosystem
    },
  },
  {
    input: { question: 'What database does this project use?' },
    expectedOutput: {
      shouldMention: ['PostgreSQL', 'Supabase'],
      expectedSources: ['architecture.md', 'README.md'],
      shouldNotMention: ['MongoDB'],
    },
  },
  {
    input: { question: 'What is the meaning of life?' },
    expectedOutput: {
      shouldRefuse: true,  // Not in the docs
      expectedSources: [],
    },
  },
];

for (const tc of testCases) {
  await langfuse.createDatasetItem({
    datasetName: 'rag-eval-v1',
    input: tc.input,
    expectedOutput: tc.expectedOutput,
  });
}
```

### Guidelines for Good Test Cases

1. **Cover the common cases**: The 20 questions your users ask most often
2. **Cover the edge cases**: Questions the docs don't answer (test refusal), ambiguous questions, questions that need multiple sources
3. **Cover regressions**: Any question where you've previously seen a bad answer
4. **Include difficulty levels**: Easy (answer is in one place), Medium (needs multiple sources), Hard (requires inference across sources)
5. **Aim for 30-50 test cases** to start. Grow it over time by adding real user questions that exposed issues.

---

## Running Evaluations

An evaluation runs your AI against every test case and scores the results.

### Automated Scoring (JavaScript)

```javascript
async function runEvaluation(datasetName, runName) {
  const dataset = await langfuse.getDataset(datasetName);

  for (const item of dataset.items) {
    // Run your AI pipeline
    const result = await askDocsWithTracing(item.input.question);

    // Score the result
    const scores = scoreResult(result, item.expectedOutput);

    // Link the trace to the dataset item with scores
    await item.link(
      langfuse.trace({ name: 'eval-run' }),  // The trace from askDocsWithTracing
      runName,
      {
        description: `Eval: ${item.input.question.slice(0, 50)}`,
      }
    );

    // Record scores
    for (const [name, value] of Object.entries(scores)) {
      langfuse.score({
        traceId: result.traceId,
        name,
        value,
        comment: scores.comments?.[name],
      });
    }
  }

  await langfuse.flushAsync();
  console.log(`Evaluation "${runName}" complete.`);
}

function scoreResult(result, expected) {
  const scores = {};
  const answer = result.answer.toLowerCase();

  // Faithfulness: does the answer mention what it should?
  if (expected.shouldMention) {
    const mentions = expected.shouldMention.filter(term =>
      answer.includes(term.toLowerCase())
    );
    scores.faithfulness = mentions.length / expected.shouldMention.length;
  }

  // Hallucination check: does it mention things it shouldn't?
  if (expected.shouldNotMention) {
    const hallucinations = expected.shouldNotMention.filter(term =>
      answer.includes(term.toLowerCase())
    );
    scores.hallucination = hallucinations.length === 0 ? 1.0 : 0.0;
  }

  // Refusal accuracy: does it refuse when it should?
  if (expected.shouldRefuse) {
    const refusalPhrases = ["don't have information", "not found", "no relevant", "cannot find"];
    scores.refusal = refusalPhrases.some(p => answer.includes(p)) ? 1.0 : 0.0;
  }

  // Source accuracy: did it find the right documents?
  if (expected.expectedSources?.length > 0) {
    const sourceFiles = result.sources.map(s => s.file);
    const found = expected.expectedSources.filter(s => sourceFiles.includes(s));
    scores.sourceAccuracy = found.length / expected.expectedSources.length;
  }

  return scores;
}

// Run evaluations for two prompt versions
await runEvaluation('rag-eval-v1', 'baseline-prompt-v1');
// ... change your system prompt ...
await runEvaluation('rag-eval-v1', 'improved-prompt-v2');
```

### LLM-as-Judge Scoring

For subjective quality (tone, helpfulness, completeness), use an LLM to score the output:

```javascript
async function llmJudge(question, answer, context) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',  // Use a strong model as the judge
    messages: [
      {
        role: 'system',
        content: `You are evaluating an AI assistant's answer. Score each dimension 0-10.

Return JSON only:
{
  "relevance": <0-10>,
  "completeness": <0-10>,
  "clarity": <0-10>,
  "reasoning": "<brief explanation>"
}`,
      },
      {
        role: 'user',
        content: `Question: ${question}\n\nContext provided:\n${context}\n\nAI Answer:\n${answer}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
  });

  return JSON.parse(response.choices[0].message.content);
}
```

Record the LLM judge scores in Langfuse alongside your automated scores. Over time, you'll see which scoring method correlates best with actual user satisfaction.

---

## Comparing Prompt Versions in the Langfuse Dashboard

After running evaluations with different `runName` values, Langfuse shows you side-by-side comparisons:

```
Run Name              Faithfulness  Hallucination  Refusal  Source Acc.
────────────────────  ────────────  ─────────────  ───────  ──────────
baseline-prompt-v1    0.72          0.85           0.40     0.68
improved-prompt-v2    0.91          0.95           0.90     0.82
```

This is the data you need to confidently deploy a prompt change. No more "I think the new prompt is better." You know it is, and you know by how much.

---

## Continuous Evaluation in Production

Evaluation isn't just for development. In production, you should continuously score a sample of real requests:

```javascript
async function handleChatRequest(message) {
  const result = await askDocsWithTracing(message);

  // Score every Nth request automatically (sampling)
  if (Math.random() < 0.1) {  // 10% sample
    const judgeScores = await llmJudge(
      message,
      result.answer,
      formatContext(result.sources)
    );

    // Record in Langfuse
    langfuse.score({ traceId: result.traceId, name: 'relevance', value: judgeScores.relevance / 10 });
    langfuse.score({ traceId: result.traceId, name: 'completeness', value: judgeScores.completeness / 10 });
    langfuse.score({ traceId: result.traceId, name: 'clarity', value: judgeScores.clarity / 10 });
  }

  return result;
}
```

Set up alerts in Langfuse when average scores drop below your thresholds. This catches prompt regressions, data quality issues, and model behavior changes before users complain.

---

## Langfuse vs. LangSmith

Both platforms solve similar problems. Here's how they compare:

| Factor | Langfuse | LangSmith |
|--------|---------|-----------|
| **Open source** | Yes (MIT license) | No (proprietary) |
| **Self-hosting** | Yes, Docker Compose | No |
| **Free tier** | 50K observations/month | 5K traces/month |
| **LangChain integration** | Supported via callback | Native (built by same team) |
| **Provider support** | Any LLM provider | Any, but best with LangChain |
| **Evaluation** | Datasets, scoring, comparisons | Datasets, evaluators, experiments |
| **Prompt management** | Built-in prompt versioning | Built-in prompt hub |
| **Best for** | Teams wanting open source/self-hosted | Teams already deep in LangChain |

**If you're using LangChain/LangGraph**, LangSmith is the natural choice for its deep integration. **For everything else**, Langfuse's open-source model and provider-agnostic design make it the more flexible option.

---

## Key Takeaways

1. **Monitoring without evaluation is blind.** You can track latency and errors all day, but if you're not measuring answer quality, you're flying blind on the metric that matters most.

2. **Langfuse gives you tracing, datasets, and scoring** in one platform. Instrument your code with traces, build test datasets from real questions, and score every eval run.

3. **Automated scoring catches regressions fast.** Keyword matching, source accuracy, and refusal detection run in milliseconds and catch obvious problems.

4. **LLM-as-Judge catches subtle quality issues.** Use a strong model (GPT-4o) to score relevance, completeness, and clarity when automated metrics aren't enough.

5. **Continuous production evaluation** samples real requests and scores them automatically. Set alerts on score drops to catch issues before users report them.

6. **Always compare prompt versions with data**, not intuition. Run both versions against the same dataset, compare scores, and deploy the winner.

---

## Try It Yourself

1. Sign up for Langfuse Cloud (free tier) or run it locally with Docker
2. Add Langfuse tracing to your "Ask My Docs" project from Module 07
3. Create an evaluation dataset with at least 10 test cases
4. Run your current prompt against the dataset and record baseline scores
5. Modify your system prompt (add stricter citation rules, better refusal instructions) and re-run
6. Compare the two runs in the Langfuse dashboard. Which prompt wins, and on which dimensions?

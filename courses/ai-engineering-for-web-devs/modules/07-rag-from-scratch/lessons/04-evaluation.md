---
title: "Evaluating RAG Systems"
estimatedMinutes: 65
---

## Evaluating RAG Systems

You have built a RAG pipeline. It takes questions, retrieves context, and generates answers. But how do you know if it is actually good? "It seems to work" is not a strategy. You need systematic evaluation to find weaknesses, measure improvements, and build confidence before shipping to users.

This lesson covers the metrics, tools, and scripts you need to evaluate your RAG system from the ground up.

---

## Why RAG Evaluation Is Hard

RAG has two stages that can each fail independently:

1. **Retrieval can fail**: The right documents are not retrieved, so the model never sees the answer.
2. **Generation can fail**: The right documents are retrieved, but the model misinterprets them, ignores them, or hallucinates anyway.

You need to evaluate both stages separately. A correct answer might mask bad retrieval (the model knew the answer from training data). A wrong answer might mask good retrieval (the right chunks were found but the model ignored them).

```
                ┌─────────────┐
                │  Retrieval  │ --> Did we find the right chunks?
                └──────┬──────┘
                       │
                       v
                ┌─────────────┐
                │ Generation  │ --> Did the model use them correctly?
                └──────┬──────┘
                       │
                       v
                ┌─────────────┐
                │   Answer    │ --> Is the final answer correct?
                └─────────────┘
```

---

## Building an Evaluation Dataset

Before you can measure anything, you need a test set: questions with known correct answers and the source documents those answers come from.

### The Evaluation Dataset Schema

```json
{
  "evalSet": [
    {
      "id": "q1",
      "question": "How much does each Fast Track milestone pay?",
      "expectedAnswer": "Each milestone pays a $1,000 stipend.",
      "relevantChunks": ["fast-track-guide.md > Milestones"],
      "category": "factual"
    },
    {
      "id": "q2",
      "question": "Can a 15-year-old join Fast Track?",
      "expectedAnswer": "No, applicants must be at least 18 years old.",
      "relevantChunks": ["fast-track-guide.md > Eligibility"],
      "category": "eligibility"
    },
    {
      "id": "q3",
      "question": "What is the WBB office address?",
      "expectedAnswer": "147 Front Street, Brooklyn, NY 11201",
      "relevantChunks": ["about.md > Contact"],
      "category": "factual"
    }
  ]
}
```

### How to Build a Good Eval Set

1. **Start with 20-30 questions** that cover your most important use cases
2. **Include edge cases**: questions the system should decline, ambiguous questions, multi-hop questions
3. **Categorize questions** by type: factual, eligibility, procedural, opinion, out-of-scope
4. **Write the expected answers yourself** by reading the source documents
5. **Record which chunks contain the answer** so you can evaluate retrieval separately

```javascript
// eval/create-eval-set.js

/**
 * Generate evaluation questions using an LLM -- a starting point you must review manually.
 */
import OpenAI from "openai";
import { readFile, writeFile } from "node:fs/promises";

const openai = new OpenAI();

async function generateEvalQuestions(documentPath) {
  const content = await readFile(documentPath, "utf-8");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are building an evaluation dataset for a RAG system.
Given a document, generate 10 question-answer pairs that test whether the system
can find and use information from this document.

Include:
- 6 factual questions (direct answers in the text)
- 2 inference questions (require combining info from multiple parts)
- 2 out-of-scope questions (answers NOT in the document)

Return JSON array with objects: { question, expectedAnswer, category, isInScope }`,
      },
      { role: "user", content: `Document:\n\n${content}` },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  return JSON.parse(response.choices[0].message.content);
}

// Generate and save -- but ALWAYS review manually before using
const evalData = await generateEvalQuestions("./documents/wbb-programs.md");
await writeFile("./eval/eval-set.json", JSON.stringify(evalData, null, 2));
console.log("Generated eval set -- REVIEW BEFORE USING");
```

**Important**: LLM-generated eval sets are a starting point, not a finished product. Always review and correct them manually. The whole point of evaluation is to catch mistakes, so your test set cannot contain mistakes of its own.

---

## Retrieval Metrics

These metrics measure whether the right chunks are being retrieved, regardless of what the LLM does with them.

### Recall@K

Of all the relevant chunks that exist, what fraction did we retrieve in the top K results?

```
Recall@5 = (relevant chunks in top 5) / (total relevant chunks)
```

If there are 2 relevant chunks in the corpus and you retrieve 1 of them in the top 5, your Recall@5 is 0.5.

### Precision@K

Of the K chunks we retrieved, what fraction are actually relevant?

```
Precision@5 = (relevant chunks in top 5) / 5
```

If 2 of your top 5 chunks are relevant, your Precision@5 is 0.4.

### Mean Reciprocal Rank (MRR)

How high does the first relevant chunk appear in the results?

```
MRR = 1 / rank_of_first_relevant_result
```

If the first relevant chunk is at position 3, MRR is 1/3 = 0.33. If it is at position 1, MRR is 1.0.

### Implementation

```javascript
// eval/retrieval-metrics.js

/**
 * Compute retrieval metrics for a single query.
 */
export function retrievalMetrics(retrievedChunks, relevantChunkIds, k) {
  const retrievedIds = retrievedChunks
    .slice(0, k)
    .map(c => `${c.metadata?.source} > ${c.metadata?.heading}`);

  // Recall@K
  const relevantRetrieved = relevantChunkIds.filter(id =>
    retrievedIds.some(rid => rid.includes(id))
  );
  const recall = relevantChunkIds.length > 0
    ? relevantRetrieved.length / relevantChunkIds.length
    : 0;

  // Precision@K
  const precision = retrievedIds.length > 0
    ? relevantRetrieved.length / retrievedIds.length
    : 0;

  // Mean Reciprocal Rank
  let mrr = 0;
  for (let i = 0; i < retrievedIds.length; i++) {
    if (relevantChunkIds.some(id => retrievedIds[i].includes(id))) {
      mrr = 1 / (i + 1);
      break;
    }
  }

  return { recall, precision, mrr };
}

/**
 * Compute average metrics across all eval questions.
 */
export function averageMetrics(allMetrics) {
  const avg = (arr) => arr.reduce((sum, v) => sum + v, 0) / arr.length;
  return {
    avgRecall: avg(allMetrics.map(m => m.recall)),
    avgPrecision: avg(allMetrics.map(m => m.precision)),
    avgMRR: avg(allMetrics.map(m => m.mrr)),
  };
}
```

```python
# eval/retrieval_metrics.py

def retrieval_metrics(retrieved_chunks: list[dict], relevant_ids: list[str], k: int) -> dict:
    """Compute recall@K, precision@K, and MRR for a single query."""
    retrieved_ids = [
        f"{c['metadata'].get('source', '')} > {c['metadata'].get('heading', '')}"
        for c in retrieved_chunks[:k]
    ]

    relevant_retrieved = [
        rid for rid in relevant_ids
        if any(rid in ret_id for ret_id in retrieved_ids)
    ]

    recall = len(relevant_retrieved) / len(relevant_ids) if relevant_ids else 0
    precision = len(relevant_retrieved) / len(retrieved_ids) if retrieved_ids else 0

    mrr = 0.0
    for i, ret_id in enumerate(retrieved_ids):
        if any(rid in ret_id for rid in relevant_ids):
            mrr = 1.0 / (i + 1)
            break

    return {"recall": recall, "precision": precision, "mrr": mrr}

def average_metrics(all_metrics: list[dict]) -> dict:
    """Compute average across all eval questions."""
    n = len(all_metrics)
    return {
        "avg_recall": sum(m["recall"] for m in all_metrics) / n,
        "avg_precision": sum(m["precision"] for m in all_metrics) / n,
        "avg_mrr": sum(m["mrr"] for m in all_metrics) / n,
    }
```

---

## Generation Metrics

These metrics measure whether the LLM's answer is correct, faithful to the context, and free of hallucination.

### Faithfulness

Does the answer only contain information from the retrieved context? An answer that adds information the context does not contain is unfaithful, even if that information happens to be correct.

### Relevance

Does the answer actually address the user's question? A faithful answer that talks about the wrong topic is irrelevant.

### Correctness

Does the answer match the expected answer? This is the bottom-line metric.

### LLM-as-Judge Evaluation

The most practical way to evaluate free-text answers at scale is to use another LLM as a judge. This is not perfect, but it is far more scalable than manual review.

```javascript
// eval/llm-judge.js
import OpenAI from "openai";

const openai = new OpenAI();

/**
 * Use an LLM to evaluate a RAG answer along multiple dimensions.
 */
export async function evaluateAnswer(question, generatedAnswer, expectedAnswer, context) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are evaluating a RAG system's answer. Score each dimension from 1-5.

Dimensions:
- FAITHFULNESS: Does the answer only use information from the provided context? (1=hallucinated, 5=fully grounded)
- RELEVANCE: Does the answer address the question asked? (1=off-topic, 5=directly answers)
- CORRECTNESS: Does the answer match the expected answer? (1=wrong, 5=exactly right)
- COMPLETENESS: Does the answer include all important information? (1=missing key info, 5=comprehensive)

Return JSON:
{
  "faithfulness": { "score": N, "explanation": "..." },
  "relevance": { "score": N, "explanation": "..." },
  "correctness": { "score": N, "explanation": "..." },
  "completeness": { "score": N, "explanation": "..." }
}`,
      },
      {
        role: "user",
        content: `Question: ${question}

Expected Answer: ${expectedAnswer}

Generated Answer: ${generatedAnswer}

Retrieved Context:
${context}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  return JSON.parse(response.choices[0].message.content);
}
```

```python
# eval/llm_judge.py
import json
import openai

client = openai.OpenAI()

def evaluate_answer(question: str, generated: str, expected: str, context: str) -> dict:
    """Use GPT-4o to score a RAG answer on faithfulness, relevance, correctness, completeness."""
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are evaluating a RAG system's answer. Score each dimension 1-5.\n\n"
                    "Dimensions:\n"
                    "- FAITHFULNESS: Only uses info from context? (1=hallucinated, 5=grounded)\n"
                    "- RELEVANCE: Addresses the question? (1=off-topic, 5=direct)\n"
                    "- CORRECTNESS: Matches expected answer? (1=wrong, 5=exact)\n"
                    "- COMPLETENESS: Includes all key info? (1=missing, 5=comprehensive)\n\n"
                    "Return JSON with score and explanation for each."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Question: {question}\n\n"
                    f"Expected Answer: {expected}\n\n"
                    f"Generated Answer: {generated}\n\n"
                    f"Retrieved Context:\n{context}"
                ),
            },
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )
    return json.loads(response.choices[0].message.content)
```

### Human Evaluation

LLM-as-judge is powerful but imperfect -- LLM judges tend to prefer longer, more formal answers. For production RAG systems, complement automated evaluation with human review: add thumbs-up/thumbs-down feedback in your UI, periodically review a random sample of responses, and track user satisfaction over time. Even reviewing 20-30 responses per week reveals patterns that automated metrics miss.

---

## Running a Full Evaluation

Here is a complete evaluation script that tests both retrieval and generation:

```javascript
// eval/run-eval.js
import { readFile, writeFile } from "node:fs/promises";
import { ragPipeline } from "../rag.js";
import { vectorSearch } from "../retrieval/vector-search.js";
import { retrievalMetrics, averageMetrics } from "./retrieval-metrics.js";
import { evaluateAnswer } from "./llm-judge.js";

async function runEvaluation() {
  const evalSet = JSON.parse(await readFile("./eval/eval-set.json", "utf-8"));
  const results = [];

  console.log(`Running evaluation on ${evalSet.evalSet.length} questions...\n`);

  for (const item of evalSet.evalSet) {
    console.log(`Q: ${item.question}`);

    // 1. Evaluate retrieval
    const retrieved = await vectorSearch(item.question, "wbb-rag", 5);
    const retMetrics = retrievalMetrics(retrieved, item.relevantChunks, 5);

    // 2. Run full RAG pipeline
    const ragResult = await ragPipeline(item.question, { verbose: false });

    // 3. Evaluate generation with LLM judge
    const context = retrieved.map(c => c.text).join("\n\n---\n\n");
    const genMetrics = await evaluateAnswer(
      item.question,
      ragResult.answer,
      item.expectedAnswer,
      context
    );

    const result = {
      id: item.id,
      question: item.question,
      expectedAnswer: item.expectedAnswer,
      generatedAnswer: ragResult.answer,
      category: item.category,
      retrieval: retMetrics,
      generation: genMetrics,
    };

    results.push(result);

    // Print summary for this question
    console.log(`  Retrieval - Recall: ${retMetrics.recall.toFixed(2)}, MRR: ${retMetrics.mrr.toFixed(2)}`);
    console.log(`  Generation - Correctness: ${genMetrics.correctness.score}/5, Faithfulness: ${genMetrics.faithfulness.score}/5`);
    console.log();
  }

  // Aggregate metrics
  const retAvg = averageMetrics(results.map(r => r.retrieval));
  const genAvg = {
    avgCorrectness: results.reduce((s, r) => s + r.generation.correctness.score, 0) / results.length,
    avgFaithfulness: results.reduce((s, r) => s + r.generation.faithfulness.score, 0) / results.length,
    avgRelevance: results.reduce((s, r) => s + r.generation.relevance.score, 0) / results.length,
    avgCompleteness: results.reduce((s, r) => s + r.generation.completeness.score, 0) / results.length,
  };

  console.log("=== AGGREGATE RESULTS ===");
  console.log(`Retrieval: Recall=${retAvg.avgRecall.toFixed(2)}, Precision=${retAvg.avgPrecision.toFixed(2)}, MRR=${retAvg.avgMRR.toFixed(2)}`);
  console.log(`Generation: Correctness=${genAvg.avgCorrectness.toFixed(1)}/5, Faithfulness=${genAvg.avgFaithfulness.toFixed(1)}/5`);
  console.log(`            Relevance=${genAvg.avgRelevance.toFixed(1)}/5, Completeness=${genAvg.avgCompleteness.toFixed(1)}/5`);

  // Save detailed results
  await writeFile("./eval/results.json", JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: { retrieval: retAvg, generation: genAvg },
    details: results,
  }, null, 2));

  console.log("\nDetailed results saved to eval/results.json");
}

runEvaluation();
```

---

## Common Failure Modes and How to Fix Them

### Failure Mode 1: Retrieval Misses

**Symptom**: The correct chunk is not in the top K results.

**Diagnosis**: Low Recall@K across your eval set.

**Fixes**:
- Try a different chunking strategy or chunk size
- Add query rewriting or multi-query expansion
- Switch to hybrid search (vector + keyword)
- Check if the embedding model is appropriate for your content domain

```javascript
// Quick diagnostic: for each missed question, show what WAS retrieved
for (const result of evalResults) {
  if (result.retrieval.recall === 0) {
    console.log(`\nMISSED: ${result.question}`);
    console.log(`Expected chunk: ${result.expectedChunks.join(", ")}`);
    console.log(`Retrieved instead:`);
    result.retrievedChunks.forEach((c, i) => {
      console.log(`  ${i + 1}. [${c.metadata?.source}] ${c.text.slice(0, 80)}...`);
    });
  }
}
```

### Failure Mode 2: Hallucination Despite Good Retrieval

**Symptom**: The correct chunks are retrieved, but the model adds information not in the context.

**Diagnosis**: High Recall but low Faithfulness scores.

**Fixes**:
- Strengthen the system prompt: "Answer ONLY using the provided context"
- Lower the temperature to 0-0.1
- Add an explicit instruction: "If the context does not contain the answer, say so"
- Use a more capable model (GPT-4o instead of GPT-4o-mini)

### Failure Mode 3: Lost in the Middle

**Symptom**: The model ignores relevant information that appears in the middle of the context.

**Diagnosis**: Answers improve when you reduce the number of retrieved chunks.

**Fixes**:
- Retrieve fewer chunks (3 instead of 10)
- Reorder chunks to put the most relevant at the beginning and end
- Summarize each chunk before inserting into the prompt
- Use a model with better long-context handling

### Failure Mode 4: Conflicting Information

**Symptom**: Different chunks contain contradictory information, and the model picks the wrong one.

**Diagnosis**: Look for chunks from different document versions or dates.

**Fixes**:
- Add date metadata and prefer newer chunks
- Deduplicate chunks during indexing
- Add a conflict detection step that flags contradictions for human review

### Failure Mode 5: Over-Reliance on Retrieval

**Symptom**: The model refuses to answer questions it should know from its training data because the context does not cover them.

**Diagnosis**: Too many "I don't have enough information" responses for general knowledge questions.

**Fixes**:
- Adjust the system prompt to allow general knowledge for non-domain-specific questions
- Add a fallback: if retrieval confidence is low, let the model answer from its training data with a disclaimer

---

## A Simple Evaluation Dashboard

You do not need a fancy tool. A simple script that outputs a markdown report is enough to start:

```javascript
// eval/report.js

function generateReport(results) {
  const lines = [
    "# RAG Evaluation Report",
    `**Date**: ${new Date().toISOString().split("T")[0]}`,
    `**Questions evaluated**: ${results.details.length}`,
    "",
    "## Summary",
    "",
    "| Metric | Score |",
    "|--------|-------|",
    `| Avg Recall@5 | ${(results.summary.retrieval.avgRecall * 100).toFixed(0)}% |`,
    `| Avg Precision@5 | ${(results.summary.retrieval.avgPrecision * 100).toFixed(0)}% |`,
    `| Avg MRR | ${results.summary.retrieval.avgMRR.toFixed(2)} |`,
    `| Avg Correctness | ${results.summary.generation.avgCorrectness.toFixed(1)}/5 |`,
    `| Avg Faithfulness | ${results.summary.generation.avgFaithfulness.toFixed(1)}/5 |`,
    "",
    "## Failures",
    "",
  ];

  // List questions with low scores
  for (const detail of results.details) {
    const correct = detail.generation.correctness.score;
    const faithful = detail.generation.faithfulness.score;
    if (correct <= 3 || faithful <= 3) {
      lines.push(`### ${detail.question}`);
      lines.push(`- **Expected**: ${detail.expectedAnswer}`);
      lines.push(`- **Generated**: ${detail.generatedAnswer}`);
      lines.push(`- **Correctness**: ${correct}/5 -- ${detail.generation.correctness.explanation}`);
      lines.push(`- **Faithfulness**: ${faithful}/5 -- ${detail.generation.faithfulness.explanation}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}
```

---

## The Evaluation Loop

Evaluation is not a one-time activity. It is a continuous loop:

```
1. Build / modify RAG pipeline
         |
         v
2. Run eval suite (20-50 questions)
         |
         v
3. Review metrics and failures
         |
         v
4. Identify the weakest component
   (chunking? retrieval? generation?)
         |
         v
5. Fix that component
         |
         v
6. Run eval again -- did scores improve?
         |
         v
   If yes --> ship it
   If no  --> go to step 4
```

### Tracking Progress Over Time

Keep a simple log of your evaluation runs:

```javascript
// eval/history.jsonl (append-only)
// Each line is one eval run
{"date":"2026-03-04","recall":0.65,"precision":0.40,"mrr":0.58,"correctness":3.2,"faithfulness":4.1,"notes":"baseline with naive RAG"}
{"date":"2026-03-05","recall":0.80,"precision":0.55,"mrr":0.72,"correctness":3.8,"faithfulness":4.3,"notes":"added query rewriting"}
{"date":"2026-03-06","recall":0.85,"precision":0.60,"mrr":0.78,"correctness":4.2,"faithfulness":4.5,"notes":"switched to recursive chunking"}
```

This lets you see which changes actually moved the needle.

---

## When Is Your RAG System Good Enough?

There is no universal threshold, but here are targets for different use cases:

| Use Case | Recall@5 | Correctness | Faithfulness |
|----------|----------|-------------|--------------|
| Internal knowledge bot (low stakes) | >70% | >3.5/5 | >4.0/5 |
| Customer-facing support bot | >85% | >4.0/5 | >4.5/5 |
| Legal/medical/financial Q&A | >95% | >4.5/5 | >4.8/5 |

For high-stakes applications, supplement automated evaluation with human review. No LLM judge is a substitute for domain expert verification.

---

## Key Takeaways

- **Evaluate retrieval and generation separately.** A correct answer can mask bad retrieval, and good retrieval can be wasted by bad generation.
- **Build an evaluation dataset** of 20-30 questions with expected answers and source references. LLM-generated eval sets are a starting point -- always review them manually.
- **Retrieval metrics** (Recall@K, Precision@K, MRR) tell you whether the right chunks are being found.
- **Generation metrics** (faithfulness, relevance, correctness, completeness) tell you whether the model is using the context properly.
- **LLM-as-judge** is the most practical way to evaluate free-text answers at scale, but it is not perfect. Combine with human review for high-stakes applications.
- **Evaluation is a loop**, not a one-time task. Run evals after every pipeline change, track metrics over time, and focus improvements on the weakest component.

---

## Try It Yourself

1. **Create an eval set.** Write 15 question-answer pairs for a document set you care about. Include 3 out-of-scope questions that the system should decline to answer.

2. **Run retrieval evaluation.** Using your eval set, compute Recall@5, Precision@5, and MRR. Which questions have the lowest retrieval scores? Examine what was retrieved instead and hypothesize why.

3. **Run the LLM judge.** Evaluate 10 generated answers using the `evaluateAnswer` function. Do you agree with the LLM's scores? Where does it get the assessment wrong?

4. **Fix a failure.** Pick the question with the worst scores. Diagnose whether the problem is retrieval or generation. Make one change to fix it, then re-evaluate to confirm the improvement.

5. **Build your evaluation history.** Run the full eval suite three times: once with your baseline, once after improving chunking, and once after adding query rewriting. Plot the metrics to see which change had the biggest impact.

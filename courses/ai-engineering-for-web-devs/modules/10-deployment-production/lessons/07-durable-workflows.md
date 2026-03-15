---
title: "Durable AI Workflows with Temporal"
estimatedMinutes: 45
---

# Durable AI Workflows with Temporal

Your AI pipeline has multiple steps: parse a document, chunk it, embed each chunk, store the vectors, then send a notification. What happens when step 4 fails after you've already embedded 500 chunks? Without durability, you restart from zero. You re-parse, re-chunk, re-embed (paying for all those API calls again), and hope it works this time.

Durable workflows solve this. They persist the state of each step so that when something fails, execution resumes from where it left off, not from the beginning. For AI applications, where individual steps can cost real money (embedding calls, LLM calls) and take real time (minutes for large documents), durability isn't a nice-to-have. It's a cost and reliability requirement.

Temporal is the most mature durable workflow engine. It's used in production at Netflix, Uber, Snap, and thousands of other companies. It's open source, battle-tested, and has SDKs for JavaScript/TypeScript, Python, Go, and Java.

---

## Why AI Workflows Need Durability

Standard API request/response patterns break for AI workloads:

| Scenario | Without Durability | With Durability |
|----------|-------------------|-----------------|
| Embedding 1000 chunks, API fails at chunk 800 | Start over. Pay for 1000 embeddings again | Resume from chunk 800. Pay for 200 embeddings |
| Multi-step agent runs for 5 minutes, server restarts | Entire agent run is lost | Agent resumes from last completed step |
| Document ingestion takes 10 minutes | Serverless function times out at 60s | Workflow runs for hours if needed |
| User uploads 50 documents simultaneously | Server overloaded, some fail silently | Queue manages concurrency, all complete |
| LLM API rate limited mid-workflow | Unhandled error crashes the pipeline | Automatic retry with backoff, workflow continues |

---

## Temporal Core Concepts

Temporal has four key concepts:

### 1. Workflows

A **workflow** is a function that orchestrates your business logic. It must be deterministic (same inputs produce the same sequence of steps). Workflows can run for seconds, hours, or even years.

```typescript
// A workflow is just an async function with a special decorator
async function ingestDocumentWorkflow(documentId: string): Promise<IngestResult> {
  // Each step is an Activity call
  const parsed = await parseDocument(documentId);
  const chunks = await chunkDocument(parsed);
  const embedded = await embedChunks(chunks);
  await storeVectors(embedded);
  await notifyComplete(documentId);
  return { chunkCount: chunks.length, status: 'complete' };
}
```

### 2. Activities

**Activities** are the actual work functions. They can be non-deterministic (make API calls, read files, query databases). When an activity fails, Temporal retries it automatically.

```typescript
// Activities do the real work and CAN fail
async function embedChunks(chunks: Chunk[]): Promise<EmbeddedChunk[]> {
  // This calls the OpenAI API -- it might fail, rate limit, or timeout
  // Temporal handles retries automatically
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunks.map(c => c.text),
  });
  return chunks.map((chunk, i) => ({
    ...chunk,
    embedding: response.data[i].embedding,
  }));
}
```

### 3. Task Queues

**Task queues** route workflows and activities to workers. You can have different queues for different workload types (fast tasks vs. heavy embedding jobs).

### 4. Workers

**Workers** are processes that poll task queues and execute workflows/activities. You run them alongside your application.

---

## Building a Durable Ingestion Pipeline

Let's rebuild a document ingestion pipeline with Temporal. This is the kind of pipeline that breaks without durability: multiple API calls, variable processing time, and real money at stake.

### Setup

```bash
# Install Temporal CLI (includes a local dev server)
brew install temporal  # macOS
# Or: curl -sSf https://temporal.download/cli.sh | sh

# Start the local dev server
temporal server start-dev

# Install the SDK
npm install @temporalio/client @temporalio/worker @temporalio/workflow @temporalio/activity
```

### Define Activities (TypeScript)

```typescript
// src/activities.ts
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';

const openai = new OpenAI();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export interface Chunk {
  id: string;
  text: string;
  sourceFile: string;
  chunkIndex: number;
}

export interface EmbeddedChunk extends Chunk {
  embedding: number[];
}

/**
 * Parse a document from the filesystem.
 * Activity: may fail if file doesn't exist.
 */
export async function parseDocument(filePath: string): Promise<string> {
  console.log(`[Activity] Parsing: ${filePath}`);
  const content = await readFile(filePath, 'utf-8');
  return content;
}

/**
 * Split document into chunks.
 * Activity: pure computation, unlikely to fail.
 */
export async function chunkDocument(content: string, sourceFile: string): Promise<Chunk[]> {
  console.log(`[Activity] Chunking: ${content.length} chars`);
  const sections = content.split(/(?=^#{1,3}\s)/m).filter(s => s.trim());

  return sections.map((text, i) => ({
    id: `${sourceFile}-chunk-${i}`,
    text: text.trim(),
    sourceFile,
    chunkIndex: i,
  }));
}

/**
 * Embed a batch of chunks using OpenAI.
 * Activity: makes API calls, may fail or rate limit.
 * Temporal will retry with backoff automatically.
 */
export async function embedBatch(chunks: Chunk[]): Promise<EmbeddedChunk[]> {
  console.log(`[Activity] Embedding batch of ${chunks.length} chunks`);

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunks.map(c => `${c.sourceFile}\n\n${c.text}`),
  });

  return chunks.map((chunk, i) => ({
    ...chunk,
    embedding: response.data[i].embedding,
  }));
}

/**
 * Store embedded chunks in Supabase.
 * Activity: database operation, may fail on connection issues.
 */
export async function storeVectors(chunks: EmbeddedChunk[]): Promise<number> {
  console.log(`[Activity] Storing ${chunks.length} vectors`);

  const rows = chunks.map(c => ({
    id: c.id,
    content: c.text,
    source_file: c.sourceFile,
    chunk_index: c.chunkIndex,
    embedding: JSON.stringify(c.embedding),
  }));

  const { error } = await supabase.from('docs').upsert(rows);
  if (error) throw new Error(`Storage failed: ${error.message}`);

  return chunks.length;
}

/**
 * Send a notification that ingestion is complete.
 */
export async function notifyComplete(
  sourceFile: string,
  chunkCount: number
): Promise<void> {
  console.log(`[Activity] Ingestion complete: ${sourceFile} (${chunkCount} chunks)`);
  // In production: send Slack message, update database status, etc.
}
```

### Define the Workflow (TypeScript)

```typescript
// src/workflows.ts
import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from './activities';

// Create activity proxies with retry policies
const {
  parseDocument,
  chunkDocument,
  embedBatch,
  storeVectors,
  notifyComplete,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '2 minutes',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
    maximumAttempts: 5,
  },
});

// Use a more aggressive retry for embedding (handles rate limits)
const { embedBatch: embedBatchWithRetry } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '2s',
    backoffCoefficient: 3,        // Aggressive backoff for rate limits
    maximumInterval: '60s',
    maximumAttempts: 10,
  },
});

export interface IngestResult {
  sourceFile: string;
  chunkCount: number;
  batchesProcessed: number;
  status: 'complete' | 'failed';
}

/**
 * Durable document ingestion workflow.
 *
 * If the server crashes after embedding 3 of 5 batches,
 * Temporal resumes from batch 4 -- no re-embedding, no re-parsing.
 */
export async function ingestDocumentWorkflow(filePath: string): Promise<IngestResult> {
  const sourceFile = filePath.split('/').pop() || filePath;

  // Step 1: Parse the document
  const content = await parseDocument(filePath);

  // Step 2: Chunk it
  const chunks = await chunkDocument(content, sourceFile);

  // Step 3: Embed in batches of 50 (with rate limit-aware retries)
  const BATCH_SIZE = 50;
  let totalStored = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    // Embed this batch (Temporal retries on API failure)
    const embedded = await embedBatchWithRetry(batch);

    // Store this batch (Temporal retries on DB failure)
    const stored = await storeVectors(embedded);
    totalStored += stored;

    // Rate limit courtesy: small pause between batches
    if (i + BATCH_SIZE < chunks.length) {
      await sleep('500ms');
    }
  }

  // Step 4: Notify
  await notifyComplete(sourceFile, totalStored);

  return {
    sourceFile,
    chunkCount: totalStored,
    batchesProcessed: Math.ceil(chunks.length / BATCH_SIZE),
    status: 'complete',
  };
}

/**
 * Bulk ingestion: process multiple documents with controlled concurrency.
 */
export async function bulkIngestWorkflow(filePaths: string[]): Promise<IngestResult[]> {
  // Process documents one at a time to avoid rate limits.
  // For higher throughput, you could use Temporal's child workflows
  // to process multiple documents in parallel.
  const results: IngestResult[] = [];

  for (const filePath of filePaths) {
    const result = await ingestDocumentWorkflow(filePath);
    results.push(result);
  }

  return results;
}
```

### Create the Worker

```typescript
// src/worker.ts
import { Worker } from '@temporalio/worker';
import * as activities from './activities';

async function run() {
  const worker = await Worker.create({
    workflowsPath: require.resolve('./workflows'),
    activities,
    taskQueue: 'ai-ingestion',
  });

  console.log('Worker started. Listening on queue: ai-ingestion');
  await worker.run();
}

run().catch(console.error);
```

### Start a Workflow from Your API

```typescript
// In your Next.js API route or Express handler
import { Client, Connection } from '@temporalio/client';

const connection = await Connection.connect({ address: 'localhost:7233' });
const client = new Client({ connection });

// Start the workflow (returns immediately with a handle)
const handle = await client.workflow.start('ingestDocumentWorkflow', {
  args: ['./docs/getting-started.md'],
  taskQueue: 'ai-ingestion',
  workflowId: `ingest-${Date.now()}`,
});

console.log(`Workflow started: ${handle.workflowId}`);

// Later, check the result
const result = await handle.result();
console.log(`Ingested ${result.chunkCount} chunks from ${result.sourceFile}`);
```

---

## Temporal for Multi-Step Agents

Agents are a natural fit for durable workflows. Each agent step (think, tool call, observe) becomes an activity that Temporal can retry and resume:

```typescript
// workflows.ts
export async function researchAgentWorkflow(topic: string): Promise<string> {
  let notes: string[] = [];
  let iteration = 0;
  const MAX_ITERATIONS = 10;

  while (iteration < MAX_ITERATIONS) {
    // Think: decide next action (Activity -- calls LLM)
    const decision = await agentThink(topic, notes, iteration);

    if (decision.action === 'done') {
      break;
    }

    if (decision.action === 'search') {
      // Act: search the web (Activity -- calls external API)
      const results = await webSearch(decision.query);
      notes.push(`Search: ${decision.query}\nResults: ${results}`);
    }

    if (decision.action === 'extract') {
      const content = await extractContent(decision.url);
      notes.push(`Extracted from ${decision.url}: ${content}`);
    }

    iteration++;
    // If the server crashes here, Temporal resumes from the last completed step.
    // The agent doesn't re-search or re-extract.
  }

  // Generate final report (Activity -- calls LLM)
  const report = await generateReport(topic, notes);
  return report;
}
```

The key insight: each `await` in the workflow is a checkpoint. If the process crashes after `webSearch` but before `extractContent`, Temporal replays the workflow from the beginning, but **skips the already-completed activities** (using their recorded results) and resumes at `extractContent`. You don't re-call the LLM or re-search the web. You don't pay again for those API calls.

---

## Inngest: A Serverless Alternative

If running a Temporal server feels heavy for your needs, Inngest is a serverless alternative that works well with Vercel and Next.js:

```typescript
// npm install inngest

import { Inngest } from 'inngest';

const inngest = new Inngest({ id: 'ai-knowledge-base' });

// Define a durable function
export const ingestDocument = inngest.createFunction(
  {
    id: 'ingest-document',
    retries: 5,
  },
  { event: 'document/uploaded' },
  async ({ event, step }) => {
    // Each step.run() is checkpointed
    const content = await step.run('parse', async () => {
      return await parseDocument(event.data.filePath);
    });

    const chunks = await step.run('chunk', async () => {
      return await chunkDocument(content, event.data.fileName);
    });

    // Process batches with individual retries
    for (let i = 0; i < chunks.length; i += 50) {
      const batch = chunks.slice(i, i + 50);

      await step.run(`embed-batch-${i}`, async () => {
        const embedded = await embedBatch(batch);
        await storeVectors(embedded);
      });

      // Built-in sleep (doesn't block a serverless function)
      await step.sleep('rate-limit-pause', '500ms');
    }

    await step.run('notify', async () => {
      await notifyComplete(event.data.fileName, chunks.length);
    });

    return { chunkCount: chunks.length };
  }
);
```

### Temporal vs. Inngest

| Factor | Temporal | Inngest |
|--------|---------|---------|
| **Hosting** | Self-hosted or Temporal Cloud | Managed cloud (free tier: 5K runs/month) |
| **Complexity** | Higher. Separate worker process, workflow/activity split | Lower. Single function with step.run() |
| **Serverless** | Requires a long-running worker | Designed for serverless (works on Vercel) |
| **Scalability** | Battle-tested at massive scale (Uber, Netflix) | Growing, suited for small-medium workloads |
| **Language support** | TS, Python, Go, Java | TypeScript, Python |
| **Best for** | Complex workflows, high scale, multi-language teams | Next.js apps, simpler workflows, quick setup |

**Rule of thumb:** Use **Inngest** if you're on Vercel and need durable steps without infrastructure overhead. Use **Temporal** if you need maximum control, complex workflows, or you're already running your own infrastructure.

---

## When to Add Durability

Not every AI operation needs a workflow engine. Here's a decision framework:

| Situation | Approach |
|-----------|----------|
| Single LLM call, < 30 seconds | Regular API route. No workflow needed |
| Multi-step pipeline, < 60 seconds | Regular API route with error handling. Consider a workflow if steps are expensive |
| Pipeline with expensive steps (embeddings, LLM calls) that can fail | **Use a workflow.** Retry individual steps, don't re-pay for completed work |
| Long-running agent (> 60 seconds) | **Use a workflow.** Serverless functions will timeout |
| Bulk processing (50+ documents) | **Use a workflow.** Queue management, concurrency control, progress tracking |
| User-facing chat (real-time) | Regular API route with streaming. Durability adds latency |

---

## Key Takeaways

1. **Durable workflows save money.** When an embedding batch fails at step 800 of 1000, you resume from 800, not from 0. For AI workloads where each step costs real API dollars, this adds up fast.

2. **Temporal** is the industry standard for durable workflows. It separates orchestration (workflows) from execution (activities), with automatic retries, checkpointing, and replay.

3. **Inngest** is a lighter alternative designed for serverless. If you're on Vercel and want durable steps without running infrastructure, it's the pragmatic choice.

4. **Agents are a natural fit** for durable workflows. Each think-act-observe cycle becomes a checkpointed step that survives crashes and retries failures.

5. **Don't add durability everywhere.** Simple, fast, cheap operations don't need a workflow engine. Add it when steps are expensive, long-running, or failure-prone.

---

## Try It Yourself

1. Install the Temporal CLI and start the local dev server (`temporal server start-dev`)
2. Take your document ingestion pipeline from Module 07 and rewrite it as a Temporal workflow
3. Simulate a failure: add a random `throw new Error()` in your `embedBatch` activity
4. Watch Temporal automatically retry the failed activity and complete the workflow
5. Check the Temporal Web UI (http://localhost:8233) to see the workflow history, retries, and step-by-step execution

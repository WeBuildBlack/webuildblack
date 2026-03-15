---
title: "Module Project: Ask My Docs"
estimatedMinutes: 120
---

## Module Project: Ask My Docs

Build a RAG-powered Q&A bot that can answer questions about any documentation set. You'll pick a real docs folder -- your own project docs, a library's README collection, the WBB docs, or anything you work with regularly -- and build the full pipeline: chunk, embed, store, retrieve, augment, generate. Your bot will include hybrid search (keyword + semantic), source citations in every answer, and an evaluation script that measures retrieval quality. This is the core RAG muscle -- every AI product you build after this will use some version of this pipeline.

---

## What You'll Practice

- Understanding the full RAG pipeline and where each piece fits (Lesson 1: RAG Overview)
- Implementing multiple chunking strategies and choosing the right one for your docs (Lesson 2: Document Chunking)
- Building a retrieval pipeline with query processing, embedding, search, and reranking (Lesson 3: Retrieval Pipelines)
- Constructing effective RAG prompts with retrieved context and citation instructions (Lesson 3: Prompt Assembly)
- Implementing hybrid search that combines keyword and semantic matching (Lesson 3: Retrieval)
- Evaluating retrieval quality with precision, recall, and answer faithfulness checks (Lesson 4: Evaluation)

---

## Prerequisites

Before you start, make sure you have:

- **Node.js 18+** installed
- **An OpenAI API key** (for embeddings + chat completions)
- **A Supabase project** with pgvector enabled (same one from Module 06 works)
- **A documentation folder** with at least 10 markdown files. Good options:
  - Clone a repo's `/docs` folder (Next.js, Supabase, any library you use)
  - Use your own project documentation or class notes
  - Download the WBB course docs you've been working through
- Completed Module 06 (you should be comfortable with embeddings and Supabase)

### Setup

```bash
# Create your project
mkdir ask-my-docs && cd ask-my-docs
npm init -y
npm install openai @supabase/supabase-js dotenv

# Create environment file
cat > .env << 'EOF'
OPENAI_API_KEY=sk-your-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
EOF

# Create folder structure
mkdir -p docs src eval
```

Copy your documentation files into the `docs/` folder.

---

## Step-by-Step Instructions

### Step 1: Set Up the Database with Hybrid Search (10 min)

In your Supabase SQL Editor, create a table that supports both vector search and full-text keyword search:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE docs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_file TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding VECTOR(1536),
  fts TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', title || ' ' || content)
  ) STORED,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON docs USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON docs USING gin(fts);

-- Hybrid search function: combines keyword and semantic results
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text TEXT,
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 5,
  keyword_weight FLOAT DEFAULT 0.3,
  semantic_weight FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id TEXT,
  title TEXT,
  content TEXT,
  source_file TEXT,
  keyword_rank FLOAT,
  semantic_score FLOAT,
  combined_score FLOAT
)
LANGUAGE sql STABLE
AS $$
  WITH keyword_results AS (
    SELECT id, ts_rank(fts, websearch_to_tsquery('english', query_text)) AS rank
    FROM docs
    WHERE fts @@ websearch_to_tsquery('english', query_text)
  ),
  semantic_results AS (
    SELECT id, 1 - (embedding <=> query_embedding) AS similarity
    FROM docs
    ORDER BY embedding <=> query_embedding
    LIMIT match_count * 3
  )
  SELECT
    d.id, d.title, d.content, d.source_file,
    COALESCE(kr.rank, 0) AS keyword_rank,
    COALESCE(sr.similarity, 0) AS semantic_score,
    (COALESCE(kr.rank, 0) * keyword_weight + COALESCE(sr.similarity, 0) * semantic_weight) AS combined_score
  FROM docs d
  LEFT JOIN keyword_results kr ON d.id = kr.id
  LEFT JOIN semantic_results sr ON d.id = sr.id
  WHERE kr.id IS NOT NULL OR sr.id IS NOT NULL
  ORDER BY combined_score DESC
  LIMIT match_count;
$$;
```

### Step 2: Build the Chunking Pipeline (15 min)

Create `src/chunker.js`. Your docs might have different structures, so implement a markdown-aware chunker that respects headings.

```javascript
// src/chunker.js

/**
 * Split markdown content into chunks that respect heading boundaries.
 * Each chunk includes the nearest heading for context.
 */
export function chunkMarkdown(content, { maxSize = 800, overlap = 150 } = {}) {
  const chunks = [];

  // Step 1: Split by headings (##, ###) keeping the heading with its content
  const sections = content.split(/(?=^#{1,3}\s)/m).filter(s => s.trim());

  for (const section of sections) {
    if (section.length <= maxSize) {
      chunks.push(section.trim());
    } else {
      // TODO: The section is too long. Split it further by paragraphs (\n\n).
      // Walk through paragraphs, accumulating text. When adding the next
      // paragraph would exceed maxSize, push the current accumulation as a
      // chunk and start a new one with `overlap` characters of trailing
      // context from the previous chunk.
    }
  }

  return chunks.map((text, i) => ({ text, chunkIndex: i }));
}

/**
 * Extract the title from markdown (first # heading).
 */
export function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}
```

### Step 3: Build the Ingestion Script (10 min)

Create `src/ingest.js`. You already built one of these in Module 06 -- this version adds metadata tracking.

```javascript
// src/ingest.js
import 'dotenv/config';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { chunkMarkdown, extractTitle } from './chunker.js';

const openai = new OpenAI();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DOCS_DIR = './docs';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const files = await readdir(DOCS_DIR);
  const mdFiles = files.filter(f => f.endsWith('.md'));
  console.log(`[Ingest] Found ${mdFiles.length} markdown files`);

  const allChunks = [];
  for (const file of mdFiles) {
    const raw = await readFile(join(DOCS_DIR, file), 'utf-8');
    const title = extractTitle(raw) || file.replace('.md', '');
    const contentHash = createHash('md5').update(raw).digest('hex');
    const chunks = chunkMarkdown(raw);

    chunks.forEach(chunk => {
      allChunks.push({
        id: `${file}-chunk-${chunk.chunkIndex}`,
        title,
        content: chunk.text,
        sourceFile: file,
        chunkIndex: chunk.chunkIndex,
        metadata: { contentHash },
      });
    });
  }

  console.log(`[Ingest] ${allChunks.length} chunks total`);
  if (dryRun) {
    allChunks.slice(0, 5).forEach(c =>
      console.log(`  ${c.id} (${c.content.length} chars): "${c.content.slice(0, 80)}..."`)
    );
    return;
  }

  // Generate embeddings in batches of 50
  for (let i = 0; i < allChunks.length; i += 50) {
    const batch = allChunks.slice(i, i + 50);
    const texts = batch.map(c => `${c.title}\n\n${c.content}`);
    const resp = await openai.embeddings.create({ model: 'text-embedding-3-small', input: texts });
    resp.data.sort((a, b) => a.index - b.index).forEach((item, j) => {
      batch[j].embedding = item.embedding;
    });
    console.log(`[Ingest] Embedded ${Math.min(i + 50, allChunks.length)}/${allChunks.length}`);
    if (i + 50 < allChunks.length) await new Promise(r => setTimeout(r, 250));
  }

  // Upsert
  for (let i = 0; i < allChunks.length; i += 100) {
    const rows = allChunks.slice(i, i + 100).map(c => ({
      id: c.id, title: c.title, content: c.content,
      source_file: c.sourceFile, chunk_index: c.chunkIndex,
      embedding: JSON.stringify(c.embedding), metadata: c.metadata,
    }));
    const { error } = await supabase.from('docs').upsert(rows);
    if (error) throw new Error(`Upsert failed: ${error.message}`);
  }

  console.log(`[Ingest] Done! ${allChunks.length} chunks stored.`);
}

main().catch(console.error);
```

### Step 4: Build the RAG Pipeline (20 min)

Create `src/rag.js`. This is the core of the project -- it retrieves relevant context and generates an answer with citations.

```javascript
// src/rag.js
import 'dotenv/config';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Run the full RAG pipeline: retrieve context, build prompt, generate answer.
 */
export async function askDocs(question, { topK = 5, threshold = 0.4 } = {}) {
  const startTime = Date.now();

  // Step 1: Embed the question
  const embResp = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question,
  });
  const queryEmbedding = embResp.data[0].embedding;

  // Step 2: Hybrid retrieval
  const { data: results, error } = await supabase.rpc('hybrid_search', {
    query_text: question,
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: topK,
    keyword_weight: 0.3,
    semantic_weight: 0.7,
  });

  if (error) throw new Error(`Retrieval failed: ${error.message}`);
  if (!results || results.length === 0) {
    return { answer: "I couldn't find any relevant information in the docs.", sources: [], latencyMs: Date.now() - startTime };
  }

  // Step 3: Build the augmented prompt
  // TODO: Construct the context string by joining the retrieved chunks.
  // Number each source so the model can cite them: [1], [2], etc.
  // Format: "[1] (source_file) title\ncontent\n\n[2] ..."
  const context = results.map((r, i) =>
    `[${i + 1}] (${r.source_file}) ${r.title}\n${r.content}`
  ).join('\n\n---\n\n');

  const systemPrompt = `You are a helpful documentation assistant. Answer the user's question based ONLY on the provided context. If the context doesn't contain enough information, say so honestly.

Rules:
- Cite your sources using [1], [2], etc. corresponding to the context numbers
- Every factual claim must have a citation
- If the answer spans multiple sources, cite each one
- Keep answers clear and concise
- Use code examples from the docs when relevant`;

  // TODO: Call openai.chat.completions.create() with:
  //   model: 'gpt-4o-mini'
  //   messages: system prompt + user message (question + context)
  //   temperature: 0.2 (low for factual accuracy)
  //   max_tokens: 1000

  // TODO: Extract the answer text from the response

  // Step 4: Return the answer with source metadata
  return {
    answer: '', // TODO: replace with the actual generated answer
    sources: results.map((r, i) => ({
      index: i + 1,
      title: r.title,
      file: r.source_file,
      score: r.combined_score,
      preview: r.content.slice(0, 150),
    })),
    latencyMs: Date.now() - startTime,
  };
}
```

### Step 5: Build the CLI Interface (5 min)

Create `src/cli.js` so you can test interactively from the terminal.

```javascript
// src/cli.js
import 'dotenv/config';
import { createInterface } from 'readline';
import { askDocs } from './rag.js';

const rl = createInterface({ input: process.stdin, output: process.stdout });

console.log('Ask My Docs - type a question, or "quit" to exit\n');

function prompt() {
  rl.question('You: ', async (question) => {
    if (question.toLowerCase() === 'quit') { rl.close(); return; }

    try {
      const result = await askDocs(question);
      console.log(`\nAnswer: ${result.answer}\n`);
      console.log('Sources:');
      result.sources.forEach(s => {
        console.log(`  [${s.index}] ${s.title} (${s.file}) - ${(s.score * 100).toFixed(0)}% match`);
      });
      console.log(`\n(${result.latencyMs}ms)\n`);
    } catch (err) {
      console.error('Error:', err.message);
    }

    prompt();
  });
}

prompt();
```

### Step 6: Build the Evaluation Script (15 min)

Create `eval/evaluate.js`. This measures how well your RAG pipeline actually works.

```javascript
// eval/evaluate.js
import 'dotenv/config';
import { askDocs } from '../src/rag.js';

// Define test cases: questions with expected source files and key phrases
// that should appear in good answers. Customize these for YOUR docs.
const testCases = [
  {
    question: "What is the main purpose of this project?",
    expectedSources: ["README.md"],
    expectedKeyPhrases: ["purpose", "goal"],
  },
  {
    question: "How do I install the dependencies?",
    expectedSources: ["getting-started.md", "README.md"],
    expectedKeyPhrases: ["npm install", "install"],
  },
  // TODO: Add at least 5 more test cases specific to YOUR documentation.
  // Think about:
  //   - Questions that use different words than the docs (tests semantic search)
  //   - Questions that need info from multiple files (tests retrieval breadth)
  //   - Questions the docs DON'T answer (tests honesty / hallucination resistance)
];

async function evaluate() {
  console.log(`Running ${testCases.length} evaluation queries...\n`);
  let retrievalHits = 0;
  let phraseHits = 0;

  for (const test of testCases) {
    console.log(`Q: ${test.question}`);
    const result = await askDocs(test.question);

    // Check retrieval: did we find the expected source files?
    const retrievedFiles = result.sources.map(s => s.file);
    const foundExpected = test.expectedSources.some(f => retrievedFiles.includes(f));
    if (foundExpected) retrievalHits++;

    // TODO: Check answer quality: does the answer contain the expected
    // key phrases? Loop through test.expectedKeyPhrases and check if
    // result.answer.toLowerCase() includes each one. Track the hit rate.
    const answerLower = result.answer.toLowerCase();
    const phraseFound = test.expectedKeyPhrases.some(p => answerLower.includes(p.toLowerCase()));
    if (phraseFound) phraseHits++;

    console.log(`  Retrieval: ${foundExpected ? 'PASS' : 'FAIL'} | Answer quality: ${phraseFound ? 'PASS' : 'FAIL'}`);
    console.log(`  Sources: ${retrievedFiles.join(', ')}`);
    console.log(`  Answer: ${result.answer.slice(0, 150)}...\n`);

    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  // Summary
  console.log('--- Evaluation Summary ---');
  console.log(`Retrieval accuracy: ${retrievalHits}/${testCases.length} (${((retrievalHits / testCases.length) * 100).toFixed(0)}%)`);
  console.log(`Answer relevance:   ${phraseHits}/${testCases.length} (${((phraseHits / testCases.length) * 100).toFixed(0)}%)`);
}

evaluate().catch(console.error);
```

### Step 7: Run Everything

```bash
# Ingest your documentation
node src/ingest.js --dry-run     # Preview chunks
node src/ingest.js               # Ingest for real

# Test interactively
node src/cli.js

# Run the evaluation
node eval/evaluate.js
```

---

## Stretch Goals

1. **Add an LLM reranker**: After hybrid search returns results, pass them through an LLM call that reranks the chunks by relevance to the question before using them as context. Compare the answer quality before and after reranking by running your evaluation script both ways.

2. **Implement query expansion**: Before searching, use an LLM to generate 2-3 alternative phrasings of the question. Embed all of them, search with each, and merge the results. This catches relevant docs that the original phrasing might miss.

3. **Build a web UI with streaming**: Create an `index.html` with a chat-style interface that streams the answer token by token using Server-Sent Events (SSE). Show source citations as clickable cards below the answer.

4. **Rebuild with LlamaIndex or LangChain**: Take your from-scratch pipeline and rebuild the ingestion + query steps using LlamaIndex (`VectorStoreIndex.from_documents()` + `query_engine.query()`) or LangChain (`RetrievalQA` chain or LCEL). Keep your evaluation script and run it against both implementations. Compare: code complexity, answer quality, and how easy it is to swap chunking strategies or add reranking. Document which approach you'd pick for a production app and why.

---

## Submission Checklist

Your project is complete when you can check off every item:

- [ ] `docs/` folder contains at least 10 markdown files from a real documentation set
- [ ] `src/chunker.js` splits markdown at heading boundaries with overlap for long sections
- [ ] `src/ingest.js` successfully embeds and stores all chunks (with `--dry-run` support)
- [ ] The `docs` table in Supabase has both a vector index (HNSW) and a full-text search index (GIN)
- [ ] `hybrid_search` SQL function combines keyword and semantic scores with configurable weights
- [ ] `src/rag.js` retrieves context, builds an augmented prompt, and generates answers with source citations
- [ ] `src/cli.js` lets you ask questions interactively and shows answers with numbered source citations
- [ ] Answers include `[1]`, `[2]` style citations that map to real source files
- [ ] `eval/evaluate.js` runs at least 7 test cases and reports retrieval accuracy and answer relevance percentages
- [ ] You can demonstrate that hybrid search finds results that pure keyword search would miss

---
title: "Generating Embeddings with the OpenAI API"
estimatedMinutes: 60
---

## Generating Embeddings with the OpenAI API

In the last lesson, you learned what embeddings are conceptually. Now you'll generate them for real. We'll use the OpenAI embeddings API (the most widely used), store the resulting vectors, and compare them using cosine similarity to find similar content.

By the end of this lesson, you'll have working code that turns text into embeddings and measures semantic similarity between any two pieces of text.

---

## The OpenAI Embeddings API

The embeddings API is one of the simplest APIs in the AI ecosystem. You send text, you get back a vector. No prompt engineering, no system messages, no temperature settings.

### TypeScript

```typescript
// utils/embeddings.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Server-side only
});

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}

// Generate embeddings for multiple texts at once (batch)
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts, // The API accepts an array
  });

  // Sort by index to maintain order
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}
```

### Python

```python
# utils/embeddings.py
from openai import OpenAI

client = OpenAI()  # Uses OPENAI_API_KEY env var

def generate_embedding(text: str) -> list[float]:
    """Generate an embedding for a single text."""
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding

def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for multiple texts in a single API call."""
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=texts,
    )
    # Sort by index to maintain order
    sorted_data = sorted(response.data, key=lambda x: x.index)
    return [item.embedding for item in sorted_data]
```

### API Response Structure

```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "index": 0,
      "embedding": [0.0023064255, -0.009327292, 0.015797347, ...]
    }
  ],
  "model": "text-embedding-3-small",
  "usage": {
    "prompt_tokens": 8,
    "total_tokens": 8
  }
}
```

Key fields:
- `data[].embedding`: The vector (1536 numbers for text-embedding-3-small)
- `data[].index`: The position in your input array (important for batch requests)
- `usage.total_tokens`: How many tokens were consumed (for cost tracking)

---

## Model Selection

OpenAI offers two embedding models. Here's how to choose:

| Feature | text-embedding-3-small | text-embedding-3-large |
|---------|----------------------|----------------------|
| Dimensions | 1536 | 3072 |
| Max input tokens | 8191 | 8191 |
| Price per 1M tokens | $0.02 | $0.13 |
| Quality (MTEB benchmark) | Good | Best |
| Storage per vector | ~6 KB | ~12 KB |

**Use `text-embedding-3-small`** unless you're building something where quality differences matter measurably (e.g., a production search engine with millions of documents). For most applications -- prototyping, learning, small-to-medium datasets -- the small model is more than adequate.

### Dimension Reduction

Both models support optional dimension reduction. You can request fewer dimensions at the cost of some quality:

```typescript
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: text,
  dimensions: 512, // Reduce from 1536 to 512
});
```

This is useful when storage or computation speed is a concern. A 512-dimension embedding takes 1/3 the storage of a 1536-dimension one, with only a small quality decrease.

---

## Preprocessing Text for Better Embeddings

The quality of your embeddings depends heavily on what text you feed in. Here are practical guidelines.

### 1. Clean the Text

Remove noise that doesn't carry meaning:

```typescript
// utils/preprocess.ts

export function preprocessForEmbedding(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove HTML tags if present
    .replace(/<[^>]*>/g, '')
    // Trim
    .trim();
}
```

### 2. Chunk Long Documents

The model has an 8191-token limit (~32,000 characters of English text). For longer documents, split them into meaningful chunks:

```typescript
// utils/chunker.ts

interface TextChunk {
  text: string;
  metadata: {
    startIndex: number;
    endIndex: number;
    chunkIndex: number;
  };
}

export function chunkText(
  text: string,
  maxChunkSize = 1000, // characters
  overlap = 200         // overlap between chunks for context continuity
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < text.length) {
    let end = start + maxChunkSize;

    // Try to break at a paragraph or sentence boundary
    if (end < text.length) {
      // Look for paragraph break
      const paragraphBreak = text.lastIndexOf('\n\n', end);
      if (paragraphBreak > start + maxChunkSize * 0.5) {
        end = paragraphBreak;
      } else {
        // Look for sentence break
        const sentenceBreak = text.lastIndexOf('. ', end);
        if (sentenceBreak > start + maxChunkSize * 0.5) {
          end = sentenceBreak + 1; // Include the period
        }
      }
    } else {
      end = text.length;
    }

    chunks.push({
      text: text.slice(start, end).trim(),
      metadata: {
        startIndex: start,
        endIndex: end,
        chunkIndex,
      },
    });

    // Move start forward, with overlap
    start = end - overlap;
    if (start >= text.length) break;
    chunkIndex++;
  }

  return chunks;
}
```

```python
# utils/chunker.py

def chunk_text(
    text: str,
    max_chunk_size: int = 1000,
    overlap: int = 200
) -> list[dict]:
    """Split text into overlapping chunks at natural boundaries."""
    chunks = []
    start = 0
    chunk_index = 0

    while start < len(text):
        end = start + max_chunk_size

        if end < len(text):
            # Try paragraph break first
            para_break = text.rfind("\n\n", start + max_chunk_size // 2, end)
            if para_break != -1:
                end = para_break
            else:
                # Try sentence break
                sent_break = text.rfind(". ", start + max_chunk_size // 2, end)
                if sent_break != -1:
                    end = sent_break + 1
        else:
            end = len(text)

        chunks.append({
            "text": text[start:end].strip(),
            "metadata": {
                "start_index": start,
                "end_index": end,
                "chunk_index": chunk_index,
            },
        })

        start = end - overlap
        if start >= len(text):
            break
        chunk_index += 1

    return chunks
```

### Why Overlap?

Without overlap, a concept that spans a chunk boundary gets split across two embeddings, and neither captures it fully:

```
Chunk 1: "...React's useEffect hook runs after every render."
Chunk 2: "It accepts a dependency array that controls when..."
```

With 200-character overlap, Chunk 2 starts with the end of Chunk 1, preserving context:

```
Chunk 2: "...runs after every render. It accepts a dependency array that controls when..."
```

---

## Storing Embeddings

Once you generate embeddings, you need to store them. There are several options depending on your scale.

### Option 1: In-Memory (Prototyping)

For small datasets (under ~10,000 items), store embeddings in memory:

```typescript
// stores/embedding-store.ts

interface StoredItem {
  id: string;
  text: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

export class InMemoryEmbeddingStore {
  private items: StoredItem[] = [];

  add(item: StoredItem): void {
    this.items.push(item);
  }

  addBatch(items: StoredItem[]): void {
    this.items.push(...items);
  }

  search(
    queryEmbedding: number[],
    topK = 5
  ): Array<StoredItem & { score: number }> {
    const scored = this.items.map((item) => ({
      ...item,
      score: cosineSimilarity(queryEmbedding, item.embedding),
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  get size(): number {
    return this.items.length;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
```

### Option 2: JSON File (Small Projects)

Persist embeddings to disk as JSON:

```typescript
// stores/file-store.ts
import { readFile, writeFile } from 'fs/promises';

interface EmbeddingRecord {
  id: string;
  text: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  createdAt: string;
}

export class FileEmbeddingStore {
  private filePath: string;
  private records: EmbeddingRecord[] = [];

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async load(): Promise<void> {
    try {
      const data = await readFile(this.filePath, 'utf-8');
      this.records = JSON.parse(data);
    } catch {
      this.records = [];
    }
  }

  async save(): Promise<void> {
    await writeFile(
      this.filePath,
      JSON.stringify(this.records, null, 2)
    );
  }

  async add(record: EmbeddingRecord): Promise<void> {
    this.records.push(record);
    await this.save();
  }

  search(queryEmbedding: number[], topK = 5) {
    return this.records
      .map((record) => ({
        ...record,
        score: cosineSimilarity(queryEmbedding, record.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
```

### Option 3: SQLite with a Vector Extension

For medium-sized projects, SQLite with the `sqlite-vss` extension gives you persistence without a separate database server:

```python
# stores/sqlite_store.py
import sqlite3
import json
import numpy as np

class SQLiteEmbeddingStore:
    def __init__(self, db_path: str):
        self.conn = sqlite3.connect(db_path)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS embeddings (
                id TEXT PRIMARY KEY,
                text TEXT NOT NULL,
                embedding TEXT NOT NULL,
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.conn.commit()

    def add(self, id: str, text: str, embedding: list[float],
            metadata: dict = None):
        self.conn.execute(
            "INSERT OR REPLACE INTO embeddings (id, text, embedding, metadata) "
            "VALUES (?, ?, ?, ?)",
            (id, text, json.dumps(embedding), json.dumps(metadata or {}))
        )
        self.conn.commit()

    def search(self, query_embedding: list[float], top_k: int = 5):
        query_arr = np.array(query_embedding)
        rows = self.conn.execute(
            "SELECT id, text, embedding, metadata FROM embeddings"
        ).fetchall()

        results = []
        for row in rows:
            emb = np.array(json.loads(row[2]))
            score = float(np.dot(query_arr, emb) /
                         (np.linalg.norm(query_arr) * np.linalg.norm(emb)))
            results.append({
                "id": row[0],
                "text": row[1],
                "metadata": json.loads(row[3]),
                "score": score,
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]
```

We'll cover production-grade vector databases (pgvector, Pinecone) in the next lesson.

---

## Batch Processing: Embedding Many Documents

When you have a lot of documents to embed, the batch API is your friend. Send up to 2048 texts in a single request:

```typescript
// scripts/embed-documents.ts

import { generateEmbeddings } from '@/utils/embeddings';
import { chunkText } from '@/utils/chunker';
import { InMemoryEmbeddingStore } from '@/stores/embedding-store';

interface Document {
  id: string;
  title: string;
  content: string;
}

export async function embedDocuments(
  documents: Document[],
  store: InMemoryEmbeddingStore,
  batchSize = 100
): Promise<void> {
  // 1. Chunk all documents
  const allChunks: Array<{
    docId: string;
    chunkIndex: number;
    text: string;
  }> = [];

  for (const doc of documents) {
    const chunks = chunkText(doc.content);
    for (const chunk of chunks) {
      allChunks.push({
        docId: doc.id,
        chunkIndex: chunk.metadata.chunkIndex,
        // Prepend the title for context
        text: `${doc.title}\n\n${chunk.text}`,
      });
    }
  }

  console.log(`Processing ${allChunks.length} chunks from ${documents.length} documents`);

  // 2. Process in batches
  for (let i = 0; i < allChunks.length; i += batchSize) {
    const batch = allChunks.slice(i, i + batchSize);
    const texts = batch.map((c) => c.text);

    console.log(
      `Embedding batch ${Math.floor(i / batchSize) + 1}` +
      ` of ${Math.ceil(allChunks.length / batchSize)}`
    );

    const embeddings = await generateEmbeddings(texts);

    // 3. Store each embedding with metadata
    for (let j = 0; j < batch.length; j++) {
      store.add({
        id: `${batch[j].docId}-chunk-${batch[j].chunkIndex}`,
        text: batch[j].text,
        embedding: embeddings[j],
        metadata: {
          docId: batch[j].docId,
          chunkIndex: batch[j].chunkIndex,
        },
      });
    }

    // Respect rate limits (3000 RPM for most tiers)
    if (i + batchSize < allChunks.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  console.log(`Done. ${store.size} embeddings stored.`);
}
```

---

## Comparing Embeddings: A Practical Example

Let's build a small script that demonstrates semantic similarity:

```typescript
// scripts/demo-similarity.ts

import { generateEmbeddings } from '@/utils/embeddings';

async function main() {
  const texts = [
    "How do I reset my password?",
    "I forgot my login credentials and need to recover my account",
    "What is your refund policy?",
    "Can I get my money back if I'm not satisfied?",
    "The weather in New York is nice today",
  ];

  console.log('Generating embeddings for 5 texts...\n');
  const embeddings = await generateEmbeddings(texts);

  // Compare every pair
  console.log('Similarity Matrix:');
  console.log('─'.repeat(60));

  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const score = cosineSimilarity(embeddings[i], embeddings[j]);
      const bar = '█'.repeat(Math.round(score * 20));
      console.log(
        `[${score.toFixed(3)}] ${bar}\n` +
        `  "${texts[i].slice(0, 50)}"\n` +
        `  "${texts[j].slice(0, 50)}"\n`
      );
    }
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

main().catch(console.error);
```

Expected output:

```
Similarity Matrix:
────────────────────────────────────────────────────────────
[0.893] █████████████████
  "How do I reset my password?"
  "I forgot my login credentials and need to recover m"

[0.312] ██████
  "How do I reset my password?"
  "What is your refund policy?"

[0.188] ███
  "How do I reset my password?"
  "The weather in New York is nice today"

[0.847] ████████████████
  "What is your refund policy?"
  "Can I get my money back if I'm not satisfied?"

[0.142] ██
  "What is your refund policy?"
  "The weather in New York is nice today"
```

The password-related sentences score 0.893 (very similar). The refund-related sentences score 0.847. The weather sentence is far from everything else. This is exactly the behavior we want.

---

## Cost Management

Embeddings are cheap but not free. Track your usage:

```typescript
// utils/cost-tracker.ts

const EMBEDDING_COSTS: Record<string, number> = {
  'text-embedding-3-small': 0.02 / 1_000_000, // $0.02 per 1M tokens
  'text-embedding-3-large': 0.13 / 1_000_000, // $0.13 per 1M tokens
};

export function estimateEmbeddingCost(
  model: string,
  tokenCount: number
): number {
  const costPerToken = EMBEDDING_COSTS[model] || 0.02 / 1_000_000;
  return tokenCount * costPerToken;
}

// Quick estimate: 1 token ≈ 4 characters for English text
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
```

### Practical Cost Examples

| Scenario | Tokens | Cost (3-small) |
|----------|--------|----------------|
| 1,000 FAQ entries (~50 words each) | ~75,000 | $0.0015 |
| 10,000 blog posts (~500 words each) | ~1,250,000 | $0.025 |
| 100,000 support tickets (~100 words each) | ~2,500,000 | $0.05 |
| 1M product descriptions (~30 words each) | ~7,500,000 | $0.15 |

Embeddings are a one-time cost per document. You generate them once and store them. You only re-embed when the content changes. The per-query cost is also tiny (one API call per search query).

---

## Common Mistakes

### 1. Embedding HTML Instead of Plain Text

```typescript
// BAD: HTML tags waste tokens and pollute the embedding
const embedding = await generateEmbedding(
  '<div class="article"><h1>React Hooks</h1><p>Learn about...</p></div>'
);

// GOOD: Clean text
const embedding = await generateEmbedding(
  'React Hooks\n\nLearn about...'
);
```

### 2. Not Including Context in Chunks

```typescript
// BAD: Chunk loses context about what document it's from
const embedding = await generateEmbedding(
  'The deadline is March 15th and all submissions must be in PDF format.'
);

// GOOD: Include document context
const embedding = await generateEmbedding(
  'Conference Paper Submission Guidelines\n\n' +
  'The deadline is March 15th and all submissions must be in PDF format.'
);
```

### 3. Embedding Too-Short Text

Very short texts produce less meaningful embeddings. If your content is just 2-3 words, consider concatenating related fields:

```typescript
// BAD: Too short for a meaningful embedding
const embedding = await generateEmbedding('React Hooks');

// GOOD: Combine title with description
const embedding = await generateEmbedding(
  'React Hooks: Use state and lifecycle features in function components ' +
  'without writing a class. Includes useState, useEffect, useContext, and more.'
);
```

---

## Key Takeaways

- **The OpenAI embeddings API is simple**: send text, get back a vector of numbers. No prompt engineering needed.
- **Batch requests** (up to 2048 texts) are more efficient and reduce API call overhead. Always batch when embedding multiple texts.
- **Preprocessing matters**: clean HTML, chunk long documents at natural boundaries, and include contextual information with each chunk.
- **Start with `text-embedding-3-small`**: it's cheap, fast, and good enough for most applications. Upgrade to large only if you measure a meaningful quality difference.
- **Store embeddings** in memory for prototyping, in JSON/SQLite for small projects, and in a vector database for production (next lesson).
- **Embeddings are a one-time cost** per document. Generate once, store, and search as many times as you want.

---

## Try It Yourself

1. **Starter exercise**: Generate embeddings for 5 sentences of your choice using the OpenAI API. Print the first 10 values of each embedding to see what the raw vectors look like.

2. **Intermediate exercise**: Build the similarity demo script. Choose 10 sentences spanning 3-4 topics (e.g., cooking, programming, sports). Generate embeddings and compute the full similarity matrix. Verify that sentences about the same topic have high similarity.

3. **Advanced exercise**: Implement the text chunker and use it to split a long article (find any article online) into overlapping chunks. Embed all chunks, then search for a specific concept from the article using a natural language query.

4. **Stretch goal**: Build a simple "find similar content" feature. Create a folder of 10-20 text files (blog posts, documentation pages, or articles). Write a script that embeds all of them, then accepts a search query from the command line and returns the top 3 most similar documents with their similarity scores.

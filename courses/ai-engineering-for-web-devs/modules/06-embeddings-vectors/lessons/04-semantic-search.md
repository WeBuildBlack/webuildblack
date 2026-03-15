---
title: "Building Semantic Search End-to-End"
estimatedMinutes: 60
---

## Building Semantic Search End-to-End

You've learned what embeddings are, how to generate them, and where to store them. Now it's time to build something real: a **semantic search feature** that lets users search your content by meaning, not just keywords.

We'll build the entire pipeline from scratch -- ingest documents, embed them, store them in a vector database, build the search API, and create the search UI. By the end of this lesson, you'll have a working semantic search feature that you could ship in a real product.

---

## What We're Building

A semantic search API and UI for a documentation site. The user types a natural language question, and we find the most relevant documentation pages -- even if they don't share any keywords with the query.

```
User types: "how do I handle errors in my API"

Results:
1. "Error Handling and Resilience Patterns" (0.91 similarity)
2. "Building Robust API Routes" (0.84 similarity)
3. "Debugging Production Issues" (0.78 similarity)
```

Compare this to keyword search, which would miss "Resilience Patterns" (no keyword match) and "Debugging Production Issues" (no keyword match).

---

## Step 1: Document Ingestion Pipeline

First, we need to process our source documents into chunks and embed them.

### The Ingestion Script

```typescript
// scripts/ingest-docs.ts
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Configuration
const DOCS_DIR = './docs';           // Directory containing markdown files
const CHUNK_SIZE = 800;              // Characters per chunk
const CHUNK_OVERLAP = 200;           // Overlap between chunks
const EMBEDDING_MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 50;               // Embeddings per API call

// Clients
const openai = new OpenAI();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DocumentChunk {
  id: string;
  title: string;
  content: string;
  sourceFile: string;
  chunkIndex: number;
  embedding?: number[];
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log(`[Ingest] Starting document ingestion${dryRun ? ' (DRY RUN)' : ''}`);
  console.log(`[Ingest] Reading documents from: ${DOCS_DIR}`);

  // 1. Read all markdown files
  const files = await readdir(DOCS_DIR);
  const mdFiles = files.filter(f => f.endsWith('.md'));
  console.log(`[Ingest] Found ${mdFiles.length} markdown files`);

  // 2. Chunk each file
  const allChunks: DocumentChunk[] = [];

  for (const file of mdFiles) {
    const content = await readFile(join(DOCS_DIR, file), 'utf-8');
    const title = extractTitle(content) || file.replace('.md', '');
    const chunks = chunkMarkdown(content, CHUNK_SIZE, CHUNK_OVERLAP);

    for (let i = 0; i < chunks.length; i++) {
      allChunks.push({
        id: `${file}-chunk-${i}`,
        title,
        content: chunks[i],
        sourceFile: file,
        chunkIndex: i,
      });
    }
  }

  console.log(`[Ingest] Created ${allChunks.length} chunks from ${mdFiles.length} files`);

  if (dryRun) {
    console.log('[Ingest] DRY RUN - showing first 3 chunks:');
    for (const chunk of allChunks.slice(0, 3)) {
      console.log(`  ${chunk.id}: "${chunk.content.slice(0, 80)}..."`);
    }
    return;
  }

  // 3. Generate embeddings in batches
  console.log('[Ingest] Generating embeddings...');
  let totalTokens = 0;

  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map(c => `${c.title}\n\n${c.content}`);

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
    });

    totalTokens += response.usage.total_tokens;

    for (let j = 0; j < batch.length; j++) {
      batch[j].embedding = response.data[j].embedding;
    }

    const progress = Math.min(i + BATCH_SIZE, allChunks.length);
    console.log(
      `[Ingest] Embedded ${progress}/${allChunks.length} chunks ` +
      `(${totalTokens.toLocaleString()} tokens used)`
    );

    // Rate limit courtesy
    if (i + BATCH_SIZE < allChunks.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // 4. Upsert into Supabase
  console.log('[Ingest] Storing in database...');

  const rows = allChunks.map(chunk => ({
    id: chunk.id,
    title: chunk.title,
    content: chunk.content,
    embedding: JSON.stringify(chunk.embedding),
    metadata: {
      sourceFile: chunk.sourceFile,
      chunkIndex: chunk.chunkIndex,
    },
  }));

  // Upsert in batches of 100
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await supabase.from('documents').upsert(batch);
    if (error) {
      console.error(`[Ingest] Error inserting batch: ${error.message}`);
      throw error;
    }
  }

  // 5. Summary
  const estimatedCost = (totalTokens / 1_000_000) * 0.02;
  console.log(`[Ingest] Complete!`);
  console.log(`[Ingest]   Files processed: ${mdFiles.length}`);
  console.log(`[Ingest]   Chunks created:  ${allChunks.length}`);
  console.log(`[Ingest]   Tokens used:     ${totalTokens.toLocaleString()}`);
  console.log(`[Ingest]   Estimated cost:  $${estimatedCost.toFixed(4)}`);
}

// --- Helper Functions ---

function extractTitle(markdown: string): string | null {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function chunkMarkdown(
  text: string,
  maxSize: number,
  overlap: number
): string[] {
  // Split by headings first (preserve heading with its content)
  const sections = text.split(/(?=^#{1,3}\s)/m);
  const chunks: string[] = [];

  for (const section of sections) {
    if (section.trim().length === 0) continue;

    if (section.length <= maxSize) {
      chunks.push(section.trim());
    } else {
      // Further split long sections by paragraphs
      let current = '';
      const paragraphs = section.split('\n\n');

      for (const para of paragraphs) {
        if ((current + '\n\n' + para).length > maxSize && current) {
          chunks.push(current.trim());
          // Start new chunk with overlap from the end of the previous
          const overlapText = current.slice(-overlap);
          current = overlapText + '\n\n' + para;
        } else {
          current = current ? current + '\n\n' + para : para;
        }
      }

      if (current.trim()) {
        chunks.push(current.trim());
      }
    }
  }

  return chunks;
}

main().catch(console.error);
```

### Python Ingestion Script

```python
# scripts/ingest_docs.py
import os
import sys
import json
from pathlib import Path
from openai import OpenAI
from supabase import create_client

DOCS_DIR = "./docs"
CHUNK_SIZE = 800
CHUNK_OVERLAP = 200
EMBEDDING_MODEL = "text-embedding-3-small"
BATCH_SIZE = 50

openai_client = OpenAI()
supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"]
)

def chunk_markdown(text: str, max_size: int, overlap: int) -> list[str]:
    """Split markdown into chunks at natural boundaries."""
    import re
    sections = re.split(r"(?=^#{1,3}\s)", text, flags=re.MULTILINE)
    chunks = []

    for section in sections:
        section = section.strip()
        if not section:
            continue

        if len(section) <= max_size:
            chunks.append(section)
        else:
            current = ""
            for para in section.split("\n\n"):
                if len(current) + len(para) + 2 > max_size and current:
                    chunks.append(current.strip())
                    overlap_text = current[-overlap:] if len(current) > overlap else current
                    current = overlap_text + "\n\n" + para
                else:
                    current = f"{current}\n\n{para}" if current else para

            if current.strip():
                chunks.append(current.strip())

    return chunks

def main():
    dry_run = "--dry-run" in sys.argv
    print(f"[Ingest] Starting{'(DRY RUN)' if dry_run else ''}")

    # Read markdown files
    docs_path = Path(DOCS_DIR)
    md_files = sorted(docs_path.glob("*.md"))
    print(f"[Ingest] Found {len(md_files)} files")

    # Chunk all files
    all_chunks = []
    for md_file in md_files:
        content = md_file.read_text()
        title_match = __import__("re").search(r"^#\s+(.+)$", content, __import__("re").MULTILINE)
        title = title_match.group(1) if title_match else md_file.stem

        chunks = chunk_markdown(content, CHUNK_SIZE, CHUNK_OVERLAP)
        for i, chunk in enumerate(chunks):
            all_chunks.append({
                "id": f"{md_file.name}-chunk-{i}",
                "title": title,
                "content": chunk,
                "source_file": md_file.name,
                "chunk_index": i,
            })

    print(f"[Ingest] Created {len(all_chunks)} chunks")

    if dry_run:
        for chunk in all_chunks[:3]:
            print(f"  {chunk['id']}: \"{chunk['content'][:80]}...\"")
        return

    # Generate embeddings
    total_tokens = 0
    for i in range(0, len(all_chunks), BATCH_SIZE):
        batch = all_chunks[i:i + BATCH_SIZE]
        texts = [f"{c['title']}\n\n{c['content']}" for c in batch]

        response = openai_client.embeddings.create(
            model=EMBEDDING_MODEL, input=texts
        )
        total_tokens += response.usage.total_tokens

        for j, item in enumerate(sorted(response.data, key=lambda x: x.index)):
            batch[j]["embedding"] = item.embedding

        print(f"[Ingest] Embedded {min(i + BATCH_SIZE, len(all_chunks))}/{len(all_chunks)}")

    # Store in Supabase
    rows = [
        {
            "id": c["id"],
            "title": c["title"],
            "content": c["content"],
            "embedding": c["embedding"],
            "metadata": {"sourceFile": c["source_file"], "chunkIndex": c["chunk_index"]},
        }
        for c in all_chunks
    ]

    for i in range(0, len(rows), 100):
        supabase.table("documents").upsert(rows[i:i + 100]).execute()

    cost = (total_tokens / 1_000_000) * 0.02
    print(f"[Ingest] Done! {len(all_chunks)} chunks, {total_tokens:,} tokens, ${cost:.4f}")

if __name__ == "__main__":
    main()
```

---

## Step 2: The Search API

Build an API route that takes a natural language query and returns relevant documents:

### TypeScript (Next.js)

```typescript
// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const openai = new OpenAI();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { query, topK = 5, threshold = 0.5 } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query string is required' },
        { status: 400 }
      );
    }

    // Cap query length
    const trimmedQuery = query.trim().slice(0, 1000);

    // 1. Embed the query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: trimmedQuery,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // 2. Search in pgvector
    const { data: results, error } = await supabase.rpc('match_documents', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: threshold,
      match_count: topK,
    });

    if (error) {
      console.error('Search error:', error);
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 500 }
      );
    }

    // 3. Group chunks by source document
    const grouped = groupByDocument(results);

    // 4. Return results
    return NextResponse.json({
      query: trimmedQuery,
      results: grouped,
      count: grouped.length,
      latencyMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Search route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface SearchResult {
  id: number;
  title: string;
  content: string;
  metadata: { sourceFile: string; chunkIndex: number };
  similarity: number;
}

function groupByDocument(results: SearchResult[]) {
  const groups = new Map<string, {
    title: string;
    sourceFile: string;
    bestScore: number;
    chunks: Array<{ content: string; chunkIndex: number; score: number }>;
  }>();

  for (const result of results) {
    const key = result.metadata.sourceFile;

    if (!groups.has(key)) {
      groups.set(key, {
        title: result.title,
        sourceFile: key,
        bestScore: result.similarity,
        chunks: [],
      });
    }

    const group = groups.get(key)!;
    group.bestScore = Math.max(group.bestScore, result.similarity);
    group.chunks.push({
      content: result.content,
      chunkIndex: result.metadata.chunkIndex,
      score: result.similarity,
    });
  }

  // Sort by best score, then sort chunks within each group
  return Array.from(groups.values())
    .sort((a, b) => b.bestScore - a.bestScore)
    .map(group => ({
      ...group,
      chunks: group.chunks.sort((a, b) => a.chunkIndex - b.chunkIndex),
    }));
}
```

### Python (FastAPI)

```python
# app/routers/search.py
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI
from supabase import create_client
import os
from collections import defaultdict

router = APIRouter()
openai_client = OpenAI()
supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"]
)

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5
    threshold: float = 0.5

@router.post("/api/search")
async def search(request: SearchRequest):
    start = time.time()

    query = request.query.strip()[:1000]
    if not query:
        raise HTTPException(400, "Query is required")

    # 1. Embed the query
    emb_response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=query,
    )
    query_embedding = emb_response.data[0].embedding

    # 2. Search pgvector
    result = supabase.rpc("match_documents", {
        "query_embedding": query_embedding,
        "match_threshold": request.threshold,
        "match_count": request.top_k,
    }).execute()

    # 3. Group by source document
    groups = defaultdict(lambda: {"chunks": [], "best_score": 0})
    for item in result.data:
        key = item["metadata"]["sourceFile"]
        groups[key]["title"] = item["title"]
        groups[key]["source_file"] = key
        groups[key]["best_score"] = max(groups[key]["best_score"], item["similarity"])
        groups[key]["chunks"].append({
            "content": item["content"],
            "chunk_index": item["metadata"]["chunkIndex"],
            "score": item["similarity"],
        })

    # Sort and format
    grouped = sorted(groups.values(), key=lambda x: x["best_score"], reverse=True)
    for g in grouped:
        g["chunks"].sort(key=lambda x: x["chunk_index"])

    return {
        "query": query,
        "results": grouped,
        "count": len(grouped),
        "latency_ms": round((time.time() - start) * 1000),
    }
```

---

## Step 3: The Search UI

Build a search interface that's fast, clear, and useful:

```tsx
// components/SemanticSearch.tsx
'use client';

import { useState, useCallback, useRef } from 'react';

interface SearchResult {
  title: string;
  sourceFile: string;
  bestScore: number;
  chunks: Array<{
    content: string;
    chunkIndex: number;
    score: number;
  }>;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  count: number;
  latencyMs: number;
}

export function SemanticSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, topK: 5, threshold: 0.5 }),
      });

      if (!response.ok) throw new Error('Search failed');

      const data: SearchResponse = await response.json();
      setResults(data);
    } catch (err) {
      setError('Search is temporarily unavailable. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search as user types
  function handleInputChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    search(query);
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Search Input */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search docs... try 'how do I handle errors'"
            className="w-full px-4 py-3 pl-10 rounded-xl border border-gray-300
              focus:outline-none focus:border-blue-500 focus:ring-1
              focus:ring-blue-500 text-lg"
            aria-label="Search documentation"
          />
          {/* Search icon */}
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5
              text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          {/* Loading spinner */}
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-blue-500
                border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-4
          text-red-700 text-sm" role="alert">
          {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            {results.count} result{results.count !== 1 ? 's' : ''} in{' '}
            {results.latencyMs}ms
          </p>

          {results.results.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">No matching documents found</p>
              <p className="text-sm mt-1">Try rephrasing your search</p>
            </div>
          ) : (
            <ul className="space-y-4" aria-label="Search results">
              {results.results.map((result, index) => (
                <SearchResultCard key={index} result={result} query={query} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function SearchResultCard({
  result,
  query,
}: {
  result: SearchResult;
  query: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const scorePercent = Math.round(result.bestScore * 100);

  return (
    <li className="border border-gray-200 rounded-xl p-4 hover:border-gray-300
      transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{result.title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{result.sourceFile}</p>
        </div>

        {/* Relevance score badge */}
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full
            ${scorePercent >= 80
              ? 'bg-green-100 text-green-700'
              : scorePercent >= 60
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-700'
            }`}
        >
          {scorePercent}% match
        </span>
      </div>

      {/* Preview of most relevant chunk */}
      <p className="text-sm text-gray-600 mt-2 line-clamp-3">
        {result.chunks[0]?.content}
      </p>

      {/* Expand to see all matching chunks */}
      {result.chunks.length > 1 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-blue-600 hover:text-blue-800 mt-2"
        >
          {expanded
            ? 'Show less'
            : `Show ${result.chunks.length - 1} more matching section${
                result.chunks.length > 2 ? 's' : ''
              }`}
        </button>
      )}

      {expanded && (
        <div className="mt-3 space-y-2 border-t pt-3">
          {result.chunks.slice(1).map((chunk, i) => (
            <div key={i} className="text-sm text-gray-600 pl-3 border-l-2
              border-gray-200">
              <p className="line-clamp-2">{chunk.content}</p>
              <span className="text-xs text-gray-400">
                {Math.round(chunk.score * 100)}% match
              </span>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}
```

---

## Step 4: Improving Search Quality

### Technique 1: Hybrid Search (Keyword + Semantic)

Combine traditional full-text search with semantic search for best results:

```sql
-- Add a full-text search column
ALTER TABLE documents ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || content)) STORED;
CREATE INDEX ON documents USING gin(fts);

-- Hybrid search function
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text TEXT,
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 5,
  keyword_weight FLOAT DEFAULT 0.3,
  semantic_weight FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  content TEXT,
  metadata JSONB,
  keyword_score FLOAT,
  semantic_score FLOAT,
  combined_score FLOAT
)
LANGUAGE sql STABLE
AS $$
  WITH keyword_results AS (
    SELECT
      id,
      ts_rank(fts, websearch_to_tsquery('english', query_text)) AS rank
    FROM documents
    WHERE fts @@ websearch_to_tsquery('english', query_text)
  ),
  semantic_results AS (
    SELECT
      id,
      1 - (embedding <=> query_embedding) AS similarity
    FROM documents
    ORDER BY embedding <=> query_embedding
    LIMIT match_count * 2
  )
  SELECT
    d.id,
    d.title,
    d.content,
    d.metadata,
    COALESCE(kr.rank, 0) AS keyword_score,
    COALESCE(sr.similarity, 0) AS semantic_score,
    (COALESCE(kr.rank, 0) * keyword_weight +
     COALESCE(sr.similarity, 0) * semantic_weight) AS combined_score
  FROM documents d
  LEFT JOIN keyword_results kr ON d.id = kr.id
  LEFT JOIN semantic_results sr ON d.id = sr.id
  WHERE kr.id IS NOT NULL OR sr.id IS NOT NULL
  ORDER BY combined_score DESC
  LIMIT match_count;
$$;
```

> **Note:** The weighted combination above is a simplified approach. Because `ts_rank` scores and cosine similarity scores are on different scales, the raw weighted sum can produce skewed results. For production hybrid search, use Reciprocal Rank Fusion (RRF) instead of weighted combination, since keyword and semantic scores are on different scales. See Module 07 for the RRF implementation.

### Technique 2: Query Expansion

Use an LLM to generate alternative phrasings of the search query, then embed all of them:

```typescript
// services/query-expansion.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function expandQuery(query: string): Promise<string[]> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `Generate 3 alternative phrasings of this search query. Return only the phrasings, one per line, no numbering or bullets.

Query: "${query}"`,
      },
    ],
  });

  const alternatives = response.content[0].text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  return [query, ...alternatives];
}
```

Then search with all expanded queries and merge results:

```typescript
async function expandedSearch(query: string, topK = 5) {
  const queries = await expandQuery(query);

  // Embed all queries
  const embeddings = await generateEmbeddings(queries);

  // Search with each embedding
  const allResults = [];
  for (const embedding of embeddings) {
    const results = await supabase.rpc('match_documents', {
      query_embedding: JSON.stringify(embedding),
      match_threshold: 0.4,
      match_count: topK,
    });
    allResults.push(...(results.data || []));
  }

  // Deduplicate and re-rank by best score
  const deduped = new Map();
  for (const result of allResults) {
    const existing = deduped.get(result.id);
    if (!existing || result.similarity > existing.similarity) {
      deduped.set(result.id, result);
    }
  }

  return Array.from(deduped.values())
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
```

### Technique 3: Re-ranking with an LLM

After getting initial results, use an LLM to re-rank them for relevance:

```typescript
// services/reranker.ts

export async function rerankResults(
  query: string,
  results: Array<{ title: string; content: string; score: number }>
): Promise<Array<{ title: string; content: string; score: number; rank: number }>> {
  const resultsText = results
    .map((r, i) => `[${i}] ${r.title}: ${r.content.slice(0, 200)}`)
    .join('\n\n');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `Given the search query "${query}", rank these documents by relevance. Return only the document numbers in order from most to least relevant, comma-separated.

Documents:
${resultsText}`,
      },
    ],
  });

  const ranking = response.content[0].text
    .match(/\d+/g)
    ?.map(Number) || [];

  return ranking
    .filter(i => i < results.length)
    .map((originalIndex, newRank) => ({
      ...results[originalIndex],
      rank: newRank + 1,
    }));
}
```

---

## Step 5: Keeping the Index Fresh

Documents change. You need to keep your embeddings in sync:

```typescript
// scripts/sync-docs.ts

import { createHash } from 'crypto';

async function syncDocuments() {
  const files = await readdir(DOCS_DIR);
  const mdFiles = files.filter(f => f.endsWith('.md'));

  // Get existing document hashes from the database
  const { data: existing } = await supabase
    .from('documents')
    .select('id, metadata')
    .order('id');

  const existingHashes = new Map(
    (existing || []).map(doc => [
      doc.metadata?.sourceFile,
      doc.metadata?.contentHash,
    ])
  );

  let updated = 0;
  let added = 0;

  for (const file of mdFiles) {
    const content = await readFile(join(DOCS_DIR, file), 'utf-8');
    const contentHash = createHash('md5').update(content).digest('hex');

    if (existingHashes.get(file) === contentHash) {
      // Document hasn't changed, skip
      continue;
    }

    if (existingHashes.has(file)) {
      // Document changed, delete old chunks
      await supabase
        .from('documents')
        .delete()
        .like('id', `${file}-chunk-%`);
      updated++;
    } else {
      added++;
    }

    // Re-process the document
    const title = extractTitle(content) || file.replace('.md', '');
    const chunks = chunkMarkdown(content, CHUNK_SIZE, CHUNK_OVERLAP);

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(`${title}\n\n${chunks[i]}`);

      await supabase.from('documents').upsert({
        id: `${file}-chunk-${i}`,
        title,
        content: chunks[i],
        embedding: JSON.stringify(embedding),
        metadata: {
          sourceFile: file,
          chunkIndex: i,
          contentHash,
        },
      });
    }
  }

  console.log(`[Sync] Added: ${added}, Updated: ${updated}, Unchanged: ${mdFiles.length - added - updated}`);
}
```

---

## Key Takeaways

- **Semantic search is a pipeline**: ingest (chunk + embed + store) then query (embed query + search + rank + display).
- **Chunk at natural boundaries** (headings, paragraphs) and include document titles with each chunk for context.
- **Hybrid search** (keyword + semantic) gives better results than either approach alone. Use weighted scoring to combine them.
- **Query expansion** and **LLM re-ranking** can significantly improve result quality at the cost of additional latency and API calls.
- **Keep your index fresh** by tracking content hashes and only re-embedding documents that have changed.
- **Group chunks by source document** in search results to give users a cleaner, more useful view.

---

## Try It Yourself

1. **Starter exercise**: Write the ingestion script that reads 5 markdown files, chunks them, generates embeddings, and stores them in Supabase. Use the `--dry-run` flag to preview chunks before storing.

2. **Intermediate exercise**: Build the search API route and test it with `curl`. Try queries that use different words than the source documents and verify that semantic search finds them.

3. **Advanced exercise**: Implement hybrid search by adding a full-text search column to your table. Compare results between keyword-only, semantic-only, and hybrid search for the same queries.

4. **Stretch goal**: Build the complete search UI with debounced search, result grouping, relevance scores, and expandable chunks. Add the sync script that detects changed documents and only re-embeds what's needed. Deploy the whole thing to Vercel + Supabase.

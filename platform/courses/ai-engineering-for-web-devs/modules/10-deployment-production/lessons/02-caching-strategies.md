---
title: "Caching Strategies for AI Applications"
estimatedMinutes: 75
---

## Introduction

Every time a user asks a question your AI app has already answered before, you are paying for the same work twice. Caching is the most underutilized cost-saving technique in AI applications, and it also makes your app faster.

Consider this: if 30% of your users ask variations of the same popular questions, caching those responses eliminates 30% of your LLM API costs overnight. For a $500/month AI bill, that is $150/month in savings -- and the user gets an instant response instead of waiting 2-3 seconds.

This lesson covers three caching strategies, from simplest to most sophisticated:

1. **Exact match caching** -- cache identical queries
2. **Semantic caching** -- cache queries that *mean* the same thing
3. **Response caching** -- cache at different layers of the stack

---

## Strategy 1: Exact Match Caching

The simplest approach: if a user asks the exact same question that someone else already asked, return the cached response.

### In-Memory Cache (Development)

```typescript
// src/lib/ai/cache.ts

interface CacheEntry {
  response: string;
  sources: any[];
  timestamp: number;
  ttl: number;
}

class LLMCache {
  private cache = new Map<string, CacheEntry>();
  private defaultTTL = 3600_000; // 1 hour in ms

  private makeKey(query: string, documentIds?: string[]): string {
    // Normalize the query for better cache hits
    const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');
    const docKey = documentIds?.sort().join(',') || 'all';
    return `${normalizedQuery}::${docKey}`;
  }

  get(query: string, documentIds?: string[]): CacheEntry | null {
    const key = this.makeKey(query, documentIds);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  set(
    query: string,
    response: string,
    sources: any[],
    documentIds?: string[],
    ttl?: number
  ): void {
    const key = this.makeKey(query, documentIds);
    this.cache.set(key, {
      response,
      sources,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });

    // Prevent unbounded memory growth
    if (this.cache.size > 10_000) {
      this.evictOldest();
    }
  }

  private evictOldest(): void {
    const entries = [...this.cache.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest 20%
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  stats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // You would track hits/misses to calculate this
    };
  }
}

export const llmCache = new LLMCache();
```

### Using the Cache in Your API Route

```typescript
// Updated /api/chat/route.ts (relevant section)

import { llmCache } from '@/lib/ai/cache';

// Inside the POST handler, before calling the LLM:
const cached = llmCache.get(message, documentIds);

if (cached) {
  console.log('Cache hit! Returning cached response.');

  // Save the cached response as a new message
  await supabase.from('messages').insert({
    conversation_id: activeConversationId,
    role: 'assistant',
    content: cached.response,
    sources: cached.sources,
  });

  // > **Important:** If your client uses the Vercel AI SDK's `useChat` hook,
  // > it expects a streaming response. For cached responses, create a
  // > synthetic stream:
  // >
  // > ```typescript
  // > if (cached) {
  // >   const stream = new ReadableStream({
  // >     start(controller) {
  // >       controller.enqueue(new TextEncoder().encode(cached.content));
  // >       controller.close();
  // >     },
  // >   });
  // >   return new Response(stream, { headers: { 'Content-Type': 'text/plain' } });
  // > }
  // > ```

  return NextResponse.json({
    response: cached.response,
    sources: cached.sources,
    cached: true,
  });
}

// ... (proceed with normal LLM call)

// After getting the response, cache it:
llmCache.set(message, fullResponse, context.sources, documentIds);
```

### Redis Cache (Production)

For production, use Redis or Vercel KV for persistent, shared caching across serverless function instances:

```typescript
// src/lib/ai/redis-cache.ts
import { kv } from '@vercel/kv';
import { createHash } from 'crypto';

const CACHE_PREFIX = 'llm:';
const DEFAULT_TTL = 3600; // 1 hour in seconds

function hashKey(query: string, documentIds?: string[]): string {
  const input = `${query.toLowerCase().trim()}::${documentIds?.sort().join(',') || 'all'}`;
  return CACHE_PREFIX + createHash('sha256').update(input).digest('hex').substring(0, 16);
}

export async function getCachedResponse(
  query: string,
  documentIds?: string[]
): Promise<{ response: string; sources: any[] } | null> {
  const key = hashKey(query, documentIds);

  try {
    const cached = await kv.get<{ response: string; sources: any[] }>(key);
    return cached;
  } catch (error) {
    console.error('Cache read error:', error);
    return null; // Fail open -- cache miss is better than error
  }
}

export async function setCachedResponse(
  query: string,
  response: string,
  sources: any[],
  documentIds?: string[],
  ttl: number = DEFAULT_TTL
): Promise<void> {
  const key = hashKey(query, documentIds);

  try {
    await kv.set(key, { response, sources }, { ex: ttl });
  } catch (error) {
    console.error('Cache write error:', error);
    // Fail silently -- caching is an optimization, not a requirement
  }
}
```

### Python Redis Cache

```python
# redis_cache.py
import redis
import json
import hashlib
from typing import Optional

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

CACHE_PREFIX = "llm:"
DEFAULT_TTL = 3600  # 1 hour

def _hash_key(query: str, document_ids: list[str] | None = None) -> str:
    normalized = query.lower().strip()
    doc_key = ",".join(sorted(document_ids)) if document_ids else "all"
    raw = f"{normalized}::{doc_key}"
    return CACHE_PREFIX + hashlib.sha256(raw.encode()).hexdigest()[:16]

def get_cached(query: str, document_ids: list[str] | None = None) -> Optional[dict]:
    key = _hash_key(query, document_ids)
    cached = r.get(key)
    if cached:
        return json.loads(cached)
    return None

def set_cached(
    query: str,
    response: str,
    sources: list[dict],
    document_ids: list[str] | None = None,
    ttl: int = DEFAULT_TTL
):
    key = _hash_key(query, document_ids)
    r.setex(key, ttl, json.dumps({"response": response, "sources": sources}))

# Usage
cached = get_cached("What is machine learning?")
if cached:
    print(f"Cache hit: {cached['response'][:100]}...")
else:
    # Call LLM, then cache the result
    response = call_llm("What is machine learning?")
    set_cached("What is machine learning?", response, sources=[])
```

---

## Strategy 2: Semantic Caching

Exact match caching misses near-identical questions like:
- "What is machine learning?" vs "what is ML?"
- "Explain RAG" vs "What does RAG mean?"

Semantic caching uses embeddings to match *meaning*, not just text.

### How Semantic Caching Works

```
1. User asks: "What does RAG mean?"
2. Generate embedding for the question
3. Search the cache for embeddings within threshold (e.g., cosine similarity > 0.95)
4. If found: return the cached response
5. If not found: call the LLM, cache the response with its embedding
```

### Implementation

```typescript
// src/lib/ai/semantic-cache.ts
import { generateEmbedding } from './embeddings';
import { createServiceClient } from '@/lib/supabase/server';

interface SemanticCacheEntry {
  query: string;
  response: string;
  sources: any[];
  embedding: number[];
}

const SIMILARITY_THRESHOLD = 0.95; // Very high -- only match near-identical questions

export async function semanticCacheGet(
  query: string,
  documentIds?: string[]
): Promise<{ response: string; sources: any[] } | null> {
  const supabase = createServiceClient();

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // Search the cache table for similar queries
  const { data: matches, error } = await supabase.rpc('match_cache_entries', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: SIMILARITY_THRESHOLD,
    match_count: 1,
  });

  if (error || !matches || matches.length === 0) {
    return null;
  }

  const match = matches[0];
  console.log(
    `Semantic cache hit! Similarity: ${(match.similarity * 100).toFixed(1)}% ` +
    `Original: "${match.query}" -> Current: "${query}"`
  );

  return {
    response: match.response,
    sources: match.sources,
  };
}

export async function semanticCacheSet(
  query: string,
  response: string,
  sources: any[],
  documentIds?: string[]
): Promise<void> {
  const supabase = createServiceClient();
  const queryEmbedding = await generateEmbedding(query);

  await supabase.from('response_cache').insert({
    query,
    response,
    sources,
    embedding: JSON.stringify(queryEmbedding),
    document_ids: documentIds || [],
    created_at: new Date().toISOString(),
  });
}
```

> **Cache Scoping:** If users have different documents, scope your cache key to include the `userId`. Otherwise, one user could receive cached responses based on another user's documents.

### The Cache Database Table

```sql
-- Create the response cache table
CREATE TABLE response_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  sources JSONB DEFAULT '[]',
  embedding VECTOR(1536),
  document_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX idx_cache_embedding ON response_cache
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- Search function for semantic cache
CREATE OR REPLACE FUNCTION match_cache_entries(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.95,
  match_count INT DEFAULT 1
)
RETURNS TABLE (
  query TEXT,
  response TEXT,
  sources JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.query,
    rc.response,
    rc.sources,
    1 - (rc.embedding <=> query_embedding) AS similarity
  FROM response_cache rc
  WHERE
    1 - (rc.embedding <=> query_embedding) > match_threshold
    AND rc.expires_at > NOW()
  ORDER BY rc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Clean up expired entries (run daily)
CREATE OR REPLACE FUNCTION clean_cache()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM response_cache WHERE expires_at < NOW();
$$;
```

### Cost-Benefit Analysis of Semantic Caching

Semantic caching has a cost: generating an embedding for every query (~$0.000002 per query). But if 30% of queries are semantic duplicates:

```
Without caching (1000 queries/day, GPT-4o-mini):
  Total cost: 1000 * ~$0.001 = ~$1.00/day
  (costs vary based on your prompt size and model -- check your actual usage)

With semantic caching (30% hit rate):
  Cache misses: 700 * ~$0.001 = ~$0.70/day
  Cache embedding cost: 1000 * $0.000002 = $0.002/day
  Total: ~$0.702/day

Savings: ~$0.298/day = ~$8.94/month
```

For GPT-4o workloads, the savings are 15x larger. The embedding cost is negligible.

---

## Strategy 3: Multi-Layer Caching

In a production AI app, you want caching at multiple levels:

```
Request arrives
       |
  [1] HTTP Cache (CDN/edge) -- cache entire responses for public queries
       |
  [2] Application Cache (Redis/KV) -- exact match on normalized queries
       |
  [3] Semantic Cache (pgvector) -- meaning-based match
       |
  [4] LLM Call -- only if all caches miss
       |
  Cache the response at layers 2 and 3
```

### Implementing Multi-Layer Cache

```typescript
// src/lib/ai/multi-cache.ts
import { getCachedResponse, setCachedResponse } from './redis-cache';
import { semanticCacheGet, semanticCacheSet } from './semantic-cache';

interface CacheResult {
  response: string;
  sources: any[];
  cacheLayer: 'exact' | 'semantic' | 'none';
}

export async function multiLayerCacheGet(
  query: string,
  documentIds?: string[]
): Promise<CacheResult> {
  // Layer 1: Exact match (fast, cheap)
  const exactMatch = await getCachedResponse(query, documentIds);
  if (exactMatch) {
    return { ...exactMatch, cacheLayer: 'exact' };
  }

  // Layer 2: Semantic match (slower, costs an embedding)
  const semanticMatch = await semanticCacheGet(query, documentIds);
  if (semanticMatch) {
    // Also store as exact match for future identical queries
    await setCachedResponse(query, semanticMatch.response, semanticMatch.sources, documentIds);
    return { ...semanticMatch, cacheLayer: 'semantic' };
  }

  return { response: '', sources: [], cacheLayer: 'none' };
}

export async function multiLayerCacheSet(
  query: string,
  response: string,
  sources: any[],
  documentIds?: string[]
): Promise<void> {
  // Store in both layers
  await Promise.all([
    setCachedResponse(query, response, sources, documentIds),
    semanticCacheSet(query, response, sources, documentIds),
  ]);
}
```

---

## When Caching Makes Sense (And When It Does Not)

### Good Candidates for Caching

| Scenario | Why |
|----------|-----|
| FAQ-style questions | High repetition, stable answers |
| Document summaries | Same document = same summary |
| Classification tasks | Limited output space |
| Data extraction | Same input = same output |
| Popular search queries | Many users ask similar things |

### Bad Candidates for Caching

| Scenario | Why |
|----------|-----|
| Creative writing | Users expect unique outputs |
| Personalized responses | Context varies per user |
| Time-sensitive queries | "What happened today?" |
| Multi-turn conversations | Context changes every turn |
| Low-repetition workloads | Cache hit rate too low to justify |

### Cache Invalidation

The hardest problem in computer science. When a user uploads a new document, cached responses about that topic might be stale:

```typescript
// Invalidate cache when documents change
export async function invalidateCacheForDocument(documentId: string): Promise<void> {
  const supabase = createServiceClient();

  // Delete semantic cache entries that reference this document
  await supabase
    .from('response_cache')
    .delete()
    .contains('document_ids', [documentId]);

  // For Redis exact-match cache, you would need to track
  // which cache keys reference which documents
  console.log(`Cache invalidated for document: ${documentId}`);
}
```

---

## Measuring Cache Effectiveness

Track cache hits, misses, and savings:

```typescript
// src/lib/ai/cache-metrics.ts

interface CacheMetrics {
  hits: number;
  misses: number;
  semanticHits: number;
  exactHits: number;
  estimatedSavings: number; // in cents
}

const metrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  semanticHits: 0,
  exactHits: 0,
  estimatedSavings: 0,
};

const AVG_COST_PER_REQUEST_CENTS = 0.03; // GPT-4o-mini average

export function recordCacheResult(layer: 'exact' | 'semantic' | 'none'): void {
  if (layer === 'none') {
    metrics.misses++;
  } else {
    metrics.hits++;
    metrics.estimatedSavings += AVG_COST_PER_REQUEST_CENTS;
    if (layer === 'exact') metrics.exactHits++;
    if (layer === 'semantic') metrics.semanticHits++;
  }
}

export function getCacheMetrics(): CacheMetrics & { hitRate: number } {
  const total = metrics.hits + metrics.misses;
  return {
    ...metrics,
    hitRate: total > 0 ? metrics.hits / total : 0,
  };
}
```

---

## Key Takeaways

- **Exact match caching** is simple, fast, and free. Start here. Even a basic in-memory cache saves money.
- **Semantic caching** catches near-duplicate questions by comparing embedding similarity. The cost of one embedding per query is negligible compared to the LLM cost you avoid.
- **Multi-layer caching** (exact match first, then semantic) gives you the best of both worlds: speed for exact matches and intelligence for paraphrased questions.
- **Cache invalidation** matters. When the underlying data changes, stale cached responses can mislead users. Invalidate cache entries when documents are updated or deleted.
- **Measure everything**. Track hit rates, savings, and cache layer effectiveness so you know your caching strategy is actually working.
- Caching works best for **high-repetition, stable-answer workloads** like FAQs, document summaries, and classification. It works poorly for creative or personalized tasks.

---

## Try It Yourself

1. **Add exact match caching**: Implement the in-memory `LLMCache` in your BrainBase app. Ask the same question twice and verify the second response is instant (and free).

2. **Measure your hit rate**: Add cache metrics tracking and use your app normally for 30 minutes. What percentage of your queries are cache hits? Is it worth it?

3. **Implement semantic caching**: Add the `response_cache` table to Supabase and implement semantic cache lookup. Test with paraphrased questions: "What is RAG?" vs "Explain retrieval augmented generation" -- does the cache catch it?

4. **Test cache invalidation**: Upload a new document, ask a question about it, then delete the document. Is the cached response properly invalidated?

5. **Compare Redis vs. in-memory**: If you have access to Vercel KV or Redis, implement the Redis cache and compare performance. When does an external cache make more sense than an in-memory one? (Hint: think about serverless cold starts and multiple function instances.)

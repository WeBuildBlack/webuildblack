---
title: "Vector Databases: pgvector and Pinecone"
estimatedMinutes: 60
---

## Vector Databases: pgvector and Pinecone

In the last lesson, you stored embeddings in memory and searched them by computing cosine similarity against every single vector. That works for 1,000 items. It does not work for 1,000,000 items.

Vector databases solve this by building specialized indexes that make similarity search fast -- finding the most similar vectors out of millions in milliseconds instead of seconds. In this lesson, you'll learn two approaches: **pgvector** (an extension for PostgreSQL, great with Supabase) and **Pinecone** (a managed vector database service).

---

## Why You Need a Vector Database

Let's do the math on brute-force search:

```
1,000 vectors × 1536 dimensions = 1,536,000 multiply operations per query
→ ~1ms. Fine.

100,000 vectors × 1536 dimensions = 153,600,000 operations per query
→ ~100ms. Getting slow.

1,000,000 vectors × 1536 dimensions = 1,536,000,000 operations per query
→ ~1 second. Too slow for real-time search.

10,000,000 vectors = ~10 seconds per query
→ Completely unusable.
```

Vector databases use **approximate nearest neighbor (ANN)** algorithms that trade a tiny amount of accuracy for massive speed gains. Instead of comparing your query against every vector, they use index structures to narrow the search space.

---

## Option 1: pgvector with Supabase

**pgvector** is a PostgreSQL extension that adds vector data types and similarity search. If you're already using PostgreSQL (or Supabase), this is the easiest path -- no new infrastructure needed.

### Why pgvector + Supabase?

- **No separate database**: Vectors live alongside your regular data (users, posts, etc.)
- **SQL joins**: Query vectors and relational data in a single query
- **Supabase integration**: Supabase ships with pgvector enabled by default
- **Free tier**: Supabase's free tier includes pgvector support

### Setting Up the Table

```sql
-- Enable the pgvector extension (already enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a table for document embeddings
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),  -- 1536 dimensions for text-embedding-3-small
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index for fast similarity search
CREATE INDEX ON documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### Inserting Embeddings

#### TypeScript (Supabase Client)

```typescript
// services/document-store.ts
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '@/utils/embeddings';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service key for server-side operations
);

export async function addDocument(
  title: string,
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  // Generate embedding
  const embedding = await generateEmbedding(`${title}\n\n${content}`);

  // Insert into Supabase
  const { error } = await supabase
    .from('documents')
    .insert({
      title,
      content,
      embedding: JSON.stringify(embedding), // pgvector accepts JSON array format
      metadata,
    });

  if (error) throw new Error(`Insert failed: ${error.message}`);
}

// Batch insert for efficiency
export async function addDocuments(
  docs: Array<{ title: string; content: string; metadata?: Record<string, unknown> }>
): Promise<void> {
  // Generate all embeddings in batch
  const texts = docs.map(d => `${d.title}\n\n${d.content}`);
  const embeddings = await generateEmbeddings(texts);

  // Insert all at once
  const rows = docs.map((doc, i) => ({
    title: doc.title,
    content: doc.content,
    embedding: JSON.stringify(embeddings[i]),
    metadata: doc.metadata || {},
  }));

  const { error } = await supabase.from('documents').insert(rows);
  if (error) throw new Error(`Batch insert failed: ${error.message}`);
}
```

#### Python

```python
# services/document_store.py
from supabase import create_client
import os
from utils.embeddings import generate_embedding, generate_embeddings

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"]
)

def add_document(title: str, content: str, metadata: dict = None):
    """Add a single document with its embedding."""
    embedding = generate_embedding(f"{title}\n\n{content}")

    supabase.table("documents").insert({
        "title": title,
        "content": content,
        "embedding": embedding,  # Supabase Python client handles conversion
        "metadata": metadata or {},
    }).execute()

def add_documents(docs: list[dict]):
    """Add multiple documents with batch embedding generation."""
    texts = [f"{d['title']}\n\n{d['content']}" for d in docs]
    embeddings = generate_embeddings(texts)

    rows = [
        {
            "title": doc["title"],
            "content": doc["content"],
            "embedding": embeddings[i],
            "metadata": doc.get("metadata", {}),
        }
        for i, doc in enumerate(docs)
    ]

    supabase.table("documents").insert(rows).execute()
```

### Querying for Similar Documents

The magic happens here. Use a PostgreSQL function for similarity search:

```sql
-- Create a function for similarity search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    title,
    content,
    metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

The `<=>` operator computes cosine distance (not similarity). Cosine distance = 1 - cosine similarity. So we subtract from 1 to get similarity.

#### TypeScript Query

```typescript
// services/search.ts

export async function searchDocuments(
  query: string,
  topK = 5,
  threshold = 0.5
): Promise<Array<{
  id: number;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}>> {
  // Embed the query
  const queryEmbedding = await generateEmbedding(query);

  // Call the Supabase RPC function
  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: threshold,
    match_count: topK,
  });

  if (error) throw new Error(`Search failed: ${error.message}`);

  return data;
}
```

#### Python Query

```python
# services/search.py

def search_documents(query: str, top_k: int = 5, threshold: float = 0.5):
    """Search for documents similar to the query."""
    query_embedding = generate_embedding(query)

    result = supabase.rpc("match_documents", {
        "query_embedding": query_embedding,
        "match_threshold": threshold,
        "match_count": top_k,
    }).execute()

    return result.data
```

---

## Indexing Strategies: IVFFlat vs. HNSW

pgvector supports two index types. Choosing the right one matters.

### IVFFlat (Inverted File Flat)

```sql
CREATE INDEX ON documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

**How it works**: Divides vectors into clusters (Voronoi cells). At query time, it only searches the nearest clusters, not every vector.

**Parameters**:
- `lists`: Number of clusters. Rule of thumb: `rows / 1000` for up to 1M rows, `sqrt(rows)` for over 1M rows.

**Pros**:
- Faster to build than HNSW
- Uses less memory
- Good for datasets that don't change frequently

**Cons**:
- Must be rebuilt after large inserts for best accuracy
- Less accurate than HNSW for the same speed
- Requires `lists` tuning

**Best for**: Medium datasets (10K-1M) that are relatively static.

### HNSW (Hierarchical Navigable Small Worlds)

```sql
CREATE INDEX ON documents
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

**How it works**: Builds a multi-layer graph where each vector is connected to its nearest neighbors. At query time, it navigates the graph from a random entry point, moving closer to the target at each step.

**Parameters**:
- `m`: Maximum connections per node (default 16). Higher = more accurate, more memory.
- `ef_construction`: Build-time search breadth (default 64). Higher = slower build, more accurate.

**Pros**:
- Better recall (accuracy) than IVFFlat at the same speed
- No need to rebuild after inserts
- Works well for dynamic datasets

**Cons**:
- Slower to build initially
- Uses more memory (2-3x IVFFlat)
- Slower inserts

**Best for**: Production applications with frequent updates and high accuracy requirements.

### Which One Should You Use?

| Scenario | Recommendation |
|----------|---------------|
| Prototyping / < 10K vectors | No index needed (brute force is fine) |
| 10K - 100K vectors, mostly static | IVFFlat |
| 10K - 100K vectors, frequent updates | HNSW |
| 100K - 1M vectors | HNSW |
| > 1M vectors | Consider a dedicated vector DB (Pinecone) |

For most web applications, **HNSW is the default recommendation**. The accuracy advantage is significant, and modern hardware handles the memory overhead well.

---

## Option 2: Pinecone (Managed Vector Database)

Pinecone is a fully managed vector database service. You don't manage any infrastructure -- just create an index, insert vectors, and query.

### When to Choose Pinecone Over pgvector

- **Scale**: You have millions or billions of vectors
- **Operations**: You don't want to manage database infrastructure
- **Performance**: You need consistently low latency at scale
- **Team**: Your team doesn't have PostgreSQL expertise

### When to Stick with pgvector

- **Simplicity**: You're already using PostgreSQL/Supabase
- **Joins**: You need to query vectors alongside relational data
- **Cost**: pgvector is free; Pinecone's free tier is limited
- **Data locality**: You want all your data in one place

### Setting Up Pinecone

```typescript
// services/pinecone-store.ts
import { Pinecone } from '@pinecone-database/pinecone';
import { generateEmbedding, generateEmbeddings } from '@/utils/embeddings';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const index = pinecone.index('documents'); // Your index name

// Upsert documents
export async function upsertDocuments(
  docs: Array<{
    id: string;
    title: string;
    content: string;
    metadata?: Record<string, string>;
  }>
): Promise<void> {
  const texts = docs.map(d => `${d.title}\n\n${d.content}`);
  const embeddings = await generateEmbeddings(texts);

  const vectors = docs.map((doc, i) => ({
    id: doc.id,
    values: embeddings[i],
    metadata: {
      title: doc.title,
      content: doc.content.slice(0, 10000), // Pinecone metadata has size limits
      ...doc.metadata,
    },
  }));

  // Pinecone recommends batches of 100
  for (let i = 0; i < vectors.length; i += 100) {
    const batch = vectors.slice(i, i + 100);
    await index.upsert(batch);
  }
}

// Query for similar documents
export async function queryDocuments(
  query: string,
  topK = 5,
  filter?: Record<string, unknown>
): Promise<Array<{
  id: string;
  score: number;
  title: string;
  content: string;
}>> {
  const queryEmbedding = await generateEmbedding(query);

  const results = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
    filter, // Optional metadata filter
  });

  return results.matches.map((match) => ({
    id: match.id,
    score: match.score || 0,
    title: (match.metadata?.title as string) || '',
    content: (match.metadata?.content as string) || '',
  }));
}
```

```python
# services/pinecone_store.py
from pinecone import Pinecone
import os
from utils.embeddings import generate_embedding, generate_embeddings

pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
index = pc.Index("documents")

def upsert_documents(docs: list[dict]):
    """Upsert documents with their embeddings into Pinecone."""
    texts = [f"{d['title']}\n\n{d['content']}" for d in docs]
    embeddings = generate_embeddings(texts)

    vectors = [
        {
            "id": doc["id"],
            "values": embeddings[i],
            "metadata": {
                "title": doc["title"],
                "content": doc["content"][:10000],
                **(doc.get("metadata", {})),
            },
        }
        for i, doc in enumerate(docs)
    ]

    # Batch upsert (100 at a time)
    for i in range(0, len(vectors), 100):
        batch = vectors[i:i + 100]
        index.upsert(vectors=batch)

def query_documents(query: str, top_k: int = 5, filter: dict = None):
    """Query for similar documents."""
    query_embedding = generate_embedding(query)

    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True,
        filter=filter,
    )

    return [
        {
            "id": match.id,
            "score": match.score,
            "title": match.metadata.get("title", ""),
            "content": match.metadata.get("content", ""),
        }
        for match in results.matches
    ]
```

### Pinecone Metadata Filtering

Pinecone lets you filter results by metadata, which is powerful for scoped search:

```typescript
// Find similar documents, but only in a specific category
const results = await queryDocuments(
  'How to deploy a React app',
  5,
  {
    category: { $eq: 'tutorials' },
    language: { $in: ['javascript', 'typescript'] },
  }
);

// Find recent documents only
const results = await queryDocuments(
  'machine learning basics',
  5,
  {
    publishedYear: { $gte: 2024 },
  }
);
```

---

## Building an Embedding Pipeline

In production, you need a pipeline that keeps your vector index in sync with your data:

```typescript
// services/embedding-pipeline.ts

interface PipelineConfig {
  source: 'supabase' | 'api' | 'file';
  destination: 'pgvector' | 'pinecone';
  chunkSize: number;
  chunkOverlap: number;
  embeddingModel: string;
  batchSize: number;
}

export class EmbeddingPipeline {
  constructor(private config: PipelineConfig) {}

  async processDocument(doc: {
    id: string;
    title: string;
    content: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    console.log(`[Pipeline] Processing: ${doc.title}`);

    // 1. Chunk the content
    const chunks = chunkText(doc.content, this.config.chunkSize, this.config.chunkOverlap);
    console.log(`[Pipeline] Created ${chunks.length} chunks`);

    // 2. Prepare texts for embedding (include title for context)
    const texts = chunks.map(
      (chunk) => `${doc.title}\n\n${chunk.text}`
    );

    // 3. Generate embeddings in batches
    const embeddings: number[][] = [];
    for (let i = 0; i < texts.length; i += this.config.batchSize) {
      const batch = texts.slice(i, i + this.config.batchSize);
      const batchEmbeddings = await generateEmbeddings(batch);
      embeddings.push(...batchEmbeddings);

      // Rate limit courtesy
      if (i + this.config.batchSize < texts.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    // 4. Store vectors
    for (let i = 0; i < chunks.length; i++) {
      await this.storeVector({
        id: `${doc.id}-chunk-${i}`,
        embedding: embeddings[i],
        metadata: {
          documentId: doc.id,
          title: doc.title,
          chunkIndex: i,
          chunkText: chunks[i].text,
          ...doc.metadata,
        },
      });
    }

    console.log(`[Pipeline] Stored ${chunks.length} vectors for: ${doc.title}`);
  }

  private async storeVector(vector: {
    id: string;
    embedding: number[];
    metadata: Record<string, unknown>;
  }): Promise<void> {
    if (this.config.destination === 'pgvector') {
      // Store in Supabase/pgvector
      await supabase.from('documents').upsert({
        id: vector.id,
        content: vector.metadata.chunkText,
        embedding: JSON.stringify(vector.embedding),
        metadata: vector.metadata,  // Store as JSONB, don't spread
      });
    } else {
      // Store in Pinecone
      await index.upsert([{
        id: vector.id,
        values: vector.embedding,
        metadata: vector.metadata,
      }]);
    }
  }
}
```

---

## Performance Tuning

### pgvector Query Optimization

```sql
-- Increase the number of probes for IVFFlat (more accurate, slower)
SET ivfflat.probes = 10;  -- Default is 1

-- For HNSW, increase ef_search for more accuracy
SET hnsw.ef_search = 100;  -- Default is 40

-- Check index usage
EXPLAIN ANALYZE
SELECT *
FROM documents
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 5;
```

### Supabase-Specific Tips

```sql
-- Create a partial index for a specific category (faster queries)
CREATE INDEX ON documents
  USING hnsw (embedding vector_cosine_ops)
  WHERE metadata->>'category' = 'tutorials';

-- Use connection pooling for high-traffic applications
-- Supabase provides this via the pooler connection string
```

### Pinecone Performance Tips

```typescript
// Use namespaces to partition data (faster queries within a namespace)
const ns = index.namespace('tutorials');
await ns.upsert(vectors);
const results = await ns.query({ vector: queryEmbedding, topK: 5 });

// Delete old vectors to keep the index lean
await index.deleteMany({
  filter: { updatedAt: { $lt: '2025-01-01' } },
});
```

---

## Comparison Summary

| Feature | pgvector (Supabase) | Pinecone |
|---------|-------------------|----------|
| **Setup** | Enable extension, create table | Create account, create index |
| **Hosting** | Part of your PostgreSQL DB | Fully managed cloud service |
| **Free tier** | Supabase free (500MB) | 1 index, 100K vectors |
| **Max vectors** | Limited by disk/memory | Billions |
| **SQL joins** | Yes (huge advantage) | No |
| **Metadata filtering** | Via SQL WHERE clauses | Built-in filter syntax |
| **Index types** | IVFFlat, HNSW | Proprietary |
| **Latency (100K vectors)** | 10-50ms | 5-20ms |
| **Best for** | Apps already on PostgreSQL | Large-scale, dedicated vector search |

---

## Key Takeaways

- **Vector databases make similarity search fast** by using approximate nearest neighbor algorithms instead of brute-force comparison.
- **pgvector** is the best choice if you're already using PostgreSQL or Supabase. It keeps vectors alongside your relational data and supports SQL joins.
- **HNSW indexing** is generally preferred over IVFFlat for its better accuracy and support for dynamic data. Use IVFFlat only for large, mostly-static datasets.
- **Pinecone** is the right choice when you need to scale beyond what PostgreSQL can handle, or when you want fully managed infrastructure.
- **The embedding pipeline** (chunk, embed, store) is a pattern you'll use in every project that involves vector search. Build it once and reuse it.
- **Start with pgvector**, and only move to a dedicated vector database if you hit performance or scale limits.

---

## Try It Yourself

1. **Starter exercise**: Set up a Supabase project (free tier), enable pgvector, and create the `documents` table with a vector column. Insert 5 documents with hardcoded embeddings (you can use random numbers for now) and verify the table structure.

2. **Intermediate exercise**: Build the complete flow: create 10 documents (short blog post titles + descriptions), generate real embeddings via the OpenAI API, store them in pgvector, and query using the `match_documents` function. Verify that semantically similar documents are returned together.

3. **Advanced exercise**: Compare IVFFlat and HNSW indexes on the same data. Insert 1,000 documents (you can generate synthetic data), create both index types, and compare query speed and result quality using `EXPLAIN ANALYZE`.

4. **Stretch goal**: Set up a Pinecone free-tier account and replicate the same 10-document search using their SDK. Compare the developer experience and query results with the pgvector implementation. Which do you prefer for your use case?

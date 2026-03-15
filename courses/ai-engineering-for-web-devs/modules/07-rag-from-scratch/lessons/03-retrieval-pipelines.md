---
title: "Building a Retrieval Pipeline"
estimatedMinutes: 65
---

## Building a Retrieval Pipeline

You have your documents chunked, embedded, and stored in a vector database. Now comes the part that makes or breaks your RAG system: the **retrieval pipeline**. This is the engine that takes a user's question, finds the most relevant chunks, and assembles a prompt the LLM can use to generate an accurate answer.

In this lesson we will build a retrieval pipeline step by step, from a naive single-query search to a production-grade pipeline with query rewriting, hybrid search, and reranking.

---

## The Full Pipeline

Here is the complete flow, from question to answer:

```
User Question
    |
    v
[ 1. Query Processing ]     Rewrite, expand, or decompose the query
    |
    v
[ 2. Embedding ]            Embed the processed query
    |
    v
[ 3. Retrieval ]            Vector search + keyword search (hybrid)
    |
    v
[ 4. Reranking ]            Score results with a cross-encoder
    |
    v
[ 5. Prompt Assembly ]      Build the augmented prompt
    |
    v
[ 6. Generation ]           Call the LLM
    |
    v
[ 7. Post-processing ]      Extract citations, validate, format
    |
    v
Answer with sources
```

You do not need all seven steps on day one. Start with steps 2, 3, 5, and 6. Add the others when you hit quality issues.

---

## Step 1: Query Processing

The user's question is rarely optimal for vector search. A conversational question like "what's the deal with stipends?" will not match well against formal documentation.

### Query Rewriting

Use the LLM itself to rewrite the query for better retrieval:

```javascript
// retrieval/query-processor.js
import OpenAI from "openai";

const openai = new OpenAI();

/**
 * Rewrite a conversational query into a search-optimized version.
 */
export async function rewriteQuery(userQuestion) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a query rewriter for a search system. Given a user's question,
rewrite it as a clear, specific search query that will match relevant documents.
Return ONLY the rewritten query, nothing else.`
      },
      {
        role: "user",
        content: userQuestion,
      },
    ],
    temperature: 0,
    max_tokens: 100,
  });

  return response.choices[0].message.content.trim();
}

// Example
const original = "what's the deal with stipends?";
const rewritten = await rewriteQuery(original);
console.log(`Original:  ${original}`);
console.log(`Rewritten: ${rewritten}`);
// Rewritten: "How do milestone stipends work in the Fast Track program?"
```

### Multi-Query Expansion

Sometimes one query is not enough. You can generate multiple search queries from a single question to cast a wider net:

```javascript
/**
 * Generate multiple search queries from a user question.
 */
export async function expandQuery(userQuestion, numQueries = 3) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Generate ${numQueries} different search queries that would help answer
the user's question. Each query should approach the topic from a different angle.
Return one query per line, no numbering.`
      },
      { role: "user", content: userQuestion },
    ],
    temperature: 0.7,
    max_tokens: 200,
  });

  return response.choices[0].message.content
    .split("\n")
    .map(q => q.trim())
    .filter(q => q.length > 0);
}

const queries = await expandQuery("How do I get into the Fast Track program?");
console.log(queries);
// [
//   "Fast Track program eligibility requirements",
//   "How to apply for Fast Track workforce training",
//   "Fast Track enrollment process and deadlines"
// ]
```

```python
# retrieval/query_processor.py
import openai

client = openai.OpenAI()

def rewrite_query(user_question: str) -> str:
    """Rewrite a conversational query for search optimization."""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a query rewriter for a search system. "
                    "Given a user's question, rewrite it as a clear, specific search query. "
                    "Return ONLY the rewritten query."
                ),
            },
            {"role": "user", "content": user_question},
        ],
        temperature=0,
        max_tokens=100,
    )
    return response.choices[0].message.content.strip()

def expand_query(user_question: str, num_queries: int = 3) -> list[str]:
    """Generate multiple search queries from a single question."""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    f"Generate {num_queries} different search queries to answer "
                    "the user's question, each from a different angle. "
                    "One query per line, no numbering."
                ),
            },
            {"role": "user", "content": user_question},
        ],
        temperature=0.7,
        max_tokens=200,
    )
    return [q.strip() for q in response.choices[0].message.content.split("\n") if q.strip()]
```

---

## Step 2: Embedding the Query

You already know how to embed text from Module 06. The key rule: **use the same embedding model for queries that you used for documents.** Mixing models produces vectors in different spaces, and similarity scores become meaningless.

```javascript
// retrieval/embedder.js
import OpenAI from "openai";

const openai = new OpenAI();

export async function embedQuery(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",   // Must match the model used for indexing
    input: text,
  });
  return response.data[0].embedding;
}

export async function embedBatch(texts) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return response.data.map(item => item.embedding);
}
```

---

## Step 3: Retrieval

### Vector Search

The most common retrieval method. Compare the query embedding against all document embeddings, return the top K most similar.

```javascript
// retrieval/vector-search.js
import { ChromaClient } from "chromadb";

const client = new ChromaClient();

export async function vectorSearch(query, collectionName = "wbb-rag", k = 5) {
  const collection = await client.getCollection({ name: collectionName });

  const results = await collection.query({
    queryTexts: [query],
    nResults: k,
    include: ["documents", "metadatas", "distances"],
  });

  return results.documents[0].map((doc, i) => ({
    text: doc,
    metadata: results.metadatas[0][i],
    distance: results.distances[0][i],
    score: 1 - results.distances[0][i],  // Convert distance to similarity
  }));
}
```

### Keyword Search (BM25)

Vector search is great at semantic matching ("How much do people get paid?" matches "stipend amount"), but it can miss exact keyword matches. BM25 is a classic information retrieval algorithm that scores documents by keyword overlap.

```javascript
// retrieval/bm25.js

/**
 * Simple BM25 implementation for keyword search.
 */
export class BM25 {
  constructor(documents, k1 = 1.5, b = 0.75) {
    this.k1 = k1;
    this.b = b;
    this.documents = documents;
    this.tokenized = documents.map(doc => this.tokenize(doc));
    this.avgLength = this.tokenized.reduce((sum, d) => sum + d.length, 0) / this.tokenized.length;
    this.idf = this.computeIDF();
  }

  tokenize(text) {
    return text.toLowerCase().split(/\W+/).filter(t => t.length > 1);
  }

  computeIDF() {
    const df = {};  // document frequency
    const N = this.tokenized.length;

    for (const doc of this.tokenized) {
      const seen = new Set(doc);
      for (const term of seen) {
        df[term] = (df[term] || 0) + 1;
      }
    }

    const idf = {};
    for (const [term, freq] of Object.entries(df)) {
      idf[term] = Math.log((N - freq + 0.5) / (freq + 0.5) + 1);
    }
    return idf;
  }

  score(query) {
    const queryTokens = this.tokenize(query);
    const scores = [];

    for (let i = 0; i < this.tokenized.length; i++) {
      const doc = this.tokenized[i];
      const docLength = doc.length;
      let score = 0;

      // Count term frequencies in this document
      const tf = {};
      for (const term of doc) {
        tf[term] = (tf[term] || 0) + 1;
      }

      for (const term of queryTokens) {
        if (!this.idf[term]) continue;
        const termFreq = tf[term] || 0;
        const numerator = termFreq * (this.k1 + 1);
        const denominator = termFreq + this.k1 * (1 - this.b + this.b * docLength / this.avgLength);
        score += this.idf[term] * (numerator / denominator);
      }

      scores.push({ index: i, score });
    }

    return scores.sort((a, b) => b.score - a.score);
  }

  search(query, k = 5) {
    return this.score(query)
      .slice(0, k)
      .filter(r => r.score > 0)
      .map(r => ({
        text: this.documents[r.index],
        score: r.score,
        index: r.index,
      }));
  }
}
```

```python
# retrieval/bm25.py
import math
from collections import Counter

class BM25:
    def __init__(self, documents: list[str], k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.documents = documents
        self.tokenized = [self._tokenize(doc) for doc in documents]
        self.avg_length = sum(len(d) for d in self.tokenized) / len(self.tokenized)
        self.idf = self._compute_idf()

    def _tokenize(self, text: str) -> list[str]:
        import re
        return [t.lower() for t in re.split(r"\W+", text) if len(t) > 1]

    def _compute_idf(self) -> dict[str, float]:
        df = {}
        n = len(self.tokenized)
        for doc in self.tokenized:
            for term in set(doc):
                df[term] = df.get(term, 0) + 1
        return {
            term: math.log((n - freq + 0.5) / (freq + 0.5) + 1)
            for term, freq in df.items()
        }

    def search(self, query: str, k: int = 5) -> list[dict]:
        query_tokens = self._tokenize(query)
        scores = []
        for i, doc in enumerate(self.tokenized):
            tf = Counter(doc)
            score = sum(
                self.idf.get(term, 0) * (tf.get(term, 0) * (self.k1 + 1))
                / (tf.get(term, 0) + self.k1 * (1 - self.b + self.b * len(doc) / self.avg_length))
                for term in query_tokens
            )
            scores.append({"index": i, "text": self.documents[i], "score": score})

        scores.sort(key=lambda x: x["score"], reverse=True)
        return [s for s in scores[:k] if s["score"] > 0]
```

### Hybrid Search: Combining Both

The real power comes from combining vector and keyword search. This is called **hybrid search**, and it catches results that either method alone would miss.

```javascript
// retrieval/hybrid-search.js
import { vectorSearch } from "./vector-search.js";
import { BM25 } from "./bm25.js";

/**
 * Combine vector search and BM25 keyword search results.
 * Uses Reciprocal Rank Fusion (RRF) to merge rankings.
 */
export async function hybridSearch(query, allDocuments, options = {}) {
  const { k = 5, vectorWeight = 0.7, keywordWeight = 0.3 } = options;

  // Run both searches in parallel
  const [vectorResults, keywordResults] = await Promise.all([
    vectorSearch(query, "wbb-rag", k * 2),
    Promise.resolve(new BM25(allDocuments).search(query, k * 2)),
  ]);

  // Reciprocal Rank Fusion
  const rrf = {};
  const RRF_K = 60;  // Standard RRF constant

  vectorResults.forEach((result, rank) => {
    const key = result.text;
    if (!rrf[key]) rrf[key] = { text: key, metadata: result.metadata, score: 0 };
    rrf[key].score += vectorWeight * (1 / (RRF_K + rank + 1));
  });

  keywordResults.forEach((result, rank) => {
    const key = result.text;
    if (!rrf[key]) rrf[key] = { text: key, score: 0 };
    rrf[key].score += keywordWeight * (1 / (RRF_K + rank + 1));
  });

  // Sort by fused score and return top K
  return Object.values(rrf)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
```

### When Does Hybrid Search Help?

| Query Type | Vector Search | Keyword Search | Hybrid |
|-----------|---------------|----------------|--------|
| "How do stipends work?" | Finds semantic matches | May miss (no exact "stipend" in some docs) | Best of both |
| "error code E-4021" | Struggles with codes | Exact match | Catches it |
| "tell me about the youth program" | Matches "Crowns of Code" | Matches "youth" | Both contribute |

---

## Step 4: Reranking

Vector search returns results based on embedding similarity, which is fast but shallow. A **reranker** uses a more powerful model (a cross-encoder) to score each query-document pair more carefully.

Think of it this way:
- **Vector search** = librarian scanning shelves by topic (fast, approximate)
- **Reranking** = librarian reading each book's first chapter to check relevance (slow, precise)

### Using Cohere Rerank

> **Setup:** You'll need a [Cohere API key](https://dashboard.cohere.com/api-keys) for reranking. Cohere offers a free tier with 1,000 API calls/month. If you prefer to skip reranking for now, the hybrid search pipeline works well without it.

```javascript
// retrieval/reranker.js

/**
 * Rerank results using Cohere's rerank API.
 * Requires COHERE_API_KEY environment variable.
 */
export async function rerankResults(query, documents, topN = 3) {
  const response = await fetch("https://api.cohere.com/v2/rerank", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.COHERE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "rerank-v3.5",
      query: query,
      documents: documents.map(d => typeof d === "string" ? d : d.text),
      top_n: topN,
    }),
  });

  const data = await response.json();

  return data.results.map(result => ({
    text: documents[result.index].text || documents[result.index],
    metadata: documents[result.index].metadata,
    relevanceScore: result.relevance_score,
    originalIndex: result.index,
  }));
}
```

```python
# retrieval/reranker.py
import os
import requests

def rerank_results(query: str, documents: list[dict], top_n: int = 3) -> list[dict]:
    """Rerank documents using Cohere's rerank API."""
    response = requests.post(
        "https://api.cohere.com/v2/rerank",
        headers={
            "Authorization": f"Bearer {os.environ['COHERE_API_KEY']}",
            "Content-Type": "application/json",
        },
        json={
            "model": "rerank-v3.5",
            "query": query,
            "documents": [d["text"] if isinstance(d, dict) else d for d in documents],
            "top_n": top_n,
        },
    )
    data = response.json()
    return [
        {
            "text": documents[r["index"]]["text"] if isinstance(documents[r["index"]], dict) else documents[r["index"]],
            "relevance_score": r["relevance_score"],
            "original_index": r["index"],
        }
        for r in data["results"]
    ]
```

### Do You Need Reranking?

Reranking adds latency (200-500ms) and cost. Use it when:

- Your vector search returns results that are "close but not quite right"
- Precision matters more than speed (e.g., legal, medical, financial Q&A)
- You have more than 20 candidate chunks to sift through

Skip it when:
- Your corpus is small (<100 chunks) and vector search already works well
- Latency is critical (sub-second responses)
- You are in early prototyping phase

---

## Step 5: Prompt Assembly

This is where retrieval meets generation. How you format the retrieved context in the prompt directly affects answer quality.

### The Basic Template

```javascript
// retrieval/prompt-builder.js

/**
 * Assemble a RAG prompt from retrieved context chunks.
 */
export function buildRAGPrompt(question, retrievedChunks, options = {}) {
  const {
    maxContextLength = 4000,
    includeSourceInfo = true,
  } = options;

  // Build context string with source attribution
  let contextParts = [];
  let totalLength = 0;

  for (const chunk of retrievedChunks) {
    const sourceLabel = includeSourceInfo && chunk.metadata?.source
      ? `[Source: ${chunk.metadata.source}${chunk.metadata.heading ? ' > ' + chunk.metadata.heading : ''}]`
      : "";

    const entry = sourceLabel
      ? `${sourceLabel}\n${chunk.text}`
      : chunk.text;

    if (totalLength + entry.length > maxContextLength) break;

    contextParts.push(entry);
    totalLength += entry.length;
  }

  const context = contextParts.join("\n\n---\n\n");

  const systemMessage = `You are a helpful assistant for We Build Black, a non-profit tech education organization.

Answer the user's question using ONLY the context provided below. Follow these rules:
1. If the context contains the answer, provide it clearly and concisely.
2. If the context does NOT contain enough information to answer, say "I don't have enough information to answer that question."
3. Do not make up information that is not in the context.
4. When possible, cite the source of your information.

CONTEXT:
${context}`;

  return {
    systemMessage,
    userMessage: question,
    contextChunksUsed: contextParts.length,
  };
}
```

### Prompt Assembly Anti-Patterns

**Do not do this:**

```javascript
// BAD: No instruction to stay grounded in context
const prompt = `Here is some context: ${context}\n\nQuestion: ${question}`;

// BAD: Dumping too much context
const allChunks = await collection.query({ nResults: 50 }); // Way too many

// BAD: No source attribution
const prompt = `Context: ${chunks.map(c => c.text).join(' ')}`; // Just a wall of text
```

**Do this instead:**

```javascript
// GOOD: Clear instructions with grounding
// GOOD: Limited, relevant context with separators
// GOOD: Source attribution for traceability
// (See the buildRAGPrompt function above)
```

---

## Step 6: Generation

Call the LLM with your assembled prompt. This part is straightforward since you have already mastered API calls in Modules 03 and 04.

```javascript
// retrieval/generator.js
import OpenAI from "openai";

const openai = new OpenAI();

export async function generateAnswer(systemMessage, userMessage, options = {}) {
  const {
    model = "gpt-4o-mini",
    temperature = 0.2,   // Low temp for factual answers
    maxTokens = 500,
  } = options;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    temperature,
    max_tokens: maxTokens,
  });

  return {
    answer: response.choices[0].message.content,
    usage: response.usage,
  };
}
```

### Temperature for RAG

Use **low temperature (0-0.3)** for RAG answers. You want the model to faithfully reproduce information from the context, not get creative. Save higher temperatures for brainstorming and creative tasks.

---

## Step 7: Post-Processing

Extract structured information from the LLM's response: citations, confidence indicators, and follow-up suggestions.

```javascript
// retrieval/post-processor.js

/**
 * Post-process the LLM's answer to extract citations and metadata.
 */
export function postProcess(answer, retrievedChunks) {
  // Check if the model declined to answer
  const declinedPhrases = [
    "I don't have enough information",
    "I don't have that information",
    "not in the context",
    "cannot answer",
  ];
  const declined = declinedPhrases.some(phrase =>
    answer.toLowerCase().includes(phrase.toLowerCase())
  );

  // Extract source references
  const sources = retrievedChunks
    .filter(chunk => chunk.metadata?.source)
    .map(chunk => ({
      file: chunk.metadata.source,
      section: chunk.metadata.heading || "General",
      relevanceScore: chunk.relevanceScore || chunk.score,
    }));

  // Remove duplicate sources
  const uniqueSources = [...new Map(
    sources.map(s => [`${s.file}-${s.section}`, s])
  ).values()];

  return {
    answer,
    declined,
    sources: uniqueSources,
    timestamp: new Date().toISOString(),
  };
}
```

---

## Putting It All Together

Here is the complete pipeline assembled into a single function:

```javascript
// rag.js -- The full RAG pipeline
import { rewriteQuery } from "./retrieval/query-processor.js";
import { vectorSearch } from "./retrieval/vector-search.js";
import { rerankResults } from "./retrieval/reranker.js";
import { buildRAGPrompt } from "./retrieval/prompt-builder.js";
import { generateAnswer } from "./retrieval/generator.js";
import { postProcess } from "./retrieval/post-processor.js";

export async function ragPipeline(userQuestion, options = {}) {
  const {
    rewrite = true,
    rerank = true,
    topK = 10,
    topN = 3,
    model = "gpt-4o-mini",
    verbose = false,
  } = options;

  const log = verbose ? console.log : () => {};

  // 1. Query processing
  const searchQuery = rewrite
    ? await rewriteQuery(userQuestion)
    : userQuestion;
  log(`Search query: ${searchQuery}`);

  // 2 + 3. Retrieval
  let results = await vectorSearch(searchQuery, "wbb-rag", topK);
  log(`Retrieved ${results.length} chunks`);

  // 4. Reranking (optional)
  if (rerank && results.length > 0) {
    results = await rerankResults(searchQuery, results, topN);
    log(`Reranked to top ${results.length} chunks`);
  } else {
    results = results.slice(0, topN);
  }

  // 5. Prompt assembly
  const { systemMessage, userMessage, contextChunksUsed } = buildRAGPrompt(
    userQuestion,  // Use original question, not rewritten
    results,
  );
  log(`Using ${contextChunksUsed} context chunks`);

  // 6. Generation
  const { answer, usage } = await generateAnswer(systemMessage, userMessage, { model });
  log(`Tokens used: ${usage.total_tokens}`);

  // 7. Post-processing
  const processed = postProcess(answer, results);

  return {
    question: userQuestion,
    searchQuery,
    ...processed,
    tokensUsed: usage.total_tokens,
  };
}

// Usage
const result = await ragPipeline("How much does each Fast Track milestone pay?", {
  verbose: true,
});

console.log("\n=== Answer ===");
console.log(result.answer);
console.log("\n=== Sources ===");
result.sources.forEach(s => console.log(`  - ${s.file} > ${s.section}`));
```

```python
# rag.py -- The full RAG pipeline
from retrieval.query_processor import rewrite_query
from retrieval.vector_search import vector_search
from retrieval.reranker import rerank_results
from retrieval.prompt_builder import build_rag_prompt
from retrieval.generator import generate_answer
from retrieval.post_processor import post_process

def rag_pipeline(user_question: str, rewrite: bool = True, rerank: bool = True,
                 top_k: int = 10, top_n: int = 3, model: str = "gpt-4o-mini",
                 verbose: bool = False) -> dict:

    log = print if verbose else lambda *a: None

    # 1. Query processing
    search_query = rewrite_query(user_question) if rewrite else user_question
    log(f"Search query: {search_query}")

    # 2 + 3. Retrieval
    results = vector_search(search_query, collection_name="wbb-rag", k=top_k)
    log(f"Retrieved {len(results)} chunks")

    # 4. Reranking
    if rerank and results:
        results = rerank_results(search_query, results, top_n=top_n)
        log(f"Reranked to top {len(results)} chunks")
    else:
        results = results[:top_n]

    # 5. Prompt assembly
    system_msg, user_msg, chunks_used = build_rag_prompt(user_question, results)
    log(f"Using {chunks_used} context chunks")

    # 6. Generation
    answer, usage = generate_answer(system_msg, user_msg, model=model)
    log(f"Tokens used: {usage.total_tokens}")

    # 7. Post-processing
    processed = post_process(answer, results)

    return {
        "question": user_question,
        "search_query": search_query,
        **processed,
        "tokens_used": usage.total_tokens,
    }

# Usage
result = rag_pipeline("How much does each Fast Track milestone pay?", verbose=True)
print(f"\n=== Answer ===\n{result['answer']}")
print(f"\n=== Sources ===")
for s in result["sources"]:
    print(f"  - {s['file']} > {s['section']}")
```

---

## Performance Optimization

### Caching Embeddings

Query embedding is an API call. Cache it for repeated or similar queries:

```javascript
// Simple in-memory cache for query embeddings
const embeddingCache = new Map();

export async function embedQueryCached(text) {
  const cacheKey = text.toLowerCase().trim();
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey);
  }
  const embedding = await embedQuery(text);
  embeddingCache.set(cacheKey, embedding);
  return embedding;
}
```

### Streaming Responses

For a better user experience, stream the LLM's response instead of waiting for the full answer:

```javascript
export async function generateAnswerStream(systemMessage, userMessage, onChunk) {
  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    temperature: 0.2,
    stream: true,
  });

  let fullAnswer = "";
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    fullAnswer += content;
    onChunk(content);
  }

  return fullAnswer;
}
```

### Batch Queries

If you are processing multiple questions, batch your embedding calls:

```javascript
// Instead of embedding one query at a time...
for (const question of questions) {
  const embedding = await embedQuery(question);  // N API calls
}

// Embed all at once
const embeddings = await embedBatch(questions);  // 1 API call
```

---

## Common Retrieval Pitfalls

### 1. The "Lost in the Middle" Problem

LLMs pay less attention to context in the middle of the prompt. Put the most relevant chunks first and last.

```javascript
function reorderChunks(chunks) {
  // Place highest-scored chunks at the beginning and end
  const sorted = [...chunks].sort((a, b) => b.score - a.score);
  const reordered = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i % 2 === 0) reordered.push(sorted[i]);
    else reordered.unshift(sorted[i]);
  }
  return reordered;
}
```

### 2. Over-Retrieval

Retrieving too many chunks dilutes the signal and wastes tokens. Start with 3-5 chunks and only increase if the model frequently says "I don't have enough information."

### 3. Under-Retrieval

Retrieving too few chunks misses important context. If answers are incomplete, try increasing K or using multi-query expansion.

### 4. Ignoring Metadata Filters

If you know the user is asking about a specific program, filter by source before doing vector search. This is faster and more precise than searching everything.

```javascript
const results = await collection.query({
  queryTexts: [query],
  nResults: 5,
  where: { source: "fast-track-guide.md" },  // Only search relevant docs
});
```

---

## Key Takeaways

- **The retrieval pipeline has 7 steps**: query processing, embedding, retrieval, reranking, prompt assembly, generation, and post-processing. Start with the core 4 (embed, retrieve, prompt, generate) and add the rest as needed.
- **Query rewriting** transforms messy user questions into search-optimized queries. It is one of the highest-impact improvements you can make.
- **Hybrid search** (vector + keyword) catches results that either method alone would miss. Use Reciprocal Rank Fusion to combine rankings.
- **Reranking** uses a cross-encoder to re-score results with deeper analysis. Add it when precision matters and you can tolerate extra latency.
- **Prompt assembly** is where you control the model's behavior. Use clear instructions, source attribution, and a "decline to answer" fallback.
- **Low temperature** (0-0.3) is best for RAG answers where faithfulness to context matters.

---

## Try It Yourself

1. **Build the full pipeline.** Create a `rag.js` file that wires up all the steps from this lesson. Index a few markdown files from the WBB documentation and test it with 10 questions.

2. **A/B test query rewriting.** Run 20 questions with and without query rewriting. Count how many times the correct chunk appears in the top 3 results for each approach.

3. **Implement hybrid search.** Add BM25 keyword search alongside vector search. Find a query where vector search misses but keyword search catches it, and vice versa.

4. **Experiment with chunk count.** Run the same question with 1, 3, 5, and 10 retrieved chunks. At what point does adding more context stop improving the answer? At what point does it make the answer worse?

5. **Add streaming.** Modify the generator to stream the response token by token. Display it in a terminal with a typewriter effect. This is how ChatGPT-style interfaces work.

> **Framework Note:** In production, teams often use frameworks like [RAGAS](https://docs.ragas.io/) or DeepEval for comprehensive RAG evaluation rather than building custom evaluation harnesses. We teach the fundamentals here so you understand what these frameworks measure.

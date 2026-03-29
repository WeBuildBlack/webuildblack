---
title: "What Is RAG and Why It Matters"
estimatedMinutes: 65
---

## What Is RAG and Why It Matters

You have built apps that call LLM APIs. You have embedded text into vectors and searched across them. Now it is time to bring those skills together into the pattern that is quietly powering most production AI features today: **Retrieval-Augmented Generation**, or RAG.

By the end of this lesson you will understand what RAG is, why it exists, when to use it instead of fine-tuning, and how the pieces you have already learned snap together into a real system.

---

## The Problem RAG Solves

Large language models are trained on massive public datasets, but they have two stubborn limitations:

1. **They hallucinate.** Ask an LLM about your company's refund policy and it will confidently invent one.
2. **They cannot access private data.** Your internal docs, your database records, your Notion pages -- the model has never seen any of it.

You could paste your entire knowledge base into the prompt, but context windows are finite and tokens cost money. While models like Gemini 1.5 Pro support 1M+ tokens, RAG is still preferred for cost, latency, freshness, and accuracy reasons -- even when the content *could* fit in the context window. A 10,000-page documentation site might technically fit in the largest context windows, but the cost per query would be enormous, the latency would be high, and the model would struggle to find the needle in that haystack.

RAG solves this by **retrieving only the relevant pieces** of your data and **augmenting** the prompt with them before the model **generates** an answer.

```
User question
    |
    v
[ Retriever ] --> finds the 3-5 most relevant chunks
    |
    v
[ Augmented Prompt ] = system instructions + retrieved chunks + user question
    |
    v
[ LLM generates answer grounded in your data ]
```

The model no longer has to guess. It reads the relevant context and answers based on evidence you provided.

---

## RAG in Plain English

Think of it like an open-book exam.

- **Without RAG**: The student (LLM) answers from memory. If they never studied that topic, they make something up.
- **With RAG**: The student gets to flip through the textbook, find the relevant pages, and write an answer based on what they found.

The textbook is your data. The act of flipping to the right pages is retrieval. The answer the student writes is generation.

---

## Where RAG Shows Up in the Real World

RAG is not a research curiosity. It is the backbone of features you interact with daily:

| Product | What RAG Does |
|---------|---------------|
| Customer support chatbots | Retrieves relevant help articles before answering |
| Internal knowledge assistants | Searches company wikis, Slack history, and docs |
| Legal research tools | Finds relevant case law and statutes |
| E-commerce search | Retrieves product info to answer "which laptop is best for video editing?" |
| Code assistants | Pulls relevant files from your codebase into context |

If you have ever asked ChatGPT a question with web search enabled, you have used RAG. The system searched the web, retrieved results, and fed them into the prompt.

---

## The RAG Pipeline at a Glance

Every RAG system follows the same general flow. We will build each piece in the lessons that follow, but here is the map:

### Offline Phase (Indexing)

This happens once, before any user asks a question.

```
Your documents (PDFs, markdown, database rows, etc.)
    |
    v
[ Chunking ] --> split into smaller pieces
    |
    v
[ Embedding ] --> convert each chunk to a vector
    |
    v
[ Vector Store ] --> save vectors + original text for later search
```

### Online Phase (Query Time)

This happens every time a user asks a question.

```
User question
    |
    v
[ Embed the question ] --> same embedding model
    |
    v
[ Vector search ] --> find top-K similar chunks
    |
    v
[ (Optional) Rerank ] --> reorder by deeper relevance
    |
    v
[ Build prompt ] --> system message + retrieved chunks + question
    |
    v
[ LLM call ] --> generate grounded answer
    |
    v
Answer returned to user
```

### A Minimal RAG Example in JavaScript

Here is the entire flow compressed into a single script. Do not worry about understanding every line yet -- we will break each piece apart in the coming lessons.

```javascript
// minimal-rag.js
import OpenAI from "openai";

const openai = new OpenAI();

// 1. Our "knowledge base" -- in production this would be a vector DB
const documents = [
  "We Build Black offers a Fast Track program with 6 milestones. Each milestone pays a $1,000 stipend upon completion.",
  "The Crowns of Code program teaches coding to youth ages 10-17 in Brooklyn, NY.",
  "Mavens I/O is WBB's annual conference celebrating Black excellence in tech.",
  "Fast Track tracks include Android Development, UX Design, and Data Analytics.",
  "WBB was founded in 2016 as Black Software Engineers of NYC Meetup."
];

// 2. Embed all documents (offline phase)
async function embedTexts(texts) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return response.data.map((item) => item.embedding);
}

// 3. Cosine similarity search
function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function retrieveTopK(queryEmbedding, docEmbeddings, k = 2) {
  const scored = docEmbeddings.map((emb, i) => ({
    index: i,
    score: cosineSimilarity(queryEmbedding, emb),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

// 4. The RAG pipeline
async function askWithRAG(question) {
  // Embed everything
  const allTexts = [...documents, question];
  const allEmbeddings = await embedTexts(allTexts);

  const docEmbeddings = allEmbeddings.slice(0, documents.length);
  const queryEmbedding = allEmbeddings[allEmbeddings.length - 1];

  // Retrieve
  const topResults = retrieveTopK(queryEmbedding, docEmbeddings, 2);
  const context = topResults
    .map((r) => documents[r.index])
    .join("\n\n");

  console.log("Retrieved context:\n", context);
  console.log("---");

  // Generate
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Answer the user's question using ONLY the context below. If the context doesn't contain the answer, say "I don't have that information."

Context:
${context}`,
      },
      { role: "user", content: question },
    ],
  });

  return completion.choices[0].message.content;
}

// Try it
const answer = await askWithRAG("How much does each Fast Track milestone pay?");
console.log("Answer:", answer);
```

### The Same Idea in Python

```python
# minimal_rag.py
import openai
import numpy as np

client = openai.OpenAI()

documents = [
    "We Build Black offers a Fast Track program with 6 milestones. Each milestone pays a $1,000 stipend upon completion.",
    "The Crowns of Code program teaches coding to youth ages 10-17 in Brooklyn, NY.",
    "Mavens I/O is WBB's annual conference celebrating Black excellence in tech.",
    "Fast Track tracks include Android Development, UX Design, and Data Analytics.",
    "WBB was founded in 2016 as Black Software Engineers of NYC Meetup.",
]

def embed_texts(texts: list[str]) -> list[list[float]]:
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=texts,
    )
    return [item.embedding for item in response.data]

def cosine_similarity(a, b):
    a, b = np.array(a), np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def retrieve_top_k(query_emb, doc_embs, k=2):
    scores = [(i, cosine_similarity(query_emb, emb)) for i, emb in enumerate(doc_embs)]
    scores.sort(key=lambda x: x[1], reverse=True)
    return scores[:k]

def ask_with_rag(question: str) -> str:
    all_texts = documents + [question]
    all_embeddings = embed_texts(all_texts)

    doc_embeddings = all_embeddings[: len(documents)]
    query_embedding = all_embeddings[-1]

    top_results = retrieve_top_k(query_embedding, doc_embeddings, k=2)
    context = "\n\n".join(documents[i] for i, _ in top_results)

    print(f"Retrieved context:\n{context}\n---")

    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "Answer the user's question using ONLY the context below. "
                    "If the context doesn't contain the answer, say "
                    "\"I don't have that information.\"\n\n"
                    f"Context:\n{context}"
                ),
            },
            {"role": "user", "content": question},
        ],
    )
    return completion.choices[0].message.content

answer = ask_with_rag("How much does each Fast Track milestone pay?")
print(f"Answer: {answer}")
```

---

## RAG vs. Fine-Tuning: When to Use Which

This is the question everyone asks: should I fine-tune the model on my data, or should I use RAG? The answer is almost always RAG, at least first.

### Comparison Table

| Dimension | RAG | Fine-Tuning |
|-----------|-----|-------------|
| **Cost to start** | Low -- just API calls | High -- training runs cost $$ |
| **Data freshness** | Real-time -- update your docs anytime | Stale -- retrain to update knowledge |
| **Data privacy** | Your data stays in your system | Your data is sent for training |
| **Setup time** | Hours | Days to weeks |
| **Accuracy on your data** | High (if retrieval is good) | High (if training data is clean) |
| **Hallucination risk** | Low -- model cites retrieved context | Medium -- can still hallucinate |
| **Best for** | Knowledge Q&A, search, support | Style/tone changes, specialized formats |

### When Fine-Tuning Makes Sense

Fine-tuning is the right call when you need to change **how** the model writes, not **what** it knows:

- You want every response in a specific JSON schema
- You need domain-specific jargon the model consistently gets wrong
- You want to distill a large model's behavior into a smaller, cheaper model
- You have a classification task with thousands of labeled examples

### When RAG Makes Sense

RAG is the right call when you need to change **what** the model knows:

- You have documents, FAQs, or knowledge bases the model should reference
- Your data changes frequently (product catalogs, policies, docs)
- You need citations and traceability (the user should know where the answer came from)
- You want to get started quickly without a training pipeline

### The Hybrid Approach

In practice, many production systems use both. They fine-tune a model for consistent output formatting and tone, then use RAG to inject up-to-date knowledge at query time. But if you are starting from scratch, **start with RAG**. You can always add fine-tuning later.

---

## The Components You Already Know

If you have been following this course, you already have most of the building blocks:

| RAG Component | Where You Learned It |
|---------------|----------------------|
| Calling LLM APIs | Modules 03 (OpenAI) and 04 (Anthropic) |
| System prompts and prompt engineering | Module 02 |
| Embeddings | Module 06 |
| Vector similarity search | Module 06 |
| Building web features with AI | Module 05 |

What you need to learn now is how to **connect these pieces** into a reliable pipeline, and how to handle the tricky parts: chunking, retrieval quality, and evaluation.

---

## Common RAG Architectures

### Naive RAG

The simplest version. Embed, search, stuff into prompt, generate. This is what most tutorials show and what we built above.

```
Question --> Embed --> Vector Search --> Stuff into prompt --> LLM --> Answer
```

**Pros**: Simple, fast to build, works surprisingly well for straightforward Q&A.

**Cons**: No reranking, no query transformation, retrieval quality is hit-or-miss.

### Advanced RAG

Adds preprocessing and postprocessing steps to improve quality.

```
Question --> Query Rewriting --> Embed --> Vector Search --> Reranking --> Prompt Assembly --> LLM --> Answer
                                                                                              |
                                                                                    Citation extraction
```

Key improvements:
- **Query rewriting**: Rephrase the user's question for better retrieval
- **Hybrid search**: Combine vector search with keyword search (BM25)
- **Reranking**: Use a cross-encoder model to reorder results by true relevance
- **Citation extraction**: Tell the user which sources informed the answer

### Modular RAG

Treats each component as a swappable module. This is how production systems are built.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Ingestion   │     │  Retrieval   │     │  Generation  │
│              │     │              │     │              │
│ - Loader     │     │ - Query      │     │ - Prompt     │
│ - Splitter   │ --> │ - Embedder   │ --> │ - LLM        │
│ - Embedder   │     │ - Searcher   │     │ - Parser     │
│ - Store      │     │ - Reranker   │     │ - Validator  │
└──────────────┘     └──────────────┘     └──────────────┘
```

You can swap any component without rewriting the whole system. Want to switch from OpenAI embeddings to Cohere? Change one module. Want to add a reranker? Plug it in.

---

## What Makes RAG Fail

Before we start building, it helps to know the common failure modes so you can watch for them:

### 1. Bad Chunking

If your chunks are too small, they lose context. If they are too large, the relevant information gets buried. We will cover chunking strategies in the next lesson.

### 2. Irrelevant Retrieval

The vector search returns chunks that are semantically similar but not actually relevant to the question. This is the most common problem and the hardest to fix.

### 3. Lost in the Middle

Research shows that LLMs pay more attention to the beginning and end of the context window. Important information in the middle of a long context can be ignored.

### 4. Insufficient Context

The retrieved chunks do not contain the answer, but the model generates one anyway based on its training data. This is a hallucination that looks like a RAG answer.

### 5. Conflicting Information

Multiple chunks contain contradictory information (e.g., an old policy and a new policy). The model may pick the wrong one or try to merge them.

We will address each of these in the evaluation lesson (Lesson 04).

---

## Setting Up for the Module

For the hands-on exercises in this module, you will need:

```bash
# JavaScript / Node.js
npm install openai chromadb chromadb-default-embed

# Python
pip install openai chromadb numpy
```

We will use **ChromaDB** as our vector store because it runs locally with zero configuration -- no cloud account, no API key. In production you would likely use a managed service like Pinecone, Weaviate, or pgvector in your existing Postgres database.

### Project Structure

By the end of this module you will have built:

```
rag-project/
├── ingest.js          # Load and chunk documents, store in ChromaDB
├── retrieve.js        # Search for relevant chunks
├── generate.js        # Build prompt and call LLM
├── rag.js             # Full pipeline combining all three
├── evaluate.js        # Test retrieval and answer quality
├── documents/         # Sample documents to index
│   ├── wbb-faq.md
│   └── wbb-programs.md
└── package.json
```

---

## Key Takeaways

- **RAG = Retrieve + Augment + Generate.** Find the relevant context from your data, inject it into the prompt, and let the LLM generate a grounded answer.
- **RAG reduces hallucinations** by giving the model evidence to cite instead of forcing it to answer from memory.
- **Start with RAG, not fine-tuning** when you need the model to know about your specific data. Fine-tuning changes how the model writes; RAG changes what it knows.
- **Every RAG system has two phases**: an offline indexing phase (chunk, embed, store) and an online query phase (embed question, search, generate).
- **RAG fails** when chunking is poor, retrieval misses the mark, or the model ignores context in the middle. Knowing these failure modes upfront will save you debugging time.

---

## Try It Yourself

1. **Run the minimal RAG example** above with your own set of documents. Try 5-10 short paragraphs about a topic you know well. Ask questions and see if the retrieval finds the right chunks.

2. **Break it on purpose.** Ask a question that your documents do not cover. Does the model correctly say "I don't have that information," or does it hallucinate? Adjust the system prompt to make it more strict.

3. **Vary the number of retrieved chunks.** Change `k` from 2 to 1, then to 5. How does the answer quality change? At what point does adding more context stop helping?

4. **Compare with and without RAG.** Ask the same question directly to the LLM (no context) and with RAG. Note the differences in accuracy and confidence.

5. **Sketch a RAG architecture** for a real project you care about. What are your documents? How often do they change? What kinds of questions would users ask? This exercise will prepare you for the hands-on building in the next lessons.

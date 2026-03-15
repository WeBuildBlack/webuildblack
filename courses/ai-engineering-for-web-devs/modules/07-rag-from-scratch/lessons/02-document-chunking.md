---
title: "Document Chunking Strategies"
estimatedMinutes: 65
---

## Document Chunking Strategies

You have a pile of documents -- markdown files, PDFs, database exports, web pages -- and you need to get them into a vector store so your RAG pipeline can search them. The first question is: how do you break them into pieces?

This is the chunking problem, and getting it right has an outsized impact on your RAG system's quality. Bad chunking is the single most common reason RAG systems return irrelevant or incomplete answers.

---

## Why Chunk at All?

Three practical reasons:

1. **Embedding models have token limits.** Most embedding models accept 512 to 8,192 tokens. A 50-page document does not fit.
2. **Specificity matters.** If you embed an entire document as one vector, a query about one paragraph has to match against the whole thing. The signal gets diluted.
3. **Context windows are finite.** Even if you could embed huge documents, you can only stuff so many retrieved chunks into the LLM's prompt. Smaller, focused chunks mean you can include more distinct pieces of evidence.

The goal is to create chunks that are **small enough to be specific** but **large enough to be self-contained**. Each chunk should answer the question: "If someone read only this chunk, would it make sense on its own?"

---

## Strategy 1: Fixed-Size Chunking

The simplest approach. Split the text every N characters (or tokens), with optional overlap.

### How It Works

```
Document: "AAAAABBBBBCCCCCDDDDDEEEEE" (25 chars)

Chunk size: 10, Overlap: 3

Chunk 1: "AAAAABBBBB"     (chars 0-9)
Chunk 2: "BBBCCCCCDD"     (chars 7-16)
Chunk 3: "DDDDDEEEE"      (chars 14-24)
```

### JavaScript Implementation

```javascript
// chunkers/fixed-size.js

/**
 * Split text into fixed-size chunks with optional overlap.
 * @param {string} text - The text to chunk
 * @param {number} chunkSize - Number of characters per chunk
 * @param {number} overlap - Number of overlapping characters between chunks
 * @returns {string[]} Array of text chunks
 */
export function fixedSizeChunk(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }

  return chunks;
}

// Usage
const document = await fs.readFile("./documents/wbb-programs.md", "utf-8");
const chunks = fixedSizeChunk(document, 1000, 200);

console.log(`Created ${chunks.length} chunks`);
console.log(`First chunk (${chunks[0].length} chars):\n`, chunks[0]);
```

### Python Implementation

```python
# chunkers/fixed_size.py

def fixed_size_chunk(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """Split text into fixed-size chunks with optional overlap."""
    chunks = []
    start = 0

    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        start += chunk_size - overlap

    return chunks

# Usage
with open("./documents/wbb-programs.md") as f:
    document = f.read()

chunks = fixed_size_chunk(document, chunk_size=1000, overlap=200)
print(f"Created {len(chunks)} chunks")
print(f"First chunk ({len(chunks[0])} chars):\n{chunks[0]}")
```

### When to Use Fixed-Size Chunking

- Quick prototyping when you want to get something working fast
- Uniform, unstructured text (like plain prose) without clear section boundaries
- When you need predictable chunk sizes for cost estimation

### Downsides

- Cuts through sentences, paragraphs, and ideas mid-thought
- A single concept can be split across chunks, making neither chunk useful alone
- Overlap helps but does not solve the problem -- you still lose coherence at boundaries

---

## Strategy 2: Recursive Character Splitting

This is the most widely used strategy in production RAG systems. It tries to split on natural boundaries, falling back to smaller separators when chunks are too large.

### How It Works

The algorithm uses a hierarchy of separators:

1. Try splitting on `\n\n` (paragraph breaks)
2. If any chunk is still too large, split on `\n` (line breaks)
3. If still too large, split on `. ` (sentences)
4. If still too large, split on ` ` (words)
5. Last resort: split on individual characters

```
Document with paragraphs, headings, and lists
    |
    v
Split on "\n\n" --> paragraph-level chunks
    |
    v
Any chunk > max_size? --> split that chunk on "\n"
    |
    v
Still too big? --> split on ". "
    |
    v
Final chunks (each <= max_size)
```

### JavaScript Implementation

```javascript
// chunkers/recursive.js

const DEFAULT_SEPARATORS = ["\n\n", "\n", ". ", " ", ""];

/**
 * Recursively split text using a hierarchy of separators.
 */
export function recursiveChunk(text, chunkSize = 1000, overlap = 200, separators = DEFAULT_SEPARATORS) {
  const chunks = [];

  function splitRecursive(text, sepIndex) {
    // Base case: text fits in one chunk
    if (text.length <= chunkSize) {
      if (text.trim()) chunks.push(text.trim());
      return;
    }

    // Try current separator
    const separator = separators[sepIndex];
    if (separator === undefined) {
      // Last resort: hard split
      chunks.push(text.slice(0, chunkSize));
      splitRecursive(text.slice(chunkSize - overlap), sepIndex);
      return;
    }

    const parts = text.split(separator);

    // Build chunks from parts, applying overlap between them
    const builtChunks = [];
    let currentChunk = "";
    for (const part of parts) {
      const candidate = currentChunk
        ? currentChunk + separator + part
        : part;

      if (candidate.length <= chunkSize) {
        currentChunk = candidate;
      } else {
        // Save current chunk
        if (currentChunk.trim()) {
          builtChunks.push(currentChunk.trim());
        }

        // If this single part exceeds chunkSize, recurse with next separator
        if (part.length > chunkSize) {
          splitRecursive(part, sepIndex + 1);
          currentChunk = "";
        } else {
          currentChunk = part;
        }
      }
    }

    // Don't forget the last accumulated chunk
    if (currentChunk.trim()) {
      builtChunks.push(currentChunk.trim());
    }

    // Now apply overlap: prepend trailing text from the previous chunk
    for (let i = 0; i < builtChunks.length; i++) {
      let chunk = builtChunks[i];
      if (i > 0 && overlap > 0) {
        const prevWords = builtChunks[i - 1].split(/\s+/);
        const overlapWords = prevWords.slice(-Math.ceil(overlap / 5));
        chunk = overlapWords.join(" ") + " " + chunk;
      }
      // If the overlapped chunk is too large, recurse with next separator
      if (chunk.length > chunkSize) {
        splitRecursive(chunk, sepIndex + 1);
      } else if (chunk.trim()) {
        chunks.push(chunk.trim());
      }
    }
  }

  splitRecursive(text, 0);
  return chunks;
}

// Usage
const doc = `## Fast Track Program

The Fast Track program is a 6-month workforce development initiative.
Each participant follows one of three tracks: Android Development,
UX Design, or Data Analytics.

## Milestones

There are 6 milestones, each worth a $1,000 stipend:

1. Environment setup and first project
2. Core skills assessment
3. Portfolio piece #1
4. Portfolio piece #2
5. Mock interviews and networking
6. Job placement preparation

## Eligibility

Applicants must be at least 18 years old and based in the NYC area.
No prior tech experience is required.`;

const chunks = recursiveChunk(doc, 300, 50);
chunks.forEach((chunk, i) => {
  console.log(`\n--- Chunk ${i + 1} (${chunk.length} chars) ---`);
  console.log(chunk);
});
```

### Python Implementation

```python
# chunkers/recursive.py

DEFAULT_SEPARATORS = ["\n\n", "\n", ". ", " ", ""]

def recursive_chunk(
    text: str,
    chunk_size: int = 1000,
    overlap: int = 200,
    separators: list[str] = None
) -> list[str]:
    """Recursively split text using a hierarchy of separators."""
    if separators is None:
        separators = DEFAULT_SEPARATORS

    chunks = []

    def split_recursive(text: str, sep_index: int):
        if len(text) <= chunk_size:
            stripped = text.strip()
            if stripped:
                chunks.append(stripped)
            return

        if sep_index >= len(separators):
            chunks.append(text[:chunk_size])
            split_recursive(text[chunk_size - overlap:], sep_index)
            return

        separator = separators[sep_index]
        parts = text.split(separator) if separator else list(text)

        current_chunk = ""
        for part in parts:
            candidate = (current_chunk + separator + part) if current_chunk else part
            if len(candidate) <= chunk_size:
                current_chunk = candidate
            else:
                if current_chunk.strip():
                    chunks.append(current_chunk.strip())
                if len(part) > chunk_size:
                    split_recursive(part, sep_index + 1)
                    current_chunk = ""
                else:
                    current_chunk = part

        if current_chunk.strip():
            chunks.append(current_chunk.strip())

    split_recursive(text, 0)
    return chunks
```

### Why Recursive Splitting Wins

- Respects natural document structure (paragraphs > lines > sentences)
- Each chunk is more likely to be a coherent unit of meaning
- Handles documents of varying structure without configuration changes

This is what LangChain's `RecursiveCharacterTextSplitter` does under the hood, and it is the default recommendation for most RAG systems.

---

## Strategy 3: Semantic Chunking

Fixed-size and recursive chunking use structural cues (character counts, newlines). Semantic chunking uses the **meaning** of the text to decide where to split.

### The Idea

1. Split the document into sentences
2. Embed each sentence
3. Compare adjacent sentence embeddings
4. When similarity drops below a threshold, insert a chunk boundary

```
Sentence 1: "The Fast Track program has 6 milestones."
Sentence 2: "Each milestone pays $1,000."                    } High similarity -> same chunk
Sentence 3: "Participants choose from three tracks."         }

Sentence 4: "Crowns of Code is for youth ages 10-17."        } Low similarity -> NEW CHUNK
Sentence 5: "Classes meet every Saturday in Brooklyn."       }
```

### JavaScript Implementation

```javascript
// chunkers/semantic.js
import OpenAI from "openai";

const openai = new OpenAI();

function splitIntoSentences(text) {
  // Simple sentence splitting -- for production, use a proper NLP tokenizer
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

async function embedBatch(texts) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return response.data.map(item => item.embedding);
}

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] ** 2;
    magB += b[i] ** 2;
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Chunk text by semantic similarity between adjacent sentences.
 * @param {string} text - The text to chunk
 * @param {number} threshold - Similarity below this triggers a new chunk (0-1)
 * @param {number} minChunkSize - Minimum characters per chunk
 */
export async function semanticChunk(text, threshold = 0.75, minChunkSize = 100) {
  const sentences = splitIntoSentences(text);
  if (sentences.length <= 1) return [text];

  // Embed all sentences
  const embeddings = await embedBatch(sentences);

  // Find breakpoints where similarity drops
  const chunks = [];
  let currentChunk = [sentences[0]];

  for (let i = 1; i < sentences.length; i++) {
    const similarity = cosineSimilarity(embeddings[i - 1], embeddings[i]);

    if (similarity < threshold && currentChunk.join(" ").length >= minChunkSize) {
      chunks.push(currentChunk.join(" "));
      currentChunk = [sentences[i]];
    } else {
      currentChunk.push(sentences[i]);
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks;
}
```

### When to Use Semantic Chunking

- Documents that cover multiple distinct topics in a single section
- Conversational text (chat logs, interview transcripts) where topic shifts are subtle
- When recursive chunking produces chunks that mix unrelated content

### Downsides

- Requires embedding API calls during chunking (cost and latency)
- Threshold tuning is trial-and-error
- Sentence splitting is an imperfect heuristic

---

## Strategy 4: Markdown/Structure-Aware Chunking

If your documents have structure (headings, sections, code blocks), use it. This strategy splits on markdown headers and preserves the heading hierarchy as metadata.

### JavaScript Implementation

```javascript
// chunkers/markdown.js

/**
 * Split markdown into chunks by heading level, preserving the heading path.
 */
export function markdownChunk(text, maxChunkSize = 1500) {
  const lines = text.split("\n");
  const chunks = [];
  let currentHeadings = {};  // { 1: "Main Title", 2: "Subsection", ... }
  let currentContent = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);

    if (headingMatch) {
      // Save previous chunk
      if (currentContent.length > 0) {
        const content = currentContent.join("\n").trim();
        if (content) {
          chunks.push({
            content,
            headings: { ...currentHeadings },
            headingPath: Object.values(currentHeadings).join(" > "),
          });
        }
      }

      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();

      // Update heading hierarchy -- clear lower levels
      currentHeadings[level] = title;
      for (let l = level + 1; l <= 6; l++) {
        delete currentHeadings[l];
      }

      currentContent = [line];
    } else {
      currentContent.push(line);
    }
  }

  // Don't forget the last chunk
  if (currentContent.length > 0) {
    const content = currentContent.join("\n").trim();
    if (content) {
      chunks.push({
        content,
        headings: { ...currentHeadings },
        headingPath: Object.values(currentHeadings).join(" > "),
      });
    }
  }

  return chunks;
}

// Usage
const md = `# WBB Programs

## Fast Track

### Overview
The Fast Track program prepares participants for tech careers
through a milestone-based curriculum with stipends.

### Tracks
- Android Development
- UX Design
- Data Analytics

## Crowns of Code

### Overview
A youth coding program for ages 10-17.

### Schedule
Classes meet every Saturday from 10am to 1pm.`;

const chunks = markdownChunk(md);
chunks.forEach((chunk, i) => {
  console.log(`\n--- Chunk ${i + 1} ---`);
  console.log(`Path: ${chunk.headingPath}`);
  console.log(`Content: ${chunk.content.slice(0, 100)}...`);
});

// Output:
// --- Chunk 1 ---
// Path: WBB Programs > Fast Track > Overview
// Content: ### Overview\nThe Fast Track program prepares participants...
```

The heading path metadata is gold for retrieval. When the user asks "What are the Fast Track tracks?", the chunk with heading path "WBB Programs > Fast Track > Tracks" will score highly even before vector similarity enters the picture.

---

## Overlap: The Glue Between Chunks

No matter which strategy you use, **overlapping chunks** helps ensure that ideas split across a boundary are still findable.

```
Without overlap:
  Chunk 1: "...each milestone is worth"
  Chunk 2: "a $1,000 stipend that is paid..."

With overlap (50 chars):
  Chunk 1: "...each milestone is worth a $1,000 stipend"
  Chunk 2: "milestone is worth a $1,000 stipend that is paid..."
```

Now if the user asks "How much is the stipend?", both chunks contain the answer.

### How Much Overlap?

A common rule of thumb:

| Chunk Size | Overlap | Overlap % |
|-----------|---------|-----------|
| 500 chars | 50-100 | 10-20% |
| 1000 chars | 100-200 | 10-20% |
| 2000 chars | 200-400 | 10-20% |

Keep overlap between 10-20% of chunk size. More than that creates too much redundancy and increases your vector store size without proportional benefit.

---

## Metadata: Making Chunks Findable

Raw text chunks are useful, but chunks with metadata are powerful. Always attach metadata to your chunks:

```javascript
// Instead of just storing text...
const chunk = "The Fast Track program has 6 milestones...";

// Store text + metadata
const chunkWithMetadata = {
  text: "The Fast Track program has 6 milestones...",
  metadata: {
    source: "wbb-programs.md",
    section: "Fast Track > Milestones",
    chunkIndex: 3,
    totalChunks: 12,
    createdAt: "2026-03-04",
    charCount: 247,
    documentTitle: "WBB Programs Overview",
  }
};
```

### Why Metadata Matters

1. **Source attribution**: Tell the user where the answer came from
2. **Filtering**: Search only within specific documents or sections
3. **Freshness**: Prefer newer chunks when information might be outdated
4. **Debugging**: When retrieval returns wrong results, metadata helps you figure out why

### Storing Metadata in ChromaDB

```javascript
import { ChromaClient } from "chromadb";

const client = new ChromaClient();
const collection = await client.getOrCreateCollection({ name: "wbb-docs" });

// Add chunks with metadata
await collection.add({
  ids: chunks.map((_, i) => `chunk-${i}`),
  documents: chunks.map(c => c.text),
  metadatas: chunks.map(c => c.metadata),
});

// Query with metadata filtering
const results = await collection.query({
  queryTexts: ["How many milestones in Fast Track?"],
  nResults: 3,
  where: { source: "wbb-programs.md" },  // Only search this document
});
```

---

## Choosing the Right Chunk Size

There is no universal answer, but here are guidelines:

### Small Chunks (200-500 chars)

- **Pros**: Highly specific, precise retrieval
- **Cons**: Lose context, more chunks to embed and store, may split ideas
- **Best for**: FAQ-style content, short factual documents

### Medium Chunks (500-1500 chars)

- **Pros**: Good balance of specificity and context
- **Cons**: Sometimes still splits ideas
- **Best for**: General-purpose RAG, documentation, articles

### Large Chunks (1500-3000 chars)

- **Pros**: Preserves full context and narrative flow
- **Cons**: Less precise retrieval, uses more of the context window
- **Best for**: Long-form content where context matters (legal, research)

### The Right Answer: Experiment

```javascript
// chunk-size-experiment.js
import { recursiveChunk } from "./chunkers/recursive.js";

const document = await fs.readFile("./documents/wbb-programs.md", "utf-8");

const sizes = [300, 500, 1000, 1500, 2000];

for (const size of sizes) {
  const chunks = recursiveChunk(document, size, Math.floor(size * 0.15));
  console.log(`Chunk size ${size}: ${chunks.length} chunks`);
  console.log(`  Avg chunk length: ${Math.round(chunks.reduce((sum, c) => sum + c.length, 0) / chunks.length)}`);
  console.log(`  Shortest: ${Math.min(...chunks.map(c => c.length))}`);
  console.log(`  Longest: ${Math.max(...chunks.map(c => c.length))}`);
  console.log();
}
```

Run this, then test retrieval quality with a set of known questions. The chunk size that retrieves the most relevant results for your specific data wins.

---

## A Complete Chunking Pipeline

Let us put it all together with a production-quality chunking pipeline that handles markdown files.

```javascript
// ingest.js
import { readdir, readFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { ChromaClient } from "chromadb";

// Recursive chunking with markdown awareness
function chunkDocument(text, source, chunkSize = 1000, overlap = 150) {
  const sections = text.split(/(?=^#{1,3}\s)/m);  // Split on headings
  const chunks = [];
  let chunkIndex = 0;

  for (const section of sections) {
    // Extract heading if present
    const headingMatch = section.match(/^(#{1,3})\s+(.+)/);
    const heading = headingMatch ? headingMatch[2].trim() : "Introduction";

    // If section is small enough, keep it whole
    if (section.length <= chunkSize) {
      chunks.push({
        id: `${source}-${chunkIndex}`,
        text: section.trim(),
        metadata: { source, heading, chunkIndex },
      });
      chunkIndex++;
      continue;
    }

    // Otherwise, split further on paragraphs
    const paragraphs = section.split("\n\n");
    let currentChunk = "";

    for (const para of paragraphs) {
      if ((currentChunk + "\n\n" + para).length > chunkSize && currentChunk) {
        chunks.push({
          id: `${source}-${chunkIndex}`,
          text: currentChunk.trim(),
          metadata: { source, heading, chunkIndex },
        });
        chunkIndex++;

        // Start new chunk with overlap
        const words = currentChunk.split(" ");
        const overlapText = words.slice(-30).join(" ");  // Last ~30 words
        currentChunk = overlapText + "\n\n" + para;
      } else {
        currentChunk = currentChunk ? currentChunk + "\n\n" + para : para;
      }
    }

    if (currentChunk.trim()) {
      chunks.push({
        id: `${source}-${chunkIndex}`,
        text: currentChunk.trim(),
        metadata: { source, heading, chunkIndex },
      });
      chunkIndex++;
    }
  }

  return chunks;
}

// Main ingestion pipeline
async function ingest(docsDir) {
  const client = new ChromaClient();
  const collection = await client.getOrCreateCollection({ name: "wbb-rag" });

  const files = (await readdir(docsDir)).filter(f => f.endsWith(".md"));

  let totalChunks = 0;

  for (const file of files) {
    const content = await readFile(join(docsDir, file), "utf-8");
    const chunks = chunkDocument(content, file);

    await collection.add({
      ids: chunks.map(c => c.id),
      documents: chunks.map(c => c.text),
      metadatas: chunks.map(c => c.metadata),
    });

    console.log(`Indexed ${file}: ${chunks.length} chunks`);
    totalChunks += chunks.length;
  }

  console.log(`\nTotal: ${totalChunks} chunks indexed`);
}

ingest("./documents");
```

```python
# ingest.py
import os
import re
import chromadb

def chunk_document(text: str, source: str, chunk_size: int = 1000) -> list[dict]:
    """Chunk a markdown document by headings, then by paragraphs."""
    sections = re.split(r"(?=^#{1,3}\s)", text, flags=re.MULTILINE)
    chunks = []
    chunk_index = 0

    for section in sections:
        heading_match = re.match(r"^(#{1,3})\s+(.+)", section)
        heading = heading_match.group(2).strip() if heading_match else "Introduction"

        if len(section) <= chunk_size:
            chunks.append({
                "id": f"{source}-{chunk_index}",
                "text": section.strip(),
                "metadata": {"source": source, "heading": heading, "chunk_index": chunk_index},
            })
            chunk_index += 1
            continue

        paragraphs = section.split("\n\n")
        current = ""

        for para in paragraphs:
            candidate = f"{current}\n\n{para}" if current else para
            if len(candidate) > chunk_size and current:
                chunks.append({
                    "id": f"{source}-{chunk_index}",
                    "text": current.strip(),
                    "metadata": {"source": source, "heading": heading, "chunk_index": chunk_index},
                })
                chunk_index += 1
                current = para
            else:
                current = candidate

        if current.strip():
            chunks.append({
                "id": f"{source}-{chunk_index}",
                "text": current.strip(),
                "metadata": {"source": source, "heading": heading, "chunk_index": chunk_index},
            })
            chunk_index += 1

    return chunks

def ingest(docs_dir: str):
    client = chromadb.Client()
    collection = client.get_or_create_collection("wbb-rag")

    total = 0
    for filename in os.listdir(docs_dir):
        if not filename.endswith(".md"):
            continue
        with open(os.path.join(docs_dir, filename)) as f:
            text = f.read()
        chunks = chunk_document(text, filename)
        collection.add(
            ids=[c["id"] for c in chunks],
            documents=[c["text"] for c in chunks],
            metadatas=[c["metadata"] for c in chunks],
        )
        print(f"Indexed {filename}: {len(chunks)} chunks")
        total += len(chunks)

    print(f"\nTotal: {total} chunks indexed")

ingest("./documents")
```

---

## Key Takeaways

- **Chunking determines retrieval quality.** If the right information is not in a chunk, it cannot be retrieved, and the LLM cannot use it.
- **Recursive character splitting** is the best default strategy. It respects natural text boundaries and works well across document types.
- **Semantic chunking** groups text by meaning, not by structure. Use it when topics shift without clear formatting cues.
- **Markdown-aware chunking** preserves heading hierarchy as metadata, which dramatically improves retrieval for structured documents.
- **Always add metadata** to your chunks: source file, section heading, chunk index, and creation date at minimum.
- **Overlap between chunks** prevents information loss at boundaries. Aim for 10-20% of chunk size.
- **There is no universal chunk size.** Experiment with your specific documents and questions. 500-1500 characters is a solid starting range.

---

## Try It Yourself

1. **Implement all four chunking strategies** and run them on the same document. Compare the output: which produces the most coherent chunks?

2. **Build a chunking benchmark.** Create 10 questions about a document. For each chunking strategy, check whether the correct answer is fully contained within at least one chunk. The strategy that captures the most answers wins.

3. **Add metadata enrichment.** Extend the markdown chunker to also extract: lists (bulleted items), code blocks (language and content), and links (URLs and anchor text).

4. **Measure chunk size distribution.** After chunking a real document, plot a histogram of chunk lengths. Are they evenly distributed, or are there outliers? What does the distribution tell you about your chunking strategy?

5. **Try token-based chunking.** Instead of character counts, use a tokenizer (like `tiktoken` for OpenAI models) to split by token count. This is more accurate for cost estimation and context window management.

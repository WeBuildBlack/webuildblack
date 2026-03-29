---
title: "Working with Long Context"
estimatedMinutes: 60
---

# Working with Long Context

One of Claude's standout capabilities is its 200K token context window. That is roughly 150,000 words, or the equivalent of a 500-page book, available in a single API call. This opens up use cases that simply are not possible with smaller context windows: analyzing entire codebases, processing lengthy legal documents, summarizing full research papers, and building Q&A systems over large document collections without external vector databases.

In this lesson, you will learn how to effectively use Claude's long context, process large documents, implement prompt caching to manage costs, and build practical applications that leverage this unique advantage.

---

## Understanding the 200K Context Window

### How Big Is 200K Tokens?

To put it in perspective:

| Content                                      | Approximate Tokens |
| -------------------------------------------- | ------------------ |
| A typical email                              | 200-500            |
| A blog post (2,000 words)                    | ~2,700             |
| A full JavaScript file (500 lines)           | ~3,500             |
| A README + docs for a small project          | ~5,000-10,000      |
| A novel (80,000 words)                       | ~107,000           |
| A full codebase (50 files, ~15K lines)       | ~100,000           |
| Claude's full context                        | 200,000            |

This means you can fit an entire codebase, a full book, or hundreds of pages of documentation into a single conversation.

### Context vs. Output Limits

Important distinction: the 200K limit is for the **total context** (input + output combined). The maximum **output** per response is typically 8,192 tokens (about 6,000 words). For some models and use cases, you can request up to 64K output tokens with extended thinking.

```javascript
// Context breakdown for a typical long-context call:
// Input: System prompt (2K) + Document (150K) + Question (100) = ~152K tokens
// Output: Up to 8,192 tokens for the response
// Total: ~160K tokens -- well within the 200K limit
```

---

## Loading and Processing Large Documents

### Reading Files into Context

Here is how to load documents and send them to Claude:

#### JavaScript

```javascript
import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "fs/promises";

const anthropic = new Anthropic();

async function analyzeDocument(filePath, question) {
  const document = await readFile(filePath, "utf-8");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system:
      "You are a document analyst. Answer questions about the provided document accurately. Always cite specific sections or quotes from the document to support your answers.",
    messages: [
      {
        role: "user",
        content: `Here is the document to analyze:\n\n<document>\n${document}\n</document>\n\nQuestion: ${question}`,
      },
    ],
  });

  return {
    answer: response.content[0].text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

const result = await analyzeDocument(
  "./contracts/service-agreement.txt",
  "What are the termination clauses in this agreement?"
);
console.log(result.answer);
console.log(`Input tokens: ${result.inputTokens}`);
```

#### Python

```python
import anthropic
from pathlib import Path

client = anthropic.Anthropic()

def analyze_document(file_path: str, question: str) -> dict:
    document = Path(file_path).read_text()

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system="You are a document analyst. Answer questions about the provided document accurately. Always cite specific sections or quotes from the document to support your answers.",
        messages=[
            {
                "role": "user",
                "content": f"Here is the document to analyze:\n\n<document>\n{document}\n</document>\n\nQuestion: {question}"
            }
        ]
    )

    return {
        "answer": response.content[0].text,
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens
    }

result = analyze_document(
    "./contracts/service-agreement.txt",
    "What are the termination clauses in this agreement?"
)
print(result["answer"])
```

### Processing Multiple Files

Analyze an entire codebase or document set:

```javascript
import Anthropic from "@anthropic-ai/sdk";
import { readFile, readdir } from "fs/promises";
import path from "path";

const anthropic = new Anthropic();

async function loadCodebase(directory, extensions = [".js", ".ts", ".jsx", ".tsx"]) {
  const files = [];

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
        await walk(fullPath);
      } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
        const content = await readFile(fullPath, "utf-8");
        files.push({ path: fullPath, content });
      }
    }
  }

  await walk(directory);
  return files;
}

async function analyzeCodebase(directory, question) {
  const files = await loadCodebase(directory);

  // Format files for the prompt
  const codebaseText = files
    .map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join("\n\n");

  console.log(`Loaded ${files.length} files`);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: `You are a senior software engineer reviewing a codebase. Provide thorough, actionable analysis with specific file and line references.`,
    messages: [
      {
        role: "user",
        content: `Here is the complete codebase:\n\n${codebaseText}\n\n${question}`,
      },
    ],
  });

  return {
    analysis: response.content[0].text,
    filesAnalyzed: files.length,
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
  };
}

// Usage
const result = await analyzeCodebase(
  "./src",
  "Review this codebase for security vulnerabilities, performance issues, and architectural concerns. Prioritize the most critical issues."
);
console.log(result.analysis);
```

---

## Prompt Caching for Long Context

Here is the cost problem with long context: if you load a 100K-token document and ask 10 questions about it, you pay for 100K input tokens **ten times**. That adds up fast.

Anthropic's **prompt caching** solves this. When you mark content for caching, the first request pays full price, but subsequent requests that share the same cached prefix get a 90% discount on those tokens.

### How Prompt Caching Works

```
First request:
  System prompt (cached) + Document (cached) + Question 1
  Cost: Full price for writing to cache + normal for question

Second request:
  System prompt (cache hit!) + Document (cache hit!) + Question 2
  Cost: 90% discount on cached tokens + normal for question

Third request through tenth:
  Same pattern -- 90% discount on the cached portion each time
```

### JavaScript: Implementing Prompt Caching

```javascript
import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "fs/promises";

const anthropic = new Anthropic();

async function createCachedDocumentChat(documentPath) {
  const document = await readFile(documentPath, "utf-8");

  // The system prompt with cache_control on the document
  const system = [
    {
      type: "text",
      text: "You are a document analyst for We Build Black. Answer questions about the provided document with specific citations.",
    },
    {
      type: "text",
      text: `<document>\n${document}\n</document>`,
      cache_control: { type: "ephemeral" },
    },
  ];

  async function ask(question) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system,
      messages: [{ role: "user", content: question }],
    });

    return {
      answer: response.content[0].text,
      usage: response.usage,
      // Check if cache was used
      cacheCreated: response.usage.cache_creation_input_tokens || 0,
      cacheRead: response.usage.cache_read_input_tokens || 0,
    };
  }

  return { ask };
}

// Usage -- ask multiple questions about the same document
const chat = await createCachedDocumentChat("./large-report.txt");

// First call: creates the cache (slightly more expensive)
const r1 = await chat.ask("What are the key findings of this report?");
console.log("Q1:", r1.answer);
console.log("Cache created:", r1.cacheCreated, "tokens");

// Second call: reads from cache (90% cheaper on cached portion)
const r2 = await chat.ask("What recommendations does the report make?");
console.log("Q2:", r2.answer);
console.log("Cache read:", r2.cacheRead, "tokens");

// Third call: still using cache
const r3 = await chat.ask("Summarize the methodology section.");
console.log("Q3:", r3.answer);
console.log("Cache read:", r3.cacheRead, "tokens");
```

### Python: Implementing Prompt Caching

```python
import anthropic
from pathlib import Path

client = anthropic.Anthropic()

def create_cached_document_chat(document_path: str):
    document = Path(document_path).read_text()

    system = [
        {
            "type": "text",
            "text": "You are a document analyst. Answer questions with specific citations."
        },
        {
            "type": "text",
            "text": f"<document>\n{document}\n</document>",
            "cache_control": {"type": "ephemeral"}
        }
    ]

    def ask(question: str) -> dict:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            system=system,
            messages=[{"role": "user", "content": question}]
        )

        return {
            "answer": response.content[0].text,
            "cache_created": getattr(response.usage, 'cache_creation_input_tokens', 0),
            "cache_read": getattr(response.usage, 'cache_read_input_tokens', 0),
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens
        }

    return ask

# Usage
ask = create_cached_document_chat("./large-report.txt")

r1 = ask("What are the key findings?")
print(f"Q1 answer: {r1['answer'][:200]}...")
print(f"Cache created: {r1['cache_created']} tokens")

r2 = ask("What recommendations are made?")
print(f"Q2 answer: {r2['answer'][:200]}...")
print(f"Cache read: {r2['cache_read']} tokens -- saved money!")
```

### Caching Cost Breakdown

| Token Type           | Price (Claude Sonnet)  |
| -------------------- | ---------------------- |
| Regular input        | $3 / million tokens    |
| Cache write          | $3.75 / million tokens |
| Cache read           | $0.30 / million tokens |
| Output               | $15 / million tokens   |

If you ask 10 questions about a 100K-token document:

- **Without caching**: 100K x 10 x $3/M = **$3.00** in input costs
- **With caching**: 100K x $3.75/M (first) + 100K x 9 x $0.30/M (cache reads) = $0.375 + $0.27 = **$0.645**

That is a **78% savings** for just 10 questions. The more questions you ask, the more you save.

> **Important:** Prompt caching requires a minimum of 1,024 tokens for Claude Sonnet/Opus (2,048 for Haiku). If your cached content is shorter, caching silently does nothing.

### Cache TTL

Cached content persists for approximately 5 minutes of inactivity. If you make a request using the cached prefix within that window, the TTL resets. This means active sessions stay cached, but idle ones expire to save Anthropic's resources.

---

## Long-Form Document Analysis Patterns

> **Tip:** Research shows that information in the middle of very long contexts can receive less attention (the "lost in the middle" phenomenon). Place your most important content at the beginning or end of the context for best results.

### Pattern 1: Structured Extraction

Extract structured data from long documents:

```javascript
async function extractFromDocument(document, schema) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: `You are a data extraction specialist. Extract information from documents into the exact JSON format specified. If a field cannot be determined from the document, use null.`,
      },
      {
        type: "text",
        text: `<document>\n${document}\n</document>`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Extract the following information into JSON format:\n\n${JSON.stringify(schema, null, 2)}\n\nReturn only valid JSON, no additional text.`,
      },
    ],
  });

  return JSON.parse(response.content[0].text);
}

// Extract structured data from a grant proposal
const grantData = await extractFromDocument(grantProposal, {
  organization_name: "string",
  grant_amount_requested: "number",
  project_title: "string",
  project_duration_months: "number",
  target_beneficiaries: "number",
  key_objectives: ["string"],
  budget_categories: [
    {
      category: "string",
      amount: "number",
    },
  ],
});
```

### Pattern 2: Multi-Pass Analysis

For very complex analysis, break it into passes:

```javascript
async function deepAnalysis(document) {
  const system = [
    {
      type: "text",
      text: "You are an expert analyst.",
    },
    {
      type: "text",
      text: `<document>\n${document}\n</document>`,
      cache_control: { type: "ephemeral" },
    },
  ];

  // Pass 1: High-level summary
  const summary = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system,
    messages: [
      {
        role: "user",
        content: "Provide a high-level summary of this document in 3-5 bullet points.",
      },
    ],
  });

  // Pass 2: Detailed findings (cache hit on document)
  const findings = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system,
    messages: [
      {
        role: "user",
        content:
          "List every specific claim, data point, or recommendation in this document. Include page/section references where possible.",
      },
    ],
  });

  // Pass 3: Critical analysis (cache hit again)
  const critique = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system,
    messages: [
      {
        role: "user",
        content:
          "What are the strengths and weaknesses of the arguments in this document? Are there any gaps, contradictions, or unsupported claims?",
      },
    ],
  });

  return {
    summary: summary.content[0].text,
    findings: findings.content[0].text,
    critique: critique.content[0].text,
  };
}
```

### Pattern 3: Comparative Analysis

Compare multiple documents in a single context:

```javascript
async function compareDocuments(doc1, doc1Name, doc2, doc2Name) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system:
      "You are a document comparison specialist. Identify similarities, differences, and conflicts between documents.",
    messages: [
      {
        role: "user",
        content: `Compare these two documents:

<document_1 name="${doc1Name}">
${doc1}
</document_1>

<document_2 name="${doc2Name}">
${doc2}
</document_2>

Provide:
1. Key similarities
2. Key differences
3. Any contradictions or conflicts
4. Which document is more comprehensive on each topic`,
      },
    ],
  });

  return response.content[0].text;
}
```

---

## Handling Context Window Limits

Even 200K tokens has limits. Here is how to handle documents that exceed the context:

### Strategy 1: Chunking with Overlap

```javascript
function chunkDocument(text, maxChunkTokens = 50000, overlapTokens = 1000) {
  // Rough approximation: 1 token ≈ 4 characters
  const charsPerToken = 4;
  const maxChunkChars = maxChunkTokens * charsPerToken;
  const overlapChars = overlapTokens * charsPerToken;

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxChunkChars;

    // Try to break at a paragraph boundary
    if (end < text.length) {
      const lastParagraph = text.lastIndexOf("\n\n", end);
      if (lastParagraph > start + maxChunkChars * 0.8) {
        end = lastParagraph;
      }
    }

    chunks.push({
      index: chunks.length,
      text: text.slice(start, end),
      startChar: start,
      endChar: Math.min(end, text.length),
    });

    start = end - overlapChars;
  }

  return chunks;
}

async function analyzeOversizedDocument(document, question) {
  const chunks = chunkDocument(document);
  console.log(`Document split into ${chunks.length} chunks`);

  // Analyze each chunk
  const chunkResults = [];

  for (const chunk of chunks) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system:
        "You are analyzing a section of a larger document. Extract relevant information for the question. Note: this is a partial view -- do not assume this is the complete document.",
      messages: [
        {
          role: "user",
          content: `Document section ${chunk.index + 1} of ${chunks.length}:\n\n<section>\n${chunk.text}\n</section>\n\nQuestion: ${question}\n\nExtract any relevant information from this section. If this section does not contain relevant information, respond with "No relevant information in this section."`,
        },
      ],
    });

    chunkResults.push({
      chunkIndex: chunk.index,
      analysis: response.content[0].text,
    });
  }

  // Synthesize results
  const relevantResults = chunkResults.filter(
    (r) => !r.analysis.includes("No relevant information")
  );

  const synthesis = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `I analyzed a large document in sections. Here are the relevant findings from each section:\n\n${relevantResults.map((r) => `### Section ${r.chunkIndex + 1}\n${r.analysis}`).join("\n\n")}\n\nNow synthesize these findings into a comprehensive answer to the original question: ${question}`,
      },
    ],
  });

  return synthesis.content[0].text;
}
```

### Strategy 2: Map-Reduce Summarization

```python
import anthropic

client = anthropic.Anthropic()

def map_reduce_summarize(document: str, chunk_size: int = 50000) -> str:
    """Summarize a document that may exceed the context window."""

    # Rough token approximation
    chars_per_chunk = chunk_size * 4
    chunks = []
    for i in range(0, len(document), chars_per_chunk):
        chunks.append(document[i:i + chars_per_chunk])

    if len(chunks) == 1:
        # Fits in context -- direct summarization
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[
                {"role": "user", "content": f"Summarize this document:\n\n{document}"}
            ]
        )
        return response.content[0].text

    # MAP phase: summarize each chunk
    print(f"Map phase: summarizing {len(chunks)} chunks...")
    chunk_summaries = []

    for i, chunk in enumerate(chunks):
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            messages=[
                {
                    "role": "user",
                    "content": f"Summarize this section (part {i + 1} of {len(chunks)}):\n\n{chunk}"
                }
            ]
        )
        chunk_summaries.append(response.content[0].text)
        print(f"  Chunk {i + 1}/{len(chunks)} summarized")

    # REDUCE phase: combine summaries
    print("Reduce phase: combining summaries...")
    combined = "\n\n---\n\n".join(
        [f"## Section {i + 1} Summary\n{s}" for i, s in enumerate(chunk_summaries)]
    )

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": f"These are summaries of different sections of one large document. Create a unified, coherent summary:\n\n{combined}"
            }
        ]
    )

    return response.content[0].text
```

---

## Practical Example: Codebase Q&A System

Build a system where users can ask questions about an entire codebase:

```javascript
import Anthropic from "@anthropic-ai/sdk";
import { readFile, readdir } from "fs/promises";
import path from "path";

const anthropic = new Anthropic();

class CodebaseQA {
  constructor(projectDir) {
    this.projectDir = projectDir;
    this.codebaseText = null;
    this.system = null;
  }

  async load(extensions = [".js", ".ts", ".jsx", ".tsx", ".css", ".html"]) {
    const files = [];
    await this.walkDir(this.projectDir, files, extensions);

    this.codebaseText = files
      .map((f) => `## ${f.relativePath}\n\`\`\`${f.ext}\n${f.content}\n\`\`\``)
      .join("\n\n");

    this.system = [
      {
        type: "text",
        text: `You are a senior developer who has deep knowledge of this codebase. Answer questions accurately by referencing specific files and code sections. If you are not sure about something, say so.`,
      },
      {
        type: "text",
        text: `<codebase>\n${this.codebaseText}\n</codebase>`,
        cache_control: { type: "ephemeral" },
      },
    ];

    console.log(`Loaded ${files.length} files from ${this.projectDir}`);
    return files.length;
  }

  async walkDir(dir, files, extensions) {
    const skipDirs = ["node_modules", ".git", "dist", "build", ".next"];
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(this.projectDir, fullPath);

      if (entry.isDirectory() && !skipDirs.includes(entry.name)) {
        await this.walkDir(fullPath, files, extensions);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          const content = await readFile(fullPath, "utf-8");
          files.push({ relativePath, content, ext: ext.slice(1) });
        }
      }
    }
  }

  async ask(question) {
    if (!this.system) {
      throw new Error("Call load() first");
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: this.system,
      messages: [{ role: "user", content: question }],
    });

    return {
      answer: response.content[0].text,
      cached: (response.usage.cache_read_input_tokens || 0) > 0,
      inputTokens: response.usage.input_tokens,
    };
  }
}

// Usage
const qa = new CodebaseQA("./src");
await qa.load();

// First question -- creates cache
const r1 = await qa.ask("What is the main entry point of this application and how does routing work?");
console.log(r1.answer);
console.log("Cached:", r1.cached); // false (first call)

// Second question -- uses cache (90% cheaper)
const r2 = await qa.ask("Are there any potential security vulnerabilities in the authentication code?");
console.log(r2.answer);
console.log("Cached:", r2.cached); // true
```

---

## Key Takeaways

1. **200K tokens is massive.** You can fit entire codebases, books, or hundreds of pages of documentation in a single API call.
2. **Prompt caching is essential for long context.** Without it, repeated queries over the same document are prohibitively expensive. With caching, you save up to 90% on repeated input tokens.
3. **Use `cache_control: { type: "ephemeral" }`** on the content blocks you want cached. Place static content (documents, code) in the cached portion and dynamic content (questions) outside it.
4. **Output is still limited.** Even with 200K input context, output is capped at ~8K tokens per response. Plan your prompts accordingly.
5. **Chunk oversized documents.** When content exceeds the context window, use chunking with overlap or map-reduce patterns to process it in pieces.
6. **Structure your prompts.** Use XML tags like `<document>` and `<codebase>` to clearly delineate content from instructions. Claude responds well to this structure.
7. **Cache has a TTL.** Cached content expires after ~5 minutes of inactivity. Keep sessions active to maintain the cache.

---

## Try It Yourself

1. **Document Q&A**: Pick a long document you have access to (a contract, a technical specification, a research paper). Load it into Claude's context and ask five different questions about it. Track the cache usage across calls.

2. **Codebase Analysis**: Use the `CodebaseQA` class to load one of your projects. Ask Claude to find bugs, suggest improvements, and explain the architecture.

3. **Cost Comparison**: Run the same 5-question document analysis with and without prompt caching. Calculate the exact cost difference.

4. **Chunking Implementation**: Take a document that exceeds 200K tokens (or simulate one by concatenating multiple documents). Implement the chunking strategy and verify that you get comprehensive answers.

5. **Build a CLI Tool**: Create a command-line tool that takes a directory path and a question as arguments, loads the codebase, and returns Claude's analysis. Add a `--interactive` flag for multi-question sessions that benefit from caching.

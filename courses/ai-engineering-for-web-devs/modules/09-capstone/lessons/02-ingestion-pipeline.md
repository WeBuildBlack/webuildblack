---
title: "Building the Document Ingestion Pipeline"
estimatedMinutes: 75
---

## Introduction

Now that your project is scaffolded and your database is ready, it is time to build the first major feature: document ingestion. This is the pipeline that takes a user's uploaded file and transforms it into searchable, AI-ready data.

The ingestion pipeline has four stages:

1. **Upload** -- Accept a file from the user
2. **Extract** -- Pull raw text out of the file (PDF, markdown, plain text)
3. **Chunk** -- Split the text into overlapping segments
4. **Embed & Store** -- Generate vector embeddings and save everything to Supabase

By the end of this lesson, a user will be able to upload a document and have it fully indexed and ready for semantic search.

---

## Stage 1: File Parsing

Different file types require different parsing strategies. Let's build a unified file parser.

### The File Parser Module

```typescript
// src/lib/utils/file-parser.ts
import pdfParse from 'pdf-parse';

export interface ParsedFile {
  text: string;
  title: string;
  fileType: string;
  fileSize: number;
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const fileType = file.name.split('.').pop()?.toLowerCase() || 'unknown';
  const fileSize = file.size;
  const title = file.name.replace(/\.[^/.]+$/, ''); // Remove extension

  let text: string;

  switch (fileType) {
    case 'pdf':
      text = await parsePDF(file);
      break;
    case 'md':
    case 'txt':
      text = await file.text();
      break;
    case 'docx':
      text = await parseDOCX(file);
      break;
    default:
      throw new Error(`Unsupported file type: .${fileType}`);
  }

  // Clean up the extracted text
  text = cleanText(text);

  if (text.length < 50) {
    throw new Error('File contains too little text to be useful. Minimum 50 characters required.');
  }

  return { text, title, fileType, fileSize };
}

async function parsePDF(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await pdfParse(buffer);
  return result.text;
}

async function parseDOCX(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')           // Normalize line endings
    .replace(/\n{3,}/g, '\n\n')       // Collapse multiple blank lines
    .replace(/[ \t]{2,}/g, ' ')       // Collapse multiple spaces
    .replace(/\u0000/g, '')           // Remove null bytes
    .trim();
}
```

**Why clean the text?** PDF extraction is notoriously messy. You will get random double spaces, null bytes from encoded fonts, and excessive line breaks. Cleaning the text before chunking improves both the quality of your chunks and the relevance of your embeddings.

---

## Stage 2: Text Chunking

Chunking is one of the most important decisions in a RAG pipeline. Chunks that are too small lose context. Chunks that are too large dilute the signal and waste tokens.

### Chunking Strategy

We are going to use a **recursive character splitter** with these parameters:

- **Chunk size**: 1000 characters (~200-250 tokens)
- **Chunk overlap**: 200 characters
- **Split hierarchy**: Try to split on paragraphs first, then sentences, then words

The overlap ensures that information at chunk boundaries is not lost. If a key concept spans two chunks, the overlap means it will appear fully in at least one of them.

### The Chunking Module

```typescript
// src/lib/ai/chunking.ts
import { CHUNK_SIZE, CHUNK_OVERLAP } from '@/lib/utils/constants';

export interface TextChunk {
  content: string;
  index: number;
  metadata: {
    startChar: number;
    endChar: number;
    wordCount: number;
  };
}

const SEPARATORS = ['\n\n', '\n', '. ', '! ', '? ', '; ', ', ', ' '];

export function chunkText(
  text: string,
  chunkSize: number = CHUNK_SIZE,
  overlap: number = CHUNK_OVERLAP
): TextChunk[] {
  if (text.length <= chunkSize) {
    return [{
      content: text,
      index: 0,
      metadata: {
        startChar: 0,
        endChar: text.length,
        wordCount: text.split(/\s+/).length,
      },
    }];
  }

  const chunks: TextChunk[] = [];
  const rawChunks = recursiveSplit(text, chunkSize, overlap);

  let charPosition = 0;
  for (let i = 0; i < rawChunks.length; i++) {
    const content = rawChunks[i].trim();
    if (content.length === 0) continue;

    // Find where this chunk starts in the original text
    const startChar = text.indexOf(content.substring(0, 50), charPosition);
    const actualStart = startChar >= 0 ? startChar : charPosition;

    chunks.push({
      content,
      index: chunks.length,
      metadata: {
        startChar: actualStart,
        endChar: actualStart + content.length,
        wordCount: content.split(/\s+/).length,
      },
    });

    // Move position forward (accounting for overlap)
    charPosition = actualStart + content.length - overlap;
  }

  return chunks;
}

function recursiveSplit(
  text: string,
  chunkSize: number,
  overlap: number,
  separatorIndex: number = 0
): string[] {
  if (text.length <= chunkSize) {
    return [text];
  }

  const separator = SEPARATORS[separatorIndex] || '';
  const parts = separator ? text.split(separator) : [...text];

  const chunks: string[] = [];
  let currentChunk = '';

  for (const part of parts) {
    const addition = currentChunk ? separator + part : part;

    if ((currentChunk + addition).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk);

      // Start next chunk with overlap from the end of current chunk
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + separator + part;
    } else {
      currentChunk += addition;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk);
  }

  // If any chunk is still too large, split with the next separator
  if (separatorIndex < SEPARATORS.length - 1) {
    return chunks.flatMap(chunk =>
      chunk.length > chunkSize
        ? recursiveSplit(chunk, chunkSize, overlap, separatorIndex + 1)
        : [chunk]
    );
  }

  return chunks;
}
```

### Why Recursive Splitting Works

Consider this document excerpt:

```
Machine learning is a subset of artificial intelligence.
It allows computers to learn from data without being
explicitly programmed.

Deep learning is a subset of machine learning that uses
neural networks with many layers. These networks can
learn complex patterns in large amounts of data.
```

A naive character split might cut "explicitly" in half. The recursive splitter tries `\n\n` first (paragraph breaks), then falls back to `\n`, then `. ` (sentence endings), and so on. The result is chunks that respect natural text boundaries.

### Python Alternative

If you prefer Python for your ingestion pipeline (many teams use Python for backend processing), here is the equivalent using LangChain:

```python
# ingest.py
from langchain.text_splitter import RecursiveCharacterTextSplitter

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[dict]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap,
        separators=["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " "],
        length_function=len,
    )

    documents = splitter.create_documents([text])

    return [
        {
            "content": doc.page_content,
            "index": i,
            "metadata": {
                "start_char": doc.metadata.get("start_index", 0),
                "word_count": len(doc.page_content.split()),
            }
        }
        for i, doc in enumerate(documents)
    ]

# Usage
chunks = chunk_text(raw_text)
print(f"Created {len(chunks)} chunks from document")
```

---

## Stage 3: Generating Embeddings

Each chunk needs to be converted into a vector embedding so we can perform semantic search later.

### The Embeddings Module

```typescript
// src/lib/ai/embeddings.ts
import OpenAI from 'openai';
import { EMBEDDING_MODEL } from '@/lib/utils/constants';

const openai = new OpenAI();

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });

  return response.data[0].embedding;
}

export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  // OpenAI supports batch embedding -- up to 2048 inputs at once
  // But we'll batch in groups of 100 to stay safe on token limits
  const BATCH_SIZE = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });

    const embeddings = response.data
      .sort((a, b) => a.index - b.index)
      .map(item => item.embedding);

    allEmbeddings.push(...embeddings);

    // Log progress for large documents
    if (texts.length > BATCH_SIZE) {
      console.log(
        `Embedded ${Math.min(i + BATCH_SIZE, texts.length)}/${texts.length} chunks`
      );
    }
  }

  return allEmbeddings;
}
```

### Cost Awareness

The `text-embedding-3-small` model costs $0.02 per 1M tokens. A typical 10-page PDF produces about 20-30 chunks of ~200 tokens each. That is roughly 5,000 tokens, costing $0.0001. You could embed 10,000 documents for about $1.

The Python equivalent using the OpenAI SDK directly:

```python
# embeddings.py
import openai
from typing import List

client = openai.OpenAI()

def generate_embeddings(texts: List[str], model: str = "text-embedding-3-small") -> List[List[float]]:
    """Generate embeddings for a list of texts in batches."""
    BATCH_SIZE = 100
    all_embeddings = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i + BATCH_SIZE]

        response = client.embeddings.create(
            model=model,
            input=batch
        )

        # Sort by index to maintain order
        sorted_data = sorted(response.data, key=lambda x: x.index)
        embeddings = [item.embedding for item in sorted_data]
        all_embeddings.extend(embeddings)

        print(f"Embedded {min(i + BATCH_SIZE, len(texts))}/{len(texts)} chunks")

    return all_embeddings
```

---

## Stage 4: The Ingestion API Route

Now let's wire everything together into a single API route that handles the full pipeline.

```typescript
// src/app/api/ingest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { parseFile } from '@/lib/utils/file-parser';
import { chunkText } from '@/lib/ai/chunking';
import { generateEmbeddings } from '@/lib/ai/embeddings';

export const maxDuration = 60; // Allow up to 60s for large files

export async function POST(request: NextRequest) {
  try {
    // 1. Get the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    // > **Security Note:** Reading `userId` from the request body is a temporary
    // > shortcut. In Lesson 04, we'll add Supabase Auth and get the `userId`
    // > from the authenticated session instead. Never trust user-submitted
    // > identity in production.

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    console.log(`Starting ingestion for: ${file.name} (${file.size} bytes)`);

    // 2. Parse the file
    const parsed = await parseFile(file);
    console.log(`Extracted ${parsed.text.length} characters from ${parsed.fileType}`);

    // 3. Chunk the text
    const chunks = chunkText(parsed.text);
    console.log(`Created ${chunks.length} chunks`);

    // 4. Generate embeddings for all chunks
    const chunkTexts = chunks.map(c => c.content);
    const embeddings = await generateEmbeddings(chunkTexts);
    console.log(`Generated ${embeddings.length} embeddings`);

    // 5. Store everything in Supabase
    const supabase = createServiceClient();

    // Create the document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        title: parsed.title,
        file_type: parsed.fileType,
        file_size: parsed.fileSize,
        chunk_count: chunks.length,
      })
      .select()
      .single();

    if (docError) {
      throw new Error(`Failed to create document: ${docError.message}`);
    }

    // Insert chunks with embeddings
    const chunkRecords = chunks.map((chunk, i) => ({
      document_id: document.id,
      content: chunk.content,
      chunk_index: chunk.index,
      embedding: JSON.stringify(embeddings[i]),
      metadata: chunk.metadata,
    }));

    // Insert in batches of 50 (Supabase has row limits)
    const BATCH_SIZE = 50;
    for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
      const batch = chunkRecords.slice(i, i + BATCH_SIZE);
      const { error: chunkError } = await supabase
        .from('chunks')
        .insert(batch);

      if (chunkError) {
        // Clean up the document if chunk insertion fails
        await supabase.from('documents').delete().eq('id', document.id);
        throw new Error(`Failed to insert chunks: ${chunkError.message}`);
      }
    }

    console.log(`Successfully ingested "${parsed.title}" (${chunks.length} chunks)`);

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        chunkCount: chunks.length,
        fileType: parsed.fileType,
      },
    });
  } catch (error) {
    console.error('Ingestion error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ingestion failed' },
      { status: 500 }
    );
  }
}
```

### Important Details

**`maxDuration = 60`**: Vercel's free tier (Hobby plan) allows up to 60 seconds for serverless functions. The Pro plan extends this to 300 seconds. For very large PDFs with many chunks, you might need the extra time, or consider processing files asynchronously.

**Cleanup on failure**: If chunk insertion fails partway through, we delete the document record to avoid orphaned data. This is a basic form of transaction management since Supabase does not support multi-table transactions through the JS client.

**Batch insertion**: We insert chunks in batches of 50 to avoid hitting Supabase's request size limits.

---

## Building the Upload UI

Now let's create a simple but functional upload component:

```tsx
// src/components/documents/UploadForm.tsx
'use client';

import { useState, useRef } from 'react';

interface UploadFormProps {
  userId: string;
  onUploadComplete: () => void;
}

export function UploadForm({ userId, onUploadComplete }: UploadFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Please select a file');
      return;
    }

    // Validate file type
    const allowedTypes = ['pdf', 'md', 'txt', 'docx'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !allowedTypes.includes(ext)) {
      setError(`Unsupported file type. Allowed: ${allowedTypes.join(', ')}`);
      return;
    }

    setIsUploading(true);
    setProgress('Uploading and processing...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);

      const response = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setProgress(
        `Success! "${result.document.title}" processed into ${result.document.chunkCount} chunks.`
      );

      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Notify parent to refresh the document list
      onUploadComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleUpload} className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.md,.txt,.docx"
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-amber-50 file:text-amber-700
            hover:file:bg-amber-100"
          disabled={isUploading}
        />
        <p className="mt-2 text-sm text-gray-500">
          PDF, Markdown, Text, or Word files up to 10MB
        </p>
      </div>

      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}

      {progress && !error && (
        <p className="text-green-600 text-sm">{progress}</p>
      )}

      <button
        type="submit"
        disabled={isUploading}
        className="w-full py-2 px-4 bg-amber-700 text-white rounded-md
          hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors"
      >
        {isUploading ? 'Processing...' : 'Upload & Index'}
      </button>
    </form>
  );
}
```

---

## Testing the Pipeline

Let's verify that the entire pipeline works end to end.

### Manual Test with cURL

You can test the ingestion API directly from the command line:

```bash
# Create a test file
echo "Artificial intelligence is transforming every industry.
Machine learning models can now generate text, images, and code.
The transformer architecture, introduced in 2017, was a breakthrough
that enabled models like GPT and BERT to understand language at scale.

Embeddings are numerical representations of text that capture semantic
meaning. Similar texts have similar embeddings. This property enables
semantic search, where you find documents by meaning rather than
exact keyword matching.

RAG (Retrieval-Augmented Generation) combines the knowledge stored in
a vector database with the reasoning capabilities of a large language
model. Instead of relying solely on the LLM's training data, RAG
retrieves relevant context at query time." > test-doc.txt

# Upload it
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@test-doc.txt" \
  -F "userId=your-test-user-id"
```

### Verify in Supabase

After a successful upload, check the Supabase dashboard:

1. **Documents table**: You should see a new row with the file title, type, and chunk count
2. **Chunks table**: You should see multiple rows linked to that document, each with content and an embedding vector

Run this query in the SQL Editor to inspect:

```sql
SELECT
  d.title,
  d.chunk_count,
  c.chunk_index,
  LEFT(c.content, 100) as preview,
  ARRAY_LENGTH(c.embedding::real[], 1) as embedding_dimensions
FROM documents d
JOIN chunks c ON c.document_id = d.id
ORDER BY c.chunk_index;
```

You should see each chunk's preview and confirm that embeddings have 1536 dimensions.

---

## Performance Considerations

### Embedding Cost Optimization

For production apps, consider these optimizations:

```typescript
// Check if a document has already been ingested (by content hash)
import { createHash } from 'crypto';

function contentHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

// Before ingesting, check if the hash already exists
const { data: existing } = await supabase
  .from('documents')
  .select('id')
  .eq('content_hash', contentHash(parsedText))
  .single();

if (existing) {
  return { message: 'Document already ingested', documentId: existing.id };
}
```

### Chunking Quality Checks

Add validation to catch bad chunks before embedding:

```typescript
function validateChunks(chunks: TextChunk[]): TextChunk[] {
  return chunks.filter(chunk => {
    // Remove chunks that are too short to be useful
    if (chunk.content.length < 50) return false;

    // Remove chunks that are mostly whitespace
    const nonWhitespace = chunk.content.replace(/\s/g, '');
    if (nonWhitespace.length / chunk.content.length < 0.3) return false;

    // Remove chunks that are mostly special characters
    const alphanumeric = chunk.content.replace(/[^a-zA-Z0-9]/g, '');
    if (alphanumeric.length / chunk.content.length < 0.2) return false;

    return true;
  });
}
```

---

## Key Takeaways

- The ingestion pipeline has four clear stages: **upload, extract, chunk, and embed**. Each stage is isolated and testable.
- **Text chunking** is one of the most impactful decisions in RAG. Recursive splitting with overlap produces chunks that respect natural text boundaries.
- **Batch embedding** is more efficient and cheaper than embedding one chunk at a time. The OpenAI API supports up to 2048 inputs per call.
- Always include **error handling and cleanup** -- if any stage fails, the system should not leave behind orphaned data.
- **Validate your chunks** before embedding to avoid wasting tokens on garbage data from bad PDF extraction.

---

## Try It Yourself

1. **Ingest a real document**: Find a PDF you have (a research paper, a tutorial, your resume) and upload it through the pipeline. Inspect the chunks in Supabase. Are they well-formed? Do they break at natural boundaries?

2. **Experiment with chunk sizes**: Change `CHUNK_SIZE` to 500 and then 2000. Re-ingest the same document and compare the chunks. Which size produces chunks that feel like complete thoughts?

3. **Add a new file type**: Extend `parseFile()` to handle `.csv` files. Convert each row into a text representation and chunk accordingly.

4. **Build a progress indicator**: The current upload form shows "Processing..." but gives no detail. Modify the API to use Server-Sent Events (SSE) to stream progress updates: "Parsing file...", "Created 24 chunks...", "Generating embeddings...", "Done!"

5. **Handle duplicates**: Implement the content hash approach described above so that uploading the same document twice does not create duplicate entries.

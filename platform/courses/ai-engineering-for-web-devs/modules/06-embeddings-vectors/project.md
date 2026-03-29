---
title: "Module Project: Smart Bookmark Search"
estimatedMinutes: 75
---

## Module Project: Smart Bookmark Search

Build a semantic search engine for your personal bookmark and notes collection. By the end of this project, you'll have a working tool that reads a folder of markdown/text files, chunks and embeds them, stores the vectors in Supabase (pgvector), and lets you search by meaning through an API endpoint and a simple browser UI. This is your first end-to-end embeddings project -- and you walk away with something genuinely useful.

---

## What You'll Practice

- Generating embeddings with the OpenAI API (Lesson 2: Generating Embeddings)
- Chunking text at natural boundaries with overlap (Lesson 2: Preprocessing Text)
- Storing vectors in Supabase with pgvector (Lesson 3: Vector Databases)
- Writing a `match_documents` similarity search function in SQL (Lesson 3: Querying for Similar Documents)
- Building a semantic search pipeline end-to-end (Lesson 4: Building Semantic Search)
- Computing and interpreting cosine similarity scores (Lesson 1: Measuring Similarity)

---

## Prerequisites

Before you start, make sure you have:

- **Node.js 18+** installed (`node --version`)
- **An OpenAI API key** with access to the embeddings endpoint
- **A Supabase project** (free tier works) -- sign up at [supabase.com](https://supabase.com)
- **5-10 markdown or text files** to use as your "bookmarks" collection. Could be notes you've taken, blog posts you've saved, README files from repos you like, or anything you'd want to search through. If you don't have any, create 8-10 short `.md` files on different topics (tech tutorials, recipes, career advice, etc.)

### Setup

```bash
# Create your project
mkdir smart-bookmark-search && cd smart-bookmark-search
npm init -y
npm install openai @supabase/supabase-js dotenv

# Create your environment file
cat > .env << 'EOF'
OPENAI_API_KEY=sk-your-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
EOF

# Create the folder structure
mkdir -p bookmarks src
```

Add `"type": "module"` to your `package.json` to use ES module imports.

Put your markdown/text files into the `bookmarks/` folder.

---

## Step-by-Step Instructions

### Step 1: Set Up the Supabase Database (10 min)

Go to your Supabase dashboard, open the SQL Editor, and run this to create your table and search function:

```sql
-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the bookmarks table
CREATE TABLE bookmarks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_file TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an HNSW index for fast similarity search
CREATE INDEX ON bookmarks
  USING hnsw (embedding vector_cosine_ops);

-- Create the search function
CREATE OR REPLACE FUNCTION search_bookmarks(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id TEXT,
  title TEXT,
  content TEXT,
  source_file TEXT,
  chunk_index INTEGER,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id, title, content, source_file, chunk_index,
    1 - (embedding <=> query_embedding) AS similarity
  FROM bookmarks
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

### Step 2: Build the Chunker (15 min)

Create `src/chunker.js`. This module splits your files into overlapping chunks at natural boundaries.

```javascript
// src/chunker.js

/**
 * Split text into overlapping chunks at paragraph or sentence boundaries.
 * Returns an array of { text, chunkIndex } objects.
 */
export function chunkText(text, maxChunkSize = 800, overlap = 150) {
  const chunks = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < text.length) {
    let end = start + maxChunkSize;

    if (end < text.length) {
      // TODO: Look for a paragraph break (\n\n) between the halfway point
      // and the end. If found, use that as the break point.
      // If no paragraph break, look for a sentence break ('. ').
      // Fall back to maxChunkSize if neither is found.
    } else {
      end = text.length;
    }

    chunks.push({
      text: text.slice(start, end).trim(),
      chunkIndex,
    });

    // TODO: Advance `start` forward by (end - overlap) to create
    // overlapping chunks. Make sure you don't go backward.
    start = end;
    chunkIndex++;
  }

  return chunks.filter(c => c.text.length > 0);
}

/**
 * Extract a title from a markdown file (first # heading).
 * Returns null if no heading is found.
 */
export function extractTitle(markdown) {
  // TODO: Use a regex to find the first line starting with "# "
  // and return the text after the "# ". Return null if not found.
  return null;
}
```

### Step 3: Build the Ingestion Script (20 min)

Create `src/ingest.js`. This is the heart of the project -- it reads your files, chunks them, generates embeddings, and stores everything in Supabase.

```javascript
// src/ingest.js
import 'dotenv/config';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { chunkText, extractTitle } from './chunker.js';

const openai = new OpenAI();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BOOKMARKS_DIR = './bookmarks';
const BATCH_SIZE = 50;

async function generateEmbeddings(texts) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });
  return response.data
    .sort((a, b) => a.index - b.index)
    .map(item => item.embedding);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`[Ingest] Starting${dryRun ? ' (DRY RUN)' : ''}...`);

  // 1. Read all .md and .txt files from the bookmarks folder
  const files = await readdir(BOOKMARKS_DIR);
  const textFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.txt'));
  console.log(`[Ingest] Found ${textFiles.length} files`);

  // 2. Chunk each file
  const allChunks = [];
  for (const file of textFiles) {
    const raw = await readFile(join(BOOKMARKS_DIR, file), 'utf-8');
    const title = extractTitle(raw) || file.replace(/\.(md|txt)$/, '');

    // TODO: Call chunkText() on the raw content.
    // For each chunk, push an object into allChunks with:
    //   id: `${file}-chunk-${chunk.chunkIndex}`
    //   title: the extracted title
    //   content: the chunk text
    //   sourceFile: the filename
    //   chunkIndex: the chunk's index
  }

  console.log(`[Ingest] Created ${allChunks.length} chunks from ${textFiles.length} files`);

  if (dryRun) {
    console.log('[Ingest] Preview of first 3 chunks:');
    allChunks.slice(0, 3).forEach(c => {
      console.log(`  ${c.id}: "${c.content.slice(0, 100)}..."`);
    });
    return;
  }

  // 3. Generate embeddings in batches
  let totalTokens = 0;
  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);

    // TODO: Build the texts array. For each chunk, combine the title
    // and content with a newline separator: `${chunk.title}\n\n${chunk.content}`
    // Then call generateEmbeddings(texts) and attach each embedding
    // to its corresponding chunk object.
    const texts = batch.map(c => `${c.title}\n\n${c.content}`);
    const embeddings = await generateEmbeddings(texts);
    batch.forEach((chunk, j) => { chunk.embedding = embeddings[j]; });

    console.log(`[Ingest] Embedded ${Math.min(i + BATCH_SIZE, allChunks.length)}/${allChunks.length}`);

    // Rate limit courtesy
    if (i + BATCH_SIZE < allChunks.length) {
      await new Promise(r => setTimeout(r, 250));
    }
  }

  // 4. Upsert into Supabase
  console.log('[Ingest] Storing vectors in Supabase...');
  for (let i = 0; i < allChunks.length; i += 100) {
    const batch = allChunks.slice(i, i + 100);
    const rows = batch.map(c => ({
      id: c.id,
      title: c.title,
      content: c.content,
      source_file: c.sourceFile,
      chunk_index: c.chunkIndex,
      embedding: JSON.stringify(c.embedding),
    }));

    const { error } = await supabase.from('bookmarks').upsert(rows);
    if (error) throw new Error(`Upsert failed: ${error.message}`);
  }

  console.log(`[Ingest] Done! ${allChunks.length} chunks stored.`);
}

main().catch(console.error);
```

### Step 4: Build the Search API (15 min)

Create `src/search-api.js`. This is a simple HTTP server that accepts search queries and returns semantically similar bookmarks.

```javascript
// src/search-api.js
import 'dotenv/config';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PORT = 3000;

async function handleSearch(query) {
  // TODO: 1. Generate an embedding for the query string using
  //          openai.embeddings.create() with 'text-embedding-3-small'

  // TODO: 2. Call supabase.rpc('search_bookmarks', { ... }) with:
  //          - query_embedding: JSON.stringify(embedding)
  //          - match_threshold: 0.4
  //          - match_count: 8

  // TODO: 3. Return the results array (or throw on error)
}

const server = createServer(async (req, res) => {
  // Serve the UI
  if (req.method === 'GET' && req.url === '/') {
    const html = await readFile('./src/index.html', 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  // Handle search requests
  if (req.method === 'POST' && req.url === '/api/search') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { query } = JSON.parse(body);
        if (!query) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Query is required' }));
          return;
        }

        const startTime = Date.now();
        const results = await handleSearch(query);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          query,
          results,
          count: results.length,
          latencyMs: Date.now() - startTime,
        }));
      } catch (err) {
        console.error('Search error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Search failed' }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Bookmark search running at http://localhost:${PORT}`);
});
```

### Step 5: Build the Search UI (15 min)

Create `src/index.html`. A clean, minimal search interface.

```html
<!-- src/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Smart Bookmark Search</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; max-width: 700px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .subtitle { color: #666; margin-bottom: 1.5rem; }
    input[type="text"] { width: 100%; padding: 0.75rem 1rem; font-size: 1rem; border: 2px solid #ddd; border-radius: 8px; }
    input:focus { outline: none; border-color: #7D4E21; }
    .results { margin-top: 1.5rem; }
    .result-card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; }
    .result-title { font-weight: 600; }
    .result-file { font-size: 0.8rem; color: #888; }
    .result-score { font-size: 0.75rem; background: #e8f5e9; color: #2e7d32; padding: 2px 8px; border-radius: 12px; float: right; }
    .result-content { font-size: 0.9rem; color: #444; margin-top: 0.5rem; }
    .meta { font-size: 0.85rem; color: #888; margin-top: 1rem; }
    .loading { text-align: center; color: #888; padding: 2rem; }
  </style>
</head>
<body>
  <h1>Smart Bookmark Search</h1>
  <p class="subtitle">Search your saved notes and bookmarks by meaning, not just keywords.</p>

  <input type="text" id="searchInput" placeholder="Try: 'how to structure a React project' or 'debugging tips'" autofocus>

  <div id="results" class="results"></div>

  <script>
    const input = document.getElementById('searchInput');
    const resultsDiv = document.getElementById('results');
    let debounceTimer;

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => search(input.value), 400);
    });

    async function search(query) {
      if (!query.trim()) { resultsDiv.innerHTML = ''; return; }

      resultsDiv.innerHTML = '<div class="loading">Searching...</div>';

      // TODO: Fetch POST /api/search with the query in the body.
      // Parse the JSON response. For each result, create a result-card
      // div showing the title, source file, similarity score (as a percentage),
      // and a preview of the content (first 200 characters).
      // Display the count and latency in a .meta div at the bottom.
    }
  </script>
</body>
</html>
```

### Step 6: Run It (5 min)

```bash
# Add "type": "module" to your package.json, then:

# First, ingest your bookmarks (dry run to preview)
node src/ingest.js --dry-run

# If the chunks look good, run it for real
node src/ingest.js

# Start the search server
node src/search-api.js

# Open http://localhost:3000 and search!
```

Try these searches to see semantic search in action:
- Search for a concept described in your files using completely different words
- Search with a question ("How do I...?") about a topic in your notes
- Search with a vague phrase and see what comes back

---

## Stretch Goals

1. **Add metadata filtering**: Extend the search to accept an optional `fileType` filter (e.g., only search `.md` files or files with a specific tag). Add a `tags` column to your Supabase table, extract tags from markdown frontmatter during ingestion, and filter on them in your search function.

2. **Build a "similar to this" feature**: Add a button on each search result that finds other bookmarks similar to that specific chunk (not to a text query). This means fetching the stored embedding for that chunk and using it directly as the search vector.

3. **Add a re-ingestion sync**: Build a `src/sync.js` script that detects which files have changed (using content hashing) and only re-embeds those files, deleting stale chunks from Supabase first. Reference the sync approach from Lesson 4.

---

## Submission Checklist

Your project is complete when you can check off every item:

- [ ] `bookmarks/` folder contains at least 5 text or markdown files on different topics
- [ ] `src/chunker.js` splits files into overlapping chunks at paragraph/sentence boundaries
- [ ] `src/ingest.js --dry-run` prints chunk previews without touching the database
- [ ] `src/ingest.js` successfully embeds and stores all chunks in Supabase
- [ ] The `bookmarks` table in Supabase contains rows with non-null `embedding` values
- [ ] `src/search-api.js` starts a server on port 3000
- [ ] `POST /api/search` returns results with similarity scores
- [ ] The browser UI at `http://localhost:3000` shows search results as you type
- [ ] Searching with synonyms or rephrasings of content in your files returns relevant results (proving semantic search works, not just keyword matching)
- [ ] You can explain why two results have different similarity scores

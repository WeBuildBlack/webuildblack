---
title: "Capstone Project Setup: AI Knowledge Base App"
estimatedMinutes: 75
---

## Introduction

Welcome to the capstone project. Over the next four lessons, you are going to build a complete, production-ready AI Knowledge Base application from scratch. This is not a toy demo -- it is a full-stack app that lets users upload documents, ask questions about them in natural language, and get accurate, cited answers powered by RAG (Retrieval-Augmented Generation).

By the end of this capstone, you will have a deployed application that demonstrates every concept from this course: LLM API calls, embeddings, vector search, prompt engineering, streaming responses, and more.

### What You Are Building

**BrainBase** -- an AI-powered knowledge base where users can:

- Upload PDFs, markdown files, and text documents
- Ask natural language questions about their uploaded content
- Get streaming AI responses with source citations
- View conversation history
- Manage their document library

Think of it as a personal ChatGPT that actually knows about *your* documents.

---

## Architecture Overview

Here is the high-level architecture of BrainBase:

```
User uploads document
       |
       v
[Next.js Frontend] --> [API Route: /api/ingest]
                              |
                              v
                    Extract text from file
                              |
                              v
                    Chunk text into segments
                              |
                              v
                    Generate embeddings (OpenAI)
                              |
                              v
                    Store in Supabase + pgvector

User asks a question
       |
       v
[Next.js Frontend] --> [API Route: /api/chat]
                              |
                              v
                    Embed the question (OpenAI)
                              |
                              v
                    Vector similarity search (pgvector)
                              |
                              v
                    Build augmented prompt with context
                              |
                              v
                    Stream LLM response (OpenAI/Anthropic)
                              |
                              v
                    Return streamed answer + citations
```

### Why This Stack?

| Technology | Role | Why |
|-----------|------|-----|
| **Next.js 14+** | Frontend + API routes | Full-stack React framework, great DX, Vercel deployment |
| **Supabase** | Database + Auth + Storage | Postgres with pgvector extension, built-in auth, generous free tier |
| **pgvector** | Vector storage + search | SQL-native vector operations, no separate vector DB needed |
| **OpenAI API** | Embeddings + Chat completions | Industry standard, reliable, well-documented |
| **Vercel** | Deployment | Zero-config Next.js hosting, serverless functions |

This stack is deliberately chosen because it is approachable for web developers. You already know React. Supabase is just Postgres with extra features. And Next.js API routes are just serverless functions.

---

## Setting Up the Project

### Step 1: Create the Next.js App

Open your terminal and scaffold a new Next.js project:

```bash
npx create-next-app@latest brainbase --typescript --tailwind --eslint --app --src-dir
cd brainbase
```

Choose these options when prompted:
- TypeScript: **Yes**
- ESLint: **Yes**
- Tailwind CSS: **Yes**
- `src/` directory: **Yes**
- App Router: **Yes**
- Import alias: **@/** (default)

### Step 2: Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr openai ai @ai-sdk/openai
npm install pdf-parse mammoth
npm install -D @types/pdf-parse
```

Here is what each package does:

| Package | Purpose |
|---------|---------|
| `@supabase/supabase-js` | Supabase client for database, auth, and storage |
| `openai` | OpenAI SDK for embeddings and chat completions |
| `ai` | Vercel AI SDK for streaming responses |
| `@ai-sdk/openai` | OpenAI provider for Vercel AI SDK |
| `pdf-parse` | Extract text from PDF files |
| `mammoth` | Extract text from Word documents |

### Step 3: Set Up Environment Variables

Create a `.env.local` file in your project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important**: The `SUPABASE_SERVICE_ROLE_KEY` is a secret that should never be exposed to the client. Only use it in server-side code (API routes, server components, server actions).

---

## Supabase Setup

### Step 4: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a name (e.g., "brainbase") and set a database password
3. Select a region close to you
4. Wait for the project to be provisioned (about 2 minutes)

### Step 5: Enable pgvector

In the Supabase SQL Editor, run:

```sql
-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
```

### Step 6: Create the Database Schema

Run this SQL to create the tables you need:

```sql
-- Documents table: stores metadata about uploaded files
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  chunk_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chunks table: stores text chunks with their embeddings
CREATE TABLE chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations table: stores chat history
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table: stores individual messages in conversations
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_chunks_document_id ON chunks(document_id);
CREATE INDEX idx_chunks_embedding ON chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);

-- Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies: users can only access their own data
CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view chunks of own documents" ON chunks
  FOR SELECT USING (
    document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (
    conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own messages" ON messages
  FOR INSERT WITH CHECK (
    conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
  );
```

### Step 7: Create the Vector Search Function

This is the core of your RAG pipeline -- a Postgres function that finds the most similar chunks to a query embedding:

```sql
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_document_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  chunk_index INTEGER,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.document_id,
    c.content,
    c.chunk_index,
    1 - (c.embedding <=> query_embedding) AS similarity,
    c.metadata
  FROM chunks c
  WHERE
    (filter_document_ids IS NULL OR c.document_id = ANY(filter_document_ids))
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## Project Structure

Set up the following file structure in your `src/` directory:

```
src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing / dashboard
│   ├── login/
│   │   └── page.tsx            # Auth page
│   ├── chat/
│   │   ├── page.tsx            # Chat interface
│   │   └── [id]/
│   │       └── page.tsx        # Specific conversation
│   ├── documents/
│   │   └── page.tsx            # Document library
│   └── api/
│       ├── ingest/
│       │   └── route.ts        # Document upload + processing
│       ├── chat/
│       │   └── route.ts        # RAG chat endpoint
│       └── documents/
│           └── route.ts        # Document CRUD
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   └── server.ts           # Server Supabase client
│   ├── ai/
│   │   ├── embeddings.ts       # Embedding generation
│   │   ├── chunking.ts         # Text chunking logic
│   │   └── chat.ts             # Chat completion with RAG
│   └── utils/
│       ├── file-parser.ts      # PDF/text extraction
│       └── constants.ts        # App-wide constants
├── components/
│   ├── chat/
│   │   ├── ChatWindow.tsx      # Main chat component
│   │   ├── MessageBubble.tsx   # Individual message
│   │   └── ChatInput.tsx       # Message input
│   ├── documents/
│   │   ├── UploadForm.tsx      # File upload
│   │   └── DocumentList.tsx    # Document library
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       └── Spinner.tsx
└── types/
    └── index.ts                # TypeScript type definitions
```

### Create the Type Definitions

Start by defining your types in `src/types/index.ts`:

```typescript
// src/types/index.ts

export interface Document {
  id: string;
  user_id: string;
  title: string;
  file_type: string;
  file_size: number;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export interface Chunk {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  similarity?: number;
  metadata: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: Source[];
  created_at: string;
}

export interface Source {
  document_id: string;
  document_title: string;
  chunk_content: string;
  similarity: number;
}
```

### Create the Supabase Clients

You need two clients -- one for the browser and one for server-side code:

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```typescript
// src/lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js';

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
```

### Create the Constants File

```typescript
// src/lib/utils/constants.ts

export const CHUNK_SIZE = 1000;         // characters per chunk
export const CHUNK_OVERLAP = 200;       // overlap between chunks
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const CHAT_MODEL = 'gpt-4o-mini';
export const MAX_CONTEXT_CHUNKS = 5;    // max chunks to include in prompt
export const SIMILARITY_THRESHOLD = 0.7; // minimum similarity score
```

---

## Verifying Your Setup

Before moving on, make sure everything is wired up. Create a quick test API route:

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

export async function GET() {
  const checks = {
    supabase: false,
    openai: false,
    pgvector: false,
  };

  // Test Supabase connection
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from('documents').select('count').limit(1);
    checks.supabase = !error;
  } catch (e) {
    console.error('Supabase check failed:', e);
  }

  // Test OpenAI connection
  try {
    const openai = new OpenAI();
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'test',
    });
    checks.openai = response.data.length > 0;
  } catch (e) {
    console.error('OpenAI check failed:', e);
  }

  // Test pgvector
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.rpc('match_chunks', {
      query_embedding: new Array(1536).fill(0),
      match_count: 1,
    });
    checks.pgvector = !error;
  } catch (e) {
    console.error('pgvector check failed:', e);
  }

  const allHealthy = Object.values(checks).every(Boolean);

  return NextResponse.json(
    { status: allHealthy ? 'healthy' : 'degraded', checks },
    { status: allHealthy ? 200 : 503 }
  );
}
```

Run your dev server and hit the health endpoint:

```bash
npm run dev
# Visit http://localhost:3000/api/health
```

You should see:

```json
{
  "status": "healthy",
  "checks": {
    "supabase": true,
    "openai": true,
    "pgvector": true
  }
}
```

If any check fails, double-check your `.env.local` values and make sure you ran all the SQL migrations in Supabase.

---

## Understanding the Data Flow

Before we start building features in the next lessons, make sure you understand the two primary data flows:

### Ingestion Flow (Lesson 02)

```
File Upload → Parse Text → Chunk Text → Generate Embeddings → Store in Supabase
```

1. User uploads a PDF, .txt, or .md file
2. Server extracts the raw text content
3. Text is split into overlapping chunks (1000 chars each, 200 char overlap)
4. Each chunk is sent to OpenAI's embedding API to get a 1536-dimensional vector
5. Chunks and their embeddings are stored in the `chunks` table via pgvector

### Chat Flow (Lesson 03)

```
User Question → Embed Question → Vector Search → Build Prompt → Stream Response
```

1. User types a question
2. The question is converted to an embedding vector
3. pgvector finds the most similar document chunks
4. The retrieved chunks are inserted into the system prompt as context
5. The LLM generates an answer based on the provided context
6. The response streams back to the UI token by token

---

## Key Takeaways

- **BrainBase** is a full-stack AI knowledge base app that combines everything you have learned in this course: embeddings, vector search, RAG, streaming, and prompt engineering.
- The tech stack (Next.js + Supabase + pgvector + OpenAI) is chosen for developer experience and cost efficiency -- all services have generous free tiers.
- **pgvector** lets you store and search embeddings directly in Postgres, eliminating the need for a separate vector database.
- Row Level Security (RLS) in Supabase ensures that users can only access their own documents and conversations.
- The two core data flows are **ingestion** (upload, chunk, embed, store) and **chat** (embed query, search, augment prompt, stream response).

---

## Try It Yourself

1. **Set up the project**: Follow every step above to create your Next.js app, install dependencies, and configure Supabase. Hit the `/api/health` endpoint and make sure all three checks pass.

2. **Explore the Supabase dashboard**: Navigate to your Supabase project's Table Editor. Look at the `documents`, `chunks`, `conversations`, and `messages` tables. Try inserting a test row manually into `documents` to confirm RLS is working (it should fail without authentication).

3. **Inspect the vector index**: In the SQL Editor, run `SELECT * FROM pg_indexes WHERE tablename = 'chunks';` to see the HNSW index on the embedding column. Research the tradeoffs between HNSW and IVFFlat indexes for different dataset sizes.

4. **Sketch the UI**: Before we build the frontend, sketch (on paper or in Figma) what the chat interface and document library should look like. Think about what information the user needs to see at each step.

5. **Read the docs**: Skim the [Supabase pgvector guide](https://supabase.com/docs/guides/ai/vector-columns) and the [Vercel AI SDK docs](https://sdk.vercel.ai/docs) so you are ready for the next lessons.

---
title: "Module Project: AI Knowledge Base (Capstone)"
estimatedMinutes: 75
---

## Module Project: AI Knowledge Base (Capstone)

This is the capstone. Everything you've learned -- LLM APIs, prompt engineering, embeddings, RAG pipelines, and agent patterns -- comes together in a single, full-stack AI application. You're building an AI Knowledge Base: a web app where users upload documents, then ask questions and get accurate, cited answers powered by retrieval-augmented generation. This project brief defines the requirements, milestones, and acceptance criteria. The four lessons in this module walk you through building it step by step -- this document is your assignment sheet and roadmap.

---

## What You'll Practice

- Architecting a full-stack AI application from scratch (Lesson 1: Project Setup)
- Building a document ingestion pipeline with file parsing, chunking, and embedding (Lesson 2: Ingestion Pipeline)
- Implementing a RAG-powered chat interface with streaming responses (Lesson 3: Chat Interface)
- Adding authentication, conversation history, source citations, and deployment (Lesson 4: Polish and Ship)
- Making technical decisions about infrastructure, models, and tradeoffs

---

## Prerequisites

Before you start, make sure you have:

- **Node.js 18+** and **npm** installed
- **An OpenAI API key** (for embeddings and chat completions)
- **A Supabase account** (free tier) with a project created
- **A Vercel account** (free tier) for deployment
- **Completed Modules 06-08** -- this project assumes you're comfortable with embeddings, RAG, and the OpenAI API
- Familiarity with Next.js basics (pages, API routes, components)

### Initial Setup

```bash
# Create the Next.js project
npx create-next-app@latest ai-knowledge-base --typescript --tailwind --app --src-dir
cd ai-knowledge-base

# Install dependencies
npm install openai @supabase/supabase-js @supabase/ssr ai @ai-sdk/openai

# Create environment file
cat > .env.local << 'EOF'
OPENAI_API_KEY=sk-your-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EOF
```

---

## Architecture Overview

```
User uploads docs  -->  Parse + Chunk + Embed  -->  Store in Supabase (pgvector)
                                                           |
User asks question  -->  Embed query  -->  Hybrid search --+
                                                           |
                         Retrieved context + Question  --> LLM --> Streaming answer with citations
                                                           |
                         Conversation history  <-----------+
```

**Tech stack**: Next.js 14+ (App Router), Supabase (auth + pgvector + storage), OpenAI (embeddings + chat), Vercel (hosting).

---

## Milestones

This project has four milestones, each corresponding to one lesson in this module. Complete them in order -- each builds on the last.

---

### Milestone 1: Project Setup and Database Schema (Lesson 1)

**Goal**: Scaffold the project, configure Supabase, and set up the database schema.

**What to build**:

1. Initialize the Next.js project with TypeScript and Tailwind
2. Create Supabase tables:
   - `documents` -- stores uploaded files (id, user_id, filename, file_type, created_at)
   - `chunks` -- stores chunked/embedded content (id, document_id, content, embedding, chunk_index, metadata)
   - `conversations` -- stores chat sessions (id, user_id, title, created_at)
   - `messages` -- stores chat messages (id, conversation_id, role, content, sources, created_at)
3. Enable pgvector and create the HNSW index on `chunks`
4. Create the `match_chunks` RPC function for similarity search
5. Verify the connection works with a simple test script

**Acceptance criteria**:

- [ ] `npm run dev` starts the app without errors
- [ ] Supabase tables exist with correct schemas and foreign key relationships
- [ ] The vector index is created on `chunks.embedding`
- [ ] Environment variables are configured and the app can connect to Supabase
- [ ] A test script can insert and query a sample embedding

---

### Milestone 2: Document Ingestion Pipeline (Lesson 2)

**Goal**: Users can upload documents that get parsed, chunked, embedded, and stored.

**What to build**:

1. File parser that handles `.txt`, `.md`, and `.pdf` files
2. Markdown-aware text chunker (from your Module 07 work -- reuse your code)
3. Batch embedding generation using the OpenAI API
4. An API route (`POST /api/ingest`) that orchestrates the pipeline
5. An upload UI with drag-and-drop, file type validation, and progress feedback

**Starter scaffold for the API route**:

```typescript
// src/app/api/ingest/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // TODO: 1. Parse the file content based on file type
  //       2. Chunk the content using your markdown-aware chunker
  //       3. Generate embeddings for all chunks (batch)
  //       4. Insert the document record into `documents`
  //       5. Insert all chunks with embeddings into `chunks`
  //       6. Return success with document ID and chunk count

  return NextResponse.json({ message: 'Not implemented yet' });
}
```

**Acceptance criteria**:

- [ ] Users can upload `.txt` and `.md` files through the UI
- [ ] Files are parsed, chunked (1000 chars with 200 char overlap), and embedded
- [ ] All chunks are stored in `chunks` with valid embeddings
- [ ] The upload shows progress and a success/error message
- [ ] Uploading the same file twice doesn't create duplicate chunks

---

### Milestone 3: Chat Interface with RAG (Lesson 3)

**Goal**: Users can ask questions and get accurate, streaming answers with source citations.

**What to build**:

1. A chat API route (`POST /api/chat`) that:
   - Embeds the user's question
   - Retrieves relevant chunks via hybrid search
   - Builds an augmented prompt with context and citation instructions
   - Streams the response token by token
2. A chat UI component with:
   - Message bubbles (user and assistant)
   - Streaming text display
   - Source citations shown below each answer
   - A text input with send button
3. Prompt engineering for accurate, cited answers

**Starter scaffold for the chat route**:

```typescript
// src/app/api/chat/route.ts
import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI();

export async function POST(req: NextRequest) {
  const { message, conversationId } = await req.json();

  // TODO: 1. Embed the user's message
  //       2. Retrieve top 5 relevant chunks using hybrid_search
  //       3. Build the system prompt with retrieved context
  //       4. Call openai.chat.completions.create() with stream: true
  //       5. Return a streaming response using the Vercel AI SDK's
  //          StreamingTextResponse, or manually stream with ReadableStream
  //       6. After streaming completes, save the message and response
  //          to the `messages` table

  // Hint for the system prompt:
  const systemPrompt = `You are a knowledge base assistant. Answer questions
  using ONLY the provided context. Cite sources using [1], [2], etc.
  If the context doesn't contain the answer, say so honestly.`;
}
```

**Acceptance criteria**:

- [ ] Users can type questions and receive streaming answers
- [ ] Answers are grounded in the uploaded documents (not hallucinated)
- [ ] Each answer includes numbered source citations `[1]`, `[2]`, etc.
- [ ] Source documents/chunks are displayed below the answer
- [ ] The chat handles "I don't know" gracefully when no relevant docs exist
- [ ] Response latency (first token) is under 2 seconds

---

### Milestone 4: Polish and Ship (Lesson 4)

**Goal**: Add auth, conversation history, UI polish, and deploy to production.

**What to build**:

1. **Authentication** with Supabase Auth (email/password or magic link)
   - Protected routes (redirect to login if not authenticated)
   - User-scoped data (users only see their own documents and conversations)
2. **Conversation history sidebar**
   - List of past conversations with titles
   - Click to load a previous conversation
   - Auto-generate conversation titles from the first question
3. **Enhanced source citations**
   - Clickable source cards with document name and relevance score
   - Expandable preview of the matched chunk
4. **Loading states and UX polish**
   - Skeleton loaders during data fetch
   - Smooth message transitions
   - Mobile-responsive layout
5. **Deploy to Vercel**
   - Configure environment variables in Vercel dashboard
   - Verify everything works in production

**Acceptance criteria**:

- [ ] Users can sign up, log in, and log out
- [ ] Each user only sees their own documents and conversations
- [ ] Conversation history appears in a sidebar and is clickable
- [ ] Source citations are interactive (clickable, expandable)
- [ ] The app is deployed to Vercel and accessible via a public URL
- [ ] The app works on mobile screens (responsive layout)
- [ ] No environment variables or API keys are exposed to the client

---

## Running the Capstone

```bash
# Development
npm run dev                    # Start the dev server at localhost:3000

# Supabase (run these in the Supabase SQL editor)
# - Create tables (Milestone 1 SQL)
# - Create search functions
# - Enable Row Level Security (RLS) for auth

# Deploy
npx vercel                     # Deploy to Vercel (follow the prompts)
npx vercel --prod              # Deploy to production
```

---

## Stretch Goals

1. **Add DOCX and CSV support**: Extend the file parser to handle `.docx` files (using `mammoth`) and `.csv` files (convert rows into text representations). Handle large files gracefully and preserve structure where possible.

2. **Implement conversation-aware context**: Instead of just using the latest question for retrieval, combine it with recent conversation context. If a user asks "Tell me more about that," resolve "that" to the actual topic from the previous exchange before searching.

3. **Add an admin analytics page**: Show usage stats -- total documents, total chunks, questions asked per day, average response time, most-queried topics. Pull this data from your Supabase tables and display it with simple charts.

---

## Final Demo Checklist

When you're done, you should be able to demonstrate the following flow in under 5 minutes:

- [ ] Sign up / log in to the app
- [ ] Upload 2-3 documents (drag-and-drop, show progress)
- [ ] Ask a question that requires information from the uploaded docs
- [ ] Receive a streaming answer with accurate source citations
- [ ] Click a source citation to see the matched chunk
- [ ] Ask a follow-up question in the same conversation
- [ ] Open the sidebar and switch to a previous conversation
- [ ] Show that the app works on a mobile screen
- [ ] Share the live Vercel URL

This is your portfolio piece. It demonstrates that you can design, build, and deploy a full-stack AI application end to end.

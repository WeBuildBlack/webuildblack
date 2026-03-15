---
title: "Building the Chat Interface with RAG"
estimatedMinutes: 75
---

## Introduction

Your documents are ingested and indexed. Now comes the exciting part: letting users ask questions and get intelligent, contextual answers. In this lesson, you are building the complete chat experience -- from the user typing a question, to retrieving relevant document chunks, to streaming an AI-generated response with source citations.

This is where everything from the course comes together. You will use:
- **Embeddings** to convert the user's question into a vector
- **Vector search** to find the most relevant document chunks
- **Prompt engineering** to construct an effective RAG prompt
- **Streaming** to deliver the response token by token

---

## The RAG Chat Flow

Let's trace the exact path a user's question takes:

```
1. User types: "What is the transformer architecture?"
                    |
2. Embed the question using text-embedding-3-small
                    |
3. Query pgvector: find top 5 most similar chunks
                    |
4. Build system prompt with retrieved chunks as context
                    |
5. Send to GPT-4o-mini with streaming enabled
                    |
6. Stream response tokens back to the UI
                    |
7. Save the conversation to the database
```

---

## Building the Chat API Route

This is the most important API route in the entire application. Let's build it step by step.

### The RAG Chat Module

First, create the core chat logic:

```typescript
// src/lib/ai/chat.ts
import OpenAI from 'openai';
import { createServiceClient } from '@/lib/supabase/server';
import { generateEmbedding } from './embeddings';
import {
  CHAT_MODEL,
  MAX_CONTEXT_CHUNKS,
  SIMILARITY_THRESHOLD,
} from '@/lib/utils/constants';
import type { Chunk, Source } from '@/types';

const openai = new OpenAI();

interface RetrievedContext {
  chunks: Chunk[];
  sources: Source[];
}

export async function retrieveContext(
  query: string,
  documentIds?: string[]
): Promise<RetrievedContext> {
  const supabase = createServiceClient();

  // 1. Embed the user's question
  const queryEmbedding = await generateEmbedding(query);

  // 2. Search for similar chunks using our Postgres function
  const { data: matches, error } = await supabase.rpc('match_chunks', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: SIMILARITY_THRESHOLD,
    match_count: MAX_CONTEXT_CHUNKS,
    filter_document_ids: documentIds || null,
  });

  if (error) {
    throw new Error(`Vector search failed: ${error.message}`);
  }

  if (!matches || matches.length === 0) {
    return { chunks: [], sources: [] };
  }

  // 3. Fetch document titles for citations
  const documentIdSet = [...new Set(matches.map((m: any) => m.document_id))];
  const { data: documents } = await supabase
    .from('documents')
    .select('id, title')
    .in('id', documentIdSet);

  const docTitleMap = new Map(
    documents?.map((d: any) => [d.id, d.title]) || []
  );

  // 4. Build the sources array for citations
  const sources: Source[] = matches.map((match: any) => ({
    document_id: match.document_id,
    document_title: docTitleMap.get(match.document_id) || 'Unknown Document',
    chunk_content: match.content,
    similarity: match.similarity,
  }));

  return { chunks: matches, sources };
}

export function buildRAGPrompt(
  context: RetrievedContext,
  conversationHistory: { role: string; content: string }[] = []
): { systemPrompt: string; hasContext: boolean } {
  if (context.chunks.length === 0) {
    return {
      systemPrompt: `You are BrainBase, an AI knowledge assistant. The user has uploaded documents to their knowledge base, but no relevant content was found for their current question.

Respond honestly that you could not find relevant information in their uploaded documents. Suggest they:
1. Rephrase their question
2. Upload additional documents that might contain the answer
3. Ask a more specific question

Do not make up information. Do not use your general knowledge to answer -- only reference the user's uploaded documents.`,
      hasContext: false,
    };
  }

  const contextText = context.sources
    .map(
      (source, i) =>
        `[Source ${i + 1}: "${source.document_title}" (relevance: ${(source.similarity * 100).toFixed(1)}%)]\n${source.chunk_content}`
    )
    .join('\n\n---\n\n');

  return {
    systemPrompt: `You are BrainBase, an AI knowledge assistant. Answer the user's question based ONLY on the following context from their uploaded documents.

RULES:
1. Only use information from the provided context. Do not use your general knowledge.
2. If the context does not contain enough information to fully answer the question, say so explicitly.
3. Cite your sources using [Source N] notation inline where you use information from that source.
4. Be concise but thorough. Use bullet points or numbered lists when appropriate.
5. If multiple sources discuss the same topic, synthesize the information.

CONTEXT FROM USER'S DOCUMENTS:
${contextText}`,
    hasContext: true,
  };
}
```

### The Streaming API Route

Now create the API route that ties everything together with streaming:

```typescript
// src/app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createServiceClient } from '@/lib/supabase/server';
import { retrieveContext, buildRAGPrompt } from '@/lib/ai/chat';
import { CHAT_MODEL } from '@/lib/utils/constants';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const {
      message,
      conversationId,
      userId,
      documentIds,
    } = await request.json();

    if (!message || !userId) {
      return new Response(
        JSON.stringify({ error: 'Message and userId are required' }),
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // 1. Create or get conversation
    let activeConversationId = conversationId;

    if (!activeConversationId) {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          title: message.substring(0, 100), // Use first question as title
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to create conversation: ${error.message}`);
      activeConversationId = conversation.id;
    }

    // 2. Save the user's message
    await supabase.from('messages').insert({
      conversation_id: activeConversationId,
      role: 'user',
      content: message,
    });

    // 3. Retrieve relevant context
    const context = await retrieveContext(message, documentIds);

    // 4. Build the RAG prompt
    const { systemPrompt, hasContext } = buildRAGPrompt(context);

    // 5. Get conversation history for multi-turn context
    const { data: previousMessages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', activeConversationId)
      .order('created_at', { ascending: true })
      .limit(20); // Last 20 messages for context

    const messages = (previousMessages || []).map((msg: any) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // 6. Stream the response
    const result = streamText({
      model: openai(CHAT_MODEL),
      system: systemPrompt,
      messages,
      onFinish: async ({ text }) => {
        // Save the assistant's response after streaming completes
        await supabase.from('messages').insert({
          conversation_id: activeConversationId,
          role: 'assistant',
          content: text,
          sources: context.sources,
        });

        // Update conversation timestamp
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', activeConversationId);
      },
    });

    // Return the stream with metadata headers
    return result.toDataStreamResponse({
      headers: {
        'X-Conversation-Id': activeConversationId,
        'X-Has-Context': String(hasContext),
        'X-Sources': JSON.stringify(
          context.sources.map(s => ({
            title: s.document_title,
            similarity: s.similarity,
          }))
        ),
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Chat failed',
      }),
      { status: 500 }
    );
  }
}
```

### Python Version of the RAG Pipeline

For teams using a Python backend (Flask/FastAPI), here is the equivalent retrieval and chat logic:

```python
# rag_chat.py
import openai
from supabase import create_client
import json
import os

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"]
)
client = openai.OpenAI()

def retrieve_context(query: str, document_ids: list[str] | None = None, top_k: int = 5):
    """Embed a query and find the most similar document chunks."""

    # Generate query embedding
    embedding_response = client.embeddings.create(
        model="text-embedding-3-small",
        input=query
    )
    query_embedding = embedding_response.data[0].embedding

    # Search pgvector via Supabase RPC
    result = supabase.rpc("match_chunks", {
        "query_embedding": json.dumps(query_embedding),
        "match_threshold": 0.7,
        "match_count": top_k,
        "filter_document_ids": document_ids
    }).execute()

    if not result.data:
        return [], []

    # Get document titles for citations
    doc_ids = list(set(m["document_id"] for m in result.data))
    docs = supabase.table("documents").select("id, title").in_("id", doc_ids).execute()
    title_map = {d["id"]: d["title"] for d in docs.data}

    sources = [
        {
            "document_title": title_map.get(m["document_id"], "Unknown"),
            "chunk_content": m["content"],
            "similarity": m["similarity"]
        }
        for m in result.data
    ]

    return result.data, sources


def chat_with_rag(query: str, document_ids: list[str] | None = None):
    """Full RAG chat: retrieve context, build prompt, generate response."""

    chunks, sources = retrieve_context(query, document_ids)

    if not chunks:
        system_prompt = "No relevant documents found. Tell the user to upload relevant documents."
    else:
        context_text = "\n\n---\n\n".join(
            f'[Source {i+1}: "{s["document_title"]}" ({s["similarity"]*100:.1f}%)]\n{s["chunk_content"]}'
            for i, s in enumerate(sources)
        )
        system_prompt = f"""Answer based ONLY on this context. Cite sources as [Source N].

CONTEXT:
{context_text}"""

    # Stream the response
    stream = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query}
        ],
        stream=True
    )

    full_response = ""
    for chunk in stream:
        if chunk.choices[0].delta.content:
            token = chunk.choices[0].delta.content
            full_response += token
            print(token, end="", flush=True)

    print()  # Newline after streaming
    return full_response, sources


# Usage
if __name__ == "__main__":
    response, sources = chat_with_rag("What is RAG?")
    print(f"\n\nCited {len(sources)} sources")
```

---

## Building the Chat UI

### The Chat Window Component

```tsx
// src/components/chat/ChatWindow.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
// > **Version Note:** The Vercel AI SDK evolves rapidly. If you're using `ai`
// > v4+, the import path may have changed from `ai/react` to `@ai-sdk/react`.
// > Check the [Vercel AI SDK docs](https://sdk.vercel.ai/) for the latest
// > import paths.
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import type { Source } from '@/types';

interface ChatWindowProps {
  userId: string;
  conversationId?: string;
  documentIds?: string[];
}

export function ChatWindow({
  userId,
  conversationId: initialConversationId,
  documentIds,
}: ChatWindowProps) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [sources, setSources] = useState<Record<string, Source[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: '/api/chat',
      body: {
        userId,
        conversationId,
        documentIds,
      },
      onResponse: (response) => {
        // Capture the conversation ID from the first response
        const newConversationId = response.headers.get('X-Conversation-Id');
        if (newConversationId && !conversationId) {
          setConversationId(newConversationId);
        }

        // Capture sources for this response
        const sourcesHeader = response.headers.get('X-Sources');
        if (sourcesHeader) {
          try {
            const parsedSources = JSON.parse(sourcesHeader);
            setSources((prev) => ({
              ...prev,
              [messages.length.toString()]: parsedSources,
            }));
          } catch {
            // Sources header parsing failed, not critical
          }
        }
      },
    });

  // Auto-scroll to the bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            <h2 className="text-2xl font-semibold mb-2">
              Ask your documents anything
            </h2>
            <p className="text-sm">
              Your AI assistant will search through your uploaded documents
              to find the answer.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            role={message.role}
            content={message.content}
            sources={sources[index.toString()]}
            isStreaming={isLoading && index === messages.length - 1}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <ChatInput
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
```

### The Message Bubble Component

```tsx
// src/components/chat/MessageBubble.tsx
import type { Source } from '@/types';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
}

export function MessageBubble({
  role,
  content,
  sources,
  isStreaming,
}: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-amber-700 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        {/* Message content */}
        <div className="prose prose-sm max-w-none">
          {content}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
          )}
        </div>

        {/* Source citations */}
        {sources && sources.length > 0 && !isStreaming && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-500 mb-1">Sources:</p>
            <ul className="space-y-1">
              {sources.map((source, i) => (
                <li key={i} className="text-xs text-gray-500">
                  <span className="font-medium">[{i + 1}]</span>{' '}
                  {source.title} ({(source.similarity * 100).toFixed(0)}% match)
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
```

### The Chat Input Component

```tsx
// src/components/chat/ChatInput.tsx
import { FormEvent, ChangeEvent } from 'react';

interface ChatInputProps {
  input: string;
  handleInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

export function ChatInput({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
}: ChatInputProps) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t p-4">
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={handleInputChange}
          onKeyDown={onKeyDown}
          placeholder="Ask a question about your documents..."
          rows={2}
          className="flex-1 resize-none rounded-lg border border-gray-300 p-3
            focus:outline-none focus:ring-2 focus:ring-amber-500
            disabled:opacity-50"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-6 py-3 bg-amber-700 text-white rounded-lg
            hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors self-end"
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Press Enter to send, Shift+Enter for a new line
      </p>
    </form>
  );
}
```

---

## Improving Response Quality

### Better Retrieval with Hybrid Search

Pure vector search sometimes misses exact keyword matches. You can improve retrieval with a hybrid approach that combines vector similarity with full-text search:

```sql
-- Add a full-text search column to chunks
ALTER TABLE chunks ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX idx_chunks_fts ON chunks USING gin(fts);

-- Hybrid search function
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text TEXT,
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 5,
  filter_document_ids UUID[] DEFAULT NULL,
  keyword_weight FLOAT DEFAULT 0.3,
  semantic_weight FLOAT DEFAULT 0.7
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
  WITH semantic AS (
    SELECT
      c.id,
      c.document_id,
      c.content,
      c.chunk_index,
      1 - (c.embedding <=> query_embedding) AS score,
      c.metadata
    FROM chunks c
    WHERE filter_document_ids IS NULL OR c.document_id = ANY(filter_document_ids)
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  keyword AS (
    SELECT
      c.id,
      ts_rank(c.fts, websearch_to_tsquery('english', query_text)) AS score
    FROM chunks c
    WHERE
      c.fts @@ websearch_to_tsquery('english', query_text)
      AND (filter_document_ids IS NULL OR c.document_id = ANY(filter_document_ids))
    LIMIT match_count * 2
  )
  SELECT
    s.id,
    s.document_id,
    s.content,
    s.chunk_index,
    (s.score * semantic_weight + COALESCE(k.score, 0) * keyword_weight) AS similarity,
    s.metadata
  FROM semantic s
  LEFT JOIN keyword k ON s.id = k.id
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
```

### Reranking Retrieved Results

For even better results, rerank the retrieved chunks using the LLM itself:

```typescript
// src/lib/ai/reranker.ts

export async function rerankChunks(
  query: string,
  chunks: { content: string; similarity: number }[],
  topK: number = 3
): Promise<typeof chunks> {
  if (chunks.length <= topK) return chunks;

  const openai = new OpenAI();

  const prompt = `Given the query and document excerpts below, rank the excerpts by relevance to the query. Return a JSON object with a "ranking" key containing an array of indices (0-based) in order of most relevant to least relevant.

Query: "${query}"

Excerpts:
${chunks.map((c, i) => `[${i}] ${c.content.substring(0, 300)}`).join('\n\n')}

Return format: {"ranking": [2, 0, 4, 1, 3]}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  try {
    const content = response.choices[0].message.content || '{}';
    const parsed = JSON.parse(content);
    const indices: number[] = parsed.ranking || [];

    return indices
      .slice(0, topK)
      .map(i => chunks[i])
      .filter(Boolean);
  } catch {
    // If reranking fails, fall back to original order
    return chunks.slice(0, topK);
  }
}
```

---

## Handling Edge Cases

### No Context Found

When pgvector returns no results above the similarity threshold, the user needs to know:

```typescript
// Already handled in buildRAGPrompt, but also consider:
if (!hasContext) {
  // Add a UI indicator that the response is not grounded
  // Maybe show a warning banner: "No matching documents found"
}
```

### Very Long Conversations

As conversation history grows, you risk exceeding the LLM's context window:

```typescript
function trimConversationHistory(
  messages: { role: string; content: string }[],
  maxTokens: number = 4000
): { role: string; content: string }[] {
  // Simple approach: keep the system message and last N messages
  // A better approach would use tiktoken to count actual tokens

  let totalLength = 0;
  const trimmed: typeof messages = [];

  // Always keep the most recent messages
  for (let i = messages.length - 1; i >= 0; i--) {
    totalLength += messages[i].content.length;
    if (totalLength > maxTokens * 4) break; // Rough char-to-token ratio
    trimmed.unshift(messages[i]);
  }

  return trimmed;
}
```

### Streaming Error Recovery

If the stream breaks mid-response, handle it gracefully:

```tsx
// In ChatWindow.tsx
const { messages, /* ... */, error, reload } = useChat({
  // ... config
  onError: (error) => {
    console.error('Chat stream error:', error);
  },
});

// In the JSX
{error && (
  <div className="text-red-600 text-sm p-4 bg-red-50 rounded-lg">
    <p>Something went wrong. Please try again.</p>
    <button
      onClick={() => reload()}
      className="mt-2 text-sm underline hover:no-underline"
    >
      Retry last message
    </button>
  </div>
)}
```

---

## Key Takeaways

- The RAG chat flow is: **embed question, search vectors, build prompt, stream response**. Each step is a separate function that can be tested independently.
- **The Vercel AI SDK** (`ai` package) handles streaming complexity for you -- it manages the ReadableStream, text decoding, and React state updates.
- **Source citations** are critical for trustworthy AI responses. Always show users where the information came from and how relevant each source was.
- **Hybrid search** (vector + keyword) and **reranking** significantly improve retrieval quality at the cost of slightly higher latency and API usage.
- Edge cases like empty results, long conversations, and broken streams need explicit handling to create a production-quality experience.

---

## Try It Yourself

1. **End-to-end test**: Upload a document (from Lesson 02), then ask questions about it. Verify that the responses accurately cite the uploaded content and do not hallucinate.

2. **Test the boundaries**: Ask a question that is completely unrelated to your uploaded documents. Does the system correctly tell you it has no relevant information? Now ask a borderline question -- one that is tangentially related. How does the similarity threshold affect the response?

3. **Implement conversation history**: Right now, each question is independent. Modify the chat UI to show a sidebar with past conversations. Clicking a conversation loads its history and resumes the chat.

4. **Add a "sources" panel**: Instead of showing sources inline below the message, add a collapsible side panel that shows the full text of each retrieved chunk when the user clicks a source citation.

5. **Try different models**: Change `CHAT_MODEL` from `gpt-4o-mini` to `gpt-4o` or use Anthropic's Claude via `@ai-sdk/anthropic`. Compare response quality and latency. When would you choose one over the other?

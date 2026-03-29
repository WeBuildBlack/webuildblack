---
title: "Polish and Ship: Auth, History, Citations, and Deployment"
estimatedMinutes: 75
---

## Introduction

You have a working AI knowledge base with document ingestion and RAG chat. Now it is time to turn this prototype into a polished, deployable product. In this lesson, you will add:

1. **Authentication** -- so users have their own private knowledge bases
2. **Conversation history** -- persistent chat sessions that users can return to
3. **Source citations** -- clear, clickable references to the original documents
4. **Loading states and UX polish** -- making the app feel responsive and professional
5. **Deployment to Vercel** -- shipping it live to the internet

This is where the difference between a demo and a product lives.

---

## Adding Authentication with Supabase Auth

Supabase Auth gives you a complete authentication system that works with the Row Level Security policies you already set up.

### Install the Auth Helpers

```bash
npm install @supabase/ssr
```

### Create the Auth Middleware

Next.js middleware runs before every request. You will use it to refresh the auth session and protect routes:

```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session (important for token rotation)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect routes: redirect unauthenticated users to login
  const protectedRoutes = ['/chat', '/documents'];
  const isProtected = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### Build the Login Page

```tsx
// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/chat';

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage('Check your email for a confirmation link.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(redirect);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">BrainBase</h1>
          <p className="text-gray-500 mt-2">Your AI-powered knowledge base</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">
            {isSignUp ? 'Create an account' : 'Sign in'}
          </h2>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2
                focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2
                focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
              minLength={6}
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {message && <p className="text-green-600 text-sm">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-amber-700 text-white rounded-md
              hover:bg-amber-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>

          <p className="text-center text-sm text-gray-500">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-amber-700 hover:underline"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
```

### Auth Callback Route

```typescript
// src/app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    // > **Next.js 15+:** The `cookies()` function is now async. If you're
    // > using Next.js 14, remove the `await`.
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL('/chat', request.url));
}
```

---

## Conversation History Sidebar

Let users browse and resume past conversations:

```tsx
// src/components/chat/ConversationSidebar.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Conversation } from '@/types';

interface ConversationSidebarProps {
  userId: string;
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
}

export function ConversationSidebar({
  userId,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadConversations() {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setConversations(data);
      }
      setLoading(false);
    }

    loadConversations();
  }, [userId, activeConversationId]);

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const confirmed = window.confirm('Delete this conversation?');
    if (!confirmed) return;

    await supabase.from('conversations').delete().eq('id', id);
    setConversations((prev) => prev.filter((c) => c.id !== id));

    if (id === activeConversationId) {
      onNewConversation();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <aside className="w-64 bg-gray-50 border-r h-full flex flex-col">
      <div className="p-4">
        <button
          onClick={onNewConversation}
          className="w-full py-2 px-4 bg-amber-700 text-white rounded-md
            hover:bg-amber-800 transition-colors text-sm"
        >
          + New Conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-center text-gray-400 text-sm p-4">Loading...</p>
        ) : conversations.length === 0 ? (
          <p className="text-center text-gray-400 text-sm p-4">
            No conversations yet
          </p>
        ) : (
          <ul className="space-y-1 px-2">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <button
                  onClick={() => onSelectConversation(conv.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm
                    group flex items-center justify-between
                    ${
                      conv.id === activeConversationId
                        ? 'bg-amber-100 text-amber-900'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                >
                  <div className="truncate flex-1 mr-2">
                    <p className="truncate font-medium">{conv.title}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(conv.updated_at)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400
                      hover:text-red-500 transition-opacity"
                    aria-label="Delete conversation"
                  >
                    x
                  </button>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
```

---

## Enhanced Source Citations

Make source citations interactive and informative:

```tsx
// src/components/chat/SourceCard.tsx
'use client';

import { useState } from 'react';
import type { Source } from '@/types';

interface SourceCardProps {
  source: Source;
  index: number;
}

export function SourceCard({ source, index }: SourceCardProps) {
  const [expanded, setExpanded] = useState(false);

  const relevanceColor =
    source.similarity > 0.9
      ? 'bg-green-100 text-green-800'
      : source.similarity > 0.8
        ? 'bg-amber-100 text-amber-800'
        : 'bg-gray-100 text-gray-800';

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 py-2 flex items-center gap-2
          hover:bg-gray-50 transition-colors"
      >
        <span className="text-xs font-mono font-bold text-amber-700">
          [{index + 1}]
        </span>
        <span className="text-sm font-medium truncate flex-1">
          {source.document_title}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${relevanceColor}`}>
          {(source.similarity * 100).toFixed(0)}%
        </span>
        <span className="text-gray-400 text-xs">
          {expanded ? 'Hide' : 'Show'}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t bg-gray-50">
          <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap leading-relaxed">
            {source.chunk_content}
          </p>
        </div>
      )}
    </div>
  );
}
```

Then update the `MessageBubble` to use it:

```tsx
// Updated section in MessageBubble.tsx
{sources && sources.length > 0 && !isStreaming && (
  <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
    <p className="text-xs font-semibold text-gray-500">
      Sources ({sources.length})
    </p>
    {sources.map((source, i) => (
      <SourceCard key={i} source={source} index={i} />
    ))}
  </div>
)}
```

---

## Loading States and UX Polish

Good loading states make the difference between an app that feels fast and one that feels broken.

### Skeleton Loaders

```tsx
// src/components/ui/Skeleton.tsx
interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className = '', lines = 3 }: SkeletonProps) {
  return (
    <div className={`animate-pulse space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 rounded"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
}
```

### Thinking Indicator

Show users that the AI is processing their question:

```tsx
// src/components/chat/ThinkingIndicator.tsx
export function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-gray-100 rounded-lg px-4 py-3 max-w-[80%]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-sm text-gray-500">
            Searching documents and thinking...
          </span>
        </div>
      </div>
    </div>
  );
}
```

### Toast Notifications

```tsx
// src/components/ui/Toast.tsx
'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-amber-700',
  };

  return (
    <div className={`fixed bottom-4 right-4 ${colors[type]} text-white
      px-4 py-3 rounded-lg shadow-lg z-50 animate-slide-up`}>
      <div className="flex items-center gap-2">
        <span className="text-sm">{message}</span>
        <button onClick={onClose} className="text-white/80 hover:text-white">
          x
        </button>
      </div>
    </div>
  );
}
```

---

## Deploying to Vercel

### Step 1: Push to GitHub

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "feat: complete BrainBase AI knowledge base app"

# Create a GitHub repo and push
gh repo create brainbase --private --source=. --push
```

### Step 2: Connect to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts:
# - Link to existing project? No
# - What's your project name? brainbase
# - Framework? Next.js (auto-detected)
# - Root directory? ./ (default)
```

### Step 3: Set Environment Variables

In the Vercel dashboard (or via CLI), add your environment variables:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add OPENAI_API_KEY
```

Or do it all at once in the Vercel dashboard under Settings > Environment Variables.

### Step 4: Deploy to Production

```bash
vercel --prod
```

Your app is now live. Vercel will give you a URL like `https://brainbase-abc123.vercel.app`.

### Step 5: Configure a Custom Domain (Optional)

```bash
vercel domains add brainbase.yourdomain.com
```

Follow the DNS instructions to point your domain to Vercel.

### Post-Deployment Checklist

Run through this checklist after deploying:

```
[ ] Auth flow works (sign up, email confirmation, sign in)
[ ] File upload processes correctly
[ ] Chat returns relevant responses with citations
[ ] Conversation history persists across sessions
[ ] All protected routes redirect to login when logged out
[ ] Mobile responsive layout works
[ ] Error states are handled gracefully
[ ] Loading states appear during async operations
[ ] API routes respect the 10s/60s function timeout
[ ] Environment variables are all set in Vercel
```

---

## Production Hardening

### Rate Limiting

Protect your API from abuse:

```typescript
// src/lib/utils/rate-limit.ts
// > **Serverless Warning:** This in-memory rate limiter is for development only.
// > On Vercel (serverless), each function invocation may run in a separate
// > instance with its own memory. For production, use Redis or Vercel KV for
// > shared rate limiting state.
const rateLimit = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  userId: string,
  limit: number = 20,
  windowMs: number = 60_000
): boolean {
  const now = Date.now();
  const entry = rateLimit.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimit.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}
```

Use it in your API routes:

```typescript
// In /api/chat/route.ts
import { checkRateLimit } from '@/lib/utils/rate-limit';

// Inside the POST handler, before processing:
if (!checkRateLimit(userId, 20, 60_000)) {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please wait a minute.' }),
    { status: 429 }
  );
}
```

### Error Boundary

Wrap your app in an error boundary so crashes do not show a blank screen:

```tsx
// src/app/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-500 mb-4">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-amber-700 text-white rounded-md
            hover:bg-amber-800 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
```

---

## Final Project Structure

Here is what your completed BrainBase project should look like:

```
brainbase/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── error.tsx
│   │   ├── login/page.tsx
│   │   ├── auth/callback/route.ts
│   │   ├── chat/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── documents/page.tsx
│   │   └── api/
│   │       ├── health/route.ts
│   │       ├── ingest/route.ts
│   │       ├── chat/route.ts
│   │       └── documents/route.ts
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── ConversationSidebar.tsx
│   │   │   ├── SourceCard.tsx
│   │   │   └── ThinkingIndicator.tsx
│   │   ├── documents/
│   │   │   ├── UploadForm.tsx
│   │   │   └── DocumentList.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Skeleton.tsx
│   │       ├── Spinner.tsx
│   │       └── Toast.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   ├── ai/
│   │   │   ├── embeddings.ts
│   │   │   ├── chunking.ts
│   │   │   ├── chat.ts
│   │   │   └── reranker.ts
│   │   └── utils/
│   │       ├── file-parser.ts
│   │       ├── constants.ts
│   │       └── rate-limit.ts
│   ├── types/index.ts
│   └── middleware.ts
├── .env.local
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Key Takeaways

- **Supabase Auth** integrates seamlessly with Row Level Security to give each user a private, isolated knowledge base with minimal code.
- **Conversation history** transforms a stateless Q&A tool into a persistent assistant that users want to come back to.
- **Interactive source citations** build trust. When users can see exactly where an answer came from, they are far more likely to trust and use the tool.
- **Loading states** are not cosmetic -- they are essential UX. An app without loading states feels broken, even if it is working perfectly.
- **Vercel deployment** for Next.js is nearly zero-config. The main work is making sure your environment variables are set correctly.
- **Rate limiting** and **error boundaries** are the minimum production hardening you need before putting an app in front of real users.

---

## Try It Yourself

1. **Complete the capstone**: If you have been following along, you should now have a fully working BrainBase app. Deploy it to Vercel and share the URL with a friend. Have them upload a document and ask questions about it. Note any UX friction.

2. **Add Google OAuth**: Extend the login page to support "Sign in with Google" using Supabase's OAuth providers. Most users prefer social login over email/password.

3. **Implement document management**: Build a document library page where users can see all their uploaded documents, view chunk counts, and delete documents they no longer need.

4. **Add markdown rendering**: Right now, assistant messages are plain text. Install `react-markdown` and render the assistant's responses with proper formatting (headers, bold, code blocks, lists).

5. **Track usage**: Add a simple dashboard that shows the user how many documents they have uploaded, how many questions they have asked, and their total token usage. This will prepare you for Module 10 where you learn about cost management.

6. **Write a project README**: Document your project with setup instructions, architecture diagrams, and screenshots. This is portfolio-worthy work -- make it shine.

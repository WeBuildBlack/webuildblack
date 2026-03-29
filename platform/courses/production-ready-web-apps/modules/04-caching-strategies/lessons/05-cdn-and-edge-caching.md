---
title: "CDN and Edge Caching"
estimatedMinutes: 30
---

# CDN and Edge Caching

You've cached data in Redis (application layer) and set HTTP headers so browsers and proxies can cache responses (transport layer). The final caching layer sits between your server and the user: the CDN, or Content Delivery Network.

A CDN is a globally distributed network of servers (called "edge nodes" or "points of presence") that cache your content close to your users. When a user in Tokyo requests Gather's event page, the CDN serves it from a server in Tokyo instead of routing the request to your origin server in Virginia. The physical distance alone saves 100-200ms of network latency.

In this lesson, you'll learn how CDNs work, configure Next.js Incremental Static Regeneration (ISR) for Gather's frontend, and understand Vercel's edge caching behavior.

---

## How a CDN Works

### Points of Presence (PoPs)

A CDN has servers in dozens to hundreds of cities worldwide. Each location is called a **Point of Presence (PoP)** or an **edge node**. Major CDN providers like Cloudflare, Fastly, and Vercel have PoPs in 200+ cities.

```
User in Tokyo → Tokyo PoP (2ms) → Origin Server in Virginia (150ms)
User in London → London PoP (5ms) → Origin Server in Virginia (100ms)
User in NYC   → NYC PoP (1ms)    → Origin Server in Virginia (10ms)
```

If the Tokyo PoP has a cached copy of the response, it serves it directly. The request never crosses the Pacific Ocean.

### Cache Hit at the Edge

When a request reaches a CDN edge node, one of three things happens:

1. **Cache HIT**: The edge has a valid cached copy. It returns it immediately. Response time: 1-30ms.
2. **Cache MISS**: The edge doesn't have a copy. It forwards the request to the origin server, caches the response, and returns it to the user. Response time: 100-300ms (same as no CDN, plus a small overhead).
3. **Cache STALE**: The edge has an expired copy. Depending on configuration, it either serves the stale copy while fetching a fresh one in the background (stale-while-revalidate), or blocks until it gets a fresh copy.

### What Gets Cached at the Edge

CDNs can cache anything with appropriate `Cache-Control` headers:

- **Static assets** (CSS, JS, images, fonts): Almost always cached. Typically with long TTLs (1 year) and content-hashed filenames.
- **HTML pages**: Cached if the server sends `s-maxage` or `Cache-Control: public`. This is where ISR comes in.
- **API responses**: Cached if the server sends appropriate headers. This is what you configured in Lesson 04 with `s-maxage`.

---

## Cache Warming vs. On-Demand Caching

### On-Demand (Default)

Most CDN caching is on-demand. The first user to request a resource after it's deployed (or after the cache expires) gets a cache miss. The CDN fetches from the origin, caches the response, and all subsequent users get cache hits.

```
User 1: MISS → origin (slow) → cache stored
User 2: HIT (fast)
User 3: HIT (fast)
...
User N: HIT (fast)
```

The downside is that User 1 gets a slow response. For high-traffic pages, this is fine because the miss only happens once. For low-traffic pages, every user might get a miss if the cache expires between visits.

### Cache Warming

Cache warming means proactively populating the CDN cache before users request the content. You send requests to your own pages to trigger cache fills.

```bash
# Simple cache warming script
#!/bin/bash
EVENTS=$(curl -s https://api.gather.dev/api/events/ | jq -r '.events[].id')
for id in $EVENTS; do
    curl -s "https://gather.dev/events/$id" > /dev/null
    echo "Warmed: /events/$id"
done
```

This is useful after deploys or cache purges, ensuring that the first real users don't hit cold caches.

---

## Next.js Incremental Static Regeneration (ISR)

Gather's frontend is a Next.js app deployed on Vercel. Next.js offers three rendering strategies:

1. **Static Site Generation (SSG)**: Pages are generated at build time. Fast, but stale until the next deploy.
2. **Server-Side Rendering (SSR)**: Pages are generated on every request. Always fresh, but slow.
3. **Incremental Static Regeneration (ISR)**: Pages are generated at build time AND regenerated in the background after a configurable interval. The best of both worlds.

ISR is the perfect fit for Gather's event pages. Event details don't change every second, but they do change (new RSVPs, updated descriptions). ISR lets you serve a static page instantly while regenerating it in the background when it becomes stale.

### How ISR Works

```
1. Build time: Next.js generates /events/42 as a static HTML file
2. User requests /events/42:
   - If the page is fresh (within revalidate window): serve static HTML instantly
   - If the page is stale (past revalidate window):
     a. Serve the stale page immediately (user doesn't wait)
     b. Trigger a background regeneration
     c. Next request gets the fresh page
```

This is the **stale-while-revalidate** pattern applied at the page level.

### Configuring ISR for Gather Event Pages

In your Next.js event detail page:

```typescript
// app/events/[id]/page.tsx

import { Metadata } from "next";

interface EventPageProps {
  params: { id: string };
}

// Generate static pages for the most popular events at build time
export async function generateStaticParams() {
  const response = await fetch(`${process.env.API_URL}/api/events/?limit=50`);
  const data = await response.json();

  return data.events.map((event: { id: number }) => ({
    id: String(event.id),
  }));
}

// Fetch event data with ISR revalidation
async function getEvent(id: string) {
  const response = await fetch(`${process.env.API_URL}/api/events/${id}/`, {
    next: { revalidate: 60 }, // Revalidate every 60 seconds
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const event = await getEvent(params.id);

  if (!event) {
    return { title: "Event Not Found" };
  }

  return {
    title: `${event.title} | Gather`,
    description: event.description?.slice(0, 160),
    openGraph: {
      title: event.title,
      description: event.description?.slice(0, 160),
      type: "website",
    },
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const event = await getEvent(params.id);

  if (!event) {
    return <div>Event not found</div>;
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{event.title}</h1>

      <div className="flex items-center gap-4 text-gray-600 mb-6">
        <time dateTime={event.start_date}>
          {new Date(event.start_date).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
        <span>{event.venue?.name}</span>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <p className="text-lg font-semibold">
          {event.rsvp_count} {event.rsvp_count === 1 ? "person" : "people"} attending
        </p>
      </div>

      <div className="prose max-w-none">
        <p>{event.description}</p>
      </div>
    </main>
  );
}
```

### Key ISR Concepts

**`revalidate: 60`**: This tells Next.js that the data is valid for 60 seconds. After 60 seconds, the next request triggers a background regeneration. The user who triggers the regeneration still gets the stale page instantly. The following user gets the fresh page.

**`generateStaticParams`**: This pre-generates pages for the top 50 events at build time. Events not in this list are generated on the first request (on-demand ISR) and cached for subsequent requests.

**On-demand revalidation**: For cases where you need immediate updates (not waiting up to 60 seconds), Next.js supports on-demand revalidation via API routes:

```typescript
// app/api/revalidate/route.ts

import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { secret, path } = await request.json();

  // Verify the revalidation secret
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  revalidatePath(path);

  return NextResponse.json({ revalidated: true, path });
}
```

You can call this from your Django signal handler when an event is updated:

```python
# events/signals.py

import requests
from django.conf import settings

@receiver(post_save, sender=Event)
def revalidate_frontend_cache(sender, instance, **kwargs):
    """Tell Next.js to revalidate the event page when the event changes."""
    try:
        requests.post(
            f"{settings.FRONTEND_URL}/api/revalidate",
            json={
                "secret": settings.REVALIDATION_SECRET,
                "path": f"/events/{instance.id}",
            },
            timeout=5,
        )
    except requests.RequestException:
        pass  # Frontend revalidation is best-effort
```

---

## Vercel Edge Network

Vercel (which hosts Gather's Next.js frontend) has its own CDN called the Edge Network. When you deploy to Vercel, your pages are automatically distributed to edge nodes worldwide.

### How Vercel Caches ISR Pages

Vercel's behavior for ISR pages follows the stale-while-revalidate pattern:

```
1. Deploy: Build generates static HTML for pages with generateStaticParams
2. First request: Edge serves static HTML (cache HIT)
3. After revalidate period: Edge serves stale HTML, triggers background regeneration
4. Background regeneration: Vercel's serverless function re-renders the page
5. Next request: Edge serves the fresh HTML
```

You can see Vercel's cache status in the response headers:

```bash
curl -v https://gather.dev/events/42 2>&1 | grep -i "x-vercel"
# x-vercel-cache: HIT       # Served from edge cache
# x-vercel-cache: STALE     # Served stale, regenerating in background
# x-vercel-cache: MISS      # Cache miss, rendered on demand
# x-vercel-cache: PRERENDER # Served from build-time static generation
```

### Configuring Cache Headers in next.config.js

You can set custom cache headers for specific routes:

```javascript
// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Static assets: cache for 1 year (content-hashed filenames)
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Event pages: short browser cache, longer CDN cache
        source: "/events/:id",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        // API routes: no caching (handled by Django backend)
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### stale-while-revalidate

The `stale-while-revalidate` directive is critical for ISR. It tells the CDN:

```http
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
```

This means:
- For the first 60 seconds: serve the cached version (fresh)
- From 60-360 seconds: serve the cached version (stale) but fetch a fresh copy in the background
- After 360 seconds: the cached version is too old. Block until a fresh copy is fetched.

The user never waits for a regeneration. They always get an instant response. The page just might be up to 60 seconds behind the latest data. For event pages, this is an excellent tradeoff.

---

## Cache Purging

Sometimes you need to remove cached content immediately. Maybe an event was cancelled, or a critical detail was wrong. You can't wait for TTL expiration.

### Vercel Cache Purging

Vercel automatically purges the cache when you redeploy. For targeted purging without a full redeploy, use the on-demand revalidation API you built earlier:

```bash
# Purge a specific event page
curl -X POST https://gather.dev/api/revalidate \
  -H "Content-Type: application/json" \
  -d '{"secret": "your-secret", "path": "/events/42"}'
```

### CDN-Level Purging (Cloudflare Example)

If you put a CDN like Cloudflare in front of your Django API, you can purge cached API responses:

```bash
# Purge a specific URL
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  -d '{"files": ["https://api.gather.dev/api/events/42/"]}'

# Purge everything (nuclear option)
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything": true}'
```

### When to Purge vs. Let TTL Expire

| Situation | Strategy |
|-----------|----------|
| Event cancelled | Purge immediately |
| Event title updated | Let TTL expire (60s is acceptable) |
| Critical safety information changed | Purge immediately |
| RSVP count changed | Let TTL expire (stale count is fine) |
| New deploy with breaking frontend changes | Full purge (Vercel does this automatically) |

---

## Static vs. Dynamic Content at the Edge

Not all content belongs at the edge. Here's how to think about what to cache where for Gather:

### Cache Aggressively at CDN

- **Static assets**: CSS, JS, images, fonts. Hash filenames, cache for 1 year.
- **Event listing page (HTML)**: ISR with 60s revalidation. Most users see a cached page.
- **Event detail page (HTML)**: ISR with 60s revalidation. Stale-while-revalidate for seamless updates.
- **Public API responses**: `s-maxage=120` for event listings. CDN absorbs traffic spikes.

### Cache Only in Browser (private)

- **User dashboard**: Contains personal data. `Cache-Control: private, no-cache`.
- **RSVP status**: Per-user. Cached in Redis on the backend, not at CDN.

### Never Cache

- **Authentication endpoints**: `Cache-Control: no-store`.
- **RSVP mutations** (POST/DELETE): Mutation endpoints should never be cached.
- **Stripe checkout redirects**: Security-sensitive, never cache.

---

## The Complete Caching Architecture for Gather

Here's how all the layers you've built in this module work together:

```
User's Browser
  └── Browser Cache (Cache-Control: max-age)
       └── Vercel Edge CDN (s-maxage, stale-while-revalidate)
            └── Next.js ISR (revalidate: 60)
                 └── Django API
                      └── Redis Application Cache (django-redis, TTL + signal invalidation)
                           └── PostgreSQL (shared_buffers)
                                └── Disk (SSD)
```

A request for an event page might be served at any of these layers:

1. **Browser cache**: 0ms. User revisited within max-age window.
2. **Vercel edge**: 5-30ms. Another user in the same region already cached it.
3. **ISR static page**: The Next.js app serves pre-rendered HTML.
4. **Redis**: 1ms. Django skips the database query.
5. **PostgreSQL shared_buffers**: 2-5ms. Database has the pages in memory.
6. **Disk**: 10-50ms. Full database query from disk.

Each layer reduces load on the layer below it. The CDN absorbs most of the traffic, ISR handles the rendering, Redis handles the API queries, and PostgreSQL only sees a fraction of the actual user traffic.

---

## Key Takeaways

- A CDN caches content at edge servers worldwide, reducing latency by serving responses from the nearest location to the user
- Next.js ISR generates static pages at build time and regenerates them in the background, combining the speed of static sites with the freshness of server rendering
- `stale-while-revalidate` ensures users never wait for regeneration. They get an instant (possibly slightly stale) response while a fresh version is built in the background.
- On-demand revalidation lets you trigger immediate cache updates from your Django backend when critical data changes
- Cache static assets aggressively (1 year with hashed filenames), cache public pages with moderate TTLs (60s), and never cache authentication or mutation endpoints
- Vercel automatically handles edge caching, cache purging on deploy, and ISR regeneration. The `x-vercel-cache` header shows the cache status for debugging.

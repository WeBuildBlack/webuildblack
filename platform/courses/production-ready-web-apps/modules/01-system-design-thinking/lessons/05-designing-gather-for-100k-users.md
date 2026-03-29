---
title: "Designing Gather for 100K Users"
estimatedMinutes: 40
---

# Designing Gather for 100K Users

You now have the conceptual toolkit: latency vs. throughput, horizontal vs. vertical scaling, the CAP theorem, and consistency models. In this lesson, you'll put all of those concepts to work on a single question: **what does Gather need to look like to serve 100,000 users?**

This is the kind of exercise you'd do at the whiteboard in a system design interview, or in a planning meeting before a major launch. You'll estimate traffic, calculate resource requirements, identify bottlenecks, propose solutions, and document your decisions in an Architecture Decision Record (ADR).

## Step 1: Estimate the Traffic

System design starts with numbers. Not perfect numbers, but reasonable estimates that give you the right order of magnitude. Let's work through Gather's expected traffic.

### User Behavior Assumptions

Start with what you know (or can reasonably guess) about how users interact with Gather:

```
Total registered users:          100,000
Daily active users (DAU):        10% = 10,000
Peak concurrent users:           20% of DAU = 2,000

Average session:
  - Duration: 8 minutes
  - Page views: 5 pages
  - API calls per page: 3 (events list, user info, categories)
  - Write actions: 0.5 per session (RSVPs, comments, etc.)
```

### Calculate Requests Per Second

```
Daily API calls (reads):
  10,000 DAU x 5 pages x 3 calls = 150,000 read requests/day

Daily API calls (writes):
  10,000 DAU x 0.5 writes = 5,000 write requests/day

Total daily requests: 155,000

Requests per second (average):
  155,000 / 86,400 seconds = ~1.8 RPS (average)
```

That seems low. But traffic is never evenly distributed. Most activity happens during a few peak hours.

### The Peak Traffic Multiplier

Real traffic follows patterns. For an event platform like Gather, most activity happens in the evening when people are planning their week.

```
Traffic Distribution (typical day):

Requests
  │
  │                          ████
  │                        ████████
  │                      ████████████
  │                    ██████████████
  │         ██        ████████████████
  │       ██████    ██████████████████
  │     ████████  ████████████████████
  │   ██████████████████████████████████
  │ ██████████████████████████████████████
  └─────────────────────────────────────────
   12am  6am  9am  12pm  3pm  6pm  9pm  12am

Peak hours: 6pm - 10pm (4 hours)
~60% of daily traffic happens in these 4 hours
```

```
Peak requests per second:
  155,000 x 0.6 = 93,000 requests in 4 hours
  93,000 / (4 x 3600) = ~6.5 RPS (peak average)

Burst factor (2-3x peak average for spikes):
  6.5 x 3 = ~20 RPS (peak burst)
```

### The Event Spike Scenario

Now consider what happens when a popular event drops. Imagine a Gather event for a free tech conference goes viral on social media:

```
Spike scenario:
  - 5,000 users hit the event page in 10 minutes
  - Each loads the event detail page (2 API calls)
  - 2,000 of them try to RSVP (1 write each)

  Reads:  5,000 x 2 / 600 seconds = ~17 RPS
  Writes: 2,000 / 600 seconds = ~3.3 RPS
  Total:  ~20 RPS sustained for 10 minutes

  But RSVPs cluster at the start (everyone clicks immediately):
  First 60 seconds: 800 RSVPs = ~13 writes/sec
  Plus reads: ~30 RPS total burst
```

### Traffic Summary

| Scenario | Reads (RPS) | Writes (RPS) | Total (RPS) |
|----------|-------------|--------------|-------------|
| Average day | 1.5 | 0.06 | ~2 |
| Peak hours | 5.5 | 1.0 | ~7 |
| Peak burst | 15 | 5 | ~20 |
| Viral event spike | 17 | 13 | ~30 |
| Target headroom (3x burst) | 50 | 40 | ~90 |

The target headroom row is important. You should design for 3-5x your expected peak to handle unexpected spikes without falling over. Our target: **handle 90 requests per second comfortably.**

Is 90 RPS a lot? No. Most web frameworks can handle this on a single reasonably-sized server. The challenge isn't raw throughput. It's everything else: database connections, slow queries at scale, file storage, background processing, and maintaining reliability when things go wrong.

## Step 2: Calculate Resource Requirements

With traffic estimates in hand, let's figure out what infrastructure we need.

### Database Connections

```
Django workers needed:
  - Each request takes ~50ms average (after optimization)
  - Each worker handles 1 request at a time
  - For 90 RPS: 90 x 0.05 = 4.5 workers needed minimum
  - With safety margin (2x): 9 workers
  - Practical: 12 workers (3 containers x 4 workers each)

Database connections:
  - Each Django worker holds 1 persistent DB connection
  - 12 workers = 12 connections to PostgreSQL
  - Celery workers (background jobs): 4 more connections
  - Django management commands, migrations: 2 connections
  - Total: ~18 connections

PostgreSQL default max_connections: 100
Current usage: 18 / 100 = 18% (comfortable)
```

At 100K users, we're fine on connections. But without connection pooling, each new Django process opens a new connection, and those add up quickly if you scale to more workers or add more services.

### Database Storage

```
Data estimates at 100K users:

Users table:
  100,000 rows x ~500 bytes each = ~50 MB

Events table:
  50,000 events x ~2 KB each = ~100 MB

RSVPs table:
  500,000 RSVPs x ~200 bytes each = ~100 MB

Categories and other tables: ~10 MB

Indexes: ~50% of data size = ~130 MB

Total database size: ~390 MB

PostgreSQL recommended RAM: 2-4x database size for buffer cache
Minimum RAM for DB: 1.5 GB (with room to grow)
```

390 MB is tiny by database standards. PostgreSQL can keep the entire dataset in memory, which means most queries will be served from the buffer cache, not from disk. This is good news.

### File Storage

```
Event images:
  50,000 events x 60% have images = 30,000 images
  Average image size (after optimization): 500 KB
  Total: 30,000 x 500 KB = ~15 GB

User avatars:
  100,000 users x 30% have avatars = 30,000 avatars
  Average avatar size: 200 KB
  Total: 30,000 x 200 KB = ~6 GB

Total file storage: ~21 GB
Monthly growth estimate: ~2 GB
```

21 GB is manageable on local storage, but local storage doesn't scale horizontally. When we add a second Django server, it won't have access to the first server's files. Object storage (Module 5) solves this.

### Memory Requirements

```
Django worker memory:
  ~80 MB per worker x 12 workers = ~960 MB

Next.js processes:
  ~150 MB per process x 4 processes = ~600 MB

PostgreSQL:
  shared_buffers (25% of RAM): 512 MB
  work_mem: 64 MB x concurrent queries
  Total: ~1 GB

Redis (cache + sessions):
  Cache entries: ~200 MB
  Session data: ~50 MB
  Total: ~250 MB

Celery workers:
  ~100 MB per worker x 4 workers = ~400 MB

Total memory footprint: ~3.2 GB
Recommended server RAM (with headroom): 8 GB
```

## Step 3: Identify the Bottlenecks

Now comes the critical question: what will break first as we scale from the current prototype to 100K users?

### Bottleneck 1: Synchronous Email Sending

**Impact: High. Blocks every write request that triggers notifications.**

Currently, creating an RSVP takes ~860ms because the email is sent synchronously. During the viral event spike (13 writes/sec), every Django worker will be blocked waiting on the SMTP server. With 12 workers, you can handle about 14 write requests per second. That sounds like enough, but those workers can't handle read requests while they're blocked.

```
12 workers, all blocked on email sends:
  12 / 0.86 seconds per request = ~14 writes/sec maximum
  But 0 reads/sec during this time

Real capacity with mixed traffic:
  Split: 8 workers for reads, 4 for writes
  Reads: 8 / 0.05 = 160 RPS (fine)
  Writes: 4 / 0.86 = ~5 RPS (barely enough)
  If a spike hits: writes queue up, latency explodes
```

**Solution (Module 3):** Move email sending to Celery background tasks. The RSVP endpoint returns in ~15ms instead of ~860ms, freeing workers immediately.

### Bottleneck 2: Unoptimized Database Queries

**Impact: High. Affects every request.**

The event listing query joins events with RSVPs to get counts, categories, and organizer info. Without proper indexes, this query degrades as data grows.

```sql
-- Current query (generated by Django ORM)
SELECT e.*, COUNT(r.id) as rsvp_count, u.username as organizer_name
FROM events e
LEFT JOIN rsvps r ON r.event_id = e.id
LEFT JOIN auth_user u ON u.id = e.organizer_id
WHERE e.date >= NOW()
GROUP BY e.id, u.username
ORDER BY e.date
LIMIT 20;

-- Performance at different data sizes:
-- 1,000 events:    ~5ms
-- 10,000 events:   ~50ms
-- 50,000 events:   ~400ms  (p50)
-- 50,000 events:   ~1200ms (p99, during concurrent writes)
```

**Solution (Module 2):** Add composite indexes, denormalize RSVP counts, use `select_related` and `prefetch_related` in Django.

### Bottleneck 3: No Caching Layer

**Impact: Medium. Every request hits the database, even for unchanged data.**

The event listing page shows the same data to every user. Without caching, 1,000 users viewing the homepage means 1,000 identical database queries.

```
Without caching:
  1,000 homepage views = 1,000 database queries
  Each query: ~50ms (optimized)
  Database load: 1,000 x 50ms = 50 seconds of query time

With caching (30-second TTL):
  1,000 homepage views = 1 database query + 999 cache hits
  Cache hit: ~1ms
  Database load: 1 x 50ms = 50ms of query time
  99.9% reduction in database load
```

**Solution (Module 4):** Add Redis caching with intelligent invalidation.

### Bottleneck 4: Local File Storage

**Impact: Medium. Blocks horizontal scaling.**

Event images are stored on the Django server's local filesystem. This works with one server but breaks the moment you add a second one.

```
Server A receives: POST /api/events/ (with image upload)
  Image saved to /app/media/events/photo.jpg on Server A

Server B receives: GET /api/events/1/
  Tries to serve /app/media/events/photo.jpg
  File not found! Returns broken image.
```

**Solution (Module 5):** Move file storage to S3-compatible object storage.

### Bottleneck 5: No Monitoring or Alerting

**Impact: High (for operations). You can't fix what you can't see.**

Right now, if Gather slows down or starts throwing errors, you won't know until users complain. There are no metrics, no dashboards, no alerts.

```
Current visibility into production:

  Latency:     ¯\_(ツ)_/¯
  Error rate:  Check the logs manually
  Throughput:  No idea
  DB load:     SSH in and run top
  Disk space:  Hope for the best
```

**Solution (Module 7):** Add OpenTelemetry instrumentation, Prometheus metrics, and Grafana dashboards.

### Bottleneck Priority Matrix

```
                    HIGH IMPACT
                        │
  ┌─────────────────────┼─────────────────────┐
  │                     │                     │
  │  Monitoring         │  Sync emails        │
  │  (Module 7)         │  (Module 3)         │
  │                     │                     │
  │                     │  Slow queries       │
  │                     │  (Module 2)         │
  │                     │                     │
  ├─────────────────────┼─────────────────────┤
  │                     │                     │
  │                     │  No caching         │
  │                     │  (Module 4)         │
  │                     │                     │
  │  Real-time updates  │  Local file storage │
  │  (Module 6)         │  (Module 5)         │
  │                     │                     │
  └─────────────────────┼─────────────────────┘
                        │
  LOW EFFORT ───────────┼──────────── HIGH EFFORT
```

## Step 4: Propose the Target Architecture

Based on our traffic estimates, resource calculations, and bottleneck analysis, here's the target architecture for Gather at 100K users:

```
                           ┌──────────┐
                           │   CDN    │
                           │ (static  │
                           │  assets) │
                           └────┬─────┘
                                │
┌──────────┐            ┌───────┴───────┐
│ Browser  │───────────>│ Nginx         │
│          │<───────────│ Load Balancer │
└──────────┘            └───────┬───────┘
                          ┌─────┴─────┐
                          │           │
                    ┌─────┴──┐  ┌────┴────┐
                    │Next.js │  │Next.js  │
                    │  #1    │  │  #2     │
                    └────┬───┘  └────┬────┘
                         │           │
                    ┌────┴───────────┴────┐
                    │                     │
              ┌─────┴──┐  ┌─────┐  ┌────┴────┐
              │Django  │  │Django│  │Django   │
              │ #1     │  │ #2   │  │  #3     │
              └──┬──┬──┘  └──┬──┘  └──┬──┬───┘
                 │  │        │        │  │
        ┌────────┘  │   ┌────┘   ┌────┘  └────────┐
        │           │   │        │                 │
  ┌─────┴──┐  ┌────┴───┴┐  ┌───┴────┐   ┌───────┴──┐
  │PgBouncer│  │  Redis  │  │ Celery │   │  Object  │
  │(pooler) │  │ (cache, │  │Workers │   │ Storage  │
  └────┬────┘  │ sessions│  │  x 2   │   │  (S3)    │
       │       │ pub/sub)│  └───┬────┘   └──────────┘
  ┌────┴────┐  └─────────┘      │
  │PostgreSQL│                   │
  │(primary) │◄──────────────────┘
  └────┬─────┘
       │ replication
  ┌────┴─────┐     ┌──────────────┐
  │PostgreSQL│     │ Prometheus + │
  │(replica) │     │ Grafana      │
  └──────────┘     └──────────────┘
```

### Component Inventory

| Component | Count | Purpose | Module |
|-----------|-------|---------|--------|
| Nginx | 1 | Load balancing, SSL termination, static files | 8 |
| Next.js | 2 | Server-side rendering, frontend | 3 |
| Django + Gunicorn | 3 (4 workers each) | API, business logic | 2 |
| PgBouncer | 1 | Connection pooling | 2 |
| PostgreSQL (primary) | 1 | Writes, critical reads | 2 |
| PostgreSQL (replica) | 1 | Read scaling | 2 |
| Redis | 1 | Caching, sessions, pub/sub, Celery broker | 4 |
| Celery workers | 2 | Background jobs (emails, image processing) | 3 |
| Object storage (S3) | 1 | Event images, user avatars | 5 |
| CDN | 1 | Static assets, cached API responses | 4 |
| Prometheus + Grafana | 1 | Metrics, dashboards, alerting | 7 |

### Cost Estimate (Cloud Hosting)

```
Monthly cost estimate (DigitalOcean / Hetzner tier):

  3x Django API (2 vCPU, 4 GB each):     $36/mo ($12 each)
  2x Next.js (2 vCPU, 4 GB each):        $24/mo ($12 each)
  1x PostgreSQL primary (4 vCPU, 8 GB):  $48/mo
  1x PostgreSQL replica (2 vCPU, 4 GB):  $24/mo
  1x Redis (2 GB):                        $15/mo
  1x PgBouncer (1 vCPU, 1 GB):           $6/mo
  2x Celery workers (2 vCPU, 2 GB each): $12/mo ($6 each)
  Object storage (50 GB):                 $5/mo
  Load balancer:                          $12/mo
  CDN (100 GB bandwidth):                 $0 (Cloudflare free tier)
  Monitoring (self-hosted):               $0 (runs on existing infra)

  Total: ~$182/month

  Compare to: single beefy server approach
  1x server (16 vCPU, 32 GB RAM): ~$96/month
  But: single point of failure, can't scale components
  independently, no redundancy
```

The distributed architecture costs about 2x the single-server approach, but gives you redundancy, independent scaling, and the ability to handle traffic spikes without downtime.

## Step 5: Architecture Decision Records (ADRs)

When you make architectural decisions, write them down. An Architecture Decision Record (ADR) captures the context, options considered, decision made, and consequences. It prevents the "why did we do it this way?" question that comes up six months later.

### ADR Format

```markdown
# ADR-001: [Title of Decision]

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## Context
[What is the situation? What problem are you solving?
What constraints exist?]

## Decision
[What did you decide to do?]

## Options Considered

### Option 1: [Name]
- Pros: ...
- Cons: ...

### Option 2: [Name]
- Pros: ...
- Cons: ...

## Consequences

### Positive
- [What improves?]

### Negative
- [What gets harder? What new problems does this introduce?]

### Risks
- [What could go wrong?]
```

### Example ADR for Gather

```markdown
# ADR-001: Use PgBouncer for Database Connection Pooling

## Status
Accepted

## Context
Gather's Django API runs multiple worker processes, each holding
a persistent connection to PostgreSQL. As we scale to 12 workers
(3 containers x 4 workers), we'll use 12 of PostgreSQL's default
100 connection limit. Adding Celery workers, management commands,
and future services will push us toward that limit.

PostgreSQL performance degrades significantly above 100 connections
because each connection consumes ~10 MB of RAM and requires its own
backend process. Even if we increase max_connections, performance
suffers.

## Decision
Deploy PgBouncer in transaction pooling mode between Django and
PostgreSQL. PgBouncer will maintain a pool of 20 PostgreSQL
connections and multiplex hundreds of application connections
onto them.

## Options Considered

### Option 1: PgBouncer (transaction pooling)
- Pros: Mature, lightweight, well-understood. Transaction pooling
  releases connections back to the pool after each transaction,
  maximizing reuse. Used by most Django-at-scale deployments.
- Cons: Does not support prepared statements in transaction mode.
  Some Django features (persistent connections, server-side cursors)
  need configuration changes.

### Option 2: pgcat
- Pros: Modern, written in Rust, supports query-level load
  balancing and sharding.
- Cons: Newer, smaller community, more complex configuration.
  Features we don't need yet.

### Option 3: Django's built-in CONN_MAX_AGE
- Pros: No additional infrastructure. Just a settings change.
- Cons: Only reuses connections within the same worker process.
  Does not reduce total connection count across workers. Does not
  solve the fundamental max_connections problem.

## Consequences

### Positive
- Support 200+ application connections with only 20 PostgreSQL
  connections
- Reduce PostgreSQL memory usage by 80%
- Enable horizontal scaling of Django workers without connection
  limits

### Negative
- Additional infrastructure component to deploy and monitor
- Cannot use Django's server-side cursors (used for iterating
  large querysets)
- Slightly more complex local development setup

### Risks
- PgBouncer itself becomes a single point of failure (mitigate
  with health checks and automatic restart)
```

ADRs are lightweight documentation that pays for itself. When a new team member asks "why are we running PgBouncer instead of just increasing PostgreSQL's max_connections?", you point them to ADR-001.

## Step 6: Preview the Road Ahead

Here's how the remaining modules map to the architecture we've designed:

| Module | What You'll Build | Bottleneck Addressed |
|--------|-------------------|---------------------|
| 2. Database Performance | Indexes, query optimization, PgBouncer, read replica | Slow queries, connection limits |
| 3. Background Jobs | Celery + Redis for async tasks | Synchronous email blocking |
| 4. Caching | Redis cache, CDN, browser caching | Redundant database queries |
| 5. Object Storage | S3 integration, async image processing | Local file storage |
| 6. Real-Time | Server-Sent Events with Redis pub/sub | Polling for updates |
| 7. Observability | OpenTelemetry, Prometheus, Grafana | Flying blind in production |
| 8. Deployment | Blue-green deploys, Nginx, Docker Compose | Downtime during updates |
| 9. Security and Resilience | OWASP hardening, chaos testing, rate limiting | Vulnerability and fragility |
| 10. Capstone | Load testing, performance validation | Proving it all works |

Each module follows the same pattern: understand the problem, learn the concepts, implement the solution in Gather, and verify the improvement with measurements.

## A Note on Over-Engineering

Looking at that architecture diagram, you might think: "That's a lot of infrastructure for an app that only needs 90 RPS." And you'd be right to question it.

The goal of this course isn't to build the most complex architecture possible. It's to teach you the skills and patterns so you know how to apply them when you need them. In practice, you should:

1. **Start simple.** A single server with PostgreSQL handles more traffic than most apps will ever see.
2. **Measure first.** Don't add Redis caching until you've measured that database load is actually a problem.
3. **Add complexity only when pain justifies it.** Each new component adds operational burden (monitoring, debugging, upgrades).
4. **Know your tools.** When the time comes to scale, you'll know exactly what to reach for and why.

The difference between a junior and senior engineer isn't that seniors build more complex systems. It's that seniors know which complexity is necessary and which is premature.

## Key Takeaways

1. **Start with traffic estimates.** Back-of-envelope calculations tell you what order of magnitude you're dealing with. For Gather at 100K users, we need about 90 RPS capacity.

2. **Peak traffic is what matters**, not average traffic. Design for 3-5x your expected peak to handle spikes.

3. **Identify bottlenecks systematically.** For Gather, the top bottlenecks are synchronous processing, unoptimized queries, no caching, local file storage, and no monitoring.

4. **The database is almost always the first bottleneck.** Optimize queries, add connection pooling, and consider read replicas before adding more application servers.

5. **Write ADRs** to document architectural decisions. Future you (and your team) will be grateful.

6. **Don't over-engineer.** Add complexity only when measurement shows you need it. Know the tools so you can reach for them at the right time.

## What's Next

This wraps up Module 1: System Design Thinking. You now have the conceptual foundation for everything that follows. In the module project, you'll apply these skills hands-on: analyze Gather's bottlenecks, draw the architecture, estimate traffic, and write your own ADR.

Then in Module 2, we dive into the first (and usually most impactful) optimization: making your database fast.

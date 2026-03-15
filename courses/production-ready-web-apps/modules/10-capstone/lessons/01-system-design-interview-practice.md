---
title: "System Design Interview Practice"
estimatedMinutes: 45
---

# System Design Interview Practice

You've spent nine modules building a production-grade application from the ground up. You've optimized databases, built async pipelines, layered caches, processed images at scale, streamed real-time updates, instrumented everything with OpenTelemetry, deployed with zero downtime, and hardened your system against failure.

Now it's time to talk about it.

System design interviews are where companies evaluate whether you can think at the architecture level. They want to know if you can take a vague problem ("design a system like Uber") and turn it into a concrete, well-reasoned technical plan. The good news: you've already done this. Every module in this course was a system design exercise. This lesson gives you the framework to communicate what you know under interview conditions.

## How System Design Interviews Work

A typical system design interview is 45 to 60 minutes. The interviewer gives you an open-ended prompt like:

- "Design a URL shortener"
- "Design a notification system"
- "Design a video streaming platform"
- "Design an event management platform that handles 100K concurrent users"

That last one should sound familiar.

There is no single correct answer. The interviewer is evaluating your thought process, not checking against a rubric. They want to see:

1. **Can you ask clarifying questions** instead of diving straight into a solution?
2. **Can you estimate scale** and let those numbers drive your decisions?
3. **Can you design at the right level of abstraction**, starting high-level and drilling down?
4. **Can you articulate tradeoffs**, not just pick technologies?
5. **Can you handle curveballs** when the interviewer changes requirements mid-stream?

The candidates who fail are usually the ones who start drawing boxes immediately without understanding the problem. The candidates who succeed are the ones who treat it like a conversation.

## The Framework: Five Steps

Every system design answer follows the same basic structure. You can adapt it, reorder it, and make it your own, but having a framework keeps you from freezing up when the whiteboard is blank.

### Step 1: Clarify Requirements (5 minutes)

Before you design anything, make sure you understand what you're building. Ask questions that narrow the scope:

**Functional requirements** (what does the system do?):
- What are the core features? What can we deprioritize?
- Who are the users? Are there different user types?
- What does the read/write ratio look like?
- Do we need real-time updates or is eventual consistency acceptable?

**Non-functional requirements** (how well does it need to work?):
- What's the expected scale? Users, requests per second, data volume?
- What are the latency requirements? Sub-second? Sub-100ms?
- What's the availability target? 99.9%? 99.99%?
- Are there compliance or data residency requirements?

**Boundaries** (what are we NOT building?):
- Can we use managed services (RDS, S3, ElastiCache)?
- Do we need to design the frontend, or just the backend?
- Is this a greenfield system or are we adding to an existing one?

Write down the requirements you agree on. This becomes your contract with the interviewer. When you make a decision later, you can point back to a specific requirement.

### Step 2: Back-of-the-Envelope Estimates (5 minutes)

Numbers drive architecture decisions. A system serving 100 requests per second is fundamentally different from one serving 100,000. Do the math before you draw anything.

Here's how to estimate for a system like Gather:

```
Target: 100K concurrent users

Assume 10% are actively making requests at any moment:
  Active users = 100,000 * 0.10 = 10,000

Assume each active user makes a request every 10 seconds:
  Requests per second (RPS) = 10,000 / 10 = 1,000 RPS

Read/write split (event browsing is read-heavy):
  Reads: 900 RPS (90%)
  Writes: 100 RPS (10%)

Data storage:
  100K events * 5 KB per event = 500 MB of event data
  2M RSVPs * 200 bytes per RSVP = 400 MB
  500K images * 500 KB average = 250 GB of image storage

Bandwidth:
  Event listing page: ~50 KB (JSON + minimal assets)
  900 read RPS * 50 KB = 45 MB/s outbound
```

These numbers don't need to be precise. They need to be in the right ballpark. The interviewer wants to see that you can reason quantitatively about scale.

**Key insight from this course**: In Module 02, you learned that PostgreSQL can handle about 10,000 simple queries per second on modest hardware. Our estimate of 1,000 RPS is well within range for a single optimized database. But without connection pooling (PgBouncer) and proper indexing, you'd hit connection limits at around 100 concurrent connections. The numbers tell you where to invest.

### Step 3: High-Level Design (10 minutes)

Now draw the architecture. Start with the major components and how they connect. Don't get into implementation details yet.

For Gather at 100K concurrent users, your high-level design includes:

```
                                    ┌──────────────┐
                                    │   CDN        │
                                    │  (CloudFront)│
                                    └──────┬───────┘
                                           │
                                    ┌──────▼───────┐
                                    │ Load Balancer │
                                    │   (ALB)       │
                                    └──────┬───────┘
                                           │
                          ┌────────────────┼────────────────┐
                          │                │                │
                   ┌──────▼──────┐  ┌──────▼──────┐  ┌─────▼───────┐
                   │  Django     │  │  Django     │  │  Next.js    │
                   │  API (Blue) │  │  API (Green)│  │  Frontend   │
                   └──────┬──────┘  └──────┬──────┘  └─────────────┘
                          │                │
                   ┌──────▼────────────────▼──────┐
                   │         PgBouncer            │
                   │    (Connection Pooling)       │
                   └──────────────┬───────────────┘
                                  │
                   ┌──────────────▼───────────────┐
                   │     PostgreSQL (Primary)      │
                   │      + Read Replicas          │
                   └──────────────────────────────┘

         ┌──────────┐    ┌──────────┐    ┌──────────┐
         │  Redis   │    │  Celery  │    │   S3     │
         │ (Cache + │    │ Workers  │    │ (Images) │
         │  Pub/Sub)│    │          │    │          │
         └──────────┘    └──────────┘    └──────────┘

         ┌──────────────────────────────────────────┐
         │  Observability: OpenTelemetry Collector  │
         │  -> Prometheus -> Grafana                │
         └──────────────────────────────────────────┘
```

Walk through the request flow for two or three key operations:

1. **User browses events**: CDN serves static assets. Next.js server-renders the page. API call hits the load balancer, routed to a Django instance. Django checks Redis cache first. On cache hit, returns immediately (p95 < 50ms). On cache miss, queries PostgreSQL through PgBouncer, caches the result, returns response.

2. **User RSVPs to an event**: POST request hits Django API. Django validates the request, writes RSVP to PostgreSQL, publishes an event to Redis Pub/Sub, and enqueues Celery tasks for email confirmation and notification. SSE clients receive the updated RSVP count in real time.

3. **User uploads an event image**: Frontend gets a presigned S3 URL from Django. Browser uploads directly to S3 (no load on application servers). S3 event triggers a Celery task that generates thumbnails and updates the event record.

Notice how every one of these flows maps directly to a module you completed in this course.

### Step 4: Deep Dive (15-20 minutes)

The interviewer will pick one or two areas and ask you to go deeper. This is where your hands-on experience matters. Common deep-dive topics:

**Database design**: Show your schema. Explain your indexing strategy. Discuss why you chose PostgreSQL over NoSQL. Talk about the query optimization work from Module 02. Explain how PgBouncer solves connection exhaustion.

```sql
-- You can speak to specific optimizations you implemented
CREATE INDEX idx_events_date_status ON events(date, status)
  WHERE status = 'published' AND date >= NOW();

-- And explain WHY: this partial index covers the most common query
-- (upcoming published events) with minimal storage overhead
```

**Caching strategy**: Explain your three-layer cache from Module 04. Browser cache for static assets (Cache-Control headers). Redis for application-level caching (event listings, RSVP counts). Database query cache for expensive aggregations. Discuss cache invalidation and why you chose specific TTLs.

**Real-time updates**: Explain why you chose SSE over WebSockets (simpler, HTTP-native, sufficient for unidirectional updates). Discuss how Redis Pub/Sub enables real-time across multiple server instances. Talk about reconnection handling and the EventSource API.

**Reliability**: Discuss circuit breakers from Module 09. Explain how the system degrades gracefully when Redis goes down (falls back to database queries, just slower). Talk about your chaos testing experience with toxiproxy.

### Step 5: Tradeoffs and Extensions (5 minutes)

End by discussing what you chose NOT to do and why. This shows maturity.

- "We used SSE instead of WebSockets because our updates are server-to-client only. If we needed bidirectional communication (like a chat feature), we'd switch to WebSockets."
- "We're using a single PostgreSQL primary. For true 100K concurrent users, we might need read replicas or sharding. But our caching layer means most reads never hit the database."
- "We chose blue-green deploys over canary releases. Blue-green is simpler to reason about, but canary would give us more gradual rollout control."

## Practice Question: Design Gather for 100K Concurrent Users

Let's walk through a complete answer. Pretend you're in the interview room. The interviewer says:

> "Design an event management platform that handles 100K concurrent users. Users can browse events, RSVP, upload images, and see real-time attendance updates."

### Your Answer

**Clarifying questions you'd ask**:

"A few questions before I start. Are we designing the entire system, or can I focus on the backend architecture? What's the geographic distribution of users, one region or global? Do we need to support real-time updates for all 100K users simultaneously, or is it concentrated on specific popular events? What's our availability target?"

Assume the interviewer says: backend focus, single region for now, real-time on popular events, 99.9% availability.

**Estimates you'd present**:

"At 100K concurrent users with maybe 10% actively browsing at any moment, we're looking at about 1,000 requests per second. It's heavily read-biased, maybe 90/10 read-write split. The read-heavy pattern means caching will have a massive impact. For storage, we're looking at maybe 500MB of structured data and 250GB of images, so object storage is a must."

**High-level architecture you'd draw**:

Draw the diagram shown above. Walk through each component and justify it:

- "Load balancer for horizontal scaling of the API layer"
- "PgBouncer because Django's default connection handling won't survive 1,000 concurrent requests"
- "Redis serves double duty: application cache and Pub/Sub for real-time"
- "Celery for anything that doesn't need to happen synchronously: emails, image processing, notifications"
- "S3 for images because storing binary data in PostgreSQL would destroy our database performance"

**Deep dive the interviewer might request**:

If they ask about the database, you talk about the `EXPLAIN ANALYZE` work from Module 02, partial indexes, covering indexes, and how you benchmarked before and after.

If they ask about reliability, you talk about circuit breakers, graceful degradation, chaos testing, and your observability stack that lets you detect problems before users report them.

**Tradeoffs you'd mention**:

"For global distribution, I'd add CloudFront as a CDN and consider read replicas in other regions. For the current single-region design, our caching layer means most reads resolve in under 50ms without touching the database."

## Tips for Whiteboard Communication

### Structure Your Thinking Out Loud

The interviewer can't read your mind. Narrate your decision-making process:

- "I'm choosing PostgreSQL here because our data is highly relational, events have many RSVPs, RSVPs belong to users, and we need transactional guarantees for RSVP creation."
- "I'm putting a cache in front of the database because our estimates show 900 read RPS, and most of those are the same event listing query."
- "I'm choosing Celery over a simple thread pool because we need retry logic, dead letter handling, and the ability to monitor queue depth."

### Draw Clean Diagrams

Use boxes for services, arrows for data flow, and labels on every arrow. Don't let your diagram become a mess of crossing lines. If it's getting complicated, zoom into one area and draw a separate detailed view.

Group related components:
- Data layer (PostgreSQL, Redis, S3)
- Compute layer (Django API, Celery workers, Next.js)
- Infrastructure layer (Load balancer, CDN, monitoring)

### Handle "What If" Questions

Interviewers love to change requirements mid-answer:

- **"What if we need to go global?"** Add CDN edge caching, consider multi-region database replication, and use a global load balancer.
- **"What if a single event gets 50K simultaneous viewers?"** That's a hot key problem. Cache the event aggressively, use a separate Redis instance for that event's real-time updates, and consider pre-computing the attendee count.
- **"What if Redis goes down?"** This is graceful degradation (Module 09). The application falls back to database queries. It's slower but it works. Circuit breakers prevent cascading failures.

### Common Follow-Up Questions and How to Handle Them

**"How would you handle data consistency?"**
Talk about PostgreSQL transactions for writes. Mention that cache invalidation is the real challenge. Explain your invalidation strategy (write-through for critical data, TTL-based for listings).

**"How would you monitor this system?"**
Walk through your OpenTelemetry setup from Module 07. Traces for request flow, metrics for system health, logs for debugging. Grafana dashboards for visualization. Alert rules for p95 latency, error rate, and queue depth.

**"How would you deploy changes safely?"**
Blue-green deployments from Module 08. Feature flags for gradual rollouts. Automated rollback on error rate spikes. Zero-downtime migrations for database changes.

**"What would you do differently with unlimited budget?"**
This tests your awareness of managed services and scaling strategies. You might mention: managed Kubernetes instead of manual container orchestration, a managed Redis cluster (ElastiCache) for automatic failover, Aurora PostgreSQL for storage auto-scaling, and a dedicated search engine (Elasticsearch) for event discovery.

## Mapping Course Modules to Interview Topics

Here's a cheat sheet for connecting your hands-on experience to interview talking points:

| Interview Topic | Course Module | Key Talking Point |
|---|---|---|
| Database scaling | Module 02 | EXPLAIN ANALYZE, partial indexes, PgBouncer |
| Async processing | Module 03 | Celery, retry with backoff, dead letter queues |
| Caching | Module 04 | Three-layer caching, cache invalidation, TTL strategy |
| File handling | Module 05 | Presigned URLs, async thumbnail generation |
| Real-time | Module 06 | SSE vs WebSockets tradeoffs, Redis Pub/Sub |
| Monitoring | Module 07 | OpenTelemetry, Prometheus, Grafana, SLOs |
| Deployment | Module 08 | Blue-green, Terraform, feature flags |
| Reliability | Module 09 | Circuit breakers, chaos testing, graceful degradation |

## Practice Makes Permanent

System design interviews are a skill. You get better by practicing, not by reading. Here's how:

1. **Talk through designs out loud**. Set a 45-minute timer and practice on your own, narrating to an empty room (or a rubber duck). Record yourself and listen back.

2. **Practice with a partner**. Find someone from your pod, a study group, or The Bridge program. Take turns being interviewer and candidate.

3. **Study real architectures**. Read engineering blogs from companies that operate at scale (Netflix, Uber, Stripe, Discord). Notice how they solve the same problems you solved in this course.

4. **Drill your estimates**. Practice back-of-the-envelope math until it's second nature. Know the key numbers: SSD read latency (~100 microseconds), network round trip within a data center (~0.5ms), Redis GET (~0.1ms), PostgreSQL simple query (~1-5ms).

You've built a production-grade system from scratch. That puts you ahead of the vast majority of system design interview candidates who have only read about these concepts. Trust your experience and communicate it clearly.

---
title: "CAP Theorem and Consistency Tradeoffs"
estimatedMinutes: 40
---

# CAP Theorem and Consistency Tradeoffs

In the last lesson, you learned about horizontal scaling: running multiple copies of your application behind a load balancer. That sounded great. More servers, more capacity, automatic failover.

But there's a catch. The moment you distribute your system across multiple machines, you run into a fundamental law of distributed computing that constrains every architectural decision you'll make. It's called the CAP theorem, and understanding it will save you from building systems that fail in surprising ways.

## The CAP Theorem, Stated Simply

In 2000, computer scientist Eric Brewer proposed (and in 2002, Seth Gilbert and Nancy Lynch formally proved) that a distributed data store can provide at most two out of three guarantees:

- **Consistency (C)**: Every read receives the most recent write. All nodes see the same data at the same time.
- **Availability (A)**: Every request receives a response (not an error), even if some nodes are down.
- **Partition Tolerance (P)**: The system continues to operate despite network failures between nodes.

The key insight: **you can't have all three simultaneously.** When a network partition occurs (and in any distributed system, it will), you must choose between consistency and availability.

```
              Consistency
                 /\
                /  \
               /    \
              / CP   \
             / systems \
            /          \
           /     CA     \
          /   systems    \
         /  (single node) \
        /                  \
       /____________________\
  Availability --------- Partition
                AP          Tolerance
              systems
```

### Why Not All Three?

Let's make this concrete with Gather. Imagine you have two database servers (Node A and Node B) that replicate data between each other. A user creates an event on Node A.

**Normal operation (no partition):** Node A saves the event and replicates it to Node B. Both nodes have the same data. You get all three: consistency, availability, and partition tolerance.

**During a network partition:** The connection between Node A and Node B breaks. A new user tries to read events from Node B.

```
  Node A                          Node B
  ┌──────────────┐    ✗ NETWORK ✗    ┌──────────────┐
  │ Event: "Tech │    PARTITION      │              │
  │  Meetup"     │ ────── ✗ ──────── │ (no event    │
  │              │                    │  replicated) │
  └──────────────┘                    └──────────────┘

  User writes "Tech Meetup"          User reads events...
  to Node A                          from Node B

  What should Node B return?
```

You have two choices, and neither gives you everything:

**Choice 1: Consistency (CP).** Node B refuses to serve the read because it can't guarantee it has the latest data. The system is consistent (no stale reads) but unavailable (Node B returns an error).

**Choice 2: Availability (AP).** Node B serves the read with whatever data it has, even though it might be missing the new event. The system is available (Node B responds) but inconsistent (the user doesn't see the latest data).

There is no third option. This is the CAP theorem.

### CA Systems: Only Without Partitions

You might wonder about CA systems (consistent and available, but not partition tolerant). These exist, but only as single-node systems. A single PostgreSQL server is a CA system. It's always consistent (one copy of the data) and always available (as long as the server is up). But it doesn't tolerate partitions because there's only one node; there's nothing to partition.

The moment you add a second node for redundancy or capacity, you're in distributed territory, and network partitions become possible. That's why the real choice in distributed systems is between CP and AP.

## CP vs. AP in the Real World

Let's look at how real systems make this tradeoff.

### CP Systems: Consistency Over Availability

These systems refuse to serve potentially stale data. When a partition occurs, some requests will fail.

**Examples:**
- **PostgreSQL with synchronous replication**: Writes block until the replica confirms. If the replica is unreachable, writes fail.
- **ZooKeeper**: Used for distributed coordination (leader election, configuration). Returns errors rather than stale data.
- **HBase**: Strong consistency for reads and writes. Unavailable during region server failures.

**When to choose CP:**
- Financial transactions (you can't show the wrong bank balance)
- Inventory management (overselling is worse than temporary unavailability)
- User authentication (serving stale auth data could grant unauthorized access)

### AP Systems: Availability Over Consistency

These systems always respond, even if the response might be stale. They resolve inconsistencies later.

**Examples:**
- **Cassandra**: Always writable. Resolves conflicts using timestamps ("last write wins").
- **DynamoDB**: Available across regions. Eventually consistent reads by default.
- **DNS**: Your browser's DNS cache might be hours old, but DNS always responds.

**When to choose AP:**
- Social media feeds (showing a post 2 seconds late is fine)
- Product catalogs (a slightly stale price is better than an error page)
- Analytics dashboards (real-time accuracy isn't critical)

### Gather's CAP Decisions

Let's map Gather's features to CAP choices:

| Feature | Needs Consistency? | Needs Availability? | CAP Choice |
|---------|-------------------|-------------------|------------|
| RSVP count display | Not critically | Yes, always show something | AP |
| Payment processing | Absolutely | Can retry if unavailable | CP |
| Event creation | Yes, no duplicates | Yes | CP |
| Event search/browse | Not critically | Yes, always show results | AP |
| User authentication | Yes | Yes, but can fail gracefully | CP |
| Notification delivery | No, eventual is fine | Yes | AP |

This table reveals something important: **different parts of the same application can make different CAP tradeoffs.** You don't pick CP or AP for your entire system. You pick it per feature, per data flow, per use case.

## Consistency Models: A Spectrum, Not a Binary

The CAP theorem presents consistency as binary: you have it or you don't. In practice, consistency exists on a spectrum. Understanding the different consistency models helps you make more nuanced tradeoffs.

### Strong Consistency

**Definition:** After a write completes, all subsequent reads (from any node) will return that write's value.

**How it feels to the user:** "I updated my profile name. When I refresh the page, I see the new name, no matter which server handles my request."

```python
# Strong consistency example: PostgreSQL single-node
# This always works because there's only one copy of the data

def update_event_title(event_id, new_title):
    with transaction.atomic():
        event = Event.objects.select_for_update().get(id=event_id)
        event.title = new_title
        event.save()

# Immediately after this function returns, any query for this
# event will see the new title. Guaranteed.
event = Event.objects.get(id=event_id)
assert event.title == new_title  # Always true
```

**Cost:** Higher latency (writes must propagate before confirming), lower throughput (coordination overhead), reduced availability during partitions.

### Eventual Consistency

**Definition:** If no new updates are made to a piece of data, eventually all reads will return the last updated value. There's no guarantee about how long "eventually" takes.

**How it feels to the user:** "I RSVPed to an event. The RSVP count still shows 45 instead of 46. I refresh a few seconds later and now it shows 46."

```python
# Eventual consistency example: cached RSVP count

def get_rsvp_count(event_id):
    # Try cache first
    cached = cache.get(f"rsvp_count:{event_id}")
    if cached is not None:
        return cached  # Might be stale!

    # Cache miss: query database (always current)
    count = RSVP.objects.filter(event_id=event_id).count()

    # Cache for 30 seconds
    cache.set(f"rsvp_count:{event_id}", count, timeout=30)
    return count

def create_rsvp(user, event_id):
    RSVP.objects.create(user=user, event_id=event_id)
    # The cache still has the old count.
    # It will be correct within 30 seconds (eventual consistency).
    # We COULD invalidate the cache here for faster convergence:
    # cache.delete(f"rsvp_count:{event_id}")
```

**Cost:** Users may see stale data temporarily. Some use cases can't tolerate this. But latency is lower and availability is higher.

**The convergence window** matters. "Eventually" could mean 100 milliseconds or 10 minutes. When designing with eventual consistency, define and monitor the convergence time.

```
Write happens ──────────── All replicas converge
      │                            │
      │◄── convergence window ────►│
      │                            │
      │  During this window,       │
      │  different readers might   │
      │  see different values      │
      │                            │
      t=0                       t=?
```

### Causal Consistency

**Definition:** Operations that are causally related are seen by all nodes in the same order. Concurrent operations (with no causal relationship) may be seen in different orders.

**How it feels to the user:** "I posted a comment, and then someone replied to my comment. Everyone sees the reply after my original comment, never before it. But two unrelated comments on different events might appear in different orders on different servers."

```python
# Causal consistency example: comment thread ordering

# These two operations are causally related:
# 1. Alice posts a comment
# 2. Bob replies to Alice's comment

# Causal consistency guarantees that everyone sees
# Alice's comment before Bob's reply.

# But these two operations are NOT causally related:
# 1. Alice comments on Event A
# 2. Carol comments on Event B

# Different users might see these in different orders,
# and that's fine because they're independent.
```

**Cost:** More complex to implement than eventual consistency, but lower overhead than strong consistency. Good for social features where ordering matters within a conversation but not across unrelated conversations.

### Read-Your-Own-Writes Consistency

**Definition:** After a user writes data, that same user will always see their own write on subsequent reads. Other users may see a stale value temporarily.

**How it feels to the user:** "After I RSVP, I immediately see myself on the attendee list. My friend might not see me there for a few seconds."

```python
# Read-your-own-writes: route user to the primary after a write

class ReadYourWritesMiddleware:
    """After a user performs a write, route their reads to the
    primary database for the next 5 seconds to ensure they
    see their own changes."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
            # User just wrote something. Set a marker.
            request.session['last_write'] = time.time()

        last_write = request.session.get('last_write', 0)
        if time.time() - last_write < 5:
            # Recent write: use primary database for reads
            request._use_primary = True
        else:
            # No recent write: safe to use read replica
            request._use_primary = False

        return self.get_response(request)
```

This is a practical pattern we'll use in Module 2 when we set up read replicas. It gives users the illusion of strong consistency for their own actions while still distributing read load across replicas.

### Choosing a Consistency Model for Gather

Here's how we'll apply these models across Gather's features:

```
Strong Consistency (use primary DB, synchronous):
  ├── Payment processing
  ├── RSVP creation (the write itself)
  ├── Event creation/updates by organizer
  └── User authentication and authorization

Read-Your-Own-Writes (primary after write, then replica):
  ├── User profile updates
  ├── RSVP status for the user who just RSVPed
  └── Event details for the organizer who just edited

Eventual Consistency (cached or replica, convergence < 30s):
  ├── RSVP counts on event cards
  ├── Event listing pages
  ├── Category browsing
  ├── Search results
  └── Activity feeds
```

This gives us the best of both worlds: strong guarantees where correctness matters, and better performance where temporary staleness is acceptable.

## Real-World Consistency Failures

Understanding consistency models matters because getting them wrong has real consequences. Here are three cautionary examples.

### The Double-Booking Problem

```python
# WRONG: Using eventual consistency for capacity checks

def create_rsvp(user, event_id):
    # Read from cache (eventually consistent)
    rsvp_count = cache.get(f"rsvp_count:{event_id}")
    event = Event.objects.get(id=event_id)

    if rsvp_count < event.capacity:
        RSVP.objects.create(user=user, event_id=event_id)
        cache.incr(f"rsvp_count:{event_id}")
        return "confirmed"
    else:
        return "waitlisted"

# Problem: Two users RSVP at the same time.
# Both read rsvp_count = 99 from cache.
# Both see capacity = 100.
# Both create RSVPs.
# Now there are 101 RSVPs for a 100-person event.
```

```python
# RIGHT: Using strong consistency for capacity checks

def create_rsvp(user, event_id):
    with transaction.atomic():
        # Lock the event row to prevent concurrent reads
        event = Event.objects.select_for_update().get(id=event_id)
        current_count = RSVP.objects.filter(event_id=event_id).count()

        if current_count < event.capacity:
            RSVP.objects.create(user=user, event_id=event_id)
            return "confirmed"
        else:
            RSVP.objects.create(
                user=user, event_id=event_id, status="waitlisted"
            )
            return "waitlisted"
```

The difference: `select_for_update()` acquires a row-level lock in PostgreSQL, preventing two concurrent transactions from both reading the same count. This is strong consistency enforced at the database level.

### The Stale Cache Display Problem

```python
# Scenario: Organizer updates event from "Central Park" to "Prospect Park"

def update_event_location(event_id, new_location):
    event = Event.objects.get(id=event_id)
    event.location = new_location
    event.save()
    # Forgot to invalidate the cache!

# The event listing page serves cached data for 5 minutes.
# For the next 5 minutes, users see "Central Park" even though
# the event is actually at "Prospect Park."
# Someone shows up at the wrong park.
```

The fix is cache invalidation on write:

```python
def update_event_location(event_id, new_location):
    event = Event.objects.get(id=event_id)
    event.location = new_location
    event.save()

    # Invalidate all caches that include this event
    cache.delete(f"event:{event_id}")
    cache.delete(f"event_list:page_1")  # Might be on the first page
    # This is why cache invalidation is "one of the two hard
    # things in computer science"
```

We'll tackle cache invalidation strategies properly in Module 4.

### The Split-Brain Write Problem

```python
# Scenario: Two database nodes lose contact with each other

# Node A (primary) receives: update event title to "Spring Meetup"
# Node B (was replica, now thinks it's primary):
#   receives: update event title to "Summer Meetup"

# When the partition heals, which title wins?
# This is called "split-brain" and it's one of the most
# dangerous failure modes in distributed databases.

# Solutions:
# 1. Only one node accepts writes (CP choice)
# 2. Use conflict resolution (timestamps, vector clocks)
# 3. Use a consensus protocol (Raft, Paxos) to elect a leader
```

This is why PostgreSQL uses a single-primary architecture: only one node accepts writes, eliminating the possibility of conflicting writes.

## Applying CAP Thinking to Gather

Let's design Gather's RSVP flow with explicit consistency choices:

```
User clicks "RSVP"
       │
       ▼
┌─────────────────────────────────────────┐
│  Django API (any instance)              │
│                                         │
│  1. Authenticate user (STRONG)          │
│     Read from primary DB                │
│                                         │
│  2. Check capacity (STRONG)             │
│     SELECT FOR UPDATE on event          │
│     Prevents double-booking             │
│                                         │
│  3. Create RSVP record (STRONG)         │
│     INSERT within same transaction      │
│                                         │
│  4. Queue confirmation email (ASYNC)    │
│     Push to task queue, return          │
│     immediately                         │
│                                         │
│  5. Invalidate RSVP count cache         │
│     (BEST EFFORT)                       │
│     If cache invalidation fails,        │
│     count self-corrects within 30s      │
│                                         │
│  6. Return success to user              │
│     Include updated RSVP status         │
│     (READ-YOUR-OWN-WRITES)              │
└─────────────────────────────────────────┘
       │
       ▼
Other users browsing the event see the
updated RSVP count within 30 seconds
(EVENTUAL CONSISTENCY)
```

Notice how a single user action involves three different consistency models. This is normal. Good system design means picking the right consistency model for each piece of the flow, not applying one model everywhere.

## The PACELC Extension

The CAP theorem only describes behavior during partitions. In 2012, Daniel Abadi proposed the PACELC theorem, which extends CAP to describe behavior during normal operation too:

```
If there's a Partition:
  Choose between Availability and Consistency (same as CAP)

Else (normal operation):
  Choose between Latency and Consistency
```

This is important because even when your network is healthy, enforcing strong consistency has a performance cost. Synchronous replication adds latency to every write. Distributed locks add latency to every read.

For Gather:

| Scenario | During Partition | During Normal Operation |
|----------|-----------------|------------------------|
| RSVP counts | Choose Availability | Choose Latency (serve cached) |
| Payment processing | Choose Consistency | Choose Consistency (accept latency) |
| Event browsing | Choose Availability | Choose Latency (serve cached) |
| RSVP creation | Choose Consistency | Choose Consistency (accept latency) |

The PACELC framing makes it clear that consistency tradeoffs aren't just about failure scenarios. You're making latency-vs-consistency tradeoffs on every single request, even when everything is working perfectly.

## Key Takeaways

1. **The CAP theorem** states that a distributed system can provide at most two of three guarantees: Consistency, Availability, and Partition Tolerance. Since partitions are inevitable, the real choice is between C and A.

2. **Different features need different CAP choices.** Payment processing needs CP. RSVP count displays can use AP. Don't apply one model to your entire system.

3. **Consistency is a spectrum**, not a binary. Strong, eventual, causal, and read-your-own-writes are all valid models with different performance and correctness tradeoffs.

4. **Eventual consistency is powerful** when you define and monitor the convergence window. "Eventually" should mean seconds, not hours.

5. **Strong consistency is expensive.** It adds latency (synchronous replication), reduces throughput (locking), and limits availability (rejecting requests during partitions). Use it only where correctness demands it.

6. **The PACELC extension** reminds us that consistency tradeoffs exist during normal operation too, not just during failures. Every request involves a latency-vs-consistency decision.

## Up Next

Now that you understand the fundamental constraints of distributed systems, it's time to put everything together. In the next lesson, you'll design Gather's architecture for 100,000 users, estimate traffic, identify bottlenecks, and write an Architecture Decision Record documenting your choices. This is the capstone exercise for Module 1 and a preview of the entire course ahead.

---
title: "Gather Architecture Review"
estimatedMinutes: 75
---

# Project: Gather Architecture Review

In this project, you'll step into the role of a senior engineer preparing Gather for scale. You'll analyze the current architecture, estimate traffic, identify the most critical bottlenecks, and write an Architecture Decision Record proposing a target architecture.

This is the kind of work that happens before a single line of code is written. Getting it right means the team focuses on the highest-impact improvements first. Getting it wrong means weeks spent optimizing the wrong thing.

## What You'll Produce

By the end of this project, you'll have three deliverables:

1. **Traffic estimation worksheet** with calculations for Gather at 100K users
2. **Top 5 scaling problems** with impact assessment and priority ranking
3. **Architecture Decision Record (ADR)** proposing the target architecture

## Setup

Create a new directory for your system design artifacts:

```bash
mkdir -p gather-system-design
cd gather-system-design
```

## Part 1: Traffic Estimation (20 minutes)

Create a file called `traffic-estimation.md` and work through the calculations below. Replace each `# TODO:` with your own numbers and reasoning.

```markdown
# Gather Traffic Estimation

## User Behavior Assumptions

# TODO: Fill in your assumptions. Think about how users interact with an
# event platform. How often do they visit? How many pages do they view?
# How often do they take actions (RSVP, create event, comment)?

- Total registered users: 100,000
- Daily active users (DAU): # TODO: What percentage of registered users are active daily?
- Peak concurrent users: # TODO: What percentage of DAU is online at the same time during peak?
- Average session duration: # TODO: minutes
- Average page views per session: # TODO:
- Average API calls per page view: # TODO: (think about what data each page needs)
- Average write actions per session: # TODO: (RSVPs, event creation, profile updates)

## Read Traffic Calculations

# TODO: Calculate daily read requests
# Formula: DAU x pages_per_session x api_calls_per_page

Daily read requests: # TODO: show your math

# TODO: Calculate average reads per second
# Formula: daily_reads / 86400

Average reads/sec: # TODO: show your math

# TODO: Calculate peak reads per second
# Assume 60% of traffic happens in a 4-hour peak window
# Then apply a 3x burst multiplier for spikes

Peak reads/sec: # TODO: show your math

## Write Traffic Calculations

# TODO: Calculate daily write requests
# Formula: DAU x writes_per_session

Daily write requests: # TODO: show your math

# TODO: Calculate peak writes per second
# Writes spike harder than reads (everyone RSVPs at the same time)
# Use a 5x burst multiplier

Peak writes/sec: # TODO: show your math

## Storage Calculations

# TODO: Estimate database storage requirements

Users table:
  # TODO: rows x estimated bytes per row = ? MB

Events table:
  # TODO: Assume 50,000 events over the platform lifetime
  # Each event has title, description, location, date, organizer FK, etc.

RSVPs table:
  # TODO: Estimate total RSVPs (avg RSVPs per event x total events)

Total database size: # TODO: MB

# TODO: Estimate file storage requirements

Event images:
  # TODO: What percentage of events have images? Average image size?

User avatars:
  # TODO: What percentage of users upload avatars?

Total file storage: # TODO: GB

## Bandwidth Calculations

# TODO: Estimate bandwidth requirements

Average API response size (JSON): # TODO: KB
Average page weight (HTML + CSS + JS + images): # TODO: KB

Peak bandwidth:
  # TODO: peak_rps x average_response_size = ? MB/sec

## Summary Table

| Metric | Average | Peak | Target (3x peak) |
|--------|---------|------|-------------------|
| Read RPS | # TODO: | # TODO: | # TODO: |
| Write RPS | # TODO: | # TODO: | # TODO: |
| Total RPS | # TODO: | # TODO: | # TODO: |
| Bandwidth | # TODO: | # TODO: | # TODO: |
| DB size | # TODO: | | |
| File storage | # TODO: | | |
```

## Part 2: Bottleneck Analysis (25 minutes)

Create a file called `bottleneck-analysis.md`. Identify the top 5 scaling problems Gather will face and rank them by priority.

For each bottleneck, explain what breaks, when it breaks, and what the user experiences.

```markdown
# Gather Bottleneck Analysis

## Current Architecture

# TODO: Draw an ASCII diagram of Gather's current architecture.
# Include: Browser, Next.js, Django API, PostgreSQL.
# Show the connections between components and the ports they run on.

```
# TODO: Your ASCII architecture diagram here
```

## Bottleneck Identification

For each bottleneck, fill in the analysis template.

### Bottleneck 1: # TODO: Name this bottleneck

**What breaks:**
# TODO: Describe the specific technical failure. What component fails?
# What error messages would you see in logs?

**When it breaks:**
# TODO: At what traffic level does this become a problem?
# Reference your traffic estimates from Part 1.

**User experience impact:**
# TODO: What does the user see? Slow page? Error page? Wrong data?
# How many users are affected?

**Severity:** # TODO: Critical / High / Medium / Low
**Effort to fix:** # TODO: Low / Medium / High

**Proposed solution:**
# TODO: What would you do to fix this? Be specific about the
# technology or pattern you'd use.

---

### Bottleneck 2: # TODO: Name this bottleneck

**What breaks:**
# TODO:

**When it breaks:**
# TODO:

**User experience impact:**
# TODO:

**Severity:** # TODO:
**Effort to fix:** # TODO:

**Proposed solution:**
# TODO:

---

### Bottleneck 3: # TODO: Name this bottleneck

**What breaks:**
# TODO:

**When it breaks:**
# TODO:

**User experience impact:**
# TODO:

**Severity:** # TODO:
**Effort to fix:** # TODO:

**Proposed solution:**
# TODO:

---

### Bottleneck 4: # TODO: Name this bottleneck

**What breaks:**
# TODO:

**When it breaks:**
# TODO:

**User experience impact:**
# TODO:

**Severity:** # TODO:
**Effort to fix:** # TODO:

**Proposed solution:**
# TODO:

---

### Bottleneck 5: # TODO: Name this bottleneck

**What breaks:**
# TODO:

**When it breaks:**
# TODO:

**User experience impact:**
# TODO:

**Severity:** # TODO:
**Effort to fix:** # TODO:

**Proposed solution:**
# TODO:

---

## Priority Ranking

# TODO: Rank your 5 bottlenecks in the order you'd address them.
# Explain why you chose this order. Consider:
#   - Which bottleneck causes the most user-facing pain?
#   - Which fix gives the biggest improvement for the least effort?
#   - Are there dependencies? (e.g., you need monitoring before
#     you can measure whether caching helped)

| Priority | Bottleneck | Severity | Effort | Rationale |
|----------|-----------|----------|--------|-----------|
| 1 | # TODO: | # TODO: | # TODO: | # TODO: |
| 2 | # TODO: | # TODO: | # TODO: | # TODO: |
| 3 | # TODO: | # TODO: | # TODO: | # TODO: |
| 4 | # TODO: | # TODO: | # TODO: | # TODO: |
| 5 | # TODO: | # TODO: | # TODO: | # TODO: |

## Impact vs. Effort Matrix

# TODO: Place each bottleneck in the appropriate quadrant.
# This helps visualize which fixes to prioritize.

```
                    HIGH IMPACT
                        |
   Quick Wins           |        Major Projects
   (Do first)           |        (Plan carefully)
                        |
  ----------------------+------------------------
                        |
   Fill-ins             |        Avoid
   (Do if time allows)  |        (Probably not worth it)
                        |
                    LOW IMPACT

   LOW EFFORT ──────────+──────────── HIGH EFFORT

# TODO: Label where each of your 5 bottlenecks falls in this matrix
```
```

## Part 3: Architecture Decision Record (30 minutes)

Create a file called `adr-001-target-architecture.md`. This is your formal proposal for Gather's production architecture.

```markdown
# ADR-001: Gather Production Architecture for 100K Users

## Status
Proposed

## Context

# TODO: Describe the current situation. Cover:
# - What is Gather? (1-2 sentences)
# - What is the current architecture? (reference your diagram from Part 2)
# - What is the target scale? (reference your traffic estimates from Part 1)
# - What constraints exist? (budget, team size, timeline)
# - Why is the current architecture insufficient?

## Decision

# TODO: Describe the target architecture in 2-3 paragraphs. Cover:
# - What components will the production system have?
# - How do they connect?
# - What consistency model will each data flow use?
# - What scaling strategy applies to each component?

## Target Architecture Diagram

```
# TODO: Draw an ASCII diagram of the target architecture.
# Include ALL components: load balancer, app servers, database(s),
# cache, task queue, object storage, monitoring.
# Show connections between components.
# Label each component with its scaling strategy
# (horizontal/vertical).
```

## Components

# TODO: For each component in your architecture, fill in this table.

| Component | Count | Purpose | Scaling Strategy | CAP Choice |
|-----------|-------|---------|-----------------|------------|
| # TODO: | # TODO: | # TODO: | # TODO: | # TODO: |
| # TODO: | # TODO: | # TODO: | # TODO: | # TODO: |
| # TODO: | # TODO: | # TODO: | # TODO: | # TODO: |
| # TODO: | # TODO: | # TODO: | # TODO: | # TODO: |
| # TODO: | # TODO: | # TODO: | # TODO: | # TODO: |
| # TODO: | # TODO: | # TODO: | # TODO: | # TODO: |

## Consistency Decisions

# TODO: For each of Gather's key data flows, specify the
# consistency model and justify your choice.

### RSVP Creation
- Consistency model: # TODO: (strong, eventual, causal, read-your-own-writes?)
- Justification: # TODO: Why this model? What could go wrong with a weaker model?

### Event Listing (Browse/Search)
- Consistency model: # TODO:
- Justification: # TODO:

### Event Detail Page
- Consistency model: # TODO:
- Justification: # TODO:

### RSVP Count Display
- Consistency model: # TODO:
- Justification: # TODO:

### User Profile Updates
- Consistency model: # TODO:
- Justification: # TODO:

## Options Considered

### Option 1: Vertical Scaling (Bigger Single Server)

# TODO: Analyze this option honestly. What are the real pros and cons
# for Gather specifically? Don't just list generic pros/cons.

- Pros:
  - # TODO:
  - # TODO:
- Cons:
  - # TODO:
  - # TODO:

### Option 2: Horizontally Scaled Architecture (Proposed)

- Pros:
  - # TODO:
  - # TODO:
- Cons:
  - # TODO:
  - # TODO:

### Option 3: Managed Services (Heroku / Railway / Render)

# TODO: Consider the fully-managed alternative. What would Gather
# look like on a PaaS? What do you gain? What do you give up?

- Pros:
  - # TODO:
  - # TODO:
- Cons:
  - # TODO:
  - # TODO:

## Cost Estimate

# TODO: Estimate monthly hosting costs for your proposed architecture.
# Use actual pricing from a cloud provider (DigitalOcean, Hetzner,
# AWS, etc.). Show your math.

| Component | Spec | Monthly Cost |
|-----------|------|-------------|
| # TODO: | # TODO: | # TODO: |
| # TODO: | # TODO: | # TODO: |
| # TODO: | # TODO: | # TODO: |
| # TODO: | # TODO: | # TODO: |
| # TODO: | # TODO: | # TODO: |
| **Total** | | **# TODO:** |

## Implementation Phases

# TODO: Break the migration into phases. Each phase should be
# independently deployable and provide measurable improvement.
# Map each phase to the course modules.

### Phase 1: # TODO: Name (Modules X-Y)
- Changes: # TODO:
- Expected improvement: # TODO:
- Risk: # TODO:

### Phase 2: # TODO: Name (Modules X-Y)
- Changes: # TODO:
- Expected improvement: # TODO:
- Risk: # TODO:

### Phase 3: # TODO: Name (Modules X-Y)
- Changes: # TODO:
- Expected improvement: # TODO:
- Risk: # TODO:

## Consequences

### Positive
- # TODO: List 3-4 positive outcomes of this architecture
- # TODO:
- # TODO:

### Negative
- # TODO: List 2-3 downsides or costs. Be honest.
- # TODO:
- # TODO:

### Risks
- # TODO: What could go wrong? How would you mitigate each risk?
- # TODO:
```

## Evaluation Criteria

Your architecture review will be evaluated on:

1. **Traffic estimates are reasonable.** The exact numbers don't matter, but they should be in the right order of magnitude with clear reasoning.

2. **Bottlenecks are correctly identified.** You should catch the major issues (synchronous processing, unoptimized queries, no caching, local storage, no monitoring).

3. **Priority ranking makes sense.** The highest-impact, lowest-effort improvements should come first.

4. **The ADR is thorough and honest.** It should acknowledge tradeoffs, not just list benefits. The "Options Considered" section should give fair treatment to alternatives.

5. **Consistency model choices are justified.** Each data flow should have an explicit consistency choice with reasoning tied to user experience.

6. **The architecture diagram is complete.** It should show all components, their connections, and how data flows through the system.

## Stretch Goals

If you finish early, extend your architecture review:

**Stretch 1: Failure Mode Analysis.** For each component in your architecture, describe what happens when it fails. How does the system degrade? What does the user see? Add a "Failure Modes" section to your ADR.

**Stretch 2: Growth Plan.** Your current design targets 100K users. What changes at 500K? At 1 million? Write a brief "Beyond 100K" section identifying which components would need to change and how.

**Stretch 3: Alternative Database.** Research what Gather's architecture would look like if you replaced PostgreSQL with a distributed database like CockroachDB or YugabyteDB. What problems would that solve? What new problems would it introduce?

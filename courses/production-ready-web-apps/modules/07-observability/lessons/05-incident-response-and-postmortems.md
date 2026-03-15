---
title: "Incident Response and Postmortems"
estimatedMinutes: 35
---

# Incident Response and Postmortems

You built the observability stack. You have traces, metrics, and logs. You have a Grafana dashboard that shows the health of every component.

And then, at 3am on a Friday, the RSVP endpoint starts returning 500 errors. Your phone buzzes with a PagerDuty alert.

Observability gives you the data to diagnose problems. Incident response gives you the process to fix them quickly and calmly. And postmortems ensure you learn from every incident so it does not happen again. This lesson covers all three.

---

## What Is an Incident?

An incident is any event that degrades your service to the point where users are affected. Not every bug is an incident. A broken icon on the settings page is a bug. RSVP creation failing for all users is an incident.

The distinction matters because incidents require a different response than normal bug fixes. Incidents happen in real time. Users are being affected right now. The priority is not writing perfect code. The priority is restoring service.

---

## Incident Severity Levels

Severity levels help you decide how urgently to respond and who to involve. Here is a practical framework:

| Severity | Definition | Example | Response Time | Who Gets Paged |
|---|---|---|---|---|
| **SEV 1** | Complete outage. Core functionality is down for all users. | Database is unreachable. No requests succeed. | Immediate (< 5 min) | On-call engineer + team lead |
| **SEV 2** | Major degradation. Core functionality is broken for many users. | RSVP endpoint returning 500 for 30% of requests. | < 15 min | On-call engineer |
| **SEV 3** | Minor degradation. Non-critical functionality affected or latency is elevated. | Email notifications delayed by 2 hours. Event images loading slowly. | < 1 hour | On-call engineer (next business day if after hours) |
| **SEV 4** | Cosmetic or low-impact issue noticed in monitoring. | Cache hit rate dropped from 95% to 80%. One Celery worker restarting occasionally. | Next business day | Logged, not paged |

The key insight: severity is based on **user impact**, not technical complexity. A simple misconfiguration that breaks login for everyone is SEV 1. A complex memory leak that only affects 0.1% of requests is SEV 3.

---

## On-Call Basics

On-call means you are the first responder when something breaks. For a small team (like Gather's), on-call might just be "whoever is available." For a larger team, it is a formal rotation.

### On-Call Responsibilities

1. **Acknowledge alerts promptly**. When you get paged, acknowledge within 5 minutes so the system knows a human is looking at it.
2. **Triage the severity**. Is this SEV 1 (drop everything) or SEV 4 (note it for Monday)?
3. **Investigate using observability tools**. Dashboards, traces, logs. Follow the correlation loop.
4. **Mitigate first, fix later**. The goal is to stop the bleeding, not to write a perfect fix. Rollbacks, feature flags, scaling up, or disabling a broken feature are all valid mitigations.
5. **Communicate status**. Post updates to the incident channel. Even "still investigating, no update yet" is better than silence.
6. **Hand off cleanly**. If you cannot resolve the incident during your shift, hand off all context to the next person.

### On-Call Tools

For Gather's scale, you do not need expensive enterprise tools. A practical setup:

- **Alerting**: Grafana alerts based on Prometheus metrics (free, built-in)
- **Paging**: PagerDuty free tier (up to 5 users) or Grafana OnCall
- **Communication**: A dedicated `#incidents` Slack channel
- **Status**: A simple status page (even a pinned Slack message works for a small user base)

### Setting Up a Basic Alert in Grafana

Here is an alert rule that fires when RSVP endpoint p95 latency exceeds 2 seconds:

```yaml
# monitoring/grafana/provisioning/alerting/rsvp-latency.yml

apiVersion: 1

groups:
  - orgId: 1
    name: gather-alerts
    folder: Gather
    interval: 1m
    rules:
      - uid: rsvp-latency-high
        title: "RSVP Latency > 2s (p95)"
        condition: C
        data:
          - refId: A
            datasourceUid: prometheus
            model:
              expr: >
                histogram_quantile(0.95,
                  sum by (le) (
                    rate(django_http_requests_latency_seconds_by_view_method_bucket{view="create-rsvp"}[5m])
                  )
                )
          - refId: C
            datasourceUid: "-100"
            model:
              type: threshold
              conditions:
                - evaluator:
                    type: gt
                    params: [2]
        for: 5m  # Must be true for 5 minutes before firing
        labels:
          severity: sev2
        annotations:
          summary: "RSVP endpoint p95 latency is above 2 seconds"
          runbook_url: "https://wiki.internal/runbooks/rsvp-latency"
```

The `for: 5m` clause prevents flapping. A brief spike that resolves on its own will not page you at 3am.

---

## Runbooks: Your Incident Playbook

A runbook is a step-by-step guide for responding to a specific type of incident. It takes the thinking out of a stressful situation. Instead of "what do I check first?", you follow the checklist.

Every alert should link to a runbook. When PagerDuty wakes you up, you click the runbook link and follow the steps.

### Anatomy of a Good Runbook

A runbook has five sections:

1. **Overview**: What this alert means and why it matters
2. **Diagnosis steps**: What to check and in what order
3. **Mitigation options**: How to stop the bleeding (ordered from least to most disruptive)
4. **Escalation**: When and how to involve other people
5. **Post-incident**: What to do after the immediate issue is resolved

### Example: RSVP Endpoint Latency > 2s

```markdown
# Runbook: RSVP Endpoint Latency > 2s

## Overview

The p95 latency for `POST /api/events/{id}/rsvp/` has exceeded 2 seconds
for at least 5 minutes. Users are experiencing slow or timed-out RSVP
submissions.

**Severity**: SEV 2 (core functionality degraded)
**Owner**: Backend team
**Last updated**: 2026-03-14

## Diagnosis Steps

### Step 1: Check the Grafana Dashboard

Open the Gather Overview dashboard at http://grafana.internal:3001/d/gather

Look at:
- Is latency elevated across ALL endpoints, or just RSVP?
- Is the error rate elevated? (5xx errors)
- What is the current Celery queue depth?
- What is the database connection pool utilization?

### Step 2: Check for Correlated Events

- Did a deploy happen in the last 30 minutes? (Check #deploys in Slack)
- Is there a traffic spike? (Check request rate graph)
- Is another service having issues? (Check PostgreSQL, Redis, Celery)

### Step 3: Examine Traces

In Jaeger (http://jaeger.internal:16686):
1. Select service: gather-api
2. Set operation: POST /api/events/{id}/rsvp/
3. Set min duration: 2s
4. Find a slow trace and inspect the span timeline

Common findings:
- DB query span > 500ms --> Database bottleneck (go to Step 4a)
- Celery enqueue span > 1s --> Redis/Celery issue (go to Step 4b)
- Email/notification span > 1s --> External service issue (go to Step 4c)

### Step 4a: Database Bottleneck

Check PostgreSQL:
- `SELECT count(*) FROM pg_stat_activity;` (connection count)
- `SELECT * FROM pg_stat_activity WHERE state = 'active' AND wait_event IS NOT NULL;` (blocked queries)
- Check PgBouncer stats: `SHOW POOLS;`

If connections are exhausted, restart PgBouncer:
`docker compose restart pgbouncer`

If a long-running query is blocking others, identify and terminate it:
`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE duration > interval '30 seconds';`

### Step 4b: Redis/Celery Issue

Check Redis:
- `redis-cli ping` (is Redis responding?)
- `redis-cli info memory` (is Redis out of memory?)
- `redis-cli llen default` (task queue depth)

If queue depth is very high (> 1000), scale up workers:
`docker compose up -d --scale celery-worker=4`

If Redis is unresponsive, restart it:
`docker compose restart redis`

### Step 4c: External Service Issue

Check if the RSVP view is calling external services synchronously:
- SMTP for email (should be async via Celery)
- Any webhook calls

If email sending is blocking the request (not properly async):
1. Temporarily disable email sending: set `DISABLE_RSVP_EMAILS=true`
2. File a bug to fix the async path

## Mitigation Options (least to most disruptive)

1. **Scale up**: Add more Django workers or Celery workers
2. **Disable non-critical features**: Turn off email notifications, disable cache warming
3. **Rollback**: If a recent deploy caused the issue, roll back to the previous version
4. **Circuit breaker**: If an external service is the cause, enable the circuit breaker to skip it
5. **Maintenance mode**: Last resort. Show a maintenance page while you fix the issue.

## Escalation

- If not resolved within 30 minutes, escalate to the team lead
- If data loss is suspected, escalate immediately to the team lead
- Post updates to #incidents every 15 minutes

## Post-Incident

1. Verify latency has returned to normal (< 200ms p95)
2. Post an all-clear to #incidents
3. Schedule a postmortem within 48 hours
4. Create follow-up tickets for any permanent fixes needed
```

---

## The Incident Lifecycle

Every incident follows the same lifecycle, whether it lasts 5 minutes or 5 hours:

### 1. Detect

Something triggers awareness. An automated alert fires. A user reports an issue. A team member notices something wrong on a dashboard.

The faster you detect, the less time users are affected. This is why automated alerting on key metrics (error rate, latency, queue depth) is essential. Do not rely on users reporting problems. By the time a user complains, dozens of others have already silently left.

### 2. Triage

Assess severity. Is this SEV 1 (everything is down) or SEV 3 (one feature is degraded)? The severity determines the urgency and who gets involved.

Quick triage checklist:
- What is the user impact? (All users? Some users? One user?)
- What is the scope? (All endpoints? One endpoint? One region?)
- Is it getting worse? (Check the trend on the dashboard)

### 3. Mitigate

Stop the bleeding. This is not about finding the root cause or writing a permanent fix. This is about restoring service as quickly as possible.

Common mitigations:
- **Rollback a deploy**: If the issue started after a deployment, roll back
- **Restart a service**: Fixes many transient issues (memory leaks, stuck connections)
- **Scale up**: Add capacity if the issue is load-related
- **Disable a feature**: If one feature is taking down the whole system, turn it off with a feature flag
- **Failover**: Switch to a read replica, a backup cache, or a different region

### 4. Resolve

Once service is restored, investigate the root cause. This might take hours or days after the incident. The goal is to understand exactly what went wrong so you can prevent it from happening again.

### 5. Review

Conduct a postmortem. This is the most important step because it turns a painful incident into a learning opportunity for the entire team.

---

## Blameless Postmortems

A postmortem is a structured review of an incident. Its purpose is to understand what happened, why it happened, and how to prevent it from happening again.

The critical word is **blameless**. A postmortem is not about finding who made a mistake. It is about finding what in the system allowed the mistake to have an impact. Humans make errors. That is a given. The question is: why did the system not catch the error before it reached users?

### Why Blameless?

If engineers fear being blamed for incidents, they will:
- Hide problems instead of reporting them
- Avoid making changes (which means avoiding improvements)
- Write overly cautious code that is harder to maintain
- Not volunteer to be on call

A blameless culture means: "The deploy script did not run the integration tests" instead of "Bob forgot to run the tests." The first leads to an action item (add integration tests to the deploy pipeline). The second leads to resentment.

### Postmortem Template

```markdown
# Postmortem: [Incident Title]

**Date**: 2026-03-14
**Severity**: SEV 2
**Duration**: 47 minutes (02:47 to 03:34 UTC)
**Authors**: [Your name]
**Status**: Complete

## Summary

One-paragraph summary of what happened, the impact, and how it was resolved.

Example: "RSVP endpoint latency spiked to 8 seconds starting at 02:47 UTC
due to synchronous email sending combined with a SendGrid outage. ~200 users
experienced timeouts when trying to RSVP. The issue was mitigated at 03:34 UTC
by disabling email notifications and was permanently fixed the following day by
making email sending fully asynchronous."

## Impact

- **Users affected**: ~200 (estimated from error rate * traffic)
- **Duration**: 47 minutes
- **Revenue impact**: None (RSVPs are free)
- **Data loss**: None. RSVPs that timed out on the client were still created
  server-side in most cases.

## Timeline (all times UTC)

| Time  | Event |
|-------|-------|
| 02:47 | SendGrid begins experiencing connectivity issues |
| 02:47 | RSVP p95 latency exceeds 2s threshold |
| 02:52 | Grafana alert fires, PagerDuty pages on-call (Ada) |
| 02:54 | Ada acknowledges alert, opens Grafana dashboard |
| 02:56 | Ada identifies RSVP endpoint as the source |
| 03:01 | Ada finds slow trace in Jaeger showing 8s email span |
| 03:05 | Ada searches Loki logs, finds SMTP timeout errors |
| 03:10 | Ada identifies root cause: synchronous email + SendGrid outage |
| 03:15 | Ada sets DISABLE_RSVP_EMAILS=true and restarts Django |
| 03:18 | Latency begins returning to normal |
| 03:34 | p95 latency below 200ms. All-clear posted. |

## Root Cause

The RSVP endpoint calls `send_rsvp_confirmation.delay()` to enqueue an
email task, but the Celery task itself calls the SMTP server synchronously
with a default 30-second timeout. When SendGrid experienced connectivity
issues, each email task blocked for the full timeout duration. Because the
Celery worker pool only had 4 workers, the pool was quickly saturated with
blocked email tasks. New RSVP-triggered tasks backed up in the queue, and
the queue depth increase caused back-pressure on the Django application.

The actual RSVP database operation (< 10ms) was not the problem. The
coupling between RSVP creation and email delivery amplified an external
service failure into a user-facing outage.

## Contributing Factors

1. **Email sending had no timeout shorter than 30s.** The SMTP client used
   the default socket timeout.
2. **No circuit breaker on email delivery.** When SendGrid was unreachable,
   we kept trying on every request instead of failing fast.
3. **Celery worker pool was undersized.** 4 workers with 30s tasks means
   the pool fills up in seconds during an email provider outage.
4. **No separate queue for email tasks.** Email tasks and other tasks share
   the same "default" queue, so email failures block unrelated tasks.

## Resolution

**Immediate (night of the incident)**:
- Disabled RSVP email notifications via environment variable

**Next day**:
- Reduced SMTP timeout to 5 seconds
- Added circuit breaker: after 3 consecutive email failures, skip email
  sending for 60 seconds
- Moved email tasks to a dedicated "email" queue with its own worker pool

**Following week**:
- Added Grafana alert for Celery queue depth > 100
- Added Grafana alert for email delivery failure rate > 10%
- Updated runbook with SendGrid-specific diagnosis steps

## Lessons Learned

### What went well
- Alerting fired within 5 minutes of the issue starting
- On-call engineer was able to identify root cause using traces and logs
  in under 15 minutes
- Mitigation (disabling emails) was quick and effective

### What went poorly
- The coupling between RSVP creation and email delivery was a known
  concern that had not been prioritized
- No circuit breaker meant a partial external failure became a full
  internal degradation
- The runbook did not have steps for email provider issues

## Action Items

| Action | Owner | Priority | Status |
|--------|-------|----------|--------|
| Add circuit breaker to email sending | Ada | P1 | Done |
| Separate Celery queue for email tasks | Ada | P1 | Done |
| Reduce SMTP timeout to 5s | Ada | P1 | Done |
| Alert on Celery queue depth > 100 | Marcus | P2 | Done |
| Alert on email failure rate > 10% | Marcus | P2 | Done |
| Update runbook with email provider steps | Ada | P2 | Done |
| Evaluate email provider redundancy (SendGrid + SES) | Ada | P3 | Open |
```

---

## Writing Effective Runbooks

A few principles for writing runbooks that people actually follow:

1. **Be specific**. "Check the database" is not helpful. "Run `SELECT count(*) FROM pg_stat_activity;` and compare against the `max_connections` setting" is.

2. **Order by likelihood**. Put the most common causes first. If 80% of RSVP latency incidents are caused by database connection exhaustion, put that check before the Redis check.

3. **Include exact commands**. Copy-paste ready commands save critical minutes during an incident. Include the full command with flags, URLs, and expected output.

4. **Define decision points**. "If connections are above 90, go to Step 4a. If connections are normal, go to Step 4b." The reader should not have to guess what to do next.

5. **Keep them updated**. A runbook that references infrastructure you decommissioned six months ago is worse than no runbook. Review runbooks quarterly.

6. **Test them**. Run through the runbook during a calm moment (or a game day exercise) to verify the steps work. This also helps new team members build confidence with the tools.

---

## Key Takeaways

1. **Severity is based on user impact**. Not technical complexity, not how "interesting" the bug is. A one-line misconfiguration that breaks login is more severe than a complex memory leak that affects 0.1% of users.

2. **Mitigate first, fix later**. During an incident, the goal is to restore service. Rollbacks, restarts, and feature flags are all valid. The permanent fix comes after.

3. **Every alert needs a runbook**. When your phone wakes you up at 3am, you should not have to think about what to check first. The runbook tells you.

4. **Postmortems must be blameless**. Focus on what the system allowed to happen, not who made a mistake. This builds a culture where people report problems instead of hiding them.

5. **Action items are the whole point**. A postmortem without action items is just a story. Every contributing factor should have a corresponding fix, with an owner, priority, and due date.

6. **Practice your incident response**. Run game day exercises where you simulate failures and practice using your observability tools and runbooks. The worst time to learn your tools is during a real incident.

In the module project, you will build the full observability stack for Gather: OpenTelemetry instrumentation, Prometheus metrics, a Grafana dashboard, and a production-ready runbook.

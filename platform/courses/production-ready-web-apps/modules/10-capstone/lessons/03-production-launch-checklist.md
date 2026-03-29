---
title: "Production Launch Checklist"
estimatedMinutes: 35
---

# Production Launch Checklist

You've built it. You've tested it. You've load-tested it. Now you need to ship it.

Launching a production application is not just flipping a switch. It's a coordinated process that touches security, performance, reliability, observability, deployment, and communication. Miss one step and you might spend your launch day fighting a preventable fire instead of celebrating.

This lesson gives you a comprehensive pre-launch checklist. Every item includes why it matters and how to verify it. By the end, you'll have a concrete list of things to confirm before Gather (or any production application) goes live.

## The Checklist Philosophy

A good checklist is not a bureaucratic exercise. It's a forcing function that makes you slow down and verify assumptions. Pilots use checklists before every flight, even though they've done it thousands of times. Surgeons use checklists before every procedure. The reason is simple: the cost of forgetting something is high, and human memory is unreliable.

Your checklist should be:

- **Specific**: "Verify SSL certificate is valid" is better than "Check security stuff"
- **Verifiable**: Every item should have a clear pass/fail test
- **Ordered**: Group by category and do them in order
- **Living**: Update it after every launch based on what you learned

## Security Checklist

Security issues that slip into production are the most expensive to fix, both in engineering time and reputation.

### Authentication and Authorization

| Item | Why It Matters | How to Verify |
|---|---|---|
| All API endpoints require authentication (except public ones) | Unauthenticated endpoints are open to abuse | Review your URL configuration. Test each endpoint without a token and confirm 401 responses |
| JWT tokens have reasonable expiration | Long-lived tokens are dangerous if leaked | Check your token configuration. Access tokens should expire in 15-60 minutes, refresh tokens in 7-30 days |
| Password hashing uses a strong algorithm | Weak hashing makes breached passwords easy to crack | Verify Django's PASSWORD_HASHERS uses PBKDF2, bcrypt, or Argon2 (not MD5 or SHA1) |
| Rate limiting on auth endpoints | Prevents brute-force attacks | Send 20 rapid login requests and confirm you get 429 after the limit |
| CORS is configured for your domain only | Open CORS lets any website make API calls as your users | Check CORS_ALLOWED_ORIGINS in settings. It should list your domains, not "*" |

### Data Protection

| Item | Why It Matters | How to Verify |
|---|---|---|
| No secrets in source code | Leaked secrets in Git history persist forever | Run `git log --all -p \| grep -i "secret\|password\|api_key"` and verify nothing sensitive appears |
| Environment variables for all secrets | Hardcoded secrets end up in logs and error reports | Grep your codebase for any hardcoded API keys, database passwords, or tokens |
| Database backups are automated | Data loss without backups is catastrophic | Verify your backup schedule runs. Restore from a backup to confirm it works |
| PII is not logged | User data in logs creates compliance and privacy risk | Review your logging configuration. Search logs for email addresses or other PII |
| SQL injection protection | Django's ORM handles this, but raw queries are vulnerable | Search for `raw()`, `extra()`, and `cursor.execute()`. Verify all use parameterized queries |

### Infrastructure Security

| Item | Why It Matters | How to Verify |
|---|---|---|
| SSH key-based auth only (no passwords) | Password-based SSH is brute-forceable | Check `sshd_config` for `PasswordAuthentication no` |
| Database not publicly accessible | A public database port is an invitation for attack | Verify your security groups. Port 5432 should only be accessible from your application servers |
| Redis requires authentication | Unauthenticated Redis has been used in many real-world breaches | Check your Redis configuration for `requirepass` |
| S3 buckets are not public | Public buckets leak data. This happens to major companies regularly | Check your bucket policy and ACLs. Use `aws s3api get-bucket-acl` |
| Dependencies are up to date | Known vulnerabilities in outdated packages are easy targets | Run `pip audit` and `npm audit`. Fix critical and high severity issues |

## Performance Checklist

You did the load testing in Lesson 02. Now verify the optimizations from earlier modules are in place.

| Item | Why It Matters | How to Verify |
|---|---|---|
| Database indexes on frequently queried columns | Without indexes, queries do full table scans that get slower as data grows | Run `EXPLAIN ANALYZE` on your top 10 queries. Confirm index scans, not sequential scans |
| PgBouncer is configured and connected | Django's default connection handling exhausts PostgreSQL connections under load | Check that your Django DATABASE config points to PgBouncer, not directly to PostgreSQL |
| Redis cache is populated and working | Cache misses under initial load cause a "thundering herd" of database queries | Verify cache hit rate is above 80% during load testing |
| Static assets served via CDN | Serving static files from your application server wastes compute on byte shuffling | Verify that CSS, JS, and images are served from your CDN domain, not your API domain |
| Image thumbnails are pre-generated | On-the-fly image processing blocks request handling | Upload a test image and confirm thumbnails exist in S3 within 30 seconds |
| Gzip/Brotli compression enabled | Uncompressed responses waste bandwidth and increase load times | Check response headers for `Content-Encoding: gzip` or `Content-Encoding: br` |
| Database connection pool sized correctly | Too few connections creates queuing. Too many overwhelms PostgreSQL | Load test at target traffic and verify no connection pool exhaustion errors |
| Celery concurrency matches workload | Under-provisioned workers create growing queues. Over-provisioned workers waste memory | Monitor queue depth during load test. It should stay near zero |

## Reliability Checklist

Your system will fail eventually. The question is whether it fails gracefully.

| Item | Why It Matters | How to Verify |
|---|---|---|
| Circuit breakers on external dependencies | Without circuit breakers, one failing dependency takes down your entire application | Kill Redis and confirm the application still serves requests (slower, from database) |
| Graceful degradation is tested | You need to know the degraded behavior before it happens in production | Run your chaos tests from Module 09. Document the degraded behavior for each failure mode |
| Health check endpoints exist | Load balancers and orchestrators need to know if an instance is healthy | Hit `/health/` and confirm it checks database connectivity, Redis connectivity, and Celery availability |
| Auto-restart on crash | Crashed processes that stay down are silent outages | Verify your process manager (systemd, Docker restart policy) restarts crashed processes |
| Database failover is tested | If your primary database goes down, recovery should be a known procedure | Document the failover steps. If using managed databases, verify the automatic failover works |
| Request timeouts are set | Without timeouts, slow requests accumulate and exhaust your worker pool | Verify Gunicorn timeout, Nginx proxy timeout, and database query timeout are all set |
| Retry logic has backoff | Immediate retries on failure can overload a struggling service | Review your Celery retry configuration. Confirm exponential backoff is configured |
| Dead letter queue for failed jobs | Jobs that fail repeatedly shouldn't disappear silently | Verify failed Celery tasks are captured and alertable |

## Observability Checklist

If you can't see it, you can't fix it.

| Item | Why It Matters | How to Verify |
|---|---|---|
| OpenTelemetry instrumentation is active | Without telemetry, you're debugging blind | Make a request and confirm a trace appears in your tracing backend |
| Grafana dashboards show key metrics | Dashboards are your first stop during an incident | Open your dashboards and verify they show live data for request rate, latency, error rate, and saturation |
| Alert rules are configured | Dashboards are useless if nobody is looking at them when things break | Trigger a test alert (e.g., spike the error rate) and confirm the notification arrives |
| Log aggregation is working | Scattered logs across multiple instances are impossible to search | Verify all instances ship logs to a central location. Search for a recent log entry to confirm |
| Error tracking captures stack traces | 500 errors in your logs need stack traces and context to debug | Trigger a deliberate error and confirm it appears in your error tracking system with full context |
| Structured logging format | Unstructured log lines are hard to filter and search | Verify your logs are JSON-formatted with consistent fields (timestamp, level, message, request_id) |

## Deployment Checklist

Your deployment process should be boring and repeatable.

| Item | Why It Matters | How to Verify |
|---|---|---|
| Zero-downtime deploy is verified | Users should not see errors during a deploy | Deploy a change and monitor error rate. It should stay at zero throughout |
| Rollback procedure is documented and tested | If a deploy goes wrong, you need to undo it fast | Practice a rollback. Measure how long it takes |
| Database migrations are backward-compatible | A migration that breaks the old code version will cause errors during blue-green deploys | Review pending migrations. Verify the old code version works with the new schema |
| Feature flags are in place for risky changes | Feature flags let you launch code without activating it for all users | Deploy a feature-flagged change. Verify it's inactive by default and can be toggled on |
| CI/CD pipeline runs all tests | Tests that don't run automatically will eventually be skipped | Push a commit and verify the full test suite runs before deploy |
| Container images are tagged and versioned | Using "latest" makes rollbacks impossible because you don't know what you're rolling back to | Verify your deploy uses a specific image tag (e.g., git SHA) |

## DNS and SSL Configuration

These are easy to get wrong and painful to debug in production.

### DNS Setup

```
gather.example.com    A     -> Load Balancer IP
api.gather.example.com CNAME -> Load Balancer
cdn.gather.example.com CNAME -> CloudFront distribution
```

**Verification steps**:

1. Run `dig gather.example.com` and confirm it resolves to the correct IP
2. Run `curl -I https://gather.example.com` and confirm you get a 200 response
3. Verify DNS TTL is set low (300 seconds) before launch so you can make quick changes, then increase it after things stabilize

### SSL/TLS Configuration

| Item | How to Verify |
|---|---|
| SSL certificate is valid and not expiring soon | `echo \| openssl s_client -connect gather.example.com:443 2>/dev/null \| openssl x509 -dates` |
| Auto-renewal is configured | If using Let's Encrypt, verify certbot renewal runs via cron or systemd timer |
| HTTP redirects to HTTPS | `curl -I http://gather.example.com` should return a 301 redirect to HTTPS |
| HSTS header is set | Check response headers for `Strict-Transport-Security` |
| SSL grade is A or higher | Test at ssllabs.com/ssltest |

## Error Tracking Setup

You need to know about errors before your users tell you. Set up error tracking (Sentry is the most common choice) and verify it's capturing errors from all components:

- Django API errors (500s, unhandled exceptions)
- Celery task failures
- Next.js frontend errors (client-side JavaScript exceptions)

**Verification**: Deploy a temporary endpoint that raises an exception. Confirm the error appears in your tracking system within 60 seconds, with the full stack trace, request context, and user information.

## On-Call Rotation

Even a small team needs a clear answer to the question: "Who gets woken up at 3am?"

**Minimum viable on-call setup**:

1. Define who is on call this week (even if the team is two people)
2. Set up a notification channel (PagerDuty, Opsgenie, or even a phone call from your monitoring system)
3. Document escalation: if the on-call person doesn't respond in 15 minutes, who gets notified next?
4. Define severity levels:
   - **P1 (Critical)**: System is down for all users. Respond in 15 minutes.
   - **P2 (Major)**: Significant feature is broken. Respond in 1 hour.
   - **P3 (Minor)**: Degraded performance or minor bug. Respond next business day.

## Runbook Inventory

A runbook is a step-by-step document for handling a specific type of incident. You should have runbooks for your most likely failure scenarios before you launch.

**Minimum runbooks for Gather**:

1. **Database connection exhaustion**: How to identify, how to increase PgBouncer pool, how to find and kill long-running queries
2. **Redis outage**: How to verify, expected degradation behavior, how to restart and re-warm cache
3. **Celery queue backup**: How to monitor queue depth, how to scale workers, how to drain and restart
4. **High error rate**: How to identify the cause, how to rollback a bad deploy, how to toggle feature flags
5. **Full disk**: How to identify which volume is full, how to clean up, how to resize

Each runbook should include:
- **Detection**: What alert fires, what dashboard shows the problem
- **Diagnosis**: Commands to run to understand the scope
- **Mitigation**: Steps to stop the bleeding (may not fix root cause)
- **Resolution**: Steps to fully resolve the issue
- **Post-incident**: What to document and what to improve

## Communication Plan for Incidents

When something breaks in production, clear communication matters as much as technical resolution.

**Internal communication**:
- Post in `#incidents` Slack channel with what's happening, who's investigating, and estimated impact
- Update every 15 minutes until resolved
- Post a summary when resolved

**External communication** (if user-facing):
- Status page update within 10 minutes of detection
- Honest, jargon-free language: "Some users may experience slower event loading times. We're investigating and will update within 30 minutes."
- Update when resolved: "The issue has been resolved. Event loading is back to normal. We've identified the cause and are taking steps to prevent recurrence."

## The Launch Day Timeline

Here's a template for a structured launch day:

### T-24 Hours (Day Before)
- [ ] Run final load test and confirm all targets are met
- [ ] Run full security checklist
- [ ] Verify all monitoring dashboards are live
- [ ] Confirm on-call schedule is set
- [ ] Pre-write status page updates for common scenarios
- [ ] Notify the team: launch is tomorrow at [time]

### T-1 Hour
- [ ] Verify production environment is healthy (all green on dashboards)
- [ ] Confirm rollback procedure is ready
- [ ] Open monitoring dashboards on a second screen
- [ ] Have the team in a Slack channel or call for real-time coordination

### T-0 (Launch)
- [ ] Deploy the production release
- [ ] Verify health check endpoints return 200
- [ ] Confirm zero errors in error tracking
- [ ] Test core flows manually: browse events, RSVP, upload image
- [ ] Monitor dashboards for 15 minutes

### T+15 Minutes
- [ ] Check error rate (should be < 0.1%)
- [ ] Check response time percentiles (should match load test baselines)
- [ ] Check database connection count (should be stable)
- [ ] Check Celery queue depth (should be near zero)

### T+1 Hour
- [ ] Review all metrics for the first hour
- [ ] Check for any slow queries in database logs
- [ ] Verify cache hit rates are as expected
- [ ] Share initial "all clear" or "investigating issue X" with the team

### T+24 Hours
- [ ] Review full day of metrics
- [ ] Check error tracking for any recurring issues
- [ ] Review any support tickets or user feedback
- [ ] Document anything unexpected for the post-launch retrospective

## Post-Launch Monitoring

Launching is not the finish line. The first week after launch is when you discover everything your testing missed.

**Daily checks for the first week**:
- Error rate trend (should be decreasing, not increasing)
- Response time trend (stable or improving)
- Database size growth rate (is it sustainable?)
- Celery queue depth over time (any growing backlog?)
- User signup and engagement metrics (is the product working?)

**Weekly checks going forward**:
- Dependency vulnerability scans
- SSL certificate expiration (even with auto-renewal, verify)
- Backup restoration test (monthly is better, weekly is ideal initially)
- Capacity utilization vs. plan (are you growing faster than expected?)

## Printing the Checklist

This lesson is your reference. But checklists work best when they're used actively, not passively read. In the project, you'll complete a concrete version of this checklist for your Gather instance, filling in actual values and marking items as verified.

The best launches are boring. Everything works. Nobody panics. The team celebrates. That's what preparation looks like.

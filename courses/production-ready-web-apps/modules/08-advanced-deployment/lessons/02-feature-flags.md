---
title: "Feature Flags"
estimatedMinutes: 35
---

# Feature Flags

You now have blue-green and canary deployment strategies that let you push new code to production without downtime. But deploying code and releasing a feature are two different things. Right now, they are coupled: the moment your code reaches production, every user gets the new behavior.

Feature flags break that coupling. They let you deploy code that contains a new feature but keep it hidden behind a conditional check. You control who sees the feature, when they see it, and how quickly you roll it out. If something goes wrong, you flip the flag off. No redeploy. No rollback. Just a configuration change.

This lesson covers why feature flags matter, the different types you will encounter, how to implement them in Django, and how to manage their lifecycle so they do not become permanent clutter in your codebase.

---

## Why Feature Flags Matter

Consider this scenario. Your team has been building an "event recommendations" feature for Gather. It uses collaborative filtering to suggest events based on RSVP history. The feature took three weeks to build. It touches the event detail page, the home feed, and a new API endpoint.

Without feature flags, you have two options:

1. **Keep the code in a long-lived branch** until it is ready. This means merge conflicts, stale tests, and a massive pull request that nobody wants to review.
2. **Deploy it and hope for the best.** If the recommendation algorithm is slow or returns bad results, every user sees the problem immediately.

Feature flags give you a third option: deploy the code to production, but only show recommendations to 10% of users. Monitor performance and result quality. If latency spikes, turn it off. If results look good, ramp to 25%, then 50%, then 100%. The code is in production the whole time. You are just controlling who sees it.

This is the pattern you will implement in the module project.

---

## Types of Feature Flags

Not all flags serve the same purpose. Understanding the types helps you design flags with the right scope and lifecycle.

### Release Flags

Release flags control whether a feature is visible to users. They are the most common type. You deploy the code, gate it behind a flag, and enable it when you are confident it works.

**Lifecycle**: Days to weeks. Remove after full rollout.

```python
# A release flag gating the recommendations feature
if feature_is_enabled("event_recommendations", user=request.user):
    recommendations = get_recommendations(request.user)
else:
    recommendations = []
```

### Experiment Flags

Experiment flags support A/B testing. They split users into groups and show different variants to measure which one performs better. Unlike release flags, experiment flags track metrics for each variant.

**Lifecycle**: Weeks to months. Remove after the experiment concludes and you pick a winner.

```python
# An experiment flag testing two recommendation algorithms
variant = get_experiment_variant("rec_algorithm", user=request.user)

if variant == "collaborative":
    recommendations = collaborative_filter(request.user)
elif variant == "content_based":
    recommendations = content_based_filter(request.user)
else:
    recommendations = []  # Control group
```

### Ops Flags

Ops flags (also called kill switches) let you disable functionality during incidents or high load. They are typically controlled by the operations team, not product managers.

**Lifecycle**: Permanent. They stay in the codebase as safety valves.

```python
# An ops flag to disable expensive recommendations during high load
if feature_is_enabled("enable_recommendations_processing"):
    recommendations = get_recommendations(request.user)
else:
    # Serve cached or empty results during an incident
    recommendations = cache.get("fallback_recommendations", [])
```

### Permission Flags

Permission flags gate features by user attributes: plan tier, organization, role, or a specific allowlist. They are useful for beta programs, enterprise features, or internal testing.

**Lifecycle**: Permanent or semi-permanent. Often tied to business logic.

```python
# A permission flag for beta testers
if feature_is_enabled("event_analytics_dashboard", user=request.user):
    # Only beta testers and staff see the analytics dashboard
    return render(request, "events/analytics.html", context)
else:
    raise Http404
```

### Summary Table

| Type | Who Controls It | Lifecycle | Example |
|------|----------------|-----------|---------|
| Release | Product/Engineering | Days to weeks | Gate new RSVP UI |
| Experiment | Product/Data | Weeks to months | A/B test recommendation algo |
| Ops | Operations/SRE | Permanent | Kill switch for heavy processing |
| Permission | Product/Business | Semi-permanent | Beta program access |

---

## Simple Feature Flags with django-flags

For small projects or when you are getting started, `django-flags` provides a lightweight way to add feature flags backed by Django settings or the database.

### Installation and Setup

```bash
pip install django-flags
```

```python
# settings.py

INSTALLED_APPS = [
    # ...
    "flags",
]

FLAGS = {
    "EVENT_RECOMMENDATIONS": [
        # Enable for staff users
        {"condition": "user", "value": "is_staff"},
    ],
    "NEW_RSVP_UI": [
        # Enable for everyone (boolean flag)
        {"condition": "boolean", "value": True},
    ],
    "ANALYTICS_DASHBOARD": [
        # Enable after a specific date
        {"condition": "after date", "value": "2026-04-01"},
    ],
}
```

### Using Flags in Views

```python
# events/views.py
from flags.state import flag_enabled

def event_detail(request, event_id):
    event = get_object_or_404(Event, id=event_id)

    context = {"event": event}

    if flag_enabled("EVENT_RECOMMENDATIONS", request=request):
        context["recommendations"] = get_recommendations(
            request.user, event
        )

    return render(request, "events/detail.html", context)
```

### Using Flags in Templates

```html
{% load feature_flags %}

{% flag_enabled "EVENT_RECOMMENDATIONS" request %}
  <section class="recommendations">
    <h2>Events You Might Like</h2>
    {% for rec in recommendations %}
      <div class="event-card">{{ rec.title }}</div>
    {% endfor %}
  </section>
{% endflag %}
```

### Using Flags as Decorators

```python
from flags.decorators import flag_required

@flag_required("ANALYTICS_DASHBOARD")
def analytics_view(request):
    """Only accessible when the ANALYTICS_DASHBOARD flag is enabled."""
    return render(request, "events/analytics.html")
```

### Limitations of django-flags

`django-flags` works well for simple boolean and condition-based flags. But it does not support:

- Percentage-based rollouts (show to 10% of users)
- Experiment variants (A/B/C testing)
- Flag audit logs (who changed what, when)
- Cross-service flag evaluation (if you have microservices)
- A management UI for non-developers

For these capabilities, you need a dedicated feature flag service.

---

## Full-Featured Flags with Unleash

Unleash is an open-source feature flag platform. You run it as a service (self-hosted or cloud), and your application checks flags via an SDK. It provides percentage rollouts, user targeting, variants, audit logs, and a web UI for managing flags.

### Architecture

```
┌──────────────┐         ┌──────────────────┐
│  Django App  │────────>│  Unleash Server  │
│  (SDK polls) │         │  (API + Web UI)  │
└──────────────┘         └──────────────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │   PostgreSQL     │
                         │  (flag configs)  │
                         └──────────────────┘
```

The SDK polls the Unleash server every few seconds (configurable) and caches flag states locally. This means flag evaluation is fast (no network call per check) and your application still works if the Unleash server goes down temporarily.

### Running Unleash with Docker Compose

Add Unleash to your existing Docker Compose setup:

```yaml
# docker-compose.yml (add these services)
services:
  unleash:
    image: unleashorg/unleash-server:6
    ports:
      - "4242:4242"
    environment:
      DATABASE_URL: postgres://unleash:unleash@unleash-db:5432/unleash
      DATABASE_SSL: "false"
    depends_on:
      unleash-db:
        condition: service_healthy

  unleash-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: unleash
      POSTGRES_PASSWORD: unleash
      POSTGRES_DB: unleash
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U unleash"]
      interval: 5s
      timeout: 3s
      retries: 5
    volumes:
      - unleash_data:/var/lib/postgresql/data

volumes:
  unleash_data:
```

After starting, the Unleash UI is available at `http://localhost:4242`. The default credentials are `admin` / `unleash4all`.

### Django SDK Setup

```bash
pip install UnleashClient
```

```python
# gather/feature_flags.py
from UnleashClient import UnleashClient

unleash_client = UnleashClient(
    url="http://unleash:4242/api",
    app_name="gather",
    instance_id="gather-api-1",
    custom_headers={
        "Authorization": f"*:development.{UNLEASH_API_TOKEN}"
    },
)

unleash_client.initialize_client()


def is_enabled(flag_name: str, user_id: str = None) -> bool:
    """Check if a feature flag is enabled."""
    context = {}
    if user_id:
        context["userId"] = str(user_id)

    return unleash_client.is_enabled(flag_name, context)
```

### Percentage Rollout in Unleash

This is the key capability for the module project. In the Unleash UI, you create a flag and configure a "gradual rollout" strategy:

1. Go to the Unleash UI and create a new feature toggle called `event-recommendations`.
2. Add a "Gradual rollout" activation strategy.
3. Set the rollout percentage to 10%.
4. Unleash uses a hash of the user ID to deterministically assign users to the enabled or disabled group. The same user always gets the same result, so the experience is consistent.

In your Django code:

```python
# events/views.py
from gather.feature_flags import is_enabled

def event_detail(request, event_id):
    event = get_object_or_404(Event, id=event_id)
    context = {"event": event}

    if is_enabled("event-recommendations", user_id=request.user.id):
        context["recommendations"] = get_recommendations(
            request.user, event
        )

    return render(request, "events/detail.html", context)
```

When you are ready to increase the rollout, you change the percentage in the Unleash UI. No code change. No redeploy.

### Monitoring Flag Impact

When rolling out a feature behind a flag, you need to compare metrics between users who have the flag enabled and those who do not. Add the flag state to your OpenTelemetry spans from Module 07:

```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

def event_detail(request, event_id):
    with tracer.start_as_current_span("event_detail") as span:
        event = get_object_or_404(Event, id=event_id)
        recs_enabled = is_enabled(
            "event-recommendations", user_id=request.user.id
        )

        span.set_attribute("feature.event_recommendations", recs_enabled)

        context = {"event": event}
        if recs_enabled:
            context["recommendations"] = get_recommendations(
                request.user, event
            )

        return render(request, "events/detail.html", context)
```

In Grafana, you can now filter request latency by `feature.event_recommendations=true` vs. `false` to see if the recommendations feature is impacting performance.

---

## Flag Lifecycle Management

Feature flags are powerful, but they accumulate. If you do not manage their lifecycle, your codebase fills up with stale conditionals that nobody is sure about. "Is this flag still active? Can I remove it? What happens if I do?"

### The Flag Lifecycle

Every feature flag should follow this lifecycle:

```
Created → Active → Rolled Out → Cleanup → Removed
```

1. **Created**: Flag is defined with a name, type, owner, and expiration date.
2. **Active**: Flag is in use. Some users see the feature, some do not.
3. **Rolled Out**: Flag is enabled for 100% of users. The feature is live.
4. **Cleanup**: Engineer removes the flag check from the code, leaving only the enabled path.
5. **Removed**: Flag is deleted from the flag service.

### Tracking Flags

Maintain a simple registry of active flags. This can be a comment block in your settings, a dedicated file, or a Notion database:

```python
# gather/flags_registry.py
"""
Active Feature Flags
====================

| Flag Name              | Type    | Owner  | Created    | Expires    | Status     |
|------------------------|---------|--------|------------|------------|------------|
| event-recommendations  | Release | Devin  | 2026-03-01 | 2026-04-01 | Rolling out|
| new-rsvp-ui            | Release | Maya   | 2026-02-15 | 2026-03-15 | 100%, clean|
| rec-algorithm-test     | Experiment | Devin | 2026-03-10 | 2026-04-15 | Active    |
| enable-recs-processing | Ops     | Ops    | 2026-03-01 | Never      | Permanent  |
"""
```

### Cleanup Discipline

Set a rule: every release flag must have an expiration date. When the feature is fully rolled out, the flag owner has two weeks to remove the flag from the code. This means:

1. Remove the conditional check. Keep only the "enabled" code path.
2. Remove the flag from the registry.
3. Delete the flag from Unleash (or django-flags settings).

If you skip cleanup, you end up with code like this:

```python
# Six months later, nobody knows if this flag is still active
if is_enabled("event-recommendations", user_id=request.user.id):
    # ... 50 lines of code ...
else:
    # Is this path even possible anymore?
    # ... 30 lines of dead code ...
    pass
```

A good heuristic: if a release flag has been at 100% for more than two weeks and no issues have surfaced, it is safe to remove.

### Stale Flag Detection

Add a simple check to your CI pipeline that warns about flags past their expiration date:

```python
# scripts/check_stale_flags.py
"""Check for feature flags past their expiration date."""

import re
import sys
from datetime import date
from pathlib import Path


def find_flag_references(codebase_path: str) -> dict[str, int]:
    """Count references to feature flags in the codebase."""
    flag_pattern = re.compile(r'is_enabled\(["\']([^"\']+)["\']')
    counts: dict[str, int] = {}

    for py_file in Path(codebase_path).rglob("*.py"):
        content = py_file.read_text()
        for match in flag_pattern.finditer(content):
            flag_name = match.group(1)
            counts[flag_name] = counts.get(flag_name, 0) + 1

    return counts


def check_expiration(registry_path: str) -> list[str]:
    """Parse the flags registry and find expired flags."""
    warnings = []
    today = date.today()

    content = Path(registry_path).read_text()
    row_pattern = re.compile(
        r"\|\s*(\S+)\s*\|\s*\w+\s*\|\s*\w+\s*\|\s*([\d-]+)\s*\|\s*([\d-]+|Never)\s*\|"
    )

    for match in row_pattern.finditer(content):
        flag_name = match.group(1)
        expires = match.group(3)

        if expires == "Never":
            continue

        exp_date = date.fromisoformat(expires)
        if exp_date < today:
            days_overdue = (today - exp_date).days
            warnings.append(
                f"FLAG EXPIRED: {flag_name} expired {days_overdue} days ago. "
                f"Remove the flag or update the expiration date."
            )

    return warnings


if __name__ == "__main__":
    warnings = check_expiration("gather/flags_registry.py")
    for w in warnings:
        print(f"WARNING: {w}")

    if warnings:
        sys.exit(1)
```

---

## Gather: Gating Event Recommendations to 10%

Here is the concrete plan for the module project. You will deploy the event recommendations feature to production behind a feature flag, starting at 10% of users.

### Step 1: Add the Flag Check

```python
# events/views.py
from gather.feature_flags import is_enabled

class EventDetailView(APIView):
    def get(self, request, event_id):
        event = get_object_or_404(Event, id=event_id)
        serializer = EventSerializer(event)
        data = serializer.data

        if is_enabled("event-recommendations", user_id=str(request.user.id)):
            recs = get_recommendations(request.user, event)
            data["recommendations"] = EventSerializer(recs, many=True).data

        return Response(data)
```

### Step 2: Configure 10% Rollout

In the Unleash UI (or via API):

```bash
# Create the flag via Unleash API
curl -X POST http://localhost:4242/api/admin/projects/default/features \
  -H "Authorization: *:development.your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "event-recommendations",
    "type": "release",
    "description": "Collaborative filtering event recommendations on detail page"
  }'

# Add 10% gradual rollout strategy
curl -X POST http://localhost:4242/api/admin/projects/default/features/event-recommendations/environments/development/strategies \
  -H "Authorization: *:development.your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "flexibleRollout",
    "parameters": {
      "rollout": "10",
      "stickiness": "userId",
      "groupId": "event-recommendations"
    }
  }'
```

### Step 3: Monitor and Ramp

Watch your Grafana dashboard. Compare latency and error rates for requests with `feature.event_recommendations=true` vs. `false`. If everything looks good after a day, increase to 25%. Then 50%. Then 100%.

### Step 4: Clean Up

Once the feature is at 100% and stable, remove the flag:

1. Remove the `if is_enabled(...)` conditional. Keep only the recommendations code path.
2. Delete the flag from Unleash.
3. Update the flags registry.
4. Submit the cleanup PR.

---

## Key Takeaways

- Feature flags decouple deployment from release. You can deploy code without exposing it to users.
- There are four types of flags: release, experiment, ops, and permission. Each has a different lifecycle and owner.
- `django-flags` works for simple boolean and condition-based flags. Unleash provides percentage rollouts, variants, and a management UI.
- Percentage-based rollouts use a hash of the user ID for deterministic, consistent assignment.
- Every feature flag needs an owner, an expiration date, and a cleanup plan. Stale flags are technical debt.
- Add flag state to your OpenTelemetry spans so you can compare metrics between enabled and disabled cohorts.

Next, you will learn how to define your infrastructure as code with Terraform, so your deployment environments are reproducible and version-controlled.

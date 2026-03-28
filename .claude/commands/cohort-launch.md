---
description: Launch a new program cohort end-to-end
---
## Current Cohorts

!`ls programs/cohorts/`

## Launch Checklist

Ask for:
1. Program name (fast-track, the-bridge, crowns-of-code)
2. Cohort identifier (e.g., 2026-Q2, bridge-2026-fall)
3. Notion database ID for the new cohort tracker

Then execute:
1. Create cohort config in `programs/cohorts/<cohort-id>.json` with Notion DB ID
2. Verify Notion database schema matches the expected template
3. Draft Slack channel creation command: `#cohort-{id}` (or `#bridge-{id}` for Bridge)
4. Draft welcome message using `automations/scripts/slack/welcome-message.js`
5. Set up reminder schedule in `automations/schedules/daily-jobs.json`
6. Update the relevant website program page if needed

Run all Slack actions with `--dry-run` first and confirm before sending.

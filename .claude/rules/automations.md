---
paths:
  - "automations/**"
---
# Automation Rules

## Basics

- Scripts live in `automations/scripts/`
- All scripts use shared clients in `automations/scripts/utils/`
- Schedule definitions are in `automations/schedules/daily-jobs.json`
- Scripts should be idempotent. Safe to re-run without side effects.
- Always log what was sent and to whom
- Pull data from Notion, format message, send via Slack
- Handle API rate limits with exponential backoff
- Fail gracefully with error logging, never crash silently

## daily-jobs.json Schema

```json
{
  "jobs": [
    {
      "name": "cohort-daily-reminder",
      "script": "slack/send-reminder.js",
      "cron": "0 9 * * 1-5",
      "description": "Send weekday morning reminders to active cohort members",
      "enabled": true,
      "notionSource": "NOTION_COHORT_DB_ID",
      "slackTarget": "cohort channel from cohort config"
    }
  ]
}
```

## Integration Patterns

### Notion to Slack (Cohort Reminders)

1. Query Notion cohort DB for members with Status = "In Progress"
2. Filter by milestone deadline approaching (within 3 days)
3. For each member, look up their Slack Handle
4. Format personalized reminder message
5. Send to cohort Slack channel (or DM if configured)
6. Log: timestamp, member, message sent, channel

### New Cohort Launch

1. Create Notion database from cohort-tracker template
2. Populate with enrolled member data
3. Create Slack channel: #cohort-{year}-{quarter}
4. Send welcome messages to all members with onboarding info
5. Set up daily reminder schedule for the cohort
6. Update website programs page with new cohort info

## Running Jobs

Use cron, GitHub Actions scheduled workflows, or cron-job.org to trigger scripts:

```bash
cd automations && node scripts/slack/send-reminder.js
```

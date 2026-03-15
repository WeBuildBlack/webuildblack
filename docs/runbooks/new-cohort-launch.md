# Runbook: Launch a New Cohort

1. Create Notion database from `programs/templates/cohort-tracker.json`
2. Create cohort config in `programs/cohorts/{cohort-id}.json`
3. Populate Notion DB with enrolled member data
4. Create Slack channel: `#cohort-{year}-{quarter}`
5. Send welcome messages to all members
6. Enable daily reminder job in `automations/schedules/daily-jobs.json`
7. Update website programs page with cohort info

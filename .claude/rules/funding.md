---
paths:
  - "funding/**"
---
# Funding Rules

## Basics

- All funding files live in `funding/`
- Scripts reuse shared utils from `automations/scripts/utils/` (notion-client, slack-client, logger)
- Grant opportunities are scored 0-100 by `scripts/utils/grant-matcher.js` across 4 dimensions: mission alignment, program fit, capacity match, strategic value

## Grant Research Workflow

1. Read `research/wbb-profile.md` + relevant `research/focus-areas/` file for context
2. Use WebSearch to find opportunities (optionally run `search-grants.js` for suggested queries)
3. Run `evaluate-opportunity.js --name="..." --funder="..." --amount=... --focus="..."` to score each find
4. Run `add-opportunity.js --dry-run` then confirm with Devin, then remove `--dry-run` to add to Notion

## Proposal Drafting

1. `sync-grant-tracker.js --status=Qualified` to see what's ready for proposals
2. `generate-proposal.js --template=letter-of-inquiry --program=fast-track --funder="..." --amount=...`
3. Review and customize the draft in conversation
4. Save final version with `--save`, update Notion status

## Pipeline Check-in

1. `pipeline-report.js` for overall status
2. `deadline-check.js --days=14` for urgency
3. Summarize and recommend actions to Devin

## Reference

- **Templates**: `letter-of-inquiry`, `full-proposal`, `corporate-sponsorship`, `government-grant`
- **Programs**: `fast-track`, `crowns-of-code`, `the-bridge`, `mavens-io`, `she-builds-black`
- **Budgets**: Each program has a budget template in `funding/templates/budgets/`. Use `generate-budget.js` to render.
- **Slack Channel**: `#funding` for deadline alerts and pipeline updates

## Extra Environment Variables (in `.env`)

```
NOTION_GRANT_TRACKER_DB_ID=    # Grant pipeline database
NOTION_FUNDER_DIRECTORY_DB_ID= # Funder relationships database
SLACK_FUNDING_CHANNEL_ID=      # #funding channel for alerts
```

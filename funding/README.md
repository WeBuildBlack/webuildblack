# WBB Funding Workspace

Structured workspace for grant research, tracking, and proposal generation. Designed for Claude to operate with Devin's oversight.

## Quick Start

```bash
cd funding
npm install

# Research & evaluate a grant opportunity
node scripts/research/evaluate-opportunity.js \
  --name="Google.org Impact Challenge" \
  --funder="Google" \
  --amount=250000 \
  --focus="STEM,workforce,racial-equity"

# Add to Notion pipeline (test first)
node scripts/notion/add-opportunity.js --dry-run \
  --name="Google.org Impact Challenge" \
  --funder="Google" \
  --amount=250000 \
  --deadline=2026-09-01

# Generate a proposal draft
node scripts/proposals/generate-proposal.js \
  --template=letter-of-inquiry \
  --program=fast-track

# Check pipeline status
node scripts/reports/pipeline-report.js

# Check upcoming deadlines
node scripts/reports/deadline-check.js --days=14
```

## Environment Variables

Add to your `.env`:

```bash
NOTION_GRANT_TRACKER_DB_ID=      # Grant pipeline database
NOTION_FUNDER_DIRECTORY_DB_ID=   # Funder relationships database
SLACK_FUNDING_CHANNEL_ID=        # #funding channel for alerts
```

## Workflows

### Grant Research
1. Claude reads `research/wbb-profile.md` + relevant `research/focus-areas/` file
2. Claude uses WebSearch to find opportunities
3. `evaluate-opportunity.js` scores each find (0-100)
4. `add-opportunity.js --dry-run` → confirm with Devin → run for real

### Proposal Drafting
1. `sync-grant-tracker.js --status=Qualified` to see what's ready
2. `generate-proposal.js --template=letter-of-inquiry --program=fast-track`
3. Review and customize in conversation
4. Save final version, update Notion status

### Pipeline Check-in
1. `pipeline-report.js` for overall status
2. `deadline-check.js --days=14` for urgency
3. Summarize and recommend actions

## Directory Layout

- `templates/` — Notion DB schemas, proposal templates, budget templates
- `research/` — Org profile, funder intelligence, focus area briefs
- `scripts/` — All automation scripts
- `proposals/` — Generated proposal drafts
- `reports/` — Generated pipeline reports

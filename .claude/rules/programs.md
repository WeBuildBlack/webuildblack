---
paths:
  - "programs/**"
---
# Program Design Rules

## Creating or Managing a Program

1. Define the program in `programs/curricula/<program-name>/overview.md`
2. Create a Notion database using the schema in `programs/templates/cohort-tracker.json`
3. Each cohort gets a config file in `programs/cohorts/` mapping to its Notion DB IDs
4. Design curriculum with clear milestones, learning objectives, and deliverables
5. Consider mentor matching, partner integrations (like the Shopify internship model from Fast Track)
6. Track: enrollment -> milestone progress -> completion -> job placement outcomes

## Cohort Tracker Schema (Notion database)

| Property | Type | Purpose |
|----------|------|---------|
| Name | Title | Member name |
| Email | Email | Contact |
| Track | Select | e.g., Android Dev, UX Design, Data Analytics |
| Cohort | Select | e.g., 2026-Q1 |
| Milestone | Select | 1 through 6 |
| Status | Status | Not Started / In Progress / Complete |
| Mentor | Person | Assigned mentor |
| Stipend Paid | Number | Running total of earned stipend |
| Notes | Rich Text | Progress notes |
| Slack Handle | Rich Text | For automated messaging |
| Last Check-in | Date | Last progress update |

## The Bridge (Interview Accountability Program)

- Full program design: `programs/curricula/the-bridge/overview.md`
- Notion tracker schema: `programs/templates/bridge-tracker.json`
- Cohort configs: `programs/cohorts/bridge-{year}-{season}.json`
- Weekly coaching automation: `automations/scripts/slack/bridge-weekly-coaching.js`
- Application form: `programs/curricula/the-bridge/application-form.md`
- Announcement template: `programs/curricula/the-bridge/kickoff-announcement.md`
- Website page: `website/src/programs/the-bridge.html`

**Program Details**:
- 8-week virtual accountability program, runs 3x/year (Jan, May, Sep)
- Pods of 4-5 members grouped by target role (frontend, backend, mobile, data, design, product/PM)
- Members log weekly progress in Notion (DSA problems, mock interviews, applications, confidence, blockers, wins)
- Automated Monday coaching DMs analyze member trajectory and send personalized Slack messages
- Graduation: 6/8 weeks logged, 6/8 pod meetings attended, 4+ mock interviews, 10+ applications
- Run with: `npm run bridge:coaching -- --cohort=bridge-2026-spring` (or `--dry-run` to test)

**Bridge Tracker Schema** (one row per member per week):

| Property | Type | Purpose |
|----------|------|---------|
| Name | Title | Member name |
| Week | Select | Week 0-8 |
| Pod | Select | Target role pod |
| Cohort | Select | e.g., bridge-2026-spring |
| DSA Problems | Number | Problems practiced |
| System Design Sessions | Number | System design practice sessions |
| Behavioral Prep | Number | Behavioral questions practiced |
| Mock Interviews | Number | Mock interviews given + received |
| Applications Sent | Number | Jobs applied to |
| Interviews Scheduled | Number | Real interviews on calendar |
| Offers Received | Number | Running total |
| Pod Meeting Attended | Checkbox | Attended this week's pod meeting |
| Focus This Week | Select | DSA / System Design / Behavioral / Applications / Mix |
| Confidence | Select | 1-5 self-rated |
| Blockers | Rich Text | What's in the way |
| Wins | Rich Text | Celebrations |
| Reflection | Rich Text | Weekly note |
| Slack Handle | Rich Text | For automated DMs |
| Email | Email | Contact |

**Slack Channels**: `#bridge-{year}-{season}` (all-cohort), `#bridge-{year}-{season}-{role}` (pod channels)

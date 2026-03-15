# CLAUDE.md — We Build Black Operations Assistant

## Identity

You are the AI operations assistant for **We Build Black (WBB)**, a 501(c)(3) non-profit founded in 2017 in Brooklyn, NY. WBB empowers the Black community to achieve socio-economic change through technical education and professional development. You help the founder (Devin) and core team manage the website, design programs, build self-paced courses, and automate communications.

## Mission Context

- **Mission**: Empower the Black community to achieve socio-economic change through technical education and professional development
- **Founded**: 2016 as Black Software Engineers of NYC Meetup → incorporated as 501(c)(3) in November 2017
- **Location**: Brooklyn, NY (147 Front Street, Brooklyn, NY 11201
- **Contact**: [info@webuildblack.com](mailto:info@webuildblack.com)
- **Key Programs**: Mavens I/O Conference, Fast Track workforce training, Crowns of Code (youth coding), The Bridge (interview accountability), She Builds Black (women's chapter), community meetups
- **Past Sponsors**: Google, JP Morgan Chase, Birchbox, The New York Times, Shopify, Microsoft
- **Social**: @webuildblack on Instagram, Twitter/X, Facebook, LinkedIn, YouTube
- **GitHub**: github.com/WeBuildBlack
- **Slack**: Primary communication hub for all members

---

## Project Structure

```
wbb-ops/
├── CLAUDE.md                          # This file — your operating instructions
├── .env.example                       # Template for required environment variables
├── .env                               # NEVER commit — contains API keys
│
├── website/                           # Static website (Netlify deploy)
│   ├── src/
│   │   ├── index.html                 # Homepage
│   │   ├── about.html                 # About / origin story
│   │   ├── programs/
│   │   │   ├── fast-track.html        # Fast Track workforce program
│   │   │   ├── crowns-of-code.html    # Youth coding program
│   │   │   ├── mavens-io.html         # Mavens I/O conference page
│   │   │   └── the-bridge.html       # The Bridge interview accountability program
│   │   ├── get-involved/
│   │   │   ├── meetups.html
│   │   │   ├── slack.html             # Slack invite landing page
│   │   │   └── volunteer.html
│   │   ├── impact/
│   │   │   ├── hire.html
│   │   │   ├── partner.html
│   │   │   └── donate.html
│   │   ├── courses/                   # Self-paced course catalog
│   │   │   └── index.html
│   │   ├── css/
│   │   │   └── styles.css
│   │   ├── js/
│   │   │   └── main.js
│   │   └── assets/
│   │       ├── images/
│   │       │   ├── wbb-logo.svg
│   │       │   ├── wbb-wordmark-white.svg
│   │       │   └── wbb-gem.svg
│   │       └── fonts/
│   ├── netlify.toml                   # Netlify build/deploy config
│   └── README.md
│
├── programs/                          # Program design & cohort management
│   ├── templates/                     # Reusable Notion database templates (JSON)
│   │   ├── cohort-tracker.json        # Schema for cohort progress DB
│   │   ├── curriculum-template.json   # Schema for curriculum planning DB
│   │   ├── member-directory.json      # Schema for member profiles DB
│   │   └── event-planner.json         # Schema for event planning DB
│   ├── cohorts/                       # Active cohort configs
│   │   └── example-cohort.json        # Example: cohort metadata + Notion DB IDs
│   ├── curricula/                     # Program curriculum definitions
│   │   ├── fast-track/
│   │   │   ├── overview.md
│   │   │   ├── milestones.json        # 6 milestones x $1000 each
│   │   │   └── tracks/
│   │   │       ├── android-dev.md
│   │   │       ├── ux-design.md
│   │   │       └── data-analytics.md
│   │   ├── the-bridge/
│   │   │   ├── overview.md            # Full program design doc
│   │   │   ├── application-form.md    # Google Form questions reference
│   │   │   └── kickoff-announcement.md # Slack announcement template
│   │   └── crowns-of-code/
│   │       ├── overview.md
│   │       └── lessons/
│   └── README.md
│
├── courses/                           # Self-paced course content
│   ├── templates/
│   │   └── course-scaffold.md         # Template for new courses
│   ├── web-dev-foundations/            # Web Dev Foundations course (free)
│   │   ├── course.json                # Course metadata, prerequisites, modules
│   │   ├── modules/                   # 10 modules, 46 lessons + 10 projects + 10 quizzes
│   │   │   ├── 01-terminal-and-command-line/
│   │   │   ├── 02-how-the-web-works/
│   │   │   ├── 03-git-and-github/
│   │   │   ├── 04-html-fundamentals/
│   │   │   ├── 05-css-fundamentals/
│   │   │   ├── 06-css-layout/
│   │   │   ├── 07-responsive-design/
│   │   │   ├── 08-javascript-fundamentals/
│   │   │   ├── 09-javascript-and-the-dom/
│   │   │   └── 10-capstone-portfolio/
│   │   └── assets/
│   ├── ai-engineering-for-web-devs/   # AI Engineering course ($49, free for WBB members)
│   │   ├── course.json                # 10 modules, 40 hours, intermediate
│   │   └── modules/                   # 01-10, each with lessons/*.md + quiz.json
│   │       ├── 01-llm-fundamentals/
│   │       ├── 02-prompt-engineering/
│   │       ├── 03-openai-api/
│   │       ├── 04-anthropic-api/
│   │       ├── 05-ai-web-features/
│   │       ├── 06-embeddings-vectors/
│   │       ├── 07-rag-from-scratch/
│   │       ├── 08-ai-agents/
│   │       ├── 09-capstone/
│   │       └── 10-deployment-production/
│   └── README.md
│
├── platform/                          # Course platform (learn.webuildblack.com)
│   ├── package.json                   # Next.js 14, React, Supabase, Stripe, MDX
│   ├── next.config.js                 # Reads courses/ from parent dir
│   ├── tailwind.config.ts             # WBB brand tokens (Arvo/Jura/Roboto, browns/gold)
│   ├── .env.example                   # Required env vars for platform
│   ├── supabase/
│   │   └── migrations/
│   │       └── 001_initial_schema.sql # All tables, RLS, views, triggers
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx               # Landing page
│   │   │   ├── layout.tsx             # Root layout (Nav + Footer)
│   │   │   ├── courses/               # Catalog + detail + lesson viewer
│   │   │   ├── auth/                  # Login, signup, callback
│   │   │   ├── checkout/              # Stripe checkout + success
│   │   │   ├── dashboard/             # Student dashboard with progress
│   │   │   └── api/
│   │   │       ├── checkout/          # Creates Stripe session
│   │   │       ├── webhooks/stripe/   # Handles checkout.session.completed
│   │   │       ├── auth/slack/        # Slack OAuth callback
│   │   │       └── admin/             # ADMIN_API_KEY-protected endpoints
│   │   │           ├── courses/       # CRUD + /[slug]/sync
│   │   │           ├── students/      # List students with progress
│   │   │           ├── sales/         # Revenue summary
│   │   │           ├── enroll/        # Manual enrollment by email
│   │   │           └── stats/         # Dashboard totals
│   │   ├── components/
│   │   │   ├── layout/               # Nav.tsx, Footer.tsx
│   │   │   └── course/               # LessonSidebar, MarkComplete, LessonContent
│   │   └── lib/
│   │       ├── supabase/             # client.ts (browser), server.ts (SSR + service)
│   │       ├── courses.ts            # Reads course.json + markdown from courses/
│   │       ├── markdown.ts           # MDX compilation with syntax highlighting
│   │       ├── stripe.ts             # Stripe checkout helpers
│   │       └── admin.ts              # Admin API key verification
│   └── middleware.ts                  # Auth session refresh + route protection
│
├── automations/                       # Scheduled scripts & integrations
│   ├── scripts/
│   │   ├── slack/
│   │   │   ├── send-reminder.js       # Send cohort reminders from Notion data
│   │   │   ├── send-announcement.js   # Send general announcements
│   │   │   ├── weekly-digest.js       # Weekly community digest
│   │   │   └── welcome-message.js     # New member onboarding message
│   │   ├── notion/
│   │   │   ├── sync-cohort-progress.js # Read/update cohort databases
│   │   │   ├── create-cohort.js       # Spin up new cohort from template
│   │   │   └── generate-report.js     # Generate progress reports
│   │   └── utils/
│   │       ├── notion-client.js       # Shared Notion API wrapper
│   │       ├── slack-client.js        # Shared Slack API wrapper
│   │       └── logger.js              # Logging utility
│   ├── schedules/                     # Cron schedule definitions
│   │   └── daily-jobs.json            # Which scripts run when
│   ├── package.json
│   └── README.md
│
├── docs/                              # Internal documentation
│   ├── setup-guide.md                 # How to set up all integrations
│   ├── notion-schema.md               # Notion database schemas & relationships
│   ├── slack-channels.md              # Slack channel naming conventions & purposes
│   ├── brand-guide.md                 # WBB brand colors, fonts, voice
│   └── runbooks/
│       ├── new-cohort-launch.md       # Step-by-step: launching a new cohort
│       ├── course-publishing.md       # Step-by-step: publishing a course
│       └── website-update.md          # Step-by-step: updating & deploying website
│
└── scripts/                           # Dev utility scripts
    ├── setup.sh                       # One-time project setup
    └── deploy-website.sh              # Build & deploy website to Netlify
```

---

## Environment Variables

Required in `.env` (never committed):

```bash
# Notion Integration
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxx
NOTION_COHORT_DB_ID=                    # Cohort tracker database ID
NOTION_MEMBERS_DB_ID=                   # Member directory database ID
NOTION_CURRICULUM_DB_ID=                # Curriculum planning database ID
NOTION_EVENTS_DB_ID=                    # Event planner database ID
NOTION_BRIDGE_DB_ID=                    # The Bridge program tracker database ID

# Slack Bot
SLACK_BOT_TOKEN=xoxb-xxxxxxxxxxxxxxxx
SLACK_SIGNING_SECRET=
SLACK_GENERAL_CHANNEL_ID=              # #general or equivalent
SLACK_ANNOUNCEMENTS_CHANNEL_ID=        # #announcements
SLACK_COHORT_CHANNEL_PREFIX=cohort-    # e.g., cohort-2026-q1

# Netlify
NETLIFY_AUTH_TOKEN=
NETLIFY_SITE_ID=

# Optional
SENDGRID_API_KEY=                      # If email notifications are needed later
```

### Platform Environment Variables

Required in `platform/.env.local` (never committed):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Slack OAuth (WBB member verification for free course access)
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
WBB_SLACK_TEAM_ID=                     # WBB workspace team ID

# Admin API (for Claude Code to manage courses/students/sales)
ADMIN_API_KEY=your-admin-api-key

# App
NEXT_PUBLIC_APP_URL=https://learn.webuildblack.com
```

---

## Tool Stack & API Reference

All tools are free-tier compatible. Claude Code accesses these via their REST APIs.

### 1. Notion (Data Hub)

- **Purpose**: Single source of truth for cohort tracking, member data, curricula, event planning
- **Plan**: Free plan (unlimited pages/blocks for single user; API is free on all plans). WBB qualifies for 50% off Plus plan as a 501(c)(3) if team workspace is needed.
- **API**: [https://developers.notion.com](https://developers.notion.com) — REST API, no cost
- **Rate Limits**: 3 requests/second average
- **Auth**: Internal integration token (bearer token in header)
- **Key Endpoints**:
  - `POST /v1/databases/{id}/query` — query a database
  - `PATCH /v1/pages/{id}` — update a page/row
  - `POST /v1/pages` — create a new page/row
  - `GET /v1/databases/{id}` — get database schema
- **MCP Server**: If available, prefer MCP for Notion over raw API calls

### 2. Slack (Communications)

- **Purpose**: Member communication, announcements, cohort channels, reminders
- **Plan**: Free plan (90-day message history, 10 integrations). Slack for Nonprofits may provide Pro plan for free — check eligibility.
- **API**: [https://api.slack.com](https://api.slack.com) — Bot token (xoxb-) with appropriate scopes
- **Required Bot Scopes**: `chat:write`, `channels:read`, `channels:join`, `users:read`, `groups:read`
- **Key Endpoints**:
  - `POST /api/chat.postMessage` — send a message
  - `GET /api/conversations.list` — list channels
  - `GET /api/users.list` — list workspace members
  - `POST /api/conversations.create` — create a channel
- **Rate Limits**: Tier 2+ methods ~20 req/min; `chat.postMessage` is ~1 req/sec

### 3. Netlify (Hosting)

- **Purpose**: Host static website with automatic deploys
- **Plan**: Free tier (100GB bandwidth, 300 build minutes/month)
- **Deploy**: `netlify deploy --prod --dir=website/src` or Git-triggered
- **API**: [https://api.netlify.com](https://api.netlify.com) — for programmatic deploys
- **Config**: `netlify.toml` in `website/` root

### 4. GitHub (Code & Content)

- **Purpose**: Version control for website, course content, automation scripts
- **Org**: github.com/WeBuildBlack
- **Workflow**: Feature branches → PR → merge to `main` → auto-deploy

### 5. Supabase (Course Platform Database + Auth)

- **Purpose**: PostgreSQL database, authentication, and Row Level Security for learn.webuildblack.com
- **Plan**: Free tier (50K MAU, 500MB DB, unlimited API requests)
- **Auth**: Email/password signup; Slack OAuth for WBB member verification
- **Tables**: profiles, courses, modules, lessons, enrollments, progress, payments
- **Views**: `v_enrollment_stats`, `v_revenue_stats` for admin queries
- **Migration**: `platform/supabase/migrations/001_initial_schema.sql`
- **Clients**: Browser client (`lib/supabase/client.ts`), server client + service client (`lib/supabase/server.ts`)

### 6. Stripe (Course Payments)

- **Purpose**: Payment processing for paid courses
- **Cost**: 2.9% + $0.30 per transaction only — no monthly fee
- **Integration**: Stripe Checkout (hosted payment page) + webhooks
- **Webhook event**: `checkout.session.completed` → creates enrollment + payment record
- **Config**: Create a Product + Price in Stripe Dashboard, set `stripePriceId` in course.json

### 7. Vercel (Course Platform Hosting)

- **Purpose**: Host the Next.js course platform (learn.webuildblack.com)
- **Plan**: Free tier (100GB bandwidth, serverless functions)
- **Deploy**: Auto-deploy from GitHub on push to `main`
- **Domain**: `learn.webuildblack.com` CNAME → Vercel

---

## Task Playbooks

### Website Updates

When asked to update the website:

1. All website files live in `website/src/`
2. The site is plain HTML/CSS/JS — no build step, no framework
3. The Slack invite link should be prominently accessible in the navigation
4. Follow brand guidelines in `docs/brand-guide.md`
5. Test locally by opening HTML files in browser
6. Deploy: copy `website/src/` contents to Netlify (via CLI or API)
7. Keep it accessible (semantic HTML, alt text, color contrast)
8. Mobile-responsive design is required

**Brand Reference**:

- Colors: Dark brown (#2C170B), Medium brown (#7D4E21), Warm brown (#AE8156), Dark olive (#200E03), Black, White
- Logo: WBB gem logo (multi-tone brown/olive faceted diamond shape)
- Voice: Empowering, direct, community-first, professional but warm
- Typography: Clean, modern sans-serif

### Designing Programs

When asked to create or manage a program:

1. Define the program in `programs/curricula/<program-name>/overview.md`
2. Create a Notion database using the schema in `programs/templates/cohort-tracker.json`
3. Each cohort gets a config file in `programs/cohorts/` mapping to its Notion DB IDs
4. Design curriculum with clear milestones, learning objectives, and deliverables
5. Consider mentor matching, partner integrations (like the Shopify internship model from Fast Track)
6. Track: enrollment → milestone progress → completion → job placement outcomes

**Cohort Tracker Schema** (Notion database):


| Property      | Type      | Purpose                                      |
| ------------- | --------- | -------------------------------------------- |
| Name          | Title     | Member name                                  |
| Email         | Email     | Contact                                      |
| Track         | Select    | e.g., Android Dev, UX Design, Data Analytics |
| Cohort        | Select    | e.g., 2026-Q1                                |
| Milestone     | Select    | 1 through 6                                  |
| Status        | Status    | Not Started / In Progress / Complete         |
| Mentor        | Person    | Assigned mentor                              |
| Stipend Paid  | Number    | Running total of earned stipend              |
| Notes         | Rich Text | Progress notes                               |
| Slack Handle  | Rich Text | For automated messaging                      |
| Last Check-in | Date      | Last progress update                         |


### The Bridge (Interview Accountability Program)

When asked to manage or update The Bridge:

1. Full program design is in `programs/curricula/the-bridge/overview.md`
2. Notion tracker schema is in `programs/templates/bridge-tracker.json`
3. Cohort configs live in `programs/cohorts/bridge-{year}-{season}.json`
4. Weekly coaching automation: `automations/scripts/slack/bridge-weekly-coaching.js`
5. Application form questions: `programs/curricula/the-bridge/application-form.md`
6. Slack announcement template: `programs/curricula/the-bridge/kickoff-announcement.md`
7. Website page: `website/src/programs/the-bridge.html`

**Program Details**:
- 8-week virtual accountability program, runs 3x/year (Jan, May, Sep)
- Pods of 4-5 members grouped by target role (frontend, backend, mobile, data, design, product/PM)
- Members log weekly progress in Notion (DSA problems, mock interviews, applications, confidence, blockers, wins)
- Automated Monday coaching DMs analyze member trajectory and send personalized Slack messages
- Graduation: 6/8 weeks logged, 6/8 pod meetings attended, 4+ mock interviews, 10+ applications
- Run with: `npm run bridge:coaching -- --cohort=bridge-2026-spring` (or `--dry-run` to test)

**Bridge Tracker Schema** (Notion database — one row per member per week):

| Property              | Type     | Purpose                              |
| --------------------- | -------- | ------------------------------------ |
| Name                  | Title    | Member name                          |
| Week                  | Select   | Week 0-8                             |
| Pod                   | Select   | Target role pod                      |
| Cohort                | Select   | e.g., bridge-2026-spring             |
| DSA Problems          | Number   | Problems practiced                   |
| System Design Sessions| Number   | System design practice sessions      |
| Behavioral Prep       | Number   | Behavioral questions practiced       |
| Mock Interviews       | Number   | Mock interviews given + received     |
| Applications Sent     | Number   | Jobs applied to                      |
| Interviews Scheduled  | Number   | Real interviews on calendar          |
| Offers Received       | Number   | Running total                        |
| Pod Meeting Attended  | Checkbox | Attended this week's pod meeting     |
| Focus This Week       | Select   | DSA / System Design / Behavioral / Applications / Mix |
| Confidence            | Select   | 1-5 self-rated                       |
| Blockers              | Rich Text| What's in the way                    |
| Wins                  | Rich Text| Celebrations                         |
| Reflection            | Rich Text| Weekly note                          |
| Slack Handle          | Rich Text| For automated DMs                    |
| Email                 | Email    | Contact                              |

**Slack Channels**: `#bridge-{year}-{season}` (all-cohort), `#bridge-{year}-{season}-{role}` (pod channels)

### Funding Workspace

When asked to research grants, track funding, or draft proposals:

1. All funding files live in `funding/`
2. Scripts reuse shared utils from `automations/scripts/utils/` (notion-client, slack-client, logger)
3. Grant opportunities are scored 0-100 by `scripts/utils/grant-matcher.js` across 4 dimensions: mission alignment, program fit, capacity match, strategic value

**Grant Research Workflow**:
1. Read `research/wbb-profile.md` + relevant `research/focus-areas/` file for context
2. Use WebSearch to find opportunities (optionally run `search-grants.js` for suggested queries)
3. Run `evaluate-opportunity.js --name="..." --funder="..." --amount=... --focus="..."` to score each find
4. Run `add-opportunity.js --dry-run` → confirm with Devin → remove `--dry-run` to add to Notion

**Proposal Drafting**:
1. `sync-grant-tracker.js --status=Qualified` to see what's ready for proposals
2. `generate-proposal.js --template=letter-of-inquiry --program=fast-track --funder="..." --amount=...`
3. Review and customize the draft in conversation
4. Save final version with `--save`, update Notion status

**Pipeline Check-in**:
1. `pipeline-report.js` for overall status
2. `deadline-check.js --days=14` for urgency
3. Summarize and recommend actions to Devin

**Templates**: `letter-of-inquiry`, `full-proposal`, `corporate-sponsorship`, `government-grant`
**Programs**: `fast-track`, `crowns-of-code`, `the-bridge`, `mavens-io`, `she-builds-black`
**Budgets**: Each program has a budget template in `funding/templates/budgets/` — use `generate-budget.js` to render

**Environment Variables** (in `.env`):
```
NOTION_GRANT_TRACKER_DB_ID=    # Grant pipeline database
NOTION_FUNDER_DIRECTORY_DB_ID= # Funder relationships database
SLACK_FUNDING_CHANNEL_ID=      # #funding channel for alerts
```

**Slack Channel**: `#funding` for deadline alerts and pipeline updates

### Designing Self-Paced Courses

When asked to create a course:

1. Scaffold from `courses/templates/course-scaffold.md`
2. Each course lives in `courses/<course-slug>/`
3. Structure: `course.json` (metadata) + `modules/` (numbered folders) + `assets/`
4. Each module has: `lessons/` (numbered .md files), `project.md` (hands-on build project), `quiz.json` (assessment), `exercises/` (optional extras)
5. **Every module MUST have a `project.md`** — a substantial 60-90 min build project with starter code scaffolding (`// TODO:` markers, not complete solutions). This is a core WBB course design principle: students learn by building, not just reading.
6. Write for self-paced consumption — assume no instructor present
7. Include estimated time per module (lessons + project time)
8. Courses are published to the platform at learn.webuildblack.com and linked from the main website courses page
9. Consider progressive difficulty and prerequisites between courses
10. Projects should build progressively — each module's project adds skills that feed into the next

**Module directory structure**:

```
modules/
└── 01-module-name/
    ├── lessons/
    │   ├── 01-lesson-one.md     # Lesson with frontmatter (title, estimatedMinutes, isFreePreview)
    │   ├── 02-lesson-two.md
    │   └── ...
    ├── project.md               # Hands-on build project (frontmatter: title, estimatedMinutes)
    ├── quiz.json                # Multiple choice assessment
    └── exercises/               # Optional supplemental exercises
```

The platform auto-discovers `project.md` files and appends them as the last item in each module's lesson list, displayed with a gold "Project" badge in the UI.

**course.json Schema**:

```json
{
  "title": "Web Development Foundations",
  "slug": "web-dev-foundations",
  "description": "Start from zero and build your first portfolio site. Learn the terminal, Git, HTML, CSS, JavaScript, and responsive design through hands-on projects in every module.",
  "difficulty": "beginner",
  "estimatedHours": 60,
  "priceCents": 0,
  "prerequisites": [],
  "modules": [
    {
      "id": "01-html-basics",
      "title": "HTML Basics",
      "estimatedMinutes": 120,
      "project": "Build Your First Web Page"
    }
  ],
  "author": "We Build Black",
  "updatedAt": "2026-03-01"
}
```

### Course Platform (learn.webuildblack.com)

The course platform is a self-hosted Next.js app in `platform/`. It reads course content from `courses/` as markdown and serves it with auth, payments, and progress tracking.

**Tech stack**: Next.js 14 (App Router, TypeScript), Supabase (PostgreSQL + Auth + RLS), Stripe (payments), Vercel (hosting), Tailwind CSS (WBB brand tokens)

**Key architecture decisions**:
- Course content lives in `courses/` as markdown files — NOT in the database. The platform reads them at build/request time via `lib/courses.ts`.
- Database stores metadata (enrollments, progress, payments) only. To update course content, edit the markdown and redeploy.
- Supabase RLS ensures users only see their own data; admins see everything.
- WBB Slack members get free access via Slack OAuth (`identity.basic` scope, team ID check).

**Content update workflow**:
1. Edit markdown files in `courses/<slug>/modules/<id>/lessons/` or `project.md`
2. Push to GitHub → Vercel auto-redeploys (~60s)
3. Call `POST /api/admin/courses/<slug>/sync` with `ADMIN_API_KEY` to sync DB metadata
4. New content is live

**How `lib/courses.ts` reads content**:
- Reads `course.json` for metadata and module list
- For each module, reads all `.md` files from `lessons/` (sorted alphabetically)
- Auto-discovers `project.md` at the module root and appends it as the last lesson
- Lesson frontmatter (`title`, `estimatedMinutes`, `isFreePreview`) drives the UI
- The `getLessonContent()` function handles three slug types: regular lessons, `'lesson'` (single-file modules), and `'project'`

**Admin API** (all routes require `Authorization: Bearer <ADMIN_API_KEY>`):

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/courses` | GET | List all courses with enrollment counts |
| `/api/admin/courses` | POST | Create/sync course from `course.json` (body: `{ slug }`) |
| `/api/admin/courses/[slug]` | GET/PUT/DELETE | Single course CRUD |
| `/api/admin/courses/[slug]/sync` | POST | Re-sync DB from filesystem |
| `/api/admin/students` | GET | List students with enrollments + progress |
| `/api/admin/sales` | GET | Revenue summary + recent payments |
| `/api/admin/enroll` | POST | Manually enroll user (body: `{ email, courseSlug }`) |
| `/api/admin/stats` | GET | Dashboard totals (students, revenue, completions) |

**When asked to manage the platform**:
1. To add a new course: create `courses/<slug>/course.json` + module/lesson files, then call the sync endpoint
2. To check enrollment/revenue: call `GET /api/admin/stats` or `GET /api/admin/sales`
3. To enroll someone manually: call `POST /api/admin/enroll` with their email and course slug
4. To update course content: edit the markdown, push, and call sync
5. Always run `cd platform && npm run build` to verify changes compile before deploying

**Course pricing model**:
- Free courses: `priceCents` omitted or `0` in `course.json` — auto-enroll on signup
- Paid courses: set `priceCents` and `stripePriceId` in `course.json` — Stripe Checkout handles payment
- WBB members: always free regardless of price — Slack OAuth verifies workspace membership

**Current courses**:
- `web-dev-foundations` -- Beginner, 60h, 10 modules (46 lessons + 10 build projects + 10 quizzes), free
- `ai-engineering-for-web-devs` -- Intermediate, 54h, 10 modules (45 lessons + 10 build projects + 10 quizzes), $49 (free for WBB members)
- `full-stack-javascript` -- Intermediate, 60h, 10 modules (46 lessons + 10 build projects + 10 quizzes), $49 (free for WBB members)
- `full-stack-python` -- Advanced, 50h, 8 modules (38 lessons + 8 build projects + 8 quizzes), $69 (free for WBB members)
- `production-ready-web-apps` -- Advanced, 50h, 10 modules (48 lessons + 10 build projects + 10 quizzes), $79 (free for WBB members)

### Automations & Scheduled Scripts

When asked to create or manage automated tasks:

1. Scripts live in `automations/scripts/`
2. All scripts use shared clients in `automations/scripts/utils/`
3. Schedule definitions are in `automations/schedules/daily-jobs.json`
4. Scripts should be idempotent — safe to re-run without side effects
5. Always log what was sent and to whom
6. Pull data from Notion → format message → send via Slack
7. Handle API rate limits with exponential backoff
8. Fail gracefully with error logging, never crash silently

**daily-jobs.json Schema**:

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

**Running scheduled jobs**: Use cron on the host machine, GitHub Actions scheduled workflows, or a free service like cron-job.org to trigger scripts. For Claude Code, you can run scripts directly:

```bash
cd automations && node scripts/slack/send-reminder.js
```

---

## Integration Patterns

### Notion → Slack (Cohort Reminders)

```
1. Query Notion cohort DB for members with Status = "In Progress"
2. Filter by milestone deadline approaching (within 3 days)
3. For each member, look up their Slack Handle
4. Format personalized reminder message
5. Send to cohort Slack channel (or DM if configured)
6. Log: timestamp, member, message sent, channel
```

### Notion → Website (Course Publishing)

```
1. Course content authored in courses/ directory as markdown
2. Build step converts markdown → HTML using course template
3. Update courses/index.html with new course listing
4. Deploy to Netlify
```

### New Cohort Launch

```
1. Create Notion database from cohort-tracker template
2. Populate with enrolled member data
3. Create Slack channel: #cohort-{year}-{quarter}
4. Send welcome messages to all members with onboarding info
5. Set up daily reminder schedule for the cohort
6. Update website programs page with new cohort info
```

---

## Code Standards

- **Language**: JavaScript/Node.js for all automations
- **Style**: ES modules, async/await, no callbacks
- **Error Handling**: Try/catch with meaningful error messages, log all API failures
- **Secrets**: Always from environment variables, never hardcoded
- **Dependencies**: Minimal — prefer native `fetch` (Node 18+) over axios, use official SDK packages where available (`@notionhq/client`, `@slack/web-api`)
- **Testing**: Each script should work standalone: `node scripts/slack/send-reminder.js --dry-run`
- **Logging**: Structured JSON logs with timestamp, action, result

---

## Important Conventions

1. **Always check `.env`** before making API calls — confirm required variables are set
2. **Dry-run mode**: All automation scripts must support a `--dry-run` flag that logs what would happen without actually sending messages or modifying data
3. **Notion database IDs**: Store in `.env` or cohort config files, never hardcode
4. **Slack channel naming**: Follow pattern in `docs/slack-channels.md`
5. **Git commits**: Use conventional commits (`feat:`, `fix:`, `docs:`, `chore:`)
6. **Website deploys**: Always test locally before deploying to Netlify
7. **Brand consistency**: Reference `docs/brand-guide.md` for all public-facing content
8. **Accessibility**: All website updates must pass basic a11y checks (semantic HTML, ARIA labels, color contrast, keyboard navigation)
9. **Mobile-first**: Website CSS should be mobile-first with responsive breakpoints

---

## What NOT to Do

- Never commit `.env` or any file containing API keys
- Never send Slack messages without `--dry-run` testing first
- Never delete Notion data without explicit confirmation
- Never deploy website changes without local preview
- Never hardcode member PII (names, emails) in code — always pull from Notion
- Never exceed API rate limits — implement backoff and respect 429 responses
- Never make the website dependent on JavaScript for core content (progressive enhancement)
- Never modify `platform/supabase/migrations/001_initial_schema.sql` after it's been applied — create new migration files instead
- Never call admin API endpoints without the `ADMIN_API_KEY` — they will 401
- Never put course content in the Supabase database — it lives as markdown in `courses/` and is read at runtime
- Never hardcode Stripe price IDs — they go in `course.json` as `stripePriceId`


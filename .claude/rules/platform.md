---
paths:
  - "platform/**"
---
# Course Platform Rules (learn.webuildblack.com)

## Tech Stack

Next.js 14 (App Router, TypeScript), Supabase (PostgreSQL + Auth + RLS), Stripe (payments), Vercel (hosting), Tailwind CSS (WBB brand tokens: Arvo/Jura/Roboto, browns/gold)

## Key Architecture Decisions

- Course content lives in `courses/` as markdown files, NOT in the database. The platform reads them at build/request time via `lib/courses.ts`.
- Database stores metadata (enrollments, progress, payments) only. To update course content, edit the markdown and redeploy.
- Supabase RLS ensures users only see their own data; admins see everything.
- WBB Slack members get free access via Slack OAuth (`identity.basic` scope, team ID check).

## Content Update Workflow

1. Edit markdown files in `courses/<slug>/modules/<id>/lessons/` or `project.md`
2. Push to GitHub. Vercel auto-redeploys (~60s)
3. Call `POST /api/admin/courses/<slug>/sync` with `ADMIN_API_KEY` to sync DB metadata
4. New content is live

## How `lib/courses.ts` Reads Content

- Reads `course.json` for metadata and module list
- For each module, reads all `.md` files from `lessons/` (sorted alphabetically)
- Auto-discovers `project.md` at the module root and appends it as the last lesson
- Lesson frontmatter (`title`, `estimatedMinutes`, `isFreePreview`) drives the UI
- `getLessonContent()` handles three slug types: regular lessons, `'lesson'` (single-file modules), and `'project'`

## Admin API

All routes require `Authorization: Bearer <ADMIN_API_KEY>`:

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

## Managing the Platform

1. To add a new course: create `courses/<slug>/course.json` + module/lesson files, then call the sync endpoint
2. To check enrollment/revenue: call `GET /api/admin/stats` or `GET /api/admin/sales`
3. To enroll someone manually: call `POST /api/admin/enroll` with their email and course slug
4. To update course content: edit the markdown, push, and call sync
5. Always run `cd platform && npm run build` to verify changes compile before deploying

## Course Pricing Model

- Free courses: `priceCents` omitted or `0` in `course.json`. Auto-enroll on signup.
- Paid courses: set `priceCents` and `stripePriceId` in `course.json`. Stripe Checkout handles payment.
- WBB members: always free regardless of price. Slack OAuth verifies workspace membership.

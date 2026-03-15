# WBB Self-Paced Courses

Course content for the [WBB Learn](https://learn.webuildblack.com) platform.

## Courses

| Course | Slug | Difficulty | Hours | Modules | Price | Status |
|--------|------|------------|-------|---------|-------|--------|
| Web Development Foundations | `web-dev-foundations` | Beginner | 60 | 10 | Free | Complete |
| AI Engineering for Web Devs | `ai-engineering-for-web-devs` | Intermediate | 50 | 10 | $49 (free for WBB members) | Complete |
| Full-Stack JavaScript | `full-stack-javascript` | Intermediate | 60 | 10 | $49 (free for WBB members) | Complete |
| Full-Stack Python | `full-stack-python` | Advanced | 50 | 8 | $69 (free for WBB members) | Complete |
| Production-Ready Web Apps | `production-ready-web-apps` | Advanced | 50 | 10 | $79 (free for WBB members) | Complete |

## Directory Structure

Each course follows this structure:

```
course-slug/
├── course.json          # Metadata (title, slug, difficulty, modules, pricing)
├── modules/
│   └── 01-module-name/
│       ├── lessons/
│       │   ├── 01-lesson-name.md   # Lesson content (YAML frontmatter + markdown)
│       │   └── ...
│       ├── project.md              # Hands-on build project
│       ├── quiz.json               # Multiple-choice assessment
│       └── exercises/              # Optional supplemental exercises
└── assets/                         # Course-specific images, files
```

## Creating a New Course

1. Scaffold from `templates/course-scaffold.md`
2. Create `course-slug/course.json` with metadata
3. Create numbered module directories with lessons, project, and quiz
4. Push to GitHub (auto-deploys to Vercel)
5. Sync to database: `POST /api/admin/courses` with `{ "slug": "course-slug" }`

## Content Guidelines

- Every module **must** have a `project.md` (60-90 min hands-on build project)
- Lessons use YAML frontmatter: `title`, `estimatedMinutes`, optional `isFreePreview`
- Projects include starter code with `// TODO:` markers for students to complete
- Quizzes: 8-12 multiple-choice questions with explanations
- Write for self-paced consumption (no instructor assumed)

See `templates/course-scaffold.md` for the full template.

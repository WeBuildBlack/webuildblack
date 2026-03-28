---
paths:
  - "courses/**"
---
# Course Design Rules

## Creating a Course

1. Scaffold from `courses/templates/course-scaffold.md`
2. Each course lives in `courses/<course-slug>/`
3. Structure: `course.json` (metadata) + `modules/` (numbered folders) + `assets/`
4. Each module has: `lessons/` (numbered .md files), `project.md` (hands-on build project), `quiz.json` (assessment), `exercises/` (optional extras)
5. **Every module MUST have a `project.md`**. This is a substantial 60-90 min build project with starter code scaffolding (`// TODO:` markers, not complete solutions). Core WBB principle: students learn by building, not just reading.
6. Write for self-paced consumption. Assume no instructor present.
7. Include estimated time per module (lessons + project time)
8. Courses are published to learn.webuildblack.com and linked from the main website courses page
9. Consider progressive difficulty and prerequisites between courses
10. Projects should build progressively. Each module's project adds skills that feed into the next.

## Module Directory Structure

```
modules/
  01-module-name/
    lessons/
      01-lesson-one.md     # Frontmatter: title, estimatedMinutes, isFreePreview
      02-lesson-two.md
    project.md               # Frontmatter: title, estimatedMinutes
    quiz.json                # Multiple choice assessment
    exercises/               # Optional supplemental exercises
```

The platform auto-discovers `project.md` files and appends them as the last item in each module's lesson list, displayed with a gold "Project" badge.

## course.json Schema

```json
{
  "title": "Web Development Foundations",
  "slug": "web-dev-foundations",
  "description": "...",
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

## Current Courses

- `web-dev-foundations`: Beginner, 60h, 10 modules, free
- `ai-engineering-for-web-devs`: Intermediate, 54h, 10 modules, $49 (free for WBB members)
- `full-stack-javascript`: Intermediate, 60h, 10 modules, $49 (free for WBB members)
- `full-stack-python`: Advanced, 50h, 8 modules, $69 (free for WBB members)
- `production-ready-web-apps`: Advanced, 50h, 10 modules, $79 (free for WBB members)

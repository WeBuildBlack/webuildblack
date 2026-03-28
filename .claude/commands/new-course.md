---
description: Scaffold a new self-paced course from template
---
## Course Scaffold

Read the template at `courses/templates/course-scaffold.md` and the course design rules.

Ask for:
1. Course title and slug
2. Difficulty level (beginner, intermediate, advanced)
3. Estimated hours
4. Price in cents (0 for free)
5. Prerequisites (other course slugs)
6. Number of modules with titles

Then create:
- `courses/<slug>/course.json` with metadata
- `courses/<slug>/modules/` directory structure with numbered module folders
- Each module gets: `lessons/` dir, `project.md` stub, `quiz.json` stub
- Every `project.md` must include `// TODO:` markers for student work

After scaffolding, remind to:
1. Fill in lesson content
2. Design build projects for each module (60-90 min each)
3. Write quiz questions
4. Run `POST /api/admin/courses/<slug>/sync` to register in the platform

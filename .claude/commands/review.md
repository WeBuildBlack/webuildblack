---
description: Review the current branch diff for issues before merging
---
## Changes to Review

!`git diff --name-only main...HEAD`

## Detailed Diff

!`git diff main...HEAD`

Review the above changes for:
1. Code quality issues and bugs
2. Security vulnerabilities (especially around API keys, PII, injection)
3. Missing test coverage or broken `--dry-run` support
4. Accessibility issues in any HTML changes
5. Brand consistency for any public-facing content (reference docs/brand-guide.md)
6. Performance concerns

Give specific, actionable feedback per file.

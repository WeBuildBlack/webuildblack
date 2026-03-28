---
description: Test and deploy the website to Netlify
---
## Current Website Status

!`git status website/`

## Pre-deploy Checklist

Before deploying, verify:
1. All HTML files in `website/src/` are valid and open correctly
2. No hardcoded PII or API keys in any file
3. All images have alt text
4. CSS is mobile-first and responsive
5. Brand guidelines from `docs/brand-guide.md` are followed
6. Slack invite link is accessible in navigation

## Deploy

If checks pass, deploy with:
```
netlify deploy --prod --dir=website/src
```

Summarize what changed and confirm the deploy succeeded.

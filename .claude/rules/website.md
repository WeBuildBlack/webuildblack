---
paths:
  - "website/**"
---
# Website Rules

## Basics

- All website files live in `website/src/`
- Plain HTML/CSS/JS. No build step, no framework
- The Slack invite link should be prominently accessible in the navigation
- Follow brand guidelines in `docs/brand-guide.md`
- Test locally by opening HTML files in browser
- Deploy: copy `website/src/` contents to Netlify (via CLI or API)

## Brand Reference

- Colors: Dark brown (#2C170B), Medium brown (#7D4E21), Warm brown (#AE8156), Dark olive (#200E03), Black, White
- Logo: WBB gem logo (multi-tone brown/olive faceted diamond shape)
- Voice: Empowering, direct, community-first, professional but warm
- Typography: Clean, modern sans-serif

## Requirements

- Accessible: semantic HTML, alt text, color contrast
- Mobile-responsive design is required (mobile-first CSS)
- Progressive enhancement: core content must work without JavaScript

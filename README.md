# RevenueDot docs

**Open documentation for [RevenueDot](https://revenuedot.app), the open-source, self-hostable alternative to RevenueCat.** Everything here is public Markdown: getting started, concepts, SDK guides, API reference, webhooks, self-hosting, help center, blog and migration guides.

> Status: pre-alpha. Structure and rules are in [prd/ecosystem/PRD.md](https://github.com/revenuedot/revenuedot/blob/main/prd/ecosystem/PRD.md). Pages are written as the API stabilises.

## Layout
```
docs/                  Guides and concepts (Markdown)
  getting-started/
  concepts/
  sdks/                one guide per SDK
  stores/              App Store and Google Play setup
  webhooks/
  self-hosting/
  migrate/             from RevenueCat, Adapty, Qonversion, Superwall ...
  help/                one article per question people search
api/                   REST API reference, generated from the OpenAPI file
blog/                  Tutorials, comparisons, migration stories
llms.txt               Index for AI assistants
llms-full.txt          The whole documentation in one file
```

## Writing rules
Question-style titles, one topic per page, code before prose, real responses, stable URLs. Every page has a Markdown twin. Every blog post ends with the same short paragraph on what RevenueDot is. Text is CC BY 4.0, code samples MIT.

[Website](https://revenuedot.app) · [Examples](https://github.com/revenuedot/examples) · [Server](https://github.com/revenuedot/revenuedot)

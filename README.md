<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/revenuedot/revenuedot/main/brand/kit/wordmark/revenuedot-lockup-white.svg">
  <img alt="RevenueDot" src="https://raw.githubusercontent.com/revenuedot/revenuedot/main/brand/kit/wordmark/revenuedot-lockup-black.svg" height="44">
</picture>

# RevenueDot docs

**Every docs page, the API reference, the help center, the blog and `llms.txt` for [RevenueDot](https://revenuedot.app), the open-source RevenueCat alternative.**<br>
Published at [revenuedot.app/docs](https://revenuedot.app/docs); the source of truth is this repository.

[Docs](https://revenuedot.app/docs) · [API reference](https://revenuedot.app/docs/api) · [Migrate from RevenueCat](https://revenuedot.app/docs/migrate) · [Sign up](https://app.revenuedot.app/signup) · [Main repository](https://github.com/revenuedot/revenuedot)

[![Text: CC BY 4.0](https://img.shields.io/badge/text-CC%20BY%204.0-0A0A0A)](LICENSE)
[![Code: MIT](https://img.shields.io/badge/code-MIT-0A0A0A)](LICENSE)
[![llms.txt](https://img.shields.io/badge/llms.txt-ready-0A0A0A)](https://revenuedot.app/llms.txt)
[![Deploy](https://img.shields.io/github/actions/workflow/status/revenuedot/docs/deploy-site.yml?branch=main&label=deploy&color=0A0A0A)](https://github.com/revenuedot/docs/actions/workflows/deploy-site.yml)

</div>

**Open documentation for [RevenueDot](https://revenuedot.app), the open-source backend for in-app purchases and subscriptions, with an SDK for every platform.** RevenueDot Cloud Pro is free until your apps make $10,000 a month, then 0.5% of revenue above that, never more than $999 a month; Enterprise is custom. [Start for free](https://app.revenuedot.app/signup). Everything here is public Markdown: getting started, concepts, SDK guides, store setup, webhooks, self-hosting, migration from RevenueCat, the API reference, a help center and a blog.

> Every page says what works today and what is planned.

The pages are published at [revenuedot.app/docs](https://revenuedot.app/docs) and [revenuedot.app/blog](https://revenuedot.app/blog), with [llms.txt](https://revenuedot.app/llms.txt) at the site root. Every push to `main` runs the checks below and redeploys the site ([`.github/workflows/deploy-site.yml`](.github/workflows/deploy-site.yml)).

## Start here
- [What is RevenueDot?](docs/getting-started/README.md) and the [5-minute quickstart](docs/getting-started/quickstart.md) on RevenueDot Cloud
- [Self-hosting](docs/guides/self-hosting.md): reference for people who run their own server
- [Connect your app](docs/getting-started/connect-your-app.md): install the RevenueDot SDK, or, when you switch from RevenueCat, keep its SDK and change one line
- [SDK guides](docs/sdks/README.md): the RevenueDot SDK for every platform
- [Migrate from RevenueCat](docs/migrate/README.md)
- [API reference](api/README.md), generated from [api/openapi.yaml](api/openapi.yaml)
- [Help center](docs/help/README.md) and [blog](blog/README.md)
- For AI assistants: [llms.txt](llms.txt), [llms-full.txt](llms-full.txt) and one file per section in `llms/`, for example [llms/api.txt](llms/api.txt)

## Layout
```
docs/
  getting-started/   what RevenueDot is, quickstart, connecting an app
  concepts/          projects and apps, products and entitlements, offerings, customers, events, sandbox
  sdks/              one guide per SDK (10)
  guides/            App Store, Google Play, webhooks, Trusted Entitlements, Test Store, self-hosting
  migrate/           from RevenueCat: importer, dual run, SDK changes, cutover, differences
  help/              one article per question people search
api/                 API reference: openapi.yaml and the pages generated from it
blog/                posts
llms.txt, llms/, llms-full.txt   generated from the pages for AI assistants
scripts/             the generators and checks below
```

## Scripts
Needs Node.js 20+ (CI uses 24) and, for the drift check, a checkout of [revenuedot/revenuedot](https://github.com/revenuedot/revenuedot) next to this repo (or `REVENUEDOT_SERVER_DIR`).

```bash
npm install
npm run build      # api/openapi.yaml, api/*.md, llms.txt, llms/, llms-full.txt
npm run check      # OpenAPI validation, drift against the server code, page frontmatter, links and anchors
```

| Script | What it does |
|---|---|
| `build:openapi` | Writes `api/openapi.yaml` (OpenAPI 3.1) from `scripts/openapi/*.mjs` |
| `build:api` | Writes the API reference pages in `api/` from `api/openapi.yaml` |
| `build:llms` | Writes `llms.txt`, `llms/<section>.txt` and `llms-full.txt` from every page's frontmatter and text |
| `lint:openapi` | Validates `api/openapi.yaml` with swagger-parser and Redocly |
| `check:drift` | Fails when an endpoint, a source file or a field name in `api/openapi.yaml` does not match the server's route files |
| `check:pages` | Fails when a page lacks a title or description, or its H1 differs from the title |
| `check:links` | Fails on a broken internal link or anchor (`node scripts/check-links.mjs --external` also fetches external links) |

## Writing rules
Question-style titles, one topic per page, the answer first, code before prose, real responses, stable URLs. Every page starts with frontmatter (`title`, `description`). Plain English: active voice, one idea per sentence, no jargon. Write for a developer who has never heard of RevenueCat: lead with the RevenueDot SDK, and put switching from RevenueCat in a marked "Switching from RevenueCat?" note. When you describe compatibility, say "works with the RevenueCat SDK"; never imply an affiliation. Every claim about RevenueCat or another vendor links to its source. Every blog post ends with the same "About RevenueDot" paragraph. API reference pages are generated: edit `scripts/openapi/*.mjs`, then run `npm run build`.

## Use with your coding agent

Coding agents can read this repository on demand, so they use the right package, imports and API:

- **Context7:** https://context7.com/revenuedot/docs
- **DeepWiki:** https://deepwiki.com/revenuedot/docs
- **GitMCP:** https://gitmcp.io/revenuedot/docs

## License
Text CC BY 4.0, code samples MIT. See [LICENSE](LICENSE).

[Website](https://revenuedot.app) · [Server](https://github.com/revenuedot/revenuedot) · [Examples](https://github.com/revenuedot/examples)

<sub>RevenueDot is not affiliated with, endorsed by or sponsored by RevenueCat, Inc. "RevenueCat" is a trademark of RevenueCat, Inc., used here only to describe compatibility.</sub>

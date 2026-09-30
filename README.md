# RevenueDot docs

**Open documentation for [RevenueDot](https://revenuedot.app), the open-source, self-hostable backend for in-app purchases that works with the RevenueCat SDK.** Everything here is public Markdown: getting started, concepts, SDK guides, store setup, webhooks, self-hosting, migration from RevenueCat, the API reference, a help center and a blog.

> Every page says what works today and what is planned.

## Start here
- [What is RevenueDot?](docs/getting-started/README.md) and the [5-minute quickstart](docs/getting-started/quickstart.md)
- [Connect your app](docs/getting-started/connect-your-app.md): proxy mode, fork packages, or your existing keys
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
Needs Node.js 20+ and, for the drift check, a checkout of [revenuedot/revenuedot](https://github.com/revenuedot/revenuedot) next to this repo (or `REVENUEDOT_SERVER_DIR`).

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
Question-style titles, one topic per page, the answer first, code before prose, real responses, stable URLs. Every page starts with frontmatter (`title`, `description`). Plain English: active voice, one idea per sentence, no jargon. Say "works with the RevenueCat SDK"; never imply an affiliation. Every claim about RevenueCat or another vendor links to its source. Every blog post ends with the same "About RevenueDot" paragraph. API reference pages are generated: edit `scripts/openapi/*.mjs`, then run `npm run build`.

## License
Text CC BY 4.0, code samples MIT. See [LICENSE](LICENSE).

[Website](https://revenuedot.app) · [Server](https://github.com/revenuedot/revenuedot) · [Examples](https://github.com/revenuedot/examples)

<sub>RevenueDot is not affiliated with, endorsed by or sponsored by RevenueCat, Inc. "RevenueCat" is a trademark of RevenueCat, Inc., used here only to describe compatibility.</sub>

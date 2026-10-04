# AGENTS.md

Public documentation for RevenueDot. Follow `prd/ecosystem/PRD.md` in revenuedot/revenuedot.

- **API reference pages are generated, never hand-edited.** Edit `scripts/openapi/*.mjs` (the OpenAPI source), then `npm run build`. `npm run check:drift` compares the document with the server's route files in `../revenuedot`; fix the spec whenever the server changes.
- **Every page has frontmatter** (`title`, `description`) and one H1 equal to the title. `npm run check:pages` enforces it.
- **Error pages are generated from `data/errors/*.json`, never hand-edited.** `docs/errors/*.md` has one page per Apple StoreKit 2 error, Google Play Billing response code and purchases SDK error code. Edit the data file, run `npm run build`; `npm run check:errors` is the quality gate (source link, code block, cause, fix, a unique one-sentence answer, 170 words minimum, and no drift from the data file). A thin entry is not generated. Take causes only from the vendor's page or the SDK source and link it; never invent one. Swift snippets are type-checked on a Mac with `npm run check:snippets`; Kotlin snippets are marked "Not compiled".
- **Keep `llms.txt`, `llms/` and `llms-full.txt` in sync**: run `npm run build:llms` after any page change. A new folder of pages needs a section in `scripts/gen-llms.mjs`.
- **Before committing:** `npm run build && npm run check` must pass. A push to `main` deploys revenuedot.app (`.github/workflows/deploy-site.yml`), so check that the site renders the pages too: `pnpm --filter site build && pnpm --filter site check` in `../revenuedot`.
- Every claim about RevenueCat or another vendor needs a source link. Never copy RevenueCat's docs text or anything from revenuedot/company.
- Record progress in `docs/STATUS.md` in revenuedot/revenuedot. Private material goes to revenuedot/company.

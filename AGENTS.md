# AGENTS.md

Public documentation for RevenueDot. Follow `prd/ecosystem/PRD.md` in revenuedot/revenuedot.

- **API reference pages are generated, never hand-edited.** Edit `scripts/openapi/*.mjs` (the OpenAPI source), then `npm run build`. `npm run check:drift` compares the document with the server's route files in `../revenuedot`; fix the spec whenever the server changes.
- **Every page has frontmatter** (`title`, `description`) and one H1 equal to the title. `npm run check:pages` enforces it.
- **Keep `llms.txt`, `llms/` and `llms-full.txt` in sync**: run `npm run build:llms` after any page change. A new folder of pages needs a section in `scripts/gen-llms.mjs`.
- **Before committing:** `npm run build && npm run check` must pass.
- Every claim about RevenueCat or another vendor needs a source link. Never copy RevenueCat's docs text or anything from revenuedot/company.
- Record progress in `docs/STATUS.md` in revenuedot/revenuedot. Private material goes to revenuedot/company.

// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: generates docs/errors/*.md (one page per store or SDK error) from data/errors/*.json. Run: npm run build:errors
// Docs: https://revenuedot.app/docs/errors   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
//
// A page with thin content (under MIN_WORDS words) is not generated. Mark an unfinished entry "draft": true to skip it
// on purpose; without that flag a thin entry fails the build, so nothing thin ships by accident.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GENERATED, MIN_WORDS, OUT_DIR, loadData, renderIndex, renderPage, validateEntry, wordCount } from "./lib/errors.mjs";

const sets = loadData();
const all = sets.flatMap((s) => s.pages);
const bySlug = new Map(all.map((p) => [p.slug, p]));
const problems = [];
if (bySlug.size !== all.length) problems.push("duplicate slugs in data/errors");
const slugs = new Set(all.filter((p) => !p.draft).map((p) => p.slug));
const rendered = [];
const skipped = [];
for (const p of all) {
  if (p.draft) { skipped.push(`${p.slug} (draft)`); continue; }
  const bad = validateEntry(p, slugs);
  if (bad.length) { problems.push(`${p.file} ${p.slug}: ${bad.join("; ")}`); continue; }
  const md = renderPage(p, bySlug);
  const words = wordCount(md);
  if (words < MIN_WORDS) { problems.push(`${p.file} ${p.slug}: thin page (${words} words, minimum ${MIN_WORDS}). Add real content or set "draft": true`); continue; }
  rendered.push({ p, md });
}
if (problems.length) {
  console.error(`${problems.length} problem(s) in data/errors:\n${problems.map((x) => `  - ${x}`).join("\n")}`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
const keep = new Set(rendered.map(({ p }) => `${p.slug}.md`).concat("README.md"));
for (const f of readdirSync(OUT_DIR)) {
  // Only files this script wrote are removed; a hand-written page in the folder is left alone (and flagged by check:errors).
  if (!keep.has(f) && readFileSync(join(OUT_DIR, f), "utf8").includes(GENERATED)) rmSync(join(OUT_DIR, f));
}
for (const { p, md } of rendered) writeFileSync(join(OUT_DIR, `${p.slug}.md`), md);
writeFileSync(join(OUT_DIR, "README.md"), renderIndex(rendered.map(({ p }) => p)));
console.log(`errors: ${rendered.length} pages written to docs/errors/${skipped.length ? `; skipped ${skipped.join(", ")}` : ""}.`);

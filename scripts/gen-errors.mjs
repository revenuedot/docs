// RevenueDot: the open-source RevenueCat alternative. Same SDK API, free to start on RevenueDot Cloud.
// This file: generates the reference pages (docs/errors, docs/notifications, docs/webhooks, one page per entry) from data/<family>/*.json. Run: npm run build:errors
// Docs: https://revenuedot.app/docs/errors   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
//
// A page with thin content (under MIN_WORDS words) is not generated. Mark an unfinished entry "draft": true to skip it
// on purpose; without that flag a thin entry fails the build, so nothing thin ships by accident.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GENERATED, KINDS, MIN_WORDS, loadData, outDir, renderIndex, renderPage, validateEntry, wordCount } from "./lib/errors.mjs";

const sets = loadData();
const all = sets.flatMap((s) => s.pages);
const bySlug = new Map(all.map((p) => [p.slug, p]));
const problems = [];
if (bySlug.size !== all.length) problems.push("duplicate slugs across data/errors, data/notifications and data/webhooks");
const slugs = new Set(all.filter((p) => !p.draft).map((p) => p.slug));
const rendered = [];
const skipped = [];
for (const p of all) {
  if (p.draft) { skipped.push(`${p.slug} (draft)`); continue; }
  const bad = validateEntry(p, slugs);
  if (bad.length) { problems.push(`${p.kind}/${p.file} ${p.slug}: ${bad.join("; ")}`); continue; }
  const md = renderPage(p, bySlug);
  const words = wordCount(md);
  if (words < MIN_WORDS) { problems.push(`${p.kind}/${p.file} ${p.slug}: thin page (${words} words, minimum ${MIN_WORDS}). Add real content or set "draft": true`); continue; }
  rendered.push({ p, md });
}
if (problems.length) {
  console.error(`${problems.length} problem(s) in the reference data:\n${problems.map((x) => `  - ${x}`).join("\n")}`);
  process.exit(1);
}

const counts = [];
for (const kind of KINDS) {
  const mine = rendered.filter(({ p }) => p.kind === kind.id);
  if (!mine.length) continue;
  const dir = outDir(kind);
  mkdirSync(dir, { recursive: true });
  const keep = new Set(mine.map(({ p }) => `${p.slug}.md`).concat("README.md"));
  for (const f of readdirSync(dir)) {
    // Only files this script wrote are removed; a hand-written page in the folder is left alone (and flagged by check:errors).
    if (!keep.has(f) && readFileSync(join(dir, f), "utf8").includes(GENERATED)) rmSync(join(dir, f));
  }
  for (const { p, md } of mine) writeFileSync(join(dir, `${p.slug}.md`), md);
  writeFileSync(join(dir, "README.md"), renderIndex(kind, mine.map(({ p }) => p)));
  counts.push(`${mine.length} in docs/${kind.id}/`);
}
console.log(`reference pages: ${rendered.length} written (${counts.join(", ")})${skipped.length ? `; skipped ${skipped.join(", ")}` : ""}.`);

// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: fails when a published page lacks frontmatter (title, description), when its H1 differs from the title,
// or when a blog post lacks the standard closing paragraph. Run: npm run check:pages
// Docs: https://revenuedot.app/docs   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { pages, proseLines, readPage } from "./lib/pages.mjs";

export const ABOUT = "**About RevenueDot.** RevenueDot is an open-source (AGPL-3.0), self-hostable backend for in-app purchases and subscriptions that works with the RevenueCat SDK.";
const problems = [];
const list = pages();
for (const rel of list) {
  const { meta, body, error } = readPage(rel);
  if (error) { problems.push(`${rel}: frontmatter is not valid YAML: ${error}`); continue; }
  if (!meta) { problems.push(`${rel}: no frontmatter (--- title, description ---)`); continue; }
  for (const k of ["title", "description"]) {
    if (typeof meta[k] !== "string" || !meta[k].trim()) problems.push(`${rel}: frontmatter needs a non-empty ${k}`);
  }
  if (typeof meta.description === "string" && (meta.description.includes("\n") || meta.description.length > 300)) problems.push(`${rel}: description must be one line of at most 300 characters`);
  const h1 = proseLines(body).find(({ line }) => /^#\s/.test(line));
  if (!h1) problems.push(`${rel}: no H1`);
  else if (h1.line.replace(/^#\s+/, "").trim() !== String(meta.title).trim()) problems.push(`${rel}: H1 "${h1.line.slice(2)}" differs from the title "${meta.title}"`);
  const h1s = proseLines(body).filter(({ line }) => /^#\s/.test(line)).length;
  if (h1s > 1) problems.push(`${rel}: ${h1s} H1 headings; use one`);
  if (rel.startsWith("blog/") && !rel.endsWith("README.md")) {
    if (!meta.date) problems.push(`${rel}: blog posts need a date`);
    if (!body.trimEnd().split("\n").pop().startsWith(ABOUT)) problems.push(`${rel}: blog posts end with the standard "About RevenueDot" paragraph`);
  }
}
if (problems.length) {
  console.error(`${problems.length} page problem(s):\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(`Pages OK: ${list.length} pages have a title, a description and a matching H1.`);

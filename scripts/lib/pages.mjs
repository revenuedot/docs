// RevenueDot: the open-source RevenueCat alternative. Same SDK API, free to start on RevenueDot Cloud.
// This file: shared helpers for the docs scripts (find pages, read frontmatter, GitHub heading anchors).
// Docs: https://revenuedot.app/docs   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

export const ROOT = fileURLToPath(new URL("../..", import.meta.url));
/** Folders that hold published pages. */
export const PAGE_DIRS = ["docs", "api", "blog"];

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  if (f === "node_modules" || f.startsWith(".")) return [];
  return statSync(p).isDirectory() ? walk(p) : [p];
});

/** Every Markdown file in the repo, as paths relative to the root. */
export const allMarkdown = () => walk(ROOT).filter((f) => f.endsWith(".md")).map((f) => relative(ROOT, f)).sort();
/** Published pages: Markdown under docs/, api/ and blog/. */
export const pages = () => allMarkdown().filter((f) => PAGE_DIRS.includes(f.split("/")[0]));

export function readPage(rel) {
  const raw = readFileSync(join(ROOT, rel), "utf8");
  const m = /^---\n([\s\S]*?)\n---\n/.exec(raw);
  let meta = null, error = null;
  if (m) { try { meta = parse(m[1]); } catch (e) { error = e.message; } }
  const body = m ? raw.slice(m[0].length) : raw;
  return { raw, meta, body, error };
}

/** Lines outside fenced code blocks, with their 1-based numbers. */
export function proseLines(text) {
  const out = [];
  let fence = null;
  text.split("\n").forEach((line, i) => {
    const f = /^\s*(```+|~~~+)/.exec(line);
    if (f) { if (!fence) fence = f[1][0]; else if (f[1][0] === fence) fence = null; return; }
    if (!fence) out.push({ line, n: i + 1 });
  });
  return out;
}

/** GitHub's heading anchor for a heading's text. */
export function slug(text) {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[`*]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

/** Every anchor a page defines: headings (with GitHub's -1, -2 suffixes for repeats) and explicit <a id|name>. */
export function anchorsOf(text) {
  const seen = new Map();
  const out = new Set();
  for (const { line } of proseLines(text)) {
    const h = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (h) {
      const base = slug(h[1]);
      const n = seen.get(base) ?? 0;
      out.add(n ? `${base}-${n}` : base);
      seen.set(base, n + 1);
    }
    for (const a of line.matchAll(/<a\s+(?:id|name)="([^"]+)"/g)) out.add(a[1]);
  }
  return out;
}

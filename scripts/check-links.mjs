// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: fails on broken internal links and anchors in every Markdown file. Run: npm run check:links
// Docs: https://revenuedot.app/docs   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
//
// Checks relative links (files and folders) and #anchors against GitHub's heading anchors and <a id> tags.
// External links are counted, not fetched; pass --external to also request each one (slow, needs network).
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { ROOT, allMarkdown, anchorsOf, proseLines } from "./lib/pages.mjs";

const files = allMarkdown();
const anchorCache = new Map();
const anchors = (rel) => {
  if (!anchorCache.has(rel)) anchorCache.set(rel, anchorsOf(readFileSync(join(ROOT, rel), "utf8")));
  return anchorCache.get(rel);
};

const problems = [];
const external = new Map();
let internal = 0;
for (const file of files) {
  const text = readFileSync(join(ROOT, file), "utf8");
  for (const { line, n } of proseLines(text)) {
    const clean = line.replace(/`[^`]*`/g, "");
    for (const m of clean.matchAll(/!?\[(?:[^\]]|\][^(])*?\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)|<a\s+href="([^"]+)"/g)) {
      const target = m[1] ?? m[2];
      if (/^(https?:)?\/\//.test(target)) { if (!external.has(target)) external.set(target, `${file}:${n}`); continue; }
      if (/^(mailto|tel):/.test(target)) continue;
      internal++;
      const [pathPart, anchor] = target.split("#");
      let dest = pathPart ? normalize(join(dirname(file), decodeURIComponent(pathPart))) : file;
      if (dest.startsWith("..")) { problems.push(`${file}:${n}: ${target} points outside the repo`); continue; }
      const abs = join(ROOT, dest);
      if (!existsSync(abs)) { problems.push(`${file}:${n}: ${target} does not exist`); continue; }
      if (statSync(abs).isDirectory()) {
        if (!existsSync(join(abs, "README.md"))) { problems.push(`${file}:${n}: ${target} is a folder without README.md`); continue; }
        dest = join(dest, "README.md");
      }
      if (anchor !== undefined && dest.endsWith(".md") && !anchors(relative(ROOT, join(ROOT, dest))).has(anchor)) {
        problems.push(`${file}:${n}: #${anchor} is not an anchor in ${dest}`);
      }
    }
  }
}

if (process.argv.includes("--external")) {
  for (const [url, where] of external) {
    try {
      const res = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(15_000), headers: { "user-agent": "revenuedot-docs-link-check" } });
      if (res.status >= 400 && res.status !== 403 && res.status !== 429) problems.push(`${where}: ${url} answered ${res.status}`);
    } catch (e) {
      problems.push(`${where}: ${url} failed: ${e.message}`);
    }
  }
}

if (problems.length) {
  console.error(`${problems.length} broken link(s):\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(`Links OK: ${internal} internal links and anchors in ${files.length} files; ${external.size} external links${process.argv.includes("--external") ? " checked" : " not fetched (use --external)"}.`);

// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: generates llms.txt (index), llms/<section>.txt (full text per section) and llms-full.txt from the Markdown pages.
// Docs: https://revenuedot.app/docs   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
//
// Every page's frontmatter gives its title and description. Relative links become absolute URLs so each page still
// works when an assistant reads it out of context. Run: npm run build:llms
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { ROOT, pages, readPage } from "./lib/pages.mjs";

/** Raw Markdown of the public repo: what an assistant can fetch today. */
const RAW = "https://raw.githubusercontent.com/revenuedot/docs/main";
const REPO = "https://github.com/revenuedot/docs/blob/main";

/** Sections in reading order. `order` lists pages first (by file name); the rest follow alphabetically. */
const SECTIONS = [
  { id: "getting-started", title: "Getting started", dir: "docs/getting-started", order: ["README.md", "quickstart.md", "connect-your-app.md"] },
  { id: "concepts", title: "Concepts", dir: "docs/concepts", order: ["README.md", "projects-and-apps.md", "products-and-entitlements.md", "offerings-and-packages.md", "customers-and-app-user-ids.md", "subscriptions-and-events.md", "sandbox.md"] },
  { id: "sdks", title: "SDK guides", dir: "docs/sdks", order: ["README.md", "ios.md", "android.md", "react-native.md", "flutter.md", "web.md", "capacitor.md", "kotlin-multiplatform.md", "unity.md", "cordova.md", "hybrid-common.md"] },
  { id: "guides", title: "Guides: stores, web billing, webhooks, integrations, self-hosting", dir: "docs/guides", order: ["README.md", "app-store.md", "google-play.md", "amazon-appstore.md", "stripe.md", "import-products.md", "web-billing.md", "purchase-links.md", "funnels.md", "redemption-links.md", "web-discounts.md", "custom-domains.md", "webhooks.md", "trusted-entitlements.md", "test-store.md", "sandbox-testing.md", "self-hosting.md", "upgrades.md", "backups.md", "move-projects.md", "cloud-billing.md", "going-to-production.md", "team.md", "alerts.md", "connect-ai-assistants.md", "revenuedot-ai.md", "paywalls.md", "targeting-and-experiments.md", "charts.md", "integrations.md", "ads.md", "win-back-offers.md", "offline-entitlements.md", "refund-control.md", "retention.md", "win-back-campaigns.md", "support-integrations.md", "customer-lists.md", "project-settings.md", "auth.md"] },
  { id: "migrate", title: "Migrate from RevenueCat", dir: "docs/migrate", order: ["README.md", "importer.md", "dual-run.md", "sdk-changes.md", "cutover-checklist.md", "what-differs.md"] },
  { id: "api", title: "API reference", dir: "api", order: ["README.md", "authentication.md", "errors.md", "sdk-endpoints.md", "rest-v1.md", "rest-v2.md", "extensions.md", "webhook-events.md"] },
  { id: "help", title: "Help center", dir: "docs/help", order: ["README.md", "faq.md", "troubleshooting.md", "known-issues.md"] },
  { id: "blog", title: "Blog", dir: "blog", order: ["README.md"] },
];

const INTRO = [
  "RevenueDot is an open-source backend for in-app purchases and subscriptions that works with the RevenueCat SDK.",
  "Start free on RevenueDot Cloud (https://app.revenuedot.app/signup, free up to $10,000 monthly tracked revenue) or self-host it. An app points the RevenueCat SDK's proxy URL at RevenueDot and keeps its purchase code, offerings and customers.",
  "It verifies App Store and Google Play purchases on the server, keeps each customer's entitlements current from store notifications, and sends webhooks in RevenueCat's payload format.",
  "On RevenueDot Cloud, apps use the API at https://api.revenuedot.app and people sign in to the dashboard at https://app.revenuedot.app/login. Self-hosted, RevenueDot runs as one Docker image plus Postgres. The server is AGPL-3.0. The SDK forks are MIT and keep RevenueCat's class and method names. RevenueDot is not affiliated with RevenueCat, Inc.",
];

const all = new Set(pages());
const url = (rel) => `${RAW}/${rel}`;

/** Makes relative links absolute (Markdown pages to their raw URL, other files to the GitHub view). */
function absolutize(rel, body) {
  let fence = false;
  return body.split("\n").map((line) => {
    if (/^\s*(```|~~~)/.test(line)) { fence = !fence; return line; }
    if (fence) return line;
    return line.replace(/(\]\()([^)\s#]*)(#[^)\s]*)?(\))/g, (m, open, path, hash = "", close) => {
      if (!path) return hash ? `${open}${url(rel)}${hash}${close}` : m;
      if (/^[a-z]+:/i.test(path)) return m;
      const target = normalize(join(dirname(rel), path));
      const resolved = target.endsWith("/") || !/\.[a-z0-9]+$/i.test(target) ? join(target, "README.md") : target;
      const abs = resolved.endsWith(".md") ? url(resolved) : `${REPO}/${resolved}`;
      return `${open}${abs}${hash}${close}`;
    });
  }).join("\n");
}

const clean = (body) => body.replace(/<!-- Generated by [^>]*-->\n*/g, "").replace(/<a id="[^"]+"><\/a>\n\n/g, "").trim();

const sections = SECTIONS.map((s) => {
  const inDir = [...all].filter((p) => dirname(p) === s.dir);
  for (const o of s.order) if (!inDir.includes(`${s.dir}/${o}`)) throw new Error(`${s.dir}/${o} is listed in gen-llms.mjs but does not exist`);
  const rest = inDir.filter((p) => !s.order.includes(p.slice(s.dir.length + 1))).sort();
  const list = [...s.order.map((o) => `${s.dir}/${o}`), ...rest];
  return { ...s, pages: list.map((rel) => ({ rel, ...readPage(rel) })) };
});
const covered = new Set(sections.flatMap((s) => s.pages.map((p) => p.rel)));
const missing = [...all].filter((p) => !covered.has(p));
if (missing.length) throw new Error(`Pages outside every llms section: ${missing.join(", ")}. Add their folder to SECTIONS.`);

// llms.txt: the index (llmstxt.org format), with one link per page and one per section shard.
const index = [
  "# RevenueDot", "",
  `> ${INTRO[0]} ${INTRO[1]}`, "",
  INTRO.slice(2).join(" "), "",
  "Every link below is the page's Markdown. Full text: [llms-full.txt](" + `${RAW}/llms-full.txt` + ") (everything), or one file per section under [llms/](" + `${REPO}/llms` + ").", "",
];
for (const s of sections) {
  index.push(`## ${s.title}`, "", `- [${s.title}: full text](${RAW}/llms/${s.id}.txt): every page of this section in one file`);
  for (const p of s.pages) index.push(`- [${p.meta.title}](${url(p.rel)}): ${p.meta.description}`);
  index.push("");
}
index.push("## Optional", "", `- [OpenAPI document](${RAW}/api/openapi.yaml): OpenAPI 3.1 for every endpoint and webhook event`,
  "- [Server repository](https://github.com/revenuedot/revenuedot): server, dashboard, importer (AGPL-3.0)",
  "- [Examples](https://github.com/revenuedot/examples): runnable apps, webhook backends and self-host recipes (MIT)",
  "- [SDK forks](https://github.com/revenuedot): MIT forks of all ten RevenueCat SDKs, for example [purchases-ios](https://github.com/revenuedot/purchases-ios)",
  "- [MCP server](https://github.com/revenuedot/mcp) (hosted at https://mcp.revenuedot.app/mcp) and [agent skills](https://github.com/revenuedot/agent-skills)", "");
writeFileSync(join(ROOT, "llms.txt"), index.join("\n"));

// Section shards and llms-full.txt.
const pageText = (p) => [`# ${p.meta.title}`, "", `Source: ${url(p.rel)}`, `Description: ${p.meta.description}`, "", absolutize(p.rel, clean(p.body).replace(/^#\s.*\n+/, "")), ""].join("\n");
const header = (title) => [`# ${title}`, "", ...INTRO.map((l) => `> ${l}`), "", `Generated from https://github.com/revenuedot/docs by scripts/gen-llms.mjs. Index: ${RAW}/llms.txt`, ""].join("\n");
rmSync(join(ROOT, "llms"), { recursive: true, force: true });
mkdirSync(join(ROOT, "llms"));
const full = [header("RevenueDot documentation (full text)")];
for (const s of sections) {
  const text = s.pages.map(pageText).join("\n---\n\n");
  writeFileSync(join(ROOT, "llms", `${s.id}.txt`), `${header(`RevenueDot documentation: ${s.title}`)}\n${text}`);
  full.push(`\n=== ${s.title} ===\n`, text);
}
writeFileSync(join(ROOT, "llms-full.txt"), full.join("\n"));
console.log(`llms.txt: ${covered.size} pages in ${sections.length} sections; llms/ has ${readdirSync(join(ROOT, "llms")).length} shards; llms-full.txt written.`);

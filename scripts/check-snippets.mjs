// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: type-checks the Swift snippets of the error pages with swiftc (macOS only), so a page that says "Compile-checked" is true.
// Snippets with check "swift" are checked against the Apple SDK; "swift-sdk" also against ErrorCode.swift of the purchases-ios fork.
// Run: npm run check:snippets   (the docs workflow on Linux skips it; run it on a Mac before changing a snippet)
// Docs: https://revenuedot.app/docs/errors   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ROOT } from "./lib/pages.mjs";
import { loadData } from "./lib/errors.mjs";

const swiftc = spawnSync("swiftc", ["--version"], { encoding: "utf8" });
const entries = loadData().flatMap((s) => s.pages).filter((p) => !p.draft && p.snippet?.check?.startsWith("swift"));
if (swiftc.status !== 0 || process.platform !== "darwin") {
  console.log(`Snippets: skipped, swiftc on macOS is needed to check ${entries.length} Swift snippets.`);
  process.exit(process.argv.includes("--require") ? 1 : 0);
}
const iosRepo = resolve(ROOT, process.env.PURCHASES_IOS_DIR ?? "../purchases-ios");
const errorCode = join(iosRepo, "Sources/Generated/ErrorCode.swift");
const tmp = mkdtempSync(join(tmpdir(), "rd-snippets-"));
const problems = [];
try {
  for (const p of entries) {
    const file = join(tmp, `${p.slug}.swift`);
    writeFileSync(file, p.snippet.code);
    // "target": "ios" checks against the iOS Simulator SDK (UIKit); the default is macOS 15.4.
    const ios = p.snippet.target === "ios";
    const sdk = ios ? spawnSync("xcrun", ["--sdk", "iphonesimulator", "--show-sdk-path"], { encoding: "utf8" }).stdout.trim() : "";
    const args = ["-typecheck", ...(ios ? ["-sdk", sdk, "-target", "arm64-apple-ios17.0-simulator"] : ["-target", "arm64-apple-macos15.4"]), file];
    if (p.snippet.check === "swift-sdk") {
      if (!existsSync(errorCode)) { problems.push(`${p.slug}: ${errorCode} not found (set PURCHASES_IOS_DIR to a purchases-ios checkout)`); continue; }
      args.push(errorCode);
    }
    const r = spawnSync("swiftc", args, { encoding: "utf8" });
    if (r.status !== 0) problems.push(`${p.slug}:\n${(r.stderr || r.stdout).split("\n").slice(0, 8).join("\n")}`);
  }
} finally { rmSync(tmp, { recursive: true, force: true }); }
if (problems.length) { console.error(`${problems.length} snippet(s) failed to compile:\n${problems.join("\n")}`); process.exit(1); }
console.log(`Snippets OK: ${entries.length} Swift snippets type-check.`);

// RevenueDot: the open-source RevenueCat alternative. Same SDK API, free to start on RevenueDot Cloud.
// This file: checks the snippets of the generated reference pages, so a page that says "Compile-checked" or "Run-checked" is true.
// "swift" snippets are type-checked with swiftc against the Apple SDK (macOS only); "swift-sdk" also against ErrorCode.swift of the purchases-ios fork.
// "node" snippets are run with Node (any platform) and their output must contain the entry's "expect" text.
// Run: npm run check:snippets   (the docs workflow on Linux skips the Swift ones; run them on a Mac before changing a snippet)
// Docs: https://revenuedot.app/docs/errors   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ROOT } from "./lib/pages.mjs";
import { loadData } from "./lib/errors.mjs";

const live = loadData().flatMap((s) => s.pages).filter((p) => !p.draft);
const nodeEntries = live.filter((p) => p.snippet?.check === "node");
const entries = live.filter((p) => p.snippet?.check?.startsWith("swift"));
const swiftc = spawnSync("swiftc", ["--version"], { encoding: "utf8" });
const haveSwift = swiftc.status === 0 && process.platform === "darwin";
if (!haveSwift) console.log(`Snippets: Swift skipped, swiftc on macOS is needed to check ${entries.length} Swift snippets.`);
if (!haveSwift && process.argv.includes("--require")) process.exit(1);
const iosRepo = resolve(ROOT, process.env.PURCHASES_IOS_DIR ?? "../purchases-ios");
const errorCode = join(iosRepo, "Sources/Generated/ErrorCode.swift");
const tmp = mkdtempSync(join(tmpdir(), "rd-snippets-"));
const problems = [];
const nodeTmp = mkdtempSync(join(tmpdir(), "rd-node-"));
try {
  for (const p of nodeEntries) {
    const file = join(nodeTmp, `${p.slug}.mjs`);
    writeFileSync(file, p.snippet.code);
    const r = spawnSync(process.execPath, [file], { encoding: "utf8", timeout: 20_000 });
    if (r.status !== 0) problems.push(`${p.slug}: node exited ${r.status}\n${(r.stderr || r.stdout).split("\n").slice(0, 8).join("\n")}`);
    else if (!r.stdout.includes(p.snippet.expect)) problems.push(`${p.slug}: output "${r.stdout.trim().slice(0, 200)}" does not contain "${p.snippet.expect}"`);
  }
  for (const p of haveSwift ? entries : []) {
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
} finally { rmSync(tmp, { recursive: true, force: true }); rmSync(nodeTmp, { recursive: true, force: true }); }
if (problems.length) { console.error(`${problems.length} snippet(s) failed to compile:\n${problems.join("\n")}`); process.exit(1); }
console.log(`Snippets OK: ${nodeEntries.length} Node snippets run${haveSwift ? `, ${entries.length} Swift snippets type-check` : ""}.`);

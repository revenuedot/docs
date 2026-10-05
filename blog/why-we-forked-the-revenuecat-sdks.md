---
title: Why we forked the RevenueCat SDKs
description: "RevenueDot maintains MIT forks of all ten RevenueCat SDKs. What the patches change, why every import name stays the same, and how one script keeps the forks in sync with upstream."
date: 2026-09-30
author: RevenueDot team
---

# Why we forked the RevenueCat SDKs

RevenueDot keeps MIT-licensed forks of all ten RevenueCat SDKs because a proxy URL can move an SDK's API calls but cannot change what is compiled into it. The forks change four things: the default API host, the response-signing key the SDK trusts, the registry names we publish under, and a few leaks where the stock SDK talks to RevenueCat even behind a proxy. They keep every name your code imports, so switching is a package change, not a code change. One script re-applies the patches after every upstream release.

You do not need the forks to use RevenueDot. The stock SDKs work in proxy mode today. The forks are for the gaps below, and they are not published to any package registry yet.

## What proxy mode cannot fix
Every RevenueCat SDK lets you set a proxy URL, and RevenueDot answers the calls that arrive there. That covers purchases, customer info, offerings and identity. Three things stay out of reach:
1. **The signing key.** Recent SDKs can verify that responses come from a server holding a known Ed25519 key. RevenueCat calls this Trusted Entitlements ([RevenueCat docs](https://www.revenuecat.com/docs/customers/trusted-entitlements)). The key is compiled into the SDK, and it is RevenueCat's. Against any other server, verification reads `FAILED`.
2. **Traffic that ignores the proxy.** The stock Android SDK sends diagnostics, paywall events and ad events to RevenueCat's hosts even when a proxy URL is set. The stock purchases-js sends analytics events to RevenueCat's events host.
3. **Platforms where the proxy does not work.** On Flutter web, the stock SDK ignores `setProxyURL`: the Dart API sends a message the web plugin does not handle.

We could not fix any of these from the server. So we forked.

## Ten repositories, full history
The ten forks are [purchases-ios](https://github.com/revenuedot/purchases-ios), [purchases-android](https://github.com/revenuedot/purchases-android), [purchases-hybrid-common](https://github.com/revenuedot/purchases-hybrid-common), [react-native-purchases](https://github.com/revenuedot/react-native-purchases), [purchases-flutter](https://github.com/revenuedot/purchases-flutter), [purchases-js](https://github.com/revenuedot/purchases-js), [purchases-capacitor](https://github.com/revenuedot/purchases-capacitor), [purchases-kmp](https://github.com/revenuedot/purchases-kmp), [purchases-unity](https://github.com/revenuedot/purchases-unity) and [cordova-plugin-purchases](https://github.com/revenuedot/cordova-plugin-purchases).

Each is a hard fork with the full history and tags, created on 2026-09-30 from upstream `main`. Every upstream `LICENSE` keeps RevenueCat's MIT notice unchanged, and we add one line after it for our changes. Each README opens with a banner that says it is a fork maintained by RevenueDot and not affiliated with RevenueCat.

## Keep what code imports, rename what a registry owns
The rule for names is short: **a name stays when changing it would break app code, and a name changes when it is a registry entry RevenueCat owns.** We cannot publish into RevenueCat's CocoaPods pods, Maven group or npm scope, and we do not want to. Our builds must be easy to tell apart from theirs.

| Platform | Published as (planned) | Stays the same in your code |
|---|---|---|
| iOS | CocoaPods `RevenueDotPurchases`; SPM from our repo, tags `<version>-revenuedot` | `import RevenueCat` |
| Android | Maven `app.revenuedot.purchases:purchases` | `com.revenuecat.purchases.*` |
| React Native | npm `@revenuedot/react-native-purchases` | `import Purchases from "react-native-purchases"`, through an npm alias |
| Flutter | git dependency, tags `<version>-revenuedot` | `package:purchases_flutter` |
| Web | npm `@revenuedot/purchases-js` | `@revenuecat/purchases-js`, through an npm alias |
| Capacitor | npm `@revenuedot/purchases-capacitor` | installed under the alias `@revenuecat/purchases-capacitor`, so Capacitor's generated native names stay |
| Kotlin Multiplatform | Maven `app.revenuedot.purchases:purchases-kmp-core` | `com.revenuecat.purchases.kmp.*` |
| Unity | OpenUPM `com.revenuedot.purchases-unity` | `using RevenueCat;` |
| Cordova | npm `@revenuedot/cordova-plugin-purchases` | plugin id `cordova-plugin-purchases` and the global `Purchases` |

The npm alias is what makes the swap free on JavaScript platforms. For React Native it is one line in `package.json`:

```json
{
  "dependencies": {
    "react-native-purchases": "npm:@revenuedot/react-native-purchases@10.10.2"
  }
}
```

Every file that says `import Purchases from "react-native-purchases"` keeps working. The fork's version number is the upstream version it is built on, so `10.10.2` is RevenueCat's 10.10.2 plus our patches.

We thought hard about renaming the Swift module and the Kotlin packages too. It would have broken every app file and every guide written for the RevenueCat SDK, so we kept them as code-compatibility identifiers. Our products are named RevenueDot, and we never use RevenueCat's logo.

## What the patches change
**Hosts.** Every RevenueCat host in shipped code points at `https://api.revenuedot.app`. That includes the main API, the fallback hosts, diagnostics, paywall and ad events, and purchases-js's API and events hosts. `setProxyURL` still overrides all of them, so self-hosters keep setting their own URL. The hosted API at that address, RevenueDot Cloud, is live.

**The signing key.** The iOS and Android forks trust RevenueDot's Ed25519 public key instead of RevenueCat's, so Trusted Entitlements verify against RevenueDot. A self-hosted server cannot sign with our key, so self-hosters either keep verification off or build the forks with their own key, one command in the pipeline:

```bash
pnpm tsx scripts/forks/apply.ts --var apiHost=https://iap.example.com --var signingPublicKey=<your key>
```

**Four small behaviour patches**, each closing a proxy-mode leak:
1. Android: diagnostics, paywall events and ad events honour the proxy URL.
2. purchases-js: analytics events honour `httpConfig.proxyURL`.
3. Flutter web: `setProxyURL` works.
4. purchases-js checkout: "Secure checkout by RevenueCat" reads "Secure checkout by RevenueDot", in all 34 locales.

**Packaging.** Registry names, the dependency pins between forks, so our React Native pulls our hybrid-common, which pulls our iOS and Android, and the package metadata with the fork notice.

**What we do not change:** class names, method names, API key prefixes such as `appl_` and `goog_`, and log strings. Keeping the prefixes means the web SDK's key check passes against our server unchanged.

## How the forks keep up with upstream
RevenueCat ships SDK releases often, and a fork that falls behind is worse than no fork. So the patches are not hand-made commits. They are rules, and one script applies them.

Each fork has three branches:
- `main` is upstream `main` at fork time plus a one-line notice. The pipeline never pushes to it.
- `revenuedot/main-patches` is `main` plus exactly one pipeline commit. We build and publish from it.
- `upstream-sync` is where new upstream releases get merged.

The rules live in `scripts/forks/rules/<repo>.json` in the [server repository](https://github.com/revenuedot/revenuedot). They are string and regex replacements, JSON edits, renames, license lines and banners. The sync script fetches upstream and its tags, merges them into `upstream-sync` with conflicts resolved to upstream, re-applies the rules, runs each fork's checks, and opens a pull request into `revenuedot/main-patches`.

Two properties keep this safe:
- **Every rule is idempotent and loud.** Running the pipeline twice changes nothing the second time. A rule whose target moved upstream fails with "Rule did not match … update the rule" instead of skipping quietly.
- **A leak scan runs last.** It fails the repository if any RevenueCat API host, events host, fallback host, asset CDN or RevenueCat's signing key is left in shipped code. It is clean on all ten forks today.

We also run the forked web SDK end to end against a real RevenueDot server. It configures with a proxy URL, reads customer info and offerings, buys through the Test Store, and sees the `pro` entitlement active. Every call, analytics included, went to our server, and a signed response verified with the key baked into the fork.

## What is not done yet
- **Publishing.** None of the forks is on npm, CocoaPods, Maven Central or OpenUPM yet. That needs registry accounts and signing keys.
- **CI.** The sync runs by hand today. A daily job is next.
- **Legal review.** We want counsel to confirm the naming approach before the first public release.
- **The web paywall renderer.** purchases-js still pulls RevenueCat's paywall UI package at build time.

Until the forks are published, use the stock RevenueCat SDK with a proxy URL, and turn its signature check off. [Connect your app](../docs/getting-started/connect-your-app.md) shows both paths for every platform.

**About RevenueDot.** RevenueDot is an open-source (AGPL-3.0) backend for in-app purchases and subscriptions that works with the RevenueCat SDK. Start for free on [RevenueDot Cloud](https://app.revenuedot.app/signup): Pro costs $0 until your apps make $10,000 a month, then 0.5% of revenue above $10,000, never more than $999 a month. Point the SDK's proxy URL at RevenueDot and keep your app code, your offerings and your customers. Read the [quickstart](../docs/getting-started/quickstart.md) or the code on [GitHub](https://github.com/revenuedot/revenuedot).

---
title: How do I connect my app to RevenueDot?
description: Three ways. Proxy mode sets one URL in the RevenueCat SDK you already ship. The RevenueDot fork swaps the package. The importer keeps your existing RevenueCat API keys working.
---

# How do I connect my app to RevenueDot?

Set the RevenueCat SDK's proxy URL to RevenueDot (`https://api.revenuedot.app` for RevenueDot Cloud, or your own server) and turn its signature check off. That is **proxy mode**, and it works today with every SDK. Later you can swap in the **RevenueDot fork** of the SDK, which verifies RevenueDot's response signatures. When you migrate, the importer lets old app versions keep their **existing RevenueCat API keys**.

| Way | What you change in the app | What you get | Status (2026-09-30) |
|---|---|---|---|
| [Proxy mode](#proxy-mode-one-setting-in-the-sdk-you-already-ship) | One setting: the proxy URL, plus the verification mode | Every SDK call goes to your server | Works with all 10 SDKs |
| [Fork packages](#fork-packages-a-package-swap-no-code-change) | The package name in your dependency file | Signed responses verify; no traffic to RevenueCat's hosts | Forked and patched; not on package registries yet |
| [Keep your RevenueCat keys](#keep-your-revenuecat-api-keys) | Nothing | App versions already in users' hands keep working | Works (importer) |

## Proxy mode: one setting in the SDK you already ship
```swift
// iOS. Point the SDK at your RevenueDot server; nothing else in the app changes.
Purchases.proxyURL = URL(string: "https://revenuedot.example.com")!
Purchases.configure(with: Configuration.Builder(withAPIKey: "appl_...").with(entitlementVerificationMode: .disabled).build())
```
```kotlin
// Android. Point the SDK at your RevenueDot server; nothing else in the app changes.
Purchases.proxyURL = URL("https://revenuedot.example.com")
Purchases.configure(PurchasesConfiguration.Builder(context, "goog_...").entitlementVerificationMode(EntitlementVerificationMode.DISABLED).build())
```
```ts
// React Native and Expo. Point the SDK at your RevenueDot server; nothing else in the app changes.
await Purchases.setProxyURL("https://revenuedot.example.com");
Purchases.configure({ apiKey: Platform.OS === "ios" ? "appl_..." : "goog_..." });
```

- **Set the proxy URL before `configure`.** The SDK reads it once. For RevenueDot Cloud it is `https://api.revenuedot.app`.
- **Turn entitlement verification off.** The stock SDK checks responses against RevenueCat's signing key. RevenueDot cannot sign with that key, so iOS and Android would report every response as `FAILED` in their default informational mode. Access still works, but the logs fill with errors. See [Trusted Entitlements](../guides/trusted-entitlements.md).
- **Use the keys RevenueDot gives each app** (`appl_`, `goog_`, `test_` ...), or keep your RevenueCat keys as described below.
- **Known limits.** The stock Android SDK still sends diagnostics, paywall events and ad events to RevenueCat's hosts. The stock purchases-js sends analytics to RevenueCat unless you set `flags: { collectAnalyticsEvents: false }`. Flutter's web build ignores the proxy URL.

Every SDK's exact call is in its guide: [iOS](../sdks/ios.md), [Android](../sdks/android.md), [React Native](../sdks/react-native.md), [Flutter](../sdks/flutter.md), [Web](../sdks/web.md), [Capacitor](../sdks/capacitor.md), [Kotlin Multiplatform](../sdks/kotlin-multiplatform.md), [Unity](../sdks/unity.md), [Cordova](../sdks/cordova.md).

## Fork packages: a package swap, no code change
RevenueDot maintains MIT forks of all ten RevenueCat SDKs. They keep every name your code imports (`import RevenueCat`, `com.revenuecat.purchases.*`, `package:purchases_flutter`), so the swap is a dependency change. Each fork:

- trusts RevenueDot's response-signing key, so entitlement verification reports `VERIFIED` against a server that signs;
- sends diagnostics and events to the proxy URL too (Android, purchases-js), and makes the proxy URL work on Flutter web;
- defaults to `https://api.revenuedot.app` (RevenueDot Cloud), so Cloud projects need no proxy URL and self-hosters still set theirs.

```jsonc
// package.json (React Native): the alias keeps `import Purchases from "react-native-purchases"` working.
"react-native-purchases": "npm:@revenuedot/react-native-purchases@10.10.2"
```

The forks are not on npm, Maven Central, CocoaPods or OpenUPM yet. Each SDK guide gives the planned package name and how to use the fork's `revenuedot/main-patches` branch today. **A self-hosted server signs with its own key**, so the official forks only verify against RevenueDot Cloud. To verify against your own server, build the forks with your key; see [Trusted Entitlements](../guides/trusted-entitlements.md#verify-against-your-own-server).

## Keep your RevenueCat API keys
Apps already in the store send their RevenueCat public key (`appl_...`, `goog_...`). The [importer](../migrate/importer.md) sets each RevenueDot app's public key to that same string, so old app versions work against RevenueDot the moment you point traffic at it. You can also do it for one app with the API:

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/import/apps/$APP_ID/public_key" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"public_key":"appl_YourExistingRevenueCatKey"}'
```

Old app versions still call RevenueCat's API until they update, because the proxy URL lives in the app. That is why a migration runs both systems side by side for a while. See [Migrate from RevenueCat](../migrate/README.md).

## Which should I pick?
- **Trying RevenueDot or self-hosting:** proxy mode with verification off.
- **You rely on entitlement verification:** fork packages, built with your server's key when you self-host.
- **Moving a live app:** proxy mode in the next release, your RevenueCat keys through the importer, and a [dual run](../migrate/dual-run.md) until most users have updated.

## Related
- [Quickstart](quickstart.md)
- [SDK guides](../sdks/README.md)
- [Which key goes where](../concepts/projects-and-apps.md#which-key-goes-where)
- [Why we forked the RevenueCat SDKs](../../blog/why-we-forked-the-revenuecat-sdks.md)

---
title: Which RevenueCat SDKs work with RevenueDot?
description: All nine RevenueCat app SDKs work with RevenueDot in proxy mode today. Set the proxy URL and turn off signature checks. RevenueDot forks are released for iOS, Android, web, Flutter, Kotlin Multiplatform and Unity.
---

# Which RevenueCat SDKs work with RevenueDot?

All nine RevenueCat app SDKs work with RevenueDot today in **proxy mode**: you keep the SDK you ship, set one proxy URL before `configure`, and turn off signature checks. RevenueDot also keeps a fork of each SDK repo (ten in total, counting the shared hybrid layer). The forks keep every import name. **iOS, Android, web, Flutter, Kotlin Multiplatform and Unity forks are released; React Native, Capacitor and Cordova wait for their first npm release** (2026-10-02).

## Pick a mode
- **Proxy mode** works now. It is one setting in your app. The stock SDK checks response signatures against RevenueCat's key, so every RevenueDot response reads as "verification failed" unless you turn the check off. See [Trusted Entitlements](../guides/trusted-entitlements.md).
- **Fork packages** replace the stock package without code changes. They trust RevenueDot's signing key and send every request, including analytics and diagnostics, to your server.
- **Keep your RevenueCat keys**: the [importer](../migrate/importer.md) copies each app's public key into RevenueDot, so builds you already shipped keep the same `appl_` or `goog_` key. See [Connect your app](../getting-started/connect-your-app.md).

## Every SDK at a glance
| SDK | Proxy mode today | How to set the proxy URL | Signature check default (stock SDK) | Fork package | Guide |
|---|---|---|---|---|---|
| iOS, macOS, tvOS, watchOS, visionOS | Yes | `Purchases.proxyURL = URL(string: "...")!` | Informational: logs a failure, still grants access. Set `.disabled` | CocoaPods `RevenueDotPurchases` 5.91.0, SPM `github.com/revenuedot/purchases-ios` at `5.91.0-revenuedot` | [iOS](ios.md) |
| Android | Yes. Diagnostics, paywall events and ad events still go to RevenueCat | `Purchases.proxyURL = URL("...")` | Informational. Set `DISABLED` | Maven `app.revenuedot.purchases:purchases:10.23.3` | [Android](android.md) |
| React Native and Expo | Yes, on iOS, Android, Expo Go and web | `await Purchases.setProxyURL("...")` | Disabled | npm `@revenuedot/react-native-purchases` 10.10.2 (first npm release pending) | [React Native](react-native.md) |
| Flutter | Yes on iOS and Android. **Not on Flutter web** with the stock SDK | `await Purchases.setProxyURL('...')` | Disabled | git `github.com/revenuedot/purchases-flutter` at `10.13.2-revenuedot` (web included) | [Flutter](flutter.md) |
| Web (purchases-js) | Yes, with Test Store (`test_`) keys only | `httpConfig: { proxyURL: "..." }` in `configure` | No signature checks | npm `@revenuedot/purchases-js` 1.67.0 | [Web](web.md) |
| Capacitor and Ionic | Yes | `await Purchases.setProxyURL({ url: "..." })` | No default passed, so the native informational default applies. Pass `DISABLED` | npm `@revenuedot/purchases-capacitor` 13.6.1 (first npm release pending) | [Capacitor](capacitor.md) |
| Kotlin Multiplatform | Yes | `Purchases.proxyURL = "..."` (a `String`) | Disabled | Maven `app.revenuedot.purchases:purchases-kmp-core:3.10.1` | [Kotlin Multiplatform](kotlin-multiplatform.md) |
| Unity | Yes | The **Proxy URL** field on the Purchases component | Informational. Set **Disabled** in the Inspector | OpenUPM `com.revenuedot.purchases-unity` 9.11.1, or git `github.com/revenuedot/purchases-unity` at `9.11.1-revenuedot` | [Unity](unity.md) |
| Cordova | Yes | `Purchases.setProxyURL("...")` before `configureWith` | No option: logs a failure, still grants access | npm `@revenuedot/cordova-plugin-purchases` 8.2.3 (first npm release pending) | [Cordova](cordova.md) |
| purchases-hybrid-common | Not installed by apps | Wrappers pass the proxy URL through it | Wrappers pass the mode through it | pods `RevenueDotPurchasesHybridCommon`, Maven `app.revenuedot.purchases:purchases-hybrid-common`, both 19.4.1 | [Hybrid common](hybrid-common.md) |

**Never use `ENFORCED` mode with a stock SDK against RevenueDot.** Every call would fail, because RevenueDot cannot sign with RevenueCat's key.

## What the forks change
Each fork lives in `github.com/revenuedot/<repo>`. Releases are upstream release tags plus one patch commit, tagged `<upstream version>-revenuedot`; the branch `revenuedot/main-patches` follows upstream `main`. The patches change only these things:
- The default API host becomes `https://api.revenuedot.app`, which is RevenueDot Cloud (live since 2026-09-30). Self-hosters still set the proxy URL.
- The SDK trusts RevenueDot's response-signing key instead of RevenueCat's.
- Registry names change (table above). Module and package names that your code imports stay the same, so `import RevenueCat` and `com.revenuecat.purchases.*` still work.
- Android: diagnostics, paywall events and ad events follow the proxy URL.
- purchases-js: analytics events follow `httpConfig.proxyURL`, and checkout reads "Secure checkout by RevenueDot".
- Flutter web: `Purchases.setProxyURL` works.
- Each README gets a banner saying the fork is maintained by RevenueDot and not affiliated with RevenueCat.

Source: [`prd/sdk-forks/PRD.md`](https://github.com/revenuedot/revenuedot/blob/main/prd/sdk-forks/PRD.md).

## What is tested today
- Each released fork was installed the way an app installs it and checked against a RevenueDot server (2026-10-02). Web purchases-js from npm, Flutter web from its git tag and the React Native release package on the web each bought a Test Store subscription, and the server shows `pro` active. iOS apps built with the published pods and Swift packages (Flutter, Capacitor, Cordova) carry `api.revenuedot.app` and RevenueDot's signing key, and no RevenueCat host. The Android artifacts on Maven Central and the Kotlin Multiplatform iOS library do the same.
- The unmodified RevenueCat iOS SDK 5.92 on an iPhone simulator and Android SDK 10.24 on an Android emulator pass configure, customer info, offerings, a Test Store purchase and `logIn` against RevenueDot ([`scripts/e2e`](https://github.com/revenuedot/revenuedot/tree/main/scripts/e2e)).
- Purchases through the real App Store and Google Play sandboxes have not run end to end yet. Store handling is tested against mocked Apple and Google APIs.
- The [React Native Expo example](https://github.com/revenuedot/examples/tree/main/mobile/react-native-expo) and the [purchases-js Vite example](https://github.com/revenuedot/examples/tree/main/web/purchases-js-vite) run against RevenueDot with a Test Store key.

## Related
- [Connect your app](../getting-started/connect-your-app.md)
- [Trusted Entitlements](../guides/trusted-entitlements.md)
- [Test Store](../guides/test-store.md)
- [SDK changes when you migrate](../migrate/sdk-changes.md)
- [SDK endpoints](../../api/sdk-endpoints.md)

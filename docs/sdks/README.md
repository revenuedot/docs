---
title: Which RevenueCat SDKs work with RevenueDot?
description: All nine RevenueCat app SDKs work with RevenueDot in proxy mode today. Set the proxy URL and turn off signature checks. RevenueDot forks of all ten SDK repos exist but are not published yet.
---

# Which RevenueCat SDKs work with RevenueDot?

All nine RevenueCat app SDKs work with RevenueDot today in **proxy mode**: you keep the SDK you ship, set one proxy URL before `configure`, and turn off signature checks. RevenueDot also keeps a fork of each SDK repo (ten in total, counting the shared hybrid layer). The forks keep every import name, but **none of them is published to a package registry yet** (as of 2026-09-30).

## Pick a mode
- **Proxy mode** works now. It is one setting in your app. The stock SDK checks response signatures against RevenueCat's key, so every RevenueDot response reads as "verification failed" unless you turn the check off. See [Trusted Entitlements](../guides/trusted-entitlements.md).
- **Fork packages** will replace the stock package without code changes once they are published. They trust RevenueDot's signing key and send every request, including analytics and diagnostics, to your server.
- **Keep your RevenueCat keys**: the [importer](../migrate/importer.md) copies each app's public key into RevenueDot, so builds you already shipped keep the same `appl_` or `goog_` key. See [Connect your app](../getting-started/connect-your-app.md).

## Every SDK at a glance
| SDK | Proxy mode today | How to set the proxy URL | Signature check default (stock SDK) | Planned fork package | Guide |
|---|---|---|---|---|---|
| iOS, macOS, tvOS, watchOS, visionOS | Yes | `Purchases.proxyURL = URL(string: "...")!` | Informational: logs a failure, still grants access. Set `.disabled` | CocoaPods `RevenueDotPurchases`, SPM `github.com/revenuedot/purchases-ios` | [iOS](ios.md) |
| Android | Yes. Diagnostics, paywall events and ad events still go to RevenueCat | `Purchases.proxyURL = URL("...")` | Informational. Set `DISABLED` | Maven `app.revenuedot.purchases:purchases` | [Android](android.md) |
| React Native and Expo | Yes, on iOS, Android, Expo Go and web | `await Purchases.setProxyURL("...")` | Disabled | npm `@revenuedot/react-native-purchases` | [React Native](react-native.md) |
| Flutter | Yes on iOS and Android. **Not on Flutter web** with the stock SDK | `await Purchases.setProxyURL('...')` | Disabled | git `github.com/revenuedot/purchases-flutter` | [Flutter](flutter.md) |
| Web (purchases-js) | Yes, with Test Store (`test_`) keys only | `httpConfig: { proxyURL: "..." }` in `configure` | No signature checks | npm `@revenuedot/purchases-js` | [Web](web.md) |
| Capacitor and Ionic | Yes | `await Purchases.setProxyURL({ url: "..." })` | No default passed, so the native informational default applies. Pass `DISABLED` | npm `@revenuedot/purchases-capacitor` | [Capacitor](capacitor.md) |
| Kotlin Multiplatform | Yes | `Purchases.proxyURL = "..."` (a `String`) | Disabled | Maven `app.revenuedot.purchases:purchases-kmp-core` | [Kotlin Multiplatform](kotlin-multiplatform.md) |
| Unity | Yes | The **Proxy URL** field on the Purchases component | Informational. Set **Disabled** in the Inspector | OpenUPM `com.revenuedot.purchases-unity` | [Unity](unity.md) |
| Cordova | Yes | `Purchases.setProxyURL("...")` before `configureWith` | No option: logs a failure, still grants access | npm `@revenuedot/cordova-plugin-purchases` | [Cordova](cordova.md) |
| purchases-hybrid-common | Not installed by apps | Wrappers pass the proxy URL through it | Wrappers pass the mode through it | pods `RevenueDotPurchasesHybridCommon`, Maven `app.revenuedot.purchases:purchases-hybrid-common` | [Hybrid common](hybrid-common.md) |

**Never use `ENFORCED` mode with a stock SDK against RevenueDot.** Every call would fail, because RevenueDot cannot sign with RevenueCat's key.

## What the forks change
Each fork lives in `github.com/revenuedot/<repo>` on the branch `revenuedot/main-patches`, which is the upstream code plus one patch commit. The patches change only these things:
- The default API host becomes `https://api.revenuedot.app`. That host is not live yet, so self-hosters still set the proxy URL.
- The SDK trusts RevenueDot's response-signing key instead of RevenueCat's.
- Registry names change (table above). Module and package names that your code imports stay the same, so `import RevenueCat` and `com.revenuecat.purchases.*` still work.
- Android: diagnostics, paywall events and ad events follow the proxy URL.
- purchases-js: analytics events follow `httpConfig.proxyURL`, and checkout reads "Secure checkout by RevenueDot".
- Flutter web: `Purchases.setProxyURL` works.
- Each README gets a banner saying the fork is maintained by RevenueDot and not affiliated with RevenueCat.

Source: [`prd/sdk-forks/PRD.md`](https://github.com/revenuedot/revenuedot/blob/main/prd/sdk-forks/PRD.md).

## What is tested today
- The web SDK fork ran end to end against a real RevenueDot server: configure, customer info, offerings, a Test Store purchase, and the `pro` entitlement turning active.
- Purchases through the real App Store and Google Play sandboxes have not run end to end yet. Store handling is tested against mocked Apple and Google APIs.
- The [React Native Expo example](https://github.com/revenuedot/examples/tree/main/mobile/react-native-expo) and the [purchases-js Vite example](https://github.com/revenuedot/examples/tree/main/web/purchases-js-vite) run against RevenueDot with a Test Store key.

## Related
- [Connect your app](../getting-started/connect-your-app.md)
- [Trusted Entitlements](../guides/trusted-entitlements.md)
- [Test Store](../guides/test-store.md)
- [SDK changes when you migrate](../migrate/sdk-changes.md)
- [SDK endpoints](../../api/sdk-endpoints.md)

---
title: Which SDKs does RevenueDot have?
description: RevenueDot has an SDK for iOS and the other Apple platforms, Android, React Native and Expo, Flutter, the web, Capacitor, Kotlin Multiplatform, Unity and Cordova. Install it and pass your app's key; on RevenueDot Cloud nothing else is needed.
---

# Which SDKs does RevenueDot have?

RevenueDot has an SDK for every platform: iOS and the other Apple platforms, Android, React Native and Expo, Flutter, the web, Capacitor and Ionic, Kotlin Multiplatform, Unity and Cordova. Install the one for your platform and pass your app's API key to `configure`. On RevenueDot Cloud nothing else is needed, because each SDK already calls `https://api.revenuedot.app`. **All of them are released** (2026-10-02).

The RevenueDot SDK is built from RevenueCat's open-source SDK (MIT license), so your code imports `RevenueCat` and calls `Purchases`. It sends every request to RevenueDot and needs no RevenueCat account.

## Install the RevenueDot SDK for your platform
| Platform | Install (versions checked 2026-10-05) | Configure on RevenueDot Cloud | Guide |
|---|---|---|---|
| iOS, macOS, tvOS, watchOS, visionOS | Swift Package Manager: `https://github.com/revenuedot/purchases-ios`, exact version `5.91.0-revenuedot`, product `RevenueCat` (`RevenueCatUI` for paywalls). CocoaPods: `pod 'RevenueDotPurchases', '5.91.0'` (`RevenueDotPurchasesUI` for paywalls) | `Purchases.configure(withAPIKey: "appl_...")` | [iOS](ios.md) |
| Android | Maven Central: `implementation("app.revenuedot.purchases:purchases:10.23.3")` (`purchases-ui` for paywalls) | `Purchases.configure(PurchasesConfiguration.Builder(this, "goog_...").build())` in `Application.onCreate()` | [Android](android.md) |
| React Native and Expo | `npm install react-native-purchases@npm:@revenuedot/react-native-purchases@10.10.2`. The alias keeps `import Purchases from "react-native-purchases"`. Paywalls: `react-native-purchases-ui@npm:@revenuedot/react-native-purchases-ui@10.10.2` | `Purchases.configure({ apiKey: Platform.OS === "ios" ? "appl_..." : "goog_..." })` | [React Native](react-native.md) |
| Flutter | Git dependency in `pubspec.yaml`: `https://github.com/revenuedot/purchases-flutter.git` at `10.13.2-revenuedot`. The pub.dev names belong to RevenueCat | `await Purchases.configure(PurchasesConfiguration(Platform.isIOS ? 'appl_...' : 'goog_...'))` | [Flutter](flutter.md) |
| Web (purchases-js) | `npm install @revenuedot/purchases-js@1.67.0` | `Purchases.configure({ apiKey: "test_...", appUserId })`. Only Test Store keys buy through purchases-js today | [Web](web.md) |
| Capacitor and Ionic | `npm install @revenuecat/purchases-capacitor@npm:@revenuedot/purchases-capacitor@13.6.1`. The alias keeps the native names | `await Purchases.configure({ apiKey: ... })` | [Capacitor](capacitor.md) |
| Kotlin Multiplatform | Maven Central: `implementation("app.revenuedot.purchases:purchases-kmp-core:3.10.1")` | `Purchases.configure(PurchasesConfiguration(apiKey))` | [Kotlin Multiplatform](kotlin-multiplatform.md) |
| Unity | OpenUPM: `openupm add com.revenuedot.purchases-unity` (9.11.1), or git tag `9.11.1-revenuedot` | API keys on the **Purchases** component | [Unity](unity.md) |
| Cordova | `cordova plugin add @revenuedot/cordova-plugin-purchases@8.2.3` | `Purchases.configureWith({ apiKey: ... })` | [Cordova](cordova.md) |

The cross-platform SDKs (React Native, Flutter, Capacitor, Unity and Cordova) share a native layer, [purchases-hybrid-common](hybrid-common.md). The install pulls in RevenueDot's build of it (pods `RevenueDotPurchasesHybridCommon`, Maven `app.revenuedot.purchases:purchases-hybrid-common`, both 19.4.1). Apps never install it directly.

**Self-hosting:** also set the SDK's proxy URL to your server before `configure`, and keep entitlement verification `disabled`. Each SDK trusts RevenueDot Cloud's response-signing key, and a self-hosted server signs with its own key. To verify against your own server, build the SDKs with your key. See [Trusted Entitlements](../guides/trusted-entitlements.md).

## Switching from RevenueCat? Keep your SDK and change one line
All nine RevenueCat app SDKs work with RevenueDot in **proxy mode**: you keep the SDK you ship, set one proxy URL before `configure`, and turn off signature checks. The RevenueCat SDK checks response signatures against RevenueCat's key, so every RevenueDot response reads as "verification failed" unless you turn the check off. The [importer](../migrate/importer.md) copies each app's public key into RevenueDot, so builds you already shipped keep the same `appl_` or `goog_` key. See [Connect your app](../getting-started/connect-your-app.md) and [Migrate from RevenueCat](../migrate/README.md).

| SDK | Proxy mode today | How to set the proxy URL | Signature check default (RevenueCat SDK) | Guide |
|---|---|---|---|---|
| iOS, macOS, tvOS, watchOS, visionOS | Yes | `Purchases.proxyURL = URL(string: "...")!` | Informational: logs a failure, still grants access. Set `.disabled` | [iOS](ios.md) |
| Android | Yes. Diagnostics, paywall events and ad events still go to RevenueCat | `Purchases.proxyURL = URL("...")` | Informational. Set `DISABLED` | [Android](android.md) |
| React Native and Expo | Yes, on iOS, Android, Expo Go and web | `await Purchases.setProxyURL("...")` | Disabled | [React Native](react-native.md) |
| Flutter | Yes on iOS and Android. **Not on Flutter web** with RevenueCat's package | `await Purchases.setProxyURL('...')` | Disabled | [Flutter](flutter.md) |
| Web (purchases-js) | Yes, with Test Store (`test_`) keys only | `httpConfig: { proxyURL: "..." }` in `configure` | No signature checks | [Web](web.md) |
| Capacitor and Ionic | Yes | `await Purchases.setProxyURL({ url: "..." })` | No default passed, so the native informational default applies. Pass `DISABLED` | [Capacitor](capacitor.md) |
| Kotlin Multiplatform | Yes | `Purchases.proxyURL = "..."` (a `String`) | Disabled | [Kotlin Multiplatform](kotlin-multiplatform.md) |
| Unity | Yes | The **Proxy URL** field on the Purchases component | Informational. Set **Disabled** in the Inspector | [Unity](unity.md) |
| Cordova | Yes | `Purchases.setProxyURL("...")` before `configureWith` | No option: logs a failure, still grants access | [Cordova](cordova.md) |

**Never use `ENFORCED` mode with a RevenueCat SDK against RevenueDot.** Every call would fail, because RevenueDot cannot sign with RevenueCat's key. After the update ships, call `syncPurchases()` once on its first launch, so current subscribers keep access. Each SDK guide shows the call.

## The RevenueDot SDKs are RevenueCat's releases plus one patch
Each RevenueDot SDK lives in `github.com/revenuedot/<repo>`. Releases are upstream release tags plus one patch commit, tagged `<upstream version>-revenuedot`; the branch `revenuedot/main-patches` follows upstream `main`. The patches change only these things:
- The default API host becomes `https://api.revenuedot.app`, which is RevenueDot Cloud (live since 2026-09-30). Self-hosters still set the proxy URL.
- The SDK trusts RevenueDot's response-signing key instead of RevenueCat's.
- Registry names change (first table above). Module and package names that your code imports stay the same, so `import RevenueCat` and `com.revenuecat.purchases.*` work.
- Android: diagnostics, paywall events and ad events follow the proxy URL.
- purchases-js: analytics events follow `httpConfig.proxyURL`, and checkout reads "Secure checkout by RevenueDot".
- Flutter web: `Purchases.setProxyURL` works.
- Each README gets a banner saying the SDK is maintained by RevenueDot and not affiliated with RevenueCat.

Source: [`prd/sdk-forks/PRD.md`](https://github.com/revenuedot/revenuedot/blob/main/prd/sdk-forks/PRD.md).

## Every released SDK was installed and checked against RevenueDot
- Each released RevenueDot SDK was installed the way an app installs it and checked against a RevenueDot server (2026-10-02). Web purchases-js from npm, Flutter web from its git tag and `@revenuedot/react-native-purchases` from npm on the web each bought a Test Store subscription, and the server shows `pro` active. iOS apps built with the published pods and Swift packages (Flutter, Capacitor, Cordova) carry `api.revenuedot.app` and RevenueDot's signing key, and no RevenueCat host. The Android artifacts on Maven Central and the Kotlin Multiplatform iOS library do the same.
- The unmodified RevenueCat iOS SDK 5.92 on an iPhone simulator and Android SDK 10.24 on an Android emulator pass configure, customer info, offerings, a Test Store purchase and `logIn` against RevenueDot ([`scripts/e2e`](https://github.com/revenuedot/revenuedot/tree/main/scripts/e2e)).
- A real App Store sandbox purchase ran end to end on a physical iPhone on 2026-10-02: Apple's purchase sheet, Apple's notification into RevenueDot, an `INITIAL_PURCHASE` webhook, access unlocked in the app. Google Play sandbox purchases have not run end to end yet; Play handling is tested against a copy of Google's API.
- The [React Native Expo example](https://github.com/revenuedot/examples/tree/main/mobile/react-native-expo) and the [purchases-js Vite example](https://github.com/revenuedot/examples/tree/main/web/purchases-js-vite) run against RevenueDot with a Test Store key.

## Related
- [Connect your app](../getting-started/connect-your-app.md)
- [Trusted Entitlements](../guides/trusted-entitlements.md)
- [Test Store](../guides/test-store.md)
- [SDK changes when you migrate](../migrate/sdk-changes.md)
- [SDK endpoints](../../api/sdk-endpoints.md)

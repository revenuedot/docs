---
title: How do I connect my app to RevenueDot?
description: Install the RevenueDot SDK for your platform and pass your app's key; on RevenueDot Cloud nothing else is needed. An app switching from RevenueCat can instead keep its SDK and set one line, and the importer keeps its RevenueCat API keys working.
---

# How do I connect my app to RevenueDot?

Install the RevenueDot SDK for your platform and pass your app's API key to `configure`. On RevenueDot Cloud that is all the setup, because the SDK already calls `https://api.revenuedot.app`. This is the way for new apps. It is also the way for any app that wants the SDK to verify that each response came from RevenueDot and to send nothing to RevenueCat's hosts. An app that already ships the RevenueCat SDK can instead keep it and set one line, the **proxy URL**. When such an app switches, the importer lets versions already in users' hands keep their **RevenueCat API keys**.

| Way | What you change in the app | What you get | Status (2026-10-02) |
|---|---|---|---|
| [Install the RevenueDot SDK](#install-the-revenuedot-sdk-and-pass-your-key) | Add the package and pass your app's key | Signed responses verify against RevenueDot Cloud; no traffic to RevenueCat's hosts | Released for all ten SDKs |
| [Keep the RevenueCat SDK and set one line](#switching-from-revenuecat-keep-your-sdk-and-set-one-line) | One setting, the proxy URL, plus the verification mode | Every SDK call goes to RevenueDot | Works with every RevenueCat app SDK |
| [Keep your RevenueCat keys](#keep-your-revenuecat-api-keys) | Nothing | App versions already in users' hands keep working | Works (importer) |

## Install the RevenueDot SDK and pass your key
```swift
// iOS: Swift package github.com/revenuedot/purchases-ios at 5.91.0-revenuedot, or pod 'RevenueDotPurchases', '5.91.0'.
import RevenueCat

Purchases.configure(withAPIKey: "appl_...")
```
```kotlin
// Android: implementation("app.revenuedot.purchases:purchases:10.23.3"), then in Application.onCreate():
Purchases.configure(PurchasesConfiguration.Builder(this, "goog_...").build())
```
```ts
// React Native and Expo: npm install react-native-purchases@npm:@revenuedot/react-native-purchases@10.10.2
import Purchases from "react-native-purchases";

Purchases.configure({ apiKey: Platform.OS === "ios" ? "appl_..." : "goog_..." });
```

The RevenueDot SDK is built from RevenueCat's open-source SDK (MIT license), so your code imports `RevenueCat` and calls `Purchases`. It sends every request to RevenueDot and needs no RevenueCat account. It keeps the names your code imports (`import RevenueCat`, `com.revenuecat.purchases.*`, `package:purchases_flutter`). Each SDK:

- trusts RevenueDot's response-signing key, so entitlement verification reports `VERIFIED` against RevenueDot Cloud;
- sends diagnostics and events to RevenueDot too (Android, purchases-js), and makes the proxy URL work on Flutter web;
- calls `https://api.revenuedot.app` (RevenueDot Cloud) by default, so Cloud projects need no proxy URL.

There is a RevenueDot SDK for iOS, Android, React Native and Expo, Flutter, the web, Capacitor and Ionic, Kotlin Multiplatform, Unity and Cordova. The install line for each one is in [Which SDKs does RevenueDot have?](../sdks/README.md): CocoaPods and Swift packages for iOS, Maven Central for Android and Kotlin Multiplatform, npm for the web, React Native, Capacitor and Cordova, a git tag for Flutter, and OpenUPM for Unity.

**Self-hosting:** also set the SDK's proxy URL to your server before `configure`, and keep entitlement verification `disabled`. A self-hosted server signs with its own key, so the official builds only verify against RevenueDot Cloud. To verify against your own server, build the SDKs with your key; see [Trusted Entitlements](../guides/trusted-entitlements.md#verify-against-your-own-server).

## Switching from RevenueCat? Keep your SDK and set one line
An app that already ships the RevenueCat SDK can keep it. Set the SDK's proxy URL to RevenueDot (`https://api.revenuedot.app` for RevenueDot Cloud, or your own server) and turn its signature check off. That is **proxy mode**, and it works with every RevenueCat app SDK.

[![Watch the 1:18 walkthrough of connecting an app to RevenueDot](https://revenuedot.app/videos/revenuedot-connect-your-app.webp)](https://revenuedot.app/videos/revenuedot-connect-your-app.mp4)

*Watch the 1:18 walkthrough of proxy mode, or [on YouTube](https://www.youtube.com/watch?v=M_D0YodECkU). [Watch page](https://revenuedot.app/watch/revenuedot-connect-your-app).*

```swift
// iOS. Keep the RevenueCat SDK and point it at your RevenueDot server; nothing else in the app changes.
Purchases.proxyURL = URL(string: "https://revenuedot.example.com")!
Purchases.configure(with: Configuration.Builder(withAPIKey: "appl_...").with(entitlementVerificationMode: .disabled).build())
```
```kotlin
// Android. Keep the RevenueCat SDK and point it at your RevenueDot server; nothing else in the app changes.
Purchases.proxyURL = URL("https://revenuedot.example.com")
Purchases.configure(PurchasesConfiguration.Builder(context, "goog_...").entitlementVerificationMode(EntitlementVerificationMode.DISABLED).build())
```
```ts
// React Native and Expo. Keep the RevenueCat SDK and point it at your RevenueDot server; nothing else in the app changes.
await Purchases.setProxyURL("https://revenuedot.example.com");
Purchases.configure({ apiKey: Platform.OS === "ios" ? "appl_..." : "goog_..." });
```

- **Set the proxy URL before `configure`.** The SDK reads it once. For RevenueDot Cloud it is `https://api.revenuedot.app`.
- **Turn entitlement verification off.** The RevenueCat SDK checks responses against RevenueCat's signing key. RevenueDot cannot sign with that key, so iOS and Android would report every response as `FAILED` in their default informational mode. Access still works, but the logs fill with errors. See [Trusted Entitlements](../guides/trusted-entitlements.md).
- **Use the keys RevenueDot gives each app** (`appl_`, `goog_`, `test_` ...), or keep your RevenueCat keys as described below.
- **Known limits.** The RevenueCat Android SDK still sends diagnostics, paywall events and ad events to RevenueCat's hosts. RevenueCat's purchases-js sends analytics to RevenueCat unless you set `flags: { collectAnalyticsEvents: false }`. Flutter's web build ignores the proxy URL.
- **You can swap in the RevenueDot SDK later**, in any release. It is a package change, because it keeps every import name.

Every SDK's exact call is in its guide: [iOS](../sdks/ios.md), [Android](../sdks/android.md), [React Native](../sdks/react-native.md), [Flutter](../sdks/flutter.md), [Web](../sdks/web.md), [Capacitor](../sdks/capacitor.md), [Kotlin Multiplatform](../sdks/kotlin-multiplatform.md), [Unity](../sdks/unity.md), [Cordova](../sdks/cordova.md).

## Keep your RevenueCat API keys
Apps already in the store send their RevenueCat public key (`appl_...`, `goog_...`). The [importer](../migrate/importer.md) sets each RevenueDot app's public key to that same string, so old app versions work against RevenueDot the moment you point traffic at it. You can also do it for one app with the API:

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/import/apps/$APP_ID/public_key" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"public_key":"appl_YourExistingRevenueCatKey"}'
```

Old app versions still call RevenueCat's API until they update, because the proxy URL lives in the app. That is why a migration runs both systems side by side for a while. See [Migrate from RevenueCat](../migrate/README.md).

## New apps install the RevenueDot SDK; switching apps can start with one line
- **New app, or new to in-app purchases:** install the RevenueDot SDK and test with the Test Store. See the [Quickstart](quickstart.md).
- **Already selling with your own StoreKit or Google Play Billing code:** [import your products](../guides/import-products.md) from App Store Connect, Google Play or Stripe, install the RevenueDot SDK, and call `syncPurchases()` once on the first launch of the update. It sends the device's existing store purchases to RevenueDot, so current subscribers keep access. Store notifications keep them current after that.
- **You rely on entitlement verification:** the RevenueDot SDK, built with your server's key when you self-host.
- **Self-hosting:** the RevenueDot SDK with the proxy URL set to your server and verification off.
- **Moving a live app from RevenueCat:** proxy mode or the RevenueDot SDK in the next release, your RevenueCat keys through the importer, and a [dual run](../migrate/dual-run.md) until most users have updated.

## Related
- [Quickstart](quickstart.md)
- [SDK guides](../sdks/README.md)
- [Which key goes where](../concepts/projects-and-apps.md#which-key-goes-where)
- [Why we forked the RevenueCat SDKs](../../blog/why-we-forked-the-revenuecat-sdks.md)

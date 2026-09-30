---
title: What do I change in my app's SDK code to move to RevenueDot?
description: In proxy mode, set the proxy URL before configure, turn off signature checks and sync purchases once. With a fork, swap the package and keep your code. Diffs for all ten SDKs.
---

# What do I change in my app's SDK code to move to RevenueDot?

In **proxy mode** you add a few lines: set the proxy URL before `configure`, turn off signature checks, and call `syncPurchases()` once after the update. With a **fork**, you swap the package in your manifest and keep every line of code. Proxy mode works today; the forks are not published yet (2026-09-30).

## Proxy mode or fork swap
| | Proxy mode | Fork swap |
|---|---|---|
| Works today | Yes | No: not on any registry yet |
| Code change | 2 to 5 lines at startup | None; the manifest changes |
| Signature checks | Must be off (or informational); they would fail | Verify against RevenueDot Cloud's key; self-hosters use their own build or keep them off |
| Android diagnostics, paywall and ad events | Still go to RevenueCat | Go to your server |
| Web analytics events | Turn off, or they go to RevenueCat | Go to your server |
| Flutter web | Does not work | Works |
| Proxy URL | Required: `https://api.revenuedot.app` for RevenueDot Cloud, or your own server | Not needed for RevenueDot Cloud (the default host); required when you self-host |

**Keys:** if you ran the [importer](importer.md), each app keeps its RevenueCat public key, so the `apiKey` lines below stay as they are. Otherwise use the keys RevenueDot shows for each app.

**Sync once:** `syncPurchases()` sends the device's store purchases to RevenueDot, so current subscribers keep access even where their history was not imported. On Google Play it also delivers any purchase token the importer could not find. Call it once, on the first launch after the update.

## iOS
```diff
 import RevenueCat

+// Point the SDK at your RevenueDot server; nothing else in the app changes. Set it before configure.
+Purchases.proxyURL = URL(string: "https://revenuedot.example.com")!
-Purchases.configure(withAPIKey: "appl_...")
+Purchases.configure(
+    with: Configuration.Builder(withAPIKey: "appl_...")
+        // The default (informational) logs every RevenueDot response as failed signature verification.
+        .with(entitlementVerificationMode: .disabled)
+        .build()
+)
+// Once, after this update: send purchases made while the app talked to RevenueCat.
+_ = try? await Purchases.shared.syncPurchases()
```
Fork swap (planned): `pod 'RevenueCat'` becomes `pod 'RevenueDotPurchases'`, or the SPM URL becomes `https://github.com/revenuedot/purchases-ios`. `import RevenueCat` stays. Guide: [iOS](../sdks/ios.md).

## Android
```diff
 override fun onCreate() {
     super.onCreate()
+    // Point the SDK at your RevenueDot server; nothing else in the app changes. Must be set before configure.
+    Purchases.proxyURL = URL("https://revenuedot.example.com")
     Purchases.configure(
         PurchasesConfiguration.Builder(this, "goog_...")
+            // The default (INFORMATIONAL) logs every RevenueDot response as failed signature verification.
+            .entitlementVerificationMode(EntitlementVerificationMode.DISABLED)
             .build()
     )
+    // Once, after this update: send purchases made while the app talked to RevenueCat.
+    Purchases.sharedInstance.syncPurchases()
 }
```
Fork swap (planned):
```diff
-implementation("com.revenuecat.purchases:purchases:<version>")
+implementation("app.revenuedot.purchases:purchases:<version>")
```
Guide: [Android](../sdks/android.md).

## React Native and Expo
```diff
 import Purchases from "react-native-purchases";

+// Point the SDK at your RevenueDot server; nothing else in the app changes. Await it before configure.
+await Purchases.setProxyURL("https://revenuedot.example.com");
 Purchases.configure({
   apiKey: Platform.OS === "ios" ? "appl_..." : "goog_...",
-  entitlementVerificationMode: ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL,
+  // DISABLED is the React Native default; RevenueDot does not sign responses with RevenueCat's key.
 });
+// Once, after this update: send purchases made while the app talked to RevenueCat.
+await Purchases.syncPurchasesForResult();
```
Fork swap (planned), in `package.json`:
```diff
-"react-native-purchases": "<version>",
+"react-native-purchases": "npm:@revenuedot/react-native-purchases@<version>",
```
Guide: [React Native](../sdks/react-native.md).

## Flutter
```diff
 import 'package:purchases_flutter/purchases_flutter.dart';

 Future<void> initPurchases() async {
+  // Point the SDK at your RevenueDot server; nothing else in the app changes. Await it before configure.
+  await Purchases.setProxyURL('https://revenuedot.example.com');
   await Purchases.configure(PurchasesConfiguration(Platform.isIOS ? 'appl_...' : 'goog_...'));
+  // Once, after this update: send purchases made while the app talked to RevenueCat.
+  await Purchases.syncPurchases();
 }
```
Flutter web cannot use a proxy URL with the stock package. Fork swap (planned), in `pubspec.yaml`:
```diff
-  purchases_flutter: ^<version>
+  purchases_flutter:
+    git:
+      url: https://github.com/revenuedot/purchases-flutter.git
+      ref: <version>-revenuedot
```
Guide: [Flutter](../sdks/flutter.md).

## Web (purchases-js)
```diff
 const purchases = Purchases.configure({
   apiKey: "test_...",
   appUserId,
+  // Point the SDK at your RevenueDot server; nothing else in the app changes. No trailing slash.
+  httpConfig: { proxyURL: "https://revenuedot.example.com" },
+  // Analytics events do not use the proxy URL; turn them off to keep all traffic on your server.
+  flags: { collectAnalyticsEvents: false },
 });
```
Only Test Store (`test_`) keys work against RevenueDot today; Web Billing (`rcb_`), Stripe and Paddle do not. Fork swap (planned):
```diff
-"@revenuecat/purchases-js": "<version>",
+"@revenuecat/purchases-js": "npm:@revenuedot/purchases-js@<version>",
```
Guide: [Web](../sdks/web.md).

## Capacitor and Ionic
```diff
-import { Purchases } from "@revenuecat/purchases-capacitor";
+import { ENTITLEMENT_VERIFICATION_MODE, Purchases } from "@revenuecat/purchases-capacitor";

+// Point the SDK at your RevenueDot server; nothing else in the app changes. Await it before configure.
+await Purchases.setProxyURL({ url: "https://revenuedot.example.com" });
 await Purchases.configure({
   apiKey: isIOS ? "appl_..." : "goog_...",
+  // Capacitor passes no default, so the native default (informational signature checks) would apply.
+  entitlementVerificationMode: ENTITLEMENT_VERIFICATION_MODE.DISABLED,
 });
+// Once, after this update: send purchases made while the app talked to RevenueCat.
+await Purchases.syncPurchases();
```
Fork swap (planned), only through the alias so Capacitor's native names stay:
```diff
-"@revenuecat/purchases-capacitor": "<version>",
+"@revenuecat/purchases-capacitor": "npm:@revenuedot/purchases-capacitor@<version>",
```
Guide: [Capacitor](../sdks/capacitor.md).

## Kotlin Multiplatform
```diff
 fun initPurchases(apiKey: String) {
+    // Point the SDK at your RevenueDot server; nothing else in the app changes. A String, set before configure.
+    Purchases.proxyURL = "https://revenuedot.example.com"
     Purchases.configure(PurchasesConfiguration(apiKey) {
+        // DISABLED is the KMP default; keep it, RevenueDot does not sign responses with RevenueCat's key.
+        verificationMode = EntitlementVerificationMode.DISABLED
     })
 }
```
Then call `Purchases.sharedInstance.awaitSyncPurchases()` once from a coroutine. Fork swap (planned):
```diff
-implementation("com.revenuecat.purchases:purchases-kmp-core:<version>")
+implementation("app.revenuedot.purchases:purchases-kmp-core:<version>")
```
Guide: [Kotlin Multiplatform](../sdks/kotlin-multiplatform.md).

## Unity
In the Inspector, on the GameObject that holds the **Purchases** component:

| Field | Before | After |
|---|---|---|
| Proxy URL | (empty) | `https://revenuedot.example.com` |
| Entitlement Verification Mode | Informational | Disabled |

There is no public `SetProxyURL` method; the field applies also when you configure from code:
```diff
 var purchases = GetComponent<Purchases>();
-purchases.Configure(Purchases.PurchasesConfiguration.Builder.Init("appl_...").Build());
+purchases.Configure(Purchases.PurchasesConfiguration.Builder.Init("appl_...")
+    .SetEntitlementVerificationMode(Purchases.EntitlementVerificationMode.Disabled)
+    .Build());
+// Once, after this update: send purchases made while the app talked to RevenueCat.
+purchases.SyncPurchases();
```
Fork swap (planned): OpenUPM package `com.revenuecat.purchases-unity` becomes `com.revenuedot.purchases-unity`. Guide: [Unity](../sdks/unity.md).

## Cordova
```diff
 document.addEventListener("deviceready", () => {
+  // Point the SDK at your RevenueDot server; nothing else in the app changes. Call it before configure.
+  Purchases.setProxyURL("https://revenuedot.example.com");
   Purchases.configureWith({ apiKey: device.platform === "iOS" ? "appl_..." : "goog_..." });
+  // Once, after this update: send purchases made while the app talked to RevenueCat.
+  Purchases.syncPurchases();
 });
```
Cordova has no option to turn off signature checks, so the SDK logs a verification failure for every RevenueDot response and still grants access. Fork swap (planned): `cordova plugin add @revenuedot/cordova-plugin-purchases`; the plugin id stays `cordova-plugin-purchases`. Guide: [Cordova](../sdks/cordova.md).

## purchases-hybrid-common
No change. Apps never depend on it directly: the React Native, Flutter, Capacitor, Unity and Cordova packages bring it in, and their fork packages bring in RevenueDot's build. See [Hybrid common](../sdks/hybrid-common.md).

## Related
- [All SDKs](../sdks/README.md)
- [Trusted Entitlements](../guides/trusted-entitlements.md)
- [Cutover checklist](cutover-checklist.md)
- [What differs from RevenueCat](what-differs.md)

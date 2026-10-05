---
title: How do I add in-app purchases to a Flutter app with RevenueDot?
description: Add the RevenueDot SDK to pubspec.yaml as a git dependency, then call Purchases.configure with your app's key. On RevenueDot Cloud nothing else is needed. It works on iOS, Android and Flutter web.
---

# How do I add in-app purchases to a Flutter app with RevenueDot?

Add the RevenueDot SDK for Flutter to `pubspec.yaml` as a git dependency, then call `Purchases.configure` with your app's key from RevenueDot. On RevenueDot Cloud nothing else is needed. It works on iOS, Android and Flutter web. It is a git dependency because the pub.dev names belong to RevenueCat.

## Install the RevenueDot SDK and pass your key
The source is [github.com/revenuedot/purchases-flutter](https://github.com/revenuedot/purchases-flutter). Release tags are `<version>-revenuedot`.
```yaml
# pubspec.yaml
dependencies:
  purchases_flutter:
    git:
      url: https://github.com/revenuedot/purchases-flutter.git
      ref: 10.13.2-revenuedot
  purchases_ui_flutter:          # only if you use paywalls
    git:
      url: https://github.com/revenuedot/purchases-flutter.git
      path: purchases_ui_flutter
      ref: 10.13.2-revenuedot
```
```dart
import 'package:flutter/foundation.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

// kIsWeb and defaultTargetPlatform work on every platform. Platform from dart:io throws on Flutter web.
final apiKey = kIsWeb
    ? 'test_...' // purchases-js buys only with Test Store keys today
    : defaultTargetPlatform == TargetPlatform.iOS
        ? 'appl_...'
        : 'goog_...';

Future<void> initPurchases() async {
  await Purchases.configure(PurchasesConfiguration(apiKey));
}
```
- The RevenueDot SDK is built from RevenueCat's open-source SDK (MIT license), so your code imports `package:purchases_flutter/purchases_flutter.dart` and calls `Purchases`. It sends every request to RevenueDot and needs no RevenueCat account.
- Use each app's public key from RevenueDot, or the `test_...` key for the Test Store. See [Which key goes where](../concepts/projects-and-apps.md#which-key-goes-where).
- **On RevenueDot Cloud** the SDK already calls `https://api.revenuedot.app`, so there is nothing else to set.
- **Entitlement verification is off by default** (`EntitlementVerificationMode.disabled`).
- Its native side comes from RevenueDot's [hybrid common](hybrid-common.md) 19.4.1: the `RevenueDotPurchasesHybridCommon` pod (or its Swift package) on iOS and `app.revenuedot.purchases:purchases-hybrid-common` on Android. Its web bundle is built from RevenueDot's purchases-js 1.67.0.

Checked with the [Flutter example](https://github.com/revenuedot/examples/tree/main/mobile/flutter) on this tag: a Flutter web build bought the monthly package through the Test Store against a RevenueDot server and the server shows `pro` active, and iOS simulator builds succeed with both CocoaPods and Swift Package Manager.

**Self-hosting:** await `Purchases.setProxyURL` with your server's address before `configure`. It works on iOS, Android and Flutter web. Leave the verification mode at its default, `disabled`, because your server signs with its own key, which this build does not trust.
```dart
// apiKey as above: kIsWeb and defaultTargetPlatform pick the key on every platform.
await Purchases.setProxyURL('https://revenuedot.example.com');
await Purchases.configure(PurchasesConfiguration(apiKey));
```
To verify responses from your own server, build the SDKs with your public key. See [Trusted Entitlements](../guides/trusted-entitlements.md).

## Check an entitlement and make a purchase
Check the entitlement your app unlocks, here `pro`, then buy a package from the current offering, the set of products your paywall shows.
```dart
import 'package:flutter/services.dart' show PlatformException;

final customerInfo = await Purchases.getCustomerInfo();
final isPro = customerInfo.entitlements.active.containsKey('pro');

final offerings = await Purchases.getOfferings();
final package = offerings.current?.availablePackages.first;
if (package != null) {
  try {
    final result = await Purchases.purchase(PurchaseParams.package(package));
    final nowPro = result.customerInfo.entitlements.active.containsKey('pro');
  } on PlatformException catch (e) {
    if (PurchasesErrorHelper.getErrorCode(e) != PurchasesErrorCode.purchaseCancelledError) rethrow;
  }
}
```
`Purchases.purchasePackage` still works but is deprecated in 10.x.

## Test Store
Create a `test_store` app in RevenueDot and use its `test_...` key. The Test Store dialog replaces the store sheet; tap **Test valid purchase**.
- **Native builds** accept `test_` keys only in debug builds. Ship with the `appl_` and `goog_` keys.
- **iOS:** servers older than the 2026-09-30 fix could not serve Test Store products to the native iOS SDK. See [iOS](ios.md#test-store).
- **Flutter web** needs the RevenueDot SDK, because RevenueCat's web plugin ignores the proxy URL.
- Test Store prices come from each product's Test Store price. Set it in the dashboard (Product catalog, Edit product) or with `test_store_price` on `POST /v2/projects/{project_id}/products`; a product without one shows 0.

More: [Test Store](../guides/test-store.md).

## Switching from RevenueCat? Keep your SDK and change one line
An app that ships RevenueCat's `purchases_flutter` from pub.dev can keep it on iOS and Android. Call `await Purchases.setProxyURL('https://revenuedot.example.com')` before `Purchases.configure` (`https://api.revenuedot.app` on RevenueDot Cloud). Verification is already `disabled` by default in `purchases_flutter`, so there is nothing else to change. **Flutter web does not work with RevenueCat's package**: its web plugin ignores `setProxyURL`, so web calls still go to RevenueCat. The RevenueDot SDK fixes this.

```dart
import 'dart:io' show Platform;
import 'package:purchases_flutter/purchases_flutter.dart';

// iOS and Android only: RevenueCat's package ignores the proxy URL on Flutter web, so Platform from dart:io is fine here.
Future<void> initPurchases() async {
  // Point the SDK at your RevenueDot server; nothing else in the app changes.
  await Purchases.setProxyURL('https://revenuedot.example.com');
  await Purchases.configure(
    PurchasesConfiguration(Platform.isIOS ? 'appl_...' : 'goog_...'),
    // entitlementVerificationMode stays at its default, EntitlementVerificationMode.disabled.
  );
}
```
- Await `setProxyURL` before `configure`.
- Use each app's public key from RevenueDot, or your old RevenueCat keys if the [importer](../migrate/importer.md) kept them.
- **Keep entitlement verification off.** RevenueCat's package checks signatures with RevenueCat's key. `disabled`, the default, is right for RevenueDot. `informational` logs every response as a failed signature check, and **`enforced` would fail every request**. See [Trusted Entitlements](../guides/trusted-entitlements.md).
- **Or install the RevenueDot SDK in the same release.** The package names stay `purchases_flutter` and `purchases_ui_flutter`, so every import keeps working. See [Install the RevenueDot SDK](#install-the-revenuedot-sdk-and-pass-your-key).

**Sync once** on the first launch of the update, so current subscribers keep access:
```dart
// Once, after this update: send purchases made while the app talked to RevenueCat.
await Purchases.syncPurchases();
```

The whole app change fits in one diff:
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
The full order of steps is in [Migrate from RevenueCat](../migrate/README.md).

## Examples
- [mobile/flutter](https://github.com/revenuedot/examples/tree/main/mobile/flutter): a Flutter paywall app. It is written but has not been analyzed or run on a device yet.

## Related
- [All SDKs](README.md)
- [Hybrid common](hybrid-common.md)
- [Test Store](../guides/test-store.md)
- [What differs from RevenueCat](../migrate/what-differs.md)

---
title: How do I use RevenueDot with Flutter?
description: Await Purchases.setProxyURL before configure on iOS and Android. Flutter web ignores the proxy URL in the stock purchases_flutter package; the RevenueDot fork fixes it.
---

# How do I use RevenueDot with Flutter?

Call `await Purchases.setProxyURL('https://revenuedot.example.com')` before `Purchases.configure`. Verification is already `disabled` by default in `purchases_flutter`, so there is nothing else to change on iOS and Android. **Flutter web does not work in proxy mode with the stock package**: its web plugin ignores `setProxyURL`, so web calls still go to RevenueCat. The RevenueDot fork fixes this.

## Use the RevenueCat SDK you already ship (proxy mode)
```dart
import 'dart:io' show Platform;
import 'package:purchases_flutter/purchases_flutter.dart';

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
- Use each app's public key from RevenueDot, or your old RevenueCat keys if the [importer](../migrate/importer.md) kept them. See [Which key goes where](../concepts/projects-and-apps.md#which-key-goes-where).

**After you migrate from RevenueCat, sync once** on the first launch of the update, so current subscribers keep access:
```dart
// Once, after this update: send purchases made while the app talked to RevenueCat.
await Purchases.syncPurchases();
```

## Use the RevenueDot fork
The fork is [github.com/revenuedot/purchases-flutter](https://github.com/revenuedot/purchases-flutter). The package names stay `purchases_flutter` and `purchases_ui_flutter`, so every `import 'package:purchases_flutter/purchases_flutter.dart'` keeps working. It also **makes `setProxyURL` work on Flutter web**.

**It is not published yet (2026-09-30).** It will ship as a git dependency with release tags `<version>-revenuedot`, because pub.dev names belong to RevenueCat:
```yaml
# pubspec.yaml (planned)
dependencies:
  purchases_flutter:
    git:
      url: https://github.com/revenuedot/purchases-flutter.git
      ref: <version>-revenuedot
```
The patch branch `revenuedot/main-patches` is at version 10.13.2. Pointing `ref` at that branch resolves the Dart package, but iOS and Android builds fail today: the native side needs the `RevenueDotPurchasesHybridCommon` pod and the `app.revenuedot.purchases:purchases-hybrid-common` Maven artifact, which are not published. See [Hybrid common](hybrid-common.md).

## Trusted Entitlements are off by default
- **Stock package:** `entitlementVerificationMode` defaults to `EntitlementVerificationMode.disabled`, which is right for RevenueDot. `informational` logs every response as a failed signature check, and **`enforced` would fail every request**.
- **Fork:** it trusts RevenueDot Cloud's key. A self-hosted server signs with its own key, so keep `disabled`, or build the forks with your own public key.

See [Trusted Entitlements](../guides/trusted-entitlements.md).

## Check an entitlement and make a purchase
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
- **Flutter web** needs the fork, because the stock web plugin ignores the proxy URL.
- Test Store prices show as 0, because the catalog does not store Test Store prices yet.

More: [Test Store](../guides/test-store.md).

## Migrate from RevenueCat
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
- **Coming soon:** a Flutter paywall app, `mobile/flutter` in [revenuedot/examples](https://github.com/revenuedot/examples/tree/main/mobile/flutter). It is not public yet and has not run on a device.

## Related
- [All SDKs](README.md)
- [Hybrid common](hybrid-common.md)
- [Test Store](../guides/test-store.md)
- [What differs from RevenueCat](../migrate/what-differs.md)

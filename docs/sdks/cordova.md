---
title: How do I use RevenueDot with Cordova?
description: Call Purchases.setProxyURL before configureWith. Cordova has no option to turn off signature checks, so it logs a verification failure for every response and still grants access.
---

# How do I use RevenueDot with Cordova?

Call `Purchases.setProxyURL("https://revenuedot.example.com")` before `Purchases.configureWith`. **The Cordova plugin has no option to turn off signature checks**, so the native SDKs log "failed verification" for every RevenueDot response. Access is still granted, because the native default mode is informational.

## Use the RevenueCat SDK you already ship (proxy mode)
```js
document.addEventListener("deviceready", () => {
  // Point the SDK at your RevenueDot server; nothing else in the app changes.
  Purchases.setProxyURL("https://revenuedot.example.com");
  Purchases.configureWith({
    apiKey: device.platform === "iOS" ? "appl_..." : "goog_...",
  });
});
```
- `setProxyURL` returns nothing. Call it before `configureWith`.
- `device.platform` comes from `cordova-plugin-device`.
- Use each app's public key from RevenueDot, or your old RevenueCat keys if the [importer](../migrate/importer.md) kept them. See [Which key goes where](../concepts/projects-and-apps.md#which-key-goes-where).

**After you migrate from RevenueCat, sync once** on the first launch of the update, so current subscribers keep access:
```js
// Once, after this update: send purchases made while the app talked to RevenueCat.
Purchases.syncPurchases();
```

## Use the RevenueDot fork
The fork is [github.com/revenuedot/cordova-plugin-purchases](https://github.com/revenuedot/cordova-plugin-purchases). The plugin id stays `cordova-plugin-purchases` and the global stays `Purchases`, so `config.xml` and your code do not change. Because it trusts RevenueDot's signing key, the verification log noise goes away when your server signs with that key.

**It is not published yet (2026-09-30).** The planned install:
```bash
cordova plugin add @revenuedot/cordova-plugin-purchases
```
The patch branch `revenuedot/main-patches` is at version 8.2.3. It cannot be installed from git yet, because its native dependencies (`RevenueDotPurchasesHybridCommon` 19.4.1 and `app.revenuedot.purchases:purchases-hybrid-common:19.4.1`) are not published. Use proxy mode until then.

## Trusted Entitlements
- **Stock plugin:** `configureWith` takes no verification mode, so the native default, informational, applies. Every RevenueDot response is logged as a failed check, and access is still granted. You cannot turn this off from JavaScript.
- **Fork:** it trusts RevenueDot Cloud's key. A self-hosted server signs with its own key, so the log noise stays unless you build the forks with your own public key.

See [Trusted Entitlements](../guides/trusted-entitlements.md).

## Check an entitlement and make a purchase
The plugin uses callbacks.
```js
Purchases.getCustomerInfo(
  (customerInfo) => {
    const isPro = customerInfo.entitlements.active["pro"] !== undefined;
  },
  (error) => console.error(error)
);

Purchases.getOfferings(
  (offerings) => {
    const aPackage = offerings.current && offerings.current.availablePackages[0];
    if (!aPackage) return;
    Purchases.purchasePackage(
      aPackage,
      ({ customerInfo }) => {
        const nowPro = customerInfo.entitlements.active["pro"] !== undefined;
      },
      ({ error, userCancelled }) => { if (!userCancelled) console.error(error); }
    );
  },
  (error) => console.error(error)
);
```

## Test Store
Create a `test_store` app in RevenueDot and use its `test_...` key on a debug build. The Test Store dialog replaces the store sheet.
- Native SDKs accept `test_` keys only in debug builds.
- iOS: servers older than the 2026-09-30 fix could not serve Test Store products to the native iOS SDK. See [iOS](ios.md#test-store).
- Test Store prices come from each product's Test Store price. Set it in the dashboard (Product catalog, Edit product) or with `test_store_price` on `POST /v2/projects/{project_id}/products`; a product without one shows 0.

More: [Test Store](../guides/test-store.md).

## Migrate from RevenueCat
```diff
 document.addEventListener("deviceready", () => {
+  // Point the SDK at your RevenueDot server; nothing else in the app changes. Call it before configure.
+  Purchases.setProxyURL("https://revenuedot.example.com");
   Purchases.configureWith({ apiKey: device.platform === "iOS" ? "appl_..." : "goog_..." });
+  // Once, after this update: send purchases made while the app talked to RevenueCat.
+  Purchases.syncPurchases();
 });
```
The full order of steps is in [Migrate from RevenueCat](../migrate/README.md).

## Examples
There is no Cordova example yet.

## Related
- [All SDKs](README.md)
- [Hybrid common](hybrid-common.md)
- [Signature verification failed](../help/signature-verification-failed.md)
- [Trusted Entitlements](../guides/trusted-entitlements.md)

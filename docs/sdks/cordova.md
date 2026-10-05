---
title: How do I add in-app purchases to a Cordova app with RevenueDot?
description: Add the RevenueDot SDK with cordova plugin add @revenuedot/cordova-plugin-purchases, then call Purchases.configureWith with your app's key. On RevenueDot Cloud nothing else is needed, and the native SDK verifies each response.
---

# How do I add in-app purchases to a Cordova app with RevenueDot?

Add the RevenueDot SDK with `cordova plugin add @revenuedot/cordova-plugin-purchases`, then call `Purchases.configureWith` with your app's key from RevenueDot. On RevenueDot Cloud nothing else is needed. The native SDK checks each Cloud response against RevenueDot's signing key.

## Install the RevenueDot SDK and pass your key
**Version 8.2.3 is on npm.** The source is [github.com/revenuedot/cordova-plugin-purchases](https://github.com/revenuedot/cordova-plugin-purchases).
```bash
cordova plugin add @revenuedot/cordova-plugin-purchases@8.2.3
```
```js
document.addEventListener("deviceready", () => {
  Purchases.configureWith({
    apiKey: device.platform === "iOS" ? "appl_..." : "goog_...",
  });
});
```
- The RevenueDot SDK is built from RevenueCat's open-source SDK (MIT license), so the plugin id stays `cordova-plugin-purchases` and your code calls the global `Purchases`. It sends every request to RevenueDot and needs no RevenueCat account.
- `device.platform` comes from `cordova-plugin-device`.
- Use each app's public key from RevenueDot, or the `test_...` key for the Test Store. See [Which key goes where](../concepts/projects-and-apps.md#which-key-goes-where).
- **On RevenueDot Cloud** the SDK already calls `https://api.revenuedot.app`, so there is nothing else to set. `configureWith` takes no verification mode, so the native default, informational, applies, and the SDK trusts RevenueDot Cloud's signing key.

Its native side is RevenueDot's [hybrid common](hybrid-common.md) 19.4.1, which is published. Installed from npm, it builds into a cordova-ios 8 app with the `RevenueDotPurchasesHybridCommon` 19.4.1 pod from CocoaPods trunk, and the app carries `api.revenuedot.app` and RevenueDot's signing key. **Xcode 27** rejects pods that target iOS 13, which RevenueCat's own plugin pods do too. Set `<preference name="deployment-target" value="15.0" />` in `config.xml`, and raise the pod targets with a `post_install` block in `platforms/ios/Podfile` (or a Cordova `after_prepare` hook, because `cordova prepare` rewrites the Podfile):
```ruby
post_install do |installer|
  installer.pods_project.targets.each do |t|
    t.build_configurations.each { |c| c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0' }
  end
end
```

**Self-hosting:** call `Purchases.setProxyURL` with your server's address before `configureWith`. It returns nothing. **The Cordova plugin has no option to turn off signature checks.** Your server signs with its own key, which this build does not trust, so the native SDKs log "failed verification" for every response from your server. Access is still granted, because the native default mode is informational. The log noise stays unless you build the SDKs with your own public key; see [Trusted Entitlements](../guides/trusted-entitlements.md).
```js
document.addEventListener("deviceready", () => {
  Purchases.setProxyURL("https://revenuedot.example.com");
  Purchases.configureWith({ apiKey: device.platform === "iOS" ? "appl_..." : "goog_..." });
});
```

## Check an entitlement and make a purchase
Check the entitlement your app unlocks, here `pro`, then buy a package from the current offering, the set of products your paywall shows. The plugin uses callbacks.
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

## Switching from RevenueCat? Keep your SDK and change one line
An app that ships RevenueCat's `cordova-plugin-purchases` can keep it. Call `Purchases.setProxyURL("https://revenuedot.example.com")` before `Purchases.configureWith` (`https://api.revenuedot.app` on RevenueDot Cloud). **RevenueCat's plugin has no option to turn off signature checks**, so the native SDKs log "failed verification" for every RevenueDot response. Access is still granted, because the native default mode is informational.

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
- Use each app's public key from RevenueDot, or your old RevenueCat keys if the [importer](../migrate/importer.md) kept them.
- **The verification log noise cannot be turned off from JavaScript.** `configureWith` takes no verification mode, so the native default, informational, applies. RevenueCat's SDK checks signatures with RevenueCat's key, so every RevenueDot response is logged as a failed check, and access is still granted. See [Signature verification failed](../help/signature-verification-failed.md).
- **Or install the RevenueDot SDK in the same release.** The plugin id stays `cordova-plugin-purchases` and the global stays `Purchases`, so `config.xml` and your code do not change. On RevenueDot Cloud its checks pass. See [Install the RevenueDot SDK](#install-the-revenuedot-sdk-and-pass-your-key).

**Sync once** on the first launch of the update, so current subscribers keep access:
```js
// Once, after this update: send purchases made while the app talked to RevenueCat.
Purchases.syncPurchases();
```

The whole app change fits in one diff:
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

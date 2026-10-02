---
title: How do I use RevenueDot with Capacitor and Ionic?
description: Await Purchases.setProxyURL({ url }) before configure, and pass entitlementVerificationMode DISABLED, because the Capacitor plugin passes no default and the native informational default applies.
---

# How do I use RevenueDot with Capacitor and Ionic?

Call `await Purchases.setProxyURL({ url: "https://revenuedot.example.com" })` before `Purchases.configure`, and pass `entitlementVerificationMode: ENTITLEMENT_VERIFICATION_MODE.DISABLED`. The Capacitor plugin passes no default of its own, so without it the native iOS and Android default (informational) applies and logs every RevenueDot response as a failed signature check.

## Use the RevenueCat SDK you already ship (proxy mode)
```ts
import { Capacitor } from "@capacitor/core";
import { ENTITLEMENT_VERIFICATION_MODE, Purchases } from "@revenuecat/purchases-capacitor";

// Point the SDK at your RevenueDot server; nothing else in the app changes.
await Purchases.setProxyURL({ url: "https://revenuedot.example.com" });
await Purchases.configure({
  apiKey: Capacitor.getPlatform() === "ios" ? "appl_..." : "goog_...",
  // Capacitor passes no default, so the native default (informational signature checks) would apply.
  entitlementVerificationMode: ENTITLEMENT_VERIFICATION_MODE.DISABLED,
});
```
- `setProxyURL` takes an object `{ url }`, not a string. Await it before `configure`.
- Use each app's public key from RevenueDot, or your old RevenueCat keys if the [importer](../migrate/importer.md) kept them. See [Which key goes where](../concepts/projects-and-apps.md#which-key-goes-where).

**After you migrate from RevenueCat, sync once** on the first launch of the update, so current subscribers keep access:
```ts
// Once, after this update: send purchases made while the app talked to RevenueCat.
await Purchases.syncPurchases();
```

## Use the RevenueDot fork
The fork is [github.com/revenuedot/purchases-capacitor](https://github.com/revenuedot/purchases-capacitor). It depends on RevenueDot's [hybrid common](hybrid-common.md) 19.4.1, which is published.

**Version 13.6.1 is built and waiting for its first npm release.** Install it **only through the alias** below. Capacitor derives the native pod and Swift package names from the npm package name, so the alias keeps them as `RevenuecatPurchasesCapacitor`:
```json
{
  "dependencies": {
    "@revenuecat/purchases-capacitor": "npm:@revenuedot/purchases-capacitor@13.6.1",
    "@revenuecat/purchases-capacitor-ui": "npm:@revenuedot/purchases-capacitor-ui@13.6.1"
  }
}
```
Then run `npx cap sync`. Until `@revenuedot/purchases-capacitor` shows up on npm, use proxy mode. The release package builds into a Capacitor 8 iOS app: Swift Package Manager resolves `revenuedot/purchases-hybrid-common` 19.4.1 and `revenuedot/purchases-ios` 5.91.0, and the app binary carries `api.revenuedot.app` and RevenueDot's signing key. The plugin has no web implementation, as upstream.

## Trusted Entitlements
- **Stock plugin:** pass `DISABLED`. The native default, `INFORMATIONAL`, logs every RevenueDot response as a failed check but still grants access. **`ENFORCED` would fail every request.**
- **Fork:** it trusts RevenueDot Cloud's key. A self-hosted server signs with its own key, so keep `DISABLED`, or build the forks with your own public key.

See [Trusted Entitlements](../guides/trusted-entitlements.md).

## Check an entitlement and make a purchase
```ts
const { customerInfo } = await Purchases.getCustomerInfo();
const isPro = customerInfo.entitlements.active["pro"] !== undefined;

const offerings = await Purchases.getOfferings();
const aPackage = offerings.current?.availablePackages[0];
if (aPackage) {
  const result = await Purchases.purchasePackage({ aPackage });
  const nowPro = result.customerInfo.entitlements.active["pro"] !== undefined;
}
```
`getCustomerInfo` resolves to `{ customerInfo }`, and `purchasePackage` takes `{ aPackage }`.

## Test Store
Create a `test_store` app in RevenueDot and use its `test_...` key on a debug build. The Test Store dialog replaces the store sheet.
- Native builds accept `test_` keys only in debug builds. Ship with the `appl_` and `goog_` keys.
- iOS: servers older than the 2026-09-30 fix could not serve Test Store products to the native iOS SDK. See [iOS](ios.md#test-store).
- Test Store prices come from each product's Test Store price. Set it in the dashboard (Product catalog, Edit product) or with `test_store_price` on `POST /v2/projects/{project_id}/products`; a product without one shows 0.

More: [Test Store](../guides/test-store.md).

## Migrate from RevenueCat
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
The full order of steps is in [Migrate from RevenueCat](../migrate/README.md).

## Examples
There is no Capacitor example yet. The [React Native Expo example](https://github.com/revenuedot/examples/tree/main/mobile/react-native-expo) shows the same calls in a JavaScript app.

## Related
- [All SDKs](README.md)
- [Hybrid common](hybrid-common.md)
- [Trusted Entitlements](../guides/trusted-entitlements.md)
- [Test Store](../guides/test-store.md)

---
title: How do I add in-app purchases to a Capacitor or Ionic app with RevenueDot?
description: Install the RevenueDot SDK for Capacitor through its npm alias, run npx cap sync, then call Purchases.configure with your app's key. On RevenueDot Cloud nothing else is needed.
---

# How do I add in-app purchases to a Capacitor or Ionic app with RevenueDot?

Install the RevenueDot SDK for Capacitor through its npm alias, run `npx cap sync`, then call `Purchases.configure` with your app's key from RevenueDot. On RevenueDot Cloud nothing else is needed. The SDK works in Capacitor's iOS and Android apps; it has no web implementation.

## Install the RevenueDot SDK and pass your key
**Version 13.6.1 is on npm** as `@revenuedot/purchases-capacitor`. Install it **only through the alias** below. Capacitor derives the native pod and Swift package names from the npm package name, so the alias keeps them as `RevenuecatPurchasesCapacitor`.
```bash
npm install @revenuecat/purchases-capacitor@npm:@revenuedot/purchases-capacitor@13.6.1
# Only for paywalls:
npm install @revenuecat/purchases-capacitor-ui@npm:@revenuedot/purchases-capacitor-ui@13.6.1
npx cap sync
```
Your `package.json` then reads:
```json
{
  "dependencies": {
    "@revenuecat/purchases-capacitor": "npm:@revenuedot/purchases-capacitor@13.6.1",
    "@revenuecat/purchases-capacitor-ui": "npm:@revenuedot/purchases-capacitor-ui@13.6.1"
  }
}
```
```ts
import { Capacitor } from "@capacitor/core";
import { Purchases } from "@revenuecat/purchases-capacitor";

await Purchases.configure({
  apiKey: Capacitor.getPlatform() === "ios" ? "appl_..." : "goog_...",
});
```
- The RevenueDot SDK is built from RevenueCat's open-source SDK (MIT license), so your code imports `@revenuecat/purchases-capacitor` and calls `Purchases`. It sends every request to RevenueDot and needs no RevenueCat account.
- Use each app's public key from RevenueDot, or the `test_...` key for the Test Store. See [Which key goes where](../concepts/projects-and-apps.md#which-key-goes-where).
- **On RevenueDot Cloud** the SDK already calls `https://api.revenuedot.app`, so there is nothing else to set. It trusts RevenueDot Cloud's response-signing key.
- The source is [github.com/revenuedot/purchases-capacitor](https://github.com/revenuedot/purchases-capacitor). It depends on RevenueDot's [hybrid common](hybrid-common.md) 19.4.1, which is published. Installed from npm, it builds into a Capacitor 8 iOS app: Swift Package Manager resolves `revenuedot/purchases-hybrid-common` 19.4.1 and `revenuedot/purchases-ios` 5.91.0, and the app binary carries `api.revenuedot.app` and RevenueDot's signing key.

**Self-hosting:** await `Purchases.setProxyURL({ url })` with your server's address before `configure`, and pass `entitlementVerificationMode: ENTITLEMENT_VERIFICATION_MODE.DISABLED`. Your server signs with its own key, which this build does not trust. The Capacitor plugin passes no verification mode of its own, so without this line the native default (informational) logs every response from your server as a failed check.
```ts
import { Capacitor } from "@capacitor/core";
import { ENTITLEMENT_VERIFICATION_MODE, Purchases } from "@revenuecat/purchases-capacitor";

// setProxyURL takes an object { url }, not a string. Await it before configure.
await Purchases.setProxyURL({ url: "https://revenuedot.example.com" });
await Purchases.configure({
  apiKey: Capacitor.getPlatform() === "ios" ? "appl_..." : "goog_...",
  entitlementVerificationMode: ENTITLEMENT_VERIFICATION_MODE.DISABLED,
});
```
To verify responses from your own server, build the SDKs with your public key. See [Trusted Entitlements](../guides/trusted-entitlements.md).

## Check an entitlement and make a purchase
Check the entitlement your app unlocks, here `pro`, then buy a package from the current offering, the set of products your paywall shows.
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

## Switching from RevenueCat? Keep your SDK and change one line
An app that ships RevenueCat's `@revenuecat/purchases-capacitor` can keep it. Call `await Purchases.setProxyURL({ url: "https://revenuedot.example.com" })` before `Purchases.configure` (`https://api.revenuedot.app` on RevenueDot Cloud), and pass `entitlementVerificationMode: ENTITLEMENT_VERIFICATION_MODE.DISABLED`.

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
- Use each app's public key from RevenueDot, or your old RevenueCat keys if the [importer](../migrate/importer.md) kept them.
- **Turn entitlement verification off.** RevenueCat's plugin checks signatures with RevenueCat's key. The native default, `INFORMATIONAL`, logs every RevenueDot response as a failed check but still grants access. **`ENFORCED` would fail every request.** See [Trusted Entitlements](../guides/trusted-entitlements.md).
- **Or install the RevenueDot SDK in the same release.** The npm alias keeps every import and the native names. See [Install the RevenueDot SDK](#install-the-revenuedot-sdk-and-pass-your-key).

**Sync once** on the first launch of the update, so current subscribers keep access:
```ts
// Once, after this update: send purchases made while the app talked to RevenueCat.
await Purchases.syncPurchases();
```

The whole app change fits in one diff:
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

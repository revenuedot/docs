---
title: How do I use RevenueDot with React Native and Expo?
description: Await Purchases.setProxyURL before configure. Verification is already off by default in react-native-purchases, and Expo Go and web work with a Test Store key.
---

# How do I use RevenueDot with React Native and Expo?

Call `await Purchases.setProxyURL("https://revenuedot.example.com")` before `Purchases.configure`. That is the whole change: `react-native-purchases` already defaults to `ENTITLEMENT_VERIFICATION_MODE.DISABLED`. It works on iOS and Android builds, and in Expo Go and on the web with a Test Store (`test_`) key.

## Use the RevenueCat SDK you already ship (proxy mode)
```ts
import { Platform } from "react-native";
import Purchases from "react-native-purchases";

// Point the SDK at your RevenueDot server; nothing else in the app changes.
await Purchases.setProxyURL("https://revenuedot.example.com");
Purchases.configure({
  apiKey: Platform.OS === "ios" ? "appl_..." : "goog_...",
  // Leave entitlementVerificationMode unset: DISABLED is the React Native default.
});
```
- `setProxyURL` returns a promise. Await it before `configure`.
- If your code sets `entitlementVerificationMode: ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL` or `ENFORCED`, remove it. See [Trusted Entitlements](#trusted-entitlements-are-off-by-default).
- Use each app's public key from RevenueDot, or your old RevenueCat keys if the [importer](../migrate/importer.md) kept them. See [Which key goes where](../concepts/projects-and-apps.md#which-key-goes-where).

**After you migrate from RevenueCat, sync once** on the first launch of the update. It sends the device's store purchases to RevenueDot, so current subscribers keep access.
```ts
// Once, after this update: send purchases made while the app talked to RevenueCat.
await Purchases.syncPurchasesForResult();
```
`Purchases.syncPurchases()` does the same and returns nothing.

## Use the RevenueDot fork
The fork is [github.com/revenuedot/react-native-purchases](https://github.com/revenuedot/react-native-purchases). It depends on RevenueDot's [hybrid common](hybrid-common.md) builds, which trust RevenueDot's signing key.

**It is not published yet (2026-09-30).** The planned install uses npm aliases, so every `import ... from "react-native-purchases"` stays as it is:
```json
{
  "dependencies": {
    "react-native-purchases": "npm:@revenuedot/react-native-purchases@<version>",
    "react-native-purchases-ui": "npm:@revenuedot/react-native-purchases-ui@<version>"
  }
}
```
The patch branch `revenuedot/main-patches` is at version 10.10.2. Installing it from git does not work yet: it needs `@revenuedot/purchases-typescript-internal`, the `RevenueDotPurchasesHybridCommon` pod and the `app.revenuedot.purchases:purchases-hybrid-common` Maven artifact, and none of them is published. Use proxy mode until then.

## Trusted Entitlements are off by default
- **Stock SDK:** the default is `DISABLED`, which is what you want against RevenueDot. `INFORMATIONAL` logs every response as a failed signature check. **`ENFORCED` would fail every request.**
- **Fork:** it trusts RevenueDot Cloud's key. A self-hosted server signs with its own key, so keep `DISABLED`, or build the forks with your own public key.
- In Expo Go and on the web, the SDK runs in browser mode and does not check signatures.

See [Trusted Entitlements](../guides/trusted-entitlements.md).

## Check an entitlement and make a purchase
```ts
const customerInfo = await Purchases.getCustomerInfo();
const isPro = customerInfo.entitlements.active["pro"] !== undefined;

const offerings = await Purchases.getOfferings();
const pkg = offerings.current?.availablePackages[0];
if (pkg) {
  try {
    const { customerInfo: after } = await Purchases.purchasePackage(pkg);
    const nowPro = after.entitlements.active["pro"] !== undefined;
  } catch (e: any) {
    if (!e.userCancelled) throw e;
  }
}
```

## Test Store
Create a `test_store` app in RevenueDot and use its `test_...` key.
- **Expo Go and web:** `react-native-purchases` runs in browser mode there and only accepts `test_` and `rcb_` keys. RevenueDot accepts only `test_` of those two today. Tap a package, then **Test valid purchase** in the dialog.
- **Native iOS builds:** see the iOS Test Store note in [iOS](ios.md#test-store). Servers older than the 2026-09-30 fix could not serve Test Store products to the native iOS SDK.
- **Native builds** accept `test_` keys only in debug builds. Ship with the `appl_` and `goog_` keys.
- Test Store prices come from each product's Test Store price. Set it in the dashboard (Product catalog, Edit product) or with `test_store_price` on `POST /v2/projects/{project_id}/products`; a product without one shows 0.

More: [Test Store](../guides/test-store.md).

## Migrate from RevenueCat
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
The full order of steps is in [Migrate from RevenueCat](../migrate/README.md).

## Examples
- [mobile/react-native-expo](https://github.com/revenuedot/examples/tree/main/mobile/react-native-expo): an Expo app that loads offerings, buys through the Test Store and shows the entitlement. It was run on the web against RevenueDot; native builds are not verified yet.

## Related
- [All SDKs](README.md)
- [Hybrid common](hybrid-common.md)
- [Test Store](../guides/test-store.md)
- [Trusted Entitlements](../guides/trusted-entitlements.md)

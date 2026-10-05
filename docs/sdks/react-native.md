---
title: How do I add in-app purchases to a React Native or Expo app with RevenueDot?
description: Install the RevenueDot SDK with an npm alias, so your code imports react-native-purchases, then call Purchases.configure with your app's key. On RevenueDot Cloud nothing else is needed. Expo Go and web buy with a Test Store key.
---

# How do I add in-app purchases to a React Native or Expo app with RevenueDot?

Install the RevenueDot SDK for React Native with an npm alias, so your code imports `Purchases` from `"react-native-purchases"`, then call `Purchases.configure` with your app's key from RevenueDot. On RevenueDot Cloud nothing else is needed. It runs in iOS and Android builds. In Expo Go and on the web it runs in browser mode, which buys with a Test Store (`test_`) key.

## Install the RevenueDot SDK and pass your key
**Version 10.10.2 is on npm** as `@revenuedot/react-native-purchases`. The npm alias installs it under the name `react-native-purchases`, so every `import ... from "react-native-purchases"` works. Run the same command in an Expo app.
```bash
npm install react-native-purchases@npm:@revenuedot/react-native-purchases@10.10.2
# Only for paywalls:
npm install react-native-purchases-ui@npm:@revenuedot/react-native-purchases-ui@10.10.2
```
Your `package.json` then reads:
```json
{
  "dependencies": {
    "react-native-purchases": "npm:@revenuedot/react-native-purchases@10.10.2",
    "react-native-purchases-ui": "npm:@revenuedot/react-native-purchases-ui@10.10.2"
  }
}
```
```ts
import { Platform } from "react-native";
import Purchases from "react-native-purchases";

Purchases.configure({
  apiKey: Platform.OS === "ios" ? "appl_..." : "goog_...",
});
```
- The RevenueDot SDK is built from RevenueCat's open-source SDK (MIT license), so your code imports `react-native-purchases` and calls `Purchases`. It sends every request to RevenueDot and needs no RevenueCat account.
- Use each app's public key from RevenueDot, or the `test_...` key for the Test Store. See [Which key goes where](../concepts/projects-and-apps.md#which-key-goes-where).
- **On RevenueDot Cloud** the SDK already calls `https://api.revenuedot.app`, so there is nothing else to set.
- **Entitlement verification is off by default** (`ENTITLEMENT_VERIFICATION_MODE.DISABLED`). In Expo Go and on the web, the SDK runs in browser mode and does not check signatures.
- The source is [github.com/revenuedot/react-native-purchases](https://github.com/revenuedot/react-native-purchases). It depends on RevenueDot's [hybrid common](hybrid-common.md) 19.4.1, which is published (CocoaPods `RevenueDotPurchasesHybridCommon`, Maven `app.revenuedot.purchases:purchases-hybrid-common`, npm `@revenuedot/purchases-typescript-internal`).

Installed from npm into the [Expo example](https://github.com/revenuedot/examples/tree/main/mobile/react-native-expo) and run on the web against a RevenueDot server, it passes configure, customer info, offerings, a Test Store purchase and the `pro` entitlement turning active, with every request going to the server.

**Self-hosting:** await `Purchases.setProxyURL` with your server's address before `configure`. Leave the verification mode at its default, `DISABLED`, because your server signs with its own key, which this build does not trust.
```ts
import { Platform } from "react-native";
import Purchases from "react-native-purchases";

// setProxyURL returns a promise. Await it before configure.
await Purchases.setProxyURL("https://revenuedot.example.com");
Purchases.configure({ apiKey: Platform.OS === "ios" ? "appl_..." : "goog_..." });
```
To verify responses from your own server, build the SDKs with your public key. See [Trusted Entitlements](../guides/trusted-entitlements.md).

## Check an entitlement and make a purchase
Check the entitlement your app unlocks, here `pro`, then buy a package from the current offering, the set of products your paywall shows.
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

## Switching from RevenueCat? Keep your SDK and change one line
An app that ships RevenueCat's `react-native-purchases` can keep it. Call `await Purchases.setProxyURL("https://revenuedot.example.com")` before `Purchases.configure` (`https://api.revenuedot.app` on RevenueDot Cloud). That is the whole change: `react-native-purchases` already defaults to `ENTITLEMENT_VERIFICATION_MODE.DISABLED`. It works on iOS and Android builds, and in Expo Go and on the web with a Test Store (`test_`) key.

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
- Use each app's public key from RevenueDot, or your old RevenueCat keys if the [importer](../migrate/importer.md) kept them.
- **Keep entitlement verification off.** RevenueCat's SDK checks signatures with RevenueCat's key. `DISABLED`, the default, is what you want against RevenueDot. `INFORMATIONAL` logs every response as a failed signature check, and **`ENFORCED` would fail every request**. If your code sets either one, remove it. See [Trusted Entitlements](../guides/trusted-entitlements.md).
- **Or install the RevenueDot SDK in the same release.** The npm alias keeps every import. See [Install the RevenueDot SDK](#install-the-revenuedot-sdk-and-pass-your-key).

**Sync once** on the first launch of the update. It sends the device's store purchases to RevenueDot, so current subscribers keep access.
```ts
// Once, after this update: send purchases made while the app talked to RevenueCat.
await Purchases.syncPurchasesForResult();
```
`Purchases.syncPurchases()` does the same and returns nothing.

The whole app change fits in one diff:
```diff
 import { Platform } from "react-native";
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

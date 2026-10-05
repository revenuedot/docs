---
title: How do I add in-app purchases to a Unity game with RevenueDot?
description: Add the RevenueDot SDK for Unity from OpenUPM, put the Purchases component on a GameObject and fill in your app's keys. On RevenueDot Cloud nothing else is needed; a self-hosted server also goes in the Proxy URL field.
---

# How do I add in-app purchases to a Unity game with RevenueDot?

Add the RevenueDot SDK for Unity from OpenUPM, put the **Purchases** component on a GameObject, and fill in your app's Apple and Google keys from RevenueDot in the Inspector. On RevenueDot Cloud nothing else is needed. A self-hosted server also goes in the component's **Proxy URL** field.

## Install the RevenueDot SDK and pass your key
**Version 9.11.1 is on [OpenUPM](https://openupm.com/packages/com.revenuedot.purchases-unity/).** The source is [github.com/revenuedot/purchases-unity](https://github.com/revenuedot/purchases-unity).
```bash
openupm add com.revenuedot.purchases-unity
```
Or, without OpenUPM, open **Window > Package Manager > + > Add package from git URL** and enter:
```
https://github.com/revenuedot/purchases-unity.git?path=RevenueCat#9.11.1-revenuedot
```
The paywall package (`RevenueCatUI` folder) installs from git, as upstream. The External Dependency Manager pulls the native side, RevenueDot's [hybrid common](hybrid-common.md) 19.4.1: the `RevenueDotPurchasesHybridCommon` pod and `app.revenuedot.purchases:purchases-hybrid-common`. We have not run the package in the Unity editor yet.

Then, on the GameObject with the **Purchases** component, set these Inspector fields:

| Inspector field | RevenueDot Cloud | Self-hosted server |
|---|---|---|
| Revenue Cat API Key Apple / Google | the `appl_` and `goog_` keys from RevenueDot | the same |
| Proxy URL (under **Advanced**) | empty | `https://revenuedot.example.com` |
| Entitlement Verification Mode | the default | Disabled |

- The RevenueDot SDK is built from RevenueCat's open-source SDK (MIT license), so the component and the C# namespace keep RevenueCat's names (`using RevenueCat;`) and your code calls `Purchases`. It sends every request to RevenueDot and needs no RevenueCat account.
- **On RevenueDot Cloud** the SDK already calls `https://api.revenuedot.app`, so leave **Proxy URL** empty. It trusts RevenueDot Cloud's response-signing key.
- **Self-hosting:** set **Proxy URL** to your server and **Entitlement Verification Mode** to **Disabled**. Your server signs with its own key, which this build does not trust, so the default (Informational) would log every response as a failed check. To verify against your own server, build the SDKs with your public key. See [Trusted Entitlements](../guides/trusted-entitlements.md).
- Unity has no public `SetProxyURL` method, so the field is the only way to set the proxy. The component applies it before it configures the SDK, also when you configure from code.

**Configure from code** if you prefer (**Use Runtime Setup** checked). The Proxy URL field still applies: `Purchases.Start()` sets it before it checks that box. The field's tooltip says otherwise, but the code applies it. Your script must run after `Purchases.Start()`, which also creates the native wrapper; calling `Configure` before it throws a `NullReferenceException`. `[DefaultExecutionOrder(100)]` makes Unity call your `Start()` after it.
```csharp
using UnityEngine;

// Runs after Purchases.Start(), which creates the native wrapper and applies the Proxy URL field.
[DefaultExecutionOrder(100)]
[RequireComponent(typeof(Purchases))]
public class Store : MonoBehaviour
{
    void Start()
    {
        // Needs "Use Runtime Setup" checked on the Purchases component.
        var purchases = GetComponent<Purchases>();
        purchases.Configure(Purchases.PurchasesConfiguration.Builder.Init("appl_...")
            // Only when you self-host: your server signs with its own key. On RevenueDot Cloud, leave this line out.
            .SetEntitlementVerificationMode(Purchases.EntitlementVerificationMode.Disabled)
            .Build());
    }
}
```

## Check an entitlement and make a purchase
Check the entitlement your app unlocks, here `pro`, then buy a package from the current offering, the set of products your paywall shows.
```csharp
var purchases = GetComponent<Purchases>();

purchases.GetCustomerInfo((customerInfo, error) =>
{
    if (error != null) return;
    bool isPro = customerInfo.Entitlements.Active.ContainsKey("pro");
});

purchases.GetOfferings((offerings, error) =>
{
    if (error != null || offerings.Current == null) return;
    var package = offerings.Current.AvailablePackages[0];
    purchases.PurchasePackage(package, result =>
    {
        if (result.UserCancelled || result.Error != null) return;
        bool nowPro = result.CustomerInfo.Entitlements.Active.ContainsKey("pro");
    });
});
```

## Test Store
Create a `test_store` app in RevenueDot and use its `test_...` key.
- Purchases only run on an iOS or Android device or simulator. In the Unity Editor the SDK uses a no-op wrapper and makes no requests.
- Native SDKs accept `test_` keys only in debug builds.
- iOS: servers older than the 2026-09-30 fix could not serve Test Store products to the native iOS SDK. See [iOS](ios.md#test-store).
- Test Store prices come from each product's Test Store price. Set it in the dashboard (Product catalog, Edit product) or with `test_store_price` on `POST /v2/projects/{project_id}/products`; a product without one shows 0.

More: [Test Store](../guides/test-store.md).

## Switching from RevenueCat? Keep your SDK and change one line
A game that ships RevenueCat's Unity SDK can keep it. In the Inspector, on the GameObject with the **Purchases** component, set **Proxy URL** to RevenueDot (`https://api.revenuedot.app` on RevenueDot Cloud, or your own server) and **Entitlement Verification Mode** to **Disabled**.

| Inspector field | Before | After |
|---|---|---|
| Proxy URL (under **Advanced**) | empty | `https://revenuedot.example.com` |
| Entitlement Verification Mode | Informational | Disabled |
| Revenue Cat API Key Apple / Google | your RevenueCat keys | the `appl_` and `goog_` keys from RevenueDot, or the RevenueCat keys if the [importer](../migrate/importer.md) kept them |

- **Turn entitlement verification off.** RevenueCat's SDK checks signatures with RevenueCat's key. The Inspector offers **Disabled** and **Informational**, and the default is Informational. It logs every RevenueDot response as a failed check but still grants access. Choose **Disabled**. See [Trusted Entitlements](../guides/trusted-entitlements.md).
- **Or install the RevenueDot SDK in the same release.** C# namespaces and assembly names stay the same, so `using RevenueCat;` keeps working. See [Install the RevenueDot SDK](#install-the-revenuedot-sdk-and-pass-your-key).

**Sync once** on the first launch of the update, so current subscribers keep access:
```csharp
// Once, after this update: send purchases made while the app talked to RevenueCat.
GetComponent<Purchases>().SyncPurchases();
```

If you configure from code, the whole change fits in one diff:
```diff
 var purchases = GetComponent<Purchases>();
-purchases.Configure(Purchases.PurchasesConfiguration.Builder.Init("appl_...").Build());
+purchases.Configure(Purchases.PurchasesConfiguration.Builder.Init("appl_...")
+    .SetEntitlementVerificationMode(Purchases.EntitlementVerificationMode.Disabled)
+    .Build());
+// Once, after this update: send purchases made while the app talked to RevenueCat.
+purchases.SyncPurchases();
```
The full order of steps is in [Migrate from RevenueCat](../migrate/README.md).

## Examples
There is no Unity example yet.

## Related
- [All SDKs](README.md)
- [Hybrid common](hybrid-common.md)
- [Trusted Entitlements](../guides/trusted-entitlements.md)
- [Test Store](../guides/test-store.md)

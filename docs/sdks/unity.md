---
title: How do I use RevenueDot with Unity?
description: Fill in the Proxy URL field on the Purchases component and set Entitlement Verification Mode to Disabled in the Inspector. Unity has no public SetProxyURL method.
---

# How do I use RevenueDot with Unity?

In the Inspector, on the GameObject with the **Purchases** component, set **Proxy URL** to your RevenueDot server and **Entitlement Verification Mode** to **Disabled**. Unity has no public `SetProxyURL` method, so the field is the only way to set the proxy. The component applies it before it configures the SDK, also when you configure from code.

## Use the RevenueCat SDK you already ship (proxy mode)
| Inspector field | Before | After |
|---|---|---|
| Proxy URL (under **Advanced**) | empty | `https://revenuedot.example.com` |
| Entitlement Verification Mode | Informational | Disabled |
| Revenue Cat API Key Apple / Google | your RevenueCat keys | the `appl_` and `goog_` keys from RevenueDot, or the RevenueCat keys if the [importer](../migrate/importer.md) kept them |

If you configure at runtime (**Use Runtime Setup** checked), the Proxy URL field still applies: `Purchases.Start()` sets it before it checks that box. The field's tooltip says otherwise, but the code applies it. Your script must run after `Purchases.Start()`, which also creates the native wrapper; calling `Configure` before it throws a `NullReferenceException`. `[DefaultExecutionOrder(100)]` makes Unity call your `Start()` after it.
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
        // The proxy URL comes from the Proxy URL field on that component.
        var purchases = GetComponent<Purchases>();
        purchases.Configure(Purchases.PurchasesConfiguration.Builder.Init("appl_...")
            // The default (Informational) logs every RevenueDot response as a failed signature check.
            .SetEntitlementVerificationMode(Purchases.EntitlementVerificationMode.Disabled)
            .Build());
    }
}
```

**After you migrate from RevenueCat, sync once** on the first launch of the update, so current subscribers keep access:
```csharp
// Once, after this update: send purchases made while the app talked to RevenueCat.
GetComponent<Purchases>().SyncPurchases();
```

## Use the RevenueDot fork
The fork is [github.com/revenuedot/purchases-unity](https://github.com/revenuedot/purchases-unity). C# namespaces and assembly names stay the same, so `using RevenueCat;` keeps working. Its native dependencies are RevenueDot's [hybrid common](hybrid-common.md) builds, pulled in by the External Dependency Manager (EDM4U).

**It is not published yet (2026-09-30).** The planned install is from OpenUPM:
```bash
openupm add com.revenuedot.purchases-unity
openupm add com.revenuedot.purchases-ui-unity   # paywalls, optional
```
The patch branch `revenuedot/main-patches` is at version 9.11.1. It cannot build a working app yet, because its native dependencies (`RevenueDotPurchasesHybridCommon` 19.4.1 and `app.revenuedot.purchases:purchases-hybrid-common:19.4.1`) are not published. Use proxy mode until then.

## Trusted Entitlements
- **Stock SDK:** the Inspector offers **Disabled** and **Informational**, and the default is Informational. It logs every RevenueDot response as a failed check but still grants access. Choose **Disabled**.
- **Fork:** it trusts RevenueDot Cloud's key. A self-hosted server signs with its own key, so keep Disabled, or build the forks with your own public key.

See [Trusted Entitlements](../guides/trusted-entitlements.md).

## Check an entitlement and make a purchase
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
- Test Store prices show as 0, because the catalog does not store Test Store prices yet.

More: [Test Store](../guides/test-store.md).

## Migrate from RevenueCat
In the Inspector:

| Field | Before | After |
|---|---|---|
| Proxy URL | (empty) | `https://revenuedot.example.com` |
| Entitlement Verification Mode | Informational | Disabled |

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

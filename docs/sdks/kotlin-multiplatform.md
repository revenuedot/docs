---
title: How do I add in-app purchases to a Kotlin Multiplatform app with RevenueDot?
description: Add app.revenuedot.purchases:purchases-kmp-core from Maven Central to commonMain, then call Purchases.configure with your app's key in common code. On RevenueDot Cloud nothing else is needed on Android or iOS.
---

# How do I add in-app purchases to a Kotlin Multiplatform app with RevenueDot?

Add the RevenueDot SDK, `app.revenuedot.purchases:purchases-kmp-core`, from Maven Central to `commonMain`, then call `Purchases.configure` with your app's key in common code. On RevenueDot Cloud nothing else is needed on Android or iOS.

## Install the RevenueDot SDK and pass your key
**Version 3.10.1 is on Maven Central.** The source is [github.com/revenuedot/purchases-kmp](https://github.com/revenuedot/purchases-kmp).
```kotlin
// build.gradle.kts, commonMain
implementation("app.revenuedot.purchases:purchases-kmp-core:3.10.1")
implementation("app.revenuedot.purchases:purchases-kmp-ui:3.10.1") // only if you use paywalls
```
```kotlin
import com.revenuecat.purchases.kmp.Purchases
import com.revenuecat.purchases.kmp.PurchasesConfiguration

fun initPurchases(apiKey: String) {
    Purchases.configure(PurchasesConfiguration(apiKey))
}
```
- The RevenueDot SDK is built from RevenueCat's open-source SDK (MIT license), so your code imports `com.revenuecat.purchases.kmp.*` and calls `Purchases`. It sends every request to RevenueDot and needs no RevenueCat account.
- Pass the `appl_...` key on iOS and the `goog_...` key on Android, from RevenueDot. See [Which key goes where](../concepts/projects-and-apps.md#which-key-goes-where).
- **On RevenueDot Cloud** the SDK already calls `https://api.revenuedot.app`, so there is nothing else to set.
- **Entitlement verification is off by default** (`EntitlementVerificationMode.DISABLED`).
- Its Android side is RevenueDot's purchases-android 10.22.1 from Maven Central, and its iOS side compiles RevenueDot's purchases-ios 5.90.2. Its iOS library on Maven Central embeds `api.revenuedot.app` and RevenueDot's signing key, with no RevenueCat host.

**Self-hosting:** set `Purchases.proxyURL` to your server before `configure`. In `purchases-kmp` the proxy URL is a `String`, not a `URL`, and it applies to both the Android and the iOS targets. Keep the verification mode at `DISABLED`, because your server signs with its own key, which this build does not trust.
```kotlin
import com.revenuecat.purchases.kmp.models.EntitlementVerificationMode

fun initPurchases(apiKey: String) {
    Purchases.proxyURL = "https://revenuedot.example.com"
    Purchases.configure(PurchasesConfiguration(apiKey) {
        // DISABLED is the KMP default; keep it, because your server signs with its own key.
        verificationMode = EntitlementVerificationMode.DISABLED
    })
}
```
To verify responses from your own server, build the SDKs with your public key. See [Trusted Entitlements](../guides/trusted-entitlements.md).

## Check an entitlement and make a purchase
Check the entitlement your app unlocks, here `pro`, then buy a package from the current offering, the set of products your paywall shows.
```kotlin
import com.revenuecat.purchases.kmp.ktx.awaitCustomerInfo
import com.revenuecat.purchases.kmp.ktx.awaitOfferings
import com.revenuecat.purchases.kmp.ktx.awaitPurchase

val customerInfo = Purchases.sharedInstance.awaitCustomerInfo()
val isPro = customerInfo.entitlements.active.containsKey("pro")

val offerings = Purchases.sharedInstance.awaitOfferings()
val pkg = offerings.current?.availablePackages?.firstOrNull() ?: return
val result = Purchases.sharedInstance.awaitPurchase(pkg)
val nowPro = result.customerInfo.entitlements.active.containsKey("pro")
```
`awaitPurchase` throws `PurchasesTransactionException` when the purchase fails or the user cancels; check its `userCancelled`.

## Test Store
Create a `test_store` app in RevenueDot and pass its `test_...` key on a debug build. The Test Store dialog replaces the store sheet.
- Native SDKs accept `test_` keys only in debug builds.
- iOS: servers older than the 2026-09-30 fix could not serve Test Store products to the native iOS SDK. See [iOS](ios.md#test-store).
- Test Store prices come from each product's Test Store price. Set it in the dashboard (Product catalog, Edit product) or with `test_store_price` on `POST /v2/projects/{project_id}/products`; a product without one shows 0.

More: [Test Store](../guides/test-store.md).

## Switching from RevenueCat? Keep your SDK and change one line
An app that ships RevenueCat's `purchases-kmp` can keep it. Set `Purchases.proxyURL = "https://revenuedot.example.com"` in common code before `Purchases.configure` (`https://api.revenuedot.app` on RevenueDot Cloud). The default verification mode is already `EntitlementVerificationMode.DISABLED`, so nothing else changes on Android or iOS.

```kotlin
import com.revenuecat.purchases.kmp.Purchases
import com.revenuecat.purchases.kmp.PurchasesConfiguration
import com.revenuecat.purchases.kmp.models.EntitlementVerificationMode

fun initPurchases(apiKey: String) {
    // Point the SDK at your RevenueDot server; nothing else in the app changes.
    Purchases.proxyURL = "https://revenuedot.example.com"
    Purchases.configure(PurchasesConfiguration(apiKey) {
        // DISABLED is the KMP default; keep it, RevenueDot does not sign responses with RevenueCat's key.
        verificationMode = EntitlementVerificationMode.DISABLED
    })
}
```
- Set `proxyURL` before `configure`. It applies to both the Android and the iOS targets.
- Pass the `appl_...` key on iOS and the `goog_...` key on Android, from RevenueDot or kept by the [importer](../migrate/importer.md).
- **Keep entitlement verification off.** RevenueCat's SDK checks signatures with RevenueCat's key. `DISABLED`, the default, is right for RevenueDot. `INFORMATIONAL` logs every response as a failed check, and **`ENFORCED` would fail every request**. See [Trusted Entitlements](../guides/trusted-entitlements.md).
- On Android, RevenueCat's native SDK underneath still sends diagnostics, paywall events and ad events to RevenueCat. See [Android](android.md).
- **Or install the RevenueDot SDK in the same release.** Kotlin packages stay `com.revenuecat.purchases.kmp.*`, so imports do not change. See [Install the RevenueDot SDK](#install-the-revenuedot-sdk-and-pass-your-key).

**Sync once** on the first launch of the update, so current subscribers keep access:
```kotlin
// Once, after this update: send purchases made while the app talked to RevenueCat.
Purchases.sharedInstance.awaitSyncPurchases()
```
`awaitSyncPurchases` is a suspend function in `com.revenuecat.purchases.kmp.ktx`. The callback form is `syncPurchases(onError = { }, onSuccess = { })`.

The whole app change fits in one diff:
```diff
 fun initPurchases(apiKey: String) {
+    // Point the SDK at your RevenueDot server; nothing else in the app changes. A String, set before configure.
+    Purchases.proxyURL = "https://revenuedot.example.com"
     Purchases.configure(PurchasesConfiguration(apiKey) {
+        // DISABLED is the KMP default; keep it, RevenueDot does not sign responses with RevenueCat's key.
+        verificationMode = EntitlementVerificationMode.DISABLED
     })
+    // Once, after this update (from a coroutine): send purchases made while the app talked to RevenueCat.
+    // Purchases.sharedInstance.awaitSyncPurchases()
 }
```
The full order of steps is in [Migrate from RevenueCat](../migrate/README.md).

## Examples
There is no Kotlin Multiplatform example yet. The calls match the [Android](android.md) guide.

## Related
- [All SDKs](README.md)
- [Android](android.md)
- [iOS](ios.md)
- [Trusted Entitlements](../guides/trusted-entitlements.md)

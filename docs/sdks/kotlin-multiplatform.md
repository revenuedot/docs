---
title: How do I use RevenueDot with Kotlin Multiplatform?
description: Set Purchases.proxyURL, a String, before Purchases.configure in common code. purchases-kmp already defaults to EntitlementVerificationMode.DISABLED, so nothing else changes.
---

# How do I use RevenueDot with Kotlin Multiplatform?

Set `Purchases.proxyURL = "https://revenuedot.example.com"` in common code before `Purchases.configure`. In `purchases-kmp` the proxy URL is a `String`, not a `URL`. The default verification mode is already `EntitlementVerificationMode.DISABLED`, so nothing else changes on Android or iOS.

## Use the RevenueCat SDK you already ship (proxy mode)
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
- Pass the `appl_...` key on iOS and the `goog_...` key on Android, from RevenueDot or kept by the [importer](../migrate/importer.md). See [Which key goes where](../concepts/projects-and-apps.md#which-key-goes-where).
- On Android, the stock native SDK underneath still sends diagnostics, paywall events and ad events to RevenueCat. See [Android](android.md).

**After you migrate from RevenueCat, sync once** on the first launch of the update, so current subscribers keep access:
```kotlin
// Once, after this update: send purchases made while the app talked to RevenueCat.
Purchases.sharedInstance.awaitSyncPurchases()
```
`awaitSyncPurchases` is a suspend function in `com.revenuecat.purchases.kmp.ktx`. The callback form is `syncPurchases(onError = { }, onSuccess = { })`.

## Use the RevenueDot fork
The fork is [github.com/revenuedot/purchases-kmp](https://github.com/revenuedot/purchases-kmp). Kotlin packages stay `com.revenuecat.purchases.kmp.*`. It builds its iOS side from RevenueDot's purchases-ios fork (a git submodule at 5.91.0) and its Android side from RevenueDot's Android fork, so both trust RevenueDot's signing key and send events to your proxy URL.

**It is not published yet (2026-09-30).** The planned Maven coordinates:
```kotlin
// build.gradle.kts, commonMain dependencies (planned; not on Maven Central yet)
implementation("app.revenuedot.purchases:purchases-kmp-core:<version>")
implementation("app.revenuedot.purchases:purchases-kmp-ui:<version>") // paywalls, optional
```
The other published modules are `purchases-kmp-models`, `-mappings`, `-either` and `-result`; `-core` pulls in what it needs. The patch branch `revenuedot/main-patches` is at `3.11.0-SNAPSHOT`. Building it today needs the unpublished Android fork (`app.revenuedot.purchases:purchases`) in a local Maven repository first, so proxy mode is the practical choice until the release.

## Trusted Entitlements are off by default
- **Stock SDK:** the default is `DISABLED`, which is right for RevenueDot. `INFORMATIONAL` logs every response as a failed check, and **`ENFORCED` would fail every request**.
- **Fork:** it trusts RevenueDot Cloud's key. A self-hosted server signs with its own key, so keep `DISABLED`, or build the forks with your own public key.

See [Trusted Entitlements](../guides/trusted-entitlements.md).

## Check an entitlement and make a purchase
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
- Test Store prices show as 0, because the catalog does not store Test Store prices yet.

More: [Test Store](../guides/test-store.md).

## Migrate from RevenueCat
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

---
title: How do I use RevenueDot with the Android SDK?
description: Set Purchases.proxyURL before configure and set EntitlementVerificationMode.DISABLED. The stock SDK still sends diagnostics, paywall and ad events to RevenueCat; the fork fixes that.
---

# How do I use RevenueDot with the Android SDK?

Set `Purchases.proxyURL` to your RevenueDot server before `Purchases.configure`, and set `EntitlementVerificationMode.DISABLED`. Purchases, customer info and offerings then go to RevenueDot. **The stock Android SDK still sends diagnostics, paywall events and ad events to RevenueCat's hosts**, even with a proxy URL; the RevenueDot fork sends them to your server.

## Use the RevenueCat SDK you already ship (proxy mode)
```kotlin
import com.revenuecat.purchases.EntitlementVerificationMode
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesConfiguration
import java.net.URL

class MainApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Point the SDK at your RevenueDot server; nothing else in the app changes.
        Purchases.proxyURL = URL("https://revenuedot.example.com")
        Purchases.configure(
            PurchasesConfiguration.Builder(this, "goog_...")
                // The default (INFORMATIONAL) logs every RevenueDot response as a failed signature check.
                .entitlementVerificationMode(EntitlementVerificationMode.DISABLED)
                .build()
        )
    }
}
```
- Set `proxyURL` **before** `configure`.
- Use the app's `goog_...` key from RevenueDot, or your old RevenueCat key if the [importer](../migrate/importer.md) kept it. See [Which key goes where](../concepts/projects-and-apps.md#which-key-goes-where).
- The Android emulator reaches your computer at `http://10.0.2.2:8787`. Plain `http` also needs a network security config that allows cleartext traffic to that host.

**After you migrate from RevenueCat, call `syncPurchases()` once** on the first launch of the update. It sends the device's Google Play purchases, with their purchase tokens, to RevenueDot. That is also how RevenueDot gets any purchase token the importer could not find.
```kotlin
// Once, after this update: send purchases made while the app talked to RevenueCat.
Purchases.sharedInstance.syncPurchases()
```

## Use the RevenueDot fork
The fork is [github.com/revenuedot/purchases-android](https://github.com/revenuedot/purchases-android). Kotlin packages stay `com.revenuecat.purchases.*`, so imports do not change. On top of the new default host and signing key, it makes **diagnostics, paywall events and ad events follow `proxyURL`**.

**It is not published yet (2026-09-30).** The planned Maven coordinates keep the upstream artifact ids under a new group:
```kotlin
// build.gradle.kts (planned; not on Maven Central yet)
implementation("app.revenuedot.purchases:purchases:<version>")
implementation("app.revenuedot.purchases:purchases-ui:<version>") // only if you use RevenueCat UI
```
Versions match upstream. The patch branch `revenuedot/main-patches` is at `10.24.0-SNAPSHOT`.

**To try it today**, build it into your local Maven repository. We have not tested this path ourselves.
```bash
git clone -b revenuedot/main-patches https://github.com/revenuedot/purchases-android
cd purchases-android
./gradlew :purchases:publishToMavenLocal
```
Then add `mavenLocal()` to your repositories and depend on `app.revenuedot.purchases:purchases:10.24.0-SNAPSHOT`. Keep setting `Purchases.proxyURL` while `api.revenuedot.app` is not live, and whenever you self-host.

## Trusted Entitlements
- **Stock SDK:** it checks signatures with RevenueCat's key, so RevenueDot responses read as failed. The default, `INFORMATIONAL`, logs the failure and still grants access. Set `DISABLED`. **Never use `ENFORCED` with the stock SDK**: every request would fail.
- **Fork:** it trusts RevenueDot Cloud's key. A self-hosted server signs with its own key, so keep `DISABLED` or `INFORMATIONAL`, or build the fork with your own public key.

See [Trusted Entitlements](../guides/trusted-entitlements.md).

## Check an entitlement and make a purchase
The API is RevenueCat's, unchanged. These are the coroutine helpers.
```kotlin
val customerInfo = Purchases.sharedInstance.awaitCustomerInfo()
val isPro = customerInfo.entitlements["pro"]?.isActive == true

val offerings = Purchases.sharedInstance.awaitOfferings()
val pkg = offerings.current?.availablePackages?.firstOrNull() ?: return
try {
    val result = Purchases.sharedInstance.awaitPurchase(PurchaseParams.Builder(activity, pkg).build())
    val nowPro = result.customerInfo.entitlements["pro"]?.isActive == true
} catch (e: PurchasesTransactionException) {
    if (e.userCancelled) return
}
```
The purchase goes to `POST /v1/receipts` with the Google Play purchase token. RevenueDot verifies it with Google, which needs the app's service account. See [Connect Google Play](../guides/google-play.md).

## Test Store
Create a `test_store` app in RevenueDot and pass its `test_...` key to `configure`. The SDK shows a Test Store dialog instead of Google Play's purchase sheet.
- **Test Store keys only work in debug builds.** In a release build the SDK shows an error screen and stops the app on purpose. Ship with the `goog_` key.
- Test Store prices come from each product's Test Store price. Set it in the dashboard (Product catalog, Edit product) or with `test_store_price` on `POST /v2/projects/{project_id}/products`; a product without one shows 0.
- For Google Play test tracks and license testers, see [Sandbox testing](../guides/sandbox-testing.md).

More: [Test Store](../guides/test-store.md).

## Migrate from RevenueCat
```diff
 override fun onCreate() {
     super.onCreate()
+    // Point the SDK at your RevenueDot server; nothing else in the app changes. Must be set before configure.
+    Purchases.proxyURL = URL("https://revenuedot.example.com")
     Purchases.configure(
         PurchasesConfiguration.Builder(this, "goog_...")
+            // The default (INFORMATIONAL) logs every RevenueDot response as failed signature verification.
+            .entitlementVerificationMode(EntitlementVerificationMode.DISABLED)
             .build()
     )
+    // Once, after this update: send purchases made while the app talked to RevenueCat.
+    Purchases.sharedInstance.syncPurchases()
 }
```
The full order of steps is in [Migrate from RevenueCat](../migrate/README.md).

## Examples
- **Coming soon:** a Jetpack Compose paywall app, `mobile/android-compose` in [revenuedot/examples](https://github.com/revenuedot/examples/tree/main/mobile/android-compose). It is not public yet.

## Related
- [All SDKs](README.md)
- [Connect Google Play](../guides/google-play.md)
- [Trusted Entitlements](../guides/trusted-entitlements.md)
- [What differs from RevenueCat](../migrate/what-differs.md)

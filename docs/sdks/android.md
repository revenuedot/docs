---
title: How do I add in-app purchases to an Android app with RevenueDot?
description: Add app.revenuedot.purchases:purchases from Maven Central and call Purchases.configure with your app's key in Application.onCreate(). On RevenueDot Cloud nothing else is needed, and diagnostics and events go to RevenueDot too.
---

# How do I add in-app purchases to an Android app with RevenueDot?

Add the RevenueDot SDK, `app.revenuedot.purchases:purchases`, from Maven Central, then call `Purchases.configure` in `Application.onCreate()` with your app's key from RevenueDot. On RevenueDot Cloud nothing else is needed. Purchases, customer info, offerings, diagnostics, paywall events and ad events all go to RevenueDot.

## Install the RevenueDot SDK and pass your key
**It is on Maven Central** under the group `app.revenuedot.purchases`, with upstream's artifact ids and version numbers (10.23.3 is the newest; 10.23.0 and 10.22.1 are there for the wrappers that pin them). The source is [github.com/revenuedot/purchases-android](https://github.com/revenuedot/purchases-android).
```kotlin
// build.gradle.kts
implementation("app.revenuedot.purchases:purchases:10.23.3")
implementation("app.revenuedot.purchases:purchases-ui:10.23.3") // only for paywalls
```
```kotlin
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesConfiguration

class MainApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        Purchases.configure(PurchasesConfiguration.Builder(this, "goog_...").build())
    }
}
```
- The RevenueDot SDK is built from RevenueCat's open-source SDK (MIT license), so your code imports `com.revenuecat.purchases.*` and calls `Purchases`. It sends every request to RevenueDot and needs no RevenueCat account.
- Use the app's `goog_...` key from RevenueDot, or `test_...` for the Test Store. See [Which key goes where](../concepts/projects-and-apps.md#which-key-goes-where).
- **On RevenueDot Cloud** the SDK already calls `https://api.revenuedot.app`, so there is nothing else to set. It trusts RevenueDot Cloud's response-signing key.

**Self-hosting:** set `Purchases.proxyURL` to your server **before** `configure`, and set `EntitlementVerificationMode.DISABLED`. Your server signs with its own key, which this build does not trust. Diagnostics, paywall events and ad events follow the proxy URL to your server.
```kotlin
import com.revenuecat.purchases.EntitlementVerificationMode
import java.net.URL

Purchases.proxyURL = URL("https://revenuedot.example.com")
Purchases.configure(
    PurchasesConfiguration.Builder(this, "goog_...")
        // A self-hosted server signs with its own key; keep DISABLED (or INFORMATIONAL) unless you build the SDK with that key.
        .entitlementVerificationMode(EntitlementVerificationMode.DISABLED)
        .build()
)
```
- The Android emulator reaches your computer at `http://10.0.2.2:8787`. Plain `http` also needs a network security config that allows cleartext traffic to that host.
- To get verified responses from your own server, build the SDK with your public key. See [Trusted Entitlements](../guides/trusted-entitlements.md).

## Check an entitlement and make a purchase
Check the entitlement your app unlocks, here `pro`, then buy a package from the current offering, the set of products your paywall shows. These are the coroutine helpers.
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

## Web purchases: redemption links
Customers who buy on the web through a RevenueDot [purchase link](../guides/purchase-links.md) or [funnel](../guides/funnels.md) unlock the app with a redemption link, `<scheme>://redeem_web_purchase?redemption_token=…`. Add an intent filter for the scheme to your activity, then pass the intent to the SDK:

```kotlin
val redemption = intent.asWebPurchaseRedemption() ?: return
Purchases.sharedInstance.redeemWebPurchase(redemption) { result ->
    when (result) {
        is RedeemWebPurchaseListener.Result.Success -> Unit // The entitlement is active.
        is RedeemWebPurchaseListener.Result.Expired -> showMessage("Expired. A new link went to ${result.obfuscatedEmail}.")
        else -> showMessage("Could not redeem.")
    }
}
```

Call it from `onCreate` and `onNewIntent`. Full setup: [Redemption links](../guides/redemption-links.md) and [Sell on the web with Stripe](../guides/web-billing.md).

## Test Store
Create a `test_store` app in RevenueDot and pass its `test_...` key to `configure`. The SDK shows a Test Store dialog instead of Google Play's purchase sheet.
- **Test Store keys only work in debug builds.** In a release build the SDK shows an error screen and stops the app on purpose. Ship with the `goog_` key.
- Test Store prices come from each product's Test Store price. Set it in the dashboard (Product catalog, Edit product) or with `test_store_price` on `POST /v2/projects/{project_id}/products`; a product without one shows 0.
- For Google Play test tracks and license testers, see [Sandbox testing](../guides/sandbox-testing.md).

More: [Test Store](../guides/test-store.md).

## Switching from RevenueCat? Keep your SDK and change one line
An app that ships RevenueCat's Android SDK can keep it. Set `Purchases.proxyURL` to RevenueDot before `Purchases.configure` (`https://api.revenuedot.app` on RevenueDot Cloud, or your own server), and set `EntitlementVerificationMode.DISABLED`. Purchases, customer info and offerings then go to RevenueDot. **RevenueCat's Android SDK still sends diagnostics, paywall events and ad events to RevenueCat's hosts**, even with a proxy URL; the RevenueDot SDK sends them to RevenueDot.

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
- Use the app's `goog_...` key from RevenueDot, or your old RevenueCat key if the [importer](../migrate/importer.md) kept it.
- **Turn entitlement verification off.** RevenueCat's SDK checks signatures with RevenueCat's key, so RevenueDot responses read as failed. The default, `INFORMATIONAL`, logs the failure and still grants access. Set `DISABLED`. **Never use `ENFORCED` with RevenueCat's SDK**: every request would fail. See [Trusted Entitlements](../guides/trusted-entitlements.md).
- **Or install the RevenueDot SDK in the same release.** Kotlin packages stay `com.revenuecat.purchases.*`, so imports do not change. See [Install the RevenueDot SDK](#install-the-revenuedot-sdk-and-pass-your-key).

**Call `syncPurchases()` once** on the first launch of the update. It sends the device's Google Play purchases, with their purchase tokens, to RevenueDot. That is also how RevenueDot gets any purchase token the importer could not find.
```kotlin
// Once, after this update: send purchases made while the app talked to RevenueCat.
Purchases.sharedInstance.syncPurchases()
```

The whole app change fits in one diff:
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
- [mobile/android-compose](https://github.com/revenuedot/examples/tree/main/mobile/android-compose): a Jetpack Compose paywall app. It is written but has not been compiled yet.

## Related
- [All SDKs](README.md)
- [Connect Google Play](../guides/google-play.md)
- [Trusted Entitlements](../guides/trusted-entitlements.md)
- [Redemption links](../guides/redemption-links.md)
- [What differs from RevenueCat](../migrate/what-differs.md)

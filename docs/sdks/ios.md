---
title: How do I add in-app purchases to an iOS app with RevenueDot?
description: Add the RevenueDot SDK with Swift Package Manager or CocoaPods, then call Purchases.configure with your app's key. On RevenueDot Cloud nothing else is needed. The same SDK covers iPadOS, macOS, tvOS, watchOS and visionOS.
---

# How do I add in-app purchases to an iOS app with RevenueDot?

Add the RevenueDot SDK to your app with Swift Package Manager or CocoaPods, then call `Purchases.configure(withAPIKey:)` with your app's key from RevenueDot. On RevenueDot Cloud nothing else is needed. The same SDK covers iOS, iPadOS, macOS, tvOS, watchOS and visionOS apps.

## Install the RevenueDot SDK and pass your key
**Version 5.91.0 is published** on CocoaPods trunk and as a Swift package tag. The source is [github.com/revenuedot/purchases-ios](https://github.com/revenuedot/purchases-ios).

```swift
// Package.swift (or Xcode > File > Add Package Dependencies, exact version 5.91.0-revenuedot)
.package(url: "https://github.com/revenuedot/purchases-ios", exact: "5.91.0-revenuedot")
// Products: "RevenueCat", and "RevenueCatUI" for paywalls
```
```ruby
# Podfile
pod 'RevenueDotPurchases', '5.91.0'
pod 'RevenueDotPurchasesUI', '5.91.0'   # only for paywalls (module RevenueCatUI)
```
Release tags are `<upstream version>-revenuedot`, because the repository also carries RevenueCat's own tags.

```swift
import RevenueCat

// Once, at launch: in your App's init() or in application(_:didFinishLaunchingWithOptions:).
Purchases.configure(withAPIKey: "appl_...")
```
- The RevenueDot SDK is built from RevenueCat's open-source SDK (MIT license), so your code imports `RevenueCat` and calls `Purchases`. It sends every request to RevenueDot and needs no RevenueCat account.
- Use the app's public key from RevenueDot: `appl_...`, `mac_...` for a Mac App Store app, or `test_...` for the Test Store. See [Which key goes where](../concepts/projects-and-apps.md#which-key-goes-where).
- **On RevenueDot Cloud** the SDK already calls `https://api.revenuedot.app`, so there is nothing else to set. It trusts RevenueDot Cloud's response-signing key, so entitlement verification reports `VERIFIED`.

**Self-hosting:** set `Purchases.proxyURL` to your server **before** `configure`, and set entitlement verification to `.disabled`. Your server signs with its own key (`REVENUEDOT_SIGNING_KEY`), which this build does not trust.
```swift
import RevenueCat

Purchases.proxyURL = URL(string: "https://revenuedot.example.com")!
Purchases.configure(
    with: Configuration.Builder(withAPIKey: "appl_...")
        // A self-hosted server signs with its own key. The default, .informational, would log every response as a failed check, so set .disabled unless you build the SDK with your key.
        .with(entitlementVerificationMode: .disabled)
        .build()
)
```
- `proxyURL` is a static property on `Purchases`.
- For local testing, the simulator reaches your Mac at `http://localhost:8787`.
- To get `VERIFIED` against your own server, build the SDK with your public key. See [Trusted Entitlements](../guides/trusted-entitlements.md).

## Check an entitlement and make a purchase
Check the entitlement your app unlocks, here `pro`, then buy a package from the current offering, the set of products your paywall shows.
```swift
let customerInfo = try await Purchases.shared.customerInfo()
let isPro = customerInfo.entitlements["pro"]?.isActive == true

let offerings = try await Purchases.shared.offerings()
if let package = offerings.current?.availablePackages.first {
    let result = try await Purchases.shared.purchase(package: package)
    if !result.userCancelled, result.customerInfo.entitlements["pro"]?.isActive == true {
        // Unlock pro features.
    }
}
```
The purchase goes to `POST /v1/receipts`. RevenueDot verifies it with Apple, which needs the App Store in-app purchase key on the app. See [Connect the App Store](../guides/app-store.md).

## Web purchases: redemption links and web checkout
Customers who buy on the web through a RevenueDot [purchase link](../guides/purchase-links.md) or [funnel](../guides/funnels.md) unlock the app with a redemption link, `<scheme>://redeem_web_purchase?redemption_token=…`. Register the scheme in `Info.plist` (`CFBundleURLTypes`), then pass the URL to the SDK:

```swift
.onOpenURL { url in
    guard let redemption = url.asWebPurchaseRedemption else { return }
    Task {
        switch await Purchases.shared.redeemWebPurchase(redemption) {
        case .success: break  // The entitlement is active.
        case .expired(let email): print("Expired. A new link went to \(email).")
        case .invalidToken, .purchaseBelongsToOtherUser, .error: print("Could not redeem.")
        }
    }
}
```

A paywall's **web checkout** button (module `RevenueCatUI`) also works: it opens a Stripe Checkout on your Stripe account for the app's current user, and the purchase lands on that user with no redemption link. Full setup: [Redemption links](../guides/redemption-links.md) and [Sell on the web with Stripe](../guides/web-billing.md).

## Test Store
Create a `test_store` app in RevenueDot and pass its `test_...` key to `configure`. The SDK then shows a Test Store alert instead of the App Store sheet.
- **Test Store keys only work in Debug builds.** In a Release build the SDK shows a "Wrong API Key" alert and stops the app on purpose.
- **Known issue on older servers:** the native iOS SDK could not load Test Store products from RevenueDot and reported "No base price found for product". The server sent `cycle_count: null` in `GET /rcbilling/v1/subscribers/{id}/products`. The server's `main` branch fixed this on 2026-09-30. If you see the error, update your server. See [Known issues](../help/known-issues.md).
- Test Store prices come from each product's Test Store price. Set it in the dashboard (Product catalog, Edit product) or with `test_store_price` on `POST /v2/projects/{project_id}/products`; a product without one shows 0.
- To test with Apple's sandbox or Xcode's StoreKit testing instead, see [Sandbox testing](../guides/sandbox-testing.md).

More: [Test Store](../guides/test-store.md).

## Switching from RevenueCat? Keep your SDK and change one line
An app that ships RevenueCat's iOS SDK 5.x can keep it. Set `Purchases.proxyURL` to RevenueDot before you call `Purchases.configure` (`https://api.revenuedot.app` on RevenueDot Cloud, or your own server), and set the entitlement verification mode to `.disabled`. The rest of your code stays the same.

```swift
import RevenueCat

// Point the SDK at your RevenueDot server; nothing else in the app changes.
Purchases.proxyURL = URL(string: "https://revenuedot.example.com")!
Purchases.configure(
    with: Configuration.Builder(withAPIKey: "appl_...")
        // The default (.informational) logs every RevenueDot response as a failed signature check.
        .with(entitlementVerificationMode: .disabled)
        .build()
)
```
- Set `proxyURL` **before** `configure`. It is a static property on `Purchases`.
- Use the app's public key from RevenueDot. If you ran the [importer](../migrate/importer.md), your existing RevenueCat key keeps working.
- **Turn entitlement verification off.** RevenueCat's SDK checks signatures with RevenueCat's key, so RevenueDot responses read as failed. The default mode, `.informational`, logs the failure and still grants access. Set `.disabled` to stop the noise. **Never use `.enforced` with RevenueCat's SDK**: every request would fail. See [Trusted Entitlements](../guides/trusted-entitlements.md).
- **Or install the RevenueDot SDK in the same release.** It keeps the `RevenueCat` and `RevenueCatUI` modules, so the swap is a dependency change. See [Install the RevenueDot SDK](#install-the-revenuedot-sdk-and-pass-your-key).

**Call `syncPurchases()` once** on the first launch of the update. It sends the device's existing App Store purchases to RevenueDot, so current subscribers keep access even if their history was not imported.
```swift
// Once, after this update: send purchases made while the app talked to RevenueCat.
if !UserDefaults.standard.bool(forKey: "revenuedotSynced") {
    _ = try? await Purchases.shared.syncPurchases()
    UserDefaults.standard.set(true, forKey: "revenuedotSynced")
}
```

The whole app change fits in one diff:
```diff
 import RevenueCat

+// Point the SDK at your RevenueDot server; nothing else in the app changes. Set it before configure.
+Purchases.proxyURL = URL(string: "https://revenuedot.example.com")!
-Purchases.configure(withAPIKey: "appl_...")
+Purchases.configure(
+    with: Configuration.Builder(withAPIKey: "appl_...")
+        // The default (informational) logs every RevenueDot response as failed signature verification.
+        .with(entitlementVerificationMode: .disabled)
+        .build()
+)
+// Once, after this update: send purchases made while the app talked to RevenueCat.
+_ = try? await Purchases.shared.syncPurchases()
```
The full order of steps is in [Migrate from RevenueCat](../migrate/README.md).

## Examples
- [mobile/ios-swiftui](https://github.com/revenuedot/examples/tree/main/mobile/ios-swiftui): a SwiftUI paywall app. It builds for the iOS simulator; its README says exactly what was run.

## Related
- [All SDKs](README.md)
- [Connect the App Store](../guides/app-store.md)
- [Trusted Entitlements](../guides/trusted-entitlements.md)
- [Redemption links](../guides/redemption-links.md)
- [Restore purchases](../help/restore-purchases.md)
- [Receipt errors: 4xx vs 5xx](../help/receipt-errors-4xx-vs-5xx.md)

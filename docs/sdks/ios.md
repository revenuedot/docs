---
title: How do I use RevenueDot with the iOS SDK?
description: Set Purchases.proxyURL before configure and turn entitlement verification off. The RevenueCat iOS SDK 5.x then talks to your RevenueDot server with no other code change.
---

# How do I use RevenueDot with the iOS SDK?

Set `Purchases.proxyURL` to your RevenueDot server before you call `Purchases.configure`, and set the entitlement verification mode to `.disabled`. The rest of your RevenueCat iOS SDK code stays the same. This covers iOS, iPadOS, macOS, tvOS, watchOS and visionOS apps on SDK 5.x.

## Use the RevenueCat SDK you already ship (proxy mode)
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
- Use the app's public key from RevenueDot (`appl_...`, or `mac_...` for a Mac App Store app). If you ran the [importer](../migrate/importer.md), your existing RevenueCat key keeps working. See [Which key goes where](../concepts/projects-and-apps.md#which-key-goes-where).
- For local testing, the simulator reaches your Mac at `http://localhost:8787`.

**After you migrate from RevenueCat, call `syncPurchases()` once** on the first launch of the update. It sends the device's existing App Store purchases to RevenueDot, so current subscribers keep access even if their history was not imported.
```swift
// Once, after this update: send purchases made while the app talked to RevenueCat.
if !UserDefaults.standard.bool(forKey: "revenuedotSynced") {
    _ = try? await Purchases.shared.syncPurchases()
    UserDefaults.standard.set(true, forKey: "revenuedotSynced")
}
```

## Use the RevenueDot fork
The fork is [github.com/revenuedot/purchases-ios](https://github.com/revenuedot/purchases-ios). It keeps the Swift modules `RevenueCat` and `RevenueCatUI`, so every `import RevenueCat` stays. It trusts RevenueDot's signing key, and its default host is `https://api.revenuedot.app`.

**It is not published yet (2026-09-30).** These are the planned install lines:
```ruby
# Podfile (planned; the pods are not on CocoaPods trunk yet)
pod 'RevenueDotPurchases', '<version>'
pod 'RevenueDotPurchasesUI', '<version>'   # only if you use RevenueCatUI
```
```swift
// Package.swift (planned release tags look like 5.92.0-revenuedot)
.package(url: "https://github.com/revenuedot/purchases-ios", exact: "<version>-revenuedot")
// Products: "RevenueCat" and "RevenueCatUI"
```

**You can use it today from the patch branch.** The branch is `revenuedot/main-patches` (upstream 5.92.0 in development plus the RevenueDot patches). A second branch, `revenuedot/release-5.91.0`, is the 5.91.0 release plus the patches.
```swift
// Swift Package Manager, from the branch
.package(url: "https://github.com/revenuedot/purchases-ios", branch: "revenuedot/main-patches")
```
```ruby
# CocoaPods, from the branch
pod 'RevenueDotPurchases', :git => 'https://github.com/revenuedot/purchases-ios.git', :branch => 'revenuedot/main-patches'
```
The fork's default host is RevenueDot Cloud, so a Cloud project needs no `Purchases.proxyURL`. When you self-host, keep setting it to your server.

## Trusted Entitlements
- **Stock SDK:** it checks signatures with RevenueCat's key, so RevenueDot responses read as failed. The default mode, `.informational`, logs the failure and still grants access. Set `.disabled` to stop the noise. **Never use `.enforced` with the stock SDK**: every request would fail.
- **Fork:** it trusts RevenueDot Cloud's key. A self-hosted server signs with its own key (`REVENUEDOT_SIGNING_KEY`), so keep `.disabled` or `.informational`, or build the fork with your own public key.

Details, key generation and self-host builds: [Trusted Entitlements](../guides/trusted-entitlements.md).

## Check an entitlement and make a purchase
The API is RevenueCat's, unchanged.
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

A RevenueCatUI paywall's **web checkout** button also works: it opens a Stripe Checkout on your Stripe account for the app's current user, and the purchase lands on that user with no redemption link. Full setup: [Redemption links](../guides/redemption-links.md) and [Sell on the web with Stripe](../guides/web-billing.md).

## Test Store
Create a `test_store` app in RevenueDot and pass its `test_...` key to `configure`. The SDK then shows a Test Store alert instead of the App Store sheet.
- **Test Store keys only work in Debug builds.** In a Release build the SDK shows a "Wrong API Key" alert and stops the app on purpose.
- **Known issue on older servers:** the native iOS SDK could not load Test Store products from RevenueDot and reported "No base price found for product". The server sent `cycle_count: null` in `GET /rcbilling/v1/subscribers/{id}/products`. The server's `main` branch fixed this on 2026-09-30. If you see the error, update your server. See [Known issues](../help/known-issues.md).
- Test Store prices come from each product's Test Store price. Set it in the dashboard (Product catalog, Edit product) or with `test_store_price` on `POST /v2/projects/{project_id}/products`; a product without one shows 0.
- To test with Apple's sandbox or Xcode's StoreKit testing instead, see [Sandbox testing](../guides/sandbox-testing.md).

More: [Test Store](../guides/test-store.md).

## Migrate from RevenueCat
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

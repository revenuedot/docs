---
title: What happens to my customers' access when RevenueDot is down?
description: The RevenueCat SDKs keep paying customers' access while the server answers 5xx, using a product-to-entitlement mapping RevenueDot serves for each app. How it works per store, and what to check.
---

# What happens to my customers' access when RevenueDot is down?

**Paying customers keep their access.** The RevenueCat SDKs cache a product-to-entitlement mapping from your server and, when the server answers with a 5xx, compute the customer's entitlements on the device from the store's own record of their purchases. This is the SDKs' "offline entitlements" feature, described in RevenueCat's [customer info docs](https://www.revenuecat.com/docs/customers/customer-info#offline-entitlements). It needs nothing from you beyond the normal setup.

## How it works
1. The SDK fetches `GET /v1/product_entitlement_mapping` and caches it. It refreshes it when the copy is 25 hours old.
2. When `GET /v1/subscribers/{app_user_id}` or `POST /v1/receipts` answers 5xx and no customer info is cached, the SDK reads the active purchases from StoreKit or Google Play and looks each product up in the mapping.
3. The result is marked as verified on the device and is not cached. The purchase stays unfinished, so the SDK posts it again once the server is back.

RevenueDot answers 5xx for its own failures and for store outages, never 4xx, so this path is always taken when it should be. See [4xx vs 5xx on receipts](../help/receipt-errors-4xx-vs-5xx.md).

## What the mapping contains
Each app key gets its own app's products, keyed the way that app's SDK looks them up:

| Store | Product in RevenueDot | Keys in the mapping |
|---|---|---|
| App Store | `pro_monthly` | `pro_monthly` |
| App Store, iOS 26.4 billing plan | `pro_annual:monthly` | `pro_annual:monthly` (base plan `monthly`) |
| App Store, up-front billing plan | `pro_annual:upFront` | `pro_annual` |
| Google Play | `pro:monthly` and `pro:annual` | `pro:monthly`, `pro:annual`, and `pro` |
| Google Play, product without a base plan | `legacy_pro` | `legacy_pro` |

- **Google Play's bare key** (`pro` above) carries the entitlements of **every** base plan of the subscription. Android's purchase record names the subscription but not the base plan, so the SDK can only look up `pro`. With the union, nobody who paid loses access; a customer on a cheaper base plan may see the richer plan's entitlements for at most a day, and only while the server is down. RevenueCat's sample mapping uses the first base plan's entitlements instead.
- **App Store billing plans** (iOS 26.4 monthly plans with a 12-month commitment): RevenueDot reads Apple's [`billingPlanType`](https://developer.apple.com/documentation/appstoreserverapi/billingplantype) on every signed transaction (receipts, the App Store Server API and notifications). `MONTHLY` is recorded as product plan `monthly`, so a purchase of `pro_annual` on the monthly plan unlocks the entitlements of `pro_annual:monthly` online, as iOS does offline. Up-front billing, or a purchase from before iOS 26.4, matches `pro_annual` and `pro_annual:upFront`. Customer info reports `product_plan_identifier: "monthly"` for those purchases.
- **Keep a monthly plan covered offline** by storing it as `product:monthly`. If you store only the bare `pro_annual`, a monthly-plan purchase still unlocks it online, but iOS looks it up as `pro_annual:monthly` offline and finds nothing. When both exist, the `pro_annual:monthly` key also carries the bare product's entitlements, matching what the server grants online.
- **Archived products** still map, so earlier buyers keep access. **Archived entitlements** unlock nothing, online or offline.
- **Consumables** are left out: they never unlock an entitlement.

```bash
curl -s https://api.revenuedot.app/v1/product_entitlement_mapping -H "Authorization: Bearer $GOOGLE_APP_KEY"
```

```json
{
  "product_entitlement_mapping": {
    "pro:monthly": { "product_identifier": "pro", "base_plan_id": "monthly", "entitlements": ["pro"] },
    "pro:annual": { "product_identifier": "pro", "base_plan_id": "annual", "entitlements": ["pro", "cloud_sync"] },
    "pro": { "product_identifier": "pro", "base_plan_id": "monthly", "entitlements": ["pro", "cloud_sync"] }
  }
}
```

A secret key with no `X-Platform` header gets the whole project. Reference: [SDK endpoints](../../api/sdk-endpoints.md#product-to-entitlement-mapping-offline-entitlements).

## When offline entitlements do not apply
These limits are the SDKs' own:
- The app completes purchases itself (observer mode, `purchasesAreCompletedBy = .myApp`).
- The Test Store, and iOS before 15.
- A pending consumable on iOS, or any active one-time purchase on Android: the SDK returns an error instead.
- A network error with no answer at all. Only a 5xx counts as "server down".

## Related
- [Concepts: subscriptions and events](../concepts/subscriptions-and-events.md)
- [Going to production](going-to-production.md)
- [Win-back offers](win-back-offers.md)

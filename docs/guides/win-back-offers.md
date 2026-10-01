---
title: How do win-back offers work with RevenueDot?
description: Apple's iOS 18 win-back offers work with the RevenueCat SDK and RevenueDot unchanged. RevenueDot records the offer on each purchase, sends it as offer_code in webhooks and exports it, and keeps Apple's list of offers a lapsed customer may redeem.
---

# How do win-back offers work with RevenueDot?

Win-back offers are discounted or free periods Apple shows to customers whose subscription lapsed (iOS 18 and later). **The RevenueCat SDK does all win-back work on the device**, so your app code stays the same: `eligibleWinBackOffers(forProduct:)` asks StoreKit which offers the customer can redeem, and `purchase(product:winBackOffer:)` adds StoreKit's win-back purchase option. Unlike promotional offers, win-back offers need no signature from the server. RevenueCat describes the app side in its [iOS subscription offers guide](https://www.revenuecat.com/docs/subscription-guidance/subscription-offers/ios-subscription-offers).

What the server does:
- **Grants access.** A win-back purchase is a resubscription in the same subscription group, so it arrives as a `RENEWAL` event with the same `original_transaction_id`, and the customer's entitlement is active again.
- **Records the offer.** Each subscription period and each transaction stores its offer type and the store's offer id.
- **Keeps Apple's eligibility list.** Apple's renewal info names the win-back offers the customer may redeem now; RevenueDot stores that list each time it reads the renewal info.

## Before you start
1. Create the win-back offer in App Store Connect on a subscription that App Review has approved. RevenueCat's [iOS subscription offers guide](https://www.revenuecat.com/docs/subscription-guidance/subscription-offers/ios-subscription-offers) walks through the fields: offer identifier, publish dates, priority and the eligibility rules.
2. Add the app's **In-App Purchase key** in RevenueDot. RevenueDot needs it to read the renewal info and the full purchase history. See [Connect the App Store](app-store.md).
3. Turn on **App Store Server Notifications**. Customers can redeem a win-back offer in the App Store without opening your app (streamlined purchasing); the notification is how RevenueDot hears about it.

## What you see after a win-back purchase
The webhook is a `RENEWAL` with the offer id in `offer_code`:

```json
{
  "api_version": "1.0",
  "event": {
    "type": "RENEWAL",
    "app_user_id": "user_1",
    "product_id": "pro_monthly",
    "period_type": "NORMAL",
    "transaction_id": "2000000007",
    "original_transaction_id": "2000000001",
    "price_in_purchased_currency": 4.99,
    "offer_code": "comeback_50",
    "store": "APP_STORE"
  }
}
```

(Shortened; the full payload is on [Webhook events](../../api/webhook-events.md#renewal).)

- A **paid** win-back period has `period_type: NORMAL`; a **free** one is `TRIAL`. RevenueCat reports Apple's paid promotional and win-back offers as normal periods too.
- The transaction export's `offer` and `offer_type` columns say `comeback_50` and `win_back`. See [Integrations and data exports](integrations.md).

`offer_code` and `offer_type` cover every store offer, not only win-back:

| Store offer | `offer_type` | `offer_code` |
|---|---|---|
| App Store free introductory offer | `free_trial` | null |
| App Store paid introductory offer | `introductory` | null |
| App Store promotional offer | `promotional` | the offer identifier |
| App Store offer code | `offer_code` | the offer identifier |
| App Store win-back offer | `win_back` | the offer identifier |
| Google Play offer, free-trial phase | `free_trial` | the offer id |
| Google Play offer, introductory-price phase | `introductory` | the offer id |
| Google Play offer on a later period | `unspecified` | the offer id |

Google Play has no separate win-back offer type. An offer you build for lapsed subscribers in Play Console (a "developer determined" offer) arrives with its offer id like any other offer.

## Find customers who can be won back
Apple's eligibility list is readable per customer:

```bash
curl -s https://api.revenuedot.app/v2/projects/$PROJECT_ID/customers/user_1/win_back_offers \
  -H "Authorization: Bearer $SECRET_KEY"
```

```json
{
  "object": "list",
  "items": [
    { "object": "win_back_offer_eligibility", "subscription_id": "sub_4kq0x2m9a7c1d8e3", "product_id": "pro_monthly", "store": "app_store", "offer_ids": ["comeback_50"], "updated_at": 1790800914034 }
  ],
  "next_page": null,
  "url": "/v2/projects/proj18pzzkao/customers/user_1/win_back_offers"
}
```

`offer_ids` is Apple's list, best offer first, and is empty when Apple offers the customer nothing. `updated_at` says when RevenueDot last read it. Use it to send a lapsed customer the offer's link from your own email tool. This endpoint is a RevenueDot extension; RevenueCat's API has no equivalent. Reference: [REST API v2](../../api/rest-v2.md#list-the-win-back-offers-apple-lets-a-customer-redeem).

## Known limits
- No real win-back offer has been redeemed against RevenueDot yet; the flow is tested with signed test transactions and a mocked App Store.
- The charts have no "offer type" dimension yet.

## Related
- [Connect the App Store](app-store.md)
- [Webhooks](webhooks.md)
- [Offline entitlements](offline-entitlements.md)

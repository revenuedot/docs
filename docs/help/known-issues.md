---
title: What are the known issues and gaps in RevenueDot?
description: "Known issues as of 2026-09-30: what does not work yet in the pre-alpha, and the workaround for each."
---

# What are the known issues and gaps in RevenueDot?

RevenueDot is pre-alpha. The list below is complete as of **2026-09-30**. The biggest gap: **no real App Store or Google Play sandbox purchase has run end to end yet**. Store support is tested against mocked Apple and Google APIs only. Each item has a workaround where one exists.

## Stores and purchases
1. **Real store purchases are untested end to end.** The App Store and Google Play code passes tests against mocked Apple and Google APIs.
   - Workaround: test with App Store sandbox and Google Play license testers, report what you find, and keep live customers on your current backend. See [Test purchases](test-sandbox-purchases.md).
2. **Test Store products have no price.** `/rcbilling/v1/subscribers/{app_user_id}/products` answers a price of 0 for every product, because the catalog does not store Test Store prices yet. Servers built before the 2026-09-30 fix also sent `cycle_count: null`, which made the native iOS SDK stop with "No base price found for product".
   - Workaround: rebuild the server from the current source if you see that iOS error. Test real prices with App Store sandbox or Google Play testers.
3. **Only four app types accept receipts:** `app_store`, `mac_app_store`, `play_store` and `test_store`. Amazon, Stripe, Web Billing (`rcb_`), Paddle and Roku receipts answer HTTP 400, code 7662.
   - Workaround: none yet.
4. **StoreKit 1 receipts need the App Store in-app purchase key.** Without it, RevenueDot answers HTTP 500, code 7234, so the SDK keeps retrying.
   - Workaround: add the key. For local development only, set the `allow_unsigned_receipts` credential. See [Connect the App Store](../guides/app-store.md).
5. **The App Store app-specific shared secret is stored but not used.** RevenueDot verifies with the in-app purchase key and Apple's signed transactions instead.
   - Workaround: add the in-app purchase key.
6. **Revenue in currencies other than USD is not converted.** The USD revenue figure uses the amount as paid, so a purchase of 9.99 EUR counts as 9.99 USD in metrics and `total_revenue_in_usd`. Webhook `price_in_purchased_currency` and `currency` are correct.
   - Workaround: compute USD revenue in your backend from the webhook's currency fields.

## SDK features
7. **Paywalls, Customer Center, virtual currencies, targeting and experiments are not implemented.** The SDK endpoints answer empty results or 404, so the SDK hides these features instead of crashing. Paywalls built in RevenueCat do not render.
   - Workaround: build the paywall in your own UI code from the offerings.
8. **The stock Android SDK sends some traffic to RevenueCat.** Diagnostics, paywall events and ad events ignore the proxy URL.
   - Workaround: the RevenueDot Android fork fixes it, but it is not published yet. You can build it from the `revenuedot/main-patches` branch of [revenuedot/purchases-android](https://github.com/revenuedot/purchases-android).
9. **The stock web SDK sends analytics events to RevenueCat.**
   - Workaround: configure purchases-js with `flags: { collectAnalyticsEvents: false }`.
10. **Flutter web ignores the proxy URL with the stock SDK.** Flutter on iOS and Android works.
    - Workaround: the RevenueDot Flutter fork fixes it; use it as a git dependency on [revenuedot/purchases-flutter](https://github.com/revenuedot/purchases-flutter).
11. **The stock SDK reports signature verification FAILED.** RevenueDot cannot sign with RevenueCat's key.
    - Workaround: turn verification off, never use ENFORCED. See [signature verification](signature-verification-failed.md).
12. **The SDK forks are not published to any registry.** npm, CocoaPods, Maven Central and OpenUPM releases need publishing credentials that are not set up yet. The forks' default host, `https://api.revenuedot.app`, is not live either.
    - Workaround: use the stock RevenueCat SDK with a proxy URL, or build a fork from its `revenuedot/main-patches` branch.

## Webhooks and events
13. **Six event types are never sent yet:** `TEMPORARY_ENTITLEMENT_GRANT`, `VIRTUAL_CURRENCY_TRANSACTION`, `INVOICE_ISSUANCE`, `EXPERIMENT_ENROLLMENT`, `PURCHASE_REDEEMED` and `SUBSCRIBER_ALIAS`. You can select them in filters.
    - Workaround: none needed unless your backend relies on them.
14. **Webhook payloads leave out `renewal_number`, `experiments` and `metadata`.** Every other field matches RevenueCat's sample payloads.
    - Workaround: count renewals in your backend from `RENEWAL` events.
15. **Moving a one-time purchase to another user sends no `TRANSFER` event.** Subscriptions send one.
    - Workaround: listen for `NON_RENEWING_PURCHASE` and check ownership with the REST API.

## Migration
16. **The importer CLI is not on npm yet.** `npx revenuedot import` does not work yet.
    - Workaround: run it from source. See [The importer](../migrate/importer.md).
17. **Some RevenueCat data is not imported:** paywalls, targeting, experiments and virtual currency balances. Refunded subscriptions import as expired, because RevenueCat's API does not expose the refund. RevenueCat Billing renewals stay with RevenueCat.
    - Workaround: recreate paywalls in code, and keep RevenueCat running for RevenueCat Billing customers.
18. **Google purchase tokens are not in RevenueCat's API.** Imported Google subscriptions wait with the key `needs_token_refresh:<order id>` until a token arrives.
    - Workaround: pass `--google-tokens <csv>`, or let renewal notifications and one `syncPurchases()` in the app fill them in. `GET /v2/projects/{project_id}/import/status` counts what is left.

## Self-hosting
19. **The shipped `docker-compose.yml` does not pass `REVENUEDOT_SIGNING_KEY`.**
    - Workaround: add it with a `docker-compose.override.yml`. See [Set the signing key](../guides/self-hosting.md#set-the-signing-key).
20. **Run one server container per database.** Expirations and webhooks are sent by a background job inside each container.
    - Workaround: scale up one container rather than out. There is no high-availability setup yet.
21. **There is no published Docker image.** Compose builds the image from source, which takes a few minutes on the first start.
    - Workaround: none needed.

## Related
- [Frequently asked questions](faq.md)
- [Troubleshooting by symptom](troubleshooting.md)
- [What differs from RevenueCat](../migrate/what-differs.md)

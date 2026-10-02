---
title: What are the known issues and gaps in RevenueDot?
description: "Known issues as of 2026-09-30: what does not work yet, and the workaround for each."
---

# What are the known issues and gaps in RevenueDot?

The list below is complete as of **2026-09-30**. The biggest gap: **no real App Store or Google Play sandbox purchase has run end to end yet**. Store support is tested against mocked Apple and Google APIs only. Each item has a workaround where one exists.

## Stores and purchases
1. **Real store purchases are untested end to end.** The App Store and Google Play code passes tests against mocked Apple and Google APIs.
   - Workaround: test with App Store sandbox and Google Play license testers, report what you find, and keep live customers on your current backend. See [Test purchases](test-sandbox-purchases.md).
2. **Six app types accept receipts:** `app_store`, `mac_app_store`, `play_store`, `amazon`, `stripe` and `test_store`. RevenueCat Billing (`rcb_`), Paddle and Roku receipts answer HTTP 400, code 7662. Amazon and Stripe are tested against mocked store APIs only; no real Amazon or Stripe purchase has run yet. That includes [web billing](../guides/web-billing.md): the hosted checkout, purchase links and funnels run against an in-memory copy of Stripe's API in the tests.
   - Workaround: none yet.
3. **StoreKit 1 receipts need the App Store in-app purchase key.** Without it, RevenueDot answers HTTP 500, code 7234, so the SDK keeps retrying.
   - Workaround: add the key. For local development only, set the `allow_unsigned_receipts` credential. See [Connect the App Store](../guides/app-store.md).
4. **The App Store app-specific shared secret is stored but not used.** RevenueDot verifies with the in-app purchase key and Apple's signed transactions instead.
   - Workaround: add the in-app purchase key.
5. **USD values can differ slightly from RevenueCat's.** RevenueDot converts at the purchase date's rate from the ECB (about 30 currencies) and the [currency-api](https://github.com/fawazahmed0/exchange-api) (every other currency); RevenueCat uses Open Exchange Rates. The currency-api's history starts on 2024-03-02, so older purchases in currencies the ECB does not publish use that day's rate. Servers upgraded from before 2026-09-30 counted non-USD prices as USD.
   - Workaround: after upgrading, run `pnpm tsx scripts/backfill-usd.ts` (a dry run), then again with `--apply`, to recompute those rows.

## SDK features
6. **Paywalls built in RevenueCat are not imported.** Paywalls, Customer Center, virtual currencies, targeting and experiments work with the stock SDKs, but the importer does not copy RevenueCat paywalls, targeting rules or experiments (item 14).
   - Workaround: rebuild the paywall in the [paywall editor](../guides/paywalls.md), and recreate rules and experiments on the [Targeting and Experiments](../guides/experiments.md) pages.
7. **The stock Android SDK sends some traffic to RevenueCat.** Diagnostics, paywall events and ad events ignore the proxy URL.
   - Workaround: the RevenueDot Android fork fixes it, but it is not published yet. You can build it from the `revenuedot/main-patches` branch of [revenuedot/purchases-android](https://github.com/revenuedot/purchases-android).
8. **The stock web SDK sends analytics events to RevenueCat.**
   - Workaround: configure purchases-js with `flags: { collectAnalyticsEvents: false }`.
9. **Flutter web ignores the proxy URL with the stock SDK.** Flutter on iOS and Android works.
    - Workaround: the RevenueDot Flutter fork fixes it; use it as a git dependency on [revenuedot/purchases-flutter](https://github.com/revenuedot/purchases-flutter).
10. **The stock SDK reports signature verification FAILED.** RevenueDot cannot sign with RevenueCat's key.
    - Workaround: turn verification off, never use ENFORCED. See [signature verification](signature-verification-failed.md).
11. **The SDK forks are not published to any registry.** npm, CocoaPods, Maven Central and OpenUPM releases need publishing credentials that are not set up yet. The forks' default host, `https://api.revenuedot.app`, is RevenueDot Cloud and is live.
    - Workaround: use the stock RevenueCat SDK with a proxy URL, or build a fork from its `revenuedot/main-patches` branch.

## Webhooks and events
12. **Two event types are never sent:** `TEMPORARY_ENTITLEMENT_GRANT` and `INVOICE_ISSUANCE`, because RevenueDot never has the facts behind them. You can select them in filters. `SUBSCRIBER_ALIAS` and the funnel types (`FUNNEL_VIEWED`, `FUNNEL_STEP_COMPLETED`, `FUNNEL_PURCHASE`) are sent only to webhooks whose filter names them.
    - Workaround: none needed unless your backend relies on them. See [Webhooks](../guides/webhooks.md).
13. **Webhook payloads leave out `metadata`, and send `renewal_number` only on `REFUND_REVERSED`.** `experiments` is sent for customers in an offering experiment. Every other field matches RevenueCat's sample payloads.
    - Workaround: count renewals in your backend from `RENEWAL` events.

## Migration
14. **Some RevenueCat data is not imported:** paywalls, targeting, experiments and virtual currency balances. Refunded subscriptions import as expired, because RevenueCat's API does not expose the refund. RevenueCat Billing renewals stay with RevenueCat.
    - Workaround: recreate paywalls in code, and keep RevenueCat running for RevenueCat Billing customers.
15. **Google purchase tokens are not in RevenueCat's API.** Imported Google subscriptions wait with the key `needs_token_refresh:<order id>` until a token arrives.
    - Workaround: pass `--google-tokens <csv>`, or let renewal notifications and one `syncPurchases()` in the app fill them in. `GET /v2/projects/{project_id}/import/status` counts what is left.

## Self-hosting
16. **Run one server container per database.** Expirations and webhooks are sent by a background job inside each container.
    - Workaround: scale up one container rather than out. There is no high-availability setup yet.
17. **There is no published Docker image.** Compose builds the image from source, which takes a few minutes on the first start.
    - Workaround: none needed.

## Related
- [Frequently asked questions](faq.md)
- [Troubleshooting by symptom](troubleshooting.md)
- [What differs from RevenueCat](../migrate/what-differs.md)

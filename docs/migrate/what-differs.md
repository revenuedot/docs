---
title: What differs between RevenueDot and RevenueCat?
description: Every known difference as of 2026-09-30, from failed signature checks with the stock SDK to webhook events not sent yet and features planned for later tiers, with sources.
---

# What differs between RevenueDot and RevenueCat?

RevenueDot answers the RevenueCat SDKs, REST API v1 and v2, and webhook payloads in RevenueCat's shapes, so purchases, entitlements, offerings and customer info work the same. The differences are: stock SDKs report failed signature checks, a few SDK features answer empty because they are not built yet, some webhook event types are never sent, and paywalls, experiments, charts and several stores are planned for later tiers. This page lists every known difference as of 2026-09-30.

## SDK behaviour
**Signature checks (Trusted Entitlements)**
- The stock SDKs verify responses with RevenueCat's signing key, which RevenueDot cannot use. Every RevenueDot response reads as verification failed.
- iOS, Android and Unity default to informational: they log the failure and still grant access. Set disabled. React Native, Flutter and Kotlin Multiplatform default to disabled. Capacitor passes no default, so the native informational default applies. Cordova has no option. purchases-js does not verify.
- **Enforced mode fails every request** with a stock SDK against RevenueDot.
- RevenueDot signs responses with its own Ed25519 key when `REVENUEDOT_SIGNING_KEY` is set, and the RevenueDot forks trust RevenueDot Cloud's key. See [Trusted Entitlements](../guides/trusted-entitlements.md).
- Source: [`prd/sdk-forks/PRD.md`](https://github.com/revenuedot/revenuedot/blob/main/prd/sdk-forks/PRD.md), section 4.

**Traffic that bypasses the proxy URL in stock SDKs**
- Android sends diagnostics, paywall events and ad events to RevenueCat's hosts even with a proxy URL.
- purchases-js sends analytics events to RevenueCat unless you set `flags: { collectAnalyticsEvents: false }`.
- Flutter web ignores `setProxyURL`, so web calls still go to RevenueCat.
- The RevenueDot forks fix all three. Source: [`prd/sdk-forks/PRD.md`](https://github.com/revenuedot/revenuedot/blob/main/prd/sdk-forks/PRD.md), section 2.

**SDK features that answer empty today**
| SDK feature | What RevenueDot answers | Effect in the app |
|---|---|---|
| Customer Center | `GET /v1/customercenter/{id}` answers 404 with code 7259; support tickets answer `{"sent": false}` | The Customer Center screen shows its error state |
| Virtual currencies | `{"virtual_currencies": {}}` | Balances are always empty |
| Paywalls built in RevenueCat's editor | Offerings carry no paywall | Remote paywall designs do not appear |
| Targeting and placements | Offerings carry no placements | Every user gets the current offering |
| Remote config (`/v1/config/...`) | 204, no body | Nothing to apply |
| Analytics and diagnostics (`/v1/events`, `/v1/diagnostics`) | Accepted, then dropped | No effect |
| Web purchase redemption (`redeemWebPurchase`) | 400 with code 7849 | The SDK returns `invalidToken`: there are no web purchases to redeem |
| Web checkout (iOS hosted checkout, purchases-js with `rcb_` keys) | 400 with code 7000; branding answers the app's name | The checkout fails with an error and is not retried |
| Rewarded ad verification (`pollRewardVerification`) | `status: failed` | Polling stops after one request and returns failed |
| SDK health report | Always "passed" | No effect |

Source: [`apps/server/src/routes/sdk.ts`](https://github.com/revenuedot/revenuedot/blob/main/apps/server/src/routes/sdk.ts).

**Attribution and promotional offers work**
- `setAttributes` and the reserved setters, `collectDeviceIdentifiers` (RevenueDot fills in `$ip` and `$deviceVersion`), the deprecated Apple Search Ads `addAttributionData` and `enableAdServicesAttributionTokenCollection` are stored as the reserved attributes, such as `$mediaSource`, `$campaign` and the `$appleAds*` ids. RevenueDot looks the AdServices token up with Apple's attribution API. Apple returns campaign ids, not names.
- Promotional offers (`POST /v1/offers`) are signed with the App Store app's In-App Purchase key. Without the key the SDK gets code 7234 for that offer.
- The full list of SDK calls and what each answers is in [`prd/sdk-api/PRD.md`](https://github.com/revenuedot/revenuedot/blob/main/prd/sdk-api/PRD.md#endpoint-inventory).

**Stores and receipts**
- RevenueDot accepts purchases for App Store, Mac App Store, Google Play, Amazon Appstore, Stripe and Test Store apps ([Amazon guide](../guides/amazon-appstore.md), [Stripe guide](../guides/stripe.md)). Receipts for Web Billing (`rcb_`), Paddle and Roku apps answer HTTP 400 with code 7662.
- Like RevenueCat, RevenueDot does not detect refunds of Amazon subscriptions. Stripe Connect OAuth ("Connect with Stripe") is not available; save a restricted key instead.
- purchases-js therefore works only with Test Store (`test_`) keys.
- StoreKit 1 receipts need the App Store in-app purchase key on the app. Without it RevenueDot answers code 7234 as HTTP 500, so the SDK retries after you add the key. For development, `allow_unsigned_receipts` skips this.
- The app-specific shared secret is stored but not used.
- Temporary failures, RevenueDot's or a store's, answer 5xx so the SDK retries. A 4xx means the purchase is permanently bad. See [Receipt errors: 4xx vs 5xx](../help/receipt-errors-4xx-vs-5xx.md).

**Test Store**
- Test Store prices are set on the product with `test_store_price` (`amount_micros`, `currency`) on product create and update, not with RevenueCat's separate `test_store_prices` endpoint. Read them with `expand=indicative_price`.
- Servers older than the 2026-09-30 fix send `cycle_count: null` in `GET /rcbilling/v1/subscribers/{id}/products`, and the native iOS SDK then reports "No base price found for product". Update the server if you see it.
- Test Store purchases are always sandbox purchases. See [Test Store](../guides/test-store.md).

**Other SDK details**
- Unity has no public `SetProxyURL` method; use the **Proxy URL** field on the Purchases component. See [Unity](../sdks/unity.md).
- Restores follow the project's `transfer_behavior`: `transfer` (default), `transfer_if_no_active`, `keep` or `share`. With `keep`, a restore of a receipt another user owns fails with code 7102. See [Customers and app user IDs](../concepts/customers-and-app-user-ids.md#who-owns-a-restored-purchase).

## API
- **Keys:** the same prefixes as RevenueCat. Public app keys are `appl_`, `mac_`, `goog_`, `test_`, `amzn_`, `strp_`, `rcb_`, `pdl_` and `roku_`; secret keys are `sk_` and belong to one project. See [Projects, apps and API keys](../concepts/projects-and-apps.md).
- **REST API v1:** all 15 endpoints, with RevenueCat's shapes. See [REST API v1](../../api/rest-v1.md).
- **REST API v2:** every one of RevenueCat's 128 v2 operations has a route, with RevenueCat's shapes, pagination and errors. 116 do the real work. The 12 that exist only for RevenueCat Billing (discounts and invoices) answer on purpose: writes 422, lists empty, single reads 404. `restore_purchase_by_order_id` also accepts App Store order ids; `create_in_store` also creates Google Play subscriptions. See [REST API v2](../../api/rest-v2.md).
- **Extensions that RevenueCat's API does not have:** the import endpoints, `notification_forward_url` on apps, `POST /v2/projects/{project_id}/test_purchases`, store settings and credential checks, mass subscription extension, and webhook delivery logs with retry. See [REST API extensions](../../api/extensions.md).
- **Dashboard sessions** can call `/v2` for every project you belong to; a secret key covers one project.
- **The importer** is RevenueDot's own; see [The importer](importer.md).

## Webhooks
- **Payload:** RevenueCat's shape, `{ "api_version": "1.0", "event": { ... } }`, sent as a `POST` with JSON.
- **Headers:** an optional `Authorization` header you configure, plus `X-RevenueCat-Webhook-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256>` signed with your `whsec_...` secret, and `User-Agent: RevenueDot-Webhooks/1.0`.
- **Delivery:** only HTTP 200 counts as delivered. Failed deliveries retry after 5, 10, 20, 40 and 80 minutes, then stop. Each attempt times out after 60 seconds. You can retry by hand in the dashboard or the API.
- **Event types sent today (18 of 21):** `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `UNCANCELLATION`, `NON_RENEWING_PURCHASE`, `SUBSCRIPTION_PAUSED`, `EXPIRATION`, `BILLING_ISSUE`, `PRODUCT_CHANGE`, `SUBSCRIPTION_EXTENDED`, `REFUND_REVERSED`, `TRANSFER`, `PRICE_INCREASE_CONSENT_REQUIRED`, `PRICE_INCREASE_CONSENT_APPROVED`, `VIRTUAL_CURRENCY_TRANSACTION`, `EXPERIMENT_ENROLLMENT`, `TEST`, and `SUBSCRIBER_ALIAS` to webhooks whose filter names it.
- **Accepted in filters but never sent:** `TEMPORARY_ENTITLEMENT_GRANT` (RevenueDot never grants unverified access during a store outage), `INVOICE_ISSUANCE` (RevenueCat Billing only) and `PURCHASE_REDEEMED` (no web purchase redemption links).
- **Refunds** arrive as `CANCELLATION` with `cancel_reason: "CUSTOMER_SUPPORT"` and a negative price.
- **Imported history sends no webhooks**, unless you import with `--emit-events`.
- **Integrations:** webhooks are the only integration today. Slack, Segment, Amplitude, Mixpanel, PostHog, Firebase, BigQuery, AppsFlyer, Adjust and Meta are planned for Tier 2.

Details: [Webhooks](../guides/webhooks.md) and [Webhook events](../../api/webhook-events.md). Source: [`apps/server/src/services/webhooks.ts`](https://github.com/revenuedot/revenuedot/blob/main/apps/server/src/services/webhooks.ts).

## Migration
- **Not imported:** paywalls, targeting rules, experiments, virtual currency balances, integrations other than webhooks, and store credentials.
- **Refunded subscriptions import as expired**, because RevenueCat's [API v2](https://www.revenuecat.com/docs/api-v2) subscription object does not show refunds.
- **RevenueCat Billing subscriptions** keep renewing through RevenueCat; only their current access is imported.
- **Google Play purchase tokens** are not in RevenueCat's [API v2](https://www.revenuecat.com/docs/api-v2), which gives order ids. Until RevenueDot finds a token, the subscription is marked `needs_token_refresh` and the customer keeps access.

Source: [`prd/migration/PRD.md`](https://github.com/revenuedot/revenuedot/blob/main/prd/migration/PRD.md).

## Features not built yet, by tier
**Tier 1 (the current build), not finished**
- SDK fork packages are partly published: `@revenuedot/purchases-js`, `@revenuedot/purchases-typescript-internal` and `@revenuedot/purchases-js-hybrid-mappings` on npm, `app.revenuedot.purchases` on Maven Central and `RevenueDotPurchases` and `RevenueDotPurchasesUI` on CocoaPods. The React Native, Flutter, Capacitor, Cordova, Unity and Kotlin Multiplatform packages are not published yet.
- Real App Store and Google Play sandbox purchases have not run end to end; store handling is tested against mocked Apple and Google APIs.

**Tier 2 (planned)**
- The integrations not listed above (RevenueDot has 12 of RevenueCat's 37).
- Paywalls with several screens and navigation between them, exit offers and custom variables.
- Lifecycle: refund control (Apple consumption information), retention offers, win-back campaigns and the support view.
- RevenueDot AI, an in-app assistant.
- Moving between self-host and cloud in one step, and a full export.
- Cloud billing plans.

**Tier 3 (planned)**
- SSO/SAML, SCIM, custom roles, several organizations, data-location controls and compliance exports.
- High-availability self-host (Helm, Terraform, clustering).
- Web billing with hosted checkout, web-to-app funnels and redemption links.
- Failed-payment recovery, refund defense and win-back flows.
- Paddle, Roku and Galaxy stores; forwarding attribution to ad networks; benchmarks.

Source: [`prd/SCOPE.md`](https://github.com/revenuedot/revenuedot/blob/main/prd/SCOPE.md).

## Related
- [Migrate from RevenueCat](README.md)
- [SDK changes](sdk-changes.md)
- [Known issues](../help/known-issues.md)
- [All SDKs](../sdks/README.md)

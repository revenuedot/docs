---
title: What differs between RevenueDot and RevenueCat?
description: Every known difference as of 2026-10-01, from failed signature checks with the stock SDK to the few SDK calls that answer with a fixed reply and the features still planned, with sources.
---

# What differs between RevenueDot and RevenueCat?

RevenueDot answers the RevenueCat SDKs, REST API v1 and v2, and webhook payloads in RevenueCat's shapes. Purchases, entitlements, offerings, paywalls, targeting and placements, experiments, Customer Center, virtual currencies and charts work the same, and the Amazon Appstore and Stripe stores, web billing and the lifecycle tools are built. The differences are: stock SDKs report failed signature checks, a few SDK calls answer with a fixed reply, two webhook event types are never sent, and a short list of features is still planned. This page lists every known difference as of 2026-10-01.

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

**SDK calls that answer with a fixed reply**
Every other SDK call does the real work, including Customer Center (configuration and support tickets), virtual currency balances, paywalls in the offerings response and in remote config, targeting and placements, and the paywall, Customer Center and ad events sent to `/v1/events`, which feed the [charts](../guides/charts.md).

| SDK call | What RevenueDot answers | Effect in the app |
|---|---|---|
| Remote config fallback (`GET /v1/config/{domain}`) | 204, no body | None. The SDKs read remote config, including published paywalls, from `POST /v1/config/{domain}`, which answers with real data. The `GET` form is only for RevenueCat's fallback host, which the SDK never uses with a proxy URL |
| Diagnostics (`POST /v1/diagnostics`) | 200 `{}`, then dropped | No effect |
| purchases-js Web Billing checkout (`rcb_` keys, `/rcbilling/v1/checkout/*`) | 400 with code 7000 (7877 for a checkout session id); branding answers the app's name | The checkout fails with an error and is not retried. Sell on the web with RevenueDot's [hosted checkout](../guides/web-billing.md) instead |
| Rewarded ad verification (`pollRewardVerification`) for ad networks other than AdMob | `status: pending` | AdMob rewards are verified with Google's signed callback (see [Ads](../guides/ads.md)). Callbacks from AppLovin MAX, ironSource and Unity Ads are not built, so their rewards never read as verified |
| StoreKit 1 introductory-offer eligibility (`POST /v1/subscribers/{id}/intro_eligibility`) | `null` for every product | Eligibility reads as unknown on StoreKit 1. StoreKit 2 checks eligibility on the device |
| SDK health report | Always "passed", with no checks | No effect |
| Identity-provider login (`/auth/login`, `/auth/token`, `/auth/revoke`) | No route | None for normal apps. Only the SDKs' internal token-login mode calls these, and no public SDK API turns it on |

Sources: [`apps/server/src/routes/sdk.ts`](https://github.com/revenuedot/revenuedot/blob/main/apps/server/src/routes/sdk.ts) and the [SDK endpoint inventory](https://github.com/revenuedot/revenuedot/blob/main/prd/sdk-api/PRD.md#endpoint-inventory) (55 routed calls: 32 real, 23 fixed replies).

**Attribution and promotional offers work**
- `setAttributes` and the reserved setters, `collectDeviceIdentifiers` (RevenueDot fills in `$ip` and `$deviceVersion`), the deprecated Apple Search Ads `addAttributionData` and `enableAdServicesAttributionTokenCollection` are stored as the reserved attributes, such as `$mediaSource`, `$campaign` and the `$appleAds*` ids. RevenueDot looks the AdServices token up with Apple's attribution API. Apple returns campaign ids, not names.
- Promotional offers (`POST /v1/offers`) are signed with the App Store app's In-App Purchase key. Without the key the SDK gets code 7234 for that offer.
- Rewarded ad verification (`generateRewardVerificationToken`, `pollRewardVerification`) works with AdMob's server-side verification callback and RevenueDot's reward rules. AppLovin MAX, ironSource and Unity Ads callbacks are not verified yet. See [Ads](../guides/ads.md#rewarded-ads).
- Web purchase redemption (`redeemWebPurchase`) and the iOS paywall's web checkout (`/rcbilling/v1/hosted-checkout`) work with RevenueDot's own web checkout on your Stripe account. See [Redemption links](../guides/redemption-links.md) and [Sell on the web with Stripe](../guides/web-billing.md).
- The full list of SDK calls and what each answers is in [`prd/sdk-api/PRD.md`](https://github.com/revenuedot/revenuedot/blob/main/prd/sdk-api/PRD.md#endpoint-inventory).

**Stores and receipts**
- RevenueDot accepts purchases for App Store, Mac App Store, Google Play, Amazon Appstore, Stripe and Test Store apps ([Amazon guide](../guides/amazon-appstore.md), [Stripe guide](../guides/stripe.md)). Receipts for Web Billing (`rcb_`), Paddle and Roku apps answer HTTP 400 with code 7662.
- Like RevenueCat, RevenueDot does not detect refunds of Amazon subscriptions. Stripe Connect OAuth ("Connect with Stripe") is not available; save a restricted key instead. RevenueDot sells on the web through your own Stripe account ([web billing](../guides/web-billing.md)), not through RevenueCat Billing.
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
- **REST API v2:** every one of RevenueCat's 128 v2 operations has a route, with RevenueCat's shapes, pagination and errors. 126 do the real work, including the 10 discount operations, which run RevenueDot's [web discounts](../guides/web-discounts.md) as Stripe coupons. The 2 invoice operations exist only for RevenueCat Billing and answer on purpose: the list is empty and a file is 404. `restore_purchase_by_order_id` also accepts App Store order ids; `create_in_store` also creates Google Play subscriptions. See [REST API v2](../../api/rest-v2.md).
- **Extensions that RevenueCat's API does not have:** the import endpoints, `notification_forward_url` on apps, `POST /v2/projects/{project_id}/test_purchases`, store settings and credential checks, mass subscription extension, webhook delivery logs with retry, web billing (web config, web products, purchase links, funnels, domains), and ads (the Ads Overview, reward rules and the rewards ledger, AdMob). See [REST API extensions](../../api/extensions.md).
- **Dashboard sessions** can call `/v2` for every project you belong to; a secret key covers one project.
- **The importer** is RevenueDot's own; see [The importer](importer.md).

## Webhooks
- **Payload:** RevenueCat's shape, `{ "api_version": "1.0", "event": { ... } }`, sent as a `POST` with JSON.
- **Headers:** an optional `Authorization` header you configure, plus `X-RevenueCat-Webhook-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256>` signed with your `whsec_...` secret, and `User-Agent: RevenueDot-Webhooks/1.0`.
- **Delivery:** only HTTP 200 counts as delivered. Failed deliveries retry after 5, 10, 20, 40 and 80 minutes, then stop. Each attempt times out after 60 seconds. You can retry by hand in the dashboard or the API.
- **Event types sent today (19 of 21):** `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `UNCANCELLATION`, `NON_RENEWING_PURCHASE`, `SUBSCRIPTION_PAUSED`, `EXPIRATION`, `BILLING_ISSUE`, `PRODUCT_CHANGE`, `SUBSCRIPTION_EXTENDED`, `REFUND_REVERSED`, `TRANSFER`, `PRICE_INCREASE_CONSENT_REQUIRED`, `PRICE_INCREASE_CONSENT_APPROVED`, `VIRTUAL_CURRENCY_TRANSACTION`, `EXPERIMENT_ENROLLMENT`, `PURCHASE_REDEEMED`, `TEST`, and `SUBSCRIBER_ALIAS` to webhooks whose filter names it.
- **RevenueDot's own types, opt-in:** `FUNNEL_VIEWED`, `FUNNEL_STEP_COMPLETED` and `FUNNEL_PURCHASE` from [funnels](../guides/funnels.md), sent only to webhooks whose filter names them.
- **Accepted in filters but never sent:** `TEMPORARY_ENTITLEMENT_GRANT` (RevenueDot never grants unverified access during a store outage) and `INVOICE_ISSUANCE` (RevenueCat Billing only).
- **Refunds** arrive as `CANCELLATION` with `cancel_reason: "CUSTOMER_SUPPORT"` and a negative price.
- **Imported history sends no webhooks**, unless you import with `--emit-events`.
- **Integrations:** besides webhooks, events go to every tool of RevenueCat's integration catalogue (37 entries) plus BigQuery. Superwall, Appstack, SplitMetrics Acquire and SolarEngine publish no event API, so they get RevenueCat's webhook body at the URL they give you. See [Integrations](../guides/integrations.md).

Details: [Webhooks](../guides/webhooks.md) and [Webhook events](../../api/webhook-events.md). Source: [`apps/server/src/services/webhooks.ts`](https://github.com/revenuedot/revenuedot/blob/main/apps/server/src/services/webhooks.ts).

## Migration
- **Not imported:** paywalls, targeting rules, experiments, virtual currency balances, integrations other than webhooks, and store credentials.
- **Refunded subscriptions import as expired**, because RevenueCat's [API v2](https://www.revenuecat.com/docs/api-v2) subscription object does not show refunds.
- **RevenueCat Billing subscriptions** keep renewing through RevenueCat; only their current access is imported.
- **Google Play purchase tokens** are not in RevenueCat's [API v2](https://www.revenuecat.com/docs/api-v2), which gives order ids. Until RevenueDot finds a token, the subscription is marked `needs_token_refresh` and the customer keeps access.

Source: [`prd/migration/PRD.md`](https://github.com/revenuedot/revenuedot/blob/main/prd/migration/PRD.md).

## Features still planned, by tier
Built since the first release: [paywalls](../guides/paywalls.md) with a visual editor and an AI generator, [targeting and experiments](../guides/targeting-and-experiments.md), 43 [charts](../guides/charts.md) (RevenueCat's 42 plus App Store Save Outcomes), Customer Center, virtual currencies, the [Amazon Appstore](../guides/amazon-appstore.md) and [Stripe](../guides/stripe.md) stores, [web billing](../guides/web-billing.md), [Refund Control](../guides/refund-control.md), [retention offers](../guides/retention.md), [win-back campaigns](../guides/win-back-campaigns.md), the [support view](../guides/support-integrations.md), [ads](../guides/ads.md), all 37 [integrations](../guides/integrations.md) and [RevenueDot AI](../guides/revenuedot-ai.md).

**Tier 1 (the current build), not finished**
- SDK fork packages are partly published: `@revenuedot/purchases-js`, `@revenuedot/purchases-typescript-internal` and `@revenuedot/purchases-js-hybrid-mappings` on npm, `app.revenuedot.purchases` on Maven Central and `RevenueDotPurchases` and `RevenueDotPurchasesUI` on CocoaPods. The React Native, Flutter, Capacitor, Cordova, Unity and Kotlin Multiplatform packages are not published yet.
- Real App Store, Google Play, Amazon Appstore and Stripe sandbox purchases have not run end to end. Store handling is tested against mocked store APIs, and Test Store purchases pass with the unmodified RevenueCat iOS and Android SDKs on a simulator and an emulator.

**Tier 2, still planned**
- Paywalls with several screens and navigation between them. Today a multi-page paywall is one screen with swipeable pages. Video uploads are not built (a video takes a URL), and exit offers and custom variables have no editor yet; they pass through the API.
- A dashboard editor for the Customer Center configuration. Today you set it through the API.
- Memory and custom instructions for RevenueDot AI.
- Moving between self-host and cloud in one step, and a full export.
- Cloud billing plans.

**Tier 3, still planned**
- SSO/SAML, SCIM, custom roles, several organizations, data-location controls and compliance exports.
- High-availability self-host (Helm, Terraform, clustering).
- Web billing: "Connect with Stripe" (OAuth), Paddle as a web provider, an embedded checkout inside purchases-js, funnel A/B tests and automatic TLS for custom domains on Cloud.
- Failed-payment recovery.
- RevenueDot AI tools that write to App Store Connect and Google Play.
- Paddle, Roku and Galaxy stores; ad reward callbacks from AppLovin MAX, ironSource and Unity Ads; benchmarks.

Sources: [`prd/SCOPE.md`](https://github.com/revenuedot/revenuedot/blob/main/prd/SCOPE.md) and [`docs/STATUS.md`](https://github.com/revenuedot/revenuedot/blob/main/docs/STATUS.md).

## Related
- [Migrate from RevenueCat](README.md)
- [SDK changes](sdk-changes.md)
- [Known issues](../help/known-issues.md)
- [All SDKs](../sdks/README.md)

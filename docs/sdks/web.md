---
title: How do I use RevenueDot with the web SDK (purchases-js)?
description: Pass httpConfig.proxyURL to Purchases.configure and turn off analytics events. purchases-js buys with Test Store (test_) keys; to take real payments on the web, send buyers to a RevenueDot purchase link or funnel on your Stripe account.
---

# How do I use RevenueDot with the web SDK (purchases-js)?

Pass `httpConfig: { proxyURL: "https://revenuedot.example.com" }` to `Purchases.configure`, and set `flags: { collectAnalyticsEvents: false }` so the stock SDK does not send analytics events to RevenueCat. **Only Test Store (`test_`) keys work against RevenueDot today.** Web Billing (`rcb_`) and Paddle (`pdl_`) purchases do not: RevenueDot answers their receipts with error 7662. To take real payments on the web, send buyers to a RevenueDot [purchase link](../guides/purchase-links.md) or [funnel](../guides/funnels.md), which run Stripe Checkout on your own Stripe account ([web billing](../guides/web-billing.md)). Purchases from your own Stripe checkout are posted by your backend with the Stripe app's `strp_` key ([Stripe guide](../guides/stripe.md)).

## Use the RevenueCat SDK you already ship (proxy mode)
```ts
import { Purchases } from "@revenuecat/purchases-js";

const purchases = Purchases.configure({
  apiKey: "test_...",
  appUserId: "user_123",
  // Point the SDK at your RevenueDot server; nothing else in the app changes. No trailing slash.
  httpConfig: { proxyURL: "https://revenuedot.example.com" },
  // The stock SDK sends analytics events to RevenueCat even with a proxy URL; turn them off.
  flags: { collectAnalyticsEvents: false },
});
```
- The SDK rejects a proxy URL that ends with `/`.
- purchases-js needs an `appUserId`. Pass your signed-in user's id, or one from `Purchases.generateRevenueCatAnonymousAppUserId()`. See [Anonymous app user IDs](../concepts/customers-and-app-user-ids.md#anonymous-app-user-ids).
- Your RevenueDot server allows browser calls to `/v1` and `/rcbilling` from any origin.
- There is no store history to sync on the web, so no `syncPurchases` step is needed after a migration.

## Use the RevenueDot fork
The fork is [github.com/revenuedot/purchases-js](https://github.com/revenuedot/purchases-js). It sends **analytics events to `httpConfig.proxyURL`** too, and the checkout reads "Secure checkout by RevenueDot". Its default host is `https://api.revenuedot.app`, RevenueDot Cloud, so a Cloud project needs no proxy URL with the fork. Self-hosters keep setting `proxyURL` to their own server.

**Version 1.67.0 is on npm** as `@revenuedot/purchases-js`. An npm alias keeps every import:
```json
{
  "dependencies": {
    "@revenuecat/purchases-js": "npm:@revenuedot/purchases-js@1.67.0"
  }
}
```
With the fork you can leave `collectAnalyticsEvents` on. The [purchases-js Vite example](https://github.com/revenuedot/examples/tree/main/web/purchases-js-vite), installed with this alias from npm, passes its four Playwright tests against a RevenueDot server: a Test Store purchase that unlocks `pro` on the server, sign-in keeping `pro`, a cancelled purchase, and the preview plans.

## Trusted Entitlements do not apply
purchases-js does not check response signatures, so there is nothing to turn off. The server still signs `/v1` and `/rcbilling` responses when `REVENUEDOT_SIGNING_KEY` is set, for the native SDKs. See [Trusted Entitlements](../guides/trusted-entitlements.md).

## Check an entitlement and make a purchase
```ts
const customerInfo = await purchases.getCustomerInfo();
const isPro = "pro" in customerInfo.entitlements.active;

const offerings = await purchases.getOfferings();
const rcPackage = offerings.current?.availablePackages[0];
if (rcPackage) {
  const { customerInfo: after } = await purchases.purchase({ rcPackage });
  const nowPro = "pro" in after.entitlements.active;
}
```
With a `test_` key, `purchase` opens the Test Store modal instead of a payment form.

## Which web purchases work
- **Test Store** inside purchases-js: create a `test_store` app in RevenueDot and use its `test_...` key. See [Test Store](../guides/test-store.md).
- Test Store purchases are always sandbox purchases.
- Test Store prices come from each product's Test Store price. Set it in the dashboard (Product catalog, Edit product) or with `test_store_price` on `POST /v2/projects/{project_id}/products`; a product without one shows 0.
- **Real payments** go through RevenueDot's hosted checkout on your Stripe account, not through purchases-js. Link to a purchase link with `?app_user_id=` set to the same app user id you pass to `Purchases.configure`; after payment, `getCustomerInfo()` shows the entitlement, because entitlements belong to the customer, not to one app. See [Sell on the web with Stripe](../guides/web-billing.md).
- RevenueCat Billing (`rcb_`) and Paddle (`pdl_`) apps can be created, but RevenueDot does not accept their purchases, and purchases-js's own Web Billing checkout answers an error. See [What differs from RevenueCat](../migrate/what-differs.md).

## Migrate from RevenueCat
```diff
 const purchases = Purchases.configure({
   apiKey: "test_...",
   appUserId,
+  // Point the SDK at your RevenueDot server; nothing else in the app changes. No trailing slash.
+  httpConfig: { proxyURL: "https://revenuedot.example.com" },
+  // Analytics events do not use the proxy URL; turn them off to keep all traffic on your server.
+  flags: { collectAnalyticsEvents: false },
 });
```
If you sell through RevenueCat Web Billing today, keep those subscriptions on RevenueCat: the importer copies their current access, but renewals stay with RevenueCat. New web sales can start on RevenueDot's [hosted checkout](../guides/web-billing.md). See [Migrate from RevenueCat](../migrate/README.md).

## Examples
- [web/purchases-js-vite](https://github.com/revenuedot/examples/tree/main/web/purchases-js-vite): a Vite page that configures purchases-js with a proxy URL, buys through the Test Store and shows the entitlement.

## Related
- [All SDKs](README.md)
- [Test Store](../guides/test-store.md)
- [Sell on the web with Stripe](../guides/web-billing.md)
- [Customers and app user IDs](../concepts/customers-and-app-user-ids.md)
- [What differs from RevenueCat](../migrate/what-differs.md)

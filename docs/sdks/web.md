---
title: How do I add RevenueDot to a web app with purchases-js?
description: Install @revenuedot/purchases-js and call Purchases.configure with a Test Store key and your user's ID. It buys with Test Store (test_) keys; to take real payments on the web, send buyers to a RevenueDot purchase link or funnel on your Stripe account.
---

# How do I add RevenueDot to a web app with purchases-js?

Install `@revenuedot/purchases-js`, the RevenueDot SDK for the web, and call `Purchases.configure` with a Test Store (`test_`) key and your user's ID. On RevenueDot Cloud nothing else is needed. **purchases-js buys only with Test Store keys today.** To take real payments on the web, send buyers to a RevenueDot [purchase link](../guides/purchase-links.md) or [funnel](../guides/funnels.md), which run Stripe Checkout on your own Stripe account ([web billing](../guides/web-billing.md)). Purchases from your own Stripe checkout are posted by your backend with the Stripe app's `strp_` key ([Stripe guide](../guides/stripe.md)).

## Install the RevenueDot SDK and pass your key
**Version 1.67.0 is on npm** as `@revenuedot/purchases-js`. The source is [github.com/revenuedot/purchases-js](https://github.com/revenuedot/purchases-js).
```bash
npm install @revenuedot/purchases-js@1.67.0
```
```ts
import { Purchases } from "@revenuedot/purchases-js";

const purchases = Purchases.configure({
  apiKey: "test_...",
  appUserId: "user_123",
});
```
- The RevenueDot SDK for the web is built from RevenueCat's open-source purchases-js (MIT license), so your code calls `Purchases` the same way. It sends every request, including analytics events, to RevenueDot and needs no RevenueCat account. Its checkout reads "Secure checkout by RevenueDot".
- **On RevenueDot Cloud** the SDK already calls `https://api.revenuedot.app`, so there is nothing else to set.
- purchases-js needs an `appUserId`. Pass your signed-in user's id, or one from `Purchases.generateRevenueCatAnonymousAppUserId()`. See [Anonymous app user IDs](../concepts/customers-and-app-user-ids.md#anonymous-app-user-ids).
- purchases-js does not check response signatures, so there is no verification setting. The server still signs `/v1` and `/rcbilling` responses when `REVENUEDOT_SIGNING_KEY` is set, for the native SDKs. See [Trusted Entitlements](../guides/trusted-entitlements.md).

**Self-hosting:** pass your server's address as `httpConfig.proxyURL`. Your RevenueDot server allows browser calls to `/v1` and `/rcbilling` from any origin.
```ts
const purchases = Purchases.configure({
  apiKey: "test_...",
  appUserId: "user_123",
  // Your server's address. No trailing slash: the SDK rejects a proxy URL that ends with "/".
  httpConfig: { proxyURL: "https://revenuedot.example.com" },
});
```

## Check an entitlement and make a purchase
Check the entitlement your app unlocks, here `pro`, then buy a package from the current offering, the set of products your paywall shows.
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
- RevenueCat Billing (`rcb_`) and Paddle (`pdl_`) apps can be created, but RevenueDot does not accept their purchases: it answers their receipts with error 7662, and purchases-js's own Web Billing checkout answers an error. See [What differs from RevenueCat](../migrate/what-differs.md).

## Switching from RevenueCat? Keep your SDK and change one line
An app that ships RevenueCat's `@revenuecat/purchases-js` can keep it. Pass `httpConfig: { proxyURL: "https://revenuedot.example.com" }` to `Purchases.configure` (`https://api.revenuedot.app` on RevenueDot Cloud), and set `flags: { collectAnalyticsEvents: false }` so RevenueCat's SDK does not send analytics events to RevenueCat.

```ts
import { Purchases } from "@revenuecat/purchases-js";

const purchases = Purchases.configure({
  apiKey: "test_...",
  appUserId: "user_123",
  // Point the SDK at your RevenueDot server; nothing else in the app changes. No trailing slash.
  httpConfig: { proxyURL: "https://revenuedot.example.com" },
  // RevenueCat's SDK sends analytics events to RevenueCat even with a proxy URL; turn them off.
  flags: { collectAnalyticsEvents: false },
});
```
- There is no store history to sync on the web, so no `syncPurchases` step is needed after a migration.
- **Or install the RevenueDot SDK under the same name.** An npm alias keeps every `@revenuecat/purchases-js` import, and you can leave `collectAnalyticsEvents` on:
  ```json
  {
    "dependencies": {
      "@revenuecat/purchases-js": "npm:@revenuedot/purchases-js@1.67.0"
    }
  }
  ```
  The [purchases-js Vite example](https://github.com/revenuedot/examples/tree/main/web/purchases-js-vite), installed with this alias from npm, passes its four Playwright tests against a RevenueDot server: a Test Store purchase that unlocks `pro` on the server, sign-in keeping `pro`, a cancelled purchase, and the preview plans.

The whole app change fits in one diff:
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

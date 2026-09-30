---
title: How do I use RevenueDot with the web SDK (purchases-js)?
description: Pass httpConfig.proxyURL to Purchases.configure and turn off analytics events. Only Test Store (test_) keys work against RevenueDot today; Web Billing, Stripe and Paddle do not.
---

# How do I use RevenueDot with the web SDK (purchases-js)?

Pass `httpConfig: { proxyURL: "https://revenuedot.example.com" }` to `Purchases.configure`, and set `flags: { collectAnalyticsEvents: false }` so the stock SDK does not send analytics events to RevenueCat. **Only Test Store (`test_`) keys work against RevenueDot today.** Web Billing (`rcb_`), Stripe (`strp_`) and Paddle (`pdl_`) purchases do not: RevenueDot answers their receipts with error 7662.

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
The fork is [github.com/revenuedot/purchases-js](https://github.com/revenuedot/purchases-js). It sends **analytics events to `httpConfig.proxyURL`** too, and the checkout reads "Secure checkout by RevenueDot". Its default host is `https://api.revenuedot.app`, which is not live yet, so keep setting `proxyURL`.

**It is not published yet (2026-09-30).** The planned install keeps your imports through an npm alias:
```json
{
  "dependencies": {
    "@revenuecat/purchases-js": "npm:@revenuedot/purchases-js@<version>"
  }
}
```
**To use it today**, build a tarball from the patch branch (version 1.67.0). It needs Node and pnpm:
```bash
git clone -b revenuedot/main-patches https://github.com/revenuedot/purchases-js
cd purchases-js
pnpm install && pnpm build && pnpm pack
# In your app:
npm install "@revenuecat/purchases-js@file:../purchases-js/revenuedot-purchases-js-1.67.0.tgz"
```
With the fork you can leave `collectAnalyticsEvents` on. The fork's web build ran end to end against a real RevenueDot server: configure, customer info, offerings, a Test Store purchase, and the `pro` entitlement turning active, with every request going to the proxy URL.

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

## Test Store is the only web store today
- Create a `test_store` app in RevenueDot and use its `test_...` key. See [Test Store](../guides/test-store.md).
- Test Store purchases are always sandbox purchases.
- Prices show as 0, because the catalog does not store Test Store prices yet.
- `rcb_`, `strp_` and `pdl_` apps can be created, but RevenueDot does not accept their purchases yet. Web Billing is planned for a later tier; see [What differs from RevenueCat](../migrate/what-differs.md).

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
If you sell through RevenueCat Web Billing today, keep those subscriptions on RevenueCat: the importer copies their current access, but renewals stay with RevenueCat. See [Migrate from RevenueCat](../migrate/README.md).

## Examples
- [web/purchases-js-vite](https://github.com/revenuedot/examples/tree/main/web/purchases-js-vite): a Vite page that configures purchases-js with a proxy URL, buys through the Test Store and shows the entitlement.

## Related
- [All SDKs](README.md)
- [Test Store](../guides/test-store.md)
- [Customers and app user IDs](../concepts/customers-and-app-user-ids.md)
- [What differs from RevenueCat](../migrate/what-differs.md)

---
title: Introducing RevenueDot, an open-source backend for in-app purchases
description: RevenueDot is an open-source, self-hostable backend for in-app purchases that works with the RevenueCat SDK. Here is why we built it, and what works in the pre-alpha today.
date: 2026-09-30
author: RevenueDot team
---

# Introducing RevenueDot, an open-source backend for in-app purchases

RevenueDot is an open-source (AGPL-3.0), self-hostable backend for in-app purchases and subscriptions. It speaks the same API as RevenueCat's backend, so an app that already uses the RevenueCat SDK can talk to a RevenueDot server by changing one setting: the SDK's proxy URL. Your purchase code, your offerings and your customers stay where they are.

It is pre-alpha. The core runs and is tested, and you can make purchases against it today, but it is not ready for live customers yet. This post says what we built, why, and exactly where it stands.

## Why we built it
Subscription apps need a backend that checks store receipts, tracks who has access, follows renewals and refunds, and tells the app's own server what happened. RevenueCat made that easy, and its SDKs are some of the best-maintained open-source code in mobile. We wanted three things that a hosted service cannot give.

**No share of revenue.** RevenueCat's Pro plan is free up to $2,500 in monthly tracked revenue, then charges 1% of tracked revenue ([RevenueCat pricing](https://www.revenuecat.com/pricing)). At $50,000 a month that is roughly $500 a month. At $500,000 a month it is roughly $5,000 a month, or $60,000 a year. A self-hosted RevenueDot costs what your server and database cost.

**Your own data, in your own region.** Purchases, customers, receipts and events live in your Postgres database. You choose where it runs, who can read it and how long it keeps things. Nothing leaves your infrastructure unless you send it.

**Code you can read.** The server decides who gets access to your paid features. With RevenueDot you can read that code, test it and change it.

## How it works
One server process serves four things on one port:
- the **SDK API** under `/v1`, the endpoints the RevenueCat SDKs call;
- the **REST API** under `/v2`, for your backend and scripts;
- **store notifications** from Apple and Google, under `/v1/notifications/...`;
- the **dashboard**, at `/login`.

The app changes one line. On iOS:

```swift
// Point the SDK at your RevenueDot server; nothing else in the app changes.
Purchases.proxyURL = URL(string: "https://revenuedot.example.com")!
Purchases.configure(withAPIKey: "appl_...")
```

Every other RevenueCat SDK has the same setting, from React Native's `setProxyURL` to the `httpConfig.proxyURL` option in purchases-js. When the SDK posts a purchase, RevenueDot verifies it with Apple or Google, stores it, answers with the customer's entitlements, and sends a webhook to your backend. The webhook has the same JSON shape and the same kind of signature header as RevenueCat's, so an existing handler keeps working.

A real answer from a local server, after a Test Store purchase, starts like this:

```json
{
  "request_date": "2026-09-30T20:41:54Z",
  "subscriber": {
    "entitlements": {
      "pro": { "expires_date": "2026-10-30T20:41:54Z", "product_identifier": "pro_monthly", "purchase_date": "2026-09-30T20:41:54Z", "grace_period_expires_date": null }
    },
    "original_app_user_id": "user_1"
  },
  "purchased_products": { "pro_monthly": { "should_consume": false } }
}
```

## What works today
- **The SDK endpoints**: customer info, offerings, receipts, `logIn`, attributes, the product-to-entitlement mapping for offline entitlements, and the configuration and event endpoints the SDKs call on start.
- **Four stores for receipts**: App Store, Mac App Store, Google Play and our own Test Store. StoreKit 2 signed transactions are verified against Apple's certificate chain. Google purchases are read from the Play Developer API and acknowledged.
- **Store notifications**: App Store Server Notifications v2 and Google Play real-time notifications, with a setup-health check that tells you whether they arrive.
- **Identity**: anonymous IDs, `logIn`, aliases, and the four restore rules (`transfer`, `transfer_if_no_active`, `keep`, `share`).
- **Webhooks**: fifteen event types, HMAC signatures, an `Authorization` header you choose, and retries after 5, 10, 20, 40 and 80 minutes.
- **REST API v1 and the core of v2**: customers, subscriptions, purchases, entitlements, offerings, packages, products, apps and projects.
- **A dashboard** with overview metrics, customers, catalog, webhooks, API keys and setup health.
- **Response signing** in the same format the SDKs verify.
- **An importer** that copies a RevenueCat project's catalog, customers and public app keys. It runs from source today.
- **MIT forks of all ten RevenueCat SDKs**, patched and checked, but not yet published to any package registry.

## What does not work yet
We would rather you hear this from us than find out in production.
- **No real App Store or Google Play sandbox purchase has run end to end.** The store code is tested against mocked Apple and Google APIs only.
- **The native iOS SDK cannot load Test Store products** from RevenueDot yet. purchases-js and React Native in Expo Go or on the web can.
- **Paywalls, experiments, targeting, Customer Center and virtual currencies** are not built. The SDK hides them instead of crashing.
- **Amazon, Stripe, Web Billing, Paddle and Roku** receipts are refused.
- **With the stock SDK, response signatures read as FAILED**, because we cannot sign with RevenueCat's key. You turn the check off, or build our forks with your own key.
- **There is no hosted service yet.** RevenueDot Cloud is planned. Today you run it yourself.

The full list, with a workaround for each item, is in [Known issues](../docs/help/known-issues.md).

## How to try it
You need Docker, `curl` and `jq`. The quickstart takes about five minutes, and most of that is the first image build:

```bash
git clone https://github.com/revenuedot/examples.git
cd examples/selfhost/docker-compose
cp .env.example .env          # set POSTGRES_PASSWORD
docker compose up -d
./seed.sh                     # prints a Test Store key and a secret key
```

Then point the [purchases-js example](https://github.com/revenuedot/examples/tree/main/web/purchases-js-vite) at `http://localhost:8787` and buy something. The [quickstart](../docs/getting-started/quickstart.md) walks through each step.

If you already use RevenueCat, read [Migrate from RevenueCat](../docs/migrate/README.md) before you touch production. The order of steps matters.

## What comes next
Our next milestones, in order:
1. Real App Store and Google Play sandbox purchases, end to end.
2. The fix for Test Store products on native iOS.
3. Published SDK forks and a published importer.
4. RevenueDot Cloud, for teams that would rather not run a server.

The build plan is public in the repository. RevenueDot is not affiliated with RevenueCat. "RevenueCat" is a trademark of RevenueCat, Inc., and we use it only to describe compatibility.

**About RevenueDot.** RevenueDot is an open-source (AGPL-3.0), self-hostable backend for in-app purchases and subscriptions that works with the RevenueCat SDK. Point the SDK's proxy URL at your RevenueDot server and keep your app code, your offerings and your customers. Start with the [quickstart](../docs/getting-started/quickstart.md) or read the code on [GitHub](https://github.com/revenuedot/revenuedot).

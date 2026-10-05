---
title: What is RevenueDot?
description: RevenueDot is an open-source backend for in-app purchases and subscriptions on the App Store, Google Play, Amazon, Stripe and the web. Install the RevenueDot SDK, then start free on RevenueDot Cloud or self-host it.
---

# What is RevenueDot?

RevenueDot is an open-source backend for in-app purchases and subscriptions on the App Store, Google Play, Amazon, Stripe and the web. You install the RevenueDot SDK in your app. RevenueDot then checks every purchase with the store, keeps each customer's access in sync and tells your backend what happened. The quickest start is **RevenueDot Cloud**: [create a free account](https://app.revenuedot.app/signup). Cloud is free until your app makes $10,000 a month in tracked revenue. You can also run the same server yourself with Docker and Postgres.

```swift
// iOS: install the RevenueDot SDK, then pass your app's key. On RevenueDot Cloud that is all the setup.
import RevenueCat

Purchases.configure(withAPIKey: "appl_...")
```

The RevenueDot SDK is built from RevenueCat's open-source SDK (MIT license), so your code imports `RevenueCat` and calls `Purchases`. It sends every request to RevenueDot and needs no RevenueCat account. The install line for every platform is in [Which SDKs does RevenueDot have?](../sdks/README.md).

[![Watch the 2½-minute demo of the RevenueDot platform](https://revenuedot.app/videos/revenuedot-platform-demo.webp)](https://revenuedot.app/videos/revenuedot-platform-demo.mp4)

*Watch the 2:32 walkthrough, or [on YouTube](https://www.youtube.com/watch?v=iZH8eTC5B1c). [Watch page](https://revenuedot.app/watch/revenuedot-platform-demo).*

> Every page states what exists today and what is planned. Current limits are listed in [Known issues](../help/known-issues.md).

## RevenueDot checks purchases, keeps access in sync and runs your paywalls
- **It checks every purchase with the store.** App Store purchases are verified against Apple's signed transactions and the App Store Server API. Google Play purchases are verified with the Google Play Developer API. Nothing is trusted from the device alone.
- **It keeps each customer's access up to date.** It turns store events (renewals, cancellations, billing problems, refunds, pauses) into **entitlements**. An entitlement is the access your app checks, such as `pro`.
- **It serves your paywall's contents.** An **offering** is the set of products your paywall shows, grouped into **packages**. You build [paywalls](../guides/paywalls.md) from templates in a visual editor and compare them with [experiments](../guides/experiments.md).
- **It tells your backend what happened.** [Webhooks](../guides/webhooks.md) carry an HMAC signature, and [integrations](../guides/integrations.md) send the same events to analytics and marketing tools.
- **It shows your numbers.** [Charts](../guides/charts.md) cover revenue, subscribers, trials and churn.
- **It sells beyond the app stores.** [Web checkout](../guides/web-billing.md) runs on your own Stripe account, and in-app currencies let you sell credits.
- **It gives you APIs and a dashboard.** REST APIs (v1 and v2) and a web dashboard manage the catalog, customers, apps, API keys and webhooks.

## RevenueDot is open source, and Cloud is free until $10,000 a month
| | RevenueDot |
|---|---|
| Source code | Open source: the server and dashboard are AGPL-3.0 ([repository](https://github.com/revenuedot/revenuedot)), and the SDKs are MIT |
| Where it runs | RevenueDot Cloud at `https://api.revenuedot.app`, or your own servers (one Docker image plus Postgres) |
| Price | RevenueDot Cloud is free until your app makes $10,000 a month in tracked revenue (store revenue before Apple and Google take their cut). Above that, Cloud Standard is 0.5% of the revenue above $10,000, capped at $999 a month. Self-hosting is free. Enterprise starts at $50,000 a year |
| App changes | Install the RevenueDot SDK and pass your app's key. A self-hosted server needs one more line of setup: the server's address |
| Data | On Cloud, RevenueDot runs the database for you. Self-hosted, purchases, customers and receipts stay in your own Postgres |

## Your app talks to RevenueDot, and RevenueDot talks to the stores
```text
 Your app (RevenueDot SDK)
      │  GET /v1/subscribers/{id}, GET .../offerings, POST /v1/receipts
      ▼
 RevenueDot server ◀──── App Store Server Notifications v2, Google Play real-time notifications
      │  Postgres (customers, purchases, events)
      ├──▶ Webhooks to your backend (INITIAL_PURCHASE, RENEWAL, EXPIRATION ...)
      └──▶ Dashboard and REST API (catalog, customers, keys)
```

1. The app asks RevenueDot for offerings and customer info.
2. The user buys through the App Store, Google Play or the built-in **Test Store**. The Test Store lets you buy before you have an App Store or Google Play account.
3. The SDK posts the purchase to `POST /v1/receipts`. RevenueDot verifies it with the store and answers with updated customer info, including active entitlements.
4. Later changes, such as renewals and refunds, arrive as store notifications. RevenueDot updates the customer and sends webhooks.

## Switching from RevenueCat? Keep your SDK and change one line
An app that already ships the RevenueCat SDK can keep it. Set the SDK's proxy URL to RevenueDot before `configure`, turn off its response-signature check, and keep your purchase code. RevenueDot implements the API that the RevenueCat SDKs call, its REST APIs are RevenueCat-compatible, and its webhooks use RevenueCat's payload shape.

```swift
// Switching from RevenueCat: keep the RevenueCat SDK and point it at RevenueDot Cloud, or at your own server.
Purchases.proxyURL = URL(string: "https://api.revenuedot.app")!
Purchases.configure(with: Configuration.Builder(withAPIKey: "appl_...").with(entitlementVerificationMode: .disabled).build())
```

The full order of steps, with the importer and a side-by-side run, is in [Migrate from RevenueCat](../migrate/README.md).

RevenueDot is not affiliated with, endorsed by or sponsored by RevenueCat, Inc. "RevenueCat" is a trademark of RevenueCat, Inc. and is used here only to describe compatibility.

## Where to go next
- **Try it in 5 minutes:** [create a free RevenueDot Cloud account](https://app.revenuedot.app/signup), then follow the [Quickstart](quickstart.md).
- **Install the SDK for your platform:** [SDK guides](../sdks/README.md).
- **Learn the model:** [Concepts](../concepts/README.md).
- **Already selling with your own StoreKit or Google Play Billing code?** [Import your products](../guides/import-products.md) from App Store Connect, Google Play or Stripe, install the RevenueDot SDK, and call `syncPurchases()` once so current subscribers keep access. See [How do I connect my app?](connect-your-app.md).
- **Switching from RevenueCat? Keep your SDK and change one line:** [Migrate from RevenueCat](../migrate/README.md).
- **Run it yourself:** [Self-hosting](../guides/self-hosting.md) and [Going to production](../guides/going-to-production.md).
- **Look something up:** [API reference](../../api/README.md), [Help center](../help/README.md), [Blog](../../blog/README.md).

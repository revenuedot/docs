---
title: What is RevenueDot?
description: RevenueDot is an open-source backend for in-app purchases and subscriptions that works with the RevenueCat SDK. Start free on RevenueDot Cloud or self-host it, point the SDK's proxy URL at it and keep your app code.
---

# What is RevenueDot?

RevenueDot is an open-source (AGPL-3.0) backend for in-app purchases and subscriptions that works with the RevenueCat SDK. The quickest start is **RevenueDot Cloud**: [create a free account](https://app.revenuedot.app/signup) and use `https://api.revenuedot.app`. Cloud is free up to $10,000 in monthly tracked revenue. You can also run the same server yourself with Docker and Postgres. An app that already uses the RevenueCat SDK points the SDK at RevenueDot with one setting, the **proxy URL**, and keeps its purchase code.

```swift
// Point the SDK at RevenueDot Cloud, or at your own server; nothing else in the app changes.
Purchases.proxyURL = URL(string: "https://api.revenuedot.app")!
Purchases.configure(with: Configuration.Builder(withAPIKey: "appl_...").with(entitlementVerificationMode: .disabled).build())
```

[![Watch the 2½-minute demo of the RevenueDot platform](https://revenuedot.app/videos/revenuedot-platform-demo.webp)](https://revenuedot.app/videos/revenuedot-platform-demo.mp4)

*Watch the 2:32 walkthrough, or [on YouTube](https://www.youtube.com/watch?v=iZH8eTC5B1c). [Watch page](https://revenuedot.app/watch/revenuedot-platform-demo).*

> Every page states what exists today and what is planned. Current limits are listed in [Known issues](../help/known-issues.md).

## What RevenueDot does
- **Checks purchases with the stores.** App Store purchases are verified against Apple's signed transactions and the App Store Server API. Google Play purchases are verified with the Google Play Developer API. Nothing is trusted from the device alone.
- **Keeps each customer's access up to date.** It turns store events (renewals, cancellations, billing problems, refunds, pauses) into **entitlements** that your app checks, such as `pro`.
- **Serves your paywall's contents.** **Offerings** and **packages** tell the app which products to show.
- **Tells your backend what happened.** Webhooks use RevenueCat's payload shape and carry an HMAC signature.
- **Gives you APIs and a dashboard.** RevenueCat-compatible REST APIs (v1 and v2) and a web dashboard for the catalog, customers, apps, API keys and webhooks.

## What makes it different
| | RevenueDot |
|---|---|
| Source code | Open source: the server and dashboard are AGPL-3.0 ([repository](https://github.com/revenuedot/revenuedot)) |
| Where it runs | RevenueDot Cloud at `https://api.revenuedot.app`, or your own servers (one Docker image plus Postgres) |
| Price | RevenueDot Cloud is free up to $10,000 in monthly tracked revenue, and sign-up is open. Paid Cloud plans have not shipped. Self-hosting is free |
| App changes | Set the SDK's proxy URL and turn off its response-signature check, or install the RevenueDot fork of the SDK |
| Data | On Cloud, RevenueDot runs the database for you. Self-hosted, purchases, customers and receipts stay in your own Postgres |

RevenueDot is not affiliated with, endorsed by or sponsored by RevenueCat, Inc. "RevenueCat" is a trademark of RevenueCat, Inc. and is used here only to describe compatibility.

## How the pieces fit
```text
 Your app (RevenueCat SDK, proxyURL = RevenueDot)
      │  GET /v1/subscribers/{id}, GET .../offerings, POST /v1/receipts
      ▼
 RevenueDot server ◀──── App Store Server Notifications v2, Google Play real-time notifications
      │  Postgres (customers, purchases, events)
      ├──▶ Webhooks to your backend (INITIAL_PURCHASE, RENEWAL, EXPIRATION ...)
      └──▶ Dashboard and REST API (catalog, customers, keys)
```

1. The app asks RevenueDot for offerings and customer info.
2. The user buys through the App Store, Google Play or the built-in **Test Store**.
3. The SDK posts the purchase to `POST /v1/receipts`. RevenueDot verifies it with the store and answers with updated customer info, including active entitlements.
4. Later changes, such as renewals and refunds, arrive as store notifications. RevenueDot updates the customer and sends webhooks.

## Where to go next
- **Try it in 5 minutes:** [create a free RevenueDot Cloud account](https://app.revenuedot.app/signup), then follow the [Quickstart](quickstart.md).
- **Choose how your app connects:** [proxy mode, fork packages or your existing keys](connect-your-app.md).
- **Learn the model:** [Concepts](../concepts/README.md).
- **Move a live app:** [Migrate from RevenueCat](../migrate/README.md).
- **Connect your SDK:** [SDK guides](../sdks/README.md).
- **Run it yourself:** [Self-hosting](../guides/self-hosting.md) and [Going to production](../guides/going-to-production.md).
- **Look something up:** [API reference](../../api/README.md), [Help center](../help/README.md), [Blog](../../blog/README.md).

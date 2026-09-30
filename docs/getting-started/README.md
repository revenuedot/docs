---
title: What is RevenueDot?
description: RevenueDot is an open-source, self-hostable backend for in-app purchases and subscriptions that works with the RevenueCat SDK. Point the SDK's proxy URL at it and keep your app code.
---

# What is RevenueDot?

RevenueDot is an open-source (AGPL-3.0) server for in-app purchases and subscriptions that works with the RevenueCat SDK. You run it yourself with Docker and Postgres, or use **RevenueDot Cloud**: sign up at [app.revenuedot.app](https://app.revenuedot.app) and use `https://api.revenuedot.app`. An app that already uses the RevenueCat SDK points the SDK at RevenueDot with one setting, the **proxy URL**, and keeps its purchase code.

```swift
// Point the SDK at your RevenueDot server; nothing else in the app changes.
Purchases.proxyURL = URL(string: "https://revenuedot.example.com")!
Purchases.configure(with: Configuration.Builder(withAPIKey: "appl_...").with(entitlementVerificationMode: .disabled).build())
```

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
| Where it runs | Your own servers (one Docker image plus Postgres), or RevenueDot Cloud at `https://api.revenuedot.app` |
| Price | Free to self-host. RevenueDot Cloud is live with open sign-up, and every account is on the free plan |
| App changes | Set the SDK's proxy URL and turn off its response-signature check, or install the RevenueDot fork of the SDK |
| Data | Self-hosted: purchases, customers and receipts stay in your own Postgres |

RevenueDot is not affiliated with, endorsed by or sponsored by RevenueCat, Inc. "RevenueCat" is a trademark of RevenueCat, Inc. and is used here only to describe compatibility.

## How the pieces fit
```text
 Your app (RevenueCat SDK, proxyURL = your server)
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
- **Try it in 5 minutes:** [Quickstart](quickstart.md), or sign up for RevenueDot Cloud at [app.revenuedot.app](https://app.revenuedot.app).
- **Choose how your app connects:** [proxy mode, fork packages or your existing keys](connect-your-app.md).
- **Learn the model:** [Concepts](../concepts/README.md).
- **Move a live app:** [Migrate from RevenueCat](../migrate/README.md).
- **Connect your SDK:** [SDK guides](../sdks/README.md).
- **Run it for real:** [Self-hosting](../guides/self-hosting.md) and [Going to production](../guides/going-to-production.md).
- **Look something up:** [API reference](../../api/README.md), [Help center](../help/README.md), [Blog](../../blog/README.md).

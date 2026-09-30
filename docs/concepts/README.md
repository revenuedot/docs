---
title: How is RevenueDot organized?
description: A server holds projects. A project holds apps (one per store), a catalog of products, entitlements, offerings and packages, and customers with their purchases and events.
---

# How is RevenueDot organized?

A RevenueDot server holds **projects**. A project holds **apps** (one per store), a **catalog** (products, entitlements, offerings, packages) and **customers** (with their subscriptions, one-time purchases and events). Your app checks **entitlements**, not products.

```text
Project "Scanner"
├── Apps            App Store app (appl_ key) · Google Play app (goog_ key) · Test Store app (test_ key)
├── Products        pro_monthly (App Store) · pro:monthly (Google Play) · pro_monthly (Test Store) · lifetime
├── Entitlements    pro  ← unlocked by any of the products above
├── Offerings       default (current)  →  packages $rc_monthly, $rc_annual  →  one product per app
└── Customers       user_42 (aliases: $RCAnonymousID:ab12…, user_42)
                      ├── subscriptions and one-time purchases, per store
                      └── events: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION …
```

## The pages in this section
| Page | What it explains |
|---|---|
| [Projects, apps and API keys](projects-and-apps.md) | What a project is, which app types exist, and which key goes where |
| [Products and entitlements](products-and-entitlements.md) | How store products map to the access your app checks |
| [Offerings and packages](offerings-and-packages.md) | How the paywall's contents are chosen without an app update |
| [Customers and app user IDs](customers-and-app-user-ids.md) | Anonymous IDs, `logIn`, aliases, and who owns a restored purchase |
| [Subscriptions and events](subscriptions-and-events.md) | Lifecycle states, grace periods, refunds, and the events each change produces |
| [Sandbox and production](sandbox.md) | How test purchases are kept apart from real ones |

## Words used across the docs
| Word | Meaning |
|---|---|
| **Proxy URL** | The SDK setting that sends every SDK request to your RevenueDot server instead of RevenueCat's API |
| **Public app key** | A per-app key the SDK sends (`appl_`, `goog_`, `test_` …). Safe to ship in an app |
| **Secret key** | A per-project key (`sk_…`) for the REST API and your backend. Never ship it in an app |
| **App user ID** | The ID the SDK uses for the current user: either your own ID or an anonymous `$RCAnonymousID:…` |
| **Customer info** | The JSON the SDK decodes into `CustomerInfo`: entitlements, subscriptions and one-time purchases |
| **Test Store** | RevenueDot's built-in store for development. Purchases need no App Store or Google Play account and are always sandbox |
| **Sandbox** | Test purchases (App Store sandbox, Google Play test purchases, the Test Store). They are kept apart from production in metrics and can be filtered for webhooks. See [Sandbox and production](sandbox.md) |

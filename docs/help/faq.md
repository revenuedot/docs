---
title: What do people most often ask about RevenueDot?
description: Short answers about what RevenueDot is, what it costs, its licenses, the stores and SDKs it supports, and what works today.
---

# What do people most often ask about RevenueDot?

RevenueDot is an open-source (AGPL-3.0) backend for in-app purchases and subscriptions that works with the RevenueCat SDK. Start free on [RevenueDot Cloud](https://app.revenuedot.app/signup), or self-host it with Docker and Postgres. The answers below say what exists on 2026-09-30.

## Is RevenueDot an open-source RevenueCat alternative?
Yes. RevenueDot implements the API that the RevenueCat SDKs call, so an app keeps its purchase code and points the SDK at RevenueDot Cloud, or at its own RevenueDot server, with one setting, the proxy URL. The server code is on [GitHub](https://github.com/revenuedot/revenuedot). RevenueDot is not affiliated with RevenueCat.

## Can I self-host RevenueCat?
No. RevenueCat's backend is a hosted service; only its SDKs are open source ([purchases-ios license](https://github.com/RevenueCat/purchases-ios/blob/main/LICENSE)). To run the backend yourself, you run RevenueDot with Docker and Postgres and keep the RevenueCat SDK in your app. See [Self-hosting](../guides/self-hosting.md).

## Do I have to change my app?
One line, plus one setting on most platforms:
1. Set the SDK's proxy URL before you configure the SDK: `https://api.revenuedot.app` on RevenueDot Cloud, or your own server's URL.
2. Turn off the SDK's response-signature check, because RevenueDot cannot sign with RevenueCat's key. See [signature verification](signature-verification-failed.md).

```swift
// Point the SDK at RevenueDot Cloud, or at your own server; nothing else in the app changes.
Purchases.proxyURL = URL(string: "https://api.revenuedot.app")!
```

Every platform's version of this line is in the [SDK guides](../sdks/README.md).

## How is RevenueDot different from RevenueCat?
- **You choose where it runs.** Use RevenueDot Cloud, or run it yourself and keep your purchase data in your own Postgres.
- **The server is open source** under AGPL-3.0, so you can read the code that decides who gets access.
- **It is catching up feature by feature.** Paywalls, experiments, targeting, the charts, Customer Center and virtual currencies are built; [What differs](../migrate/what-differs.md) lists what is still missing next to RevenueCat ([features](https://www.revenuecat.com/pricing)).
- **It is newer.** RevenueCat has a longer track record as a hosted service.

## What does it cost?
RevenueDot Cloud is free up to $10,000 in monthly tracked revenue. Sign-up is open at [app.revenuedot.app/signup](https://app.revenuedot.app/signup), every account is on the free plan. Cloud Standard, 0.5% of tracked revenue above $10,000 a month capped at $999 a month, is built and starts when billing is switched on; see [Cloud billing](../guides/cloud-billing.md). Self-hosting is free: you pay only for your server and database. RevenueCat's Pro plan is free up to $2,500 in monthly tracked revenue and then charges 1% of tracked revenue ([pricing](https://www.revenuecat.com/pricing)).

## Which licenses apply?
- The server and dashboard are AGPL-3.0.
- The SDK forks keep RevenueCat's MIT license, with RevenueDot's copyright line added for the changes.
- The importer CLI package, the MCP server and the agent skills are MIT.
- The `ee/` folder ([RevenueDot Enterprise](../guides/enterprise.md)) is under the RevenueDot Enterprise License.

Details are in [LICENSING.md](https://github.com/revenuedot/revenuedot/blob/main/LICENSING.md). If you change the server and let other people use it over a network, AGPL-3.0 asks you to offer them your changed source.

## Which stores are supported?
Receipts are accepted today for four app types:

| App type | Store |
|---|---|
| `app_store` | Apple App Store |
| `mac_app_store` | Mac App Store |
| `play_store` | Google Play |
| `test_store` | RevenueDot Test Store (no real store) |
| `amazon` | Amazon Appstore ([guide](../guides/amazon-appstore.md)) |
| `stripe` | Stripe purchases on your own Stripe account: from RevenueDot's hosted checkout ([web billing](../guides/web-billing.md)) or posted by your backend ([guide](../guides/stripe.md)) |

RevenueCat Billing (`rcb_`), Paddle and Roku apps can be created, but their receipts answer HTTP 400 with code 7662. See [Projects and apps](../concepts/projects-and-apps.md).

## Is it production-ready?
No. The App Store and Google Play code is tested against mocked Apple and Google APIs only. No real App Store or Google Play sandbox purchase has run end to end yet. Use it for evaluation and testing, and keep RevenueCat for live customers until a release says otherwise. See [Known issues](known-issues.md).

## Who owns the data?
On RevenueDot Cloud, RevenueDot stores your customers, purchases, receipts and events for you, and you can read all of them through the dashboard and the REST API. When you self-host, they live in your own Postgres database and nothing is sent to RevenueDot. Back up a self-hosted database like any other production database: see [Backups](../guides/backups.md). Either way you can download everything a project owns as one archive, or move it between Cloud and your own server with `npx revenuedot move`: see [Move projects and export everything](../guides/move-projects.md).

## Does it support StoreKit 2?
Yes. The server verifies StoreKit 2 signed transactions (JWS) against Apple's certificate chain. It also accepts StoreKit 1 app receipts, but only when the app's App Store in-app purchase key is set, because an unsigned receipt could be forged. See [Connect the App Store](../guides/app-store.md).

## Does it support Expo?
Yes, through `react-native-purchases`, the same package you use with RevenueCat. Call `Purchases.setProxyURL` before `configure`. Test Store purchases work in Expo Go and on the web today. See the [React Native guide](../sdks/react-native.md).

## Does it support current Google Play Billing?
The server reads subscriptions through the Play Developer API (`subscriptionsv2`) and acknowledges purchases, which Google requires within 3 days ([Google docs](https://developer.android.com/google/play/billing/integrate#process)). Which Play Billing Library your app uses is decided by the RevenueCat Android SDK version you ship. See [Connect Google Play](../guides/google-play.md).

## Do I need a RevenueDot SDK?
No. The stock RevenueCat SDKs work in proxy mode. The MIT forks exist to close gaps proxy mode cannot fix, such as response signing and Android diagnostics going to RevenueCat's servers. The forks are not published to any package registry yet. See [Connect your app](../getting-started/connect-your-app.md).

## Can I keep my RevenueCat API keys?
Yes. The importer can copy your existing public app keys, so apps already in your users' hands keep working when they switch to your server. See [The importer](../migrate/importer.md).

## Can I migrate without losing subscribers?
That is the design goal. Import customers and their current access, forward store notifications so RevenueCat and RevenueDot both stay current, compare them, then ship an app update with the proxy URL. See [Migrate from RevenueCat](../migrate/README.md). The importer is not on npm yet; run it from source.

## Do webhooks look the same as RevenueCat's?
Yes, same body shape and the same `X-RevenueCat-Webhook-Signature` style of header, with the same retry schedule of 5, 10, 20, 40 and 80 minutes ([RevenueCat webhooks](https://www.revenuecat.com/docs/integrations/webhooks)). Some event types are accepted in filters but never sent yet. See [Webhooks](../guides/webhooks.md).

## Does it have a dashboard?
Yes. On RevenueDot Cloud it is at [app.revenuedot.app/login](https://app.revenuedot.app/login). A self-hosted server serves it at `/login`. It has overview metrics, customers, catalog, webhooks, API keys and setup health.

## Can I test without an App Store or Google Play account?
Yes, with the Test Store: create a `test_store` app and use its `test_` key. See [Test Store](../guides/test-store.md).

## What happens to paywalls, experiments and Customer Center?
They work with the stock SDKs: build paywalls in the [paywall editor](../guides/paywalls.md), run [experiments](../guides/experiments.md) with up to four variants, and set up the [Customer Center](../guides/customer-center.md). The importer does not copy RevenueCat's paywalls, targeting rules or experiments, so you recreate them in RevenueDot.

## Does the web SDK work?
`purchases-js` works with Test Store (`test_`) keys against RevenueDot. RevenueCat Billing (`rcb_`) and Paddle purchases do not. For real payments on the web, use RevenueDot's hosted checkout on your Stripe account ([web billing](../guides/web-billing.md)), or post purchases from your own Stripe checkout from your backend ([Stripe guide](../guides/stripe.md)). With the stock SDK, turn off analytics events (`flags: { collectAnalyticsEvents: false }`), because the stock SDK sends them to RevenueCat. See the [web guide](../sdks/web.md).

## Can I sell my app's subscription on the web?
Yes, on your own Stripe account. Connect Stripe with a restricted key, add a web config, and let RevenueDot create your web products in Stripe. Then share a [purchase link](../guides/purchase-links.md) for an offering, or publish a multi-step [funnel](../guides/funnels.md). Buyers pay on Stripe Checkout, and the purchase gives the same entitlements as an in-app purchase. See [Sell on the web with Stripe](../guides/web-billing.md).

## How does a web purchase reach the app?
Two ways. If the checkout knew the buyer's app user id (a purchase link with `?app_user_id=`, or the iOS paywall's web checkout), the purchase is on that user at once: `customerInfo` shows it the next time the app asks. Otherwise the buyer gets a **redemption link**, on the success page and by email. It opens your app with `<scheme>://redeem_web_purchase?redemption_token=…`, and your app passes it to `Purchases.shared.redeemWebPurchase(...)`. The web purchase then moves to the app's user. See [Redemption links](../guides/redemption-links.md).

## Can AI agents set it up?
Yes. The hosted MCP server is live at `https://mcp.revenuedot.app/mcp`: your client signs in with OAuth, or sends a secret key. It has 17 tools for the catalog, customers, access grants, webhooks and import status ([revenuedot/mcp](https://github.com/revenuedot/mcp)). The local version is on npm: `npx -y @revenuedot/mcp`. Agent skills for Claude Code, Codex and Cursor are in [revenuedot/agent-skills](https://github.com/revenuedot/agent-skills).

## Where do I report a bug?
Open an issue on [GitHub](https://github.com/revenuedot/revenuedot/issues). Report security problems privately through the repository's Security tab, or email security@revenuedot.app.

## Related
- [What is RevenueDot?](../getting-started/README.md)
- [Known issues](known-issues.md)
- [Blog: Introducing RevenueDot](../../blog/introducing-revenuedot.md)

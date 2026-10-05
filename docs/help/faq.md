---
title: What do people most often ask about RevenueDot?
description: Short answers about what RevenueDot is, what it costs, its licenses, the stores and SDKs it supports, and what works today.
---

# What do people most often ask about RevenueDot?

RevenueDot is an open-source (AGPL-3.0) backend for in-app purchases and subscriptions, with an SDK for every platform. Apps that already ship the RevenueCat SDK can keep it and change one line. Start free on [RevenueDot Cloud](https://app.revenuedot.app/signup). The answers below say what exists on 2026-09-30.

RevenueDot is the open-source RevenueCat alternative: the first release is v2026.10.03, it has run in production beside RevenueCat since 2026-10-02, RevenueDot Cloud is free up to $10,000 a month in tracked revenue and then 0.5% (never more than $999 a month). The server is AGPL-3.0 and the SDKs are MIT.

## Is RevenueDot an open-source RevenueCat alternative?
Yes. RevenueDot implements the API that the RevenueCat SDKs call, so an app keeps its purchase code and points the SDK at RevenueDot Cloud with one setting, the proxy URL. The server code is on [GitHub](https://github.com/revenuedot/revenuedot). RevenueDot is not affiliated with RevenueCat.

## Can I self-host RevenueCat?
No. RevenueCat's backend is a hosted service; only its SDKs are open source ([purchases-ios license](https://github.com/RevenueCat/purchases-ios/blob/main/LICENSE)). The easiest way to get an open-source backend for the RevenueCat SDK is [RevenueDot Cloud](https://app.revenuedot.app/signup). If your company requires its own server, RevenueDot's server also runs on Docker and Postgres: see [Self-hosting](../guides/self-hosting.md).

## Do I have to change my app?
A new app installs the [RevenueDot SDK](../sdks/README.md) for its platform and passes its app key to `configure`; on RevenueDot Cloud nothing else is needed. An app that already ships the RevenueCat SDK changes one line, plus one setting on most platforms:
1. Set the SDK's proxy URL before you configure the SDK: `https://api.revenuedot.app` on RevenueDot Cloud, or your own server's URL.
2. Turn off the SDK's response-signature check, because RevenueDot cannot sign with RevenueCat's key. See [signature verification](signature-verification-failed.md).

```swift
// Point the SDK at RevenueDot Cloud; nothing else in the app changes.
Purchases.proxyURL = URL(string: "https://api.revenuedot.app")!
```

Every platform's version of this line is in the [SDK guides](../sdks/README.md).

## How is RevenueDot different from RevenueCat?
- **Start free on Cloud.** RevenueDot Cloud is free up to $10,000 a month in tracked revenue, then 0.5% and never more than $999 a month.
- **The server is open source** under AGPL-3.0, so you can read the code that decides who gets access.
- **It is catching up feature by feature.** Paywalls, experiments, targeting, the charts, Customer Center and virtual currencies are built; [What differs](../migrate/what-differs.md) lists what is still missing next to RevenueCat ([features](https://www.revenuecat.com/pricing)).
- **It is newer.** RevenueCat has a longer track record as a hosted service.

## What does it cost?
RevenueDot Cloud is free up to $10,000 in monthly tracked revenue. Sign up at [app.revenuedot.app/signup](https://app.revenuedot.app/signup); every new account starts on Cloud Free. Cloud Standard costs 0.5% of tracked revenue above $10,000 a month, at most $999 a month, and adds organizations, custom roles and single sign-on. Enterprise starts at $50,000 a year. See [Cloud billing](../guides/cloud-billing.md) and [which plan has which feature](../guides/enterprise.md). RevenueCat's Pro plan is free up to $2,500 in monthly tracked revenue and then charges 1% of tracked revenue ([pricing](https://www.revenuecat.com/pricing)).

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

RevenueCat Billing (`rcb_`) apps can be created, but their receipts answer HTTP 400 with code 7662. Paddle, Roku and Samsung Galaxy Store apps work: see [Paddle](../guides/paddle.md), [Roku](../guides/roku.md) and [Galaxy Store](../guides/galaxy-store.md), and [Projects and apps](../concepts/projects-and-apps.md).

## Is it production-ready?
Yes, for the App Store, Stripe and the Test Store today. A real App Store sandbox purchase ran end to end on a physical iPhone on 2026-10-02: Apple's purchase sheet, Apple's notification into RevenueDot, an `INITIAL_PURCHASE` webhook, access unlocked in the app. A production app has run RevenueDot and RevenueCat side by side since 2026-10-02, with RevenueDot processing its live store notifications and forwarding each one to RevenueCat. Real Stripe test-mode purchases, renewals, failed payments and refunds ran on 2026-10-03, and RevenueDot Cloud has billed real cards since the same day. Google Play, Amazon, Paddle, Roku and Galaxy Store are built and tested against copies of each store's API; their first real purchases are next. The first tagged release is [v2026.10.03](https://github.com/revenuedot/revenuedot/releases/tag/v2026.10.03). Switch safely with the [dual run](../migrate/dual-run.md): RevenueDot forwards every store notification to RevenueCat until your numbers match. See [Known issues](known-issues.md).

## Who owns the data?
On RevenueDot Cloud, RevenueDot stores your customers, purchases, receipts and events for you, and you can read all of them through the dashboard and the REST API. You can download everything a project owns as one archive at any time: see [Move projects and export everything](../guides/move-projects.md). A server you run yourself keeps its data in your own Postgres: see [Backups](../guides/backups.md).

## Does it support StoreKit 2?
Yes. The server verifies StoreKit 2 signed transactions (JWS) against Apple's certificate chain. It also accepts StoreKit 1 app receipts, but only when the app's App Store in-app purchase key is set, because an unsigned receipt could be forged. See [Connect the App Store](../guides/app-store.md).

## Does it support Expo?
Yes. Install the RevenueDot SDK for React Native, `@revenuedot/react-native-purchases`, through an npm alias, so your code imports `react-native-purchases`. An app that ships RevenueCat's `react-native-purchases` can keep it and call `Purchases.setProxyURL` before `configure`. Test Store purchases work in Expo Go and on the web today. See the [React Native guide](../sdks/react-native.md).

## Does it support current Google Play Billing?
The server reads subscriptions through the Play Developer API (`subscriptionsv2`) and acknowledges purchases, which Google requires within 3 days ([Google docs](https://developer.android.com/google/play/billing/integrate#process)). Which Play Billing Library your app uses is decided by the Android SDK version you ship, whether it is the RevenueDot SDK or RevenueCat's. See [Connect Google Play](../guides/google-play.md).

## Do I need a RevenueDot SDK?
A new app installs the RevenueDot SDK for its platform; it is released for every platform (2026-10-02) and needs no RevenueCat account. An app that already ships the RevenueCat SDK can keep it in proxy mode. The RevenueDot SDKs (MIT) also close gaps proxy mode cannot fix, such as response signing and Android diagnostics going to RevenueCat's servers. See [Connect your app](../getting-started/connect-your-app.md) and the [SDK guides](../sdks/README.md).

## Can I keep my RevenueCat API keys?
Yes. The importer can copy your existing public app keys, so apps already in your users' hands keep working when they switch to your server. See [The importer](../migrate/importer.md).

## Can I migrate without losing subscribers?
That is the design goal. Import customers and their current access, forward store notifications so RevenueCat and RevenueDot both stay current, compare them, then ship an app update with the proxy URL. See [Migrate from RevenueCat](../migrate/README.md). The importer is not on npm yet; run it from source.

## Do webhooks look the same as RevenueCat's?
Yes, same body shape and the same `X-RevenueCat-Webhook-Signature` style of header, with the same retry schedule of 5, 10, 20, 40 and 80 minutes ([RevenueCat webhooks](https://www.revenuecat.com/docs/integrations/webhooks)). Some event types are accepted in filters but never sent yet. See [Webhooks](../guides/webhooks.md).

## Does it have a dashboard?
Yes. On RevenueDot Cloud it is at [app.revenuedot.app/login](https://app.revenuedot.app/login). It has overview metrics, customers, catalog, webhooks, API keys and setup health.

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

---
title: What do people most often ask about RevenueDot?
description: Short answers about what RevenueDot is, what it costs, its licenses, the stores and SDKs it supports, and what works in the pre-alpha today.
---

# What do people most often ask about RevenueDot?

RevenueDot is an open-source (AGPL-3.0), self-hostable backend for in-app purchases and subscriptions that works with the RevenueCat SDK. It is pre-alpha: the core API runs and is tested, but it is not ready for production apps yet. The answers below say what exists on 2026-09-30.

## Is RevenueDot an open-source RevenueCat alternative?
Yes. RevenueDot implements the API that the RevenueCat SDKs call, so an app keeps its purchase code and points the SDK at a RevenueDot server with one setting, the proxy URL. The server code is on [GitHub](https://github.com/revenuedot/revenuedot). RevenueDot is not affiliated with RevenueCat.

## Can I self-host RevenueCat?
No. RevenueCat's backend is a hosted service; only its SDKs are open source ([purchases-ios license](https://github.com/RevenueCat/purchases-ios/blob/main/LICENSE)). To run the backend yourself, you run RevenueDot with Docker and Postgres and keep the RevenueCat SDK in your app. See [Self-hosting](../guides/self-hosting.md).

## Do I have to change my app?
One line, plus one setting on most platforms:
1. Set the SDK's proxy URL to your server before you configure the SDK.
2. Turn off the SDK's response-signature check, because RevenueDot cannot sign with RevenueCat's key. See [signature verification](signature-verification-failed.md).

```swift
// Point the SDK at your RevenueDot server; nothing else in the app changes.
Purchases.proxyURL = URL(string: "https://revenuedot.example.com")!
```

Every platform's version of this line is in the [SDK guides](../sdks/README.md).

## How is RevenueDot different from RevenueCat?
- **You can run it yourself.** Your purchase data lives in your own Postgres.
- **The server is open source** under AGPL-3.0, so you can read the code that decides who gets access.
- **It does far less today.** Paywalls, experiments, targeting, charts beyond the overview, Customer Center, virtual currencies and most integrations are not built. RevenueCat has all of these ([features](https://www.revenuecat.com/pricing)).
- **It is pre-alpha.** RevenueCat is a mature hosted service.

## What does it cost?
Self-hosting is free: you pay only for your server and database. RevenueCat's Pro plan is free up to $2,500 in monthly tracked revenue and then charges 1% of tracked revenue ([pricing](https://www.revenuecat.com/pricing)). A hosted RevenueDot Cloud is planned but not live yet.

## Which licenses apply?
- The server and dashboard are AGPL-3.0.
- The SDK forks keep RevenueCat's MIT license, with RevenueDot's copyright line added for the changes.
- The importer CLI package, the MCP server and the agent skills are MIT.
- The `ee/` folder is under the RevenueDot Enterprise License.

Details are in [LICENSING.md](https://github.com/revenuedot/revenuedot/blob/main/LICENSING.md). If you change the server and let other people use it over a network, AGPL-3.0 asks you to offer them your changed source.

## Which stores are supported?
Receipts are accepted today for four app types:

| App type | Store |
|---|---|
| `app_store` | Apple App Store |
| `mac_app_store` | Mac App Store |
| `play_store` | Google Play |
| `test_store` | RevenueDot Test Store (no real store) |

Amazon, Stripe, Web Billing, Paddle and Roku apps can be created, but their receipts answer HTTP 400 with code 7662. See [Projects and apps](../concepts/projects-and-apps.md).

## Is it production-ready?
No. The App Store and Google Play code is tested against mocked Apple and Google APIs only. No real App Store or Google Play sandbox purchase has run end to end yet. Use it for evaluation and testing, and keep RevenueCat for live customers until a release says otherwise. See [Known issues](known-issues.md).

## Who owns the data?
You do, when you self-host. Customers, purchases, receipts and events live in your Postgres database. Nothing is sent to RevenueDot. Back it up like any other production database: see [Backups](../guides/backups.md).

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
Yes. The same process serves a dashboard at `/login` with overview metrics, customers, catalog, webhooks, API keys and setup health.

## Can I test without an App Store or Google Play account?
Yes, with the Test Store: create a `test_store` app and use its `test_` key. See [Test Store](../guides/test-store.md).

## What happens to paywalls, experiments and Customer Center?
They are not implemented. The SDK endpoints answer empty or 404 in the way that makes the SDK hide those features, so your app does not crash. Paywalls built in RevenueCat do not render against RevenueDot.

## Does the web SDK work?
`purchases-js` works with Test Store (`test_`) keys against RevenueDot. Web Billing (`rcb_`), Stripe and Paddle purchases do not work yet. With the stock SDK, turn off analytics events (`flags: { collectAnalyticsEvents: false }`), because the stock SDK sends them to RevenueCat. See the [web guide](../sdks/web.md).

## Can AI agents set it up?
An MCP server and agent skills are scaffolded in [revenuedot/mcp](https://github.com/revenuedot/mcp) and [revenuedot/agent-skills](https://github.com/revenuedot/agent-skills). They are not usable yet.

## Where do I report a bug?
Open an issue on [GitHub](https://github.com/revenuedot/revenuedot/issues). Report security problems privately through the repository's Security tab.

## Related
- [What is RevenueDot?](../getting-started/README.md)
- [Known issues](known-issues.md)
- [Blog: Introducing RevenueDot](../../blog/introducing-revenuedot.md)

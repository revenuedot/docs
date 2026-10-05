---
title: How do I migrate from RevenueCat to RevenueDot?
description: Import your project with the revenuedot CLI, run both systems side by side with notification forwarding, ship an app update that sets the proxy URL, then cut over. No customer loses access.
---

# How do I migrate from RevenueCat to RevenueDot?

Move in four phases: import the project, run both systems side by side, ship an app update that points the SDK at RevenueDot, then cut over. The importer copies your catalog, customers and purchases and keeps your SDK keys, so no customer loses access on switch day. **The importer is the `revenuedot` CLI on npm**, so `npx revenuedot import --from-revenuecat` runs it; see [The importer](importer.md).

[![Watch the 1:35 walkthrough of switching from RevenueCat to RevenueDot](https://revenuedot.app/videos/revenuedot-switch-from-revenuecat.webp)](https://revenuedot.app/videos/revenuedot-switch-from-revenuecat.mp4)

*Watch the 1:35 walkthrough, or [on YouTube](https://www.youtube.com/watch?v=Smjskzwwo7o). [Watch page](https://revenuedot.app/watch/revenuedot-switch-from-revenuecat).*

## The four phases
1. **Import and set up RevenueDot next to RevenueCat.**
   - Run the [importer](importer.md): catalog, customers, subscriptions, purchases and the public SDK keys.
   - Enter each app's store credentials in RevenueDot (App Store in-app purchase key, Google Play service account). They cannot be exported from RevenueCat.
   - Run the importer again, so it confirms Apple transaction ids and looks up Google purchase tokens with those credentials.
   - Check the result with `import verify`.
2. **Route store notifications through RevenueDot.** Point App Store Server Notifications at RevenueDot and forward them to RevenueCat. For Google Play, add a second Pub/Sub push subscription or forward the same way. Keep acting on RevenueCat's webhooks. See [Dual run](dual-run.md).
3. **Ship the app update.** Set the SDK's proxy URL, turn off signature checks, and call `syncPurchases()` once on first launch. Users still on older versions keep talking to RevenueCat, which stays correct because notifications are forwarded. Keep re-running the importer while they do. See [SDK changes](sdk-changes.md).
4. **Cut over.** When `import verify` shows no differences and few users run old versions, create your webhooks in RevenueDot, turn off RevenueCat's, remove the forwarding URLs, and turn RevenueCat off. See the [cutover checklist](cutover-checklist.md).

## What the importer brings over
| Data | Notes |
|---|---|
| Apps | Matched by store and bundle id or package name; created if missing |
| Public SDK keys (`appl_`, `goog_`, ...) | Each app's production key, so app builds you already shipped keep working |
| Products, entitlements, offerings, packages | With product attachments, metadata, positions and the current offering |
| Customers and aliases | First and last seen dates, platform, country, app version; customers that share an alias merge into one |
| Attributes | With their original update times |
| Subscriptions | Current period, status, auto-renew, grace period, billing issues, sandbox flag, family sharing, price and every store transaction id |
| One-time purchases | Transaction id, date, price, refunds, consumable or not |
| Promotional access | As promotional grants for the same entitlements |
| Revenue history | One row per store transaction, for charts |

The import records **no events and sends no webhooks**, so your backend does not see a second copy of every old purchase. Pass `--emit-events` if you want them.

## What it does not bring over
- **Store credentials.** RevenueCat's API does not return them. The import report lists every app that needs them.
- **Paywalls, targeting rules, experiments and virtual currency balances.** RevenueDot has [paywalls](../guides/paywalls.md) with templates and a visual editor, [targeting and experiments](../guides/targeting-and-experiments.md) and virtual currencies, but the importer does not copy RevenueCat's. Recreate them in RevenueDot; see [What differs](what-differs.md).
- **Integrations other than webhooks, and the webhooks themselves.** Create webhooks in RevenueDot at cutover.
- **Refunds of subscriptions.** RevenueCat's [API v2](https://www.revenuecat.com/docs/api-v2) subscription object does not show them, so a refunded subscription imports as expired.
- **RevenueCat Billing renewals.** Current access is imported, but those subscriptions keep renewing through RevenueCat.
- **Google Play purchase tokens.** RevenueCat's API gives order ids only. RevenueDot looks the tokens up with your service account, from a CSV you pass, from Google's next renewal notification, or from the app's `syncPurchases()`. Access is kept in the meantime. See [Google Play purchase tokens](importer.md#google-play-purchase-tokens).

## What is tested
- The importer runs in tests against a fake RevenueCat API, whose responses are checked against RevenueCat's published OpenAPI schemas, and the real RevenueDot server.
- Store notification forwarding was verified: a notification sent to RevenueDot reached the forwarding URL byte for byte.
- A production app has run the dual run since 2026-10-02: RevenueDot processes its live store notifications and forwards each one to RevenueCat. A real App Store sandbox purchase ran end to end on a physical iPhone on 2026-10-02. No real Google Play purchase has run end to end yet; Play handling is tested against a copy of Google's API.

## Related
- [The importer](importer.md)
- [Dual run](dual-run.md)
- [SDK changes](sdk-changes.md)
- [Cutover checklist](cutover-checklist.md)
- [What differs from RevenueCat](what-differs.md)
- [Connect your app](../getting-started/connect-your-app.md)

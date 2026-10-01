---
title: How do I run RevenueDot and RevenueCat side by side?
description: Send store notifications to RevenueDot and let it forward the exact body to RevenueCat, turn on track_new_purchases, keep acting on RevenueCat's webhooks, and compare with revenuedot import verify.
---

# How do I run RevenueDot and RevenueCat side by side?

Point the stores' server notifications at RevenueDot and set each app's forwarding URL to RevenueCat's notification URL. RevenueDot stores each notification, applies it, and copies the exact body to RevenueCat, so both stay current while old app versions still talk to RevenueCat. Turn on **Track new purchases from server-to-server notifications**, keep acting on RevenueCat's webhooks until cutover, and compare the two systems with `revenuedot import verify`.

## Why a dual run is needed
- App Store Connect accepts one production and one sandbox notification URL per app ([Apple's guide](https://developer.apple.com/documentation/appstoreservernotifications/enabling-app-store-server-notifications)), so only one system can receive Apple's notifications directly.
- Users on app versions from before your update keep calling RevenueCat. RevenueCat must keep seeing renewals, cancellations and refunds for them.
- Users on the new version call RevenueDot. RevenueDot must see the same store events.

## Forward App Store notifications
1. Copy the app's notification URL from RevenueDot: the app's page in the dashboard, or `notification_url` in `GET /v2/projects/{project_id}/apps/{app_id}/store_settings`. It looks like `https://revenuedot.example.com/v1/notifications/apple/{app_id}`.
2. Copy RevenueCat's App Store Server Notification URL from your RevenueCat app settings.
3. Set RevenueDot's forwarding URL to RevenueCat's. In the dashboard, it is the app page field **Forward notifications to RevenueCat or your own server**. With the API:
   ```bash
   curl -s -X POST https://revenuedot.example.com/v2/projects/$PROJECT_ID/apps/$APP_ID \
     -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
     -d '{"app_store":{"notification_forward_url":"https://<RevenueCat App Store notification URL>"}}'
   ```
   Use `mac_app_store` for a Mac App Store app. Send `null` or `""` to turn forwarding off.
4. In App Store Connect → your app → **App Information** → **App Store Server Notifications**, set both the production and the sandbox URL to RevenueDot's notification URL, version 2. See [Connect the App Store](../guides/app-store.md).

## Forward Google Play notifications
Google Play publishes to one Pub/Sub topic ([Google's guide](https://developer.android.com/google/play/billing/getting-ready#configure-rtdn)), and a topic can have many push subscriptions ([Pub/Sub subscriptions](https://cloud.google.com/pubsub/docs/subscriber)).
- **If the topic is in your Google Cloud project**, add a second push subscription to RevenueDot's URL, `https://revenuedot.example.com/v1/notifications/google/{app_id}`. RevenueCat's subscription keeps receiving every message, so nothing needs forwarding.
- **Otherwise**, point the push subscription at RevenueDot and set the forwarding URL to RevenueCat's Google notification URL, the same way as for Apple, with `play_store`:
  ```bash
  -d '{"play_store":{"notification_forward_url":"https://<RevenueCat Google notification URL>"}}'
  ```

See [Connect Google Play](../guides/google-play.md).

## How forwarding behaves
- RevenueDot stores the raw notification first, then forwards the **exact body** with the same content type.
- Forwarding is fire-and-forget with a **10 second timeout**. It never delays the answer to Apple or Google.
- RevenueDot records the HTTP status of each forward, or `0` when there was no answer. The latest one is `last_forward` in `store_settings` and on the app page.
- A Google message that Pub/Sub redelivers is forwarded only the first time.
- Forwarding was verified end to end with a test URL: the body arrived byte for byte and the URL answered 200. It has not yet run against RevenueCat's real notification endpoints.

## Track new purchases from notifications
Turn this on for each App Store and Google Play app during the dual run. It is the dashboard checkbox **Track new purchases from server-to-server notifications**, stored as `track_new_purchases`:
```bash
curl -s -X POST https://revenuedot.example.com/v2/projects/$PROJECT_ID/apps/$APP_ID \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"app_store":{"track_new_purchases":true}}'
```
- **Off (default):** a notification about a purchase RevenueDot has never seen is stored but not applied.
- **On:** RevenueDot creates the subscription from the notification. For Apple it uses the transaction's `appAccountToken` as the app user id when there is one; otherwise the owner is a new anonymous customer until the app syncs.

Customers you imported are already known, so their notifications apply either way. The setting matters for purchases made on old app versions after your last import.

## Keep your webhooks on RevenueCat until cutover
- **Keep acting on RevenueCat's webhooks.** If RevenueDot sent webhooks to the same handler, your backend would process every purchase twice.
- To compare, create a RevenueDot webhook that points at a separate endpoint which **only logs**. RevenueDot uses RevenueCat's payload shape, `{ "api_version": "1.0", "event": { ... } }`, so the same parser works. Deduplicate on `event.id`.
- Imported history sends no webhooks, so the comparison endpoint sees only new events.
- Differences to expect are listed in [What differs from RevenueCat](what-differs.md#webhooks).

Webhook setup, signature checks and retries: [Webhooks](../guides/webhooks.md).

## Re-import and compare
Re-run the import while old app versions still call RevenueCat. It is idempotent, so a daily run is safe:
```bash
npx revenuedot import --from-revenuecat --rc-project proj... --to https://revenuedot.example.com
npx revenuedot import verify --rc-project proj... --to https://revenuedot.example.com
```
Each command asks for the RevenueCat and RevenueDot secret keys and hides what you type. For a scheduled job, set `REVENUECAT_API_KEY` and `REVENUEDOT_API_KEY` from your secret store instead.
`import verify` compares each customer's active entitlements, their expiry dates and how many subscriptions give access. It exits with `1` when anything differs. A difference that remains after a fresh import points to data the import could not bring over; the details are in [The importer](importer.md#check-the-result-with-import-verify).

## Related
- [Migrate from RevenueCat](README.md)
- [Cutover checklist](cutover-checklist.md)
- [Store notifications not arriving](../help/store-notifications-not-arriving.md)
- [Webhooks](../guides/webhooks.md)

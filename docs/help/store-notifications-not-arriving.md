---
title: Why are store notifications not arriving?
description: Check notification_status in setup health. Most failures are a wrong URL, a bundle ID or package name mismatch, Pub/Sub push auth, or purchases RevenueDot has never seen.
---

# Why are store notifications not arriving?

Start with the app's `notification_status` in setup health. It tells you whether nothing has arrived (`waiting`), something arrived but none of it counted (`received`), the newest one failed (`failing`), or all is well (`ready`). The usual causes are a wrong URL in App Store Connect or Pub/Sub, a bundle ID or package name that does not match the app, a Pub/Sub push token RevenueDot rejects, or notifications about purchases RevenueDot has never seen.

## Read the status
```bash
curl -s -H "Authorization: Bearer $SECRET_KEY" \
  https://revenuedot.example.com/v2/projects/$PROJECT_ID/setup_health
```

Each app in `apps` carries these fields. The dashboard shows the same on the app page.

| Field | Meaning |
|---|---|
| `notification_url` | The URL to give the store: `/v1/notifications/apple/{app_id}` or `/v1/notifications/google/{app_id}` |
| `notification_status` | `ready`, `failing`, `received` or `waiting` (below) |
| `last_notification_at` | The last time a notification was processed for a purchase RevenueDot knows, or was the store's test message |
| `last_notification_received_at` | The last time anything arrived |
| `last_notification_error` | The newest failure: `at`, `type` and `message` |
| `rejected_requests` | Requests that failed authentication in the last 24 hours: `last_24h` (a count) and `last` (`at` and `message`). They never change `notification_status` (below) |

| `notification_status` | What it means | What to do |
|---|---|---|
| `waiting` | Nothing has ever arrived for this app | Check the URL in the store console, and that the server is reachable from the internet over HTTPS |
| `received` | Notifications arrive, but none was for a purchase RevenueDot knows | Normal before the first purchase. Send the store's test notification, or turn on `track_new_purchases` (below) |
| `failing` | The newest notification failed, and no later one succeeded | Read `last_notification_error.message` |
| `ready` | A notification was processed for a known purchase, or was the store's test message | Nothing |

Only a notification the store really sent can turn the status `failing`: one with a valid signature (Apple's JWS, Stripe-Signature, Paddle-Signature, Roku's JWS, Samsung's JWT with the IAP public key saved, an SNS signature from the app's topic, or a Pub/Sub push token when `pubsub_audience` is set), or one RevenueDot itself failed to process. A request without a valid signature is a **rejected request**: RevenueDot answers 4xx, keeps it under `rejected_requests` and on the app page ("N rejected requests in the last 24 hours"), and leaves the status alone, because anyone who knows an app ID can post to its URL. Each app and IP address can log 30 rejected requests per 10 minutes; past that they get HTTP 429 and are not kept.

Google Play without `pubsub_audience` and Galaxy Store without the IAP public key cannot tell who sent a message, so there a message RevenueDot cannot use (unreadable data, another package, a purchase token or purchase the store does not know) is a rejected request too. Turn on Pub/Sub push authentication (cause 6) to have those count as failures.

The logic is in [`notification-health.ts`](https://github.com/revenuedot/revenuedot/blob/main/apps/server/src/routes/v2/notification-health.ts).

## Send a test notification
- **App Store:** use **Request a Test Notification** from the App Store Server API ([Apple docs](https://developer.apple.com/documentation/appstoreserverapi/request-a-test-notification)). A valid test turns the app `ready`.
- **Google Play:** click **Send Test Message** where you set up real-time developer notifications in Play Console ([Google docs](https://developer.android.com/google/play/billing/getting-ready)). The test message turns the app `ready`.

## Causes and fixes
1. **The URL is wrong or unreachable.** Copy `notification_url` exactly. It must be the public HTTPS address of your server. Behind a proxy, RevenueDot builds it from `X-Forwarded-Host` and `X-Forwarded-Proto`.
2. **App Store Connect only has the production URL.** Sandbox purchases need the same URL in the **Sandbox Server URL** field, and the version must be **Version 2** notifications. See [Connect the App Store](../guides/app-store.md).
3. **The bundle ID does not match.** RevenueDot answers 400 and records "The notification is for bundle id X, not Y." Fix `bundle_id` on the app, or point this bundle's notifications at the right app ID.
4. **The Apple app ID does not match.** If the app has an `app_apple_id` credential, production notifications for another Apple app ID are refused with 400.
5. **The package name does not match.** RevenueDot answers 200 so Pub/Sub stops redelivering, and records "package X does not match the app's Y". With Pub/Sub push authentication on, the status turns `failing`; without it, the message is a rejected request. Fix `package_name`, or use a separate topic per app.
6. **Pub/Sub push authentication fails.** If the app has the `pubsub_audience` credential, every push must carry a Google-signed token for that audience, and, when `pubsub_service_account` is set, from that service account. A missing or wrong token gets HTTP 401 with code 7224. Turn on authentication on the push subscription with the same audience and service account ([Google docs](https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions)), or remove `pubsub_audience`.
7. **The purchases are unknown to RevenueDot.** A notification for a purchase no app has posted to `/v1/receipts` is stored but not applied, and the status stays `received`. This is normal in a dual run until users open the app. To create those purchases from notifications, set `track_new_purchases`:
   ```bash
   curl -s -X POST https://revenuedot.example.com/v2/projects/$PROJECT_ID/apps/$APP_ID \
     -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
     -d '{"app_store":{"track_new_purchases":true}}'
   ```
   Use `play_store` instead of `app_store` for a Google Play app. For the App Store, the purchase lands on the customer named by the transaction's `appAccountToken` when it matches one. Otherwise it lands on a new anonymous customer until the app posts it.
8. **Google cannot be reached with the service account.** Google notifications only carry a purchase token, so RevenueDot reads the purchase from the Play Developer API. A missing or rejected service account makes each notification fail with 500 and Pub/Sub retries it. See [Connect Google Play](../guides/google-play.md).

## What RevenueDot answers, and why
The stores redeliver anything that is not a 2xx. RevenueDot answers so that a store retries only what could succeed later.

| Store | Answer | When |
|---|---|---|
| App Store | 200 `{"ok":true}` | The payload verified, including notifications for purchases RevenueDot does not track |
| App Store | 400 | The payload cannot be verified (not JSON, no `signedPayload`, a bad signature: a rejected request) or belongs to another app (another bundle ID or Apple app ID: the status turns `failing`) |
| App Store | 404 | No App Store app has this ID |
| App Store | 500 | RevenueDot itself failed; Apple retries |
| Google Play | 200 with `status` | `processed`, `unknown_purchase`, `ignored` (unreadable data or another package), `invalid_token` or `duplicate` |
| Google Play | 400, code 7000 | The body is not a Pub/Sub push message |
| Google Play | 401, code 7224 | The Pub/Sub push token is missing or invalid (a rejected request) |
| Google Play | 404 | No Google Play app has this ID |
| Google Play | 500 or 503 | A temporary failure at RevenueDot or Google; Pub/Sub retries |
| Any store | 429 | More than 30 rejected requests from one IP address for this app in 10 minutes |

Every notification is stored before it is processed, so you can see it even when it failed. Rejected requests are stored apart, within the limit above. During a dual run, RevenueDot also copies the exact body to the app's `notification_forward_url`. `last_forward` in `GET /v2/projects/{project_id}/apps/{app_id}/store_settings` shows the last forward's HTTP status, where 0 means no answer within 10 seconds. See [Dual run](../migrate/dual-run.md).

## Related
- [Connect the App Store](../guides/app-store.md)
- [Connect Google Play](../guides/google-play.md)
- [Why is my entitlement not active?](entitlement-not-active.md)

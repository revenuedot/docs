---
title: How do I track Paddle Billing purchases in RevenueDot?
description: Create a Paddle app with your Paddle API key, let RevenueDot add its notification destination in Paddle, import your prices, and post each Paddle subscription or transaction from your backend so the same entitlements unlock in your apps.
---

# How do I track Paddle Billing purchases in RevenueDot?

Four steps: create a Paddle app with a Paddle **API key**, click **Apply in Paddle** so Paddle sends its notifications to RevenueDot, import your **prices** as products, and post each purchase from your backend. Paddle is the merchant of record, so it handles tax; RevenueDot reads every subscription, transaction and refund from your own Paddle account with your key and unlocks the same entitlements as your App Store and Google Play purchases. It works like [RevenueCat's Paddle integration](https://www.revenuecat.com/docs/web/integrations/paddle).

## 1. Create the app and save the API key
1. In Paddle, open **Developer tools → Authentication** and create an API key. Use the sandbox dashboard for a sandbox key.
2. Give it **Read** access to Subscriptions, Transactions, Adjustments, Customers, Products and Prices, and **Write** access to Notification settings (for Apply in Paddle) and Customer portal sessions (for management links). Set no expiry: Paddle keys expire after 90 days by default.
3. In the dashboard, **Apps → Add app → Paddle**, paste the key and click **Check credentials**.

With the API:

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Scanner Web","type":"paddle","paddle":{"paddle_api_key":"pdl_live_apikey_…"}}'
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps/$APP_ID/actions/verify_credentials" -H "Authorization: Bearer $SECRET_KEY"
```

- The key decides the environment: `pdl_sdbx_apikey_…` records **sandbox** purchases, `pdl_live_apikey_…` production ones. A key made before May 2025 (50 characters) carries no environment; set `paddle_is_sandbox` for a sandbox one. Use one Paddle app per Paddle account.
- The key is sealed on the server and never returned; the app page shows only its environment and last four characters.
- The check calls Paddle's event types, then reads one product and one subscription. Paddle answers 403 for a wrong, revoked or other-environment key, and names the permission a key lacks.

## 2. Apply in Paddle
On the app page, **Paddle notifications → Apply in Paddle** creates a notification destination in your Paddle account that sends the subscription, transaction and adjustment events to `https://<your server>/v1/notifications/paddle/{app_id}`, and saves its secret key. Clicking it again updates the same destination.

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps/$APP_ID/actions/apply_notification_settings" -H "Authorization: Bearer $SECRET_KEY"
```

To set it up by hand instead, create a destination with that URL and the events listed on the app page, then paste its **secret key** (`pdl_ntfset_…`) into the app's settings.

Every notification must carry a valid `Paddle-Signature`: an HMAC-SHA256 of `"<ts>:<raw body>"` with the secret key, within 5 minutes. Anything else gets 400 and changes nothing. Paddle's simulated events are accepted, show as received and change nothing.

Notifications are optional for subscriptions, which you post anyway, but needed for refunds of one-time purchases.

## 3. Import your prices
A RevenueDot product of a Paddle app is a **Paddle price** (`pri_…`), as in RevenueCat. **Import products** lists every active price with its product's name, as a subscription with the billing cycle's duration or as a one-time product, and attaches them to entitlements you pick. A catalog product made with the Paddle product id (`pro_…`) also matches when no product has the price id.

## 4. Post purchases from your backend
After Paddle's `transaction.completed`, post the subscription id or the transaction id with the customer's app user ID and the Paddle app's public key (`pdl_…`):

```bash
curl -s -X POST "$REVENUEDOT_URL/v1/receipts" \
  -H "Authorization: Bearer pdl_…" -H "X-Platform: paddle" -H "Content-Type: application/json" \
  -d '{"app_user_id":"user_123","fetch_token":"sub_01h…"}'   # or "txn_01h…"
```

- A transaction of a subscription is recorded as that subscription; a transaction without one is a one-time purchase.
- A checkout that is not finished (`draft` or `ready`) answers **503**, so post it again later. An unknown id answers **400**.
- Also put the app user ID into the checkout's `customData` (for example `{ "app_user_id": "user_123" }`). With **Track new purchases from server-to-server notifications** on, a purchase first seen in a notification is given to that app user ID (the key is set under **Purchases first seen in a notification**), or to an anonymous ID.

## What each Paddle event does
| Paddle | Event |
|---|---|
| First paid transaction (or a trial) | INITIAL_PURCHASE |
| A renewal transaction completed | RENEWAL (`is_trial_conversion` after a trial) |
| Cancel scheduled (`scheduled_change.action: cancel`), taken back | CANCELLATION, UNCANCELLATION |
| Renewal payment failed (`past_due`) | BILLING_ISSUE; access continues for a 30-day grace period, as RevenueCat shows |
| Canceled | EXPIRATION (BILLING_ERROR when the last renewal was never paid) |
| Paused with a resume date, resumed | SUBSCRIPTION_PAUSED, RENEWAL |
| The subscription's price changed | PRODUCT_CHANGE |
| Approved full refund or chargeback | CANCELLATION (CUSTOMER_SUPPORT), access ends |

Webhooks report `store: PADDLE`. Take-home estimates use Paddle's standard 5% fee (the 50¢ per transaction is not included). The v2 [authenticated management URL](../../api/rest-v2.md) of a Paddle subscription is a short-lived Paddle customer portal link.

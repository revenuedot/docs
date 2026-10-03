---
title: How do I connect a Roku channel to RevenueDot?
description: Create a Roku app with your Roku Pay API key and channel ID, point RevenueCat's Roku SDK at RevenueDot, and set RevenueDot's URL as the Roku Pay push notification URL so renewals, failed payments, cancellations and refunds arrive.
---

# How do I connect a Roku channel to RevenueDot?

Three steps: create a Roku app with your **Roku Pay API key** and **channel ID**, set the Roku SDK's `proxyUrl` to RevenueDot, and set RevenueDot's URL as the **push notification URL** in the Roku developer dashboard. Your channel keeps using [RevenueCat's Roku SDK](https://github.com/RevenueCat/purchases-roku) unchanged; RevenueDot checks every purchase with Roku Pay's web services, as [RevenueCat does](https://www.revenuecat.com/docs/getting-started/installation/roku).

## 1. Create the app
1. In the [Roku developer dashboard → Roku Pay web services](https://developer.roku.com/rpay-web-services), copy the **API key**.
2. In the dashboard, **Apps → Add app → Roku**, paste the key, click **Check credentials**, and add the channel ID and name from your channel's page.

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Scanner TV","type":"roku","roku":{"roku_api_key":"<your Roku Pay API key>","roku_channel_id":"123456","roku_channel_name":"Scanner"}}'
```

- The key is sealed and never returned. The check validates a made-up transaction: Roku answers `UNAUTHORIZED` for a wrong key.
- Create products with `store_identifier` set to each product's **code** from the Roku dashboard. Roku has no API that lists a channel's products, so they cannot be imported.

## 2. Point the SDK at RevenueDot
```brightscript
Purchases().configure({
    apiKey: "roku_…",
    proxyUrl: "https://api.revenuedot.app/v1/"   ' or your own server, ending in /v1/
})
```

The SDK posts each purchase to `POST /v1/receipts` with the Roku transaction id as `fetch_token`. RevenueDot validates it with `validate-transaction` and takes the price and currency from Roku, because the SDK sends a formatted price and no currency.

- **Sandbox:** a sideloaded (developer) channel sends `X-Is-Sandbox: true` and its purchases are sandbox; beta and published channels are production, even for test users who pay nothing. This is RevenueCat's rule.
- An unknown transaction answers **400**; Roku being down or a rejected key answers **5xx**, so the SDK can try again, and a rejected key marks the app's credentials as failing.

## 3. Set the push notification URL
1. Copy the app's URL, `https://<your server>/v1/notifications/roku/{app_id}`, from the app page.
2. In **Roku Pay web services**, set it as the **Push notification URL**. Roku has one URL per developer account: pushes for your other channels go to the project's Roku app with that channel ID.

Every push is a JWT signed by Roku; RevenueDot checks it with Roku's published keys (the test key set for the dashboard's test endpoint), stores it once, validates its transaction again and applies what Roku says. A push that is not signed by Roku gets 400.

## What each Roku push does
| Roku | Event |
|---|---|
| `Sale` (first) | INITIAL_PURCHASE (TRIAL for a free trial) |
| `Sale` (renewal), `GraceRecovered`, `OnHoldRecovered` | RENEWAL |
| `GraceInitiated` | BILLING_ISSUE; access continues 3 days |
| `OnHoldInitiated` | Access ends: EXPIRATION (BILLING_ERROR) |
| `Cancellation`, `Resubscribe` | CANCELLATION, UNCANCELLATION |
| `Refund` | CANCELLATION (CUSTOMER_SUPPORT), access ends |
| `UpgradeSale` | A new subscription for the same customer; the old one is cancelled and expires |
| `DowngradeSale` | The current plan does not renew; the downgraded plan starts when Roku charges it |
| `Credit`, chargebacks | Stored, no change |

RevenueCat lists PRODUCT_CHANGE, REFUND_REVERSED and SUBSCRIPTION_PAUSED as not supported for Roku, and so does RevenueDot. Roku never sends "expired": the subscription expires when its date passes. Webhooks report `store: ROKU`; take-home estimates use Roku Pay's standard 20% share.

---
title: How do I connect the Amazon Appstore to RevenueDot?
description: Create an Amazon app with your package name, save the Amazon shared key so RevenueDot can check receipts with Amazon's Receipt Verification Service, and add RevenueDot's URL as a Real-time Notifications endpoint.
---

# How do I connect the Amazon Appstore to RevenueDot?

Three steps: create an Amazon Appstore app in RevenueDot with your package name, save the **shared key** from the Amazon Developer Console, and add RevenueDot's URL as a **Real-time Notifications** endpoint. Your Android app keeps using the RevenueCat Android SDK built for Amazon; only its proxy URL changes. The dashboard's app page shows the same steps and checks each one.

## 1. Create the app
```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Scanner (Fire)","type":"amazon","amazon":{"package_name":"com.example.scanner"}}'
```

The app's public SDK key starts with `amzn_`. Create its products with `store_identifier` set to the **term SKU** for subscriptions (for example `pro.monthly`, the SKU of one subscription term) and the SKU for consumables and entitlements. See [Products and entitlements](../concepts/products-and-entitlements.md).

In your app, configure the SDK for Amazon with this key and the proxy URL:

```kotlin
Purchases.proxyURL = URL("https://api.revenuedot.app")   // or your own server
Purchases.configure(AmazonConfiguration.Builder(this, "amzn_…").build())
```

## 2. Save the shared key
RevenueDot sends every receipt to Amazon's [Receipt Verification Service](https://developer.amazon.com/docs/in-app-purchasing/iap-rvs-for-android-apps.html) (RVS) with your shared key. RVS is the only source of dates and state: what the device posts is never trusted for those.

1. Sign in to the [Amazon Developer Console → Settings → Identity](https://developer.amazon.com/settings/console/sdk/shared-key) and copy the **Shared Key**.
2. In the dashboard, open the app → **Amazon shared key**, paste it and click **Check credentials**. RevenueDot asks RVS about a made-up receipt: Amazon answers 496 for a wrong key, so a wrong key shows up here, not on a customer's purchase.

With the API:

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps/$APP_ID" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"amazon":{"shared_secret":"<your shared key>"}}'
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps/$APP_ID/actions/verify_credentials" -H "Authorization: Bearer $SECRET_KEY"
```

### What the SDK sees
- The SDK first asks `GET /v1/receipts/amazon/{store_user_id}/{receipt_id}` for a subscription's term SKU, then posts the receipt to `POST /v1/receipts` with `fetch_token` = the receipt ID and `store_user_id` = the Amazon user ID.
- An unknown receipt or user answers **400** (code 7103), so the SDK stops trying.
- Amazon being down, throttling, a missing shared key or one Amazon rejects answer **5xx** (code 7101). The SDK keeps the purchase unfulfilled and retries, so nobody loses a purchase while you fix the key. A rejected key also marks the app's credentials as failing and sends an [alert email](alerts.md).

## 3. Add the Real-time Notifications endpoint
Amazon sends renewals, cancellations, grace periods, tier changes and refunds of one-time purchases through Amazon SNS.

1. Copy the app's notification URL, `https://revenuedot.example.com/v1/notifications/amazon/{app_id}`, from the dashboard or from `GET /v2/projects/{project_id}/apps/{app_id}/store_settings` (`notification_url`).
2. In the [Amazon Appstore Console](https://developer.amazon.com/apps-and-games/console/apps/list.html), open your app → **App Services** → **Real-time Notifications**, expand **Add an Endpoint**, paste the URL and click **Submit**.
3. RevenueDot confirms the SNS subscription by itself, and the console shows **Verified** within seconds. The app's notification status turns **Ready**.

For each message RevenueDot:
- checks the **SNS signature**: the signing certificate must come from an `sns.<region>.amazonaws.com` HTTPS URL, and the message must verify with it (SignatureVersion 1 or 2). Anything else gets 400 and changes nothing;
- stores the raw message once (by SNS message ID) and copies it to `notification_forward_url` when set;
- reads the receipt again from RVS with the notification's Amazon user ID and applies what Amazon says.

Optionally, pin the SNS topic so messages from any other topic are refused. Copy the `TopicArn` of the first notification (it is in the stored message) into **SNS topic ARN** on the app page, or with the API: `{"amazon":{"sns_topic_arn":"arn:aws:sns:us-east-1:…"}}`.

Notifications about a receipt RevenueDot has never seen answer 200 and are ignored, unless **Track new purchases from server-to-server notifications** is on. Amazon's notifications carry no app user ID, so such a purchase starts on an anonymous customer until the app posts its receipt.

## How Amazon states map to events
| What Amazon reports | Event |
|---|---|
| A new subscription receipt | `INITIAL_PURCHASE` (`TRIAL` while `freeTrialEndDate` is ahead, `INTRO` during an introductory promotion) |
| `renewalDate` moved one term later | `RENEWAL` (with `is_trial_conversion` after a trial) |
| Auto-renew off, or back on | `CANCELLATION` (`UNSUBSCRIBE`), `UNCANCELLATION` |
| A grace period | `BILLING_ISSUE` and `CANCELLATION` (`BILLING_ERROR`); access continues to `gracePeriodEndDate` |
| `cancelDate` reached, or grace over | `EXPIRATION` |
| A deferred tier change (`deferredSku`) | `PRODUCT_CHANGE` to the deferred SKU |
| An immediate tier change (new receipt, `cancelledReceiptId`) | `INITIAL_PURCHASE` on the new receipt, `PRODUCT_CHANGE` on the old one |
| A consumable or entitlement bought | `NON_RENEWING_PURCHASE` |
| A consumable or entitlement cancelled (`*_CANCELLED`, or RVS answers 410) | `CANCELLATION` (`CUSTOMER_SUPPORT`) with a negative price |

Webhooks report `store: AMAZON`. Amazon has no subscription pause, and like RevenueCat, RevenueDot does not detect refunds of Amazon subscriptions ([RevenueCat: refunds](https://www.revenuecat.com/docs/subscription-guidance/refunds)).

## Sandbox
- Purchases from **Live App Testing** (`betaProduct`) and Amazon's test transactions (`testTransaction`) are sandbox data and stay out of production numbers.
- Receipts from **App Tester** exist only in RVS's cloud sandbox. When production RVS does not know a receipt, RevenueDot asks the cloud sandbox, and a receipt found there is sandbox data.
- Amazon's accelerated test timelines are not supported; event times follow real time ([RevenueCat: Amazon sandbox](https://www.revenuecat.com/docs/test-and-launch/sandbox/amazon-store-sandbox-testing) has the same limit).

## Prices
RVS has no price. The price and currency the SDK posts (the marketplace's local price) are saved with the purchase and converted to USD at the purchase date's rate. Renewals that arrive by notification keep the last known price.

## Related
- [Android SDK guide](../sdks/android.md)
- [Store notifications not arriving](../help/store-notifications-not-arriving.md)
- [SDK endpoints: Amazon receipt details](../../api/sdk-endpoints.md)
- [REST API v2](../../api/rest-v2.md)

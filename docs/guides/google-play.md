---
title: How do I connect Google Play to RevenueDot?
description: Create a Google Play app with your package name, upload a Google Cloud service account key with Play Console access, then push real-time developer notifications to RevenueDot through Pub/Sub.
---

# How do I connect Google Play to RevenueDot?

Three steps: create a Google Play app in RevenueDot with your package name, upload a **service account** key that Play Console lets read your orders, and point a **Pub/Sub push subscription** for real-time developer notifications at RevenueDot's notification URL. The dashboard's app page shows the same steps and checks each one.

## 1. Create the app
```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Scanner (Android)","type":"play_store","play_store":{"package_name":"com.example.scanner"}}'
```

The app's public SDK key starts with `goog_`. Create its products with `store_identifier` set to `subscriptionId:basePlanId` for subscriptions (for example `pro:monthly`) and the product ID for one-time products. See [Products and entitlements](../concepts/products-and-entitlements.md).

## 2. Add a service account
RevenueDot uses the service account to read each purchase from the Google Play Developer API, **acknowledge** it (Google refunds purchases left unacknowledged for 3 days), look up refunds, and run store actions such as refund, cancel and defer.

1. In [Google Cloud](https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com), enable the **Google Play Android Developer API** for your project.
2. Under **IAM → Service accounts**, create a service account. Open it, choose **Keys → Add key → JSON**, and download the file.
3. In [Play Console → Users and permissions](https://play.google.com/console/developers/users-and-permissions), invite the service account's email with **View app information**, **View financial data** and **Manage orders and subscriptions**. View app information also lets RevenueDot [import your products](import-products.md).
4. In the dashboard, open the app → **Service account credentials**, drop the JSON file and click **Check credentials**. New Play Console permissions can take up to 36 hours to apply; until then the check says the account "works but cannot see this app yet".

With the API, send the file's contents as `play_service_account_credentials_json`:

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps/$APP_ID" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d "$(jq -n --rawfile sa service-account.json '{play_store: {play_service_account_credentials_json: $sa}}')"
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps/$APP_ID/actions/verify_credentials" -H "Authorization: Bearer $SECRET_KEY"
```

Without a service account, Google Play receipts cannot be verified and RevenueDot answers 503 (code 7101), so the SDK keeps the purchase and retries once you add it.

## 3. Push real-time developer notifications to RevenueDot
Google Play publishes notifications to a Pub/Sub topic. A push subscription delivers them to RevenueDot.

1. Copy the app's notification URL, `https://revenuedot.example.com/v1/notifications/google/{app_id}`, from the dashboard or from `GET /v2/projects/{project_id}/apps/{app_id}/store_settings` (`notification_url`).
2. In [Google Cloud → Pub/Sub](https://console.cloud.google.com/cloudpubsub/topic/list), create a topic. Give `google-play-developer-notifications@system.gserviceaccount.com` the **Pub/Sub Publisher** role on it.
3. Add a subscription to the topic with delivery type **Push** and the notification URL as the endpoint.
4. In Play Console → **Monetize with Play → Monetization setup**, paste the full topic name (`projects/<project>/topics/<topic>`) and turn on subscriptions, voided purchases and one-time products.
5. Click **Send test notification**. The app's notification status turns **Ready** when it arrives.

For each notification RevenueDot stores the raw message once (by message ID), copies it to `notification_forward_url` when set, and reads the purchase again from the Play Developer API. Voided-purchase notifications record refunds. How it answers Pub/Sub:
- **200** when the message is handled, a duplicate, for another package name, or about an invalid purchase token. These never succeed on a retry, so Pub/Sub should stop.
- **500 or 503** for temporary failures, such as Google's API not answering. Pub/Sub delivers the message again.

Once a day RevenueDot also asks Google for voided purchases of the last 30 days, as a backup for missed refund notifications. This needs the service account.

## Optional: authenticate Pub/Sub pushes
By default anyone who knows the URL can post to it, but RevenueDot only trusts what Google's API returns for a purchase token, so a fake message cannot unlock anything. To also reject unsigned pushes:

1. Edit the push subscription, turn on **Enable authentication**, choose a service account, and set an **audience** (for example the notification URL).
2. Save the same values on the app. The dashboard has no field for this yet, so use the API:
   ```bash
   curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps/$APP_ID" \
     -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
     -d '{"play_store":{"pubsub_audience":"https://revenuedot.example.com/v1/notifications/google/'$APP_ID'","pubsub_service_account":"pubsub-push@your-project.iam.gserviceaccount.com"}}'
   ```
From then on, a push without a valid Google-signed token for that audience (and that service account) gets 401.

## Google Play service fee
Proceeds use Google's [service fees](https://support.google.com/googleplay/android-developer/answer/112622) with nothing to set up:

- **Subscriptions:** 15%.
- **One-time purchases:** 15% on the app's first $1M of Google Play sales in a calendar year, then 30% for the rest of that year. Under Google's 2026 fees, a purchase above $1M by a customer who first opened the app after the fees started in their country is 25%.

RevenueDot counts the $1M from the purchases it has recorded for the app, so purchases made before you moved to RevenueDot count only if you [imported](../migrate/README.md) them.

## What you can do from the server afterwards
- **Refund and revoke** a subscription: `POST /v2/projects/{project_id}/subscriptions/{subscription_id}/actions/refund`.
- **Cancel** (turn auto-renew off): `.../actions/cancel`.
- **Defer** the next renewal by up to 365 days: `.../actions/extend` with `extend_by_days`, or v1 `.../subscriptions/{product_id}/defer`.
- **Refund a one-time purchase**: `POST /v2/projects/{project_id}/purchases/{purchase_id}/actions/refund`.
- **Restore a purchase from its order id** (`GPA.1234-5678-9012-34567`, from the customer's Google receipt email): `POST /v2/projects/{project_id}/customers/{customer_id}/actions/restore_purchase_by_order_id`. RevenueDot finds the purchase token with Google's Orders API (the service account needs **View financial data**), verifies it, and gives the purchase to the customer under the project's transfer behaviour.
- **Create a subscription in Play Console** from your catalog: `POST /v2/projects/{project_id}/products/{product_id}/create_in_store`. Google gets the subscription id and a listing in your app's default language; add base plans and prices in Play Console. One-time products need a price, so create them in Play Console.

These call Google's API with the service account. They are tested against a mocked Google API only; run one in a sandbox before you rely on it.

## Related
- [Android SDK guide](../sdks/android.md)
- [Test with Play license testers](sandbox-testing.md)
- [Store notifications not arriving](../help/store-notifications-not-arriving.md)
- [REST API v2](../../api/rest-v2.md)

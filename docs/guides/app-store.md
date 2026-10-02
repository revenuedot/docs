---
title: How do I connect the App Store to RevenueDot?
description: Create an App Store app with your bundle ID, add an In-App Purchase key (.p8, key ID, issuer ID), then set RevenueDot's notification URL as the Server Notifications v2 URL in App Store Connect.
---

# How do I connect the App Store to RevenueDot?

Three steps: create an App Store app in RevenueDot with your bundle ID, give it an **In-App Purchase key** so it can ask Apple about purchases, and paste its **notification URL** into App Store Connect as the Version 2 server notification URL. The dashboard's app page walks you through the same steps and checks each one.

## 1. Create the app
In the dashboard: **Apps → New app → App Store**, with your bundle ID. Or with the API:

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Scanner (iOS)","type":"app_store","app_store":{"bundle_id":"com.example.scanner"}}'
```

The answer holds the app's `id`. Its public SDK key (`appl_...`) is on the app's page, or at `GET /v2/projects/{project_id}/apps/{app_id}/public_api_keys`. Use type `mac_app_store` (key `mac_...`) for a separate Mac App Store app.

## 2. Add the In-App Purchase key
RevenueDot uses this key to call Apple's App Store Server API: to confirm each StoreKit 2 purchase, read a customer's full history and renewal state (auto-renew, billing retry, grace period), and extend subscriptions.

1. Open [App Store Connect → Users and Access → Integrations → In-App Purchase](https://appstoreconnect.apple.com/access/integrations/api/subs).
2. Click **+**, name the key (for example RevenueDot) and click **Generate**.
3. Download the `.p8` file. Apple lets you download it only once.
4. Note the **Key ID** (10 characters) and the **Issuer ID** shown above the keys list.
5. In the dashboard, open the app → **In-app purchase key**, drop the `.p8` file, fill in the IDs and click **Check credentials**.

Or with the API. RevenueDot stores these under RevenueCat's field names and never returns them:

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps/$APP_ID" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d "$(jq -n --rawfile key AuthKey_ABC123DEFG.p8 '{app_store: {subscription_private_key: $key, subscription_key_id: "ABC123DEFG", subscription_key_issuer: "57246542-96fe-1a63-e053-0824d011072a"}}')"

# Ask Apple whether the key works (one harmless API call).
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps/$APP_ID/actions/verify_credentials" -H "Authorization: Bearer $SECRET_KEY"
```
```json
{"object":"credentials_check","app_id":"appugfw01uy","store":"app_store","status":"valid","valid":true,"message":"Apple accepted the in-app purchase key.","checked_at":1790801342700,"key_id":"ABC123DEFG"}
```

**Without the key**, RevenueDot still verifies StoreKit 2 signed transactions against Apple's root certificate, but it knows only what the device sent: no renewal state and no history. **StoreKit 1 receipts need the key.** Without it RevenueDot answers 500 with code 7234, so the SDK keeps the purchase and retries after you add the key. (For development only, the `allow_unsigned_receipts` setting accepts StoreKit 1 receipts without checking them. Anyone could forge such a receipt, so never turn it on in production.)

## 3. Send App Store Server Notifications to RevenueDot
Notifications tell RevenueDot about renewals, cancellations, billing problems and refunds when they happen, not only when the app next opens.

1. Copy the app's notification URL from the dashboard, or from the API. It looks like `https://revenuedot.example.com/v1/notifications/apple/{app_id}`:
   ```bash
   curl -s "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps/$APP_ID/store_settings" -H "Authorization: Bearer $SECRET_KEY" | jq -r .notification_url
   ```
   Behind a reverse proxy, RevenueDot builds the URL from `X-Forwarded-Host` and `X-Forwarded-Proto`. Check that it shows your public HTTPS address.
2. In App Store Connect, open your app → **App Information** → **App Store Server Notifications**.
3. Paste the URL as both the **Production Server URL** and the **Sandbox Server URL**, and choose **Version 2**.
4. Make a sandbox purchase. The app's notification status turns **Ready** when the first notification about a known purchase is processed.

How RevenueDot answers Apple:
- **200** for every verified notification, including ones about purchases it has not seen. Those are stored, and applied only when **Track new purchases from server-to-server notifications** is on (`track_new_purchases`).
- **400** when the signature is invalid, or the notification is for another bundle ID (or another Apple app ID, when you set `app_apple_id`). App Store Connect shows these as failed.
- **500** when RevenueDot itself fails. Apple retries.

Check the status any time: `GET /v2/projects/{project_id}/setup_health` lists each app's `notification_status` (`ready`, `failing`, `received` or `waiting`) and the last error. See [store notifications not arriving](../help/store-notifications-not-arriving.md).

## Optional settings
Set these in the app's `app_store` object with `POST /v2/projects/{project_id}/apps/{app_id}`, or in the dashboard under **More settings**:

| Field | What it does |
|---|---|
| `notification_forward_url` | Copies each notification, byte for byte, to another URL, such as RevenueCat's during a [dual run](../migrate/dual-run.md). `null` turns it off |
| `track_new_purchases` | `true`: apply notifications about purchases RevenueDot has never seen. Useful during a migration |
| `app_apple_id` | Your app's Apple ID (a number). Production notifications for another app ID are refused |
| `xcode_certificate` | The StoreKit test certificate exported from Xcode (PEM). Lets RevenueDot accept purchases made with a StoreKit configuration file in the simulator. See [sandbox testing](sandbox-testing.md) |
| `allow_unsigned_receipts` | Development only: accept StoreKit 1 receipts without the In-App Purchase key |
| `app_store_connect_api_key`, `_id`, `_issuer`, `app_store_connect_vendor_number` | A separate App Store Connect API key with the App Manager role. Used to [import your products](import-products.md) and to create products in App Store Connect (below) |
| `shared_secret` | The legacy app-specific shared secret. Stored but not used: RevenueDot does not call Apple's deprecated verifyReceipt endpoint |
| `small_business_program` | Your dates in Apple's Small Business Program (below). `null` removes them |

## Apple Small Business Program
Apple keeps 15% instead of 30% while your app is in the [App Store Small Business Program](https://developer.apple.com/app-store/small-business-program/). Tell RevenueDot the dates, and proceeds use 15% for every purchase and renewal made inside them.

- **In the dashboard:** open the app, then **More settings → Apple Small Business Program**. Turn on **Enrolled**, set the entry date and, if you left, the exit date. **Add period** covers a second membership. **Use existing dates from …** copies the dates saved on another App Store app in the project.
- **With the API:**
  ```bash
  curl -s -X POST "$B/apps/$APP_ID" -H "$H" -H "Content-Type: application/json" \
    -d '{"app_store":{"small_business_program":{"enrolled":true,"periods":[{"entry_date":"2024-01-01","exit_date":null}]}}}'
  ```
  Dates are `YYYY-MM-DD` (UTC). The exit date is the first day back at 30%. Up to 10 periods; they must not overlap.
- **What changes:** charts with revenue type **Proceeds**, metrics, exports and the REST API recompute past proceeds for the dates you enter. New webhook and integration events carry `commission_percentage` 0.15 (`takehome_percentage` 0.85). Events already sent keep their values, as in RevenueCat.

## What you can do from the server afterwards
- **Extend a subscription** by 1 to 90 days: `POST /v2/projects/{project_id}/subscriptions/{subscription_id}/actions/extend` with `extend_by_days` and `extend_reason_code`.
- **Extend every active subscriber of a product**, for example after an outage: `POST /v2/projects/{project_id}/apps/{app_id}/actions/mass_extend`.
- **Refunds** are Apple's decision; customers ask Apple. RevenueDot records Apple's `REFUND` notification as a `CANCELLATION` with a negative price.
- **Restore a purchase from its order id**, for a customer who sends you Apple's receipt email: `POST /v2/projects/{project_id}/customers/{customer_id}/actions/restore_purchase_by_order_id` with `{"order_id":"MK5TTTVWJH"}`. RevenueDot looks the order up with Apple (needs the In-App Purchase key) and gives the customer its subscriptions and purchases, under the project's transfer behaviour.
- **Create a product in App Store Connect** from your catalog: `POST /v2/projects/{project_id}/products/{product_id}/create_in_store`. A subscription needs `{"store_information":{"duration":"ONE_MONTH","subscription_group_name":"Pro"}}`; the group is reused by name or created. Other product types need no body. Add prices, a review screenshot and localizations in App Store Connect before you submit. Needs the App Store Connect API key above.
- **Win-back offers** work with no server setup beyond the In-App Purchase key and notifications. See [Win-back offers](win-back-offers.md).

## Related
- [iOS SDK guide](../sdks/ios.md)
- [Test with sandbox accounts and Xcode](sandbox-testing.md)
- [Webhooks](webhooks.md)
- [REST API v2: apps](../../api/rest-v2.md)

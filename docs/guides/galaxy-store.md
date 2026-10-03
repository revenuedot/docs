---
title: How do I connect the Samsung Galaxy Store to RevenueDot?
description: Create a Galaxy Store app with your package name and a Seller Portal service account, build your Android app with the RevenueCat SDK's Galaxy module pointed at RevenueDot, and set RevenueDot's URL for Samsung's server notifications.
---

# How do I connect the Samsung Galaxy Store to RevenueDot?

Three steps: create a Galaxy Store app with your **package name** and a Seller Portal **service account**, build the app with the RevenueCat SDK's Galaxy module pointed at RevenueDot, and set RevenueDot's URL for Samsung's **server notifications**. Purchases from the Galaxy Store unlock the same entitlements as Google Play. Setup mirrors [RevenueCat's Galaxy Store guide](https://www.revenuecat.com/docs/platform-resources/galaxy-platform-resources/galaxy-setup-guide).

## 1. Create the app and the service account
1. In [Samsung Seller Portal](https://seller.samsungapps.com), open **Assistance → API Service → Create Service Account**, select the **Publishing & Item** and **GSS** scopes, and click **Download Key**. Samsung shows the key only once.
2. In the dashboard, **Apps → Add app → Galaxy Store**, enter the package name, then paste the service account ID, drop the key file and click **Check credentials**.

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Scanner Galaxy","type":"galaxy","galaxy":{"package_name":"com.example.scanner","galaxy_service_account_id":"<id>","galaxy_service_account_private_key":"-----BEGIN PRIVATE KEY-----\n…"}}'
```

- `galaxy` is a RevenueDot extension of the v2 API: RevenueCat's v2 API has no Galaxy app object. The app's public key starts with `galx_`, the prefix the SDK requires.
- The private key is sealed and never returned. RevenueDot signs a JWT with it for Samsung's access tokens; the check then reads a made-up subscription, so a wrong account or a missing scope shows up here.
- Create products with `store_identifier` set to each item ID: subscriptions, consumables and non-consumables. **Import products** lists your in-app items; Samsung's API does not list subscriptions, so add those with **New product**.

## 2. Build the app with the Galaxy module
```kotlin
// build.gradle: implementation("com.revenuecat.purchases:purchases-store-galaxy:<version>")
Purchases.proxyURL = URL("https://api.revenuedot.app")   // or your own server, before configure
Purchases.configure(GalaxyConfiguration.Builder(this, "galx_…").build())
```

React Native: add `react-native-purchases-store-galaxy` and configure with `store: "GALAXY"`.

The SDK posts each purchase to `POST /v1/receipts` with Samsung's purchase ID as `fetch_token`. RevenueDot reads the receipt from Samsung (no credentials needed), and a subscription's state with the service account. Answers:
- `purchased_products.<item>.should_consume` is true for products the catalog marks consumable, so the SDK consumes them; everything else is acknowledged.
- An unknown purchase or another app's purchase answers **400**. Samsung being down, or a subscription without a service account, answers **5xx**: the SDK leaves the purchase unfinished and tries again.
- Purchases made in IAP test mode by license testers are **sandbox**.

## 3. Server notifications
1. Copy the app's URL, `https://<your server>/v1/notifications/galaxy/{app_id}`, from the app page and set it in Seller Portal for the app's in-app purchases.
2. Send Samsung's test notification; the app page turns green.
3. Optional but recommended: paste the seller's **IAP public key** (Assistance → API Service → IAP Key). Every notification's signature is then checked. Without it, RevenueDot trusts nothing in a notification and reads the purchase from Samsung instead, which is also how RevenueCat works.

| Samsung | Event |
|---|---|
| `ARS_SUBSCRIBED`, a new purchase | INITIAL_PURCHASE (TRIAL or INTRO for free and tiered first periods) |
| `ARS_RENEWED`, `ARS_OUT_GRACE_PERIOD` | RENEWAL |
| `ARS_UNSUBSCRIBED`, `ARS_RESUBSCRIBED` | CANCELLATION, UNCANCELLATION |
| `ARS_IN_GRACE_PERIOD` | BILLING_ISSUE; access continues to the grace end |
| The end date passes | EXPIRATION |
| `ARS_UPDOWNGRADED` | PRODUCT_CHANGE on the old subscription; the new plan is its own subscription for the same customer |
| `ARS_REFUNDED`, `ITEM_REFUNDED` | CANCELLATION (CUSTOMER_SUPPORT), access ends |
| `ARS_PRICECHANGE_AGREED` | PRICE_INCREASE_CONSENT_APPROVED |

Refunds and cancellations also work from the API, through Samsung: `POST /v2/projects/{project_id}/subscriptions/{id}/transactions/{transaction_id}/actions/refund` (RevenueCat's "refund a Play Store or Galaxy subscription's transaction") and `…/subscriptions/{id}/actions/cancel`. Webhooks report `store: GALAXY`; take-home estimates use Samsung's standard 30% share.

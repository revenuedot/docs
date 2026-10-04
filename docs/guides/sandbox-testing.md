---
title: How do I test with App Store sandbox, StoreKit in Xcode and Google Play testers?
description: Real store test purchases work against RevenueDot once the app's store credentials and notifications are set up. They are marked sandbox; Xcode StoreKit purchases also need the StoreKit test certificate.
---

# How do I test with App Store sandbox, StoreKit in Xcode and Google Play testers?

Store test purchases work against RevenueDot the same way they work in production: set up the app's [App Store](app-store.md) or [Google Play](google-play.md) credentials and notifications first. RevenueDot reads the environment from the store, so these purchases are marked **sandbox**, unlock entitlements and send webhooks with `environment: SANDBOX`. For quick tests without any store account, use the [Test Store](test-store.md) instead.

**Status (2026-10-03):** a real App Store sandbox purchase ran end to end on a physical iPhone on 2026-10-02: Apple's purchase sheet, Apple's notification into RevenueDot, an `INITIAL_PURCHASE` webhook, access unlocked in the app. Google Play's code path passes its tests against a copy of Google's API; no real Play sandbox purchase has run end to end yet. Tell us what you find in a [GitHub issue](https://github.com/revenuedot/revenuedot/issues).

## App Store sandbox and TestFlight
1. Create a sandbox tester in App Store Connect (**Users and Access → Sandbox**), and sign in with it on the device under **Settings → App Store → Sandbox Account**. TestFlight builds use sandbox purchases too.
2. Configure the SDK with the app's `appl_` key and your RevenueDot proxy URL.
3. Buy. The SDK posts the StoreKit 2 signed transaction; RevenueDot verifies Apple's signature and, with the In-App Purchase key, reads the history from Apple's sandbox environment.
4. Sandbox subscriptions renew fast (a month lasts minutes), so renewals, expirations and their notifications arrive quickly. Point App Store Connect's **Sandbox Server URL** at the same notification URL as production.

## StoreKit testing in Xcode
Purchases made with a StoreKit configuration file in Xcode are signed by Xcode, not Apple, so RevenueDot refuses them unless the app holds Xcode's certificate:

1. In Xcode, open the `.storekit` file and choose **Editor → Save Public Certificate**.
2. Save the certificate on the app as `xcode_certificate` (PEM or base64 DER), in the dashboard under **More settings → StoreKit testing in Xcode**, or with the API:
   ```bash
   curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps/$APP_ID" \
     -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
     -d "$(jq -n --rawfile cert StoreKitTestCertificate.pem '{app_store: {xcode_certificate: $cert}}')"
   ```
3. Buy in the simulator. RevenueDot trusts the local transactions and does not call Apple for them.

## Google Play license testers
1. In Play Console, add testers under **Setup → License testing**, and publish the app to an internal test track.
2. Configure the SDK with the app's `goog_` key and your proxy URL, and install the build from the test track.
3. Buy with a tester account. Google marks the purchase as a test purchase, and RevenueDot records it as sandbox. Test subscriptions renew every few minutes.
4. Pub/Sub notifications for test purchases arrive at the same push endpoint as real ones.

## Check what happened
- The customer's page in the dashboard shows each purchase with its environment and events.
- `GET /v2/projects/{project_id}/customers/{customer_id}/subscriptions?environment=sandbox`
- `GET /v2/projects/{project_id}/events?environment=sandbox`
- `GET /v2/projects/{project_id}/metrics/overview?environment=sandbox`

## Related
- [Sandbox and production](../concepts/sandbox.md)
- [How do I test purchases without real money?](../help/test-sandbox-purchases.md)
- [Test Store](test-store.md)

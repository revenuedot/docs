---
title: How do I test purchases without real money?
description: Use the Test Store for the fastest loop, then App Store sandbox, StoreKit testing in Xcode with the xcode_certificate credential, or Google Play license testers.
---

# How do I test purchases without real money?

Start with the **Test Store**: it needs no App Store or Google Play account and works in seconds. Then test with each store's own sandbox: **App Store sandbox** accounts, **StoreKit testing in Xcode** (after you give RevenueDot Xcode's certificate), and **Google Play license testers**. RevenueDot marks all of these purchases as sandbox, so they stay out of your production numbers and webhooks carry `"environment": "SANDBOX"`.

> App Store and Google Play support is tested against mocked Apple and Google APIs only. No real sandbox purchase has run end to end yet (2026-09-30). Please report what you find.

## Test Store: no store account needed
1. Create an app with `type: test_store`, or run the [seed script](https://github.com/revenuedot/examples/blob/main/selfhost/docker-compose/seed.sh).
2. Use its `test_` key as the SDK's API key and your server as the proxy URL.
3. Buy. The SDK shows a Test Store dialog and posts a `fetch_token` of the form `test_<ms>_<id>`.

You can also post a purchase yourself:

```bash
curl -s http://localhost:8787/v1/receipts \
  -H "Authorization: Bearer $TEST_KEY" -H "Content-Type: application/json" \
  -d "{\"app_user_id\":\"user_1\",\"fetch_token\":\"test_$(date +%s)000_demo\",\"product_id\":\"pro_monthly\",\"price\":9.99,\"currency\":\"USD\"}"
```

To test what happens later in a subscription's life, simulate it with your secret key. `scenario` is one of `purchase`, `trial`, `trial_conversion`, `renewal`, `cancel`, `billing_issue`, `refund` or `expire`:

```bash
curl -s -X POST http://localhost:8787/v2/projects/$PROJECT_ID/test_purchases \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"app_user_id":"user_refund","product_id":"pro_monthly","scenario":"refund"}'
```

The answer lists the events it produced, here `"event_types":["INITIAL_PURCHASE","CANCELLATION"]`, and your webhooks receive them. See [Test Store](../guides/test-store.md).

Test Store runs work with the native SDKs too: the unmodified RevenueCat iOS SDK 5.92 on the iPhone simulator and Android SDK 10.24 on the Android emulator buy through the SDK's Test Store dialog against RevenueDot. purchases-js and React Native (Expo Go or web) work as well.

## App Store sandbox
1. Connect the app: set its `bundle_id` and add the App Store in-app purchase key. See [Connect the App Store](../guides/app-store.md).
2. Create a sandbox Apple account in App Store Connect ([Apple docs](https://developer.apple.com/documentation/storekit/testing-in-app-purchases-with-sandbox)).
3. Run a development or TestFlight build and buy with that account.

Sandbox transactions are signed by Apple, so RevenueDot verifies them like production ones and stores them with `is_sandbox: true`. Sandbox subscriptions renew on Apple's shortened schedule, and renewals reach RevenueDot through App Store Server Notifications. Put the notification URL in App Store Connect's **Sandbox Server URL** too. See [Why are store notifications not arriving?](store-notifications-not-arriving.md)

## StoreKit testing in Xcode
Xcode signs local test transactions with its own certificate, not Apple's ([Apple docs](https://developer.apple.com/documentation/xcode/setting-up-storekit-testing-in-xcode)). RevenueDot refuses them with code 7103 until you give it that certificate:

1. Open your `.storekit` configuration file in Xcode and choose **Editor → Save Public Certificate**.
2. Store the certificate on the app as the `xcode_certificate` credential. PEM text or base64 DER both work:
   ```bash
   CERT=$(base64 < StoreKitTestCertificate.cer | tr -d '\n')
   curl -s -X POST http://localhost:8787/v2/projects/$PROJECT_ID/apps/$APP_ID \
     -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
     -d "{\"app_store\":{\"xcode_certificate\":\"$CERT\"}}"
   ```
3. Buy in the simulator. RevenueDot now accepts the local transactions.

Use this only on a development server. Anyone with the certificate can sign transactions it will accept.

## Google Play license testers
1. Connect the app: set its `package_name` and add the service account. See [Connect Google Play](../guides/google-play.md).
2. Add tester accounts under **License testing** in Play Console, and publish the app to an internal testing track ([Google docs](https://developer.android.com/google/play/billing/test)).
3. Install from the track and buy with a tester account. Google uses test cards and shortened renewal periods.

RevenueDot reads the purchase from the Play Developer API and acknowledges it. Google tells RevenueDot it is a test purchase, so it is stored as sandbox.

## Keep test purchases apart
- Set `sandbox_transfer_behavior` on the project if testers share devices and you want restores to behave differently in sandbox. See [How do I restore purchases?](restore-purchases.md)
- Point a webhook at a staging backend with `environment: "sandbox"`, and your production webhook at `environment: "production"`. See [Webhooks](../guides/webhooks.md).

## Related
- [Sandbox](../concepts/sandbox.md)
- [Sandbox testing guide](../guides/sandbox-testing.md)
- [Test Store](../guides/test-store.md)

---
title: Migrating from RevenueCat without losing a subscriber
description: "The safe order for moving to RevenueDot: import customers and keep your public keys, forward store notifications to run both systems, verify, then switch with an app update."
date: 2026-09-30
author: RevenueDot team
---

# Migrating from RevenueCat without losing a subscriber

A safe migration never has a moment when a paying customer lacks access. With RevenueDot you get there in five steps: **import** your RevenueCat project, **keep the public keys** your apps already ship, **run both systems side by side** by forwarding store notifications, **verify** that they agree, and then **switch** with an app update that sets the proxy URL. RevenueCat keeps working the whole time, so you can stop at any step.

Rehearse everything below on a copy of your project first, then run both systems side by side before you switch live customers.

## Step 1: import the project
The importer reads your RevenueCat project through RevenueCat's REST API v2 with a read-only secret key, and writes to your RevenueDot server through its REST API. It runs on your machine, so your keys and data never pass through anyone else.

It is on npm as `revenuedot`:

```bash
npx revenuedot import --from-revenuecat \
  --rc-key sk_... --rc-project proj... \
  --to https://revenuedot.example.com --to-key sk_... --dry-run
```

Drop `--dry-run` to write.

What comes over:
- **The catalog**: apps, products, entitlements and the products attached to them, offerings with their metadata and the current flag, and packages.
- **Customers**: IDs, aliases, attributes, subscriptions with their store transactions, and one-time purchases.
- **Dates**: first-seen dates and original purchase dates, so your cohorts stay honest.

What does not come over: paywalls, targeting rules, experiments and virtual currency balances. Refunded subscriptions import as expired, because RevenueCat's API does not expose the refund. RevenueCat Billing subscriptions keep their access, but their renewals stay with RevenueCat.

The import is **quiet**: it sends no webhooks and records no lifecycle events, so your backend does not see thousands of fake `INITIAL_PURCHASE` events. Pass `--emit-events` if you want them. It is also **resumable and idempotent**. A state file tracks progress, so a stopped run carries on where it stopped, and a second run changes nothing that is already right. That makes the same command your incremental sync during the side-by-side run.

The importer makes about five RevenueCat API calls per customer, and when RevenueCat answers 429 it waits for the time in `Retry-After`. A large project takes hours, not minutes, so start it early. `--concurrency`, `--limit` for a trial run, and `--json` for a machine-readable report are there when you need them.

## Step 2: keep the public keys you already ship
Your app binaries contain RevenueCat public keys such as `appl_...` and `goog_...`. By default the importer sets each RevenueDot app's public key to the same value, through `POST /v2/projects/{project_id}/import/apps/{app_id}/public_key`. Public keys are public by design, so this is safe.

The result: the app update that switches to RevenueDot changes only the proxy URL, and not the key. Pass `--no-public-keys` if you would rather issue new keys.

## Step 3: fill in the Google purchase tokens
Apple purchases carry an original transaction ID that both systems share, and RevenueDot confirms it with Apple when the app's in-app purchase key is set. Google is harder: RevenueCat's API exposes Google **order IDs**, not the **purchase tokens** that Google's API needs.

RevenueDot fills them in from four places:
1. **Google's orders API.** When the Play app's service account is set, the server looks up the token for each imported order ID during the import.
2. **A token file.** If you have the tokens, pass `--google-tokens tokens.csv`, with a `purchase_token` column plus `order_id`, or `app_user_id` and `product_id`.
3. **Renewal notifications.** Each Google notification carries the token and upgrades the imported record.
4. **One `syncPurchases()` in the app.** The SDK posts the device's tokens.

Until a token arrives, a subscription waits under the key `needs_token_refresh:<order id>`. The customer keeps the access that was imported. Check what is left with `GET /v2/projects/{project_id}/import/status`, which counts `needs_token_refresh` per app.

## Step 4: run both systems side by side
Now make both systems hear about every renewal, cancellation and refund. Point the stores at RevenueDot, and let RevenueDot forward each notification to RevenueCat:

```bash
curl -s -X POST https://revenuedot.example.com/v2/projects/$PROJECT_ID/apps/$APP_ID \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"app_store":{"notification_forward_url":"https://<your RevenueCat App Store notification URL>"}}'
```

Use `play_store` for a Google Play app. In the dashboard, the same setting is on the app page, under **Forward notifications to RevenueCat or your own server**. Then set RevenueDot's notification URL in App Store Connect, both production and sandbox, and on the Pub/Sub push subscription.

For each notification, RevenueDot stores it, applies it, and copies the exact body to the forward URL. The forward runs in the background with a 10-second timeout, so a slow RevenueCat never delays Apple or Google. The last forward's HTTP status is shown on the app's store settings. For Google you can instead add a second push subscription on the same Pub/Sub topic, so each system gets its own copy.

Turn on **Track new purchases from server-to-server notifications** too (the `track_new_purchases` credential). Without it, a notification about a purchase RevenueDot has never seen is stored but not applied. During a dual run, people keep buying through RevenueCat, so you want RevenueDot to pick those purchases up.

Run the importer again from time to time. It picks up customers and purchases created in RevenueCat since the last run.

## Step 5: verify, then switch
Compare the two systems customer by customer:

```bash
pnpm --filter revenuedot cli import verify \
  --rc-key sk_... --rc-project proj... --to https://revenuedot.example.com --to-key sk_...
```

It compares each customer's active entitlements, their expiry dates and the number of subscriptions that give access, plus totals. It exits with 0 when everything matches and 1 when it finds differences, so you can run it in CI. Re-run the import, then verify again, until the differences you see are ones you understand.

Then ship the app update. The change is the proxy URL, set before `configure`, and turning off the SDK's response-signature check:

```swift
// Point the SDK at your RevenueDot server; nothing else in the app changes.
Purchases.proxyURL = URL(string: "https://revenuedot.example.com")!
Purchases.configure(with: Configuration.Builder(withAPIKey: "appl_...")
  .with(entitlementVerificationMode: .disabled)
  .build())
```

Users on older versions keep talking to RevenueCat, and the forwarded notifications keep RevenueCat correct for them. Point your backend's webhook handler at RevenueDot's webhooks: the payload has the same shape, and RevenueDot adds an HMAC signature header you should verify. When nearly all active users run the new version, stop forwarding and turn RevenueCat off. `revenuedot import plan` prints these cutover steps with your own app IDs and URLs.

## The short version
1. Import with a dry run, then for real.
2. Keep your public keys.
3. Let Google tokens fill in.
4. Forward notifications and track new purchases.
5. Verify, ship the proxy URL, wait for adoption, then turn RevenueCat off.

The full guides are in [Migrate from RevenueCat](../docs/migrate/README.md), with the [importer](../docs/migrate/importer.md), the [dual run](../docs/migrate/dual-run.md) and the [cutover checklist](../docs/migrate/cutover-checklist.md).

**About RevenueDot.** RevenueDot is an open-source (AGPL-3.0) backend for in-app purchases and subscriptions on the App Store, Google Play and the web. Start free on [RevenueDot Cloud](https://app.revenuedot.app/signup): free up to $10,000 in monthly tracked revenue, then 0.5%, never more than $999 a month. New apps install the [RevenueDot SDK](../docs/sdks/README.md) and pass their key. Apps that ship the RevenueCat SDK point its proxy URL at RevenueDot and keep their code, offerings and customers. Read the [quickstart](../docs/getting-started/quickstart.md) or the code on [GitHub](https://github.com/revenuedot/revenuedot).

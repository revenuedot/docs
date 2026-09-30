---
title: How do I run RevenueDot and make a first purchase in 5 minutes?
description: Start the server with Docker Compose, seed a Test Store app with one script, buy a subscription with curl, then point the RevenueCat SDK at your server.
---

# How do I run RevenueDot and make a first purchase in 5 minutes?

Start the server with Docker, seed it with a Test Store app, make a purchase with `curl`, then point an SDK at it. You need no App Store or Google Play account. Most of the 5 minutes is the first image build.

You need Docker with Compose v2, plus `git`, `curl` and `jq`.

## 1. Start RevenueDot
```bash
git clone https://github.com/revenuedot/revenuedot.git
cd revenuedot
cp .env.example .env          # sets POSTGRES_PASSWORD; change it before the first start
docker compose up -d          # builds the image, starts the server and Postgres
curl http://localhost:8787/v1/health
```
```json
{"status":"ok"}
```

One container serves the SDK API, the REST API and the dashboard on port 8787. To use another host port, set `REVENUEDOT_PORT=8797` in `.env`. The dashboard is at `http://localhost:8787/login`; the bare `/` path returns a small JSON document.

## 2. Seed a project with a Test Store app
The seed script uses only the public API. It creates a dashboard account and project, a Test Store app, three products, a `pro` entitlement, a `default` offering and a secret key.

```bash
curl -fsSLO https://raw.githubusercontent.com/revenuedot/examples/main/selfhost/docker-compose/seed.sh
bash seed.sh                   # RD_URL=http://localhost:8797 bash seed.sh for another port
```
```text
RevenueDot is seeded.
  Dashboard        http://localhost:8787  (sign in as dev@example.com)
  Project id       projqhf9p5jb
  Test Store key   test_960d2b3001bac439c7a73d7f4214514c      <- the SDK's API key; the SDK's proxy URL is http://localhost:8787
  Secret key       sk_8b8dc12a743e51f4de759b0b9c6d372e6d25d32fe7280672    <- server-side only (REST API, backend checks)
Try it:
  curl -s -H "Authorization: Bearer test_960d2b3001bac439c7a73d7f4214514c" http://localhost:8787/v1/subscribers/user_1/offerings
```

Save the two keys for the next steps:
```bash
export TEST_KEY=test_...   # the Test Store key printed above
export SECRET_KEY=sk_...   # the secret key printed above
```

To see what the script does, or to do it by hand, read [the seed script](https://github.com/revenuedot/examples/blob/main/selfhost/docker-compose/seed.sh). Each step is one REST API v2 call. You can also do everything in the dashboard.

## 3. Ask for offerings, as the SDK does
```bash
curl -s -H "Authorization: Bearer $TEST_KEY" http://localhost:8787/v1/subscribers/user_1/offerings
```
```json
{"current_offering_id":"default","offerings":[{"description":"Standard plans","identifier":"default","metadata":null,"packages":[{"identifier":"$rc_monthly","platform_product_identifier":"pro_monthly"},{"identifier":"$rc_annual","platform_product_identifier":"pro_annual"},{"identifier":"$rc_lifetime","platform_product_identifier":"pro_lifetime"}]}]}
```

## 4. Make a Test Store purchase
In an app, the SDK makes this call for you after the user confirms the Test Store dialog. The Test Store accepts any `fetch_token` of the form `test_<purchase time in ms>_<id>`.

```bash
curl -s http://localhost:8787/v1/receipts \
  -H "Authorization: Bearer $TEST_KEY" -H "Content-Type: application/json" \
  -d "{\"app_user_id\":\"user_1\",\"fetch_token\":\"test_$(date +%s)000_quickstart\",\"product_id\":\"pro_monthly\",\"price\":9.99,\"currency\":\"USD\"}"
```

The answer is the customer's info. `pro` is now in `entitlements`, active until one month from now:
```json
{
  "request_date": "2026-09-30T19:49:29Z",
  "subscriber": {
    "entitlements": {
      "pro": { "expires_date": "2026-10-30T19:49:29Z", "grace_period_expires_date": null, "product_identifier": "pro_monthly", "purchase_date": "2026-09-30T19:49:29Z" }
    },
    "original_app_user_id": "user_1",
    "subscriptions": {
      "pro_monthly": { "store": "test_store", "is_sandbox": true, "period_type": "normal", "expires_date": "2026-10-30T19:49:29Z", "...": "..." }
    }
  },
  "purchased_products": { "pro_monthly": { "should_consume": false } }
}
```

Check the same customer through the REST API with the secret key:
```bash
curl -s -H "Authorization: Bearer $SECRET_KEY" \
  "http://localhost:8787/v2/projects/<project id>/customers/user_1/active_entitlements"
```

## 5. Point an SDK at your server
Use the Test Store key as the SDK's API key and your server as its proxy URL. The shortest path is the [purchases-js web example](https://github.com/revenuedot/examples/tree/main/web/purchases-js-vite), which runs in a browser in two minutes:

```bash
git clone https://github.com/revenuedot/examples.git && cd examples/web/purchases-js-vite
npm install
printf "VITE_REVENUEDOT_URL=http://localhost:8787\nVITE_REVENUEDOT_API_KEY=$TEST_KEY\n" > .env.local
npm run dev                    # open http://localhost:5199, click Buy, then "Test valid purchase"
```

In your own app, the change is the same on every platform: set the proxy URL before configuring, and turn off the response-signature check where the SDK has one.

```swift
// iOS: Point the SDK at your RevenueDot server; nothing else in the app changes.
Purchases.proxyURL = URL(string: "http://localhost:8787")!
Purchases.configure(with: Configuration.Builder(withAPIKey: "test_...").with(entitlementVerificationMode: .disabled).build())
```
```kotlin
// Android: Point the SDK at your RevenueDot server; nothing else in the app changes.
Purchases.proxyURL = URL("http://10.0.2.2:8787")   // the emulator reaches your computer as 10.0.2.2
Purchases.configure(PurchasesConfiguration.Builder(context, "test_...").entitlementVerificationMode(EntitlementVerificationMode.DISABLED).build())
```
```ts
// React Native / Expo: Point the SDK at your RevenueDot server; nothing else in the app changes.
await Purchases.setProxyURL("http://localhost:8787");
Purchases.configure({ apiKey: "test_..." });
```

Per-platform details, including Flutter, Capacitor, Kotlin Multiplatform, Unity and Cordova, are in the [SDK guides](../sdks/README.md). To use the RevenueDot fork packages instead, see [How do I connect my app?](connect-your-app.md).

Give each Test Store product a price in the dashboard (Product catalog, Edit product, Test Store price) so the paywall shows it; a product without one shows 0. Real prices come from the App Store and Google Play. See [Test Store](../guides/test-store.md).

## Next steps
- Receive the purchase on your backend: [Webhooks](../guides/webhooks.md).
- Simulate renewals, cancellations and refunds without waiting: [Test Store](../guides/test-store.md).
- Learn how entitlements, offerings and customers fit together: [Concepts](../concepts/README.md).
- Connect a real store: [App Store](../guides/app-store.md), [Google Play](../guides/google-play.md).
- Move an existing app: [Migrate from RevenueCat](../migrate/README.md).

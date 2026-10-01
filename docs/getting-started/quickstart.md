---
title: How do I make a first purchase with RevenueDot in 5 minutes?
description: Create a free RevenueDot Cloud account, add a Test Store app with a product and an entitlement, make a test purchase from the dashboard, then point the RevenueCat SDK at https://api.revenuedot.app. You can also run the same server yourself with Docker.
---

# How do I make a first purchase with RevenueDot in 5 minutes?

Create a free account on **RevenueDot Cloud**, add a Test Store app with one product and one entitlement, make a test purchase from the dashboard, then point an SDK at `https://api.revenuedot.app`. You need no server, no App Store account and no Google Play account. Cloud is free up to $10,000 in monthly tracked revenue.

To run the server on your own machine instead, skip to [Run it yourself](#run-it-yourself).

## 1. Create a free account
1. Open [app.revenuedot.app/signup](https://app.revenuedot.app/signup).
2. Enter your email, a password of at least 8 characters, and a name for your first project. A project holds your apps, products and customers.
3. Open the email from RevenueDot and click the link to confirm your address. The link works for 24 hours. Cloud needs a confirmed address before you can create secret API keys or invite teammates.

The dashboard opens on **Overview**, with a six-step setup checklist. To sign in later, use [app.revenuedot.app/login](https://app.revenuedot.app/login).

## 2. Add a Test Store app, a product and an entitlement
The **Test Store** is RevenueDot's built-in store for testing. Its purchases unlock entitlements and send webhooks like real ones, and they are always sandbox data.

Do it in the dashboard:
1. **Apps:** add an app of type **Test Store**.
2. **Product catalog, Products:** add a product for the Test Store app, for example `pro_monthly`, a subscription that lasts one month.
3. **Product catalog, Entitlements:** add an entitlement called `pro` and attach the product. Your app checks this entitlement to unlock paid features.
4. **Product catalog, Offerings:** add an offering called `default`, give it a package with the product, and make it current. The SDK reads this offering to build the paywall.

Or seed all of it with one script. It needs `curl` and `jq`, and it uses only the public API. It signs in with the account you just made, then adds a Test Store app, three products, a `pro` entitlement, a `default` offering and a secret key. Run it after you confirm your email, because Cloud creates secret keys only for confirmed accounts:

```bash
curl -fsSLO https://raw.githubusercontent.com/revenuedot/examples/main/selfhost/docker-compose/seed.sh
RD_URL=https://api.revenuedot.app RD_EMAIL=you@example.com RD_PASSWORD='your password' bash seed.sh
```

The script prints the project id, the Test Store key (`test_...`) and a secret key (`sk_...`). Keep the secret key on your server only. Sign in to the dashboard at [app.revenuedot.app/login](https://app.revenuedot.app/login), even though the script prints the API address.

## 3. Make a test purchase from the dashboard
On **Overview**, click **Make a test purchase**. Keep the app user ID `test_user_1`, pick the product and click **Purchase**.

The purchase runs through the same steps as a real one. Open **Customers** and click `test_user_1`: the customer has the `pro` entitlement, active for one month, and the purchase events are listed.

## 4. Point an SDK at RevenueDot Cloud
Copy the Test Store key (it starts with `test_`) from **API keys**. Use it as the SDK's API key, and use `https://api.revenuedot.app` as the SDK's proxy URL. Set the proxy URL before you configure the SDK, and turn off the response-signature check where the SDK has one.

```swift
// iOS: Point the SDK at RevenueDot Cloud; nothing else in the app changes.
Purchases.proxyURL = URL(string: "https://api.revenuedot.app")!
Purchases.configure(with: Configuration.Builder(withAPIKey: "test_...").with(entitlementVerificationMode: .disabled).build())
```
```kotlin
// Android: Point the SDK at RevenueDot Cloud; nothing else in the app changes.
Purchases.proxyURL = URL("https://api.revenuedot.app")
Purchases.configure(PurchasesConfiguration.Builder(context, "test_...").entitlementVerificationMode(EntitlementVerificationMode.DISABLED).build())
```
```ts
// React Native / Expo: Point the SDK at RevenueDot Cloud; nothing else in the app changes.
await Purchases.setProxyURL("https://api.revenuedot.app");
Purchases.configure({ apiKey: "test_..." });
```

The shortest way to see it in an app is the [purchases-js web example](https://github.com/revenuedot/examples/tree/main/web/purchases-js-vite), which runs in a browser:

```bash
git clone https://github.com/revenuedot/examples.git && cd examples/web/purchases-js-vite
npm install
printf "VITE_REVENUEDOT_URL=https://api.revenuedot.app\nVITE_REVENUEDOT_API_KEY=test_...\n" > .env.local
npm run dev                    # open http://localhost:5199, click Buy, then "Test valid purchase"
```

Per-platform details, including Flutter, Capacitor, Kotlin Multiplatform, Unity and Cordova, are in the [SDK guides](../sdks/README.md). To use the RevenueDot fork packages instead, see [How do I connect my app?](connect-your-app.md).

Give each Test Store product a price in the dashboard (Product catalog, Edit product, Test Store price) so the paywall shows it. A product without one shows 0. Real prices come from the App Store and Google Play. See [Test Store](../guides/test-store.md).

## Run it yourself
RevenueDot is open source, and the server on Cloud is the same code you can run. You need Docker with Compose v2, plus `git`, `curl` and `jq`. Most of the 5 minutes is the first image build.

### 1. Start RevenueDot
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

### 2. Seed a project with a Test Store app
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

### 3. Ask for offerings, as the SDK does
```bash
curl -s -H "Authorization: Bearer $TEST_KEY" http://localhost:8787/v1/subscribers/user_1/offerings
```
```json
{"current_offering_id":"default","offerings":[{"description":"Standard plans","identifier":"default","metadata":null,"packages":[{"identifier":"$rc_monthly","platform_product_identifier":"pro_monthly"},{"identifier":"$rc_annual","platform_product_identifier":"pro_annual"},{"identifier":"$rc_lifetime","platform_product_identifier":"pro_lifetime"}]}]}
```

### 4. Make a Test Store purchase
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

The same `curl` calls work on Cloud: replace `http://localhost:8787` with `https://api.revenuedot.app`.

### 5. Point an SDK at your server
Use the code from [step 4 above](#4-point-an-sdk-at-revenuedot-cloud) with your server's address as the proxy URL, for example `http://localhost:8787`. On the Android emulator, use `http://10.0.2.2:8787`, because the emulator reaches your computer at `10.0.2.2`. In the purchases-js example, set `VITE_REVENUEDOT_URL=http://localhost:8787`.

To run it for real customers, read [Self-hosting](../guides/self-hosting.md) and [Going to production](../guides/going-to-production.md).

## Next steps
- Receive the purchase on your backend: [Webhooks](../guides/webhooks.md).
- Simulate renewals, cancellations and refunds without waiting: [Test Store](../guides/test-store.md).
- Learn how entitlements, offerings and customers fit together: [Concepts](../concepts/README.md).
- Connect a real store: [App Store](../guides/app-store.md), [Google Play](../guides/google-play.md).
- Move an existing app: [Migrate from RevenueCat](../migrate/README.md).

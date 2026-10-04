---
title: How do I use the Test Store to test purchases without a store account?
description: Add a Test Store app, use its test_ key in the SDK, and buy through the SDK's test dialog. Simulate renewals, cancellations, billing issues and refunds with POST /v2/projects/{id}/test_purchases.
---

# How do I use the Test Store to test purchases without a store account?

The **Test Store** is RevenueDot's built-in store for development. Create a Test Store app, give its `test_` key to the SDK, and purchases go through the SDK's test dialog instead of Apple or Google. They unlock entitlements, record events and send webhooks like real purchases, and they are always **sandbox**. To see a whole lifecycle without waiting, simulate it with `POST /v2/projects/{project_id}/test_purchases`.

## Set it up
```bash
B="$REVENUEDOT_URL/v2/projects/$PROJECT_ID"; H="Authorization: Bearer $SECRET_KEY"
curl -s -X POST "$B/apps" -H "$H" -H "Content-Type: application/json" -d '{"name":"Test Store","type":"test_store"}'
curl -s "$B/apps/$APP_ID/public_api_keys" -H "$H"      # -> "key": "test_..."
curl -s -X POST "$B/products" -H "$H" -H "Content-Type: application/json" \
  -d '{"store_identifier":"pro_monthly","app_id":"'$APP_ID'","type":"subscription","display_name":"Pro monthly","subscription":{"duration":"P1M"}}'
```

Attach the products to your entitlement and offering like any other app's products. The [seed script](https://github.com/revenuedot/examples/blob/main/selfhost/docker-compose/seed.sh) does all of this in one run; see the [Quickstart](../getting-started/quickstart.md).

- **The product's `subscription.duration` is the period.** A `P1M` product expires one month after purchase. Without a duration, one month is used.
- **The price is the product's Test Store price.** Set it in the dashboard (New product and the app page ask for it; Edit product changes it) or with `"test_store_price":{"amount_micros":9990000,"currency":"USD"}` in the create or update call. A product without one shows 0. The price the SDK posts with the purchase is recorded. Use an ISO 4217 code that has an exchange rate to USD (every App Store and Google Play currency does); other codes are refused, because their purchases would count as no revenue.

## Prices in several currencies
A Test Store product can have one price per currency. One of them is the default: it is what `indicative_price` shows and what a customer sees when their currency has no price.

- **Dashboard.** Edit product lists one row per currency. **Add currency** adds a row, the **Default** radio picks the default, and the × button removes a currency. The product page lists every price, the default first.
- **API.** The same endpoints as RevenueCat, with the bodies its CLI sends:

```bash
# Add prices (an existing currency gets the new amount)
curl -s -X POST "$B/products/$PRODUCT_ID/test_store_prices" -H "$H" -H "Content-Type: application/json" \
  -d '{"prices":[{"currency":"EUR","amount_micros":8990000},{"currency":"GBP","amount_micros":7990000}]}'
# List them: a JSON array of {"id","currency","amount_micros"}, the default first
curl -s "$B/products/$PRODUCT_ID/prices" -H "$H"
# Change one
curl -s -X PATCH "$B/products/$PRODUCT_ID/prices/EUR" -H "$H" -H "Content-Type: application/json" -d '{"amount_micros":9490000}'
# Remove one (RevenueDot extension)
curl -s -X DELETE "$B/products/$PRODUCT_ID/prices/GBP" -H "$H"
```

  `test_store_price` on product create and update sets the default price and keeps the other currencies; `null` clears every price. See [List a product's prices](../../api/rest-v2.md#list-a-products-prices).
- **Which price the SDK shows.** The price in the currency purchases-js asks for; else in the currency of the store country the SDK sends (the App Store storefront on iOS, the Play country on Android); else in the currency of the country the customer was last seen in; else the default. A customer in Germany sees the EUR price, a customer in Japan sees the default when there is no JPY price.
- **What a purchase records.** The native SDKs post the price they showed, and it is recorded as sent. purchases-js posts only the currency, so the product's price in that currency is recorded. A [simulated purchase](#simulate-a-lifecycle) without `price` uses the price in `currency` (or in `country_code`'s currency), else the default.

## Buy in the app
Configure the SDK with the `test_` key and your server as the proxy URL, then call `purchase` as usual. The SDK shows its Test Store dialog; choose the successful purchase. The SDK posts `fetch_token = test_<purchase time in ms>_<id>` to `POST /v1/receipts`, and RevenueDot accepts any token of that form.

The Test Store works with purchases-js, React Native (including Expo Go and the web) and the native SDKs. Use `test_` keys only in development builds; ship your store keys (`appl_`, `goog_`) in releases. Servers built before 2026-09-30 sent product details the native iOS SDK could not read ("No base price found for product"); update the server if you see that.

## Test your setup with the sample app
The app page has **Test your setup with the sample app**: pick iOS (SwiftUI), Android (Jetpack Compose), Flutter, React Native (Expo) or web, and you get a zip of that app from [revenuedot/examples](https://github.com/revenuedot/examples) with this app's key, your server's URL and your first entitlement already filled in. Unzip it, follow its README, buy in a debug build, and the purchase shows up under **Customers**. App Store, Google Play and Web Billing apps offer the samples that can buy with their key. The same zip comes from `GET /v2/projects/{project_id}/apps/{app_id}/sample_app?platform=ios`. Only public values go in the zip.

## Buy with curl
```bash
curl -s "$REVENUEDOT_URL/v1/receipts" -H "Authorization: Bearer $TEST_KEY" -H "Content-Type: application/json" \
  -d "{\"app_user_id\":\"user_1\",\"fetch_token\":\"test_$(date +%s)000_demo\",\"product_id\":\"pro_monthly\",\"price\":9.99,\"currency\":\"USD\"}"
```

## Simulate a lifecycle
`POST /v2/projects/{project_id}/test_purchases` runs a whole history through the same pipeline as receipts, with each state applied at the time it would have happened. Events, revenue and webhooks come out as they would for a real subscription.

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/test_purchases" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"app_user_id":"user_renewal","product_id":"pro_monthly","scenario":"renewal","price":9.99}'
```
```json
{"object":"test_purchase","scenario":"renewal","store_transaction_id":"test_1790800923978_290d7238-2657-4c28-b829-520e19bc74ec","event_types":["INITIAL_PURCHASE","RENEWAL"],"customer":{"object":"customer","id":"user_renewal","...":"..."},"subscription":{"object":"subscription","status":"active","...":"..."},"purchase":null}
```

| `scenario` | What happens | Default start | Events (monthly product) |
|---|---|---|---|
| `purchase` | Bought at the start | now | `INITIAL_PURCHASE` |
| `trial` | A 7-day free trial starts | now | `INITIAL_PURCHASE` (trial, price 0) |
| `trial_conversion` | Trial, then paid periods until now | 7 days ago | `INITIAL_PURCHASE`, `RENEWAL` (`is_trial_conversion`) |
| `renewal` | Bought, then renewed every period until now | one period ago | `INITIAL_PURCHASE`, `RENEWAL` |
| `cancel` | Like `renewal`, then auto-renew turned off now | now | `INITIAL_PURCHASE`, `CANCELLATION` |
| `billing_issue` | The charge fails at the last period end; 7 days of grace | one period ago | `INITIAL_PURCHASE`, `BILLING_ISSUE`, `CANCELLATION` |
| `refund` | Like `renewal`, then the latest period is refunded now | now | `INITIAL_PURCHASE`, `CANCELLATION` (refund) |
| `expire` | Auto-renew off from the start; access ends at the period end or now | one period ago | `INITIAL_PURCHASE`, `CANCELLATION`, `EXPIRATION` |

- `offset_days` (0 to 730) moves the start into the past, for example `"offset_days": 95` with `renewal` on a monthly product gives three renewals. Or send `purchased_at` in epoch milliseconds.
- `product_id` is the product's id or store identifier; it must belong to a Test Store app (`app_id` picks one when the project has several).
- One-time products support `purchase` and `refund` only.
- `price`, `currency` (default USD) and `country_code` are recorded like a real purchase. Without `price`, the product's price in `currency` (or in `country_code`'s currency) is used, else its default price.

## Related
- [Sandbox and production](../concepts/sandbox.md)
- [Test with App Store sandbox and Google Play testers](sandbox-testing.md)
- [Webhooks](webhooks.md)
- [Extensions: Test Store](../../api/extensions.md)

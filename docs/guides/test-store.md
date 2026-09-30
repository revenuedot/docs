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
- **Prices are 0.** RevenueDot does not store Test Store prices yet, so the SDK shows free products. The price the SDK posts with the purchase is recorded.

## Buy in the app
Configure the SDK with the `test_` key and your server as the proxy URL, then call `purchase` as usual. The SDK shows its Test Store dialog; choose the successful purchase. The SDK posts `fetch_token = test_<purchase time in ms>_<id>` to `POST /v1/receipts`, and RevenueDot accepts any token of that form.

The Test Store works with purchases-js, React Native (including Expo Go and the web) and the native SDKs. Use `test_` keys only in development builds; ship your store keys (`appl_`, `goog_`) in releases. Servers built before 2026-09-30 sent product details the native iOS SDK could not read ("No base price found for product"); update the server if you see that.

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
- `price`, `currency` (default USD) and `country_code` are recorded like a real purchase.

## Related
- [Sandbox and production](../concepts/sandbox.md)
- [Test with App Store sandbox and Google Play testers](sandbox-testing.md)
- [Webhooks](webhooks.md)
- [Extensions: Test Store](../../api/extensions.md)

---
title: How do I restore purchases?
description: Call restorePurchases from a Restore button, or syncPurchases silently. The project's transfer behaviour decides who owns a purchase another user already has.
---

# How do I restore purchases?

Call the SDK's `restorePurchases()` from a **Restore purchases** button, the same code you use with RevenueCat. The SDK posts the device's store receipts to `POST /v1/receipts`, and RevenueDot answers with the updated customer info. If the purchase already belongs to another user, the project's **transfer behaviour** decides what happens: by default the purchase moves to the user who restored it, and RevenueDot sends a `TRANSFER` webhook.

## Restore or sync
| Call | When to use it | What the user sees |
|---|---|---|
| `restorePurchases()` | The user taps **Restore purchases** | On iOS, it may ask the user to sign in to their Apple account |
| `syncPurchases()` | Silently, for example once after a migration, so RevenueDot learns about purchases it has not seen | Nothing |

```swift
// iOS
let customerInfo = try await Purchases.shared.restorePurchases()
```

```kotlin
// Android
Purchases.sharedInstance.restorePurchasesWith(
  onError = { error -> /* show error.message */ },
  onSuccess = { customerInfo -> /* check customerInfo.entitlements */ },
)
```

```ts
// React Native
const customerInfo = await Purchases.restorePurchases();
```

RevenueCat recommends calling restore only from a button, not on every launch ([RevenueCat docs](https://www.revenuecat.com/docs/getting-started/restoring-purchases)). The same advice applies here.

## Who owns a restored purchase
RevenueDot follows the project setting `transfer_behavior`. The four values match RevenueCat's options ([RevenueCat docs](https://www.revenuecat.com/docs/projects/restore-behavior)).

| `transfer_behavior` | When another known user already owns the purchase |
|---|---|
| `transfer` (default) | The purchase moves to the user who restored it. RevenueDot sends a `TRANSFER` event |
| `transfer_if_no_active` | The purchase moves only if the current owner has no active subscription. Otherwise the restore fails with 7102 |
| `keep` | The purchase stays with its owner. The restore fails with HTTP 400, code 7102, "The receipt is already in use by another subscriber." |
| `share` | The two users are merged into one customer, so both IDs share the purchase |

Two cases never depend on the setting:
- If the current owner is **anonymous** (`$RCAnonymousID:...`), it is always merged into the user who restored.
- If the user restoring is **anonymous** and the owner is a known user, the anonymous ID is merged into the owner.

Change the setting on the dashboard's project settings, or with the API:

```bash
curl -s -X POST https://revenuedot.example.com/v2/projects/$PROJECT_ID \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"transfer_behavior":"transfer_if_no_active","sandbox_transfer_behavior":"transfer"}'
```

`sandbox_transfer_behavior` applies to sandbox purchases. Leave it `null` to use `transfer_behavior` for both. More background is in [Who owns a restored purchase](../concepts/customers-and-app-user-ids.md#who-owns-a-restored-purchase).

## The TRANSFER webhook
When a subscription moves, your webhook receives an event like this one, captured from a local run:

```json
{
  "api_version": "1.0",
  "event": {
    "id": "90CB2D5B-DDD2-4F25-9430-4E5290CC493A",
    "type": "TRANSFER",
    "store": "TEST_STORE",
    "app_id": "appvnrm0a5h",
    "environment": "SANDBOX",
    "transferred_from": ["alice"],
    "transferred_to": ["bob"],
    "event_timestamp_ms": 1790800924235,
    "subscriber_attributes": {}
  }
}
```

Use it to move access in your own database from the `transferred_from` IDs to the `transferred_to` IDs.

## If the restore fails with 7102
1. The project uses `keep`, or `transfer_if_no_active` while the owner still has an active subscription.
2. Tell the user the purchase belongs to another account, and ask them to sign in with that account.
3. If the rule is too strict for your app, switch to `transfer`.

## If the restore finds nothing
1. Check that the user is signed in to the same Apple or Google account that bought.
2. Check that the purchase is for this app's bundle ID or package name.
3. Check the server log for a 5xx on `/v1/receipts`. See [Why does RevenueDot answer 4xx or 5xx to a receipt?](receipt-errors-4xx-vs-5xx.md)

## Related
- [Customers and app user IDs](../concepts/customers-and-app-user-ids.md)
- [Why is my entitlement not active?](entitlement-not-active.md)
- [Webhook events](../../api/webhook-events.md)

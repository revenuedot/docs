---
title: How do products and entitlements work?
description: A product is one item on one store. An entitlement is the access your app checks, such as pro. Attach every product that should unlock it; the app then checks the entitlement, never a product id.
---

# How do products and entitlements work?

A **product** is one thing a store sells, such as `pro_monthly` on the App Store. An **entitlement** is the access your app checks, such as `pro`. You attach products to an entitlement, and any purchase of any attached product unlocks it. Your app checks `customerInfo.entitlements["pro"]`, so adding a yearly plan or a Google Play product later needs no app update.

```text
Entitlement "pro"
├── pro_monthly        App Store app      subscription P1M
├── pro_annual         App Store app      subscription P1Y
├── pro:monthly        Google Play app    subscription (base plan "monthly")
└── pro_lifetime       Test Store app     non_consumable
```

## Products
A product belongs to one app. Already set up in App Store Connect, Google Play or Stripe? **Import products** brings them over with their type, duration and name ([Import products](../guides/import-products.md)). Otherwise create each one in the dashboard (**Products**) or with the API:

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/products" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"store_identifier":"pro_monthly","app_id":"'$APP_ID'","type":"subscription","display_name":"Pro monthly","subscription":{"duration":"P1M"}}'
```

| Field | What to put there |
|---|---|
| `store_identifier` | The store's product id, exactly as in App Store Connect or Play Console. For Google Play subscriptions use `subscriptionId:basePlanId`, for example `pro:monthly`. A plain `pro` also matches every base plan of that subscription |
| `type` | `subscription`, `non_consumable` (a lifetime unlock), `consumable` (coins, credits), `non_renewing_subscription` or `one_time` |
| `subscription.duration` | ISO 8601 period: `P1W`, `P1M`, `P3M`, `P6M`, `P1Y`, or any other such as `P3D`. The Test Store uses it as the period length, and MRR uses it for every store |
| `display_name` | Your own label for the dashboard |

- **Store ids must match.** RevenueDot matches purchases to products by `store_identifier`. A purchase of an unknown product is still saved and still appears in customer info, but it unlocks nothing.
- **Consumables never unlock an entitlement.** The Android SDK consumes them when RevenueDot answers `should_consume: true`, so they can be bought again.
- **Archive instead of delete** when a product is retired: `POST .../products/{product_id}/actions/archive`. Archived products leave offerings. Deleting a product detaches it from entitlements and packages; purchase history keeps the store id.

## Entitlements
```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/entitlements" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"lookup_key":"pro","display_name":"Pro access"}'
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/entitlements/$ENTITLEMENT_ID/actions/attach_products" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"product_ids":["'$MONTHLY_ID'","'$ANNUAL_ID'"]}'
```

The `lookup_key` is the name apps see. The entitlement's `id` (`entl...`) is what REST API v2 uses, for example in `grant_entitlement`.

## How RevenueDot decides whether an entitlement is active
RevenueDot computes entitlements from every purchase the customer owns. The rules come from `packages/core/src/entitlements.ts`:

1. **Each attached purchase is a candidate.** Subscriptions, non-consumable one-time purchases and promotional grants count. Consumables do not.
2. **Access ends at the right time.** For a subscription, access ends at the refund time if it was refunded, else at the end of the grace period if the store granted one, else at the store's expiry. A lifetime purchase never ends unless it is refunded.
3. **The best candidate wins.** A lifetime unlock beats everything. Otherwise the purchase whose access ends last wins.
4. **Expired entitlements stay listed.** Customer info lists every entitlement a customer ever had, with its `expires_date`. The SDK's `isActive` compares that date with the server time, so an entitlement with a past `expires_date` is inactive.

```json
"entitlements": {
  "pro": { "expires_date": "2026-10-30T20:41:54Z", "grace_period_expires_date": null, "product_identifier": "pro_monthly", "purchase_date": "2026-09-30T20:41:54Z" }
}
```

## Give access without a purchase
Grant promotional access to a customer, for example for support or a partnership. It appears as a subscription from the `promotional` store and unlocks the entitlement until it ends.

```bash
# REST API v2: until a date (epoch milliseconds)
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/customers/user_42/actions/grant_entitlement" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"entitlement_id":"'$ENTITLEMENT_ID'","expires_at":1830000000000}'
# REST API v1: by lookup key, for a fixed duration
curl -s -X POST "$REVENUEDOT_URL/v1/subscribers/user_42/entitlements/pro/promotional" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" -d '{"duration":"monthly"}'
```

A grant that ends within 2 hours of an existing grant for the same entitlement is treated as a duplicate and changes nothing. Revoke grants with `revoke_granted_entitlement` (v2) or `revoke_promotionals` (v1).

## Related
- [Offerings and packages](offerings-and-packages.md)
- [Why is my entitlement not active?](../help/entitlement-not-active.md)
- [REST API v2: products and entitlements](../../api/rest-v2.md)

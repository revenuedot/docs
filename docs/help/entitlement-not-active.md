---
title: Why is my entitlement not active?
description: Usually the product is not attached to the entitlement, the purchase belongs to another app user ID, the receipt post failed, or the access has ended. Here is how to tell which.
---

# Why is my entitlement not active?

An entitlement is active only when the customer has an unexpired purchase of a product that is **attached to that entitlement**. Most of the time one of four things is wrong: the product is not attached, the purchase landed on a different app user ID, the receipt post failed, or the access has ended. Check them in that order.

## Check what the server sees
Ask for the customer the way the SDK does:

```bash
curl -s -H "Authorization: Bearer $PUBLIC_KEY" \
  https://revenuedot.example.com/v1/subscribers/user_1
```

Read two parts of the answer:
- `subscriber.subscriptions` and `subscriber.non_subscriptions` list what the customer bought.
- `subscriber.entitlements` lists what that gives them.

A purchase with no matching entitlement means the catalog is wrong. No purchase at all means the receipt never arrived or went to another customer. You can see the same on the dashboard's customer page, or with `GET /v2/projects/{project_id}/customers/{customer_id}/active_entitlements` and your secret key.

## Causes and fixes
1. **The product is not attached to the entitlement.** Attach it on the entitlement's dashboard page, or call `POST /v2/projects/{project_id}/entitlements/{entitlement_id}/actions/attach_products` with the product IDs. See [Products and entitlements](../concepts/products-and-entitlements.md).
2. **The product's store identifier does not match the store.** The product's `store_identifier` must equal the App Store product ID or the Google Play product ID exactly. A Google subscription matches either its subscription ID or `<subscription id>:<base plan id>`. Compare it with the `subscriptions` key in the customer info.
3. **Only one store's product is attached.** Products are created per app. If the Android product ID differs from the iOS one, an Android purchase unlocks nothing until you create the Android product and attach it too.
4. **The purchase belongs to another app user ID.** Purchases made before `logIn` sit on the anonymous ID (`$RCAnonymousID:...`) and move to the user on login. A restore can move a purchase away from another user, depending on the project's transfer behaviour. See [Anonymous app user IDs](../concepts/customers-and-app-user-ids.md#anonymous-app-user-ids) and [How do I restore purchases?](restore-purchases.md)
5. **The receipt post failed.** A 5xx leaves the purchase on the device for a retry, so access appears only after the cause is fixed. A 4xx means RevenueDot refused the purchase for good. Check the server log and see [Why does RevenueDot answer 4xx or 5xx to a receipt?](receipt-errors-4xx-vs-5xx.md)
6. **The access has ended.** Check `expires_date` in `subscriptions`. A refund sets `refunded_at` and ends access. A billing problem keeps access only while `grace_period_expires_date` is in the future.
7. **Store notifications are not arriving.** Renewals and cancellations after the first purchase reach RevenueDot through App Store Server Notifications and Google's real-time notifications. Without them, a renewed subscription can look expired. See [Why are store notifications not arriving?](store-notifications-not-arriving.md)
8. **The app still shows old customer info.** The SDK caches customer info. Call `getCustomerInfo` again, or restart the app, after you fix the catalog.
9. **The SDK is not talking to your server.** If the proxy URL is set after `configure`, or not at all, the SDK asks RevenueCat instead. Set the proxy URL first. See the [SDK guides](../sdks/README.md).

## Access without a purchase
To give a customer access by hand, for example after a support ticket, grant a promotional entitlement:

```bash
curl -s -X POST https://revenuedot.example.com/v1/subscribers/user_1/entitlements/pro/promotional \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"duration":"weekly"}'
```

The customer info then shows `pro` with the `PROMOTIONAL` store until it ends. See [REST API v1](../../api/rest-v1.md).

## Related
- [Products and entitlements](../concepts/products-and-entitlements.md)
- [Offerings and packages](../concepts/offerings-and-packages.md)
- [Troubleshooting by symptom](troubleshooting.md)

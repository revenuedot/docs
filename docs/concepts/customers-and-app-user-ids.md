---
title: How do customers, app user IDs and logIn work?
description: A customer is one person with one or more app user IDs. The SDK starts with an anonymous ID; logIn attaches your own ID; the project's transfer behaviour decides who owns a restored purchase.
---

# How do customers, app user IDs and logIn work?

A **customer** is one person. They can have several **app user IDs**: the anonymous ID the SDK made on first launch and the ID you pass to `logIn`. Purchases belong to the customer, so they follow the person across IDs. When a purchase that already belongs to someone else is restored, the project's **transfer behaviour** decides who gets it.

## Anonymous app user IDs
Without an ID, the SDK generates one like `$RCAnonymousID:4f2c9a...` and stores it on the device. RevenueDot creates the customer the first time the SDK asks for customer info (`GET /v1/subscribers/{id}` answers 201 for a new customer).

- Anonymous IDs are fine for apps without accounts. Restores then move purchases to the device's current anonymous ID.
- An anonymous ID is lost when the app is deleted, so give users an account if they buy on several devices.

## logIn: attach your own ID
`Purchases.logIn("user_42")` calls `POST /v1/subscribers/identify` with the current and the new ID. What happens depends on who already exists (`apps/server/src/repo/customers.ts`):

| Current ID | `user_42` already exists? | Result | Status |
|---|---|---|---|
| Anonymous, with no other IDs | No | The anonymous customer takes `user_42` as a second ID and keeps its purchases | 201 |
| Anonymous, with no other IDs | Yes | The anonymous customer is merged into `user_42`, unless `user_42` already has an anonymous ID of its own | 200 |
| A known ID (not anonymous) | No | A new, empty customer `user_42` | 201 |
| A known ID | Yes | Switches to `user_42`; nothing is merged | 200 |

`logOut` makes the SDK generate a new anonymous ID. `GET /v2/projects/{project_id}/customers/{customer_id}/aliases` lists every ID of a customer, and any of them works as `customer_id` in REST API v2.

## Who owns a restored purchase
A store purchase has one owner. When a different customer posts the same receipt (a restore or `syncPurchases()` on a second account, or after reinstalling), RevenueDot applies these rules in order (`apps/server/src/services/purchases.ts`):

1. **The owner is anonymous only:** the old anonymous customer is merged into the one posting the receipt. No setting changes this.
2. **The poster is anonymous only and the owner has a real ID:** the poster's anonymous ID is merged into the owner, like logging in as them.
3. **Otherwise** the project's `transfer_behavior` decides:

| `transfer_behavior` | What happens | Event |
|---|---|---|
| `transfer` (default) | The purchase moves to the customer who restored it | `TRANSFER` |
| `transfer_if_no_active` | It moves only if the current owner has no active subscription; otherwise the receipt post fails with 7102 "receipt already in use" | `TRANSFER` when it moves |
| `keep` | It stays with the first owner; the receipt post fails with 7102 | none |
| `share` | The two customers are merged, so both IDs have access | none |

Set it in the dashboard (**Project settings**) or with the API. `sandbox_transfer_behavior` overrides it for sandbox purchases; `null` uses the main setting.

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"transfer_behavior":"transfer_if_no_active","sandbox_transfer_behavior":"transfer"}'
```

Store notifications never move a purchase: only a receipt posted from a device does. A `TRANSFER` webhook carries `transferred_from` and `transferred_to`, the ID lists of both customers.

## Attributes
Customers carry key-value **attributes**. The SDK sets them with `setEmail`, `setDisplayName`, `setAttributes` and similar calls (`POST /v1/subscribers/{app_user_id}/attributes`). Keys that start with `$` are reserved names such as `$email`; RevenueDot refuses an invalid `$email` with code 7263 and saves the others. Attributes appear in webhooks as `subscriber_attributes` and in REST API v2 under `/attributes`. A null value deletes an attribute.

## Related
- [How do I restore purchases?](../help/restore-purchases.md)
- [Subscriptions and events](subscriptions-and-events.md)
- [SDK endpoints: identity](../../api/sdk-endpoints.md)

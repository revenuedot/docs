---
title: How do I give discounts at web checkout?
description: Web discounts use RevenueCat's v2 discount fields and operations. Each discount is a Stripe coupon and each code a Stripe promotion code in your own account. Checkout checks that it is enabled, not expired, under its cap, for the plan, and that the buyer is eligible.
---

# How do I give discounts at web checkout?

Create a **web discount**. It takes a percentage or a fixed amount off the first payment, every payment for some months, or every payment. Buyers use it in two ways: they type a **code** on a [purchase link](purchase-links.md) or a [funnel](funnels.md), or the page applies it **automatically**. RevenueDot creates each discount as a **Stripe coupon** and each code as a **Stripe promotion code** in your own Stripe account, so the discount shows on Stripe Checkout, the invoices and the receipts.

In the dashboard: **Product catalog → Web discounts → Create discount**. With the API, use RevenueCat's v2 discount operations, which RevenueDot implements with the same fields and answers.

## Discount fields
| Field | Values | Stripe coupon |
|---|---|---|
| `identifier` | Your id, unique in the project. Letters, digits, `_ . -` | `metadata.revenuedot_identifier` |
| `customer_facing_name` | What buyers see, such as "Spring sale" | `name` (first 40 characters) |
| `type` | `percentage` or `fixed_amount` | |
| `percentage` | 1 to 100, for `percentage` | `percent_off` |
| `fixed_amounts` | Amount off per currency, for `fixed_amount`: `{"USD":{"currency":"USD","amount":5}}` | `amount_off` and `currency` for USD (or else the first currency in alphabetical order), `currency_options` for the others |
| `duration_mode` | `one_time`, `time_window` or `forever` | `duration`: `once`, `repeating`, `forever` |
| `time_window` | For `time_window`: whole months or years, `P1M` to `P3Y` | `duration_in_months` |
| `eligibility` | `everyone`, `never_purchased`, `never_subscribed`, `never_subscribed_to_the_same_product` | Checked by RevenueDot |
| `product_identifiers` | The plans it applies to: a web product's store identifier (its Stripe price id) or its RevenueDot product id (`prod…`). Empty: every plan | `applies_to.products` |
| `max_redemptions` | RevenueDot addition. Paid checkouts it may be used in, across all codes | `max_redemptions` |
| `expires_at` | RevenueDot addition. The last moment it works, in epoch milliseconds | `redeem_by` (and `expires_at` on each promotion code) |

These are the field names of [RevenueCat's v2 discount operations](https://www.revenuecat.com/docs/api-v2), so existing scripts keep working. RevenueCat's `Discount` answer has no room for `max_redemptions` and `expires_at`, so read them back with the extension `GET /v2/projects/{project_id}/web_discounts`.

A fixed amount only applies to payments in the currencies it lists. A plan in another currency refuses it. Stripe repeats a coupon by whole months, so `time_window` accepts months and years only, up to 36 months.

## Create a discount and its codes
```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/discounts" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"identifier":"spring20","customer_facing_name":"Spring sale","type":"percentage","percentage":20,"duration_mode":"time_window","time_window":"P3M","eligibility":"everyone","max_redemptions":100}'
```
```json
{"object":"discount","id":"disc5k2m9q4x7a1b3c","identifier":"spring20","customer_facing_name":"Spring sale","duration_mode":"time_window","eligibility":"everyone","time_window":"P3M","disabled_at":null,"type":"percentage","percentage":20,"created_at":1790800901115,"updated_at":1790800901115}
```

RevenueDot creates the coupon in every Stripe app of the project that has a key. Then add codes. Each becomes a Stripe promotion code:

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/discounts/disc5k2m9q4x7a1b3c/discount_codes" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"codes":["SPRING20","friends"]}'
```
```json
[{"object":"discount_code","code":"SPRING20","created_at":1790800901115},{"object":"discount_code","code":"friends","created_at":1790800901115}]
```

Codes use letters, digits, `_` and `-`. They are unique in the project and buyers can type them in any case: `spring20` works for `SPRING20`, and `spring20` cannot be added as a second code (409).

A fixed amount in two currencies:

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/discounts" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"identifier":"five_off","customer_facing_name":"$5 off","type":"fixed_amount","fixed_amounts":{"USD":{"currency":"USD","amount":5},"EUR":{"currency":"EUR","amount":4.5}},"duration_mode":"one_time","eligibility":"never_purchased"}'
```

## Apply it without a code
Set the discount as a purchase link's `discount_id`, or a funnel paywall step's `discount_id`. Every checkout from that page then gets the coupon. A buyer who types a code gets the code's discount instead.

## What checkout checks
When a buyer types a code, the page checks it at once and shows the answer. Checkout checks again before it creates the Stripe Checkout Session:

| Check | The buyer sees |
|---|---|
| The code exists in the project | "This code is not valid." |
| The discount is enabled | "This code is no longer active." |
| `expires_at` has not passed | "This code has expired." |
| Paid checkouts plus open checkouts are fewer than `max_redemptions` | "This code has been used the maximum number of times." |
| The plan is in `product_identifiers` (when set) | "This code does not apply to this plan." |
| A fixed amount lists the plan's currency | "This code does not apply to payments in EUR." |
| The buyer is eligible | "This code is for new customers only." |

**Eligibility** uses the purchase history of the buyer's app user id. `never_purchased` refuses anyone with any purchase. `never_subscribed` refuses anyone with a subscription. `never_subscribed_to_the_same_product` refuses anyone who had a subscription to the plan's product. An anonymous buyer (no `?app_user_id=`) has no history, so they are always eligible.

A valid code goes to Stripe as the session's promotion code; an automatic discount as its coupon. A use counts once the checkout is paid. The extension list shows `times_redeemed` per discount and per code.

**A capped discount cannot be overrun.** With `max_redemptions` set, each checkout that starts holds one use, and its Stripe Checkout page expires after 31 minutes. Buyers who start at the same moment cannot all take the last use. An abandoned checkout gives its use back once its page has expired.

## Edit, disable and delete
Send only what changes:

```bash
curl -s -X PATCH "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/discounts/disc5k2m9q4x7a1b3c" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" -d '{"percentage":30}'
```

- **A new coupon replaces the old one.** Stripe coupons cannot change their amount or duration. So a change to `type`, `percentage`, `fixed_amounts`, `duration_mode`, `time_window`, `product_identifiers`, `max_redemptions` or `expires_at` creates a new coupon and new promotion codes for the same codes, and turns the old promotion codes off. The new coupon's Stripe `max_redemptions` is the uses that are left. Subscriptions that already use the old coupon keep it. A new name or eligibility changes nothing in Stripe.
- **Disable** (`POST …/discounts/{id}/actions/disable`) refuses the discount at checkout and turns its promotion codes off. **Enable** (`…/actions/enable`) turns them back on.
- **Delete a code** (`DELETE …/discount_codes/{code}`) turns its promotion code off.
- **Delete the discount** (`DELETE …/discounts/{id}`) turns its promotion codes off and deletes its coupons. Existing subscriptions keep their discount, as in Stripe.

When Stripe cannot be reached, a write answers 422 `store_error` with `retryable: true` and saves nothing, like the other store operations.

## See settings, uses and Stripe ids
```bash
curl -s "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/web_discounts" -H "Authorization: Bearer $SECRET_KEY"
```
```json
{"object":"list","items":[{"object":"web_discount","id":"disc5k2m9q4x7a1b3c","identifier":"spring20","customer_facing_name":"Spring sale","type":"percentage","percentage":20,"duration_mode":"time_window","time_window":"P3M","eligibility":"everyone","disabled_at":null,"label":"20% off for 3 months","product_identifiers":[],"max_redemptions":100,"expires_at":null,"times_redeemed":1,"status":"active","stripe":[{"app_id":"appstrp8k2m9q4","coupon_id":"Zx81kQ2p"}],"codes":[{"code":"SPRING20","times_redeemed":1,"created_at":1790800901115,"stripe_promotion_codes":{"appstrp8k2m9q4":"promo_1QxS0aKc8Hn4AbCd"}}],"created_at":1790800901115,"updated_at":1790800901115}],"next_page":null,"url":"/v2/projects/proj18pzzkao/web_discounts"}
```

`status` is `active`, `disabled`, `expired` or `used_up`. `label` is how checkout describes it.

## All operations
| Operation | Path |
|---|---|
| List, create | `GET`, `POST /v2/projects/{project_id}/discounts` |
| Get, update, delete | `GET`, `PATCH`, `DELETE /v2/projects/{project_id}/discounts/{discount_id}` |
| Enable, disable | `POST …/discounts/{discount_id}/actions/enable`, `…/actions/disable` |
| List codes, create codes | `GET`, `POST …/discounts/{discount_id}/discount_codes` |
| Delete a code | `DELETE …/discounts/{discount_id}/discount_codes/{discount_code}` |
| Settings, uses and Stripe ids (extension) | `GET /v2/projects/{project_id}/web_discounts` |

Keys need `project_configuration:discounts:read` or `:read_write`. Reference: [REST API v2: Discounts](../../api/rest-v2.md#discounts).

Web discounts apply to RevenueDot's web checkout only. App Store and Google Play offers are set up in those stores: see [Win-back offers](win-back-offers.md) for Apple's.

## Related
- [Sell on the web with Stripe](web-billing.md)
- [Purchase links](purchase-links.md) and [Funnels](funnels.md)

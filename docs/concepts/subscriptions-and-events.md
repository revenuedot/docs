---
title: How does RevenueDot track a subscription's lifecycle and which events does it send?
description: RevenueDot keeps one record per subscription, updates it from receipts and store notifications, compares the old and new state, and records RevenueCat-style events such as RENEWAL and EXPIRATION.
---

# How does RevenueDot track a subscription's lifecycle and which events does it send?

RevenueDot keeps one record per subscription and updates it whenever the device posts a receipt or the store sends a notification. After each update it compares the old state with the new one, and every difference becomes an **event** with RevenueCat's name, such as `RENEWAL` or `CANCELLATION`. Events are stored, shown in the dashboard and sent to your webhooks.

```text
 receipt (device) ─┐                      ┌─▶ customer info (entitlements)
                   ├─▶ subscription state ─┤
 store notification┘      old vs new       └─▶ events ─▶ webhooks, event log
                                ▲
            a job every 30 seconds records EXPIRATION when access runs out
```

## One record per subscription
A subscription is keyed by the store's own id, so every renewal updates the same record:
- **App Store:** the `original_transaction_id`.
- **Google Play:** the purchase token.
- **Test Store:** the `test_<ms>_<id>` token.

The record holds the product, the current period, the expiry, the grace period end, whether auto-renew is off (`unsubscribe_detected_at`), billing problems (`billing_issues_detected_at`), refunds, pauses, family sharing and the price.

## Which change produces which event
The rules live in `packages/core/src/events.ts`.

| What changed | Event |
|---|---|
| A subscription is seen for the first time (including a free trial) | `INITIAL_PURCHASE` |
| A new period started: a renewal, a trial converting, a lapsed customer coming back, a recovered billing problem | `RENEWAL` (`is_trial_conversion: true` after a trial) |
| Auto-renew was turned off | `CANCELLATION` with `cancel_reason` `UNSUBSCRIBE`, `BILLING_ERROR`, `PRICE_INCREASE`, `DEVELOPER_INITIATED` or `UNKNOWN` |
| Auto-renew was turned back on | `UNCANCELLATION` |
| The store refunded it | `CANCELLATION` with `cancel_reason: CUSTOMER_SUPPORT` and a negative price |
| A refund was reversed | `REFUND_REVERSED` |
| A renewal charge failed | `BILLING_ISSUE` (with `grace_period_expiration_at_ms`) |
| The product changed now (upgrade), or a change is scheduled for the next renewal (downgrade, crossgrade) | `PRODUCT_CHANGE` (with `new_product_id`) |
| The period got longer without a payment (App Store extension, Google Play deferral) | `SUBSCRIPTION_EXTENDED` |
| A Google Play pause was scheduled | `SUBSCRIPTION_PAUSED` (with `auto_resume_at_ms`) |
| The store asks for, or gets, consent to a price increase | `PRICE_INCREASE_CONSENT_REQUIRED`, `PRICE_INCREASE_CONSENT_APPROVED` |
| Access ended (including the grace period) | `EXPIRATION` with `expiration_reason` |
| A one-time purchase | `NON_RENEWING_PURCHASE` |
| A purchase moved to another customer on restore | `TRANSFER` |

`EXPIRATION` comes from a background job, not from the store: every 30 seconds (every minute on RevenueDot Cloud) the server records `EXPIRATION` for subscriptions whose access has ended and that were not refunded. The same job sends due webhooks and, once a day per Google Play app, checks Google's voided purchases for refunds.

Every event's payload is on [Webhook events](../../api/webhook-events.md).

## States in REST API v2
REST API v2 reports each subscription's `status`, computed from the record (`apps/server/src/routes/v2/shapes.ts`):

| `status` | Meaning | `gives_access` |
|---|---|---|
| `trialing` | In a free trial | yes |
| `active` | Paid and current | yes |
| `in_grace_period` | The period ended, the charge failed, and the store grants a grace period | yes |
| `in_billing_retry` | Access ended while the store still retries the charge | no |
| `paused` | A Google Play subscription is paused | no |
| `expired` | Access ended | no |

`auto_renewal_status` is `will_renew`, `will_not_renew`, `will_change_product` or `will_pause`.

## Where changes come from
- **Receipts from the device** (`POST /v1/receipts`): every purchase, restore and `syncPurchases()`. With the App Store in-app purchase key, RevenueDot asks Apple's App Store Server API for the full history and renewal state. For Google Play it reads the purchase from the Play Developer API and acknowledges it within Google's 3-day limit.
- **App Store Server Notifications v2:** `SUBSCRIBED`, `DID_RENEW`, `DID_FAIL_TO_RENEW`, `GRACE_PERIOD_EXPIRED`, `DID_CHANGE_RENEWAL_STATUS`, `DID_CHANGE_RENEWAL_PREF`, `EXPIRED`, `REFUND`, `REFUND_REVERSED`, `REVOKE`, `RENEWAL_EXTENDED`, `OFFER_REDEEMED`, `ONE_TIME_CHARGE` and `PRICE_INCREASE` update the record. Other types are stored and acknowledged. See [App Store setup](../guides/app-store.md).
- **Google Play real-time developer notifications:** each subscription or one-time product notification makes RevenueDot read the purchase again from the Play Developer API; voided-purchase notifications record refunds. See [Google Play setup](../guides/google-play.md).
- **REST API actions:** grants, refunds, cancels, extensions and deferrals.

Store notifications about a purchase RevenueDot has never seen are stored but not applied, unless the app's **Track new purchases from server-to-server notifications** setting is on. The purchase appears when the device posts its receipt.

## Money in events
`price` (USD) and `price_in_purchased_currency` carry money only on `INITIAL_PURCHASE`, `RENEWAL`, `NON_RENEWING_PURCHASE`, `REFUND_REVERSED` and refunds (negative). Other events report 0. A free trial start reports 0. `price` is converted to USD at the exchange rate of the purchase date: the ECB reference rate for the about 30 currencies the ECB publishes (the last business day before it on weekends and holidays), and the [currency-api](https://github.com/fawazahmed0/exchange-api) daily rate for every other currency.

## Related
- [Webhooks](../guides/webhooks.md)
- [Customers and app user IDs](customers-and-app-user-ids.md)
- [Test Store](../guides/test-store.md): produce each event on purpose

---
title: How do I track Stripe subscriptions from my own Stripe account in RevenueDot?
description: Create a Stripe app, save a restricted API key and a webhook signing secret from your own Stripe account, post each new subscription or Checkout Session to /v1/receipts, and let Stripe's webhooks keep it current.
---

# How do I track Stripe subscriptions from my own Stripe account in RevenueDot?

Four steps: create a Stripe app in RevenueDot, save a **restricted API key** from your Stripe account, add a **webhook endpoint** in Stripe and save its signing secret, then have your backend **post each purchase** to `POST /v1/receipts`. Customers who pay on your website then get the same entitlements in your apps when they use the same app user ID. RevenueDot only reads from Stripe: it never charges, refunds or changes anything there.

## 1. Create the app
```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Scanner (Web)","type":"stripe"}'
```

The app's public key starts with `strp_`. Create its products with `store_identifier` set to the **Stripe product ID** (`prod_…`). To sell several prices of one Stripe product as separate products, use the **price ID** (`price_…`) instead; a price ID wins over its product ID. See [Products and entitlements](../concepts/products-and-entitlements.md).

## 2. Save a restricted API key
1. In the [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/apikeys/create), click **Create restricted key**.
2. Give it **Read** access to Subscriptions, Invoices, Checkout Sessions, Charges, Customers, Products and Prices. Leave everything else at None.
3. In the dashboard, open the app → **Stripe API key**, paste it and click **Check credentials**. RevenueDot lists one subscription and one Checkout Session: a wrong key says so, and a key without a permission names the one it lacks.

With the API:

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps/$APP_ID" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"stripe":{"stripe_secret_key":"rk_live_…"}}'
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps/$APP_ID/actions/verify_credentials" -H "Authorization: Bearer $SECRET_KEY"
```

A publishable key (`pk_…`) is refused. Using a Stripe Connect platform key for one connected account? Also save `stripe_account_id` (`acct_…`); RevenueDot sends it as `Stripe-Account`.

**Test mode.** The key decides the environment: a test-mode key (`rk_test_…`) or a [Stripe sandbox](https://docs.stripe.com/sandboxes) records sandbox data, kept out of production numbers. Use one Stripe app per Stripe account, mode or sandbox, as [RevenueCat recommends](https://www.revenuecat.com/docs/web/integrations/stripe) too.

## 3. Add the webhook endpoint
1. Copy the app's webhook URL, `https://revenuedot.example.com/v1/notifications/stripe/{app_id}`, from the dashboard or from `store_settings` (`notification_url`).
2. In the [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks/create), add an endpoint with that URL and these events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `invoice.payment_failed`, `invoice.updated`, `charge.refunded`, `checkout.session.completed`. Other events are accepted and ignored.
3. Reveal the endpoint's **Signing secret** (`whsec_…`) and paste it on the app page, or save it as `stripe_webhook_secret`.

Every event must carry a valid `Stripe-Signature`: RevenueDot computes the HMAC-SHA256 of `"<t>.<body>"` with the signing secret, the way [Stripe documents it](https://docs.stripe.com/webhooks#verify-manually), and refuses a timestamp more than 5 minutes off. A missing secret or a bad signature answers 400. Each event is stored once (by event ID), copied to `notification_forward_url` when set, and applied by reading the subscription from Stripe again, so events arriving out of order cannot roll a subscription back. Temporary failures answer 500, and Stripe retries.

## 4. Post each purchase from your backend
After Stripe confirms a purchase (`customer.subscription.created` or `checkout.session.completed`), post its subscription ID or Checkout Session ID with the customer's app user ID:

```bash
curl -X POST "$REVENUEDOT_URL/v1/receipts" \
  -H "Authorization: Bearer strp_…" -H "X-Platform: stripe" -H "Content-Type: application/json" \
  -d '{"app_user_id":"user_123","fetch_token":"sub_1Abc…"}'
```

- A **subscription ID** (`sub_…`) records the subscription.
- A **Checkout Session ID** (`cs_…`) records the session's subscription, or, for a payment-mode session, each line item as a one-time purchase (consumable or not, by your catalog). One-time purchases need a Checkout Session.
- The answer is the customer's [customer info](../concepts/customers-and-app-user-ids.md). Posting the same ID again changes nothing.
- **400** (code 7103) means it can never succeed: an unknown ID, an expired session, a subscription whose first payment never completed. **5xx** (code 7101) means try again later: Stripe was unavailable, the key was rejected, or the first invoice is not paid yet.

### When a subscription counts
By default a subscription counts once its latest invoice is **paid**. Set `register_on` to `invoice_created` (on the app page: "When the invoice is created") to grant access while the first invoice is still open, as RevenueCat's ["Subscription purchase recognition"](https://www.revenuecat.com/docs/web/integrations/stripe/track-external-purchases) setting does.

### Purchases you never posted
Turn on **Track new purchases from server-to-server notifications** to record subscriptions and Checkout purchases that RevenueDot first hears about from a webhook. The customer is found by `app_user_id_source`:
- `metadata` (default): the metadata key `app_user_id_metadata_key` (default `app_user_id`) on the Checkout Session or the subscription. Set it in both when a session creates a subscription.
- `customer_id`: the Stripe customer ID becomes the app user ID.
- `anonymous`: an anonymous ID.

## How Stripe states map to events
| What Stripe reports | Event |
|---|---|
| An active subscription with a paid invoice | `INITIAL_PURCHASE` (`TRIAL` while `trialing`, at price 0) |
| A new paid invoice for the next period | `RENEWAL` (with `is_trial_conversion` after a trial) |
| `cancel_at_period_end` or a future `cancel_at`; undone | `CANCELLATION` (`UNSUBSCRIBE`); `UNCANCELLATION` |
| `past_due`: the renewal invoice failed | `BILLING_ISSUE`, `CANCELLATION` (`BILLING_ERROR`); access to the end of the paid period, grace until Stripe's next payment attempt |
| Paid after `past_due` | `RENEWAL` |
| `unpaid`, or retries run out | `EXPIRATION` (`BILLING_ERROR`) |
| `canceled` (`customer.subscription.deleted`) | `CANCELLATION` if not seen before, then `EXPIRATION` at `ended_at` |
| `pause_collection` with `resumes_at` | `SUBSCRIPTION_PAUSED` |
| Another price or product on the subscription | `PRODUCT_CHANGE`; a proration invoice in the middle of a period is not a renewal and adds no revenue |
| `charge.refunded` in full for the latest period | `CANCELLATION` (`CUSTOMER_SUPPORT`), a negative transaction, and access ends at the refund. A later paid period is a `RENEWAL` |
| A payment-mode Checkout Session | `NON_RENEWING_PURCHASE`; a full refund is `CANCELLATION` (`CUSTOMER_SUPPORT`) |

Webhooks report `store: STRIPE` with no store commission. Revenue is what each invoice charged (`amount_paid`), so coupons show in revenue; it is converted to USD at the period start's rate. Zero-decimal currencies such as JPY are not divided by 100.

Both Stripe API shapes work: before 2025-03-31 (period fields on the subscription, `invoice.subscription`) and after (period fields on the subscription item, `invoice.parent.subscription_details`).

## Not supported yet
- "Connect with Stripe" (OAuth) instead of a restricted key, and hosted checkout: these need RevenueDot's own Stripe platform and come later.
- Subscription schedules, metered and tiered prices, and subscriptions with several items.
- A scheduled re-check without webhooks: without the webhook endpoint, a cancellation shows only when your backend posts the subscription again.

## Related
- [Webhooks out of RevenueDot](webhooks.md)
- [Sandbox and production](../concepts/sandbox.md)
- [SDK endpoints: POST /v1/receipts](../../api/sdk-endpoints.md)
- [REST API v2](../../api/rest-v2.md)

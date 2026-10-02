---
title: How do I connect my Stripe account without a restricted key?
description: Connect with Stripe links your own Stripe account to RevenueDot through Stripe Connect in two clicks. Payments go to your account, RevenueDot takes no fee, and events arrive without a webhook to set up.
---

# How do I connect my Stripe account without a restricted key?

Select **Connect with Stripe** on your Stripe app and allow RevenueDot in Stripe. RevenueDot then reads your purchases and creates checkouts in your Stripe account through Stripe Connect. You copy no keys and set up no webhook.

## What it means for your money
- Your Stripe account stays yours. It is a Standard connected account: you keep your Stripe Dashboard, your payouts and your Stripe fees.
- Web checkouts are charged on your account directly.
- **RevenueDot takes no fee** on these payments.

## Connect
1. Open your Stripe app (**Apps**, or **Web > Add web provider**) and find **Stripe account**.
2. Pick **Live** or **Test** mode. A test-mode connection records sandbox purchases, so you can try purchase links and funnels with Stripe's test cards.
3. Select **Connect with Stripe**, sign in to Stripe and select **Connect**. Stripe sends you back to RevenueDot.

No Stripe account yet? Select **Create one through RevenueDot**: Stripe walks you through creating one, and you come back connected. Until Stripe's onboarding is finished, the app page says the account cannot take payments yet, with a button to continue in Stripe.

The page then shows **Connected with Stripe Connect** with the account (`acct_…abcd`) and the mode. **Check connection** reads your account to confirm access.

## What works on the connected account
Everything a restricted key does: purchases posted to `/v1/receipts`, [web products](web-billing.md), the hosted checkout, [purchase links](purchase-links.md), [funnels](funnels.md), [web discounts](web-discounts.md), refunds you make in Stripe, and the customer portal link in [payment recovery](payment-recovery.md) emails.

Your account's events (renewals, failed payments, cancellations, refunds) reach RevenueDot through Stripe Connect. If you added a webhook endpoint for this app before connecting, you can delete it in Stripe.

## Disconnect
- In RevenueDot: **Disconnect** on the app page. RevenueDot asks Stripe to remove its access and forgets the account.
- In Stripe: remove RevenueDot under **Settings > Connected accounts / apps**. RevenueDot learns it from Stripe and the app page says **Disconnected in Stripe**.

After a disconnect, purchases already recorded stay. Checkouts stop until you connect again or add a restricted key.

## If the button is greyed out
The server you use has no Stripe Connect platform. On RevenueDot Cloud this is the case until RevenueDot's platform account is live. On a self-hosted server, its operator needs a Stripe Connect platform of their own and these settings:

| Variable | What |
|---|---|
| `REVENUEDOT_STRIPE_CONNECT_CLIENT_ID` | The platform's OAuth client id (`ca_…`) |
| `REVENUEDOT_STRIPE_CONNECT_SECRET_KEY` | The platform's secret key |
| `REVENUEDOT_STRIPE_CONNECT_TEST_SECRET_KEY` | Optional: its test-mode key, to allow test-mode connections |
| `REVENUEDOT_STRIPE_CONNECT_WEBHOOK_SECRET` | The signing secret of its Connect webhook endpoint `https://<your server>/v1/notifications/stripe-connect` (comma-separated for a live and a test endpoint) |

The platform's OAuth redirect URI is `https://<your dashboard>/connect/stripe`. Until then, use a [restricted key](stripe.md): it keeps working exactly as before.

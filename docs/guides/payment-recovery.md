---
title: How do I recover subscribers whose payment failed?
description: Payment recovery emails subscribers whose renewal failed on the App Store, Google Play, Amazon or Stripe a link to fix their payment, on a schedule you set, and counts the revenue that comes back.
---

# How do I recover subscribers whose payment failed?

When a renewal fails, the store keeps retrying the charge for days or weeks, but most customers never notice. Payment recovery emails them from your app's name with one link that opens the right place to fix the payment, and shows how much revenue came back.

## What counts as a failed payment
RevenueDot opens a **case** the moment a subscription gets a billing issue, the same moment it sends the `BILLING_ISSUE` webhook:

| Store | When a case opens |
|---|---|
| App Store | `DID_FAIL_TO_RENEW` (billing retry, with or without a grace period) |
| Google Play | `SUBSCRIPTION_IN_GRACE_PERIOD` or `SUBSCRIPTION_ON_HOLD` (account hold) |
| Stripe | The subscription goes `past_due` or `unpaid` |
| Amazon | The subscription enters its grace period |
| Test Store | The `billing_issue` scenario (sandbox) |

A case is **recovered** when the same subscription renews within the recovery window (30 days by default), and **lost** when the window passes or the purchase is refunded. A billing issue that is already older than the window when RevenueDot first sees it (for example in imported history) opens no case.

## Turn it on
1. Open **Lifecycle > Payment recovery** and select **Turn on**.
2. Check the emails. There are three by default: day 0 (right away), day 3 and day 7 after the payment failed. Each has a subject, heading, body and button label. `{app}` becomes your sender name. You can add up to five emails, remove them, or change their days.
3. Set the sender name (empty: your project's name) and the recovery window (7 to 60 days).
4. Select **Send test** to get one email yourself, then **Save**.

Emails come from your app's name with your Customer Center support address as Reply-To (**Lifecycle > Support > Customer Center**). On RevenueDot Cloud they are sent through Cloudflare Email; on a self-hosted server set `REVENUEDOT_SMTP_URL` and `REVENUEDOT_PUBLIC_URL` (see [Self-hosting](self-hosting.md)).

To try it in sandbox, tick **Also email sandbox subscribers** and fail a Test Store or Stripe test-mode renewal. Production subscribers always get emails while payment recovery is on.

## Who gets an email
- Customers with an email address: the `$email` attribute, or for Stripe purchases the Stripe customer's email.
- Not customers who unsubscribed from your project's emails (payment recovery and [win-back campaigns](win-back-campaigns.md) share one unsubscribe list).
- Only while the subscription still has a billing issue. When the store recovers the payment before an email is due, nothing is sent.
- If you turn recovery on while a case already has several emails due, it gets only the latest one.

RevenueDot sends at most 100 recovery emails a minute and 2,000 per project a day. **Send due emails** on the page sends what is due right away; the server also does this every minute.

## Where the link goes
| Store | The link opens |
|---|---|
| App Store | The customer's Apple ID payment methods page |
| Google Play | The Play Store page of their subscription, where Google shows **Fix payment** |
| Amazon | Amazon's Memberships and Subscriptions page |
| Stripe | A Stripe customer portal page to update the card, made when they click. If the portal is not set up in your Stripe account, the open invoice's payment page |

A Stripe link opens the portal only while the case is open. After the case is lost, the link says it has expired.

For Stripe, set up the customer portal in your Stripe Dashboard (**Settings > Billing > Customer portal**). With a restricted key, give it **Customer portal: write**; with [Connect with Stripe](stripe-connect.md) nothing else is needed.

## Customer Center
While a customer has an open case, their customer info carries `management_url`: the same link. The RevenueCat SDKs' Customer Center opens it from **Manage subscription** for purchases it cannot manage itself, so a web subscriber can fix their card from inside your app.

## Unsubscribe
Every email has an unsubscribe link. Opening it only asks; the button unsubscribes. When your server's public URL is https, the email also has one-click `List-Unsubscribe` headers ([RFC 8058](https://www.rfc-editor.org/rfc/rfc8058)).

## The numbers
The page shows, for 7, 28 or 90 days, production or sandbox:
- **At risk now**: open cases and what their periods are worth.
- **Emails sent** and how many customers opened the link.
- **Recovered**: subscriptions that renewed after at least one email, and the **recovered revenue**. This is the money RevenueDot recovered.
- **Came back on its own**: renewals before any email went out, or with emails off.
- The list of cases, with their status, emails and revenue.

The same numbers are at `GET /v2/projects/{project_id}/payment_recovery/stats`, and the cases at `GET /v2/projects/{project_id}/payment_recovery/cases` ([API](../../api/extensions.md)).

## Webhooks and integrations
Nothing changes: `BILLING_ISSUE`, `RENEWAL` and `EXPIRATION` go to your [webhooks](webhooks.md) and [integrations](integrations.md) as before. If you already email customers from Braze or Customer.io on `BILLING_ISSUE`, leave payment recovery off or turn one of them off, so customers do not get two emails.

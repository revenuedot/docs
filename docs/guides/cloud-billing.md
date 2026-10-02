---
title: How does RevenueDot Cloud billing work?
description: RevenueDot Cloud is free up to $10,000 of tracked revenue a month. Cloud Standard costs 0.5% of the tracked revenue above $10,000, never more than $999 a month. Self-hosting is free and unmetered. See your usage, upgrade and manage your card on the Billing page.
---

# How does RevenueDot Cloud billing work?

Billing is not switched on yet: until it is, every RevenueDot Cloud account is free, no usage emails are sent, and the **Billing** link is not in the account menu. This page describes how it works once it is on.

RevenueDot Cloud measures the **tracked revenue** of the projects you own each calendar month. Up to $10,000 a month is free. Above that, Cloud Standard costs 0.5% of the part above $10,000, and never more than $999 a month. A self-hosted RevenueDot has no billing, no meter and no limits.

## Plans

| Plan | Price | Tracked revenue |
|---|---|---|
| **Cloud Free** | $0 | Up to $10,000 a month |
| **Cloud Standard** | 0.5% of tracked revenue above $10,000 a month, capped at $999 a month. The rate never rises | Up to $1,000,000 a month |
| **Enterprise** | From $50,000 a year | No limit. Write to [hello@revenuedot.app](mailto:hello@revenuedot.app) |

Examples of a month's Cloud Standard bill:

| Tracked revenue in the month | Bill |
|---|---|
| $9,000 | $0 |
| $10,001 | $0.01 |
| $50,000 | $200 |
| $209,800 or more | $999 (the cap) |

Prices are on [revenuedot.app/pricing](https://revenuedot.app/pricing).

## What counts as tracked revenue

The sum, in US dollars at the exchange rate of the purchase date, of the **production** purchases of a month in every project you own:

- Counted: new purchases, renewals and one-time purchases, from every store, in the calendar month they were made (UTC).
- Not counted: sandbox and Test Store purchases, free trials, and anything copied in by a [move](move-projects.md) from another server (that revenue was tracked there).
- Refunds are not subtracted: a refunded purchase was still processed when it was made.

The Billing page updates the numbers about once an hour.

## The Billing page

Open your account menu → **Billing** (`/account/billing`). It shows:

- Your plan and its status, and when a cancelled plan ends.
- **Tracked revenue** this month, in total and per project, against the plan's limit, and the **bill so far**.
- The three plans, with **Upgrade to Standard**, **Manage billing** or **Contact us**.
- **Invoices**, with links to Stripe's invoice page and PDF.

## Upgrade, change your card or cancel

- **Upgrade to Standard** opens Stripe Checkout. Billing starts on the 1st of the next month with no proration, and each invoice charges the month's bill. RevenueDot uses its own Stripe account for this; it never touches the Stripe account you sell with.
- **Manage billing** opens Stripe's Customer Portal: change the card, see invoices, or cancel. A cancelled plan stays active until the end of the period, then returns to Cloud Free.

## Emails and banners

- Cloud Free: an email at 80% and at 100% of $10,000 in a month, once each, with an upgrade link, and a banner on the Billing page while you are above the limit.
- Cloud Standard: an email when the month's bill reaches the $999 cap ("you will not pay more this month"), and at 80% and 100% of $1,000,000.
- **A failed payment** shows a banner on every page with a link to update your card and sends one email per invoice. Stripe retries the payment over the next days. If every retry fails, the account goes back to Cloud Free.

## Your apps never stop

Billing never changes what your apps get. A failed payment, a cancelled plan or a month above the free limit does not block SDK calls, purchases, webhooks, integrations or the REST API. The limits decide which plan fits; they are not switches.

## Self-hosting is free

On a self-hosted RevenueDot the Billing page says billing is only on RevenueDot Cloud, and `/v2/billing` answers 404. There is no metering and nothing is sent anywhere. See [Self-hosting](self-hosting.md), and [Move between self-host and Cloud](move-projects.md) to switch either way.

## API

`GET /v2/billing` returns the plan, this month's usage, the bill so far and the invoices for the signed-in account. `POST /v2/billing/checkout` and `POST /v2/billing/portal` return the Stripe URLs. They take a dashboard session, not an API key. See the [API reference](../../api/extensions.md#cloud-billing).

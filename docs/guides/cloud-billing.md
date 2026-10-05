---
title: How does RevenueDot Cloud billing work?
description: RevenueDot Cloud has two plans. Pro costs $0 until your apps make $10,000 a month, then 0.5% of revenue above $10,000, never more than $999 a month. Enterprise has custom pricing from $50,000 a year. Building and testing are free; going live needs Pro.
---

# How does RevenueDot Cloud billing work?

**Building and testing are free, no card needed. Going live needs Pro, which costs $0 until your apps make $10,000 a month, then 0.5% of revenue above $10,000, never more than $999 a month.** Enterprise has custom pricing from $50,000 a year. After your first live sale you have 14 days to start Pro; after that, live charts, customer data, exports and webhooks pause until you do. Your app keeps working the whole time: purchases are always verified and every purchase unlocks.

For a quick look at the whole product, watch the [2:32 platform demo](https://revenuedot.app/watch/revenuedot-platform-demo). Prices are also on [revenuedot.app/pricing](https://revenuedot.app/pricing).

## The two plans

| Plan | Price | Who it is for |
|---|---|---|
| **Pro** | $0 until your apps make $10,000 a month, then 0.5% of revenue above $10,000, never more than $999 a month. The rate never rises | Every app on RevenueDot Cloud, up to $1,000,000 of tracked revenue a month. [Start for free](https://app.revenuedot.app/signup) |
| **Enterprise** | Custom pricing from $50,000 a year | Apps above $1,000,000 a month, or teams that need SCIM, long audit retention, compliance exports, the SLA or a commercial licence. [Contact sales](https://revenuedot.app/contact-sales) |

What each plan includes:

- **Pro** includes every feature (paywalls, experiments, charts, integrations and webhooks), unlimited apps, projects and teammates, organizations, custom roles and single sign-on (SAML 2.0 and OpenID Connect, verified domains, required SSO). Audit logs keep 90 days. Email support sends a first reply within 2 business days; this is a target, not an SLA.
- **Enterprise** includes everything in Pro with volume pricing, plus SCIM, audit retention from 30 days to 10 years (or forever), signed compliance exports, data location settings (Cloud runs in the US only today), a 99.9% uptime [SLA](sla.md), 1-hour support when purchases fail, and a commercial licence to self-host with every `ee/` feature. RevenueDot marks your account as Enterprise when the contract is signed.

An account with no plan is in the build stage. It is not a plan you pick: every new account starts there, and it ends when you start Pro. With no plan you get every product feature for building and testing, but no organizations, custom roles or single sign-on. [Which plan has which feature](enterprise.md) has the full table.

### What a month of Pro costs

| Tracked revenue in the month | Pro bill |
|---|---|
| $9,000 | $0 |
| $10,001 | $0.01 |
| $50,000 | $200 |
| $209,800 or more | $999 (the cap) |

## What counts as tracked revenue

Tracked revenue is the sum, in US dollars at the exchange rate of the purchase date, of the production purchases that earned money in every project you own, in one calendar month (UTC).

- **Counted:** new purchases, renewals and one-time purchases, from every store, in the month they were made.
- **Not counted:** sandbox and Test Store purchases, free trials, refunds, history written by a [RevenueCat import](../migrate/importer.md), and history copied in by a [move](move-projects.md) from another server (that revenue was tracked there).
- **Refunds are not subtracted.** A refunded purchase still counts in the month it was made.

The Billing page updates the numbers about once an hour.

## Start Pro

1. Open your account menu → **Billing** (`/account/billing`).
2. Click **Start Pro**. Stripe Checkout opens and asks for a card. You pay $0 today.
3. Billing starts on the 1st of next month and repeats on the 1st of every month, with no proration. Each invoice charges the bill for the month before. Under $10,000 of tracked revenue that bill is $0.

RevenueDot bills through its own Stripe account. It never touches the Stripe account you sell with. In Stripe, the subscription is called **RevenueDot Pro**.

The Billing page shows:

- your stage (building, grace with its end date, paused, Pro or Enterprise) and the **Start Pro** button;
- **tracked revenue** this month, in total and per project, and the **bill so far**;
- the two plans, with **Start Pro**, **Manage billing** or **Contact sales**, and what each plan includes;
- **invoices**, with links to Stripe's invoice page and PDF.

An account has one Pro subscription. While it is active, **Start Pro** is not offered again, and a second Checkout opened in another tab is closed automatically.

## The go-live gate

**Going live** means your account's first live sale: a production purchase that earned money, in any project you own. Sandbox, Test Store, trial, imported and moved-in purchases do not count. From that sale you have 14 days to start Pro.

| Stage | When | What happens |
|---|---|---|
| **Building** | No live sale yet, no plan | Everything works. The setup checklist ends with "Start Pro before you release" |
| **Grace** | A live sale, no plan, within the 14 days | Everything works. A banner on every page shows the end date, and you get an email at once and a reminder 2 days before the end |
| **Paused** | A live sale, no plan, after the 14 days | Live data and outbound deliveries pause (below). A red banner shows on every page, and you get one email |
| **Active** | Pro (active or past due) or Enterprise | Everything works. Held deliveries are sent |

The project's owner pays. Every project follows its owner's stage, including projects in an organization.

### What pauses

When the owner's account is paused:

- **Reads of live data answer 402 `plan_required`**, in the dashboard and the API: overview metrics, charts and saved charts, attribution, benchmarks, customer lists, the customer list and customer pages in the dashboard, transactions, subscriptions and purchases lists, exports, ads revenue, payment recovery, win-back and AI insights. The same reads of sandbox data (`environment=sandbox`) keep working.
- **Creating or editing paywalls, experiments and targeting rules answers 402.** Paywalls and experiments that are already live keep serving.
- **Webhook and integration deliveries of production events are held**, not dropped (below).

### What never pauses

In every stage, these keep working:

- the SDK and every SDK endpoint;
- receipt and purchase verification, so every purchase unlocks;
- entitlements and customer info;
- App Store and Google Play server notifications;
- the REST v1 subscriber endpoints, and REST v2 reads of one customer, subscription or purchase with a secret key, so your backend can still check access;
- sandbox and Test Store data everywhere;
- sign-up, projects, apps, store credentials, products, entitlements and offerings;
- paywalls and experiments that are already running;
- imports, moves, members and API keys.

### The 402 plan_required error

A paused read answers HTTP 402 with this body:

```json
{
  "object": "error",
  "type": "plan_required",
  "message": "Live data is paused because this account has no plan. Start Pro on the Billing page: it costs $0 until your apps make $10,000 a month.",
  "doc_url": "https://revenuedot.app/docs/api/errors#plan-required",
  "retryable": false,
  "upgrade_url": "https://app.revenuedot.app/account/billing"
}
```

A teammate who is not the owner gets a message that names the owner: "Live data is paused because the project owner, Dana, has not started Pro. Ask them to start it on their Billing page." In the dashboard, the page shows a panel with **Start Pro** for the owner. See [API errors](../../api/errors.md#plan-required).

### Held webhooks and integration deliveries

While the owner's account is paused, deliveries of production events to [webhooks](webhooks.md) and [integrations](integrations.md) are held:

- The delivery log shows them as **Held: start Pro to send**, and the API returns `status: "held"`.
- When Pro starts, held deliveries go out in order, oldest first.
- A delivery held for more than 30 days is marked failed instead of sent.
- Sandbox and Test Store events are never held.

## Payment failures

Stripe is the source of truth for your subscription.

- **Past due.** A payment failed and Stripe is retrying it. You keep Pro and everything works. A banner on every page links to your card, and you get one email per invoice.
- **Unpaid.** Every retry failed. The account goes back to no plan. A live account is paused at once, because its 14 days were already used.
- **Canceled.** The plan ended. The account goes back to no plan, and a live account is paused at once.

To end a pause, start Pro again from the Billing page. An unpaid invoice stays open and payable there.

## Change your card or cancel

**Manage billing** opens Stripe's Customer Portal. There you change the card, see invoices or cancel. A cancelled Pro plan stays active until the end of the period. After that, the account has no plan, and a live account is paused.

## Emails and banners

- **No plan, after the first live sale:** at most three emails. One when the first live sale is seen, a reminder 2 days before the 14 days end, and one when the account is paused. A banner on every page in grace and when paused.
- **Pro:** an email when the month's bill reaches the $999 cap ("you will not pay more this month"), and at 80% and 100% of $1,000,000, when Enterprise fits better.
- **A failed payment:** a banner on every page with a link to update your card, and one email per invoice.

## Enterprise

Enterprise is a contract with custom pricing from $50,000 a year. [Contact sales](https://revenuedot.app/contact-sales) or write to [sales@revenuedot.app](mailto:sales@revenuedot.app). Enterprise accounts are never paused, and the Billing page shows the bill as "By contract".

## Billing on a server you run yourself

Self-hosted servers have no billing and no go-live gate. The Billing page says billing is only on RevenueDot Cloud, and `/v2/billing` answers 404. There is no metering. The `ee/` features (organizations, custom roles, single sign-on and the rest) need an Enterprise licence key on a self-hosted server. See [Self-hosting](self-hosting.md), and [Move between self-host and Cloud](move-projects.md) to switch either way.

## API

These endpoints take a dashboard session, not an API key. See the [API reference](../../api/extensions.md#cloud-billing).

- `GET /v2/billing` returns `account.plan` (`none`, `pro` or `enterprise`) and its Stripe `status`, `gate` (`stage`: `building`, `grace`, `paused` or `active`, with `live_at`, `grace_ends_at` and `grace_days`), the plans, this month's `usage` (`tracked_revenue_usd`, per project, `bill_usd`, `pro_bill_usd`, `free_up_to_usd`, `cap_usd`), `flags` for banners (`past_due`, `unpaid`, `live_grace`, `live_paused`, `over_pro_limit`) and the invoices.
- `POST /v2/billing/checkout` with `{ "plan": "pro" }` returns the Stripe Checkout URL.
- `POST /v2/billing/portal` returns the Customer Portal URL.
- `GET /auth/me` returns `account.gate` and `account.project_gates`, the stage of each project's owner.

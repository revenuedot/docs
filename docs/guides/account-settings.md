---
title: How do I manage my RevenueDot account settings?
description: Change your email or password, turn on two-factor authentication, sign out sessions, revoke AI assistants, pick summary and anomaly emails, a theme, a tint, your first day of the week and the currency the dashboard shows.
---

# How do I manage my RevenueDot account settings?

Open the project switcher at the top of the sidebar and choose **Account settings**, or go to `/account`. The page has six sections in the left navigation: **General**, **Billing**, **Security**, **Notifications**, **Interface** and **Date and region**. Everything here is yours alone; project settings live under **Project settings** in each project.

## General
- **Name.** Shown to teammates and in invites you send.
- **Email.** Click **Change email**, enter the new address and your current password (and a two-factor code if it is on). RevenueDot emails a link to the new address and tells the old address about the change. The account moves only when you open the link and click **Confirm new email**; opening the link alone changes nothing, so a mail scanner cannot confirm it. The link works once and expires after 24 hours. Until then the old address keeps working, and **Cancel change** stops the link. Links sent to the old address earlier (password resets) stop working once the account moves.
- **Stripe accounts.** Every Stripe account connected with **Connect with Stripe** to a Stripe app in your projects, by you or a teammate, with its mode (Live or Test) and status. Connect and disconnect on the app's page; see [Stripe](stripe.md).
- **Log out** signs out this browser. **Log out of all sessions** signs out every browser, this one included.
- **Delete account.** Type your email, your password and, with two-factor on, a code. RevenueDot deletes your account, your sessions, your two-factor settings, your notification choices, the OAuth keys listed under **Active OAuth tokens** and every project in which you are the only member. Projects other people use stay with them, and their audit log records that you left, with your email. Deletion is refused while:
  - you **own a project that has other members**: transfer ownership first in **Project settings → General** ([Project settings](project-settings.md)), or remove the members;
  - you are the **last admin** of a project with other members: make someone else an admin;
  - a **Cloud Standard plan** is still active: cancel it on the Billing page first ([Cloud billing](cloud-billing.md));
  - you are the **only owner of an organization** that has other members: make someone else an owner of the organization first.

## Billing
**Owned projects** lists the projects you own with your role, the number of members and the plan. The projects you belong to but do not own follow with their owner. On RevenueDot Cloud the plan, this month's tracked revenue, the bill so far and your invoices follow ([Cloud billing](cloud-billing.md)). Self-hosted servers are free and have no billing.

## Security
- **Update password.** Enter the current password and the new one twice. Every other session is signed out, a sign-in that is waiting for its two-factor code has to start again, and you get an email. After 10 password checks in 15 minutes (here, in two-factor setup, email change or deletion), RevenueDot refuses more until 15 minutes after the first.
- **Two-factor authentication.** Click **Set up**, confirm your password, scan the QR code with an authenticator app (Google Authenticator, 1Password, Authy or any app that reads TOTP codes) or type the key, then enter the 6-digit code it shows. You get **10 recovery codes** once: keep them in a password manager. Each signs you in once without your phone.
  - From then on, sign-in asks for the code after your password. A code works once; you have one step (30 seconds) of clock drift either way.
  - **Lost your phone?** On the code screen choose **Use a recovery code**. RevenueDot emails you when a recovery code signs you in and says how many are left. **Make new codes** replaces them all.
  - **Turn off** needs a current code or a recovery code.
  - A password reset on an account with two-factor still asks for the code before it signs you in.
  - Five wrong codes end a sign-in attempt. Ten wrong codes in 15 minutes, at sign-in and in these settings together, pause code checks for the account until 15 minutes after the first; a new sign-in does not reset them. Right codes do not count.
  - Single sign-on sessions ([Single sign-on](single-sign-on.md)) never ask for the code: your identity provider handles the second factor.
- **Sessions.** Every browser signed in to your account, with the browser, the IP address, how it signed in and when it was last active. **Sign out** ends one; **Sign out other sessions** ends all but this one.
- **Active OAuth tokens.** Every AI assistant or app you connected with **Allow access** ([Connect AI assistants](connect-ai-assistants.md)): the client, its address, the project, the access and when it was last used. **Revoke** stops it at once. Keys granted before this list existed are on the project's **API keys** page.

## Notifications
- **Alert emails** for problems in projects you administer, with a separate switch for integration failures ([Alert emails](alerts.md)).
- **Per project**, three emails you turn on yourself. Any member can subscribe to a project they belong to.
  - **Weekly summary**: on the first day of your week, MRR at the end of the week, revenue, new customers, new trials, churned subscriptions and the churn rate, each against the week before, in your display currency. The numbers come from the same engine as [Charts](charts.md), production only.
  - **Experiment results**: one email when both variants of an [experiment](targeting-and-experiments.md) have 100 customers, and one when it is stopped.
  - **Revenue anomalies** (beta): every morning (UTC), yesterday's revenue and new paid subscriptions are compared with the 28 days before. You get an email when one of them moves far outside its usual range, up or down. Choose the sensitivity:

| Sensitivity | Alerts when | And the change is at least |
|---|---|---|
| Low | the day is 4 spreads from the usual value | 50%, and $50 or 5 subscriptions |
| Medium (default) | 3 spreads | 30%, and $20 or 3 subscriptions |
| High | 2 spreads | 20%, and $10 or 2 subscriptions |

The usual value is the median of the 28 days, and the spread is 1.4826 times their median absolute deviation (at least 10% of the usual value), so one odd day in the past does not hide a real drop. A series needs 14 of the 28 days with some revenue (or some new subscriptions) before it can alert, so a new app, or one that sells on one day in three, gets no alerts yet.

Every summary, experiment and anomaly email has an **Unsubscribe** link at the bottom, and mail apps show their own one-click unsubscribe. It turns off that email for that project only; no sign-in needed.

## Interface
- **Theme**: System (follows your computer), Light or Dark. It is saved on your account, so it follows you to other browsers; the moon button in the top bar changes it too.
- **Tint colour**: replaces the gold accent (the live dot, focus rings, the current period in charts, highlighted text) with one of the swatches or any colour. Text in the tint is darkened (light theme) or lightened (dark theme) until it reads at 4.5:1 or better, and the page shows both ratios. Pages stay white and grey in light mode and dark in dark mode. **Reset** brings the gold back.

## Date and region
- **Start week on**: Sunday to Saturday (Monday by default). Weekly charts, the date pickers and your weekly summary start their weeks on that day. Through the API, add `week_start=0` (Sunday) to `6` (Saturday) to `GET /v2/projects/{project_id}/charts/{chart_name}`.
- **Display currency**: one of USD, EUR, GBP, AUD, CAD, JPY, BRL, KRW, CNY, MXN, SEK, PLN, NZD or CHF. Charts convert each day at that day's rate; the Overview, customers, transactions and other amounts use the latest European Central Bank rate, shown on the page. Until the rate has loaded, or when it cannot be loaded, amounts show in USD and say so. Prices in a store's own currency stay as they are. The API answers in USD unless a chart request sets `currency`, and RevenueDot Cloud bills in USD.

## API
Account settings use the dashboard session (`rd_session`), never an API key. The endpoints are in the [API reference](../../api/README.md) under **Account settings**: `POST /auth/email/change`, `POST /auth/password/change`, `GET /auth/sessions`, `POST /auth/2fa/setup`, `POST /auth/login/2fa`, `GET /auth/oauth_tokens`, `GET /auth/stripe_accounts`, `POST /auth/account/delete`, `GET /auth/notifications` and `GET /auth/fx`.

## Questions
**Can a self-hosted server use two-factor authentication?** Yes. The secret is sealed with AES-256-GCM using the server's `REVENUEDOT_ENCRYPTION_KEY` (or a key derived from `REVENUEDOT_SIGNING_KEY`). A server with neither key stores it unencrypted, like its other integration secrets, and never returns it after setup: set `REVENUEDOT_ENCRYPTION_KEY` (`openssl rand -base64 32`). If the key changes, authenticator codes stop working: sign in with a recovery code, choose **Turn off** with another recovery code, then set two-factor up again.

**I lost my phone and my recovery codes.** Ask the server's operator: on a self-hosted server, `revenuedot admin reset-password` resets the password but not two-factor, so the operator clears it in the database (`UPDATE users SET totp_secret = NULL, totp_enabled_at = NULL, totp_last_step = NULL WHERE email = '…'`). On RevenueDot Cloud, write to hello@revenuedot.app from the account's address.

**Why did I not get a weekly summary?** It goes out on the first day of your week from 06:00 UTC (by the end of the third day at the latest), when that week or the week before had any production MRR, revenue, new customers, new trials or churned subscriptions. Check that the project is turned on under Notifications.

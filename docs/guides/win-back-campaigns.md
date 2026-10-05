---
title: How do I email churned subscribers a win-back offer?
description: Win-back campaigns email subscribers whose subscription ended a link back to the store, once per customer, with click tracking, optional open tracking, one-click unsubscribe and a count of customers who came back.
---

# How do I email churned subscribers a win-back offer?

A win-back campaign emails customers whose subscription ended, with a button that takes them back to resubscribe. RevenueDot picks the customers, sends the email, tracks clicks and counts who came back.

## Before you start
- Customers need an email address in the `$email` attribute. Set it from your app with `Purchases.shared.attribution.setEmail(_:)` or through the API.
- Set the Customer Center support email (**Lifecycle > Support > Customer Center**). Replies to win-back emails go there.
- On a self-hosted server, set up email (`REVENUEDOT_SMTP_URL`) and `REVENUEDOT_PUBLIC_URL`, so links in the email point at your server. See [Self-hosting](self-hosting.md).

## Create a campaign
Open **Lifecycle > Win-back** and select **Create campaign**.

1. **Audience.** Customers whose last subscription ended between N and M days ago and who have no active subscription. Narrow it to products, stores or a saved audience. **Preview** shows how many would get the email today, and who.
2. **Email.** Subject, heading, body and button label. The email speaks for your app: the sender name (or your project's name) is the From name and sits on top, then your text, one button and an unsubscribe link. Replies go to your Customer Center support email.
3. **Offer.** Where the button goes:
   - **Store**: App Store customers go to their Apple account's subscriptions page, where Apple lists the [win-back offers](win-back-offers.md) they are eligible for and the Resubscribe button. Google Play customers go to the Play Store page of their subscription.
   - **Your link**: any https URL, for example your own web checkout.
4. **Schedule.** Active campaigns send once a day at the hour you choose (UTC), to at most 500 customers a day. A large run goes out over a few minutes, 100 emails a minute across all campaigns. All of a project's campaigns together send at most 2,000 emails in 24 hours. **Send now** runs it at once; **Send test** sends you a sample (10 an hour).
5. Select **Start**.

Each customer gets a campaign's email once. Sandbox purchases never count. A customer is emailed only when their `$email` attribute is one plain address.

## Results
Each campaign shows:
- **Sent**, **clicked** and **unsubscribed**.
- **Opened**, only when **Track opens** is on: it adds a 1×1 image to the email.
- **Reactivated**: customers who bought or started a trial within 30 days of the email, and the revenue from them.

## Unsubscribes
Every email has an unsubscribe link. On RevenueDot Cloud, and on a self-hosted server whose public URL is https, the email also carries the one-click headers that Gmail and Yahoo require from bulk senders ([RFC 8058](https://www.rfc-editor.org/rfc/rfc8058)):

```
List-Unsubscribe: <https://api.revenuedot.app/v1/winback/u/{token}>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

The mail app's **Unsubscribe** button sends a POST to that link, and the address is unsubscribed at once, with no sign-in and no confirmation page. Opening the link in a browser only asks; its button unsubscribes. An address that unsubscribes never gets another win-back email from the project.

**Send test** emails carry the same headers, so you can check them in your mail app's "Show original" view. Their unsubscribe link changes nothing.

Cloud sends through Cloudflare Email Service, which accepts these headers ([Cloudflare: email headers](https://developers.cloudflare.com/email-service/reference/headers/)). A self-hosted server sends them over SMTP. A server whose public URL is http sends no headers, because mail providers accept only https links; the link in the email still works.

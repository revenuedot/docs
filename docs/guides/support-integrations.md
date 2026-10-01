---
title: How do I handle support requests from the Customer Center?
description: Customer Center tickets reach your support inbox with the customer's subscription details, and Intercom or Zendesk sidebars can show a customer's subscription state from RevenueDot's support summary endpoint.
---

# How do I handle support requests from the Customer Center?

The RevenueCat SDK's Customer Center can let customers write to you from inside your app. RevenueDot stores each request, emails it to your support address and lists it under **Lifecycle > Support > Tickets**. Your help desk can also show the customer's subscription next to the conversation.

## Turn on tickets
Open **Lifecycle > Support > Customer Center**.

1. Enter the **support email**. Tickets are sent there, with Reply-To set to the customer's address, so you answer from your inbox.
2. Turn on **Let customers create tickets** and choose who may (customers with an active subscription, without one, or everyone).
3. Choose which details the email includes: app user ID, active entitlements, total spent, customer since, last opened, app version, country, device and more.

The SDK reads these settings with the rest of the Customer Center configuration. A customer can send up to 5 tickets an hour. If tickets are off, the SDK offers its email link instead.

## Show subscription data in Intercom or Zendesk
Help desks know the customer's email. Call the support summary with a secret API key that has `customer_information:customers:read`:

```bash
curl "https://api.revenuedot.app/v2/projects/$PROJECT_ID/support_summaries?email=wren@example.com" \
  -H "Authorization: Bearer $REVENUEDOT_SECRET_KEY"
```

or, when you know the app user ID, `GET /v2/projects/{project_id}/customers/{app_user_id}/support_summary`. The answer has the customer's status, active entitlements, each subscription with its store, auto-renew state and expiry, total spent, refund requests, open tickets and a link to the customer in the dashboard ([API reference](../../api/extensions.md#support)).

Use it from an Intercom Canvas Kit app or a Zendesk sidebar app: your app's backend calls RevenueDot with the secret key (never put the key in the help desk's browser code) and renders the fields you want.

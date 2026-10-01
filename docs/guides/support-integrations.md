---
title: How do I handle support requests from the Customer Center?
description: Customer Center tickets reach your support inbox with the customer's subscription details. RevenueDot's Intercom inbox app and Zendesk sidebar app show each customer's subscription, entitlements, total spent, refunds and open tickets next to the conversation.
---

# How do I handle support requests from the Customer Center?

The RevenueCat SDK's Customer Center can let customers write to you from inside your app. RevenueDot stores each request, emails it to your support address and lists it under **Lifecycle > Support > Tickets**. Your help desk can also show the customer's subscription next to the conversation.

## Turn on tickets
Open **Lifecycle > Support > Customer Center**.

1. Enter the **support email**. Tickets are sent there, with Reply-To set to the customer's address, so you answer from your inbox.
2. Turn on **Let customers create tickets** and choose who may (customers with an active subscription, without one, or everyone).
3. Choose which details the email includes: app user ID, active entitlements, total spent, customer since, last opened, app version, country, device and more.

The SDK reads these settings with the rest of the Customer Center configuration. A customer can send up to 5 tickets an hour, one device (IP address) up to 20, and the whole project receives up to 100 an hour, so a leaked SDK key cannot flood your inbox. The customer's email must be one plain address, and the message is cut at 5,000 characters. If tickets are off, the SDK offers its email link instead.

## Show subscription data in Intercom or Zendesk
RevenueDot has a ready app for each help desk. Both show the customer's status, active entitlements, plan, store, renewal or expiry date, billing issue, total spent, customer since, refund requests and open tickets, with a link to the customer in the dashboard.

## Intercom
The Intercom inbox app is a [Canvas Kit](https://developers.intercom.com/docs/canvas-kit) app that you create in your own Intercom workspace. Intercom calls RevenueDot directly, and RevenueDot checks every request's signature, so no API key is involved.

1. In the [Intercom Developer Hub](https://app.intercom.com/a/apps/_/developer-hub), create an app and open **Canvas Kit**. For the **Inbox**, set the initialize URL to:
   - RevenueDot Cloud: `https://api.revenuedot.app/v1/support/intercom/{project_id}/canvas`
   - Self-hosted: `<your server>/v1/support/intercom/{project_id}/canvas`

   Use your project ID, for example `https://api.revenuedot.app/v1/support/intercom/proj1a2b3c4d/canvas`. The **Integrations → Intercom inbox** page in RevenueDot shows the exact URL to copy.
2. In the Developer Hub, open **Basic information** and copy the app's **client secret**. In RevenueDot, open **Integrations → Intercom inbox**, paste it as **Intercom app client secret** and click **Connect Intercom inbox**.
3. Install the app in your workspace and add it to the inbox sidebar.

**How a request is checked:** Intercom signs the raw request body with the client secret and sends the hex HMAC-SHA256 in `X-Body-Signature`. RevenueDot computes the same signature with the saved secret and answers 401 when it is missing or does not match. A project without a connected Intercom inbox answers 404.

**How the customer is found:** by the contact's user ID (`external_id`), which should be your app user ID, then by the contact's email against the customers' `$email` attribute. Without a match the sidebar says so. The answer is Canvas Kit components: a table of the fields above and an **Open in RevenueDot** button.

To send subscription events to Intercom contacts as well, use the separate [Intercom integration](integrations.md#intercom).

## Zendesk
The Zendesk app is a private ticket sidebar app. Its source is in the RevenueDot repository: [integrations/zendesk-app](https://github.com/revenuedot/revenuedot/tree/main/integrations/zendesk-app) (manifest, sidebar page, translations and logos). It looks the ticket requester up by email with `GET /v2/projects/{project_id}/support_summaries?email=`.

1. In RevenueDot, open **API keys** and create a secret key with only the `customer_information:customers:read` permission.
2. Download the [integrations/zendesk-app](https://github.com/revenuedot/revenuedot/tree/main/integrations/zendesk-app) folder, zip its contents (or run `zcli apps:package` in it) and upload the zip as a private app in Zendesk: **Admin Center › Apps and integrations › Zendesk Support apps › Upload private app** ([Zendesk's guide](https://developer.zendesk.com/documentation/apps/getting-started/uploading-and-installing-a-private-app/)). `zcli apps:create` in the folder does both.
3. Fill in the app's three settings:
   - **RevenueDot API URL:** `https://api.revenuedot.app` on RevenueDot Cloud, or your server's URL.
   - **Project ID:** from **Project settings** in the dashboard, or the **Integrations → Zendesk** page.
   - **Secret API key:** the key from step 1. Zendesk keeps it as a secure setting and adds it to the request on Zendesk's servers, so agents' browsers never see it.
4. In RevenueDot, open **Integrations → Zendesk** and click **Mark as installed**, so the card shows the app as active.

**Self-hosted servers:** Zendesk sends a secure setting only to the domains listed in the manifest's `domainWhitelist` ([Zendesk's guide](https://developer.zendesk.com/documentation/apps/app-developer-guide/making-api-requests-from-a-zendesk-app/)). Add your server's host name to `domainWhitelist` in `manifest.json` (it lists `api.revenuedot.app`) before you upload the app, for example `"domainWhitelist": ["revenuedot.example.com"]`.

## Use the support summary from your own app
Any other help desk can call the support summary with a secret API key that has `customer_information:customers:read`:

```bash
curl "https://api.revenuedot.app/v2/projects/$PROJECT_ID/support_summaries?email=wren@example.com" \
  -H "Authorization: Bearer $REVENUEDOT_SECRET_KEY"
```

or, when you know the app user ID, `GET /v2/projects/{project_id}/customers/{app_user_id}/support_summary`. The answer has the customer's status, active entitlements, each subscription with its store, auto-renew state and expiry, total spent, refund requests, open tickets and a link to the customer in the dashboard ([API reference](../../api/extensions.md#support)). Call it from your app's backend, never from code that runs in an agent's browser, because the key is secret.

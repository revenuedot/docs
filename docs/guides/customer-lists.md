---
title: How do I filter, save and export customer lists?
description: The Customers page has built-in lists (all, active subscribers, sandbox, non-subscription, expired), saved audiences, filters from the audience condition builder, four summary cards and CSV export.
---

# How do I filter, save and export customer lists?

Open **Customers**. The rail on the left holds the lists:

| List | Who is in it |
|---|---|
| All customers | Everyone the SDK or a store notification has told RevenueDot about |
| Active subscribers | Customers with an active production subscription, trials included |
| Sandbox | Customers with a sandbox purchase |
| Non-subscription | Customers with a production one-time purchase |
| Expired | Subscribers whose production subscriptions have all ended |
| Your audiences | Audiences you saved here or under Targeting |

Four cards sum up the list: customers, trialing subscribers, paid subscribers and total revenue (production, in USD).

## Filter and save
Select **Filter** and add conditions: country, platform, app version, subscription status, entitlements, total spent, first or last seen, first purchase, last renewal, email, attribution or any custom attribute. Conditions in a group must all match; groups are alternatives. **Search** matches part of an app user ID or email.

**Save audience** keeps the filter as an audience. It appears in the rail, and you can use it in targeting rules, experiments, refund policies and win-back campaigns.

## Export
**Export all** downloads the list as CSV: app user ID, email, subscription status, auto-renewal status, first and last seen, spent, latest product, store and purchase date, country and platform. Through the API: `GET /v2/projects/{project_id}/customer_lists/export?list=active` ([API reference](../../api/extensions.md#customer-lists)).

Lists look at the 10,000 most recently seen customers. On a larger project the cards say so; use [data exports](integrations.md) for everything.

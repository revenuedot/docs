---
title: How do I filter, save and export customer lists?
description: The Customers page has built-in lists (all, active subscribers, sandbox, non-subscription, expired), saved audiences, filters from the audience condition builder, sortable columns, a hide-IDs switch, four summary cards and CSV export.
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

## Sort and hide IDs
The list starts with the most recently seen customers, and the **Last seen** header shows that order. Select another column header to sort by it: customer (app user ID), subscription status, auto-renewal, first seen or spent. The first click puts the newest dates, the biggest spend, app user IDs from A to Z, active subscriptions and auto-renewal on first; the next click flips it. Customers with the same value keep the last-seen order. In both directions, anonymous IDs (`$RCAnonymousID:…`) come after named app user IDs, and customers without an auto-renewal value come last. The sort stays in the page address, so a shared link opens in the same order, and **Export all** uses it too. Through the API: `?sort=spent_in_usd&direction=desc`.

The eye button in the Customer header hides app user IDs and emails on screen, for screen sharing and demos. Rows still open the customer. The setting is remembered in this browser.

## Filter and save
Select **Filter** and add conditions: country, platform, app version, subscription status, entitlements, total spent, first or last seen, first purchase, last renewal, email, attribution (media source, campaign, ad group, keyword, ad, creative; the value box suggests your project's values, and Apple Search Ads campaigns match by name once [names are loaded](attribution.md#name-your-apple-search-ads-campaigns)) or any custom attribute. Conditions in a group must all match; groups are alternatives. **Search** matches part of an app user ID or email.

**Save audience** keeps the filter as an audience. It appears in the rail, and you can use it in targeting rules, experiments, refund policies and win-back campaigns.

## Export
**Export all** downloads the list as CSV: app user ID, email, subscription status, auto-renewal status, first and last seen, spent, latest product, store and purchase date, country and platform. Through the API: `GET /v2/projects/{project_id}/customer_lists/export?list=active` ([API reference](../../api/extensions.md#customer-lists)).

## Large projects
Lists, cards and exports cover every customer of the project, and the counts are exact. Built-in lists, search and sorting run in the database, so they answer straight away at any size. Filters and saved audiences check each customer's full profile; on a project with more than 5,000 customers their cards are counted in the background. The cards show **Counting…** for a minute or two the first time, then the exact numbers, and say when they were counted if that was more than two minutes ago. A count is refreshed after ten minutes. The rows themselves never wait for a count. On a very large project a filtered page can show fewer rows than usual with a next page: RevenueDot checks up to 20,000 customers per page so the page always answers. **Export all** writes up to 100,000 rows per file; for more, use [data exports](integrations.md). Through the API the summary has `is_counting` and `counted_at`. Refund Control policy counts, audience previews and win-back previews are counted the same way.

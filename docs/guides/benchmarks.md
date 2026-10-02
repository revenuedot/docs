---
title: Benchmarks
description: Compare your trial conversion, churn, refund rate, LTV, ARPU and prices with similar apps on RevenueDot Cloud. Sharing is opt-in, groups need at least 10 apps, and no app, customer or exact count is ever shown.
---

# Benchmarks

**Benchmarks show where your app stands against similar apps, on RevenueDot Cloud.** Open **Analytics > Benchmarks** to see your last 12 months next to the 25th, 50th and 75th percentile of apps in the same category, and your biggest opportunity.

Benchmarks exist only on RevenueDot Cloud. A self-hosted server computes nothing and shares nothing; its sidebar has no Benchmarks page.

## Turn on sharing
Sharing is off for every project until an admin turns it on. Only projects that share see peer numbers.

1. Open **Analytics > Benchmarks** (or **Project settings > Benchmarks**).
2. Pick your app's **category**: Business, Education, Gaming, Health & Fitness, Media & Entertainment, Photo & Video, Productivity, Shopping, Social & Lifestyle, Travel, Utilities or Other.
3. Select **Share and compare**.

Your own numbers appear within a minute. Your project joins the peer groups at the next nightly run, at 02:00 UTC. The change is in the project's audit log as `benchmarks_settings_updated`.

## What is shared, and what is never shown
- **Only percentiles of groups of 10 or more apps.** A group is one category, platform and country. If fewer than 10 sharing apps have enough data for a metric in a group, that group shows nothing. The 10th and 90th percentiles appear only from 20 apps.
- **No app, customer or exact count.** RevenueDot never shows which apps are in a group, any app's value, a mean, a minimum or a maximum. The number of apps is rounded down to a multiple of 5 ("25+ apps").
- **Your values stay yours.** Your own values are shown only to your project. Turning sharing off removes them from every group at once.
- **Small apps do not count.** An app contributes to a metric only with enough data of its own (for example 100 new customers for conversion and LTV, 20 finished trials for trial conversion), so one tiny app cannot move a percentile.
- **Production only.** Sandbox and Test Store purchases are never included. The nightly job runs inside RevenueDot Cloud; nobody reads production data from a laptop to build it.

## The metrics
Each metric uses the same definition as its chart, over the last 12 complete months in US dollars, so your value matches the chart it links to.

| Metric | Definition | Better |
|---|---|---|
| Initial conversion (7 days) | New customers who started a trial or bought anything within 7 days of first being seen | Higher |
| Trial conversion | Finished free trials that converted to paid | Higher |
| Conversion to paying (7 days) | New customers who paid within 7 days and were not refunded in that time | Higher |
| Monthly churn | Paid subscriptions that ended in a month ÷ those active when it started | Lower |
| Refund rate | Paid transactions refunded | Lower |
| Realized LTV per customer (30 days) | Revenue of new customers in their first 30 days ÷ new customers | Higher |
| Realized LTV per paying customer (30 days) | The same revenue ÷ customers who paid in those 30 days | Higher |
| ARPU (monthly) | Revenue ÷ active customers, per month | Higher |
| Monthly price, Annual price | Median price paid for 1-month and 1-year subscriptions | Neither |

## Read the page
- **Category, platform, country:** compare with your category or all categories, all platforms, iOS or Android, and all countries or one country where enough apps share.
- **Each row:** your value with how much data it rests on, a bar with the middle half of apps (25th to 75th percentile), the median line and your value as the gold square, the percentiles, and where you stand (top quarter, above median, below median, bottom quarter).
- **Your biggest opportunity:** the metric where you are furthest below the median. **Open the chart** to see it over time, or **Ask RevenueDot AI** how to improve it.

If a group shows "Fewer than 10 apps share data", choose **Compare with all apps**.

## Use the API
```bash
# Your values against Health & Fitness apps on iOS
curl "https://api.revenuedot.app/v2/projects/$PROJECT/benchmarks?category=health_fitness&platform=ios" \
  -H "Authorization: Bearer $SECRET_KEY"

# Share (admins, or a key with project_configuration:projects:read_write)
curl -X POST "https://api.revenuedot.app/v2/projects/$PROJECT/benchmarks/settings" \
  -H "Authorization: Bearer $SECRET_KEY" -H "content-type: application/json" \
  -d '{"share": true, "category": "health_fitness"}'
```
See the [API reference](../../api/extensions.md#benchmarks). RevenueDot AI's `get-benchmarks` tool reads the same numbers.

## Differences from RevenueCat
RevenueCat's Benchmarks compare 7 metrics with apps in the same store and primary category over 12 months, and include every eligible app ([Benchmarks](https://www.revenuecat.com/docs/dashboard-and-metrics/benchmarks)). RevenueDot adds ARPU and prices, splits by platform and country, publishes the 10-app threshold, and includes only projects that opt in.

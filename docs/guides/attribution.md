---
title: Attribution
description: See which ad networks, campaigns, ad groups and keywords bring paying customers. RevenueDot stores the attribution the SDK already sends, names Apple Search Ads campaigns, segments every chart by it, and shows revenue by campaign with day-7, day-30 and to-date revenue and ROAS.
---

# Attribution

**RevenueDot keeps where each customer came from and shows how much each campaign earns.** The attribution your app already sends through the RevenueCat SDK (media source, campaign, ad group, keyword, ad, creative, Apple Search Ads and partner ids) becomes one attribution record per customer. Every chart can filter and segment by it, and **Analytics > Attribution** shows revenue by campaign.

## Where attribution comes from
You do not need anything on the server. RevenueDot reads the reserved attributes the SDK and your attribution partner already set:

| Source | What arrives |
|---|---|
| Your app or your attribution partner's callback | `setMediaSource`, `setCampaign`, `setAdGroup`, `setAd`, `setKeyword`, `setCreative` in the SDK (or the same `$mediaSource` … attributes through `POST /v1/subscribers/{app_user_id}/attributes`) |
| Apple Search Ads | With `Purchases.shared.attribution.enableAdServicesAttributionTokenCollection()`, the iOS SDK posts an AdServices token. RevenueDot asks Apple's attribution API for the campaign, ad group, keyword and ad ids, the claim type and the country |
| AppsFlyer, Adjust, Branch, Kochava, Singular, Tenjin, Airbridge | The partner's device id (`$appsflyerId`, `$adjustId` …) the SDK helpers set, kept with the record so you can match it in the partner's dashboard |
| Your backend | `POST /v2/projects/{project_id}/customers/{customer_id}/attributes` with a secret key |
| Import from RevenueCat | Attribution attributes imported with `revenuedot import` (`POST /v2/projects/{project_id}/import/customers`) fill the record |

Attribution attributes (`$mediaSource`, `$campaign`, `$adGroup`, `$ad`, `$keyword`, `$creative`, `$appleAds*`, `$claimType`, `$conversionType`) are write-once from the SDK, as in RevenueCat. Once a value is stored, a different value or a clear sent through `POST /v1/subscribers/{app_user_id}/attributes` or a receipt's `attributes` is ignored, so a reinstall or a partner resending its conversion data never replaces the original install's attribution. Apple's AdServices attribution is written once too. Partner device ids follow the newest value. To correct or clear attribution, use `POST /v2/projects/{project_id}/customers/{customer_id}/attributes` with a secret key; the record follows.

### Name your Apple Search Ads campaigns
Apple's attribution API returns ids, not names. To see campaign and ad group names, connect an Apple Search Ads API user under **Integrations > Apple Search Ads** and load the names (see [Apple Search Ads](integrations.md#apple-search-ads)). Every customer attributed to those campaigns then shows the name, in charts, the report and filters, and keeps the id next to it. Keywords show Apple's keyword id unless `$keyword` was set before the AdServices lookup stored the id, or your backend sets it through the REST API v2.

## Segment any chart by campaign
On **Analytics > Charts**, open **Segment** and pick one of the **Attribution** options: media source, campaign, ad group, keyword, ad or creative. **Filter** has the same six. They are customer dimensions, like country: a filter keeps the matching customers and everything they bought. Customers without attribution appear as **No attribution**. The API takes the same names, for example:

```bash
curl "https://api.revenuedot.app/v2/projects/$PROJECT/charts/revenue?resolution=month&segment=campaign" \
  -H "Authorization: Bearer $SECRET_KEY"
```

## Revenue by campaign
**Analytics > Attribution** groups the new customers of a date range by media source, campaign, ad group or keyword. Pick a media source first to see only its campaigns.

| Column | What it counts |
|---|---|
| New customers | Customers whose cohort date (the earlier of first seen and first purchase) is in the range |
| Trials, Paying, Conv. | Customers who started a trial; customers whose first payment was not refunded; paying ÷ new customers |
| Day 0, Day 7, Day 30, To date | Revenue of those customers on their first day, through day 7, through day 30, and so far: purchases and renewals minus refunds, in US dollars at the purchase date, production only, ads excluded |
| Per customer | Revenue to date ÷ new customers |
| Spend, ROAS | Type what you spent on a row; ROAS is revenue ÷ spend, to date and at day 7 and day 30 |

A value marked `*` can still grow: some customers in the row have not reached day 7 or day 30 yet. Spend stays in your browser; **CSV** downloads the table with spend and ROAS. The icons on each row open the Revenue chart and the Customers list filtered to that row.

The API returns the same table:

```bash
curl "https://api.revenuedot.app/v2/projects/$PROJECT/attribution/report?group_by=campaign&media_source=Apple%20Search%20Ads&start_date=2026-09-01&end_date=2026-09-30" \
  -H "Authorization: Bearer $SECRET_KEY"
```

## Filter customers and build audiences
In **Customers > Filter** and in Targeting audiences, the conditions **Media source**, **Campaign**, **Ad group**, **Keyword**, **Ad** and **Creative** read the same record, and the value box suggests the values your project has. Save the filter as an audience to target an offering or an experiment at customers from one campaign. A customer's page shows their attribution, and `GET /v2/projects/{project_id}/customers/{customer_id}/attribution` returns it.

## Differences from RevenueCat
- RevenueCat's charts segment by Apple Search Ads attribution source, campaign, ad group, keyword and claim type ([Charts](https://www.revenuecat.com/docs/dashboard-and-metrics/charts)). RevenueDot offers media source, campaign, ad group, keyword, ad and creative for every source, not only Apple Search Ads.
- Attribution attributes are write-once from the SDK, as RevenueCat documents ([Customer attributes](https://www.revenuecat.com/docs/customers/customer-attributes)). In RevenueDot your backend can still correct or clear them with the REST API v2.
- Ad spend is typed in on the page; RevenueDot does not import spend from ad networks yet.

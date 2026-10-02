---
title: Charts
description: Every built-in chart in RevenueDot, how each one is calculated, chart types, the customers behind each number, annotations, share links, the API, and the SQL that reproduces the core numbers.
---

# Charts

RevenueDot has 42 charts in the dashboard under **Analytics > Charts**, with the same names, groups and definitions as RevenueCat's Charts v3 wherever RevenueDot holds the same data. The REST API serves the same numbers at `GET /v2/projects/{project_id}/charts/{chart_name}` with RevenueCat's parameters and response shape, so scripts written for RevenueCat's charts API keep working.

## Rules every chart follows

- **Sandbox purchases are excluded.** The **Sandbox data** switch (API: `environment=sandbox`) shows only sandbox and Test Store purchases instead. Customer counts do not depend on the switch.
- **Granted access and Family Sharing are excluded** from every money and subscription number.
- **Money is in USD at the exchange rate of the purchase date.** Another currency (`currency=EUR` and 13 others) converts that USD amount at the same date's rate, so a subscription's MRR keeps its purchase-date rate.
- **Periods are UTC.** Days start at 00:00 UTC and weeks on Monday.
- **Stock numbers are snapshots at the end of each period** (active subscriptions, active trials, MRR, ARR). The current period's snapshot is taken now.
- **Refunds count on the refund date**, not the purchase date.
- **A resubscription is a new subscription.** A customer who comes back after their subscription lapsed starts a new one; a renewal after a billing issue (billing recovery) continues the old one.
- **A product change ends one subscription and starts another** at the moment of the change.
- **Incomplete periods** (the current one, a partial first period, cohorts whose window is still open) are marked with `*` in the dashboard and `incomplete: true` in the API.

## How each chart is calculated

### Revenue

| Chart | API name | Definition |
|---|---|---|
| <a id="revenue"></a>Revenue | `revenue` | Money received in each period: purchases, renewals and one-time purchases, plus ad revenue, minus refunds recorded in the period. **Transactions** counts paid purchases, renewals and one-time purchases; refunds do not reduce it. Selector `revenue_type`: `revenue` (gross), `revenue_net_of_taxes` (equal to gross, because the stores do not report tax per purchase) or `proceeds` (gross minus the store commission). |
| <a id="arr"></a>ARR | `arr` | MRR at the end of each period times 12. |
| <a id="mrr"></a>MRR | `mrr` | At the end of each period, every paid subscription with access contributes its price normalised to one month: 1 day ×30, 3 days ×10, 1 week ×4, 2 weeks ×2, 4 weeks ×1, 1 month ×1, 2 months ×½, 3 months ×⅓, 6 months ×⅙, 1 year ×1/12. Cancelled subscriptions count until they expire; trials count zero. |
| <a id="mrr_movement"></a>MRR Movement | `mrr_movement` | New MRR (subscriptions that became paid), resubscription MRR, expansion MRR (a product change or renewal at a higher monthly value), churned MRR (subscriptions that lost paid access, net of billing recoveries) and contraction MRR. Churned and contraction are negative; the movement is their sum and equals MRR at the end of the period minus MRR at its start. |
| <a id="non-subscription_purchases"></a>Non-subscription Purchases | `non-subscription_purchases` | One-time purchases (consumables, non-consumables, lifetime unlocks) per period. |
| <a id="ad_revenue"></a>Ad Revenue | `ad_revenue` | Ad revenue the SDK reported (`rc_ads_ad_revenue` events), converted to USD at the date of each ad. |

### Subscriptions

| Chart | API name | Definition |
|---|---|---|
| <a id="actives"></a>Active Subscriptions | `actives` | Paid subscriptions with access at the end of each period: cancelled ones count until they expire, ones in a grace period count, refunded ones stop at the refund. Trials do not count. |
| <a id="actives_movement"></a>Active Subscriptions Movement | `actives_movement` | New actives + resubscription actives − churned actives (net of billing recoveries). A product change from one paid product to another counts in neither. |
| <a id="actives_new"></a>Paid Subscriptions | `actives_new` | Subscriptions whose first paid period started in the period, split into trial conversions, direct purchases, product changes and resubscriptions. Paid introductory offers count as direct purchases. |
| <a id="subscription_retention"></a>Subscription Retention | `subscription_retention` | Paid subscriptions cohorted by their first paid date (a trial conversion on its conversion date). Period *n* is the share of the cohort that reached its *n*-th paid period, among subscriptions that have had time to reach it. Selector `retention_scale`: `relative` (%) or `absolute` (#). |
| <a id="subscription_status"></a>Subscription Status | `subscription_status` | Active subscriptions (or active trials, MRR, ARR: selector `status_measure`) at the end of each period, split by each subscription's renewal state as known today: set to renew (it renewed or changed product since, or will renew), set to cancel, billing issue. |

### Ads

| Chart | API name | Definition |
|---|---|---|
| <a id="ad_rpm"></a>eCPM | `ad_rpm` | Ad revenue per thousand impressions. |
| <a id="ad_impressions"></a>Impressions | `ad_impressions` | Ads displayed (`rc_ads_ad_displayed`). |
| <a id="ad_fill_rate"></a>Fill Rate | `ad_fill_rate` | Ads loaded ÷ (ads loaded + ads that failed to load). |
| <a id="ad_monetized_customers"></a>Ad Monetized Customers | `ad_monetized_customers` | Customers with at least one ad revenue event per day, averaged over the days of the period. |
| <a id="ad_clicks"></a>Clicks | `ad_clicks` | Ads opened (`rc_ads_ad_opened`). |
| <a id="ad_ctr"></a>CTR | `ad_ctr` | Clicks ÷ impressions. |
| <a id="ad_arpdau"></a>ARPDAU (Ad Users) | `ad_arpdau` | Ad revenue ÷ the sum, over the period's days, of that day's ad-monetized customers. |

### LTV

| Chart | API name | Definition |
|---|---|---|
| <a id="cohort_explorer"></a>Cohort Explorer | `cohort_explorer` | Customers grouped by `cohorting_date` (`new_customers`: first seen; `initial_conversions`: first purchase or trial; `new_paying_customers`: first payment), measured month by month of each customer's own age with `cohort_measure`: revenue, revenue net of taxes, proceeds, realized LTV (cumulative), realized LTV per customer, retained subscriptions (paid access at the end of the month) or subscriptions set to renew. |
| <a id="ltv_per_customer"></a>Realized LTV per Customer | `ltv_per_customer` | Revenue of each period's new customers from day 0 through day *N* of their life (selector `customer_lifetime`), minus refunds inside that window, ÷ new customers. |
| <a id="ltv_per_paying_customer"></a>Realized LTV per Paying Customer | `ltv_per_paying_customer` | The same revenue ÷ the new customers whose first payment fell inside the window and was not refunded inside it. |
| <a id="prediction_explorer"></a>Prediction Explorer | `prediction_explorer` | Realized LTV per customer by cohort; months a cohort has not reached yet are predicted with the chain-ladder method: each month grows by the average growth older cohorts showed between the same two months. Predicted values carry `predicted: true`. Up to 24 months. |

### Customers

| Chart | API name | Definition |
|---|---|---|
| <a id="customers_new"></a>New Customers | `customers_new` | Customers whose cohort date (the earlier of first seen and first purchase) falls in the period. Aliases of one customer count once. |
| <a id="customers_active"></a>Active Customers | `customers_active` | Customers whose app called RevenueDot on at least one day of the period, counted once. |

### Conversion

| Chart | API name | Definition |
|---|---|---|
| <a id="initial_conversion"></a>Initial Conversion | `initial_conversion` | Share of each period's new customers who started a trial or bought anything within the conversion timeframe (selector `conversion_timeframe`: day 0, 3, 7, 14 or 30 days, or unbounded; day 0 is the cohort date). |
| <a id="trial_conversion"></a>Trial Conversion Funnel | `trial_conversion` | Each period's new customers, how many started a trial, and where each customer's trial ended up, counted once at the best outcome: converted, set to convert, set to cancel, billing issue, abandoned. |
| <a id="trial_conversion_rate"></a>Trial Conversion Rate | `trial_conversion_rate` | Customers who started a trial in the period (once each), how many converted to paid, and how many are still in their trial. |
| <a id="conversion_to_paying"></a>Conversion to Paying | `conversion_to_paying` | Share of each period's new customers whose first payment fell within the conversion timeframe and was not refunded within it. |

### Paywalls

| Chart | API name | Definition |
|---|---|---|
| <a id="paywall_encounter"></a>Paywall Encounter | `paywall_encounter` | Share of each period's new customers who saw a paywall (`paywall_impression`) on day 0, and by day 1, 3, 7 and 14. |
| <a id="paywall_conversion"></a>Paywall Conversion | `paywall_conversion` | Customer–paywall pairs by first impression. Initial conversions are trials or purchases on calendar days 0 to 3; paid conversions, trial starts and trial conversions follow from them. |
| <a id="paywall_ltv"></a>Paywall LTV | `paywall_ltv` | Revenue, within the lifetime window, of customers whose initial conversion followed a paywall, per paywall viewer and per conversion. |
| <a id="paywall_abandonment"></a>Paywall Abandonment | `paywall_abandonment` | Pairs with no initial conversion on days 0 to 3: bounces (no purchase started) and purchase cancellations (a purchase started, none completed). |

### Trials

| Chart | API name | Definition |
|---|---|---|
| <a id="trials"></a>Active Trials | `trials` | Free trials with access at the end of each period, whatever their auto-renew state. |
| <a id="trials_movement"></a>Active Trials Movement | `trials_movement` | New trials − trials that converted − trials that ended without converting. |
| <a id="trials_new"></a>New Trials | `trials_new` | Free trials started in each period. |
| <a id="trial_cancellation"></a>Trial Cancellation Rate | `trial_cancellation` | Customers who started a trial in the period. A trial is cancelled when it ended without converting and the customer's last opt-out during the trial fell within the selected time from its start (selector `cancellation_timeframe`: 1, 2, 5 or 7 days, or unbounded). The other non-converting trials ended with a billing issue or just elapsed. |

### Churn and refunds

| Chart | API name | Definition |
|---|---|---|
| <a id="churn"></a>Churn | `churn` | Paid subscriptions that ended in the period (product-change replacements included, billing recoveries subtracted) ÷ paid subscriptions active when the period started. It can be negative or above 100%. |
| <a id="refund_rate"></a>Refund Rate | `refund_rate` | Paid transactions of each period and the share that has been refunded since. |
| <a id="refunds"></a>Refunds | `refunds` | Money refunded and refunded transactions by refund date, net of reversed refunds. |
| <a id="refund_request"></a>Refund Request Outcomes | `refund_request` | App Store refund requests (`CONSUMPTION_REQUEST` notifications) received in the period, by outcome: granted, declined, reversed, or no resolution yet. A request with no grant after 2 days counts as declined. |
| <a id="play_store_cancel_reasons"></a>Play Store Cancel Reasons | `play_store_cancel_reasons` | Google Play subscriptions cancelled in the period, by the customer's answer to Google's cancel survey. RevenueDot name; RevenueCat shows this chart only in its dashboard. |
| <a id="customer_center_survey_responses"></a>Customer Center Survey Responses | `customer_center_survey_responses` | Customer Center survey answers (`customer_center_survey_option_chosen`) per option. RevenueDot name; RevenueCat shows this chart only in its dashboard. |

### Retention

| Chart | API name | Definition |
|---|---|---|
| <a id="app_store_save_outcomes"></a>App Store Save Outcomes | `app_store_save_outcomes` | Saves after Apple retention messages, by outcome. Always zero: RevenueDot does not use Apple's Retention Messaging API yet. Listed in the API, not in the dashboard rail. |

## Filters and segments

Filter and segment by app, store, product, product duration, offering, country (the purchase's storefront, else the customer's last country), platform, app version and the customer's attribution (media source, campaign, ad group, keyword, ad and creative; see [Attribution](attribution.md)); paywall charts also by paywall, and the Customer Center chart by survey option. Customers without attribution show as "No attribution" (an empty value in the API). A filter on a purchase dimension (store, product …) does not change the new-customer counts that conversion charts divide by. A segmented chart shows the five largest values, then "Other" and the total.

## Chart types

Pick **Line**, **Stacked area**, **Column**, **Stacked column** or **100% stacked column** in the chart type menu. Line charts open as lines; bar charts open as columns, stacked when the chart is segmented or stacks its measures (MRR Movement, Active Subscriptions Movement). Stacked types need two or more series, so segment the chart to stack it; with one series they are disabled. Stacks split by sign: positive values build up from zero and negative ones (churned MRR) build down. The 100% stacked column shows each series as its share of the period's total; the table and the tooltip keep the real values. The type is kept in the page's address and in saved charts.

## Customers behind a chart

The **Customers** tab under every chart lists up to 100 customers who make up its numbers for the current range, resolution, filters, segment and Sandbox switch, the most recent first. Each row shows the app user ID (it opens the customer page), the subscription status, store, product, the date of the customer's latest contribution and their part of the chart's number. **Export all** downloads every one of them as CSV (up to 100,000 rows).

The listed values add up to the chart. Flows and cohorts add up over the range; snapshots such as MRR, ARR and Active Subscriptions add up to the last period, so customers who were active earlier in the range are listed with 0. Ad revenue from app users who never became customers belongs to no one, and the tab shows it as one amount. Two ad charts list something else: Ad Monetized Customers lists each customer's days with ad revenue, which add up to the sum of the daily counts, and ARPDAU, a ratio, lists each customer's ad revenue, which adds up to the Ad Revenue chart.

| Charts | Who is listed | Their value |
|---|---|---|
| Revenue | Customers with a purchase, renewal, one-time purchase, refund or ad revenue in the range | Their revenue (or proceeds) |
| MRR, ARR, Active Subscriptions, Active Trials, Subscription Status | Customers with a paid subscription (a trial for Active Trials) at the end of any period | Their MRR, ARR or count at the end of the last period |
| MRR Movement, Active Subscriptions Movement | Customers with a paid start, end, lapse, recovery or price change | Their net movement |
| Paid Subscriptions, Churn | Paid starts; paid subscriptions that ended | The count |
| Non-subscription Purchases, Refund Rate, Refunds | One-time purchases; paid transactions; refunds by refund date | The count; refunded money |
| Ad charts | Customers with the chart's ad events | Ad revenue, impressions, clicks or requests |
| New Customers, LTV, Initial Conversion, Conversion to Paying, Trial Conversion Funnel, Paywall Encounter, Cohort and Prediction Explorer | Customers whose cohort date is in the range | 1, their revenue in the lifetime window, or 1 when they converted |
| Active Customers | Customers with app activity | Periods they were active in |
| Trial Conversion Rate, Trial Cancellation Rate | Customers by their first trial start in each period | 1 when converted or cancelled |
| Paywall charts | Customer and paywall pairs by first view | Conversions, revenue or views |
| Subscription Retention | Subscriptions by paid start | The count |
| Refund Request Outcomes, Play Store Cancel Reasons, Customer Center Survey Responses | Requests, cancellations, answers | The count |

Through the API, with the chart's own parameters:

```bash
curl -H "Authorization: Bearer $REVENUEDOT_SECRET_KEY" \
  "https://api.revenuedot.app/v2/projects/$PROJECT_ID/charts/revenue/customers?resolution=month&start_date=2026-07-01&end_date=2026-09-30"
```

The answer has `items` (`app_user_id`, `status`, `store`, `product_id`, `contributed_at`, `value`, `segment`), `total_count`, the measure in `value`, `sum` (`total` or `last`) and `unattributed_value`. Add `format=csv` for every customer as CSV. The key needs `charts_metrics:charts:read` and `customer_information:customers:read`.

## Annotations

Mark launches, price changes and campaigns on your charts. Click a period on any chart to select it, or drag across several (Shift+click works too), then press **+** above the selection. Give the annotation a title and, if you like, a description. It shows on every chart of the project whose range includes it: a square marker with a dashed line for one day, a light band for a range, and the title when you point at the marker. The **Annotations** tab lists the annotations in the chart's range, with edit and delete; clicking a marker opens the tab on that annotation.

Admins and developers add, edit and delete annotations; Viewers see them. Every change is in the audit log. Through the API: `GET` and `POST /v2/projects/{project_id}/chart_annotations` (filter with `start_date` and `end_date`), and `GET`, `PATCH` and `DELETE /v2/projects/{project_id}/chart_annotations/{annotation_id}`. Chart data with `include_annotations=true` returns the annotations in its range in RevenueCat's format.

## Share a chart

**…** > **Share preview** makes a public link to a picture of the chart as you see it: its type, range, resolution, filters, segment and Sandbox switch. The link opens a page with the chart, its summary numbers and the values table, and its preview image shows in Slack, X, LinkedIn and email. The numbers are those of the moment you made the link, and the page holds only the chart's numbers and labels, never customer data. Anyone with the link can open it, so share it with care.

The same dialog lists the chart's active links. Copy or open one, or revoke it: a revoked link answers "This link was revoked" at once. Admins and developers make and revoke links; Viewers can open them. Through the API: `GET` and `POST /v2/projects/{project_id}/chart_shares` and `DELETE /v2/projects/{project_id}/chart_shares/{share_id}`.

## Refresh and Ask AI

Charts are computed when you open them. **Refresh** computes the chart, its Customers and Annotations tabs again; the line under the chart says when. **Ask AI** opens [RevenueDot AI](revenuedot-ai.md) with the chart mentioned and a question ready to send. The assistant reads the chart with the same range, resolution, segment, filters and Sandbox switch you were looking at.

## Compare and save charts

- **Export CSV** in the **…** menu downloads the table as shown.
- **Compare to previous period** draws the window of the same length that ends the day before the current one, at the same resolution, as a dashed grey line. The table gets a "Previous period" row, and each summary number shows its change. A segmented chart compares its total. Cohort tables have no comparison.
- **Save** stores the chart with its view: the range or dates, resolution, segment, filters, selectors, sandbox switch, comparison, chart type and the measure shown. Saved charts are listed at the top of the chart list for everyone in the project. Opening one brings the view back; save again to update it or to save a copy. Through the API: `GET` and `POST /v2/projects/{project_id}/saved_charts`, and `PATCH` and `DELETE /v2/projects/{project_id}/saved_charts/{saved_chart_id}`.

## Use the API

```bash
curl -H "Authorization: Bearer $REVENUEDOT_SECRET_KEY" \
  "https://api.revenuedot.app/v2/projects/$PROJECT_ID/charts/mrr?resolution=month&start_date=2026-01-01&end_date=2026-06-30"
```

- `resolution`: `0`–`4` or `day`, `week`, `month`, `quarter`, `year`.
- `filters`: `[{"name":"store","values":["app_store"]}]`; `segment` and `limit_num_segments`; `selectors`: `{"revenue_type":"proceeds"}`.
- `GET .../charts/{chart_name}/options` lists the resolutions, segments, filters with the values in your data, and the selectors.
- Time series return `values` as `{cohort, measure, value, incomplete}` with `cohort` the period start in Unix seconds; cohort tables return `{cohort, period, value}` with `periods[0]` the cohort size. Reference: [Charts API](../../api/rest-v2.md#charts).

The key needs the `charts_metrics:charts:read` permission.

## SQL for the core charts

RevenueDot computes charts from its own tables. These PostgreSQL queries reproduce the core charts from the same tables, and RevenueDot's tests check that they return the API's numbers. Run one against your database with psql variables (`end_date` is exclusive):

```bash
psql "$DATABASE_URL" -v project_id=proj_123 -v resolution=month -v start_date=2026-01-01 \
  -v end_date=2026-07-01 -v now="$(date -u +%FT%TZ)" -f mrr.sql
```

### Revenue and transactions query

```sql
-- Revenue: purchases, renewals and one-time purchases, minus refunds on the refund date, plus ad revenue reported in USD.
-- Transactions: paid purchases, renewals and one-time purchases (refunds do not reduce it).
WITH periods AS (
  SELECT p AS period, LEAST(p + ('1 ' || :'resolution')::interval, :'end_date'::timestamptz AT TIME ZONE 'UTC', :'now'::timestamptz AT TIME ZONE 'UTC') AS period_end
  FROM generate_series(date_trunc(:'resolution', :'start_date'::timestamptz AT TIME ZONE 'UTC'),
                       (:'end_date'::timestamptz AT TIME ZONE 'UTC') - interval '1 microsecond',
                       ('1 ' || :'resolution')::interval) AS p
),
ledger AS (
  SELECT t.*, t.purchased_at AT TIME ZONE 'UTC' AS at
  FROM transactions t
  WHERE t.project_id = :'project_id' AND NOT t.is_sandbox AND t.store <> 'promotional'
    AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.customer_id = t.customer_id AND s.store = t.store
                    AND s.product_identifier = t.product_identifier AND s.ownership_type = 'FAMILY_SHARED')
),
money AS (
  SELECT at, revenue_usd AS usd, kind IN ('purchase', 'renewal', 'one_time') AS is_tx FROM ledger WHERE kind <> 'trial'
  UNION ALL
  SELECT occurred_at AT TIME ZONE 'UTC', (payload->>'revenue_micros')::numeric / 1000000, false FROM sdk_events
  WHERE project_id = :'project_id' AND NOT is_sandbox AND type = 'rc_ads_ad_revenue' AND coalesce(payload->>'currency', 'USD') = 'USD'
)
SELECT pe.period, round(coalesce(sum(m.usd), 0)::numeric, 2) AS revenue, count(m.*) FILTER (WHERE m.is_tx) AS transactions
FROM periods pe
LEFT JOIN money m ON m.at >= GREATEST(pe.period, :'start_date'::timestamptz AT TIME ZONE 'UTC') AND m.at < pe.period_end
GROUP BY pe.period ORDER BY pe.period;
```

### Non-subscription purchases query

```sql
-- One-time purchases (consumables, non-consumables, lifetime) per period.
WITH periods AS (
  SELECT p AS period, LEAST(p + ('1 ' || :'resolution')::interval, :'end_date'::timestamptz AT TIME ZONE 'UTC', :'now'::timestamptz AT TIME ZONE 'UTC') AS period_end
  FROM generate_series(date_trunc(:'resolution', :'start_date'::timestamptz AT TIME ZONE 'UTC'),
                       (:'end_date'::timestamptz AT TIME ZONE 'UTC') - interval '1 microsecond',
                       ('1 ' || :'resolution')::interval) AS p
),
ledger AS (
  SELECT t.*, t.purchased_at AT TIME ZONE 'UTC' AS at
  FROM transactions t
  WHERE t.project_id = :'project_id' AND NOT t.is_sandbox AND t.store <> 'promotional'
    AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.customer_id = t.customer_id AND s.store = t.store
                    AND s.product_identifier = t.product_identifier AND s.ownership_type = 'FAMILY_SHARED')
)
SELECT pe.period, count(l.*) AS purchases
FROM periods pe
LEFT JOIN ledger l ON l.kind = 'one_time' AND l.at >= GREATEST(pe.period, :'start_date'::timestamptz AT TIME ZONE 'UTC') AND l.at < pe.period_end
GROUP BY pe.period ORDER BY pe.period;
```

### Refunds query

```sql
-- Money refunded and refunded transactions by refund date, net of reversed refunds.
WITH periods AS (
  SELECT p AS period, LEAST(p + ('1 ' || :'resolution')::interval, :'end_date'::timestamptz AT TIME ZONE 'UTC', :'now'::timestamptz AT TIME ZONE 'UTC') AS period_end
  FROM generate_series(date_trunc(:'resolution', :'start_date'::timestamptz AT TIME ZONE 'UTC'),
                       (:'end_date'::timestamptz AT TIME ZONE 'UTC') - interval '1 microsecond',
                       ('1 ' || :'resolution')::interval) AS p
),
ledger AS (
  SELECT t.*, t.purchased_at AT TIME ZONE 'UTC' AS at
  FROM transactions t
  WHERE t.project_id = :'project_id' AND NOT t.is_sandbox AND t.store <> 'promotional'
    AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.customer_id = t.customer_id AND s.store = t.store
                    AND s.product_identifier = t.product_identifier AND s.ownership_type = 'FAMILY_SHARED')
)
SELECT pe.period,
       round(coalesce(-sum(l.revenue_usd), 0)::numeric, 2) AS refunded_revenue,
       count(l.*) FILTER (WHERE l.kind = 'refund') - count(l.*) FILTER (WHERE l.kind = 'refund_reversal') AS refunded_transactions
FROM periods pe
LEFT JOIN ledger l ON l.kind IN ('refund', 'refund_reversal') AND l.at >= GREATEST(pe.period, :'start_date'::timestamptz AT TIME ZONE 'UTC') AND l.at < pe.period_end
GROUP BY pe.period ORDER BY pe.period;
```

### New trials query

```sql
-- Free trials started per period.
WITH periods AS (
  SELECT p AS period, LEAST(p + ('1 ' || :'resolution')::interval, :'end_date'::timestamptz AT TIME ZONE 'UTC', :'now'::timestamptz AT TIME ZONE 'UTC') AS period_end
  FROM generate_series(date_trunc(:'resolution', :'start_date'::timestamptz AT TIME ZONE 'UTC'),
                       (:'end_date'::timestamptz AT TIME ZONE 'UTC') - interval '1 microsecond',
                       ('1 ' || :'resolution')::interval) AS p
),
ledger AS (
  SELECT t.*, t.purchased_at AT TIME ZONE 'UTC' AS at
  FROM transactions t
  WHERE t.project_id = :'project_id' AND NOT t.is_sandbox AND t.store <> 'promotional'
    AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.customer_id = t.customer_id AND s.store = t.store
                    AND s.product_identifier = t.product_identifier AND s.ownership_type = 'FAMILY_SHARED')
)
SELECT pe.period, count(l.*) AS new_trials
FROM periods pe
LEFT JOIN ledger l ON l.kind = 'trial' AND l.at >= GREATEST(pe.period, :'start_date'::timestamptz AT TIME ZONE 'UTC') AND l.at < pe.period_end
GROUP BY pe.period ORDER BY pe.period;
```

### New customers query

```sql
-- Customers whose cohort date (the earlier of first seen and first purchase) falls in the period.
WITH periods AS (
  SELECT p AS period, LEAST(p + ('1 ' || :'resolution')::interval, :'end_date'::timestamptz AT TIME ZONE 'UTC', :'now'::timestamptz AT TIME ZONE 'UTC') AS period_end
  FROM generate_series(date_trunc(:'resolution', :'start_date'::timestamptz AT TIME ZONE 'UTC'),
                       (:'end_date'::timestamptz AT TIME ZONE 'UTC') - interval '1 microsecond',
                       ('1 ' || :'resolution')::interval) AS p
),
ledger AS (
  SELECT t.*, t.purchased_at AT TIME ZONE 'UTC' AS at
  FROM transactions t
  WHERE t.project_id = :'project_id' AND NOT t.is_sandbox AND t.store <> 'promotional'
    AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.customer_id = t.customer_id AND s.store = t.store
                    AND s.product_identifier = t.product_identifier AND s.ownership_type = 'FAMILY_SHARED')
),
cohorts AS (
  SELECT c.id, LEAST(c.first_seen, (SELECT min(purchased_at) FROM ledger l WHERE l.customer_id = c.id)) AT TIME ZONE 'UTC' AS cohort_at
  FROM customers c WHERE c.project_id = :'project_id'
)
SELECT pe.period, count(c.*) AS new_customers
FROM periods pe
LEFT JOIN cohorts c ON c.cohort_at >= GREATEST(pe.period, :'start_date'::timestamptz AT TIME ZONE 'UTC') AND c.cohort_at < pe.period_end
GROUP BY pe.period ORDER BY pe.period;
```

### Active subscriptions query

```sql
-- Paid subscriptions with access at the end of each period (cancelled ones count until they expire).
WITH periods AS (
  SELECT p AS period, LEAST(p + ('1 ' || :'resolution')::interval, :'end_date'::timestamptz AT TIME ZONE 'UTC', :'now'::timestamptz AT TIME ZONE 'UTC') AS period_end
  FROM generate_series(date_trunc(:'resolution', :'start_date'::timestamptz AT TIME ZONE 'UTC'),
                       (:'end_date'::timestamptz AT TIME ZONE 'UTC') - interval '1 microsecond',
                       ('1 ' || :'resolution')::interval) AS p
),
ledger AS (
  SELECT t.*, t.purchased_at AT TIME ZONE 'UTC' AS at
  FROM transactions t
  WHERE t.project_id = :'project_id' AND NOT t.is_sandbox AND t.store <> 'promotional'
    AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.customer_id = t.customer_id AND s.store = t.store
                    AND s.product_identifier = t.product_identifier AND s.ownership_type = 'FAMILY_SHARED')
),
refunds AS (
  SELECT store, store_transaction_id, max(purchased_at) AS refunded_at
  FROM ledger WHERE kind IN ('refund', 'refund_reversal')
  GROUP BY store, store_transaction_id
  HAVING count(*) FILTER (WHERE kind = 'refund') > count(*) FILTER (WHERE kind = 'refund_reversal')
),
sub_periods AS (
  SELECT l.customer_id, l.store, coalesce(l.app_id, '') AS app_id, l.product_identifier, l.kind, l.purchased_at AS starts_at,
         LEAST(GREATEST(coalesce(l.expires_at, 'infinity'),
                        CASE WHEN s.billing_issues_detected_at IS NOT NULL AND l.expires_at >= s.expires_date - interval '1 hour'
                             THEN s.grace_period_expires_date END),
               coalesce(r.refunded_at, 'infinity')) AS ends_at,
         l.revenue_usd,
         coalesce(
           CASE
             WHEN p.duration ~ '^P\d+Y$' THEN 1.0 / (12 * substring(p.duration from '\d+')::numeric)
             WHEN p.duration ~ '^P\d+M$' THEN 1.0 / substring(p.duration from '\d+')::numeric
             WHEN p.duration ~ '^P\d+W$' THEN 4.0 / substring(p.duration from '\d+')::numeric
             WHEN p.duration ~ '^P\d+D$' THEN 30.0 / substring(p.duration from '\d+')::numeric
           END,
           30.0 / GREATEST(1, extract(epoch FROM l.expires_at - l.purchased_at) / 86400)) AS monthly_factor
  FROM ledger l
  LEFT JOIN refunds r ON r.store = l.store AND r.store_transaction_id = l.store_transaction_id
  LEFT JOIN subscriptions s ON s.customer_id = l.customer_id AND s.store = l.store AND s.product_identifier = l.product_identifier
  LEFT JOIN LATERAL (
    SELECT duration FROM products p WHERE p.project_id = l.project_id
      AND (p.store_identifier = l.product_identifier OR split_part(p.store_identifier, ':', 1) = l.product_identifier)
    ORDER BY (p.app_id = l.app_id) DESC, (p.store_identifier = l.product_identifier) DESC LIMIT 1
  ) p ON true
  WHERE l.kind IN ('trial', 'purchase', 'renewal')
),
snapshot AS (
  SELECT DISTINCT ON (pe.period, sp.customer_id, sp.store, sp.app_id) pe.period, sp.kind, sp.revenue_usd * sp.monthly_factor AS mrr
  FROM periods pe
  JOIN sub_periods sp ON sp.starts_at <= (pe.period_end - interval '1 millisecond') AT TIME ZONE 'UTC'
                     AND sp.ends_at > (pe.period_end - interval '1 millisecond') AT TIME ZONE 'UTC'
  ORDER BY pe.period, sp.customer_id, sp.store, sp.app_id, sp.starts_at DESC
)
SELECT pe.period, count(s.*) FILTER (WHERE s.kind <> 'trial') AS actives
FROM periods pe LEFT JOIN snapshot s ON s.period = pe.period
GROUP BY pe.period ORDER BY pe.period;
```

### Active trials query

```sql
-- Free trials with access at the end of each period.
WITH periods AS (
  SELECT p AS period, LEAST(p + ('1 ' || :'resolution')::interval, :'end_date'::timestamptz AT TIME ZONE 'UTC', :'now'::timestamptz AT TIME ZONE 'UTC') AS period_end
  FROM generate_series(date_trunc(:'resolution', :'start_date'::timestamptz AT TIME ZONE 'UTC'),
                       (:'end_date'::timestamptz AT TIME ZONE 'UTC') - interval '1 microsecond',
                       ('1 ' || :'resolution')::interval) AS p
),
ledger AS (
  SELECT t.*, t.purchased_at AT TIME ZONE 'UTC' AS at
  FROM transactions t
  WHERE t.project_id = :'project_id' AND NOT t.is_sandbox AND t.store <> 'promotional'
    AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.customer_id = t.customer_id AND s.store = t.store
                    AND s.product_identifier = t.product_identifier AND s.ownership_type = 'FAMILY_SHARED')
),
refunds AS (
  SELECT store, store_transaction_id, max(purchased_at) AS refunded_at
  FROM ledger WHERE kind IN ('refund', 'refund_reversal')
  GROUP BY store, store_transaction_id
  HAVING count(*) FILTER (WHERE kind = 'refund') > count(*) FILTER (WHERE kind = 'refund_reversal')
),
sub_periods AS (
  SELECT l.customer_id, l.store, coalesce(l.app_id, '') AS app_id, l.product_identifier, l.kind, l.purchased_at AS starts_at,
         LEAST(GREATEST(coalesce(l.expires_at, 'infinity'),
                        CASE WHEN s.billing_issues_detected_at IS NOT NULL AND l.expires_at >= s.expires_date - interval '1 hour'
                             THEN s.grace_period_expires_date END),
               coalesce(r.refunded_at, 'infinity')) AS ends_at,
         l.revenue_usd,
         coalesce(
           CASE
             WHEN p.duration ~ '^P\d+Y$' THEN 1.0 / (12 * substring(p.duration from '\d+')::numeric)
             WHEN p.duration ~ '^P\d+M$' THEN 1.0 / substring(p.duration from '\d+')::numeric
             WHEN p.duration ~ '^P\d+W$' THEN 4.0 / substring(p.duration from '\d+')::numeric
             WHEN p.duration ~ '^P\d+D$' THEN 30.0 / substring(p.duration from '\d+')::numeric
           END,
           30.0 / GREATEST(1, extract(epoch FROM l.expires_at - l.purchased_at) / 86400)) AS monthly_factor
  FROM ledger l
  LEFT JOIN refunds r ON r.store = l.store AND r.store_transaction_id = l.store_transaction_id
  LEFT JOIN subscriptions s ON s.customer_id = l.customer_id AND s.store = l.store AND s.product_identifier = l.product_identifier
  LEFT JOIN LATERAL (
    SELECT duration FROM products p WHERE p.project_id = l.project_id
      AND (p.store_identifier = l.product_identifier OR split_part(p.store_identifier, ':', 1) = l.product_identifier)
    ORDER BY (p.app_id = l.app_id) DESC, (p.store_identifier = l.product_identifier) DESC LIMIT 1
  ) p ON true
  WHERE l.kind IN ('trial', 'purchase', 'renewal')
),
snapshot AS (
  SELECT DISTINCT ON (pe.period, sp.customer_id, sp.store, sp.app_id) pe.period, sp.kind, sp.revenue_usd * sp.monthly_factor AS mrr
  FROM periods pe
  JOIN sub_periods sp ON sp.starts_at <= (pe.period_end - interval '1 millisecond') AT TIME ZONE 'UTC'
                     AND sp.ends_at > (pe.period_end - interval '1 millisecond') AT TIME ZONE 'UTC'
  ORDER BY pe.period, sp.customer_id, sp.store, sp.app_id, sp.starts_at DESC
)
SELECT pe.period, count(s.*) FILTER (WHERE s.kind = 'trial') AS trials
FROM periods pe LEFT JOIN snapshot s ON s.period = pe.period
GROUP BY pe.period ORDER BY pe.period;
```

### MRR query

```sql
-- Monthly recurring revenue at the end of each period: each active paid subscription's USD price times its
-- duration's factor (1 day ×30, 1 week ×4, 1 month ×1, 3 months ×1/3, 1 year ×1/12 …).
WITH periods AS (
  SELECT p AS period, LEAST(p + ('1 ' || :'resolution')::interval, :'end_date'::timestamptz AT TIME ZONE 'UTC', :'now'::timestamptz AT TIME ZONE 'UTC') AS period_end
  FROM generate_series(date_trunc(:'resolution', :'start_date'::timestamptz AT TIME ZONE 'UTC'),
                       (:'end_date'::timestamptz AT TIME ZONE 'UTC') - interval '1 microsecond',
                       ('1 ' || :'resolution')::interval) AS p
),
ledger AS (
  SELECT t.*, t.purchased_at AT TIME ZONE 'UTC' AS at
  FROM transactions t
  WHERE t.project_id = :'project_id' AND NOT t.is_sandbox AND t.store <> 'promotional'
    AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.customer_id = t.customer_id AND s.store = t.store
                    AND s.product_identifier = t.product_identifier AND s.ownership_type = 'FAMILY_SHARED')
),
refunds AS (
  SELECT store, store_transaction_id, max(purchased_at) AS refunded_at
  FROM ledger WHERE kind IN ('refund', 'refund_reversal')
  GROUP BY store, store_transaction_id
  HAVING count(*) FILTER (WHERE kind = 'refund') > count(*) FILTER (WHERE kind = 'refund_reversal')
),
sub_periods AS (
  SELECT l.customer_id, l.store, coalesce(l.app_id, '') AS app_id, l.product_identifier, l.kind, l.purchased_at AS starts_at,
         LEAST(GREATEST(coalesce(l.expires_at, 'infinity'),
                        CASE WHEN s.billing_issues_detected_at IS NOT NULL AND l.expires_at >= s.expires_date - interval '1 hour'
                             THEN s.grace_period_expires_date END),
               coalesce(r.refunded_at, 'infinity')) AS ends_at,
         l.revenue_usd,
         coalesce(
           CASE
             WHEN p.duration ~ '^P\d+Y$' THEN 1.0 / (12 * substring(p.duration from '\d+')::numeric)
             WHEN p.duration ~ '^P\d+M$' THEN 1.0 / substring(p.duration from '\d+')::numeric
             WHEN p.duration ~ '^P\d+W$' THEN 4.0 / substring(p.duration from '\d+')::numeric
             WHEN p.duration ~ '^P\d+D$' THEN 30.0 / substring(p.duration from '\d+')::numeric
           END,
           30.0 / GREATEST(1, extract(epoch FROM l.expires_at - l.purchased_at) / 86400)) AS monthly_factor
  FROM ledger l
  LEFT JOIN refunds r ON r.store = l.store AND r.store_transaction_id = l.store_transaction_id
  LEFT JOIN subscriptions s ON s.customer_id = l.customer_id AND s.store = l.store AND s.product_identifier = l.product_identifier
  LEFT JOIN LATERAL (
    SELECT duration FROM products p WHERE p.project_id = l.project_id
      AND (p.store_identifier = l.product_identifier OR split_part(p.store_identifier, ':', 1) = l.product_identifier)
    ORDER BY (p.app_id = l.app_id) DESC, (p.store_identifier = l.product_identifier) DESC LIMIT 1
  ) p ON true
  WHERE l.kind IN ('trial', 'purchase', 'renewal')
),
snapshot AS (
  SELECT DISTINCT ON (pe.period, sp.customer_id, sp.store, sp.app_id) pe.period, sp.kind, sp.revenue_usd * sp.monthly_factor AS mrr
  FROM periods pe
  JOIN sub_periods sp ON sp.starts_at <= (pe.period_end - interval '1 millisecond') AT TIME ZONE 'UTC'
                     AND sp.ends_at > (pe.period_end - interval '1 millisecond') AT TIME ZONE 'UTC'
  ORDER BY pe.period, sp.customer_id, sp.store, sp.app_id, sp.starts_at DESC
)
SELECT pe.period, round(coalesce(sum(s.mrr) FILTER (WHERE s.kind <> 'trial'), 0)::numeric, 2) AS mrr
FROM periods pe LEFT JOIN snapshot s ON s.period = pe.period
GROUP BY pe.period ORDER BY pe.period;
```

## How proceeds are computed
Proceeds are revenue minus the store's commission, worked out per transaction when the chart is read:

| Store | Commission |
|---|---|
| App Store, Mac App Store | 30%; 15% inside the app's [Small Business Program](app-store.md#apple-small-business-program) dates |
| Google Play | Subscriptions 15%; one-time purchases 15% on the first $1M a year, then 30% ([details](google-play.md#google-play-service-fee)) |
| Amazon Appstore | 30%; 20% inside the app's [Small Business Accelerator](amazon-appstore.md#small-business-accelerator-program) dates |
| Galaxy Store | 30% |
| Roku | 20% |
| Paddle | 5% (Paddle's fee) |
| Stripe, Web Billing, Test Store, ads | 0% |

Changing program dates recomputes past proceeds here, in metrics, exports and the REST API. Webhooks and integration events already sent keep the rate they were sent with.

## SQL for the customers behind a chart

These queries list the customers behind four core charts, one row per customer with their part of the chart, and RevenueDot's tests check them against the Customers tab's API. Run them with the same psql variables as above. They count ad revenue reported in USD only; the API also converts ad revenue in other currencies.

### Customers behind revenue query

```sql
-- Each customer's revenue in the range: purchases, renewals and one-time purchases minus refunds on the refund date,
-- plus ad revenue reported in USD for that customer.
WITH ledger AS (
  SELECT t.*, t.purchased_at AT TIME ZONE 'UTC' AS at
  FROM transactions t
  WHERE t.project_id = :'project_id' AND NOT t.is_sandbox AND t.store <> 'promotional'
    AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.customer_id = t.customer_id AND s.store = t.store
                    AND s.product_identifier = t.product_identifier AND s.ownership_type = 'FAMILY_SHARED')
),
money AS (
  SELECT customer_id, at, revenue_usd AS usd FROM ledger WHERE kind <> 'trial'
  UNION ALL
  SELECT coalesce(e.customer_id, a.customer_id), e.occurred_at AT TIME ZONE 'UTC', (e.payload->>'revenue_micros')::numeric / 1000000 FROM sdk_events e
  LEFT JOIN customer_aliases a ON a.project_id = e.project_id AND a.app_user_id = e.app_user_id
  WHERE e.project_id = :'project_id' AND NOT e.is_sandbox AND e.type = 'rc_ads_ad_revenue' AND coalesce(e.payload->>'currency', 'USD') = 'USD'
)
SELECT customer_id, round(sum(usd)::numeric, 2) AS revenue
FROM money
WHERE customer_id IS NOT NULL AND at >= :'start_date'::timestamptz AT TIME ZONE 'UTC' AND at < :'end_date'::timestamptz AT TIME ZONE 'UTC'
GROUP BY customer_id ORDER BY customer_id;
```

### Customers behind new customers query

```sql
-- Customers whose cohort date (the earlier of first seen and first purchase) is in the range.
WITH ledger AS (
  SELECT t.*, t.purchased_at AT TIME ZONE 'UTC' AS at
  FROM transactions t
  WHERE t.project_id = :'project_id' AND NOT t.is_sandbox AND t.store <> 'promotional'
    AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.customer_id = t.customer_id AND s.store = t.store
                    AND s.product_identifier = t.product_identifier AND s.ownership_type = 'FAMILY_SHARED')
),
cohorts AS (
  SELECT c.id, LEAST(c.first_seen, (SELECT min(purchased_at) FROM ledger l WHERE l.customer_id = c.id)) AT TIME ZONE 'UTC' AS cohort_at
  FROM customers c WHERE c.project_id = :'project_id'
)
SELECT id AS customer_id, 1 AS new_customers FROM cohorts
WHERE cohort_at >= :'start_date'::timestamptz AT TIME ZONE 'UTC' AND cohort_at < :'end_date'::timestamptz AT TIME ZONE 'UTC'
ORDER BY id;
```

### Customers behind new trials query

```sql
-- Free trials each customer started in the range.
WITH ledger AS (
  SELECT t.*, t.purchased_at AT TIME ZONE 'UTC' AS at
  FROM transactions t
  WHERE t.project_id = :'project_id' AND NOT t.is_sandbox AND t.store <> 'promotional'
    AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.customer_id = t.customer_id AND s.store = t.store
                    AND s.product_identifier = t.product_identifier AND s.ownership_type = 'FAMILY_SHARED')
)
SELECT customer_id, count(*) AS new_trials FROM ledger
WHERE kind = 'trial' AND at >= :'start_date'::timestamptz AT TIME ZONE 'UTC' AND at < :'end_date'::timestamptz AT TIME ZONE 'UTC'
GROUP BY customer_id ORDER BY customer_id;
```

### Customers behind MRR query

```sql
-- Each customer's MRR at the end of the range's last period (the chart's last value).
WITH periods AS (
  SELECT p AS period, LEAST(p + ('1 ' || :'resolution')::interval, :'end_date'::timestamptz AT TIME ZONE 'UTC', :'now'::timestamptz AT TIME ZONE 'UTC') AS period_end
  FROM generate_series(date_trunc(:'resolution', :'start_date'::timestamptz AT TIME ZONE 'UTC'),
                       (:'end_date'::timestamptz AT TIME ZONE 'UTC') - interval '1 microsecond',
                       ('1 ' || :'resolution')::interval) AS p
),
ledger AS (
  SELECT t.*, t.purchased_at AT TIME ZONE 'UTC' AS at
  FROM transactions t
  WHERE t.project_id = :'project_id' AND NOT t.is_sandbox AND t.store <> 'promotional'
    AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.customer_id = t.customer_id AND s.store = t.store
                    AND s.product_identifier = t.product_identifier AND s.ownership_type = 'FAMILY_SHARED')
),
refunds AS (
  SELECT store, store_transaction_id, max(purchased_at) AS refunded_at
  FROM ledger WHERE kind IN ('refund', 'refund_reversal')
  GROUP BY store, store_transaction_id
  HAVING count(*) FILTER (WHERE kind = 'refund') > count(*) FILTER (WHERE kind = 'refund_reversal')
),
sub_periods AS (
  SELECT l.customer_id, l.store, coalesce(l.app_id, '') AS app_id, l.product_identifier, l.kind, l.purchased_at AS starts_at,
         LEAST(GREATEST(coalesce(l.expires_at, 'infinity'),
                        CASE WHEN s.billing_issues_detected_at IS NOT NULL AND l.expires_at >= s.expires_date - interval '1 hour'
                             THEN s.grace_period_expires_date END),
               coalesce(r.refunded_at, 'infinity')) AS ends_at,
         l.revenue_usd,
         coalesce(
           CASE
             WHEN p.duration ~ '^P\d+Y$' THEN 1.0 / (12 * substring(p.duration from '\d+')::numeric)
             WHEN p.duration ~ '^P\d+M$' THEN 1.0 / substring(p.duration from '\d+')::numeric
             WHEN p.duration ~ '^P\d+W$' THEN 4.0 / substring(p.duration from '\d+')::numeric
             WHEN p.duration ~ '^P\d+D$' THEN 30.0 / substring(p.duration from '\d+')::numeric
           END,
           30.0 / GREATEST(1, extract(epoch FROM l.expires_at - l.purchased_at) / 86400)) AS monthly_factor
  FROM ledger l
  LEFT JOIN refunds r ON r.store = l.store AND r.store_transaction_id = l.store_transaction_id
  LEFT JOIN subscriptions s ON s.customer_id = l.customer_id AND s.store = l.store AND s.product_identifier = l.product_identifier
  LEFT JOIN LATERAL (
    SELECT duration FROM products p WHERE p.project_id = l.project_id
      AND (p.store_identifier = l.product_identifier OR split_part(p.store_identifier, ':', 1) = l.product_identifier)
    ORDER BY (p.app_id = l.app_id) DESC, (p.store_identifier = l.product_identifier) DESC LIMIT 1
  ) p ON true
  WHERE l.kind IN ('trial', 'purchase', 'renewal')
),
snapshot AS (
  SELECT DISTINCT ON (pe.period, sp.customer_id, sp.store, sp.app_id) pe.period, sp.customer_id, sp.kind, sp.revenue_usd * sp.monthly_factor AS mrr
  FROM periods pe
  JOIN sub_periods sp ON sp.starts_at <= (pe.period_end - interval '1 millisecond') AT TIME ZONE 'UTC'
                     AND sp.ends_at > (pe.period_end - interval '1 millisecond') AT TIME ZONE 'UTC'
  ORDER BY pe.period, sp.customer_id, sp.store, sp.app_id, sp.starts_at DESC
)
SELECT s.customer_id, round(sum(s.mrr)::numeric, 2) AS mrr
FROM snapshot s
WHERE s.kind <> 'trial' AND s.period = (SELECT max(period) FROM periods)
GROUP BY s.customer_id HAVING sum(s.mrr) > 0 ORDER BY s.customer_id;
```

## Differences from RevenueCat

- **Taxes:** the stores do not report tax per purchase, so "revenue net of taxes" equals revenue and proceeds subtract only the store commission. RevenueCat estimates tax per country ([Taxes and commissions](https://www.revenuecat.com/docs/dashboard-and-metrics/taxes-and-commissions)).
- **Exchange rates:** RevenueDot uses the ECB's daily rates, so converted amounts can differ by a few cents.
- **Paid introductory offers** are counted as direct purchases in Paid Subscriptions.
- **Dimensions** RevenueCat also offers (renewal cycle, offer type, first purchase month, Apple Search Ads claim type, custom attributes) are not available yet; platform and app version are the customer's latest, not their first. Attribution dimensions cover every media source, not only Apple Search Ads.
- **Prediction Explorer** projects from your own cohorts, not from a model trained on many apps.
- **App Store Save Outcomes** is always zero, and refund requests cover the App Store only.
- **Ad revenue in segments:** ad revenue has no product, store or offering, so a Revenue chart segmented by one of them shows it in every segment.
- **Active Customers** counts days of SDK activity from the update that added it; earlier days only know each customer's first and last visit.

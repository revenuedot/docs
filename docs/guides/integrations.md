---
title: How do I send purchase events to Slack, Segment, Amplitude, Mixpanel, PostHog, Firebase, BigQuery, AppsFlyer, Adjust or Meta, and export my data?
description: Connect an integration with its API key, and every purchase, trial, renewal, cancellation and refund is sent to it with RevenueCat's event names, retried on failure and logged. Scheduled exports write CSV or Parquet files to S3, R2 or Google Cloud Storage every day.
---

# How do I send purchase events to Slack, Segment, Amplitude, Mixpanel, PostHog, Firebase, BigQuery, AppsFlyer, Adjust or Meta, and export my data?

Open **Integrations** in the dashboard, pick the tool, paste its key and click **Connect**. From then on, every event your webhooks would get also goes to that tool: purchases, trials, conversions, renewals, cancellations, refunds, billing issues and more. Event names and reserved attributes match [RevenueCat's integrations](https://www.revenuecat.com/docs/integrations/third-party-integrations/amplitude), so charts and funnels built on `rc_initial_purchase_event` keep working after you switch. Failed sends retry after 5, 10, 20, 40 and 80 minutes, and each integration has a delivery log with the request, the answer and **Retry**.

For your own warehouse, a **scheduled data export** writes CSV or Parquet files of transactions, customers, subscriptions and events to Amazon S3, Cloudflare R2 or Google Cloud Storage every day or week.

## How every integration behaves
- **Which events:** each integration gets the events webhooks get, filtered by environment (production, sandbox or both), app and event type, the same filters as [webhooks](webhooks.md). Events a tool never takes (Slack gets no expirations, Meta no cancellations) are not queued.
- **Trials apart from purchases:** an `INITIAL_PURCHASE` with `period_type` `TRIAL` is sent as a trial start, a `RENEWAL` with `is_trial_conversion` as a trial conversion, and a `CANCELLATION` during a trial as a trial cancellation.
- **Revenue:** US dollars, either what the customer paid (**Gross revenue**) or what is left after the store's commission and taxes (**After store commission and taxes**). Refunds are negative where the tool accepts it.
- **Keys stay secret:** API keys and tokens are encrypted on the server and never shown again; the dashboard shows their last four characters.
- **Retries:** timeouts, rate limits (429) and server errors (5xx) retry on the webhook schedule. Any other 4xx fails at once, because sending the same request again cannot work: fix the setting, then click **Replay failed**.
- **Skipped:** when there is nothing to send, the delivery is marked **skipped** with the reason, for example "The customer has no $adjustId attribute". Attributes set after the purchase count: once the app sends the id, **Retry** sends the event.
- **Test:** **Send test event** sends a `TEST` event to that integration only. Attribution tools need the customer's device ids, so give the app user id of a customer whose attributes include them.

### Event names
| What happened | Segment, Amplitude, Mixpanel, PostHog, AppsFlyer | Firebase | Meta |
|---|---|---|---|
| Purchase | `rc_initial_purchase_event` | `purchase` | `Subscribe` |
| Free trial starts | `rc_trial_started_event` | `rc_trial_start` | `StartTrial` |
| Trial converts to paid | `rc_trial_converted_event` | `purchase` | `Subscribe` |
| Renewal | `rc_renewal_event` | `purchase` | `Subscribe` |
| Trial cancelled | `rc_trial_cancelled_event` | `rc_cancellation` | |
| Cancellation or refund | `rc_cancellation_event` | `rc_cancellation` | |
| Auto-renew turned back on | `rc_uncancellation_event` | `rc_uncancellation` | |
| One-time purchase | `rc_non_subscription_purchase_event` | `purchase` | `fb_mobile_purchase` |
| Paused (Google Play) | `rc_subscription_paused_event` | `rc_subscription_paused` | |
| Expiration | `rc_expiration_event` | `rc_expiration` | |
| Billing issue | `rc_billing_issue_event` | `rc_billing_issue` | |
| Product change | `rc_product_change_event` | `rc_product_change` | |

Rename any of them under **Event names** on the integration's page, or with `event_names` in the API. Each event also sets the customer's `rc_subscription_status` (`active`, `trial`, `cancelled`, `cancelled_trial`, `grace_period`, `expired`, `paused` ...) where the tool has profiles.

### Reserved attributes your app sets
Set these with the SDK's attribute calls (`Purchases.shared.attribution.setAppsflyerID(...)`, `setAttributes(["$amplitudeDeviceId": ...])`, `collectDeviceIdentifiers()`). They are the same keys RevenueCat reads.

| Attribute | Used by |
|---|---|
| `$amplitudeUserId`, `$amplitudeDeviceId` | Amplitude's user and device id |
| `$mixpanelDistinctId` | Mixpanel's `distinct_id` |
| `$posthogUserId` | PostHog's `distinct_id` |
| `$firebaseAppInstanceId` | Firebase (required) |
| `$appsflyerId`, `$appsflyerSharingFilter` | AppsFlyer (the id is required) |
| `$adjustId` | Adjust (required) |
| `$fbAnonId`, `$attConsentStatus` | Meta |
| `$idfa`, `$idfv`, `$gpsAdId`, `$amazonAdId`, `$ip`, `$email`, `$phoneNumber` | AppsFlyer, Adjust, Meta (email and phone are SHA-256 hashed for Meta) |

## Connect with the API
Every dashboard action is an API call under `/v2/projects/{project_id}/integrations/partners` with a secret key that has `project_configuration:integrations:read_write`. `GET .../integrations/catalog` lists the fields each tool takes.

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/integrations/partners" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"type":"amplitude","environment":null,"settings":{"api_key":"'"$AMPLITUDE_KEY"'","region":"us"},"event_names":{"initial_purchase":"Subscribed"}}'
```
```json
{"object":"integration","id":"intg_8f2kq0x1m3zv7a","type":"amplitude","name":"Amplitude","enabled":true,"environment":null,"app_id":null,"event_types":[],"settings":{"region":"us"},"secrets":{"api_key":{"configured":true,"hint":"••••9f3a"},"sandbox_api_key":{"configured":false,"hint":null}},"event_names":{"initial_purchase":"Subscribed"},"status":{"last_delivered_at":null,"last_error":null,"consecutive_failures":0},"created_at":1790850000000,"updated_at":1790850000000}
```

- `settings` takes every field of the tool, secrets included. On update, a secret you leave out keeps its saved value and `null` removes it.
- `POST .../partners/{id}` with `{"enabled":false}` pauses it; failed deliveries wait until it is on again.
- `POST .../partners/{id}/test` sends a test event (`{"app_user_id":"user_42"}` to use that customer's attributes).
- `GET .../partners/{id}/deliveries?status=failed` is the delivery log; `POST .../deliveries/{delivery_id}/retry` resends one; `POST .../actions/replay` with `{"status":"failed_and_skipped","since":1790000000000}` resends many.

The full reference is in the [API reference](../../api/extensions.md).

## Slack
1. In Slack, create an app, turn on **Incoming Webhooks**, and add a webhook to the channel you want ([Slack's guide](https://api.slack.com/messaging/webhooks)).
2. In RevenueDot, open **Integrations → Slack**, paste the webhook URL and click **Connect Slack**.

Each purchase, trial start, trial conversion and cancellation, renewal, cancellation, refund, one-time purchase, billing issue and product change posts one message with the customer (linked to their page in the dashboard), the product, the revenue, the store and the country. Sandbox events are labelled; set **Environment** to **Production** to leave them out.

## Segment
1. In Segment, add an **HTTP API** source and copy its write key.
2. In RevenueDot, open **Integrations → Segment**, paste the write key, pick the region (US or EU) and click **Connect Segment**.

Each event is a `track` call (`event` is the event name, `properties` has revenue, currency, product, store, entitlements, dates, transaction ids, the customer's ids and attributes) plus an `identify` call with `rc_subscription_status`. `messageId` is the event id, so Segment drops duplicates. `context.environment` is `production` or `sandbox`. Turn on **Send anonymous app user ids as anonymousId** to send `$RCAnonymousID:` customers as `anonymousId`.

## Amplitude
1. In Amplitude, copy the project's API key (and, for sandbox events, the key of a second project).
2. In RevenueDot, open **Integrations → Amplitude**, paste the key(s), pick US or EU and click **Connect Amplitude**.

Events go through Amplitude's [HTTP V2 API](https://amplitude.com/docs/apis/analytics/http-v2) with `insert_id` = the event id. The user is `$amplitudeUserId` and `$amplitudeDeviceId` when your app set them, otherwise the app user id. Money events carry `revenue`, `price`, `quantity`, `productId` and `revenueType` (`purchase`, `renewal` or `refund`), so they show in Amplitude's revenue charts. Without a sandbox key, sandbox events are skipped.

## Mixpanel
1. In Mixpanel, copy the project token from **Project settings** (and a second project's token for sandbox events). Optionally copy the **API secret** too.
2. In RevenueDot, open **Integrations → Mixpanel**, paste them, pick the data residency (US, EU or India) and click **Connect Mixpanel**.

Each event is tracked with `distinct_id` = `$mixpanelDistinctId` or the app user id, and `$insert_id` from the event id. The profile gets `rc_subscription_status` and, for money, an entry in `$transactions` so Mixpanel's revenue reports work. With the API secret, events go through `/import`, which accepts events of any age (needed to replay old events); without it, Mixpanel only accepts events from the last 5 days.

## PostHog
1. In PostHog, copy the **Project API key** (`phc_...`), and a second project's key for sandbox events.
2. In RevenueDot, open **Integrations → PostHog**, paste the key(s), pick US, EU or **Self-hosted** (then enter your PostHog URL) and click **Connect PostHog**.

Events go to PostHog's capture endpoint with `distinct_id` = `$posthogUserId` or the app user id, and `uuid` = the event id so PostHog drops duplicates. `rc_subscription_status` is set on the person.

## Firebase
1. In Firebase, open **Google Analytics → Admin → Data streams**, pick the iOS or Android app stream, copy its **Firebase App ID** and create a **Measurement Protocol API secret**.
2. In your app, set `$firebaseAppInstanceId` to Firebase Analytics' app instance id: `Purchases.shared.attribution.setFirebaseAppInstanceID(Analytics.appInstanceID())`.
3. In RevenueDot, open **Integrations → Firebase**, enter the app ID and secret for iOS, Android or both, and click **Connect Firebase**.

Purchases, trial conversions, renewals and one-time purchases arrive as GA's `purchase` event (with `value`, `currency`, `items`, `is_renewal` and `is_trial_conversion`), the rest as `rc_*` events, through the [Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4). Choose whether `value` is in US dollars or the customer's currency. Sandbox events are sent with `environment: SANDBOX`. Google accepts every Measurement Protocol request without checking it, so a wrong app ID or secret still shows as delivered: check GA's Realtime report after the test event.

## BigQuery
1. In Google Cloud, create a service account with the **BigQuery Data Editor** role on a dataset, and download its JSON key.
2. In RevenueDot, open **Integrations → BigQuery**, paste the JSON key, enter the dataset (and the table, default `revenuedot_events`) and click **Connect BigQuery**.

Every event, sandbox included, is streamed into the table as one row with `insertId` = the event id. If the table does not exist, RevenueDot creates it, partitioned by day on `event_timestamp`, with these columns: `id`, `type`, `event_timestamp`, `app_user_id`, `original_app_user_id`, `aliases`, `app_id`, `environment`, `store`, `product_id`, `new_product_id`, `period_type`, `purchased_at`, `expiration_at`, `entitlement_ids`, `presented_offering_id`, `transaction_id`, `original_transaction_id`, `country_code`, `currency`, `price_in_purchased_currency`, `price_usd`, `revenue_usd`, `is_trial_conversion`, `cancel_reason`, `expiration_reason` and `payload` (the whole event as JSON).

```sql
SELECT DATE(event_timestamp) AS day, SUM(revenue_usd) AS revenue
FROM `my-project.revenue.revenuedot_events`
WHERE environment = 'PRODUCTION' AND type IN ('INITIAL_PURCHASE', 'RENEWAL', 'NON_RENEWING_PURCHASE', 'CANCELLATION')
GROUP BY day ORDER BY day DESC;
```

## AppsFlyer
1. In AppsFlyer, copy the **dev key** (or an S2S token) and your app IDs (`id123456789` for iOS, the package name for Android).
2. In your app, set `$appsflyerId` to the AppsFlyer SDK's id and call `collectDeviceIdentifiers()`, before the first purchase.
3. In RevenueDot, open **Integrations → AppsFlyer**, enter the key and app IDs (tick **The key is an S2S token** if it is one) and click **Connect AppsFlyer**.

Events go through AppsFlyer's server-to-server API with `eventValue` holding `af_revenue`, `af_price`, `af_content_id`, `renewal` and `af_currency` (`USD`). Refunds carry negative revenue. Events of customers without `$appsflyerId` are skipped. Sandbox events need the **Sandbox developer key**. Turn off purchase tracking in the AppsFlyer SDK so purchases are not counted twice.

## Adjust
1. In Adjust, copy each app's **app token** and create one **event token** per step you want (purchase, trial started, renewal ...).
2. In your app, set `$adjustId` to the Adjust SDK's `adid` and call `collectDeviceIdentifiers()`.
3. In RevenueDot, open **Integrations → Adjust**, enter the app tokens and the event tokens, plus the **S2S auth token** if S2S security is on in Adjust, and click **Connect Adjust**.

Events go to Adjust's S2S endpoint with the customer's `adid`, device ids and `environment` (`production` or `sandbox`). Adjust rejects amounts below 0.001, so trials and refunds are sent without revenue. Steps without an event token, and customers without `$adjustId`, are skipped.

## Meta
1. In Meta Events Manager, open the dataset (pixel) linked to your app, copy the **Dataset ID** and generate a **Conversions API access token**.
2. In your app, call `collectDeviceIdentifiers()` and set `$fbAnonId` with the Meta SDK's anonymous id.
3. In RevenueDot, open **Integrations → Meta**, enter the dataset ID and token and click **Connect Meta**. A **Test event code** sends events to Events Manager's Test Events tab.

Trial starts arrive as `StartTrial`, purchases, conversions and renewals as `Subscribe`, one-time purchases as `fb_mobile_purchase`, through the [Conversions API for app events](https://developers.facebook.com/docs/marketing-api/conversions-api/app-events) with `action_source: app`. Meta matches on `$fbAnonId` or the advertising id; the app user id, email and phone number are sent SHA-256 hashed. On iOS, events are sent only when `$attConsentStatus` is `authorized`, unless you turn on **Send iOS events without ATT consent**. Meta takes no negative revenue, so refunds are not sent. Turn off automatic purchase logging in the Meta SDK to avoid counting purchases twice.

## Scheduled data exports
1. Create a bucket and credentials:
   - **Amazon S3:** an IAM user with `s3:PutObject` on `arn:aws:s3:::<bucket>/*` and `s3:ListBucket` on `arn:aws:s3:::<bucket>`, and its access key.
   - **Cloudflare R2:** an R2 API token with **Object Read & Write** on the bucket; use its access key ID and secret, and your account ID.
   - **Google Cloud Storage:** a service account with **Storage Object Creator** and **Storage Legacy Bucket Reader** on the bucket, and its JSON key.
   - **Other S3-compatible storage** (MinIO and the like): choose Amazon S3 and fill in **Endpoint**.
2. In RevenueDot, open **Integrations → Scheduled Data Exports → New export**, fill in the bucket and credentials, pick the tables, format and schedule, and click **Create export**.
3. Click **Check bucket**, then **Run now** for the first export. Later runs follow the schedule.

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/integrations/exports" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Warehouse","destination":"r2","config":{"bucket":"revenue-exports","prefix":"revenuedot","account_id":"'"$CF_ACCOUNT_ID"'","access_key_id":"'"$R2_KEY_ID"'"},"credentials":{"secret_access_key":"'"$R2_SECRET"'"},"format":"parquet","schedule":"daily","hour_utc":3,"tables":["transactions","events"]}'
```

- **Files:** `<prefix>/<YYYY-MM-DD>/<table>_<YYYYMMDDTHHMMSSZ>.csv.gz` (or `.csv`, `.parquet`), split into `_part2`, `_part3` ... above 25,000 rows. The date is the end of the window the file covers.
- **Formats:** CSV (comma-separated, header row, gzip by default, times in UTC as `YYYY-MM-DD HH:MM:SS`) or Parquet (Snappy, typed columns: timestamps, integers, decimals, booleans and JSON).
- **Schedule:** every day at an hour you pick (UTC), or every week on a day you pick. **Run now** queues one at once.
- **New and changed only** (default): each run exports what changed since the previous successful run of that table. The first run of a table is always complete. A refunded transaction is exported again with `price_in_usd` 0 and `refunded_at` set, so keep the latest row per `store_transaction_id` by `updated_at`. **Everything, every time** writes full tables.
- **Failures:** a run that hits a temporary error retries after 10 and 30 minutes; files are overwritten, so a retry never duplicates. The run history shows each file, its rows and size, and any error.

### Tables
- **transactions:** one row per purchase, trial and renewal, with the column names of RevenueCat's transactions export: `rc_original_app_user_id`, `rc_last_seen_app_user_id_alias`, `country`, `country_source`, `product_identifier`, `product_display_name`, `product_duration`, `start_time`, `end_time`, `grace_period_end_time`, `effective_end_time`, `store`, `is_auto_renewable`, `is_trial_period`, `is_in_intro_offer_period`, `is_sandbox`, `price_in_usd`, `purchase_price_in_usd`, `takehome_percentage`, `tax_percentage`, `commission_percentage`, `store_transaction_id`, `original_store_transaction_id`, `refunded_at`, `unsubscribe_detected_at`, `billing_issues_detected_at`, `purchased_currency`, `price_in_purchased_currency`, `purchase_price_in_purchased_currency`, `entitlement_identifiers`, `renewal_number`, `is_trial_conversion`, `presented_offering`, `ownership_type`, `reserved_subscriber_attributes`, `custom_subscriber_attributes`, `platform`, `updated_at`, `offer`, `offer_type`, `first_seen_time`, `auto_resume_time`, `app_id`.
- **customers:** `rc_original_app_user_id`, `rc_last_seen_app_user_id_alias`, `aliases`, `first_seen_time`, `last_seen_time`, `platform`, `app_version`, `country`, `sdk_version`, `original_purchase_time`, the two attribute columns, `updated_at`.
- **subscriptions:** the current state of each subscription: store, product, dates, period type, cancellation, billing issue, refund, price, country, presented offering, `updated_at`.
- **events:** every event webhooks receive: `event_id`, `type`, `event_time`, `recorded_at`, `environment`, `app_id`, the customer's ids, product, store, price, and `payload` (the webhook body as JSON).

```sql
-- Monthly revenue from the transactions files, net of refunds.
SELECT DATE_TRUNC('month', start_time) AS month, SUM(price_in_usd) AS revenue
FROM transactions WHERE NOT is_sandbox GROUP BY 1 ORDER BY 1;
```

## Self-hosting notes
- Set `REVENUEDOT_ENCRYPTION_KEY` (`openssl rand -base64 32`) in `.env` so integration keys are encrypted at rest. Without it the key is derived from `REVENUEDOT_SIGNING_KEY`; with neither, they are stored unencrypted (never shown by the API). Changing the key means entering the integrations' keys again.
- Deliveries and exports run in the server's background job, every 30 seconds on Node and every minute on RevenueDot Cloud.
- Parquet works on both, since the writer is plain JavaScript.

---
title: How do I send purchase events to analytics, attribution and marketing tools, and export my data?
description: Every entry of RevenueCat's integration catalogue (37) plus BigQuery. Connect a tool with its key, and every purchase, trial, renewal and refund is sent with RevenueCat's event names, retried and logged. Exports write CSV or Parquet to S3, R2 or GCS.
---

# How do I send purchase events to analytics, attribution and marketing tools, and export my data?

RevenueDot has every entry of RevenueCat's integration catalogue, 37 in all ([third-party tools](https://www.revenuecat.com/docs/integrations/third-party-integrations), [attribution](https://www.revenuecat.com/docs/integrations/attribution)), plus BigQuery:

- **Core:** [Webhooks](webhooks.md), [Scheduled data exports](#scheduled-data-exports), [BigQuery](#bigquery).
- **Analytics:** [Segment](#segment), [Amplitude](#amplitude), [Mixpanel](#mixpanel), [PostHog](#posthog), [Firebase](#firebase), [mParticle](#mparticle), [Statsig](#statsig), [Superwall](#superwall), [TelemetryDeck](#telemetrydeck).
- **Attribution:** [AppsFlyer](#appsflyer), [Adjust](#adjust), [Meta](#meta), [Apple Search Ads](#apple-search-ads), [Appstack](#appstack), [Asapty](#asapty), [Branch](#branch), [Google Tag Manager](#google_tag_manager), [Kochava](#kochava), [Airbridge](#airbridge), [SplitMetrics Acquire](#splitmetrics), [Singular](#singular), [SolarEngine](#solarengine), [Tenjin](#tenjin).
- **Marketing:** [Slack](#slack), [Airship](#airship), [Braze](#braze), [CleverTap](#clevertap), [Customer.io](#customerio), [Discord](#discord), [Intercom](#intercom), [Iterable](#iterable), [OneSignal](#onesignal).
- **Ads:** [Google AdMob](ads.md#admob).
- **Support:** [Intercom inbox](support-integrations.md#intercom), [Zendesk](support-integrations.md#zendesk).

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
| What happened | Segment, Amplitude, Mixpanel, PostHog, AppsFlyer and most others | Firebase | Meta |
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
| Web purchase redeemed in the app | `rc_purchase_redeemed` (Segment, Amplitude, Mixpanel) | | |
| Funnel viewed | `rd_funnel_viewed` (Segment, Amplitude, Mixpanel, PostHog, AppsFlyer) | | `ViewContent` |
| Funnel step completed | `rd_funnel_step_completed` (Segment, Amplitude, Mixpanel, PostHog, AppsFlyer) | | `FunnelStepCompleted`, or `Lead` for an email step |
| Funnel purchase | `rd_funnel_purchase` (Segment, Amplitude, Mixpanel, PostHog, AppsFlyer) | | `Purchase` |

The three funnel events come from RevenueDot's web [funnels](funnels.md) and are **opt-in**: add `funnel_viewed`, `funnel_step_completed` and `funnel_purchase` to the integration's event types to get them. They carry `funnel_id`, `funnel_name`, `funnel_slug`, `session_id`, `step_id`, `step_type`, `step_index`, `answer`, `product_id` and the page's `utm_*` parameters as event properties. A visitor has no app user id until they pay, unless the funnel URL had `?app_user_id=`. Meta, Google Tag Manager, Branch and AppsFlyer also take them as web events; see [Funnel events to ad networks](#funnel-events-to-ad-networks).

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
| `$mparticleId` | mParticle's `mpid` |
| `$telemetryDeckUserId`, `$telemetryDeckAppId` | TelemetryDeck (the user id is required) |
| `$appleAdsCampaignId`, `$appleAdsAdGroupId`, `$appleAdsKeywordId` and the other `$appleAds*` ids | Set by RevenueDot from the AdServices token; read by Asapty, SplitMetrics Acquire and the Apple Search Ads report |
| `$appstackId` | Appstack |
| `$branchId`, `$androidId` | Branch |
| `$kochavaDeviceId` | Kochava (required) |
| `$airbridgeDeviceId` | Airbridge |
| `$singularDeviceId`, `$limitDataSharing` | Singular (the device id is required for V2) |
| `$solarEngineDistinctId`, `$solarEngineAccountId`, `$solarEngineVisitorId` | SolarEngine |
| `$tenjinId` | Tenjin (required) |
| `$airshipChannelId` | Airship's channel |
| `$brazeAliasName`, `$brazeAliasLabel` | Braze's user alias |
| `$clevertapId` | CleverTap's `objectId` |
| `$customerioId` | Customer.io's person id |
| `$iterableUserId`, `$iterableCampaignId`, `$iterableTemplateId` | Iterable |
| `$onesignalUserId` | OneSignal's user |

## Connect with the API
Every dashboard action is an API call under `/v2/projects/{project_id}/integrations/partners` with a secret key that has `project_configuration:integrations:read_write`. `GET .../integrations/catalog` lists the fields each tool takes, with `api` (`documented`, or `webhook` for the [four webhook partners](#webhook-partners)) and `connection` (`true` for AdMob, Apple Search Ads, the Intercom inbox and Zendesk, which receive no events).

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

**Web funnels (optional):** to send [funnel events](#funnel-events-to-ad-networks), also enter the AppsFlyer web app's **Web app ID** (the brand bundle ID) and its **Web S2S token**. Funnel events then go through AppsFlyer's Web S2S API (`POST https://events.appsflyer.com/v2.0/s2s/inapps/app/web/{web app id}`, `Authorization: Bearer <token>`) as `rd_funnel_viewed`, `rd_funnel_step_completed` and `rd_funnel_purchase`, with the visitor's app user id as `customer_user_id` (set the same id as the customer user id in AppsFlyer's web SDK). The purchase carries `event_revenue` in US dollars; `event_value` has the funnel, step, `utm_*` parameters and ad click ids. Sandbox funnel events are not sent to AppsFlyer.

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

## Funnel events to ad networks
Meta, Google Tag Manager, Branch and AppsFlyer can count your web [funnels](funnels.md) as **website events**, so ad campaigns that send people to a funnel learn which clicks led to sign-ups and purchases. Like for analytics tools, funnel events are opt-in: add `funnel_viewed`, `funnel_step_completed` and `funnel_purchase` to the integration's event types.

| | Funnel viewed | Step completed | Email step completed | Funnel purchase |
|---|---|---|---|---|
| [Meta](#meta) | `ViewContent` | `FunnelStepCompleted` | `Lead` | `Purchase` with the US dollar value |
| [Google Tag Manager](#google_tag_manager) | `page_view` | `rd_funnel_step_completed` | `generate_lead` | `purchase` with the US dollar value |
| [Branch](#branch) | `VIEW_ITEM` | `rd_funnel_step_completed` | `COMPLETE_REGISTRATION` | `PURCHASE` with the US dollar revenue |
| [AppsFlyer](#appsflyer) | `rd_funnel_viewed` | `rd_funnel_step_completed` | `rd_funnel_step_completed` | `rd_funnel_purchase` with `event_revenue` |

Renaming a step under **Event names** replaces these names, including `Lead`, `generate_lead` and `COMPLETE_REGISTRATION`.

**What each network gets:**
- **Meta:** website events (`action_source: website`) through the [Conversions API](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters), with `event_source_url` (the funnel page), `client_user_agent`, `client_ip_address`, `fbc` built from the landing URL's `fbclid`, and `external_id` (the SHA-256 of the visitor's app user id). Meta requires the user agent and page URL for website events, so events without them are skipped. A web purchase also arrives as `INITIAL_PURCHASE` from the Stripe store, which Meta's app events skip for lack of a device id, so a funnel purchase is counted once.
- **Google Tag Manager:** GA4 events whose `page_location` is the funnel page with its `utm_*` parameters and `gclid`, `gbraid` or `wbraid`, so GA4 and Google Ads attribute the visit as they would a browser hit.
- **Branch:** web events with the visitor's app user id as `developer_identity`, and the browser's `user_agent`, `ip` and page (`http_origin`), as Branch asks for web events sent from a server ([Events API](https://help.branch.io/apidocs/events-api)).
- **AppsFlyer:** the Web S2S API, with its own settings; see [AppsFlyer](#appsflyer).

Sandbox funnel events follow each network's sandbox setting (Meta's sandbox dataset, Google Tag Manager's sandbox measurement ID, Branch's sandbox key); AppsFlyer skips them. Adjust, Kochava, Singular, Tenjin and Airbridge never get funnel events, because they match people by mobile device ids, which a web visitor does not have.

**What RevenueDot records for this.** While at least one enabled integration (not a webhook) has a funnel event type in its filter, each funnel event also stores the page address (`page_url`). The visitor's IP address (`client_ip`) and browser user agent (`client_user_agent`) are stored only while that integration is Meta or Branch, the two that match visitors with them, and are deleted after 7 days. Checkout and purchase events take them from the visit's first page view, with its `utm_*` parameters and ad click ids. Without such an integration, no visitor IP address is stored. A visitor whose browser sends Global Privacy Control (`Sec-GPC: 1`) is not shared: their events carry no IP address, user agent, page address or click ids. Partners on the webhook adapter never get the IP address or user agent. Every funnel event carries the ad click ids from the landing URL (`click_ids`: `fbclid`, `gclid`, `gbraid`, `wbraid`, `ttclid`, `msclkid`), and `FUNNEL_PURCHASE` carries `revenue_usd` and `currency`. Visits that started before you turned funnel events on have no browser details, so Meta skips them. Mention the IP address and ad click ids in your privacy policy.

<a id="webhook-partners"></a>

## Superwall, Appstack, SplitMetrics Acquire and SolarEngine take a webhook
These four partners publish no API for subscription events. They ask RevenueCat customers for a webhook instead, so RevenueDot sends them exactly what a [webhook](webhooks.md) gets: RevenueCat's webhook body, `{"api_version":"1.0","event":{...}}`, POSTed as JSON to the URL the partner gives you, with the **Authorization header value** you enter.
- Every event type is sent except experiment enrollments.
- Sandbox events carry `environment: SANDBOX` and are sent when the integration's **Environment** includes sandbox.
- Their catalogue cards say **Via webhook**.
- The URL is checked when you save (https only on RevenueDot Cloud) and again before each send.

## mParticle
1. In mParticle, open **Setup → Inputs → Feeds**, add a **Custom Feed** (server-to-server) and copy its key and secret.
2. In RevenueDot, open **Integrations → mParticle**, enter the **Server-to-server key** and **Server-to-server secret**, pick the **Data center** (US1, US2, EU1 or AU1; default US1) and click **Connect mParticle**.

Each event is one batch to mParticle's [Events API](https://docs.mparticle.com/developers/apis/http/). Money events are commerce events with a `purchase` action, refunds a `refund` action; the rest are custom events named like RevenueCat's mParticle events (`initial_purchase`, `renewal` ...). The user is `$mparticleId` as `mpid` when your app set it, with the app user id as `customer_id`, `$email`, and `$idfa`, `$idfv`, `$gpsAdId` and `$ip` as device info. `source_message_id` is the event id, so mParticle drops a repeat. Sandbox events go to the same feed with `environment: development`.

## Statsig
1. In Statsig, open **Settings → Keys & Environments** and copy the **Server Secret Key** (`secret-…`).
2. In RevenueDot, open **Integrations → Statsig**, paste it as **Server secret key** and click **Connect Statsig**.

Each event is a custom event through Statsig's [log_event API](https://docs.statsig.com/api-reference/events/log-custom-events), with `value` = the revenue (negative for refunds) and the product, store and transaction ids in `metadata`. `userID` is the app user id, so it must match the user id your app gives the Statsig SDK. Sandbox events are sent with the `development` environment tier, which Statsig keeps out of production metrics.

## Superwall
Superwall publishes no event API: RevenueDot sends RevenueCat's webhook body to the URL Superwall gives you (see [webhook partners](#webhook-partners)).
1. In Superwall, **Settings → Revenue Tracking → RevenueCat** shows an integration token, not a URL ([Superwall's guide](https://superwall.com/docs/overview-settings-revenue-tracking)). Ask Superwall support for the URL that receives RevenueCat webhooks.
2. In RevenueDot, open **Integrations → Superwall**, enter the **Superwall webhook URL** and, if Superwall asks for it, the token as **Authorization header value**, then click **Connect Superwall**.

The Superwall SDK reads the same app user id, which travels in the body as `app_user_id`, `original_app_user_id` and `aliases`.

## TelemetryDeck
1. In TelemetryDeck, copy the app's **App ID** from its settings (and your **Namespace**, if TelemetryDeck gave you one).
2. In your app, set `$telemetryDeckUserId` to the TelemetryDeck SDK's hashed user id, and optionally `$telemetryDeckAppId`.
3. In RevenueDot, open **Integrations → TelemetryDeck**, enter the **App ID** (used for customers without `$telemetryDeckAppId`) and **Namespace**, and click **Connect TelemetryDeck**.

Each event is one signal through TelemetryDeck's [ingest API v2](https://telemetrydeck.com/docs/ingest/v2), named with RevenueCat's event names, with `floatValue` = the revenue (negative for refunds) and the event's fields as `RevenueCat.event.*` parameters. Customers without `$telemetryDeckUserId` are skipped, because RevenueDot cannot recreate TelemetryDeck's hash. Sandbox events are sent with `isTestMode: true`.

## Apple Search Ads
Attribution needs no setup. When your app calls `enableAdServicesAttributionTokenCollection()` (iOS), RevenueDot resolves the AdServices token with Apple and stores the campaign on the customer as `$appleAdsCampaignId`, `$appleAdsAdGroupId`, `$appleAdsKeywordId` and the other `$appleAds*` attributes. Asapty, SplitMetrics Acquire and every tool that reads attributes get them from there.

**Revenue by campaign:** open **Integrations → Apple Search Ads**. The report lists, for customers first seen in the last 28 or 90 days or 12 months, each campaign's customers, paying customers, revenue to date and revenue per customer (production purchases, US dollars, refunds negative). The API is `GET /v2/projects/{project_id}/ads/apple_search_ads/report?range=90d`.

**Campaign names (optional):** Apple's attribution API returns campaign ids, not names. To see names, add an Apple Search Ads API user:
1. In Apple Search Ads, invite an API user (a read-only role is enough). Generate a P-256 key pair (`openssl ecparam -genkey -name prime256v1 -noout -out private-key.pem`, then `openssl ec -in private-key.pem -pubout -out public-key.pem`) and upload the public key on the user's **API** tab ([Apple's guide](https://developer.apple.com/documentation/apple_search_ads/implementing_oauth_for_the_apple_search_ads_api)).
2. In RevenueDot, enter the **Organization ID** (Apple Search Ads › Account settings), **Client ID**, **Team ID** and **Key ID** from the API tab, and paste `private-key.pem` as **Private key (PEM)**. Click **Connect Apple Search Ads**.
3. Click **Load campaign names**. RevenueDot signs in to Apple's Campaign Management API v5 and loads the names of up to 200 campaigns and their ad groups.

## Appstack
Appstack publishes no event API: RevenueDot sends RevenueCat's webhook body to Appstack's URL ([how Appstack connects to RevenueCat](https://www.revenuecat.com/docs/integrations/attribution/appstack)).
1. In Appstack, open **Integrations → RevenueCat** and copy the **Webhook URL** and the **Authorization Header**.
2. In RevenueDot, open **Integrations → Appstack**, paste them as **Appstack webhook URL** and **Authorization header value**, and click **Connect Appstack**.

Appstack matches customers on `$appstackId` (the Appstack SDK's id), which travels in the body's `subscriber_attributes`; set it from your app.

## Asapty
1. In Asapty, copy your **Asapty ID** from **Settings → General**.
2. In RevenueDot, open **Integrations → Asapty**, enter it and click **Connect Asapty**.

Each event is the request RevenueCat [documents for Asapty](https://www.revenuecat.com/docs/integrations/attribution/reference/asapty), with the customer's Apple Search Ads campaign, ad group, keyword and ad ids (see [Apple Search Ads](#apple-search-ads)) and revenue as a two-decimal string. Event names are `initial_purchase_event`, `renewal_event` and so on. Customers without `$appleAdsCampaignId` are skipped. Asapty takes production events only, so sandbox events are skipped, and refunds go with revenue 0.00.

## Branch
1. In Branch, open **Account Settings → Profile** and copy the live **Branch Key** (`key_live_…`), and the test key (`key_test_…`) for sandbox events.
2. In your app, call `collectDeviceIdentifiers()` so RevenueDot has `$idfa` or `$idfv` (iOS) and `$gpsAdId` or `$androidId` (Android).
3. In RevenueDot, open **Integrations → Branch**, enter the **Branch key** and **Sandbox Branch key**, and click **Connect Branch**.

Events go through Branch's [v2 Events API](https://help.branch.io/apidocs/events-api): trial starts as `START_TRIAL`, purchases, conversions and renewals as `SUBSCRIBE`, one-time purchases as `PURCHASE`, with the revenue and the product; other events as custom events with RevenueCat's names. `developer_identity` is `$branchId` or the app user id. Customers without a device id are skipped. Without the sandbox key, sandbox events are not sent. Branch takes no negative revenue, so refunds carry none.

<a id="google_tag_manager"></a>

## Google Tag Manager
Events go to your **server-side** Tag Manager container in the GA4 Measurement Protocol format, as [Google documents for server containers](https://developers.google.com/tag-platform/tag-manager/server-side/send-data). The container's tags send them on to GA4, Google Ads or anything else.
1. In Tag Manager, open the server container, **Admin → Container Settings → Server container URLs**, and copy the URL. Add a **Measurement Protocol (GA4)** client on the path `/mp/collect`.
2. In GA4, copy the data stream's **Measurement ID** (`G-…`), and a second stream's for sandbox events. A **Measurement Protocol API secret** is optional.
3. In RevenueDot, open **Integrations → Google Tag Manager**, enter the **Server container URL**, **Measurement ID**, **Measurement Protocol API secret**, **Sandbox measurement ID** and **Sandbox API secret**, and click **Connect Google Tag Manager**.

Purchases, conversions, renewals and one-time purchases arrive as GA4's `purchase` event (`value`, `transaction_id`, `items`), the rest with RevenueCat's names. `client_id` and `user_id` are the app user id, and `event_id` is the event id for deduplication in your tags. Without a sandbox measurement ID, sandbox events are not sent. Refunds carry no value.

## Kochava
1. In Kochava, copy each app's **App GUID** from its **Edit App** page, and the GUIDs of Kochava test apps for sandbox events.
2. In your app, set `$kochavaDeviceId` to the Kochava SDK's device id and call `collectDeviceIdentifiers()`.
3. In RevenueDot, open **Integrations → Kochava**, enter the **iOS app GUID**, **Android app GUID**, **iOS test app GUID** and **Android test app GUID**, and click **Connect Kochava**.

Events are Kochava [post-install events](https://support.kochava.com/server-to-server-integration/post-install-event-setup): trial starts as `Start Trial`, purchases, conversions and renewals as `Subscribe`, one-time purchases as `Purchase`, other events with RevenueCat's names, and the revenue as `sum` (negative for refunds). Customers without `$kochavaDeviceId`, or without `$idfa`/`$idfv` (iOS) or `$gpsAdId`/`$androidId` (Android), are skipped. Sandbox events go only to the test app GUIDs. Apps with Kochava's strict authentication turned on are not supported, because Kochava does not publish its header for this endpoint.

## Airbridge
1. In Airbridge, note the app's name (its subdomain in your workspace) and copy the server-to-server **API token** from **Settings → Tokens**.
2. In your app, set `$airbridgeDeviceId` to the Airbridge SDK's device id.
3. In RevenueDot, open **Integrations → Airbridge**, enter the **App name** and **API token** (and a second app's **Sandbox app name** and **Sandbox API token** for sandbox events), and click **Connect Airbridge**.

Events go through Airbridge's [server-to-server event API](https://help.airbridge.io/en/references/s2s-event/send-in-app-events) as Airbridge's standard events (`airbridge.startTrial`, `airbridge.subscribe`, `airbridge.ecommerce.order.completed`, `airbridge.unsubscribe`), others with RevenueCat's names. `externalUserID` is the app user id; `$airbridgeDeviceId`, `$idfa`, `$idfv` and `$gpsAdId` are the device. `eventUUID` is the event id, so Airbridge drops a repeat. Airbridge drops events older than 24 hours, so RevenueDot skips them (a replay of old events sends nothing). Without the sandbox app name, sandbox events are not sent. Refunds carry no value.

<a id="splitmetrics"></a>

## SplitMetrics Acquire
SplitMetrics Acquire publishes no event API: RevenueDot sends RevenueCat's webhook body to the URL SplitMetrics gives you (see [webhook partners](#webhook-partners)).
1. SplitMetrics Acquire shows a Client ID for RevenueCat, not a URL ([SplitMetrics' guide](https://help.splitmetrics.com/en/articles/5817211-how-to-link-revenuecat-partner-integration)). Ask SplitMetrics support for the URL that receives RevenueCat webhooks for your Client ID.
2. In RevenueDot, open **Integrations → SplitMetrics Acquire**, enter the **SplitMetrics Acquire webhook URL** (and an **Authorization header value** if SplitMetrics gives you one), and click **Connect SplitMetrics Acquire**.

SplitMetrics matches on the Apple Search Ads attributes in the body's `subscriber_attributes` (see [Apple Search Ads](#apple-search-ads)).

## Singular
1. In Singular, open **Developer Tools → SDK Keys** and copy the **SDK Key** (and a sandbox key, if you use one).
2. In your app, set `$singularDeviceId` to the Singular SDK's device id (for the V2 endpoint), or call `collectDeviceIdentifiers()` (for V1).
3. In RevenueDot, open **Integrations → Singular**, enter the **SDK key** and **Sandbox SDK key**, pick the **Event endpoint** and click **Connect Singular**. Singular accounts created from July 15, 2026 must use **V2**.

Events go through Singular's [server-to-server EVENT endpoint](https://support.singular.net/hc/en-us/articles/31496864868635) with the parameters RevenueCat [documents for Singular](https://www.revenuecat.com/docs/integrations/attribution/reference/singular), RevenueCat's event names and the revenue as `amt` (negative for refunds). V2 matches on `$singularDeviceId`, V1 on the advertising ids; customers without them are skipped. Without the sandbox key, sandbox events are not sent.

## SolarEngine
SolarEngine publishes no event API: RevenueDot sends RevenueCat's webhook body to the URL SolarEngine gives you (see [webhook partners](#webhook-partners)). RevenueCat's own [SolarEngine page](https://www.revenuecat.com/docs/integrations/attribution/reference/solarengine) names the hosts and a signature but not the full request, which is not enough to build it.
1. Ask SolarEngine support for the URL that receives RevenueCat webhooks for your app.
2. In your app, set `$solarEngineDistinctId`, `$solarEngineAccountId` and `$solarEngineVisitorId` from the SolarEngine SDK.
3. In RevenueDot, open **Integrations → SolarEngine**, enter the **SolarEngine webhook URL** (and an **Authorization header value** if SolarEngine gives you one), and click **Connect SolarEngine**.

It sends production events by default, because SolarEngine documents no sandbox handling.

## Tenjin
1. In Tenjin, open **Configure → Apps**, pick each app and copy its **SDK key**.
2. In your app, set `$tenjinId` to the Tenjin SDK's analytics installation id and call `collectDeviceIdentifiers()`.
3. In RevenueDot, open **Integrations → Tenjin**, enter the **iOS SDK key** and **Android SDK key** (Amazon purchases use the Android key), and click **Connect Tenjin**.

Purchases, conversions, renewals and one-time purchases go to Tenjin's [server-to-server purchase endpoint](https://tenjin.com/docs/server-to-server-s2s-setup/) with the price; other events go as events with RevenueCat's names. Customers without `$tenjinId` are skipped. Tenjin keeps no separate sandbox data, so sandbox events are skipped, and refunds go as an event without money.

## Airship
1. In Airship, copy the project's **App key** and create a **Bearer token** with the Events role (and Attributes, if you set the status attribute) under **Settings → Tokens**. Use a second project's key and token for sandbox events.
2. To set the subscription status on users, create a text attribute named `rc_subscription_status` in Airship.
3. In RevenueDot, open **Integrations → Airship**, enter the **App key**, **Bearer token** and **Cloud site** (US or EU), the **Sandbox app key** and **Sandbox bearer token**, tick **Set the rc_subscription_status attribute** if you created it, and click **Connect Airship**.

Each event is an Airship [custom event](https://www.airship.com/docs/developer/rest-api/ua/operations/custom-events/) with a lower-case name, on the device's channel (`$airshipChannelId`) or else on the named user (the app user id). Anonymous app user ids are never named users, so their events are skipped without a channel. Airship does not deduplicate, so a replayed event is recorded again.

## Braze
1. In Braze, copy your instance's **REST endpoint** from **Settings → APIs and Identifiers** and create a **REST API key** with the `users.track` permission (and a second workspace's key for sandbox events).
2. In RevenueDot, open **Integrations → Braze**, pick the **REST endpoint**, enter the **REST API key** and **Sandbox REST API key**, optionally an **App identifier**, pick how **Revenue** is sent and click **Connect Braze**.

Each event is one [`/users/track`](https://www.braze.com/docs/api/endpoints/user_data/post_user_track) request with a custom event, the `rc_subscription_status` attribute and, for money, either an `ecommerce.order_placed` event (**eCommerce order placed events**) or a purchase object (**Legacy purchase objects**). The user is the alias `$brazeAliasName` + `$brazeAliasLabel` when both are set, else the app user id as `external_id`. Refunds are not sent as negative purchases. A replayed event is recorded again.

## CleverTap
1. In CleverTap, copy the **Account ID** and **Passcode** from the project's settings (and a second account's for sandbox events).
2. In RevenueDot, open **Integrations → CleverTap**, enter them, pick the **Region** and click **Connect CleverTap**.

Each event goes through CleverTap's [Upload API](https://developer.clevertap.com/docs/upload-events-api) with a profile update setting `rc_subscription_status`. The user is `$clevertapId` as `objectId` when set, else the app user id as `identity`. A replayed event is recorded again.

## Customer.io
1. In Customer.io, open **Workspace Settings → API Credentials** and copy the Track API **Site ID** and **API key** (and a second workspace's for sandbox events).
2. In RevenueDot, open **Integrations → Customer.io**, enter the **Site ID** and **Track API key**, pick the **Region** (US or EU) and click **Connect Customer.io**.

Each event updates the person (`rc_subscription_status`, `app_user_id`, `$email` as `email`) and then records the event through the [Track API](https://docs.customer.io/integrations/api/track/). The person's id is `$customerioId` when set, else the app user id. The event id is derived from RevenueDot's, so a retry is not recorded twice.

## Discord
1. In Discord, open the channel's settings, **Integrations → Webhooks → New Webhook**, and copy the webhook URL.
2. In RevenueDot, open **Integrations → Discord**, paste it as **Webhook URL** and click **Connect Discord**.

Purchases, trial starts, conversions and cancellations, renewals, cancellations, refunds, one-time purchases, billing issues, product changes and refund reversals post one message each, like [Slack](#slack). Sandbox events are labelled **Sandbox**; the default **Environment** is production. Mentions are turned off, so an app user id like `@everyone` never pings anyone.

## Intercom
This sends subscription events to Intercom contacts. To show a customer's subscription next to each conversation in the Intercom inbox, see [Intercom inbox](#intercom-inbox).
1. In the Intercom Developer Hub, open your app's **Authentication** and copy the **Access token**.
2. In RevenueDot, open **Integrations → Intercom**, paste it, pick the **Data hosting region** (US, EU or Australia) and click **Connect Intercom**.

Each event is an Intercom [data event](https://developers.intercom.com/docs/references/rest-api/api.intercom.io/data-events/createdataevent) on the contact whose user id is your app user id (anonymous app user ids use `$email` instead, and are skipped without it), with `subscription_status` and up to 10 keys of metadata. Money events carry the revenue in cents; refunds carry none. Intercom answers 404 for a contact it does not have. Sandbox events go to the same workspace with `environment: SANDBOX` when the **Environment** includes sandbox.

## Iterable
1. In Iterable, create a **server-side** API key (and one in a second project for sandbox events).
2. In RevenueDot, open **Integrations → Iterable**, enter the **Server-side API key** and **Sandbox server-side API key**, pick the **Data center** (US or EU), tick **Send paid events as Iterable purchases** if you want Iterable's revenue reports, and click **Connect Iterable**.

Each event goes to Iterable's `events/track` (or `commerce/trackPurchase` for paid events with the box ticked), then `users/update` sets `rc_subscription_status` ([Iterable API](https://api.iterable.com/api/docs)). The user is `$email`, else `$iterableUserId`, else the app user id. `$iterableCampaignId` and `$iterableTemplateId` attribute the event. The event id is Iterable's record id, so a retry updates the same record. Refunds go as events with negative revenue, never as purchases.

## OneSignal
1. In OneSignal, open **Settings → Keys & IDs** and copy the **App ID** and an **App API key**.
2. In RevenueDot, open **Integrations → OneSignal**, enter them and click **Connect OneSignal**.

OneSignal gets no events: each event updates the user's [tags](https://documentation.onesignal.com/reference/update-user) with RevenueCat's tag names (`app_user_id`, `period_type`, `purchased_at`, `expiration_at`, `store`, `environment`, `last_event_type`, `product_id`, `entitlement_ids`, `active_subscription`, `subscription_status`, `grace_period_expiration_at`), for segments and messages. The user is `$onesignalUserId` (the OneSignal ID of the v5 SDKs) when set, else the app user id as `external_id` (set it with `OneSignal.login`). Anonymous app user ids are skipped.

## Google AdMob
AdMob receives no events. Connecting it loads your ad unit names for the Ads Overview; rewarded ads and ad revenue work without it. See [Ads: AdMob](ads.md#admob).

## Intercom inbox
A Canvas Kit app that shows the customer's subscription status, plan, renewal date and total spent next to each conversation in Intercom. See [Support: Intercom](support-integrations.md#intercom).

## Zendesk
A ticket sidebar app with the requester's entitlements, subscriptions, refunds and open tickets. See [Support: Zendesk](support-integrations.md#zendesk).

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

- **Files:** `<prefix>/<YYYY-MM-DD>/<table>_<YYYYMMDDTHHMMSSZ>.csv.gz` (or `.csv`, `.parquet`), split into `_part2`, `_part3` ... above 10,000 rows. The date is the end of the window the file covers.
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

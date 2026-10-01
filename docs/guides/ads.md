---
title: Ads
description: Ad revenue from the RevenueCat SDK's ad events in US dollars next to subscription revenue, with eCPM and breakdowns. Rewarded ads verified on the server with AdMob's signed callback, granting currency or access by rules. Optional AdMob connection.
---

# Ads

RevenueDot shows the money your app makes from ads next to the money it makes from subscriptions, in US dollars, from the ad events the RevenueCat SDK already sends. It also verifies rewarded ads on the server: AdMob tells RevenueDot that a customer watched the ad, a reward rule grants in-app currency or a few days of access, and your app only asks whether it went through.

You need nothing on the server to start. The dashboard has three pages:
- **Ads > Overview**: ad revenue, impressions, eCPM, clicks and the ad share of revenue.
- **Ads > Rewards**: the AdMob callback URL, reward rules, a test reward and the rewards ledger.
- **Integrations > Google AdMob** (optional): sign in with Google to load your ad unit names.

## Track ad events
Ad revenue reaches RevenueDot through the SDK's ad tracker, which posts ad events to `POST /v1/events` at your proxy URL, in the same batches as paywall events. Your app keeps its SDK and its code.

1. Point the SDK at RevenueDot (see [Connect your app](../getting-started/connect-your-app.md)).
   - **iOS:** the stock SDK sends ad events to the proxy URL.
   - **Android:** the stock SDK sends ad events to RevenueCat's hosts even with a proxy URL. Use the [RevenueDot Android fork](../sdks/android.md), which sends them to your server.
2. Report the ads your app shows, in one of two ways:
   - **RevenueCat's AdMob adapter** tracks loads, impressions, clicks and revenue for you: [purchases-ios-admob](https://github.com/RevenueCat/purchases-ios/tree/main/AdapterSDKs/RevenueCatAdMob) on iOS and [purchases-admob](https://github.com/RevenueCat/purchases-android/tree/main/feature/admob) on Android.
   - **Any other network or mediator** (AppLovin MAX, ironSource and the rest): call the ad tracker yourself from the network's callbacks.

```swift
// iOS 15+: report the revenue of one impression from the mediator's paid-event callback.
Purchases.shared.adTracker.trackAdRevenue(AdRevenue(
    networkName: "AdMob", mediatorName: .adMob, adFormat: .rewarded, placement: "level_end",
    adUnitId: "ca-app-pub-3940256099942544/5224354917", impressionId: impressionId,
    revenueMicros: 12_500, currency: "USD", precision: .exact
))
```

```kotlin
// Android: the same with the RevenueDot fork.
Purchases.sharedInstance.adTracker.trackAdRevenue(AdRevenueData(
    networkName = "AdMob", mediatorName = AdMediatorName.AD_MOB, adFormat = AdFormat.REWARDED, placement = "level_end",
    adUnitId = "ca-app-pub-3940256099942544/5224354917", impressionId = impressionId,
    revenueMicros = 12_500, currency = "USD", precision = AdRevenuePrecision.EXACT,
))
```

The tracker also has `trackAdLoaded`, `trackAdFailedToLoad`, `trackAdDisplayed` and `trackAdOpened`. RevenueDot stores these event types:

| SDK event | What it counts |
|---|---|
| `rc_ads_ad_revenue` | Revenue of one impression: `revenue_micros` (millionths of `currency`), `precision` (`exact`, `publisher_defined`, `estimated` or `unknown`) |
| `rc_ads_ad_displayed` | One impression |
| `rc_ads_ad_opened` | One click |
| `rc_ads_ad_loaded`, `rc_ads_ad_failed_to_load` | Loads and failed loads, for the fill rate |
| `rc_ads_ad_reward_sdk_*` | The SDK's own record of a rewarded ad's verification |

Each event carries the network (`network_name`), the mediator (`mediator_name`: `AdMob`, `AppLovin` or any name), the format (`banner`, `interstitial`, `rewarded`, `rewarded_interstitial`, `native`, `app_open` or `other`), the placement you choose, the ad unit id and an impression id. Each event id is stored once, so a batch the SDK sends twice is not counted twice.

**Sandbox:** the iOS SDK marks sandbox and TestFlight builds, and every Test Store app is sandbox. Sandbox ad events never mix with production: the Overview shows one environment at a time.

## What the Overview shows
Open **Ads > Overview**. Pick the period (7, 28 or 90 days, or 12 months; whole UTC days ending today), an app, and **Sandbox data** to see sandbox events instead of production.

**Cards**, each with the change from the previous period of the same length:
- **Ad revenue:** the sum of `revenue_micros` ÷ 1,000,000 of the revenue events, converted to US dollars at the rate of each event's day. The rates are the same as [Charts](charts.md) use. Revenue in a currency without a rate counts as 0 and is listed as unconverted in the API answer.
- **Impressions:** displayed events. Some networks send only one revenue event per impression and no displayed events; then each revenue event counts as one impression, so eCPM stays a real number.
- **eCPM:** ad revenue ÷ impressions × 1,000.
- **Clicks**, with the **CTR** (clicks ÷ impressions).
- **Ad share of revenue:** ad revenue ÷ (ad revenue + subscription revenue).
- **Subscription revenue:** purchases, renewals and one-time purchases made in the period, in US dollars, minus refunds, for the same environment and app.

**Daily chart:** ad revenue, impressions or eCPM per day, or **With subscriptions** to stack ad revenue and subscription revenue.

**Breakdown table:** ad revenue, impressions, eCPM, clicks and share of ad revenue by **Network**, **Format**, **Placement**, **Ad unit** or **Mediator**. Ad units show their AdMob names once you [connect AdMob](#admob).

The same numbers per day, plus fill rate, ad-monetized customers and ARPDAU, are on the [Ads charts](charts.md#ads). Before your first ad event, the page shows three steps instead: add the SDK ad adapter, explore your ad analytics, and connect AdMob.

## Rewarded ads
Rewarded ads are verified by the ad network's server, not by the app. A modified app cannot grant itself a reward, because only a callback signed by Google does.

How one reward goes, start to finish:
1. The rewarded ad loads. Your app asks the SDK for a **reward verification token** and passes it to AdMob's server-side verification options.
2. The customer watches the ad. AdMob calls RevenueDot's callback URL with a signed request that carries the token.
3. RevenueDot checks Google's signature, records the reward once, and the first matching **reward rule** grants in-app currency or an entitlement.
4. The SDK polls RevenueDot until the answer is `verified` (with the reward) or `failed`, then refreshes the customer's balances and customer info.

Only AdMob's callback is verified today. AppLovin MAX, ironSource and Unity Ads callbacks are not.

### 1. Paste the callback URL into AdMob
Open **Ads > Rewards** and copy the **AdMob callback URL**:
- RevenueDot Cloud: `https://api.revenuedot.app/v1/ads/admob/ssv`
- Self-hosted: `<your server>/v1/ads/admob/ssv`, for example `https://revenuedot.example.com/v1/ads/admob/ssv`

In AdMob, open each rewarded ad unit, turn on **Server-side verification** and paste the URL. AdMob's **Verify URL** button calls it without parameters, and RevenueDot answers 200. One URL serves every project: the token in each callback names the app.

### 2. Pass the token in your app
Call these when the ad has loaded and when its reward callback fires.

```swift
// After the rewarded ad loads
let token = Purchases.shared.generateRewardVerificationToken(impressionId: impressionId)
let options = ServerSideVerificationOptions()
options.userIdentifier = token.appUserID
options.customRewardString = token.customData
rewardedAd.serverSideVerificationOptions = options

// When the ad's reward callback fires
let result = await Purchases.shared.pollRewardVerification(clientTransactionID: token.clientTransactionID)
if let gems = result.verifiedReward?.virtualCurrency { showReward(gems.amount) }
```

```kotlin
// After the rewarded ad loads
val token = Purchases.sharedInstance.generateRewardVerificationToken(impressionId)
rewardedAd.setServerSideVerificationOptions(
    ServerSideVerificationOptions.Builder()
        .setUserId(token.appUserID)
        .setCustomData(token.customData)
        .build()
)

// When the ad's reward callback fires (inside a coroutine)
val result = Purchases.sharedInstance.awaitPollRewardVerification(token.clientTransactionId)
```

On Android without coroutines, call `Purchases.sharedInstance.pollRewardVerification(token.clientTransactionId, callback)`. With RevenueCat's iOS AdMob adapter, `ad.enableRewardVerification()` does these steps for you ([adapter README](https://github.com/RevenueCat/purchases-ios/tree/main/AdapterSDKs/RevenueCatAdMob)).

The token's `customData` is `{"api_key":"<the app's public key>","client_transaction_id":"<a new UUID>","impression_id":"<the impression id>"}`. The user id must be the app user id the token was made for: a reward for one customer never shows up in another customer's poll.

### 3. Add reward rules
A reward rule says what a verified reward grants. Open **Ads > Rewards > New rule**:
- **Grant:**
  - **In-app currency:** the currency (create it under **Product catalog > Virtual currencies** first) and either a **Fixed amount** per reward or the **Network's amount** (AdMob's `reward_amount`) times a **Multiplier**, rounded, at least 1.
  - **Temporary access:** an entitlement for a number of minutes, hours or days (up to 365 days). It is a promotional grant, so customer info, webhooks and integrations see it like any other, and it ends on its own.
- **Only when** (all optional; empty matches everything):
  - **App**.
  - **Ad unit**: the full id (`ca-app-pub-…/5224354917`) or the number AdMob's callback sends (`5224354917`); either form matches.
  - **Reward item**: AdMob's `reward_item`, such as `coins`, ignoring case.

Rules are checked from top to bottom, and **the first rule that matches decides**. Drag rules to reorder them. A turned-off rule is skipped. When no rule matches, the reward is verified with nothing granted, and the SDK reports "verified, no reward". A project can have up to 200 rules.

**Currency rewards** are written to the in-app currency ledger once per reward, so a callback Google sends twice never credits twice. The balance is what `GET /v1/subscribers/{app_user_id}/virtual_currencies` returns, and a `VIRTUAL_CURRENCY_TRANSACTION` webhook goes out with `source: "ad_reward"` (a RevenueDot addition; see [webhook events](../../api/webhook-events.md)).

### 4. Test a reward and read the ledger
**Send a test reward** runs the same rules and grants as a real AdMob callback, for an app user ID you enter, without an ad. It is marked sandbox in the ledger, but the currency or access is granted for real.

The **Ledger** lists every verified reward, newest first: when, the customer, the network, the ad unit, AdMob's reward item and amount, the status and what was granted. A reward fails with one of these reasons:

| Reason | What happened | What to do |
|---|---|---|
| `missing_user` | AdMob's callback had no user id | Set `userIdentifier` (iOS) or `setUserId` (Android) to the token's `appUserID` |
| `user_mismatch` | The poll came from a different customer than the reward's user id (the poll answers this; the ledger keeps the reward) | Generate the token after the customer logs in, and pass its `appUserID` |
| `grant_failed` | The matching rule names an in-app currency or entitlement that no longer exists | Fix or delete the rule |

### What the poll answers
`GET /v1/subscribers/{app_user_id}/ads/reward_verifications/{client_transaction_id}` (or `/v1/customer/ads/reward_verifications/{id}` with a subscriber token). The SDK asks up to 10 times, about a second apart.

| Answer | When |
|---|---|
| `{"status":"pending"}` | AdMob has not called yet, or the grant is still being made |
| `{"status":"verified","reward":{"type":"virtual_currency","code":"GEMS","amount":10},"more_rewards":[]}` | A currency rule matched |
| `{"status":"verified","reward":{"type":"entitlement","identifier":"pro","expires_at":"2026-10-02T12:00:00Z"},"more_rewards":[]}` | An access rule matched |
| `{"status":"verified","reward":null,"more_rewards":[]}` | No rule matched |
| `{"status":"failed","failure_reason":"user_mismatch","message":"…"}` | One of the reasons above |

### How the callback is checked
AdMob signs the query string before `&signature=` with ECDSA (P-256, SHA-256). RevenueDot checks it with Google's published keys at `https://www.gstatic.com/admob/reward/verifier-keys.json`, as [Google's server-side verification guide](https://developers.google.com/admob/android/ssv) describes, and fetches the keys again when it sees an unknown key id.
- A bad signature answers 403 and records nothing.
- When Google's keys cannot be fetched, RevenueDot answers 503. Google retries callbacks that do not answer 200, so the reward is not lost.
- A callback whose `custom_data` is not a RevenueDot token is answered 200 and ignored, so Google stops retrying it.

## AdMob
Connecting AdMob loads your ad unit names, so the Overview shows "Level end rewarded" instead of `ca-app-pub-…/5224354917`. It is optional: ad revenue and rewarded ads work without it.

1. **Use a Google OAuth client.** Google requires one to read AdMob data.
   - **RevenueDot Cloud** has one; skip to step 3.
   - **Self-hosted:** set `REVENUEDOT_GOOGLE_OAUTH_CLIENT_ID` and `REVENUEDOT_GOOGLE_OAUTH_CLIENT_SECRET` on the server for every project, or let each project enter its own client on its AdMob page (**Use your own Google OAuth client**).
2. **Create the client** (self-hosted, or a project's own client): in Google Cloud, enable the **AdMob API**, then create an OAuth client of type **Web application** and add this authorized redirect URI: `<API origin>/v1/ads/admob/oauth/callback`, for example `https://revenuedot.example.com/v1/ads/admob/oauth/callback`. The AdMob page shows the exact URI.
3. **Connect.** Open **Integrations > Google AdMob** and select **Connect with Google**. Sign in with the Google account that has your AdMob account and allow read-only access (scope `https://www.googleapis.com/auth/admob.readonly`). The sign-in link works once, for 10 minutes.

RevenueDot stores the refresh token encrypted, lists your AdMob accounts and loads every ad unit (name, format, app), up to 5,000. It loads them again **once a day**; **Refresh now** loads them at once. **Disconnect** deletes the Google tokens and the loaded ad units; ad revenue from the SDK and rewarded ads keep working.

## Use the API
Every page is an API call with a secret key ([API reference](../../api/extensions.md#ads)). The Overview needs `charts_metrics:overview:read`; rules, the ledger and AdMob need `project_configuration:integrations:read` or `:read_write`.

```bash
curl -s "https://api.revenuedot.app/v2/projects/$PROJECT_ID/ads/overview?range=28d&environment=production" \
  -H "Authorization: Bearer $REVENUEDOT_SECRET_KEY"

curl -s -X POST "https://api.revenuedot.app/v2/projects/$PROJECT_ID/ads/reward_rules" \
  -H "Authorization: Bearer $REVENUEDOT_SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Gems for level-end ads","ad_unit_id":"ca-app-pub-3940256099942544/5224354917","kind":"virtual_currency","currency_code":"GEMS","amount":10}'
```

| Endpoint | What it does |
|---|---|
| `GET /v2/projects/{project_id}/ads/overview` | The Overview's totals, previous period, daily series and breakdowns. `range`: `7d`, `28d` (default), `90d` or `12m`; `environment`: `production` (default) or `sandbox`; `app_id` |
| `GET`, `POST /v2/projects/{project_id}/ads/reward_rules` | List rules in order; create one (it goes last) |
| `POST`, `DELETE /v2/projects/{project_id}/ads/reward_rules/{rule_id}` | Update or turn off a rule; delete it |
| `POST /v2/projects/{project_id}/ads/reward_rules/actions/reorder` | `{"rule_ids":[...]}`, every rule once, in the new order |
| `GET /v2/projects/{project_id}/ads/reward_verifications?status=&app_user_id=` | The ledger, newest first, paged |
| `POST /v2/projects/{project_id}/ads/reward_verifications/test` | A test reward: `{"app_user_id":"user_42"}`, optionally `app_id`, `ad_unit_id`, `reward_item`, `reward_amount` |
| `GET`, `DELETE /v2/projects/{project_id}/ads/admob` | The AdMob connection, its ad units and the URLs to paste; disconnect |
| `POST /v2/projects/{project_id}/ads/admob/connect` | Google's sign-in URL (body: optional `client_id`, `client_secret`) |
| `POST /v2/projects/{project_id}/ads/admob/refresh` | Load the ad units now |
| `GET /v1/ads/admob/ssv` | AdMob's callback (Google calls it; no key) |
| `GET /v1/ads/admob/oauth/callback` | Google's redirect after sign-in (no key) |

## How this compares to RevenueCat
RevenueDot answers the same SDK calls: the ad event names, the reward verification token and the poll's answers come from the RevenueCat SDKs' own code ([purchases-ios](https://github.com/RevenueCat/purchases-ios/tree/main/Sources/Ads), [purchases-android](https://github.com/RevenueCat/purchases-android)). RevenueCat does not publish its callback URL or how it configures rewards, so the callback URL and the reward rules above are RevenueDot's own. Apps that move from RevenueCat paste RevenueDot's callback URL into AdMob and add their rules again.

## Related
- [Charts: Ads](charts.md#ads)
- [Integrations](integrations.md), including [Apple Search Ads](integrations.md#apple-search-ads)
- [Webhooks](webhooks.md)

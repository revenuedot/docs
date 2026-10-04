---
title: How do I answer Apple refund requests with Refund Control?
description: Refund Control answers Apple's CONSUMPTION_REQUEST within 12 hours with consumption information and your refund preference, chosen by ordered policies on customer conditions. It also records Google Play refunds and chargebacks and shows refund rate, amounts and counts.
---

# How do I answer Apple refund requests with Refund Control?

When a customer asks Apple for a refund, Apple sends your server a `CONSUMPTION_REQUEST` notification and gives you 12 hours to answer with **consumption information**: how long the customer has used the app, how much they spent, whether they used what they bought, and whether you prefer Apple to grant the refund. Apple uses the answer when it decides. **Refund Control sends that answer for you**, using rules you set once.

## Before you start
1. Connect the App Store with the app's **In-App Purchase key** and turn on **App Store Server Notifications** (version 2). See [Connect the App Store](app-store.md). RevenueDot sends the answer with the same key.
2. Make sure your terms or privacy policy tell customers that you share this data with Apple. Apple requires the customer's consent ([Send Consumption Information](https://developer.apple.com/documentation/appstoreserverapi/send-consumption-information)), and RevenueDot sends nothing until you confirm it.

## Set the policies
Open **Lifecycle > Refund control**.

1. Tick **Customers agreed to share consumption data with Apple**.
2. Add policies from the four templates:
   - **First purchase date**: customers whose first purchase was recent, for example within 7 days.
   - **Platform**: customers on a platform, for example iOS.
   - **Recent renewal**: customers who renewed or converted from a free trial in the last 24 hours. Many accidental renewals are refunded; this is where you usually prefer a refund.
   - **Create your own**: any condition the audience builder knows (country, app user ID, email, media source, campaign, spend, custom attributes and more), in groups.
3. Pick each policy's **refund preference**:

| Preference | What Apple gets |
|---|---|
| Prefer full refund | Consumption information with `refundPreference` `GRANT_FULL` |
| Prefer prorated refund | Consumption information with `refundPreference` `GRANT_PRORATED`, so Apple refunds the unused part (rules below) |
| Prefer no refund | Consumption information with `refundPreference` `DECLINE` |
| Send consumption data only | Consumption information with no `refundPreference` |
| Do not respond | Nothing |

4. Drag the policies into order. The first policy whose conditions match the customer decides; the **default policy** covers everyone else. Each card shows how many of your customers it would decide for.
5. Select **Save**. **Cancel** throws your changes away.

## What RevenueDot sends
Apple's notification does not name a version, so RevenueDot follows Apple's rule ([changelog, version 1.19](https://developer.apple.com/documentation/appstoreserverapi/app-store-server-api-changelog)): purchases made through the Advanced Commerce API get **Send Consumption Information V1**, and every other purchase gets **Send Consumption Information** (V2). RevenueDot tells them apart by the `advancedCommerceInfo` field of the signed transaction. `GET /v2/projects/{project_id}/refund_requests` shows which one each answer used in `consumption_version`.

### Most purchases: Send Consumption Information
RevenueDot sends `PUT https://api.storekit.apple.com/inApps/v2/transactions/consumption/{transactionId}` (the sandbox host for sandbox purchases) with Apple's [`ConsumptionRequest`](https://developer.apple.com/documentation/appstoreserverapi/consumptionrequest):

| Field | How it is set |
|---|---|
| `customerConsented` | `true` (only sent after you confirm consent) |
| `consumptionPercentage` | How much the customer used, in thousandths of a percent (40% is `40000`). Prepaid (non-renewing) subscriptions: the share of the period that has passed, using the product's duration from your catalog, because Apple's transaction has no expiry date for them. Consumables that grant an in-app currency: the share of this purchase's currency that is spent, counting the oldest coins as spent first. Lifetime purchases: `0` when the customer never opened the app after buying. Left out when RevenueDot cannot tell, and always left out for auto-renewable subscriptions, because Apple works that out from the time passed |
| `deliveryStatus` | `DELIVERED`: RevenueDot granted the purchase |
| `refundPreference` | From the policy (table above) |
| `sampleContentProvided` | `true` when the customer had a free trial of the product |

A prorated refund follows Apple's [`refundPreference` rules](https://developer.apple.com/documentation/appstoreserverapi/refundpreference):
- An auto-renewable subscription gets `GRANT_PRORATED` with no percentage.
- Other products need a percentage between 0% and 100%. When nothing was used, RevenueDot sends `GRANT_FULL`. When everything was used, there is nothing left to refund, so it sends `DECLINE`. When the use is unknown, it sends the consumption data with no preference.

### Advanced Commerce API purchases: Send Consumption Information V1
For these, RevenueDot builds Apple's `ConsumptionRequestV1` from its own records. V1 has no prorated option, so **Prefer prorated refund** is sent as "prefer to grant" (`refundPreference` 1):

| Field | How it is set |
|---|---|
| `customerConsented` | `true` (only sent after you confirm consent) |
| `consumptionStatus` | Subscriptions: 3 when the period is over, 2 when the customer opened the app after buying, 1 when they never did. Lifetime purchases: 2 or 1 the same way. Consumables that grant an in-app currency: 3 when the balance is spent, 2 when part is spent, 1 when none is. Other consumables: 0 |
| `platform` | 1 for Apple platforms, 2 for others, from the customer's last seen platform |
| `sampleContentProvided` | `true` when the customer had a free trial of the product |
| `deliveryStatus` | 0: RevenueDot granted the purchase |
| `appAccountToken` | From the transaction, or empty |
| `accountTenure` | Days since the customer was first seen, in Apple's buckets |
| `playTime` | 0, unless your app sets the custom attribute `rd_play_time_minutes` |
| `lifetimeDollarsPurchased`, `lifetimeDollarsRefunded` | The customer's USD purchases and refunds, in Apple's buckets |
| `userStatus` | 1 for a known customer; set the custom attribute `rd_user_status` to `suspended`, `terminated` or `limited` to say otherwise |
| `refundPreference` | Full refund 1, no refund 2, consumption data only 0 |

If Apple's API fails, RevenueDot retries after 5 minutes, 15 minutes and then every hour, and stops 5 minutes before the 12-hour deadline. A repeated notification for the same purchase is never answered twice.

## Outcomes and the cards
Apple tells you the result: `REFUND` when it refunds, `REFUND_DECLINED` when it does not. The cards at the top show the last 28 days:
- **Refund rate**: approved requests divided by decided requests.
- **Refund request amount** and **Refund requests**, each switchable between declined and approved.

The table below lists each request with the policy used, whether the answer went out, and the outcome. The same data is in the API: `GET /v2/projects/{project_id}/refund_requests` and `GET /v2/projects/{project_id}/refund_control/stats` ([API reference](../../api/extensions.md#refund-control)).

## Google Play, Stripe and Amazon
Google Play has no consumption API: a customer's refund or a chargeback arrives as a voided purchase, and there is nothing to answer. RevenueDot records it as an approved refund request (with the policy that would have applied), so the cards cover every store. Stripe and Amazon refunds are recorded the same way.

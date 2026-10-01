---
title: Why does RevenueDot answer 4xx or 5xx to a receipt?
description: A 4xx tells the SDK the purchase is permanently bad, so it finishes the transaction for good. A 5xx means try again later, so the SDK keeps the transaction and retries.
---

# Why does RevenueDot answer 4xx or 5xx to a receipt?

The HTTP status tells the SDK what to do with the store transaction. A **4xx** means the purchase can never be accepted, so the SDK finishes (or, on Android, stops retrying) the transaction for good. A **5xx** means RevenueDot or the store had a temporary problem, so the SDK keeps the transaction open and posts it again later. RevenueDot never answers 4xx for its own failures, so a server bug cannot make a paying customer lose a purchase.

The SDK side of this rule is in the SDKs' own source. In purchases-ios, a failed post is "finishable" only when the status is not a server error ([NetworkError.swift](https://github.com/RevenueCat/purchases-ios/blob/main/Sources/Networking/HTTPClient/NetworkError.swift)). purchases-android makes the same split with `isServerError` ([Backend.kt](https://github.com/RevenueCat/purchases-android/blob/main/purchases/src/main/kotlin/com/revenuecat/purchases/common/Backend.kt)).

## What every error looks like
Every error has a JSON body with a numeric `code` and a `message`:

```bash
curl -s -w '\n%{http_code}\n' http://localhost:8787/v1/receipts \
  -H "Authorization: Bearer $TEST_KEY" -H "Content-Type: application/json" \
  -d '{"app_user_id":"user_1","fetch_token":"not-a-token","product_id":"pro_monthly"}'
```
```text
{"code":7103,"message":"The receipt is not a valid Test Store purchase token."}
400
```

## The codes, and where each one comes from
The codes are defined in [`apps/server/src/errors.ts`](https://github.com/revenuedot/revenuedot/blob/main/apps/server/src/errors.ts). They are the numbers the RevenueCat SDKs already understand.

### Permanent: 4xx, the SDK finishes the transaction
| HTTP | Code | Meaning | Thrown in | When |
|---|---|---|---|---|
| 401 | 7225 | Invalid API key | `routes/sdk.ts` | The `Authorization: Bearer` key is missing or unknown. Every SDK call answers this, not only receipts |
| 400 | 7220 | Invalid app user ID | `routes/sdk.ts` | `app_user_id` is empty or longer than 100 characters |
| 400 | 7000 | Bad request | `routes/sdk.ts` | A receipt posted with a secret key (`sk_`) has no `X-Platform` header, so RevenueDot cannot tell which app it is for |
| 400 | 7662 | Receipts for this store are not supported yet | `routes/sdk.ts` | The key belongs to a Web Billing, Paddle or Roku app, or a non-Amazon key asked for Amazon receipt details |
| 400 | 7103 | Invalid receipt | `stores/amazon/index.ts` | Amazon does not know the receipt or the Amazon user (`store_user_id` missing or wrong) |
| 500 | 7101 | Store problem | `stores/amazon/api.ts` | No Amazon shared key saved, or Amazon rejected it (RVS 496). The SDK keeps the purchase |
| 503 | 7101 | Store problem | `stores/amazon/api.ts` | Amazon's Receipt Verification Service is down, throttling or slow |
| 400 | 7103 | Invalid receipt | `stores/stripe/index.ts` | Not a `sub_` or `cs_` id, unknown to Stripe, an expired Checkout Session, or a subscription whose first payment never completed |
| 500 | 7101 | Store problem | `stores/stripe/api.ts` | No Stripe key saved, or Stripe rejected it (401 or 403) |
| 503 | 7101 | Store problem | `stores/stripe/index.ts` | Stripe is unavailable, or the first invoice or Checkout Session is not paid yet: post again later |
| 400 | 7103 | Invalid receipt | `routes/sdk.ts` | The body has neither `fetch_token` nor `app_transaction` |
| 400 | 7103 | Invalid receipt | `stores/test-store.ts` | The Test Store token is not `test_<ms>_<id>`, or `product_id` is missing |
| 400 | 7103 | Invalid receipt | `stores/apple/index.ts` | The StoreKit 2 transaction's signature does not verify, the bundle ID does not match the app, the app receipt cannot be parsed, or it is an Xcode receipt without the `xcode_certificate` credential |
| 400 | 7103 | Invalid receipt | `stores/google/index.ts`, `stores/google/api.ts` | The purchase token is missing or Google says it is not valid, `product_ids` is missing for a one-time product, or a pending purchase was cancelled |
| 400 | 7102 | Receipt already in use | `services/purchases.ts` | Another known user owns this purchase and the project's transfer behaviour is `keep`, or `transfer_if_no_active` while that user still has an active subscription |

### Temporary: 5xx, the SDK retries
| HTTP | Code | Meaning | Thrown in | When |
|---|---|---|---|---|
| 500 | 7234 | App Store in-app purchase key problem | `stores/apple/index.ts` | A StoreKit 1 receipt arrived and the app has no in-app purchase key. The SDK retries after you add the key |
| 500 | 7234 | App Store in-app purchase key problem | `stores/apple/api.ts` | The key is incomplete, the private key is not a valid `.p8`, or Apple rejected it with 401 |
| 503 | 7101 | Store problem | `stores/apple/api.ts`, `stores/apple/index.ts` | Apple could not be reached, answered 429 or 5xx, or returned something RevenueDot could not verify |
| 503 | 7101 | Store problem | `stores/google/index.ts`, `stores/google/api.ts` | The Google purchase is still pending payment, the service account is missing or rejected, the package name is wrong, or Google failed |
| 500 | 7110 | Internal error | `errors.ts` | Anything unexpected inside RevenueDot, such as a database error |

A wrong App Store key or Google service account is your setup problem, not the customer's. That is why it answers 5xx: the purchase stays on the device until you fix the credentials.

## What to do
1. **Read the `message`.** It names the cause, for example the bundle ID it expected.
2. **For 7225,** check that the SDK uses the public key of an app in this project. See [Which key goes where](../concepts/projects-and-apps.md#which-key-goes-where).
3. **For 7103 from the App Store,** check the app's `bundle_id` matches the build you are testing. For Xcode StoreKit testing, add the `xcode_certificate` credential. See [How do I test purchases without real money?](test-sandbox-purchases.md)
4. **For 7103 from Google,** check the app's `package_name`, and that the purchase was made by this app.
5. **For 7102,** decide who should own restored purchases and set `transfer_behavior`. See [How do I restore purchases?](restore-purchases.md)
6. **For 7662,** use an App Store, Mac App Store, Google Play, Amazon Appstore, Stripe or Test Store app. Web Billing, Paddle and Roku are not supported yet.
7. **For 7234,** add the App Store in-app purchase key to the app. See [Connect the App Store](../guides/app-store.md). For local development only, you can set `allow_unsigned_receipts`.
8. **For 7101 from Google,** run **Verify credentials** on the app page, or `POST /v2/projects/{project_id}/apps/{app_id}/actions/verify_credentials`, and grant the service account access in Play Console. See [Connect Google Play](../guides/google-play.md).
9. **For 7110,** read the server log. The error is printed there with its stack. Open an issue if it looks like a bug.

After you fix a 5xx cause, you do not need to change the app. The transaction is still unfinished on the device, so the SDK posts it again the next time it retries pending transactions.

## Related
- [Why is my entitlement not active?](entitlement-not-active.md)
- [Troubleshooting by symptom](troubleshooting.md)
- [API errors](../../api/errors.md)
- [SDK endpoints](../../api/sdk-endpoints.md)

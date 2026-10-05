---
title: How RevenueDot stays compatible with the RevenueCat SDK
description: The endpoints the SDK calls, the customer info it decodes, the 4xx/5xx rule that protects purchases, the contract tests, and response signing byte by byte.
date: 2026-09-30
author: RevenueDot team
---

# How RevenueDot stays compatible with the RevenueCat SDK

RevenueDot works with the RevenueCat SDK because it answers the SDK's HTTP calls with the same paths, the same JSON, the same headers and the same error codes the SDK expects. We do not guess that shape: the tests run the request and response samples from the SDKs' own test suites against our server, and a change that breaks one does not merge. This post walks through the contract, from the endpoints to the signature bytes, and ends with what proxy mode cannot fix.

## The SDK talks to a handful of endpoints
Every RevenueCat SDK accepts a proxy URL and sends its API calls there instead of RevenueCat's host. RevenueDot serves those calls. The ones that matter most:

| Endpoint | What the SDK uses it for |
|---|---|
| `GET /v1/subscribers/{app_user_id}` | Customer info: active entitlements, subscriptions, one-time purchases |
| `GET /v1/subscribers/{app_user_id}/offerings` | The offerings and packages the paywall shows |
| `POST /v1/receipts` | Every purchase, restore and sync |
| `POST /v1/subscribers/identify` | `logIn`: 201 when the user is new, 200 when it existed |
| `POST /v1/subscribers/{app_user_id}/attributes` | Customer attributes such as `$email` |
| `GET /v1/product_entitlement_mapping` | Offline entitlements when the server is unreachable |

Every call carries `Authorization: Bearer <public app key>`. The key prefix, such as `appl_`, `goog_` or `test_`, is the same as RevenueCat's, so SDK checks on the prefix pass. RevenueDot also serves the smaller calls the SDK makes on start, such as remote configuration, events and diagnostics. When a feature is not built, the answer is shaped so the SDK hides it. Customer Center answers 404, virtual currencies answer an empty list, and remote configuration answers 204.

## Customer info is the heart of the contract
The SDK decodes one JSON document into `CustomerInfo`. Here is a real one from a local server, after a Test Store purchase, shortened:

```json
{
  "request_date": "2026-09-30T20:41:54Z",
  "request_date_ms": 1790800914034,
  "subscriber": {
    "entitlements": {
      "pro": { "expires_date": "2026-10-30T20:41:54Z", "grace_period_expires_date": null, "product_identifier": "pro_monthly", "purchase_date": "2026-09-30T20:41:54Z" }
    },
    "first_seen": "2026-09-30T20:41:54Z",
    "management_url": null,
    "non_subscriptions": {},
    "original_app_user_id": "user_1",
    "subscriptions": {
      "pro_monthly": {
        "expires_date": "2026-10-30T20:41:54Z", "is_sandbox": true, "ownership_type": "PURCHASED", "period_type": "normal",
        "store": "test_store", "store_transaction_id": "test_1790800914000_quickstart", "unsubscribe_detected_at": null,
        "price": { "amount": 9.99, "currency": "USD" }
      }
    }
  },
  "purchased_products": { "pro_monthly": { "should_consume": false } }
}
```

Two details show how exact this has to be. `purchased_products` tells Android whether to consume a one-time purchase: get it wrong and a consumable can be bought only once. And iOS matches a one-time purchase to its transaction through `store_transaction_id` inside `non_subscriptions`, so that field must be there.

## A 4xx finishes a purchase; a 5xx keeps it
This is the rule we are strictest about. When `POST /v1/receipts` fails, the SDK looks at the status code. On a 4xx it treats the purchase as permanently bad and finishes the transaction. On a 5xx it keeps the transaction and retries later. You can see the rule in purchases-ios, where a failed post is "finishable" only when it is not a server error ([NetworkError.swift](https://github.com/RevenueCat/purchases-ios/blob/main/Sources/Networking/HTTPClient/NetworkError.swift)).

So a server that answers 4xx for its own bug can make a paying customer lose a purchase. RevenueDot never does. Its error handler turns anything unexpected into HTTP 500 with code 7110, and a store that is down or slow becomes 503 with code 7101. Only a receipt that can never be valid gets a 4xx:

| HTTP | Code | Meaning |
|---|---|---|
| 401 | 7225 | Invalid API key |
| 400 | 7103 | Invalid receipt: bad signature, wrong bundle ID, malformed token |
| 400 | 7102 | Receipt already in use by another user, under the `keep` rule |
| 400 | 7662 | Receipts for this store are not supported yet |
| 500 | 7234 | App Store in-app purchase key missing or rejected, so the app retries after you fix it |
| 503 | 7101 | Apple or Google failed; try again |
| 500 | 7110 | Anything unexpected inside RevenueDot |

A missing App Store key is a 5xx on purpose. It is your setup problem, not the customer's, so the purchase waits on the device until you add the key. Every code is listed, with where it is thrown, in [4xx or 5xx](../docs/help/receipt-errors-4xx-vs-5xx.md).

## The tests use the SDKs' own samples
The RevenueCat SDKs are MIT-licensed, and their test suites contain real request and response samples. We copied 94 of them from purchases-ios and purchases-android into `packages/contract/fixtures`, with the upstream notice. The contract tests do three things with them:
1. Check that the real RevenueCat responses pass our schemas, so the schemas are right.
2. Run the same requests against RevenueDot and check that our responses pass the same schemas, with the same keys.
3. Cover the behaviour around them: 201 versus 200 on `logIn`, 7102 under the `keep` rule, `should_consume` for consumables, the `TRANSFER` event on a restore.

For the REST API, the tests validate our `/v2` responses against the response schemas in RevenueCat's published OpenAPI files ([API v2 reference](https://www.revenuecat.com/docs/api-v2)). The spec files are not copied into our repository, so this suite runs where the spec is downloaded.

Webhooks get their own test. For every event type we send, it builds the event through the real purchase pipeline and compares it, key by key, with a RevenueCat sample payload. The keys must be the same, `null` where the sample has `null`, and left out where the sample leaves them out. Three keys are on a short, documented list of gaps: `experiments`, `renewal_number` and `metadata`.

## Response signing, byte by byte
Recent RevenueCat SDKs can verify that a response came from a server holding the right key. RevenueCat calls this Trusted Entitlements ([RevenueCat docs](https://www.revenuecat.com/docs/customers/trusted-entitlements)). RevenueDot implements the same wire format, read from the MIT source of purchases-ios ([Signing.swift](https://github.com/RevenueCat/purchases-ios/blob/main/Sources/Security/Signing.swift)) and purchases-android.

When `REVENUEDOT_SIGNING_KEY` holds an Ed25519 seed, the server adds an `X-Signature` header to every 2xx and 3xx response under `/v1` and `/rcbilling`. It is base64 of 180 bytes:

| Bytes | Content |
|---|---|
| 0 to 31 | An intermediate Ed25519 public key |
| 32 to 35 | The intermediate key's expiry, in days since 1970, little-endian |
| 36 to 99 | The root key's signature over the expiry and the intermediate key |
| 100 to 115 | A random salt |
| 116 to 179 | The intermediate key's signature over the message |

The message is the salt, then the API key, the request's `X-Nonce`, the raw request path, `X-Post-Params-Hash`, `X-Headers-Hash`, `X-RevenueCat-Request-Time`, `X-RevenueCat-ETag`, and the response body. The server mints an intermediate key in memory, valid for 30 days, and replaces it when 7 days are left. The public root key is at `GET /.well-known/revenuedot-signing-key`.

The test for this is simple. An independent verifier first accepts the eight real RevenueCat production signatures published in the purchases-ios test suite, which proves it reads the bytes the way the SDKs do. Then it accepts our signatures, and rejects a changed body, nonce, path, API key or request time, a wrong root key, and an expired intermediate key.

## What proxy mode cannot fix
The proxy URL moves the API calls. It cannot change what is compiled into the SDK.
- **The signing key.** The stock SDK trusts RevenueCat's key, and we cannot sign with it. With verification on, every RevenueDot response reads as `FAILED`. Apps turn the check off.
- **Traffic that ignores the proxy.** The stock Android SDK sends diagnostics, paywall events and ad events to RevenueCat's hosts even behind a proxy. The stock purchases-js sends analytics events to RevenueCat unless you turn them off.
- **Platforms where the proxy does not work.** On Flutter web, the stock SDK ignores `setProxyURL`.

That is why we maintain MIT forks of all ten SDKs. They carry a different signing key and close these gaps, and they keep every name your code imports. The details are in [Why we forked the RevenueCat SDKs](why-we-forked-the-revenuecat-sdks.md).

**About RevenueDot.** RevenueDot is an open-source (AGPL-3.0) backend for in-app purchases and subscriptions on the App Store, Google Play and the web. Start for free on [RevenueDot Cloud](https://app.revenuedot.app/signup): Pro costs $0 until your apps make $10,000 a month, then 0.5% of revenue above $10,000, never more than $999 a month. New apps install the [RevenueDot SDK](../docs/sdks/README.md) and pass their key. Apps that ship the RevenueCat SDK point its proxy URL at RevenueDot and keep their code, offerings and customers. Read the [quickstart](../docs/getting-started/quickstart.md) or the code on [GitHub](https://github.com/revenuedot/revenuedot).

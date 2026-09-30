---
title: How do Trusted Entitlements (response signing) work with RevenueDot?
description: With REVENUEDOT_SIGNING_KEY set, RevenueDot signs every SDK response the way the RevenueCat SDKs verify. The stock SDK trusts only RevenueCat's key, so turn verification off or use a fork built with your key.
---

# How do Trusted Entitlements (response signing) work with RevenueDot?

The RevenueCat SDKs can check that each response really came from the server, by verifying an Ed25519 signature against a public key built into the SDK. RevenueDot signs its responses in exactly that format when you set `REVENUEDOT_SIGNING_KEY`. **The stock SDK only trusts RevenueCat's key**, so against RevenueDot it reports verification `FAILED`. Turn verification off in the stock SDK, or use a RevenueDot fork that trusts your key.

## What each setup gives you
| App uses | Server | Result |
|---|---|---|
| Stock RevenueCat SDK, verification `DISABLED` | any | No check. Everything works. **Recommended for proxy mode** |
| Stock SDK, `INFORMATIONAL` (the iOS and Android default) | any | Entitlements work, but each carries `verification: FAILED` and the SDK logs an error |
| Stock SDK, `ENFORCED` | any | Every request fails. Never use it against RevenueDot |
| RevenueDot fork (official build) | RevenueDot Cloud | `VERIFIED` |
| RevenueDot fork built with your public key | your server with `REVENUEDOT_SIGNING_KEY` | `VERIFIED` |

Defaults of the stock SDKs: iOS and Android are informational; Unity defaults to informational in the Inspector; Capacitor passes no mode, so the native default applies; React Native, Flutter and Kotlin Multiplatform default to disabled; Cordova has no setting and logs the failure; purchases-js does not verify. Each [SDK guide](../sdks/README.md) shows the exact setting. RevenueCat describes the feature in its [Trusted Entitlements docs](https://www.revenuecat.com/docs/customers/trusted-entitlements).

## Turn signing on in your server
1. Generate a key pair in a checkout of the server repository:
   ```bash
   pnpm tsx scripts/signing-keygen.ts
   ```
   ```text
   REVENUEDOT_SIGNING_KEY=3q2+7w...base64 of a 32-byte seed...=
   public key: ZzwPxGlon0E8ErpDh9QAH0Jh6+E6D6qufvTSetXZY9Y=
   ```
2. Give the first line to the server as an environment variable, and keep it in your password manager. See [Self-hosting](self-hosting.md#set-the-signing-key). Anyone with the seed can sign responses your apps trust.
3. Restart and check the public key:
   ```bash
   curl -s http://localhost:8787/.well-known/revenuedot-signing-key
   ```
   ```json
   {"algorithm":"Ed25519","public_key":"ZzwPxGlon0E8ErpDh9QAH0Jh6+E6D6qufvTSetXZY9Y=","encoding":"base64","header":"X-Signature","docs":"https://revenuedot.app/docs"}
   ```
   Without a key this answers 404 and responses are not signed.

## What gets signed
Every 2xx and 3xx response under `/v1` and `/rcbilling` carries an `X-Signature` header. The SDK sends a random `X-Nonce` with requests it verifies, and the nonce is part of the signed message. The value is base64 of 180 bytes, the layout the iOS and Android SDKs verify (`apps/server/src/services/signing.ts`):

| Bytes | Content |
|---|---|
| 0 to 31 | An intermediate Ed25519 public key |
| 32 to 35 | The intermediate key's expiry, in days since 1970-01-01, little-endian |
| 36 to 99 | The root key's signature over the expiry and the intermediate key |
| 100 to 115 | A random salt |
| 116 to 179 | The intermediate key's signature over the message |

The message is the salt, the API key, the nonce, the request path, the `X-Post-Params-Hash` and `X-Headers-Hash` request headers, the `X-RevenueCat-Request-Time` and `X-RevenueCat-ETag` response headers, and the body. The server makes a new intermediate key every 30 days (7 days before the old one expires) and keeps it in memory; only the root seed is configured.

The server's contract tests check this format against real RevenueCat signatures published in the purchases-ios test suite, and check that tampered bodies, nonces, paths, keys and expired intermediate keys are rejected.

## Verify against your own server
The official forks trust RevenueDot Cloud's public key (`gXdn2hmqR/TbdtQwK02laE0YgFz0Rtf918LICLrgZhg=`). A self-hosted server cannot sign with that key. To get `VERIFIED` against your own server, build the forks with your public key and, optionally, your host. The fork pipeline in the server repository does it:

```bash
# In a checkout of revenuedot/revenuedot, with the fork repositories cloned next to it.
pnpm tsx scripts/forks/apply.ts --all \
  --var apiHost=https://revenuedot.example.com \
  --var signingPublicKey=ZzwPxGlon0E8ErpDh9QAH0Jh6+E6D6qufvTSetXZY9Y=
# or: REVENUEDOT_FORK_API_HOST=... REVENUEDOT_FORK_SIGNING_PUBLIC_KEY=... pnpm tsx scripts/forks/apply.ts --all
```

Then build and ship those SDK builds. Rotating the root key means shipping new SDK builds, because the key is compiled into the app. Choose it once and guard it.

## Related
- [Why does the SDK report signature verification FAILED?](../help/signature-verification-failed.md)
- [How do I connect my app?](../getting-started/connect-your-app.md)
- [SDK endpoints: response signing](../../api/sdk-endpoints.md)

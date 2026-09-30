---
title: Why does the SDK report signature verification FAILED in proxy mode?
description: The stock RevenueCat SDK checks responses against RevenueCat's signing key, which RevenueDot cannot use. Turn verification off, or build the SDK forks with your own key.
---

# Why does the SDK report signature verification FAILED in proxy mode?

The stock RevenueCat SDK trusts only RevenueCat's response-signing key, and RevenueDot cannot sign with it. So when entitlement verification is on, every RevenueDot response reads as `FAILED`. Access is still granted in the default informational mode, and nothing breaks. The fix is to turn verification off in the app, or to use the RevenueDot SDK forks built with your own server's key. **Never use ENFORCED mode with the stock SDK against RevenueDot**: it would reject every response.

RevenueCat calls this feature Trusted Entitlements. Its modes are disabled, informational and enforced ([RevenueCat docs](https://www.revenuecat.com/docs/customers/trusted-entitlements)).

## What each SDK does by default
| SDK | Default mode | What you see | Fix with the stock SDK |
|---|---|---|---|
| iOS, Android (native) | Informational | A logged verification failure; access is still granted; `EntitlementInfos.verification` is `FAILED` | Set the mode to disabled |
| Unity | Informational | Same as native | Set **Entitlement Verification Mode** to **Disabled** on the Purchases component in the Inspector |
| Capacitor | None passed, so the native default applies (informational) | Same as native | Pass `ENTITLEMENT_VERIFICATION_MODE.DISABLED` to `configure` |
| React Native, Flutter, Kotlin Multiplatform | Disabled | Nothing | Nothing to do |
| Cordova | No option | A logged verification failure; access is still granted | Nothing you can change; ignore the log line |
| Web (purchases-js) | Does not verify | Nothing | Nothing to do |

## Turn verification off
```swift
// iOS: Point the SDK at your RevenueDot server; nothing else in the app changes.
Purchases.proxyURL = URL(string: "https://revenuedot.example.com")!
Purchases.configure(with: Configuration.Builder(withAPIKey: "appl_...")
  .with(entitlementVerificationMode: .disabled)
  .build())
```

```kotlin
// Android: Point the SDK at your RevenueDot server; nothing else in the app changes.
Purchases.proxyURL = URL("https://revenuedot.example.com")
Purchases.configure(
  PurchasesConfiguration.Builder(context, "goog_...")
    .entitlementVerificationMode(EntitlementVerificationMode.DISABLED)
    .build()
)
```

```ts
// Capacitor: Point the SDK at your RevenueDot server; nothing else in the app changes.
await Purchases.setProxyURL({ url: "https://revenuedot.example.com" });
await Purchases.configure({ apiKey: "appl_...", entitlementVerificationMode: ENTITLEMENT_VERIFICATION_MODE.DISABLED });
```

On React Native, Flutter and Kotlin Multiplatform, leave the mode at its default. If your code sets it to informational, remove that line.

## Get VERIFIED instead: sign with your own key
RevenueDot can sign responses exactly the way the SDKs check them. It signs every 2xx and 3xx response under `/v1` and `/rcbilling` when `REVENUEDOT_SIGNING_KEY` is set. For your app to accept those signatures, the SDK must carry your public key, which means building the forks.

1. **Make a key pair** in a checkout of the server repo:
   ```bash
   pnpm tsx scripts/signing-keygen.ts
   ```
   ```text
   REVENUEDOT_SIGNING_KEY=<base64 private seed>
   public key: <base64 public key>
   ```
2. **Give the server the private seed** as the `REVENUEDOT_SIGNING_KEY` environment variable, and restart it. Keep it out of every repository.
3. **Check the public key** the server now serves:
   ```bash
   curl -s https://revenuedot.example.com/.well-known/revenuedot-signing-key
   ```
   ```json
   {"algorithm":"Ed25519","public_key":"ZzwPxGlon0E8ErpDh9QAH0Jh6+E6D6qufvTSetXZY9Y=","encoding":"base64","header":"X-Signature","docs":"https://revenuedot.app/docs"}
   ```
   Without a key it answers 404 with "Response signing is not configured on this server."
4. **Build the forks with your host and key:**
   ```bash
   pnpm tsx scripts/forks/apply.ts --var apiHost=https://revenuedot.example.com --var signingPublicKey=<your public key>
   ```
   You can also set `REVENUEDOT_FORK_API_HOST` and `REVENUEDOT_FORK_SIGNING_PUBLIC_KEY`. Then build the fork for your platform and ship it in your app.
5. **Turn verification back on** (informational) in the app, and check that `verification` reads `VERIFIED`.

The official RevenueDot forks trust RevenueDot Cloud's key (`gXdn2hmqR/TbdtQwK02laE0YgFz0Rtf918LICLrgZhg=`). A self-hosted server cannot sign with that key, so the official builds still report `FAILED` against your server. The forks are not published to any registry yet as of 2026-09-30. Full details are in [Trusted Entitlements](../guides/trusted-entitlements.md).

## Related
- [Trusted Entitlements](../guides/trusted-entitlements.md)
- [Connect your app](../getting-started/connect-your-app.md)
- [SDK changes when migrating](../migrate/sdk-changes.md)
- [Blog: Why we forked the RevenueCat SDKs](../../blog/why-we-forked-the-revenuecat-sdks.md)

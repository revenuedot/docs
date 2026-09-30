---
title: What is purchases-hybrid-common, and do I need to install it?
description: purchases-hybrid-common is the shared native and TypeScript layer under the React Native, Flutter, Capacitor, Unity and Cordova SDKs. App developers never install it directly; the wrapper pulls it in.
---

# What is purchases-hybrid-common, and do I need to install it?

`purchases-hybrid-common` is the shared layer that the cross-platform SDKs (React Native, Flutter, Capacitor, Unity and Cordova) sit on. It turns their calls into calls on the native iOS and Android SDKs. **You never install it yourself**: your wrapper depends on it, and setting the proxy URL and verification mode in the wrapper is all you need.

## What it contains
| Part | What it does | RevenueDot fork name (planned) | Keeps the name |
|---|---|---|---|
| iOS layer | Swift bridge over the iOS SDK | pods `RevenueDotPurchasesHybridCommon`, `RevenueDotPurchasesHybridCommonUI` | modules `PurchasesHybridCommon`, `PurchasesHybridCommonUI` |
| Android layer | Kotlin bridge over the Android SDK | Maven `app.revenuedot.purchases:purchases-hybrid-common` (and `-ui`) | Kotlin packages |
| TypeScript types | Shared types and enums such as `ENTITLEMENT_VERIFICATION_MODE` | npm `@revenuedot/purchases-typescript-internal` and `-esm` | installed through npm aliases, so imports stay `@revenuecat/...` |
| Web mappings | Runs purchases-js in browser mode (Expo Go, React Native web, Flutter web) | npm `@revenuedot/purchases-js-hybrid-mappings` | installed through an npm alias |

The fork is [github.com/revenuedot/purchases-hybrid-common](https://github.com/revenuedot/purchases-hybrid-common), branch `revenuedot/main-patches`, version 19.4.1.

## Which wrappers use it
| Wrapper | Native layer | TypeScript or web packages | Fork pin |
|---|---|---|---|
| [React Native](react-native.md) | Yes | `purchases-typescript-internal`, `purchases-js-hybrid-mappings` | 19.4.1 |
| [Flutter](flutter.md) | Yes | A copy of the web mappings for Flutter web | 19.4.1 |
| [Capacitor](capacitor.md) | Yes | `purchases-typescript-internal-esm` | 19.4.1 |
| [Unity](unity.md) | Yes, through EDM4U | none | 19.4.1 |
| [Cordova](cordova.md) | Yes | none | 19.4.1 |

[Kotlin Multiplatform](kotlin-multiplatform.md) does not use it: it builds on the iOS and Android SDKs directly. The native [iOS](ios.md), [Android](android.md) and [web](web.md) SDKs do not use it either.

## How the forks fit together
The RevenueDot forks pin each other, so a wrapper fork gets the RevenueDot builds all the way down:
- The hybrid-common fork depends on RevenueDot's iOS fork (`RevenueDotPurchases` 5.91.0) and Android fork (`app.revenuedot.purchases:purchases` 10.23.3).
- The web mappings depend on RevenueDot's purchases-js fork through an npm alias.
- Every wrapper fork depends on hybrid-common 19.4.1.

That chain is why the wrapper forks cannot be used before release: nothing in it is on CocoaPods, Maven Central or npm yet (2026-09-30). Publishing runs in dependency order: iOS and Android first, then hybrid-common, then purchases-js and the web mappings, then the wrappers.

## What it means for proxy mode
- You do nothing here. The wrapper's `setProxyURL` and verification option pass through hybrid-common to the native SDK.
- With the stock wrappers, hybrid-common is RevenueCat's build, which trusts RevenueCat's signing key. That is why you turn verification off. See [Trusted Entitlements](../guides/trusted-entitlements.md).

## Related
- [All SDKs](README.md)
- [SDK changes when you migrate](../migrate/sdk-changes.md)
- [Trusted Entitlements](../guides/trusted-entitlements.md)

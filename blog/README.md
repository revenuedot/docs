---
title: RevenueDot blog
description: Posts from the RevenueDot team about building RevenueDot Cloud, an open-source backend for in-app purchases that works with the RevenueCat SDK.
date: 2026-09-30
author: RevenueDot team
---

# RevenueDot blog

Posts from the team building RevenueDot, an open-source (AGPL-3.0) backend for in-app purchases and subscriptions that works with the RevenueCat SDK, free to start on [RevenueDot Cloud](https://app.revenuedot.app/signup). Newest first.

## 2026-10-02
- [react-native-iap vs expo-iap vs react-native-purchases: which to use](react-native-iap-vs-expo-iap-vs-react-native-purchases.md): what each React Native package does, which ones run in Expo Go, the server each one needs, code side by side, cost, and when each one fits.
- [How to check free trial eligibility on iOS and Android](free-trial-eligibility-ios-android.md): Apple's one-trial-per-group rule, how Google Play filters offers, StoreKit 2 and RevenueCat SDK code, and what the paywall button should say.
- [How to sell a lifetime purchase next to a subscription](lifetime-purchase-and-subscriptions.md): a non-consumable and a one-time product on one entitlement, what to do when a subscriber buys lifetime, refunds, Family Sharing and restore.
- [How to share one subscription across iOS, Android and the web](share-subscription-across-ios-android-web.md): one account ID, one entitlement, what Apple guideline 3.1.3(b) and Google Play's payments policy allow, how to avoid double billing, and where the manage button goes.
- [Restore purchases on iOS and Android: what App Review wants](restore-purchases-ios-android.md): Apple's restore rule, when to call AppStore.sync, queryPurchasesAsync and the three-day rule, restorePurchases vs syncPurchases, and who owns a restored purchase.
- [Flutter in_app_purchase vs purchases_flutter: which to use](flutter-in-app-purchase-vs-purchases-flutter.md): what each package does, the server in_app_purchase needs, code side by side, cost, and when each one fits.
- [Do you still need RevenueCat with StoreKit 2?](storekit-2-vs-revenuecat.md): StoreKit 2 handles purchases on the device. See what it covers, what still needs a server, and how to choose between building, RevenueCat and open source.
- [Subscription app metrics that matter: MRR, churn, LTV and more](subscription-app-metrics.md): the subscription app metrics to track: MRR, churn, trial conversion, LTV and refunds. Plain definitions, worked examples, benchmarks and a link to every chart.
- [How to price a subscription app in 2026: plans, trials, regions](subscription-app-pricing-guide.md): price a subscription app with data: median prices, plans, trial length, regional pricing, price increase consent on both stores, and how to test prices.
- [Paywall A/B testing: what to test, sample size, results](paywall-ab-testing-guide.md): what to test first on a paywall, how many customers each variant needs, how long to run and how to read chance to win, using RevenueDot experiments.
- [How to reduce subscription churn: voluntary and involuntary](reduce-subscription-churn.md): cut subscription churn with a billing grace period, a cancellation flow with an offer, Apple Retention Messaging and win-back campaigns, set up in RevenueDot.
- [Billing grace period and account hold: recover failed renewals](billing-grace-period-and-retry.md): how Apple and Google handle a failed renewal: grace period, billing retry and account hold. See both timelines, the events to watch and how to keep subscribers.
- [Web-to-app funnels: quiz, checkout and app access](web-to-app-funnels.md): how to build a web-to-app funnel: an ad, a quiz, Stripe checkout, then a redemption link that gives the app access, with Meta and TikTok attribution.
- [iOS subscription offer codes: create, redeem and track](ios-subscription-offer-codes.md): how App Store offer codes work for subscriptions: create one-time-use or custom codes, share them, redeem them in your app, and track every redemption.
- [iOS promotional offers: how the signature works and how to sign](ios-promotional-offers-signature.md): promotional offers need a signature from your server. See the seven signed fields, a Node.js example, the StoreKit 2 call and how RevenueDot signs it.
- [Google Play base plans and offers explained for iOS developers](google-play-base-plans-and-offers.md): a Google Play subscription holds base plans and offers. See how they map to iOS groups, products and offers, how eligibility works, and how to buy one.
- [Subscription upgrades and downgrades: iOS levels, Play proration](subscription-upgrades-downgrades.md): how subscription upgrades, downgrades and crossgrades work: iOS subscription groups and levels, Google Play replacement modes, proration, code and events.
- [Test in-app purchases: StoreKit, sandbox, TestFlight and Play](sandbox-testing-in-app-purchases.md): test subscriptions without real money: StoreKit configuration files, sandbox accounts, TestFlight, Play license testers and a Test Store with no store at all.
- [Apple's Retention Messaging API: setup, approval and offers](apple-retention-messaging-api.md): how Apple's Retention Messaging API shows a message or offer on the App Store cancel screen, what approval you need and how to set it up in RevenueDot.
- [Migrate from Adapty to an open-source backend (RevenueDot)](migrate-from-adapty.md): move an app from Adapty to RevenueDot: swap the SDK, re-sync active subscribers from store receipts, reroute store notifications and run both side by side.
- [Migrate from Qonversion to an open-source backend (RevenueDot)](migrate-from-qonversion.md): move an app from Qonversion to RevenueDot: swap the SDK, rebuild the catalog, re-sync active subscribers from receipts and run both backends side by side.
- [Move off Superwall: keep its paywalls or replace them](migrate-from-superwall.md): Superwall is a paywall layer plus a subscription layer. Learn how to move the backend to RevenueDot, replace the paywalls, or do both, and what each path costs.

## 2026-10-01
- [Paywall best practices for 2026: what the data says](paywall-best-practices-2026.md): the pattern that wins in 2026 and the sourced numbers behind each part, with links to seven deep dives.
- [Hard paywall vs freemium: conversion and revenue data](hard-paywall-vs-freemium.md): 10.7% against 2.1% median Day-35 conversion, $3.09 against $0.38 revenue per install, and the refund trade-off.
- [Free trial timeline paywall: why it works and how to build it](free-trial-timeline-paywall.md): the "how your free trial works" timeline, what to write in each step, and how to build it.
- [Apple free trial toggle rejection: what to ship instead (2026)](apple-free-trial-toggle-rejection.md): guideline 3.1.2, what Apple rejects, the guideline numbers that matter, and compliant alternatives.
- [Onboarding quiz before a paywall: steps, order and why it works](onboarding-quiz-before-paywall.md): the Cal AI pattern, with the stages in order and the median step where paywalls appear.
- [Weekly vs annual subscriptions: which earns more in 2026](weekly-vs-annual-subscriptions.md): weekly plans earn 55.5% of revenue, annual leads in health and fitness, and how to show both.
- [Multi-page paywalls vs single page: the 2026 data and layout](multi-page-paywalls.md): 12.41% against 9.07% conversion, a three-page layout, and what RevenueDot supports today.
- [Paywall exit offers: discount after a cancelled purchase](paywall-exit-offers.md): 17% of revenue from abandon offers, the App Store rules, and how to build one.
- [RevenueCat pricing in 2026, explained (and how to pay less)](revenuecat-pricing-explained.md): 1% of all tracked revenue once you pass $2,500, worked bills from $5K to $1M, and the options.
- [Add subscriptions to a SwiftUI app](swiftui-subscriptions-tutorial.md): StoreKit 2 products, the RevenueCat SDK in proxy mode, a paywall, entitlement checks and restore.
- [Flutter in-app purchases and subscriptions](flutter-in-app-purchases-tutorial.md): purchases_flutter from install to a tested purchase on iOS and Android.
- [React Native and Expo subscriptions](react-native-expo-subscriptions-tutorial.md): react-native-purchases in a development build, purchase, restore and testing.
- [Android subscriptions with Google Play Billing](android-google-play-billing-subscriptions.md): Kotlin, base plans, the Play service account and real-time developer notifications.
- [App Store Server Notifications V2](app-store-server-notifications-v2.md): setup and every notification type, explained.
- [Server-side in-app purchase validation](server-side-receipt-validation.md): the App Store Server API, Google's subscriptionsv2, and when to build or use a server.
- [Apple refund requests and CONSUMPTION_REQUEST](apple-refund-requests-consumption-info.md): what Apple asks for, the deadline, and how to answer automatically.
- [Selling iOS subscriptions on the web with Stripe](web-checkout-for-ios-apps-stripe.md): the US ruling, the web-to-app flow and unlocking web purchases in the app.
- [Running your own in-app purchase server](self-hosted-in-app-purchase-server.md): for teams that must run their own server.

## 2026-09-30
- [Introducing RevenueDot](introducing-revenuedot.md): what we are building, why, and what it does today.
- [How RevenueCat compatibility works](how-revenuecat-compatible-works.md): the SDK endpoints, the error-code rule that protects purchases, the contract tests, and response signing byte by byte.
- [Migrating from RevenueCat without losing a subscriber](migrating-from-revenuecat-without-data-loss.md): import, keep your public keys, run both side by side, verify, then switch.
- [Run RevenueDot locally in 5 minutes](self-host-revenuedot-in-5-minutes.md): Docker Compose, a seeded project, a first Test Store purchase with `curl` and a webhook to your laptop.
- [Why we forked the RevenueCat SDKs](why-we-forked-the-revenuecat-sdks.md): ten MIT forks, what the patches change, why import names stay the same, and how the forks keep up with upstream.

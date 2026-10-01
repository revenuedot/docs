---
title: Paywalls
description: Build a native paywall in the dashboard from a template, publish it to an offering, and show it in your app with RevenueCatUI's PaywallView.
---

# Paywalls

A paywall is the screen that sells your offering. RevenueDot serves paywalls in the format the RevenueCat SDKs render natively (paywall components, also called Paywalls V2), so you build and change it in the dashboard and your app shows it with one view, without an app release.

## Build one

1. Create an offering with its packages (for example `$rc_monthly` and `$rc_annual`). See [Offerings](../concepts/offerings-and-packages.md).
2. In the dashboard, open **Paywalls**, select **New paywall** and choose the offering.
3. Pick a template: **Classic** (headline, features, packages), **Hero image** (adds an image on top) or **Minimal** (headline and packages).
4. Write the headline, subheadline, features and button text. Rename each package as it should appear, choose which one is selected when the paywall opens, and set the colours. The preview on the right updates as you type.
5. Select **Save draft** to keep your work, or **Publish** to send it to apps.

Prices come from the App Store or Google Play on the device, so each package shows the customer's local price and period.

## Show it in your app

Add the RevenueCatUI library next to the SDK, then present the paywall. It shows the current offering's paywall.

```swift
import RevenueCatUI

.sheet(isPresented: $showPaywall) { PaywallView() }
```

```kotlin
// Jetpack Compose, com.revenuecat.purchases:purchases-ui
PaywallDialog(PaywallDialogOptions.Builder().build())
```

```tsx
// React Native, react-native-purchases-ui
import RevenueCatUI from "react-native-purchases-ui";
await RevenueCatUI.presentPaywall();
```

```dart
// Flutter, purchases_ui_flutter
await RevenueCatUI.presentPaywall();
```

## Publishing rules

- An offering has at most one paywall. A paywall needs an offering before it can be published.
- Apps only ever receive the **published** version. A draft stays private until you publish it.
- **Unpublish** stops apps from receiving it and keeps your content as a draft.
- Apps fetch offerings at launch and when they come back to the foreground, so a change reaches them within one session.

## Images and fonts

Hero images and fonts are stored with your project and served from `/assets/{project_id}/...` on your RevenueDot server, with year-long caching. Upload images in the editor, or through the API with `POST /v2/projects/{project_id}/media_assets` and fonts with `POST /v2/projects/{project_id}/fonts`.

## Use the API

Everything the editor does is in REST API v2: create with `POST /v2/projects/{project_id}/paywalls`, change the draft with `PATCH .../paywalls/{paywall_id}` (send the `revision` you read), publish with `POST .../actions/publish`. See the [API reference](../../api/rest-v2.md).

## What is not built yet

A free-form drag-and-drop canvas, tabs, carousels, countdowns and timelines, and translations beyond the default locale. Paywalls you build in RevenueCat's editor can be pasted as `components_config` through the API.

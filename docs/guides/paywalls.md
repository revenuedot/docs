---
title: Paywalls
description: Build a native paywall from a template, with the visual editor or with AI, translate it, publish it to an offering, and show it in your app with RevenueCatUI's PaywallView.
---

# Paywalls

A paywall is the screen that sells your offering. RevenueDot serves paywalls in the format the RevenueCat SDKs render natively (paywall components, also called Paywalls V2). You build and change a paywall in the dashboard, and your app shows it with one view, without an app release.

The dashboard has three ways to start, a visual editor, translations, and a server check that every published paywall decodes in the SDK.

## Start a paywall

Open **Paywalls** in the dashboard. You can start in three ways:

1. **Use a template.** The gallery has ten layouts, each built on a measured 2026 result. Filter by number of screens, purchase method (in-app or web), number of packages and number of tiers. The previews use your offering's packages. Pick a template, choose the offering, add your app name, accent colour, and Terms and Privacy links, and select **Create paywall**.
2. **Start from scratch.** You get a headline, your offering's packages and a purchase button to build on.
3. **Generate with AI.** Describe the app and the offer, for example "A calm sleep app, explain the 7-day trial, yearly first". You can add the app name and up to three brand colours. RevenueDot returns a paywall you can edit before you save it. This option shows only when a language model is configured (see [AI on a self-hosted server](#ai-on-a-self-hosted-server)).

| Template | What it does | Built on |
|---|---|---|
| Trial timeline | Explains the free trial day by day, then two plans with yearly selected | A "how your free trial works" timeline: +23% trial starts (Blinkist) |
| Annual first | Benefits, then yearly and monthly with a savings badge | Yearly pre-selected: the yearly share of purchases went from 37% to 63% (Superwall) |
| Feature hero | A full-width image, five benefits with icons, plans side by side | Opening on value with 3 to 5 benefit lines |
| Free vs Pro | A short comparison table, then two plans | A simple paywall beat a long comparison chart by 111% (Superwall) |
| Minimal | A headline, your plans and one button | Plain plan names add 10% (Superwall) |
| Story pages | Three swipeable value pages before the plans | 2 to 3 pages converted 37% better than one (Superwall 2026) |
| Limited offer | A countdown to the end of an offer, one plan, dark | Discount offers after a cancelled purchase made 17% of revenue (Superwall) |
| Tiers | Two tiers in tabs (Plus and Pro), two plans each | Tiers let a customer pick a level, then a period |
| Reviews | Rating, a user count and one review, then two plans | Reviews with price anchoring: +17% revenue per user (RevenueCat) |
| Web checkout | The button opens web checkout instead of the store sheet (iOS; see [web billing](web-billing.md#the-ios-sdks-web-checkout)) | Use it only where the store rules allow external purchases |

## Edit a paywall

The editor has three columns:

- **Layers** on the left list every component. Select a layer to edit it. You can also drag it to a new place, move it with the arrow buttons, duplicate it or remove it. **Add** inserts any component type after the selected one, or inside it when the selection is a container.
- **The preview** in the middle shows the exact JSON your app gets, on a phone. Click any component in the preview to select it. Above the preview you choose the language, light or dark mode, whether the customer is eligible for an intro offer, and which package is selected.
- **Properties** on the right show the settings of the selected component.

Keyboard shortcuts: ⌘Z undoes and ⇧⌘Z redoes. In the layer list, ↑ and ↓ select, ⌥↑ and ⌥↓ move, ⌥→ moves into the stack above, ⌥← moves out, ⌘D duplicates and ⌫ removes.

What you can set, by component:

| Component | Properties |
|---|---|
| Text | Text per language, an intro-offer text, size, weight, alignment, colour (light and dark), background, font |
| Image | An uploaded image or a URL, a dark-mode image, fit or fill, size, rounded or circle mask, colour overlay |
| Icon | One of 44 built-in icons, size, colour, a circle or rounded background |
| Stack | Vertical, horizontal or overlay; alignment, distribution, spacing, padding, margin, size; a background colour, gradient or image; border, corner radius or pill, shadow, a badge |
| Package | Which of the offering's packages it sells, whether it is selected when the paywall opens, the card layout, and the border and background when selected |
| Purchase button | In-app purchase, web checkout or web product selection |
| Button | Restore purchases, close, open terms, privacy or a URL, Customer Center, offer code |
| Sticky footer | The bar pinned to the bottom (usually the purchase button) |
| Timeline | Steps with an icon, a title and a description; spacing; line and icon colours |
| Tabs | Tab names, the tab that opens first, buttons or a toggle, add and remove tabs |
| Carousel | Pages, peek, spacing, loop, auto-advance, page dots |
| Countdown | The end date and time, count from days, hours or minutes, the content after it ends |
| Video | A video URL, a poster image, autoplay, loop, muted, controls |
| Web view | An https URL shown inside the paywall |

Texts can use variables that the device fills in, for example `{{ product.price_per_period }}`, `{{ product.price_per_month }}`, `{{ product.relative_discount }}` and `{{ product.offer_period_with_unit }}`. Inside a countdown you can use `{{ count_days_with_zero }}`, `{{ count_hours_with_zero }}`, `{{ count_minutes_with_zero }}` and `{{ count_seconds_with_zero }}`. Prices in the preview are sample values. The app shows the store's local price.

**Problems** above the preview lists anything the SDK would not decode or would show wrong, such as a text without a string, a video without a URL or a link that is not a URL. Select **Go to** to open the component. You cannot publish while there are errors.

The **JSON** tab shows what the SDK receives. You can paste JSON there, for example a paywall exported from another tool, and select **Repair** to fill in what is missing.

## Translate a paywall

Open the **Localizations** tab. Add a language, then fill in its strings next to the default language. Empty cells show the default language's text in the app, so a paywall is never blank in a language you have not finished. Switch the language above the preview to check it. The SDK fills in the words around prices, such as "month" and "%d days", in the device's language for English, Spanish, French, German, Italian, Portuguese, Dutch, Russian, Japanese, Korean and Chinese.

## Save and publish

- **Save draft** keeps your work. Apps never see a draft.
- **Publish** checks the paywall first. Then it sends the paywall to apps in the offerings response and in remote config, which iOS SDK 5.83 and later read.
- **Save a version** (in the ⋯ menu) keeps a named copy that you can restore into the draft later.
- **Unpublish** stops apps from receiving the paywall and keeps it as a draft.
- An offering has at most one paywall. A paywall needs an offering before it can be published.
- Apps fetch offerings at launch and when they come back to the foreground, so a change reaches them within one session.

## Show it in your app

Add the RevenueCatUI library next to the SDK, then present the paywall. `PaywallView()` shows the current offering's paywall; pass an offering to show another one.

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

## Images, fonts and icons

Images and fonts are stored with your project. RevenueDot serves them from `/assets/{project_id}/...` on the host your apps talk to (`api.revenuedot.app` on Cloud). They are cached for a year with an `ETag`, and on Cloud repeat downloads come from Cloudflare's edge cache. Upload images in the editor, or through the API with `POST /v2/projects/{project_id}/media_assets`. Upload fonts with `POST /v2/projects/{project_id}/fonts`.

### Icons

Icon and timeline components use 55 built-in icons, served at `/assets/icons/{name}.png` (96 × 96, tinted by the SDK) and `/assets/icons/{name}.svg`. Their names: check, check_circle, x, star, sparkles, lock, unlock, bell, crown, shield, shield_check, zap, heart, gift, clock, calendar, calendar_check, cloud, infinity, chart, trending_up, users, user, download, camera, music, book, globe, moon, sun, flame, target, leaf, dumbbell, mic, image, wand, percent, tag, no_ads, sync, devices, headphones, trophy, credit_card, chat, pencil, search, wind, sliders, layers, smile, file_text, palette, rocket.

## AI on a self-hosted server

RevenueDot Cloud generates paywalls with GPT-6 Luna through the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway), so you need no key. On a self-hosted server, set one of these environment variables and restart. The server uses the first one it finds:

- `AI_GATEWAY_API_KEY`: a Vercel AI Gateway key. The model is `openai/gpt-6-luna`.
- `OPENAI_API_KEY`: OpenAI directly. The model is `gpt-6-luna`, and `OPENAI_BASE_URL` points it at any OpenAI-compatible server.
- `ANTHROPIC_API_KEY`: the model is `claude-sonnet-4-5`.

`REVENUEDOT_PAYWALL_MODEL` picks another model. With the gateway, give a gateway model id, such as `anthropic/claude-opus-5.5`.

Without a key, the dashboard hides "Generate with AI". Each project can generate one paywall every 5 seconds and 60 a day.

The model works in two steps. It first reads your description into a brief: plan order, the highlighted plan, the trial, the benefits and the look. Then it designs the paywall. A checker holds the design to the brief: plan order, trial wording, typed prices and text contrast. Problems go back to the model for a fix before you see the result. The result always decodes in the SDK. The dialog names the model that answered and lists what you still need to set up, such as the free trial on the yearly product in the stores.

## Use the API

Everything the editor does is in REST API v2. See the [API reference](../../api/rest-v2.md).

- Create from a template: `POST /v2/projects/{project_id}/paywalls` with `template_id` and `offering_id`. List the templates with `GET /v2/projects/{project_id}/paywall_templates`.
- Change the draft: `PATCH .../paywalls/{paywall_id}` (send the `revision` you read).
- Check without saving: `POST .../paywalls/validate` returns `errors` and `warnings`; with `repair: true` it also returns the repaired JSON.
- Publish: `POST .../paywalls/{paywall_id}/actions/publish`. It answers 422 with the first problem when the SDK could not render the paywall.
- Generate: `POST .../paywalls/generate` with a `prompt`.
- Versions: `POST .../versions`, `GET .../versions` and `POST .../versions/{version_id}/actions/restore`.

## What is not built yet

- Multi-screen paywalls are pages in one screen (a carousel). Paywalls with several screens and navigation between them are served for their first screen only.
- You cannot drag components directly on the phone. Reorder them in the layer list.
- Video uploads are not stored with your project. A video component takes a URL.
- Exit offers and custom variables have no editor yet. They pass through the API.

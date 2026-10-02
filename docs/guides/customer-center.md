---
title: How do I set up the Customer Center?
description: Pick the actions customers see on the in-app subscription screen, ask why they cancel, attach offers, set colours for light and dark mode, and translate every text, from Lifecycle > Customer Center.
---

# How do I set up the Customer Center?

The Customer Center is the subscription screen the RevenueCat SDK shows inside your app (`CustomerCenterView` on iOS, `CustomerCenter` on Android). The SDK loads its configuration from your RevenueDot server each time the screen opens, so a change you save reaches every app at once, with no release.

Open **Lifecycle > Customer Center**. The page has three tabs, a **Preview** of the screen, **Save changes** and **Reset configuration**.

## Configuration
- **Support**: the email address the Contact support button writes to, and three switches: warn customers on an old app version, show the purchase history, and show the user details section (iOS only). Ticket settings live under [Support](support-integrations.md).
- **Two screens.** "Customers with active subscriptions" is shown to customers with something active; "Customers without active subscriptions" to everyone else. Each has a title, an optional subtitle and an ordered list of paths.
- **Paths.** Select **Add path** and pick one:

| Path | What it does | Settings |
|---|---|---|
| Missing Purchase | Restores purchases from the store account | Button text |
| Refund Request | Opens the store's refund request sheet (iOS) | Button text, promotional offer |
| Change Plans | Switches to another plan of the same subscription group | Button text |
| Manage | Opens the store's subscription management, where the customer cancels | Button text, feedback survey, promotional offer |
| Custom URL | Opens a web page or a deep link | Button text, URL, open in the app or the browser |
| Custom Action | Calls your app's custom action handler with an identifier | Button text, action identifier |

Each type except Custom URL and Custom Action appears once per screen. Drag a path by its handle, or use the arrows, to change the order. Select a path to edit it; **Edit translations** sets its text per language.

- **Feedback survey.** On the Manage path, turn on "Ask why with a feedback survey". It starts with three answers (Too expensive, Don't use the app, Bought by mistake); add, reorder or remove answers, up to 10. Each answer can show its own offer. Answers are reported as `customer_center_survey_option_chosen` events and counted in the Customer Center Survey Responses [chart](charts.md).
- **Promotional offers.** Manage and Refund Request show, by default, the active [retention offers](retention.md) for cancellations or refunds. You can instead pick one retention offer, choose **No offer**, or enter an offer of its own (title, subtitle, and each product's store offer id).

## Appearance
Five colours for light mode and five for dark mode: accent, text, background, button text and button background, as hex values such as `#1A1A1A`. An empty colour keeps the device's default.

## Localization
The screen follows the customer's device language and comes translated into 33 languages. Pick a language to see every predefined string; **Override** turns one into a custom string you can edit, and **Delete selected** removes custom strings. Texts you write yourself (titles, button text, survey answers) are translated with **Edit translations** next to each one; without a translation, the default texts use the built-in translation and your own texts stay as written.

## Through the API
`GET` and `POST /v2/projects/{project_id}/customer_center_config` read and replace the configuration; `GET /v2/projects/{project_id}/customers/{customer_id}/customer_center?locale=de_DE` shows what one customer's app receives. Invalid configurations are refused with a 400 that names each field. See the [API reference](../../api/extensions.md#set-the-customer-center-configuration).

---
title: How do I build a web-to-app funnel?
description: Build a multi-step funnel (questions, info, email, paywall, success) in the dashboard or with AI, publish it to a public URL, sell on Stripe Checkout, and see where visitors drop off. Funnel events can go to webhooks and to Segment, Amplitude, Mixpanel and PostHog.
---

# How do I build a web-to-app funnel?

Open **Funnels** in the dashboard and click **Create funnel**. A funnel is a few screens in a row, such as a quiz, a proof point, an email field, the plans and a success page. Edit the steps in the builder, check them in the live preview, and click **Publish**. The funnel then lives at a public URL such as `https://api.revenuedot.app/pay/scanner/focus-quiz`. Visitors pay on Stripe Checkout and open the app with a [redemption link](redemption-links.md). The **Analytics** tab shows where they drop off.

First finish the four steps in [Sell on the web with Stripe](web-billing.md). A funnel's paywall step sells an offering's web products.

## Start a funnel
- **New funnel from the starter**: a question, an info step, an email step, the paywall and the success step, in your web config's colours.
- **New blank funnel**: the paywall and the success step only.
- **Build with AI**: describe the funnel, such as "A fitness app for beginners with an email step before the paywall". See [Build with AI](#build-with-ai).

## The builder
- **Steps** on the left: add, reorder, duplicate and delete steps.
- **Properties** in the middle: the selected step's texts and options, and the theme (colours and corner radius, with the presets Ink, Night, Ocean, Forest and Sunset).
- **Preview** on the right: the real page in a phone frame, showing the selected step with your web prices. Discount codes and payments only run on the public page.
- **Publish** (or **Publish changes**), **Unpublish**, the public URL with a copy button, and the **Analytics** tab.

Edits are saved as a draft. Visitors keep seeing the published copy until you publish again.

## Step types
| Type | What the visitor sees | Fields |
|---|---|---|
| `question` | A question with 1 to 8 answers | `options` (`id`, `label`, optional `next`), `multiple`, `attribute`, `button_label` |
| `info` | A short text, with an optional image | `body`, `image_url` (https), `button_label` |
| `email` | An email field | `placeholder`, `required` (default true), `button_label` |
| `paywall` | The offering's web plans and the pay button | `offering`, `features`, `highlight_package`, `discount_id`, `allow_codes`, `button_label` |
| `success` | The end page after payment | `body`, `show_redemption` |

Every step has an `id`, a `type`, a `title` and an optional `subtitle`.

- **Questions.** A single-choice question moves on as soon as the visitor taps an answer. With `multiple: true` the visitor picks several and taps the button.
- **Email.** The address goes to Stripe Checkout as `customer_email` and becomes the customer's `$email` attribute. The redemption link is emailed there.
- **Paywall.** `offering` is the offering's lookup key, or null for the current offering. `features` are up to 8 bullet lines. `highlight_package` is the package selected first, such as `$rc_annual`. `discount_id` applies a [web discount](web-discounts.md) without a code. `allow_codes` shows the code field.
- **Success.** Shown after payment. With `show_redemption`, it shows **Open the app** and the store buttons. A visitor who arrived with `?app_user_id=` sees that the purchase is linked to their account instead.

## The funnel JSON
The builder edits a JSON document, the same one the API reads and writes:

```json
{
  "theme": { "background": "#FFFFFF", "text": "#0A0A0A", "accent": "#0A0A0A", "button_text": "#FFFFFF", "corner_radius": 0 },
  "steps": [
    { "id": "goal", "type": "question", "title": "What do you want to get done?", "attribute": "goal",
      "options": [
        { "id": "focus", "label": "Focus on deep work" },
        { "id": "habits", "label": "Build better habits" },
        { "id": "sleep", "label": "Sleep better", "next": "sleep_tip" }
      ] },
    { "id": "plan", "type": "info", "title": "Your plan is ready", "body": "People with the same goal kept going 3 times longer with a daily plan." },
    { "id": "sleep_tip", "type": "info", "title": "Better sleep starts tonight", "body": "Most people fall asleep 15 minutes sooner in the first week." },
    { "id": "email", "type": "email", "title": "Where should we send your plan?", "placeholder": "you@example.com", "required": true },
    { "id": "paywall", "type": "paywall", "title": "Unlock your full plan", "offering": "web", "highlight_package": "$rc_annual",
      "features": ["Your personal daily plan", "Reminders that adapt to you"], "allow_codes": true, "button_label": "Continue" },
    { "id": "success", "type": "success", "title": "You are in", "body": "Open the app to start your plan.", "show_redemption": true }
  ]
}
```

**Rules checked on every save:**
- 1 to 30 steps. Step ids are unique, 1 to 40 lower-case letters, digits, `-` or `_`.
- Titles up to 120 characters. Subtitles and bodies up to 600. Button labels up to 40.
- Questions have 1 to 8 options with unique ids and labels up to 80 characters.
- Every `next` names a step that exists.
- Colours are `#RRGGBB`. `corner_radius` is 0 to 24. `image_url` is https.
- An `attribute` uses letters, digits and `_ . - $`.

**Rules checked before publishing:** exactly one paywall step and exactly one success step, the paywall before the success step, and the success step last. The funnel's `problems` list says what is missing, and **Publish** stays off until it is empty.

## Paths
An answer can jump to another step: set the option's `next` to that step's id. Without `next`, the visitor goes to the next step in the list. In the example above, "Sleep better" skips to `sleep_tip`; the other answers go to `plan`. Paths work on single-choice questions. The back button returns along the path the visitor took.

## Answers become customer attributes
Give a question an `attribute`, such as `goal`. When the visitor pays, the answer is saved on the customer under that name. Several answers are joined with ", ". Attributes reach the app's user when the purchase is [redeemed](redemption-links.md), and they appear in webhooks' `subscriber_attributes` and in the dashboard. Use them to personalize the app after sign-up.

## Publish
Click **Publish**, or call the API. A funnel needs a connected Stripe app to publish.

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/funnels/fnl_7q2k9m4x1z8c/actions/publish" -H "Authorization: Bearer $SECRET_KEY"
```

The public URL is `<pay base>/<project slug>/<funnel slug>`, or `https://<your domain>/<funnel slug>` with a [custom domain](custom-domains.md). A funnel's slug is unique among the project's funnels and [purchase links](purchase-links.md). The page takes the same query parameters as a purchase link: `?app_user_id=`, `?email=` and `?code=`. `utm_*` parameters are kept with the funnel's events. **Unpublish** takes the page down (404) and keeps the draft.

## Events
The page records what each visitor does, once per page session:

| Event | When |
|---|---|
| `funnel_viewed` | The visitor opens the funnel |
| `step_viewed` | A step appears |
| `step_completed` | The visitor finishes a step. A question carries the answer; a paywall the package; an email step only `provided`, never the address |
| `checkout_started` | The paywall starts a Stripe Checkout (recorded by the server) |
| `purchase` | The checkout is paid (recorded by the server) |

### Webhooks and analytics tools
Three of them can also go to your [webhooks](webhooks.md) and [integrations](integrations.md) as RevenueDot event types:

| Event type | Filter value | Analytics event name |
|---|---|---|
| `FUNNEL_VIEWED` | `funnel_viewed` | `rd_funnel_viewed` |
| `FUNNEL_STEP_COMPLETED` | `funnel_step_completed` | `rd_funnel_step_completed` |
| `FUNNEL_PURCHASE` | `funnel_purchase` | `rd_funnel_purchase` |

They are **opt-in**: only webhooks and integrations whose event filter names them receive them, so handlers that know only RevenueCat's event types never see them. Segment, Amplitude, Mixpanel and PostHog send them with the names above.

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/integrations/webhooks" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Funnels","url":"https://api.example.com/webhooks/funnels","event_types":["funnel_viewed","funnel_step_completed","funnel_purchase","initial_purchase"]}'
```

Each event carries `funnel_id`, `funnel_name`, `funnel_slug`, `session_id`, `step_id`, `step_type`, `step_index`, `answer`, the page's `utm_*` parameters, `store: STRIPE` and the environment. `FUNNEL_PURCHASE` adds `product_id` and the buyer's `app_user_id`. Visitors who have not paid have no app user id, so `app_user_id` is null on the first two types unless the page URL had `?app_user_id=`. Use `session_id` to join one visit's events. Full fields: [Webhook events](../../api/webhook-events.md#funnel_step_completed).

## Analytics
The **Analytics** tab, or the API, shows the last 7, 30 or more days:

```bash
curl -s "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/funnels/fnl_7q2k9m4x1z8c/analytics?days=7" -H "Authorization: Bearer $SECRET_KEY"
```
```json
{"object":"funnel_analytics","funnel_id":"fnl_7q2k9m4x1z8c","days":7,"views":2,"checkouts":1,"purchases":1,"conversion":0.5,"revenue_usd":59.99,
 "steps":[{"id":"goal","type":"question","title":"What do you want to get done?","viewed":2,"completed":1,"drop_off":0.5},"…"],
 "daily":[{"date":"2026-09-30","views":2,"purchases":1},"…"]}
```

| Field | Meaning |
|---|---|
| `views` | Page sessions that opened the funnel |
| `steps[].viewed`, `steps[].completed` | Sessions that saw the step and finished it. For the success step, `completed` is purchases |
| `steps[].drop_off` | 1 minus completed divided by viewed, from 0 to 1 |
| `checkouts` | Sessions that started a Stripe Checkout |
| `purchases` | Paid checkouts |
| `conversion` | Purchases divided by views |
| `revenue_usd` | What the purchases paid, in US dollars |
| `daily` | Views and purchases per UTC day |

`days` is 1 to 365 (default 30). The funnel list shows `views_30d` and `purchases_30d`.

## Build with AI
Click **Build with AI** and describe the funnel: who it is for, the questions to ask and the offer. RevenueDot asks a language model for the funnel JSON, repairs what it can (ids, a missing paywall or success step, paths to steps that do not exist), checks it, and opens the result as a new funnel for you to edit. Nothing is published until you publish it.

It uses the same model and the same limits as [Generate with AI on paywalls](paywalls.md#ai-on-a-self-hosted-server), shared between the two: one generation every 5 seconds and 60 a day per project, 100 a day per person, and 5,000 a day per server. On RevenueDot Cloud it works without setup. On a self-hosted server it needs `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`; without one the button is hidden and the API answers 503.

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/funnels/generate" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"prompt":"A sleep app quiz for people who wake up at night","app_name":"Drift"}'
```

The answer is `{ "object": "funnel_generation", "draft": {…}, "fixes": ["added a success step"], "provider", "model" }`. Create a funnel from it with `POST /funnels` and `"draft"`.

## Use the API
```bash
# Create from the starter, then change the draft and publish.
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/funnels" -H "Authorization: Bearer $SECRET_KEY" \
  -H "Content-Type: application/json" -d '{"name":"Focus quiz"}'
curl -s -X PATCH "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/funnels/fnl_7q2k9m4x1z8c" -H "Authorization: Bearer $SECRET_KEY" \
  -H "Content-Type: application/json" -d @funnel-draft.json   # {"draft": {"theme": {…}, "steps": […]}}
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/funnels/fnl_7q2k9m4x1z8c/actions/publish" -H "Authorization: Bearer $SECRET_KEY"
```

`POST /funnels` takes `name`, and optionally `slug`, `app_id`, `template` (`starter` or `blank`) or a full `draft`. A draft that breaks a rule answers 400 and names the field, such as `draft.theme.accent`. Every operation: [Extensions: Funnels](../../api/extensions.md#funnels).

## Not built yet
- A/B tests of funnel steps, a template gallery, and image upload (use an https image URL).
- Funnel events go to webhooks and to Segment, Amplitude, Mixpanel and PostHog. Ad networks (Meta, AppsFlyer, Adjust) do not get them yet.

## Related
- [Sell on the web with Stripe](web-billing.md)
- [Purchase links](purchase-links.md): one page with the plans, no steps
- [Redemption links](redemption-links.md)
- [Web discounts](web-discounts.md)

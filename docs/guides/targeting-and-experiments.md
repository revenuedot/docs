---
title: Targeting and experiments
description: Show different offerings to different customers with audiences and targeting rules on the Targeting page (Live, Scheduled, Inactive), set the default offering, use placements, and test offerings against each other with experiments.
---

# Targeting and experiments

Your app asks for the current offering, and with placements for the offering of one spot in the app. RevenueDot decides which offering that is for each customer, so you can change what each audience sees without an app release:

- **Targeting rules** give an audience its own offering, now or between two dates.
- **Experiments** split customers between two to four offerings and measure which earns more. They have their own guide: [Experiments](experiments.md).
- **The default offering** is what everyone else sees.

## Audiences

An audience is a set of conditions on customers. Conditions in a group must all be true; separate groups are alternatives. Fields include country, platform, app version, SDK version, locale, subscription status (`active`, `trialing`, `expired`, `never`), active entitlements, total spent, first and last seen dates, latest product, email, attribution (campaign, media source) and any custom attribute (`customAttribute:<key>`).

Create one under **Targeting > Audiences**. **Preview** shows how many of your customers match today. Targeting rules and experiments can use a saved audience; an experiment can also have conditions of its own.

## The Targeting page

**Targeting** has four tabs:

- **Live** lists the rules that are on, whose start date has passed or is empty, and whose end date is ahead or empty.
- **Scheduled** lists the rules that are on with a start date ahead. They move to Live when it comes.
- **Inactive** lists the rules that are turned off, and the rules past their end date.
- **Audiences** lists the saved audiences.

Each rule is a card that reads as sentences: "If customer matches **Gold plan** then show `promo` for `onboarding_end`", one line per placement, and "`default` for all other cases" (or "for every placement" when it has no placements). "Any audience" means everyone. The card also shows the rule's name, its position, its schedule and a status tag: Live, Scheduled, Ended or Off.

The **…** menu on a card has:

- **Edit** opens the rule dialog.
- **Turn on** and **Turn off** move the rule between the tabs.
- **Move up** and **Move down** change its position. You can also drag the card's handle, or press the up and down arrow keys on it. Moving rules in one tab keeps the other tabs' rules in their places.
- **Duplicate** makes a copy that is turned off, in Inactive.
- **Delete** removes the rule. Customers it matched get the next matching rule, or the default offering.

### The default offering

Below the live rules, **Select default offering** shows the offering customers get when no rule matches them and they are in no experiment. Picking another one asks for confirmation and makes it the project's current offering, the same setting as in Product catalog.

### Create a rule

**New rule** has two choices:

1. **Create from scratch** opens the rule dialog:
   - **Name**.
   - **Audience**: a saved audience, or **Any audience** for everyone.
   - **Current offering**: what `Offerings.current` returns for them, and what every placement not listed shows.
   - **Placements** (optional): a placement id, such as `onboarding_end`, and its offering or **No paywall**. Placement ids are letters, digits, dots, dashes or underscores.
   - **Starts** and **Ends** (optional): an empty start means as soon as the rule is on; an empty end means until you turn it off. The end must be after the start.
2. **Create with RevenueDot AI** asks who should see which offering ("Show the promo offering to customers in Germany") and opens a new [RevenueDot AI](revenuedot-ai.md) conversation. The assistant prepares the `create-targeting-rule` call with the name, offering, saved audience, placements and dates. After you approve it, the rule is created **turned off**, in Inactive. Turn it on when it looks right.

New rules go to the end of the order and start off.

## How rules decide

Rules are checked from the top. The first live rule whose audience matches decides the customer's current offering and placement offerings. Before rules, two things win:

1. **An offering override** for one customer, set through the API (`assign_offering`), wins over everything.
2. **An experiment** the customer is in, or one that enrolls them on this request, wins over targeting. A variant's placements are laid over the matching rule's placements. See [How customers join](experiments.md#how-customers-join).

Customers no rule matches get the default offering. When a rule matched, the SDK's offerings response carries `targeting: { revision, rule_id }`.

In the app, read the result the usual way:

```swift
let offerings = try await Purchases.shared.offerings()
let paywallOffering = offerings.current                                   // targeted current offering
let onboarding = offerings.currentOffering(forPlacement: "onboarding_end") // placement offering
```

## Experiments

An experiment compares a control offering with one to three treatments. Each customer who joins keeps the same variant and gets its offering and placements. The results show 18 metrics per variant, such as conversion to paying and realized LTV per customer, with 95% intervals, the lift over the control and the chance to beat it.

Everything about experiments is on its own page: [How do I test offerings, prices, trials and paywalls with experiments?](experiments.md)

## API

- **Audiences:** `/v2/projects/{project_id}/audiences`, with `actions/preview` and `filter_options`.
- **Rules:** `/v2/projects/{project_id}/targeting_rules`, with `actions/reorder` for the order and `starts_at`, `ends_at` and `state` on each rule.
- **The default offering:** `POST /v2/projects/{project_id}/offerings/{offering_id}` with `{ "is_current": true }`.
- **Experiments:** `/v2/projects/{project_id}/experiments`. See [Experiments](experiments.md#api).

See the [API reference](../../api/rest-v2.md#targeting).

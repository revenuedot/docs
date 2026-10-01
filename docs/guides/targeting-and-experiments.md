---
title: Targeting and experiments
description: Show different offerings to different customers with audiences and targeting rules, use placements, and A/B test two offerings with results.
---

# Targeting and experiments

Your app asks for the current offering (and, with placements, the offering for a spot in the app). RevenueDot decides which offering that is per customer, so you can change what each audience sees without an app release.

## Audiences

An audience is a set of conditions on customers. Conditions in a group must all be true; separate groups are alternatives. Fields include country, platform, app version, SDK version, locale, subscription status (`active`, `trialing`, `expired`, `never`), active entitlements, total spent, first and last seen dates, latest product, email, attribution (campaign, media source) and any custom attribute (`customAttribute:<key>`).

Create one under **Targeting > Audiences**. **Preview** shows how many of your customers match today.

## Targeting rules

A rule says: for this audience (or everyone), the current offering is X, and placement P shows offering Y.

1. Open **Targeting > Rules** and select **New rule**.
2. Pick the audience, the current offering and, optionally, placements.
3. Turn the rule on from its menu. New rules start off.

Rules are checked from the top; the first live rule that matches decides. Use **Move up** and **Move down** to order them. A rule can also have start and end times through the API. An offering assigned to one customer through the API (`assign_offering`) always wins over targeting.

In the app, read the result the usual way:

```swift
let offerings = try await Purchases.shared.offerings()
let paywallOffering = offerings.current                                   // targeted current offering
let onboarding = offerings.currentOffering(forPlacement: "onboarding_end") // placement offering
```

## Experiments

An experiment compares two offerings, a control (a) and a treatment (b).

1. Open **Experiments** and select **New experiment**. Pick both offerings, an optional audience, and the share of customers to enroll.
2. Select **Start**. Customers who match are enrolled the next time the app fetches offerings and always keep the same variant. Their current offering is their variant's offering.
3. Read **Results**: customers per variant, conversions (any purchase or trial after enrolling), trials, revenue, revenue per customer, and the chance the treatment converts better. Wait for at least 100 customers in each variant.
4. **Pause** keeps enrolled customers on their variant and enrolls nobody new. **Stop** ends it for good.

Enrolling sends an `EXPERIMENT_ENROLLMENT` webhook, and enrolled customers' purchase, renewal and cancellation webhooks carry an `experiments` list.

## API

Audiences: `/v2/projects/{project_id}/audiences`. Rules: `/v2/projects/{project_id}/targeting_rules`. Experiments: `/v2/projects/{project_id}/experiments` and `.../results`. See the [API reference](../../api/rest-v2.md).

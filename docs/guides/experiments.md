---
title: How do I test offerings, prices, trials and paywalls with experiments?
description: An experiment shows each customer one of two to four offerings and reports which earns more, with 95% intervals and the chance to beat the control. Set up variants, enrollment, audience and priority, then read 18 metrics or export them as CSV.
---

# How do I test offerings, prices, trials and paywalls with experiments?

**An experiment gives each customer one of two to four offerings and tells you which one earns more.** You pick what to test, make the treatment offering from the one you sell today, and start it. Each customer who joins keeps the same variant, and the SDK returns that variant's offering as `Offerings.current`, so your app code does not change. The results compare conversion, revenue and retention per variant, each with a 95% interval, the lift over the control and the chance to beat it.

Targeting rules decide what everyone else sees. They are on the [Targeting and experiments](targeting-and-experiments.md) page.

## Start an experiment

1. Open **Experiments** and select **New experiment**.
2. Pick a starter type, **Create from scratch**, or **Create with RevenueDot AI** (see [below](#create-an-experiment-with-revenuedot-ai)). An empty Experiments page shows the six starter types as cards.
3. Fill in the form: details, variants, enrollment and audience. The form is a full page at `/experiments/new`; a draft opens it again at `/experiments/<id>/edit`.
4. Select **Start experiment**, or **Save as draft** to start it later. Customers join from their next offerings request.

## The six starter types

Each type fills in the metrics below and says what to change in the treatment offering. If you change the type before you touch the metrics, the metrics follow the new type.

| Type | What the treatment changes | Primary metric | Secondary metrics |
|---|---|---|---|
| Introductory offer | Each package's product becomes one with an introductory price, set up in the store | Conversion to paying | Initial conversion rate, Realized LTV per customer, Churned subscribers |
| Free trial offer | Each package's product becomes one with a longer, shorter or no free trial | Conversion to paying | Initial conversion rate, Trial conversion rate, Realized LTV per customer |
| Paywall design | The packages stay; a copy of the control's paywall is made for you to change | Initial conversion rate | Conversion to paying, Realized LTV per customer |
| Price point | Each package's product becomes one with another price | Realized LTV per customer | Conversion to paying, Initial conversion rate, Refund rate |
| Subscription duration | A package's product becomes one with another period, such as annual for monthly | Realized LTV per customer | Conversion to paying, MRR per customer, Churned subscribers |
| Subscription ordering | The packages appear in another order; the first one is the plan the paywall selects | Initial conversion rate | Conversion to paying, Realized LTV per customer |
| Other (from scratch) | Anything about the offerings or placements | Initial conversion rate | Conversion to paying, Realized LTV per customer |

## Fill in the form

### Details

- **Name** is 1 to 256 characters.
- **Experiment type** is one of the seven above.
- **Primary metric** decides the winner. It must be a rate or a per-customer mean, because only those have an interval: Initial conversion rate, Trial conversion rate, Conversion to paying, Refund rate, Realized LTV per customer, Realized LTV per paying customer, MRR per customer or MRR per paying customer.
- **Secondary metrics** are up to 12 more metrics that the results show first.
- **Notes** hold the hypothesis in Markdown, up to 20,000 characters. The **Preview** tab renders it, and so does the experiment's page.

### Variants

- **The control (A)** is the offering customers see today. The form starts with the project's current offering.
- **Treatments (B, C and D)** are the offerings to test. **Add variant** adds one, up to three treatments. Customers are split evenly between all variants.
- **Each variant has a name** (Control, Treatment B ... by default) and an offering, which is what `Offerings.current` returns to its customers.
- **Placements** give each variant an offering per spot in your app, such as `onboarding_end`, or **No paywall** there. **Add placement** adds a row to every variant, starting at that variant's own offering.
- **Import from targeting** copies a targeting rule: its offering becomes the control's offering (and the offering of any treatment that has none yet), and its placements fill every variant. Then change the treatments.
- **Two variants cannot be the same.** Variants with the same offering and the same placement offerings are refused.

### Duplicate the control offering

A treatment usually needs a new offering. Pick **Duplicate default…** (with your control offering's identifier) in a treatment's offering list, or select **Create offering** on an empty treatment. The dialog makes a copy of the control offering:

- **Name and identifier** are filled in, such as `default_price` for a price test, and can be changed.
- **Packages** stay in the control's order. Drag them, or use the arrow keys on the handle, to reorder them for an ordering test.
- **Each package's product** can be swapped for another active product of the same app: one with another price, period, trial or introductory offer. (The dashboard offers only those; the API takes any product of the project and checks only that two products of one app do not overlap.)
- **Copy the paywall** attaches a copy of the control's paywall to the new offering, ready to edit in Paywalls. It is checked for Paywall design tests.

The copy keeps the control's metadata and is never the current offering. The API call is `POST /v2/projects/{project_id}/offerings/{offering_id}/actions/duplicate` ([Duplicate an offering](../../api/rest-v2.md#duplicate-an-offering)).

### Enrollment

- **New customers** joins only customers first seen at or after the experiment's first start: the customer's first request with that app user id (customer info or offerings) made them. A customer who installed the app earlier never joins, even if they have not seen a paywall yet. So does a customer whose first record came from somewhere else: a receipt posted for a restore on a new install counts from its earliest purchase, and customers imported from RevenueCat keep RevenueCat's first-seen date. Pausing and resuming keeps the first start, so customers who arrived during the pause can still join after it.
- **New and existing customers** joins anyone who asks for offerings while the experiment runs, subscribers included. Experiments you make with it need paywall view tracking, which the dashboard and the API turn on for them.
- **Track paywall views for better analysis** counts a paywall view when the SDK reports one (`paywall_impression` from RevenueDot paywalls, or `custom_paywall_impression` when your own paywall calls `trackCustomPaywallImpression()`). The results then show, by default, only customers who saw a paywall after joining. A/B experiments converted from the first release keep tracking off, so their results count every customer. The stock Android SDK sends paywall events to RevenueCat instead of your server; the [RevenueDot Android fork](../sdks/android.md) sends them to RevenueDot.

### Audience and estimate

- **Everyone**, a **Saved audience** (made under Targeting > Audiences), or **Custom filters** written for this experiment only, with the same conditions as audiences.
- **Audience percentage** is the share of matching customers who join, from 1 to 100. The others see what they would see without the experiment.
- **The estimate** updates as you type. **Matching customers (last 7 days)** counts customers first seen in the last 7 days (new customers) or seen in them (new and existing) who match the audience. **Customers per variant (last 7 days)** is that number times the percentage, divided by the number of variants. Above 5,000 customers the audience share of the 5,000 most recent is scaled up, and the number shows as approximate (≈).

New experiments start at the bottom of the enrollment order. Drag the Experiments list to move one up.

## How customers join

Every time the app asks for offerings (`GET /v1/subscribers/{app_user_id}/offerings`), RevenueDot picks the customer's current offering in this order. A new app user id makes the customer on this request, because the SDK asks for customer info and offerings at the same time on a first launch: the first paywall already shows the variant. `GET /v1/offerings` without an app user id enrolls nobody.

1. **An offering override** set for this one customer (`assign_offering`) wins over everything.
2. **The experiment the customer already joined**, if it is running or paused, gives them the same variant every time.
3. **A running experiment that admits them now.** Experiments are checked by priority, 1 first. The first one whose enrollment mode, audience and share admit the customer enrolls them, and the rest are skipped. A customer the share leaves out can still join the next experiment in the order.
4. **The first live targeting rule** that matches.
5. **The project's current offering** (the default offering on the Targeting page).

A customer is in at most one experiment that has not stopped. Audiences are evaluated with the request's headers (platform, app version, SDK version, storefront, locale), like targeting rules.

**The variant follows the person.** When an anonymous customer logs in with a new app user id, that id becomes an alias of the same customer, who keeps their variant. When they log in to an app user id that already exists, the anonymous customer is merged in and their enrollments move with them; in an experiment both were in, the existing customer's variant stays.

**The split is deterministic.** The share check is the first two bytes of SHA-256(`<experiment id>:enroll:<customer id>`) modulo 100, below the percentage. The variant comes from the first two bytes of SHA-256(`<experiment id>:variant:<customer id>`): with 2 or 4 variants, 0 to 99 is cut into equal ranges; with 3 variants, the number modulo 3. The same customer gets the same answer on every server, and nothing is stored until they join. Raising the percentage later lets more customers in; lowering it removes nobody who already joined.

**Priority** is the order of the **Enrollment order** list on the Experiments page. Drag a row, use the arrow keys on its handle, or use **Move up** and **Move down** in its menu. Stopped experiments are listed below in their own table.

## Pause, resume, stop and edit

- **Pause** stops new enrollments. Enrolled customers keep their variant, and the results keep counting what they do.
- **Resume** (Start on a paused experiment) lets new customers join again. New-customer experiments still count from the first start.
- **Stop** ends the experiment for good. On their next request its customers get what targeting gives them, or join another running experiment that admits them. The results stay and keep updating as renewals and refunds arrive. A stopped experiment never enrolls anyone again: use **Duplicate as a draft** in its menu.
- **Delete** is refused while the experiment runs. It deletes the enrollments and the results; its customers are then free to join another running experiment, as after a stop.
- **Editing after the start** is limited to the name, type, metrics, notes and audience percentage. Variants, enrollment, paywall tracking and the audience stay fixed, so the results compare like with like. Changing the type never changes the metrics of a started experiment; in the API it never changes them at all (on create, the type's defaults fill only the metrics you leave out).
- **Viewers** see experiments and results with no control that changes them, and the API refuses their changes (403). Custom roles need the `project_configuration:offerings:read_write` permission to change experiments.
- **An offering that a draft, running or paused experiment uses cannot be deleted or archived.** The API answers 409 and names the experiment. Archived offerings cannot be picked for a variant or a placement, because the SDK's offerings list leaves them out. A stopped experiment keeps its results and shows a deleted offering's id.

## What the SDK receives

The SDK needs no change. For a customer in a variant:

- `current_offering_id` is the variant's offering, so `offerings.current` is the variant's offering.
- `placements.offering_ids_by_placement` holds the matching targeting rule's placements with the variant's placements on top, so `currentOffering(forPlacement:)` returns the variant's offering for each placement it sets.

```swift
let offerings = try await Purchases.shared.offerings()
let paywall = offerings.current                                          // the variant's offering
let onboarding = offerings.currentOffering(forPlacement: "onboarding_end") // the variant's placement offering
```

The customer's page in the dashboard, the customer summary (`current_offering.source` is `experiment`, with `variant` and `variant_name`) and the v2 customer object (`experiment: { object: "experiment_enrollment", id, name, variant }`) show which experiment and variant they are in.

## Webhooks

- **`EXPERIMENT_ENROLLMENT`** is sent once per customer and experiment, when the customer joins. It carries `experiment_id`, `experiment_variant` (`a` to `d`), `offering_id` (the variant offering's identifier), `experiment_enrolled_at_ms` and the `app_user_id` that asked for offerings. It is recorded as a production event with no app, so a webhook set to sandbox only, or to one app, does not get it.
- **`experiments`** is on the lifecycle events (purchases, renewals, cancellations, expirations and the rest, but not `TRANSFER` or the price-increase consent events) and on `SUBSCRIBER_ALIAS` for customers who joined an experiment: `[{ "experiment_id", "experiment_variant", "enrolled_at_ms" }]`, one entry per experiment, stopped ones included.

See [Webhook events](../../api/webhook-events.md#experiment_enrollment).

## Read the results

The experiment's page shows the setup, the notes and the results. Results appear once the experiment has started.

### Who and what counts

- **Customers** are the customers enrolled in the experiment. Production results leave out customers who joined from a test device: a Test Store app, or an iOS sandbox or TestFlight build (the SDK's `X-Is-Sandbox` header). Android test devices cannot be told apart when they join, so they count as production customers without production purchases.
- **Purchases count when they are made after the customer joined**, together with everything that follows from them: renewals, refunds, trial conversions and product changes. Subscriptions are built with the same rules as [Charts](charts.md). A subscription that started before the customer joined does not count, and neither do its renewals. A minute of grace covers store clocks that run a little ahead.
- **Money** is USD at the purchase date's exchange rate. Refunds are negative.
- **Production or sandbox:** results show production purchases by default. **Environment: Sandbox** shows every enrolled customer, test devices included, with their sandbox (test) purchases and paywall views instead. The choice stays in the page's address (`?environment=sandbox`).
- **Large experiments:** above 25,000 enrolled customers the results come from a fixed random sample of 25,000, the same customers on every load. Rates, per-customer means, intervals and chances are estimated from the sample; counts and totals are the sample's. The guidance banner and each variant's card say so, and the API's `sample` field gives the sample size and the enrolled customers per variant.
- **Filters:** **Platform** and **Country** come from the customer's last request. **Paywall** shows customers who viewed a paywall after joining, who did not, or all of them. It defaults to viewers when the experiment tracks paywall views, and to everyone otherwise. With viewers only, each customer counts from their first paywall view: a purchase they made after joining but before that view does not count.

### The metrics

| Metric | Kind | Definition |
|---|---|---|
| Initial conversions | count | Customers who started a trial or a subscription, or bought anything, after joining |
| Initial conversion rate | rate | Initial conversions ÷ customers |
| Trials started | count | Free trials started after joining |
| Trials completed | count | Trials that ended or turned into a paid subscription |
| Trials converted | count | Trials followed by a paid period, also through a product change |
| Trial conversion rate | rate | Trials converted ÷ trials completed |
| Paid customers | count | Customers with at least one payment above zero (trials excluded) |
| Conversion to paying | rate | Paid customers ÷ customers |
| Active subscribers | count | Customers with a paid subscription active now |
| Churned subscribers | count, lower is better | Customers who had a paid subscription and have none active now |
| Refunded customers | count, lower is better | Customers with at least one refund |
| Refund rate | rate, lower is better | Refunded customers ÷ paid customers |
| Realized LTV | total | Revenue so far, net of refunds |
| Realized LTV per customer | mean | Revenue so far ÷ customers |
| Realized LTV per paying customer | mean | Revenue so far ÷ paid customers |
| MRR | total | Monthly value of the paid subscriptions active now |
| MRR per customer | mean | MRR ÷ customers |
| MRR per paying customer | mean | MRR ÷ paid customers |

The page shows:

- **A guidance banner** that says whether there is enough data, which treatment leads, and how many customers a 20% lift needs.
- **A card per variant** with its customers, paywall viewers (when tracked) and offering.
- **A metric table** with the primary metric first, then the secondary metrics, and the rest under **All metrics**. Each cell has the value, its 95% interval, "k of n" for rates, the lift over the control with its interval, and the chance to beat the control.
- **Over time**, a chart of any metric with one line per variant: the value as of the end of each UTC day, counted from the start. **Daily values** lists the same numbers in a table.

### The statistics

All intervals are 95%, two-sided. The code is `packages/core/src/experiments/stats.ts` in the [server repository](https://github.com/revenuedot/revenuedot).

- **Rates** get a Wilson score interval per variant.
- **The chance to beat the control on a rate** gives each variant a Beta(k + 1, n − k + 1) posterior (a uniform prior) and computes P(variant > control) exactly with [Evan Miller's closed form](https://www.evanmiller.org/bayesian-ab-testing.html#binary_ab_equivalent): a sum over one variant's successes, in log-gamma, or over its failures when the rates are near 100%. Only when both variants have more than 20,000 successes and more than 20,000 failures does a normal approximation of the two Beta distributions answer instead. For refund rate, where lower wins, the direction flips. The page never shows 0% or 100%: it shows "<1%" and ">99%".
- **Per-customer means** (realized LTV and MRR per customer or per paying customer) get mean ± 1.96 × se, where se = s ÷ √n and s is the sample standard deviation. The lower bound stays at 0 unless the mean is negative. The chance to beat the control is Φ((m_v − m_c) ÷ √(se_v² + se_c²)), where m is a variant's mean and Φ the standard normal distribution. With one customer there is no spread to measure, so the interval and the chance stay empty until a variant has two.
- **Lift** is the variant's value ÷ the control's value − 1. Its interval uses the delta method on log(variant ÷ control): exp(log ratio ± 1.96 × √(se²_variant ÷ variant² + se²_control ÷ control²)) − 1, so it is asymmetric and never below −100%. For rates this is Katz's interval, with se² ÷ p² = 1/k − 1/n; when a variant converts nobody or everybody, half a success and half a failure are added to both sides first (Haldane), so 0 of 100 against 20 of 100 shows −100% with an interval. Lift is empty when the control's value is 0.
- **Counts and totals** have no interval.
- **Enough data** means every variant has at least 100 customers and at least 10 events of the primary metric: conversions for initial conversion rate, payers for conversion to paying, completed trials for trial conversion rate, paid customers for refund rate and for the per-customer means. It is a floor, not a verdict. Many teams wait until a treatment has a 95% chance to beat the control.
- **Customers needed per variant** is the sample to detect a 20% relative lift at 95% confidence and 80% power, from the control's current value. For rates it is (1.96 + 0.84)² × (p₁(1 − p₁) + p₂(1 − p₂)) ÷ (p₂ − p₁)², with p₂ = 1.2 × p₁; a rate measured on trials or payers is scaled up to customers. For means it is 2 × (1.96 + 0.84)² × σ² ÷ δ², with σ the control's standard deviation and δ = 0.2 × its mean.

Example, with Initial conversion rate as the primary metric: the control converts 98 of 1,204 customers (8.1%, 95% interval 6.7% to 9.8%) and Treatment B 117 of 1,188 (9.8%, 8.3% to 11.7%). B's lift is +21.0% (−6.3% to +56.3%), and its chance to beat the control is 93%. Both variants pass the enough-data floor, but no winner is clear yet. Detecting a 20% lift on an 8.1% rate takes about 4,825 customers per variant.

### Export CSV

**Export CSV** on the results downloads the numbers with the filters you picked:

- **Summary per variant** has one row per variant and metric: `variant_id`, `variant_name`, `offering_id`, `customers`, `metric`, `metric_name`, `value`, `numerator`, `denominator`, `lower_95`, `upper_95`, `lift`, `lift_lower_95`, `lift_upper_95`, `chance_to_beat_control`.
- **Every metric by day** has one row per day and variant: `date` (UTC), `variant_id`, `variant_name`, then one column per metric id.

Files are named `experiment-<id>-<summary|daily>-<environment>-<date>.csv`. Empty cells are values that do not apply, such as the control's lift. Text that a spreadsheet would run as a formula starts with an apostrophe.

## Create an experiment with RevenueDot AI

1. Select **New experiment > Create with RevenueDot AI**, or the button on the empty Experiments page.
2. Say what to test, or pick an example such as "Test a 14-day free trial against our 7-day trial". A new [RevenueDot AI](revenuedot-ai.md) conversation opens with your request.
3. The assistant reads your offerings (and audiences when you name one), uses the current offering as the control unless you name another, and prepares the `create-experiment` call.
4. Approve the card. The experiment is always saved as a **draft**, and the answer links to it. Review it and start it yourself.

The assistant never invents an offering. If no offering differs from the control yet, it tells you which one to duplicate and change on the Experiments page. It sets the name, type, control and 1 to 3 treatment offerings, metrics, notes (up to 5,000 characters), enrollment, a saved audience and the percentage; edit the draft for placements or custom filters. The button is off when RevenueDot AI is not set up, or cannot make changes for you in this project.

RevenueDot AI can also list experiments, read their results, start, pause and stop them (stopping asks for approval like every change), and list saved audiences.

## Experiments made before multi-variant experiments

Upgrading a server to this release (database migration 0029) converts every existing A/B experiment:

- **Offering A becomes variant `a` (Control)** and **offering B becomes variant `b` (Treatment B)**.
- **Every enrollment is kept**, so no customer changes variant.
- **Enrollment becomes new and existing customers**, which is what these experiments did.
- **Priority follows the start time** in each project, earliest first, which was the old enrollment order. Experiments that never started come last.
- **Paywall tracking stays off**, so their results count every enrolled customer, as before.
- **Projects moved in from an older server** (an export archive from before this release) are converted the same way when they are imported.

The API keeps the older fields: create and update still take `offering_a` and `offering_b`, and the results still carry `conversions`, `conversion_rate`, `trials`, `paying_customers`, `revenue`, `revenue_per_customer`, `chance_b_beats_a` and `enough_data`. Those numbers now come from the new metrics (initial conversions, trials started, paid customers and realized LTV), and `chance_b_beats_a` uses the exact Beta method, so they can differ slightly from what the first release showed. `enough_data` now also needs 10 events of the primary metric per variant, not only 100 customers. Deleting an offering no longer deletes the experiments that use it: the delete is refused while a draft, running or paused experiment uses the offering.

## How this compares with RevenueCat

RevenueCat's Experiments work the same way in most respects, according to its docs on [configuring experiments](https://www.revenuecat.com/docs/tools/experiments-v1/configuring-experiments-v1) and [reading results](https://www.revenuecat.com/docs/tools/experiments-v1/experiments-results-v1): a control and up to three treatments, the same six starter types, new or new and existing customers, saved or custom audiences, a priority order between experiments, pause and stop with the same meaning, and the same fields locked after the start (RevenueDot also lets you change the type). The differences:

- **Enrollment share:** RevenueCat's lowest audience percentage is 10%. RevenueDot takes 1% to 100%.
- **Sandbox:** RevenueCat's results count production purchases and paywall views only. RevenueDot shows production by default and sandbox on request.
- **After a stop:** RevenueCat keeps updating results for 400 days. RevenueDot computes results whenever you open them, with no end date; the daily series shows the latest 400 days.
- **Method:** RevenueCat describes a Bayesian chance to win with credible intervals. RevenueDot's method is above, and its code is open source.

## API

Every step above is in the [REST API v2 reference](../../api/rest-v2.md#experiments) under **Experiments**, with the `project_configuration:offerings` permissions (the estimate also needs `audiences:audiences:read`, because audience conditions can name one customer):

- `GET` and `POST /v2/projects/{project_id}/experiments`: list and create.
- `GET`, `POST` and `DELETE /v2/projects/{project_id}/experiments/{experiment_id}`: get, update and delete.
- `POST .../experiments/{experiment_id}/actions/start`, `/pause` and `/stop`.
- `POST .../experiments/actions/reorder` with `{ "experiment_ids": [...] }`: [set the enrollment order](../../api/rest-v2.md#set-the-enrollment-order).
- `POST .../experiments/actions/estimate`: [the 7-day estimate](../../api/rest-v2.md#estimate-how-many-customers-would-join).
- `GET .../experiments/{experiment_id}/results` with `environment`, `platform`, `country` and `paywall`: [results](../../api/rest-v2.md#results-per-variant).
- `GET .../experiments/{experiment_id}/results/export?kind=summary|daily`: [CSV](../../api/rest-v2.md#export-results-as-csv).
- `POST /v2/projects/{project_id}/offerings/{offering_id}/actions/duplicate`: [duplicate an offering](../../api/rest-v2.md#duplicate-an-offering).

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/experiments" -H "Authorization: Bearer $SECRET_KEY" \
  -H "Content-Type: application/json" -d '{
    "name": "Price point test", "type": "price_point", "enrollment": "new", "enrollment_percent": 50,
    "variants": [{ "offering_id": "ofrngm2u3h89blc" }, { "name": "Higher price", "offering_id": "ofrng9x8y7z6w5a" }]
  }'
```

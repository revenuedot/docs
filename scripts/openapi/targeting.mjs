// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: audiences (RevenueCat-compatible), targeting rules and offering experiments (RevenueDot extensions) in the OpenAPI document.
// Experiments: routes/v2/experiments.ts, metrics and statistics in packages/core/src/experiments.
// Docs: https://revenuedot.app/docs/guides/targeting-and-experiments   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { SECRET, arr, body, bool, en, int, listOf, ms, nint, nms, nstr, num, obj, ok, op, param, ref, str, v2Errors } from "./common.mjs";

const P = "/v2/projects/{project_id}";
const project = param("ProjectId");
const page = [param("Limit"), param("StartingAfter")];
const E = (...c) => v2Errors(401, 403, ...c);
const R = "routes/v2/targeting.ts";
const AR = ["audiences:audiences:read"], AW = ["audiences:audiences:read_write"];
const OR = ["project_configuration:offerings:read"], OW = ["project_configuration:offerings:read_write"];
const aud = { name: "audience_id", in: "path", required: true, schema: str() };
const rule = { name: "rule_id", in: "path", required: true, schema: str() };
const exp = { name: "experiment_id", in: "path", required: true, schema: str(), description: "Experiment id (prexp...)." };

const condition = obj({ field: str("A customer field such as `country`, `appVersion`, `status`, `activeEntitlements`, `totalSpent`, `firstSeenAt`, or `customAttribute:<key>`."),
  operator: en(["is", "isNot", "isAnyOf", "isNotAnyOf", "greaterThan", "greaterThanOrEqual", "lessThan", "lessThanOrEqual", "equal", "notEqual", "contains", "doesNotContain", "containsAnyOf", "before", "beforeOrOn", "on", "after", "afterOrOn", "within", "between", "notBetween", "isEmpty", "isNotEmpty"]),
  value: str("Comma-separated for multi-value operators; a duration such as `7d` for `within`."), currency: str() }, ["field", "operator"]);
const rules = obj({ groups: arr(obj({ conditions: arr(condition) }, ["conditions"]), { description: "Groups are OR-ed; conditions in a group are AND-ed." }) }, ["groups"]);
const stats = obj({ total_customers: int(), active_subscriptions: int(), active_trials: int(), total_revenue: num(), currency: str(), is_approximate: bool("True only while a project above 5,000 customers is counted in the background for the first time (the totals are 0 until then). Otherwise the stats are exact over every customer.") });
const sample = obj({ object: en(["audience_member"]), app_user_id: str(), app_uuid: str(), email: nstr(), first_seen_at: nms("First seen."), last_seen_at: nms("Last seen."), status: str(), total_spent: { type: ["number", "null"] }, currency: str(), latest_product_name: nstr() });
const audience = obj({
  object: en(["audience"]), id: str(), project_id: str(), customer_list_id: str(), name: str(), rules, created_at: ms("Created."), updated_at: nms("Last updated."),
  stats: { ...stats, description: "With `expand=stats`." }, customer_sample: { ...arr(sample), description: "With `expand=customer_sample`." },
  used_by: { ...obj({ object: str(), targeting_rules: arr({ type: "object" }), experiments: arr({ type: "object" }) }), description: "With `expand=used_by`." },
}, ["object", "id", "project_id", "customer_list_id", "name", "rules", "created_at", "updated_at"]);
const ruleOut = obj({ object: en(["targeting_rule"]), id: str(), project_id: str(), name: str(), audience_id: nstr("Null targets everyone."), offering_id: str(),
  placements: { type: "object", additionalProperties: { type: ["string", "null"] }, description: "Placement identifier → offering id. Null shows no paywall there." },
  position: int("Evaluation order, 0 first."), state: en(["active", "inactive"]), starts_at: nms("Goes live at."), ends_at: nms("Stops at."), revision: int("Sent to the SDK as `targeting.revision`."), created_at: ms("Created.") });
const ruleIn = obj({ name: str(), audience_id: nstr(), offering_id: str(), placements: { type: "object", additionalProperties: { type: ["string", "null"] } }, state: en(["active", "inactive"]), starts_at: { type: ["integer", "null"] }, ends_at: { type: ["integer", "null"] } });
// ---- Experiments (routes/v2/experiments.ts, packages/core/src/experiments) ------------------------------------------
const X = "routes/v2/experiments.ts";
const TYPES = ["introductory_offer", "free_trial_offer", "paywall_design", "price_point", "subscription_duration", "subscription_ordering", "other"];
const METRICS = ["initial_conversion_rate", "initial_conversions", "trials_started", "trials_completed", "trials_converted", "trial_conversion_rate", "paid_customers", "conversion_to_paying", "active_subscribers", "churned_subscribers", "refunded_customers", "refund_rate", "realized_ltv", "realized_ltv_per_customer", "realized_ltv_per_paying_customer", "mrr", "mrr_per_customer", "mrr_per_paying_customer"];
const PRIMARY = ["initial_conversion_rate", "trial_conversion_rate", "conversion_to_paying", "refund_rate", "realized_ltv_per_customer", "realized_ltv_per_paying_customer", "mrr_per_customer", "mrr_per_paying_customer"];
const VARIANT_IDS = ["a", "b", "c", "d"];
const placementsMap = (d) => ({ type: "object", additionalProperties: { type: ["string", "null"] }, description: d });
const nnum = (d) => ({ type: ["number", "null"], ...(d ? { description: d } : {}) });
const typeEnum = en(TYPES, "What is tested. It sets the default metrics: see [Experiments](../docs/guides/experiments.md#the-six-starter-types).");
const primaryEnum = en(PRIMARY, "The metric that decides the winner: a rate or a per-customer mean, because those have an interval.");
const secondaryArr = arr(en(METRICS), { maxItems: 12, description: "Up to 12 more metrics shown first in the results." });
const enrollmentEnum = en(["new", "new_and_existing"], "`new`: only customers first seen at or after the experiment's first start. `new_and_existing`: anyone who asks for offerings while it runs.");
const audienceRules = { ...rules, type: ["object", "null"], description: "Conditions written for this experiment only, in the audience condition format. Null when it uses a saved audience or everyone." };

export const targetingSchemas = {
  ExperimentVariant: obj({
    id: en(VARIANT_IDS, "Set by position: `a` is the control, then `b`, `c`, `d`."),
    name: str("Defaults to Control, Treatment B, Treatment C, Treatment D.", { maxLength: 100 }),
    offering_id: str("The offering `Offerings.current` returns to customers in this variant (ofrng...). A deleted offering keeps its id here."),
    placements: placementsMap("Placement id → offering id for customers in this variant; null shows no paywall there. It overlays the placements of the targeting rule that matches the customer."),
  }, ["id", "name", "offering_id", "placements"]),
  Experiment: obj({
    object: { type: "string", const: "experiment" }, id: str("Experiment id (prexp...)."), project_id: str(), name: str(undefined, { maxLength: 256 }),
    type: typeEnum, status: en(["draft", "running", "paused", "stopped"], "`draft` → `running` ⇄ `paused` → `stopped`. A stopped experiment cannot run again."),
    primary_metric: primaryEnum, secondary_metrics: secondaryArr, notes: str("The hypothesis, in Markdown (up to 20,000 characters)."),
    enrollment: enrollmentEnum, track_paywall_views: bool("Results count paywall views (SDK `paywall_impression` and `custom_paywall_impression` events) and default to customers who saw a paywall. Turned on for every experiment made or changed to `new_and_existing`; A/B experiments converted from the first release keep `false`."),
    audience_id: nstr("A saved audience (aud...). Null with `audience_rules` or for everyone."), audience_rules: audienceRules,
    enrollment_percent: int("Share of matching customers enrolled, 1 to 100.", { minimum: 1, maximum: 100 }),
    priority: int("Enrollment order among the project's experiments, 1 first. New experiments go last; change it with the reorder action."),
    variants: arr(ref("ExperimentVariant"), { minItems: 2, maxItems: 4, description: "The control first, then 1 to 3 treatments. Customers are split evenly." }),
    started_at: nms("First start. A resume keeps it, so `new` keeps counting from the first start."), paused_at: nms("Last pause; cleared on resume."), stopped_at: nms("Stopped."),
    created_at: ms("Created."), updated_at: nms("Last change."), enrolled_customers: int("Customers enrolled so far, sandbox included."),
  }, ["object", "id", "project_id", "name", "type", "status", "primary_metric", "secondary_metrics", "notes", "enrollment", "track_paywall_views", "audience_id", "audience_rules", "enrollment_percent", "priority", "variants", "started_at", "paused_at", "stopped_at", "created_at", "updated_at", "enrolled_customers"]),
  ExperimentMetric: obj({
    id: en(METRICS), display_name: str(), kind: en(["rate", "mean", "count", "total"], "`rate`: numerator ÷ denominator with a Wilson interval. `mean`: per-customer average with a normal interval. `count` and `total`: no interval."),
    unit: en(["%", "$", "#"], "Rates are fractions (0.12 is 12%); money is USD."), better: en(["higher", "lower"], "Which direction wins. Churned subscribers, refunded customers and refund rate are better when lower."), description: str(),
  }, ["id", "display_name", "kind", "unit", "better", "description"]),
  ExperimentMetricValue: obj({
    value: nnum("The metric now. Null for a rate or mean with no customers in its denominator."),
    numerator: int("Rates: the customers or trials counted."), denominator: int("Rates: the customers, trials or paid customers it divides by. Means: the customers averaged."),
    lower: nnum("Rates and means: the 95% interval's lower bound."), upper: nnum("Rates and means: the 95% interval's upper bound."),
    lift: nnum("Treatments, rates and means: value ÷ control value − 1 (0.12 is 12% above the control). Null when the control's value is 0."),
    lift_lower: nnum("The lift's 95% interval, by the delta method on the log of the ratio (Katz's interval for rates, with half counts added when a rate is 0% or 100%). Null for a mean with fewer than two customers on a side, or a mean of 0."), lift_upper: nnum("Upper bound of the lift's 95% interval."),
    chance_to_beat_control: nnum("Treatments, rates and means: the probability this variant beats the control in the metric's `better` direction. Null for a mean with fewer than two customers on a side."),
  }, ["value"], { description: "Counts and totals carry only `value`. The control has no `lift` or `chance_to_beat_control` fields." }),
  ExperimentVariantResult: obj({
    id: en(VARIANT_IDS), name: str(), offering_id: nstr("The variant's offering id."),
    customers: int("Enrolled customers who pass the filters (in the sample, when `sample` is set). Production results leave out customers who joined from a test device."), paywall_viewers: int("Of those, customers with a paywall view after joining."),
    metrics: { type: "object", additionalProperties: ref("ExperimentMetricValue"), description: "Every metric id → its value, interval, lift and chance to beat the control." },
    conversions: int("Kept from the first results release: `initial_conversions`."), conversion_rate: num("Kept: `initial_conversion_rate`, 4 decimals (0 when there are no customers)."),
    trials: int("Kept: `trials_started`."), paying_customers: int("Kept: `paid_customers`."), revenue: num("Kept: `realized_ltv`, USD."), revenue_per_customer: num("Kept: `realized_ltv_per_customer`, USD (0 when there are no customers)."),
  }, ["id", "name", "offering_id", "customers", "paywall_viewers", "metrics", "conversions", "conversion_rate", "trials", "paying_customers", "revenue", "revenue_per_customer"]),
  ExperimentResults: obj({
    object: { type: "string", const: "experiment_results" }, experiment_id: str(), environment: en(["production", "sandbox"]), currency: { type: "string", const: "USD" },
    computed_at: ms("Computed."), primary_metric: en(PRIMARY), secondary_metrics: arr(en(METRICS)), control_variant_id: str("Always `a`."),
    filters: obj({ platform: nstr("The `platform` filter, or null."), country: nstr("The `country` filter, or null."), paywall: en(["all", "viewed", "not_viewed"], "The paywall filter in effect, after the default.") }, ["platform", "country", "paywall"]),
    filter_options: obj({ platforms: arr(str(), { description: "Platforms of the enrolled customers' last requests." }), countries: arr(str(), { description: "Countries of the enrolled customers' last requests." }) }, ["platforms", "countries"]),
    sample: { ...obj({
      customers: int("Customers in the sample: 25,000."), enrolled_customers: int("Every enrolled customer in this environment."),
      enrolled_by_variant: { type: "object", additionalProperties: { type: "integer" }, description: "Variant id → its enrolled customers." },
    }, ["customers", "enrolled_customers", "enrolled_by_variant"]), type: ["object", "null"], description: "Null when every enrolled customer is counted. Above 25,000 enrolled customers the results come from a fixed random sample of 25,000 (the same customers on every request): rates, means, intervals and chances are estimates from it, and counts and totals are the sample's." },
    metrics: arr(ref("ExperimentMetric"), { description: "Every metric's definition, in the order the dashboard lists them." }),
    variants: { ...listOf(ref("ExperimentVariantResult")), description: "One entry per variant, the control first." },
    guidance: obj({
      enough_data: bool("Every variant has at least `min_customers` customers and `min_events` events of the primary metric."), min_customers: int("100."), min_events: int("10 events per variant: conversions for initial conversion rate, paid customers for conversion to paying, completed trials for trial conversion rate, and paid customers for refund rate and the per-customer means."),
      customers_needed_per_variant: nint("Customers per variant to detect a 20% relative lift on the primary metric at 95% confidence and 80% power, from the control's current value. Null until the control has data."),
      leader: { ...obj({ variant_id: str(), chance_to_beat_control: num() }, ["variant_id", "chance_to_beat_control"]), type: ["object", "null"], description: "The treatment most likely to beat the control on the primary metric." },
      message: str("One sentence for people, such as \"Too early to call ...\"."),
    }, ["enough_data", "min_customers", "min_events", "customers_needed_per_variant", "leader", "message"]),
    series: obj({
      days: arr(int(), { description: "Start of each UTC day from the first start to now (at most the last 400 days). Epoch milliseconds." }),
      values: { type: "object", additionalProperties: { type: "object", additionalProperties: arr({ type: ["number", "null"] }) }, description: "`values[metric_id][variant_id][i]`: the metric as of the end of `days[i]`, cumulative." },
    }, ["days", "values"]),
    chance_b_beats_a: num("Kept from the first release: variant b's chance to beat the control on `initial_conversion_rate` (0.5 when unknown)."),
    enough_data: bool("Kept: `guidance.enough_data`."),
  }, ["object", "experiment_id", "environment", "currency", "computed_at", "primary_metric", "secondary_metrics", "control_variant_id", "filters", "filter_options", "metrics", "variants", "guidance", "series", "chance_b_beats_a", "enough_data"]),
  ExperimentEstimate: obj({
    object: { type: "string", const: "experiment_estimate" }, period_days: int("Always 7."),
    matching_customers: int("Customers first seen (`new`) or seen (`new_and_existing`) in the last 7 days who match the audience."),
    enrolled_customers: int("`matching_customers` × `enrollment_percent`, rounded."), customers_per_variant: int("`enrolled_customers` ÷ `variant_count`, rounded down."),
    is_approximate: bool("True when more than 5,000 customers were seen: the audience share of the 5,000 most recent is scaled to all of them."),
  }, ["object", "period_days", "matching_customers", "enrolled_customers", "customers_per_variant", "is_approximate"]),
};

const variantIn = obj({
  id: en(VARIANT_IDS, "Optional; must match the position (a, b, c, d)."), name: str("Default: Control, Treatment B ...", { maxLength: 100 }), offering_id: str("Offering id in this project."),
  placements: placementsMap("Placement id (letters, digits, `_`, `.`, `-`, up to 100) → offering id, or null for no paywall."),
}, ["offering_id"]);
const expFields = {
  name: str("1 to 256 characters.", { maxLength: 256 }), type: typeEnum, primary_metric: primaryEnum, secondary_metrics: secondaryArr, notes: str("The hypothesis, in Markdown.", { maxLength: 20000 }),
  enrollment: enrollmentEnum, track_paywall_views: bool("Default false. Set to true with `new_and_existing`; false there answers 400."),
  audience_id: nstr("A saved audience. Send it or `audience_rules`, not both; setting one clears the other."), audience_rules: audienceRules,
  enrollment_percent: int("Share of matching customers to enroll. Default 100.", { minimum: 1, maximum: 100 }),
  variants: arr(variantIn, { minItems: 2, maxItems: 4, description: "The control first, then 1 to 3 treatments." }),
  offering_a: str("Older form: the control offering. Send it with `offering_b` instead of `variants`."), offering_b: str("Older form: the treatment offering."),
};
const expIn = obj(expFields);
const experimentExample = {
  object: "experiment", id: "prexp4k2m9q8z1x", project_id: "proj18pzzkao", name: "Price point test", type: "price_point", status: "draft",
  primary_metric: "realized_ltv_per_customer", secondary_metrics: ["conversion_to_paying", "initial_conversion_rate", "refund_rate"], notes: "## Hypothesis\n$14.99 a month earns more per customer than $9.99.",
  enrollment: "new", track_paywall_views: false, audience_id: null, audience_rules: { groups: [{ conditions: [{ field: "country", operator: "isAnyOf", value: "US" }] }] }, enrollment_percent: 50, priority: 3,
  variants: [{ id: "a", name: "Control", offering_id: "ofrngm2u3h89blc", placements: {} }, { id: "b", name: "Higher price", offering_id: "ofrng9x8y7z6w5a", placements: {} }],
  started_at: null, paused_at: null, stopped_at: null, created_at: 1790800914012, updated_at: null, enrolled_customers: 0,
};
const resultFilters = [
  { name: "environment", in: "query", schema: en(["production", "sandbox"]), description: "Default `production`. `sandbox` counts test purchases instead." },
  { name: "platform", in: "query", schema: str(), description: "Only customers whose last request came from this platform (any case), such as `ios` or `android`." },
  { name: "country", in: "query", schema: str(), description: "Only customers whose last request came from this country (ISO 3166-1 alpha-2, any case)." },
  { name: "paywall", in: "query", schema: en(["all", "viewed", "not_viewed"]), description: "Customers with or without a paywall view after joining. Default `viewed` when the experiment tracks paywall views, else `all`." },
];
const SUMMARY_CSV = "variant_id,variant_name,offering_id,customers,metric,metric_name,value,numerator,denominator,lower_95,upper_95,lift,lift_lower_95,lift_upper_95,chance_to_beat_control\r\n"
  + "a,Control,ofrngm2u3h89blc,1204,initial_conversion_rate,Initial conversion rate,0.081395,98,1204,0.067249,0.098205,,,,\r\n"
  + "b,Higher price,ofrng9x8y7z6w5a,1188,initial_conversion_rate,Initial conversion rate,0.098485,117,1188,0.082813,0.116745,0.209957,-0.063452,0.563183,0.9277\r\n";
export const targetingPaths = {
  [`${P}/audiences`]: {
    get: op({ id: "listAudiences", tag: "Targeting", summary: "List audiences", security: SECRET, source: R, scopes: AR, parameters: [project], responses: { 200: ok("All audiences.", listOf(audience)), ...E(404) } }),
    post: op({ id: "createAudience", tag: "Targeting", summary: "Create an audience", security: SECRET, source: R, scopes: AW, parameters: [project],
      requestBody: body(obj({ name: str(), rules }, ["name", "rules"]), { name: "Gold plan", rules: { groups: [{ conditions: [{ field: "customAttribute:plan", operator: "is", value: "gold" }] }] } }),
      responses: { 201: ok("The audience.", audience), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/audiences/actions/preview`]: {
    post: op({ id: "previewAudience", tag: "Targeting", summary: "Preview who matches", security: SECRET, source: R, scopes: AR, parameters: [project],
      requestBody: body({ anyOf: [obj({ audience_uuid: str() }, ["audience_uuid"]), obj({ rules }, ["rules"])] }, { rules: { groups: [{ conditions: [{ field: "country", operator: "isAnyOf", value: "US,CA" }] }] } }),
      responses: { 200: ok("Stats and a sample.", obj({ object: en(["audience_preview"]), stats, customer_sample: arr(sample) }, ["object", "stats", "customer_sample"])), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/audiences/filter_options`]: {
    get: op({ id: "getAudienceFilterOptions", tag: "Targeting", summary: "Known values for attribution and custom-attribute fields", security: SECRET, source: R, scopes: AR,
      parameters: [project, { name: "fields", in: "query", schema: str(), description: "Comma-separated: mediaSource, campaign, adGroup, ad, keyword, creative, latestProduct, customAttribute:<key>." }],
      responses: { 200: ok("Options per field.", listOf(obj({ object: str(), field: str(), options: arr(obj({ object: str(), id: str(), display_name: str() })), cardinality_exceeded: bool() }))), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/audiences/{audience_id}`]: {
    get: op({ id: "getAudience", tag: "Targeting", summary: "Get an audience", security: SECRET, source: R, scopes: AR, parameters: [project, aud, { name: "expand", in: "query", schema: arr(en(["stats", "customer_sample", "used_by"])), style: "form", explode: true }],
      responses: { 200: ok("The audience.", audience), ...E(404) } }),
    post: op({ id: "updateAudience", tag: "Targeting", summary: "Update an audience", security: SECRET, source: R, scopes: AW, parameters: [project, aud],
      requestBody: body(obj({ name: str(), rules }), { name: "Gold" }), responses: { 200: ok("The audience.", audience), ...v2Errors(400, 401, 403, 404) } }),
    delete: op({ id: "deleteAudience", tag: "Targeting", summary: "Delete an unused audience", security: SECRET, source: R, extension: true, scopes: AW, parameters: [project, aud],
      responses: { 200: ok("Deleted.", ref("Deleted")), ...E(404, 409) } }),
  },
  [`${P}/targeting_rules`]: {
    get: op({ id: "listTargetingRules", tag: "Targeting", summary: "List targeting rules in order", security: SECRET, source: R, extension: true, scopes: OR, parameters: [project], responses: { 200: ok("All rules.", listOf(ruleOut)), ...E(404) } }),
    post: op({ id: "createTargetingRule", tag: "Targeting", summary: "Create a targeting rule", security: SECRET, source: R, extension: true, scopes: OW, parameters: [project],
      description: "Added at the end of the order, inactive unless `state` is `active`. When the SDK fetches offerings, the first live rule whose audience matches decides the current offering and the offering per placement.",
      requestBody: body({ ...ruleIn, required: ["name", "offering_id"] }, { name: "Gold gets promo", audience_id: "aud1a2b3c4d5e6f", offering_id: "ofrngm2u3h89blc", placements: { onboarding_end: "ofrng9x8y7z6w5" }, state: "active" }),
      responses: { 201: ok("The rule.", ruleOut), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/targeting_rules/actions/reorder`]: {
    post: op({ id: "reorderTargetingRules", tag: "Targeting", summary: "Set the evaluation order", security: SECRET, source: R, extension: true, scopes: OW, parameters: [project],
      requestBody: body(obj({ rule_ids: arr(str(), { minItems: 1, description: "Every rule of the project, once, first evaluated first." }) }, ["rule_ids"])),
      responses: { 200: ok("All rules in the new order.", listOf(ruleOut)), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/targeting_rules/{rule_id}`]: {
    get: op({ id: "getTargetingRule", tag: "Targeting", summary: "Get a targeting rule", security: SECRET, source: R, extension: true, scopes: OR, parameters: [project, rule], responses: { 200: ok("The rule.", ruleOut), ...E(404) } }),
    post: op({ id: "updateTargetingRule", tag: "Targeting", summary: "Update a targeting rule", security: SECRET, source: R, extension: true, scopes: OW, parameters: [project, rule],
      requestBody: body(ruleIn, { state: "inactive" }), responses: { 200: ok("The rule; `revision` goes up by one.", ruleOut), ...v2Errors(400, 401, 403, 404) } }),
    delete: op({ id: "deleteTargetingRule", tag: "Targeting", summary: "Delete a targeting rule", security: SECRET, source: R, extension: true, scopes: OW, parameters: [project, rule], responses: { 200: ok("Deleted.", ref("Deleted")), ...E(404) } }),
  },
  [`${P}/experiments`]: {
    get: op({ id: "listExperiments", tag: "Experiments", summary: "List experiments", security: SECRET, source: X, extension: true, scopes: OR, parameters: [project, ...page],
      description: "Oldest first. `priority` gives the enrollment order.", responses: { 200: ok("A page of experiments.", listOf(ref("Experiment"))), ...E(400, 404) } }),
    post: op({ id: "createExperiment", tag: "Experiments", summary: "Create an offering experiment", security: SECRET, source: X, extension: true, scopes: OW, parameters: [project],
      description: `Creates a **draft** at the bottom of the enrollment order (the highest \`priority\`). Send \`variants\` (a control and 1 to 3 treatments), or the older \`offering_a\` and \`offering_b\` for two variants. Defaults: \`type\` \`other\`, the type's metrics, \`enrollment\` \`new\`, everyone, 100%.

Once started, a customer who asks for offerings and is admitted (enrollment mode, then audience, then the share) joins one variant for good and gets its offering as \`current_offering_id\` and its placements. Enrolling records one \`EXPERIMENT_ENROLLMENT\` event, and the customer's lifecycle events carry \`experiments\`.

Answers 400 when: both \`variants\` and \`offering_a\`/\`offering_b\` are sent, or neither; \`audience_id\` and \`audience_rules\` are both sent; the audience, an offering or a placement offering is not in the project, or the offering is archived; a condition's field or operator is unknown; a placement id has other characters; a variant's \`id\` does not match its position; two variants serve the same offering and the same placement offerings; or \`enrollment\` is \`new_and_existing\` with \`track_paywall_views: false\`.`,
      requestBody: body({ ...expIn, required: ["name"] }, { name: "Price point test", type: "price_point", notes: "## Hypothesis\n$14.99 a month earns more per customer than $9.99.", variants: [{ offering_id: "ofrngm2u3h89blc" }, { name: "Higher price", offering_id: "ofrng9x8y7z6w5a" }], audience_rules: { groups: [{ conditions: [{ field: "country", operator: "isAnyOf", value: "US" }] }] }, enrollment_percent: 50 }),
      responses: { 201: ok("The draft.", ref("Experiment"), experimentExample), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/experiments/actions/reorder`]: {
    post: op({ id: "reorderExperiments", tag: "Experiments", summary: "Set the enrollment order", security: SECRET, source: X, extension: true, scopes: OW, parameters: [project],
      description: "When several running experiments could take the same customer, the one with the lowest `priority` enrolls them. Stopped experiments keep their relative order after these.",
      requestBody: body(obj({ experiment_ids: arr(str(), { minItems: 1, maxItems: 500, description: "Every draft, running and paused experiment of the project, once, first enrolling first." }) }, ["experiment_ids"]), { experiment_ids: ["prexp7h3k1m0p2q", "prexp4k2m9q8z1x"] }),
      responses: { 200: ok("Every experiment of the project in priority order, stopped ones last.", listOf(ref("Experiment"))), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/experiments/actions/estimate`]: {
    post: op({ id: "estimateExperiment", tag: "Experiments", summary: "Estimate how many customers would join", security: SECRET, source: X, extension: true, scopes: [...OR, ...AR], parameters: [project],
      description: "What the dashboard's create form shows: customers of the last 7 days who match the audience, times the percentage, split between the variants. Changes nothing.",
      requestBody: body(obj({
        audience_id: nstr("A saved audience. Send it or `audience_rules`, not both."), audience_rules: audienceRules, enrollment: en(["new", "new_and_existing"], "`new` (default) counts customers first seen in the last 7 days; `new_and_existing` counts customers seen in them."),
        enrollment_percent: int("Default 100.", { minimum: 1, maximum: 100 }), variant_count: int("Default 2.", { minimum: 2, maximum: 4 }),
      }), { enrollment: "new", audience_rules: { groups: [{ conditions: [{ field: "country", operator: "isAnyOf", value: "US" }] }] }, enrollment_percent: 50, variant_count: 2 }),
      responses: { 200: ok("The estimate.", ref("ExperimentEstimate"), { object: "experiment_estimate", period_days: 7, matching_customers: 1840, enrolled_customers: 920, customers_per_variant: 460, is_approximate: false }), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/experiments/{experiment_id}`]: {
    get: op({ id: "getExperiment", tag: "Experiments", summary: "Get an experiment", security: SECRET, source: X, extension: true, scopes: OR, parameters: [project, exp], responses: { 200: ok("The experiment.", ref("Experiment")), ...E(404) } }),
    post: op({ id: "updateExperiment", tag: "Experiments", summary: "Update an experiment", security: SECRET, source: X, extension: true, scopes: OW, parameters: [project, exp],
      description: "A draft takes every field, with the same checks as create. `offering_a` and `offering_b` replace the first two variants' offerings and keep their names and placements. Once an experiment has started (running, paused or stopped), only `name`, `type`, `primary_metric`, `secondary_metrics`, `notes` and `enrollment_percent` can change; any other field answers 422 and names it.",
      requestBody: body(expIn, { enrollment_percent: 100, notes: "Raised to 100% after a week." }), responses: { 200: ok("The experiment.", ref("Experiment")), ...v2Errors(400, 401, 403, 404, 422) } }),
    delete: op({ id: "deleteExperiment", tag: "Experiments", summary: "Delete an experiment", security: SECRET, source: X, extension: true, scopes: OW, parameters: [project, exp],
      description: "Deletes its enrollments and results. On their next request its customers get what targeting gives them, or join another running experiment that admits them. A running experiment answers 422: stop or pause it first.",
      responses: { 200: ok("Deleted.", ref("Deleted")), ...E(404, 422) } }),
  },
  [`${P}/experiments/{experiment_id}/actions/start`]: { post: op({ id: "startExperiment", tag: "Experiments", summary: "Start or resume", security: SECRET, source: X, extension: true, scopes: OW, parameters: [project, exp],
    description: "A draft or paused experiment runs. The first start sets `started_at`; a resume clears `paused_at` and keeps `started_at`. Answers 422 for a running or stopped experiment, when one of its offerings was deleted or archived, or when it has fewer than two variants; 409 (`resource_locked_error`) when another request changed its status at the same time.",
    responses: { 200: ok("The experiment.", ref("Experiment")), ...E(404, 409, 422) } }) },
  [`${P}/experiments/{experiment_id}/actions/pause`]: { post: op({ id: "pauseExperiment", tag: "Experiments", summary: "Pause: enrolled customers keep their variant, nobody new joins", security: SECRET, source: X, extension: true, scopes: OW, parameters: [project, exp],
    description: "Only a running experiment can pause (422 otherwise; 409 when another request changed its status at the same time). Results keep counting what enrolled customers do.", responses: { 200: ok("The experiment.", ref("Experiment")), ...E(404, 409, 422) } }) },
  [`${P}/experiments/{experiment_id}/actions/stop`]: { post: op({ id: "stopExperiment", tag: "Experiments", summary: "Stop for good", security: SECRET, source: X, extension: true, scopes: OW, parameters: [project, exp],
    description: "A running or paused experiment stops (422 otherwise; 409 when another request changed its status at the same time). On their next request its customers get what targeting gives them, or join another running experiment that admits them. Results stay and keep updating as renewals and refunds arrive. A stopped experiment never enrolls anyone again; duplicate it instead.",
    responses: { 200: ok("The experiment.", ref("Experiment")), ...E(404, 409, 422) } }) },
  [`${P}/experiments/{experiment_id}/results`]: {
    get: op({ id: "getExperimentResults", tag: "Experiments", summary: "Results per variant", security: SECRET, source: X, extension: true, scopes: OR,
      parameters: [project, exp, ...resultFilters],
      description: `Every metric per variant, computed now from the enrolled customers' purchases made after they joined (and the renewals, refunds and trial conversions that follow), in USD. Production results leave out customers who joined from a test device (a Test Store app or an iOS sandbox build); \`environment=sandbox\` counts every enrolled customer with their test purchases. Above 25,000 enrolled customers the numbers come from a fixed random sample of 25,000, and \`sample\` says so. Rates have a Wilson interval; per-customer means a normal interval; treatments also have the lift over the control with its interval and the chance to beat the control. \`guidance\` says whether there is enough data and how many customers a 20% lift needs. \`series\` holds every metric by day.

The first release's fields stay: \`conversions\`, \`conversion_rate\`, \`trials\`, \`paying_customers\`, \`revenue\` and \`revenue_per_customer\` on each variant, and \`chance_b_beats_a\` and \`enough_data\` at the top. See [Experiments](../docs/guides/experiments.md#read-the-results) for every definition and the statistics.`,
      responses: { 200: ok("Results.", ref("ExperimentResults")), ...E(400, 404) } }),
  },
  [`${P}/experiments/{experiment_id}/results/export`]: {
    get: op({ id: "exportExperimentResults", tag: "Experiments", summary: "Export results as CSV", security: SECRET, source: X, extension: true, scopes: OR,
      parameters: [project, exp, { name: "kind", in: "query", schema: en(["summary", "daily"]), description: "`summary` (default): one row per variant and metric. `daily`: one row per day and variant, one column per metric id." }, ...resultFilters],
      description: "The same numbers as the results, as an RFC 4180 CSV with CRLF line ends, named `experiment-<id>-<kind>-<environment>-<YYYY-MM-DD>.csv`. Summary columns: `variant_id`, `variant_name`, `offering_id`, `customers`, `metric`, `metric_name`, `value`, `numerator`, `denominator`, `lower_95`, `upper_95`, `lift`, `lift_lower_95`, `lift_upper_95`, `chance_to_beat_control`. Daily columns: `date` (UTC), `variant_id`, `variant_name`, then each metric id. Empty cells are values that do not apply; text that a spreadsheet would run as a formula starts with an apostrophe.",
      responses: {
        200: { description: "The CSV file, as an attachment.", headers: { "Content-Disposition": { schema: str(), description: "`attachment; filename=\"experiment-<id>-<kind>-<environment>-<date>.csv\"`" } }, content: { "text/csv": { schema: str(), example: SUMMARY_CSV } } },
        ...E(400, 404),
      } }),
  },
};

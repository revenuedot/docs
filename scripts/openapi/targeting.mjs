// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: audiences (RevenueCat-compatible), targeting rules and offering experiments (RevenueDot extensions) in the OpenAPI document.
// Docs: https://revenuedot.app/docs/guides/targeting-and-experiments   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { SECRET, arr, body, bool, en, int, listOf, ms, nms, nstr, num, obj, ok, op, param, ref, str, v2Errors } from "./common.mjs";

const P = "/v2/projects/{project_id}";
const project = param("ProjectId");
const page = [param("Limit"), param("StartingAfter")];
const E = (...c) => v2Errors(401, 403, ...c);
const R = "routes/v2/targeting.ts";
const AR = ["audiences:audiences:read"], AW = ["audiences:audiences:read_write"];
const OR = ["project_configuration:offerings:read"], OW = ["project_configuration:offerings:read_write"];
const aud = { name: "audience_id", in: "path", required: true, schema: str() };
const rule = { name: "rule_id", in: "path", required: true, schema: str() };
const exp = { name: "experiment_id", in: "path", required: true, schema: str() };

const condition = obj({ field: str("A customer field such as `country`, `appVersion`, `status`, `activeEntitlements`, `totalSpent`, `firstSeenAt`, or `customAttribute:<key>`."),
  operator: en(["is", "isNot", "isAnyOf", "isNotAnyOf", "greaterThan", "greaterThanOrEqual", "lessThan", "lessThanOrEqual", "equal", "notEqual", "contains", "doesNotContain", "containsAnyOf", "before", "beforeOrOn", "on", "after", "afterOrOn", "within", "between", "notBetween", "isEmpty", "isNotEmpty"]),
  value: str("Comma-separated for multi-value operators; a duration such as `7d` for `within`."), currency: str() }, ["field", "operator"]);
const rules = obj({ groups: arr(obj({ conditions: arr(condition) }, ["conditions"]), { description: "Groups are OR-ed; conditions in a group are AND-ed." }) }, ["groups"]);
const stats = obj({ total_customers: int(), active_subscriptions: int(), active_trials: int(), total_revenue: num(), currency: str(), is_approximate: bool("True when more than 5,000 customers were sampled.") });
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
const expOut = obj({ object: en(["experiment"]), id: str(), project_id: str(), name: str(), status: en(["draft", "running", "paused", "stopped"]), audience_id: nstr(), enrollment_percent: int(),
  variants: arr(obj({ id: en(["a", "b"]), offering_id: str() })), started_at: nms("Started."), stopped_at: nms("Stopped."), created_at: ms("Created.") });
const expIn = obj({ name: str(), audience_id: nstr(), enrollment_percent: int(undefined, { minimum: 1, maximum: 100 }), offering_a: str("Control offering."), offering_b: str("Treatment offering.") });
const variantResult = obj({ id: en(["a", "b"]), offering_id: str(), customers: int("Enrolled."), conversions: int("Made any purchase or started a trial after enrolling."), trials: int(), paying_customers: int(), conversion_rate: num(), revenue: num("USD after enrolling."), revenue_per_customer: num() });

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
    get: op({ id: "listExperiments", tag: "Experiments", summary: "List experiments", security: SECRET, source: R, extension: true, scopes: OR, parameters: [project, ...page], responses: { 200: ok("A page of experiments.", listOf(expOut)), ...E(400, 404) } }),
    post: op({ id: "createExperiment", tag: "Experiments", summary: "Create an offering experiment", security: SECRET, source: R, extension: true, scopes: OW, parameters: [project],
      description: "A draft until started. Running experiments enroll customers who match the audience, in the given percentage, into variant a or b (each customer always gets the same variant), and serve that variant's offering as the current offering. Enrolling records an `EXPERIMENT_ENROLLMENT` event, and enrolled customers' lifecycle events carry `experiments`.",
      requestBody: body({ ...expIn, required: ["name", "offering_a", "offering_b"] }, { name: "Annual first", offering_a: "ofrngm2u3h89blc", offering_b: "ofrng9x8y7z6w5", enrollment_percent: 50 }),
      responses: { 201: ok("The experiment.", expOut), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/experiments/{experiment_id}`]: {
    get: op({ id: "getExperiment", tag: "Experiments", summary: "Get an experiment", security: SECRET, source: R, extension: true, scopes: OR, parameters: [project, exp], responses: { 200: ok("The experiment.", expOut), ...E(404) } }),
    post: op({ id: "updateExperiment", tag: "Experiments", summary: "Update an experiment", security: SECRET, source: R, extension: true, scopes: OW, parameters: [project, exp],
      description: "Variants and audience change only while it is a draft.", requestBody: body(expIn, { enrollment_percent: 100 }), responses: { 200: ok("The experiment.", expOut), ...v2Errors(400, 401, 403, 404, 422) } }),
    delete: op({ id: "deleteExperiment", tag: "Experiments", summary: "Delete an experiment", security: SECRET, source: R, extension: true, scopes: OW, parameters: [project, exp], responses: { 200: ok("Deleted.", ref("Deleted")), ...E(404, 422) } }),
  },
  [`${P}/experiments/{experiment_id}/actions/start`]: { post: op({ id: "startExperiment", tag: "Experiments", summary: "Start or resume", security: SECRET, source: R, extension: true, scopes: OW, parameters: [project, exp], responses: { 200: ok("The experiment.", expOut), ...E(404, 422) } }) },
  [`${P}/experiments/{experiment_id}/actions/pause`]: { post: op({ id: "pauseExperiment", tag: "Experiments", summary: "Pause: enrolled customers keep their variant, nobody new joins", security: SECRET, source: R, extension: true, scopes: OW, parameters: [project, exp], responses: { 200: ok("The experiment.", expOut), ...E(404, 422) } }) },
  [`${P}/experiments/{experiment_id}/actions/stop`]: { post: op({ id: "stopExperiment", tag: "Experiments", summary: "Stop for good", security: SECRET, source: R, extension: true, scopes: OW, parameters: [project, exp], responses: { 200: ok("The experiment.", expOut), ...E(404, 422) } }) },
  [`${P}/experiments/{experiment_id}/results`]: {
    get: op({ id: "getExperimentResults", tag: "Experiments", summary: "Results per variant", security: SECRET, source: R, extension: true, scopes: OR,
      parameters: [project, exp, { name: "environment", in: "query", schema: en(["production", "sandbox"]) }],
      description: "Customers, conversions, trials and revenue after enrolling, and the chance that b converts better than a (normal approximation). `enough_data` is false until both variants have 100 customers.",
      responses: { 200: ok("Results.", obj({ object: en(["experiment_results"]), experiment_id: str(), environment: str(), currency: str(), variants: listOf(variantResult), chance_b_beats_a: num(), enough_data: bool() })), ...E(400, 404) } }),
  },
};

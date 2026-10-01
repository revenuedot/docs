// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the two chart operations (RevenueCat-compatible) in the OpenAPI document.
// Docs: https://revenuedot.app/docs/guides/charts   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { SECRET, arr, body, bool, en, int, listOf, nint, nms, nstr, obj, ok, op, param, str, v2Errors } from "./common.mjs";

const P = "/v2/projects/{project_id}/charts/{chart_name}";
const R = "routes/v2/charts.ts";
const SCOPES = ["charts_metrics:charts:read"];
const WRITE_SCOPES = ["charts_metrics:charts:read_write"];
const SR = "routes/v2/saved-charts.ts";

/** RevenueCat's 41 API chart names, plus the two RevenueDot names for dashboard-only charts. */
export const CHART_NAMES = [
  "actives", "actives_movement", "actives_new", "arr", "churn", "cohort_explorer", "conversion_to_paying", "customers_new", "initial_conversion",
  "ltv_per_customer", "ltv_per_paying_customer", "mrr", "mrr_movement", "prediction_explorer", "refund_rate", "refund_request", "refunds", "revenue",
  "subscription_retention", "subscription_status", "trials", "trials_movement", "trials_new", "customers_active", "trial_conversion",
  "trial_conversion_rate", "trial_cancellation", "non-subscription_purchases", "ad_revenue", "ad_impressions", "ad_clicks", "ad_monetized_customers",
  "ad_arpdau", "ad_rpm", "ad_fill_rate", "ad_ctr", "paywall_encounter", "paywall_conversion", "paywall_ltv", "paywall_abandonment",
  "app_store_save_outcomes", "play_store_cancel_reasons", "customer_center_survey_responses",
];
export const CURRENCIES = ["USD", "EUR", "GBP", "AUD", "CAD", "JPY", "BRL", "KRW", "CNY", "MXN", "SEK", "PLN", "NZD", "CHF"];

const chartName = { name: "chart_name", in: "path", required: true, schema: en(CHART_NAMES),
  description: "The chart. `play_store_cancel_reasons` and `customer_center_survey_responses` are RevenueDot names for charts RevenueCat shows only in its dashboard. Definitions: https://revenuedot.app/docs/guides/charts" };
const environment = { name: "environment", in: "query", schema: en(["production", "sandbox"]), description: "RevenueDot extension. `sandbox` shows only sandbox and Test Store purchases. Default `production`." };

const series = obj({
  display_name: str(), description: nstr(), unit: str("`$`, `#` or `%`."), decimal_precision: int(), scale: en(["absolute", "relative"]),
  chartable: bool(), tabulable: bool(), is_total: bool(), is_other: bool("The segments past `limit_num_segments`, together."),
  id: str("Segments: the dimension value (empty for unknown)."), nested_measures: { type: ["array", "null"], items: { type: "object" }, description: "Per-measure metadata of a segment when the chart has several measures." },
}, ["display_name"]);
const measure = obj({ id: str(), display_name: str(), description: str(), unit: str("`$`, `#` or `%`."), decimal_precision: int(), chartable: bool("Meaningful to plot."), tabulable: bool() });
const point = obj({
  cohort: int("Start of the period (a cohort chart: of the cohort) in Unix seconds."), measure: int("Index into `measures` (time series)."),
  segment: int("Index into `segments` (segmented charts)."), period: int("Index into `periods` (cohort tables). `periods[0]` is the cohort size."),
  value: { type: ["number", "null"] }, incomplete: bool("The period is not over, or the cohort has not finished it: the value can still change."),
  predicted: bool("Prediction Explorer: a predicted value."),
}, ["cohort", "value"]);
const chartData = obj({
  object: en(["chart_data"]), category: str("The chart's group: revenue, subscriptions, ads, ltv, customers, conversion, paywalls, trials, churn, retention."),
  display_type: en(["line", "bar", "stacked_bar", "cohort"]), display_name: str(), description: str(), documentation_link: nstr(),
  last_computed_at: nms("When the numbers were computed (on request)."), start_date: nms("First day of the range."), end_date: nms("Last day of the range."),
  yaxis_currency: str(), filtering_allowed: bool(), segmenting_allowed: bool(), resolution: en(["day", "week", "month", "quarter", "year"]),
  values: arr(point, { description: "Empty when `aggregate` is set." }),
  summary: { type: ["object", "null"], description: "`{ average: {<measure>: number}, total: {<measure>: number} }` keyed by measure display name; totals only for flow measures." },
  yaxis: str("Unit of the first measure."), segments: { type: ["array", "null"], items: series, description: "One entry per segment value, then \"Other\" and the total." },
  segments_limit: nint(), periods: { type: ["array", "null"], items: series, description: "Cohort tables: column metadata, `periods[0]` the cohort size." },
  measures: arr(measure), user_selectors: { type: ["object", "null"], additionalProperties: { type: "string" }, description: "The selectors applied, defaults included." },
  annotations: arr({ type: "object" }, { description: "With `include_annotations=true`. RevenueDot has no annotations yet, so always empty." }),
}, ["object", "category", "display_type", "display_name", "description", "resolution", "values", "yaxis"]);
const option = obj({ id: str(), display_name: str() }, ["id", "display_name"]);
const chartOptions = obj({
  object: en(["chart_options"]),
  resolutions: arr(option, { description: "`0` day, `1` week, `2` month, `3` quarter, `4` year." }),
  segments: arr(obj({ object: en(["chart_segment_option"]), id: str(), display_name: str(), group_display_name: nstr() }, ["object", "id", "display_name"])),
  filters: arr(obj({ object: en(["chart_filter_option"]), id: str(), display_name: str(), group_display_name: nstr(), options: arr(option, { description: "Values present in the project's data, most frequent first (at most 200)." }) }, ["object", "id", "display_name", "options"])),
  user_selectors: { type: ["object", "null"], additionalProperties: obj({ default: str(), display_name: str(), options: arr(option) }) },
}, ["object", "resolutions", "segments", "filters"]);

const q = (name, schema, description) => ({ name, in: "query", schema, description });

const view = obj({
  range: str("7d, 30d, 90d, 12m or custom."), start: str("Custom range start, YYYY-MM-DD."), end: str("Custom range end."), res: str("day, week, month, quarter or year."),
  segment: str(), filters: str("The filters parameter's JSON."), sel: str("The selectors parameter's JSON."), env: en(["production", "sandbox"]), compare: bool("Compare to the previous period."),
});
const savedChart = obj({ object: en(["saved_chart"]), id: str(), name: str(), chart_name: str(), view, created_at: int(), updated_at: int() }, ["object", "id", "name", "chart_name", "view", "created_at", "updated_at"]);
const savedId = { name: "saved_chart_id", in: "path", required: true, schema: str() };

export const chartPaths = {
  [P]: {
    get: op({ id: "getChartData", tag: "Charts", summary: "Get chart data", security: SECRET, source: R, scopes: SCOPES,
      description: `
Time series or cohort table for one chart, computed from the project's purchases when asked. Definitions, filters and SQL: https://revenuedot.app/docs/guides/charts.

Sandbox purchases, granted access and Family Sharing are excluded; money is USD at the purchase-date rate (or \`currency\` at the same date); periods are UTC.`,
      parameters: [param("ProjectId"), chartName,
        q("resolution", str(), "`0`–`4` or `day`, `week`, `month`, `quarter`, `year`. Default `day` (`month` for cohort tables). At most 1,000 periods."),
        q("start_date", str(undefined, { format: "date" }), "First day (YYYY-MM-DD). Default: 30 days ago, or 12 months for cohort tables."),
        q("end_date", str(undefined, { format: "date" }), "Last day, inclusive. Default: today."),
        q("expand_periods", bool(), "Count the whole first period of flow charts. Default false."),
        q("filters", str(), "JSON array `[{\"name\":\"country\",\"values\":[\"US\"]}]`. Names come from `/options`."),
        q("selectors", str(), "JSON object, e.g. `{\"revenue_type\":\"proceeds\"}`."),
        q("segment", str(), "One dimension from `/options`."),
        q("limit_num_segments", int(undefined, { minimum: 1 }), "Top N segments by the first measure; the rest become \"Other\"."),
        q("aggregate", str(), "`average`, `total` or both, comma separated: `values` is empty and `summary` holds only these."),
        q("currency", en(CURRENCIES)), q("include_annotations", bool()), q("realtime", bool(), "Accepted for compatibility; every chart uses the real-time (v3) definitions."), environment],
      responses: { 200: ok("The chart.", chartData), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/options`]: {
    get: op({ id: "getChartOptions", tag: "Charts", summary: "Get available options for a chart", security: SECRET, source: R, scopes: SCOPES,
      description: "Resolutions, segments, filters with the values present in the project's data, and the chart's selectors.",
      parameters: [param("ProjectId"), chartName, environment],
      responses: { 200: ok("The options.", chartOptions), ...v2Errors(401, 403, 404) } }),
  },
  "/v2/projects/{project_id}/saved_charts": {
    get: op({ id: "listSavedCharts", tag: "Charts", summary: "List saved charts", security: SECRET, source: SR, extension: true, scopes: SCOPES, parameters: [param("ProjectId"), param("Limit"), param("StartingAfter")],
      responses: { 200: ok("A page of saved charts.", listOf(savedChart)), ...v2Errors(400, 401, 403, 404) } }),
    post: op({ id: "createSavedChart", tag: "Charts", summary: "Save a chart view", security: SECRET, source: SR, extension: true, scopes: WRITE_SCOPES, parameters: [param("ProjectId")],
      description: "A named chart with the dashboard view that produced it (range, dates, resolution, segment, filters, selectors, environment, compare). Up to 200 per project.",
      requestBody: body(obj({ name: str(undefined, { minLength: 1, maxLength: 120 }), chart_name: en(CHART_NAMES), view }, ["name", "chart_name"]), { name: "MRR by country", chart_name: "mrr", view: { range: "90d", res: "week", segment: "country", compare: true } }),
      responses: { 201: ok("The saved chart.", savedChart), ...v2Errors(400, 401, 403, 404, 422) } }),
  },
  "/v2/projects/{project_id}/saved_charts/{saved_chart_id}": {
    get: op({ id: "getSavedChart", tag: "Charts", summary: "Get a saved chart", security: SECRET, source: SR, extension: true, scopes: SCOPES, parameters: [param("ProjectId"), savedId],
      responses: { 200: ok("The saved chart.", savedChart), ...v2Errors(401, 403, 404) } }),
    patch: op({ id: "updateSavedChart", tag: "Charts", summary: "Rename or update a saved chart", security: SECRET, source: SR, extension: true, scopes: WRITE_SCOPES, parameters: [param("ProjectId"), savedId],
      requestBody: body(obj({ name: str(undefined, { minLength: 1, maxLength: 120 }), view })), responses: { 200: ok("The saved chart.", savedChart), ...v2Errors(400, 401, 403, 404) } }),
    delete: op({ id: "deleteSavedChart", tag: "Charts", summary: "Delete a saved chart", security: SECRET, source: SR, extension: true, scopes: WRITE_SCOPES, parameters: [param("ProjectId"), savedId],
      responses: { 200: ok("Deleted.", obj({ object: en(["saved_chart"]), id: str(), deleted_at: int() }, ["object", "id", "deleted_at"])), ...v2Errors(401, 403, 404) } }),
  },
};

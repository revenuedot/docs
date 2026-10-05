// RevenueDot: the open-source RevenueCat alternative. Same SDK API, free to start on RevenueDot Cloud.
// This file: the two chart operations (RevenueCat-compatible) and the chart page's extensions (saved charts, customers,
// annotations, share links) in the OpenAPI document.
// Docs: https://revenuedot.app/docs/guides/charts   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { NONE, SECRET, arr, body, bool, en, int, listOf, nint, nms, nstr, num, obj, ok, op, param, str, v2Errors } from "./common.mjs";

const P = "/v2/projects/{project_id}/charts/{chart_name}";
const R = "routes/v2/charts.ts";
const SCOPES = ["charts_metrics:charts:read"];
const WRITE_SCOPES = ["charts_metrics:charts:read_write"];
const SR = "routes/v2/saved-charts.ts";
const XR = "routes/v2/chart-extras.ts";
const CUSTOMER_SCOPES = ["charts_metrics:charts:read", "customer_information:customers:read"];

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
  annotations: arr(obj({ object: en(["chart_annotation"]), id: str(), description: str("The annotation's title."), start_date: str(undefined, { format: "date" }), end_date: { type: ["string", "null"], format: "date", description: "Null for a single day." } }, ["object", "id", "description", "start_date", "end_date"]),
    { description: "With `include_annotations=true`: the project's annotations that overlap the range, in RevenueCat's `ChartAnnotation` shape." }),
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

const CHART_TYPES = ["line", "stacked_area", "column", "stacked_column", "percent_column"];
const view = obj({
  range: str("7d, 30d, 90d, 12m or custom."), start: str("Custom range start, YYYY-MM-DD."), end: str("Custom range end."), res: str("day, week, month, quarter or year."),
  segment: str(), filters: str("The filters parameter's JSON."), sel: str("The selectors parameter's JSON."), env: en(["production", "sandbox"]), compare: bool("Compare to the previous period."),
  type: en(CHART_TYPES, "The chart type. Stacked types need two or more series; with one they draw as `line` or `column`."), m: str("The plotted measure group, `0` first."),
});
const chartQuery = [
  q("resolution", str(), "As for chart data."), q("start_date", str(undefined, { format: "date" })), q("end_date", str(undefined, { format: "date" })), q("expand_periods", bool()),
  q("filters", str()), q("selectors", str()), q("segment", str()), q("limit_num_segments", int(undefined, { minimum: 1 })), q("currency", en(CURRENCIES)), environment,
];
const chartCustomer = obj({
  object: en(["chart_customer"]), customer_id: str("Internal customer id."), app_user_id: nstr("A non-anonymous app user id when the customer has one."),
  status: en(["active", "trialing", "grace_period", "billing_issue", "expired", "none"], "From the subscriptions of the chart's environment."),
  store: nstr(), product_id: nstr(), contributed_at: int("The customer's latest contribution in the range (ms): a purchase, a paid start, the cohort date …"),
  first_seen_at: { type: ["integer", "null"] }, value: num("The customer's part of the `value` measure."), segment: nstr("The segment's label when the chart is segmented (`Other` past the limit)."),
}, ["object", "customer_id", "status", "contributed_at", "value"]);
const chartCustomers = obj({
  object: en(["chart_customers"]), chart_name: str(), total_count: int("Every contributor; `items` holds the most recent `limit`."),
  value: { type: ["object", "null"], properties: { id: str(), display_name: str(), unit: str() }, description: "The chart measure the values are part of." },
  sum: en(["total", "last"], "`total`: the values add up to the range's total. `last`: to the last period's value (snapshots such as MRR)."),
  unattributed_value: num("The part of the chart no customer is listed for: ad events from app user ids the server never saw."),
  date_label: str("What `contributed_at` is, in the chart's words."), currency: str(), segment: nstr(), items: arr(chartCustomer),
}, ["object", "chart_name", "total_count", "value", "sum", "items"]);
const author = { type: ["object", "null"], properties: { id: str(), email: nstr(), name: nstr() }, description: "Who made it; null for an API key." };
const annotation = obj({
  object: en(["chart_annotation"]), id: str(), title: str(), description: nstr(), start_date: str(undefined, { format: "date" }), end_date: str("Equal to `start_date` for a single day.", { format: "date" }),
  created_by: author, created_at: int(), updated_at: int(),
}, ["object", "id", "title", "start_date", "end_date", "created_at", "updated_at"]);
const annotationId = { name: "annotation_id", in: "path", required: true, schema: str() };
const AR = { tag: "Charts", security: SECRET, source: XR, extension: true };
const share = obj({
  object: en(["chart_share"]), id: str("The link's id (`chartshare…`): revoke it by this id, and the audit log names it. It is not the token."), chart_name: str(), title: str(),
  url: str("The public page, `/share/charts/cs_…`. Its token (192 random bits) is the only key to the page; anyone who can read the project's links can copy it."), image_url: str("The 1200×630 PNG preview, drawn when the link was made."),
  view, start_date: str(undefined, { format: "date" }), end_date: str(undefined, { format: "date" }), created_by: author, created_at: int(), revoked_at: { type: ["integer", "null"] },
}, ["object", "id", "chart_name", "url", "image_url", "created_at"]);
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
        q("currency", en(CURRENCIES)), q("week_start", str(), "RevenueDot extension: the first day of weekly buckets, 0 (Sunday) to 6 (Saturday) or a day's name. Default 1 (Monday)."), q("include_annotations", bool()), q("realtime", bool(), "Accepted for compatibility; every chart uses the real-time (v3) definitions."), environment],
      responses: { 200: ok("The chart.", chartData), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/options`]: {
    get: op({ id: "getChartOptions", tag: "Charts", summary: "Get available options for a chart", security: SECRET, source: R, scopes: SCOPES,
      description: "Resolutions, segments, filters with the values present in the project's data, and the chart's selectors.",
      parameters: [param("ProjectId"), chartName, environment],
      responses: { 200: ok("The options.", chartOptions), ...v2Errors(401, 403, 404) } }),
  },
  [`${P}/customers`]: {
    get: op({ id: "listChartCustomers", tag: "Charts", summary: "List the customers behind a chart", security: SECRET, source: XR, extension: true, scopes: CUSTOMER_SCOPES,
      description: `
The customers whose purchases, subscriptions, trials or activity make up the chart for these parameters (the chart's own), most recent contribution first, each with their part of one of the chart's measures. The values plus \`unattributed_value\` add up to the chart: over the range (\`sum: total\`) or at the last period (\`sum: last\`). Which customers each chart lists: https://revenuedot.app/docs/guides/charts#customers-behind-a-chart.

\`format=csv\` streams every contributor as CSV (at most 100,000 rows); the response has \`X-RevenueDot-Total-Count\`.`,
      parameters: [param("ProjectId"), chartName, ...chartQuery, q("limit", int(undefined, { minimum: 1, maximum: 100 }), "Customers in `items`, 1–100. Default 100."), q("format", en(["json", "csv"]), "Default `json`.")],
      responses: { 200: { description: "The customers, or the CSV export.", content: { "application/json": { schema: chartCustomers }, "text/csv": { schema: str() } } }, ...v2Errors(400, 401, 403, 404) } }),
  },
  "/v2/projects/{project_id}/chart_annotations": {
    get: op({ ...AR, id: "listChartAnnotations", summary: "List chart annotations", scopes: SCOPES,
      description: "The project's annotations, oldest first, at most 1,000. With dates, only those that overlap them.",
      parameters: [param("ProjectId"), q("start_date", str(undefined, { format: "date" })), q("end_date", str(undefined, { format: "date" }))],
      responses: { 200: ok("The annotations.", listOf(annotation)), ...v2Errors(400, 401, 403, 404) } }),
    post: op({ ...AR, id: "createChartAnnotation", summary: "Create a chart annotation", scopes: WRITE_SCOPES,
      description: "A note on a UTC day or date range that every chart of the project shows. Viewers cannot create one. Audited as `chart_annotation_created`.",
      parameters: [param("ProjectId")],
      requestBody: body(obj({ title: str(undefined, { minLength: 1, maxLength: 120 }), description: nstr(undefined, { maxLength: 1000 }), start_date: str(undefined, { format: "date" }), end_date: { type: ["string", "null"], format: "date", description: "Default `start_date`; never before it." } }, ["title", "start_date"]),
        { title: "Launched the annual plan", description: "New paywall in 2.4", start_date: "2026-09-14" }),
      responses: { 201: ok("The annotation.", annotation), ...v2Errors(400, 401, 403, 404, 422) } }),
  },
  "/v2/projects/{project_id}/chart_annotations/{annotation_id}": {
    get: op({ ...AR, id: "getChartAnnotation", summary: "Get a chart annotation", scopes: SCOPES, parameters: [param("ProjectId"), annotationId],
      responses: { 200: ok("The annotation.", annotation), ...v2Errors(401, 403, 404) } }),
    patch: op({ ...AR, id: "updateChartAnnotation", summary: "Update a chart annotation", scopes: WRITE_SCOPES, parameters: [param("ProjectId"), annotationId],
      description: "Changes any field. A single-day annotation moved with `start_date` stays a single day; `end_date: null` makes any annotation a single day. Audited as `chart_annotation_updated`.",
      requestBody: body(obj({ title: str(undefined, { minLength: 1, maxLength: 120 }), description: nstr(undefined, { maxLength: 1000 }), start_date: str(undefined, { format: "date" }), end_date: { type: ["string", "null"], format: "date" } })),
      responses: { 200: ok("The annotation.", annotation), ...v2Errors(400, 401, 403, 404) } }),
    delete: op({ ...AR, id: "deleteChartAnnotation", summary: "Delete a chart annotation", scopes: WRITE_SCOPES, parameters: [param("ProjectId"), annotationId],
      responses: { 200: ok("Deleted.", obj({ object: en(["chart_annotation"]), id: str(), deleted_at: int() }, ["object", "id", "deleted_at"])), ...v2Errors(401, 403, 404) } }),
  },
  "/v2/projects/{project_id}/chart_shares": {
    get: op({ ...AR, id: "listChartShares", summary: "List active chart share links", scopes: SCOPES,
      description: "The project's links that are not revoked, newest first, at most 200.", parameters: [param("ProjectId"), q("chart_name", en(CHART_NAMES), "Only this chart's links.")],
      responses: { 200: ok("The links.", listOf(share)), ...v2Errors(401, 403, 404) } }),
    post: op({ ...AR, id: "createChartShare", summary: "Create a public chart share link", scopes: WRITE_SCOPES,
      description: "Computes the chart for the view now and keeps that snapshot (series, labels, summary values; no customer data) behind an unguessable public link with a PNG preview. Owners, admins and developers can create one; at most 200 active per project. Audited as `chart_share_created`.",
      parameters: [param("ProjectId")],
      requestBody: body(obj({ chart_name: en(CHART_NAMES), view }, ["chart_name"]), { chart_name: "revenue", view: { range: "90d", res: "week", segment: "product", type: "stacked_column" } }),
      responses: { 201: ok("The link.", share), ...v2Errors(400, 401, 403, 404, 422) } }),
  },
  "/v2/projects/{project_id}/chart_shares/{share_id}": {
    delete: op({ ...AR, id: "revokeChartShare", summary: "Revoke a chart share link", scopes: WRITE_SCOPES,
      description: "The public page and images answer 410 from now on. Audited as `chart_share_deleted`.",
      parameters: [param("ProjectId"), { name: "share_id", in: "path", required: true, description: "The link's `id` (`chartshare…`), not its token.", schema: str() }],
      responses: { 200: ok("Revoked.", obj({ object: en(["chart_share"]), id: str(), deleted_at: int() }, ["object", "id", "deleted_at"])), ...v2Errors(401, 403, 404) } }),
  },
  "/share/charts/{token}": {
    get: op({ id: "shareChart", tag: "Share cards", summary: "Public chart page", security: NONE, source: "routes/share.ts", extension: true,
      description: "The chart snapshot as a page: the plot, summary values, the values table, Open Graph and Twitter tags. No scripts, `noindex`.",
      parameters: [{ name: "token", in: "path", required: true, schema: str() }],
      responses: { 200: { description: "The page.", content: { "text/html": { schema: str() } } }, 304: { description: "Not modified (ETag)." }, 404: { description: "Unknown link." }, 410: { description: "The link was revoked." } } }),
  },
  "/share/charts/{token}/og.png": {
    get: op({ id: "shareChartImage", tag: "Share cards", summary: "Public chart preview image", security: NONE, source: "routes/share.ts", extension: true,
      parameters: [{ name: "token", in: "path", required: true, schema: str() }],
      responses: { 200: { description: "A 1200×630 PNG.", content: { "image/png": { schema: str(undefined, { format: "binary" }) } } }, 404: { description: "Unknown link." }, 410: { description: "The link was revoked." } } }),
  },
  "/share/charts/{token}/chart.svg": {
    get: op({ id: "shareChartSvg", tag: "Share cards", summary: "Public chart as SVG", security: NONE, source: "routes/share.ts", extension: true,
      parameters: [{ name: "token", in: "path", required: true, schema: str() }],
      responses: { 200: { description: "The 1200×630 card as SVG.", content: { "image/svg+xml": { schema: str() } } }, 404: { description: "Unknown link." }, 410: { description: "The link was revoked." } } }),
  },
  "/v2/projects/{project_id}/saved_charts": {
    get: op({ id: "listSavedCharts", tag: "Charts", summary: "List saved charts", security: SECRET, source: SR, extension: true, scopes: SCOPES, parameters: [param("ProjectId"), param("Limit"), param("StartingAfter")],
      responses: { 200: ok("A page of saved charts.", listOf(savedChart)), ...v2Errors(400, 401, 403, 404) } }),
    post: op({ id: "createSavedChart", tag: "Charts", summary: "Save a chart view", security: SECRET, source: SR, extension: true, scopes: WRITE_SCOPES, parameters: [param("ProjectId")],
      description: "A named chart with the dashboard view that produced it (range, dates, resolution, segment, filters, selectors, environment, compare, chart type, measure group). Up to 200 per project.",
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

// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: attribution (customer attribution, revenue by campaign), benchmarks (RevenueDot Cloud only) and AI growth insights with the weekly digest. All are RevenueDot extensions.
// Docs: https://revenuedot.app/docs/guides/attribution  https://revenuedot.app/docs/guides/benchmarks  https://revenuedot.app/docs/guides/growth-insights
import { NONE, SECRET, SESSION, arr, body, bool, en, int, ms, nint, nms, nstr, num, obj, ok, op, param, str, v2Errors } from "./common.mjs";

const P = "/v2/projects/{project_id}";
const project = param("ProjectId");
const E = (...c) => v2Errors(401, 403, ...c);
const x = { extension: true, security: SECRET };
const q = (name, schema, description) => ({ name, in: "query", schema: { ...schema, ...(description ? { description } : {}) } });
const nnum = (description) => ({ type: ["number", "null"], ...(description ? { description } : {}) });
const date = (description) => str(description, { pattern: "^\\d{4}-\\d{2}-\\d{2}$" });

// ---- Attribution
const attribution = obj({
  object: en(["customer_attribution"]), media_source: nstr("`$mediaSource`, or Apple Search Ads for an AdServices attribution."), campaign: nstr("`$campaign`; for Apple Search Ads the campaign name once the connection has loaded names, else the id."),
  campaign_id: nstr("Apple Search Ads campaign id."), ad_group: nstr(), ad_group_id: nstr(), ad: nstr(), ad_id: nstr(), keyword: nstr(), keyword_id: nstr(), creative: nstr(),
  claim_type: nstr("Apple Search Ads: Click or Impression."), conversion_type: nstr("Apple Search Ads: Download, Redownload or PreOrder."), attribution_country: nstr("Two-letter country of the ad (Apple Search Ads)."),
  partner_ids: { type: "object", additionalProperties: str(), description: "Attribution partners' device ids: appsflyer_id, adjust_id, branch_id, kochava_device_id, singular_device_id, tenjin_id, airbridge_device_id." },
  updated_at: ms("Last rebuilt from the attributes."),
});
const reportRow = obj({
  object: en(["attribution_report_row"]), key: str("The dimension's value; empty for customers without one (\"No attribution\"); `total` on the total row."), label: str(),
  customers: int("New customers whose cohort date (the earlier of first seen and first purchase) is in the range."), trial_starts: int(), paying_customers: int("Customers whose first payment was not refunded."),
  conversion_to_paying: nnum("Paying customers ÷ customers, in %."), revenue_day_0: num("USD, net of refunds in the window, ads excluded."), revenue_day_7: num(), revenue_day_30: num(), revenue_to_date: num(),
  revenue_per_customer: nnum(), revenue_per_paying_customer: nnum(), day_7_incomplete: bool("Some customers' first 7 days have not ended."), day_30_incomplete: bool(),
});
const report = obj({
  object: en(["attribution_report"]), group_by: en(["media_source", "campaign", "ad_group", "keyword"]), media_source: nstr(), environment: en(["production", "sandbox"]), currency: en(["USD"]),
  start_date: date(), end_date: date(), computed_at: ms("When."), dimensions: arr(str()), media_sources: arr(str(), { description: "Every media source the project's customers have, for the picker." }),
  rows: arr(reportRow, { description: "Largest revenue to date first." }), total: reportRow,
});

// ---- Benchmarks
const metricDef = obj({
  id: en(["initial_conversion", "trial_conversion", "conversion_to_paying", "churn", "refund_rate", "ltv_per_customer", "ltv_per_paying_customer", "arpu", "price_monthly", "price_annual"]),
  display_name: str(), description: str(), unit: en(["%", "$"]), better: en(["higher", "lower", "neutral"]), min_sample: int("A project counts for the metric only with at least this much data."), sample_label: str(),
  chart: { ...obj({ name: str("The chart with the same definition."), selectors: { type: "object", additionalProperties: str() } }), type: ["object", "null"] },
});
const peers = { ...obj({
  projects: int("Projects in the group, rounded down to a multiple of 5 (at least 10)."), p10: nnum("Only with 20 or more projects."), p25: num(), p50: num("The median."), p75: num(), p90: nnum("Only with 20 or more projects."),
}), type: ["object", "null"], description: "Null when fewer than 10 projects share a value for this metric in the group." };
const metricRow = obj({
  metric: str(), value: nnum("The project's own value; null under its minimum sample."), sample: int(), peers, percentile: nint("Estimated from the published percentiles, 1 to 99."),
  standing: { type: ["string", "null"], enum: ["top_quarter", "above_median", "below_median", "bottom_quarter", null], description: "In the better direction (for prices: towards higher)." }, definition: metricDef,
});
const settings = obj({ object: en(["benchmark_settings"]), available: bool("False on a self-hosted server."), share: bool(), category: nstr(), shared_at: nms("When sharing was turned on.") });
const benchmarks = obj({
  object: en(["benchmarks"]), available: bool("False on a self-hosted server; then only `reason` follows."), reason: str(),
  settings: obj({ share: bool(), category: nstr(), shared_at: nms("When sharing was turned on.") }),
  last_computed_at: nms("When the groups were last rebuilt."), next_run_at: ms("The next nightly run (02:00 UTC)."), k_anonymity: int("Projects a group needs (10)."),
  window: obj({ start_date: date(), end_date: date() }), categories: arr(obj({ id: str(), display_name: str() })), metrics_catalog: arr(metricDef),
  peer_group: { ...obj({ category: str(), platform: en(["all", "ios", "android"]), country: str("`all` or a two-letter code."), projects: nint() }), type: ["object", "null"] },
  own_computed_at: nms("When the project's own values were computed."), metrics: arr(metricRow, { description: "Empty while the project does not share." }),
  opportunity: nstr("The metric where the project stands furthest below the median."), options: { ...obj({ countries: arr(str()), platforms: arr(str()) }), type: ["object", "null"] },
}, ["object", "available"]);

// ---- Insights
const number = obj({ id: str("A data pack item id (mrr, revenue, trial_conversion, campaign_1, benchmark_churn …)."), label: str(), unit: en(["$", "%", "#"]), value: nnum(), previous: nnum(), change_pct: nnum(), window: str(), lower_is_better: bool() });
const insight = obj({ id: str(), title: str(), finding: str(), recommendation: str(), metric_ids: arr(str()), numbers: arr(number, { description: "The server's numbers, not the model's text." }), link: str("A dashboard path in this project."), ask: str("A question for RevenueDot AI.") });
const insights = obj({
  object: en(["ai_insights"]), available: bool(), reason: nstr(), week: date("Monday (UTC) of the current week."), status: en(["none", "running", "ready", "error"], "This week's row."), error: nstr(),
  insights_week: { ...date("The week the shown insights are from (this week's, else the last ready one)."), type: ["string", "null"] }, stale: bool("The shown insights are from an earlier week."),
  generated_at: nms("When they were written."), provider: nstr(), model: nstr(), insights: arr(insight, { description: "3 to 5." }), can_refresh: bool(),
  digest: obj({ available: bool("This server sends the weekly digest."), subscribed: { type: ["boolean", "null"], description: "Whether the caller gets it; null for API keys." } }),
});
const html = (description) => ({ description, content: { "text/html": { schema: str() } } });

export const insightsPaths = {
  [`${P}/customers/{customer_id}/attribution`]: {
    get: op({ ...x, id: "getCustomerAttribution", tag: "Attribution", summary: "Get a customer's attribution", source: "routes/v2/customers.ts", scopes: ["customer_information:customers:read"],
      parameters: [project, { name: "customer_id", in: "path", required: true, schema: str("Any of the customer's app user ids.") }],
      description: "The first-class attribution row built from the customer's reserved attributes (`$mediaSource`, `$campaign`, `$adGroup`, `$ad`, `$keyword`, `$creative`, `$appleAds*`, `$claimType`, `$conversionType`) and partner ids. Null when the customer has none.",
      responses: { 200: ok("The row.", obj({ object: en(["customer_attribution_result"]), attribution: { ...attribution, type: ["object", "null"] } })), ...E(404) } }),
  },
  [`${P}/attribution/report`]: {
    get: op({ ...x, id: "getAttributionReport", tag: "Attribution", summary: "Revenue by campaign", source: "routes/v2/attribution.ts", scopes: ["charts_metrics:charts:read"],
      description: "New customers of a date range grouped by one attribution dimension, with trial starts, paying customers and revenue on day 0, by day 7, by day 30 and to date (USD, net of refunds in each window, ads excluded). See [Attribution](../docs/guides/attribution.md).",
      parameters: [project,
        q("group_by", en(["media_source", "campaign", "ad_group", "keyword"]), "Default `campaign`."),
        q("media_source", str(), "Only customers with this media source; `No attribution` for customers without one."),
        q("start_date", date(), "First cohort day (UTC). Default: 29 days before end_date."), q("end_date", date(), "Last cohort day (UTC). Default: today."),
        q("environment", en(["production", "sandbox"]), "Default production.")],
      responses: { 200: ok("The report.", report), ...E(400, 404) } }),
  },
  [`${P}/benchmarks`]: {
    get: op({ ...x, id: "getBenchmarks", tag: "Benchmarks", summary: "The project's values against peers", source: "routes/v2/benchmarks.ts", scopes: ["charts_metrics:charts:read"],
      description: "RevenueDot Cloud only. The project's last 12 complete months against the percentiles of apps that share anonymized benchmarks, for one category, platform and country. A group is published only when 10 or more projects contribute; nothing about another project is returned. A project that does not share sees no peer numbers. See [Benchmarks](../docs/guides/benchmarks.md).",
      parameters: [project, q("category", str(), "A category id or `all`; default the project's."), q("platform", en(["all", "ios", "android"])), q("country", str(), "A two-letter country code; default all.")],
      responses: { 200: ok("Benchmarks.", benchmarks), ...E(404) } }),
  },
  [`${P}/benchmarks/settings`]: {
    get: op({ ...x, id: "getBenchmarkSettings", tag: "Benchmarks", summary: "Whether the project shares benchmarks", source: "routes/v2/benchmarks.ts", scopes: ["project_configuration:projects:read"], parameters: [project],
      responses: { 200: ok("Settings.", settings), ...E(404) } }),
    post: op({ ...x, id: "updateBenchmarkSettings", tag: "Benchmarks", summary: "Share or stop sharing anonymized benchmarks", source: "routes/v2/benchmarks.ts", scopes: ["project_configuration:projects:read_write"], parameters: [project],
      description: "Admins only. Sharing needs the app's category. Turning sharing off deletes the project's values and rebuilds the groups without it at once. Audited as `benchmarks_settings_updated`. Answers 404 on a self-hosted server.",
      requestBody: body(obj({ share: bool(), category: { type: ["string", "null"], enum: ["business", "education", "gaming", "health_fitness", "media_entertainment", "photo_video", "productivity", "shopping", "social_lifestyle", "travel", "utilities", "other", null] } }, ["share"]), { share: true, category: "health_fitness" }),
      responses: { 200: ok("Saved.", settings), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/ai/insights`]: {
    get: op({ ...x, id: "getAiInsights", tag: "Growth insights", summary: "This week's growth insights", source: "routes/v2/assistant.ts", parameters: [project],
      description: "The cached recommendations RevenueDot AI wrote for this week (or the last ready week), with the numbers they rest on. Reading never calls the model. See [Growth insights](../docs/guides/growth-insights.md).",
      responses: { 200: ok("Insights.", insights), ...E(404) } }),
  },
  [`${P}/ai/insights/refresh`]: {
    post: op({ extension: true, security: SESSION, id: "refreshAiInsights", tag: "Growth insights", summary: "Write this week's insights now", source: "routes/v2/assistant.ts", parameters: [project],
      description: "Admins and developers. RevenueDot AI reads the project's numbers with its read tools and writes 3 to 5 recommendations; the server keeps only those that cite the data pack. At most once an hour per project (429), and it counts against the person's RevenueDot AI allowance.",
      responses: { 200: ok("The new insights.", insights), ...v2Errors(401, 403, 404, 409, 429, 503) } }),
  },
  "/auth/insights/unsubscribe": {
    get: op({ id: "insightsUnsubscribePage", tag: "Growth insights", summary: "The digest's opt-out page", security: NONE, source: "routes/insights-public.ts", extension: true,
      description: "Shows a button; a GET changes nothing (mail scanners follow links).", parameters: [q("token", str(), "The signed token from the digest email.")],
      responses: { 200: html("The page."), 404: html("The link is not valid.") } }),
    post: op({ id: "insightsUnsubscribe", tag: "Growth insights", summary: "Turn the weekly digest off (one click)", security: NONE, source: "routes/insights-public.ts", extension: true,
      description: "Turns the digest off for the person the token was issued to, also as RFC 8058 one-click unsubscribe from the `List-Unsubscribe` header.", parameters: [q("token", str(), "The signed token from the digest email.")],
      responses: { 200: html("Done."), 404: html("The link is not valid.") } }),
  },
};

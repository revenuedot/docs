// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: Ads (the Ads Overview, rewarded-ad reward rules and verifications, the AdMob connection and its server-side
// verification callback, Apple Search Ads campaign reporting) in the OpenAPI document. RevenueDot extensions.
// Docs: https://revenuedot.app/docs/guides/ads   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { NONE, SECRET, arr, body, bool, en, int, listOf, ms, nint, nms, nstr, num, obj, ok, op, param, str, v2Errors } from "./common.mjs";

const P = "/v2/projects/{project_id}/ads";
const project = param("ProjectId");
const page = [param("Limit"), param("StartingAfter")];
const E = (...c) => v2Errors(401, 403, ...c);
const ADS = "routes/v2/ads.ts", PUB = "routes/ads-public.ts";
const CHARTS = ["charts_metrics:overview:read"];
const READ = ["project_configuration:integrations:read"], WRITE = ["project_configuration:integrations:read_write"];
const RANGES = ["7d", "28d", "90d", "12m"];
const nnum = (description) => ({ type: ["number", "null"], ...(description ? { description } : {}) });

// ---- Overview ---------------------------------------------------------------------------------------------------------
const totals = obj({
  ad_revenue: num("Sum of `revenue_micros` ÷ 1,000,000 of `rc_ads_ad_revenue` events, converted to US dollars at each day's rate."),
  impressions: int("`rc_ads_ad_displayed` events. A group with revenue events but no displayed events counts one impression per revenue event."),
  ecpm: nnum("Ad revenue ÷ impressions × 1,000, or null without impressions."),
  clicks: int("`rc_ads_ad_opened` events."),
  ctr: nnum("Clicks ÷ impressions (0 to 1), or null without impressions."),
  loaded: int("`rc_ads_ad_loaded` events."),
  failed_to_load: int("`rc_ads_ad_failed_to_load` events."),
  fill_rate: nnum("Loaded ÷ (loaded + failed to load), or null."),
  revenue_events: int("`rc_ads_ad_revenue` events."),
});
const breakdownRow = obj({
  key: str("The network, format, placement, ad unit id or mediator. Empty when the SDK sent none."),
  ad_revenue: num("US dollars."), impressions: int(), ecpm: nnum(), clicks: int(), share: num("Share of the period's ad revenue (0 to 1)."),
}, ["key", "ad_revenue", "impressions", "share"]);
const overview = obj({
  object: en(["ads_overview"]), currency: en(["USD"]), range: en(RANGES), environment: en(["production", "sandbox"]), app_id: nstr("The app filter, or null for every app."),
  start_date: str("First UTC day of the period (YYYY-MM-DD)."), end_date: str("Last UTC day of the period, today."),
  has_ad_events: bool("Whether the project ever received an ad event, in either environment. The dashboard shows its onboarding steps when false."),
  totals: { ...totals, properties: {
    ...totals.properties,
    ad_customers: int("Distinct customers with an ad event in the period."),
    subscription_revenue: num("US dollar sum of purchases in the period, refunds negative, same environment and app."),
    total_revenue: num("Ad revenue plus subscription revenue."),
    ad_share: nnum("Ad revenue ÷ total revenue, or null when both are 0."),
  } },
  previous: { ...totals, properties: { ...totals.properties, subscription_revenue: num() }, description: "The same totals for the period of the same length just before." },
  series: arr(obj({ date: str("UTC day."), ad_revenue: num(), impressions: int(), ecpm: nnum(), clicks: int(), subscription_revenue: num() }), { description: "One row per day of the period, oldest first." }),
  by_network: arr(breakdownRow), by_format: arr(breakdownRow), by_placement: arr(breakdownRow),
  by_ad_unit: arr({ ...breakdownRow, properties: { ...breakdownRow.properties, name: nstr("The AdMob ad unit's name, when AdMob is connected."), unit_format: nstr("The AdMob ad unit's format.") } }),
  by_mediator: arr(breakdownRow),
  unconverted: arr(obj({ currency: str(), amount: num("Revenue in that currency that could not be converted, counted as 0.") }), { description: "Currencies with no exchange rate." }),
  ad_units_loaded: int("Ad units loaded from AdMob."),
}, ["object", "range", "environment", "totals", "previous", "series"]);
const overviewExample = {
  object: "ads_overview", currency: "USD", range: "7d", environment: "production", app_id: null, start_date: "2026-09-25", end_date: "2026-10-01", has_ad_events: true,
  totals: { ad_revenue: 412.37, impressions: 183240, ecpm: 2.25, clicks: 2210, ctr: 0.0121, loaded: 190112, failed_to_load: 8410, fill_rate: 0.9576, revenue_events: 183240, ad_customers: 9312, subscription_revenue: 1840.5, total_revenue: 2252.87, ad_share: 0.183 },
  previous: { ad_revenue: 388.1, impressions: 176005, ecpm: 2.21, clicks: 2034, ctr: 0.0116, loaded: 181220, failed_to_load: 8102, fill_rate: 0.9572, revenue_events: 176005, subscription_revenue: 1702.25 },
  series: [{ date: "2026-09-25", ad_revenue: 57.9, impressions: 25811, ecpm: 2.24, clicks: 301, subscription_revenue: 255.3 }],
  by_network: [{ key: "AdMob", ad_revenue: 301.2, impressions: 131002, ecpm: 2.3, clicks: 1650, share: 0.7304 }],
  by_format: [{ key: "rewarded", ad_revenue: 250.11, impressions: 60321, ecpm: 4.15, clicks: 801, share: 0.6065 }],
  by_placement: [{ key: "level_end", ad_revenue: 180.4, impressions: 41022, ecpm: 4.4, clicks: 512, share: 0.4375 }],
  by_ad_unit: [{ key: "ca-app-pub-3940256099942544/5224354917", ad_revenue: 180.4, impressions: 41022, ecpm: 4.4, clicks: 512, share: 0.4375, name: "Level end rewarded", unit_format: "rewarded" }],
  by_mediator: [{ key: "AdMob", ad_revenue: 412.37, impressions: 183240, ecpm: 2.25, clicks: 2210, share: 1 }],
  unconverted: [], ad_units_loaded: 6,
};

// ---- Reward rules -----------------------------------------------------------------------------------------------------
const ruleFields = {
  name: str(undefined, { maxLength: 120 }),
  enabled: bool("A disabled rule is skipped. Default true."),
  app_id: nstr("Only rewards from this app; null matches every app."),
  ad_unit_id: nstr("Only this ad unit. AdMob's callback sends the number after the slash (`5224354917`) and the SDK the full id (`ca-app-pub-…/5224354917`); either form matches. Null or empty matches every ad unit."),
  reward_item: nstr("Only this AdMob reward item (`reward_item`, compared without case). Null or empty matches every item."),
  kind: en(["virtual_currency", "entitlement"], "What the rule grants."),
  currency_code: nstr("The in-app currency to credit (kind `virtual_currency`). It must exist in the project."),
  amount: nint("A fixed amount per reward, 1 to 1,000,000,000 (kind `virtual_currency`)."),
  multiplier: { type: ["number", "null"], description: "Instead of `amount`: the ad network's `reward_amount` times this, rounded, at least 1 (kind `virtual_currency`)." },
  entitlement_id: nstr("The entitlement's lookup key (kind `entitlement`). It must exist in the project."),
  duration_minutes: nint("How long the entitlement lasts, 1 to 525,600 minutes (kind `entitlement`)."),
};
const rule = obj({
  object: en(["ad_reward_rule"]), id: str("Starts with adrr_."), ...ruleFields, position: int("0 is checked first."),
  created_at: ms("Created."), updated_at: nms("Last changed."),
}, ["object", "id", "name", "enabled", "position", "kind"]);
const ruleExample = { object: "ad_reward_rule", id: "adrr_4kq0x1m3zv7a2b", name: "Gems for level-end ads", enabled: true, position: 0, app_id: null, ad_unit_id: "ca-app-pub-3940256099942544/5224354917", reward_item: null, kind: "virtual_currency", currency_code: "GEMS", amount: 10, multiplier: null, entitlement_id: null, duration_minutes: null, created_at: 1790850000000, updated_at: null };
const ruleId = { name: "rule_id", in: "path", required: true, schema: str(), description: "Reward rule id (adrr_...)." };

// ---- Verifications ----------------------------------------------------------------------------------------------------
const reward = {
  oneOf: [
    obj({ type: en(["virtual_currency"]), code: str("In-app currency code."), amount: int("Credited amount, more than 0.") }, ["type", "code", "amount"]),
    obj({ type: en(["entitlement"]), identifier: str("Entitlement lookup key."), expires_at: str("When the access ends, ISO 8601.") }, ["type", "identifier", "expires_at"]),
  ],
};
const verification = obj({
  object: en(["ad_reward_verification"]), id: str("Starts with adrw_."), app_id: nstr(), app_user_id: str("The ad network's `user_id`."),
  client_transaction_id: str("From the SDK's reward verification token."), network: en(["admob", "test"]), network_transaction_id: str("AdMob's `transaction_id`."),
  ad_unit_id: nstr(), impression_id: nstr("From the SDK's token."), reward_item: nstr("AdMob's `reward_item`."), reward_amount: nint("AdMob's `reward_amount`."),
  status: en(["pending", "verified", "failed"], "`pending` while the grant is being made."),
  failure_reason: { type: ["string", "null"], enum: ["missing_user", "grant_failed", null], description: "`missing_user`: the callback had no user id. `grant_failed`: the rule names an in-app currency or entitlement that no longer exists." },
  failure_message: nstr("The failure reason in words."), rule_id: nstr("The rule that matched, or null when none did (verified with nothing granted)."),
  rewards: arr(reward, { description: "What was granted. Empty when no rule matched." }), is_sandbox: bool("Test rewards and Test Store apps are sandbox."),
  occurred_at: ms("When the network says the reward happened."), created_at: ms("Recorded."),
}, ["object", "id", "app_user_id", "client_transaction_id", "network", "status", "rewards"]);
const verificationExample = { object: "ad_reward_verification", id: "adrw_9c2kd81mzq0x4v7a", app_id: "app1a2b3c4d", app_user_id: "user_42", client_transaction_id: "5C1A4F0E-2B7D-4C11-9A3E-0F6B8D2E7A91", network: "admob", network_transaction_id: "18fa792de1bca816048293fc71035638", ad_unit_id: "5224354917", impression_id: "imp_7f3a", reward_item: "coins", reward_amount: 10, status: "verified", failure_reason: null, failure_message: null, rule_id: "adrr_4kq0x1m3zv7a2b", rewards: [{ type: "virtual_currency", code: "GEMS", amount: 10 }], is_sandbox: false, occurred_at: 1790850000000, created_at: 1790850000420 };

// ---- AdMob ------------------------------------------------------------------------------------------------------------
const admob = obj({
  object: en(["admob_connection"]),
  connected: bool("Whether a Google refresh token is saved."),
  oauth_client: { type: ["string", "null"], enum: ["server", "project", null], description: "Which Google OAuth client is used: the server's (`REVENUEDOT_GOOGLE_OAUTH_CLIENT_ID` and `_SECRET`), the project's own, or none yet." },
  client_id: nstr("The project's own OAuth client id, when it saved one."),
  client_secret: obj({ configured: bool(), hint: nstr("The last four characters.") }, ["configured", "hint"]),
  connected_at: nms("When Google sign-in finished."),
  accounts: arr(obj({ id: str("Publisher id (pub-…)."), currency: nstr("The account's reporting currency.") })),
  last_sync_at: nms("Last load of the ad units, successful or not."), last_sync_error: nstr("Why the last load failed."),
  ad_units: arr(obj({ ad_unit_id: str("ca-app-pub-…/…"), name: str(), format: nstr("AdMob's format, lower case (`rewarded`, `banner` ...)."), account_id: str(), app_id: nstr("The AdMob app id."), updated_at: ms("Loaded.") })),
  redirect_uri: str("The redirect URI to add to the Google OAuth client: `<API origin>/v1/ads/admob/oauth/callback`."),
  ssv_callback_url: str("The server-side verification callback URL to paste into each rewarded ad unit: `<API origin>/v1/ads/admob/ssv`."),
}, ["object", "connected", "ad_units", "redirect_uri", "ssv_callback_url"]);
const admobExample = {
  object: "admob_connection", connected: true, oauth_client: "server", client_id: null, client_secret: { configured: false, hint: null }, connected_at: 1790850000000,
  accounts: [{ id: "pub-3940256099942544", currency: "USD" }], last_sync_at: 1790936400000, last_sync_error: null,
  ad_units: [{ ad_unit_id: "ca-app-pub-3940256099942544/5224354917", name: "Level end rewarded", format: "rewarded", account_id: "pub-3940256099942544", app_id: "ca-app-pub-3940256099942544~1458002511", updated_at: 1790936400000 }],
  redirect_uri: "https://api.revenuedot.app/v1/ads/admob/oauth/callback", ssv_callback_url: "https://api.revenuedot.app/v1/ads/admob/ssv",
};

// ---- Apple Search Ads -------------------------------------------------------------------------------------------------
const appleReport = obj({
  object: en(["apple_search_ads_report"]), range: en(RANGES), start_date: str("First UTC day of the period."), currency: en(["USD"]),
  campaigns: arr(obj({
    campaign_id: str("`$appleAdsCampaignId`."), name: nstr("The campaign name, once loaded with the sync."), customers: int("Customers first seen in the period with this campaign."),
    paying_customers: int("Of those, customers with revenue to date."), revenue: num("Their production revenue to date, US dollars, refunds negative."), revenue_per_customer: num(),
  }), { description: "Highest revenue first." }),
  names_loaded: int("Campaign names loaded from Apple."), last_sync_at: nms("Last name sync."), last_sync_error: nstr("Why the last name sync failed."),
}, ["object", "range", "campaigns"]);

export const adsPaths = {
  [`${P}/overview`]: {
    get: v2({ id: "getAdsOverview", summary: "Ads Overview: ad revenue, impressions, eCPM and breakdowns", source: ADS, scopes: CHARTS,
      parameters: [project,
        { name: "range", in: "query", schema: en(RANGES), description: "Default 28d. Periods are UTC days ending today." },
        { name: "environment", in: "query", schema: en(["production", "sandbox"]), description: "Default production." },
        { name: "app_id", in: "query", schema: str(), description: "Only this app's events and purchases." }],
      description: "Totals, the previous period, a daily series and breakdowns by network, format, placement, ad unit and mediator, from the ad events the SDK posts to `POST /v1/events`. Money is US dollars at each day's exchange rate.",
      responses: { 200: ok("The overview.", overview, overviewExample), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/reward_rules`]: {
    get: v2({ id: "listAdRewardRules", summary: "List reward rules in the order they are checked", source: ADS, scopes: READ, parameters: [project],
      responses: { 200: ok("Every rule, first checked first.", listOf(rule)), ...E(404) } }),
    post: v2({ id: "createAdRewardRule", summary: "Create a reward rule", source: ADS, scopes: WRITE, parameters: [project],
      description: "The new rule goes last. A project has at most 200 rules. A currency rule needs `currency_code` and `amount` or `multiplier`; an entitlement rule needs `entitlement_id` and `duration_minutes`.",
      requestBody: body({ ...obj(ruleFields), required: ["name", "kind"] }, { name: "Gems for level-end ads", ad_unit_id: "ca-app-pub-3940256099942544/5224354917", kind: "virtual_currency", currency_code: "GEMS", amount: 10 }),
      responses: { 201: ok("The rule.", rule, ruleExample), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/reward_rules/actions/reorder`]: {
    post: v2({ id: "reorderAdRewardRules", summary: "Reorder reward rules", source: ADS, scopes: WRITE, parameters: [project],
      requestBody: body(obj({ rule_ids: arr(str(), { description: "Every rule id of the project exactly once, in the new order." }) }, ["rule_ids"]), { rule_ids: ["adrr_8m2v0q1x4k7z3a", "adrr_4kq0x1m3zv7a2b"] }),
      responses: { 200: ok("Every rule in the new order.", listOf(rule)), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/reward_rules/{rule_id}`]: {
    post: v2({ id: "updateAdRewardRule", summary: "Update, turn on or turn off a reward rule", source: ADS, scopes: WRITE, parameters: [project, ruleId],
      description: "Send only what changes. Switching `kind` clears the other kind's fields. Rewards already granted stay.",
      requestBody: body(obj(ruleFields), { enabled: false }), responses: { 200: ok("The rule.", rule, { ...ruleExample, enabled: false, updated_at: 1790853600000 }), ...v2Errors(400, 401, 403, 404) } }),
    delete: v2({ id: "deleteAdRewardRule", summary: "Delete a reward rule", source: ADS, scopes: WRITE, parameters: [project, ruleId],
      responses: { 200: ok("Deleted.", obj({ object: en(["ad_reward_rule"]), id: str(), deleted_at: ms("When it was deleted.") }, ["object", "id", "deleted_at"])), ...E(404) } }),
  },
  [`${P}/reward_verifications`]: {
    get: v2({ id: "listAdRewardVerifications", summary: "The rewards ledger", source: ADS, scopes: READ,
      parameters: [project, { name: "status", in: "query", schema: en(["verified", "failed", "pending"]) }, { name: "app_user_id", in: "query", schema: str(), description: "Only this customer's rewards." }, ...page],
      description: "One row per verified callback (and per test reward), newest first, with what it granted.",
      responses: { 200: ok("Verifications.", listOf(verification), { object: "list", items: [verificationExample], next_page: null, url: "/v2/projects/proj1a2b3c4d/ads/reward_verifications" }), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/reward_verifications/test`]: {
    post: v2({ id: "testAdReward", summary: "Send a test reward", source: ADS, scopes: WRITE, parameters: [project],
      description: "Runs the same rules and grants as a verified AdMob callback, without an ad: network `test`, marked sandbox. The currency or access is granted for real. With `client_transaction_id`, the SDK's poll for that id answers with this reward.",
      requestBody: body(obj({
        app_user_id: str("The customer to reward."), app_id: nstr("Match rules for this app."), ad_unit_id: nstr(), reward_item: nstr(), reward_amount: nint("The network amount a multiplier rule multiplies."),
        client_transaction_id: str("Default: a new UUID."),
      }, ["app_user_id"]), { app_user_id: "user_42", reward_item: "coins", reward_amount: 5 }),
      responses: { 201: ok("The verification.", verification, { ...verificationExample, id: "adrw_1x0q8m2v4k7z3abc", network: "test", network_transaction_id: "test_proj1a2b3c4d_8E2F…", ad_unit_id: null, impression_id: null, reward_amount: 5, is_sandbox: true }), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/admob`]: {
    get: v2({ id: "getAdMobConnection", summary: "AdMob connection, loaded ad units and the URLs to paste", source: ADS, scopes: READ, parameters: [project],
      responses: { 200: ok("The connection.", admob, admobExample), ...E(404) } }),
    delete: v2({ id: "disconnectAdMob", summary: "Disconnect AdMob", source: ADS, scopes: WRITE, parameters: [project],
      description: "Deletes the Google tokens and the loaded ad units. Ad revenue from the SDK and rewarded-ad verification keep working.",
      responses: { 200: ok("The connection, now empty.", admob), ...E(404) } }),
  },
  [`${P}/admob/connect`]: {
    post: v2({ id: "connectAdMob", summary: "Start Google sign-in for AdMob", source: ADS, scopes: WRITE, parameters: [project],
      description: "Returns Google's authorization URL (scope `https://www.googleapis.com/auth/admob.readonly`, offline access). Open it in a browser; Google redirects to `/v1/ads/admob/oauth/callback`, which saves the token, loads the ad units and returns to the dashboard. The link works once, for 10 minutes. Without a server OAuth client, send the project's own `client_id` and `client_secret` (422 otherwise).",
      requestBody: body(obj({ client_id: nstr("A Google OAuth client id (…apps.googleusercontent.com). Null removes the project's own client."), client_secret: nstr("Its secret. Leave out to keep the saved one.") }), {}, false),
      responses: { 200: ok("Google's sign-in URL.", obj({ object: en(["admob_authorization"]), url: str() }, ["object", "url"]), { object: "admob_authorization", url: "https://accounts.google.com/o/oauth2/v2/auth?client_id=…&redirect_uri=https%3A%2F%2Fapi.revenuedot.app%2Fv1%2Fads%2Fadmob%2Foauth%2Fcallback&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fadmob.readonly&access_type=offline&prompt=consent&include_granted_scopes=true&state=…" }), ...v2Errors(400, 401, 403, 404, 422, 502) } }),
  },
  [`${P}/admob/refresh`]: {
    post: v2({ id: "refreshAdMob", summary: "Load AdMob ad units now", source: ADS, scopes: WRITE, parameters: [project],
      description: "Replaces the loaded ad units with the account's current list (up to 5,000). RevenueDot also does this once a day.",
      responses: { 200: ok("The connection.", admob, admobExample), ...v2Errors(401, 403, 404, 502) } }),
  },
  [`${P}/apple_search_ads/report`]: {
    get: v2({ id: "getAppleSearchAdsReport", summary: "Customers and revenue by Apple Search Ads campaign", source: ADS, scopes: CHARTS,
      parameters: [project, { name: "range", in: "query", schema: en(RANGES), description: "Default 90d. Customers first seen in this period." }],
      description: "Customers first seen in the period whose `$appleAdsCampaignId` is set (from the SDK's AdServices token), grouped by campaign, with paying customers and production revenue to date.",
      responses: { 200: ok("The report.", appleReport, { object: "apple_search_ads_report", range: "90d", start_date: "2026-07-04", currency: "USD", campaigns: [{ campaign_id: "1234567890", name: "Brand US", customers: 412, paying_customers: 38, revenue: 1204.55, revenue_per_customer: 2.92 }], names_loaded: 12, last_sync_at: 1790850000000, last_sync_error: null }), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/apple_search_ads/sync`]: {
    post: v2({ id: "syncAppleSearchAdsNames", summary: "Load campaign names from Apple Search Ads", source: ADS, scopes: WRITE, parameters: [project],
      description: "Signs in as the Apple Search Ads API user saved on the project's `apple_search_ads` integration (organization ID, client ID, team ID, key ID, private key) and loads campaign and ad group names from the Campaign Management API v5 (up to 200 campaigns). 422 with Apple's message when the credentials are missing or refused.",
      responses: { 200: ok("How many campaigns were named.", obj({ object: en(["apple_search_ads_sync"]), campaigns: int() }, ["object", "campaigns"]), { object: "apple_search_ads_sync", campaigns: 12 }), ...v2Errors(401, 403, 404, 422) } }),
  },
  "/v1/ads/admob/ssv": {
    get: op({ id: "admobSsvCallback", tag: "Ads", summary: "AdMob server-side verification callback", security: NONE, source: PUB, extension: true,
      parameters: ["ad_unit", "custom_data", "key_id", "reward_amount", "reward_item", "signature", "timestamp", "transaction_id", "user_id"].map((name) => ({ name, in: "query", schema: str() })),
      description: `
The URL to paste into each rewarded ad unit's server-side verification settings in AdMob. Google calls it with a signed query (\`ad_network\`, \`ad_unit\`, \`custom_data\`, \`key_id\`, \`reward_amount\`, \`reward_item\`, \`signature\`, \`timestamp\`, \`transaction_id\`, \`user_id\`; [AdMob SSV](https://developers.google.com/admob/android/ssv)); RevenueDot checks the ECDSA signature with Google's published keys, finds the project from the app key in \`custom_data\` (the SDK's reward verification token), records the reward once per AdMob \`transaction_id\` and grants what the first matching reward rule says.

- **200** \`{"ok":true,"recorded":true}\`: recorded (or already recorded). Also 200 with no parameters (AdMob's **Verify URL** button), and 200 \`{"ok":true,"recorded":false,"reason":"invalid_custom_data"}\` or \`"unknown_api_key"\` when \`custom_data\` is not a RevenueDot token, so Google stops retrying.
- **400:** the query has no \`signature\` and \`key_id\`. **403:** the signature is not valid or the key id is unknown; nothing is recorded.
- **503:** Google's keys could not be fetched. Google retries callbacks that do not answer 200.`,
      responses: {
        200: ok("Recorded, or nothing to record.", obj({ ok: bool(), recorded: bool(), reason: str() }), { ok: true, recorded: true }),
        400: ok("Not an AdMob callback.", obj({ error: str() }), { error: "Expected AdMob's signed callback (signature and key_id last)." }),
        403: ok("Bad signature.", obj({ error: str() }), { error: "The signature is not valid." }),
        503: ok("Google's keys are unavailable.", obj({ error: str() }), { error: "Google's verifier keys are unavailable; retry later." }),
      } }),
  },
  "/v1/ads/admob/oauth/callback": {
    get: op({ id: "admobOAuthCallback", tag: "Ads", summary: "Google's redirect after AdMob sign-in", security: NONE, source: PUB, extension: true,
      parameters: [{ name: "code", in: "query", schema: str() }, { name: "state", in: "query", schema: str(), description: "From `connectAdMob`; single use, valid 10 minutes." }, { name: "error", in: "query", schema: str(), description: "`access_denied` when the user cancelled." }],
      description: "Add `<API origin>/v1/ads/admob/oauth/callback` as an authorized redirect URI of the Google OAuth client. RevenueDot exchanges the code for a refresh token (stored encrypted), loads the ad units and redirects to the project's AdMob page with `connected=1`, or with `admob_error=<message>`.",
      responses: { 302: { description: "To the dashboard's AdMob page." } } }),
  },
};

/** REST v2 operations here are RevenueDot extensions, open to secret keys and dashboard sessions. */
function v2(o) { return op({ ...o, tag: "Ads", security: SECRET, extension: true }); }

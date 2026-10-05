// RevenueDot: the open-source RevenueCat alternative. Same SDK API, free to start on RevenueDot Cloud.
// This file: in-app currencies, customer transfer, Customer Center, StoreKit configuration, audit log and revenue in the OpenAPI document.
// Docs: https://revenuedot.app/docs/api/rest-v2   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { SECRET, arr, body, bool, en, int, listOf, ms, nstr, obj, ok, op, param, ref, str, v2Errors, num } from "./common.mjs";

const P = "/v2/projects/{project_id}";
const project = param("ProjectId");
const customer = param("CustomerId");
const page = [param("Limit"), param("StartingAfter")];
const E = (...c) => v2Errors(401, 403, ...c);
const list = (schema, description = "A page of results.", example) => ok(description, listOf(schema), example);
const code = { name: "virtual_currency_code", in: "path", required: true, schema: str(), description: "The currency code, such as GLD." };
const includeEmpty = { name: "include_empty_balances", in: "query", schema: bool(), description: "Also list currencies with a zero balance." };
const idempotency = { name: "Idempotency-Key", in: "header", schema: str(), description: "Repeating a request with the same key changes nothing the second time." };

const grantIn = obj({
  product_ids: arr(str(), { minItems: 1 }), amount: int("Credited per purchase or renewal.", { minimum: 1 }),
  trial_amount: { type: ["integer", "null"], minimum: 0, description: "Credited when a free trial starts. Default 0." }, expire_at_cycle_end: { type: ["boolean", "null"] },
}, ["product_ids", "amount"]);
const currency = obj({
  object: en(["virtual_currency"]), project_id: str(), code: str(), name: str(), description: nstr(), state: en(["active", "inactive"]), created_at: ms("When it was created."),
  product_grants: arr(obj({ object: en(["virtual_currency.product_grant"]), product_ids: arr(str()), amount: int(), trial_amount: int(), expire_at_cycle_end: bool() }, ["object", "product_ids", "amount"])),
}, ["object", "project_id", "code", "name", "state", "created_at"]);
const balance = obj({ object: en(["virtual_currency_balance"]), currency_code: str(), balance: int(), name: str(), description: str() }, ["object", "currency_code", "balance"]);
const currencyExample = { object: "virtual_currency", project_id: "proj18pzzkao", code: "GLD", name: "Gold", description: null, state: "active", created_at: 1790800901115, product_grants: [{ object: "virtual_currency.product_grant", product_ids: ["prod6n3k1a8w2z"], amount: 100, trial_amount: 0, expire_at_cycle_end: false }] };
const balancesExample = { object: "list", items: [{ object: "virtual_currency_balance", currency_code: "GLD", balance: 100, name: "Gold" }], next_page: null, url: "/v2/projects/proj18pzzkao/customers/user_1/virtual_currencies" };
const adjustments = body(obj({ adjustments: { type: "object", additionalProperties: int(), description: "Signed change per currency code. A balance cannot go below zero." }, reference: nstr("Your own note, kept in the ledger.") }, ["adjustments"]), { adjustments: { GLD: -20 }, reference: "level 3 unlock" });
const VC = "routes/v2/virtual-currencies.ts";
const EX = "routes/v2/customer-extras.ts";

export const v2MorePaths = {
  [`${P}/virtual_currencies`]: {
    get: op({ id: "listVirtualCurrencies", tag: "In-app currencies", summary: "List in-app currencies", security: SECRET, source: VC, scopes: ["project_configuration:virtual_currencies:read"], parameters: [project, ...page],
      responses: { 200: list(currency, "A page of currencies.", { object: "list", items: [currencyExample], next_page: null, url: `${P}/virtual_currencies` }), ...E(404) } }),
    post: op({ id: "createVirtualCurrency", tag: "In-app currencies", summary: "Create an in-app currency", security: SECRET, source: VC, scopes: ["project_configuration:virtual_currencies:read_write"], parameters: [project],
      description: "A product grant credits the balance each time a purchase, renewal or trial start of one of its products is recorded, once per store transaction.",
      requestBody: body(obj({ code: str("Letters, digits and underscores, up to 10.", { minLength: 1, maxLength: 10, pattern: "^[a-zA-Z0-9_]+$" }), name: str(undefined, { minLength: 1, maxLength: 50 }), description: nstr(), product_grants: { type: ["array", "null"], items: grantIn } }, ["code", "name"]),
        { code: "GLD", name: "Gold", product_grants: [{ product_ids: ["prod6n3k1a8w2z"], amount: 100 }] }),
      responses: { 201: ok("The currency.", currency, currencyExample), ...v2Errors(400, 401, 403, 404, 409) } }),
  },
  [`${P}/virtual_currencies/{virtual_currency_code}`]: {
    get: op({ id: "getVirtualCurrency", tag: "In-app currencies", summary: "Get an in-app currency", security: SECRET, source: VC, scopes: ["project_configuration:virtual_currencies:read"], parameters: [project, code],
      responses: { 200: ok("The currency.", currency, currencyExample), ...E(404) } }),
    post: op({ id: "updateVirtualCurrency", tag: "In-app currencies", summary: "Update an in-app currency", security: SECRET, source: VC, scopes: ["project_configuration:virtual_currencies:read_write"], parameters: [project, code],
      requestBody: body(obj({ name: str(undefined, { minLength: 1, maxLength: 50 }), description: nstr(), product_grants: { type: ["array", "null"], items: grantIn } }), { name: "Gold coins" }),
      responses: { 200: ok("The currency.", currency, currencyExample), ...v2Errors(400, 401, 403, 404) } }),
    delete: op({ id: "deleteVirtualCurrency", tag: "In-app currencies", summary: "Delete an in-app currency", security: SECRET, source: VC, scopes: ["project_configuration:virtual_currencies:read_write"], parameters: [project, code],
      description: "Also deletes every customer's balance of it and its ledger.", responses: { 200: ok("Deleted.", ref("Deleted"), { object: "virtual_currency", id: "GLD", deleted_at: 1790801342625 }), ...E(404) } }),
  },
  [`${P}/virtual_currencies/{virtual_currency_code}/actions/archive`]: {
    post: op({ id: "archiveVirtualCurrency", tag: "In-app currencies", summary: "Archive an in-app currency", security: SECRET, source: VC, scopes: ["project_configuration:virtual_currencies:read_write"], parameters: [project, code],
      description: "An archived currency stops granting; customers keep a non-zero balance.", responses: { 200: ok("The currency.", currency, currencyExample), ...E(404) } }),
  },
  [`${P}/virtual_currencies/{virtual_currency_code}/actions/unarchive`]: {
    post: op({ id: "unarchiveVirtualCurrency", tag: "In-app currencies", summary: "Unarchive an in-app currency", security: SECRET, source: VC, scopes: ["project_configuration:virtual_currencies:read_write"], parameters: [project, code],
      responses: { 200: ok("The currency.", currency, currencyExample), ...E(404) } }),
  },
  [`${P}/customers/{customer_id}/virtual_currencies`]: {
    get: op({ id: "listCustomerVirtualCurrencies", tag: "In-app currencies", summary: "List a customer's balances", security: SECRET, source: VC, scopes: ["customer_information:purchases:read"], parameters: [project, customer, includeEmpty, ...page],
      responses: { 200: list(balance, "Balances.", balancesExample), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/customers/{customer_id}/virtual_currencies/transactions`]: {
    post: op({ id: "createVirtualCurrencyTransaction", tag: "In-app currencies", summary: "Credit or spend in-app currency", security: SECRET, source: VC, scopes: ["customer_information:purchases:read_write"], parameters: [project, customer, includeEmpty, idempotency],
      description: "Adds a ledger entry per currency. Send an `Idempotency-Key` so a retry does not apply twice. Nothing is applied if any balance would go below zero.",
      requestBody: adjustments, responses: { 200: list(balance, "The balances after the change.", balancesExample), ...v2Errors(400, 401, 403, 404, 422) } }),
  },
  [`${P}/customers/{customer_id}/virtual_currencies/update_balance`]: {
    post: op({ id: "updateVirtualCurrencyBalance", tag: "In-app currencies", summary: "Change a balance without a ledger entry", security: SECRET, source: VC, scopes: ["customer_information:purchases:read_write"], parameters: [project, customer, includeEmpty, idempotency],
      requestBody: adjustments, responses: { 200: list(balance, "The balances after the change.", balancesExample), ...v2Errors(400, 401, 403, 404, 422) } }),
  },
  [`${P}/customers/{customer_id}/actions/transfer`]: {
    post: op({ id: "transferCustomerData", tag: "Customers", summary: "Transfer a customer's purchases to another customer", security: SECRET, source: EX, scopes: ["customer_information:customers:read_write", "customer_information:subscriptions:read_write", "customer_information:purchases:read_write"], parameters: [project, customer],
      description: "Moves subscriptions, one-time purchases and their transactions, optionally only those of the listed apps, and records a `TRANSFER` event. The target customer is created if it does not exist.",
      requestBody: body(obj({ target_customer_id: str(), app_ids: { type: ["array", "null"], items: str() } }, ["target_customer_id"]), { target_customer_id: "user_2" }),
      responses: { 200: ok("Both customers after the transfer.", obj({ source_customer: ref("Customer"), target_customer: ref("Customer") }, ["source_customer", "target_customer"])), ...v2Errors(400, 401, 403, 404, 422) } }),
  },
  [`${P}/customers/{customer_id}/customer_center`]: {
    get: op({ id: "getCustomerCenterConfig", tag: "Customers", summary: "Get the Customer Center configuration", security: SECRET, source: EX, scopes: ["customer_information:customers:read"],
      parameters: [project, customer, { name: "platform", in: "query", schema: en(["ios", "android", "macos", "web", "amazon"]) }, { name: "locale", in: "query", schema: str() }],
      responses: { 200: ok("The configuration.", obj({ object: en(["customer_center_config"]), customer_center: { type: "object", additionalProperties: true } }, ["object", "customer_center"])), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/customer_center_config`]: {
    get: op({ id: "getCustomerCenterConfigSettings", tag: "Project settings", summary: "Get the Customer Center configuration of the project", security: SECRET, source: EX, extension: true, scopes: ["project_configuration:projects:read"],
      parameters: [project, { name: "locale", in: "query", description: "Build `customer_center` for this device locale (for example `de_DE`), as the SDK's X-Preferred-Locales header does. English when omitted.", schema: str() }],
      description: "Three views of the configuration: `customer_center` is what the SDK receives (Retention offers resolved, editor-only fields removed); `config` is the editable document, the default with the stored overrides merged in (what the dashboard editor shows); `overrides` is what is stored (null when none).",
      responses: { 200: ok("The configuration.", obj({ object: en(["customer_center_config"]), customer_center: { type: "object", additionalProperties: true }, config: { type: "object", additionalProperties: true }, overrides: { type: ["object", "null"], additionalProperties: true } }, ["object", "customer_center", "config", "overrides"])), ...E(404) } }),
    post: op({ id: "setCustomerCenterConfig", tag: "Project settings", summary: "Set the Customer Center configuration", security: SECRET, source: EX, extension: true, scopes: ["project_configuration:projects:read_write"], parameters: [project],
      description: "Stores the configuration, merged key by key over the built-in default (lists such as `paths` replace). Send `null` to go back to the default. The SDK's shape plus editor fields: each screen's ordered `paths` (MISSING_PURCHASE, REFUND_REQUEST, CHANGE_PLANS, CANCEL, CUSTOM_URL with `url` and `open_method`, CUSTOM_ACTION with `action_identifier`); a `feedback_survey` on CANCEL; a `promotional_offer` on CANCEL, REFUND_REQUEST and survey options, either an offer of its own (`title`, `subtitle`, `product_mapping`) or `{ \"retention_offer_id\": \"...\" }` pointing at a Retention offer, or `null` for no offer; `appearance.light` and `.dark` hex colours; `title_localizations` / `subtitle_localizations` per language; `localization.custom_strings` per language. The merged result is validated as a whole; a 400 names each field that is wrong. Custom URLs cannot use `javascript:`, `data:` or `file:`, and the document can be at most 1 MB.",
      requestBody: body(obj({ customer_center: { type: ["object", "null"], additionalProperties: true } }, ["customer_center"]), { customer_center: { support: { email: "help@example.com" }, screens: { MANAGEMENT: { type: "MANAGEMENT", title: "How can we help?", paths: [{ id: "path_help", type: "CUSTOM_URL", title: "Help center", url: "https://example.com/help", open_method: "IN_APP" }, { id: "path_cancel", type: "CANCEL", title: "Cancel subscription", promotional_offer: { retention_offer_id: "rto_123" } }] } }, appearance: { light: { accent_color: "#F4A900" } }, localization: { custom_strings: { de: { contact_support: "Schreib uns" } } } } }),
      responses: { 200: ok("The saved configuration.", obj({ object: en(["customer_center_config"]), customer_center: { type: "object", additionalProperties: true }, config: { type: "object", additionalProperties: true }, overrides: { type: ["object", "null"], additionalProperties: true } }, ["object", "customer_center", "config", "overrides"])), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/apps/{app_id}/store_kit_config`]: {
    get: op({ id: "getStoreKitConfig", tag: "Apps", summary: "Get a StoreKit configuration file", security: SECRET, source: EX, scopes: ["project_configuration:apps:read"], parameters: [project, param("AppId")],
      description: "A `.storekit` file for the products of an App Store app, to test purchases locally in Xcode. Prices come from the Test Store price when set, else 0.99.",
      responses: { 200: ok("The file contents.", obj({ object: en(["store_kit_config_file"]), contents: { type: "object", additionalProperties: true } }, ["object", "contents"])), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/subscriptions/{subscription_id}/authenticated_management_url`]: {
    get: op({ id: "getSubscriptionManagementUrl", tag: "Subscriptions", summary: "Get where the customer manages a subscription", security: SECRET, source: EX, scopes: ["customer_information:subscriptions:read"], parameters: [project, { name: "subscription_id", in: "path", required: true, schema: str() }],
      description: "The App Store subscriptions page or the Google Play page for the subscription. Null for stores without one.",
      responses: { 200: ok("The URL.", obj({ object: en(["authenticated_management_url"]), management_url: nstr() }, ["object", "management_url"]), { object: "authenticated_management_url", management_url: "https://apps.apple.com/account/subscriptions" }), ...E(404) } }),
  },
  [`${P}/metrics/revenue`]: {
    get: op({ id: "getRevenueMetric", tag: "Metrics", summary: "Revenue over a date range", security: SECRET, source: "routes/v2/metrics.ts", scopes: ["charts_metrics:overview:read"],
      parameters: [project, { name: "start_date", in: "query", required: true, schema: str("", { format: "date" }) }, { name: "end_date", in: "query", required: true, schema: str("", { format: "date" }), description: "Inclusive." },
        { name: "currency", in: "query", schema: str(), description: "Only USD for now." }, { name: "revenue_type", in: "query", schema: en(["revenue", "revenue_net_of_taxes", "proceeds"]), description: "Proceeds subtract the estimated store commission. We hold no tax data, so net of taxes equals revenue." }],
      description: "Production revenue from the transaction ledger, in USD at the purchase-date rate.",
      responses: { 200: ok("The total.", obj({ object: en(["revenue_metric"]), start_date: str(), end_date: str(), currency: str(), value: num(), revenue_type: en(["revenue", "revenue_net_of_taxes", "proceeds"]) }, ["object", "start_date", "end_date", "currency", "value", "revenue_type"]), { object: "revenue_metric", start_date: "2026-09-01", end_date: "2026-09-30", currency: "USD", value: 12345.67, revenue_type: "revenue" }), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/audit_logs`]: {
    get: op({ id: "listAuditLogs", tag: "Audit log", summary: "List audit log entries", security: SECRET, source: "routes/v2/audit.ts", scopes: ["project_configuration:audit_logs:read"],
      parameters: [project, ...page, { name: "start_date", in: "query", schema: str("", { format: "date" }) }, { name: "end_date", in: "query", schema: str("", { format: "date" }), description: "Inclusive." }],
      description: "Who changed what, newest first. Every successful write through API v2 is recorded with the actor (a user, a secret key, or an OAuth client). Reads and request bodies are never recorded.",
      responses: { 200: list(obj({ object: en(["audit_log"]), id: str(), project_id: str(), action_type: str(), target_type: str(), target_identifier: str(), actor_type: en(["user", "system", "api_key", "oauth_client", "service_account"]), actor_identifier: str(), occurred_at: ms("When it happened."), additional_data: { type: "object", additionalProperties: true } }, ["object", "id", "project_id", "action_type", "target_type", "target_identifier", "actor_type", "actor_identifier", "occurred_at", "additional_data"]),
        "A page of entries.", { object: "list", items: [{ object: "audit_log", id: "log1ab2c3d4e5", project_id: "proj18pzzkao", action_type: "entitlement_created", target_type: "entitlement", target_identifier: "entl1v0bp6r0qs", actor_type: "api_key", actor_identifier: "key_08ec817fce", occurred_at: 1790801342634, additional_data: { method: "POST", status: 201 } }], next_page: null, url: `${P}/audit_logs` }), ...v2Errors(400, 401, 403, 404) } }),
  },
};

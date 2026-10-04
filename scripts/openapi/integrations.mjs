// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: third-party integrations (every entry of RevenueCat's integration catalogue plus BigQuery) and scheduled data
// exports (S3, R2, Google Cloud Storage, Azure Blob Storage, email) in the OpenAPI document. RevenueDot extensions.
// Docs: https://revenuedot.app/docs/guides/integrations   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { NONE, SECRET, arr, body, bool, en, int, listOf, ms, nint, nms, nstr, obj, ok, op, param, str, v2Errors } from "./common.mjs";

const P = "/v2/projects/{project_id}/integrations";
const project = param("ProjectId");
const page = [param("Limit"), param("StartingAfter")];
const E = (...c) => v2Errors(401, 403, ...c);
const RI = "routes/v2/partner-integrations.ts", RX = "routes/v2/data-exports.ts", RD = "routes/data-export-download.ts";
const READ = ["project_configuration:integrations:read"], WRITE = ["project_configuration:integrations:read_write"];
const id = { name: "integration_id", in: "path", required: true, schema: str(), description: "Integration id (intg_...)." };
const exportId = { name: "export_id", in: "path", required: true, schema: str(), description: "Export id (export_...)." };
const TYPES = [
  "slack", "segment", "amplitude", "mixpanel", "posthog", "firebase", "bigquery", "appsflyer", "adjust", "meta",
  "mparticle", "statsig", "superwall", "telemetrydeck",
  "apple_search_ads", "appstack", "asapty", "branch", "google_tag_manager", "kochava", "airbridge", "splitmetrics", "singular", "solarengine", "tenjin",
  "airship", "braze", "clevertap", "customerio", "discord", "intercom", "iterable", "onesignal",
  "admob", "intercom_inbox", "zendesk",
];
const STEPS = ["initial_purchase", "trial_started", "trial_converted", "trial_cancelled", "renewal", "cancellation", "uncancellation", "non_subscription_purchase", "subscription_paused", "expiration", "billing_issue", "product_change", "transfer", "purchase_redeemed", "experiment_enrollment", "refund_reversed", "test", "funnel_viewed", "funnel_step_completed", "funnel_purchase", "paywall_impression", "paywall_close", "paywall_cancel", "paywall_exit_offer", "paywall_component_interacted", "paywall_purchase_initiated", "paywall_purchase_error"];
const hint = obj({ configured: bool(), hint: nstr("The last four characters, or a service account's client_email.") }, ["configured", "hint"]);

const field = obj({
  key: str(), label: str(), type: en(["text", "secret", "select", "boolean", "textarea", "tokens"]), required: bool(), hint: str(), placeholder: str(),
  options: arr(obj({ value: str(), label: str() })), when: obj({ key: str(), value: str() }, [], { description: "Shown only when another field has this value." }),
  url: bool("The value is a URL RevenueDot calls. It is checked when saved (https only on RevenueDot Cloud) and again before each send."),
}, ["key", "label", "type"]);
const integrationType = obj({
  object: en(["integration_type"]), type: en(TYPES), name: str(), category: en(["core", "analytics", "attribution", "marketing", "ads", "support"]), description: str(),
  default_environment: { type: ["string", "null"], enum: ["production", null] }, event_names: bool("Whether event names can be overridden."), fields: arr(field), docs_url: str(),
  api: en(["documented", "webhook"], "`documented`: RevenueDot sends the partner's published API request. `webhook`: the partner publishes no event API; RevenueDot POSTs RevenueCat's webhook body to the URL the partner gives you (Superwall, Appstack, SplitMetrics Acquire, SolarEngine)."),
  connection: bool("True for AdMob, Apple Search Ads, the Intercom inbox and Zendesk: they receive no events and have their own page in the dashboard."),
}, ["object", "type", "name", "fields", "api", "connection"]);
const integration = obj({
  object: en(["integration"]), id: str(), project_id: str(), type: en(TYPES), name: str(), enabled: bool(), environment: { type: ["string", "null"], enum: ["production", "sandbox", null], description: "Null sends both." },
  app_id: nstr("Only this app's events; null for all."), event_types: arr(str(), { description: "Lower-case webhook event types; empty for all the integration sends. Opt-in types (`subscriber_alias`, the funnel types and the paywall types) are sent only when named here. Paywall types add to the other events and never narrow the filter; any other named type narrows it." }),
  settings: { type: "object", additionalProperties: true, description: "The non-secret settings." },
  secrets: { type: "object", additionalProperties: hint, description: "Each secret field: whether it is saved, and its hint. Secrets are never returned." },
  event_names: { type: "object", additionalProperties: str(), description: "Step → event name overrides." },
  status: obj({ last_delivered_at: nms("Last successful delivery."), last_error: nstr(), consecutive_failures: int("Delivery attempts in a row that failed, retries included. 0 after any success."), failed_deliveries_in_row: int("Deliveries in a row that ended failed (no retry left, or an error a retry cannot fix). 0 after any success; 10 or more sends an alert email to the project's admins.") }),
  created_at: ms("Created."), updated_at: nms("Last changed."),
}, ["object", "id", "type", "name", "enabled", "settings", "secrets"]);
const delivery = obj({
  object: en(["integration_delivery"]), id: str(), integration_id: str(), event_id: str(), event_type: str("Upper-case webhook event type."),
  status: en(["pending", "delivered", "failed", "skipped"]), attempts: int(), sent_as: nstr("The name the partner received (an event name, an Adjust token or a Slack step)."),
  next_attempt_at: nms("Next attempt, while pending."), request: nstr("Method and URL of each request, credentials replaced by [redacted]."),
  request_body: nstr("The request bodies with credentials replaced by [redacted]; first 4,000 characters."), response_status: nint(), response_ms: nint(),
  response_body: nstr("The first 1,000 characters of the partner's answer."), last_error: nstr("Why it failed or was skipped."), created_at: ms("Queued."),
}, ["object", "id", "integration_id", "event_id", "event_type", "status", "attempts"]);
const settingsIn = { type: "object", additionalProperties: true, description: "Every field of the integration's catalogue entry, secrets included. On update, a missing secret keeps its saved value; null removes it." };
const integrationIn = obj({
  type: en(TYPES), name: str(), enabled: bool(), environment: { type: ["string", "null"], enum: ["production", "sandbox", null] }, app_id: nstr(),
  event_types: arr(str()), settings: settingsIn, event_names: { type: "object", additionalProperties: str(), propertyNames: { enum: STEPS } },
});

const config = obj({ bucket: str(), prefix: nstr(), region: nstr("S3 region (default us-east-1)."), endpoint: nstr("S3-compatible endpoint (MinIO and the like)."), account_id: nstr("Cloudflare account id (R2)."), access_key_id: nstr("S3, R2 or GCS HMAC access key id."),
  credential_type: { type: ["string", "null"], enum: ["service_account", "hmac", null], description: "GCS only: a service account JSON key (default) or an HMAC key." },
  recipients: { type: ["array", "null"], items: str(), maxItems: 25, description: "Email only: up to 25 addresses, each a member of the project." },
  subject_prefix: nstr("Email only: put before the email subject (up to 200 characters)."),
}, [], { description: "`bucket` is the container for Azure. Email exports have no bucket." });
const columns = { type: "object", additionalProperties: arr(str()), description: "Table → the columns to write, in the catalog's order (see List export columns). A table left out, or an empty list, gets every column, columns added later included." };
const exportOut = obj({
  object: en(["data_export"]), id: str(), project_id: str(), name: str(), enabled: bool(), destination: en(["s3", "r2", "gcs", "azure", "email"]), config,
  credentials: { type: "object", additionalProperties: hint, description: "`secret_access_key` (S3, R2, GCS with an HMAC key), `service_account_json` (GCS with a service account) or `connection_string` (Azure): whether it is saved, and its hint. Empty for email." },
  format: en(["csv", "parquet"]), compression: en(["gzip", "none"], "CSV only."), schedule: en(["daily", "weekly", "interval"]), hour_utc: int(undefined, { minimum: 0, maximum: 23 }),
  weekday: nint("0 = Sunday; weekly only."), interval_hours: nint("4, 6, 8 or 12; schedule interval only. Runs at hour_utc and every interval from it."), mode: en(["incremental", "full"]), tables: arr(en(["transactions", "customers", "subscriptions", "events", "paywall_events"])), columns,
  environment: { type: ["string", "null"], enum: ["production", "sandbox", null] }, next_run_at: nms("Next scheduled run."), last_run_at: nms("Last successful run."),
  last_error: nstr(), consecutive_failures: int(), created_at: ms("Created."), updated_at: nms("Last changed."),
}, ["object", "id", "name", "destination", "format", "schedule", "mode", "tables"]);
const exportIn = obj({
  name: str(), enabled: bool(), destination: en(["s3", "r2", "gcs", "azure", "email"]), config,
  credentials: obj({ secret_access_key: nstr(), service_account_json: nstr("The service account's JSON key as a string."), connection_string: nstr("Azure: the storage account's connection string (account key or shared access signature).") }),
  format: en(["csv", "parquet"]), compression: en(["gzip", "none"]), schedule: en(["daily", "weekly", "interval"]), hour_utc: int(), weekday: nint(), interval_hours: nint("4, 6, 8 or 12."), mode: en(["incremental", "full"]),
  tables: arr(en(["transactions", "customers", "subscriptions", "events", "paywall_events"])), columns, environment: { type: ["string", "null"], enum: ["production", "sandbox", null] },
});
const run = obj({
  object: en(["data_export_run"]), id: str(), export_id: str(), status: en(["queued", "running", "succeeded", "failed"]), trigger: en(["schedule", "manual"]), mode: en(["incremental", "full"]),
  window_start: nms("Rows changed after this (null: everything)."), window_end: ms("Rows changed up to this."), attempts: int(), next_attempt_at: nms("Retry time, while queued."),
  files: arr(obj({ table: str(), key: str("Object key in the bucket."), rows: int(), bytes: int() })), rows: int(), bytes: int(), error: nstr(),
  started_at: nms("Started."), finished_at: nms("Finished."), created_at: ms("Queued."),
}, ["object", "id", "export_id", "status", "trigger", "mode", "window_end", "files"]);
const deleted = (object) => ok("Deleted.", obj({ object: en([object]), id: str(), deleted_at: ms("When it was deleted.") }, ["object", "id", "deleted_at"]));

const exampleIntegration = { object: "integration", id: "intg_8f2kq0x1m3zv7a", project_id: "proj1a2b3c4d", type: "amplitude", name: "Amplitude", enabled: true, environment: null, app_id: null, event_types: [], settings: { region: "us" }, secrets: { api_key: { configured: true, hint: "••••9f3a" }, sandbox_api_key: { configured: false, hint: null } }, event_names: {}, status: { last_delivered_at: null, last_error: null, consecutive_failures: 0, failed_deliveries_in_row: 0 }, created_at: 1790850000000, updated_at: 1790850000000 };

export const integrationPaths = {
  [`${P}/catalog`]: {
    get: op2({ id: "listIntegrationTypes", tag: "Integrations", summary: "What each integration needs", source: RI, scopes: READ, parameters: [project],
      description: "The fields each integration takes (keys, labels, types, options), its default environment, how RevenueDot reaches the partner (`api`), whether it is a connection without events, and its setup guide. The dashboard draws its forms from this. 36 entries: every tool of RevenueCat's integration catalogue plus BigQuery.",
      responses: { 200: ok("Every integration type.", listOf(integrationType), { object: "list", items: [
        { object: "integration_type", type: "statsig", name: "Statsig", category: "analytics", description: "Send subscription events and revenue to Statsig to measure experiments and feature gates by what customers pay.", default_environment: null, event_names: true,
          fields: [{ key: "server_secret", label: "Server secret key", type: "secret", required: true, placeholder: "secret-…", hint: "In Statsig, Settings → Keys & Environments → Server Secret Key." }, { key: "reporting", label: "Sales reporting", type: "select", options: [{ value: "gross", label: "Gross revenue" }, { value: "proceeds", label: "After store commission and taxes" }], hint: "Revenue is sent in US dollars." }],
          docs_url: "https://revenuedot.app/docs/guides/integrations#statsig", api: "documented", connection: false },
        { object: "integration_type", type: "superwall", name: "Superwall", category: "analytics", description: "Send subscription events and revenue to Superwall so paywall reports show what each paywall earned.", default_environment: null, event_names: false,
          fields: [{ key: "webhook_url", label: "Superwall webhook URL", type: "secret", required: true, url: true }, { key: "authorization", label: "Authorization header value", type: "secret" }],
          docs_url: "https://revenuedot.app/docs/guides/integrations#superwall", api: "webhook", connection: false },
      ], next_page: null, url: "/v2/projects/proj1a2b3c4d/integrations/catalog" }), ...E(404) } }),
  },
  [`${P}/partners`]: {
    get: op2({ id: "listIntegrations", tag: "Integrations", summary: "List integrations", source: RI, scopes: READ, parameters: [project, { name: "type", in: "query", schema: en(TYPES) }, ...page], responses: { 200: ok("The project's integrations.", listOf(integration)), ...v2Errors(400, 401, 403, 404) } }),
    post: op2({ id: "createIntegration", tag: "Integrations", summary: "Connect an integration", source: RI, scopes: WRITE, parameters: [project],
      description: "Every event webhooks get is also sent to each enabled integration whose filters match, with the webhook retry schedule (5, 10, 20, 40, 80 minutes). Secrets are encrypted at rest and never returned. The connections are saved here too: `apple_search_ads` with an Apple Search Ads API user (for campaign names), `intercom_inbox` with the Intercom app's `client_secret`, and `zendesk` with no settings (it marks the sidebar app as installed). AdMob connects through `POST /v2/projects/{project_id}/ads/admob/connect`.",
      requestBody: body({ ...integrationIn, required: ["type"] }, { type: "amplitude", environment: null, settings: { api_key: "<amplitude api key>", region: "us" } }),
      responses: { 201: ok("The integration.", integration, exampleIntegration), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/partners/{integration_id}`]: {
    get: op2({ id: "getIntegration", tag: "Integrations", summary: "Get an integration", source: RI, scopes: READ, parameters: [project, id], responses: { 200: ok("The integration.", integration), ...E(404) } }),
    post: op2({ id: "updateIntegration", tag: "Integrations", summary: "Update, enable or disable an integration", source: RI, scopes: WRITE, parameters: [project, id],
      description: "`enabled: false` stops new deliveries; failed ones wait until it is on again.",
      requestBody: body(integrationIn, { enabled: false }), responses: { 200: ok("The integration.", integration), ...v2Errors(400, 401, 403, 404) } }),
    delete: op2({ id: "deleteIntegration", tag: "Integrations", summary: "Disconnect an integration", source: RI, scopes: WRITE, parameters: [project, id], description: "Its delivery log goes with it.", responses: { 200: deleted("integration"), ...E(404) } }),
  },
  [`${P}/partners/{integration_id}/test`]: {
    post: op2({ id: "testIntegration", tag: "Integrations", summary: "Send a TEST event to one integration", source: RI, scopes: WRITE, parameters: [project, id],
      description: "With `app_user_id`, the event carries that customer's attributes, so attribution partners (which need `$appsflyerId`, `$adjustId`, `$fbAnonId` ...) can be tested. A disabled integration answers 422.",
      requestBody: body(obj({ app_user_id: str(), environment: en(["production", "sandbox"]), product_id: str() }), {}, false),
      responses: { 201: ok("The queued delivery.", delivery), ...v2Errors(400, 401, 403, 404, 422) } }),
  },
  [`${P}/partners/{integration_id}/deliveries`]: {
    get: op2({ id: "listIntegrationDeliveries", tag: "Integrations", summary: "Delivery log of an integration", source: RI, scopes: READ,
      parameters: [project, id, { name: "status", in: "query", schema: en(["pending", "delivered", "failed", "skipped"]) }, ...page], description: "Newest first.",
      responses: { 200: ok("Deliveries.", listOf(delivery)), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/partners/{integration_id}/deliveries/{delivery_id}`]: {
    get: op2({ id: "getIntegrationDelivery", tag: "Integrations", summary: "One delivery with every attempt", source: RI, scopes: WRITE,
      parameters: [project, id, { name: "delivery_id", in: "path", required: true, schema: str() }],
      description: "The delivery with every attempt, newest last (at most 10): when, HTTP status, latency, error, the requests' methods and URLs and the first 4,096 characters of the answer. Credentials are removed: the integration's own secrets, and anything that looks like one (bearer and basic credentials, passwords in URLs, token-like JSON fields and query parameters). `curl` repeats a single-request delivery with the right `Content-Type` and a placeholder for the partner's credentials; it is null when the delivery made several requests, when the URL is itself the secret (Slack, Discord) or when the body was longer than the log keeps. Needs `read_write` (Admins and Developers): bodies can hold customer data, and the log answers Viewers without `request_body` and `response_body`. Attempt details are kept for 30 days after each attempt.",
      responses: { 200: ok("The delivery.", obj({
        ...delivery.properties,
        curl: nstr("A cURL command, credentials left as placeholders; null when it cannot repeat the request."),
        attempt_log: arr(obj({ attempted_at: ms("When it was sent."), response_status: nint(), response_ms: nint(), error: nstr(), response_body: nstr("First 4,096 characters, credentials removed."), request: nstr("Method and URL of each request.") }, ["attempted_at", "response_status", "response_ms", "error", "response_body"])),
        attempt_log_kept_days: int("How long attempt details are kept."),
      }, ["object", "id", "status", "attempts", "attempt_log", "attempt_log_kept_days"])), ...v2Errors(401, 403, 404) } }),
  },
  [`${P}/partners/{integration_id}/deliveries/{delivery_id}/retry`]: {
    post: op2({ id: "retryIntegrationDelivery", tag: "Integrations", summary: "Retry a delivery now", source: RI, scopes: WRITE,
      parameters: [project, id, { name: "delivery_id", in: "path", required: true, schema: str() }], description: "The request is built again, so keys and attributes saved since count. 409 (`resource_locked_error`) while a job run is sending it.",
      responses: { 200: ok("The delivery, queued.", delivery), ...E(404, 409) } }),
  },
  [`${P}/partners/{integration_id}/actions/replay`]: {
    post: op2({ id: "replayIntegrationDeliveries", tag: "Integrations", summary: "Queue failed or skipped deliveries again", source: RI, scopes: WRITE, parameters: [project, id],
      requestBody: body(obj({ status: en(["failed", "skipped", "failed_and_skipped"], "Default failed."), since: int("Queued at or after (epoch ms)."), until: int("Queued at or before (epoch ms).") }), { status: "failed_and_skipped" }, false),
      responses: { 200: ok("How many were queued.", obj({ object: en(["integration_replay"]), integration_id: str(), statuses: arr(str()), queued: int() })), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/exports`]: {
    get: op2({ id: "listDataExports", tag: "Data exports", summary: "List scheduled data exports", source: RX, scopes: READ, parameters: [project, ...page], responses: { 200: ok("The project's exports.", listOf(exportOut)), ...v2Errors(400, 401, 403, 404) } }),
    post: op2({ id: "createDataExport", tag: "Data exports", summary: "Create a scheduled data export", source: RX, scopes: WRITE, parameters: [project],
      description: "CSV or Parquet files of transactions, customers, subscriptions, events and paywall events, written every 4, 6, 8 or 12 hours, daily or weekly to Amazon S3 (or any S3-compatible storage), Cloudflare R2, Google Cloud Storage or Azure Blob Storage under `<prefix>/<YYYY-MM-DD>/<table>_<YYYYMMDDTHHMMSSZ>.<ext>`, or kept by RevenueDot for 7 days and emailed as download links to up to 25 members of the project (destination `email`). `columns` picks each table's columns. Incremental exports write rows that changed since the previous run; each table's first run is complete.",
      requestBody: body({ ...exportIn, required: ["destination", "config"] }, { name: "Warehouse", destination: "s3", config: { bucket: "acme-exports", prefix: "revenuedot", region: "eu-west-1", access_key_id: "AKIA..." }, credentials: { secret_access_key: "<secret>" }, format: "csv", schedule: "daily", hour_utc: 3, tables: ["transactions"] }),
      responses: { 201: ok("The export.", exportOut), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/exports/columns`]: {
    get: op2({ id: "listDataExportColumns", tag: "Data exports", summary: "List export columns", source: RX, scopes: READ, parameters: [project],
      description: "Every table an export can write, with its columns and their types, in the order files use. Pick columns per table with `columns`.",
      responses: { 200: ok("The tables.", listOf(obj({ object: en(["data_export_table"]), table: en(["transactions", "customers", "subscriptions", "events", "paywall_events"]), columns: arr(obj({ name: str(), type: en(["string", "bool", "int", "float", "timestamp", "json"]) }, ["name", "type"])) }, ["object", "table", "columns"]))), ...E(404) } }),
  },
  "/v2/data-exports/download/{token}": {
    get: op({ extension: true, security: NONE, id: "downloadDataExportFile", tag: "Data exports", summary: "Download a file of an email export", source: RD,
      parameters: [{ name: "token", in: "path", required: true, schema: str("The signed token from the link in the email.") }],
      description: "One file of an email export run, as emailed to the recipients. The token is signed and is the only auth; it and the file last 7 days.",
      responses: { 200: { description: "The file (`.csv.gz`, `.csv` or `.parquet`).", content: { "application/octet-stream": { schema: str("", { format: "binary" }) } } }, 404: { description: "The link has expired or is not valid." } } }),
  },
  [`${P}/exports/{export_id}`]: {
    get: op2({ id: "getDataExport", tag: "Data exports", summary: "Get a data export", source: RX, scopes: READ, parameters: [project, exportId], responses: { 200: ok("The export.", exportOut), ...E(404) } }),
    post: op2({ id: "updateDataExport", tag: "Data exports", summary: "Update a data export", source: RX, scopes: WRITE, parameters: [project, exportId], requestBody: body(exportIn, { schedule: "weekly", weekday: 1 }), responses: { 200: ok("The export.", exportOut), ...v2Errors(400, 401, 403, 404) } }),
    delete: op2({ id: "deleteDataExport", tag: "Data exports", summary: "Delete a data export", source: RX, scopes: WRITE, parameters: [project, exportId], description: "Files already written stay in the bucket. Files RevenueDot keeps for an email export are deleted.", responses: { 200: deleted("data_export"), ...E(404) } }),
  },
  [`${P}/exports/{export_id}/actions/run`]: {
    post: op2({ id: "runDataExport", tag: "Data exports", summary: "Run an export now", source: RX, scopes: WRITE, parameters: [project, exportId],
      requestBody: body(obj({ mode: en(["incremental", "full"], "Default: the export's mode.") }), {}, false),
      responses: { 201: ok("The queued run.", run), ...v2Errors(400, 401, 403, 404, 409) } }),
  },
  [`${P}/exports/{export_id}/actions/check`]: {
    post: op2({ id: "checkDataExportBucket", tag: "Data exports", summary: "Check the bucket and credentials", source: RX, scopes: WRITE, parameters: [project, exportId],
      description: "S3, R2 and GCS with an HMAC key: HeadBucket. GCS with a service account: buckets.get. Azure: Get Container Properties. Email: always ok.",
      responses: { 200: ok("The result.", obj({ object: en(["storage_check"]), export_id: str(), ok: bool(), message: str(), checked_at: ms("Checked.") })), ...E(404) } }),
  },
  [`${P}/exports/{export_id}/runs`]: {
    get: op2({ id: "listDataExportRuns", tag: "Data exports", summary: "Run history", source: RX, scopes: READ, parameters: [project, exportId, ...page], description: "Newest first, with each file written.", responses: { 200: ok("Runs.", listOf(run)), ...v2Errors(400, 401, 403, 404) } }),
  },
};

/** Every operation here is a RevenueDot extension, open to secret keys and dashboard sessions. */
function op2(o) { return op({ ...o, security: SECRET, extension: true }); }

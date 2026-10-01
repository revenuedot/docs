// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: third-party integrations (Slack, Segment, Amplitude, Mixpanel, PostHog, Firebase, BigQuery, AppsFlyer, Adjust,
// Meta) and scheduled data exports (S3, R2, Google Cloud Storage) in the OpenAPI document. RevenueDot extensions.
// Docs: https://revenuedot.app/docs/guides/integrations   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { SECRET, arr, body, bool, en, int, listOf, ms, nint, nms, nstr, obj, ok, op, param, str, v2Errors } from "./common.mjs";

const P = "/v2/projects/{project_id}/integrations";
const project = param("ProjectId");
const page = [param("Limit"), param("StartingAfter")];
const E = (...c) => v2Errors(401, 403, ...c);
const RI = "routes/v2/partner-integrations.ts", RX = "routes/v2/data-exports.ts";
const READ = ["project_configuration:integrations:read"], WRITE = ["project_configuration:integrations:read_write"];
const id = { name: "integration_id", in: "path", required: true, schema: str(), description: "Integration id (intg_...)." };
const exportId = { name: "export_id", in: "path", required: true, schema: str(), description: "Export id (export_...)." };
const TYPES = ["slack", "segment", "amplitude", "mixpanel", "posthog", "firebase", "bigquery", "appsflyer", "adjust", "meta"];
const STEPS = ["initial_purchase", "trial_started", "trial_converted", "trial_cancelled", "renewal", "cancellation", "uncancellation", "non_subscription_purchase", "subscription_paused", "expiration", "billing_issue", "product_change", "transfer", "purchase_redeemed", "experiment_enrollment", "test"];
const hint = obj({ configured: bool(), hint: nstr("The last four characters, or a service account's client_email.") }, ["configured", "hint"]);

const field = obj({
  key: str(), label: str(), type: en(["text", "secret", "select", "boolean", "textarea", "tokens"]), required: bool(), hint: str(), placeholder: str(),
  options: arr(obj({ value: str(), label: str() })), when: obj({ key: str(), value: str() }, [], { description: "Shown only when another field has this value." }),
}, ["key", "label", "type"]);
const integrationType = obj({
  object: en(["integration_type"]), type: en(TYPES), name: str(), category: en(["core", "analytics", "attribution", "marketing"]), description: str(),
  default_environment: { type: ["string", "null"], enum: ["production", null] }, event_names: bool("Whether event names can be overridden."), fields: arr(field), docs_url: str(),
}, ["object", "type", "name", "fields"]);
const integration = obj({
  object: en(["integration"]), id: str(), project_id: str(), type: en(TYPES), name: str(), enabled: bool(), environment: { type: ["string", "null"], enum: ["production", "sandbox", null], description: "Null sends both." },
  app_id: nstr("Only this app's events; null for all."), event_types: arr(str(), { description: "Lower-case webhook event types; empty for all the integration sends." }),
  settings: { type: "object", additionalProperties: true, description: "The non-secret settings." },
  secrets: { type: "object", additionalProperties: hint, description: "Each secret field: whether it is saved, and its hint. Secrets are never returned." },
  event_names: { type: "object", additionalProperties: str(), description: "Step → event name overrides." },
  status: obj({ last_delivered_at: nms("Last successful delivery."), last_error: nstr(), consecutive_failures: int() }),
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

const config = obj({ bucket: str(), prefix: nstr(), region: nstr("S3 region (default us-east-1)."), endpoint: nstr("S3-compatible endpoint (MinIO and the like)."), account_id: nstr("Cloudflare account id (R2)."), access_key_id: nstr("S3 or R2 access key id.") });
const exportOut = obj({
  object: en(["data_export"]), id: str(), project_id: str(), name: str(), enabled: bool(), destination: en(["s3", "r2", "gcs"]), config,
  credentials: { type: "object", additionalProperties: hint, description: "`secret_access_key` (S3, R2) or `service_account_json` (GCS): whether it is saved, and its hint." },
  format: en(["csv", "parquet"]), compression: en(["gzip", "none"], "CSV only."), schedule: en(["daily", "weekly"]), hour_utc: int(undefined, { minimum: 0, maximum: 23 }),
  weekday: nint("0 = Sunday; weekly only."), mode: en(["incremental", "full"]), tables: arr(en(["transactions", "customers", "subscriptions", "events"])),
  environment: { type: ["string", "null"], enum: ["production", "sandbox", null] }, next_run_at: nms("Next scheduled run."), last_run_at: nms("Last successful run."),
  last_error: nstr(), consecutive_failures: int(), created_at: ms("Created."), updated_at: nms("Last changed."),
}, ["object", "id", "name", "destination", "format", "schedule", "mode", "tables"]);
const exportIn = obj({
  name: str(), enabled: bool(), destination: en(["s3", "r2", "gcs"]), config,
  credentials: obj({ secret_access_key: nstr(), service_account_json: nstr("The service account's JSON key as a string.") }),
  format: en(["csv", "parquet"]), compression: en(["gzip", "none"]), schedule: en(["daily", "weekly"]), hour_utc: int(), weekday: nint(), mode: en(["incremental", "full"]),
  tables: arr(en(["transactions", "customers", "subscriptions", "events"])), environment: { type: ["string", "null"], enum: ["production", "sandbox", null] },
});
const run = obj({
  object: en(["data_export_run"]), id: str(), export_id: str(), status: en(["queued", "running", "succeeded", "failed"]), trigger: en(["schedule", "manual"]), mode: en(["incremental", "full"]),
  window_start: nms("Rows changed after this (null: everything)."), window_end: ms("Rows changed up to this."), attempts: int(), next_attempt_at: nms("Retry time, while queued."),
  files: arr(obj({ table: str(), key: str("Object key in the bucket."), rows: int(), bytes: int() })), rows: int(), bytes: int(), error: nstr(),
  started_at: nms("Started."), finished_at: nms("Finished."), created_at: ms("Queued."),
}, ["object", "id", "export_id", "status", "trigger", "mode", "window_end", "files"]);
const deleted = (object) => ok("Deleted.", obj({ object: en([object]), id: str(), deleted_at: ms("When it was deleted.") }, ["object", "id", "deleted_at"]));

const exampleIntegration = { object: "integration", id: "intg_8f2kq0x1m3zv7a", project_id: "proj1a2b3c4d", type: "amplitude", name: "Amplitude", enabled: true, environment: null, app_id: null, event_types: [], settings: { region: "us" }, secrets: { api_key: { configured: true, hint: "••••9f3a" }, sandbox_api_key: { configured: false, hint: null } }, event_names: {}, status: { last_delivered_at: null, last_error: null, consecutive_failures: 0 }, created_at: 1790850000000, updated_at: 1790850000000 };

export const integrationPaths = {
  [`${P}/catalog`]: {
    get: op2({ id: "listIntegrationTypes", tag: "Integrations", summary: "What each integration needs", source: RI, scopes: READ, parameters: [project],
      description: "The fields each integration takes (keys, labels, types, options), its default environment and setup guide. The dashboard draws its forms from this.",
      responses: { 200: ok("Every integration type.", listOf(integrationType)), ...E(404) } }),
  },
  [`${P}/partners`]: {
    get: op2({ id: "listIntegrations", tag: "Integrations", summary: "List integrations", source: RI, scopes: READ, parameters: [project, { name: "type", in: "query", schema: en(TYPES) }, ...page], responses: { 200: ok("The project's integrations.", listOf(integration)), ...v2Errors(400, 401, 403, 404) } }),
    post: op2({ id: "createIntegration", tag: "Integrations", summary: "Connect an integration", source: RI, scopes: WRITE, parameters: [project],
      description: "Every event webhooks get is also sent to each enabled integration whose filters match, with the webhook retry schedule (5, 10, 20, 40, 80 minutes). Secrets are encrypted at rest and never returned.",
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
  [`${P}/partners/{integration_id}/deliveries/{delivery_id}/retry`]: {
    post: op2({ id: "retryIntegrationDelivery", tag: "Integrations", summary: "Retry a delivery now", source: RI, scopes: WRITE,
      parameters: [project, id, { name: "delivery_id", in: "path", required: true, schema: str() }], description: "The request is built again, so keys and attributes saved since count.",
      responses: { 200: ok("The delivery, queued.", delivery), ...E(404) } }),
  },
  [`${P}/partners/{integration_id}/actions/replay`]: {
    post: op2({ id: "replayIntegrationDeliveries", tag: "Integrations", summary: "Queue failed or skipped deliveries again", source: RI, scopes: WRITE, parameters: [project, id],
      requestBody: body(obj({ status: en(["failed", "skipped", "failed_and_skipped"], "Default failed."), since: int("Queued at or after (epoch ms)."), until: int("Queued at or before (epoch ms).") }), { status: "failed_and_skipped" }, false),
      responses: { 200: ok("How many were queued.", obj({ object: en(["integration_replay"]), integration_id: str(), statuses: arr(str()), queued: int() })), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/exports`]: {
    get: op2({ id: "listDataExports", tag: "Data exports", summary: "List scheduled data exports", source: RX, scopes: READ, parameters: [project, ...page], responses: { 200: ok("The project's exports.", listOf(exportOut)), ...v2Errors(400, 401, 403, 404) } }),
    post: op2({ id: "createDataExport", tag: "Data exports", summary: "Create a scheduled data export", source: RX, scopes: WRITE, parameters: [project],
      description: "CSV or Parquet files of transactions, customers, subscriptions and events, written daily or weekly to Amazon S3 (or any S3-compatible storage), Cloudflare R2 or Google Cloud Storage under `<prefix>/<YYYY-MM-DD>/<table>_<YYYYMMDDTHHMMSSZ>.<ext>`. Incremental exports write rows that changed since the previous run; each table's first run is complete.",
      requestBody: body({ ...exportIn, required: ["destination", "config"] }, { name: "Warehouse", destination: "s3", config: { bucket: "acme-exports", prefix: "revenuedot", region: "eu-west-1", access_key_id: "AKIA..." }, credentials: { secret_access_key: "<secret>" }, format: "csv", schedule: "daily", hour_utc: 3, tables: ["transactions"] }),
      responses: { 201: ok("The export.", exportOut), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/exports/{export_id}`]: {
    get: op2({ id: "getDataExport", tag: "Data exports", summary: "Get a data export", source: RX, scopes: READ, parameters: [project, exportId], responses: { 200: ok("The export.", exportOut), ...E(404) } }),
    post: op2({ id: "updateDataExport", tag: "Data exports", summary: "Update a data export", source: RX, scopes: WRITE, parameters: [project, exportId], requestBody: body(exportIn, { schedule: "weekly", weekday: 1 }), responses: { 200: ok("The export.", exportOut), ...v2Errors(400, 401, 403, 404) } }),
    delete: op2({ id: "deleteDataExport", tag: "Data exports", summary: "Delete a data export", source: RX, scopes: WRITE, parameters: [project, exportId], description: "Files already written stay in the bucket.", responses: { 200: deleted("data_export"), ...E(404) } }),
  },
  [`${P}/exports/{export_id}/actions/run`]: {
    post: op2({ id: "runDataExport", tag: "Data exports", summary: "Run an export now", source: RX, scopes: WRITE, parameters: [project, exportId],
      requestBody: body(obj({ mode: en(["incremental", "full"], "Default: the export's mode.") }), {}, false),
      responses: { 201: ok("The queued run.", run), ...v2Errors(400, 401, 403, 404, 409) } }),
  },
  [`${P}/exports/{export_id}/actions/check`]: {
    post: op2({ id: "checkDataExportBucket", tag: "Data exports", summary: "Check the bucket and credentials", source: RX, scopes: WRITE, parameters: [project, exportId],
      description: "S3 and R2: HeadBucket. Google Cloud Storage: buckets.get.",
      responses: { 200: ok("The result.", obj({ object: en(["storage_check"]), export_id: str(), ok: bool(), message: str(), checked_at: ms("Checked.") })), ...E(404) } }),
  },
  [`${P}/exports/{export_id}/runs`]: {
    get: op2({ id: "listDataExportRuns", tag: "Data exports", summary: "Run history", source: RX, scopes: READ, parameters: [project, exportId, ...page], description: "Newest first, with each file written.", responses: { 200: ok("Runs.", listOf(run)), ...v2Errors(400, 401, 403, 404) } }),
  },
};

/** Every operation here is a RevenueDot extension, open to secret keys and dashboard sessions. */
function op2(o) { return op({ ...o, security: SECRET, extension: true }); }

// RevenueDot: the open-source RevenueCat alternative. Same SDK API, free to start on RevenueDot Cloud.
// This file: full exports and moves between RevenueDot servers (source and target side), and RevenueDot Cloud billing. All are RevenueDot extensions.
// Docs: https://revenuedot.app/docs/guides/move-projects   https://revenuedot.app/docs/guides/cloud-billing
import { NONE, SECRET, SESSION, arr, billingGate, body, bool, en, int, listOf, ms, nms, nstr, num, obj, ok, op, param, str, v2Errors } from "./common.mjs";

const P = "/v2/projects/{project_id}";
const project = param("ProjectId");
const E = (...c) => v2Errors(401, 403, ...c);
const MOVES = "routes/v2/moves.ts";
const IMPORTS = "routes/imports.ts";
const BILLING = "routes/billing.ts";
const x = { extension: true, security: SECRET, scopes: ["project_configuration:projects:read_write"] };
const exportId = { name: "export_id", in: "path", required: true, schema: str("An export id.") };
const importId = { name: "import_id", in: "path", required: true, schema: str("An import id.") };
const IMPORT_TOKEN = [{ importToken: [] }, { dashboardSession: [] }];
const locked = (d) => ({ 409: { description: d, content: { "application/json": { schema: { $ref: "#/components/schemas/V2Error" } } } } });
const plain = (d, extra = {}) => ({ description: d, content: { "application/json": { schema: obj({ object: en(["error"]), type: str(), message: str() }) } }, ...extra });

const exportShape = obj({
  object: en(["project_export"]), id: str(), project_id: str(), status: en(["queued", "running", "succeeded", "failed", "expired"]),
  purpose: en(["download", "move"]), include_secrets: bool("Secrets are in the archive, encrypted with the passphrase."), storage: str("Where the files are: r2, s3, disk or db."),
  rows: int("Rows in the archive."), bytes: int("Size of the archive files."), tables_done: int(), tables_total: int(),
  progress: { ...obj({ table: int("Tables done."), rows_in_table: int("Rows of the current table done.") }), type: ["object", "null"] },
  error: nstr(), created_at: ms("Created."), finished_at: nms("Finished."), expires_at: nms("Deleted after this (7 days)."),
  manifest: { type: "object", description: "Once succeeded: the archive's manifest.json (`format`, `version`, `schema`, `project`, `tables[]` with `columns`, `rows`, `checksum` and `files[]`, `secrets`, `excluded[]`)." },
  download_url: str("Once succeeded: the whole archive as a .tar. No other auth; expires after an hour."), download_expires_at: ms("When the download link expires."),
}, ["object", "id", "status"]);

const planShape = obj({
  project: obj({ id: str(), name: nstr(), exists: bool("The project is on the target already."), state: nstr("Its move state there (only shown to an Admin of that project).") }),
  conflicts: arr(str(), { description: "Why the archive cannot load here: another project uses the id, a public SDK key, the web address or the Verified Metrics address." }),
  needs_replace: bool("A moved-away copy of this project is on the target; load with `replace: true`."),
  tables: arr(obj({ name: str(), archive_rows: int(), target_rows: int("Rows the target has now. 0 when the project there belongs to someone else: only its Admins see its numbers.") })),
  secrets_included: bool(),
});
const verifyTable = obj({ name: str(), source_rows: int(), target_rows: int(), skipped_rows: int("Rows left out because the record they belong to was created on the source after its table was exported (such as a new app user's alias). They count towards the match; a `--finish` copy brings them."), source_checksum: str(), target_checksum: str(), match: bool() });
const urlRow = obj({ app_id: str(), app_name: str(), store: str(), url: str("The notification URL on this server."), where: str("Where to change it in the store's console.") });
const finishReport = obj({
  project_id: str(),
  webhooks_with_new_secrets: arr(obj({ id: str(), name: str(), url: str() }), { description: "Webhooks that got a new signing secret because the archive had no secrets." }),
  apps_needing_credentials: arr(obj({ id: str(), name: str(), type: str() }), { description: "Store apps whose credentials must be entered again." }),
  members_added: arr(obj({ email: str(), role: str() }), { description: "Always empty: collaborators are listed to invite, never added directly." }), members_to_invite: arr(obj({ email: str(), role: str() }), { description: "The collaborators from members.json, to invite on this server." }),
  notification_urls: arr(urlRow),
  domains_to_verify: arr(str(), { description: "Custom domains for hosted pages. A domain is verified per server: open Project settings → Domains here for its new TXT value, point the CNAME here, then Verify." }),
});
const moveShape = obj({
  object: en(["project_move"]), id: str(), status: en(["running", "ready", "copied", "finished", "failed", "cancelled"]), target_url: str(),
  mode: str(), dry_run: bool(), phase: str("The step running now."), files_copied: int(),
  plan: { ...planShape, type: ["object", "null"], description: "The dry run: rows per table on the target against the archive." },
  verify: { type: ["object", "null"], description: "Per table rows and checksums on both servers." }, report: { ...finishReport, type: ["object", "null"], description: "After finish." },
  error: nstr(), created_at: ms("Started."), updated_at: ms("Last step."),
});
const moveState = obj({
  object: en(["project_move_state"]), project_id: str(),
  state: { type: ["string", "null"], enum: ["paused", "forwarded", "incoming", null], description: "`paused`: writes answer 503/423 during the last copy. `forwarded`: every SDK, REST and store notification request is passed to `moved_to_url`. `incoming`: the copy on the target, not live yet. Null: normal." },
  moved_to_url: nstr("Where a forwarded project went."), moved_in_at: nms("When the project was copied in."), moved_in_from: nstr("The server it came from."), updated_at: nms("Last state change."),
  move: { ...moveShape, type: ["object", "null"], description: "The latest move this server ran (the dashboard's flow)." },
});
const importShape = obj({
  object: en(["project_import"]), id: str(), status: en(["open", "importing", "finished", "cancelled"]), project_id: nstr(), source_url: nstr(),
  files_done: { type: "object", description: "Archive files loaded, by name." }, files_total: int(), report: { type: "object" }, verify: { type: ["object", "null"] },
  expires_at: ms("The token's expiry."), created_at: ms("Created."), finished_at: nms("Finished."),
});

export const movePaths = {
  [`${P}/exports`]: {
    post: op({ ...x, id: "createProjectExport", tag: "Data moves", summary: "Export the whole project", source: MOVES, parameters: [project],
      description: "Starts an export job of everything the project owns (64 tables) as a versioned archive: gzip JSON Lines per table and a manifest with the schema version, row counts and checksums. The job runs in short slices in the background; poll it, or call `actions/advance`. Secrets are left out unless `passphrase` is given (12 or more characters); then they are encrypted with it (AES-256-GCM, PBKDF2-SHA-256). Admins only in the dashboard.",
      requestBody: body(obj({ purpose: en(["download", "move"]), include_secrets: bool(), passphrase: str("12 to 200 characters.") }), { include_secrets: true, passphrase: "correct horse battery staple" }, false),
      responses: { 202: ok("The export, queued.", exportShape), ...v2Errors(400, 401, 403, 404) } }),
    get: op({ ...x, id: "listProjectExports", tag: "Data moves", summary: "List the project's exports", source: MOVES, parameters: [project], responses: { 200: ok("Exports, newest first.", listOf(exportShape)), ...E(404) } }),
  },
  [`${P}/export`]: {
    get: op({ ...x, id: "getLatestProjectExport", tag: "Data moves", summary: "Get the latest export", source: MOVES, parameters: [project], responses: { 200: ok("The export.", exportShape), ...E(404) } }),
  },
  [`${P}/exports/{export_id}`]: {
    get: op({ ...x, id: "getProjectExport", tag: "Data moves", summary: "Get an export", source: MOVES, parameters: [project, exportId],
      description: "Once `succeeded`, it has the `manifest` and a `download_url` valid for an hour. Each archive file can also be read one by one with `GET …/exports/{export_id}/files/{name}` (`manifest.json`, `members.json`, `tables/<table>/0001.jsonl.gz`, `secrets/<table>/0001.json.enc`).",
      responses: { 200: ok("The export.", exportShape), ...E(404) } }),
    delete: op({ ...x, id: "deleteProjectExport", tag: "Data moves", summary: "Delete an export's files now", source: MOVES, parameters: [project, exportId],
      responses: { 200: ok("Deleted.", obj({ object: en(["project_export"]), id: str(), deleted: bool() })), ...E(404) } }),
  },
  [`${P}/exports/{export_id}/actions/advance`]: {
    post: op({ ...x, id: "advanceProjectExport", tag: "Data moves", summary: "Do the next slice of an export now", source: MOVES, parameters: [project, exportId],
      description: "Works for about eight seconds and returns the export. `npx revenuedot export` and `move` drive exports with it; the server's scheduled tick also advances queued exports.",
      responses: { 200: ok("The export.", exportShape), ...E(404) } }),
  },
  "/v2/exports/download/{token}": {
    get: op({ extension: true, security: NONE, id: "downloadProjectExport", tag: "Data moves", summary: "Download an archive", source: IMPORTS,
      parameters: [{ name: "token", in: "path", required: true, schema: str("The signed token from `download_url`.") }],
      description: "The whole archive as one uncompressed .tar whose members are the archive files. The token is signed and expires after an hour; it is the only auth.",
      responses: { 200: { description: "The archive.", content: { "application/x-tar": { schema: str("", { format: "binary" }) } } }, 404: plain("Expired or unknown link, or the export is gone.") } }),
  },
  [`${P}/move`]: {
    get: op({ ...x, scopes: ["project_configuration:projects:read"], id: "getProjectMoveState", tag: "Data moves", summary: "Get the project's move state", source: MOVES, parameters: [project], responses: { 200: ok("The state.", moveState), ...E(404) } }),
    post: op({ ...x, id: "startProjectMove", tag: "Data moves", summary: "Move the project to another server (run by this server)", source: MOVES, parameters: [project],
      description: "The dashboard's move: this server exports the project and copies it to `to_url` with the target's import token, then verifies. `dry_run` only compares rows per table. Poll `GET …/move` or call `move/actions/advance`; then `move/finish`.",
      requestBody: body(obj({ to_url: str("The target server, e.g. https://api.revenuedot.app."), to_token: str("An import token (rdi_…) from the target's Receive a project."), dry_run: bool() }, ["to_url", "to_token"]), { to_url: "https://api.revenuedot.app", to_token: "rdi_…", dry_run: true }),
      responses: { 202: ok("The move.", moveShape), ...v2Errors(400, 401, 403, 404), ...locked("The project is already moving.") } }),
  },
  [`${P}/move/actions/advance`]: {
    post: op({ ...x, id: "advanceProjectMove", tag: "Data moves", summary: "Do the next step of the move now", source: MOVES, parameters: [project], responses: { 200: ok("The move.", moveShape), ...E(404) } }),
  },
  [`${P}/move/finish`]: {
    post: op({ ...x, id: "finishProjectMove", tag: "Data moves", summary: "Switch to the target", source: MOVES, parameters: [project],
      description: "Pauses writes here, copies again, verifies, puts the project live on the target and forwards this server's traffic there. A verification failure lifts the pause.",
      responses: { 202: ok("The move.", moveShape), ...E(404), ...locked("The move is not copied yet, or it failed.") } }),
  },
  [`${P}/move/pause`]: {
    post: op({ ...x, id: "pauseProjectMove", tag: "Data moves", summary: "Pause writes for the last copy", source: MOVES, parameters: [project],
      description: "Reads keep working. SDK writes and store notifications answer 503 with `Retry-After: 60` (the SDKs and the stores retry); API v2 writes answer 423. `npx revenuedot move --finish` calls it.",
      responses: { 200: ok("The state.", moveState), ...E(404), ...locked("The project is forwarded or incoming.") } }),
  },
  [`${P}/move/forward`]: {
    post: op({ ...x, id: "forwardProjectMove", tag: "Data moves", summary: "Forward the paused project to its new server", source: MOVES, parameters: [project],
      description: "Every `/v1`, `/rcbilling` and secret-key `/v2` request for the project, and every store notification, is passed to `to_url` with the same method, path, headers and body; the answer comes back unchanged with an `x-revenuedot-moved-to` header. A forwarding loop answers 508.",
      requestBody: body(obj({ to_url: str() }, ["to_url"]), { to_url: "https://api.revenuedot.app" }),
      responses: { 200: ok("The state.", moveState), ...v2Errors(400, 401, 403, 404), ...locked("Pause and copy the project first.") } }),
  },
  [`${P}/move/cancel`]: {
    post: op({ ...x, id: "cancelProjectMove", tag: "Data moves", summary: "Serve the project here again", source: MOVES, parameters: [project],
      description: "Stops a running move and clears `paused` or `forwarded`. A copy already on the target stays there.",
      responses: { 200: ok("The state.", moveState), ...E(404), ...locked("The project is being copied in here.") } }),
  },

  "/v2/imports/tokens": {
    post: op({ extension: true, security: SESSION, id: "createImportToken", tag: "Data moves", summary: "Create an import token (Receive a project)", source: IMPORTS,
      description: "A token (`rdi_` and 64 hex characters) that lets one project move into the signed-in account on this server. Shown once; lasts 24 hours. RevenueDot Cloud needs a confirmed email address.",
      responses: { 201: ok("The token.", obj({ object: en(["import_token"]), id: str(), token: str(), expires_at: ms("Expires."), url: str("This server's API address.") })), 401: plain("Not signed in."), 403: plain("Confirm your email first, or the request did not come from the dashboard.") } }),
  },
  "/v2/imports": {
    get: op({ extension: true, security: SESSION, id: "listImports", tag: "Data moves", summary: "List your moves into this server", source: IMPORTS, responses: { 200: ok("The last 20 imports.", listOf(importShape)), 401: plain("Not signed in.") } }),
    post: op({ extension: true, security: IMPORT_TOKEN, id: "beginImport", tag: "Data moves", summary: "Check or start loading an archive", source: IMPORTS,
      description: "With `dry_run`: what loading would do (conflicts, rows per table here now against the archive); nothing is written. Without: starts the import (the project is created `incoming`). Then send each file with `PUT /v2/imports/{import_id}/files/{name}` (its SHA-256 must match the manifest; tables upsert by primary key and never change another project's rows; a row whose parent record is not here, such as an alias of a customer created on the source during the export, is left out and counted; a file already loaded answers `applied: false`), `members.json` to `…/members`, then `…/verify` and `…/finish`. Sending a new manifest starts the incoming copy over.",
      requestBody: body(obj({ manifest: { type: "object", description: "The archive's manifest.json." }, passphrase: str("Needed when the archive includes secrets."), dry_run: bool(), replace: bool("Replace a moved-away copy of the project that is still here.") }, ["manifest"])),
      responses: { 200: ok("The plan (dry run).", obj({ object: en(["import_plan"]), import_id: str(), plan: planShape })), 201: ok("The import.", importShape), 400: plain("Bad manifest or passphrase."), 401: plain("Missing or expired import token."), 409: plain("A conflict with another project here, or the import is finished."), 422: plain("The archive was written by a newer RevenueDot.") } }),
  },
  "/v2/imports/{import_id}": {
    get: op({ extension: true, security: IMPORT_TOKEN, id: "getImport", tag: "Data moves", summary: "Get an import", source: IMPORTS, parameters: [importId], responses: { 200: ok("The import.", importShape), 401: plain("Missing token."), 404: plain("Not found.") } }),
  },
  "/v2/imports/{import_id}/members": {
    post: op({ extension: true, security: IMPORT_TOKEN, id: "importMembers", tag: "Data moves", summary: "List the project's collaborators to invite", source: IMPORTS, parameters: [importId],
      description: "The archive's members.json. Everyone in it is listed to invite on this server (the finish report repeats the list); nobody is added directly, even with an account here. The person who imports owns the project.",
      requestBody: body(obj({ members: arr(obj({ email: str(), role: str() })) })),
      responses: { 200: ok("To invite.", obj({ object: en(["import_members"]), added: arr(obj({ email: str(), role: str() }), { description: "Always empty." }), invite: arr(obj({ email: str(), role: str() })) })), 401: plain("Missing token."), 409: plain("Nothing imported yet, or the import is finished.") } }),
  },
  "/v2/imports/{import_id}/verify": {
    post: op({ extension: true, security: IMPORT_TOKEN, id: "verifyImport", tag: "Data moves", summary: "Verify the copy", source: IMPORTS, parameters: [importId],
      description: "Recomputes the rows and checksum of every table here and compares them with the manifest. Large projects take several calls: `done: false` until finished.",
      responses: { 200: ok("Progress or the result.", obj({ object: en(["import_verify"]), done: bool(), tables_done: int(), ok: bool(), tables: arr(verifyTable) })), 401: plain("Missing token."), 409: plain("Nothing imported yet, or verification failed.") } }),
  },
  "/v2/imports/{import_id}/finish": {
    post: op({ extension: true, security: IMPORT_TOKEN, id: "finishImport", tag: "Data moves", summary: "Put the project live here", source: IMPORTS, parameters: [importId],
      description: "Every file must be loaded. Webhooks without a secret get a new one. The answer lists the store notification URLs to change and where.",
      responses: { 200: ok("The report.", { allOf: [obj({ object: en(["import_report"]) }), finishReport] }), 401: plain("Missing token."), 409: plain("Files are missing, or the import is finished.") } }),
  },

  "/v2/billing": {
    get: op({ extension: true, security: SESSION, id: "getBilling", tag: "Cloud billing", summary: "The account's plan, go-live stage, usage and invoices", source: BILLING,
      description: "RevenueDot Cloud only; a self-hosted server answers 404. Tracked revenue is the USD sum of the month's production purchases, renewals and one-time purchases that earned money in the projects the account owns; sandbox, trials, refunds and imported or moved-in history do not count. Add `?sync=1` after Stripe Checkout to read Stripe at once (at most once every 5 seconds).",
      parameters: [{ name: "sync", in: "query", schema: en(["1"]), description: "`1`: read the subscription from Stripe now, so a new plan shows before the webhook lands." }],
      responses: { 200: ok("Billing.", obj({
        object: en(["billing"]), edition: en(["cloud"]),
        account: obj({ plan: en(["none", "pro", "enterprise"], "`none` until the account starts Pro: the build stage, not a plan anyone picks."), status: en(["none", "active", "past_due", "unpaid", "canceled"], "The Stripe subscription's state. `past_due` keeps Pro while Stripe retries; `unpaid` and `canceled` mean no plan."), cancel_at: nms("A cancelled plan ends."), current_period_end: nms("Period end."), has_payment_method: bool("A Stripe customer exists for the account.") }),
        gate: obj({ ...billingGate.properties, grace_days: int("Days to start Pro after the first live sale: 14.") }),
        plans: arr(obj({ id: en(["pro", "enterprise"]), name: str(), price_label: str(), description: str(), rate: num("Share of tracked revenue above free_up_to_usd (0.005 is 0.5%)."), free_up_to_usd: num("Tracked revenue a month that costs nothing."), cap_usd: { type: ["number", "null"], description: "Most a month can cost; null: no cap." }, limit_usd: { type: ["number", "null"], description: "Tracked revenue a month the plan is meant for; null: no limit." }, self_serve: bool("Started with Stripe Checkout (Pro), not by contract (Enterprise)."), includes: arr(str(), { description: "What the plan includes, one line each." }) })),
        usage: obj({ month: str("YYYY-MM (UTC)."), tracked_revenue_usd: num(), projects: arr(obj({ project_id: str(), name: nstr(), tracked_revenue_usd: num(), transactions: int() })), computed_at: nms("When the numbers were last computed (about once an hour)."), bill_usd: num("The bill so far on the current plan: 0 with no plan or on Enterprise."), pro_bill_usd: num("What Pro costs for this month's tracked revenue."), free_up_to_usd: num("Tracked revenue a month that Pro does not charge for: 10000."), cap_usd: num("Pro's cap: 999."), ceiling_usd: num("Tracked revenue a month Pro is meant for: 1000000."), period_end: ms("Month end.") }),
        flags: arr(en(["past_due", "unpaid", "live_grace", "live_paused", "over_pro_limit"]), { description: "Banners to show: a failed payment (`past_due`), every retry failed (`unpaid`), live without a plan inside the 14 days (`live_grace`) or after them (`live_paused`), and tracked revenue above Pro's $1,000,000 a month (`over_pro_limit`)." }),
        invoices: arr(obj({ id: str(), number: nstr(), status: str(), amount_due: num(), amount_paid: num(), currency: str(), period_start: nms("Start."), period_end: nms("End."), hosted_invoice_url: nstr(), invoice_pdf: nstr(), created_at: ms("Created.") })),
        stripe_ready: bool("Checkout and the Portal can open."), stripe_problem: nstr(),
      })), 401: plain("Not signed in."), 404: plain("Self-hosted: billing is only on RevenueDot Cloud.") } }),
  },
  "/v2/billing/checkout": {
    post: op({ extension: true, security: SESSION, id: "createBillingCheckout", tag: "Cloud billing", summary: "Start Pro with Stripe Checkout", source: BILLING,
      description: "A Stripe Checkout session on RevenueDot's own Stripe account: the metered Pro price, a card collected and $0 due today, billed monthly on the 1st from the 1st of next month, no proration. `standard`, Pro's old name, is still accepted.",
      requestBody: body(obj({ plan: en(["pro"]) }, ["plan"]), { plan: "pro" }),
      responses: { 200: ok("Go to url.", obj({ object: en(["checkout"]), url: str(), id: str() })), 400: plain("Only Pro has a self-serve checkout; Enterprise is through sales."), 401: plain("Not signed in."), 403: plain("The request did not come from the dashboard."), 409: plain("Already on Pro or on Enterprise."), 502: plain("Stripe refused."), 503: plain("Billing is not set up on this server.") } }),
  },
  "/v2/billing/portal": {
    post: op({ extension: true, security: SESSION, id: "createBillingPortal", tag: "Cloud billing", summary: "Open the Stripe Customer Portal", source: BILLING,
      description: "Change the card, see invoices or cancel at period end. A cancelled Pro plan ends at the period end; the account then has no plan, and a live account is paused at once.",
      responses: { 200: ok("Go to url.", obj({ object: en(["portal"]), url: str() })), 401: plain("Not signed in."), 409: plain("No payment method yet."), 502: plain("Stripe refused."), 503: plain("Billing is not set up on this server.") } }),
  },
  "/v2/billing/stripe/webhook": {
    post: op({ extension: true, security: NONE, id: "billingStripeWebhook", tag: "Cloud billing", summary: "Webhook of RevenueDot's own Stripe account", source: BILLING,
      description: "Stripe only, signed with `REVENUEDOT_BILLING_STRIPE_WEBHOOK_SECRET`: `checkout.session.completed`, `customer.subscription.*` and `invoice.*` events keep the plan, the payment status and the invoices.",
      requestBody: body({ type: "object", description: "A Stripe event." }),
      responses: { 200: ok("Handled.", obj({ received: bool(), result: str() })), 400: plain("Bad signature or body."), 503: plain("Billing webhooks are not set up.") } }),
  },
};

// RevenueDot: the open-source RevenueCat alternative. Same SDK API, free to start on RevenueDot Cloud.
// This file: "Connect with Stripe" (Stripe Connect OAuth and Account Links) and payment recovery (failed payments) in the
// OpenAPI document. Both are RevenueDot extensions.
// Docs: https://revenuedot.app/docs/guides/stripe-connect   https://revenuedot.app/docs/guides/payment-recovery   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { NONE, SECRET, arr, body, bool, en, int, listOf, ms, nint, nms, nstr, num, obj, ok, op, param, ref, str, v2Errors } from "./common.mjs";

const P = "/v2/projects/{project_id}";
const project = param("ProjectId");
const app = param("AppId");
const page = [param("Limit"), param("StartingAfter")];
const E = (...c) => v2Errors(401, 403, ...c);
const x = { extension: true, security: SECRET };
const PR = ["project_configuration:projects:read"], PW = ["project_configuration:projects:read_write"];
const CR = ["customer_information:customers:read"];
const AR = ["project_configuration:apps:read"], AW = ["project_configuration:apps:read_write"];
const id = (name) => ({ name, in: "path", required: true, schema: str() });
const SC = "routes/v2/stripe-connect.ts", PRC = "routes/v2/payment-recovery.ts", PUB = "routes/lifecycle-public.ts";

/* ---------- Stripe Connect ---------- */

const connection = obj({
  object: en(["stripe_connect"]), app_id: str(),
  available: bool("Whether this server has a Stripe Connect platform (its client id, secret key and webhook secret)."),
  unavailable_reason: nstr("Why Connect cannot be used here, as the dashboard shows it. Null when available."),
  modes: arr(en(["live", "test"]), { description: "Modes this server can connect in." }),
  status: en(["not_connected", "connected", "disconnected"]), method: { type: ["string", "null"], enum: ["oauth", "account_link", null], description: "How the account was linked." },
  mode: { type: ["string", "null"], enum: ["live", "test", null], description: "Which of the platform's keys acts for the account. A test connection records sandbox purchases." },
  account: nstr("The connected account, masked (`acct_…abcd`). The full id is never returned."),
  charges_enabled: { type: ["boolean", "null"], description: "From Stripe: the account can take payments." }, details_submitted: { type: ["boolean", "null"], description: "From Stripe: onboarding finished." },
  connected_at: nms("Connected."), disconnected_at: nms("Disconnected."), disconnect_reason: nstr("`Disconnected in RevenueDot` or `Disconnected in Stripe`."),
  restricted_key_configured: bool("The app also has a restricted key (used while it is not connected)."),
  webhook_url: str("The platform's Connect endpoint. Connected accounts need no webhook of their own."),
  application_fee: { type: "null", description: "RevenueDot takes no application fee on connected accounts." },
}, ["object", "app_id", "available", "status"]);
const connectExample = {
  object: "stripe_connect", app_id: "app1a2b3c4d", available: true, unavailable_reason: null, modes: ["live", "test"], status: "connected", method: "oauth", mode: "live",
  account: "acct_…9xQz", charges_enabled: true, details_submitted: true, connected_at: 1790900000000, disconnected_at: null, disconnect_reason: null,
  restricted_key_configured: false, webhook_url: "https://api.revenuedot.app/v1/notifications/stripe-connect", application_fee: null,
};

/* ---------- Payment recovery ---------- */

const step = obj({
  day: int("Days after the billing issue started. 0 sends right away."), subject: str("`{app}` becomes the sender name."), heading: str(), body: str("Plain text; a blank line starts a paragraph."), button_label: str(),
}, ["day", "subject", "heading", "body", "button_label"]);
const settings = obj({
  object: en(["payment_recovery_settings"]), enabled: bool("Recovery emails go out. Off by default; cases are tracked either way."),
  steps: arr(step, { description: "1 to 5 emails, each on a later day than the one before." }), window_days: int("A renewal within this many days of the billing issue counts as recovered (7 to 60, default 30)."),
  include_sandbox: bool("Email sandbox subscribers too (Stripe test mode, the Test Store)."), sender_name: nstr("The From name. Null: the project's name."),
  default_steps: arr(step, { description: "The built-in emails (day 0, 3 and 7)." }),
}, ["object", "enabled", "steps", "window_days"]);
const settingsIn = obj({ enabled: bool(), steps: arr(step), window_days: int(), include_sandbox: bool(), sender_name: nstr() }, ["enabled", "steps"]);
const stats = obj({
  object: en(["payment_recovery_stats"]), days: int(), environment: en(["production", "sandbox"]),
  at_risk: obj({ count: int("Open cases now."), revenue_in_usd: num("What their periods are worth.") }), opened: int("Cases opened in the period."),
  messages_sent: int(), clicked: int("Cases whose link was opened in the period."),
  recovered: obj({ count: int(), revenue_in_usd: num() }, [], { description: "Renewed after at least one email: what RevenueDot recovered." }),
  recovered_without_message: obj({ count: int(), revenue_in_usd: num() }, [], { description: "Renewed before any email, or with emails off." }),
  lost: obj({ count: int() }), recovery_rate: { type: ["number", "null"], description: "Recovered (both kinds) ÷ cases closed in the period." },
  by_store: arr(obj({ store: str(), at_risk: int(), recovered: int(), recovered_revenue_in_usd: num(), recovered_without_message: int(), lost: int() })),
});
const recoveryCase = obj({
  object: en(["payment_recovery_case"]), id: str(), app_user_id: str(), customer_id: str(), store: str(), app_id: nstr(), product_id: str(), environment: en(["production", "sandbox"]),
  status: en(["open", "recovered", "lost"]), detected_at: ms("The billing issue started."), grace_period_expires_at: nms("The store's grace period ends."),
  at_risk_in_usd: { type: ["number", "null"] }, email: nstr("Where the emails go."), messages_sent: int(), next_message_at: nms("The next email is due."), last_message_at: nms("Last email."),
  clicked_at: nms("The link was first opened."), unsubscribed_at: nms("Unsubscribed."), skip_reason: { type: ["string", "null"], enum: ["no_email", "unsubscribed", "issue_cleared", "mailer_failed", null] },
  resolved_at: nms("Recovered or lost."), recovered_revenue_in_usd: { type: ["number", "null"] }, attributed: bool("Recovered after an email."), lost_reason: { type: ["string", "null"], enum: ["window_passed", "refunded", null] },
});
const environmentQ = { name: "environment", in: "query", required: false, schema: en(["production", "sandbox"]), description: "Default production." };

export const recoveryPaths = {
  [`${P}/apps/{app_id}/stripe_connect`]: {
    get: op({ ...x, id: "getStripeConnect", tag: "Stripe Connect", summary: "Get a Stripe app's Connect status", source: SC, scopes: AR, parameters: [project, app],
      description: "Whether this server offers Connect with Stripe (and why not), and the app's connection. See [Connect with Stripe](../docs/guides/stripe-connect.md).",
      responses: { 200: ok("The connection.", connection, connectExample), ...E(404, 422) } }),
  },
  [`${P}/apps/{app_id}/stripe_connect/actions/start`]: {
    post: op({ ...x, id: "startStripeConnect", tag: "Stripe Connect", summary: "Start connecting a Stripe account", source: SC, scopes: AW, parameters: [project, app],
      description: `
\`oauth\` answers Stripe's authorize URL for an existing Stripe account; \`account_link\` creates a Standard account on RevenueDot's platform and answers its onboarding link. Open \`url\` in the browser and keep \`nonce\` there: Stripe sends the developer back to \`redirect_uri\` (the dashboard's \`/connect/stripe\`), which posts \`state\`, \`code\` and the nonce to \`actions/finish\` within 10 minutes.

- **400:** a mode this server cannot connect in. **409:** the app is already connected. **422:** Connect is not set up on this server (\`unavailable_reason\`), or Stripe refused to create the account.`,
      requestBody: body(obj({ method: en(["oauth", "account_link"]), mode: en(["live", "test"]), email: nstr("account_link: the new account's email.") }), { method: "oauth", mode: "live" }),
      responses: { 200: ok("Where to send the developer.", obj({ object: en(["stripe_connect_start"]), url: str(), state: str(), nonce: str("Keep it in the browser that started; finish needs it."), redirect_uri: str(), expires_in: int("Seconds.") }), {
        object: "stripe_connect_start", url: "https://connect.stripe.com/oauth/authorize?response_type=code&client_id=ca_…&scope=read_write&state=proj1.app1.f3…&redirect_uri=https%3A%2F%2Fapp.revenuedot.app%2Fconnect%2Fstripe&stripe_landing=login",
        state: "proj1.app1.f3a9…", nonce: "8c1e…", redirect_uri: "https://app.revenuedot.app/connect/stripe", expires_in: 600 }), ...v2Errors(400, 401, 403, 404, 409, 422) } }),
  },
  [`${P}/apps/{app_id}/stripe_connect/actions/finish`]: {
    post: op({ ...x, id: "finishStripeConnect", tag: "Stripe Connect", summary: "Finish connecting (from the callback page)", source: SC, scopes: AW, parameters: [project, app],
      description: `
The state must be this app's pending one, under 10 minutes old, and is used once; the nonce must be the one \`actions/start\` gave this browser. For OAuth the code is exchanged at \`connect.stripe.com/oauth/token\` and only the account id is kept, sealed. For Account Links the account's status is read again.

- **400:** an invalid, used or expired state, or a nonce from another browser. **422:** Stripe refused the code.`,
      requestBody: body(obj({ state: str(), nonce: str(), code: nstr("OAuth only.") }, ["state", "nonce"]), { state: "proj1.app1.f3a9…", nonce: "8c1e…", code: "ac_…" }),
      responses: { 200: ok("The connection.", connection, connectExample), ...v2Errors(400, 401, 403, 404, 409, 422) } }),
  },
  [`${P}/apps/{app_id}/stripe_connect/actions/disconnect`]: {
    post: op({ ...x, id: "disconnectStripeConnect", tag: "Stripe Connect", summary: "Disconnect the Stripe account", source: SC, scopes: AW, parameters: [project, app],
      description: "Deauthorizes RevenueDot's platform at Stripe and forgets the account. If Stripe cannot be reached the app is still disconnected, `deauthorized` is false and `warning` says to remove RevenueDot under Connected apps in Stripe.",
      responses: { 200: ok("Disconnected.", { ...connection, properties: { ...connection.properties, deauthorized: bool(), warning: nstr() } }), ...E(404, 409, 422) } }),
  },
  "/v1/notifications/stripe-connect": {
    post: op({ id: "stripeConnectNotification", tag: "Store notifications", summary: "Stripe Connect webhooks (RevenueDot's platform)", security: NONE, source: "stores/stripe/connect-notifications.ts", extension: true,
      parameters: [{ name: "Stripe-Signature", in: "header", required: true, schema: str(), description: "Checked against each of the platform's webhook secrets (`REVENUEDOT_STRIPE_CONNECT_WEBHOOK_SECRET`)." }],
      description: `
The platform's endpoint for "Events on Connected accounts". Each event carries \`account\` and is handled for every app connected to that account exactly like its own Stripe endpoint (stored once per app, forwarded, applied), when its \`livemode\` matches the connection's mode. \`account.updated\` refreshes onboarding status; \`account.application.deauthorized\` disconnects the apps.

- **200:** handled, a duplicate, \`unknown_account\` (no app is connected to it), \`other_mode\`, or a platform event without \`account\`. **400:** a bad signature or not a Stripe event. **404:** Connect is not set up on this server. **500:** a temporary failure; Stripe retries.`,
      requestBody: body(obj({ id: str("evt_…"), type: str(), account: str("acct_…"), livemode: bool(), data: obj({ object: { type: "object" } }) }, ["id", "type", "data"])),
      responses: {
        200: ok("Handled.", obj({ status: str("processed, duplicate, ignored, invalid, unknown_purchase, unknown_account, other_mode or disconnected; several apps' statuses are comma-separated.") }), { status: "processed" }),
        400: ok("Not accepted.", ref("V1Error")), 404: ok("Connect is not set up.", ref("V1Error")), 500: ok("Temporary failure; Stripe retries.", ref("V1Error")),
      } }),
  },

  [`${P}/payment_recovery`]: {
    get: op({ ...x, id: "getPaymentRecovery", tag: "Payment recovery", summary: "Get payment recovery settings", source: PRC, scopes: PR, parameters: [project], responses: { 200: ok("Settings.", settings), ...E(404) } }),
    post: op({ ...x, id: "updatePaymentRecovery", tag: "Payment recovery", summary: "Replace payment recovery settings", source: PRC, scopes: PW, parameters: [project],
      description: "Open cases move to the new schedule: each case's next email is due on its new day.",
      requestBody: body(settingsIn, { enabled: true, window_days: 30, include_sandbox: false, sender_name: null, steps: [
        { day: 0, subject: "Your payment for {app} didn't go through", heading: "Update your payment method", body: "We couldn't charge your payment method for your {app} subscription.\n\nUpdate your payment details to keep your access.", button_label: "Update payment" },
        { day: 3, subject: "Action needed: keep your {app} subscription", heading: "Your subscription is at risk", body: "Your last payment for {app} still hasn't gone through.", button_label: "Update payment" },
      ] }),
      responses: { 200: ok("Settings.", settings), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/payment_recovery/stats`]: {
    get: op({ ...x, id: "getPaymentRecoveryStats", tag: "Payment recovery", summary: "At risk, emails sent, recovered revenue", source: PRC, scopes: CR,
      parameters: [project, { name: "days", in: "query", required: false, schema: int("1 to 365, default 28.") }, environmentQ],
      responses: { 200: ok("The numbers.", stats, { object: "payment_recovery_stats", days: 28, environment: "production", at_risk: { count: 3, revenue_in_usd: 89.97 }, opened: 9, messages_sent: 14, clicked: 6, recovered: { count: 5, revenue_in_usd: 179.95 }, recovered_without_message: { count: 1, revenue_in_usd: 9.99 }, lost: { count: 1 }, recovery_rate: 0.857, by_store: [{ store: "app_store", at_risk: 2, recovered: 4, recovered_revenue_in_usd: 119.96, recovered_without_message: 1, lost: 1 }] }), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/payment_recovery/cases`]: {
    get: op({ ...x, id: "listPaymentRecoveryCases", tag: "Payment recovery", summary: "List recovery cases", source: PRC, scopes: CR,
      parameters: [project, { name: "status", in: "query", required: false, schema: en(["open", "recovered", "lost"]) }, environmentQ, ...page],
      description: "Newest first.", responses: { 200: ok("Cases.", listOf(recoveryCase)), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/payment_recovery/actions/send_test`]: {
    post: op({ ...x, id: "sendPaymentRecoveryTest", tag: "Payment recovery", summary: "Send a test recovery email", source: PRC, scopes: PW, parameters: [project],
      description: "Sends one step (saved, or `content` to preview unsaved edits) to any address with sample links. At most 10 an hour per project.",
      requestBody: body(obj({ email: str(), step: int("0-based, default 0."), content: step, sender_name: nstr() }, ["email"]), { email: "me@example.com", step: 0 }),
      responses: { 200: ok("Sent.", obj({ object: en(["payment_recovery_test"]), sent_to: str(), step: int() })), ...v2Errors(400, 401, 403, 404, 429, 502) } }),
  },
  [`${P}/payment_recovery/actions/run`]: {
    post: op({ ...x, id: "runPaymentRecovery", tag: "Payment recovery", summary: "Send the emails that are due now", source: PRC, scopes: PW, parameters: [project],
      description: "The minute tick sends due emails too (on Cloud from the cron). Closes cases whose window passed. **422:** recovery is off.",
      responses: { 200: ok("Counts.", obj({ object: en(["payment_recovery_run"]), sent: int(), failed: int(), skipped: int(), closed: int() })), ...E(404, 422) } }),
  },
  "/v1/recovery/l/{token}": {
    get: op({ id: "recoveryLink", tag: "Payment recovery", summary: "Email link: opens the place to fix the payment", security: NONE, source: PUB, extension: true, parameters: [id("token")],
      description: "Records the click and redirects: Apple's payment page, the Play Store subscription page, Amazon's subscriptions page, or a Stripe customer portal session made now (the open invoice's page when the portal is not set up). Test Store purchases get a page that explains the test.",
      responses: { 303: { description: "To the store or Stripe." }, 200: { description: "An explanation page.", content: { "text/html": {} } }, 404: { description: "Unknown link." } } }),
  },
  "/v1/recovery/c/{token}": {
    get: op({ id: "recoveryCustomerCenter", tag: "Payment recovery", summary: "Customer Center link (customer info's management_url)", security: NONE, source: PUB, extension: true, parameters: [id("token")],
      description: "The Customer Center token, never the emailed one. App Store, Google Play and Amazon purchases redirect straight to the store's page. A web (Stripe) purchase gets a page that offers to email a one-time link: customer info is readable with the app's public key, so this link never opens the Stripe portal itself. Without an email address on file, the page says where to update the payment instead.",
      responses: { 303: { description: "To the store." }, 200: { description: "HTML.", content: { "text/html": {} } }, 404: { description: "Unknown link." } } }),
    post: op({ id: "recoveryCustomerCenterSend", tag: "Payment recovery", summary: "Email a one-time link to the Stripe customer portal", security: NONE, source: PUB, extension: true, parameters: [id("token")],
      description: "Emails a link that works once, for 30 minutes, to the address on file (the case's email, `$email`, or the Stripe customer's). At most 3 an hour per customer and 10 an hour per IP address.",
      responses: { 200: { description: "Check your email (or no email on file).", content: { "text/html": {} } }, 429: { description: "Too many requests.", content: { "text/html": {} } }, 503: { description: "The email could not be sent.", content: { "text/html": {} } }, 404: { description: "Unknown link." } } }),
  },
  "/v1/recovery/p/{token}": {
    get: op({ id: "recoveryPortalLinkPage", tag: "Payment recovery", summary: "One-time link page (a button; opening it spends nothing)", security: NONE, source: PUB, extension: true, parameters: [id("token")],
      responses: { 200: { description: "A button, or why the link no longer works (used, expired).", content: { "text/html": {} } }, 404: { description: "Unknown link." } } }),
    post: op({ id: "recoveryPortalLinkUse", tag: "Payment recovery", summary: "Use the one-time link: a Stripe portal session made now", security: NONE, source: PUB, extension: true, parameters: [id("token")],
      responses: { 303: { description: "To the Stripe customer portal." }, 200: { description: "Why the link no longer works.", content: { "text/html": {} } }, 404: { description: "Unknown link." } } }),
  },
  "/v1/recovery/done/{token}": { get: op({ id: "recoveryDone", tag: "Payment recovery", summary: "Where the Stripe portal returns to", security: NONE, source: PUB, extension: true, parameters: [id("token")], responses: { 200: { description: "A thank-you page.", content: { "text/html": {} } }, 404: { description: "Unknown link." } } }) },
  "/v1/recovery/u/{token}": {
    get: op({ id: "recoveryUnsubscribePage", tag: "Payment recovery", summary: "Unsubscribe page (asks first)", security: NONE, source: PUB, extension: true, parameters: [id("token")], responses: { 200: { description: "HTML.", content: { "text/html": {} } }, 404: { description: "Unknown link." } } }),
    post: op({ id: "recoveryUnsubscribe", tag: "Payment recovery", summary: "Unsubscribe (also RFC 8058 one-click)", security: NONE, source: PUB, extension: true, parameters: [id("token")], responses: { 200: { description: "HTML confirmation.", content: { "text/html": {} } }, 404: { description: "Unknown link." } } }),
  },
};

void nint; void ms;

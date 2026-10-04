// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: OpenAPI source for Account settings (email change, password, sessions, two-factor, OAuth tokens, Stripe
// accounts, projects, deletion, notification choices, the display currency's rate). Server: apps/server/src/routes/account.ts.
// Docs: https://revenuedot.app/docs/guides/account-settings
import { NONE, SESSION, arr, body, bool, en, int, nms, ms, nstr, num, obj, ok, op, str } from "./common.mjs";

const SRC = "routes/account.ts";
const AUTH = "routes/auth.ts";
const TAG = "Account settings";
const errBody = obj({ type: str(), message: str() });
const authErr = ok("Not signed in.", errBody, { type: "authentication_error", message: "Not signed in." });
const csrf = ok("A write from another site (Sec-Fetch-Site: cross-site or same-site).", errBody, { type: "authorization_error", message: "Dashboard requests must come from the dashboard." });
const limited = (message) => ok("Too many attempts.", errBody, { type: "rate_limit_error", message });
const codeFields = { code: str("A 6-digit code from the authenticator app. Needed when two-factor authentication is on."), recovery_code: str("A recovery code (`abcde-fghjk`) instead of `code`.") };
const badCode = ok("Wrong or missing code (`invalid_code`), or an invalid body (`invalid_request`).", errBody, { type: "invalid_code", message: "That code is not right. Check your authenticator app, or use a recovery code." });
const session = obj({
  object: { type: "string", const: "session" }, id: str("A hash of the session, never the cookie."), current: bool("This browser."),
  method: en(["password", "two_factor", "signup", "reset", "invite", "email_change", "sso"], "How the session began."),
  browser: str("From the user agent: Chrome, Safari, Firefox, Edge …"), os: str("macOS, Windows, iOS, Android, Linux …"), user_agent: nstr(), ip: nstr(),
  created_at: ms("When it began."), last_seen_at: ms("Last request (updated at most every 5 minutes)."), expires_at: ms("When it ends."),
});
const prefs = obj({
  weekly_summary: bool("The weekly summary email on the first day of the person's week."), experiment_results: bool("An email when an experiment has enough data and when it ends."),
  anomaly_alerts: bool("Daily revenue anomaly alerts."), anomaly_sensitivity: en(["low", "medium", "high"]),
});

export const accountPaths = {
  "/auth/login/2fa": {
    post: op({ id: "loginTwoFactor", tag: TAG, summary: "Finish a sign-in with a two-factor code", security: NONE, source: AUTH, extension: true,
      description: `
With two-factor authentication on, \`POST /auth/login\` (and \`POST /auth/password/reset\`) answer \`{ "two_factor_required": true, "challenge": "…" }\` without a session. Send the challenge here with a code from the authenticator app or a recovery code. The challenge works once and expires after 10 minutes. A code is never accepted twice.

Limits: 5 attempts per challenge (then sign in again), and 10 wrong codes per account in 15 minutes, counted with the code checks of Account settings (then 429 until 15 minutes after the first). A right code does not count. A password change or reset ends the challenges that began with the old password.`,
      requestBody: body(obj({ challenge: str(undefined, { maxLength: 200 }), ...codeFields }, ["challenge"]), { challenge: "…", code: "123456" }),
      responses: { 200: ok("Signed in; `rd_session` is set. A recovery code also answers how many are left.", obj({ ok: bool(), recovery_codes_left: int() }), { ok: true }),
        400: ok("The challenge expired, was used, or two-factor was turned off (`challenge_invalid` with a `reason`), or a missing challenge (`invalid_request`).", obj({ type: str(), reason: en(["invalid", "expired", "used"]), message: str() })),
        401: ok("Wrong code.", errBody, { type: "authentication_error", message: "That code is not right. Check your authenticator app, or use a recovery code." }), 429: limited("Too many wrong codes. Enter your password again.") } }),
  },
  "/auth/logout/all": {
    post: op({ id: "logoutAll", tag: TAG, summary: "Sign out of every session", security: SESSION, source: AUTH, extension: true,
      description: "Ends every session of the signed-in person, this one included.",
      responses: { 200: ok("Signed out everywhere.", obj({ ok: bool(), sessions_revoked: int() }), { ok: true, sessions_revoked: 3 }), 401: authErr, 403: csrf } }),
  },
  "/auth/email/change": {
    post: op({ id: "changeEmail", tag: TAG, summary: "Change the account's email", security: SESSION, source: SRC, extension: true,
      description: `
Emails a link (\`/confirm-email?token=…\`, 24 hours, works once) to the new address and a notice to the current one. The account keeps its address until the link is used with \`POST /auth/email/change/confirm\`. A new request replaces an open one. Needs the current password, and \`code\` when two-factor authentication is on. 5 requests per hour.`,
      requestBody: body(obj({ new_email: str(undefined, { format: "email", maxLength: 320 }), password: str("The current password."), code: str("With two-factor authentication on.") }, ["new_email"]), { new_email: "dana@newcompany.com", password: "current-password" }),
      responses: { 200: ok("The link was sent.", obj({ ok: bool(), pending_email: obj({ email: str(), expires_at: ms("When the link stops working.") }), notice_sent: bool("Whether the notice to the current address was accepted.") })),
        400: ok("Invalid address, the same address, a wrong password or code.", errBody), 401: authErr, 403: ok("Single sign-on manages one of the addresses (`sso_required`), or a write from another site.", errBody),
        409: ok("Another account uses the address.", errBody, { type: "email_taken", message: "Another RevenueDot account uses that address." }), 429: limited("Too many email changes. Try again in an hour."), 502: ok("The email could not be sent.", errBody) } }),
    delete: op({ id: "cancelEmailChange", tag: TAG, summary: "Cancel a waiting email change", security: SESSION, source: SRC, extension: true,
      description: "The link sent to the new address stops working.",
      responses: { 200: ok("Cancelled.", obj({ ok: bool(), pending_email: { type: "null" } }), { ok: true, pending_email: null }), 401: authErr, 403: csrf } }),
  },
  "/auth/email/change/confirm": {
    post: op({ id: "confirmEmailChange", tag: TAG, summary: "Confirm an email change", security: NONE, source: SRC, extension: true,
      description: "The link from the confirmation email; works in any browser. The dashboard's `/confirm-email` page sends this only when the person clicks **Confirm new email**, never on load, so a mail scanner that opens the link changes nothing. The account moves to the new address, which counts as confirmed, and every link sent to the old address stops working. The old address gets a notice.",
      requestBody: body(obj({ token: str(undefined, { maxLength: 200 }) }, ["token"])),
      responses: { 200: ok("The account uses the new address.", obj({ ok: bool(), email: str() }), { ok: true, email: "dana@newcompany.com" }),
        400: ok("The link is not valid (`token_invalid` with a `reason`).", obj({ type: str(), reason: en(["invalid", "expired", "used"]), message: str() }), { type: "token_invalid", reason: "expired", message: "This link has expired. Change your email again from Account settings." }),
        409: ok("Another account started using the address, even a moment before (`email_taken`).", errBody, { type: "email_taken", message: "Another RevenueDot account started using that address. Pick another one." }) } }),
  },
  "/auth/password/change": {
    post: op({ id: "changePassword", tag: TAG, summary: "Change the password", security: SESSION, source: SRC, extension: true,
      description: "Needs the current password (10 password checks per 15 minutes, counted with two-factor setup, email change and deletion, then 429). Every other session is signed out, open password reset links and half-done two-factor sign-ins stop working, and the account gets an email.",
      requestBody: body(obj({ current_password: str(), new_password: str(undefined, { minLength: 8, maxLength: 200 }) }, ["current_password", "new_password"])),
      responses: { 200: ok("Changed.", obj({ ok: bool(), sessions_revoked: int("Other sessions signed out.") }), { ok: true, sessions_revoked: 1 }),
        400: ok("Wrong current password (`invalid_password`), a short password, the same password, or an account without one (`no_password`).", errBody), 401: authErr,
        403: ok("The account must sign in with single sign-on (`sso_required`), or a write from another site.", errBody), 429: limited("Too many attempts. Try again in 15 minutes.") } }),
  },
  "/auth/sessions": {
    get: op({ id: "listSessions", tag: TAG, summary: "List signed-in sessions", security: SESSION, source: SRC, extension: true,
      description: "This browser first, then the others by last activity.",
      responses: { 200: ok("Sessions.", obj({ object: { type: "string", const: "list" }, items: arr(session) })), 401: authErr } }),
  },
  "/auth/sessions/{session_id}": {
    delete: op({ id: "revokeSession", tag: TAG, summary: "Sign out one session", security: SESSION, source: SRC, extension: true,
      parameters: [{ name: "session_id", in: "path", required: true, schema: str(), description: "The `id` from the list." }],
      responses: { 200: ok("Signed out.", obj({ ok: bool(), id: str(), current: bool("This browser: its cookie is cleared too.") })), 401: authErr, 403: csrf, 404: ok("Already ended.", errBody) } }),
  },
  "/auth/sessions/revoke_others": {
    post: op({ id: "revokeOtherSessions", tag: TAG, summary: "Sign out every other session", security: SESSION, source: SRC, extension: true,
      responses: { 200: ok("Signed out.", obj({ ok: bool(), sessions_revoked: int() }), { ok: true, sessions_revoked: 2 }), 401: authErr, 403: csrf } }),
  },
  "/auth/2fa/setup": {
    post: op({ id: "setupTwoFactor", tag: TAG, summary: "Start two-factor setup", security: SESSION, source: SRC, extension: true,
      description: "A new TOTP secret (RFC 6238: SHA-1, 6 digits, 30 seconds), sealed at rest and answered once as base32 and an `otpauth://` URI for a QR code. Two-factor stays off until `POST /auth/2fa/enable` gets a code from it. Needs the current password.",
      requestBody: body(obj({ password: str("The current password.") })),
      responses: { 200: ok("The secret.", obj({ object: { type: "string", const: "two_factor_setup" }, secret: str("Base32."), otpauth_url: str(), issuer: str(), account: str(), digits: int(), period: int(), algorithm: str() }),
        { object: "two_factor_setup", secret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP", otpauth_url: "otpauth://totp/RevenueDot:dana%40example.com?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=RevenueDot&algorithm=SHA1&digits=6&period=30", issuer: "RevenueDot", account: "dana@example.com", digits: 6, period: 30, algorithm: "SHA1" }),
        400: ok("Wrong password.", errBody), 401: authErr, 403: csrf, 409: ok("Two-factor is already on.", errBody), 429: limited("Too many attempts. Try again in 15 minutes.") } }),
  },
  "/auth/2fa/enable": {
    post: op({ id: "enableTwoFactor", tag: TAG, summary: "Turn two-factor authentication on", security: SESSION, source: SRC, extension: true,
      description: "Checks a code from the pending secret, turns two-factor on and answers 10 recovery codes once (stored as SHA-256; each works once). The account gets an email.",
      requestBody: body(obj({ code: str() }, ["code"]), { code: "123456" }),
      responses: { 200: ok("On.", obj({ ok: bool(), enabled: bool(), recovery_codes: arr(str(), { minItems: 10, maxItems: 10 }) })), 400: badCode, 401: authErr, 403: csrf, 409: ok("Already on, or no setup to finish.", errBody), 429: limited("Too many code attempts. Try again in 15 minutes.") } }),
  },
  "/auth/2fa/disable": {
    post: op({ id: "disableTwoFactor", tag: TAG, summary: "Turn two-factor authentication off", security: SESSION, source: SRC, extension: true,
      description: "Needs a current code or a recovery code. The account gets an email.",
      requestBody: body(obj(codeFields)),
      responses: { 200: ok("Off.", obj({ ok: bool(), enabled: bool() }), { ok: true, enabled: false }), 400: badCode, 401: authErr, 403: csrf, 409: ok("Two-factor is off.", errBody), 429: limited("Too many code attempts. Try again in 15 minutes.") } }),
  },
  "/auth/2fa/recovery_codes": {
    post: op({ id: "newRecoveryCodes", tag: TAG, summary: "Make new recovery codes", security: SESSION, source: SRC, extension: true,
      description: "10 new codes, answered once; the old ones stop working. Needs a current code or a recovery code.",
      requestBody: body(obj(codeFields)),
      responses: { 200: ok("New codes.", obj({ ok: bool(), recovery_codes: arr(str()) })), 400: badCode, 401: authErr, 403: csrf, 409: ok("Two-factor is off.", errBody), 429: limited("Too many code attempts. Try again in 15 minutes.") } }),
  },
  "/auth/oauth_tokens": {
    get: op({ id: "listOAuthTokens", tag: TAG, summary: "List OAuth tokens you granted", security: SESSION, source: SRC, extension: true,
      description: "Keys made by `POST /oauth/token` after you clicked **Allow access** (ChatGPT, Claude, Cursor …), in any project. Keys granted before this list existed are on each project's API keys page.",
      responses: { 200: ok("Tokens.", obj({ object: { type: "string", const: "list" }, items: arr(obj({ object: { type: "string", const: "oauth_token" }, id: str("The API key id."), client: obj({ id: nstr(), name: str(), url: nstr() }), project: obj({ id: str(), name: str() }), access: en(["read", "read_write", "read_write_support"]), key_prefix: str(), created_at: ms("Granted."), last_used_at: nms("Last API call.") })) })), 401: authErr } }),
  },
  "/auth/oauth_tokens/{key_id}": {
    delete: op({ id: "revokeOAuthToken", tag: TAG, summary: "Revoke an OAuth token", security: SESSION, source: SRC, extension: true,
      parameters: [{ name: "key_id", in: "path", required: true, schema: str() }],
      description: "Deletes the key; the app gets 401 on its next call. The project's audit log records it.",
      responses: { 200: ok("Revoked.", obj({ ok: bool(), id: str() })), 401: authErr, 403: csrf, 404: ok("Already revoked, or not yours.", errBody) } }),
  },
  "/auth/stripe_accounts": {
    get: op({ id: "listStripeAccounts", tag: TAG, summary: "List connected Stripe accounts", security: SESSION, source: SRC, extension: true,
      description: "Stripe accounts connected with Connect with Stripe to Stripe apps in your projects (masked), and the Stripe apps you could connect. Connecting and disconnecting happen per app.",
      responses: { 200: ok("Accounts.", obj({ object: { type: "string", const: "list" }, available: bool("Whether this server can connect Stripe accounts."), unavailable_reason: nstr(),
        items: arr(obj({ object: { type: "string", const: "stripe_account" }, app: obj({ id: str(), name: str() }), project: obj({ id: str(), name: str() }), role: str(), account: nstr("acct_…1234"), mode: en(["live", "test"]), method: nstr("oauth or account_link."), charges_enabled: { type: ["boolean", "null"] }, details_submitted: { type: ["boolean", "null"] }, connected_at: nms("Connected.") })),
        connectable_apps: arr(obj({ app: obj({ id: str(), name: str() }), project: obj({ id: str(), name: str() }) })) })), 401: authErr } }),
  },
  "/auth/account/projects": {
    get: op({ id: "listAccountProjects", tag: TAG, summary: "List your projects with role and plan", security: SESSION, source: SRC, extension: true,
      description: "Owned projects first. `plan` is the owner's RevenueDot Cloud plan, or Self-hosted.",
      responses: { 200: ok("Projects.", obj({ object: { type: "string", const: "list" }, edition: en(["cloud", "self-hosted"]), items: arr(obj({ object: { type: "string", const: "account_project" }, id: str(), name: str(), role: str("admin, developer, viewer, or a custom role id (RevenueDot Enterprise)."), is_owner: bool(), members: int(), owner: { type: ["object", "null"], properties: { id: str(), name: nstr(), email: str() } }, plan: obj({ id: str(), name: str() }), created_at: ms("Created.") })) })), 401: authErr } }),
  },
  "/auth/account/delete": {
    get: op({ id: "checkAccountDeletion", tag: TAG, summary: "What deleting the account would do", security: SESSION, source: SRC, extension: true,
      description: "Whether deletion is allowed now; if not, why (`ownership_transfer_required` with the projects, `billing_active`, or an enterprise refusal); if so, which projects are deleted with it and which are left.",
      responses: { 200: ok("The check.", obj({ object: { type: "string", const: "account_deletion" }, allowed: bool(), type: str(), message: str(), projects: arr(obj({ id: str(), name: str(), reason: en(["owner", "last_admin"]), members: int() })), projects_deleted: arr(obj({ id: str(), name: str() })), projects_left: arr(obj({ id: str(), name: str() })) })), 401: authErr } }),
    post: op({ id: "deleteAccount", tag: TAG, summary: "Delete the account", security: SESSION, source: SRC, extension: true,
      description: `
Refused (409) while you own a project with other members or are the last admin of one (\`ownership_transfer_required\`), while Cloud Standard is active (\`billing_active\`), or when an enterprise organization still needs you as its owner (\`extension_refused\`). Deletes the account, its sessions, links, recovery codes, preferences and AI conversations, the OAuth keys listed by \`GET /auth/oauth_tokens\`, and the projects where you are the only member. Audit log entries stay, and every project you leave gets a \`collaborator_account_deleted\` entry with your email. Sends a confirmation email and clears the cookie.`,
      requestBody: body(obj({ email: str("Your email, typed to confirm."), password: str("Needed when the account has a password."), ...codeFields }, ["email"]), { email: "dana@example.com", password: "current-password" }),
      responses: { 200: ok("Deleted.", obj({ ok: bool(), deleted: bool(), projects_deleted: arr(str()) }), { ok: true, deleted: true, projects_deleted: [] }),
        400: ok("The typed email does not match (`confirmation_mismatch`), or a wrong password or code.", errBody), 401: authErr, 403: csrf,
        409: ok("Not now: see the type.", obj({ type: en(["ownership_transfer_required", "billing_active", "extension_refused"]), message: str(), projects: arr(obj({ id: str(), name: str(), reason: str(), members: int() })) })), 429: limited("Too many attempts. Try again in 15 minutes.") } }),
  },
  "/auth/notifications": {
    get: op({ id: "getNotificationSettings", tag: TAG, summary: "Get notification choices", security: SESSION, source: SRC, extension: true,
      description: "Alert emails (on by default), and per project the weekly summary, experiment results and revenue anomaly alerts, which are off until you turn them on.",
      responses: { 200: ok("Choices.", obj({ object: { type: "string", const: "notification_settings" }, alert_emails: bool(), integration_alert_emails: bool("Integration failure alerts, on by default."), projects: arr(obj({ project: obj({ id: str(), name: str(), role: str("admin, developer, viewer, or a custom role id (RevenueDot Enterprise).") }), ...prefs.properties })) })), 401: authErr } }),
  },
  "/auth/notifications/unsubscribe/{token}": {
    get: op({ id: "showUnsubscribe", tag: TAG, summary: "Open an email's unsubscribe link", security: NONE, source: SRC, extension: true,
      parameters: [{ name: "token", in: "path", required: true, schema: str(), description: "From the email's Unsubscribe link or its `List-Unsubscribe` header." }],
      description: "An HTML page with an **Unsubscribe** button. Opening the link changes nothing, because mail scanners open links too.",
      responses: { 200: ok("The page.", { type: "string", description: "text/html" }), 404: ok("Unknown link (an HTML page).", { type: "string", description: "text/html" }) } }),
    post: op({ id: "unsubscribe", tag: TAG, summary: "Unsubscribe from one email", security: NONE, source: SRC, extension: true,
      parameters: [{ name: "token", in: "path", required: true, schema: str() }],
      description: "Turns off the email this link came with (the weekly summary, experiment results or revenue anomaly alerts) for that one project, without a session. Each such email carries `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`, so mail apps can send this POST themselves (RFC 8058).",
      responses: { 200: ok("Unsubscribed (an HTML page).", { type: "string", description: "text/html" }), 404: ok("Unknown link (an HTML page).", { type: "string", description: "text/html" }) } }),
  },
  "/auth/notifications/{project_id}": {
    put: op({ id: "updateNotificationSettings", tag: TAG, summary: "Choose a project's emails", security: SESSION, source: SRC, extension: true,
      parameters: [{ name: "project_id", in: "path", required: true, schema: str() }],
      description: "Send only the fields to change. Any member of the project may choose.",
      requestBody: body(prefs, { weekly_summary: true, anomaly_alerts: true, anomaly_sensitivity: "medium" }),
      responses: { 200: ok("Saved.", obj({ object: { type: "string", const: "project_notifications" }, project_id: str(), ...prefs.properties })), 400: ok("Invalid field.", errBody), 401: authErr, 403: csrf, 404: ok("Not a member of the project.", errBody) } }),
  },
  "/auth/fx": {
    get: op({ id: "getDisplayRate", tag: TAG, summary: "The display currency's exchange rate", security: SESSION, source: SRC, extension: true,
      parameters: [{ name: "currency", in: "query", schema: str(), description: "Default: your display currency. One of USD, EUR, GBP, AUD, CAD, JPY, BRL, KRW, CNY, MXN, SEK, PLN, NZD, CHF." }],
      description: "Units of the currency per 1 USD on the latest day with a European Central Bank reference rate (cached, with bundled rates when the source cannot be reached). The dashboard multiplies USD amounts by it.",
      responses: { 200: ok("The rate.", obj({ object: { type: "string", const: "fx_rate" }, base: { type: "string", const: "USD" }, currency: str(), rate: num(), date: str("YYYY-MM-DD."), source: en(["ecb", "currency-api", "identity"], "identity: USD itself.") }), { object: "fx_rate", base: "USD", currency: "EUR", rate: 0.8531, date: "2026-10-01", source: "ecb" }), 400: ok("Unknown currency.", errBody), 401: authErr,
        502: ok("No exchange rate for that currency right now.", errBody) } }),
  },
};

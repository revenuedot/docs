// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: Project settings tabs (ownership, Brand, Blocked customers, Verified Metrics) and Auth (sign-in with Firebase
// or OpenID Connect, providers, identities) in the OpenAPI document. RevenueDot extensions.
// Docs: https://revenuedot.app/docs/guides/project-settings  https://revenuedot.app/docs/guides/auth
import { NONE, SECRET, SESSION, arr, body, bool, en, int, listOf, ms, nms, nstr, obj, ok, op, param, ref, str, v1Errors, v2Errors } from "./common.mjs";

const P = "/v2/projects/{project_id}";
const project = param("ProjectId");
const page = [param("Limit"), param("StartingAfter")];
const E = (...c) => v2Errors(401, 403, ...c);
const SETUP = "routes/v2/setup.ts", SETTINGS = "routes/v2/project-settings.ts", PAYWALLS = "routes/v2/paywalls.ts", AUTH = "routes/v2/auth.ts", ID = "routes/identity.ts", PUB = "routes/verified.ts";
const PREAD = ["project_configuration:projects:read"], PWRITE = ["project_configuration:projects:read_write"];
const CREAD = ["customer_information:customers:read"], CWRITE = ["customer_information:customers:read_write"];
const v2 = (o) => op({ security: SECRET, extension: true, ...o });
const path = (name, description) => ({ name, in: "path", required: true, schema: str(), description });
const APP_KEY = [{ publicApiKey: [] }];

// ---- Ownership ----------------------------------------------------------------------------------------------------------
const settingsPaths = {
  [`${P}/actions/transfer_ownership`]: {
    post: op({ id: "transferProjectOwnership", tag: "Project settings", summary: "Transfer project ownership to an admin", security: SESSION, source: SETUP, extension: true, scopes: PWRITE, parameters: [project],
      description: "Only the owner (any admin when the owner has left the project) signed in to the dashboard. The new owner must already be a collaborator with the Admin role (422 otherwise). The previous owner stays an admin. Both get an email; `email_sent` is false when either could not be sent. Recorded in the audit log as `project_transfer_ownership`.",
      requestBody: body(obj({ user_id: str("The new owner's user id, from the collaborators list.") }, ["user_id"]), { user_id: "usr_8f2kq0x1m3zv7a2b" }),
      responses: { 200: ok("The project with its new owner.", { allOf: [ref("ProjectSettings"), obj({ email_sent: bool() })] }), ...v2Errors(400, 401, 403, 404, 422) } }),
  },
};

// ---- Brand ----------------------------------------------------------------------------------------------------------------
const hex = (d) => str(d ?? "`#RRGGBB` or `#RRGGBBAA`; answers are lower case with alpha.");
const point = obj({ color: hex(), percent: int("0 to 100.") }, ["color", "percent"]);
const colorPreset = obj({ key: str("a-z, 0-9 and _; the name in `ui_config.app.colors`. Unique across colour and gradient presets."), name: str(undefined, { maxLength: 60 }), light: hex(), dark: { type: ["string", "null"], description: "Null: the light colour in dark mode too." } }, ["key", "name", "light"]);
const gradientPreset = obj({
  key: str("Unique across colour and gradient presets."), name: str(), type: en(["linear", "radial"]), degrees: int("Linear only, 0 to 360. Default 180."),
  points: arr(point, { minItems: 2, maxItems: 10 }), dark_points: { type: ["array", "null"], items: point, description: "Null: the light stops in dark mode too." },
}, ["key", "name", "type", "points"]);
const brand = obj({ object: en(["brand"]), color_presets: arr(colorPreset, { maxItems: 50 }), gradient_presets: arr(gradientPreset, { maxItems: 50 }) }, ["object", "color_presets", "gradient_presets"]);
const brandExample = {
  object: "brand",
  color_presets: [{ key: "ink", name: "Ink", light: "#0a0a0aff", dark: "#fafafaff" }, { key: "gold", name: "Brand gold", light: "#f7b500ff", dark: null }],
  gradient_presets: [{ key: "sunrise", name: "Sunrise", type: "linear", degrees: 135, points: [{ color: "#f7b500ff", percent: 0 }, { color: "#c2410cff", percent: 100 }], dark_points: null }],
};
Object.assign(settingsPaths, {
  [`${P}/brand`]: {
    get: v2({ id: "getBrand", tag: "Brand", summary: "Colour and gradient presets", source: SETTINGS, scopes: PREAD, parameters: [project],
      responses: { 200: ok("The presets.", brand, brandExample), ...E(404) } }),
    post: v2({ id: "updateBrand", tag: "Brand", summary: "Replace colour or gradient presets", source: SETTINGS, scopes: PWRITE, parameters: [project],
      description: "Send a whole list to replace it; a list you leave out is kept. The paywall editor shows the presets in its colour pickers, and the SDKs receive every preset as a named colour in the offerings' `ui_config.app.colors` (a paywall colour `{\"type\": \"alias\", \"value\": \"<key>\"}` uses it). A deleted preset that a paywall names this way draws nothing in the SDK, so presets picked in the editor are copied as values.",
      requestBody: body(obj({ color_presets: arr(colorPreset, { maxItems: 50 }), gradient_presets: arr(gradientPreset, { maxItems: 50 }) }), { color_presets: [{ key: "ink", name: "Ink", light: "#0A0A0A", dark: "#FAFAFA" }] }),
      responses: { 200: ok("The presets.", brand, brandExample), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/fonts/{font_id}`]: {
    delete: v2({ id: "deleteFont", tag: "Paywalls", summary: "Delete an uploaded font", source: PAYWALLS, scopes: ["project_configuration:offerings:read_write"], parameters: [project, path("font_id", "Starts with fnt.")],
      description: "Paywalls that still name the font show the system font in the SDKs.",
      responses: { 200: ok("Deleted.", obj({ object: en(["font"]), id: str(), deleted_at: ms("When it was deleted.") }, ["object", "id", "deleted_at"])), ...E(404) } }),
  },
});

// ---- Blocked customers --------------------------------------------------------------------------------------------------
const blocked = obj({
  object: en(["blocked_customer"]), id: str("The app user id."), app_user_id: str(), note: nstr("Why, for your team."), blocked_at: ms("When it was blocked."),
  blocked_by: { type: ["object", "null"], properties: { type: en(["user", "api_key"]), id: str(), email: nstr("The dashboard user's email.") }, description: "Who blocked it." },
  customer_exists: bool("Whether a customer has this app user id yet."),
}, ["object", "app_user_id", "blocked_at"]);
const blockedExample = { object: "blocked_customer", id: "user_4471", app_user_id: "user_4471", note: "Chargeback abuse", blocked_at: 1790894800000, blocked_by: { type: "user", id: "usr_8f2kq0x1m3zv7a2b", email: "support@example.com" }, customer_exists: true };
const appUserId = path("app_user_id", "URL-encoded.");
Object.assign(settingsPaths, {
  [`${P}/blocked_customers`]: {
    get: v2({ id: "listBlockedCustomers", tag: "Blocked customers", summary: "List blocked app user ids", source: SETTINGS, scopes: CREAD,
      parameters: [project, { name: "search", in: "query", schema: str(), description: "Part of an app user id." }, ...page],
      description: "Newest first.",
      responses: { 200: ok("Blocked app user ids.", listOf(blocked), { object: "list", items: [blockedExample], next_page: null, url: "/v2/projects/proj1a2b3c4d/blocked_customers" }), ...v2Errors(400, 401, 403, 404) } }),
    post: v2({ id: "blockCustomer", tag: "Blocked customers", summary: "Block an app user id", source: SETTINGS, scopes: CWRITE, parameters: [project],
      description: "The customer with this app user id (any of its aliases) loses access to paid features on every platform: customer info has no entitlements, API v2 `active_entitlements` is empty, targeting sees none, and purchases credit no in-app currency. Purchases are still recorded and webhooks are still sent, with their usual `entitlement_ids`; if you grant access from webhooks, check this list. The id need not exist yet. 201 when blocked now, 200 when it already was.",
      requestBody: body(obj({ app_user_id: str(undefined, { maxLength: 100 }), note: nstr(undefined, { maxLength: 500 }) }, ["app_user_id"]), { app_user_id: "user_4471", note: "Chargeback abuse" }),
      responses: { 201: ok("Blocked.", blocked, blockedExample), 200: ok("Already blocked.", blocked, blockedExample), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/blocked_customers/{app_user_id}`]: {
    get: v2({ id: "getBlockedCustomer", tag: "Blocked customers", summary: "Is this app user id blocked?", source: SETTINGS, scopes: CREAD, parameters: [project, appUserId],
      responses: { 200: ok("Blocked.", blocked, blockedExample), ...E(404) } }),
    delete: v2({ id: "unblockCustomer", tag: "Blocked customers", summary: "Unblock an app user id", source: SETTINGS, scopes: CWRITE, parameters: [project, appUserId],
      description: "Access comes back at once.",
      responses: { 200: ok("Unblocked.", obj({ object: en(["blocked_customer"]), id: str(), app_user_id: str(), unblocked_at: ms("When.") }, ["object", "app_user_id", "unblocked_at"])), ...E(404) } }),
  },
});

// ---- Verified Metrics ---------------------------------------------------------------------------------------------------
const METRICS = ["mrr", "revenue", "active_subscriptions", "active_trials", "new_customers", "active_users"];
const vmFields = {
  slug: str("3 to 40 characters: a-z, 0-9 and single dashes, not at either end. Unique on the server; a few words such as `admin` are reserved."),
  display_name: str(undefined, { maxLength: 60 }),
  chart_type: en(["number_sparkline"], "Number & sparklines, the only type."),
  metrics: arr(obj({ id: en(METRICS), visible: bool() }, ["id", "visible"]), { minItems: 6, maxItems: 6, description: "The 6 overview metrics in display order, each once." }),
  show_icon: bool(), icon_asset_id: nstr("An image uploaded with `POST /v2/projects/{project_id}/media_assets`."),
  show_store_links: bool(), app_store_url: nstr("https on apps.apple.com."), play_store_url: nstr("https on play.google.com."),
};
const vm = obj({
  object: en(["verified_metrics"]), status: en(["never_published", "published", "inactive"]), ...vmFields,
  url: str("The public page, on the API host."), published_at: nms("Last publish."), updated_at: nms("Last save."),
}, ["object", "status", "slug", "display_name", "metrics", "url"]);
const vmExample = {
  object: "verified_metrics", status: "published", slug: "scanner", display_name: "Scanner", chart_type: "number_sparkline",
  metrics: METRICS.map((id, i) => ({ id, visible: i < 4 })), show_icon: false, icon_asset_id: null, show_store_links: true,
  app_store_url: "https://apps.apple.com/app/id1234567890", play_store_url: null, url: "https://api.revenuedot.app/verified/scanner", published_at: 1790894800000, updated_at: 1790894800000,
};
const slugParam = path("slug", "The page's slug.");
Object.assign(settingsPaths, {
  [`${P}/verified_metrics`]: {
    get: v2({ id: "getVerifiedMetrics", tag: "Verified Metrics", summary: "Verified Metrics page settings", source: SETTINGS, scopes: PREAD, parameters: [project],
      description: "A project that never saved the page gets a draft: a free slug from the project name, all six metrics shown.",
      responses: { 200: ok("The settings.", vm, vmExample), ...E(404) } }),
    post: v2({ id: "updateVerifiedMetrics", tag: "Verified Metrics", summary: "Save Verified Metrics page settings", source: SETTINGS, scopes: PWRITE, parameters: [project],
      description: "A published page shows the change within 15 minutes (the cached copies are dropped on Cloud at once). 409 when another project uses the slug.",
      requestBody: body(obj(vmFields), { display_name: "Scanner Pro", show_store_links: true, app_store_url: "https://apps.apple.com/app/id1234567890" }),
      responses: { 200: ok("The settings.", vm, vmExample), ...v2Errors(400, 401, 403, 404, 409) } }),
  },
  [`${P}/verified_metrics/slug_availability`]: {
    get: v2({ id: "checkVerifiedSlug", tag: "Verified Metrics", summary: "Whether a slug is free", source: SETTINGS, scopes: PREAD,
      parameters: [project, { name: "slug", in: "query", required: true, schema: str() }],
      responses: { 200: ok("The answer.", obj({ object: en(["slug_availability"]), slug: str(), available: bool(), reason: nstr() }, ["object", "slug", "available"]), { object: "slug_availability", slug: "scanner", available: true, reason: null }), ...E(404) } }),
  },
  [`${P}/verified_metrics/actions/publish`]: {
    post: v2({ id: "publishVerifiedMetrics", tag: "Verified Metrics", summary: "Publish the page", source: SETTINGS, scopes: PWRITE, parameters: [project],
      description: "Takes the same fields as the update, saves them and publishes. The page then answers at `/verified/{slug}`.",
      requestBody: body(obj(vmFields), { slug: "scanner" }, false),
      responses: { 200: ok("The settings, published.", vm, vmExample), ...v2Errors(400, 401, 403, 404, 409) } }),
  },
  [`${P}/verified_metrics/actions/unpublish`]: {
    post: v2({ id: "unpublishVerifiedMetrics", tag: "Verified Metrics", summary: "Unpublish the page", source: SETTINGS, scopes: PWRITE, parameters: [project],
      description: "The page answers 404 at once; the status becomes `inactive`. 422 when it is not published.",
      responses: { 200: ok("The settings.", vm, { ...vmExample, status: "inactive" }), ...v2Errors(401, 403, 404, 422) } }),
  },
  "/verified/{slug}": {
    get: op({ id: "verifiedPage", tag: "Verified Metrics", summary: "The public Verified Metrics page", security: NONE, source: PUB, extension: true, parameters: [slugParam],
      description: "HTML with no scripts: the display name, the visible metrics with 28-day sparklines, optional icon and store links, and link-preview tags pointing at `og.png`. Only aggregate production numbers: no customers, no sandbox data, no project id. `Cache-Control: public, max-age=300, s-maxage=900`, an ETag (304 on `If-None-Match`), and on Cloud a copy in the edge cache keyed by the page's version, so a saved page shows its changes at once. The slug is case-insensitive. 404 with `no-store` when the slug is unknown or not published.",
      responses: { 200: { description: "The page.", content: { "text/html": { schema: str() } } }, 404: ok("Not published.", obj({ object: en(["error"]), type: str(), message: str() })) } }),
  },
  "/verified/{slug}/metrics.json": {
    get: op({ id: "verifiedPageData", tag: "Verified Metrics", summary: "The page's numbers as JSON", security: NONE, source: PUB, extension: true, parameters: [slugParam],
      description: "Same caching as the page. `computed_at` is when the numbers were computed. `icon_url` is `/verified/{slug}/icon?v=<asset id>` when the page shows an icon.",
      responses: { 200: ok("The numbers.", obj({
        object: en(["verified_metrics_page"]), url: str(), slug: str(), display_name: str(), chart_type: str(), computed_at: ms("When the numbers were computed."), icon_url: nstr(),
        store_links: obj({ app_store: nstr(), play_store: nstr() }),
        metrics: arr(obj({ id: en(METRICS), name: str(), unit: en(["$", "#"]), caption: str(), value: { type: "number" }, sparkline: arr({ type: "number" }, { description: "One value per UTC day, oldest first (28 days; empty for active customers)." }) })),
      }), { object: "verified_metrics_page", url: "https://api.revenuedot.app/verified/scanner", slug: "scanner", display_name: "Scanner", chart_type: "number_sparkline", computed_at: 1790894800000, icon_url: null, store_links: { app_store: "https://apps.apple.com/app/id1234567890", play_store: null }, metrics: [{ id: "mrr", name: "MRR", unit: "$", caption: "Monthly recurring revenue", value: 93.4, sparkline: [88.1, 90.2, 93.4] }] }),
        404: ok("Not published.", obj({ object: en(["error"]), type: str(), message: str() })) } }),
  },
  "/verified/{slug}/icon": {
    get: op({ id: "verifiedPageIcon", tag: "Verified Metrics", summary: "The page's project icon", security: NONE, source: PUB, extension: true, parameters: [slugParam],
      description: "The uploaded image the page shows as its icon, served by slug so the page never names the project. Same caching as the page; 404 when the page is not published or shows no icon.",
      responses: { 200: { description: "The image (PNG, JPEG or WebP).", content: { "image/png": { schema: str(undefined, { format: "binary" }) } } }, 404: ok("Not published, or no icon.", obj({ object: en(["error"]), type: str(), message: str() })) } }),
  },
  "/verified/{slug}/og.png": {
    get: op({ id: "verifiedPageImage", tag: "Verified Metrics", summary: "The page's 1200×630 link preview", security: NONE, source: PUB, extension: true, parameters: [slugParam],
      description: "A PNG drawn on the server: the display name and up to three visible metrics with sparklines.",
      responses: { 200: { description: "The image.", content: { "image/png": { schema: str(undefined, { format: "binary" }) } } }, 404: ok("Not published.", obj({ object: en(["error"]), type: str(), message: str() })) } }),
  },
});

// ---- Auth: configuration ------------------------------------------------------------------------------------------------
const settings = obj({ object: en(["auth_settings"]), enabled: bool("Sign-ins are refused while false."), allow_anonymous: bool("Allow `method: anonymous` sign-ins, which create an anonymous app user id.") }, ["object", "enabled", "allow_anonymous"]);
const providerIn = {
  name: str(undefined, { maxLength: 60 }),
  firebase_project_id: str("Firebase only. Tokens must have `iss` https://securetoken.google.com/<id> and `aud` <id>."),
  issuer: str("OpenID Connect only: exactly the tokens' `iss`."),
  audiences: arr(str(), { maxItems: 10, description: "OpenID Connect only: client ids a token's `aud` must name one of." }),
  jwks_url: nstr("OpenID Connect only. Null: `jwks_uri` from `<issuer>/.well-known/openid-configuration`. On Cloud it must be a public https URL."),
  app_user_id_claim: str("The claim that becomes the app user id. Default `sub`."),
  app_user_id_prefix: str("Put in front of the claim, such as `firebase:`. Default empty."),
  enabled: bool(),
};
const provider = obj({
  object: en(["auth_provider"]), id: str("Starts with idp."), kind: en(["firebase", "oidc"]), name: str(), issuer: str(), audiences: arr(str()), firebase_project_id: nstr(),
  jwks_url: nstr("Where the keys come from; null while discovery has not run."), jwks_source: en(["configured", "firebase", "discovery"]),
  app_user_id_claim: str(), app_user_id_prefix: str(), enabled: bool(), created_at: ms("Creation time."), updated_at: ms("Last change."),
}, ["object", "id", "kind", "issuer", "audiences", "app_user_id_claim", "enabled"]);
const providerExample = { object: "auth_provider", id: "idp_4f1c9a2b7e3d", kind: "firebase", name: "Firebase (scanner-1a2b3)", issuer: "https://securetoken.google.com/scanner-1a2b3", audiences: ["scanner-1a2b3"], firebase_project_id: "scanner-1a2b3", jwks_url: "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com", jwks_source: "firebase", app_user_id_claim: "sub", app_user_id_prefix: "", enabled: true, created_at: 1790894800000, updated_at: 1790894800000 };
const identity = obj({ object: en(["auth_identity"]), provider_id: str(), subject: str("The token's `sub`."), app_user_id: str(), logins: int("Sign-ins so far."), last_login_at: ms("Last sign-in."), created_at: ms("First sign-in.") }, ["object", "provider_id", "subject", "app_user_id"]);
const identityExample = { object: "auth_identity", provider_id: "idp_4f1c9a2b7e3d", subject: "Xk2f9QpL0aZ", app_user_id: "Xk2f9QpL0aZ", logins: 12, last_login_at: 1790894800000, created_at: 1790800000000 };
const providerId = path("provider_id", "Starts with idp.");
const A = `${P}/auth`;
const authConfigPaths = {
  [`${A}/settings`]: {
    get: v2({ id: "getAuthSettings", tag: "Auth", summary: "Auth on or off", source: AUTH, scopes: PREAD, parameters: [project], responses: { 200: ok("The settings.", settings, { object: "auth_settings", enabled: true, allow_anonymous: false }), ...E(404) } }),
    post: v2({ id: "updateAuthSettings", tag: "Auth", summary: "Turn Auth or anonymous sign-in on or off", source: AUTH, scopes: PWRITE, parameters: [project],
      requestBody: body(obj({ enabled: bool(), allow_anonymous: bool() }), { enabled: true }), responses: { 200: ok("The settings.", settings), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${A}/providers`]: {
    get: v2({ id: "listAuthProviders", tag: "Auth", summary: "List identity providers", source: AUTH, scopes: PREAD, parameters: [project, ...page],
      responses: { 200: ok("Providers.", listOf(provider), { object: "list", items: [providerExample], next_page: null, url: "/v2/projects/proj1a2b3c4d/auth/providers" }), ...v2Errors(400, 401, 403, 404) } }),
    post: v2({ id: "createAuthProvider", tag: "Auth", summary: "Add a Firebase or OpenID Connect provider", source: AUTH, scopes: PWRITE, parameters: [project],
      description: "Up to 10 per project. Google, Apple, Auth0, Clerk, Supabase and Cognito are OpenID Connect providers: Google's issuer is `https://accounts.google.com`, Apple's `https://appleid.apple.com`.",
      requestBody: body({ ...obj({ kind: en(["firebase", "oidc"]), ...providerIn }), required: ["kind"] }, { kind: "oidc", issuer: "https://scanner.eu.auth0.com/", audiences: ["sBk2x9Lq0aZ"], app_user_id_prefix: "auth0:" }),
      responses: { 201: ok("The provider.", provider, providerExample), ...v2Errors(400, 401, 403, 404, 422) } }),
  },
  [`${A}/providers/{provider_id}`]: {
    get: v2({ id: "getAuthProvider", tag: "Auth", summary: "Get an identity provider", source: AUTH, scopes: PREAD, parameters: [project, providerId], responses: { 200: ok("The provider.", provider, providerExample), ...E(404) } }),
    post: v2({ id: "updateAuthProvider", tag: "Auth", summary: "Update or turn off an identity provider", source: AUTH, scopes: PWRITE, parameters: [project, providerId],
      description: "Send only what changes. People who already signed in keep their app user id when the mapping changes.",
      requestBody: body(obj(providerIn), { enabled: false }), responses: { 200: ok("The provider.", provider), ...v2Errors(400, 401, 403, 404) } }),
    delete: v2({ id: "deleteAuthProvider", tag: "Auth", summary: "Delete an identity provider", source: AUTH, scopes: PWRITE, parameters: [project, providerId],
      description: "Ends every session it signed in and removes its identity links. App user ids, purchases and balances stay.",
      responses: { 200: ok("Deleted.", obj({ object: en(["auth_provider"]), id: str(), deleted_at: ms("When.") }, ["object", "id", "deleted_at"])), ...E(404) } }),
  },
  [`${A}/providers/{provider_id}/actions/test`]: {
    post: v2({ id: "testAuthProvider", tag: "Auth", summary: "Check an ID token without signing in", source: AUTH, scopes: PREAD, parameters: [project, providerId],
      description: "Runs every check of a sign-in and reports the app user id it would sign in as. Nothing is stored. A token that fails answers 200 with `valid: false` and the reason.",
      requestBody: body(obj({ id_token: str() }, ["id_token"]), { id_token: "eyJhbGciOiJSUzI1NiIsImtpZCI6…" }),
      responses: { 200: ok("The result.", obj({ object: en(["auth_token_test"]), valid: bool(), subject: nstr(), app_user_id: nstr(), linked: bool("Whether this identity signed in before."), claims: { type: ["object", "null"], description: "The standard claims and the mapped claim." }, error: nstr() }, ["object", "valid"]),
        { object: "auth_token_test", valid: true, subject: "Xk2f9QpL0aZ", app_user_id: "Xk2f9QpL0aZ", linked: false, claims: { iss: "https://securetoken.google.com/scanner-1a2b3", aud: "scanner-1a2b3", sub: "Xk2f9QpL0aZ", exp: 1790898400 }, error: null }), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${A}/identities`]: {
    get: v2({ id: "listAuthIdentities", tag: "Auth", summary: "List signed-in identities", source: AUTH, scopes: CREAD,
      parameters: [project, { name: "provider_id", in: "query", schema: str() }, { name: "subject", in: "query", schema: str() }, { name: "app_user_id", in: "query", schema: str() }, ...page],
      description: "Most recent sign-in first.",
      responses: { 200: ok("Identities.", listOf(identity), { object: "list", items: [identityExample], next_page: null, url: "/v2/projects/proj1a2b3c4d/auth/identities" }), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${A}/identities/{provider_id}/{subject}`]: {
    get: v2({ id: "getAuthIdentity", tag: "Auth", summary: "Read a signed-in user's balances and entitlements by identity", source: AUTH, scopes: CREAD, parameters: [project, providerId, path("subject", "The provider's user id (`sub`), URL-encoded.")],
      description: "For your backend: look up a user by the provider's user id (a Firebase uid, an Auth0 `sub`) and read their in-app currency balances and active entitlements, without knowing the app user id.",
      responses: { 200: ok("The identity.", { allOf: [identity, obj({ customer_id: nstr("The customer's original app user id, or null before their first SDK call."), active_entitlements: arr(obj({ lookup_key: str(), expires_at: nms("When access ends.") })), virtual_currencies: { type: "object", additionalProperties: obj({ balance: int(), name: str(), code: str() }) } })] },
        { ...identityExample, customer_id: "Xk2f9QpL0aZ", active_entitlements: [{ lookup_key: "pro", expires_at: 1793486800000 }], virtual_currencies: { GEMS: { balance: 40, name: "Gems", code: "GEMS" } } }), ...E(404) } }),
    delete: v2({ id: "deleteAuthIdentity", tag: "Auth", summary: "Unlink an identity and sign it out", source: AUTH, scopes: CWRITE, parameters: [project, providerId, path("subject", "URL-encoded.")],
      description: "Ends its sessions at once. The next sign-in maps the identity again with the provider's current mapping.",
      responses: { 200: ok("Unlinked.", obj({ object: en(["auth_identity"]), provider_id: str(), subject: str(), deleted_at: ms("When.") }, ["object", "provider_id", "subject", "deleted_at"])), ...E(404) } }),
  },
};

// ---- Auth: sign-in (the SDKs' token login) ------------------------------------------------------------------------------
const tokens = obj({
  access_token: str("A subscriber access token for one hour: an Ed25519-signed JWT (`typ: at+jwt`) whose `rc.app_user_id` is the app user id. Send it as `Authorization: Bearer` on `/v1/customer/*`. The server looks it up by hash; its claims are informational."),
  refresh_token: str("`rdrf_…`, 30 days, replaced on every refresh."),
  id_token: str("Ed25519 JWT with `iss` (this server), `sub` and `rc.app_user_id` (the app user id), `aud` (the app id), `amr` (the sign-in method), `idp` (the provider id), `iat`, `exp`. Verify it with `GET /.well-known/jwks.json`."),
  scope: str(), expires_in: int("Seconds the access token lasts (3600)."), token_type: en(["Bearer"]),
}, ["access_token", "refresh_token", "id_token", "scope", "expires_in"]);
const tokensExample = { access_token: "eyJhbGciOiJFZERTQSIsInR5cCI6ImF0K2p3dCIsImtpZCI6IjNmMmMxYTlkMGU4YjRjNzEifQ.eyJpc3MiOiJodHRwczovL2FwaS5yZXZlbnVlZG90LmFwcCIsInN1YiI6IlhrMmY5UXBMMGFaIiwicmMuYXBwX3VzZXJfaWQiOiJYazJmOVFwTDBhWiIsImFtciI6WyJmaXJlYmFzZSJdfQ.…", refresh_token: "rdrf_9b0c…", id_token: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.…", scope: "openid offline_access", expires_in: 3600, token_type: "Bearer" };
const loginBody = obj({
  method: en(["firebase", "oidc", "google", "apple", "facebook", "anonymous"], "`firebase` uses the project's Firebase provider; the others its OpenID Connect providers (the token's `iss` picks one). `anonymous` needs `allow_anonymous`."),
  scope: str("The SDK sends `openid offline_access`."), id_token: str("The provider's ID token. Not for `anonymous`."),
  link_to_id: str("The app user id the app used before signing in. An anonymous id (`$RCAnonymousID:…`) merges into the signed-in user like `logIn`; any other id is ignored."),
}, ["method"]);
const loginOp = (id, src, desc) => op({ id, tag: "Auth sign-in", summary: "Sign in with an identity provider's ID token", security: APP_KEY, source: src, extension: true, description: desc,
  requestBody: body(loginBody, { method: "firebase", scope: "openid offline_access", id_token: "eyJhbGciOiJSUzI1NiIsImtpZCI6…", link_to_id: "$RCAnonymousID:9f3c1a0e2b7d4c5a8e6f1b2d3c4a5e6f" }),
  responses: { 200: ok("Signed in.", tokens, tokensExample), 400: ok("Malformed body (7226).", ref("V1Error"), { code: 7226, message: "method is required: firebase, oidc or anonymous." }), 401: ok("The SDK key is unknown (7225) or the ID token fails verification (7224).", ref("V1Error"), { code: 7224, message: "The ID token has expired." }), 403: ok("Auth is off, or no enabled provider answers this method (7224).", ref("V1Error"), { code: 7224, message: "Auth is turned off for this project. Turn it on in the dashboard under Auth." }), 503: ok("The provider's keys could not be loaded, or the server has no key to sign tokens with. Retry.", ref("V1Error"), { code: 7110, message: "The provider's signing keys could not be loaded: HTTP 503 Try again in a minute." }) } });
const refreshOp = (id, src) => op({ id, tag: "Auth sign-in", summary: "Refresh the access token", security: APP_KEY, source: src, extension: true,
  description: "The refresh token is replaced: the old one stops working, and using it again answers 401 with 7224.",
  requestBody: body(obj({ grant_type: en(["refresh_token"]), refresh_token: str(), scope: str() }, ["grant_type", "refresh_token"]), { grant_type: "refresh_token", refresh_token: "rdrf_9b0c…" }),
  responses: { 200: ok("New tokens.", tokens, tokensExample), ...v1Errors(400, 401) } });
const revokeOp = (id, src) => op({ id, tag: "Auth sign-in", summary: "Sign out", security: APP_KEY, source: src, extension: true,
  description: "A refresh token ends its session and every access token it issued; an access token (`token_type_hint: access_token`) stops working alone. An unknown token is not an error (RFC 7009).",
  requestBody: body(obj({ token: str(), token_type_hint: en(["refresh_token", "access_token"]) }, ["token"]), { token: "rdrf_9b0c…", token_type_hint: "refresh_token" }),
  responses: { 200: ok("Done.", obj({})), ...v1Errors(400, 401) } });
const signInPaths = {
  "/v1/auth/login": { post: loginOp("authLogin", ID, "For apps without their own backend ([Auth](../docs/guides/auth.md)): the app sends the ID token its identity provider gave it, with its public SDK key. RevenueDot verifies the token with the provider's published keys, maps it to an app user id (the first sign-in creates the link; later ones reuse it), merges an anonymous `link_to_id` like `logIn`, and returns tokens. The RevenueCat SDKs' token login sends the same body to `POST /auth/login`. CORS is open, for web apps.") },
  "/v1/auth/token": { post: refreshOp("authRefresh", ID) },
  "/v1/auth/revoke": { post: revokeOp("authRevoke", ID) },
  "/auth/token": { post: refreshOp("authRefreshSdk", ID) },
  "/auth/revoke": { post: revokeOp("authRevokeSdk", ID) },
  "/.well-known/jwks.json": {
    get: op({ id: "identityJwks", tag: "Auth sign-in", summary: "Public key of RevenueDot's ID and access tokens", security: NONE, source: ID, extension: true,
      description: "One Ed25519 key (`OKP`), derived from the server's signing key. Backends verify an Auth `id_token` with it (match `kid`, check `iss` and `aud`). Empty `keys` when the server has no signing or encryption key.",
      responses: { 200: ok("The key set.", obj({ keys: arr(obj({ kty: en(["OKP"]), crv: en(["Ed25519"]), x: str(), kid: str(), alg: en(["EdDSA"]), use: en(["sig"]) })) }, ["keys"]), { keys: [{ kty: "OKP", crv: "Ed25519", x: "gXdn2hmqR_TbdtQwK02laE0YgFz0Rtf918LICLrgZhg", kid: "3f2c1a9d0e8b4c71", alg: "EdDSA", use: "sig" }] }) } }),
  },
};

export const settingsPathsAll = { ...settingsPaths, ...authConfigPaths, ...signInPaths };

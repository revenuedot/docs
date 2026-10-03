// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: REST API v2 (RevenueCat-compatible paths) and RevenueDot's v2 extensions in the OpenAPI document.
// Docs: https://revenuedot.app/docs/api/rest-v2   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { NONE, SECRET, SESSION, arr, body, bool, en, int, listOf, ms, nint, nms, nstr, num, obj, ok, op, param, ref, str, v2Errors } from "./common.mjs";

const P = "/v2/projects/{project_id}";
const project = param("ProjectId");
const page = [param("Limit"), param("StartingAfter")];
const pathParam = (name, description) => ({ name, in: "path", required: true, schema: str(), description });
const expand = (values, description) => ({ name: "expand", in: "query", schema: arr(en(values)), style: "form", explode: true, description });
const testStorePrice = { type: ["object", "null"], required: ["amount_micros", "currency"], properties: { amount_micros: int("Price in micros: 9.99 is 9990000."), currency: str("ISO 4217 code such as USD or EUR. A code with no exchange rate to USD is refused (its purchases would record no revenue).") },
  description: "RevenueDot extension. The Test Store price the SDK shows for this product (Test Store products only). Null clears it. Read it back with `expand=indicative_price`." };
const priceExpand = "`indicative_price` adds RevenueCat's IndicativePrice: the Test Store price; else the App Store or Google Play price in the United States from the last store price read (or the in-app purchase's base territory, or the first territory with a price); else the Stripe web product's price; null when none is known. `store_details` (RevenueDot extension) adds the store's status, base price, number of priced territories and when they were read."
const E = (...c) => v2Errors(401, 403, ...c);
const list = (schema, description = "A page of results.", example) => ok(description, listOf(schema), example);
const del = (object) => ok("Deleted.", ref("Deleted"), { object, id: "…", deleted_at: 1790801342625 });
const archive = (tag, id, what, source, scopes) => ({
  [`${P}/${what}s/{${what}_id}/actions/archive`]: { post: op({ id: `archive${id}`, tag, summary: `Archive ${/^[aeiou]/.test(what) ? "an" : "a"} ${what}`, security: SECRET, source, scopes, parameters: [project, pathParam(`${what}_id`, `${id} id.`)], description: what === "offering" ? "An offering that a draft, running or paused experiment uses cannot be archived (409); the current offering cannot be archived (422)." : undefined, responses: { 200: ok(`The archived ${what}.`, ref(id)), ...E(404, ...(what === "offering" ? [409, 422] : [])) } }) },
});
const errBody = obj({ type: str(), message: str() });
const authErr = ok("Not signed in.", errBody, { type: "authentication_error", message: "Not signed in." });
const preferences = obj({ theme: en(["system", "light", "dark"]), tint: nstr("Accent colour #RRGGBB, or null for the gold."), week_start: int("First day of the week, 0 (Sunday) to 6 (Saturday).", { minimum: 0, maximum: 6 }), display_currency: str("The currency the dashboard shows money in.") });
const accountUser = obj({ id: str(), email: str(), name: nstr(), email_verified: bool("Whether the user confirmed their email address. Always true for accounts created from an invite or after a password reset."), alert_emails: bool("Whether the user gets alert emails for projects they administer."), insights_emails: bool("Whether the user gets the weekly growth insights digest for projects they administer."),
  preferences, has_password: bool("False for accounts made by single sign-on."), two_factor: obj({ enabled: bool(), enabled_at: { type: ["integer", "null"], format: "int64" }, recovery_codes_left: int() }),
  pending_email: { type: ["object", "null"], properties: { email: str(), expires_at: { type: "integer", format: "int64" } }, description: "A waiting email change." }, password_changed_at: { type: ["integer", "null"], format: "int64" }, created_at: { type: "integer", format: "int64" } });
const tokenReason = en(["invalid", "expired", "used"]);
const inviteToken = pathParam("token", "The `token` from the invite link (`/invite?token=...`).");
const inviteId = pathParam("invite_id", "Invite id (inv_...).");
const inviteExample = { object: "invite", id: "inv_4f8k2m9q1x7z", email: "sam@example.com", role: "developer", status: "pending", invited_by: "usr_8k2m4q", created_at: 1790800914012, last_sent_at: 1790800914012, expires_at: 1791405714012 };
const ReasonCode = en(["undeclared", "customer_satisfaction", "other", "service_issue_or_outage"], "Apple's reason for the extension. Required for App Store subscriptions.");

const R = {
  projects: "routes/v2/projects.ts", setup: "routes/v2/setup.ts", apps: "routes/v2/apps.ts", products: "routes/v2/products.ts",
  entitlements: "routes/v2/entitlements.ts", offerings: "routes/v2/offerings.ts", customers: "routes/v2/customers.ts",
  account: "routes/v2/account-overview.ts", metrics: "routes/v2/metrics.ts", integrations: "routes/v2/integrations.ts", ext: "routes/v2/extensions.ts", import: "routes/v2/import.ts", auth: "routes/auth.ts", oauth: "routes/oauth.ts", members: "routes/v2/members.ts",
};

const productExample = { object: "product", id: "prode0zhpfisko", store_identifier: "pro_monthly", type: "subscription", state: "active", subscription: { duration: "P1M", grace_period_duration: null, trial_duration: null }, created_at: 1790800900948, app_id: "appvnrm0a5h", display_name: "Pro monthly" };
const entitlementExample = { object: "entitlement", id: "entl1v0bp6r0qs", project_id: "proj18pzzkao", lookup_key: "pro", display_name: "Pro access", created_at: 1790800901115, state: "active" };
const customerExample = { object: "customer", id: "user_1", project_id: "proj18pzzkao", first_seen_at: 1790800914012, last_seen_at: 1790800914034, last_seen_app_version: null, last_seen_country: null, last_seen_platform: null, last_seen_platform_version: null, active_entitlements: { object: "list", items: [{ object: "customer.active_entitlement", entitlement_id: "entl1v0bp6r0qs", expires_at: 1793392914000 }], next_page: null, url: "/v2/projects/proj18pzzkao/customers/user_1/active_entitlements" }, experiment: null };
const subscriptionExample = { object: "subscription", id: "sub_k1u15wepvw0dfh25", customer_id: "user_1", original_customer_id: "user_1", product_id: "prode0zhpfisko", starts_at: 1790800914000, current_period_starts_at: 1790800914000, current_period_ends_at: 1793392914000, ends_at: 1793392914000, gives_access: true, pending_payment: false, auto_renewal_status: "will_renew", status: "active", total_revenue_in_usd: { currency: "USD", gross: 9.99, commission: 0, tax: 0, proceeds: 9.99 }, presented_offering_id: null, entitlements: { object: "list", items: [entitlementExample], next_page: null, url: "/v2/projects/proj18pzzkao/subscriptions/sub_k1u15wepvw0dfh25/entitlements" }, environment: "sandbox", store: "test_store", store_subscription_identifier: "test_1790800914000_quickstart", ownership: "purchased", management_url: null };

export const v2Paths = {
  // ---- Projects ------------------------------------------------------------------------------------------------------
  "/v2/projects": {
    get: op({ id: "listProjects", tag: "Projects", summary: "List projects", security: SECRET, source: R.projects, scopes: ["project_configuration:projects:read"], parameters: page,
      description: "A secret key sees its own project. A dashboard session sees every project the user is a member of.",
      responses: { 200: list(ref("Project")), ...E() } }),
    post: op({ id: "createProject", tag: "Projects", summary: "Create a project", security: SESSION, source: R.projects, scopes: ["project_configuration:projects:read_write"],
      description: "Needs a dashboard session: a secret key belongs to one project and cannot create another. The caller becomes the project's admin.",
      requestBody: body(obj({ name: str(undefined, { minLength: 1, maxLength: 100 }) }, ["name"]), { name: "Scanner" }),
      responses: { 200: ok("The project.", ref("Project")), ...v2Errors(400, 401, 403) } }),
  },
  [P]: {
    get: op({ id: "getProject", tag: "Project settings", summary: "Get a project with its settings", security: SECRET, source: R.setup, extension: true, scopes: ["project_configuration:projects:read"], parameters: [project],
      responses: { 200: ok("The project.", ref("ProjectSettings"), { object: "project", id: "proj18pzzkao", name: "My app", created_at: 1790800900675, icon_url: null, icon_url_large: null, transfer_behavior: "transfer", sandbox_transfer_behavior: null, sandbox_testing_access: "anybody", sandbox_testers: [], owner: { id: "usr_8f2kq0x1m3zv7a2b", email: "founder@example.com", name: "Ana" } }), ...E(404) } }),
    post: op({ id: "updateProject", tag: "Project settings", summary: "Update a project's name, transfer behaviour and sandbox testing access", security: SECRET, source: R.setup, extension: true, scopes: ["project_configuration:projects:read_write"], parameters: [project],
      description: "See [who owns a restored purchase](../docs/concepts/customers-and-app-user-ids.md#who-owns-a-restored-purchase) and [sandbox testing access](../docs/guides/project-settings.md#sandbox-testing-access). Duplicate and blank `sandbox_testers` are dropped.",
      requestBody: body(obj({ name: str(undefined, { maxLength: 100 }), transfer_behavior: en(["transfer", "transfer_if_no_active", "keep", "share"]), sandbox_transfer_behavior: { type: ["string", "null"], enum: ["transfer", "transfer_if_no_active", "keep", "share", null] },
        sandbox_testing_access: en(["anybody", "allowlist", "nobody"]), sandbox_testers: arr(str(undefined, { maxLength: 100 }), { maxItems: 500 }) }), { sandbox_testing_access: "allowlist", sandbox_testers: ["qa_tester_1", "qa_tester_2"] }),
      responses: { 200: ok("The project.", ref("ProjectSettings")), ...v2Errors(400, 401, 403, 404) } }),
    delete: op({ id: "deleteProject", tag: "Project settings", summary: "Delete a project and everything in it", security: SESSION, source: R.setup, extension: true, scopes: ["project_configuration:projects:read_write"], parameters: [project],
      description: "Only a project admin signed in to the dashboard can do this. Apps, catalog, customers, purchases, events and webhooks are deleted. Cannot be undone.",
      responses: { 200: del("project"), ...E(404) } }),
  },
  [`${P}/collaborators`]: {
    get: op({ id: "listCollaborators", tag: "Collaborators", summary: "List collaborators", security: SECRET, source: R.setup, scopes: ["project_configuration:collaborators:read"], parameters: [project],
      responses: { 200: list(ref("Collaborator")), ...E(404) } }),
  },

  // ---- Apps --------------------------------------------------------------------------------------------------------
  [`${P}/apps`]: {
    get: op({ id: "listApps", tag: "Apps", summary: "List apps", security: SECRET, source: R.apps, scopes: ["project_configuration:apps:read"], parameters: [project, ...page],
      responses: { 200: list(ref("App")), ...E(404) } }),
    post: op({ id: "createApp", tag: "Apps", summary: "Create an app", security: SECRET, source: R.apps, scopes: ["project_configuration:apps:read_write"], parameters: [project],
      description: `
One app per store. \`app_store\` and \`mac_app_store\` need \`bundle_id\`; \`play_store\`, \`amazon\` and \`galaxy\` need \`package_name\`. The app gets a public SDK key with the store's prefix (\`pdl_\` for Paddle, \`roku_\` for Roku, \`galx_\` for the Galaxy Store).
Other fields in the store object are saved as store credentials (for example \`subscription_private_key\`, \`subscription_key_id\`, \`subscription_key_issuer\`, \`play_service_account_credentials_json\`, Amazon's \`shared_secret\`, Stripe's \`stripe_secret_key\` and \`stripe_webhook_secret\`, Paddle's \`paddle_api_key\` and \`paddle_webhook_secret\`, Roku's \`roku_api_key\`, the Galaxy Store's \`galaxy_service_account_id\`, \`galaxy_service_account_private_key\` and \`galaxy_iap_public_key\`). Secrets are sealed and never returned. A Stripe publishable key (\`pk_…\`), a Paddle client-side token or a malformed signing secret is refused with 400.
Store commission programs (RevenueDot extension, as RevenueCat's app settings): \`app_store.small_business_program\` and \`mac_app_store.small_business_program\` (Apple's Small Business Program, 15% instead of 30%) and \`amazon.small_business_accelerator\` (Amazon's Small Business Accelerator Program, 20% instead of 30%) take \`{ "enrolled": true, "periods": [{ "entry_date": "2024-01-01", "exit_date": null }] }\`: up to 10 periods, \`YYYY-MM-DD\`, an exit date after its entry date, no overlaps; \`null\` removes the program. Proceeds in charts, metrics, exports and the REST API are recomputed for the dates; webhooks and integration events already sent keep their values.
\`galaxy\` is a RevenueDot extension: RevenueCat's v2 API has no Galaxy app object.`,
      requestBody: body(obj({
        name: str(undefined, { maxLength: 255 }), type: en(["amazon", "app_store", "mac_app_store", "play_store", "stripe", "rc_billing", "roku", "paddle", "test_store", "galaxy"]),
        app_store: { type: "object", description: "`bundle_id` plus optional credentials." }, mac_app_store: { type: "object" }, play_store: { type: "object", description: "`package_name` plus optional credentials." },
        amazon: { type: "object" }, stripe: { type: "object" }, rc_billing: { type: ["object", "null"] },
        roku: { type: ["object", "null"], description: "`roku_api_key` (sealed), `roku_channel_id`, `roku_channel_name`." },
        paddle: { type: ["object", "null"], description: "`paddle_api_key` (sealed; `pdl_live_apikey_…` or `pdl_sdbx_apikey_…`), `paddle_is_sandbox` (only for keys made before May 2025), `paddle_webhook_secret` (sealed)." },
        galaxy: { type: "object", description: "`package_name` plus `galaxy_service_account_id`, `galaxy_service_account_private_key` (sealed) and the optional `galaxy_iap_public_key`." },
      }, ["name", "type"]), { name: "Scanner (iOS)", type: "app_store", app_store: { bundle_id: "com.example.scanner" } }),
      responses: { 201: ok("The app.", ref("App"), { object: "app", id: "appugfw01uy", name: "Scanner (iOS)", created_at: 1790801342594, type: "app_store", project_id: "proj18pzzkao", custom_url_scheme: "rc-4d13549313", app_store: { bundle_id: "com.example.scanner", app_store_connect_api_key_configured: false, subscription_key_configured: false, app_store_connect_vendor_number: null } }), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/apps/{app_id}`]: {
    get: op({ id: "getApp", tag: "Apps", summary: "Get an app", security: SECRET, source: R.apps, scopes: ["project_configuration:apps:read"], parameters: [project, param("AppId")], responses: { 200: ok("The app.", ref("App")), ...E(404) } }),
    post: op({ id: "updateApp", tag: "Apps", summary: "Update an app and its store credentials", security: SECRET, source: R.apps, scopes: ["project_configuration:apps:read_write"], parameters: [project, param("AppId")],
      description: `
Send only the store object of the app's own type. A field set to null removes that credential; other values replace it.
RevenueDot extensions in the store object: \`notification_forward_url\` (copy store notifications to another URL, for example RevenueCat during a dual run; null or "" turns it off), \`track_new_purchases\`, \`allow_unsigned_receipts\`, \`xcode_certificate\`, \`app_apple_id\`, \`pubsub_audience\`, \`pubsub_service_account\`; Amazon \`shared_secret\`, \`sns_topic_arn\`; Stripe \`stripe_secret_key\`, \`stripe_webhook_secret\`, \`stripe_account_id\`, \`app_user_id_source\` (metadata, customer_id, anonymous), \`app_user_id_metadata_key\`, \`register_on\` (invoice_paid, invoice_created); Paddle \`paddle_webhook_secret\`, \`app_user_id_source\` (custom_data, anonymous), \`app_user_id_custom_data_key\`; Galaxy Store \`galaxy_iap_public_key\`. See [App Store setup](../docs/guides/app-store.md), [Google Play setup](../docs/guides/google-play.md), [Amazon Appstore setup](../docs/guides/amazon-appstore.md), [Stripe setup](../docs/guides/stripe.md), [Paddle setup](../docs/guides/paddle.md), [Roku setup](../docs/guides/roku.md) and [Galaxy Store setup](../docs/guides/galaxy-store.md).`,
      requestBody: body(obj({ name: str(), app_store: { type: "object" }, mac_app_store: { type: "object" }, play_store: { type: "object" }, amazon: { type: "object" }, stripe: { type: "object" }, rc_billing: { type: "object" }, roku: { type: "object" }, paddle: { type: "object" }, galaxy: { type: "object" } }),
        { app_store: { subscription_private_key: "-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----", subscription_key_id: "ABC123DEFG", subscription_key_issuer: "57246542-96fe-1a63-e053-0824d011072a" } }),
      responses: { 200: ok("The app.", ref("App")), ...v2Errors(400, 401, 403, 404) } }),
    delete: op({ id: "deleteApp", tag: "Apps", summary: "Delete an app", security: SECRET, source: R.apps, scopes: ["project_configuration:apps:read_write"], parameters: [project, param("AppId")],
      description: "Deletes the app and its products. Purchase history stays.", responses: { 200: del("app"), ...E(404) } }),
  },
  [`${P}/apps/{app_id}/public_api_keys`]: {
    get: op({ id: "listPublicApiKeys", tag: "Apps", summary: "Get an app's public SDK key", security: SECRET, source: R.apps, scopes: ["project_configuration:apps:read"], parameters: [project, param("AppId")],
      responses: { 200: list(ref("PublicApiKey"), "One key.", { object: "list", items: [{ object: "public_api_key", id: "pk_appvnrm0a5h", key: "test_ea5120a23e7b9626f8eff225a627762c", environment: "sandbox", app_id: "appvnrm0a5h", created_at: 1790800900758 }], next_page: null, url: "/v2/projects/proj18pzzkao/apps/appvnrm0a5h/public_api_keys" }), ...E(404) } }),
  },

  // ---- Products ----------------------------------------------------------------------------------------------------
  [`${P}/products`]: {
    get: op({ id: "listProducts", tag: "Products", summary: "List products", security: SECRET, source: R.products, scopes: ["project_configuration:products:read"],
      parameters: [project, { name: "app_id", in: "query", schema: str(), description: "Only this app's products." }, expand(["items.app", "items.indicative_price", "items.store_details"], "`items.app` embeds each product's app. `items.indicative_price` adds each product's indicative price: the Test Store price, else the store price from the last price read (United States first), else the Stripe web product's price. `items.store_details` (RevenueDot extension) adds each product's store status and price; see [store prices](../docs/guides/product-editor.md#store-prices-and-status-on-the-products-page)."), ...page],
      responses: { 200: list(ref("Product")), ...E(404) } }),
    post: op({ id: "createProduct", tag: "Products", summary: "Create a product", security: SECRET, source: R.products, scopes: ["project_configuration:products:read_write"],
      parameters: [project, expand(["indicative_price", "store_details"], priceExpand)],
      description: "`store_identifier` is the store's product id. For Google Play subscriptions use `subscriptionId:basePlanId`. Set `subscription.duration` (ISO 8601, for example P1M): the Test Store uses it as the period, and MRR uses it for every store. `test_store_price` sets what the SDK shows for a Test Store product.",
      requestBody: body(obj({
        store_identifier: str(undefined, { maxLength: 255 }), app_id: str(), type: en(["subscription", "one_time", "consumable", "non_consumable", "non_renewing_subscription"]),
        display_name: nstr(), title: nstr("Alias of display_name."), price_identifier: nstr("Accepted and ignored."),
        subscription: { type: ["object", "null"], properties: { duration: nstr("ISO 8601 period such as P1W, P1M, P1Y or P3D.") } },
        test_store_price: testStorePrice,
      }, ["store_identifier", "app_id", "type"]), { store_identifier: "pro_monthly", app_id: "appvnrm0a5h", type: "subscription", display_name: "Pro monthly", subscription: { duration: "P1M" } }),
      responses: { 201: ok("The product.", ref("Product"), productExample), ...v2Errors(400, 401, 403, 404, 409) } }),
  },
  [`${P}/products/{product_id}`]: {
    get: op({ id: "getProduct", tag: "Products", summary: "Get a product", security: SECRET, source: R.products, scopes: ["project_configuration:products:read"], parameters: [project, pathParam("product_id", "Product id (prod...)."), expand(["app", "indicative_price", "store_details"], `\`app\` embeds the app. ${priceExpand}`)], responses: { 200: ok("The product.", ref("Product"), productExample), ...E(404) } }),
    post: op({ id: "updateProduct", tag: "Products", summary: "Update a product", security: SECRET, source: R.products, scopes: ["project_configuration:products:read_write"], parameters: [project, pathParam("product_id", "Product id."), expand(["app", "indicative_price", "store_details"], priceExpand)],
      description: "RevenueDot also lets you correct `type` and `subscription.duration` (null clears it), and set or clear `test_store_price`.",
      requestBody: body(obj({ display_name: str(), type: en(["subscription", "one_time", "consumable", "non_consumable", "non_renewing_subscription"]), subscription: obj({ duration: nstr() }), test_store_price: testStorePrice }), { display_name: "Pro (monthly)", test_store_price: { amount_micros: 9990000, currency: "USD" } }),
      responses: { 200: ok("The product.", ref("Product")), ...v2Errors(400, 401, 403, 404) } }),
    delete: op({ id: "deleteProduct", tag: "Products", summary: "Delete a product", security: SECRET, source: R.products, scopes: ["project_configuration:products:read_write"], parameters: [project, pathParam("product_id", "Product id.")],
      description: "Detaches it from entitlements and packages. Purchase history keeps the store id.", responses: { 200: del("product"), ...E(404) } }),
  },
  ...archive("Products", "Product", "product", R.products, ["project_configuration:products:read_write"]),
  [`${P}/products/{product_id}/actions/unarchive`]: { post: op({ id: "unarchiveProduct", tag: "Products", summary: "Unarchive a product", security: SECRET, source: R.products, scopes: ["project_configuration:products:read_write"], parameters: [project, pathParam("product_id", "Product id.")], responses: { 200: ok("The product.", ref("Product")), ...E(404) } }) },

  // ---- Entitlements ------------------------------------------------------------------------------------------------
  [`${P}/entitlements`]: {
    get: op({ id: "listEntitlements", tag: "Entitlements", summary: "List entitlements", security: SECRET, source: R.entitlements, scopes: ["project_configuration:entitlements:read"], parameters: [project, expand(["items.product"], "`items.product` embeds the attached products."), ...page], responses: { 200: list(ref("Entitlement")), ...E(404) } }),
    post: op({ id: "createEntitlement", tag: "Entitlements", summary: "Create an entitlement", security: SECRET, source: R.entitlements, scopes: ["project_configuration:entitlements:read_write"], parameters: [project],
      requestBody: body(obj({ lookup_key: str("What apps check, for example pro.", { maxLength: 200 }), display_name: str(undefined, { maxLength: 1500 }) }, ["lookup_key", "display_name"]), { lookup_key: "pro", display_name: "Pro access" }),
      responses: { 201: ok("The entitlement.", ref("Entitlement"), entitlementExample), ...v2Errors(400, 401, 403, 404, 409) } }),
  },
  [`${P}/entitlements/{entitlement_id}`]: {
    get: op({ id: "getEntitlement", tag: "Entitlements", summary: "Get an entitlement", security: SECRET, source: R.entitlements, scopes: ["project_configuration:entitlements:read"], parameters: [project, pathParam("entitlement_id", "Entitlement id (entl...)."), expand(["product"], "`product` embeds the attached products.")], responses: { 200: ok("The entitlement.", ref("Entitlement"), entitlementExample), ...E(404) } }),
    post: op({ id: "updateEntitlement", tag: "Entitlements", summary: "Rename an entitlement", security: SECRET, source: R.entitlements, scopes: ["project_configuration:entitlements:read_write"], parameters: [project, pathParam("entitlement_id", "Entitlement id.")],
      requestBody: body(obj({ display_name: str() }, ["display_name"])), responses: { 200: ok("The entitlement.", ref("Entitlement")), ...v2Errors(400, 401, 403, 404) } }),
    delete: op({ id: "deleteEntitlement", tag: "Entitlements", summary: "Delete an entitlement", security: SECRET, source: R.entitlements, scopes: ["project_configuration:entitlements:read_write"], parameters: [project, pathParam("entitlement_id", "Entitlement id.")], responses: { 200: del("entitlement"), ...E(404) } }),
  },
  ...archive("Entitlements", "Entitlement", "entitlement", R.entitlements, ["project_configuration:entitlements:read_write"]),
  [`${P}/entitlements/{entitlement_id}/actions/unarchive`]: { post: op({ id: "unarchiveEntitlement", tag: "Entitlements", summary: "Unarchive an entitlement", security: SECRET, source: R.entitlements, scopes: ["project_configuration:entitlements:read_write"], parameters: [project, pathParam("entitlement_id", "Entitlement id.")], responses: { 200: ok("The entitlement.", ref("Entitlement")), ...E(404) } }) },
  [`${P}/entitlements/{entitlement_id}/products`]: {
    get: op({ id: "listEntitlementProducts", tag: "Entitlements", summary: "List an entitlement's products", security: SECRET, source: R.entitlements, scopes: ["project_configuration:entitlements:read"], parameters: [project, pathParam("entitlement_id", "Entitlement id."), ...page], responses: { 200: list(ref("Product")), ...E(404) } }),
  },
  [`${P}/entitlements/{entitlement_id}/actions/attach_products`]: {
    post: op({ id: "attachEntitlementProducts", tag: "Entitlements", summary: "Attach products to an entitlement", security: SECRET, source: R.entitlements, scopes: ["project_configuration:entitlements:read_write"], parameters: [project, pathParam("entitlement_id", "Entitlement id.")],
      description: "Any of these products unlocks the entitlement. Every id must belong to the project, or nothing changes.",
      requestBody: body(obj({ product_ids: arr(str(), { minItems: 1, maxItems: 50 }) }, ["product_ids"]), { product_ids: ["prode0zhpfisko", "prodz2c0dt6z9x"] }),
      responses: { 200: ok("The entitlement with its products.", ref("Entitlement")), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/entitlements/{entitlement_id}/actions/detach_products`]: {
    post: op({ id: "detachEntitlementProducts", tag: "Entitlements", summary: "Detach products from an entitlement", security: SECRET, source: R.entitlements, scopes: ["project_configuration:entitlements:read_write"], parameters: [project, pathParam("entitlement_id", "Entitlement id.")],
      requestBody: body(obj({ product_ids: arr(str(), { minItems: 1, maxItems: 50 }) }, ["product_ids"])), responses: { 200: ok("The entitlement with its products.", ref("Entitlement")), ...v2Errors(400, 401, 403, 404) } }),
  },

  // ---- Offerings and packages --------------------------------------------------------------------------------------
  [`${P}/offerings`]: {
    get: op({ id: "listOfferings", tag: "Offerings", summary: "List offerings", security: SECRET, source: R.offerings, scopes: ["project_configuration:offerings:read"], parameters: [project, expand(["items.package", "items.package.product"], "Embed packages, and their products."), ...page], responses: { 200: list(ref("Offering")), ...E(404) } }),
    post: op({ id: "createOffering", tag: "Offerings", summary: "Create an offering", security: SECRET, source: R.offerings, scopes: ["project_configuration:offerings:read_write"], parameters: [project],
      description: "The project's first offering becomes current.",
      requestBody: body(obj({ lookup_key: str(undefined, { maxLength: 200 }), display_name: str(undefined, { maxLength: 1500 }), metadata: { type: ["object", "null"] } }, ["lookup_key", "display_name"]), { lookup_key: "default", display_name: "Standard plans" }),
      responses: { 201: ok("The offering.", ref("Offering")), ...v2Errors(400, 401, 403, 404, 409) } }),
  },
  [`${P}/offerings/{offering_id}`]: {
    get: op({ id: "getOffering", tag: "Offerings", summary: "Get an offering", security: SECRET, source: R.offerings, scopes: ["project_configuration:offerings:read"], parameters: [project, pathParam("offering_id", "Offering id (ofrng...)."), expand(["package", "package.product"], "Embed packages, and their products.")], responses: { 200: ok("The offering.", ref("Offering")), ...E(404) } }),
    post: op({ id: "updateOffering", tag: "Offerings", summary: "Update an offering or make it current", security: SECRET, source: R.offerings, scopes: ["project_configuration:offerings:read_write"], parameters: [project, pathParam("offering_id", "Offering id.")],
      description: "`is_current: true` makes it the only current offering. An archived offering cannot be made current (422).",
      requestBody: body(obj({ display_name: str(), is_current: bool(), metadata: { type: ["object", "null"] } }), { is_current: true }),
      responses: { 200: ok("The offering.", ref("Offering")), ...v2Errors(400, 401, 403, 404, 422) } }),
    delete: op({ id: "deleteOffering", tag: "Offerings", summary: "Delete an offering", security: SECRET, source: R.offerings, scopes: ["project_configuration:offerings:read_write"], parameters: [project, pathParam("offering_id", "Offering id.")],
      description: "Deletes its packages and clears customer overrides that point to it. An offering that a draft, running or paused experiment uses (as a variant's offering or a placement offering) answers 409 and names the experiment: stop the experiment or pick another offering in it first. A stopped experiment keeps its results and shows the deleted offering's id.",
      responses: { 200: del("offering"), ...E(404, 409) } }),
  },
  [`${P}/offerings/{offering_id}/actions/duplicate`]: {
    post: op({ id: "duplicateOffering", tag: "Offerings", summary: "Duplicate an offering", security: SECRET, source: R.offerings, extension: true, scopes: ["project_configuration:offerings:read_write"], parameters: [project, pathParam("offering_id", "The offering to copy.")],
      description: `Copies an offering with its packages, for an experiment's treatment. The copy is never current. Without \`packages\` the copy is exact: every package in order, with the same products. With \`packages\`, the list sets which packages are copied and in what order, and a package's \`products\` replaces its products (to test another price, period, trial or introductory offer). \`copy_paywall\` copies the offering's paywall, draft and published content, onto the copy.

Answers 400 when a \`source_package_id\` is not a package of this offering or repeats, a product is not in the project or repeats in a package, or \`copy_paywall\` is true and the offering has no paywall. Answers 409 when the \`lookup_key\` is taken, or two products of the same app in a package have overlapping \`eligibility_criteria\`.`,
      requestBody: body(obj({
        lookup_key: str(undefined, { maxLength: 200 }), display_name: str(undefined, { maxLength: 1500 }), metadata: { type: ["object", "null"], description: "Default: the source offering's metadata." },
        packages: arr(obj({
          source_package_id: str("A package of the source offering (pkge...)."),
          products: arr(obj({ product_id: str(), eligibility_criteria: en(["all", "google_sdk_lt_6", "google_sdk_ge_6"]) }, ["product_id", "eligibility_criteria"]), { maxItems: 50, description: "Replaces the package's products. Omitted: the source package's products." }),
        }, ["source_package_id"]), { maxItems: 50, description: "Packages to copy, in the new order. Omitted: every package, as it is." }),
        copy_paywall: bool("Also copy the offering's paywall onto the copy."),
      }, ["lookup_key", "display_name"]), { lookup_key: "default_price", display_name: "Standard plans (price point)", packages: [{ source_package_id: "pkge1a2b3c4d5e", products: [{ product_id: "prod9k8j7h6g5f", eligibility_criteria: "all" }] }, { source_package_id: "pkge6f7g8h9i0j" }] }),
      responses: { 201: ok("The copy, with its packages and their products expanded.", ref("Offering")), ...v2Errors(400, 401, 403, 404, 409) } }),
  },
  ...archive("Offerings", "Offering", "offering", R.offerings, ["project_configuration:offerings:read_write"]),
  [`${P}/offerings/{offering_id}/actions/unarchive`]: {
    post: op({ id: "unarchiveOffering", tag: "Offerings", summary: "Unarchive an offering", security: SECRET, source: R.offerings, scopes: ["project_configuration:offerings:read_write"], parameters: [project, pathParam("offering_id", "Offering id.")],
      requestBody: body(obj({ unarchive_referenced_entities: bool("Also unarchive the products in its packages.") }), undefined, false),
      responses: { 200: ok("The offering.", ref("Offering")), ...E(404) } }),
  },
  [`${P}/offerings/{offering_id}/packages`]: {
    get: op({ id: "listPackages", tag: "Packages", summary: "List an offering's packages", security: SECRET, source: R.offerings, scopes: ["project_configuration:packages:read"], parameters: [project, pathParam("offering_id", "Offering id."), expand(["items.product"], "Embed products."), ...page],
      description: "Ordered by position, then creation: the order the SDK shows them in.", responses: { 200: list(ref("Package")), ...E(404) } }),
    post: op({ id: "createPackage", tag: "Packages", summary: "Create a package", security: SECRET, source: R.offerings, scopes: ["project_configuration:packages:read_write"], parameters: [project, pathParam("offering_id", "Offering id.")],
      description: "Use the standard lookup keys (`$rc_monthly`, `$rc_annual`, `$rc_weekly`, `$rc_lifetime` ...) so the SDK's convenience accessors work. Without `position`, the package goes last.",
      requestBody: body(obj({ lookup_key: str(), display_name: str(), position: int(undefined, { minimum: 0 }) }, ["lookup_key", "display_name"]), { lookup_key: "$rc_monthly", display_name: "Monthly", position: 0 }),
      responses: { 201: ok("The package.", ref("Package")), ...v2Errors(400, 401, 403, 404, 409) } }),
  },
  [`${P}/packages/{package_id}`]: {
    get: op({ id: "getPackage", tag: "Packages", summary: "Get a package", security: SECRET, source: R.offerings, scopes: ["project_configuration:packages:read"], parameters: [project, pathParam("package_id", "Package id (pkge...)."), expand(["product"], "Embed products.")], responses: { 200: ok("The package.", ref("Package")), ...E(404) } }),
    post: op({ id: "updatePackage", tag: "Packages", summary: "Update a package", security: SECRET, source: R.offerings, scopes: ["project_configuration:packages:read_write"], parameters: [project, pathParam("package_id", "Package id.")],
      requestBody: body(obj({ display_name: str(), position: int(undefined, { minimum: 0 }) })), responses: { 200: ok("The package.", ref("Package")), ...v2Errors(400, 401, 403, 404) } }),
    delete: op({ id: "deletePackage", tag: "Packages", summary: "Delete a package", security: SECRET, source: R.offerings, scopes: ["project_configuration:packages:read_write"], parameters: [project, pathParam("package_id", "Package id.")], responses: { 200: del("package"), ...E(404) } }),
  },
  [`${P}/packages/{package_id}/products`]: {
    get: op({ id: "listPackageProducts", tag: "Packages", summary: "List a package's products", security: SECRET, source: R.offerings, scopes: ["project_configuration:packages:read"], parameters: [project, pathParam("package_id", "Package id."), ...page], responses: { 200: list(ref("PackageProduct")), ...E(404) } }),
  },
  [`${P}/packages/{package_id}/actions/attach_products`]: {
    post: op({ id: "attachPackageProducts", tag: "Packages", summary: "Attach products to a package", security: SECRET, source: R.offerings, scopes: ["project_configuration:packages:read_write"], parameters: [project, pathParam("package_id", "Package id.")],
      description: "One product per app, so each app's SDK finds its product. Two products of the same app can share a package only with non-overlapping `eligibility_criteria` (409 otherwise).",
      requestBody: body(obj({ products: arr(obj({ product_id: str(), eligibility_criteria: en(["all", "google_sdk_lt_6", "google_sdk_ge_6"]) }, ["product_id", "eligibility_criteria"]), { minItems: 1, maxItems: 50 }) }, ["products"]), { products: [{ product_id: "prode0zhpfisko", eligibility_criteria: "all" }] }),
      responses: { 200: ok("The package with its products.", ref("Package")), ...v2Errors(400, 401, 403, 404, 409) } }),
  },
  [`${P}/packages/{package_id}/actions/detach_products`]: {
    post: op({ id: "detachPackageProducts", tag: "Packages", summary: "Detach products from a package", security: SECRET, source: R.offerings, scopes: ["project_configuration:packages:read_write"], parameters: [project, pathParam("package_id", "Package id.")],
      requestBody: body(obj({ product_ids: arr(str(), { minItems: 1, maxItems: 50 }) }, ["product_ids"])), responses: { 200: ok("The package with its products.", ref("Package")), ...v2Errors(400, 401, 403, 404) } }),
  },

  // ---- Customers ---------------------------------------------------------------------------------------------------
  [`${P}/customers`]: {
    get: op({ id: "listCustomers", tag: "Customers", summary: "List or search customers", security: SECRET, source: R.customers, scopes: ["customer_information:customers:read"],
      parameters: [project, { name: "search", in: "query", schema: str(), description: "Exact match on an app user id, the `$email` attribute (any case) or a store transaction id." }, ...page],
      description: "Newest first (by first seen).", responses: { 200: list(ref("Customer")), ...v2Errors(400, 401, 403, 404) } }),
    post: op({ id: "createCustomer", tag: "Customers", summary: "Create a customer", security: SECRET, source: R.customers, scopes: ["customer_information:customers:read_write"], parameters: [project],
      requestBody: body(obj({ id: str("App user id.", { maxLength: 1500 }), attributes: arr(obj({ name: str(), value: str() }, ["name", "value"]), { maxItems: 500 }) }, ["id"]), { id: "user_42", attributes: [{ name: "$email", value: "ana@example.com" }] }),
      responses: { 201: ok("The customer.", ref("Customer")), ...v2Errors(400, 401, 403, 404, 409) } }),
  },
  [`${P}/customers/{customer_id}`]: {
    get: op({ id: "getCustomer", tag: "Customers", summary: "Get a customer", security: SECRET, source: R.customers, scopes: ["customer_information:customers:read"], parameters: [project, param("CustomerId"), expand(["attributes"], "`attributes` embeds the customer's attributes.")],
      responses: { 200: ok("The customer.", ref("Customer"), customerExample), ...E(404) } }),
    delete: op({ id: "deleteCustomer", tag: "Customers", summary: "Delete a customer", security: SECRET, source: R.customers, scopes: ["customer_information:customers:read_write"], parameters: [project, param("CustomerId")],
      description: "Deletes aliases, attributes, subscriptions, purchases, transactions and events. Cannot be undone.", responses: { 200: del("customer"), ...E(404) } }),
  },
  [`${P}/customers/{customer_id}/aliases`]: { get: op({ id: "listAliases", tag: "Customers", summary: "List a customer's app user ids", security: SECRET, source: R.customers, scopes: ["customer_information:customers:read"], parameters: [project, param("CustomerId"), ...page], responses: { 200: list(ref("CustomerAlias")), ...E(404) } }) },
  [`${P}/customers/{customer_id}/attributes`]: {
    get: op({ id: "listAttributes", tag: "Customers", summary: "List a customer's attributes", security: SECRET, source: R.customers, scopes: ["customer_information:customers:read"], parameters: [project, param("CustomerId"), ...page], responses: { 200: list(ref("CustomerAttribute")), ...E(404) } }),
    post: op({ id: "setAttributes", tag: "Customers", summary: "Set a customer's attributes", security: SECRET, source: R.customers, scopes: ["customer_information:customers:read_write"], parameters: [project, param("CustomerId")],
      description: "API writes always win over older SDK writes. A null value deletes the attribute.",
      requestBody: body(obj({ attributes: arr(obj({ name: str(), value: nstr() }, ["name", "value"]), { minItems: 1, maxItems: 500 }) }, ["attributes"]), { attributes: [{ name: "$displayName", value: "Ana" }] }),
      responses: { 200: list(ref("CustomerAttribute"), "Every attribute of the customer."), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/customers/{customer_id}/active_entitlements`]: { get: op({ id: "listActiveEntitlements", tag: "Customers", summary: "List a customer's active entitlements", security: SECRET, source: R.customers, scopes: ["customer_information:customers:read"], parameters: [project, param("CustomerId"), ...page], responses: { 200: list(ref("ActiveEntitlement")), ...E(404) } }) },
  [`${P}/customers/{customer_id}/subscriptions`]: { get: op({ id: "listCustomerSubscriptions", tag: "Customers", summary: "List a customer's subscriptions", security: SECRET, source: R.customers, scopes: ["customer_information:subscriptions:read"], parameters: [project, param("CustomerId"), param("Environment"), ...page], responses: { 200: list(ref("Subscription"), "A page of subscriptions.", { object: "list", items: [subscriptionExample], next_page: null, url: "/v2/projects/proj18pzzkao/customers/user_1/subscriptions" }), ...v2Errors(400, 401, 403, 404) } }) },
  [`${P}/customers/{customer_id}/purchases`]: { get: op({ id: "listCustomerPurchases", tag: "Customers", summary: "List a customer's one-time purchases", security: SECRET, source: R.customers, scopes: ["customer_information:purchases:read"], parameters: [project, param("CustomerId"), param("Environment"), ...page], responses: { 200: list(ref("Purchase")), ...v2Errors(400, 401, 403, 404) } }) },
  [`${P}/customers/{customer_id}/events`]: { get: op({ id: "listCustomerEvents", tag: "Customers", summary: "List a customer's events", security: SECRET, source: R.customers, scopes: ["customer_information:customers:read"], parameters: [project, param("CustomerId"), param("Environment"), ...page], description: "Newest first. `body` is the webhook event.", responses: { 200: list(ref("CustomerEvent")), ...v2Errors(400, 401, 403, 404) } }) },
  [`${P}/customers/{customer_id}/actions/grant_entitlement`]: {
    post: op({ id: "grantEntitlement", tag: "Customers", summary: "Grant an entitlement", security: SECRET, source: R.customers, scopes: ["customer_information:customers:read_write"], parameters: [project, param("CustomerId")],
      description: "Promotional access until `expires_at`. A grant ending within 2 hours of an existing grant for the same entitlement changes nothing.",
      requestBody: body(obj({ entitlement_id: str("Entitlement id (entl...)."), expires_at: int("Epoch milliseconds, in the future.") }, ["entitlement_id", "expires_at"]), { entitlement_id: "entl1v0bp6r0qs", expires_at: 1830000000000 }),
      responses: { 201: ok("The customer.", ref("Customer")), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/customers/{customer_id}/actions/revoke_granted_entitlement`]: {
    post: op({ id: "revokeGrantedEntitlement", tag: "Customers", summary: "Revoke a granted entitlement", security: SECRET, source: R.customers, scopes: ["customer_information:customers:read_write"], parameters: [project, param("CustomerId")],
      requestBody: body(obj({ entitlement_id: str() }, ["entitlement_id"])), responses: { 200: ok("The customer.", ref("Customer")), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/customers/{customer_id}/actions/assign_offering`]: {
    post: op({ id: "assignOffering", tag: "Customers", summary: "Assign an offering to a customer", security: SECRET, source: R.customers, scopes: ["project_configuration:offerings:read", "customer_information:customers:read_write"], parameters: [project, param("CustomerId")],
      description: "The customer sees this offering as current. `null` removes the override.",
      requestBody: body(obj({ offering_id: nstr("Offering id (ofrng...) or null.") }, ["offering_id"]), { offering_id: "ofrngjfr71v5awb" }),
      responses: { 200: ok("Done.", { type: "object" }, {}), ...v2Errors(400, 401, 403, 404) } }),
  },

  // ---- Subscriptions and purchases ---------------------------------------------------------------------------------
  [`${P}/subscriptions`]: {
    get: op({ id: "searchSubscriptions", tag: "Subscriptions", summary: "Find subscriptions by store id", security: SECRET, source: R.customers, scopes: ["customer_information:subscriptions:read"],
      parameters: [project, { name: "store_subscription_identifier", in: "query", required: true, schema: str(), description: "Store transaction id, original transaction id or purchase token." }],
      responses: { 200: list(ref("Subscription")), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/subscriptions/{subscription_id}`]: { get: op({ id: "getSubscription", tag: "Subscriptions", summary: "Get a subscription", security: SECRET, source: R.customers, scopes: ["customer_information:subscriptions:read"], parameters: [project, pathParam("subscription_id", "Subscription id (sub_...).")], responses: { 200: ok("The subscription.", ref("Subscription"), subscriptionExample), ...E(404) } }) },
  [`${P}/subscriptions/{subscription_id}/entitlements`]: { get: op({ id: "listSubscriptionEntitlements", tag: "Subscriptions", summary: "List the entitlements a subscription unlocks", security: SECRET, source: R.customers, scopes: ["customer_information:subscriptions:read"], parameters: [project, pathParam("subscription_id", "Subscription id."), ...page], responses: { 200: list(ref("Entitlement")), ...E(404) } }) },
  [`${P}/subscriptions/{subscription_id}/transactions`]: {
    get: op({ id: "listSubscriptionTransactions", tag: "Subscriptions", summary: "List a subscription's payments", security: SECRET, source: R.customers, scopes: ["customer_information:subscriptions:read"],
      parameters: [project, pathParam("subscription_id", "Subscription id."), { name: "sort", in: "query", schema: en(["id", "purchased_at"]), description: "Default id." }, { name: "direction", in: "query", schema: en(["asc", "desc"]), description: "Default asc." }, ...page],
      description: "One item per paid store transaction of the subscription (purchase, trial start, renewal). A refunded payment's `effective_expiration_date` is the refund time.",
      responses: { 200: list(ref("SubscriptionTransaction")), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/subscriptions/{subscription_id}/actions/cancel`]: {
    post: op({ id: "cancelSubscription", tag: "Subscriptions", summary: "Cancel a subscription (Google Play)", security: SECRET, source: R.customers, scopes: ["customer_information:subscriptions:read_write"], parameters: [project, pathParam("subscription_id", "Subscription id.")],
      description: "Google Play only: turns auto-renew off. Other stores answer 422.", responses: { 200: ok("The subscription.", ref("Subscription")), ...E(404, 422, 503) } }),
  },
  [`${P}/subscriptions/{subscription_id}/actions/refund`]: {
    post: op({ id: "refundSubscription", tag: "Subscriptions", summary: "Refund and revoke a subscription (Google Play)", security: SECRET, source: R.customers, scopes: ["customer_information:subscriptions:read_write"], parameters: [project, pathParam("subscription_id", "Subscription id.")],
      description: "Google Play only: refunds the latest payment and ends access now. App Store refunds go through Apple. Other stores answer 422.", responses: { 200: ok("The subscription.", ref("Subscription")), ...E(404, 422, 503) } }),
  },
  [`${P}/subscriptions/{subscription_id}/actions/extend`]: {
    post: op({ id: "extendSubscription", tag: "Subscriptions", summary: "Extend a subscription", security: SECRET, source: R.customers, scopes: ["customer_information:subscriptions:read_write"], parameters: [project, pathParam("subscription_id", "Subscription id.")],
      description: "App Store: Apple extends the renewal date (1 to 90 days, `extend_reason_code` required, needs the in-app purchase key). Google Play: the renewal is deferred (up to 365 days). Send `extend_by_days` or `extend_until_ms`, not both.",
      requestBody: body({ oneOf: [obj({ extend_by_days: int(undefined, { minimum: 1 }), extend_reason_code: ReasonCode }, ["extend_by_days"], { additionalProperties: false }), obj({ extend_until_ms: int("New end, epoch milliseconds."), extend_reason_code: ReasonCode }, ["extend_until_ms"], { additionalProperties: false })] }, { extend_by_days: 7, extend_reason_code: "customer_satisfaction" }),
      responses: { 200: ok("The subscription.", ref("Subscription")), ...v2Errors(400, 401, 403, 404, 422, 503) } }),
  },
  [`${P}/subscriptions/{subscription_id}/transactions/{transaction_id}/actions/refund`]: {
    post: op({ id: "refundSubscriptionTransaction", tag: "Subscriptions", summary: "Refund one payment of a subscription (Google Play)", security: SECRET, source: R.customers, scopes: ["customer_information:subscriptions:read_write"], parameters: [project, pathParam("subscription_id", "Subscription id."), pathParam("transaction_id", "Google order id of the payment.")],
      responses: { 200: ok("The refunded payment.", ref("SubscriptionTransaction")), ...E(404, 422, 503) } }),
  },
  [`${P}/purchases`]: {
    get: op({ id: "searchPurchases", tag: "Purchases", summary: "Find one-time purchases by store id", security: SECRET, source: R.customers, scopes: ["customer_information:purchases:read"],
      parameters: [project, { name: "store_purchase_identifier", in: "query", required: true, schema: str(), description: "Store transaction id." }], responses: { 200: list(ref("Purchase")), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/purchases/{purchase_id}`]: { get: op({ id: "getPurchase", tag: "Purchases", summary: "Get a one-time purchase", security: SECRET, source: R.customers, scopes: ["customer_information:purchases:read"], parameters: [project, pathParam("purchase_id", "Purchase id.")], responses: { 200: ok("The purchase.", ref("Purchase")), ...E(404) } }) },
  [`${P}/purchases/{purchase_id}/entitlements`]: { get: op({ id: "listPurchaseEntitlements", tag: "Purchases", summary: "List the entitlements a purchase unlocks", security: SECRET, source: R.customers, scopes: ["customer_information:purchases:read"], parameters: [project, pathParam("purchase_id", "Purchase id."), ...page], responses: { 200: list(ref("Entitlement")), ...E(404) } }) },
  [`${P}/purchases/{purchase_id}/actions/refund`]: {
    post: op({ id: "refundPurchase", tag: "Purchases", summary: "Refund a one-time purchase (Google Play)", security: SECRET, source: R.customers, scopes: ["customer_information:purchases:read_write"], parameters: [project, pathParam("purchase_id", "Purchase id.")],
      description: "Google Play refunds and revokes the order. Other stores answer 422.", responses: { 200: ok("The purchase.", ref("Purchase")), ...E(404, 422, 503) } }),
  },

  // ---- Metrics and webhooks ----------------------------------------------------------------------------------------
  [`${P}/metrics/overview`]: {
    get: op({ id: "getOverviewMetrics", tag: "Metrics", summary: "Overview metrics", security: SECRET, source: R.metrics, scopes: ["charts_metrics:overview:read"],
      parameters: [project, { name: "currency", in: "query", schema: { type: "string", const: "USD" }, description: "Only USD is supported." }, { name: "environment", in: "query", schema: en(["production", "sandbox"]), description: "RevenueDot extension. Default production." }],
      description: "Computed live: active trials, active paid subscriptions, MRR (USD price normalised to a month), revenue in the last 28 days, new and active customers in the last 28 days.",
      responses: { 200: ok("The metrics.", ref("OverviewMetrics")), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/integrations/webhooks`]: {
    get: op({ id: "listWebhooks", tag: "Webhook integrations", summary: "List webhooks", security: SECRET, source: R.integrations, scopes: ["project_configuration:integrations:read"], parameters: [project, ...page], responses: { 200: list(ref("WebhookIntegration")), ...E(404) } }),
    post: op({ id: "createWebhook", tag: "Webhook integrations", summary: "Create a webhook", security: SECRET, source: R.integrations, scopes: ["project_configuration:integrations:read_write"], parameters: [project],
      description: "The answer includes `signing_secret` (whsec_...) once. Store it: it verifies the `X-RevenueCat-Webhook-Signature` header. See [Webhooks](../docs/guides/webhooks.md).",
      requestBody: body(obj({
        name: str(undefined, { maxLength: 255 }), url: str("http(s) URL.", { format: "uri" }), authorization_header: nstr("Sent as the Authorization header."),
        environment: { type: ["string", "null"], enum: ["production", "sandbox", null], description: "Null or absent: both." },
        event_types: arr(en(["initial_purchase", "renewal", "product_change", "cancellation", "billing_issue", "non_renewing_purchase", "uncancellation", "transfer", "subscription_paused", "expiration", "subscription_extended", "invoice_issuance", "temporary_entitlement_grant", "refund_reversed", "virtual_currency_transaction", "test", "experiment_enrollment", "purchase_redeemed", "subscriber_alias", "price_increase_consent_required", "price_increase_consent_approved", "funnel_viewed", "funnel_step_completed", "funnel_purchase"]), { description: "Empty or absent: every type except the opt-in ones (`subscriber_alias` and the three RevenueDot funnel types), which are sent only when named here." }),
        app_id: nstr("Only this app's events."),
      }, ["name", "url"]), { name: "Backend", url: "https://api.example.com/webhooks/revenuedot", authorization_header: "Bearer my-shared-token", environment: "production", event_types: ["initial_purchase", "renewal"] }),
      responses: { 201: ok("The webhook with its signing secret.", ref("WebhookIntegration"), { object: "webhook_integration", id: "wh_ceps8nr7mczvhaqw", project_id: "proj18pzzkao", name: "Backend", url: "https://api.example.com/webhooks/revenuedot", environment: "production", event_types: ["initial_purchase", "renewal"], app_id: null, created_at: 1790801342625, signing_secret: "whsec_3f5b7fb5a591c17aaa9108376df0bddbe1555f0a908bfdc0" }), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/integrations/webhooks/{webhook_integration_id}`]: {
    get: op({ id: "getWebhook", tag: "Webhook integrations", summary: "Get a webhook", security: SECRET, source: R.integrations, scopes: ["project_configuration:integrations:read"], parameters: [project, pathParam("webhook_integration_id", "Webhook id (wh_...).")], responses: { 200: ok("The webhook.", ref("WebhookIntegration")), ...E(404) } }),
    post: op({ id: "updateWebhook", tag: "Webhook integrations", summary: "Update a webhook", security: SECRET, source: R.integrations, scopes: ["project_configuration:integrations:read_write"], parameters: [project, pathParam("webhook_integration_id", "Webhook id.")],
      description: "`enabled` is a RevenueDot extension: false pauses deliveries without deleting the webhook. Events recorded while it is off are not sent; queued retries resume when it is turned on. Read it with `GET /v2/projects/{project_id}/webhooks`.",
      requestBody: body(obj({ name: str(), url: str(), authorization_header: nstr(), environment: { type: ["string", "null"] }, event_types: arr(str()), app_id: nstr(), enabled: bool("RevenueDot extension. False pauses deliveries.") }), { enabled: false }), responses: { 200: ok("The webhook.", ref("WebhookIntegration")), ...v2Errors(400, 401, 403, 404) } }),
    delete: op({ id: "deleteWebhook", tag: "Webhook integrations", summary: "Delete a webhook", security: SECRET, source: R.integrations, scopes: ["project_configuration:integrations:read_write"], parameters: [project, pathParam("webhook_integration_id", "Webhook id.")], description: "Pending deliveries are deleted with it.", responses: { 200: del("webhook_integration"), ...E(404) } }),
  },
};

// ---- RevenueDot extensions ---------------------------------------------------------------------------------------------
export const extensionPaths = {
  "/auth/config": {
    get: op({ id: "authConfig", tag: "Dashboard auth", summary: "Whether sign-up is open", security: NONE, source: R.auth, extension: true,
      description: "What the sign-in page needs before it shows a form.",
      responses: { 200: ok("The config.", obj({ edition: en(["cloud", "self-hosted"]), signup: en(["open", "closed"]) }), { edition: "self-hosted", signup: "closed" }) } }),
  },
  "/auth/signup": {
    post: op({ id: "signup", tag: "Dashboard auth", summary: "Create a dashboard account", security: NONE, source: R.auth, extension: true,
      description: `
Creates the user and a first project, and sets the \`rd_session\` cookie (30 days; \`Secure\` over https). On a self-hosted server only the first account (the owner) can sign up, unless the server runs with \`REVENUEDOT_ALLOW_SIGNUP=true\`.

With \`invite_token\` (from an invite link), the account joins the inviting project instead of getting a new one, and sign-up works even where it is closed. The email must be the invited address; the account counts as verified. On RevenueDot Cloud, an account without an invite gets an email with a confirmation link (valid 24 hours).`,
      requestBody: body(obj({ email: str(undefined, { format: "email" }), password: str(undefined, { minLength: 8, maxLength: 200 }), name: str(undefined, { maxLength: 100 }), project_name: str("Default: My project. Ignored with `invite_token`.", { maxLength: 100 }), invite_token: str("RevenueDot extension. The token from an invite link (`/invite?token=...`).", { maxLength: 200 }) }, ["email", "password"]), { email: "dev@example.com", password: "change-me-please", project_name: "My app" }),
      responses: { 201: ok("Signed up and signed in. With an invite, `project_id` is the project joined.", obj({ ok: bool(), project_id: str("Only with `invite_token`.") }), { ok: true }), 400: ok("Invalid email or password, or an invite that is not valid (`invite_invalid`) or for another address (`invite_email_mismatch`).", obj({ type: str(), message: str() })), 403: ok("Sign-up is closed: the server has an owner already.", obj({ type: str(), message: str() }), { type: "signup_closed", message: "Sign-up is closed on this server: it has an owner account already. The owner can open it by setting REVENUEDOT_ALLOW_SIGNUP=true." }), 409: ok("The email is taken.", obj({ type: str(), message: str() })) } }),
  },
  "/auth/login": {
    post: op({ id: "login", tag: "Dashboard auth", summary: "Sign in", security: NONE, source: R.auth, extension: true,
      description: "The dashboard's sign-in. A request with an `Authorization` header is an app's Auth sign-in instead: see `POST /v1/auth/login`, which takes the same body at this path for the RevenueCat SDKs' token login. With two-factor authentication on, a correct password answers `two_factor_required: true` and a `challenge` instead of a session; finish with `POST /auth/login/2fa`.",
      requestBody: body(obj({ email: str(), password: str() }, ["email", "password"])),
      responses: { 200: ok("Signed in (`rd_session` is set), or the two-factor step.", obj({ ok: bool(), two_factor_required: bool(), challenge: str("For `POST /auth/login/2fa`; 10 minutes."), methods: arr(str()), message: str() }), { ok: true }), 400: ok("Missing fields.", obj({ type: str(), message: str() })), 401: ok("Wrong email or password.", obj({ type: str(), message: str() }), { type: "authentication_error", message: "Email or password is incorrect." }) } }),
  },
  "/.well-known/oauth-authorization-server": {
    get: op({ id: "oauthMetadata", tag: "OAuth for MCP clients", summary: "OAuth authorization server metadata", security: NONE, source: R.oauth, extension: true,
      description: "RFC 8414 metadata for MCP clients (Claude, ChatGPT, Cursor ...). Endpoints are built from this server's public origin.",
      responses: { 200: ok("Metadata.", obj({ issuer: str(), authorization_endpoint: str(), token_endpoint: str(), registration_endpoint: str(), scopes_supported: arr(str()), response_types_supported: arr(str()), response_modes_supported: arr(str()), grant_types_supported: arr(str()), token_endpoint_auth_methods_supported: arr(str()), code_challenge_methods_supported: arr(str()), service_documentation: str() }),
        { issuer: "https://revenuedot.example.com", authorization_endpoint: "https://revenuedot.example.com/oauth/authorize", token_endpoint: "https://revenuedot.example.com/oauth/token", registration_endpoint: "https://revenuedot.example.com/oauth/register", scopes_supported: ["project:read", "project:write"], response_types_supported: ["code"], response_modes_supported: ["query"], grant_types_supported: ["authorization_code"], token_endpoint_auth_methods_supported: ["none"], code_challenge_methods_supported: ["S256"], service_documentation: "https://revenuedot.app/docs/mcp" }) } }),
  },
  "/oauth/register": {
    post: op({ id: "oauthRegister", tag: "OAuth for MCP clients", summary: "Register an OAuth client", security: NONE, source: R.oauth, extension: true,
      description: "Dynamic client registration (RFC 7591), public clients only. Redirect URIs must be https, http on localhost, or an app scheme such as cursor://.",
      requestBody: body(obj({ redirect_uris: arr(str(), { minItems: 1, maxItems: 10 }), client_name: str(), grant_types: arr(str()) }, ["redirect_uris"]), { client_name: "Claude", redirect_uris: ["https://claude.ai/api/mcp/auth_callback"] }),
      responses: { 201: ok("The client.", obj({ client_id: str("oac_..."), client_id_issued_at: int(), client_name: str(), redirect_uris: arr(str()), grant_types: arr(str()), response_types: arr(str()), token_endpoint_auth_method: { type: "string", const: "none" } })), 400: ok("Invalid metadata or redirect URI.", obj({ error: str(), error_description: str() })) } }),
  },
  "/oauth/authorize": {
    get: op({ id: "oauthAuthorize", tag: "OAuth for MCP clients", summary: "Consent screen", security: NONE, source: R.oauth, extension: true,
      description: "An HTML page. The user signs in to the dashboard (the session cookie is reused), picks one project and read or read-write access. PKCE with S256 is required.",
      parameters: ["response_type", "client_id", "redirect_uri", "state", "scope", "code_challenge", "code_challenge_method", "resource"].map((name) => ({ name, in: "query", schema: str() })),
      responses: { 200: { description: "The consent page.", content: { "text/html": { schema: str() } } }, 302: { description: "Back to the client with an error." }, 400: { description: "Unknown client or redirect URI.", content: { "text/html": { schema: str() } } } } }),
    post: op({ id: "oauthDecide", tag: "OAuth for MCP clients", summary: "Submit the consent decision", security: SESSION, source: R.oauth, extension: true,
      description: "The consent form posts here. On allow, redirects to the client's redirect URI with a one-time `code` (valid 10 minutes).",
      requestBody: { required: true, content: { "application/x-www-form-urlencoded": { schema: obj({ decision: en(["allow", "deny"]), project_id: str(), access: en(["project:read", "project:write"]), csrf: str() }) } } },
      responses: { 302: { description: "Redirect with `code` and `state`, or with `error`." }, 403: { description: "The form expired.", content: { "text/html": { schema: str() } } } } }),
  },
  "/oauth/token": {
    post: op({ id: "oauthToken", tag: "OAuth for MCP clients", summary: "Exchange a code for an access token", security: NONE, source: R.oauth, extension: true,
      description: "authorization_code grant with PKCE. The access token is a secret API key (sk_...) bound to the chosen project with the approved permissions. It does not expire; revoke it on the project's API keys page.",
      requestBody: { required: true, content: { "application/x-www-form-urlencoded": { schema: obj({ grant_type: { type: "string", const: "authorization_code" }, code: str(), code_verifier: str(), client_id: str(), redirect_uri: str() }, ["grant_type", "code", "code_verifier"]) }, "application/json": { schema: obj({ grant_type: str(), code: str(), code_verifier: str(), client_id: str(), redirect_uri: str() }) } } },
      responses: { 200: ok("The token.", obj({ access_token: str("A secret key, sk_..."), token_type: { type: "string", const: "Bearer" }, scope: en(["project:read", "project:write"]), project_id: str() })), 400: ok("Invalid grant or request.", obj({ error: str(), error_description: str() })) } }),
  },
  "/auth/logout": { post: op({ id: "logout", tag: "Dashboard auth", summary: "Sign out", security: SESSION, source: R.auth, extension: true, responses: { 200: ok("Signed out.", obj({ ok: bool() }), { ok: true }) } }) },
  "/auth/me": {
    get: op({ id: "me", tag: "Dashboard auth", summary: "The signed-in user and their projects", security: SESSION, source: R.auth, extension: true,
      responses: { 200: ok("The user.", obj({ user: accountUser, account: obj({ edition: en(["cloud", "self-hosted"]), plan: str("The account plan on RevenueDot Cloud: `free`, `standard` or `enterprise`."), billing_ready: bool("RevenueDot Cloud: billing is switched on, so the dashboard links the Billing page. Always false on a self-hosted server."), billing_status: nstr("RevenueDot Cloud: `none`, `active`, `past_due`, `unpaid` or `canceled`. Null on a self-hosted server."), email_verification_required: bool("True on RevenueDot Cloud until the user confirms their email. Until then they cannot invite people or create secret API keys. Always false on a self-hosted server."), features: obj({ benchmarks: bool("Benchmarks exist on this server (RevenueDot Cloud)."), insights_digest: bool("This server emails the weekly growth insights digest.") }) }), projects: arr({ type: "object" }) }),
        { user: { id: "usr_8k2m4q", email: "dev@example.com", name: "Dana", email_verified: true, alert_emails: true }, account: { edition: "cloud", plan: "free", billing_ready: false, billing_status: "none", email_verification_required: false }, projects: [] }), 401: authErr } }),
    post: op({ id: "updateMe", tag: "Dashboard auth", summary: "Update account settings", security: SESSION, source: R.auth, extension: true,
      description: "The display name, whether the user gets [alert emails](../docs/guides/alerts.md) and the weekly [growth insights digest](../docs/guides/growth-insights.md) for projects they administer, and the [Interface and Date and region preferences](../docs/guides/account-settings.md). Send only the fields to change. A null or empty `name` clears it.",
      requestBody: body(obj({ name: nstr(undefined, { maxLength: 100 }), alert_emails: bool("False stops alert emails for every project."), insights_emails: bool("False stops the weekly growth insights digest for every project."), theme: en(["system", "light", "dark"]), tint: nstr("#RRGGBB, or null for the default gold."), week_start: int(undefined, { minimum: 0, maximum: 6 }), display_currency: en(["USD", "EUR", "GBP", "AUD", "CAD", "JPY", "BRL", "KRW", "CNY", "MXN", "SEK", "PLN", "NZD", "CHF"]) }), { alert_emails: false, week_start: 0, display_currency: "EUR" }),
      responses: { 200: ok("The updated user.", obj({ user: accountUser }), { user: { id: "usr_8k2m4q", email: "dev@example.com", name: "Dana", email_verified: true, alert_emails: false } }), 400: ok("Invalid field.", errBody), 401: authErr } }),
  },
  "/auth/password/forgot": {
    post: op({ id: "forgotPassword", tag: "Dashboard auth", summary: "Email a password reset link", security: NONE, source: R.auth, extension: true,
      description: `
Always answers 200 with the same body, whether or not an account uses the address, so the answer does not reveal who has an account. If one does, it gets a link to \`/reset-password\` that works once and expires after 1 hour.

Limits: 5 requests per IP address per 15 minutes (then 429), and 3 emails per address per hour (further requests answer 200 but send nothing). See [I forgot my password](../docs/help/forgot-password.md).`,
      requestBody: body(obj({ email: str(undefined, { format: "email", maxLength: 320 }) }, ["email"]), { email: "dev@example.com" }),
      responses: { 200: ok("Accepted.", obj({ ok: bool(), message: str() }), { ok: true, message: "If an account uses this email, we sent it a link to reset the password. The link expires in 1 hour." }), 400: ok("Not a valid email address.", errBody), 429: ok("Too many requests from this IP address.", errBody, { type: "rate_limit_error", message: "Too many password reset requests. Try again in 15 minutes." }) } }),
  },
  "/auth/password/check": {
    post: op({ id: "checkPasswordReset", tag: "Dashboard auth", summary: "Check a password reset link", security: NONE, source: R.auth, extension: true,
      description: "Tells the reset page whether the link still works before the user types a new password. Does not use up the link.",
      requestBody: body(obj({ token: str("The `token` from the reset link.", { maxLength: 200 }) }, ["token"])),
      responses: { 200: ok("Whether the link works.", obj({ valid: bool(), email: str("The account's email, when valid."), reason: tokenReason, message: str("Why it does not work.") }), { valid: false, reason: "expired", message: "This link has expired. Ask for a new one." }), 400: ok("Missing token.", errBody) } }),
  },
  "/auth/password/reset": {
    post: op({ id: "resetPassword", tag: "Dashboard auth", summary: "Set a new password from a reset link", security: NONE, source: R.auth, extension: true,
      description: "Sets the password, signs the user out on every device, marks the email as confirmed (the link proved the inbox) and signs this browser in with a new `rd_session` cookie. Every other open reset link of the user stops working, and so do two-factor sign-ins begun with the old password. With two-factor authentication on, it answers `two_factor_required: true` and a `challenge` instead of signing in; finish with `POST /auth/login/2fa`.",
      requestBody: body(obj({ token: str(undefined, { maxLength: 200 }), password: str(undefined, { minLength: 8, maxLength: 200 }) }, ["token", "password"]), { token: "…", password: "a-new-long-password" }),
      responses: { 200: ok("Password changed and signed in, or the two-factor step.", obj({ ok: bool(), two_factor_required: bool(), challenge: str("For `POST /auth/login/2fa`; 10 minutes."), methods: arr(str()), message: str(), password_reset: bool() }), { ok: true }), 400: ok("The password is too short or too long, or the link is not valid (`token_invalid` with a `reason`).", obj({ type: str(), reason: tokenReason, message: str() }), { type: "token_invalid", reason: "used", message: "This link was already used. Ask for a new one if you still need it." }) } }),
  },
  "/auth/email/verify": {
    post: op({ id: "verifyEmail", tag: "Dashboard auth", summary: "Confirm an email address", security: NONE, source: R.auth, extension: true,
      description: "RevenueDot Cloud only: the link in the confirmation email sent at sign-up (valid 24 hours, works once). Self-hosted servers treat every account as confirmed.",
      requestBody: body(obj({ token: str("The `token` from the confirmation link.", { maxLength: 200 }) }, ["token"])),
      responses: { 200: ok("Confirmed.", obj({ ok: bool(), email: str() }), { ok: true, email: "dev@example.com" }), 400: ok("The link is not valid (`token_invalid` with a `reason`).", obj({ type: str(), reason: tokenReason, message: str() })) } }),
  },
  "/auth/email/verify/resend": {
    post: op({ id: "resendVerification", tag: "Dashboard auth", summary: "Send a new confirmation email", security: SESSION, source: R.auth, extension: true,
      description: "Up to 5 per user per hour. An account that is already confirmed gets `already_verified: true` and no email.",
      responses: { 200: ok("Sent, or already confirmed.", obj({ ok: bool(), email: str(), already_verified: bool() }), { ok: true, email: "dev@example.com" }), 401: authErr,
        429: ok("Too many emails this hour.", errBody, { type: "rate_limit_error", message: "Too many emails sent. Try again in an hour." }), 502: ok("The mail server did not accept the email.", errBody) } }),
  },
  "/auth/invites/{token}": {
    get: op({ id: "getInvite", tag: "Dashboard auth", summary: "Look up an invite", security: NONE, source: R.auth, extension: true, parameters: [inviteToken],
      description: "What the invite page shows: the project, the role, who sent it and whether the invited address has an account already (sign in and accept, or sign up with `invite_token`).",
      responses: { 200: ok("The invite.", obj({ object: { type: "string", const: "invite" }, email: str(), role: en(["admin", "developer", "viewer"]), project: obj({ id: str(), name: str() }), invited_by: { type: ["object", "null"], properties: { name: nstr(), email: str() } }, expires_at: ms("When the link stops working."), account_exists: bool("Whether an account uses the invited address.") }),
        { object: "invite", email: "sam@example.com", role: "developer", project: { id: "proj18pzzkao", name: "My app" }, invited_by: { name: "Dana", email: "dev@example.com" }, expires_at: 1791405714000, account_exists: false }),
        404: ok("Not valid, expired, already accepted or revoked.", obj({ type: str(), reason: en(["invalid", "expired", "accepted", "revoked"]), message: str() }), { type: "invite_invalid", reason: "expired", message: "This invite has expired. Ask the person who invited you for a new one." }) } }),
  },
  "/auth/invites/{token}/accept": {
    post: op({ id: "acceptInvite", tag: "Dashboard auth", summary: "Accept an invite", security: SESSION, source: R.auth, extension: true, parameters: [inviteToken],
      description: "For a user who already has an account, signed in with the invited address. Adds them to the project with the invite's role; someone who is already a member keeps their role. Also marks their email as confirmed.",
      responses: { 200: ok("Joined.", obj({ ok: bool(), project_id: str() }), { ok: true, project_id: "proj18pzzkao" }), 401: authErr,
        403: ok("Signed in with another address.", errBody, { type: "invite_email_mismatch", message: "This invite is for sam@example.com, and you are signed in as dev@example.com. Sign in with the invited address." }), 404: ok("The invite is no longer valid.", errBody) } }),
  },
  [`${P}/invites`]: {
    get: op({ id: "listInvites", tag: "Members and invites", summary: "List open invites", security: SESSION, source: R.members, extension: true, scopes: ["project_configuration:collaborators:read"], parameters: [project],
      description: "Invites nobody has accepted or revoked, oldest first. Expired ones stay listed so an admin can resend them. Needs a dashboard session: secret API keys cannot manage members.",
      responses: { 200: list(ref("Invite"), "Open invites.", { object: "list", items: [inviteExample], next_page: null, url: "/v2/projects/proj18pzzkao/invites" }), ...E(404) } }),
    post: op({ id: "createInvite", tag: "Members and invites", summary: "Invite someone by email", security: SESSION, source: R.members, extension: true, parameters: [project],
      description: `
Admins only. Emails a link that lasts 7 days. Inviting an address that already has an open invite replaces it: the role changes, a new link goes out and the old one stops working. See [Invite your team](../docs/guides/team.md).

On RevenueDot Cloud the admin needs a confirmed email address. A project can send 50 invites (including resends) per day; after that the answer is 429. \`email_sent\` is false when the mail server refused the email; the invite still exists and can be resent.`,
      requestBody: body(obj({ email: str(undefined, { format: "email", maxLength: 320 }), role: en(["admin", "developer", "viewer"]) }, ["email", "role"]), { email: "sam@example.com", role: "developer" }),
      responses: { 201: ok("The invite.", { allOf: [ref("Invite"), obj({ email_sent: bool("Whether the mail server accepted the email.") })] }, { ...inviteExample, email_sent: true }), ...v2Errors(400, 401, 403, 404, 409, 429) } }),
  },
  [`${P}/invites/{invite_id}/actions/resend`]: {
    post: op({ id: "resendInvite", tag: "Members and invites", summary: "Resend an invite", security: SESSION, source: R.members, extension: true, parameters: [project, inviteId],
      description: "Admins only. Sends a new link valid for 7 more days; the old link stops working. Works on expired invites. Counts toward the 50 invites per project per day.",
      responses: { 200: ok("The invite.", { allOf: [ref("Invite"), obj({ email_sent: bool() })] }), ...v2Errors(401, 403, 404, 429) } }),
  },
  [`${P}/invites/{invite_id}`]: {
    delete: op({ id: "revokeInvite", tag: "Members and invites", summary: "Revoke an invite", security: SESSION, source: R.members, extension: true, parameters: [project, inviteId],
      description: "Admins only. The link stops working at once.",
      responses: { 200: del("invite"), ...E(404) } }),
  },
  [`${P}/collaborators/{user_id}`]: {
    post: op({ id: "updateCollaborator", tag: "Members and invites", summary: "Change a member's role", security: SESSION, source: R.members, extension: true, parameters: [project, pathParam("user_id", "The member's user id (the collaborator `id`).")],
      description: "Admins only. A project always keeps at least one admin, so the last admin cannot be demoted (400). The response uses RevenueCat's role names: `viewer` comes back as `read_only`.",
      requestBody: body(obj({ role: en(["admin", "developer", "viewer"]) }, ["role"]), { role: "viewer" }),
      responses: { 200: ok("The member.", ref("Collaborator"), { object: "collaborator", id: "usr_3n7p1x", name: "Sam", email: "sam@example.com", role: "read_only", accepted_at: 1790800914012, has_mfa: false }), ...v2Errors(400, 401, 403, 404) } }),
    delete: op({ id: "removeCollaborator", tag: "Members and invites", summary: "Remove a member, or leave the project", security: SESSION, source: R.members, extension: true, parameters: [project, pathParam("user_id", "The member's user id. Your own id leaves the project.")],
      description: "Any member can remove themselves. Removing someone else takes an admin. The last admin cannot leave or be removed (422): make someone else an admin first, or delete the project.",
      responses: { 200: del("collaborator"), ...E(404, 422) } }),
  },
  [`${P}/apps/{app_id}/store_settings`]: {
    get: op({ id: "getStoreSettings", tag: "Store setup", summary: "Store setup state of an app", security: SECRET, source: R.setup, extension: true, scopes: ["project_configuration:apps:read"], parameters: [project, param("AppId")],
      description: "The notification URL to paste into App Store Connect, Pub/Sub, the Amazon Appstore Console, Stripe, Paddle, the Roku developer dashboard or Samsung Seller Portal, the notification status, the forwarding URL and which credentials are set. Never a secret.",
      responses: { 200: ok("The settings.", ref("StoreSettings")), ...E(404) } }),
  },
  [`${P}/apps/{app_id}/sample_app`]: {
    get: op({ id: "downloadSampleApp", tag: "Store setup", summary: "Download the sample app for this app", security: SECRET, source: R.setup, extension: true, scopes: ["project_configuration:apps:read"],
      parameters: [project, param("AppId"), { name: "platform", in: "query", required: false, description: "`ios`, `android`, `flutter`, `react_native` or `web`; the app's \`sample_apps\` in store settings lists the ones offered (Test Store: all five; App Store: iOS, Flutter, React Native; Google Play: Android, Flutter, React Native; Web Billing: web). Defaults to the first.", schema: en(["ios", "android", "flutter", "react_native", "web"]) }],
      description: "\"Test your setup with the sample app\": a zip of the matching example from [revenuedot/examples](https://github.com/revenuedot/examples) with this app's public key, this server's URL (\`api_origin\`; \`localhost\` becomes \`10.0.2.2\` for the Android emulator) and the project's first entitlement filled in. Flutter, React Native and web samples get a \`.env\`. Only public values go in. The \`X-RevenueDot-Examples-Commit\` header names the examples commit.",
      responses: { 200: { description: "The zip.", content: { "application/zip": { schema: { type: "string", format: "binary" } } } }, ...E(400, 404) } }),
  },
  [`${P}/apps/{app_id}/actions/verify_credentials`]: {
    post: op({ id: "verifyCredentials", tag: "Store setup", summary: "Check store credentials with the store", security: SECRET, source: R.setup, extension: true, scopes: ["project_configuration:apps:read"], parameters: [project, param("AppId")],
      description: "Makes one harmless call to the App Store Server API, the Play Developer API, Amazon's Receipt Verification Service (a made-up receipt: 496 means a wrong shared key), Stripe (lists one subscription and one Checkout Session with the key), Paddle (event types, then one product and one subscription; Paddle answers 403 for a wrong, revoked or other-environment key), Roku Pay (a made-up transaction: UNAUTHORIZED means a wrong key) or Samsung (an access token from the service account, then a made-up subscription). Values in the body are checked before you save them; missing values fall back to the saved ones. A Stripe app connected with Stripe Connect checks its connection only: Stripe values in the body answer 409.",
      requestBody: body(obj({
        app_store: obj({ bundle_id: nstr(), subscription_private_key: nstr(), subscription_key_id: nstr(), subscription_key_issuer: nstr() }),
        mac_app_store: obj({ bundle_id: nstr(), subscription_private_key: nstr(), subscription_key_id: nstr(), subscription_key_issuer: nstr() }),
        play_store: obj({ package_name: nstr(), play_service_account_credentials_json: { oneOf: [str(), { type: "object" }, { type: "null" }] } }),
        amazon: obj({ package_name: nstr(), shared_secret: nstr() }),
        stripe: obj({ stripe_secret_key: nstr(), stripe_account_id: nstr() }),
        paddle: obj({ paddle_api_key: nstr(), paddle_is_sandbox: { type: ["boolean", "null"] } }),
        roku: obj({ roku_api_key: nstr() }),
        galaxy: obj({ package_name: nstr(), galaxy_service_account_id: nstr(), galaxy_service_account_private_key: nstr() }),
      }), {}, false),
      responses: { 200: ok("The result.", ref("CredentialsCheck"), { object: "credentials_check", app_id: "appugfw01uy", store: "app_store", status: "invalid", valid: false, message: "No in-app purchase key yet. Add the .p8 file, the key ID and the issuer ID.", checked_at: 1790801342700 }), ...v2Errors(400, 401, 403, 404, 409) } }),
  },
  [`${P}/apps/{app_id}/actions/apply_notification_settings`]: {
    post: op({ id: "applyNotificationSettings", tag: "Store setup", summary: "Paddle: create the notification destination (Apply in Paddle)", security: SECRET, source: R.setup, extension: true, scopes: ["project_configuration:apps:read_write"], parameters: [project, param("AppId")],
      description: "Creates a notification destination in the app's Paddle account (or updates the one it created before) that sends the subscription, transaction and adjustment events RevenueDot reads to this app's notification URL, and saves the destination's secret key, sealed. The API key needs write access to Notification settings. Only for Paddle apps (422 otherwise). See [Paddle setup](../docs/guides/paddle.md).",
      responses: { 200: ok("The destination.", obj({ object: { type: "string", const: "notification_settings" }, app_id: str(), store: { type: "string", const: "paddle" }, notification_setting_id: str("ntfset_…"), destination: str("The notification URL Paddle now calls."), subscribed_events: arr(str()), secret_saved: bool() }),
        { object: "notification_settings", app_id: "app4f1x9k2m", store: "paddle", notification_setting_id: "ntfset_01h8d3a0kq7m2x9c4v6b1n5p3r", destination: "https://api.revenuedot.app/v1/notifications/paddle/app4f1x9k2m", subscribed_events: ["subscription.created", "subscription.updated", "transaction.completed", "adjustment.created"], secret_saved: true }),
        ...v2Errors(400, 401, 403, 404, 422) } }),
  },
  [`${P}/apps/{app_id}/actions/verify_app_store_connect_key`]: {
    post: op({ id: "verifyAppStoreConnectKey", tag: "Store setup", summary: "Check the App Store Connect API key with Apple", security: SECRET, source: R.setup, extension: true, scopes: ["project_configuration:apps:read_write"], parameters: [project, param("AppId")],
      description: "For App Store and Mac App Store apps. Makes one read-only call to the App Store Connect API (used by Import products and the product editor) and does not store anything. Values in the body are checked before you save them; missing values fall back to the saved ones. Needs write access because the saved key with another `bundle_id` in the body would describe any app of the developer's Apple team. Other app types answer 400.",
      requestBody: body(obj({ bundle_id: nstr(), app_store_connect_api_key: nstr(), app_store_connect_api_key_id: nstr(), app_store_connect_api_key_issuer: nstr() }), {}, false),
      responses: { 200: ok("The result.", ref("CredentialsCheck"), { object: "credentials_check", app_id: "appugfw01uy", store: "app_store", key: "app_store_connect_api_key", status: "valid", valid: true, message: "App Store Connect accepted the key.", checked_at: 1790801342700 }), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/apps/{app_id}/actions/mass_extend`]: {
    post: op({ id: "massExtend", tag: "Store setup", summary: "Extend every active App Store subscriber of a product", security: SECRET, source: R.setup, extension: true, scopes: ["customer_information:subscriptions:read_write"], parameters: [project, param("AppId")],
      description: "Asks Apple to extend renewal dates for all active subscribers of `product_id`. Apple then sends one notification per subscription, which records SUBSCRIPTION_EXTENDED.",
      requestBody: body(obj({ product_id: str(), extend_by_days: int(undefined, { minimum: 1, maximum: 90 }), extend_reason_code: en(["undeclared", "customer_satisfaction", "other", "service_issue_or_outage"]), storefront_country_codes: arr(str("ISO 3166-1 alpha-3, for example USA.")), environment: en(["production", "sandbox"]) }, ["product_id", "extend_by_days", "extend_reason_code"]),
        { product_id: "pro_monthly", extend_by_days: 3, extend_reason_code: "service_issue_or_outage" }),
      responses: { 202: ok("Accepted by Apple.", ref("MassExtension")), ...v2Errors(400, 401, 403, 404, 422, 503) } }),
  },
  [`${P}/apps/{app_id}/mass_extensions/{request_id}`]: {
    get: op({ id: "getMassExtension", tag: "Store setup", summary: "Status of a mass extension", security: SECRET, source: R.setup, extension: true, scopes: ["customer_information:subscriptions:read"],
      parameters: [project, param("AppId"), pathParam("request_id", "The `id` from the mass extend answer."), { name: "product_id", in: "query", required: true, schema: str() }, { name: "environment", in: "query", schema: en(["production", "sandbox"]) }],
      responses: { 200: ok("The status.", ref("MassExtension")), ...v2Errors(400, 401, 403, 404, 422, 503) } }),
  },
  [`${P}/integrations/webhooks/{webhook_integration_id}/test`]: {
    post: op({ id: "testWebhook", tag: "Webhook deliveries", summary: "Send a TEST event to one webhook", security: SECRET, source: R.setup, extension: true, scopes: ["project_configuration:integrations:read_write"], parameters: [project, pathParam("webhook_integration_id", "Webhook id.")],
      description: "Queues a purchase-shaped TEST event, signed and retried like any delivery. The webhook's filters do not apply. A paused webhook (`enabled` false) answers 422.",
      responses: { 201: ok("The queued delivery.", ref("WebhookDelivery")), ...v2Errors(401, 403, 404, 422) } }),
  },
  [`${P}/webhooks`]: {
    get: op({ id: "listWebhookStates", tag: "Webhook deliveries", summary: "Whether each webhook is enabled", security: SECRET, source: R.ext, extension: true, scopes: ["project_configuration:integrations:read"], parameters: [project],
      description: "RevenueCat's webhook object has no `enabled` field, so it is read here. Set it with `POST .../integrations/webhooks/{id}`.",
      responses: { 200: list(ref("WebhookState")), ...E(404) } }),
  },
  [`${P}/webhooks/{webhook_id}/deliveries`]: {
    get: op({ id: "listWebhookDeliveries", tag: "Webhook deliveries", summary: "Delivery log of a webhook", security: SECRET, source: R.ext, extension: true, scopes: ["project_configuration:integrations:read"],
      parameters: [project, pathParam("webhook_id", "Webhook id (wh_...)."), { name: "status", in: "query", schema: en(["pending", "delivered", "failed"]) }, ...page],
      description: "Newest first.", responses: { 200: list(ref("WebhookDelivery")), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/webhooks/{webhook_id}/deliveries/{delivery_id}`]: {
    get: op({ id: "getWebhookDelivery", tag: "Webhook deliveries", summary: "One delivery: what was sent and every attempt", security: SECRET, source: R.ext, extension: true, scopes: ["project_configuration:integrations:read_write"],
      parameters: [project, pathParam("webhook_id", "Webhook id."), pathParam("delivery_id", "Delivery id.")],
      description: `
The request as sent (method, URL, headers and the exact body; the Authorization value is masked) and every attempt, newest last (at most 10): when it was sent, the HTTP status, the latency, the error, the first 4,096 characters of the answer, and the signature header of that attempt. Answers and errors have the webhook's Authorization value (also the credential alone) and signing secret replaced, and anything that looks like a credential: bearer and basic credentials, passwords in URLs, token-like JSON fields and query parameters. \`curl\` repeats the request with a placeholder for Authorization.
Bodies can hold customer data, so this needs \`read_write\` (Admins and Developers). Attempt details are kept for \`attempt_log_kept_days\` (30) days after each attempt; the delivery itself stays.`,
      responses: { 200: ok("The delivery.", obj({
        object: { type: "string", const: "webhook_delivery" }, id: str(), webhook_integration_id: str(), event_id: str(), event_type: str(), status: en(["pending", "delivered", "failed"]), attempts: int(),
        next_attempt_at: nms("Next try while pending."), response_status: nint(), response_ms: nint(), last_error: nstr(), created_at: ms("Queued."),
        request: obj({ method: str(), url: str(), headers: arr(obj({ name: str(), value: str() }, ["name", "value"])), body: str("The exact JSON body sent.") }, ["method", "url", "headers", "body"]),
        curl: str("A cURL command that repeats the request, credentials left as placeholders."),
        attempt_log: arr(obj({ attempted_at: ms("When it was sent."), response_status: nint(), response_ms: nint(), error: nstr(), response_body: nstr("First 4,096 characters, secrets replaced."), signature: nstr("X-RevenueCat-Webhook-Signature of this attempt.") }, ["attempted_at", "response_status", "response_ms", "error", "response_body"])),
        attempt_log_kept_days: int("How long attempt details are kept."),
      }, ["object", "id", "status", "attempts", "request", "curl", "attempt_log", "attempt_log_kept_days"])), ...v2Errors(401, 403, 404) } }),
  },
  [`${P}/webhooks/{webhook_id}/deliveries/{delivery_id}/retry`]: {
    post: op({ id: "retryWebhookDelivery", tag: "Webhook deliveries", summary: "Retry a delivery now", security: SECRET, source: R.ext, extension: true, scopes: ["project_configuration:integrations:read_write"],
      parameters: [project, pathParam("webhook_id", "Webhook id."), pathParam("delivery_id", "Delivery id.")],
      description: "Queues the delivery now, also one waiting for its scheduled retry. 409 (`resource_locked_error`) while a job run is sending it.",
      responses: { 200: ok("The delivery, queued.", ref("WebhookDelivery")), ...E(404, 409) } }),
  },
  [`${P}/events`]: {
    get: op({ id: "listEvents", tag: "Event log", summary: "Event log", security: SECRET, source: R.ext, extension: true, scopes: ["customer_information:customers:read"],
      parameters: [project, { name: "type", in: "query", schema: arr(str()), style: "form", explode: true, description: "Event types (any case); repeat or comma-separate." }, { name: "customer", in: "query", schema: str(), description: "Any app user id of the customer." }, param("Environment"), ...page],
      description: "Every event the project recorded, newest first. `body` is exactly what webhooks receive.", responses: { 200: list(ref("Event")), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/transactions`]: {
    get: op({ id: "listTransactions", tag: "Event log", summary: "Transaction feed", security: SECRET, source: R.ext, extension: true, scopes: ["customer_information:purchases:read"],
      parameters: [project, { name: "customer", in: "query", schema: str(), description: "Any app user id of the customer." }, param("Environment"), ...page],
      description: "Every purchase, renewal, trial start, refund and refund reversal, newest first.", responses: { 200: list(ref("Transaction")), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/setup_health`]: {
    get: op({ id: "getSetupHealth", tag: "Store setup", summary: "Setup health", security: SECRET, source: R.ext, extension: true, scopes: ["project_configuration:apps:read"], parameters: [project],
      description: "Per app: the notification URL and whether notifications arrive. For webhooks: deliveries in the last 24 hours and failing endpoints. Also the SDK versions calling the server.",
      responses: { 200: ok("Setup health.", ref("SetupHealth")), ...E(404) } }),
  },
  [`${P}/api_keys`]: {
    get: op({ id: "listApiKeys", tag: "API keys", summary: "List secret keys", security: SECRET, source: R.ext, extension: true, scopes: ["project_configuration:api_keys:read"], parameters: [project, ...page],
      description: "Never returns the key itself.", responses: { 200: list(ref("ApiKey")), ...E(404) } }),
    post: op({ id: "createApiKey", tag: "API keys", summary: "Create a secret key", security: SECRET, source: R.ext, extension: true, scopes: ["project_configuration:api_keys:read_write"], parameters: [project],
      description: "The answer includes `key` once. `permissions` default to `[\"*\"]`. A key cannot create a key with permissions it does not hold.",
      requestBody: body(obj({ name: str(undefined, { maxLength: 100 }), permissions: arr(str(), { minItems: 1, maxItems: 100 }) }, ["name"]), { name: "Backend (read only)", permissions: ["customer_information:customers:read"] }),
      responses: { 201: ok("The key.", ref("ApiKey"), { object: "api_key", id: "key_08ec817fce", name: "Backend (read only)", prefix: "sk_08ec", permissions: ["customer_information:customers:read"], created_at: 1790801342634, last_used_at: null, key: "sk_08ec817fceead27005772bb943c2bd225850eb931c9835f0" }), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/api_keys/{key_id}`]: {
    delete: op({ id: "deleteApiKey", tag: "API keys", summary: "Delete a secret key", security: SECRET, source: R.ext, extension: true, scopes: ["project_configuration:api_keys:read_write"], parameters: [project, pathParam("key_id", "Key id (key_...).")], responses: { 200: del("api_key"), ...E(404) } }),
  },
  [`${P}/test_purchases`]: {
    post: op({ id: "createTestPurchase", tag: "Test Store", summary: "Simulate a Test Store purchase or lifecycle", security: SECRET, source: R.ext, extension: true, scopes: ["customer_information:purchases:read_write"], parameters: [project],
      description: `
Runs a purchase through the same pipeline as an SDK receipt, so events, the transaction ledger and webhooks come out as they would. Scenarios:
\`purchase\`, \`trial\`, \`trial_conversion\`, \`renewal\`, \`cancel\`, \`billing_issue\`, \`refund\`, \`expire\`. See [the Test Store guide](../docs/guides/test-store.md).`,
      requestBody: body(obj({
        app_user_id: str(undefined, { maxLength: 100 }), product_id: str("Product id or store identifier of a Test Store product."), app_id: str("Test Store app; default the project's first."),
        price: num("Without a price, the product's Test Store price.", { minimum: 0 }), currency: str("ISO 4217 code; default USD. A code with no exchange rate to USD is refused."), purchased_at: int("Start, epoch milliseconds. Not with offset_days."),
        presented_offering_id: str(), scenario: en(["purchase", "trial", "trial_conversion", "renewal", "cancel", "billing_issue", "refund", "expire"]),
        offset_days: num("Days ago the scenario starts (0 to 730).", { minimum: 0, maximum: 730 }), country_code: str("ISO 3166-1 alpha-2, upper case."),
      }, ["app_user_id", "product_id"]), { app_user_id: "user_renewal", product_id: "pro_monthly", scenario: "renewal", price: 9.99 }),
      responses: { 201: ok("What happened.", ref("TestPurchase")), ...v2Errors(400, 401, 403, 404, 422) } }),
  },
  [`${P}/metrics/history`]: {
    get: op({ id: "getMetricHistory", tag: "Dashboard data", summary: "Daily history of an overview metric", security: SECRET, source: R.ext, extension: true, scopes: ["charts_metrics:overview:read"],
      parameters: [project, { name: "metric", in: "query", required: true, schema: en(["active_trials", "active_subscriptions", "mrr", "revenue", "new_customers", "active_users"]) }, { name: "days", in: "query", schema: int(undefined, { minimum: 1, maximum: 366, default: 28 }) }, { name: "environment", in: "query", schema: en(["production", "sandbox"]) }],
      responses: { 200: ok("The history.", ref("MetricHistory")), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/customer_summaries`]: {
    get: op({ id: "listCustomerSummaries", tag: "Dashboard data", summary: "Dashboard rows for customers", security: SECRET, source: R.ext, extension: true, scopes: ["customer_information:customers:read"],
      parameters: [project, { name: "ids", in: "query", required: true, schema: str(), description: "Up to 100 app user ids, comma separated or repeated." }],
      description: "Revenue, entitlement names and prices per customer. Unknown ids are left out.", responses: { 200: list(ref("CustomerSummary")), ...v2Errors(400, 401, 403, 404) } }),
  },
  "/v2/overview": {
    get: op({ id: "getAccountOverview", tag: "Dashboard data", summary: "Overview cards summed across your projects", security: SESSION, source: R.account, extension: true, scopes: ["charts_metrics:overview:read"],
      description: `
The six Overview cards (active trials, active subscriptions, MRR, revenue, new customers, active customers) summed over every project the signed-in user belongs to, as on the dashboard's Overview with "All projects" selected. Each card has \`value\` (the per-project Overview definition) and \`history\` (the daily series for \`days\`, summed per date).
Each project is checked like a project route: a project counts only where the user's role (or an enterprise custom role) includes \`charts_metrics:overview:read\`; enforced single sign-on and an organization that deprovisioned the user leave one out. \`projects\` lists every project the user is a member of with \`included\` and, when left out, \`reason\`; a project the user was removed from is not listed at all. Dashboard sessions only: a secret key belongs to one project and gets 403.`,
      parameters: [{ name: "environment", in: "query", schema: en(["production", "sandbox"]) }, { name: "days", in: "query", schema: int(undefined, { minimum: 1, maximum: 366, default: 28 }) },
        { name: "project_ids", in: "query", schema: str(), description: "Only these projects (comma separated, at most 100). Ids you cannot open are ignored." }],
      responses: { 200: ok("The summed cards.", obj({
        object: { type: "string", const: "account_overview" }, currency: { type: "string", const: "USD" }, environment: en(["production", "sandbox"]), days: int(),
        projects: arr(obj({ id: str(), name: str(), included: bool(), reason: str("Why the project is left out.") }, ["id", "name", "included"])),
        metrics: arr(obj({
          object: { type: "string", const: "overview_metric" }, id: en(["active_trials", "active_subscriptions", "mrr", "revenue", "new_customers", "active_users"]), name: str(), description: str(), unit: str(), period: str(), value: num(),
          history: ref("MetricHistory"), last_updated_at: ms("When the numbers were computed."),
        }, ["object", "id", "value", "history"])),
        last_updated_at: ms("When the numbers were computed."),
      }, ["object", "currency", "environment", "days", "projects", "metrics"])), ...v2Errors(400, 401, 403) } }),
  },
  "/v2/overview/transactions": {
    get: op({ id: "listAccountTransactions", tag: "Dashboard data", summary: "Transactions across your projects", security: SESSION, source: R.account, extension: true, scopes: ["customer_information:purchases:read"],
      description: "Every purchase, renewal, trial start, refund and refund reversal of the projects the signed-in user may read purchases in (`customer_information:purchases:read`), newest first, each with `project_id`. The list also carries `projects` with `included` and `reason`, as on `GET /v2/overview`. `starting_after` must be a transaction of an included project.",
      parameters: [{ name: "environment", in: "query", schema: en(["production", "sandbox"]) }, { name: "project_ids", in: "query", schema: str(), description: "Only these projects (comma separated, at most 100). Ids you cannot open are ignored." }, ...page],
      responses: { 200: list(ref("Transaction")), ...v2Errors(400, 401, 403) } }),
  },
  [`${P}/import/customers`]: {
    post: op({ id: "importCustomers", tag: "Migration import", summary: "Import customers with their purchases", security: SECRET, source: R.import, extension: true, scopes: ["customer_information:customers:read_write"], parameters: [project],
      description: `
Up to 100 RevenueCat-shaped customers per call, each with aliases, attributes, subscriptions and one-time purchases. Writes state directly: no events and no webhooks unless \`emit_events\` is true.
Keeps first-seen dates, original purchase dates and store transaction ids, and keys each subscription like the store adapters do (Apple original transaction id, Google purchase token), so later receipts and notifications update the imported row. Running the same import twice changes nothing.
Google subscriptions without \`purchase_token\` are keyed \`needs_token_refresh:<order id>\` until a token is found. The \`revenuedot import\` CLI calls this; see [the importer](../docs/migrate/importer.md).`,
      requestBody: body(obj({
        customers: arr(obj({
          id: str(), aliases: arr(str()), first_seen_at: int(), last_seen_at: int(), last_seen_app_version: nstr(), last_seen_country: nstr(), last_seen_platform: nstr(),
          attributes: arr(obj({ name: str(), value: nstr(), updated_at: int() }, ["name", "value"])),
          subscriptions: arr(obj({
            source_id: str(), app_id: nstr(), store: str(), product_identifier: str(), environment: en(["production", "sandbox"]), ownership: en(["purchased", "family_shared"]),
            starts_at: int(), current_period_starts_at: int(), current_period_ends_at: { type: ["integer", "null"] },
            status: en(["trialing", "active", "expired", "in_grace_period", "in_billing_retry", "paused", "unknown", "incomplete"]),
            auto_renewal_status: en(["will_renew", "will_not_renew", "will_change_product", "will_pause", "requires_price_increase_consent", "has_already_renewed"]),
            store_subscription_identifier: str(), original_transaction_id: nstr(), original_transaction_id_confirmed: bool(), purchase_token: nstr(),
            period_type: en(["normal", "trial", "intro", "promotional", "prepaid"]), country: nstr(), price: { type: ["object", "null"] }, total_revenue_usd: { type: ["number", "null"] },
            unsubscribe_detected_at: { type: ["integer", "null"] }, billing_issues_detected_at: { type: ["integer", "null"] }, grace_period_expires_at: { type: ["integer", "null"] },
            refunded_at: { type: ["integer", "null"] }, auto_resume_at: { type: ["integer", "null"] }, entitlement_lookup_keys: arr(str()), auto_renew_product_identifier: nstr(),
            transactions: arr(obj({ id: str(), purchased_at: int(), expires_at: { type: ["integer", "null"] }, revenue_usd: { type: ["number", "null"] }, price: { type: ["object", "null"] } }, ["id", "purchased_at"])),
          }, ["store", "product_identifier", "starts_at", "current_period_starts_at", "status", "store_subscription_identifier"])),
          purchases: arr(obj({
            source_id: str(), app_id: nstr(), store: str(), product_identifier: str(), environment: en(["production", "sandbox"]), purchased_at: int(), store_purchase_identifier: str(),
            status: en(["owned", "refunded"]), refunded_at: { type: ["integer", "null"] }, consumable: bool(), price: { type: ["object", "null"] }, revenue_usd: { type: ["number", "null"] }, country: nstr(),
          }, ["store", "product_identifier", "purchased_at", "store_purchase_identifier"])),
        }, ["id"]), { minItems: 1, maxItems: 100 }),
        emit_events: bool("Default false."), resolve_store_ids: bool("Default true: use the app's store credentials to confirm Apple ids and find Google tokens."),
      }, ["customers"]), { customers: [{ id: "imported_1", aliases: ["$RCAnonymousID:0f1e2d"], first_seen_at: 1735689600000, attributes: [{ name: "$email", value: "ana@example.com" }], subscriptions: [{ store: "test_store", app_id: "appvnrm0a5h", product_identifier: "pro_annual", starts_at: 1735689600000, current_period_starts_at: 1767225600000, current_period_ends_at: 1798761600000, status: "active", auto_renewal_status: "will_renew", store_subscription_identifier: "test_1767225600000_imported" }] }] }),
      responses: { 200: ok("A report per customer.", ref("ImportResult"), { object: "import_result", emit_events: false, customers: [{ id: "imported_1", status: "created", subscriptions: 1, purchases: 0, needs_token_refresh: 0, notes: [] }] }), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/import/apps/{app_id}/public_key`]: {
    post: op({ id: "importPublicKey", tag: "Migration import", summary: "Keep an app's existing SDK key", security: SECRET, source: R.import, extension: true, scopes: ["project_configuration:apps:read_write"], parameters: [project, param("AppId")],
      description: "Sets the app's public key to the one your shipped app binaries already send (appl_..., goog_...), so old app versions work against RevenueDot. The prefix must match the app's store.",
      requestBody: body(obj({ public_key: str(undefined, { minLength: 4, maxLength: 255 }) }, ["public_key"]), { public_key: "appl_AbCdEfGhIjKlMnOpQrStUvWxYz" }),
      responses: { 200: ok("The key.", ref("PublicApiKey")), ...v2Errors(400, 401, 403, 404, 409) } }),
  },
  [`${P}/import/status`]: {
    get: op({ id: "getImportStatus", tag: "Migration import", summary: "What still needs attention after an import", security: SECRET, source: R.import, extension: true, scopes: ["customer_information:customers:read"], parameters: [project],
      responses: { 200: ok("Counts.", ref("ImportStatus"), { object: "import_status", customers: 13, subscriptions: 10, needs_token_refresh: 0, needs_token_refresh_by_app: {} }), ...E(404) } }),
  },
};

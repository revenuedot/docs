// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: shared schemas, parameters, responses and security schemes of the OpenAPI document.
// Docs: https://revenuedot.app/docs/api   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { arr, bool, en, int, listOf, ms, nint, nms, nstr, num, obj, ok, ref, str } from "./common.mjs";

const rcDate = (d) => ({ type: ["string", "null"], format: "date-time", description: `${d} ISO 8601 in UTC, whole seconds (for example 2026-10-30T20:41:54Z), or null.` });
const rcDateReq = (d) => ({ type: "string", format: "date-time", description: `${d} ISO 8601 in UTC, whole seconds.` });

/** What each REST API v2 error type means and what to do (apps/server/src/routes/v2/common.ts). */
export const V2_ERROR_MEANINGS = {
  parameter_error: "A field or query parameter is missing or invalid. `param` names it. Fix the request; do not retry it unchanged.",
  resource_already_exists: "An object with this id or lookup key already exists (409). Fetch it instead of creating it.",
  resource_missing: "The object does not exist in this project (404). Another project's ids also answer 404, so ids cannot be probed.",
  idempotency_error: "Reserved for RevenueCat compatibility. RevenueDot does not send it today.",
  rate_limit_error: "Too many requests of one kind: project invites (50 per project per day). The error is `retryable`; try again later. The dashboard's password reset and email verification endpoints answer 429 with the same `type`.",
  authentication_error: "No API key, an unknown key, or no dashboard session (401).",
  authorization_error: "The key lacks a permission, a public app key was used, or the action needs a dashboard admin (403).",
  store_error: "The App Store or Google Play refused the action, or could not be reached (`retryable: true`). Always 422.",
  server_error: "RevenueDot failed (500, `retryable: true`). Retry with backoff.",
<<<<<<< HEAD
  resource_locked_error: "The object is busy, or changed while the request ran (409): a delivery being sent right now (`retryable: true`, try again in a minute), a running export, or an experiment whose status another request changed (reload it first).",
=======
  resource_locked_error: "The same work is already running (409, `retryable: true`): a commit of the same product file or of another file of the same app, a run of the same data export, or a webhook delivery being sent. Wait for it to finish, then try again.",
>>>>>>> origin/main
  unprocessable_entity_error: "The request is valid but not possible in this state or for this store (422), for example archiving the current offering or refunding an App Store purchase.",
  invalid_request: "The body is not valid JSON (400); a package would get two products of one app with overlapping eligibility (409); or a product file is not in a state that allows the action, such as committing a file with errors (409).",
  entity_references_archived_entities: "The action would make an archived object current (422). Unarchive it first.",
};

export const V2_ERROR_TYPES = [
  "parameter_error", "resource_already_exists", "resource_missing", "idempotency_error", "rate_limit_error", "authentication_error",
  "authorization_error", "store_error", "server_error", "resource_locked_error", "unprocessable_entity_error", "invalid_request",
  "entity_references_archived_entities",
];

/** SDK and REST v1 error codes (apps/server/src/errors.ts) with the HTTP status each is sent with. */
export const V1_ERROR_CODES = [
  { code: 7000, name: "BAD_REQUEST / INVALID_PLATFORM", status: "400", meaning: "The request is malformed, a secret-key receipt post has no X-Platform app, the store action does not exist for this store, a hosted checkout was asked for a package with no web product, or purchases-js asked for its own Web Billing checkout (`rcb_` keys), which RevenueDot does not have." },
  { code: 7101, name: "STORE_PROBLEM", status: "400 or 503", meaning: "The store refused the request (400), or the store or its credentials could not be used right now (503, retry later)." },
  { code: 7102, name: "RECEIPT_ALREADY_IN_USE", status: "400", meaning: "The purchase belongs to another customer and the project's transfer behaviour is keep or transfer_if_no_active." },
  { code: 7103, name: "INVALID_RECEIPT", status: "400", meaning: "The receipt, signed transaction or purchase token is not valid, or it belongs to another bundle id or package name." },
  { code: 7110, name: "INTERNAL", status: "500", meaning: "An unexpected server error. The SDK keeps the transaction and retries." },
  { code: 7220, name: "INVALID_APP_USER_ID", status: "400", meaning: "The app user id is empty or longer than 100 characters." },
  { code: 7224, name: "INVALID_AUTH_TOKEN", status: "401", meaning: "A Google Pub/Sub push token is missing or invalid (store notifications only)." },
  { code: 7225, name: "INVALID_API_KEY", status: "401 or 403", meaning: "The API key is unknown (401), or a REST v1 endpoint was called with a public key (403)." },
  { code: 7226, name: "BAD_REQUEST_PARAMS", status: "400", meaning: "A store action got parameters it cannot use, or a required field (such as `aad_attribution_token` or `generate_offers`) is missing." },
  { code: 7234, name: "INVALID_APPLE_SUBSCRIPTION_KEY", status: "400 or 500", meaning: "A StoreKit 1 receipt arrived for an App Store app without an in-app purchase key, or the key is incomplete (500, so the SDK retries once you add the key). A promotional offer cannot be signed without the key (400; the SDK reports `invalidAppleSubscriptionKeyError` for that offer)." },
  { code: 7259, name: "NOT_FOUND", status: "404", meaning: "The customer, entitlement, offering or subscription does not exist." },
  { code: 7263, name: "INVALID_SUBSCRIBER_ATTRIBUTES", status: "400", meaning: "Some attributes were not saved; `attribute_errors` lists them." },
  { code: 7662, name: "UNSUPPORTED_RECEIPT", status: "400", meaning: "Receipts for this app's store are not supported yet (Web Billing, Paddle, Roku), and the Android SDK's Amazon receipt lookup with a key that is not an Amazon app's." },
  { code: 7849, name: "INVALID_WEB_REDEMPTION_TOKEN", status: "400", meaning: "A web purchase redemption token is unknown, malformed or from another project. The SDKs return the `invalidToken` result." },
  { code: 7852, name: "PURCHASE_BELONGS_TO_OTHER_USER", status: "400", meaning: "Another customer already redeemed this web purchase. The SDKs return `purchaseBelongsToOtherUser`." },
  { code: 7853, name: "EXPIRED_WEB_REDEMPTION_TOKEN", status: "400", meaning: "The redemption link expired. `purchase_redemption_error_info.obfuscated_email` names where a new link was emailed. The SDKs return `expired`." },
  { code: 7877, name: "INVALID_OPERATION_SESSION", status: "400", meaning: "A Web Billing checkout session does not exist." },
];

const price = obj({ amount: num("Price in the purchase currency."), currency: str("ISO 4217 currency code.") }, ["amount", "currency"]);
const monetary = obj({
  currency: str("ISO 4217 currency code."), gross: num("Gross amount."), commission: num("Estimated store commission."),
  tax: num("Tax. Always 0 today."), proceeds: num("Gross minus commission."),
}, ["currency", "gross", "commission", "tax", "proceeds"]);

const embeddedList = (item) => listOf(item);

export const schemas = {
  // ---- SDK and REST v1 --------------------------------------------------------------------------------------------
  V1Error: obj({ code: int("RevenueCat-compatible backend error code. See the error table."), message: str("What went wrong."), attribute_errors: arr(obj({ key_name: str(), message: str() }), { description: "Only for 7263." }) }, ["code", "message"], { "x-error-codes": V1_ERROR_CODES }),
  Price: price,
  EntitlementInfo: obj({
    expires_date: rcDate("When access ends. Null for lifetime access."),
    grace_period_expires_date: rcDate("End of the billing grace period, when the store grants one."),
    product_identifier: str("Store product id that gives this access."),
    product_plan_identifier: str("Google Play base plan id, only when there is one."),
    purchase_date: rcDateReq("Start of the current period."),
  }, ["expires_date", "grace_period_expires_date", "product_identifier", "purchase_date"]),
  SubscriptionInfo: obj({
    auto_resume_date: rcDate("When a paused Google Play subscription resumes."),
    billing_issues_detected_at: rcDate("When the latest renewal failed."),
    display_name: nstr("Product display name."),
    expires_date: rcDate("End of the current period."),
    grace_period_expires_date: rcDate("End of the billing grace period."),
    is_sandbox: bool("True for sandbox and Test Store purchases."),
    management_url: nstr("Always null today."),
    original_purchase_date: rcDate("Start of the subscription."),
    ownership_type: en(["PURCHASED", "FAMILY_SHARED"]),
    period_type: en(["normal", "trial", "intro", "promotional", "prepaid"]),
    purchase_date: rcDate("Start of the current period."),
    refunded_at: rcDate("When the store refunded it."),
    store: en(["app_store", "mac_app_store", "play_store", "amazon", "stripe", "rc_billing", "promotional", "test_store", "paddle", "roku", "external"]),
    store_transaction_id: nstr("Latest store transaction id (Apple), order id (Google) or Test Store token."),
    unsubscribe_detected_at: rcDate("When auto-renew was turned off."),
    product_plan_identifier: str("Google Play base plan id, only when there is one."),
    price: price,
  }, ["expires_date", "is_sandbox", "period_type", "purchase_date", "store"]),
  NonSubscriptionInfo: obj({
    display_name: nstr(), id: str("RevenueDot purchase id."), is_sandbox: bool(), original_purchase_date: rcDate("Purchase time."),
    purchase_date: rcDate("Purchase time."), store: str(), store_transaction_id: str("Store transaction id."), price,
  }, ["id", "is_sandbox", "purchase_date", "store", "store_transaction_id"]),
  CustomerInfo: obj({
    request_date: rcDateReq("Server time of the response."),
    request_date_ms: ms("Server time of the response."),
    subscriber: obj({
      entitlements: { type: "object", additionalProperties: ref("EntitlementInfo"), description: "Entitlements the customer has now or had, keyed by lookup key. Check `expires_date` (or use the SDK's `isActive`)." },
      first_seen: rcDateReq("When the customer was first seen."),
      last_seen: rcDateReq("When the customer was last seen."),
      management_url: nstr("Always null today."),
      non_subscriptions: { type: "object", additionalProperties: arr(ref("NonSubscriptionInfo")), description: "One-time purchases by product id, oldest first." },
      original_app_user_id: str("The customer's first app user id."),
      original_application_version: nstr("Always null today."),
      original_purchase_date: rcDate("Earliest purchase."),
      other_purchases: { type: "object", description: "Always empty." },
      subscriber_attributes: { type: "object", additionalProperties: obj({ value: nstr(), updated_at_ms: int() }), description: "Only in answers to secret-key requests." },
      subscriptions: { type: "object", additionalProperties: ref("SubscriptionInfo"), description: "Latest subscription per product id." },
    }, ["entitlements", "first_seen", "last_seen", "non_subscriptions", "original_app_user_id", "subscriptions"]),
  }, ["request_date", "request_date_ms", "subscriber"]),
  ReceiptResponse: {
    allOf: [ref("CustomerInfo"), obj({
      purchased_products: { type: "object", additionalProperties: obj({ should_consume: bool("True for consumables: the Android SDK consumes the purchase.") }), description: "One entry per purchase the receipt contained." },
    })],
  },
  Offerings: obj({
    current_offering_id: nstr("Lookup key of the customer's current offering: their override, else their experiment variant's offering, else the first live targeting rule's, else the project's current offering."),
    offerings: arr(obj({
      description: str("Offering display name."),
      identifier: str("Offering lookup key."),
      metadata: { type: ["object", "null"], description: "Your JSON metadata." },
      packages: arr(obj({
        identifier: str("Package lookup key, for example $rc_monthly."),
        platform_product_identifier: str("Store product id for the calling app."),
        platform_product_plan_identifier: str("Google Play base plan id, when the product is `subscription:base-plan`."),
      }, ["identifier", "platform_product_identifier"])),
    }, ["description", "identifier", "metadata", "packages"])),
    placements: obj({
      fallback_offering_id: nstr("Lookup key of the offering for placements not listed below: the current offering."),
      offering_ids_by_placement: { type: "object", additionalProperties: { type: ["string", "null"] }, description: "Placement id → offering lookup key, or null for no paywall there: the matching targeting rule's placements, overlaid with the customer's experiment variant's." },
    }, [], { description: "What `currentOffering(forPlacement:)` reads." }),
    targeting: obj({ revision: int("The rule's revision."), rule_id: str("The targeting rule that matched.") }, ["revision", "rule_id"], { description: "Present when a targeting rule matched the customer." }),
  }, ["current_offering_id", "offerings"]),

  // ---- REST API v2 ------------------------------------------------------------------------------------------------
  V2Error: obj({
    object: { type: "string", const: "error" },
    type: { ...en(V2_ERROR_TYPES), "x-enum-descriptions": V2_ERROR_MEANINGS },
    message: str("What went wrong."),
    param: str("The request field at fault, when there is one."),
    doc_url: str("Link to the error's section of the errors page."),
    retryable: bool("True when retrying the same request can succeed."),
  }, ["object", "type", "message", "doc_url", "retryable"]),
  Deleted: obj({ object: str("The deleted object's type."), id: str(), deleted_at: ms("When it was deleted.") }, ["object", "id", "deleted_at"]),
  MonetaryAmount: monetary,
  Project: obj({
    object: { type: "string", const: "project" }, id: str("Project id (proj...)."), name: str(), created_at: ms("Creation time."),
    icon_url: nstr("Always null."), icon_url_large: nstr("Always null."),
  }, ["object", "id", "name", "created_at"]),
  ProjectSettings: {
    allOf: [ref("Project"), obj({
      transfer_behavior: en(["transfer", "transfer_if_no_active", "keep", "share"], "What happens when a purchase already owned by another customer is restored. Default transfer."),
      sandbox_transfer_behavior: { type: ["string", "null"], enum: ["transfer", "transfer_if_no_active", "keep", "share", null], description: "Override for sandbox purchases; null uses transfer_behavior." },
      sandbox_testing_access: en(["anybody", "allowlist", "nobody"], "Who unlocks entitlements and in-app currency with sandbox purchases (Test Store purchases included). `allowlist`: only customers with an app user id in `sandbox_testers`. Others' sandbox purchases are recorded and sent to webhooks but unlock nothing. Default anybody."),
      sandbox_testers: arr(str(), { description: "App user ids allowed to test when `sandbox_testing_access` is `allowlist`. Up to 500." }),
      owner: { type: ["object", "null"], properties: { id: str("User id."), email: str(), name: nstr() }, description: "The project's owner, the only one who can transfer ownership. Null when no owner is recorded." },
    }, ["transfer_behavior", "sandbox_transfer_behavior"])],
  },
  App: obj({
    object: { type: "string", const: "app" }, id: str("App id (app...)."), name: str(), created_at: ms("Creation time."),
    type: en(["amazon", "app_store", "mac_app_store", "play_store", "stripe", "rc_billing", "roku", "paddle", "test_store"]),
    project_id: str(), custom_url_scheme: str("Derived from the public key."),
    app_store: obj({ bundle_id: str(), app_store_connect_api_key_configured: bool(), subscription_key_configured: bool("True when the in-app purchase key (.p8, key id, issuer id) is set."), app_store_connect_vendor_number: nstr() }),
    mac_app_store: obj({ bundle_id: str() }),
    play_store: obj({ package_name: str(), play_service_account_credentials_configured: bool() }),
    amazon: obj({ package_name: str() }),
    stripe: obj({ stripe_account_id: nstr() }),
    rc_billing: obj({ stripe_account_id: nstr(), seller_company_name: str(), app_name: str(), support_email: nstr(), default_currency: str() }),
    roku: obj({ roku_channel_id: nstr(), roku_channel_name: nstr() }),
    paddle: obj({ paddle_is_sandbox: bool(), paddle_api_key: { type: "null" } }),
  }, ["object", "id", "name", "created_at", "type", "project_id"], { description: "Only the object for the app's own `type` is present. Store secrets are never returned." }),
  PublicApiKey: obj({
    object: { type: "string", const: "public_api_key" }, id: str(), key: str("The key the SDK sends (appl_, goog_, test_ ...)."),
    environment: en(["production", "sandbox"]), app_id: str(), created_at: ms("Creation time."),
  }, ["object", "id", "key", "environment", "app_id", "created_at"]),
  Product: obj({
    object: { type: "string", const: "product" }, id: str("Product id (prod...)."),
    store_identifier: str("The store's product id. Google Play subscriptions use `subscriptionId:basePlanId`."),
    type: en(["subscription", "one_time", "consumable", "non_consumable", "non_renewing_subscription"]),
    state: en(["active", "inactive"]),
    subscription: obj({ duration: nstr("ISO 8601 period such as P1M."), grace_period_duration: { type: "null" }, trial_duration: { type: "null" } }),
    one_time: obj({ is_consumable: { type: ["boolean", "null"] } }),
    created_at: ms("Creation time."), app_id: str(), display_name: nstr(),
    app: ref("App"),
    indicative_price: { oneOf: [ref("IndicativePrice"), { type: "null" }], description: "With `expand=indicative_price`: the Test Store price; else the App Store or Google Play price in the United States from the last store price read (or the in-app purchase's base territory, or the first territory with a price); else the Stripe web product's price. Null when none is known." },
    store_details: { oneOf: [ref("StoreDetails"), { type: "null" }], description: "RevenueDot extension, with `expand=store_details`: the store's status and price from the last store price read. Null when the product was never read from App Store Connect or Google Play (other stores, or no read yet)." },
  }, ["object", "id", "store_identifier", "type", "state", "created_at", "app_id", "display_name"]),
  StoreDetails: obj({
    object: { type: "string", const: "store_details" },
    status: nstr("The store's state in lower case: `approved`, `ready_to_submit`, `waiting_for_review`, `in_review`, `rejected`, `developer_action_needed`, `missing_metadata`, `removed_from_sale` (App Store), `active`, `draft`, `inactive` (Google Play)."),
    store_state: nstr("The state as the store spells it, such as `APPROVED` or `ACTIVE`."),
    price: { oneOf: [obj({ amount_micros: int("Price in micros: 9.99 is 9990000.", { format: "int64" }), currency: str("ISO 4217 code."), territory: nstr("App Store territory (`USA`) or Google Play region (`US`).") }, ["amount_micros", "currency", "territory"]), { type: "null" }], description: "The United States price when the product has one, else the in-app purchase's base territory or the first territory with a price. Null when the store has no price for it." },
    territories: int("How many territories have a price."),
    duration: nstr("The store's period for a subscription (`P1M` ...)."),
    display_name: nstr("The name in the store."),
    editable: bool("Whether the product editor can change its prices."),
    refreshed_at: ms("When the prices were read from the store."),
    refresh_status: { type: ["string", "null"], enum: ["ok", "failing", null], description: "The app's last read: `failing` means it failed and these values are from the read before." },
  }, ["object", "status", "store_state", "price", "territories", "duration", "display_name", "editable", "refreshed_at", "refresh_status"]),
  StoreProductImport: obj({
    object: { type: "string", const: "store_product_import" }, app_id: str(),
    created: arr(ref("Product"), { description: "Products created by this import." }),
    existing: arr(ref("Product"), { description: "Requested products the catalog already had; left unchanged." }),
    failed: arr(obj({ store_identifier: str(), reason: { type: "string", enum: ["not_in_store", "not_importable"] }, message: str() }, ["store_identifier", "reason", "message"]), { description: "Requested identifiers the store does not have, or that cannot be imported." }),
    entitlement_ids: arr(str(), { description: "The entitlements every created and existing product is attached to." }),
  }, ["object", "app_id", "created", "existing", "failed", "entitlement_ids"]),
  IndicativePrice: obj({
    object: { type: "string", const: "indicative_price" }, currency: str("ISO 4217 code."), country: nstr("`US` for a United States store price, the region code for another Google Play region, else null (Test Store and Stripe prices, other App Store territories)."), amount_micros: int("Price in micros: 9.99 is 9990000."),
  }, ["object", "currency", "country", "amount_micros"]),
  WebhookState: obj({ object: { type: "string", const: "webhook_state" }, id: str("Webhook id (wh_...)."), enabled: bool("False while deliveries are paused.") }, ["object", "id", "enabled"]),
  Entitlement: obj({
    object: { type: "string", const: "entitlement" }, id: str("Entitlement id (entl...)."), project_id: str(),
    lookup_key: str("What apps check, for example `pro`."), display_name: str(), created_at: ms("Creation time."), state: en(["active", "inactive"]),
    products: embeddedList(ref("Product")),
  }, ["object", "id", "project_id", "lookup_key", "display_name", "created_at", "state"]),
  PackageProduct: obj({ product: ref("Product"), eligibility_criteria: en(["all", "google_sdk_lt_6", "google_sdk_ge_6"]) }, ["product", "eligibility_criteria"]),
  Package: obj({
    object: { type: "string", const: "package" }, id: str("Package id (pkge...)."), lookup_key: str("For example $rc_monthly."), display_name: str(),
    position: int("Order in the offering, lowest first."), created_at: ms("Creation time."), products: embeddedList(ref("PackageProduct")),
  }, ["object", "id", "lookup_key", "display_name", "position", "created_at"]),
  Offering: obj({
    object: { type: "string", const: "offering" }, id: str("Offering id (ofrng...)."), lookup_key: str(), display_name: str(),
    is_current: bool("Exactly one offering per project is current."), created_at: ms("Creation time."), project_id: str(), state: en(["active", "inactive"]),
    paywall_id: nstr("The paywall attached to this offering, or null."), metadata: { type: ["object", "null"] }, packages: embeddedList(ref("Package")),
  }, ["object", "id", "lookup_key", "display_name", "is_current", "created_at", "project_id", "state", "metadata"]),
  ActiveEntitlement: obj({ object: { type: "string", const: "customer.active_entitlement" }, entitlement_id: str("Entitlement id (entl...), not the lookup key."), expires_at: nms("When access ends.") }, ["object", "entitlement_id", "expires_at"]),
  CustomerAttribute: obj({ object: { type: "string", const: "customer.attribute" }, name: str(), value: str(), updated_at: ms("Last update.") }, ["object", "name", "value", "updated_at"]),
  Customer: obj({
    object: { type: "string", const: "customer" }, id: str("The customer's original app user id."), project_id: str(),
    first_seen_at: ms("First seen."), last_seen_at: nms("Last seen."), last_seen_app_version: nstr(), last_seen_country: nstr(),
    last_seen_platform: nstr(), last_seen_platform_version: { type: "null" },
    active_entitlements: embeddedList(ref("ActiveEntitlement")), experiment: { oneOf: [ref("ExperimentEnrollment"), { type: "null" }], description: "The experiment the customer is in (running or paused), else the last one they joined, or null." }, attributes: embeddedList(ref("CustomerAttribute")),
  }, ["object", "id", "project_id", "first_seen_at", "last_seen_at"], { description: "`active_entitlements` and `experiment` are present on single-customer answers; `attributes` only with `expand=attributes`." }),
  ExperimentEnrollment: obj({
    object: { type: "string", const: "experiment_enrollment" }, id: str("Experiment id (prexp...)."), name: str("The experiment's name."), variant: en(["a", "b", "c", "d"], "The customer's variant: `a` is the control."),
  }, ["object", "id", "name", "variant"]),
  CustomerAlias: obj({ object: { type: "string", const: "customer.alias" }, id: str("An app user id of the customer."), created_at: ms("When it was linked.") }, ["object", "id", "created_at"]),
  CustomerEvent: obj({
    object: { type: "string", const: "customer.event" }, id: str(), app_id: nstr(), type: str("Webhook event type, for example INITIAL_PURCHASE."),
    body: { type: "object", description: "The webhook `event` object." }, created_at: ms("Recorded."), occurred_at: ms("When it happened."),
  }, ["object", "id", "type", "body", "created_at", "occurred_at"]),
  Subscription: obj({
    object: { type: "string", const: "subscription" }, id: str("Subscription id (sub_...)."), customer_id: str(), original_customer_id: str(),
    product_id: nstr("Product id (prod...), null for promotional grants."), starts_at: ms("Start of the subscription."),
    current_period_starts_at: ms("Start of the current period."), current_period_ends_at: nms("End of the current period."), ends_at: nms("End of access."),
    gives_access: bool(), pending_payment: bool(), auto_renewal_status: en(["will_renew", "will_not_renew", "will_change_product", "will_pause"]),
    status: en(["trialing", "active", "in_grace_period", "in_billing_retry", "paused", "expired"]),
    total_revenue_in_usd: ref("MonetaryAmount"), presented_offering_id: nstr("Offering the purchase was made from (its id, or the identifier the SDK sent when no such offering exists)."),
    entitlements: embeddedList(ref("Entitlement")), environment: en(["production", "sandbox"]),
    store: str(), store_subscription_identifier: str("Latest store transaction id, order id or token."), ownership: en(["purchased", "family_shared"]),
    country: str("ISO 3166-1 alpha-2, when known."), management_url: { type: "null" },
  }, ["object", "id", "customer_id", "starts_at", "gives_access", "status", "auto_renewal_status", "environment", "store"]),
  Purchase: obj({
    object: { type: "string", const: "purchase" }, id: str(), customer_id: str(), original_customer_id: str(), product_id: str(),
    purchased_at: ms("Purchase time."), revenue_in_usd: ref("MonetaryAmount"), quantity: int(), status: en(["owned", "refunded"]),
    presented_offering_id: nstr("Offering the purchase was made from (its id, or the identifier the SDK sent when no such offering exists)."), entitlements: embeddedList(ref("Entitlement")), environment: en(["production", "sandbox"]),
    store: str(), store_purchase_identifier: str(), ownership: en(["purchased"]), country: str(),
  }, ["object", "id", "customer_id", "product_id", "purchased_at", "status", "environment", "store"]),
  SubscriptionTransaction: obj({
    object: { type: "string", const: "subscription_transaction" }, id: str(), purchased_at: ms("Purchase time."), product_store_identifier: str(),
    revenue_in_local_currency: { oneOf: [ref("MonetaryAmount"), { type: "null" }] }, revenue_in_usd: ref("MonetaryAmount"),
    expiration_date: nms("End of the period."), effective_expiration_date: nms("When access actually ended (the refund time for a refunded period)."),
  }, ["object", "id", "purchased_at"]),
  WebhookIntegration: obj({
    object: { type: "string", const: "webhook_integration" }, id: str("Webhook id (wh_...)."), project_id: str(), name: str(), url: str(),
    environment: { type: ["string", "null"], enum: ["production", "sandbox", null], description: "Null sends both." },
    event_types: arr(str(), { description: "Lower-case event types. Empty sends every type." }), app_id: nstr("Only events of this app, or null for all."),
    created_at: ms("Creation time."), signing_secret: str("whsec_... Only in the answer that creates the webhook."),
  }, ["object", "id", "project_id", "name", "url", "environment", "event_types", "app_id", "created_at"]),
  Collaborator: obj({
    object: { type: "string", const: "collaborator" }, id: str(), name: nstr(), email: str(),
    role: en(["admin", "developer", "read_only"], "RevenueCat's role names. `read_only` is the dashboard's Viewer role."),
    accepted_at: ms("When the user joined."), has_mfa: bool("Always false."),
  }, ["object", "id", "email", "role"]),
  Invite: obj({
    object: { type: "string", const: "invite" }, id: str("inv_..."), email: str("The invited address, lowercased."),
    role: en(["admin", "developer", "viewer"], "The role the person gets when they accept."),
    status: en(["pending", "expired", "accepted", "revoked"], "Lists only show `pending` and `expired`. An expired invite can be resent."),
    invited_by: nstr("User id of the admin who last sent it."),
    created_at: ms("When it was created."), last_sent_at: ms("When the last email went out."), expires_at: ms("When the link stops working: 7 days after it was last sent."),
  }, ["object", "id", "email", "role", "status", "expires_at"]),
  OverviewMetrics: obj({
    object: { type: "string", const: "overview_metrics" }, currency: { type: "string", const: "USD" },
    metrics: arr(obj({
      object: { type: "string", const: "overview_metric" }, id: en(["active_trials", "active_subscriptions", "mrr", "revenue", "new_customers", "active_users"]),
      name: str(), description: str(), unit: en(["#", "$"]), period: en(["P0D", "P28D"]), value: num(), last_updated_at: ms("Computed at."), last_updated_at_iso8601: str(),
    })),
  }, ["object", "currency", "metrics"]),

  // ---- RevenueDot extensions --------------------------------------------------------------------------------------
  WebhookDelivery: obj({
    object: { type: "string", const: "webhook_delivery" }, id: str(), webhook_integration_id: str(), event_id: str(), event_type: str(),
    status: en(["pending", "delivered", "failed"]), attempts: int(), next_attempt_at: nms("Next retry, when pending."),
    response_status: nint("HTTP status of the last attempt."), response_ms: nint("Duration of the last attempt."), last_error: nstr(), created_at: ms("Queued at."),
  }, ["object", "id", "webhook_integration_id", "event_id", "event_type", "status", "attempts"]),
  Event: obj({
    object: { type: "string", const: "event" }, id: str(), type: str(), environment: en(["production", "sandbox"]), app_id: nstr(),
    customer_id: nstr("Original app user id."), app_user_id: nstr(), occurred_at: ms("When it happened."), created_at: ms("Recorded."),
    body: { type: "object", description: "The webhook `event` object, exactly as webhooks receive it." },
  }, ["object", "id", "type", "environment", "occurred_at", "body"]),
  Transaction: obj({
    object: { type: "string", const: "transaction" }, id: str(), customer_id: str(), app_id: nstr(), store: str(), store_transaction_id: nstr(),
    product_identifier: str(), kind: en(["purchase", "renewal", "trial", "one_time", "refund", "refund_reversal"]), environment: en(["production", "sandbox"]),
    purchased_at: ms("When the money moved."), expires_at: nms("End of the period."), revenue_in_usd: num("USD; negative for refunds."),
    price: { oneOf: [ref("Price"), { type: "null" }] }, country: nstr(),
    project_id: str("The transaction's project. Only on GET /v2/overview/transactions."),
  }, ["object", "id", "customer_id", "store", "product_identifier", "kind", "environment", "purchased_at", "revenue_in_usd"]),
  ApiKey: obj({
    object: { type: "string", const: "api_key" }, id: str(), name: str(), prefix: str("First 7 characters of the key."),
    permissions: arr(str(), { description: "Scopes; `*` is every scope." }), created_at: ms("Creation time."), last_used_at: nms("Last use, updated at most once a minute."),
    key: str("The secret key (sk_...). Only in the answer that creates it."),
  }, ["object", "id", "name", "prefix", "permissions", "created_at", "last_used_at"]),
  SetupHealth: obj({
    object: { type: "string", const: "setup_health" }, project_id: str(), checked_at: ms("Computed at."),
    apps: arr(obj({
      id: str(), name: str(), type: str(), notification_url: nstr("Where the store must send notifications."),
      last_notification_at: nms("Last notification processed for a known purchase (or the store's test)."),
      last_notification_received_at: nms("Last notification received at all."),
      last_notification_error: { type: ["object", "null"], properties: { at: int(), type: nstr(), message: str() } },
      notification_status: en(["ready", "failing", "received", "waiting"]), credentials_configured: bool(),
    })),
    webhooks: obj({
      total: int(), attempted_24h: int(), delivered_24h: int(), failed_24h: int(), pending: int(), delivered_percent_24h: { type: ["number", "null"] },
      failing: arr(obj({ id: str(), name: str(), url: str(), last_status: nint(), last_error: nstr(), last_attempt_at: int(), delivery_status: str() })),
    }),
    sdk_versions: arr({ type: "object", description: "SDK builds that called the SDK endpoints (from X-Platform, X-Version and related headers), newest first." }),
  }, ["object", "project_id", "checked_at", "apps", "webhooks", "sdk_versions"]),
  StoreSettings: obj({
    object: { type: "string", const: "app_store_settings" }, app_id: str(), type: str(),
    api_origin: str("This server as the outside world reaches it: the SDK's proxy URL."),
    notification_url: nstr("The store notification URL for this app (App Store, Google Play, Amazon or Stripe)."), notification_forward_url: nstr("Where notifications are copied during a dual run."),
    last_notification_at: nms("Last notification processed for a known purchase."), last_notification_error: nstr(), last_notification_received_at: nms("Last notification received."),
    notification_status: en(["ready", "failing", "received", "waiting"]),
    last_forward: { type: ["object", "null"], properties: { status: int("HTTP status of the forward; 0 means no answer."), at: int() } },
    track_new_purchases: bool("Apply notifications about purchases this server has never seen."),
    allow_unsigned_receipts: bool("Accept StoreKit 1 receipts without the in-app purchase key. Development only."),
    credentials: obj({
      subscription_key: obj({ configured: bool(), key_id: nstr(), issuer_id: nstr() }),
      app_store_connect_api_key: obj({ configured: bool(), key_id: nstr(), issuer_id: nstr(), vendor_number: nstr() }),
      shared_secret: obj({ configured: bool() }), play_service_account: obj({ configured: bool(), client_email: nstr() }), xcode_certificate: obj({ configured: bool() }),
      amazon_shared_secret: obj({ configured: bool() }),
      stripe_secret_key: obj({ configured: bool(), mode: { type: ["string", "null"], enum: ["live", "test", null] }, kind: { type: ["string", "null"], enum: ["restricted", "secret", "other", null] }, last4: nstr("Last four characters of the key; the key itself is never returned.") }),
      stripe_webhook_secret: obj({ configured: bool() }),
    }),
    sns_topic_arn: nstr("Amazon: the only SNS topic notifications are accepted from, when set."),
    stripe: { type: ["object", "null"], description: "Stripe apps only.", properties: {
      stripe_account_id: nstr(), app_user_id_source: en(["metadata", "customer_id", "anonymous"]), app_user_id_metadata_key: str(), register_on: en(["invoice_paid", "invoice_created"]), configured: bool(),
    } },
  }, ["object", "app_id", "type", "api_origin", "notification_status", "credentials"]),
  CredentialsCheck: obj({
    object: { type: "string", const: "credentials_check" }, app_id: str(), store: str(), status: en(["valid", "invalid", "unreachable"]), valid: bool(),
    message: str("What to do next, in plain words."), checked_at: ms("Checked at."), key_id: str(), client_email: nstr(), mode: en(["live", "test"], "Stripe: the key's mode."),
  }, ["object", "app_id", "store", "status", "valid", "message", "checked_at"]),
  MassExtension: obj({
    object: { type: "string", const: "subscription_mass_extension" }, id: str("Request id."), app_id: str(), product_id: str(), environment: en(["production", "sandbox"]),
    extend_by_days: int(), extend_reason_code: str(), storefront_country_codes: { type: ["array", "null"], items: str() },
    complete: bool(), completed_at: nint(), succeeded_count: nint(), failed_count: nint(), requested_at: int(),
  }, ["object", "id", "app_id", "product_id", "environment", "complete"]),
  TestPurchase: obj({
    object: { type: "string", const: "test_purchase" }, scenario: str(), store_transaction_id: str("The Test Store token (test_<ms>_<uuid>)."),
    event_types: arr(str(), { description: "Events recorded, in order." }), customer: ref("Customer"),
    subscription: { oneOf: [ref("Subscription"), { type: "null" }] }, purchase: { oneOf: [ref("Purchase"), { type: "null" }] },
  }, ["object", "scenario", "store_transaction_id", "event_types", "customer"]),
  MetricHistory: obj({
    object: { type: "string", const: "metric_history" }, id: str(), currency: { type: "string", const: "USD" }, days: int(), environment: en(["production", "sandbox"]),
    resolution: { type: "string", const: "day" }, value: num(), previous_value: { type: ["number", "null"] },
    values: arr(obj({ date: str("YYYY-MM-DD"), value: num() })), last_updated_at: ms("Computed at."),
  }, ["object", "id", "days", "environment", "values"]),
  CustomerSummary: obj({
    object: { type: "string", const: "customer_summary" }, id: str("The id you asked for."), original_app_user_id: str(), aliases: arr(str()),
    total_revenue_in_usd: num(), sandbox_revenue_in_usd: num(), country: nstr(), platform: nstr(), stores: arr(str()),
    offering_override: { ...obj({ id: str(), lookup_key: str(), display_name: str() }), type: ["object", "null"], description: "The offering set for this customer only; it wins over targeting and experiments." },
    current_offering: {
      ...obj({
        id: str(), lookup_key: str(), display_name: str(),
        source: { ...en(["override", "experiment", "targeting", "default"]), description: "Why the customer gets it: their override, an experiment (one they are in, or a running one their next request would enroll them in), the first live targeting rule that matches, or the project's current offering." },
        rule_id: str("With `targeting`."), rule_name: nstr("With `targeting`."),
        experiment_id: str("With `experiment`."), experiment_name: nstr("With `experiment`."), variant: { ...en(["a", "b", "c", "d"]), description: "With `experiment`: the variant, `a` being the control." }, variant_name: str("With `experiment`: the variant's name, such as Control or Treatment B."),
      }, ["id", "lookup_key", "source"]),
      type: ["object", "null"],
      description: "The current offering the SDK returns for this customer now, resolved with the device details of their last SDK request (platform, app and SDK version, SDK flavor, OS version, storefront). Locale conditions never match here because the locale is not stored. Reading it enrolls nobody in an experiment; it shows the variant their next request would get.",
    },
    blocked: bool("One of the customer's app user ids is blocked: no entitlements anywhere."),
    active_entitlements: arr({ type: "object" }), granted_entitlements: arr({ type: "object" }), subscriptions: arr({ type: "object" }), purchases: arr({ type: "object" }),
  }, ["object", "id", "original_app_user_id"]),
  ImportResult: obj({
    object: { type: "string", const: "import_result" }, emit_events: bool(),
    customers: arr(obj({ id: str(), status: en(["created", "updated", "merged"]), subscriptions: int(), purchases: int(), needs_token_refresh: int(), notes: arr(str()) })),
  }, ["object", "emit_events", "customers"]),
  ImportStatus: obj({
    object: { type: "string", const: "import_status" }, customers: int(), subscriptions: int(),
    needs_token_refresh: int("Google Play subscriptions still waiting for their purchase token."),
    needs_token_refresh_by_app: { type: "object", additionalProperties: { type: "integer" } },
  }, ["object", "customers", "subscriptions", "needs_token_refresh", "needs_token_refresh_by_app"]),
};

export const parameters = {
  ProjectId: { name: "project_id", in: "path", required: true, schema: str(), description: "Project id (proj...).", example: "proj18pzzkao" },
  AppId: { name: "app_id", in: "path", required: true, schema: str(), description: "App id (app...)." },
  AppUserId: { name: "app_user_id", in: "path", required: true, schema: str(undefined, { maxLength: 100 }), description: "App user id, URL-encoded (anonymous ids look like `$RCAnonymousID:...`).", example: "user_1" },
  CustomerId: { name: "customer_id", in: "path", required: true, schema: str(), description: "Any app user id of the customer.", example: "user_1" },
  Limit: { name: "limit", in: "query", schema: int(undefined, { minimum: 1, maximum: 100, default: 20 }), description: "Page size. Values outside 1-100 are clamped, not rejected." },
  StartingAfter: { name: "starting_after", in: "query", schema: str(), description: "Id of the last item of the previous page. Use `next_page` instead of building it." },
  Environment: { name: "environment", in: "query", schema: en(["production", "sandbox"]), description: "Only this environment. Default: both." },
  XPlatform: { name: "X-Platform", in: "header", schema: str(), description: "SDK platform (ios, android, macos, web ...). With a secret key it picks the project's app for that platform." },
  XNonce: { name: "X-Nonce", in: "header", schema: str(), description: "Base64 nonce the SDK sends when entitlement verification is on; it is part of the signed message." },
};

const v2err = (status, type, message, retryable = false) => ok(
  { 400: "The request is invalid.", 401: "No API key, or an unknown one.", 403: "The key lacks a permission, or a public key was used.", 404: "Not found in this project (another project's ids also answer 404).", 409: "It already exists, or it conflicts with another object.", 422: "The request is valid but cannot be done in this state or for this store.", 429: "Too many requests. Retry later.", 500: "Server error. Retry later.", 502: "An upstream service (the store or the language model) gave no usable answer. Retry later.", 503: "The store could not be reached, or the feature is not configured on this server." }[status],
  ref("V2Error"),
  { object: "error", type, message, ...(status === 400 ? { param: "app_id" } : {}), doc_url: `https://revenuedot.app/docs/api/errors#${type.replace(/_/g, "-")}`, retryable },
);
const v1err = (status, code, message, description) => ok(description, ref("V1Error"), { code, message });

export const responses = {
  V2Error400: v2err(400, "parameter_error", "app_id: Required"),
  V2Error401: v2err(401, "authentication_error", "Missing API key. Send Authorization: Bearer <secret key>."),
  V2Error403: v2err(403, "authorization_error", "API v2 requires a secret API key (sk_...). Public app keys only work with the SDK endpoints."),
  V2Error404: v2err(404, "resource_missing", "Customer not found."),
  V2Error409: v2err(409, "resource_already_exists", "An entitlement with lookup_key pro already exists."),
  V2Error422: v2err(422, "unprocessable_entity_error", "The current offering cannot be archived. Make another offering current first."),
  V2Error429: v2err(429, "rate_limit_error", "This project sent too many invites today. Try again tomorrow.", true),
  V2Error502: v2err(502, "server_error", "The language model did not answer. Try again.", true),
  V2Error503: v2err(503, "server_error", "The server could not complete the request. Try again.", true),
  V1Error400: v1err(400, 7103, "The receipt is not a valid Test Store purchase token.", "Bad request. For receipts, a 4xx tells the SDK the purchase can never be accepted, so it finishes the transaction."),
  V1Error401: v1err(401, 7225, "Invalid API Key.", "Unknown API key."),
  V1Error403: v1err(403, 7225, "This endpoint requires a secret API key.", "A public app key was used for a secret-key endpoint."),
  V1Error404: v1err(404, 7259, "Subscriber not found.", "Not found."),
  V1Error422: v1err(422, 7000, "Balance of GLD is 3; spending 5 would take it below zero.", "The request is valid but cannot be done in this state."),
  V1Error500: v1err(500, 7110, "Internal server error.", "Server error. The SDK keeps the purchase and retries."),
  V1Error503: v1err(503, 7101, "Google Play could not be reached.", "The store could not be reached. Retry later."),
};

export const securitySchemes = {
  publicApiKey: { type: "http", scheme: "bearer", description: "A public app key (`appl_`, `mac_`, `goog_`, `test_`, `amzn_`, `strp_`, `rcb_`, `pdl_`, `roku_`). Safe to ship in an app. The SDK sends it on every request." },
  secretApiKey: { type: "http", scheme: "bearer", description: "A project secret key (`sk_...`). Server side only. Its `permissions` limit what it can do." },
  dashboardSession: { type: "apiKey", in: "cookie", name: "rd_session", description: "The dashboard session cookie from `POST /auth/login`. It authorizes `/v2` for every project the user belongs to." },
  subscriberToken: { type: "http", scheme: "bearer", description: "A subscriber access token: `rdat_...` from `POST /v2/projects/{project_id}/apps/{app_id}/authenticate`, or the JWT `access_token` of an Auth sign-in (`POST /v1/auth/login`). It speaks for one app user id of one app for one hour. An expired or revoked token, or a path or body naming another app user id, answers 401 with code 7224." },
  scimToken: { type: "http", scheme: "bearer", description: "RevenueDot Enterprise. A SCIM token (`rdscim_` and 64 hex characters) from Organization settings → SCIM provisioning or `POST /v2/organizations/{org_id}/scim/tokens`. It speaks for one organization and works only on `/scim/v2`." },
  importToken: { type: "http", scheme: "bearer", description: "An import token (`rdi_` and 64 hex characters) from **Receive a project** on the server a project moves to (`POST /v2/imports/tokens`). It lets one project move into the account that created it and lasts 24 hours." },
  googlePubSubOidc: { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "Google-signed OIDC token of a Pub/Sub push subscription. Checked only when the app's `pubsub_audience` credential is set." },
};

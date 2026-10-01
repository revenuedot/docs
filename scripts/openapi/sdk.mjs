// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the SDK endpoints, store notification endpoints, response signing key and REST API v1 in the OpenAPI document.
// Docs: https://revenuedot.app/docs/api/sdk-endpoints   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { NONE, PUBLIC, PUBLIC_OR_SECRET, SECRET_ONLY, body, bool, en, int, json, obj, ok, op, param, ref, str, v1Errors, arr, nstr } from "./common.mjs";

const SUBSCRIBER = [{ subscriberToken: [] }];

const SDK = "routes/sdk.ts";
const V1 = "routes/rest-v1.ts";
const user = param("AppUserId");
const customerInfoExample = {
  request_date: "2026-09-30T20:41:54Z", request_date_ms: 1790800914034,
  subscriber: {
    entitlements: { pro: { expires_date: "2026-10-30T20:41:54Z", grace_period_expires_date: null, product_identifier: "pro_monthly", purchase_date: "2026-09-30T20:41:54Z" } },
    first_seen: "2026-09-30T20:41:54Z", last_seen: "2026-09-30T20:41:54Z", management_url: null, non_subscriptions: {},
    original_app_user_id: "user_1", original_application_version: null, original_purchase_date: "2026-09-30T20:41:54Z", other_purchases: {},
    subscriptions: {
      pro_monthly: {
        auto_resume_date: null, billing_issues_detected_at: null, display_name: null, expires_date: "2026-10-30T20:41:54Z", grace_period_expires_date: null,
        is_sandbox: true, management_url: null, original_purchase_date: "2026-09-30T20:41:54Z", ownership_type: "PURCHASED", period_type: "normal",
        purchase_date: "2026-09-30T20:41:54Z", refunded_at: null, store: "test_store", store_transaction_id: "test_1790800914000_quickstart",
        unsubscribe_detected_at: null, price: { amount: 9.99, currency: "USD" },
      },
    },
  },
};
const ci = (description = "Customer info.") => ok(description, ref("CustomerInfo"), customerInfoExample);
const empty = (d = "Accepted.") => ok(d, { type: "object" }, {});

export const sdkPaths = {
  "/": {
    get: op({ id: "getServerInfo", tag: "Server", summary: "Server name and docs link", security: NONE, source: "app.ts",
      description: "Answers a small JSON document. The Docker health check calls it.",
      responses: { 200: ok("Server info.", obj({ name: str(), docs: str() }), { name: "RevenueDot", docs: "https://revenuedot.app/docs" }) } }),
  },
  "/v1/health": {
    get: op({ id: "getHealth", tag: "Server", summary: "Health check", security: NONE, source: SDK,
      description: "Needs no API key. Use it for load balancer and uptime checks.",
      responses: { 200: ok("The server is up.", obj({ status: { type: "string", const: "ok" } }), { status: "ok" }) } }),
  },
  "/v1/health/connectivity": {
    get: op({ id: "getHealthConnectivity", tag: "Server", summary: "Connectivity probe", security: NONE, source: SDK,
      description: "Needs no API key. The iOS SDK probes it only with its internal API failover setting, which is off by default.",
      responses: { 200: ok("The server is up.", obj({ status: { type: "string", const: "ok" } }), { status: "ok" }) } }),
  },
  "/.well-known/revenuedot-signing-key": {
    get: op({ id: "getSigningKey", tag: "Response signing", summary: "Public key for response signatures", security: NONE, source: "app.ts",
      description: `
The Ed25519 root public key this server signs SDK responses with (Trusted Entitlements). Pin this key in SDK builds that verify responses.
The server signs only when \`REVENUEDOT_SIGNING_KEY\` is set; otherwise this answers 404. See [Trusted Entitlements](../docs/guides/trusted-entitlements.md).`,
      responses: {
        200: ok("The key.", obj({ algorithm: { type: "string", const: "Ed25519" }, public_key: str("Base64 of the raw 32-byte public key."), encoding: { type: "string", const: "base64" }, header: { type: "string", const: "X-Signature" }, docs: str() }),
          { algorithm: "Ed25519", public_key: "ZzwPxGlon0E8ErpDh9QAH0Jh6+E6D6qufvTSetXZY9Y=", encoding: "base64", header: "X-Signature", docs: "https://revenuedot.app/docs" }),
        404: ok("Signing is off.", ref("V1Error"), { code: 7259, message: "Response signing is not configured on this server. Set REVENUEDOT_SIGNING_KEY." }),
      } }),
  },

  // ---- Customers ---------------------------------------------------------------------------------------------------
  "/v1/subscribers/{app_user_id}": {
    get: op({ id: "getCustomerInfo", tag: "Customer info", summary: "Get customer info", security: PUBLIC_OR_SECRET, source: SDK, parameters: [user, param("XNonce")],
      description: `
What \`Purchases.getCustomerInfo()\` calls. Creates the customer when the app user id is new (answer 201). With a secret key the answer also has \`subscriber_attributes\`.
Entitlements are listed even after they expire; an entitlement is active while \`expires_date\` is null or in the future.`,
      responses: { 200: ci(), 201: ci("Customer info of a customer created by this call."), ...v1Errors(400, 401) } }),
    delete: op({ id: "deleteSubscriber", tag: "Customers (v1)", summary: "Delete a customer", security: SECRET_ONLY, source: V1, parameters: [user],
      description: "Deletes the customer with its aliases, attributes, purchases and events. Cannot be undone.",
      responses: { 200: ok("Deleted.", obj({ app_user_id: str() }), { app_user_id: "user_1" }), ...v1Errors(401, 403, 404) } }),
  },
  "/v1/receipts": {
    post: op({ id: "postReceipt", tag: "Receipts", summary: "Post a purchase or restore", security: PUBLIC_OR_SECRET, source: SDK, parameters: [param("XPlatform"), param("XNonce"), { name: "X-Is-Sandbox", in: "header", schema: str(), description: "`true` when the SDK knows the purchase is sandbox (used for StoreKit 1 receipts without an environment)." }],
      description: `
Every purchase, restore and \`syncPurchases()\` ends here. RevenueDot verifies the purchase with the store, saves it, records events and answers the updated customer info.

- **App Store:** \`fetch_token\` is a StoreKit 2 signed transaction (JWS), a StoreKit 1 app receipt (base64) or an Xcode StoreKit test receipt. With the app's in-app purchase key, Apple's App Store Server API supplies the full history and renewal state.
- **Google Play:** \`fetch_token\` is the purchase token. RevenueDot checks it with the Play Developer API and acknowledges it.
- **Amazon Appstore:** \`fetch_token\` is the receipt id and \`store_user_id\` the Amazon user id (\`X-Platform: amazon\`). RevenueDot checks both with Amazon's Receipt Verification Service.
- **Stripe:** from your backend, with \`X-Platform: stripe\` and the Stripe app's public key (\`strp_\`): \`fetch_token\` is a subscription id (\`sub_…\`) or a Checkout Session id (\`cs_…\`). RevenueDot reads it from Stripe with the app's restricted key. An unpaid first invoice or an open session answers 503, so post it again later.
- **Test Store:** \`fetch_token\` is \`test_<purchase time in ms>_<id>\`. Any such token is accepted.

**4xx or 5xx matters.** A 4xx tells the SDK the purchase can never be accepted, so it finishes the transaction. RevenueDot answers 5xx for its own and the store's temporary failures so the SDK keeps the purchase and retries.
With a secret key, send \`X-Platform\` so RevenueDot knows which app the receipt belongs to.`,
      requestBody: body(obj({
        app_user_id: str("The customer posting the receipt."),
        fetch_token: str("Receipt, signed transaction, purchase token or Test Store token."),
        app_transaction: str("StoreKit 2 app transaction JWS (accepted; not required)."),
        transaction_id: str("Store transaction id."),
        product_id: str("Product being bought."), product_ids: arr(str()),
        platform_product_ids: arr(obj({ product_id: str(), base_plan_id: str(), offer_id: str() })),
        price: { type: "number" }, currency: str(), store_country: str(), normal_duration: str("ISO 8601 period of the product."),
        is_restore: bool(), store_user_id: str(), presented_offering_identifier: str("Offering the purchase was made from; it appears in webhooks."),
        attributes: { type: "object", description: "Customer attributes to save with the purchase." },
      }, ["app_user_id"]), { app_user_id: "user_1", fetch_token: "test_1790800914000_quickstart", product_id: "pro_monthly", price: 9.99, currency: "USD", presented_offering_identifier: "default" }),
      responses: {
        200: ok("Updated customer info, plus `purchased_products`.", ref("ReceiptResponse"), { ...customerInfoExample, purchased_products: { pro_monthly: { should_consume: false } } }),
        ...v1Errors(400, 401, 500, 503),
      } }),
  },
  "/v1/subscribers/{app_user_id}/offerings": {
    get: op({ id: "getOfferings", tag: "Offerings (SDK)", summary: "Get offerings", security: PUBLIC_OR_SECRET, source: SDK, parameters: [user],
      description: "What `Purchases.getOfferings()` calls. Lists active offerings with the packages whose product belongs to the calling app. `current_offering_id` is the customer's override when one is set.",
      responses: { 200: ok("Offerings.", ref("Offerings"), { current_offering_id: "default", offerings: [{ description: "Standard plans", identifier: "default", metadata: null, packages: [{ identifier: "$rc_monthly", platform_product_identifier: "pro_monthly" }, { identifier: "$rc_annual", platform_product_identifier: "pro_annual" }, { identifier: "$rc_lifetime", platform_product_identifier: "pro_lifetime" }] }] }), ...v1Errors(401) } }),
  },
  "/v1/offerings": {
    get: op({ id: "getOfferingsWithoutUser", tag: "Offerings (SDK)", summary: "Get offerings without a user", security: PUBLIC_OR_SECRET, source: SDK,
      description: "Same answer as the per-user call, without a customer override.",
      responses: { 200: ok("Offerings.", ref("Offerings")), ...v1Errors(401) } }),
  },
  "/v1/subscribers/identify": {
    post: op({ id: "identify", tag: "Identity", summary: "Log in (identify)", security: PUBLIC_OR_SECRET, source: SDK,
      description: `
What \`Purchases.logIn()\` calls. When \`new_app_user_id\` is new and the current id is anonymous with no other ids, the anonymous customer takes the new id (201).
When \`new_app_user_id\` exists, an anonymous-only current customer is merged into it (200). See [Customers and app user IDs](../docs/concepts/customers-and-app-user-ids.md).`,
      requestBody: body(obj({ app_user_id: str("The current app user id."), new_app_user_id: str("Your user id.") }, ["app_user_id", "new_app_user_id"]), { app_user_id: "$RCAnonymousID:abc123", new_app_user_id: "user_2" }),
      responses: { 200: ci("The user existed."), 201: ci("The user is new."), ...v1Errors(400, 401) } }),
  },
  "/v1/subscribers/{app_user_id}/alias": {
    post: op({ id: "alias", tag: "Identity", summary: "Alias two app user ids", security: PUBLIC_OR_SECRET, source: SDK, parameters: [user],
      description: "Links `new_app_user_id` to the customer with the same merge rules as log in. The Android SDK uses it for Block Store recovery.",
      requestBody: body(obj({ new_app_user_id: str() }, ["new_app_user_id"])),
      responses: { 200: empty(), ...v1Errors(400, 401) } }),
  },
  "/v1/subscribers/{app_user_id}/attributes": {
    post: op({ id: "postAttributes", tag: "Attributes", summary: "Set customer attributes", security: PUBLIC_OR_SECRET, source: SDK, parameters: [user],
      description: "Saves attributes such as `$email`, `$displayName` or your own keys. A null value deletes the attribute. An invalid `$email` is refused with 7263; the other attributes are saved. `collectDeviceIdentifiers()` sends `$ip` and `$deviceVersion` as `\"true\"`: RevenueDot stores the request's IP address and the device and OS from the SDK's headers instead.",
      requestBody: body(obj({ attributes: { type: "object", additionalProperties: obj({ value: nstr(), updated_at_ms: int() }) } }, ["attributes"]), { attributes: { $email: { value: "ana@example.com", updated_at_ms: 1790800914000 } } }),
      responses: { 200: empty("Saved."), 400: ok("Some attributes were not saved.", ref("V1Error"), { code: 7263, message: "Some subscriber attributes keys were unable to be saved.", attribute_errors: [{ key_name: "$email", message: "Email address is not a valid email." }] }), ...v1Errors(401) } }),
  },
  "/v1/subscribers/{app_user_id}/intro_eligibility": {
    post: op({ id: "introEligibility", tag: "SDK support", summary: "Intro offer eligibility (StoreKit 1)", security: PUBLIC_OR_SECRET, source: SDK, parameters: [user],
      description: "Answers `null` (unknown) for every product, so the SDK decides eligibility on the device.",
      requestBody: body(obj({ product_identifiers: arr(str()) })),
      responses: { 200: ok("Eligibility per product.", { type: "object", additionalProperties: { type: "null" } }, { pro_monthly: null }) } }),
  },
  "/v1/offers": {
    post: op({ id: "postOfferForSigning", tag: "SDK support", summary: "Sign a promotional offer (iOS)", security: PUBLIC_OR_SECRET, source: SDK,
      description: `
What \`Purchases.promotionalOffer(forProductDiscount:product:)\` calls. RevenueDot signs each offer with the App Store app's In-App Purchase key (\`key_id\`, \`issuer_id\` and \`private_key\` in the app's credentials) the way Apple verifies it: ECDSA P-256 with SHA-256 over the bundle id, key id, product id, offer id, app account token, nonce and timestamp, DER-encoded and base64 ([Apple's format](https://developer.apple.com/documentation/storekit/generating-a-signature-for-promotional-offers)).
The app account token matches what the SDK puts on the payment: with StoreKit 2 the lowercase app user id when it is a UUID and empty otherwise; with StoreKit 1 the app user id.
Without an In-App Purchase key the answer is 400 with code 7234, which the SDK reports as \`invalidAppleSubscriptionKeyError\` for that offer only.`,
      requestBody: body(obj({
        app_user_id: str(), fetch_token: str("The receipt or signed transaction; not needed for signing."),
        generate_offers: arr(obj({ offer_id: str("Promotional offer id from App Store Connect."), product_id: str() }, ["offer_id", "product_id"])),
      }, ["app_user_id", "generate_offers"]), { app_user_id: "user_1", fetch_token: "…", generate_offers: [{ offer_id: "winback_50", product_id: "pro_monthly" }] }),
      responses: {
        200: ok("One signature per offer.", obj({ offers: arr(obj({ key_id: str(), offer_id: str(), product_id: str(), signature_data: obj({ nonce: str("Lowercase UUID."), signature: str("Base64 DER ECDSA signature."), timestamp: int("Epoch milliseconds.") }) })) }),
          { offers: [{ key_id: "2X9R4HXF34", offer_id: "winback_50", product_id: "pro_monthly", signature_data: { nonce: "0f3c2a8e-5d7b-4d7e-9a53-3b8f2c1e6d40", signature: "MEUCIQDD…", timestamp: 1790800914034 } }] }),
        400: ok("No In-App Purchase key, or no offers.", ref("V1Error"), { code: 7234, message: "Promotional offers need the app's App Store In-App Purchase key. Add it in the app's settings." }),
        ...v1Errors(401),
      } }),
  },
  "/v1/subscribers/{app_user_id}/attribution": {
    post: op({ id: "postAttribution", tag: "SDK support", summary: "Attribution data (deprecated iOS call)", security: PUBLIC_OR_SECRET, source: SDK, parameters: [user],
      description: `
What the deprecated \`Purchases.addAttributionData\` calls. The advertising identifiers in \`data\` (\`rc_idfa\`, \`rc_idfv\`, \`rc_gps_adid\`, \`rc_ip_address\`) become \`$idfa\`, \`$idfv\`, \`$gpsAdId\` and \`$ip\`.
For Apple Search Ads (\`network\` 0) with \`iad-attribution\` true, the iAd fields become \`$mediaSource\` ("Apple Search Ads"), \`$campaign\`, \`$adGroup\`, \`$keyword\`, \`$creative\` and the \`$appleAds*\` ids.
Attribution is write-once: a campaign attribute the customer already has is kept.`,
      requestBody: body(obj({ network: int("The SDK's AttributionNetwork: 0 Apple Search Ads."), data: { type: "object" } }, ["network", "data"]),
        { network: 0, data: { rc_idfv: "4CEE1BEE-3C19-4591-9E34-1AD968D7B609", "Version3.1": { "iad-attribution": "true", "iad-campaign-name": "Spring", "iad-keyword": "scanner" } } }),
      responses: { 200: empty("Stored."), ...v1Errors(400, 401) } }),
  },
  "/v1/subscribers/{app_user_id}/adservices_attribution": {
    post: op({ id: "postAdServicesAttribution", tag: "SDK support", summary: "Apple AdServices token", security: PUBLIC_OR_SECRET, source: SDK, parameters: [user],
      description: `
What \`enableAdServicesAttributionTokenCollection()\` sends once per install (the same token can also arrive as \`aad_attribution_token\` on a receipt).
After answering, RevenueDot looks the token up with [Apple's attribution API](https://developer.apple.com/documentation/adservices/aaattribution/attributiontoken()), retrying a 404 or 5xx 3 times 5 seconds apart, and stores an attributed install as \`$mediaSource\` ("Apple Search Ads"), \`$campaign\`, \`$adGroup\`, \`$keyword\`, \`$ad\`, \`$appleAdsCampaignId\`, \`$appleAdsAdGroupId\`, \`$appleAdsKeywordId\`, \`$appleAdsAdId\`, \`$appleAdsOrgId\`, \`$appleAdsCountryOrRegion\`, \`$claimType\` and \`$conversionType\`. Apple returns ids, not names. They show on the customer page and in every webhook's \`subscriber_attributes\`.`,
      requestBody: body(obj({ aad_attribution_token: str("The token from AAAttribution.attributionToken().") }, ["aad_attribution_token"]), { aad_attribution_token: "wD3Ma…" }),
      responses: { 200: empty("Accepted; the lookup runs after the answer."), 400: ok("No token.", ref("V1Error"), { code: 7226, message: "aad_attribution_token is required." }), ...v1Errors(401) } }),
  },
  "/v1/subscribers/{app_user_id}/health_report_availability": {
    get: op({ id: "healthReportAvailability", tag: "SDK support", summary: "SDK health report availability", security: NONE, source: SDK, parameters: [user],
      responses: { 200: ok("No report logs.", obj({ report_logs: bool() }), { report_logs: false }) } }),
  },
  "/v1/subscribers/{app_user_id}/health_report": {
    get: op({ id: "healthReport", tag: "SDK support", summary: "SDK health report", security: PUBLIC, source: SDK, parameters: [user],
      responses: { 200: ok("Always passed.", obj({ status: str(), project_id: nstr(), app_id: nstr(), checks: arr({ type: "object" }) }), { status: "passed", project_id: "proj18pzzkao", app_id: "appvnrm0a5h", checks: [] }) } }),
  },
  "/v1/product_entitlement_mapping": {
    get: op({ id: "productEntitlementMapping", tag: "SDK support", summary: "Product to entitlement mapping (offline entitlements)", security: PUBLIC_OR_SECRET, source: SDK,
      description: `
Lets the SDK grant entitlements on the device while the server answers 5xx (offline entitlements). The SDK fetches it every 25 hours.
A public key gets only its own app's products, keyed the way that SDK looks them up: App Store products by product id (\`product:monthly\` for a monthly billing plan), Google Play products by \`subscription:base_plan\` and by the bare subscription id, which carries every base plan's entitlements because Android purchases do not name their base plan. Consumables are left out. A secret key gets the whole project. See [Offline entitlements](../docs/guides/offline-entitlements.md).`,
      responses: { 200: ok("The mapping.", obj({ product_entitlement_mapping: { type: "object", additionalProperties: obj({ product_identifier: str(), base_plan_id: str(), entitlements: arr(str()) }) } }),
        { product_entitlement_mapping: { pro_monthly: { product_identifier: "pro_monthly", entitlements: ["pro"] } } }) } }),
  },
  "/v1/customercenter/{app_user_id}": {
    get: op({ id: "customerCenter", tag: "SDK support", summary: "Customer Center configuration", security: PUBLIC, source: SDK, parameters: [user],
      description: "The project's Customer Center configuration: appearance, the management and no-active screens with their help paths, localized strings and the support email. A built-in default merged with what the project stored through `POST /v2/projects/{project_id}/customer_center_config`.",
      responses: { 200: ok("The configuration.", obj({ customer_center: { type: "object", additionalProperties: true } }, ["customer_center"]), { customer_center: { screens: { MANAGEMENT: { type: "MANAGEMENT", title: "Manage subscription", paths: [] } }, support: { email: "support@example.com" } } }) } }),
  },
  "/v1/customercenter/support/create-ticket": {
    post: op({ id: "customerCenterTicket", tag: "SDK support", summary: "Customer Center support ticket (not built)", security: PUBLIC, source: SDK,
      responses: { 200: ok("Not sent.", obj({ sent: bool() }), { sent: false }) } }),
  },
  "/v1/subscribers/{app_user_id}/virtual_currencies": {
    get: op({ id: "virtualCurrencies", tag: "SDK support", summary: "Virtual currency balances", security: PUBLIC, source: SDK, parameters: [user],
      description: "The customer's in-app currency balances by code. A customer the server has not seen has none.",
      responses: { 200: ok("Balances.", obj({ virtual_currencies: { type: "object", additionalProperties: obj({ balance: int(), name: str(), code: str(), description: nstr() }, ["balance", "name", "code"]) } }, ["virtual_currencies"]), { virtual_currencies: { GLD: { balance: 700, name: "Gold", code: "GLD", description: null } } }) } }),
  },
  "/v1/subscribers/redeem_purchase": {
    post: op({ id: "redeemWebPurchase", tag: "SDK support", summary: "Redeem a web purchase (not available)", security: PUBLIC, source: SDK,
      description: "What `Purchases.redeemWebPurchase()` calls with the `redemption_token` from a redemption deep link. RevenueDot takes no web payments, so no token is valid: 400 with code 7849, which the SDKs return as the `invalidToken` result.",
      responses: { 400: ok("Invalid token.", ref("V1Error"), { code: 7849, message: "This redemption link is not valid: RevenueDot has no web purchases to redeem." }), ...v1Errors(401) } }),
  },
  "/v1/external_purchase_tokens": {
    post: op({ id: "postExternalPurchaseToken", tag: "SDK support", summary: "Register an Apple external purchase token (iOS)", security: PUBLIC, source: SDK,
      description: "Part of Apple's external purchase and link-out flows, before a web checkout. The token is acknowledged with an id, which is all the SDK reads; the web checkout that follows is not available (see `/rcbilling/v1/hosted-checkout`).",
      requestBody: body(obj({ app_user_id: str(), purchase_type: en(["IN_APP", "LINK_OUT"]), token: str("Apple's external purchase token, when there is one.") }, ["app_user_id", "purchase_type"])),
      responses: { 200: ok("Registered.", obj({ id: str(), purchase_type: str(), is_sandbox: bool(), token_source: en(["APPLE_SDK", "RC_GENERATED"]) }), { id: "ept3b1f0c9e2d8a4f6b9c7e5d3a1b2c4d6e", purchase_type: "LINK_OUT", is_sandbox: true, token_source: "APPLE_SDK" }), ...v1Errors(401) } }),
  },
  "/v1/subscribers/{app_user_id}/ads/reward_verifications/{client_transaction_id}": {
    get: op({ id: "rewardVerification", tag: "SDK support", summary: "Rewarded ad verification (not available)", security: PUBLIC, source: SDK,
      parameters: [user, { name: "client_transaction_id", in: "path", required: true, schema: str(), description: "From `generateRewardVerificationToken`." }],
      description: "What `pollRewardVerification` polls. There is no server-side ad verification, so the answer is always the final `failed`, and the SDK stops after one request.",
      responses: { 200: ok("Failed.", obj({ status: en(["pending", "verified", "failed"]), reward: { type: "null" }, failure_reason: str(), message: str() }), { status: "failed", reward: null, failure_reason: "not_supported", message: "Server-side reward verification is not available on RevenueDot." }), ...v1Errors(401) } }),
  },
  "/v1/receipts/amazon/{store_user_id}/{receipt_id}": {
    get: op({ id: "amazonReceipt", tag: "SDK support", summary: "Amazon receipt details", security: PUBLIC, source: SDK,
      parameters: [{ name: "store_user_id", in: "path", required: true, schema: str(), description: "The Amazon user id." }, { name: "receipt_id", in: "path", required: true, schema: str(), description: "Not encoded by the SDK; may contain \`/\`." }],
      description: `
The Android SDK built for Amazon asks for it on subscription purchases and reads \`termSku\`, which it then posts as the product id. RevenueDot asks Amazon's Receipt Verification Service with the app's shared key and answers Amazon's receipt unchanged.

- **400 · 7103:** Amazon does not know the receipt or the user. **400 · 7662:** the key is not an Amazon app's.
- **500 · 7101:** no shared key is saved, or Amazon rejected it. **503 · 7101:** Amazon is unavailable; the SDK keeps the purchase unconsumed and retries. See [Amazon Appstore setup](../docs/guides/amazon-appstore.md).`,
      responses: {
        200: ok("Amazon's receipt.", { type: "object", description: "Amazon RVS receipt: receiptId, productId, productType, termSku, term, purchaseDate, renewalDate, cancelDate, autoRenewing, freeTrialEndDate, gracePeriodEndDate, testTransaction, betaProduct and more." },
          { autoRenewing: true, betaProduct: false, cancelDate: null, cancelReason: null, countryCode: "US", freeTrialEndDate: null, gracePeriodEndDate: null, productId: "pro.subscription", productType: "SUBSCRIPTION", purchaseDate: 1790800914000, receiptId: "q1YqVrJSSs7P1UvMTazKz9PLTCwoTswtyEktM8jLz0kpLQ1JTSlFMsjILCoQ:3:11", renewalDate: 1793392914000, term: "1 Month", termSku: "pro.monthly", testTransaction: false }),
        ...v1Errors(400, 401, 500, 503),
      } }),
  },
  "/v1/subscribers/{app_user_id}/workflows": {
    get: op({ id: "paywallWorkflows", tag: "SDK support", summary: "Paywall workflows (web SDK)", security: PUBLIC, source: SDK,
      parameters: [user, { name: "type", in: "query", schema: str(), description: "`paywall`." }],
      description: "What purchases-js `presentPaywall` asks first. There are no workflows, so the SDK uses the offering's own paywall.",
      responses: { 200: ok("No workflows.", obj({ workflows: arr({ type: "object" }), ui_config: { type: "object" } }), { workflows: [], ui_config: {} }), ...v1Errors(401) } }),
  },
  "/v1/subscribers/{app_user_id}/workflows/{workflow_id}": {
    get: op({ id: "paywallWorkflow", tag: "SDK support", summary: "One paywall workflow (web SDK)", security: PUBLIC, source: SDK,
      parameters: [user, { name: "workflow_id", in: "path", required: true, schema: str() }],
      description: "Never called, because the workflow list is empty.",
      responses: { 404: ok("No such workflow.", ref("V1Error"), { code: 7259, message: "Workflow not found." }), ...v1Errors(401) } }),
  },
  "/v1/subscribers/{app_user_id}/restore/eligibility": {
    post: op({ id: "restoreEligibility", tag: "SDK support", summary: "Restore eligibility (StoreKit 2)", security: PUBLIC, source: SDK, parameters: [user],
      responses: { 200: ok("Always allowed.", obj({ is_purchase_allowed_by_restore_behavior: bool() }), { is_purchase_allowed_by_restore_behavior: true }) } }),
  },
  "/v1/config/{domain}": {
    parameters: [{ name: "domain", in: "path", required: true, schema: str(), description: "Config domain the SDK asks for (for example `app`)." }],
    get: op({ id: "getRemoteConfig", tag: "SDK support", summary: "Remote config fallback (none)", security: PUBLIC, source: SDK, description: "The SDK's JSON fallback host path, never used with a proxy URL. Answers 204.", responses: { 204: { description: "No config." } } }),
    post: op({ id: "postRemoteConfig", tag: "SDK support", summary: "Remote config: paywalls and UI settings", security: PUBLIC, source: SDK,
      description: `
How current SDKs (iOS 5.83 and later) load paywalls. The body is an RC Container (\`application/x-rc-format\`): an 8-byte header ("RC", version 1), then elements of
checksum (24 bytes, the first 24 bytes of SHA-256 of the payload), size (u32, little-endian), encoding (0, none) and 3 reserved bytes, then the payload padded to 8 bytes.
Element 0 is the configuration JSON with the topics \`sources\`, \`ui_config\` (app, localizations, variable_config, custom_variables) and \`workflows\` (one per
published paywall, keyed by workflow id, with \`offering_identifier\`). The other elements are the blobs those topics reference, inline. 204 when the \`manifest\` the SDK sent is current.`,
      requestBody: body(obj({ manifest: str("The manifest of the configuration the SDK holds."), prefetched_blobs: arr(str(), { description: "Blob refs the SDK already holds; they are not inlined again." }) }, [], { description: "The SDK also sends `fetch_context` and `app_user_id`, which the server does not use." }), { manifest: "v1.Qm9vdHN0cmFw", prefetched_blobs: [] }),
      responses: { 200: { description: "RC Container.", content: { "application/x-rc-format": { schema: { type: "string", format: "binary" } } } }, 204: { description: "The SDK's configuration is current." } } }),
  },
  "/blobs/{blob_ref}": {
    get: op({ id: "getConfigBlob", tag: "SDK support", summary: "Download a remote-config blob", security: NONE, source: "routes/assets.ts",
      parameters: [{ name: "blob_ref", in: "path", required: true, schema: str(), description: "base64url of the first 24 bytes of SHA-256 of the blob." }],
      description: "Public and immutable. The SDK downloads a blob here when it was not inline in the container (the \`sources\` topic points here).",
      responses: { 200: ok("The blob (JSON).", { type: "object", additionalProperties: true }), 404: ok("Unknown blob.", obj({ object: str(), type: str(), message: str() })) } }),
  },
  "/v1/events": {
    post: op({ id: "postEvents", tag: "SDK support", summary: "SDK paywall, Customer Center and ad events", security: PUBLIC, source: SDK,
      description: "Stored for the paywall, ad and Customer Center charts (each SDK event id once). A malformed batch is still answered 200 so the SDK does not resend it forever.", responses: { 200: empty() } }),
  },
  "/v1/diagnostics": {
    post: op({ id: "postDiagnostics", tag: "SDK support", summary: "SDK diagnostics (accepted, not stored)", security: PUBLIC, source: SDK, responses: { 200: empty() } }),
  },
  "/rcbilling/v1/subscribers/{app_user_id}/products": {
    get: op({ id: "testStoreProducts", tag: "Offerings (SDK)", summary: "Test Store product details", security: PUBLIC, source: SDK,
      parameters: [user, { name: "id", in: "query", schema: arr(str()), style: "form", explode: true, description: "Product ids; repeat the parameter. None lists every product of the app." }],
      description: "Product details the SDK needs for Test Store (and web) products, in the web billing products shape. Prices are 0 until the catalog stores Test Store prices.",
      responses: { 200: ok("Product details.", obj({ product_details: arr({ type: "object" }) }), { product_details: [{ identifier: "pro_monthly", product_type: "subscription", title: "Pro monthly", description: null, current_price: { amount: 0, amount_micros: 0, currency: "USD" }, normal_period_duration: "P1M", default_purchase_option_id: "base", default_subscription_option_id: "base", purchase_options: { base: { id: "base", price_id: "base", base: { period_duration: "P1M", cycle_count: 1, price: { amount: 0, amount_micros: 0, currency: "USD" } }, base_price: null, trial: null, intro_price: null } }, subscription_options: { base: { id: "base", price_id: "base", base: { period_duration: "P1M", cycle_count: 1, price: { amount: 0, amount_micros: 0, currency: "USD" } }, base_price: null, trial: null, intro_price: null } } }] }), ...v1Errors(401) } }),
  },

  "/rcbilling/v1/subscribers/{app_user_id}/offering_products": {
    get: op({ id: "webOfferingProducts", tag: "Web Billing", summary: "Web offering products", security: PUBLIC, source: SDK, parameters: [user],
      description: "Defined in the iOS SDK with no caller. There are no web offerings.",
      responses: { 200: ok("No web offerings.", obj({ offerings: { type: "object" } }), { offerings: {} }), ...v1Errors(401) } }),
  },
  "/rcbilling/v1/hosted-checkout": {
    post: op({ id: "hostedCheckout", tag: "Web Billing", summary: "Start a hosted web checkout (not available)", security: PUBLIC, source: SDK,
      description: "The iOS SDK's paywall web checkout. RevenueDot takes no payments: 400 with code 7000, and the SDK returns `failed` for the checkout without retrying.",
      responses: { 400: ok("Not available.", ref("V1Error"), { code: 7000, message: "Web checkout is not available on RevenueDot." }), ...v1Errors(401) } }),
  },
  "/rcbilling/v1/purchase": {
    post: op({ id: "webBillingPurchase", tag: "Web Billing", summary: "Web Billing purchase (not available)", security: PUBLIC, source: SDK,
      description: "Defined in purchases-js with no caller. 400 with code 7000.",
      responses: { 400: ok("Not available.", ref("V1Error"), { code: 7000, message: "Web checkout is not available on RevenueDot." }), ...v1Errors(401) } }),
  },
  "/rcbilling/v1/checkout/prepare": {
    post: op({ id: "checkoutPrepare", tag: "Web Billing", summary: "Prepare a Web Billing checkout (not available)", security: PUBLIC, source: SDK,
      description: "purchases-js with an `rcb_` key. 400 with code 7000: the purchase fails with an error in the SDK's purchase screen.",
      responses: { 400: ok("Not available.", ref("V1Error"), { code: 7000, message: "Web checkout is not available on RevenueDot." }), ...v1Errors(401) } }),
  },
  "/rcbilling/v1/checkout/start": {
    post: op({ id: "checkoutStart", tag: "Web Billing", summary: "Start a Web Billing checkout (not available)", security: PUBLIC, source: SDK,
      responses: { 400: ok("Not available.", ref("V1Error"), { code: 7000, message: "Web checkout is not available on RevenueDot." }), ...v1Errors(401) } }),
  },
  "/rcbilling/v1/checkout/{operation_session_id}": {
    parameters: [{ name: "operation_session_id", in: "path", required: true, schema: str() }],
    get: op({ id: "checkoutStatus", tag: "Web Billing", summary: "Web Billing checkout status", security: PUBLIC, source: SDK,
      description: "No checkout session exists: 400 with code 7877.",
      responses: { 400: ok("No such session.", ref("V1Error"), { code: 7877, message: "There is no such checkout session." }), ...v1Errors(401) } }),
    patch: op({ id: "checkoutRefreshPricing", tag: "Web Billing", summary: "Refresh Web Billing checkout pricing", security: PUBLIC, source: SDK,
      responses: { 400: ok("No such session.", ref("V1Error"), { code: 7877, message: "There is no such checkout session." }), ...v1Errors(401) } }),
  },
  "/rcbilling/v1/checkout/{operation_session_id}/complete": {
    parameters: [{ name: "operation_session_id", in: "path", required: true, schema: str() }],
    post: op({ id: "checkoutComplete", tag: "Web Billing", summary: "Complete a Web Billing checkout", security: PUBLIC, source: SDK,
      responses: { 400: ok("No such session.", ref("V1Error"), { code: 7877, message: "There is no such checkout session." }), ...v1Errors(401) } }),
  },
  "/rcbilling/v1/branding": {
    get: op({ id: "webBillingBranding", tag: "Web Billing", summary: "Web checkout branding", security: PUBLIC, source: SDK,
      description: "purchases-js with an `rcb_` key loads it before a checkout: the app's name and the SDK's default look.",
      responses: { 200: ok("Branding.", obj({ id: str(), app_name: nstr(), app_icon: nstr(), app_icon_webp: nstr(), app_wordmark: nstr(), app_wordmark_webp: nstr(), appearance: { type: "null" }, support_email: nstr(), gateway_tax_collection_enabled: bool(), brand_font_config: { type: "null" } }),
        { id: "appvnrm0a5h", app_name: "Scanner Web", app_icon: null, app_icon_webp: null, app_wordmark: null, app_wordmark_webp: null, appearance: null, support_email: null, gateway_tax_collection_enabled: false, brand_font_config: null }), ...v1Errors(401) } }),
  },

  // ---- Store notifications -------------------------------------------------------------------------------------------
  "/v1/notifications/apple/{app_id}": {
    post: op({ id: "appleNotification", tag: "Store notifications", summary: "App Store Server Notifications v2", security: NONE, source: "stores/apple/notifications.ts", parameters: [param("AppId")],
      description: `
Set this URL (shown on the app's page in the dashboard) as the Production and Sandbox Server URL in App Store Connect, with version 2 notifications.
RevenueDot verifies Apple's signature and the bundle id, stores the raw body, copies it to \`notification_forward_url\` when set, and applies it.

- **200:** handled, including notifications about purchases this server has not seen (stored; applied only with \`track_new_purchases\`).
- **400:** the payload cannot be verified or belongs to another app. App Store Connect shows it as failed.
- **404:** no App Store app with this id.
- **500:** RevenueDot failed; Apple retries.`,
      requestBody: body(obj({ signedPayload: str("Apple's signed JWS.") }, ["signedPayload"])),
      responses: { 200: ok("Handled.", obj({ ok: bool() }), { ok: true }), 400: ok("Unverifiable.", obj({ error: str() }), { error: "The signed payload is not valid: bad signature." }), 404: ok("Unknown app.", obj({ error: str() })), 500: ok("Failed; Apple retries.", obj({ error: str() })) } }),
  },
  "/v1/notifications/google/{app_id}": {
    post: op({ id: "googleNotification", tag: "Store notifications", summary: "Google Play real-time developer notifications (Pub/Sub push)", security: [{}, { googlePubSubOidc: [] }], source: "stores/google/notifications.ts", parameters: [param("AppId")],
      description: `
Set this URL as the endpoint of a Pub/Sub **push** subscription on the topic Google Play publishes to.
When the app's \`pubsub_audience\` credential is set, the push must carry a Google-signed OIDC token for that audience (and for \`pubsub_service_account\` when set).
Each message is stored once (by message id), forwarded when \`notification_forward_url\` is set, and applied by reading the purchase from the Play Developer API.

- **200:** handled, a duplicate, ignored (another package, not a developer notification) or an invalid token that can never succeed.
- **400:** not a Pub/Sub push body. **401:** bad push token. **404:** no Google Play app with this id.
- **500 or 503:** a temporary failure; Pub/Sub redelivers.`,
      requestBody: body(obj({ message: obj({ data: str("Base64 JSON developer notification."), messageId: str(), publishTime: str() }), subscription: str() }, ["message"])),
      responses: {
        200: ok("Handled.", obj({ status: en(["processed", "ignored", "duplicate", "invalid_token"]) }), { status: "processed" }),
        400: ok("Not a push body.", ref("V1Error")), 401: ok("Bad push token.", ref("V1Error"), { code: 7224, message: "The Pub/Sub push token is missing or invalid." }),
        404: ok("Unknown app.", ref("V1Error")), 500: ok("Temporary failure; Pub/Sub retries.", ref("V1Error")), 503: ok("Google's signing keys could not be loaded.", ref("V1Error")),
      } }),
  },

  "/v1/notifications/amazon/{app_id}": {
    post: op({ id: "amazonNotification", tag: "Store notifications", summary: "Amazon Appstore Real-time Notifications (SNS)", security: NONE, source: "stores/amazon/notifications.ts", parameters: [param("AppId")],
      description: `
Add this URL as an endpoint under App Services → Real-time Notifications in the Amazon Appstore Console. Amazon delivers through Amazon SNS.
Every message must carry a valid SNS signature (SignatureVersion 1 or 2, certificate from an \`sns.<region>.amazonaws.com\` URL). The subscription confirmation is accepted by fetching its \`SubscribeURL\`, which is what makes Amazon show "Verified". Each message is stored once (by SNS message id), forwarded when \`notification_forward_url\` is set, and applied by reading the receipt from Amazon's Receipt Verification Service.

- **200:** handled, confirmed, a duplicate, ignored (another package) or a receipt that can never be checked.
- **400:** not an SNS message, a bad signature, or a topic other than the app's \`sns_topic_arn\`. **404:** no Amazon app with this id.
- **500 or 503:** a temporary failure; SNS retries. See [Amazon Appstore setup](../docs/guides/amazon-appstore.md).`,
      requestBody: body(obj({ Type: en(["Notification", "SubscriptionConfirmation", "UnsubscribeConfirmation"]), MessageId: str(), TopicArn: str(), Message: str("For notifications: Amazon's JSON (appPackageName, notificationType, appUserId, receiptId, relatedReceipts, timestamp, betaProductTransaction)."), SubscribeURL: str("Subscription confirmations only.") }, ["Type", "MessageId"], { description: "An SNS message as SNS posts it, with its Timestamp, SignatureVersion, Signature and SigningCertURL (checked, not listed here)." })),
      responses: {
        200: ok("Handled.", obj({ status: en(["processed", "confirmed", "unknown_purchase", "ignored", "duplicate", "invalid_receipt"]) }), { status: "processed" }),
        400: ok("Not accepted.", ref("V1Error"), { code: 7000, message: "The SNS signature does not match the message" }), 404: ok("Unknown app.", ref("V1Error")),
        500: ok("Temporary failure; SNS retries.", ref("V1Error")), 503: ok("The SNS certificate or confirmation failed; SNS retries.", ref("V1Error")),
      } }),
  },
  "/v1/notifications/stripe/{app_id}": {
    post: op({ id: "stripeNotification", tag: "Store notifications", summary: "Stripe webhooks", security: NONE, source: "stores/stripe/notifications.ts", parameters: [param("AppId"), { name: "Stripe-Signature", in: "header", required: true, schema: str(), description: "\`t=<unix seconds>,v1=<hex HMAC-SHA256 of \"<t>.<body>\">\`, checked with the app's \`stripe_webhook_secret\` within 5 minutes." }],
      description: `
Add this URL as a webhook endpoint in your Stripe account with the events \`customer.subscription.created\`, \`.updated\`, \`.deleted\`, \`.paused\`, \`.resumed\`, \`invoice.paid\`, \`invoice.payment_failed\`, \`invoice.updated\`, \`charge.refunded\` and \`checkout.session.completed\`, and save its signing secret on the app.
Each event is stored once (by event id), forwarded when \`notification_forward_url\` is set, and applied by reading the subscription from Stripe, so event order does not matter. Other event types are accepted and ignored.

- **200:** handled, a duplicate, ignored, an unknown purchase (applied only with \`track_new_purchases\`) or an object Stripe no longer has.
- **400:** no signing secret saved, a missing or wrong \`Stripe-Signature\`, or not a Stripe event. **404:** no Stripe app with this id.
- **500:** a temporary failure; Stripe retries for three days. See [Stripe setup](../docs/guides/stripe.md).`,
      requestBody: body(obj({ id: str("evt_…"), object: { type: "string", const: "event" }, type: str(), created: int(), livemode: bool(), data: obj({ object: { type: "object" } }) }, ["id", "type", "data"])),
      responses: {
        200: ok("Handled.", obj({ status: en(["processed", "unknown_purchase", "ignored", "duplicate", "invalid"]) }), { status: "processed" }),
        400: ok("Not accepted.", ref("V1Error"), { code: 7000, message: "No signature in Stripe-Signature matches the payload. Check the webhook signing secret." }), 404: ok("Unknown app.", ref("V1Error")),
        500: ok("Temporary failure; Stripe retries.", ref("V1Error")),
      } }),
  },

  // ---- REST API v1 (secret key) --------------------------------------------------------------------------------------
  "/v1/subscribers/{app_user_id}/entitlements/{entitlement_identifier}/promotional": {
    post: op({ id: "grantPromotional", tag: "Promotional entitlements (v1)", summary: "Grant promotional access", security: SECRET_ONLY, source: V1,
      parameters: [user, { name: "entitlement_identifier", in: "path", required: true, schema: str(), description: "Entitlement lookup key, for example `pro`." }],
      description: "Gives the customer the entitlement until `end_time_ms`, or for a `duration`. Creates the customer when needed. A grant whose end is within 2 hours of an existing promotional grant for the same entitlement is a duplicate and changes nothing.",
      requestBody: body(obj({
        end_time_ms: int("When access ends, epoch milliseconds. Preferred."),
        duration: en(["daily", "three_day", "weekly", "two_week", "monthly", "two_month", "three_month", "six_month", "yearly", "lifetime"], "Deprecated alternative to end_time_ms."),
        start_time_ms: int("Start for `duration`. Default now."),
      }), { duration: "weekly" }),
      responses: { 200: ci("Customer info with the grant (store `promotional`)."), ...v1Errors(400, 401, 403, 404) } }),
  },
  "/v1/subscribers/{app_user_id}/entitlements/{entitlement_identifier}/revoke_promotionals": {
    post: op({ id: "revokePromotionals", tag: "Promotional entitlements (v1)", summary: "Revoke promotional access", security: SECRET_ONLY, source: V1,
      parameters: [user, { name: "entitlement_identifier", in: "path", required: true, schema: str() }],
      description: "Ends every active promotional grant of this entitlement now.",
      responses: { 200: ci(), ...v1Errors(401, 403, 404) } }),
  },
  "/v1/subscribers/{app_user_id}/offerings/{offering_identifier}/override": {
    post: op({ id: "overrideOffering", tag: "Offering overrides (v1)", summary: "Show a customer another offering", security: SECRET_ONLY, source: V1,
      parameters: [user, { name: "offering_identifier", in: "path", required: true, schema: str(), description: "Offering id (ofrng...) or lookup key." }],
      description: "The customer's `current_offering_id` becomes this offering.",
      responses: { 200: ci(), ...v1Errors(401, 403, 404) } }),
  },
  "/v1/subscribers/{app_user_id}/offerings/override": {
    delete: op({ id: "removeOfferingOverride", tag: "Offering overrides (v1)", summary: "Remove a customer's offering override", security: SECRET_ONLY, source: V1, parameters: [user],
      responses: { 200: ci(), ...v1Errors(401, 403, 404) } }),
  },
  "/v1/subscribers/{app_user_id}/subscriptions/{product_identifier}/revoke": {
    post: op({ id: "revokeGoogleSubscription", tag: "Store actions (v1)", summary: "Refund and revoke a Google Play subscription", security: SECRET_ONLY, source: V1,
      parameters: [user, { name: "product_identifier", in: "path", required: true, schema: str(), description: "Store product id of the subscription." }],
      description: "Google Play only: refunds the latest payment and ends access now. Other stores answer 400 with code 7000.",
      responses: { 200: ci(), ...v1Errors(400, 401, 403, 404, 503) } }),
  },
  "/v1/subscribers/{app_user_id}/subscriptions/{product_identifier}/defer": {
    post: op({ id: "deferGoogleSubscription", tag: "Store actions (v1)", summary: "Defer a Google Play renewal", security: SECRET_ONLY, source: V1,
      parameters: [user, { name: "product_identifier", in: "path", required: true, schema: str() }],
      description: "Google Play only: moves the next renewal date. Send `expiry_time_ms` or `extend_by_days`. Use extend for App Store subscriptions.",
      requestBody: body(obj({ expiry_time_ms: int("New expiry, epoch milliseconds; later than the current one."), extend_by_days: int("Days to add, 1 to 365.") }), { extend_by_days: 7 }),
      responses: { 200: ci(), ...v1Errors(400, 401, 403, 404, 503) } }),
  },
  "/v1/subscribers/{app_user_id}/transactions/{store_transaction_identifier}/refund": {
    post: op({ id: "refundGoogleTransaction", tag: "Store actions (v1)", summary: "Refund a Google Play order", security: SECRET_ONLY, source: V1,
      parameters: [user, { name: "store_transaction_identifier", in: "path", required: true, schema: str(), description: "Google order id." }],
      description: "Google Play only: refunds and revokes the order.",
      responses: { 200: ci(), ...v1Errors(400, 401, 403, 404, 503) } }),
  },
  "/v1/subscribers/{app_user_id}/subscriptions/{store_transaction_identifier}/cancel": {
    post: op({ id: "cancelGoogleSubscription", tag: "Store actions (v1)", summary: "Cancel a Google Play subscription", security: SECRET_ONLY, source: V1,
      parameters: [user, { name: "store_transaction_identifier", in: "path", required: true, schema: str(), description: "Store transaction id of the subscription." }],
      description: "Google Play only: turns auto-renew off; access continues to the end of the period.",
      responses: { 200: ci(), ...v1Errors(400, 401, 403, 404, 503) } }),
  },
  "/v1/subscribers/{app_user_id}/subscriptions/{store_transaction_identifier}/extend": {
    post: op({ id: "extendAppleSubscription", tag: "Store actions (v1)", summary: "Extend an App Store subscription", security: SECRET_ONLY, source: V1,
      parameters: [user, { name: "store_transaction_identifier", in: "path", required: true, schema: str() }],
      description: "App Store only (needs the app's in-app purchase key): Apple extends the renewal date. Use defer for Google Play.",
      requestBody: body(obj({ extend_by_days: int("1 to 90."), extend_reason_code: int("Apple's reason code: 0 undeclared, 1 customer satisfaction, 2 other, 3 service issue or outage.") }), { extend_by_days: 7, extend_reason_code: 1 }),
      responses: { 200: ci(), ...v1Errors(400, 401, 403, 404, 503) } }),
  },
};

// ---- Subscriber token paths (the SDKs' IAM mode) ---------------------------------------------------------------------
// Each answers like the /v1/subscribers/{app_user_id} path it stands for, for the app user id of the token.
const ALTERNATES = [
  ["/v1/customer", "/v1/subscribers/{app_user_id}", "get", "getCustomerInfoWithToken"],
  ["/v1/customer/offerings", "/v1/subscribers/{app_user_id}/offerings", "get", "getOfferingsWithToken"],
  ["/v1/customer/intro_eligibility", "/v1/subscribers/{app_user_id}/intro_eligibility", "post", "introEligibilityWithToken"],
  ["/v1/customer/attribution", "/v1/subscribers/{app_user_id}/attribution", "post", "postAttributionWithToken"],
  ["/v1/customer/attributes", "/v1/subscribers/{app_user_id}/attributes", "post", "postAttributesWithToken"],
  ["/v1/customer/adservices_attribution", "/v1/subscribers/{app_user_id}/adservices_attribution", "post", "postAdServicesAttributionWithToken"],
  ["/v1/customer/health_report", "/v1/subscribers/{app_user_id}/health_report", "get", "healthReportWithToken"],
  ["/v1/customer/customercenter", "/v1/customercenter/{app_user_id}", "get", "customerCenterWithToken"],
  ["/v1/customer/customercenter/support/create-ticket", "/v1/customercenter/support/create-ticket", "post", "createSupportTicketWithToken"],
  ["/v1/customer/virtual_currencies", "/v1/subscribers/{app_user_id}/virtual_currencies", "get", "virtualCurrenciesWithToken"],
  ["/v1/customer/restore/eligibility", "/v1/subscribers/{app_user_id}/restore/eligibility", "post", "restoreEligibilityWithToken"],
  ["/v1/customer/ads/reward_verifications/{client_transaction_id}", "/v1/subscribers/{app_user_id}/ads/reward_verifications/{client_transaction_id}", "get", "rewardVerificationWithToken"],
  ["/rcbilling/v1/customer/offering_products", "/rcbilling/v1/subscribers/{app_user_id}/offering_products", "get", "webOfferingProductsWithToken"],
  ["/rcbilling/v1/customer/products", "/rcbilling/v1/subscribers/{app_user_id}/products", "get", "webProductsWithToken"],
];
const isUser = (p) => p?.$ref === "#/components/parameters/AppUserId";
for (const [path, original, method, id] of ALTERNATES) {
  const base = sdkPaths[original]?.[method];
  if (!base) throw new Error(`sdk.mjs: no ${method.toUpperCase()} ${original} to build ${path} from`);
  const parameters = (base.parameters ?? []).filter((p) => !isUser(p));
  sdkPaths[path] = {
    [method]: {
      ...base, operationId: id, tags: ["Subscriber tokens"], security: SUBSCRIBER, summary: `${base.summary} (subscriber token)`,
      description: `The subscriber-token form of \`${method.toUpperCase()} ${original}\`: same body and answer, for the app user id of the token. An app key, an expired token or another user's token answers 401 with code 7224.`,
      ...(parameters.length ? { parameters } : { parameters: undefined }),
      responses: { ...base.responses, 401: { $ref: "#/components/responses/V1Error401" } },
    },
  };
  if (!parameters.length) delete sdkPaths[path][method].parameters;
}
sdkPaths["/v1/customer/virtual_currencies/spend"] = {
  post: op({ id: "spendVirtualCurrencyWithToken", tag: "Subscriber tokens", summary: "Spend in-app currency as the subscriber", security: SUBSCRIBER, source: SDK, parameters: [{ name: "Idempotency-Key", in: "header", schema: str(), description: "A retry with the same key spends nothing again." }],
    description: "Takes the amounts off the subscriber's balances, all or nothing. A balance cannot go below zero (422, code 7000); an unknown currency or a malformed body is 400 with code 7226. No webhook is sent, as for balance changes through the API.",
    requestBody: body(obj({ adjustments: { type: "object", additionalProperties: int(undefined, { minimum: 1 }), description: "Amount to spend per currency code." }, reference: nstr("Your own note, kept in the ledger.") }, ["adjustments"]), { adjustments: { GLD: 5 }, reference: "sword" }),
    responses: { 200: ok("The balances after the spend.", obj({ virtual_currencies: { type: "object", additionalProperties: obj({ balance: int(), name: str(), code: str(), description: nstr() }) } }, ["virtual_currencies"]), { virtual_currencies: { GLD: { balance: 95, name: "Gold", code: "GLD", description: null } } }), ...v1Errors(400, 401, 422) } }),
};

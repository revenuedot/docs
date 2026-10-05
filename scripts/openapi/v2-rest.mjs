// RevenueDot: the open-source RevenueCat alternative. Same SDK API, free to start on RevenueDot Cloud.
// This file: the last operations of RevenueCat's v2 API (restore by order id, create in store, subscriber tokens), the
// RevenueCat Billing invoice operations RevenueDot answers on purpose, the win-back eligibility extension, and product import
// from the store (extension).
// Docs: https://revenuedot.app/docs/api/rest-v2   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { SECRET, arr, body, bool, en, int, listOf, nstr, obj, ok, op, param, ref, str, v2Errors, nms } from "./common.mjs";

const P = "/v2/projects/{project_id}";
const project = param("ProjectId");
const customer = param("CustomerId");
const page = [param("Limit"), param("StartingAfter")];
const OPS = "routes/v2/store-ops.ts";
const AUTH = "routes/v2/subscriber-auth.ts";
const BILLING = "routes/v2/billing-excluded.ts";
const IMPORT = "routes/v2/store-import.ts";
const PRODUCT_TYPES = ["subscription", "one_time", "consumable", "non_consumable", "non_renewing_subscription"];
const storeListing = obj({
  object: en(["store_product_listing"]),
  store_identifier: str("The identifier the catalog uses: the App Store product id; `subscription_id:base_plan_id` or the one-time product id on Google Play; the Stripe price id (`price_...`), or the product id for a Stripe product without a price."),
  type: en(PRODUCT_TYPES, "The catalog type the product gets: App Store types map one to one; Google Play one-time products are `one_time`; Stripe one-time prices are `non_consumable`."),
  display_name: nstr("The name in the store: App Store Connect's reference name, the Play listing title (English when there is one, with the base plan id when the subscription has several), the Stripe product name (with the price's nickname or interval when the product has several prices)."),
  duration: nstr("ISO 8601 period for subscriptions (`P1W`, `P1M`, `P3M`, `P1Y` ...): App Store Connect's subscription period, the Play base plan's billing period, the Stripe price's interval."),
  store_state: nstr("The store's own state, such as `APPROVED`, `READY_TO_SUBMIT` (App Store) or `ACTIVE`, `DRAFT` (Google Play, Stripe)."),
  group: { oneOf: [obj({ id: str(), name: nstr() }, ["id", "name"]), { type: "null" }], description: "The App Store subscription group, the Google Play subscription, or the Stripe product." },
  price: { oneOf: [obj({ amount_micros: int("Price in millionths of the currency unit.", { format: "int64" }), currency: str("ISO 4217 code.") }, ["amount_micros", "currency"]), { type: "null" }], description: "Stripe only: the price. Null for App Store and Google Play." },
  importable: bool("False for a Play subscription without a base plan, a Stripe product without an active price, and metered Stripe prices."),
  note: nstr("Why the product cannot be imported, or a caveat (a prepaid base plan, a one-time product without a backwards-compatible purchase option)."),
  in_catalog: bool("Whether the catalog already has the product for this app (for a Stripe price, also when its product id is in the catalog)."),
  product_id: nstr("The catalog product, when `in_catalog`."),
}, ["object", "store_identifier", "type", "display_name", "duration", "store_state", "group", "price", "importable", "note", "in_catalog", "product_id"]);
const productId = { name: "product_id", in: "path", required: true, schema: str(), description: "Product id (prod...)." };
const why = "Invoices belong to RevenueCat Billing, which issues its own. For web purchases through RevenueDot's checkout, Stripe issues the invoices in your Stripe account.";
const empty = (url) => ok("Always an empty list.", listOf({ type: "object" }), { object: "list", items: [], next_page: null, url });
const storeProduct = obj({
  object: en(["store_product"]), id: str("The product's id in the store: the App Store Connect id, or the Google Play product id."),
  name: nstr("The name in the store."), product_identifier: str("The product identifier in the store."),
}, ["object", "id", "product_identifier"]);

export const v2RestPaths = {
  [`${P}/customers/{customer_id}/actions/restore_purchase_by_order_id`]: {
    post: op({ id: "restorePurchaseByOrderId", tag: "Customers", summary: "Restore a purchase by its store order id", security: SECRET, source: OPS, scopes: ["customer_information:customers:read_write"], parameters: [project, customer],
      description: `
Finds the purchase an order id paid for and gives it to the customer, like a restore from the device: the project's transfer behaviour applies, and a purchase that moves records a \`TRANSFER\` event.

- **Google Play** order ids (\`GPA.1234-5678-9012-34567\`, renewals with \`..0\`, \`..1\`): \`orders.batchGet\` on each Play app with a service account gives the purchase token, which is verified and acknowledged like a receipt. The service account needs the "View financial data" permission.
- **App Store** order ids (the id on the customer's receipt email, such as \`MK5TTTVWJH\`): Apple's Look Up Order ID on each App Store app with an In-App Purchase key, production first, then the sandbox. Only the order's own subscriptions and purchases are restored. RevenueCat's operation takes Google Play order ids only; App Store order ids are a RevenueDot addition.

404 when no store knows the order, 422 \`unprocessable_entity_error\` when no app has the credentials the lookup needs, 422 \`store_error\` with \`retryable: true\` while the store cannot be reached, 409 when the project's transfer behaviour is \`keep\` and another customer owns the purchase.`,
      requestBody: body(obj({ order_id: str("The store order id.", { minLength: 1, maxLength: 255 }) }, ["order_id"]), { order_id: "GPA.3372-4157-7914-56870" }),
      responses: { 200: ok("The customer after the restore.", ref("Customer")), ...v2Errors(400, 401, 403, 404, 409, 422) } }),
  },
  [`${P}/products/{product_id}/create_in_store`]: {
    post: op({ id: "createProductInStore", tag: "Products", summary: "Create the product in its store", security: SECRET, source: OPS, scopes: ["project_configuration:products:read_write"], parameters: [project, productId],
      description: `
Creates a catalog product in the store its app belongs to. The product's display name becomes the store name.

- **App Store** (needs the app's App Store Connect API key with the App Manager role: \`app_store_connect_api_key\`, \`app_store_connect_api_key_id\`, \`app_store_connect_api_key_issuer\`). A subscription needs \`store_information\` with \`duration\` and \`subscription_group_name\` (or \`subscription_group_id\`); the group is reused by name or created. Consumables, non-consumables and non-renewing subscriptions need no body. Add prices, a review screenshot and localizations in App Store Connect before submitting.
- **Google Play** (a RevenueDot addition; needs the service account with "Manage store presence"): a subscription with one listing in the app's default language. Add its base plans and prices in Play Console. One-time products answer 422, because Google needs a price to create them.

409 when the store already has the product id, 422 without the credentials or for another store, 422 \`store_error\` with \`retryable: true\` while the store is down.`,
      requestBody: body(obj({
        store_information: {
          oneOf: [
            obj({ duration: en(["ONE_WEEK", "ONE_MONTH", "TWO_MONTHS", "THREE_MONTHS", "SIX_MONTHS", "ONE_YEAR"]), subscription_group_name: str(), subscription_group_id: nstr("An existing subscription group's id in App Store Connect.") }, ["duration", "subscription_group_name"]),
            obj({}),
          ],
          description: "App Store subscriptions only.",
        },
      }), { store_information: { duration: "ONE_MONTH", subscription_group_name: "Pro" } }, false),
      responses: {
        201: ok("The product in the store.", obj({ created_product: storeProduct }, ["created_product"]), { created_product: { object: "store_product", id: "6743920115", name: "Pro Monthly", product_identifier: "pro_monthly" } }),
        ...v2Errors(400, 401, 403, 404, 409, 422),
      } }),
  },
  [`${P}/apps/{app_id}/authenticate`]: {
    post: op({ id: "authenticateSubscriber", tag: "Apps", summary: "Issue a subscriber access token", security: SECRET, source: AUTH, scopes: ["iam:authorization:issue_token"], parameters: [project, param("AppId")],
      description: `
A short-lived access token (one hour) for one app user id of one app. Send it as \`Authorization: Bearer rdat_...\` to the [subscriber token endpoints](sdk-endpoints.md) (\`/v1/customer\`, \`/v1/customer/offerings\` ...), which answer for that app user id, or to any SDK endpoint for that app user id. It cannot be refreshed: ask for a new one. Only a hash of the token is stored.`,
      requestBody: body(obj({ app_user_id: str("The app user id the token speaks for.", { minLength: 1, maxLength: 100 }) }, ["app_user_id"]), { app_user_id: "user_1" }),
      responses: {
        200: ok("The token.", obj({ object: en(["authentication"]), access_token: str("Starts with rdat_."), expires_at: int("Epoch milliseconds.", { format: "int64" }) }, ["object", "access_token", "expires_at"]),
          { object: "authentication", access_token: "rdat_3f0c1d0b9e8a7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b", expires_at: 1790804514034 }),
        ...v2Errors(400, 401, 403, 404),
      } }),
  },
  [`${P}/customers/{customer_id}/win_back_offers`]: {
    get: op({ id: "listWinBackOfferEligibility", tag: "Customers", summary: "List the win-back offers Apple lets a customer redeem", security: SECRET, source: OPS, scopes: ["customer_information:subscriptions:read"], parameters: [project, customer], extension: true,
      description: "One item per App Store subscription of the customer, with the win-back offer ids from Apple's renewal info, best first. RevenueDot reads the renewal info when the app posts a receipt, when Apple sends a notification, and after store actions; it needs the app's In-App Purchase key. See [Win-back offers](../docs/guides/win-back-offers.md).",
      responses: {
        200: ok("The customer's App Store subscriptions.", listOf(obj({
          object: en(["win_back_offer_eligibility"]), subscription_id: str(), product_id: str(), store: en(["app_store", "mac_app_store"]),
          offer_ids: arr(str(), { description: "Win-back offer identifiers Apple says the customer may redeem now. Empty when none." }), updated_at: nms("When the list was last read from Apple."),
        }, ["object", "subscription_id", "product_id", "store", "offer_ids", "updated_at"])),
        { object: "list", items: [{ object: "win_back_offer_eligibility", subscription_id: "sub_4kq0x2m9a7c1d8e3", product_id: "pro_monthly", store: "app_store", offer_ids: ["comeback_50"], updated_at: 1790800914034 }], next_page: null, url: "/v2/projects/proj18pzzkao/customers/user_1/win_back_offers" }),
        ...v2Errors(401, 403, 404),
      } }),
  },

  // ---- Import products from the store (extension) ---------------------------------------------------------------------
  [`${P}/apps/{app_id}/store_products`]: {
    get: op({ id: "listStoreProducts", tag: "Apps", summary: "List the products in the app's store", security: SECRET, source: IMPORT, scopes: ["project_configuration:products:read"], parameters: [project, param("AppId")], extension: true,
      description: `
What the app's store has, read with the credentials the app already has, every page of the store's lists, each item marked \`in_catalog\`. Nothing in the store changes. See [Import products](../docs/guides/import-products.md).

- **App Store and Mac App Store:** the App Store Connect API key (\`app_store_connect_api_key\`, \`_id\`, \`_issuer\`), a team key with the App Manager role. Subscriptions by subscription group, then in-app purchases (consumable, non-consumable, non-renewing).
- **Google Play:** the service account, with "View app information and download bulk reports (read-only)" in Play Console. One item per subscription base plan (\`subscription_id:base_plan_id\`) with its billing period, then one-time products (\`monetization.onetimeproducts\`, or the legacy \`inappproducts\` list where that API is not available).
- **Stripe:** the app's restricted key with "Products" read (it covers prices). One item per active price; recurring prices are subscriptions.

422 \`unprocessable_entity_error\` when the credential is missing or the store refuses it (the message names the role or permission), for Amazon (it has no API that lists in-app items; add products by SKU) and the Test Store. 422 \`store_error\` with \`retryable: true\` while the store cannot be reached.`,
      responses: {
        200: ok("The store's products. `next_page` is always null: every store page has been read.", {
          allOf: [listOf(storeListing), obj({ app_id: str(), store: en(["app_store", "mac_app_store", "play_store", "stripe", "paddle", "galaxy"]), warnings: arr(str(), { description: "Set when a store had more products than RevenueDot reads at once (5,000)." }) }, ["app_id", "store", "warnings"])],
        }, {
          object: "list", next_page: null, url: "/v2/projects/proj18pzzkao/apps/app1a2b3c4d/store_products", app_id: "app1a2b3c4d", store: "app_store", warnings: [],
          items: [
            { object: "store_product_listing", store_identifier: "pro_monthly", type: "subscription", display_name: "Pro Monthly", duration: "P1M", store_state: "APPROVED", group: { id: "21000001", name: "Pro" }, price: null, importable: true, note: null, in_catalog: true, product_id: "prod1a2b3c4d5e" },
            { object: "store_product_listing", store_identifier: "pro_annual", type: "subscription", display_name: "Pro Annual", duration: "P1Y", store_state: "APPROVED", group: { id: "21000001", name: "Pro" }, price: null, importable: true, note: null, in_catalog: false, product_id: null },
            { object: "store_product_listing", store_identifier: "coins_100", type: "consumable", display_name: "100 coins", duration: null, store_state: "APPROVED", group: null, price: null, importable: true, note: null, in_catalog: false, product_id: null },
          ],
        }),
        ...v2Errors(401, 403, 404, 422),
      } }),
  },
  [`${P}/apps/{app_id}/store_products/actions/import`]: {
    post: op({ id: "importStoreProducts", tag: "Apps", summary: "Import products from the app's store", security: SECRET, source: IMPORT, scopes: ["project_configuration:products:read_write"], parameters: [project, param("AppId")], extension: true,
      description: `
Creates catalog products for the chosen store identifiers. The store is read again, so the type, duration and display name always come from the store. Products already in the catalog are left as they are and reported in \`existing\`; identifiers the store does not have, or cannot be imported, are reported in \`failed\`. Every created and existing product is attached to the \`entitlement_ids\`. With \`entitlement_ids\`, an API key also needs \`project_configuration:entitlements:read_write\`. Running the same import twice changes nothing. Flat-rate Stripe prices also become web products, so the web checkout can sell them.

201 when at least one product was created, else 200. Errors as for listing; 400 for an \`entitlement_ids\` entry that is not an entitlement of the project.`,
      requestBody: body(obj({
        store_identifiers: arr(str(undefined, { minLength: 1, maxLength: 255 }), { minItems: 1, maxItems: 1000, description: "`store_identifier` values from the list." }),
        entitlement_ids: arr(str(), { maxItems: 50, description: "Entitlements to attach the products to. Optional." }),
      }, ["store_identifiers"]), { store_identifiers: ["pro_annual", "coins_100"], entitlement_ids: ["entl1a2b3c4d5e"] }),
      responses: {
        200: ok("Nothing new was created.", ref("StoreProductImport")),
        201: ok("Products were created.", ref("StoreProductImport"), {
          object: "store_product_import", app_id: "app1a2b3c4d", entitlement_ids: ["entl1a2b3c4d5e"],
          created: [{ object: "product", id: "prod9f8e7d6c5b4a3b", store_identifier: "pro_annual", type: "subscription", state: "active", created_at: 1790800914034, app_id: "app1a2b3c4d", display_name: "Pro Annual", subscription: { duration: "P1Y" } }],
          existing: [], failed: [{ store_identifier: "coins_100", reason: "not_in_store", message: "coins_100 was not found in the store for this app." }],
        }),
        ...v2Errors(400, 401, 403, 404, 422),
      } }),
  },

  // ---- RevenueCat Billing invoices: answered on purpose (discounts are real, in web.mjs) ------------------------------
  [`${P}/customers/{customer_id}/invoices`]: {
    get: op({ id: "listCustomerInvoices", tag: "Invoices", summary: "List a customer's invoices", security: SECRET, source: BILLING, scopes: ["customer_information:invoices:read"], parameters: [project, customer, ...page],
      description: `Always an empty list for a known customer; 404 for an unknown one. ${why}`, responses: { 200: empty("/v2/projects/proj18pzzkao/customers/user_1/invoices"), ...v2Errors(401, 403, 404) } }),
  },
  [`${P}/customers/{customer_id}/invoices/{invoice_id}/file`]: {
    get: op({ id: "getInvoiceFile", tag: "Invoices", summary: "Download an invoice", security: SECRET, source: BILLING, scopes: ["customer_information:invoices:read"], parameters: [project, customer, { name: "invoice_id", in: "path", required: true, schema: str() }],
      description: `Answers 404 \`resource_missing\`: there is no invoice. ${why}`, responses: { ...v2Errors(401, 403, 404) } }),
  },
};

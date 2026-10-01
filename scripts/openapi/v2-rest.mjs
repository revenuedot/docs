// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the last operations of RevenueCat's v2 API (restore by order id, create in store, subscriber tokens), the
// RevenueCat Billing operations RevenueDot answers on purpose (discounts, invoices), and the win-back eligibility extension.
// Docs: https://revenuedot.app/docs/api/rest-v2   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { SECRET, arr, body, en, int, listOf, nstr, obj, ok, op, param, ref, str, v2Errors, nms } from "./common.mjs";

const P = "/v2/projects/{project_id}";
const project = param("ProjectId");
const customer = param("CustomerId");
const page = [param("Limit"), param("StartingAfter")];
const OPS = "routes/v2/store-ops.ts";
const AUTH = "routes/v2/subscriber-auth.ts";
const BILLING = "routes/v2/billing-excluded.ts";
const productId = { name: "product_id", in: "path", required: true, schema: str(), description: "Product id (prod...)." };
const discountId = { name: "discount_id", in: "path", required: true, schema: str(), description: "Discount id." };
const why = "RevenueDot does not have RevenueCat Billing (Web Billing), the billing engine these objects belong to, so it never has any.";
const empty = (url) => ok("Always an empty list.", listOf({ type: "object" }), { object: "list", items: [], next_page: null, url });
const notAvailable = (summary, id, scopes, extra = {}) => op({
  id, tag: "Discounts and invoices", summary, security: SECRET, source: BILLING, scopes, parameters: [project, ...(extra.parameters ?? [])],
  description: `Answers 422 \`unprocessable_entity_error\`. ${why} No body is read.`,
  responses: { ...v2Errors(401, 403, 422) },
});
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

  // ---- RevenueCat Billing only: answered on purpose ----------------------------------------------------------------
  [`${P}/discounts`]: {
    get: op({ id: "listDiscounts", tag: "Discounts and invoices", summary: "List discounts", security: SECRET, source: BILLING, scopes: ["project_configuration:discounts:read"], parameters: [project, ...page],
      description: `Always an empty list. ${why}`, responses: { 200: empty("/v2/projects/proj18pzzkao/discounts"), ...v2Errors(401, 403) } }),
    post: notAvailable("Create a discount", "createDiscount", ["project_configuration:discounts:read_write"]),
  },
  [`${P}/discounts/{discount_id}`]: {
    get: op({ id: "getDiscount", tag: "Discounts and invoices", summary: "Get a discount", security: SECRET, source: BILLING, scopes: ["project_configuration:discounts:read"], parameters: [project, discountId],
      description: `Answers 404 \`resource_missing\`: there is no discount. ${why}`, responses: { ...v2Errors(401, 403, 404) } }),
    patch: notAvailable("Update a discount", "updateDiscount", ["project_configuration:discounts:read_write"], { parameters: [discountId] }),
    delete: notAvailable("Delete a discount", "deleteDiscount", ["project_configuration:discounts:read_write"], { parameters: [discountId] }),
  },
  [`${P}/discounts/{discount_id}/actions/enable`]: { post: notAvailable("Enable a discount", "enableDiscount", ["project_configuration:discounts:read_write"], { parameters: [discountId] }) },
  [`${P}/discounts/{discount_id}/actions/disable`]: { post: notAvailable("Disable a discount", "disableDiscount", ["project_configuration:discounts:read_write"], { parameters: [discountId] }) },
  [`${P}/discounts/{discount_id}/discount_codes`]: {
    get: op({ id: "listDiscountCodes", tag: "Discounts and invoices", summary: "List a discount's codes", security: SECRET, source: BILLING, scopes: ["project_configuration:discounts:read"], parameters: [project, discountId, ...page],
      description: `Answers 404 \`resource_missing\`: there is no discount. ${why}`, responses: { ...v2Errors(401, 403, 404) } }),
    post: notAvailable("Create discount codes", "createDiscountCodes", ["project_configuration:discounts:read_write"], { parameters: [discountId] }),
  },
  [`${P}/discounts/{discount_id}/discount_codes/{discount_code}`]: {
    delete: notAvailable("Delete a discount code", "deleteDiscountCode", ["project_configuration:discounts:read_write"], { parameters: [discountId, { name: "discount_code", in: "path", required: true, schema: str() }] }),
  },
  [`${P}/customers/{customer_id}/invoices`]: {
    get: op({ id: "listCustomerInvoices", tag: "Discounts and invoices", summary: "List a customer's invoices", security: SECRET, source: BILLING, scopes: ["customer_information:invoices:read"], parameters: [project, customer, ...page],
      description: `Always an empty list for a known customer; 404 for an unknown one. ${why}`, responses: { 200: empty("/v2/projects/proj18pzzkao/customers/user_1/invoices"), ...v2Errors(401, 403, 404) } }),
  },
  [`${P}/customers/{customer_id}/invoices/{invoice_id}/file`]: {
    get: op({ id: "getInvoiceFile", tag: "Discounts and invoices", summary: "Download an invoice", security: SECRET, source: BILLING, scopes: ["customer_information:invoices:read"], parameters: [project, customer, { name: "invoice_id", in: "path", required: true, schema: str() }],
      description: `Answers 404 \`resource_missing\`: there is no invoice. ${why}`, responses: { ...v2Errors(401, 403, 404) } }),
  },
};

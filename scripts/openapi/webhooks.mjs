// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the webhook events (OpenAPI `webhooks`) with example payloads recorded from a RevenueDot server.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { readFileSync } from "node:fs";
import { arr, bool, en, int, nstr, num, obj, ok, str } from "./common.mjs";

const EXAMPLES = JSON.parse(readFileSync(new URL("./webhook-examples.json", import.meta.url), "utf8"));

const STORES = ["APP_STORE", "MAC_APP_STORE", "PLAY_STORE", "AMAZON", "STRIPE", "RC_BILLING", "PROMOTIONAL", "TEST_STORE", "PADDLE", "ROKU", "EXTERNAL"];

/** Fields of every lifecycle event (and TEST), per apps/server/src/services/events.ts. */
const lifecycle = {
  id: str("Unique event id (upper-case UUID). Deduplicate on it."),
  type: str("Event type."),
  event_timestamp_ms: int("When RevenueDot recorded the event. Epoch milliseconds."),
  app_id: str("RevenueDot app id. Left out for promotional grants."),
  app_user_id: str("The app user id the event is about (a non-anonymous alias when there is one)."),
  original_app_user_id: str("The customer's first app user id."),
  aliases: arr(str(), { description: "Every app user id of the customer." }),
  product_id: str("Store product id. For PRODUCT_CHANGE, the product the customer changed from."),
  period_type: en(["NORMAL", "TRIAL", "INTRO", "PROMOTIONAL", "PREPAID"]),
  purchased_at_ms: int("Start of the period. Epoch milliseconds."),
  expiration_at_ms: { type: ["integer", "null"], description: "End of the period, or null for lifetime. Epoch milliseconds." },
  environment: en(["PRODUCTION", "SANDBOX"]),
  entitlement_id: { type: "null", description: "Always null (deprecated in RevenueCat's payload)." },
  entitlement_ids: { type: ["array", "null"], items: str(), description: "Lookup keys of the entitlements the product unlocks, or null." },
  presented_offering_id: nstr("Offering the purchase was made from, when the SDK sent it."),
  transaction_id: nstr("Store transaction id of this period."),
  original_transaction_id: nstr("First transaction id of the subscription."),
  is_family_share: bool(),
  country_code: nstr("ISO 3166-1 alpha-2."),
  currency: nstr("ISO 4217."),
  price: { type: ["number", "null"], description: "USD. Money moved only on INITIAL_PURCHASE, RENEWAL, NON_RENEWING_PURCHASE, REFUND_REVERSED and refunds (negative); 0 on other events." },
  price_in_purchased_currency: { type: ["number", "null"], description: "Same as price, in `currency`." },
  subscriber_attributes: { type: "object", additionalProperties: obj({ value: nstr(), updated_at_ms: int() }) },
  store: en(STORES),
  takehome_percentage: num("1 minus the estimated store commission."),
  tax_percentage: num("Always 0 today."),
  commission_percentage: num("Estimated store commission (0.3 for App Store and Google Play, 0 for Test Store)."),
  offer_code: { type: "null" },
};

const payload = (props, required) => ({
  type: "object", required: ["api_version", "event"],
  properties: { api_version: { type: "string", const: "1.0" }, event: obj(props, required) },
});

const lifecycleRequired = ["id", "type", "event_timestamp_ms", "app_user_id", "original_app_user_id", "aliases", "product_id", "period_type", "purchased_at_ms", "environment", "store"];

const EVENTS = [
  ["INITIAL_PURCHASE", "The first purchase of a subscription, including a free trial start.", {}],
  ["RENEWAL", "A new paid period: a renewal, a trial converting (`is_trial_conversion: true`), a lapsed customer resubscribing, or a recovered billing issue.", { is_trial_conversion: bool("True for the first paid period after a free trial.") }],
  ["CANCELLATION", "Auto-renew was turned off, or the purchase was refunded. Access continues to `expiration_at_ms` unless it was a refund. A refund has `cancel_reason: CUSTOMER_SUPPORT` and a negative price.", { cancel_reason: en(["UNSUBSCRIBE", "BILLING_ERROR", "DEVELOPER_INITIATED", "PRICE_INCREASE", "CUSTOMER_SUPPORT", "UNKNOWN"]) }],
  ["UNCANCELLATION", "Auto-renew was turned back on before the subscription expired.", {}],
  ["NON_RENEWING_PURCHASE", "A one-time purchase: consumable, non-consumable or lifetime.", {}],
  ["SUBSCRIPTION_PAUSED", "A Google Play subscription is scheduled to pause. It will not renew at the end of the period.", { auto_resume_at_ms: { type: ["integer", "null"], description: "When it resumes. Epoch milliseconds." } }],
  ["EXPIRATION", "Access ended: the period ran out, billing retry gave up or the subscription paused.", { expiration_reason: en(["UNSUBSCRIBE", "BILLING_ERROR", "DEVELOPER_INITIATED", "PRICE_INCREASE", "CUSTOMER_SUPPORT", "UNKNOWN", "SUBSCRIPTION_PAUSED"]) }],
  ["BILLING_ISSUE", "A renewal charge failed. The store retries; access may continue in a grace period.", { grace_period_expiration_at_ms: { type: ["integer", "null"], description: "End of the grace period, or null when there is none. Epoch milliseconds." } }],
  ["PRODUCT_CHANGE", "The customer changed product: an upgrade now, or a downgrade or crossgrade scheduled for the next renewal. `product_id` is the old product.", { new_product_id: str("The product the customer changed to.") }],
  ["SUBSCRIPTION_EXTENDED", "The current period got longer without a new payment: an App Store renewal extension or a Google Play deferral.", {}],
  ["REFUND_REVERSED", "A refund was reversed and access is back.", {}],
  ["PRICE_INCREASE_CONSENT_REQUIRED", "The store asks the customer to accept a price increase.", null],
  ["PRICE_INCREASE_CONSENT_APPROVED", "The customer accepted the price increase.", null],
  ["TRANSFER", "A purchase moved to another customer because that customer restored it (transfer behaviour `transfer` or `transfer_if_no_active`).", "transfer"],
  ["VIRTUAL_CURRENCY_TRANSACTION", "An in-app currency was credited because a purchase of a granting product was recorded. Not sent for adjustments made through the API.", "vc"],
  ["EXPERIMENT_ENROLLMENT", "A customer was enrolled in an offering experiment. Sent once per customer and experiment.", "experiment"],
  ["TEST", "Sent by the dashboard's \"Send test event\" or `POST .../integrations/webhooks/{id}/test`. Shaped like a purchase.", {}],
];

/** Accepted in a webhook's `event_types` filter, never sent by RevenueDot yet. */
export const NOT_SENT = ["TEMPORARY_ENTITLEMENT_GRANT", "INVOICE_ISSUANCE", "PURCHASE_REDEEMED", "SUBSCRIBER_ALIAS"];

const headers = {
  "X-RevenueCat-Webhook-Signature": { required: true, schema: str(), description: "`t=<unix seconds>,v1=<hex HMAC-SHA256 of \"<t>.<raw body>\" with the webhook's signing secret>`. Signed again on every attempt.", example: "t=1790800914,v1=0a1552334e825926036f7efe21527800ea45caa63eca523c6120c6da9041ef99" },
  Authorization: { required: false, schema: str(), description: "The webhook's `authorization_header`, verbatim, when you set one." },
};

const webhookOp = (type, description, props, example) => ({
  post: {
    operationId: `webhook${type.split("_").map((w) => w[0] + w.slice(1).toLowerCase()).join("")}`,
    tags: ["Webhook events"],
    summary: type,
    description,
    parameters: Object.entries(headers).map(([name, h]) => ({ name, in: "header", ...h })),
    requestBody: { required: true, content: { "application/json": { schema: props, example } } },
    responses: { 200: { description: "Only HTTP 200 counts as delivered. Anything else, or no answer within 60 seconds, is retried after 5, 10, 20, 40 and 80 minutes." } },
    "x-source": "services/events.ts",
  },
});

export const webhooks = {};
for (const [type, description, extra] of EVENTS) {
  let schema;
  if (extra === "transfer") {
    schema = payload({
      id: lifecycle.id, type: lifecycle.type, event_timestamp_ms: lifecycle.event_timestamp_ms, app_id: lifecycle.app_id, store: lifecycle.store, environment: lifecycle.environment,
      transferred_from: arr(str(), { description: "App user ids of the previous owner." }), transferred_to: arr(str(), { description: "App user ids of the new owner." }), subscriber_attributes: lifecycle.subscriber_attributes,
    }, ["id", "type", "event_timestamp_ms", "store", "environment", "transferred_from", "transferred_to"]);
  } else if (extra === "vc") {
    schema = payload({
      id: lifecycle.id, type: lifecycle.type, event_timestamp_ms: lifecycle.event_timestamp_ms, app_id: lifecycle.app_id, app_user_id: lifecycle.app_user_id, aliases: lifecycle.aliases, store: lifecycle.store,
      adjustments: arr(obj({ amount: int("Credited amount."), currency: obj({ code: str(), name: str(), description: nstr() }, ["code", "name"]) }, ["amount", "currency"])),
      product_id: lifecycle.product_id, product_display_name: str("The product's display name."), purchase_environment: en(["PRODUCTION", "SANDBOX"]), source: en(["in_app_purchase"]),
      transaction_id: lifecycle.transaction_id, virtual_currency_transaction_id: str("Starts with vatx."), subscriber_attributes: lifecycle.subscriber_attributes,
    }, ["id", "type", "event_timestamp_ms", "app_user_id", "adjustments", "product_id", "source", "store"]);
  } else if (extra === "experiment") {
    schema = payload({
      id: lifecycle.id, type: lifecycle.type, event_timestamp_ms: lifecycle.event_timestamp_ms, app_user_id: lifecycle.app_user_id, original_app_user_id: lifecycle.original_app_user_id, aliases: lifecycle.aliases,
      experiment_id: str(), experiment_variant: en(["a", "b"]), offering_id: { type: ["string", "null"], description: "The variant's offering identifier." }, experiment_enrolled_at_ms: int("Epoch milliseconds."),
    }, ["id", "type", "event_timestamp_ms", "app_user_id", "experiment_id", "experiment_variant"]);
  } else if (extra === null) {
    const pick = ["id", "type", "event_timestamp_ms", "app_id", "app_user_id", "original_app_user_id", "aliases", "product_id", "transaction_id", "original_transaction_id", "store", "environment", "currency", "country_code", "subscriber_attributes"];
    schema = payload(Object.fromEntries(pick.map((k) => [k, lifecycle[k]])), ["id", "type", "event_timestamp_ms", "app_user_id", "product_id", "store", "environment"]);
  } else {
    schema = payload({ ...lifecycle, ...extra }, lifecycleRequired);
  }
  webhooks[type] = webhookOp(type, description, schema, { api_version: "1.0", event: EXAMPLES[type] });
}
webhooks.CANCELLATION.post.requestBody.content["application/json"].examples = {
  unsubscribe: { summary: "Auto-renew turned off", value: { api_version: "1.0", event: EXAMPLES.CANCELLATION } },
  refund: { summary: "Refund", value: { api_version: "1.0", event: EXAMPLES.CANCELLATION_REFUND } },
};
delete webhooks.CANCELLATION.post.requestBody.content["application/json"].example;

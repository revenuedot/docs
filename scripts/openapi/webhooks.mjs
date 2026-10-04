// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the webhook events (OpenAPI `webhooks`) with example payloads recorded from a RevenueDot server.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { readFileSync } from "node:fs";
import { arr, bool, en, int, nint, nstr, num, obj, ok, str } from "./common.mjs";

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
  offer_code: nstr("The App Store or Google Play offer id of this period (a promotional offer, offer code, win-back offer or Google offer), or null. See [Win-back offers](../docs/guides/win-back-offers.md)."),
  experiments: arr(obj({ experiment_id: str(), experiment_variant: en(["a", "b", "c", "d"]), enrolled_at_ms: int("Epoch milliseconds.") }, ["experiment_id", "experiment_variant", "enrolled_at_ms"]), { description: "Every offering experiment the customer joined. Left out when there are none. See [Experiments](../docs/guides/experiments.md#webhooks)." }),
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
  ["VIRTUAL_CURRENCY_TRANSACTION", "An in-app currency was credited because a purchase of a granting product was recorded (`source: in_app_purchase`), or because a rewarded ad was verified and a reward rule granted currency (`source: ad_reward`, a RevenueDot extension; `product_id` and `store` are null and `transaction_id` is the ad network's transaction id). Not sent for adjustments made through the API.", "vc"],
  ["EXPERIMENT_ENROLLMENT", "A customer joined an offering experiment: the first offerings request that enrolled them. Its `app_user_id` is the id that asked for offerings. Sent once per customer and experiment, as a production event with no app, so a webhook set to sandbox only or to one app does not get it. See [Experiments](../docs/guides/experiments.md#webhooks).", "experiment"],
  ["SUBSCRIBER_ALIAS", "A new app user id joined an existing customer: `logIn` onto an anonymous customer, `logIn` that merged an anonymous customer into an existing one, Android's alias call, or a restore that merged two customers. RevenueCat deprecated this event and sends it only to older projects, so RevenueDot delivers it only to webhooks whose `event_types` filter names `subscriber_alias`; it always appears in the customer's event history.", "alias"],
  ["PURCHASE_REDEEMED", "A web purchase was redeemed in the app through a redemption link (`POST /v1/subscribers/redeem_purchase`): the anonymous customer who paid on the web was merged into the app user. Fields follow RevenueCat's sample; `app_user_id` is added so analytics tools know who it is. See [Redemption links](../docs/guides/redemption-links.md).", "redeemed"],
  ["FUNNEL_VIEWED", "RevenueDot type. A visitor opened a published funnel. Opt-in: sent only to webhooks and integrations whose `event_types` names `funnel_viewed`. `app_user_id` is null unless the page URL had `?app_user_id=`. See [Funnels](../docs/guides/funnels.md).", "funnel"],
  ["FUNNEL_STEP_COMPLETED", "RevenueDot type. A visitor finished a funnel step, with the answer for a question (an email step's answer is `provided`, never the address). Opt-in: `funnel_step_completed`.", "funnel"],
  ["FUNNEL_PURCHASE", "RevenueDot type. A funnel's checkout was paid. `app_user_id` is the buyer's (anonymous unless the page had one) and `product_id` the Stripe price. Opt-in: `funnel_purchase`.", "funnel"],
  ["PAYWALL_IMPRESSION", "A paywall was shown (RevenueDot type; the SDK reports it to `POST /v1/events`). Opt-in: sent only to webhooks and integrations whose `event_types` names `paywall_impression`. RevenueCat sends paywall events to Amplitude, Mixpanel, PostHog and Segment only, not to webhooks. See [Integrations](../docs/guides/integrations.md#paywall-events).", "paywall"],
  ["PAYWALL_CLOSE", "The customer closed a paywall. Opt-in: `paywall_close`.", "paywall"],
  ["PAYWALL_CANCEL", "The customer dismissed the store's payment sheet on a paywall. Opt-in: `paywall_cancel`.", "paywall"],
  ["PAYWALL_EXIT_OFFER", "An exit offer was shown when the customer left a paywall. Opt-in: `paywall_exit_offer`.", "paywall"],
  ["PAYWALL_COMPONENT_INTERACTED", "The customer changed a paywall control: a tab, package, button or sheet. Opt-in: `paywall_component_interacted`.", "paywall"],
  ["PAYWALL_PURCHASE_INITIATED", "The customer started a purchase from a paywall. A RevenueDot addition: RevenueCat does not forward it. Opt-in: `paywall_purchase_initiated`.", "paywall"],
  ["PAYWALL_PURCHASE_ERROR", "A purchase started from a paywall failed. A RevenueDot addition: RevenueCat does not forward it. Opt-in: `paywall_purchase_error`.", "paywall"],
  ["TEST", "Sent by the dashboard's \"Send test event\" or `POST .../integrations/webhooks/{id}/test`. Shaped like a purchase, for no real customer, so it never carries `experiments`.", {}],
];

/**
 * Accepted in a webhook's `event_types` filter, never sent, because RevenueDot never has the fact behind them: it never
 * grants unverified access during a store outage, and has no billing engine issuing invoices.
 */
export const NOT_SENT = ["TEMPORARY_ENTITLEMENT_GRANT", "INVOICE_ISSUANCE"];

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
      id: lifecycle.id, type: lifecycle.type, event_timestamp_ms: lifecycle.event_timestamp_ms, app_id: lifecycle.app_id, app_user_id: lifecycle.app_user_id, aliases: lifecycle.aliases, store: { ...lifecycle.store, type: ["string", "null"], enum: [...lifecycle.store.enum, null], description: "Null for an ad reward." },
      adjustments: arr(obj({ amount: int("Credited amount."), currency: obj({ code: str(), name: str(), description: nstr() }, ["code", "name"]) }, ["amount", "currency"])),
      product_id: { ...lifecycle.product_id, type: ["string", "null"], description: "The granting product, or null for an ad reward." }, product_display_name: nstr("The product's display name, or null for an ad reward."), purchase_environment: en(["PRODUCTION", "SANDBOX"]),
      source: en(["in_app_purchase", "ad_reward"], "`ad_reward` is a RevenueDot extension: RevenueCat documents no source value for rewarded ads."),
      transaction_id: lifecycle.transaction_id, virtual_currency_transaction_id: str("Starts with vatx."), subscriber_attributes: lifecycle.subscriber_attributes,
    }, ["id", "type", "event_timestamp_ms", "app_user_id", "adjustments", "product_id", "source", "store"]);
  } else if (extra === "experiment") {
    schema = payload({
      id: lifecycle.id, type: lifecycle.type, event_timestamp_ms: lifecycle.event_timestamp_ms, app_user_id: lifecycle.app_user_id, original_app_user_id: lifecycle.original_app_user_id, aliases: lifecycle.aliases,
      experiment_id: str(), experiment_variant: en(["a", "b", "c", "d"], "`a` is the control; `b`, `c` and `d` are treatments."), offering_id: { type: ["string", "null"], description: "The variant's offering identifier." }, experiment_enrolled_at_ms: int("Epoch milliseconds."),
    }, ["id", "type", "event_timestamp_ms", "app_user_id", "experiment_id", "experiment_variant"]);
  } else if (extra === "alias") {
    schema = payload({
      id: lifecycle.id, type: lifecycle.type, event_timestamp_ms: lifecycle.event_timestamp_ms, app_id: lifecycle.app_id, app_user_id: str("The app user id the app uses now."),
      original_app_user_id: lifecycle.original_app_user_id, aliases: lifecycle.aliases, subscriber_attributes: lifecycle.subscriber_attributes, experiments: lifecycle.experiments,
    }, ["id", "type", "event_timestamp_ms", "app_user_id", "original_app_user_id", "aliases"]);
  } else if (extra === "redeemed") {
    schema = payload({
      id: lifecycle.id, type: lifecycle.type, event_timestamp_ms: lifecycle.event_timestamp_ms, app_id: str("The Stripe app the purchase was made through."), store: en(["STRIPE"]), environment: lifecycle.environment,
      redeemed_from: arr(str(), { description: "The anonymous web buyer's app user id." }), redeemed_by: arr(str(), { description: "The app user id that redeemed it." }),
      redemption_outcome: en(["alias"], "The web customer was merged into the app user."), redemption_platform: nstr("From the SDK's X-Platform header: ios, android, web ..."),
      product_id: nstr("The web product's store identifier (the Stripe price id)."), entitlement_ids: { type: ["array", "null"], items: str(), description: "Entitlements the product unlocks, or null." },
      workflow_id: nstr("The funnel id when the purchase came from a funnel, else null."), workflow_step_id: { type: "null" }, trace_id: str("The web checkout id (wco_...)."),
      app_user_id: str("The app user id that redeemed it. A RevenueDot addition to RevenueCat's sample."),
    }, ["id", "type", "event_timestamp_ms", "store", "environment", "redeemed_from", "redeemed_by", "redemption_outcome", "app_user_id"]);
  } else if (extra === "funnel") {
    schema = payload({
      id: lifecycle.id, type: lifecycle.type, event_timestamp_ms: lifecycle.event_timestamp_ms, app_id: nstr("The funnel's Stripe app."), app_user_id: nstr("The visitor's app user id, when known."), aliases: lifecycle.aliases,
      environment: en(["PRODUCTION", "SANDBOX"], "SANDBOX when the Stripe app uses a test-mode key."), store: en(["STRIPE"]), funnel_id: str(), funnel_name: str(), funnel_slug: str(), session_id: str("The page session; one per visit."),
      step_id: nstr(), step_type: { type: ["string", "null"], enum: ["question", "info", "email", "paywall", "success", null] }, step_index: nint("0-based position of the step."),
      answer: { description: "FUNNEL_STEP_COMPLETED of a question: the answer, or a list for multiple choice. Otherwise null.", oneOf: [str(), arr(str()), { type: "null" }] },
      product_id: str("FUNNEL_PURCHASE only: the Stripe price id."), subscriber_attributes: { type: "object", description: "Always empty." },
      revenue_usd: num("FUNNEL_PURCHASE only: what the buyer paid, in US dollars."), currency: en(["USD"], "FUNNEL_PURCHASE only: the currency of `revenue_usd`."),
      click_ids: obj({ fbclid: str(), gclid: str(), gbraid: str(), wbraid: str(), ttclid: str(), msclkid: str() }, [], { description: "The ad click ids from the landing page's URL, when it had any. Checkouts and purchases take them from the visit's first page view while an integration asks for funnel events." }),
      client_ip: str("The visitor's IP address, for Meta and Branch: only while one of them (enabled) has a funnel event type in its filter; otherwise no visitor IP is stored. Deleted after 7 days. Never for a visitor with Global Privacy Control on."),
      client_user_agent: str("The visitor's browser user agent. Same conditions as `client_ip`."),
      page_url: str("The funnel page's address, without its query. While any enabled integration (not a webhook) has a funnel event type in its filter; not for a visitor with Global Privacy Control on."),
    }, ["id", "type", "event_timestamp_ms", "environment", "store", "funnel_id", "funnel_name", "session_id"]);
    schema.properties.event.additionalProperties = { type: "string", description: "The page's `utm_*` query parameters, such as `utm_source`." };
  } else if (extra === "paywall") {
    const s = (d) => str(d), n = (d) => int(d);
    schema = payload({
      id: str("A UUID derived from the project and the SDK's event id, so a batch the SDK sends again is not delivered twice."), type: lifecycle.type, event_timestamp_ms: lifecycle.event_timestamp_ms,
      app_id: lifecycle.app_id, app_user_id: lifecycle.app_user_id, original_app_user_id: lifecycle.original_app_user_id, aliases: lifecycle.aliases,
      environment: en(["PRODUCTION", "SANDBOX"], "SANDBOX for TestFlight, Xcode and Test Store builds."), store: str("The app's store: APP_STORE, PLAY_STORE, TEST_STORE ..."),
      paywall_id: s("The paywall's id."), paywall_name: s("The paywall's name, when it has one."), paywall_revision: n(), offering_id: s(), session_id: s("One per time the paywall is shown."),
      display_mode: s("full_screen, sheet, condensed_footer ..."), dark_mode: bool(), locale: s(), source: s(),
      placement_identifier: s(), targeting_revision: n(), targeting_rule_id: s(), workflow_id: s(),
      exit_offer_type: s("PAYWALL_EXIT_OFFER: `dismiss`."), exit_offering_id: s("PAYWALL_EXIT_OFFER: the offering shown."),
      package_id: s("PAYWALL_PURCHASE_*: the package."), product_id: s("PAYWALL_PURCHASE_*: the product."), error_code: n("PAYWALL_PURCHASE_ERROR."), error_message: s("PAYWALL_PURCHASE_ERROR."),
      component_type: s("PAYWALL_COMPONENT_INTERACTED: tab, package, purchase_button, sheet ..."), component_name: s(), component_value: s(), component_url: s(),
      origin_index: n(), destination_index: n(), default_index: n(), origin_context_name: s(), destination_context_name: s(),
      origin_package_id: s(), destination_package_id: s(), default_package_id: s(), origin_product_id: s(), destination_product_id: s(), default_product_id: s(),
      current_package_id: s(), resulting_package_id: s(), current_product_id: s(), resulting_product_id: s(),
      sdk_version: s("The customer's last SDK version."), platform_version: s("The customer's last OS version."), subscriber_attributes: lifecycle.subscriber_attributes,
    }, ["id", "type", "event_timestamp_ms", "environment", "subscriber_attributes"]);
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

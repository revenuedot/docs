// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: Lifecycle (Refund Control, Retention, Support, Win-back) and Customers lists in the OpenAPI document. All are RevenueDot extensions.
// Docs: https://revenuedot.app/docs/guides/refund-control   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { NONE, SECRET, arr, body, bool, en, int, listOf, ms, nint, nms, nstr, num, obj, ok, op, param, ref, str, v2Errors } from "./common.mjs";

const P = "/v2/projects/{project_id}";
const project = param("ProjectId");
const page = [param("Limit"), param("StartingAfter")];
const E = (...c) => v2Errors(401, 403, ...c);
const PR = ["project_configuration:projects:read"], PW = ["project_configuration:projects:read_write"];
const CR = ["customer_information:customers:read"], CW = ["customer_information:customers:read_write"];
const AR = ["project_configuration:apps:read"], AW = ["project_configuration:apps:read_write"];
const id = (name) => ({ name, in: "path", required: true, schema: str() });

const condition = obj({ field: str("A customer field, as in audiences (`country`, `platform`, `firstPurchaseAt`, `lastRenewalAt`, `customAttribute:<key>` ...)."), operator: str(), value: str() }, ["field", "operator"]);
const rules = obj({ groups: arr(obj({ conditions: arr(condition) }, ["conditions"]), { description: "Groups are OR-ed; conditions in a group are AND-ed. No groups matches everyone." }) }, ["groups"]);
const PREF = ["prefer_refund", "prefer_no_refund", "consumption_only", "do_not_respond"];
const preference = en(PREF, "`prefer_refund` sends refundPreference 1, `prefer_no_refund` 2, `consumption_only` 0 (undeclared), `do_not_respond` sends nothing.");
const settings = obj({ default_preference: preference, customer_consented: bool("You confirm customers agreed to share consumption data. Apple requires it; without it nothing is sent.") });
const policy = obj({
  object: en(["refund_policy"]), id: str(), name: str(), template: en(["first_purchase_date", "platform", "recent_renewal", "custom"]), rules, preference,
  position: int("0 is evaluated first."), customer_count: int("Customers this policy decides for (first match wins), among the 10,000 most recently seen."), created_at: ms("Created."), updated_at: nms("Updated."),
});
const refundControl = obj({
  object: en(["refund_control"]), settings, default_policy: obj({ customer_count: int() }), policies: arr(policy),
  templates: { type: "object", additionalProperties: rules, description: "The conditions each template starts with." }, counts_are_approximate: bool(),
}, ["object", "settings", "policies"]);
const consumption = obj({
  accountTenure: int(), appAccountToken: str(), consumptionStatus: int(), customerConsented: bool(), deliveryStatus: int(), lifetimeDollarsPurchased: int(),
  lifetimeDollarsRefunded: int(), platform: int(), playTime: int(), refundPreference: int(), sampleContentProvided: bool(), userStatus: int(),
}, [], { description: "Apple's ConsumptionRequestV1 exactly as sent." });
const refundRequest = obj({
  object: en(["refund_request"]), id: str(), app_id: nstr(), app_user_id: nstr(), store: str(), environment: en(["production", "sandbox"]),
  transaction_id: str(), original_transaction_id: nstr(), product_id: nstr(), amount_in_usd: { type: ["number", "null"] }, reason: nstr("Apple's consumptionRequestReason, or how a refund arrived."),
  requested_at: ms("Requested."), deadline_at: nms("Apple's 12-hour deadline."), policy_id: nstr(), policy_name: nstr(), preference: nstr(),
  consumption_status: en(["pending", "sent", "skipped", "failed", "expired", "not_requested", "not_applicable"]), consumption: { ...consumption, type: ["object", "null"] },
  attempts: int(), last_error: nstr(), sent_at: nms("Sent to Apple."), outcome: en(["pending", "approved", "declined"]), outcome_at: nms("Decided."),
});
const stats = obj({
  object: en(["refund_control_stats"]), days: int(), environment: en(["production", "sandbox"]), refund_rate: { type: ["number", "null"], description: "Approved ÷ (approved + declined)." },
  requests: obj({ approved: int(), declined: int(), pending: int(), total: int() }), amount_in_usd: obj({ approved: num(), declined: num(), pending: num() }),
  consumption: { type: "object", additionalProperties: { type: "integer" }, description: "Requests per answer status." },
});

const offer = obj({
  object: en(["retention_offer"]), id: str(), trigger: en(["cancel", "refund"]), name: str(), title: str(), subtitle: str(), store: en(["app_store", "play_store"]),
  product_mapping: { type: "object", additionalProperties: { type: "string" }, description: "Store product id → store offer id." }, active: bool(), created_at: ms("Created."), updated_at: nms("Updated."),
});
const offerIn = obj({ trigger: en(["cancel", "refund"]), name: str(), title: str(), subtitle: str(), store: en(["app_store", "play_store"]), product_mapping: { type: "object", additionalProperties: { type: "string" } }, active: bool() });
const message = obj({
  id: str("A UUID: Apple's messageIdentifier."), kind: en(["text", "switch_plan", "promotional_offer"]), header: str("Up to 66 characters."), body: str("Up to 144 characters."),
  alternate_product_id: nstr("switch_plan: the product to suggest."), promotional_offer_id: nstr("promotional_offer: the App Store promotional offer id."),
  uploaded: arr(en(["sandbox", "production"]), { description: "Environments Apple accepted the upload in." }), error: nstr(),
}, ["id", "kind", "header", "body"]);
const messaging = obj({
  object: en(["retention_messaging"]), app_id: str(), enabled: bool(), messages: arr(message),
  defaults: arr(obj({ product_id: str(), locale: str(), message_id: str(), configured: arr(str()) })), rules: arr(obj({ product_id: nstr("Null matches any product."), message_id: str() })),
  realtime_url: str("Register this as the Get Retention Message URL (Sync does it)."), realtime_url_configured: { type: "object", additionalProperties: { type: "integer" } },
  stats: obj({ requests: int(), answered: int(), last_request_at: nint(), last_environment: nstr() }), app_apple_id: nstr(), has_in_app_purchase_key: bool(),
  sync: obj({ environment: str(), errors: arr(str()) }),
});

const ticket = obj({
  object: en(["support_ticket"]), id: str(), app_id: nstr(), app_user_id: str(), customer_email: str(), description: str(), status: en(["open", "closed"]),
  emailed_to: nstr("The support address the ticket was emailed to."), emailed: bool(), created_at: ms("Created."), closed_at: nms("Closed."),
});
const summary = obj({
  object: en(["support_summary"]), app_user_id: str(), original_app_user_id: str(), aliases: arr(str()), email: nstr(), display_name: nstr(),
  status: en(["active", "trialing", "expired", "never"]), active_entitlements: arr(str()),
  subscriptions: arr(obj({ product_id: str(), store: str(), environment: str(), active: bool(), period_type: str(), auto_renew: bool(), billing_issue: bool(), purchased_at: ms("Current period start."), expires_at: nms("Ends."), refunded_at: nms("Refunded.") })),
  purchases: arr(obj({ product_id: str(), store: str(), purchased_at: ms("Bought."), refunded_at: nms("Refunded.") })),
  total_spent_in_usd: num(), sandbox_spent_in_usd: num(), first_seen_at: ms("First seen."), last_seen_at: ms("Last seen."), country: nstr(), platform: nstr(), app_version: nstr(),
  refund_requests: arr(obj({ product_id: nstr(), store: str(), outcome: str(), requested_at: ms("Requested.") })), open_tickets: arr(ticket), dashboard_url: str(),
});

const audienceIn = obj({ churned_min_days: int(), churned_max_days: int(), product_ids: arr(str()), stores: arr(str()), audience_id: nstr("A saved audience to narrow to.") }, ["churned_min_days", "churned_max_days"]);
const emailIn = obj({ subject: str(), heading: str(), body: str("Plain text; a blank line starts a paragraph."), button_label: str(), sender_name: nstr("Defaults to the project name.") }, ["subject", "heading", "body", "button_label"]);
const offerLink = obj({ type: en(["store", "url"], "`store`: the App Store's subscriptions page or the Play Store page of the customer's product. `url`: your own https link."), url: nstr() }, ["type"]);
const campaignStats = obj({ sent: int(), failed: int(), opened: int("Only counted with track_opens, and on clicks."), clicked: int(), unsubscribed: int(), reactivated: int("Bought again within 30 days of the email."), reactivated_revenue_in_usd: num() });
const campaign = obj({
  object: en(["winback_campaign"]), id: str(), name: str(), status: en(["draft", "active", "paused"]), audience: audienceIn, email: emailIn, offer: offerLink,
  send_hour_utc: int(), track_opens: bool(), last_run_at: nms("Last sent."), created_at: ms("Created."), updated_at: nms("Updated."), stats: campaignStats,
  recent_sends: arr(obj({ object: str(), id: str(), email: str(), sent_at: ms("Sent."), opened_at: nms("Opened."), clicked_at: nms("Clicked."), unsubscribed_at: nms("Unsubscribed."), error: nstr() }), { description: "On the single campaign only." }),
});
const campaignIn = obj({ name: str(), status: en(["draft", "active", "paused"]), audience: audienceIn, email: emailIn, offer: offerLink, send_hour_utc: int(undefined, { minimum: 0, maximum: 23 }), track_opens: bool() });

const listRow = obj({
  object: en(["customer_list_row"]), id: str("App user ID."), customer_uuid: str(), email: nstr(),
  subscription_status: en(["active", "trialing", "grace_period", "billing_issue", "expired", "none"]), auto_renewal_status: { type: ["string", "null"], enum: ["on", "off", null] },
  first_seen_at: ms("First seen."), last_seen_at: ms("Last seen."), spent_in_usd: num(),
  latest_purchase: { ...obj({ product_id: str(), store: str(), purchased_at: ms("Bought."), environment: str() }), type: ["object", "null"] }, country: nstr(), platform: nstr(),
});
const listQuery = [
  { name: "list", in: "query", schema: str(), description: "`all` (default), `active`, `sandbox`, `non_subscription`, `expired`, or a saved audience id." },
  { name: "rules", in: "query", schema: str(), description: "Extra filter: audience rules as JSON." },
  { name: "search", in: "query", schema: str(), description: "Part of an app user id or email." },
];

const RC = "routes/v2/refund-control.ts", RT = "routes/v2/retention.ts", SU = "routes/v2/support.ts", WB = "routes/v2/winback.ts", CL = "routes/v2/customer-lists.ts", PUB = "routes/lifecycle-public.ts";
const x = { extension: true, security: SECRET };

export const lifecyclePaths = {
  [`${P}/refund_control`]: {
    get: op({ ...x, id: "getRefundControl", tag: "Refund Control", summary: "Get policies and settings", source: RC, scopes: PR, parameters: [project], responses: { 200: ok("Refund Control.", refundControl), ...E(404) } }),
    post: op({ ...x, id: "saveRefundControl", tag: "Refund Control", summary: "Save settings and the ordered policies", source: RC, scopes: PW, parameters: [project],
      description: "Replaces the settings you send and, when `policies` is present, the whole ordered list: the array order is the evaluation order; policies with an `id` are kept, the others created, the missing ones deleted.",
      requestBody: body(obj({ settings, policies: arr(obj({ id: str(), name: str(), template: str(), rules, preference }, ["name", "rules", "preference"])) }), {
        settings: { customer_consented: true, default_preference: "consumption_only" },
        policies: [{ name: "Recent renewals", template: "recent_renewal", rules: { groups: [{ conditions: [{ field: "lastRenewalAt", operator: "within", value: "24h" }] }] }, preference: "prefer_no_refund" }],
      }),
      responses: { 200: ok("Refund Control.", refundControl), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/refund_control/stats`]: {
    get: op({ ...x, id: "getRefundControlStats", tag: "Refund Control", summary: "Refund rate, amounts and counts", source: RC, scopes: CR,
      parameters: [project, { name: "days", in: "query", schema: int(undefined, { default: 28 }) }, { name: "environment", in: "query", schema: en(["production", "sandbox"]) }],
      responses: { 200: ok("The cards.", stats), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/refund_requests`]: {
    get: op({ ...x, id: "listRefundRequests", tag: "Refund Control", summary: "List refund requests, newest first", source: RC, scopes: CR, parameters: [project, ...page],
      description: "Apple CONSUMPTION_REQUEST notifications with the consumption information sent, and refunds learned of without a request (Apple REFUND or REFUND_DECLINED, Google voided purchases and chargebacks, Stripe and Amazon refunds).",
      responses: { 200: ok("Requests.", listOf(refundRequest)), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/retention_offers`]: {
    get: op({ ...x, id: "listRetentionOffers", tag: "Retention", summary: "List Customer Center retention offers", source: RT, scopes: PR, parameters: [project], responses: { 200: ok("Offers.", listOf(offer)), ...E(404) } }),
    post: op({ ...x, id: "createRetentionOffer", tag: "Retention", summary: "Create a retention offer", source: RT, scopes: PW, parameters: [project],
      description: "Active `cancel` offers are added as `promotional_offer` to the Customer Center's CANCEL paths, `refund` offers to its REFUND_REQUEST paths.",
      requestBody: body({ ...offerIn, required: ["trigger", "name", "title", "store", "product_mapping"] }, { trigger: "cancel", name: "Cancellation discount", title: "Stay for 50% off", subtitle: "Three months at half price", store: "app_store", product_mapping: { pro_monthly: "stay_50" } }),
      responses: { 201: ok("The offer.", offer), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/retention_offers/{offer_id}`]: {
    post: op({ ...x, id: "updateRetentionOffer", tag: "Retention", summary: "Update a retention offer", source: RT, scopes: PW, parameters: [project, id("offer_id")], requestBody: body(offerIn, { active: false }), responses: { 200: ok("The offer.", offer), ...v2Errors(400, 401, 403, 404) } }),
    delete: op({ ...x, id: "deleteRetentionOffer", tag: "Retention", summary: "Delete a retention offer", source: RT, scopes: PW, parameters: [project, id("offer_id")], responses: { 200: ok("Deleted.", ref("Deleted")), ...E(404) } }),
  },
  [`${P}/apps/{app_id}/retention_messaging`]: {
    get: op({ ...x, id: "getRetentionMessaging", tag: "Retention", summary: "Get Apple Retention Messaging settings", source: RT, scopes: AR, parameters: [project, id("app_id")], responses: { 200: ok("The settings.", messaging), ...v2Errors(400, 401, 403, 404) } }),
    post: op({ ...x, id: "saveRetentionMessaging", tag: "Retention", summary: "Save messages, defaults and real-time rules", source: RT, scopes: AW, parameters: [project, id("app_id")],
      description: "Messages follow Apple's limits (header 66, body 144 characters). Default messages must be text messages. A message already uploaded to Apple cannot change: add a new one.",
      requestBody: body(obj({ enabled: bool(), messages: arr(message), defaults: arr(obj({ product_id: str(), locale: str(), message_id: str() })), rules: arr(obj({ product_id: nstr(), message_id: str() })) }), {
        enabled: true, messages: [{ id: "11111111-2222-4333-8444-555555555555", kind: "text", header: "Your scans stay unlimited", body: "Keep unlimited scans and cloud backup." }],
        defaults: [{ product_id: "pro_monthly", locale: "en-US", message_id: "11111111-2222-4333-8444-555555555555" }], rules: [{ product_id: null, message_id: "11111111-2222-4333-8444-555555555555" }],
      }),
      responses: { 200: ok("The settings.", messaging), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/apps/{app_id}/retention_messaging/actions/sync`]: {
    post: op({ ...x, id: "syncRetentionMessaging", tag: "Retention", summary: "Upload to Apple and register the real-time URL", source: RT, scopes: AW, parameters: [project, id("app_id")],
      description: "Calls Apple's Upload Message for messages not yet in the environment, Configure Default Message for each default, and Configure Realtime URL with this server's `/v1/retention/apple/{app_id}`, using the app's In-App Purchase key. Apple grants access to the Retention Messaging API on request; production also needs Apple's performance test.",
      requestBody: body(obj({ environment: en(["sandbox", "production"]) }), { environment: "sandbox" }), responses: { 200: ok("The settings and per-step errors.", messaging), ...v2Errors(400, 401, 403, 404, 422) } }),
  },
  "/v1/retention/apple/{app_id}": {
    post: op({ id: "getRetentionMessage", tag: "Retention", summary: "Apple's real-time Get Retention Message call", security: NONE, source: PUB, extension: true, parameters: [id("app_id")],
      description: "Apple posts `{ signedPayload }` when a customer is about to cancel. RevenueDot verifies Apple's signature and the app's Apple ID, then answers from the real-time rules: `message`, `alternateProduct` or `promotionalOffer` (signed with promotionalOfferSignatureV1), or `{}` so Apple shows the default message.",
      requestBody: body(obj({ signedPayload: str("JWS signed by the App Store.") }, ["signedPayload"])),
      responses: { 200: ok("The chosen message.", { type: "object" }, { message: { messageIdentifier: "11111111-2222-4333-8444-555555555555" } }), 400: { description: "Not signed by Apple, or for another app." }, 404: { description: "Unknown App Store app." } } }),
  },
  [`${P}/support_tickets`]: {
    get: op({ ...x, id: "listSupportTickets", tag: "Support", summary: "List Customer Center tickets, newest first", source: SU, scopes: CR,
      parameters: [project, { name: "status", in: "query", schema: en(["open", "closed", "all"]) }, ...page], responses: { 200: ok("Tickets.", listOf(ticket)), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/support_tickets/{ticket_id}`]: {
    post: op({ ...x, id: "updateSupportTicket", tag: "Support", summary: "Close or reopen a ticket", source: SU, scopes: CW, parameters: [project, id("ticket_id")],
      requestBody: body(obj({ status: en(["open", "closed"]) }, ["status"]), { status: "closed" }), responses: { 200: ok("The ticket.", ticket), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/customers/{customer_id}/support_summary`]: {
    get: op({ ...x, id: "getSupportSummary", tag: "Support", summary: "What a help desk sidebar shows about a customer", source: SU, scopes: CR, parameters: [project, param("CustomerId")],
      description: "For an Intercom or Zendesk sidebar app: status, entitlements, subscriptions with auto-renew and store, total spent, refund requests, open tickets and a dashboard link.",
      responses: { 200: ok("The summary.", summary), ...E(404) } }),
  },
  [`${P}/support_summaries`]: {
    get: op({ ...x, id: "findSupportSummaries", tag: "Support", summary: "Look customers up by email", source: SU, scopes: CR,
      parameters: [project, { name: "email", in: "query", required: true, schema: str(), description: "Matched case-insensitively against the `$email` attribute." }],
      responses: { 200: ok("Up to 10 summaries.", listOf(summary)), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/winback_campaigns`]: {
    get: op({ ...x, id: "listWinbackCampaigns", tag: "Win-back", summary: "List win-back campaigns", source: WB, scopes: PR, parameters: [project], responses: { 200: ok("Campaigns with stats.", listOf(campaign)), ...E(404) } }),
    post: op({ ...x, id: "createWinbackCampaign", tag: "Win-back", summary: "Create a win-back campaign", source: WB, scopes: PW, parameters: [project],
      requestBody: body({ ...campaignIn, required: ["name", "email", "offer"] }, {
        name: "Come back in September", status: "active", audience: { churned_min_days: 3, churned_max_days: 60, product_ids: [], stores: [], audience_id: null },
        email: { subject: "We saved your scans", heading: "Your scans are waiting", body: "Come back to Scanner Pro.", button_label: "Resubscribe" }, offer: { type: "store" }, send_hour_utc: 16, track_opens: false,
      }),
      responses: { 201: ok("The campaign.", campaign), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/winback_campaigns/{campaign_id}`]: {
    get: op({ ...x, id: "getWinbackCampaign", tag: "Win-back", summary: "Get a campaign with stats and recent emails", source: WB, scopes: PR, parameters: [project, id("campaign_id")], responses: { 200: ok("The campaign.", campaign), ...E(404) } }),
    post: op({ ...x, id: "updateWinbackCampaign", tag: "Win-back", summary: "Update, start or pause a campaign", source: WB, scopes: PW, parameters: [project, id("campaign_id")], requestBody: body(campaignIn, { status: "paused" }), responses: { 200: ok("The campaign.", campaign), ...v2Errors(400, 401, 403, 404) } }),
    delete: op({ ...x, id: "deleteWinbackCampaign", tag: "Win-back", summary: "Delete a campaign", source: WB, scopes: PW, parameters: [project, id("campaign_id")], responses: { 200: ok("Deleted.", ref("Deleted")), ...E(404) } }),
  },
  [`${P}/winback_campaigns/{campaign_id}/actions/preview`]: {
    post: op({ ...x, id: "previewWinbackCampaign", tag: "Win-back", summary: "Who would get the email now", source: WB, scopes: PR, parameters: [project, id("campaign_id")],
      responses: { 200: ok("Count and sample.", obj({ object: en(["winback_preview"]), eligible: int(), is_approximate: bool(), sample: arr(obj({ app_user_id: str(), email: str(), churned_at: ms("Access ended."), product_id: str(), store: str() })) })), ...E(404) } }),
  },
  [`${P}/winback_campaigns/{campaign_id}/actions/send_test`]: {
    post: op({ ...x, id: "sendWinbackTest", tag: "Win-back", summary: "Send a test email", source: WB, scopes: PW, parameters: [project, id("campaign_id")],
      requestBody: body(obj({ email: str() }, ["email"]), { email: "me@example.com" }), responses: { 200: ok("Sent.", obj({ object: en(["winback_test"]), sent_to: str() })), ...v2Errors(400, 401, 403, 404, 503) } }),
  },
  [`${P}/winback_campaigns/{campaign_id}/actions/run`]: {
    post: op({ ...x, id: "runWinbackCampaign", tag: "Win-back", summary: "Send now", source: WB, scopes: PW, parameters: [project, id("campaign_id")],
      description: "Emails up to 500 eligible customers now. Each customer gets a campaign's email at most once. Active campaigns also send daily at `send_hour_utc`.",
      responses: { 200: ok("Counts.", obj({ object: en(["winback_run"]), sent: int(), failed: int(), skipped: int() })), ...E(404, 422) } }),
  },
  "/v1/winback/c/{token}": { get: op({ id: "winbackClick", tag: "Win-back", summary: "Email button: records the click and redirects to the offer", security: NONE, source: PUB, extension: true, parameters: [id("token")], responses: { 302: { description: "To the offer." }, 404: { description: "Unknown link." } } }) },
  "/v1/winback/o/{token}": { get: op({ id: "winbackOpen", tag: "Win-back", summary: "Open-tracking image (campaigns with track_opens)", security: NONE, source: PUB, extension: true, parameters: [id("token")], responses: { 200: { description: "A 1×1 GIF.", content: { "image/gif": {} } } } }) },
  "/v1/winback/u/{token}": {
    get: op({ id: "winbackUnsubscribePage", tag: "Win-back", summary: "Unsubscribe page (asks first)", security: NONE, source: PUB, extension: true, parameters: [id("token")], responses: { 200: { description: "HTML.", content: { "text/html": {} } }, 404: { description: "Unknown link." } } }),
    post: op({ id: "winbackUnsubscribe", tag: "Win-back", summary: "Unsubscribe (also RFC 8058 one-click)", security: NONE, source: PUB, extension: true, parameters: [id("token")], responses: { 200: { description: "HTML confirmation.", content: { "text/html": {} } }, 404: { description: "Unknown link." } } }),
  },
  [`${P}/customer_lists`]: {
    get: op({ ...x, id: "listCustomerList", tag: "Customer lists", summary: "Customers in a list, with the summary cards", source: CL, scopes: CR, parameters: [project, ...listQuery, ...page],
      description: "Built-in lists or a saved audience, optionally filtered by audience rules and a search. Looks at the 10,000 most recently seen customers (`summary.is_approximate` when there are more).",
      responses: { 200: ok("Rows and the summary.", { ...listOf(listRow), properties: { ...listOf(listRow).properties, summary: obj({ object: str(), customers: int(), trialing_subscribers: int(), paid_subscribers: int(), total_revenue_in_usd: num(), is_approximate: bool() }) } }), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/customer_lists/export`]: {
    get: op({ ...x, id: "exportCustomerList", tag: "Customer lists", summary: "Export a list as CSV", source: CL, scopes: CR, parameters: [project, ...listQuery],
      responses: { 200: { description: "CSV with a header row: app_user_id, email, subscription_status, auto_renewal_status, first_seen_at, last_seen_at, spent_in_usd, latest_product_id, latest_store, latest_purchase_at, country, platform.", content: { "text/csv": { schema: str() } } }, ...v2Errors(400, 401, 403, 404) } }),
  },
};

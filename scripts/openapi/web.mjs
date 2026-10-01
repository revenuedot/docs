// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: web billing in the OpenAPI document: RevenueCat's v2 discount operations (real on Stripe), the web
// extensions (web config, web products, purchase links, funnels, domains, web discounts) and the hosted pages under /pay.
// Docs: https://revenuedot.app/docs/guides/web-billing   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { NONE, SECRET, arr, body, bool, en, int, listOf, ms, nint, nms, nstr, num, obj, ok, op, param, ref, str, v2Errors } from "./common.mjs";

const P = "/v2/projects/{project_id}";
const project = param("ProjectId");
const app = param("AppId");
const page = [param("Limit"), param("StartingAfter")];
const E = (...c) => v2Errors(401, 403, ...c);
const WEB = "routes/v2/web.ts";
const DISC = "routes/v2/discounts.ts";
const PAY = "routes/pay.ts";
const APPS_READ = ["project_configuration:apps:read"];
const APPS_WRITE = ["project_configuration:apps:read_write"];
const OFF_READ = ["project_configuration:offerings:read"];
const OFF_WRITE = ["project_configuration:offerings:read_write"];
const D_READ = ["project_configuration:discounts:read"];
const D_WRITE = ["project_configuration:discounts:read_write"];
const anyObj = { type: "object", additionalProperties: true };
const hex = (description) => str(description, { pattern: "^#[0-9a-fA-F]{6}$" });
const https = (description) => nstr(`${description} An https URL.`);

// ---- Schemas ---------------------------------------------------------------------------------------------------------
const STATS = { created_at: 1790800901115, updated_at: 1790801342625 };

const DiscountCommon = {
  object: en(["discount"]),
  id: str("Discount id (disc...)."),
  identifier: str("Your identifier for the discount, unique in the project."),
  customer_facing_name: str("The name buyers see at checkout and Stripe puts on the coupon (first 40 characters)."),
  duration_mode: en(["one_time", "time_window", "forever"], "`one_time`: the first payment. `time_window`: every payment for `time_window`. `forever`: every payment."),
  eligibility: en(["everyone", "never_purchased", "never_subscribed", "never_subscribed_to_the_same_product"], "Who may use it, checked against the buyer's purchase history when the checkout has an app user id."),
  time_window: nstr("ISO 8601 months or years (`P3M`, `P1Y`), 1 to 36 months, for `time_window`. Otherwise null."),
  disabled_at: nms("When it was disabled."),
};
const commonRequired = ["object", "id", "identifier", "customer_facing_name", "type", "duration_mode", "eligibility", "created_at", "updated_at"];

export const webSchemas = {
  DiscountPercentageVariant: obj({
    ...DiscountCommon, type: en(["percentage"]), percentage: int("Percent off, 1 to 100.", { minimum: 1, maximum: 100 }),
    created_at: ms("When it was created."), updated_at: ms("When it last changed."),
  }, [...commonRequired, "percentage"], { additionalProperties: false, description: "A percentage discount (RevenueCat's shape)." }),
  DiscountFixedAmountVariant: obj({
    ...DiscountCommon, type: en(["fixed_amount"]), fixed_amount: { type: "object", additionalProperties: num(), description: "Amount off by currency code, in major units: `{ \"USD\": 5, \"EUR\": 4.5 }`." },
    created_at: ms("When it was created."), updated_at: ms("When it last changed."),
  }, [...commonRequired, "fixed_amount"], { additionalProperties: false, description: "A fixed amount discount (RevenueCat's shape)." }),
  Discount: {
    description: "A web discount, in RevenueCat's `Discount` shape. Each one is a Stripe coupon in every Stripe app of the project.",
    oneOf: [ref("DiscountPercentageVariant"), ref("DiscountFixedAmountVariant")],
    discriminator: { propertyName: "type", mapping: { percentage: "#/components/schemas/DiscountPercentageVariant", fixed_amount: "#/components/schemas/DiscountFixedAmountVariant" } },
  },
  DiscountCode: obj({ object: en(["discount_code"]), code: str("The code buyers type. Matched without regard to case."), created_at: ms("When it was created.") }, ["object", "code", "created_at"], { additionalProperties: false }),
  WebDiscount: obj({
    ...DiscountCommon, object: en(["web_discount"]), type: en(["percentage", "fixed_amount"]),
    percentage: int("For `percentage`."), fixed_amount: { type: "object", additionalProperties: num(), description: "For `fixed_amount`." },
    created_at: ms("When it was created."), updated_at: ms("When it last changed."),
    label: str("How checkout describes it, such as \"20% off for 3 months\"."),
    product_identifiers: arr(str(), { description: "The products it applies to (store identifiers or product ids). Empty: every product." }),
    max_redemptions: nint("Paid checkouts it may be used in, or null for no cap."),
    expires_at: nms("When it stops working."),
    times_redeemed: int("Paid checkouts that used it."),
    status: en(["active", "disabled", "expired", "used_up"]),
    stripe: arr(obj({ app_id: str("The Stripe app."), coupon_id: str("The coupon in that Stripe account.") }, ["app_id", "coupon_id"])),
    codes: arr(obj({ code: str(), times_redeemed: int(), created_at: ms("When it was created."), stripe_promotion_codes: { type: ["object", "null"], additionalProperties: str(), description: "Stripe promotion code id by Stripe app id." } }, ["code", "times_redeemed", "created_at"])),
  }, ["object", "id", "identifier", "customer_facing_name", "type", "duration_mode", "eligibility", "label", "max_redemptions", "expires_at", "times_redeemed", "status", "stripe", "codes"]),

  FunnelTheme: obj({
    background: hex("Page background."), text: hex("Text colour."), accent: hex("Buttons, the progress bar and the selected option."), button_text: hex("Text on buttons."),
    corner_radius: int("0 (square) to 24.", { minimum: 0, maximum: 24 }),
  }, ["background", "text", "accent", "button_text", "corner_radius"]),
  FunnelStep: {
    description: "One screen of a funnel. Every step has `id` (1-40 lower-case letters, digits, `-` or `_`, unique in the funnel), `type`, `title` (up to 120 characters) and an optional `subtitle` (up to 600).",
    oneOf: [
      obj({ id: str(), type: en(["question"]), title: str(), subtitle: nstr(),
        options: arr(obj({ id: str("Unique in the step."), label: str("Up to 80 characters."), next: nstr("Go to this step id when chosen (a path). Unset: the next step.") }, ["id", "label"]), { minItems: 1, maxItems: 8 }),
        multiple: bool("Allow several answers."), attribute: nstr("Save the answer as this customer attribute (letters, digits, `_ . - $`). Several answers are joined with \", \"."), button_label: nstr() }, ["id", "type", "title", "options"]),
      obj({ id: str(), type: en(["info"]), title: str(), subtitle: nstr(), body: nstr("Up to 600 characters."), image_url: nstr("An https image."), button_label: nstr() }, ["id", "type", "title"]),
      obj({ id: str(), type: en(["email"]), title: str(), subtitle: nstr(), placeholder: nstr(), required: bool("Default true."), button_label: nstr() }, ["id", "type", "title"]),
      obj({ id: str(), type: en(["paywall"]), title: str(), subtitle: nstr(), offering: nstr("Offering lookup key. Null: the current offering."), features: arr(str(), { maxItems: 8, description: "Bullet lines, up to 120 characters each." }),
        highlight_package: nstr("Package lookup key selected first, such as $rc_annual."), discount_id: nstr("A web discount applied without a code."), allow_codes: bool("Show the discount code field."), button_label: nstr() }, ["id", "type", "title"]),
      obj({ id: str(), type: en(["success"]), title: str(), subtitle: nstr(), body: nstr(), show_redemption: bool("Show the redemption link and the store buttons.") }, ["id", "type", "title"]),
    ],
  },
  FunnelDoc: obj({ theme: ref("FunnelTheme"), steps: arr(ref("FunnelStep"), { minItems: 1, maxItems: 30 }) }, ["theme", "steps"], { description: "A funnel: a theme and 1 to 30 steps. To publish, it needs exactly one paywall step and exactly one success step, the paywall before the success step, and the success step last." }),
  Funnel: obj({
    object: en(["funnel"]), id: str("Funnel id (fnl_...)."), name: str(), slug: str("The page's address in the project, unique among purchase links and funnels."), app_id: nstr("The Stripe app it sells through."),
    status: en(["draft", "published"]), has_unpublished_changes: bool("The draft differs from the published copy."), url: str("The public page."),
    published_at: nms("When it was last published."), created_at: ms("When it was created."), updated_at: ms("When it last changed."), steps: int("Steps in the draft."),
    draft: { ...ref("FunnelDoc"), description: "The draft. Single reads and writes only." },
    problems: arr(obj({ path: str("Such as steps[2].options[0].next."), message: str() }, ["path", "message"]), { description: "What blocks publishing. Empty: it can be published. Single reads and writes only." }),
    views_30d: int("Visitors in the last 30 days. Lists only."), purchases_30d: int("Purchases in the last 30 days. Lists only."),
  }, ["object", "id", "name", "slug", "app_id", "status", "has_unpublished_changes", "url", "published_at", "created_at", "updated_at", "steps"]),
  PurchaseLink: obj({
    object: en(["purchase_link"]), id: str("Purchase link id (plink_...)."), name: str(), slug: str("The page's address in the project."), app_id: str("The Stripe app it sells through."),
    offering_id: str(), offering_lookup_key: nstr(), offering_display_name: nstr(), discount_id: nstr("A web discount applied without a code."),
    expires_at: nms("When the link stops working."), disabled_at: nms("When it was turned off."), status: en(["active", "expired", "disabled"]), url: str("The public page."),
    checkouts: int("Checkouts started."), purchases: int("Checkouts paid."), created_at: ms("When it was created."),
  }, ["object", "id", "name", "slug", "app_id", "offering_id", "status", "url", "checkouts", "purchases", "created_at"]),
  WebConfig: obj({
    object: en(["web_config"]), app_id: str("The Stripe app."), saved: bool("False until the first save; the values are then the defaults."), updated_at: nms("Last save."),
    app_name: str("Shown at the top of every page. Default: the app's name."), logo_url: https("Logo."), theme: ref("FunnelTheme"),
    terms_url: https("Terms of service."), privacy_url: https("Privacy policy."), support_email: nstr("Reply-to address of the redemption email and a Support link on pages."),
    success_mode: en(["show_redemption", "redirect"], "After payment: RevenueDot's success page, or a 303 redirect to `success_redirect_url` with `redemption_url` in the query."),
    success_redirect_url: https("Required for `redirect`."), success_title: nstr("Success page title. Default: \"Thank you for your purchase\"."), success_body: nstr("A line under the title."),
    cancel_url: https("Where a cancelled checkout returns. Default: the page, with `?canceled=1`."),
    app_scheme: str("The app's URL scheme for redemption links, such as `myapp`. Default: `rd-` and 10 hex characters of the project id's hash."),
    app_store_url: https("App Store button on the success and redemption pages."), play_store_url: https("Google Play button."),
    redemption_link_hours: int("How long a redemption link works, 1 to 720 hours. Default 24."),
    presets: arr(obj({ name: str(), theme: ref("FunnelTheme") }, ["name", "theme"]), { description: "Colour presets: Ink, Night, Ocean, Forest, Sunset." }),
  }, ["object", "app_id", "saved", "app_name", "theme", "success_mode", "app_scheme", "redemption_link_hours"]),
  WebProduct: obj({
    object: en(["web_product"]), product: ref("Product"), stripe_product_id: str("prod_... in your Stripe account."), stripe_price_id: str("price_...; also the product's `store_identifier`."),
    price: obj({ amount: num("Major units."), amount_minor: int("Minor units, as Stripe stores it."), currency: str("ISO 4217, upper case.") }, ["amount", "amount_minor", "currency"]),
    interval: { type: ["string", "null"], enum: ["day", "week", "month", "year", null], description: "Billing interval, or null for a one-time price." }, interval_count: nint("Intervals per period, such as 3 for every 3 months."),
    trial_days: nint("Free trial days added at checkout."), created_at: ms("When it was created."),
  }, ["object", "product", "stripe_product_id", "stripe_price_id", "price", "interval", "interval_count", "trial_days", "created_at"]),
  WebDomain: obj({
    object: en(["web_domain"]), slug: str("The project's address on RevenueDot's pay host."), pay_base: str("REVENUEDOT_PAY_URL, or `<server>/pay`."), default_base: str("`<pay_base>/<slug>`."),
    base: str("Where the project's pages live now: the custom domain once verified, else `default_base`."), custom_domain: nstr(),
    status: en(["none", "pending", "verified", "failed"]), verified_at: nms("When DNS was first proven."), checked_at: nms("Last check."), error: nstr("Why the last check failed."),
    dns: arr(obj({ type: en(["CNAME", "TXT"]), name: str(), value: str() }, ["type", "name", "value"]), { description: "The records to add at your DNS provider." }),
    cloud_note: nstr("On RevenueDot Cloud: the extra step the RevenueDot team does (the TLS certificate)."),
    found: obj({ cname: arr(str()), txt: arr(str()) }, [], { description: "Verify only: what DNS answered." }),
  }, ["object", "slug", "pay_base", "default_base", "base", "custom_domain", "status", "dns"]),
};

const percentEx = { object: "discount", id: "disc5k2m9q4x7a1b3c", identifier: "spring20", customer_facing_name: "Spring sale", duration_mode: "time_window", eligibility: "everyone", time_window: "P3M", disabled_at: null, type: "percentage", percentage: 20, ...STATS };
const fixedEx = { object: "discount", id: "disc8h3n1v6w0z2y4d", identifier: "five_off", customer_facing_name: "$5 off", duration_mode: "one_time", eligibility: "never_purchased", time_window: null, disabled_at: null, type: "fixed_amount", fixed_amount: { USD: 5, EUR: 4.5 }, ...STATS };
const linkEx = { object: "purchase_link", id: "plink_4k8m2q9x1z3c", name: "Spring sale", slug: "spring-sale", app_id: "appstrp8k2m9q4", offering_id: "ofrngm2u3h89blc", offering_lookup_key: "web", offering_display_name: "Go Pro on the web", discount_id: null, expires_at: null, disabled_at: null, status: "active", url: "https://api.revenuedot.app/pay/scanner/spring-sale", checkouts: 0, purchases: 0, created_at: 1790800901115 };
const theme = { background: "#FFFFFF", text: "#0A0A0A", accent: "#0A0A0A", button_text: "#FFFFFF", corner_radius: 0 };
const starter = { theme, steps: [
  { id: "goal", type: "question", title: "What do you want to get done?", subtitle: "Pick one. We will set up your plan around it.", attribute: "goal", options: [{ id: "focus", label: "Focus on deep work" }, { id: "habits", label: "Build better habits" }, { id: "sleep", label: "Sleep better" }] },
  { id: "plan", type: "info", title: "Your plan is ready", subtitle: null, body: "People with the same goal kept going 3 times longer with a daily plan.", button_label: "Continue" },
  { id: "email", type: "email", title: "Where should we send your plan?", subtitle: "We will email your plan and your receipt.", placeholder: "you@example.com", required: true },
  { id: "paywall", type: "paywall", title: "Unlock your full plan", subtitle: "Cancel anytime.", offering: "web", features: ["Your personal daily plan", "Reminders that adapt to you", "Progress on every device"], highlight_package: "$rc_annual", allow_codes: true, button_label: "Continue" },
  { id: "success", type: "success", title: "You are in", subtitle: null, body: "Open the app to start your plan. Your purchase is waiting there.", show_redemption: true },
] };
const funnelEx = { object: "funnel", id: "fnl_7q2k9m4x1z8c", name: "Focus quiz", slug: "focus-quiz", app_id: "appstrp8k2m9q4", status: "published", has_unpublished_changes: false, url: "https://api.revenuedot.app/pay/scanner/focus-quiz", published_at: 1790801342625, created_at: 1790800901115, updated_at: 1790801342625, steps: 5, draft: starter, problems: [] };
const { draft: _draft, problems: _problems, ...funnelListEx } = funnelEx;
const domainEx = {
  object: "web_domain", slug: "scanner", pay_base: "https://api.revenuedot.app/pay", default_base: "https://api.revenuedot.app/pay/scanner", base: "https://api.revenuedot.app/pay/scanner",
  custom_domain: "pay.scanner.example", status: "pending", verified_at: null, checked_at: null, error: null,
  dns: [{ type: "CNAME", name: "pay.scanner.example", value: "api.revenuedot.app" }, { type: "TXT", name: "_revenuedot.pay.scanner.example", value: "revenuedot-verify=k3m9q2x7z1c4v8b6n0p5w2e7" }],
  cloud_note: "On RevenueDot Cloud the domain also needs a TLS certificate, which RevenueDot adds after verification (see the custom domains guide).",
};
const configEx = {
  object: "web_config", app_id: "appstrp8k2m9q4", saved: true, updated_at: 1790801342625, app_name: "Scanner", logo_url: null, theme,
  terms_url: "https://scanner.example/terms", privacy_url: "https://scanner.example/privacy", support_email: "help@scanner.example", success_mode: "show_redemption",
  success_redirect_url: null, success_title: null, success_body: null, cancel_url: null, app_scheme: "scanner", app_store_url: "https://apps.apple.com/app/id123",
  play_store_url: "https://play.google.com/store/apps/details?id=com.example.scanner", redemption_link_hours: 24,
  presets: [{ name: "Ink", theme }, { name: "Night", theme: { background: "#0A0A0A", text: "#FAFAFA", accent: "#F7B500", button_text: "#0A0A0A", corner_radius: 0 } }],
};
const webProductEx = {
  object: "web_product",
  product: { object: "product", id: "prod1a2b3c4d5e6f7g", store_identifier: "price_1QxR2nKc8Hn4AbCd", type: "subscription", state: "active", subscription: { duration: "P1M", grace_period_duration: null, trial_duration: null }, one_time: { is_consumable: null }, created_at: 1790800901115, app_id: "appstrp8k2m9q4", display_name: "Pro monthly" },
  stripe_product_id: "prod_RqA1b2C3d4E5f6", stripe_price_id: "price_1QxR2nKc8Hn4AbCd", price: { amount: 9.99, amount_minor: 999, currency: "USD" }, interval: "month", interval_count: 1, trial_days: 7, created_at: 1790800901115,
};

const discountId = { name: "discount_id", in: "path", required: true, schema: str(), description: "Discount id (disc...)." };
const linkId = { name: "link_id", in: "path", required: true, schema: str(), description: "Purchase link id (plink_...)." };
const funnelId = { name: "funnel_id", in: "path", required: true, schema: str(), description: "Funnel id (fnl_...)." };
const amounts = { type: "object", additionalProperties: obj({ currency: str("Same as the key.", { minLength: 3, maxLength: 3 }), amount: num("Major units.") }, ["currency", "amount"]), description: "For `fixed_amount`: amount off by currency, keyed by the currency code." };
const discountFields = {
  customer_facing_name: str(undefined, { minLength: 1, maxLength: 255 }), type: en(["percentage", "fixed_amount"]), percentage: int("For `percentage`: 1 to 100.", { minimum: 1, maximum: 100 }), fixed_amounts: amounts,
  duration_mode: en(["one_time", "time_window", "forever"]), eligibility: en(["everyone", "never_purchased", "never_subscribed", "never_subscribed_to_the_same_product"]),
  time_window: str("For `time_window`: whole months or years, 1 to 36 months (`P3M`, `P1Y`). Stripe repeats a coupon only by months."),
  product_identifiers: arr(str(), { maxItems: 100, description: "Store identifiers (the Stripe price id of a web product) or product ids. Empty or absent: every product." }),
  max_redemptions: nint("RevenueDot addition: paid checkouts it may be used in. Sent to Stripe as the coupon's `max_redemptions`.", { minimum: 1 }),
  expires_at: nint("RevenueDot addition: when it stops working, epoch milliseconds. Sent to Stripe as `redeem_by`.", { format: "int64" }),
};
const storeErr = "Stripe errors answer 422 `store_error` (`retryable: true` while Stripe is unavailable) and nothing is saved.";

const html = (description) => ({ description, content: { "text/html": { schema: str("A complete HTML page.") } } });
const msg = (description, example) => ok(description, obj({ message: str("A sentence the page shows the buyer.") }, ["message"]), example);

// ---- Paths -------------------------------------------------------------------------------------------------------------
export const webPaths = {
  // ---- RevenueCat's discount operations, real on the developer's Stripe ----
  [`${P}/discounts`]: {
    get: op({ id: "listDiscounts", tag: "Discounts", summary: "List discounts", security: SECRET, source: DISC, scopes: D_READ, parameters: [project, ...page],
      description: "The project's web discounts in RevenueCat's `Discount` shape. RevenueDot's extra settings (`max_redemptions`, `expires_at`), the codes and the Stripe ids are on `GET /web_discounts`.",
      responses: { 200: ok("A page of discounts.", listOf(ref("Discount")), { object: "list", items: [percentEx], next_page: null, url: "/v2/projects/proj18pzzkao/discounts" }), ...E(400, 404) } }),
    post: op({ id: "createDiscount", tag: "Discounts", summary: "Create a discount", security: SECRET, source: DISC, scopes: D_WRITE, parameters: [project],
      description: `
Creates the discount and a Stripe coupon for it in every Stripe app of the project that has a key: \`percent_off\`, or \`amount_off\` and \`currency\` with \`currency_options\` for the other currencies; \`duration\` \`once\`, \`repeating\` with \`duration_in_months\`, or \`forever\`; \`applies_to.products\` from \`product_identifiers\`; \`max_redemptions\`; \`redeem_by\` from \`expires_at\`. Add codes with \`POST /discounts/{discount_id}/discount_codes\`, or set it as a purchase link's or paywall step's automatic discount.

\`max_redemptions\` and \`expires_at\` are RevenueDot additions to RevenueCat's request. 409 when the identifier exists. ${storeErr} See [Web discounts](../docs/guides/web-discounts.md).`,
      requestBody: body(obj({ identifier: str("Letters, digits, `_ . -`.", { minLength: 1, maxLength: 255 }), ...discountFields }, ["identifier", "customer_facing_name", "type", "duration_mode", "eligibility"]),
        { identifier: "spring20", customer_facing_name: "Spring sale", type: "percentage", percentage: 20, duration_mode: "time_window", time_window: "P3M", eligibility: "everyone", max_redemptions: 100 }),
      responses: { 201: ok("The discount.", ref("Discount"), percentEx), ...v2Errors(400, 401, 403, 404, 409, 422) } }),
  },
  [`${P}/discounts/{discount_id}`]: {
    get: op({ id: "getDiscount", tag: "Discounts", summary: "Get a discount", security: SECRET, source: DISC, scopes: D_READ, parameters: [project, discountId],
      responses: { 200: ok("The discount.", ref("Discount"), fixedEx), ...E(404) } }),
    patch: op({ id: "updateDiscount", tag: "Discounts", summary: "Update a discount", security: SECRET, source: DISC, scopes: D_WRITE, parameters: [project, discountId],
      description: `Send only what changes. A Stripe coupon cannot change its amount or duration, so a change to \`type\`, \`percentage\`, \`fixed_amounts\`, \`duration_mode\`, \`time_window\`, \`product_identifiers\`, \`max_redemptions\` or \`expires_at\` creates a new coupon and new promotion codes, and turns the old promotion codes off. Subscriptions that already use the old coupon keep it. A new name or eligibility changes nothing in Stripe. ${storeErr}`,
      requestBody: body(obj(discountFields), { percentage: 30, customer_facing_name: "Spring sale 30" }),
      responses: { 200: ok("The discount.", ref("Discount"), { ...percentEx, percentage: 30, customer_facing_name: "Spring sale 30" }), ...v2Errors(400, 401, 403, 404, 422) } }),
    delete: op({ id: "deleteDiscount", tag: "Discounts", summary: "Delete a discount", security: SECRET, source: DISC, scopes: D_WRITE, parameters: [project, discountId],
      description: `Turns its promotion codes off and deletes its Stripe coupons. Subscriptions that already use the coupon keep the discount, as in Stripe. ${storeErr}`,
      responses: { 200: ok("Deleted.", ref("Deleted"), { object: "discount", id: "disc5k2m9q4x7a1b3c", deleted_at: 1790801342625 }), ...E(404, 422) } }),
  },
  [`${P}/discounts/{discount_id}/actions/enable`]: {
    post: op({ id: "enableDiscount", tag: "Discounts", summary: "Enable a discount", security: SECRET, source: DISC, scopes: D_WRITE, parameters: [project, discountId],
      description: `Checkout accepts it again and its Stripe promotion codes are turned back on. ${storeErr}`, responses: { 200: ok("The discount.", ref("Discount"), percentEx), ...E(404, 422) } }),
  },
  [`${P}/discounts/{discount_id}/actions/disable`]: {
    post: op({ id: "disableDiscount", tag: "Discounts", summary: "Disable a discount", security: SECRET, source: DISC, scopes: D_WRITE, parameters: [project, discountId],
      description: `Checkout refuses it ("This code is no longer active.") and its Stripe promotion codes are turned off. ${storeErr}`, responses: { 200: ok("The discount.", ref("Discount"), { ...percentEx, disabled_at: 1790801342625 }), ...E(404, 422) } }),
  },
  [`${P}/discounts/{discount_id}/discount_codes`]: {
    get: op({ id: "listDiscountCodes", tag: "Discounts", summary: "List a discount's codes", security: SECRET, source: DISC, scopes: D_READ, parameters: [project, discountId, ...page],
      responses: { 200: ok("A page of codes.", listOf(ref("DiscountCode")), { object: "list", items: [{ object: "discount_code", code: "SPRING20", created_at: 1790800901115 }], next_page: null, url: "/v2/projects/proj18pzzkao/discounts/disc5k2m9q4x7a1b3c/discount_codes" }), ...E(400, 404) } }),
    post: op({ id: "createDiscountCodes", tag: "Discounts", summary: "Create discount codes", security: SECRET, source: DISC, scopes: D_WRITE, parameters: [project, discountId],
      description: `Each code becomes a Stripe promotion code on the discount's coupon, active unless the discount is disabled. Codes are unique in the project whatever their case (409 when one is taken). Letters, digits, \`_\` and \`-\`. ${storeErr}`,
      requestBody: body(obj({ codes: arr(str(undefined, { minLength: 1, maxLength: 255 }), { minItems: 1, maxItems: 10000 }) }, ["codes"]), { codes: ["SPRING20", "friends"] }),
      responses: { 201: ok("The new codes.", arr(ref("DiscountCode")), [{ object: "discount_code", code: "SPRING20", created_at: 1790800901115 }, { object: "discount_code", code: "friends", created_at: 1790800901115 }]), ...v2Errors(400, 401, 403, 404, 409, 422) } }),
  },
  [`${P}/discounts/{discount_id}/discount_codes/{discount_code}`]: {
    delete: op({ id: "deleteDiscountCode", tag: "Discounts", summary: "Delete a discount code", security: SECRET, source: DISC, scopes: D_WRITE,
      parameters: [project, discountId, { name: "discount_code", in: "path", required: true, schema: str(), description: "The code, URL-encoded. Any case." }],
      description: `Its Stripe promotion code is turned off. ${storeErr}`,
      responses: { 200: ok("Deleted.", ref("Deleted"), { object: "discount_code", id: "friends", deleted_at: 1790801342625 }), ...E(404, 422) } }),
  },

  // ---- Extensions ----
  [`${P}/web_discounts`]: {
    get: op({ id: "listWebDiscounts", tag: "Web billing", summary: "List web discounts with their settings", security: SECRET, source: DISC, extension: true, scopes: D_READ, parameters: [project, ...page],
      description: "The same discounts as `GET /discounts`, with what RevenueCat's closed `Discount` schema has no room for: `max_redemptions`, `expires_at`, `times_redeemed`, a `status`, the label checkout shows, the codes with their use counts, and the Stripe coupon and promotion code ids.",
      responses: { 200: ok("A page of web discounts.", listOf(ref("WebDiscount")), { object: "list", items: [{ ...percentEx, object: "web_discount", label: "20% off for 3 months", product_identifiers: [], max_redemptions: 100, expires_at: null, times_redeemed: 1, status: "active", stripe: [{ app_id: "appstrp8k2m9q4", coupon_id: "Zx81kQ2p" }], codes: [{ code: "SPRING20", times_redeemed: 1, created_at: 1790800901115, stripe_promotion_codes: { appstrp8k2m9q4: "promo_1QxS0aKc8Hn4AbCd" } }] }], next_page: null, url: "/v2/projects/proj18pzzkao/web_discounts" }), ...E(400, 404) } }),
  },
  [`${P}/web`]: {
    get: op({ id: "getWebOverview", tag: "Web billing", summary: "Get the Web page: providers and checklist", security: SECRET, source: WEB, extension: true, scopes: APPS_READ, parameters: [project],
      description: "The project's Stripe apps as web providers, and the four steps to sell on the web, each true when done: a Stripe app with a key, a saved web config, at least one web product, and an offering with a web product in a package.",
      responses: { 200: ok("The overview.", obj({
        object: en(["web_overview"]), pay_base: str("Where hosted pages live: REVENUEDOT_PAY_URL, or `<server>/pay`."), project_base: str("Where this project's pages live."), domain: ref("WebDomain"),
        providers: arr(obj({ object: en(["web_provider"]), id: str("The Stripe app id."), name: str(), type: en(["stripe"]), public_key: str("strp_..."),
          key: obj({ configured: bool(), mode: { type: ["string", "null"], enum: ["test", "live", null] }, kind: { type: ["string", "null"], enum: ["restricted", "secret", "other", null] }, last4: nstr() }, ["configured", "mode", "kind", "last4"]),
          web_config: bool("A web config is saved."), created_at: ms("When the app was created.") }, ["object", "id", "name", "type", "public_key", "key", "web_config", "created_at"])),
        checklist: obj({ connect_stripe: bool(), web_config: bool(), web_products: bool(), offering: bool() }, ["connect_stripe", "web_config", "web_products", "offering"]),
        web_products: int("How many web products the project has."), offerings_with_web_products: arr(str(), { description: "Offering ids with a web product in a package." }),
      }, ["object", "pay_base", "project_base", "domain", "providers", "checklist", "web_products", "offerings_with_web_products"]), {
        object: "web_overview", pay_base: "https://api.revenuedot.app/pay", project_base: "https://api.revenuedot.app/pay/scanner", domain: { ...domainEx, custom_domain: null, status: "none", dns: [] },
        providers: [{ object: "web_provider", id: "appstrp8k2m9q4", name: "Scanner Web", type: "stripe", public_key: "strp_webtest123", key: { configured: true, mode: "test", kind: "restricted", last4: "Qa9x" }, web_config: true, created_at: 1790800901115 }],
        checklist: { connect_stripe: true, web_config: true, web_products: true, offering: true }, web_products: 3, offerings_with_web_products: ["ofrngm2u3h89blc"],
      }), ...E(404) } }),
  },
  [`${P}/apps/{app_id}/web_config`]: {
    get: op({ id: "getWebConfig", tag: "Web billing", summary: "Get a Stripe app's web config", security: SECRET, source: WEB, extension: true, scopes: APPS_READ, parameters: [project, app],
      description: "The checkout look, legal links, success and cancel behaviour, and the deep link scheme for redemption links. Before the first save it answers the defaults with `saved: false`. 400 for an app that is not a Stripe app.",
      responses: { 200: ok("The web config.", ref("WebConfig"), configEx), ...E(400, 404) } }),
    put: op({ id: "putWebConfig", tag: "Web billing", summary: "Save a Stripe app's web config", security: SECRET, source: WEB, extension: true, scopes: APPS_WRITE, parameters: [project, app],
      description: "Send only what changes; the rest keeps its value. URLs must be https. `success_redirect_url` is required when `success_mode` is `redirect`. See [Sell on the web with Stripe](../docs/guides/web-billing.md#2-add-a-web-config).",
      requestBody: body(obj({
        app_name: str(undefined, { minLength: 1, maxLength: 80 }), logo_url: https("Logo."), theme: ref("FunnelTheme"), terms_url: https("Terms."), privacy_url: https("Privacy policy."),
        support_email: nstr("An email address."), success_mode: en(["show_redemption", "redirect"]), success_redirect_url: https("For `redirect`."), success_title: nstr(undefined, { maxLength: 120 }),
        success_body: nstr(undefined, { maxLength: 600 }), cancel_url: https("Cancelled checkouts return here."), app_scheme: str("Lower-case letters, digits, `+ . -`, starting with a letter, 2-40 characters.", { pattern: "^[a-z][a-z0-9+.-]{1,39}$" }),
        app_store_url: https("App Store page."), play_store_url: https("Google Play page."), redemption_link_hours: int(undefined, { minimum: 1, maximum: 720 }),
      }, [], { additionalProperties: false }), { app_name: "Scanner", support_email: "help@scanner.example", terms_url: "https://scanner.example/terms", privacy_url: "https://scanner.example/privacy", app_scheme: "scanner", app_store_url: "https://apps.apple.com/app/id123", play_store_url: "https://play.google.com/store/apps/details?id=com.example.scanner" }),
      responses: { 200: ok("The saved web config.", ref("WebConfig"), configEx), ...v2Errors(400, 401, 403, 404) } }),
  },
  [`${P}/apps/{app_id}/web_products`]: {
    get: op({ id: "listWebProducts", tag: "Web billing", summary: "List a Stripe app's web products", security: SECRET, source: WEB, extension: true, scopes: ["project_configuration:products:read"], parameters: [project, app, ...page],
      responses: { 200: ok("A page of web products.", listOf(ref("WebProduct")), { object: "list", items: [webProductEx], next_page: null, url: "/v2/projects/proj18pzzkao/apps/appstrp8k2m9q4/web_products" }), ...E(400, 404) } }),
    post: op({ id: "createWebProduct", tag: "Web billing", summary: "Create a web product in Stripe", security: SECRET, source: WEB, extension: true, scopes: ["project_configuration:products:read_write"], parameters: [project, app],
      description: `
Creates a Stripe Product (\`metadata.revenuedot_project\`) and a Price in your Stripe account with the app's restricted key, then a RevenueDot product whose \`store_identifier\` is the **price id**, so purchases of that price map to it. \`duration\` is the billing period (\`P1W\`, \`P1M\`, \`P3M\`, \`P6M\`, \`P1Y\`) and is required for a subscription. \`trial_days\` is added to each checkout as \`trial_period_days\`.

To use a price you already have, send \`stripe_price_id\` instead of \`price\` and \`duration\`; RevenueDot reads its amount and period from Stripe. Its type must match (recurring for \`subscription\`), and it needs a fixed unit amount.

\`entitlement_ids\` attaches the product to those entitlements. 409 when a product for that price exists. 422 \`store_error\` when Stripe refuses: a key without write access to Products and Prices says so.`,
      requestBody: body(obj({
        display_name: str("Shown on the checkout and Stripe receipts.", { minLength: 1, maxLength: 120 }), type: en(["subscription", "consumable", "non_consumable"], "Default subscription."),
        price: obj({ amount: num("Major units, such as 9.99."), currency: str("ISO 4217.", { minLength: 3, maxLength: 3 }) }, ["amount", "currency"]),
        duration: en(["P1W", "P1M", "P3M", "P6M", "P1Y"]), trial_days: nint("1 to 730.", { minimum: 1, maximum: 730 }),
        entitlement_ids: arr(str(), { maxItems: 20 }), stripe_price_id: str("Link this existing price instead of creating one.", { pattern: "^price_[A-Za-z0-9_]+$" }),
      }, ["display_name"], { additionalProperties: false }), { display_name: "Pro monthly", type: "subscription", price: { amount: 9.99, currency: "USD" }, duration: "P1M", trial_days: 7, entitlement_ids: ["entl1a2b3c4d5e"] }),
      responses: { 201: ok("The web product.", ref("WebProduct"), webProductEx), ...v2Errors(400, 401, 403, 404, 409, 422) } }),
  },
  [`${P}/purchase_links`]: {
    get: op({ id: "listPurchaseLinks", tag: "Purchase links", summary: "List purchase links", security: SECRET, source: WEB, extension: true, scopes: OFF_READ, parameters: [project, ...page],
      responses: { 200: ok("A page of purchase links.", listOf(ref("PurchaseLink")), { object: "list", items: [linkEx], next_page: null, url: "/v2/projects/proj18pzzkao/purchase_links" }), ...E(400, 404) } }),
    post: op({ id: "createPurchaseLink", tag: "Purchase links", summary: "Create a purchase link", security: SECRET, source: WEB, extension: true, scopes: OFF_WRITE, parameters: [project],
      description: "A checkout page for one offering at `url`. The slug defaults to one made from the name; it must be unique among the project's purchase links and funnels (409), 3-40 lower-case letters, digits or `-`, and not reserved (`api`, `r`, `pay`, `success` ...). `app_id` defaults to the project's first Stripe app; 422 when there is none. See [Purchase links](../docs/guides/purchase-links.md).",
      requestBody: body(obj({
        name: str(undefined, { minLength: 1, maxLength: 120 }), offering_id: str(), slug: str(), app_id: nstr("A Stripe app of the project."), discount_id: nstr("A web discount applied without a code."),
        expires_at: nint("Epoch milliseconds. After it the page answers 410.", { format: "int64" }), enabled: bool("False creates it turned off."),
      }, ["name", "offering_id"], { additionalProperties: false }), { name: "Spring sale", offering_id: "ofrngm2u3h89blc", slug: "spring-sale" }),
      responses: { 201: ok("The purchase link.", ref("PurchaseLink"), linkEx), ...v2Errors(400, 401, 403, 404, 409, 422) } }),
  },
  [`${P}/purchase_links/{link_id}`]: {
    get: op({ id: "getPurchaseLink", tag: "Purchase links", summary: "Get a purchase link", security: SECRET, source: WEB, extension: true, scopes: OFF_READ, parameters: [project, linkId],
      responses: { 200: ok("The purchase link.", ref("PurchaseLink"), { ...linkEx, checkouts: 12, purchases: 5 }), ...E(404) } }),
    patch: op({ id: "updatePurchaseLink", tag: "Purchase links", summary: "Update a purchase link", security: SECRET, source: WEB, extension: true, scopes: OFF_WRITE, parameters: [project, linkId],
      description: "Send only what changes. `enabled: false` turns it off (410 on the page); `discount_id: null` removes the automatic discount; `expires_at: null` removes the expiry. Changing `slug` changes the URL; the old URL stops working.",
      requestBody: body(obj({ name: str(), offering_id: str(), slug: str(), app_id: nstr(), discount_id: nstr(), expires_at: nint(undefined, { format: "int64" }), enabled: bool() }, [], { additionalProperties: false }), { discount_id: "disc8h3n1v6w0z2y4d" }),
      responses: { 200: ok("The purchase link.", ref("PurchaseLink"), { ...linkEx, discount_id: "disc8h3n1v6w0z2y4d" }), ...v2Errors(400, 401, 403, 404, 409) } }),
    delete: op({ id: "deletePurchaseLink", tag: "Purchase links", summary: "Delete a purchase link", security: SECRET, source: WEB, extension: true, scopes: OFF_WRITE, parameters: [project, linkId],
      responses: { 200: ok("Deleted.", ref("Deleted"), { object: "purchase_link", id: "plink_4k8m2q9x1z3c", deleted_at: 1790801342625 }), ...E(404) } }),
  },
  [`${P}/funnels`]: {
    get: op({ id: "listFunnels", tag: "Funnels", summary: "List funnels", security: SECRET, source: WEB, extension: true, scopes: OFF_READ, parameters: [project, ...page],
      description: "Without `draft` and `problems`; with `views_30d` and `purchases_30d`.",
      responses: { 200: ok("A page of funnels.", listOf(ref("Funnel")), { object: "list", items: [{ ...funnelListEx, views_30d: 2, purchases_30d: 1 }], next_page: null, url: "/v2/projects/proj18pzzkao/funnels" }), ...E(400, 404) } }),
    post: op({ id: "createFunnel", tag: "Funnels", summary: "Create a funnel", security: SECRET, source: WEB, extension: true, scopes: OFF_WRITE, parameters: [project],
      description: "Starts from `draft` when sent, else from a template: `starter` (default: a question, an info step, an email step, the paywall and the success step) or `blank` (the paywall and the success step). Templates take the colours of the Stripe app's web config. The draft is validated (400 names the first problem). Slugs follow the purchase link rules. See [Funnels](../docs/guides/funnels.md).",
      requestBody: body(obj({ name: str(undefined, { minLength: 1, maxLength: 120 }), slug: str(), app_id: nstr("A Stripe app. Default: the project's first."), template: en(["starter", "blank"]), draft: ref("FunnelDoc") }, ["name"], { additionalProperties: false }), { name: "Focus quiz" }),
      responses: { 201: ok("The funnel, as a draft.", ref("Funnel"), { ...funnelEx, status: "draft", published_at: null }), ...v2Errors(400, 401, 403, 404, 409) } }),
  },
  [`${P}/funnels/ai`]: {
    get: op({ id: "getFunnelAi", tag: "Funnels", summary: "Is Build with AI available?", security: SECRET, source: WEB, extension: true, scopes: OFF_READ, parameters: [project],
      responses: { 200: ok("The language model, if any.", obj({ object: en(["funnel_ai"]), available: bool(), provider: nstr(), model: nstr(), max_prompt_length: int() }, ["object", "available", "provider", "model", "max_prompt_length"]), { object: "funnel_ai", available: true, provider: "OpenAI", model: "gpt-4.1-mini", max_prompt_length: 1000 }), ...E(404) } }),
  },
  [`${P}/funnels/generate`]: {
    post: op({ id: "generateFunnel", tag: "Funnels", summary: "Build a funnel with AI", security: SECRET, source: WEB, extension: true, scopes: OFF_WRITE, parameters: [project],
      description: "Asks the paywall generator's language model for a funnel and returns a draft that validates for publishing, with what was repaired in `fixes`. Nothing is saved: create or update a funnel with the draft. Same caps as paywall generation, shared with it: one call every 5 seconds and 60 a day per project, 100 a day per person, 5,000 a day per server (429). 503 when no model is configured; 502 when the model's answer is unusable.",
      requestBody: body(obj({ prompt: str(undefined, { minLength: 3, maxLength: 1000 }), app_name: str(undefined, { maxLength: 80 }) }, ["prompt"], { additionalProperties: false }), { prompt: "A sleep app quiz for people who wake up at night", app_name: "Drift" }),
      responses: { 200: ok("A draft.", obj({ object: en(["funnel_generation"]), draft: ref("FunnelDoc"), fixes: arr(str()), provider: str(), model: str() }, ["object", "draft", "fixes", "provider", "model"]), { object: "funnel_generation", draft: starter, fixes: ["added a success step"], provider: "OpenAI", model: "gpt-4.1-mini" }), ...v2Errors(400, 401, 403, 404, 429, 502, 503) } }),
  },
  [`${P}/funnels/{funnel_id}`]: {
    get: op({ id: "getFunnel", tag: "Funnels", summary: "Get a funnel", security: SECRET, source: WEB, extension: true, scopes: OFF_READ, parameters: [project, funnelId], responses: { 200: ok("The funnel.", ref("Funnel"), funnelEx), ...E(404) } }),
    patch: op({ id: "updateFunnel", tag: "Funnels", summary: "Update a funnel's draft", security: SECRET, source: WEB, extension: true, scopes: OFF_WRITE, parameters: [project, funnelId],
      description: "Changes the draft, name, slug or Stripe app. Visitors keep seeing the published copy until you publish again. `problems` lists what still blocks publishing.",
      requestBody: body(obj({ name: str(), slug: str(), app_id: nstr(), draft: ref("FunnelDoc") }, [], { additionalProperties: false }), { draft: starter }),
      responses: { 200: ok("The funnel.", ref("Funnel"), { ...funnelEx, has_unpublished_changes: true }), ...v2Errors(400, 401, 403, 404, 409) } }),
    delete: op({ id: "deleteFunnel", tag: "Funnels", summary: "Delete a funnel", security: SECRET, source: WEB, extension: true, scopes: OFF_WRITE, parameters: [project, funnelId],
      responses: { 200: ok("Deleted.", ref("Deleted"), { object: "funnel", id: "fnl_7q2k9m4x1z8c", deleted_at: 1790801342625 }), ...E(404) } }),
  },
  [`${P}/funnels/{funnel_id}/actions/publish`]: {
    post: op({ id: "publishFunnel", tag: "Funnels", summary: "Publish a funnel", security: SECRET, source: WEB, extension: true, scopes: OFF_WRITE, parameters: [project, funnelId],
      description: "The draft becomes the public page at `url`. 422 names the first problem (no paywall step, the success step not last ...), or says to connect Stripe first.",
      responses: { 200: ok("The funnel.", ref("Funnel"), funnelEx), ...E(404, 422) } }),
  },
  [`${P}/funnels/{funnel_id}/actions/unpublish`]: {
    post: op({ id: "unpublishFunnel", tag: "Funnels", summary: "Unpublish a funnel", security: SECRET, source: WEB, extension: true, scopes: OFF_WRITE, parameters: [project, funnelId],
      description: "The page answers 404. The draft is kept.", responses: { 200: ok("The funnel.", ref("Funnel"), { ...funnelEx, status: "draft", published_at: null }), ...E(404) } }),
  },
  [`${P}/funnels/{funnel_id}/analytics`]: {
    get: op({ id: "getFunnelAnalytics", tag: "Funnels", summary: "Get a funnel's analytics", security: SECRET, source: WEB, extension: true, scopes: OFF_READ,
      parameters: [project, funnelId, { name: "days", in: "query", schema: int(undefined, { minimum: 1, maximum: 365, default: 30 }), description: "The last N days." }],
      description: "Visitors are counted once per page session. `viewed` and `completed` per step are sessions; the success step's `completed` is purchases. `drop_off` is 1 - completed / viewed. `conversion` is purchases / views. `revenue_usd` is what the purchases paid.",
      responses: { 200: ok("The analytics.", obj({
        object: en(["funnel_analytics"]), funnel_id: str(), days: int(), views: int("Sessions that opened the page."), checkouts: int("Sessions that started a checkout."), purchases: int(), conversion: num("Purchases divided by views."), revenue_usd: num(),
        steps: arr(obj({ id: str(), type: str(), title: str(), viewed: int(), completed: int(), drop_off: num("0 to 1.") }, ["id", "type", "title", "viewed", "completed", "drop_off"])),
        daily: arr(obj({ date: str("YYYY-MM-DD, UTC."), views: int(), purchases: int() }, ["date", "views", "purchases"])),
      }, ["object", "funnel_id", "days", "views", "checkouts", "purchases", "conversion", "revenue_usd", "steps", "daily"]), {
        object: "funnel_analytics", funnel_id: "fnl_7q2k9m4x1z8c", days: 7, views: 2, checkouts: 1, purchases: 1, conversion: 0.5, revenue_usd: 59.99,
        steps: [{ id: "goal", type: "question", title: "What do you want to get done?", viewed: 2, completed: 1, drop_off: 0.5 }, { id: "plan", type: "info", title: "Your plan is ready", viewed: 1, completed: 1, drop_off: 0 }, { id: "email", type: "email", title: "Where should we send your plan?", viewed: 1, completed: 1, drop_off: 0 }, { id: "paywall", type: "paywall", title: "Unlock your full plan", viewed: 1, completed: 0, drop_off: 1 }, { id: "success", type: "success", title: "You are in", viewed: 0, completed: 1, drop_off: 0 }],
        daily: [{ date: "2026-09-30", views: 2, purchases: 1 }],
      }), ...E(404) } }),
  },
  [`${P}/funnels/{funnel_id}/preview_data`]: {
    get: op({ id: "getFunnelPreviewData", tag: "Funnels", summary: "Get what the builder's preview needs", security: SECRET, source: WEB, extension: true, scopes: OFF_READ, parameters: [project, funnelId],
      description: "The web config's look, each offering's web packages with their price labels (keyed by offering lookup key; `\"\"` is the current offering), the colour presets, the offerings and the discounts.",
      responses: { 200: ok("Preview data.", obj({
        object: en(["funnel_preview_data"]), app_id: nstr(), look: obj({ app_name: str(), logo_url: nstr(), terms_url: nstr(), privacy_url: nstr(), support_email: nstr() }, ["app_name"]),
        packages: { type: "object", additionalProperties: arr(obj({ id: str("Package lookup key."), name: str(), price: str("Such as $9.99."), period: str("Such as per month, or once."), detail: str("Such as 7-day free trial, then $9.99 per month."), badge: nstr("Such as Save 50%.") }, ["id", "name", "price", "period", "detail"])) },
        presets: arr(obj({ name: str(), theme: ref("FunnelTheme") }, ["name", "theme"])),
        offerings: arr(obj({ id: str(), lookup_key: str(), display_name: str(), is_current: bool(), web_packages: int() }, ["id", "lookup_key", "display_name", "is_current", "web_packages"])),
        discounts: arr(obj({ id: str(), name: str(), identifier: str() }, ["id", "name", "identifier"])),
      }, ["object", "app_id", "look", "packages", "presets", "offerings", "discounts"])), ...E(404) } }),
  },
  [`${P}/web_domain`]: {
    get: op({ id: "getWebDomain", tag: "Web billing", summary: "Get the project's web address and custom domain", security: SECRET, source: WEB, extension: true, scopes: APPS_READ, parameters: [project],
      responses: { 200: ok("The domain settings.", ref("WebDomain"), domainEx), ...E(404) } }),
    put: op({ id: "putWebDomain", tag: "Web billing", summary: "Change the project's slug or custom domain", security: SECRET, source: WEB, extension: true, scopes: APPS_WRITE, parameters: [project],
      description: "`slug` is the project's part of the default address (unique on the server; 409 when taken). `custom_domain` is a host you own, such as `pay.yourapp.com`; it starts `pending` with a new TXT token, and `null` removes it. A domain of RevenueDot or of another project is refused. See [Custom domains](../docs/guides/custom-domains.md).",
      requestBody: body(obj({ slug: str(), custom_domain: nstr("Lower-cased.") }, [], { additionalProperties: false }), { custom_domain: "pay.scanner.example" }),
      responses: { 200: ok("The domain settings.", ref("WebDomain"), domainEx), ...v2Errors(400, 401, 403, 404, 409) } }),
  },
  [`${P}/web_domain/actions/verify`]: {
    post: op({ id: "verifyWebDomain", tag: "Web billing", summary: "Check the custom domain's DNS records", security: SECRET, source: WEB, extension: true, scopes: APPS_WRITE, parameters: [project],
      description: "Reads the TXT record `_revenuedot.<domain>` and the domain's CNAME through DNS over HTTPS (Cloudflare's resolver). Both must match `dns`: then `status` is `verified` and the server answers that host with the project's pages. Otherwise `failed` with `error` saying which record is wrong and what DNS answered (`found`). At most 6 checks a minute (429).",
      responses: { 200: ok("The result.", ref("WebDomain"), { ...domainEx, status: "verified", verified_at: 1790801342625, checked_at: 1790801342625, base: "https://pay.scanner.example", found: { cname: ["api.revenuedot.app."], txt: ["revenuedot-verify=k3m9q2x7z1c4v8b6n0p5w2e7"] } }), ...v2Errors(400, 401, 403, 404, 429) } }),
  },

  // ---- Hosted pages (no sign-in) ----
  "/pay/{project}/{slug}": {
    get: op({ id: "payPage", tag: "Hosted pages", summary: "A purchase link or a published funnel", security: NONE, source: PAY,
      parameters: [{ name: "project", in: "path", required: true, schema: str(), description: "The project's slug." }, { name: "slug", in: "path", required: true, schema: str(), description: "The link's or funnel's slug." },
        { name: "app_user_id", in: "query", schema: str(undefined, { maxLength: 100 }), description: "Buy for this app user id: the purchase goes straight to that customer and no redemption link is needed." },
        { name: "email", in: "query", schema: str(), description: "Pre-fills the email (sent to Stripe as `customer_email`)." },
        { name: "code", in: "query", schema: str(undefined, { maxLength: 64 }), description: "Pre-fills a discount code." }],
      description: "Any `utm_*` query parameter (such as `utm_source`) is kept with the funnel's events. A server-rendered HTML page with a small inline script (strict Content-Security-Policy with a nonce, `no-store`). The same page answers at `<REVENUEDOT_PAY_URL>/<project>/<slug>` and, on a verified custom domain, at `https://<domain>/<slug>`. 404 when the page does not exist or the funnel is not published; 410 when the purchase link expired or is turned off.",
      responses: { 200: html("The page."), 404: html("Not found."), 410: html("The link expired or is turned off.") } }),
  },
  "/pay/{project}/{slug}/success": {
    get: op({ id: "paySuccessPage", tag: "Hosted pages", summary: "The success page after Stripe Checkout", security: NONE, source: PAY,
      parameters: [{ name: "project", in: "path", required: true, schema: str() }, { name: "slug", in: "path", required: true, schema: str() },
        { name: "co", in: "query", required: true, schema: str(), description: "The web checkout id (wco_...)." }, { name: "session_id", in: "query", required: true, schema: str(), description: "Stripe's Checkout Session id, filled in by Stripe." }],
      description: "Stripe sends the buyer here. The page records the purchase if the `checkout.session.completed` webhook has not already (either order records it once), then shows the success step: for an anonymous buyer the redemption link and store buttons, for a buyer with an app user id \"Return to the app\". While Stripe has not confirmed the payment it says \"Your payment is processing\" and reloads. With the web config's `success_mode: redirect` it answers 303 to `success_redirect_url` with `redemption_url` added.",
      responses: { 200: html("The success page."), 303: { description: "Redirect to the web config's success URL." }, 404: html("Unknown checkout, or a session id that is not this checkout's."), 410: html("The Checkout Session expired; nothing was charged.") } }),
  },
  "/pay/{project}/_/success": {
    get: op({ id: "paySdkSuccessPage", tag: "Hosted pages", summary: "The success page of the iOS SDK's hosted checkout", security: NONE, source: PAY,
      parameters: [{ name: "project", in: "path", required: true, schema: str() }, { name: "co", in: "query", required: true, schema: str() }, { name: "session_id", in: "query", required: true, schema: str() }],
      description: "Where a checkout from `POST /rcbilling/v1/hosted-checkout` returns. It records the purchase for the SDK's app user id; the SDK closes the page when it reaches this URL.",
      responses: { 200: html("Purchase complete."), 202: html("Payment processing."), 404: html("Unknown checkout.") } }),
  },
  "/pay/{project}/_/cancel": {
    get: op({ id: "paySdkCancelPage", tag: "Hosted pages", summary: "The cancel page of the iOS SDK's hosted checkout", security: NONE, source: PAY,
      parameters: [{ name: "project", in: "path", required: true, schema: str() }], description: "Nothing was charged. The SDK closes the page when it reaches this URL.", responses: { 200: html("Checkout cancelled.") } }),
  },
  "/pay/r/{token}": {
    get: op({ id: "payRedemptionPage", tag: "Hosted pages", summary: "A redemption link page", security: NONE, source: PAY,
      parameters: [{ name: "token", in: "path", required: true, schema: str(), description: "The redemption token (rdrt_...)." }],
      description: "The https form of a redemption link, for emails and QR codes. It shows \"Open <app>\" with the deep link `<app_scheme>://redeem_web_purchase?redemption_token=<token>` and the store buttons. A redeemed token shows \"Already unlocked\". See [Redemption links](../docs/guides/redemption-links.md).",
      responses: { 200: html("The page."), 404: html("Unknown token.") } }),
  },
  "/pay/api/checkout": {
    post: op({ id: "payStartCheckout", tag: "Hosted pages", summary: "Start a checkout from a page", security: NONE, source: PAY,
      description: "What the page's script calls. It checks the plan and the discount, records a web checkout and creates a Stripe Checkout Session with the Stripe app's key (`mode` subscription or payment, the package's price, the trial, `customer_email`, the discount, and `app_user_id`, `rd_checkout` and `rd_source` in `metadata`). Without `app_user_id` the buyer gets a new anonymous id (`$RCAnonymousID:...`). Funnel answers to questions with an `attribute` become customer attributes once paid. 30 a minute per IP address.",
      requestBody: body(obj({
        project: str("The project's slug."), slug: str("The page's slug."), package: str("Package lookup key, such as $rc_monthly."), app_user_id: str(), email: str(), code: str("A discount code."),
        session: str("Funnels: the page session id."), answers: { type: "object", additionalProperties: true, description: "Funnels: answers by step id." }, query: { type: "object", additionalProperties: str(), description: "The page's `utm_*` parameters." },
      }, ["project", "slug", "package"]), { project: "scanner", slug: "spring-sale", package: "$rc_monthly", code: "SPRING20" }),
      responses: {
        200: ok("Redirect the buyer to `url`.", obj({ url: str("Stripe Checkout."), checkout_id: str("wco_...") }, ["url", "checkout_id"]), { url: "https://checkout.stripe.com/c/pay/cs_test_a1B2c3D4", checkout_id: "wco_8k2m9q4x7a1b3c5d" }),
        400: msg("No plan, a plan not sold on the web, or a refused code.", { message: "This code does not apply to this plan." }), 404: msg("The page does not exist.", { message: "This page no longer exists." }),
        410: msg("The purchase link expired.", { message: "This link has expired." }), 429: msg("Too many attempts.", { message: "Too many attempts. Wait a minute and try again." }),
        503: msg("Stripe is unavailable or refused the key.", { message: "Checkout is busy right now. Try again in a moment." }),
      } }),
  },
  "/pay/api/discount": {
    post: op({ id: "payCheckDiscount", tag: "Hosted pages", summary: "Check a discount code from a page", security: NONE, source: PAY,
      description: "The live check behind the code field. A refused code answers 200 with `valid: false` and the reason. 30 a minute per IP address.",
      requestBody: body(obj({ project: str(), slug: str(), package: str(), code: str(), app_user_id: str("Eligibility uses this customer's purchases.") }, ["project", "slug", "code"]), { project: "scanner", slug: "spring-sale", package: "$rc_monthly", code: "spring20" }),
      responses: { 200: ok("The result.", obj({ valid: bool(), message: str() }, ["valid", "message"]), { valid: true, message: "20% off for 3 months applied at checkout." }), 400: ok("No code, or no plan.", obj({ valid: bool(), message: str() }), { valid: false, message: "Enter a code." }), 429: ok("Too many attempts.", obj({ valid: bool(), message: str() }), { valid: false, message: "Too many attempts. Wait a minute and try again." }) } }),
  },
  "/pay/api/events": {
    post: op({ id: "payFunnelEvent", tag: "Hosted pages", summary: "Record a funnel event from a page", security: NONE, source: PAY,
      description: "`funnel_viewed`, `step_viewed` and `step_completed`, sent by the page with `sendBeacon`. Anything else, an unknown or unpublished funnel or an unknown step is ignored; the answer is 204 either way. An email step's answer is stored as `provided`, never the address. The server records `checkout_started` and `purchase` itself. 300 a minute per IP address.",
      requestBody: body(obj({
        type: en(["funnel_viewed", "step_viewed", "step_completed"]), funnel_id: str(), session_id: str("8-80 letters, digits, `_` or `-`."), step_id: str("Not for funnel_viewed."),
        answer: { oneOf: [str(), arr(str())], description: "step_completed of a question." }, app_user_id: str(),
        query: { type: "object", additionalProperties: str(), description: "The page URL's query: its `utm_*` parameters and ad click ids (`fbclid`, `gclid`, `gbraid`, `wbraid`, `ttclid`, `msclkid`) are kept with the event." },
        page_url: str("The page's address without its query (http or https). Kept, with the request's IP address and user agent, only while an integration asks for funnel events, for ad networks."),
      }, ["type", "funnel_id", "session_id"]), { type: "step_completed", funnel_id: "fnl_7q2k9m4x1z8c", session_id: "3f9c2a7b1e8d4c6a9b0f1e2d3c4b5a69", step_id: "goal", answer: "Sleep better", query: { utm_source: "tiktok", fbclid: "IwAR2xQ9kM" }, page_url: "https://api.revenuedot.app/pay/scanner/sleep-quiz" }),
      responses: { 204: { description: "Accepted or ignored." }, 429: { description: "Too many events from this address." } } }),
  },
};


// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: store prices and status (read from App Store Connect and Google Play and cached per app) and the product
// editor (a CSV of prices per territory, uploaded, reviewed and committed to the store). RevenueDot extensions.
// Docs: https://revenuedot.app/docs/guides/product-editor   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { SECRET, arr, body, bool, en, int, listOf, ms, nint, nms, nstr, obj, ok, op, param, ref, str, v2Errors } from "./common.mjs";

const P = "/v2/projects/{project_id}";
const project = param("ProjectId");
const SOURCE = "routes/v2/product-editor.ts";
const READ = ["project_configuration:products:read"];
const WRITE = ["project_configuration:products:read_write"];
const GUIDE = "../docs/guides/product-editor.md";
const editId = { name: "edit_id", in: "path", required: true, schema: str(), description: "Product file id (pedit...)." };
const appQuery = (what) => ({ name: "app_id", in: "query", schema: str(), description: `Only this app's ${what}. 404 when the app is not in the project.` });

const price = obj({
  amount_micros: int("Price in millionths of the currency unit: 9.99 is 9990000.", { format: "int64" }),
  currency: str("ISO 4217 code."),
  territory: str("App Store Connect's three-letter territory code (`USA`) or Google Play's two-letter region code (`US`)."),
}, ["amount_micros", "currency", "territory"]);
const basePrice = { oneOf: [price, { type: "null" }], description: "The price shown for the product: the United States when it has a price there, else the in-app purchase's base territory, else the first territory with a price. Null when the store has no price for it." };

/** A RevenueDot V2Error example for one status. */
const err = (status, description, type, message, retryable = false) => ok(description, ref("V2Error"), {
  object: "error", type, message, doc_url: `https://revenuedot.app/docs/api/errors#${type.replace(/_/g, "-")}`, retryable,
});
const noKey = err(422, "The app is not an App Store, Mac App Store or Google Play app, or its store key is missing or refused (`unprocessable_entity_error`, the message names the key and the role or permission it needs), or the store could not be reached (`store_error` with `retryable: true`).",
  "unprocessable_entity_error", "Changing prices in App Store Connect needs the app's App Store Connect API key: a team key with the App Manager role (.p8 file, key ID and issuer ID). The In-App Purchase key cannot list or change prices.");

export const productEditorSchemas = {
  StoreListing: obj({
    object: en(["store_listing"]),
    app_id: str(),
    store_identifier: str("The identifier the catalog uses: the App Store product id, or `subscription_id:base_plan_id` (one-time products: the product id) on Google Play."),
    product_id: nstr("The catalog product with this store identifier on this app, or null when the catalog does not have it."),
    type: en(["subscription", "one_time", "consumable", "non_consumable", "non_renewing_subscription"]),
    display_name: nstr("App Store Connect's reference name, or the Play listing title."),
    duration: nstr("ISO 8601 period of a subscription (`P1M`, `P1Y` ...)."),
    store_state: nstr("The store's own state: App Store review states such as `APPROVED`, `READY_TO_SUBMIT`, `WAITING_FOR_REVIEW`, `MISSING_METADATA`; Google Play base plan states `ACTIVE`, `DRAFT`, `INACTIVE`."),
    status: nstr("`store_state` in lower case, such as `approved` or `active`."),
    group: { oneOf: [obj({ id: str(), name: nstr() }, ["id", "name"]), { type: "null" }], description: "The App Store subscription group, or the Google Play subscription." },
    store_id: nstr("The product's id in the store: the App Store Connect subscription or in-app purchase id, or the Google Play subscription or product id."),
    price: basePrice,
    prices: arr(price, { description: "The current price in every territory that has one. App Store prices scheduled for a later date are left out; an in-app purchase lists its manual prices and the prices Apple sets from the base territory." }),
    editable: bool("Whether the product editor can change its prices: true for App Store subscriptions and in-app purchases and Google Play base plans; false for Google Play one-time products and subscriptions without a base plan."),
    note: nstr("Why the product cannot be edited, or a caveat from the store."),
    refreshed_at: ms("When the prices were read from the store."),
  }, ["object", "app_id", "store_identifier", "product_id", "type", "display_name", "duration", "store_state", "status", "group", "store_id", "price", "prices", "editable", "note", "refreshed_at"]),
  StorePriceSync: obj({
    object: en(["store_price_sync"]),
    app_id: str(),
    store: en(["app_store", "mac_app_store", "play_store"]),
    can_read_prices: bool("Whether the app has the store key reading prices needs."),
    reason: nstr("Why prices cannot be read, such as a missing App Store Connect API key. Null when they can."),
    status: en(["never", "ok", "failing"], "`never`: not read yet. `ok`: the last read worked. `failing`: the last read failed and the prices from the read before stay."),
    error: nstr("The last read's error."),
    item_count: int("Products in the last successful read."),
    refreshed_at: nms("When the app's prices were last read, or tried."),
  }, ["object", "app_id", "store", "can_read_prices", "reason", "status", "error", "item_count", "refreshed_at"]),
  StorePriceRefresh: obj({
    object: en(["store_price_refresh"]),
    app_id: str(),
    warnings: arr(str(), { description: "Set when the store had more products than RevenueDot reads at once (5,000)." }),
    sync: ref("StorePriceSync"),
    items: arr(ref("StoreListing"), { description: "Every product the store has for the app, with its prices." }),
  }, ["object", "app_id", "warnings", "sync", "items"]),
  ProductEditRow: obj({
    object: en(["product_edit_row"]),
    idx: int("Position of the change in the file's list of changes."),
    kind: en(["price_change", "new_product"], "`price_change`: a new price for an existing product, in a territory it has a price in or a new territory. `new_product`: a price of a product the commit creates."),
    line: nint("The CSV line the change comes from."),
    store_identifier: str(),
    territory: str("App Store territory (`USA`) or Google Play region (`US`)."),
    currency: str("ISO 4217 code."),
    old_amount_micros: nint("The store's price before the change, or null for a new territory or a new product.", { format: "int64" }),
    new_amount_micros: int("The price in the file.", { format: "int64" }),
    change_percent: { type: ["number", "null"], description: "Change from the old price in percent, one decimal (10.0 for 9.99 to 10.99). Null without an old price." },
    product: {
      oneOf: [obj({ type: str(), duration: nstr(), display_name: str(), group: nstr() }, ["type", "duration", "display_name", "group"]), { type: "null" }],
      description: "For `new_product` rows: the product the commit creates, from the file's `type`, `duration`, `display_name` and `group` columns.",
    },
    status: en(["pending", "succeeded", "failed"], "`pending` until the commit reaches the row."),
    error: nstr("The store's message when the row failed. On a row that succeeded without a write, a note such as \"Already at this price.\""),
    attempts: int("How many times the row was sent to the store."),
    updated_at: nms("When the row last changed."),
  }, ["object", "idx", "kind", "line", "store_identifier", "territory", "currency", "old_amount_micros", "new_amount_micros", "change_percent", "product", "status", "error", "attempts", "updated_at"]),
  ProductEdit: obj({
    object: en(["product_edit"]),
    id: str("Product file id (pedit...)."),
    app_id: str(),
    store: en(["app_store", "mac_app_store", "play_store"]),
    status: en(["invalid", "ready", "committing", "committed", "partially_committed", "failed"],
      "`invalid`: the file has errors and nothing can be committed. `ready`: checked, waiting for a commit. `committing`: a commit has rows left; call commit again. `committed`: every row succeeded. `partially_committed`: some rows failed. `failed`: every row failed."),
    file_name: str("The uploaded file's name."),
    created_at: ms("When the file was uploaded."),
    updated_at: ms("When the file or its options last changed."),
    committed_at: nms("When the last commit finished."),
    created_by: nstr("Who uploaded it: a user id (usr_...) or an API key id."),
    created_by_email: nstr("The uploader's email, when a user uploaded it. Only in `GET` answers."),
    errors: arr(obj({ line: nint("The CSV line, or null for the whole file."), message: str() }, ["line", "message"]), { description: "Every problem the check found (at most 500). Empty unless `status` is `invalid`." }),
    warnings: arr(obj({ line: nint(), message: str() }, ["line", "message"]), { description: "Notes that do not stop a commit: ignored columns, ignored product fields, prices that change by more than 50%, rows without a price." }),
    summary: obj({
      price_changes: int("Prices of existing products that change."),
      new_products: int("Products the commit creates."),
      new_product_prices: int("Prices of those new products."),
      unchanged: int("Rows whose price already matches the store."),
      products: int("Products with at least one change."),
      rows: int("Data rows in the file."),
    }, [], { description: "Counts from the check. Empty when the file could not be read at all." }),
    options: obj({ preserve_current_price: bool("App Store only: Apple's `preserveCurrentPrice` for subscription price changes. True (the default) keeps existing subscribers on their current price.") }, [], { description: "Empty for Google Play files." }),
    results: obj({ pending: int(), succeeded: int(), failed: int() }, ["pending", "succeeded", "failed"], { description: "How many changes are pending, succeeded and failed." }),
    rows: arr(ref("ProductEditRow"), { description: "Every change, in file order. Not in list answers." }),
  }, ["object", "id", "app_id", "store", "status", "file_name", "created_at", "updated_at", "committed_at", "created_by", "errors", "warnings", "summary", "options"]),
};

const listingExample = {
  object: "store_listing", app_id: "app1a2b3c4d", store_identifier: "pro_monthly", product_id: "prod1a2b3c4d5e", type: "subscription", display_name: "Pro Monthly",
  duration: "P1M", store_state: "APPROVED", status: "approved", group: { id: "21000001", name: "Pro" }, store_id: "6743920115",
  price: { amount_micros: 9990000, currency: "USD", territory: "USA" },
  prices: [{ territory: "DEU", currency: "EUR", amount_micros: 9990000 }, { territory: "GBR", currency: "GBP", amount_micros: 8990000 }, { territory: "USA", currency: "USD", amount_micros: 9990000 }],
  editable: true, note: null, refreshed_at: 1790971200000,
};
const syncExample = { object: "store_price_sync", app_id: "app1a2b3c4d", store: "app_store", can_read_prices: true, reason: null, status: "ok", error: null, item_count: 3, refreshed_at: 1790971200000 };
const rowExample = (idx, line, territory, currency, oldMicros, newMicros, extra = {}) => ({
  object: "product_edit_row", idx, kind: "price_change", line, store_identifier: "pro_monthly", territory, currency, old_amount_micros: oldMicros, new_amount_micros: newMicros,
  change_percent: oldMicros ? Math.round((newMicros / oldMicros - 1) * 1000) / 10 : null, product: null, status: "pending", error: null, attempts: 0, updated_at: null, ...extra,
});
const editExample = (status, rows, results) => ({
  object: "product_edit", id: "pedit3k9x2m7q1z8w4c", app_id: "app1a2b3c4d", store: "app_store", status, file_name: "scanner-ios-app-store-products-2026-10-02.csv",
  created_at: 1790971500000, updated_at: status === "ready" ? 1790971500000 : 1790971620000, committed_at: status === "ready" ? null : 1790971620000, created_by: "usr_8k2m4q",
  errors: [], warnings: [{ line: 4, message: "pro_monthly in GBR changes by +55% (8.99 → 13.95). Check it is not a typo." }],
  summary: { price_changes: 2, new_products: 0, new_product_prices: 0, unchanged: 1, products: 1, rows: 3 }, options: { preserve_current_price: true },
  results, rows,
});
const readyExample = editExample("ready", [rowExample(0, 2, "USA", "USD", 9990000, 10990000), rowExample(1, 4, "GBR", "GBP", 8990000, 13950000)], { pending: 2, succeeded: 0, failed: 0 });
const partialExample = editExample("partially_committed", [
  rowExample(0, 2, "USA", "USD", 9990000, 10990000, { status: "succeeded", attempts: 1, updated_at: 1790971620000 }),
  rowExample(1, 4, "GBR", "GBP", 8990000, 13950000, { status: "failed", attempts: 1, updated_at: 1790971620000, error: "The App Store has no price of 13.95 GBP in GBR. The nearest App Store prices are 13.49 and 13.99." }),
], { pending: 0, succeeded: 1, failed: 1 });
const invalidExample = {
  ...editExample("invalid", [], { pending: 0, succeeded: 0, failed: 0 }), errors: [
    { line: 3, message: "JPY prices have no decimals; \"1740.5\" has 1." },
    { line: 5, message: "pro_weekly is not in App Store Connect for this app. Check the identifier, or set action to create to add it as a new product." },
  ], warnings: [], summary: { price_changes: 1, new_products: 0, new_product_prices: 0, unchanged: 0, products: 1, rows: 4 },
};
const { rows: _rows, ...partialListItem } = partialExample;
const csvExample = [
  "store_identifier,display_name,type,duration,group,territory,currency,price,action",
  "pro_monthly,Pro Monthly,subscription,P1M,Pro,USA,USD,9.99,",
  "pro_monthly,Pro Monthly,subscription,P1M,Pro,DEU,EUR,9.99,",
  "pro_monthly,Pro Monthly,subscription,P1M,Pro,GBR,GBP,8.99,",
].join("\n");

export const productEditorPaths = {
  [`${P}/store_prices`]: {
    get: op({ id: "listStorePrices", tag: "Store prices and product editor", summary: "List store prices", security: SECRET, source: SOURCE, scopes: READ, extension: true,
      parameters: [project, appQuery("store products")],
      description: `
Every App Store, Mac App Store and Google Play product RevenueDot has read for the project's apps, with its price in every territory, its period and the store's state. The answer comes from RevenueDot's copy of the last read; the store is not asked. \`apps\` has one item per App Store, Mac App Store and Google Play app: whether RevenueDot can read its prices (and why not), and the last read's outcome. \`next_page\` is always null.

Prices are read again on \`POST …/apps/{app_id}/store_prices/actions/refresh\`, on every product file download and upload, after every commit, and once a day for apps not read in 24 hours. See [Product editor](${GUIDE}#store-prices-and-status-on-the-products-page).`,
      responses: {
        200: ok("The cached store products and each app's last read.", {
          ...listOf(ref("StoreListing")),
          required: ["object", "items", "next_page", "url", "apps"],
          properties: { ...listOf(ref("StoreListing")).properties, apps: arr(ref("StorePriceSync"), { description: "One item per App Store, Mac App Store and Google Play app (only `app_id`'s with the filter)." }) },
        }, { object: "list", items: [listingExample], next_page: null, url: "/v2/projects/proj18pzzkao/store_prices", apps: [syncExample] }),
        ...v2Errors(401, 403, 404),
      } }),
  },
  [`${P}/apps/{app_id}/store_prices/actions/refresh`]: {
    post: op({ id: "refreshStorePrices", tag: "Store prices and product editor", summary: "Read an app's store prices again", security: SECRET, source: SOURCE, scopes: WRITE, extension: true,
      parameters: [project, param("AppId")],
      description: `
Reads every product of the app from the store with its current price in every territory, its period and its state, and replaces RevenueDot's copy for the app, so products deleted in the store disappear. Nothing in the store changes, and the refresh is not written to the audit log.

- **App Store and Mac App Store** need the App Store Connect API key (\`app_store_connect_api_key\`, \`_id\`, \`_issuer\`): a team key with the App Manager role. Each subscription's prices (\`GET /v1/subscriptions/{id}/prices\`, the current price per territory), each in-app purchase's price schedule (manual prices and the ones Apple sets from the base territory), and the review state.
- **Google Play** needs the service account, with "View app information and download bulk reports (read-only)". Every base plan's regional prices and state, and one-time products' prices.

When the read fails, the app's sync turns \`failing\` with the error and the previous prices stay. 422 \`unprocessable_entity_error\` for another kind of app or a missing or refused key; 422 \`store_error\` with \`retryable: true\` while the store cannot be reached.`,
      responses: {
        200: ok("What the store has now.", ref("StorePriceRefresh"), { object: "store_price_refresh", app_id: "app1a2b3c4d", warnings: [], sync: syncExample, items: [listingExample] }),
        ...v2Errors(401, 403, 404, 422),
      } }),
  },
  [`${P}/apps/{app_id}/store_products/export.csv`]: {
    get: op({ id: "exportStoreProductsCsv", tag: "Store prices and product editor", summary: "Download a product file", security: SECRET, source: SOURCE, scopes: READ, extension: true,
      parameters: [project, param("AppId"),
        { name: "store_identifiers", in: "query", schema: str(), description: "The products to include, comma separated (`pro_monthly,pro_annual`); the parameter may repeat. At most 2,000." },
        { name: "all", in: "query", schema: bool(), description: "`true` includes every product the product editor can change. Use it instead of `store_identifiers`." }],
      description: `
A CSV with one row per product and territory: the base territory first (the United States when the product has a price there), then the rest by code. The columns are \`store_identifier, display_name, type, duration, group, territory, currency, price, action\`. \`price\` is a decimal in the territory's currency (\`9.99\`, \`1740\` for yen) and \`action\` is empty. A product without a price gets one row with empty \`territory\`, \`currency\` and \`price\`. Text cells that start with \`=\`, \`+\`, \`-\` or \`@\` get a leading apostrophe so spreadsheets do not run them as formulas; the upload removes it.

The download reads the store again (like a refresh), so the file has today's prices. The \`Content-Disposition\` file name is \`<app>-app-store-products-<date>.csv\` or \`<app>-play-store-products-<date>.csv\`, and \`X-Product-Count\` is the number of products. See [the CSV format](${GUIDE}#the-csv-has-one-row-per-product-and-territory).

\`\`\`csv
${csvExample}
\`\`\`

400 without \`store_identifiers\` or \`all=true\`, or with more than 2,000 identifiers. 422 \`store_error\` (\`param: store_identifiers\`) for identifiers the store does not have for the app, and for Google Play one-time products, which the product editor does not change yet. Other 422s as for a refresh.`,
      responses: {
        200: {
          description: "The CSV file.",
          headers: {
            "Content-Disposition": { schema: str(), description: "`attachment; filename=\"scanner-ios-app-store-products-2026-10-02.csv\"`" },
            "X-Product-Count": { schema: str(), description: "How many products the file has." },
          },
          content: { "text/csv": { schema: str(), example: `${csvExample}\n` } },
        },
        ...v2Errors(400, 401, 403, 404, 422),
      } }),
  },
  [`${P}/product_edits`]: {
    get: op({ id: "listProductEdits", tag: "Store prices and product editor", summary: "List product files", security: SECRET, source: SOURCE, scopes: READ, extension: true,
      parameters: [project, appQuery("files")],
      description: "Every uploaded product file of the project, newest first (the last 200), with its status, counts and who uploaded it. The dashboard's **Files** tab. `rows` are left out; get one file for them. `next_page` is always null.",
      responses: {
        200: ok("The files.", listOf(ref("ProductEdit")), { object: "list", items: [{ ...partialListItem, created_by_email: "dana@example.com" }], next_page: null, url: "/v2/projects/proj18pzzkao/product_edits" }),
        ...v2Errors(401, 403, 404),
      } }),
    post: op({ id: "createProductEdit", tag: "Store prices and product editor", summary: "Upload a product file", security: SECRET, source: SOURCE, scopes: WRITE, extension: true,
      parameters: [project],
      description: `
Checks a product file against what the store has now and keeps it. RevenueDot reads the store again (and refreshes the cached prices), then checks every line: the columns, each product, territory, currency and price, duplicate product and territory pairs, and the fields new products need. See [every problem the check reports](${GUIDE}#the-check-names-every-problem-with-its-line).

The answer is 201 either way:
- \`status: "ready"\`: every line is valid. \`rows\` lists every price that changes and every price of a new product; \`summary\` counts them and the unchanged rows. Nothing is sent to the store until you commit.
- \`status: "invalid"\`: \`errors\` lists every problem with its line, and \`rows\` is empty. The file stays on the Files tab; fix it and upload it again.

Rows whose price already matches the store are not changes. New values for the name, type, period or group of an existing product are ignored with a warning: the product editor changes prices only.

400 when \`csv\` is empty or larger than 1 MB, or \`app_id\` is not an app of the project. 422 \`unprocessable_entity_error\` for an app that is not on the App Store, Mac App Store or Google Play, or without the key changing prices needs (App Store Connect API key with the App Manager role; Play service account with "Manage store presence"); 422 \`store_error\` with \`retryable: true\` while the store cannot be reached.`,
      requestBody: body(obj({
        app_id: str("The App Store, Mac App Store or Google Play app the file is for."),
        csv: str("The file's text, UTF-8. At most 1 MB and 20,000 rows. Comma separated, or semicolon or tab separated when the header line has no comma.", { minLength: 1, maxLength: 1000000 }),
        file_name: str("Shown on the Files tab. Default: products.csv.", { maxLength: 200 }),
        preserve_current_price: bool("App Store only. Default true: subscription price changes keep existing subscribers on their current price (Apple's `preserveCurrentPrice`)."),
      }, ["app_id", "csv"]), { app_id: "app1a2b3c4d", file_name: "scanner-ios-app-store-products-2026-10-02.csv", csv: `${csvExample.replace("USD,9.99", "USD,10.99")}\n` }),
      responses: {
        201: {
          description: "The file, checked: `ready` with its changes, or `invalid` with its errors.",
          content: { "application/json": { schema: ref("ProductEdit"), examples: { ready: { summary: "A valid file", value: readyExample }, invalid: { summary: "A file with errors", value: invalidExample } } } },
        },
        ...v2Errors(400, 401, 403),
        422: noKey,
      } }),
  },
  [`${P}/product_edits/{edit_id}`]: {
    get: op({ id: "getProductEdit", tag: "Store prices and product editor", summary: "Get a product file", security: SECRET, source: SOURCE, scopes: READ, extension: true,
      parameters: [project, editId],
      description: "The file with its errors, warnings, counts, options and every change with its result. Viewers can read it too.",
      responses: { 200: ok("The file.", ref("ProductEdit"), { ...partialExample, created_by_email: "dana@example.com" }), ...v2Errors(401, 403, 404) } }),
    post: op({ id: "updateProductEdit", tag: "Store prices and product editor", summary: "Change a product file's options", security: SECRET, source: SOURCE, scopes: WRITE, extension: true,
      parameters: [project, editId],
      description: `
App Store files only, before the commit. \`preserve_current_price: true\` (the default) keeps existing subscribers on their current price when a subscription's price changes. \`false\` moves them to the new price too; Apple tells them about an increase first and asks some of them to agree ([Apple's rules](https://developer.apple.com/help/app-store-connect/manage-subscriptions/manage-pricing-for-auto-renewable-subscriptions)). In-app purchase prices are not affected.

400 for a Google Play file. 409 \`invalid_request\` once the file is committed or when it has errors.`,
      requestBody: body(obj({ preserve_current_price: bool() }, ["preserve_current_price"]), { preserve_current_price: false }),
      responses: { 200: ok("The file.", ref("ProductEdit")), ...v2Errors(400, 401, 403, 404, 409) } }),
    delete: op({ id: "deleteProductEdit", tag: "Store prices and product editor", summary: "Discard a product file", security: SECRET, source: SOURCE, scopes: WRITE, extension: true,
      parameters: [project, editId],
      description: "Removes a file that was never committed (`ready` or `invalid`) from the Files tab. Nothing was sent to the store. 409 `invalid_request` for a file that was committed: committed rows stay in the history.",
      responses: { 200: ok("Discarded.", ref("Deleted"), { object: "product_edit", id: "pedit3k9x2m7q1z8w4c", deleted_at: 1790971560000 }), ...v2Errors(401, 403, 404, 409) } }),
  },
  [`${P}/product_edits/{edit_id}/actions/commit`]: {
    post: op({ id: "commitProductEdit", tag: "Store prices and product editor", summary: "Commit a product file to the store", security: SECRET, source: SOURCE, scopes: WRITE, extension: true,
      parameters: [project, editId],
      description: `
Writes the file's pending changes to App Store Connect or Google Play, one product at a time, and records each row's outcome.

- **App Store subscription prices:** the price point with exactly that customer price in that territory, then \`POST /v1/subscriptionPrices\` with \`preserveCurrentPrice\` from the file's options and no start date. A price with no price point fails, and the message names the two nearest App Store prices.
- **App Store in-app purchase prices:** one \`POST /v1/inAppPurchasePriceSchedules\` per product with its base territory and every manual price: the ones it had plus the changed ones, so prices nobody changed stay.
- **Google Play base plan prices:** one \`monetization.subscriptions.patch\` (\`updateMask=basePlans\`) per subscription with the changed regional prices; the rest of the subscription is sent back as read. New prices apply to new subscribers; existing subscribers keep theirs until you move them in Play Console ([Google's price changes](https://developer.android.com/google/play/billing/price-changes)).
- **New products:** App Store subscriptions (in the subscription group named in \`group\`, created when it does not exist) and in-app purchases are created, then priced as above. Google Play subscriptions are created with their base plan and regional prices, or the base plan is added to an existing subscription, and each new base plan is activated. Every new product is added to the catalog, like an import.

Rows that share one store call share its outcome. A row whose store price already equals the new price succeeds without a write. When the store refuses the key, every remaining row fails with that message. The answer's \`status\` is \`committed\`, \`partially_committed\` or \`failed\`; afterwards RevenueDot reads the store again so the cached prices are current.

One call writes for at most 20 seconds. When rows are left, it answers \`status: "committing"\`: call commit again until the status changes. Each call is in the audit log as \`product_edit_commit\`, and each row adds \`store_price_changed\` (each new product \`store_product_created\`) with the territory, the old and new price and the result.

409 \`invalid_request\` when the file has errors or is already committed; 409 \`resource_locked_error\` while another commit of the same file runs. 422 \`unprocessable_entity_error\` when the app's key is missing.`,
      responses: {
        200: ok("The file after this call, with each row's result.", ref("ProductEdit"), partialExample),
        ...v2Errors(401, 403, 404),
        409: err(409, "The file has errors or is already committed (`invalid_request`), or another commit of it is running (`resource_locked_error`).", "resource_locked_error", "This edit is being committed right now. Wait for it to finish."),
        422: noKey,
      } }),
  },
  [`${P}/product_edits/{edit_id}/actions/retry`]: {
    post: op({ id: "retryProductEdit", tag: "Store prices and product editor", summary: "Retry the failed rows of a product file", security: SECRET, source: SOURCE, scopes: WRITE, extension: true,
      parameters: [project, editId],
      description: `
Sets the failed rows back to pending and commits them again, like \`…/actions/commit\`. Rows that succeeded are not sent again. Products the first commit created are not created twice, and an App Store subscription row whose price is already in the store succeeds without a write. Logged as \`product_edit_retry\`.

409 \`invalid_request\` when no row failed; 409 \`resource_locked_error\` while a commit of the file runs.`,
      responses: {
        200: ok("The file after the retry.", ref("ProductEdit")),
        ...v2Errors(401, 403, 404),
        409: err(409, "No row failed (`invalid_request`), or a commit of the file is running (`resource_locked_error`).", "invalid_request", "No row failed, so there is nothing to retry."),
        422: noKey,
      } }),
  },
};


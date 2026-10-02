---
title: How do I change App Store and Google Play prices with the product editor?
description: Download a CSV of your App Store or Google Play products with a price per territory, change prices or add products, upload it, review every change, and commit it to the store. The Products page shows each product's store price and status.
---

# How do I change App Store and Google Play prices with the product editor?

**The product editor changes prices in App Store Connect and Google Play from one CSV file.** It works in three steps:

1. **Update product file.** Download a CSV of the products you pick, with one row per product and territory. Change the `price` column, or add rows for new products, and upload the file.
2. **Review changes.** RevenueDot reads the store again and checks every line. It lists every problem with its line number, or shows every price change and every new product next to the current price.
3. **Commit to store.** RevenueDot sends the changes to App Store Connect or Google Play and shows each row's result. You can retry the rows that failed.

Open it from **Product catalog → Products → Product editor** (marked Beta). Nothing changes in the store until you commit. RevenueCat's dashboard has a product editor with the same download, review and commit steps ([RevenueCat docs](https://www.revenuecat.com/docs/offerings/products-overview)).

The product editor works with App Store, Mac App Store and Google Play apps. Test Store prices are set on each product in RevenueDot, and Stripe prices come with the [imported web products](import-products.md).

## Each store needs a key that can change prices
| Store | Credential on the app | To read prices | To change prices and create products |
|---|---|---|---|
| App Store, Mac App Store | The **App Store Connect API key**: the `.p8` file, its key ID and the issuer ID (app page → App Store Connect API key) | A team key with the **App Manager** role | The same key |
| Google Play | The **service account JSON** you already use for purchases | **View app information and download bulk reports (read-only)** | **Manage store presence** |

The **In-App Purchase key** (a `SubscriptionKey_….p8` file) cannot read or change prices, because App Store Connect accepts it only on the App Store Server API. Create a team key under [Users and Access → Integrations → App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api) with the App Manager role, and save it in the app's App Store Connect API key fields. The app can keep both keys. Google Play permissions are set in [Play Console → Users and permissions](https://play.google.com/console/developers/users-and-permissions).

When a key is missing or the store refuses it, the product editor says which key and which role or permission it needs, and links to the app's settings.

## 1. Download a CSV of the products you pick
1. Pick **App Store** or **Play Store**, and the app when you have more than one.
2. On the **Products** tab, tick the products to change, or tick the box in the header to select them all. The list shows each product's price, how many territories have a price, and its store status.
3. Click **Download .csv**. The download reads the store again, so the file has today's prices.

Google Play one-time products are listed with their prices, but they cannot be selected: Play Store one-time purchases aren't supported yet. Change their prices in Play Console.

The file is named after the app, the store and the date, for example `scanner-ios-app-store-products-2026-10-02.csv`.

## The CSV has one row per product and territory
The first line names the columns. RevenueDot reads the columns by name, so their order does not matter, and it ignores columns it does not know (with a note). `store_identifier`, `territory`, `currency` and `price` are required.

| Column | What it holds |
|---|---|
| `store_identifier` | The product's ID in the store. App Store: the product ID, such as `com.example.pro.monthly`. Google Play: `subscription_id:base_plan_id`, such as `pro:monthly` |
| `display_name` | The store name: the reference name in App Store Connect, or the subscription's title in Play Console. Read only for new products |
| `type` | `subscription`, `consumable`, `non_consumable` or `non_renewing_subscription`. Read only for new products |
| `duration` | The period of a subscription as an ISO 8601 period, such as `P1M` or `P1Y`. Read only for new products |
| `group` | The App Store subscription group's reference name. Read only for new App Store subscriptions; Google Play ignores it |
| `territory` | Where the price applies. App Store: App Store Connect's three-letter territory code, such as `USA`, `GBR` or `JPN`. Google Play: the two-letter region code, such as `US`, `GB` or `JP` |
| `currency` | The currency the store uses in that territory, such as `USD`, `GBP` or `JPY` |
| `price` | The customer price in that currency, with a period as the decimal point and no thousands separator: `9.99`, or `1740` for yen |
| `action` | Empty (or `update`) to change an existing product's prices. `create` to add a new product |

A downloaded file lists each product's base territory first (the United States when the product has a price there), then the other territories by code. A product with no price yet gets one row with empty `territory`, `currency` and `price`.

**Prices have as many decimals as the currency allows**: two for USD, EUR and GBP, none for JPY and KRW, and three for KWD. Trailing zeros are fine, so `9.990` is `9.99` and `1740.00` is `1740`. A price must be above 0 and at most 100,000,000.

**Only rows that change something count.** A row whose price already matches the store is unchanged. A row with no territory, currency and price is skipped. A row with a price in a territory where the product has no price yet adds that territory.

**The product editor changes prices only.** A new name, type, period or group on an existing product is ignored with a note; change those in the store.

**Spreadsheets are fine.** A file saved with semicolons or tabs instead of commas is read too, as long as the header line has no comma. Quoted cells, Windows line endings and a UTF-8 byte order mark are fine. In the download, a name or group that starts with `=`, `+`, `-` or `@` gets a leading apostrophe so a spreadsheet does not run it as a formula, and the upload removes the apostrophe again.

### Example: two price changes and a new App Store subscription
```csv
store_identifier,display_name,type,duration,group,territory,currency,price,action
pro_monthly,Pro Monthly,subscription,P1M,Pro,USA,USD,10.99,
pro_monthly,Pro Monthly,subscription,P1M,Pro,GBR,GBP,9.99,
pro_monthly,Pro Monthly,subscription,P1M,Pro,DEU,EUR,9.99,
pro_weekly,Pro Weekly,subscription,P1W,Pro,USA,USD,3.99,create
pro_weekly,,,,,GBR,GBP,3.99,create
```

The first three rows set `pro_monthly`'s price in the United States, the United Kingdom and Germany; a row whose price is already in the store counts as unchanged. The last two rows create `pro_weekly` in the `Pro` subscription group with a price in two territories. Later rows of a new product may leave the product columns empty.

### Example: a new Google Play base plan
```csv
store_identifier,display_name,type,duration,group,territory,currency,price,action
premium:monthly,Premium,subscription,P1M,Premium,US,USD,7.99,
premium:yearly,Premium,subscription,P1Y,,US,USD,59.99,create
premium:yearly,,,,,DE,EUR,59.99,create
```

The first row changes the US price of the `monthly` base plan. The other rows add a `yearly` base plan to the existing `premium` subscription, priced in the United States and Germany.

### New products need a type, a period and a name
Set `action` to `create` on every row of a new product. The first row names the product; later rows may leave `display_name`, `type`, `duration` and `group` empty, but a different value is an error. A new product needs a price in at least one territory.

**App Store**
- The product ID uses letters, digits, periods and underscores, up to 100 characters.
- `type` is `subscription`, `consumable`, `non_consumable` or `non_renewing_subscription`.
- A subscription needs a `duration` of `P1W`, `P1M`, `P2M`, `P3M`, `P6M` or `P1Y`, and a `group`: the subscription group's reference name. RevenueDot uses the group with that name, or creates it.
- `display_name` is required, up to 64 characters. It becomes the reference name.
- The App Store sells a subscription only in the territories where it has a price. The check notes when a new subscription has a price in fewer territories than the App Store has.

**Google Play**
- `store_identifier` is `subscription_id:base_plan_id`. The subscription ID starts with a lowercase letter or digit and uses lowercase letters, digits, periods and underscores, up to 40 characters. The base plan ID starts with a lowercase letter or digit and uses lowercase letters, digits and hyphens, up to 63 characters.
- `type` is `subscription`. Play Store one-time purchases aren't supported yet; create them in Play Console.
- `duration` is `P1W`, `P1M`, `P2M`, `P3M`, `P4M`, `P6M` or `P1Y`.
- `display_name` is required, up to 55 characters. It becomes the subscription's title when the subscription is new.
- A new base plan of an existing subscription works too: it is added to that subscription.

## The check names every problem with its line
When you upload a file, RevenueDot reads the store again and checks the whole file. A file with problems is kept with the status **Has errors**, and the page lists every problem (up to 500) with its line number. Nothing changes in the store. Fix the file and upload it again.

**The file**
- It is not a CSV file, for example because a quote is never closed.
- It is empty, has a header but no rows, or has more than 20,000 rows. The upload itself refuses files over 1 MB.
- A column appears twice, or the first line does not name `store_identifier`, `territory`, `currency` and `price`.
- It changes nothing, because every price already matches the store.

**A row**
- `store_identifier` is empty or has a space in it.
- `action` is not `create`, `update` or empty.
- The product is not in the store for this app. Check the identifier, or set `action` to `create` to add it. On Google Play, a subscription ID without a base plan gets a hint with the right `subscription_id:base_plan_id`.
- `action` is `create`, but the product already exists. Leave `action` empty to change its prices.
- The product is a Google Play one-time product, or another product the product editor cannot change.
- The territory is not a three-letter App Store code (or a two-letter Google Play code), or the store does not sell in it.
- The currency is empty or is not the territory's currency, for example `EUR` for `GBR`.
- The price is not a number such as 9.99 (use a dot for decimals and no thousands separators, also in spreadsheets that write `10,99`), has more decimals than the currency allows, is 0 or less, or is above 100,000,000.
- The same product and territory appear twice. The error names both lines.
- A new product has no price, or a row of it has no territory, currency or price.
- A new product breaks a rule from the list above: an invalid ID, an unknown type, a missing period, group or name, a name that is too long, or values that differ from its first row.

### Notes do not stop a commit
The review also lists notes to check. They never block the file:
- A column RevenueDot does not use.
- A row with a territory but no price, which changes nothing.
- A new name, type, period or group for an existing product, which is ignored.
- A price that changes by more than 50%, in case it is a typo.
- A new subscription priced in fewer territories than the store has.

## 2. Review every change before it reaches the store
A valid file gets the status **Ready to commit**. The page shows:
- Four counts: price changes, new products, unchanged rows and products.
- One table per product with each territory's current price, the new price and the change in percent ("new" for a new territory or a new product).
- The notes to check.

Two store rules decide who pays the new price:
- **App Store subscriptions** keep existing subscribers on their current price by default. This is Apple's `preserveCurrentPrice` option, shown as **Keep existing subscribers on their current price**. Turn it off to move existing subscribers to the new price too; Apple tells them about an increase first and asks some of them to agree ([Apple's rules](https://developer.apple.com/help/app-store-connect/manage-subscriptions/manage-pricing-for-auto-renewable-subscriptions)). The option does not apply to in-app purchases.
- **Google Play base plan prices** apply to new subscribers. Existing subscribers keep their price until you move them to the new price in Play Console ([Google's price changes](https://developer.android.com/google/play/billing/price-changes)).

**Discard file** removes a file you do not want to commit. Nothing was sent to the store.

## 3. Commit sends each change to the store
Click **Commit N changes to App Store Connect** (or **to Google Play**) and confirm. RevenueDot works through the file one product at a time, and each row ends **Committed** or **Failed** with the store's message. The file ends **Committed**, **Partly committed** or **Failed**. Afterwards RevenueDot reads the store again, so the Products page shows the new prices.

### App Store prices use Apple's price points
- **Subscriptions:** for each territory, RevenueDot finds Apple's price point with exactly that customer price and schedules it with no start date, so Apple applies it as soon as it can. A price that has no price point fails, and the message names the two nearest App Store prices. Upload a new file with one of them.
- **In-app purchases** (consumable, non-consumable and non-renewing): RevenueDot sends one price schedule per product with its base territory and every manual price: the ones it already had plus the ones you changed. Manual prices nobody changed stay as they are, and territories without a manual price keep following the base territory's price. A new in-app purchase gets the United States as its base territory when the file prices it there, else the first territory in the file. Writing a schedule replaces the whole schedule, so an in-app purchase that has a price change scheduled for a later date in App Store Connect is left alone: its rows fail and name the territories with the scheduled change. Change its prices in App Store Connect, or remove the scheduled change and retry. Changing the base territory's price also moves Apple's automatic prices in every territory without a manual price; the review notes it.

### Google Play changes one subscription at a time
RevenueDot sends one update per subscription with the changed regional prices of its base plans, and sends the rest of the subscription back as it was. All rows of one subscription share that update's result, except rows that were already at their price.

### New products are created, then priced
- **App Store:** RevenueDot finds the app in App Store Connect by its bundle ID, creates the subscription in its group (or the in-app purchase), and then sets its prices as above. Add a review screenshot and localizations in App Store Connect before you submit it for review.
- **Google Play:** RevenueDot creates the subscription with its base plan and regional prices, or adds the base plan to the existing subscription, and then activates the base plan. When the activation fails, the row says so and the base plan stays a draft; activate it in Play Console.
- Every new product is added to RevenueDot's catalog, like an [import](import-products.md). Attach it to an entitlement and a package to sell it.

### Details that matter for large files
- Rows that share one store call share its result. On the App Store those are the rows of one in-app purchase; on Google Play, the rows of one subscription.
- A row whose store price already equals the new price succeeds without a write and says "Already at this price."
- When the store refuses the key during a commit, every remaining row fails with that message.
- One commit request writes for up to 20 seconds. The dashboard keeps going until every row has a result, and it continues when you open the file again; another tab follows its progress. Only one file of an app commits at a time, because price schedules and Play subscriptions are read, changed and written back whole: a second file of the same app waits until the first is done.

## Failed rows can be retried
**Retry N failed** sets the failed rows back to pending and commits them again. Rows that went through are not sent again, and new products are not created twice.

## The Files tab keeps every upload
The **Files** tab lists every file uploaded for the app, newest first: its name, when and by whom it was uploaded (an email, or "API key"), its status (**Has errors**, **Ready to commit**, **Committing**, **Committed**, **Partly committed** or **Failed**), the number of changes or errors, and the results. Open a file to see its review or its results again.

## The audit log records every store write
Find these in **Project settings → Audit logs**, or with `GET /v2/projects/{project_id}/audit_logs`:

| Entry | Written when |
|---|---|
| `product_edit_created` | A file is uploaded |
| `product_edit_updated` | The App Store option changes |
| `product_edit_deleted` | A file is discarded |
| `product_edit_commit` | A commit request runs |
| `product_edit_retry` | A retry runs |
| `store_price_changed` | One per row that gets a result, with the app, store, file id, line, territory, currency, old and new price, and the result (and the error when it failed) |
| `store_product_created` | One per new product created in the store, with the app, store, file id, the store's id, type, period and name |

## Admins and developers commit; viewers read and download
- **Admins and developers** (API permission `project_configuration:products:read_write`) upload files, change the option, commit, retry, discard files and refresh prices.
- **Viewers** (`project_configuration:products:read`) see the product list, download the CSV and read past files.

## With the API
Every step of the dashboard is an API call. The reference is under [Store prices and product editor](../../api/extensions.md#store-prices-and-product-editor).

Download the file for two products, or pass `all=true` for every product the product editor can change:

```bash
curl -s "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/apps/$APP_ID/store_products/export.csv?store_identifiers=pro_monthly,pro_annual" \
  -H "Authorization: Bearer $SECRET_KEY" -o products.csv
```

Upload it after editing. The answer is 201 with the checked file: `status` is `ready` with every change in `rows`, or `invalid` with every problem in `errors`:

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/product_edits" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d "$(jq -n --arg app "$APP_ID" --rawfile csv products.csv '{app_id: $app, file_name: "products.csv", csv: $csv}')"
```

```json
{
  "object": "product_edit", "id": "pedit3k9x2m7q1z8w4c", "app_id": "app1a2b3c4d", "store": "app_store", "status": "ready",
  "errors": [], "warnings": [],
  "summary": { "price_changes": 1, "new_products": 0, "new_product_prices": 0, "unchanged": 2, "products": 1, "rows": 3 },
  "options": { "preserve_current_price": true },
  "results": { "pending": 1, "succeeded": 0, "failed": 0 },
  "rows": [
    { "object": "product_edit_row", "idx": 0, "kind": "price_change", "line": 2, "store_identifier": "pro_monthly", "territory": "USA", "currency": "USD",
      "old_amount_micros": 9990000, "new_amount_micros": 10990000, "change_percent": 10, "product": null, "status": "pending", "error": null, "attempts": 0, "updated_at": null }
  ]
}
```

To move existing App Store subscribers to the new price, turn the option off before you commit:

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/product_edits/$EDIT_ID" \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" -d '{"preserve_current_price":false}'
```

Commit. One request writes for up to 20 seconds and answers `committing` while rows are left, so call it until the status changes:

```bash
while :; do
  STATUS=$(curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/product_edits/$EDIT_ID/actions/commit" \
    -H "Authorization: Bearer $SECRET_KEY" | jq -r .status)
  [ "$STATUS" != "committing" ] && break
done
echo "$STATUS"   # committed, partially_committed or failed
```

Retry the failed rows, read one file with every row's result, or list the files of an app:

```bash
curl -s -X POST "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/product_edits/$EDIT_ID/actions/retry" -H "Authorization: Bearer $SECRET_KEY"
curl -s "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/product_edits/$EDIT_ID" -H "Authorization: Bearer $SECRET_KEY"
curl -s "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/product_edits?app_id=$APP_ID" -H "Authorization: Bearer $SECRET_KEY"
```

`DELETE /v2/projects/{project_id}/product_edits/{edit_id}` discards a file that was never committed.

What the errors mean:
- **400** `parameter_error`: `csv` is empty or larger than 1 MB, `app_id` is not an app of the project, the download has neither `store_identifiers` nor `all=true` (or more than 2,000 identifiers), or `preserve_current_price` was sent for a Google Play file.
- **403**: the key lacks `project_configuration:products:read_write` (or `:read` for reads).
- **404**: the app or the file is not in the project.
- **409** `invalid_request`: the file has errors, is already committed, has no failed row to retry, or can no longer be changed or discarded. **409** `resource_locked_error`: a commit of the same file, or of another file of the same app, is running.
- **422** `unprocessable_entity_error`: the app is not an App Store, Mac App Store or Google Play app, or its key is missing or refused. The message names the key and the role or permission. **422** `store_error` with `retryable: true`: the store could not be reached; try again later.

A file with problems is not an error: it answers 201 with `status: "invalid"`.

## Store prices and status on the Products page
**The Products page shows what App Store Connect and Google Play charge for each product, and each product's state in the store.**

- **Price and period as the row label.** Each product row leads with its price and period, such as `$89.99/year` or `$3.99/week` (one-time products show the price alone), with the store identifier under it. Products with no known price show their name or identifier.
- **Status column.** The store's state: **Approved**, **Ready to submit**, **Waiting for review**, **In review**, **Rejected**, **Developer action needed**, **Missing metadata** or **Removed from sale** for App Store review, and **Active**, **Draft** or **Inactive** for Google Play base plans. Test Store products show "Test Store". A dash means the store was not read yet.
- **Refresh.** Each App Store and Google Play app group says where its prices come from and when they were read, such as "Prices and status from App Store Connect · read 5 minutes ago", with **Refresh prices** for admins and developers. When the app's key cannot read prices, the group says why and links to the app's settings. When the last read failed, it shows the error, and the prices from the read before stay.
- **Daily refresh.** RevenueDot also reads prices on every product editor download and upload, after every commit, once a day for apps not read in the last 24 hours (a few apps at a time), and the first time an admin or developer opens the Products page for an app that was never read.
- **Prices by territory.** A product's page shows its store price and store status, and a **Prices by territory** table with every territory's price, the base territory first. **Edit in Product editor** opens the product editor with that product selected.

What RevenueDot reads, with the keys from the table at the top:
- **App Store:** each subscription's current price in every territory (prices scheduled for a later date are left out), each in-app purchase's manual prices and the prices Apple sets from its base territory, and the review state.
- **Google Play:** every base plan's regional prices and its state, and one-time products' prices.

Reading never changes anything in the store. A product deleted in the store disappears on the next read.

### In the API
`expand=items.store_details` on `GET /v2/projects/{project_id}/products` (or `expand=store_details` on one product) adds `store_details`, a RevenueDot extension: the store's status, the base price and its territory, how many territories have a price, the period, and when it was read. It is null for products that were never read from App Store Connect or Google Play.

`expand=items.indicative_price` (RevenueCat's field) now also comes from the stores. RevenueDot uses the first price it knows:
1. The Test Store price set on the product.
2. The store price from the last read: the United States price when the product has one, else the in-app purchase's base territory, else the first territory with a price. `country` is `US` for a United States price, the region code for another Google Play region, and null otherwise.
3. The price of the Stripe web product.

It is null when none is known.

```bash
curl -s "$REVENUEDOT_URL/v2/projects/$PROJECT_ID/products?app_id=$APP_ID&expand=items.indicative_price&expand=items.store_details" -H "Authorization: Bearer $SECRET_KEY"
```

```json
{
  "object": "product", "id": "prod1a2b3c4d5e", "store_identifier": "pro_annual", "type": "subscription", "state": "active",
  "subscription": { "duration": "P1Y", "grace_period_duration": null, "trial_duration": null },
  "created_at": 1790800900948, "app_id": "app1a2b3c4d", "display_name": "Pro Annual",
  "indicative_price": { "object": "indicative_price", "currency": "USD", "country": "US", "amount_micros": 89990000 },
  "store_details": {
    "object": "store_details", "status": "approved", "store_state": "APPROVED",
    "price": { "amount_micros": 89990000, "currency": "USD", "territory": "USA" },
    "territories": 175, "duration": "P1Y", "display_name": "Pro Annual", "editable": true,
    "refreshed_at": 1790971200000, "refresh_status": "ok"
  }
}
```

`GET /v2/projects/{project_id}/store_prices` lists every cached store product with its price in every territory, and each app's last read. `POST /v2/projects/{project_id}/apps/{app_id}/store_prices/actions/refresh` reads one app again. See [List store prices](../../api/extensions.md#list-store-prices) and [Read an app's store prices again](../../api/extensions.md#read-an-apps-store-prices-again).

## Create products and offerings with AI
**New product** on the Products page and **New offering** on the Offerings page open a menu with two choices:
- **Create from scratch** opens the usual form.
- **Create with AI** asks what to create, such as "Pro: $9.99 monthly and $59.99 yearly on iOS and Android", and opens a [RevenueDot AI](revenuedot-ai.md) conversation with that request.

RevenueDot AI reads your apps, products and entitlements first, then drafts everything in one change:
- **Create products** (`create-products`) adds up to 50 products. Each has an app, a store identifier and a type, and optionally a period, a name and, on the Test Store, a price. It can also attach every product to one entitlement, which it creates when the lookup key is new. Products that already exist on their app are skipped and reported.
- **Create offering** (`create-offering`) adds an offering with its lookup key, name and metadata, its packages (RevenueCat's package IDs such as `$rc_monthly` and `$rc_annual`, or your own) and their products, and can make it the current offering. A product named by its store identifier is added once per app; names it cannot find are reported.

The approval card lists every value the change will write. **Approve** writes it once. **Deny** writes nothing. The tools call the API as you, so your role, the API's checks and the audit log apply, and the entries say "RevenueDot AI on behalf of" you.

These products are created in RevenueDot's catalog, not in the stores. To create App Store or Google Play products with their prices, add `create` rows to a product file.

**Create with AI** is greyed out, with the reason, when the server has no AI model, the project's AI setting is **Read only** or **Disabled**, or your role is Viewer. RevenueCat's dashboard offers its own assistant, Rico, for small product changes ([RevenueCat docs](https://www.revenuecat.com/docs/offerings/products-overview)).

## Related
- [Import products](import-products.md)
- [App Store setup](app-store.md), [Google Play setup](google-play.md)
- [Products and entitlements](../concepts/products-and-entitlements.md)
- [RevenueDot AI](revenuedot-ai.md)
- [API reference: store prices and product editor](../../api/extensions.md#store-prices-and-product-editor)

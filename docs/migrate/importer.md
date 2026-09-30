---
title: How do I import a RevenueCat project with the revenuedot CLI?
description: "revenuedot import copies apps, SDK keys, catalog, customers, subscriptions and purchases from RevenueCat's API v2 into RevenueDot. It resumes after a stop and is safe to run again."
---

# How do I import a RevenueCat project with the revenuedot CLI?

Run `revenuedot import --from-revenuecat` with a RevenueCat v2 secret key and a RevenueDot secret key. It reads your RevenueCat project through RevenueCat's REST API v2 and writes it into RevenueDot: apps, public SDK keys, products, entitlements, offerings, packages, customers, aliases, attributes, subscriptions and one-time purchases. It sends no webhooks, resumes where it stopped, and a second run changes nothing that is already right.

**The CLI is on npm as [`revenuedot`](https://www.npmjs.com/package/revenuedot)** (Node.js 18.17 or newer), so `npx revenuedot` runs the latest release.

## Run it
```bash
npx revenuedot import --from-revenuecat --rc-key sk_... --rc-project proj... \
  --to https://revenuedot.example.com --to-key sk_...
```

From source instead (needs pnpm):
```bash
git clone https://github.com/revenuedot/revenuedot && cd revenuedot && pnpm install
pnpm --filter revenuedot cli import --from-revenuecat \
  --rc-key sk_... --rc-project proj... \
  --to https://revenuedot.example.com --to-key sk_...
```

You need:
1. **A RevenueCat secret API key, version 2**, with read access to project configuration (apps, products, entitlements, offerings, packages) and customer information (customers, subscriptions, purchases). A RevenueCat OAuth token (`atk_...`) also works. A public SDK key does not.
2. **Your RevenueCat project id** (`proj...`). It is in the RevenueCat dashboard URL.
3. **A running RevenueDot server and a secret key** (`sk_...`) for the project you import into. Create one on the dashboard's **API keys** page. See [Which key goes where](../concepts/projects-and-apps.md#which-key-goes-where).

## Commands
| Command | What it does | Needs |
|---|---|---|
| `revenuedot import --from-revenuecat` | Imports the catalog, then customers page by page | `--rc-key`, `--rc-project`, `--to`, `--to-key` |
| `revenuedot import verify` | Compares every customer's active entitlements between RevenueCat and RevenueDot | `--rc-key`, `--rc-project`, `--to`, `--to-key` |
| `revenuedot import plan` | Prints the cutover steps with your app ids and URLs filled in | `--to`, `--to-key` (`--rc-project` optional) |

## Flags
| Flag | Meaning | Default |
|---|---|---|
| `--rc-key <key>` | RevenueCat secret key, v2 (`sk_...`) or OAuth token (`atk_...`) | `REVENUECAT_API_KEY` |
| `--rc-project <id>` | RevenueCat project id | `REVENUECAT_PROJECT_ID` |
| `--to <url>` | Your RevenueDot server, e.g. `http://localhost:8787` | `REVENUEDOT_URL` |
| `--to-key <key>` | RevenueDot secret key of the target project | `REVENUEDOT_API_KEY` |
| `--to-project <id>` | RevenueDot project id | the key's project |
| `--state <file>` | State file for resuming | `./revenuedot-import-<rc project>.json` |
| `--dry-run` | Read everything and report what would change; write nothing | off |
| `--restart` | Ignore the state file and start from the first customer | off |
| `--concurrency <n>` | Customers fetched in parallel | 4 |
| `--limit <n>` | Import only the first n customers, for a trial run | all |
| `--google-tokens <csv>` | Google Play purchase tokens you already have | none |
| `--no-public-keys` | Keep RevenueDot's own SDK keys instead of copying RevenueCat's | off (keys are copied) |
| `--emit-events` | Record lifecycle events and send webhooks for imported purchases | off |
| `--json` | Print the report as JSON | off |
| `-h`, `--help` | Show help | |

Two more flags exist for testing and are not in `--help`: `--rc-url <url>` (RevenueCat's API base, default `https://api.revenuecat.com`) and `--page-size <n>` (customers per RevenueCat page, default 100). `--from-revenuecat` names the source; it is accepted but not required.

**Environment variables** keep keys out of your shell history: `REVENUECAT_API_KEY`, `REVENUECAT_PROJECT_ID`, `REVENUEDOT_URL`, `REVENUEDOT_API_KEY`. A flag wins over its variable.

**Exit codes:** `0` success; `1` failure, or differences found by `import verify`; `2` wrong usage, such as a missing flag or a public key passed as `--rc-key`.

Source: [`packages/importer/src/cli.ts`](https://github.com/revenuedot/revenuedot/blob/main/packages/importer/src/cli.ts).

## Start with a dry run
```bash
npx revenuedot import --from-revenuecat --rc-key sk_... --rc-project proj... \
  --to http://localhost:8787 --to-key sk_... --dry-run
```
A dry run reads the whole RevenueCat project and prints what it would create. It writes nothing to RevenueDot and does not save a state file. Add `--limit 50` to try the real import on 50 customers first.

## Stop and resume at any time
- Progress shows on one line on stderr. The report goes to stdout.
- The state file (`revenuedot-import-<rc project>.json` by default) records the catalog mapping, the last customer page that finished, the counts and the problems found.
- If the run stops (network error, Ctrl-C, a closed laptop), run the same command again. It continues after the last finished page.
- When a pass has finished, running the command again starts a new full pass. The catalog is always re-synced. Because the import is idempotent, this is how you keep RevenueDot current during the [dual run](dual-run.md); a daily run is safe.
- A state file belongs to one RevenueCat project and one RevenueDot project. Use `--state` with another file, or `--restart`, to import somewhere else.

**Speed:** about 5 requests per customer. RevenueCat allows 480 requests a minute ([rate limits](https://www.revenuecat.com/docs/api-v2)), so expect about 90 customers a minute (100,000 customers take about 18 hours). On a 429 the importer waits for `Retry-After`, and it retries 5xx answers.

## Read the report
```text
Import finished: RevenueCat project proj1ab2c3d4 -> https://revenuedot.example.com (project projujvzn2wl).

Catalog
  Apps           2 created, 0 already there
  Products       6 created, 0 already there
  Entitlements   1 created, 0 already there
  Offerings      2 created, 0 already there
  Packages       4 created, 0 already there
  SDK keys       2 kept (existing app builds keep working with RevenueDot)

Customers (pass 1, complete)
  1200 customers imported (1180 new, 20 merged with existing ones)
  950 subscriptions, 130 one-time purchases
  310 Google Play subscriptions need a purchase token (add the service account and run again; see "revenuedot import plan")

Store credentials to re-enter in RevenueDot (they cannot be exported)
  - ...
```
The problem sections are **Store credentials to re-enter**, **Skipped**, **Errors** and **Notes**. Each shows 50 lines; the full list is in the state file. `--json` prints everything.

After the first import, enter each app's store credentials in the dashboard (**Apps** → your app) and **run the import again**. With the credentials in place, RevenueDot:
- confirms each App Store subscription's `original_transaction_id` with Apple, and
- looks up each Google Play subscription's purchase token from its order id.

That is how RevenueDot recognises the imported subscription when the store or the app reports on it later, instead of creating a second one. See [Connect the App Store](../guides/app-store.md) and [Connect Google Play](../guides/google-play.md).

## Check the result with import verify
```bash
npx revenuedot import verify --rc-key sk_... --rc-project proj... \
  --to https://revenuedot.example.com --to-key sk_...
```
For every customer it compares the active entitlements (by identifier), their expiry dates, and how many subscriptions give access. It prints totals for customers, active subscriptions and active entitlements on both sides, then each difference, and exits with `1` when there is one. Purchases made since the last import show up as differences: run the import again, then verify again. `--limit` and `--concurrency` work here too.

## Print the cutover plan
```bash
npx revenuedot import plan --to https://revenuedot.example.com --to-key sk_... --rc-project proj...
```
It prints numbered steps for your project: import status, which apps still need store credentials, the notification URL of each app and the forwarding call, the SDK change, the daily re-import, and the final cutover. The same steps are in the [cutover checklist](cutover-checklist.md).

## Google Play purchase tokens
RevenueCat's [API v2](https://www.revenuecat.com/docs/api-v2) gives Google Play order ids, not purchase tokens, and Google's API needs the token. RevenueDot gets tokens in four ways:
1. **Your service account.** After you add it to the app, the next import looks up tokens by order id with Google's orders API.
2. **A CSV file** you pass with `--google-tokens tokens.csv`, for example an export from RevenueCat support.
3. **Google's next renewal notification** for that subscription, which carries the token.
4. **The app's `syncPurchases()`** call, once after the update.

Until a subscription has its token, its key is `needs_token_refresh:<order id>` and the customer **keeps access**. A later import with the token upgrades the row in place.

The CSV needs a header row. Columns are matched by name, case-insensitive, and separated by commas, semicolons or tabs:

| Meaning | Accepted column names |
|---|---|
| Purchase token (required) | `purchase_token`, `token`, `fetch_token` |
| Order id | `order_id`, `orderid`, `store_transaction_id`, `store_subscription_identifier` |
| App user id | `app_user_id`, `rc_original_app_user_id`, `customer_id` |
| Product id | `product_id`, `product_identifier` |

Each row needs the token plus either an order id, or an app user id and a product id. Renewal order ids like `GPA.1234-5678-9012-34567..0` also match their base order id.
```csv
purchase_token,order_id
abcdefghijk.AO-J1Oz...,GPA.3312-8841-2231-55120
```

## The server endpoints it calls
The importer writes through three RevenueDot endpoints. They are RevenueDot extensions, not part of RevenueCat's API. You can call them yourself, for example to import from your own database. All take a secret key.

**`POST /v2/projects/{project_id}/import/customers`** takes up to 100 customers per call. It needs the `customer_information:customers:read_write` permission.
```bash
curl -s -X POST https://revenuedot.example.com/v2/projects/$PROJECT_ID/import/customers \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{
  "customers": [{
    "id": "user_123",
    "aliases": ["$RCAnonymousID:0f3c9a..."],
    "first_seen_at": 1719830400000,
    "attributes": [{ "name": "$email", "value": "a@example.com", "updated_at": 1719830400000 }],
    "subscriptions": [{
      "app_id": "app1a2b3c4d", "store": "app_store", "product_identifier": "pro_monthly", "environment": "production",
      "starts_at": 1719830400000, "current_period_starts_at": 1725105600000, "current_period_ends_at": 1727784000000,
      "status": "active", "auto_renewal_status": "will_renew",
      "store_subscription_identifier": "2000000712345678", "original_transaction_id": "2000000612345678"
    }],
    "purchases": [{
      "app_id": "app1a2b3c4d", "store": "app_store", "product_identifier": "lifetime",
      "purchased_at": 1719830400000, "store_purchase_identifier": "2000000512345678", "status": "owned"
    }]
  }]
}'
```
```json
{"object":"import_result","emit_events":false,"customers":[{"id":"user_123","status":"created","subscriptions":1,"purchases":1,"needs_token_refresh":0,"notes":[]}]}
```
- Dates are milliseconds since 1970.
- Subscriptions are keyed the way the stores report them: App Store by `original_transaction_id`, Google Play by `purchase_token` (send it when you have it), others by `store_subscription_identifier`.
- `emit_events` (default `false`): `true` records lifecycle events and queues webhooks as if the purchases just happened.
- `resolve_store_ids` (default `true`): use the app's store credentials, when set, to confirm Apple original transaction ids and look up Google purchase tokens.
- Each customer's `status` is `created`, `updated` or `merged`. Customers that share an alias with an existing customer merge into one.
- Subscriptions that already ended import as expired, so the expiration job sends nothing for old history.

**`POST /v2/projects/{project_id}/import/apps/{app_id}/public_key`** sets an app's public SDK key to the key your shipped builds use. It needs `project_configuration:apps:read_write`. The key must start with the app type's prefix (for example `appl_` for `app_store`, `goog_` for `play_store`), and no other app may use it.
```bash
curl -s -X POST https://revenuedot.example.com/v2/projects/$PROJECT_ID/import/apps/$APP_ID/public_key \
  -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"public_key":"appl_AbCdEfGhIjKlMnOp"}'
```
```json
{"object":"public_api_key","id":"pk_app1a2b3c4d","key":"appl_AbCdEfGhIjKlMnOp","environment":"production","app_id":"app1a2b3c4d","created_at":1790798214712}
```

**`GET /v2/projects/{project_id}/import/status`** counts what is in the project and how many Google Play subscriptions still wait for a purchase token. It needs `customer_information:customers:read`.
```bash
curl -s https://revenuedot.example.com/v2/projects/$PROJECT_ID/import/status -H "Authorization: Bearer $SECRET_KEY"
```
```json
{"object":"import_status","customers":1200,"subscriptions":950,"needs_token_refresh":310,"needs_token_refresh_by_app":{"app9l7z3oij":310}}
```
The full reference is in [REST API extensions](../../api/extensions.md).

## Use it from code
The package exports `runImport`, `formatReport`, `verifyImport` and `buildPlan`:
```ts
import { formatReport, runImport } from "revenuedot";

const report = await runImport({
  rcKey: process.env.REVENUECAT_API_KEY!, rcProject: "proj1ab2c3d4",
  to: "http://localhost:8787", toKey: process.env.REVENUEDOT_API_KEY!,
  statePath: "./import-state.json",
});
console.log(formatReport(report));
```

## Related
- [Migrate from RevenueCat](README.md)
- [Dual run](dual-run.md)
- [Cutover checklist](cutover-checklist.md)
- [REST API v2](../../api/rest-v2.md)
- [Authentication](../../api/authentication.md)
